# Configure New IntentParser Contract

Your contract is deployed at: `hash-b6aaa644364bcd232691517396431417d926a0d256f6c0d6fa05d505f1e027d0`

## ⚠️ IMPORTANT: Set Oracle and TokenFactory Addresses

The new contract has a `init()` method that doesn't take parameters. You need to call `set_oracle()` and `set_token_factory()` to configure it.

### Step 1: Set Oracle Address

Using CSPR.live or casper-client, call:
- **Contract**: `hash-b6aaa644364bcd232691517396431417d926a0d256f6c0d6fa05d505f1e027d0`
- **Entry Point**: `set_oracle`
- **Args**:
  - `oracle_contract` (Key): `hash-c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac`

### Step 2: Set TokenFactory Address

Using CSPR.live or casper-client, call:
- **Contract**: `hash-b6aaa644364bcd232691517396431417d926a0d256f6c0d6fa05d505f1e027d0`
- **Entry Point**: `set_token_factory`
- **Args**:
  - `token_factory` (Key): `hash-03d00e4f26b4717f35b13f154c2da117c4d146607ad85a93104c7441392ccf4b`

## OR: Use casper-client

```bash
# Set Oracle
casper-client put-deploy \
  --node-address https://rpc.testnet.casperlabs.io \
  --chain-name casper-test \
  --secret-key E:\blockchain\CasperLink\secret_key.pem \
  --payment-amount 3000000000 \
  --session-hash b6aaa644364bcd232691517396431417d926a0d256f6c0d6fa05d505f1e027d0 \
  --session-entry-point set_oracle \
  --session-arg "oracle_contract:key='hash-c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac'"

# Set TokenFactory
casper-client put-deploy \
  --node-address https://rpc.testnet.casperlabs.io \
  --chain-name casper-test \
  --secret-key E:\blockchain\CasperLink\secret_key.pem \
  --payment-amount 3000000000 \
  --session-hash b6aaa644364bcd232691517396431417d926a0d256f6c0d6fa05d505f1e027d0 \
  --session-entry-point set_token_factory \
  --session-arg "token_factory:key='hash-03d00e4f26b4717f35b13f154c2da117c4d146607ad85a93104c7441392ccf4b'"
```

After these are set, the contract will be fully configured for real bridge execution!