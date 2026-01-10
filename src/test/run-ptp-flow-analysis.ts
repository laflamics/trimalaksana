/**
 * Run PTP Flow Analysis
 * Execute analysis of PTP implementation vs SO flow
 */

import { ptpFlowAnalysis } from './ptp-flow-analysis';

async function runPTPFlowAnalysis() {
  try {
    console.log('🚀 Starting PTP Flow Analysis...');
    console.log('=================================');
    console.log('Analyzing PTP implementation vs SO flow consistency');
    console.log('');
    
    const analysis = await ptpFlowAnalysis.analyzePTPFlow();
    
    console.log('\n📋 ANALYSIS RESULTS:');
    console.log('===================');
    
    console.log(`\n📊 SO Flow: ${analysis.soFlow.consistency} ✅`);
    console.log(`   Steps: ${analysis.soFlow.steps.length} (${analysis.soFlow.steps.filter(s => s.implemented).length} implemented)`);
    
    console.log(`\n📊 PTP Flow: ${analysis.ptpFlow.consistency} ${analysis.ptpFlow.consistency === 'CONSISTENT' ? '✅' : analysis.ptpFlow.consistency === 'PARTIALLY_CONSISTENT' ? '⚠️' : '❌'}`);
    console.log(`   Steps: ${analysis.ptpFlow.steps.length} (${analysis.ptpFlow.steps.filter(s => s.implemented).length} implemented)`);
    
    console.log(`\n📊 Overall Consistency: ${analysis.comparison.consistency} ${analysis.comparison.consistency === 'CONSISTENT' ? '✅' : analysis.comparison.consistency === 'PARTIALLY_CONSISTENT' ? '⚠️' : '❌'}`);
    console.log(`   Implementation Rate: ${(analysis.comparison.implementationRate * 100).toFixed(1)}%`);
    console.log(`   Issues Found: ${analysis.comparison.issues.length}`);
    console.log(`   Critical Issues: ${analysis.comparison.criticalIssues.length}`);
    
    if (analysis.comparison.criticalIssues.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES:');
      analysis.comparison.criticalIssues.forEach(issue => {
        console.log(`   ❌ ${issue.issue}: ${issue.description}`);
        console.log(`      Fix: ${issue.recommendation}`);
      });
    }
    
    if (analysis.comparison.issues.length > 0) {
      console.log('\n⚠️ ALL ISSUES:');
      analysis.comparison.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }
    
    if (analysis.comparison.recommendations.length > 0) {
      console.log('\n🔧 RECOMMENDATIONS:');
      analysis.comparison.recommendations.forEach(rec => {
        console.log(`   → ${rec}`);
      });
    }
    
    console.log('\n📄 Generating detailed report...');
    const report = ptpFlowAnalysis.generateReport(analysis);
    
    // Save report to file
    const fs = require('fs');
    fs.writeFileSync('PTP_FLOW_ANALYSIS_REPORT.md', report);
    console.log('📄 Report saved to: PTP_FLOW_ANALYSIS_REPORT.md');
    
    console.log('\n✅ PTP flow analysis completed successfully!');
    
    // Summary conclusion
    if (analysis.comparison.consistency === 'CONSISTENT') {
      console.log('\n🎉 SUCCESS: PTP flow is well-aligned with SO flow!');
    } else if (analysis.comparison.consistency === 'PARTIALLY_CONSISTENT') {
      console.log('\n⚠️ ATTENTION: PTP flow is mostly good but needs some fixes!');
    } else {
      console.log('\n🚨 ACTION REQUIRED: PTP flow has critical inconsistencies!');
    }
    
  } catch (error) {
    console.error('❌ Error running PTP flow analysis:', error);
    process.exit(1);
  }
}

// Run the analysis
runPTPFlowAnalysis();