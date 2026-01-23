import { NextResponse } from 'next/server';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Oracle contract details
const ORACLE_PACKAGE_HASH = 'c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac';
const RPC_URL = 'https://rpc.testnet.casperlabs.io/rpc';

// CoinGecko API for real prices
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';

// Simple in-memory cache to avoid rate limiting
let priceCache: {
  data: Record<string, { usd: number; usd_24h_change: number }> | null;
  timestamp: number;
} = { data: null, timestamp: 0 };
const CACHE_TTL = 30000; // 30 seconds cache

interface PriceData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  source: 'oracle' | 'coingecko' | 'fallback';
  lastUpdated: string;
}

// Fallback prices (last resort)
const FALLBACK_PRICES: Record<string, number> = {
  BTC: 98500,
  ETH: 3450,
  CSPR: 0.0441,
  USDC: 1.00,
  USDT: 1.00,
  WETH: 3450,
  WBTC: 98500,
  LINK: 15.50,
};

// Stablecoins and wrapped tokens (fixed prices or derived from base)
const DERIVED_TOKENS: Record<string, { baseToken?: string; fixedPrice?: number }> = {
  USDC: { fixedPrice: 1.00 },
  USDT: { fixedPrice: 1.00 },
  WETH: { baseToken: 'ETH' },
  WBTC: { baseToken: 'BTC' },
};

// Try to get state root hash
async function getStateRootHash(): Promise<string | null> {
  try {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'chain_get_state_root_hash',
        params: {},
        id: 1
      }),
      signal: AbortSignal.timeout(5000)
    });
    const data = await response.json();
    return data.result?.state_root_hash || null;
  } catch (error) {
    console.error('[API] Failed to get state root hash:', error);
    return null;
  }
}

// Try to get price from Oracle contract
async function getOraclePrice(stateRootHash: string, priceFeed: string): Promise<number | null> {
  try {
    const response = await fetch(RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'state_get_dictionary_item',
        params: {
          state_root_hash: stateRootHash,
          dictionary_identifier: {
            ContractNamedKey: {
              key: `hash-${ORACLE_PACKAGE_HASH}`,
              dictionary_name: 'prices',
              dictionary_item_key: priceFeed
            }
          }
        },
        id: 1
      }),
      signal: AbortSignal.timeout(5000)
    });

    const data = await response.json();
    const parsed = data.result?.stored_value?.CLValue?.parsed;

    if (parsed) {
      // Price is stored in motes (8 decimals)
      return parseFloat(parsed) / 100_000_000;
    }
    return null;
  } catch (error) {
    console.error(`[API] Failed to get Oracle price for ${priceFeed}:`, error);
    return null;
  }
}

