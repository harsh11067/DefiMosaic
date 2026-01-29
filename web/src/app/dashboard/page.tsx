"use client";

import { useState } from "react";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import WagmiWalletIntegration from "@/components/WagmiWalletIntegration";
import AllocationChart from "@/components/AllocationChart";
import SocialCopyTrading from "@/components/SocialCopyTrading";
import StrategyAnalytics from "@/components/StrategyAnalytics";
import StrategyTemplatesWrapper from "@/components/StrategyTemplatesWrapper";
import AIChatbot from "@/components/AIChatbot";
import Backtester from "@/components/Backtester";

export default function DashboardPage() {
  const [profile, setProfile] = useState<string>("");
  const [rationale, setRationale] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  async function onRecommend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const risk = profile || "medium";
    const res = await fetch("/api/recommend-strategy", { 
      method: "POST", 
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ risk }) 
    });
    const data = await res.json();
    if (data.ok) {
      setProfile(data.data.riskProfile);
      setRecommendationData(data.data); // Store full data for AllocationChart
      setRationale(data.data.notes);
      
      // Convert allocations to the format expected by the old chart
      const allocationMap: Record<string, number> = {};
      data.data.allocations.forEach((alloc: any) => {
        allocationMap[alloc.strategyId] = alloc.percent;
      });
      setAlloc(allocationMap);
    } else {
      setStatus(`Error: ${data.error}`);
    }
    setLoading(false);
  }

  // Store the full recommendation data
  const [recommendationData, setRecommendationData] = useState<any>(null);
  const [alloc, setAlloc] = useState<Record<string, number> | null>(null);

  // Create pie chart data from allocations
  const pieData = alloc
    ? [
        { name: "Aave", value: alloc.aave_stable ?? 0 },
        { name: "Curve", value: alloc.curve_stable_lp ?? 0 },
        { name: "Uniswap", value: alloc.uni_eth_usdc_lp ?? 0 },
        { name: "Staking", value: alloc.stake_validator ?? 0 },
        { name: "Yearn", value: alloc.yield_aggregator ?? 0 },
        { name: "Pendle", value: alloc.pendle ?? 0 },
      ].filter(item => item.value > 0)
    : [];

  const COLORS = ["#22d3ee", "#a78bfa", "#34d399", "#f59e0b", "#ef4444", "#8b5cf6"];

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Portfolio Dashboard</h1>
      
      {/* Wagmi Wallet Integration */}
      <WagmiWalletIntegration />

      <form onSubmit={onRecommend} className="rounded-lg border border-white/10 p-4 flex items-end gap-4">
        <div className="flex-1">
          <label className="block text-sm mb-1">Risk Profile</label>
          <select className="w-full bg-transparent border rounded px-3 py-2" value={profile} onChange={(e) => setProfile(e.target.value)}>
            <option value="">Auto (via AI)</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
          </select>
        </div>
        <button disabled={loading} className="px-4 py-2 rounded bg-violet-600 disabled:opacity-50">
          {loading ? "Recommending..." : "Recommend Strategy"}
        </button>
      </form>

      {status && (
        <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
          <div className="text-sm text-white/70">{status}</div>
        </div>
      )}

      {/* Original Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="rounded-lg border border-white/10 p-4 min-h-[280px]">
          <h2 className="font-medium mb-2">Portfolio Allocation</h2>
          {alloc ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={pieData} 
                    dataKey="value" 
                    nameKey="name" 
                    outerRadius={100} 
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-sm text-white/60">No allocation yet. Run a recommendation to see your portfolio.</div>
          )}
        </section>
        <section className="rounded-lg border border-white/10 p-4">
          <h2 className="font-medium mb-2">Risk Profile & Rationale</h2>
          <div className="space-y-3">
            <div>
              <span className="text-gray-400 text-sm">Risk Profile:</span>
              <p className="text-white capitalize font-medium">{profile || "Not selected"}</p>
            </div>
            <div>
              <span className="text-gray-400 text-sm">Rationale:</span>
              <p className="text-sm text-white/80 whitespace-pre-wrap">{rationale || "Run a recommendation to see details."}</p>
            </div>
          </div>
        </section>
      </div>

      {/* Enhanced Allocation Chart */}
      {recommendationData && (
        <AllocationChart 
          data={recommendationData}
          childBets={recommendationData.childBetSuggestions || []}
        />
      )}

      {/* Social Copy Trading Section */}
      <SocialCopyTrading />

      {/* Strategy Templates */}
      <StrategyTemplatesWrapper />

      {/* Backtester */}
      <Backtester />

      {/* Advanced Strategy Analytics */}
      <StrategyAnalytics symbol="BTCUSDT" interval="1m" />

      {/* AI Chatbot */}
      <AIChatbot />
    </main>
  );
}


