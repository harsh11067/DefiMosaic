import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import fetch from "node-fetch";
import { ethers } from "ethers";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// --- Config: your strategy universe (id must match schema used by model)
const STRATEGIES = [
  { id: "aave_stable", name: "Aave (Stable Lending)", risk: "low", description: "Deposit stablecoins into Aave to earn lending interest." },
  { id: "curve_stable_lp", name: "Curve Stable LP", risk: "low", description: "Provide liquidity to Curve pools for stable trading fees." },
  { id: "uni_eth_usdc_lp", name: "Uniswap V3 ETH/USDC LP", risk: "medium", description: "Concentrated liquidity on Uniswap V3; higher fees and IL risk." },
  { id: "stake_validator", name: "Liquid Staking (Lido)", risk: "medium", description: "Stake ETH via liquid staking derivatives to earn staking rewards." },
  { id: "yield_aggregator", name: "Yearn Vault", risk: "high", description: "Auto-compounding vaults using active strategies." },
  { id: "pendle", name: "Pendle Yield", risk: "high", description: "Trade future yield streams or yield-bearing tokens." }
];

// Minimal ERC-20 ABI to read decimals & balanceOf
const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)"
];

/**
 * Helper: fetch some APY numbers from DefiLlama (best effort).
 * Returns map: { strategyId: apyNumber }
 */
async function fetchDefiLlamaYields() {
  try {
    const res = await fetch("https://yields.llama.fi/pools");
    const data = await res.json();
    const pools = Array.isArray(data) ? data : data.data || [];

    const apyMap: Record<string, number> = {};
    STRATEGIES.forEach((s) => (apyMap[s.id] = 0));

    const normalize = (s = "") => s.toLowerCase();

    for (const p of pools) {
      const name = normalize(p.name || p.project || p.protocol || "");
      if (!name) continue;
      if (name.includes("aave") && apyMap["aave_stable"] === 0) {
        apyMap["aave_stable"] = Number(p.apy?.all || p.apy || 0);
      } else if (name.includes("curve") && apyMap["curve_stable_lp"] === 0) {
        apyMap["curve_stable_lp"] = Number(p.apy?.all || p.apy || 0);
      } else if ((name.includes("uniswap") || name.includes("uniswap v3") || name.includes("uni")) && name.includes("eth") && apyMap["uni_eth_usdc_lp"] === 0) {
        apyMap["uni_eth_usdc_lp"] = Number(p.apy?.all || p.apy || 0);
      } else if ((name.includes("lido") || name.includes("steth") || name.includes("staked")) && apyMap["stake_validator"] === 0) {
        apyMap["stake_validator"] = Number(p.apy?.all || p.apy || 0);
      } else if ((name.includes("yearn") || name.includes("vault")) && apyMap["yield_aggregator"] === 0) {
        apyMap["yield_aggregator"] = Number(p.apy?.all || p.apy || 0);
      } else if (name.includes("pendle") && apyMap["pendle"] === 0) {
        apyMap["pendle"] = Number(p.apy?.all || p.apy || 0);
      }
    }

    // normalize zeros
    for (const k of Object.keys(apyMap)) {
      if (!apyMap[k] || isNaN(apyMap[k])) apyMap[k] = 0;
      apyMap[k] = Number(apyMap[k]);
    }
    return apyMap;
  } catch (err: any) {
    console.warn("DefiLlama yields fetch failed:", err.message);
    const fallback: Record<string, number> = {};
    STRATEGIES.forEach((s) => (fallback[s.id] = 0));
    return fallback;
  }
}

/**
 * Fetch on-chain balances for `address`:
 * - native MATIC balance
 * - for each token in tokenList: balanceOf and decimals
 * tokenList = [{address, id}] where id is some short id like "USDC" or "DAI".
 *
 * Returns:
 * {
 *   native: "123.45", // in human units
 *   tokens: { USDC: { address, raw: BigNumber, decimals, human: 123.45, symbol } }
 * }
 */
