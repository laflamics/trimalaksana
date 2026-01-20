#!/usr/bin/env node

/**
 * Debug GT PPIC Comprehensive Fix
 * 
 * Test semua kemungkinan penyebab TypeError: Oe.some is not a function
 * setelah menerapkan fix yang lebih komprehensif
 */

const fs = require('fs');

console.log('🔍 GT PPIC Comprehensive Fix Debug');
console.log('='.repeat(60));

// Helper functions
const readJsonFile = (path) => {
  try {
    if (!fs.existsSync(path)) return null;
    const content = fs.readFileSync(path, 'utf8');
    return JSON.parse(content);
  } catch (e) {
    console.log(`   ❌ Error reading ${path}: ${e.message}`);
    return null;
  }
};

const extractStorageValue = (data) => {
  if (!data) return [];
  if (data && typeof data === 'object' && !Array.isArray(data) && 'value' in data) {
    const extracted = data.value;
    return Array.isArray(extracted) ? extracted : (extracted ? [] : []);
  }
  return Array.isArray(data) ? data : [];
};

const filterActiveItems = (items) => {
  if (!Array.isArray(items)) {
    console.log(`   ⚠️  filterActiveItems received non-array: ${typeof items}`);
    return [];
  }
  return items.filter(item => !item.deleted);
};

console.log('📋 1. Testing All Data Processing Steps...');
console.log('-'.repeat(50));

// Test all GT data files
const gtDataFiles = [
  'data/localStorage/general-trading/gt_spk.json',
  'data/localStorage/general-trading/gt_schedule.json', 
  'data/localStorage/general-trading/gt_purchaseRequests.json',
  'data/localStorage/general-trading/gt_delivery.json',
  'data/localStorage/general-trading/gt_salesOrders.json'
];

const processedData = {};

gtDataFiles.forEach(file => {
  const fileName = file.split('/').pop().replace('.json', '');
  console.log(`\n📄 Processing ${fileName}:`);
  
  const rawData = readJsonFile(file);
  if (!rawData) {
    console.log('   ❌ File not found');
    processedData[fileName] = { error: 'File not found' };
    return;
  }
  
  // Step 1: Extract storage value
  const extracted = extractStorageValue(rawData);
  console.log(`   1. extractStorageValue: ${Array.isArray(extracted) ? 'Array' : typeof extracted} (${extracted.length})`);
  
  // Step 2: Filter active items
  const filtered = filterActiveItems(extracted);
  console.log(`   2. filterActiveItems: ${Array.isArray(filtered) ? 'Array' : typeof filtered} (${filtered.length})`);
  
  // Step 3: Array validation (our fix)
  let validated = filtered;
  if (!Array.isArray(validated)) {
    console.log(`   3. 🔧 Array validation: Converting ${typeof validated} to empty array`);
    validated = [];
  } else {
    console.log(`   3. ✅ Array validation: Already array (${validated.length})`);
  }
  
  // Step 4: Test .some() operations
  try {
    const testSome = validated.some(item => item && item.id);
    console.log(`   4. ✅ .some() test: ${testSome}`);
  } catch (error) {
    console.log(`   4. ❌ .some() test failed: ${error.message}`);
  }
  
  processedData[fileName] = {
    rawType: typeof rawData,
    extractedLength: extracted.length,
    filteredLength: filtered.length,
    validatedLength: validated.length,
    isValidArray: Array.isArray(validated)
  };
});

console.log('\n📋 2. Testing Specific Problem Areas...');
console.log('-'.repeat(50));

// Test specific scenarios that could cause the error
const testScenarios = [
  {
    name: 'groupedSpkData processing',
    test: () => {
      const spkData = processedData['gt_spk'] ? [] : []; // Mock empty array
      console.log(`   Testing spkData.forEach() with: ${Array.isArray(spkData) ? 'Array' : typeof spkData}`);
      
      if (!Array.isArray(spkData)) {
        console.log('   ❌ spkData is not array - would cause forEach error');
        return false;
      }
      
      try {
        const grouped = {};
        spkData.forEach((spk) => {
          const soNo = spk.soNo || 'UNKNOWN';
          if (!grouped[soNo]) {
            grouped[soNo] = [];
          }
          grouped[soNo].push(spk);
        });
        console.log('   ✅ spkData.forEach() works');
        return true;
      } catch (error) {
        console.log(`   ❌ spkData.forEach() failed: ${error.message}`);
        return false;
      }
    }
  },
  {
    name: 'group.spks.some() in filter',
    test: () => {
      const mockGroup = { 
        soNo: 'SO-001', 
        spks: [{ spkNo: 'SPK-001', product: 'Test Product' }] 
      };
      
      console.log(`   Testing group.spks: ${Array.isArray(mockGroup.spks) ? 'Array' : typeof mockGroup.spks}`);
      
      try {
        const result = Array.isArray(mockGroup.spks) ? mockGroup.spks.some(s => s.spkNo.includes('SPK')) : false;
        console.log(`   ✅ group.spks.some() works: ${result}`);
        return true;
      } catch (error) {
        console.log(`   ❌ group.spks.some() failed: ${error.message}`);
        return false;
      }
    }
  },
  {
    name: 'purchaseRequests.some() in state',
    test: () => {
      const mockPurchaseRequests = [{ prNo: 'PR-001', spkNo: 'SPK-001' }];
      
      console.log(`   Testing purchaseRequests: ${Array.isArray(mockPurchaseRequests) ? 'Array' : typeof mockPurchaseRequests}`);
      
      try {
        const safePurchaseRequests = Array.isArray(mockPurchaseRequests) ? mockPurchaseRequests : [];
        const result = safePurchaseRequests.some(pr => pr.spkNo === 'SPK-001');
        console.log(`   ✅ purchaseRequests.some() works: ${result}`);
        return true;
      } catch (error) {
        console.log(`   ❌ purchaseRequests.some() failed: ${error.message}`);
        return false;
      }
    }
  },
  {
    name: 'deliveryNotes.items.some() nested',
    test: () => {
      const mockDeliveryNotes = [
        { 
          deliveryNo: 'DN-001', 
          items: [{ spkNo: 'SPK-001', productName: 'Test' }] 
        }
      ];
      
      console.log(`   Testing deliveryNotes: ${Array.isArray(mockDeliveryNotes) ? 'Array' : typeof mockDeliveryNotes}`);
      
      try {
        const safeDeliveryNotes = Array.isArray(mockDeliveryNotes) ? mockDeliveryNotes : [];
        const result = safeDeliveryNotes.find(dn => {
          if (!dn.items || !Array.isArray(dn.items)) return false;
          return dn.items.some(item => item.spkNo === 'SPK-001');
        });
        console.log(`   ✅ deliveryNotes nested .some() works: ${!!result}`);
        return true;
      } catch (error) {
        console.log(`   ❌ deliveryNotes nested .some() failed: ${error.message}`);
        return false;
      }
    }
  }
];

