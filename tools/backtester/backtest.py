import sys
import argparse
import json, os, uuid
import requests
import pandas as pd
import matplotlib.pyplot as plt

BINANCE_KLINES = 'https://api.binance.com/api/v3/klines'

# ---------- Argument parsing (supports OLD and NEW style) ----------
parser = argparse.ArgumentParser()
parser.add_argument("symbol")
parser.add_argument("--interval", default=None)
parser.add_argument("--fast", type=int, default=None)
parser.add_argument("--slow", type=int, default=None)
parser.add_argument("--prediction-id", default=None)
parser.add_argument("--out-dir", default=None)

args, unknown = parser.parse_known_args()

# OLD positional style support (used by your UI)
if len(unknown) >= 5:
    args.interval = unknown[0]
    args.fast = int(unknown[1])
    args.slow = int(unknown[2])
    args.out_dir = unknown[3]
    timestamp = unknown[4]
else:
    timestamp = None

# Defaults
args.interval = args.interval or "1h"
args.fast = args.fast or 20
args.slow = args.slow or 50
args.out_dir = args.out_dir or "output"


# ---------- Fetch candles ----------
def fetch_klines(symbol='ETHUSDT', interval='1h', limit=1000):
    res = requests.get(BINANCE_KLINES, params={
        'symbol': symbol,
        'interval': interval,
        'limit': limit
    })
    data = res.json()
    df = pd.DataFrame(data, columns=[
        'openTime','open','high','low','close','volume',
        'closeTime','qav','numTrades','takerBase','takerQuote','ignore'
    ])
    df['open'] = df['open'].astype(float)
    df['close'] = df['close'].astype(float)
    df['high'] = df['high'].astype(float)
    df['low'] = df['low'].astype(float)
    df['volume'] = df['volume'].astype(float)
    df['time'] = pd.to_datetime(df['openTime'], unit='ms')
    return df[['time','open','high','low','close','volume']]


# ---------- SMA Backtest ----------
def backtest_sma(df, fast=20, slow=50, initial_cash=1000, slippage_pct=0.001, fee_bps=20):
    df = df.copy().reset_index(drop=True)
    df['sma_fast'] = df['close'].rolling(fast).mean()
    df['sma_slow'] = df['close'].rolling(slow).mean()

    df['signal'] = 0
    df.loc[df['sma_fast'] > df['sma_slow'], 'signal'] = 1
    df.loc[df['sma_fast'] < df['sma_slow'], 'signal'] = -1

    cash = initial_cash
    position = 0.0
    equity = []
    trades = []

    for i in range(1, len(df)):
        prev_sig = df.loc[i-1,'signal']
        sig = df.loc[i,'signal']
        price = df.loc[i,'open']

        # BUY
        if prev_sig <= 0 and sig == 1:
            size = cash / price
            exec_price = price + (price * slippage_pct)
            fee = exec_price * size * (fee_bps/10000)
            position = size - (fee/exec_price)
            cash = 0
            trades.append({
                'time': df.loc[i,'time'],
                'side':'buy',
                'price':exec_price,
                'size':position,
                'fee':fee
            })

        # SELL
        if prev_sig >= 0 and sig == -1 and position > 0:
            exec_price = price - (price * slippage_pct)
            proceeds = position * exec_price
            fee = proceeds * (fee_bps/10000)
            cash = proceeds - fee
            trades.append({
                'time': df.loc[i,'time'],
                'side':'sell',
                'price':exec_price,
                'size':position,
                'fee':fee
            })
            position = 0

        mark_price = (position * df.loc[i,'close']) + cash
        equity.append(mark_price)

    eq = pd.Series(equity).ffill()
    return trades, eq


# ---------- Main ----------
if __name__ == "__main__":
    backtest_id = str(uuid.uuid4())
    out_dir = os.path.join(args.out_dir, backtest_id)
    os.makedirs(out_dir, exist_ok=True)

    df = fetch_klines(args.symbol, args.interval)
    trades, eq = backtest_sma(df, fast=args.fast, slow=args.slow)

    for t in trades:
        t["prediction_id"] = args.prediction_id or ""

    trades_df = pd.DataFrame(trades)

    # ---------- New style (for predictions feature) ----------
    csv_path = os.path.join(out_dir, "trades.csv")
    trades_df.to_csv(csv_path, index=False)

    plt.figure(figsize=(10,5))
    plt.plot(eq.index, eq.values)
    plt.savefig(os.path.join(out_dir, "equity.png"))
    plt.close()

    meta = {
        "backtest_id": backtest_id,
        "symbol": args.symbol,
        "interval": args.interval,
        "params": {"fast": args.fast, "slow": args.slow},
        "prediction_id": args.prediction_id,
        "csv_path": csv_path
    }

    with open(os.path.join(out_dir, "meta.json"), "w") as f:
        json.dump(meta, f)

    # ---------- Old style (for backtest UI page) ----------
    if timestamp:
        trades_old = os.path.join(args.out_dir, f"trades_{timestamp}.csv")
        equity_old = os.path.join(args.out_dir, f"equity_{timestamp}.png")

        trades_df.to_csv(trades_old, index=False)

        plt.figure(figsize=(10,5))
        plt.plot(eq.index, eq.values)
        plt.savefig(equity_old)
        plt.close()

    print("BACKTEST_OK", backtest_id)
