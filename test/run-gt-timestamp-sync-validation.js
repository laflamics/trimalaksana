/**
 * GENERAL TRADING TIMESTAMP & SYNC VALIDATION TEST
 * 
 * Validates GT flow untuk memastikan:
 * 1. Semua data punya timestamp yang benar
 * 2. Update mechanism berjalan lancar
 * 3. Tidak ada endless update loop
 * 4. Timestamp konsisten across modules
 * 5. Data sync properly antar komponen
 * 
 * CRITICAL CHECKS:
 * - Timestamp ada di semua data
 * - Update hanya terjadi saat ada perubahan real
 * - No phantom updates
 * - Consistent timestamp format
 * - Proper data flow GT -> Finance -> Reports
 */

const { chromium } = require('playwright');

async function runGTTimestampSyncValidation() {
  console.log('🕐 GT TIMESTAMP & SYNC VALIDATION TEST');
  console.log('=====================================');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 800
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Track console messages for timestamp issues
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push({ type: msg.type(), text });
    
    // Log important messages
    if (text.includes('timestamp') || text.includes('update') || text.includes('sync') || 
        msg.type() === 'error' || msg.type() === 'warn') {
      console.log(`[BROWSER-${msg.type().toUpperCase()}] ${text}`);
    }
  });
  
  // Track network requests for sync behavior
  const networkRequests = [];
  page.on('request', request => {
    if (request.url().includes('api') || request.url().includes('storage')) {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: Date.now()
      });
    }
  });
  
  try {
    console.log('\n📋 TEST SCENARIO: GT Timestamp & Sync Validation');
    console.log('================================================');
    
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Switch to General Trading
    await page.click('text=General Trading');
    await page.waitForTimeout(2000);
    
    // STEP 1: Clear existing data and check initial state
    console.log('\n🧹 STEP 1: Initial State & Data Cleanup');
    console.log('---------------------------------------');
    
    await page.evaluate(() => {
      // Clear GT data but preserve structure
      const keysToCheck = [
        'general-trading/gt_products',
        'general-trading/gt_customers', 
        'general-trading/gt_suppliers',
        'general-trading/gt_sales_orders',
        'general-trading/gt_purchase_orders',
        'general-trading/gt_invoices',
        'general-trading/gt_inventory'
      ];
      
      keysToCheck.forEach(key => {
        localStorage.removeItem(key);
      });
      
      console.log('[GT] Cleared existing data for fresh test');
    });
    
    // STEP 2: Test Products Module - Timestamp Creation
    console.log('\n📦 STEP 2: Products Module - Timestamp Validation');
    console.log('------------------------------------------------');
    
    await page.click('text=Products');
    await page.waitForTimeout(1500);
    
    // Add a product and check timestamp
    await page.click('text=+ Tambah Product');
    await page.waitForTimeout(1000);
    
    const testProduct = {
      kode: 'GT-TEST-001',
      nama: 'Test Product GT',
      kategori: 'Electronics',
      harga: '150000',
      hargaSales: '200000'
    };
    
    await page.fill('input[placeholder*="kode"]', testProduct.kode);
    await page.fill('input[placeholder*="nama"]', testProduct.nama);
    await page.fill('input[placeholder*="kategori"]', testProduct.kategori);
    await page.fill('input[placeholder*="harga"]', testProduct.harga);
    
    // Find and fill sales price field
    const salesPriceField = page.locator('input').filter({ hasText: /harga.*sales|sales.*price/i }).or(
      page.locator('input[placeholder*="sales"]')
    ).or(
      page.locator('input').nth(4) // Fallback to 5th input field
    );
    
    if (await salesPriceField.count() > 0) {
      await salesPriceField.fill(testProduct.hargaSales);
    }
    
    const beforeSaveTime = Date.now();
    await page.click('text=Simpan');
    await page.waitForTimeout(2000);
    
    // Check if product was saved with proper timestamp
    const productData = await page.evaluate(() => {
      const data = localStorage.getItem('general-trading/gt_products');
      if (data) {
        try {
          const parsed = JSON.parse(data);
          return parsed.value || parsed;
        } catch (e) {
          return null;
        }
      }
      return null;
    });
    
    console.log('📊 Product data structure:', productData ? 'Found' : 'Not found');
    
    if (productData && Array.isArray(productData) && productData.length > 0) {
      const savedProduct = productData.find(p => p.kode === testProduct.kode);
      if (savedProduct) {
        const hasTimestamp = savedProduct.timestamp || savedProduct._timestamp || savedProduct.lastUpdate;
        const timestampValue = savedProduct.timestamp || savedProduct._timestamp || 
                              (savedProduct.lastUpdate ? new Date(savedProduct.lastUpdate).getTime() : null);
        
        console.log('✅ Product saved with timestamp:', !!hasTimestamp);
        console.log('   Timestamp value:', timestampValue);
        console.log('   Timestamp format:', typeof timestampValue);
        console.log('   Time difference from save:', timestampValue ? (timestampValue - beforeSaveTime) : 'N/A');
        
        if (!hasTimestamp) {
          console.log('❌ CRITICAL: Product missing timestamp!');
        }
      } else {
        console.log('❌ Product not found in storage');
      }
    } else {
      console.log('❌ No product data found');
    }
    
    // STEP 3: Test Customers Module - Update Timestamp
    console.log('\n👥 STEP 3: Customers Module - Update Timestamp');
    console.log('---------------------------------------------');
    
    await page.click('text=Customers');
    await page.waitForTimeout(1500);
    
    // Add customer
    await page.click('text=+ Tambah Customer');
    await page.waitForTimeout(1000);
    
    await page.fill('input[placeholder*="nama"]', 'Test Customer GT');
    await page.fill('input[placeholder*="email"]', 'test@customer.com');
    await page.fill('input[placeholder*="phone"]', '081234567890');
    
    const beforeCustomerSave = Date.now();
    await page.click('text=Simpan');
    await page.waitForTimeout(2000);
    
    // Check customer timestamp
    const customerData = await page.evaluate(() => {
      const data = localStorage.getItem('general-trading/gt_customers');
      if (data) {
        try {
          const parsed = JSON.parse(data);
          return parsed.value || parsed;
        } catch (e) {
          return null;
        }
      }
      return null;
    });
    
    if (customerData && Array.isArray(customerData) && customerData.length > 0) {
      const customer = customerData[0];
      const hasTimestamp = customer.timestamp || customer._timestamp || customer.lastUpdate;
      
      console.log('✅ Customer saved with timestamp:', !!hasTimestamp);
      
      // Now update the customer to test update timestamp
      await page.click('tr:first-child button:has-text("Edit")');
      await page.waitForTimeout(1000);
      
      await page.fill('input[placeholder*="nama"]', 'Updated Customer GT');
      
      const beforeUpdate = Date.now();
      await page.click('text=Update');
      await page.waitForTimeout(2000);
      
      // Check updated timestamp
      const updatedCustomerData = await page.evaluate(() => {
        const data = localStorage.getItem('general-trading/gt_customers');
        if (data) {
          try {
            const parsed = JSON.parse(data);
            return parsed.value || parsed;
          } catch (e) {
            return null;
          }
        }
        return null;
      });
      
      if (updatedCustomerData && updatedCustomerData.length > 0) {
        const updatedCustomer = updatedCustomerData[0];
        const newTimestamp = updatedCustomer.timestamp || updatedCustomer._timestamp || 
                           (updatedCustomer.lastUpdate ? new Date(updatedCustomer.lastUpdate).getTime() : null);
        const originalTimestamp = customer.timestamp || customer._timestamp || 
                                (customer.lastUpdate ? new Date(customer.lastUpdate).getTime() : null);
        
        console.log('✅ Customer update timestamp check:');
        console.log('   Original timestamp:', originalTimestamp);
        console.log('   Updated timestamp:', newTimestamp);
        console.log('   Timestamp increased:', newTimestamp > originalTimestamp);
        
        if (newTimestamp <= originalTimestamp) {
          console.log('❌ CRITICAL: Update timestamp not properly incremented!');
        }
      }
    }
    
    // STEP 4: Test Sales Orders - Cross-Module Data Flow
    console.log('\n🛒 STEP 4: Sales Orders - Cross-Module Data Flow');
    console.log('-----------------------------------------------');
    
    await page.click('text=Sales Orders');
    await page.waitForTimeout(1500);
    
    // Create sales order using existing product and customer
    await page.click('text=+ Tambah Sales Order');
    await page.waitForTimeout(1000);
    
    // Fill SO details
    await page.fill('input[placeholder*="nomor"]', 'SO-GT-001');
    
    // Select customer (should have timestamp from previous step)
    const customerSelect = page.locator('select').first();
    if (await customerSelect.count() > 0) {
      await customerSelect.selectOption({ index: 1 }); // Select first customer
    }
    
    await page.waitForTimeout(500);
    
    // Add product line
    await page.click('text=+ Tambah Item');
    await page.waitForTimeout(500);
    
    // Select product
    const productSelect = page.locator('select').nth(1);
    if (await productSelect.count() > 0) {
      await productSelect.selectOption({ index: 1 }); // Select first product
    }
    
    await page.fill('input[placeholder*="qty"]', '5');
    
    const beforeSOSave = Date.now();
    await page.click('text=Simpan Sales Order');
    await page.waitForTimeout(2000);
    
    // Check SO timestamp and data integrity
    const soData = await page.evaluate(() => {
      const data = localStorage.getItem('general-trading/gt_sales_orders');
      if (data) {
        try {
          const parsed = JSON.parse(data);
          return parsed.value || parsed;
        } catch (e) {
          return null;
        }
      }
      return null;
    });
    
    if (soData && Array.isArray(soData) && soData.length > 0) {
      const so = soData[0];
      const hasTimestamp = so.timestamp || so._timestamp || so.lastUpdate;
      const hasCustomerData = so.customer || so.customerId;
      const hasProductData = so.items && so.items.length > 0;
      
      console.log('✅ Sales Order validation:');
      console.log('   Has timestamp:', !!hasTimestamp);
      console.log('   Has customer data:', !!hasCustomerData);
      console.log('   Has product data:', !!hasProductData);
      console.log('   Items count:', so.items ? so.items.length : 0);
      
      if (hasProductData && so.items[0]) {
        const item = so.items[0];
        const hasProductTimestamp = item.timestamp || item._timestamp;
        console.log('   Item has timestamp:', !!hasProductTimestamp);
        
        if (!hasProductTimestamp) {
          console.log('❌ CRITICAL: SO item missing timestamp!');
        }
      }
    }
    
    // STEP 5: Test Finance Integration - COA & Ledger
    console.log('\n💰 STEP 5: Finance Integration - COA & Ledger');
    console.log('--------------------------------------------');
    
    await page.click('text=Finance');
    await page.waitForTimeout(1000);
    await page.click('text=Chart of Accounts');
    await page.waitForTimeout(1500);
    
    // Check if COA has proper timestamps
    const coaData = await page.evaluate(() => {
      const data = localStorage.getItem('general-trading/gt_coa') || localStorage.getItem('gt_coa');
      if (data) {
        try {
          const parsed = JSON.parse(data);
          return parsed.value || parsed;
        } catch (e) {
          return null;
        }
      }
      return null;
    });
    
    console.log('📊 COA data check:', coaData ? `Found ${Array.isArray(coaData) ? coaData.length : 'object'}` : 'Not found');
    
    if (coaData && Array.isArray(coaData)) {
      const accountsWithTimestamp = coaData.filter(acc => acc.timestamp || acc._timestamp || acc.lastUpdate);
      console.log('   Accounts with timestamp:', `${accountsWithTimestamp.length}/${coaData.length}`);
      
      if (accountsWithTimestamp.length < coaData.length) {
        console.log('⚠️ WARNING: Some COA accounts missing timestamps');
      }
    }
    
    // STEP 6: Test Inventory Updates
    console.log('\n📦 STEP 6: Inventory Updates & Timestamp Consistency');
    console.log('--------------------------------------------------');
    
    await page.click('text=Inventory');
    await page.waitForTimeout(1500);
    
    // Check inventory data structure and timestamps
    const inventoryData = await page.evaluate(() => {
      const data = localStorage.getItem('general-trading/gt_inventory');
      if (data) {
        try {
          const parsed = JSON.parse(data);
          return parsed.value || parsed;
        } catch (e) {
          return null;
        }
      }
      return null;
    });
    
    console.log('📦 Inventory data:', inventoryData ? 'Found' : 'Not found');
    
    if (inventoryData && Array.isArray(inventoryData)) {
      const itemsWithTimestamp = inventoryData.filter(item => item.timestamp || item._timestamp || item.lastUpdate);
      console.log('   Items with timestamp:', `${itemsWithTimestamp.length}/${inventoryData.length}`);
    }
    
    // STEP 7: Test Auto-Sync Behavior
    console.log('\n🔄 STEP 7: Auto-Sync Behavior & Update Loops');
    console.log('--------------------------------------------');
    
    // Monitor storage events for a period
    const storageEvents = [];
    await page.evaluate(() => {
      window.storageEventCount = 0;
      window.addEventListener('app-storage-changed', (event) => {
        window.storageEventCount++;
        console.log(`[STORAGE-EVENT] ${event.detail.key} changed (count: ${window.storageEventCount})`);
      });
    });
    
    // Wait and monitor for phantom updates
    console.log('   Monitoring for phantom updates (10 seconds)...');
    await page.waitForTimeout(10000);
    
    const eventCount = await page.evaluate(() => window.storageEventCount || 0);
    console.log('   Storage events detected:', eventCount);
    
    if (eventCount > 20) {
      console.log('⚠️ WARNING: High number of storage events - possible update loop');
    } else if (eventCount === 0) {
      console.log('✅ No phantom updates detected');
    } else {
      console.log('✅ Normal storage event activity');
    }
    
    // STEP 8: Cross-Module Timestamp Consistency
    console.log('\n🔗 STEP 8: Cross-Module Timestamp Consistency');
    console.log('--------------------------------------------');
    
    const allGTData = await page.evaluate(() => {
      const keys = [
        'general-trading/gt_products',
        'general-trading/gt_customers', 
        'general-trading/gt_suppliers',
        'general-trading/gt_sales_orders',
        'general-trading/gt_purchase_orders',
        'general-trading/gt_invoices',
        'general-trading/gt_inventory',
        'general-trading/gt_coa'
      ];
      
      const result = {};
      keys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            const items = parsed.value || parsed;
            if (Array.isArray(items)) {
              result[key] = {
                count: items.length,
                withTimestamp: items.filter(item => item.timestamp || item._timestamp || item.lastUpdate).length,
                timestamps: items.map(item => ({
                  id: item.id || item.kode || item.nomor || 'unknown',
                  timestamp: item.timestamp || item._timestamp || (item.lastUpdate ? new Date(item.lastUpdate).getTime() : null)
                })).filter(t => t.timestamp)
              };
            }
          } catch (e) {
            result[key] = { error: 'Parse error' };
          }
        }
      });
      
      return result;
    });
    
    console.log('📊 GT Data Timestamp Summary:');
    Object.entries(allGTData).forEach(([key, data]) => {
      const moduleName = key.split('/')[1] || key;
      if (data.error) {
        console.log(`   ${moduleName}: ERROR - ${data.error}`);
      } else {
        const coverage = data.count > 0 ? `${data.withTimestamp}/${data.count}` : '0/0';
        const status = data.count === 0 ? 'EMPTY' : 
                      data.withTimestamp === data.count ? 'GOOD' : 
                      data.withTimestamp > 0 ? 'PARTIAL' : 'BAD';
        console.log(`   ${moduleName}: ${coverage} items with timestamp [${status}]`);
      }
    });
    
    // STEP 9: Performance & Memory Check
    console.log('\n⚡ STEP 9: Performance & Memory Check');
    console.log('-----------------------------------');
    
    const performanceMetrics = await page.evaluate(() => {
      const storageSize = JSON.stringify(localStorage).length;
      const gtKeys = Object.keys(localStorage).filter(key => key.includes('general-trading'));
      
      return {
        totalStorageSize: storageSize,
        gtKeysCount: gtKeys.length,
        gtKeys: gtKeys,
        memoryUsage: performance.memory ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024)
        } : 'Not available'
      };
    });
    
    console.log('📈 Performance metrics:');
    console.log('   Total storage size:', Math.round(performanceMetrics.totalStorageSize / 1024), 'KB');
    console.log('   GT storage keys:', performanceMetrics.gtKeysCount);
    console.log('   Memory usage:', performanceMetrics.memoryUsage);
    
    // FINAL VALIDATION
    console.log('\n🎯 FINAL VALIDATION SUMMARY');
    console.log('===========================');
    
    const validationResults = {
      timestampCoverage: Object.values(allGTData).reduce((acc, data) => {
        if (!data.error && data.count > 0) {
          acc.total += data.count;
          acc.withTimestamp += data.withTimestamp;
        }
        return acc;
      }, { total: 0, withTimestamp: 0 }),
      
      noPhantomUpdates: eventCount < 20,
      dataIntegrity: Object.values(allGTData).every(data => !data.error),
      performanceOK: performanceMetrics.totalStorageSize < 1024 * 1024 // < 1MB
    };
    
    const timestampCoveragePercent = validationResults.timestampCoverage.total > 0 ? 
      Math.round((validationResults.timestampCoverage.withTimestamp / validationResults.timestampCoverage.total) * 100) : 0;
    
    console.log('📊 Validation Results:');
    console.log(`   Timestamp Coverage: ${validationResults.timestampCoverage.withTimestamp}/${validationResults.timestampCoverage.total} (${timestampCoveragePercent}%)`);
    console.log(`   No Phantom Updates: ${validationResults.noPhantomUpdates ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Data Integrity: ${validationResults.dataIntegrity ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Performance: ${validationResults.performanceOK ? '✅ PASS' : '❌ FAIL'}`);
    
    const overallPass = timestampCoveragePercent >= 90 && 
                       validationResults.noPhantomUpdates && 
                       validationResults.dataIntegrity && 
                       validationResults.performanceOK;
    
    if (overallPass) {
      console.log('\n🎉 GT TIMESTAMP & SYNC VALIDATION: PASSED!');
      console.log('✅ Timestamps properly managed');
      console.log('✅ No endless update loops');
      console.log('✅ Data integrity maintained');
      console.log('✅ Performance within limits');
    } else {
      console.log('\n❌ GT TIMESTAMP & SYNC VALIDATION: ISSUES FOUND!');
      
      if (timestampCoveragePercent < 90) {
        console.log('❌ Poor timestamp coverage - some data missing timestamps');
      }
      if (!validationResults.noPhantomUpdates) {
        console.log('❌ Phantom updates detected - possible update loop');
      }
      if (!validationResults.dataIntegrity) {
        console.log('❌ Data integrity issues - parse errors found');
      }
      if (!validationResults.performanceOK) {
        console.log('❌ Performance issues - storage size too large');
      }
    }
    
    // Console message analysis
    const errorMessages = consoleMessages.filter(msg => msg.type === 'error');
    const warningMessages = consoleMessages.filter(msg => msg.type === 'warn');
    const timestampMessages = consoleMessages.filter(msg => msg.text.includes('timestamp'));
    
    if (errorMessages.length > 0) {
      console.log('\n⚠️ Console Errors Found:');
      errorMessages.slice(0, 5).forEach(msg => console.log(`   ${msg.text}`));
    }
    
    if (warningMessages.length > 0) {
      console.log('\n⚠️ Console Warnings Found:');
      warningMessages.slice(0, 5).forEach(msg => console.log(`   ${msg.text}`));
    }
    
    console.log('\n🔧 RECOMMENDATIONS:');
    if (timestampCoveragePercent < 90) {
      console.log('- Add timestamp to all data creation/update operations');
      console.log('- Use Date.now() or new Date().toISOString() consistently');
    }
    if (!validationResults.noPhantomUpdates) {
      console.log('- Check for unnecessary re-renders or state updates');
      console.log('- Implement proper dependency arrays in useEffect');
    }
    console.log('- Monitor storage size growth over time');
    console.log('- Consider implementing data cleanup for old records');
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
runGTTimestampSyncValidation().catch(console.error);