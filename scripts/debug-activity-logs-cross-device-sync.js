#!/usr/bin/env node

/**
 * Debug Activity Logs Cross-Device Sync Issue
 * 
 * Masalah: Activity logs dari device lain tidak sync ke device ini
 * Kemungkinan penyebab:
 * 1. activityLogs tidak di-sync ke server (hanya local)
 * 2. Force reload mechanism belum diterapkan untuk activityLogs
 * 3. Server sync disabled untuk activityLogs
 * 4. Storage service tidak handle activityLogs sync
 */

const fs = require('fs');

console.log('🔍 Debugging Activity Logs Cross-Device Sync');
console.log('='.repeat(50));

// Check storage service configuration
console.log('📋 1. Checking Storage Service Configuration...');
const storagePath = 'src/services/storage.ts';

if (fs.existsSync(storagePath)) {
  const content = fs.readFileSync(storagePath, 'utf8');
  
  // Check if activityLogs is mentioned in storage service
  const mentionsActivityLogs = content.includes('activityLogs');
  console.log(`   activityLogs mentioned: ${mentionsActivityLogs ? '✅' : '❌'}`);
  
  // Check server sync configuration
  const hasServerSync = content.includes('type: \'server\'');
  console.log(`   Server sync available: ${hasServerSync ? '✅' : '❌'}`);
  
  // Check if there's special handling for logs
  const hasLogHandling = content.includes('Log') || content.includes('activity');
  console.log(`   Log handling: ${hasLogHandling ? '✅' : '❌'}`);
  
} else {
  console.log('   ❌ Storage service file not found');
}

console.log();

// Check SuperAdmin force reload implementation
console.log('📋 2. Checking SuperAdmin Force Reload...');
const superAdminPath = 'src/pages/SuperAdmin/SuperAdmin.tsx';

if (fs.existsSync(superAdminPath)) {
  const content = fs.readFileSync(superAdminPath, 'utf8');
  
  // Check if force reload is implemented for activity logs
  const hasForceReload = content.includes('forceReloadFromFile');
  console.log(`   Force reload mechanism: ${hasForceReload ? '✅' : '❌'}`);
  
  // Check if it reads from multiple business contexts
  const readsMultipleContexts = content.includes('general-trading') && content.includes('trucking');
  console.log(`   Reads multiple contexts: ${readsMultipleContexts ? '✅' : '❌'}`);
  
  // Check storage change listener
  const hasStorageListener = content.includes('app-storage-changed');
  console.log(`   Storage change listener: ${hasStorageListener ? '✅' : '❌'}`);
  
} else {
  console.log('   ❌ SuperAdmin file not found');
}

console.log();

// Check activity logger sync behavior
console.log('📋 3. Checking Activity Logger Sync Behavior...');
const activityLoggerPath = 'src/utils/activity-logger.ts';

if (fs.existsSync(activityLoggerPath)) {
  const content = fs.readFileSync(activityLoggerPath, 'utf8');
  
  // Check if uses storageService (should sync to server)
  const usesStorageService = content.includes('storageService.set');
  console.log(`   Uses storageService: ${usesStorageService ? '✅' : '❌'}`);
  
  // Check if uses localStorage directly (won't sync)
  const usesLocalStorage = content.includes('localStorage.setItem');
  console.log(`   Uses localStorage directly: ${usesLocalStorage ? '❌' : '✅'}`);
  
  // Check storage key used
  const storageKeyMatch = content.match(/storageService\.set\('([^']+)'/);
  const storageKey = storageKeyMatch ? storageKeyMatch[1] : 'NOT FOUND';
  console.log(`   Storage key: ${storageKey}`);
  
} else {
  console.log('   ❌ Activity logger file not found');
}

console.log();

// Check server data for activity logs
console.log('📋 4. Checking Server Data Availability...');

// Check if server has activity logs data
const serverDataPaths = [
  'data/activityLogs.json',
  'data/packaging/activityLogs.json',
  'data/general-trading/activityLogs.json', 
  'data/trucking/activityLogs.json'
];

let serverHasData = false;
for (const path of serverDataPaths) {
  if (fs.existsSync(path)) {
    try {
      const data = JSON.parse(fs.readFileSync(path, 'utf8'));
      const logs = Array.isArray(data) ? data : (data.value || []);
      if (logs.length > 0) {
        console.log(`   ✅ ${path}: ${logs.length} logs`);
        serverHasData = true;
      } else {
        console.log(`   ⚠️  ${path}: Empty`);
      }
    } catch (error) {
      console.log(`   ❌ ${path}: Invalid JSON`);
    }
  }
}

if (!serverHasData) {
  console.log('   ❌ No activity logs found in server data folder');
}

console.log();

// Check local vs server comparison
console.log('📋 5. Local vs Server Data Comparison...');

const localPaths = [
  { name: 'Packaging', path: 'data/localStorage/activityLogs.json' },
  { name: 'GT', path: 'data/localStorage/general-trading/activityLogs.json' },
  { name: 'Trucking', path: 'data/localStorage/trucking/activityLogs.json' }
];

for (const { name, path } of localPaths) {
  if (fs.existsSync(path)) {
    try {
      const data = JSON.parse(fs.readFileSync(path, 'utf8'));
      const logs = Array.isArray(data) ? data : (data.value || []);
      
      if (logs.length > 0) {
        const latest = logs[0];
        const deviceId = latest.details?.deviceId || 'unknown';
        const isFromThisDevice = deviceId === 'unknown' || deviceId.includes('local');
        
        console.log(`   ${name}: ${logs.length} logs (Device: ${deviceId}) ${isFromThisDevice ? '📱' : '🌐'}`);
      } else {
        console.log(`   ${name}: No logs`);
      }
    } catch (error) {
      console.log(`   ${name}: Error reading - ${error.message}`);
    }
  } else {
    console.log(`   ${name}: File not found`);
  }
}

console.log();

// Analysis and recommendations
console.log('📊 Root Cause Analysis');
console.log('='.repeat(30));

console.log('🔍 Possible Issues:');
console.log('1. ❌ Activity logs may not be syncing to server');
console.log('2. ❌ SuperAdmin may not have force reload for activity logs');
console.log('3. ❌ Cross-device sync mechanism not working for logs');
console.log('4. ❌ Storage service may treat logs as local-only data');

console.log();
console.log('💡 Solutions Required:');
console.log('1. ✅ Add force reload mechanism to SuperAdmin for activity logs');
console.log('2. ✅ Ensure activity logs sync to server (not just localStorage)');
console.log('3. ✅ Make SuperAdmin read from all business contexts');
console.log('4. ✅ Test cross-device activity logging and sync');

console.log();
console.log('🛠️  Implementation Priority:');
console.log('1. 🚀 HIGH: Add force reload to SuperAdmin activity logs');
console.log('2. 🚀 HIGH: Read from all business contexts in SuperAdmin');
console.log('3. 🔄 MED: Verify server sync for activity logs');
console.log('4. 🧪 LOW: Add device identification in activity logs');