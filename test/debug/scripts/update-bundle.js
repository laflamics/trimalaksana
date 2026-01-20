const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data/localStorage');
const BUNDLE_DIR = path.join(__dirname, '../data-bundle/localStorage');

async function updateBundle() {
  console.log('🔄 Updating data-bundle from data/localStorage...\n');

  try {
    // Ensure bundle directory exists
    await fs.mkdir(BUNDLE_DIR, { recursive: true });

    // Read all files from data/localStorage
    const files = await fs.readdir(DATA_DIR, { withFileTypes: true });
    
    let copied = 0;
    let errors = [];

    for (const file of files) {
      if (file.isFile() && file.name.endsWith('.json')) {
        try {
          const sourcePath = path.join(DATA_DIR, file.name);
          const destPath = path.join(BUNDLE_DIR, file.name);
          
          // Copy file
          await fs.copyFile(sourcePath, destPath);
          console.log(`✓ Copied ${file.name}`);
          copied++;
        } catch (error) {
          console.error(`✗ Error copying ${file.name}:`, error.message);
          errors.push(file.name);
        }
      } else if (file.isDirectory()) {
        // Handle subdirectories (general-trading, tracking, etc.)
        const sourceDir = path.join(DATA_DIR, file.name);
        const destDir = path.join(BUNDLE_DIR, file.name);
        
        try {
          await fs.mkdir(destDir, { recursive: true });
          
          // Copy all JSON files from subdirectory
          const subFiles = await fs.readdir(sourceDir, { withFileTypes: true });
          for (const subFile of subFiles) {
            if (subFile.isFile() && subFile.name.endsWith('.json')) {
              const sourcePath = path.join(sourceDir, subFile.name);
              const destPath = path.join(destDir, subFile.name);
              await fs.copyFile(sourcePath, destPath);
              console.log(`✓ Copied ${file.name}/${subFile.name}`);
              copied++;
            }
          }
        } catch (error) {
          console.error(`✗ Error copying directory ${file.name}:`, error.message);
          errors.push(file.name);
        }
      }
    }

    console.log(`\n✅ Updated ${copied} files to data-bundle`);
    if (errors.length > 0) {
      console.log(`⚠️  ${errors.length} errors occurred`);
    }
    console.log('\n💡 Now you can build the app with: npm run build:app');
  } catch (error) {
    console.error('❌ Error updating bundle:', error);
    process.exit(1);
  }
}

updateBundle();

