'use client';

import React from 'react';
import { useDiagramStore } from '@/store/diagramStore';
import { applyDagreLayout } from '@/services/layoutService';
import { exportToSVG, exportToPNG, exportToHTML } from '@/services/exportService';
import { saveAs } from 'file-saver';

export default function Toolbar() {
  const {
    nodes,
    selectedNodeId,
    diagramName,
    addRootNode,
    addChildNode,
    addSiblingNode,
    deleteNode,
    setNodePositions,
    setDiagramName,
    undo,
    redo,
    saveDiagram,
    loadDiagram,
    clearDiagram,
    history,
    historyIndex,
  } = useDiagramStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleAutoLayout = () => {
    if (nodes.length === 0) return;
    const positions = applyDagreLayout(nodes);
    setNodePositions(positions);
  };

  const handleExportJSON = () => {
    const data = saveDiagram();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    saveAs(blob, `${diagramName.replace(/\s+/g, '_')}.json`);
  };

  const handleImportJSON = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const text = await file.text();
        try {
          const data = JSON.parse(text);
          loadDiagram(data);
        } catch {
          alert('Invalid JSON file');
        }
      }
    };
    input.click();
  };

  const handleExportSVG = async () => {
    const svg = await exportToSVG();
    if (svg) {
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      saveAs(blob, `${diagramName.replace(/\s+/g, '_')}.svg`);
    }
  };

  const handleExportPNG = async () => {
    const dataUrl = await exportToPNG();
    if (dataUrl) {
      saveAs(dataUrl, `${diagramName.replace(/\s+/g, '_')}.png`);
    }
  };

  const handleExportHTML = async () => {
    const html = await exportToHTML(diagramName);
    if (html) {
      const blob = new Blob([html], { type: 'text/html' });
      saveAs(blob, `${diagramName.replace(/\s+/g, '_')}.html`);
    }
  };

  const handleExportPDF = async () => {
    try {
      const svg = await exportToSVG();
      if (!svg) return;

      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ svg, name: diagramName }),
      });

      if (response.ok) {
        const blob = await response.blob();
        saveAs(blob, `${diagramName.replace(/\s+/g, '_')}.pdf`);
      } else {
        alert('Failed to export PDF');
      }
    } catch (err) {
      console.error(err);
      alert('PDF export failed');
    }
  };

  const handleExportDOCX = async () => {
    try {
      const dataUrl = await exportToPNG();
      if (!dataUrl) return;

      // Convert data URL to base64
      const base64 = dataUrl.split(',')[1];

      const response = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, name: diagramName }),
      });

      if (response.ok) {
        const blob = await response.blob();
        saveAs(blob, `${diagramName.replace(/\s+/g, '_')}.docx`);
      } else {
        alert('Failed to export DOCX');
      }
    } catch (err) {
      console.error(err);
      alert('DOCX export failed');
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-100 border-b border-gray-300">
      {/* Diagram name */}
      <input
        type="text"
        value={diagramName}
        onChange={(e) => setDiagramName(e.target.value)}
        className="px-2 py-1 border rounded text-sm font-medium w-48"
      />

      <div className="w-px h-6 bg-gray-300" />

      {/* Node operations */}
      <button
        onClick={addRootNode}
        className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
      >
        + Root
      </button>
      <button
        onClick={() => selectedNodeId && addChildNode(selectedNodeId)}
        disabled={!selectedNodeId}
        className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        + Child
      </button>
      <button
        onClick={() => selectedNodeId && addSiblingNode(selectedNodeId)}
        disabled={!selectedNodeId}
        className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        + Sibling
      </button>
      <button
        onClick={() => selectedNodeId && deleteNode(selectedNodeId)}
        disabled={!selectedNodeId}
        className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Delete
      </button>

      <div className="w-px h-6 bg-gray-300" />

      {/* Layout */}
      <button
        onClick={handleAutoLayout}
        disabled={nodes.length === 0}
        className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Auto Layout
      </button>

      {/* Undo/Redo */}
      <button
        onClick={undo}
        disabled={!canUndo}
        className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Undo
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Redo
      </button>

      <div className="w-px h-6 bg-gray-300" />

      {/* Save/Load */}
      <button
        onClick={handleExportJSON}
        className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
      >
        Save JSON
      </button>
      <button
        onClick={handleImportJSON}
        className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
      >
        Load JSON
      </button>
      <button
        onClick={clearDiagram}
        className="px-3 py-1.5 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
      >
        Clear
      </button>

      <div className="w-px h-6 bg-gray-300" />

      {/* Export formats */}
      <div className="relative group">
        <button className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded hover:bg-orange-700">
          Export ▼
        </button>
        <div className="absolute top-full left-0 mt-1 bg-white border rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 min-w-[120px]">
          <button
            onClick={handleExportSVG}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
            SVG
          </button>
          <button
            onClick={handleExportPNG}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
            PNG
          </button>
          <button
            onClick={handleExportHTML}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
            HTML
          </button>
          <button
            onClick={handleExportPDF}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
            PDF
          </button>
          <button
            onClick={handleExportDOCX}
            className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
          >
            DOCX
          </button>
        </div>
      </div>
    </div>
  );
}
