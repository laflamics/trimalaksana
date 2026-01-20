const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const mdDir = path.join(rootDir, 'md');
const mdfileDir = path.join(rootDir, 'mdfile');

// Pastikan folder tujuan ada
[mdDir, mdfileDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Mapping kategori ke folder
const categoryMapping = {
  'gt-': mdfileDir,
  'packaging-': mdfileDir,
  'app-auto-update-': mdfileDir,
  'vercel-': mdfileDir,
  'fix-summary-': mdfileDir,
  'error-fix-summary': mdfileDir,
  'product-': mdfileDir,
  'local-server-sync-analysis': mdfileDir,
  'sales-order-': mdfileDir,
  'trucking-': mdfileDir,
  'complete-': mdfileDir,
  'simple-': mdfileDir,
  'verify-': mdfileDir,
  'GT-': mdfileDir,
  'PTP_': mdDir,
  'DATABASE_': mdDir,
  'DELETION_': mdDir,
  'FINAL_': mdDir,
  'IMPLEMENTATION_': mdDir,
  'OPTIMISTIC_': mdDir,
  'SERVER_': mdDir,
  'COMPLETE_': mdDir,
};

// Fungsi untuk menentukan folder tujuan berdasarkan nama file
function getTargetFolder(filename) {
  // Cek mapping kategori
  for (const [prefix, targetDir] of Object.entries(categoryMapping)) {
    if (filename.startsWith(prefix)) {
      return targetDir;
    }
  }
  
  // Default ke mdfile jika tidak ada kategori yang cocok
  return mdfileDir;
}

// Fungsi untuk memindahkan file
function moveMdFile(filename) {
  const sourcePath = path.join(rootDir, filename);
  const targetDir = getTargetFolder(filename);
  const targetPath = path.join(targetDir, filename);
  
  // Skip jika file sudah ada di folder tujuan
  if (fs.existsSync(targetPath)) {
    console.log(`⏭️  Skip: ${filename} sudah ada di ${path.basename(targetDir)}/`);
    return false;
  }
  
  // Skip jika file tidak ada di root
  if (!fs.existsSync(sourcePath)) {
    return false;
  }
  
  try {
    fs.renameSync(sourcePath, targetPath);
    console.log(`✅ Moved: ${filename} → ${path.basename(targetDir)}/`);
    return true;
  } catch (error) {
    console.error(`❌ Error moving ${filename}:`, error.message);
    return false;
  }
}

// Baca semua file di root directory
const files = fs.readdirSync(rootDir);

// Filter hanya file .md yang ada di root
const mdFiles = files.filter(file => {
  const filePath = path.join(rootDir, file);
  return fs.statSync(filePath).isFile() && 
         file.endsWith('.md') && 
         file !== 'README.md'; // Skip README.md di root
});

console.log(`\n📁 Found ${mdFiles.length} markdown files to organize\n`);

let movedCount = 0;
mdFiles.forEach(file => {
  if (moveMdFile(file)) {
    movedCount++;
  }
});

console.log(`\n✨ Done! Moved ${movedCount} files\n`);
