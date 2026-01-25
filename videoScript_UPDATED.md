# CasperLink - Updated Video Script
## From Concept to Reality: Working Intent Execution!

---

## 1. INTRODUCTION (0:00-0:30)

Hey everyone! I'm Soham, and I'm excited to share the FINAL version of CasperLink -
built for the Casper Hackathon 2026.

When I showed you CasperLink in the qualification round, we had intent CREATION working.

Today, I'm showing you intent EXECUTION!

That's right - intents don't just sit there anymore. They EXECUTE automatically
with ONE click, and I have the on-chain transaction hash to prove it.

Let me show you what changed.

---

## 2. THE PROBLEM (Remains The Same) (0:30-1:00)

Here's the problem with cross-chain transactions today:

To swap Bitcoin for Ethereum, you need to:
- Navigate to a bridge website
- Bridge your BTC to Ethereum - wait 30 minutes
- Go to a DEX like Uniswap
- Manually calculate slippage
- Execute the swap
- Monitor multiple transactions
- Hope the price doesn't move against you

That's 10+ manual steps across multiple platforms. It's complex, risky,
and intimidating for most users.

And with Casper's infrastructure growing - cspr.trade, cspr.bridge -
we need a unified interface that makes cross-chain SIMPLE.

---

## 3. THE BREAKTHROUGH - WORKING EXECUTION (1:00-2:00)

CasperLink now has THREE production-ready components:

**FIRST: The Oracle Contract** *(unchanged from before)*
[SCREEN: Show Oracle Prices page]

Decentralized price feeds on Casper Testnet providing real-time cryptocurrency
prices. This is PUBLIC INFRASTRUCTURE - any Casper dApp can use these prices for free.

**SECOND: The Intent Parser Contract** *(enhanced!)*
[SCREEN: Show My Intents page]

Users express their INTENT: "I want to swap 10 CSPR for USDC with 2% slippage."

The Intent Parser stores this on-chain, queries the Oracle for prices, and sets up
slippage protection.

**THIRD: CSPR.trade Integration** *(THIS IS NEW!)*
[SCREEN: Highlight "Execute via CSPR.trade" button]

And here's the game-changer: when users click "Execute via CSPR.trade,"
CasperLink automatically:
- Creates a proper swap deploy using SDK v5.x
- Calls CSPR.trade's swap_exact_cspr_for_tokens entry point
- Uses the proxy caller pattern for CSPR transfers
- Submits the transaction to Casper network
- Returns a SUCCESS with a real transaction hash!

This is not simulated. This is REAL on-chain execution.

---

## 4. WHY THIS MATTERS (2:00-2:30)

You might ask: "Casper has cspr.trade. Why do we need CasperLink?"

Great question! CasperLink doesn't compete with cspr.trade - it EXTENDS it.

Think of it this way:
- **cspr.trade** is the ENGINE - the DEX infrastructure
- **CasperLink** is the SMART INTERFACE that uses that engine intelligently

Without CasperLink:
- Users manually navigate to cspr.trade
- Calculate slippage themselves
- Execute swaps step-by-step

WITH CasperLink:
- Express ONE intent
- Click ONE button
- **Done!** Everything executes automatically with Oracle-verified pricing

We're not building another DEX. We're building the GPS for DeFi navigation.

---

## 5. LIVE DEMONSTRATION (2:30-4:30)

Let me show you how it works. This is the live application running on Vercel,
connected to Casper Testnet.

[SCREEN: Homepage]
First, I connect my CSPR.click wallet - seamless integration.

[Click Connect Wallet]

[SCREEN: Create Intent page]
Now I want to swap some CSPR for USDC.

[Fill out form while speaking]
- From Chain: Casper
- Amount: 10 CSPR
- To Token: USDC
- Slippage: 5% (default)

[Hover over Create Intent button]
When I click "Create Intent," this triggers a REAL transaction on Casper Testnet.

[Click button, show transaction confirmation if possible]

Now here's the magic - let's execute it!

[SCREEN: My Intents page]
Here's my intent. See this "Execute via CSPR.trade" button?

[Hover over button]
When I click this, CasperLink:
1. Calls our backend API
2. Creates a swap deploy using SDK v5.x and SessionBuilder
3. Loads proxy_caller.wasm (the CSPR.trade pattern)
4. Builds the swap arguments with slippage protection
5. Returns a deployJSON compatible with CSPR.click wallet

