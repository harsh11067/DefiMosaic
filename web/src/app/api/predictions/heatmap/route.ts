import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabaseServer';

interface HeatmapMetrics {
  [predictionId: string]: {
    realizedProfit: number;
    realizedLoss: number;
    riskScore: number;
    health?: number;
  };
}

export async function POST(req: Request) {
  try {
    const { backtestId, creator } = await req.json();

    if (!backtestId) {
      return NextResponse.json({ ok: false, error: 'Missing backtestId' }, { status: 400 });
    }

    // 1) Fetch prediction tree with health data
    let predictionHealthMap: { [id: string]: number } = {};

    try {
      // Try to get health from indexer API first (only if configured)
      const indexerUrl = process.env.NEXT_PUBLIC_INDEXER_URL;
      if (indexerUrl && indexerUrl !== 'disabled' && indexerUrl.startsWith('http')) {
        const treeRes = await fetch(`${indexerUrl}/predictions/tree?${creator ? `creator=${creator}` : ''}`, {
          signal: AbortSignal.timeout(3000) // 3 second timeout
        });

        if (treeRes.ok) {
          const treeData = await treeRes.json();
          if (treeData.ok && treeData.trees) {
            // Flatten tree to get all nodes with health
            const flattenTree = (nodes: any[]): any[] => {
              return nodes.flatMap(node => [node, ...(node.children ? flattenTree(node.children) : [])]);
            };

            const allNodes = flattenTree(treeData.trees);
            allNodes.forEach((node: any) => {
              if (node.health !== undefined) {
                predictionHealthMap[node.id.toString()] = node.health;
              }
            });
          }
        }
      }
    } catch (err) {
      console.warn('Failed to fetch prediction health from indexer:', err);
    }
    // Fallback: Try Supabase for health data
    if (Object.keys(predictionHealthMap).length === 0) {
      try {
        const supabase = getSupabaseServer();
        if (supabase && creator) {
          const { data: predictions } = await supabase
            .from('predictions')
            .select('id, health')
            .eq('creator', creator.toLowerCase());

          if (predictions) {
            predictions.forEach((p: any) => {
              if (p.health !== undefined) {
                predictionHealthMap[p.id.toString()] = p.health;
              }
            });
          }
        }
      } catch (err) {
        console.warn('Failed to fetch health from Supabase:', err);
      }
    }

    // 2) Fetch backtest data from file system or database
    let backtestMetrics: { [id: string]: { profit: number; loss: number } } = {};

    try {
      // Try to read from public/backtests directory
      const fs = await import('fs');
      const path = await import('path');

      const csvPath = path.join(process.cwd(), 'public', 'backtests', backtestId, 'trades.csv');

      if (fs.existsSync(csvPath)) {
        // Check if papaparse is available
        try {
          const Papa = (await import('papaparse')).default;
          const csvText = fs.readFileSync(csvPath, 'utf8');
          const parsed = Papa.parse(csvText, { header: true, dynamicTyping: true });

          parsed.data.forEach((row: any) => {
            const predId = String(row.prediction_id || row.predictionId || '');
            if (!predId || predId === 'unknown') return;

            if (!backtestMetrics[predId]) {
              backtestMetrics[predId] = { profit: 0, loss: 0 };
            }

            const pnl = Number(row.pnl || 0);
            if (pnl >= 0) {
              backtestMetrics[predId].profit += pnl;
            } else {
              backtestMetrics[predId].loss += Math.abs(pnl);
            }
          });
        } catch (parseError) {
          console.warn('Papaparse not available, skipping CSV parsing:', parseError);
        }
      }
    } catch (fsError) {
      console.warn('Could not read backtest CSV:', fsError);
    }

    // 3) Combine health + backtest metrics to compute risk scores
    const metrics: HeatmapMetrics = {};

    // Get all unique prediction IDs from both sources
    const allPredictionIds = new Set([
      ...Object.keys(predictionHealthMap),
      ...Object.keys(backtestMetrics)
    ]);

    allPredictionIds.forEach((predId) => {
      const health = predictionHealthMap[predId] || 150; // Default healthy
      const backtest = backtestMetrics[predId] || { profit: 0, loss: 0 };

      // Calculate backtest risk (0 to 1, where 1 is high risk)
      const totalPnL = backtest.profit + backtest.loss;
      const backtestRisk = totalPnL === 0 ? 0 : backtest.loss / totalPnL;

      // Calculate health risk (0 to 1, where 1 is high risk)
      // Health < 100 is bad, 150+ is good
      const healthRisk = Math.max(0, Math.min(1, 1 - health / 200));

      // Combined risk score: 60% health, 40% backtest
      const riskScore = 0.6 * healthRisk + 0.4 * backtestRisk;

      metrics[predId] = {
        realizedProfit: backtest.profit,
        realizedLoss: backtest.loss,
        riskScore: riskScore,
        health: health
      };
    });

    return NextResponse.json({
      ok: true,
      metrics,
      totalPredictions: allPredictionIds.size
    });
  } catch (err) {
    console.error('Heatmap error:', err);
    return NextResponse.json({
      ok: false,
      error: String(err)
    }, { status: 500 });
  }
}
