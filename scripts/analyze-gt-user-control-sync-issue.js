/**
 * Analyze GT User Control Sync Issue
 * Identify root cause of cross-device sync problem
 */

const fs = require('fs');

function readJsonFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error.message);
    return null;
  }
}

function analyzeSyncIssue() {
  console.log('🔍 ANALYZING GT USER CONTROL SYNC ISSUE\n');
  
  // Check current state of files
  const mainFile = 'data/localStorage/userAccessControl.json';
  const gtFile = 'data/localStorage/general-trading/userAccessControl.json';
  
  const mainData = readJsonFile(mainFile);
  const gtData = readJsonFile(gtFile);
  
  console.log('📁 CURRENT FILE STATUS:');
  console.log(`Main file (${mainFile}):`);
  if (mainData) {
    const users = mainData.value || mainData;
    const userCount = Array.isArray(users) ? users.length : 0;
    const gtUsers = Array.isArray(users) ? users.filter(u => u.businessUnits && u.businessUnits.includes('general-trading')).length : 0;
    console.log(`   ✅ Exists: ${userCount} total users, ${gtUsers} GT users`);
    console.log(`   📊 Structure: ${mainData.value ? 'wrapped' : 'direct'} array`);
  } else {
    console.log('   ❌ File not found or corrupted');
  }
  
  console.log(`\nGT file (${gtFile}):`);
  if (gtData) {
    if (gtData.value) {
      if (Array.isArray(gtData.value)) {
        console.log(`   ✅ Exists: ${gtData.value.length} users (wrapped array)`);
      } else if (typeof gtData.value === 'object') {
        console.log('   ❌ PROBLEM: value is empty object {} instead of array');
      }
    } else if (Array.isArray(gtData)) {
      console.log(`   ✅ Exists: ${gtData.length} users (direct array)`);
    } else {
      console.log('   ❌ PROBLEM: Unknown structure');
    }
  } else {
    console.log('   ❌ File not found');
  }
  
  return { mainData, gtData };
}

function identifyRootCause(mainData, gtData) {
  console.log('\n🔍 ROOT CAUSE ANALYSIS:\n');
  
  const issues = [];
  
  // Issue 1: GT file has empty value object
  if (gtData && gtData.value && typeof gtData.value === 'object' && !Array.isArray(gtData.value)) {
    issues.push({
      type: 'EMPTY_VALUE_OBJECT',
      description: 'GT userAccessControl.json has value: {} instead of value: []',
      severity: 'HIGH',
      impact: 'GT User Control appears empty on other devices'
    });
  }
  
  // Issue 2: Missing GT file
  if (!gtData) {
    issues.push({
      type: 'MISSING_GT_FILE',
      description: 'GT userAccessControl.json file does not exist',
      severity: 'HIGH',
      impact: 'GT User Control cannot load data on other devices'
    });
  }
  
  // Issue 3: Data structure mismatch
  if (mainData && gtData) {
    const mainHasWrapper = !!mainData.value;
    const gtHasWrapper = !!gtData.value;
    
    if (mainHasWrapper !== gtHasWrapper) {
      issues.push({
        type: 'STRUCTURE_MISMATCH',
        description: 'Main and GT files have different data structures',
        severity: 'MEDIUM',
        impact: 'Inconsistent data loading behavior'
      });
    }
  }
  
  // Issue 4: Sync mechanism problem
  if (mainData && mainData.value && Array.isArray(mainData.value) && mainData.value.length > 0) {
    const gtUsers = mainData.value.filter(u => u.businessUnits && u.businessUnits.includes('general-trading'));
    if (gtUsers.length > 0 && (!gtData || !gtData.value || !Array.isArray(gtData.value) || gtData.value.length === 0)) {
      issues.push({
        type: 'SYNC_FAILURE',
        description: 'Main file has GT users but GT file is empty/corrupted',
        severity: 'HIGH',
        impact: 'Cross-device sync not working properly'
      });
    }
  }
  
  console.log('🚨 IDENTIFIED ISSUES:');
  issues.forEach((issue, index) => {
    console.log(`\n${index + 1}. ${issue.type} (${issue.severity} severity)`);
    console.log(`   📝 Description: ${issue.description}`);
    console.log(`   💥 Impact: ${issue.impact}`);
  });
  
  return issues;
}

function explainSyncMechanism() {
  console.log('\n🔄 HOW SYNC SHOULD WORK:\n');
  
  console.log('1. UNIFIED STORAGE KEY:');
  console.log('   - GT User Control uses key "userAccessControl" (no prefix)');
  console.log('   - This is shared across all business units');
  console.log('   - File location: data/localStorage/general-trading/userAccessControl.json');
  
  console.log('\n2. DATA STRUCTURE:');
  console.log('   - Should be: { "value": [...users...], "timestamp": ... }');
  console.log('   - GT extracts users with businessUnits containing "general-trading"');
  
  console.log('\n3. CROSS-DEVICE SYNC:');
  console.log('   - When user creates/edits in GT → saves to userAccessControl');
  console.log('   - Other devices read from same userAccessControl file');
  console.log('   - GT User Control filters for GT users only');
  
  console.log('\n4. MIGRATION LOGIC:');
  console.log('   - GT User Control merges data from old keys if needed');
  console.log('   - Handles both direct arrays and wrapped objects');
  console.log('   - Deduplicates by user ID');
}

function provideSolution(issues) {
  console.log('\n💊 SOLUTION STEPS:\n');
  
  if (issues.some(i => i.type === 'EMPTY_VALUE_OBJECT' || i.type === 'SYNC_FAILURE')) {
    console.log('1. IMMEDIATE FIX:');
    console.log('   - Copy user data from main file to GT file');
    console.log('   - Ensure proper array structure in GT file');
    console.log('   - Add proper timestamps');
  }
  
  if (issues.some(i => i.type === 'MISSING_GT_FILE')) {
    console.log('2. CREATE GT FILE:');
    console.log('   - Create data/localStorage/general-trading/userAccessControl.json');
    console.log('   - Copy all users from main file');
    console.log('   - Use wrapped structure: { "value": [...], "timestamp": ... }');
  }
  
  console.log('\n3. PREVENT FUTURE ISSUES:');
  console.log('   - Ensure GT sync service includes userAccessControl');
  console.log('   - Add validation in storage service');
  console.log('   - Implement force reload mechanism for user control');
  
  console.log('\n4. VERIFICATION:');
  console.log('   - Test GT User Control on different devices');
  console.log('   - Verify users appear correctly');
  console.log('   - Test create/edit functionality');
  console.log('   - Confirm cross-device sync works');
}

function generateReport() {
  console.log('\n' + '='.repeat(60));
  console.log('📊 GT USER CONTROL SYNC ISSUE REPORT');
  console.log('='.repeat(60));
  
  const { mainData, gtData } = analyzeSyncIssue();
  const issues = identifyRootCause(mainData, gtData);
  
  explainSyncMechanism();
  provideSolution(issues);
  
  console.log('\n🎯 SUMMARY:');
  console.log(`   Found ${issues.length} issues`);
  console.log(`   Primary cause: ${issues[0]?.type || 'Unknown'}`);
  console.log(`   Fix required: ${issues.length > 0 ? 'Yes' : 'No'}`);
  
  console.log('\n🏁 Analysis completed at:', new Date().toLocaleString());
  
  return { issues, needsFix: issues.length > 0 };
}

// Run analysis
generateReport();