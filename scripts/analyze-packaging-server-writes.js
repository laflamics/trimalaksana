/**
 * Analisis khusus packaging server write paths
 * Fokus pada bagaimana data di-write ke server, bukan localStorage device
 */

const fs = require('fs');
const path = require('path');

console.log('📦 PACKAGING SERVER WRITE PATHS ANALYSIS\n');

// Function to find all packaging-related files
function findPackagingFiles() {
  const packagingFiles = [];
  
  // Packaging pages
  const packagingDir = 'src/pages/Packaging';
  if (fs.existsSync(packagingDir)) {
    const files = fs.readdirSync(packagingDir, { recursive: true });
    files.forEach(file => {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        packagingFiles.push(path.join(packagingDir, file));
      }
    });
  }
  
  // Packaging services
  const servicesDir = 'src/services';
  if (fs.existsSync(servicesDir)) {
    const files = fs.readdirSync(servicesDir);
    files.forEach(file => {
      if (file.includes('packaging') || file === 'storage.ts') {
        packagingFiles.push(path.join(servicesDir, file));
      }
    });
  }
  
  // Packaging utils
  const utilsDir = 'src/utils';
  if (fs.existsSync(utilsDir)) {
    const files = fs.readdirSync(utilsDir);
    files.forEach(file => {
      if (file.includes('packaging')) {
        packagingFiles.push(path.join(utilsDir, file));
      }
    });
  }
  
  return packagingFiles;
}

