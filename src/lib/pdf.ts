// Removed top-level imports of html2canvas and jspdf to avoid SSR crashes on Vercel.
// They are imported dynamically inside the function, which only runs on the client.

/**
 * Captures a DOM element precisely as rendered on screen and downloads it as a PDF.
 * Uses exact dimensions to preserve native UI proportions perfectly.
 */
export async function downloadPdfFromElement(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with id ${elementId} not found.`);
    return;
  }

  try {
    // Dynamic import to prevent SSR crashes on Vercel
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    // scale: 2 for retina display high-res PDF
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff', // enforce solid background
    });

    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    
    // Create a precise PDF matching the DOM element footprint
    // converting canvas css pixels to PDF pixels
    const pdfWidth = element.offsetWidth;
    const pdfHeight = element.offsetHeight;
    
    const pdf = new jsPDF({
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [pdfWidth, pdfHeight],
    });

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    console.error('Failed to generate PDF:', error);
  }
}
