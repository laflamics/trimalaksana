/**
 * Comprehensive analysis of all server paths used in the application
 * Including storage keys, API endpoints, and data paths
 */

const fs = require('fs');
const path = require('path');

console.log('🌐 COMPREHENSIVE SERVER PATHS ANALYSIS\n');

// Function to extract all storage keys from files
function extractStorageKeys() {
  console.log('🔑 STORAGE KEYS ANALYSIS\n');
  
  const storageKeys = new Set();
  const keyUsage = {};
  
  // Find all TypeScript/React files
  function findFiles(dir, files = []) {
    if (!fs.existsSync(dir)) return files;
    
    fs.readdirSync(dir).forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        findFiles(filePath, files);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        files.push(filePath);
      }
    });
    
    return files;
  }
  
  const allFiles = findFiles('src');
  
  allFiles.forEach(filePath => {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const fileName = path.basename(filePath);
      
      // Extract storage service calls
      const storageMatches = content.match(/storageService\.(get|set)\s*<[^>]*>\s*\(\s*['"`]([^'"`]+)['"`]/g) ||
                           content.match(/storageService\.(get|set)\s*\(\s*['"`]([^'"`]+)['"`]/g) || [];
      
      storageMatches.forEach(match => {
        const keyMatch = match.match(/['"`]([^'"`]+)['"`]/);
        if (keyMatch) {
          const key = keyMatch[1];
          storageKeys.add(key);
          
          if (!keyUsage[key]) {
            keyUsage[key] = { files: [], operations: [] };
          }
          
          keyUsage[key].files.push(fileName);
          keyUsage[key].operations.push(match.includes('.get') ? 'READ' : 'WRITE');
        }
      });
      
    } catch (error) {
      // Skip files that can't be read
    }
  });
  
  // Group storage keys by module
  const keysByModule = {
    'PACKAGING': [],
    'GENERAL TRADING': [],
    'TRUCKING': [],
    'SHARED': []
  };
  
  Array.from(storageKeys).sort().forEach(key => {
    if (key.startsWith('gt_') || key.includes('general-trading')) {
      keysByModule['GENERAL TRADING'].push(key);
    } else if (key.startsWith('trucking_') || key.includes('trucking')) {
      keysByModule['TRUCKING'].push(key);
    } else if (key.includes('packaging')) {
      keysByModule['PACKAGING'].push(key);
    } else {
      keysByModule['SHARED'].push(key);
    }
  });
  
  // Display results
  Object.entries(keysByModule).forEach(([module, keys]) => {
    if (keys.length > 0) {
      console.log(`📦 ${module} STORAGE KEYS (${keys.length}):`);
      keys.forEach(key => {
        const usage = keyUsage[key];
        const operations = [...new Set(usage.operations)].join(', ');
        const fileCount = new Set(usage.files).size;
        console.log(`   🔑 ${key} (${operations}) - used in ${fileCount} files`);
      });
      console.log('');
    }
  });
  
  return { storageKeys: Array.from(storageKeys), keyUsage };
}

// Function to analyze server path mappings
function analyzeServerPathMappings(storageKeys) {
  console.log('🗺️  SERVER PATH MAPPINGS\n');
  
  // Based on storage.ts logic
  const pathMappings = {
    'PACKAGING': [],
    'GENERAL TRADING': [],
    'TRUCKING': []
  };
  
  storageKeys.forEach(key => {
    if (key.startsWith('gt_') || key.includes('general-trading')) {
      pathMappings['GENERAL TRADING'].push({
        key: key,
        serverPath: `general-trading/${key}`,
        apiEndpoint: `/api/storage/general-trading/${key}`
      });
    } else if (key.startsWith('trucking_') || key.includes('trucking')) {
      pathMappings['TRUCKING'].push({
        key: key,
        serverPath: `trucking/${key}`,
        apiEndpoint: `/api/storage/trucking/${key}`
      });
    } else {
      pathMappings['PACKAGING'].push({
        key: key,
        serverPath: `packaging/${key}`,
        apiEndpoint: `/api/storage/packaging/${key}`
      });
    }
  });
  
  Object.entries(pathMappings).forEach(([module, mappings]) => {
    if (mappings.length > 0) {
      console.log(`🌐 ${module} SERVER PATHS (${mappings.length}):`);
      mappings.forEach(mapping => {
        console.log(`   📁 ${mapping.key}`);
        console.log(`      Server Path: ${mapping.serverPath}`);
        console.log(`      API Endpoint: ${mapping.apiEndpoint}`);
        console.log('');
      });
    }
  });
  
  return pathMappings;
}

// Function to analyze other API endpoints
function analyzeOtherAPIEndpoints() {
  console.log('🔗 OTHER API ENDPOINTS\n');
  
  const apiEndpoints = [
    '/api/updates/latest.yml',
    '/api/updates/latest-android.yml',
    '/api/updates/{apkFile}',
    '/api/storage/{serverPath}',
    '/api/attendance',
    '/api/fingerprint/*'
  ];
  
  apiEndpoints.forEach(endpoint => {
    console.log(`   🌐 ${endpoint}`);
  });
  
  console.log('');
}

// Function to analyze file system paths
function analyzeFileSystemPaths() {
  console.log('📁 FILE SYSTEM PATHS\n');
  
  const dataPaths = [
    'data/localStorage/',
    'data/localStorage/packaging/',
    'data/localStorage/general-trading/',
    'data/localStorage/trucking/',
    'data/gt.json/',
    'data/uploads/',
    'data/trimafolder/'
  ];
  
  dataPaths.forEach(dataPath => {
    if (fs.existsSync(dataPath)) {
      console.log(`   ✅ ${dataPath} (exists)`);
    } else {
      console.log(`   ❌ ${dataPath} (not found)`);
    }
  });
  
  console.log('');
}

// Function to generate comprehensive summary
function generateComprehensiveSummary(storageKeys, pathMappings) {
  console.log('📊 COMPREHENSIVE SUMMARY\n');
  console.log('='.repeat(80));
  
  // Storage keys summary
  console.log(`\n🔑 STORAGE KEYS SUMMARY:`);
  console.log(`   Total Storage Keys: ${storageKeys.length}`);
  
  Object.entries(pathMappings).forEach(([module, mappings]) => {
    console.log(`   ${module}: ${mappings.length} keys`);
  });
  
  // Server endpoints summary
  console.log(`\n🌐 SERVER ENDPOINTS SUMMARY:`);
  let totalEndpoints = 0;
  Object.values(pathMappings).forEach(mappings => {
    totalEndpoints += mappings.length;
  });
  console.log(`   Total API Storage Endpoints: ${totalEndpoints}`);
  console.log(`   Additional API Endpoints: 6+ (updates, fingerprint, etc.)`);
  
  // Path structure
  console.log(`\n📁 PATH STRUCTURE:`);
  console.log(`   Base API: /api/storage/{business}/{key}`);
  console.log(`   Business Types: packaging, general-trading, trucking`);
  console.log(`   Local Storage: data/localStorage/{business}/`);
  
  console.log('\n✅ Comprehensive server paths analysis completed!');
}

// Main execution
function main() {
  try {
    const { storageKeys, keyUsage } = extractStorageKeys();
    const pathMappings = analyzeServerPathMappings(storageKeys);
    analyzeOtherAPIEndpoints();
    analyzeFileSystemPaths();
    generateComprehensiveSummary(storageKeys, pathMappings);
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
  }
}

// Run the analysis
main();