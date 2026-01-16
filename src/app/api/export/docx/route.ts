import { NextRequest, NextResponse } from 'next/server';
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  VerticalAlign,
  convertInchesToTwip,
  TableLayoutType,
} from 'docx';

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

interface DiagramNode {
  id: string;
  parentId: string | null;
  title: string;
  subtitle?: string;
  badge?: string;
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
}

// Helper to convert hex color to Word color format (without #)
function hexToWordColor(hex: string): string {
  return hex.replace('#', '');
}

// Convert fontSize to docx size (half-points)
function getFontSize(fontSize?: 'xs' | 'sm' | 'base' | 'lg' | 'xl'): number {
  const sizes: Record<string, number> = {
    xs: 18,
    sm: 22,
    base: 26,
    lg: 30,
    xl: 36,
  };
  return sizes[fontSize || 'sm'] || 22;
}

// Get alignment from text style
function getAlignment(align?: 'left' | 'center' | 'right'): typeof AlignmentType[keyof typeof AlignmentType] {
  switch (align) {
    case 'left': return AlignmentType.LEFT;
    case 'right': return AlignmentType.RIGHT;
    default: return AlignmentType.CENTER;
  }
}

// Get border style for docx
function getBorderStyle(style?: 'solid' | 'dashed' | 'dotted'): typeof BorderStyle[keyof typeof BorderStyle] {
  switch (style) {
    case 'dashed': return BorderStyle.DASHED;
    case 'dotted': return BorderStyle.DOTTED;
    default: return BorderStyle.SINGLE;
  }
}

// Build tree structure from flat node list
function buildTree(nodes: DiagramNode[]): Map<string | null, DiagramNode[]> {
  const tree = new Map<string | null, DiagramNode[]>();
  
  nodes.forEach(node => {
    const parentId = node.parentId;
    if (!tree.has(parentId)) {
      tree.set(parentId, []);
    }
    tree.get(parentId)!.push(node);
  });
  
  // Sort children by x position for consistent order
  tree.forEach((children) => {
    children.sort((a, b) => a.position.x - b.position.x);
  });
  
  return tree;
}

// Get node level in tree
function getNodeLevel(node: DiagramNode, nodesMap: Map<string, DiagramNode>): number {
  let level = 0;
  let current: DiagramNode | undefined = node;
  while (current?.parentId) {
    level++;
    current = nodesMap.get(current.parentId);
  }
  return level;
}

// Create a SmartArt-style node cell with proper styling
function createSmartArtNodeCell(node: DiagramNode, cellWidth: number = 2200): TableCell {
  const textStyle = node.textStyle;
  const boxStyle = node.boxStyle;
  const titleLines = node.title.split('\n');
  const subtitleLines = (node.subtitle || '').split('\n').filter(line => line.trim());
  
  const children: Paragraph[] = [];
  
  // Add badge at top if present (like the web canvas)
  if (node.badge) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 80 },
        children: [
          new TextRun({
            text: ` ${node.badge} `,
            size: 16,
            color: hexToWordColor(node.style.badgeTextColor),
            bold: true,
            shading: {
              type: ShadingType.SOLID,
              color: hexToWordColor(node.style.badgeFill),
              fill: hexToWordColor(node.style.badgeFill),
            },
          }),
        ],
      })
    );
  }
  
  // Add title lines (support multi-line)
  titleLines.forEach((line, index) => {
    children.push(
      new Paragraph({
        alignment: getAlignment(textStyle?.align),
        spacing: { 
          before: index === 0 && !node.badge ? 60 : 0,
          after: index === titleLines.length - 1 && subtitleLines.length > 0 ? 80 : 30 
        },
        children: [
          new TextRun({
            text: line,
            bold: textStyle?.bold ?? true,
            italics: textStyle?.italic ?? false,
            underline: textStyle?.underline ? {} : undefined,
            size: getFontSize(textStyle?.fontSize),
            color: hexToWordColor(node.style.textColor),
          }),
        ],
      })
    );
  });
  
  // Add subtitle lines (support multi-line)
  subtitleLines.forEach((line, index) => {
    children.push(
      new Paragraph({
        alignment: getAlignment(textStyle?.align),
        spacing: { after: index === subtitleLines.length - 1 ? 60 : 20 },
        children: [
          new TextRun({
            text: line,
            size: getFontSize('xs'),
            color: hexToWordColor(node.style.textColor),
            italics: true,
          }),
        ],
      })
    );
  });
  
  // If no content, add empty paragraph
  if (children.length === 0) {
    children.push(new Paragraph({ children: [] }));
  }
  
  const borderWidth = (boxStyle?.borderWidth || 2) * 6; // Convert to docx units
  
  return new TableCell({
    width: { size: cellWidth, type: WidthType.DXA },
    shading: {
      type: ShadingType.SOLID,
      color: hexToWordColor(node.style.fill),
      fill: hexToWordColor(node.style.fill),
    },
    borders: {
      top: { style: getBorderStyle(boxStyle?.borderStyle), size: borderWidth, color: hexToWordColor(node.style.border) },
      bottom: { style: getBorderStyle(boxStyle?.borderStyle), size: borderWidth, color: hexToWordColor(node.style.border) },
      left: { style: getBorderStyle(boxStyle?.borderStyle), size: borderWidth, color: hexToWordColor(node.style.border) },
      right: { style: getBorderStyle(boxStyle?.borderStyle), size: borderWidth, color: hexToWordColor(node.style.border) },
    },
    verticalAlign: VerticalAlign.CENTER,
    margins: {
      top: convertInchesToTwip(0.12),
      bottom: convertInchesToTwip(0.12),
      left: convertInchesToTwip(0.15),
      right: convertInchesToTwip(0.15),
    },
    children,
  });
}

