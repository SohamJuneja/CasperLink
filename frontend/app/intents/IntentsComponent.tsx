'use client';

import { useState, useEffect, useCallback } from 'react';
import { useClickRef } from '@make-software/csprclick-ui';
import Link from 'next/link';
import { contractService } from '@/lib/contract';

interface ClickAccount {
  public_key: string;
  [key: string]: unknown;
}

interface ClickEvent {
  account: ClickAccount;
  [key: string]: unknown;
}

// Intent types
type IntentType = 'swap' | 'dca' | 'limit-order' | 'stop-loss' | 'take-profit';
type DCAInterval = 'minute' | 'hourly' | 'daily' | 'weekly';

interface Intent {
  id: string;
  fromToken: string;
  toToken: string;
  fromChain?: string;
  toChain?: string;
  amount: string;
  status: 'Created' | 'Pending' | 'Executing' | 'Completed' | 'Watching' | 'Ready' | 'Scheduled';
  price?: string;
  slippage?: number;
  createdAt: string;
  txHash?: string;

  // Intent type
  intentType?: IntentType;

  // Smart Price Execution fields
  hasPriceCondition?: boolean;
  priceCondition?: 'gte' | 'lte' | null;
  targetPrice?: number | null;
  priceToken?: string | null;

  // DCA specific fields
  isDCA?: boolean;
  dcaInterval?: DCAInterval | null;
  dcaCount?: number | null;
  dcaExecuted?: number;
  dcaTotalAmount?: string | null;
  nextExecutionTime?: number | null;
  dcaExecutions?: { txHash: string; timestamp: string; amount: string }[];
}

interface PriceData {
  [symbol: string]: number;
}

