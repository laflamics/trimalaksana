#!/usr/bin/env node

/**
 * Fix nested/wrapped Packaging data on server
 * Problem: Data wrapped multiple times like {value: [{value: [{value: [...]}]}]}
 * Solution: Unwrap to single level {value: [...], timestamp: ...}
 */

const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const fixNestedData = async () => {
  console.log('🔧 Fixing nested Packaging data on server...\n');
  
  const serverUrl = 'wss://server-tljp.tail75a421.ts.net/ws';
  
  // Read local files (these are correct format)
  const dataPath = path.join(__dirname, '../data/localStorage/Packaging');
  
  const salesOrders = JSON.parse(fs.readFileSync(path.join(dataPath, 'salesOrders.json'), 'utf8'));
  const delivery = JSON.parse(fs.readFileSync(path.join(dataPath, 'delivery.json'), 'utf8'));
  const invoices = JSON.parse(fs.readFileSync(path.join(dataPath, 'invoices.json'), 'utf8'));
  const taxRecords = JSON.parse(fs.readFileSync(path.join(dataPath, 'taxRecords.json'), 'utf8'));
  
  console.log('📂 Loaded local data:');
  console.log(`   - Sales Orders: ${salesOrders.value.length}`);
  console.log(`   - Deliveries: ${delivery.value.length}`);
  console.log(`   - Invoices: ${invoices.value.length}`);
  console.log(`   - Tax Records: ${taxRecords.value.length}\n`);
  
  return new Promise((resolve) => {
    const ws = new WebSocket(serverUrl, {
      rejectUnauthorized: false
    });
    
    const timeout = setTimeout(() => {
      console.log('❌ Connection timeout');
      ws.close();
      resolve(false);
    }, 30000);
    
    ws.on('open', () => {
      console.log('✅ Connected to server\n');
      console.log('📤 Uploading corrected data...\n');
      
      // Upload with correct single-level wrapping
      // IMPORTANT: Use lowercase 'packaging/' to match websocket-client normalization
      const uploads = [
        { key: 'packaging/salesOrders', data: salesOrders },
        { key: 'packaging/delivery', data: delivery },
        { key: 'packaging/invoices', data: invoices },
        { key: 'packaging/taxRecords', data: taxRecords }
      ];
      
      uploads.forEach(({ key, data }) => {
        ws.send(JSON.stringify({
          action: 'update',
          key: key,
          value: data.value, // Send the array directly
          timestamp: Date.now()
        }));
        console.log(`   ✅ Sent ${key}: ${data.value.length} records`);
      });
      
      console.log('\n⏳ Waiting for confirmation...');
      
      // Wait a bit for server to process
      setTimeout(() => {
        clearTimeout(timeout);
        console.log('\n✅ Upload complete!');
        console.log('\n📋 Next steps:');
        console.log('   1. Restart your app');
        console.log('   2. Or clear browser cache (Ctrl+Shift+R)');
        console.log('   3. Data should now load correctly\n');
        ws.close();
        resolve(true);
      }, 5000);
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      clearTimeout(timeout);
      resolve(false);
    });
    
    ws.on('close', () => {
      clearTimeout(timeout);
    });
  });
};

fixNestedData()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
