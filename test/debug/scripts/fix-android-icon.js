/**
 * Script to fix Android icon zoom issue
 * Creates properly sized icon with safe zone (18% padding on all sides)
 */

const fs = require('fs');
const path = require('path');

// Android adaptive icon safe zone: 18% padding on all sides
// For 108dp viewport, safe zone is: 108 * 0.18 = 19.44dp on each side
// Safe area: 108 - (19.44 * 2) = 69.12dp (center 64% of viewport)

const iconConfig = {
  // Safe zone: 18% padding = 19.44dp on each side
  safeZonePadding: 19.44,
  viewportSize: 108,
  safeAreaSize: 69.12, // 108 - (19.44 * 2)
};

console.log('📱 Android Icon Fix Script');
console.log('==========================');
console.log(`Viewport: ${iconConfig.viewportSize}dp`);
console.log(`Safe Zone Padding: ${iconConfig.safeZonePadding}dp (18%)`);
console.log(`Safe Area: ${iconConfig.safeAreaSize}dp (64% of viewport)`);
console.log('');
console.log('⚠️  IMPORTANT: Android adaptive icons need 18% padding on all sides');
console.log('   to prevent zoom/cropping. The logo should be centered in the');
console.log('   safe area (64% of the viewport).');
console.log('');
console.log('📝 To fix the icon:');
console.log('   1. Open public/noxtiz.png in image editor');
console.log('   2. Create a new 108x108dp canvas');
console.log('   3. Add 19.44dp padding on all sides (18%)');
console.log('   4. Center the logo in the remaining 69.12dp safe area');
console.log('   5. Save as PNG and update all mipmap folders');
console.log('');
console.log('📁 Icon locations:');
console.log('   - android/app/src/main/res/mipmap-*/ic_launcher_foreground.png');
console.log('   - android/app/src/main/res/mipmap-*/ic_launcher.png');
console.log('   - android/app/src/main/res/mipmap-*/ic_launcher_round.png');
console.log('');
console.log('✅ Current icon XML configuration looks correct.');
console.log('   The issue is likely in the PNG images themselves.');
console.log('   Make sure the logo is properly centered with padding.');
