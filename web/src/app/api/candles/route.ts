import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'BTCUSDT';
    const interval = searchParams.get('interval') || '1h';
    const limit = parseInt(searchParams.get('limit') || '500');
    
    // Binance klines API
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const r = await fetch(url);
    
    if (!r.ok) {
      throw new Error(`Binance API error: ${r.status}`);
    }
    
    const data = await r.json();
    
    // Map to OHLCV format
    const candles = data.map((c: any[]) => ({
      time: Math.floor(c[0] / 1000),
      open: parseFloat(c[1]),
      high: parseFloat(c[2]),
      low: parseFloat(c[3]),
      close: parseFloat(c[4]),
      volume: parseFloat(c[5])
    }));
    
    return NextResponse.json({ candles, symbol, interval });
  } catch (error: any) {
    console.error('Candles API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch candles' },
      { status: 500 }
    );
  }
}
