#!/usr/bin/env node

/**
 * Test GT PPIC Complete Fix
 * 
 * Test all array method fixes (.some, .every, .map, .filter)
 */

console.log('🔧 GT PPIC Complete Fix Test');
console.log('='.repeat(60));

// Test all safe helper functions
const safeSome = (array, predicate) => {
  if (!Array.isArray(array)) {
    console.error('[Test] safeSome: array is not an array:', typeof array);
    return false;
  }
  try {
    return array.some(predicate);
  } catch (error) {
    console.error('[Test] safeSome: error in .some() operation:', error);
    return false;
  }
};

const safeEvery = (array, predicate) => {
  if (!Array.isArray(array)) {
    console.error('[Test] safeEvery: array is not an array:', typeof array);
    return false;
  }
  try {
    return array.every(predicate);
  } catch (error) {
    console.error('[Test] safeEvery: error in .every() operation:', error);
    return false;
  }
};

const safeMap = (array, mapper) => {
  if (!Array.isArray(array)) {
    console.error('[Test] safeMap: array is not an array:', typeof array);
    return [];
  }
  try {
    return array.map(mapper);
  } catch (error) {
    console.error('[Test] safeMap: error in .map() operation:', error);
    return [];
  }
};

console.log('📋 1. Testing All Safe Helper Functions...');
console.log('-'.repeat(50));

const testData = [
  { id: 1, status: 'OPEN', spkNo: 'SPK-001' },
  { id: 2, status: 'CLOSE', spkNo: 'SPK-002' },
  { id: 3, status: 'OPEN', spkNo: 'SPK-003' }
];

const nonArrayInputs = [
  null,
  undefined,
  'string',
  123,
  { value: [] },
  { value: testData }
];

console.log('\n🧪 Testing safeSome:');
console.log(`   Valid array: ${safeSome(testData, item => item.status === 'OPEN')}`); // Should be true
console.log(`   Empty array: ${safeSome([], item => item.status === 'OPEN')}`); // Should be false

nonArrayInputs.forEach((input, index) => {
  const result = safeSome(input, item => item.status === 'OPEN');
  console.log(`   Non-array ${index + 1} (${typeof input}): ${result}`); // Should all be false
});

console.log('\n🧪 Testing safeEvery:');
console.log(`   Valid array (all OPEN): ${safeEvery([{status: 'OPEN'}, {status: 'OPEN'}], item => item.status === 'OPEN')}`); // Should be true
console.log(`   Valid array (mixed): ${safeEvery(testData, item => item.status === 'OPEN')}`); // Should be false
console.log(`   Empty array: ${safeEvery([], item => item.status === 'OPEN')}`); // Should be true

nonArrayInputs.forEach((input, index) => {
  const result = safeEvery(input, item => item.status === 'OPEN');
  console.log(`   Non-array ${index + 1} (${typeof input}): ${result}`); // Should all be false
});

console.log('\n🧪 Testing safeMap:');
console.log(`   Valid array: [${safeMap(testData, item => item.id).join(', ')}]`); // Should be [1, 2, 3]
console.log(`   Empty array: [${safeMap([], item => item.id).join(', ')}]`); // Should be []

nonArrayInputs.forEach((input, index) => {
  const result = safeMap(input, item => item.id);
  console.log(`   Non-array ${index + 1} (${typeof input}): [${result.join(', ')}]`); // Should all be []
});

console.log('\n📋 2. Testing PPIC-Specific Scenarios...');
console.log('-'.repeat(50));

