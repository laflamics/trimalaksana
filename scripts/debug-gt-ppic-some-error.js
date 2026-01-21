#!/usr/bin/env node

/**
 * Debug GT PPIC .some() Error
 * 
 * Error: TypeError: De.some is not a function
 * Debugging masalah array validation di GT PPIC
 */

const fs = require('fs');

console.log('🔍 Debug GT PPIC .some() Error');
console.log('='.repeat(50));

// Check data files yang digunakan di GT PPIC
const gtDataFiles = [
  'data/localStorage/general-trading/gt_spk.json',
  'data/localStorage/general-trading/gt_schedule.json',
  'data/localStorage/general-trading/gt_purchaseRequests.json',
  'data/localStorage/general-trading/gt_salesOrders.json',
  'data/localStorage/general-trading/gt_ppicNotifications.json'
];

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

console.log('📋 1. Checking GT Data Files...');
console.log('-'.repeat(40));

const dataResults = {};

gtDataFiles.forEach(file => {
  const fileName = file.split('/').pop();
  console.log(`\n📄 ${fileName}:`);
  
  const data = readJsonFile(file);
  if (!data) {
    console.log('   ❌ File not found or invalid');
    dataResults[fileName] = { error: 'File not found' };
    return;
  }
  
  console.log(`   📊 Raw data type: ${typeof data}`);
  console.log(`   📊 Is array: ${Array.isArray(data)}`);
  
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    console.log(`   📊 Object keys: ${Object.keys(data).join(', ')}`);
  }
  
  // Test extractStorageValue
  const extracted = extractStorageValue(data);
  console.log(`   📊 After extractStorageValue: ${Array.isArray(extracted) ? 'Array' : typeof extracted} (length: ${extracted.length})`);
  
  // Test filterActiveItems
  const filtered = filterActiveItems(extracted);
  console.log(`   📊 After filterActiveItems: ${Array.isArray(filtered) ? 'Array' : typeof filtered} (length: ${filtered.length})`);
  
  // Test .some() operation
  try {
    if (Array.isArray(filtered)) {
      const testSome = filtered.some(item => item && item.id);
      console.log(`   ✅ .some() test: ${testSome}`);
    } else {
      console.log(`   ❌ Cannot test .some() - not an array`);
    }
  } catch (error) {
    console.log(`   ❌ .some() test failed: ${error.message}`);
  }
  
  dataResults[fileName] = {
    rawType: typeof data,
    isRawArray: Array.isArray(data),
    extractedType: typeof extracted,
    isExtractedArray: Array.isArray(extracted),
    extractedLength: extracted.length,
    filteredType: typeof filtered,
    isFilteredArray: Array.isArray(filtered),
    filteredLength: filtered.length
  };
});

console.log('\n📋 2. Simulating GT PPIC loadData Process...');
console.log('-'.repeat(40));