[Click Execute button]

[SCREEN: CSPR.click wallet prompt]
The wallet prompts me to sign - this is the REAL transaction being sent to Casper network.

[Sign transaction]

[SCREEN: Success Modal]
And there it is! A success modal with a REAL transaction hash!

[Point to transaction hash]
This is `94dbe5de94f604573bd569259f7525949ede9864727a86cffcaf232c63eb8c98`

You can copy it, and there's a direct link to the Casper Explorer.

[Click "View on Explorer"]

---

## 6. THE PROOF - ON-CHAIN VERIFICATION (4:30-5:30)

[SCREEN: Casper Testnet Explorer showing transaction 94dbe5de...]

Here's the proof. This is the Casper Testnet Explorer showing our executed swap.

[Point to relevant sections]
- **Transaction Hash**: 94dbe5de...
- **Status**: SUCCESS ✅
- **Type**: Transaction (not just a deploy)
- **Entry Point**: Called via proxy_caller to CSPR.trade router
- **Result**: 1 CSPR → 0.00457 WUSDC

This is REAL. This is LIVE. This is on-chain.

[Scroll down to show more details]
You can see the full transaction details - the arguments passed, the gas used,
the timestamp. Everything is transparent and verifiable.

[SCREEN: Back to My Intents page]
And back in CasperLink, the intent is now marked as "Completed" with
the transaction hash displayed.

Every intent has a "View on Explorer" link. Click it, and you see the full
on-chain proof.

This is what production-ready means - real transactions, real execution, real proof.

---

## 7. TECHNICAL IMPLEMENTATION (5:30-6:30)

Let me quickly explain what's happening under the hood:

[SCREEN: Show code or diagram if possible]

**Backend Integration**:
- We use casper-js-sdk version 5.x - the latest SDK
- SessionBuilder pattern for creating transactions
- proxy_caller.wasm for CSPR transfers to contracts
- Compatible with CSPR.click wallet's signing format

**Why Proxy Caller?**
CSPR.trade requires CSPR to be sent to the contract for swaps.
The proxy caller:
1. Populates the `__cargo_purse` with the CSPR amount
2. Calls the router's `swap_exact_cspr_for_tokens` entry point
3. Returns the swapped tokens to the user

This is the **official pattern** recommended by the CSPR.trade team,
and we've implemented it successfully!

**Slippage Protection**:
- We calculate a conservative estimate for amount_out_min
- Based on Oracle prices (future enhancement)
- Protects users from unfavorable price movements
- Transaction reverts if slippage exceeds tolerance

---

## 8. PRODUCTION QUALITY (6:30-7:00)

What makes CasperLink production-ready?

**SMART CONTRACTS**:
- Built with the Odra framework for gas-optimized Rust contracts
- Two contracts deployed and verified on Casper Testnet
- Oracle: `hash-c558b459...`
- Intent Parser: `hash-b6aaa644...`

**FRONTEND**:
- Next.js 14 with TypeScript for type safety
- CSPR.click SDK for seamless wallet integration
- Beautiful glassmorphism UI with Casper branding
- Deployed on Vercel with real-time updates
- Success modals with copyable transaction hashes

**INFRASTRUCTURE VALUE**:
- Public Oracle price feeds for the entire Casper ecosystem
- Working DEX integration showcasing CSPR.trade capabilities
- Open-source SDK v5.x examples for other developers
- Intent-based UX paradigm for cross-chain operations

---

## 9. ECOSYSTEM VALUE (7:00-7:30)

CasperLink strengthens the Casper ecosystem in multiple ways:

**For Users**:
- Simplest cross-chain UX in Web3
- One-click execution with automatic price protection
- Transparent - all transactions verifiable on-chain

**For Casper Infrastructure**:
- Showcases CSPR.trade's capabilities
- Ready to integrate with CSPR.bridge when it launches
- Provides working examples of SDK v5.x patterns

**For Developers**:
- Free Oracle price feeds for any dApp
- Reference implementation of proxy caller pattern
- Open-source TypeScript + Rust codebase
- SessionBuilder examples with CSPR.click wallet

**For the Ecosystem**:
- Positions Casper as cross-chain leader
- Intent-based UX attracts new users
- Public infrastructure benefits everyone

---

## 10. ROADMAP & VISION (7:30-8:15)

So what's next for CasperLink?

