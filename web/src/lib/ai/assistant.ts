import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export type RiskProfile = "safe" | "balanced" | "aggressive";

export async function recommendStrategy(input: {
  answers: Record<string, string | number | boolean>;
}): Promise<{ profile: RiskProfile; allocation: Record<string, number>; rationale: string }> {
  const system =
    "You are a DeFi portfolio assistant. Map user risk to one of: safe, balanced, aggressive. Output JSON with profile and allocation across USDC lending (Aave), UniswapV3 LP, and YieldAggregator. Percentages sum to 100.";

  const user = `Answers: ${JSON.stringify(input.answers)}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
  });

  const content = completion.choices[0]?.message?.content || "{}";
  const parsed = JSON.parse(content);
  return {
    profile: parsed.profile as RiskProfile,
    allocation: parsed.allocation ?? { aave: 70, uniswap: 20, yield: 10 },
    rationale: parsed.rationale ?? "",
  };
}



