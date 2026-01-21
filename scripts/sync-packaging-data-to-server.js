/**
 * Initial data sync to server
 * Upload existing local data to Vercel proxy server
 */

const fs = require('fs');

console.log('📤 SYNCING LOCAL DATA TO SERVER\n');

async function syncDataToServer() {
  const serverUrl = 'https://vercel-proxy-blond-nine.vercel.app';
  
  // Data files to sync for packaging
  const dataFiles = [
    'salesOrders',
    'quotations', 
    'products',
    'inventory',
    'customers',
    'materials',
    'bom',
    'spk',
    'purchaseOrders',
    'production',
    'qc',
    'deliveryNotes',
    'accounts',
    'journalEntries'
  ];
  
  let syncedCount = 0;
  let errorCount = 0;
  
  for (const key of dataFiles) {
    const filePath = `data/localStorage/${key}.json`;
    
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        console.log(`📤 Syncing ${key}...`);
        
        const response = await fetch(`${serverUrl}/api/storage/packaging%2F${key}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (response.ok) {
          console.log(`   ✅ ${key} synced successfully`);
          syncedCount++;
        } else {
          console.log(`   ❌ ${key} sync failed: ${response.status}`);
          errorCount++;
        }
        
      } catch (error) {
        console.log(`   ❌ ${key} error: ${error.message}`);
        errorCount++;
      }
    } else {
      console.log(`   ⚠️  ${key} file not found, skipping`);
    }
  }
  
  console.log(`\n📊 SYNC SUMMARY:`);
  console.log(`   ✅ Synced: ${syncedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📁 Total files: ${dataFiles.length}`);
}

// Run sync
syncDataToServer().catch(console.error);