import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { imageBase64, name, width, height } = await request.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'Image data is required' }, { status: 400 });
    }

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    // Calculate page size based on image aspect ratio
    // Use A4 as base but adjust to fit the diagram
    const imgWidth = width || 800;
    const imgHeight = height || 600;
    const aspectRatio = imgWidth / imgHeight;
    
    // Page dimensions (in points, 72 points per inch)
    let pageWidth = 842; // A4 landscape width
    let pageHeight = 595; // A4 landscape height
    
    // Adjust to match aspect ratio
    if (aspectRatio > pageWidth / pageHeight) {
      pageHeight = pageWidth / aspectRatio;
    } else {
      pageWidth = pageHeight * aspectRatio;
    }
    
    // Add some padding
    const padding = 40;
    pageWidth += padding * 2;
    pageHeight += padding * 2;

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    // Embed the PNG image
    const imageBytes = Buffer.from(imageBase64, 'base64');
    const pngImage = await pdfDoc.embedPng(imageBytes);

    // Draw the image centered with padding
    const drawWidth = pageWidth - padding * 2;
    const drawHeight = pageHeight - padding * 2;
    
    page.drawImage(pngImage, {
      x: padding,
      y: padding,
      width: drawWidth,
      height: drawHeight,
    });

    // Add title if provided
    if (name) {
      const { rgb } = await import('pdf-lib');
      page.drawText(name, {
        x: padding,
        y: pageHeight - 25,
        size: 16,
        color: rgb(0.2, 0.2, 0.2),
      });
    }

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${name || 'diagram'}.pdf"`,
      },
    });
  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
