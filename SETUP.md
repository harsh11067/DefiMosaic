# Setup Guide - DeFi Mosaic

This comprehensive guide will walk you through setting up DeFi Mosaic from scratch, including environment configuration, contract deployment, and frontend setup.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Environment Configuration](#environment-configuration)
4. [Smart Contract Setup](#smart-contract-setup)
5. [Frontend Setup](#frontend-setup)
6. [Wallet Configuration](#wallet-configuration)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   ```bash
   node --version  # Should be v18+
   ```

2. **npm** or **yarn**
   ```bash
   npm --version
   # or
   yarn --version
   ```

3. **Git**
   ```bash
   git --version
   ```

4. **MetaMask** or compatible Web3 wallet
   - Install from [metamask.io](https://metamask.io/)

### Required Accounts & Tokens

1. **Polygon Amoy Testnet Access**
   - Network Name: Polygon Amoy
   - RPC URL: `https://rpc-amoy.polygon.technology`
   - Chain ID: `80002`
   - Currency Symbol: `MATIC`
   - Block Explorer: `https://amoy.polygonscan.com`

2. **Test MATIC Tokens**
   - Get from [Polygon Faucet](https://faucet.polygon.technology/)
   - You'll need test MATIC for gas fees

3. **Optional: OpenAI API Key**
   - For AI-powered portfolio recommendations
   - Get from [OpenAI Platform](https://platform.openai.com/)

---

## Initial Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd DefiMosaic
```

### 2. Verify Project Structure

```
DefiMosaic/
├── contracts/          # Smart contracts directory
├── web/                # Next.js frontend
├── README.md
├── SETUP.md
└── PROJECT_DOCUMENTATION.md
```

---

## Environment Configuration

### 1. Smart Contracts Environment

Navigate to the contracts directory:

```bash
cd contracts
```

Create a `.env` file in the `contracts/` directory:

```bash
touch .env
```

Add the following to `.env`:

```env
# Private key of the account that will deploy contracts
# NEVER commit this file to version control!
PRIVATE_KEY=your_private_key_here

# Polygon Amoy RPC URL
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology

# Optional: Etherscan API key for contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

**⚠️ Security Warning:**
- Never share your private key
- Never commit `.env` files to Git
- Use a dedicated account for testing (not your main wallet)

### 2. Frontend Environment

Navigate to the web directory:

```bash
cd ../web
```

Create a `.env.local` file:

```bash
touch .env.local
```

Add the following configuration:

```env
# Network Configuration
NEXT_PUBLIC_DEFAULT_NETWORK=polygon_amoy

# Contract Addresses (will be updated after deployment)
NEXT_PUBLIC_BET_POOL_FACTORY_ADDRESS=
NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS=
NEXT_PUBLIC_MULTIVERSE_PREDICTION_ADDRESS=
NEXT_PUBLIC_BET1155_ADDRESS=
NEXT_PUBLIC_USDC_MOCK_ADDRESS=
NEXT_PUBLIC_MOCK_ORACLE_ADDRESS=

# Optional: OpenAI API Key for AI recommendations
OPENAI_API_KEY=your_openai_api_key_here
```

**Note:** Contract addresses will be automatically updated after deployment, but you can also set them manually.

---

## Smart Contract Setup

### 1. Install Dependencies

```bash
cd contracts
npm install
```

This will install:
- Hardhat and plugins
- OpenZeppelin contracts
- TypeScript and type definitions
- Testing libraries

### 2. Compile Contracts

```bash
npx hardhat compile
```

Expected output:
```
Compiled 10 Solidity files successfully
```

### 3. Run Tests (Optional but Recommended)

```bash
npm test
```

Or run specific tests:

```bash
# Test POL pool creation
npx hardhat test test/POLPoolCreation.test.js

# Test BetPool functionality
npx hardhat test test/BetPool.test.js
```

### 4. Deploy Contracts

**Before deploying, ensure:**
- Your `.env` file is configured with `PRIVATE_KEY`
- You have test MATIC in your deployment account
- You're connected to Polygon Amoy testnet

Deploy all contracts:

```bash
npx hardhat run scripts/deploy.ts --network polygon_amoy
```

**What happens during deployment:**
1. Deploys USDCMock token
2. Deploys MockOracle for price feeds
3. Deploys BetPoolFactory
4. Deploys MultiversePrediction
5. Deploys StrategyRegistry
6. Deploys Bet1155 (ERC1155 token)
7. Updates `web/src/config/contracts.json` with addresses

**Expected output:**
```
Deploying contracts to Polygon Amoy...
USDCMock deployed to: 0x...
MockOracle deployed to: 0x...
BetPoolFactory deployed to: 0x...
...
Contract addresses saved to web/src/config/contracts.json
```

### 5. Verify Contract Addresses

After deployment, check `web/src/config/contracts.json`:

```json
{
  "network": "polygon_amoy",
  "USDCMock": "0x...",
  "MockOracle": "0x...",
  "BetPoolFactory": "0x...",
  "StrategyRegistry": "0x...",
  "MultiversePrediction": "0x...",
  "Bet1155": "0x..."
}
```

**Optional: Verify on Block Explorer**

```bash
npx hardhat verify --network polygon_amoy <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

---

## Frontend Setup

### 1. Install Dependencies

```bash
cd web
npm install
```

This will install:
- Next.js 15 and React 19
- Wagmi v2 and RainbowKit
- Framer Motion
- Tailwind CSS
- TypeScript
- And other dependencies

### 2. Verify Configuration

Check that `web/src/config/contracts.json` has the deployed contract addresses. If not, update it manually or re-run the deployment script.

### 3. Start Development Server

```bash
npm run dev
```

Expected output:
```
  ▲ Next.js 15.5.4
  - Local:        http://localhost:3000
  - Network:      http://192.168.x.x:3000

 ✓ Ready in 2.5s
```

### 4. Build for Production (Optional)

```bash
npm run build
npm start
```

---

## Wallet Configuration

### 1. Install MetaMask

1. Visit [metamask.io](https://metamask.io/)
2. Install the browser extension
3. Create a new wallet or import existing
4. **Important:** Use a test account, not your main wallet

### 2. Add Polygon Amoy Network

**Option A: Manual Configuration**

1. Open MetaMask
2. Click network dropdown → "Add Network" → "Add a network manually"
3. Enter the following:
   - **Network Name:** Polygon Amoy
   - **RPC URL:** `https://rpc-amoy.polygon.technology`
   - **Chain ID:** `80002`
   - **Currency Symbol:** `MATIC`
   - **Block Explorer URL:** `https://amoy.polygonscan.com`

**Option B: Use Chainlist**

1. Visit [chainlist.org](https://chainlist.org/)
2. Search for "Polygon Amoy"
3. Click "Connect Wallet" and approve

### 3. Get Test MATIC

1. Visit [Polygon Faucet](https://faucet.polygon.technology/)
2. Select "Polygon Amoy"
3. Enter your wallet address
4. Request test tokens
5. Wait for confirmation (usually instant)

### 4. Connect Wallet to Application

1. Open `http://localhost:3000`
2. Click "Connect Wallet" button
3. Select MetaMask
4. Approve connection
5. Switch to Polygon Amoy network if prompted

---

## Testing

### 1. Test Contract Deployment

Verify contracts are deployed:

1. Go to `/bets` page
2. Check contract status indicators
3. All contracts should show ✅ (green checkmark)

### 2. Test Basic Functionality

**Create a Strategy:**
1. Go to `/dashboard`
2. Click "+ Create Strategy"
3. Enter unique name and description
4. Set fee (0-20%)
5. Confirm transaction in MetaMask
6. Strategy should appear in "Available Strategies"

**Follow a Strategy:**
1. In "Available Strategies", click "Follow"
2. Enter investment amount
3. Review fee and estimated cost
4. Confirm transaction
5. Strategy should appear in "Joined Strategies"

**Create a Prediction:**
1. Go to `/bets`
2. Scroll to "Predict. Chain. Prosper."
3. Click "Create Root Prediction"
4. Enter collateral, price target, deadline
5. Set leverage (0-80%)
6. Confirm transaction
7. Prediction should appear in "Your Prediction Chains"

### 3. Test Price Tracking

1. Go to home page
2. Verify crypto price cards are loading
3. Check ETH price display
4. Prices should update every 60 seconds

---

## Troubleshooting

### Common Issues

#### 1. "Contract not deployed" Error

**Problem:** Frontend shows contracts as not deployed.

**Solutions:**
- Verify `web/src/config/contracts.json` has correct addresses
- Check that contracts were actually deployed (check block explorer)
- Ensure you're on the correct network (Polygon Amoy)
- Clear browser cache and reload

#### 2. "Network fee Alert" or High Gas Errors

**Problem:** Transactions fail due to gas estimation issues.

**Solutions:**
- Ensure you have sufficient MATIC for gas
- Try increasing gas limit manually in MetaMask
- Check network congestion
- For development, the app includes mock functionality for failed swaps

#### 3. "User rejected transaction"

**Problem:** Transaction was rejected in MetaMask.

**Solutions:**
- This is normal if user clicks "Reject"
- Check MetaMask for pending transactions
- Ensure you're on the correct network

#### 4. Frontend Not Loading

**Problem:** `npm run dev` fails or page doesn't load.

**Solutions:**
- Check Node.js version (must be 18+)
- Delete `node_modules` and `package-lock.json`, then `npm install`
- Check for port conflicts (3000 already in use)
- Review console for error messages

#### 5. Contract Deployment Fails

**Problem:** `npx hardhat run scripts/deploy.ts` fails.

**Solutions:**
- Verify `.env` file has correct `PRIVATE_KEY`
- Ensure account has test MATIC
- Check RPC URL is correct and accessible
- Review Hardhat error messages
- Try deploying contracts individually

#### 6. Wallet Connection Issues

**Problem:** Wallet won't connect or shows wrong network.

**Solutions:**
- Clear browser cache
- Disconnect and reconnect wallet
- Ensure MetaMask is unlocked
- Check that Polygon Amoy is added to MetaMask
- Try refreshing the page

#### 7. API Errors (CoinGecko, OpenAI)

**Problem:** Price data or AI recommendations not loading.

**Solutions:**
- Check internet connection
- Verify API keys are set (for OpenAI)
- CoinGecko has rate limits (free tier: 10-50 calls/minute)
- Check browser console for specific error messages

### Getting Help

1. **Check Documentation**
   - Review [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md)
   - Check [README.md](./README.md)

2. **Review Logs**
   - Browser console (F12)
   - Terminal output
   - Hardhat deployment logs

3. **Verify Configuration**
   - Environment variables
   - Contract addresses
   - Network settings

4. **Test Network Connection**
   ```bash
   curl https://rpc-amoy.polygon.technology
   ```

---

## Next Steps

After successful setup:

1. **Explore the Platform**
   - Create your first strategy
   - Make a prediction
   - Follow existing strategies

2. **Read Documentation**
   - [PROJECT_DOCUMENTATION.md](./PROJECT_DOCUMENTATION.md) for technical details
   - [README.md](./README.md) for overview

3. **Customize Configuration**
   - Adjust gas limits
   - Modify UI themes
   - Add custom strategies

4. **Deploy to Production**
   - Set up production environment variables
   - Deploy to mainnet (when ready)
   - Configure domain and hosting

---

## Security Checklist

Before deploying to production:

- [ ] Remove test/development accounts from `.env`
- [ ] Use secure key management (not plaintext private keys)
- [ ] Enable contract verification on block explorer
- [ ] Review and audit all smart contracts
- [ ] Set up monitoring and alerts
- [ ] Configure proper access controls
- [ ] Test all functionality thoroughly
- [ ] Review gas optimization
- [ ] Set up backup and recovery procedures

---

## Additional Resources

- [Polygon Documentation](https://docs.polygon.technology/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Wagmi Documentation](https://wagmi.sh/)
- [RainbowKit Documentation](https://www.rainbowkit.com/docs/introduction)

---

**Setup Complete! 🎉**

You're now ready to use DeFi Mosaic. If you encounter any issues, refer to the troubleshooting section or check the documentation.

Happy building! 🚀

