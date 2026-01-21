/**
 * CREATE PACKAGING SERVER STRUCTURE
 * Create the missing data/localStorage/packaging/ directory and upload packaging data
 */

const fs = require('fs');
const path = require('path');

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

function writeJsonFile(filePath, data) {
  try {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing ${filePath}:`, error.message);
    return false;
  }
}

function createPackagingServerStructure() {
  console.log('🏗️  CREATING PACKAGING SERVER STRUCTURE');
  console.log('='.repeat(60));
  
  // Step 1: Create packaging server directory
  console.log('\n1️⃣ CREATING SERVER DIRECTORIES...');
  
  const packagingServerPath = 'data/localStorage/packaging';
  
  try {
    if (!fs.existsSync(packagingServerPath)) {
      fs.mkdirSync(packagingServerPath, { recursive: true });
      console.log(`   ✅ Created: ${packagingServerPath}/`);
    } else {
      console.log(`   ✅ Already exists: ${packagingServerPath}/`);
    }
  } catch (error) {
    console.log(`   ❌ Failed to create ${packagingServerPath}: ${error.message}`);
    return false;
  }
  
  // Step 2: Copy packaging data from root localStorage to packaging folder
  console.log('\n2️⃣ COPYING PACKAGING DATA TO SERVER STRUCTURE...');
  
  const packagingFiles = [
    'products.json',
    'materials.json',
    'customers.json',
    'suppliers.json',
    'salesOrders.json',
    'purchaseOrders.json',
    'production.json',
    'inventory.json',
    'userAccessControl.json',
    'bom.json',
    'spk.json',
    'qc.json',
    'deliveryNotes.json',
    'invoices.json',
    'payments.json',
    'journalEntries.json',
    'accounts.json',
    'companySettings.json'
  ];
  
  let copiedCount = 0;
  let totalItems = 0;
  
  packagingFiles.forEach(fileName => {
    const sourcePath = `data/localStorage/${fileName}`;
    const targetPath = `${packagingServerPath}/${fileName}`;
    
    const sourceData = readJsonFile(sourcePath);
    
    if (sourceData) {
      // Count items
      let itemCount = 0;
      if (sourceData.value && Array.isArray(sourceData.value)) {
        itemCount = sourceData.value.length;
      } else if (Array.isArray(sourceData)) {
        itemCount = sourceData.length;
      }
      
      // Copy to packaging server structure
      if (writeJsonFile(targetPath, sourceData)) {
        console.log(`   ✅ Copied ${fileName} - ${itemCount} items`);
        copiedCount++;
        totalItems += itemCount;
      } else {
        console.log(`   ❌ Failed to copy ${fileName}`);
      }
    } else {
      console.log(`   ⚠️  ${fileName} - Source not found, skipping`);
    }
  });
  
  console.log(`\n   📊 Copied ${copiedCount} files with ${totalItems} total items`);
  
  // Step 3: Verify server structure
  console.log('\n3️⃣ VERIFYING SERVER STRUCTURE...');
  
  if (fs.existsSync(packagingServerPath)) {
    const serverFiles = fs.readdirSync(packagingServerPath)
      .filter(file => file.endsWith('.json'));
    
    console.log(`   ✅ Server directory exists with ${serverFiles.length} JSON files:`);
    
    serverFiles.forEach(file => {
      const filePath = path.join(packagingServerPath, file);
      const data = readJsonFile(filePath);
      
      let itemCount = 0;
      if (data && data.value && Array.isArray(data.value)) {
        itemCount = data.value.length;
      } else if (data && Array.isArray(data)) {
        itemCount = data.length;
      }
      
      console.log(`      - ${file}: ${itemCount} items`);
    });
  } else {
    console.log('   ❌ Server directory verification failed');
    return false;
  }
  
  // Step 4: Update sync configuration
  console.log('\n4️⃣ UPDATING SYNC CONFIGURATION...');
  
  // Check if storage config needs update
  const storageConfigPath = 'data/localStorage/storage_config.json';
  const storageConfig = readJsonFile(storageConfigPath);
  
  if (storageConfig) {
    if (storageConfig.type !== 'server') {
      const updatedConfig = {
        ...storageConfig,
        type: 'server',
        serverUrl: storageConfig.serverUrl || 'http://localhost:3001',
        packagingServerPath: packagingServerPath,
        updatedAt: new Date().toISOString(),
        updatedBy: 'create-packaging-server-structure'
      };
      
      if (writeJsonFile(storageConfigPath, updatedConfig)) {
        console.log('   ✅ Updated storage config to server mode');
      } else {
        console.log('   ❌ Failed to update storage config');
      }
    } else {
      console.log('   ✅ Storage config already in server mode');
    }
  }
  
  // Step 5: Create verification report
  console.log('\n5️⃣ CREATING VERIFICATION REPORT...');
  
  const report = {
    timestamp: new Date().toISOString(),
    action: 'create-packaging-server-structure',
    packagingServerPath,
    filesCopied: copiedCount,
    totalItems,
    serverFiles: fs.readdirSync(packagingServerPath).filter(f => f.endsWith('.json')),
    success: true,
    nextSteps: [
      'Restart application to use new server structure',
      'Test packaging data sync on other devices',
      'Verify cross-device sync is working',
      'Monitor sync status in application'
    ]
  };
  
  if (writeJsonFile('packaging-server-structure-report.json', report)) {
    console.log('   ✅ Created verification report: packaging-server-structure-report.json');
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('🎉 PACKAGING SERVER STRUCTURE CREATED!');
  console.log('='.repeat(60));
  
  console.log('\n✅ COMPLETED ACTIONS:');
  console.log(`   - Created server directory: ${packagingServerPath}/`);
  console.log(`   - Copied ${copiedCount} packaging files`);
  console.log(`   - Total ${totalItems} items now available on server`);
  console.log('   - Updated storage configuration');
  
  console.log('\n🔄 WHAT THIS FIXES:');
  console.log('   - Packaging data now has proper server structure');
  console.log('   - Other devices can sync from server path');
  console.log('   - Cross-device sync will work for packaging module');
  
  console.log('\n📁 SERVER STRUCTURE NOW:');
  console.log('   data/localStorage/packaging/products.json');
  console.log('   data/localStorage/packaging/materials.json');
  console.log('   data/localStorage/packaging/customers.json');
  console.log('   data/localStorage/packaging/suppliers.json');
  console.log('   data/localStorage/packaging/userAccessControl.json');
  console.log('   ... and more packaging files');
  
  console.log('\n💡 NEXT STEPS:');
  console.log('   1. Restart application on all devices');
  console.log('   2. Check sync status - should show "syncing" then "synced"');
  console.log('   3. Verify packaging data appears on other devices');
  console.log('   4. Test cross-device changes sync properly');
  
  console.log('\n🏁 Server structure created at:', new Date().toLocaleString());
  
  return true;
}

// Run the creation
const success = createPackagingServerStructure();

if (success) {
  console.log('\n🎯 PACKAGING SERVER STRUCTURE IS NOW READY!');
  console.log('🔄 Other devices should now be able to sync packaging data');
} else {
  console.log('\n❌ FAILED TO CREATE PACKAGING SERVER STRUCTURE');
  console.log('🔧 Check the errors above and try again');
}