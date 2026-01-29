import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { coins } = body;

    // Example: Simple summary without OpenAI (for demo)
    // In production, replace this with actual OpenAI API call
    
    if (!process.env.OPENAI_API_KEY) {
      // Return a simple summary without OpenAI
      const topGainer = coins.sort((a: any, b: any) => 
        (b.change24h || 0) - (a.change24h || 0)
      )[0];
      
      return NextResponse.json({
        summary: `Market update: ${topGainer?.symbol.toUpperCase()} leads with ${topGainer?.change24h?.toFixed(2)}% gain. Key tokens showing mixed signals.`
      });
    }

    // Actual OpenAI call (uncomment and use in production)
    /*
    const prompt = `Provide a one-line human-friendly market summary for these tokens and their 24h changes: ${JSON.stringify(coins)}`;
    
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 60
      })
    });

    const data = await res.json();
    const summary = data?.choices?.[0]?.message?.content || 'Market data unavailable';
    */

    return NextResponse.json({
      summary: 'Market update: Cryptocurrencies showing mixed signals with moderate volatility.'
    });
  } catch (error) {
    console.error('Summary generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    );
  }
}
