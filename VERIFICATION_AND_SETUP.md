# Verification and Setup Guide

## ✅ Completed Changes

### 1. Database Setup for Predictions
- ✅ Added `Prediction` model to Prisma schema (`web/prisma/schema.prisma`)
- ✅ Indexer handles `prisma+postgres://` format (strips prefix automatically)
- ✅ Indexer stores health, price_target, and all prediction data
- ✅ Database schema matches Prisma model

### 2. Prediction Chains UI Improvements
- ✅ Changed title to "Your Prediction Chains" 
- ✅ Added better animations with Framer Motion
- ✅ Improved branch chain button with hover effects
- ✅ Animated chain structure display with staggered animations
- ✅ Horizontal view default in PredictionGraph
- ✅ Added "Your Prediction Chains" title in graph view

### 3. Firebase Configuration
- ✅ Firebase Admin initialization with robust error handling
- ✅ Handles escaped JSON strings in environment variables
- ✅ Clear error messages for misconfiguration
- ✅ Client-side Firebase initialization in StrategyChat component

## 🔧 Required Environment Variables

### web/.env.local
```env
# Database (supports prisma+ prefix)
DATABASE_URL=prisma+postgres://accelerate.prisma-data.net/?...

# Firebase Client Config (for StrategyChat component)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin Config (for API routes)
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"...","token_uri":"...","auth_provider_x509_cert_url":"...","client_x509_cert_url":"..."}

# Other
RPC_URL=your_rpc_url
NEXT_PUBLIC_STRATEGY_REGISTRY_ADDRESS=your_address
OPENAI_API_KEY=your_key
NEXT_PUBLIC_INDEXER_URL=http://localhost:4000
```

### services/indexer/.env
```env
# Database (supports prisma+ prefix - will be auto-converted)
DATABASE_URL=prisma+postgres://accelerate.prisma-data.net/?...

# Indexer Config
RPC_URL=your_rpc_url
PORT=4000
PREDICTION_CONTRACT_ADDRESS=your_contract_address
```

## 🚀 Setup Commands

### 1. Generate Prisma Client
```bash
cd web
npx prisma generate
```

### 2. Setup Database Schema
```bash
# The indexer will create the table automatically, or run:
psql $DATABASE_URL < services/indexer/schema.sql
```

### 3. Start Indexer Service
```bash
cd services/indexer
npm install  # if not already installed
npm start
```

### 4. Start Web Frontend
```bash
cd web
npm install  # if not already installed
npm run dev
```

## ✅ Verification Steps

### 1. Verify Database Connection
```bash
cd services/indexer
node -e "require('dotenv').config(); const { Pool } = require('pg'); let dbUrl = process.env.DATABASE_URL || ''; if (dbUrl.startsWith('prisma+')) { dbUrl = dbUrl.replace('prisma+', ''); } const pool = new Pool({ connectionString: dbUrl }); pool.query('SELECT 1').then(() => { console.log('✅ Database connected'); process.exit(0); }).catch(err => { console.error('❌ Database connection failed:', err.message); process.exit(1); });"
```

### 2. Verify Firebase Configuration
```bash
cd web
node -e "require('dotenv').config({ path: '.env.local' }); const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON; if (!json) { console.log('❌ FIREBASE_SERVICE_ACCOUNT_JSON not set'); process.exit(1); } try { const parsed = JSON.parse(json); if (parsed.type === 'service_account' && parsed.project_id) { console.log('✅ Firebase config valid'); } else { console.log('❌ Invalid Firebase config format'); process.exit(1); } } catch (e) { console.log('❌ Failed to parse Firebase JSON:', e.message); process.exit(1); }"
```

### 3. Verify Indexer Starts
```bash
cd services/indexer
npm start
# Should see: "Database connected" and "Event listeners initialized"
```

### 4. Verify Web Builds
```bash
cd web
npm run build
# Should compile successfully (warnings about 'any' types are OK)
```

## 🎯 Features Implemented

### Prediction Chains Display
- ✅ Visual root → child predictions with animated arrows
- ✅ Live health/leverage/resolution display
- ✅ Real-time updates via socket.io
- ✅ Horizontal branch view (default)
- ✅ Health bars with color coding (green/yellow/red)
- ✅ Countdown timer to deadline
- ✅ Click node → open modal with full details
- ✅ Edge styles: dashed if liquidated subtree
- ✅ Better animations for Branch Chain button
- ✅ Animated chain structure display

### Indexer (Node) Responsibilities
- ✅ Subscribes to PredictionCreated, PredictionResolved, Liquidation events
- ✅ Updates predictions rows in database
- ✅ Emits socket events: prediction:created, prediction:updated, prediction:resolved, prediction:liquidated
- ✅ Periodic health check job (every 30 seconds)
- ✅ Computes health = (collateral + outstandingLoan) / requiredCollateral
- ✅ Stores health in database

### Real-time Update Flow
- ✅ Indexer emits socket event prediction:update with new node data
- ✅ Client receives and updates nodes state (React Flow)
- ✅ Animates health transitions (Framer Motion inside node)

## 🐛 Troubleshooting

### Firebase "not configured" Error
1. Check `FIREBASE_SERVICE_ACCOUNT_JSON` is set in `web/.env.local`
2. Verify JSON is valid (no trailing commas, proper escaping)
3. Check server logs for detailed error messages
4. Ensure `NEXT_PUBLIC_FIREBASE_*` variables are set for client-side

### Database Connection Issues
1. Verify `DATABASE_URL` is set (supports `prisma+` prefix)
2. Check database is accessible from your network
3. Verify credentials are correct
4. Check indexer logs for connection errors

### Prediction Chains Not Showing
1. Ensure indexer is running
2. Check `NEXT_PUBLIC_INDEXER_URL` is set correctly
3. Verify contract address is correct
4. Check browser console for errors
5. Ensure wallet is connected

## 📝 Next Steps

1. Set all environment variables in `.env.local` and `services/indexer/.env`
2. Run `npx prisma generate` in `web/` directory
3. Start indexer: `cd services/indexer && npm start`
4. Start web: `cd web && npm run dev`
5. Test creating a root prediction
6. Test branching a chain
7. Verify real-time updates work

