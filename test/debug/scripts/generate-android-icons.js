const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Ukuran icon untuk setiap density (dalam pixels)
const iconSizes = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

// Path source logo
const sourceLogo = path.join(__dirname, '../public/noxtiz.png');
const androidResPath = path.join(__dirname, '../android/app/src/main/res');

// Check if source logo exists
if (!fs.existsSync(sourceLogo)) {
  console.error('❌ Source logo not found:', sourceLogo);
  console.log('📝 Please make sure noxtiz.png exists in public folder');
  process.exit(1);
}

console.log('📱 Generating Android icon set...');
console.log('📂 Source:', sourceLogo);

// Resize and save icons
async function generateIcons() {
  try {
    for (const [folder, size] of Object.entries(iconSizes)) {
      const targetDir = path.join(androidResPath, folder);
      const targetFile = path.join(targetDir, 'ic_launcher.png');
      const targetFileRound = path.join(targetDir, 'ic_launcher_round.png');
      const targetFileForeground = path.join(targetDir, 'ic_launcher_foreground.png');

      // Create directory if not exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Resize and save to all three files
      await sharp(sourceLogo)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(targetFile);

      await sharp(sourceLogo)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(targetFileRound);

      await sharp(sourceLogo)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png()
        .toFile(targetFileForeground);

      console.log(`✅ Created icons in ${folder} (${size}x${size}px)`);
    }

    console.log('\n✨ Icon generation complete!');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();

