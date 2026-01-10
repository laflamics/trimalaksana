/**
 * Runner for PTP Comprehensive Flow Test
 * Test speed, deletion timestamp, dan end-to-end flow PTP
 */

import { ptpComprehensiveFlowTest } from './ptp-comprehensive-flow-test';

async function runPTPComprehensiveTest() {
  console.log('🚀 Starting PTP Comprehensive Flow Test...');
  console.log('');

  try {
    const result = await ptpComprehensiveFlowTest.runCompleteTest();
    
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('========================');
    console.log(`Test Suite: ${result.testSuite}`);
    console.log(`Total Tests: ${result.totalTests}`);
    console.log(`Passed: ${result.passedTests} ✅`);
    console.log(`Failed: ${result.failedTests} ${result.failedTests > 0 ? '❌' : '✅'}`);
    console.log(`Total Duration: ${result.totalDuration}ms`);
    console.log(`Summary: ${result.summary}`);
    console.log('');

    // Detailed results
    console.log('📋 DETAILED TEST RESULTS');
    console.log('=========================');
    result.results.forEach((test, index) => {
      const status = test.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${index + 1}. ${test.testName}: ${status} (${test.duration}ms)`);
      console.log(`   Details: ${test.details}`);
      
      if (test.issues && test.issues.length > 0) {
        console.log(`   Issues:`);
        test.issues.forEach(issue => {
          console.log(`   - ${issue}`);
        });
      }
      console.log('');
    });

    // Performance Analysis
    console.log('⚡ PERFORMANCE ANALYSIS');
    console.log('=======================');
    
    const speedTests = result.results.filter(r => r.testName.includes('Speed'));
    const avgSpeedTestDuration = speedTests.length > 0 
      ? speedTests.reduce((sum, test) => sum + test.duration, 0) / speedTests.length 
      : 0;
    
    console.log(`Speed Tests: ${speedTests.length} tests, avg ${avgSpeedTestDuration.toFixed(1)}ms`);
    
    const deletionTests = result.results.filter(r => r.testName.includes('Deletion'));
    const avgDeletionTestDuration = deletionTests.length > 0 
      ? deletionTests.reduce((sum, test) => sum + test.duration, 0) / deletionTests.length 
      : 0;
    
    console.log(`Deletion Tests: ${deletionTests.length} tests, avg ${avgDeletionTestDuration.toFixed(1)}ms`);
    
    const flowTests = result.results.filter(r => r.testName.includes('Flow'));
    const avgFlowTestDuration = flowTests.length > 0 
      ? flowTests.reduce((sum, test) => sum + test.duration, 0) / flowTests.length 
      : 0;
    
    console.log(`Flow Tests: ${flowTests.length} tests, avg ${avgFlowTestDuration.toFixed(1)}ms`);
    console.log('');

    // Issue Summary
    if (result.failedTests > 0) {
      console.log('🚨 ISSUES FOUND');
      console.log('===============');
      
      const allIssues = result.results
        .filter(r => r.issues && r.issues.length > 0)
        .flatMap(r => r.issues || []);
      
      const uniqueIssues = [...new Set(allIssues)];
      uniqueIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
      console.log('');
    }

    // Recommendations
    console.log('💡 RECOMMENDATIONS');
    console.log('==================');
    
    if (result.failedTests === 0) {
      console.log('✅ All tests passed! PTP flow is performing well.');
      console.log('✅ Button speeds are optimal');
      console.log('✅ Deletion timestamps are consistent');
      console.log('✅ End-to-end flow is working correctly');
    } else {
      console.log('⚠️  Some tests failed. Review the issues above.');
      
      const slowTests = result.results.filter(r => 
        r.issues?.some(issue => issue.includes('slow')) || false
      );
      
      if (slowTests.length > 0) {
        console.log('🐌 Performance issues detected:');
        slowTests.forEach(test => {
          console.log(`   - ${test.testName}: Review for optimization`);
        });
      }
      
      const timestampIssues = result.results.filter(r => 
        r.issues?.some(issue => issue.includes('timestamp')) || false
      );
      
      if (timestampIssues.length > 0) {
        console.log('⏰ Timestamp issues detected:');
        timestampIssues.forEach(test => {
          console.log(`   - ${test.testName}: Check timestamp handling`);
        });
      }
    }
    
    console.log('');
    console.log('🎯 PTP Comprehensive Test Complete!');
    
    return result;
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  runPTPComprehensiveTest()
    .then(() => {
      console.log('✅ Test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Test failed:', error);
      process.exit(1);
    });
}

export { runPTPComprehensiveTest };