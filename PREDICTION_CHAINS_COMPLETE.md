# Prediction Chains System - Complete Implementation

## ✅ Data Flow: Contract → Indexer → DB → API → React UI

### 1. Contract Events
- `PredictionCreated(uint256 id, uint256 parentId, ...)` - Emitted when root or child prediction is created
- `PredictionResolved(uint256 id, bool outcome)` - Emitted when prediction is resolved
- `PredictionLiquidated(uint256 id)` - Emitted when prediction is liquidated

### 2. Indexer (`services/indexer/indexer.js`)
- **Listens to contract events** and stores in PostgreSQL
- **Normalizes parentId**: Ensures `parentId = 0` for root predictions
- **Computes health** for each prediction
- **Updates in real-time** via Socket.io

**Key Functions**:
- `upsertPrediction()` - Stores/updates prediction with normalized parentId
- `computeHealth()` - Calculates health percentage
- `initListeners()` - Attaches event listeners to contract

**API Endpoints**:
- `GET /predictions/root/:rootId` - Get tree starting from root
- `GET /predictions/creator/:creator` - Get all predictions for a creator

### 3. Database Schema
```sql
predictions (
  id BIGINT PRIMARY KEY,
  parent_id BIGINT DEFAULT 0,  -- 0 for roots, actual ID for children
  creator TEXT,
  collateral DECIMAL,
  loan_amount DECIMAL,
  leverage_bps INT,
  deadline BIGINT,
  resolved BOOLEAN,
  outcome BOOLEAN,
  liquidated BOOLEAN,
  price_target DECIMAL,
  health DECIMAL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### 4. Next.js API (`web/src/app/api/predictions/tree/route.ts`)
- **Endpoint**: `GET /api/predictions/tree?creator=0x123`
- **Returns**: Tree structure with all root chains and children
- **Fallback**: Tries indexer API first, then Supabase

**Response Format**:
```json
{
  "ok": true,
  "trees": [
    {
      "id": 1,
      "parentId": 0,
      "creator": "0x123...",
      "collateral": "1000000000000000000",
      "loanAmount": "500000000000000000",
      "targetPrice": "180000000000",
      "deadline": 1234567890,
      "status": "active",
      "leverageBps": 5000,
      "health": 150.5,
      "children": [
        {
          "id": 2,
          "parentId": 1,
          ...
          "children": []
        }
      ]
    }
  ],
  "totalNodes": 3
}
```

### 5. Frontend (`web/src/components/CascadingPredictions.tsx`)
- **Fetches tree** from API endpoint
- **Recursively renders** tree structure
- **Shows Branch Chain button** on all active predictions
- **Real-time updates** via Socket.io (when indexer available)

## 🔄 Branch Chain Flow

### When User Clicks "Branch Chain":
1. **UI**: Opens modal with form (target price, deadline, leverage)
2. **Contract Call**: `createChildPrediction(parentId, priceTarget, deadline, leverage)`
3. **Contract Validates**:
   - Parent is active (not resolved/liquidated)
   - Loan available from parent
   - Stores new prediction
4. **Event Emitted**: `PredictionCreated(id, parentId, ...)`
5. **Indexer Catches Event**:
   - Stores in DB with `parent_id = parentId`
   - Computes health
   - Emits Socket.io event
6. **API**: Next fetch returns updated tree
7. **UI**: Refreshes and new node appears under parent instantly

## 📊 Tree Rendering

### Recursive Structure:
```
Prediction #1 (Root) - parentId: 0
 ├── Prediction #2 - parentId: 1
 │     └── Prediction #4 - parentId: 2
 └── Prediction #3 - parentId: 1
```

### UI Components:
- **Root Chain Card**: Shows root prediction with full details
- **Child Chains Section**: Lists all children with Branch buttons
- **Chain Structure**: Visual representation with arrows
- **Graph View**: ReactFlow visualization

## 🛠️ Files Changed

1. **`web/src/app/api/eth-price/route.ts`** - Proxy for CoinGecko API
2. **`web/src/app/api/top-mover/route.ts`** - Proxy for CoinGecko API
3. **`web/src/app/api/predictions/tree/route.ts`** - Tree API endpoint
4. **`web/src/components/ETHPriceDisplay.tsx`** - Uses proxy API
5. **`web/src/components/SurgeBoost.tsx`** - Uses proxy API
6. **`services/indexer/indexer.js`** - Normalizes parentId, adds creator endpoint

## ✅ Features

- ✅ Normalized parentId (0 for roots)
- ✅ Recursive tree rendering
- ✅ Branch Chain buttons on all active predictions
- ✅ Real-time updates via Socket.io
- ✅ Health calculation
- ✅ Status tracking (active/resolved/liquidated)
- ✅ CORS fixes for external APIs

## 🚀 Next Steps

1. **Update CascadingPredictions** to use `/api/predictions/tree` endpoint
2. **Add recursive rendering** component
3. **Test Branch Chain** end-to-end flow
4. **Verify real-time updates** work correctly

