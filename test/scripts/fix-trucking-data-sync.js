/**
 * Fix trucking data sync issue
 * Copy data dari root localStorage ke trucking folder dengan format yang benar
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Trucking Data Sync Issue...\n');

async function fixTruckingDataSync() {
  try {
    // Data mapping dari root ke trucking folder
    const dataMapping = [
      {
        source: 'data/localStorage/trucking_customers.json',
        target: 'data/localStorage/trucking/trucking_customers.json',
        name: 'Customers'
      },
      {
        source: 'data/localStorage/trucking_vehicles.json',
        target: 'data/localStorage/trucking/trucking_vehicles.json',
        name: 'Vehicles'
      },
      {
        source: 'data/localStorage/trucking_drivers.json',
        target: 'data/localStorage/trucking/trucking_drivers.json',
        name: 'Drivers'
      },
      {
        source: 'data/localStorage/trucking_routes.json',
        target: 'data/localStorage/trucking/trucking_routes.json',
        name: 'Routes'
      }
    ];

    for (const mapping of dataMapping) {
      console.log(`📋 Processing ${mapping.name}...`);
      
      if (fs.existsSync(mapping.source)) {
        try {
          // Read source data
          const sourceData = JSON.parse(fs.readFileSync(mapping.source, 'utf8'));
          console.log(`   ✅ Source data loaded: ${Array.isArray(sourceData.value) ? sourceData.value.length : 'object'} items`);
          
          // Create proper structure for target
          const targetData = {
            value: sourceData.value || sourceData,
            timestamp: Date.now(),
            _timestamp: Date.now()
          };
          
          // Write to target
          fs.writeFileSync(mapping.target, JSON.stringify(targetData, null, 2));
          console.log(`   ✅ Data synced to ${mapping.target}`);
          
        } catch (error) {
          console.log(`   ❌ Error processing ${mapping.name}: ${error.message}`);
        }
      } else {
        console.log(`   ⚠️  Source file not found: ${mapping.source}`);
      }
      console.log('');
    }

    // Verify the fix
    console.log('🔍 Verifying the fix...\n');
    
    for (const mapping of dataMapping) {
      if (fs.existsSync(mapping.target)) {
        try {
          const data = JSON.parse(fs.readFileSync(mapping.target, 'utf8'));
          const itemCount = Array.isArray(data.value) ? data.value.length : 'object';
          console.log(`✅ ${mapping.name}: ${itemCount} items available`);
        } catch (error) {
          console.log(`❌ ${mapping.name}: Error reading - ${error.message}`);
        }
      } else {
        console.log(`❌ ${mapping.name}: Target file not found`);
      }
    }

    console.log('\n🎯 Fix Summary:');
    console.log('- Copied trucking master data from root localStorage to trucking folder');
    console.log('- Fixed data structure format to match expected format');
    console.log('- Updated timestamps for proper sync');
    console.log('- DeliveryOrders.tsx should now be able to load master data properly');
    
    console.log('\n✅ Trucking data sync fix completed!');
    console.log('📱 Please test the trucking delivery orders page to verify master data is now visible.');

  } catch (error) {
    console.error('❌ Error during fix:', error.message);
  }
}

// Run the fix
fixTruckingDataSync();