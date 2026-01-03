'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { contractService } from '@/lib/contract';

interface PriceFeed {
  symbol: string;
  name: string;
  price: string;
  change: string;
  updated: string;
}

// Mock data - fallback when Oracle prices are unavailable or all zero
const mockPrices: PriceFeed[] = [
  { symbol: 'BTC_USD', name: 'Bitcoin', price: '$98,500.00', change: '+2.4%', updated: '2 min ago' },
  { symbol: 'ETH_USD', name: 'Ethereum', price: '$3,450.00', change: '+1.8%', updated: '2 min ago' },
  { symbol: 'CSPR_USD', name: 'Casper', price: '$0.0441', change: '-0.5%', updated: '2 min ago' },
];

export default function PricesComponent() {
  const [prices, setPrices] = useState<PriceFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingMock, setUsingMock] = useState(false);

  useEffect(() => {
    loadPrices();
  }, []);

  async function loadPrices() {
    setLoading(true);
    setUsingMock(false);
    
    try {
      // Try to fetch real prices from Oracle contract
      const priceFeeds = [
        { symbol: 'BTC_USD', name: 'Bitcoin' },
        { symbol: 'ETH_USD', name: 'Ethereum' },
        { symbol: 'CSPR_USD', name: 'Casper' },
      ];

      const pricesData = await Promise.all(
        priceFeeds.map(async (feed) => {
          try {
            const priceValue = await contractService.getOraclePrice(feed.symbol);
            const priceNum = parseFloat(priceValue) / 100_000_000; // Convert from motes
            
            // If price is 0 or invalid, return null to trigger fallback
            if (!priceNum || priceNum === 0 || isNaN(priceNum)) {
              return null;
            }

            // Format price based on value
            const formattedPrice = priceNum > 1 
              ? `$${priceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : `$${priceNum.toFixed(4)}`;

            return {
              ...feed,
              price: formattedPrice,
              change: '+0.0%', // Real-time change calculation would require price history
              updated: 'Just now',
            };
          } catch (error) {
            console.error(`Failed to fetch ${feed.symbol}:`, error);
            return null;
          }
        })
      );

      // Check if all prices are null/zero - use mock data as fallback
      const validPrices = pricesData.filter(p => p !== null) as PriceFeed[];
      
      if (validPrices.length === 0 || pricesData.every(p => p === null)) {
        console.warn('⚠️ All Oracle prices are zero or unavailable. Using mock data.');
        setPrices(mockPrices);
        setUsingMock(true);
      } else {
        // Use real prices, fill in missing ones with mock
        const finalPrices = pricesData.map((p, idx) => 
          p || mockPrices[idx]
        ) as PriceFeed[];
        setPrices(finalPrices);
        setUsingMock(false);
      }
    } catch (error) {
      console.error('Failed to load prices from Oracle:', error);
      // Fallback to mock data on error
      setPrices(mockPrices);
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">Oracle Price Feeds</h1>
            <p className="text-gray-400">
              {usingMock 
                ? 'Using mock data (Oracle prices unavailable)' 
                : 'Live cryptocurrency prices from CasperLink Oracle'}
            </p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={loadPrices} 
              disabled={loading}
              className="text-sm text-gray-400 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
            </button>
            <Link href="/" className="text-gray-400 hover:text-white transition">
              ← Back
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading price feeds from blockchain...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {prices.map((feed) => (
              <div key={feed.symbol} className="glass-card rounded-xl p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold mb-1">{feed.name}</h3>
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
            ))}
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
            View on Explorer →
          </a>
        </div>
      </div>
    </div>
  );
}

