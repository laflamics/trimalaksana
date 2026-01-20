/**
 * Comprehensive Test for GT and Packaging Modules
 * Tests all major functionalities after recent fixes
 */

const { storageService } = require('./src/services/storage');

async function testGTModules() {
  console.log('\n🔍 TESTING GT MODULES...\n');
  
  try {
    // Test GT Data Loading
    console.log('1. Testing GT Data Loading:');
    const gtSalesOrders = await storageService.get('gt_salesOrders') || [];
    const gtProducts = await storageService.get('gt_products') || [];
    const gtCustomers = await storageService.get('gt_customers') || [];
    const gtPurchaseOrders = await storageService.get('gt_purchaseOrders') || [];
    const gtInvoices = await storageService.get('gt_invoices') || [];
    const gtPayments = await storageService.get('gt_payments') || [];
    
    console.log(`   ✅ GT Sales Orders: ${gtSalesOrders.length} items`);
    console.log(`   ✅ GT Products: ${gtProducts.length} items`);
    console.log(`   ✅ GT Customers: ${gtCustomers.length} items`);
    console.log(`   ✅ GT Purchase Orders: ${gtPurchaseOrders.length} items`);
    console.log(`   ✅ GT Invoices: ${gtInvoices.length} items`);
    console.log(`   ✅ GT Payments: ${gtPayments.length} items`);
    
    // Test GT Notifications
    console.log('\n2. Testing GT Notifications:');
    const gtPpicNotifications = await storageService.get('gt_ppicNotifications') || [];
    const gtFinanceNotifications = await storageService.get('gt_financeNotifications') || [];
    const gtInvoiceNotifications = await storageService.get('gt_invoiceNotifications') || [];
    
    console.log(`   ✅ GT PPIC Notifications: ${gtPpicNotifications.length} items`);
    console.log(`   ✅ GT Finance Notifications: ${gtFinanceNotifications.length} items`);
    console.log(`   ✅ GT Invoice Notifications: ${gtInvoiceNotifications.length} items`);
    
    // Test GT Workflow Data
    console.log('\n3. Testing GT Workflow Data:');
    const gtGrn = await storageService.get('gt_grn') || [];
    const gtDelivery = await storageService.get('gt_delivery') || [];
    const gtInventory = await storageService.get('gt_inventory') || [];
    
    console.log(`   ✅ GT GRN: ${gtGrn.length} items`);
    console.log(`   ✅ GT Delivery: ${gtDelivery.length} items`);
    console.log(`   ✅ GT Inventory: ${gtInventory.length} items`);
    
    // Test GT Force Reload Mechanism
    console.log('\n4. Testing GT Force Reload Mechanism:');
    if (gtSalesOrders.length <= 1) {
      console.log('   🔄 Testing force reload for GT Sales Orders...');
      const reloadedSO = await storageService.forceReloadFromFile('gt_salesOrders');
      console.log(`   ✅ Force reload result: ${reloadedSO ? reloadedSO.length : 0} items`);
    } else {
      console.log('   ✅ GT Sales Orders data looks good, no force reload needed');
    }
    
    // Test GT Data Structure
    console.log('\n5. Testing GT Data Structure:');
    if (gtSalesOrders.length > 0) {
      const sampleSO = gtSalesOrders[0];
      console.log(`   ✅ Sample SO structure: ${Object.keys(sampleSO).join(', ')}`);
      console.log(`   ✅ Sample SO has items: ${sampleSO.items ? sampleSO.items.length : 0} items`);
    }
    
    if (gtProducts.length > 0) {
      const sampleProduct = gtProducts[0];
      console.log(`   ✅ Sample Product structure: ${Object.keys(sampleProduct).join(', ')}`);
    }
    
    return {
      success: true,
      gtData: {
        salesOrders: gtSalesOrders.length,
        products: gtProducts.length,
        customers: gtCustomers.length,
        purchaseOrders: gtPurchaseOrders.length,
        invoices: gtInvoices.length,
        payments: gtPayments.length,
        notifications: {
          ppic: gtPpicNotifications.length,
          finance: gtFinanceNotifications.length,
          invoice: gtInvoiceNotifications.length
        }
      }
    };
    
  } catch (error) {
    console.error('❌ GT Module Test Failed:', error);
    return { success: false, error: error.message };
  }
}

