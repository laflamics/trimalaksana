#!/usr/bin/env node

/**
 * Check if Packaging data exists on server
 */

const WebSocket = require('ws');

const checkServerData = async () => {
  console.log('🔍 Checking Packaging data on server...\n');
  
  const serverUrl = 'wss://server-tljp.tail75a421.ts.net/ws';
  
  return new Promise((resolve) => {
    const ws = new WebSocket(serverUrl, {
      rejectUnauthorized: false
    });
    
    const timeout = setTimeout(() => {
      console.log('❌ Connection timeout');
      ws.close();
      resolve(false);
    }, 10000);
    
    ws.on('open', () => {
      console.log('✅ Connected to server\n');
      
      // Request Packaging data
      const keys = [
        'Packaging/salesOrders',
        'Packaging/delivery', 
        'Packaging/invoices',
        'Packaging/taxRecords'
      ];
      
      keys.forEach(key => {
        ws.send(JSON.stringify({
          action: 'get',
          key: key
        }));
      });
    });
    
    let responses = 0;
    const results = {};
    
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        
        if (msg.key && msg.key.startsWith('Packaging/')) {
          responses++;
          
          const count = Array.isArray(msg.value) ? msg.value.length : 
                       (msg.value && Array.isArray(msg.value.value)) ? msg.value.value.length : 0;
          
          results[msg.key] = count;
          console.log(`📊 ${msg.key}: ${count} records`);
          
          if (responses === 4) {
            clearTimeout(timeout);
            console.log('\n✅ All data checked');
            console.log('\nSummary:', results);
            ws.close();
            resolve(true);
          }
        }
      } catch (e) {
        console.error('Error parsing message:', e.message);
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      clearTimeout(timeout);
      resolve(false);
    });
    
    ws.on('close', () => {
      clearTimeout(timeout);
      if (responses < 4) {
        console.log(`\n⚠️  Only received ${responses}/4 responses`);
      }
      resolve(responses === 4);
    });
  });
};

checkServerData()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
