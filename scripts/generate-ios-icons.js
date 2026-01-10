const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// iOS App Icon sizes (dalam pixels)
// Format: { size: number, scale: '1x' | '2x' | '3x' }
const iconSizes = [
  // iPhone
  { size: 20, scale: '2x', name: 'Icon-App-20x20@2x.png' },
  { size: 20, scale: '3x', name: 'Icon-App-20x20@3x.png' },
  { size: 29, scale: '2x', name: 'Icon-App-29x29@2x.png' },
  { size: 29, scale: '3x', name: 'Icon-App-29x29@3x.png' },
  { size: 40, scale: '2x', name: 'Icon-App-40x40@2x.png' },
  { size: 40, scale: '3x', name: 'Icon-App-40x40@3x.png' },
  { size: 60, scale: '2x', name: 'Icon-App-60x60@2x.png' },
  { size: 60, scale: '3x', name: 'Icon-App-60x60@3x.png' },
  // iPad
  { size: 20, scale: '1x', name: 'Icon-App-20x20@1x.png' },
  { size: 29, scale: '1x', name: 'Icon-App-29x29@1x.png' },
  { size: 40, scale: '1x', name: 'Icon-App-40x40@1x.png' },
  { size: 76, scale: '1x', name: 'Icon-App-76x76@1x.png' },
  { size: 76, scale: '2x', name: 'Icon-App-76x76@2x.png' },
  { size: 83.5, scale: '2x', name: 'Icon-App-83.5x83.5@2x.png' },
  // App Store
  { size: 1024, scale: '1x', name: 'Icon-App-1024x1024@1x.png' },
];

// Path source logo
const sourceLogo = path.join(__dirname, '../public/noxtiz.png');
const iosAppPath = path.join(__dirname, '../ios/App/App');
const assetsPath = path.join(iosAppPath, 'Assets.xcassets');
let appIconPath = path.join(assetsPath, 'AppIcon.appiconset');

// Check if source logo exists
if (!fs.existsSync(sourceLogo)) {
  console.error('❌ Source logo not found:', sourceLogo);
  console.log('📝 Please make sure noxtiz.png exists in public folder');
  process.exit(1);
}

// Check if iOS folder exists
if (!fs.existsSync(iosAppPath)) {
  console.warn('⚠️  iOS folder not found:', iosAppPath);
  console.log('📝 iOS project belum dibuat. Icon akan di-generate ke folder temporary.');
  console.log('📝 Setelah iOS project dibuat (via GitHub Actions atau Mac), icon akan otomatis ter-copy saat sync.');
  console.log('');
  
  // Generate ke folder temporary untuk nanti di-copy manual
  const tempIconsPath = path.join(__dirname, '../ios-icons-temp');
  if (!fs.existsSync(tempIconsPath)) {
    fs.mkdirSync(tempIconsPath, { recursive: true });
  }
  appIconPath = path.join(tempIconsPath, 'AppIcon.appiconset');
  if (!fs.existsSync(appIconPath)) {
    fs.mkdirSync(appIconPath, { recursive: true });
  }
  console.log('📂 Generating icons to temporary folder:', appIconPath);
  console.log('📝 Setelah iOS project dibuat, copy folder AppIcon.appiconset ke:');
  console.log('   ios/App/App/Assets.xcassets/AppIcon.appiconset/');
  console.log('');
}

console.log('📱 Generating iOS App Icon set...');
console.log('📂 Source:', sourceLogo);
console.log('📂 Target:', appIconPath);

// Create directories if not exist
if (!fs.existsSync(assetsPath)) {
  fs.mkdirSync(assetsPath, { recursive: true });
}

if (!fs.existsSync(appIconPath)) {
  fs.mkdirSync(appIconPath, { recursive: true });
}

// Generate Contents.json for AppIcon.appiconset
const contentsJson = {
  images: iconSizes.map(({ size, scale, name }) => {
    const actualSize = size * (scale === '1x' ? 1 : scale === '2x' ? 2 : 3);
    return {
      filename: name,
      idiom: size >= 76 ? 'ipad' : 'iphone',
      scale: scale,
      size: `${size}x${size}`
    };
  }),
  info: {
    author: 'xcode',
    version: 1
  }
};

// Resize and save icons
async function generateIcons() {
  try {
    // Generate all icon sizes
    for (const { size, scale, name } of iconSizes) {
      const actualSize = size * (scale === '1x' ? 1 : scale === '2x' ? 2 : 3);
      const targetFile = path.join(appIconPath, name);

      await sharp(sourceLogo)
        .resize(actualSize, actualSize, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 } // Transparent background
        })
        .png()
        .toFile(targetFile);

      console.log(`✅ Created ${name} (${actualSize}x${actualSize}px)`);
    }

    // Write Contents.json
    const contentsPath = path.join(appIconPath, 'Contents.json');
    fs.writeFileSync(contentsPath, JSON.stringify(contentsJson, null, 2));
    console.log('✅ Created Contents.json');

    console.log('\n✨ iOS icon generation complete!');
    console.log('📝 Next steps:');
    console.log('   1. Run: npm run cap:sync:ios');
    console.log('   2. Open Xcode: npx cap open ios');
    console.log('   3. Verify icons in Assets.xcassets/AppIcon.appiconset');
  } catch (error) {
    console.error('❌ Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();

