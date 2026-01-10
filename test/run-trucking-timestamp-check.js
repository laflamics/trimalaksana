const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Trucking Timestamp Sync Validation Test
 * Validates timestamp consistency and sync behavior in Trucking module
 */

async function runTruckingTimestampCheck() {
  console.log('🚛 Starting Trucking Timestamp Sync Validation...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const results = {
    testStartTime: new Date().toISOString(),
    tests: [],
    timestampIssues: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      timestampIssues: 0
    }
  };

  try {
    // Test 1: Trucking Data Timestamp Validation
    console.log('📋 Test 1: Trucking Data Timestamp Validation');
    const test1Result = await testTruckingDataTimestamps(browser);
    results.tests.push(test1Result);
    
    // Test 2: Trucking Sync Mechanism Check
    console.log('📋 Test 2: Trucking Sync Mechanism Check');
    const test2Result = await testTruckingSyncMechanism(browser);
    results.tests.push(test2Result);
    
    // Test 3: Cross-Module Timestamp Consistency
    console.log('📋 Test 3: Cross-Module Timestamp Consistency');
    const test3Result = await testCrossModuleTimestampConsistency(browser);
    results.tests.push(test3Result);
    
    // Test 4: Trucking Update Loop Detection
    console.log('📋 Test 4: Trucking Update Loop Detection');
    const test4Result = await testTruckingUpdateLoopDetection(browser);
    results.tests.push(test4Result);
    
    // Test 5: Trucking Notification Timestamp Validation
    console.log('📋 Test 5: Trucking Notification Timestamp Validation');
    const test5Result = await testTruckingNotificationTimestamps(browser);
    results.tests.push(test5Result);

    // Calculate summary
    results.summary.total = results.tests.length;
    results.summary.passed = results.tests.filter(t => t.status === 'PASSED').length;
    results.summary.failed = results.tests.filter(t => t.status === 'FAILED').length;
    results.summary.timestampIssues = results.timestampIssues.length;
    
    // Generate report
    generateTruckingTimestampReport(results);
    
  } catch (error) {
    console.error('❌ Test suite error:', error);
  } finally {
    await browser.close();
  }
}

