"use client";

import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { motion } from 'framer-motion';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { CONTRACT_ADDRESSES, isContractDeployed } from '@/config/contracts';

const MultiversePredictionAbi = [
  {
    inputs: [
      { name: 'priceFeed', type: 'address' },
      { name: 'priceTarget', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'leverageBPS', type: 'uint256' }
    ],
    name: 'createRootPrediction',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'payable',
    type: 'function'
  }
] as const;

interface PriceTargetPredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  coin: {
    id: string;
    symbol: string;
    name: string;
    image: string;
    current_price: number;
  };
  targetPrice: string;
  onSuccess?: () => void; // Callback when prediction is created successfully
}

export default function PriceTargetPredictionModal({
  isOpen,
  onClose,
  coin,
  targetPrice,
  onSuccess
}: PriceTargetPredictionModalProps) {
  const { address } = useAccount();
  const { writeContract, isPending, data: hash, isSuccess } = useWriteContract();
  const { data: receipt } = useWaitForTransactionReceipt({ hash });
  const [betAmount, setBetAmount] = useState('');
  const [deadline, setDeadline] = useState('');
  const [leverage, setLeverage] = useState('5000');

  if (!isOpen) return null;

  const handleCreatePrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!betAmount || parseFloat(betAmount) <= 0) {
      alert('Please enter a valid bet amount');
      return;
    }

    if (!deadline) {
      alert('Please select a deadline');
      return;
    }

    if (!isContractDeployed(CONTRACT_ADDRESSES.MultiversePrediction) || !isContractDeployed(CONTRACT_ADDRESSES.MockOracle)) {
      alert('Contracts not deployed. Please deploy MultiversePrediction and MockOracle first.');
      return;
    }

    try {
      const deadlineTimestamp = Math.floor(new Date(deadline).getTime() / 1000);
      const priceTarget = BigInt(Math.floor(parseFloat(targetPrice) * 1e8));
      const leverageBPS = BigInt(leverage);

      writeContract({
        address: CONTRACT_ADDRESSES.MultiversePrediction as `0x${string}`,
        abi: MultiversePredictionAbi,
        functionName: 'createRootPrediction',
        args: [
          CONTRACT_ADDRESSES.MockOracle as `0x${string}`,
          priceTarget,
          BigInt(deadlineTimestamp),
          leverageBPS
        ],
        value: BigInt(Math.floor(parseFloat(betAmount) * 1e18))
      });

      // Don't close immediately - wait for success
    } catch (error) {
      console.error('Failed to create prediction:', error);
      alert('Failed to create prediction: ' + (error as Error).message);
    }
  };

  // Close modal after successful transaction
  React.useEffect(() => {
    if (isSuccess && receipt) {
      setTimeout(() => {
        onClose();
        setBetAmount('');
        setDeadline('');
        setLeverage('5000');
        // Trigger refetch in parent component
        if (onSuccess) {
          onSuccess();
        }
      }, 2000);
    }
  }, [isSuccess, receipt, onClose, onSuccess]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-white/10 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-white">Create Prediction</h3>
            <p className="text-sm text-gray-400 mt-1">
              {coin.symbol.toUpperCase()} - Target: ${targetPrice}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleCreatePrediction} className="space-y-4">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-3 mb-2">
              <img src={coin.image} alt={coin.symbol} className="w-8 h-8 rounded-full" />
              <div>
                <div className="text-sm font-medium text-white">{coin.name}</div>
                <div className="text-xs text-gray-400">Current: ${coin.current_price.toFixed(2)}</div>
              </div>
            </div>
            <div className="text-sm text-gray-300">
              Target Price: <span className="text-purple-400 font-semibold">${targetPrice}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Bet Amount (MATIC)</label>
            <input
              type="number"
              step="0.0001"
              value={betAmount}
              onChange={(e) => setBetAmount(e.target.value)}
              className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-white"
              placeholder="0.0001"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Deadline</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Leverage ({parseInt(leverage) / 100}%)
            </label>
            <input
              type="range"
              min="0"
              max="8000"
              step="500"
              value={leverage}
              onChange={(e) => setLeverage(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isPending ? 'Creating...' : 'Create Prediction'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
