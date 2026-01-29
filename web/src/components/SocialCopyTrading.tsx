"use client";

import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { motion } from 'framer-motion';
import { PlusIcon, SparklesIcon } from '@heroicons/react/24/outline';
import StrategyCard from './StrategyCard';
import StrategyLeaderboard from './StrategyLeaderboard';
import JoinedStrategies from './JoinedStrategies';
import { CONTRACT_ADDRESSES, isContractDeployed } from '@/config/contracts';

// Mock ABI - replace with actual StrategyRegistry ABI
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
  },
  {
    inputs: [],
    name: 'getTopStrategies',
    outputs: [
      { name: '', type: 'uint256[]' },
      { name: '', type: 'uint256[]' }
    ],
    stateMutability: 'view',
    type: 'function'
  }
] as const;

interface Strategy {
  id: number;
  name: string;
  description: string;
  creator: string;
  feeBPS: number;
  totalFollowers: number;
  totalGains: number;
  todayGains: number;
  totalValueLocked: number;
}

// Base strategies - always available (defined outside component to prevent flash)
const BASE_STRATEGIES: Strategy[] = [
  {
    id: 1,
    name: 'Aggressive Growth',
    description: 'High-risk, high-reward strategy focusing on volatile assets',
    creator: '0x1234567890123456789012345678901234567890',
    feeBPS: 500, // 5.00%
    totalFollowers: 234,
    totalGains: 125000,
    todayGains: 8500,
    totalValueLocked: 500000
  },
  {
    id: 2,
    name: 'Conservative Yield',
    description: 'Stable returns with low volatility',
    creator: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    feeBPS: 200, // 2.00%
    totalFollowers: 567,
    totalGains: 89000,
    todayGains: 3200,
    totalValueLocked: 1200000
  }
];

// Base leaderboard entries - always available
const BASE_LEADERBOARD = [
  { strategyId: 1, name: 'Aggressive Growth', creator: '0x1234...5678', todayGains: 8500, rank: 1, feeBPS: 500 },
  { strategyId: 2, name: 'Conservative Yield', creator: '0xabcd...efgh', todayGains: 3200, rank: 2, feeBPS: 200 },
];

