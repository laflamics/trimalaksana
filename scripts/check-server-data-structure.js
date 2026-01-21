/**
 * CHECK SERVER DATA STRUCTURE
 * Verify if server has the correct business-specific data paths
 */

const fs = require('fs');
const path = require('path');

function checkDirectoryExists(dirPath) {
  try {
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  } catch (error) {
    return false;
  }
}

function listJsonFiles(dirPath) {
  try {
    if (!fs.existsSync(dirPath)) {
      return [];
    }
    return fs.readdirSync(dirPath)
      .filter(file => file.endsWith('.json'))
      .map(file => {
        const filePath = path.join(dirPath, file);
        try {
          const stats = fs.statSync(filePath);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          let itemCount = 0;
          
          if (data.value && Array.isArray(data.value)) {
            itemCount = data.value.length;
          } else if (Array.isArray(data)) {
            itemCount = data.length;
          }
          
          return {
            file,
            size: stats.size,
            itemCount,
            lastModified: stats.mtime.toISOString()
          };
        } catch (e) {
          return {
            file,
            size: 0,
            itemCount: 0,
            error: e.message
          };
        }
      });
  } catch (error) {
    return [];
  }
}

function checkServerDataStructure() {
  console.log('🔍 CHECKING SERVER DATA STRUCTURE');
  console.log('='.repeat(60));
  
  // Check expected server paths
  const serverPaths = [
    'data/localStorage/packaging',
    'data/localStorage/general-trading', 
    'data/localStorage/trucking',
    'docker/data/localStorage/packaging',
    'docker/data/localStorage/general-trading',
    'docker/data/localStorage/trucking'
  ];
  
  console.log('\n1️⃣ CHECKING EXPECTED SERVER PATHS...');
  
  let foundPaths = [];
  
  serverPaths.forEach(serverPath => {
    const exists = checkDirectoryExists(serverPath);
    if (exists) {
      console.log(`   ✅ ${serverPath} - EXISTS`);
      foundPaths.push(serverPath);
    } else {
      console.log(`   ❌ ${serverPath} - NOT FOUND`);
    }
  });
  
  if (foundPaths.length === 0) {
    console.log('\n⚠️  NO EXPECTED SERVER PATHS FOUND');
    console.log('💡 Server may not have business-specific data structure yet');
  }
  
  // Check what we actually have
  console.log('\n2️⃣ CHECKING ACTUAL DATA STRUCTURE...');
  
  // Check data/localStorage structure
  console.log('\n📁 data/localStorage/ structure:');
  const dataLocalStorage = 'data/localStorage';
  
  if (checkDirectoryExists(dataLocalStorage)) {
    const subdirs = fs.readdirSync(dataLocalStorage)
      .filter(item => {
        const itemPath = path.join(dataLocalStorage, item);
        return fs.statSync(itemPath).isDirectory();
      });
    
    if (subdirs.length > 0) {
      console.log('   📂 Subdirectories found:');
      subdirs.forEach(subdir => {
        console.log(`      - ${subdir}/`);
        
        // Check if it's a business directory
        if (['packaging', 'general-trading', 'trucking'].includes(subdir)) {
          const businessPath = path.join(dataLocalStorage, subdir);
          const jsonFiles = listJsonFiles(businessPath);
          
          if (jsonFiles.length > 0) {
            console.log(`        📄 JSON files (${jsonFiles.length}):`);
            jsonFiles.forEach(file => {
              console.log(`           ${file.file} - ${file.itemCount} items`);
            });
          } else {
            console.log(`        📄 No JSON files found`);
          }
        }
      });
    } else {
      console.log('   📂 No subdirectories found');
    }
    
    // Check root JSON files
    const rootJsonFiles = listJsonFiles(dataLocalStorage);
    if (rootJsonFiles.length > 0) {
      console.log('\n   📄 Root JSON files:');
      rootJsonFiles.slice(0, 10).forEach(file => {
        console.log(`      ${file.file} - ${file.itemCount} items`);
      });
      if (rootJsonFiles.length > 10) {
        console.log(`      ... and ${rootJsonFiles.length - 10} more files`);
      }
    }
  } else {
    console.log('   ❌ data/localStorage directory not found');
  }
  
  // Check docker structure
  console.log('\n📁 docker/ structure:');
  const dockerPath = 'docker';
  
  if (checkDirectoryExists(dockerPath)) {
    console.log('   ✅ docker/ directory exists');
    
    const dockerDataPath = 'docker/data';
    if (checkDirectoryExists(dockerDataPath)) {
      console.log('   ✅ docker/data/ directory exists');
      
      const dockerLocalStoragePath = 'docker/data/localStorage';
      if (checkDirectoryExists(dockerLocalStoragePath)) {
        console.log('   ✅ docker/data/localStorage/ directory exists');
        
        // Check business subdirectories
        const businessDirs = ['packaging', 'general-trading', 'trucking'];
        businessDirs.forEach(business => {
          const businessPath = path.join(dockerLocalStoragePath, business);
          if (checkDirectoryExists(businessPath)) {
            console.log(`   ✅ docker/data/localStorage/${business}/ - EXISTS`);
            
            const jsonFiles = listJsonFiles(businessPath);
            if (jsonFiles.length > 0) {
              console.log(`      📄 JSON files (${jsonFiles.length}):`);
              jsonFiles.forEach(file => {
                console.log(`         ${file.file} - ${file.itemCount} items`);
              });
            }
          } else {
            console.log(`   ❌ docker/data/localStorage/${business}/ - NOT FOUND`);
          }
        });
      } else {
        console.log('   ❌ docker/data/localStorage/ directory not found');
      }
    } else {
      console.log('   ❌ docker/data/ directory not found');
    }
  } else {
    console.log('   ❌ docker/ directory not found');
  }
  
  // Check gt.json structure
  console.log('\n📁 gt.json structure:');
  const gtJsonPath = 'data/gt.json/gt.json';
  
  if (fs.existsSync(gtJsonPath)) {
    try {
      const gtData = JSON.parse(fs.readFileSync(gtJsonPath, 'utf8'));
      console.log('   ✅ gt.json file exists');
      
      // Check for business-specific data
      const businessKeys = {
        packaging: ['products', 'materials', 'customers', 'suppliers'],
        'general-trading': ['gt_products', 'gt_customers', 'gt_suppliers'],
        trucking: ['trucking_vehicles', 'trucking_drivers', 'trucking_routes']
      };
      
      Object.entries(businessKeys).forEach(([business, keys]) => {
        const foundKeys = keys.filter(key => gtData[key]);
        if (foundKeys.length > 0) {
          console.log(`   ✅ ${business} data found: ${foundKeys.join(', ')}`);
          foundKeys.forEach(key => {
            const data = gtData[key];
            let count = 0;
            if (data && data.value && Array.isArray(data.value)) {
              count = data.value.length;
            } else if (Array.isArray(data)) {
              count = data.length;
            }
            console.log(`      - ${key}: ${count} items`);
          });
        } else {
          console.log(`   ❌ ${business} data not found in gt.json`);
        }
      });
      
    } catch (error) {
      console.log(`   ❌ Error reading gt.json: ${error.message}`);
    }
  } else {
    console.log('   ❌ gt.json file not found');
  }
  
  // Summary and recommendations
  console.log('\n' + '='.repeat(60));
  console.log('📋 ANALYSIS SUMMARY');
  console.log('='.repeat(60));
  
  if (foundPaths.length > 0) {
    console.log('\n✅ FOUND SERVER DATA PATHS:');
    foundPaths.forEach(path => {
      console.log(`   - ${path}`);
    });
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('   1. Verify data in these paths is up to date');
    console.log('   2. Check sync mechanism is using correct paths');
    console.log('   3. Test cross-device sync with these paths');
    
  } else {
    console.log('\n❌ NO BUSINESS-SPECIFIC SERVER PATHS FOUND');
    
    console.log('\n💡 POSSIBLE REASONS:');
    console.log('   1. Server not set up with business-specific structure');
    console.log('   2. Data stored in different location (like gt.json)');
    console.log('   3. Server paths not created yet');
    
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    console.log('   1. Create server directory structure:');
    console.log('      mkdir -p docker/data/localStorage/packaging');
    console.log('      mkdir -p docker/data/localStorage/general-trading');
    console.log('      mkdir -p docker/data/localStorage/trucking');
    console.log('   2. Upload business data to correct paths');
    console.log('   3. Update sync mechanism to use business paths');
  }
  
  console.log('\n🏁 Structure check completed at:', new Date().toLocaleString());
  
  return {
    foundPaths,
    hasBusinessStructure: foundPaths.length > 0
  };
}

// Run the check
const result = checkServerDataStructure();

if (result.hasBusinessStructure) {
  console.log('\n🎉 SERVER HAS BUSINESS-SPECIFIC DATA STRUCTURE!');
} else {
  console.log('\n🔧 SERVER NEEDS BUSINESS-SPECIFIC DATA STRUCTURE');
}