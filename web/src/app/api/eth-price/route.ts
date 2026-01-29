import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd&include_24hr_change=true',
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 60 } // Cache for 60 seconds
      }
    );

    if (!res.ok) {
      throw new Error(`CoinGecko API error: ${res.status}`);
    }

    const data = await res.json();
    
    return NextResponse.json({
      price: data.ethereum?.usd || null,
      change24h: data.ethereum?.usd_24h_change || null
    });
  } catch (error: any) {
    console.error('ETH price fetch error:', error);
    return NextResponse.json(
      { price: null, change24h: null, error: error.message },
      { status: 500 }
    );
  }
}

