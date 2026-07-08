"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ArrowRightIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  BoltIcon,
  ChartBarIcon,
  CpuChipIcon,
  CursorArrowRaysIcon,
  LinkIcon,
  ShieldCheckIcon,
  TrophyIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

interface TickerCoin {
  symbol: string;
  price: number;
  change: number;
}

const FALLBACK_TICKER: TickerCoin[] = [
  { symbol: "BTC", price: 63241, change: 0.99 },
  { symbol: "ETH", price: 1776, change: 1.14 },
  { symbol: "SOL", price: 81.26, change: 1.45 },
  { symbol: "POL", price: 0.42, change: 2.31 },
  { symbol: "AVAX", price: 24.18, change: -0.62 },
  { symbol: "LINK", price: 13.77, change: 0.85 },
  { symbol: "UNI", price: 7.92, change: -1.12 },
  { symbol: "AAVE", price: 152.4, change: 3.05 },
];

const FEATURES = [
  {
    icon: LinkIcon,
    title: "Cascading Predictions",
    description:
      "Stack conviction on conviction. Collateral unlocks a loan, the loan funds the next call — one green chain and the whole tree pays.",
    gradient: "from-violet-600/30 to-purple-500/10",
    iconColor: "text-violet-300",
  },
  {
    icon: UsersIcon,
    title: "Copy the Killers",
    description:
      "Shadow the sharpest wallets with transparent 0–20% fees — or list your own strategy and get paid for being right.",
    gradient: "from-pink-600/30 to-rose-500/10",
    iconColor: "text-pink-300",
  },
  {
    icon: BoltIcon,
    title: "The Arena",
    description:
      "Live Binance prices, 5-second duels, 1.9× payouts across 400+ markets. 500 XP on the house — the market is real, the damage isn't.",
    gradient: "from-amber-600/30 to-yellow-500/10",
    iconColor: "text-amber-300",
  },
  {
    icon: CpuChipIcon,
    title: "AI Allocator",
    description:
      "Feed it your risk appetite; it returns a portfolio across lending, staking and LPs with live APY baked in.",
    gradient: "from-cyan-600/30 to-sky-500/10",
    iconColor: "text-cyan-300",
  },
  {
    icon: ChartBarIcon,
    title: "On-chain Pools",
    description:
      "Oracle-settled price pools on Polygon. Deposit POL, pick a side, claim 2× when the chart agrees with you.",
    gradient: "from-emerald-600/30 to-teal-500/10",
    iconColor: "text-emerald-300",
  },
  {
    icon: TrophyIcon,
    title: "Mosaic Points",
    description:
      "Every move mints XP. Streaks, quests, five tiers from Bronze to Diamond — and Pro multipliers on the horizon.",
    gradient: "from-blue-600/30 to-indigo-500/10",
    iconColor: "text-blue-300",
  },
];

const ARSENAL = [
  {
    emoji: "⚔️",
    title: "The Arena",
    stat: "400+ live markets",
    desc: "5-second duels against real Binance prints. Entry locked on click, settled by the actual candle. 500 XP on the house.",
    href: "/arena",
    accent: "border-amber-500/40 hover:border-amber-400/70",
  },
  {
    emoji: "⏪",
    title: "Time Machine",
    stat: "365 days of history",
    desc: "Bar-replay any real day at 60× with 1–10× leverage. TradingView charges for this. We gamified it.",
    href: "/arena/replay",
    accent: "border-cyan-500/40 hover:border-cyan-400/70",
  },
  {
    emoji: "🏦",
    title: "The House",
    stat: "Be the liquidity",
    desc: "Stake XP into the book that underwrites every duel. Earn the edge — or bleed with it. LP risk, for real.",
    href: "/arena",
    accent: "border-emerald-500/40 hover:border-emerald-400/70",
  },
  {
    emoji: "🧾",
    title: "Duel Receipts",
    stat: "Trustless brags",
    desc: "Share any win as a link the viewer's own browser re-verifies against public market data. Unfakeable.",
    href: "/arena",
    accent: "border-violet-500/40 hover:border-violet-400/70",
  },
  {
    emoji: "🔥",
    title: "Market Pulse",
    stat: "The whole market, one glance",
    desc: "A live heatmap of every USDT pair on Binance. Breadth, heat, volume leaders — every tile is a door into the Arena.",
    href: "/bets",
    accent: "border-pink-500/40 hover:border-pink-400/70",
  },
];

