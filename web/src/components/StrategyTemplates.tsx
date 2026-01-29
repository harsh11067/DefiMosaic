'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DocumentDuplicateIcon, SparklesIcon } from '@heroicons/react/24/outline';

// Badge display component
function StrategyBadge({ emoji, name }: { emoji: string; name: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs"
      title={name}
    >
      {emoji}
    </span>
  );
}

interface StrategyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  config: {
    entryRule: string;
    exitRule: string;
    leverage: string;
    assets: string[];
    params?: Record<string, any>;
  };
  feeBPS: number;
  creatorBadges?: { emoji: string; name: string }[]; // Badges earned by creator
}

const STRATEGY_TEMPLATES: StrategyTemplate[] = [
  {
    id: 'btcusdt_momentum',
    name: 'BTCUSDT Momentum',
    description: 'SMA cross strategy with fast/slow moving averages, position sizing by volatility',
    category: 'Momentum',
    config: {
      entryRule: 'If price above 20-day EMA',
      exitRule: 'If price drops below 20-day EMA',
      leverage: '2x',
      assets: ['BTCUSDT'],
      params: {
        fastSMA: 12,
        slowSMA: 26,
        stopLoss: 5,
        takeProfit: 10
      }
    },
    feeBPS: 200,
    creatorBadges: [
      { emoji: '🎯', name: 'Accuracy King' },
      { emoji: '⛓️', name: 'Chain Master' }
    ]
  },
  {
    id: 'defi_bluechips',
    name: 'DeFi Bluechips Basket',
    description: 'Buy/hold top 5 DeFi tokens weighted by TVL, rebalance weekly',
    category: 'Portfolio',
    config: {
      entryRule: 'Equal allocation, rebalance monthly',
      exitRule: 'Sell on 20% drawdown',
      leverage: '1.5x',
      assets: ['UNI', 'AAVE', 'COMP', 'MKR', 'SNX'],
      params: {
        rebalancePeriod: 'weekly',
        maxDrawdown: 20,
        tvlWeighted: true
      }
    },
    feeBPS: 150,
    creatorBadges: [
      { emoji: '🐋', name: 'Whale Strategist' },
      { emoji: '⭐', name: 'Community Favorite' }
    ]
  },
  {
    id: 'mean_reversion_btc',
    name: 'Mean Reversion BTC',
    description: 'RSI oversold/overbought entries with stop-loss',
    category: 'Mean Reversion',
    config: {
      entryRule: 'RSI < 30 (oversold)',
      exitRule: 'RSI > 70 (overbought) or stop-loss',
      leverage: '1x',
      assets: ['BTCUSDT'],
      params: {
        rsiPeriod: 14,
        oversold: 30,
        overbought: 70,
        stopLoss: 3
      }
    },
    feeBPS: 250,
    creatorBadges: [
      { emoji: '🛡️', name: 'Risk Manager' }
    ]
  },
  {
    id: 'volatility_harvest',
    name: 'Volatility Harvest',
    description: 'Short volatility on options or delta-hedged yield (advanced)',
    category: 'Advanced',
    config: {
      entryRule: 'High IV rank > 70',
      exitRule: 'IV rank < 30 or profit target',
      leverage: '3x',
      assets: ['ETH', 'BTC'],
      params: {
        ivRankThreshold: 70,
        profitTarget: 20,
        maxLoss: 15
      }
    },
    feeBPS: 300
  },
  {
    id: 'stable_income',
    name: 'Stable Income',
    description: 'Allocate to Aave/Compound stable pools, auto-harvest to vault',
    category: 'Yield',
    config: {
      entryRule: 'Deposit to stable pools',
      exitRule: 'Withdraw on emergency or rebalance',
      leverage: '1x',
      assets: ['USDC', 'USDT', 'DAI'],
      params: {
        platforms: ['Aave', 'Compound'],
        autoHarvest: true,
        minAPY: 5
      }
    },
    feeBPS: 100,
    creatorBadges: [
      { emoji: '💎', name: 'Diamond Hands' },
      { emoji: '🛡️', name: 'Risk Manager' }
    ]
  }
];

