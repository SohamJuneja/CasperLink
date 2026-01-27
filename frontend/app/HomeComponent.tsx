'use client';

import { useState, useEffect } from 'react';
import { useClickRef } from '@make-software/csprclick-ui';
import Link from 'next/link';
import { contractService } from '@/lib/contract';
import { SUPPORTED_CHAINS, SUPPORTED_TOKENS } from '@/types/contracts';

// Intent types available
type IntentType = 'swap' | 'dca' | 'limit-order' | 'stop-loss' | 'take-profit';

// DCA intervals
type DCAInterval = 'minute' | 'hourly' | 'daily' | 'weekly';

interface ClickAccount {
  public_key: string;
  [key: string]: unknown;
}

interface ClickEvent {
  account: ClickAccount;
  [key: string]: unknown;
}

// Intent type configurations
const INTENT_TYPES: { value: IntentType; label: string; description: string; icon: string }[] = [
  { value: 'swap', label: 'Instant Swap', description: 'Execute swap immediately', icon: '🔄' },
  { value: 'dca', label: 'DCA Strategy', description: 'Dollar-cost average over time', icon: '📈' },
  { value: 'limit-order', label: 'Limit Order', description: 'Execute at specific price', icon: '🎯' },
  { value: 'stop-loss', label: 'Stop Loss', description: 'Sell when price drops below', icon: '🛡️' },
  { value: 'take-profit', label: 'Take Profit', description: 'Sell when price rises above', icon: '💰' },
];

const DCA_INTERVALS: { value: DCAInterval; label: string; description: string }[] = [
  { value: 'minute', label: 'Every Minute', description: 'Test mode - every 60s' },
  { value: 'hourly', label: 'Hourly', description: 'Execute every hour' },
  { value: 'daily', label: 'Daily', description: 'Execute once per day' },
  { value: 'weekly', label: 'Weekly', description: 'Execute once per week' },
];

