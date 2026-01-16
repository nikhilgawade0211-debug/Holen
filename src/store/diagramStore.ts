import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  DiagramNode,
  DiagramEdge,
  DiagramData,
  DEFAULT_NODE_STYLE,
  NodeStyle,
  TextStyle,
  BoxStyle,
  EdgeStyle,
  DEFAULT_TEXT_STYLE,
  DEFAULT_BOX_STYLE,
  DEFAULT_EDGE_STYLE,
} from '@/types/diagram';

const STORAGE_KEY = 'holen-diagram';

interface HistoryState {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

interface DiagramStore {
  // State
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  selectedNodeId: string | null;
  selectedNodeIds: string[]; // Multi-select support
  selectedEdgeId: string | null; // Edge selection
  diagramName: string;

  // History for undo/redo
  history: HistoryState[];
  historyIndex: number;

  // Actions
  setSelectedNode: (id: string | null) => void;
  setSelectedNodes: (ids: string[]) => void;
  toggleNodeSelection: (id: string) => void;
  addToSelection: (ids: string[]) => void;
  clearSelection: () => void;
  addRootNode: () => void;
  addChildNode: (parentId: string) => void;
  addSiblingNode: (siblingId: string) => void;
  updateNode: (id: string, updates: Partial<DiagramNode>) => void;
  updateSelectedNodes: (updates: Partial<DiagramNode>) => void;
  deleteNode: (id: string) => void;
  deleteSelectedNodes: () => void;
  moveSelectedNodes: (deltaX: number, deltaY: number) => void;
  setSelectedEdge: (id: string | null) => void;
  updateEdge: (id: string, updates: Partial<DiagramEdge>) => void;
  deleteEdge: (id: string) => void;
  setNodePositions: (positions: { id: string; x: number; y: number }[]) => void;
  setDiagramName: (name: string) => void;

  // History actions
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;

  // Persistence
  saveDiagram: () => DiagramData;
  loadDiagram: (data: DiagramData) => void;
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => boolean;
  clearDiagram: () => void;

