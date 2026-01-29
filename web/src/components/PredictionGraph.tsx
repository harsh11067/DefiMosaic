'use client';
import React, { useEffect, useState, useRef } from 'react';
import ReactFlow, {
  MiniMap, Controls, Background, Node, Edge, Handle, Position,
  NodeProps, MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { ClockIcon, CurrencyDollarIcon, ChartBarIcon } from '@heroicons/react/24/outline';

// Removed global dagreGraph - using local instances in layoutNodes

// Custom Node Component with Health Bar, Countdown, and Sparkline
function PredictionNode({ data }: NodeProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const health = data.health || 0;
  const riskScore = data.riskScore; // From heatmap if available
  const deadline = data.deadline;
  const collateral = parseFloat(data.collateral || 0);
  const loanAmount = parseFloat(data.loanAmount || 0);
  const leverage = data.leverageBps ? (data.leverageBps / 100) : 0;

  useEffect(() => {
    if (!deadline) return;

    const updateCountdown = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Number(deadline) - now;

      if (remaining <= 0) {
        setTimeRemaining('Expired');
        return;
      }

      const days = Math.floor(remaining / 86400);
      const hours = Math.floor((remaining % 86400) / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}m`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);
    return () => clearInterval(interval);
  }, [deadline]);

  // Use risk score for color if available (heatmap mode), otherwise use health
  let borderColor: string;
  if (riskScore !== undefined) {
    // Heatmap mode: color by risk score
    borderColor = riskScore < 0.33 ? '#10b981' : riskScore < 0.66 ? '#f59e0b' : '#ef4444';
  } else {
    // Normal mode: color by health
    borderColor = health >= 150 ? '#10b981' : health >= 120 ? '#f59e0b' : '#ef4444';
  }

  const healthColor = health >= 150 ? '#10b981' : health >= 120 ? '#f59e0b' : '#ef4444';
  const healthPercent = Math.min(100, Math.max(0, (health / 150) * 100));

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg border-2 shadow-lg min-w-[240px]"
      style={{ borderColor: data.resolved ? (data.outcome ? '#10b981' : '#ef4444') : borderColor }}
    >
      <Handle type="target" position={Position.Top} />

      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-lg font-bold text-white">#{data.id}</h3>
            {data.resolved && (
              <span className={`text-xs px-2 py-1 rounded ${data.outcome ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                {data.outcome ? 'Won' : 'Lost'}
              </span>
            )}
            {data.liquidated && (
              <span className="text-xs px-2 py-1 rounded bg-gray-500/20 text-gray-400 ml-1">
                Liquidated
              </span>
            )}
          </div>
        </div>

        {/* Health Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">Health</span>
            <span className="text-xs font-semibold" style={{ color: healthColor }}>
              {health.toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${healthPercent}%` }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full"
              style={{ backgroundColor: healthColor }}
            />
          </div>
        </div>

        {/* Risk Score (if heatmap mode) */}
        {riskScore !== undefined && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Risk Score</span>
              <span className="text-xs font-semibold" style={{ color: borderColor }}>
                {(riskScore * 100).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${riskScore * 100}%` }}
                transition={{ duration: 0.5 }}
                className="h-full rounded-full"
                style={{ backgroundColor: borderColor }}
              />
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="space-y-2 mb-3 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 flex items-center gap-1">
              <CurrencyDollarIcon className="h-3 w-3" />
              Collateral
            </span>
            <span className="text-white font-medium">{collateral.toFixed(4)} MATIC</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Loan</span>
            <span className="text-white font-medium">{loanAmount.toFixed(4)} MATIC</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Leverage</span>
            <span className="text-purple-400 font-medium">{leverage}%</span>
          </div>
          {deadline && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400 flex items-center gap-1">
                <ClockIcon className="h-3 w-3" />
                Deadline
              </span>
              <span className="text-yellow-400 font-medium">{timeRemaining}</span>
            </div>
          )}
          {data.lastPrice && (
            <div className="flex items-center justify-between">
              <span className="text-gray-400 flex items-center gap-1">
                <ChartBarIcon className="h-3 w-3" />
                Price
              </span>
              <span className="text-white font-medium">${parseFloat(data.lastPrice).toFixed(2)}</span>
            </div>
          )}
        </div>

        {/* Sparkline placeholder - would integrate lightweight-charts here */}
        <div className="h-8 bg-gray-800/50 rounded mb-2 flex items-center justify-center">
          <span className="text-xs text-gray-500">Price Chart</span>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} />
    </motion.div >
  );
}

const nodeTypes = { predictionNode: PredictionNode };

function layoutNodes(nodes: Node[], direction: 'TB' | 'LR' = 'LR') {
  // Create a new graph instance to avoid state issues
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: direction,
    nodesep: direction === 'LR' ? 100 : 50,
    ranksep: direction === 'LR' ? 50 : 100
  });

  // Add nodes
  nodes.forEach((n) => graph.setNode(n.id, { width: 240, height: 200 }));

  // Add edges
  nodes.forEach((n) => {
    const parentId = (n.data as any).parentId;
    if (parentId) {
      graph.setEdge(String(parentId), String(n.id));
    }
  });

  // Run layout
  dagre.layout(graph);

  // Map nodes with positions
  return nodes.map((n) => {
    const nodeWithPosition = graph.node(n.id);
    if (nodeWithPosition) {
      return {
        ...n,
        position: {
          x: nodeWithPosition.x - 120,
          y: nodeWithPosition.y - 100
        },
        type: 'predictionNode'
      };
    }
    return { ...n, type: 'predictionNode' };
  });
}

interface PredictionGraphProps {
  rootId: string | number;
  contractAddress?: string;
  publicClient?: any;
  chains?: any[];
  backtestId?: string; // Optional: enables heatmap mode
  creator?: string; // For fetching heatmap data
}

export default function PredictionGraph({ rootId, contractAddress, publicClient, chains, backtestId, creator }: PredictionGraphProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [layoutDirection, setLayoutDirection] = useState<'TB' | 'LR'>('LR'); // Default to horizontal
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [heatmapMetrics, setHeatmapMetrics] = useState<any>(null);

  // New state for features
  const [collapseSimulation, setCollapseSimulation] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [copilotAnalysis, setCopilotAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showBadgeVote, setShowBadgeVote] = useState(false);

  // Fetch heatmap metrics if backtestId provided
  useEffect(() => {
    if (!backtestId) {
      setHeatmapMetrics(null);
      return;
    }

    async function fetchHeatmap() {
      try {
        const res = await fetch('/api/predictions/heatmap', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ backtestId, creator })
        });

        const data = await res.json();
        if (data.ok && data.metrics) {
          console.log('Heatmap metrics loaded:', data.totalPredictions, 'predictions');
          setHeatmapMetrics(data.metrics);
        } else {
          console.warn('Heatmap fetch failed:', data.error);
          setHeatmapMetrics(null);
        }
      } catch (err) {
        console.error('Failed to fetch heatmap:', err);
        setHeatmapMetrics(null);
      }
    }

    fetchHeatmap();
  }, [backtestId, creator]);

  useEffect(() => {
    async function fetchTree() {
      try {
        // First try to use chains data if provided (faster, no API call)
        if (chains && chains.length > 0) {
          const rootChain = chains.find(c => c.id === Number(rootId) || c.id === rootId);
          if (rootChain) {
            // Build tree from chains data
            const allChains = chains.filter(c => {
              // Include root and all descendants
              if (c.id === Number(rootId) || c.id === rootId) return true;
              // Check if it's a descendant by traversing parent chain
              let current = c;
              while (current && current.parentId !== 0) {
                if (current.parentId === Number(rootId) || current.parentId === rootId) return true;
                current = chains.find(ch => ch.id === current.parentId);
                if (!current) break;
              }
              return false;
            });

            const mapNodes: Node[] = allChains.map((n: any) => {
              const collateral = Number(n.collateral) / 1e18;
              const loan = Number(n.loan) / 1e18;
              const health = n.collateral && n.loan ? ((collateral + loan) / (collateral * 1.5)) * 100 : 150;

              // Merge heatmap metrics if available
              const heatmapData = heatmapMetrics?.[n.id.toString()];

              return {
                id: String(n.id),
                data: {
                  id: n.id,
                  collateral: collateral.toString(),
                  loanAmount: loan.toString(),
                  leverageBps: n.loan && n.collateral ? (Number(n.loan) / Number(n.collateral)) * 10000 : 0,
                  health: health,
                  resolved: n.resolved,
                  outcome: n.outcome,
                  deadline: Number(n.deadline),
                  parentId: n.parentId,
                  liquidated: n.liquidated,
                  priceTarget: Number(n.priceTarget) / 1e8,
                  riskScore: heatmapData?.riskScore // Add risk score from heatmap
                },
                position: { x: 0, y: 0 }
              };
            });

            const mapEdges: Edge[] = allChains
              .filter((n: any) => n.parentId && n.parentId !== 0)
              .map((n: any) => ({
                id: `e${n.parentId}-${n.id}`,
                source: String(n.parentId),
                target: String(n.id),
                animated: !n.resolved && !n.liquidated,
                style: {
                  stroke: n.liquidated ? '#6b7280' : n.resolved ? (n.outcome ? '#10b981' : '#ef4444') : '#6366f1',
                  strokeWidth: 2,
                  strokeDasharray: n.liquidated ? '5,5' : '0'
                },
                markerEnd: {
                  type: MarkerType.ArrowClosed
                }
              }));

            const laid = layoutNodes(mapNodes, layoutDirection);
            setNodes(laid);
            setEdges(mapEdges);
            return;
          }
        }

        // Fallback: Try indexer API if available
        try {
          const indexerUrl = process.env.NEXT_PUBLIC_INDEXER_URL || 'http://localhost:4000';
          const res = await fetch(`${indexerUrl}/predictions/root/${rootId}`);
          const json = await res.json();

          if (json.ok && json.nodes) {
            const dbNodes = json.nodes;
            const mapNodes: Node[] = dbNodes.map((n: any) => ({
              id: String(n.id),
              data: {
                id: n.id,
                collateral: n.collateral,
                loanAmount: n.loan_amount,
                leverageBps: n.leverage_bps,
                health: n.health || computeHealth(n),
                resolved: n.resolved,
                outcome: n.outcome,
                lastPrice: n.last_price,
                deadline: n.deadline,
                parentId: n.parent_id,
                liquidated: n.liquidated
              },
              position: { x: 0, y: 0 }
            }));

            const mapEdges: Edge[] = dbNodes
              .filter((n: any) => n.parent_id)
              .map((n: any) => ({
                id: `e${n.parent_id}-${n.id}`,
                source: String(n.parent_id),
                target: String(n.id),
                animated: !n.resolved && !n.liquidated,
                style: {
                  stroke: n.liquidated ? '#6b7280' : n.resolved ? (n.outcome ? '#10b981' : '#ef4444') : '#6366f1',
                  strokeWidth: 2,
                  strokeDasharray: n.liquidated ? '5,5' : '0'
                },
                markerEnd: {
                  type: MarkerType.ArrowClosed
                }
              }));

            const laid = layoutNodes(mapNodes, layoutDirection);
            setNodes(laid);
            setEdges(mapEdges);
            return;
          }
        } catch (indexerError) {
          console.log('Indexer API not available, using contract data only');
        }

        // Final fallback: Fetch directly from contract
        if (contractAddress && publicClient) {
          const MultiversePredictionAbi = [
            {
              inputs: [{ name: 'predictionId', type: 'uint256' }],
              name: 'predictions',
              outputs: [
                { name: 'id', type: 'uint256' },
                { name: 'creator', type: 'address' },
                { name: 'parentId', type: 'uint256' },
                { name: 'collateralAmount', type: 'uint256' },
                { name: 'loanAmount', type: 'uint256' },
                { name: 'priceFeed', type: 'address' },
                { name: 'priceTarget', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
                { name: 'resolved', type: 'bool' },
                { name: 'outcome', type: 'bool' },
                { name: 'collateralizationRatio', type: 'uint256' },
                { name: 'liquidated', type: 'bool' }
              ],
              stateMutability: 'view',
              type: 'function'
            },
            {
              inputs: [{ name: 'parentId', type: 'uint256' }],
              name: 'getChildren',
              outputs: [{ name: '', type: 'uint256[]' }],
              stateMutability: 'view',
              type: 'function'
            }
          ] as const;

          // Recursively fetch tree
          const fetchNode = async (nodeId: bigint): Promise<any[]> => {
            try {
              const pred = await publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: MultiversePredictionAbi,
                functionName: 'predictions',
                args: [nodeId]
              }) as any;

              const children = await publicClient.readContract({
                address: contractAddress as `0x${string}`,
                abi: MultiversePredictionAbi,
                functionName: 'getChildren',
                args: [nodeId]
              }) as bigint[];

              const node = {
                id: Number(nodeId),
                parentId: Number(pred.parentId),
                collateral: pred.collateralAmount,
                loan: pred.loanAmount,
                deadline: Number(pred.deadline),
                resolved: pred.resolved,
                outcome: pred.outcome,
                liquidated: pred.liquidated,
                priceTarget: pred.priceTarget
              };

              const allNodes = [node];
              for (const childId of children) {
                const childNodes = await fetchNode(childId);
                allNodes.push(...childNodes);
              }

              return allNodes;
            } catch (error) {
              console.error(`Failed to fetch node ${nodeId}:`, error);
              return [];
            }
          };

          const allNodes = await fetchNode(BigInt(rootId));

          const mapNodes: Node[] = allNodes.map((n: any) => {
            const collateral = Number(n.collateral) / 1e18;
            const loan = Number(n.loan) / 1e18;
            const health = n.collateral && n.loan ? ((collateral + loan) / (collateral * 1.5)) * 100 : 150;

            return {
              id: String(n.id),
              data: {
                id: n.id,
                collateral: collateral.toString(),
                loanAmount: loan.toString(),
                leverageBps: n.loan && n.collateral ? (Number(n.loan) / Number(n.collateral)) * 10000 : 0,
                health: health,
                resolved: n.resolved,
                outcome: n.outcome,
                deadline: n.deadline,
                parentId: n.parentId,
                liquidated: n.liquidated,
                priceTarget: Number(n.priceTarget) / 1e8
              },
              position: { x: 0, y: 0 }
            };
          });

          const mapEdges: Edge[] = allNodes
            .filter((n: any) => n.parentId && n.parentId !== 0)
            .map((n: any) => ({
              id: `e${n.parentId}-${n.id}`,
              source: String(n.parentId),
              target: String(n.id),
              animated: !n.resolved && !n.liquidated,
              style: {
                stroke: n.liquidated ? '#6b7280' : n.resolved ? (n.outcome ? '#10b981' : '#ef4444') : '#6366f1',
                strokeWidth: 2,
                strokeDasharray: n.liquidated ? '5,5' : '0'
              },
              markerEnd: {
                type: MarkerType.ArrowClosed
              }
            }));

          const laid = layoutNodes(mapNodes, layoutDirection);
          setNodes(laid);
          setEdges(mapEdges);
        }
      } catch (error) {
        console.error('Failed to fetch tree:', error);
      }
    }

    fetchTree();

    // Connect to socket
    const indexerUrl = process.env.NEXT_PUBLIC_INDEXER_URL || 'http://localhost:4000';
    const socket = io(indexerUrl, {
      transports: ['websocket', 'polling']
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
      setConnected(true);
      socket.emit('subscribe', { rootId });
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    socket.on('prediction:created', (ev: any) => {
      console.log('prediction:created', ev);
      const newNode: Node = {
        id: String(ev.id),
        data: {
          id: ev.id,
          collateral: ev.data.collateral,
          loanAmount: ev.data.loanAmount,
          leverageBps: ev.data.leverageBps,
          health: ev.data.health || 0,
          resolved: false,
          deadline: ev.data.deadline,
          parentId: ev.data.parentId
        },
        position: { x: Math.random() * 200, y: Math.random() * 400 },
        type: 'predictionNode'
      };

      setNodes((ns) => {
        const updated = [...ns, newNode];
        return layoutNodes(updated, layoutDirection);
      });

      if (ev.data.parentId) {
        setEdges((es) => [
          ...es,
          {
            id: `e${ev.data.parentId}-${ev.id}`,
            source: String(ev.data.parentId),
            target: String(ev.id),
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed },
            type: 'default' as const
          }
        ]);
      }
    });

    socket.on('prediction:updated', (ev: any) => {
      console.log('prediction:updated', ev);
      setNodes((ns) =>
        ns.map((n) => {
          if (n.id === String(ev.id)) {
            const health = ev.data.health || computeHealthFromData(n.data);
            return {
              ...n,
              data: {
                ...n.data,
                lastPrice: ev.data.lastPrice,
                health
              }
            };
          }
          return n;
        })
      );
    });

    socket.on('prediction:resolved', (ev: any) => {
      console.log('prediction:resolved', ev);
      setNodes((ns) =>
        ns.map((n) => {
          if (n.id === String(ev.id)) {
            return {
              ...n,
              data: {
                ...n.data,
                resolved: true,
                outcome: ev.data.outcome,
                lastPrice: ev.data.lastPrice
              }
            };
          }
          return n;
        })
      );

      setEdges((es) =>
        es.map((e) => {
          if (e.target === String(ev.id)) {
            return {
              ...e,
              animated: false,
              style: {
                ...e.style,
                stroke: ev.data.outcome ? '#10b981' : '#ef4444'
              },
              markerEnd: {
                type: MarkerType.ArrowClosed
              },
              type: 'default' as const
            };
          }
          return e;
        })
      );
    });

    socket.on('prediction:liquidated', (ev: any) => {
      console.log('prediction:liquidated', ev);
      setNodes((ns) =>
        ns.map((n) => {
          if (n.id === String(ev.id)) {
            return {
              ...n,
              data: {
                ...n.data,
                liquidated: true
              }
            };
          }
          return n;
        })
      );

      setEdges((es) =>
        es.map((e) => {
          if (e.target === String(ev.id) || e.source === String(ev.id)) {
            return {
              ...e,
              animated: false,
              style: {
                ...e.style,
                stroke: '#6b7280',
                strokeWidth: 2,
                strokeDasharray: '5,5'
              },
              markerEnd: {
                type: MarkerType.ArrowClosed
              },
              type: 'default' as const
            };
          }
          return e;
        })
      );
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootId, contractAddress]); // Removed 'chains' to prevent constant re-fetching

  // Re-layout when direction changes
  useEffect(() => {
    if (nodes.length > 0) {
      const laid = layoutNodes([...nodes], layoutDirection);
      setNodes(laid);
    }
  }, [layoutDirection]);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  };

  return (
    <div style={{ width: '100%', height: '700px', position: 'relative' }}>
      {/* Title */}
      <div className="absolute top-4 left-4 z-10">
        <h4 className="text-sm font-semibold text-white bg-gray-800/90 px-3 py-2 rounded-lg">
          Your Prediction Chains
        </h4>
      </div>

      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={() => setLayoutDirection(layoutDirection === 'TB' ? 'LR' : 'TB')}
          className="px-3 py-2 bg-gray-800/90 text-white rounded-lg hover:bg-gray-700 text-sm"
        >
          {layoutDirection === 'TB' ? 'Horizontal' : 'Vertical'}
        </button>
        {!connected && (
          <div className="px-3 py-2 bg-red-500/90 text-white rounded-lg text-sm">
            Disconnected
          </div>
        )}
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <MiniMap />
        <Controls />
        <Background />
      </ReactFlow>

      {/* Node Details Modal */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setSelectedNode(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-4">Prediction #{selectedNode.data.id}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Collateral:</span>
                  <span className="text-white">{parseFloat(selectedNode.data.collateral || 0).toFixed(4)} MATIC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Loan:</span>
                  <span className="text-white">{parseFloat(selectedNode.data.loanAmount || 0).toFixed(4)} MATIC</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Health:</span>
                  <span className="text-white">{(selectedNode.data.health || 0).toFixed(2)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status:</span>
                  <span className={`${selectedNode.data.resolved
                    ? (selectedNode.data.outcome ? 'text-green-400' : 'text-red-400')
                    : selectedNode.data.liquidated
                      ? 'text-gray-400'
                      : 'text-yellow-400'
                    }`}>
                    {selectedNode.data.resolved
                      ? (selectedNode.data.outcome ? 'Won' : 'Lost')
                      : selectedNode.data.liquidated
                        ? 'Liquidated'
                        : 'Active'}
                  </span>
                </div>
              </div>

              {/* Backtest Button */}
              <button
                className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                onClick={async () => {
                  const payload = {
                    symbol: selectedNode.data.priceSymbol || "ETHUSDT",
                    interval: "1h",
                    fast: 20,
                    slow: 50,
                    predictionId: selectedNode.data.id
                  };

                  try {
                    const res = await fetch('/api/backtest/run', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(payload)
                    });
                    const json = await res.json();

                    if (json.ok) {
                      alert('Backtest started: ' + (json.backtestId || 'check artifacts'));
                      // Refresh heatmap with new backtest data
                      if (json.backtestId) {
                        const heatmapRes = await fetch('/api/predictions/heatmap', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            backtestId: json.backtestId,
                            nodes: nodes.map(n => ({ id: n.id, health: n.data.health }))
                          })
                        });
                        const heatmapJson = await heatmapRes.json();

                        if (heatmapJson.ok) {
                          const metrics = heatmapJson.metrics;
                          setNodes(ns => ns.map(n => {
                            const m = metrics[n.id];
                            if (!m) return n;
                            const color = m.riskScore < 0.33 ? '#10b981' : m.riskScore < 0.66 ? '#f59e0b' : '#ef4444';
                            return {
                              ...n,
                              data: {
                                ...n.data,
                                riskScore: m.riskScore,
                                realizedProfit: m.realizedProfit,
                                realizedLoss: m.realizedLoss
                              },
                              style: { ...n.style, border: `3px solid ${color}` }
                            };
                          }));
                        }
                      }
                    } else {
                      alert('Backtest failed: ' + json.error);
                    }
                  } catch (err: any) {
                    alert('Backtest error: ' + err.message);
                  }
                }}
              >
                ▶ Run Backtest for this Node
              </button>

              {/* Risk Score Display */}
              {selectedNode.data.riskScore !== undefined && (
                <div className="mt-3 p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Risk Score:</span>
                    <span className={`font-medium ${selectedNode.data.riskScore < 0.33 ? 'text-green-400' :
                      selectedNode.data.riskScore < 0.66 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                      {(selectedNode.data.riskScore * 100).toFixed(1)}%
                    </span>
                  </div>
                  {selectedNode.data.realizedProfit !== undefined && (
                    <>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-400">Realized Profit:</span>
                        <span className="text-green-400">+{selectedNode.data.realizedProfit.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-400">Realized Loss:</span>
                        <span className="text-red-400">-{selectedNode.data.realizedLoss.toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Action Buttons Grid */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {/* Collapse Simulator Button */}
                <button
                  className="px-3 py-2 bg-red-600/80 text-white rounded-lg hover:bg-red-700 text-sm flex items-center justify-center gap-1"
                  disabled={isSimulating}
                  onClick={async () => {
                    setIsSimulating(true);
                    setCollapseSimulation(null);
                    try {
                      const chainData = nodes.map(n => ({
                        id: parseInt(n.id),
                        parentId: n.data.parentId || 0,
                        collateral: Number(n.data.collateral) / 1e18,
                        loanAmount: Number(n.data.loanAmount) / 1e18,
                        children: nodes.filter(c => c.data.parentId === parseInt(n.id)).map(c => parseInt(c.id))
                      }));

                      const res = await fetch('/api/predictions/simulate-collapse', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nodeId: selectedNode.data.id, chain: chainData })
                      });
                      const json = await res.json();
                      if (json.ok) {
                        setCollapseSimulation(json.simulation);
                        // Visual effect: color affected nodes red
                        setNodes(ns => ns.map(n => {
                          if (json.simulation.affectedNodes.includes(parseInt(n.id))) {
                            return {
                              ...n,
                              style: { ...n.style, border: '3px solid #ef4444', opacity: 0.7 }
                            };
                          }
                          return n;
                        }));
                      }
                    } catch (err) {
                      console.error('Collapse simulation error:', err);
                    }
                    setIsSimulating(false);
                  }}
                >
                  {isSimulating ? '⏳' : '💥'} Simulate Collapse
                </button>

                {/* Strategy Copilot Button */}
                <button
                  className="px-3 py-2 bg-purple-600/80 text-white rounded-lg hover:bg-purple-700 text-sm flex items-center justify-center gap-1"
                  disabled={isAnalyzing}
                  onClick={async () => {
                    setIsAnalyzing(true);
                    setCopilotAnalysis(null);
                    try {
                      // Calculate chain stats
                      const totalCollateral = nodes.reduce((sum, n) => sum + Number(n.data.collateral || 0) / 1e18, 0);
                      const totalLoan = nodes.reduce((sum, n) => sum + Number(n.data.loanAmount || 0) / 1e18, 0);
                      const avgHealth = nodes.reduce((sum, n) => sum + (n.data.health || 150), 0) / nodes.length;

                      const res = await fetch('/api/strategy/copilot', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          node: {
                            id: selectedNode.data.id,
                            parentId: selectedNode.data.parentId || 0,
                            collateral: selectedNode.data.collateral,
                            loanAmount: selectedNode.data.loanAmount,
                            priceTarget: selectedNode.data.priceTarget,
                            health: selectedNode.data.health || 150,
                            leverage: selectedNode.data.leverage || 5000,
                            depth: selectedNode.data.depth || 1,
                            resolved: selectedNode.data.resolved || false,
                            outcome: selectedNode.data.outcome
                          },
                          chainData: {
                            totalCollateral,
                            totalLoan,
                            avgHealth,
                            maxDepth: Math.max(...nodes.map(n => n.data.depth || 1)),
                            nodeCount: nodes.length
                          }
                        })
                      });
                      const json = await res.json();
                      if (json.ok) {
                        setCopilotAnalysis(json.analysis);
                      }
                    } catch (err) {
                      console.error('Copilot error:', err);
                    }
                    setIsAnalyzing(false);
                  }}
                >
                  {isAnalyzing ? '⏳' : '🤖'} AI Copilot
                </button>

                {/* Badge Vote Button */}
                <button
                  className="px-3 py-2 bg-yellow-600/80 text-white rounded-lg hover:bg-yellow-700 text-sm flex items-center justify-center gap-1"
                  onClick={() => setShowBadgeVote(!showBadgeVote)}
                >
                  🏅 Vote Badge
                </button>
              </div>

              {/* Collapse Simulation Result */}
              {collapseSimulation && (
                <div className="mt-3 p-3 bg-red-900/30 border border-red-500/50 rounded-lg">
                  <h5 className="text-red-400 font-semibold text-sm mb-2">💥 Collapse Simulation</h5>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Affected Nodes:</span>
                      <span className="text-red-400">{collapseSimulation.affectedNodes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Cascade Depth:</span>
                      <span className="text-red-400">{collapseSimulation.cascadeDepth}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold mt-2">
                      <span className="text-gray-300">Total Chain Loss:</span>
                      <span className="text-red-500">-${collapseSimulation.totalLoss.toFixed(2)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setCollapseSimulation(null);
                      // Reset node colors
                      setNodes(ns => ns.map(n => ({
                        ...n,
                        style: { ...n.style, border: undefined, opacity: 1 }
                      })));
                    }}
                    className="mt-2 text-xs text-gray-400 hover:text-white"
                  >
                    Clear Simulation
                  </button>
                </div>
              )}

              {/* Copilot Analysis Result */}
              {copilotAnalysis && (
                <div className="mt-3 p-3 bg-purple-900/30 border border-purple-500/50 rounded-lg">
                  <h5 className="text-purple-400 font-semibold text-sm mb-2">🤖 Strategy Advice</h5>
                  <div className={`inline-block px-2 py-1 rounded text-xs mb-2 ${copilotAnalysis.riskAssessment === 'Critical' ? 'bg-red-600' :
                    copilotAnalysis.riskAssessment === 'High' ? 'bg-orange-600' :
                      copilotAnalysis.riskAssessment === 'Medium' ? 'bg-yellow-600' : 'bg-green-600'
                    }`}>
                    {copilotAnalysis.riskAssessment} Risk
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{copilotAnalysis.summary}</p>

                  {copilotAnalysis.warnings?.length > 0 && (
                    <div className="mb-2">
                      <span className="text-xs text-yellow-400">⚠️ Warnings:</span>
                      <ul className="text-xs text-gray-400 ml-3">
                        {copilotAnalysis.warnings.map((w: string, i: number) => (
                          <li key={i}>• {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {copilotAnalysis.actions?.length > 0 && (
                    <div>
                      <span className="text-xs text-green-400">✅ Suggested Actions:</span>
                      {copilotAnalysis.actions.map((a: any, i: number) => (
                        <div key={i} className="text-xs bg-gray-800/50 p-2 rounded mt-1">
                          <div className="font-medium text-white">{a.title}</div>
                          <div className="text-gray-400">{a.rationale}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-gray-500 mt-2">
                    Confidence: {((copilotAnalysis.confidenceScore || 0) * 100).toFixed(0)}%
                  </div>
                </div>
              )}

              {/* Badge Vote Panel */}
              {showBadgeVote && creator && (
                <div className="mt-3 p-3 bg-yellow-900/30 border border-yellow-500/50 rounded-lg">
                  <h5 className="text-yellow-400 font-semibold text-sm mb-2">🏅 Award Badge NFT</h5>
                  <p className="text-xs text-gray-400 mb-2">Click to instantly award a badge to this strategist</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'WHALE', emoji: '🐋', name: 'Whale' },
                      { id: 'ACCURACY_KING', emoji: '🎯', name: 'Accuracy King' },
                      { id: 'CHAIN_MASTER', emoji: '⛓️', name: 'Chain Master' },
                      { id: 'RISK_MANAGER', emoji: '🛡️', name: 'Risk Manager' },
                      { id: 'DIAMOND_HANDS', emoji: '💎', name: 'Diamond Hands' },
                      { id: 'COMMUNITY_FAVORITE', emoji: '⭐', name: 'Favorite' }
                    ].map(badge => (
                      <button
                        key={badge.id}
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/badges', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                action: 'vote',
                                voter: creator,
                                recipient: selectedNode.data.creator || creator,
                                badgeType: badge.id
                              })
                            });
                            const json = await res.json();
                            if (json.ok) {
                              alert(`${badge.emoji} ${json.message || `${badge.name} badge awarded!`}`);
                              setShowBadgeVote(false);
                            } else {
                              alert(json.error || 'Failed to award badge');
                            }
                          } catch (err) {
                            alert('Vote failed - please try again');
                          }
                        }}
                        className="px-2 py-2 bg-yellow-700/50 text-white text-xs rounded hover:bg-yellow-600 transition-all flex items-center gap-1"
                      >
                        <span className="text-base">{badge.emoji}</span>
                        <span>{badge.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  setSelectedNode(null);
                  setCollapseSimulation(null);
                  setCopilotAnalysis(null);
                  setShowBadgeVote(false);
                }}
                className="mt-4 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function computeHealth(n: any) {
  const collateral = Number(n.collateral || 0);
  const loan = Number(n.loan_amount || 0);
  if (!collateral) return 0;
  const requiredCollateral = collateral * 1.5;
  const totalValue = collateral + loan;
  return (totalValue / requiredCollateral) * 100;
}

function computeHealthFromData(data: any) {
  const collateral = Number(data.collateral || 0);
  const loan = Number(data.loanAmount || 0);
  if (!collateral) return 0;
  const requiredCollateral = collateral * 1.5;
  const totalValue = collateral + loan;
  return (totalValue / requiredCollateral) * 100;
}
