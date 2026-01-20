/**
 * Debug packaging read operations dan sync issues
 * Cek kenapa read bisa ngaco
 */

const fs = require('fs');

console.log('🔍 DEBUGGING PACKAGING READ OPERATIONS\n');

function analyzePackagingReads() {
  console.log('📖 ANALYZING READ OPERATIONS IN PACKAGING SALESORDERS\n');
  
  const filePath = 'src/pages/Packaging/SalesOrders.tsx';
  if (!fs.existsSync(filePath)) {
    console.log('❌ File not found:', filePath);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  // Find all storageService.get calls
  const readOperations = [];
  
  lines.forEach((line, index) => {
    if (line.includes('storageService.get')) {
      const keyMatch = line.match(/storageService\.get\s*<[^>]*>\s*\(\s*['"`]([^'"`]+)['"`]/) ||
                      line.match(/storageService\.get\s*\(\s*['"`]([^'"`]+)['"`]/);
      const key = keyMatch ? keyMatch[1] : 'UNKNOWN';
      
      readOperations.push({
        lineNumber: index + 1,
        line: line.trim(),
        key: key
      });
    }
  });
  
  console.log(`Found ${readOperations.length} read operations:\n`);
  
  const keyCount = {};
  readOperations.forEach((op, idx) => {
    console.log(`${idx + 1}. LINE ${op.lineNumber}: ${op.key}`);
    console.log(`   Code: ${op.line}`);
    console.log('');
    
    keyCount[op.key] = (keyCount[op.key] || 0) + 1;
  });
  
  console.log('📊 READ OPERATIONS SUMMARY:');
  Object.entries(keyCount).forEach(([key, count]) => {
    console.log(`   📖 ${key} (${count} times)`);
  });
  console.log('');
  
  return readOperations;
}

function checkStorageServiceGetImplementation() {
  console.log('🔧 CHECKING STORAGE SERVICE GET IMPLEMENTATION\n');
  
  const storageFile = 'src/services/storage.ts';
  if (!fs.existsSync(storageFile)) {
    console.log('❌ Storage service file not found');
    return;
  }
  
  const content = fs.readFileSync(storageFile, 'utf8');
  
  // Find the get method implementation
  const getMethodMatch = content.match(/async get<T>\(key: string\)[^}]+}/s);
  if (getMethodMatch) {
    console.log('📋 get() method implementation:');
    console.log(getMethodMatch[0].substring(0, 500) + '...');
    console.log('');
  }
  
  // Check for server mode logic
  if (content.includes('config.type === \'server\'')) {
    console.log('✅ Server mode logic found in get() method');
  } else {
    console.log('❌ No server mode logic in get() method');
  }
  
  // Check for sync logic
  const syncPatterns = [
    'syncFromServer',
    'syncDataFromServer', 
    'fetch.*GET',
    'background.*sync'
  ];
  
  syncPatterns.forEach(pattern => {
    const regex = new RegExp(pattern, 'i');
    if (regex.test(content)) {
      console.log(`✅ Found sync pattern: ${pattern}`);
    } else {
      console.log(`❌ Missing sync pattern: ${pattern}`);
    }
  });
  console.log('');
}

function checkStorageConfig() {
  console.log('⚙️  CHECKING STORAGE CONFIGURATION\n');
  
  const configPaths = [
    'data/localStorage/storage_config.json',
    'data/localStorage/storage_config_server.json'
  ];
  
  configPaths.forEach(path => {
    if (fs.existsSync(path)) {
      try {
        const config = JSON.parse(fs.readFileSync(path, 'utf8'));
        console.log(`✅ ${path}:`);
        console.log(`   Type: ${config.type || config.value?.type || 'unknown'}`);
        console.log(`   Server URL: ${config.serverUrl || config.value?.serverUrl || 'none'}`);
        console.log('');
      } catch (error) {
        console.log(`❌ ${path}: Error reading - ${error.message}`);
      }
    } else {
      console.log(`❌ ${path}: Not found`);
    }
  });
}

function checkDataConsistency() {
  console.log('🔄 CHECKING DATA CONSISTENCY ISSUES\n');
  
  const dataFiles = [
    'data/localStorage/salesOrders.json',
    'data/localStorage/products.json',
    'data/localStorage/quotations.json',
    'data/localStorage/inventory.json'
  ];
  
  dataFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(content);
        
        console.log(`📄 ${filePath}:`);
        
        // Check data structure
        if (data.value !== undefined) {
          console.log(`   Structure: Wrapped (has .value property)`);
          console.log(`   Items: ${Array.isArray(data.value) ? data.value.length : typeof data.value}`);
          console.log(`   Timestamp: ${data.timestamp || data._timestamp || 'missing'}`);
        } else if (Array.isArray(data)) {
          console.log(`   Structure: Direct array`);
          console.log(`   Items: ${data.length}`);
          console.log(`   Timestamp: missing (direct array)`);
        } else {
          console.log(`   Structure: ${typeof data}`);
          console.log(`   Content: ${JSON.stringify(data).substring(0, 100)}...`);
        }
        
        // Check for corruption signs
        const contentStr = JSON.stringify(data);
        if (contentStr.includes('undefined') || contentStr.includes('null')) {
          console.log(`   ⚠️  Potential corruption: contains undefined/null values`);
        }
        
        if (data.value && Array.isArray(data.value) && data.value.length > 0) {
          const firstItem = data.value[0];
          if (!firstItem.id && !firstItem._id) {
            console.log(`   ⚠️  Potential issue: items missing ID field`);
          }
        }
        
      } catch (error) {
        console.log(`❌ ${filePath}: JSON parse error - ${error.message}`);
      }
    } else {
      console.log(`❌ ${filePath}: File not found`);
    }
    console.log('');
  });
}

