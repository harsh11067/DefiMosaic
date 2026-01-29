import { NextResponse } from 'next/server';
import { fetchPredictionsFromContract } from '@/lib/predictionReader';

import { getSupabaseServer } from '@/lib/supabaseServer';

interface PredictionNode {
  id: number;
  parentId: number;
  creator: string;
  collateral: string;
  loanAmount: string;
  targetPrice: string;
  deadline: number;
  status: 'active' | 'resolved' | 'liquidated';
  leverageBps: number;
  createdAt: string;
  outcome?: boolean;
  health?: number;
  children?: PredictionNode[];
}

// Recursively build tree structure
function buildTree(nodes: any[], parentId: number = 0): PredictionNode[] {
  return nodes
    .filter(node => Number(node.parent_id || 0) === parentId)
    .map(node => ({
      id: Number(node.id),
      parentId: Number(node.parent_id || 0), // Normalize: ensure 0 for roots
      creator: node.creator || '',
      collateral: node.collateral?.toString() || '0',
      loanAmount: node.loan_amount?.toString() || '0',
      targetPrice: node.price_target?.toString() || '0',
      deadline: Number(node.deadline || 0),
      status: node.liquidated ? 'liquidated' : node.resolved ? 'resolved' : 'active',
      leverageBps: Number(node.leverage_bps || 0),
      createdAt: node.created_at || new Date().toISOString(),
      outcome: node.outcome ?? undefined,
      health: node.health ? Number(node.health) : undefined,
      children: buildTree(nodes, Number(node.id))
    }));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const creator = searchParams.get('creator');

    if (!creator) {
      return NextResponse.json(
        { ok: false, error: 'Missing creator parameter' },
        { status: 400 }
      );
    }

    // Try indexer API first (only if explicitly configured and not disabled)
    const indexerUrl = process.env.NEXT_PUBLIC_INDEXER_URL;
    if (indexerUrl && indexerUrl !== 'disabled' && indexerUrl.startsWith('http')) {
      try {
        // Get all predictions for creator
        const res = await fetch(`${indexerUrl}/predictions/creator/${creator}`, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });

        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.predictions) {
            // Build tree structure
            const tree = buildTree(data.predictions);

            return NextResponse.json({
              ok: true,
              trees: tree, // Array of root trees
              totalNodes: data.predictions.length
            });
          }
        }
      } catch (indexerError) {
        console.log('Indexer not available, trying Supabase...');
      }
    } else {

    }

    // Fallback: Try Supabase if available
    // Fallback: read directly from contract
    const predictions = await fetchPredictionsFromContract(creator);

    if (predictions.length > 0) {
      //const tree = buildTree(predictions);
      // sort newest first
      predictions.sort((a, b) => b.id - a.id);

      // take only latest 5 roots
      const latest = predictions.slice(0, 10);

      const tree = buildTree(latest);

      return NextResponse.json({
        ok: true,
        trees: tree,
        totalNodes: predictions.length
      });
    }

    /*
    const supabase = getSupabaseServer();
    if (supabase) {
      try {
        const { data: predictions, error } = await supabase
          .from('predictions')
          .select('*')
          .eq('creator', creator.toLowerCase())
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Supabase error:', error);
          // If table doesn't exist, return empty but indicate fallback should be used
          if (error.code === 'PGRST205' || error.message?.includes('schema cache')) {
            return NextResponse.json({
              ok: false,
              trees: [],
              totalNodes: 0,
              fallback: true,
              message: 'Supabase table not found. Use contract fallback.'
            });
          }
        } else if (predictions && predictions.length > 0) {
          const tree = buildTree(predictions);
          return NextResponse.json({
            ok: true,
            trees: tree,
            totalNodes: predictions.length
          });
        }
      } catch (supabaseError: any) {
        const errorMsg = supabaseError?.message || String(supabaseError);
        // Detect DNS/network errors and return fallback immediately
        if (errorMsg.includes('ENOTFOUND') || errorMsg.includes('fetch failed') || errorMsg.includes('ECONNREFUSED')) {
          console.warn('Supabase unreachable (DNS/network issue), using contract fallback');
          return NextResponse.json({
            ok: false,
            trees: [],
            totalNodes: 0,
            fallback: true,
            message: 'Supabase unreachable. Use contract fallback.'
          });
        }
        console.error('Supabase query error:', supabaseError);
        // Return fallback flag for any error
        return NextResponse.json({
          ok: false,
          trees: [],
          totalNodes: 0,
          fallback: true,
          message: 'Supabase query failed. Use contract fallback.'
        });
      }
    }
    */

    // If no data source available, return empty with fallback flag
    return NextResponse.json({
      ok: false,
      trees: [],
      totalNodes: 0,
      fallback: true,
      message: 'No data source available. Use contract fallback.'
    });
  } catch (error: any) {
    console.error('Tree fetch error:', error);
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to fetch prediction tree' },
      { status: 500 }
    );
  }
}

