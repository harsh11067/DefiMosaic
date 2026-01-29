async function fetchHeatmapAndApply(backtestId) {
  try {
    const res = await fetch('/api/predictions/heatmap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backtestId, nodes: nodes.map(n => ({ id: n.id, health: n.data.health })) })
    });
    const json = await res.json();
    if (json.ok) {
      const metrics = json.metrics;
      setNodes(ns => ns.map(n => {
        const m = metrics[n.id];
        if (!m) return n;
        const color = m.riskScore < 0.33 ? '#10b981' : m.riskScore < 0.66 ? '#f59e0b' : '#ef4444';
        return {
          ...n,
          data: { ...n.data, riskScore: m.riskScore, realizedProfit: m.realizedProfit, realizedLoss: m.realizedLoss },
          style: { ...n.style, border: `3px solid ${color}` }
        };
      }));
    } else {
      console.warn('heatmap failed', json.error);
    }
  } catch (err) {
    console.error(err);
  }
}
