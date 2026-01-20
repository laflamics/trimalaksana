#!/usr/bin/env node

/**
 * Debug extractStorageValue Function
 * 
 * Script untuk mendiagnosis masalah extractStorageValue yang mungkin menyebabkan
 * BOM data tidak terbaca saat initial load
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Debug extractStorageValue Function...\n');

// Simulate extractStorageValue function from storage.ts
const extractStorageValue = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  
  // Simple: Handle wrapped object {value: [...], timestamp: ...}
  if (data && typeof data === 'object' && 'value' in data) {
    const extracted = data.value;
    if (Array.isArray(extracted)) return extracted;
    if (!extracted || (typeof extracted === 'object' && Object.keys(extracted).length === 0)) return [];
  }
  
  return [];
};

// Test with actual BOM data
const bomPath = path.join(__dirname, 'data/localStorage/bom.json');
if (!fs.existsSync(bomPath)) {
  console.log('❌ BOM file not found');
  process.exit(1);
}

const bomFileContent = fs.readFileSync(bomPath, 'utf8');
console.log('📄 Raw BOM file content (first 500 chars):');
console.log(bomFileContent.substring(0, 500) + '...\n');

// Parse JSON
let bomData;
try {
  bomData = JSON.parse(bomFileContent);
  console.log('✅ JSON parsing successful');
} catch (error) {
  console.log('❌ JSON parsing failed:', error.message);
  process.exit(1);
}

console.log('📊 BOM data structure:');
console.log('• Type:', typeof bomData);
console.log('• Is Array:', Array.isArray(bomData));
console.log('• Has "value" property:', 'value' in bomData);
console.log('• Keys:', Object.keys(bomData));

if ('value' in bomData) {
  console.log('• Value type:', typeof bomData.value);
  console.log('• Value is Array:', Array.isArray(bomData.value));
  if (Array.isArray(bomData.value)) {
    console.log('• Value length:', bomData.value.length);
  }
}

// Test extractStorageValue
console.log('\n🧪 Testing extractStorageValue:');
const extracted = extractStorageValue(bomData);
console.log('• Extracted type:', typeof extracted);
console.log('• Extracted is Array:', Array.isArray(extracted));
console.log('• Extracted length:', extracted.length);

if (extracted.length > 0) {
  console.log('• First item:', JSON.stringify(extracted[0], null, 2));
  console.log('✅ extractStorageValue works correctly');
} else {
  console.log('❌ extractStorageValue returned empty array');
  
  // Debug why it's empty
  console.log('\n🔍 Debugging empty result:');
  console.log('• bomData:', JSON.stringify(bomData, null, 2).substring(0, 1000));
}

// Test with different data formats
console.log('\n🧪 Testing different data formats:');

// Test 1: Direct array
const testArray = [{ id: 1, name: 'test' }];
const result1 = extractStorageValue(testArray);
console.log('• Direct array:', result1.length, 'items');

// Test 2: Wrapped object
const testWrapped = { value: [{ id: 1, name: 'test' }], timestamp: Date.now() };
const result2 = extractStorageValue(testWrapped);
console.log('• Wrapped object:', result2.length, 'items');

// Test 3: Empty value
const testEmpty = { value: [], timestamp: Date.now() };
const result3 = extractStorageValue(testEmpty);
console.log('• Empty value:', result3.length, 'items');

// Test 4: Null/undefined
const result4 = extractStorageValue(null);
const result5 = extractStorageValue(undefined);
console.log('• Null:', result4.length, 'items');
console.log('• Undefined:', result5.length, 'items');

// Simulate localStorage behavior
console.log('\n🧪 Simulating localStorage behavior:');
const localStorageKey = 'bom';
const localStorageValue = JSON.stringify(bomData);

console.log('• localStorage key:', localStorageKey);
console.log('• localStorage value length:', localStorageValue.length);

// Parse like localStorage would
const parsedFromStorage = JSON.parse(localStorageValue);
const extractedFromStorage = extractStorageValue(parsedFromStorage);

console.log('• Parsed from storage type:', typeof parsedFromStorage);
console.log('• Extracted from storage length:', extractedFromStorage.length);

if (extractedFromStorage.length !== extracted.length) {
  console.log('❌ Mismatch between direct and localStorage simulation!');
} else {
  console.log('✅ localStorage simulation matches direct extraction');
}

// Generate browser test code
console.log('\n🧪 Browser Console Test Code:');
console.log('Copy and paste this in browser console:\n');

console.log(`// Test extractStorageValue function
const extractStorageValue = (data) => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  
  if (data && typeof data === 'object' && 'value' in data) {
    const extracted = data.value;
    if (Array.isArray(extracted)) return extracted;
    if (!extracted || (typeof extracted === 'object' && Object.keys(extracted).length === 0)) return [];
  }
  
  return [];
};

// Test with actual localStorage data
const bomFromStorage = localStorage.getItem('bom');
console.log('BOM from localStorage:', bomFromStorage ? 'Found' : 'Not found');

if (bomFromStorage) {
  const parsed = JSON.parse(bomFromStorage);
  const extracted = extractStorageValue(parsed);
  console.log('Parsed BOM data:', parsed);
  console.log('Extracted BOM items:', extracted.length);
  console.log('First BOM item:', extracted[0]);
} else {
  console.log('No BOM data in localStorage - this is the problem!');
}

// Test storage service get method
// (This requires the actual storageService to be available)
// storageService.get('bom').then(data => {
//   console.log('StorageService BOM data:', data);
//   const extracted = extractStorageValue(data);
//   console.log('StorageService extracted:', extracted.length);
// });`);

console.log('\n💡 DIAGNOSIS:');
if (extracted.length > 0) {
  console.log('✅ extractStorageValue function works correctly');
  console.log('✅ BOM data structure is valid');
  console.log('🔍 Problem likely in:');
  console.log('  • localStorage not being populated');
  console.log('  • storageService.get() not working');
  console.log('  • React state not updating');
  console.log('  • Browser cache issues');
} else {
  console.log('❌ extractStorageValue function has issues');
  console.log('❌ BOM data structure might be invalid');
  console.log('🔧 Need to fix data structure first');
}

console.log('\n✅ Debug complete!');