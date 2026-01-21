/**
 * Fix packaging server sync to use Vercel proxy
 * Update storage config and implement proper server sync
 */

const fs = require('fs');

console.log('🔧 FIXING PACKAGING SERVER SYNC TO VERCEL PROXY\n');

async function fixStorageConfig() {
  console.log('⚙️  UPDATING STORAGE CONFIGURATION\n');
  
  const configPath = 'data/localStorage/storage_config.json';
  
  // Create proper server config
  const newConfig = {
    type: 'server',
    business: 'packaging',
    serverUrl: 'https://vercel-proxy-blond-nine.vercel.app',
    created: new Date().toISOString(),
    fixedAt: new Date().toISOString(),
    fixedBy: 'packaging-server-sync-fix'
  };
  
  // Backup existing config
  if (fs.existsSync(configPath)) {
    const backup = fs.readFileSync(configPath, 'utf8');
    fs.writeFileSync(`${configPath}.backup.${Date.now()}`, backup);
    console.log('✅ Backed up existing storage config');
  }
  
  // Write new config
  fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));
  console.log('✅ Updated storage config:');
  console.log(`   Type: ${newConfig.type}`);
  console.log(`   Business: ${newConfig.business}`);
  console.log(`   Server URL: ${newConfig.serverUrl}`);
  console.log('');
}

async function implementServerSyncInStorageService() {
  console.log('🔄 IMPLEMENTING SERVER SYNC IN STORAGE SERVICE\n');
  
  const storageServicePath = 'src/services/storage.ts';
  
  if (!fs.existsSync(storageServicePath)) {
    console.log('❌ Storage service file not found');
    return;
  }
  
  let content = fs.readFileSync(storageServicePath, 'utf8');
  
  // Check if server sync is already implemented
  if (content.includes('syncFromServerInBackground')) {
    console.log('✅ Server sync already implemented');
    return;
  }
  
  // Find the server mode section in get() method
  const serverModePattern = /} else {\s*\/\/ Server storage - load from local first, sync in background[\s\S]*?return null;\s*}/;
  
  if (serverModePattern.test(content)) {
    console.log('🔧 Updating server mode logic in get() method...');
    
    const newServerModeLogic = `} else {
      // Server storage - load from local first, sync in background
      const localValueStr = localStorage.getItem(storageKey);
      let localValue = null;
      
      if (localValueStr) {
        try {
          const localParsed = JSON.parse(localValueStr);
          localValue = (localParsed.value !== undefined) ? localParsed.value : localParsed;
        } catch (error) {
          console.error(\`[Storage.get] Error parsing local storage for \${key}:\`, error);
        }
      }
      
      // Start background sync if no local data or data is old
      if (localValue === null || this.shouldSyncFromServer(key)) {
        this.syncFromServerInBackground(key).catch(error => {
          console.error(\`[Storage.get] Background sync failed for \${key}:\`, error);
        });
      }
      
      // Return local value immediately (or null if not available)
      return localValue;
    }`;
    
    content = content.replace(serverModePattern, newServerModeLogic);
    console.log('✅ Updated server mode logic');
  }
  
  // Add helper methods for server sync
  const helperMethods = `
  /**
   * Check if data should be synced from server
   */
  private shouldSyncFromServer(key: string): boolean {
    const lastSync = this.lastSyncTime.get(key) || 0;
    const now = Date.now();
    return (now - lastSync) > this.MIN_SYNC_INTERVAL;
  }

  /**
   * Sync data from server in background
   */
  private async syncFromServerInBackground(key: string): Promise<void> {
    const config = this.getConfig();
    
    if (config.type !== 'server' || !config.serverUrl) {
      return;
    }
    
    try {
      await this.syncDataFromServer(key, config.serverUrl);
    } catch (error) {
      console.error(\`[Storage.syncFromServerInBackground] Failed to sync \${key}:\`, error);
    }
  }`;
  
  // Insert helper methods before the last closing brace
  const lastBraceIndex = content.lastIndexOf('}');
  if (lastBraceIndex !== -1) {
    content = content.slice(0, lastBraceIndex) + helperMethods + '\n' + content.slice(lastBraceIndex);
    console.log('✅ Added helper methods for server sync');
  }
  
  // Write updated storage service
  fs.writeFileSync(storageServicePath, content);
  console.log('✅ Updated storage service with server sync implementation');
  console.log('');
}

