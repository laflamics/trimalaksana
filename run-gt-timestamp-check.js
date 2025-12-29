/**
 * GT TIMESTAMP CHECK - Simple validation without browser automation
 * 
 * Checks GT modules for proper timestamp implementation by analyzing the code
 */

const fs = require('fs');
const path = require('path');

console.log('🕐 GT TIMESTAMP IMPLEMENTATION CHECK');
console.log('===================================');

// Files to check for timestamp implementation
const filesToCheck = [
  'src/pages/GeneralTrading/Master/Products.tsx',
  'src/pages/GeneralTrading/Master/Customers.tsx', 
  'src/pages/GeneralTrading/Master/Suppliers.tsx',
  'src/pages/GeneralTrading/SalesOrders.tsx',
  'src/pages/GeneralTrading/Purchasing.tsx',
  'src/pages/GeneralTrading/DeliveryNote.tsx',
  'src/pages/GeneralTrading/Finance/invoices.tsx',
  'src/pages/GeneralTrading/Finance/COA.tsx',
  'src/pages/GeneralTrading/Finance/GeneralLedger.tsx'
];

// Patterns to look for
const timestampPatterns = [
  /timestamp:\s*Date\.now\(\)/g,
  /_timestamp:\s*Date\.now\(\)/g,
  /lastUpdate:\s*new\s+Date\(\)\.toISOString\(\)/g,
  /created:\s*new\s+Date\(\)\.toISOString\(\)/g
];

const handleSavePatterns = [
  /const\s+handleSave\s*=\s*async\s*\(\s*\)\s*=>\s*\{/g,
  /handleSave.*async.*=.*\{/g
];

function checkFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        file: filePath,
        exists: false,
        error: 'File not found'
      };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for handleSave functions
    const handleSaveFunctions = [];
    handleSavePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        handleSaveFunctions.push(...matches);
      }
    });
    
    // Check for timestamp implementations
    const timestampImplementations = [];
    timestampPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        timestampImplementations.push(...matches);
      }
    });
    
    // Check for storage service calls
    const storageServiceCalls = content.match(/storageService\.set\(/g) || [];
    
    // Check for Date.now() usage
    const dateNowUsage = content.match(/Date\.now\(\)/g) || [];
    
    // Check for new Date().toISOString() usage
    const dateISOUsage = content.match(/new\s+Date\(\)\.toISOString\(\)/g) || [];
    
    return {
      file: filePath,
      exists: true,
      handleSaveFunctions: handleSaveFunctions.length,
      timestampImplementations: timestampImplementations.length,
      storageServiceCalls: storageServiceCalls.length,
      dateNowUsage: dateNowUsage.length,
      dateISOUsage: dateISOUsage.length,
      hasProperTimestamp: timestampImplementations.length > 0,
      details: {
        timestamps: timestampImplementations,
        handleSaves: handleSaveFunctions
      }
    };
  } catch (error) {
    return {
      file: filePath,
      exists: true,
      error: error.message
    };
  }
}

console.log('\n📊 CHECKING GT FILES FOR TIMESTAMP IMPLEMENTATION');
console.log('================================================');

const results = [];
let totalFiles = 0;
let filesWithTimestamp = 0;
let filesWithHandleSave = 0;

filesToCheck.forEach(filePath => {
  const result = checkFile(filePath);
  results.push(result);
  
  if (result.exists && !result.error) {
    totalFiles++;
    
    const fileName = path.basename(filePath);
    console.log(`\n📄 ${fileName}`);
    console.log('   ' + '-'.repeat(fileName.length + 2));
    
    if (result.handleSaveFunctions > 0) {
      filesWithHandleSave++;
      console.log(`   ✅ HandleSave functions: ${result.handleSaveFunctions}`);
    } else {
      console.log(`   ⚠️  No handleSave functions found`);
    }
    
    if (result.hasProperTimestamp) {
      filesWithTimestamp++;
      console.log(`   ✅ Timestamp implementations: ${result.timestampImplementations}`);
      console.log(`   📅 Date.now() usage: ${result.dateNowUsage}`);
      console.log(`   📅 ISO date usage: ${result.dateISOUsage}`);
    } else {
      console.log(`   ❌ No proper timestamp implementation found`);
      console.log(`   📅 Date.now() usage: ${result.dateNowUsage}`);
      console.log(`   📅 ISO date usage: ${result.dateISOUsage}`);
    }
    
    console.log(`   💾 Storage service calls: ${result.storageServiceCalls}`);
    
    if (result.details.timestamps.length > 0) {
      console.log(`   🔍 Timestamp patterns found:`);
      result.details.timestamps.forEach(ts => {
        console.log(`      - ${ts}`);
      });
    }
  } else if (result.error) {
    console.log(`\n❌ ${path.basename(filePath)}: ${result.error}`);
  } else {
    console.log(`\n❌ ${path.basename(filePath)}: File not found`);
  }
});

