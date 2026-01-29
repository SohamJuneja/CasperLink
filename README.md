# 🔗 CasperLink

**Cross-Chain Intent Execution Framework with Real On-Chain Execution**

[![Casper Hackathon 2026](https://img.shields.io/badge/Casper-Hackathon%202026-ED1C24?style=for-the-badge)](https://dorahacks.io/hackathon/casper-2026)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Casper Network](https://img.shields.io/badge/Casper-Testnet-ED1C24?style=for-the-badge)](https://testnet.cspr.live/)

> **From concept to REALITY: Intents that actually EXECUTE on-chain!**

[Live Demo](https://casper-link.vercel.app) • 


---

## 🌟 What's NEW - Fully Working Execution!

**Before**: Users could only CREATE intents (express what they want)
**NOW**: Intents are **AUTOMATICALLY EXECUTED** on-chain with real transactions! ✨

### 🎯 Proof of Working Execution

**Real Transaction Hash**: [94dbe5de94f604573bd569259f7525949ede9864727a86cffcaf232c63eb8c98](https://testnet.cspr.live/transaction/94dbe5de94f604573bd569259f7525949ede9864727a86cffcaf232c63eb8c98)

**What happened**:
- User created intent: "Swap 1 CSPR to USDC"
- CasperLink executed via CSPR.trade DEX integration
- Result: **1 CSPR → 0.00457 WUSDC** (Success ✅)
- All done with ONE button click!

---

## 🚀 Key Features

- **✅ WORKING EXECUTION**: Intents don't just sit there - they execute automatically!
- **🔮 Oracle Price Feeds**: Real-time cryptocurrency price data stored on-chain
- **💱 CSPR.trade Integration**: Direct DEX swaps via `swap_exact_cspr_for_tokens`
- **🛡️ Slippage Protection**: Automatic price deviation safeguards
- **💼 Beautiful UI**: Success modals with copyable transaction hashes
- **⚡ One-Click Experience**: Create intent → Sign → Execute → Done!

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     CasperLink Framework                       │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────┐         ┌──────────────────┐           │
│  │  Oracle Contract │◄────────┤  Intent Parser   │           │
│  │  (Price Feeds)   │         │   Contract       │           │
│  └─────────────────┘         └──────────────────┘           │
│         ▲                              ▲                      │
│         │                              │                      │
│         │        ┌─────────────────────┤                     │
│         │        │                     │                      │
│  ┌──────┴────────┴───┐         ┌──────┴──────┐              │
│  │  Admin Dashboard  │         │ User Portal  │              │
│  │  (Price Updates)  │         │  (Intents)   │              │
│  └───────────────────┘         └──────────────┘              │
│                                        │                      │
│                                        ▼                      │
│                              ┌──────────────────┐            │
│                              │  CSPR.trade DEX  │            │
│                              │   (Execution)    │            │
│                              └──────────────────┘            │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

### Smart Contracts

#### 1. **Oracle Contract**
- **Purpose**: Store and manage cryptocurrency price feeds
- **Methods**:
  - `submit_price(price_feed, price_value, timestamp)`: Update price data
  - `get_price(price_feed)`: Retrieve current price
- **Deployed**: `hash-c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac`

#### 2. **Intent Parser Contract**
- **Purpose**: Manage cross-chain transaction intents
- **Methods**:
  - `create_intent()`: Create new intent
  - `execute_intent()`: Execute intent (with real on-chain execution!)
  - `execute_intent_with_burn()`: Bridge integration (in progress)
- **Deployed**: `hash-b6aaa644364bcd232691517396431417d926a0d256f6c0d6fa05d505f1e027d0`

#### 3. **CSPR.trade Integration**
- **Router Contract**: `hash-04a11a367e708c52557930c4e9c1301f4465100d1b1b6d0a62b48d3e32402867`
- **Entry Point**: `swap_exact_cspr_for_tokens`
- **Execution Pattern**: Proxy caller with SessionBuilder (SDK v5.x)

---

## 🎬 How It Works (End-to-End)

### Step 1: Create Intent
```
User: "I want to swap 10 CSPR for USDC"
└─> CasperLink creates intent on-chain
```

### Step 2: Execute Intent
```
User clicks "Execute via CSPR.trade"
└─> Backend creates swap deploy using SDK v5.x
    └─> Calls CSPR.trade router contract
        └─> Executes swap_exact_cspr_for_tokens
            └─> User signs with CSPR.click wallet
                └─> Transaction submitted to Casper network
                    └─> SUCCESS! ✅
```

### Step 3: Success Modal
```
✅ Transaction Submitted Successfully!

Transaction Hash:
94dbe5de94f604573bd569259f7525949ede9864727a86cffcaf232c63eb8c98

[Copy] [View on Explorer →]
```

---

## 📊 Verified Transactions (Proof of Working Execution)

### ✅ CSPR.trade Swap Execution
- **Transaction Hash**: `94dbe5de94f604573bd569259f7525949ede9864727a86cffcaf232c63eb8c98`
- **Status**: **SUCCESS** ✨
- **Action**: Swap 1 CSPR → 0.00457 WUSDC via CSPR.trade
- **Method**: `swap_exact_cspr_for_tokens` via proxy_caller.wasm
- [View on Explorer](https://testnet.cspr.live/transaction/94dbe5de94f604573bd569259f7525949ede9864727a86cffcaf232c63eb8c98)

### ✅ Intent Creation
- **Deploy Hash**: `1caee218457dc14e1031148fa16982c01fe11bfc6b49d229dd7d5d48a7aa8a9b`
- **Status**: SUCCESS ✨
- **Action**: Created intent for 0.1 BTC → ETH swap
- [View on Explorer](https://testnet.cspr.live/deploy/1caee218457dc14e1031148fa16982c01fe11bfc6b49d229dd7d5d48a7aa8a9b)

### ✅ Oracle Price Submission
- **Deploy Hash**: `7e59b6cfc4a129fd39d44a673274654218a99a7ba4ce23a9b7a6b3f63b2ec399`
- **Status**: SUCCESS ✨
- **Action**: Submitted BTC_USD price ($98,500)
- **Gas Used**: 0.31482 CSPR
- [View on Explorer](https://testnet.cspr.live/deploy/7e59b6cfc4a129fd39d44a673274654218a99a7ba4ce23a9b7a6b3f63b2ec399)

---

## 🚀 Quick Start

### Prerequisites

```bash
# Node.js 18+
node --version

# Casper SDK v5.x (for backend scripts)
npm install casper-js-sdk@^5.0.0
```

### Installation

```bash
# Clone the repository
git clone https://github.com/SohamJuneja/CasperLink.git
cd casperlink

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 💻 Technical Implementation

### CSPR.trade Integration

The execution uses SDK v5.x with the SessionBuilder pattern:

```javascript
// Backend: create-swap-deploy-v5.js
const sessionTransaction = new SessionBuilder()
  .from(senderPublicKey)
  .runtimeArgs(args)
  .wasm(new Uint8Array(contractWasm))  // proxy_caller.wasm
  .payment(15000000000)  // 15 CSPR for gas
  .chainName('casper-test')
  .build();

const deployJson = JSON.stringify(sessionTransaction.toJSON());
// This format is compatible with CSPR.click wallet
```

### Why Proxy Caller Pattern?

CSPR.trade requires CSPR to be sent to the contract for swaps. The proxy caller pattern:
1. Loads `proxy_caller.wasm`
2. Populates the `__cargo_purse` with CSPR amount
3. Calls the router contract's `swap_exact_cspr_for_tokens` entry point
4. Returns swapped tokens to user

---

## 🛠️ Technology Stack

### Smart Contracts
- **Framework**: [Odra](https://odra.dev) - Rust framework for Casper
- **Language**: Rust
- **Network**: Casper Testnet
- **Tools**: Casper Client, Cargo, Odra CLI

### Backend Scripts
- **SDK**: casper-js-sdk v5.x
- **Pattern**: SessionBuilder + proxy caller
- **Runtime**: Node.js

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI**: React 18, Tailwind CSS
- **Wallet**: CSPR.click SDK v1.12
- **State**: React Hooks

### DevOps
- **Deployment**: Vercel
- **Version Control**: Git

---

## 🗺️ Roadmap

### ✅ Phase 1: Foundation (Completed)
- Oracle contract deployment
- Basic price feed storage
- CLI testing

### ✅ Phase 2: Intent System (Completed)
- Intent Parser with Oracle integration
- Slippage protection
- Frontend wallet integration

### ✅ Phase 3: Execution (COMPLETED!) 🎉
- **CSPR.trade DEX integration**
- **Real on-chain swap execution**
- **Success modal with transaction tracking**
- **Proof of end-to-end functionality**

### 🚧 Phase 4: Bridge Integration (In Progress)
- CSPR.bridge integration for cross-chain swaps
- Multi-chain execution support
- TokenFactory.burn() integration

### 📅 Phase 5: Production (Q1 2026)
- Mainnet deployment
- Multi-DEX aggregation
- Advanced intent matching
- Security audits

---

## 🔐 Security Considerations

- **Slippage Protection**: Conservative estimate with 95% tolerance prevents unfavorable execution
- **Oracle Validation**: Timestamp-based price freshness checks
- **SDK v5.x**: Using latest Casper SDK for wallet compatibility
- **Proxy Pattern**: Secure CSPR transfer to contracts
- **Input Validation**: Comprehensive parameter checks

---

## 💎 Why CasperLink Matters

### For Users
- **One-Click Execution**: No more manual bridge navigation
- **Automatic DEX Integration**: Works with CSPR.trade (more DEXs coming!)
- **Price Protection**: Oracle-verified pricing
- **Transparent**: All transactions on-chain and verifiable

### For Casper Ecosystem
- **Public Oracle**: Free price feeds for all dApps
- **Intent Infrastructure**: Building blocks for other developers
- **DEX Integration**: Showcasing CSPR.trade capabilities
- **Cross-Chain Ready**: Designed to work with CSPR.bridge

### For Developers
- **Open Source**: Full code transparency
- **SDK v5.x Examples**: Reference implementation for SessionBuilder
- **Proxy Caller Pattern**: Reusable WASM proxy example
- **TypeScript + Rust**: Modern tech stack

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- **Casper Network** for the amazing blockchain infrastructure
- **David & Michael** for guidance on CSPR.trade integration and SDK v5.x
- **Odra Team** for the excellent smart contract framework
- **CSPR.click** for the seamless wallet integration
- **Casper Hackathon 2026** for the opportunity and prize pool

---

## 📧 Contact

**Soham Juneja** - Project Developer

Project Link: [https://github.com/SohamJuneja/CasperLink](https://github.com/SohamJuneja/CasperLink)

DoraHacks: [https://dorahacks.io/buidl/casperlink](https://dorahacks.io/buidl/casperlink)

---

<div align="center">

### Built with ❤️ for Casper Hackathon 2026

**$12.5K Prize Pool** | **Real Execution** | **Powered by Casper**

[🔗 Live Demo](https://casper-link.vercel.app) • 

### 🎯 Key Onchain Actions (All Working!)

1. **Create Intent** → Deploy Hash: `1caee218...` ✅
2. **Execute Swap via CSPR.trade** → Transaction Hash: `94dbe5de...` ✅
3. **Oracle Price Update** → Deploy Hash: `7e59b6cf...` ✅

**This is not a concept. This is LIVE, WORKING infrastructure on Casper Testnet.**

</div>
