import dagre from 'dagre';
import { DiagramNode } from '@/types/diagram';

export interface LayoutOptions {
  direction: 'TB' | 'BT' | 'LR' | 'RL';
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
}

const DEFAULT_OPTIONS: LayoutOptions = {
  direction: 'TB', // Top to bottom
  nodeWidth: 160,
  nodeHeight: 80,
  horizontalSpacing: 60,
  verticalSpacing: 80,
};

export function applyDagreLayout(
  nodes: DiagramNode[],
  options: Partial<LayoutOptions> = {}
): { id: string; x: number; y: number }[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const g = new dagre.graphlib.Graph();
  g.setGraph({
    rankdir: opts.direction,
    nodesep: opts.horizontalSpacing,
    ranksep: opts.verticalSpacing,
    marginx: 50,
    marginy: 50,
  });
  g.setDefaultEdgeLabel(() => ({}));

  // Add nodes
  nodes.forEach((node) => {
    g.setNode(node.id, {
      width: node.width || opts.nodeWidth,
      height: node.height || opts.nodeHeight,
    });
  });

  // Add edges from parent-child relationships
  nodes.forEach((node) => {
    if (node.parentId) {
      g.setEdge(node.parentId, node.id);
    }
  });

  // Run layout
  dagre.layout(g);

  // Extract positions
  return nodes.map((node) => {
    const dagreNode = g.node(node.id);
    return {
      id: node.id,
      x: dagreNode.x - (node.width || opts.nodeWidth) / 2,
      y: dagreNode.y - (node.height || opts.nodeHeight) / 2,
    };
  });
}
