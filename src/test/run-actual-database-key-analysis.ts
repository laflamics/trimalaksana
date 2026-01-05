/**
 * Run Actual Database Key Analysis
 * Execute analysis of keys that are ACTUALLY used in the codebase
 */

import { actualDatabaseKeyAnalysis } from './actual-database-key-analysis';

async function runActualDatabaseKeyAnalysis() {
  try {
    console.log('🚀 Starting ACTUAL Database Key Analysis...');
    console.log('==========================================');
    console.log('Analyzing keys that are REALLY used in the code');
    console.log('');
    
    await actualDatabaseKeyAnalysis.runActualAnalysis();
    
    console.log('\n✅ Actual database key analysis completed successfully!');
  } catch (error) {
    console.error('❌ Error running actual database key analysis:', error);
    process.exit(1);
  }
}

// Run the analysis
runActualDatabaseKeyAnalysis();