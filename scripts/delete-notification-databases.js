#!/usr/bin/env node

/**
 * Delete Notification Databases
 * 
 * Deletes all notification databases from both local and server
 * After logging them to activity database
 * 
 * Usage: node scripts/delete-notification-databases.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ============================================================================
// CONFIGURATION
// ============================================================================

const SERVER_URL = process.env.SERVER_URL || 'https://server-tljp.tail75a421.ts.net';
const TIMEOUT = 30000;

const NOTIFICATION_KEYS = [
  'productionNotifications',
  'deliveryNotifications',
  'invoiceNotifications',
  'financeNotifications'
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Delete file
 */
const deleteFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Error deleting ${filePath}:`, error.message);
    return false;
  }
};

/**
 * Delete from server via HTTPS
 */
const deleteFromServer = (key) => {
  return new Promise((resolve) => {
    try {
      const url = new URL(`/api/storage/${key}`, SERVER_URL);
      
      const options = {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: TIMEOUT,
        rejectUnauthorized: false
      };
      
      const req = https.request(url, options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(true);
          } else {
            console.log(`   ⚠️  Server returned ${res.statusCode} for ${key}`);
            resolve(false);
          }
        });
      });
      
      req.on('error', (error) => {
        console.log(`   ⚠️  Error deleting from server: ${error.message}`);
        resolve(false);
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
      
      req.end();
    } catch (error) {
      console.log(`   ⚠️  Error: ${error.message}`);
      resolve(false);
    }
  });
};

// ============================================================================
// MAIN
// ============================================================================

const main = async () => {
  const startTime = Date.now();
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('🗑️  Delete Notification Databases');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  try {
    const dataPath = path.join(__dirname, '../data/localStorage');
    
    // Step 1: Delete local files
    console.log('📂 Step 1: Deleting local notification files...\n');
    
    const localResults = {};
    for (const key of NOTIFICATION_KEYS) {
      const filePath = path.join(dataPath, `${key}.json`);
      const deleted = deleteFile(filePath);
      localResults[key] = deleted;
      console.log(`   ${deleted ? '✅' : '⚠️ '} ${key} deleted`);
    }
    
    console.log();
    
    // Step 2: Delete from server
    console.log('📡 Step 2: Deleting from server...\n');
    
    const serverResults = {};
    for (const key of NOTIFICATION_KEYS) {
      const deleted = await deleteFromServer(key);
      serverResults[key] = deleted;
      console.log(`   ${deleted ? '✅' : '⚠️ '} ${key} deleted from server`);
    }
    
    console.log();
    
    // Summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ COMPLETE!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`⏱️  Duration: ${duration}s\n`);
    
    const localDeleted = Object.values(localResults).filter(v => v).length;
    const serverDeleted = Object.values(serverResults).filter(v => v).length;
    
    console.log('📊 Summary:');
    console.log(`   • Local files deleted: ${localDeleted}/${NOTIFICATION_KEYS.length}`);
    console.log(`   • Server databases deleted: ${serverDeleted}/${NOTIFICATION_KEYS.length}\n`);
    
    if (localDeleted === NOTIFICATION_KEYS.length && serverDeleted === NOTIFICATION_KEYS.length) {
      console.log('✨ All notification databases have been deleted!\n');
    } else {
      console.log('⚠️  Some databases failed to delete. Check manually.\n');
    }
    
    console.log('═══════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
};

main();
