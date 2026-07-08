"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BanknotesIcon,
  BoltIcon,
  BuildingLibraryIcon,
  ClockIcon,
  FireIcon,
  MagnifyingGlassIcon,
  TrophyIcon,
} from "@heroicons/react/24/outline";
import {
  ARENA_ASSETS,
  DURATIONS,
  HOUSE_BASE_LIQUIDITY,
  MIN_HOUSE_STAKE,
  MIN_STAKE,
  PAYOUT_MULTIPLIER,
  STARTER_BANKROLL,
  loadArena,
  onArenaChange,
  placeBet,
  rebuy,
  resolveDueBets,
  stakeHouse,
  withdrawHouse,
  encodeDuel,
  decodeDuel,
  verifyDuel,
  type ArenaBet,
  type ArenaState,
  type Direction,
  type DuelReceipt,
} from "@/lib/arena";
import ArenaChat from "@/components/ArenaChat";

const TICK_INTERVAL_MS = 2500;
const MAX_TICKS = 90;

interface Tick {
  price: number;
  ts: number;
}

interface MarketSymbol {
  symbol: string;
  base: string;
  class?: string;
}

const CLASS_BADGE: Record<string, { label: string; cls: string }> = {
  forex: { label: "FX", cls: "text-sky-300 border-sky-400/50 bg-sky-500/10" },
  gold: { label: "GOLD", cls: "text-amber-300 border-amber-400/50 bg-amber-500/10" },
  stable: { label: "STABLE", cls: "text-gray-300 border-white/20 bg-white/5" },
};

function fmtPrice(p: number) {
  return `$${p.toLocaleString(undefined, { maximumFractionDigits: p < 10 ? 5 : 2 })}`;
}