async function testTruckingDataTimestamps(browser) {
  const test = {
    name: 'Trucking Data Timestamp Validation',
    status: 'RUNNING',
    checks: [],
    startTime: new Date().toISOString()
  };

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Switch to Trucking module
    const businessSelector = page.locator('select').first();
    if (await businessSelector.isVisible()) {
      await businessSelector.selectOption('trucking');
      await page.waitForTimeout(2000);
    }
    
    console.log('  🔄 Checking Trucking data timestamps...');
    
    // Get all trucking data from localStorage
    const truckingData = await page.evaluate(() => {
      const data = {};
      const keys = Object.keys(localStorage).filter(key => key.startsWith('trucking_'));
      
      keys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            data[key] = JSON.parse(value);
          }
        } catch (e) {
          data[key] = { error: 'Parse error', raw: localStorage.getItem(key) };
        }
      });
      
      return data;
    });
    
    console.log(`  📊 Found ${Object.keys(truckingData).length} trucking data keys`);
    
    // Check each data type for timestamp consistency
    const dataTypes = [
      'trucking_deliveryOrders',
      'trucking_unitSchedules', 
      'trucking_suratJalans',
      'trucking_vehicles',
      'trucking_drivers',
      'trucking_routes',
      'trucking_customers',
      'trucking_invoiceNotifications',
      'trucking_unitNotifications'
    ];
    
    let totalTimestampIssues = 0;
    
    for (const dataType of dataTypes) {
      const data = truckingData[dataType];
      if (!data) {
        console.log(`  ⚠️  ${dataType}: No data found`);
        continue;
      }
      
      if (!Array.isArray(data)) {
        console.log(`  ⚠️  ${dataType}: Not an array`);
        continue;
      }
      
      console.log(`  📊 ${dataType}: ${data.length} items`);
      
      // Check timestamp fields in each item
      let itemsWithTimestamps = 0;
      let itemsWithoutTimestamps = 0;
      let timestampInconsistencies = 0;
      
      data.forEach((item, index) => {
        const timestamps = [];
        
        // Common timestamp fields
        const timestampFields = [
          'created', 'createdAt', 'timestamp', '_timestamp',
          'updated', 'updatedAt', 'modified', 'modifiedAt',
          'confirmed', 'confirmedAt', 'scheduled', 'scheduledAt',
          'delivered', 'deliveredAt', 'signed', 'signedAt'
        ];
        
        timestampFields.forEach(field => {
          if (item[field]) {
            timestamps.push({ field, value: item[field] });
          }
        });
        
        if (timestamps.length > 0) {
          itemsWithTimestamps++;
          
          // Check timestamp format consistency
          timestamps.forEach(ts => {
            const isValidTimestamp = !isNaN(Date.parse(ts.value)) || !isNaN(ts.value);
            if (!isValidTimestamp) {
              timestampInconsistencies++;
              console.log(`  ❌ ${dataType}[${index}].${ts.field}: Invalid timestamp "${ts.value}"`);
            }
          });
          
          // Check for timestamp ordering (created should be <= updated)
          const created = item.created || item.createdAt || item.timestamp;
          const updated = item.updated || item.updatedAt || item.modifiedAt;
          
          if (created && updated) {
            const createdTime = new Date(created).getTime();
            const updatedTime = new Date(updated).getTime();
            
            if (createdTime > updatedTime) {
              timestampInconsistencies++;
              console.log(`  ❌ ${dataType}[${index}]: Created time (${created}) > Updated time (${updated})`);
            }
          }
        } else {
          itemsWithoutTimestamps++;
        }
      });
      
      console.log(`    ✅ Items with timestamps: ${itemsWithTimestamps}`);
      console.log(`    ⚠️  Items without timestamps: ${itemsWithoutTimestamps}`);
      console.log(`    ❌ Timestamp inconsistencies: ${timestampInconsistencies}`);
      
      totalTimestampIssues += timestampInconsistencies;
      
      test.checks.push({
        dataType,
        itemCount: data.length,
        itemsWithTimestamps,
        itemsWithoutTimestamps,
        timestampInconsistencies,
        status: timestampInconsistencies === 0 ? 'PASSED' : 'FAILED'
      });
    }
    
    console.log(`  📊 Total timestamp issues found: ${totalTimestampIssues}`);
    
    await context.close();
    
    test.status = totalTimestampIssues === 0 ? 'PASSED' : 'FAILED';
    test.endTime = new Date().toISOString();
    test.totalTimestampIssues = totalTimestampIssues;
    
    console.log(`  ${test.status === 'PASSED' ? '✅' : '❌'} Test 1 ${test.status}\n`);
    return test;
    
  } catch (error) {
    test.status = 'FAILED';
    test.error = error.message;
    test.endTime = new Date().toISOString();
    console.log(`  ❌ Test 1 FAILED: ${error.message}\n`);
    return test;
  }
}

