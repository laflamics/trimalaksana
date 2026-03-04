const fs = require('fs');
const path = require('path');

console.log('=== VERIFYING SYNC KEYS UPDATE ===\n');

// Read storage.ts
const storageContent = fs.readFileSync(
  path.join(__dirname, '../src/services/storage.ts'),
  'utf8'
);

// Extract packaging dataKeys
const packagingMatch = storageContent.match(
  /if \(business === 'packaging'\) \{[\s\S]*?dataKeys = \[([\s\S]*?)\];/
);

if (!packagingMatch) {
  console.log('❌ Could not find packaging sync configuration\n');
  process.exit(1);
}

const keysString = packagingMatch[1];
const keys = keysString
  .split(',')
  .map(k => k.trim().replace(/['"]/g, '').replace(/\/\/.*/g, '').trim())
  .filter(k => k.length > 0);

console.log('✓ Found Packaging sync configuration\n');
console.log(`Total keys: ${keys.length}\n`);

// Expected keys
const expectedKeys = [
  // Original keys
  'products', 'materials', 'customers', 'suppliers',
  'userAccessControl', 'salesOrders', 'purchaseOrders',
  'production', 'inventory', 'bom', 'spk', 'qc', 'quotations',
  // Newly added keys
  'invoices', 'payments', 'deliveryNotes', 'grn', 'returns',
  'expenses', 'operationalExpenses', 'journalEntries', 'taxRecords',
  'accounts', 'staff', 'attendance'
];

console.log('VERIFICATION RESULTS:\n');

let allPresent = true;
const missing = [];
const extra = [];

// Check if all expected keys are present
expectedKeys.forEach(key => {
  if (keys.includes(key)) {
    console.log(`✓ ${key}`);
  } else {
    console.log(`❌ ${key} - MISSING`);
    missing.push(key);
    allPresent = false;
  }
});

// Check for extra keys not in expected list
keys.forEach(key => {
  if (!expectedKeys.includes(key)) {
    extra.push(key);
  }
});

console.log('\n' + '='.repeat(60) + '\n');

if (allPresent && extra.length === 0) {
  console.log('✅ SUCCESS! All keys are present and correct.\n');
} else {
  if (missing.length > 0) {
    console.log(`❌ Missing keys (${missing.length}):`);
    missing.forEach(key => console.log(`   - ${key}`));
    console.log();
  }
  if (extra.length > 0) {
    console.log(`⚠️  Extra keys found (${extra.length}):`);
    extra.forEach(key => console.log(`   - ${key}`));
    console.log();
  }
}

console.log('SUMMARY:\n');
console.log(`  Expected keys: ${expectedKeys.length}`);
console.log(`  Found keys: ${keys.length}`);
console.log(`  Missing: ${missing.length}`);
console.log(`  Extra: ${extra.length}`);
console.log();

// Check specific critical keys
console.log('CRITICAL KEYS CHECK:\n');
const criticalKeys = ['invoices', 'payments', 'deliveryNotes'];
criticalKeys.forEach(key => {
  if (keys.includes(key)) {
    console.log(`  ✓ ${key} - NOW SYNCING`);
  } else {
    console.log(`  ❌ ${key} - STILL NOT SYNCING`);
  }
});

console.log('\n' + '='.repeat(60) + '\n');

// Compare with General Trading
const gtMatch = storageContent.match(
  /if \(business === 'general-trading'\) \{[\s\S]*?dataKeys = \[([\s\S]*?)\];/
);

if (gtMatch) {
  const gtKeysString = gtMatch[1];
  const gtKeys = gtKeysString
    .split(',')
    .map(k => k.trim().replace(/['"]/g, '').replace(/\/\/.*/g, '').trim())
    .filter(k => k.length > 0);
  
  console.log('COMPARISON WITH GENERAL TRADING:\n');
  console.log(`  Packaging keys: ${keys.length}`);
  console.log(`  General Trading keys: ${gtKeys.length}`);
  console.log();
  
  // Check if GT has invoices and payments
  const gtHasInvoices = gtKeys.some(k => k.includes('invoice'));
  const gtHasPayments = gtKeys.some(k => k.includes('payment'));
  const pkgHasInvoices = keys.includes('invoices');
  const pkgHasPayments = keys.includes('payments');
  
  console.log('  Financial Data Sync:');
  console.log(`    GT Invoices: ${gtHasInvoices ? '✓' : '❌'}`);
  console.log(`    GT Payments: ${gtHasPayments ? '✓' : '❌'}`);
  console.log(`    Packaging Invoices: ${pkgHasInvoices ? '✓' : '❌'}`);
  console.log(`    Packaging Payments: ${pkgHasPayments ? '✓' : '❌'}`);
  console.log();
  
  if (pkgHasInvoices && pkgHasPayments) {
    console.log('  ✅ Packaging now has financial data sync like GT!\n');
  }
}

console.log('='.repeat(60) + '\n');

if (allPresent) {
  console.log('🎉 UPDATE SUCCESSFUL!\n');
  console.log('Next steps:');
  console.log('  1. Test sync functionality');
  console.log('  2. Verify data appears on server');
  console.log('  3. Check for any sync errors in console');
  console.log('  4. Monitor sync performance with 12 additional keys\n');
} else {
  console.log('⚠️  UPDATE INCOMPLETE\n');
  console.log('Please check the missing keys and update storage.ts\n');
}

// Save report
const report = {
  timestamp: new Date().toISOString(),
  success: allPresent && extra.length === 0,
  totalKeys: keys.length,
  expectedKeys: expectedKeys.length,
  missing,
  extra,
  keys
};

fs.writeFileSync(
  path.join(__dirname, 'sync-keys-verification-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('✓ Report saved to: scripts/sync-keys-verification-report.json\n');