function checkSyncStatus() {
  console.log('🔄 CHECKING SYNC STATUS\n');
  
  const syncFiles = [
    'data/localStorage/sync.json',
    'data/localStorage/last_sync_timestamp.json',
    'data/localStorage/_timestamp.json'
  ];
  
  syncFiles.forEach(path => {
    if (fs.existsSync(path)) {
      try {
        const data = JSON.parse(fs.readFileSync(path, 'utf8'));
        console.log(`✅ ${path}:`);
        console.log(`   Content: ${JSON.stringify(data, null, 2)}`);
      } catch (error) {
        console.log(`❌ ${path}: Error - ${error.message}`);
      }
    } else {
      console.log(`❌ ${path}: Not found`);
    }
    console.log('');
  });
}

function identifyPotentialIssues() {
  console.log('🚨 POTENTIAL READ ISSUES ANALYSIS\n');
  
  const issues = [];
  
  // Check if storage config indicates server mode but no sync implementation
  const configPath = 'data/localStorage/storage_config.json';
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const configType = config.type || config.value?.type;
      
      if (configType === 'server') {
        issues.push('🔧 App configured for server mode - reads should sync from server');
        
        // Check if server URL is valid
        const serverUrl = config.serverUrl || config.value?.serverUrl;
        if (!serverUrl) {
          issues.push('❌ Server mode enabled but no server URL configured');
        } else {
          issues.push(`🌐 Server URL: ${serverUrl}`);
        }
      }
    } catch (error) {
      issues.push('❌ Storage config corrupted');
    }
  }
  
  // Check for data structure inconsistencies
  const salesOrdersPath = 'data/localStorage/salesOrders.json';
  if (fs.existsSync(salesOrdersPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(salesOrdersPath, 'utf8'));
      if (!data.value && !Array.isArray(data)) {
        issues.push('⚠️  salesOrders.json has unexpected structure');
      }
    } catch (error) {
      issues.push('❌ salesOrders.json is corrupted');
    }
  }
  
  if (issues.length > 0) {
    console.log('Found potential issues:');
    issues.forEach(issue => console.log(`   ${issue}`));
  } else {
    console.log('✅ No obvious issues detected');
  }
  console.log('');
}

// Main execution
function main() {
  try {
    analyzePackagingReads();
    checkStorageServiceGetImplementation();
    checkStorageConfig();
    checkDataConsistency();
    checkSyncStatus();
    identifyPotentialIssues();
    
    console.log('🎯 SUMMARY');
    console.log('='.repeat(60));
    console.log('This debug analysis checks:');
    console.log('1. What data Packaging SalesOrders tries to read');
    console.log('2. How storage service get() method works');
    console.log('3. Storage configuration (local vs server mode)');
    console.log('4. Data file consistency and structure');
    console.log('5. Sync status and potential issues');
    
  } catch (error) {
    console.error('❌ Error during debug:', error.message);
  }
}

main();