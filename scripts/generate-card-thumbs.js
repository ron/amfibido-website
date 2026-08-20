#!/usr/bin/env node

/**
 * Generate card reference thumbnails for every language folder under images/{LANG}/.
 * Writes 200x280 PNGs to images/{LANG}/thumbs/.
 */

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const THUMB_WIDTH = 150;
const THUMB_HEIGHT = 210;
const CARD_RE = /^([1-5S])_([FAE_])_([A-Za-z_])_(.+)\.png$/i;

const imagesRoot = path.join(__dirname, "..", "images");

function isLanguageCardFolder(dirName, dirPath) {
  if (!/^[A-Z]{2}$/.test(dirName)) return false;
  if (!fs.statSync(dirPath).isDirectory()) return false;

  return fs.readdirSync(dirPath).some((entry) => {
    if (entry === "thumbs" || !entry.toLowerCase().endsWith(".png")) return false;
    return CARD_RE.test(entry);
  });
}

async function processLanguage(code) {
  const dirPath = path.join(imagesRoot, code);
  const thumbsDir = path.join(dirPath, "thumbs");
  fs.mkdirSync(thumbsDir, { recursive: true });

  const files = fs
    .readdirSync(dirPath)
    .filter((entry) => entry.toLowerCase().endsWith(".png") && CARD_RE.test(entry));

  let written = 0;
  for (const filename of files) {
    const input = path.join(dirPath, filename);
    const output = path.join(thumbsDir, filename);
    await sharp(input)
      .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: "fill" })
      .png({ compressionLevel: 9, palette: true })
      .toFile(output);
    written += 1;
  }

  return written;
}

async function main() {
  if (!fs.existsSync(imagesRoot)) {
    console.error("images/ directory not found");
    process.exit(1);
  }

  const languages = fs
    .readdirSync(imagesRoot)
    .filter((entry) => isLanguageCardFolder(entry, path.join(imagesRoot, entry)))
    .sort();

  if (!languages.length) {
    console.log("No language card folders found.");
    return;
  }

  for (const code of languages) {
    const count = await processLanguage(code);
    console.log(`${code}: wrote ${count} thumbs → images/${code}/thumbs/`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
