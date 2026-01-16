// Diagram data types matching CLAUDE.md spec

export interface TextStyle {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  align: 'left' | 'center' | 'right';
}

export interface BoxStyle {
  borderWidth: 1 | 2 | 3 | 4;
  borderStyle: 'solid' | 'dashed' | 'dotted';
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  shadow: 'none' | 'sm' | 'md' | 'lg';
}

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
  textStyle?: TextStyle;
  boxStyle?: BoxStyle;
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

export type ExportQuality = 'low' | 'medium' | 'high';
export type ExportFormat = 'png' | 'jpeg' | 'webp' | 'svg';

export const DEFAULT_TEXT_STYLE: TextStyle = {
  bold: false,
  italic: false,
  underline: false,
  fontSize: 'sm',
  align: 'center',
};

export const DEFAULT_BOX_STYLE: BoxStyle = {
  borderWidth: 2,
  borderStyle: 'solid',
  borderRadius: 'sm',
  shadow: 'sm',
};

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
