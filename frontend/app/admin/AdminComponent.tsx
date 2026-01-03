'use client';

import { useState, useEffect } from 'react';
import { useClickRef } from '@make-software/csprclick-ui';
import Link from 'next/link';
import * as CasperSDK from 'casper-js-sdk';
import { CONTRACT_CONFIG } from '@/types/contracts';

const { CLPublicKey, DeployUtil, RuntimeArgs, CLValueBuilder } = CasperSDK;

interface ClickAccount {
  public_key: string;
  [key: string]: unknown;
}

interface ClickEvent {
  account: ClickAccount;
  [key: string]: unknown;
}

export default function AdminComponent() {
  const clickRef = useClickRef();
  const [activeAccount, setActiveAccount] = useState<ClickAccount | null>(null);
  const [loading, setLoading] = useState(false);

  const [prices, setPrices] = useState({
    BTC_USD: '98500',
    ETH_USD: '3450',
    CSPR_USD: '0.0441',
    USDC_USD: '1.00',
    USDT_USD: '0.9998'
  });

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
    if (account) setActiveAccount(account);
  }, [clickRef]);

  async function setPriceOnChain(priceFeed: string, priceUSD: string) {
    if (!activeAccount || !clickRef) return;

    try {
      setLoading(true);
      
      // Convert price to motes (multiply by 100,000,000)
      const priceInMotes = (parseFloat(priceUSD) * 100_000_000).toString();
      const timestamp = Math.floor(Date.now() / 1000); // Current Unix timestamp
      
      const publicKey = CLPublicKey.fromHex(activeAccount.public_key.toLowerCase());
      
      const args = RuntimeArgs.fromMap({
        price_feed: CLValueBuilder.string(priceFeed),
        price_value: CLValueBuilder.u512(priceInMotes),  // Changed from 'price' to 'price_value'
        timestamp: CLValueBuilder.u64(timestamp)          // Added timestamp
      });

      const deploy = DeployUtil.makeDeploy(
        new DeployUtil.DeployParams(publicKey, CONTRACT_CONFIG.chainName),
        DeployUtil.ExecutableDeployItem.newStoredVersionContractByHash(
          Uint8Array.from(Buffer.from(CONTRACT_CONFIG.oraclePackageHash.replace('hash-', ''), 'hex')),
          null,
          'submit_price',  // Changed from 'set_price' to 'submit_price'
          args
        ),
        DeployUtil.standardPayment('5000000000')
      );

      const deployJSON = JSON.stringify(DeployUtil.deployToJson(deploy).deploy);
      
      const result = await clickRef.send(deployJSON, activeAccount.public_key);
      
      if (result?.deployHash) {
        alert(`✅ Price set! TX: ${result.deployHash}`);
      }
    } catch (error) {
      console.error('Failed:', error);
      alert('❌ Failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function setAllPrices() {
    if (!confirm('Set all 5 prices? This will cost ~25 CSPR in gas fees.')) return;
    
    for (const [feed, price] of Object.entries(prices)) {
      await setPriceOnChain(feed, price);
      // Wait 2 seconds between each to avoid nonce conflicts
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    alert('✅ All prices set! Visit /prices to see them.');
  }

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold gradient-text">Admin Panel</h1>
          <Link href="/" className="text-gray-400 hover:text-white transition">← Back</Link>
        </div>

        {!activeAccount ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <p className="text-gray-400">Connect wallet to access admin functions</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="glass-card rounded-xl p-6">
              <h2 className="text-2xl font-bold mb-4">Set Oracle Prices</h2>
              <p className="text-sm text-gray-400 mb-6">Update cryptocurrency prices in the Oracle contract</p>
              
              <div className="space-y-4">
                {Object.entries(prices).map(([feed, price]) => (
                  <div key={feed} className="flex gap-4 items-center">
                    <label className="w-32 text-sm">{feed.replace('_', '/')}</label>
                    <input
                      type="number"
                      step="0.0001"
                      value={price}
                      onChange={(e) => setPrices({...prices, [feed]: e.target.value})}
                      className="flex-1 bg-black/30 border border-white/10 rounded-lg px-4 py-2"
                    />
                    <button
                      onClick={() => setPriceOnChain(feed, price)}
                      disabled={loading}
                      className="btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                    >
                      Set
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={setAllPrices}
                disabled={loading}
                className="w-full btn-primary py-3 rounded-lg font-bold mt-6 disabled:opacity-50"
              >
                {loading ? 'Setting Prices...' : 'Set All Prices'}
              </button>
            </div>

            <div className="glass-card rounded-xl p-6">
              <h3 className="text-lg font-bold mb-2">⚠️ Admin Info</h3>
              <p className="text-sm text-gray-400">
                Only the Oracle contract owner can set prices. Each transaction costs ~5 CSPR in gas fees.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

