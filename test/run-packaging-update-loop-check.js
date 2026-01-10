/**
 * PACKAGING UPDATE LOOP & PHANTOM UPDATE CHECK
 * 
 * Checks for potential issues that could cause endless update loops in Packaging modules:
 * 1. useEffect dependencies that might cause infinite re-renders
 * 2. Storage event listeners that might trigger unnecessary updates
 * 3. Auto-sync configurations that might be too aggressive
 * 4. State updates that might cause cascading effects
 * 5. Workflow state machine transitions
 * 6. Material allocator operations
 */

const fs = require('fs');
const path = require('path');

console.log('🔄 PACKAGING UPDATE LOOP & PHANTOM UPDATE CHECK');
console.log('==============================================');

// Files to check for potential update loop issues
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
  'src/pages/Packaging/Finance/GeneralLedger.tsx',
  'src/pages/Packaging/Finance/Payments.tsx',
  'src/pages/Packaging/Finance/TaxManagement.tsx',
  // Shared Finance modules (used by Packaging)
  'src/pages/Finance/COA.tsx'
];

// Patterns that might cause update loops
const problematicPatterns = {
  // useEffect without proper dependencies
  useEffectWithoutDeps: /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[^}]*\}\s*\)/g,
  
  // useEffect with empty dependency array but using external variables
  useEffectEmptyDeps: /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[^}]*\}\s*,\s*\[\s*\]\s*\)/g,
  
  // Storage event listeners
  storageEventListeners: /addEventListener\s*\(\s*['"`]app-storage-changed['"`]/g,
  
  // Auto-sync or polling intervals
  setIntervalUsage: /setInterval\s*\(/g,
  setTimeoutUsage: /setTimeout\s*\(/g,
  
  // State updates in useEffect
  stateUpdateInEffect: /useEffect\s*\([^}]*set[A-Z][a-zA-Z]*\s*\(/g,
  
  // Storage service calls in useEffect
  storageInEffect: /useEffect\s*\([^}]*storageService\./g,
  
  // Potential infinite loops with loadData functions
  loadDataInEffect: /useEffect\s*\([^}]*load[A-Z][a-zA-Z]*\s*\(/g,
  
  // Debounce implementations
  debounceUsage: /debounce|setTimeout.*clearTimeout/g,
  
  // Auto-save or auto-update patterns
  autoSavePatterns: /auto.*save|save.*auto/gi,
  
  // Workflow state machine patterns (Packaging specific)
  workflowStateUpdates: /workflowStateMachine|setState.*workflow|workflow.*setState/gi,
  
  // Material allocator patterns (Packaging specific)
  materialAllocatorUpdates: /materialAllocator|allocate.*material|material.*allocate/gi,
  
  // Aggressive polling (< 5 seconds) - but exclude account codes
  aggressivePolling: /setTimeout\s*\([^)]*[1-4]\d{3}[^0-9]|setInterval\s*\([^)]*[1-4]\d{3}[^0-9]/g
};

// Good patterns that prevent update loops
const goodPatterns = {
  // Proper useCallback usage
  useCallbackUsage: /useCallback\s*\(/g,
  
  // Proper useMemo usage
  useMemoUsage: /useMemo\s*\(/g,
  
  // Debounce implementations
  debounceImplementation: /debounce|clearTimeout.*setTimeout/g,
  
  // Conditional updates
  conditionalUpdates: /if\s*\([^)]*\)\s*\{[^}]*set[A-Z]/g,
  
  // Dependency arrays with proper dependencies
  properDependencies: /useEffect\s*\([^}]*\}\s*,\s*\[[^\]]+\]\s*\)/g,
  
  // Workflow state machine proper usage
  workflowProperUsage: /workflowStateMachine\.transition|workflowStateMachine\.getState/g,
  
  // Material allocator proper usage
  materialAllocatorProperUsage: /materialAllocator\.allocate|materialAllocator\.deallocate/g
};

function analyzeFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return {
        file: filePath,
        exists: false,
        error: 'File not found'
      };
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Check for problematic patterns
    const issues = {};
    const goodPractices = {};
    
    Object.entries(problematicPatterns).forEach(([key, pattern]) => {
      const matches = content.match(pattern) || [];
      if (matches.length > 0) {
        issues[key] = matches.length;
      }
    });
    
    Object.entries(goodPatterns).forEach(([key, pattern]) => {
      const matches = content.match(pattern) || [];
      if (matches.length > 0) {
        goodPractices[key] = matches.length;
      }
    });
    
    // Calculate risk score
    const riskFactors = {
      useEffectWithoutDeps: (issues.useEffectWithoutDeps || 0) * 3,
      useEffectEmptyDeps: (issues.useEffectEmptyDeps || 0) * 2,
      stateUpdateInEffect: (issues.stateUpdateInEffect || 0) * 2,
      storageInEffect: (issues.storageInEffect || 0) * 2,
      loadDataInEffect: (issues.loadDataInEffect || 0) * 1,
      aggressivePolling: (issues.aggressivePolling || 0) * 3,
      workflowStateUpdates: (issues.workflowStateUpdates || 0) * 2,
      materialAllocatorUpdates: (issues.materialAllocatorUpdates || 0) * 2
    };
    
    const totalRiskScore = Object.values(riskFactors).reduce((sum, score) => sum + score, 0);
    
    // Calculate protection score
    const protectionFactors = {
      useCallbackUsage: (goodPractices.useCallbackUsage || 0) * 1,
      useMemoUsage: (goodPractices.useMemoUsage || 0) * 1,
      debounceImplementation: (goodPractices.debounceImplementation || 0) * 2,
      conditionalUpdates: (goodPractices.conditionalUpdates || 0) * 1,
      properDependencies: (goodPractices.properDependencies || 0) * 1,
      workflowProperUsage: (goodPractices.workflowProperUsage || 0) * 2,
      materialAllocatorProperUsage: (goodPractices.materialAllocatorProperUsage || 0) * 2
    };
    
    const totalProtectionScore = Object.values(protectionFactors).reduce((sum, score) => sum + score, 0);
    
    // Determine risk level
    const netRiskScore = Math.max(0, totalRiskScore - totalProtectionScore);
    let riskLevel = 'LOW';
    if (netRiskScore > 10) riskLevel = 'HIGH';
    else if (netRiskScore > 5) riskLevel = 'MEDIUM';
    
    // Check for Packaging-specific features
    const isPackagingSpecific = filePath.includes('/Packaging/');
    const hasWorkflowFeatures = (issues.workflowStateUpdates || 0) + (goodPractices.workflowProperUsage || 0) > 0;
    const hasMaterialAllocatorFeatures = (issues.materialAllocatorUpdates || 0) + (goodPractices.materialAllocatorProperUsage || 0) > 0;
    
    return {
      file: filePath,
      exists: true,
      isPackagingSpecific,
      hasWorkflowFeatures,
      hasMaterialAllocatorFeatures,
      issues,
      goodPractices,
      riskFactors,
      protectionFactors,
      totalRiskScore,
      totalProtectionScore,
      netRiskScore,
      riskLevel
    };
  } catch (error) {
    return {
      file: filePath,
      exists: true,
      error: error.message
    };
  }
}

console.log('\n🔍 ANALYZING PACKAGING FILES FOR UPDATE LOOP RISKS');
console.log('=================================================');

const results = [];
let totalFiles = 0;
let packagingFiles = 0;
let highRiskFiles = 0;
let mediumRiskFiles = 0;
let lowRiskFiles = 0;
let workflowFiles = 0;
let materialAllocatorFiles = 0;

filesToCheck.forEach(filePath => {
  const result = analyzeFile(filePath);
  results.push(result);
  
  if (result.exists && !result.error) {
    totalFiles++;
    
    if (result.isPackagingSpecific) packagingFiles++;
    if (result.hasWorkflowFeatures) workflowFiles++;
    if (result.hasMaterialAllocatorFeatures) materialAllocatorFiles++;
    
    const fileName = path.basename(filePath);
    const moduleType = result.isPackagingSpecific ? '📦' : '💰';
    const workflowIcon = result.hasWorkflowFeatures ? '🔄' : '';
    const materialIcon = result.hasMaterialAllocatorFeatures ? '🧮' : '';
    
    console.log(`\n📄 ${fileName} ${moduleType}${workflowIcon}${materialIcon}`);
    console.log('   ' + '-'.repeat(fileName.length + 6));
    
    // Risk assessment
    const riskColor = result.riskLevel === 'HIGH' ? '🔴' : 
                     result.riskLevel === 'MEDIUM' ? '🟡' : '🟢';
    console.log(`   ${riskColor} Risk Level: ${result.riskLevel} (Score: ${result.netRiskScore})`);
    
    if (result.riskLevel === 'HIGH') highRiskFiles++;
    else if (result.riskLevel === 'MEDIUM') mediumRiskFiles++;
    else lowRiskFiles++;
    
    // Show issues
    if (Object.keys(result.issues).length > 0) {
      console.log('   ⚠️  Potential Issues:');
      Object.entries(result.issues).forEach(([issue, count]) => {
        const description = {
          useEffectWithoutDeps: 'useEffect without dependencies',
          useEffectEmptyDeps: 'useEffect with empty deps but external vars',
          storageEventListeners: 'Storage event listeners',
          stateUpdateInEffect: 'State updates in useEffect',
          storageInEffect: 'Storage calls in useEffect',
          loadDataInEffect: 'Load data functions in useEffect',
          aggressivePolling: 'Aggressive polling intervals',
          setIntervalUsage: 'setInterval usage',
          setTimeoutUsage: 'setTimeout usage',
          workflowStateUpdates: 'Workflow state updates',
          materialAllocatorUpdates: 'Material allocator updates'
        };
        console.log(`      - ${description[issue] || issue}: ${count}`);
      });
    }
    
    // Show good practices
    if (Object.keys(result.goodPractices).length > 0) {
      console.log('   ✅ Good Practices:');
      Object.entries(result.goodPractices).forEach(([practice, count]) => {
        const description = {
          useCallbackUsage: 'useCallback usage',
          useMemoUsage: 'useMemo usage',
          debounceImplementation: 'Debounce implementation',
          conditionalUpdates: 'Conditional updates',
          properDependencies: 'Proper dependency arrays',
          workflowProperUsage: 'Proper workflow state machine usage',
          materialAllocatorProperUsage: 'Proper material allocator usage'
        };
        console.log(`      - ${description[practice] || practice}: ${count}`);
      });
    }
    
    // Risk breakdown
    if (result.totalRiskScore > 0) {
      console.log(`   📊 Risk Breakdown: ${result.totalRiskScore} (mitigated by ${result.totalProtectionScore})`);
    }
  } else if (result.error) {
    console.log(`\n❌ ${path.basename(filePath)}: ${result.error}`);
  } else {
    console.log(`\n❌ ${path.basename(filePath)}: File not found`);
  }
});

console.log('\n📈 SUMMARY REPORT');
console.log('================');

console.log(`📊 Files analyzed: ${totalFiles}`);
console.log(`📦 Packaging-specific files: ${packagingFiles}`);
console.log(`💰 Finance files: ${totalFiles - packagingFiles}`);
console.log(`🔄 Files with workflow features: ${workflowFiles}`);
console.log(`🧮 Files with material allocator features: ${materialAllocatorFiles}`);
console.log(`🟢 Low risk: ${lowRiskFiles}/${totalFiles} (${Math.round((lowRiskFiles/totalFiles)*100)}%)`);
console.log(`🟡 Medium risk: ${mediumRiskFiles}/${totalFiles} (${Math.round((mediumRiskFiles/totalFiles)*100)}%)`);
console.log(`🔴 High risk: ${highRiskFiles}/${totalFiles} (${Math.round((highRiskFiles/totalFiles)*100)}%)`);

// High risk files
const highRiskResults = results.filter(r => r.riskLevel === 'HIGH');
if (highRiskResults.length > 0) {
  console.log('\n🔴 HIGH RISK FILES (Likely to cause update loops):');
  highRiskResults.forEach(result => {
    const moduleType = result.isPackagingSpecific ? '📦' : '💰';
    console.log(`   - ${path.basename(result.file)} ${moduleType} (Score: ${result.netRiskScore})`);
    Object.entries(result.issues).forEach(([issue, count]) => {
      if (count > 0) {
        console.log(`     * ${issue}: ${count}`);
      }
    });
  });
}

// Medium risk files
const mediumRiskResults = results.filter(r => r.riskLevel === 'MEDIUM');
if (mediumRiskResults.length > 0) {
  console.log('\n🟡 MEDIUM RISK FILES (Monitor for issues):');
  mediumRiskResults.forEach(result => {
    const moduleType = result.isPackagingSpecific ? '📦' : '💰';
    console.log(`   - ${path.basename(result.file)} ${moduleType} (Score: ${result.netRiskScore})`);
  });
}

console.log('\n🔧 RECOMMENDATIONS');
console.log('==================');

if (highRiskFiles > 0) {
  console.log('🔴 CRITICAL ISSUES TO FIX:');
  console.log('   1. Add proper dependency arrays to useEffect hooks');
  console.log('   2. Use useCallback for functions used in useEffect dependencies');
  console.log('   3. Implement debouncing for frequent operations');
  console.log('   4. Avoid state updates in useEffect without proper conditions');
  console.log('   5. Consider using useMemo for expensive calculations');
}

if (mediumRiskFiles > 0) {
  console.log('🟡 IMPROVEMENTS TO CONSIDER:');
  console.log('   1. Review useEffect dependency arrays');
  console.log('   2. Add conditional checks before state updates');
  console.log('   3. Implement proper cleanup in useEffect');
}

console.log('\n📦 PACKAGING-SPECIFIC RECOMMENDATIONS:');
if (workflowFiles > 0) {
  console.log('🔄 WORKFLOW STATE MACHINE:');
  console.log('   1. Ensure workflow transitions are properly debounced');
  console.log('   2. Use conditional checks before state transitions');
  console.log('   3. Implement proper error handling for state transitions');
}

if (materialAllocatorFiles > 0) {
  console.log('🧮 MATERIAL ALLOCATOR:');
  console.log('   1. Debounce material allocation operations');
  console.log('   2. Use conditional checks before allocation/deallocation');
  console.log('   3. Implement proper cleanup for allocation locks');
}

console.log('\n🎯 BEST PRACTICES:');
console.log('   1. Always include all dependencies in useEffect dependency arrays');
console.log('   2. Use useCallback for functions that are dependencies');
console.log('   3. Use useMemo for expensive calculations');
console.log('   4. Implement debouncing for user input and frequent operations');
console.log('   5. Add conditional checks before triggering state updates');
console.log('   6. Use cleanup functions in useEffect for event listeners');
console.log('   7. Properly handle workflow state transitions');
console.log('   8. Implement safe material allocation patterns');

// Overall assessment
const overallRiskScore = results.reduce((sum, r) => sum + (r.netRiskScore || 0), 0);
const avgRiskScore = totalFiles > 0 ? overallRiskScore / totalFiles : 0;

console.log('\n🎯 OVERALL ASSESSMENT');
console.log('====================');

if (highRiskFiles === 0 && mediumRiskFiles === 0) {
  console.log('🎉 EXCELLENT: No significant update loop risks detected');
  console.log('✅ Packaging modules appear to be well-optimized');
} else if (highRiskFiles === 0) {
  console.log('✅ GOOD: No high-risk files, but some medium-risk areas to monitor');
  console.log('🔧 Consider implementing suggested improvements');
} else {
  console.log('⚠️  ATTENTION NEEDED: High-risk files detected');
  console.log('🚨 Address critical issues to prevent update loops');
}

console.log(`📊 Average Risk Score: ${avgRiskScore.toFixed(1)}`);
console.log(`📦 Packaging Files Risk: ${packagingFiles > 0 ? (results.filter(r => r.isPackagingSpecific).reduce((sum, r) => sum + (r.netRiskScore || 0), 0) / packagingFiles).toFixed(1) : 0}`);

// Export results
const reportData = {
  timestamp: new Date().toISOString(),
  totalFiles,
  packagingFiles,
  workflowFiles,
  materialAllocatorFiles,
  highRiskFiles,
  mediumRiskFiles,
  lowRiskFiles,
  overallRiskScore,
  avgRiskScore,
  results: results.map(r => ({
    file: r.file,
    isPackagingSpecific: r.isPackagingSpecific,
    hasWorkflowFeatures: r.hasWorkflowFeatures,
    hasMaterialAllocatorFeatures: r.hasMaterialAllocatorFeatures,
    riskLevel: r.riskLevel,
    netRiskScore: r.netRiskScore,
    issues: r.issues,
    goodPractices: r.goodPractices
  }))
};

fs.writeFileSync('packaging-update-loop-check-report.json', JSON.stringify(reportData, null, 2));
console.log('\n📄 Detailed report saved to: packaging-update-loop-check-report.json');