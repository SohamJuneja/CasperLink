'use client';

import { useState, useEffect } from 'react';
import { useClickRef } from '@make-software/csprclick-ui';
import Link from 'next/link';

interface ClickAccount {
  public_key: string;
  [key: string]: unknown;
}

interface ClickEvent {
  account: ClickAccount;
  [key: string]: unknown;
}

interface Intent {
  id: string;
  fromToken: string;
  toToken: string;
  amount: string;
  status: 'Created' | 'Pending' | 'Executing' | 'Completed';
  price?: string;
  slippage?: number;
  createdAt: string;
  txHash?: string;
}

export default function IntentsComponent() {
  const clickRef = useClickRef();
  const [activeAccount, setActiveAccount] = useState<ClickAccount | null>(null);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    loadIntents();
  }, []);

  const loadIntents = async () => {
    try {
      setLoading(true);
      
      // Load user's intents from localStorage (persists across sessions)
      const storedIntents = localStorage.getItem('casperlink_user_intents');
      let userIntents: Intent[] = [];
      
      if (storedIntents) {
        try {
          userIntents = JSON.parse(storedIntents);
        } catch {
          console.error('Failed to parse stored intents');
        }
      }

      // Only show user's real intents
      setIntents(userIntents);
    } catch (err) {
      console.error('Error loading intents:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: Intent['status']) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Executing':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (status: Intent['status']) => {
    switch (status) {
      case 'Completed':
        return '✓';
      case 'Executing':
        return '⟳';
      case 'Pending':
        return '○';
      default:
        return '•';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">My Intents</h1>
            <p className="text-gray-400">Track your cross-chain transaction intents on Casper Testnet</p>
          </div>
          <Link href="/" className="text-gray-400 hover:text-white transition">
            ← Back to Home
          </Link>
        </div>

        {!activeAccount ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <p className="text-2xl mb-4">🔗</p>
            <p className="text-xl text-gray-300 mb-2">Connect your wallet</p>
            <p className="text-gray-400">Connect your CSPR.click wallet to view your intents</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="flex justify-center items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-500"></div>
            </div>
          </div>
        ) : intents.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <p className="text-2xl mb-4">🔗</p>
            <p className="text-xl text-gray-300 mb-2">No intents yet</p>
            <p className="text-gray-500 mb-4">Create your first cross-chain intent to get started!</p>
            <Link href="/" className="btn-primary px-6 py-3 rounded-lg font-semibold inline-block">
              Create Your First Intent
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {intents.map((intent) => (
                <div
                  key={intent.id}
                  className="glass-card rounded-xl p-6 hover:bg-white/10 transition-all duration-300"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold">
                          {intent.fromToken} → {intent.toToken}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(intent.status)}`}>
                          {getStatusIcon(intent.status)} {intent.status}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-1">Amount: {intent.amount}</p>
                      {intent.price && (
                        <p className="text-gray-400 text-sm">Price: {intent.price}</p>
                      )}
                      {intent.slippage !== undefined && (
                        <p className="text-gray-400 text-sm">Slippage Protection: {intent.slippage}%</p>
                      )}
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-gray-500 mb-2">{formatDate(intent.createdAt)}</p>
                      <p className="text-xs text-gray-600 font-mono break-all">
                        ID: {intent.id}
                      </p>
                      {intent.txHash && (
                        <a
                          href={`https://testnet.cspr.live/deploy/${intent.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-red-400 hover:text-red-300 mt-2 inline-flex items-center gap-1"
                        >
                          <span>✓ Verified on Explorer</span>
                          <span>→</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {intent.status === 'Executing' && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-400"></div>
                        <p className="text-sm text-blue-400">Processing cross-chain transaction...</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="glass-card rounded-xl p-4">
                <p className="text-yellow-400 font-bold mb-2">○ Pending</p>
                <p className="text-sm text-gray-400">Intent created, awaiting Oracle price confirmation</p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-blue-400 font-bold mb-2">⟳ Executing</p>
                <p className="text-sm text-gray-400">Cross-chain transaction in progress via bridges</p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-green-400 font-bold mb-2">✓ Completed</p>
                <p className="text-sm text-gray-400">Intent successfully executed and verified on-chain</p>
              </div>
            </div>

            <div className="glass-card rounded-xl p-4 mt-6 border border-blue-500/30">
              <p className="text-sm text-blue-300 text-center">
                <strong>🔍 On-Chain Proof:</strong> Intents with &quot;Verified on Explorer&quot; links are real transactions on Casper Testnet.{' '}
                Click to view the transaction hash and contract execution details.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}