interface StrategyTemplatesProps {
  onFork?: (template: StrategyTemplate) => void;
  onCreateStrategy?: (name: string, description: string, feeBPS: number) => Promise<void>;
}

export default function StrategyTemplates({ onFork, onCreateStrategy }: StrategyTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<StrategyTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [editedTemplate, setEditedTemplate] = useState<StrategyTemplate | null>(null);

  const handleFork = (template: StrategyTemplate) => {
    setSelectedTemplate(template);
    setEditedTemplate({ ...template, name: `${template.name} (Forked)` });
    setShowEditor(true);
  };

  const handleCreate = async () => {
    if (!editedTemplate) return;

    if (onCreateStrategy) {
      // Use the actual create strategy function
      try {
        await onCreateStrategy(editedTemplate.name, editedTemplate.description, editedTemplate.feeBPS);
        setShowEditor(false);
        setSelectedTemplate(null);
        setEditedTemplate(null);
      } catch (error) {
        console.error('Failed to create strategy:', error);
        alert('Failed to create strategy. Please try again.');
      }
    } else if (onFork) {
      // Fallback to onFork if onCreateStrategy not provided
      onFork(editedTemplate);
      setShowEditor(false);
      setSelectedTemplate(null);
    }
  };

  if (showEditor && editedTemplate) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10"
      >
        <h3 className="text-2xl font-bold text-white mb-4">Fork Strategy: {selectedTemplate?.name}</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Strategy Name</label>
            <input
              type="text"
              value={editedTemplate.name}
              onChange={(e) => setEditedTemplate({ ...editedTemplate, name: e.target.value })}
              className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Description</label>
            <textarea
              value={editedTemplate.description}
              onChange={(e) => setEditedTemplate({ ...editedTemplate, description: e.target.value })}
              className="w-full bg-transparent border border-white/20 rounded px-3 py-2 text-white"
              rows={3}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Fee ({editedTemplate.feeBPS / 100}%)</label>
            <input
              type="range"
              min="0"
              max="2000"
              step="100"
              value={editedTemplate.feeBPS}
              onChange={(e) => setEditedTemplate({ ...editedTemplate, feeBPS: parseInt(e.target.value) })}
              className="w-full"
            />
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Strategy Configuration</h4>
            <div className="space-y-2 text-xs text-gray-400">
              <div><strong>Entry:</strong> {editedTemplate.config.entryRule}</div>
              <div><strong>Exit:</strong> {editedTemplate.config.exitRule}</div>
              <div><strong>Leverage:</strong> {editedTemplate.config.leverage}</div>
              <div><strong>Assets:</strong> {editedTemplate.config.assets.join(', ')}</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg"
            >
              Create Strategy
            </button>
            <button
              onClick={() => {
                setShowEditor(false);
                setSelectedTemplate(null);
              }}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <SparklesIcon className="h-6 w-6 text-purple-400" />
        <h2 className="text-2xl font-bold text-white">Strategy Templates</h2>
      </div>
      <p className="text-gray-400">Fork a template to get started quickly</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {STRATEGY_TEMPLATES.map((template) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl p-6 border border-white/10 hover:border-purple-500/50 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{template.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-purple-400">{template.category}</span>
                  {template.creatorBadges && template.creatorBadges.length > 0 && (
                    <div className="flex gap-1">
                      {template.creatorBadges.map((badge, idx) => (
                        <StrategyBadge key={idx} emoji={badge.emoji} name={badge.name} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-4">{template.description}</p>

            <div className="space-y-2 mb-4 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Entry:</span>
                <span className="text-gray-300">{template.config.entryRule}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Exit:</span>
                <span className="text-gray-300">{template.config.exitRule}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Leverage:</span>
                <span className="text-purple-400">{template.config.leverage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Fee:</span>
                <span className="text-gray-300">{(template.feeBPS / 100).toFixed(2)}%</span>
              </div>
            </div>

            <button
              onClick={() => handleFork(template)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all"
            >
              <DocumentDuplicateIcon className="h-5 w-5" />
              Fork Template
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