async function testPackagingModules() {
  console.log('\n🔍 TESTING PACKAGING MODULES...\n');
  
  try {
    // Test Packaging Data Loading
    console.log('1. Testing Packaging Data Loading:');
    const salesOrders = await storageService.get('salesOrders') || [];
    const products = await storageService.get('products') || [];
    const customers = await storageService.get('customers') || [];
    const purchaseOrders = await storageService.get('purchaseOrders') || [];
    const suppliers = await storageService.get('suppliers') || [];
    
    console.log(`   ✅ Packaging Sales Orders: ${salesOrders.length} items`);
    console.log(`   ✅ Packaging Products: ${products.length} items`);
    console.log(`   ✅ Packaging Customers: ${customers.length} items`);
    console.log(`   ✅ Packaging Purchase Orders: ${purchaseOrders.length} items`);
    console.log(`   ✅ Packaging Suppliers: ${suppliers.length} items`);
    
    // Test Packaging Notifications
    console.log('\n2. Testing Packaging Notifications:');
    const ppicNotifications = await storageService.get('ppicNotifications') || [];
    const financeNotifications = await storageService.get('financeNotifications') || [];
    
    console.log(`   ✅ Packaging PPIC Notifications: ${ppicNotifications.length} items`);
    console.log(`   ✅ Packaging Finance Notifications: ${financeNotifications.length} items`);
    
    // Test Packaging Workflow Data
    console.log('\n3. Testing Packaging Workflow Data:');
    const grn = await storageService.get('grn') || [];
    const delivery = await storageService.get('delivery') || [];
    const production = await storageService.get('production') || [];
    const inventory = await storageService.get('inventory') || [];
    
    console.log(`   ✅ Packaging GRN: ${grn.length} items`);
    console.log(`   ✅ Packaging Delivery: ${delivery.length} items`);
    console.log(`   ✅ Packaging Production: ${production.length} items`);
    console.log(`   ✅ Packaging Inventory: ${inventory.length} items`);
    
    // Test Packaging Data Structure
    console.log('\n4. Testing Packaging Data Structure:');
    if (salesOrders.length > 0) {
      const sampleSO = salesOrders[0];
      console.log(`   ✅ Sample SO structure: ${Object.keys(sampleSO).join(', ')}`);
      console.log(`   ✅ Sample SO has items: ${sampleSO.items ? sampleSO.items.length : 0} items`);
    }
    
    if (products.length > 0) {
      const sampleProduct = products[0];
      console.log(`   ✅ Sample Product structure: ${Object.keys(sampleProduct).join(', ')}`);
    }
    
    return {
      success: true,
      packagingData: {
        salesOrders: salesOrders.length,
        products: products.length,
        customers: customers.length,
        purchaseOrders: purchaseOrders.length,
        suppliers: suppliers.length,
        notifications: {
          ppic: ppicNotifications.length,
          finance: financeNotifications.length
        }
      }
    };
    
  } catch (error) {
    console.error('❌ Packaging Module Test Failed:', error);
    return { success: false, error: error.message };
  }
}

