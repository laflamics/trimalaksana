const fs = require('fs');
const path = require('path');

console.log('=== PACKAGING BUSINESS DATA SYNC ANALYSIS ===\n');

// Helper to read JSON files
function readJSON(filePath) {
  try {
    const fullPath = path.join(__dirname, '..', filePath);
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    const content = fs.readFileSync(fullPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

// Packaging data files to check
const packagingFiles = {
  salesOrders: 'data/localStorage/Packaging/salesOrders.json',
  deliveryNotes: 'data/localStorage/Packaging/deliveryNotes.json',
  invoices: 'data/localStorage/Packaging/invoices.json',
  customers: 'data/localStorage/Packaging/customers.json',
  products: 'data/localStorage/Packaging/products.json',
  payments: 'data/localStorage/Packaging/payments.json',
  purchaseOrders: 'data/localStorage/Packaging/purchaseOrders.json',
  grn: 'data/localStorage/Packaging/grn.json',
  inventory: 'data/localStorage/Packaging/inventory.json',
  production: 'data/localStorage/Packaging/production.json',
  qc: 'data/localStorage/Packaging/qc.json',
  spk: 'data/localStorage/Packaging/spk.json',
};

const issues = [];
const summary = {
  totalFiles: 0,
  missingFiles: 0,
  emptyFiles: 0,
  timestampIssues: 0,
  dataIntegrityIssues: 0,
};

console.log('1. FILE EXISTENCE CHECK\n');
Object.entries(packagingFiles).forEach(([key, filePath]) => {
  summary.totalFiles++;
  const data = readJSON(filePath);
  
  if (data === null) {
    console.log(`❌ ${key}: FILE NOT FOUND - ${filePath}`);
    issues.push({
      type: 'MISSING_FILE',
      module: key,
      severity: 'HIGH',
      description: `File ${filePath} does not exist`
    });
    summary.missingFiles++;
  } else if (!data.value || data.value.length === 0) {
    console.log(`⚠️  ${key}: EMPTY - ${filePath}`);
    issues.push({
      type: 'EMPTY_FILE',
      module: key,
      severity: 'MEDIUM',
      description: `File ${filePath} has no data`
    });
    summary.emptyFiles++;
  } else {
    console.log(`✓ ${key}: OK (${data.value.length} records)`);
  }
});

console.log('\n2. TIMESTAMP CONSISTENCY CHECK\n');

// Check timestamp fields
Object.entries(packagingFiles).forEach(([key, filePath]) => {
  const data = readJSON(filePath);
  if (!data || !data.value || data.value.length === 0) return;

  const timestampIssues = [];
  data.value.forEach((record, idx) => {
    // Check for timestamp fields
    const hasTimestamp = record.timestamp || record._timestamp;
    const hasCreated = record.created || record.createdDate;
    const hasLastUpdate = record.lastUpdate || record.lastUpdated;

    if (!hasTimestamp) {
      timestampIssues.push(`Record ${idx} (${record.id || 'no-id'}): Missing timestamp`);
    }
    if (!hasCreated) {
      timestampIssues.push(`Record ${idx} (${record.id || 'no-id'}): Missing created date`);
    }

    // Check timestamp consistency
    if (record.timestamp && record._timestamp && record.timestamp !== record._timestamp) {
      timestampIssues.push(`Record ${idx} (${record.id || 'no-id'}): Timestamp mismatch`);
    }
  });

  if (timestampIssues.length > 0) {
    console.log(`⚠️  ${key}: ${timestampIssues.length} timestamp issues`);
    timestampIssues.slice(0, 3).forEach(issue => console.log(`   - ${issue}`));
    if (timestampIssues.length > 3) {
      console.log(`   ... and ${timestampIssues.length - 3} more`);
    }
    issues.push({
      type: 'TIMESTAMP_ISSUE',
      module: key,
      severity: 'MEDIUM',
      count: timestampIssues.length,
      description: `Timestamp inconsistencies found`
    });
    summary.timestampIssues++;
  } else {
    console.log(`✓ ${key}: Timestamps OK`);
  }
});

console.log('\n3. DATA INTEGRITY CHECK\n');

// Check Sales Orders -> Delivery Notes -> Invoices flow
const salesOrders = readJSON(packagingFiles.salesOrders);
const deliveryNotes = readJSON(packagingFiles.deliveryNotes);
const invoices = readJSON(packagingFiles.invoices);

if (salesOrders && deliveryNotes && invoices) {
  const soIds = new Set(salesOrders.value.map(so => so.id));
  const dnSoRefs = deliveryNotes.value.map(dn => dn.salesOrderId || dn.soId).filter(Boolean);
  const invSoRefs = invoices.value.map(inv => inv.salesOrderId || inv.soId).filter(Boolean);

  const orphanedDNs = dnSoRefs.filter(soId => !soIds.has(soId));
  const orphanedInvoices = invSoRefs.filter(soId => !soIds.has(soId));

  if (orphanedDNs.length > 0) {
    console.log(`⚠️  Delivery Notes: ${orphanedDNs.length} orphaned records (no matching SO)`);
    issues.push({
      type: 'ORPHANED_DATA',
      module: 'deliveryNotes',
      severity: 'HIGH',
      count: orphanedDNs.length,
      description: 'Delivery notes reference non-existent sales orders'
    });
    summary.dataIntegrityIssues++;
  } else {
    console.log(`✓ Delivery Notes: All linked to valid SOs`);
  }

  if (orphanedInvoices.length > 0) {
    console.log(`⚠️  Invoices: ${orphanedInvoices.length} orphaned records (no matching SO)`);
    issues.push({
      type: 'ORPHANED_DATA',
      module: 'invoices',
      severity: 'HIGH',
      count: orphanedInvoices.length,
      description: 'Invoices reference non-existent sales orders'
    });
    summary.dataIntegrityIssues++;
  } else {
    console.log(`✓ Invoices: All linked to valid SOs`);
  }
}

// Check Purchase Orders -> GRN flow
const purchaseOrders = readJSON(packagingFiles.purchaseOrders);
const grn = readJSON(packagingFiles.grn);

if (purchaseOrders && grn) {
  const poIds = new Set(purchaseOrders.value.map(po => po.id));
  const grnPoRefs = grn.value.map(g => g.purchaseOrderId || g.poId).filter(Boolean);
  const orphanedGRNs = grnPoRefs.filter(poId => !poIds.has(poId));

  if (orphanedGRNs.length > 0) {
    console.log(`⚠️  GRN: ${orphanedGRNs.length} orphaned records (no matching PO)`);
    issues.push({
      type: 'ORPHANED_DATA',
      module: 'grn',
      severity: 'HIGH',
      count: orphanedGRNs.length,
      description: 'GRN records reference non-existent purchase orders'
    });
    summary.dataIntegrityIssues++;
  } else {
    console.log(`✓ GRN: All linked to valid POs`);
  }
}

// Check Production -> SPK flow
const production = readJSON(packagingFiles.production);
const spk = readJSON(packagingFiles.spk);

if (production && spk) {
  const spkIds = new Set(spk.value.map(s => s.id));
  const prodSpkRefs = production.value.map(p => p.spkId).filter(Boolean);
  const orphanedProduction = prodSpkRefs.filter(spkId => !spkIds.has(spkId));

  if (orphanedProduction.length > 0) {
    console.log(`⚠️  Production: ${orphanedProduction.length} orphaned records (no matching SPK)`);
    issues.push({
      type: 'ORPHANED_DATA',
      module: 'production',
      severity: 'MEDIUM',
      count: orphanedProduction.length,
      description: 'Production records reference non-existent SPK'
    });
    summary.dataIntegrityIssues++;
  } else {
    console.log(`✓ Production: All linked to valid SPKs`);
  }
}

console.log('\n4. SYNC METADATA CHECK\n');

// Check for sync-related fields
Object.entries(packagingFiles).forEach(([key, filePath]) => {
  const data = readJSON(filePath);
  if (!data || !data.value || data.value.length === 0) return;

  const syncStats = {
    hasImportFlag: 0,
    hasHistoricalFlag: 0,
    hasSyncedFlag: 0,
    missingMetadata: 0,
  };

  data.value.forEach(record => {
    if (record.importedAt || record.importSource) syncStats.hasImportFlag++;
    if (record.isHistoricalData) syncStats.hasHistoricalFlag++;
    if (record.synced || record.syncedAt) syncStats.hasSyncedFlag++;
    if (!record.created && !record.timestamp) syncStats.missingMetadata++;
  });

  console.log(`${key}:`);
  console.log(`  - Imported records: ${syncStats.hasImportFlag}`);
  console.log(`  - Historical data: ${syncStats.hasHistoricalFlag}`);
  console.log(`  - Synced records: ${syncStats.hasSyncedFlag}`);
  if (syncStats.missingMetadata > 0) {
    console.log(`  ⚠️  Missing metadata: ${syncStats.missingMetadata}`);
  }
});

console.log('\n5. DUPLICATE CHECK\n');

// Check for duplicate IDs
Object.entries(packagingFiles).forEach(([key, filePath]) => {
  const data = readJSON(filePath);
  if (!data || !data.value || data.value.length === 0) return;

  const ids = data.value.map(r => r.id).filter(Boolean);
  const uniqueIds = new Set(ids);
  
  if (ids.length !== uniqueIds.size) {
    const duplicates = ids.length - uniqueIds.size;
    console.log(`⚠️  ${key}: ${duplicates} duplicate IDs found`);
    issues.push({
      type: 'DUPLICATE_IDS',
      module: key,
      severity: 'HIGH',
      count: duplicates,
      description: 'Duplicate record IDs detected'
    });
  } else {
    console.log(`✓ ${key}: No duplicate IDs`);
  }
});

console.log('\n=== SUMMARY ===\n');
console.log(`Total files checked: ${summary.totalFiles}`);
console.log(`Missing files: ${summary.missingFiles}`);
console.log(`Empty files: ${summary.emptyFiles}`);
console.log(`Files with timestamp issues: ${summary.timestampIssues}`);
console.log(`Files with data integrity issues: ${summary.dataIntegrityIssues}`);
console.log(`\nTotal issues found: ${issues.length}`);

if (issues.length > 0) {
  console.log('\n=== CRITICAL ISSUES ===\n');
  const criticalIssues = issues.filter(i => i.severity === 'HIGH');
  criticalIssues.forEach((issue, idx) => {
    console.log(`${idx + 1}. [${issue.type}] ${issue.module}`);
    console.log(`   ${issue.description}`);
    if (issue.count) console.log(`   Count: ${issue.count}`);
  });
}

// Save report
const report = {
  timestamp: new Date().toISOString(),
  summary,
  issues,
};

fs.writeFileSync(
  path.join(__dirname, 'packaging-sync-analysis-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('\n✓ Report saved to: scripts/packaging-sync-analysis-report.json');
