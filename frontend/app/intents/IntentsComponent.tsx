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
  intent_id: number;
  source_chain: string;
  dest_chain: string;
  token_in: string;
  token_out: string;
  amount_in: string;
  status: string;
  timestamp: string;
}

export default function IntentsComponent() {
  const clickRef = useClickRef();
  const [activeAccount, setActiveAccount] = useState<ClickAccount | null>(null);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(false);

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

  async function loadIntents() {
    if (!activeAccount) return;
    
    setLoading(true);
    // Mock data for now - we'll add real contract queries later
    setIntents([
      {
        intent_id: 1,
        source_chain: 'ETHEREUM',
        dest_chain: 'CASPER',
        token_in: 'USDC',
        token_out: 'CSPR',
        amount_in: '100.00',
        status: 'Pending',
        timestamp: new Date().toISOString(),
      }
    ]);
    setLoading(false);
  }

  useEffect(() => {
    if (activeAccount) {
      loadIntents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAccount]);

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold gradient-text">My Intents</h1>
          <Link href="/" className="text-gray-400 hover:text-white transition">
            ← Back to Home
          </Link>
        </div>

        {!activeAccount ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <p className="text-gray-400">Connect your wallet to view your intents</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading your intents...</p>
          </div>
        ) : intents.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <p className="text-gray-400 mb-4">You haven&apos;t created any intents yet</p>
            <Link href="/" className="btn-primary px-6 py-2 rounded-lg font-semibold inline-block">
              Create Your First Intent
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {intents.map((intent) => (
              <div key={intent.intent_id} className="glass-card rounded-xl p-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold">#{intent.intent_id}</span>
                      <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 rounded-full text-sm">
                        {intent.status}
                      </span>
                    </div>
                    <p className="text-gray-400">
                      {intent.amount_in} {intent.token_in} on {intent.source_chain} → {intent.token_out} on {intent.dest_chain}
                    </p>
                    <p className="text-sm text-gray-500">
                      Created: {new Date(intent.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

