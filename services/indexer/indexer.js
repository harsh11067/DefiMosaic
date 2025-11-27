require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { ethers } = require('ethers');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const RPC = process.env.RPC_URL;
const PORT = process.env.PORT || 4000;
const CONTRACT_ADDR = process.env.PREDICTION_CONTRACT_ADDRESS;

// Validate required environment variables
if (!RPC) {
  console.error('ERROR: RPC_URL environment variable is not set');
  process.exit(1);
}

if (!CONTRACT_ADDR) {
  console.error('ERROR: PREDICTION_CONTRACT_ADDRESS environment variable is not set');
  console.error('Please set PREDICTION_CONTRACT_ADDRESS in your .env file');
  process.exit(1);
}

// Load ABI from artifacts
let ABI;
try {
  // Try to load from artifacts first
  const artifactPath = path.join(__dirname, '../../contracts/artifacts/contracts/MultiversePrediction.sol/MultiversePrediction.json');
  if (fs.existsSync(artifactPath)) {
    const artifact = JSON.parse(fs.readFileSync(artifactPath));
    ABI = artifact.abi;
    console.log('Loaded ABI from artifacts');
  } else {
    // Fallback to abis directory
    const abiPath = path.join(__dirname, './abis/Prediction.json');
    if (fs.existsSync(abiPath)) {
      ABI = JSON.parse(fs.readFileSync(abiPath));
      console.log('Loaded ABI from abis directory');
    } else {
      throw new Error(`ABI file not found. Tried: ${artifactPath} and ${abiPath}`);
    }
  }
} catch (err) {
  console.error('Failed to load ABI:', err);
  process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC);

// Handle DATABASE_URL format - remove prisma+ prefix if present
let dbUrl = process.env.DATABASE_URL || '';
if (dbUrl.startsWith('prisma+')) {
  dbUrl = dbUrl.replace('prisma+', '');
  console.log('Converted Prisma DATABASE_URL to standard format');
}
const pool = new Pool({ connectionString: dbUrl });
const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Initialize contract with validation
let contract;
try {
  contract = new ethers.Contract(CONTRACT_ADDR, ABI, provider);
  console.log(`Contract initialized at address: ${CONTRACT_ADDR}`);
} catch (err) {
  console.error('Failed to initialize contract:', err);
  console.error('Contract address:', CONTRACT_ADDR);
  console.error('ABI length:', ABI ? ABI.length : 'null');
  process.exit(1);
}

// Helper to compute health: (collateral + outstandingLoan) / requiredCollateral
async function computeHealth(predictionId) {
  try {
    const pred = await contract.predictions(predictionId);
    const collateral = BigInt(pred.collateralAmount || 0);
    const loan = BigInt(pred.loanAmount || 0);
    
    if (collateral === 0n) return 0;
    
    // Required collateral = collateral + loan (for 1.5x ratio)
    const requiredCollateral = (collateral * 150n) / 100n;
    const totalValue = collateral + loan;
    const health = Number(totalValue * 10000n / requiredCollateral) / 100; // Convert to percentage
    
    return health;
  } catch (err) {
    console.error(`Failed to compute health for ${predictionId}:`, err);
    return 0;
  }
}

// Helper to fetch full prediction data from contract
async function fetchPredictionData(predictionId) {
  try {
    const pred = await contract.predictions(predictionId);
    return {
      id: predictionId.toString(),
      parentId: pred.parentId.toString() === '0' ? null : pred.parentId.toString(),
      creator: pred.creator,
      collateral: ethers.formatEther(pred.collateralAmount || 0),
      loanAmount: ethers.formatEther(pred.loanAmount || 0),
      leverageBps: pred.collateralizationRatio ? Number(pred.collateralizationRatio) : 0,
      deadline: Number(pred.deadline),
      resolved: pred.resolved,
      outcome: pred.outcome || null,
      liquidated: pred.liquidated || false,
      priceTarget: ethers.formatUnits(pred.priceTarget || 0, 8),
      priceFeed: pred.priceFeed
    };
  } catch (err) {
    console.error(`Failed to fetch prediction ${predictionId}:`, err);
    return null;
  }
}

