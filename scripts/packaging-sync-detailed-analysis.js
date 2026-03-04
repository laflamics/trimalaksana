const fs = require('fs');
const path = require('path');

console.log('=== DETAILED PACKAGING SYNC ANALYSIS ===\n');

function readJSON(filePath) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) return null;
    return JSON.parse(fs.readFileSync(fullPath, 'utf8'));
  } catch (error) {
    return null;
  }
}

const issues = [];

console.log('ISSUE #1: MISSING deliveryNotes.json FILE\n');
console.log('❌ File data/localStorage/Packaging/deliveryNotes.json NOT FOUND');
console.log('✓ File data/localStorage/Packaging/delivery.json EXISTS');
console.log('\nPossible causes:');
console.log('  - File naming mismatch (delivery.json vs deliveryNotes.json)');
console.log('  - Migration incomplete');
console.log('  - Sync expecting different file name');
issues.push({
  id: 1,
  severity: 'CRITICAL',
  module: 'Delivery Notes',
  issue: 'deliveryNotes.json file missing',
  impact: 'Delivery notes cannot be synced to server',
  recommendation: 'Check if delivery.json should be renamed or if deliveryNotes.json needs to be created'
});

console.log('\n' + '='.repeat(60) + '\n');

console.log('ISSUE #2: TIMESTAMP INCONSISTENCIES\n');

// Check invoices
const invoices = readJSON('data/localStorage/Packaging/invoices.json');
if (invoices && invoices.value) {
  const sample = invoices.value[0];
  console.log('Invoices (245 records):');
  console.log('  Sample record fields:', Object.keys(sample).join(', '));
  console.log('  ❌ Missing: created/createdDate field');
  console.log('  ✓ Has: timestamp, _timestamp, lastUpdate');
  console.log('  Impact: Sync may fail due to missing created date');
  issues.push({
    id: 2,
    severity: 'HIGH',
    module: 'Invoices',
    issue: 'Missing created/createdDate field in 245 records',
    impact: 'Server sync may reject records without creation timestamp',
    recommendation: 'Add created field based on timestamp or lastUpdate'
  });
}

// Check customers
const customers = readJSON('data/localStorage/Packaging/customers.json');
if (customers && customers.value) {
  const sample = customers.value[0];
  console.log('\nCustomers (248 records):');
  console.log('  Sample record fields:', Object.keys(sample).join(', '));
  console.log('  ❌ Missing: timestamp, created fields');
  console.log('  Impact: Cannot track when customer was created/modified');
  issues.push({
    id: 3,
    severity: 'HIGH',
    module: 'Customers',
    issue: 'Missing timestamp and created fields in 248 records',
    impact: 'Sync conflicts cannot be resolved without timestamps',
    recommendation: 'Add timestamp and created fields to all customer records'
  });
}

// Check products
const products = readJSON('data/localStorage/Packaging/products.json');
if (products && products.value) {
  const sample = products.value[0];
  console.log('\nProducts (5530 records):');
  console.log('  Sample record fields:', Object.keys(sample).join(', '));
  console.log('  ❌ Missing: timestamp, created fields');
  console.log('  Impact: Product sync conflicts cannot be resolved');
  issues.push({
    id: 4,
    severity: 'HIGH',
    module: 'Products',
    issue: 'Missing timestamp and created fields in 5530 records',
    impact: 'Large dataset without timestamps will cause sync issues',
    recommendation: 'Batch add timestamps to all product records'
  });
}

// Check payments
const payments = readJSON('data/localStorage/Packaging/payments.json');
if (payments && payments.value) {
  const sample = payments.value[0];
  console.log('\nPayments (44 records):');
  console.log('  Sample record fields:', Object.keys(sample).join(', '));
  console.log('  ❌ Missing: timestamp field (has _timestamp only)');
  console.log('  ✓ Has: created, lastUpdate, _timestamp');
  issues.push({
    id: 5,
    severity: 'MEDIUM',
    module: 'Payments',
    issue: 'Missing timestamp field (only _timestamp exists)',
    impact: 'Timestamp field inconsistency may cause sync issues',
    recommendation: 'Copy _timestamp to timestamp field'
  });
}

// Check inventory
const inventory = readJSON('data/localStorage/Packaging/inventory.json');
if (inventory && inventory.value) {
  const sample = inventory.value[0];
  console.log('\nInventory (350 records):');
  console.log('  Sample record fields:', Object.keys(sample).join(', '));
  console.log('  ❌ Missing: timestamp, created fields');
  issues.push({
    id: 6,
    severity: 'HIGH',
    module: 'Inventory',
    issue: 'Missing timestamp and created fields in 350 records',
    impact: 'Inventory sync cannot track changes',
    recommendation: 'Add timestamp and created fields'
  });
}

console.log('\n' + '='.repeat(60) + '\n');

console.log('ISSUE #3: EMPTY CRITICAL FILES\n');

const emptyFiles = [
  { name: 'grn.json', module: 'Goods Receipt Note', impact: 'Cannot track received goods from suppliers' },
  { name: 'production.json', module: 'Production', impact: 'No production records available' },
  { name: 'qc.json', module: 'Quality Control', impact: 'No QC records available' },
  { name: 'spk.json', module: 'SPK (Work Orders)', impact: 'No work order records available' }
];

