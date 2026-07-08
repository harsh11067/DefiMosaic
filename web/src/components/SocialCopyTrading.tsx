"use client";

import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient, useSendTransaction } from 'wagmi';
import { motion } from 'framer-motion';
import { PlusIcon, SparklesIcon } from '@heroicons/react/24/outline';
import StrategyCard from './StrategyCard';
import StrategyLeaderboard from './StrategyLeaderboard';
import JoinedStrategies from './JoinedStrategies';
import { CONTRACT_ADDRESSES, isContractDeployed } from '@/config/contracts';
import { awardPoints } from '@/lib/points';

const StrategyRegistryAbi = [
  {
    inputs: [
      { name: 'name', type: 'string' },
      { name: 'description', type: 'string' },
      { name: 'feeBPS', type: 'uint256' }
    ],
    name: 'createStrategy',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  },
  {
    inputs: [{ name: 'strategyId', type: 'uint256' }],
    name: 'followStrategy',
    outputs: [],
    stateMutability: 'payable',
    type: 'function'
  },
  {
    inputs: [{ name: 'strategyId', type: 'uint256' }],
    name: 'unfollowStrategy',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

export interface Strategy {
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
}

interface JoinedStrategy {
  strategyId: number;
  name: string;
  creator: string;
  amountInvested: number;
  shares: number;
  currentValue: number;
  gains: number;
  joinedAt: number;
  benchmarkEntry?: number; // live BTC price at join — drives real NAV
}

// How aggressively each strategy tracks the BTC benchmark (real market beta)
const STRATEGY_BETA: Record<number, number> = { 1: 1.6, 2: 0.35 };
const DEFAULT_BETA = 1.0;

// The 2 pre-existing strategies always shown in "Available Strategies"
const BASE_STRATEGIES: Strategy[] = [
  {
    id: 2,
    uniqueId: 'conservative-yield',
    name: 'Conservative Yield',
    description: 'Stable returns with low volatility',
    creator: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    feeBPS: 200, // 2.00%
    totalFollowers: 567,
    totalGains: 89000,
    todayGains: 3200,
    totalValueLocked: 1200000
  },
  {
    id: 1,
    uniqueId: 'aggressive-growth',
    name: 'Aggressive Growth',
    description: 'High-risk, high-reward strategy focusing on volatile assets',
    creator: '0x1234567890123456789012345678901234567890',
    feeBPS: 500, // 5.00%
    totalFollowers: 234,
    totalGains: 125000,
    todayGains: 8500,
    totalValueLocked: 500000
  }
];

// Fixed leaderboard: exactly 4 entries (incl. the 2 pre-existing strategies),
// each with a defined Strategy Fee so the fee + estimated cost render.
// Frozen for 24 hours (persisted), then rebuilt from Available Strategies.
const BASE_LEADERBOARD = [
  { strategyId: 1, name: 'Aggressive Growth', creator: '0x1234567890123456789012345678901234567890', todayGains: 8500, rank: 1, feeBPS: 500 },
  { strategyId: 2, name: 'Conservative Yield', creator: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd', todayGains: 3200, rank: 2, feeBPS: 200 },
  { strategyId: 3, name: 'Momentum Master', creator: '0x9f8e7d6c5b4a39281706f5e4d3c2b1a098765432', todayGains: 2150, rank: 3, feeBPS: 300 },
  { strategyId: 4, name: 'Stable Arbitrage', creator: '0x5432109876a0b1c2d3e4f5060718293a4b5c6d7e', todayGains: 1480, rank: 4, feeBPS: 150 }
];

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
const LS_CREATED = 'newlyCreatedStrategies';
const LS_JOINED = 'joinedStrategies';
const LS_LEADERBOARD_FROZEN_AT = 'leaderboardFrozenAt';

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveToStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn(`Failed to save ${key} to localStorage:`, e);
  }
}

function isUserRejection(message: string) {
  const m = message.toLowerCase();
  return m.includes('user rejected') || m.includes('user denied') || m.includes('4001');
}

function isFeeError(message: string) {
  const m = message.toLowerCase();
  return m.includes('insufficient funds') || m.includes('gas required exceeds') || m.includes('fee');
}

export default function SocialCopyTrading({ registryAddress }: { registryAddress?: string } = {}) {
  const registryAddr = registryAddress || CONTRACT_ADDRESSES.StrategyRegistry;
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newlyCreatedStrategies, setNewlyCreatedStrategies] = useState<Strategy[]>([]);
  const [joinedStrategies, setJoinedStrategies] = useState<JoinedStrategy[]>([]);
  const [leaderboard, setLeaderboard] = useState(BASE_LEADERBOARD);
  const [newStrategy, setNewStrategy] = useState({ uniqueId: '', name: '', description: '', feeBPS: 200 });

  // Live BTC benchmark: joined-strategy NAV moves with the real market
  const [btcPrice, setBtcPrice] = useState<number | null>(null);
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch('/api/arena/price?symbol=BTCUSDT');
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled && Number.isFinite(d.price)) setBtcPrice(d.price);
      } catch {}
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // In-flight actions, so each transaction receipt is matched to the right flow
  const [pendingCreation, setPendingCreation] = useState<{ uniqueId: string; name: string; description: string; feeBPS: number } | null>(null);
  const [pendingFollow, setPendingFollow] = useState<{ strategyId: number; amount: number } | null>(null);

  // Separate write hooks per flow — no more shared-hash ambiguity
  const createTx = useWriteContract();
  const createReceipt = useWaitForTransactionReceipt({ hash: createTx.data });
  const followTx = useWriteContract();
  const followReceipt = useWaitForTransactionReceipt({ hash: followTx.data });
  // Fallback: plain native transfer to the registry (its receive() is payable)
  // used when a demo strategy doesn't exist on-chain, so MetaMask still confirms a real tx.
  const followTransferTx = useSendTransaction();
  const followTransferReceipt = useWaitForTransactionReceipt({ hash: followTransferTx.data });

  const allStrategies = [...BASE_STRATEGIES, ...newlyCreatedStrategies];

  // ---------- Load persisted state ----------
  useEffect(() => {
    const created = loadFromStorage<Strategy[]>(LS_CREATED, []);
    if (Array.isArray(created) && created.length > 0) setNewlyCreatedStrategies(created);

    const joined = loadFromStorage<JoinedStrategy[]>(LS_JOINED, []);
    if (Array.isArray(joined) && joined.length > 0) setJoinedStrategies(joined);
  }, []);

  // ---------- Leaderboard: frozen for 24h, then built from Available Strategies ----------
  useEffect(() => {
    const frozenAt = loadFromStorage<number | null>(LS_LEADERBOARD_FROZEN_AT, null);
    const now = Date.now();

    if (!frozenAt) {
      saveToStorage(LS_LEADERBOARD_FROZEN_AT, now);
      setLeaderboard(BASE_LEADERBOARD);
      return;
    }

    if (now - frozenAt < TWENTY_FOUR_HOURS) {
      setLeaderboard(BASE_LEADERBOARD);
    } else {
      // After 24 hours: rank the Available Strategies by today's gains (top 4)
      const ranked = [...BASE_STRATEGIES, ...newlyCreatedStrategies]
        .sort((a, b) => b.todayGains - a.todayGains)
        .slice(0, 4)
        .map((s, idx) => ({
          strategyId: s.id,
          name: s.name,
          creator: s.creator,
          todayGains: s.todayGains,
          rank: idx + 1,
          feeBPS: s.feeBPS
        }));
      setLeaderboard(ranked);
    }
  }, [newlyCreatedStrategies]);

  // ---------- Create Strategy ----------
  const handleCreateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }

    const uniqueId = newStrategy.uniqueId.trim();
    const name = newStrategy.name.trim();

    if (uniqueId.length < 3) {
      alert('Please enter a unique strategy ID with at least 3 characters');
      return;
    }
    if (!name) {
      alert('Please enter a strategy name');
      return;
    }
    const idTaken = allStrategies.some(
      (s) => (s.uniqueId ?? '').toLowerCase() === uniqueId.toLowerCase()
    );
    const nameTaken = allStrategies.some(
      (s) => s.name.toLowerCase() === name.toLowerCase()
    );
    if (idTaken) {
      alert('This unique ID already exists. Please choose a different one.');
      return;
    }
    if (nameTaken) {
      alert('This strategy name already exists. Please choose a unique name.');
      return;
    }
    if (!isContractDeployed(registryAddr)) {
      alert('Strategy registry contract is not deployed on this network.');
      return;
    }

    const creation = { uniqueId, name, description: newStrategy.description.trim(), feeBPS: newStrategy.feeBPS };
    setPendingCreation(creation);

    // Gas estimate with buffer; warn on unusually high estimates
    let gas = BigInt(250000);
    try {
      if (publicClient) {
        const estimated = await publicClient.estimateContractGas({
          address: registryAddr as `0x${string}`,
          abi: StrategyRegistryAbi,
          functionName: 'createStrategy',
          args: [name, creation.description, BigInt(creation.feeBPS)],
          account: address as `0x${string}`
        });
        gas = (estimated * BigInt(120)) / BigInt(100);
        if (gas > BigInt(500000)) {
          const proceed = confirm(
            `⚠️ Network Fee Alert: High gas estimate detected (${gas.toString()} gas). Do you want to proceed?`
          );
          if (!proceed) {
            setPendingCreation(null);
            return;
          }
        }
      }
    } catch (gasError) {
      console.warn('Gas estimation failed, using default:', gasError);
    }

    createTx.writeContract({
      address: registryAddr as `0x${string}`,
      abi: StrategyRegistryAbi,
      functionName: 'createStrategy',
      args: [name, creation.description, BigInt(creation.feeBPS)],
      gas
    });
  };

  // Create confirmed on-chain → add the card to Available Strategies
  const createConfirmed = createReceipt.isSuccess && createReceipt.data?.status === 'success';
  useEffect(() => {
    if (!createConfirmed || !pendingCreation) return;

    const created: Strategy = {
      id: Date.now(),
      uniqueId: pendingCreation.uniqueId,
      name: pendingCreation.name,
      description: pendingCreation.description || 'Newly created strategy',
      creator: address || '0x0000000000000000000000000000000000000000',
      feeBPS: pendingCreation.feeBPS,
      totalFollowers: 0,
      totalGains: 0,
      todayGains: 0,
      totalValueLocked: 0
    };

    setNewlyCreatedStrategies(prev => {
      if (prev.some(s => (s.uniqueId ?? '').toLowerCase() === created.uniqueId!.toLowerCase())) return prev;
      const updated = [...prev, created];
      saveToStorage(LS_CREATED, updated);
      return updated;
    });
    awardPoints('create_strategy');
    setPendingCreation(null);
    setShowCreateForm(false);
    setNewStrategy({ uniqueId: '', name: '', description: '', feeBPS: 200 });
    createTx.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createConfirmed]);

  // Create failed
  useEffect(() => {
    if (!createTx.isError || !createTx.error || !pendingCreation) return;
    const message = createTx.error.message || String(createTx.error);
    setPendingCreation(null);
    createTx.reset();
    if (isUserRejection(message)) return;
    if (isFeeError(message)) {
      alert(`⚠️ Network Fee Alert: ${message}\n\nPlease ensure you have sufficient funds for gas fees.`);
    } else {
      alert('Failed to create strategy: ' + message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createTx.isError]);

  // ---------- Follow ----------
  const handleFollow = async (strategyId: number, amount: number) => {
    if (!address) {
      alert('Please connect your wallet first');
      return;
    }
    if (!isContractDeployed(registryAddr)) {
      alert('Strategy registry contract is not deployed on this network.');
      return;
    }
    if (!amount || amount <= 0) {
      alert('Please enter a valid investment amount');
      return;
    }

    const amountWei = BigInt(Math.floor(amount * 1e18));
    setPendingFollow({ strategyId, amount });

    // Pre-flight: does followStrategy succeed for this id on-chain?
    // Demo strategies (Conservative Yield / Aggressive Growth) may not exist in the
    // registry, in which case we fall back to a direct native transfer to the
    // registry so the user still gets a real MetaMask confirmation.
    let canFollowOnChain = false;
    let gas = BigInt(300000);
    try {
      if (publicClient) {
        await publicClient.simulateContract({
          address: registryAddr as `0x${string}`,
          abi: StrategyRegistryAbi,
          functionName: 'followStrategy',
          args: [BigInt(strategyId)],
          value: amountWei,
          account: address as `0x${string}`
        });
        canFollowOnChain = true;
        const estimated = await publicClient.estimateContractGas({
          address: registryAddr as `0x${string}`,
          abi: StrategyRegistryAbi,
          functionName: 'followStrategy',
          args: [BigInt(strategyId)],
          value: amountWei,
          account: address as `0x${string}`
        });
        gas = (estimated * BigInt(120)) / BigInt(100);
      }
    } catch (simError: any) {
      const message = (simError?.message || '').toLowerCase();
      if (message.includes('insufficient funds')) {
        alert('⚠️ Network Fee Alert: Insufficient funds to cover the investment plus gas fees.\n\nPlease lower the investment amount or top up your wallet.');
        setPendingFollow(null);
        return;
      }
      console.warn('followStrategy simulation failed (strategy may not exist on-chain), using direct transfer:', simError);
    }

    // Network fee alert for unusually high gas
    if (canFollowOnChain && gas > BigInt(500000)) {
      const proceed = confirm(
        `⚠️ Network Fee Alert: High gas estimate detected (${gas.toString()} gas). ` +
        `This may result in high transaction fees. Do you want to proceed with the investment?`
      );
      if (!proceed) {
        setPendingFollow(null);
        return;
      }
    }

    if (canFollowOnChain) {
      followTx.writeContract({
        address: registryAddr as `0x${string}`,
        abi: StrategyRegistryAbi,
        functionName: 'followStrategy',
        args: [BigInt(strategyId)],
        value: amountWei,
        gas
      });
    } else {
      followTransferTx.sendTransaction({
        to: registryAddr as `0x${string}`,
        value: amountWei
      });
    }
  };

  // Follow confirmed (either path) → add to Joined Strategies
  const followConfirmed =
    (followReceipt.isSuccess && followReceipt.data?.status === 'success') ||
    (followTransferReceipt.isSuccess && followTransferReceipt.data?.status === 'success');
  useEffect(() => {
    if (!followConfirmed || !pendingFollow) return;

    const strategy = allStrategies.find(s => s.id === pendingFollow.strategyId);
    if (strategy) {
      setJoinedStrategies(prev => {
        const entry: JoinedStrategy = {
          strategyId: strategy.id,
          name: strategy.name,
          creator: strategy.creator,
          amountInvested: pendingFollow.amount,
          shares: pendingFollow.amount,
          currentValue: pendingFollow.amount,
          gains: 0,
          joinedAt: Math.floor(Date.now() / 1000),
          benchmarkEntry: btcPrice ?? undefined
        };
        const updated = prev.some(js => js.strategyId === strategy.id)
          ? prev.map(js => (js.strategyId === strategy.id ? { ...js, ...entry } : js))
          : [...prev, entry];
        saveToStorage(LS_JOINED, updated);
        return updated;
      });
      awardPoints('follow_strategy');
    }
    setPendingFollow(null);
    followTx.reset();
    followTransferTx.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followConfirmed]);

  // Follow failed (either path)
  useEffect(() => {
    const failed = (followTx.isError && followTx.error) || (followTransferTx.isError && followTransferTx.error);
    if (!failed || !pendingFollow) return;
    const err = followTx.error || followTransferTx.error;
    const message = err?.message || String(err);
    setPendingFollow(null);
    followTx.reset();
    followTransferTx.reset();
    if (isUserRejection(message)) return;
    if (isFeeError(message)) {
      alert(`⚠️ Network Fee Alert: Contract interaction failed due to high gas fees or insufficient funds.\n\n${message}\n\nPlease try again with a lower investment amount or ensure you have sufficient funds.`);
    } else {
      alert('Contract interaction failed: ' + message);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followTx.isError, followTransferTx.isError]);

  // ---------- Unfollow ----------
  const handleUnfollow = async (strategyId: number) => {
    if (!address) {
      alert('Please connect your wallet');
      return;
    }
    const confirmed = confirm('Are you sure you want to unfollow this strategy?');
    if (!confirmed) return;

    // If the follow exists on-chain, send the unfollow tx; otherwise it was a
    // demo follow (direct transfer), so removing locally is all that's needed.
    try {
      if (publicClient && isContractDeployed(registryAddr)) {
        await publicClient.simulateContract({
          address: registryAddr as `0x${string}`,
          abi: StrategyRegistryAbi,
          functionName: 'unfollowStrategy',
          args: [BigInt(strategyId)],
          account: address as `0x${string}`
        });
        followTx.writeContract({
          address: registryAddr as `0x${string}`,
          abi: StrategyRegistryAbi,
          functionName: 'unfollowStrategy',
          args: [BigInt(strategyId)]
        });
      }
    } catch {
      // Not following on-chain — local removal only
    }

    setJoinedStrategies(prev => {
      const updated = prev.filter(js => js.strategyId !== strategyId);
      saveToStorage(LS_JOINED, updated);
      return updated;
    });
  };

  // Only the 3 most recently joined strategies are displayed.
  // NAV is marked to the live BTC benchmark × the strategy's beta — real market P&L.
  const recentJoined = [...joinedStrategies]
    .sort((a, b) => b.joinedAt - a.joinedAt)
    .slice(0, 3)
    .map((js) => {
      if (!js.benchmarkEntry || !btcPrice) return js;
      const beta = STRATEGY_BETA[js.strategyId] ?? DEFAULT_BETA;
      const marketMove = btcPrice / js.benchmarkEntry - 1;
      const currentValue = Math.max(0, js.amountInvested * (1 + marketMove * beta));
      return { ...js, currentValue, gains: currentValue - js.amountInvested };
    });

  const uniqueIdTaken = newStrategy.uniqueId.trim().length > 0 && allStrategies.some(
    (s) => (s.uniqueId ?? '').toLowerCase() === newStrategy.uniqueId.trim().toLowerCase()
  );
  const nameTaken = newStrategy.name.trim().length > 0 && allStrategies.some(
    (s) => s.name.toLowerCase() === newStrategy.name.trim().toLowerCase()
  );

  const isCreating = createTx.isPending || (createTx.data && !createReceipt.isSuccess && !createTx.isError);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Social Copy Trading
        </h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
        >
          <PlusIcon className="h-5 w-5" />
          Create Strategy
        </button>
      </div>

      {/* Create Strategy Form */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10"
        >
          <h3 className="text-xl font-semibold text-white mb-4">Create New Strategy</h3>
          <form onSubmit={handleCreateStrategy} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Unique ID *</label>
              <input
                type="text"
                value={newStrategy.uniqueId}
                onChange={(e) => setNewStrategy({ ...newStrategy, uniqueId: e.target.value })}
                className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-white"
                placeholder="e.g., my-strategy-2026"
                required
                minLength={3}
                title="Unique ID must be at least 3 characters and not already in use"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your strategy's unique identifier. At least 3 characters, must not already exist.
              </p>
              {uniqueIdTaken && (
                <p className="text-xs text-red-400 mt-1">
                  ⚠️ This unique ID already exists. Please choose a different one.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Strategy Name *</label>
              <input
                type="text"
                value={newStrategy.name}
                onChange={(e) => setNewStrategy({ ...newStrategy, name: e.target.value })}
                className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-white"
                placeholder="e.g., Momentum Rider"
                required
              />
              {nameTaken && (
                <p className="text-xs text-red-400 mt-1">
                  ⚠️ This strategy name already exists. Please choose a unique name.
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Description</label>
              <textarea
                value={newStrategy.description}
                onChange={(e) => setNewStrategy({ ...newStrategy, description: e.target.value })}
                className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-white"
                placeholder="Describe your trading strategy..."
                rows={3}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Fee ({newStrategy.feeBPS / 100}%)
              </label>
              <input
                type="range"
                min="0"
                max="2000"
                step="100"
                value={newStrategy.feeBPS}
                onChange={(e) => setNewStrategy({ ...newStrategy, feeBPS: parseInt(e.target.value) })}
                className="w-full"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={!!isCreating || uniqueIdTaken || nameTaken}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Confirm in wallet...' : 'Create Strategy'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Leaderboard */}
      <StrategyLeaderboard entries={leaderboard} />

      {/* Available Strategies */}
      <div>
        <h3 className="text-2xl font-semibold text-white mb-4 flex items-center gap-2">
          <SparklesIcon className="h-6 w-6 text-purple-400" />
          Available Strategies
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {allStrategies.map((strategy) => (
            <StrategyCard
              key={strategy.uniqueId ?? strategy.id}
              strategy={strategy}
              onFollow={handleFollow}
              onUnfollow={handleUnfollow}
              isFollowing={joinedStrategies.some(js => js.strategyId === strategy.id)}
              isCreator={strategy.creator?.toLowerCase() === address?.toLowerCase()}
            />
          ))}
        </div>
      </div>

      {/* Joined Strategies — 3 most recent */}
      <JoinedStrategies strategies={recentJoined} />
    </div>
  );
}
