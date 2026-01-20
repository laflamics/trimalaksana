// Debug hasBOM Function Calls
console.log('🔍 Debugging hasBOM function calls...');

// Override console.log to catch hasBOM debug logs
const originalLog = console.log;
const hasBOMCalls = [];

console.log = function(...args) {
  // Capture hasBOM debug logs
  if (args[0] && args[0].includes && args[0].includes('[Products] 🔍 hasBOM check:')) {
    hasBOMCalls.push(args[1]);
  }
  return originalLog.apply(console, args);
};

// Wait a bit to collect logs
setTimeout(() => {
  console.log = originalLog; // Restore original
  
  console.log('📊 Captured hasBOM calls:', hasBOMCalls.length);
  
  // Analyze problem products
  const problemProducts = hasBOMCalls.filter(call => 
    call.rawProductId === 'KRT02722' || 
    call.rawProductId === 'KRT04173' || 
    call.rawProductId === 'KRT04072' ||
    call.rawProductId === 'KRT00199'
  );
  
  console.log('\n🎯 Problem Products Analysis:');
  problemProducts.forEach(call => {
    console.log(`${call.rawProductId}:`);
    console.log(`  • Product: ${call.productName}`);
    console.log(`  • Raw ID: ${call.rawProductId}`);
    console.log(`  • Normalized: ${call.normalizedProductId}`);
    console.log(`  • hasBOM: ${call.hasBOM}`);
    console.log(`  • BOM Set Size: ${call.bomSetSize}`);
  });
  
  // Check for duplicates (same product called multiple times)
  const duplicates = {};
  hasBOMCalls.forEach(call => {
    const key = call.rawProductId;
    if (!duplicates[key]) duplicates[key] = 0;
    duplicates[key]++;
  });
  
  console.log('\n🔄 Duplicate Calls:');
  Object.entries(duplicates).forEach(([id, count]) => {
    if (count > 1) {
      console.log(`${id}: called ${count} times`);
    }
  });
  
  // Check BOM Set Size consistency
  const bomSizes = [...new Set(hasBOMCalls.map(call => call.bomSetSize))];
  console.log('\n📊 BOM Set Sizes:', bomSizes);
  if (bomSizes.length > 1) {
    console.log('⚠️ BOM Set size is changing during execution!');
  }
  
  // Show all unique normalized IDs that returned false
  const falseResults = hasBOMCalls.filter(call => !call.hasBOM);
  const falseIds = [...new Set(falseResults.map(call => call.normalizedProductId))];
  console.log('\n❌ IDs that returned false:', falseIds.length);
  console.log('False IDs:', falseIds.slice(0, 10));
  
  // Show all unique normalized IDs that returned true
  const trueResults = hasBOMCalls.filter(call => call.hasBOM);
  const trueIds = [...new Set(trueResults.map(call => call.normalizedProductId))];
  console.log('\n✅ IDs that returned true:', trueIds.length);
  console.log('True IDs:', trueIds.slice(0, 10));
  
}, 2000);

console.log('⏳ Collecting hasBOM calls for 2 seconds...');
console.log('Scroll through the products table to trigger more calls.');