/**
 * Analyze GT storage read/write paths and configuration
 */

const fs = require('fs');

console.log('🔍 ANALYZING GT STORAGE PATHS AND CONFIGURATION\n');

function checkGTStorageConfig() {
  console.log('⚙️  CHECKING GT STORAGE CONFIGURATION\n');
  
  // Check storage config
  const configPath = 'data/localStorage/storage_config.json';
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('📋 Current storage config:');
    console.log(`   Type: ${config.type}`);
    console.log(`   Business: ${config.business || 'not set'}`);
    console.log(`   Server URL: ${config.serverUrl || 'not set'}`);
    
    if (config.type === 'server' && config.business !== 'general-trading') {
      console.log('   ⚠️  POTENTIAL ISSUE: Server mode but business is not general-trading');
    }
  } else {
    console.log('❌ Storage config not found');
  }
  
  // Check selected business
  const businessPath = 'data/localStorage/selectedBusiness.json';
  if (fs.existsSync(businessPath)) {
    const business = JSON.parse(fs.readFileSync(businessPath, 'utf8'));
    console.log(`📊 Selected business: ${business.value}`);
    
    if (business.value === 'general-trading') {
      console.log('   ✅ Business context matches GT');
    } else {
      console.log('   ⚠️  Business context is not GT');
    }
  }
  
  console.log('');
}

