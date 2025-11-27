# Installation and Deployment Guide

## 1. Install Python Dependencies

```bash
# Navigate to backtester directory
cd tools/backtester

# Install Python packages
pip install -r requirements.txt

# Or use pip3 if pip doesn't work
pip3 install -r requirements.txt
```

## 2. Install Node.js Dependencies

```bash
# Install web frontend dependencies
cd web
npm install

# Install indexer service dependencies
cd ../services/indexer
npm install
```

## 3. Environment Setup

### Frontend (.env.local in web/)
```env
NEXT_PUBLIC_INDEXER_URL=http://localhost:4000
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
OPENAI_API_KEY=your_openai_key
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
RPC_URL=your_rpc_url
NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS=your_registry_address
```

### Indexer (.env in services/indexer/)
```env
RPC_URL=your_rpc_url
PORT=4000
PREDICTION_CONTRACT_ADDRESS=your_contract_address
DATABASE_URL=your_postgres_connection_string
```

## 4. Database Setup

```bash
# Run schema
psql $DATABASE_URL < services/indexer/schema.sql
```

## 5. Start Services

### Terminal 1: Indexer Service
```bash
cd services/indexer
npm start
```

### Terminal 2: Web Frontend
```bash
cd web
npm run dev
```

## 6. Deploy to Polygon Amoy

### Deploy Contracts
```bash
cd contracts
npm run deploy:amoy
```

### Or manually:
```bash
cd contracts
npx hardhat run scripts/deploy.ts --network polygon_amoy
```

### Update Contract Addresses
After deployment, update `web/src/config/contracts.json` with the deployed addresses.

## 7. Production Build

```bash
# Build frontend
cd web
npm run build

# Start production server
npm start
```

## Quick Start Script

Create `start-all.sh`:
```bash
#!/bin/bash

# Start indexer in background
cd services/indexer && npm start &
INDEXER_PID=$!

# Wait a bit
sleep 3

# Start web frontend
cd ../../web && npm run dev

# Cleanup on exit
trap "kill $INDEXER_PID" EXIT
```

Make executable:
```bash
chmod +x start-all.sh
./start-all.sh
```

## Troubleshooting

### Python Backtester Issues
- Ensure Python 3.8+ is installed
- Check `python --version` or `python3 --version`
- Install missing packages: `pip install requests pandas numpy matplotlib`

### Node.js Issues
- Ensure Node.js 18+ is installed
- Clear node_modules and reinstall: `rm -rf node_modules package-lock.json && npm install`

### Indexer Issues
- Check database connection
- Verify contract address is correct
- Check RPC URL is accessible

### Frontend Issues
- Clear Next.js cache: `rm -rf .next`
- Check environment variables are set
- Verify Firebase configuration

