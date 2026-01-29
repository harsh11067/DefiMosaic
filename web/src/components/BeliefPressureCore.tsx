'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PredictionData {
  id: number;
  symbol: string;
  direction: 'up' | 'down';
  health: number;
  timeLeft: number; // seconds
  collateral: number;
  loan: number;
  opposingBranches: number;
  volatility: number; // 0-1
  winStreak: number;
}

interface BeliefPressureCoreProps {
  predictions: PredictionData[];
  onStateChange?: (state: 'stable' | 'compressed' | 'fracturing' | 'shattered') => void;
}

export default function BeliefPressureCore({ predictions, onStateChange }: BeliefPressureCoreProps) {
  const [cracks, setCracks] = useState<{ id: number; angle: number; length: number }[]>([]);
  const [pulseSpeed, setPulseSpeed] = useState(2);

  // Calculate pressure metrics
  const metrics = useMemo(() => {
    if (!predictions.length) return {
      pressure: 0,
      avgHealth: 150,
      totalOpposing: 0,
      avgVolatility: 0,
      totalWinStreak: 0,
      timeDecay: 0
    };

    const avgHealth = predictions.reduce((sum, p) => sum + p.health, 0) / predictions.length;
    const totalOpposing = predictions.reduce((sum, p) => sum + p.opposingBranches, 0);
    const avgVolatility = predictions.reduce((sum, p) => sum + p.volatility, 0) / predictions.length;
    const totalWinStreak = predictions.reduce((sum, p) => sum + p.winStreak, 0);

    // Time decay: closer to deadline = more pressure
    const avgTimeLeft = predictions.reduce((sum, p) => sum + p.timeLeft, 0) / predictions.length;
    const timeDecay = Math.max(0, 1 - (avgTimeLeft / (24 * 60 * 60))); // Normalize to 24h

    // Calculate overall pressure (0-100)
    const healthPressure = Math.max(0, (150 - avgHealth) / 50) * 30; // 0-30
    const opposingPressure = Math.min(totalOpposing * 10, 30); // 0-30
    const volatilityPressure = avgVolatility * 25; // 0-25
    const timePressure = timeDecay * 15; // 0-15

    const pressure = Math.min(100, healthPressure + opposingPressure + volatilityPressure + timePressure);

    return { pressure, avgHealth, totalOpposing, avgVolatility, totalWinStreak, timeDecay };
  }, [predictions]);

  // Determine state based on pressure
  const state = useMemo(() => {
    if (metrics.pressure < 25) return 'stable';
    if (metrics.pressure < 50) return 'compressed';
    if (metrics.pressure < 75) return 'fracturing';
    return 'shattered';
  }, [metrics.pressure]);

  // Notify parent of state changes
  useEffect(() => {
    onStateChange?.(state);
  }, [state, onStateChange]);

  // Add cracks when opposing branches increase
  useEffect(() => {
    if (metrics.totalOpposing > cracks.length) {
      const newCracks = Array.from({ length: metrics.totalOpposing - cracks.length }, (_, i) => ({
        id: Date.now() + i,
        angle: Math.random() * 360,
        length: 20 + Math.random() * 40
      }));
      setCracks(prev => [...prev, ...newCracks]);
    }
  }, [metrics.totalOpposing, cracks.length]);

  // Adjust pulse speed based on volatility
  useEffect(() => {
    const speed = Math.max(0.5, 2 - metrics.avgVolatility * 1.5);
    setPulseSpeed(speed);
  }, [metrics.avgVolatility]);

  // Core colors based on state
  const coreColors = {
    stable: { inner: '#10b981', outer: '#059669', glow: 'rgba(16, 185, 129, 0.4)' },
    compressed: { inner: '#f59e0b', outer: '#d97706', glow: 'rgba(245, 158, 11, 0.4)' },
    fracturing: { inner: '#ef4444', outer: '#dc2626', glow: 'rgba(239, 68, 68, 0.4)' },
    shattered: { inner: '#1f2937', outer: '#111827', glow: 'rgba(31, 41, 55, 0.2)' }
  };

  const colors = coreColors[state];

  // Core size based on time decay (shrinks as deadline approaches)
  const coreScale = 1 - (metrics.timeDecay * 0.3);

  // Win streak glow intensity
  const glowIntensity = Math.min(metrics.totalWinStreak * 0.1, 0.5);

  // Generate insight message
  const insightMessage = useMemo(() => {
    if (state === 'stable' && metrics.totalWinStreak > 0) {
      return `✨ Your belief is strong with a ${metrics.totalWinStreak}-win streak!`;
    }
    if (metrics.totalOpposing >= 2) {
      return `⚠️ Your belief is holding, but pressure is rising from ${metrics.totalOpposing} opposing branches.`;
    }
    if (metrics.avgVolatility > 0.7) {
      return `🌊 High volatility detected — core pulse accelerating.`;
    }
    if (metrics.timeDecay > 0.7) {
      return `⏳ Time pressure mounting — conviction shrinking.`;
    }
    if (state === 'fracturing') {
      return `🔴 Multiple pressure vectors detected — fractures forming.`;
    }
    if (state === 'shattered') {
      return `⚫ Conviction broken. Consider restructuring your chain.`;
    }
    return `🟢 Core stable. Belief holding steady.`;
  }, [state, metrics]);

  const stateLabels = {
    stable: { icon: '🟢', label: 'Stable Core', sublabel: 'Belief holding' },
    compressed: { icon: '🟡', label: 'Compressed', sublabel: 'Pressure rising' },
    fracturing: { icon: '🔴', label: 'Fracturing', sublabel: 'Branches conflicting' },
    shattered: { icon: '⚫', label: 'Shattered', sublabel: 'Conviction broken' }
  };

  return (
    <div className="relative flex flex-col items-center p-6 bg-gray-900/50 rounded-2xl border border-white/10 backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        {stateLabels[state].icon} Belief Pressure Core
      </h3>

      {/* Core Container */}
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Outer glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${colors.glow} 0%, transparent 70%)`,
            filter: `blur(${20 + glowIntensity * 30}px)`
          }}
          animate={{
            scale: [1, 1.1 + glowIntensity, 1],
            opacity: [0.5, 0.8, 0.5]
          }}
          transition={{
            duration: pulseSpeed,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />

        {/* Win streak halo */}
        {metrics.totalWinStreak > 0 && (
          <motion.div
            className="absolute inset-2 rounded-full"
            style={{
              border: `2px solid rgba(255, 215, 0, ${0.3 + glowIntensity})`,
              boxShadow: `0 0 ${10 + glowIntensity * 20}px rgba(255, 215, 0, ${glowIntensity})`
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          />
        )}

        {/* Main core orb */}
        <motion.div
          className="relative w-32 h-32 rounded-full"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${colors.inner}, ${colors.outer})`,
            boxShadow: `
              inset -10px -10px 30px rgba(0,0,0,0.4),
              inset 5px 5px 20px rgba(255,255,255,0.1),
              0 0 40px ${colors.glow}
            `
          }}
          animate={{
            scale: [coreScale, coreScale * 0.95, coreScale],
          }}
          transition={{
            duration: pulseSpeed,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        >
          {/* Fracture cracks */}
          <AnimatePresence>
            {state !== 'stable' && cracks.map((crack) => (
              <motion.div
                key={crack.id}
                className="absolute left-1/2 top-1/2 origin-left"
                style={{
                  transform: `rotate(${crack.angle}deg)`,
                  width: `${crack.length}%`,
                  height: '2px',
                  background: state === 'shattered'
                    ? 'rgba(255,255,255,0.3)'
                    : `linear-gradient(90deg, rgba(255,255,255,0.8), transparent)`
                }}
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: state === 'fracturing' || state === 'shattered' ? 1 : 0.3, scaleX: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              />
            ))}
          </AnimatePresence>

          {/* Inner glow pulse */}
          <motion.div
            className="absolute inset-4 rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)`
            }}
            animate={{
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{
              duration: pulseSpeed * 0.5,
              repeat: Infinity
            }}
          />

          {/* Pressure percentage */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-white/90 drop-shadow-lg">
              {Math.round(metrics.pressure)}%
            </span>
          </div>
        </motion.div>

        {/* Floating particles for shattered state */}
        {state === 'shattered' && (
          <>
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-gray-400 rounded-sm"
                style={{
                  left: '50%',
                  top: '50%'
                }}
                animate={{
                  x: [0, Math.cos(i * 45 * Math.PI / 180) * 60],
                  y: [0, Math.sin(i * 45 * Math.PI / 180) * 60],
                  opacity: [1, 0],
                  rotate: [0, 180]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.2
                }}
              />
            ))}
          </>
        )}
      </div>

      {/* State indicator */}
      <div className="mt-4 text-center">
        <div className="text-lg font-medium text-white">{stateLabels[state].label}</div>
        <div className="text-sm text-gray-400">{stateLabels[state].sublabel}</div>
      </div>

      {/* Insight message */}
      <motion.div
        className="mt-4 px-4 py-2 bg-gray-800/50 rounded-lg text-center max-w-xs"
        key={insightMessage}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <p className="text-sm text-gray-300 italic">"{insightMessage}"</p>
      </motion.div>

      {/* Metrics bar */}
      <div className="mt-4 w-full grid grid-cols-4 gap-2 text-xs">
        <div className="text-center">
          <div className="text-gray-400">Health</div>
          <div className={`font-medium ${metrics.avgHealth > 130 ? 'text-green-400' : metrics.avgHealth > 100 ? 'text-yellow-400' : 'text-red-400'}`}>
            {metrics.avgHealth.toFixed(0)}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">Opposing</div>
          <div className={`font-medium ${metrics.totalOpposing > 2 ? 'text-red-400' : metrics.totalOpposing > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
            {metrics.totalOpposing}
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">Volatility</div>
          <div className={`font-medium ${metrics.avgVolatility > 0.7 ? 'text-red-400' : metrics.avgVolatility > 0.4 ? 'text-yellow-400' : 'text-green-400'}`}>
            {(metrics.avgVolatility * 100).toFixed(0)}%
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-400">Streak</div>
          <div className={`font-medium ${metrics.totalWinStreak > 2 ? 'text-green-400' : 'text-gray-400'}`}>
            {metrics.totalWinStreak > 0 ? `+${metrics.totalWinStreak}` : '—'}
          </div>
        </div>
      </div>
    </div>
  );
}
