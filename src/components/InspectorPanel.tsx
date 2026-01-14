'use client';

import React from 'react';
import { useDiagramStore } from '@/store/diagramStore';
import { COLOR_PRESETS, NodeStyle } from '@/types/diagram';

export default function InspectorPanel() {
  const { nodes, selectedNodeId, updateNode } = useDiagramStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="w-72 bg-gray-50 border-l border-gray-300 p-4">
        <p className="text-gray-500 text-sm">Select a node to edit its properties.</p>
      </div>
    );
  }

  const handleTitleChange = (value: string) => {
    updateNode(selectedNode.id, { title: value });
  };

  const handleSubtitleChange = (value: string) => {
    updateNode(selectedNode.id, { subtitle: value });
  };

  const handleBadgeChange = (value: string) => {
    updateNode(selectedNode.id, { badge: value });
  };

  const handleColorChange = (style: NodeStyle) => {
    updateNode(selectedNode.id, { style });
  };

  const handleSizeChange = (width: number, height: number) => {
    updateNode(selectedNode.id, { width, height });
  };

  return (
    <div className="w-72 bg-gray-50 border-l border-gray-300 p-4 overflow-y-auto">
      <h2 className="font-bold text-lg mb-4">Node Properties</h2>

      {/* Title */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          type="text"
          value={selectedNode.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm"
        />
      </div>

      {/* Subtitle */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Subtitle
        </label>
        <input
          type="text"
          value={selectedNode.subtitle || ''}
          onChange={(e) => handleSubtitleChange(e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm"
          placeholder="Optional"
        />
      </div>

      {/* Badge */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Badge / Role
        </label>
        <input
          type="text"
          value={selectedNode.badge || ''}
          onChange={(e) => handleBadgeChange(e.target.value)}
          className="w-full px-3 py-2 border rounded text-sm"
          placeholder="e.g., Manager, Lead"
        />
      </div>

      {/* Color presets */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Color
        </label>
        <div className="grid grid-cols-3 gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.name}
              onClick={() => handleColorChange(preset.style)}
              className={`
                h-10 rounded border-2 transition-all
                ${selectedNode.style.fill === preset.style.fill
                  ? 'border-blue-600 ring-2 ring-blue-300'
                  : 'border-gray-300 hover:border-gray-400'
                }
              `}
              style={{ backgroundColor: preset.style.fill }}
              title={preset.name}
            />
          ))}
        </div>
      </div>

      {/* Size */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Size
        </label>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Width</label>
            <input
              type="number"
              value={selectedNode.width}
              onChange={(e) =>
                handleSizeChange(Number(e.target.value), selectedNode.height)
              }
              className="w-full px-2 py-1 border rounded text-sm"
              min={80}
              max={400}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">Height</label>
            <input
              type="number"
              value={selectedNode.height}
              onChange={(e) =>
                handleSizeChange(selectedNode.width, Number(e.target.value))
              }
              className="w-full px-2 py-1 border rounded text-sm"
              min={40}
              max={300}
            />
          </div>
        </div>
      </div>

      {/* Node ID (readonly) */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Node ID
        </label>
        <input
          type="text"
          value={selectedNode.id}
          readOnly
          className="w-full px-3 py-2 border rounded text-sm bg-gray-100 text-gray-500"
        />
      </div>
    </div>
  );
}
