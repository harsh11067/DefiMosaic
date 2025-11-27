#!/bin/bash

echo "🚀 Deploying DefiMosaic to Polygon Amoy..."

# Install Python dependencies
echo "📦 Installing Python dependencies..."
cd tools/backtester
pip install -r requirements.txt || pip3 install -r requirements.txt
cd ../..

# Install Node.js dependencies
echo "📦 Installing web dependencies..."
cd web
npm install
cd ..

echo "📦 Installing indexer dependencies..."
cd services/indexer
npm install
cd ../..

echo "📦 Installing contract dependencies..."
cd contracts
npm install
cd ..

# Deploy contracts
echo "📝 Deploying contracts to Polygon Amoy..."
cd contracts
npm run deploy:amoy
cd ..

echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Update contract addresses in web/src/config/contracts.json"
echo "2. Set up environment variables (see INSTALL_AND_DEPLOY.md)"
echo "3. Start indexer: cd services/indexer && npm start"
echo "4. Start web: cd web && npm run dev"

