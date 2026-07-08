import { NextResponse } from "next/server";

/**
 * Arena price feed — REAL market data only, any Binance USDT spot pair.
 *
 * GET /api/arena/price?symbol=BTCUSDT           → live spot price
 * GET /api/arena/price?symbol=BTCUSDT&ts=<ms>   → price at a past moment
 *
 * Historical lookups settle bets that expired while the page was closed:
 * recent moments (< 20 min) resolve against the 1-SECOND kline close for
 * short-expiry precision; older moments fall back to the 1-minute close.
 * Primary source: Binance. CoinGecko spot fallback for the core majors.
 */

const COINGECKO_IDS: Record<string, string> = {
  BTCUSDT: "bitcoin",
  ETHUSDT: "ethereum",
  SOLUSDT: "solana",
  POLUSDT: "polygon-ecosystem-token",
};

const SYMBOL_RE = /^[A-Z0-9]{5,20}$/;

async function klineClose(symbol: string, interval: "1s" | "1m", bucketStart: number): Promise<number | null> {
  try {
    const r = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&startTime=${bucketStart}&limit=1`,
      { cache: "no-store" }
    );
    if (!r.ok) return null;
    const data = await r.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const candle = data[0];
    const closeTime = Number(candle[6]);
    if (Date.now() <= closeTime) return null; // candle still open
    return parseFloat(candle[4]);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = (searchParams.get("symbol") || "BTCUSDT").toUpperCase();
  const ts = searchParams.get("ts");

  if (!SYMBOL_RE.test(symbol) || !symbol.endsWith("USDT")) {
    return NextResponse.json({ error: "invalid symbol" }, { status: 400 });
  }

  // ---- Historical: settle against the real candle covering ts ----
  if (ts) {
    const t = Number(ts);
    if (!Number.isFinite(t)) {
      return NextResponse.json({ error: "invalid ts" }, { status: 400 });
    }
    const age = Date.now() - t;

    // 1s klines are only retained briefly — use them for fresh, short-expiry settlements
    if (age > 0 && age < 20 * 60 * 1000) {
      const secStart = Math.floor(t / 1000) * 1000;
      const price = await klineClose(symbol, "1s", secStart);
      if (price !== null) {
        return NextResponse.json({ symbol, price, source: "binance-kline-1s", ts: secStart });
      }
    }

    const minStart = Math.floor(t / 60000) * 60000;
    const price = await klineClose(symbol, "1m", minStart);
    if (price !== null) {
      return NextResponse.json({ symbol, price, source: "binance-kline-1m", ts: minStart });
    }
    // fall through to spot if the covering candle hasn't closed yet
  }

  // ---- Spot ----
  try {
    const r = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`, {
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Binance ${r.status}`);
    const data = await r.json();
    const price = parseFloat(data.price);
    if (!Number.isFinite(price)) throw new Error("bad price");
    return NextResponse.json({ symbol, price, source: "binance-spot", ts: Date.now() });
  } catch (e) {
    console.warn("Binance spot failed:", e);
  }

  // CoinGecko fallback (majors only)
  const id = COINGECKO_IDS[symbol];
  if (id) {
    try {
      const r = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`, {
        next: { revalidate: 5 },
      });
      if (r.ok) {
        const data = await r.json();
        const price = data[id]?.usd;
        if (Number.isFinite(price)) {
          return NextResponse.json({ symbol, price, source: "coingecko-spot", ts: Date.now() });
        }
      }
    } catch {}
  }

  return NextResponse.json({ error: "all price sources failed" }, { status: 502 });
}
