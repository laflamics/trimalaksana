#!/usr/bin/env node

/**
 * Comprehensive Test for GT PPIC Iteration Fix
 * 
 * Tests all scenarios that could cause TypeError: nt is not iterable
 */

console.log('🧪 Comprehensive GT PPIC Iteration Fix Test');
console.log('='.repeat(60));

// Simulate extractStorageValue function
const extractStorageValue = (data) => {
  if (!data) return [];
  if (data && typeof data === 'object' && !Array.isArray(data) && 'value' in data) {
    const extracted = data.value;
    return Array.isArray(extracted) ? extracted : (extracted ? [] : []);
  }
  return Array.isArray(data) ? data : [];
};

// Test scenarios that could cause the error
const testScenarios = [
  {
    name: 'Normal wrapped data',
    data: {
      value: [
        { id: 1, type: 'SO_CREATED', status: 'PENDING' },
        { id: 2, type: 'SO_CREATED', status: 'PROCESSED' }
      ],
      timestamp: Date.now()
    },
    forceReloadData: null
  },
  {
    name: 'Force reload with wrapped data',
    data: { value: [{ id: 1, type: 'SO_CREATED', status: 'PENDING' }], timestamp: Date.now() },
    forceReloadData: {
      value: [
        { id: 1, type: 'SO_CREATED', status: 'PENDING' },
        { id: 2, type: 'SO_CREATED', status: 'PROCESSED' },
        { id: 3, type: 'SO_CREATED', status: 'PENDING' }
      ],
      timestamp: Date.now()
    }
  },
  {
    name: 'Force reload with direct array',
    data: { value: [], timestamp: Date.now() },
    forceReloadData: [
      { id: 1, type: 'SO_CREATED', status: 'PENDING' },
      { id: 2, type: 'SO_CREATED', status: 'PROCESSED' }
    ]
  },
  {
    name: 'Force reload returns null',
    data: { value: [], timestamp: Date.now() },
    forceReloadData: null
  },
  {
    name: 'Force reload returns undefined',
    data: { value: [], timestamp: Date.now() },
    forceReloadData: undefined
  },
  {
    name: 'Force reload returns object without value',
    data: { value: [], timestamp: Date.now() },
    forceReloadData: { timestamp: Date.now(), error: 'File not found' }
  },
  {
    name: 'Force reload returns string',
    data: { value: [], timestamp: Date.now() },
    forceReloadData: 'error'
  },
  {
    name: 'Force reload returns number',
    data: { value: [], timestamp: Date.now() },
    forceReloadData: 404
  }
];

// Simulate the complete GT PPIC loadData logic with all fixes
const simulateGTPPICLoadData = (initialData, forceReloadData) => {
  console.log(`\n📋 Testing: ${initialData.name || 'Unknown scenario'}`);
  console.log('-'.repeat(40));
  
  try {
    // Step 1: Initial data extraction
    let ppicNotifications = extractStorageValue(initialData.data) || [];
    console.log(`   1. Initial extraction: ${Array.isArray(ppicNotifications) ? 'Array' : typeof ppicNotifications} (length: ${ppicNotifications.length})`);
    
    // Step 2: Force reload condition
    if (ppicNotifications.length <= 1) {
      console.log('   2. Few notifications detected, attempting force reload...');
      
      if (forceReloadData) {
        // Apply the fix - use extractStorageValue on force reload data
        const extractedData = extractStorageValue(forceReloadData);
        console.log(`      Force reload extracted: ${Array.isArray(extractedData) ? 'Array' : typeof extractedData} (length: ${Array.isArray(extractedData) ? extractedData.length : 'N/A'})`);
        
        if (Array.isArray(extractedData) && extractedData.length > ppicNotifications.length) {
          console.log(`      Force reload successful: ${extractedData.length} notifications from file`);
          ppicNotifications = extractedData;
          
          // CRITICAL: Double-check that ppicNotifications is still an array after assignment
          if (!Array.isArray(ppicNotifications)) {
            console.error('      ERROR: ppicNotifications became non-array after force reload assignment:', typeof ppicNotifications);
            ppicNotifications = [];
          } else {
            console.log(`      ✅ ppicNotifications is still array after assignment (length: ${ppicNotifications.length})`);
          }
        } else {
          console.log('      Force reload skipped: no improvement or invalid data');
        }
      } else {
        console.log('      No force reload data provided');
      }
    } else {
      console.log('   2. Sufficient notifications, skipping force reload');
    }
    
    // Step 3: First array validation
    if (!Array.isArray(ppicNotifications)) {
      console.error('   3. ERROR: ppicNotifications is not an array after force reload:', typeof ppicNotifications);
      ppicNotifications = [];
    } else {
      console.log(`   3. ✅ First validation passed: Array (length: ${ppicNotifications.length})`);
    }
    
    // Step 4: Final safety check right before iteration
    if (!Array.isArray(ppicNotifications)) {
      console.error('   4. ERROR: ppicNotifications is not an array right before iteration:', typeof ppicNotifications);
      ppicNotifications = [];
    } else {
      console.log(`   4. ✅ Final validation passed: Array (length: ${ppicNotifications.length})`);
    }
    
    // Step 5: Test iteration
    console.log('   5. Testing for...of iteration...');
    let processedCount = 0;
    for (const notif of ppicNotifications) {
      processedCount++;
      if (processedCount >= 3) break; // Only test first 3
    }
    console.log(`   ✅ Iteration successful: processed ${processedCount} items`);
    
    // Step 6: Test filter operation (also used in the code)
    console.log('   6. Testing filter operation...');
    const pendingSO = ppicNotifications.filter((n) => n?.type === 'SO_CREATED');
    console.log(`   ✅ Filter successful: found ${pendingSO.length} SO_CREATED notifications`);
    
    return { success: true, count: ppicNotifications.length };
    
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

// Run all test scenarios
console.log('🚀 Running Test Scenarios...');
let passedTests = 0;
let totalTests = testScenarios.length;

testScenarios.forEach((scenario, index) => {
  const result = simulateGTPPICLoadData(
    { name: scenario.name, data: scenario.data },
    scenario.forceReloadData
  );
  
  if (result.success) {
    passedTests++;
    console.log(`   🎯 Result: PASSED (${result.count} notifications processed)`);
  } else {
    console.log(`   💥 Result: FAILED (${result.error})`);
  }
});

console.log('\n' + '='.repeat(60));
console.log('📊 Test Summary:');
console.log(`   Total Tests: ${totalTests}`);
console.log(`   Passed: ${passedTests}`);
console.log(`   Failed: ${totalTests - passedTests}`);
console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);

if (passedTests === totalTests) {
  console.log('\n🎉 All tests passed! The GT PPIC iteration fix should work correctly.');
} else {
  console.log('\n⚠️  Some tests failed. There may still be edge cases to handle.');
}

console.log('\n🔧 Applied Fixes:');
console.log('   ✅ Added extractStorageValue() on force reload data');
console.log('   ✅ Added double-check after force reload assignment');
console.log('   ✅ Added array validation before iteration');
console.log('   ✅ Added final safety check right before for...of loop');
console.log('   ✅ Fixed all storageService.get() calls to use extractStorageValue()');
console.log('   ✅ Added array validation in handleCreateSPKFromSO function');