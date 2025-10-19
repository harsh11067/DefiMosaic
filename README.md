🧠 DefiMosaic

⚡ “Where DeFi meets AI. Predict, Earn, and Grow — intelligently.”

🪩 Overview

It allows users to:

Create and join on-chain betting pools on crypto price movements

Use AI-powered portfolio management to diversify holdings by risk

Earn yield from AI-recommended DeFi strategies

Experience gamified “branching bets” where winnings can fund new bets — compounding results

Use native POL or USDC for participation (Polygon Amoy testnet supported)

✨ Core Features
Category	Description
🤖 AI-Driven Strategy	Uses OpenAI’s function calling + real yield data to recommend risk-balanced DeFi allocations.
🎲 Prediction Markets	Create or join pools predicting crypto price direction (up/down) for a set time (e.g., 1 hour).
🔁 Branching Bets	Leverage up to 80 % of initial capital into child bets — a self-sustaining compounding system.
🧩 Dual-Asset Support	Supports both USDC & native POL (MATIC) pools for flexible staking.
📈 Real-Time Market Feeds	Integrated mock or live Chainlink AggregatorV3 price data for ETH, BTC, etc.
🧮 Portfolio AI Allocation	Allocates across Stable Crypto, Mutual Funds, Stocks, and Growing Crypto sectors.
💬 AI Chatbot	In-app assistant explaining yield rationale and investment strategy logic.
🧰 Tech Stack
🪶 Frontend

Next.js 14 (App Router)

TypeScript

Tailwind CSS + Framer Motion

Recharts for real-time price & allocation charts

Wagmi + RainbowKit for wallet integration

OpenAI API (Function Calling) for structured reasoning

⚙️ Backend / Smart Contracts

Solidity 0.8.x

Hardhat

OpenZeppelin ERC-1155 (fractionalized pool tokens)

MockV3Aggregator for test price feeds

Polygon Amoy network deployment

🧩 Smart Contracts
Contract	Purpose
BetPoolFactory.sol	Deploys & tracks all betting pools.
BetPool.sol	Individual pool logic, deposits, branching bets, and claims.
MockV3Aggregator.sol	Mock price feed for testing.
StrategyAI.sol (optional)	Interfaces with off-chain AI recommender.
🚀 Deployment
1️⃣ Setup Environment
npm install
npx hardhat compile


Create .env:

PRIVATE_KEY=your_private_key
POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology

2️⃣ Deploy Contracts
npx hardhat run scripts/deploy.js --network polygon_amoy

3️⃣ Update Frontend

Add the deployed BetPoolFactory address to your config:

export const FACTORY_ADDRESS = "0xYourDeployedAddress";

🧠 AI Strategy Logic

The AI recommends allocation across four key sectors based on wallet balance & risk appetite:

Color	Category	Example Assets
🟦 Blue	Stable Crypto	Bitcoin, Ethereum
🟪 Purple	Mutual Funds	Equity & thematic DeFi baskets
🟧 Orange	Stocks	Tech & emerging-market equities
🟩 Green	Growing Crypto	Altcoins, early blockchain tokens

It uses a JSON schema for structured output:

{
  "allocation": {
    "stable": 40,
    "mutual_funds": 20,
    "stocks": 25,
    "growing_crypto": 15
  },
  "rationale": "Balanced yield with moderate risk exposure."
}

💸 Creating a Pool (POL or USDC)

Connect wallet (Polygon Amoy).

Choose Pool Type → USDC or POL (MATIC).

Set Price Target & Duration (1 hour fixed).

Enter Amount (e.g., 0.01 MATIC).

Click Create Pool → confirm transaction in wallet.

Track live price and result after time window closes.

🧪 Testing
npx hardhat test


Includes:

Deposit & pool creation

Child bet branching

Resolution via mock aggregator

Claim flow

🧭 Roadmap

 Add real Chainlink price feeds

 Expand branching leverage logic

 Integrate AI-based yield farming engine

 Launch leaderboard & reward NFTs

 Deploy to Polygon mainnet

🧑‍💻 Developed By

Solo Developer — Hackathon Submission 2025
Built with ❤️ using AI + DeFi + Polygon
