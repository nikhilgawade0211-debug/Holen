'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Toolbar from '@/components/Toolbar';
import InspectorPanel from '@/components/InspectorPanel';
import { useDiagramStore } from '@/store/diagramStore';

// Dynamic import to avoid SSR issues with React Flow
const DiagramCanvas = dynamic(() => import('@/components/DiagramCanvas'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-gray-100">
      <div className="text-gray-500">Loading diagram editor...</div>
    </div>
  ),
});

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const loadFromLocalStorage = useDiagramStore((s) => s.loadFromLocalStorage);

  useEffect(() => {
    setMounted(true);
    loadFromLocalStorage();
  }, [loadFromLocalStorage]);

  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar */}
      <Toolbar />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 relative">
          <DiagramCanvas />
        </div>

        {/* Inspector */}
        <InspectorPanel />
      </div>
    </div>
  );
}
