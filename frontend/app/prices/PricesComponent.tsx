'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PriceFeed {
  symbol: string;
  name: string;
  price: string;
  change: string;
  updated: string;
}

// Mock data - represents current market prices
// In production: queried from on-chain Oracle (hash-c558b459...)
const mockPrices = [
  { symbol: 'BTC_USD', name: 'Bitcoin', price: '$98,500.00', change: '+2.4%', updated: '2 min ago' },
  { symbol: 'ETH_USD', name: 'Ethereum', price: '$3,450.00', change: '+1.8%', updated: '2 min ago' },
  { symbol: 'CSPR_USD', name: 'Casper', price: '$0.0441', change: '-0.5%', updated: '2 min ago' },
];

export default function PricesComponent() {
  const [prices, setPrices] = useState<PriceFeed[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPrices();
  }, []);

  async function loadPrices() {
    setLoading(true);
    
    // Simulate loading delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setPrices(mockPrices);
    setLoading(false);
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">Oracle Price Feeds</h1>
            <p className="text-gray-400">Live cryptocurrency prices from CasperLink Oracle</p>
          </div>
          <div className="flex gap-4">
            <button onClick={loadPrices} className="text-sm text-gray-400 hover:text-white transition">
              🔄 Refresh
            </button>
            <Link href="/" className="text-gray-400 hover:text-white transition">
              ← Back
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading price feeds...</p>
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

