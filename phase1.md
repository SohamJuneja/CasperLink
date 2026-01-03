# CasperLink - Phase 1: Oracle Deployment ✅

**Project:** CasperLink - Universal Smart Contract Oracle & Cross-Chain Intent Network  
**Phase:** 1 of 3 - Oracle Smart Contract  
**Status:** ✅ COMPLETE  
**Date Completed:** December 21, 2025  
**Hackathon:** Casper Blockchain Hackathon 2026 (DoraHacks)

---

## 🎯 Phase 1 Objectives

Build and deploy a functional oracle smart contract on Casper testnet that can:
- Store price feed data for multiple assets
- Enforce owner-only write permissions
- Provide public read access to price data
- Track update timestamps

**Status: All objectives achieved ✅**

---

## 📋 Technical Stack

### Development Environment
- **Framework:** Odra 2.4.0 (Rust-based smart contract framework)
- **Language:** Rust (stable toolchain)
- **Target:** WebAssembly (wasm32-unknown-unknown)
- **Testing:** Odra test environment with Casper Execution Engine
- **Deployment:** casper-client 5.0.0 CLI

### Blockchain
- **Network:** Casper Testnet
- **Chain:** casper-test
- **Runtime:** VmCasperV1
- **Pricing Mode:** Classic (PaymentLimited)

---

## 🏗️ Architecture

### Smart Contract Structure

```rust
#[odra::module]
pub struct CasperLinkOracle {
    prices: Mapping<String, U512>,
    last_update: Var<u64>,
    owner: Var<Address>,
}
```

### Entry Points

1. **`init()`**
   - Access: Constructor group (called during deployment)
   - Function: Initialize contract, set deployer as owner
   - Status: ✅ Auto-called during deployment

2. **`submit_price(price_feed: String, price_value: U512, timestamp: u64)`**
   - Access: Owner only
   - Function: Submit oracle price data
   - Validation: Only accepts BTC_USD, ETH_USD, CSPR_USD feeds
   - Status: ✅ Tested and working

3. **`get_price(price_feed: String) -> U512`**
   - Access: Public
   - Function: Query current price for a feed
   - Returns: Price value or 0 if not set

4. **`get_last_update() -> u64`**
   - Access: Public
   - Function: Get timestamp of last price update
   - Returns: Unix timestamp

5. **`get_owner() -> Address`**
   - Access: Public
   - Function: Get contract owner address
   - Returns: Owner's address

### Error Handling

```rust
#[odra::odra_error]
pub enum OracleError {
    NotInitialized = 1,
    Unauthorized = 2,
    InvalidPriceFeed = 3,
}
```

---

## 🚀 Deployment Details

### Contract Identifiers

**Package Hash:**
```
hash-c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac
```

**Contract Hash:**
```
hash-3c5bf8c52b337b3c45f62493e20386ea844ff72f22d7f96143c073fad60c2500
```

**Named Key (in deployer account):**
```
casperlink_oracle
```

**Account Hash (Owner):**
```
account-hash-74ab92cebdb16189b8a1d3ed5a87d6fff8df694e9ede46393b5e11bb441be597
```

**Public Key:**
```
02031ed02f6abebdec47e03f18bc1ee37fcae4d999e82a4f49512c8d25489dfd5302
```

### Deployment Transaction

**Transaction Hash:**
```
14fe97abcde5669bb6269f3512a8d5bfb7e0c33f3cf6dc32d52ea6a93ff99f6e
```

**Block Height:** 6288528  
**Block Hash:** `30e01dea8301a86e4fecaff0abf5cac2ed67c2fb61461322e96b3762ee768aa9`

**Deployment Cost:**
- Gas Limit: 500 CSPR
- Gas Consumed: 303.54 CSPR
- Gas Refunded: 147.34 CSPR
- **Net Cost: 352.66 CSPR**

**WASM Size:** 344,882 bytes (344 KB)

**Explorer Link:**
https://testnet.cspr.live/deploy/14fe97abcde5669bb6269f3512a8d5bfb7e0c33f3cf6dc32d52ea6a93ff99f6e

---

## ✅ Testing & Verification

### Test 1: Price Submission

**Transaction Hash:**
```
bc0c1b1b28dc37377412428686cc78bdb35c8e8242780ceef2969faae4977adb
```

**Parameters:**
- Price Feed: `BTC_USD`
- Price Value: `10000000000000` (represents $100,000 with 8 decimal precision)
- Timestamp: `1734789600`

**Result:** ✅ SUCCESS
- Cost: 0.31 CSPR (refunded 7.26 CSPR)
- Data successfully written to contract storage
- Block Height: 6288564

**Explorer Link:**
https://testnet.cspr.live/deploy/bc0c1b1b28dc37377412428686cc78bdb35c8e8242780ceef2969faae4977adb

---

## 📦 Deployment Commands Reference

### 1. Build WASM

```bash
cd /path/to/casper-oracle
cargo odra build -b casper
```

Output: `wasm/CasperLinkOracle.wasm`

### 2. Deploy Contract

```bash
casper-client put-transaction session \
  --node-address https://node.testnet.casper.network/rpc \
  --chain-name casper-test \
  --secret-key keys/secret_key.pem \
  --gas-price-tolerance 10 \
  --pricing-mode classic \
  --payment-amount 500000000000 \
  --standard-payment "true" \
  --wasm-path wasm/CasperLinkOracle.wasm \
  --transaction-runtime vm-casper-v1 \
  --session-entry-point call \
  --install-upgrade \
  --session-arg "odra_cfg_package_hash_key_name:string:'casperlink_oracle'" \
  --session-arg "odra_cfg_allow_key_override:bool:'false'" \
  --session-arg "odra_cfg_is_upgradable:bool:'true'" \
  --session-arg "odra_cfg_is_upgrade:bool:'false'"
```