// Helper to get current price from oracle
async function getCurrentPrice(priceFeedAddress) {
  try {
    const oracleAbi = [
      "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)"
    ];
    const oracle = new ethers.Contract(priceFeedAddress, oracleAbi, provider);
    const [, price] = await oracle.latestRoundData();
    return ethers.formatUnits(price, 8);
  } catch (err) {
    console.error(`Failed to get price from ${priceFeedAddress}:`, err);
    return '0';
  }
}

// Helper to upsert prediction
async function upsertPrediction(id, data) {
  const client = await pool.connect();
  try {
    const query = `INSERT INTO predictions (id, parent_id, creator, pool,
      collateral, loan_amount, leverage_bps, deadline, resolved, outcome, round_id,
      last_price, price_target, price_feed, liquidated, health, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now())
      ON CONFLICT (id) DO UPDATE SET parent_id = $2, creator=$3, pool=$4,
      collateral=$5, loan_amount=$6, leverage_bps=$7, deadline=$8, resolved=$9,
      outcome=$10, round_id=$11, last_price=$12, price_target=$13, price_feed=$14,
      liquidated=$15, health=$16, updated_at=now()`;
    // Normalize parentId: 0 for roots, actual ID for children
    const normalizedParentId = !data.parentId || data.parentId === '0' || data.parentId === 'null' || data.parentId === 0 ? 0 : data.parentId;
    
    const vals = [
      id,
      normalizedParentId,
      data.creator || null,
      data.pool || null,
      data.collateral || 0,
      data.loanAmount || 0,
      data.leverageBps || 0,
      data.deadline || 0,
      data.resolved || false,
      data.outcome || null,
      data.roundId || null,
      data.lastPrice || 0,
      data.priceTarget || null,
      data.priceFeed || null,
      data.liquidated || false,
      data.health || null
    ];
    await client.query(query, vals);
  } finally {
    client.release();
  }
}

// Periodic health check job
async function healthCheckJob() {
  console.log('Running health check job...');
  const client = await pool.connect();
  try {
    // Get all unresolved predictions
    const result = await client.query(
      'SELECT id, price_feed FROM predictions WHERE resolved = false'
    );
    
    for (const row of result.rows) {
      try {
        const predictionId = row.id;
        const priceFeed = row.price_feed;
        
        // Compute health
        const health = await computeHealth(predictionId);
        
        // Get current price
        const currentPrice = priceFeed ? await getCurrentPrice(priceFeed) : '0';
        
        // Update health and price
        await client.query(
          'UPDATE predictions SET health = $1, last_price = $2, updated_at = now() WHERE id = $3',
          [health, currentPrice, predictionId]
        );
        
        // Emit update event
        io.emit('prediction:update', {
          id: predictionId.toString(),
          data: {
            health,
            lastPrice: currentPrice
          }
        });
      } catch (err) {
        console.error(`Health check failed for prediction ${row.id}:`, err);
      }
    }
  } catch (err) {
    console.error('Health check job failed:', err);
  } finally {
    client.release();
  }
}

