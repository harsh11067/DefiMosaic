"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Pie, PieChart, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { ChartPieIcon, CpuChipIcon, UsersIcon, BeakerIcon } from "@heroicons/react/24/outline";
import WagmiWalletIntegration from "@/components/WagmiWalletIntegration";
import AllocationChart from "@/components/AllocationChart";
import SocialCopyTrading from "@/components/SocialCopyTrading";
import StrategyAnalytics from "@/components/StrategyAnalytics";
import StrategyTemplatesWrapper from "@/components/StrategyTemplatesWrapper";
import AIChatbot from "@/components/AIChatbot";
import Backtester from "@/components/Backtester";
import RewardsHub from "@/components/RewardsHub";
import { awardPoints } from "@/lib/points";

export default function DashboardPage() {
  const [profile, setProfile] = useState<string>("");
  const [rationale, setRationale] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");

  async function onRecommend(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setStatus("");
    const risk = profile || "medium";
    try {
      const res = await fetch("/api/recommend-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ risk }),
      });
      const data = await res.json();
      if (data.ok) {
        setProfile(data.data.riskProfile);
        setRecommendationData(data.data);
        setRationale(data.data.notes);

        const allocationMap: Record<string, number> = {};
        data.data.allocations.forEach((alloc: any) => {
          allocationMap[alloc.strategyId] = alloc.percent;
        });
        setAlloc(allocationMap);
        awardPoints("run_recommendation");
      } else {
        setStatus(`Error: ${data.error}`);
      }
    } catch (err: any) {
      setStatus(`Error: ${err?.message || "Request failed"}`);
    }
    setLoading(false);
  }

  const [recommendationData, setRecommendationData] = useState<any>(null);
  const [alloc, setAlloc] = useState<Record<string, number> | null>(null);

  const pieData = alloc
    ? [
        { name: "Aave", value: alloc.aave_stable ?? 0 },
        { name: "Curve", value: alloc.curve_stable_lp ?? 0 },
        { name: "Uniswap", value: alloc.uni_eth_usdc_lp ?? 0 },
        { name: "Staking", value: alloc.stake_validator ?? 0 },
        { name: "Yearn", value: alloc.yield_aggregator ?? 0 },
        { name: "Pendle", value: alloc.pendle ?? 0 },
      ].filter((item) => item.value > 0)
    : [];

  const COLORS = ["#22d3ee", "#a78bfa", "#34d399", "#f59e0b", "#f472b6", "#8b5cf6"];

  return (
    <main className="max-w-7xl mx-auto px-4 py-10 space-y-10">
      {/* Page hero */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-2"
      >
        <span className="section-chip">
          <ChartPieIcon className="h-3.5 w-3.5" /> Terminal
        </span>
        <h1 className="text-4xl md:text-5xl font-bold">
          The <span className="text-gradient-animated">Terminal</span>
        </h1>
        <p className="text-gray-400 max-w-2xl">
          Allocate with AI, shadow the sharpest strategies, stack XP — your whole edge on one screen.
        </p>
      </motion.div>

      {/* Wallet */}
      <WagmiWalletIntegration />

      {/* Rewards hub */}
      <RewardsHub />

      {/* AI Recommendation */}
      <section className="glass-panel p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-gradient-to-br from-violet-600/30 to-cyan-500/20 border border-violet-500/30">
            <CpuChipIcon className="h-5 w-5 text-violet-300" />
          </span>
          <div>
            <h2 className="text-2xl font-bold text-white">AI Allocator</h2>
            <p className="text-sm text-gray-400">Pick a risk appetite. The allocator hunts the yield.</p>
          </div>
        </div>

        <form onSubmit={onRecommend} className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm text-gray-300 mb-1.5">Risk Profile</label>
            <select
              className="w-full bg-white/[0.04] border border-white/15 rounded-xl px-3 py-2.5 text-white focus:border-violet-500/60 focus:outline-none transition-colors [&>option]:bg-slate-900"
              value={profile}
              onChange={(e) => setProfile(e.target.value)}
            >
              <option value="">Auto (via AI)</option>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </select>
          </div>
          <button disabled={loading} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? "Optimizing…" : "Recommend Strategy"}
          </button>
        </form>

        {status && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{status}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 min-h-[280px]">
            <h3 className="font-semibold text-white mb-2">Portfolio Allocation</h3>
            {alloc ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={100}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
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
              <div className="h-64 flex flex-col items-center justify-center text-center gap-3">
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-white/15 flex items-center justify-center animate-float">
                  <ChartPieIcon className="h-10 w-10 text-white/20" />
                </div>
                <p className="text-sm text-gray-500">Run a recommendation to see your allocation.</p>
              </div>
            )}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <h3 className="font-semibold text-white mb-3">Risk Profile &amp; Rationale</h3>
            <div className="space-y-4">
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-widest">Risk Profile</span>
                <p className="text-white capitalize font-semibold text-lg">{profile || "Not selected"}</p>
              </div>
              <div>
                <span className="text-gray-400 text-xs uppercase tracking-widest">Rationale</span>
                <p className="text-sm text-white/80 whitespace-pre-wrap mt-1">
                  {rationale || "Run a recommendation to see details."}
                </p>
              </div>
            </div>
          </div>
        </div>

        {recommendationData && (
          <AllocationChart data={recommendationData} childBets={recommendationData.childBetSuggestions || []} />
        )}
      </section>

      {/* Social Copy Trading */}
      <section className="glass-panel p-6 md:p-8">
        <div className="flex items-center gap-3 mb-6">
          <span className="p-2 rounded-xl bg-gradient-to-br from-pink-600/30 to-violet-500/20 border border-pink-500/30">
            <UsersIcon className="h-5 w-5 text-pink-300" />
          </span>
          <p className="text-sm text-gray-400">Shadow the best. Get paid for being right.</p>
        </div>
        <SocialCopyTrading />
      </section>

      {/* Strategy Lab */}
      <section className="glass-panel p-6 md:p-8 space-y-8">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-gradient-to-br from-emerald-600/30 to-cyan-500/20 border border-emerald-500/30">
            <BeakerIcon className="h-5 w-5 text-emerald-300" />
          </span>
          <div>
            <h2 className="text-2xl font-bold text-white">Strategy Lab</h2>
            <p className="text-sm text-gray-400">Blueprints, backtests, live signals — proof before size.</p>
          </div>
        </div>
        <StrategyTemplatesWrapper />
        <Backtester />
        <StrategyAnalytics symbol="BTCUSDT" interval="1m" />
      </section>

      {/* AI Chatbot */}
      <AIChatbot />
    </main>
  );
}
