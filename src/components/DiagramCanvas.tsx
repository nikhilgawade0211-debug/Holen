'use client';

import React, { useCallback, useEffect, useMemo } from 'react';
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
    selectedNodeId,
    setSelectedNode,
    updateNode,
  } = useDiagramStore();

  // Convert diagram nodes to React Flow nodes
  const rfNodes: Node<NodeCardData>[] = useMemo(
    () =>
      diagramNodes.map((node) => ({
        id: node.id,
        type: 'nodeCard',
        position: node.position,
        data: {
          node,
          isSelected: node.id === selectedNodeId,
        },
        draggable: true,
        selectable: true,
      })),
    [diagramNodes, selectedNodeId]
  );

  // Convert diagram edges to React Flow edges
  const rfEdges: Edge[] = useMemo(
    () =>
      diagramEdges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        style: { stroke: '#333', strokeWidth: 2 },
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

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  return (
    <div className="w-full h-full" id="diagram-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background color="#e5e5e5" gap={20} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            const data = node.data as NodeCardData;
            return data?.node?.style?.fill || '#fff';
          }}
        />
      </ReactFlow>
    </div>
  );
}
