import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { symbol, interval, fast, slow, predictionId } = body;

    if (!symbol) {
      return NextResponse.json({ ok: false, error: 'Missing symbol parameter' }, { status: 400 });
    }

    const backtesterPath = path.join(process.cwd(), '..', 'tools', 'backtester', 'backtest.py');
    const outDirArg = path.join(process.cwd(), 'public', 'backtests');

    // Spawn python backtester
    return await new Promise((resolve) => {
      const args = [
        backtesterPath,
        symbol,
        '--interval', interval || '1h',
        '--fast', `${fast || 20}`,
        '--slow', `${slow || 50}`,
        '--prediction-id', `${predictionId || ''}`,
        '--out-dir', outDirArg
      ];

      console.log('Running backtester:', 'python', args.join(' '));

      const proc = spawn('python', args, { cwd: process.cwd() });

      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (d) => stdout += d.toString());
      proc.stderr.on('data', (d) => stderr += d.toString());

      proc.on('close', (code) => {
        if (code !== 0) {
          console.error('Backtester error:', stderr);
          resolve(NextResponse.json({ ok: false, error: stderr || 'Backtest failed' }, { status: 500 }));
        } else {
          // Parse backtest ID from stdout (format: BACKTEST_OK <id>)
          const match = stdout.match(/BACKTEST_OK\s+([a-z0-9-]+)/i);
          const backtestId = match ? match[1] : null;

          if (backtestId) {
            resolve(NextResponse.json({ ok: true, backtestId }));
          } else {
            // Return success but without explicit ID
            resolve(NextResponse.json({ ok: true, stdout, message: 'Backtest completed' }));
          }
        }
      });

      proc.on('error', (err) => {
        console.error('Failed to spawn backtester:', err);
        resolve(NextResponse.json({
          ok: false,
          error: `Failed to run backtester: ${err.message}`
        }, { status: 500 }));
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        proc.kill();
        resolve(NextResponse.json({ ok: false, error: 'Backtest timed out' }, { status: 504 }));
      }, 300000);
    });
  } catch (err) {
    console.error('Backtest API error:', err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
