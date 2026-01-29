"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircleIcon, ArrowTrendingUpIcon, XCircleIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import StrategyChat from './StrategyChat';

interface JoinedStrategy {
  strategyId: number;
  name: string;
  creator: string;
  amountInvested: number;
  shares: number;
  currentValue: number;
  gains: number;
  joinedAt: number;
}

interface JoinedStrategiesProps {
  strategies: JoinedStrategy[];
}

export default function JoinedStrategies({ strategies }: JoinedStrategiesProps) {
  const [openChatId, setOpenChatId] = useState<number | null>(null);
  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(2)}K`;
    return `$${amount.toFixed(2)}`;
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const calculateROI = (invested: number, current: number) => {
    if (invested === 0) return 0;
    return ((current - invested) / invested) * 100;
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <CheckCircleIcon className="h-6 w-6 text-green-400" />
        Joined Strategies
      </h2>

      {strategies.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">No strategies joined yet</div>
          <div className="text-sm text-gray-500">Start following strategies to see them here</div>
        </div>
      ) : (
        <div className="space-y-4">
          {strategies.map((strategy, index) => {
            const roi = calculateROI(strategy.amountInvested, strategy.currentValue);
            const isPositive = roi >= 0;

            return (
              <motion.div
                key={strategy.strategyId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-purple-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">{strategy.name}</h3>
                    <div className="text-sm text-gray-400">
                      by {formatAddress(strategy.creator)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Joined {formatDate(strategy.joinedAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? '+' : ''}{roi.toFixed(2)}%
                    </div>
                    <div className="text-xs text-gray-400">ROI</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Invested</div>
                    <div className="text-sm font-semibold text-white">
                      {formatCurrency(strategy.amountInvested)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Current Value</div>
                    <div className="text-sm font-semibold text-white">
                      {formatCurrency(strategy.currentValue)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Gains</div>
                    <div className={`text-sm font-semibold flex items-center gap-1 ${
                      isPositive ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {isPositive ? (
                        <ArrowTrendingUpIcon className="h-4 w-4" />
                      ) : (
                        <XCircleIcon className="h-4 w-4" />
                      )}
                      {formatCurrency(Math.abs(strategy.gains))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between text-sm mb-3">
                    <span className="text-gray-400">Shares:</span>
                    <span className="text-white font-medium">{strategy.shares.toLocaleString()}</span>
                  </div>
                  
                  {/* Chat Button */}
                  <button
                    onClick={() => setOpenChatId(openChatId === strategy.strategyId ? null : strategy.strategyId)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600/20 text-purple-300 rounded-lg hover:bg-purple-600/30 border border-purple-500/50 transition-all"
                  >
                    <ChatBubbleLeftRightIcon className="h-4 w-4" />
                    {openChatId === strategy.strategyId ? 'Close Chat' : 'Open Chat'}
                  </button>
                </div>

                {/* Chat Component */}
                {openChatId === strategy.strategyId && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <StrategyChat strategyId={strategy.strategyId} />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
