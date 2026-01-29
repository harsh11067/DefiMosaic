"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BoltIcon, 
  DocumentTextIcon, 
  CurrencyDollarIcon, 
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Trade {
  time: string;
  type: 'BUY' | 'SELL';
  pair: string;
  amount: string;
  pnl: number;
  status: 'profit' | 'loss';
}

interface Position {
  pair: string;
  amount: string;
  entryPrice: string;
  currentPrice: string;
  pnl: number;
  pnlPercent: number;
}

interface StrategyData {
  id: number;
  name: string;
  description: string;
  creator: string;
  createdAt: string;
  performanceFee: string;
  maxDrawdown: string;
  winRate: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgTradeSize: string;
  recentActivity: Trade[];
  positions: Position[];
  performance: {
    totalPnL: number;
    totalPnLPercent: number;
    totalVolume: string;
    sharpeRatio: string;
  };
}

interface ManageStrategyProps {
  strategy: StrategyData;
  onClose: () => void;
}

export default function ManageStrategy({ strategy, onClose }: ManageStrategyProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'positions' | 'performance'>('overview');

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  const formatCurrency = (amount: number | string) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (num >= 1000000) return `$${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-white/10 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">{strategy.name}</h2>
              <p className="text-sm text-gray-400 mt-1">Following {strategy.creator}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm">Active</span>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4 mt-6">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ArrowTrendingUpIcon className="h-5 w-5 text-green-400" />
                <span className="text-xs text-gray-400">Total P&L</span>
              </div>
              <div className="text-lg font-bold text-green-400">
                +{strategy.performance.totalPnLPercent.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-400">{formatCurrency(strategy.performance.totalPnL)}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ChartBarIcon className="h-5 w-5 text-blue-400" />
                <span className="text-xs text-gray-400">Total Volume</span>
              </div>
              <div className="text-lg font-bold text-white">24h</div>
              <div className="text-xs text-gray-400">{strategy.performance.totalVolume}</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CurrencyDollarIcon className="h-5 w-5 text-purple-400" />
                <span className="text-xs text-gray-400">Total Followers</span>
              </div>
              <div className="text-lg font-bold text-white">2.5% fee</div>
              <div className="text-xs text-gray-400">23 followers</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <ChartBarIcon className="h-5 w-5 text-orange-400" />
                <span className="text-xs text-gray-400">Sharpe Ratio</span>
              </div>
              <div className="text-lg font-bold text-white">+68.50%</div>
              <div className="text-xs text-gray-400">{strategy.performance.sharpeRatio}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10">
          {[
            { id: 'overview', label: 'Overview', icon: BoltIcon },
            { id: 'history', label: 'Trade History', icon: DocumentTextIcon },
            { id: 'positions', label: '$ Positions', icon: CurrencyDollarIcon },
            { id: 'performance', label: 'Performance', icon: ChartBarIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-2 gap-6">
              {/* Strategy Description */}
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Strategy Description</h3>
                <p className="text-sm text-gray-300 mb-4">{strategy.description}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Created:</span>
                    <span className="text-white">{formatDate(strategy.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Performance Fee:</span>
                    <span className="text-white">{strategy.performanceFee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max Drawdown:</span>
                    <span className="text-red-400">{strategy.maxDrawdown}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Win Rate:</span>
                    <span className="text-green-400">{strategy.winRate}</span>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white/5 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {strategy.recentActivity.map((activity, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        {activity.type === 'BUY' ? (
                          <ArrowTrendingUpIcon className="h-5 w-5 text-green-400" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-5 w-5 text-red-400" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-white">
                            {activity.type} {activity.pair}
                          </div>
                          <div className="text-xs text-gray-400">{activity.time}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-semibold ${
                          activity.status === 'profit' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {activity.status === 'profit' ? '+' : ''}{formatCurrency(activity.pnl)}
                        </div>
                        <div className="text-xs text-gray-400">{activity.amount}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Summary */}
              <div className="bg-white/5 rounded-lg p-4 col-span-2">
                <h3 className="text-lg font-semibold text-white mb-4">Performance Summary</h3>
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Total Trades</div>
                    <div className="text-lg font-semibold text-white">{strategy.totalTrades}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Winning Trades</div>
                    <div className="text-lg font-semibold text-green-400">{strategy.winningTrades}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Losing Trades</div>
                    <div className="text-lg font-semibold text-red-400">{strategy.losingTrades}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400 mb-1">Avg. Trade Size</div>
                    <div className="text-lg font-semibold text-white">{formatCurrency(strategy.avgTradeSize)}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Trade History</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3 px-4 text-sm text-gray-400">Time</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-400">Type</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-400">Pair</th>
                      <th className="text-left py-3 px-4 text-sm text-gray-400">Amount</th>
                      <th className="text-right py-3 px-4 text-sm text-gray-400">P&L</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategy.recentActivity.map((trade, idx) => (
                      <tr key={idx} className="border-b border-white/5">
                        <td className="py-3 px-4 text-sm text-white">{trade.time}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            trade.type === 'BUY' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {trade.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-white">{trade.pair}</td>
                        <td className="py-3 px-4 text-sm text-gray-300">{trade.amount}</td>
                        <td className={`py-3 px-4 text-sm font-semibold text-right ${
                          trade.status === 'profit' ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {trade.status === 'profit' ? '+' : ''}{formatCurrency(trade.pnl)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'positions' && (
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Positions</h3>
              <div className="space-y-3">
                {strategy.positions.map((position, idx) => (
                  <div key={idx} className="bg-white/5 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-lg font-semibold text-white">{position.pair}</div>
                        <div className="text-sm text-gray-400">Amount: {position.amount}</div>
                      </div>
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {position.pnl >= 0 ? '+' : ''}{position.pnlPercent.toFixed(2)}%
                        </div>
                        <div className="text-sm text-gray-400">
                          {position.pnl >= 0 ? '+' : ''}{formatCurrency(position.pnl)}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Entry Price:</span>
                        <span className="text-white ml-2">${position.entryPrice}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Current Price:</span>
                        <span className="text-white ml-2">${position.currentPrice}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-4">Performance</h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="text-sm text-gray-400 mb-2">Total P&L</div>
                  <div className="text-3xl font-bold text-green-400">
                    {formatCurrency(strategy.performance.totalPnL)}
                  </div>
                  <div className="text-sm text-gray-400 mt-1">
                    {strategy.performance.totalPnLPercent >= 0 ? '+' : ''}
                    {strategy.performance.totalPnLPercent.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-2">Total Volume</div>
                  <div className="text-3xl font-bold text-white">{strategy.performance.totalVolume}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-2">Sharpe Ratio</div>
                  <div className="text-3xl font-bold text-orange-400">{strategy.performance.sharpeRatio}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-400 mb-2">Win Rate</div>
                  <div className="text-3xl font-bold text-green-400">{strategy.winRate}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
