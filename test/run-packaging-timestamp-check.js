/**
 * PACKAGING TIMESTAMP CHECK - Simple validation without browser automation
 * 
 * Checks Packaging modules for proper timestamp implementation by analyzing the code
 */

const fs = require('fs');
const path = require('path');

console.log('🕐 PACKAGING TIMESTAMP IMPLEMENTATION CHECK');
console.log('==========================================');

// Files to check for timestamp implementation
const filesToCheck = [
  // Core Packaging modules
  'src/pages/Packaging/SalesOrders.tsx',
  'src/pages/Packaging/PPIC.tsx',
  'src/pages/Packaging/Purchasing.tsx',
  'src/pages/Packaging/Production.tsx',
  'src/pages/Packaging/QAQC.tsx',
  'src/pages/Packaging/DeliveryNote.tsx',
  'src/pages/Packaging/Return.tsx',
  'src/pages/Packaging/Workflow.tsx',
  // Packaging Finance modules
  'src/pages/Packaging/Finance/Accounting.tsx',
  'src/pages/Packaging/Finance/AccountsPayable.tsx',
  'src/pages/Packaging/Finance/AccountsReceivable.tsx',
  'src/pages/Packaging/Finance/CostAnalysis.tsx',
  'src/pages/Packaging/Finance/FinancialReports.tsx',
  'src/pages/Packaging/Finance/GeneralLedger.tsx',
  'src/pages/Packaging/Finance/Payments.tsx',
  'src/pages/Packaging/Finance/TaxManagement.tsx',
  // Shared Finance modules (used by Packaging)
  'src/pages/Finance/COA.tsx',
  'src/pages/Finance/GeneralLedger.tsx',
  'src/pages/Finance/Invoices.tsx'
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
    
    // Check for workflow state machine usage (Packaging specific)
    const workflowUsage = content.match(/workflowStateMachine|WorkflowState/g) || [];
    
    // Check for material allocator usage (Packaging specific)
    const materialAllocatorUsage = content.match(/materialAllocator|MaterialAllocator/g) || [];
    
    return {
      file: filePath,
      exists: true,
      handleSaveFunctions: handleSaveFunctions.length,
      timestampImplementations: timestampImplementations.length,
      storageServiceCalls: storageServiceCalls.length,
      dateNowUsage: dateNowUsage.length,
      dateISOUsage: dateISOUsage.length,
      workflowUsage: workflowUsage.length,
      materialAllocatorUsage: materialAllocatorUsage.length,
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

console.log('\n📊 CHECKING PACKAGING FILES FOR TIMESTAMP IMPLEMENTATION');
console.log('=======================================================');

const results = [];
let totalFiles = 0;
let filesWithTimestamp = 0;
let filesWithHandleSave = 0;
let packagingSpecificFiles = 0;

filesToCheck.forEach(filePath => {
  const result = checkFile(filePath);
  results.push(result);
  
  if (result.exists && !result.error) {
    totalFiles++;
    
    const fileName = path.basename(filePath);
    const isPackagingSpecific = filePath.includes('/Packaging/');
    if (isPackagingSpecific) packagingSpecificFiles++;
    
    console.log(`\n📄 ${fileName} ${isPackagingSpecific ? '📦' : '💰'}`);
    console.log('   ' + '-'.repeat(fileName.length + 4));
    
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
    
    // Packaging-specific features
    if (isPackagingSpecific) {
      if (result.workflowUsage > 0) {
        console.log(`   🔄 Workflow state machine usage: ${result.workflowUsage}`);
      }
      if (result.materialAllocatorUsage > 0) {
        console.log(`   🧮 Material allocator usage: ${result.materialAllocatorUsage}`);
      }
    }
    
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
console.log(`📦 Packaging-specific files: ${packagingSpecificFiles}`);
console.log(`💰 Finance files: ${totalFiles - packagingSpecificFiles}`);
console.log(`✅ Files with handleSave: ${filesWithHandleSave}/${totalFiles} (${handleSaveCoverage}%)`);
console.log(`🕐 Files with timestamp: ${filesWithTimestamp}/${totalFiles} (${timestampCoverage}%)`);

// Detailed analysis
const filesWithoutTimestamp = results.filter(r => r.exists && !r.error && !r.hasProperTimestamp);
const filesWithoutHandleSave = results.filter(r => r.exists && !r.error && r.handleSaveFunctions === 0);

if (filesWithoutTimestamp.length > 0) {
  console.log('\n❌ FILES MISSING TIMESTAMP IMPLEMENTATION:');
  filesWithoutTimestamp.forEach(file => {
    const isPackaging = file.file.includes('/Packaging/');
    console.log(`   - ${path.basename(file.file)} ${isPackaging ? '📦' : '💰'}`);
  });
}

if (filesWithoutHandleSave.length > 0) {
  console.log('\n⚠️  FILES WITHOUT HANDLESAVE FUNCTIONS:');
  filesWithoutHandleSave.forEach(file => {
    const isPackaging = file.file.includes('/Packaging/');
    console.log(`   - ${path.basename(file.file)} ${isPackaging ? '📦' : '💰'}`);
  });
}

// Packaging-specific analysis
const packagingResults = results.filter(r => r.file.includes('/Packaging/'));
const packagingWithTimestamp = packagingResults.filter(r => r.hasProperTimestamp).length;
const packagingTimestampCoverage = packagingResults.length > 0 ? Math.round((packagingWithTimestamp / packagingResults.length) * 100) : 0;

console.log('\n📦 PACKAGING-SPECIFIC ANALYSIS');
console.log('==============================');
console.log(`📊 Packaging files: ${packagingResults.length}`);
console.log(`🕐 Packaging timestamp coverage: ${packagingWithTimestamp}/${packagingResults.length} (${packagingTimestampCoverage}%)`);

// Workflow and material allocator usage
const workflowFiles = packagingResults.filter(r => r.workflowUsage > 0).length;
const materialAllocatorFiles = packagingResults.filter(r => r.materialAllocatorUsage > 0).length;

console.log(`🔄 Files using workflow state machine: ${workflowFiles}`);
console.log(`🧮 Files using material allocator: ${materialAllocatorFiles}`);

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

if (packagingTimestampCoverage < 100) {
  console.log('📦 PACKAGING-SPECIFIC ISSUES:');
  console.log('   - Packaging modules need proper timestamp implementation');
  console.log('   - Critical for workflow state transitions');
  console.log('   - Important for material allocation tracking');
}

if (handleSaveCoverage < 100) {
  console.log('⚠️  HANDLESAVE COVERAGE:');
  console.log('   - Some files may not have data persistence functions');
  console.log('   - This might be normal for read-only or display components');
}

console.log('\n🎯 NEXT STEPS:');
console.log('1. Fix timestamp implementation in files missing proper timestamps');
console.log('2. Test Packaging flow end-to-end to ensure data persistence works correctly');
console.log('3. Validate workflow state transitions with proper timestamps');
console.log('4. Test material allocation with timestamp tracking');
console.log('5. Monitor for phantom updates or endless update loops');
console.log('6. Validate cross-module data consistency');

// Overall assessment
const overallScore = Math.round((timestampCoverage + handleSaveCoverage) / 2);

if (overallScore >= 90) {
  console.log('\n🎉 OVERALL ASSESSMENT: EXCELLENT');
  console.log('✅ Packaging timestamp implementation is in good shape');
} else if (overallScore >= 70) {
  console.log('\n⚠️  OVERALL ASSESSMENT: NEEDS IMPROVEMENT');
  console.log('🔧 Some Packaging modules need timestamp fixes');
} else {
  console.log('\n❌ OVERALL ASSESSMENT: CRITICAL ISSUES');
  console.log('🚨 Major timestamp implementation problems found');
}

console.log(`📊 Overall Score: ${overallScore}%`);
console.log(`📦 Packaging Score: ${packagingTimestampCoverage}%`);

// Export results for further analysis
const reportData = {
  timestamp: new Date().toISOString(),
  totalFiles,
  packagingSpecificFiles,
  filesWithTimestamp,
  filesWithHandleSave,
  timestampCoverage,
  handleSaveCoverage,
  packagingTimestampCoverage,
  overallScore,
  workflowFiles,
  materialAllocatorFiles,
  results,
  filesWithoutTimestamp: filesWithoutTimestamp.map(f => f.file),
  filesWithoutHandleSave: filesWithoutHandleSave.map(f => f.file)
};

fs.writeFileSync('packaging-timestamp-check-report.json', JSON.stringify(reportData, null, 2));
console.log('\n📄 Detailed report saved to: packaging-timestamp-check-report.json');