// Create an empty spacer cell (invisible)
function createSpacerCell(width: number = 200): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.NIL },
      bottom: { style: BorderStyle.NIL },
      left: { style: BorderStyle.NIL },
      right: { style: BorderStyle.NIL },
    },
    children: [new Paragraph({ children: [] })],
  });
}

// Create horizontal connector row between parent and children
function createHorizontalConnectorRow(nodeCount: number, nodeWidth: number, spacerWidth: number): TableRow {
  const cells: TableCell[] = [];
  const totalCols = nodeCount * 2 - 1;
  
  for (let i = 0; i < totalCols; i++) {
    const isNodeCol = i % 2 === 0;
    
    if (isNodeCol) {
      // Node column - show horizontal line segment
      cells.push(
        new TableCell({
          width: { size: nodeWidth, type: WidthType.DXA },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 12, color: '64748b' },
            bottom: { style: BorderStyle.NIL },
            left: { style: BorderStyle.NIL },
            right: { style: BorderStyle.NIL },
          },
          children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [] })],
        })
      );
    } else {
      // Spacer column - continue horizontal line
      cells.push(
        new TableCell({
          width: { size: spacerWidth, type: WidthType.DXA },
          borders: {
            top: { style: BorderStyle.SINGLE, size: 12, color: '64748b' },
            bottom: { style: BorderStyle.NIL },
            left: { style: BorderStyle.NIL },
            right: { style: BorderStyle.NIL },
          },
          children: [new Paragraph({ spacing: { before: 0, after: 0 }, children: [] })],
        })
      );
    }
  }
  
  return new TableRow({ 
    children: cells, 
    height: { value: 100, rule: 'exact' as const } 
  });
}

// Create a visual hierarchical chart like SmartArt Org Chart
function createOrgChartLevel(
  nodes: DiagramNode[],
  tree: Map<string | null, DiagramNode[]>,
  _nodesMap: Map<string, DiagramNode>,
  _depth: number = 0
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  if (nodes.length === 0) return elements;
  
  // Calculate sizing based on number of nodes
  const baseNodeWidth = nodes.length <= 3 ? 2600 : (nodes.length <= 5 ? 2200 : 1800);
  const spacerWidth = nodes.length <= 3 ? 400 : 200;
  
  // Create node row
  const nodeCells: TableCell[] = [];
  nodes.forEach((node, index) => {
    if (index > 0) {
      nodeCells.push(createSpacerCell(spacerWidth));
    }
    nodeCells.push(createSmartArtNodeCell(node, baseNodeWidth));
  });
  
  const nodeRow = new TableRow({ children: nodeCells });
  const nodeTable = new Table({
    alignment: AlignmentType.CENTER,
    layout: TableLayoutType.AUTOFIT,
    rows: [nodeRow],
  });
  
  elements.push(nodeTable);
  
  // Process children for each node
  nodes.forEach((parentNode) => {
    const childNodes = tree.get(parentNode.id) || [];
    if (childNodes.length > 0) {
      // Add vertical connector from parent
      elements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          children: [
            new TextRun({ text: '│', size: 28, color: '64748b' }),
          ],
        })
      );
      elements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 0, after: 0 },
          children: [
            new TextRun({ text: '│', size: 28, color: '64748b' }),
          ],
        })
      );
      
      // If multiple children, add horizontal connector
      if (childNodes.length > 1) {
        const childNodeWidth = childNodes.length <= 3 ? 2600 : (childNodes.length <= 5 ? 2200 : 1800);
        const childSpacerWidth = childNodes.length <= 3 ? 400 : 200;
        
        const connectorTable = new Table({
          alignment: AlignmentType.CENTER,
          layout: TableLayoutType.AUTOFIT,
          rows: [
            createHorizontalConnectorRow(childNodes.length, childNodeWidth, childSpacerWidth),
          ],
        });
        elements.push(connectorTable);
        
        // Add vertical drops
        elements.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 0 },
            children: childNodes.map((_, i) => 
              new TextRun({ 
                text: i < childNodes.length - 1 ? '↓                    ' : '↓', 
                size: 24, 
                color: '64748b' 
              })
            ),
          })
        );
      } else {
        // Single child - just vertical line
        elements.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 0 },
            children: [
              new TextRun({ text: '↓', size: 24, color: '64748b' }),
            ],
          })
        );
      }
      
      // Recursively add children level
      const childElements = createOrgChartLevel(childNodes, tree, _nodesMap, _depth + 1);
      elements.push(...childElements);
    }
  });
  
  return elements;
}