const STEPS = [
  {
    step: "01",
    title: "Jack in",
    description: "Wallet on Polygon Amoy, test POL from the faucet — or skip straight to the Arena with zero setup.",
  },
  {
    step: "02",
    title: "Pick your poison",
    description: "Duel the chart in the Arena, open an oracle pool, chain a leveraged prediction or copy a top strategy.",
  },
  {
    step: "03",
    title: "Stack the mosaic",
    description: "Claim wins, keep the streak, climb the tiers. Every tile you add compounds the edge.",
  },
];

const STATS = [
  { value: "1.9×", label: "Arena payout" },
  { value: "400+", label: "Live markets" },
  { value: "500", label: "Free XP bankroll" },
  { value: "24/7", label: "Real price feeds" },
];

const ORBIT_RING_1 = [
  { glyph: "₿", angle: 0, bg: "linear-gradient(135deg, rgba(247,147,26,0.85), rgba(247,147,26,0.35))" },
  { glyph: "Ξ", angle: 180, bg: "linear-gradient(135deg, rgba(139,157,252,0.85), rgba(139,157,252,0.35))" },
];
const ORBIT_RING_2 = [
  { glyph: "◎", angle: 45, bg: "linear-gradient(135deg, rgba(20,241,149,0.7), rgba(20,241,149,0.25))" },
  { glyph: "⬡", angle: 165, bg: "linear-gradient(135deg, rgba(130,71,229,0.85), rgba(130,71,229,0.35))" },
  { glyph: "⚔", angle: 285, bg: "linear-gradient(135deg, rgba(251,191,36,0.75), rgba(251,191,36,0.3))" },
];

