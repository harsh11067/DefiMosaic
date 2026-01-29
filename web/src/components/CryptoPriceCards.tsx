"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import PriceTargetPredictionModal from './PriceTargetPredictionModal';

interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap?: number;
}

interface CryptoPriceCardsProps {
  newList?: string[];
  popularList?: string[];
  refreshIntervalMs?: number;
}

export default function CryptoPriceCards({
  newList = ['apecoin', 'metis-token', 'pipe-token', 'binancecoin', '2local'],
  popularList = ['solana', 'bitcoin', 'ethereum', 'tether', 'hype-token'],
  refreshIntervalMs = 60000, // 60 seconds
}: CryptoPriceCardsProps) {
  const [coins, setCoins] = useState<Coin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        // Fetch top 200 coins by market cap
        const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=200&page=1&price_change_percentage=24h&sparkline=false`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('CoinGecko fetch error');
        const data = await res.json();
        
        if (mounted) {
          setCoins(data);
          setLoading(false);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          setLoading(false);
        }
      }
    }
    
    fetchData();
    const id = setInterval(fetchData, refreshIntervalMs);
    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [refreshIntervalMs]);

  // Generate AI summary helper (example - call from server-side in production)
  useEffect(() => {
    if (coins.length > 0 && !summary) {
      generateSummary();
    }
  }, [coins]);

  async function generateSummary() {
    try {
      // Call your API route that uses OpenAI
      const res = await fetch('/api/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coins: coins.slice(0, 10).map(c => ({
            symbol: c.symbol,
            price: c.current_price,
            change24h: c.price_change_percentage_24h
          }))
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      }
    } catch (err) {
      console.warn('Summary generation failed:', err);
    }
  }

  const findByIds = (idsArray: string[]) => {
    return idsArray.map(id => coins.find(c => c.id === id)).filter(Boolean) as Coin[];
  };

  const topGainers = [...coins]
    .sort((a, b) => (b.price_change_percentage_24h || 0) - (a.price_change_percentage_24h || 0))
    .slice(0, 5)
    .filter(c => c.price_change_percentage_24h !== null);

  const formatPrice = (p: number) => {
    if (p >= 1000) return `$${p.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (p >= 1) return `$${p.toFixed(2)}`;
    return `$${p.toFixed(5)}`;
  };

  const changeColor = (v: number | null) => {
    if (v === null || v === undefined) return 'text-gray-400';
    return v >= 0 ? 'text-green-400' : 'text-red-400';
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  // Find ETH price
  const ethCoin = coins.find(c => c.id === 'ethereum');
  const ethPrice = ethCoin?.current_price || 0;
  const ethChange = ethCoin?.price_change_percentage_24h || 0;

  return (
    <div className="w-full space-y-4">
      {/* ETH Price Display */}
      {ethPrice > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border border-blue-500/30 rounded-lg p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <img src={ethCoin?.image} alt="ETH" className="w-8 h-8 rounded-full" />
            <div>
              <div className="text-sm font-semibold text-white">ETH Price</div>
              <div className="text-xs text-gray-400">{formatPrice(ethPrice)}</div>
            </div>
          </div>
          <div className={`text-lg font-bold ${changeColor(ethChange)}`}>
            {ethChange >= 0 ? '+' : ''}{ethChange.toFixed(2)}%
          </div>
        </motion.div>
      )}

      {/* AI Summary */}
      {summary && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border border-purple-500/30 rounded-lg p-4"
        >
          <p className="text-sm text-white/80">{summary}</p>
        </motion.div>
      )}

      {/* Three Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* New Coins */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-6 shadow-xl border border-white/10"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">New</h3>
            <span className="text-xs text-gray-400">24h Change</span>
          </div>
          <div className="space-y-3">
            {loading && <div className="text-gray-400 text-sm">Loading…</div>}
            {error && <div className="text-red-400 text-sm">{error}</div>}
            {!loading && !error && findByIds(newList).map((c) => (
              <CoinRow
                key={c.id}
                coin={c}
                formatPrice={formatPrice}
                changeColor={changeColor}
              />
            ))}
          </div>
        </motion.div>

        {/* Top Gainers */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-6 shadow-xl border border-white/10"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Top Gainers</h3>
            <span className="text-xs text-gray-400">24h Change</span>
          </div>
          <div className="space-y-3">
            {topGainers.map((c) => (
              <CoinRow
                key={c.id}
                coin={c}
                formatPrice={formatPrice}
                changeColor={changeColor}
              />
            ))}
          </div>
        </motion.div>

        {/* Popular */}
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-2xl p-6 shadow-xl border border-white/10"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Popular</h3>
            <span className="text-xs text-gray-400">24h Change</span>
          </div>
          <div className="space-y-3">
            {!loading && !error && findByIds(popularList).map((c) => (
              <CoinRow
                key={c.id}
                coin={c}
                formatPrice={formatPrice}
                changeColor={changeColor}
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="text-xs text-gray-500 text-center">
        Prices from CoinGecko · Updates every {Math.round(refreshIntervalMs / 1000)}s
      </div>
    </div>
  );
}

// Coin Row Component with Price Target
function CoinRow({
  coin,
  formatPrice,
  changeColor
}: {
  coin: Coin;
  formatPrice: (p: number) => string;
  changeColor: (v: number | null) => string;
}) {
  const [showTarget, setShowTarget] = useState(false);
  const [targetPrice, setTargetPrice] = useState('');
  const [showPredictionModal, setShowPredictionModal] = useState(false);

  const handleSetTarget = () => {
    if (targetPrice && parseFloat(targetPrice) > 0) {
      setShowPredictionModal(true);
      setShowTarget(false);
    }
  };

  return (
    <div className="group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <img src={coin.image} alt={coin.symbol} className="w-8 h-8 rounded-full" />
          <div className="flex-1">
            <div className="text-sm text-white font-medium">{coin.symbol.toUpperCase()}</div>
            <div className="text-xs text-gray-400">{formatPrice(coin.current_price)}</div>
            {showTarget && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-20 bg-white/10 border border-white/20 rounded px-2 py-1 text-xs text-white"
                  placeholder="Target $"
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  type="button"
                  onClick={handleSetTarget}
                  className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                >
                  Set
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`text-sm font-medium ${changeColor(coin.price_change_percentage_24h)}`}>
            {coin.price_change_percentage_24h !== null
              ? `${coin.price_change_percentage_24h >= 0 ? '+' : ''}${coin.price_change_percentage_24h.toFixed(2)}%`
              : '—'}
          </div>
          <button
            onClick={() => setShowTarget(!showTarget)}
            className="text-xs text-purple-400 hover:text-purple-300 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Set price target"
          >
            🎯
          </button>
        </div>
      </div>
      {showPredictionModal && (
        <PriceTargetPredictionModal
          isOpen={showPredictionModal}
          onClose={() => {
            setShowPredictionModal(false);
            setTargetPrice('');
          }}
          coin={coin}
          targetPrice={targetPrice}
          onSuccess={() => {
            // Trigger window event to notify CascadingPredictions to refetch
            window.dispatchEvent(new CustomEvent('predictionCreated'));
          }}
        />
      )}
    </div>
  );
}