// Create the complete SmartArt-style org chart
function createSmartArtOrgChart(nodes: DiagramNode[], tree: Map<string | null, DiagramNode[]>): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  const nodesMap = new Map(nodes.map(n => [n.id, n]));
  
  // Get root nodes
  const rootNodes = tree.get(null) || [];
  if (rootNodes.length === 0) return elements;
  
  // Create the hierarchical chart
  const chartElements = createOrgChartLevel(rootNodes, tree, nodesMap, 0);
  elements.push(...chartElements);
  
  return elements;
}

// Create diagram summary section
function createDiagramSummary(nodes: DiagramNode[], edges: DiagramEdge[]): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  const nodesMap = new Map(nodes.map(n => [n.id, n]));
  
  // Statistics
  const totalNodes = nodes.length;
  const rootNodes = nodes.filter(n => n.parentId === null);
  const leafNodes = nodes.filter(n => !nodes.some(other => other.parentId === n.id));
  const maxDepth = Math.max(...nodes.map(n => getNodeLevel(n, nodesMap))) + 1;
  
  // Count nodes by level
  const nodesByLevel: Map<number, DiagramNode[]> = new Map();
  nodes.forEach(n => {
    const level = getNodeLevel(n, nodesMap);
    if (!nodesByLevel.has(level)) nodesByLevel.set(level, []);
    nodesByLevel.get(level)!.push(n);
  });
  
  // Summary header
  elements.push(
    new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 400, after: 200 },
      children: [
        new TextRun({
          text: '📊 Diagram Summary',
          bold: true,
          size: 32,
          color: '1e40af',
        }),
      ],
    })
  );
  
  // Statistics table
  const statsRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 4000, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: 'dbeafe', fill: 'dbeafe' },
          children: [new Paragraph({
            children: [new TextRun({ text: 'Metric', bold: true, size: 22 })],
          })],
        }),
        new TableCell({
          width: { size: 3000, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: 'dbeafe', fill: 'dbeafe' },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Value', bold: true, size: 22 })],
          })],
        }),
      ],
    }),
    createStatsRow('Total Nodes', String(totalNodes)),
    createStatsRow('Root Nodes (Top Level)', String(rootNodes.length)),
    createStatsRow('Leaf Nodes (No Children)', String(leafNodes.length)),
    createStatsRow('Total Connections', String(edges.length)),
    createStatsRow('Hierarchy Depth', String(maxDepth) + ' level(s)'),
  ];
  
  elements.push(
    new Table({
      alignment: AlignmentType.LEFT,
      rows: statsRows,
      width: { size: 7000, type: WidthType.DXA },
    })
  );
  
  // Nodes by level breakdown
  elements.push(
    new Paragraph({
      spacing: { before: 300, after: 150 },
      children: [
        new TextRun({
          text: 'Structure Breakdown by Level:',
          bold: true,
          size: 24,
          color: '334155',
        }),
      ],
    })
  );
  
  const levelRows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 1500, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: 'e2e8f0', fill: 'e2e8f0' },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Level', bold: true, size: 20 })],
          })],
        }),
        new TableCell({
          width: { size: 1500, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: 'e2e8f0', fill: 'e2e8f0' },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Count', bold: true, size: 20 })],
          })],
        }),
        new TableCell({
          width: { size: 6000, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: 'e2e8f0', fill: 'e2e8f0' },
          children: [new Paragraph({
            children: [new TextRun({ text: 'Nodes', bold: true, size: 20 })],
          })],
        }),
      ],
    }),
  ];
  
  Array.from(nodesByLevel.entries())
    .sort((a, b) => a[0] - b[0])
    .forEach(([level, levelNodes]) => {
      levelRows.push(
        new TableRow({
          children: [
            new TableCell({
              width: { size: 1500, type: WidthType.DXA },
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: String(level + 1), size: 20 })],
              })],
            }),
            new TableCell({
              width: { size: 1500, type: WidthType.DXA },
              children: [new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: String(levelNodes.length), size: 20 })],
              })],
            }),
            new TableCell({
              width: { size: 6000, type: WidthType.DXA },
              children: [new Paragraph({
                children: [new TextRun({ 
                  text: levelNodes.map(n => n.title.split('\n')[0]).join(', '), 
                  size: 18,
                  color: '475569',
                })],
              })],
            }),
          ],
        })
      );
    });
  
  elements.push(
    new Table({
      alignment: AlignmentType.LEFT,
      rows: levelRows,
      width: { size: 9000, type: WidthType.DXA },
    })
  );
  
  // Detailed node listing
  elements.push(
    new Paragraph({
      spacing: { before: 400, after: 150 },
      children: [
        new TextRun({
          text: 'Detailed Node Information:',
          bold: true,
          size: 24,
          color: '334155',
        }),
      ],
    })
  );
  
  // Sort nodes by level and position
  const sortedNodes = [...nodes].sort((a, b) => {
    const levelA = getNodeLevel(a, nodesMap);
    const levelB = getNodeLevel(b, nodesMap);
    if (levelA !== levelB) return levelA - levelB;
    return a.position.x - b.position.x;
  });
  
  sortedNodes.forEach((node, index) => {
    const level = getNodeLevel(node, nodesMap);
    const parent = node.parentId ? nodesMap.get(node.parentId) : null;
    const children = nodes.filter(n => n.parentId === node.id);
    
    // Node entry with colored indicator
    const nodeElements: Paragraph[] = [
      new Paragraph({
        spacing: { before: 150, after: 50 },
        children: [
          new TextRun({
            text: `${index + 1}. `,
            bold: true,
            size: 22,
            color: '64748b',
          }),
          new TextRun({
            text: '■ ',
            size: 22,
            color: hexToWordColor(node.style.fill),
          }),
          new TextRun({
            text: node.title.split('\n')[0],
            bold: true,
            size: 22,
            color: '1e293b',
          }),
          node.badge ? new TextRun({
            text: ` [${node.badge}]`,
            size: 18,
            color: hexToWordColor(node.style.badgeTextColor),
            bold: true,
          }) : new TextRun({ text: '' }),
        ],
      }),
    ];
    
    // Add subtitle if present
    if (node.subtitle) {
      nodeElements.push(
        new Paragraph({
          spacing: { after: 30 },
          indent: { left: convertInchesToTwip(0.3) },
          children: [
            new TextRun({
              text: `"${node.subtitle.split('\n')[0]}"`,
              italics: true,
              size: 18,
              color: '64748b',
            }),
          ],
        })
      );
    }
    
    // Add hierarchy info
    const hierarchyInfo: string[] = [];
    hierarchyInfo.push(`Level ${level + 1}`);
    if (parent) {
      hierarchyInfo.push(`Parent: ${parent.title.split('\n')[0]}`);
    }
    if (children.length > 0) {
      hierarchyInfo.push(`${children.length} child${children.length > 1 ? 'ren' : ''}`);
    }
    
    nodeElements.push(
      new Paragraph({
        spacing: { after: 80 },
        indent: { left: convertInchesToTwip(0.3) },
        children: [
          new TextRun({
            text: hierarchyInfo.join(' • '),
            size: 16,
            color: '94a3b8',
          }),
        ],
      })
    );
    
    elements.push(...nodeElements);
  });
  
  return elements;
}

