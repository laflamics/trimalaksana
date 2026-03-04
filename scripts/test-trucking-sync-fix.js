/**
 * Test trucking sync dengan WebSocket
 */

const WebSocket = require('ws');

const WS_URL = 'wss://server-tljp.tail75a421.ts.net/ws';

async function testSync() {
  console.log('🧪 Testing trucking sync via WebSocket...\n');
  
  const keys = [
    'trucking_suratJalan',
    'trucking_customers',
    'trucking_delivery_orders',
  ];
  
  return new Promise((resolve) => {
    const ws = new WebSocket(WS_URL);
    let requestCount = 0;
    let responseCount = 0;
    
    ws.on('open', () => {
      console.log('✅ WebSocket connected\n');
      
      // Send GET requests untuk setiap key
      keys.forEach((key, index) => {
        const requestId = `test_${index}`;
        const message = {
          requestId,
          action: 'GET',
          key: key,
          timestamp: Date.now()
        };
        
        console.log(`📤 Requesting: ${key}`);
        ws.send(JSON.stringify(message));
        requestCount++;
      });
    });
    
    ws.on('message', (data) => {
      try {
        const response = JSON.parse(data);
        
        if (response.requestId && response.requestId.startsWith('test_')) {
          responseCount++;
          const key = keys[parseInt(response.requestId.split('_')[1])];
          
          if (response.success) {
            const value = response.value;
            if (Array.isArray(value)) {
              console.log(`✅ ${key}: Found ${value.length} items`);
            } else if (value && typeof value === 'object' && Object.keys(value).length === 0) {
              console.log(`⚠️  ${key}: Empty object on server`);
            } else {
              console.log(`❓ ${key}: ${JSON.stringify(value).substring(0, 100)}`);
            }
          } else {
            console.log(`❌ ${key}: ${response.error}`);
          }
          
          // Close after all responses received
          if (responseCount === requestCount) {
            console.log('\n✅ All tests completed');
            ws.close();
            resolve();
          }
        }
      } catch (error) {
        console.error('Error parsing message:', error.message);
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket error:', error.message);
      resolve();
    });
    
    ws.on('close', () => {
      console.log('\n🔌 WebSocket closed');
      resolve();
    });
    
    // Timeout after 10 seconds
    setTimeout(() => {
      console.log('\n⏱️  Timeout - closing connection');
      ws.close();
      resolve();
    }, 10000);
  });
}

testSync().catch(console.error);
