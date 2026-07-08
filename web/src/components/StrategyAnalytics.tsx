'use client';

import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar, Area } from 'recharts';
import { ArrowDownTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Trade {
  time: number;
  price: number;
  type: 'buy' | 'sell';
  amount: number;
  pnl?: number;
}

interface StrategyAnalyticsProps {
  strategyId?: number;
  symbol?: string;
  interval?: string;
}

export default function StrategyAnalytics({ 
  strategyId, 
  symbol = 'BTCUSDT', 
  interval = '1m' 
}: StrategyAnalyticsProps) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [selectedCandle, setSelectedCandle] = useState<Candle | null>(null);
  const [overlays, setOverlays] = useState({
    sma: true,
    ema: false,
    atr: false,
    bollinger: false
  });
  const [metrics, setMetrics] = useState({
    sharpe: 0,
    maxDrawdown: 0,
    winRate: 0,
    avgTradePnl: 0,
    totalTrades: 0,
    totalPnl: 0,
    profitFactor: 0,
    maxConsecLosses: 0,
    rsiNow: 0,
    macdHist: 0
  });
  const [equity, setEquity] = useState<{ label: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch candles
  useEffect(() => {
    async function fetchCandles() {
      try {
        const res = await fetch(`/api/candles?symbol=${symbol}&interval=${interval}&limit=500`);
        const data = await res.json();
        if (data.candles) {
          setCandles(data.candles);
          calculateMetrics(data.candles);
        }
      } catch (error) {
        console.error('Failed to fetch candles:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchCandles();
    
    // Refresh every 60 seconds for 1m interval
    if (interval === '1m') {
      const intervalId = setInterval(fetchCandles, 60000);
      return () => clearInterval(intervalId);
    }
  }, [symbol, interval]);

  // Calculate technical indicators
  const calculateSMA = (data: Candle[], period: number) => {
    const sma: number[] = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(NaN);
      } else {
        const sum = data.slice(i - period + 1, i + 1).reduce((acc, c) => acc + c.close, 0);
        sma.push(sum / period);
      }
    }
    return sma;
  };

  const calculateEMA = (data: Candle[], period: number) => {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        ema.push(data[i].close);
      } else {
        ema.push((data[i].close - ema[i - 1]) * multiplier + ema[i - 1]);
      }
    }
    return ema;
  };

  const calculateATR = (data: Candle[], period: number) => {
    const atr: number[] = [];
    const tr: number[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        tr.push(data[i].high - data[i].low);
      } else {
        tr.push(Math.max(
          data[i].high - data[i].low,
          Math.abs(data[i].high - data[i - 1].close),
          Math.abs(data[i].low - data[i - 1].close)
        ));
      }
      
      if (i < period - 1) {
        atr.push(NaN);
      } else {
        const sum = tr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        atr.push(sum / period);
      }
    }
    return atr;
  };

  const calculateBollinger = (data: Candle[], period: number, stdDev: number = 2) => {
    const sma = calculateSMA(data, period);
    const bb: { upper: number; middle: number; lower: number }[] = [];
    
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        bb.push({ upper: NaN, middle: NaN, lower: NaN });
      } else {
        const slice = data.slice(i - period + 1, i + 1);
        const mean = sma[i];
        const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / period;
        const std = Math.sqrt(variance);
        bb.push({
          upper: mean + stdDev * std,
          middle: mean,
          lower: mean - stdDev * std
        });
      }
    }
    return bb;
  };

  // RSI(14) — Wilder's smoothing over real closes
  const calculateRSI = (data: Candle[], period: number = 14) => {
    const rsi: number[] = [];
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 0; i < data.length; i++) {
      if (i === 0) { rsi.push(NaN); continue; }
      const change = data[i].close - data[i - 1].close;
      const gain = Math.max(0, change);
      const loss = Math.max(0, -change);
      if (i <= period) {
        avgGain += gain / period;
        avgLoss += loss / period;
        rsi.push(NaN);
      } else {
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
        rsi.push(avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss));
      }
    }
    return rsi;
  };

  // MACD(12, 26, 9) — momentum histogram
  const calculateMACD = (data: Candle[]) => {
    const ema = (period: number) => {
      const k = 2 / (period + 1);
      const out: number[] = [];
      let prev = data[0]?.close ?? 0;
      for (let i = 0; i < data.length; i++) {
        prev = i === 0 ? data[0].close : data[i].close * k + prev * (1 - k);
        out.push(prev);
      }
      return out;
    };
    const fast = ema(12);
    const slow = ema(26);
    const macdLine = fast.map((f, i) => f - slow[i]);
    const k = 2 / 10;
    const signal: number[] = [];
    let prev = macdLine[0] ?? 0;
    for (let i = 0; i < macdLine.length; i++) {
      prev = i === 0 ? macdLine[0] : macdLine[i] * k + prev * (1 - k);
      signal.push(prev);
    }
    return macdLine.map((m, i) => m - signal[i]); // histogram
  };

  // Calculate metrics
  const calculateMetrics = (candleData: Candle[]) => {
    if (candleData.length < 2) return;

    // Real EMA(12)/SMA(20) crossover signals computed over the actual candles:
    // enter long when EMA12 crosses above SMA20, exit when it crosses back below.
    // P&L is the genuine close-to-close move of each round trip.
    const smaLine = calculateSMA(candleData, 20);
    const emaLine = calculateEMA(candleData, 12);
    const signalTrades: Trade[] = [];
    let totalPnl = 0;
    let wins = 0;
    let entryPrice: number | null = null;

    for (let i = 1; i < candleData.length; i++) {
      if (isNaN(smaLine[i]) || isNaN(smaLine[i - 1])) continue;
      const crossedUp = emaLine[i - 1] <= smaLine[i - 1] && emaLine[i] > smaLine[i];
      const crossedDown = emaLine[i - 1] >= smaLine[i - 1] && emaLine[i] < smaLine[i];

      if (crossedUp && entryPrice === null) {
        entryPrice = candleData[i].close;
        signalTrades.push({ time: candleData[i].time, price: entryPrice, type: 'buy', amount: 1, pnl: 0 });
      } else if (crossedDown && entryPrice !== null) {
        const exitPrice = candleData[i].close;
        const pnl = exitPrice - entryPrice;
        totalPnl += pnl;
        if (pnl > 0) wins++;
        signalTrades.push({ time: candleData[i].time, price: exitPrice, type: 'sell', amount: 1, pnl });
        entryPrice = null;
      }
    }

    const closedTrades = signalTrades.filter(t => t.type === 'sell');
    setTrades(signalTrades);

    // Equity curve of the crossover strategy (cumulative real P&L per round trip)
    let cum = 0;
    const curve = closedTrades.map((t, i) => {
      cum += t.pnl ?? 0;
      return { label: `#${i + 1}`, value: Number(cum.toFixed(2)) };
    });
    setEquity([{ label: "start", value: 0 }, ...curve]);

    // Profit factor + worst losing streak
    const grossWin = closedTrades.filter(t => (t.pnl ?? 0) > 0).reduce((s, t) => s + (t.pnl ?? 0), 0);
    const grossLoss = Math.abs(closedTrades.filter(t => (t.pnl ?? 0) < 0).reduce((s, t) => s + (t.pnl ?? 0), 0));
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? Infinity : 0;
    let consec = 0;
    let maxConsecLosses = 0;
    for (const t of closedTrades) {
      consec = (t.pnl ?? 0) < 0 ? consec + 1 : 0;
      maxConsecLosses = Math.max(maxConsecLosses, consec);
    }

    // Live momentum snapshot
    const rsiSeries = calculateRSI(candleData, 14);
    const macdSeries = calculateMACD(candleData);
    const rsiNow = rsiSeries[rsiSeries.length - 1];
    const macdHist = macdSeries[macdSeries.length - 1];

    // Calculate Sharpe ratio (simplified)
    const returns = candleData.slice(1).map((c, i) => (c.close - candleData[i].close) / candleData[i].close);
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((acc, r) => acc + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const sharpe = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0; // Annualized

    // Calculate max drawdown
    let peak = candleData[0].close;
    let maxDrawdown = 0;
    for (const candle of candleData) {
      if (candle.close > peak) peak = candle.close;
      const drawdown = (peak - candle.close) / peak;
      if (drawdown > maxDrawdown) maxDrawdown = drawdown;
    }

    setMetrics({
      sharpe: sharpe || 0,
      maxDrawdown: maxDrawdown * 100,
      winRate: closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0,
      avgTradePnl: closedTrades.length > 0 ? totalPnl / closedTrades.length : 0,
      totalTrades: closedTrades.length,
      totalPnl,
      profitFactor: Number.isFinite(profitFactor) ? profitFactor : 99,
      maxConsecLosses,
      rsiNow: Number.isFinite(rsiNow) ? rsiNow : 50,
      macdHist: Number.isFinite(macdHist) ? macdHist : 0
    });
  };

  // Prepare chart data
  const chartData = candles.map((candle, index) => {
    const sma20 = calculateSMA(candles, 20);
    const ema12 = calculateEMA(candles, 12);
    const atr14 = calculateATR(candles, 14);
    const bb = calculateBollinger(candles, 20);
    
    return {
      time: new Date(candle.time * 1000).toLocaleTimeString(),
      timestamp: candle.time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      sma20: overlays.sma ? sma20[index] : null,
      ema12: overlays.ema ? ema12[index] : null,
      atr: overlays.atr ? atr14[index] : null,
      bbUpper: overlays.bollinger ? bb[index]?.upper : null,
      bbMiddle: overlays.bollinger ? bb[index]?.middle : null,
      bbLower: overlays.bollinger ? bb[index]?.lower : null
    };
  });

  // Export CSV
  const exportCSV = () => {
    const headers = ['Time', 'Open', 'High', 'Low', 'Close', 'Volume'];
    const rows = candles.map(c => [
      new Date(c.time * 1000).toISOString(),
      c.open,
      c.high,
      c.low,
      c.close,
      c.volume
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `strategy-analytics-${symbol}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export PDF (via API)
  const exportPDF = async () => {
    try {
      const response = await fetch('/api/export/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          candles: candles.slice(-100), // Last 100 candles
          metrics,
          trades: trades.slice(-50) // Last 50 trades
        })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `strategy-report-${symbol}-${Date.now()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        alert('Failed to generate PDF report');
      }
    } catch (error) {
      console.error('Export PDF failed:', error);
      alert('Failed to export PDF');
    }
  };

  // Get trades for selected candle
  const getTradesForCandle = (candle: Candle) => {
    const candleStart = candle.time;
    const candleEnd = candle.time + (interval === '1m' ? 60 : interval === '1h' ? 3600 : 86400);
    return trades.filter(t => t.time >= candleStart && t.time < candleEnd);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-400">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Strategy Analytics</h2>
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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-3 bg-gray-800/50 border border-white/10 rounded-lg p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Price Chart - {symbol}</h3>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={overlays.sma}
                  onChange={(e) => setOverlays({ ...overlays, sma: e.target.checked })}
                  className="rounded"
                />
                SMA(20)
              </label>
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={overlays.ema}
                  onChange={(e) => setOverlays({ ...overlays, ema: e.target.checked })}
                  className="rounded"
                />
                EMA(12)
              </label>
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={overlays.bollinger}
                  onChange={(e) => setOverlays({ ...overlays, bollinger: e.target.checked })}
                  className="rounded"
                />
                Bollinger
              </label>
              <label className="flex items-center gap-2 text-gray-300">
                <input
                  type="checkbox"
                  checked={overlays.atr}
                  onChange={(e) => setOverlays({ ...overlays, atr: e.target.checked })}
                  className="rounded"
                />
                ATR(14)
              </label>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="time" 
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                yAxisId="price"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
              />
              <YAxis 
                yAxisId="volume"
                orientation="right"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 10 }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Legend />
              
              {/* Candlestick representation */}
              <Bar yAxisId="price" dataKey="high" fill="transparent" />
              <Bar yAxisId="price" dataKey="low" fill="transparent" />
              <Area 
                yAxisId="price"
                type="monotone"
                dataKey="close"
                stroke="#6366f1"
                fill="rgba(99, 102, 241, 0.1)"
                name="Close"
              />
              
              {/* Overlays */}
              {overlays.sma && (
                <Line 
                  yAxisId="price"
                  type="monotone"
                  dataKey="sma20"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                  name="SMA(20)"
                />
              )}
              {overlays.ema && (
                <Line 
                  yAxisId="price"
                  type="monotone"
                  dataKey="ema12"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                  name="EMA(12)"
                />
              )}
              {overlays.bollinger && (
                <>
                  <Line 
                    yAxisId="price"
                    type="monotone"
                    dataKey="bbUpper"
                    stroke="#8b5cf6"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    name="BB Upper"
                  />
                  <Line 
                    yAxisId="price"
                    type="monotone"
                    dataKey="bbMiddle"
                    stroke="#8b5cf6"
                    strokeWidth={1}
                    dot={false}
                    name="BB Middle"
                  />
                  <Line 
                    yAxisId="price"
                    type="monotone"
                    dataKey="bbLower"
                    stroke="#8b5cf6"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    dot={false}
                    name="BB Lower"
                  />
                </>
              )}
              
              {/* Volume */}
              <Bar 
                yAxisId="volume"
                dataKey="volume"
                fill="#374151"
                opacity={0.3}
                name="Volume"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Metrics Sidebar */}
        <div className="space-y-4">
          <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Performance Metrics</h3>
            <div className="space-y-3">
              <div>
                <div className="text-sm text-gray-400">Sharpe Ratio</div>
                <div className="text-xl font-bold text-white">{metrics.sharpe.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Max Drawdown</div>
                <div className="text-xl font-bold text-red-400">{metrics.maxDrawdown.toFixed(2)}%</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Win Rate</div>
                <div className="text-xl font-bold text-green-400">{metrics.winRate.toFixed(1)}%</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Avg Trade P&L</div>
                <div className={`text-xl font-bold ${metrics.avgTradePnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${metrics.avgTradePnl.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Total Trades</div>
                <div className="text-xl font-bold text-white">{metrics.totalTrades}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Total P&L</div>
                <div className={`text-xl font-bold ${metrics.totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${metrics.totalPnl.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Profit Factor</div>
                <div className={`text-xl font-bold ${metrics.profitFactor >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                  {metrics.profitFactor >= 99 ? '∞' : metrics.profitFactor.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">Worst Losing Streak</div>
                <div className="text-xl font-bold text-orange-400">{metrics.maxConsecLosses}</div>
              </div>
              <div>
                <div className="text-sm text-gray-400">RSI(14) now</div>
                <div className={`text-xl font-bold ${
                  metrics.rsiNow >= 70 ? 'text-red-400' : metrics.rsiNow <= 30 ? 'text-green-400' : 'text-white'
                }`}>
                  {metrics.rsiNow.toFixed(1)}
                  <span className="text-xs font-normal text-gray-500 ml-2">
                    {metrics.rsiNow >= 70 ? 'overbought' : metrics.rsiNow <= 30 ? 'oversold' : 'neutral'}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-400">MACD momentum</div>
                <div className={`text-xl font-bold ${metrics.macdHist >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {metrics.macdHist >= 0 ? '▲ bullish' : '▼ bearish'}
                  <span className="text-xs font-normal text-gray-500 ml-2">{metrics.macdHist.toFixed(2)}</span>
                </div>
              </div>
              {/* Equity curve of the crossover strategy */}
              {equity.length > 1 && (
                <div className="pt-2 border-t border-white/10">
                  <div className="text-sm text-gray-400 mb-2">Equity Curve (crossover strategy)</div>
                  <ResponsiveContainer width="100%" height={110}>
                    <ComposedChart data={equity}>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={equity[equity.length - 1].value >= 0 ? '#34d399' : '#f87171'}
                        fill={equity[equity.length - 1].value >= 0 ? 'rgba(52,211,153,0.15)' : 'rgba(248,113,113,0.15)'}
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', color: '#fff', fontSize: 12 }}
                        formatter={(v: any) => [`$${v}`, 'cum. P&L']}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Candle Trades */}
      {selectedCandle && (
        <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">
            Trades for {new Date(selectedCandle.time * 1000).toLocaleString()}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Type</th>
                  <th className="text-right p-2">Price</th>
                  <th className="text-right p-2">Amount</th>
                  <th className="text-right p-2">P&L</th>
                </tr>
              </thead>
              <tbody>
                {getTradesForCandle(selectedCandle).map((trade, idx) => (
                  <tr key={idx} className="border-b border-gray-700">
                    <td className="p-2 text-gray-300">{new Date(trade.time * 1000).toLocaleTimeString()}</td>
                    <td className={`p-2 ${trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                      {trade.type.toUpperCase()}
                    </td>
                    <td className="p-2 text-right text-white">${trade.price.toFixed(2)}</td>
                    <td className="p-2 text-right text-gray-300">{trade.amount}</td>
                    <td className={`p-2 text-right ${(trade.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      ${(trade.pnl || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
                {getTradesForCandle(selectedCandle).length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-gray-400">No trades in this period</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

