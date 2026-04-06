#!/usr/bin/env node

/**
 * Image Optimization Script for Amfibido Website
 * This script optimizes all images in the images directory by:
 * 1. Resizing large images to reasonable dimensions
 * 2. Compressing images to reduce file size
 * 3. Converting to optimal web formats when appropriate
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const MAX_WIDTH = 1920; // Maximum width for any image
const MAX_HEIGHT = 1920; // Maximum height for any image
const QUALITY = 85; // Quality level for JPEG compression (0-100)
const PNG_QUALITY = "65-85"; // Quality range for PNG compression
const TARGET_MAX_SIZE_MB = 0.5; // Target maximum file size in MB
const EXEMPT_FOLDERS = []; // Empty the exempt folders array to process all images

// Special handling for logos and crests
const LOGO_MAX_WIDTH = 600; // Smaller max width for logos
const LOGO_MAX_HEIGHT = 600; // Smaller max height for logos
const CREST_MAX_WIDTH = 400; // Smaller max width for crests
const CREST_MAX_HEIGHT = 400; // Smaller max height for crests

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

// Check if required tools are installed
try {
  execSync('which convert', { stdio: 'pipe' });
} catch (error) {
  log('ImageMagick is required but not installed. Please install ImageMagick first.', colors.red);
  log('On macOS: brew install imagemagick', colors.yellow);
  log('On Ubuntu/Debian: sudo apt-get install imagemagick', colors.yellow);
  process.exit(1);
}

// Check for pngquant for better PNG optimization
let hasPngquant = false;
try {
  execSync('which pngquant', { stdio: 'pipe' });
  hasPngquant = true;
  log('pngquant detected - will use for PNG optimization', colors.green);
} catch (error) {
  log('pngquant not found - will use ImageMagick for PNG optimization (less efficient)', colors.yellow);
  log('For better PNG compression, install pngquant:', colors.yellow);
  log('On macOS: brew install pngquant', colors.yellow);
  log('On Ubuntu/Debian: sudo apt-get install pngquant', colors.yellow);
}

// Create backup directory
const backupDir = path.join(__dirname, 'images-backup-' + new Date().toISOString().replace(/[:.]/g, '-'));
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
  log(`Created backup directory: ${backupDir}`, colors.green);
}

// Get a list of all image files
function getImageFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    // Skip exempt folders
    if (stat.isDirectory()) {
      // Check if this is an exempt folder
      const folderName = path.basename(filePath);
      if (EXEMPT_FOLDERS.includes(folderName)) {
        log(`Skipping exempt folder: ${folderName}`, colors.yellow);
        return;
      }
      getImageFiles(filePath, fileList);
      return;
    }

    // Only process image files
    const ext = path.extname(file).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif'].includes(ext)) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Process an image file
function processImage(filePath) {
  const fileName = path.basename(filePath);
  const fileExt = path.extname(fileName).toLowerCase();
  const fileSize = fs.statSync(filePath).size / (1024 * 1024); // Size in MB

  log(`Processing: ${filePath} (${fileSize.toFixed(2)} MB)`, colors.blue);

  // Get image dimensions and type (needed to decide resize even when file size is small)
  let dimensions;
  let hasTransparency = false;
  try {
    const result = execSync(`identify -format "%wx%h" "${filePath}"`).toString().trim();
    const [width, height] = result.split('x').map(Number);
    dimensions = { width, height };

    // Check if the image has transparency (important for PNGs)
    if (fileExt === '.png') {
      const alphaCheck = execSync(`identify -format "%[channels]" "${filePath}"`).toString().trim();
      hasTransparency = alphaCheck.includes('a');
      if (hasTransparency) {
        log(`  ℹ PNG has transparency, preserving alpha channel`, colors.blue);
      }
    }
  } catch (error) {
    log(`  ✗ Failed to get image information: ${error.message}`, colors.red);
    return;
  }

  // Determine max dimensions based on file type
  let maxWidth = MAX_WIDTH;
  let maxHeight = MAX_HEIGHT;

  // Special handling for logos and crests
  if (fileName === 'logo.png') {
    maxWidth = LOGO_MAX_WIDTH;
    maxHeight = LOGO_MAX_HEIGHT;
    log(`  ℹ Using logo-specific dimensions: ${maxWidth}x${maxHeight}`, colors.blue);
  } else if (fileName === 'crest.png') {
    maxWidth = CREST_MAX_WIDTH;
    maxHeight = CREST_MAX_HEIGHT;
    log(`  ℹ Using crest-specific dimensions: ${maxWidth}x${maxHeight}`, colors.blue);
  }

  const needsResize = dimensions.width > maxWidth || dimensions.height > maxHeight;
  const needsOptimize = fileSize >= TARGET_MAX_SIZE_MB;

  // Skip only when dimensions are within limits and file is already small enough
  if (!needsResize && !needsOptimize) {
    log(
      `  ✓ Already optimized (${fileSize.toFixed(2)} MB, ${dimensions.width}x${dimensions.height})`,
      colors.green
    );
    return;
  }

  // Create backup directory structure
  const relativeDir = path.relative(path.join(__dirname, 'images'), path.dirname(filePath));
  const backupFilePath = path.join(backupDir, relativeDir, fileName);

  // Create backup folder if it doesn't exist
  const backupFileDir = path.dirname(backupFilePath);
  if (!fs.existsSync(backupFileDir)) {
    fs.mkdirSync(backupFileDir, { recursive: true });
  }

  // Create backup
  fs.copyFileSync(filePath, backupFilePath);

  // Optimize the image based on type
  try {
    // First handle resizing if needed (use ImageMagick for all resize operations)
    let tempResizedFile = filePath;
    if (needsResize) {
      log(`  ↓ Resizing from ${dimensions.width}x${dimensions.height} to max ${maxWidth}x${maxHeight}`, colors.yellow);

      // Calculate new dimensions maintaining aspect ratio
      let newWidth, newHeight;
      if (dimensions.width > dimensions.height) {
        newWidth = Math.min(dimensions.width, maxWidth);
        newHeight = Math.round(dimensions.height * (newWidth / dimensions.width));
      } else {
        newHeight = Math.min(dimensions.height, maxHeight);
        newWidth = Math.round(dimensions.width * (newHeight / dimensions.height));
      }

      // Create temporary resized file
      tempResizedFile = `${filePath}.resized${fileExt}`;
      execSync(`convert "${filePath}" -resize ${newWidth}x${newHeight} "${tempResizedFile}"`);
    }

    // Then handle compression based on file type
    if (fileExt === '.png') {
      const magickPng = () => {
        log(`  🔄 Using ImageMagick for PNG optimization`, colors.blue);
        const optimizeCommand = hasTransparency
          ? `convert "${tempResizedFile}" -define png:compression-level=9 -strip "${filePath}"`
          : `convert "${tempResizedFile}" -quality ${QUALITY} -strip "${filePath}"`;
        execSync(optimizeCommand);
      };

      if (hasPngquant && !hasTransparency) {
        const pngquantOut = path.join(
          path.dirname(filePath),
          `${path.basename(filePath, fileExt)}-pngquant${fileExt}`
        );
        try {
          log(`  🔄 Using pngquant for PNG optimization`, colors.blue);
          execSync(`pngquant --quality=${PNG_QUALITY} --force --output="${pngquantOut}" "${tempResizedFile}"`);
          fs.renameSync(pngquantOut, filePath);
        } catch (pngquantErr) {
          if (fs.existsSync(pngquantOut)) {
            fs.unlinkSync(pngquantOut);
          }
          log(`  ℹ pngquant failed (${pngquantErr.message.trim()}), falling back to ImageMagick`, colors.yellow);
          magickPng();
        }
      } else {
        magickPng();
      }
    } else if (['.jpg', '.jpeg'].includes(fileExt)) {
      // JPEG optimization
      log(`  🔄 Optimizing JPEG with quality ${QUALITY}`, colors.blue);
      execSync(`convert "${tempResizedFile}" -quality ${QUALITY} -strip "${filePath}"`);
    } else if (fileExt === '.gif') {
      // GIF optimization
      log(`  🔄 Optimizing GIF`, colors.blue);
      execSync(`convert "${tempResizedFile}" -strip "${filePath}"`);
    }

    // Remove temp file if it was created
    if (tempResizedFile !== filePath && fs.existsSync(tempResizedFile)) {
      fs.unlinkSync(tempResizedFile);
    }

    const newFileSize = fs.statSync(filePath).size / (1024 * 1024); // Size in MB
    const reduction = ((fileSize - newFileSize) / fileSize) * 100;

    if (reduction > 0) {
      log(`  ✓ Optimized: ${fileSize.toFixed(2)} MB → ${newFileSize.toFixed(2)} MB (${reduction.toFixed(1)}% reduction)`, colors.green);
    } else if (needsResize) {
      log(
        `  ✓ Resized/compressed: ${fileSize.toFixed(2)} MB → ${newFileSize.toFixed(2)} MB (keeping smaller dimensions despite byte change)`,
        colors.green
      );
    } else {
      log(`  ⚠ File size increased: ${fileSize.toFixed(2)} MB → ${newFileSize.toFixed(2)} MB (${Math.abs(reduction).toFixed(1)}% increase)`, colors.yellow);
      log(`  🔄 Restoring original file to prevent size increase`, colors.yellow);
      fs.copyFileSync(backupFilePath, filePath);
    }
  } catch (error) {
    log(`  ✗ Failed to optimize: ${error.message}`, colors.red);
  }
}

// Main function
function main() {
  log('🖼️  Starting image optimization...', colors.cyan);
  const imageDir = path.join(__dirname, 'images');
  const imageFiles = getImageFiles(imageDir);

  log(`Found ${imageFiles.length} images to process`, colors.cyan);

  // Process all images
  let successCount = 0;
  let errorCount = 0;

  imageFiles.forEach((filePath, index) => {
    try {
      log(`\n[${index + 1}/${imageFiles.length}]`, colors.magenta);
      processImage(filePath);
      successCount++;
    } catch (error) {
      log(`Error processing ${filePath}: ${error.message}`, colors.red);
      errorCount++;
    }
  });

  log('\n📊 Optimization Summary:', colors.cyan);
  log(`Total images: ${imageFiles.length}`, colors.cyan);
  log(`Successfully optimized: ${successCount}`, colors.green);
  if (errorCount > 0) {
    log(`Failed: ${errorCount}`, colors.red);
  }
  log(`\nBackups saved to: ${backupDir}`, colors.yellow);
  log('\n✨ Image optimization complete!', colors.cyan);
}

main();
