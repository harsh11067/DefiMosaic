// components/AllocationChart.js
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function AllocationChart({ data, childBets = [] }) {
  if (!data || !data.allocations) return null;
  const chartData = data.allocations.map(a => ({
    name: `${a.name || a.strategyId} (${a.percent}%)`,
    value: a.percent,
    color: a.color
  }));

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-3">AI Portfolio Allocation</h2>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie dataKey="value" data={chartData} innerRadius={80} outerRadius={120}>
            {chartData.map((entry, idx) => (
              <Cell key={`cell-${idx}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {childBets.length > 0 && (
        <div className="mt-6 border-t pt-3">
          <h3 className="font-semibold mb-2">AI Child Bet Suggestions</h3>
          <ul className="space-y-2">
            {childBets.map((c, i) => (
              <li key={i} className="text-sm">
                <b>{c.parentStrategyId}</b> → Leverage {xToMult(c.leverageBPS)}× for {c.sizePercent}% of position 
                <em className="text-gray-600">{c.rationale}</em>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function xToMult(bps) {
  return (bps / 1000).toFixed(1);
}
