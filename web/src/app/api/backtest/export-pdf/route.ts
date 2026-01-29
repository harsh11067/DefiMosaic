import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { symbol, metrics, trades, equity } = await request.json();

    // For now, return JSON since Puppeteer requires setup
    // In production, use Puppeteer to generate PDF
    const reportData = {
      symbol,
      generatedAt: new Date().toISOString(),
      metrics,
      summary: {
        totalTrades: trades?.length || 0,
        period: equity && equity.length > 0 
          ? `From trade 0 to trade ${equity.length - 1}`
          : 'N/A'
      },
      recentTrades: trades?.slice(-20) || []
    };

    return NextResponse.json({
      ok: true,
      message: 'PDF generation requires Puppeteer. Returning JSON data.',
      data: reportData
    });

    /* 
    // Puppeteer implementation:
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(htmlContent);
    const pdf = await page.pdf({ format: 'A4' });
    await browser.close();
    return new NextResponse(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="backtest-${symbol}-${Date.now()}.pdf"`
      }
    });
    */
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Export failed' },
      { status: 500 }
    );
  }
}

