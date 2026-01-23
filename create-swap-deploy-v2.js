/**
 * Standalone script to create CSPR.trade swap deploy using v2.15.5 SDK API
 *
 * Usage: node create-swap-deploy-v2.js <publicKey> <cspr_amount> <slippage_percent>
 */

const {
  CLPublicKey,
  DeployUtil,
  RuntimeArgs,
  CLValueBuilder,
  CLByteArray,
  CLKey
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
    const ROUTER_PACKAGE_HASH = 'hash-04a11a367e708c52557930c4e9c1301f4465100d1b1b6d0a62b48d3e32402867';
    const WCSPR_ADDRESS = 'hash-3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e';
    const WUSDC_ADDRESS = 'hash-073024d1112dd970cc75b797952a70f71efe3a8a69af152e8fbe8ef434823396';
    const CHAIN_NAME = 'casper-test';

    // Calculate minimum output with slippage
    const estimatedOutput = BigInt(cspr_amount) / BigInt(200);
    const minOutput = (estimatedOutput * BigInt(100 - Number(slippage_percent))) / BigInt(100);
    const epochPlus10Min = Date.now() + 10 * 60 * 1000;

    const wcsprHash = WCSPR_ADDRESS.replace('hash-', '');
    const wusdcHash = WUSDC_ADDRESS.replace('hash-', '');
    const routerHash = ROUTER_PACKAGE_HASH.replace('hash-', '');

    // Create Key bytes: 1 byte variant + 32 bytes hash
    const wcsprKeyBytes = new Uint8Array(33);
    wcsprKeyBytes[0] = 0x01; // Hash variant
    wcsprKeyBytes.set(Buffer.from(wcsprHash, 'hex'), 1);

    const wusdcKeyBytes = new Uint8Array(33);
    wusdcKeyBytes[0] = 0x01; // Hash variant
    wusdcKeyBytes.set(Buffer.from(wusdcHash, 'hex'), 1);

    const senderPublicKey = CLPublicKey.fromHex(publicKey.toLowerCase());

    // Create recipient key (Account variant)
    const recipientKeyBytes = new Uint8Array(33);
    recipientKeyBytes[0] = 0x02; // Account variant
    recipientKeyBytes.set(senderPublicKey.toAccountHash(), 1);

    // Build swap args
    const odraArgs = RuntimeArgs.fromMap({
      amount_out_min: CLValueBuilder.u256(minOutput.toString()),
      path: CLValueBuilder.list([
        new CLKey(new CLByteArray(wcsprKeyBytes)),
        new CLKey(new CLByteArray(wusdcKeyBytes))
      ]),
      to: new CLKey(new CLByteArray(recipientKeyBytes)),
      deadline: CLValueBuilder.u64(epochPlus10Min),
    });

    // Load proxy_caller.wasm
    const proxyWasmPath = path.join(__dirname, 'proxy_caller.wasm');
    const contractWasm = fs.readFileSync(proxyWasmPath);
    const proxyWasm = new Uint8Array(contractWasm);

    // Serialize swap args as List<U8>
    const swapArgsBytesArray = Array.from(odraArgs.toBytes());
    const serializedSwapArgs = CLValueBuilder.list(
      swapArgsBytesArray.map(b => CLValueBuilder.u8(b))
    );

    // Build proxy args
    const proxyArgs = RuntimeArgs.fromMap({
      amount: CLValueBuilder.u512(cspr_amount),
      attached_value: CLValueBuilder.u512(cspr_amount),
      entry_point: CLValueBuilder.string('swap_exact_cspr_for_tokens'),
      package_hash: CLValueBuilder.byteArray(Buffer.from(routerHash, 'hex')),
      args: serializedSwapArgs,
    });

    // Create deploy
    const deployParams = new DeployUtil.DeployParams(senderPublicKey, CHAIN_NAME);
    const session = DeployUtil.ExecutableDeployItem.newModuleBytes(proxyWasm, proxyArgs);
    const payment = DeployUtil.standardPayment('15000000000'); // 15 CSPR for gas
    const deploy = DeployUtil.makeDeploy(deployParams, session, payment);
    const deployJson = DeployUtil.deployToJson(deploy).deploy;

    // Output the deploy JSON
    const deployJsonString = JSON.stringify(deployJson);

    console.log(JSON.stringify({
      success: true,
      deployJson: deployJsonString,
      details: {
        cspr_amount,
        estimated_output: estimatedOutput.toString(),
        min_output: minOutput.toString(),
        slippage_percent,
        deadline: epochPlus10Min,
        deploySize: deployJsonString.length
      }
    }));

  } catch (error) {
    console.error(JSON.stringify({ error: error.message || 'Failed to create deploy', stack: error.stack }));
    process.exit(1);
  }
}

createSwapDeploy();
