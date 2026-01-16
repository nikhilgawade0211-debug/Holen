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

interface DiagramNode {
  id: string;
  parentId: string | null;
  title: string;
  subtitle?: string;
  badge?: string;
  style: NodeStyle;
  textStyle?: TextStyle;
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
    xs: 16,
    sm: 20,
    base: 24,
    lg: 28,
    xl: 32,
  };
  return sizes[fontSize || 'sm'] || 20;
}

// Get alignment from text style
function getAlignment(align?: 'left' | 'center' | 'right'): typeof AlignmentType[keyof typeof AlignmentType] {
  switch (align) {
    case 'left': return AlignmentType.LEFT;
    case 'right': return AlignmentType.RIGHT;
    default: return AlignmentType.CENTER;
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

// Create a table cell for a node
function createNodeCell(node: DiagramNode): TableCell {
  const textStyle = node.textStyle;
  const titleLines = node.title.split('\n');
  const subtitleLines = (node.subtitle || '').split('\n').filter(line => line.trim());
  
  const children: Paragraph[] = [];
  
  // Add badge if present
  if (node.badge) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 60 },
        children: [
          new TextRun({
            text: node.badge,
            size: 14,
            color: hexToWordColor(node.style.badgeTextColor),
            bold: true,
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
        spacing: { after: index === titleLines.length - 1 && subtitleLines.length > 0 ? 60 : 20 },
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
        spacing: { after: index === subtitleLines.length - 1 ? 0 : 20 },
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
  
  return new TableCell({
    width: { size: 2500, type: WidthType.DXA },
    shading: {
      type: ShadingType.SOLID,
      color: hexToWordColor(node.style.fill),
      fill: hexToWordColor(node.style.fill),
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 12, color: hexToWordColor(node.style.border) },
      bottom: { style: BorderStyle.SINGLE, size: 12, color: hexToWordColor(node.style.border) },
      left: { style: BorderStyle.SINGLE, size: 12, color: hexToWordColor(node.style.border) },
      right: { style: BorderStyle.SINGLE, size: 12, color: hexToWordColor(node.style.border) },
    },
    verticalAlign: VerticalAlign.CENTER,
    margins: {
      top: convertInchesToTwip(0.1),
      bottom: convertInchesToTwip(0.1),
      left: convertInchesToTwip(0.15),
      right: convertInchesToTwip(0.15),
    },
    children,
  });
}

// Create an empty spacer cell
function createSpacerCell(width: number = 300): TableCell {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.NIL },
      bottom: { style: BorderStyle.NIL },
      left: { style: BorderStyle.NIL },
      right: { style: BorderStyle.NIL },
    },
    children: [new Paragraph({})],
  });
}

// Create connector row (shows lines connecting parent to children)
function createConnectorRow(childCount: number): TableRow {
  const cells: TableCell[] = [];
  const totalCols = childCount * 2 - 1;
  
  for (let i = 0; i < totalCols; i++) {
    const isNodeCol = i % 2 === 0;
    cells.push(
      new TableCell({
        width: { size: isNodeCol ? 2500 : 300, type: WidthType.DXA },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 8, color: '64748b' },
          bottom: { style: BorderStyle.NIL },
          left: { style: BorderStyle.NIL },
          right: { style: BorderStyle.NIL },
        },
        children: [new Paragraph({ spacing: { before: 0, after: 0 } })],
      })
    );
  }
  
  return new TableRow({ children: cells, height: { value: 150, rule: 'exact' as const } });
}

// Create vertical connector from parent
function createVerticalConnector(): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 0, after: 0 },
    children: [
      new TextRun({
        text: '│',
        size: 24,
        color: '64748b',
      }),
    ],
  });
}

// Recursively create document elements for the tree
function createTreeElements(
  tree: Map<string | null, DiagramNode[]>,
  parentId: string | null,
  depth: number = 0
): (Paragraph | Table)[] {
  const children = tree.get(parentId) || [];
  if (children.length === 0) return [];
  
  const elements: (Paragraph | Table)[] = [];
  
  // Add vertical connector if not root level
  if (depth > 0) {
    elements.push(createVerticalConnector());
  }
  
  // Create row of nodes at this level
  const nodeCells: TableCell[] = [];
  children.forEach((node, index) => {
    if (index > 0) {
      nodeCells.push(createSpacerCell());
    }
    nodeCells.push(createNodeCell(node));
  });
  
  const nodeRow = new TableRow({ children: nodeCells });
  
  const nodeTable = new Table({
    alignment: AlignmentType.CENTER,
    layout: TableLayoutType.AUTOFIT,
    rows: [nodeRow],
  });
  
  elements.push(nodeTable);
  
  // Process each child's subtree
  children.forEach((node) => {
    const nodeChildren = tree.get(node.id) || [];
    if (nodeChildren.length > 0) {
      // Add spacing
      elements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 100 },
          children: [
            new TextRun({
              text: '↓',
              size: 20,
              color: '64748b',
            }),
          ],
        })
      );
      
      // Add child header
      elements.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 100, after: 100 },
          children: [
            new TextRun({
              text: `Children of "${node.title.split('\n')[0]}"`,
              size: 18,
              color: '94a3b8',
              italics: true,
            }),
          ],
        })
      );
      
      // Recursively add children
      const childElements = createTreeElements(tree, node.id, depth + 1);
      elements.push(...childElements);
    }
  });
  
  return elements;
}

