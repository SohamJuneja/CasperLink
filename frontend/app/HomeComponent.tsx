'use client';

import { useState, useEffect } from 'react';
import { useClickRef } from '@make-software/csprclick-ui';
import Link from 'next/link';
import { contractService } from '@/lib/contract';
import { SUPPORTED_CHAINS, SUPPORTED_TOKENS } from '@/types/contracts';

interface ClickAccount {
  public_key: string;
  [key: string]: unknown;
}

interface ClickEvent {
  account: ClickAccount;
  [key: string]: unknown;
}

export default function HomeComponent() {
  const clickRef = useClickRef();
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [activeAccount, setActiveAccount] = useState<ClickAccount | null>(null);

  const [sourceChain, setSourceChain] = useState('ETHEREUM');
  const [destChain, setDestChain] = useState('CASPER');
  const [tokenIn, setTokenIn] = useState('USDC');
  const [tokenOut, setTokenOut] = useState('CSPR');
  const [amount, setAmount] = useState('');

  // Smart Price Execution
  const [enablePriceCondition, setEnablePriceCondition] = useState(false);
  const [priceCondition, setPriceCondition] = useState<'gte' | 'lte'>('gte');
  const [targetPrice, setTargetPrice] = useState('');

  useEffect(() => {
    if (!clickRef) return;

    clickRef.on('csprclick:signed_in', (evt: ClickEvent) => {
      setActiveAccount(evt.account);
    });

    clickRef.on('csprclick:switched_account', (evt: ClickEvent) => {
      setActiveAccount(evt.account);
    });

    clickRef.on('csprclick:signed_out', () => {
      setActiveAccount(null);
    });

    const account = clickRef.getActiveAccount();
    if (account) {
      setActiveAccount(account);
    }
  }, [clickRef]);

  async function createIntent() {
    if (!activeAccount || !amount || !clickRef) return;
  
    try {
      setLoading(true);
      const amountInMotes = (parseFloat(amount) * 100_000_000).toString();
      
      const deployJSON = await contractService.createIntentDeploy(
        activeAccount.public_key,
        sourceChain,
        destChain,
        tokenIn,
        tokenOut,
        amountInMotes
      );
  
      const result = await clickRef.send(deployJSON, activeAccount.public_key);
  
      if (result?.deployHash) {
        setTxHash(result.deployHash);

        // Get existing intents first to calculate sequential ID
        const storedIntents = localStorage.getItem('casperlink_user_intents');
        let intents = [];

        if (storedIntents) {
          try {
            intents = JSON.parse(storedIntents);
          } catch {
            console.error('Failed to parse stored intents');
          }
        }

        // Calculate next sequential intent ID (1, 2, 3...)
        // This should match the contract's auto-increment ID
        const nextIntentId = intents.length + 1;

        // 🔥 NEW: Save intent to localStorage with price condition
        const newIntent = {
          id: nextIntentId.toString(), // Sequential ID matching contract
          clientId: `intent_${Date.now()}`, // Keep timestamp for uniqueness
          fromToken: tokenIn,
          toToken: tokenOut,
          fromChain: sourceChain,
          toChain: destChain,
          amount: `${amount} ${tokenIn}`,
          status: enablePriceCondition ? 'Watching' : 'Pending',
          createdAt: new Date().toISOString(),
          txHash: result.deployHash,
          // Smart Price Execution fields
          hasPriceCondition: enablePriceCondition,
          priceCondition: enablePriceCondition ? priceCondition : null,
          targetPrice: enablePriceCondition ? parseFloat(targetPrice) : null,
          priceToken: enablePriceCondition ? tokenIn : null,
        };

        intents.unshift(newIntent);
        localStorage.setItem('casperlink_user_intents', JSON.stringify(intents));
        // 🔥 END NEW
        
        setAmount('');
      }
    } catch (error) {
      console.error('Failed:', error);
      alert('❌ Failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-700 rounded-xl flex items-center justify-center">
              <span className="text-4xl">⚡</span>
            </div>
            <h1 className="text-5xl font-bold gradient-text">CasperLink</h1>
          </div>
          <h2 className="text-6xl font-bold mb-6">
            Cross-Chain Intents,
            <br />
            <span className="gradient-text">Simplified</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            First intent-based cross-chain execution framework on Casper.
          </p>
          <div className="flex justify-center gap-4 mt-6">
            <Link href="/intents" className="text-sm text-gray-400 hover:text-white transition underline">
              View My Intents
            </Link>
            <span className="text-gray-600">•</span>
            <Link href="/how-it-works" className="text-sm text-gray-400 hover:text-white transition underline">
              How It Works
            </Link>
            <span className="text-gray-600">•</span>
            <Link href="/prices" className="text-sm text-gray-400 hover:text-white transition underline">
              Oracle Prices
            </Link>
          </div>
        </div>

        <div className="max-w-2xl mx-auto glass-card rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-6">Create Cross-Chain Intent</h3>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">From Chain</label>
              <select
                value={sourceChain}
                onChange={(e) => setSourceChain(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3"
              >
                {SUPPORTED_CHAINS.map((chain) => (
                  <option key={chain} value={chain}>{chain}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Token In</label>
              <div className="flex gap-4">
                <select
                  value={tokenIn}
                  onChange={(e) => setTokenIn(e.target.value)}
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-3"
                >
                  {SUPPORTED_TOKENS.map((token) => (
                    <option key={token} value={token}>{token}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount"
                  className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-3"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">To Chain</label>
              <select
                value={destChain}
                onChange={(e) => setDestChain(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3"
              >
                {SUPPORTED_CHAINS.map((chain) => (
                  <option key={chain} value={chain}>{chain}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Token Out</label>
              <select
                value={tokenOut}
                onChange={(e) => setTokenOut(e.target.value)}
                className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3"
              >
                {SUPPORTED_TOKENS.map((token) => (
                  <option key={token} value={token}>{token}</option>
                ))}
              </select>
            </div>

            {/* Smart Price Execution Section */}
            <div className="border border-white/10 rounded-lg p-4 bg-gradient-to-r from-blue-500/5 to-purple-500/5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">⚡</span>
                  <span className="font-medium">Smart Price Execution</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enablePriceCondition}
                    onChange={(e) => setEnablePriceCondition(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              {enablePriceCondition && (
                <div className="space-y-3 mt-4">
                  <p className="text-xs text-gray-400">
                    Set a price condition - your intent will execute automatically when the target price is reached.
                  </p>
                  <div className="flex gap-3">
                    <select
                      value={priceCondition}
                      onChange={(e) => setPriceCondition(e.target.value as 'gte' | 'lte')}
                      className="bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="gte">Execute when {tokenIn} price &gt;=</option>
                      <option value="lte">Execute when {tokenIn} price &lt;=</option>
                    </select>
                    <div className="flex-1 relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                      <input
                        type="number"
                        step="0.0001"
                        value={targetPrice}
                        onChange={(e) => setTargetPrice(e.target.value)}
                        placeholder="Target price"
                        className="w-full bg-black/30 border border-white/10 rounded-lg pl-7 pr-4 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-500/10 rounded-lg px-3 py-2">
                    <span>💡</span>
                    <span>
                      Intent will be in &quot;Watching&quot; status until {tokenIn} price
                      {priceCondition === 'gte' ? ' reaches or exceeds ' : ' drops to or below '}
                      ${targetPrice || '...'} USD
                    </span>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={createIntent}
              disabled={loading || !amount || !activeAccount}
              className="w-full btn-primary py-4 rounded-lg font-bold text-lg disabled:opacity-50"
            >
              {loading ? 'Creating Intent...' : 'Create Intent'}
            </button>

            {txHash && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-400 break-all mb-2">
                  ✅ Intent created! TX: {txHash}
                </p>
                <div className="flex gap-2">
                  <a 
                    href={`https://testnet.cspr.live/deploy/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-green-300 hover:text-green-200 underline"
                  >
                    View on Explorer →
                  </a>
                  <span className="text-gray-500">•</span>
                  <Link
                    href="/intents"
                    className="text-xs text-green-300 hover:text-green-200 underline"
                  >
                    View in My Intents →
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto mt-16">
          <div className="glass-card rounded-xl p-6 text-center">
            <div className="text-3xl font-bold gradient-text">5</div>
            <div className="text-sm text-gray-400 mt-1">Supported Chains</div>
          </div>
          <div className="glass-card rounded-xl p-6 text-center">
            <div className="text-3xl font-bold gradient-text">7</div>
            <div className="text-sm text-gray-400 mt-1">Supported Tokens</div>
          </div>
          <div className="glass-card rounded-xl p-6 text-center">
            <div className="text-3xl font-bold gradient-text">Live</div>
            <div className="text-sm text-gray-400 mt-1">On Casper Testnet</div>
          </div>
        </div>
      </section>
    </div>
  );
}