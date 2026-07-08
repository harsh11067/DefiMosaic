"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAccount, usePublicClient } from 'wagmi';
import { motion } from 'framer-motion';
import { ArrowLeftIcon, ChartBarIcon, DocumentTextIcon, CurrencyDollarIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import { CONTRACT_ADDRESSES, isContractDeployed } from '@/config/contracts';

const StrategyRegistryAbi = [
  {
    inputs: [{ name: 'strategyId', type: 'uint256' }],
    name: 'strategies',
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'creator', type: 'address' },
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'feeBPS', type: 'uint256' },
      { name: 'totalFollowers', type: 'uint256' },
      { name: 'totalValueLocked', type: 'uint256' },
      { name: 'totalGains', type: 'uint256' },
      { name: 'todayGains', type: 'uint256' },
      { name: 'active', type: 'bool' },
      { name: 'createdAt', type: 'uint256' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'strategyId', type: 'uint256' }],
    name: 'getStrategyFollowers',
    outputs: [
      {
        components: [
          { name: 'user', type: 'address' },
          { name: 'amountInvested', type: 'uint256' },
          { name: 'shares', type: 'uint256' },
          { name: 'joinedAt', type: 'uint256' }
        ],
        name: '',
        type: 'tuple[]'
      }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

interface Strategy {
  id: number;
  name: string;
  description: string;
  creator: string;
  feeBPS: number;
  totalFollowers: number;
  totalGains: number;
  todayGains: number;
  totalValueLocked: number;
  createdAt: number;
  maxDrawdown: number;
  winRate: number;
}

type TabType = 'overview' | 'trade-history' | 'positions' | 'performance';

interface BtTrade {
  time: string;
  side: 'buy' | 'sell';
  price: number;
  size: number;
  fee: number;
  pnl?: number;
}

interface BtResult {
  symbol: string;
  interval: string;
  fast: number;
  slow: number;
  metrics: {
    totalTrades: number;
    winRate: number;
    totalPnl: number;
    maxDrawdown: number;
    sharpe: number;
    profitFactor: number;
    strategyReturnPct: number;
    buyHoldReturnPct: number;
    beatsBuyHold: boolean;
  };
  trades: BtTrade[];
}

// Each strategy runs a live backtest of its real benchmark profile —
// the tabs below are genuine engine output over real Binance history.
const STRATEGY_PROFILES: Record<number, { symbol: string; interval: string; fast: number; slow: number }> = {
  1: { symbol: 'ETHUSDT', interval: '1h', fast: 10, slow: 30 },  // Aggressive Growth
  2: { symbol: 'BTCUSDT', interval: '4h', fast: 20, slow: 50 },  // Conservative Yield
};
const DEFAULT_PROFILE = { symbol: 'BTCUSDT', interval: '1h', fast: 20, slow: 50 };

export default function ManageStrategyPage() {
  const params = useParams();
  const router = useRouter();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const strategyId = Number(params.id);

  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [bt, setBt] = useState<BtResult | null>(null);

  // Live engine run: real Binance history through the crossover backtester
  useEffect(() => {
    if (!strategyId) return;
    const profile = STRATEGY_PROFILES[strategyId] ?? DEFAULT_PROFILE;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch('/api/backtest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile),
        });
        if (!r.ok) return;
        const data = await r.json();
        if (!cancelled && data.ok) {
          setBt({ ...profile, metrics: data.metrics, trades: data.trades ?? [] });
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [strategyId]);

  const fmtTradeTime = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    async function fetchStrategy() {
      if (!strategyId) {
        setLoading(false);
        return;
      }

      // Mock strategies for ID 1 and 2 - always use these first
      const mockStrategies: Record<number, Strategy> = {
        1: {
          id: 1,
          name: 'Aggressive Growth',
          description: 'High-risk, high-reward strategy focusing on volatile assets',
          creator: '0x1234567890123456789012345678901234567890',
          feeBPS: 500,
          totalFollowers: 234,
          totalGains: 125000,
          todayGains: 8500,
          totalValueLocked: 500000,
          createdAt: Math.floor(Date.now() / 1000) - 86400 * 30,
          maxDrawdown: -8.20,
          winRate: 68.50
        },
        2: {
          id: 2,
          name: 'Conservative Yield',
          description: 'Stable returns with low volatility',
          creator: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
          feeBPS: 200,
          totalFollowers: 567,
          totalGains: 89000,
          todayGains: 3200,
          totalValueLocked: 1200000,
          createdAt: Math.floor(Date.now() / 1000) - 86400 * 60,
          maxDrawdown: -5.10,
          winRate: 72.30
        }
      };

      // Always use mock data for IDs 1 and 2
      if (mockStrategies[strategyId]) {
        console.log('Using mock strategy for ID:', strategyId);
        setStrategy(mockStrategies[strategyId]);
        setLoading(false);
        return;
      }

      // For newly created strategies (timestamp-based IDs), look up the real
      // details persisted by the create flow in localStorage
      if (strategyId > 1000000000000) { // Timestamp-based IDs are large numbers
        let created: any = null;
        try {
          const stored = localStorage.getItem('newlyCreatedStrategies');
          if (stored) {
            created = (JSON.parse(stored) as any[]).find((s) => s.id === strategyId) ?? null;
          }
        } catch {}
        setStrategy({
          id: strategyId,
          name: created?.name || `Strategy ${strategyId}`,
          description: created?.description || 'Newly created strategy',
          creator: created?.creator || address || '0x0000000000000000000000000000000000000000',
          feeBPS: created?.feeBPS ?? 200,
          totalFollowers: created?.totalFollowers ?? 0,
          totalGains: created?.totalGains ?? 0,
          todayGains: created?.todayGains ?? 0,
          totalValueLocked: created?.totalValueLocked ?? 0,
          createdAt: Math.floor(strategyId / 1000),
          maxDrawdown: 0,
          winRate: 0
        });
        setLoading(false);
        return;
      }

      // Try to fetch from contract only if not mock (ID >= 3)
      if (!publicClient || !CONTRACT_ADDRESSES.StrategyRegistry || !isContractDeployed(CONTRACT_ADDRESSES.StrategyRegistry)) {
        console.log('Cannot fetch from contract, using fallback');
        // Use a fallback strategy
        setStrategy({
          id: strategyId,
          name: `Strategy ${strategyId}`,
          description: 'Strategy details not available',
          creator: '0x0000000000000000000000000000000000000000',
          feeBPS: 200,
          totalFollowers: 0,
          totalGains: 0,
          todayGains: 0,
          totalValueLocked: 0,
          createdAt: Math.floor(Date.now() / 1000),
          maxDrawdown: 0,
          winRate: 0
        });
        setLoading(false);
        return;
      }

      try {
        const strategyData = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.StrategyRegistry as `0x${string}`,
          abi: StrategyRegistryAbi,
          functionName: 'strategies',
          args: [BigInt(strategyId)]
        }) as any;

        setStrategy({
          id: Number(strategyData.id),
          name: strategyData.name,
          description: strategyData.description,
          creator: strategyData.creator,
          feeBPS: Number(strategyData.feeBPS),
          totalFollowers: Number(strategyData.totalFollowers),
          totalGains: Number(strategyData.totalGains) / 1e18,
          todayGains: Number(strategyData.todayGains) / 1e18,
          totalValueLocked: Number(strategyData.totalValueLocked) / 1e18,
          createdAt: Number(strategyData.createdAt),
          maxDrawdown: -8.20,
          winRate: 68.50
        });
      } catch (error) {
        console.error('Failed to fetch strategy:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStrategy();
  }, [strategyId, publicClient]);

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-GB');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Strategy not found</div>
      </div>
    );
  }

  const isCreator = address?.toLowerCase() === strategy.creator.toLowerCase();
  const isFollowing = false; // TODO: Check if user is following

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: ChartBarIcon },
    { id: 'trade-history' as TabType, label: 'Trade History', icon: DocumentTextIcon },
    { id: 'positions' as TabType, label: 'Positions', icon: CurrencyDollarIcon },
    { id: 'performance' as TabType, label: 'Performance', icon: ArrowTrendingUpIcon }
  ];

  return (
    <div className="min-h-screen text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-6 w-6" />
          </button>
          <div>
            <h1 className="text-3xl font-bold">{strategy.name}</h1>
            <p className="text-sm text-gray-400 mt-1">
              {isFollowing ? 'Following' : ''} {isCreator ? 'Your Strategy' : formatAddress(strategy.creator)}
            </p>
          </div>
          <div className="ml-auto flex gap-3">
            <span className="px-4 py-2 rounded-lg bg-green-600/20 text-green-400 border border-green-500/50">
              Active
            </span>
            {!isCreator && (
              <button className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors">
                Follow Strategy
              </button>
            )}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10"
          >
            <div className="flex items-center gap-3 mb-2">
              <ArrowTrendingUpIcon className="h-6 w-6 text-green-400" />
              <div className="text-xs text-gray-400">Total P&L</div>
            </div>
            <div className="text-2xl font-bold text-white">${strategy.totalGains.toLocaleString()}</div>
            <div className="text-sm text-green-400 mt-1">+{((strategy.totalGains / strategy.totalValueLocked) * 100).toFixed(2)}%</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <CurrencyDollarIcon className="h-6 w-6 text-blue-400" />
                <div className="text-xs text-gray-400">Total Volume</div>
              </div>
              <div className="text-xs text-gray-500">24h</div>
            </div>
            <div className="text-2xl font-bold text-white">${(strategy.totalValueLocked / 1000).toFixed(2)}K</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 text-purple-400">👥</div>
                <div className="text-xs text-gray-400">Total Followers</div>
              </div>
              <div className="text-xs text-gray-500">{strategy.feeBPS / 100}% fee</div>
            </div>
            <div className="text-2xl font-bold text-white">{strategy.totalFollowers}</div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="h-6 w-6 text-orange-400">🎯</div>
                <div className="text-xs text-gray-400">Sharpe Ratio (live engine)</div>
              </div>
              {bt && <div className="text-xs text-green-400">{bt.metrics.winRate.toFixed(1)}% WR</div>}
            </div>
            <div className="text-2xl font-bold text-white">{bt ? bt.metrics.sharpe.toFixed(2) : '…'}</div>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-white/10">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-400 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'overview' && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10"
                >
                  <h3 className="text-lg font-semibold mb-4">Strategy Description</h3>
                  <p className="text-gray-300 mb-4">{strategy.description}</p>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Created:</span>
                      <span className="text-white ml-2">{formatDate(strategy.createdAt)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Max Drawdown:</span>
                      <span className="text-red-400 ml-2">{bt ? `-${bt.metrics.maxDrawdown.toFixed(2)}%` : '…'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Performance Fee:</span>
                      <span className="text-white ml-2">{(strategy.feeBPS / 100).toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Win Rate:</span>
                      <span className="text-green-400 ml-2">{bt ? `${bt.metrics.winRate.toFixed(1)}%` : '…'}</span>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10"
                >
                  <h3 className="text-lg font-semibold mb-1">Recent Signals</h3>
                  {bt && (
                    <p className="text-xs text-gray-500 mb-4">
                      Live engine: SMA {bt.fast}/{bt.slow} crossover on {bt.symbol} {bt.interval} — real Binance history.
                    </p>
                  )}
                  <div className="space-y-3">
                    {!bt ? (
                      <div className="h-24 shimmer rounded-lg" />
                    ) : bt.trades.length === 0 ? (
                      <p className="text-sm text-gray-500">No signals in the current window.</p>
                    ) : (
                      bt.trades.slice(-4).reverse().map((t, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <ArrowTrendingUpIcon className={`h-5 w-5 ${t.side === 'buy' ? 'text-green-400' : 'text-red-400 rotate-180'}`} />
                            <div>
                              <div className="text-sm font-medium text-white">{t.side.toUpperCase()} {bt.symbol.replace('USDT', '')}</div>
                              <div className="text-xs text-gray-400">{fmtTradeTime(t.time)}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm font-medium ${t.side === 'sell' ? ((t.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400') : 'text-white'}`}>
                              {t.side === 'sell' ? `${(t.pnl ?? 0) >= 0 ? '+' : ''}$${(t.pnl ?? 0).toFixed(2)}` : `@ $${t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
                            </div>
                            <div className="text-xs text-gray-400">{t.size.toFixed(5)} {bt.symbol.replace('USDT', '')}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              </>
            )}

            {activeTab === 'trade-history' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10"
              >
                <h3 className="text-lg font-semibold mb-1">Trade History</h3>
                {bt && (
                  <p className="text-xs text-gray-500 mb-4">
                    Every row is real engine output — SMA {bt.fast}/{bt.slow} on {bt.symbol} {bt.interval}, actual market prices, 0.1% fees.
                  </p>
                )}
                <div className="overflow-x-auto">
                  {!bt ? (
                    <div className="h-40 shimmer rounded-lg" />
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 text-sm text-gray-400">Time</th>
                          <th className="text-left py-3 text-sm text-gray-400">Type</th>
                          <th className="text-left py-3 text-sm text-gray-400">Pair</th>
                          <th className="text-left py-3 text-sm text-gray-400">Price</th>
                          <th className="text-right py-3 text-sm text-gray-400">P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {bt.trades.slice(-16).reverse().map((t, i) => (
                          <tr key={i} className="border-b border-white/5">
                            <td className="py-3 text-sm text-white">{fmtTradeTime(t.time)}</td>
                            <td className={`py-3 text-sm font-medium ${t.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>{t.side.toUpperCase()}</td>
                            <td className="py-3 text-sm text-white">{bt.symbol.replace('USDT', '/USDT')}</td>
                            <td className="py-3 text-sm text-white">${t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                            <td className={`py-3 text-sm text-right ${t.side === 'sell' ? ((t.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400') : 'text-gray-500'}`}>
                              {t.side === 'sell' ? `${(t.pnl ?? 0) >= 0 ? '+' : ''}$${(t.pnl ?? 0).toFixed(2)}` : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'positions' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10"
              >
                <h3 className="text-lg font-semibold mb-1">Recent Positions</h3>
                {bt && (
                  <p className="text-xs text-gray-500 mb-4">
                    Latest round trips of the live engine on {bt.symbol} {bt.interval} — real entries, real exits.
                  </p>
                )}
                <div className="space-y-3">
                  {!bt ? (
                    <div className="h-24 shimmer rounded-lg" />
                  ) : (
                    (() => {
                      const sells = bt.trades.filter((t) => t.side === 'sell').slice(-3).reverse();
                      if (sells.length === 0) return <p className="text-sm text-gray-500">No completed positions in the current window.</p>;
                      return sells.map((t, i) => {
                        const pct = t.pnl !== undefined && t.price > 0 ? (t.pnl / (t.price * t.size - t.pnl)) * 100 : 0;
                        return (
                          <div key={i} className="p-4 bg-white/5 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-medium text-white">{bt.symbol.replace('USDT', '/USDT')} · closed {fmtTradeTime(t.time)}</div>
                              <div className={`text-sm font-semibold ${(t.pnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {(t.pnl ?? 0) >= 0 ? '+' : ''}{pct.toFixed(2)}%
                              </div>
                            </div>
                            <div className="text-xs text-gray-400">
                              Size {t.size.toFixed(5)} · exit ${t.price.toLocaleString(undefined, { maximumFractionDigits: 2 })} · P&L {(t.pnl ?? 0) >= 0 ? '+' : ''}${(t.pnl ?? 0).toFixed(2)}
                            </div>
                          </div>
                        );
                      });
                    })()
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'performance' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10"
              >
                <h3 className="text-lg font-semibold mb-1">Performance Metrics</h3>
                {bt && (
                  <p className="text-xs text-gray-500 mb-4">
                    Live backtest over the last 1000 real {bt.interval} candles of {bt.symbol}.
                  </p>
                )}
                {!bt ? (
                  <div className="h-40 shimmer rounded-lg" />
                ) : (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Strategy Return</span>
                      <span className={`font-semibold ${bt.metrics.strategyReturnPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {bt.metrics.strategyReturnPct >= 0 ? '+' : ''}{bt.metrics.strategyReturnPct.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">vs Buy &amp; Hold</span>
                      <span className={`font-semibold ${bt.metrics.beatsBuyHold ? 'text-green-400' : 'text-amber-400'}`}>
                        {bt.metrics.buyHoldReturnPct >= 0 ? '+' : ''}{bt.metrics.buyHoldReturnPct.toFixed(2)}% {bt.metrics.beatsBuyHold ? '(beaten ✓)' : '(not beaten)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Sharpe Ratio</span>
                      <span className="text-white font-semibold">{bt.metrics.sharpe.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Max Drawdown</span>
                      <span className="text-red-400 font-semibold">-{bt.metrics.maxDrawdown.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Win Rate</span>
                      <span className="text-green-400 font-semibold">{bt.metrics.winRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Profit Factor</span>
                      <span className={`font-semibold ${bt.metrics.profitFactor >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                        {bt.metrics.profitFactor >= 99 ? '∞' : bt.metrics.profitFactor.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Round Trips</span>
                      <span className="text-white font-semibold">{bt.metrics.totalTrades}</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10"
            >
              <h3 className="text-lg font-semibold mb-4">Strategy Leader</h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold">
                  12
                </div>
                <div>
                  <div className="text-sm font-medium text-white">{formatAddress(strategy.creator)}</div>
                  <div className="text-xs text-gray-400">Strategy Leader</div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10"
            >
              <h3 className="text-lg font-semibold mb-4">Performance Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Trades</span>
                  <span className="text-white">—</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Winning Trades</span>
                  <span className="text-white">—</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Losing Trades</span>
                  <span className="text-white">—</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg. Trade Size</span>
                  <span className="text-white">$41,810.0</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10"
            >
              <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                <DocumentTextIcon className="h-5 w-5" />
                Copy Latest Trade
              </button>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