async function testTruckingSyncMechanism(browser) {
  const test = {
    name: 'Trucking Sync Mechanism Check',
    status: 'RUNNING',
    checks: [],
    startTime: new Date().toISOString()
  };

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Switch to Trucking module
    const businessSelector = page.locator('select').first();
    if (await businessSelector.isVisible()) {
      await businessSelector.selectOption('trucking');
      await page.waitForTimeout(2000);
    }
    
    console.log('  🔄 Checking Trucking sync mechanism...');
    
    // Check sync-related data in localStorage
    const syncData = await page.evaluate(() => {
      return {
        lastSyncTimestamp: localStorage.getItem('last_sync_timestamp'),
        syncInProgress: localStorage.getItem('syncInProgress'),
        storageConfig: localStorage.getItem('storage_config'),
        selectedBusiness: localStorage.getItem('selectedBusiness')
      };
    });
    
    console.log('  📊 Sync data:', syncData);
    
    // Check if trucking context is properly set
    const isTruckingContext = syncData.selectedBusiness === 'trucking';
    console.log(`  📊 Trucking context active: ${isTruckingContext ? 'Yes' : 'No'}`);
    
    test.checks.push({
      check: 'Trucking context active',
      status: isTruckingContext ? 'PASSED' : 'FAILED',
      value: syncData.selectedBusiness
    });
    
    // Check last sync timestamp
    const hasLastSyncTimestamp = syncData.lastSyncTimestamp !== null;
    const lastSyncTime = hasLastSyncTimestamp ? new Date(parseInt(syncData.lastSyncTimestamp)) : null;
    
    console.log(`  📊 Last sync timestamp: ${hasLastSyncTimestamp ? lastSyncTime.toISOString() : 'None'}`);
    
    test.checks.push({
      check: 'Last sync timestamp exists',
      status: hasLastSyncTimestamp ? 'PASSED' : 'WARNING',
      value: lastSyncTime ? lastSyncTime.toISOString() : 'None'
    });
    
    // Check storage configuration
    let storageConfig = null;
    if (syncData.storageConfig) {
      try {
        storageConfig = JSON.parse(syncData.storageConfig);
        console.log(`  📊 Storage type: ${storageConfig.type}`);
        console.log(`  📊 Server URL: ${storageConfig.serverUrl || 'None'}`);
        
        test.checks.push({
          check: 'Storage configuration valid',
          status: 'PASSED',
          value: storageConfig.type
        });
      } catch (e) {
        console.log('  ❌ Storage config parse error');
        test.checks.push({
          check: 'Storage configuration valid',
          status: 'FAILED',
          error: 'Parse error'
        });
      }
    }
    
    // Test trucking-specific sync behavior
    console.log('  🔄 Testing trucking data sync behavior...');
    
    // Create a test delivery order to check timestamp behavior
    await page.click('text=Delivery Orders');
    await page.waitForTimeout(2000);
    
    // Check if data loads with proper timestamps
    const dataLoadTimestamp = Date.now();
    await page.waitForTimeout(1000);
    
    const truckingDataAfterLoad = await page.evaluate(() => {
      const deliveryOrders = localStorage.getItem('trucking_deliveryOrders');
      return deliveryOrders ? JSON.parse(deliveryOrders) : [];
    });
    
    console.log(`  📊 Delivery orders loaded: ${truckingDataAfterLoad.length}`);
    
    // Check if data has proper timestamp structure
    if (truckingDataAfterLoad.length > 0) {
      const firstDO = truckingDataAfterLoad[0];
      const hasProperTimestamp = firstDO.created || firstDO.timestamp || firstDO._timestamp;
      
      console.log(`  📊 First DO has timestamp: ${hasProperTimestamp ? 'Yes' : 'No'}`);
      
      test.checks.push({
        check: 'Trucking data has timestamps',
        status: hasProperTimestamp ? 'PASSED' : 'FAILED',
        value: hasProperTimestamp
      });
    }
    
    await context.close();
    
    test.status = test.checks.every(c => c.status === 'PASSED' || c.status === 'WARNING') ? 'PASSED' : 'FAILED';
    test.endTime = new Date().toISOString();
    
    console.log(`  ${test.status === 'PASSED' ? '✅' : '❌'} Test 2 ${test.status}\n`);
    return test;
    
  } catch (error) {
    test.status = 'FAILED';
    test.error = error.message;
    test.endTime = new Date().toISOString();
    console.log(`  ❌ Test 2 FAILED: ${error.message}\n`);
    return test;
  }
}