// Event handlers
async function initListeners() {
  console.log('Attaching contract listeners...');
  
  // PredictionCreated event: (predictionId, creator, parentId, collateral, loan)
  contract.on('PredictionCreated', async (predictionId, creator, parentId, collateral, loan, event) => {
    try {
      const id = predictionId.toString();
      console.log('PredictionCreated event:', { id, creator, parentId, collateral, loan });
      
      // Fetch full prediction data from contract
      const fullData = await fetchPredictionData(id);
      if (!fullData) {
        console.error(`Failed to fetch data for prediction ${id}`);
        return;
      }
      
      // Normalize parentId: ensure 0 for root predictions (null or 0 from contract)
      const normalizedParentId = !fullData.parentId || fullData.parentId === '0' || fullData.parentId === 'null' ? 0 : fullData.parentId;
      fullData.parentId = normalizedParentId;
      
      // Compute health
      const health = await computeHealth(id);
      fullData.health = health;
      
      // Get current price
      if (fullData.priceFeed) {
        fullData.lastPrice = await getCurrentPrice(fullData.priceFeed);
      }
      
      // Store in database (parentId will be 0 for roots, actual ID for children)
      await upsertPrediction(id, fullData);
      
      // Emit socket event
      io.emit('prediction:created', { id, data: fullData });
      console.log('PredictionCreated processed:', id);
    } catch (err) {
      console.error('Error processing PredictionCreated:', err);
    }
  });
  
  // PredictionResolved event: (predictionId, outcome)
  contract.on('PredictionResolved', async (predictionId, outcome, event) => {
    try {
      const id = predictionId.toString();
      console.log('PredictionResolved event:', { id, outcome });
      
      // Fetch full prediction data
      const fullData = await fetchPredictionData(id);
      if (!fullData) {
        console.error(`Failed to fetch data for prediction ${id}`);
        return;
      }
      
      fullData.resolved = true;
      fullData.outcome = outcome;
      
      // Get final price
      if (fullData.priceFeed) {
        fullData.lastPrice = await getCurrentPrice(fullData.priceFeed);
      }
      
      // Store in database
      await upsertPrediction(id, fullData);
      
      // Emit socket event
      io.emit('prediction:resolved', { id, data: fullData });
      console.log('PredictionResolved processed:', id, outcome);
    } catch (err) {
      console.error('Error processing PredictionResolved:', err);
    }
  });
  
  // Liquidation event: (predictionId, liquidator)
  contract.on('Liquidation', async (predictionId, liquidator, event) => {
    try {
      const id = predictionId.toString();
      console.log('Liquidation event:', { id, liquidator });
      
      const fullData = await fetchPredictionData(id);
      if (fullData) {
        fullData.liquidated = true;
        await upsertPrediction(id, fullData);
        io.emit('prediction:liquidated', { id, data: fullData });
      }
    } catch (err) {
      console.error('Error processing Liquidation:', err);
    }
  });
  
  // Start periodic health check (every 30 seconds)
  setInterval(healthCheckJob, 30000);
  console.log('Health check job started (runs every 30 seconds)');
}

// REST endpoint: get tree starting from root id
app.get('/predictions/root/:rootId', async (req, res) => {
  const rootId = req.params.rootId;
  const client = await pool.connect();
  try {
    // Recursive query (Postgres) to collect tree
    const q = `WITH RECURSIVE t AS (
      SELECT * FROM predictions WHERE id = $1
      UNION ALL
      SELECT p.* FROM predictions p JOIN t ON p.parent_id = t.id
    ) SELECT * FROM t ORDER BY id`;
    const r = await client.query(q, [rootId]);
    
    // Compute health for each node
    const nodesWithHealth = await Promise.all(
      r.rows.map(async (node) => {
        const health = await computeHealth(node.id);
        return { 
          ...node, 
          health,
          parent_id: node.parent_id || 0 // Normalize parent_id
        };
      })
    );
    
    res.json({ ok: true, nodes: nodesWithHealth });
  } catch (err) {
    console.error('Error fetching tree:', err);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    client.release();
  }
});

// REST endpoint: get all predictions for a creator
app.get('/predictions/creator/:creator', async (req, res) => {
  const creator = req.params.creator.toLowerCase();
  const client = await pool.connect();
  try {
    const q = `SELECT * FROM predictions WHERE LOWER(creator) = $1 ORDER BY created_at ASC`;
    const r = await client.query(q, [creator]);
    
    // Compute health for each node
    const predictionsWithHealth = await Promise.all(
      r.rows.map(async (node) => {
        const health = await computeHealth(node.id);
        return { 
          ...node, 
          health,
          parent_id: node.parent_id || 0 // Normalize parent_id to 0 for roots
        };
      })
    );
    
    res.json({ ok: true, predictions: predictionsWithHealth });
  } catch (err) {
    console.error('Error fetching creator predictions:', err);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    client.release();
  }
});

// Socket connection
io.on('connection', socket => {
  console.log('socket connected', socket.id);
  socket.on('subscribe', ({ rootId }) => {
    console.log('subscribe to', rootId);
    socket.join(`root:${rootId}`);
  });
});

async function start() {
  try {
    await pool.query('SELECT 1');
    console.log('Database connected');
    
    await initListeners();
    console.log('Event listeners initialized');
    
    server.listen(PORT, () => {
      console.log(`Indexer + socket.io running on ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start:', err);
    process.exit(1);
  }
}

start().catch(err => {
  console.error(err);
  process.exit(1);
});
