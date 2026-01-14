import { toSvg, toPng } from 'html-to-image';

export async function exportToSVG(): Promise<string | null> {
  const element = document.querySelector('.react-flow__viewport') as HTMLElement;
  if (!element) return null;

  try {
    const svgDataUrl = await toSvg(element, {
      backgroundColor: '#ffffff',
      filter: (node) => {
        // Filter out controls and minimap
        if (node.classList?.contains('react-flow__controls')) return false;
        if (node.classList?.contains('react-flow__minimap')) return false;
        return true;
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

export async function exportToPNG(): Promise<string | null> {
  const element = document.querySelector('.react-flow__viewport') as HTMLElement;
  if (!element) return null;

  try {
    const dataUrl = await toPng(element, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      filter: (node) => {
        if (node.classList?.contains('react-flow__controls')) return false;
        if (node.classList?.contains('react-flow__minimap')) return false;
        return true;
      },
    });
    return dataUrl;
  } catch (error) {
    console.error('PNG export failed:', error);
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
