#!/usr/bin/env node

/**
 * Set Storage Config to Server Mode
 * Usage: node scripts/set-storage-config-server.js <server_url>
 * Example: node scripts/set-storage-config-server.js http://100.81.50.37:9999
 */

const fs = require('fs');
const path = require('path');

const serverUrl = process.argv[2];

if (!serverUrl) {
  console.error('❌ Error: Server URL is required');
  console.error('Usage: node scripts/set-storage-config-server.js <server_url>');
  console.error('Example: node scripts/set-storage-config-server.js http://100.81.50.37:9999');
  process.exit(1);
}

// Validate URL format
try {
  new URL(serverUrl);
} catch (error) {
  console.error('❌ Error: Invalid URL format');
  console.error('Example: http://100.81.50.37:9999');
  process.exit(1);
}

const config = {
  type: 'server',
  serverUrl: serverUrl
};

// Store in localStorage simulation (for Node.js context)
// In browser, this would be localStorage.setItem('storage_config', JSON.stringify(config))
const configJson = JSON.stringify(config, null, 2);

console.log('📝 Storage Config to be set:');
console.log(configJson);

console.log('\n✅ To apply this config in the browser:');
console.log('1. Open browser DevTools (F12)');
console.log('2. Go to Console tab');
console.log('3. Paste this command:');
console.log(`localStorage.setItem('storage_config', '${JSON.stringify(config)}');`);
console.log('4. Press Enter');
console.log('5. Refresh the page (F5)');

console.log('\n📋 Or use this in your app initialization:');
console.log(`await storageService.setConfig(${configJson});`);
