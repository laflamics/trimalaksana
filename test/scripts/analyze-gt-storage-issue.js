/**
 * Analyze GT storage issue - similar to packaging problem
 */

const fs = require('fs');

console.log('🔍 ANALYZING GT STORAGE ISSUE\n');

function checkCurrentStorageConfig() {
  console.log('⚙️  CHECKING CURRENT STORAGE CONFIGURATION\n');
  
  // Check if storage config exists
  const configPath = 'data/localStorage/storage_config.json';
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    console.log('📋 Current storage config:');
    console.log(`   Type: ${config.type}`);
    console.log(`   Business: ${config.business || 'not set'}`);
    console.log(`   Server URL: ${config.serverUrl || 'not set'}`);
    
    // Check for GT-specific issues
    if (config.type === 'server' && config.business === 'packaging') {
      console.log('   ⚠️  ISSUE: Server mode set to packaging, but we need GT data');
      console.log('   🔧 This could cause GT data to not load properly');
    }
    
    return config;
  } else {
    console.log('❌ Storage config not found - using default local mode');
    return { type: 'local' };
  }
}

function checkSelectedBusiness() {
  console.log('📊 CHECKING SELECTED BUSINESS\n');
  
  const businessPath = 'data/localStorage/selectedBusiness.json';
  if (fs.existsSync(businessPath)) {
    const business = JSON.parse(fs.readFileSync(businessPath, 'utf8'));
    console.log(`📋 Selected business: ${business.value}`);
    
    if (business.value === 'general-trading') {
      console.log('   ✅ Business context is GT');
      return 'general-trading';
    } else {
      console.log(`   ⚠️  Business context is ${business.value}, not GT`);
      return business.value;
    }
  } else {
    console.log('❌ Selected business not found');
    return null;
  }
}

function analyzeGTStoragePaths() {
  console.log('🎯 ANALYZING GT STORAGE PATHS\n');
  
  // Based on storage service code, GT uses these keys:
  const gtKeys = [
    'gt_products',
    'gt_customers', 
    'gt_suppliers',
    'gt_salesOrders',
    'gt_purchaseOrders',
    'gt_invoices',
    'gt_payments',
    'userAccessControl'
  ];
  
  console.log('📋 Expected GT storage keys:');
  gtKeys.forEach(key => console.log(`   - ${key}`));
  console.log('');
  
  // Check where GT data should be stored based on business context
  const selectedBusiness = checkSelectedBusiness();
  
  if (selectedBusiness === 'general-trading') {
    console.log('🔍 GT business selected - checking storage paths:');
    console.log('   📂 Root level: data/localStorage/{key}.json');
    console.log('   📂 GT folder: data/localStorage/general-trading/{key}.json');
    console.log('');
    
    // Check actual files
    let foundFiles = 0;
    let totalItems = 0;
    
    for (const key of gtKeys) {
      console.log(`🔍 Checking ${key}:`);
      
      // Check root level
      const rootPath = `data/localStorage/${key}.json`;
      if (fs.existsSync(rootPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(rootPath, 'utf8'));
          const items = getItemCount(data);
          console.log(`   📁 Root: ✅ ${items} items`);
          foundFiles++;
          totalItems += items;
        } catch (error) {
          console.log(`   📁 Root: ❌ Parse error`);
        }
      } else {
        console.log(`   📁 Root: ❌ Not found`);
      }
      
      // Check GT folder
      const gtPath = `data/localStorage/general-trading/${key}.json`;
      if (fs.existsSync(gtPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(gtPath, 'utf8'));
          const items = getItemCount(data);
          console.log(`   📂 GT folder: ✅ ${items} items`);
        } catch (error) {
          console.log(`   📂 GT folder: ❌ Parse error`);
        }
      } else {
        console.log(`   📂 GT folder: ❌ Not found`);
      }
    }
    
    console.log(`\n📊 Summary: ${foundFiles}/${gtKeys.length} files found, ${totalItems} total items`);
    
    if (foundFiles === 0) {
      console.log('❌ NO GT DATA FOUND!');
      console.log('🔧 This explains why GT modules show empty data');
    }
    
  } else {
    console.log('⚠️  GT business not selected - GT data may not load properly');
  }
}