// Helper to create a stats row
function createStatsRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 4000, type: WidthType.DXA },
        children: [new Paragraph({
          children: [new TextRun({ text: label, size: 20 })],
        })],
      }),
      new TableCell({
        width: { size: 3000, type: WidthType.DXA },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: value, size: 20, bold: true })],
        })],
      }),
    ],
  });
}

// Create relationship summary
function createRelationshipSummary(nodes: DiagramNode[], edges: DiagramEdge[]): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  const nodesMap = new Map(nodes.map(n => [n.id, n]));
  
  if (edges.length === 0) return elements;
  
  elements.push(
    new Paragraph({
      spacing: { before: 400, after: 150 },
      children: [
        new TextRun({
          text: 'Relationships (Parent → Child):',
          bold: true,
          size: 24,
          color: '334155',
        }),
      ],
    })
  );
  
  const rows: TableRow[] = [
    new TableRow({
      children: [
        new TableCell({
          width: { size: 4000, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: 'e2e8f0', fill: 'e2e8f0' },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Parent', bold: true, size: 20 })],
          })],
        }),
        new TableCell({
          width: { size: 1000, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: 'e2e8f0', fill: 'e2e8f0' },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: '→', bold: true, size: 20 })],
          })],
        }),
        new TableCell({
          width: { size: 4000, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: 'e2e8f0', fill: 'e2e8f0' },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Child', bold: true, size: 20 })],
          })],
        }),
      ],
    }),
  ];
  
  edges.forEach((edge) => {
    const source = nodesMap.get(edge.source);
    const target = nodesMap.get(edge.target);
    
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 4000, type: WidthType.DXA },
            shading: source ? {
              type: ShadingType.SOLID,
              color: hexToWordColor(source.style.fill),
              fill: hexToWordColor(source.style.fill),
            } : undefined,
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: source?.title.split('\n')[0] || 'Unknown',
                size: 20,
                color: source ? hexToWordColor(source.style.textColor) : '333333',
              })],
            })],
          }),
          new TableCell({
            width: { size: 1000, type: WidthType.DXA },
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: '→', size: 20, color: '64748b' })],
            })],
          }),
          new TableCell({
            width: { size: 4000, type: WidthType.DXA },
            shading: target ? {
              type: ShadingType.SOLID,
              color: hexToWordColor(target.style.fill),
              fill: hexToWordColor(target.style.fill),
            } : undefined,
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: target?.title.split('\n')[0] || 'Unknown',
                size: 20,
                color: target ? hexToWordColor(target.style.textColor) : '333333',
              })],
            })],
          }),
        ],
      })
    );
  });
  
  elements.push(
    new Table({
      alignment: AlignmentType.CENTER,
      rows,
      width: { size: 9000, type: WidthType.DXA },
    })
  );
  
  return elements;
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

    // Build tree structure
    const tree = buildTree(nodes);
    
    // Create document sections
    const docChildren: (Paragraph | Table)[] = [
      // Title
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: name || 'Organization Chart',
            bold: true,
            size: 52,
            color: '1e3a5f',
          }),
        ],
      }),
      // Export date
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100, after: 400 },
        children: [
          new TextRun({
            text: `Exported on ${new Date().toLocaleString()}`,
            size: 20,
            color: '666666',
            italics: true,
          }),
        ],
      }),
      // Section: Visual Diagram
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        alignment: AlignmentType.CENTER,
        spacing: { before: 300, after: 300 },
        children: [
          new TextRun({
            text: '📊 Organization Structure',
            bold: true,
            size: 32,
            color: '1e40af',
          }),
        ],
      }),
    ];
    
    // Add SmartArt-style org chart visualization
    const chartElements = createSmartArtOrgChart(nodes, tree);
    docChildren.push(...chartElements);
    
    // Add separator
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 500, after: 300 },
        children: [
          new TextRun({
            text: '─────────────────────────────────────',
            size: 20,
            color: 'cbd5e1',
          }),
        ],
      })
    );
    
    // Add Summary Section
    const summaryElements = createDiagramSummary(nodes, edges);
    docChildren.push(...summaryElements);
    
    // Add Relationships Section
    if (edges.length > 0) {
      const relationshipElements = createRelationshipSummary(nodes, edges);
      docChildren.push(...relationshipElements);
    }
    
    // Footer
    docChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 600 },
        children: [
          new TextRun({
            text: '— End of Document —',
            size: 18,
            color: '94a3b8',
            italics: true,
          }),
        ],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 100 },
        children: [
          new TextRun({
            text: 'Generated by Holen Diagram Tool',
            size: 16,
            color: 'cbd5e1',
          }),
        ],
      })
    );

    const doc = new Document({
      sections: [
        {
          properties: {
            page: {
              margin: {
                top: convertInchesToTwip(0.75),
                bottom: convertInchesToTwip(0.75),
                left: convertInchesToTwip(0.75),
                right: convertInchesToTwip(0.75),
              },
            },
          },
          children: docChildren,
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${name || 'diagram'}.docx"`,
      },
    });
  } catch (error) {
    console.error('DOCX export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate DOCX' },
      { status: 500 }
    );
  }
}
