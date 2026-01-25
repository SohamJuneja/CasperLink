import { CONTRACT_CONFIG, BRIDGED_TOKEN_ADDRESSES } from '@/types/contracts';
import * as CasperSDK from 'casper-js-sdk';

const {
  CLPublicKey,
  DeployUtil,
  RuntimeArgs,
  CLValueBuilder,
  CLByteArray,
  CLKey
} = CasperSDK;

export class ContractService {
  private chainName = CONTRACT_CONFIG.chainName;
  private nodeAddress = 'https://api.testnet.cspr.cloud/rpc';
  private intentParserHash = CONTRACT_CONFIG.intentParserPackageHash;
  private oracleHash = CONTRACT_CONFIG.oraclePackageHash;
  private tokenFactoryHash = CONTRACT_CONFIG.tokenFactoryPackageHash;

  async createIntentDeploy(
    publicKey: string,
    sourceChain: string,
    destChain: string,
    tokenIn: string,
    tokenOut: string,
    amountIn: string
  ) {
    const senderPublicKey = CLPublicKey.fromHex(publicKey.toLowerCase());
    
    const deployParams = new DeployUtil.DeployParams(senderPublicKey, this.chainName);
    
    const args = RuntimeArgs.fromMap({
      source_chain: CLValueBuilder.string(sourceChain),
      dest_chain: CLValueBuilder.string(destChain),
      token_in: CLValueBuilder.string(tokenIn),
      token_out: CLValueBuilder.string(tokenOut),
      amount_in: CLValueBuilder.u512(amountIn),
    });

    // Use newStoredVersionedContractByHash for package hash
    const session = DeployUtil.ExecutableDeployItem.newStoredVersionContractByHash(
      Uint8Array.from(Buffer.from(this.intentParserHash.replace('hash-', ''), 'hex')),
      null, // Use latest version
      'create_intent',
      args
    );

    const payment = DeployUtil.standardPayment('10000000000');

    const deploy = DeployUtil.makeDeploy(deployParams, session, payment);
    
    return JSON.stringify(DeployUtil.deployToJson(deploy).deploy);
  }