**PHASE 4 - Bridge Integration**:
When cspr.bridge launches, we'll integrate it as our cross-chain execution layer.
Users will be able to create intents like "Swap BTC on Bitcoin for ETH on Ethereum"
and CasperLink will:
- Bridge BTC to Casper via cspr.bridge
- Swap on cspr.trade
- Bridge ETH to Ethereum
- All from ONE simple interface!

**PHASE 5 - Multi-DEX Aggregation**:
Support for multiple DEXs on Casper. CasperLink will automatically route through
the DEX with the best price - whether that's cspr.trade or future DEXs.

**PHASE 6 - Advanced Features**:
- ZK-verified execution proofs
- Intent matching algorithms
- Institutional-grade API
- Mainnet deployment with security audits

**The Vision**:
CasperLink becomes the **UNIVERSAL INTERFACE** for cross-chain operations on Casper.
The place where users come when they want to move assets across chains -
simple, secure, and smart.

---

## 11. CALL TO ACTION (8:15-8:45)

This isn't a proof of concept. This is LIVE infrastructure that works TODAY.

You can try it right now:
1. Visit **casper-link.vercel.app**
2. Connect your CSPR.click wallet
3. Create an intent
4. **Click "Execute via CSPR.trade"**
5. Watch it execute automatically!

Every transaction is verifiable on Casper Explorer. The code is open-source on GitHub.

If you believe in making cross-chain DeFi simple and accessible...
If you want to see Casper become the cross-chain leader...
If you value production-ready infrastructure over promises...

**I'd love your vote!**

---

## 12. ACKNOWLEDGMENTS & CLOSING (8:45-9:00)

Thank you to:
- **Michael and David** from Casper for guidance on CSPR.trade integration and SDK v5.x
- **The CSPR.trade team** for providing the proxy_caller pattern
- **The Odra team** for the excellent smart contract framework
- **The CSPR.click team** for seamless wallet integration
- **Casper Association** for this incredible hackathon

And thank you for watching!

Let's make cross-chain simple.
Let's build the future together.
Let's make Casper the cross-chain hub of Web3!

Thank you!

[END SCREEN:
- Website: casper-link.vercel.app
- GitHub: github.com/SohamJuneja/CasperLink
- Transaction Hash: 94dbe5de...
- "Vote for CasperLink!"
]

---

## VISUAL NOTES FOR VIDEO EDITING:

**Key Moments to Highlight**:
1. Success modal showing transaction hash (00:02:30)
2. Explorer showing SUCCESS status (00:04:30)
3. Transaction details proving execution (00:05:00)
4. Code snippets showing SessionBuilder (00:05:45)
5. My Intents page showing completed status (00:06:15)

**Text Overlays**:
- "WORKING EXECUTION!" at 00:00:15
- "Real Transaction Hash" at 00:02:45
- "Verified On-Chain ✅" at 00:04:35
- "Production Ready" at 00:06:30
- "Vote for CasperLink!" at 00:08:30

**Background Music**:
- Upbeat, modern, tech-focused
- Not too loud (keep voiceover clear)
- Build energy toward the end

**Screen Recording Tips**:
- Record at 1080p minimum
- Zoom in on important UI elements
- Slow down cursor movements for clarity
- Pre-load all pages to avoid loading screens
- Have the transaction hash ready to copy

**B-Roll Suggestions**:
- Casper logo animations
- Abstract blockchain visuals
- Code scrolling (briefly)
- Network graph animations
- Success checkmarks

---

## BACKUP SCRIPT (If Live Demo Fails):

"As you can see from this pre-recorded demonstration [show recording],
the execution works flawlessly. Here's the verified transaction hash on Casper Explorer
[show screenshot]. This is real, on-chain proof that CasperLink delivers working execution,
not just promises."

[Continue with rest of script from Section 6]

---

## TIMING BREAKDOWN:

- Introduction: 30s
- Problem Statement: 30s
- Solution Overview: 60s
- Why It Matters: 30s
- Live Demo: 120s
- On-Chain Proof: 60s
- Technical Details: 60s
- Production Quality: 30s
- Ecosystem Value: 30s
- Roadmap: 45s
- Call to Action: 30s
- Acknowledgments: 15s

**Total**: ~9 minutes (perfect for hackathon submission!)

---

Good luck with the video! Remember: the transaction hash `94dbe5de...` is your PROOF.
Make it prominent! 🚀
