import { NextResponse } from 'next/server';
import {
  DeployUtil,
  RuntimeArgs,
  CLValueBuilder,
  Keys,
} from 'casper-js-sdk';
import { setOraclePrice } from '@/lib/oracle-cache';

// Disable caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Oracle contract config
const ORACLE_PACKAGE_HASH = 'c558b459ba4e9d8a379bcef9629660d8cf9c34fa6e9c1165324959e433bc22ac';
const CHAIN_NAME = 'casper-test';
const RPC_URL = 'https://node.testnet.casper.network/rpc';

// CoinGecko API
const COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/price';

// Price feeds to update on-chain (Oracle contract supports these 3)
const PRICE_FEEDS = [
  { feed: 'BTC_USD', geckoId: 'bitcoin' },
  { feed: 'ETH_USD', geckoId: 'ethereum' },
  { feed: 'CSPR_USD', geckoId: 'casper-network' },
];

// Simple auth token to protect the endpoint
const CRON_SECRET = process.env.CRON_SECRET || '';

interface UpdateResult {
  feed: string;
  price: number;
  priceInMotes: string;
  deployHash?: string;
  error?: string;
}

/**
 * Load the owner's key pair from the PEM stored in env var.
 * The env var ORACLE_OWNER_SECRET_KEY should contain the full PEM content
 * (with -----BEGIN EC PRIVATE KEY----- headers).
 */
function loadOwnerKeyPair(): Keys.AsymmetricKey {
  const pemContent = process.env.ORACLE_OWNER_SECRET_KEY;
  if (!pemContent) {
    throw new Error('ORACLE_OWNER_SECRET_KEY environment variable not set');
  }

  // Step 1: Strip PEM headers and decode base64 to get DER bytes
  const privateKeyDerBytes = Keys.Secp256K1.readBase64WithPEM(pemContent);

  // Step 2: Parse the DER-encoded private key to get raw key bytes
  const privateKeyRaw = Keys.Secp256K1.parsePrivateKey(privateKeyDerBytes, 'der');

  // Step 3: Derive public key from private key
  const publicKeyRaw = Keys.Secp256K1.privateToPublicKey(privateKeyRaw);

  // Step 4: Create the key pair
  const keyPair = Keys.Secp256K1.parseKeyPair(publicKeyRaw, privateKeyRaw, 'raw');

  return keyPair;
}

/**
 * Fetch real-time prices from CoinGecko
 */
async function fetchCoinGeckoPrices(): Promise<Record<string, number>> {
  const ids = PRICE_FEEDS.map(p => p.geckoId).join(',');
  const response = await fetch(
    `${COINGECKO_API}?ids=${ids}&vs_currencies=usd`,
    {
      signal: AbortSignal.timeout(10000),
      headers: { 'Accept': 'application/json' },
    }
  );

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`);
  }

  const data = await response.json();
  const prices: Record<string, number> = {};

  for (const feed of PRICE_FEEDS) {
    const price = data[feed.geckoId]?.usd;
    if (price && price > 0) {
      prices[feed.feed] = price;
    }
  }

  return prices;
}

/**
 * Create, sign, and submit a submit_price deploy
 */
async function submitPriceDeploy(
  keyPair: Keys.AsymmetricKey,
  priceFeed: string,
  priceUSD: number
): Promise<string> {
  // Convert price to motes (8 decimals)
  const priceInMotes = Math.round(priceUSD * 100_000_000).toString();
  const timestamp = Math.floor(Date.now() / 1000);

  const deployParams = new DeployUtil.DeployParams(
    keyPair.publicKey,
    CHAIN_NAME
  );

  const args = RuntimeArgs.fromMap({
    price_feed: CLValueBuilder.string(priceFeed),
    price_value: CLValueBuilder.u512(priceInMotes),
    timestamp: CLValueBuilder.u64(timestamp),
  });

  const session = DeployUtil.ExecutableDeployItem.newStoredVersionContractByHash(
    Uint8Array.from(Buffer.from(ORACLE_PACKAGE_HASH, 'hex')),
    null, // latest version
    'submit_price',
    args
  );

  const payment = DeployUtil.standardPayment('2500000000'); // 2.5 CSPR (minimum allowed)

  const deploy = DeployUtil.makeDeploy(deployParams, session, payment);

  // Sign the deploy with the owner's key
  const signedDeploy = DeployUtil.signDeploy(deploy, keyPair);

  // Submit to the network via direct RPC call (avoids CasperClient node-fetch issues in Next.js)
  const deployJson = DeployUtil.deployToJson(signedDeploy);
  const rpcResponse = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'account_put_deploy',
      params: { deploy: deployJson.deploy },
      id: 1,
    }),
  });

  const rpcResult = await rpcResponse.json();
  if (rpcResult.error) {
    throw new Error(rpcResult.error.message || JSON.stringify(rpcResult.error));
  }

  return rpcResult.result.deploy_hash;
}

/**
 * GET /api/update-oracle
 *
 * Fetches latest prices from CoinGecko and submits them to the Oracle contract.
 * Protected by CRON_SECRET header for Vercel cron jobs.
 */
export async function GET(request: Request) {
  const startTime = Date.now();

  // Verify authorization (Vercel cron sends this header automatically)
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Step 1: Load owner key pair
    console.log('[Oracle Update] Loading owner key pair...');
    const keyPair = loadOwnerKeyPair();
    console.log('[Oracle Update] Owner public key:', keyPair.publicKey.toHex());

    // Step 2: Fetch CoinGecko prices
    console.log('[Oracle Update] Fetching CoinGecko prices...');
    const prices = await fetchCoinGeckoPrices();
    console.log('[Oracle Update] Prices:', prices);

    if (Object.keys(prices).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch any prices from CoinGecko',
      }, { status: 500 });
    }

    // Step 3: Submit each price to Oracle contract
    const results: UpdateResult[] = [];

    for (const feed of PRICE_FEEDS) {
      const price = prices[feed.feed];
      if (!price) {
        results.push({
          feed: feed.feed,
          price: 0,
          priceInMotes: '0',
          error: 'No price available from CoinGecko',
        });
        continue;
      }

      try {
        console.log(`[Oracle Update] Submitting ${feed.feed}: $${price}...`);
        const deployHash = await submitPriceDeploy(keyPair, feed.feed, price);
        console.log(`[Oracle Update] ${feed.feed} submitted: ${deployHash}`);

        const priceInMotes = Math.round(price * 100_000_000).toString();

        results.push({
          feed: feed.feed,
          price,
          priceInMotes,
          deployHash,
        });

        // Cache the price so /api/prices can read it
        setOraclePrice(feed.feed, {
          price,
          priceInMotes,
          deployHash,
          timestamp: new Date().toISOString(),
        });

        // Small delay between deploys to avoid nonce issues
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`[Oracle Update] Failed to submit ${feed.feed}:`, error);
        results.push({
          feed: feed.feed,
          price,
          priceInMotes: Math.round(price * 100_000_000).toString(),
          error: (error as Error).message,
        });
      }
    }

    const elapsed = Date.now() - startTime;
    const successful = results.filter(r => r.deployHash).length;

    console.log(`[Oracle Update] Done in ${elapsed}ms. ${successful}/${results.length} feeds updated.`);

    return NextResponse.json({
      success: successful > 0,
      updated: successful,
      total: results.length,
      results,
      elapsed: `${elapsed}ms`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Oracle Update] Error:', error);
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}
