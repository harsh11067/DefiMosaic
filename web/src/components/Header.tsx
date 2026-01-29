"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Header() {
  return (
    <header className="w-full border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold">
          DeFiMosaic
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          <Link href="/bets" className="hover:underline">
            Bets
          </Link>
          <ConnectButton chainStatus={{ smallScreen: "icon", largeScreen: "full" }} />
        </nav>
      </div>
    </header>
  );
}