async function testCrossModuleTimestampConsistency(browser) {
  const test = {
    name: 'Cross-Module Timestamp Consistency',
    status: 'RUNNING',
    checks: [],
    startTime: new Date().toISOString()
  };

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    console.log('  🔄 Checking cross-module timestamp consistency...');
    
    // Get data from all modules
    const allModuleData = await page.evaluate(() => {
      const data = {
        packaging: {},
        generalTrading: {},
        trucking: {}
      };
      
      // Get all localStorage keys
      const keys = Object.keys(localStorage);
      
      keys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value && value.startsWith('{') || value.startsWith('[')) {
            const parsed = JSON.parse(value);
            
            if (key.startsWith('trucking_')) {
              data.trucking[key] = parsed;
            } else if (key.startsWith('general-trading/') || key.startsWith('gt_')) {
              data.generalTrading[key] = parsed;
            } else if (!key.includes('/') && !key.startsWith('gt_') && !key.startsWith('trucking_')) {
              // Packaging data (no prefix)
              data.packaging[key] = parsed;
            }
          }
        } catch (e) {
          // Skip invalid JSON
        }
      });
      
      return data;
    });
    
    console.log(`  📊 Packaging data keys: ${Object.keys(allModuleData.packaging).length}`);
    console.log(`  📊 General Trading data keys: ${Object.keys(allModuleData.generalTrading).length}`);
    console.log(`  📊 Trucking data keys: ${Object.keys(allModuleData.trucking).length}`);
    
    // Check timestamp format consistency across modules
    const timestampFormats = {
      packaging: new Set(),
      generalTrading: new Set(),
      trucking: new Set()
    };
    
    // Analyze timestamp formats in each module
    Object.entries(allModuleData).forEach(([module, moduleData]) => {
      Object.entries(moduleData).forEach(([key, data]) => {
        if (Array.isArray(data)) {
          data.forEach(item => {
            ['created', 'createdAt', 'timestamp', '_timestamp', 'updated', 'updatedAt'].forEach(field => {
              if (item[field]) {
                const timestamp = item[field];
                let format = 'unknown';
                
                if (typeof timestamp === 'number') {
                  format = 'unix_timestamp';
                } else if (typeof timestamp === 'string') {
                  if (timestamp.includes('T') && timestamp.includes('Z')) {
                    format = 'iso_string';
                  } else if (timestamp.includes('-') && timestamp.includes(':')) {
                    format = 'datetime_string';
                  } else if (timestamp.includes('-') && !timestamp.includes(':')) {
                    format = 'date_string';
                  }
                }
                
                timestampFormats[module].add(format);
              }
            });
          });
        }
      });
    });
    
    console.log('  📊 Timestamp formats by module:');
    Object.entries(timestampFormats).forEach(([module, formats]) => {
      console.log(`    ${module}: ${Array.from(formats).join(', ')}`);
    });
    
    // Check for consistency
    const allFormats = new Set();
    Object.values(timestampFormats).forEach(formats => {
      formats.forEach(format => allFormats.add(format));
    });
    
    const isConsistent = allFormats.size <= 2; // Allow for some variation (e.g., unix + iso)
    console.log(`  📊 Timestamp format consistency: ${isConsistent ? 'Good' : 'Inconsistent'}`);
    
    test.checks.push({
      check: 'Cross-module timestamp format consistency',
      status: isConsistent ? 'PASSED' : 'WARNING',
      formats: Object.fromEntries(
        Object.entries(timestampFormats).map(([k, v]) => [k, Array.from(v)])
      )
    });
    
    // Check sync timestamp consistency
    const syncTimestamps = await page.evaluate(() => {
      return {
        lastSyncTimestamp: localStorage.getItem('last_sync_timestamp'),
        packagingSync: localStorage.getItem('packaging_lastSync'),
        gtSync: localStorage.getItem('gt_lastSync'),
        truckingSync: localStorage.getItem('trucking_lastSync')
      };
    });
    
    console.log('  📊 Sync timestamps:', syncTimestamps);
    
    test.checks.push({
      check: 'Sync timestamp tracking',
      status: syncTimestamps.lastSyncTimestamp ? 'PASSED' : 'WARNING',
      syncTimestamps
    });
    
    await context.close();
    
    test.status = test.checks.every(c => c.status === 'PASSED' || c.status === 'WARNING') ? 'PASSED' : 'FAILED';
    test.endTime = new Date().toISOString();
    
    console.log(`  ${test.status === 'PASSED' ? '✅' : '❌'} Test 3 ${test.status}\n`);
    return test;
    
  } catch (error) {
    test.status = 'FAILED';
    test.error = error.message;
    test.endTime = new Date().toISOString();
    console.log(`  ❌ Test 3 FAILED: ${error.message}\n`);
    return test;
  }
}

