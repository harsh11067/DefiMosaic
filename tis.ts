// inside Node Details modal (below status)
<button
  className="mt-3 px-4 py-2 bg-blue-600 text-white rounded"
onClick = { async() => {
  const payload = {
    symbol: selectedNode.data.priceSymbol || "ETHUSDT", // ensure prediction stores symbol
    interval: "1h",
    fast: 20,
    slow: 50,
    predictionId: selectedNode.data.id  // pass node id here
  };
  const res = await fetch('/api/backtest/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const json = await res.json();
  if (json.ok) {
    alert('Backtest started: ' + (json.backtestId || 'check artifacts'));
    // optionally auto-refresh heatmap
    await fetchHeatmapAndApply(json.backtestId || null); // implement below
  } else {
    alert('Backtest failed: ' + json.error);
  }
}}
>
  ▶ Run Backtest for this Node
  </button>