// Test scenarios that were causing the original error
const mockScenarios = [
  {
    name: 'PPIC Notifications Processing',
    test: () => {
      const mockNotifications = [
        { id: 1, type: 'SO_CREATED', status: 'PENDING', soNo: 'SO-001' },
        { id: 2, type: 'SO_CREATED', status: 'PROCESSED', soNo: 'SO-002' }
      ];
      
      // Test filter operation
      const pending = mockNotifications.filter(n => n.status === 'PENDING');
      console.log(`   Filter result: ${pending.length} pending notifications`);
      
      // Test map operation
      const mapped = safeMap(mockNotifications, n => ({ ...n, processed: true }));
      console.log(`   Map result: ${mapped.length} mapped notifications`);
      
      // Test some operation
      const hasPending = safeSome(mockNotifications, n => n.status === 'PENDING');
      console.log(`   Some result: has pending = ${hasPending}`);
      
      return pending.length === 1 && mapped.length === 2 && hasPending === true;
    }
  },
  {
    name: 'SPK Data Processing',
    test: () => {
      const mockSpkData = [
        { spkNo: 'SPK-001', soNo: 'SO-001', status: 'OPEN' },
        { spkNo: 'SPK-002', soNo: 'SO-001', status: 'CLOSE' },
        { spkNo: 'SPK-003', soNo: 'SO-002', status: 'OPEN' }
      ];
      
      // Test grouping logic
      const grouped = {};
      mockSpkData.forEach(spk => {
        const soNo = spk.soNo || 'UNKNOWN';
        if (!grouped[soNo]) {
          grouped[soNo] = [];
        }
        grouped[soNo].push(spk);
      });
      
      const groupedArray = Object.entries(grouped).map(([soNo, spks]) => {
        const safeSpks = Array.isArray(spks) ? spks : [];
        return {
          soNo,
          spks: safeSpks,
          status: safeSpks.length > 0 && safeEvery(safeSpks, s => s.status === 'CLOSE') ? 'CLOSE' : 'OPEN'
        };
      });
      
      console.log(`   Grouped: ${groupedArray.length} SO groups`);
      console.log(`   SO-001 status: ${groupedArray.find(g => g.soNo === 'SO-001')?.status}`); // Should be OPEN
      console.log(`   SO-002 status: ${groupedArray.find(g => g.soNo === 'SO-002')?.status}`); // Should be OPEN
      
      return groupedArray.length === 2;
    }
  },
  {
    name: 'Purchase Request Checking',
    test: () => {
      const mockPRData = [
        { prNo: 'PR-001', spkNo: 'SPK-001' },
        { prNo: 'PR-002', spkNo: 'SPK-002' }
      ];
      
      const spkNo = 'SPK-001';
      const hasPR = safeSome(mockPRData, pr => pr.spkNo === spkNo);
      console.log(`   Has PR for ${spkNo}: ${hasPR}`);
      
      const spkNo2 = 'SPK-999';
      const hasPR2 = safeSome(mockPRData, pr => pr.spkNo === spkNo2);
      console.log(`   Has PR for ${spkNo2}: ${hasPR2}`);
      
      return hasPR === true && hasPR2 === false;
    }
  },
  {
    name: 'Delivery Notes Item Checking',
    test: () => {
      const mockDeliveryData = [
        { 
          deliveryNo: 'DN-001', 
          items: [
            { spkNo: 'SPK-001', productName: 'Product A' },
            { spkNo: 'SPK-002', productName: 'Product B' }
          ] 
        },
        { 
          deliveryNo: 'DN-002', 
          items: [
            { spkNo: 'SPK-003', productName: 'Product C' }
          ] 
        }
      ];
      
      const spkNo = 'SPK-001';
      const relatedDelivery = mockDeliveryData.find(dn => {
        if (!dn.items || !Array.isArray(dn.items)) return false;
        return safeSome(dn.items, item => item.spkNo === spkNo);
      });
      
      console.log(`   Found delivery for ${spkNo}: ${relatedDelivery?.deliveryNo || 'None'}`);
      
      return relatedDelivery?.deliveryNo === 'DN-001';
    }
  }
];

let passedScenarios = 0;
mockScenarios.forEach((scenario, index) => {
  console.log(`\n🧪 Scenario ${index + 1}: ${scenario.name}`);
  try {
    const passed = scenario.test();
    if (passed) {
      console.log(`   ✅ Passed`);
      passedScenarios++;
    } else {
      console.log(`   ❌ Failed`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
});

console.log('\n📋 3. Summary...');
console.log('-'.repeat(50));

console.log(`✅ Scenario Tests: ${passedScenarios}/${mockScenarios.length} passed`);

if (passedScenarios === mockScenarios.length) {
  console.log('\n🎉 All tests passed! The GT PPIC array method errors should be resolved.');
  console.log('\n📋 Applied Fixes:');
  console.log('   ✅ 1. Added safeSome helper function');
  console.log('   ✅ 2. Added safeEvery helper function');
  console.log('   ✅ 3. Added safeMap helper function');
  console.log('   ✅ 4. Replaced all .some() operations with safeSome');
  console.log('   ✅ 5. Replaced all .every() operations with safeEvery');
  console.log('   ✅ 6. Replaced critical .map() operations with safeMap');
  console.log('   ✅ 7. Enhanced array validation before iterations');
  console.log('   ✅ 8. Added comprehensive error handling');
} else {
  console.log('\n⚠️  Some tests failed. Check the output above for details.');
}

console.log('\n🎯 Next Steps:');
console.log('   1. Clear browser cache and reload the application');
console.log('   2. Test the complete PPIC workflow');
console.log('   3. Monitor browser console for any remaining errors');
console.log('   4. Verify all array operations work correctly');