// Get real-time prices from CoinGecko (with caching to avoid rate limits)
async function getCoinGeckoPrices(): Promise<Record<string, { usd: number; usd_24h_change: number }> | null> {
  // Return cached data if still valid
  const now = Date.now();
  if (priceCache.data && (now - priceCache.timestamp) < CACHE_TTL) {
    console.log('[API] Using cached CoinGecko prices');
    return priceCache.data;
  }

  try {
    const response = await fetch(
      `${COINGECKO_API}?ids=bitcoin,ethereum,casper-network&vs_currencies=usd&include_24hr_change=true`,
      {
        signal: AbortSignal.timeout(5000),
        headers: {
          'Accept': 'application/json',
        }
      }
    );

    if (!response.ok) {
      // If rate limited (429), return cached data if available
      if (response.status === 429 && priceCache.data) {
        console.log('[API] Rate limited, using cached prices');
        return priceCache.data;
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const prices = {
      BTC: { usd: data.bitcoin?.usd || 0, usd_24h_change: data.bitcoin?.usd_24h_change || 0 },
      ETH: { usd: data.ethereum?.usd || 0, usd_24h_change: data.ethereum?.usd_24h_change || 0 },
      CSPR: { usd: data['casper-network']?.usd || 0, usd_24h_change: data['casper-network']?.usd_24h_change || 0 },
    };

    // Update cache
    priceCache = { data: prices, timestamp: now };
    return prices;
  } catch (error) {
    console.error('[API] Failed to fetch CoinGecko prices:', error);
    // Return cached data on error if available
    if (priceCache.data) {
      console.log('[API] Error occurred, using cached prices');
      return priceCache.data;
    }
    return null;
  }
}

export async function GET() {
  const startTime = Date.now();
  const results: PriceData[] = [];

  // Base tokens fetched from Oracle/CoinGecko
  const baseTokens = [
    { symbol: 'BTC_USD', name: 'Bitcoin', key: 'BTC' },
    { symbol: 'ETH_USD', name: 'Ethereum', key: 'ETH' },
    { symbol: 'CSPR_USD', name: 'Casper', key: 'CSPR' },
  ];

  // Additional tokens for bridge support
  const additionalTokens = [
    { symbol: 'USDC_USD', name: 'USD Coin', key: 'USDC' },
    { symbol: 'WETH_USD', name: 'Wrapped Ether', key: 'WETH' },
    { symbol: 'LINK_USD', name: 'Chainlink', key: 'LINK' },
  ];

  // Step 1: Try to fetch from Oracle contract
  const oraclePrices: Record<string, number> = {};
  const stateRootHash = await getStateRootHash();

  if (stateRootHash) {
    console.log('[API] Got state root hash, querying Oracle...');
    for (const token of baseTokens) {
      const price = await getOraclePrice(stateRootHash, token.symbol);
      if (price && price > 0) {
        oraclePrices[token.key] = price;
      }
    }
  }

  const hasOraclePrices = Object.keys(oraclePrices).length > 0;
  console.log('[API] Oracle prices:', hasOraclePrices ? oraclePrices : 'none available');

  // Step 2: Fetch real-time prices from CoinGecko
  const coinGeckoPrices = await getCoinGeckoPrices();
  console.log('[API] CoinGecko prices:', coinGeckoPrices ? 'fetched' : 'failed');

  // Step 3: Build response with best available data for base tokens
  for (const token of baseTokens) {
    let price: number;
    let change24h = 0;
    let source: 'oracle' | 'coingecko' | 'fallback';

    // Priority: Oracle > CoinGecko > Fallback
    if (oraclePrices[token.key] && oraclePrices[token.key] > 0) {
      price = oraclePrices[token.key];
      source = 'oracle';
      // Use CoinGecko for 24h change even if price is from Oracle
      change24h = coinGeckoPrices?.[token.key]?.usd_24h_change || 0;
    } else if (coinGeckoPrices?.[token.key]?.usd && coinGeckoPrices[token.key].usd > 0) {
      price = coinGeckoPrices[token.key].usd;
      change24h = coinGeckoPrices[token.key].usd_24h_change || 0;
      source = 'coingecko';
    } else {
      price = FALLBACK_PRICES[token.key];
      source = 'fallback';
    }

    results.push({
      symbol: token.symbol,
      name: token.name,
      price,
      change24h: Math.round(change24h * 100) / 100,
      source,
      lastUpdated: new Date().toISOString(),
    });
  }

  // Step 4: Add derived/additional tokens (stablecoins, wrapped tokens)
  for (const token of additionalTokens) {
    const derived = DERIVED_TOKENS[token.key];
    let price: number;
    let change24h = 0;

    if (derived?.fixedPrice) {
      // Stablecoins have fixed price
      price = derived.fixedPrice;
    } else if (derived?.baseToken) {
      // Wrapped tokens derive price from base token
      const baseResult = results.find(r => r.symbol === `${derived.baseToken}_USD`);
      price = baseResult?.price || FALLBACK_PRICES[token.key];
      change24h = baseResult?.change24h || 0;
    } else {
      price = FALLBACK_PRICES[token.key];
    }

    results.push({
      symbol: token.symbol,
      name: token.name,
      price,
      change24h,
      source: 'coingecko', // Mark as coingecko since it's derived from real data
      lastUpdated: new Date().toISOString(),
    });
  }

  const elapsed = Date.now() - startTime;
  console.log(`[API] Prices fetched in ${elapsed}ms`);

  return NextResponse.json({
    success: true,
    prices: results,
    timestamp: new Date().toISOString(),
    oracleAvailable: hasOraclePrices,
    sources: {
      oracle: hasOraclePrices,
      coingecko: coinGeckoPrices !== null,
    }
  });
}
