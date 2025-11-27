// eth-momentum.ts
export const BTCUSDTMomentum = {
  name: "BTCUSDT Momentum",
  assets: ["ETH"],
  entryRule: "If price above 20-day EMA",
  exitRule: "If price drops below 20-day EMA",
  leverage: "2x",
};

// defi-bluechip.ts
export const DeFiBluechips = {
  name: "DeFi Bluechips Basket",
  assets: ["UNI", "AAVE", "COMP"],
  entryRule: "Equal allocation, rebalance monthly",
  exitRule: "Sell on 20% drawdown",
  leverage: "1.5x",
};
