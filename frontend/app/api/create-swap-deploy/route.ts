import { NextRequest, NextResponse } from 'next/server';
import {
  CLPublicKey,
  DeployUtil,
  RuntimeArgs,
  CLValueBuilder,
  CLList,
  CLU8
} from 'casper-js-sdk';
import { PROXY_CALLER_WASM_BASE64 } from './proxyCallerWasm';

// CSPR.trade config
const ROUTER_PACKAGE_HASH = '04a11a367e708c52557930c4e9c1301f4465100d1b1b6d0a62b48d3e32402867';
const WCSPR_ADDRESS = '3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e';
const WUSDC_ADDRESS = '073024d1112dd970cc75b797952a70f71efe3a8a69af152e8fbe8ef434823396';

/**
 * API Route: Create CSPR.trade swap deploy
 *
 * Creates a deploy for swap_exact_cspr_for_tokens on CSPR.trade using SDK v2.15.5
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publicKey, cspr_amount } = body;

    if (!publicKey || !cspr_amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: publicKey, cspr_amount' },
        { status: 400 }
      );
    }

    console.log('[API] Creating swap deploy for:', { publicKey, cspr_amount });

    // Parse sender public key
    const senderPublicKey = CLPublicKey.fromHex(publicKey);

    // Calculate minimum output with slippage
    // Based on approximate rate: 1 CSPR ≈ 0.004 WUSDC (very conservative)
    const estimatedOutputPerCSPR = BigInt(4000); // WUSDC base units per CSPR
    const csprInMotes = BigInt(cspr_amount);
    const estimatedOutput = (csprInMotes * estimatedOutputPerCSPR) / BigInt(1e9);
    const minOutput = (estimatedOutput * BigInt(5)) / BigInt(100); // 5% of estimated (95% slippage tolerance)
    const epochPlus10Min = Date.now() + 10 * 60 * 1000;

    // Create Key types with Hash variant (0x01 prefix + 32 bytes)
    const wcsprKeyBytes = new Uint8Array(33);
    wcsprKeyBytes[0] = 1; // Hash variant
    wcsprKeyBytes.set(Uint8Array.from(Buffer.from(WCSPR_ADDRESS, 'hex')), 1);

    const wusdcKeyBytes = new Uint8Array(33);
    wusdcKeyBytes[0] = 1; // Hash variant
    wusdcKeyBytes.set(Uint8Array.from(Buffer.from(WUSDC_ADDRESS, 'hex')), 1);

    // Create recipient key (account-hash format)
    const accountHash = senderPublicKey.toAccountHashStr().replace('account-hash-', '');
    const recipientKeyBytes = new Uint8Array(33);
    recipientKeyBytes[0] = 0; // Account variant
    recipientKeyBytes.set(Uint8Array.from(Buffer.from(accountHash, 'hex')), 1);

    // Build the inner swap args that will be serialized
    const swapArgs = RuntimeArgs.fromMap({
      amount_out_min: CLValueBuilder.u256(minOutput.toString()),
      path: new CLList([
        CLValueBuilder.byteArray(wcsprKeyBytes),
        CLValueBuilder.byteArray(wusdcKeyBytes)
      ]),
      to: CLValueBuilder.byteArray(recipientKeyBytes),
      deadline: CLValueBuilder.u64(epochPlus10Min),
    });

    // Serialize swap args to bytes
    const serializedSwapArgs = swapArgs.toBytes().unwrap();

    // Convert to CLList of U8
    const argsAsList = new CLList(
      Array.from(serializedSwapArgs).map(b => new CLU8(b))
    );

    // Build proxy caller args
    const args = RuntimeArgs.fromMap({
      amount: CLValueBuilder.u512(cspr_amount),
      attached_value: CLValueBuilder.u512(cspr_amount),
      entry_point: CLValueBuilder.string("swap_exact_cspr_for_tokens"),
      package_hash: CLValueBuilder.byteArray(Uint8Array.from(Buffer.from(ROUTER_PACKAGE_HASH, 'hex'))),
      args: argsAsList,
    });

    // Decode base64 wasm (embedded for Vercel compatibility)
    const contractWasm = new Uint8Array(Buffer.from(PROXY_CALLER_WASM_BASE64, 'base64'));
    console.log('[API] Wasm loaded from embedded base64, size:', contractWasm.length);

    // Create deploy params
    const deployParams = new DeployUtil.DeployParams(senderPublicKey, 'casper-test');

    // Create module bytes session
    const session = DeployUtil.ExecutableDeployItem.newModuleBytes(contractWasm, args);

    // Create payment (15 CSPR for gas)
    const payment = DeployUtil.standardPayment('15000000000');

    // Build the deploy
    const deploy = DeployUtil.makeDeploy(deployParams, session, payment);

    // Convert to JSON
    const deployJson = JSON.stringify(DeployUtil.deployToJson(deploy).deploy);

    console.log('[API] Deploy created, size:', deployJson.length);

    return NextResponse.json({
      success: true,
      deployJson: deployJson,
      details: {
        cspr_amount,
        estimated_output: estimatedOutput.toString(),
        min_output: minOutput.toString(),
        slippage_tolerance: '95%',
        deadline: epochPlus10Min,
        deploySize: deployJson.length
      }
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : '';
    console.error('[API] Error creating swap deploy:', message, stack);
    return NextResponse.json(
      { error: message, stack },
      { status: 500 }
    );
  }
}
