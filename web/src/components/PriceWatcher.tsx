"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ChartBarIcon, ArrowUpIcon, ArrowDownIcon } from "@heroicons/react/24/outline";

interface PriceData {
  price: number;
  change24h: number;
  changePercent24h: number;
  timestamp: number;
}

export default function PriceWatcher() {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        setLoading(true);
        setError(null);

        // Real ETH price via our CoinGecko proxy
        const response = await fetch("/api/eth-price");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        if (typeof data.price !== "number") throw new Error("No price data");

        const changePercent = typeof data.change24h === "number" ? data.change24h : 0;
        setPriceData({
          price: data.price,
          change24h: (data.price * changePercent) / 100,
          changePercent24h: changePercent,
          timestamp: Date.now(),
        });
      } catch (err) {
        console.error("Failed to fetch price:", err);
        setError("Failed to fetch price data");
      } finally {
        setLoading(false);
      }
    };

    fetchPrice();
    
    // Update price every 30 seconds
    const interval = setInterval(fetchPrice, 30000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-gray-400 animate-pulse" />
          <span className="text-gray-400">Loading ETH price...</span>
        </div>
      </div>
    );
  }

  if (error && !priceData) {
    return (
      <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="h-5 w-5 text-red-400" />
          <span className="text-red-400">{error}</span>
        </div>
      </div>
    );
  }

  if (!priceData) return null;

  const isPositive = priceData.change24h >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 border border-white/10 rounded-lg p-4 hover:border-purple-500/50 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg">
            <ChartBarIcon className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">ETH Price</h3>
            <p className="text-sm text-gray-400">Live market data</p>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            ${priceData.price.toFixed(2)}
          </div>
          <div className={`flex items-center gap-1 text-sm ${
            isPositive ? "text-green-400" : "text-red-400"
          }`}>
            {isPositive ? (
              <ArrowUpIcon className="h-4 w-4" />
            ) : (
              <ArrowDownIcon className="h-4 w-4" />
            )}
            <span>
              {isPositive ? "+" : ""}${priceData.change24h.toFixed(2)} ({priceData.changePercent24h.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>
      
      <div className="mt-3 text-xs text-gray-500">
        Last updated: {new Date(priceData.timestamp).toLocaleTimeString()}
      </div>
    </motion.div>
  );
}









