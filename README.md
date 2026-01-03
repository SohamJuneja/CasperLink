# 🔗 CasperLink

**Cross-Chain Intent Execution Framework with Oracle Integration**

[![Casper Hackathon 2026](https://img.shields.io/badge/Casper-Hackathon%202026-ED1C24?style=for-the-badge)](https://dorahacks.io/hackathon/casper-2026)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Casper Network](https://img.shields.io/badge/Casper-Testnet-ED1C24?style=for-the-badge)](https://testnet.cspr.live/)

> **Seamless cross-chain transactions with real-time price feeds and slippage protection on Casper Network**

[Live Demo](https://frontend-sigma-ten-66.vercel.app) • [Video Demo](#) • [DoraHacks Submission](#)

---

## 🌟 Overview

CasperLink is a revolutionary cross-chain intent execution framework built for the Casper Hackathon 2026. It enables users to express transaction intents (e.g., "Swap 1 BTC for ETH") without worrying about the underlying execution mechanics. The framework automatically handles price discovery, slippage protection, and cross-chain coordination.

### 🎯 Key Features

- **🔮 Oracle Price Feeds**: Real-time cryptocurrency price data (BTC, ETH, CSPR) stored on-chain
- **💱 Intent-Based Transactions**: Express what you want, not how to do it
- **🛡️ Slippage Protection**: Automatic price deviation safeguards (configurable 1-10%)
- **🔄 Intent Lifecycle**: Create → Pending → Executing → Completed workflow
- **💼 User-Friendly Interface**: Glassmorphism UI with Casper branding
- **⚡ Gas Optimized**: Efficient smart contract design using Odra framework

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CasperLink Framework                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────┐         ┌──────────────────┐          │
│  │  Oracle Contract │◄────────┤  Intent Parser   │          │
│  │  (Price Feeds)   │         │   Contract V2    │          │
│  └─────────────────┘         └──────────────────┘          │
│         ▲                              ▲                     │
│         │                              │                     │
│         │        ┌─────────────────────┤                    │
│         │        │                     │                     │
│  ┌──────┴────────┴───┐         ┌──────┴──────┐             │
│  │  Admin Dashboard  │         │ User Portal  │             │
│  │  (Price Updates)  │         │  (Intents)   │             │
│  └───────────────────┘         └──────────────┘             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Smart Contracts

#### 1. **Oracle Contract**
- **Purpose**: Store and manage cryptocurrency price feeds
- **Methods**:
  - `submit_price(price_feed, price_value, timestamp)`: Update price data
  - `get_price(price_feed)`: Retrieve current price
- **Deployed**: `hash-c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac`

#### 2. **Intent Parser Contract V2**
- **Purpose**: Manage cross-chain transaction intents with Oracle integration
- **Methods**:
  - `create_intent(intent_id, from_token, to_token, amount)`: Create new intent
  - `set_intent_price_with_oracle(intent_id, slippage_percent)`: Set price from Oracle
  - `execute_intent(intent_id)`: Execute intent
  - `complete_intent(intent_id)`: Mark intent as completed
- **Deployed**: `hash-632a3eb1eef79a708c54d6e1bb84352e1445760ade1a6edbd20d7d375dfe20bb`

---

## 🚀 Quick Start

### Prerequisites

```bash
# Node.js 18+
node --version

# Casper CLI tools
cargo install casper-client
```

### Installation

```bash
# Clone the repository
git clone https://github.com/SohamJuneja/CasperLink.git
cd casperlink

# Install dependencies
cd frontend
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

---

## 📦 Deployment

### Smart Contracts (Already Deployed!)

Both contracts are live on Casper testnet:

- **Oracle**: [View on Explorer](https://testnet.cspr.live/contract-package/c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac)
- **Intent Parser V2**: [View on Explorer](https://testnet.cspr.live/contract-package/632a3eb1eef79a708c54d6e1bb84352e1445760ade1a6edbd20d7d375dfe20bb)

### Frontend Deployment

#### **Option 1: Vercel (Recommended) ⚡**

✅ **Deployed!** The frontend is live on Vercel:
- **Production**: [https://frontend-sigma-ten-66.vercel.app](https://frontend-sigma-ten-66.vercel.app)
- **Preview**: [https://frontend-5q8rpznjf-sohamjunejas-projects.vercel.app](https://frontend-5q8rpznjf-sohamjunejas-projects.vercel.app)

To deploy:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from frontend directory
cd frontend
vercel

# Deploy to production
vercel --prod

# Follow prompts - it's that easy!
```

#### **Option 2: Netlify**

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
cd frontend
netlify deploy --prod
```

#### **Option 3: Manual**

1. Build the project: `npm run build`
2. Upload `.next` folder to your hosting
3. Configure environment variables
4. Start with `npm start`

---

## 💻 Usage Examples

### Creating an Intent

```typescript
// Connect wallet
const signer = await clickRef.current.connect();

// Create intent
const intentId = `intent_${Date.now()}`;
await contractService.createIntent(
  signer,
  intentId,
  'BTC',
  'ETH',
  '100000000' // 1 BTC in motes
);
```

### Setting Price with Slippage Protection

```typescript
// Set price from Oracle with 2% slippage
await contractService.setIntentPriceWithOracle(
  signer,
  intentId,
  2 // 2% slippage tolerance
);
```

### Executing Intent

```typescript
// Execute the intent
await contractService.executeIntent(signer, intentId);

// Complete the intent
await contractService.completeIntent(signer, intentId);
```

---

## 🧪 Testing

### CLI Testing (Contracts)

```bash
# Test Oracle price submission
casper-client put-deploy \
  --node-address https://rpc.testnet.casperlabs.io \
  --chain-name casper-test \
  --secret-key ~/casper/secret_key.pem \
  --payment-amount 5000000000 \
  --session-hash hash-c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac \
  --session-entry-point submit_price \
  --session-arg "price_feed:string='BTC_USD'" \
  --session-arg "price_value:u512='9850000000000'" \
  --session-arg "timestamp:u64='1704326400'"
```

---

## 📊 Verified Transactions

Here are real transactions proving CasperLink works:

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

## 🛠️ Technology Stack

### Smart Contracts
- **Framework**: [Odra](https://odra.dev) - Rust framework for Casper
- **Language**: Rust
- **Network**: Casper Testnet
- **Tools**: Casper Client, Cargo

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **UI**: React 18, Tailwind CSS
- **Wallet**: CSPR.click SDK v1.12
- **State**: React Hooks

### DevOps
- **Deployment**: Vercel / Netlify
- **Version Control**: Git

---

## 🎨 Design Philosophy

CasperLink embraces **glassmorphism** design with Casper's signature red branding:

- **Colors**: Red (#ED1C24) gradients on dark backgrounds
- **Typography**: Modern, bold headings with clean body text
- **Effects**: Backdrop blur, subtle shadows, smooth animations
- **Responsiveness**: Mobile-first design approach

---

## 🔐 Security Considerations

- **Slippage Protection**: Configurable 1-10% tolerance prevents price manipulation
- **Oracle Validation**: Timestamp-based price freshness checks
- **Access Control**: Admin-only price submission methods
- **Input Validation**: Comprehensive parameter checks on all contract methods
- **State Management**: Proper intent lifecycle state transitions

---

## 🗺️ Roadmap

### ✅ Phase 1: Foundation (Completed)
- Oracle contract deployment
- Basic price feed storage
- CLI testing

### ✅ Phase 2: Intent System (Completed)
- Intent Parser V2 with Oracle integration
- Slippage protection
- Frontend wallet integration

### 🚧 Phase 3: Enhancement (In Progress)
- Multi-chain support (Ethereum, BSC)
- Advanced intent matching
- Liquidity pool integration

### 📅 Phase 4: Production (Q2 2026)
- Mainnet deployment
- Professional UI/UX
- Comprehensive documentation
- Security audits

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
- **Odra Team** for the excellent smart contract framework
- **CSPR.click** for the seamless wallet integration
- **Casper Hackathon 2026** for the opportunity and prize pool

---

## 📧 Contact

**Soham** - Project Developer

Project Link: [https://github.com/SohamJuneja/CasperLink](https://github.com/SohamJuneja/CasperLink)

DoraHacks: [https://dorahacks.io/buidl/casperlink](https://dorahacks.io/buidl/casperlink)

---

<div align="center">

### Built with ❤️ for Casper Hackathon 2026

**$12.5K Prize Pool** | **Cross-Chain Innovation** | **Powered by Casper**

[🔗 Live Demo](https://frontend-sigma-ten-66.vercel.app) • [📹 Video](#) • [🏆 Submit](https://dorahacks.io)

</div>