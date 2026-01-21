#!/usr/bin/env node

/**
 * Test Activity Logs Server Sync
 * 
 * Test apakah activity logs seharusnya sync ke server atau memang local-only
 */

const fs = require('fs');

console.log('🧪 Testing Activity Logs Server Sync Behavior');
console.log('='.repeat(50));

// Check what other data is synced to server
console.log('📊 Comparing with other synced data...');

const localFiles = fs.readdirSync('data/localStorage/').filter(f => f.endsWith('.json'));
const serverFiles = fs.readdirSync('data/').filter(f => f.endsWith('.json'));

console.log(`Local files: ${localFiles.length}`);
console.log(`Server files: ${serverFiles.length}`);

// Find files that exist in both local and server
const syncedFiles = localFiles.filter(file => serverFiles.includes(file));
const localOnlyFiles = localFiles.filter(file => !serverFiles.includes(file));

console.log();
console.log('✅ Files that sync to server:');
syncedFiles.slice(0, 10).forEach(file => {
  console.log(`   ${file}`);
});

console.log();
console.log('❌ Files that are local-only:');
localOnlyFiles.slice(0, 10).forEach(file => {
  console.log(`   ${file}`);
});

// Check if activityLogs is in local-only
const activityLogsIsLocalOnly = localOnlyFiles.includes('activityLogs.json');
console.log();
console.log(`📋 activityLogs.json is local-only: ${activityLogsIsLocalOnly ? '✅' : '❌'}`);

// Check business-specific activity logs
console.log();
console.log('🏢 Business-specific activity logs:');

const businessFolders = ['general-trading', 'trucking'];
for (const business of businessFolders) {
  const localPath = `data/localStorage/${business}/`;
  const serverPath = `data/${business}/`;
  
  if (fs.existsSync(localPath)) {
    const hasLocalActivityLogs = fs.existsSync(`${localPath}activityLogs.json`);
    const hasServerActivityLogs = fs.existsSync(`${serverPath}activityLogs.json`);
    
    console.log(`   ${business}:`);
    console.log(`     Local:  ${hasLocalActivityLogs ? '✅' : '❌'}`);
    console.log(`     Server: ${hasServerActivityLogs ? '✅' : '❌'}`);
  }
}

console.log();
console.log('🔍 Analysis:');
console.log('-'.repeat(30));

if (activityLogsIsLocalOnly) {
  console.log('❌ Activity logs are currently LOCAL-ONLY');
  console.log('❌ This explains why cross-device sync doesn\'t work');
  console.log('❌ Other devices can\'t see activity from this device');
} else {
  console.log('✅ Activity logs should sync to server');
  console.log('❌ But SuperAdmin may not be reading from server');
}

console.log();
console.log('💡 Solutions:');
console.log('-'.repeat(20));
console.log('1. 🚀 Add force reload mechanism to SuperAdmin');
console.log('2. 🚀 Make SuperAdmin read from all business contexts');
console.log('3. 🔄 Verify if activity logs should sync to server');
console.log('4. 🧪 Test cross-device activity logging');

console.log();
console.log('🛠️  Immediate Fix:');
console.log('-'.repeat(25));
console.log('Add force reload to SuperAdmin loadLogs function:');
console.log('');
console.log('```typescript');
console.log('const loadLogs = async () => {');
console.log('  // Try all business contexts');
console.log('  const contexts = [');
console.log('    { name: "packaging", key: "activityLogs" },');
console.log('    { name: "gt", key: "general-trading/activityLogs" },');
console.log('    { name: "trucking", key: "trucking/activityLogs" }');
console.log('  ];');
console.log('  ');
console.log('  const allLogs = [];');
console.log('  for (const context of contexts) {');
console.log('    let logs = await storageService.get(context.key) || [];');
console.log('    ');
console.log('    // Force reload if few logs');
console.log('    if (logs.length <= 1) {');
console.log('      const fileData = await storageService.forceReloadFromFile(context.key);');
console.log('      if (fileData && fileData.length > logs.length) {');
console.log('        logs = fileData;');
console.log('      }');
console.log('    }');
console.log('    ');
console.log('    allLogs.push(...logs.map(log => ({...log, businessContext: context.name})));');
console.log('  }');
console.log('  ');
console.log('  // Sort by timestamp');
console.log('  allLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));');
console.log('  setActivityLogs(allLogs);');
console.log('};');
console.log('```');