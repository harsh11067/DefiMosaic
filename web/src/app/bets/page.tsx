"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from "wagmi";
import { Bet1155Abi } from "@/abi/Bet1155";
import { BetPoolFactoryAbi } from "@/abi/BetPoolFactory";
import { BetPoolAbi } from "@/abi/BetPool";
import { IERC20Abi } from "@/abi/IERC20";
import { CONTRACT_ADDRESSES, isContractDeployed } from "@/config/contracts";
import { motion } from "framer-motion";
import { PlusIcon, ChartBarIcon, CurrencyDollarIcon } from "@heroicons/react/24/outline";
import PriceWatcher from "@/components/PriceWatcher";
import CryptoPriceCards from "@/components/CryptoPriceCards";
import CascadingPredictions from "@/components/CascadingPredictions";
import ETHPriceDisplay from "@/components/ETHPriceDisplay";
import SurgeBoost from "@/components/SurgeBoost";

export default function BetsPage() {
  const { address } = useAccount();
  const [mounted, setMounted] = useState(false);
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("0");
  const [status, setStatus] = useState<string>("");
  const [tokenId, setTokenId] = useState("1");
  const [betAmount, setBetAmount] = useState("1");

  // New betting state
  const [priceTarget, setPriceTarget] = useState("1800");
  const [deadline, setDeadline] = useState("");
  const [depositAmount, setDepositAmount] = useState("100");
  const [showCreatePool, setShowCreatePool] = useState(false);
  const [poolType, setPoolType] = useState<"ERC20" | "POL">("ERC20");
  const [polAmount, setPolAmount] = useState("0.0001"); // Very small amount like in test

  // Fix hydration - only render client-specific content after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const { writeContract, isPending, error, data: hash } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Read all pools from factory
  const { data: allPools, refetch: refetchPools } = useReadContract({
    address: CONTRACT_ADDRESSES.BetPoolFactory as `0x${string}`,
    abi: BetPoolFactoryAbi,
    functionName: "getAllPools",
    query: {
      enabled: Boolean(CONTRACT_ADDRESSES.BetPoolFactory && isContractDeployed(CONTRACT_ADDRESSES.BetPoolFactory)),
      refetchInterval: 10000 // Refetch every 10 seconds to catch new pools
    }
  });

  // Read user's USDC balance
  const { data: usdcBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.USDCMock as `0x${string}`,
    abi: IERC20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && CONTRACT_ADDRESSES.USDCMock && isContractDeployed(CONTRACT_ADDRESSES.USDCMock)) }
  });

  useEffect(() => {
    if (isConfirmed) {
      setStatus(`✅ Pool created successfully! Transaction: ${hash}`);
      // Reset form after successful creation
      setPriceTarget("1800");
      setPolAmount("0.0001");
      setShowCreatePool(false);
      // Refresh pools list multiple times to ensure we catch the update
      console.log('Pool created, refetching pools...');
      refetchPools();

      setTimeout(() => {
        console.log('Refetching pools after 2 seconds...');
        refetchPools();
      }, 2000);

      setTimeout(() => {
        console.log('Refetching pools after 5 seconds...');
        refetchPools();
      }, 5000);
    } else if (error) {
      setStatus(`❌ Error: ${error.message}`);
    } else if (hash) {
      setStatus(`⏳ Transaction pending: ${hash}`);
    }
  }, [isConfirmed, error, hash, refetchPools]);

  // Set default deadline to 7 days from now
  useEffect(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    setDeadline(Math.floor(nextWeek.getTime() / 1000).toString());
  }, []);

  // Helper function to convert minutes to timestamp
  const minutesToTimestamp = (minutes: number) => {
    return Math.floor(Date.now() / 1000) + (minutes * 60);
  };

  // Helper function to format deadline for display
  const formatDeadlineDisplay = (timestamp: string) => {
    const date = new Date(Number(timestamp) * 1000);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`;
    return `${diffMins}m`;
  };

  async function sendMicro(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("Sending...");
    const res = await fetch("/api/micropayments/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, amount, token: "USDC" }),
    });
    const data = await res.json();
    setStatus(data.ok ? "Sent (stub). Integrate on-chain next." : `Error: ${data.error}`);
  }

  // Show loading skeleton until client-side hydration is complete
  if (!mounted) {
    return (
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Prediction Markets
          </h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-800/50 rounded-lg"></div>
          <div className="h-64 bg-gray-800/50 rounded-lg"></div>
          <div className="h-48 bg-gray-800/50 rounded-lg"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Prediction Markets
        </h1>
        <button
          onClick={() => setShowCreatePool(!showCreatePool)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
        >
          <PlusIcon className="h-5 w-5" />
          Create Pool
        </button>
      </div>

      {/* ETH Price */}
      <ETHPriceDisplay />

      {/* Live Price Data */}
      <CryptoPriceCards />

      {/* Price Watcher */}
      <PriceWatcher />

      {/* User Balance */}
      {address && (
        <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CurrencyDollarIcon className="h-5 w-5 text-green-400" />
            <span className="text-white">USDC Balance:</span>
            <span className="text-green-400 font-semibold">
              {usdcBalance ? (Number(usdcBalance) / 1e6).toFixed(2) : "0.00"}
            </span>
          </div>
        </div>
      )}

      {/* Contract Status */}
      <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-2">Contract Status</h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">BetPoolFactory:</span>
            <span className={isContractDeployed(CONTRACT_ADDRESSES.BetPoolFactory) ? "text-green-400" : "text-red-400"}>
              {isContractDeployed(CONTRACT_ADDRESSES.BetPoolFactory) ? "✅ Deployed" : "❌ Not Deployed"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">MockOracle:</span>
            <span className={isContractDeployed(CONTRACT_ADDRESSES.MockOracle) ? "text-green-400" : "text-red-400"}>
              {isContractDeployed(CONTRACT_ADDRESSES.MockOracle) ? "✅ Deployed" : "❌ Not Deployed"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">StrategyRegistry:</span>
            <span className={isContractDeployed(CONTRACT_ADDRESSES.StrategyRegistry) ? "text-green-400" : "text-red-400"}>
              {isContractDeployed(CONTRACT_ADDRESSES.StrategyRegistry) ? "✅ Deployed" : "❌ Not Deployed"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">MultiversePrediction:</span>
            <span className={isContractDeployed(CONTRACT_ADDRESSES.MultiversePrediction) ? "text-green-400" : "text-red-400"}>
              {isContractDeployed(CONTRACT_ADDRESSES.MultiversePrediction) ? "✅ Deployed" : "❌ Not Deployed"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">USDCMock:</span>
            <span className={isContractDeployed(CONTRACT_ADDRESSES.USDCMock) ? "text-green-400" : "text-red-400"}>
              {isContractDeployed(CONTRACT_ADDRESSES.USDCMock) ? "✅ Deployed" : "❌ Not Deployed"}
            </span>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          <div>BetPoolFactory: {CONTRACT_ADDRESSES.BetPoolFactory}</div>
          <div>MultiversePrediction: {CONTRACT_ADDRESSES.MultiversePrediction || "Not deployed"}</div>
          <div>StrategyRegistry: {CONTRACT_ADDRESSES.StrategyRegistry}</div>
          <div>MockOracle: {CONTRACT_ADDRESSES.MockOracle}</div>
          <div>USDCMock: {CONTRACT_ADDRESSES.USDCMock}</div>
        </div>
      </div>

      {/* Create Pool Form */}
      {showCreatePool && (
        <motion.section
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="rounded-lg border border-white/10 p-6 bg-gray-800/30"
        >
          <h2 className="text-xl font-semibold text-white mb-4">Create New Betting Pool</h2>

          {/* Pool Type Selection */}
          <div className="mb-4">
            <label className="block text-sm text-gray-300 mb-2">Pool Type</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="ERC20"
                  checked={poolType === "ERC20"}
                  onChange={(e) => setPoolType(e.target.value as "ERC20" | "POL")}
                  className="text-purple-600"
                />
                <span className="text-white">USDC Pool</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  value="POL"
                  checked={poolType === "POL"}
                  onChange={(e) => setPoolType(e.target.value as "ERC20" | "POL")}
                  className="text-purple-600"
                />
                <span className="text-white">POL (MATIC) Pool</span>
              </label>
            </div>
          </div>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              console.log("Form submitted!");
              console.log("Form data:", { poolType, priceTarget, deadline, polAmount });

              if (!address) {
                setStatus("❌ Please connect your wallet first");
                return;
              }

              if (!isContractDeployed(CONTRACT_ADDRESSES.BetPoolFactory)) {
                setStatus("Error: BetPoolFactory not deployed");
                return;
              }

              // Validate required fields
              if (!priceTarget || !deadline) {
                setStatus("❌ Please fill in all required fields");
                return;
              }

              if (poolType === "POL" && (!polAmount || Number(polAmount) <= 0)) {
                setStatus("❌ Please enter a valid POL amount");
                return;
              }

              if (poolType === "ERC20") {
                setStatus("Creating ERC20 pool...");
                // Create ERC20 pool
                writeContract({
                  address: CONTRACT_ADDRESSES.BetPoolFactory as `0x${string}`,
                  abi: BetPoolFactoryAbi,
                  functionName: "createPool",
                  args: [
                    CONTRACT_ADDRESSES.USDCMock as `0x${string}`,
                    CONTRACT_ADDRESSES.MockOracle as `0x${string}`,
                    BigInt(priceTarget) * BigInt(1e8), // Convert to oracle format
                    BigInt(deadline)
                  ],
                });
              } else {
                setStatus("Creating POL pool...");
                // Create POL pool
                const durationSeconds = Number(deadline) - Math.floor(Date.now() / 1000);
                console.log("Creating POL pool with:", {
                  durationSeconds,
                  priceTarget: BigInt(priceTarget) * BigInt(1e8),
                  polAmount: BigInt(Number(polAmount) * 1e18),
                  factoryAddress: CONTRACT_ADDRESSES.BetPoolFactory,
                  oracleAddress: CONTRACT_ADDRESSES.MockOracle
                });

                writeContract({
                  address: CONTRACT_ADDRESSES.BetPoolFactory as `0x${string}`,
                  abi: BetPoolFactoryAbi,
                  functionName: "createPoolWithNative",
                  args: [
                    BigInt(durationSeconds),
                    CONTRACT_ADDRESSES.MockOracle as `0x${string}`,
                    BigInt(priceTarget) * BigInt(1e8), // Convert to oracle format
                  ],
                  value: BigInt(Number(polAmount) * 1e18), // Convert MATIC to wei
                });
              }
            }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-sm text-gray-300 mb-2">Price Target (USD)</label>
              <input
                className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-white"
                placeholder="1800"
                value={priceTarget}
                onChange={(e) => setPriceTarget(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-2">Duration</label>
              <select
                className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-white"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              >
                <option value={minutesToTimestamp(60).toString()}>1 hour</option>
                <option value={minutesToTimestamp(240).toString()}>4 hours</option>
                <option value={minutesToTimestamp(1440).toString()}>1 day</option>
                <option value={minutesToTimestamp(10080).toString()}>1 week</option>
                <option value={minutesToTimestamp(43200).toString()}>1 month</option>
              </select>
            </div>
            {poolType === "POL" && (
              <div>
                <label className="block text-sm text-gray-300 mb-2">Initial POL Amount (MATIC)</label>
                <input
                  className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-white"
                  placeholder="0.0001"
                  value={polAmount}
                  onChange={(e) => setPolAmount(e.target.value)}
                />
              </div>
            )}
            <div className="md:col-span-2">
              {/* Debug info */}
              {!address && (
                <div className="text-red-400 text-sm mb-2">
                  ⚠️ Please connect your wallet
                </div>
              )}
              {!isContractDeployed(CONTRACT_ADDRESSES.BetPoolFactory) && (
                <div className="text-red-400 text-sm mb-2 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                  <div className="font-semibold mb-1">⚠️ Contract not deployed: BetPoolFactory</div>
                  <div className="text-xs text-gray-300 mb-2">
                    Please deploy the BetPoolFactory contract first. You can deploy it using the Hardhat deployment script:
                  </div>
                  <div className="text-xs font-mono bg-black/30 p-2 rounded mb-2">
                    cd contracts && npx hardhat run scripts/deploy.ts --network polygon_amoy
                  </div>
                  <div className="text-xs text-gray-300">
                    Or update the contract address in web/src/config/contracts.json
                  </div>
                </div>
              )}
              {isPending && (
                <div className="text-yellow-400 text-sm mb-2">
                  ⏳ Transaction in progress...
                </div>
              )}

              <button
                type="submit"
                disabled={!address || !isContractDeployed(CONTRACT_ADDRESSES.BetPoolFactory) || isPending}
                className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg disabled:opacity-50 hover:from-purple-700 hover:to-blue-700 transition-colors"
                onClick={() => {
                  console.log("Button clicked!");
                  console.log("Contract deployed:", isContractDeployed(CONTRACT_ADDRESSES.BetPoolFactory));
                  console.log("Is pending:", isPending);
                  console.log("Pool type:", poolType);
                  console.log("Price target:", priceTarget);
                  console.log("Deadline:", deadline);
                  console.log("POL amount:", polAmount);
                }}
              >
                {isPending ? "Creating..." : `Create ${poolType} Pool`}
              </button>
            </div>
          </form>
        </motion.section>
      )}

      {/* Cascading Predictions */}
      <CascadingPredictions
        contractAddress={CONTRACT_ADDRESSES.MultiversePrediction}
        oracleAddress={CONTRACT_ADDRESSES.MockOracle}
      />

      {/* SurgeBoost */}
      <SurgeBoost />

      {/* Active Pools */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <ChartBarIcon className="h-6 w-6" />
            Active Betting Pools
          </h2>
          <button
            onClick={() => refetchPools()}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
        {allPools && Array.isArray(allPools) && allPools.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {allPools.map((poolAddress: string, index: number) => (
              <PoolCard key={`${poolAddress}-${index}`} poolAddress={poolAddress} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">
            <ChartBarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No betting pools created yet</p>
            <p className="text-sm">Create the first pool to get started!</p>
          </div>
        )}
      </section>

      {/* Status */}
      {status && (
        <div className="bg-gray-800/50 border border-white/10 rounded-lg p-4">
          <div className="text-sm text-white/70">{status}</div>
        </div>
      )}
    </main>
  );
}

// Pool Card Component
function PoolCard({ poolAddress }: { poolAddress: string }) {
  const { address } = useAccount();
  const [depositAmount, setDepositAmount] = useState("100");

  const { data: priceTarget } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: BetPoolAbi,
    functionName: "priceTarget",
  });

  const { data: deadline } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: BetPoolAbi,
    functionName: "deadline",
  });

  const { data: resolved } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: BetPoolAbi,
    functionName: "resolved",
  });

  const { data: userShares } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: BetPoolAbi,
    functionName: "balanceOf",
    args: address ? [address, BigInt(1)] : undefined, // SHARE_ID = 1
    query: { enabled: !!address }
  });

  const { data: erc20Token } = useReadContract({
    address: poolAddress as `0x${string}`,
    abi: BetPoolAbi,
    functionName: "erc20Token",
  });

  const { writeContract, isPending } = useWriteContract();

  const formatDeadline = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) * 1000);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`;
    if (diffHours > 0) return `${diffHours}h ${diffMins % 60}m`;
    return `${diffMins}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gray-800/50 border border-white/10 rounded-lg p-4 hover:border-purple-500/50 transition-all"
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white">ETH Price Pool</h3>
          <span className={`px-2 py-1 rounded text-xs ${resolved ? "bg-gray-600 text-gray-300" : "bg-green-600 text-white"
            }`}>
            {resolved ? "Resolved" : "Active"}
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Target Price:</span>
            <span className="text-white">${priceTarget ? (Number(priceTarget) / 1e8).toFixed(2) : "0"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Deadline:</span>
            <span className="text-white">{deadline ? formatDeadline(deadline) : "N/A"}</span>
          </div>
          {userShares && userShares > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Your Shares:</span>
              <span className="text-green-400">{Number(userShares).toFixed(2)}</span>
            </div>
          )}
        </div>

        {!resolved && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();

              if (erc20Token === "0x0000000000000000000000000000000000000000") {
                // Native deposit
                writeContract({
                  address: poolAddress as `0x${string}`,
                  abi: BetPoolAbi,
                  functionName: "depositNative",
                  value: BigInt(Number(depositAmount) * 1e18), // Convert MATIC to wei
                });
              } else {
                // ERC20 deposit
                writeContract({
                  address: poolAddress as `0x${string}`,
                  abi: BetPoolAbi,
                  functionName: "depositERC20",
                  args: [BigInt(depositAmount) * BigInt(1e6)], // USDC has 6 decimals
                });
              }
            }}
            className="space-y-2"
          >
            <input
              className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-white text-sm"
              placeholder={erc20Token === "0x0000000000000000000000000000000000000000" ? "Deposit amount (MATIC)" : "Deposit amount (USDC)"}
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
            />
            <button
              type="submit"
              disabled={isPending}
              className="w-full px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded text-sm disabled:opacity-50"
            >
              {isPending ? "Depositing..." : "Deposit"}
            </button>
          </form>
        )}
      </div>
    </motion.div>
  );
}