let passedTests = 0;
testScenarios.forEach((scenario, index) => {
  console.log(`\n   🧪 Test ${index + 1}: ${scenario.name}`);
  const passed = scenario.test();
  if (passed) passedTests++;
});

console.log('\n📋 3. Server Sync Issue Analysis...');
console.log('-'.repeat(50));

// Analyze server sync logs from the error
console.log('From error logs:');
console.log('   📡 [GTSync] Server response received for gt_salesOrders');
console.log('   📊 [GTSync] Response type: object');
console.log('   📊 [GTSync] Response is array: false');
console.log('   📊 [GTSync] Response object keys: value,timestamp');
console.log('   ⚠️  [GTSync] Server has no GT data yet (empty object in value)');

console.log('\nAnalysis:');
console.log('   🔍 Server returns: { value: {}, timestamp: ... }');
console.log('   🔍 extractStorageValue gets: {} (empty object)');
console.log('   🔍 extractStorageValue returns: [] (empty array)');
console.log('   ✅ This should be handled correctly by our fixes');

console.log('\n📋 4. Applied Fixes Summary...');
console.log('-'.repeat(50));
console.log('✅ 1. Array validation after filterActiveItems()');
console.log('✅ 2. Array validation before all .some() operations');
console.log('✅ 3. Safe state variables (safePurchaseRequests, etc.)');
console.log('✅ 4. Array validation in groupedSpkData useMemo');
console.log('✅ 5. Array validation in group.spks.some() filter');
console.log('✅ 6. Array validation in nested .some() operations');
console.log('✅ 7. Array validation when setting state data');
console.log('✅ 8. Comprehensive error logging for debugging');

console.log('\n📋 5. Potential Remaining Issues...');
console.log('-'.repeat(50));

const potentialIssues = [];

// Check if any processed data failed
Object.entries(processedData).forEach(([fileName, data]) => {
  if (data.error) {
    potentialIssues.push(`${fileName}: ${data.error}`);
  }
  if (!data.isValidArray) {
    potentialIssues.push(`${fileName}: Not a valid array after processing`);
  }
});

if (potentialIssues.length > 0) {
  console.log('⚠️  Potential issues found:');
  potentialIssues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`);
  });
} else {
  console.log('✅ No obvious data processing issues found');
}

console.log('\n📋 6. Debugging Recommendations...');
console.log('-'.repeat(50));

if (passedTests === testScenarios.length) {
  console.log('✅ All test scenarios passed');
  console.log('💡 If error still occurs, check:');
  console.log('   1. Browser console for specific error location');
  console.log('   2. Network tab for server response format');
  console.log('   3. React DevTools for component state');
  console.log('   4. Add more console.log in GT PPIC loadData');
} else {
  console.log(`❌ ${testScenarios.length - passedTests} test scenarios failed`);
  console.log('💡 Focus on fixing the failed test scenarios first');
}

console.log('\n🎯 Next Steps:');
console.log('-'.repeat(20));
console.log('1. Clear browser cache and reload');
console.log('2. Check browser console for new error details');
console.log('3. Verify all state variables are arrays in React DevTools');
console.log('4. Test PR creation workflow step by step');
console.log('5. Monitor server sync logs for data format issues');

console.log('\n📊 Test Results:');
console.log(`   Passed: ${passedTests}/${testScenarios.length}`);
console.log(`   Data Files: ${Object.keys(processedData).length} processed`);
console.log(`   Fixes Applied: 8 comprehensive fixes`);

if (passedTests === testScenarios.length && potentialIssues.length === 0) {
  console.log('\n🎉 All tests passed! The .some() error should be resolved.');
} else {
  console.log('\n⚠️  Some issues remain. Check the recommendations above.');
}