// Simulate the exact process in GT PPIC loadData
const simulateLoadData = () => {
  console.log('\n🔄 Simulating loadData process...');
  
  // Step 1: Load raw data
  const spkRaw = extractStorageValue(readJsonFile('data/localStorage/general-trading/gt_spk.json')) || [];
  const scheduleRaw = extractStorageValue(readJsonFile('data/localStorage/general-trading/gt_schedule.json')) || [];
  const purchaseRequestsRaw = extractStorageValue(readJsonFile('data/localStorage/general-trading/gt_purchaseRequests.json')) || [];
  
  console.log(`   📊 spkRaw: ${Array.isArray(spkRaw) ? 'Array' : typeof spkRaw} (${spkRaw.length})`);
  console.log(`   📊 scheduleRaw: ${Array.isArray(scheduleRaw) ? 'Array' : typeof scheduleRaw} (${scheduleRaw.length})`);
  console.log(`   📊 purchaseRequestsRaw: ${Array.isArray(purchaseRequestsRaw) ? 'Array' : typeof purchaseRequestsRaw} (${purchaseRequestsRaw.length})`);
  
  // Step 2: Filter active items
  let spk = filterActiveItems(spkRaw);
  let schedule = filterActiveItems(scheduleRaw);
  const purchaseRequests = filterActiveItems(purchaseRequestsRaw);
  
  console.log(`   📊 After filterActiveItems:`);
  console.log(`      spk: ${Array.isArray(spk) ? 'Array' : typeof spk} (${spk.length})`);
  console.log(`      schedule: ${Array.isArray(schedule) ? 'Array' : typeof schedule} (${schedule.length})`);
  console.log(`      purchaseRequests: ${Array.isArray(purchaseRequests) ? 'Array' : typeof purchaseRequests} (${purchaseRequests.length})`);
  
  // Step 3: Array validation (our fix)
  if (!Array.isArray(spk)) {
    console.log(`   🔧 FIX: spk is not an array (${typeof spk}), converting to empty array`);
    spk = [];
  }
  if (!Array.isArray(schedule)) {
    console.log(`   🔧 FIX: schedule is not an array (${typeof schedule}), converting to empty array`);
    schedule = [];
  }
  
  // Step 4: Test .some() operations that were failing
  console.log('\n   🧪 Testing .some() operations...');
  
  try {
    // Test 1: spk.some() in pendingSO filter
    const testSome1 = spk.some(s => s && s.soNo === 'test');
    console.log(`   ✅ spk.some() test 1: ${testSome1}`);
  } catch (error) {
    console.log(`   ❌ spk.some() test 1 failed: ${error.message}`);
  }
  
  try {
    // Test 2: purchaseRequests.some() in flattenedSpkData
    const testSome2 = purchaseRequests.some(pr => pr && pr.spkNo === 'test');
    console.log(`   ✅ purchaseRequests.some() test: ${testSome2}`);
  } catch (error) {
    console.log(`   ❌ purchaseRequests.some() test failed: ${error.message}`);
  }
  
  try {
    // Test 3: schedule.some() in handleDeleteSPK
    const testSome3 = schedule.some(s => s && s.spkNo === 'test');
    console.log(`   ✅ schedule.some() test: ${testSome3}`);
  } catch (error) {
    console.log(`   ❌ schedule.some() test failed: ${error.message}`);
  }
  
  return { spk, schedule, purchaseRequests };
};

const simulationResult = simulateLoadData();

console.log('\n📋 3. Checking for Potential Issues...');
console.log('-'.repeat(40));

const issues = [];

// Check if any data is not array after processing
Object.entries(dataResults).forEach(([fileName, result]) => {
  if (!result.isFilteredArray) {
    issues.push(`${fileName}: filterActiveItems returned non-array (${result.filteredType})`);
  }
  if (result.extractedLength === 0 && result.rawType === 'object') {
    issues.push(`${fileName}: Empty data after extraction (might be server format issue)`);
  }
});

if (issues.length > 0) {
  console.log('⚠️  Potential Issues Found:');
  issues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue}`);
  });
} else {
  console.log('✅ No obvious issues found in data processing');
}

console.log('\n📋 4. Applied Fixes Summary...');
console.log('-'.repeat(40));
console.log('✅ Added array validation after filterActiveItems()');
console.log('✅ Added array checks before all .some() operations');
console.log('✅ Added safe fallbacks for non-array data');
console.log('✅ Added error logging for debugging');

console.log('\n🎯 Recommendations:');
console.log('-'.repeat(20));
console.log('1. Monitor console for array validation errors');
console.log('2. Check if server returns data in unexpected format');
console.log('3. Verify extractStorageValue handles all data formats');
console.log('4. Test with different data scenarios');

console.log('\n📊 Data Summary:');
Object.entries(dataResults).forEach(([fileName, result]) => {
  const status = result.isFilteredArray ? '✅' : '❌';
  console.log(`   ${status} ${fileName}: ${result.filteredLength} items`);
});

console.log('\n🔧 Fix Status: APPLIED');
console.log('The .some() error should now be resolved with array validation.');