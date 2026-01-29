'use client';
import { useState } from 'react';

interface StrategyAnalysis {
  summary: string;
  riskLevel: 'Low' | 'Medium' | 'High';
  strengths: string[];
  weaknesses: string[];
  suggestions: Array<{
    title: string;
    rationale: string;
    parameterChanges: Record<string, any>;
  }>;
  confidenceScore: number;
}

interface StrategyCopilotPanelProps {
  payload: any;
  onApply: (changes: Record<string, any>) => void;
}

export default function StrategyCopilotPanel({ payload, onApply }: StrategyCopilotPanelProps) {
  const [analysis, setAnalysis] = useState<StrategyAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const runCopilot = async () => {
    const res = await fetch("/api/strategy/copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    setAnalysis(data.analysis);
  };

  return (
    <div className="p-4 border rounded-xl bg-black/30">
      <button onClick={runCopilot} className="btn-primary">
        🤖 Analyze Strategy
      </button>

      {analysis && (
        <div className="mt-4 space-y-3">
          <p>{analysis.summary}</p>

          <p>⚠️ Risk: <b>{analysis.riskLevel}</b></p>

          <div>
            <h4>✅ Strengths</h4>
            <ul>{analysis.strengths.map(s => <li key={s}>{s}</li>)}</ul>
          </div>

          <div>
            <h4>❌ Weaknesses</h4>
            <ul>{analysis.weaknesses.map(w => <li key={w}>{w}</li>)}</ul>
          </div>

          <div>
            <h4>🛠 Suggestions</h4>
            {analysis.suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onApply(s.parameterChanges)}
                className="btn-secondary block w-full mt-2"
              >
                Apply: {s.title}
              </button>
            ))}
          </div>

          <p className="text-sm opacity-70">
            Confidence: {(analysis.confidenceScore * 100).toFixed(0)}%
          </p>
        </div>
      )}
    </div>
  );
}
