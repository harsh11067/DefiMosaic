import { ethers } from "hardhat";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

async function main() {
  const signers = await ethers.getSigners();
  if (signers.length === 0) {
    throw new Error(
      "No signers found. Please set DEPLOYER_PRIVATE_KEY in .env file or configure Hardhat network accounts."
    );
  }
  const [deployer] = signers;
  console.log("Deployer:", deployer.address);

  // --- Deploy USDC Mock ---
  const USDC = await ethers.getContractFactory("USDCMock");
  const usdc = await USDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("USDCMock:", usdcAddress);

  // --- Deploy Mock Oracle ---
  const Oracle = await ethers.getContractFactory("MockOracle");
  const oracle = await Oracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("MockOracle:", oracleAddress);

  // --- Deploy BetPoolFactory ---
  const BetPoolFactory = await ethers.getContractFactory("BetPoolFactory");
  const betPoolFactory = await BetPoolFactory.deploy();
  await betPoolFactory.waitForDeployment();
  const betPoolFactoryAddress = await betPoolFactory.getAddress();
  console.log("BetPoolFactory:", betPoolFactoryAddress);

  // --- Deploy MultiversePrediction (Cascading Predictions) ---
  const MultiversePrediction = await ethers.getContractFactory("MultiversePrediction");
  const multiversePrediction = await MultiversePrediction.deploy(ethers.ZeroAddress); // Native MATIC
  await multiversePrediction.waitForDeployment();
  const multiversePredictionAddress = await multiversePrediction.getAddress();
  console.log("MultiversePrediction:", multiversePredictionAddress);

  // --- Deploy StrategyRegistry ---
  const StrategyRegistry = await ethers.getContractFactory("StrategyRegistry");
  const strategyRegistry = await StrategyRegistry.deploy();
  await strategyRegistry.waitForDeployment();
  const strategyRegistryAddress = await strategyRegistry.getAddress();
  console.log("StrategyRegistry:", strategyRegistryAddress);

  // --- Deploy Bet1155 (legacy compatibility) ---
  const Bet = await ethers.getContractFactory("Bet1155");
  const bet = await Bet.deploy();
  await bet.waitForDeployment();
  const betAddress = await bet.getAddress();
  console.log("Bet1155:", betAddress);

  // --- Deploy SwapHelper (Uniswap integration) ---
  const SwapHelper = await ethers.getContractFactory("SwapHelper");
  const swapHelper = await SwapHelper.deploy();
  await swapHelper.waitForDeployment();
  const swapHelperAddress = await swapHelper.getAddress();
  console.log("SwapHelper:", swapHelperAddress);


  
  // --- Save addresses to JSON ---
  const outDir = resolve(__dirname, "..", "..", "web", "src", "config");
  mkdirSync(outDir, { recursive: true });
  const outPath = resolve(outDir, "contracts.json");

  const addresses = {
    network: "polygon_amoy",
    USDCMock: usdcAddress,
    MockOracle: oracleAddress,
    BetPoolFactory: betPoolFactoryAddress,
    MultiversePrediction: multiversePredictionAddress,
    StrategyRegistry: strategyRegistryAddress,
    Bet1155: betAddress,
    SwapHelper: swapHelperAddress,
  };

  writeFileSync(outPath, JSON.stringify(addresses, null, 2));
  console.log("✅ Wrote addresses to:", outPath);
}

main().catch((err) => {
  console.error("❌ Deployment failed:", err);
  process.exit(1);
});
