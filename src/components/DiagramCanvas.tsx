'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
  NodeTypes,
  SelectionMode,
  OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import NodeCard, { NodeCardData } from './NodeCard';
import { useDiagramStore } from '@/store/diagramStore';

const nodeTypes: NodeTypes = {
  nodeCard: NodeCard,
};

export default function DiagramCanvas() {
  const {
    nodes: diagramNodes,
    edges: diagramEdges,
    selectedNodeIds,
    setSelectedNode,
    setSelectedNodes,
    updateNode,
    moveSelectedNodes,
  } = useDiagramStore();

  const lastDragPos = useRef<{ x: number; y: number } | null>(null);

  // Convert diagram nodes to React Flow nodes
  const rfNodes: Node<NodeCardData>[] = useMemo(
    () =>
      diagramNodes.map((node) => ({
        id: node.id,
        type: 'nodeCard',
        position: node.position,
        data: {
          node,
          isSelected: selectedNodeIds.includes(node.id),
        },
        selected: selectedNodeIds.includes(node.id),
        draggable: true,
        selectable: true,
      })),
    [diagramNodes, selectedNodeIds]
  );

  // Convert diagram edges to React Flow edges
  const rfEdges: Edge[] = useMemo(
    () =>
      diagramEdges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: 'bottom',
        targetHandle: 'top',
        type: 'smoothstep',
        style: { stroke: '#64748b', strokeWidth: 2 },
        pathOptions: { offset: 20, borderRadius: 8 },
        animated: false,
      })),
    [diagramEdges]
  );

  const [nodes, setNodes] = useNodesState(rfNodes);
  const [edges, setEdges] = useEdgesState(rfEdges);

  // Sync when diagram store changes
  useEffect(() => {
    setNodes(rfNodes);
  }, [rfNodes, setNodes]);

  useEffect(() => {
    setEdges(rfEdges);
  }, [rfEdges, setEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds) as Node<NodeCardData>[]);

      // Update positions in store when dragging ends
      changes.forEach((change) => {
        if (change.type === 'position' && change.dragging === false && change.position) {
          updateNode(change.id, {
            position: { x: change.position.x, y: change.position.y },
          });
        }
      });
    },
    [setNodes, updateNode]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds) as Edge[]);
    },
    [setEdges]
  );

  // Handle selection changes from React Flow (marquee + ctrl/cmd click)
  const onSelectionChange = useCallback(
    ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
      const ids = selectedNodes.map((n) => n.id);
      setSelectedNodes(ids);
    },
    [setSelectedNodes]
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Ctrl/Cmd click toggles selection
      if (event.ctrlKey || event.metaKey) {
        const { toggleNodeSelection } = useDiagramStore.getState();
        toggleNodeSelection(node.id);
      } else {
        setSelectedNode(node.id);
      }
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    const { clearSelection } = useDiagramStore.getState();
    clearSelection();
  }, []);

  return (
    <div className="w-full h-full" id="diagram-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        selectionMode={SelectionMode.Partial}
        selectionOnDrag
        panOnDrag={[1, 2]} // Pan with middle or right mouse button
        panOnScroll // Enable two-finger scroll/trackpad panning
        zoomOnScroll={false} // Disable zoom on scroll so pan works
        zoomOnPinch // Enable pinch-to-zoom on touch
        selectNodesOnDrag={false}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        className="bg-gradient-to-br from-slate-50 to-slate-100"
      >
        <Background color="#cbd5e1" gap={20} size={1} />
        <Controls className="!bg-white !shadow-lg !border !border-slate-200 !rounded-lg" />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            const data = node.data as NodeCardData;
            return data?.node?.style?.fill || '#fff';
          }}
          className="!bg-white !shadow-lg !border !border-slate-200 !rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}
