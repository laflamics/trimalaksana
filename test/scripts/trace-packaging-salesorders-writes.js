/**
 * Trace semua write operations di Packaging SalesOrders
 * Cek kemana aja data di-write ke server dan storage
 */

const fs = require('fs');

console.log('🔍 TRACING PACKAGING SALES ORDERS WRITE OPERATIONS\n');

function traceSalesOrdersWrites() {
  const filePath = 'src/pages/Packaging/SalesOrders.tsx';
  
  if (!fs.existsSync(filePath)) {
    console.log('❌ File not found:', filePath);
    return;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`📄 Analyzing: ${filePath}`);
  console.log(`📏 File size: ${(content.length / 1024).toFixed(2)} KB\n`);
  
  // Extract all storageService.set calls with context
  const lines = content.split('\n');
  const writeOperations = [];
  
  lines.forEach((line, index) => {
    if (line.includes('storageService.set')) {
      // Get context (5 lines before and after)
      const contextStart = Math.max(0, index - 5);
      const contextEnd = Math.min(lines.length - 1, index + 5);
      const context = lines.slice(contextStart, contextEnd + 1);
      
      // Extract the storage key
      const keyMatch = line.match(/storageService\.set\s*\(\s*['"`]([^'"`]+)['"`]/);
      const key = keyMatch ? keyMatch[1] : 'UNKNOWN';
      
      writeOperations.push({
        lineNumber: index + 1,
        line: line.trim(),
        key: key,
        context: context,
        contextStart: contextStart + 1
      });
    }
  });
  
  console.log(`📝 Found ${writeOperations.length} write operations:\n`);
  
  writeOperations.forEach((op, idx) => {
    console.log(`${idx + 1}. LINE ${op.lineNumber}: ${op.key}`);
    console.log(`   Code: ${op.line}`);
    console.log(`   Context (lines ${op.contextStart}-${op.contextStart + 10}):`);
    op.context.forEach((contextLine, contextIdx) => {
      const lineNum = op.contextStart + contextIdx;
      const marker = lineNum === op.lineNumber ? ' >>> ' : '     ';
      console.log(`${marker}${lineNum}: ${contextLine}`);
    });
    console.log('');
  });
  
  return writeOperations;
}

function analyzeStorageKeys(writeOperations) {
  console.log('🔑 STORAGE KEYS ANALYSIS\n');
  
  const keyCount = {};
  writeOperations.forEach(op => {
    keyCount[op.key] = (keyCount[op.key] || 0) + 1;
  });
  
  console.log('Storage keys used in Packaging SalesOrders:');
  Object.entries(keyCount).forEach(([key, count]) => {
    console.log(`   📦 ${key} (${count} times)`);
    
    // Determine server path based on business context
    const serverPath = getServerPath(key);
    console.log(`      Server: POST /api/storage/${serverPath}`);
    console.log(`      Local: data/localStorage/${getLocalPath(key)}`);
    console.log('');
  });
}

function getServerPath(key) {
  // Based on storage.ts getBusinessContext() logic
  // For packaging business, it should be packaging/{key}
  return `packaging/${key}`;
}

function getLocalPath(key) {
  // Check where the file would be stored locally
  const possiblePaths = [
    `${key}.json`,
    `packaging/${key}.json`,
    `packaging.json` // if all data in one file
  ];
  
  // Check which path exists
  for (const path of possiblePaths) {
    if (fs.existsSync(`data/localStorage/${path}`)) {
      return path;
    }
  }
  
  return `${key}.json (expected)`;
}

function checkActualDataFiles() {
  console.log('📁 CHECKING ACTUAL DATA FILES\n');
  
  const dataPaths = [
    'data/localStorage/salesOrders.json',
    'data/localStorage/packaging/salesOrders.json',
    'data/localStorage/packaging.json',
    'data/localStorage/quotations.json',
    'data/localStorage/packaging/quotations.json',
    'data/localStorage/products.json',
    'data/localStorage/packaging/products.json',
    'data/localStorage/inventory.json',
    'data/localStorage/packaging/inventory.json'
  ];
  
  dataPaths.forEach(path => {
    if (fs.existsSync(path)) {
      const stat = fs.statSync(path);
      const sizeKB = (stat.size / 1024).toFixed(2);
      console.log(`✅ ${path} (${sizeKB} KB)`);
      
      // Try to read and show sample
      try {
        const content = fs.readFileSync(path, 'utf8');
        const data = JSON.parse(content);
        
        if (data.value && Array.isArray(data.value)) {
          console.log(`      Items: ${data.value.length}`);
          console.log(`      Timestamp: ${data.timestamp || data._timestamp || 'none'}`);
        } else if (Array.isArray(data)) {
          console.log(`      Items: ${data.length}`);
        } else {
          console.log(`      Type: ${typeof data}`);
        }
      } catch (error) {
        console.log(`      Error reading: ${error.message}`);
      }
    } else {
      console.log(`❌ ${path} (not found)`);
    }
    console.log('');
  });
}

function checkStorageServiceImplementation() {
  console.log('🔧 CHECKING STORAGE SERVICE IMPLEMENTATION\n');
  
  const storageFile = 'src/services/storage.ts';
  if (fs.existsSync(storageFile)) {
    const content = fs.readFileSync(storageFile, 'utf8');
    
    // Check getBusinessContext method
    const businessContextMatch = content.match(/getBusinessContext\(\)[^}]+}/s);
    if (businessContextMatch) {
      console.log('📋 getBusinessContext() method:');
      console.log(businessContextMatch[0]);
      console.log('');
    }
    
    // Check getStorageKey method
    const storageKeyMatch = content.match(/getStorageKey\([^}]+}/s);
    if (storageKeyMatch) {
      console.log('🔑 getStorageKey() method:');
      console.log(storageKeyMatch[0]);
      console.log('');
    }
    
    // Check if there's actual server sync implementation
    const syncMethods = [
      'syncToServer',
      'syncDataFromServer',
      'POST',
      'fetch.*method.*POST'
    ];
    
    syncMethods.forEach(method => {
      if (content.includes(method)) {
        console.log(`✅ Found ${method} in storage service`);
      } else {
        console.log(`❌ ${method} not found in storage service`);
      }
    });
    
  } else {
    console.log('❌ Storage service file not found');
  }
}

// Main execution
function main() {
  try {
    const writeOperations = traceSalesOrdersWrites();
    analyzeStorageKeys(writeOperations);
    checkActualDataFiles();
    checkStorageServiceImplementation();
    
    console.log('🎯 SUMMARY');
    console.log('='.repeat(60));
    console.log('This trace shows exactly where Packaging SalesOrders writes data:');
    console.log('1. Storage keys used');
    console.log('2. Expected server paths');
    console.log('3. Actual local file locations');
    console.log('4. Storage service implementation details');
    
  } catch (error) {
    console.error('❌ Error during trace:', error.message);
  }
}

main();