async function getOnchainBalances(address: string, tokenList: Array<{address: string, id: string}> = []) {
  const rpc = process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology";
  const provider = new ethers.JsonRpcProvider(rpc);

  // Native balance (wei -> ether)
  const nativeRaw = await provider.getBalance(address);
  const nativeHuman = Number(ethers.formatEther(nativeRaw));

  const tokens: Record<string, any> = {};
  for (const t of tokenList) {
    try {
      const token = new ethers.Contract(t.address, ERC20_ABI, provider);
      const raw = await token.balanceOf(address);
      const decimals = await token.decimals();
      const symbol = await token.symbol().catch(() => t.id);
      const human = Number(ethers.formatUnits(raw, decimals));
      tokens[t.id] = { address: t.address, raw: raw.toString(), decimals, human, symbol };
    } catch (err) {
      // On failure, set zero
      tokens[t.id] = { address: t.address, raw: "0", decimals: 18, human: 0, symbol: t.id };
    }
  }

  return { native: nativeHuman, nativeRaw: nativeRaw.toString(), tokens };
}

// --- OpenAI function calling schema
const functionSchema = {
  name: "recommend_portfolio",
  description: "Return a JSON portfolio allocation including optional leveraged child-bet suggestions",
  parameters: {
    type: "object",
    properties: {
      riskProfile: { type: "string", enum: ["low", "medium", "high"] },
      allocations: {
        type: "array",
        description: "Primary strategy allocations summing ≈100%",
        items: {
          type: "object",
          properties: {
            strategyId: { type: "string" },
            percent: { type: "number" },
            reason: { type: "string" },
            category: {
              type: "string",
              enum: ["Stable Crypto", "Mutual Funds", "Stocks", "Growing Crypto"]
            }
          },
          required: ["strategyId", "percent"]
        }
      },
      childBetSuggestions: {
        type: "array",
        description: "Optional leveraged branch bets from parent allocations",
        items: {
          type: "object",
          properties: {
            parentStrategyId: { type: "string" },
            leverageBPS: { type: "number", description: "Basis points of leverage (e.g., 4000 = 4×)" },
            sizePercent: { type: "number", description: "Percent of parent position" },
            rationale: { type: "string" }
          }
        }
      },
      notes: { type: "string" }
    },
    required: ["riskProfile", "allocations"]
  }
};

