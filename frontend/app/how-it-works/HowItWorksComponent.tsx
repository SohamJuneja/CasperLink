'use client';

import Link from 'next/link';

export default function HowItWorksComponent() {
  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold gradient-text mb-2">How CasperLink Works</h1>
            <p className="text-gray-400">Understanding intent-based cross-chain execution</p>
          </div>
          <Link href="/" className="text-gray-400 hover:text-white transition">
            ← Back to Home
          </Link>
        </div>

        {/* The Problem */}
        <section className="glass-card rounded-2xl p-8 mb-6">
          <h2 className="text-3xl font-bold mb-4 gradient-text">🎯 The Problem We Solve</h2>
          <p className="text-gray-300 mb-4">Cross-chain transactions are painful. Users face:</p>
          <ul className="space-y-2 text-gray-400 mb-4">
            <li>❌ 10+ manual steps to bridge and swap tokens</li>
            <li>❌ Complex slippage calculations and price monitoring</li>
            <li>❌ Multiple wallet approvals across different chains</li>
            <li>❌ Risk of price manipulation and MEV attacks</li>
            <li>❌ No unified interface for cross-chain operations</li>
          </ul>
          <p className="text-red-400 font-bold">Result: 90% of crypto users avoid cross-chain DeFi entirely.</p>
        </section>

        {/* The Solution */}
        <section className="glass-card rounded-2xl p-8 mb-6">
          <h2 className="text-3xl font-bold mb-4 gradient-text">💡 Our Solution: Intent-Based Execution</h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-red-400 mb-3">Traditional Way (10+ Steps)</h3>
              <ol className="space-y-2 text-gray-400 text-sm">
                <li>1. Bridge BTC to Ethereum</li>
                <li>2. Wait 30-60 minutes</li>
                <li>3. Connect to DEX</li>
                <li>4. Check current price</li>
                <li>5. Calculate slippage manually</li>
                <li>6. Set gas fees</li>
                <li>7. Execute swap</li>
                <li>8. Monitor transaction</li>
                <li>9. Hope for best execution</li>
              </ol>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-green-400 mb-3">CasperLink Way (1 Step)</h3>
              <div className="text-gray-300 text-sm space-y-4">
                <p className="text-lg font-bold">Express your intent:</p>
                <p className="text-2xl font-bold gradient-text">&quot;Swap 1 BTC for ETH&quot;</p>
                <p className="text-xl">✨ Done!</p>
                <p className="text-gray-400 mt-4">
                  CasperLink handles everything - price discovery, slippage protection, 
                  execution, and settlement automatically.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Architecture */}
        <section className="glass-card rounded-2xl p-8 mb-6">
          <h2 className="text-3xl font-bold mb-6 gradient-text">🏗️ Architecture & Innovation</h2>

          {/* Oracle */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-red-400 mb-3">1. 🔮 Decentralized Oracle System</h3>
            <p className="text-gray-300 mb-4">
              Our Oracle contract provides real-time, on-chain price feeds:
            </p>
            <ul className="space-y-2 text-gray-400 mb-4 ml-6">
              <li>✅ BTC/USD, ETH/USD, CSPR/USD, USDC/USD, USDT/USD</li>
              <li>✅ Updated every 2 minutes by authorized price providers</li>
              <li>✅ Timestamp validation ensures data freshness</li>
              <li>✅ <strong className="text-white">Available for ANY Casper dApp to use</strong> - public infrastructure!</li>
            </ul>
            <div className="bg-black/30 rounded-lg p-4 font-mono text-xs text-gray-500 break-all">
              Contract: hash-c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac
            </div>
          </div>

          {/* Intent Parser */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-red-400 mb-3">2. 💱 Intent Parser V2</h3>
            <p className="text-gray-300 mb-4">
              Intelligent intent management with 4-stage lifecycle:
            </p>
            <div className="bg-gradient-to-r from-yellow-500/20 via-blue-500/20 to-green-500/20 rounded-lg p-6 mb-4">
              <div className="text-center text-xl font-bold">
                <span className="text-yellow-400">Created</span>
                <span className="text-gray-500 mx-2">→</span>
                <span className="text-yellow-400">Pending</span>
                <span className="text-gray-500 mx-2">→</span>
                <span className="text-blue-400">Executing</span>
                <span className="text-gray-500 mx-2">→</span>
                <span className="text-green-400">Completed</span>
              </div>
            </div>
            <p className="text-gray-400 mb-3"><strong className="text-white">Key Features:</strong></p>
            <ul className="space-y-2 text-gray-400 ml-6">
              <li>✅ Intent creation with from/to token pairs</li>
              <li>✅ Automatic price fetching from Oracle</li>
              <li>✅ Configurable slippage protection (1-10%)</li>
              <li>✅ State management and execution tracking</li>
              <li>✅ Multi-step transaction coordination</li>
            </ul>
            <div className="bg-black/30 rounded-lg p-4 font-mono text-xs text-gray-500 break-all mt-4">
              Contract: hash-632a3eb1eef79a708c54d6e1bb84352e1445760ade1a6edbd20d7d375dfe20bb
            </div>
          </div>

          {/* Frontend */}
          <div>
            <h3 className="text-2xl font-bold text-red-400 mb-3">3. 🎨 Production-Grade Frontend</h3>
            <ul className="space-y-2 text-gray-400 ml-6">
              <li>✅ Glassmorphism UI with Casper&apos;s signature red branding</li>
              <li>✅ Seamless CSPR.click wallet integration</li>
              <li>✅ Real-time transaction status updates</li>
              <li>✅ Admin dashboard for Oracle price management</li>
              <li>✅ Mobile-responsive design</li>
            </ul>
          </div>
        </section>

        {/* Bridge Integration */}
        <section className="glass-card rounded-2xl p-8 mb-6">
          <h2 className="text-3xl font-bold mb-4 gradient-text">🌉 Extending Casper&apos;s Cross-Chain Future</h2>
          <p className="text-gray-300 mb-4">
            CasperLink is designed to integrate with and extend existing Casper bridges:
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-red-400 mb-3">Today:</h3>
              <p className="text-gray-400">
                Users manually navigate to external bridges, calculate amounts, 
                monitor multiple transactions.
              </p>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
              <h3 className="text-xl font-bold text-green-400 mb-3">With CasperLink:</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>✅ <strong>Unified Interface:</strong> Single entry point</li>
                <li>✅ <strong>Intent Abstraction:</strong> Describe goals, we coordinate</li>
                <li>✅ <strong>Price Protection:</strong> Oracle ensures fair execution</li>
                <li>✅ <strong>Bridge Aggregation:</strong> Best route automatically</li>
              </ul>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/30 rounded-xl p-6">
            <h3 className="text-lg font-bold mb-3">Example Flow:</h3>
            <div className="space-y-3 text-gray-300">
              <div className="flex items-center gap-3">
                <span className="text-2xl">👤</span>
                <span>User Intent: &quot;Swap 1 BTC for ETH on Ethereum&quot;</span>
              </div>
              <div className="text-center text-gray-500">↓</div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔮</span>
                <span>CasperLink: Checks Oracle price</span>
              </div>
              <div className="text-center text-gray-500">↓</div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">🌉</span>
                <span>Routes through Casper-Ethereum bridge</span>
              </div>
              <div className="text-center text-gray-500">↓</div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">💱</span>
                <span>Executes swap on destination chain</span>
              </div>
              <div className="text-center text-gray-500">↓</div>
              <div className="flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <span>Returns ETH to user wallet</span>
              </div>
            </div>
            <p className="text-center mt-4 text-lg font-bold text-green-400">
              All from ONE simple interface!
            </p>
          </div>
        </section>

        {/* Key Features */}
        <section className="glass-card rounded-2xl p-8 mb-6">
          <h2 className="text-3xl font-bold mb-6 gradient-text">🚀 Key Features</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-xl font-bold text-red-400 mb-3">For Users</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>🎯 One-Click Intent Creation</li>
                <li>💰 Real-Time Pricing</li>
                <li>🛡️ Slippage Protection</li>
                <li>📊 Transaction Tracking</li>
                <li>💼 Clean Interface</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold text-red-400 mb-3">For Ecosystem</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>🔮 Public Oracle</li>
                <li>🌉 Bridge Integration Ready</li>
                <li>📈 Liquidity Aggregation</li>
                <li>🏗️ Open Infrastructure</li>
                <li>🤝 Interoperability First</li>
              </ul>
            </div>

            <div>
              <h3 className="text-xl font-bold text-red-400 mb-3">For Developers</h3>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>📖 Open Source</li>
                <li>🔧 Modular Design</li>
                <li>📚 Comprehensive Docs</li>
                <li>⚡ Gas Optimized</li>
                <li>🧪 Fully Tested</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Technology Stack */}
        <section className="glass-card rounded-2xl p-8 mb-6">
          <h2 className="text-3xl font-bold mb-6 gradient-text">🛠️ Technology Stack</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-lg font-bold mb-3">Smart Contracts</h3>
              <ul className="space-y-1 text-gray-400 text-sm">
                <li>• Odra Framework</li>
                <li>• Rust + WebAssembly</li>
                <li>• Casper Testnet</li>
                <li>• Gas Optimized</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-3">Frontend</h3>
              <ul className="space-y-1 text-gray-400 text-sm">
                <li>• Next.js 14</li>
                <li>• TypeScript</li>
                <li>• Tailwind CSS</li>
                <li>• CSPR.click SDK</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-bold mb-3">Infrastructure</h3>
              <ul className="space-y-1 text-gray-400 text-sm">
                <li>• Vercel Deployment</li>
                <li>• GitHub</li>
                <li>• CI/CD Pipeline</li>
                <li>• Automated Tests</li>
              </ul>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="glass-card rounded-2xl p-8 text-center border-2 border-red-500/50">
          <h2 className="text-3xl font-bold mb-4 gradient-text">🤝 Try CasperLink Today</h2>
          <p className="text-gray-300 mb-6">
            Experience the future of cross-chain DeFi with intent-based execution
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/"
              className="btn-primary px-8 py-3 rounded-lg font-bold text-lg inline-block"
            >
              Create Your First Intent
            </Link>
            <Link
              href="/intents"
              className="glass-card px-8 py-3 rounded-lg font-bold text-lg inline-block hover:bg-white/10 transition"
            >
              View My Intents
            </Link>
          </div>

          <div className="mt-8 pt-8 border-t border-white/10">
            <p className="text-sm text-gray-400 mb-4">Verified Smart Contracts on Casper Testnet:</p>
            <div className="grid md:grid-cols-2 gap-4 text-xs">
              <div className="bg-black/30 rounded p-3">
                <p className="text-gray-500 mb-1">Oracle Contract:</p>
                <a
                  href="https://testnet.cspr.live/contract-package/c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-400 hover:text-red-300 break-all font-mono"
                >
                  hash-c558b459...
                </a>
              </div>
              <div className="bg-black/30 rounded p-3">
                <p className="text-gray-500 mb-1">Intent Parser:</p>
                <a
                  href="https://testnet.cspr.live/contract-package/632a3eb1eef79a708c54d6e1bb84352e1445760ade1a6edbd20d7d375dfe20bb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-400 hover:text-red-300 break-all font-mono"
                >
                  hash-632a3eb1...
                </a>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

