import { NextResponse } from 'next/server';

interface SimulationNode {
  id: number;
  parentId: number;
  collateral: number;
  loanAmount: number;
  children: number[];
}

interface CollapseResult {
  affectedNodes: number[];
  totalLoss: number;
  cascadeDepth: number;
  breakdown: Array<{
    nodeId: number;
    loss: number;
    reason: string;
  }>;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { nodeId, chain } = body as { nodeId: number; chain: SimulationNode[] };

    if (!nodeId || !chain) {
      return NextResponse.json({
        ok: false,
        error: 'Missing nodeId or chain data'
      }, { status: 400 });
    }

    // Build node map for quick lookup
    const nodeMap = new Map<number, SimulationNode>();
    chain.forEach(n => nodeMap.set(n.id, n));

    // Find all descendant nodes that would collapse
    const affectedNodes: number[] = [];
    const breakdown: CollapseResult['breakdown'] = [];
    let totalLoss = 0;

    // Start with the failed node
    const failedNode = nodeMap.get(nodeId);
    if (!failedNode) {
      return NextResponse.json({
        ok: false,
        error: 'Node not found in chain'
      }, { status: 400 });
    }

    // Add the failed node's loss
    const nodeLoss = failedNode.collateral + failedNode.loanAmount;
    affectedNodes.push(nodeId);
    breakdown.push({
      nodeId: nodeId,
      loss: nodeLoss,
      reason: 'Primary failure - collateral liquidated'
    });
    totalLoss += nodeLoss;

    // BFS to find all children that cascade
    const queue: number[] = [...failedNode.children];
    let cascadeDepth = 0;
    let currentLevelSize = queue.length;
    let nodesProcessedAtLevel = 0;

    while (queue.length > 0) {
      const childId = queue.shift()!;
      nodesProcessedAtLevel++;

      const childNode = nodeMap.get(childId);
      if (childNode) {
        const childLoss = childNode.collateral + childNode.loanAmount;
        affectedNodes.push(childId);
        breakdown.push({
          nodeId: childId,
          loss: childLoss,
          reason: 'Cascade failure - parent collapsed'
        });
        totalLoss += childLoss;

        // Add this node's children to the queue
        queue.push(...childNode.children);
      }

      // Track cascade depth
      if (nodesProcessedAtLevel >= currentLevelSize) {
        if (queue.length > 0) {
          cascadeDepth++;
          currentLevelSize = queue.length;
          nodesProcessedAtLevel = 0;
        }
      }
    }

    // Also check for orphaned dependencies
    // Nodes whose parent was affected
    chain.forEach(n => {
      if (affectedNodes.includes(n.parentId) && !affectedNodes.includes(n.id)) {
        const orphanLoss = n.collateral * 0.5; // Partial loss from broken dependency
        affectedNodes.push(n.id);
        breakdown.push({
          nodeId: n.id,
          loss: orphanLoss,
          reason: 'Orphaned - parent destroyed, partial collateral loss'
        });
        totalLoss += orphanLoss;
      }
    });

    const result: CollapseResult = {
      affectedNodes,
      totalLoss,
      cascadeDepth,
      breakdown
    };

    return NextResponse.json({ ok: true, simulation: result });
  } catch (err) {
    console.error('Collapse simulation error:', err);
    return NextResponse.json({
      ok: false,
      error: (err as Error).message
    }, { status: 500 });
  }
}
