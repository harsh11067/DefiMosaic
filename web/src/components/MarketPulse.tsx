"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { FireIcon } from "@heroicons/react/24/outline";

/**
 * Market Pulse — a live heatmap of the whole Binance USDT universe.
 * Real 24h stats, refreshed every 60s. Every tile is a door into the Arena.
 */

interface Tile {
  symbol: string;
  base: string;
  price: number;
  change: number;
  volume: number;
}

interface Pulse {
  updatedAt: number;
  breadth: { total: number; green: number; red: number; greenPct: number };
  tiles: Tile[];
}

function tileColor(change: number): string {
  const c = Math.max(-8, Math.min(8, change));
  if (c >= 0) {
    const a = 0.08 + (c / 8) * 0.45;
    return `rgba(52, 211, 153, ${a.toFixed(3)})`;
  }
  const a = 0.08 + (-c / 8) * 0.45;
  return `rgba(248, 113, 113, ${a.toFixed(3)})`;
}

export default function MarketPulse({ limit = 48 }: { limit?: number }) {
  const [pulse, setPulse] = useState<Pulse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const r = await fetch("/api/market/pulse");
        if (!r.ok) throw new Error();
        const data = await r.json();
        if (!cancelled && data.tiles) {
          setPulse(data);
          setFailed(false);
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  if (failed && !pulse) return null; // silent — the section simply doesn't render without real data

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="glass-panel p-6 space-y-4"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FireIcon className="h-5 w-5 text-orange-400" /> Market Pulse
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            The whole market, one glance — live 24h heat across {pulse?.breadth.total ?? "…"} pairs. Click a tile to duel it.
          </p>
        </div>
        {pulse && (
          <div className="min-w-[200px]">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-emerald-400 font-semibold">{pulse.breadth.green} green</span>
              <span className="text-red-400 font-semibold">{pulse.breadth.red} red</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-white/10 flex">
              <div className="bg-emerald-400/80" style={{ width: `${pulse.breadth.greenPct}%` }} />
              <div className="bg-red-400/70 flex-1" />
            </div>
            <div className="text-[10px] text-gray-500 mt-1 text-right uppercase tracking-widest">
              {pulse.breadth.greenPct}% of the market is up
            </div>
          </div>
        )}
      </div>

      {!pulse ? (
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5">
          {Array.from({ length: 32 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg shimmer" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-1.5">
          {pulse.tiles.slice(0, limit).map((t) => (
            <Link
              key={t.symbol}
              href={`/arena?s=${t.symbol}`}
              title={`${t.base} $${t.price} · ${t.change >= 0 ? "+" : ""}${t.change.toFixed(2)}% · duel it`}
              className="group h-14 rounded-lg border border-white/[0.06] p-1.5 flex flex-col justify-between transition-all hover:scale-[1.06] hover:border-white/30 hover:z-10"
              style={{ background: tileColor(t.change) }}
            >
              <span className="text-[11px] font-bold text-white leading-none truncate">{t.base}</span>
              <span className={`text-[10px] font-semibold leading-none ${t.change >= 0 ? "text-emerald-200" : "text-red-200"}`}>
                {t.change >= 0 ? "▲" : "▼"} {Math.abs(t.change).toFixed(1)}%
              </span>
            </Link>
          ))}
        </div>
      )}
    </motion.section>
  );
}