export default function HomeComponent() {
  const clickRef = useClickRef();
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [activeAccount, setActiveAccount] = useState<ClickAccount | null>(null);

  // Intent type selection
  const [intentType, setIntentType] = useState<IntentType>('swap');

  const [sourceChain, setSourceChain] = useState('CASPER');
  const [destChain, setDestChain] = useState('CASPER');
  const [tokenIn, setTokenIn] = useState('CSPR');
  const [tokenOut, setTokenOut] = useState('WUSDC');
  const [amount, setAmount] = useState('');

  // Smart Price Execution (for limit-order, stop-loss, take-profit)
  const [targetPrice, setTargetPrice] = useState('');

  // DCA specific fields
  const [dcaInterval, setDcaInterval] = useState<DCAInterval>('daily');
  const [dcaCount, setDcaCount] = useState('5'); // Number of executions
  const [dcaAmountPerExecution, setDcaAmountPerExecution] = useState(''); // Amount per execution

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

  // Determine if this intent type requires price monitoring
  const requiresPriceCondition = ['limit-order', 'stop-loss', 'take-profit'].includes(intentType);
  const isDCA = intentType === 'dca';

  // Get the effective amount (for DCA it's per-execution amount)
  const getEffectiveAmount = () => {
    if (isDCA) {
      return dcaAmountPerExecution;
    }
    return amount;
  };

  // Get total amount for DCA
  const getTotalDCAAmount = () => {
    const perExecution = parseFloat(dcaAmountPerExecution) || 0;
    const count = parseInt(dcaCount) || 0;
    return (perExecution * count).toFixed(2);
  };

  // Get price condition based on intent type
  const getPriceCondition = (): 'gte' | 'lte' | null => {
    switch (intentType) {
      case 'limit-order':
        return 'lte'; // Buy when price drops to target
      case 'stop-loss':
        return 'lte'; // Sell when price drops below
      case 'take-profit':
        return 'gte'; // Sell when price rises above
      default:
        return null;
    }
  };

  async function createIntent() {
    const effectiveAmount = getEffectiveAmount();
    if (!activeAccount || !effectiveAmount || !clickRef) return;

    // Validation for price-based intents
    if (requiresPriceCondition && !targetPrice) {
      alert('Please set a target price for this intent type');
      return;
    }

    // Validation for DCA
    if (isDCA && (!dcaAmountPerExecution || !dcaCount)) {
      alert('Please set amount per execution and number of executions');
      return;
    }

    try {
      setLoading(true);

      // Check if this is a same-chain swap (CSPR.trade) or cross-chain (bridge)
      const isSameChainSwap = sourceChain === 'CASPER' && destChain === 'CASPER';

      let txHash: string | null = null;

      if (isSameChainSwap) {
        // For same-chain swaps (DCA, Limit, Stop-Loss, Take-Profit on CSPR.trade):
        // Don't call the IntentParser contract - just store locally
        // The actual swap will be executed via CSPR.trade when triggered
        txHash = `local_${Date.now()}`; // Local intent ID (no on-chain tx needed for creation)
        console.log('Creating local CSPR.trade intent (no contract call)');
      } else {
        // For cross-chain swaps, use the IntentParser contract (bridge)
        const amountInMotes = (parseFloat(effectiveAmount) * 100_000_000).toString();

        const deployJSON = await contractService.createIntentDeploy(
          activeAccount.public_key,
          sourceChain,
          destChain,
          tokenIn,
          tokenOut,
          amountInMotes
        );

        const result = await clickRef.send(deployJSON, activeAccount.public_key);
        txHash = result?.deployHash || null;
      }

      if (txHash) {
        setTxHash(isSameChainSwap ? 'Intent created locally' : txHash);

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
        const nextIntentId = intents.length + 1;

        // Determine initial status based on intent type
        let initialStatus: string;
        if (requiresPriceCondition) {
          initialStatus = 'Watching'; // Price-based intents watch for condition
        } else if (isDCA) {
          initialStatus = 'Scheduled'; // DCA intents are scheduled
        } else {
          initialStatus = 'Pending'; // Regular swaps are pending execution
        }

        // Calculate next execution time for DCA
        const getNextExecutionTime = () => {
          const now = Date.now();
          switch (dcaInterval) {
            case 'minute':
              return now + 60 * 1000; // 1 minute (test mode)
            case 'hourly':
              return now + 60 * 60 * 1000; // 1 hour
            case 'daily':
              return now + 24 * 60 * 60 * 1000; // 1 day
            case 'weekly':
              return now + 7 * 24 * 60 * 60 * 1000; // 1 week
            default:
              return now + 24 * 60 * 60 * 1000;
          }
        };

        // Build intent object with all fields
        const newIntent = {
          id: nextIntentId.toString(),
          clientId: `intent_${Date.now()}`,
          fromToken: tokenIn,
          toToken: tokenOut,
          fromChain: sourceChain,
          toChain: destChain,
          amount: isDCA ? `${dcaAmountPerExecution} ${tokenIn}` : `${effectiveAmount} ${tokenIn}`,
          status: initialStatus,
          createdAt: new Date().toISOString(),
          txHash: isSameChainSwap ? null : txHash, // No tx hash for local intents
          isLocalIntent: isSameChainSwap, // Flag for CSPR.trade intents

          // Intent type
          intentType: intentType,

          // Smart Price Execution fields (for limit-order, stop-loss, take-profit)
          hasPriceCondition: requiresPriceCondition,
          priceCondition: getPriceCondition(),
          targetPrice: requiresPriceCondition ? parseFloat(targetPrice) : null,
          priceToken: requiresPriceCondition ? tokenIn : null,

          // DCA specific fields
          isDCA: isDCA,
          dcaInterval: isDCA ? dcaInterval : null,
          dcaCount: isDCA ? parseInt(dcaCount) : null,
          dcaExecuted: 0,
          dcaTotalAmount: isDCA ? getTotalDCAAmount() : null,
          nextExecutionTime: isDCA ? getNextExecutionTime() : null,
          dcaExecutions: isDCA ? [] : undefined,
        };

        intents.unshift(newIntent);
        localStorage.setItem('casperlink_user_intents', JSON.stringify(intents));

        // Reset form
        setAmount('');
        setDcaAmountPerExecution('');
        setTargetPrice('');
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
          <h3 className="text-2xl font-bold mb-6">Create Smart Intent</h3>

          <div className="space-y-6">
            {/* Intent Type Selector */}
            <div>
              <label className="block text-sm font-medium mb-3">Strategy Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {INTENT_TYPES.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setIntentType(type.value)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      intentType === type.value
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-white/10 bg-black/20 hover:border-white/30'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span>{type.icon}</span>
                      <span className="font-medium text-sm">{type.label}</span>
                    </div>
                    <p className="text-xs text-gray-400">{type.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Chain Selection - Only show for non-CSPR.trade swaps */}
            {intentType === 'swap' && (
              <>
                <div className="grid grid-cols-2 gap-4">
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
                </div>
              </>
            )}

            {/* Token Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">From Token</label>
                <select
                  value={tokenIn}
                  onChange={(e) => setTokenIn(e.target.value)}
                  className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3"
                >
                  {SUPPORTED_TOKENS.map((token) => (
                    <option key={token} value={token}>{token}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">To Token</label>
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
            </div>

            {/* Amount Input - For non-DCA intents */}
            {!isDCA && (
              <div>
                <label className="block text-sm font-medium mb-2">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Amount in ${tokenIn}`}
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 pr-16"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                    {tokenIn}
                  </span>
                </div>
              </div>
            )}

            {/* DCA Configuration */}
            {isDCA && (
              <div className="border border-blue-500/30 rounded-lg p-4 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📈</span>
                  <span className="font-medium">DCA Strategy Configuration</span>
                </div>

                {/* DCA Interval */}
                <div>
                  <label className="block text-sm font-medium mb-2">Execution Frequency</label>
                  <div className="grid grid-cols-3 gap-2">
                    {DCA_INTERVALS.map((interval) => (
                      <button
                        key={interval.value}
                        onClick={() => setDcaInterval(interval.value)}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          dcaInterval === interval.value
                            ? 'border-blue-500 bg-blue-500/20'
                            : 'border-white/10 bg-black/20 hover:border-white/30'
                        }`}
                      >
                        <span className="font-medium text-sm">{interval.label}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{interval.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount per execution */}
                <div>
                  <label className="block text-sm font-medium mb-2">Amount Per Execution</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={dcaAmountPerExecution}
                      onChange={(e) => setDcaAmountPerExecution(e.target.value)}
                      placeholder="Amount each time"
                      className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 pr-16"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      {tokenIn}
                    </span>
                  </div>
                </div>

                {/* Number of executions */}
                <div>
                  <label className="block text-sm font-medium mb-2">Number of Executions</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={dcaCount}
                    onChange={(e) => setDcaCount(e.target.value)}
                    placeholder="How many times"
                    className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3"
                  />
                </div>

                {/* DCA Summary */}
                {dcaAmountPerExecution && dcaCount && (
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 space-y-1">
                    <p className="text-xs text-blue-400 font-medium">Strategy Summary:</p>
                    <p className="text-sm text-white">
                      Swap <span className="font-bold">{dcaAmountPerExecution} {tokenIn}</span> → {tokenOut}
                    </p>
                    <p className="text-sm text-white">
                      Every <span className="font-bold">{dcaInterval}</span> for <span className="font-bold">{dcaCount}</span> times
                    </p>
                    <p className="text-sm text-gray-400">
                      Total: <span className="font-bold">{getTotalDCAAmount()} {tokenIn}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Price Condition - For limit-order, stop-loss, take-profit */}
            {requiresPriceCondition && (
              <div className="border border-orange-500/30 rounded-lg p-4 bg-gradient-to-r from-orange-500/5 to-yellow-500/5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">
                    {intentType === 'limit-order' ? '🎯' : intentType === 'stop-loss' ? '🛡️' : '💰'}
                  </span>
                  <span className="font-medium">
                    {intentType === 'limit-order' && 'Limit Order Price'}
                    {intentType === 'stop-loss' && 'Stop Loss Trigger'}
                    {intentType === 'take-profit' && 'Take Profit Target'}
                  </span>
                </div>

                <p className="text-xs text-gray-400 mb-3">
                  {intentType === 'limit-order' && `Execute swap when ${tokenIn} price drops to your target (buy low)`}
                  {intentType === 'stop-loss' && `Automatically sell ${tokenIn} if price drops below threshold`}
                  {intentType === 'take-profit' && `Automatically sell ${tokenIn} when price rises above target`}
                </p>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    step="0.0001"
                    value={targetPrice}
                    onChange={(e) => setTargetPrice(e.target.value)}
                    placeholder={`Target ${tokenIn} price in USD`}
                    className="w-full bg-black/30 border border-white/10 rounded-lg pl-8 pr-4 py-3"
                  />
                </div>

                {targetPrice && (
                  <div className="flex items-center gap-2 text-xs text-orange-400 bg-orange-500/10 rounded-lg px-3 py-2 mt-3">
                    <span>⚡</span>
                    <span>
                      {intentType === 'limit-order' && `Will execute when ${tokenIn} ≤ $${targetPrice}`}
                      {intentType === 'stop-loss' && `Will sell when ${tokenIn} drops below $${targetPrice}`}
                      {intentType === 'take-profit' && `Will sell when ${tokenIn} rises above $${targetPrice}`}
                    </span>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={createIntent}
              disabled={loading || (!isDCA && !amount) || (isDCA && !dcaAmountPerExecution) || !activeAccount}
              className="w-full btn-primary py-4 rounded-lg font-bold text-lg disabled:opacity-50"
            >
              {loading ? 'Creating...' : (
                <>
                  {intentType === 'swap' && 'Create Swap Intent'}
                  {intentType === 'dca' && 'Create DCA Strategy'}
                  {intentType === 'limit-order' && 'Create Limit Order'}
                  {intentType === 'stop-loss' && 'Create Stop Loss'}
                  {intentType === 'take-profit' && 'Create Take Profit'}
                </>
              )}
            </button>

            {txHash && (
              <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                <p className="text-sm text-green-400 break-all mb-2">
                  ✅ {txHash === 'Intent created locally'
                    ? 'Strategy created! Ready to execute on CSPR.trade'
                    : `Intent created! TX: ${txHash}`}
                </p>
                <div className="flex gap-2">
                  {txHash !== 'Intent created locally' && (
                    <>
                      <a
                        href={`https://testnet.cspr.live/deploy/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-300 hover:text-green-200 underline"
                      >
                        View on Explorer →
                      </a>
                      <span className="text-gray-500">•</span>
                    </>
                  )}
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