  // NEW: Query intent by ID
  async getIntent(intentId: number): Promise<unknown> {
    try {
      const response = await fetch(this.nodeAddress, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'state_get_dictionary_item',
          params: {
            state_root_hash: await this.getStateRootHash(),
            dictionary_identifier: {
              ContractNamedKey: {
                key: 'intents',
                dictionary_name: 'intents',
                dictionary_item_key: intentId.toString()
              }
            }
          },
          id: 1
        })
      });

      const data = await response.json();
      return data.result?.stored_value?.CLValue;
    } catch (error) {
      console.error('Failed to get intent:', error);
      return null;
    }
  }

  // NEW: Get total intents count
  async getTotalIntents(): Promise<number> {
    try {
      const response = await fetch(this.nodeAddress, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'state_get_dictionary_item',
          params: {
            state_root_hash: await this.getStateRootHash(),
            dictionary_identifier: {
              ContractNamedKey: {
                key: 'next_intent_id',
                dictionary_name: 'intent_parser',
                dictionary_item_key: 'total'
              }
            }
          },
          id: 1
        })
      });

      const data = await response.json();
      return parseInt(data.result?.stored_value?.CLValue?.parsed || '0');
    } catch (error) {
      console.error('Failed to get total intents:', error);
      return 0;
    }
  }

  // NEW: Get oracle price
  async getOraclePrice(priceFeed: string): Promise<string> {
    try {
      const response = await fetch(this.nodeAddress, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'state_get_dictionary_item',
          params: {
            state_root_hash: await this.getStateRootHash(),
            dictionary_identifier: {
              ContractNamedKey: {
                key: 'prices',
                dictionary_name: 'prices',
                dictionary_item_key: priceFeed
              }
            }
          },
          id: 1
        })
      });

      const data = await response.json();
      return data.result?.stored_value?.CLValue?.parsed || '0';
    } catch (error) {
      console.error('Failed to get price:', error);
      return '0';
    }
  }

  private async getStateRootHash(): Promise<string> {
    const response = await fetch(this.nodeAddress, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'chain_get_state_root_hash',
        params: {},
        id: 1
      })
    });

    const data = await response.json();
    return data.result.state_root_hash;
  }

  /**
   * Create a deploy to execute an intent on-chain
   * This calls IntentParser.execute_intent() to mark the intent as executing
   *
   * For a full bridge integration, this would call TokenFactory.burn()
   * but for demo purposes we use our own IntentParser contract
   *
   * @param publicKey - The sender's Casper public key
   * @param intentId - The intent ID to execute
   * @param ethRecipient - The Ethereum recipient address (stored for reference)
   * @returns JSON string of the deploy for signing
   */
  async createExecuteIntentDeploy(
    publicKey: string,
    intentId: string,
    ethRecipient: string
  ) {
    // Validate Ethereum address format
    if (!ethRecipient.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid Ethereum address format');
    }

    // Extract numeric ID from client-side ID format: "intent_1769032454954" → "1769032454954"
    // The contract expects just the number as a string
    const numericId = intentId.replace('intent_', '');

    const senderPublicKey = CLPublicKey.fromHex(publicKey.toLowerCase());
    const deployParams = new DeployUtil.DeployParams(senderPublicKey, this.chainName);

    // Build runtime args for execute_intent entry point
    // We store the eth_recipient as metadata for the bridge
    const args = RuntimeArgs.fromMap({
      intent_id: CLValueBuilder.string(numericId),
      eth_recipient: CLValueBuilder.string(ethRecipient),
    });

    // Create the session for calling IntentParser.execute_intent()
    const session = DeployUtil.ExecutableDeployItem.newStoredVersionContractByHash(
      Uint8Array.from(Buffer.from(this.intentParserHash.replace('hash-', ''), 'hex')),
      null, // Use latest version
      'execute_intent',
      args
    );

    // Standard payment for contract call
    const payment = DeployUtil.standardPayment('10000000000'); // 10 CSPR

    const deploy = DeployUtil.makeDeploy(deployParams, session, payment);

    return JSON.stringify(DeployUtil.deployToJson(deploy).deploy);
  }

  /**
   * Create a deploy to burn bridged tokens (Casper → Ethereum bridge)
   * This calls TokenFactory.burn() on the csprbridge contract
   *
   * NOTE: Requires TokenFactory contract address from csprbridge testnet
   *
   * @param publicKey - The sender's Casper public key
   * @param token - The token symbol (USDC, WETH, LINK)
   * @param amount - The amount to burn (in token decimals)
   * @param ethRecipient - The Ethereum recipient address (0x...)
   * @returns JSON string of the deploy for signing
   */
  async createBurnDeploy(
    publicKey: string,
    token: string,
    amount: string,
    ethRecipient: string
  ) {
    // Get CEP-18 token address for the token
    const cep18Address = BRIDGED_TOKEN_ADDRESSES[token];
    if (!cep18Address || cep18Address.includes('0000000000')) {
      throw new Error(`Token ${token} not configured. Please update BRIDGED_TOKEN_ADDRESSES with the correct CEP-18 contract hash from csprbridge testnet.`);
    }

    // Validate Ethereum address
    if (!ethRecipient.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid Ethereum address format');
    }

    const senderPublicKey = CLPublicKey.fromHex(publicKey.toLowerCase());
    const deployParams = new DeployUtil.DeployParams(senderPublicKey, this.chainName);

    // Convert cep18_address hash to CLKey
    const cep18HashBytes = Uint8Array.from(
      Buffer.from(cep18Address.replace('hash-', ''), 'hex')
    );

    // Convert eth_recipient to ByteArray 20
    const ethRecipientBytes = Uint8Array.from(
      Buffer.from(ethRecipient.replace('0x', ''), 'hex')
    );

    // Build runtime args for burn entry point
    // burn(cep18_address: Key, amount: U256, eth_recipient: [u8; 20], __cargo_purse: URef)
    const args = RuntimeArgs.fromMap({
      cep18_address: new CLKey(new CLByteArray(cep18HashBytes)),
      amount: CLValueBuilder.u256(amount),
      eth_recipient: new CLByteArray(ethRecipientBytes),
      // Note: __cargo_purse is handled by the contract context, we pass a payment purse
    });

    // Create the session for calling TokenFactory.burn()
    const session = DeployUtil.ExecutableDeployItem.newStoredVersionContractByHash(
      Uint8Array.from(Buffer.from(this.tokenFactoryHash.replace('hash-', ''), 'hex')),
      null, // Use latest version
      'burn',
      args
    );

    // Payment includes bridge fee (1 CSPR = 1,000,000,000 motes) + gas
    // Typical bridge fee is around 0.5-2 CSPR
    const payment = DeployUtil.standardPayment('15000000000'); // 15 CSPR for safety

    const deploy = DeployUtil.makeDeploy(deployParams, session, payment);

    return JSON.stringify(DeployUtil.deployToJson(deploy).deploy);
  }

  /**
   * Create a deploy to execute intent with real bridge via TokenFactory.burn()
   * This calls IntentParser.execute_intent_with_burn() which internally calls TokenFactory.burn()
   *
   * @param publicKey - The sender's Casper public key
   * @param intentId - The intent ID to execute
   * @param token - The token symbol (USDC, WETH, LINK)
   * @param ethRecipient - The Ethereum recipient address (0x...)
   * @returns JSON string of the deploy for signing
   */
  async createExecuteWithBurnDeploy(
    publicKey: string,
    intentId: string,
    token: string,
    ethRecipient: string
  ) {
    // Get CEP-18 token address for the token
    const cep18Address = BRIDGED_TOKEN_ADDRESSES[token];
    if (!cep18Address || cep18Address.includes('0000000000')) {
      throw new Error(`Token ${token} not supported for real bridge. Only USDC, WETH, and LINK are available.`);
    }

    // Validate Ethereum address
    if (!ethRecipient.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid Ethereum address format');
    }

    // Extract numeric ID from client-side ID format: "intent_1769032454954" → "1769032454954"
    // The contract expects just the number as a string
    const numericId = intentId.replace('intent_', '');

    const senderPublicKey = CLPublicKey.fromHex(publicKey.toLowerCase());
    const deployParams = new DeployUtil.DeployParams(senderPublicKey, this.chainName);

    // Convert cep18_address to proper Key type for Odra's Address (casper_types::Key)
    // Following the same pattern as CSPR.trade swap (which works!)
    const hashHex = cep18Address.replace('hash-', '');
    const hashBytes = Uint8Array.from(Buffer.from(hashHex, 'hex'));

    // CRITICAL: Create key bytes with Hash variant prefix (0x01) + 32-byte hash = 33 bytes total
    // This matches the Casper Key format for Hash variant
    const keyBytes = new Uint8Array(33);
    keyBytes[0] = 1; // 0x01 = Hash variant for Casper Key type
    keyBytes.set(hashBytes, 1);

    // Build runtime args for execute_intent_with_burn entry point
    // Use CLValueBuilder.byteArray() for the Key (same as CSPR.trade pattern)
    const args = RuntimeArgs.fromMap({
      intent_id: CLValueBuilder.string(numericId),
      cep18_token: CLValueBuilder.byteArray(keyBytes),  // Pass as ByteArray with 0x01 prefix
      eth_recipient: CLValueBuilder.string(ethRecipient),
    });

    // Create the session for calling IntentParser.execute_intent_with_burn()
    const session = DeployUtil.ExecutableDeployItem.newStoredVersionContractByHash(
      Uint8Array.from(Buffer.from(this.intentParserHash.replace('hash-', ''), 'hex')),
      null, // Use latest version
      'execute_intent_with_burn',
      args
    );

    // Payment for contract call + nested TokenFactory.burn() call
    const payment = DeployUtil.standardPayment('20000000000'); // 20 CSPR for nested contract calls

    const deploy = DeployUtil.makeDeploy(deployParams, session, payment);

    return JSON.stringify(DeployUtil.deployToJson(deploy).deploy);
  }

  /**
   * Check if the TokenFactory contract is properly configured
   */
  isTokenFactoryConfigured(): boolean {
    return !this.tokenFactoryHash.includes('0000000000');
  }

  /**
   * Check if a specific token is configured for bridging
   */
  isTokenConfigured(token: string): boolean {
    const address = BRIDGED_TOKEN_ADDRESSES[token];
    return !!address && !address.includes('0000000000');
  }

  /**
   * Get the CEP-18 address for a bridged token
   */
  getBridgedTokenAddress(token: string): string | null {
    const address = BRIDGED_TOKEN_ADDRESSES[token];
    if (address && !address.includes('0000000000')) {
      return address;
    }
    return null;
  }

  /**
   * Create a deploy for CSPR.trade swap (swap_exact_cspr_for_tokens)
   * This is an alternative to CSPR.bridge for demonstrating working cross-chain swaps
   *
   * @param publicKey User's public key
   * @param intentId Intent ID to execute
   * @param cspr_amount Amount of CSPR to swap (in motes, 1 CSPR = 1e9 motes)
   * @param token Token to receive (e.g., 'USDC')
   * @param slippage_percent Slippage tolerance (e.g., 5 for 5%)
   */
  async createCsprTradeSwapDeploy(
    publicKey: string,
    intentId: string,
    cspr_amount: string,
    token: string,
    slippage_percent: number = 5
  ) {
    console.log(`Creating CSPR.trade swap for intent ${intentId}: ${cspr_amount} motes CSPR -> ${token}`);

    // Import CSPR.trade config
    const { CSPR_TRADE_CONFIG } = await import('@/types/contracts');

    const WCSPR_ADDRESS = CSPR_TRADE_CONFIG.wcspr;
    const WUSDC_ADDRESS = CSPR_TRADE_CONFIG.wusdc;

    if (!WCSPR_ADDRESS || !WUSDC_ADDRESS || WCSPR_ADDRESS === 'hash-' || WUSDC_ADDRESS === 'hash-') {
      throw new Error('CSPR.trade token addresses not configured yet. Please ask David for WCSPR and WUSDC contract addresses.');
    }

    const senderPublicKey = CLPublicKey.fromHex(publicKey.toLowerCase());
    const deployParams = new DeployUtil.DeployParams(senderPublicKey, this.chainName);

    // Load proxy_caller.wasm
    const proxyWasmResponse = await fetch('/proxy_caller.wasm');
    if (!proxyWasmResponse.ok) {
      throw new Error('Failed to load proxy_caller.wasm');
    }
    const proxyWasmBuffer = await proxyWasmResponse.arrayBuffer();
    const proxyWasm = new Uint8Array(proxyWasmBuffer);

    // Calculate minimum output with slippage
    const estimatedOutput = BigInt(cspr_amount) / BigInt(200); // Rough estimate
    const minOutput = (estimatedOutput * BigInt(100 - slippage_percent)) / BigInt(100);

    // Prepare args for swap_exact_cspr_for_tokens
    const routerHash = CSPR_TRADE_CONFIG.routerPackageHash.replace('hash-', '');
    const epochPlus10Min = Date.now() + 10 * 60 * 1000; // milliseconds

    // Build path as List<Key> - create CLKey objects for WCSPR and WUSDC
    const wcsprHash = WCSPR_ADDRESS.replace('hash-', '');
    const wusdcHash = WUSDC_ADDRESS.replace('hash-', '');

    // Create Key bytes: 1 byte variant (0x01 for Hash) + 32 bytes hash
    const wcsprKeyBytes = new Uint8Array(33);
    wcsprKeyBytes[0] = 0x01; // Hash variant
    wcsprKeyBytes.set(Uint8Array.from(Buffer.from(wcsprHash, 'hex')), 1);

    const wusdcKeyBytes = new Uint8Array(33);
    wusdcKeyBytes[0] = 0x01; // Hash variant
    wusdcKeyBytes.set(Uint8Array.from(Buffer.from(wusdcHash, 'hex')), 1);

    // Create recipient key (Account variant)
    const recipientKeyBytes = new Uint8Array(33);
    recipientKeyBytes[0] = 0x02; // Account variant
    recipientKeyBytes.set(senderPublicKey.toAccountHash(), 1);

    // Build swap args using CLValueBuilder (v2.15.5 API)
    const odraArgs = RuntimeArgs.fromMap({
      amount_out_min: CLValueBuilder.u256(minOutput.toString()),
      path: CLValueBuilder.list([
        new CLKey(new CLByteArray(wcsprKeyBytes)),
        new CLKey(new CLByteArray(wusdcKeyBytes))
      ]),
      to: new CLKey(new CLByteArray(recipientKeyBytes)),
      deadline: CLValueBuilder.u64(epochPlus10Min),
    });

    console.log('Creating swap args with:', {
      amount_out_min: minOutput.toString(),
      path_keys: 2,
      recipient_account_hash: Buffer.from(senderPublicKey.toAccountHash()).toString('hex'),
      deadline: epochPlus10Min
    });

    const swapRuntimeArgs = odraArgs;

    // Build proxy_caller args (following David's pattern from stake.ts)
    // The args need to be serialized as a list of U8 values
    const swapArgsBytesArray = Array.from(swapRuntimeArgs.toBytes());
    const serializedSwapArgs = CLValueBuilder.list(
      swapArgsBytesArray.map(b => CLValueBuilder.u8(b))
    );

    console.log('Serialized swap args length:', swapArgsBytesArray.length);

    const proxyArgs = RuntimeArgs.fromMap({
      amount: CLValueBuilder.u512(cspr_amount), // Total CSPR to send
      attached_value: CLValueBuilder.u512(cspr_amount), // CSPR for the swap
      entry_point: CLValueBuilder.string('swap_exact_cspr_for_tokens'),
      package_hash: CLValueBuilder.byteArray(Uint8Array.from(Buffer.from(routerHash, 'hex'))),
      args: serializedSwapArgs,
    });

    console.log('Proxy args created successfully');

    console.log('Using proxy_caller pattern with CSPR amount:', cspr_amount);

    // Create session with proxy_caller WASM
    const session = DeployUtil.ExecutableDeployItem.newModuleBytes(
      proxyWasm,
      proxyArgs
    );

    // Payment is just for gas (the swap amount is in the session)
    const payment = DeployUtil.standardPayment('15000000000'); // 15 CSPR for gas

    const deploy = DeployUtil.makeDeploy(deployParams, session, payment);
    const deployJson = JSON.stringify(DeployUtil.deployToJson(deploy).deploy);

    console.log('Proxy deploy created, length:', deployJson.length);
    return deployJson;
  }
}

export const contractService = new ContractService();