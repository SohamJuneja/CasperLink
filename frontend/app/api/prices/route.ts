import { NextResponse } from 'next/server';
import { getAllOraclePrices, hasOraclePrices as checkOracleCache } from '@/lib/oracle-cache';

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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

// Oracle-supported feeds (BTC, ETH, CSPR are on-chain via /api/update-oracle)
const ORACLE_FEEDS = ['BTC_USD', 'ETH_USD', 'CSPR_USD'];

// Get real-time prices from CoinGecko (with caching to avoid rate limits)
async function getCoinGeckoPrices(): Promise<Record<string, { usd: number; usd_24h_change: number }> | null> {
  const now = Date.now();
  if (priceCache.data && (now - priceCache.timestamp) < CACHE_TTL) {
    console.log('[API] Using cached CoinGecko prices');
    return priceCache.data;
  }

  try {
    const geckoIds = 'bitcoin,ethereum,casper-network,chainlink,usd-coin,tether,wrapped-bitcoin,weth';
    const response = await fetch(
      `${COINGECKO_API}?ids=${geckoIds}&vs_currencies=usd&include_24hr_change=true`,
      {
        signal: AbortSignal.timeout(5000),
        headers: { 'Accept': 'application/json' },
      }
    );

    if (!response.ok) {
      if (response.status === 429 && priceCache.data) {
        console.log('[API] Rate limited, using cached prices');
        return priceCache.data;
      }
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const geckoMap: Record<string, string> = {
      BTC: 'bitcoin', ETH: 'ethereum', CSPR: 'casper-network',
      LINK: 'chainlink', USDC: 'usd-coin', USDT: 'tether',
      WBTC: 'wrapped-bitcoin', WETH: 'weth',
    };
    const prices: Record<string, { usd: number; usd_24h_change: number }> = {};
    for (const [key, geckoId] of Object.entries(geckoMap)) {
      prices[key] = {
        usd: data[geckoId]?.usd || 0,
        usd_24h_change: data[geckoId]?.usd_24h_change || 0,
      };
    }

    priceCache = { data: prices, timestamp: now };
    return prices;
  } catch (error) {
    console.error('[API] Failed to fetch CoinGecko prices:', error);
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

  const allTokens = [
    { symbol: 'BTC_USD', name: 'Bitcoin', key: 'BTC' },
    { symbol: 'ETH_USD', name: 'Ethereum', key: 'ETH' },
    { symbol: 'CSPR_USD', name: 'Casper', key: 'CSPR' },
    { symbol: 'LINK_USD', name: 'Chainlink', key: 'LINK' },
    { symbol: 'USDC_USD', name: 'USD Coin', key: 'USDC' },
    { symbol: 'USDT_USD', name: 'Tether', key: 'USDT' },
    { symbol: 'WBTC_USD', name: 'Wrapped Bitcoin', key: 'WBTC' },
    { symbol: 'WETH_USD', name: 'Wrapped Ether', key: 'WETH' },
  ];

  // Step 1: Read on-chain prices from oracle cache (set by /api/update-oracle)
  const oracleCache = getAllOraclePrices();
  const oraclePrices: Record<string, number> = {};
  for (const [feed, entry] of Object.entries(oracleCache)) {
    const key = feed.replace('_USD', '');
    oraclePrices[key] = entry.price;
  }
  const hasOracle = checkOracleCache();
  console.log('[API] Oracle cache:', hasOracle ? oraclePrices : 'empty (run /api/update-oracle first)');

  // Step 2: Fetch real-time prices from CoinGecko
  const coinGeckoPrices = await getCoinGeckoPrices();
  console.log('[API] CoinGecko prices:', coinGeckoPrices ? 'fetched' : 'failed');

  // Step 3: Build response — Priority: Oracle > CoinGecko > Fallback
  for (const token of allTokens) {
    let price: number;
    let change24h = 0;
    let source: 'oracle' | 'coingecko' | 'fallback';

    const isOracleFeed = ORACLE_FEEDS.includes(token.symbol);

    if (isOracleFeed && oraclePrices[token.key] && oraclePrices[token.key] > 0) {
      // On-chain Oracle price (BTC, ETH, CSPR)
      price = oraclePrices[token.key];
      source = 'oracle';
      change24h = coinGeckoPrices?.[token.key]?.usd_24h_change || 0;
    } else if (coinGeckoPrices?.[token.key]?.usd && coinGeckoPrices[token.key].usd > 0) {
      price = coinGeckoPrices[token.key].usd;
      change24h = coinGeckoPrices[token.key].usd_24h_change || 0;
      source = 'coingecko';
    } else {
      price = FALLBACK_PRICES[token.key] || 0;
      source = 'fallback';
    }

    results.push({
      symbol: token.symbol,
      name: token.name,
      price,
      change24h: Math.round(change24h * 100) / 100,
      source,
      lastUpdated: oracleCache[token.symbol]?.timestamp || new Date().toISOString(),
    });
  }

  const elapsed = Date.now() - startTime;
  console.log(`[API] Prices fetched in ${elapsed}ms`);

  return NextResponse.json({
    success: true,
    prices: results,
    timestamp: new Date().toISOString(),
    oracleAvailable: hasOracle,
    sources: {
      oracle: hasOracle,
      coingecko: coinGeckoPrices !== null,
    }
  });
}
