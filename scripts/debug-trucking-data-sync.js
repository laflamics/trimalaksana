/**
 * Debug script untuk cek data trucking dan sync issue
 * Fokus hanya pada Delivery Orders trucking
 */

const fs = require('fs');
const path = require('path');

console.log('🚛 Debugging Trucking Data Sync Issue...\n');

// Check local trucking data
function checkLocalTruckingData() {
  console.log('📁 Checking Local Trucking Data:\n');
  
  const truckingPaths = [
    'data/localStorage/trucking_delivery_orders.json',
    'data/localStorage/trucking/trucking_delivery_orders.json',
    'data/localStorage/trucking_customers.json',
    'data/localStorage/trucking/trucking_customers.json',
    'data/localStorage/trucking_vehicles.json',
    'data/localStorage/trucking/trucking_vehicles.json',
    'data/localStorage/trucking_drivers.json',
    'data/localStorage/trucking/trucking_drivers.json',
    'data/localStorage/trucking_routes.json',
    'data/localStorage/trucking/trucking_routes.json'
  ];
  
  truckingPaths.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`✅ ${filePath}: ${Array.isArray(data) ? data.length : 'object'} items`);
        
        if (Array.isArray(data) && data.length > 0) {
          console.log(`   Sample: ${JSON.stringify(data[0], null, 2).substring(0, 200)}...`);
        }
      } catch (error) {
        console.log(`❌ ${filePath}: Error reading - ${error.message}`);
      }
    } else {
      console.log(`⚠️  ${filePath}: File not found`);
    }
    console.log('');
  });
}

// Check server data structure
function checkServerData() {
  console.log('🌐 Checking Server Data Structure:\n');
  
  const serverPaths = [
    'data/server/trucking.json',
    'data/server/trucking/delivery_orders.json',
    'data/server/trucking/customers.json',
    'data/server/trucking/vehicles.json',
    'data/server/trucking/drivers.json',
    'data/server/trucking/routes.json'
  ];
  
  serverPaths.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        console.log(`✅ ${filePath}: ${Array.isArray(data) ? data.length : 'object'} items`);
        
        if (Array.isArray(data) && data.length > 0) {
          console.log(`   Sample: ${JSON.stringify(data[0], null, 2).substring(0, 200)}...`);
        }
      } catch (error) {
        console.log(`❌ ${filePath}: Error reading - ${error.message}`);
      }
    } else {
      console.log(`⚠️  ${filePath}: File not found`);
    }
    console.log('');
  });
}

// Check trucking sync service
function checkTruckingSyncService() {
  console.log('🔄 Checking Trucking Sync Service:\n');
  
  const syncServicePath = 'src/services/trucking-sync.ts';
  if (fs.existsSync(syncServicePath)) {
    const content = fs.readFileSync(syncServicePath, 'utf8');
    console.log('✅ Trucking sync service exists');
    
    // Check for key sync functions
    const syncFunctions = [
      'syncTruckingData',
      'loadTruckingData',
      'saveTruckingData',
      'syncDeliveryOrders'
    ];
    
    syncFunctions.forEach(func => {
      if (content.includes(func)) {
        console.log(`   ✅ ${func} function found`);
      } else {
        console.log(`   ❌ ${func} function missing`);
      }
    });
  } else {
    console.log('❌ Trucking sync service not found');
    console.log('   Need to create trucking-sync.ts service');
  }
  console.log('');
}

// Check storage service usage in trucking
function checkStorageServiceUsage() {
  console.log('💾 Checking Storage Service Usage in Trucking:\n');
  
  const truckingFiles = [
    'src/pages/Trucking/Shipments/DeliveryOrders.tsx',
    'src/pages/Trucking/Master/Customers.tsx',
    'src/pages/Trucking/Master/Vehicles.tsx',
    'src/pages/Trucking/Master/Drivers.tsx',
    'src/pages/Trucking/Master/Routes.tsx'
  ];
  
  truckingFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Check storage service usage
      const hasStorageService = content.includes('storageService');
      const hasGet = content.includes('storageService.get');
      const hasSet = content.includes('storageService.set');
      
      console.log(`📄 ${path.basename(filePath)}:`);
      console.log(`   Storage Service: ${hasStorageService ? '✅' : '❌'}`);
      console.log(`   Get operations: ${hasGet ? '✅' : '❌'}`);
      console.log(`   Set operations: ${hasSet ? '✅' : '❌'}`);
      
      // Check for trucking-specific keys
      const truckingKeys = [
        'trucking_delivery_orders',
        'trucking_customers',
        'trucking_vehicles',
        'trucking_drivers',
        'trucking_routes'
      ];
      
      truckingKeys.forEach(key => {
        if (content.includes(key)) {
          console.log(`   Key "${key}": ✅`);
        }
      });
      
    } else {
      console.log(`❌ ${filePath}: File not found`);
    }
    console.log('');
  });
}

// Main execution
async function main() {
  try {
    checkLocalTruckingData();
    checkServerData();
    checkTruckingSyncService();
    checkStorageServiceUsage();
    
    console.log('🎯 Analysis Summary:');
    console.log('1. Check if trucking data files exist in data/localStorage/');
    console.log('2. Check if server data exists in data/server/trucking/');
    console.log('3. Verify trucking-sync.ts service exists and has proper functions');
    console.log('4. Ensure DeliveryOrders.tsx uses correct storage keys');
    console.log('5. Check cross-device sync mechanism for trucking data');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error.message);
  }
}

main();