const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== STORAGE KEY INCONSISTENCY ANALYSIS ===\n');

// Function to search for patterns in files
function searchPattern(pattern, filePattern = '**/*.{ts,tsx}') {
  try {
    const cmd = `grep -rn "${pattern}" src/ --include="${filePattern}" 2>/dev/null || true`;
    const result = execSync(cmd, { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 });
    return result.split('\n').filter(line => line.trim().length > 0);
  } catch (error) {
    return [];
  }
}

const issues = [];

console.log('CHECKING: delivery vs deliveryNotes\n');

// Search for 'delivery' usage
const deliveryMatches = searchPattern("'delivery'");
const deliveryNotesMatches = searchPattern("'deliveryNotes'");

console.log(`Found ${deliveryMatches.length} uses of 'delivery'`);
console.log(`Found ${deliveryNotesMatches.length} uses of 'deliveryNotes'\n`);

// Categorize by file
const deliveryByFile = {};
const deliveryNotesByFile = {};

deliveryMatches.forEach(match => {
  const [file] = match.split(':');
  if (!deliveryByFile[file]) deliveryByFile[file] = [];
  deliveryByFile[file].push(match);
});

deliveryNotesMatches.forEach(match => {
  const [file] = match.split(':');
  if (!deliveryNotesByFile[file]) deliveryNotesByFile[file] = [];
  deliveryNotesByFile[file].push(match);
});

console.log('FILES USING "delivery":\n');
Object.keys(deliveryByFile).sort().forEach(file => {
  const shortFile = file.replace('src/', '');
  console.log(`  ${shortFile} (${deliveryByFile[file].length} occurrences)`);
});

console.log('\nFILES USING "deliveryNotes":\n');
Object.keys(deliveryNotesByFile).sort().forEach(file => {
  const shortFile = file.replace('src/', '');
  console.log(`  ${shortFile} (${deliveryNotesByFile[file].length} occurrences)`);
});

console.log('\n' + '='.repeat(60) + '\n');

console.log('CRITICAL FILES TO UPDATE:\n');

// Files that need to be changed from deliveryNotes to delivery
const filesToUpdate = Object.keys(deliveryNotesByFile).filter(file => {
  // Only include files that use deliveryNotes in storage operations
  return deliveryNotesByFile[file].some(line => 
    line.includes('storage') || 
    line.includes('dataKeys') ||
    line.includes('syncToServer') ||
    line.includes('syncFromServer')
  );
});

if (filesToUpdate.length > 0) {
  console.log('Files with "deliveryNotes" in storage/sync operations:\n');
  filesToUpdate.forEach(file => {
    const shortFile = file.replace('src/', '');
    console.log(`  ❌ ${shortFile}`);
    
    // Show the actual lines
    deliveryNotesByFile[file].forEach(line => {
      const [, lineNum, content] = line.split(':');
      if (content && (content.includes('storage') || content.includes('dataKeys'))) {
        console.log(`     Line ${lineNum}: ${content.trim().substring(0, 80)}...`);
      }
    });
    console.log();
  });
}

console.log('='.repeat(60) + '\n');

console.log('DETAILED BREAKDOWN:\n');

console.log('1. STORAGE.TS (Sync Configuration):\n');
const storageFile = 'src/services/storage.ts';
if (deliveryNotesByFile[storageFile]) {
  console.log('   Uses "deliveryNotes" in:');
  deliveryNotesByFile[storageFile].forEach(line => {
    const [, lineNum, content] = line.split(':');
    if (content.includes('deliveryNotes')) {
      console.log(`   Line ${lineNum}: ${content.trim()}`);
    }
  });
  issues.push({
    file: 'src/services/storage.ts',
    issue: 'Uses "deliveryNotes" in sync config',
    action: 'Change to "delivery"',
    lines: deliveryNotesByFile[storageFile].map(l => l.split(':')[1])
  });
}

console.log('\n2. COMPONENTS USING "delivery":\n');
const componentFiles = Object.keys(deliveryByFile).filter(f => 
  f.includes('pages/') || f.includes('hooks/')
);

