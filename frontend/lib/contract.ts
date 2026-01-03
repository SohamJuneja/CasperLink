import { CONTRACT_CONFIG } from '@/types/contracts';
import * as CasperSDK from 'casper-js-sdk';

const { CLPublicKey, DeployUtil, RuntimeArgs, CLValueBuilder } = CasperSDK;

export class ContractService {
  private chainName = CONTRACT_CONFIG.chainName;
  private nodeAddress = 'https://api.testnet.cspr.cloud/rpc';
  private intentParserHash = CONTRACT_CONFIG.intentParserPackageHash;
  private oracleHash = CONTRACT_CONFIG.oraclePackageHash;

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
}

export const contractService = new ContractService();