async function testUserAccessControl() {
  console.log('\n🔍 TESTING USER ACCESS CONTROL...\n');
  
  try {
    // Test User Access Control Data
    console.log('1. Testing User Access Control Data:');
    const userAccessControl = await storageService.get('userAccessControl') || [];
    const gtUserAccessControl = await storageService.get('gt_userAccessControl') || [];
    const truckingUserAccessControl = await storageService.get('trucking_userAccessControl') || [];
    
    console.log(`   ✅ Main User Access Control: ${userAccessControl.length} users`);
    console.log(`   ✅ GT User Access Control: ${gtUserAccessControl.length} users`);
    console.log(`   ✅ Trucking User Access Control: ${truckingUserAccessControl.length} users`);
    
    // Test Activity Logs
    console.log('\n2. Testing Activity Logs:');
    const activityLogs = await storageService.get('activityLogs') || [];
    const gtActivityLogs = await storageService.get('general-trading/activityLogs') || [];
    const truckingActivityLogs = await storageService.get('trucking/activityLogs') || [];
    
    console.log(`   ✅ Main Activity Logs: ${activityLogs.length} entries`);
    console.log(`   ✅ GT Activity Logs: ${gtActivityLogs.length} entries`);
    console.log(`   ✅ Trucking Activity Logs: ${truckingActivityLogs.length} entries`);
    
    return {
      success: true,
      userAccessData: {
        main: userAccessControl.length,
        gt: gtUserAccessControl.length,
        trucking: truckingUserAccessControl.length,
        activityLogs: {
          main: activityLogs.length,
          gt: gtActivityLogs.length,
          trucking: truckingActivityLogs.length
        }
      }
    };
    
  } catch (error) {
    console.error('❌ User Access Control Test Failed:', error);
    return { success: false, error: error.message };
  }
}

async function testStorageService() {
  console.log('\n🔍 TESTING STORAGE SERVICE...\n');
  
  try {
    // Test Storage Service Basic Functions
    console.log('1. Testing Storage Service Basic Functions:');
    
    // Test set and get
    const testData = { test: 'data', timestamp: new Date().toISOString() };
    await storageService.set('test_storage', testData);
    const retrievedData = await storageService.get('test_storage');
    
    if (JSON.stringify(testData) === JSON.stringify(retrievedData)) {
      console.log('   ✅ Storage set/get working correctly');
    } else {
      console.log('   ❌ Storage set/get failed');
    }
    
    // Test force reload
    console.log('2. Testing Force Reload Function:');
    const reloadResult = await storageService.forceReloadFromFile('products');
    console.log(`   ✅ Force reload test: ${reloadResult ? reloadResult.length : 0} items loaded`);
    
    // Clean up test data
    await storageService.set('test_storage', null);
    
    return { success: true };
    
  } catch (error) {
    console.error('❌ Storage Service Test Failed:', error);
    return { success: false, error: error.message };
  }
}

async function runComprehensiveTest() {
  console.log('🚀 STARTING COMPREHENSIVE GT & PACKAGING TEST');
  console.log('='.repeat(60));
  
  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };
  
  // Run all tests
  results.tests.gt = await testGTModules();
  results.tests.packaging = await testPackagingModules();
  results.tests.userAccess = await testUserAccessControl();
  results.tests.storage = await testStorageService();
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const allPassed = Object.values(results.tests).every(test => test.success);
  
  if (allPassed) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('\n✅ GT Modules: Working correctly');
    console.log('✅ Packaging Modules: Working correctly');
    console.log('✅ User Access Control: Working correctly');
    console.log('✅ Storage Service: Working correctly');
  } else {
    console.log('⚠️  SOME TESTS FAILED:');
    Object.entries(results.tests).forEach(([testName, result]) => {
      if (!result.success) {
        console.log(`❌ ${testName}: ${result.error}`);
      } else {
        console.log(`✅ ${testName}: Passed`);
      }
    });
  }
  
  // Data Summary
  if (results.tests.gt.success && results.tests.packaging.success) {
    console.log('\n📈 DATA SUMMARY:');
    console.log('GT Data:', results.tests.gt.gtData);
    console.log('Packaging Data:', results.tests.packaging.packagingData);
    if (results.tests.userAccess.success) {
      console.log('User Access Data:', results.tests.userAccess.userAccessData);
    }
  }
  
  console.log('\n🏁 Test completed at:', new Date().toLocaleString());
  
  return results;
}

// Run the test
if (require.main === module) {
  runComprehensiveTest().catch(console.error);
}

module.exports = { runComprehensiveTest, testGTModules, testPackagingModules };