"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AcademicCapIcon, XMarkIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import { loadPoints, onPointsChange, type PointsState } from "@/lib/points";

/**
 * Mosaic Guide — the onboarding coach for newcomers.
 * A pulsing beacon (auto-opens once for brand-new users) that walks through
 * the whole product step by step. Progress is derived from the REAL points
 * state, so steps tick themselves off as the user actually does things.
 */

const LS_SEEN = "mosaicGuideSeen";

interface Step {
  emoji: string;
  title: string;
  body: string;
  href: string;
  cta: string;
  done: (p: PointsState) => boolean;
}

const STEPS: Step[] = [
  {
    emoji: "⚔️",
    title: "Duel the market — free",
    body: "You start with 500 XP paper money. Pick any of 450+ live markets in the Arena, call LONG or SHORT, and feel a real 5-second settlement. No wallet needed.",
    href: "/arena",
    cta: "Enter the Arena",
    done: (p) => (p.counts.arena_bet ?? 0) > 0,
  },
  {
    emoji: "⏪",
    title: "Trade the past at 60×",
    body: "The Time Machine replays any real day from the last year. Open leveraged positions on genuine history — weeks of practice in minutes.",
    href: "/arena/replay",
    cta: "Open Time Machine",
    done: (p) => (p.counts.arena_bet ?? 0) > 1,
  },
  {
    emoji: "✨",
    title: "Let the AI build your portfolio",
    body: "On the Dashboard, pick a risk level and run the AI Allocator — it spreads a portfolio across lending, staking and LP strategies with live APYs.",
    href: "/dashboard",
    cta: "Run the Allocator",
    done: (p) => (p.counts.run_recommendation ?? 0) > 0,
  },
  {
    emoji: "🤝",
    title: "Copy a proven strategy",
    body: "Follow Conservative Yield or Aggressive Growth from the Dashboard. Your MetaMask confirms a real Polygon Amoy transaction — grab free test POL from the faucet first.",
    href: "/dashboard",
    cta: "Browse strategies",
    done: (p) => (p.counts.follow_strategy ?? 0) > 0,
  },
  {
    emoji: "🎯",
    title: "Go on-chain for real",
    body: "Open an oracle-settled prediction pool with test POL on the Markets page — real contracts, real settlement, 2× on wins.",
    href: "/bets",
    cta: "Open the Markets",
    done: (p) => (p.counts.create_pool ?? 0) > 0,
  },
];

export default function OnboardingGuide() {
  const [open, setOpen] = useState(false);
  const [points, setPoints] = useState<PointsState | null>(null);

  useEffect(() => {
    setPoints(loadPoints());
    const un = onPointsChange(setPoints);
    // Auto-open once for brand-new users
    if (!localStorage.getItem(LS_SEEN)) {
      const t = setTimeout(() => setOpen(true), 2500);
      return () => { clearTimeout(t); un(); };
    }
    return un;
  }, []);

  const dismiss = () => {
    localStorage.setItem(LS_SEEN, "1");
    setOpen(false);
  };

  const doneCount = points ? STEPS.filter((s) => s.done(points)).length : 0;

  return (
    <>
      {/* Beacon */}
      <button
        onClick={() => (open ? dismiss() : setOpen(true))}
        title="Mosaic Guide — learn the ropes"
        className="fixed bottom-5 left-5 z-50 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-sm font-semibold shadow-lg shadow-cyan-600/30 hover:scale-105 transition-transform"
      >
        <span className="relative flex h-2.5 w-2.5">
          {doneCount < STEPS.length && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-60" />
          )}
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white" />
        </span>
        <AcademicCapIcon className="h-4 w-4" />
        Guide {doneCount}/{STEPS.length}
      </button>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.25 }}
            className="fixed bottom-20 left-5 z-50 w-[min(400px,calc(100vw-2.5rem))] glass-panel p-5 max-h-[70vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between mb-1">
              <h3 className="font-bold text-white text-lg">
                Welcome to <span className="text-gradient">Mosaic</span> 👋
              </h3>
              <button onClick={dismiss} className="p-1 rounded-lg hover:bg-white/10 transition-colors">
                <XMarkIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Five moves from zero to degen. Your <span className="text-white font-semibold">500 XP</span> paper
              bankroll works everywhere the ⚔️ engine runs — and free{" "}
              <a href="https://faucet.polygon.technology/" target="_blank" rel="noopener noreferrer" className="text-cyan-300 hover:underline">
                faucet POL
              </a>{" "}
              covers everything on-chain. Steps tick off automatically as you do them.
            </p>

            <div className="space-y-2.5">
              {STEPS.map((s, i) => {
                const done = points ? s.done(points) : false;
                return (
                  <div
                    key={s.title}
                    className={`rounded-xl border p-3 transition-all ${
                      done ? "border-emerald-500/40 bg-emerald-500/[0.07]" : "border-white/10 bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{s.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-semibold ${done ? "text-emerald-300" : "text-white"}`}>
                          {i + 1}. {s.title}
                        </div>
                      </div>
                      {done ? (
                        <CheckCircleIcon className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <Link
                          href={s.href}
                          onClick={() => localStorage.setItem(LS_SEEN, "1")}
                          className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-600/25 text-cyan-200 border border-cyan-400/40 hover:bg-cyan-600/40 transition-all"
                        >
                          {s.cta} →
                        </Link>
                      )}
                    </div>
                    {!done && <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{s.body}</p>}
                  </div>
                );
              })}
            </div>

            {doneCount === STEPS.length && (
              <div className="mt-4 rounded-xl border border-amber-400/40 bg-amber-500/10 p-3 text-center">
                <span className="text-sm text-amber-200 font-semibold">🏆 Full tour complete — you're one of us now.</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
