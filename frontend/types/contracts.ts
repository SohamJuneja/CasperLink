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
    tokenFactoryPackageHash: string;
    nodeAddress: string;
    chainName: string;
  }

  // CEP-18 bridged token addresses on Casper Testnet (from csprbridge.com)
  export const BRIDGED_TOKEN_ADDRESSES: Record<string, string> = {
    // Real contract hashes from CSPRBridge testnet
    USDC: 'hash-62d62d5cb43d095b9096ecfe3a3f2bd4d2a1df4020cd9cda94594edb77fedf38',
    WETH: 'hash-862d4cb8812301301d3aadaf3b543cb4b6a8bf7dd3fbfb8dbd6a7a8a46fd0485',
    LINK: 'hash-617b3db3bb3af35db464fa494f07a5dec165093a1801b4a6961b6905473941c5',
  };

  // CSPR.trade Router and Token addresses
  export const CSPR_TRADE_CONFIG = {
    // Router contract package hash (from David)
    routerPackageHash: 'hash-04a11a367e708c52557930c4e9c1301f4465100d1b1b6d0a62b48d3e32402867',
    // WCSPR (Wrapped CSPR) address - from David
    wcspr: 'hash-3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e',
    // WUSDC (Wrapped USDC) address - from David
    wusdc: 'hash-073024d1112dd970cc75b797952a70f71efe3a8a69af152e8fbe8ef434823396',
  };

  export const CONTRACT_CONFIG: ContractConfig = {
    oraclePackageHash: 'hash-c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac',
    intentParserPackageHash: 'hash-b6aaa644364bcd232691517396431417d926a0d256f6c0d6fa05d505f1e027d0',
    // TokenFactory from csprbridge - handles burn/mint for real bridge execution
    tokenFactoryPackageHash: 'hash-03d00e4f26b4717f35b13f154c2da117c4d146607ad85a93104c7441392ccf4b',
    nodeAddress: 'https://node.testnet.casper.network/rpc',
    chainName: 'casper-test',
  };
  
  export const SUPPORTED_CHAINS = ['ETHEREUM', 'POLYGON', 'ARBITRUM', 'BSC', 'CASPER'] as const;
  export const SUPPORTED_TOKENS = ['USDC', 'USDT', 'ETH', 'WETH', 'WBTC', 'BTC', 'CSPR'] as const;
  
  export type SupportedChain = typeof SUPPORTED_CHAINS[number];
  export type SupportedToken = typeof SUPPORTED_TOKENS[number];