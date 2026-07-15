/**
 * Generates PWA icons (192×192 and 512×512 PNG) from public/icons/icon.svg.
 * Requires: npm install -D sharp
 * Run: node scripts/generate-icons.mjs
 */
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error(
      '\n❌  sharp is not installed. Run:\n' +
      '   npm install -D sharp\n' +
      '   node scripts/generate-icons.mjs\n'
    );
    process.exit(1);
  }

  const svgPath = join(root, 'public/icons/icon.svg');
  if (!existsSync(svgPath)) {
    console.error('❌  public/icons/icon.svg not found');
    process.exit(1);
  }

  const svg = readFileSync(svgPath);

  const sizes = [
    { file: 'icon-192.png',          size: 192 },
    { file: 'icon-512.png',          size: 512 },
    { file: 'icon-maskable-512.png', size: 512 },
    { file: 'apple-touch-icon.png',  size: 180 },
  ];

  for (const { file, size } of sizes) {
    const out = join(root, 'public/icons', file);
    await sharp(svg).resize(size, size).png().toFile(out);
    console.log(`✅  ${file} (${size}×${size})`);
  }

  console.log('\n🎉  Icons generated in public/icons/');
}

main();
