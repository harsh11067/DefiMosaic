import requests
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import sys
import os

BINANCE_KLINES = 'https://api.binance.com/api/v3/klines'

def fetch_klines(symbol='ETHUSDT', interval='1h', limit=1000):
    res = requests.get(BINANCE_KLINES, params={'symbol': symbol, 'interval': interval, 'limit': limit})
    data = res.json()
    df = pd.DataFrame(data,
        columns=['openTime','open','high','low','close','volume','closeTime','qav','numTrades','takerBase','takerQuote','ignore'])
    df['open'] = df['open'].astype(float)
    df['close'] = df['close'].astype(float)
    df['high'] = df['high'].astype(float)
    df['low'] = df['low'].astype(float)
    df['volume'] = df['volume'].astype(float)
    df['time'] = pd.to_datetime(df['openTime'], unit='ms')
    return df[['time','open','high','low','close','volume']]

# Simple SMA crossover backtester
def backtest_sma(df, fast=20, slow=50, initial_cash=1000, slippage_pct=0.001, fee_bps=20, output_dir=None, timestamp=None):
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
        price = df.loc[i,'open']  # execute at next candle open
        
        # entry
        if prev_sig <= 0 and sig == 1:
            # buy with all cash
            size = cash / price
            slippage = price * slippage_pct
            exec_price = price + slippage
            fee = exec_price * size * (fee_bps/10000)
            position = size - (fee/exec_price)
            cash = 0
            trades.append({'time': df.loc[i,'time'], 'side':'buy','price':exec_price,'size':position, 'fee':fee})
        
        # exit
        if prev_sig >= 0 and sig == -1 and position > 0:
            exec_price = price - price * slippage_pct
            proceeds = position * exec_price
            fee = proceeds * (fee_bps/10000)
            cash = proceeds - fee
            trades.append({'time': df.loc[i,'time'],'side':'sell','price':exec_price,'size':position,'fee':fee})
            position = 0
        
        mark_price = (position * df.loc[i,'close']) + cash
        equity.append(mark_price)
    
    eq = pd.Series(equity).fillna(method='ffill')
    
    # Save equity curve
    plt.figure(figsize=(10,5))
    plt.plot(eq.index, eq.values)
    plt.title('Equity curve')
    plt.xlabel('Time')
    plt.ylabel('Equity ($)')
    plt.grid(True)
    
    if output_dir and timestamp:
        equity_file = os.path.join(output_dir, f'equity_{timestamp}.png')
        plt.savefig(equity_file)
        print(f'Saved {equity_file}')
    else:
        plt.savefig('equity.png')
        print('Saved equity.png')
    
    plt.close()
    
    # Save trades
    trades_df = pd.DataFrame(trades)
    if output_dir and timestamp:
        trades_file = os.path.join(output_dir, f'trades_{timestamp}.csv')
        trades_df.to_csv(trades_file, index=False)
        print(f'Saved {trades_file}')
    else:
        trades_df.to_csv('trades.csv', index=False)
        print('Saved trades.csv')
    
    return trades_df, eq

if __name__ == '__main__':
    sym = sys.argv[1] if len(sys.argv) > 1 else 'ETHUSDT'
    interval = sys.argv[2] if len(sys.argv) > 2 else '1h'
    fast = int(sys.argv[3]) if len(sys.argv) > 3 else 20
    slow = int(sys.argv[4]) if len(sys.argv) > 4 else 50
    output_dir = sys.argv[5] if len(sys.argv) > 5 else None
    timestamp = sys.argv[6] if len(sys.argv) > 6 else None
    
    df = fetch_klines(sym, interval, limit=1000)
    backtest_sma(df, fast=fast, slow=slow, output_dir=output_dir, timestamp=timestamp)
