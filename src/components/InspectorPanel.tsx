'use client';

import React from 'react';
import { useDiagramStore } from '@/store/diagramStore';
import { 
  COLOR_PRESETS, 
  NodeStyle, 
  TextStyle, 
  BoxStyle,
  DEFAULT_TEXT_STYLE,
  DEFAULT_BOX_STYLE,
} from '@/types/diagram';

export default function InspectorPanel() {
  const { nodes, selectedNodeIds, updateNode, updateSelectedNodes, getSelectedNodes } = useDiagramStore();

  const selectedNodes = getSelectedNodes();
  const isMultiSelect = selectedNodes.length > 1;
  const selectedNode = selectedNodes[0];

  if (selectedNodes.length === 0) {
    return (
      <div className="w-80 bg-white/80 backdrop-blur-sm border-l border-slate-200 p-5 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        </div>
        <p className="text-slate-500 text-sm">Select a node to edit its properties</p>
        <p className="text-slate-400 text-xs mt-1">Use Ctrl/Cmd+click for multi-select</p>
      </div>
    );
  }

  const handleUpdate = (updates: Partial<typeof selectedNode>) => {
    if (isMultiSelect) {
      updateSelectedNodes(updates);
    } else {
      updateNode(selectedNode.id, updates);
    }
  };

  const handleTextStyleChange = (key: keyof TextStyle, value: TextStyle[keyof TextStyle]) => {
    const currentStyle = selectedNode.textStyle || DEFAULT_TEXT_STYLE;
    handleUpdate({ textStyle: { ...currentStyle, [key]: value } });
  };

  const handleBoxStyleChange = (key: keyof BoxStyle, value: BoxStyle[keyof BoxStyle]) => {
    const currentStyle = selectedNode.boxStyle || DEFAULT_BOX_STYLE;
    handleUpdate({ boxStyle: { ...currentStyle, [key]: value } });
  };

  const textStyle = selectedNode.textStyle || DEFAULT_TEXT_STYLE;
  const boxStyle = selectedNode.boxStyle || DEFAULT_BOX_STYLE;

  const sectionClass = "mb-5 pb-5 border-b border-slate-100 last:border-0";
  const labelClass = "block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2";
  const inputClass = "w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all";
  const toggleBtnClass = (active: boolean) => `flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${active ? 'bg-blue-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`;

  return (
    <div className="w-80 bg-white/80 backdrop-blur-sm border-l border-slate-200 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm px-5 py-4 border-b border-slate-100 z-10">
        <h2 className="font-bold text-lg text-slate-800">
          {isMultiSelect ? `${selectedNodes.length} Nodes Selected` : 'Node Properties'}
        </h2>
        {isMultiSelect && (
          <p className="text-xs text-slate-500 mt-1">Changes apply to all selected nodes</p>
        )}
      </div>

      <div className="p-5">
        {/* Content Section */}
        {!isMultiSelect && (
          <div className={sectionClass}>
            <label className={labelClass}>Content</label>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Title</label>
                <input
                  type="text"
                  value={selectedNode.title}
                  onChange={(e) => handleUpdate({ title: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={selectedNode.subtitle || ''}
                  onChange={(e) => handleUpdate({ subtitle: e.target.value })}
                  className={inputClass}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Badge / Role</label>
                <input
                  type="text"
                  value={selectedNode.badge || ''}
                  onChange={(e) => handleUpdate({ badge: e.target.value })}
                  className={inputClass}
                  placeholder="e.g., Manager, Lead"
                />
              </div>
            </div>
          </div>
        )}

        {/* Text Formatting */}
        <div className={sectionClass}>
          <label className={labelClass}>Text Format</label>
          <div className="space-y-3">
            {/* Bold / Italic / Underline */}
            <div className="flex gap-1">
              <button
                onClick={() => handleTextStyleChange('bold', !textStyle.bold)}
                className={toggleBtnClass(textStyle.bold)}
                title="Bold"
              >
                <span className="font-bold">B</span>
              </button>
              <button
                onClick={() => handleTextStyleChange('italic', !textStyle.italic)}
                className={toggleBtnClass(textStyle.italic)}
                title="Italic"
              >
                <span className="italic">I</span>
              </button>
              <button
                onClick={() => handleTextStyleChange('underline', !textStyle.underline)}
                className={toggleBtnClass(textStyle.underline)}
                title="Underline"
              >
                <span className="underline">U</span>
              </button>
            </div>
            
            {/* Font Size */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Font Size</label>
              <div className="flex gap-1">
                {(['xs', 'sm', 'base', 'lg', 'xl'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => handleTextStyleChange('fontSize', size)}
                    className={toggleBtnClass(textStyle.fontSize === size)}
                  >
                    {size.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Alignment */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Alignment</label>
              <div className="flex gap-1">
                {(['left', 'center', 'right'] as const).map((align) => (
                  <button
                    key={align}
                    onClick={() => handleTextStyleChange('align', align)}
                    className={toggleBtnClass(textStyle.align === align)}
                  >
                    <svg className="w-4 h-4 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {align === 'left' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h14" />}
                      {align === 'center' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M7 12h10M5 18h14" />}
                      {align === 'right' && <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M10 12h10M6 18h14" />}
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Box Styling */}
        <div className={sectionClass}>
          <label className={labelClass}>Box Style</label>
          <div className="space-y-3">
            {/* Border Width */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Border Width</label>
              <div className="flex gap-1">
                {([1, 2, 3, 4] as const).map((width) => (
                  <button
                    key={width}
                    onClick={() => handleBoxStyleChange('borderWidth', width)}
                    className={toggleBtnClass(boxStyle.borderWidth === width)}
                  >
                    {width}px
                  </button>
                ))}
              </div>
            </div>

            {/* Border Style */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Border Style</label>
              <div className="flex gap-1">
                {(['solid', 'dashed', 'dotted'] as const).map((style) => (
                  <button
                    key={style}
                    onClick={() => handleBoxStyleChange('borderStyle', style)}
                    className={toggleBtnClass(boxStyle.borderStyle === style)}
                  >
                    <span className="capitalize">{style}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Border Radius */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Corner Radius</label>
              <div className="flex gap-1">
                {(['none', 'sm', 'md', 'lg', 'full'] as const).map((radius) => (
                  <button
                    key={radius}
                    onClick={() => handleBoxStyleChange('borderRadius', radius)}
                    className={toggleBtnClass(boxStyle.borderRadius === radius)}
                  >
                    {radius === 'none' ? '□' : radius === 'full' ? '○' : radius.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Shadow */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Shadow</label>
              <div className="flex gap-1">
                {(['none', 'sm', 'md', 'lg'] as const).map((shadow) => (
                  <button
                    key={shadow}
                    onClick={() => handleBoxStyleChange('shadow', shadow)}
                    className={toggleBtnClass(boxStyle.shadow === shadow)}
                  >
                    {shadow === 'none' ? 'None' : shadow.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Color */}
        <div className={sectionClass}>
          <label className={labelClass}>Color</label>
          <div className="grid grid-cols-3 gap-2">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => handleUpdate({ style: preset.style })}
                className={`
                  h-10 rounded-lg border-2 transition-all duration-200 transform hover:scale-105
                  ${selectedNode.style.fill === preset.style.fill
                    ? 'border-blue-500 ring-2 ring-blue-200 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                  }
                `}
                style={{ backgroundColor: preset.style.fill }}
                title={preset.name}
              />
            ))}
          </div>
        </div>

        {/* Size */}
        {!isMultiSelect && (
          <div className={sectionClass}>
            <label className={labelClass}>Size</label>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Width</label>
                <input
                  type="number"
                  value={selectedNode.width}
                  onChange={(e) => handleUpdate({ width: Number(e.target.value) })}
                  className={inputClass}
                  min={80}
                  max={400}
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs text-slate-500 mb-1">Height</label>
                <input
                  type="number"
                  value={selectedNode.height}
                  onChange={(e) => handleUpdate({ height: Number(e.target.value) })}
                  className={inputClass}
                  min={40}
                  max={300}
                />
              </div>
            </div>
          </div>
        )}

        {/* Node ID */}
        {!isMultiSelect && (
          <div>
            <label className={labelClass}>Node ID</label>
            <input
              type="text"
              value={selectedNode.id}
              readOnly
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-400 font-mono"
            />
          </div>
        )}
      </div>
    </div>
  );
}
