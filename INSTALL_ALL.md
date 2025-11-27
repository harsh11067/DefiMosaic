# Complete Installation Guide

## 🚀 Quick Install (All Dependencies)

### Windows
```cmd
REM Install Python dependencies
cd tools\backtester
pip install -r requirements.txt
cd ..\..

REM Install web dependencies
cd web
call npm install
cd ..

REM Install indexer dependencies
cd services\indexer
call npm install
cd ..\..

REM Install contract dependencies
cd contracts
call npm install
cd ..
```

### Linux/Mac
```bash
# Install Python dependencies
cd tools/backtester
pip install -r requirements.txt || pip3 install -r requirements.txt
cd ../..

# Install web dependencies
cd web
npm install
cd ..

# Install indexer dependencies
cd services/indexer
npm install
cd ../..

# Install contract dependencies
cd contracts
npm install
cd ..
```

## 📦 Package Installation Commands

### Python Packages
```bash
pip install requests==2.31.0 pandas==2.0.3 numpy==1.24.3 matplotlib==3.7.2
```

### Node.js Packages (Web)
```bash
cd web
npm install @heroicons/react @prisma/client @rainbow-me/rainbowkit @tanstack/react-query ethers framer-motion langchain next openai prisma react react-dom reactflow recharts socket.io-client viem wagmi zod dagre firebase
```

### Node.js Packages (Indexer)
```bash
cd services/indexer
npm install cors dotenv ethers express pg socket.io
```

### Node.js Packages (Contracts)
```bash
cd contracts
npm install @openzeppelin/contracts dotenv
npm install --save-dev @nomicfoundation/hardhat-chai-matchers @nomicfoundation/hardhat-ethers @nomicfoundation/hardhat-ignition @nomicfoundation/hardhat-ignition-ethers @nomicfoundation/hardhat-network-helpers @nomicfoundation/hardhat-toolbox @nomicfoundation/hardhat-verify @nomicfoundation/ignition-core @typechain/ethers-v6 @typechain/hardhat @types/chai @types/mocha @types/node chai ethers hardhat hardhat-gas-reporter solidity-coverage ts-node typechain typescript
```

## 🚀 Deploy to Polygon Amoy

```bash
cd contracts
npm run deploy:amoy
```

This will output:
```
Deployer: 0x...
USDCMock: 0x...
MockOracle: 0x...
BetPoolFactory: 0x...
MultiversePrediction: 0x...
StrategyRegistry: 0x...
Bet1155: 0x...
```

**Copy these addresses to `web/src/config/contracts.json`**

## ✅ Verification Checklist

- [ ] Python 3.8+ installed (`python --version`)
- [ ] Node.js 18+ installed (`node --version`)
- [ ] All Python packages installed
- [ ] All npm packages installed (web, indexer, contracts)
- [ ] Contracts deployed to Polygon Amoy
- [ ] Contract addresses updated in config
- [ ] Environment variables set
- [ ] Database schema applied
- [ ] Indexer service running
- [ ] Web frontend running

## 🎯 Test Features

1. **Create Root Prediction** → Should appear in chains
2. **Branch Chain** → Should create child and show in graph
3. **Fork Strategy Template** → Should create strategy
4. **Join Strategy** → Should show in Joined Strategies
5. **Open Chat** → Should show chat interface
6. **Run Backtest** → Should show metrics and chart