function getItemCount(data) {
  if (!data) return 0;
  
  if (data.value && Array.isArray(data.value)) {
    return data.value.length;
  } else if (Array.isArray(data)) {
    return data.length;
  } else if (typeof data === 'object') {
    return Object.keys(data).length;
  }
  
  return 0;
}

function analyzeStorageServiceGTHandling() {
  console.log('🔧 ANALYZING STORAGE SERVICE GT HANDLING\n');
  
  const storagePath = 'src/services/storage.ts';
  if (fs.existsSync(storagePath)) {
    const content = fs.readFileSync(storagePath, 'utf8');
    
    // Check business context method
    const businessContextMatch = content.match(/getBusinessContext\(\)[\s\S]*?return 'packaging';/);
    if (businessContextMatch) {
      console.log('✅ Business context method found');
      
      // Check if GT is handled properly
      if (content.includes("selected === 'general-trading'")) {
        console.log('✅ GT business context handled');
      } else {
        console.log('❌ GT business context not handled');
      }
    }
    
    // Check storage key method
    const storageKeyMatch = content.match(/getStorageKey\(key: string[\s\S]*?\}/);
    if (storageKeyMatch) {
      console.log('✅ Storage key method found');
      
      // Check GT path handling
      if (content.includes('general-trading')) {
        console.log('✅ GT paths handled in storage key method');
      } else {
        console.log('❌ GT paths not handled in storage key method');
      }
    }
    
    // Check server sync GT handling
    if (content.includes('general-trading') && content.includes('serverPath')) {
      console.log('✅ GT server sync paths configured');
    } else {
      console.log('❌ GT server sync paths not configured');
    }
    
  } else {
    console.log('❌ Storage service not found');
  }
}

function identifyGTProblem() {
  console.log('🎯 IDENTIFYING GT PROBLEM\n');
  
  const config = checkCurrentStorageConfig();
  const selectedBusiness = checkSelectedBusiness();
  
  console.log('🔍 Problem Analysis:');
  
  // Check for similar issue as packaging
  if (config.type === 'server' && config.business === 'packaging' && selectedBusiness === 'general-trading') {
    console.log('❌ FOUND ISSUE: Storage config mismatch!');
    console.log('   📋 Storage config business: packaging');
    console.log('   📊 Selected business: general-trading');
    console.log('   🔧 This causes GT data to not load properly');
    console.log('');
    console.log('💡 SOLUTION NEEDED:');
    console.log('   1. Update storage config business to "general-trading"');
    console.log('   2. Ensure GT data files exist');
    console.log('   3. Test GT UI data loading');
    return 'config_mismatch';
  }
  
  if (config.type === 'server' && !config.serverUrl) {
    console.log('❌ FOUND ISSUE: Server mode but no server URL');
    console.log('   🔧 This causes server sync to fail');
    return 'no_server_url';
  }
  
  if (selectedBusiness !== 'general-trading') {
    console.log('❌ FOUND ISSUE: GT business not selected');
    console.log('   🔧 GT modules will not load data properly');
    return 'wrong_business';
  }
  
  console.log('✅ No obvious configuration issues found');
  console.log('🔍 Issue may be in data files or component logic');
  return 'unknown';
}

// Main execution
console.log('🔍 GT STORAGE ISSUE ANALYSIS');
console.log('='.repeat(50));

const problemType = identifyGTProblem();
analyzeGTStoragePaths();
analyzeStorageServiceGTHandling();

console.log('\n📋 ANALYSIS COMPLETE');
console.log(`🎯 Problem type: ${problemType}`);

if (problemType === 'config_mismatch') {
  console.log('\n🔧 RECOMMENDED FIX:');
  console.log('1. Create GT storage config fix script');
  console.log('2. Update storage config business to "general-trading"');
  console.log('3. Ensure GT data files exist');
  console.log('4. Test GT UI components');
}