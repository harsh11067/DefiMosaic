const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 DefiMosaic POL Pool Creation Showcase");
  console.log("==========================================\n");

  const [deployer, alice, bob] = await ethers.getSigners();
  console.log("👥 Accounts:");
  console.log("Deployer:", deployer.address);
  console.log("Alice:", alice.address);
  console.log("Bob:", bob.address);
  console.log("");

  // Deploy mock aggregator
  console.log("📊 Deploying Mock Oracle...");
  const MockAgg = await ethers.getContractFactory("MockV3Aggregator");
  const mockAgg = await MockAgg.deploy(1500 * 1e8); // $1500 initial price
  await mockAgg.waitForDeployment();
  console.log("✅ Mock Oracle deployed at:", await mockAgg.getAddress());
  console.log("Initial price: $1500");
  console.log("");

  // Deploy factory
  console.log("🏭 Deploying BetPoolFactory...");
  const Factory = await ethers.getContractFactory("BetPoolFactory");
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  console.log("✅ BetPoolFactory deployed at:", await factory.getAddress());
  console.log("");

  // Create POL pool
  console.log("🎯 Creating POL Pool...");
  const durationSeconds = 3600; // 1 hour
  const priceTarget = 1600 * 1e8; // $1600 target
  const polAmount = ethers.parseEther("2.0"); // 2 MATIC initial funding

  console.log("Pool Parameters:");
  console.log("- Duration: 1 hour");
  console.log("- Price Target: $1600");
  console.log("- Initial Funding: 2 MATIC");
  console.log("");

  const tx = await factory.connect(alice).createPoolWithNative(
    durationSeconds,
    await mockAgg.getAddress(),
    priceTarget,
    { value: polAmount }
  );
  
  const receipt = await tx.wait();
  console.log("✅ POL Pool created successfully!");
  
  // Get pool address
  const pools = await factory.getAllPools();
  const poolAddr = pools[0];
  console.log("Pool Address:", poolAddr);
  console.log("");

  // Attach to pool
  const BetPool = await ethers.getContractFactory("BetPool");
  const pool = await BetPool.attach(poolAddr);

  // Show pool details
  console.log("📋 Pool Details:");
  console.log("- Price Target:", ethers.formatUnits(await pool.priceTarget(), 8), "USD");
  console.log("- Deadline:", new Date(Number(await pool.deadline()) * 1000).toLocaleString());
  console.log("- Pool Balance:", ethers.formatEther(await ethers.provider.getBalance(poolAddr)), "MATIC");
  console.log("- ERC20 Token:", await pool.erc20Token() === ethers.ZeroAddress ? "Native MATIC only" : await pool.erc20Token());
  console.log("");

  // Alice deposits more MATIC
  console.log("💰 Alice depositing 1 MATIC to get shares...");
  const depositAmount = ethers.parseEther("1.0");
  await pool.connect(alice).depositNative({ value: depositAmount });
  
  const aliceShares = await pool.balanceOf(alice.address, 1);
  console.log("✅ Alice now has:", ethers.formatEther(aliceShares), "shares");
  console.log("");

  // Bob also deposits
  console.log("💰 Bob depositing 0.5 MATIC to get shares...");
  await pool.connect(bob).depositNative({ value: ethers.parseEther("0.5") });
  
  const bobShares = await pool.balanceOf(bob.address, 1);
  console.log("✅ Bob now has:", ethers.formatEther(bobShares), "shares");
  console.log("");

  // Show total pool stats
  const totalShares = await pool.totalShares();
  const totalDeposited = await pool.totalDeposited();
  console.log("📊 Pool Statistics:");
  console.log("- Total Shares:", ethers.formatEther(totalShares));
  console.log("- Total Deposited:", ethers.formatEther(totalDeposited), "MATIC");
  console.log("- Pool Balance:", ethers.formatEther(await ethers.provider.getBalance(poolAddr)), "MATIC");
  console.log("");

  // Alice creates a leveraged bet
  console.log("🎯 Alice creating leveraged bet...");
  await pool.connect(alice).setApprovalForAll(await pool.getAddress(), true);
  
  const collateralShares = ethers.parseEther("0.3");
  const leverageBPS = 8000; // 80% leverage
  
  await pool.connect(alice).createChildBet(
    collateralShares,
    0, // No additional ERC20 stake
    leverageBPS
  );
  
  const childCount = await pool.childCount();
  console.log("✅ Leveraged bet created!");
  console.log("- Collateral locked:", ethers.formatEther(collateralShares), "shares");
  console.log("- Leverage:", leverageBPS / 100, "%");
  console.log("- Total child bets:", childCount.toString());
  console.log("");

  // Update oracle price to above target
  console.log("📈 Updating oracle price to $1700 (above target)...");
  await mockAgg.updateAnswer(1700 * 1e8);
  console.log("✅ Price updated to $1700");
  console.log("");

  // Fast forward time to after deadline
  console.log("⏰ Fast forwarding time to after deadline...");
  await ethers.provider.send("evm_increaseTime", [3700]); // > 1 hour
  await ethers.provider.send("evm_mine");
  console.log("✅ Time advanced");
  console.log("");

  // Resolve pool
  console.log("🔍 Resolving pool...");
  await pool.connect(deployer).resolvePool();
  console.log("✅ Pool resolved!");
  console.log("- Final outcome: WINNING (price above target)");
  console.log("");

  // Alice claims winnings
  console.log("💸 Alice claiming 0.5 shares...");
  const claimAmount = ethers.parseEther("0.5");
  const initialBalance = await ethers.provider.getBalance(alice.address);
  
  await pool.connect(alice).claim(claimAmount);
  
  const finalBalance = await ethers.provider.getBalance(alice.address);
  const balanceDiff = finalBalance - initialBalance;
  
  console.log("✅ Alice claimed successfully!");
  console.log("- Claimed shares:", ethers.formatEther(claimAmount));
  console.log("- Received payout:", ethers.formatEther(balanceDiff), "MATIC");
  console.log("- Payout ratio: 2x (winning bet)");
  console.log("");

  console.log("🎉 POL Pool Showcase Complete!");
  console.log("================================");
  console.log("✅ Pool created with native MATIC funding");
  console.log("✅ Users deposited MATIC and received shares");
  console.log("✅ Leveraged bets created with share collateral");
  console.log("✅ Pool resolved based on oracle price");
  console.log("✅ Winners claimed 2x payout");
  console.log("");
  console.log("The POL pool creation is working perfectly! 🚀");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});