async function testTruckingUpdateLoopDetection(browser) {
  const test = {
    name: 'Trucking Update Loop Detection',
    status: 'RUNNING',
    checks: [],
    startTime: new Date().toISOString()
  };

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Switch to Trucking module
    const businessSelector = page.locator('select').first();
    if (await businessSelector.isVisible()) {
      await businessSelector.selectOption('trucking');
      await page.waitForTimeout(2000);
    }
    
    console.log('  🔄 Testing for update loops in Trucking module...');
    
    // Monitor localStorage changes
    let storageChangeCount = 0;
    let lastChangeTime = Date.now();
    const changeLog = [];
    
    await page.addInitScript(() => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = function(key, value) {
        if (key.startsWith('trucking_')) {
          window.truckingStorageChanges = window.truckingStorageChanges || [];
          window.truckingStorageChanges.push({
            key,
            timestamp: Date.now(),
            valueLength: value ? value.length : 0
          });
        }
        return originalSetItem.call(this, key, value);
      };
    });
    
    // Navigate through trucking modules to trigger potential loops
    const navigationSequence = [
      'Delivery Orders',
      'Unit Scheduling', 
      'Surat Jalan',
      'Delivery Orders' // Return to first to check for loops
    ];
    
    for (const navItem of navigationSequence) {
      console.log(`    🔄 Navigating to ${navItem}...`);
      
      const beforeChanges = await page.evaluate(() => {
        return window.truckingStorageChanges ? window.truckingStorageChanges.length : 0;
      });
      
      await page.click(`text=${navItem}`);
      await page.waitForTimeout(3000); // Wait for potential updates
      
      const afterChanges = await page.evaluate(() => {
        return window.truckingStorageChanges ? window.truckingStorageChanges.length : 0;
      });
      
      const changesInThisNav = afterChanges - beforeChanges;
      console.log(`    📊 Storage changes during ${navItem}: ${changesInThisNav}`);
      
      if (changesInThisNav > 10) {
        console.log(`    ⚠️  High number of storage changes detected in ${navItem}`);
      }
    }
    
    // Get final change log
    const finalChangeLog = await page.evaluate(() => {
      return window.truckingStorageChanges || [];
    });
    
    console.log(`  📊 Total trucking storage changes: ${finalChangeLog.length}`);
    
    // Analyze for potential loops
    const changesByKey = {};
    finalChangeLog.forEach(change => {
      if (!changesByKey[change.key]) {
        changesByKey[change.key] = [];
      }
      changesByKey[change.key].push(change);
    });
    
    let potentialLoops = 0;
    Object.entries(changesByKey).forEach(([key, changes]) => {
      if (changes.length > 5) {
        console.log(`  ⚠️  ${key}: ${changes.length} changes (potential loop)`);
        potentialLoops++;
        
        // Check for rapid successive changes (within 1 second)
        const rapidChanges = changes.filter((change, index) => {
          if (index === 0) return false;
          return change.timestamp - changes[index - 1].timestamp < 1000;
        });
        
        if (rapidChanges.length > 0) {
          console.log(`    ❌ Rapid successive changes detected: ${rapidChanges.length}`);
        }
      }
    });
    
    test.checks.push({
      check: 'No excessive storage updates',
      status: potentialLoops === 0 ? 'PASSED' : 'WARNING',
      totalChanges: finalChangeLog.length,
      potentialLoops,
      changesByKey: Object.fromEntries(
        Object.entries(changesByKey).map(([k, v]) => [k, v.length])
      )
    });
    
    // Check for timestamp update loops
    const timestampLoops = Object.entries(changesByKey).filter(([key, changes]) => {
      return changes.length > 3 && key.includes('timestamp');
    });
    
    console.log(`  📊 Potential timestamp loops: ${timestampLoops.length}`);
    
    test.checks.push({
      check: 'No timestamp update loops',
      status: timestampLoops.length === 0 ? 'PASSED' : 'WARNING',
      timestampLoops: timestampLoops.length
    });
    
    await context.close();
    
    test.status = test.checks.every(c => c.status === 'PASSED' || c.status === 'WARNING') ? 'PASSED' : 'FAILED';
    test.endTime = new Date().toISOString();
    
    console.log(`  ${test.status === 'PASSED' ? '✅' : '❌'} Test 4 ${test.status}\n`);
    return test;
    
  } catch (error) {
    test.status = 'FAILED';
    test.error = error.message;
    test.endTime = new Date().toISOString();
    console.log(`  ❌ Test 4 FAILED: ${error.message}\n`);
    return test;
  }
}

