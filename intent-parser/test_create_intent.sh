#!/bin/bash

echo "🧪 Testing Intent Parser - Creating Cross-Chain Intent"
echo "======================================================"
echo ""

PACKAGE_HASH="hash-c4a16a44741aff3987a6865b0a627a2200a171e918da3c655d71351aaed80323"

echo "Creating intent: Swap 100 USDC (Ethereum) → CSPR (Casper)"
echo ""

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
echo "Intent creation transaction submitted!"
