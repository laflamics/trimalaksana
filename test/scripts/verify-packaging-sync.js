
/**
 * PACKAGING SYNC VERIFICATION
 * Run this after the fix to verify sync is working
 */

const fs = require('fs');

function verifySyncStatus() {
  console.log('🔍 VERIFYING PACKAGING SYNC STATUS');
  console.log('='.repeat(50));
  
  // Check storage config
  const config = JSON.parse(fs.readFileSync('data/localStorage/storage_config.json', 'utf8'));
  console.log('Storage Config:', config.type);
  
  // Check sync status of key files
  const keys = ['products', 'materials', 'customers', 'suppliers', 'userAccessControl'];
  
  keys.forEach(key => {
    try {
      const data = JSON.parse(fs.readFileSync(`data/localStorage/${key}.json`, 'utf8'));
      const synced = data.synced || false;
      const count = Array.isArray(data.value) ? data.value.length : 0;
      console.log(`${key}: ${count} items, synced: ${synced}`);
    } catch (e) {
      console.log(`${key}: File not found`);
    }
  });
  
  console.log('\n🏁 Verification completed');
}

verifySyncStatus();