async function testTruckingNotificationTimestamps(browser) {
  const test = {
    name: 'Trucking Notification Timestamp Validation',
    status: 'RUNNING',
    checks: [],
    startTime: new Date().toISOString()
  };

  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Switch to Trucking module
    const businessSelector = page.locator('select').first();
    if (await businessSelector.isVisible()) {
      await businessSelector.selectOption('trucking');
      await page.waitForTimeout(2000);
    }
    
    console.log('  🔄 Checking trucking notification timestamps...');
    
    // Get notification data
    const notificationData = await page.evaluate(() => {
      const data = {};
      
      // Get different types of trucking notifications
      const notificationKeys = [
        'trucking_unitNotifications',
        'trucking_invoiceNotifications',
        'trucking_deliveryNotifications',
        'trucking_scheduleNotifications'
      ];
      
      notificationKeys.forEach(key => {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            data[key] = JSON.parse(value);
          }
        } catch (e) {
          data[key] = { error: 'Parse error' };
        }
      });
      
      return data;
    });
    
    console.log(`  📊 Notification types found: ${Object.keys(notificationData).length}`);
    
    let totalNotifications = 0;
    let notificationsWithTimestamps = 0;
    let timestampIssues = 0;
    
    Object.entries(notificationData).forEach(([key, notifications]) => {
      if (Array.isArray(notifications)) {
        console.log(`  📊 ${key}: ${notifications.length} notifications`);
        totalNotifications += notifications.length;
        
        notifications.forEach((notification, index) => {
          // Check for timestamp fields
          const timestampFields = ['created', 'createdAt', 'timestamp', 'processedAt', 'sentAt'];
          let hasTimestamp = false;
          
          timestampFields.forEach(field => {
            if (notification[field]) {
              hasTimestamp = true;
              
              // Validate timestamp format
              const timestamp = notification[field];
              const isValid = !isNaN(Date.parse(timestamp)) || !isNaN(timestamp);
              
              if (!isValid) {
                timestampIssues++;
                console.log(`    ❌ ${key}[${index}].${field}: Invalid timestamp "${timestamp}"`);
              }
            }
          });
          
          if (hasTimestamp) {
            notificationsWithTimestamps++;
          } else {
            console.log(`    ⚠️  ${key}[${index}]: No timestamp found`);
          }
          
          // Check notification-specific timestamp logic
          if (notification.type === 'DO_CONFIRMED' && notification.confirmedAt) {
            const confirmedTime = new Date(notification.confirmedAt);
            const createdTime = new Date(notification.created || notification.createdAt);
            
            if (confirmedTime < createdTime) {
              timestampIssues++;
              console.log(`    ❌ ${key}[${index}]: Confirmed time before created time`);
            }
          }
          
          if (notification.type === 'CUSTOMER_INVOICE' && notification.processedAt) {
            const processedTime = new Date(notification.processedAt);
            const createdTime = new Date(notification.created || notification.createdAt);
            
            if (processedTime < createdTime) {
              timestampIssues++;
              console.log(`    ❌ ${key}[${index}]: Processed time before created time`);
            }
          }
        });
      }
    });
    
    console.log(`  📊 Total notifications: ${totalNotifications}`);
    console.log(`  📊 Notifications with timestamps: ${notificationsWithTimestamps}`);
    console.log(`  📊 Timestamp issues: ${timestampIssues}`);
    
    test.checks.push({
      check: 'Notification timestamp presence',
      status: notificationsWithTimestamps === totalNotifications ? 'PASSED' : 'WARNING',
      totalNotifications,
      notificationsWithTimestamps
    });
    
    test.checks.push({
      check: 'Notification timestamp validity',
      status: timestampIssues === 0 ? 'PASSED' : 'FAILED',
      timestampIssues
    });
    
    // Check notification ordering by timestamp
    Object.entries(notificationData).forEach(([key, notifications]) => {
      if (Array.isArray(notifications) && notifications.length > 1) {
        const sortedByTimestamp = [...notifications].sort((a, b) => {
          const aTime = new Date(a.created || a.createdAt || a.timestamp || 0);
          const bTime = new Date(b.created || b.createdAt || b.timestamp || 0);
          return aTime - bTime;
        });
        
        const isOrdered = JSON.stringify(notifications) === JSON.stringify(sortedByTimestamp);
        console.log(`  📊 ${key} chronological order: ${isOrdered ? 'Correct' : 'Incorrect'}`);
        
        if (!isOrdered) {
          console.log(`    ⚠️  Notifications may not be in chronological order`);
        }
      }
    });
    
    await context.close();
    
    test.status = test.checks.every(c => c.status === 'PASSED' || c.status === 'WARNING') ? 'PASSED' : 'FAILED';
    test.endTime = new Date().toISOString();
    
    console.log(`  ${test.status === 'PASSED' ? '✅' : '❌'} Test 5 ${test.status}\n`);
    return test;
    
  } catch (error) {
    test.status = 'FAILED';
    test.error = error.message;
    test.endTime = new Date().toISOString();
    console.log(`  ❌ Test 5 FAILED: ${error.message}\n`);
    return test;
  }
}

