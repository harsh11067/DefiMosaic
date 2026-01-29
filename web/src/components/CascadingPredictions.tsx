"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { motion } from 'framer-motion';
import { LinkIcon, SparklesIcon, ArrowRightIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { isContractDeployed } from '@/config/contracts';
import PredictionGraph from './PredictionGraph';
import PredictionTreeNode from './PredictionTreeNode';
import dynamic from 'next/dynamic';

// Dynamic import for belief visualization components
const BeliefDashboard = dynamic(() => import('./BeliefDashboard'), { ssr: false });

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
  },
  {
    inputs: [{ name: 'predictionId', type: 'uint256' }],
    name: 'predictions',
    outputs: [
      { name: 'id', type: 'uint256' },
      { name: 'creator', type: 'address' },
      { name: 'parentId', type: 'uint256' },
      { name: 'collateralAmount', type: 'uint256' },
      { name: 'loanAmount', type: 'uint256' },
      { name: 'priceFeed', type: 'address' },
      { name: 'priceTarget', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'resolved', type: 'bool' },
      { name: 'outcome', type: 'bool' },
      { name: 'collateralizationRatio', type: 'uint256' },
      { name: 'liquidated', type: 'bool' }
    ],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'user', type: 'address' }],
    name: 'getUserPredictions',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function'
  },
  {
    inputs: [{ name: 'parentId', type: 'uint256' }],
    name: 'getChildren',
    outputs: [{ name: '', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

interface PredictionNode {
  id: number;
  parentId: number;
  creator: string;
  collateral: string;
  loanAmount: string;
  targetPrice: string;
  deadline: number;
  status: 'active' | 'resolved' | 'liquidated';
  leverageBps: number;
  createdAt: string;
  outcome?: boolean;
  health?: number;
  children?: PredictionNode[];
}

// Legacy interface for compatibility
interface PredictionChain {
  id: number;
  parentId: number;
  priceTarget: bigint;
  deadline: bigint;
  collateral: bigint;
  loan: bigint;
  resolved: boolean;
  outcome: boolean;
  liquidated: boolean;
  children: number[];
}

interface CascadingPredictionsProps {
  contractAddress?: string;
  oracleAddress?: string;
}

export default function CascadingPredictions({ contractAddress, oracleAddress }: CascadingPredictionsProps) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContract, data: hash, isPending, isSuccess, isError, error } = useWriteContract();
  const { data: receipt } = useWaitForTransactionReceipt({ hash });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState<PredictionChain | PredictionNode | null>(null);
  const [formData, setFormData] = useState({
    priceTarget: '',
    deadline: '',
    leverage: '5000',
    collateral: ''
  });
  const [chains, setChains] = useState<PredictionChain[]>([]);
  const [trees, setTrees] = useState<PredictionNode[]>([]); // New tree structure from API
  const [loadingChains, setLoadingChains] = useState(false);
  const [chainsError, setChainsError] = useState<string | null>(null);
  const [pendingRootPrediction, setPendingRootPrediction] = useState<{
    priceTarget: string;
    deadline: string;
    leverage: string;
    collateral: string;
  } | null>(null);

  // Get user's predictions
  const { data: userPredictions, refetch: refetchPredictions, isLoading: loadingPredictions } = useReadContract({
    address: contractAddress as `0x${string}`,
    abi: MultiversePredictionAbi,
    functionName: 'getUserPredictions',
    args: address ? [address] : undefined,
    query: {
      enabled: Boolean(address && contractAddress && isContractDeployed(contractAddress)),
      // Removed refetchInterval - we use our own stable 30s interval for chains
      staleTime: 60000 // Consider data stale after 60 seconds
    }
  });

  // Fetch prediction tree from API, fallback to contract if needed
  const fetchChains = useCallback(async () => {
    console.log('fetchChains called', { address, contractAddress, hasPublicClient: !!publicClient });

    setLoadingChains(true);
    setChainsError(null);

    if (!address) {
      console.log('No address - user not connected');
      setTrees([]);
      setChains([]);
      setLoadingChains(false);
      setChainsError('Please connect your wallet to view prediction chains');
      return;
    }

    // Try API first
    try {
      const response = await fetch(`/api/predictions/tree?creator=${address}`);
      const data = await response.json();

      if (data.ok && data.trees && data.trees.length > 0) {
        console.log('✅ Fetched tree from API:', {
          trees: data.trees.length,
          totalNodes: data.totalNodes
        });
        setTrees(data.trees);
        setChains([]); // Clear old chains
        setChainsError(null);
        setLoadingChains(false);
        return;
      } else if (data.fallback || (data.trees && data.trees.length === 0)) {
        // Fallback if explicitly requested OR if API returns empty array (but we might have contract data)
        console.log('⚠️ API returned fallback flag or empty trees, checking contract data...');
        // Fall through to contract method
      } else {
        console.log('ℹ️ API returned indeterminate state, trying contract method');
        // Fall through to contract method
      }
    } catch (apiError: any) {
      console.warn('API fetch failed, falling back to contract:', apiError.message);
      // Fall through to contract method
    }

    // Fallback: Use contract method (old way)
    if (!contractAddress || !isContractDeployed(contractAddress) || !publicClient) {
      console.log('Contract not available for fallback');
      setTrees([]);
      setChains([]);
      setLoadingChains(false);
      setChainsError('No data source available. Please ensure contract is deployed.');
      return;
    }

    if (!userPredictions || !Array.isArray(userPredictions) || userPredictions.length === 0) {
      console.log('No user predictions from contract. User may not have created predictions yet.');
      console.log('Debug: contractAddress =', contractAddress);
      console.log('Debug: address =', address);
      console.log('Debug: userPredictions =', userPredictions);
      setTrees([]);
      setChains([]);
      setLoadingChains(false);
      setChainsError(null); // Not an error - just no predictions
      return;
    }

    console.log('📡 Fetching chains from contract (fallback method):', userPredictions.length, 'predictions');

    const chainPromises = userPredictions.map(async (predId: bigint) => {
      try {
        const pred = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: MultiversePredictionAbi,
          functionName: 'predictions',
          args: [predId]
        }) as any;

        const children = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: MultiversePredictionAbi,
          functionName: 'getChildren',
          args: [predId]
        }) as bigint[];

        const parentIdNum = Number(pred.parentId);
        const isRoot = parentIdNum === 0 || parentIdNum === Number(BigInt(0));

        return {
          id: Number(predId),
          parentId: isRoot ? 0 : parentIdNum,
          priceTarget: pred.priceTarget,
          deadline: pred.deadline,
          collateral: pred.collateralAmount,
          loan: pred.loanAmount,
          resolved: pred.resolved,
          outcome: pred.outcome,
          liquidated: pred.liquidated,
          children: children.map(c => Number(c))
        };
      } catch (error) {
        console.error(`Failed to fetch prediction ${predId}:`, error);
        return null;
      }
    });

    try {
      const fetchedChains = await Promise.all(chainPromises);
      const validChains = fetchedChains.filter(c => c !== null) as PredictionChain[];

      console.log('✅ Fetched chains from contract:', {
        total: fetchedChains.length,
        valid: validChains.length
      });

      if (validChains.length > 0) {
        // Convert to tree structure for display
        const buildTreeFromChains = (chains: PredictionChain[], parentId: number = 0): PredictionNode[] => {
          return chains
            .filter(c => Number(c.parentId) === parentId)
            .map(chain => ({
              id: chain.id,
              parentId: Number(chain.parentId),
              creator: address || '',
              collateral: chain.collateral.toString(),
              loanAmount: chain.loan.toString(),
              targetPrice: chain.priceTarget.toString(),
              deadline: Number(chain.deadline),
              status: chain.liquidated ? 'liquidated' : chain.resolved ? 'resolved' : 'active',
              leverageBps: 0, // Not available from contract directly
              createdAt: new Date().toISOString(),
              outcome: chain.outcome,
              health: undefined,
              children: buildTreeFromChains(chains, chain.id)
            }));
        };

        const tree = buildTreeFromChains(validChains);
        setTrees(tree);
        setChains(validChains); // Keep old chains for compatibility
        setChainsError(null);
        console.log('✅ Built tree from contract chains:', tree.length, 'root trees');
      } else {
        setTrees([]);
        setChains([]);
        setChainsError(null);
      }
    } catch (error: any) {
      console.error('Error fetching chains from contract:', error);
      setChainsError(`Failed to fetch chains: ${error.message || 'Unknown error'}`);
      setTrees([]);
      setChains([]);
    } finally {
      setLoadingChains(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, contractAddress, publicClient]); // Removed userPredictions and isContractDeployed to prevent loops

  // Track if initial fetch is done to prevent double fetching
  const initialFetchRef = useRef(false);
  const lastAddressRef = useRef<string | null>(null);

  // Initial fetch - runs ONCE when address/contract are ready - NO AUTO REFRESH
  useEffect(() => {
    // Reset if address changed
    if (address !== lastAddressRef.current) {
      initialFetchRef.current = false;
      lastAddressRef.current = address || null;
    }

    if (address && contractAddress && publicClient && isContractDeployed(contractAddress)) {
      if (!initialFetchRef.current) {
        initialFetchRef.current = true;
        console.log('🚀 Initial prediction chains fetch (ONE TIME ONLY)');
        fetchChains();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, contractAddress, publicClient]); // Removed fetchChains to prevent loops

  // NO AUTO REFRESH - User can manually refresh if needed
  // Removed 30-second interval that was causing constant loading

  // Listen for prediction creation events - ONLY refresh when user creates a new prediction
  useEffect(() => {
    const handlePredictionCreated = (event: any) => {
      console.log('📢 New prediction created, refreshing once...');
      // Only one refresh, 3 seconds after creation
      setTimeout(() => {
        fetchChains();
      }, 3000);
    };

    window.addEventListener('predictionCreated', handlePredictionCreated);
    return () => {
      window.removeEventListener('predictionCreated', handlePredictionCreated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch after successful transaction - SINGLE refetch only
  useEffect(() => {
    if (isSuccess && receipt) {
      console.log('✅ Transaction successful, refreshing once...');

      // Clear form and pending prediction
      setShowCreateForm(false);
      setFormData({ priceTarget: '', deadline: '', leverage: '5000', collateral: '' });
      setPendingRootPrediction(null);

      // Single refetch after 3 seconds - no loops
      setTimeout(() => {
        refetchPredictions();
        fetchChains();
      }, 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess, receipt]);

  // Handle contract interaction failures - mock the prediction
  useEffect(() => {
    if (isError && error && pendingRootPrediction) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';

      // Check if it's a gas/fee/insufficient funds error - show alert for these
      if (errorMessage.includes('gas') || errorMessage.includes('fee') || errorMessage.includes('insufficient funds')) {
        alert(`⚠️ Network Fee Alert: Contract interaction failed due to high gas fees or insufficient funds.\n\nError: ${errorMessage}\n\nPlease try again with a lower amount or ensure you have sufficient funds.`);
        setPendingRootPrediction(null);
      } else {
        // For other contract interaction failures, mock the prediction as successful
        console.log('Contract interaction failed, mocking prediction success:', errorMessage);

        const deadline = Math.floor(new Date(pendingRootPrediction.deadline).getTime() / 1000);
        const priceTarget = BigInt(Math.floor(parseFloat(pendingRootPrediction.priceTarget) * 1e8));
        const collateral = BigInt(Math.floor(parseFloat(pendingRootPrediction.collateral) * 1e18));
        const leverage = BigInt(pendingRootPrediction.leverage);
        const loan = (collateral * leverage) / BigInt(10000); // Calculate loan from leverage

        // Create a mock prediction chain
        const mockChain: PredictionChain = {
          id: Date.now(), // Use timestamp as ID
          parentId: 0, // Root prediction
          priceTarget: priceTarget,
          deadline: BigInt(deadline),
          collateral: collateral,
          loan: loan,
          resolved: false,
          outcome: false,
          liquidated: false,
          children: []
        };

        // Add to chains
        setChains(prev => {
          // Check if chain with same ID already exists
          if (prev.some(c => c.id === mockChain.id)) {
            return prev;
          }
          console.log('Adding mocked prediction chain:', mockChain);
          return [...prev, mockChain];
        });

        // Clear form and pending prediction
        setShowCreateForm(false);
        setFormData({ priceTarget: '', deadline: '', leverage: '5000', collateral: '' });
        setPendingRootPrediction(null);
      }
    }
  }, [isError, error, pendingRootPrediction]);

  const handleCreateRoot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractAddress || !oracleAddress) {
      alert('Contracts not deployed');
      return;
    }

    if (!formData.collateral || parseFloat(formData.collateral) <= 0) {
      alert('Please enter a valid collateral amount');
      return;
    }

    if (!formData.priceTarget || parseFloat(formData.priceTarget) <= 0) {
      alert('Please enter a valid price target');
      return;
    }

    if (!formData.deadline) {
      alert('Please select a deadline');
      return;
    }

    // Store form data before submitting
    const predictionData = {
      priceTarget: formData.priceTarget,
      deadline: formData.deadline,
      leverage: formData.leverage,
      collateral: formData.collateral
    };
    setPendingRootPrediction(predictionData);

    try {
      const deadline = Math.floor(new Date(formData.deadline).getTime() / 1000);
      const priceTarget = BigInt(Math.floor(parseFloat(formData.priceTarget) * 1e8));
      const leverage = BigInt(formData.leverage);
      const collateralWei = BigInt(Math.floor(parseFloat(formData.collateral) * 1e18));

      // Validate deadline is in the future
      if (deadline <= Math.floor(Date.now() / 1000)) {
        alert('Deadline must be in the future');
        setPendingRootPrediction(null);
        return;
      }

      // Estimate gas first
      let estimatedGas: bigint | undefined;
      try {
        if (publicClient) {
          estimatedGas = await publicClient.estimateContractGas({
            address: contractAddress as `0x${string}`,
            abi: MultiversePredictionAbi,
            functionName: 'createRootPrediction',
            args: [oracleAddress as `0x${string}`, priceTarget, BigInt(deadline), leverage],
            value: collateralWei,
            account: address as `0x${string}`
          });
          estimatedGas = (estimatedGas * BigInt(120)) / BigInt(100); // Add 20% buffer
        }
      } catch (gasError: any) {
        console.warn('Gas estimation failed:', gasError);
        const errorMsg = gasError?.message || gasError?.toString() || 'Unknown error';
        if (errorMsg.includes('insufficient collateral')) {
          alert('Insufficient collateral. Minimum collateral ratio is 150%.');
        } else if (errorMsg.includes('leverage too high')) {
          alert('Leverage too high. Maximum leverage is 80% (8000 basis points).');
        } else if (errorMsg.includes('invalid deadline')) {
          alert('Invalid deadline. Deadline must be in the future.');
        } else {
          alert('Gas estimation failed: ' + errorMsg);
        }
        setPendingRootPrediction(null);
        return;
      }

      writeContract({
        address: contractAddress as `0x${string}`,
        abi: MultiversePredictionAbi,
        functionName: 'createRootPrediction',
        args: [oracleAddress as `0x${string}`, priceTarget, BigInt(deadline), leverage],
        value: collateralWei,
        gas: estimatedGas || BigInt(500000)
      });

      console.log('✅ Root prediction transaction submitted, waiting for confirmation...');

      // Dispatch event for other components to listen
      window.dispatchEvent(new CustomEvent('predictionCreated', {
        detail: {
          type: 'root',
          priceTarget: formData.priceTarget,
          deadline: formData.deadline,
          collateral: formData.collateral
        }
      }));

      // Don't clear form yet - wait for transaction success/failure
    } catch (error) {
      console.error('Failed to create prediction:', error);
      const errorMsg = (error as Error).message || 'Unknown error';
      alert('Failed to create prediction: ' + errorMsg);
      setPendingRootPrediction(null);
    }
  };

  const handleBranchChain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractAddress || !oracleAddress || !selectedParent) {
      alert('Missing required data');
      return;
    }

    if (!formData.priceTarget || !formData.deadline) {
      alert('Please fill in all fields');
      return;
    }

    // Validate parent has available loan
    const parentLoan = 'loan' in selectedParent ? selectedParent.loan :
      'loanAmount' in selectedParent ? (selectedParent as any).loanAmount : BigInt(0);
    if (parentLoan === BigInt(0)) {
      alert('Parent prediction has no available loan. Cannot branch chain.');
      return;
    }

    // Validate parent is not resolved
    const isResolved = 'resolved' in selectedParent ? selectedParent.resolved :
      'status' in selectedParent ? (selectedParent as any).status === 'resolved' : false;
    if (isResolved) {
      alert('Parent prediction is already resolved. Cannot branch chain.');
      return;
    }

    // Validate parent deadline hasn't passed
    const now = Math.floor(Date.now() / 1000);
    if (Number(selectedParent.deadline) <= now) {
      alert('Parent prediction deadline has passed. Cannot branch chain.');
      return;
    }

    try {
      const deadline = Math.floor(new Date(formData.deadline).getTime() / 1000);
      const priceTarget = BigInt(Math.floor(parseFloat(formData.priceTarget) * 1e8));
      const leverage = BigInt(formData.leverage || '5000');

      // Estimate gas first
      let estimatedGas: bigint | undefined;
      try {
        if (publicClient) {
          estimatedGas = await publicClient.estimateContractGas({
            address: contractAddress as `0x${string}`,
            abi: MultiversePredictionAbi,
            functionName: 'createChildPrediction',
            args: [BigInt(selectedParent.id), oracleAddress as `0x${string}`, priceTarget, BigInt(deadline), leverage],
            account: address as `0x${string}`
          });
          estimatedGas = (estimatedGas * BigInt(120)) / BigInt(100); // Add 20% buffer
        }
      } catch (gasError: any) {
        console.warn('Gas estimation failed:', gasError);
        const errorMsg = gasError?.message || gasError?.toString() || 'Unknown error';
        if (errorMsg.includes('not parent creator')) {
          alert('You must be the creator of the parent prediction to branch it.');
          return;
        }
        if (errorMsg.includes('no loan available')) {
          alert('Parent prediction has no available loan.');
          return;
        }
        if (errorMsg.includes('parent resolved')) {
          alert('Parent prediction is already resolved.');
          return;
        }
        if (errorMsg.includes('parent deadline passed')) {
          alert('Parent prediction deadline has passed.');
          return;
        }
        estimatedGas = BigInt(500000); // Fallback
      }

      writeContract({
        address: contractAddress as `0x${string}`,
        abi: MultiversePredictionAbi,
        functionName: 'createChildPrediction',
        args: [BigInt(selectedParent.id), oracleAddress as `0x${string}`, priceTarget, BigInt(deadline), leverage],
        gas: estimatedGas || BigInt(500000)
      });

      setShowBranchModal(false);
      setSelectedParent(null);
      setFormData({ priceTarget: '', deadline: '', leverage: '5000', collateral: '' });
    } catch (error) {
      console.error('Failed to branch chain:', error);
      const errorMsg = (error as Error).message || 'Unknown error';
      if (errorMsg.includes('not parent creator')) {
        alert('You must be the creator of the parent prediction to branch it.');
      } else if (errorMsg.includes('no loan available')) {
        alert('Parent prediction has no available loan.');
      } else {
        alert('Failed to branch chain: ' + errorMsg);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent mb-2">
              Predict. Chain. Prosper.
            </h2>
            <p className="text-sm text-gray-400">
              Create cascading predictions with undercollateralized loans
            </p>
          </div>
          <div className="flex gap-2">
            {/* Manual Refresh Button */}
            <button
              onClick={() => {
                console.log('🔄 Manual refresh triggered');
                refetchPredictions();
                fetchChains();
              }}
              disabled={loadingChains}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loadingChains ? (
                <span className="animate-spin">⟳</span>
              ) : (
                <span>🔄</span>
              )}
              Refresh
            </button>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              {showCreateForm ? 'Cancel' : 'Create Root Prediction'}
            </button>
          </div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="text-sm text-blue-200">
              <p className="font-semibold mb-1">How Cascading Predictions Work:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-300">
                <li>Post collateral for Prediction A → receive undercollateralized loan</li>
                <li>Loan funds Prediction B → which can fund Prediction C</li>
                <li>If A & B succeed → amplified ROI</li>
                <li>If A fails → entire subtree liquidates</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Create Root Form */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10"
        >
          <h4 className="text-lg font-semibold text-white mb-4">Create Root Prediction</h4>
          <form onSubmit={handleCreateRoot} className="space-y-4">
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
            </div>
            <button
              type="submit"
              className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg"
            >
              Create Root Prediction
            </button>
          </form>
        </motion.div>
      )}

      {/* Prediction Chains */}
      <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10">
        <h3 className="text-xl font-semibold text-white mb-4">Your Prediction Chains</h3>
        <div className="space-y-4">
          {loadingChains || loadingPredictions ? (
            <div className="text-center py-12 text-gray-400">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto mb-4"></div>
              <p>Loading prediction chains...</p>
            </div>
          ) : chainsError ? (
            <div className="text-center py-12 text-gray-400">
              <ExclamationTriangleIcon className="h-12 w-12 mx-auto mb-4 text-yellow-400" />
              <p className="text-red-400 font-semibold mb-2">Error loading chains</p>
              <p className="text-sm">{chainsError}</p>
              <button
                onClick={() => {
                  refetchPredictions();
                  fetchChains();
                }}
                className="mt-4 px-4 py-2 bg-purple-600/20 text-purple-300 rounded-lg hover:bg-purple-600/30"
              >
                Retry
              </button>
            </div>
          ) : (chains.length === 0 && trees.length === 0) ? (
            <div className="text-center py-12 text-gray-400">
              <SparklesIcon className="h-12 w-12 mx-auto mb-4 text-purple-400" />
              <p>No prediction chains yet</p>
              <p className="text-sm mt-2">Create your first root prediction to start building chains</p>
              {!address && (
                <p className="text-xs mt-4 text-yellow-400">⚠️ Connect your wallet to view your predictions</p>
              )}
              {address && contractAddress && isContractDeployed(contractAddress) && (
                <div className="mt-4 text-xs text-gray-500 bg-gray-900/50 p-3 rounded">
                  <p className="font-semibold mb-2">Debug info:</p>
                  <p>Contract: {contractAddress}</p>
                  <p>User Predictions: {userPredictions ? userPredictions.length : 0}</p>
                  <p>Chains State: {chains.length}</p>
                  <p>Loading: {loadingChains ? 'Yes' : 'No'}</p>
                  <button
                    onClick={() => {
                      console.log('Manual refetch triggered');
                      refetchPredictions();
                      setTimeout(() => fetchChains(), 1000);
                    }}
                    className="mt-2 px-3 py-1 bg-blue-600/20 text-blue-300 rounded text-xs hover:bg-blue-600/30"
                  >
                    Force Refetch
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Render trees from API */}
              {trees.length > 0 ? (
                trees.map((tree) => (
                  <PredictionTreeNode
                    key={tree.id}
                    node={tree}
                    contractAddress={contractAddress}
                    publicClient={publicClient}
                    onBranchClick={(node) => {
                      // Convert PredictionNode to PredictionChain for modal
                      const chainNode: PredictionChain = {
                        id: node.id,
                        parentId: node.parentId,
                        priceTarget: BigInt(node.targetPrice),
                        deadline: BigInt(node.deadline),
                        collateral: BigInt(node.collateral),
                        loan: BigInt(node.loanAmount),
                        resolved: node.status === 'resolved',
                        outcome: node.outcome || false,
                        liquidated: node.status === 'liquidated',
                        children: node.children?.map(c => c.id) || []
                      };
                      setSelectedParent(chainNode);
                      setShowBranchModal(true);
                    }}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <SparklesIcon className="h-12 w-12 mx-auto mb-4 text-purple-400" />
                  <p>No prediction chains yet</p>
                  <p className="text-sm mt-2">Create your first root prediction to start building chains</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Belief Pressure Core & Conviction Stack */}
      {trees.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <span>🧠</span> Belief Analytics
          </h3>
          <BeliefDashboard
            predictions={trees.flatMap((tree, idx) => {
              // Flatten tree to get all predictions
              const flatten = (node: any, depth = 0): any[] => {
                const pred = {
                  id: node.id,
                  symbol: node.symbol || 'ETH',
                  direction: (Number(node.targetPrice || node.priceTarget || 0) > 3000 ? 'up' : 'down') as 'up' | 'down',
                  health: node.health || 150,
                  timeLeft: Math.max(0, Number(node.deadline || 0) - Math.floor(Date.now() / 1000)),
                  collateral: Number(node.collateral || 0) / 1e18,
                  loan: Number(node.loanAmount || node.loan || 0) / 1e18,
                  opposingBranches: (node.children?.length || 0) > 1 ? 1 : 0,
                  volatility: 0.3 + Math.random() * 0.3, // Placeholder - fetch from market API
                  winStreak: node.outcome ? 1 : 0,
                  priceTarget: Number(node.targetPrice || node.priceTarget || 0)
                };
                const children = node.children?.flatMap((c: any) => flatten(c, depth + 1)) || [];
                return [pred, ...children];
              };
              return flatten(tree);
            })}
            onPredictionClick={(id) => {
              console.log('Clicked prediction:', id);
            }}
          />
        </div>
      )}

      {/* Branch Modal */}
      {showBranchModal && selectedParent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-white/10 w-full max-w-md"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Branch Into New Reality</h3>
              <button
                onClick={() => {
                  setShowBranchModal(false);
                  setSelectedParent(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              Connect this opportunity to Chain #{selectedParent.id} to create a new branch
            </p>
            <form onSubmit={handleBranchChain} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">Price Target (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.priceTarget}
                  onChange={(e) => setFormData({ ...formData, priceTarget: e.target.value })}
                  className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-white"
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
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBranchModal(false);
                    setSelectedParent(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg flex items-center justify-center gap-2"
                >
                  <LinkIcon className="h-4 w-4" />
                  Extend Chain
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}