"use client";

/* eslint-disable @typescript-eslint/no-var-requires */
let fileAddrs: any = null;
if (typeof window === "undefined") {
  // Only try to require on server side
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    fileAddrs = require("./contracts.json");
  } catch {}
}

export const CONTRACT_ADDRESSES = {
  network: process.env.NEXT_PUBLIC_DEFAULT_NETWORK || fileAddrs?.network || "polygon_amoy",
  USDCMock: process.env.NEXT_PUBLIC_USDC_ADDRESS || fileAddrs?.USDCMock || "",
  Bet1155: process.env.NEXT_PUBLIC_BET1155_ADDRESS || fileAddrs?.Bet1155 || "",
  MockOracle: process.env.NEXT_PUBLIC_ORACLE_ADDRESS || fileAddrs?.MockOracle || "",
  BetPoolFactory: process.env.NEXT_PUBLIC_BET_Pool_FACTORY_ADDRESS || fileAddrs?.BetPoolFactory || "",
  SwapHelper: process.env.NEXT_PUBLIC_SWAP_HELPER_ADDRESS || fileAddrs?.SwapHelper || "",
  MultiversePrediction: process.env.NEXT_PUBLIC_MULTIVERSE_PREDICTION_ADDRESS || fileAddrs?.MultiversePrediction || "",
  StrategyRegistry: process.env.NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS || fileAddrs?.StrategyRegistry || "",
  
};

// Helper to check if contracts are deployed
export const isContractDeployed = (address: string) => {
  return address && address !== "" && address.startsWith("0x");
};



