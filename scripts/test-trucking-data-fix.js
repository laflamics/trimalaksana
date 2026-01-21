/**
 * Test script untuk verifikasi fix trucking data sync
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Trucking Data Fix...\n');

async function testTruckingDataFix() {
  try {
    console.log('📋 Checking Trucking Master Data:\n');

    // Test data files
    const testFiles = [
      {
        path: 'data/localStorage/trucking/trucking_customers.json',
        name: 'Customers',
        expectedFields: ['kode', 'nama', 'alamat']
      },
      {
        path: 'data/localStorage/trucking/trucking_vehicles.json',
        name: 'Vehicles',
        expectedFields: ['vehicleNo', 'vehicleType', 'brand']
      },
      {
        path: 'data/localStorage/trucking/trucking_drivers.json',
        name: 'Drivers',
        expectedFields: ['name', 'licenseNo']
      },
      {
        path: 'data/localStorage/trucking/trucking_routes.json',
        name: 'Routes',
        expectedFields: ['routeName', 'origin', 'destination']
      },
      {
        path: 'data/localStorage/trucking/trucking_delivery_orders.json',
        name: 'Delivery Orders',
        expectedFields: ['doNo', 'customerName', 'items']
      }
    ];

    let allTestsPassed = true;

    for (const testFile of testFiles) {
      console.log(`🔍 Testing ${testFile.name}...`);
      
      if (fs.existsSync(testFile.path)) {
        try {
          const data = JSON.parse(fs.readFileSync(testFile.path, 'utf8'));
          
          // Check data structure
          if (data.value && Array.isArray(data.value)) {
            const items = data.value;
            console.log(`   ✅ Data structure: OK (${items.length} items)`);
            
            if (items.length > 0) {
              // Check first item has expected fields
              const firstItem = items[0];
              const hasExpectedFields = testFile.expectedFields.every(field => 
                firstItem.hasOwnProperty(field)
              );
              
              if (hasExpectedFields) {
                console.log(`   ✅ Data fields: OK`);
                console.log(`   📄 Sample: ${JSON.stringify(firstItem, null, 2).substring(0, 150)}...`);
              } else {
                console.log(`   ❌ Data fields: Missing expected fields`);
                console.log(`   Expected: ${testFile.expectedFields.join(', ')}`);
                console.log(`   Found: ${Object.keys(firstItem).join(', ')}`);
                allTestsPassed = false;
              }
            } else {
              console.log(`   ⚠️  Data is empty`);
            }
            
            // Check timestamp
            if (data.timestamp && data._timestamp) {
              console.log(`   ✅ Timestamps: OK`);
            } else {
              console.log(`   ❌ Timestamps: Missing`);
              allTestsPassed = false;
            }
            
          } else {
            console.log(`   ❌ Data structure: Invalid (expected {value: array})`);
            allTestsPassed = false;
          }
          
        } catch (error) {
          console.log(`   ❌ Error reading file: ${error.message}`);
          allTestsPassed = false;
        }
      } else {
        console.log(`   ❌ File not found: ${testFile.path}`);
        allTestsPassed = false;
      }
      
      console.log('');
    }

    // Test cross-device sync compatibility
    console.log('🔄 Testing Cross-Device Sync Compatibility:\n');
    
    const syncTestFiles = [
      'data/localStorage/trucking/trucking_customers.json',
      'data/localStorage/trucking/trucking_vehicles.json'
    ];
    
    for (const filePath of syncTestFiles) {
      if (fs.existsSync(filePath)) {
        try {
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          
          // Check sync-required fields
          const hasTimestamp = data.timestamp && typeof data.timestamp === 'number';
          const has_Timestamp = data._timestamp && typeof data._timestamp === 'number';
          const hasValue = data.value !== undefined;
          
          if (hasTimestamp && has_Timestamp && hasValue) {
            console.log(`✅ ${path.basename(filePath)}: Sync compatible`);
          } else {
            console.log(`❌ ${path.basename(filePath)}: Not sync compatible`);
            console.log(`   timestamp: ${hasTimestamp}, _timestamp: ${has_Timestamp}, value: ${hasValue}`);
            allTestsPassed = false;
          }
        } catch (error) {
          console.log(`❌ ${path.basename(filePath)}: Error - ${error.message}`);
          allTestsPassed = false;
        }
      }
    }

    console.log('\n🎯 Test Summary:');
    if (allTestsPassed) {
      console.log('✅ All tests PASSED!');
      console.log('📱 Trucking master data should now be visible in DeliveryOrders page');
      console.log('🔄 Data is properly formatted for cross-device sync');
      console.log('');
      console.log('Next steps:');
      console.log('1. Open trucking delivery orders page');
      console.log('2. Create new delivery order');
      console.log('3. Verify that customer, vehicle, driver, and route dropdowns are populated');
      console.log('4. Test on another device to verify sync works');
    } else {
      console.log('❌ Some tests FAILED!');
      console.log('Please check the errors above and run fix-trucking-data-sync.js again');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testTruckingDataFix();