### 3. Submit Price Data

```bash
casper-client put-transaction package \
  --node-address https://node.testnet.casper.network/rpc \
  --chain-name casper-test \
  --secret-key keys/secret_key.pem \
  --gas-price-tolerance 10 \
  --pricing-mode classic \
  --payment-amount 10000000000 \
  --standard-payment "true" \
  --contract-package-hash hash-c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac \
  --session-entry-point submit_price \
  --session-arg "price_feed:string:'BTC_USD'" \
  --session-arg "price_value:u512:'10000000000000'" \
  --session-arg "timestamp:u64:'1734789600'"
```

### 4. Query Contract State

```bash
casper-client query-global-state \
  --node-address https://node.testnet.casper.network/rpc \
  --state-root-hash $(casper-client get-state-root-hash --node-address https://node.testnet.casper.network/rpc | jq -r '.result.state_root_hash') \
  --key account-hash-74ab92cebdb16189b8a1d3ed5a87d6fff8df694e9ede46393b5e11bb441be597
```

---

## 🔧 Development Challenges & Solutions

### Challenge 1: Windows/Unix Compatibility
**Problem:** `casper-types 6.1.0` has Unix-specific code that fails on Windows  
**Solution:** Used WSL (Windows Subsystem for Linux) for all Casper tooling

### Challenge 2: Dependency Version Conflicts
**Problem:** casper-contract SDK had Rust nightly version conflicts  
**Solution:** Switched to Odra framework (recommended by hackathon organizers)

### Challenge 3: Out of Gas Errors
**Problem:** Initial deployments with 200-300 CSPR failed  
**Solution:** Increased gas limit to 500 CSPR for 344KB WASM

### Challenge 4: Missing Odra Configuration
**Problem:** First deployment failed with error code 64658  
**Solution:** Added required Odra config arguments:
- `odra_cfg_package_hash_key_name`
- `odra_cfg_allow_key_override`
- `odra_cfg_is_upgradable`
- `odra_cfg_is_upgrade`

### Challenge 5: Init Function Access
**Problem:** "Invalid context" when calling init() after deployment  
**Solution:** Realized init() is auto-called during deployment (constructor_group access)

---

## 📁 Project Structure

```
casper-oracle/
├── Cargo.toml                 # Rust dependencies
├── Odra.toml                  # Odra configuration
├── src/
│   └── lib.rs                # Oracle smart contract code
├── wasm/
│   └── CasperLinkOracle.wasm # Compiled contract (344KB)
├── keys/
│   └── secret_key.pem        # Deployment key
└── README.md                  # Project documentation
```

---

## 🎓 Key Learnings

1. **Odra Framework Advantages:**
   - Clean, Solidity-like syntax
   - Built-in testing with Casper Execution Engine
   - Automatic event handling via Casper Event Standard
   - Eliminates low-level Casper SDK complexity

2. **Gas Estimation:**
   - Large WASM files (300KB+) require 500+ CSPR
   - Simple contract calls cost ~0.3 CSPR
   - Always overestimate gas to avoid failures

3. **Casper-Specific Patterns:**
   - Constructor functions run in restricted context
   - Named keys provide human-readable contract references
   - Dictionary storage for mapping-like data structures

4. **Development Workflow:**
   - Build locally → Test with Odra → Deploy to testnet
   - Always verify transactions before proceeding
   - Use WSL for Casper tooling on Windows

---

## 📊 Phase 1 Metrics

| Metric | Value |
|--------|-------|
| Development Time | 1 day |
| Total Deployments | 4 (3 failed, 1 success) |
| Total Gas Spent | ~900 CSPR |
| Final Contract Size | 344 KB |
| Entry Points | 5 |
| Test Transactions | 2 |
| Lines of Code | ~80 |

---

## 🔮 Next Steps: Phase 2

### Cross-Chain Intent Execution

**Objectives:**
1. Build intent parser contract
2. Implement cross-chain message routing
3. Add destination chain executor contracts
4. Test end-to-end intent flow

**Target Chains:**
- Ethereum (Sepolia)
- Polygon (Mumbai)
- Arbitrum (Testnet)

**Estimated Timeline:** 2-3 days

---

## 🔗 Important Links

- **Testnet Account:** https://testnet.cspr.live/account/02031ed02f6abebdec47e03f18bc1ee37fcae4d999e82a4f49512c8d25489dfd5302
- **Contract Package:** https://testnet.cspr.live/contract-package/c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac
- **Odra Documentation:** https://odra.dev/docs/
- **Casper Documentation:** https://docs.casper.network/

---

## 📝 Notes

- Contract is deployed as upgradable (can be updated)
- Owner can submit prices for BTC_USD, ETH_USD, CSPR_USD
- Price values use 8 decimal precision (1 USD = 100000000)
- Contract uses Casper Event Standard for event emission
- All code follows Odra best practices

---

**Phase 1: COMPLETE ✅**  
**Ready for Phase 2: Cross-Chain Intent Network 🚀**

---

*Document Version: 1.0*  
*Last Updated: December 21, 2025*  
*Author: CasperLink Team*