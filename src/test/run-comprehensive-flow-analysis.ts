/**
 * Run Comprehensive Flow Analysis
 * Execute complete flow weakness and strength analysis
 */

import { comprehensiveFlowAnalysis } from './comprehensive-flow-analysis';

async function runComprehensiveFlowAnalysis() {
  try {
    console.log('🚀 Starting Comprehensive Flow Analysis...');
    console.log('=========================================');
    
    await comprehensiveFlowAnalysis.runAnalysis();
    
    console.log('\n✅ Comprehensive flow analysis completed successfully!');
  } catch (error) {
    console.error('❌ Error running comprehensive flow analysis:', error);
    process.exit(1);
  }
}

// Run the analysis
runComprehensiveFlowAnalysis();