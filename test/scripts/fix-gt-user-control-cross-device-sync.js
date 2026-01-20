/**
 * Fix GT User Control Cross-Device Sync Issue
 * The issue: GT-specific userAccessControl.json has empty value: {} instead of array
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

function writeJsonFile(filePath, data) {
  try {
    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
    return false;
  }
}

function diagnoseCrossDeviceSync() {
  console.log('🔍 DIAGNOSING GT USER CONTROL CROSS-DEVICE SYNC ISSUE\n');
  
  const files = [
    { name: 'Main', path: 'data/localStorage/userAccessControl.json' },
    { name: 'GT', path: 'data/localStorage/general-trading/userAccessControl.json' },
    { name: 'GT Alt', path: 'data/localStorage/general-trading/general-trading_userAccessControl.json' },
    { name: 'Trucking', path: 'data/localStorage/trucking/trucking_userAccessControl.json' }
  ];
  
  const results = {};
  
  files.forEach(file => {
    const data = readJsonFile(file.path);
    if (data) {
      let userCount = 0;
      let dataType = 'unknown';
      let hasGTUsers = false;
      
      if (Array.isArray(data)) {
        userCount = data.length;
        dataType = 'direct_array';
        hasGTUsers = data.some(user => 
          user.businessUnits && user.businessUnits.includes('general-trading')
        );
      } else if (data.value) {
        if (Array.isArray(data.value)) {
          userCount = data.value.length;
          dataType = 'wrapped_array';
          hasGTUsers = data.value.some(user => 
            user.businessUnits && user.businessUnits.includes('general-trading')
          );
        } else if (typeof data.value === 'object') {
          userCount = 0;
          dataType = 'wrapped_empty_object';
        }
      }
      
      console.log(`📁 ${file.name} (${path.basename(file.path)}):`);
      console.log(`   📊 Users: ${userCount}`);
      console.log(`   🏗️  Structure: ${dataType}`);
      console.log(`   🏢 Has GT users: ${hasGTUsers ? 'Yes' : 'No'}`);
      console.log('');
      
      results[file.name] = {
        path: file.path,
        userCount,
        dataType,
        hasGTUsers,
        data
      };
    } else {
      console.log(`❌ ${file.name}: File not found`);
      results[file.name] = { exists: false };
    }
  });
  
  return results;
}

function fixCrossDeviceSync(results) {
  console.log('🔧 FIXING CROSS-DEVICE SYNC ISSUES\n');
  
  // Find the source of truth (file with most GT users)
  let sourceFile = null;
  let maxGTUsers = 0;
  
  Object.entries(results).forEach(([name, result]) => {
    if (result.exists !== false && result.hasGTUsers && result.userCount > maxGTUsers) {
      sourceFile = { name, ...result };
      maxGTUsers = result.userCount;
    }
  });
  
  if (!sourceFile) {
    console.log('❌ No source file with GT users found');
    return false;
  }
  
  console.log(`📍 Source of truth: ${sourceFile.name} (${sourceFile.userCount} users)`);
  
  // Extract users from source
  let sourceUsers = [];
  if (sourceFile.dataType === 'direct_array') {
    sourceUsers = sourceFile.data;
  } else if (sourceFile.dataType === 'wrapped_array') {
    sourceUsers = sourceFile.data.value;
  }
  
  if (sourceUsers.length === 0) {
    console.log('❌ No users found in source file');
    return false;
  }
  
  console.log(`✅ Extracted ${sourceUsers.length} users from source`);
  
  // Fix files with issues
  const filesToFix = [
    { name: 'GT', path: 'data/localStorage/general-trading/userAccessControl.json' },
    { name: 'GT Alt', path: 'data/localStorage/general-trading/general-trading_userAccessControl.json' }
  ];
  
  let fixedCount = 0;
  
  filesToFix.forEach(file => {
    const result = results[file.name];
    
    if (!result || result.exists === false || result.dataType === 'wrapped_empty_object' || result.userCount === 0) {
      console.log(`🔧 Fixing ${file.name}...`);
      
      const fixedData = {
        value: sourceUsers,
        timestamp: Date.now(),
        _timestamp: Date.now()
      };
      
      if (writeJsonFile(file.path, fixedData)) {
        console.log(`   ✅ Fixed ${file.name}: ${sourceUsers.length} users`);
        fixedCount++;
      } else {
        console.log(`   ❌ Failed to fix ${file.name}`);
      }
    } else {
      console.log(`✅ ${file.name} already has data (${result.userCount} users)`);
    }
  });
  
  return fixedCount > 0;
}

function validateFix() {
  console.log('\n🔍 VALIDATING FIX\n');
  
  const files = [
    { name: 'Main', path: 'data/localStorage/userAccessControl.json' },
    { name: 'GT', path: 'data/localStorage/general-trading/userAccessControl.json' },
    { name: 'GT Alt', path: 'data/localStorage/general-trading/general-trading_userAccessControl.json' }
  ];
  
  let allValid = true;
  
  files.forEach(file => {
    const data = readJsonFile(file.path);
    if (data && data.value && Array.isArray(data.value)) {
      const gtUsers = data.value.filter(user => 
        user.businessUnits && user.businessUnits.includes('general-trading')
      );
      console.log(`✅ ${file.name}: ${data.value.length} total users, ${gtUsers.length} GT users`);
    } else {
      console.log(`❌ ${file.name}: Invalid or missing data`);
      allValid = false;
    }
  });
  
  return allValid;
}

function generateSyncReport(results, fixed) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 CROSS-DEVICE SYNC REPORT');
  console.log('='.repeat(60));
  
  console.log('\n🔍 ISSUE IDENTIFIED:');
  console.log('   GT-specific userAccessControl.json had empty value: {} object');
  console.log('   This caused GT User Control to appear empty on other devices');
  
  console.log('\n💊 SOLUTION APPLIED:');
  if (fixed) {
    console.log('   ✅ Copied user data from main file to GT-specific files');
    console.log('   ✅ Fixed data structure (wrapped array format)');
    console.log('   ✅ Added proper timestamps');
  } else {
    console.log('   ❌ No fixes were applied (no issues found or fix failed)');
  }
  
  console.log('\n🎯 EXPECTED RESULT:');
  console.log('   GT User Control should now show users on all devices');
  console.log('   Cross-device sync should work properly');
  
  console.log('\n📋 NEXT STEPS:');
  console.log('   1. Test GT User Control on different devices');
  console.log('   2. Verify users appear correctly');
  console.log('   3. Test creating/editing users');
  console.log('   4. Confirm sync works across devices');
  
  console.log('\n🏁 Report completed at:', new Date().toLocaleString());
}

// Run the fix
console.log('🚀 STARTING GT USER CONTROL CROSS-DEVICE SYNC FIX');
console.log('='.repeat(60));

const results = diagnoseCrossDeviceSync();
const fixed = fixCrossDeviceSync(results);
const valid = validateFix();

generateSyncReport(results, fixed);

if (valid) {
  console.log('\n🎉 SUCCESS: GT User Control cross-device sync has been fixed!');
} else {
  console.log('\n⚠️  WARNING: Some issues may still exist. Please check manually.');
}