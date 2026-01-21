/**
 * Test Data Status for GT and Packaging
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

function testGTData() {
  console.log('🔍 TESTING GT DATA FILES...\n');
  
  const gtFiles = {
    'Sales Orders': 'data/localStorage/general-trading/gt_salesOrders.json',
    'Products': 'data/localStorage/general-trading/gt_products.json',
    'Customers': 'data/localStorage/general-trading/gt_customers.json',
    'Purchase Orders': 'data/localStorage/general-trading/gt_purchaseOrders.json',
    'Invoices': 'data/localStorage/general-trading/gt_invoices.json',
    'Payments': 'data/localStorage/general-trading/gt_payments.json',
    'PPIC Notifications': 'data/localStorage/general-trading/gt_ppicNotifications.json',
    'Finance Notifications': 'data/localStorage/general-trading/gt_financeNotifications.json',
    'Invoice Notifications': 'data/localStorage/general-trading/gt_invoiceNotifications.json',
    'GRN': 'data/localStorage/general-trading/gt_grn.json',
    'Delivery': 'data/localStorage/general-trading/gt_delivery.json',
    'Inventory': 'data/localStorage/general-trading/gt_inventory.json'
  };
  
  const results = {};
  let totalItems = 0;
  
  Object.entries(gtFiles).forEach(([name, file]) => {
    const data = readJsonFile(file);
    const count = data && Array.isArray(data) ? data.length : 0;
    
    if (data !== null) {
      console.log(`✅ GT ${name}: ${count} items`);
      results[name] = { exists: true, count };
      totalItems += count;
    } else {
      console.log(`❌ GT ${name}: File not found or error`);
      results[name] = { exists: false, count: 0 };
    }
  });
  
  console.log(`\n📊 GT Total Items: ${totalItems}`);
  return { results, totalItems };
}

function testPackagingData() {
  console.log('\n🔍 TESTING PACKAGING DATA FILES...\n');
  
  const packagingFiles = {
    'Sales Orders': 'data/localStorage/salesOrders.json',
    'Products': 'data/localStorage/products.json',
    'Customers': 'data/localStorage/customers.json',
    'Purchase Orders': 'data/localStorage/purchaseOrders.json',
    'Suppliers': 'data/localStorage/suppliers.json',
    'PPIC Notifications': 'data/localStorage/ppicNotifications.json',
    'Finance Notifications': 'data/localStorage/financeNotifications.json',
    'Delivery': 'data/localStorage/delivery.json',
    'Production': 'data/localStorage/production.json',
    'Inventory': 'data/localStorage/inventory.json'
  };
  
  const results = {};
  let totalItems = 0;
  
  Object.entries(packagingFiles).forEach(([name, file]) => {
    const data = readJsonFile(file);
    const count = data && Array.isArray(data) ? data.length : 0;
    
    if (data !== null) {
      console.log(`✅ Packaging ${name}: ${count} items`);
      results[name] = { exists: true, count };
      totalItems += count;
    } else {
      console.log(`❌ Packaging ${name}: File not found or error`);
      results[name] = { exists: false, count: 0 };
    }
  });
  
  console.log(`\n📊 Packaging Total Items: ${totalItems}`);
  return { results, totalItems };
}

function testUserAccessControl() {
  console.log('\n🔍 TESTING USER ACCESS CONTROL...\n');
  
  const userFiles = {
    'Main User Access': 'data/localStorage/userAccessControl.json',
    'GT User Access': 'data/localStorage/general-trading/userAccessControl.json',
    'Trucking User Access': 'data/localStorage/trucking/trucking_userAccessControl.json'
  };
  
  const results = {};
  let totalUsers = 0;
  
  Object.entries(userFiles).forEach(([name, file]) => {
    const data = readJsonFile(file);
    const count = data && Array.isArray(data) ? data.length : 0;
    
    if (data !== null) {
      console.log(`✅ ${name}: ${count} users`);
      results[name] = { exists: true, count };
      totalUsers += count;
    } else {
      console.log(`❌ ${name}: File not found or error`);
      results[name] = { exists: false, count: 0 };
    }
  });
  
  console.log(`\n👥 Total Users: ${totalUsers}`);
  return { results, totalUsers };
}

function testNotificationFlow() {
  console.log('\n🔍 TESTING NOTIFICATION FLOW...\n');
  
  // Test GT notifications
  const gtPpicNotifs = readJsonFile('data/localStorage/general-trading/gt_ppicNotifications.json') || [];
  const gtFinanceNotifs = readJsonFile('data/localStorage/general-trading/gt_financeNotifications.json') || [];
  const gtInvoiceNotifs = readJsonFile('data/localStorage/general-trading/gt_invoiceNotifications.json') || [];
  
  console.log(`📬 GT PPIC Notifications: ${gtPpicNotifs.length} pending`);
  console.log(`💰 GT Finance Notifications: ${gtFinanceNotifs.length} pending`);
  console.log(`🧾 GT Invoice Notifications: ${gtInvoiceNotifs.length} pending`);
  
  // Test Packaging notifications
  const packagingPpicNotifs = readJsonFile('data/localStorage/ppicNotifications.json') || [];
  const packagingFinanceNotifs = readJsonFile('data/localStorage/financeNotifications.json') || [];
  
  console.log(`📬 Packaging PPIC Notifications: ${packagingPpicNotifs.length} pending`);
  console.log(`💰 Packaging Finance Notifications: ${packagingFinanceNotifs.length} pending`);
  
  return {
    gt: {
      ppic: gtPpicNotifs.length,
      finance: gtFinanceNotifs.length,
      invoice: gtInvoiceNotifs.length
    },
    packaging: {
      ppic: packagingPpicNotifs.length,
      finance: packagingFinanceNotifs.length
    }
  };
}

function testDataIntegrity() {
  console.log('\n🔍 TESTING DATA INTEGRITY...\n');
  
  // Test GT data structure
  const gtSO = readJsonFile('data/localStorage/general-trading/gt_salesOrders.json') || [];
  const gtProducts = readJsonFile('data/localStorage/general-trading/gt_products.json') || [];
  
  if (gtSO.length > 0) {
    const sampleSO = gtSO[0];
    const hasItems = sampleSO.items && Array.isArray(sampleSO.items);
    console.log(`✅ GT Sales Orders structure: ${hasItems ? 'Valid' : 'Invalid'} (has items: ${hasItems})`);
    if (hasItems) {
      console.log(`   Sample SO has ${sampleSO.items.length} items`);
    }
  }
  
  if (gtProducts.length > 0) {
    const sampleProduct = gtProducts[0];
    const hasRequiredFields = sampleProduct.nama || sampleProduct.productName;
    console.log(`✅ GT Products structure: ${hasRequiredFields ? 'Valid' : 'Invalid'} (has name: ${hasRequiredFields})`);
  }
  
  // Test Packaging data structure
  const packagingSO = readJsonFile('data/localStorage/salesOrders.json') || [];
  const packagingProducts = readJsonFile('data/localStorage/products.json') || [];
  
  if (packagingSO.length > 0) {
    const sampleSO = packagingSO[0];
    const hasItems = sampleSO.items && Array.isArray(sampleSO.items);
    console.log(`✅ Packaging Sales Orders structure: ${hasItems ? 'Valid' : 'Invalid'} (has items: ${hasItems})`);
    if (hasItems) {
      console.log(`   Sample SO has ${sampleSO.items.length} items`);
    }
  }
  
  if (packagingProducts.length > 0) {
    const sampleProduct = packagingProducts[0];
    const hasRequiredFields = sampleProduct.nama || sampleProduct.productName;
    console.log(`✅ Packaging Products structure: ${hasRequiredFields ? 'Valid' : 'Invalid'} (has name: ${hasRequiredFields})`);
  }
}

function runTest() {
  console.log('🚀 TESTING GT & PACKAGING DATA STATUS');
  console.log('='.repeat(60));
  
  const gtTest = testGTData();
  const packagingTest = testPackagingData();
  const userTest = testUserAccessControl();
  const notificationTest = testNotificationFlow();
  
  testDataIntegrity();
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL SUMMARY');
  console.log('='.repeat(60));
  
  console.log(`\n🏢 GT BUSINESS UNIT:`);
  console.log(`   📁 Total Data Items: ${gtTest.totalItems}`);
  console.log(`   📬 Active Notifications: ${notificationTest.gt.ppic + notificationTest.gt.finance + notificationTest.gt.invoice}`);
  
  console.log(`\n📦 PACKAGING BUSINESS UNIT:`);
  console.log(`   📁 Total Data Items: ${packagingTest.totalItems}`);
  console.log(`   📬 Active Notifications: ${notificationTest.packaging.ppic + notificationTest.packaging.finance}`);
  
  console.log(`\n👥 USER ACCESS CONTROL:`);
  console.log(`   Total Users: ${userTest.totalUsers}`);
  
  const overallItems = gtTest.totalItems + packagingTest.totalItems;
  const overallNotifications = notificationTest.gt.ppic + notificationTest.gt.finance + notificationTest.gt.invoice + 
                              notificationTest.packaging.ppic + notificationTest.packaging.finance;
  
  console.log(`\n🎯 OVERALL STATUS:`);
  if (overallItems > 100) {
    console.log(`   ✅ Data Status: HEALTHY (${overallItems} total items)`);
  } else if (overallItems > 50) {
    console.log(`   ⚠️  Data Status: MODERATE (${overallItems} total items)`);
  } else {
    console.log(`   ❌ Data Status: LOW (${overallItems} total items)`);
  }
  
  console.log(`   📬 Active Notifications: ${overallNotifications}`);
  console.log(`   🕐 Test completed: ${new Date().toLocaleString()}`);
  
  return {
    gt: gtTest,
    packaging: packagingTest,
    users: userTest,
    notifications: notificationTest,
    summary: {
      totalItems: overallItems,
      totalNotifications: overallNotifications,
      status: overallItems > 100 ? 'HEALTHY' : overallItems > 50 ? 'MODERATE' : 'LOW'
    }
  };
}

// Run the test
runTest();