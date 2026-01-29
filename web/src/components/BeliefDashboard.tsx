'use client';

import { useMemo } from 'react';
import BeliefPressureCore from './BeliefPressureCore';
import ConvictionStack from './ConvictionStack';

interface PredictionData {
  id: number;
  symbol: string;
  direction: 'up' | 'down';
  health: number;
  timeLeft: number;
  collateral: number;
  loan: number;
  opposingBranches: number;
  volatility: number;
  winStreak: number;
  priceTarget: number;
  currentPrice?: number;
}

interface BeliefDashboardProps {
  predictions: PredictionData[];
  onPredictionClick?: (id: number) => void;
}

export default function BeliefDashboard({ predictions, onPredictionClick }: BeliefDashboardProps) {
  // Transform predictions for BeliefPressureCore
  const coreData = useMemo(() => {
    return predictions.map(p => ({
      id: p.id,
      symbol: p.symbol,
      direction: p.direction,
      health: p.health,
      timeLeft: p.timeLeft,
      collateral: p.collateral,
      loan: p.loan,
      opposingBranches: p.opposingBranches,
      volatility: p.volatility,
      winStreak: p.winStreak
    }));
  }, [predictions]);

  // Transform predictions for ConvictionStack
  const stackLayers = useMemo(() => {
    return predictions.map(p => {
      // Calculate strength based on health and collateral ratio
      const collateralRatio = p.collateral / (p.loan || 1);
      const healthFactor = p.health / 150; // Normalize to 150% as "healthy"
      const strength = Math.min(100, (collateralRatio * 50 + healthFactor * 50));

      // Determine status based on metrics
      let status: 'strong' | 'stable' | 'eroding' | 'collapsing';
      if (p.health < 110) {
        status = 'collapsing';
      } else if (p.health < 130 || p.volatility > 0.6) {
        status = 'eroding';
      } else if (p.health > 160 && p.volatility < 0.3) {
        status = 'strong';
      } else {
        status = 'stable';
      }

      return {
        id: p.id,
        symbol: p.symbol,
        direction: p.direction,
        strength,
        health: p.health,
        collateral: p.collateral,
        volatility: p.volatility,
        status
      };
    });
  }, [predictions]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Belief Pressure Core */}
      <BeliefPressureCore
        predictions={coreData}
        onStateChange={(state) => {
          console.log('Core state changed:', state);
        }}
      />

      {/* Conviction Stack */}
      <ConvictionStack
        layers={stackLayers}
        onLayerClick={(layer) => {
          onPredictionClick?.(layer.id);
        }}
      />
    </div>
  );
}
