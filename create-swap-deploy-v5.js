/**
 * Standalone script to create CSPR.trade swap deploy using casper-js-sdk v5.x
 * Following David's guidance and donation-demo example
 *
 * Usage: node create-swap-deploy-v5.js <publicKey> <cspr_amount> <slippage_percent>
 */

const {
  SessionBuilder,
  Args,
  PublicKey,
  Key,
  Hash,
  CLTypeUInt8,
  CLValue,
  CLTypeKey
} = require("casper-js-sdk");
const fs = require('fs');
const path = require('path');

// Get args from command line
const [,, publicKey, cspr_amount, slippage_percent = 5] = process.argv;

if (!publicKey || !cspr_amount) {
  console.error(JSON.stringify({ error: 'Missing required arguments: publicKey, cspr_amount' }));
  process.exit(1);
}

async function createSwapDeploy() {
  try {
    // CSPR.trade config
    const ROUTER_PACKAGE_HASH = '04a11a367e708c52557930c4e9c1301f4465100d1b1b6d0a62b48d3e32402867';
    const WCSPR_ADDRESS = 'hash-3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e';
    const WUSDC_ADDRESS = 'hash-073024d1112dd970cc75b797952a70f71efe3a8a69af152e8fbe8ef434823396';

    // Parse sender public key first (needed for recipient)
    const senderPublicKey = PublicKey.fromHex(publicKey);

    // Calculate minimum output with slippage
    // NOTE: Without knowing the exact WCSPR/WUSDC exchange rate, we use a rough estimate
    // Based on David's transaction: 30 CSPR → 0.13721 WUSDC (6 decimals)
    // Approximate rate: 1 CSPR ≈ 0.00457 WUSDC = 4570 WUSDC base units
    // We'll use a conservative estimate and apply 95% slippage protection (very loose)
    const estimatedOutputPerCSPR = BigInt(4000); // Conservative estimate: 4000 WUSDC base units per CSPR
    const csprInMotes = BigInt(cspr_amount);
    const estimatedOutput = (csprInMotes * estimatedOutputPerCSPR) / BigInt(1e9); // Convert from motes to CSPR
    const minOutput = (estimatedOutput * BigInt(5)) / BigInt(100); // Accept as low as 5% of estimated (95% slippage)
    const epochPlus10Min = Date.now() + 10 * 60 * 1000;

    // Create CLKey values using David's exact pattern (v5.x API)
    const wcsprKey = Key.newKey(WCSPR_ADDRESS);
    const wcsprClKey = CLValue.newCLKey(wcsprKey);

    const wusdcKey = Key.newKey(WUSDC_ADDRESS);
    const wusdcClKey = CLValue.newCLKey(wusdcKey);

    // Create recipient key - need to convert public key to account-hash format
    const accountHash = senderPublicKey.accountHash().toHex();
    const recipientKey = Key.newKey(`account-hash-${accountHash}`);
    const recipientClKey = CLValue.newCLKey(recipientKey);

    // Build swap args using David's exact pattern
    const odraArgs = Args.fromMap({
      amount_out_min: CLValue.newCLUInt256(minOutput.toString()),
      path: CLValue.newCLList(CLTypeKey, [wcsprClKey, wusdcClKey]),
      to: recipientClKey,
      deadline: CLValue.newCLUint64(epochPlus10Min),
    });

    // Load proxy_caller.wasm
    const proxyWasmPath = path.join(__dirname, 'proxy_caller.wasm');
    const contractWasm = fs.readFileSync(proxyWasmPath);

    // Serialize swap args as List<U8>
    const serialized_args = CLValue.newCLList(
      CLTypeUInt8,
      Array.from(odraArgs.toBytes()).map(value => CLValue.newCLUint8(value))
    );

    // Build proxy args
    const args = Args.fromMap({
      amount: CLValue.newCLUInt512(cspr_amount),
      attached_value: CLValue.newCLUInt512(cspr_amount),
      entry_point: CLValue.newCLString("swap_exact_cspr_for_tokens"),
      package_hash: CLValue.newCLByteArray(Hash.fromHex(ROUTER_PACKAGE_HASH).toBytes()),
      args: serialized_args,
    });

    // Create session transaction using SessionBuilder (v5.x)
    const sessionTransaction = new SessionBuilder()
      .from(senderPublicKey)
      .runtimeArgs(args)
      .wasm(new Uint8Array(contractWasm))
      .payment(15000000000) // 15 CSPR for gas
      .chainName('casper-test')
      .build();

    // CRITICAL: Use .toJSON() to convert to format CSPR.click expects
    const deployJson = JSON.stringify(sessionTransaction.toJSON());

    console.log(JSON.stringify({
      success: true,
      deployJson: deployJson,
      details: {
        cspr_amount,
        estimated_output: estimatedOutput.toString(),
        min_output: minOutput.toString(),
        slippage_tolerance: '95%',
        deadline: epochPlus10Min,
        deploySize: deployJson.length,
        note: 'Using conservative estimate for amount_out_min. In production, query router.get_amounts_out() for accurate pricing.'
      }
    }));

  } catch (error) {
    console.error(JSON.stringify({
      error: error.message || 'Failed to create deploy',
      stack: error.stack
    }));
    process.exit(1);
  }
}

createSwapDeploy();
