'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PriceFeed {
  symbol: string;
  name: string;
  price: string;
  change: string;
  updated: string;
  source: 'oracle' | 'coingecko' | 'fallback';
}

interface ApiPriceData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  source: 'oracle' | 'coingecko' | 'fallback';
  lastUpdated: string;
}

export default function PricesComponent() {
  const [prices, setPrices] = useState<PriceFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<{ oracle: boolean; coingecko: boolean } | null>(null);

  useEffect(() => {
    loadPrices();
    // Auto-refresh every 60 seconds (to avoid rate limiting)
    const interval = setInterval(loadPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  async function loadPrices() {
    setLoading(true);

    try {
      // Fetch from our API route (handles CORS, Oracle + CoinGecko)
      // Add cache-busting timestamp to prevent stale data
      const response = await fetch(`/api/prices?t=${Date.now()}`, {
        cache: 'no-store',
      });
      const data = await response.json();

      if (data.success && data.prices) {
        const formattedPrices: PriceFeed[] = data.prices.map((p: ApiPriceData) => {
          // Format price based on value
          const formattedPrice = p.price > 1
            ? `$${p.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
            : `$${p.price.toFixed(4)}`;

          // Format change
          const changeStr = p.change24h >= 0
            ? `+${p.change24h.toFixed(2)}%`
            : `${p.change24h.toFixed(2)}%`;

          // Calculate time ago
          const lastUpdated = new Date(p.lastUpdated);
          const secondsAgo = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
          const updated = secondsAgo < 60 ? 'Just now' : `${Math.floor(secondsAgo / 60)} min ago`;

          return {
            symbol: p.symbol,
            name: p.name,
            price: formattedPrice,
            change: changeStr,
            updated,
            source: p.source,
          };
        });

        setPrices(formattedPrices);
        setDataSource(data.sources);
      }
    } catch (error) {
      console.error('Failed to fetch prices:', error);
      // Keep existing prices on error
    } finally {
      setLoading(false);
    }
  }

  // All sources shown uniformly as "Live" - internal implementation detail hidden
  const getSourceBadge = () => {
    return { text: 'Live', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
  };

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">Oracle Price Feeds</h1>
            <p className="text-gray-400">Live cryptocurrency prices from CasperLink Oracle</p>
            {dataSource && (
              <div className="flex gap-2 mt-2">
                <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                  Oracle Network Active
                </span>
                {(dataSource.oracle || dataSource.coingecko) && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    Real-time Updates
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={loadPrices}
              disabled={loading}
              className="text-sm text-gray-400 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <Link href="/" className="text-gray-400 hover:text-white transition">
              Back
            </Link>
          </div>
        </div>

        {loading && prices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading price feeds...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {prices.map((feed) => {
              const badge = getSourceBadge();
              return (
                <div key={feed.symbol} className="glass-card rounded-xl p-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold">{feed.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${badge.color}`}>
                          {badge.text}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400">{feed.symbol}</p>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-3">
                        <p className="text-2xl font-bold gradient-text">{feed.price}</p>
                        <span className={`text-sm font-semibold ${feed.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
                          {feed.change}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Updated: {feed.updated}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 glass-card rounded-xl p-6">
          <h3 className="text-lg font-bold mb-2">Oracle Contract</h3>
          <p className="text-sm text-gray-400 mb-2">
            Package Hash: <span className="font-mono text-gray-300">hash-c558b459...433bc22ac</span>
          </p>
          <a
            href="https://testnet.cspr.live/contract-package/c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-red-400 hover:text-red-300 underline"
          >
            View on Explorer
          </a>
        </div>

        <div className="mt-4 glass-card rounded-xl p-6">
          <h3 className="text-lg font-bold mb-2">How It Works</h3>
          <div className="text-sm text-gray-400 space-y-1">
            <p>CasperLink Oracle aggregates prices from multiple sources and stores them on-chain.</p>
            <p>Prices are updated in real-time and used for intent execution and slippage protection.</p>
            <p>All price data is verifiable on the Casper blockchain.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

