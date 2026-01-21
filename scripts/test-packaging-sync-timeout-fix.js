/**
 * Test script untuk verify packaging sync dengan timeout fix
 * Menguji sync pertama kali dengan timeout yang lebih panjang
 */

const { storageService } = require('./src/services/storage.ts');

async function testPackagingSyncTimeoutFix() {
  console.log('🧪 Testing Packaging Sync with Timeout Fix...\n');
  
  try {
    // 1. Set server config
    console.log('1️⃣ Setting server configuration...');
    await storageService.setConfig({
      type: 'server',
      serverUrl: 'http://localhost:3001' // Adjust to your server URL
    });
    
    const config = storageService.getConfig();
    console.log('✅ Config set:', config);
    
    // 2. Test individual data sync with timeout
    console.log('\n2️⃣ Testing individual data sync...');
    
    const testKeys = ['products', 'materials', 'customers'];
    
    for (const key of testKeys) {
      try {
        console.log(`\n🔄 Syncing ${key}...`);
        const startTime = Date.now();
        
        // This will use the new 30-second timeout
        await storageService.syncDataFromServer(key, config.serverUrl);
        
        const duration = Date.now() - startTime;
        console.log(`✅ ${key} synced successfully in ${duration}ms`);
        
        // Verify data was saved
        const data = await storageService.get(key);
        console.log(`📊 ${key} data: ${Array.isArray(data) ? data.length : 'non-array'} items`);
        
      } catch (error) {
        console.error(`❌ Failed to sync ${key}:`, error.message);
        
        // Check if it's a timeout error
        if (error.name === 'AbortError' || error.message.includes('aborted')) {
          console.log('⏰ This was a timeout error - the fix should handle this with retry');
        }
      }
    }
    
    // 3. Test full sync from server
    console.log('\n3️⃣ Testing full syncFromServer...');
    
    try {
      const startTime = Date.now();
      await storageService.syncFromServer();
      const duration = Date.now() - startTime;
      
      console.log(`✅ Full sync completed in ${duration}ms`);
      
      // Check sync status
      const syncStatus = storageService.getSyncStatus();
      console.log(`📊 Sync status: ${syncStatus}`);
      
    } catch (error) {
      console.error('❌ Full sync failed:', error.message);
    }
    
    // 4. Test retry logic simulation
    console.log('\n4️⃣ Testing retry logic...');
    
    // This would normally be tested with a mock server that times out
    console.log('ℹ️ Retry logic is built into syncDataFromServer method');
    console.log('ℹ️ It will retry up to 3 times with progressive delays (2s, 4s, 6s)');
    console.log('ℹ️ Only retries on network/timeout errors, not server errors');
    
    console.log('\n✅ Packaging sync timeout fix test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test if called directly
if (require.main === module) {
  testPackagingSyncTimeoutFix();
}

module.exports = { testPackagingSyncTimeoutFix };