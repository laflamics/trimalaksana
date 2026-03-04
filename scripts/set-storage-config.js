#!/usr/bin/env node

/**
 * Set storage config to server mode
 * This script outputs JavaScript code that can be pasted into browser console
 */

const serverUrl = process.argv[2] || 'http://100.81.50.37:9999';

const config = {
  type: 'server',
  serverUrl: serverUrl
};

console.log(`
// Paste this into browser console to set storage config:

localStorage.setItem('storage_config', '${JSON.stringify(config)}');
console.log('✅ Storage config set to server mode');
console.log('Config:', JSON.parse(localStorage.getItem('storage_config')));

// Then reload the page
location.reload();
`);
