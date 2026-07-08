"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BoltIcon,
  CheckCircleIcon,
  FireIcon,
  LockClosedIcon,
  RocketLaunchIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import {
  awardPoints,
  levelFromXp,
  loadPoints,
  onPointsChange,
  questsFromState,
  tierForLevel,
  TIERS,
  type PointsState,
} from "@/lib/points";

/**
 * Mosaic Points hub: level ring, XP bar, daily streak, quests and the
 * Pro-tier teaser. Lives on the dashboard; updates live via the
 * "mosaic:points" event whenever any flow awards XP.
 */
export default function RewardsHub() {
  const [state, setState] = useState<PointsState | null>(null);

  useEffect(() => {
    // Daily check-in on first visit of the day
    setState(awardPoints("daily_login"));
    return onPointsChange(setState);
  }, []);

  if (!state) {
    return <div className="glass-panel p-6 h-40 shimmer rounded-xl" />;
  }

  const { level, intoLevel, needed } = levelFromXp(state.xp);
  const tier = tierForLevel(level);
  const nextTier = TIERS.find((t) => t.minLevel > level);
  const quests = questsFromState(state);
  const doneCount = quests.filter((q) => q.done).length;
  const progressPct = Math.min(100, Math.round((intoLevel / needed) * 100));

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="glass-panel p-6 md:p-8 space-y-6"
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="section-chip mb-2">
            <TrophyIcon className="h-3.5 w-3.5" /> Rewards
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-white mt-2">
            Mosaic <span className="text-gradient">Points</span>
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Every move on Mosaic earns XP. Level up, keep your streak, climb the tiers.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full border animate-pulse-glow"
            style={{ borderColor: tier.color, color: tier.color, background: `${tier.color}14` }}
          >
            <span className="text-lg">{tier.emoji}</span>
            <span className="font-semibold">{tier.name}</span>
          </div>
          <div className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-300">
            <FireIcon className="h-4 w-4" />
            <span className="font-semibold">{state.streakDays}</span>
            <span className="text-xs text-orange-300/70">day streak</span>
          </div>
        </div>
      </div>

      {/* Level + XP bar */}
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 items-center">
        <div className="relative w-28 h-28 mx-auto md:mx-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="44" fill="none"
              stroke="url(#xpGradient)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${(progressPct / 100) * 276.5} 276.5`}
            />
            <defs>
              <linearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#22d3ee" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-white">{level}</span>
            <span className="text-[10px] uppercase tracking-widest text-gray-400">Level</span>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-end justify-between text-sm">
            <span className="text-gray-300">
              <span className="text-2xl font-bold text-white">{state.xp.toLocaleString()}</span>{" "}
              <span className="text-gradient font-semibold">XP</span>
            </span>
            <span className="text-gray-400">
              {intoLevel.toLocaleString()} / {needed.toLocaleString()} to level {level + 1}
            </span>
          </div>
          <div className="xp-bar">
            <div className="xp-bar-fill" style={{ width: `${progressPct}%` }} />
          </div>
          {nextTier && (
            <p className="text-xs text-gray-500">
              Reach level {nextTier.minLevel} to unlock {nextTier.emoji} {nextTier.name}
            </p>
          )}
        </div>
      </div>

      {/* Quests */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <BoltIcon className="h-5 w-5 text-cyan-300" /> Quests
          </h3>
          <span className="text-xs text-gray-400">{doneCount}/{quests.length} completed</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {quests.map((q, i) => (
            <motion.div
              key={q.action}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
                q.done
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-white/10 bg-white/[0.03] hover:border-violet-500/40"
              }`}
            >
              <span className="text-xl">{q.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium truncate ${q.done ? "text-emerald-300" : "text-white"}`}>
                  {q.title}
                </div>
                <div className="text-xs text-gray-400">+{q.xp} XP</div>
              </div>
              {q.done && <CheckCircleIcon className="h-5 w-5 text-emerald-400 flex-shrink-0" />}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent activity + Pro teaser */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <h3 className="text-sm font-semibold text-white mb-3">Recent Activity</h3>
          {state.activity.length === 0 ? (
            <p className="text-sm text-gray-500">No activity yet — start with a quest above.</p>
          ) : (
            <ul className="space-y-2">
              {state.activity.slice(0, 5).map((a, i) => (
                <li key={`${a.at}-${i}`} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">
                    {(() => {
                      const meta = questsFromState(state).find((q) => q.action === a.action);
                      return `${meta?.emoji ?? "•"} ${meta?.title ?? a.action}`;
                    })()}
                  </span>
                  <span className="text-cyan-300 font-medium">+{a.xp} XP</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="relative overflow-hidden rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-600/15 to-blue-600/10 p-4">
          <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-violet-600/25 blur-2xl" aria-hidden="true" />
          <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
            <RocketLaunchIcon className="h-4 w-4 text-violet-300" /> Mosaic Pro
            <span className="px-2 py-0.5 text-[10px] rounded-full bg-violet-500/25 text-violet-200 border border-violet-400/40">
              COMING SOON
            </span>
          </h3>
          <p className="text-xs text-gray-400 mb-3">
            2× XP multiplier, advanced strategy analytics, priority AI copilot and zero-fee follows.
          </p>
          <ul className="space-y-1.5 text-xs text-gray-300">
            {["2× points on every action", "Deep portfolio analytics", "Unlimited AI recommendations"].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <LockClosedIcon className="h-3.5 w-3.5 text-violet-300" /> {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </motion.section>
  );
}