function Sparkline({ ticks }: { ticks: Tick[] }) {
  if (ticks.length < 2) {
    return <div className="h-28 shimmer rounded-lg" />;
  }
  const prices = ticks.map((t) => t.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;
  const w = 600;
  const h = 110;
  const pts = ticks.map((t, i) => {
    const x = (i / (ticks.length - 1)) * w;
    const y = h - ((t.price - min) / range) * (h - 10) - 5;
    return `${x},${y}`;
  });
  const rising = prices[prices.length - 1] >= prices[0];
  const stroke = rising ? "#34d399" : "#f87171";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-28" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sparkfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill="url(#sparkfill)" />
      <polyline points={pts.join(" ")} fill="none" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx={w} cy={h - ((prices[prices.length - 1] - min) / range) * (h - 10) - 5} r="4" fill="#22d3ee" />
    </svg>
  );
}

function Countdown({ bet, now }: { bet: ArenaBet; now: number }) {
  const total = bet.expiresAt - bet.placedAt;
  const left = Math.max(0, bet.expiresAt - now);
  const pct = Math.max(0, Math.min(100, (left / total) * 100));
  const secs = Math.ceil(left / 1000);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400 flex items-center gap-1">
          <ClockIcon className="h-3.5 w-3.5" /> {secs > 0 ? `${secs}s` : "settling…"}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${secs <= 5 ? "bg-red-400" : "bg-cyan-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function ArenaPage() {
  const [arena, setArena] = useState<ArenaState | null>(null);
  const [selected, setSelected] = useState<MarketSymbol>({ symbol: "BTCUSDT", base: "BTC" });
  const [universe, setUniverse] = useState<MarketSymbol[]>([]);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [stake, setStake] = useState(50);
  const [durationIdx, setDurationIdx] = useState(2); // 30s default
  const [mode, setMode] = useState<"paper" | "real">("paper");
  const [placing, setPlacing] = useState<Direction | null>(null);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  const [result, setResult] = useState<ArenaBet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [duel, setDuel] = useState<DuelReceipt | null>(null);
  const [duelStatus, setDuelStatus] = useState<"checking" | "verified" | "failed" | null>(null);
  const [houseInput, setHouseInput] = useState(100);
  const [houseMsg, setHouseMsg] = useState<string | null>(null);
  const lastPrice = useRef<number | null>(null);

  // ----- Arena state -----
  useEffect(() => {
    setArena(loadArena());
    return onArenaChange(setArena);
  }, []);

  // ----- Full market universe (400+ real Binance pairs) -----
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/arena/symbols");
        if (!r.ok) return;
        const data = await r.json();
        if (Array.isArray(data.symbols)) setUniverse(data.symbols);
      } catch {}
    })();
  }, []);

  // ----- ?s=SYMBOL deep link (Market Pulse tiles) + ?duel= receipts -----
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const s = params.get("s");
    if (s && /^[A-Z0-9]{5,20}$/.test(s.toUpperCase()) && s.toUpperCase().endsWith("USDT")) {
      const sym = s.toUpperCase();
      setSelected({ symbol: sym, base: sym.replace(/USDT$/, "") });
    }
    const token = params.get("duel");
    if (token) {
      const receipt = decodeDuel(token);
      if (receipt) {
        setDuel(receipt);
        setDuelStatus("checking");
        verifyDuel(receipt).then((v) => setDuelStatus(v.verified ? "verified" : "failed"));
      }
    }
  }, []);

  // ----- Price feed: seed with real 1m history, then live spot ticks -----
  useEffect(() => {
    setTicks([]);
    lastPrice.current = null;
    let cancelled = false;

    // Seed the chart instantly with the last hour of real closes
    (async () => {
      try {
        const r = await fetch(`/api/candles?symbol=${selected.symbol}&interval=1m&limit=${MAX_TICKS - 10}`);
        if (!r.ok) return;
        const data = await r.json();
        if (cancelled || !Array.isArray(data.candles)) return;
        const seed: Tick[] = data.candles.map((c: any) => ({ price: c.close, ts: c.time * 1000 }));
        setTicks((t) => (t.length > 0 ? t : seed));
        if (seed.length > 0 && lastPrice.current === null) lastPrice.current = seed[seed.length - 1].price;
      } catch {}
    })();

    const fetchTick = async () => {
      try {
        const r = await fetch(`/api/arena/price?symbol=${selected.symbol}`);
        if (!r.ok) return;
        const data = await r.json();
        if (cancelled || !Number.isFinite(data.price)) return;
        const prev = lastPrice.current;
        lastPrice.current = data.price;
        if (prev !== null && data.price !== prev) {
          setFlash(data.price > prev ? "up" : "down");
          setTimeout(() => setFlash(null), 450);
        }
        setTicks((t) => [...t.slice(-MAX_TICKS + 1), { price: data.price, ts: Date.now() }]);
      } catch {}
    };

    fetchTick();
    const id = setInterval(fetchTick, TICK_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [selected.symbol]);

  // ----- Clock + settlement loop -----
  const runResolve = useCallback(async () => {
    const settled = await resolveDueBets();
    if (settled.length > 0) {
      setResult(settled[settled.length - 1]);
      setTimeout(() => setResult(null), 6000);
    }
  }, []);

  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 300);
    const resolver = setInterval(runResolve, 2000);
    runResolve();
    return () => {
      clearInterval(clock);
      clearInterval(resolver);
    };
  }, [runResolve]);

  // ----- Actions -----
  const handleBet = (direction: Direction) => {
    setError(null);
    const price = lastPrice.current;
    if (!price) {
      setError("Waiting for a live price — one second.");
      return;
    }
    setPlacing(direction);
    const res = placeBet({
      symbol: selected.symbol,
      asset: selected.base,
      direction,
      stake,
      entryPrice: price,
      durationMs: DURATIONS[durationIdx].ms,
    });
    setTimeout(() => setPlacing(null), 350);
    if (!res.ok) setError(res.error);
  };

  const handleRebuy = () => {
    const s = rebuy();
    if (s) setArena(s);
  };

  const shareDuel = async (bet: ArenaBet) => {
    const token = encodeDuel(bet);
    if (!token) return;
    const url = `${window.location.origin}/arena?duel=${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(bet.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      prompt("Copy your duel receipt:", url);
    }
  };

  const handleStakeHouse = () => {
    setHouseMsg(null);
    const res = stakeHouse(houseInput);
    setHouseMsg(res.ok ? `Staked ${houseInput} XP into the book.` : res.error!);
  };

  const handleWithdrawHouse = () => {
    const res = withdrawHouse();
    setHouseMsg(res.ok ? `Withdrew ${res.returned} XP (stake + edge).` : "Nothing staked.");
  };

  const searchResults = query.trim()
    ? universe.filter((u) => u.base.toLowerCase().startsWith(query.trim().toLowerCase())).slice(0, 12)
    : [];

  if (!arena) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-10">
        <div className="glass-panel h-96 shimmer rounded-2xl" />
      </main>
    );
  }

  const openBets = arena.bets.filter((b) => b.status === "open");
  const history = arena.bets.filter((b) => b.status !== "open").slice(0, 8);
  const currentPrice = lastPrice.current;
  const winRate =
    arena.stats.wins + arena.stats.losses > 0
      ? Math.round((arena.stats.wins / (arena.stats.wins + arena.stats.losses)) * 100)
      : 0;
  const busted = arena.balance < MIN_STAKE && openBets.length === 0;
  const isFresh = arena.stats.wagered === 0;
  const houseShare = arena.house.staked > 0
    ? ((arena.house.staked / (arena.house.staked + HOUSE_BASE_LIQUIDITY)) * 100).toFixed(1)
    : null;

  return (
    <main className="max-w-7xl mx-auto px-4 py-10 space-y-8">
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
        <span className="section-chip">
          <span className="live-dot" /> {universe.length > 0 ? `${universe.length}+ live markets` : "Real market"} · Zero risk
        </span>
        <h1 className="text-4xl md:text-5xl font-bold">
          The <span className="text-gradient-animated">Arena</span>
        </h1>
        <p className="text-gray-400 max-w-2xl">
          Call the next move on any live market — crypto majors, alts, FX pairs, gold.
          Real Binance prices, 5-second to 5-minute expiries, wins pay{" "}
          <span className="text-white font-semibold">{PAYOUT_MULTIPLIER}×</span>.
        </p>
      </motion.div>

      {/* Incoming duel receipt */}
      {duel && (
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-5 border border-violet-500/40 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-white flex items-center gap-2">
              ⚔️ Duel receipt: {duel.asset} {duel.direction.toUpperCase()} · {duel.stake} XP
            </h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                duelStatus === "verified"
                  ? "text-emerald-300 border-emerald-500/50 bg-emerald-500/10"
                  : duelStatus === "failed"
                  ? "text-red-300 border-red-500/50 bg-red-500/10"
                  : "text-gray-300 border-white/20 bg-white/[0.04]"
              }`}
            >
              {duelStatus === "checking" && "⏳ verifying against Binance…"}
              {duelStatus === "verified" && "✓ VERIFIED on real market data"}
              {duelStatus === "failed" && "✗ could not verify this claim"}
            </span>
          </div>
          <p className="text-sm text-gray-400">
            {duel.status === "won" ? "They called it" : "The market called them"} — entry{" "}
            {fmtPrice(duel.entryPrice)} → exit {fmtPrice(duel.exitPrice)} ·{" "}
            {new Date(duel.expiresAt).toLocaleString()}. Your browser just re-checked the actual candle
            on Binance — no trust required.
          </p>
          <p className="text-sm text-white font-medium">
            Think you read the market better? Your {STARTER_BANKROLL} XP is loaded. 👇
          </p>
        </motion.div>
      )}

      {/* Welcome / bust banners */}
      {isFresh && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 flex items-center gap-3">
          <TrophyIcon className="h-6 w-6 text-emerald-300 flex-shrink-0" />
          <p className="text-sm text-emerald-200">
            <span className="font-semibold">Welcome, challenger.</span> Your starter bankroll of{" "}
            <span className="font-bold">{STARTER_BANKROLL} XP</span> is loaded. Pick any market, pick a side.
          </p>
        </motion.div>
      )}
      {busted && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-amber-200">
            <span className="font-semibold">Rekt.</span> The market humbled you — happens to everyone.
          </p>
          <button onClick={handleRebuy} className="btn-primary text-sm px-4 py-2">
            Reload {STARTER_BANKROLL} XP
          </button>
        </div>
      )}

      {/* Result toast */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-xl border p-4 flex items-center gap-3 ${
              result.status === "won"
                ? "border-emerald-500/50 bg-emerald-500/15"
                : result.status === "push"
                ? "border-sky-500/50 bg-sky-500/10"
                : "border-red-500/50 bg-red-500/10"
            }`}
          >
            <span className="text-2xl">{result.status === "won" ? "🏆" : result.status === "push" ? "🤝" : "💀"}</span>
            <div className="text-sm">
              <span className="font-semibold text-white">
                {result.status === "won"
                  ? `Nailed it! +${(result.payout ?? 0) - result.stake} XP`
                  : result.status === "push"
                  ? "Dead even — stake refunded."
                  : `The market disagreed. −${result.stake} XP`}
              </span>{" "}
              <span className="text-gray-400">
                {result.asset} {result.direction.toUpperCase()} · entry {fmtPrice(result.entryPrice)} → exit{" "}
                {fmtPrice(result.exitPrice ?? 0)}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6">
        {/* ===== Left: market + bet panel ===== */}
        <div className="space-y-6">
          <div className="glass-panel p-6 space-y-5">
            {/* Mode toggle */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex rounded-full border border-white/15 p-0.5 bg-white/[0.03]">
                <button
                  onClick={() => setMode("paper")}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                    mode === "paper" ? "bg-gradient-to-r from-violet-600 to-blue-600 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Paper · XP
                </button>
                <button
                  onClick={() => setMode("real")}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
                    mode === "real" ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white" : "text-gray-400 hover:text-white"
                  }`}
                >
                  Real · POL
                </button>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="live-dot" /> Binance live
              </span>
            </div>

            {mode === "real" ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5 space-y-3">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <BanknotesIcon className="h-5 w-5 text-emerald-300" /> Real stakes, on-chain
                </h3>
                <p className="text-sm text-gray-400">
                  Real-money positions run through the audited on-chain oracle pools — deposit POL, take a
                  side, settle trustlessly on Polygon. Grab test POL from the{" "}
                  <a href="https://faucet.polygon.technology/" target="_blank" rel="noopener noreferrer" className="text-emerald-300 hover:underline">
                    faucet
                  </a>{" "}
                  and step up.
                </p>
                <div className="flex gap-3">
                  <Link href="/bets" className="btn-primary text-sm">Open the on-chain markets →</Link>
                  <button onClick={() => setMode("paper")} className="btn-ghost text-sm">Stay on paper</button>
                </div>
              </div>
            ) : (
              <>
                {/* Market picker: featured + full-universe search */}
                <div className="flex flex-wrap items-center gap-2 relative">
                  {ARENA_ASSETS.map((a) => (
                    <button
                      key={a.symbol}
                      onClick={() => { setSelected({ symbol: a.symbol, base: a.asset }); setQuery(""); }}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                        a.symbol === selected.symbol
                          ? "bg-violet-600/30 text-white border border-violet-500/60"
                          : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
                      }`}
                    >
                      {a.asset}
                    </button>
                  ))}
                  <div className="relative flex-1 min-w-[160px]">
                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      value={query}
                      onChange={(e) => { setQuery(e.target.value); setSearchOpen(true); }}
                      onFocus={() => setSearchOpen(true)}
                      onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                      placeholder={`Search ${universe.length > 0 ? universe.length : "400"}+ markets…`}
                      className="w-full bg-white/[0.04] border border-white/15 rounded-full pl-9 pr-3 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none"
                    />
                    {searchOpen && searchResults.length > 0 && (
                      <div className="absolute top-full mt-2 left-0 right-0 z-30 glass-panel p-2 max-h-64 overflow-y-auto">
                        {searchResults.map((u) => (
                          <button
                            key={u.symbol}
                            onMouseDown={() => { setSelected(u); setQuery(""); setSearchOpen(false); }}
                            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-white/[0.06] hover:text-white transition-all"
                          >
                            <span className="font-semibold">{u.base}</span>
                            <span className="flex items-center gap-2">
                              {u.class && CLASS_BADGE[u.class] && (
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${CLASS_BADGE[u.class].cls}`}>
                                  {CLASS_BADGE[u.class].label}
                                </span>
                              )}
                              <span className="text-xs text-gray-500">{u.symbol}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Price */}
                <div>
                  <div
                    className={`text-5xl font-bold font-display transition-colors duration-300 ${
                      flash === "up" ? "text-emerald-400" : flash === "down" ? "text-red-400" : "text-white"
                    }`}
                  >
                    {currentPrice ? fmtPrice(currentPrice) : "—"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {selected.base} / USDT · live ticks every {TICK_INTERVAL_MS / 1000}s · seeded with the real last hour
                  </div>
                </div>

                <Sparkline ticks={ticks} />

                {/* Stake + duration */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Stake (XP)</label>
                    <div className="flex gap-2 flex-wrap">
                      {[25, 50, 100, 250].map((v) => (
                        <button
                          key={v}
                          onClick={() => setStake(v)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            stake === v
                              ? "bg-cyan-500/25 text-cyan-200 border border-cyan-400/50"
                              : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
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
                    <label className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Expiry</label>
                    <div className="flex gap-2 flex-wrap">
                      {DURATIONS.map((d, i) => (
                        <button
                          key={d.label}
                          onClick={() => setDurationIdx(i)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            i === durationIdx
                              ? "bg-violet-500/25 text-violet-200 border border-violet-400/50"
                              : "bg-white/[0.04] text-gray-400 border border-white/10 hover:text-white"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Payout preview */}
                <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
                  <span className="text-gray-400">
                    Risking <span className="text-white font-semibold">{stake} XP</span> on a{" "}
                    <span className="text-white font-semibold">{DURATIONS[durationIdx].label}</span> call to win
                  </span>
                  <span className="text-emerald-300 font-bold text-lg">
                    +{Math.floor(stake * PAYOUT_MULTIPLIER) - stake} XP
                  </span>
                </div>

                {error && <p className="text-sm text-red-400">{error}</p>}

                {/* LONG / SHORT */}
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleBet("long")}
                    disabled={placing !== null || !currentPrice}
                    className="group relative overflow-hidden rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 py-5 font-bold text-emerald-300 text-lg transition-all hover:bg-emerald-500/25 hover:shadow-[0_0_32px_rgba(52,211,153,0.35)] disabled:opacity-40"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <ArrowTrendingUpIcon className="h-6 w-6" /> LONG
                    </span>
                    <span className="block text-[11px] font-normal text-emerald-400/70 mt-0.5">price ends higher</span>
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handleBet("short")}
                    disabled={placing !== null || !currentPrice}
                    className="group relative overflow-hidden rounded-2xl border-2 border-red-500/50 bg-red-500/10 py-5 font-bold text-red-300 text-lg transition-all hover:bg-red-500/25 hover:shadow-[0_0_32px_rgba(248,113,113,0.35)] disabled:opacity-40"
                  >
                    <span className="flex items-center justify-center gap-2">
                      <ArrowTrendingDownIcon className="h-6 w-6" /> SHORT
                    </span>
                    <span className="block text-[11px] font-normal text-red-400/70 mt-0.5">price ends lower</span>
                  </motion.button>
                </div>
              </>
            )}
          </div>

          {/* The House — become the liquidity */}
          <div className="glass-panel p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <BuildingLibraryIcon className="h-5 w-5 text-amber-300" /> The House
                <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/40">
                  BE THE LIQUIDITY
                </span>
              </h3>
              <span className="text-xs text-gray-500">Book depth: {(HOUSE_BASE_LIQUIDITY + arena.house.staked).toLocaleString()} XP</span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              The house takes the other side of every duel: it keeps losing stakes and pays winning
              profits. Stake XP alongside the protocol's {HOUSE_BASE_LIQUIDITY.toLocaleString()} XP base
              book and earn a pro-rata share of the edge — or bleed with it. LP risk, for real.
            </p>
            {arena.house.staked > 0 ? (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white/[0.04] py-2">
                  <div className="text-lg font-bold text-white">{arena.house.staked.toLocaleString()}</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">Staked XP</div>
                </div>
                <div className="rounded-lg bg-white/[0.04] py-2">
                  <div className={`text-lg font-bold ${arena.house.earnings >= 0 ? "text-emerald-300" : "text-red-400"}`}>
                    {arena.house.earnings >= 0 ? "+" : ""}{Math.round(arena.house.earnings)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">Edge P&L</div>
                </div>
                <div className="rounded-lg bg-white/[0.04] py-2">
                  <div className="text-lg font-bold text-white">{houseShare}%</div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">Pool share</div>
                </div>
              </div>
            ) : null}
            <div className="flex gap-2 flex-wrap items-center">
              {arena.house.staked > 0 ? (
                <button onClick={handleWithdrawHouse} className="btn-ghost text-sm px-4 py-2">
                  Withdraw stake + edge
                </button>
              ) : (
                <>
                  <input
                    type="number"
                    min={MIN_HOUSE_STAKE}
                    value={houseInput}
                    onChange={(e) => setHouseInput(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-24 bg-white/[0.04] border border-white/15 rounded-lg px-2 py-2 text-sm text-white focus:border-amber-400/60 focus:outline-none"
                  />
                  <button onClick={handleStakeHouse} className="btn-primary text-sm px-4 py-2">
                    Stake into the book
                  </button>
                </>
              )}
              {houseMsg && <span className="text-xs text-amber-200">{houseMsg}</span>}
            </div>
          </div>
        </div>

        {/* ===== Right: bankroll, positions, chat, history ===== */}
        <div className="space-y-6">
          {/* Bankroll + stats */}
          <div className="glass-panel p-6">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-widest text-gray-400">Bankroll</span>
              <span className="flex items-center gap-1 text-xs text-orange-300">
                <FireIcon className="h-3.5 w-3.5" />
                streak {arena.stats.currentStreak}
              </span>
            </div>
            <div className="text-4xl font-bold text-gradient mt-1">{arena.balance.toLocaleString()} XP</div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div className="rounded-lg bg-white/[0.04] py-2">
                <div className="text-lg font-bold text-white">{winRate}%</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Win rate</div>
              </div>
              <div className="rounded-lg bg-white/[0.04] py-2">
                <div className="text-lg font-bold text-white">{arena.stats.wins}–{arena.stats.losses}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Record</div>
              </div>
              <div className="rounded-lg bg-white/[0.04] py-2">
                <div className="text-lg font-bold text-emerald-300">+{arena.stats.biggestWin}</div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500">Best win</div>
              </div>
            </div>
          </div>

          {/* Open positions */}
          <div className="glass-panel p-6">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <BoltIcon className="h-4 w-4 text-cyan-300" /> Live Positions
            </h3>
            {openBets.length === 0 ? (
              <p className="text-sm text-gray-500">No open positions. The market is waiting.</p>
            ) : (
              <div className="space-y-3">
                {openBets.map((bet) => {
                  const cur = bet.symbol === selected.symbol ? currentPrice : null;
                  const winningNow =
                    cur !== null &&
                    ((bet.direction === "long" && cur > bet.entryPrice) ||
                      (bet.direction === "short" && cur < bet.entryPrice));
                  return (
                    <div key={bet.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-white flex items-center gap-1.5">
                          {bet.direction === "long" ? (
                            <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-400" />
                          ) : (
                            <ArrowTrendingDownIcon className="h-4 w-4 text-red-400" />
                          )}
                          {bet.asset} {bet.direction.toUpperCase()}
                        </span>
                        <span className="text-gray-400">{bet.stake} XP</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>entry {fmtPrice(bet.entryPrice)}</span>
                        {cur !== null && (
                          <span className={winningNow ? "text-emerald-400 font-semibold" : "text-red-400 font-semibold"}>
                            {winningNow ? "▲ winning now" : "▼ losing now"}
                          </span>
                        )}
                      </div>
                      <Countdown bet={bet} now={now} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* The Pit */}
          <ArenaChat />

          {/* Time Machine cross-promo */}
          <Link
            href="/arena/replay"
            className="block glass-panel p-5 border border-cyan-500/30 hover:border-cyan-400/60 transition-all group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white flex items-center gap-2">
                  ⏪ The Time Machine
                  <span className="px-2 py-0.5 text-[10px] rounded-full bg-cyan-500/20 text-cyan-200 border border-cyan-400/40">NEW</span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Replay any real day from the last year at 60× — trade it with leverage.
                </p>
              </div>
              <span className="text-cyan-300 text-xl group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </Link>

          {/* History */}
          <div className="glass-panel p-6">
            <h3 className="text-sm font-semibold text-white mb-3">Recent Duels</h3>
            {history.length === 0 ? (
              <p className="text-sm text-gray-500">Your record starts with the first call.</p>
            ) : (
              <ul className="space-y-2">
                {history.map((bet) => (
                  <li key={bet.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="text-gray-300 truncate">
                      {bet.status === "won" ? "🏆" : bet.status === "push" ? "🤝" : "💀"} {bet.asset}{" "}
                      {bet.direction.toUpperCase()}
                    </span>
                    <span className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={
                          bet.status === "won"
                            ? "text-emerald-400 font-medium"
                            : bet.status === "push"
                            ? "text-sky-300"
                            : "text-red-400 font-medium"
                        }
                      >
                        {bet.status === "won" ? `+${(bet.payout ?? 0) - bet.stake}` : bet.status === "push" ? "±0" : `−${bet.stake}`}{" "}
                        XP
                      </span>
                      <button
                        onClick={() => shareDuel(bet)}
                        title="Copy verifiable duel receipt"
                        className="px-2 py-0.5 rounded-md text-[11px] border border-white/15 text-gray-400 hover:text-white hover:border-violet-500/50 transition-all"
                      >
                        {copiedId === bet.id ? "✓ copied" : "share"}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* How settlement works — full transparency */}
      <div className="glass-card p-5 text-xs text-gray-400 leading-relaxed">
        <span className="text-white font-semibold">How settlement works:</span> your entry price is the live
        Binance price the instant you bet. At expiry the position settles against the real market print —
        the live tick, or the actual candle close (1-second candles for short expiries) if you closed the
        tab. Wins pay {PAYOUT_MULTIPLIER}× your stake, a dead-even price refunds it, and the House book
        takes the other side of every duel. Same engine as trading real size — only the bankroll is XP.
        Ready for real stakes? Flip the <span className="text-emerald-300 font-medium">Real · POL</span>{" "}
        switch.
      </div>
    </main>
  );
}
