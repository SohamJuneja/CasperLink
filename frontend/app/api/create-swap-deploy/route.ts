import { NextRequest, NextResponse } from 'next/server';
import {
  SessionBuilder,
  Args,
  PublicKey,
  Key,
  Hash,
  CLTypeUInt8,
  CLValue,
  CLTypeKey
} from 'casper-js-sdk-v5';
import { PROXY_CALLER_WASM_BASE64 } from './proxyCallerWasm';

// CSPR.trade config
const ROUTER_PACKAGE_HASH = '04a11a367e708c52557930c4e9c1301f4465100d1b1b6d0a62b48d3e32402867';
const WCSPR_ADDRESS = 'hash-3d80df21ba4ee4d66a2a1f60c32570dd5685e4b279f6538162a5fd1314847c1e';
const WUSDC_ADDRESS = 'hash-073024d1112dd970cc75b797952a70f71efe3a8a69af152e8fbe8ef434823396';

/**
 * API Route: Create CSPR.trade swap deploy
 *
 * Creates a deploy for swap_exact_cspr_for_tokens on CSPR.trade using SDK v5.x
 * This matches the format that CSPR.click expects
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
    const senderPublicKey = PublicKey.fromHex(publicKey);

    // Calculate minimum output with slippage
    const estimatedOutputPerCSPR = BigInt(4000);
    const csprInMotes = BigInt(cspr_amount);
    const estimatedOutput = (csprInMotes * estimatedOutputPerCSPR) / BigInt(1e9);
    const minOutput = (estimatedOutput * BigInt(5)) / BigInt(100);
    const epochPlus10Min = Date.now() + 10 * 60 * 1000;

    // Create CLKey values using SDK v5.x API
    const wcsprKey = Key.newKey(WCSPR_ADDRESS);
    const wcsprClKey = CLValue.newCLKey(wcsprKey);

    const wusdcKey = Key.newKey(WUSDC_ADDRESS);
    const wusdcClKey = CLValue.newCLKey(wusdcKey);

    // Create recipient key
    const accountHash = senderPublicKey.accountHash().toHex();
    const recipientKey = Key.newKey(`account-hash-${accountHash}`);
    const recipientClKey = CLValue.newCLKey(recipientKey);

    // Build swap args using SDK v5.x pattern
    const odraArgs = Args.fromMap({
      amount_out_min: CLValue.newCLUInt256(minOutput.toString()),
      path: CLValue.newCLList(CLTypeKey, [wcsprClKey, wusdcClKey]),
      to: recipientClKey,
      deadline: CLValue.newCLUint64(epochPlus10Min),
    });

    // Decode base64 wasm
    const contractWasm = new Uint8Array(Buffer.from(PROXY_CALLER_WASM_BASE64, 'base64'));
    console.log('[API] Wasm loaded from embedded base64, size:', contractWasm.length);

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
      .wasm(contractWasm)
      .payment(15000000000) // 15 CSPR for gas
      .chainName('casper-test')
      .build();

    // CRITICAL: Use .toJSON() to convert to format CSPR.click expects
    const deployJson = JSON.stringify(sessionTransaction.toJSON());

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
