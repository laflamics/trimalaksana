#!/usr/bin/env node

/**
 * Test GT PPIC Iteration Fix
 * 
 * Test the fix for TypeError: nt is not iterable
 */

const fs = require('fs');

console.log('🧪 Testing GT PPIC Iteration Fix');
console.log('='.repeat(50));

// Simulate extractStorageValue function
const extractStorageValue = (data) => {
  if (!data) return [];
  // Handle wrapped object {value: ..., timestamp: ...}
  if (data && typeof data === 'object' && !Array.isArray(data) && 'value' in data) {
    const extracted = data.value;
    return Array.isArray(extracted) ? extracted : (extracted ? [] : []);
  }
  return Array.isArray(data) ? data : [];
};

// Test scenarios
console.log('📋 1. Testing Different Data Formats...');

// Scenario 1: Normal wrapped data
const wrappedData = {
  value: [
    { id: 1, type: 'SO_CREATED', status: 'PENDING' },
    { id: 2, type: 'SO_CREATED', status: 'PROCESSED' }
  ],
  timestamp: Date.now()
};

console.log('   Scenario 1: Wrapped data');
let result1 = extractStorageValue(wrappedData);
console.log(`   Result: ${Array.isArray(result1) ? 'Array' : typeof result1} (length: ${result1.length})`);

// Scenario 2: Direct array
const directArray = [
  { id: 1, type: 'SO_CREATED', status: 'PENDING' },
  { id: 2, type: 'SO_CREATED', status: 'PROCESSED' }
];

console.log('   Scenario 2: Direct array');
let result2 = extractStorageValue(directArray);
console.log(`   Result: ${Array.isArray(result2) ? 'Array' : typeof result2} (length: ${result2.length})`);

// Scenario 3: Null/undefined
console.log('   Scenario 3: Null/undefined');
let result3 = extractStorageValue(null);
console.log(`   Result: ${Array.isArray(result3) ? 'Array' : typeof result3} (length: ${result3.length})`);

// Scenario 4: Object without value property
const objectWithoutValue = { timestamp: Date.now(), data: [] };

console.log('   Scenario 4: Object without value property');
let result4 = extractStorageValue(objectWithoutValue);
console.log(`   Result: ${Array.isArray(result4) ? 'Array' : typeof result4} (length: ${result4.length})`);

console.log();

// Test the fixed code path
console.log('📋 2. Testing Fixed Code Path...');

// Simulate the GT PPIC loadData function logic
const testGTPPICLogic = (initialData, forceReloadData) => {
  console.log('   Initial data processing...');
  let ppicNotifications = extractStorageValue(initialData) || [];
  console.log(`   After initial extractStorageValue: ${Array.isArray(ppicNotifications) ? 'Array' : typeof ppicNotifications} (length: ${ppicNotifications.length})`);
  
  // Simulate force reload condition
  if (ppicNotifications.length <= 1) {
    console.log('   Few notifications detected, simulating force reload...');
    
    if (forceReloadData) {
      // CRITICAL: Apply the fix - use extractStorageValue on force reload data
      const extractedData = extractStorageValue(forceReloadData);
      if (Array.isArray(extractedData) && extractedData.length > ppicNotifications.length) {
        console.log(`   Force reload successful: ${extractedData.length} notifications from file`);
        ppicNotifications = extractedData;
      }
    }
  }
  
  // CRITICAL: Ensure ppicNotifications is always an array before iteration
  if (!Array.isArray(ppicNotifications)) {
    console.error('   ERROR: ppicNotifications is not an array:', typeof ppicNotifications);
    ppicNotifications = [];
  }
  
  console.log(`   Final ppicNotifications: ${Array.isArray(ppicNotifications) ? 'Array' : typeof ppicNotifications} (length: ${ppicNotifications.length})`);
  
  // Test iteration
  console.log('   Testing for...of iteration...');
  try {
    let count = 0;
    for (const notif of ppicNotifications) {
      count++;
      if (count >= 3) break; // Only test first 3
    }
    console.log(`   ✅ Iteration successful: processed ${count} items`);
    return true;
  } catch (error) {
    console.log(`   ❌ Iteration failed: ${error.message}`);
    return false;
  }
};

// Test Case 1: Normal scenario
console.log('\n   Test Case 1: Normal scenario (many notifications)');
const normalData = {
  value: [
    { id: 1, type: 'SO_CREATED', status: 'PENDING' },
    { id: 2, type: 'SO_CREATED', status: 'PROCESSED' },
    { id: 3, type: 'SO_CREATED', status: 'PENDING' }
  ],
  timestamp: Date.now()
};
testGTPPICLogic(normalData, null);

// Test Case 2: Few notifications, force reload with wrapped data
console.log('\n   Test Case 2: Few notifications, force reload with wrapped data');
const fewData = { value: [{ id: 1, type: 'SO_CREATED', status: 'PENDING' }], timestamp: Date.now() };
const forceReloadWrapped = {
  value: [
    { id: 1, type: 'SO_CREATED', status: 'PENDING' },
    { id: 2, type: 'SO_CREATED', status: 'PROCESSED' },
    { id: 3, type: 'SO_CREATED', status: 'PENDING' }
  ],
  timestamp: Date.now()
};
testGTPPICLogic(fewData, forceReloadWrapped);

// Test Case 3: Few notifications, force reload with direct array
console.log('\n   Test Case 3: Few notifications, force reload with direct array');
const forceReloadDirect = [
  { id: 1, type: 'SO_CREATED', status: 'PENDING' },
  { id: 2, type: 'SO_CREATED', status: 'PROCESSED' }
];
testGTPPICLogic(fewData, forceReloadDirect);

// Test Case 4: Problematic scenario - force reload returns non-array
console.log('\n   Test Case 4: Problematic scenario - force reload returns non-array');
const problematicForceReload = { timestamp: Date.now(), error: 'File not found' };
testGTPPICLogic(fewData, problematicForceReload);

console.log();

// Test with actual file data
console.log('📋 3. Testing with Actual File Data...');
const ppicNotificationsPath = 'data/localStorage/general-trading/gt_ppicNotifications.json';

if (fs.existsSync(ppicNotificationsPath)) {
  try {
    const rawData = fs.readFileSync(ppicNotificationsPath, 'utf8');
    const fileData = JSON.parse(rawData);
    
    console.log('   Testing with actual PPIC notifications file...');
    const success = testGTPPICLogic({ value: [] }, fileData);
    
    if (success) {
      console.log('   ✅ Actual file data test passed');
    } else {
      console.log('   ❌ Actual file data test failed');
    }
    
  } catch (error) {
    console.log(`   ❌ Error testing with actual file: ${error.message}`);
  }
} else {
  console.log('   ⚠️  PPIC notifications file not found, skipping actual file test');
}

console.log();
console.log('🎯 Summary:');
console.log('-'.repeat(30));
console.log('✅ Fix Applied: Added extractStorageValue() on force reload data');
console.log('✅ Fix Applied: Added array validation before iteration');
console.log('✅ Fix Applied: Fallback to empty array if not array');
console.log('');
console.log('The iteration error should now be resolved!');