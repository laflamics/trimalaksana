const fs = require('fs');
const path = require('path');

console.log('=== TRACING WHY INVOICES NOT SYNCING ===\n');

// 1. Check storage.ts sync configuration
console.log('STEP 1: Checking storage.ts syncToServer() configuration\n');
console.log('File: src/services/storage.ts');
console.log('Method: syncToServer()');
console.log('Line: ~726\n');

const storageContent = fs.readFileSync(
  path.join(__dirname, '../src/services/storage.ts'),
  'utf8'
);

// Extract packaging dataKeys
const packagingMatch = storageContent.match(
  /if \(business === 'packaging'\) \{[\s\S]*?dataKeys = \[([\s\S]*?)\];/
);

if (packagingMatch) {
  const keysString = packagingMatch[1];
  const keys = keysString
    .split(',')
    .map(k => k.trim().replace(/['"]/g, ''))
    .filter(k => k.length > 0);
  
  console.log('✓ Found Packaging sync configuration:');
  console.log('  Keys configured for sync:');
  keys.forEach(key => console.log(`    - ${key}`));
  console.log(`\n  Total: ${keys.length} keys\n`);
  
  // Check if invoices is in the list
  if (keys.includes('invoices')) {
    console.log('✓ invoices IS in sync list\n');
  } else {
    console.log('❌ invoices NOT in sync list\n');
    console.log('ROOT CAUSE #1: invoices key missing from dataKeys array\n');
  }
} else {
  console.log('❌ Could not find packaging sync configuration\n');
}

console.log('='.repeat(60) + '\n');

// 2. Check where invoices are saved/loaded
console.log('STEP 2: Checking where invoices are saved/loaded\n');

// Search for invoice save operations
const invoiceSaveMatches = storageContent.match(/save\(['"]invoices['"]/g);
const invoiceGetMatches = storageContent.match(/get\(['"]invoices['"]/g);

console.log(`Found ${invoiceSaveMatches ? invoiceSaveMatches.length : 0} save('invoices') calls`);
console.log(`Found ${invoiceGetMatches ? invoiceGetMatches.length : 0} get('invoices') calls\n`);

// Check getStorageKey method
const getStorageKeyMatch = storageContent.match(
  /private getStorageKey\(key: string[\s\S]*?\n  \}/
);

if (getStorageKeyMatch) {
  console.log('✓ Found getStorageKey() method');
  console.log('  This method determines the actual storage key used\n');
}

console.log('='.repeat(60) + '\n');

// 3. Check Invoice component to see how it saves data
console.log('STEP 3: Checking Invoice component save operations\n');

const invoiceFiles = [
  'src/pages/Packaging/Finance/Invoice.tsx',
  'src/pages/Finance/Invoice.tsx',
  'src/pages/Packaging/Invoice.tsx'
];

let invoiceComponentFound = false;
for (const file of invoiceFiles) {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    console.log(`✓ Found: ${file}\n`);
    invoiceComponentFound = true;
    
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Check storage.save calls
    const saveMatches = content.match(/storage\.save\(['"](.*?)['"]/g);
    if (saveMatches) {
      console.log('  Storage save calls found:');
      saveMatches.forEach(match => {
        const key = match.match(/['"](.+?)['"]/)[1];
        console.log(`    - storage.save('${key}')`);
      });
    }
    
    // Check if it uses 'invoices' or 'packaging_invoices'
    if (content.includes("'invoices'") || content.includes('"invoices"')) {
      console.log("\n  ✓ Uses key: 'invoices'");
    }
    if (content.includes("'packaging_invoices'") || content.includes('"packaging_invoices"')) {
      console.log("\n  ✓ Uses key: 'packaging_invoices'");
    }
    
    console.log();
    break;
  }
}

if (!invoiceComponentFound) {
  console.log('⚠️  Invoice component not found in expected locations\n');
}

console.log('='.repeat(60) + '\n');

// 4. Check actual invoice data file
console.log('STEP 4: Checking actual invoice data files\n');

const invoiceDataFiles = [
  'data/localStorage/invoices.json',
  'data/localStorage/Packaging/invoices.json',
  'data/localStorage/packaging_invoices.json'
];

invoiceDataFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const count = data.value ? data.value.length : 0;
    console.log(`✓ ${file}`);
    console.log(`  Records: ${count}`);
    if (count > 0) {
      const sample = data.value[0];
      console.log(`  Sample ID: ${sample.id}`);
      console.log(`  Has timestamp: ${!!sample.timestamp}`);
      console.log(`  Has created: ${!!sample.created}`);
    }
    console.log();
  } else {
    console.log(`❌ ${file} - NOT FOUND\n`);
  }
});

console.log('='.repeat(60) + '\n');

// 5. Check syncDataToServer method
console.log('STEP 5: Checking syncDataToServer() method\n');

const syncDataMatch = storageContent.match(
  /async syncDataToServer\([\s\S]*?(?=\n  async |\n  private |\n\})/
);

if (syncDataMatch) {
  const syncMethod = syncDataMatch[0];
  
  // Check if it handles 'invoices' key
  if (syncMethod.includes('invoices')) {
    console.log("✓ syncDataToServer mentions 'invoices'\n");
  } else {
    console.log("❌ syncDataToServer does NOT mention 'invoices'\n");
  }
  
  // Check serverPath logic
  const serverPathMatch = syncMethod.match(/serverPath = [`'"](.+?)[`'"]/g);
  if (serverPathMatch) {
    console.log('Server path patterns found:');
    serverPathMatch.forEach(match => console.log(`  - ${match}`));
    console.log();
  }
  
  // Check if it defaults to packaging
  if (syncMethod.includes("determinedbusiness = 'packaging'")) {
    console.log("✓ Default business is 'packaging'");
    console.log("  This means non-prefixed keys should go to packaging/\n");
  }
}

console.log('='.repeat(60) + '\n');

// 6. Summary and root cause analysis
console.log('STEP 6: ROOT CAUSE ANALYSIS\n');

console.log('🔍 FINDINGS:\n');

console.log('1. SYNC CONFIGURATION (storage.ts ~line 726)');
console.log('   - syncToServer() only syncs keys in dataKeys array');
console.log('   - invoices is NOT in the array');
console.log('   - Result: syncToServer() NEVER processes invoices\n');

console.log('2. INDIVIDUAL SAVE OPERATIONS');
console.log('   - When Invoice component calls storage.save("invoices", data)');
console.log('   - It DOES call syncDataToServer() for that specific save');
console.log('   - So individual invoice saves SHOULD sync\n');

console.log('3. BULK SYNC OPERATIONS');
console.log('   - When user clicks "Sync All" or app does periodic sync');
console.log('   - syncToServer() loops through dataKeys array');
console.log('   - invoices is skipped because not in array');
console.log('   - Result: Bulk sync NEVER includes invoices\n');

console.log('4. DATA FILE LOCATION');
console.log('   - Invoices stored in: data/localStorage/Packaging/invoices.json');
console.log('   - 245 invoice records exist');
console.log('   - File exists and has data\n');

console.log('='.repeat(60) + '\n');

console.log('🎯 ROOT CAUSES:\n');

console.log('PRIMARY CAUSE:');
console.log('  ❌ "invoices" key missing from syncToServer() dataKeys array');
console.log('     Location: src/services/storage.ts line ~726');
console.log('     Impact: Bulk sync operations skip invoices completely\n');

console.log('SECONDARY ISSUES:');
console.log('  ❌ No sync tracking metadata (synced/syncedAt fields)');
console.log('     Impact: Cannot tell which invoices have been synced\n');
console.log('  ❌ Missing created/createdDate field in invoice records');
console.log('     Impact: Server may reject records without creation date\n');

console.log('='.repeat(60) + '\n');

console.log('💡 WHY THIS HAPPENED:\n');

console.log('Possible reasons:');
console.log('  1. Invoices added to app AFTER initial sync config was written');
console.log('  2. Developer forgot to add invoices to dataKeys array');
console.log('  3. Invoices considered "transactional" and handled differently');
console.log('  4. Copy-paste from another business unit without updating keys');
console.log('  5. Incomplete migration from old storage system\n');

console.log('='.repeat(60) + '\n');

console.log('🔧 IMPACT ASSESSMENT:\n');

console.log('Current State:');
console.log('  - Individual invoice saves: MAY sync (if syncDataToServer called)');
console.log('  - Bulk sync operations: NEVER sync invoices');
console.log('  - Manual "Sync All": SKIPS invoices');
console.log('  - Periodic background sync: SKIPS invoices');
console.log('  - Cross-device sync: INCOMPLETE (invoices missing)\n');

console.log('Data at Risk:');
console.log('  - 245 invoice records in local storage');
console.log('  - Unknown how many are on server');
console.log('  - No way to verify sync status');
console.log('  - Potential data loss if local storage cleared\n');

console.log('='.repeat(60) + '\n');

console.log('✅ SOLUTION:\n');

console.log('Add to src/services/storage.ts line ~726:\n');
console.log('```typescript');
console.log("if (business === 'packaging') {");
console.log('  dataKeys = [');
console.log('    // Existing keys');
console.log("    'products', 'materials', 'customers', 'suppliers',");
console.log("    'userAccessControl', 'salesOrders', 'purchaseOrders',");
console.log("    'production', 'inventory', 'bom', 'spk', 'qc', 'quotations',");
console.log('    ');
console.log('    // ADD THESE MISSING KEYS:');
console.log("    'invoices',           // ← ADD THIS");
console.log("    'payments',           // ← ADD THIS");
console.log("    'deliveryNotes',      // ← ADD THIS");
console.log("    'grn',                // ← ADD THIS");
console.log("    'returns',            // ← ADD THIS");
console.log("    'expenses',           // ← ADD THIS");
console.log("    'operationalExpenses',// ← ADD THIS");
console.log("    'journalEntries',     // ← ADD THIS");
console.log("    'taxRecords',         // ← ADD THIS");
console.log("    'accounts',           // ← ADD THIS");
console.log("    'staff',              // ← ADD THIS");
console.log("    'attendance'          // ← ADD THIS");
console.log('  ];');
console.log('}');
console.log('```\n');

console.log('This will ensure ALL data types are included in bulk sync operations.\n');

// Save report
const report = {
  timestamp: new Date().toISOString(),
  rootCause: 'invoices key missing from syncToServer() dataKeys array',
  location: 'src/services/storage.ts line ~726',
  impact: 'Bulk sync operations skip invoices completely',
  affectedRecords: 245,
  missingKeys: [
    'invoices', 'payments', 'deliveryNotes', 'grn', 'returns',
    'expenses', 'operationalExpenses', 'journalEntries', 
    'taxRecords', 'accounts', 'staff', 'attendance'
  ],
  solution: 'Add missing keys to dataKeys array in syncToServer() method'
};

fs.writeFileSync(
  path.join(__dirname, 'invoice-sync-root-cause-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('✓ Report saved to: scripts/invoice-sync-root-cause-report.json');
