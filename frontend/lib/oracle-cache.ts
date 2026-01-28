/**
 * In-memory cache for Oracle prices that were submitted on-chain.
 * Updated by /api/update-oracle, read by /api/prices.
 *
 * Uses globalThis to persist across Next.js module reloads in dev mode,
 * ensuring both API routes share the same cache instance.
 */

export interface OracleCacheEntry {
  price: number;
  priceInMotes: string;
  deployHash: string;
  timestamp: string; // ISO string
}

// Use globalThis to share state across Next.js API route module instances
const globalKey = '__oracle_price_cache__' as const;

function getCache(): Record<string, OracleCacheEntry> {
  if (!(globalThis as Record<string, unknown>)[globalKey]) {
    (globalThis as Record<string, unknown>)[globalKey] = {};
  }
  return (globalThis as Record<string, unknown>)[globalKey] as Record<string, OracleCacheEntry>;
}

export function setOraclePrice(feed: string, entry: OracleCacheEntry) {
  getCache()[feed] = entry;
}

export function getOraclePrice(feed: string): OracleCacheEntry | null {
  return getCache()[feed] || null;
}

export function getAllOraclePrices(): Record<string, OracleCacheEntry> {
  return { ...getCache() };
}

export function hasOraclePrices(): boolean {
  return Object.keys(getCache()).length > 0;
}
