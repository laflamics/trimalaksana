#!/usr/bin/env node

/**
 * Check if data files are included in the build
 * Analyze package.json build config and verify data files
 */

const fs = require('fs');
const path = require('path');

console.log('📦 [CHECK BUILD DATA INCLUSION]\n');

// Read package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
const buildConfig = packageJson.build;

console.log('📋 BUILD CONFIGURATION:');
console.log('=' .repeat(70));

if (buildConfig.extraResources) {
  console.log('\nExtra Resources:');
  buildConfig.extraResources.forEach((resource, idx) => {
    console.log(`\n  ${idx + 1}. From: ${resource.from}`);
    console.log(`     To: ${resource.to}`);
    if (resource.filter) {
      console.log(`     Filters:`);
      resource.filter.forEach(f => console.log(`       - ${f}`));
    }
  });
}

console.log('\n' + '=' .repeat(70));
console.log('\n🔍 CHECKING DATA FILES:\n');

// Check what's in data folder
const dataPath = path.join(__dirname, '../data');
const dataFiles = fs.readdirSync(dataPath);

console.log('Files in data/ folder:');
dataFiles.forEach(f => {
  const fullPath = path.join(dataPath, f);
  const stat = fs.statSync(fullPath);
  if (stat.isDirectory()) {
    console.log(`  📁 ${f}/`);
  } else {
    console.log(`  📄 ${f}`);
  }
});

// Check localStorage folder
console.log('\n📁 data/localStorage/ contents:');
const localStoragePath = path.join(dataPath, 'localStorage');
if (fs.existsSync(localStoragePath)) {
  const lsFiles = fs.readdirSync(localStoragePath);
  console.log(`  Found ${lsFiles.length} items`);
  
  // Count JSON files
  const jsonFiles = lsFiles.filter(f => f.endsWith('.json'));
  const folders = lsFiles.filter(f => fs.statSync(path.join(localStoragePath, f)).isDirectory());
  
  console.log(`  - JSON files: ${jsonFiles.length}`);
  console.log(`  - Folders: ${folders.length}`);
  
  if (folders.length > 0) {
    console.log(`  - Folder names: ${folders.join(', ')}`);
  }
} else {
  console.log('  ✗ localStorage folder not found');
}

// Check if localStorage is excluded
console.log('\n⚠️  BUILD FILTER ANALYSIS:');
console.log('=' .repeat(70));

const dataResource = buildConfig.extraResources.find(r => r.from === 'data');
if (dataResource && dataResource.filter) {
  const hasLocalStorageExclude = dataResource.filter.some(f => f.includes('localStorage'));
  
  if (hasLocalStorageExclude) {
    console.log('❌ localStorage is EXCLUDED from build');
    console.log('   Filter: ' + dataResource.filter.find(f => f.includes('localStorage')));
  } else {
    console.log('✓ localStorage is NOT explicitly excluded');
    console.log('  But it may be excluded by other filters');
  }
  
  // Check what's included
  console.log('\nIncluded patterns:');
  dataResource.filter.filter(f => !f.startsWith('!')).forEach(f => {
    console.log(`  ✓ ${f}`);
  });
  
  console.log('\nExcluded patterns:');
  dataResource.filter.filter(f => f.startsWith('!')).forEach(f => {
    console.log(`  ✗ ${f}`);
  });
}

console.log('\n' + '=' .repeat(70));
console.log('\n💡 RECOMMENDATION:\n');

const dataResource2 = buildConfig.extraResources.find(r => r.from === 'data');
if (dataResource2 && dataResource2.filter.some(f => f.includes('localStorage'))) {
  console.log('⚠️  localStorage is EXCLUDED from build!');
  console.log('\nTo include localStorage data in the build, update package.json:');
  console.log('\n  "extraResources": [');
  console.log('    {');
  console.log('      "from": "data/localStorage",');
  console.log('      "to": "data/localStorage",');
  console.log('      "filter": ["**/*.json"]');
  console.log('    },');
  console.log('    ...');
  console.log('  ]');
} else {
  console.log('✓ localStorage should be included in the build');
}

console.log('\n');
