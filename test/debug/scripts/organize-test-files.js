const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const testScriptsDir = path.join(rootDir, 'test', 'scripts');

// Pastikan folder tujuan ada
if (!fs.existsSync(testScriptsDir)) {
  fs.mkdirSync(testScriptsDir, { recursive: true });
}

// Pattern file yang perlu dipindahkan
const patterns = [
  'debug-*.js',
  'fix-*.js',
  'force-*.js',
  'gt-sync-*.js',
  'simple-*.js',
  'test-*.js',
  'check-*.js',
  'verify-*.js',
  'analyze-*.js',
  'clean-*.js',
  'trace-*.js',
  'monitor-*.js',
  'manual-*.js',
  'gt-*.js',
  'clear-*.js',
  'complete-*.js',
  'comprehensive-*.js',
  'update-*.js',
  'enhanced-*.js',
  'list-*.js',
  'merge-*.js',
  'sync-*.js',
  'run-*.js',
];

// Fungsi untuk check apakah file match pattern
function matchesPattern(filename, pattern) {
  const regex = pattern.replace(/\*/g, '.*');
  return new RegExp(`^${regex}$`).test(filename);
}

// Fungsi untuk memindahkan file
function moveFile(filename) {
  const sourcePath = path.join(rootDir, filename);
  const targetPath = path.join(testScriptsDir, filename);
  
  // Skip jika file tidak ada di root
  if (!fs.existsSync(sourcePath)) {
    return false;
  }
  
  // Skip jika file sudah ada di folder tujuan
  if (fs.existsSync(targetPath)) {
    console.log(`⏭️  Skip: ${filename} sudah ada di test/scripts/`);
    return false;
  }
  
  // Skip jika file ada di folder scripts (jangan pindahkan yang sudah di scripts/)
  const fileDir = path.dirname(sourcePath);
  if (fileDir !== rootDir) {
    return false;
  }
  
  try {
    fs.renameSync(sourcePath, targetPath);
    console.log(`✅ Moved: ${filename} → test/scripts/`);
    return true;
  } catch (error) {
    console.error(`❌ Error moving ${filename}:`, error.message);
    return false;
  }
}

// File yang harus di-skip (file penting yang tidak boleh dipindahkan)
const skipFiles = [
  'package.json',
  'vite.config.ts',
  'vitest.config.ts',
  'playwright.config.ts',
  'tsconfig.json',
  'capacitor.config.json',
];

// Baca semua file di root directory
const files = fs.readdirSync(rootDir);

// Filter file yang match pattern dan adalah file JavaScript
const filesToMove = files.filter(file => {
  // Skip file penting
  if (skipFiles.includes(file)) {
    return false;
  }
  
  const filePath = path.join(rootDir, file);
  
  // Pastikan ini file, bukan folder
  if (!fs.statSync(filePath).isFile()) {
    return false;
  }
  
  // Pastikan file JavaScript
  if (!file.endsWith('.js')) {
    return false;
  }
  
  // Skip file yang sudah di folder scripts atau test
  if (filePath.includes('scripts/') || filePath.includes('test/')) {
    return false;
  }
  
  // Check apakah match salah satu pattern
  return patterns.some(pattern => matchesPattern(file, pattern));
});

console.log(`\n📁 Found ${filesToMove.length} test/debug files to organize\n`);

let movedCount = 0;
filesToMove.forEach(file => {
  if (moveFile(file)) {
    movedCount++;
  }
});

console.log(`\n✨ Done! Moved ${movedCount} files to test/scripts/\n`);