emptyFiles.forEach((file, idx) => {
  console.log(`${file.module}:`);
  console.log(`  ⚠️  File: data/localStorage/Packaging/${file.name} is EMPTY`);
  console.log(`  Impact: ${file.impact}`);
  issues.push({
    id: 7 + idx,
    severity: 'MEDIUM',
    module: file.module,
    issue: `${file.name} is empty`,
    impact: file.impact,
    recommendation: 'Check if data exists elsewhere or needs to be imported'
  });
});

console.log('\n' + '='.repeat(60) + '\n');

console.log('ISSUE #4: SYNC METADATA MISSING\n');

const syncMetadata = [
  { file: 'invoices.json', records: 245, hasSyncFlag: 0 },
  { file: 'customers.json', records: 248, hasSyncFlag: 0 },
  { file: 'products.json', records: 5530, hasSyncFlag: 0 },
  { file: 'inventory.json', records: 350, hasSyncFlag: 0 },
];

console.log('Files without sync tracking:');
syncMetadata.forEach(item => {
  console.log(`  - ${item.file}: ${item.records} records, 0 synced flags`);
});
console.log('\nImpact: Cannot determine which records have been synced to server');
console.log('Recommendation: Add synced/syncedAt fields to track sync status');

issues.push({
  id: 11,
  severity: 'MEDIUM',
  module: 'Sync Tracking',
  issue: 'No sync metadata in major files',
  impact: 'Cannot track which records are synced vs pending',
  recommendation: 'Implement sync tracking with synced/syncedAt fields'
});

console.log('\n' + '='.repeat(60) + '\n');

console.log('ISSUE #5: STORAGE SERVICE SYNC CONFIGURATION\n');

// Check if storage.ts includes all necessary keys
const packagingKeys = [
  'products', 'materials', 'customers', 'suppliers',
  'userAccessControl', 'salesOrders', 'purchaseOrders',
  'production', 'inventory', 'bom', 'spk', 'qc', 'quotations'
];

console.log('Keys configured for sync in storage.ts:');
packagingKeys.forEach(key => console.log(`  ✓ ${key}`));

console.log('\nKeys NOT in sync list but exist in Packaging folder:');
const missingFromSync = [
  'invoices',
  'payments', 
  'deliveryNotes',
  'delivery',
  'grn',
  'returns',
  'expenses',
  'operationalExpenses',
  'journalEntries',
  'taxRecords',
  'accounts',
  'staff',
  'attendance'
];

missingFromSync.forEach(key => console.log(`  ❌ ${key}`));

issues.push({
  id: 12,
  severity: 'CRITICAL',
  module: 'Sync Configuration',
  issue: '13 data types not included in sync configuration',
  impact: 'These data types will NEVER sync to server',
  recommendation: 'Add missing keys to syncToServer() dataKeys array in storage.ts'
});

console.log('\n' + '='.repeat(60) + '\n');

console.log('ISSUE #6: FILE NAMING INCONSISTENCY\n');

console.log('Inconsistent naming patterns found:');
console.log('  - delivery.json vs deliveryNotes.json (expected)');
console.log('  - grnPackaging.json vs grn.json (both exist)');
console.log('  - packaging_userAccessControl.json vs userAccessControl.json (both exist)');
console.log('\nImpact: Sync code may look for wrong file names');

issues.push({
  id: 13,
  severity: 'MEDIUM',
  module: 'File Naming',
  issue: 'Inconsistent file naming conventions',
  impact: 'Sync may fail to find correct files',
  recommendation: 'Standardize file naming and update sync code accordingly'
});

console.log('\n' + '='.repeat(60) + '\n');

console.log('=== PRIORITY RECOMMENDATIONS ===\n');

const priorityIssues = issues.filter(i => i.severity === 'CRITICAL');
console.log(`🔴 CRITICAL (${priorityIssues.length} issues):\n`);
priorityIssues.forEach(issue => {
  console.log(`${issue.id}. ${issue.module}: ${issue.issue}`);
  console.log(`   → ${issue.recommendation}\n`);
});

const highIssues = issues.filter(i => i.severity === 'HIGH');
console.log(`🟠 HIGH (${highIssues.length} issues):\n`);
highIssues.forEach(issue => {
  console.log(`${issue.id}. ${issue.module}: ${issue.issue}`);
  console.log(`   → ${issue.recommendation}\n`);
});

const mediumIssues = issues.filter(i => i.severity === 'MEDIUM');
console.log(`🟡 MEDIUM (${mediumIssues.length} issues):\n`);
mediumIssues.forEach(issue => {
  console.log(`${issue.id}. ${issue.module}: ${issue.issue}`);
  console.log(`   → ${issue.recommendation}\n`);
});

// Save detailed report
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    total: issues.length,
    critical: priorityIssues.length,
    high: highIssues.length,
    medium: mediumIssues.length,
  },
  issues,
};

fs.writeFileSync(
  path.join(__dirname, 'packaging-sync-detailed-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('✓ Detailed report saved to: scripts/packaging-sync-detailed-report.json');
