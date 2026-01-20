#!/usr/bin/env node

/**
 * Debug Activity Logs Cross-Device Sync Issue
 * 
 * Masalah: Activity logs dari device lain tidak muncul di SuperAdmin
 * Kemungkinan penyebab:
 * 1. activityLogs tidak sync ke server
 * 2. Storage key salah atau tidak konsisten
 * 3. Force reload mechanism belum diterapkan
 * 4. Business context prefix issue
 */

const fs = require('fs');

console.log('🔍 Debugging Activity Logs Cross-Device Sync Issue');
console.log('='.repeat(60));

// Check local activity logs file
const activityLogsPaths = [
  'data/localStorage/activityLogs.json',
  'data/localStorage/packaging/activityLogs.json', 
  'data/localStorage/general-trading/activityLogs.json',
  'data/localStorage/trucking/activityLogs.json'
];

console.log('📁 Checking local activity logs files...');
for (const path of activityLogsPaths) {
  if (fs.existsSync(path)) {
    try {
      const data = JSON.parse(fs.readFileSync(path, 'utf8'));
      const logs = Array.isArray(data) ? data : (data.value || []);
      console.log(`✅ ${path}: ${logs.length} logs found`);
      
      if (logs.length > 0) {
        console.log(`   Latest: ${logs[0]?.action || 'N/A'} by ${logs[0]?.username || 'N/A'} at ${logs[0]?.timestamp || 'N/A'}`);
      }
    } catch (error) {
      console.log(`❌ ${path}: Invalid JSON - ${error.message}`);
    }
  } else {
    console.log(`⚠️  ${path}: File not found`);
  }
}

console.log();

// Check SuperAdmin implementation
console.log('🔍 Checking SuperAdmin activity logs loading...');
const superAdminPath = 'src/pages/SuperAdmin/SuperAdmin.tsx';

if (fs.existsSync(superAdminPath)) {
  const content = fs.readFileSync(superAdminPath, 'utf8');
  
  // Check storage key used
  const storageKeyMatch = content.match(/storageService\.get<ActivityLog\[\]>\('([^']+)'\)/);
  const storageKey = storageKeyMatch ? storageKeyMatch[1] : 'NOT FOUND';
  console.log(`📋 Storage key used: ${storageKey}`);
  
  // Check if force reload is implemented
  const hasForceReload = content.includes('forceReloadFromFile');
  console.log(`🔄 Force reload mechanism: ${hasForceReload ? '✅' : '❌'}`);
  
  // Check business context handling
  const hasBusinessContext = content.includes('getBusinessContext') || content.includes('business');
  console.log(`🏢 Business context handling: ${hasBusinessContext ? '✅' : '❌'}`);
  
  // Check storage change listener
  const hasStorageListener = content.includes('app-storage-changed');
  console.log(`👂 Storage change listener: ${hasStorageListener ? '✅' : '❌'}`);
  
} else {
  console.log(`❌ SuperAdmin file not found: ${superAdminPath}`);
}

console.log();

// Check activity logger implementation
console.log('🔍 Checking Activity Logger implementation...');
const activityLoggerPath = 'src/utils/activity-logger.ts';

if (fs.existsSync(activityLoggerPath)) {
  const content = fs.readFileSync(activityLoggerPath, 'utf8');
  
  // Check storage key used for saving
  const saveKeyMatch = content.match(/storageService\.set\('([^']+)'/);
  const saveKey = saveKeyMatch ? saveKeyMatch[1] : 'NOT FOUND';
  console.log(`💾 Save storage key: ${saveKey}`);
  
  // Check if using storageService (should sync)
  const usesStorageService = content.includes('storageService.set');
  console.log(`🔄 Uses storageService: ${usesStorageService ? '✅' : '❌'}`);
  
  // Check business context in save
  const saveHasBusinessContext = content.includes('getBusinessContext') || saveKey.includes('/');
  console.log(`🏢 Business context in save: ${saveHasBusinessContext ? '✅' : '❌'}`);
  
} else {
  console.log(`❌ Activity Logger file not found: ${activityLoggerPath}`);
}

console.log();

// Check storage service business context handling
console.log('🔍 Checking Storage Service business context...');
const storagePath = 'src/services/storage.ts';

if (fs.existsSync(storagePath)) {
  const content = fs.readFileSync(storagePath, 'utf8');
  
  // Check getStorageKey method
  const hasGetStorageKey = content.includes('getStorageKey');
  console.log(`🔑 getStorageKey method: ${hasGetStorageKey ? '✅' : '❌'}`);
  
  // Check business context logic
  const hasBusinessLogic = content.includes('getBusinessContext');
  console.log(`🏢 Business context logic: ${hasBusinessLogic ? '✅' : '❌'}`);
  
  // Check if activityLogs gets business prefix
  const activityLogsHandling = content.includes('activityLogs') ? 'MENTIONED' : 'NOT MENTIONED';
  console.log(`📋 activityLogs handling: ${activityLogsHandling}`);
  
} else {
  console.log(`❌ Storage service file not found: ${storagePath}`);
}

console.log();

// Analysis and recommendations
console.log('📊 Analysis & Recommendations');
console.log('='.repeat(40));

console.log('🔍 Possible Issues:');
console.log('1. activityLogs might be getting business prefix (packaging/activityLogs, general-trading/activityLogs)');
console.log('2. SuperAdmin might not be reading from all business contexts');
console.log('3. Force reload mechanism not implemented for activityLogs');
console.log('4. Storage key inconsistency between save and load');

console.log();
console.log('💡 Solutions to try:');
console.log('1. Check if activityLogs should be global (no business prefix)');
console.log('2. Implement force reload mechanism in SuperAdmin');
console.log('3. Make SuperAdmin read from all business contexts');
console.log('4. Ensure consistent storage key usage');

console.log();
console.log('🧪 Next steps:');
console.log('1. Check actual storage keys being used');
console.log('2. Verify server has activityLogs data');
console.log('3. Test cross-device activity logging');
console.log('4. Implement proper sync mechanism');