'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { CONTRACT_ADDRESSES, isContractDeployed } from '@/config/contracts';
import StrategyTemplates from './StrategyTemplates';

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
  }
] as const;

export default function StrategyTemplatesWrapper() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContract, data: hash, isPending, isSuccess, isError, error } = useWriteContract();
  const { data: receipt } = useWaitForTransactionReceipt({ hash });
  const [pendingCreation, setPendingCreation] = useState<{ name: string; description: string; feeBPS: number } | null>(null);

  const handleCreateStrategy = async (name: string, description: string, feeBPS: number) => {
    if (!address) {
      throw new Error('Please connect your wallet');
    }

    const registryAddr = CONTRACT_ADDRESSES.StrategyRegistry;
    if (!registryAddr || !isContractDeployed(registryAddr)) {
      throw new Error('Strategy registry not deployed');
    }

    setPendingCreation({ name, description, feeBPS });

    try {
      let estimatedGas: bigint | undefined;
      try {
        if (publicClient) {
          estimatedGas = await publicClient.estimateContractGas({
            address: registryAddr as `0x${string}`,
            abi: StrategyRegistryAbi,
            functionName: 'createStrategy',
            args: [name, description, BigInt(feeBPS)],
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
        functionName: 'createStrategy',
        args: [name, description, BigInt(feeBPS)],
        gas: estimatedGas || BigInt(200000)
      });
    } catch (error: any) {
      setPendingCreation(null);
      throw error;
    }
  };

  // Handle success
  useEffect(() => {
    if (isSuccess && receipt && pendingCreation) {
      alert(`Strategy "${pendingCreation.name}" created successfully!`);
      setPendingCreation(null);
    }
  }, [isSuccess, receipt, pendingCreation]);

  // Handle errors
  useEffect(() => {
    if (isError && error && pendingCreation) {
      const errorMsg = error?.message || 'Unknown error';
      alert(`Failed to create strategy: ${errorMsg}`);
      setPendingCreation(null);
    }
  }, [isError, error, pendingCreation]);

  return <StrategyTemplates onCreateStrategy={handleCreateStrategy} />;
}