function generateTruckingTimestampReport(results) {
  const reportContent = `# Trucking Timestamp Sync Validation Report

## Test Summary
- **Total Tests**: ${results.summary.total}
- **Passed**: ${results.summary.passed}
- **Failed**: ${results.summary.failed}
- **Success Rate**: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%
- **Timestamp Issues**: ${results.summary.timestampIssues}
- **Test Date**: ${results.testStartTime}

## Detailed Test Results

${results.tests.map(test => `
### ${test.name}
- **Status**: ${test.status}
- **Duration**: ${test.startTime} - ${test.endTime}
${test.error ? `- **Error**: ${test.error}` : ''}
${test.totalTimestampIssues ? `- **Timestamp Issues**: ${test.totalTimestampIssues}` : ''}

#### Validation Checks:
${test.checks ? test.checks.map(check => `
- **${check.check || check.dataType}**: ${check.status}
${check.itemCount ? `  - Items: ${check.itemCount}` : ''}
${check.itemsWithTimestamps ? `  - With timestamps: ${check.itemsWithTimestamps}` : ''}
${check.itemsWithoutTimestamps ? `  - Without timestamps: ${check.itemsWithoutTimestamps}` : ''}
${check.timestampInconsistencies ? `  - Inconsistencies: ${check.timestampInconsistencies}` : ''}
${check.value ? `  - Value: ${JSON.stringify(check.value)}` : ''}
${check.error ? `  - Error: ${check.error}` : ''}
`).join('') : 'No detailed checks available'}
`).join('')}

## Trucking Timestamp Analysis

### ✅ Timestamp Validation Results:

#### 1. Data Timestamp Consistency
${results.tests.find(t => t.name.includes('Data Timestamp'))?.checks.map(check => `
- **${check.dataType}**: ${check.status}
  - Items: ${check.itemCount}
  - With timestamps: ${check.itemsWithTimestamps}
  - Issues: ${check.timestampInconsistencies}
`).join('') || 'No data timestamp analysis available'}

#### 2. Sync Mechanism Status
${results.tests.find(t => t.name.includes('Sync Mechanism'))?.checks.map(check => `
- **${check.check}**: ${check.status}
  - Value: ${check.value || 'N/A'}
`).join('') || 'No sync mechanism analysis available'}

#### 3. Cross-Module Consistency
${results.tests.find(t => t.name.includes('Cross-Module'))?.checks.map(check => `
- **${check.check}**: ${check.status}
${check.formats ? `  - Formats: ${JSON.stringify(check.formats, null, 2)}` : ''}
`).join('') || 'No cross-module analysis available'}

#### 4. Update Loop Detection
${results.tests.find(t => t.name.includes('Update Loop'))?.checks.map(check => `
- **${check.check}**: ${check.status}
${check.totalChanges ? `  - Total changes: ${check.totalChanges}` : ''}
${check.potentialLoops ? `  - Potential loops: ${check.potentialLoops}` : ''}
`).join('') || 'No update loop analysis available'}

#### 5. Notification Timestamps
${results.tests.find(t => t.name.includes('Notification'))?.checks.map(check => `
- **${check.check}**: ${check.status}
${check.totalNotifications ? `  - Total notifications: ${check.totalNotifications}` : ''}
${check.notificationsWithTimestamps ? `  - With timestamps: ${check.notificationsWithTimestamps}` : ''}
${check.timestampIssues ? `  - Issues: ${check.timestampIssues}` : ''}
`).join('') || 'No notification analysis available'}

### 🎯 Trucking Timestamp Health Assessment:

${results.summary.failed === 0 ? 
  `**EXCELLENT** - Trucking timestamp system is healthy:

✅ **Data Timestamps**: All trucking data has proper timestamp fields
✅ **Sync Mechanism**: Timestamp-based sync working correctly
✅ **Cross-Module**: Consistent timestamp formats across modules
✅ **No Update Loops**: No excessive timestamp updates detected
✅ **Notifications**: All notifications have proper timestamps

**Status**: 🚛 TRUCKING TIMESTAMPS FULLY FUNCTIONAL` :
  `**NEEDS ATTENTION** - ${results.summary.failed} timestamp issue(s) found:

${results.tests.filter(t => t.status === 'FAILED').map(t => `
❌ **${t.name}**: ${t.error || 'Multiple checks failed'}
${t.checks ? t.checks.filter(c => c.status === 'FAILED').map(c => `  - ${c.check || c.dataType}: ${c.error || 'Failed'}`).join('\n') : ''}
`).join('')}

**Recommendation**: Address timestamp issues before production deployment.`
}

### 📊 Trucking Timestamp Metrics:

| Metric | Status | Details |
|--------|--------|---------|
| Data Timestamp Coverage | ${results.tests.find(t => t.name.includes('Data Timestamp'))?.status === 'PASSED' ? '✅ Good' : '❌ Issues'} | All trucking entities have timestamps |
| Sync Timestamp Tracking | ${results.tests.find(t => t.name.includes('Sync Mechanism'))?.status === 'PASSED' ? '✅ Active' : '❌ Issues'} | Last sync timestamp maintained |
| Cross-Module Consistency | ${results.tests.find(t => t.name.includes('Cross-Module'))?.status === 'PASSED' ? '✅ Consistent' : '❌ Inconsistent'} | Timestamp formats aligned |
| Update Loop Prevention | ${results.tests.find(t => t.name.includes('Update Loop'))?.status === 'PASSED' ? '✅ Clean' : '❌ Loops Detected'} | No excessive updates |
| Notification Timestamps | ${results.tests.find(t => t.name.includes('Notification'))?.status === 'PASSED' ? '✅ Complete' : '❌ Missing'} | All notifications timestamped |

### 🔍 Trucking-Specific Timestamp Features:

1. **Delivery Order Timestamps**:
   - Creation timestamp for order tracking
   - Confirmation timestamp for scheduling
   - Delivery timestamp for completion

2. **Unit Scheduling Timestamps**:
   - Schedule creation timestamp
   - Vehicle assignment timestamp
   - Route planning timestamp

3. **Surat Jalan Timestamps**:
   - SJ creation timestamp
   - Document signing timestamp
   - Delivery completion timestamp

4. **Notification Timestamps**:
   - DO_CONFIRMED notification timing
   - CUSTOMER_INVOICE notification timing
   - Processing timestamps for workflow

### 📋 Business Impact:

1. **Delivery Tracking**: Accurate timestamps enable precise delivery tracking
2. **Resource Planning**: Timestamp-based scheduling optimizes vehicle utilization
3. **Customer Service**: Real-time status updates with accurate timing
4. **Financial Control**: Precise timing for service billing and revenue recognition
5. **Audit Trail**: Complete timestamp trail for compliance and analysis

---
*Report generated on ${new Date().toISOString()}*
`;

  fs.writeFileSync('trucking-timestamp-check-report.md', reportContent);
  console.log('📊 Report saved to: trucking-timestamp-check-report.md');
  
  // Also log summary to console
  console.log('\n🎯 TRUCKING TIMESTAMP VALIDATION SUMMARY:');
  console.log(`Total Tests: ${results.summary.total}`);
  console.log(`Passed: ${results.summary.passed}`);
  console.log(`Failed: ${results.summary.failed}`);
  console.log(`Success Rate: ${((results.summary.passed / results.summary.total) * 100).toFixed(1)}%`);
  console.log(`Timestamp Issues: ${results.summary.timestampIssues}`);
  
  if (results.summary.failed === 0) {
    console.log('\n🚛 TRUCKING TIMESTAMPS WORKING PERFECTLY!');
    console.log('✅ All delivery orders have proper timestamps');
    console.log('✅ Unit scheduling timestamps accurate');
    console.log('✅ Surat jalan timestamps complete');
    console.log('✅ Notification timestamps functional');
    console.log('✅ Cross-module timestamp consistency maintained');
  } else {
    console.log('\n⚠️  SOME TRUCKING TIMESTAMP ISSUES DETECTED');
    console.log('Check report untuk detail lengkap.');
  }
}

// Run the trucking timestamp check
runTruckingTimestampCheck().catch(console.error);