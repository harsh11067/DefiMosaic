'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowDownTrayIcon, DocumentArrowDownIcon, PlayIcon } from '@heroicons/react/24/outline';

interface BacktestMetrics {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number | null;
  totalPnl: number | null;
  maxDrawdown: number | null;
  sharpe: number | null;
  finalEquity: number | null;
}

interface BacktesterProps {
  strategyId?: number;
}

export default function Backtester({ strategyId }: BacktesterProps) {
  const [symbol, setSymbol] = useState('ETHUSDT');
  const [interval, setInterval] = useState('1h');
  const [fast, setFast] = useState(20);
  const [slow, setSlow] = useState(50);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<BacktestMetrics | null>(null);
  const [equity, setEquity] = useState<{ time: number; value: number }[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [equityChart, setEquityChart] = useState<string | null>(null);

  // helper to safely format numbers (prevents .toFixed on null/undefined)
  const formatNumber = (value: number | null | undefined, digits = 2) => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return (0).toFixed(digits);
    }
    return value.toFixed(digits);
  };

  const handleBacktest = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, interval, fast, slow }),
      });

      // Read raw response first for debugging
      const text = await response.text();
      console.log('Backtest raw response:', response.status, text);

      if (!response.ok) {
        alert(`Backtest failed (${response.status}): ${text || 'No response body'}`);
        return;
      }

      if (!text) {
        alert('Backtest failed: empty response from /api/backtest');
        return;
      }

      let data: any;
      try {
        data = JSON.parse(text);
      } catch (e) {
        console.error('JSON parse error:', e, 'raw:', text);
        alert('Backtest failed: server did not return valid JSON');
        return;
      }

      if (data.ok) {
        // make sure metrics fields exist, fallback to 0 if server sends null/undefined
        const m = data.metrics || {};
        setMetrics({
          totalTrades: m.totalTrades ?? 0,
          wins: m.wins ?? 0,
          losses: m.losses ?? 0,
          winRate: m.winRate ?? 0,
          totalPnl: m.totalPnl ?? 0,
          maxDrawdown: m.maxDrawdown ?? 0,
          sharpe: m.sharpe ?? 0,
          finalEquity: m.finalEquity ?? 0,
        });
        setEquity(data.equity ?? []);
        setTrades(data.trades ?? []);
        setEquityChart(data.equityChart ?? null);
      } else {
        alert('Backtest failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Backtest error:', error);
      alert('Failed to run backtest');
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (trades.length === 0) {
      alert('No trades to export');
      return;
    }

    const headers = ['Time', 'Side', 'Price', 'Size', 'Fee'];
    const rows = trades.map((t) => [t.time, t.side, t.price, t.size, t.fee]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backtest-trades-${symbol}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = async () => {
    try {
      const response = await fetch('/api/backtest/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          metrics,
          trades,
          equity,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backtest-report-${symbol}-${Date.now()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert('Failed to generate PDF');
      }
    } catch (error) {
      console.error('Export PDF error:', error);
      alert('Failed to export PDF');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10">
        <h2 className="text-2xl font-bold text-white mb-6">Strategy Backtester</h2>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Symbol</label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-white"
              placeholder="ETHUSDT"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Interval</label>
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-white"
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Fast SMA</label>
            <input
              type="number"
              value={fast}
              onChange={(e) => setFast(parseInt(e.target.value))}
              className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Slow SMA</label>
            <input
              type="number"
              value={slow}
              onChange={(e) => setSlow(parseInt(e.target.value))}
              className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-white"
            />
          </div>
        </div>

        <button
          onClick={handleBacktest}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 transition-all"
        >
          <PlayIcon className="h-5 w-5" />
          {loading ? 'Running Backtest...' : 'Run Backtest'}
        </button>
      </div>

      {/* Results */}
      {metrics && (
        <>
          {/* Metrics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400">Total Trades</div>
              <div className="text-2xl font-bold text-white">{metrics.totalTrades}</div>
            </div>
            <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400">Win Rate</div>
              <div className="text-2xl font-bold text-green-400">
                {formatNumber(metrics.winRate, 1)}%
              </div>
            </div>
            <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400">Total P&L</div>
              <div
                className={`text-2xl font-bold ${
                  (metrics.totalPnl ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                ${formatNumber(metrics.totalPnl, 2)}
              </div>
            </div>
            <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400">Sharpe Ratio</div>
              <div className="text-2xl font-bold text-white">
                {formatNumber(metrics.sharpe, 2)}
              </div>
            </div>
            <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400">Max Drawdown</div>
              <div className="text-2xl font-bold text-red-400">
                {formatNumber(metrics.maxDrawdown, 2)}%
              </div>
            </div>
            <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400">Final Equity</div>
              <div className="text-2xl font-bold text-white">
                ${formatNumber(metrics.finalEquity, 2)}
              </div>
            </div>
            <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400">Wins</div>
              <div className="text-2xl font-bold text-green-400">{metrics.wins}</div>
            </div>
            <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
              <div className="text-sm text-gray-400">Losses</div>
              <div className="text-2xl font-bold text-red-400">{metrics.losses}</div>
            </div>
          </div>

          {/* Equity Curve Chart */}
          <div className="bg-gray-800/50 border border-white/10 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Equity Curve</h3>
              <div className="flex gap-2">
                <button
                  onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  Export CSV
                </button>
                <button
                  onClick={exportPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  Export PDF
                </button>
              </div>
            </div>

            {equityChart && (
              <img src={equityChart} alt="Equity Curve" className="w-full mb-4" />
            )}

            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={equity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#fff',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={false}
                  name="Equity"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
