# POL Pool Creation Demo

This demonstrates how the POL (Proof of Liquidity) pool creation works in DefiMosaic.

## How It Works

1. **Pool Creation**: Users create a pool with native MATIC funding
2. **Price Prediction**: Users predict if a token price will reach a target by a deadline
3. **Liquidity Provision**: Initial MATIC funds the pool for leveraged betting
4. **Share Distribution**: Users get 1:1 shares for MATIC deposited
5. **Leveraged Betting**: Users can create leveraged bets using shares as collateral

## Example Flow

```javascript
// 1. Create POL Pool
const factory = await BetPoolFactory.deploy();
const tx = await factory.createPoolWithNative(
  3600, // 1 hour duration
  oracleAddress, // Price feed address
  1600 * 1e8, // $1600 target price
  { value: ethers.parseEther("1.0") } // 1 MATIC initial funding
);

// 2. Users deposit MATIC to get shares
await pool.depositNative({ value: ethers.parseEther("0.5") });
// User gets 0.5 shares (1:1 ratio)

// 3. Users create leveraged bets
await pool.createChildBet(
  ethers.parseEther("0.2"), // Lock 0.2 shares as collateral
  0, // No additional ERC20 stake
  8000 // 80% leverage (0.16 MATIC loan)
);

// 4. Pool resolves based on oracle price
await pool.resolvePool(); // Only after deadline

// 5. Users claim winnings
await pool.claim(ethers.parseEther("0.3")); // Claim 0.3 shares
// If price target reached: 2x payout (0.6 MATIC)
// If price target missed: 0.5x payout (0.15 MATIC)
```

## Key Features

- ✅ **Native MATIC Support**: No need for ERC20 tokens
- ✅ **Leveraged Betting**: Up to 80% leverage on collateral
- ✅ **Oracle Integration**: Uses Chainlink-compatible price feeds
- ✅ **Automatic Resolution**: Pools resolve based on real price data
- ✅ **Fair Payouts**: 2x for winners, 0.5x for losers

## Smart Contract Architecture

```
BetPoolFactory
├── createPoolWithNative() - Creates POL pools with MATIC funding
└── getAllPools() - Lists all created pools

BetPool (ERC1155)
├── depositNative() - Deposit MATIC for shares
├── createChildBet() - Create leveraged bet with shares
├── resolvePool() - Resolve based on oracle price
└── claim() - Claim winnings after resolution
```

## Frontend Integration

The frontend provides a user-friendly interface for:
- Creating new POL pools
- Depositing MATIC to existing pools
- Creating leveraged bets
- Monitoring pool status
- Claiming winnings

## Testing Results

✅ **Pool Creation**: Successfully creates pools with native funding
✅ **Native Deposits**: Users can deposit MATIC and receive shares
✅ **Child Bet Creation**: Leveraged bets work with share collateral
✅ **Pool Resolution**: Pools resolve correctly based on oracle data
✅ **Claims**: Users can claim winnings after resolution

The POL pool creation is fully functional and ready for users to predict price movements with native MATIC!

