"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BackwardIcon,
  BoltIcon,
  PlayIcon,
  StopIcon,
} from "@heroicons/react/24/outline";
import { ARENA_ASSETS, MIN_STAKE, loadArena, onArenaChange, debitBankroll, creditBankroll } from "@/lib/arena";
import { awardPoints } from "@/lib/points";

/**
 * Time Machine — bar-replay trading on REAL history.
 *
 * Picks any day from the last year, streams the genuine Binance 1m candles at
 * 15–60× speed, and lets you trade it with leverage from your XP bankroll.
 * Every price is a real market print; only the clock is compressed.
 */

const SESSION_CANDLES = 240; // 4 market hours per session
const SPEEDS = [
  { label: "15×", candleMs: 4000 },
  { label: "30×", candleMs: 2000 },
  { label: "60×", candleMs: 1000 },
];
const LEVERAGES = [1, 5, 10];

interface Candle {
  time: number; // seconds
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Position {
  direction: "long" | "short";
  stake: number;
  leverage: number;
  entryPrice: number;
  entryIndex: number;
}

interface ClosedTrade {
  direction: "long" | "short";
  stake: number;
  leverage: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number; // XP, can be negative
}

function positionPnl(pos: Position, price: number): number {
  const move = (price - pos.entryPrice) / pos.entryPrice;
  const signed = pos.direction === "long" ? move : -move;
  // Loss is capped at the stake (liquidation at -100%)
  return Math.max(-pos.stake, Math.round(pos.stake * pos.leverage * signed));
}

function ReplayChart({ candles, revealed, position }: { candles: Candle[]; revealed: number; position: Position | null }) {
  const visible = candles.slice(0, revealed);
  if (visible.length < 2) return <div className="h-64 shimmer rounded-xl" />;

  const prices = visible.map((c) => c.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 800;
  const h = 250;
  const x = (i: number) => (i / (candles.length - 1)) * w;
  const y = (p: number) => h - ((p - min) / range) * (h - 20) - 10;
  const pts = visible.map((c, i) => `${x(i)},${y(c.close)}`);
  const last = prices[prices.length - 1];
  const rising = prices.length > 1 && last >= prices[prices.length - 2];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-64" preserveAspectRatio="none">
      <defs>
        <linearGradient id="replayfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={rising ? "#34d399" : "#f87171"} stopOpacity="0.22" />
          <stop offset="100%" stopColor={rising ? "#34d399" : "#f87171"} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${x(0)},${h} ${pts.join(" ")} ${x(visible.length - 1)},${h}`} fill="url(#replayfill)" />
      <polyline points={pts.join(" ")} fill="none" stroke={rising ? "#34d399" : "#f87171"} strokeWidth="2" strokeLinejoin="round" />
      {position && (
        <>
          <line x1="0" x2={w} y1={y(position.entryPrice)} y2={y(position.entryPrice)} stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="6 4" />
          <circle cx={x(position.entryIndex)} cy={y(position.entryPrice)} r="4" fill="#a78bfa" />
        </>
      )}
      <circle cx={x(visible.length - 1)} cy={y(last)} r="4.5" fill="#22d3ee" />
    </svg>
  );
}

export default function TimeMachinePage() {
  const [balance, setBalance] = useState<number | null>(null);
  const [assetIdx, setAssetIdx] = useState(0);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [stake, setStake] = useState(50);
  const [leverage, setLeverage] = useState(5);
  const [dateStr, setDateStr] = useState("");
  const [phase, setPhase] = useState<"setup" | "loading" | "playing" | "done">("setup");
  const [candles, setCandles] = useState<Candle[]>([]);
  const [revealed, setRevealed] = useState(0);
  const [position, setPosition] = useState<Position | null>(null);
  const [trades, setTrades] = useState<ClosedTrade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sessionLabel, setSessionLabel] = useState("");
  const positionRef = useRef<Position | null>(null);
  positionRef.current = position;

  const selected = ARENA_ASSETS[assetIdx];

  useEffect(() => {
    setBalance(loadArena().balance);
    return onArenaChange((s) => setBalance(s.balance));
  }, []);

  // Random date within the last year (at least 2 days back so the day is complete)
  const randomDay = () => {
    const daysBack = 2 + Math.floor(Math.random() * 360);
    const d = new Date(Date.now() - daysBack * 86400000);
    setDateStr(d.toISOString().slice(0, 10));
    return d.toISOString().slice(0, 10);
  };

  const startSession = async (chosenDate?: string) => {
    const day = chosenDate || dateStr || randomDay();
    setError(null);
    setPhase("loading");
    setTrades([]);
    setPosition(null);
    setRevealed(0);

    try {
      // Random 4-hour window inside that real day (UTC)
      const dayStart = new Date(`${day}T00:00:00Z`).getTime();
      if (!Number.isFinite(dayStart) || dayStart > Date.now() - 86400000) {
        throw new Error("Pick a completed day (yesterday or earlier).");
      }
      const hourOffset = Math.floor(Math.random() * 20); // 0–19h so a 4h window fits
      const startTime = dayStart + hourOffset * 3600000;

      const r = await fetch(
        `/api/candles?symbol=${selected.symbol}&interval=1m&limit=${SESSION_CANDLES}&startTime=${startTime}`
      );
      if (!r.ok) throw new Error(`History fetch failed (${r.status})`);
      const data = await r.json();
      if (!Array.isArray(data.candles) || data.candles.length < 60) {
        throw new Error("Not enough history for that day — try another date.");
      }
      setCandles(data.candles);
      setSessionLabel(
        `${selected.asset} · ${day} · ${String(hourOffset).padStart(2, "0")}:00 UTC`
      );
      setRevealed(2);
      setPhase("playing");
    } catch (e: any) {
      setError(e?.message || "Failed to load history");
      setPhase("setup");
    }
  };

  // Playback loop
  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => {
      setRevealed((r) => {
        if (r >= candles.length) return r;
        return r + 1;
      });
    }, SPEEDS[speedIdx].candleMs);
    return () => clearInterval(id);
  }, [phase, speedIdx, candles.length]);

  const currentPrice = revealed > 0 && candles.length > 0 ? candles[Math.min(revealed, candles.length) - 1].close : null;

  const closePosition = useCallback(
    (price: number) => {
      const pos = positionRef.current;
      if (!pos) return;
      const pnl = positionPnl(pos, price);
      creditBankroll(pos.stake + pnl); // stake back + P&L (pnl ≥ -stake)
      setTrades((t) => [{ direction: pos.direction, stake: pos.stake, leverage: pos.leverage, entryPrice: pos.entryPrice, exitPrice: price, pnl }, ...t]);
      if (pnl > 0) awardPoints("arena_win");
      setPosition(null);
    },
    []
  );

  // Liquidation + session end
  useEffect(() => {
    if (phase !== "playing" || currentPrice === null) return;
    const pos = positionRef.current;
    if (pos && positionPnl(pos, currentPrice) <= -pos.stake) {
      closePosition(currentPrice); // liquidated
    }
    if (revealed >= candles.length) {
      if (positionRef.current) closePosition(candles[candles.length - 1].close);
      setPhase("done");
    }
  }, [revealed, phase, currentPrice, candles, closePosition]);

  const openPosition = (direction: "long" | "short") => {
    setError(null);
    if (position) return;
    if (currentPrice === null) return;
    if (stake < MIN_STAKE) {
      setError(`Minimum stake is ${MIN_STAKE} XP`);
      return;
    }
    const res = debitBankroll(stake);
    if (!res.ok) {
      setError(`Insufficient bankroll (${res.balance} XP). Win some back in the Arena.`);
      return;
    }
    setPosition({ direction, stake, leverage, entryPrice: currentPrice, entryIndex: revealed - 1 });
    awardPoints("arena_bet");
  };

  const stopSession = () => {
    if (positionRef.current && currentPrice !== null) closePosition(currentPrice);
    setPhase("done");
  };

  const netPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const wins = trades.filter((t) => t.pnl > 0).length;
  const livePnl = position && currentPrice !== null ? positionPnl(position, currentPrice) : null;
  const progress = candles.length > 0 ? Math.round((revealed / candles.length) * 100) : 0;

  return (
    <main className="max-w-6xl mx-auto px-4 py-10 space-y-8">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <span className="section-chip">
          <BackwardIcon className="h-3.5 w-3.5" /> Real history · Compressed time
        </span>
        <h1 className="text-4xl md:text-5xl font-bold">
          The <span className="text-gradient-animated">Time Machine</span>
        </h1>
        <p className="text-gray-400 max-w-2xl">
          Trade any day from the last year, replayed candle-by-candle from real Binance
          history at up to 60×. Four market hours in four minutes — leverage included.
        </p>
        <div className="flex items-center gap-4 pt-1 text-sm">
          <span className="text-gray-400">
            Bankroll: <span className="text-gradient font-bold">{balance !== null ? balance.toLocaleString() : "—"} XP</span>
          </span>
          <Link href="/arena" className="text-cyan-300 hover:underline">← Live Arena</Link>
        </div>
      </motion.div>

      {error && <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      {/* ===== Setup ===== */}
      {(phase === "setup" || phase === "loading") && (
        <div className="glass-panel p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Market</label>
              <div className="flex gap-2 flex-wrap">
                {ARENA_ASSETS.map((a, i) => (
                  <button
                    key={a.symbol}
                    onClick={() => setAssetIdx(i)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                      i === assetIdx
                        ? "bg-violet-600/30 text-white border border-violet-500/60"
                        : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
                    }`}
                  >
                    {a.asset}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Day to replay</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateStr}
                  max={new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)}
                  min={new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="flex-1 bg-white/[0.04] border border-white/15 rounded-xl px-3 py-2 text-white text-sm focus:border-violet-500/60 focus:outline-none [color-scheme:dark]"
                />
                <button onClick={() => randomDay()} className="btn-ghost text-sm px-4 py-2">🎲 Random</button>
              </div>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Speed</label>
              <div className="flex gap-2">
                {SPEEDS.map((s, i) => (
                  <button
                    key={s.label}
                    onClick={() => setSpeedIdx(i)}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      i === speedIdx
                        ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/50"
                        : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => startSession()}
            disabled={phase === "loading"}
            className="btn-primary text-base disabled:opacity-50"
          >
            {phase === "loading" ? "Loading real history…" : <><PlayIcon className="h-5 w-5" /> Start the replay</>}
          </button>
        </div>
      )}

      {/* ===== Playing / Done ===== */}
      {(phase === "playing" || phase === "done") && (
        <div className="grid grid-cols-1 lg:grid-cols-[1.7fr_1fr] gap-6">
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-semibold text-white">{sessionLabel}</span>
              <div className="flex items-center gap-3">
                <span
                  className={`text-3xl font-bold font-display ${
                    livePnl !== null ? (livePnl >= 0 ? "text-emerald-400" : "text-red-400") : "text-white"
                  }`}
                >
                  {currentPrice ? `$${currentPrice.toLocaleString(undefined, { maximumFractionDigits: currentPrice < 10 ? 4 : 2 })}` : "—"}
                </span>
                {phase === "playing" && (
                  <button onClick={stopSession} className="p-2 rounded-lg bg-white/[0.06] border border-white/10 hover:border-red-500/50 transition-all" title="End session">
                    <StopIcon className="h-5 w-5 text-red-300" />
                  </button>
                )}
              </div>
            </div>

            {/* Progress */}
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>

            <ReplayChart candles={candles} revealed={revealed} position={position} />

            {phase === "playing" && !position && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Stake (XP)</label>
                    <div className="flex gap-2 flex-wrap">
                      {[25, 50, 100].map((v) => (
                        <button
                          key={v}
                          onClick={() => setStake(v)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            stake === v ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/50" : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
                          }`}
                        >
                          {v}
                        </button>
                      ))}
                      <input
                        type="number"
                        min={MIN_STAKE}
                        value={stake}
                        onChange={(e) => setStake(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-20 bg-white/[0.04] border border-white/15 rounded-lg px-2 py-1.5 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Leverage</label>
                    <div className="flex gap-2">
                      {LEVERAGES.map((l) => (
                        <button
                          key={l}
                          onClick={() => setLeverage(l)}
                          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                            leverage === l ? "bg-violet-500/25 text-violet-200 border border-violet-400/50" : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
                          }`}
                        >
                          {l}×
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => openPosition("long")} className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 py-4 font-bold text-emerald-300 hover:bg-emerald-500/25 transition-all">
                    <ArrowTrendingUpIcon className="h-5 w-5 inline mr-1.5" /> LONG {leverage}×
                  </button>
                  <button onClick={() => openPosition("short")} className="rounded-2xl border-2 border-red-500/50 bg-red-500/10 py-4 font-bold text-red-300 hover:bg-red-500/25 transition-all">
                    <ArrowTrendingDownIcon className="h-5 w-5 inline mr-1.5" /> SHORT {leverage}×
                  </button>
                </div>
              </div>
            )}

            {phase === "playing" && position && currentPrice !== null && (
              <div className="rounded-xl border border-violet-500/40 bg-violet-500/10 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    {position.direction === "long" ? <ArrowTrendingUpIcon className="h-5 w-5 text-emerald-400" /> : <ArrowTrendingDownIcon className="h-5 w-5 text-red-400" />}
                    {position.direction.toUpperCase()} {position.leverage}× · {position.stake} XP
                  </span>
                  <span className={`text-2xl font-bold ${livePnl !== null && livePnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {livePnl !== null && livePnl >= 0 ? "+" : ""}{livePnl} XP
                  </span>
                </div>
                <div className="text-xs text-gray-400">
                  entry ${position.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })} · liquidation at −{position.stake} XP
                </div>
                <button onClick={() => closePosition(currentPrice)} className="w-full btn-primary py-2.5">
                  Close position
                </button>
              </div>
            )}

            {phase === "done" && (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border border-white/15 bg-white/[0.04] p-6 text-center space-y-3">
                  <div className="text-4xl">{netPnl > 0 ? "🏆" : netPnl < 0 ? "💀" : "🤝"}</div>
                  <h3 className="text-2xl font-bold text-white">
                    Session over: <span className={netPnl >= 0 ? "text-emerald-400" : "text-red-400"}>{netPnl >= 0 ? "+" : ""}{netPnl} XP</span>
                  </h3>
                  <p className="text-sm text-gray-400">
                    {trades.length} trade{trades.length === 1 ? "" : "s"} · {wins} win{wins === 1 ? "" : "s"} — every candle was the real market.
                  </p>
                  <div className="flex gap-3 justify-center pt-2">
                    <button onClick={() => { setPhase("setup"); randomDay(); }} className="btn-primary text-sm">
                      <BoltIcon className="h-4 w-4" /> Another day
                    </button>
                    <Link href="/arena" className="btn-ghost text-sm">Go live →</Link>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>

          {/* Session trades */}
          <div className="glass-panel p-6 h-fit">
            <h3 className="text-sm font-semibold text-white mb-3">Session Trades</h3>
            {trades.length === 0 ? (
              <p className="text-sm text-gray-500">No trades yet. The past is waiting to be traded.</p>
            ) : (
              <ul className="space-y-2">
                {trades.map((t, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">
                      {t.pnl > 0 ? "🏆" : t.pnl < 0 ? "💀" : "🤝"} {t.direction.toUpperCase()} {t.leverage}×
                    </span>
                    <span className={t.pnl >= 0 ? "text-emerald-400 font-medium" : "text-red-400 font-medium"}>
                      {t.pnl >= 0 ? "+" : ""}{t.pnl} XP
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="glass-card p-5 text-xs text-gray-400 leading-relaxed">
        <span className="text-white font-semibold">How it works:</span> the Time Machine streams genuine
        1-minute Binance candles from the day you pick — nothing is generated or randomized. Your P&L is
        stake × leverage × the real price move, liquidation caps losses at your stake, and everything
        settles into the same XP bankroll as the live Arena.
      </div>
    </main>
  );
}
