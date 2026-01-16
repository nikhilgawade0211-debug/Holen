'use client';

import React, { memo, useCallback, useRef, useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { DiagramNode, DEFAULT_TEXT_STYLE, DEFAULT_BOX_STYLE } from '@/types/diagram';
import { useDiagramStore } from '@/store/diagramStore';

export type NodeCardData = {
  node: DiagramNode;
  isSelected: boolean;
  [key: string]: unknown;
};

interface NodeCardProps {
  data: NodeCardData;
}

// Helper to get border radius class
const getBorderRadius = (radius: string): string => {
  switch (radius) {
    case 'none': return '0px';
    case 'sm': return '4px';
    case 'md': return '8px';
    case 'lg': return '16px';
    case 'full': return '9999px';
    default: return '4px';
  }
};

// Helper to get shadow class
const getShadow = (shadow: string): string => {
  switch (shadow) {
    case 'none': return 'none';
    case 'sm': return '0 1px 2px rgba(0,0,0,0.1)';
    case 'md': return '0 4px 6px rgba(0,0,0,0.1)';
    case 'lg': return '0 10px 15px rgba(0,0,0,0.1)';
    default: return '0 1px 2px rgba(0,0,0,0.1)';
  }
};

// Helper to get font size
const getFontSize = (size: string): string => {
  switch (size) {
    case 'xs': return '0.75rem';
    case 'sm': return '0.875rem';
    case 'base': return '1rem';
    case 'lg': return '1.125rem';
    case 'xl': return '1.25rem';
    default: return '0.875rem';
  }
};

function NodeCard({ data }: NodeCardProps) {
  const { node, isSelected } = data;
  const { title, subtitle, badge, badgeConfig, style, textStyle, boxStyle } = node;
  const updateNode = useDiagramStore((s) => s.updateNode);
  
  // Use defaults if not set
  const txtStyle = textStyle || DEFAULT_TEXT_STYLE;
  const bxStyle = boxStyle || DEFAULT_BOX_STYLE;
  
  const [isResizingBox, setIsResizingBox] = useState(false);
  const [isResizingBadge, setIsResizingBadge] = useState(false);
  const [isDraggingBadge, setIsDraggingBadge] = useState(false);
  const startPos = useRef({ x: 0, y: 0, width: 0, height: 0, offsetX: 0, nodeX: 0, nodeY: 0 });

  // Default badge config
  const badgeCfg = badgeConfig || { offsetX: 0, offsetY: 0, width: 80, height: 28 };

  // Box resize handlers for all directions
  type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
  
  const handleBoxResizeStart = useCallback((direction: ResizeDirection) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizingBox(true);
    startPos.current = { 
      x: e.clientX, 
      y: e.clientY, 
      width: node.width, 
      height: node.height, 
      offsetX: 0,
      nodeX: node.position.x,
      nodeY: node.position.y,
    };

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPos.current.x;
      const deltaY = e.clientY - startPos.current.y;
      
      let newWidth = startPos.current.width;
      let newHeight = startPos.current.height;
      let newX = startPos.current.nodeX;
      let newY = startPos.current.nodeY;

      // Handle horizontal resizing
      if (direction.includes('e')) {
        newWidth = Math.max(80, startPos.current.width + deltaX);
      }
      if (direction.includes('w')) {
        newWidth = Math.max(80, startPos.current.width - deltaX);
        newX = startPos.current.nodeX + (startPos.current.width - newWidth);
      }

      // Handle vertical resizing
      if (direction.includes('s')) {
        newHeight = Math.max(40, startPos.current.height + deltaY);
      }
      if (direction.includes('n')) {
        newHeight = Math.max(40, startPos.current.height - deltaY);
        newY = startPos.current.nodeY + (startPos.current.height - newHeight);
      }

      updateNode(node.id, { 
        width: newWidth, 
        height: newHeight,
        position: { x: newX, y: newY },
      });
    };

    const handleMouseUp = () => {
      setIsResizingBox(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [node.id, node.width, node.height, node.position.x, node.position.y, updateNode]);

  // Badge drag (horizontal) handlers - allow moving outside box bounds
  const handleBadgeDragStart = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsDraggingBadge(true);
    startPos.current = { x: e.clientX, y: 0, width: 0, height: 0, offsetX: badgeCfg.offsetX, nodeX: 0, nodeY: 0 };

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPos.current.x;
      // Allow badge to move freely - no bounds restriction
      const newOffsetX = startPos.current.offsetX + deltaX;
      updateNode(node.id, { badgeConfig: { ...badgeCfg, offsetX: newOffsetX } });
    };

    const handleMouseUp = () => {
      setIsDraggingBadge(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [node.id, node.width, badgeCfg, updateNode]);

  // Badge resize handlers - all directions
  type BadgeResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
  
  const handleBadgeResizeStart = useCallback((direction: BadgeResizeDirection) => (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizingBadge(true);
    const offsetY = badgeCfg.offsetY || 0;
    startPos.current = { x: e.clientX, y: e.clientY, width: badgeCfg.width, height: badgeCfg.height, offsetX: badgeCfg.offsetX, nodeX: 0, nodeY: offsetY };

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPos.current.x;
      const deltaY = e.clientY - startPos.current.y;
      
      let newWidth = startPos.current.width;
      let newHeight = startPos.current.height;
      let newOffsetX = startPos.current.offsetX;
      let newOffsetY = startPos.current.nodeY;

      // Handle horizontal resizing
      if (direction.includes('e')) {
        newWidth = Math.max(40, startPos.current.width + deltaX);
      }
      if (direction.includes('w')) {
        const widthChange = deltaX;
        newWidth = Math.max(40, startPos.current.width - widthChange);
        // Adjust offset to keep right edge in place
        newOffsetX = startPos.current.offsetX + (widthChange / 2);
      }

      // Handle vertical resizing
      if (direction.includes('s')) {
        newHeight = Math.max(20, startPos.current.height + deltaY);
      }
      if (direction.includes('n')) {
        const heightChange = deltaY;
        newHeight = Math.max(20, startPos.current.height - heightChange);
        // Adjust offsetY to move badge up when expanding from top
        newOffsetY = startPos.current.nodeY + heightChange;
      }

      updateNode(node.id, { badgeConfig: { ...badgeCfg, width: newWidth, height: newHeight, offsetX: newOffsetX, offsetY: newOffsetY } });
    };

    const handleMouseUp = () => {
      setIsResizingBadge(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [node.id, badgeCfg, updateNode]);

  return (
    <div
      className="relative flex flex-col items-center transition-transform duration-150"
      style={{
        width: node.width,
      }}
    >
      {/* Input handle (top) */}
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white hover:!bg-blue-500 transition-colors"
      />

      {/* Node content */}
      <div
        className={`
          relative flex flex-col items-center justify-center p-3 w-full
          transition-all duration-200 ease-out
          ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        `}
        style={{
          backgroundColor: style.fill,
          borderColor: style.border,
          borderWidth: `${bxStyle.borderWidth}px`,
          borderStyle: bxStyle.borderStyle,
          borderRadius: getBorderRadius(bxStyle.borderRadius),
          boxShadow: isSelected ? `${getShadow(bxStyle.shadow)}, 0 0 0 2px rgba(59, 130, 246, 0.5)` : getShadow(bxStyle.shadow),
          color: style.textColor,
          minHeight: node.height,
        }}
      >
        {/* Title */}
        <div 
          className="leading-tight px-1"
          style={{
            fontSize: getFontSize(txtStyle.fontSize),
            fontWeight: txtStyle.bold ? 600 : 500,
            fontStyle: txtStyle.italic ? 'italic' : 'normal',
            textDecoration: txtStyle.underline ? 'underline' : 'none',
            textAlign: txtStyle.align,
            width: '100%',
          }}
        >
          {title || 'Untitled'}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div className="text-xs text-center mt-0.5 opacity-80">
            {subtitle}
          </div>
        )}

        {/* Box resize handles - all 8 directions */}
        {isSelected && (
          <>
            {/* Corner handles */}
            <div
              className="nodrag nopan absolute top-0 left-0 w-3 h-3 cursor-nw-resize bg-blue-500 rounded-sm opacity-70 hover:opacity-100"
              onMouseDown={handleBoxResizeStart('nw')}
              style={{ transform: 'translate(-50%, -50%)' }}
            />
            <div
              className="nodrag nopan absolute top-0 right-0 w-3 h-3 cursor-ne-resize bg-blue-500 rounded-sm opacity-70 hover:opacity-100"
              onMouseDown={handleBoxResizeStart('ne')}
              style={{ transform: 'translate(50%, -50%)' }}
            />
            <div
              className="nodrag nopan absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize bg-blue-500 rounded-sm opacity-70 hover:opacity-100"
              onMouseDown={handleBoxResizeStart('sw')}
              style={{ transform: 'translate(-50%, 50%)' }}
            />
            <div
              className="nodrag nopan absolute bottom-0 right-0 w-3 h-3 cursor-se-resize bg-blue-500 rounded-sm opacity-70 hover:opacity-100"
              onMouseDown={handleBoxResizeStart('se')}
              style={{ transform: 'translate(50%, 50%)' }}
            />
            
            {/* Edge handles */}
            <div
              className="nodrag nopan absolute top-0 left-1/2 w-6 h-2 cursor-n-resize bg-blue-500 rounded-sm opacity-70 hover:opacity-100"
              onMouseDown={handleBoxResizeStart('n')}
              style={{ transform: 'translate(-50%, -50%)' }}
            />
            <div
              className="nodrag nopan absolute bottom-0 left-1/2 w-6 h-2 cursor-s-resize bg-blue-500 rounded-sm opacity-70 hover:opacity-100"
              onMouseDown={handleBoxResizeStart('s')}
              style={{ transform: 'translate(-50%, 50%)' }}
            />
            <div
              className="nodrag nopan absolute top-1/2 left-0 w-2 h-6 cursor-w-resize bg-blue-500 rounded-sm opacity-70 hover:opacity-100"
              onMouseDown={handleBoxResizeStart('w')}
              style={{ transform: 'translate(-50%, -50%)' }}
            />
            <div
              className="nodrag nopan absolute top-1/2 right-0 w-2 h-6 cursor-e-resize bg-blue-500 rounded-sm opacity-70 hover:opacity-100"
              onMouseDown={handleBoxResizeStart('e')}
              style={{ transform: 'translate(50%, -50%)' }}
            />
          </>
        )}

        {/* Output handle (bottom of main box) */}
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2 !h-2 !bg-gray-500"
        />
      </div>

      {/* Badge/Tag - overlapping the main box by ~30%, can extend outside box */}
      {badge && (
        <div 
          className="relative flex flex-col items-center"
          style={{ 
            marginTop: `${-10 + (badgeCfg.offsetY || 0)}px`,
            transform: `translateX(${badgeCfg.offsetX}px)`,
          }}
        >
          {/* Badge drag handle (move left/right) - larger and more visible */}
          {isSelected && (
            <div
              className="nodrag nopan absolute -top-3 left-1/2 transform -translate-x-1/2 w-8 h-3 cursor-ew-resize bg-blue-500 rounded-sm opacity-80 hover:opacity-100 z-10 flex items-center justify-center"
              onMouseDown={handleBadgeDragStart}
              title="Drag to move badge left/right"
            >
              <div className="flex gap-0.5 pointer-events-none">
                <div className="w-0.5 h-1.5 bg-white rounded-full" />
                <div className="w-0.5 h-1.5 bg-white rounded-full" />
                <div className="w-0.5 h-1.5 bg-white rounded-full" />
              </div>
            </div>
          )}
          
          {/* Badge box overlapping main box */}
          <div
            className="relative flex items-center justify-center rounded-sm border-2 text-xs text-center"
            style={{
              backgroundColor: style.badgeFill,
              borderColor: style.border,
              color: style.badgeTextColor,
              width: badgeCfg.width,
              minHeight: badgeCfg.height,
              padding: '4px 8px',
            }}
          >
            {badge}
            
            {/* Badge resize handles - all 8 directions */}
            {isSelected && (
              <>
                {/* Corner handles */}
                <div
                  className="nodrag nopan absolute top-0 left-0 w-2 h-2 cursor-nw-resize bg-green-500 rounded-sm opacity-70 hover:opacity-100"
                  onMouseDown={handleBadgeResizeStart('nw')}
                  style={{ transform: 'translate(-50%, -50%)' }}
                />
                <div
                  className="nodrag nopan absolute top-0 right-0 w-2 h-2 cursor-ne-resize bg-green-500 rounded-sm opacity-70 hover:opacity-100"
                  onMouseDown={handleBadgeResizeStart('ne')}
                  style={{ transform: 'translate(50%, -50%)' }}
                />
                <div
                  className="nodrag nopan absolute bottom-0 left-0 w-2 h-2 cursor-sw-resize bg-green-500 rounded-sm opacity-70 hover:opacity-100"
                  onMouseDown={handleBadgeResizeStart('sw')}
                  style={{ transform: 'translate(-50%, 50%)' }}
                />
                <div
                  className="nodrag nopan absolute bottom-0 right-0 w-2 h-2 cursor-se-resize bg-green-500 rounded-sm opacity-70 hover:opacity-100"
                  onMouseDown={handleBadgeResizeStart('se')}
                  style={{ transform: 'translate(50%, 50%)' }}
                />
                
                {/* Edge handles */}
                <div
                  className="nodrag nopan absolute top-0 left-1/2 w-4 h-1.5 cursor-n-resize bg-green-500 rounded-sm opacity-70 hover:opacity-100"
                  onMouseDown={handleBadgeResizeStart('n')}
                  style={{ transform: 'translate(-50%, -50%)' }}
                />
                <div
                  className="nodrag nopan absolute bottom-0 left-1/2 w-4 h-1.5 cursor-s-resize bg-green-500 rounded-sm opacity-70 hover:opacity-100"
                  onMouseDown={handleBadgeResizeStart('s')}
                  style={{ transform: 'translate(-50%, 50%)' }}
                />
                <div
                  className="nodrag nopan absolute top-1/2 left-0 w-1.5 h-4 cursor-w-resize bg-green-500 rounded-sm opacity-70 hover:opacity-100"
                  onMouseDown={handleBadgeResizeStart('w')}
                  style={{ transform: 'translate(-50%, -50%)' }}
                />
                <div
                  className="nodrag nopan absolute top-1/2 right-0 w-1.5 h-4 cursor-e-resize bg-green-500 rounded-sm opacity-70 hover:opacity-100"
                  onMouseDown={handleBadgeResizeStart('e')}
                  style={{ transform: 'translate(50%, -50%)' }}
                />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(NodeCard);
