import sharp from 'sharp';

async function generateFavicon() {
  const input = 'public/logos/fys_logo.png';
  const output = 'public/logos/fys_favicon.png';
  
  // Get image dimensions to size the circle properly
  const metadata = await sharp(input).metadata();
  const size = Math.max(metadata.width, metadata.height);
  const padding = Math.floor(size * 0.2); // 20% padding
  const totalSize = size + padding * 2;
  
  // Create a cream circle SVG
  const circleSvg = `
    <svg width="${totalSize}" height="${totalSize}">
      <circle cx="${totalSize/2}" cy="${totalSize/2}" r="${totalSize/2}" fill="#FDFBF7" />
    </svg>
  `;

  await sharp(Buffer.from(circleSvg))
    .composite([
      {
        input: input,
        gravity: 'center'
      }
    ])
    .png()
    .toFile(output);
    
  console.log('Favicon generated at', output);
}

generateFavicon().catch(console.error);
