'use client';

import React, { useMemo } from 'react';
import { BaseEdge, EdgeProps, useNodes, Node, useEdges } from '@xyflow/react';

interface NodeBounds {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
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
        centerX: n.position.x + width / 2,
        centerY: n.position.y + height / 2,
      };
    });
}

// Check if a point is inside any node
function pointInNode(x: number, y: number, nodes: NodeBounds[]): boolean {
  return nodes.some(n => x >= n.left && x <= n.right && y >= n.top && y <= n.bottom);
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

// Check if a vertical line segment intersects any node
function vLineIntersectsNodes(
  x: number,
  y1: number,
  y2: number,
  nodes: NodeBounds[]
): boolean {
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  
  return nodes.some((n) => {
    return x >= n.left && x <= n.right && maxY >= n.top && minY <= n.bottom;
  });
}

// Find a clear Y coordinate for horizontal routing
function findClearY(
  x1: number,
  x2: number,
  preferredY: number,
  nodes: NodeBounds[],
  searchUp: boolean,
  searchDown: boolean
): number {
  if (!hLineIntersectsNodes(preferredY, x1, x2, nodes)) {
    return preferredY;
  }
  
  const step = 15;
  const maxOffset = 400;
  
  for (let offset = step; offset <= maxOffset; offset += step) {
    if (searchUp) {
      const yUp = preferredY - offset;
      if (!hLineIntersectsNodes(yUp, x1, x2, nodes)) {
        return yUp;
      }
    }
    if (searchDown) {
      const yDown = preferredY + offset;
      if (!hLineIntersectsNodes(yDown, x1, x2, nodes)) {
        return yDown;
      }
    }
  }
  
  return preferredY;
}

// Find a clear X coordinate for vertical routing
function findClearX(
  y1: number,
  y2: number,
  preferredX: number,
  nodes: NodeBounds[]
): number {
  if (!vLineIntersectsNodes(preferredX, y1, y2, nodes)) {
    return preferredX;
  }
  
  const step = 15;
  const maxOffset = 400;
  
  for (let offset = step; offset <= maxOffset; offset += step) {
    const xLeft = preferredX - offset;
    if (!vLineIntersectsNodes(xLeft, y1, y2, nodes)) {
      return xLeft;
    }
    const xRight = preferredX + offset;
    if (!vLineIntersectsNodes(xRight, y1, y2, nodes)) {
      return xRight;
    }
  }
  
  return preferredX;
}

// Generate orthogonal path that avoids nodes
function generateSmartPath(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  nodes: NodeBounds[],
  borderRadius: number = 4
): string {
  const r = Math.min(borderRadius, 8);
  
  // Determine if going down or up
  const goingDown = targetY > sourceY;
  
  // Gap between source bottom and target top
  const gap = goingDown ? targetY - sourceY : sourceY - targetY;
  
  // If source and target are vertically aligned (or very close)
  if (Math.abs(sourceX - targetX) < 10) {
    // Simple vertical line
    return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
  }
  
  // Standard org-chart routing: go down, horizontal, then down again
  // Calculate midpoint Y - prefer to route in the gap between rows
  let midY: number;
  
  if (goingDown) {
    // Route in the upper third of the gap (closer to source)
    midY = sourceY + Math.min(gap * 0.3, 30);
  } else {
    // Going up - route in lower third
    midY = sourceY - Math.min(gap * 0.3, 30);
  }
  
  // Check if this midY intersects any nodes when going from sourceX to targetX
  const clearMidY = findClearY(
    Math.min(sourceX, targetX),
    Math.max(sourceX, targetX),
    midY,
    nodes,
    !goingDown, // search up if going down
    goingDown   // search down if going up
  );
  
  // Check vertical segments for collision
  const sourceVerticalClear = !vLineIntersectsNodes(sourceX, sourceY, clearMidY, nodes);
  const targetVerticalClear = !vLineIntersectsNodes(targetX, clearMidY, targetY, nodes);
  
  if (sourceVerticalClear && targetVerticalClear) {
    // Standard 3-bend path with rounded corners
    const dir = sourceX < targetX ? 1 : -1;
    const vDir = goingDown ? 1 : -1;
    
    return [
      `M ${sourceX} ${sourceY}`,
      `L ${sourceX} ${clearMidY - r * vDir}`,
      `Q ${sourceX} ${clearMidY} ${sourceX + r * dir} ${clearMidY}`,
      `L ${targetX - r * dir} ${clearMidY}`,
      `Q ${targetX} ${clearMidY} ${targetX} ${clearMidY + r * vDir}`,
      `L ${targetX} ${targetY}`,
    ].join(' ');
  }
  
  // Need to route around obstacles - find clear X positions
  const clearSourceX = findClearX(sourceY, clearMidY, sourceX, nodes);
  const clearTargetX = findClearX(clearMidY, targetY, targetX, nodes);
  
  // Build a more complex path
  const points: { x: number; y: number }[] = [
    { x: sourceX, y: sourceY },
  ];
  
  // If we needed to shift the source vertical segment
  if (clearSourceX !== sourceX) {
    const exitY = sourceY + (goingDown ? 15 : -15);
    points.push({ x: sourceX, y: exitY });
    points.push({ x: clearSourceX, y: exitY });
  }
  
  points.push({ x: clearSourceX, y: clearMidY });
  points.push({ x: clearTargetX, y: clearMidY });
  
  // If we needed to shift the target vertical segment
  if (clearTargetX !== targetX) {
    const entryY = targetY + (goingDown ? -15 : 15);
    points.push({ x: clearTargetX, y: entryY });
    points.push({ x: targetX, y: entryY });
  }
  
  points.push({ x: targetX, y: targetY });
  
  // Convert points to path (simple line segments)
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
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
  const borderRadius = (data as { borderRadius?: number })?.borderRadius ?? 4;
  
  const nodeBounds = useMemo(
    () => getNodeBounds(nodes, [source, target]),
    [nodes, source, target]
  );
  
  const path = useMemo(
    () => generateSmartPath(
      sourceX,
      sourceY,
      targetX,
      targetY,
      nodeBounds,
      borderRadius
    ),
    [sourceX, sourceY, targetX, targetY, nodeBounds, borderRadius]
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
