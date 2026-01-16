'use client';

import React, { useMemo } from 'react';
import { BaseEdge, EdgeProps, useNodes, Node } from '@xyflow/react';

interface NodeBounds {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

// Get bounding box for all nodes except source and target
function getNodeBounds(nodes: Node[], excludeIds: string[]): NodeBounds[] {
  return nodes
    .filter((n) => !excludeIds.includes(n.id))
    .map((n) => {
      const width = n.measured?.width || n.width || 180;
      const height = n.measured?.height || n.height || 100;
      return {
        id: n.id,
        left: n.position.x - 5,
        right: n.position.x + width + 5,
        top: n.position.y - 5,
        bottom: n.position.y + height + 5,
      };
    });
}

// Check if a horizontal line segment intersects any node
function hLineIntersectsNodes(
  y: number,
  x1: number,
  x2: number,
  nodes: NodeBounds[]
): boolean {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  
  return nodes.some((n) => {
    return y >= n.top && y <= n.bottom && maxX >= n.left && minX <= n.right;
  });
}

// Find clear Y for horizontal segment, searching up first then down
function findClearY(
  x1: number,
  x2: number,
  startY: number,
  nodes: NodeBounds[],
  preferUp: boolean
): number {
  if (!hLineIntersectsNodes(startY, x1, x2, nodes)) {
    return startY;
  }
  
  const step = 10;
  const maxOffset = 300;
  
  for (let offset = step; offset <= maxOffset; offset += step) {
    if (preferUp) {
      const yUp = startY - offset;
      if (!hLineIntersectsNodes(yUp, x1, x2, nodes)) return yUp;
      const yDown = startY + offset;
      if (!hLineIntersectsNodes(yDown, x1, x2, nodes)) return yDown;
    } else {
      const yDown = startY + offset;
      if (!hLineIntersectsNodes(yDown, x1, x2, nodes)) return yDown;
      const yUp = startY - offset;
      if (!hLineIntersectsNodes(yUp, x1, x2, nodes)) return yUp;
    }
  }
  
  return startY;
}

// Generate org-chart style path: straight down, horizontal, straight down
function generateOrgChartPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  nodes: NodeBounds[],
  spacing: number,
  borderRadius: number
): string {
  const r = Math.min(borderRadius, 6);
  
  // Going down the hierarchy (source is parent, target is child)
  const goingDown = targetY > sourceY;
  
  // If vertically aligned, just draw a straight line
  if (Math.abs(sourceX - targetX) < 3) {
    return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  }
  
  // Calculate the horizontal bar Y position
  // It should be close to the source (parent) - just below it
  let barY: number;
  
  if (goingDown) {
    // Bar is placed 'spacing' pixels below the source
    barY = sourceY + spacing;
    // Make sure barY is between source and target
    barY = Math.min(barY, sourceY + (targetY - sourceY) * 0.4);
  } else {
    // Going up - bar is above the source
    barY = sourceY - spacing;
    barY = Math.max(barY, sourceY - (sourceY - targetY) * 0.4);
  }
  
  // Check if horizontal bar intersects any nodes
  barY = findClearY(
    Math.min(sourceX, targetX),
    Math.max(sourceX, targetX),
    barY,
    nodes,
    !goingDown
  );
  
  // Build the path with rounded corners
  const goingRight = targetX > sourceX;
  const dir = goingRight ? 1 : -1;
  
  if (goingDown) {
    // Path: down from source -> horizontal bar -> down to target
    const rClamped = Math.min(r, Math.abs(barY - sourceY) / 2, Math.abs(targetY - barY) / 2);
    
    return [
      `M ${sourceX} ${sourceY}`,
      `L ${sourceX} ${barY - rClamped}`,
      `Q ${sourceX} ${barY} ${sourceX + rClamped * dir} ${barY}`,
      `L ${targetX - rClamped * dir} ${barY}`,
      `Q ${targetX} ${barY} ${targetX} ${barY + rClamped}`,
      `L ${targetX} ${targetY}`,
    ].join(' ');
  } else {
    // Going up
    const rClamped = Math.min(r, Math.abs(sourceY - barY) / 2, Math.abs(barY - targetY) / 2);
    
    return [
      `M ${sourceX} ${sourceY}`,
      `L ${sourceX} ${barY + rClamped}`,
      `Q ${sourceX} ${barY} ${sourceX + rClamped * dir} ${barY}`,
      `L ${targetX - rClamped * dir} ${barY}`,
      `Q ${targetX} ${barY} ${targetX} ${barY - rClamped}`,
      `L ${targetX} ${targetY}`,
    ].join(' ');
  }
}

export default function SmartEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const nodes = useNodes();
  
  // Get edge-specific settings from data
  const edgeData = data as { borderRadius?: number; offset?: number } | undefined;
  const spacing = edgeData?.offset ?? 25; // Default spacing from parent
  const borderRadius = edgeData?.borderRadius ?? 4;
  
  const nodeBounds = useMemo(
    () => getNodeBounds(nodes, [source, target]),
    [nodes, source, target]
  );
  
  const path = useMemo(
    () => generateOrgChartPath(
      sourceX,
      sourceY,
      targetX,
      targetY,
      nodeBounds,
      spacing,
      borderRadius
    ),
    [sourceX, sourceY, targetX, targetY, nodeBounds, spacing, borderRadius]
  );
  
  return (
    <BaseEdge
      id={id}
      path={path}
      style={style}
      markerEnd={markerEnd}
    />
  );
}
