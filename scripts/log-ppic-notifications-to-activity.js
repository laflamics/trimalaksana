#!/usr/bin/env node

/**
 * Log PPIC Notifications to Activity Database
 * 
 * Reads all PPIC notifications and logs them to activity logs
 * so they can be tracked and deleted from database
 * 
 * Usage: node scripts/log-ppic-notifications-to-activity.js
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate unique ID
 */
const generateId = (prefix = '') => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
};

/**
 * Load JSON file
 */
const loadJSON = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed === 'object' && 'value' in parsed && Array.isArray(parsed.value)) {
      return parsed.value;
    }
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    return [];
  }
};

/**
 * Save JSON file with wrapped format
 */
const saveJSON = (filePath, data) => {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const wrappedData = {
      value: Array.isArray(data) ? data : [data],
      timestamp: Date.now(),
      _timestamp: Date.now()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(wrappedData, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(`Error saving ${filePath}:`, error.message);
    return false;
  }
};

// ============================================================================
// MAIN
// ============================================================================

const main = async () => {
  const startTime = Date.now();
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('📋 Log PPIC Notifications to Activity Database');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    const dataPath = path.join(__dirname, '../data/localStorage');
    
    // Step 1: Load all notification types
    console.log('📚 Step 1: Loading notifications...\n');
    
    const productionNotifications = loadJSON(path.join(dataPath, 'productionNotifications.json'));
    const deliveryNotifications = loadJSON(path.join(dataPath, 'deliveryNotifications.json'));
    const invoiceNotifications = loadJSON(path.join(dataPath, 'invoiceNotifications.json'));
    const financeNotifications = loadJSON(path.join(dataPath, 'financeNotifications.json'));
    
    console.log(`   ✅ Production Notifications: ${productionNotifications.length}`);
    console.log(`   ✅ Delivery Notifications: ${deliveryNotifications.length}`);
    console.log(`   ✅ Invoice Notifications: ${invoiceNotifications.length}`);
    console.log(`   ✅ Finance Notifications: ${financeNotifications.length}\n`);
    
    const totalNotifications = productionNotifications.length + 
                               deliveryNotifications.length + 
                               invoiceNotifications.length + 
                               financeNotifications.length;
    
    console.log(`   📊 Total Notifications: ${totalNotifications}\n`);
    
    // Step 2: Load existing activity logs
    console.log('📖 Step 2: Loading existing activity logs...');
    const activityLogs = loadJSON(path.join(dataPath, 'activityLogs.json'));
    console.log(`   ✅ Existing logs: ${activityLogs.length}\n`);
    
    // Step 3: Create activity log entries for each notification
    console.log('✍️  Step 3: Creating activity log entries...\n');
    
    let newLogsCount = 0;
    
    // Production Notifications
    for (const notif of productionNotifications) {
      const logEntry = {
        id: generateId('log'),
        action: 'PPIC_NOTIFICATION',
        type: 'PRODUCTION',
        module: 'PPIC',
        description: `Production notification: ${notif.message || notif.type || 'Unknown'}`,
        reference: notif.spkNo || notif.id || '',
        referenceType: 'SPK',
        user: 'SYSTEM',
        timestamp: notif.timestamp || Date.now(),
        _timestamp: notif._timestamp || Date.now(),
        metadata: {
          notificationType: 'PRODUCTION',
          originalNotificationId: notif.id,
          status: notif.status || 'PENDING',
          message: notif.message || '',
          spkNo: notif.spkNo || ''
        }
      };
      activityLogs.push(logEntry);
      newLogsCount++;
    }
    
    console.log(`   ✅ Logged ${productionNotifications.length} production notifications`);
    
    // Delivery Notifications
    for (const notif of deliveryNotifications) {
      const logEntry = {
        id: generateId('log'),
        action: 'PPIC_NOTIFICATION',
        type: 'DELIVERY',
        module: 'PPIC',
        description: `Delivery notification: ${notif.message || notif.type || 'Unknown'}`,
        reference: notif.deliveryNo || notif.id || '',
        referenceType: 'DELIVERY',
        user: 'SYSTEM',
        timestamp: notif.timestamp || Date.now(),
        _timestamp: notif._timestamp || Date.now(),
        metadata: {
          notificationType: 'DELIVERY',
          originalNotificationId: notif.id,
          status: notif.status || 'PENDING',
          message: notif.message || '',
          deliveryNo: notif.deliveryNo || ''
        }
      };
      activityLogs.push(logEntry);
      newLogsCount++;
    }
    
    console.log(`   ✅ Logged ${deliveryNotifications.length} delivery notifications`);
    
    // Invoice Notifications
    for (const notif of invoiceNotifications) {
      const logEntry = {
        id: generateId('log'),
        action: 'PPIC_NOTIFICATION',
        type: 'INVOICE',
        module: 'PPIC',
        description: `Invoice notification: ${notif.message || notif.type || 'Unknown'}`,
        reference: notif.invoiceNo || notif.id || '',
        referenceType: 'INVOICE',
        user: 'SYSTEM',
        timestamp: notif.timestamp || Date.now(),
        _timestamp: notif._timestamp || Date.now(),
        metadata: {
          notificationType: 'INVOICE',
          originalNotificationId: notif.id,
          status: notif.status || 'PENDING',
          message: notif.message || '',
          invoiceNo: notif.invoiceNo || ''
        }
      };
      activityLogs.push(logEntry);
      newLogsCount++;
    }
    
    console.log(`   ✅ Logged ${invoiceNotifications.length} invoice notifications`);
    
    // Finance Notifications
    for (const notif of financeNotifications) {
      const logEntry = {
        id: generateId('log'),
        action: 'PPIC_NOTIFICATION',
        type: 'FINANCE',
        module: 'PPIC',
        description: `Finance notification: ${notif.message || notif.type || 'Unknown'}`,
        reference: notif.reference || notif.id || '',
        referenceType: 'FINANCE',
        user: 'SYSTEM',
        timestamp: notif.timestamp || Date.now(),
        _timestamp: notif._timestamp || Date.now(),
        metadata: {
          notificationType: 'FINANCE',
          originalNotificationId: notif.id,
          status: notif.status || 'PENDING',
          message: notif.message || '',
          reference: notif.reference || ''
        }
      };
      activityLogs.push(logEntry);
      newLogsCount++;
    }
    
    console.log(`   ✅ Logged ${financeNotifications.length} finance notifications\n`);
    
    // Step 4: Save updated activity logs
    console.log('💾 Step 4: Saving activity logs...');
    const saved = saveJSON(path.join(dataPath, 'activityLogs.json'), activityLogs);
    console.log(`   ${saved ? '✅' : '❌'} Activity logs saved\n`);
    
    // Step 5: Clear notification databases
    console.log('🗑️  Step 5: Clearing notification databases...\n');
    
    const cleared = {
      production: saveJSON(path.join(dataPath, 'productionNotifications.json'), []),
      delivery: saveJSON(path.join(dataPath, 'deliveryNotifications.json'), []),
      invoice: saveJSON(path.join(dataPath, 'invoiceNotifications.json'), []),
      finance: saveJSON(path.join(dataPath, 'financeNotifications.json'), [])
    };
    
    console.log(`   ${cleared.production ? '✅' : '❌'} Production notifications cleared`);
    console.log(`   ${cleared.delivery ? '✅' : '❌'} Delivery notifications cleared`);
    console.log(`   ${cleared.invoice ? '✅' : '❌'} Invoice notifications cleared`);
    console.log(`   ${cleared.finance ? '✅' : '❌'} Finance notifications cleared\n`);
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏱️  Duration: ${duration}s\n`);
    
    console.log('📊 Summary:');
    console.log(`   • Notifications logged: ${newLogsCount}`);
    console.log(`   • Total activity logs: ${activityLogs.length}`);
    console.log(`   • Notification databases: CLEARED\n`);
    
    console.log('✨ All PPIC notifications have been logged to activity database!');
    console.log('   You can now delete the notification databases safely.\n');
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
};

main();