export default function Home() {
  const [ticker, setTicker] = useState<TickerCoin[]>(FALLBACK_TICKER);
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  // Live ticker (real CoinGecko)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false"
        );
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !Array.isArray(data)) return;
        setTicker(
          data.map((c: any) => ({
            symbol: (c.symbol || "").toUpperCase(),
            price: c.current_price ?? 0,
            change: c.price_change_percentage_24h ?? 0,
          }))
        );
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Live BTC for the Arena scene (real Binance via proxy)
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch("/api/arena/price?symbol=BTCUSDT");
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled && Number.isFinite(d.price)) setBtcPrice(d.price);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 4000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // ================= GSAP cinematics =================
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    gsap.registerPlugin(ScrollTrigger);
    let wordTimer = 0;

    const ctx = gsap.context(() => {
      // Hero: char-by-char rise
      gsap.fromTo(
        ".hero-char",
        { yPercent: 120, opacity: 0, rotateX: -80 },
        { yPercent: 0, opacity: 1, rotateX: 0, stagger: 0.035, duration: 0.9, ease: "power4.out", delay: 0.15 }
      );
      gsap.fromTo(
        ".hero-fade",
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, stagger: 0.12, duration: 0.8, ease: "power3.out", delay: 0.7 }
      );

      // Hero parallax exit on scroll
      gsap.to(".hero-inner", {
        yPercent: -18,
        opacity: 0.15,
        scale: 0.95,
        ease: "none",
        scrollTrigger: { trigger: ".hero-scene", start: "top top", end: "bottom top", scrub: true },
      });

      // Market Totem: orbiting rings + counter-rotated satellites + idle sway
      gsap.to(".orbit-ring-1", { rotate: 360, duration: 18, repeat: -1, ease: "none" });
      gsap.to(".orbit-ring-2", { rotate: -360, duration: 28, repeat: -1, ease: "none" });
      gsap.to(".orbit-ring-1 .orbit-sat", { rotate: -360, duration: 18, repeat: -1, ease: "none" });
      gsap.to(".orbit-ring-2 .orbit-sat", { rotate: 360, duration: 28, repeat: -1, ease: "none" });
      gsap.to(".totem", { rotateX: 10, rotateY: -12, yoyo: true, repeat: -1, duration: 5.5, ease: "sine.inOut" });
      gsap.to(".totem", {
        rotateY: 30,
        ease: "none",
        scrollTrigger: { trigger: ".hero-scene", start: "top top", end: "+=900", scrub: 1 },
      });

      // Rotating tagline word
      const words = ["MOVE.", "PUMP.", "DIP.", "CANDLE.", "MARKET."];
      let wi = 0;
      const wordEl = document.querySelector<HTMLElement>(".rotate-word");
      if (wordEl) {
        wordTimer = window.setInterval(() => {
          wi = (wi + 1) % words.length;
          gsap.to(wordEl, {
            yPercent: -110,
            opacity: 0,
            duration: 0.32,
            ease: "power2.in",
            onComplete: () => {
              wordEl.textContent = words[wi];
              gsap.fromTo(
                wordEl,
                { yPercent: 110, opacity: 0 },
                { yPercent: 0, opacity: 1, duration: 0.32, ease: "power2.out" }
              );
            },
          });
        }, 2600);
      }

      // Horizontal-scroll ARSENAL: pin the scene, scrub the track sideways
      const track = document.querySelector<HTMLElement>(".arsenal-track");
      if (track) {
        const scrollLen = () => track.scrollWidth - window.innerWidth;
        gsap.to(track, {
          x: () => -scrollLen(),
          ease: "none",
          scrollTrigger: {
            trigger: ".arsenal-scene",
            start: "top top",
            end: () => `+=${scrollLen()}`,
            scrub: 1,
            pin: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
      }

      // Floating tiles drift
      gsap.utils.toArray<HTMLElement>(".float-tile").forEach((el, i) => {
        gsap.to(el, {
          y: () => gsap.utils.random(-28, 28),
          x: () => gsap.utils.random(-18, 18),
          rotation: gsap.utils.random(-14, 14),
          duration: gsap.utils.random(4, 7),
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
          delay: i * 0.3,
        });
      });

      // Giant word band scrub
      gsap.fromTo(
        ".word-band",
        { xPercent: 8 },
        { xPercent: -42, ease: "none", scrollTrigger: { trigger: ".band-scene", start: "top bottom", end: "bottom top", scrub: true } }
      );

      // Feature cards batch reveal
      ScrollTrigger.batch(".feature-card", {
        start: "top 88%",
        onEnter: (els) =>
          gsap.fromTo(els, { y: 56, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.09, duration: 0.7, ease: "power3.out" }),
        once: true,
      });

      // Arena scene parallax split
      gsap.fromTo(
        ".arena-copy",
        { x: -60, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".arena-scene", start: "top 70%", once: true } }
      );
      gsap.fromTo(
        ".arena-panel",
        { x: 60, opacity: 0, rotateY: -14 },
        { x: 0, opacity: 1, rotateY: 0, duration: 0.9, ease: "power3.out", scrollTrigger: { trigger: ".arena-scene", start: "top 70%", once: true } }
      );

      // Steps stagger
      ScrollTrigger.batch(".step-card", {
        start: "top 85%",
        onEnter: (els) =>
          gsap.fromTo(els, { x: -48, opacity: 0 }, { x: 0, opacity: 1, stagger: 0.15, duration: 0.7, ease: "power3.out" }),
        once: true,
      });

      // Stats counter pop
      ScrollTrigger.batch(".stat-card", {
        start: "top 90%",
        onEnter: (els) =>
          gsap.fromTo(els, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, stagger: 0.08, duration: 0.55, ease: "back.out(1.8)" }),
        once: true,
      });
    }, rootRef);

    // Mouse parallax on hero tiles + totem
    const onMove = (e: MouseEvent) => {
      const { innerWidth: w, innerHeight: h } = window;
      const dx = (e.clientX / w - 0.5) * 2;
      const dy = (e.clientY / h - 0.5) * 2;
      gsap.to(".parallax-slow", { x: dx * 14, y: dy * 10, duration: 0.8, ease: "power2.out" });
      gsap.to(".parallax-fast", { x: dx * 32, y: dy * 22, duration: 0.6, ease: "power2.out" });
    };
    heroRef.current?.addEventListener("mousemove", onMove);

    return () => {
      heroRef.current?.removeEventListener("mousemove", onMove);
      if (wordTimer) clearInterval(wordTimer);
      ctx.revert();
    };
  }, []);

  // 3D tilt on feature cards
  const handleTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `rotateY(${px * 10}deg) rotateX(${-py * 10}deg) translateZ(0)`;
  };
  const resetTilt = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "rotateY(0deg) rotateX(0deg)";
  };

  const heroLine1 = "OWN THE";
  const heroLine2 = "NEXT";
  const tickerItems = [...ticker, ...ticker];

  return (
    <div ref={rootRef} className="min-h-screen overflow-x-hidden">
      {/* ================= HERO ================= */}
      <section ref={heroRef} className="hero-scene relative min-h-[92vh] flex items-center">
        <div className="hero-inner max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] items-center gap-10 pt-10">
          <div>
            <span className="hero-fade section-chip mb-8 opacity-0">
              <span className="live-dot" /> Live on Polygon Amoy · No signup, no risk
            </span>

            <h1 className="font-hero font-extrabold leading-[1.02] text-5xl sm:text-6xl lg:text-7xl xl:text-8xl mt-6 [perspective:600px]">
              <span className="block overflow-hidden pb-1">
                {heroLine1.split("").map((ch, i) => (
                  <span key={`a${i}`} className="hero-char inline-block will-change-transform">
                    {ch === " " ? " " : ch}
                  </span>
                ))}
              </span>
              <span className="block overflow-hidden text-gradient-animated pb-2">
                {heroLine2.split("").map((ch, i) => (
                  <span key={`b${i}`} className="hero-char inline-block will-change-transform">
                    {ch}
                  </span>
                ))}
                <span className="hero-char inline-block">{" "}</span>
                <span className="inline-block overflow-hidden align-bottom">
                  <span className="rotate-word hero-char inline-block will-change-transform">MOVE.</span>
                </span>
              </span>
            </h1>

            <p className="hero-fade mt-6 text-lg md:text-xl text-gray-400 max-w-xl opacity-0">
              Cascading predictions. Copy trading. A live-market arena that pays out in
              pure adrenaline. One protocol — every edge.
            </p>

            <div className="hero-fade mt-10 flex flex-col sm:flex-row gap-4 opacity-0">
              <Link href="/arena" className="btn-primary text-base">
                Enter the Arena — 500 XP free <ArrowRightIcon className="h-5 w-5" />
              </Link>
              <Link href="/dashboard" className="btn-ghost text-base">
                <CursorArrowRaysIcon className="h-5 w-5" /> Launch Terminal
              </Link>
            </div>
          </div>

          {/* Market Totem: portfolio core, orbiting markets, live candles */}
          <div className="hidden lg:flex justify-center perspective-1200 parallax-slow">
            <div className="totem">
              <div className="orbit-ring orbit-ring-1">
                {ORBIT_RING_1.map((s2) => (
                  <div
                    key={s2.angle}
                    className="sat-slot"
                    style={{ transform: `rotate(${s2.angle}deg) translate(125px) rotate(${-s2.angle}deg)` }}
                  >
                    <div className="orbit-sat" style={{ background: s2.bg }}>{s2.glyph}</div>
                  </div>
                ))}
              </div>
              <div className="orbit-ring orbit-ring-2">
                {ORBIT_RING_2.map((s2) => (
                  <div
                    key={s2.angle}
                    className="sat-slot"
                    style={{ transform: `rotate(${s2.angle}deg) translate(190px) rotate(${-s2.angle}deg)` }}
                  >
                    <div className="orbit-sat" style={{ background: s2.bg }}>{s2.glyph}</div>
                  </div>
                ))}
              </div>
              <div className="totem-core" title="Your portfolio, at the center of every market">
                <span /><span /><span /><span />
              </div>
              <div className="totem-candles" aria-hidden="true">
                <div className="totem-candle up" style={{ height: "40%" }} />
                <div className="totem-candle down" style={{ height: "62%" }} />
                <div className="totem-candle up" style={{ height: "85%" }} />
                <div className="totem-candle up" style={{ height: "55%" }} />
                <div className="totem-candle down" style={{ height: "72%" }} />
                <div className="totem-candle up" style={{ height: "95%" }} />
                <div className="totem-candle up" style={{ height: "66%" }} />
              </div>
            </div>
          </div>
        </div>

        {/* Floating tiles */}
        <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
          <div className="float-tile parallax-fast absolute left-[6%] top-[20%] w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600/40 to-transparent border border-violet-500/30" />
          <div className="float-tile parallax-slow absolute right-[12%] top-[16%] w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/40 to-transparent border border-cyan-400/30" />
          <div className="float-tile parallax-fast absolute left-[16%] bottom-[12%] w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500/40 to-transparent border border-pink-400/30" />
          <div className="float-tile parallax-slow absolute right-[24%] bottom-[20%] w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/30 to-transparent border border-emerald-400/30" />
        </div>
      </section>

      {/* ================= TICKER ================= */}
      <div className="border-y border-white/[0.07] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
        <div className="flex w-max animate-ticker py-3">
          {tickerItems.map((coin, i) => (
            <div key={`${coin.symbol}-${i}`} className="flex items-center gap-2 px-6 whitespace-nowrap">
              <span className="font-semibold text-white text-sm">{coin.symbol}</span>
              <span className="text-gray-400 text-sm">
                ${coin.price >= 1000 ? coin.price.toLocaleString(undefined, { maximumFractionDigits: 0 }) : coin.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
              </span>
              <span className={`text-xs font-medium ${coin.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {coin.change >= 0 ? "▲" : "▼"} {Math.abs(coin.change).toFixed(2)}%
              </span>
              <span className="ml-4 text-white/10">◆</span>
            </div>
          ))}
        </div>
      </div>

      {/* ================= BRUTALIST MANIFESTO BAND ================= */}
      <div className="brutal-band py-3 overflow-hidden select-none" aria-hidden="true">
        <div className="flex w-max animate-ticker text-[11px] font-bold text-white/90">
          {Array(2)
            .fill([
              "REAL PRICES ONLY",
              "SETTLED BY THE MARKET",
              "500 XP ON ARRIVAL",
              "400+ LIVE PAIRS",
              "RECEIPTS YOU CAN'T FAKE",
              "THE HOUSE IS HIRING",
            ])
            .flat()
            .map((t, i) => (
              <span key={i} className="flex items-center">
                <span className="px-6">{t}</span>
                <span className="text-violet-400">✦</span>
              </span>
            ))}
        </div>
      </div>

      {/* ================= GIANT WORD BAND ================= */}
      <section className="band-scene py-20 overflow-hidden select-none" aria-hidden="true">
        <div className="word-band text-outline">
          PREDICT&nbsp;·&nbsp;CHAIN&nbsp;·&nbsp;<span className="text-gradient" style={{ WebkitTextStroke: "0px" }}>PROSPER</span>&nbsp;·&nbsp;REPEAT&nbsp;·&nbsp;PREDICT&nbsp;·&nbsp;CHAIN&nbsp;·&nbsp;PROSPER
        </div>
      </section>

      {/* ================= STATS ================= */}
      <section className="pb-10">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS.map((s) => (
            <div key={s.label} className="stat-card glass-card p-6 text-center opacity-0">
              <div className="text-3xl md:text-4xl font-bold text-gradient font-display">{s.value}</div>
              <div className="mt-1 text-xs uppercase tracking-widest text-gray-400">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= THE ARSENAL (horizontal scroll) ================= */}
      <section className="arsenal-scene relative overflow-hidden py-16 min-h-screen flex flex-col justify-center">
        <div className="max-w-7xl mx-auto px-4 w-full mb-10">
          <span className="section-chip">The Arsenal</span>
          <h2 className="mt-4 text-3xl md:text-5xl font-bold font-display">
            Weapons of mass <span className="text-gradient-animated">speculation</span>
          </h2>
          <p className="mt-3 text-gray-400">Keep scrolling — the belt feeds sideways.</p>
        </div>
        <div className="arsenal-track pl-[max(1rem,calc((100vw-80rem)/2))] pr-8">
          {ARSENAL.map((w) => (
            <Link
              key={w.title}
              href={w.href}
              className={`arsenal-card glass-panel p-8 border ${w.accent} transition-all group flex flex-col justify-between min-h-[260px]`}
            >
              <div>
                <div className="text-4xl mb-4">{w.emoji}</div>
                <h3 className="text-2xl font-bold text-white font-display">{w.title}</h3>
                <div className="text-xs uppercase tracking-widest text-gray-500 mt-1 mb-3">{w.stat}</div>
                <p className="text-sm text-gray-400 leading-relaxed">{w.desc}</p>
              </div>
              <span className="mt-6 text-sm font-semibold text-gradient inline-flex items-center gap-1 group-hover:gap-2.5 transition-all">
                Deploy it →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="section-chip">The Mosaic</span>
            <h2 className="mt-4 text-3xl md:text-5xl font-bold font-display">
              Six tiles. <span className="text-gradient">One weapon.</span>
            </h2>
            <p className="mt-4 text-gray-400 text-lg max-w-2xl mx-auto">
              Each piece stands alone. Assembled, they compound.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 perspective-1200">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                onMouseMove={handleTilt}
                onMouseLeave={resetTilt}
                className="feature-card tilt-card glass-card p-6 opacity-0 hover:border-violet-500/50"
              >
                <span className={`inline-flex p-3 rounded-2xl bg-gradient-to-br ${feature.gradient} border border-white/10 mb-4`}>
                  <feature.icon className={`h-7 w-7 ${feature.iconColor}`} />
                </span>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= ARENA SCENE ================= */}
      <section className="arena-scene py-24">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="arena-copy opacity-0">
            <span className="section-chip">
              <span className="live-dot" /> The Arena
            </span>
            <h2 className="mt-4 text-4xl md:text-6xl font-bold font-hero leading-tight">
              FEEL THE MARKET.
              <br />
              <span className="text-gradient-warm">RISK NOTHING.</span>
            </h2>
            <p className="mt-5 text-gray-400 text-lg">
              Five-second duels against live Binance prices across 400+ markets. Your entry
              is locked the instant you click, settlement is the real market print at expiry.
              We stake you <span className="text-white font-semibold">500 XP</span> — the
              heartbeat is yours.
            </p>
            <Link href="/arena" className="btn-primary text-base mt-8 inline-flex">
              Claim 500 XP &amp; duel <BoltIcon className="h-5 w-5" />
            </Link>
          </div>

          {/* Live preview panel */}
          <div className="arena-panel glass-panel p-6 opacity-0 [transform-style:preserve-3d]">
            <div className="flex items-center justify-between mb-4">
              <span className="font-semibold text-white">BTC / USDT</span>
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="live-dot" /> live
              </span>
            </div>
            <div className="text-4xl font-bold font-display text-white mb-6">
              {btcPrice ? `$${btcPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—"}
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 py-4 text-center font-bold text-emerald-300">
                <ArrowTrendingUpIcon className="h-5 w-5 inline mr-1" /> LONG
              </div>
              <div className="rounded-2xl border-2 border-red-500/50 bg-red-500/10 py-4 text-center font-bold text-red-300">
                <ArrowTrendingDownIcon className="h-5 w-5 inline mr-1" /> SHORT
              </div>
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>Stake 50 XP</span>
              <span className="text-emerald-300 font-semibold">Win +45 XP</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= STEPS ================= */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <span className="section-chip">Zero to Degen</span>
            <h2 className="mt-4 text-3xl md:text-5xl font-bold font-display">
              Three moves to <span className="text-gradient-warm">first blood</span>
            </h2>
          </div>

          <div className="relative">
            <div className="absolute left-8 top-8 bottom-8 w-px bg-gradient-to-b from-violet-500 via-cyan-400 to-pink-500 hidden md:block" aria-hidden="true" />
            <div className="space-y-8">
              {STEPS.map((step) => (
                <div key={step.step} className="step-card relative flex items-start gap-6 glass-card p-6 md:ml-20 opacity-0">
                  <div className="absolute -left-[4.5rem] top-1/2 -translate-y-1/2 hidden md:flex w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 items-center justify-center text-white font-bold text-lg shadow-lg shadow-violet-600/30">
                    {step.step}
                  </div>
                  <div className="md:hidden flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center text-white font-bold">
                    {step.step}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-1">{step.title}</h3>
                    <p className="text-gray-400 text-sm">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-white/[0.07] py-14 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2.5 mb-2">
                <span className="grid grid-cols-2 gap-[3px] w-6 h-6">
                  <span className="rounded-[2px] bg-gradient-to-br from-violet-500 to-violet-400" />
                  <span className="rounded-[2px] bg-gradient-to-br from-sky-400 to-cyan-300" />
                  <span className="rounded-[2px] bg-gradient-to-br from-cyan-300 to-emerald-300" />
                  <span className="rounded-[2px] bg-gradient-to-br from-pink-400 to-violet-400" />
                </span>
                <span className="text-xl font-bold font-display">
                  DeFi<span className="text-gradient">Mosaic</span>
                </span>
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-2 justify-center md:justify-start">
                <ShieldCheckIcon className="h-4 w-4" />
                Polygon · Chainlink-compatible oracles · OpenZeppelin secured
              </p>
            </div>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/arena" className="text-gray-400 hover:text-white transition-colors">Arena</Link>
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Dashboard</Link>
              <Link href="/bets" className="text-gray-400 hover:text-white transition-colors">Markets</Link>
              <a href="https://faucet.polygon.technology/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">
                Faucet ↗
              </a>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
