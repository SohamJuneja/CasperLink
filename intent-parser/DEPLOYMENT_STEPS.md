# Quick Deployment Guide

## ✅ Step 1: Build Complete!

Your contract is ready at: `wasm\IntentParser.wasm`

## 🚀 Step 2: Deploy to Casper Testnet

### Option A: Using the Deployment Script (Easiest)

1. **Edit `deploy.bat`** and update line 9:
   ```batch
   set SECRET_KEY=C:\path\to\your\secret_key.pem
   ```
   Replace with your actual secret key path (from CSPR.click wallet export)

2. **Run the script:**
   ```bash
   .\deploy.bat
   ```

3. **Copy the deploy hash** from the output

4. **Wait ~1 minute** for the deploy to process

### Option B: Manual Deployment

If you don't have `casper-client` installed or prefer manual deployment:

1. **Use Casper Signer or CSPR.click:**
   - Go to https://testnet.cspr.live/deploy
   - Upload `wasm\IntentParser.wasm`
   - Set payment amount: `200000000000` motes (200 CSPR)
   - Add session args:
     - `odra_cfg_package_hash_key_name` (String): `intent_parser_package_hash`
     - `odra_cfg_allow_key_override` (Bool): `true`
     - `odra_cfg_is_upgradable` (Bool): `true`
     - `oracle_contract` (Key): `hash-c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac`
   - Sign and deploy

## 📋 Step 3: Get the Package Hash

After deployment succeeds (check on https://testnet.cspr.live/deploy/YOUR_DEPLOY_HASH):

### Method 1: From CSPR.live Explorer

1. Go to: https://testnet.cspr.live/deploy/YOUR_DEPLOY_HASH
2. Wait for "Success" status
3. Look in the "Named Keys" section
4. Find `intent_parser_package_hash`
5. Copy the hash value (starts with `hash-`)

### Method 2: Using casper-client (if installed)

```bash
# Get your account hash first
casper-client account-address --public-key path/to/your/public_key.pem

# Query for the contract hash
casper-client query-global-state \
  --node-address https://rpc.testnet.casperlabs.io \
  --state-root-hash <STATE_ROOT_HASH> \
  --key <YOUR_ACCOUNT_HASH> \
  -q "intent_parser_package_hash"
```

## 🔧 Step 4: Update Frontend

Edit `frontend\types\contracts.ts` line 35:

```typescript
export const CONTRACT_CONFIG: ContractConfig = {
  oraclePackageHash: 'hash-c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac',
  intentParserPackageHash: 'hash-YOUR_NEW_HASH_HERE', // ← Update this!
  tokenFactoryPackageHash: 'hash-0000000000000000000000000000000000000000000000000000000000000000',
  nodeAddress: 'https://node.testnet.casper.network/rpc',
  chainName: 'casper-test',
};
```

## ✨ Step 5: Test!

1. **Rebuild frontend:**
   ```bash
   cd ..\frontend
   npm run build
   npm run dev
   ```

2. **Test the full flow:**
   - Connect wallet
   - Create intent with price condition
   - Wait for price to be met (or use easy condition like "ETH ≤ $10000")
   - Click "🔥 Execute On-Chain"
   - Enter Ethereum address: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb`
   - Sign transaction
   - **See TX hash on Casper Explorer!** 🎉

## 🎯 What You'll Have

After this, your demo will show:

1. ✅ Create intent → TX #1 on explorer
2. ✅ Price monitoring → Automatic
3. ✅ Execute intent → TX #2 on explorer
4. ✅ Complete intent → Done

**Two separate on-chain transactions proving the entire system works!**

## 🐛 Troubleshooting

### casper-client not found
Install it: `cargo install casper-client`

Or use Option B (manual deployment via CSPR.live)

### Not enough CSPR
You need ~200 CSPR in your account. Get testnet CSPR from:
- https://testnet.cspr.live/tools/faucet

### Deployment fails
- Check secret key path is correct
- Verify you have enough CSPR
- Make sure Oracle hash is correct
- Try increasing payment amount to 250000000000

### Frontend not working after update
- Clear browser cache
- Check console for errors
- Verify new package hash in contracts.ts
- Restart dev server

## 📞 Need Help?

Check:
- Casper Discord: https://discord.gg/casperblockchain
- CSPR.live Explorer: https://testnet.cspr.live
- Your deploy status: https://testnet.cspr.live/deploy/YOUR_HASH