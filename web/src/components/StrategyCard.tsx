"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { UserGroupIcon, CurrencyDollarIcon, ArrowTrendingUpIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';
import FollowPaymentModal from './FollowPaymentModal';
import { useRouter } from 'next/navigation';

interface StrategyCardProps {
  strategy: {
    id: number;
    uniqueId?: string;
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
  onFollow?: (strategyId: number, amount: number) => void;
  onUnfollow?: (strategyId: number) => void;
  isFollowing?: boolean;
  isCreator?: boolean;
}

export default function StrategyCard({
  strategy,
  onFollow,
  onUnfollow,
  isFollowing = false,
  isCreator = false,
}: StrategyCardProps) {
  const router = useRouter();
  const [showFollowModal, setShowFollowModal] = useState(false);

  const formatAddress = (addr?: string | null) => {
    if (!addr || addr.length < 10) return 'Unknown';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };
  

  const handleFollowClick = () => {
    if (isFollowing) {
      onUnfollow?.(strategy.id);
    } else {
      setShowFollowModal(true);
    }
  };

  const handleFollowConfirm = (amount: number) => {
    onFollow?.(strategy.id, amount);
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) return `$${(amount / 1000000).toFixed(2)}M`;
    if (amount >= 1000) return `$${(amount / 1000).toFixed(2)}K`;
    return `$${amount.toFixed(2)}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-xl font-semibold text-white">{strategy.name}</h3>
            {strategy.uniqueId && (
              <span className="px-2 py-0.5 text-xs bg-blue-600/20 text-blue-300 border border-blue-500/40 rounded">
                ID: {strategy.uniqueId}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mb-2">{strategy.description}</p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <span>Creator:</span>
            <span className="text-purple-400">{formatAddress(strategy.creator)}</span>
            {isCreator && (
              <span className="px-2 py-0.5 bg-purple-600/30 text-purple-300 rounded">You</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="flex items-center gap-2">
          <UserGroupIcon className="h-5 w-5 text-blue-400" />
          <div>
            <div className="text-xs text-gray-400">Followers</div>
            <div className="text-lg font-semibold text-white">{strategy.totalFollowers}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <CurrencyDollarIcon className="h-5 w-5 text-green-400" />
          <div>
            <div className="text-xs text-gray-400">TVL</div>
            <div className="text-lg font-semibold text-white">
              {formatCurrency(strategy.totalValueLocked)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ArrowTrendingUpIcon className="h-5 w-5 text-purple-400" />
          <div>
            <div className="text-xs text-gray-400">Total Gains</div>
            <div className="text-lg font-semibold text-green-400">
              {formatCurrency(strategy.totalGains)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ArrowTrendingUpIcon className="h-5 w-5 text-yellow-400" />
          <div>
            <div className="text-xs text-gray-400">Today Gains</div>
            <div className="text-lg font-semibold text-yellow-400">
              {formatCurrency(strategy.todayGains)}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <div className="text-sm space-y-1">
          <div className="text-gray-400">
            Strategy Fee: <span className="text-white font-medium">{(strategy.feeBPS / 100).toFixed(2)}%</span>
          </div>
          <div className="text-gray-400">
            Estimated Cost: <span className="text-white font-medium">Investment + {(strategy.feeBPS / 100).toFixed(2)}% fee</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push(`/dashboard/strategy/${strategy.id}`)}
            className="px-3 py-2 rounded-lg bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/50 transition-all flex items-center gap-2"
          >
            <Cog6ToothIcon className="h-4 w-4" />
            Manage
          </button>
          {!isCreator && (
            <button
              onClick={handleFollowClick}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                isFollowing
                  ? 'bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/50'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
              }`}
            >
              {isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          )}
          {isCreator && (
            <span className="px-4 py-2 rounded-lg bg-purple-600/20 text-purple-300 border border-purple-500/50">
              Your Strategy
            </span>
          )}
        </div>
      </div>

      <FollowPaymentModal
        isOpen={showFollowModal}
        onClose={() => setShowFollowModal(false)}
        onConfirm={handleFollowConfirm}
        strategyName={strategy.name}
        feeBPS={strategy.feeBPS}
      />
    </motion.div>
  );
}