function analyzeGTDataPaths() {
  console.log('📂 ANALYZING GT DATA FILE PATHS\n');
  
  const gtDataKeys = [
    'gt_products',
    'gt_customers', 
    'gt_suppliers',
    'gt_salesOrders',
    'gt_purchaseOrders',
    'gt_invoices',
    'gt_payments'
  ];
  
  for (const key of gtDataKeys) {
    console.log(`🔍 Checking ${key}:`);
    
    // Check root level
    const rootPath = `data/localStorage/${key}.json`;
    const rootExists = fs.existsSync(rootPath);
    console.log(`   📁 Root level (${rootPath}): ${rootExists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    
    if (rootExists) {
      try {
        const data = JSON.parse(fs.readFileSync(rootPath, 'utf8'));
        const size = fs.statSync(rootPath).size;
        console.log(`      Size: ${size} bytes`);
        console.log(`      Structure: ${getDataStructure(data)}`);
      } catch (error) {
        console.log(`      ❌ Parse error: ${error.message}`);
      }
    }
    
    // Check general-trading folder
    const gtPath = `data/localStorage/general-trading/${key}.json`;
    const gtExists = fs.existsSync(gtPath);
    console.log(`   📂 GT folder (${gtPath}): ${gtExists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    
    if (gtExists) {
      try {
        const data = JSON.parse(fs.readFileSync(gtPath, 'utf8'));
        const size = fs.statSync(gtPath).size;
        console.log(`      Size: ${size} bytes`);
        console.log(`      Structure: ${getDataStructure(data)}`);
      } catch (error) {
        console.log(`      ❌ Parse error: ${error.message}`);
      }
    }
    
    console.log('');
  }
}

function getDataStructure(data) {
  if (data === null) return 'NULL';
  if (data === undefined) return 'UNDEFINED';
  
  if (typeof data === 'object' && 'value' in data) {
    const value = data.value;
    if (Array.isArray(value)) {
      return `WRAPPED ARRAY (${value.length} items)`;
    } else if (value === null) {
      return 'WRAPPED NULL';
    } else if (value === undefined) {
      return 'WRAPPED UNDEFINED';
    } else {
      return `WRAPPED ${typeof value.toUpperCase()}`;
    }
  } else if (Array.isArray(data)) {
    return `DIRECT ARRAY (${data.length} items)`;
  } else if (typeof data === 'object') {
    return `DIRECT OBJECT (${Object.keys(data).length} keys)`;
  } else {
    return `${typeof data.toUpperCase()}`;
  }
}

function analyzeGTServicePaths() {
  console.log('🔧 ANALYZING GT SERVICE READ/WRITE PATHS\n');
  
  // Check GT sync service
  const gtSyncPath = 'src/services/gt-sync.ts';
  if (fs.existsSync(gtSyncPath)) {
    console.log('📄 Analyzing gt-sync.ts...');
    const content = fs.readFileSync(gtSyncPath, 'utf8');
    
    // Look for storage operations
    const storageGets = content.match(/storageService\.get\(['"`]([^'"`]+)['"`]\)/g) || [];
    const storageSets = content.match(/storageService\.set\(['"`]([^'"`]+)['"`]/g) || [];
    
    console.log(`   📖 Storage reads found: ${storageGets.length}`);
    storageGets.forEach(match => {
      const key = match.match(/['"`]([^'"`]+)['"`]/)[1];
      console.log(`      - ${key}`);
    });
    
    console.log(`   📝 Storage writes found: ${storageSets.length}`);
    storageSets.forEach(match => {
      const key = match.match(/['"`]([^'"`]+)['"`]/)[1];
      console.log(`      - ${key}`);
    });
    
  } else {
    console.log('❌ gt-sync.ts not found');
  }
  
  console.log('');
}

function checkGTComponentPaths() {
  console.log('🎯 CHECKING GT COMPONENT STORAGE USAGE\n');
  
  const gtComponents = [
    'src/pages/GeneralTrading/SalesOrders.tsx',
    'src/pages/GeneralTrading/Master/Products.tsx',
    'src/pages/GeneralTrading/Master/Customers.tsx',
    'src/pages/GeneralTrading/Purchasing.tsx',
    'src/pages/GeneralTrading/Finance/invoices.tsx',
    'src/pages/GeneralTrading/Finance/Payments.tsx'
  ];
  
  for (const componentPath of gtComponents) {
    if (fs.existsSync(componentPath)) {
      console.log(`📄 Analyzing ${componentPath.split('/').pop()}...`);
      const content = fs.readFileSync(componentPath, 'utf8');
      
      // Look for storage operations
      const storageGets = content.match(/storageService\.get\(['"`]([^'"`]+)['"`]\)/g) || [];
      const storageSets = content.match(/storageService\.set\(['"`]([^'"`]+)['"`]/g) || [];
      
      if (storageGets.length > 0) {
        console.log(`   📖 Reads: ${storageGets.map(m => m.match(/['"`]([^'"`]+)['"`]/)[1]).join(', ')}`);
      }
      
      if (storageSets.length > 0) {
        console.log(`   📝 Writes: ${storageSets.map(m => m.match(/['"`]([^'"`]+)['"`]/)[1]).join(', ')}`);
      }
      
      if (storageGets.length === 0 && storageSets.length === 0) {
        console.log(`   ℹ️  No direct storage operations found`);
      }
      
    } else {
      console.log(`❌ ${componentPath} not found`);
    }
  }
  
  console.log('');
}

function checkStorageServiceGTHandling() {
  console.log('🔍 CHECKING STORAGE SERVICE GT HANDLING\n');
  
  const storagePath = 'src/services/storage.ts';
  if (fs.existsSync(storagePath)) {
    const content = fs.readFileSync(storagePath, 'utf8');
    
    // Check business context handling
    const hasBusinessContext = content.includes('getBusinessContext');
    const hasGTHandling = content.includes('general-trading');
    const hasStorageKey = content.includes('getStorageKey');
    
    console.log(`   ${hasBusinessContext ? '✅' : '❌'} Has business context method`);
    console.log(`   ${hasGTHandling ? '✅' : '❌'} Has general-trading handling`);
    console.log(`   ${hasStorageKey ? '✅' : '❌'} Has storage key method`);
    
    // Check for server mode handling
    const hasServerMode = content.includes('config.type === \'server\'');
    const hasServerSync = content.includes('syncFromServer');
    
    console.log(`   ${hasServerMode ? '✅' : '❌'} Has server mode check`);
    console.log(`   ${hasServerSync ? '✅' : '❌'} Has server sync methods`);
    
    // Look for GT-specific paths in server sync
    if (content.includes('general-trading')) {
      const gtMatches = content.match(/general-trading[^'"`\n]*/g) || [];
      console.log(`   🎯 GT path references: ${gtMatches.length}`);
      gtMatches.forEach(match => console.log(`      - ${match}`));
    }
    
  } else {
    console.log('❌ storage.ts not found');
  }
  
  console.log('');
}

// Main execution
console.log('🔍 GT STORAGE ANALYSIS STARTING');
console.log('='.repeat(50));

checkGTStorageConfig();
analyzeGTDataPaths();
analyzeGTServicePaths();
checkGTComponentPaths();
checkStorageServiceGTHandling();

console.log('📋 ANALYSIS COMPLETE');
console.log('🎯 Check output above for potential issues similar to packaging');