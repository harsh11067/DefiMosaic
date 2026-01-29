import { NextResponse } from "next/server";

interface PredictionNode {
  id: number;
  parentId: number;
  collateral: string;
  loanAmount: string;
  priceTarget: string;
  health: number;
  leverage: number;
  depth: number;
  resolved: boolean;
  outcome?: boolean;
}

interface CopilotRequest {
  node: PredictionNode;
  chainData: {
    totalCollateral: number;
    totalLoan: number;
    avgHealth: number;
    maxDepth: number;
    nodeCount: number;
  };
  backtestMetrics?: {
    winRate: number;
    expectancy: number;
    maxDrawdown: number;
    sharpeRatio: number;
  };
  marketStats?: {
    currentPrice: number;
    volatility: number;
    trend: 'bullish' | 'bearish' | 'neutral';
  };
}

export async function POST(req: Request) {
  try {
    const body: CopilotRequest = await req.json();

    const systemPrompt = `You are DefiMosaic Strategy Copilot, an AI advisor for DeFi leveraged prediction chains.

You analyze:
- On-chain prediction positions (collateral, leverage, health)
- Backtest performance metrics (win rate, expectancy, drawdown)
- Current market conditions (price, volatility, trend)
- Chain structure (depth, branching)

Your job is to provide ACTIONABLE, SPECIFIC advice. Be conservative and risk-aware.

Response format (JSON):
{
  "riskAssessment": "Low|Medium|High|Critical",
  "summary": "One sentence summary of the position",
  "warnings": ["List of specific warnings/concerns"],
  "actions": [
    {
      "type": "reduce_leverage|add_collateral|branch_hedge|close_position|hold|extend",
      "title": "Action title",
      "rationale": "Why this action",
      "params": { "amount": number, "triggerPrice": number }
    }
  ],
  "avoidActions": ["Things NOT to do"],
  "confidenceScore": 0.0-1.0
}`;

    const userPrompt = `Analyze this prediction position:

NODE:
- ID: ${body.node.id}
- Collateral: ${body.node.collateral}
- Loan Amount: ${body.node.loanAmount}
- Health: ${body.node.health}%
- Leverage: ${body.node.leverage / 100}x
- Depth: ${body.node.depth}
- Status: ${body.node.resolved ? (body.node.outcome ? 'Won' : 'Lost') : 'Active'}

CHAIN TOTALS:
- Total Collateral: $${body.chainData.totalCollateral.toFixed(2)}
- Total Loan: $${body.chainData.totalLoan.toFixed(2)}
- Average Health: ${body.chainData.avgHealth.toFixed(1)}%
- Max Depth: ${body.chainData.maxDepth}
- Total Nodes: ${body.chainData.nodeCount}

${body.backtestMetrics ? `BACKTEST METRICS:
- Win Rate: ${(body.backtestMetrics.winRate * 100).toFixed(1)}%
- Expectancy: ${body.backtestMetrics.expectancy.toFixed(2)}
- Max Drawdown: ${(body.backtestMetrics.maxDrawdown * 100).toFixed(1)}%
- Sharpe Ratio: ${body.backtestMetrics.sharpeRatio.toFixed(2)}` : 'No backtest data available.'}

${body.marketStats ? `MARKET:
- Current Price: $${body.marketStats.currentPrice.toFixed(2)}
- Volatility: ${(body.marketStats.volatility * 100).toFixed(1)}%
- Trend: ${body.marketStats.trend}` : 'No market data available.'}

Provide specific, actionable advice for this position.`;

    const openaiKey = process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      // Return mock response if no API key
      return NextResponse.json({
        ok: true,
        analysis: {
          riskAssessment: body.node.health < 120 ? 'Critical' : body.node.health < 150 ? 'High' : 'Medium',
          summary: `Position at ${body.node.depth} depth with ${body.node.health.toFixed(0)}% health`,
          warnings: body.node.health < 150 ? ['Health below 150% - liquidation risk'] : [],
          actions: [
            {
              type: body.node.health < 130 ? 'add_collateral' : 'hold',
              title: body.node.health < 130 ? 'Add Collateral Urgently' : 'Monitor Position',
              rationale: body.node.health < 130
                ? 'Current health is dangerously low'
                : 'Position is stable for now',
              params: { amount: body.node.health < 130 ? 0.1 : 0 }
            }
          ],
          avoidActions: body.node.depth >= 3 ? ['Avoid further branching beyond depth 3'] : [],
          confidenceScore: 0.7
        }
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return NextResponse.json({ ok: false, error: 'OpenAI API error' }, { status: 500 });
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json({ ok: false, error: 'No analysis generated' }, { status: 500 });
    }

    const analysis = JSON.parse(content);
    return NextResponse.json({ ok: true, analysis });
  } catch (err) {
    console.error('Strategy Copilot error:', err);
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