async function createInitialDataSync() {
  console.log('📤 CREATING INITIAL DATA SYNC SCRIPT\n');
  
  const syncScript = `/**
 * Initial data sync to server
 * Upload existing local data to Vercel proxy server
 */

const fs = require('fs');

console.log('📤 SYNCING LOCAL DATA TO SERVER\\n');

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
    const filePath = \`data/localStorage/\${key}.json\`;
    
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        
        console.log(\`📤 Syncing \${key}...\`);
        
        const response = await fetch(\`\${serverUrl}/api/storage/packaging%2F\${key}\`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });
        
        if (response.ok) {
          console.log(\`   ✅ \${key} synced successfully\`);
          syncedCount++;
        } else {
          console.log(\`   ❌ \${key} sync failed: \${response.status}\`);
          errorCount++;
        }
        
      } catch (error) {
        console.log(\`   ❌ \${key} error: \${error.message}\`);
        errorCount++;
      }
    } else {
      console.log(\`   ⚠️  \${key} file not found, skipping\`);
    }
  }
  
  console.log(\`\\n📊 SYNC SUMMARY:\`);
  console.log(\`   ✅ Synced: \${syncedCount}\`);
  console.log(\`   ❌ Errors: \${errorCount}\`);
  console.log(\`   📁 Total files: \${dataFiles.length}\`);
}

// Run sync
syncDataToServer().catch(console.error);`;

  fs.writeFileSync('sync-packaging-data-to-server.js', syncScript);
  console.log('✅ Created initial data sync script: sync-packaging-data-to-server.js');
  console.log('');
}

async function createTestScript() {
  console.log('🧪 CREATING SERVER SYNC TEST SCRIPT\n');
  
  const testScript = `/**
 * Test server sync functionality
 */

const fs = require('fs');

console.log('🧪 TESTING SERVER SYNC FUNCTIONALITY\\n');

async function testServerSync() {
  const serverUrl = 'https://vercel-proxy-blond-nine.vercel.app';
  
  // Test 1: Check server connectivity
  console.log('1. Testing server connectivity...');
  try {
    const response = await fetch(\`\${serverUrl}/api/storage/packaging%2Fproducts\`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(\`   ✅ Server accessible, products data: \${Array.isArray(data.value) ? data.value.length : 'unknown'} items\`);
    } else {
      console.log(\`   ❌ Server error: \${response.status}\`);
    }
  } catch (error) {
    console.log(\`   ❌ Connection error: \${error.message}\`);
  }
  
  // Test 2: Test write operation
  console.log('\\n2. Testing write operation...');
  const testData = {
    value: [{ id: 'test-' + Date.now(), name: 'Test Item' }],
    timestamp: Date.now(),
    _timestamp: Date.now()
  };
  
  try {
    const response = await fetch(\`\${serverUrl}/api/storage/packaging%2Ftest-data\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData),
    });
    
    if (response.ok) {
      console.log(\`   ✅ Write test successful\`);
    } else {
      console.log(\`   ❌ Write test failed: \${response.status}\`);
    }
  } catch (error) {
    console.log(\`   ❌ Write test error: \${error.message}\`);
  }
  
  // Test 3: Test read operation
  console.log('\\n3. Testing read operation...');
  try {
    const response = await fetch(\`\${serverUrl}/api/storage/packaging%2Ftest-data\`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(\`   ✅ Read test successful, data: \${JSON.stringify(data).substring(0, 100)}...\`);
    } else {
      console.log(\`   ❌ Read test failed: \${response.status}\`);
    }
  } catch (error) {
    console.log(\`   ❌ Read test error: \${error.message}\`);
  }
}

// Run test
testServerSync().catch(console.error);`;

  fs.writeFileSync('test-packaging-server-sync.js', testScript);
  console.log('✅ Created server sync test script: test-packaging-server-sync.js');
  console.log('');
}

// Main execution
async function main() {
  try {
    await fixStorageConfig();
    await implementServerSyncInStorageService();
    await createInitialDataSync();
    await createTestScript();
    
    console.log('🎯 PACKAGING SERVER SYNC FIX COMPLETED');
    console.log('='.repeat(60));
    console.log('✅ Updated storage config to use Vercel proxy');
    console.log('✅ Implemented server sync in storage service');
    console.log('✅ Created initial data sync script');
    console.log('✅ Created test script');
    console.log('');
    console.log('📋 NEXT STEPS:');
    console.log('1. Run: node sync-packaging-data-to-server.js');
    console.log('2. Run: node test-packaging-server-sync.js');
    console.log('3. Test packaging UI to verify data loads correctly');
    console.log('4. Check cross-device sync functionality');
    
  } catch (error) {
    console.error('❌ Error during fix:', error.message);
  }
}

main();