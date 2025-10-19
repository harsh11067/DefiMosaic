import { ethers } from "hardhat";
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);

  // Deploy USDC Mock
  const USDC = await ethers.getContractFactory("USDCMock");
  const usdc = await USDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("USDCMock:", usdcAddress);

  // Deploy Mock Oracle
  const Oracle = await ethers.getContractFactory("MockOracle");
  const oracle = await Oracle.deploy();
  await oracle.waitForDeployment();
  const oracleAddress = await oracle.getAddress();
  console.log("MockOracle:", oracleAddress);

  // Deploy BetPoolFactory
  const BetPoolFactory = await ethers.getContractFactory("BetPoolFactory");
  const betPoolFactory = await BetPoolFactory.deploy();
  await betPoolFactory.waitForDeployment();
  const betPoolFactoryAddress = await betPoolFactory.getAddress();
  console.log("BetPoolFactory:", betPoolFactoryAddress);

  // Deploy Bet1155 (for legacy compatibility)
  const Bet = await ethers.getContractFactory("Bet1155");
  const bet = await Bet.deploy();
  await bet.waitForDeployment();
  const betAddress = await bet.getAddress();
  console.log("Bet1155:", betAddress);

  const outDir = resolve(__dirname, "..", "..", "web", "src", "config");
  try { mkdirSync(outDir, { recursive: true }); } catch {}
  const outPath = resolve(outDir, "contracts.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        network: "polygon_amoy",
        USDCMock: usdcAddress,
        Bet1155: betAddress,
        MockOracle: oracleAddress,
        BetPoolFactory: betPoolFactoryAddress,
      },
      null,
      2
    )
  );
  console.log("Wrote addresses to:", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


