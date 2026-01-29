import fs from 'fs';
import path from 'path';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const predictionId = searchParams.get('predictionId');

    const root = path.join(process.cwd(), 'public', 'backtests');

    if (!fs.existsSync(root)) {
      return NextResponse.json({ ok: true, backtests: [] });
    }

    const dirs = fs.readdirSync(root);
    const list: any[] = [];

    for (const d of dirs) {
      const metaPath = path.join(root, d, 'meta.json');
      if (!fs.existsSync(metaPath)) continue;

      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));

        // Filter by predictionId if provided
        if (!predictionId || String(meta.prediction_id) === String(predictionId)) {
          list.push({
            ...meta,
            backtestId: d // Ensure backtestId is included
          });
        }
      } catch (parseError) {
        console.warn(`Failed to parse meta.json for ${d}:`, parseError);
      }
    }

    // Sort by most recent first
    list.sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

    return NextResponse.json({ ok: true, backtests: list });
  } catch (err) {
    console.error('Error listing backtests:', err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
