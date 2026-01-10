/**
 * Run PTP vs SO Flow Comparison
 * Execute comprehensive comparison between PTP and SO flows
 */

import { ptpVsSOFlowComparison } from './ptp-vs-so-flow-comparison';

async function runPTPvsSOComparison() {
  try {
    console.log('🚀 Starting PTP vs SO Flow Comparison...');
    console.log('======================================');
    console.log('Testing if PTP flow matches SO flow consistency');
    console.log('');
    
    const result = await ptpVsSOFlowComparison.runComparison();
    
    console.log('\n📋 COMPARISON RESULTS:');
    console.log('=====================');
    console.log(`Flow Consistency: ${result.consistency} ${result.consistency === 'CONSISTENT' ? '✅' : '❌'}`);
    console.log(`Differences Found: ${result.differences.length}`);
    console.log(`SO Flow Steps: ${result.soFlow.length}`);
    console.log(`PTP Flow Steps: ${result.ptpFlow.length}`);
    
    if (result.differences.length > 0) {
      console.log('\n⚠️ DIFFERENCES FOUND:');
      result.differences.forEach(diff => {
        console.log(`   ❌ ${diff}`);
      });
    } else {
      console.log('\n✅ NO DIFFERENCES FOUND - FLOWS ARE CONSISTENT!');
    }
    
    console.log('\n📄 Generating detailed report...');
    const report = ptpVsSOFlowComparison.generateReport();
    console.log(report);
    
    console.log('\n✅ PTP vs SO flow comparison completed successfully!');
    
    if (result.consistency === 'INCONSISTENT') {
      console.log('\n🚨 ACTION REQUIRED: PTP flow needs to be aligned with SO flow!');
    } else {
      console.log('\n🎉 SUCCESS: PTP flow is properly aligned with SO flow!');
    }
    
  } catch (error) {
    console.error('❌ Error running PTP vs SO comparison:', error);
    process.exit(1);
  }
}

// Run the comparison
runPTPvsSOComparison();