componentFiles.slice(0, 10).forEach(file => {
  const shortFile = file.replace('src/', '');
  const count = deliveryByFile[file].length;
  console.log(`   ✓ ${shortFile} (${count} uses) - CORRECT`);
});

if (componentFiles.length > 10) {
  console.log(`   ... and ${componentFiles.length - 10} more files`);
}

console.log('\n3. DOCKER/STORAGE.TSX:\n');
const dockerFile = 'docker/storage.tsx';
const dockerMatches = searchPattern("'delivery'", 'storage.tsx');
if (dockerMatches.length > 0) {
  console.log('   Found in docker/storage.tsx:');
  dockerMatches.forEach(line => {
    const [, lineNum, content] = line.split(':');
    if (content && content.includes('delivery')) {
      console.log(`   Line ${lineNum}: ${content.trim()}`);
    }
  });
  issues.push({
    file: 'docker/storage.tsx',
    issue: 'May have inconsistent key usage',
    action: 'Verify and align with "delivery"'
  });
}

console.log('\n' + '='.repeat(60) + '\n');

console.log('SUMMARY OF CHANGES NEEDED:\n');

console.log('Files to change "deliveryNotes" → "delivery":\n');

const changeList = [
  {
    file: 'src/services/storage.ts',
    locations: [
      'Line ~730: syncToServer() dataKeys array',
      'Line ~820: syncFromServer() dataKeys array'
    ],
    priority: 'CRITICAL'
  }
];

// Check if there are other files
const otherFiles = filesToUpdate.filter(f => f !== 'src/services/storage.ts');
if (otherFiles.length > 0) {
  otherFiles.forEach(file => {
    changeList.push({
      file: file.replace('src/', ''),
      locations: ['Check all storage.get/save operations'],
      priority: 'HIGH'
    });
  });
}

changeList.forEach((item, idx) => {
  console.log(`${idx + 1}. ${item.file} [${item.priority}]`);
  item.locations.forEach(loc => {
    console.log(`   - ${loc}`);
  });
  console.log();
});

console.log('='.repeat(60) + '\n');

console.log('VERIFICATION CHECKLIST:\n');
console.log('After changing to "delivery":');
console.log('  [ ] storage.ts syncToServer() uses "delivery"');
console.log('  [ ] storage.ts syncFromServer() uses "delivery"');
console.log('  [ ] File exists: data/localStorage/Packaging/delivery.json');
console.log('  [ ] Server has: docker/data/localStorage/Packaging/delivery.json');
console.log('  [ ] No references to "deliveryNotes" in storage operations');
console.log('  [ ] All components can load delivery data');
console.log('  [ ] Sync test successful\n');

console.log('='.repeat(60) + '\n');

console.log('EXACT CHANGES TO MAKE:\n');

console.log('File: src/services/storage.ts\n');
console.log('Change 1 (Line ~730):');
console.log('  FROM: \'invoices\', \'payments\', \'deliveryNotes\', \'grn\', \'returns\',');
console.log('  TO:   \'invoices\', \'payments\', \'delivery\', \'grn\', \'returns\',\n');

console.log('Change 2 (Line ~820):');
console.log('  FROM: \'invoices\', \'payments\', \'deliveryNotes\', \'grn\', \'returns\',');
console.log('  TO:   \'invoices\', \'payments\', \'delivery\', \'grn\', \'returns\',\n');

console.log('='.repeat(60) + '\n');

// Save report
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    deliveryUsages: deliveryMatches.length,
    deliveryNotesUsages: deliveryNotesMatches.length,
    filesUsingDelivery: Object.keys(deliveryByFile).length,
    filesUsingDeliveryNotes: Object.keys(deliveryNotesByFile).length,
    criticalFilesToUpdate: filesToUpdate.length
  },
  issues,
  changeList,
  deliveryFiles: Object.keys(deliveryByFile).sort(),
  deliveryNotesFiles: Object.keys(deliveryNotesByFile).sort()
};

fs.writeFileSync(
  path.join(__dirname, 'storage-key-inconsistency-report.json'),
  JSON.stringify(report, null, 2)
);

console.log('✓ Report saved to: scripts/storage-key-inconsistency-report.json\n');
