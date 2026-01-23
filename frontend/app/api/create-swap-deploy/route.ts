import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

/**
 * API Route: Create CSPR.trade swap deploy
 *
 * This endpoint calls a Node.js script that uses David's exact SDK version and pattern
 * to create a properly formatted deploy for swap_exact_cspr_for_tokens.
 *
 * The frontend calls this endpoint to get a deploy JSON that CSPR.click wallet will accept.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { publicKey, cspr_amount, slippage_percent = 5 } = body;

    if (!publicKey || !cspr_amount) {
      return NextResponse.json(
        { error: 'Missing required parameters: publicKey, cspr_amount' },
        { status: 400 }
      );
    }

    // Call the Node.js script in the root casperlink folder (using SDK v5.x)
    const scriptPath = path.join(process.cwd(), '..', 'create-swap-deploy-v5.js');
    const command = `node "${scriptPath}" "${publicKey}" "${cspr_amount}" "${slippage_percent}"`;

    console.log('[API] Calling script:', command);

    const { stdout, stderr } = await execAsync(command);

    if (stderr) {
      console.error('[API] Script stderr:', stderr);
    }

    console.log('[API] Script stdout:', stdout);

    // Parse the JSON output from the script
    const result = JSON.parse(stdout);

    if (!result.success) {
      throw new Error(result.error || 'Script failed');
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('[API] Error creating swap deploy:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create deploy' },
      { status: 500 }
    );
  }
}
