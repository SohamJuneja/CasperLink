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
        
        // 🔥 NEW: Save intent to localStorage
        const newIntent = {
          id: `intent_${Date.now()}`,
          fromToken: tokenIn,
          toToken: tokenOut,
          amount: `${amount} ${tokenIn}`,
          status: 'Pending',
          createdAt: new Date().toISOString(),
          txHash: result.deployHash,
        };

        const storedIntents = localStorage.getItem('casperlink_user_intents');
        let intents = [];
        
        if (storedIntents) {
          try {
            intents = JSON.parse(storedIntents);
          } catch {
            console.error('Failed to parse stored intents');
          }
        }

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