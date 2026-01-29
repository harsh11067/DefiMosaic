'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { LinkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import PredictionGraph from './PredictionGraph';

interface PredictionNode {
  id: number;
  parentId: number;
  creator: string;
  collateral: string;
  loanAmount: string;
  targetPrice: string;
  deadline: number;
  status: 'active' | 'resolved' | 'liquidated';
  leverageBps: number;
  createdAt: string;
  outcome?: boolean;
  health?: number;
  children?: PredictionNode[];
}

interface PredictionTreeNodeProps {
  node: PredictionNode;
  contractAddress?: string;
  publicClient?: any;
  onBranchClick: (node: PredictionNode) => void;
  level?: number;
}

// Helper functions
const formatPriceTarget = (pt: string | number): string => {
  try {
    const num = typeof pt === 'string' ? parseFloat(pt) : pt;
    return (num / 1e8).toFixed(2);
  } catch {
    return 'N/A';
  }
};

const formatAmount = (amt: string | number): string => {
  try {
    const num = typeof amt === 'string' ? parseFloat(amt) : amt;
    return (num / 1e18).toFixed(4);
  } catch {
    return '0.0000';
  }
};

const formatDate = (timestamp: number): string => {
  try {
    return new Date(timestamp * 1000).toLocaleString();
  } catch {
    return 'N/A';
  }
};

// Recursive component to render tree
export default function PredictionTreeNode({ 
  node, 
  contractAddress, 
  publicClient, 
  onBranchClick,
  level = 0 
}: PredictionTreeNodeProps) {
  const isRoot = node.parentId === 0;
  const isActive = node.status === 'active';
  const hasAvailableLoan = parseFloat(node.loanAmount) > 0;
  const canBranch = isActive && hasAvailableLoan;

  // Get all descendants for graph
  const getAllDescendants = (n: PredictionNode): PredictionNode[] => {
    const descendants: PredictionNode[] = [];
    if (n.children) {
      n.children.forEach(child => {
        descendants.push(child);
        descendants.push(...getAllDescendants(child));
      });
    }
    return descendants;
  };

  const allNodes = [node, ...getAllDescendants(node)];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: level * 0.1 }}
      className={`bg-white/5 rounded-lg p-4 border border-white/10 ${isRoot ? 'mb-6' : 'mb-4'}`}
      style={{ marginLeft: level * 20 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-lg font-semibold ${isRoot ? 'text-purple-300' : 'text-white'}`}>
              {isRoot ? 'Root' : 'Chain'} #{node.id}
            </span>
            {!isRoot && (
              <span className="text-xs text-gray-400">(Parent: {node.parentId})</span>
            )}
            <span className={`text-xs px-2 py-0.5 rounded ${
              node.status === 'active' ? 'bg-yellow-500/20 text-yellow-400' :
              node.status === 'resolved' ? (node.outcome ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400') :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {node.status.toUpperCase()}
            </span>
          </div>
          <div className="text-sm text-gray-400">
            Target: ${formatPriceTarget(node.targetPrice)}
          </div>
        </div>
        {canBranch && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onBranchClick(node)}
            className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-2 text-sm ${
              isRoot 
                ? 'bg-purple-600/20 text-purple-300 hover:bg-purple-600/30' 
                : 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/30'
            }`}
          >
            <LinkIcon className="h-4 w-4" />
            Branch Chain
          </motion.button>
        )}
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Collateral</div>
          <div className="text-lg font-semibold text-white">
            {formatAmount(node.collateral)} MATIC
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Loan</div>
          <div className="text-lg font-semibold text-purple-400">
            {formatAmount(node.loanAmount)} MATIC
          </div>
        </div>
        <div className="bg-white/5 rounded-lg p-3">
          <div className="text-xs text-gray-400 mb-1">Health</div>
          <div className={`text-lg font-semibold ${
            node.health ? (node.health > 150 ? 'text-green-400' : node.health > 100 ? 'text-yellow-400' : 'text-red-400') : 'text-gray-400'
          }`}>
            {node.health ? `${node.health.toFixed(1)}%` : 'N/A'}
          </div>
        </div>
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 mb-4">
        <div>
          <span className="text-gray-500">Leverage: </span>
          <span className="text-white">{(node.leverageBps / 100).toFixed(0)}%</span>
        </div>
        <div>
          <span className="text-gray-500">Deadline: </span>
          <span className="text-white">{formatDate(node.deadline)}</span>
        </div>
      </div>

      {/* Graph View (only for root) */}
      {isRoot && allNodes.length > 1 && (
        <div className="border-t border-white/10 pt-4 mt-4">
          <PredictionGraph 
            rootId={node.id} 
            contractAddress={contractAddress}
            publicClient={publicClient}
            chains={allNodes.map(n => ({
              id: n.id,
              parentId: n.parentId,
              priceTarget: BigInt(n.targetPrice),
              deadline: BigInt(n.deadline),
              collateral: BigInt(n.collateral),
              loan: BigInt(n.loanAmount),
              resolved: n.status === 'resolved',
              outcome: n.outcome || false,
              liquidated: n.status === 'liquidated',
              children: n.children?.map(c => c.id) || []
            }))}
          />
        </div>
      )}

      {/* Children */}
      {node.children && node.children.length > 0 && (
        <div className="border-t border-white/10 pt-4 mt-4">
          <div className="text-sm text-gray-400 mb-3">
            Child Chains ({node.children.length}):
          </div>
          <div className="space-y-3">
            {node.children.map((child) => (
              <PredictionTreeNode
                key={child.id}
                node={child}
                contractAddress={contractAddress}
                publicClient={publicClient}
                onBranchClick={onBranchClick}
                level={level + 1}
              />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

