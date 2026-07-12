import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const STRATEGIES = [
  {
    name: "Aave Lending",
    risk: "low",
    apy: "4.2%",
    description: "Deposit stablecoins into Aave to earn lending interest."
  },
  {
    name: "Balancer Pool (USDC/ETH)",
    risk: "medium",
    apy: "8.1%",
    description: "Provide liquidity to a Balancer pool for trading fees."
  },
  {
    name: "Pendle Yield Vault",
    risk: "high",
    apy: "15.5%",
    description: "Stake yield-bearing tokens in Pendle for leveraged yields."
  }
];

export async function POST(req: NextRequest) {
  try {
    if (!openai) {
      return NextResponse.json({ error: "AI is not configured (OPENAI_API_KEY missing)" }, { status: 503 });
    }
    const { riskAppetite } = await req.json();

    const prompt = `
    You are a DeFi portfolio advisor. 
    Recommend how to diversify across these strategies based on risk appetite: ${riskAppetite}.
    Strategies: ${STRATEGIES.map(s => s.name).join(", ")}.
    Output JSON: { allocations: [{strategy, percent, reason}] }
    `;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" }
    });

    const text = completion.choices[0]?.message?.content || "{}";
    const recommendation = JSON.parse(text);
    
    return NextResponse.json({ recommendation });
  } catch (error: any) {
    console.error("Strategy recommendation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate strategy recommendation" },
      { status: 500 }
    );
  }
}
