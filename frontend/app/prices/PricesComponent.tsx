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
  const [updatingOracle, setUpdatingOracle] = useState(false);
  const [oracleStatus, setOracleStatus] = useState<{
    message: string;
    type: 'success' | 'error';
    deploys?: { feed: string; deployHash: string }[];
  } | null>(null);

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

  async function updateOracle() {
    setUpdatingOracle(true);
    setOracleStatus(null);
    try {
      const res = await fetch('/api/update-oracle');
      const data = await res.json();
      if (data.success) {
        setOracleStatus({
          message: `${data.updated}/${data.total} feeds updated on-chain (${data.elapsed})`,
          type: 'success',
          deploys: data.results?.map((r: { feed: string; deployHash: string }) => ({
            feed: r.feed,
            deployHash: r.deployHash,
          })),
        });
        // Reload prices to reflect new oracle data
        await loadPrices();
      } else {
        setOracleStatus({ message: data.error || 'Failed to update oracle', type: 'error' });
      }
    } catch (error) {
      setOracleStatus({ message: `Error: ${error instanceof Error ? error.message : 'Unknown'}`, type: 'error' });
    } finally {
      setUpdatingOracle(false);
    }
  }

  const getSourceBadge = (source: 'oracle' | 'coingecko' | 'fallback') => {
    switch (source) {
      case 'oracle':
        return { text: 'On-Chain', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
      case 'coingecko':
        return { text: 'CoinGecko', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' };
      case 'fallback':
        return { text: 'Fallback', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
    }
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
          <div className="flex items-center gap-4">
            <button
              onClick={updateOracle}
              disabled={updatingOracle}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm font-semibold hover:from-red-600 hover:to-orange-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {updatingOracle ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Updating On-Chain...
                </>
              ) : (
                'Update Oracle On-Chain'
              )}
            </button>
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

        {oracleStatus && (
          <div className={`mb-4 p-4 rounded-lg border text-sm relative ${
            oracleStatus.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <button
              onClick={() => setOracleStatus(null)}
              className="absolute top-2 right-2 text-gray-500 hover:text-white transition"
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="pr-6">
              <p className="font-semibold">
                {oracleStatus.type === 'success' ? 'Oracle updated: ' : ''}{oracleStatus.message}
              </p>
              {oracleStatus.deploys && oracleStatus.deploys.length > 0 && (
                <div className="mt-2 space-y-1">
                  {oracleStatus.deploys.map((d) => (
                    <div key={d.deployHash} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400">{d.feed}:</span>
                      <a
                        href={`https://testnet.cspr.live/deploy/${d.deployHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-red-400 hover:text-red-300 underline"
                      >
                        {d.deployHash.slice(0, 10)}...{d.deployHash.slice(-8)}
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {loading && prices.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading price feeds...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {prices.map((feed) => {
              const badge = getSourceBadge(feed.source);
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

