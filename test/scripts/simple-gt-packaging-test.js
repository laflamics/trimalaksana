/**
 * Simple Test for GT and Packaging Data
 */

const fs = require('fs');
const path = require('path');

function testFileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}

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

function testGTData() {
  console.log('\n🔍 TESTING GT DATA FILES...\n');
  
  const gtFiles = [
    'data/localStorage/general-trading/gt_salesOrders.json',
    'data/localStorage/general-trading/gt_products.json',
    'data/localStorage/general-trading/gt_customers.json',
    'data/localStorage/general-trading/gt_purchaseOrders.json',
    'data/localStorage/general-trading/gt_invoices.json',
    'data/localStorage/general-trading/gt_payments.json',
    'data/localStorage/general-trading/gt_ppicNotifications.json',
    'data/localStorage/general-trading/gt_financeNotifications.json',
    'data/localStorage/general-trading/gt_invoiceNotifications.json'
  ];
  
  const results = {};
  
  gtFiles.forEach(file => {
    const fileName = path.basename(file, '.json');
    const exists = testFileExists(file);
    
    if (exists) {
      const data = readJsonFile(file);
      const count = data && Array.isArray(data) ? data.length : 0;
      console.log(`✅ ${fileName}: ${count} items`);
      results[fileName] = { exists: true, count };
    } else {
      console.log(`❌ ${fileName}: File not found`);
      results[fileName] = { exists: false, count: 0 };
    }
  });
  
  return results;
}

function testPackagingData() {
  console.log('\n🔍 TESTING PACKAGING DATA FILES...\n');
  
  const packagingFiles = [
    'data/localStorage/salesOrders.json',
    'data/localStorage/products.json',
    'data/localStorage/customers.json',
    'data/localStorage/purchaseOrders.json',
    'data/localStorage/suppliers.json',
    'data/localStorage/ppicNotifications.json',
    'data/localStorage/financeNotifications.json'
  ];
  
  const results = {};
  
  packagingFiles.forEach(file => {
    const fileName = path.basename(file, '.json');
    const exists = testFileExists(file);
    
    if (exists) {
      const data = readJsonFile(file);
      const count = data && Array.isArray(data) ? data.length : 0;
      console.log(`✅ ${fileName}: ${count} items`);
      results[fileName] = { exists: true, count };
    } else {
      console.log(`❌ ${fileName}: File not found`);
      results[fileName] = { exists: false, count: 0 };
    }
  });
  
  return results;
}

function testUserAccessControl() {
  console.log('\n🔍 TESTING USER ACCESS CONTROL FILES...\n');
  
  const userFiles = [
    'data/localStorage/userAccessControl.json',
    'data/localStorage/general-trading/gt_userAccessControl.json',
    'data/localStorage/trucking/trucking_userAccessControl.json'
  ];
  
  const results = {};
  
  userFiles.forEach(file => {
    const fileName = path.basename(file, '.json');
    const exists = testFileExists(file);
    
    if (exists) {
      const data = readJsonFile(file);
      const count = data && Array.isArray(data) ? data.length : 0;
      console.log(`✅ ${fileName}: ${count} users`);
      results[fileName] = { exists: true, count };
    } else {
      console.log(`❌ ${fileName}: File not found`);
      results[fileName] = { exists: false, count: 0 };
    }
  });
  
  return results;
}

function testMainDataFile() {
  console.log('\n🔍 TESTING MAIN GT DATA FILE...\n');
  
  const mainFile = 'data/gt.json/gt.json';
  const exists = testFileExists(mainFile);
  
  if (exists) {
    const data = readJsonFile(mainFile);
    if (data) {
      console.log('✅ Main GT file exists and is readable');
      console.log('📊 Main GT file structure:');
      Object.keys(data).forEach(key => {
        const value = data[key];
        if (Array.isArray(value)) {
          console.log(`   - ${key}: ${value.length} items`);
        } else if (typeof value === 'object' && value !== null) {
          console.log(`   - ${key}: object with ${Object.keys(value).length} properties`);
        } else {
          console.log(`   - ${key}: ${typeof value}`);
        }
      });
      return { exists: true, data };
    } else {
      console.log('❌ Main GT file exists but cannot be read');
      return { exists: true, readable: false };
    }
  } else {
    console.log('❌ Main GT file not found');
    return { exists: false };
  }
}

function runSimpleTest() {
  console.log('🚀 STARTING SIMPLE GT & PACKAGING TEST');
  console.log('='.repeat(60));
  
  const results = {
    timestamp: new Date().toISOString(),
    gt: testGTData(),
    packaging: testPackagingData(),
    userAccess: testUserAccessControl(),
    mainFile: testMainDataFile()
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  // GT Summary
  const gtFiles = Object.keys(results.gt);
  const gtExisting = gtFiles.filter(f => results.gt[f].exists).length;
  const gtTotal = gtFiles.length;
  console.log(`\n📁 GT Files: ${gtExisting}/${gtTotal} files found`);
  
  // Packaging Summary
  const packagingFiles = Object.keys(results.packaging);
  const packagingExisting = packagingFiles.filter(f => results.packaging[f].exists).length;
  const packagingTotal = packagingFiles.length;
  console.log(`📁 Packaging Files: ${packagingExisting}/${packagingTotal} files found`);
  
  // User Access Summary
  const userFiles = Object.keys(results.userAccess);
  const userExisting = userFiles.filter(f => results.userAccess[f].exists).length;
  const userTotal = userFiles.length;
  console.log(`👥 User Access Files: ${userExisting}/${userTotal} files found`);
  
  // Main File Summary
  console.log(`📄 Main GT File: ${results.mainFile.exists ? 'Found' : 'Not Found'}`);
  
  // Overall Status
  const overallHealth = (gtExisting + packagingExisting + userExisting) / (gtTotal + packagingTotal + userTotal);
  if (overallHealth >= 0.8) {
    console.log('\n🎉 SYSTEM STATUS: HEALTHY (80%+ files found)');
  } else if (overallHealth >= 0.6) {
    console.log('\n⚠️  SYSTEM STATUS: MODERATE (60-80% files found)');
  } else {
    console.log('\n❌ SYSTEM STATUS: NEEDS ATTENTION (<60% files found)');
  }
  
  console.log('\n🏁 Test completed at:', new Date().toLocaleString());
  
  return results;
}

// Run the test
runSimpleTest();