/**
 * Debug GT User Control Cross-Device Sync Issue
 * Investigate why user control data is empty on other devices
 */

const fs = require('fs');
const path = require('path');

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

function debugUserControlFiles() {
  console.log('🔍 DEBUGGING GT USER CONTROL CROSS-DEVICE SYNC\n');
  
  // Check all possible user control file locations
  const userControlFiles = [
    'data/localStorage/userAccessControl.json',
    'data/localStorage/general-trading/userAccessControl.json',
    'data/localStorage/general-trading/general-trading_userAccessControl.json',
    'data/localStorage/general-trading_userAccessControl.json',
    'data/localStorage/packaging_userAccessControl.json',
    'data/localStorage/trucking/trucking_userAccessControl.json'
  ];
  
  console.log('📁 CHECKING ALL USER CONTROL FILES:\n');
  
  userControlFiles.forEach(file => {
    const exists = fs.existsSync(file);
    if (exists) {
      const data = readJsonFile(file);
      const count = data && Array.isArray(data) ? data.length : 0;
      const hasValue = data && data.value && Array.isArray(data.value);
      const valueCount = hasValue ? data.value.length : 0;
      
      console.log(`✅ ${path.basename(file)}:`);
      console.log(`   📍 Path: ${file}`);
      console.log(`   📊 Direct array: ${count} users`);
      console.log(`   📦 Wrapped in 'value': ${hasValue ? 'Yes' : 'No'} (${valueCount} users)`);
      
      if (data && count > 0) {
        const sample = data[0];
        console.log(`   🔍 Sample structure: ${Object.keys(sample).join(', ')}`);
      }
      
      if (hasValue && valueCount > 0) {
        const sample = data.value[0];
        console.log(`   🔍 Sample value structure: ${Object.keys(sample).join(', ')}`);
      }
      
      console.log('');
    } else {
      console.log(`❌ ${path.basename(file)}: Not found`);
    }
  });
}

function checkGTUserControlImplementation() {
  console.log('🔍 CHECKING GT USER CONTROL IMPLEMENTATION:\n');
  
  // Read the GT User Control component
  const gtUserControlPath = 'src/pages/GeneralTrading/Settings/UserControl.tsx';
  
  if (fs.existsSync(gtUserControlPath)) {
    console.log('✅ GT User Control component found');
    
    // Check for storage key usage
    const content = fs.readFileSync(gtUserControlPath, 'utf8');
    
    // Look for storage keys
    const storageKeys = [
      'userAccessControl',
      'gt_userAccessControl', 
      'general-trading_userAccessControl',
      'general-trading/userAccessControl'
    ];
    
    console.log('🔑 STORAGE KEYS USED IN GT USER CONTROL:');
    storageKeys.forEach(key => {
      if (content.includes(`'${key}'`) || content.includes(`"${key}"`)) {
        console.log(`   ✅ Found: '${key}'`);
      }
    });
    
    // Check for loadGTDataFromLocalStorage usage
    if (content.includes('loadGTDataFromLocalStorage')) {
      console.log('   ✅ Uses loadGTDataFromLocalStorage helper');
    } else {
      console.log('   ❌ Does NOT use loadGTDataFromLocalStorage helper');
    }
    
    // Check for storageService usage
    if (content.includes('storageService.get')) {
      console.log('   ✅ Uses storageService.get');
    }
    
    // Check for data extraction patterns
    if (content.includes('extractArray') || content.includes('.value')) {
      console.log('   ✅ Has data extraction logic');
    } else {
      console.log('   ❌ Missing data extraction logic');
    }
    
  } else {
    console.log('❌ GT User Control component not found');
  }
}

function checkMainUserControlImplementation() {
  console.log('\n🔍 CHECKING MAIN USER CONTROL IMPLEMENTATION:\n');
  
  // Read the main User Control component
  const mainUserControlPath = 'src/pages/Settings/UserControl.tsx';
  
  if (fs.existsSync(mainUserControlPath)) {
    console.log('✅ Main User Control component found');
    
    const content = fs.readFileSync(mainUserControlPath, 'utf8');
    
    // Check for cross-business data loading
    const businessContexts = [
      'general-trading',
      'trucking',
      'packaging'
    ];
    
    console.log('🏢 CROSS-BUSINESS DATA LOADING:');
    businessContexts.forEach(context => {
      if (content.includes(context)) {
        console.log(`   ✅ Loads from: ${context}`);
      } else {
        console.log(`   ❌ Missing: ${context}`);
      }
    });
    
  } else {
    console.log('❌ Main User Control component not found');
  }
}

function checkSyncConfiguration() {
  console.log('\n🔍 CHECKING SYNC CONFIGURATION:\n');
  
  // Check storage service configuration
  const storageServicePath = 'src/services/storage.ts';
  
  if (fs.existsSync(storageServicePath)) {
    console.log('✅ Storage service found');
    
    const content = fs.readFileSync(storageServicePath, 'utf8');
    
    // Check for sync-related functions
    const syncFunctions = [
      'forceReloadFromFile',
      'syncToServer',
      'syncFromServer',
      'extractArray'
    ];
    
    console.log('🔄 SYNC FUNCTIONS AVAILABLE:');
    syncFunctions.forEach(func => {
      if (content.includes(func)) {
        console.log(`   ✅ ${func}: Available`);
      } else {
        console.log(`   ❌ ${func}: Missing`);
      }
    });
    
  } else {
    console.log('❌ Storage service not found');
  }
  
  // Check GT sync service
  const gtSyncPath = 'src/services/gt-sync.ts';
  
  if (fs.existsSync(gtSyncPath)) {
    console.log('✅ GT sync service found');
    
    const content = fs.readFileSync(gtSyncPath, 'utf8');
    
    // Check for user control sync
    if (content.includes('userAccessControl') || content.includes('UserControl')) {
      console.log('   ✅ Includes user control sync');
    } else {
      console.log('   ❌ Missing user control sync');
    }
    
  } else {
    console.log('❌ GT sync service not found');
  }
}

