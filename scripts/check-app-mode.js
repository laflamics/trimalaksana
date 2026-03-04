#!/usr/bin/env node

/**
 * Check and set app storage mode
 * This script helps verify if the app is in server mode or local mode
 */

console.log('📋 App Storage Mode Configuration\n');
console.log('To set the app to SERVER MODE, run this in the browser console:\n');

console.log('localStorage.setItem("storage_config", \'{"type":"server","serverUrl":"http://100.81.50.37:9999"}\');');
console.log('location.reload();\n');

console.log('To verify the current mode, run this in the browser console:\n');
console.log('console.log(JSON.parse(localStorage.getItem("storage_config") || "{}"));\n');

console.log('Expected output for SERVER MODE:');
console.log('{');
console.log('  "type": "server",');
console.log('  "serverUrl": "http://100.81.50.37:9999"');
console.log('}\n');

console.log('If you see null or empty object, the app is in LOCAL MODE.\n');

console.log('='.repeat(60));
console.log('\n✅ Steps to fix:');
console.log('1. Open the app in browser');
console.log('2. Open Developer Console (F12)');
console.log('3. Paste the command above');
console.log('4. Press Enter');
console.log('5. Wait for page to reload');
console.log('6. Check Purchasing and Finance pages - data should appear\n');
