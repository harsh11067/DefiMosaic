import { NextResponse } from "next/server";

/**
 * Full tradeable universe — every live Binance USDT spot pair (~400 real
 * markets: majors, alts, forex pairs like EUR/USDT, and gold via PAXG).
 * Cached for an hour; the client filters/searches locally.
 */
export async function GET() {
  try {
    const r = await fetch("https://api.binance.com/api/v3/exchangeInfo?permissions=SPOT", {
      next: { revalidate: 3600 },
    });
    if (!r.ok) throw new Error(`Binance ${r.status}`);
    const data = await r.json();

    const symbols = (data.symbols || [])
      .filter(
        (s: any) =>
          s.status === "TRADING" &&
          s.quoteAsset === "USDT" &&
          s.isSpotTradingAllowed !== false &&
          !/(UP|DOWN|BULL|BEAR)USDT$/.test(s.symbol) // skip leveraged-token artifacts
      )
      .map((s: any) => ({ symbol: s.symbol, base: s.baseAsset }));

    // Tag the special classes so the UI can badge them
    const CLASS_MAP: Record<string, string> = {
      EURUSDT: "forex",
      GBPUSDT: "forex",
      AUDUSDT: "forex",
      USDCUSDT: "stable",
      FDUSDUSDT: "stable",
      PAXGUSDT: "gold",
    };
    for (const s of symbols) {
      if (CLASS_MAP[s.symbol]) s.class = CLASS_MAP[s.symbol];
    }

    return NextResponse.json({ count: symbols.length, symbols });
  } catch (e: any) {
    // Minimal real fallback set so the Arena always works
    const fallback = [
      { symbol: "BTCUSDT", base: "BTC" },
      { symbol: "ETHUSDT", base: "ETH" },
      { symbol: "SOLUSDT", base: "SOL" },
      { symbol: "POLUSDT", base: "POL" },
      { symbol: "BNBUSDT", base: "BNB" },
      { symbol: "XRPUSDT", base: "XRP" },
      { symbol: "DOGEUSDT", base: "DOGE" },
      { symbol: "PAXGUSDT", base: "PAXG", class: "gold" },
      { symbol: "EURUSDT", base: "EUR", class: "forex" },
    ];
    return NextResponse.json({ count: fallback.length, symbols: fallback, degraded: e?.message });
  }
}
