"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { loadPoints, onPointsChange, levelFromXp, tierForLevel } from "@/lib/points";
import GoogleAuth from "@/components/GoogleAuth";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/bets", label: "Markets" },
  { href: "/arena", label: "Arena", hot: true },
];

export default function Header() {
  const pathname = usePathname();
  const [xp, setXp] = useState<number | null>(null);

  useEffect(() => {
    setXp(loadPoints().xp);
    return onPointsChange((s) => setXp(s.xp));
  }, []);

  const level = xp !== null ? levelFromXp(xp).level : 1;
  const tier = tierForLevel(level);

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#05060f]/70 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <span className="relative grid grid-cols-2 gap-[3px] w-7 h-7 transition-transform duration-300 group-hover:rotate-90">
            <span className="rounded-[3px] bg-gradient-to-br from-violet-500 to-violet-400" />
            <span className="rounded-[3px] bg-gradient-to-br from-sky-400 to-cyan-300" />
            <span className="rounded-[3px] bg-gradient-to-br from-cyan-300 to-emerald-300" />
            <span className="rounded-[3px] bg-gradient-to-br from-pink-400 to-violet-400" />
          </span>
          <span className="text-xl font-bold font-display tracking-tight">
            DeFi<span className="text-gradient">Mosaic</span>
          </span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1 md:gap-2">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                  active
                    ? "bg-violet-600/25 text-violet-200 border border-violet-500/40"
                    : "text-gray-300 hover:text-white hover:bg-white/[0.06]"
                }`}
              >
                {item.label}
                {(item as any).hot && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                )}
              </Link>
            );
          })}

          {/* Live XP chip */}
          {xp !== null && (
            <Link
              href="/dashboard"
              title={`${tier.name} tier — level ${level}`}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.04] text-sm hover:border-violet-500/40 transition-all"
            >
              <span>{tier.emoji}</span>
              <span className="font-semibold text-white">{xp.toLocaleString()}</span>
              <span className="text-gradient font-semibold text-xs">XP</span>
            </Link>
          )}

          <GoogleAuth />

          <div className="ml-1">
            <ConnectButton chainStatus={{ smallScreen: "icon", largeScreen: "full" }} showBalance={false} />
          </div>
        </nav>
      </div>
    </header>
  );
}
