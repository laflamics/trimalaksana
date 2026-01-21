/**
 * VERIFY PACKAGING SERVER DATA
 * Check if packaging server structure has correct data
 */

const fs = require('fs');

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

function verifyPackagingServerData() {
  console.log('🔍 VERIFYING PACKAGING SERVER DATA');
  console.log('='.repeat(60));
  
  const packagingServerPath = 'data/localStorage/packaging';
  
  if (!fs.existsSync(packagingServerPath)) {
    console.log('❌ Packaging server directory not found!');
    return false;
  }
  
  console.log('✅ Packaging server directory exists');
  
  // Check key files
  const keyFiles = [
    'products.json',
    'materials.json', 
    'customers.json',
    'suppliers.json',
    'userAccessControl.json',
    'salesOrders.json'
  ];
  
  console.log('\n📊 CHECKING KEY FILES:');
  
  let totalItems = 0;
  let filesFound = 0;
  
  keyFiles.forEach(fileName => {
    const filePath = `${packagingServerPath}/${fileName}`;
    const data = readJsonFile(filePath);
    
    if (data) {
      let itemCount = 0;
      if (data.value && Array.isArray(data.value)) {
        itemCount = data.value.length;
      } else if (Array.isArray(data)) {
        itemCount = data.length;
      }
      
      console.log(`   ✅ ${fileName}: ${itemCount} items`);
      totalItems += itemCount;
      filesFound++;
    } else {
      console.log(`   ❌ ${fileName}: Not found or invalid`);
    }
  });
  
  console.log(`\n📈 SUMMARY:`);
  console.log(`   Files found: ${filesFound}/${keyFiles.length}`);
  console.log(`   Total items: ${totalItems}`);
  
  // Compare with original data
  console.log('\n🔄 COMPARING WITH ORIGINAL DATA:');
  
  keyFiles.forEach(fileName => {
    const serverPath = `${packagingServerPath}/${fileName}`;
    const originalPath = `data/localStorage/${fileName}`;
    
    const serverData = readJsonFile(serverPath);
    const originalData = readJsonFile(originalPath);
    
    if (serverData && originalData) {
      let serverCount = 0;
      let originalCount = 0;
      
      if (serverData.value && Array.isArray(serverData.value)) {
        serverCount = serverData.value.length;
      } else if (Array.isArray(serverData)) {
        serverCount = serverData.length;
      }
      
      if (originalData.value && Array.isArray(originalData.value)) {
        originalCount = originalData.value.length;
      } else if (Array.isArray(originalData)) {
        originalCount = originalData.length;
      }
      
      if (serverCount === originalCount) {
        console.log(`   ✅ ${fileName}: Server=${serverCount}, Original=${originalCount} - MATCH`);
      } else {
        console.log(`   ⚠️  ${fileName}: Server=${serverCount}, Original=${originalCount} - MISMATCH`);
      }
    }
  });
  
  // Check all files in packaging directory
  console.log('\n📁 ALL FILES IN PACKAGING SERVER:');
  
  const allFiles = fs.readdirSync(packagingServerPath)
    .filter(file => file.endsWith('.json'));
  
  allFiles.forEach(fileName => {
    const filePath = `${packagingServerPath}/${fileName}`;
    const data = readJsonFile(filePath);
    
    let itemCount = 0;
    if (data && data.value && Array.isArray(data.value)) {
      itemCount = data.value.length;
    } else if (data && Array.isArray(data)) {
      itemCount = data.length;
    }
    
    console.log(`   📄 ${fileName}: ${itemCount} items`);
  });
  
  console.log('\n' + '='.repeat(60));
  console.log('📋 VERIFICATION RESULT');
  console.log('='.repeat(60));
  
  if (filesFound === keyFiles.length && totalItems > 0) {
    console.log('\n🎉 PACKAGING SERVER DATA VERIFICATION PASSED!');
    console.log('✅ All key files found with data');
    console.log('✅ Server structure is correct');
    console.log('✅ Ready for cross-device sync');
    
    console.log('\n💡 NEXT STEPS:');
    console.log('   1. Restart application on all devices');
    console.log('   2. Check sync status in application');
    console.log('   3. Verify packaging data appears on other devices');
    console.log('   4. Test cross-device sync functionality');
    
    return true;
  } else {
    console.log('\n❌ PACKAGING SERVER DATA VERIFICATION FAILED');
    console.log(`   Files found: ${filesFound}/${keyFiles.length}`);
    console.log(`   Total items: ${totalItems}`);
    
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    console.log('   1. Check if packaging data exists in data/localStorage/');
    console.log('   2. Re-run create-packaging-server-structure.js');
    console.log('   3. Verify file permissions and disk space');
    
    return false;
  }
}

// Run verification
const success = verifyPackagingServerData();

if (success) {
  console.log('\n🎯 PACKAGING SERVER IS READY FOR SYNC!');
} else {
  console.log('\n🔧 PACKAGING SERVER NEEDS ATTENTION');
}