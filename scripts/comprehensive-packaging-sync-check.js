const fs = require('fs');
const path = require('path');

console.log('=== COMPREHENSIVE PACKAGING SYNC CHECK ===\n');

// Read storage.ts
const storageContent = fs.readFileSync(
  path.join(__dirname, '../src/services/storage.ts'),
  'utf8'
);

const issues = [];

console.log('CHECK 1: syncToServer() Configuration\n');

// Extract syncToServer packaging keys
const syncToMatch = storageContent.match(
  /async syncToServer[\s\S]*?if \(business === 'packaging'\) \{[\s\S]*?dataKeys = \[([\s\S]*?)\];/
);

if (syncToMatch) {
  const keysString = syncToMatch[1];
  const syncToKeys = keysString
    .split(',')
    .map(k => k.trim().replace(/['"]/g, '').replace(/\/\/.*/g, '').trim())
    .filter(k => k.length > 0);
  
  console.log(`✓ syncToServer() found: ${syncToKeys.length} keys`);
  console.log('Keys:', syncToKeys.join(', '));
} else {
  console.log('❌ syncToServer() packaging config NOT FOUND');
  issues.push('syncToServer() packaging config missing');
}

console.log('\n' + '='.repeat(60) + '\n');

console.log('CHECK 2: syncFromServer() Configuration\n');

// Extract syncFromServer packaging keys
const syncFromMatch = storageContent.match(
  /async syncFromServer[\s\S]*?if \(business === 'packaging'\) \{[\s\S]*?dataKeys = \[([\s\S]*?)\];/
);

if (syncFromMatch) {
  const keysString = syncFromMatch[1];
  const syncFromKeys = keysString
    .split(',')
    .map(k => k.trim().replace(/['"]/g, '').replace(/\/\/.*/g, '').trim())
    .filter(k => k.length > 0);
  
  console.log(`✓ syncFromServer() found: ${syncFromKeys.length} keys`);
  console.log('Keys:', syncFromKeys.join(', '));
  
  // Compare with syncToServer
  if (syncToMatch) {
    const syncToKeys = syncToMatch[1]
      .split(',')
      .map(k => k.trim().replace(/['"]/g, '').replace(/\/\/.*/g, '').trim())
      .filter(k => k.length > 0);
    
    if (syncToKeys.length === syncFromKeys.length) {
      console.log('\n✓ CONSISTENT: Both methods have same number of keys');
    } else {
      console.log(`\n❌ INCONSISTENT: syncTo=${syncToKeys.length}, syncFrom=${syncFromKeys.length}`);
      issues.push(`Key count mismatch: syncTo=${syncToKeys.length}, syncFrom=${syncFromKeys.length}`);
    }
  }
} else {
  console.log('❌ syncFromServer() packaging config NOT FOUND');
  issues.push('syncFromServer() packaging config missing');
}

console.log('\n' + '='.repeat(60) + '\n');

console.log('CHECK 3: syncDataToServer() Path Logic\n');

// Check if syncDataToServer handles packaging correctly
const syncDataToServerMatch = storageContent.match(
  /async syncDataToServer\([\s\S]*?(?=\n  async |\n  private |\nclass )/
);

if (syncDataToServerMatch) {
  const method = syncDataToServerMatch[0];
  
  // Check for packaging path logic
  if (method.includes("serverPath = `packaging/${key}`")) {
    console.log("✓ Has packaging path: serverPath = `packaging/${key}`");
  } else if (method.includes("serverPath = 'packaging/'")) {
    console.log("✓ Has packaging path logic");
  } else {
    console.log("⚠️  Packaging path logic unclear");
    issues.push('Packaging path logic may be incorrect');
  }
  
  // Check for business determination
  if (method.includes("determinedbusiness = 'packaging'")) {
    console.log("✓ Has default business = 'packaging'");
  } else {
    console.log("⚠️  No default business fallback to packaging");
  }
  
  // Check for WebSocket usage
  if (method.includes('websocketClient.post')) {
    console.log('✓ Uses WebSocket for sync');
  } else if (method.includes('fetch(') || method.includes('axios')) {
    console.log('✓ Uses HTTP for sync');
  } else {
    console.log('⚠️  Sync method unclear');
  }
} else {
  console.log('❌ syncDataToServer() method NOT FOUND');
  issues.push('syncDataToServer() method missing');
}

console.log('\n' + '='.repeat(60) + '\n');

console.log('CHECK 4: syncDataFromServer() Path Logic\n');

// Check if syncDataFromServer handles packaging correctly
const syncDataFromServerMatch = storageContent.match(
  /private async syncDataFromServer\([\s\S]*?(?=\n  private async |\n  private |\n  async |\nclass )/
);

if (syncDataFromServerMatch) {
  const method = syncDataFromServerMatch[0];
  
  // Check for packaging path logic
  if (method.includes("serverPath = `packaging/${key}`")) {
    console.log("✓ Has packaging path: serverPath = `packaging/${key}`");
  } else {
    console.log("⚠️  Packaging path logic unclear");
  }
  
  // Check for WebSocket usage
  if (method.includes('websocketClient.get')) {
    console.log('✓ Uses WebSocket for download');
  } else {
    console.log('⚠️  Download method unclear');
  }
} else {
  console.log('❌ syncDataFromServer() method NOT FOUND');
  issues.push('syncDataFromServer() method missing');
}

console.log('\n' + '='.repeat(60) + '\n');

console.log('CHECK 5: getStorageKey() Method\n');

// Check getStorageKey for packaging
const getStorageKeyMatch = storageContent.match(
  /private getStorageKey\([\s\S]*?(?=\n  private |\n  async |\n\})/
);

if (getStorageKeyMatch) {
  const method = getStorageKeyMatch[0];
  
  if (method.includes("if (business === 'packaging')")) {
    console.log("✓ Has packaging business check");
    
    // Check what it returns for packaging
    const packagingReturn = method.match(/if \(business === 'packaging'\) \{[\s\S]*?return (.*?);/);
    if (packagingReturn) {
      console.log(`✓ Returns: ${packagingReturn[1]}`);
    }
  } else {
    console.log("⚠️  No explicit packaging check");
  }
} else {
  console.log('⚠️  getStorageKey() method NOT FOUND');
}

console.log('\n' + '='.repeat(60) + '\n');

console.log('CHECK 6: Data File Existence\n');

// Check if actual data files exist
const packagingDataPath = path.join(__dirname, '../data/localStorage/Packaging');
const expectedFiles = [
  'products.json', 'materials.json', 'customers.json', 'suppliers.json',
  'salesOrders.json', 'purchaseOrders.json', 'invoices.json', 'payments.json',
  'deliveryNotes.json', 'grn.json', 'inventory.json', 'bom.json',
  'production.json', 'spk.json', 'qc.json', 'quotations.json',
  'returns.json', 'expenses.json', 'operationalExpenses.json',
  'journalEntries.json', 'taxRecords.json', 'accounts.json',
  'staff.json', 'attendance.json', 'userAccessControl.json'
];

let filesExist = 0;
let filesMissing = 0;
let filesEmpty = 0;

expectedFiles.forEach(file => {
  const filePath = path.join(packagingDataPath, file);
  if (fs.existsSync(filePath)) {
    filesExist++;
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const count = data.value ? data.value.length : 0;
    if (count === 0) {
      filesEmpty++;
      console.log(`  ⚠️  ${file} - EMPTY`);
    } else {
      console.log(`  ✓ ${file} - ${count} records`);
    }
  } else {
    filesMissing++;
    console.log(`  ❌ ${file} - NOT FOUND`);
    issues.push(`File missing: ${file}`);
  }
});

console.log(`\nSummary: ${filesExist} exist, ${filesMissing} missing, ${filesEmpty} empty`);

console.log('\n' + '='.repeat(60) + '\n');

console.log('CHECK 7: Potential Issues\n');

// Check for common sync issues
const potentialIssues = [];

// Check for duplicate if statements
const ifPackagingCount = (storageContent.match(/if \(business === 'packaging'\)/g) || []).length;
console.log(`Found ${ifPackagingCount} "if (business === 'packaging')" statements`);

// Check for try-catch issues
const tryCatchIssues = storageContent.match(/\} try catch/g);
if (tryCatchIssues) {
  console.log(`⚠️  Found ${tryCatchIssues.length} "} try catch" syntax errors`);
  potentialIssues.push('Syntax error: "} try catch" should be "} catch"');
}

// Check for missing closing braces
const openBraces = (storageContent.match(/\{/g) || []).length;
const closeBraces = (storageContent.match(/\}/g) || []).length;
if (openBraces !== closeBraces) {
  console.log(`⚠️  Brace mismatch: ${openBraces} open, ${closeBraces} close`);
  potentialIssues.push(`Brace mismatch: ${openBraces} open, ${closeBraces} close`);
}

// Check for WebSocket client import
if (storageContent.includes("import { websocketClient }")) {
  console.log('✓ WebSocket client imported');
} else {
  console.log('⚠️  WebSocket client not imported');
  potentialIssues.push('WebSocket client not imported');
}

console.log('\n' + '='.repeat(60) + '\n');

console.log('CHECK 8: Sync Debounce & Throttle\n');

// Check for debounce/throttle settings
const debounceMatch = storageContent.match(/SYNC_TO_SERVER_DEBOUNCE\s*=\s*(\d+)/);
if (debounceMatch) {
  const ms = parseInt(debounceMatch[1]);
  console.log(`✓ Debounce: ${ms}ms (${ms/1000}s)`);
  if (ms > 10000) {
    console.log('  ⚠️  Debounce too high - may delay sync');
    potentialIssues.push(`Debounce too high: ${ms}ms`);
  }
} else {
  console.log('⚠️  No debounce setting found');
}

const minSyncMatch = storageContent.match(/MIN_SYNC_INTERVAL\s*=\s*(\d+)/);
if (minSyncMatch) {
  const ms = parseInt(minSyncMatch[1]);
  console.log(`✓ Min sync interval: ${ms}ms (${ms/1000}s)`);
}

console.log('\n' + '='.repeat(60) + '\n');

// Final summary
console.log('=== FINAL SUMMARY ===\n');

if (issues.length === 0 && potentialIssues.length === 0) {
  console.log('✅ NO ISSUES FOUND!\n');
  console.log('Packaging sync configuration looks good.\n');
} else {
  console.log(`Found ${issues.length} critical issues and ${potentialIssues.length} potential issues:\n`);
  
  if (issues.length > 0) {
    console.log('CRITICAL ISSUES:');
    issues.forEach((issue, idx) => console.log(`  ${idx + 1}. ${issue}`));
    console.log();
  }
  
  if (potentialIssues.length > 0) {
    console.log('POTENTIAL ISSUES:');
    potentialIssues.forEach((issue, idx) => console.log(`  ${idx + 1}. ${issue}`));
    console.log();
  }
}

// Save report
const report = {
  timestamp: new Date().toISOString(),
  criticalIssues: issues,
  potentialIssues: potentialIssues,
  filesExist,
  filesMissing,
  filesEmpty
};

fs.writeFileSync(
  path.join(__dirname, 'packaging-sync-comprehensive-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('✓ Report saved to: scripts/packaging-sync-comprehensive-report.json\n');
