"use client";

import React from 'react';
import ManageStrategy from './ManageStrategy';

interface ManageStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategy: {
    id: number;
    name: string;
    description: string;
    creator: string;
    feeBPS: number;
    totalFollowers: number;
    totalGains: number;
    todayGains: number;
    totalValueLocked: number;
    createdAt?: string;
    maxDrawdown?: number;
    winRate?: number;
  };
}

export default function ManageStrategyModal({
  isOpen,
  onClose,
  strategy
}: ManageStrategyModalProps) {
  if (!isOpen) return null;

  // Mock data for the strategy details
  const strategyData = {
    id: strategy.id,
    name: strategy.name,
    description: strategy.description || 'Advanced trading strategy with AI-powered decision making',
    creator: strategy.creator,
    createdAt: strategy.createdAt || new Date().toISOString(),
    performanceFee: `${(strategy.feeBPS / 100).toFixed(2)}%`,
    maxDrawdown: strategy.maxDrawdown?.toFixed(2) + '%' || '-8.20%',
    winRate: strategy.winRate || '+68.50%',
    totalTrades: 142,
    winningTrades: 97,
    losingTrades: 45,
    avgTradeSize: '41810.0',
    recentActivity: [
      {
        time: 'Sep 28, 07:21 AM',
        type: 'BUY' as const,
        pair: 'TETH',
        amount: '1000 TUSD',
        pnl: 45.67,
        status: 'profit' as const
      },
      {
        time: 'Sep 28, 06:21 AM',
        type: 'SELL' as const,
        pair: 'TUSDC',
        amount: '0.2 TETH',
        pnl: -12.34,
        status: 'loss' as const
      }
    ],
    positions: [
      {
        pair: 'ETH/USDC',
        amount: '1.5 ETH',
        entryPrice: '2500.00',
        currentPrice: '2650.00',
        pnl: 225,
        pnlPercent: 6.0
      }
    ],
    performance: {
      totalPnL: strategy.totalGains,
      totalPnLPercent: 15.67,
      totalVolume: '$125.00',
      sharpeRatio: '1.45'
    }
  };

  return <ManageStrategy strategy={strategyData} onClose={onClose} />;
}