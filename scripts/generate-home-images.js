const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

// Keep source artwork and fallback PNGs; emit smaller WebP assets during every build.
const sources = ['card-alligator', 'card-chameleon', 'card-white-belt', 'card-headlock', 'card-axolotl', 'meetfighters', 'gameplay'];
async function main() {
  const destination = path.join(__dirname, '..', 'images', 'optimized');
  await fs.mkdir(destination, { recursive: true });
  for (const name of sources) {
    await sharp(path.join(__dirname, '..', 'images', `${name}.png`))
      .resize({ width: name.startsWith('card-') ? 480 : 800, withoutEnlargement: true })
      .webp({ quality: 85 }).toFile(path.join(destination, `${name}.webp`));
  }
  console.log(`Generated ${sources.length} optimized homepage images`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
