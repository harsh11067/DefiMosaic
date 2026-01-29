import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=price_change_percentage_24h_desc&per_page=1&page=1&sparkline=false',
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 300 } // Cache for 5 minutes
      }
    );

    if (!res.ok) {
      throw new Error(`CoinGecko API error: ${res.status}`);
    }

    const data = await res.json();
    
    return NextResponse.json({
      coin: data && data.length > 0 ? data[0] : null
    });
  } catch (error: any) {
    console.error('Top mover fetch error:', error);
    return NextResponse.json(
      { coin: null, error: error.message },
      { status: 500 }
    );
  }
}

