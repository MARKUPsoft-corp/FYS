export function downloadSvgAsPng(svgId: string, filename: string) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  
  const svgData = new XMLSerializer().serializeToString(svg);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const img = new Image();
  
  img.onload = () => {
    // Upscale for better print quality (x8)
    const scale = 8;
    // Assuming the SVG has explicit width/height or clientWidth/clientHeight works
    const baseWidth = svg.clientWidth || 140;
    const baseHeight = svg.clientHeight || 140;
    
    canvas.width = baseWidth * scale;
    canvas.height = baseHeight * scale;
    
    if (ctx) {
      // White background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = filename;
      downloadLink.href = pngFile;
      downloadLink.click();
    }
  };
  
  img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
}
