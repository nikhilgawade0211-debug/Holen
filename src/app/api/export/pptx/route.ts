import { NextRequest, NextResponse } from 'next/server';
import PptxGenJS from 'pptxgenjs';

// Types for diagram data
interface NodeStyle {
  fill: string;
  border: string;
  textColor: string;
  badgeFill: string;
  badgeTextColor: string;
}

interface TextStyle {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontSize: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  align: 'left' | 'center' | 'right';
}

interface BoxStyle {
  borderWidth: 1 | 2 | 3 | 4;
  borderStyle: 'solid' | 'dashed' | 'dotted';
  borderRadius: 'none' | 'sm' | 'md' | 'lg' | 'full';
  shadow: 'none' | 'sm' | 'md' | 'lg';
}

interface BadgeConfig {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

interface DiagramNode {
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

interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  type: 'straight' | 'smoothstep' | 'step';
  style?: {
    stroke: string;
    strokeWidth: number;
    animated: boolean;
  };
}

// Convert hex color to pptxgenjs format (without #)
function hexToPptx(hex: string): string {
  return hex.replace('#', '');
}

// Convert font size to points
function getFontSize(fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl'): number {
  const sizes: Record<string, number> = {
    xs: 8,
    sm: 10,
    base: 12,
    lg: 14,
    xl: 18,
  };
  return sizes[fontSize || 'sm'] || 10;
}

// Get text alignment for pptxgenjs
function getTextAlign(align?: 'left' | 'center' | 'right'): 'left' | 'center' | 'right' {
  return align || 'center';
}

// Convert border style to pptxgenjs format
function getBorderDash(style?: 'solid' | 'dashed' | 'dotted'): 'solid' | 'dash' | 'sysDot' {
  switch (style) {
    case 'dashed': return 'dash';
    case 'dotted': return 'sysDot';
    default: return 'solid';
  }
}

// Helper to convert string[][] to pptxgenjs TableRow format
type PptxTableCell = { text: string; options?: Record<string, unknown> };
type PptxTableRow = PptxTableCell[];

function toTableRows(data: string[][]): PptxTableRow[] {
  return data.map(row => row.map(cell => ({ text: cell })));
}

// Calculate bounds of all nodes
function calculateBounds(nodes: DiagramNode[]): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number } {
  if (nodes.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }
  
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  
  nodes.forEach(node => {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + node.width);
    maxY = Math.max(maxY, node.position.y + node.height);
  });
  
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

// Build tree structure for hierarchical traversal
function buildTree(nodes: DiagramNode[]): Map<string | null, DiagramNode[]> {
  const tree = new Map<string | null, DiagramNode[]>();
  
  nodes.forEach(node => {
    const parentId = node.parentId;
    if (!tree.has(parentId)) {
      tree.set(parentId, []);
    }
    tree.get(parentId)!.push(node);
  });
  
  tree.forEach((children) => {
    children.sort((a, b) => a.position.x - b.position.x);
  });
  
  return tree;
}

// Get node level
function getNodeLevel(node: DiagramNode, nodesMap: Map<string, DiagramNode>): number {
  let level = 0;
  let current: DiagramNode | undefined = node;
  while (current?.parentId) {
    level++;
    current = nodesMap.get(current.parentId);
  }
  return level;
}

