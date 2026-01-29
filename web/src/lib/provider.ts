import { ethers } from 'ethers';

let provider: ethers.JsonRpcProvider | null = null;

export function getProvider() {
  if (!provider) {
    // Priority: NEXT_PUBLIC_RPC_URL > ALCHEMY_AMOY_URL > AMOY_RPC_URL > fallback
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL ||
      process.env.ALCHEMY_AMOY_URL ||
      process.env.AMOY_RPC_URL ||
      'https://rpc-amoy.polygon.technology';

    console.log('Creating JSON-RPC provider...');

    // Create provider with explicit chain config to avoid network detection issues
    provider = new ethers.JsonRpcProvider(rpcUrl, {
      name: 'polygon-amoy',
      chainId: 80002
    });
  }
  return provider;
}

// Reset provider on error
export function resetProvider() {
  provider = null;
}
