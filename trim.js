const sharp = require('sharp');

async function trimImage() {
  try {
    await sharp('public/logos/fys_favicon.png')
      .trim() // automatically trims transparent pixels
      .toFile('public/logos/fys_favicon_trimmed.png');
    console.log('Image trimmed successfully');
  } catch (err) {
    console.error('Error trimming image:', err);
  }
}

trimImage();
