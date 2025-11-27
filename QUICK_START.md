# Quick Start Guide

## 🚀 One-Command Installation & Deployment

### Windows
```bash
DEPLOY.bat
```

### Linux/Mac
```bash
chmod +x DEPLOY.sh
./DEPLOY.sh
```

## 📋 Manual Steps

### 1. Install Python Dependencies
```bash
cd tools/backtester
pip install -r requirements.txt
# or
pip3 install -r requirements.txt
```

### 2. Install Node.js Dependencies
```bash
# Web frontend
cd web
npm install

# Indexer service
cd ../services/indexer
npm install

# Contracts
cd ../../contracts
npm install
```

### 3. Deploy Contracts
```bash
cd contracts
npm run deploy:amoy
```

This will output contract addresses. Update `web/src/config/contracts.json` with these addresses.

### 4. Set Environment Variables

**web/.env.local:**
```env
NEXT_PUBLIC_INDEXER_URL=http://localhost:4000
OPENAI_API_KEY=your_key
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
RPC_URL=your_rpc_url
NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS=your_address
```

**services/indexer/.env:**
```env
RPC_URL=your_rpc_url
PORT=4000
PREDICTION_CONTRACT_ADDRESS=your_address
DATABASE_URL=postgresql://user:pass@host:5432/dbname
```

### 5. Setup Database
```bash
psql $DATABASE_URL < services/indexer/schema.sql
```

### 6. Start Services

**Terminal 1 - Indexer:**
```bash
cd services/indexer
npm start
```

**Terminal 2 - Web:**
```bash
cd web
npm run dev
```

## ✅ Verification

1. Open http://localhost:3000
2. Connect wallet
3. Create a root prediction
4. See it appear in "Your Prediction Chains" with graph visualization
5. Branch the chain to create child predictions
6. See real-time updates in the graph

## 🐛 Troubleshooting

- **Python not found**: Use `python3` instead of `python`
- **npm install fails**: Delete `node_modules` and `package-lock.json`, then retry
- **Indexer won't start**: Check database connection and contract address
- **Graph not showing**: Ensure indexer is running and `NEXT_PUBLIC_INDEXER_URL` is set

