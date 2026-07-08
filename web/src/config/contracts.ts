import fileAddrs from "./contracts.json";

// Env vars take priority, then the deployed addresses in contracts.json.
// The JSON is statically imported so addresses are available on both the
// server and in the browser (previously they were server-only, which made
// every contract look "not deployed" client-side).
export const CONTRACT_ADDRESSES = {
  network: process.env.NEXT_PUBLIC_DEFAULT_NETWORK || fileAddrs.network || "polygon_amoy",
  USDCMock: process.env.NEXT_PUBLIC_USDC_ADDRESS || fileAddrs.USDCMock || "",
  Bet1155: process.env.NEXT_PUBLIC_BET1155_ADDRESS || fileAddrs.Bet1155 || "",
  MockOracle: process.env.NEXT_PUBLIC_ORACLE_ADDRESS || fileAddrs.MockOracle || "",
  BetPoolFactory: process.env.NEXT_PUBLIC_BET_Pool_FACTORY_ADDRESS || fileAddrs.BetPoolFactory || "",
  SwapHelper: process.env.NEXT_PUBLIC_SWAP_HELPER_ADDRESS || fileAddrs.SwapHelper || "",
  MultiversePrediction: process.env.NEXT_PUBLIC_MULTIVERSE_PREDICTION_ADDRESS || fileAddrs.MultiversePrediction || "",
  StrategyRegistry: process.env.NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS || fileAddrs.StrategyRegistry || "",
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Helper to check if contracts are deployed
export const isContractDeployed = (address?: string) => {
  return (
    !!address &&
    /^0x[a-fA-F0-9]{40}$/.test(address) &&
    address.toLowerCase() !== ZERO_ADDRESS
  );
};