// --- Utility: build strategies text including live APY and suggested "why for this user"
// We build a clear context for the model including user balances, so it can weight allocations
function buildContextText(risk: string, apyMap: Record<string, number>, balanceContext: any) {
  const strategiesText = STRATEGIES.map(s => {
    const apy = apyMap?.[s.id] ?? 0;
    return `- ${s.id}: ${s.name} (risk: ${s.risk}, currentAPY: ${apy.toFixed(2)}%). ${s.description}`;
  }).join("\n");

  const balanceTextParts = [];
  if (balanceContext) {
    balanceTextParts.push(`User native balance (MATIC): ${balanceContext.native} MATIC`);
    const tokenEntries = Object.entries(balanceContext.tokens || {});
    if (tokenEntries.length) {
      balanceTextParts.push("Token balances:");
      for (const [id, t] of tokenEntries) {
        balanceTextParts.push(`  - ${id}: ${(t as any).human} (${(t as any).symbol || id})`);
      }
    }
  }

  const balanceText = balanceTextParts.join("\n");

  return `
Available strategies:
${strategiesText}

User context:
${balanceText}

Instruction:
- You are a professional DeFi allocator.
- Use the live APYs to weight allocations, but consider risk appetite.
- If the user has most assets in stablecoins, favor stable strategies.
- If the user has significant MATIC native balance and little stablecoins, suggest some liquid staking and medium-risk LP exposure.
- Always include at least one low-risk anchor (min 10% for medium/high, 20% for low).
- Output only the function call structured JSON matching the provided schema.
- Percent integers must sum to ~100 (normalize if necessary).
`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Accept either `address` OR `balances`.
    // Example `balances` shape:
    // { native: 1.23, tokens: { USDC: { human: 100.0 }, DAI: { human: 50.0 } } }
    const { address, balances, tokenList = [] } = body;

    // 1) fetch APYs
    const apyMap = await fetchDefiLlamaYields();

    // 2) get balance context: either from provided balances or read on-chain
    let balanceContext = balances;
    if (!balanceContext && address) {
      // tokenList is expected to be an array of objects: { id: "USDC", address: "0x..." }
      balanceContext = await getOnchainBalances(address, tokenList);
    }

    // 3) build message context
    const risk = body.risk || "medium";
    const context = buildContextText(risk, apyMap, balanceContext);

    // 4) call OpenAI with function calling
    const messages = [
      { role: "system", content: "You are a DeFi portfolio recommendation assistant. Output only valid JSON via the function call." },
      { role: "user", content: context }
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: [
        {
          type: "function",
          function: functionSchema
        }
      ],
      // force model to choose the function
      tool_choice: { type: "function", function: { name: "recommend_portfolio" } },
      temperature: 0.0,
      max_tokens: 500
    });

    // extract function call result
    const toolCalls = completion?.choices?.[0]?.message?.tool_calls ?? completion?.choices?.[0]?.message?.tool_call;
    let toolOutputText = null;
    if (toolCalls && toolCalls[0] && toolCalls[0].function) {
      toolOutputText = toolCalls[0].function.arguments;
    } else if (completion?.choices?.[0]?.message?.content) {
      // fallback if function-calling wasn't used (shouldn't happen)
      toolOutputText = completion.choices[0].message.content;
    } else {
      throw new Error("No function-calling output from model");
    }

    // parse JSON
    const parsed = JSON.parse(toolOutputText);

    // Normalize allocation percentages to sum to 100 (integers)
    let allocs = parsed.allocations || [];
    let sum = allocs.reduce((s: number, a: any) => s + Number(a.percent || 0), 0);
    if (sum === 0 && allocs.length) {
      // equal split fallback
      const each = Math.floor(100 / allocs.length);
      allocs = allocs.map((a: any, i: number) => ({ ...a, percent: i === 0 ? 100 - each * (allocs.length - 1) : each }));
    } else if (sum !== 100) {
      // scale to 100
      allocs = allocs.map((a: any) => ({ ...a, percent: Math.round((a.percent / sum) * 100) }));
      // fix rounding drift
      let s2 = allocs.reduce((x: number, y: any) => x + y.percent, 0);
      if (s2 !== 100 && allocs.length) allocs[0].percent += (100 - s2);
    }

    // attach APY + human names
    allocs = allocs.map((a: any) => ({
      ...a,
      liveAPY: apyMap[a.strategyId] ?? 0,
      name: (STRATEGIES.find(s => s.id === a.strategyId) || {}).name || a.strategyId
    }));

    // Color map by category
    const COLOR_MAP: Record<string, string> = {
      "Stable Crypto": "#3498db",
      "Mutual Funds": "#9b59b6",
      "Stocks": "#f39c12",
      "Growing Crypto": "#2ecc71"
    };

    // Attach colors (default green)
    allocs = allocs.map((a: any) => ({
      ...a,
      color: COLOR_MAP[a.category] || "#2ecc71"
    }));

    const result = {
      riskProfile: parsed.riskProfile || risk,
      allocations: allocs,
      childBetSuggestions: parsed.childBetSuggestions || [],
      notes: parsed.notes || "",
      generatedAt: new Date().toISOString(),
      balanceContext,
      apyMap
    };
    function sanitizeForJson(obj: any): any {
      if (obj === null || obj === undefined) return obj;
    
      if (typeof obj === "bigint") return obj.toString();
    
      // ethers.BigNumber check
      if (obj._isBigNumber || (obj.constructor && obj.constructor.name === "BigNumber")) {
        return obj.toString();
      }
    
      if (Array.isArray(obj)) return obj.map(sanitizeForJson);
    
      if (typeof obj === "object") {
        const clean: any = {};
        for (const [key, value] of Object.entries(obj)) {
          clean[key] = sanitizeForJson(value);
        }
        return clean;
      }
    
      return obj;
    }
    

    const cleanResult = sanitizeForJson(result);
    return NextResponse.json({ ok: true, data: cleanResult });
  } catch (err: any) {
    console.error("recommend-strategy error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}