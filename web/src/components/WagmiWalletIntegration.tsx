"use client";

import { useAccount, usePublicClient } from "wagmi";
import { ethers } from "ethers";
import { useState, useEffect } from "react";
import { CONTRACT_ADDRESSES } from "@/config/contracts";

interface TokenBalance {
  address: string;
  raw: string;
  decimals: number;
  human: number;
  symbol: string;
}

interface BalanceContext {
  native: number;
  nativeRaw: string;
  tokens: Record<string, TokenBalance>;
}

interface StrategyRecommendation {
  ok: boolean;
  data?: {
    riskProfile: string;
    allocations: Array<{
      strategyId: string;
      percent: number;
      reason?: string;
      liveAPY?: number;
      name?: string;
      color?: string;
    }>;
    childBetSuggestions?: Array<{
      parentStrategyId: string;
      leverageBPS: number;
      sizePercent: number;
      rationale: string;
    }>;
    notes?: string;
    generatedAt?: string;
  };
  error?: string;
}

export default function WagmiWalletIntegration() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [balanceContext, setBalanceContext] = useState<BalanceContext | null>(null);
  const [strategyRecommendation, setStrategyRecommendation] = useState<StrategyRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Token list for Polygon Amoy
  const tokenList = [
    { id: "USDC", address: CONTRACT_ADDRESSES.USDCMock || "0x..." },
    { id: "MATIC", address: "0x0000000000000000000000000000000000000000" }, // Native token
  ];

  const ERC20_ABI = [
    "function decimals() view returns (uint8)",
    "function balanceOf(address) view returns (uint256)",
    "function symbol() view returns (string)"
  ];

  const fetchAndRecommend = async (publicClient: any, address: string) => {
    try {
      setLoading(true);
      setError(null);

      // 1) Native balance
      const nativeRaw = await publicClient.getBalance({ address: address as `0x${string}` });
      const native = Number(ethers.formatEther(nativeRaw));

      // 2) Token balances by ERC20
      const tokens: Record<string, TokenBalance> = {};
      
      for (const t of tokenList) {
        if (t.id === "MATIC") {
          // Skip native token, already handled above
          continue;
        }
        
        try {
          // Use publicClient to read contract data
          const [raw, decimals, symbol] = await Promise.all([
            publicClient.readContract({
              address: t.address as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [address as `0x${string}`]
            }),
            publicClient.readContract({
              address: t.address as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'decimals'
            }),
            publicClient.readContract({
              address: t.address as `0x${string}`,
              abi: ERC20_ABI,
              functionName: 'symbol'
            }).catch(() => t.id)
          ]);
          
          const human = Number(ethers.formatUnits(raw, decimals));
          tokens[t.id] = { 
            address: t.address, 
            raw: raw.toString(), 
            decimals, 
            human, 
            symbol: symbol as string
          };
        } catch (e) {
          tokens[t.id] = { 
            address: t.address, 
            raw: "0", 
            decimals: 18, 
            human: 0, 
            symbol: t.id 
          };
        }
      }

      const balanceContext: BalanceContext = {
        native,
        nativeRaw: nativeRaw.toString(),
        tokens
      };

      setBalanceContext(balanceContext);

      // 3) Call recommendation API
      const resp = await fetch("/api/recommend-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          address, 
          tokenList: tokenList.filter(t => t.id !== "MATIC"), // Exclude native
          risk: "medium" 
        })
      });
      
      const json = await resp.json();
      setStrategyRecommendation(json);
      
    } catch (err: any) {
      console.error("Failed to fetch and recommend:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (address && publicClient) {
      fetchAndRecommend(publicClient, address);
    }
  }, [address, publicClient]);

  if (!address) {
    return (
      <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
        <p className="text-gray-400">Connect your wallet to see balance and recommendations</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-400"></div>
          <span className="text-gray-400">Loading wallet data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
        <p className="text-red-400">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Balance Display */}
      {balanceContext && (
        <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-3">Wallet Balances</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">MATIC:</span>
              <span className="text-white">{balanceContext.native.toFixed(4)}</span>
            </div>
            {Object.entries(balanceContext.tokens).map(([id, token]) => (
              <div key={id} className="flex justify-between">
                <span className="text-gray-400">{token.symbol}:</span>
                <span className="text-white">{token.human.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strategy Recommendation */}
      {strategyRecommendation?.ok && strategyRecommendation.data && (
        <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
          <h3 className="text-white font-semibold mb-3">AI Strategy Recommendation</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Risk Profile:</span>
              <span className="text-white capitalize">{strategyRecommendation.data.riskProfile}</span>
            </div>
            <div className="mt-3">
              <h4 className="text-gray-300 text-sm font-medium mb-2">Allocations:</h4>
              <div className="space-y-1">
                {strategyRecommendation.data.allocations.map((alloc, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-400">{alloc.name || alloc.strategyId}:</span>
                    <span className="text-white">{alloc.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
            {strategyRecommendation.data.notes && (
              <div className="mt-3 p-2 bg-gray-700/30 rounded text-sm text-gray-300">
                {strategyRecommendation.data.notes}
              </div>
            )}
          </div>
        </div>
      )}

      {strategyRecommendation?.error && (
        <div className="bg-red-900/20 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">Strategy Error: {strategyRecommendation.error}</p>
        </div>
      )}
    </div>
  );
}
