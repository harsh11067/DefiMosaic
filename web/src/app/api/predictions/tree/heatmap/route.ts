import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { backtestId, nodes } = await req.json();

    const csvPath = path.join(
      process.cwd(),
      "public",
      "backtests",
      backtestId,
      "trades.csv"
    );

    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ ok: false, error: "CSV not found" }, { status: 400 });
    }

    const csv = fs.readFileSync(csvPath, "utf8");
    const parsed = Papa.parse(csv, { header: true, dynamicTyping: true });
    const rows = parsed.data as any[];

    const stats: Record<string, any> = {};

    for (const r of rows) {
      const id = String(r.prediction_id);
      if (!stats[id]) stats[id] = { profit: 0, loss: 0 };

      const pnl = Number(r.pnl || 0);
      pnl >= 0 ? (stats[id].profit += pnl) : (stats[id].loss += Math.abs(pnl));
    }

    const metrics: Record<string, any> = {};

    for (const node of nodes) {
      const s = stats[node.id] || { profit: 0, loss: 0 };
      const total = s.profit + s.loss;

      const backtestRisk = total === 0 ? 0 : s.loss / total;
      const healthRisk = Math.max(0, Math.min(1, 1 - node.health / 200));

      metrics[node.id] = {
        realizedProfit: s.profit,
        realizedLoss: s.loss,
        riskScore: Number((0.6 * healthRisk + 0.4 * backtestRisk).toFixed(2))
      };
    }

    return NextResponse.json({ ok: true, metrics });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