export default function SocialCopyTrading({ registryAddress }: { registryAddress?: string } = {}) {
  const registryAddr = registryAddress || CONTRACT_ADDRESSES.StrategyRegistry;
  const { address } = useAccount();
  const [showCreateForm, setShowCreateForm] = useState(false);
  // Initialize with base strategies immediately to prevent flash
  const [strategies, setStrategies] = useState<Strategy[]>(BASE_STRATEGIES);
  const [leaderboard, setLeaderboard] = useState<any[]>(BASE_LEADERBOARD);
  const [joinedStrategies, setJoinedStrategies] = useState<any[]>([]);
  const [newStrategy, setNewStrategy] = useState({ name: '', description: '', feeBPS: 200 });
  const [followedStrategyId, setFollowedStrategyId] = useState<number | null>(null);
  const [followedInvestmentAmount, setFollowedInvestmentAmount] = useState<number | null>(null);
  const [newlyCreatedStrategies, setNewlyCreatedStrategies] = useState<Strategy[]>([]);
  const [pendingStrategyCreation, setPendingStrategyCreation] = useState<{ name: string; description: string; feeBPS: number } | null>(null);

  const publicClient = usePublicClient();
  const { writeContract, data: hash, isPending, isSuccess, isError, error } = useWriteContract();
  const { data: receipt } = useWaitForTransactionReceipt({ hash });
  
  // Handle follow errors - separate from create strategy errors
  useEffect(() => {
    if (isError && error) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      
      // Only handle follow errors if we have a followedStrategyId
      if (followedStrategyId !== null) {
        if (errorMessage.includes('gas') || errorMessage.includes('fee') || errorMessage.includes('insufficient')) {
          alert(`⚠️ Network Fee Alert: Contract interaction failed due to high gas fees or insufficient funds.\n\nError: ${errorMessage}\n\nPlease try again with a lower investment amount or ensure you have sufficient funds.`);
        } else {
          alert(`Contract interaction failed: ${errorMessage}`);
        }
        setFollowedStrategyId(null);
        setFollowedInvestmentAmount(null);
      }
      // If pendingStrategyCreation exists, it's a create strategy error
      else if (pendingStrategyCreation) {
        if (errorMessage.includes('gas') || errorMessage.includes('fee') || errorMessage.includes('insufficient')) {
          alert(`⚠️ Network Fee Alert: ${errorMessage}\n\nPlease ensure you have sufficient funds for gas fees.`);
        } else {
          alert('Failed to create strategy: ' + errorMessage);
        }
        setPendingStrategyCreation(null);
      }
    }
  }, [isError, error, followedStrategyId, pendingStrategyCreation]);

  // Store last leaderboard update time
  const [lastLeaderboardUpdate, setLastLeaderboardUpdate] = useState<number | null>(null);

  // Fetch strategies from contract
  const fetchStrategies = async () => {
    // Always use only these 2 base strategies + newly created ones
    setStrategies([...BASE_STRATEGIES, ...newlyCreatedStrategies]);

    // Leaderboard: Only show the 2 base strategies for 24 hours
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    if (!lastLeaderboardUpdate || (now - lastLeaderboardUpdate) < twentyFourHours) {
      // Within 24 hours, only show base strategies
      setLeaderboard(BASE_LEADERBOARD);
      
      if (!lastLeaderboardUpdate) {
        setLastLeaderboardUpdate(now);
      }
    } else {
      // After 24 hours, consider from Available Strategies (all strategies including base and newly created)
      const allStrategiesForLeaderboard = [...BASE_STRATEGIES, ...newlyCreatedStrategies];
      const sortedByGains = allStrategiesForLeaderboard
        .sort((a, b) => b.todayGains - a.todayGains)
        .slice(0, 10); // Top 10
      
      setLeaderboard(
        sortedByGains.map((s, idx) => ({
          strategyId: s.id,
          name: s.name,
          creator: s.creator.length > 10 ? `${s.creator.slice(0, 6)}...${s.creator.slice(-4)}` : s.creator,
          todayGains: s.todayGains,
          rank: idx + 1,
          feeBPS: s.feeBPS
        }))
      );
    }

    if (!registryAddr || !publicClient || !isContractDeployed(registryAddr)) {
      return;
    }

    try {
      // Try to get top strategies - if function doesn't exist, fallback
      let topIds: bigint[] = [];
      let topGains: bigint[] = [];
      
      try {
        // Try getTopStrategies if it exists
        const result = await publicClient.readContract({
          address: registryAddr as `0x${string}`,
          abi: [
            ...StrategyRegistryAbi,
            {
              inputs: [{ name: 'count', type: 'uint256' }],
              name: 'getTopStrategies',
              outputs: [
                { name: '', type: 'uint256[]' },
                { name: '', type: 'uint256[]' }
              ],
              stateMutability: 'view',
              type: 'function'
            }
          ] as const,
          functionName: 'getTopStrategies',
          args: [BigInt(10)]
        }) as [bigint[], bigint[]];
        topIds = result[0];
        topGains = result[1];
      } catch (error) {
        console.warn('getTopStrategies not available, using fallback');
        // Fallback: try to get all strategies by incrementing ID
        for (let i = 1; i <= 10; i++) {
          try {
            await publicClient.readContract({
              address: registryAddr as `0x${string}`,
              abi: [
                {
                  inputs: [{ name: 'strategyId', type: 'uint256' }],
                  name: 'strategies',
                  outputs: [
                    { name: 'id', type: 'uint256' },
                    { name: 'creator', type: 'address' },
                    { name: 'name', type: 'string' },
                    { name: 'description', type: 'string' },
                    { name: 'feeBPS', type: 'uint256' },
                    { name: 'totalFollowers', type: 'uint256' },
                    { name: 'totalValueLocked', type: 'uint256' },
                    { name: 'totalGains', type: 'uint256' },
                    { name: 'todayGains', type: 'uint256' },
                    { name: 'active', type: 'bool' },
                    { name: 'createdAt', type: 'uint256' }
                  ],
                  stateMutability: 'view',
                  type: 'function'
                }
              ] as const,
              functionName: 'strategies',
              args: [BigInt(i)]
            });
            topIds.push(BigInt(i));
            topGains.push(BigInt(0));
          } catch {
            break;
          }
        }
      }

      // Fetch each strategy details
      const strategyPromises = topIds.map(async (id: bigint) => {
        try {
          const strategy = await publicClient.readContract({
            address: registryAddr as `0x${string}`,
            abi: [
              {
                inputs: [{ name: 'strategyId', type: 'uint256' }],
                name: 'strategies',
                outputs: [
                  { name: 'id', type: 'uint256' },
                  { name: 'creator', type: 'address' },
                  { name: 'name', type: 'string' },
                  { name: 'description', type: 'string' },
                  { name: 'feeBPS', type: 'uint256' },
                  { name: 'totalFollowers', type: 'uint256' },
                  { name: 'totalValueLocked', type: 'uint256' },
                  { name: 'totalGains', type: 'uint256' },
                  { name: 'todayGains', type: 'uint256' },
                  { name: 'active', type: 'bool' },
                  { name: 'createdAt', type: 'uint256' }
                ],
                stateMutability: 'view',
                type: 'function'
              }
            ] as const,
            functionName: 'strategies',
            args: [id]
          }) as any;

          return {
            id: Number(id),
            name: strategy.name,
            description: strategy.description,
            creator: strategy.creator,
            feeBPS: Number(strategy.feeBPS),
            totalFollowers: Number(strategy.totalFollowers),
            totalGains: Number(strategy.totalGains) / 1e18,
            todayGains: Number(strategy.todayGains) / 1e18,
            totalValueLocked: Number(strategy.totalValueLocked) / 1e18
          };
        } catch (error) {
          console.error(`Failed to fetch strategy ${id}:`, error);
          return null;
        }
      });

      const fetchedStrategies = await Promise.all(strategyPromises);
      const validStrategies = fetchedStrategies.filter(s => s !== null) as Strategy[];
      // Don't override base strategies - contract strategies are for reference only
      // We always keep BASE_STRATEGIES + newlyCreatedStrategies
      // Contract fetching is for joined strategies and other data, not for replacing base strategies
    } catch (error) {
      console.error('Failed to fetch strategies:', error);
      // Already set mock data above, so just return
    }
  };

  // Update strategies when newlyCreatedStrategies changes - ensure persistence
  useEffect(() => {
    console.log('Updating strategies with newlyCreatedStrategies:', newlyCreatedStrategies);
    const allStrategies = [...BASE_STRATEGIES, ...newlyCreatedStrategies];
    setStrategies(allStrategies);
    // Store in localStorage for persistence across refreshes
    try {
      localStorage.setItem('newlyCreatedStrategies', JSON.stringify(newlyCreatedStrategies));
    } catch (e) {
      console.warn('Failed to save strategies to localStorage:', e);
    }
  }, [newlyCreatedStrategies]);

  // Load strategies from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('newlyCreatedStrategies');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNewlyCreatedStrategies(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load strategies from localStorage:', e);
    }
  }, []);

  useEffect(() => {
    fetchStrategies();
    // Don't auto-refresh for now - keep it simple
    // const interval = setInterval(fetchStrategies, 30000);
    // return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch after successful transaction - add newly created strategy
  useEffect(() => {
    if (isSuccess && receipt && hash && pendingStrategyCreation && !followedStrategyId) {
      // Only process if this is a create strategy transaction (not a follow transaction)
      console.log('Creating strategy from transaction:', { receipt, hash, pendingStrategyCreation });
      
      // Extract strategy ID from transaction receipt if possible
      // For now, we'll use a timestamp-based ID
      const newId = Date.now();
      const strategyName = pendingStrategyCreation.name || `Strategy ${newId}`;
      const strategyDescription = pendingStrategyCreation.description || 'Newly created strategy';
      const newStrategyData: Strategy = {
        id: newId,
        name: strategyName,
        description: strategyDescription,
        creator: address || '0x0000000000000000000000000000000000000000',
        feeBPS: pendingStrategyCreation.feeBPS,
        totalFollowers: 0,
        totalGains: 0,
        todayGains: 0,
        totalValueLocked: 0
      };
      
      // Add to newly created strategies - ensure it persists
      setNewlyCreatedStrategies(prev => {
        // Check if strategy with same name already exists
        if (prev.some(s => s.name === strategyName)) {
          console.log('Strategy with same name already exists, skipping');
          return prev;
        }
        const updated = [...prev, newStrategyData];
        console.log('Adding new strategy to newlyCreatedStrategies:', newStrategyData);
        // Store in localStorage immediately
        try {
          localStorage.setItem('newlyCreatedStrategies', JSON.stringify(updated));
        } catch (e) {
          console.warn('Failed to save to localStorage:', e);
        }
        return updated;
      });
      
      // Clear form and pending strategy creation after adding
      // Use setTimeout to ensure state updates are processed
      setTimeout(() => {
        setShowCreateForm(false);
        setNewStrategy({ name: '', description: '', feeBPS: 200 });
        setPendingStrategyCreation(null);
      }, 100);
    }
  }, [isSuccess, receipt, hash, address, pendingStrategyCreation, followedStrategyId]);

  const handleCreateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate unique name
    if (!newStrategy.name || newStrategy.name.length < 3) {
      alert('Please enter a unique strategy name with at least 3 characters');
      return;
    }
    
    // Check if name already exists (check both base strategies and newly created ones)
    const allStrategiesToCheck = [...BASE_STRATEGIES, ...newlyCreatedStrategies];
    if (
      allStrategiesToCheck.some(
        (s) =>
          (s.name?.toLowerCase() ?? "") === (newStrategy.name?.toLowerCase() ?? "")
      )
    ) {
      alert("This strategy name already exists. Please choose a unique name.");
      return;
    }
    
    
    if (!registryAddr || !isContractDeployed(registryAddr)) {
      alert('Strategy registry not deployed');
      return;
    }

    // Store the strategy data before submitting
    const strategyData = {
      name: newStrategy.name.trim(),
      description: newStrategy.description.trim(),
      feeBPS: newStrategy.feeBPS
    };
    setPendingStrategyCreation(strategyData);

    try {
      // Estimate gas for createStrategy
      let estimatedGas: bigint | undefined;
      try {
        if (publicClient) {
          estimatedGas = await publicClient.estimateContractGas({
            address: registryAddr as `0x${string}`,
            abi: StrategyRegistryAbi,
            functionName: 'createStrategy',
            args: [newStrategy.name, newStrategy.description, BigInt(newStrategy.feeBPS)],
            account: address as `0x${string}`
          });
          
          // Add 20% buffer
          estimatedGas = (estimatedGas * BigInt(120)) / BigInt(100);
        }
      } catch (gasError) {
        console.warn('Gas estimation failed, using default:', gasError);
        estimatedGas = BigInt(200000);
      }

      // Don't clear the form yet - wait for transaction success
      // The form will be cleared in the useEffect when transaction succeeds
      
      writeContract({
        address: registryAddr as `0x${string}`,
        abi: StrategyRegistryAbi,
        functionName: 'createStrategy',
        args: [newStrategy.name, newStrategy.description, BigInt(newStrategy.feeBPS)],
        gas: estimatedGas || BigInt(200000)
      });
      
      // Don't clear form or pendingStrategyCreation here - wait for transaction success/failure
      // This will be handled in the useEffect hooks
    } catch (error: any) {
      console.error('Failed to create strategy:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      
      // Clear pending strategy creation on error
      setPendingStrategyCreation(null);
      
      if (errorMessage.includes('gas') || errorMessage.includes('fee') || errorMessage.includes('insufficient')) {
        alert(`⚠️ Network Fee Alert: ${errorMessage}\n\nPlease ensure you have sufficient funds for gas fees.`);
      } else {
        alert('Failed to create strategy: ' + errorMessage);
      }
    }
  };

  const handleUnfollow = async (strategyId: number) => {
    if (!address) {
      alert('Please connect your wallet');
      return;
    }

    if (!registryAddr || !isContractDeployed(registryAddr)) {
      alert('Strategy registry not deployed');
      return;
    }

    const confirmed = confirm(`Are you sure you want to unfollow this strategy?`);
    if (!confirmed) return;

    try {
      // Estimate gas
      let estimatedGas: bigint | undefined;
      try {
        if (publicClient) {
          estimatedGas = await publicClient.estimateContractGas({
            address: registryAddr as `0x${string}`,
            abi: StrategyRegistryAbi,
            functionName: 'unfollowStrategy',
            args: [BigInt(strategyId)],
            account: address as `0x${string}`
          });
          estimatedGas = (estimatedGas * BigInt(120)) / BigInt(100);
        }
      } catch (gasError) {
        console.warn('Gas estimation failed:', gasError);
        estimatedGas = BigInt(200000);
      }

      writeContract({
        address: registryAddr as `0x${string}`,
        abi: StrategyRegistryAbi,
        functionName: 'unfollowStrategy',
        args: [BigInt(strategyId)],
        gas: estimatedGas || BigInt(200000)
      });

      // Remove from joined strategies optimistically
      setJoinedStrategies(prev => prev.filter(js => js.strategyId !== strategyId));
    } catch (error: any) {
      console.error('Failed to unfollow strategy:', error);
      alert('Failed to unfollow strategy: ' + (error?.message || 'Unknown error'));
    }
  };

  const handleFollow = async (strategyId: number, amount: number) => {
    if (!address) {
      alert('Please connect your wallet');
      return;
    }

    if (!registryAddr || !isContractDeployed(registryAddr)) {
      alert('Strategy registry not deployed');
      return;
    }

    try {
      const amountWei = BigInt(Math.floor(amount * 1e18));
      
      // Estimate gas first to handle high gas fees
      let estimatedGas: bigint | undefined;
      try {
        if (publicClient) {
          estimatedGas = await publicClient.estimateContractGas({
            address: registryAddr as `0x${string}`,
            abi: StrategyRegistryAbi,
            functionName: 'followStrategy',
            args: [BigInt(strategyId)],
            value: amountWei,
            account: address as `0x${string}`
          });
          
          // Add 20% buffer for gas estimation
          estimatedGas = (estimatedGas * BigInt(120)) / BigInt(100);
          
          // Check if gas is too high (more than 500K gas)
          if (estimatedGas > BigInt(500000)) {
            const userConfirm = confirm(
              `⚠️ Network Fee Alert: High gas estimate detected (${estimatedGas.toString()} gas). ` +
              `This may result in high transaction fees. Do you want to proceed with the investment?`
            );
            if (!userConfirm) {
              return;
            }
          }
        }
      } catch (gasError) {
        console.warn('Gas estimation failed, using default:', gasError);
        // Use default gas limit if estimation fails
        estimatedGas = BigInt(300000);
      }
      
      // Track which strategy we're following and the investment amount
      setFollowedStrategyId(strategyId);
      setFollowedInvestmentAmount(amount);
      
      // Actually call the contract to send POL with estimated gas
      // Note: writeContract from wagmi doesn't throw synchronously - errors come through isError/error hook
      writeContract({
        address: registryAddr as `0x${string}`,
        abi: StrategyRegistryAbi,
        functionName: 'followStrategy',
        args: [BigInt(strategyId)],
        value: amountWei,
        gas: estimatedGas || BigInt(300000)
      });
      
      // Don't add to joined strategies yet - wait for transaction success
      // The useEffect will handle adding to joined strategies on success
      // Errors will be handled by the error handler useEffect
    } catch (error: any) {
      console.error('Failed to follow strategy:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      
      // Check for network fee/gas related errors
      if (errorMessage.includes('gas') || errorMessage.includes('fee') || errorMessage.includes('insufficient funds')) {
        alert(`⚠️ Network Fee Alert: ${errorMessage}\n\nPlease ensure you have sufficient funds for gas fees and investment.`);
      } else {
        alert('Failed to follow strategy: ' + errorMessage);
      }
      setFollowedStrategyId(null);
      setFollowedInvestmentAmount(null);
    }
  };

  // Add to joined strategies after successful follow transaction
  useEffect(() => {
    if (isSuccess && receipt && hash && followedStrategyId !== null && followedInvestmentAmount !== null && !pendingStrategyCreation) {
      // Only process if this is a follow transaction (not a create strategy transaction)
      console.log('Adding to joined strategies:', { followedStrategyId, followedInvestmentAmount, receipt, hash });
      
      const strategy = strategies.find(s => s.id === followedStrategyId);
      if (strategy) {
        setJoinedStrategies(prev => {
          if (prev.some(js => js.strategyId === strategy.id)) {
            // Update existing entry
            return prev.map(js => 
              js.strategyId === strategy.id 
                ? { ...js, amountInvested: followedInvestmentAmount, joinedAt: Math.floor(Date.now() / 1000) }
                : js
            );
          }
          return [...prev, {
            strategyId: strategy.id,
            name: strategy.name,
            creator: strategy.creator,
            amountInvested: followedInvestmentAmount, // Store the actual investment amount
            shares: followedInvestmentAmount, // Use investment as initial shares
            currentValue: followedInvestmentAmount, // Initial value equals investment
            gains: 0, // No gains initially
            joinedAt: Math.floor(Date.now() / 1000)
          }];
        });
        
        // Reset after adding
        setTimeout(() => {
          setFollowedStrategyId(null);
          setFollowedInvestmentAmount(null);
        }, 100);
      } else {
        console.warn('Strategy not found for followedStrategyId:', followedStrategyId);
      }
    }
  }, [isSuccess, receipt, hash, followedStrategyId, followedInvestmentAmount, strategies, pendingStrategyCreation]);

  // Fetch user's joined strategies
  const fetchJoinedStrategies = async () => {
    if (!address || !registryAddr || !publicClient || !isContractDeployed(registryAddr)) return;

    try {
      let followedIds: bigint[] = [];
      
      try {
        followedIds = await publicClient.readContract({
          address: registryAddr as `0x${string}`,
          abi: [
            {
              inputs: [{ name: 'user', type: 'address' }],
              name: 'getUserFollowedStrategies',
              outputs: [{ name: '', type: 'uint256[]' }],
              stateMutability: 'view',
              type: 'function'
            }
          ],
          functionName: 'getUserFollowedStrategies',
          args: [address as `0x${string}`]
        }) as bigint[];
      } catch (error) {
        console.warn('getUserFollowedStrategies not available, skipping');
        return;
      }

      // Fetch details for each followed strategy
      const joinedPromises = followedIds.map(async (id: bigint) => {
        try {
          const followers = await publicClient.readContract({
            address: registryAddr as `0x${string}`,
            abi: [
              {
                inputs: [{ name: 'strategyId', type: 'uint256' }],
                name: 'getStrategyFollowers',
                outputs: [
                  {
                    components: [
                      { name: 'user', type: 'address' },
                      { name: 'amountInvested', type: 'uint256' },
                      { name: 'shares', type: 'uint256' },
                      { name: 'joinedAt', type: 'uint256' }
                    ],
                    name: '',
                    type: 'tuple[]'
                  }
                ],
                stateMutability: 'view',
                type: 'function'
              }
            ],
            functionName: 'getStrategyFollowers',
            args: [id]
          }) as any[];

          const userFollower = followers.find(f => f.user.toLowerCase() === address?.toLowerCase());
          if (!userFollower) return null;

          const strategy = strategies.find(s => s.id === Number(id));
          if (!strategy) return null;

          return {
            strategyId: Number(id),
            name: strategy.name,
            creator: strategy.creator,
            amountInvested: Number(userFollower.amountInvested) / 1e18,
            shares: Number(userFollower.shares) / 1e18,
            currentValue: Number(userFollower.amountInvested) / 1e18 * 1.1, // Mock appreciation
            gains: (Number(userFollower.amountInvested) / 1e18 * 1.1) - (Number(userFollower.amountInvested) / 1e18),
            joinedAt: Number(userFollower.joinedAt)
          };
        } catch (error) {
          console.error(`Failed to fetch joined strategy ${id}:`, error);
          return null;
        }
      });

      const joined = await Promise.all(joinedPromises);
      setJoinedStrategies(joined.filter(j => j !== null) as any[]);
    } catch (error) {
      console.error('Failed to fetch joined strategies:', error);
    }
  };

  useEffect(() => {
    fetchJoinedStrategies();
  }, [address, strategies, registryAddr, publicClient]);

  // Refetch joined strategies after successful follow
  useEffect(() => {
    if (isSuccess && receipt) {
      setTimeout(() => {
        fetchStrategies(); // Refresh strategies to update follower count
        fetchJoinedStrategies(); // Refresh joined strategies
      }, 2000);
    }
  }, [isSuccess, receipt]);

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
              <label className="block text-sm text-gray-300 mb-2">Strategy Name (Unique ID) *</label>
              <input
                type="text"
                value={newStrategy.name}
                onChange={(e) => setNewStrategy({ ...newStrategy, name: e.target.value })}
                className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-white"
                placeholder="Enter unique strategy name/id (e.g., MyStrategy_2024)"
                required
                pattern=".{3,}"
                title="Strategy name must be at least 3 characters and unique"
              />
              <p className="text-xs text-gray-500 mt-1">
                This will be your unique strategy identifier. Must be at least 3 characters and unique.
              </p>
                 {newStrategy.name &&
                 [...BASE_STRATEGIES, ...newlyCreatedStrategies].some(
                   (s) => s.name && s.name.toLowerCase() === newStrategy.name.toLowerCase()
                 ) && (
                   <p className="text-xs text-red-400 mt-1">
                     ⚠️ This strategy name already exists. Please choose a unique name.
                   </p>
                 )
               }

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
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg"
              >
                Create Strategy
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
          {/* Show base strategies (always) and newly created ones */}
          {[...BASE_STRATEGIES, ...newlyCreatedStrategies].map((strategy, index) => (
              <StrategyCard
                key={`strategy-${strategy.id}-${index}`} // unique key
                strategy={strategy}
                onFollow={handleFollow}
                onUnfollow={handleUnfollow}
                isFollowing={joinedStrategies.some(js => js.strategyId === strategy.id)}
                isCreator={strategy?.creator?.toLowerCase() === address?.toLowerCase()}
              />
          ))}
        </div>
      </div>

      {/* Joined Strategies */}
      <JoinedStrategies strategies={joinedStrategies} />
    </div>
  );
}
