const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("POL Pool Creation Test", function () {
  let deployer, alice;
  let MockAgg, mockAgg;
  let Factory, factory;
  let BetPool, pool;

  beforeEach(async () => {
    [deployer, alice] = await ethers.getSigners();

    // Deploy mock aggregator
    MockAgg = await ethers.getContractFactory("MockV3Aggregator");
    mockAgg = await MockAgg.deploy(1500 * 1e8);
    await mockAgg.waitForDeployment();

    // Deploy factory
    Factory = await ethers.getContractFactory("BetPoolFactory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();
  });

  it("should create POL pool with native funding", async () => {
    const durationSeconds = 3600; // 1 hour
    const priceTarget = 1600 * 1e8; // $1600
    const polAmount = ethers.parseEther("0.0001"); // 1 MATIC

    console.log("🚀 Creating POL pool...");
    console.log("Duration:", durationSeconds, "seconds");
    console.log("Price Target: $1600");
    console.log("Initial Funding:", ethers.formatEther(polAmount), "MATIC");

    // Create POL pool with native funding
    const tx = await factory.connect(alice).createPoolWithNative(
      durationSeconds,
      await mockAgg.getAddress(),
      priceTarget,
      { value: polAmount }
    );
    
    const receipt = await tx.wait();
    
    // Check that PoolCreated event was emitted
    const event = receipt.logs.find(log => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed.name === "PoolCreated";
      } catch (e) {
        return false;
      }
    });
    
    expect(event).to.not.be.undefined;
    
    // Get the created pool address
    const pools = await factory.getAllPools();
    expect(pools.length).to.equal(1);
    
    const poolAddr = pools[0];
    BetPool = await ethers.getContractFactory("BetPool");
    pool = await BetPool.attach(poolAddr);
    
    // Verify pool properties
    expect(await pool.priceTarget()).to.equal(priceTarget);
    const expectedDeadline = BigInt(Math.floor(Date.now() / 1000) + durationSeconds);
    const actualDeadline = await pool.deadline();
    expect(actualDeadline).to.be.closeTo(expectedDeadline, 1); // Allow 1 second tolerance
    expect(await pool.erc20Token()).to.equal(ethers.ZeroAddress); // Should be zero for native-only pools
    
    // Verify pool has the initial funding
    const poolBalance = await ethers.provider.getBalance(await pool.getAddress());
    expect(poolBalance).to.equal(polAmount);
    
    console.log("✅ POL Pool created successfully!");
    console.log("Pool address:", poolAddr);
    console.log("Pool balance:", ethers.formatEther(poolBalance), "MATIC");
    console.log("Price target:", ethers.formatUnits(await pool.priceTarget(), 8), "USD");
    console.log("Deadline:", new Date(Number(await pool.deadline()) * 1000).toLocaleString());
  });

  it("should allow users to deposit native MATIC to POL pool", async () => {
    // First create a POL pool
    const durationSeconds = 3600;
    const priceTarget = 1600 * 1e8;
    const polAmount = ethers.parseEther("0.0001");

    console.log("🚀 Creating POL pool for deposit test...");

    const tx = await factory.connect(alice).createPoolWithNative(
      durationSeconds,
      await mockAgg.getAddress(),
      priceTarget,
      { value: polAmount }
    );
    await tx.wait();
    
    const pools = await factory.getAllPools();
    const poolAddr = pools[0];
    BetPool = await ethers.getContractFactory("BetPool");
    pool = await BetPool.attach(poolAddr);
    
    console.log("💰 Alice depositing 0.00005 MATIC...");
    
    // Alice deposits additional MATIC
    const depositAmount = ethers.parseEther("0.00005");
    await pool.connect(alice).depositNative({ value: depositAmount });
    
    // Check Alice's share balance
    const aliceShares = await pool.balanceOf(alice.address, 1);
    expect(aliceShares).to.equal(depositAmount);
    
    // Check total shares
    const totalShares = await pool.totalShares();
    expect(totalShares).to.equal(depositAmount);
    
    console.log("✅ Native deposit successful!");
    console.log("Alice shares:", ethers.formatEther(aliceShares));
    console.log("Total shares in pool:", ethers.formatEther(totalShares));
  });

  it("should allow users to create leveraged bets", async () => {
    // First create a POL pool and deposit
    const durationSeconds = 3600;
    const priceTarget = 1600 * 1e8;
    const polAmount = ethers.parseEther("0.0002"); // More funding for leverage

    console.log("🚀 Creating POL pool for leveraged betting...");

    const tx = await factory.connect(alice).createPoolWithNative(
      durationSeconds,
      await mockAgg.getAddress(),
      priceTarget,
      { value: polAmount }
    );
    await tx.wait();
    
    const pools = await factory.getAllPools();
    const poolAddr = pools[0];
    BetPool = await ethers.getContractFactory("BetPool");
    pool = await BetPool.attach(poolAddr);
    
    // Alice deposits MATIC
    const depositAmount = ethers.parseEther("0.0001");
    await pool.connect(alice).depositNative({ value: depositAmount });
    
    // Alice approves the pool to transfer her shares
    await pool.connect(alice).setApprovalForAll(await pool.getAddress(), true);
    
    console.log("🎯 Alice creating leveraged bet...");
    console.log("Locking 0.3 shares as collateral");
    console.log("Using 80% leverage");
    
    // Alice creates a leveraged bet
    const collateralShares = ethers.parseEther("0.3");
    const leverageBPS = 8000; // 80% leverage
    
    await pool.connect(alice).createChildBet(
      collateralShares,
      0, // No additional ERC20 stake
      leverageBPS
    );
    
    // Check child bet was created
    const childCount = await pool.childCount();
    expect(childCount).to.equal(1);
    
    console.log("✅ Leveraged bet created successfully!");
    console.log("Child bet count:", childCount.toString());
    console.log("Collateral locked:", ethers.formatEther(collateralShares), "shares");
    console.log("Leverage:", leverageBPS / 100, "%");
  });
});



