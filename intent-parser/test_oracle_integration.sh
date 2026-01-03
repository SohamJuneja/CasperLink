#!/bin/bash

PACKAGE_HASH="hash-632a3eb1eef79a708c54d6e1bb84352e1445760ade1a6edbd20d7d375dfe20bb"

echo "🧪 Test 1: Create Intent"
casper-client put-transaction package \
  --node-address https://node.testnet.casper.network/rpc \
  --chain-name casper-test \
  --secret-key keys/secret_key.pem \
  --gas-price-tolerance 10 \
  --pricing-mode classic \
  --payment-amount 10000000000 \
  --standard-payment "true" \
  --contract-package-hash $PACKAGE_HASH \
  --session-entry-point create_intent \
  --session-arg "source_chain:string:'ETHEREUM'" \
  --session-arg "dest_chain:string:'CASPER'" \
  --session-arg "token_in:string:'USDC'" \
  --session-arg "token_out:string:'CSPR'" \
  --session-arg "amount_in:u512:'100000000'"

echo ""
echo "Intent created! Now set prices with Oracle data..."
echo ""
echo "🧪 Test 2: Set Prices (USDC=$1, CSPR=$0.03)"
sleep 10

casper-client put-transaction package \
  --node-address https://node.testnet.casper.network/rpc \
  --chain-name casper-test \
  --secret-key keys/secret_key.pem \
  --gas-price-tolerance 10 \
  --pricing-mode classic \
  --payment-amount 10000000000 \
  --standard-payment "true" \
  --contract-package-hash $PACKAGE_HASH \
  --session-entry-point set_intent_prices \
  --session-arg "intent_id:u64:'1'" \
  --session-arg "price_in:u512:'100000000'" \
  --session-arg "price_out:u512:'3000000'"

echo ""
echo "✅ Tests complete!"