export async function POST(request: NextRequest) {
  try {
    const { nodes, edges, name } = await request.json() as {
      nodes: DiagramNode[];
      edges: DiagramEdge[];
      name: string;
    };

    if (!nodes || nodes.length === 0) {
      return NextResponse.json(
        { error: 'Diagram data is required' },
        { status: 400 }
      );
    }

    // Create PowerPoint presentation
    const pptx = new PptxGenJS();
    pptx.author = 'Holen Diagram Tool';
    pptx.title = name || 'Organization Chart';
    pptx.subject = 'Diagram Export';
    pptx.company = 'Holen';
    
    // Calculate diagram bounds for scaling
    const bounds = calculateBounds(nodes);
    const nodesMap = new Map(nodes.map(n => [n.id, n]));
    
    // Slide dimensions (in inches) - widescreen 16:9
    const slideWidth = 13.333;
    const slideHeight = 7.5;
    const margin = 0.4;
    const titleHeight = 0.7;
    const footerHeight = 0.3;
    const availableWidth = slideWidth - (margin * 2);
    const availableHeight = slideHeight - titleHeight - footerHeight - (margin * 2);
    
    // Calculate scale to fit diagram compactly on slide
    // We want the diagram to fill the available space while maintaining aspect ratio
    const diagramAspect = bounds.width / bounds.height;
    const slideAspect = availableWidth / availableHeight;
    
    let scale: number;
    if (diagramAspect > slideAspect) {
      // Diagram is wider - fit to width
      scale = availableWidth / bounds.width;
    } else {
      // Diagram is taller - fit to height
      scale = availableHeight / bounds.height;
    }
    
    // Apply a slight reduction to add padding around the diagram
    scale *= 0.9;
    
    // Pixel to inch conversion
    const pxToInch = (px: number) => px * scale;
    
    // ==========================================
    // SLIDE 1: Visual Diagram (Canvas Recreation)
    // ==========================================
    const slide1 = pptx.addSlide();
    
    // Add title
    slide1.addText(name || 'Organization Chart', {
      x: margin,
      y: 0.15,
      w: slideWidth - (margin * 2),
      h: 0.5,
      fontSize: 20,
      bold: true,
      color: '1e3a5f',
      align: 'center',
    });
    
    // Calculate offset to center diagram in available space
    const diagramWidth = bounds.width * scale;
    const diagramHeight = bounds.height * scale;
    const offsetX = margin + (availableWidth - diagramWidth) / 2;
    const offsetY = titleHeight + margin + (availableHeight - diagramHeight) / 2;
    
    // Draw edges/connectors first (behind nodes)
    edges.forEach(edge => {
      const sourceNode = nodesMap.get(edge.source);
      const targetNode = nodesMap.get(edge.target);
      
      if (sourceNode && targetNode) {
        // Calculate connector points
        const sourceX = offsetX + pxToInch(sourceNode.position.x - bounds.minX + sourceNode.width / 2);
        const sourceY = offsetY + pxToInch(sourceNode.position.y - bounds.minY + sourceNode.height);
        const targetX = offsetX + pxToInch(targetNode.position.x - bounds.minX + targetNode.width / 2);
        const targetY = offsetY + pxToInch(targetNode.position.y - bounds.minY);
        
        const strokeColor = edge.style?.stroke?.replace('#', '') || '64748b';
        const strokeWidth = Math.max(0.5, (edge.style?.strokeWidth || 2) * scale * 15);
        
        // Draw vertical line from source bottom
        const midY = (sourceY + targetY) / 2;
        
        // Vertical line from source
        slide1.addShape('line', {
          x: sourceX,
          y: sourceY,
          w: 0,
          h: midY - sourceY,
          line: { color: strokeColor, width: strokeWidth },
        });
        
        // Horizontal line to target X
        if (Math.abs(sourceX - targetX) > 0.01) {
          slide1.addShape('line', {
            x: Math.min(sourceX, targetX),
            y: midY,
            w: Math.abs(targetX - sourceX),
            h: 0,
            line: { color: strokeColor, width: strokeWidth },
          });
        }
        
        // Vertical line to target
        slide1.addShape('line', {
          x: targetX,
          y: midY,
          w: 0,
          h: targetY - midY,
          line: { color: strokeColor, width: strokeWidth },
        });
      }
    });
    
    // Draw nodes
    nodes.forEach(node => {
      const x = offsetX + pxToInch(node.position.x - bounds.minX);
      const y = offsetY + pxToInch(node.position.y - bounds.minY);
      const w = pxToInch(node.width);
      const h = pxToInch(node.height);
      
      const textStyle = node.textStyle;
      const boxStyle = node.boxStyle;
      
      // Calculate font sizes relative to box size
      // Base the font size on the smaller of width or height to ensure it fits
      const baseFontSize = Math.min(w * 8, h * 4, 14); // Max 14pt, scaled to box
      const titleFontSize = Math.max(6, Math.min(baseFontSize, 14));
      const subtitleFontSize = Math.max(5, titleFontSize - 2);
      const badgeFontSize = Math.max(5, titleFontSize - 3);
      
      // Node background shape
      slide1.addShape('rect', {
        x,
        y,
        w,
        h,
        fill: { color: hexToPptx(node.style.fill) },
        line: {
          color: hexToPptx(node.style.border),
          width: Math.max(0.5, (boxStyle?.borderWidth || 2) * scale * 10),
          dashType: getBorderDash(boxStyle?.borderStyle),
        },
        shadow: boxStyle?.shadow !== 'none' ? {
          type: 'outer',
          blur: 2,
          offset: 1,
          angle: 45,
          opacity: 0.2,
          color: '000000',
        } : undefined,
      });
      
      // Badge (if present)
      if (node.badge) {
        const badgeConfig = node.badgeConfig || { offsetX: 0, offsetY: 0, width: 80, height: 28 };
        const badgeW = pxToInch(badgeConfig.width);
        const badgeH = pxToInch(badgeConfig.height);
        const badgeX = x + (w / 2) - (badgeW / 2) + pxToInch(badgeConfig.offsetX);
        const badgeY = y - badgeH / 2 + pxToInch(badgeConfig.offsetY || 0);
        
        slide1.addShape('rect', {
          x: badgeX,
          y: badgeY,
          w: badgeW,
          h: badgeH,
          fill: { color: hexToPptx(node.style.badgeFill) },
          line: { color: hexToPptx(node.style.border), width: 0.5 },
        });
        
        slide1.addText(node.badge, {
          x: badgeX,
          y: badgeY,
          w: badgeW,
          h: badgeH,
          fontSize: badgeFontSize,
          bold: true,
          color: hexToPptx(node.style.badgeTextColor),
          align: 'center',
          valign: 'middle',
        });
      }
      
      // Title text
      const titleText = node.title || 'Untitled';
      
      // If there's a subtitle, position title higher
      const titleY = node.subtitle ? y + h * 0.15 : y + h * 0.1;
      const titleH = node.subtitle ? h * 0.45 : h * 0.8;
      
      slide1.addText(titleText, {
        x: x + w * 0.05,
        y: titleY,
        w: w * 0.9,
        h: titleH,
        fontSize: titleFontSize,
        bold: textStyle?.bold ?? true,
        italic: textStyle?.italic ?? false,
        underline: textStyle?.underline ? { style: 'sng' } : undefined,
        color: hexToPptx(node.style.textColor),
        align: getTextAlign(textStyle?.align),
        valign: 'middle',
        shrinkText: true,
      });
      
      // Subtitle text (if present)
      if (node.subtitle) {
        slide1.addText(node.subtitle, {
          x: x + w * 0.05,
          y: y + h * 0.55,
          w: w * 0.9,
          h: h * 0.35,
          fontSize: subtitleFontSize,
          italic: true,
          color: hexToPptx(node.style.textColor),
          align: getTextAlign(textStyle?.align),
          valign: 'top',
          shrinkText: true,
        });
      }
    });
    
    // Add footer
    slide1.addText(`Exported on ${new Date().toLocaleDateString()}`, {
      x: margin,
      y: slideHeight - footerHeight - 0.1,
      w: slideWidth - (margin * 2),
      h: footerHeight,
      fontSize: 8,
      color: '94a3b8',
      align: 'center',
    });
    
    // ==========================================
    // SLIDE 2: Summary Statistics
    // ==========================================
    const slide2 = pptx.addSlide();
    
    slide2.addText('📊 Diagram Summary', {
      x: 0.5,
      y: 0.3,
      w: slideWidth - 1,
      h: 0.6,
      fontSize: 28,
      bold: true,
      color: '1e40af',
      align: 'center',
    });
    
    // Calculate statistics
    const tree = buildTree(nodes);
    const rootNodes = nodes.filter(n => n.parentId === null);
    const leafNodes = nodes.filter(n => !nodes.some(other => other.parentId === n.id));
    const maxDepth = Math.max(...nodes.map(n => getNodeLevel(n, nodesMap))) + 1;
    
    // Statistics table
    const statsData: string[][] = [
      ['Metric', 'Value'],
      ['Total Nodes', String(nodes.length)],
      ['Root Nodes (Top Level)', String(rootNodes.length)],
      ['Leaf Nodes (No Children)', String(leafNodes.length)],
      ['Total Connections', String(edges.length)],
      ['Hierarchy Depth', `${maxDepth} level(s)`],
    ];
    
    slide2.addTable(toTableRows(statsData), {
      x: 1.5,
      y: 1.2,
      w: 5,
      colW: [3, 2],
      border: { color: 'e2e8f0', pt: 1 },
      fontFace: 'Arial',
      fontSize: 12,
      color: '333333',
      align: 'left',
      valign: 'middle',
      rowH: 0.4,
    });
    
    // Nodes by level breakdown
    const nodesByLevel: Map<number, DiagramNode[]> = new Map();
    nodes.forEach(n => {
      const level = getNodeLevel(n, nodesMap);
      if (!nodesByLevel.has(level)) nodesByLevel.set(level, []);
      nodesByLevel.get(level)!.push(n);
    });
    
    slide2.addText('Structure by Level:', {
      x: 1.5,
      y: 4,
      w: 10,
      h: 0.4,
      fontSize: 14,
      bold: true,
      color: '334155',
    });
    
    const levelData: string[][] = [['Level', 'Count', 'Nodes']];
    Array.from(nodesByLevel.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([level, levelNodes]) => {
        levelData.push([
          String(level + 1),
          String(levelNodes.length),
          levelNodes.map(n => n.title.split('\n')[0]).join(', '),
        ]);
      });
    
    slide2.addTable(toTableRows(levelData), {
      x: 1.5,
      y: 4.5,
      w: 10,
      colW: [1, 1, 8],
      border: { color: 'e2e8f0', pt: 1 },
      fontFace: 'Arial',
      fontSize: 10,
      color: '333333',
      align: 'left',
      valign: 'middle',
      rowH: 0.35,
    });
    
    // ==========================================
    // SLIDE 3: Detailed Node List
    // ==========================================
    const slide3 = pptx.addSlide();
    
    slide3.addText('📋 Node Details', {
      x: 0.5,
      y: 0.3,
      w: slideWidth - 1,
      h: 0.6,
      fontSize: 28,
      bold: true,
      color: '1e40af',
      align: 'center',
    });
    
    // Sort nodes by level and position
    const sortedNodes = [...nodes].sort((a, b) => {
      const levelA = getNodeLevel(a, nodesMap);
      const levelB = getNodeLevel(b, nodesMap);
      if (levelA !== levelB) return levelA - levelB;
      return a.position.x - b.position.x;
    });
    
    // Build detailed node table
    const nodeTableData: string[][] = [['#', 'Title', 'Subtitle', 'Badge', 'Level', 'Parent']];
    sortedNodes.forEach((node, index) => {
      const level = getNodeLevel(node, nodesMap);
      const parent = node.parentId ? nodesMap.get(node.parentId) : null;
      
      nodeTableData.push([
        String(index + 1),
        node.title.split('\n')[0],
        node.subtitle?.split('\n')[0] || '-',
        node.badge || '-',
        String(level + 1),
        parent?.title.split('\n')[0] || '-',
      ]);
    });
    
    slide3.addTable(toTableRows(nodeTableData), {
      x: 0.5,
      y: 1,
      w: slideWidth - 1,
      colW: [0.5, 3, 3, 1.5, 0.8, 3],
      border: { color: 'e2e8f0', pt: 1 },
      fontFace: 'Arial',
      fontSize: 9,
      color: '333333',
      align: 'left',
      valign: 'middle',
      rowH: 0.35,
    });
    
    // ==========================================
    // SLIDE 4: Relationships (if there are edges)
    // ==========================================
    if (edges.length > 0) {
      const slide4 = pptx.addSlide();
      
      slide4.addText('🔗 Relationships', {
        x: 0.5,
        y: 0.3,
        w: slideWidth - 1,
        h: 0.6,
        fontSize: 28,
        bold: true,
        color: '1e40af',
        align: 'center',
      });
      
      const edgeTableData: string[][] = [['#', 'Parent Node', '→', 'Child Node']];
      edges.forEach((edge, index) => {
        const source = nodesMap.get(edge.source);
        const target = nodesMap.get(edge.target);
        
        edgeTableData.push([
          String(index + 1),
          source?.title.split('\n')[0] || 'Unknown',
          '→',
          target?.title.split('\n')[0] || 'Unknown',
        ]);
      });
      
      slide4.addTable(toTableRows(edgeTableData), {
        x: 1.5,
        y: 1,
        w: 10,
        colW: [0.8, 4, 0.4, 4],
        border: { color: 'e2e8f0', pt: 1 },
        fontFace: 'Arial',
        fontSize: 11,
        color: '333333',
        align: 'center',
        valign: 'middle',
        rowH: 0.4,
      });
    }
    
    // Generate PowerPoint file
    const buffer = await pptx.write({ outputType: 'nodebuffer' }) as Buffer;
    
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${name || 'diagram'}.pptx"`,
      },
    });
  } catch (error) {
    console.error('PPTX export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PPTX' },
      { status: 500 }
    );
  }
}
