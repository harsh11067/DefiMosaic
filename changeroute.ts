import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { symbol, interval, fast, slow, predictionId } = body;

    const py = path.join(process.cwd(), '..', '..', 'tools', 'backtester', 'backtest.py'); // adjust if needed
    const outDirArg = path.join(process.cwd(), 'public', 'backtests');

    // spawn python
    return await new Promise((resolve) => {
      const args = [py, symbol, '--interval', interval, '--fast', `${fast}`, '--slow', `${slow}`, '--prediction-id', `${predictionId}`, '--out-dir', outDirArg];
      const proc = spawn('python', args, { cwd: process.cwd() });

      let stdout = '';
      let stderr = '';
      proc.stdout.on('data', (d) => stdout += d.toString());
      proc.stderr.on('data', (d) => stderr += d.toString());

      proc.on('close', (code) => {
        if (code !== 0) {
          console.error('Backtester error', stderr);
          resolve(NextResponse.json({ ok: false, error: stderr }, { status: 500 }));
        } else {
          // backtest prints BACKTEST_OK <id> or writes meta.json — parse stdout
          const match = stdout.match(/BACKTEST_OK\s+([a-z0-9-]+)/i);
          let backtestId = match ? match[1] : null;

          // fallback: if meta.json exists, read it
          if (!backtestId) {
            // try to find last folder under public/backtests
            // simple approach: return success and instruct client to fetch meta list
            resolve(NextResponse.json({ ok: true, stdout, stderr }));
          } else {
            resolve(NextResponse.json({ ok: true, backtestId }));
          }
        }
      });
    });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
