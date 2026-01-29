import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getSupabaseServer } from '@/lib/supabaseServer';

// Helper to recover signer from signature and message
function recoverAddress(message: string, signature: string): string {
  try {
    const msgBytes = ethers.toUtf8Bytes(message);
    const prefixed = ethers.hashMessage(msgBytes); // EIP-191
    return ethers.recoverAddress(prefixed, signature);
  } catch (error) {
    throw new Error('Invalid signature');
  }
}


export async function POST(req: Request) {
  try {
    const supabase = getSupabaseServer();

    if (!supabase) {
      return NextResponse.json({ ok: false, error: 'Supabase client configuration failed. Check server logs.' }, { status: 500 });
    }

    const body = await req.json();
    const { strategyId, message, signature, nonce } = body;

    if (!strategyId || !message || !signature) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Reconstruct message that user signed
    const verifiedMsg = `DefiMosaic Chat Auth\nstrategy:${strategyId}\nnonce:${nonce}`;
    const signer = recoverAddress(verifiedMsg, signature);

    // Verify signer is follower (simplified - check if they have a position)
    // In production, check StrategyRegistry or vault balance
    try {
      const RPC = process.env.RPC_URL;
      const STRATEGY_REGISTRY_ADDR = process.env.NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS;

      if (RPC && STRATEGY_REGISTRY_ADDR) {
        const provider = new ethers.JsonRpcProvider(RPC);
        // Simplified check - in production, verify through contract
        // For now, allow if signature is valid
      }
    } catch (verifyError) {
      console.warn('Follower verification skipped:', verifyError);
      // Continue anyway for development
    }

    // Check if table exists, if not provide helpful error
    const { data: tableCheck } = await supabase
      .from('strategy_messages')
      .select('id')
      .limit(1);

    // If table doesn't exist, tableCheck will be null and error will indicate missing table
    // Try to insert anyway - Supabase will give a clear error

    // Insert message into Supabase
    const { data, error } = await supabase
      .from('strategy_messages')
      .insert({
        strategy_id: strategyId,
        user_address: signer.toLowerCase(),
        message: message,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);

      // Provide helpful error message if table doesn't exist
      if (error.message?.includes('does not exist') || error.message?.includes('schema cache')) {
        return NextResponse.json(
          {
            ok: false,
            error: `Table 'strategy_messages' does not exist. Please run the SQL migration in Supabase Dashboard. See web/supabase_migration.sql`,
            migrationNeeded: true
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { ok: false, error: `Failed to save message: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Chat send error:', err);
    return NextResponse.json(
      { ok: false, error: (err as Error).message || 'Internal server error' },
      { status: 500 }
    );
  }
}
