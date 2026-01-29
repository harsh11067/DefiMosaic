// web/src/app/api/backtests/list/route.ts (simplified)
import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const predictionId = searchParams.get('predictionId');
  const root = path.join(process.cwd(), 'public', 'backtests');
  const dirs = fs.existsSync(root) ? fs.readdirSync(root) : [];
  const list = [];
  for (const d of dirs) {
    const metaPath = path.join(root, d, 'meta.json');
    if (!fs.existsSync(metaPath)) continue;
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    if (!predictionId || String(meta.prediction_id) === String(predictionId)) {
      list.push(meta);
    }
  }
  return NextResponse.json({ ok: true, backtests: list });
}
