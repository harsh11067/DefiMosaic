import { NextResponse } from "next/server";

/**
 * Strategy Backtester — pure TypeScript engine over REAL Binance history.
 *
 * SMA fast/slow crossover, long-only, all-in sizing, 0.1% taker fee per side,
 * equity marked to market on every candle. Reports a buy-and-hold benchmark
 * so results are honest: a strategy is only good if it beats just holding.
 *
 * (Replaces the old python-subprocess implementation, which required a local
 * Python/matplotlib install and had broken P&L pairing.)
 */

const FEE_RATE = 0.001; // 0.1% per side
const START_EQUITY = 1000;

// Bars per year for annualizing Sharpe, per interval
const BARS_PER_YEAR: Record<string, number> = {
  "1m": 525600,
  "5m": 105120,
  "15m": 35040,
  "1h": 8760,
  "4h": 2190,
  "1d": 365,
};

interface Trade {
  time: string;
  side: "buy" | "sell";
  price: number;
  size: number;
  fee: number;
  pnl?: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const symbol = String(body.symbol || "ETHUSDT").toUpperCase();
    const interval = String(body.interval || "1h");
    const fast = Math.floor(Number(body.fast) || 20);
    const slow = Math.floor(Number(body.slow) || 50);

    if (!/^[A-Z0-9]{5,20}$/.test(symbol)) {
      return NextResponse.json({ ok: false, error: "Invalid symbol" }, { status: 400 });
    }
    if (!BARS_PER_YEAR[interval]) {
      return NextResponse.json({ ok: false, error: "Interval must be one of 1m, 5m, 15m, 1h, 4h, 1d" }, { status: 400 });
    }
    if (fast < 2 || slow < 3 || fast >= slow || slow > 400) {
      return NextResponse.json({ ok: false, error: "Need 2 ≤ fast < slow ≤ 400" }, { status: 400 });
    }

    // Real market history
    const r = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=1000`,
      { cache: "no-store" }
    );
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: `Binance rejected ${symbol} (${r.status}) — check the symbol.` }, { status: 502 });
    }
    const klines = await r.json();
    if (!Array.isArray(klines) || klines.length < slow + 10) {
      return NextResponse.json({ ok: false, error: "Not enough history for those SMA periods." }, { status: 400 });
    }

    const closes: number[] = klines.map((k: any[]) => parseFloat(k[4]));
    const times: number[] = klines.map((k: any[]) => Number(k[0]));

    // SMAs
    const sma = (period: number): number[] => {
      const out: number[] = new Array(closes.length).fill(NaN);
      let sum = 0;
      for (let i = 0; i < closes.length; i++) {
        sum += closes[i];
        if (i >= period) sum -= closes[i - period];
        if (i >= period - 1) out[i] = sum / period;
      }
      return out;
    };
    const fastLine = sma(fast);
    const slowLine = sma(slow);

    // Simulation
    let cash = START_EQUITY;
    let units = 0;
    let entryCost = 0; // cash spent on the open position (incl. fee)
    const trades: Trade[] = [];
    const equity: { time: number; value: number }[] = [];
    let wins = 0;
    let losses = 0;
    let grossWin = 0;
    let grossLoss = 0;

    for (let i = 1; i < closes.length; i++) {
      const price = closes[i];
      if (!isNaN(fastLine[i]) && !isNaN(fastLine[i - 1]) && !isNaN(slowLine[i - 1])) {
        const crossedUp = fastLine[i - 1] <= slowLine[i - 1] && fastLine[i] > slowLine[i];
        const crossedDown = fastLine[i - 1] >= slowLine[i - 1] && fastLine[i] < slowLine[i];

        if (crossedUp && units === 0 && cash > 0) {
          const fee = cash * FEE_RATE;
          units = (cash - fee) / price;
          entryCost = cash;
          trades.push({ time: new Date(times[i]).toISOString(), side: "buy", price, size: units, fee });
          cash = 0;
        } else if (crossedDown && units > 0) {
          const gross = units * price;
          const fee = gross * FEE_RATE;
          cash = gross - fee;
          const pnl = cash - entryCost;
          if (pnl >= 0) { wins++; grossWin += pnl; } else { losses++; grossLoss += -pnl; }
          trades.push({ time: new Date(times[i]).toISOString(), side: "sell", price, size: units, fee, pnl });
          units = 0;
        }
      }
      equity.push({ time: times[i], value: cash + units * price });
    }

    // Force-close any open position at the last price for final accounting
    if (units > 0) {
      const price = closes[closes.length - 1];
      const gross = units * price;
      const fee = gross * FEE_RATE;
      cash = gross - fee;
      const pnl = cash - entryCost;
      if (pnl >= 0) { wins++; grossWin += pnl; } else { losses++; grossLoss += -pnl; }
      trades.push({ time: new Date(times[times.length - 1]).toISOString(), side: "sell", price, size: units, fee, pnl });
      units = 0;
    }

    const finalEquity = cash;
    const totalPnl = finalEquity - START_EQUITY;

    // Max drawdown on the marked-to-market equity curve
    let peak = START_EQUITY;
    let maxDrawdown = 0;
    for (const e of equity) {
      if (e.value > peak) peak = e.value;
      const dd = (peak - e.value) / peak;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    // Annualized Sharpe from per-bar returns
    const returns: number[] = [];
    for (let i = 1; i < equity.length; i++) {
      if (equity[i - 1].value > 0) returns.push(equity[i].value / equity[i - 1].value - 1);
    }
    const avg = returns.reduce((a, b) => a + b, 0) / Math.max(1, returns.length);
    const variance = returns.reduce((a, b) => a + (b - avg) ** 2, 0) / Math.max(1, returns.length);
    const std = Math.sqrt(variance);
    const sharpe = std > 0 ? (avg / std) * Math.sqrt(BARS_PER_YEAR[interval]) : 0;

    // Honesty benchmark: what if you had just bought and held?
    const firstValid = slow; // strategy can't act before the slow SMA exists
    const buyHoldReturnPct = ((closes[closes.length - 1] - closes[firstValid]) / closes[firstValid]) * 100;
    const strategyReturnPct = (totalPnl / START_EQUITY) * 100;
    const roundTrips = wins + losses;

    return NextResponse.json({
      ok: true,
      engine: "typescript-sma-crossover-v2",
      window: {
        from: new Date(times[0]).toISOString(),
        to: new Date(times[times.length - 1]).toISOString(),
        candles: closes.length,
      },
      metrics: {
        totalTrades: roundTrips,
        wins,
        losses,
        winRate: roundTrips > 0 ? (wins / roundTrips) * 100 : 0,
        totalPnl,
        maxDrawdown: maxDrawdown * 100,
        sharpe,
        finalEquity,
        profitFactor: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0,
        strategyReturnPct,
        buyHoldReturnPct,
        beatsBuyHold: strategyReturnPct > buyHoldReturnPct,
      },
      trades,
      equity: equity
        .filter((_, i) => i % Math.max(1, Math.floor(equity.length / 300)) === 0)
        .map((e) => ({ time: new Date(e.time).toLocaleDateString(), value: Number(e.value.toFixed(2)) })),
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Backtest failed" }, { status: 500 });
  }
}
