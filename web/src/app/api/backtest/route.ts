import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';

export async function POST(request: Request) {
  try {
    const { symbol = 'ETHUSDT', interval = '1h', fast = 20, slow = 50 } = await request.json();

    // Create temporary files
    const tempDir = tmpdir();
    // Fix path: go up one level from web/ to root, then to tools/backtester/
    const scriptPath = join(process.cwd(), '..', 'tools', 'backtester', 'backtest.py');
    
    // Verify script exists
    if (!existsSync(scriptPath)) {
      return NextResponse.json(
        { ok: false, error: `Backtest script not found at ${scriptPath}. Please ensure the file exists.` },
        { status: 500 }
      );
    }
    
    const outputDir = tempDir;
    const timestamp = Date.now();
    const equityFile = join(outputDir, `equity_${timestamp}.png`);
    const tradesFile = join(outputDir, `trades_${timestamp}.csv`);

    return new Promise((resolve, reject) => {
      // Run Python backtester - try python3 first, then python
      const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
      const python = spawn(pythonCmd, [
        scriptPath,
        symbol,
        interval,
        fast.toString(),
        slow.toString(),
        outputDir,
        timestamp.toString()
      ], {
        shell: true
      });

      let stdout = '';
      let stderr = '';

      python.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      python.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      python.on('close', async (code) => {
        if (code !== 0) {
          console.error('Python backtester error:', stderr);
          console.error('Python backtester stdout:', stdout);
          const errorMsg = stderr || stdout || 'Unknown error';
          resolve(NextResponse.json(
            { ok: false, error: `Backtest failed: ${errorMsg}` },
            { status: 500 }
          ));
          return;
        }

        try {
          // Check if files exist
          const tradesExists = await readFile(tradesFile, 'utf-8').catch(() => null);
          const equityExists = await readFile(equityFile).catch(() => null);
          
          if (!tradesExists) {
            throw new Error(`Trades file not found at ${tradesFile}. Python script may have failed. Check stderr: ${stderr}`);
          }
          
          if (!equityExists) {
            throw new Error(`Equity chart file not found at ${equityFile}. Python script may have failed. Check stderr: ${stderr}`);
          }
          
          // Read results
          const tradesData = tradesExists;
          const equityData = equityExists;

          // Parse trades CSV
          const trades = tradesData.split('\n')
            .slice(1)
            .filter(line => line.trim())
            .map(line => {
              const [time, side, price, size, fee] = line.split(',');
              return { time, side, price: parseFloat(price), size: parseFloat(size), fee: parseFloat(fee) };
            });

          // Calculate metrics
          let totalPnl = 0;
          let wins = 0;
          let losses = 0;
          let maxDrawdown = 0;
          let peak = 0;

          const equity: number[] = [];
          let currentEquity = 1000; // initial cash

          for (const trade of trades) {
            if (trade.side === 'buy') {
              currentEquity -= trade.price * trade.size + trade.fee;
            } else {
              currentEquity += trade.price * trade.size - trade.fee;
              const pnl = trade.price * trade.size - trade.fee - (trades.find(t => t.time === trade.time && t.side === 'buy')?.price || 0) * trade.size;
              totalPnl += pnl;
              if (pnl > 0) wins++;
              else losses++;
            }
            if (currentEquity > peak) peak = currentEquity;
            const drawdown = (peak - currentEquity) / peak;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
            equity.push(currentEquity);
          }

          const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;
          const sharpe = equity.length > 1 
            ? calculateSharpe(equity) 
            : 0;

          // Convert equity image to base64
          const equityBase64 = equityData.toString('base64');

          // Cleanup
          await unlink(equityFile).catch(() => {});
          await unlink(tradesFile).catch(() => {});

          resolve(NextResponse.json({
            ok: true,
            metrics: {
              totalTrades: trades.length,
              wins,
              losses,
              winRate,
              totalPnl,
              maxDrawdown: maxDrawdown * 100,
              sharpe,
              finalEquity: equity[equity.length - 1] || 1000
            },
            trades,
            equity: equity.map((val, idx) => ({ time: idx, value: val })),
            equityChart: `data:image/png;base64,${equityBase64}`
          }));
        } catch (error: any) {
          console.error('Backtest processing error:', error);
          resolve(NextResponse.json(
            { ok: false, error: `Failed to process results: ${error.message || 'Unknown error'}` },
            { status: 500 }
          ));
        }
      });
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Backtest failed' },
      { status: 500 }
    );
  }
}

function calculateSharpe(equity: number[]): number {
  if (equity.length < 2) return 0;
  const returns = equity.slice(1).map((val, i) => (val - equity[i]) / equity[i]);
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((acc, r) => acc + Math.pow(r - avgReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  return stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
}