  // Computed
  getNodeById: (id: string) => DiagramNode | undefined;
  getEdgeById: (id: string) => DiagramEdge | undefined;
  getChildNodes: (parentId: string) => DiagramNode[];
  getRootNodes: () => DiagramNode[];
  getSelectedNodes: () => DiagramNode[];
  getSelectedEdge: () => DiagramEdge | undefined;
}

function deriveEdges(nodes: DiagramNode[]): DiagramEdge[] {
  return nodes
    .filter((n) => n.parentId !== null)
    .map((n) => ({
      id: `edge-${n.parentId}-${n.id}`,
      source: n.parentId!,
      target: n.id,
      type: 'smoothstep' as const,
      style: DEFAULT_EDGE_STYLE,
    }));
}

function createNode(
  parentId: string | null,
  title: string = 'New Node',
  style: NodeStyle = DEFAULT_NODE_STYLE,
  textStyle: TextStyle = DEFAULT_TEXT_STYLE,
  boxStyle: BoxStyle = DEFAULT_BOX_STYLE
): DiagramNode {
  return {
    id: uuidv4(),
    parentId,
    title,
    subtitle: '',
    badge: '',
    style,
    textStyle,
    boxStyle,
    width: 160,
    height: 80,
    position: { x: 0, y: 0 },
  };
}

export const useDiagramStore = create<DiagramStore>((set, get) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedNodeIds: [],
  selectedEdgeId: null,
  diagramName: 'Untitled Diagram',
  history: [],
  historyIndex: -1,

  setSelectedNode: (id) => set({ 
    selectedNodeId: id,
    selectedNodeIds: id ? [id] : [],
  }),

  setSelectedNodes: (ids) => set({
    selectedNodeIds: ids,
    selectedNodeId: ids.length === 1 ? ids[0] : (ids.length > 0 ? ids[0] : null),
  }),

  toggleNodeSelection: (id) => {
    const { selectedNodeIds } = get();
    const isSelected = selectedNodeIds.includes(id);
    const newIds = isSelected
      ? selectedNodeIds.filter((nid) => nid !== id)
      : [...selectedNodeIds, id];
    set({
      selectedNodeIds: newIds,
      selectedNodeId: newIds.length === 1 ? newIds[0] : (newIds.length > 0 ? newIds[0] : null),
    });
  },

  addToSelection: (ids) => {
    const { selectedNodeIds } = get();
    const newIds = [...new Set([...selectedNodeIds, ...ids])];
    set({
      selectedNodeIds: newIds,
      selectedNodeId: newIds.length === 1 ? newIds[0] : (newIds.length > 0 ? newIds[0] : null),
    });
  },

  clearSelection: () => set({
    selectedNodeId: null,
    selectedNodeIds: [],
  }),

  addRootNode: () => {
    get().saveToHistory();
    const node = createNode(null, 'Root Node');
    node.position = { x: 400, y: 50 };
    set((state) => ({
      nodes: [...state.nodes, node],
      edges: deriveEdges([...state.nodes, node]),
      selectedNodeId: node.id,
    }));
    get().saveToLocalStorage();
  },

  addChildNode: (parentId) => {
    get().saveToHistory();
    const parent = get().getNodeById(parentId);
    if (!parent) return;

    const node = createNode(parentId, 'Child Node', parent.style);
    node.position = {
      x: parent.position.x,
      y: parent.position.y + 120,
    };

    set((state) => ({
      nodes: [...state.nodes, node],
      edges: deriveEdges([...state.nodes, node]),
      selectedNodeId: node.id,
    }));
    get().saveToLocalStorage();
  },

  addSiblingNode: (siblingId) => {
    get().saveToHistory();
    const sibling = get().getNodeById(siblingId);
    if (!sibling) return;

    const node = createNode(
      sibling.parentId,
      'Sibling Node',
      sibling.style
    );
    node.position = {
      x: sibling.position.x + 180,
      y: sibling.position.y,
    };

    set((state) => ({
      nodes: [...state.nodes, node],
      edges: deriveEdges([...state.nodes, node]),
      selectedNodeId: node.id,
    }));
    get().saveToLocalStorage();
  },

  updateNode: (id, updates) => {
    get().saveToHistory();
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === id ? { ...n, ...updates } : n
      ),
    }));
    get().saveToLocalStorage();
  },

  updateSelectedNodes: (updates) => {
    const { selectedNodeIds } = get();
    if (selectedNodeIds.length === 0) return;
    get().saveToHistory();
    set((state) => ({
      nodes: state.nodes.map((n) =>
        selectedNodeIds.includes(n.id) ? { ...n, ...updates } : n
      ),
    }));
    get().saveToLocalStorage();
  },

  deleteNode: (id) => {
    get().saveToHistory();
    const nodesToDelete = new Set<string>();
    const collectDescendants = (nodeId: string) => {
      nodesToDelete.add(nodeId);
      get()
        .getChildNodes(nodeId)
        .forEach((child) => collectDescendants(child.id));
    };
    collectDescendants(id);

    set((state) => {
      const newNodes = state.nodes.filter((n) => !nodesToDelete.has(n.id));
      return {
        nodes: newNodes,
        edges: deriveEdges(newNodes),
        selectedNodeId:
          state.selectedNodeId && nodesToDelete.has(state.selectedNodeId)
            ? null
            : state.selectedNodeId,
        selectedNodeIds: state.selectedNodeIds.filter((nid) => !nodesToDelete.has(nid)),
      };
    });
    get().saveToLocalStorage();
  },

  deleteSelectedNodes: () => {
    const { selectedNodeIds } = get();
    if (selectedNodeIds.length === 0) return;
    get().saveToHistory();
    
    const nodesToDelete = new Set<string>();
    const collectDescendants = (nodeId: string) => {
      nodesToDelete.add(nodeId);
      get()
        .getChildNodes(nodeId)
        .forEach((child) => collectDescendants(child.id));
    };
    selectedNodeIds.forEach((id) => collectDescendants(id));

    set((state) => {
      const newNodes = state.nodes.filter((n) => !nodesToDelete.has(n.id));
      return {
        nodes: newNodes,
        edges: deriveEdges(newNodes),
        selectedNodeId: null,
        selectedNodeIds: [],
      };
    });
    get().saveToLocalStorage();
  },

  moveSelectedNodes: (deltaX, deltaY) => {
    const { selectedNodeIds } = get();
    if (selectedNodeIds.length === 0) return;
    
    set((state) => ({
      nodes: state.nodes.map((n) =>
        selectedNodeIds.includes(n.id)
          ? { ...n, position: { x: n.position.x + deltaX, y: n.position.y + deltaY } }
          : n
      ),
    }));
  },

  setSelectedEdge: (id) => set({
    selectedEdgeId: id,
    // Clear node selection when selecting an edge
    selectedNodeId: null,
    selectedNodeIds: [],
  }),

  updateEdge: (id, updates) => {
    get().saveToHistory();
    set((state) => ({
      edges: state.edges.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    }));
    get().saveToLocalStorage();
  },

  deleteEdge: (id) => {
    get().saveToHistory();
    // Find the edge to get the target node
    const edge = get().edges.find((e) => e.id === id);
    if (!edge) return;
    
    // Remove parent reference from the target node (breaks the connection)
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === edge.target ? { ...n, parentId: null } : n
      ),
      edges: state.edges.filter((e) => e.id !== id),
      selectedEdgeId: null,
    }));
    get().saveToLocalStorage();
  },

  setNodePositions: (positions) => {
    set((state) => ({
      nodes: state.nodes.map((n) => {
        const pos = positions.find((p) => p.id === n.id);
        return pos ? { ...n, position: { x: pos.x, y: pos.y } } : n;
      }),
    }));
    get().saveToLocalStorage();
  },

  setDiagramName: (name) => {
    set({ diagramName: name });
    get().saveToLocalStorage();
  },

  saveToHistory: () => {
    const { nodes, edges, history, historyIndex } = get();
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });
    // Keep max 50 history states
    if (newHistory.length > 50) newHistory.shift();
    set({ history: newHistory, historyIndex: newHistory.length - 1 });
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      set({
        nodes: prevState.nodes,
        edges: prevState.edges,
        historyIndex: historyIndex - 1,
      });
      get().saveToLocalStorage();
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      set({
        nodes: nextState.nodes,
        edges: nextState.edges,
        historyIndex: historyIndex + 1,
      });
      get().saveToLocalStorage();
    }
  },

  saveDiagram: () => {
    const { nodes, edges, diagramName } = get();
    return {
      schemaVersion: 1,
      nodes,
      edges,
      settings: {
        name: diagramName,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
  },

  loadDiagram: (data) => {
    set({
      nodes: data.nodes,
      edges: data.edges,
      diagramName: data.settings.name,
      selectedNodeId: null,
      history: [],
      historyIndex: -1,
    });
    get().saveToLocalStorage();
  },

  saveToLocalStorage: () => {
    if (typeof window === 'undefined') return;
    const data = get().saveDiagram();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  loadFromLocalStorage: () => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved) as DiagramData;
        get().loadDiagram(data);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  },

  clearDiagram: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedNodeIds: [],
      selectedEdgeId: null,
      diagramName: 'Untitled Diagram',
      history: [],
      historyIndex: -1,
    });
    get().saveToLocalStorage();
  },

  getNodeById: (id) => get().nodes.find((n) => n.id === id),
  getEdgeById: (id) => get().edges.find((e) => e.id === id),
  getChildNodes: (parentId) =>
    get().nodes.filter((n) => n.parentId === parentId),
  getRootNodes: () => get().nodes.filter((n) => n.parentId === null),
  getSelectedNodes: () => {
    const { nodes, selectedNodeIds } = get();
    return nodes.filter((n) => selectedNodeIds.includes(n.id));
  },
  getSelectedEdge: () => {
    const { edges, selectedEdgeId } = get();
    return edges.find((e) => e.id === selectedEdgeId);
  },
}));
