'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDiagramStore } from '@/store/diagramStore';
import { applyDagreLayout } from '@/services/layoutService';
import { 
  exportToSVG, 
  exportToPNG, 
  exportToJPEG, 
  exportToWebP, 
  exportToHTML 
} from '@/services/exportService';
import { ExportQuality } from '@/types/diagram';
import { saveAs } from 'file-saver';

export default function Toolbar() {
  const {
    nodes,
    selectedNodeId,
    selectedNodeIds,
    diagramName,
    addRootNode,
    addChildNode,
    addSiblingNode,
    deleteNode,
    deleteSelectedNodes,
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

  const [exportQuality, setExportQuality] = useState<ExportQuality>('high');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        exportMenuRef.current && 
        !exportMenuRef.current.contains(target) &&
        exportButtonRef.current &&
        !exportButtonRef.current.contains(target)
      ) {
        setShowExportMenu(false);
      }
    }
    
    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

  // Update menu position when shown
  useEffect(() => {
    if (showExportMenu && exportButtonRef.current) {
      const rect = exportButtonRef.current.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 8,
        left: rect.right - 220, // Align right edge of menu with right edge of button
      });
    }
  }, [showExportMenu]);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;
  const hasSelection = selectedNodeIds.length > 0;
  const firstSelectedId = selectedNodeIds[0] || selectedNodeId;

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
    setIsExporting(true);
    try {
      const svg = await exportToSVG();
      if (svg) {
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        saveAs(blob, `${diagramName.replace(/\s+/g, '_')}.svg`);
      }
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const handleExportPNG = async () => {
    setIsExporting(true);
    try {
      const dataUrl = await exportToPNG(exportQuality);
      if (dataUrl) {
        saveAs(dataUrl, `${diagramName.replace(/\s+/g, '_')}.png`);
      }
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const handleExportJPEG = async () => {
    setIsExporting(true);
    try {
      const dataUrl = await exportToJPEG(exportQuality);
      if (dataUrl) {
        saveAs(dataUrl, `${diagramName.replace(/\s+/g, '_')}.jpg`);
      }
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const handleExportWebP = async () => {
    setIsExporting(true);
    try {
      const dataUrl = await exportToWebP(exportQuality);
      if (dataUrl) {
        saveAs(dataUrl, `${diagramName.replace(/\s+/g, '_')}.webp`);
      }
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const handleExportHTML = async () => {
    setIsExporting(true);
    try {
      const html = await exportToHTML(diagramName);
      if (html) {
        const blob = new Blob([html], { type: 'text/html' });
        saveAs(blob, `${diagramName.replace(/\s+/g, '_')}.html`);
      }
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const dataUrl = await exportToPNG(exportQuality);
      if (!dataUrl) return;

      // Get image dimensions
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      const base64 = dataUrl.split(',')[1];

      const response = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageBase64: base64, 
          name: diagramName,
          width: img.width,
          height: img.height,
        }),
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
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const handleExportDOCX = async () => {
    setIsExporting(true);
    try {
      // Get diagram data from store for editable export
      const diagramData = saveDiagram();

      const response = await fetch('/api/export/docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nodes: diagramData.nodes, 
          edges: diagramData.edges, 
          name: diagramName 
        }),
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
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const handleExportPPTX = async () => {
    setIsExporting(true);
    try {
      // Get diagram data from store for PowerPoint export
      const diagramData = saveDiagram();

      const response = await fetch('/api/export/pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nodes: diagramData.nodes, 
          edges: diagramData.edges, 
          name: diagramName 
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        saveAs(blob, `${diagramName.replace(/\s+/g, '_')}.pptx`);
      } else {
        alert('Failed to export PPTX');
      }
    } catch (err) {
      console.error(err);
      alert('PPTX export failed');
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const handleDelete = () => {
    if (selectedNodeIds.length > 1) {
      deleteSelectedNodes();
    } else if (firstSelectedId) {
      deleteNode(firstSelectedId);
    }
  };

  const buttonBase = "px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 ease-out transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1";
  const primaryBtn = `${buttonBase} bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 focus:ring-blue-400 shadow-sm hover:shadow`;
  const successBtn = `${buttonBase} bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:from-emerald-600 hover:to-emerald-700 focus:ring-emerald-400 shadow-sm hover:shadow`;
  const dangerBtn = `${buttonBase} bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus:ring-red-400 shadow-sm hover:shadow`;
  const secondaryBtn = `${buttonBase} bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 focus:ring-slate-400`;
  const disabledClass = "opacity-50 cursor-not-allowed hover:shadow-none";

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-200 shadow-sm">
      {/* Diagram name */}
      <input
        type="text"
        value={diagramName}
        onChange={(e) => setDiagramName(e.target.value)}
        className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium w-48 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
      />

      <div className="w-px h-6 bg-slate-200" />

      {/* Node operations */}
      <div className="flex items-center gap-1.5">
        <button onClick={addRootNode} className={primaryBtn}>
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Root
          </span>
        </button>
        <button
          onClick={() => firstSelectedId && addChildNode(firstSelectedId)}
          disabled={!firstSelectedId}
          className={`${successBtn} ${!firstSelectedId ? disabledClass : ''}`}
        >
          + Child
        </button>
        <button
          onClick={() => firstSelectedId && addSiblingNode(firstSelectedId)}
          disabled={!firstSelectedId}
          className={`${secondaryBtn} ${!firstSelectedId ? disabledClass : ''}`}
        >
          + Sibling
        </button>
        <button
          onClick={handleDelete}
          disabled={!hasSelection && !firstSelectedId}
          className={`${dangerBtn} ${!hasSelection && !firstSelectedId ? disabledClass : ''}`}
        >
          {selectedNodeIds.length > 1 ? `Delete (${selectedNodeIds.length})` : 'Delete'}
        </button>
      </div>

      <div className="w-px h-6 bg-slate-200" />

      {/* Layout & History */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handleAutoLayout}
          disabled={nodes.length === 0}
          className={`${secondaryBtn} ${nodes.length === 0 ? disabledClass : ''}`}
        >
          <span className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
            </svg>
            Layout
          </span>
        </button>
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`${secondaryBtn} ${!canUndo ? disabledClass : ''}`}
          title="Undo"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`${secondaryBtn} ${!canRedo ? disabledClass : ''}`}
          title="Redo"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
          </svg>
        </button>
      </div>

      <div className="w-px h-6 bg-slate-200" />

      {/* Save/Load */}
      <div className="flex items-center gap-1.5">
        <button onClick={handleExportJSON} className={secondaryBtn}>
          Save
        </button>
        <button onClick={handleImportJSON} className={secondaryBtn}>
          Load
        </button>
        <button onClick={clearDiagram} className={`${secondaryBtn} text-slate-500`}>
          Clear
        </button>
      </div>

      <div className="w-px h-6 bg-slate-200" />

      {/* Export button */}
      <button 
        ref={exportButtonRef}
        onClick={() => setShowExportMenu(!showExportMenu)}
        className={`${buttonBase} bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 focus:ring-orange-400 shadow-sm hover:shadow`}
      >
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Export
          <svg className={`w-3 h-3 transition-transform ${showExportMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>
      
      {/* Export menu portal */}
      {showExportMenu && typeof document !== 'undefined' && createPortal(
        <div 
          ref={exportMenuRef}
          className="fixed bg-white border border-slate-200 rounded-xl shadow-2xl min-w-[220px] overflow-hidden"
          style={{ 
            zIndex: 99999,
            top: menuPosition.top,
            left: Math.max(8, menuPosition.left), // Prevent going off-screen left
          }}
        >
          {/* Quality selector */}
          <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
            <label className="block text-xs font-medium text-slate-500 mb-1">Quality</label>
            <div className="flex gap-1">
              {(['low', 'medium', 'high'] as ExportQuality[]).map((q) => (
                <button
                  key={q}
                  onClick={(e) => { e.stopPropagation(); setExportQuality(q); }}
                  className={`flex-1 px-2 py-1 text-xs rounded-md transition-all ${
                    exportQuality === q 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {q.charAt(0).toUpperCase() + q.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          {/* Export options */}
          <div className="py-1">
            <div className="px-3 py-1 text-xs font-medium text-slate-400">Images</div>
            <button
              onClick={(e) => { e.stopPropagation(); handleExportPNG(); }}
              disabled={isExporting}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <span className="w-6 h-6 rounded bg-pink-100 text-pink-600 flex items-center justify-center text-xs font-bold">P</span>
              PNG (Transparent)
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleExportJPEG(); }}
              disabled={isExporting}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">J</span>
              JPEG (Smaller)
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleExportWebP(); }}
              disabled={isExporting}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <span className="w-6 h-6 rounded bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">W</span>
              WebP (Modern)
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleExportSVG(); }}
              disabled={isExporting}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <span className="w-6 h-6 rounded bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">S</span>
              SVG (Vector)
            </button>
            
            <div className="my-1 border-t border-slate-100" />
            <div className="px-3 py-1 text-xs font-medium text-slate-400">Documents</div>
            <button
              onClick={(e) => { e.stopPropagation(); handleExportPDF(); }}
              disabled={isExporting}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <span className="w-6 h-6 rounded bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">P</span>
              PDF
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleExportDOCX(); }}
              disabled={isExporting}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <span className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">D</span>
              DOCX
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleExportPPTX(); }}
              disabled={isExporting}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <span className="w-6 h-6 rounded bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">PP</span>
              PPTX (PowerPoint)
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleExportHTML(); }}
              disabled={isExporting}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              <span className="w-6 h-6 rounded bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-bold">H</span>
              HTML
            </button>
          </div>
          
          {isExporting && (
            <div className="px-3 py-2 border-t border-slate-100 bg-blue-50 text-blue-600 text-xs flex items-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Exporting...
            </div>
          )}
          
          {/* Close button */}
          <div className="px-3 py-2 border-t border-slate-100 bg-slate-50">
            <button
              onClick={() => setShowExportMenu(false)}
              className="w-full px-3 py-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>,
        document.body
      )}
      
      {/* Selection indicator */}
      {selectedNodeIds.length > 1 && (
        <div className="ml-auto px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full animate-in fade-in duration-200">
          {selectedNodeIds.length} nodes selected
        </div>
      )}
    </div>
  );
}