console.log('\n📈 SUMMARY REPORT');
console.log('================');

const timestampCoverage = totalFiles > 0 ? Math.round((filesWithTimestamp / totalFiles) * 100) : 0;
const handleSaveCoverage = totalFiles > 0 ? Math.round((filesWithHandleSave / totalFiles) * 100) : 0;

console.log(`📊 Files checked: ${totalFiles}`);
console.log(`✅ Files with handleSave: ${filesWithHandleSave}/${totalFiles} (${handleSaveCoverage}%)`);
console.log(`🕐 Files with timestamp: ${filesWithTimestamp}/${totalFiles} (${timestampCoverage}%)`);

// Detailed analysis
const filesWithoutTimestamp = results.filter(r => r.exists && !r.error && !r.hasProperTimestamp);
const filesWithoutHandleSave = results.filter(r => r.exists && !r.error && r.handleSaveFunctions === 0);

if (filesWithoutTimestamp.length > 0) {
  console.log('\n❌ FILES MISSING TIMESTAMP IMPLEMENTATION:');
  filesWithoutTimestamp.forEach(file => {
    console.log(`   - ${path.basename(file.file)}`);
  });
}

if (filesWithoutHandleSave.length > 0) {
  console.log('\n⚠️  FILES WITHOUT HANDLESAVE FUNCTIONS:');
  filesWithoutHandleSave.forEach(file => {
    console.log(`   - ${path.basename(file.file)}`);
  });
}

// Recommendations
console.log('\n🔧 RECOMMENDATIONS');
console.log('==================');

if (timestampCoverage < 100) {
  console.log('❌ TIMESTAMP ISSUES FOUND:');
  console.log('   - Add timestamp: Date.now() to all data creation/update operations');
  console.log('   - Add _timestamp: Date.now() for backward compatibility');
  console.log('   - Add lastUpdate: new Date().toISOString() for human-readable timestamps');
  console.log('   - Ensure consistent timestamp format across all modules');
}

if (handleSaveCoverage < 100) {
  console.log('⚠️  HANDLESAVE COVERAGE:');
  console.log('   - Some files may not have data persistence functions');
  console.log('   - This might be normal for read-only or display components');
}

console.log('\n🎯 NEXT STEPS:');
console.log('1. Fix timestamp implementation in files missing proper timestamps');
console.log('2. Test GT flow end-to-end to ensure data persistence works correctly');
console.log('3. Monitor for phantom updates or endless update loops');
console.log('4. Validate cross-module data consistency');

// Overall assessment
const overallScore = Math.round((timestampCoverage + handleSaveCoverage) / 2);

if (overallScore >= 90) {
  console.log('\n🎉 OVERALL ASSESSMENT: EXCELLENT');
  console.log('✅ GT timestamp implementation is in good shape');
} else if (overallScore >= 70) {
  console.log('\n⚠️  OVERALL ASSESSMENT: NEEDS IMPROVEMENT');
  console.log('🔧 Some GT modules need timestamp fixes');
} else {
  console.log('\n❌ OVERALL ASSESSMENT: CRITICAL ISSUES');
  console.log('🚨 Major timestamp implementation problems found');
}

console.log(`📊 Overall Score: ${overallScore}%`);

// Export results for further analysis
const reportData = {
  timestamp: new Date().toISOString(),
  totalFiles,
  filesWithTimestamp,
  filesWithHandleSave,
  timestampCoverage,
  handleSaveCoverage,
  overallScore,
  results,
  filesWithoutTimestamp: filesWithoutTimestamp.map(f => f.file),
  filesWithoutHandleSave: filesWithoutHandleSave.map(f => f.file)
};

fs.writeFileSync('gt-timestamp-check-report.json', JSON.stringify(reportData, null, 2));
console.log('\n📄 Detailed report saved to: gt-timestamp-check-report.json');