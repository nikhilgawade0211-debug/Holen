// Diagram data types matching CLAUDE.md spec

export interface NodeStyle {
  fill: string;
  border: string;
  textColor: string;
  badgeFill: string;
  badgeTextColor: string;
}

export interface BadgeConfig {
  offsetX: number; // horizontal offset from center
  offsetY: number; // vertical offset (negative = up, positive = down)
  width: number;
  height: number;
}

export interface DiagramNode {
  id: string;
  parentId: string | null;
  title: string;
  subtitle?: string;
  badge?: string;
  badgeConfig?: BadgeConfig;
  style: NodeStyle;
  width: number;
  height: number;
  position: { x: number; y: number };
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  type: 'straight' | 'smoothstep' | 'step';
}

export interface DiagramData {
  schemaVersion: number;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  settings: {
    name: string;
    createdAt: string;
    updatedAt: string;
  };
}

// Color presets matching the image style
export const COLOR_PRESETS: { name: string; style: NodeStyle }[] = [
  {
    name: 'Light Blue',
    style: {
      fill: '#d4e8f2',
      border: '#333333',
      textColor: '#000000',
      badgeFill: '#c0c0c0',
      badgeTextColor: '#333333',
    },
  },
  {
    name: 'Light Pink',
    style: {
      fill: '#f5d5e0',
      border: '#333333',
      textColor: '#000000',
      badgeFill: '#c0c0c0',
      badgeTextColor: '#333333',
    },
  },
  {
    name: 'Light Orange',
    style: {
      fill: '#fce5c5',
      border: '#333333',
      textColor: '#000000',
      badgeFill: '#c0c0c0',
      badgeTextColor: '#333333',
    },
  },
  {
    name: 'Light Green',
    style: {
      fill: '#c8e6c9',
      border: '#333333',
      textColor: '#000000',
      badgeFill: '#c0c0c0',
      badgeTextColor: '#333333',
    },
  },
  {
    name: 'Light Purple',
    style: {
      fill: '#e1bee7',
      border: '#333333',
      textColor: '#000000',
      badgeFill: '#c0c0c0',
      badgeTextColor: '#333333',
    },
  },
  {
    name: 'White',
    style: {
      fill: '#ffffff',
      border: '#333333',
      textColor: '#000000',
      badgeFill: '#c0c0c0',
      badgeTextColor: '#333333',
    },
  },
];

export const DEFAULT_NODE_STYLE = COLOR_PRESETS[0].style;
