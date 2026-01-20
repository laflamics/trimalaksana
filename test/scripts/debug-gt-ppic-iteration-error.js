#!/usr/bin/env node

/**
 * Debug GT PPIC Iteration Error
 * 
 * Error: TypeError: nt is not iterable
 * Kemungkinan penyebab:
 * 1. Force reload mengembalikan object bukan array
 * 2. Data structure tidak konsisten setelah force reload
 * 3. Loop mencoba iterate over non-array data
 */

const fs = require('fs');

console.log('🔍 Debugging GT PPIC Iteration Error');
console.log('='.repeat(50));

// Check PPIC notifications data structure
console.log('📋 1. Checking PPIC Notifications Data Structure...');
const ppicNotificationsPath = 'data/localStorage/general-trading/gt_ppicNotifications.json';

if (fs.existsSync(ppicNotificationsPath)) {
  try {
    const rawData = fs.readFileSync(ppicNotificationsPath, 'utf8');
    console.log('   Raw file content (first 200 chars):');
    console.log(`   ${rawData.substring(0, 200)}...`);
    
    const data = JSON.parse(rawData);
    console.log(`   Parsed data type: ${typeof data}`);
    console.log(`   Is array: ${Array.isArray(data)}`);
    
    if (data && typeof data === 'object') {
      console.log(`   Object keys: ${Object.keys(data).join(', ')}`);
      
      if (data.value) {
        console.log(`   data.value type: ${typeof data.value}`);
        console.log(`   data.value is array: ${Array.isArray(data.value)}`);
        
        if (Array.isArray(data.value)) {
          console.log(`   data.value length: ${data.value.length}`);
          if (data.value.length > 0) {
            console.log('   First notification structure:');
            console.log(`   ${JSON.stringify(data.value[0], null, 2).substring(0, 300)}...`);
          }
        } else {
          console.log(`   ❌ data.value is not an array: ${data.value}`);
        }
      }
    }
    
  } catch (error) {
    console.log(`   ❌ Error parsing JSON: ${error.message}`);
  }
} else {
  console.log('   ❌ PPIC notifications file not found');
}

console.log();

// Check GT PPIC code for iteration patterns
console.log('📋 2. Checking GT PPIC Iteration Patterns...');
const gtPPICPath = 'src/pages/GeneralTrading/PPIC.tsx';

if (fs.existsSync(gtPPICPath)) {
  const content = fs.readFileSync(gtPPICPath, 'utf8');
  
  // Find iteration patterns
  const forLoops = content.match(/for\s*\([^)]*of\s+[^)]*\)/g) || [];
  const mapCalls = content.match(/\.map\s*\(/g) || [];
  const filterCalls = content.match(/\.filter\s*\(/g) || [];
  const forEachCalls = content.match(/\.forEach\s*\(/g) || [];
  
  console.log(`   for...of loops: ${forLoops.length}`);
  console.log(`   .map() calls: ${mapCalls.length}`);
  console.log(`   .filter() calls: ${filterCalls.length}`);
  console.log(`   .forEach() calls: ${forEachCalls.length}`);
  
  // Check specific patterns around ppicNotifications
  const ppicIterations = content.match(/ppicNotifications[^;]*\.(map|filter|forEach|for)/g) || [];
  console.log(`   ppicNotifications iterations: ${ppicIterations.length}`);
  
  if (ppicIterations.length > 0) {
    console.log('   Found ppicNotifications iterations:');
    ppicIterations.forEach((pattern, index) => {
      console.log(`     ${index + 1}. ${pattern}`);
    });
  }
  
  // Check for...of loops with ppicNotifications
  const forOfMatches = content.match(/for\s*\([^)]*of\s+ppicNotifications[^)]*\)/g) || [];
  if (forOfMatches.length > 0) {
    console.log('   Found for...of loops with ppicNotifications:');
    forOfMatches.forEach((match, index) => {
      console.log(`     ${index + 1}. ${match}`);
    });
  }
  
} else {
  console.log('   ❌ GT PPIC file not found');
}

console.log();