// Create a flat list representation of nodes (alternative view)
function createFlatNodeList(nodes: DiagramNode[]): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  
  // Group nodes by level (based on parentId chain)
  const getLevel = (node: DiagramNode, nodesMap: Map<string, DiagramNode>): number => {
    let level = 0;
    let current: DiagramNode | undefined = node;
    while (current?.parentId) {
      level++;
      current = nodesMap.get(current.parentId);
    }
    return level;
  };
  
  const nodesMap = new Map(nodes.map(n => [n.id, n]));
  const sortedNodes = [...nodes].sort((a, b) => {
    const levelA = getLevel(a, nodesMap);
    const levelB = getLevel(b, nodesMap);
    if (levelA !== levelB) return levelA - levelB;
    return a.position.x - b.position.x;
  });
  
  // Create a table for all nodes
  const rows: TableRow[] = [];
  
  // Header row
  rows.push(
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
          width: { size: 3000, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: 'e2e8f0', fill: 'e2e8f0' },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Title', bold: true, size: 20 })],
          })],
        }),
        new TableCell({
          width: { size: 3000, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: 'e2e8f0', fill: 'e2e8f0' },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Subtitle', bold: true, size: 20 })],
          })],
        }),
        new TableCell({
          width: { size: 1500, type: WidthType.DXA },
          shading: { type: ShadingType.SOLID, color: 'e2e8f0', fill: 'e2e8f0' },
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: 'Badge', bold: true, size: 20 })],
          })],
        }),
      ],
    })
  );
  
  // Data rows
  sortedNodes.forEach((node) => {
    const level = getLevel(node, nodesMap);
    const textStyle = node.textStyle;
    
    rows.push(
      new TableRow({
        children: [
          new TableCell({
            width: { size: 1500, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ text: String(level), size: 20 })],
            })],
          }),
          new TableCell({
            width: { size: 3000, type: WidthType.DXA },
            shading: {
              type: ShadingType.SOLID,
              color: hexToWordColor(node.style.fill),
              fill: hexToWordColor(node.style.fill),
            },
            verticalAlign: VerticalAlign.CENTER,
            children: node.title.split('\n').map(line => new Paragraph({
              alignment: getAlignment(textStyle?.align),
              children: [new TextRun({
                text: line,
                bold: textStyle?.bold ?? true,
                italics: textStyle?.italic ?? false,
                underline: textStyle?.underline ? {} : undefined,
                size: getFontSize(textStyle?.fontSize),
                color: hexToWordColor(node.style.textColor),
              })],
            })),
          }),
          new TableCell({
            width: { size: 3000, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            children: (node.subtitle || '').split('\n').filter(l => l.trim()).map(line => new Paragraph({
              alignment: getAlignment(textStyle?.align),
              children: [new TextRun({
                text: line,
                size: 18,
                italics: true,
                color: hexToWordColor(node.style.textColor),
              })],
            })).concat(
              (node.subtitle || '').trim() ? [] : [new Paragraph({ children: [new TextRun({ text: '-', color: '94a3b8', size: 18 })] })]
            ),
          }),
          new TableCell({
            width: { size: 1500, type: WidthType.DXA },
            verticalAlign: VerticalAlign.CENTER,
            shading: node.badge ? {
              type: ShadingType.SOLID,
              color: hexToWordColor(node.style.badgeFill),
              fill: hexToWordColor(node.style.badgeFill),
            } : undefined,
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({
                text: node.badge || '-',
                size: 18,
                color: node.badge ? hexToWordColor(node.style.badgeTextColor) : '94a3b8',
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
      width: { size: 100, type: WidthType.PERCENTAGE },
    })
  );
  
  return elements;
}

// Create relationship/edge list
function createEdgeList(nodes: DiagramNode[], edges: DiagramEdge[]): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  const nodesMap = new Map(nodes.map(n => [n.id, n]));
  
  if (edges.length === 0) return elements;
  
  const rows: TableRow[] = [];
  
  // Header
  rows.push(
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
    })
  );
  
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
      width: { size: 100, type: WidthType.PERCENTAGE },
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
            text: name || 'Diagram',
            bold: true,
            size: 48,
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
          }),
        ],
      }),
      // Section: Hierarchical View
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 200 },
        children: [
          new TextRun({
            text: 'Diagram Structure',
            bold: true,
            size: 32,
            color: '334155',
          }),
        ],
      }),
    ];
    
    // Add tree visualization
    const treeElements = createTreeElements(tree, null);
    docChildren.push(...treeElements);
    
    // Section: Node Details Table
    docChildren.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 600, after: 200 },
        children: [
          new TextRun({
            text: 'Node Details (Editable)',
            bold: true,
            size: 32,
            color: '334155',
          }),
        ],
      }),
      new Paragraph({
        spacing: { after: 200 },
        children: [
          new TextRun({
            text: 'Edit the text in the cells below to modify node content. Multi-line text is preserved.',
            size: 18,
            color: '64748b',
            italics: true,
          }),
        ],
      })
    );
    
    // Add flat node list
    const flatElements = createFlatNodeList(nodes);
    docChildren.push(...flatElements);
    
    // Section: Relationships
    if (edges.length > 0) {
      docChildren.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 600, after: 200 },
          children: [
            new TextRun({
              text: 'Relationships',
              bold: true,
              size: 32,
              color: '334155',
            }),
          ],
        })
      );
      
      const edgeElements = createEdgeList(nodes, edges);
      docChildren.push(...edgeElements);
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
      })
    );

    const doc = new Document({
      sections: [
        {
          properties: {},
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
