"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { TrophyIcon } from '@heroicons/react/24/solid';

interface LeaderboardEntry {
  strategyId: number;
  name: string;
  creator?: string; // make optional
  todayGains: number;
  rank: number;
  feeBPS?: number;
}

interface StrategyLeaderboardProps {
  entries: LeaderboardEntry[];
}

export default function StrategyLeaderboard({ entries }: StrategyLeaderboardProps) {
  const getRankColor = (rank: number) => {
    if (rank === 1) return 'text-yellow-400 bg-yellow-400/20';
    if (rank === 2) return 'text-gray-300 bg-gray-300/20';
    if (rank === 3) return 'text-orange-400 bg-orange-400/20';
    return 'text-gray-400';
  };

  const getRankIcon = (rank: number) => {
    if (rank <= 3) {
      return <TrophyIcon className="h-5 w-5" />;
    }
    return <span className="text-lg font-bold">#{rank}</span>;
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(2)}K`;
    return `$${amount.toFixed(2)}`;
  };

  // Accept possibly undefined addr and return a safe string
  const formatAddress = (addr?: string) => {
    if (!addr) return 'Unknown';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };
  
  
  // debug: optionally log entry ids (remove in prod)
  // console.log('leaderboard ids', entries.map(e => e.strategyId));

  return (
    <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <TrophyIcon className="h-6 w-6 text-yellow-400" />
        Leaderboard - Today's Top Strategies
      </h2>
      
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <motion.div
            // ensure unique keys even if strategyId duplicates
            key={`${entry.strategyId ?? 'no-id'}-${index}`}
            id={`strategy-leaderboard-${entry.strategyId ?? index}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center justify-between p-4 rounded-lg border ${
              entry.rank <= 3
                ? 'border-yellow-500/30 bg-yellow-500/10'
                : 'border-white/10 bg-white/5'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getRankColor(entry.rank)}`}>
                {getRankIcon(entry.rank)}
              </div>
              <div>
                <div className="font-semibold text-white">{entry.name}</div>
                <div className="text-sm text-gray-400">
                  by {formatAddress(entry.creator)}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-green-400">
                {formatCurrency(entry.todayGains)}
              </div>
              <div className="text-xs text-gray-400">Today's Gain</div>
              {entry.feeBPS !== undefined && (
                <div className="mt-2 space-y-1 text-xs">
                  <div>
                    <span className="text-gray-400">Strategy Fee: </span>
                    <span className="text-white font-medium">{(entry.feeBPS / 100).toFixed(2)}%</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Estimated Cost: </span>
                    <span className="text-white font-medium">Investment + {(entry.feeBPS / 100).toFixed(2)}% fee</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        
        {entries.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No strategies available yet
          </div>
        )}
      </div>
    </div>
  );
}
