const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BetPool (native deposit) end-to-end", function () {
  let deployer, alice, bob;
  let MockERC20, mockERC20;
  let MockAgg, mockAgg;
  let Factory, factory;
  let BetPool, pool;

  beforeEach(async () => {
    [deployer, alice, bob] = await ethers.getSigners();

    // Deploy mocks
    MockERC20 = await ethers.getContractFactory("MockERC20");
    mockERC20 = await MockERC20.deploy("Mock USD", "mUSD");
    await mockERC20.waitForDeployment();

    MockAgg = await ethers.getContractFactory("MockV3Aggregator");
    // initial price 1500 * 1e8 -> in mock we store directly as integer; use 150000000000
    mockAgg = await MockAgg.deploy(1500 * 1e8);
    await mockAgg.waitForDeployment();

    // Deploy factory
    Factory = await ethers.getContractFactory("BetPoolFactory");
    factory = await Factory.deploy();
    await factory.waitForDeployment();

    // Create pool (native-only): pass erc20Token = zero address
    const tx = await factory.createPool(ethers.ZeroAddress, mockAgg.target ? mockAgg.target : mockAgg.address, 1600 * 1e8, Math.floor(Date.now() / 1000) + 3600);
    const receipt = await tx.wait();
    // PoolCreated emitted - find pool address by call to factory.getAllPools
    const pools = await factory.getAllPools();
    const poolAddr = pools[0];

    BetPool = await ethers.getContractFactory("BetPool");
    pool = await BetPool.attach(poolAddr);

    // Fund pool contract (owner sends native MATIC) so it can issue protocol loans
    // Note: use deployer to send funds
    await deployer.sendTransaction({ to: poolAddr, value: ethers.parseEther("5") });

    // Fund alice with some native (hardhat provides default large balances; still ensure)
    // Not required in Hardhat, but for safety:
    await deployer.sendTransaction({ to: alice.address, value: ethers.parseEther("10") });
  });

  it("deposit native -> createChild -> resolve -> claim", async () => {
    // Alice deposits 1 MATIC (send value)
    await pool.connect(alice).depositNative({ value: ethers.parseEther("1.0") });

    // Alice should have SHARE_ID balance = 1 wei->1 share mapping in demo (using 1e18 units)
    const aliceBal = await pool.balanceOf(alice.address, 1);
    expect(aliceBal).to.equal(ethers.parseEther("1.0"));

    // Alice needs to approve the pool contract to transfer her ERC1155 tokens (for locking)
    await pool.connect(alice).setApprovalForAll(await pool.getAddress(), true);

    // Create a child bet: lock 0.2 shares (0.2 * 1e18)
    const parentToLock = ethers.parseEther("0.2");
    // For stakeAmountERC20 pass 0 in this test (we rely on protocol native loan).
    // leverageBPS = 8000 means 80% loan on parent collateral
    await pool.connect(alice).createChildBet(parentToLock, 0, 8000);

    const childCount = await pool.childCount();
    expect(childCount).to.equal(1);

    // fast forward time to after deadline
    await ethers.provider.send("evm_increaseTime", [3700]); // > 1 hour
    await ethers.provider.send("evm_mine");

    // update aggregator to price above target -> winning condition
    await mockAgg.updateAnswer(1700 * 1e8);

    // Only owner/creator can call resolvePool (factory passed msg.sender as owner on create)
    // In our factory create, owner was msg.sender that called factory.createPool — in test that was deployer.
    // So owner is deployer (deployer calling resolve).
    await pool.connect(deployer).resolvePool();

    // After resolve, alice can claim part of her remaining shares (she locked 0.2 out of 1.0 so remaining 0.8)
    // claim 0.3 shares for demonstration (less than remaining balance)
    const claimAmount = ethers.parseEther("0.3");
    // ensure alice still has at least claimAmount balance
    const bal = await pool.balanceOf(alice.address, 1);
    expect(bal).to.be.at.least(claimAmount);

    // Get initial contract balance
    const initialContractBal = await ethers.provider.getBalance(await pool.getAddress());

    // Claim
    await pool.connect(alice).claim(claimAmount);

    // verify alice received payout (winning => 2x rule)
    // payout was 2x * claimAmount
    const expectedPayout = claimAmount * 2n;
    // Check contract native balance decreased by expected payout
    const finalContractBal = await ethers.provider.getBalance(await pool.getAddress());
    expect(finalContractBal).to.equal(initialContractBal - expectedPayout);
  });
});