export default function IntentsComponent() {
  const clickRef = useClickRef();
  const [activeAccount, setActiveAccount] = useState<ClickAccount | null>(null);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPrices, setCurrentPrices] = useState<PriceData>({});
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [ethRecipient, setEthRecipient] = useState<string>('');
  const [showBridgeModal, setShowBridgeModal] = useState<string | null>(null);
  const [bridgeError, setBridgeError] = useState<string | null>(null);
  const [bridgeTxHash, setBridgeTxHash] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successTxHash, setSuccessTxHash] = useState<string | null>(null);
  const [dcaCountdowns, setDcaCountdowns] = useState<Record<string, number>>({});
  const [autoExecuting, setAutoExecuting] = useState<string | null>(null);
  const [pendingAutoExecution, setPendingAutoExecution] = useState<string | null>(null);

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

  // Fetch current prices from API
  const fetchPrices = useCallback(async () => {
    try {
      const response = await fetch(`/api/prices?t=${Date.now()}`, { cache: 'no-store' });
      const data = await response.json();
      if (data.success && data.prices) {
        const priceMap: PriceData = {};
        data.prices.forEach((p: { symbol: string; price: number }) => {
          // Store both formats: ETH_USD and ETH for compatibility
          priceMap[p.symbol] = p.price;
          // Also store without _USD suffix for matching with intent priceToken
          const baseSymbol = p.symbol.replace('_USD', '');
          priceMap[baseSymbol] = p.price;
        });
        setCurrentPrices(priceMap);
        return priceMap;
      }
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    }
    return currentPrices;
  }, [currentPrices]);

  // Check if price condition is met
  const checkPriceCondition = useCallback((intent: Intent, prices: PriceData): boolean => {
    if (!intent.hasPriceCondition || !intent.priceToken || !intent.targetPrice) {
      return false;
    }
    const currentPrice = prices[intent.priceToken];
    if (!currentPrice) return false;

    if (intent.priceCondition === 'gte') {
      return currentPrice >= intent.targetPrice;
    } else if (intent.priceCondition === 'lte') {
      return currentPrice <= intent.targetPrice;
    }
    return false;
  }, []);

  // Update intent statuses based on price conditions
  const updateIntentStatuses = useCallback((intents: Intent[], prices: PriceData): Intent[] => {
    let updated = false;
    const newIntents = intents.map(intent => {
      if (intent.status === 'Watching' && intent.hasPriceCondition) {
        if (checkPriceCondition(intent, prices)) {
          updated = true;
          return { ...intent, status: 'Ready' as const };
        }
      }
      return intent;
    });

    if (updated) {
      localStorage.setItem('casperlink_user_intents', JSON.stringify(newIntents));
    }
    return newIntents;
  }, [checkPriceCondition]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadIntents();
  }, []);

  // Price monitoring interval for watching intents
  useEffect(() => {
    const hasWatchingIntents = intents.some(i => i.status === 'Watching');
    if (!hasWatchingIntents) return;

    const interval = setInterval(async () => {
      const prices = await fetchPrices();
      setIntents(prev => updateIntentStatuses(prev, prices));
    }, 15000); // Check every 15 seconds

    return () => clearInterval(interval);
  }, [intents, fetchPrices, updateIntentStatuses]);

  // DCA countdown timer - updates every second and triggers auto-execution
  useEffect(() => {
    const scheduledDcaIntents = intents.filter(i => i.status === 'Scheduled' && i.isDCA && i.nextExecutionTime);
    if (scheduledDcaIntents.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const newCountdowns: Record<string, number> = {};

      scheduledDcaIntents.forEach(intent => {
        if (intent.nextExecutionTime) {
          const remaining = Math.max(0, Math.floor((intent.nextExecutionTime - now) / 1000));
          newCountdowns[intent.id] = remaining;

          // Check if this intent is ready for auto-execution
          if (remaining === 0 && !autoExecuting && !executingId && !pendingAutoExecution && activeAccount) {
            setPendingAutoExecution(intent.id);
          }
        }
      });

      setDcaCountdowns(newCountdowns);
    }, 1000);

    return () => clearInterval(interval);
  }, [intents, autoExecuting, executingId, pendingAutoExecution, activeAccount]);

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

      // Fetch current prices
      const prices = await fetchPrices();

      // Update statuses based on price conditions
      const updatedIntents = updateIntentStatuses(userIntents, prices);

      setIntents(updatedIntents);
    } catch (err) {
      console.error('Error loading intents:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get bridge URL (simple link to testnet bridge)
  const getBridgeUrl = (): string => {
    return 'https://testnet.csprbridge.com';
  };

  // Get bridge parameters for display
  const getBridgeParams = (intent: Intent) => {
    const fromChain = intent.fromChain || 'ETHEREUM';
    const toChain = intent.toChain || 'CASPER';

    // Extract amount number from string like "0.1 ETH"
    const amountMatch = intent.amount.match(/^([\d.]+)/);
    const amount = amountMatch ? amountMatch[1] : '0';

    // Map tokens to bridge-supported tokens
    // Bridge supports: USDC, WETH, LINK, CSPR
    const tokenMap: Record<string, string> = {
      'USDC': 'USDC',
      'WETH': 'WETH',
      'ETH': 'WETH',
      'LINK': 'LINK',
      'CSPR': 'CSPR',
    };

    const token = tokenMap[intent.fromToken] || intent.fromToken;

    return {
      fromChain: fromChain === 'CASPER' ? 'Casper' : 'Ethereum Sepolia',
      toChain: toChain === 'CASPER' ? 'Casper' : 'Ethereum Sepolia',
      token,
      amount,
    };
  };

  // Mark intent as bridging (user clicked to go to bridge)
  const markAsBridging = (intent: Intent) => {
    const updatedIntents = intents.map(i =>
      i.id === intent.id ? { ...i, status: 'Executing' as const } : i
    );
    setIntents(updatedIntents);
    localStorage.setItem('casperlink_user_intents', JSON.stringify(updatedIntents));
  };

  // Mark intent as completed (user confirms bridge was done)
  const markAsCompleted = (intentId: string) => {
    const updatedIntents = intents.map(i =>
      i.id === intentId ? { ...i, status: 'Completed' as const } : i
    );
    setIntents(updatedIntents);
    localStorage.setItem('casperlink_user_intents', JSON.stringify(updatedIntents));
  };

  // Check if this intent can use on-chain execution
  // Works for any intent that has an on-chain txHash (created via IntentParser)
  const canUseOnChainExecution = (intent: Intent): boolean => {
    // Must have a txHash from the original intent creation
    return !!intent.txHash;
  };

  // Check if intent can use real bridge (has supported token)
  const canUseRealBridge = (intent: Intent): boolean => {
    const supportedTokens = ['USDC', 'WETH', 'LINK'];
    return supportedTokens.includes(intent.fromToken);
  };

  // Execute intent on-chain via IntentParser
  // Uses execute_intent_with_burn() for real bridge (USDC/WETH/LINK)
  // Uses execute_intent() for demo mode (other tokens)
  const executeOnChain = async (intent: Intent) => {
    if (!activeAccount || !clickRef) {
      setBridgeError('Please connect your wallet first');
      return;
    }

    if (!ethRecipient.match(/^0x[a-fA-F0-9]{40}$/)) {
      setBridgeError('Please enter a valid Ethereum address (0x...)');
      return;
    }

    try {
      setExecutingId(intent.id);
      setBridgeError(null);

      let deployJSON: string;
      const useRealBridge = canUseRealBridge(intent);

      if (useRealBridge) {
        // REAL BRIDGE: Call execute_intent_with_burn() which calls TokenFactory.burn()
        // This will actually burn CEP-18 tokens and unlock on Ethereum!
        deployJSON = await contractService.createExecuteWithBurnDeploy(
          activeAccount.public_key,
          intent.id,
          intent.fromToken,
          ethRecipient
        );
      } else {
        // DEMO MODE: Call execute_intent() which just emits an event
        // Use this for testing without actual tokens
        deployJSON = await contractService.createExecuteIntentDeploy(
          activeAccount.public_key,
          intent.id,
          ethRecipient
        );
      }

      // Send via CSPR.click - user signs with their wallet
      const result = await clickRef.send(deployJSON, activeAccount.public_key);

      if (result?.deployHash) {
        setBridgeTxHash(result.deployHash);

        // Update intent status to Executing with the execution tx hash
        const updatedIntents = intents.map(i =>
          i.id === intent.id ? {
            ...i,
            status: 'Executing' as const,
            executeTxHash: result.deployHash,
            ethRecipient: ethRecipient,
            realBridge: useRealBridge
          } : i
        );
        setIntents(updatedIntents);
        localStorage.setItem('casperlink_user_intents', JSON.stringify(updatedIntents));

        // Close modal after success
        setTimeout(() => {
          setShowBridgeModal(null);
          setBridgeTxHash(null);
          setEthRecipient('');
        }, 3000);
      }
    } catch (error) {
      console.error('Execution failed:', error);
      setBridgeError((error as Error).message || 'Failed to execute intent');
    } finally {
      setExecutingId(null);
    }
  };

  // NEW: Execute via CSPR.trade swap - alternative to CSPR.bridge
  // Swaps CSPR -> WUSDC on CSPR.trade DEX to demonstrate working execution
  const executeViaCsprTrade = async (intent: Intent) => {
    if (!activeAccount || !clickRef) {
      setBridgeError('Please connect your wallet first');
      return;
    }

    try {
      setExecutingId(intent.id);
      setBridgeError(null);

      // Convert intent amount to CSPR motes (assume 1:1 for demo, or use price calculation)
      const amountInMotes = (parseFloat(intent.amount) * 1e9).toString(); // Convert to motes

      console.log('Executing CSPR.trade swap:', {
        intentId: intent.id,
        amount: amountInMotes,
        token: intent.toToken,
        publicKey: activeAccount.public_key
      });

      // Call backend API to create deploy using David's exact pattern
      console.log('Calling backend API to create deploy...');
      const apiResponse = await fetch('/api/create-swap-deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          publicKey: activeAccount.public_key,
          cspr_amount: amountInMotes,
          slippage_percent: 5
        })
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Failed to create deploy');
      }

      const apiResult = await apiResponse.json();
      console.log('API response:', apiResult);

      const { deployJson } = apiResult;
      console.log('Deploy JSON type:', typeof deployJson);
      console.log('Deploy JSON length:', deployJson?.length);

      // Parse to inspect the structure
      const deployObject = JSON.parse(deployJson);
      console.log('Deploy structure keys:', Object.keys(deployObject));
      console.log('Deploy hash:', deployObject.hash);
      console.log('Deploy created by backend, sending to CSPR.click...');

      // Send via CSPR.click - user signs with their wallet
      const result = await clickRef.send(deployJson, activeAccount.public_key);

      console.log('CSPR.click send result:', result);

      // CSPR.click SDK v5 returns transactionHash, not deployHash
      const txHash = result?.transactionHash || result?.deployHash;

      if (txHash) {
        setBridgeTxHash(txHash);

        // Update intent based on type
        const updatedIntents = intents.map(i => {
          if (i.id !== intent.id) return i;

          // Handle DCA intent execution
          if (i.isDCA) {
            const newExecutedCount = (i.dcaExecuted || 0) + 1;
            const isCompleted = newExecutedCount >= (i.dcaCount || 1);

            // Calculate next execution time based on interval
            const getNextTime = () => {
              const now = Date.now();
              switch (i.dcaInterval) {
                case 'minute': return now + 60 * 1000;
                case 'hourly': return now + 60 * 60 * 1000;
                case 'daily': return now + 24 * 60 * 60 * 1000;
                case 'weekly': return now + 7 * 24 * 60 * 60 * 1000;
                default: return now + 24 * 60 * 60 * 1000;
              }
            };

            // Add this execution to history
            const newExecution = {
              txHash: txHash,
              timestamp: new Date().toISOString(),
              amount: i.amount
            };

            return {
              ...i,
              status: isCompleted ? 'Completed' as const : 'Scheduled' as const,
              dcaExecuted: newExecutedCount,
              dcaExecutions: [...(i.dcaExecutions || []), newExecution],
              nextExecutionTime: isCompleted ? null : getNextTime(),
              executeTxHash: txHash,
              csprTradeSwap: true
            };
          }

          // Non-DCA intents
          return {
            ...i,
            status: 'Executing' as const,
            executeTxHash: txHash,
            csprTradeSwap: true
          };
        });
        setIntents(updatedIntents);
        localStorage.setItem('casperlink_user_intents', JSON.stringify(updatedIntents));

        // Show success modal with transaction hash
        setSuccessTxHash(txHash);
        setShowSuccessModal(true);
      } else if (result?.cancelled) {
        throw new Error('Transaction was cancelled by user');
      } else if (result?.error) {
        throw new Error(`Transaction failed: ${result.error}`);
      } else {
        throw new Error('No transaction hash received from wallet');
      }
    } catch (error) {
      console.error('CSPR.trade execution failed:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      setBridgeError((error as Error).message || 'Failed to execute swap on CSPR.trade. Check console for details.');
    } finally {
      setExecutingId(null);
    }
  };

  // Auto-execute DCA when pendingAutoExecution is set
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pendingAutoExecution || autoExecuting || executingId) return;

    const intentToExecute = intents.find(i => i.id === pendingAutoExecution);
    if (!intentToExecute) {
      setPendingAutoExecution(null);
      return;
    }

    console.log(`[DCA] Auto-executing intent ${pendingAutoExecution}`);
    setAutoExecuting(pendingAutoExecution);
    setPendingAutoExecution(null);

    executeViaCsprTrade(intentToExecute).finally(() => {
      setAutoExecuting(null);
    });
  }, [pendingAutoExecution, autoExecuting, executingId, intents]);

  const getStatusColor = (status: Intent['status']) => {
    switch (status) {
      case 'Completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'Executing':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Ready':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Watching':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'Pending':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Scheduled':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
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
      case 'Ready':
        return '⚡';
      case 'Watching':
        return '👁';
      case 'Pending':
        return '○';
      case 'Scheduled':
        return '📅';
      default:
        return '•';
    }
  };

  const getIntentTypeLabel = (intent: Intent) => {
    switch (intent.intentType) {
      case 'dca':
        return { label: 'DCA Strategy', icon: '📈', color: 'text-cyan-400' };
      case 'limit-order':
        return { label: 'Limit Order', icon: '🎯', color: 'text-orange-400' };
      case 'stop-loss':
        return { label: 'Stop Loss', icon: '🛡️', color: 'text-red-400' };
      case 'take-profit':
        return { label: 'Take Profit', icon: '💰', color: 'text-green-400' };
      default:
        return { label: 'Swap', icon: '🔄', color: 'text-gray-400' };
    }
  };

  const formatTimeUntil = (timestamp: number) => {
    const now = Date.now();
    const diff = timestamp - now;
    if (diff <= 0) return 'Now';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
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
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-2xl font-bold">
                          {intent.fromToken} → {intent.toToken}
                        </h3>
                        {/* Intent Type Badge */}
                        {intent.intentType && intent.intentType !== 'swap' && (
                          <span className={`px-2 py-0.5 rounded text-xs ${getIntentTypeLabel(intent).color} bg-white/5`}>
                            {getIntentTypeLabel(intent).icon} {getIntentTypeLabel(intent).label}
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(intent.status)}`}>
                          {getStatusIcon(intent.status)} {intent.status}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-1">Amount: {intent.amount}</p>

                      {/* DCA Progress */}
                      {intent.isDCA && (
                        <div className="mt-2 p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-cyan-400">DCA Progress</span>
                            <span className="text-white">{intent.dcaExecuted || 0} / {intent.dcaCount} executions</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-cyan-500 h-2 rounded-full transition-all"
                              style={{ width: `${((intent.dcaExecuted || 0) / (intent.dcaCount || 1)) * 100}%` }}
                            />
                          </div>
                          <div className="flex justify-between mt-1 text-xs text-gray-400">
                            <span>Every {intent.dcaInterval}</span>
                            {intent.nextExecutionTime && (
                              <span className={dcaCountdowns[intent.id] !== undefined && dcaCountdowns[intent.id] <= 10 ? 'text-yellow-400 font-bold animate-pulse' : ''}>
                                Next: {dcaCountdowns[intent.id] !== undefined
                                  ? `${dcaCountdowns[intent.id]}s`
                                  : formatTimeUntil(intent.nextExecutionTime)}
                                {dcaCountdowns[intent.id] === 0 && ' (executing...)'}
                              </span>
                            )}
                          </div>

                          {/* DCA Execution History */}
                          {intent.dcaExecutions && intent.dcaExecutions.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-cyan-500/20">
                              <p className="text-xs text-cyan-400 mb-2">Execution History:</p>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {intent.dcaExecutions.map((exec, idx) => (
                                  <div key={idx} className="flex items-center justify-between text-xs bg-black/20 rounded px-2 py-1">
                                    <span className="text-gray-400">#{idx + 1}</span>
                                    <span className="text-white">{exec.amount}</span>
                                    <a
                                      href={`https://testnet.cspr.live/deploy/${exec.txHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-cyan-400 hover:text-cyan-300 font-mono"
                                    >
                                      {exec.txHash.slice(0, 8)}...{exec.txHash.slice(-6)}
                                    </a>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      {intent.fromChain && intent.toChain && (
                        <p className="text-gray-400 text-sm mb-1">
                          Route: {intent.fromChain} → {intent.toChain}
                        </p>
                      )}
                      {intent.price && (
                        <p className="text-gray-400 text-sm">Price: {intent.price}</p>
                      )}
                      {intent.slippage !== undefined && (
                        <p className="text-gray-400 text-sm">Slippage Protection: {intent.slippage}%</p>
                      )}
                      {/* Smart Price Execution Info */}
                      {intent.hasPriceCondition && intent.targetPrice && (
                        <div className="mt-2 p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                          <p className="text-xs text-orange-400">
                            <span className="font-medium">Price Condition:</span>{' '}
                            Execute when {intent.priceToken} price{' '}
                            {intent.priceCondition === 'gte' ? '≥' : '≤'} ${intent.targetPrice.toFixed(2)}
                          </p>
                          {currentPrices[intent.priceToken || ''] && (
                            <p className="text-xs text-gray-400 mt-1">
                              Current: ${currentPrices[intent.priceToken || ''].toFixed(2)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="text-right flex flex-col items-end gap-2">
                      <p className="text-xs text-gray-500">{formatDate(intent.createdAt)}</p>
                      <p className="text-xs text-gray-600 font-mono break-all">
                        ID: {intent.id}
                      </p>
                      {intent.txHash && (
                        <a
                          href={`https://testnet.cspr.live/deploy/${intent.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-red-400 hover:text-red-300 inline-flex items-center gap-1"
                        >
                          <span>✓ Verified on Explorer</span>
                          <span>→</span>
                        </a>
                      )}
                      {/* Execute Button for Ready and Pending intents */}
                      {(intent.status === 'Ready' || intent.status === 'Pending') && (
                        <div className="flex flex-col gap-2 mt-2">
                          {/* On-chain execution button - creates real transaction */}
                          {canUseOnChainExecution(intent) && (
                            <button
                              onClick={() => {
                                setShowBridgeModal(intent.id);
                                setBridgeError(null);
                              }}
                              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition inline-flex items-center gap-2"
                            >
                              🔥 Execute via CSPR.bridge (in development)
                            </button>
                          )}
                          {/* NEW: CSPR.trade execution - working alternative */}
                          <button
                            onClick={() => executeViaCsprTrade(intent)}
                            disabled={executingId === intent.id}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition inline-flex items-center gap-2"
                          >
                            {executingId === intent.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                                <span>Creating swap...</span>
                              </>
                            ) : (
                              <>
                                💱 Execute via CSPR.trade
                              </>
                            )}
                          </button>
                          {/* Fallback: external bridge link */}
                          <a
                            href={getBridgeUrl()}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => markAsBridging(intent)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition inline-flex items-center gap-2"
                          >
                            ⚡ Manual Bridge →
                          </a>
                        </div>
                      )}
                      {/* Confirm completion for Executing intents */}
                      {intent.status === 'Executing' && (
                        <button
                          onClick={() => markAsCompleted(intent.id)}
                          className="mt-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-medium transition"
                        >
                          ✓ Mark as Completed
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Watching Status Info */}
                  {intent.status === 'Watching' && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="animate-pulse h-2 w-2 bg-orange-400 rounded-full"></div>
                        <p className="text-sm text-orange-400">
                          Monitoring price... Will become ready when condition is met
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Ready/Pending Status Info */}
                  {(intent.status === 'Ready' || intent.status === 'Pending') && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-purple-400">⚡</span>
                        <p className="text-sm text-purple-400">
                          {intent.status === 'Ready' ? 'Price condition met! ' : ''}Ready to execute with these parameters:
                        </p>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-xs space-y-1">
                        <p><span className="text-gray-400">From:</span> <span className="text-white font-medium">{getBridgeParams(intent).fromChain}</span></p>
                        <p><span className="text-gray-400">To:</span> <span className="text-white font-medium">{getBridgeParams(intent).toChain}</span></p>
                        <p><span className="text-gray-400">Token:</span> <span className="text-white font-medium">{getBridgeParams(intent).token}</span></p>
                        <p><span className="text-gray-400">Amount:</span> <span className="text-white font-medium">{getBridgeParams(intent).amount}</span></p>
                      </div>
                    </div>
                  )}

                  {/* Scheduled DCA Status Info */}
                  {intent.status === 'Scheduled' && intent.isDCA && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-cyan-400">📅</span>
                        <p className="text-sm text-cyan-400">
                          DCA Strategy Active - {intent.dcaExecuted || 0}/{intent.dcaCount} completed
                        </p>
                      </div>
                      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-lg p-3 text-xs space-y-1">
                        <p><span className="text-gray-400">Amount per swap:</span> <span className="text-white font-medium">{intent.amount}</span></p>
                        <p><span className="text-gray-400">Frequency:</span> <span className="text-white font-medium capitalize">{intent.dcaInterval}</span></p>
                        <p><span className="text-gray-400">Total planned:</span> <span className="text-white font-medium">{intent.dcaTotalAmount} {intent.fromToken}</span></p>
                        {intent.nextExecutionTime && (
                          <p>
                            <span className="text-gray-400">Next execution:</span>{' '}
                            <span className={`font-medium ${dcaCountdowns[intent.id] !== undefined && dcaCountdowns[intent.id] <= 10 ? 'text-yellow-400 animate-pulse' : 'text-white'}`}>
                              {dcaCountdowns[intent.id] !== undefined
                                ? `${dcaCountdowns[intent.id]} seconds`
                                : formatTimeUntil(intent.nextExecutionTime)}
                            </span>
                          </p>
                        )}
                        {/* Auto-execution indicator */}
                        {dcaCountdowns[intent.id] === 0 && (
                          <div className="flex items-center gap-2 mt-2 text-yellow-400">
                            <div className="animate-spin rounded-full h-3 w-3 border-t-2 border-b-2 border-yellow-400"></div>
                            <span className="text-xs">Auto-executing swap...</span>
                          </div>
                        )}
                      </div>
                      {/* Manual execute button for DCA - uses CSPR.trade for real swaps */}
                      <button
                        onClick={() => executeViaCsprTrade(intent)}
                        disabled={executingId === intent.id}
                        className="mt-3 w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition inline-flex items-center justify-center gap-2"
                      >
                        {executingId === intent.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                            Executing...
                          </>
                        ) : (
                          <>
                            ⚡ Execute Next DCA Swap Now
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {intent.status === 'Executing' && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-400"></div>
                          <p className="text-sm text-blue-400">Bridge transaction in progress...</p>
                        </div>
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs space-y-1">
                          <p><span className="text-gray-400">From:</span> <span className="text-white font-medium">{getBridgeParams(intent).fromChain}</span></p>
                          <p><span className="text-gray-400">To:</span> <span className="text-white font-medium">{getBridgeParams(intent).toChain}</span></p>
                          <p><span className="text-gray-400">Token:</span> <span className="text-white font-medium">{getBridgeParams(intent).token}</span></p>
                          <p><span className="text-gray-400">Amount:</span> <span className="text-white font-medium">{getBridgeParams(intent).amount}</span></p>
                        </div>
                        <p className="text-xs text-gray-400">
                          Complete the bridge on CSPRBridge, then click &quot;Mark as Completed&quot;.
                        </p>
                        <a
                          href={getBridgeUrl()}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:text-blue-300 underline"
                        >
                          Open CSPRBridge again →
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-8">
              <div className="glass-card rounded-xl p-4">
                <p className="text-yellow-400 font-bold mb-2">○ Pending</p>
                <p className="text-sm text-gray-400">Ready to execute swap</p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-cyan-400 font-bold mb-2">📅 Scheduled</p>
                <p className="text-sm text-gray-400">DCA strategy running</p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-orange-400 font-bold mb-2">👁 Watching</p>
                <p className="text-sm text-gray-400">Monitoring price target</p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-purple-400 font-bold mb-2">⚡ Ready</p>
                <p className="text-sm text-gray-400">Price condition met</p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-blue-400 font-bold mb-2">⟳ Executing</p>
                <p className="text-sm text-gray-400">Transaction in progress</p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-green-400 font-bold mb-2">✓ Completed</p>
                <p className="text-sm text-gray-400">Successfully executed</p>
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

        {/* On-Chain Execution Modal */}
        {showBridgeModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="glass-card rounded-2xl p-6 max-w-md w-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Execute Intent On-Chain</h3>
                <button
                  onClick={() => {
                    setShowBridgeModal(null);
                    setBridgeError(null);
                    setBridgeTxHash(null);
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {(() => {
                const intent = intents.find(i => i.id === showBridgeModal);
                if (!intent) return null;

                return (
                  <div className="space-y-4">
                    {canUseRealBridge(intent) ? (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <p className="text-sm text-green-400 mb-2 font-bold">
                          🔥 REAL BRIDGE EXECUTION!
                        </p>
                        <p className="text-xs text-green-300 mb-2">
                          This will burn {intent.amount} {intent.fromToken} CEP-18 tokens on Casper.
                          CSPRBridge relayers will unlock ERC-20 tokens on Ethereum Sepolia!
                        </p>
                        <div className="text-xs space-y-1">
                          <p><span className="text-gray-400">Token:</span> <span className="text-white">{intent.fromToken}</span></p>
                          <p><span className="text-gray-400">Amount:</span> <span className="text-white">{intent.amount}</span></p>
                          <p><span className="text-gray-400">Method:</span> <span className="text-white font-mono text-[10px]">execute_intent_with_burn()</span></p>
                          <p><span className="text-gray-400">Calls:</span> <span className="text-white font-mono text-[10px]">TokenFactory.burn()</span></p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                        <p className="text-sm text-blue-400 mb-2">
                          🔥 Demo Mode - On-Chain Transaction
                        </p>
                        <p className="text-xs text-blue-300 mb-2">
                          Creates a real transaction on Casper. For actual bridging, use USDC, WETH, or LINK tokens.
                        </p>
                        <div className="text-xs space-y-1">
                          <p><span className="text-gray-400">Intent:</span> <span className="text-white">{intent.fromToken} → {intent.toToken}</span></p>
                          <p><span className="text-gray-400">Amount:</span> <span className="text-white">{intent.amount}</span></p>
                          <p><span className="text-gray-400">Route:</span> <span className="text-white">{intent.fromChain} → {intent.toChain}</span></p>
                          <p><span className="text-gray-400">Method:</span> <span className="text-white font-mono text-[10px]">execute_intent()</span></p>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Destination Address (Ethereum)
                      </label>
                      <input
                        type="text"
                        value={ethRecipient}
                        onChange={(e) => setEthRecipient(e.target.value)}
                        placeholder="0x..."
                        className="w-full bg-black/30 border border-white/10 rounded-lg px-4 py-3 font-mono text-sm"
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Enter the address to receive tokens on the destination chain
                      </p>
                    </div>

                    {bridgeError && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <p className="text-sm text-red-400">{bridgeError}</p>
                      </div>
                    )}

                    {bridgeTxHash && (
                      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                        <p className="text-sm text-green-400 mb-2">✅ Transaction submitted to Casper Testnet!</p>
                        <a
                          href={`https://testnet.cspr.live/deploy/${bridgeTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-green-300 hover:text-green-200 underline break-all"
                        >
                          View on Explorer: {bridgeTxHash.slice(0, 20)}...
                        </a>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowBridgeModal(null);
                          setBridgeError(null);
                        }}
                        className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => executeOnChain(intent)}
                        disabled={executingId === intent.id || !ethRecipient}
                        className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {executingId === intent.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></span>
                            Signing...
                          </span>
                        ) : (
                          '🔥 Sign & Execute'
                        )}
                      </button>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                      <p className="text-xs text-blue-300">
                        <strong>How it works:</strong> {canUseRealBridge(intent) ? (
                          <>
                            IntentParser calls <code className="bg-black/30 px-1 rounded">TokenFactory.burn()</code> to burn CEP-18 tokens.
                            CSPRBridge relayers detect the burn event and unlock ERC-20 tokens on Ethereum Sepolia within minutes.
                            Your tokens will arrive at the specified Ethereum address automatically!
                          </>
                        ) : (
                          <>
                            This calls <code className="bg-black/30 px-1 rounded">execute_intent</code> which emits an event on-chain.
                            Your wallet will prompt you to sign the transaction.
                            The tx hash will be visible on Casper Explorer.
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Success Modal */}
      {showSuccessModal && successTxHash && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full border border-green-500">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-green-400 flex items-center gap-2">
                <span className="text-2xl">✅</span>
                Transaction Submitted Successfully!
              </h3>
              <button
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccessTxHash(null);
                }}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-gray-300">
                Your CSPR.trade swap transaction has been submitted to the Casper testnet.
              </p>

              <div className="bg-gray-900 rounded p-4 border border-gray-700">
                <p className="text-sm text-gray-400 mb-2">Transaction Hash:</p>
                <div className="flex items-center gap-2">
                  <code className="text-green-400 text-sm break-all flex-1">
                    {successTxHash}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(successTxHash);
                      alert('Copied to clipboard!');
                    }}
                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm whitespace-nowrap"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <a
                  href={`https://testnet.cspr.live/transaction/${successTxHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center font-medium transition"
                >
                  View on Explorer →
                </a>
                <button
                  onClick={() => {
                    setShowSuccessModal(false);
                    setSuccessTxHash(null);
                  }}
                  className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition"
                >
                  Close
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Note: The transaction may take a few moments to appear on the explorer.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}