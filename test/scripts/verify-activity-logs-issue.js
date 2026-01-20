#!/usr/bin/env node

/**
 * Verify Activity Logs Cross-Device Sync Issue
 * 
 * Root Cause: SuperAdmin only reads 'activityLogs' (Packaging context)
 * but GT and Trucking save to 'general-trading/activityLogs' and 'trucking/activityLogs'
 */

const fs = require('fs');

console.log('🔍 Verifying Activity Logs Cross-Device Sync Issue');
console.log('='.repeat(60));

// Check all activity logs files
const activityLogsPaths = [
  { name: 'Packaging', path: 'data/localStorage/activityLogs.json' },
  { name: 'GT', path: 'data/localStorage/general-trading/activityLogs.json' },
  { name: 'Trucking', path: 'data/localStorage/trucking/activityLogs.json' }
];

let totalLogs = 0;
const allLogs = [];

console.log('📊 Activity Logs Summary:');
console.log('-'.repeat(40));

for (const { name, path } of activityLogsPaths) {
  if (fs.existsSync(path)) {
    try {
      const data = JSON.parse(fs.readFileSync(path, 'utf8'));
      const logs = Array.isArray(data) ? data : (data.value || []);
      
      console.log(`${name.padEnd(12)}: ${logs.length.toString().padStart(3)} logs`);
      
      if (logs.length > 0) {
        const latest = logs[0];
        console.log(`${' '.repeat(12)}   Latest: ${latest.action} by ${latest.username} at ${latest.timestamp?.substring(0, 19) || 'N/A'}`);
        
        // Add business context to logs
        const logsWithContext = logs.map(log => ({ ...log, businessContext: name }));
        allLogs.push(...logsWithContext);
      }
      
      totalLogs += logs.length;
    } catch (error) {
      console.log(`${name.padEnd(12)}: ❌ Invalid JSON - ${error.message}`);
    }
  } else {
    console.log(`${name.padEnd(12)}: ⚠️  File not found`);
  }
}

console.log('-'.repeat(40));
console.log(`Total Logs    : ${totalLogs}`);

if (allLogs.length > 0) {
  // Sort all logs by timestamp
  allLogs.sort((a, b) => {
    const timeA = new Date(a.timestamp).getTime();
    const timeB = new Date(b.timestamp).getTime();
    return timeB - timeA; // Newest first
  });
  
  console.log();
  console.log('📋 Recent Activity (All Business Units):');
  console.log('-'.repeat(60));
  
  allLogs.slice(0, 10).forEach((log, index) => {
    const time = log.timestamp?.substring(11, 19) || 'N/A';
    const context = log.businessContext?.substring(0, 3).toUpperCase() || 'UNK';
    console.log(`${(index + 1).toString().padStart(2)}. [${context}] ${time} ${log.action.padEnd(8)} ${log.username} - ${log.path}`);
  });
}

console.log();
console.log('🔍 Issue Analysis:');
console.log('-'.repeat(30));
console.log('❌ SuperAdmin only reads from Packaging context (activityLogs)');
console.log('❌ GT logs stored in general-trading/activityLogs');
console.log('❌ Trucking logs stored in trucking/activityLogs');
console.log('❌ Cross-business activity not visible in SuperAdmin');

console.log();
console.log('💡 Solution Required:');
console.log('-'.repeat(30));
console.log('✅ SuperAdmin should read from ALL business contexts');
console.log('✅ Merge logs from packaging, GT, and trucking');
console.log('✅ Sort by timestamp for unified view');
console.log('✅ Add business context indicator in UI');

console.log();
console.log('🛠️  Implementation Steps:');
console.log('-'.repeat(30));
console.log('1. Update SuperAdmin loadLogs to read from all contexts');
console.log('2. Add force reload mechanism for each context');
console.log('3. Merge and sort logs by timestamp');
console.log('4. Add business context column in activity table');
console.log('5. Test cross-device activity visibility');