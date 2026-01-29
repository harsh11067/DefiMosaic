# tools/backtester/backtest.py (snippet)
import argparse, json, os, uuid

parser = argparse.ArgumentParser()
parser.add_argument("symbol")
parser.add_argument("--interval", default="1h")
parser.add_argument("--fast", type=int, default=20)
parser.add_argument("--slow", type=int, default=50)
parser.add_argument("--prediction-id", default=None)  # NEW
parser.add_argument("--out-dir", default="output")
args = parser.parse_args()

backtest_id = str(uuid.uuid4())
out_dir = os.path.join(args.out_dir, backtest_id)
os.makedirs(out_dir, exist_ok=True)
# ... run your backtest, generate trades list ...
# each trade row should include prediction_id:
for trade in trades:
    trade["prediction_id"] = args.prediction_id or ""
# write CSV
csv_path = os.path.join(out_dir, "trades.csv")
# write your CSV (pandas or csv)
import pandas as pd
pd.DataFrame(trades).to_csv(csv_path, index=False)

# write meta
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
print("BACKTEST_OK", backtest_id)