// Function to extract server write operations
function extractServerWrites(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);
    const serverWrites = [];
    
    // Look for storageService.set calls (these write to server)
    const setMatches = content.match(/storageService\.set\s*\(\s*['"`]([^'"`]+)['"`]/g);
    if (setMatches) {
      setMatches.forEach(match => {
        const keyMatch = match.match(/['"`]([^'"`]+)['"`]/);
        if (keyMatch) {
          serverWrites.push({
            type: 'STORAGE_WRITE',
            key: keyMatch[1],
            file: fileName,
            serverPath: getServerPath(keyMatch[1])
          });
        }
      });
    }
    
    // Look for direct file writes
    const fileWrites = content.match(/fs\.writeFileSync\s*\(\s*['"`]([^'"`]+)['"`]/g);
    if (fileWrites) {
      fileWrites.forEach(match => {
        const pathMatch = match.match(/['"`]([^'"`]+)['"`]/);
        if (pathMatch) {
          serverWrites.push({
            type: 'FILE_WRITE',
            path: pathMatch[1],
            file: fileName,
            serverPath: pathMatch[1]
          });
        }
      });
    }
    
    // Look for fetch POST/PUT calls (API writes)
    const fetchWrites = content.match(/fetch\s*\(\s*['"`]([^'"`]+)['"`][^}]*method:\s*['"`](POST|PUT|PATCH)['"`]/g);
    if (fetchWrites) {
      fetchWrites.forEach(match => {
        const urlMatch = match.match(/['"`]([^'"`]+)['"`]/);
        if (urlMatch) {
          serverWrites.push({
            type: 'API_WRITE',
            endpoint: urlMatch[1],
            file: fileName,
            serverPath: urlMatch[1]
          });
        }
      });
    }
    
    return serverWrites;
  } catch (error) {
    return [];
  }
}

// Function to determine server path based on storage key
function getServerPath(key) {
  // Based on storage.ts logic for packaging
  return `packaging/${key}`;
}

// Function to analyze packaging sync service
function analyzePackagingSyncService() {
  console.log('🔄 PACKAGING SYNC SERVICE ANALYSIS\n');
  
  const syncServicePath = 'src/services/packaging-sync.ts';
  if (fs.existsSync(syncServicePath)) {
    const content = fs.readFileSync(syncServicePath, 'utf8');
    
    console.log('📄 packaging-sync.ts found:');
    
    // Extract sync operations
    const syncOps = [];
    
    // Look for storage operations
    const storageOps = content.match(/storageService\.(get|set)\s*\(\s*['"`]([^'"`]+)['"`]/g);
    if (storageOps) {
      storageOps.forEach(op => {
        const keyMatch = op.match(/['"`]([^'"`]+)['"`]/);
        const isWrite = op.includes('.set');
        if (keyMatch) {
          syncOps.push({
            operation: isWrite ? 'WRITE' : 'READ',
            key: keyMatch[1],
            serverPath: `packaging/${keyMatch[1]}`
          });
        }
      });
    }
    
    // Display sync operations
    const writeOps = syncOps.filter(op => op.operation === 'WRITE');
    const readOps = syncOps.filter(op => op.operation === 'READ');
    
    console.log(`   📝 Write Operations: ${writeOps.length}`);
    writeOps.forEach(op => {
      console.log(`      - ${op.key} → /api/storage/${op.serverPath}`);
    });
    
    console.log(`   📖 Read Operations: ${readOps.length}`);
    readOps.forEach(op => {
      console.log(`      - ${op.key} ← /api/storage/${op.serverPath}`);
    });
    
  } else {
    console.log('❌ packaging-sync.ts not found');
  }
  console.log('');
}

// Function to check actual data files
function checkPackagingDataFiles() {
  console.log('📁 PACKAGING DATA FILES ANALYSIS\n');
  
  const dataPaths = [
    'data/packaging.json',
    'data/localStorage/packaging/',
    'data/localStorage/packaging.json',
    'data/localStorage/salesOrders.json',
    'data/localStorage/production.json',
    'data/localStorage/deliveryNotes.json',
    'data/localStorage/purchaseOrders.json',
    'data/localStorage/spk.json',
    'data/localStorage/grn.json',
    'data/localStorage/inventory.json',
    'data/localStorage/materials.json',
    'data/localStorage/bom.json',
    'data/localStorage/qc.json',
    'data/localStorage/schedule.json'
  ];
  
  dataPaths.forEach(dataPath => {
    if (fs.existsSync(dataPath)) {
      const stat = fs.statSync(dataPath);
      if (stat.isDirectory()) {
        const files = fs.readdirSync(dataPath);
        console.log(`✅ ${dataPath} (directory with ${files.length} files)`);
        files.slice(0, 5).forEach(file => {
          console.log(`      - ${file}`);
        });
        if (files.length > 5) {
          console.log(`      ... and ${files.length - 5} more files`);
        }
      } else {
        console.log(`✅ ${dataPath} (${Math.round(stat.size / 1024)}KB)`);
      }
    } else {
      console.log(`❌ ${dataPath} (not found)`);
    }
  });
  console.log('');
}

// Main analysis function
function analyzePackagingServerWrites() {
  console.log('📝 PACKAGING SERVER WRITE OPERATIONS\n');
  
  const packagingFiles = findPackagingFiles();
  console.log(`Found ${packagingFiles.length} packaging-related files\n`);
  
  const allWrites = [];
  
  packagingFiles.forEach(filePath => {
    const writes = extractServerWrites(filePath);
    allWrites.push(...writes);
  });
  
  // Group by type
  const writesByType = {
    'STORAGE_WRITE': [],
    'FILE_WRITE': [],
    'API_WRITE': []
  };
  
  allWrites.forEach(write => {
    writesByType[write.type].push(write);
  });
  
  // Display results
  Object.entries(writesByType).forEach(([type, writes]) => {
    if (writes.length > 0) {
      console.log(`🔧 ${type} (${writes.length} operations):`);
      
      // Remove duplicates by key/path
      const uniqueWrites = [...new Map(writes.map(w => [w.key || w.path || w.endpoint, w])).values()];
      
      uniqueWrites.forEach(write => {
        if (write.key) {
          console.log(`   📝 ${write.key} → /api/storage/${write.serverPath} (${write.file})`);
        } else if (write.path) {
          console.log(`   📁 ${write.path} (${write.file})`);
        } else if (write.endpoint) {
          console.log(`   🌐 ${write.endpoint} (${write.file})`);
        }
      });
      console.log('');
    }
  });
  
  return allWrites;
}

// Main execution
function main() {
  try {
    const allWrites = analyzePackagingServerWrites();
    analyzePackagingSyncService();
    checkPackagingDataFiles();
    
    // Summary
    console.log('📊 PACKAGING SERVER WRITES SUMMARY');
    console.log('='.repeat(60));
    
    const storageWrites = allWrites.filter(w => w.type === 'STORAGE_WRITE');
    const fileWrites = allWrites.filter(w => w.type === 'FILE_WRITE');
    const apiWrites = allWrites.filter(w => w.type === 'API_WRITE');
    
    console.log(`Storage Writes to Server: ${storageWrites.length}`);
    console.log(`Direct File Writes: ${fileWrites.length}`);
    console.log(`API Writes: ${apiWrites.length}`);
    console.log(`Total Server Write Operations: ${allWrites.length}`);
    
    console.log('\n🎯 Key Server Write Paths for Packaging:');
    const uniqueServerPaths = [...new Set(storageWrites.map(w => `/api/storage/${w.serverPath}`))];
    uniqueServerPaths.sort().forEach(path => {
      console.log(`   - ${path}`);
    });
    
    console.log('\n✅ Packaging server write analysis completed!');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
  }
}

// Run the analysis
main();