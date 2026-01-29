'use client';

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ConvictionLayer {
  id: number;
  symbol: string;
  direction: 'up' | 'down';
  strength: number; // 0-100, based on health + collateral
  health: number;
  collateral: number;
  volatility: number; // Current volatility affecting this chain
  status: 'strong' | 'stable' | 'eroding' | 'collapsing';
}

interface ConvictionStackProps {
  layers: ConvictionLayer[];
  onLayerClick?: (layer: ConvictionLayer) => void;
}

export default function ConvictionStack({ layers, onLayerClick }: ConvictionStackProps) {
  // Sort layers by strength (strongest at bottom)
  const sortedLayers = useMemo(() => {
    return [...layers].sort((a, b) => b.strength - a.strength);
  }, [layers]);

  // Calculate total conviction
  const totalConviction = useMemo(() => {
    return layers.reduce((sum, l) => sum + l.strength, 0);
  }, [layers]);

  // Determine if portfolio is diversified or overconfident
  const diversificationScore = useMemo(() => {
    if (layers.length === 0) return 0;
    const maxStrength = Math.max(...layers.map(l => l.strength));
    const avgStrength = totalConviction / layers.length;
    // Higher score = more diversified, lower = overconfident in one position
    return layers.length > 1 ? (avgStrength / maxStrength) * 100 : 50;
  }, [layers, totalConviction]);

  // Generate insight message
  const insight = useMemo(() => {
    const erodingLayers = layers.filter(l => l.status === 'eroding' || l.status === 'collapsing');
    if (erodingLayers.length > 0) {
      const worst = erodingLayers[0];
      return `${worst.symbol} layer thinning — volatility eroding conviction.`;
    }
    if (diversificationScore < 40) {
      return `Overconfidence detected — consider diversifying your chains.`;
    }
    if (diversificationScore > 80) {
      return `Well diversified — conviction stack is balanced.`;
    }
    return `Stack stable — ${layers.length} active conviction layers.`;
  }, [layers, diversificationScore]);

  // Status colors and effects
  const getLayerStyle = (status: ConvictionLayer['status']) => {
    switch (status) {
      case 'strong':
        return {
          bg: 'bg-gradient-to-r from-green-600 to-green-500',
          border: 'border-green-400',
          glow: '0 0 15px rgba(34, 197, 94, 0.4)'
        };
      case 'stable':
        return {
          bg: 'bg-gradient-to-r from-blue-600 to-blue-500',
          border: 'border-blue-400',
          glow: '0 0 10px rgba(59, 130, 246, 0.3)'
        };
      case 'eroding':
        return {
          bg: 'bg-gradient-to-r from-yellow-600 to-orange-500',
          border: 'border-yellow-400',
          glow: '0 0 10px rgba(245, 158, 11, 0.3)'
        };
      case 'collapsing':
        return {
          bg: 'bg-gradient-to-r from-red-600 to-red-500',
          border: 'border-red-400',
          glow: '0 0 15px rgba(239, 68, 68, 0.4)'
        };
    }
  };

  // Calculate layer width as percentage (min 20%, max 100%)
  const getLayerWidth = (strength: number) => {
    return Math.max(20, Math.min(100, strength));
  };

  return (
    <div className="p-6 bg-gray-900/50 rounded-2xl border border-white/10 backdrop-blur-sm">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        ⛰️ Conviction Stack
      </h3>

      {/* Stack visualization */}
      <div className="relative space-y-1 mb-4">
        <AnimatePresence mode="popLayout">
          {sortedLayers.map((layer, index) => {
            const style = getLayerStyle(layer.status);
            const width = getLayerWidth(layer.strength);

            return (
              <motion.div
                key={layer.id}
                layout
                initial={{ opacity: 0, x: -50, scaleY: 0 }}
                animate={{
                  opacity: 1,
                  x: 0,
                  scaleY: 1,
                }}
                exit={{ opacity: 0, scaleY: 0, x: 50 }}
                transition={{
                  duration: 0.3,
                  delay: index * 0.05
                }}
                onClick={() => onLayerClick?.(layer)}
                className="relative cursor-pointer group"
              >
                {/* Layer bar */}
                <motion.div
                  className={`relative h-8 ${style.bg} ${style.border} border rounded-r-lg overflow-hidden`}
                  style={{
                    width: `${width}%`,
                    boxShadow: style.glow
                  }}
                  animate={layer.status === 'eroding' ? {
                    width: [`${width}%`, `${width - 2}%`, `${width}%`]
                  } : layer.status === 'collapsing' ? {
                    width: [`${width}%`, `${width - 5}%`, `${width}%`],
                    opacity: [1, 0.7, 1]
                  } : {}}
                  transition={layer.status !== 'strong' && layer.status !== 'stable' ? {
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  } : {}}
                  whileHover={{ scale: 1.02 }}
                >
                  {/* Erosion particles */}
                  {(layer.status === 'eroding' || layer.status === 'collapsing') && (
                    <div className="absolute right-0 top-0 bottom-0 w-8 overflow-hidden">
                      {[...Array(3)].map((_, i) => (
                        <motion.div
                          key={i}
                          className="absolute w-1 h-1 bg-white/50 rounded-full"
                          style={{
                            top: `${20 + i * 30}%`,
                            right: '0%'
                          }}
                          animate={{
                            x: [0, 20],
                            opacity: [1, 0],
                            y: [0, (i % 2 === 0 ? -1 : 1) * 10]
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            delay: i * 0.3
                          }}
                        />
                      ))}
                    </div>
                  )}

                  {/* Layer content */}
                  <div className="absolute inset-0 flex items-center justify-between px-3">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-bold text-sm">{layer.symbol}</span>
                      <span className="text-white/80 text-xs">
                        {layer.direction === 'up' ? '↑' : '↓'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-white/60 text-xs">
                        {layer.health.toFixed(0)}%
                      </span>
                      <span className="text-white/60 text-xs hidden group-hover:inline">
                        ${layer.collateral.toFixed(0)}
                      </span>
                    </div>
                  </div>

                  {/* Strength indicator blocks */}
                  <div
                    className="absolute bottom-0 left-0 h-1 bg-white/30"
                    style={{ width: `${layer.strength}%` }}
                  />
                </motion.div>

                {/* Status tooltip on hover */}
                <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {layer.status === 'strong' && '💪 Strong position'}
                    {layer.status === 'stable' && '✅ Stable'}
                    {layer.status === 'eroding' && '⚠️ Eroding'}
                    {layer.status === 'collapsing' && '🔴 Collapsing'}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Empty state */}
        {layers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No active prediction chains</p>
            <p className="text-sm mt-1">Create a prediction to build your conviction stack</p>
          </div>
        )}
      </div>

      {/* Legend */}
      {layers.length > 0 && (
        <div className="flex items-center justify-center gap-4 mb-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-sm" />
            <span className="text-gray-400">Strong</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-sm" />
            <span className="text-gray-400">Stable</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-yellow-500 rounded-sm" />
            <span className="text-gray-400">Eroding</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-sm" />
            <span className="text-gray-400">Collapsing</span>
          </div>
        </div>
      )}

      {/* Insight message */}
      {layers.length > 0 && (
        <motion.div
          className="px-4 py-2 bg-gray-800/50 rounded-lg text-center"
          key={insight}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <p className="text-sm text-gray-300 italic">"{insight}"</p>
        </motion.div>
      )}

      {/* Diversification meter */}
      {layers.length > 1 && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-400">Diversification</span>
            <span className={`font-medium ${diversificationScore > 70 ? 'text-green-400' :
                diversificationScore > 40 ? 'text-yellow-400' : 'text-red-400'
              }`}>
              {diversificationScore > 70 ? 'Balanced' : diversificationScore > 40 ? 'Moderate' : 'Overconfident'}
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${diversificationScore > 70 ? 'bg-green-500' :
                  diversificationScore > 40 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              initial={{ width: 0 }}
              animate={{ width: `${diversificationScore}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      )}

      {/* Total conviction summary */}
      {layers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700/50 flex justify-between text-sm">
          <span className="text-gray-400">Total Conviction</span>
          <span className="text-white font-medium">
            {totalConviction.toFixed(0)} / {layers.length * 100}
          </span>
        </div>
      )}
    </div>
  );
}
