import { toSvg, toPng, toJpeg } from 'html-to-image';
import { ExportQuality, ExportFormat } from '@/types/diagram';

// Quality settings map
const QUALITY_SETTINGS: Record<ExportQuality, { pixelRatio: number; quality: number }> = {
  low: { pixelRatio: 1, quality: 0.7 },
  medium: { pixelRatio: 2, quality: 0.85 },
  high: { pixelRatio: 4, quality: 0.95 },
};

function getExportElement(): HTMLElement | null {
  // Try to get the full diagram container first
  const wrapper = document.querySelector('.react-flow') as HTMLElement;
  if (!wrapper) return null;
  
  const viewport = wrapper.querySelector('.react-flow__viewport') as HTMLElement;
  return viewport || wrapper;
}

function getFilterFunction() {
  return (node: Element) => {
    const classList = (node as HTMLElement).classList;
    if (!classList) return true;
    // Filter out controls, minimap, and other UI elements
    if (classList.contains('react-flow__controls')) return false;
    if (classList.contains('react-flow__minimap')) return false;
    if (classList.contains('react-flow__background')) return false;
    if (classList.contains('react-flow__panel')) return false;
    return true;
  };
}

// Get the bounding box of all nodes to capture full diagram
function getDiagramBounds(): { x: number; y: number; width: number; height: number } | null {
  const nodes = document.querySelectorAll('.react-flow__node');
  if (nodes.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  nodes.forEach((node) => {
    const rect = node.getBoundingClientRect();
    const transform = window.getComputedStyle(node).transform;
    
    // Get the node's position from its transform
    const nodeEl = node as HTMLElement;
    const x = parseFloat(nodeEl.style.transform?.match(/translate\(([^,]+)/)?.[1] || '0');
    const y = parseFloat(nodeEl.style.transform?.match(/translate\([^,]+,\s*([^)]+)/)?.[1] || '0');
    
    minX = Math.min(minX, rect.left);
    minY = Math.min(minY, rect.top);
    maxX = Math.max(maxX, rect.right);
    maxY = Math.max(maxY, rect.bottom);
  });

  const padding = 40;
  return {
    x: minX - padding,
    y: minY - padding,
    width: maxX - minX + padding * 2,
    height: maxY - minY + padding * 2,
  };
}

export async function exportToSVG(): Promise<string | null> {
  const element = getExportElement();
  if (!element) return null;

  try {
    const svgDataUrl = await toSvg(element, {
      backgroundColor: '#ffffff',
      filter: getFilterFunction(),
      style: {
        transform: 'none',
      },
    });

    // Convert data URL to SVG string
    const response = await fetch(svgDataUrl);
    const blob = await response.blob();
    return await blob.text();
  } catch (error) {
    console.error('SVG export failed:', error);
    return null;
  }
}

export async function exportToPNG(quality: ExportQuality = 'high'): Promise<string | null> {
  const element = getExportElement();
  if (!element) return null;

  const settings = QUALITY_SETTINGS[quality];

  try {
    const dataUrl = await toPng(element, {
      backgroundColor: '#ffffff',
      pixelRatio: settings.pixelRatio,
      filter: getFilterFunction(),
      cacheBust: true,
    });
    return dataUrl;
  } catch (error) {
    console.error('PNG export failed:', error);
    return null;
  }
}

export async function exportToJPEG(quality: ExportQuality = 'high'): Promise<string | null> {
  const element = getExportElement();
  if (!element) return null;

  const settings = QUALITY_SETTINGS[quality];

  try {
    const dataUrl = await toJpeg(element, {
      backgroundColor: '#ffffff',
      pixelRatio: settings.pixelRatio,
      quality: settings.quality,
      filter: getFilterFunction(),
      cacheBust: true,
    });
    return dataUrl;
  } catch (error) {
    console.error('JPEG export failed:', error);
    return null;
  }
}

export async function exportToWebP(quality: ExportQuality = 'high'): Promise<string | null> {
  // WebP export via canvas conversion from PNG
  const pngDataUrl = await exportToPNG(quality);
  if (!pngDataUrl) return null;

  try {
    const img = new Image();
    img.src = pngDataUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    const settings = QUALITY_SETTINGS[quality];
    return canvas.toDataURL('image/webp', settings.quality);
  } catch (error) {
    console.error('WebP export failed:', error);
    return null;
  }
}

export async function exportToFormat(
  format: ExportFormat,
  quality: ExportQuality = 'high'
): Promise<string | null> {
  switch (format) {
    case 'svg':
      return exportToSVG();
    case 'png':
      return exportToPNG(quality);
    case 'jpeg':
      return exportToJPEG(quality);
    case 'webp':
      return exportToWebP(quality);
    default:
      return null;
  }
}

export async function exportToHTML(diagramName: string): Promise<string | null> {
  const svg = await exportToSVG();
  if (!svg) return null;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${diagramName}</title>
  <style>
    body {
      margin: 0;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      min-height: 100vh;
      background-color: #f5f5f5;
      font-family: system-ui, -apple-system, sans-serif;
    }
    .container {
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      margin: 0 0 20px 0;
      color: #333;
      font-size: 24px;
    }
    .diagram {
      overflow: auto;
    }
    svg {
      max-width: 100%;
      height: auto;
    }
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #eee;
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${diagramName}</h1>
    <div class="diagram">
      ${svg}
    </div>
    <div class="footer">
      Exported on ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>`;

  return html;
}