// Check extractStorageValue function
console.log('📋 3. Checking extractStorageValue Function...');
const storagePath = 'src/services/storage.ts';

if (fs.existsSync(storagePath)) {
  const content = fs.readFileSync(storagePath, 'utf8');
  
  // Find extractStorageValue function
  const extractFunctionMatch = content.match(/export const extractStorageValue[^}]*}/s);
  if (extractFunctionMatch) {
    console.log('   extractStorageValue function found:');
    console.log(`   ${extractFunctionMatch[0].substring(0, 300)}...`);
  } else {
    console.log('   ❌ extractStorageValue function not found');
  }
  
} else {
  console.log('   ❌ Storage service file not found');
}

console.log();

// Simulate the problematic code path
console.log('📋 4. Simulating Problematic Code Path...');

try {
  // Simulate what happens in GT PPIC
  const rawData = fs.readFileSync(ppicNotificationsPath, 'utf8');
  const data = JSON.parse(rawData);
  
  // Simulate extractStorageValue
  const extractStorageValue = (data) => {
    if (!data) return [];
    if (data && typeof data === 'object' && !Array.isArray(data) && 'value' in data) {
      const extracted = data.value;
      return Array.isArray(extracted) ? extracted : (extracted ? [] : []);
    }
    return Array.isArray(data) ? data : [];
  };
  
  console.log('   Simulating force reload scenario...');
  
  // Scenario 1: Normal get
  let ppicNotifications = extractStorageValue(data) || [];
  console.log(`   After extractStorageValue: ${Array.isArray(ppicNotifications) ? 'Array' : typeof ppicNotifications} (length: ${ppicNotifications.length})`);
  
  // Scenario 2: Force reload returns different format
  const mockForceReloadData = data.value || data; // Simulate what forceReloadFromFile might return
  console.log(`   Mock force reload data type: ${Array.isArray(mockForceReloadData) ? 'Array' : typeof mockForceReloadData}`);
  
  if (mockForceReloadData && Array.isArray(mockForceReloadData) && mockForceReloadData.length > ppicNotifications.length) {
    ppicNotifications = mockForceReloadData;
    console.log(`   After force reload: ${Array.isArray(ppicNotifications) ? 'Array' : typeof ppicNotifications} (length: ${ppicNotifications.length})`);
  }
  
  // Test iteration
  console.log('   Testing iteration...');
  if (Array.isArray(ppicNotifications)) {
    console.log(`   ✅ Can iterate: ${ppicNotifications.length} items`);
    
    // Test for...of
    let count = 0;
    for (const notif of ppicNotifications) {
      count++;
      if (count >= 3) break; // Only test first 3
    }
    console.log(`   ✅ for...of works: processed ${count} items`);
    
  } else {
    console.log(`   ❌ Cannot iterate: ${typeof ppicNotifications}`);
  }
  
} catch (error) {
  console.log(`   ❌ Simulation error: ${error.message}`);
}

console.log();

// Recommendations
console.log('💡 5. Likely Issues & Solutions:');
console.log('-'.repeat(40));
console.log('❌ Force reload might return object instead of array');
console.log('❌ Missing array validation after force reload');
console.log('❌ extractStorageValue not handling force reload data properly');
console.log('');
console.log('✅ Solutions:');
console.log('1. Add array validation after force reload');
console.log('2. Ensure forceReloadFromFile returns proper array');
console.log('3. Add safety checks before iteration');
console.log('4. Use extractStorageValue on force reload data');

console.log();
console.log('🔧 Recommended Fix:');
console.log('-'.repeat(20));
console.log('```typescript');
console.log('if (ppicNotifications.length <= 1) {');
console.log('  const fileData = await storageService.forceReloadFromFile<any[]>("gt_ppicNotifications");');
console.log('  if (fileData) {');
console.log('    // Ensure we extract array properly');
console.log('    const extractedData = extractStorageValue(fileData);');
console.log('    if (Array.isArray(extractedData) && extractedData.length > ppicNotifications.length) {');
console.log('      ppicNotifications = extractedData;');
console.log('    }');
console.log('  }');
console.log('}');
console.log('```');