import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  const systemPrompt = `
You are DefiMosaic Strategy Copilot.
You analyze DeFi strategies using:
- Backtest metrics
- Prediction chain risk
- On-chain leverage & health

Be conservative. Use numbers. No hype.
Return structured insights only.
`;

  const functionSchema = {
    name: "analyze_strategy",
    description: "Analyze strategy and suggest improvements",
    parameters: {
      type: "object",
      properties: {
        summary: { type: "string" },
        riskLevel: { type: "string", enum: ["Low", "Medium", "High"] },
        strengths: { type: "array", items: { type: "string" } },
        weaknesses: { type: "array", items: { type: "string" } },
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              title: { type: "string" },
              rationale: { type: "string" },
              parameterChanges: { type: "object" }
            }
          }
        },
        confidenceScore: { type: "number" }
      },
      required: ["summary", "riskLevel", "strengths", "weaknesses", "suggestions", "confidenceScore"]
    }
  };

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(body) }
      ],
      functions: [functionSchema],
      function_call: { name: "analyze_strategy" }
    })
  });

  const json = await response.json();
  const result = json.choices[0].message.function_call.arguments;

  return NextResponse.json({ ok: true, analysis: JSON.parse(result) });
}
