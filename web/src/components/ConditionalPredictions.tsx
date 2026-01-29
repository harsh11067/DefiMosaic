"use client";

import React, { useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { motion } from 'framer-motion';
import { LinkIcon, ArrowRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

// Mock ABI - replace with actual MultiversePrediction ABI
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
  },
  {
    inputs: [
      { name: 'parentId', type: 'uint256' },
      { name: 'priceFeed', type: 'address' },
      { name: 'priceTarget', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'leverageBPS', type: 'uint256' }
    ],
    name: 'createChildPrediction',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function'
  }
] as const;

interface ConditionalPredictionsProps {
  contractAddress?: string;
  oracleAddress?: string;
}

export default function ConditionalPredictions({ contractAddress, oracleAddress }: ConditionalPredictionsProps) {
  const { address } = useAccount();
  const { writeContract } = useWriteContract();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedParent, setSelectedParent] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    priceTarget: '',
    deadline: '',
    leverage: '5000', // 50%
    collateral: ''
  });

  const handleCreateRoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractAddress || !oracleAddress) {
      alert('Contracts not deployed');
      return;
    }

    try {
      const deadline = Math.floor(new Date(formData.deadline).getTime() / 1000);
      const priceTarget = BigInt(Math.floor(parseFloat(formData.priceTarget) * 1e8));
      const leverage = BigInt(formData.leverage);

      writeContract({
        address: contractAddress as `0x${string}`,
        abi: MultiversePredictionAbi,
        functionName: 'createRootPrediction',
        args: [oracleAddress as `0x${string}`, priceTarget, BigInt(deadline), leverage],
        value: BigInt(Math.floor(parseFloat(formData.collateral) * 1e18))
      });

      setShowCreateForm(false);
      setFormData({ priceTarget: '', deadline: '', leverage: '5000', collateral: '' });
    } catch (error) {
      console.error('Failed to create prediction:', error);
    }
  };

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractAddress || !oracleAddress || !selectedParent) {
      alert('Missing required data');
      return;
    }

    try {
      const deadline = Math.floor(new Date(formData.deadline).getTime() / 1000);
      const priceTarget = BigInt(Math.floor(parseFloat(formData.priceTarget) * 1e8));
      const leverage = BigInt(formData.leverage);

      writeContract({
        address: contractAddress as `0x${string}`,
        abi: MultiversePredictionAbi,
        functionName: 'createChildPrediction',
        args: [BigInt(selectedParent), oracleAddress as `0x${string}`, priceTarget, BigInt(deadline), leverage]
      });

      setShowCreateForm(false);
      setSelectedParent(null);
      setFormData({ priceTarget: '', deadline: '', leverage: '5000', collateral: '' });
    } catch (error) {
      console.error('Failed to create child prediction:', error);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-2xl font-bold text-white mb-2">Conditional Predictions</h3>
          <p className="text-sm text-gray-400">
            Create cascading predictions with undercollateralized loans
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
        >
          {showCreateForm ? 'Cancel' : 'Create Prediction'}
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
          <div className="text-sm text-blue-200">
            <p className="font-semibold mb-1">How it works:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-300">
              <li>Post collateral for Prediction A</li>
              <li>Receive loan based on collateral value</li>
              <li>Loan funds Prediction B, which can fund Prediction C</li>
              <li>If parent fails, entire subtree liquidates</li>
              <li>If chain succeeds, amplified ROI</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/5 rounded-lg p-6 border border-white/10"
        >
          <h4 className="text-lg font-semibold text-white mb-4">
            {selectedParent ? `Create Child Prediction (Parent: #${selectedParent})` : 'Create Root Prediction'}
          </h4>
          
          <form onSubmit={selectedParent ? handleCreateChild : handleCreateRoot} className="space-y-4">
            {!selectedParent && (
              <div>
                <label className="block text-sm text-gray-300 mb-2">Collateral (MATIC)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.collateral}
                  onChange={(e) => setFormData({ ...formData, collateral: e.target.value })}
                  className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-white"
                  placeholder="0.0001"
                  required
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm text-gray-300 mb-2">Price Target (USD)</label>
              <input
                type="number"
                step="0.01"
                value={formData.priceTarget}
                onChange={(e) => setFormData({ ...formData, priceTarget: e.target.value })}
                className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-white"
                placeholder="1800"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-2">Deadline</label>
              <input
                type="datetime-local"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Leverage ({parseInt(formData.leverage) / 100}%)
              </label>
              <input
                type="range"
                min="0"
                max="8000"
                step="500"
                value={formData.leverage}
                onChange={(e) => setFormData({ ...formData, leverage: e.target.value })}
                className="w-full"
              />
              <div className="text-xs text-gray-400 mt-1">
                Max leverage: 80% (8000 basis points)
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg"
              >
                {selectedParent ? 'Create Child' : 'Create Root'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setSelectedParent(null);
                }}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Prediction Chain Visualization */}
      <div className="mt-6">
        <h4 className="text-lg font-semibold text-white mb-4">Your Prediction Chains</h4>
        <div className="text-sm text-gray-400">
          No predictions yet. Create your first prediction to start building chains.
        </div>
      </div>
    </div>
  );
}
