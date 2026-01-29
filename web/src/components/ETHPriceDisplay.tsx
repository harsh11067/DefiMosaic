"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function ETHPriceDisplay() {
  const [price, setPrice] = useState<number | null>(null);
  const [change24h, setChange24h] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchETHPrice() {
      try {
        // Use Next.js API route as proxy to avoid CORS issues
        const res = await fetch('/api/eth-price');
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        if (data.price) {
          setPrice(data.price);
          setChange24h(data.change24h);
        }
      } catch (err) {
        console.error('Failed to fetch ETH price:', err);
        // Set fallback values
        setPrice(null);
        setChange24h(null);
      } finally {
        setLoading(false);
      }
    }

    fetchETHPrice();
    const interval = setInterval(fetchETHPrice, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-4 border border-white/10">
        <div className="text-gray-400">Loading ETH price...</div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10"
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-400 mb-1">ETH Price</div>
          <div className="text-2xl font-bold text-white">
            ${price?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400 mb-1">24h Change</div>
          <div className={`text-xl font-bold ${change24h && change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {change24h !== null ? `${change24h >= 0 ? '+' : ''}${change24h.toFixed(2)}%` : '—'}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
