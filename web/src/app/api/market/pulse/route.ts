import { NextResponse } from "next/server";

/**
 * Market Pulse — real 24h statistics for the whole Binance USDT universe.
 * Returns the top pairs by quote volume with change%, price and volume,
 * plus breadth stats (how much of the market is green vs red right now).
 */
export async function GET() {
  try {
    // Response is ~2.5MB — too large for Next's fetch cache, so skip it
    const r = await fetch("https://api.binance.com/api/v3/ticker/24hr", {
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`Binance ${r.status}`);
    const data = await r.json();

    const usdt = (data as any[])
      .filter(
        (t) =>
          t.symbol.endsWith("USDT") &&
          !/(UP|DOWN|BULL|BEAR)USDT$/.test(t.symbol) &&
          parseFloat(t.quoteVolume) > 0
      )
      .map((t) => ({
        symbol: t.symbol,
        base: t.symbol.replace(/USDT$/, ""),
        price: parseFloat(t.lastPrice),
        change: parseFloat(t.priceChangePercent),
        volume: parseFloat(t.quoteVolume),
      }));

    const green = usdt.filter((t) => t.change > 0).length;
    const red = usdt.filter((t) => t.change < 0).length;
    const top = usdt.sort((a, b) => b.volume - a.volume).slice(0, 96);

    return NextResponse.json({
      updatedAt: Date.now(),
      breadth: { total: usdt.length, green, red, greenPct: Math.round((green / Math.max(1, usdt.length)) * 100) },
      tiles: top,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "pulse fetch failed" }, { status: 502 });
  }
}
