import OpenAI from "openai";
import fetch from "node-fetch";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const STRATEGIES = [
  { id: "aave_stable", name: "Aave (Stable Lending)", risk: "low", description: "Deposit stablecoins into Aave to earn lending interest." },
  { id: "curve_stable_lp", name: "Curve Stable LP", risk: "low", description: "Provide liquidity to Curve pools for stable trading fees." },
  { id: "uni_eth_usdc_lp", name: "Uniswap V3 ETH/USDC LP", risk: "medium", description: "Provide concentrated liquidity for higher fees but some IL risk." },
  { id: "stake_validator", name: "Liquid Staking (Lido)", risk: "medium", description: "Stake ETH via liquid staking derivatives to earn rewards." },
  { id: "yield_aggregator", name: "Yearn Vault", risk: "high", description: "Auto-compounding vault using active yield strategies." },
  { id: "pendle", name: "Pendle Yield", risk: "high", description: "Trade yield-bearing tokens for higher variable returns." },
];

// 🔹 Fetch live APY data from DefiLlama
async function fetchDefiLlamaYields() {
  try {
    const res = await fetch("https://yields.llama.fi/pools");
    const data = await res.json();
    const pools = data.data || data;

    const apyMap = {};
    const norm = (s) => (s || "").toLowerCase();

    for (const s of STRATEGIES) apyMap[s.id] = 0;

    for (const p of pools) {
      const n = norm(p.name || p.project || p.protocol);
      if (n.includes("aave") && apyMap["aave_stable"] === 0) apyMap["aave_stable"] = Number(p.apy || 0);
      else if (n.includes("curve") && apyMap["curve_stable_lp"] === 0) apyMap["curve_stable_lp"] = Number(p.apy || 0);
      else if (n.includes("uni") && apyMap["uni_eth_usdc_lp"] === 0) apyMap["uni_eth_usdc_lp"] = Number(p.apy || 0);
      else if (n.includes("lido") && apyMap["stake_validator"] === 0) apyMap["stake_validator"] = Number(p.apy || 0);
      else if (n.includes("yearn") && apyMap["yield_aggregator"] === 0) apyMap["yield_aggregator"] = Number(p.apy || 0);
      else if (n.includes("pendle") && apyMap["pendle"] === 0) apyMap["pendle"] = Number(p.apy || 0);
    }

    return apyMap;
  } catch (e) {
    console.warn("⚠️ DefiLlama fetch failed:", e.message);
    const fallback = {};
    STRATEGIES.forEach((s) => (fallback[s.id] = 0));
    return fallback;
  }
}

// 🔹 Function calling schema
const schema = {
  name: "recommend_portfolio",
  description: "Generate a recommended DeFi portfolio allocation given current APYs and user risk profile.",
  parameters: {
    type: "object",
    properties: {
      riskProfile: { type: "string", description: "User risk level: low, medium, or high." },
      allocations: {
        type: "array",
        description: "List of allocations per strategy (must sum to 100).",
        items: {
          type: "object",
          properties: {
            strategyId: { type: "string", description: "Strategy ID from predefined list." },
            percent: { type: "number", description: "Percentage of total portfolio." },
            reason: { type: "string", description: "Short explanation for including this strategy." },
          },
          required: ["strategyId", "percent", "reason"],
        },
      },
      notes: { type: "string", description: "Short summary of the reasoning behind this portfolio." },
    },
    required: ["riskProfile", "allocations", "notes"],
  },
};

export default async function handler(req, res) {
  try {
    const { risk = "medium" } = req.method === "GET" ? req.query : req.body;

    const apyMap = await fetchDefiLlamaYields();

    // Compose a concise context for the model
    const strategiesText = STRATEGIES.map(
      (s) => `${s.id}: ${s.name} (${s.risk}) APY=${apyMap[s.id]}% — ${s.description}`
    ).join("\n");

    const messages = [
      {
        role: "system",
        content: "You are a DeFi investment assistant that outputs only structured portfolio data.",
      },
      {
        role: "user",
        content: `
User risk appetite: ${risk}.
Here are the available strategies with current APYs:
${strategiesText}
Recommend a diversified portfolio that matches their risk appetite.
Favor higher APYs for higher risk, but include some low-risk safety for all.
Percentages must sum to 100.
        `,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: [
        {
          type: "function",
          function: schema,
        },
      ],
      tool_choice: { type: "function", function: { name: "recommend_portfolio" } },
    });

    const toolOutput = completion.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!toolOutput) throw new Error("No structured output from OpenAI");

    const result = JSON.parse(toolOutput);

    // normalize percentages if needed
    const sum = result.allocations.reduce((acc, a) => acc + a.percent, 0);
    if (sum !== 100) {
      const scaled = result.allocations.map((a) => ({
        ...a,
        percent: Math.round((a.percent / sum) * 100),
      }));
      result.allocations = scaled;
    }

    // attach APY and names for UI
    result.allocations = result.allocations.map((a) => ({
      ...a,
      liveAPY: apyMap[a.strategyId] ?? 0,
      name: STRATEGIES.find((s) => s.id === a.strategyId)?.name ?? a.strategyId,
    }));

    result.generatedAt = new Date().toISOString();

    res.status(200).json({ ok: true, data: result });
  } catch (err) {
    console.error("API error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
}
