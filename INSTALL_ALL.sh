#!/bin/bash

echo "========================================"
echo "DefiMosaic - Complete Installation"
echo "========================================"
echo ""

echo "[1/5] Installing Python dependencies..."
cd tools/backtester
if ! command -v python3 &> /dev/null; then
    echo "ERROR: Python 3 is not installed"
    echo "Please install Python 3.8+ from https://www.python.org/"
    exit 1
fi
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "WARNING: Python dependencies installation failed"
    echo "Trying pip..."
    pip install -r requirements.txt
fi
cd ../..
echo ""

echo "[2/5] Installing web frontend dependencies..."
cd web
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install web dependencies"
    exit 1
fi
cd ..
echo ""

echo "[3/5] Installing indexer service dependencies..."
cd services/indexer
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install indexer dependencies"
    exit 1
fi
cd ../..
echo ""

echo "[4/5] Installing contract dependencies..."
cd contracts
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install contract dependencies"
    exit 1
fi
cd ..
echo ""

echo "[5/5] Installing root dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "WARNING: Root dependencies installation failed (may not be required)"
fi
echo ""

echo "========================================"
echo "Installation Complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Set up environment variables (see INSTALL_AND_DEPLOY.md)"
echo "2. Deploy contracts: cd contracts && npm run deploy:amoy"
echo "3. Start indexer: cd services/indexer && npm start"
echo "4. Start web: cd web && npm run dev"
echo ""

