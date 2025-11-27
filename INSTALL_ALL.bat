@echo off
echo ========================================
echo DefiMosaic - Complete Installation
echo ========================================
echo.

echo [1/5] Installing Python dependencies...
cd tools\backtester
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python 3.8+ from https://www.python.org/
    pause
    exit /b 1
)
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo WARNING: Python dependencies installation failed
    echo Trying pip3...
    python3 -m pip install -r requirements.txt
)
cd ..\..
echo.

echo [2/5] Installing web frontend dependencies...
cd web
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install web dependencies
    pause
    exit /b 1
)
cd ..
echo.

echo [3/5] Installing indexer service dependencies...
cd services\indexer
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install indexer dependencies
    pause
    exit /b 1
)
cd ..\..
echo.

echo [4/5] Installing contract dependencies...
cd contracts
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Failed to install contract dependencies
    pause
    exit /b 1
)
cd ..
echo.

echo [5/5] Installing root dependencies...
call npm install
if %errorlevel% neq 0 (
    echo WARNING: Root dependencies installation failed (may not be required)
)
echo.

echo ========================================
echo Installation Complete!
echo ========================================
echo.
echo Next steps:
echo 1. Set up environment variables (see INSTALL_AND_DEPLOY.md)
echo 2. Deploy contracts: cd contracts && npm run deploy:amoy
echo 3. Start indexer: cd services\indexer && npm start
echo 4. Start web: cd web && npm run dev
echo.
pause