function analyzeDataStructureDifferences() {
  console.log('\n🔍 ANALYZING DATA STRUCTURE DIFFERENCES:\n');
  
  // Compare data structures across different files
  const files = [
    { name: 'Main', path: 'data/localStorage/userAccessControl.json' },
    { name: 'GT', path: 'data/localStorage/general-trading/userAccessControl.json' },
    { name: 'GT Alt', path: 'data/localStorage/general-trading/general-trading_userAccessControl.json' }
  ];
  
  files.forEach(file => {
    const data = readJsonFile(file.path);
    if (data) {
      console.log(`📊 ${file.name} User Control Structure:`);
      
      // Check if it's direct array or wrapped
      if (Array.isArray(data)) {
        console.log(`   📋 Type: Direct array (${data.length} users)`);
        if (data.length > 0) {
          console.log(`   🔍 Sample fields: ${Object.keys(data[0]).join(', ')}`);
        }
      } else if (data.value && Array.isArray(data.value)) {
        console.log(`   📦 Type: Wrapped in 'value' (${data.value.length} users)`);
        if (data.value.length > 0) {
          console.log(`   🔍 Sample fields: ${Object.keys(data.value[0]).join(', ')}`);
        }
      } else {
        console.log(`   ❓ Type: Unknown structure`);
        console.log(`   🔍 Top-level keys: ${Object.keys(data).join(', ')}`);
      }
      console.log('');
    }
  });
}

function checkAccessControlHelper() {
  console.log('🔍 CHECKING ACCESS CONTROL HELPER:\n');
  
  const helperPath = 'src/utils/access-control-helper.ts';
  
  if (fs.existsSync(helperPath)) {
    console.log('✅ Access control helper found');
    
    const content = fs.readFileSync(helperPath, 'utf8');
    
    // Check for data extraction functions
    const functions = [
      'extractUserData',
      'extractArray',
      'mergeUserData',
      'loadUserAccessFromAllContexts'
    ];
    
    console.log('🛠️  HELPER FUNCTIONS:');
    functions.forEach(func => {
      if (content.includes(func)) {
        console.log(`   ✅ ${func}: Available`);
      } else {
        console.log(`   ❌ ${func}: Missing`);
      }
    });
    
  } else {
    console.log('❌ Access control helper not found');
  }
}

function generateSyncDiagnosis() {
  console.log('\n' + '='.repeat(60));
  console.log('🩺 SYNC DIAGNOSIS & RECOMMENDATIONS');
  console.log('='.repeat(60));
  
  // Check current data state
  const mainData = readJsonFile('data/localStorage/userAccessControl.json');
  const gtData = readJsonFile('data/localStorage/general-trading/userAccessControl.json');
  const gtAltData = readJsonFile('data/localStorage/general-trading/general-trading_userAccessControl.json');
  
  const mainCount = mainData ? (Array.isArray(mainData) ? mainData.length : (mainData.value ? mainData.value.length : 0)) : 0;
  const gtCount = gtData ? (Array.isArray(gtData) ? gtData.length : (gtData.value ? gtData.value.length : 0)) : 0;
  const gtAltCount = gtAltData ? (Array.isArray(gtAltData) ? gtAltData.length : (gtAltData.value ? gtAltData.value.length : 0)) : 0;
  
  console.log('📊 CURRENT DATA STATE:');
  console.log(`   Main User Control: ${mainCount} users`);
  console.log(`   GT User Control: ${gtCount} users`);
  console.log(`   GT Alt User Control: ${gtAltCount} users`);
  
  console.log('\n🔍 POTENTIAL ISSUES:');
  
  if (mainCount > 0 && gtCount === 0) {
    console.log('   ❌ GT User Control is empty while Main has data');
    console.log('   💡 Possible cause: GT not reading from correct storage key');
  }
  
  if (gtAltCount > gtCount) {
    console.log('   ❌ GT using wrong storage key (should use general-trading_userAccessControl)');
  }
  
  if (mainCount === 0 && gtCount === 0) {
    console.log('   ❌ All user control data is empty');
    console.log('   💡 Possible cause: Cross-device sync not working');
  }
  
  console.log('\n💊 RECOMMENDED FIXES:');
  console.log('   1. Ensure GT User Control reads from all business contexts');
  console.log('   2. Implement force reload mechanism for user control data');
  console.log('   3. Add data extraction logic for wrapped objects');
  console.log('   4. Verify storage key consistency across devices');
  console.log('   5. Check if sync service includes user control data');
  
  console.log('\n🏁 Diagnosis completed at:', new Date().toLocaleString());
}

// Run the debug
console.log('🚀 STARTING GT USER CONTROL CROSS-DEVICE DEBUG');
console.log('='.repeat(60));

debugUserControlFiles();
checkGTUserControlImplementation();
checkMainUserControlImplementation();
checkSyncConfiguration();
analyzeDataStructureDifferences();
checkAccessControlHelper();
generateSyncDiagnosis();