export interface Intent {
    intent_id: string;
    user: string;
    source_chain: string;
    dest_chain: string;
    token_in: string;
    token_out: string;
    amount_in: string;
    min_amount_out: string;
    price_in: string;
    price_out: string;
    timestamp: string;
    status: number;
  }
  
  export interface ContractConfig {
    oraclePackageHash: string;
    intentParserPackageHash: string;
    nodeAddress: string;
    chainName: string;
  }
  
  export const CONTRACT_CONFIG: ContractConfig = {
    oraclePackageHash: 'hash-c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac',
    intentParserPackageHash: 'hash-632a3eb1eef79a708c54d6e1bb84352e1445760ade1a6edbd20d7d375dfe20bb',
    nodeAddress: 'https://node.testnet.casper.network/rpc',
    chainName: 'casper-test',
  };
  
  export const SUPPORTED_CHAINS = ['ETHEREUM', 'POLYGON', 'ARBITRUM', 'BSC', 'CASPER'] as const;
  export const SUPPORTED_TOKENS = ['USDC', 'USDT', 'ETH', 'WETH', 'WBTC', 'BTC', 'CSPR'] as const;
  
  export type SupportedChain = typeof SUPPORTED_CHAINS[number];
  export type SupportedToken = typeof SUPPORTED_TOKENS[number];