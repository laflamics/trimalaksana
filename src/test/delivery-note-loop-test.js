/**
 * Delivery Note Loop Test
 * Test untuk detect infinite loops, dialog spam, dan performance issues di DN Packaging
 */

class DeliveryNoteLoopTest {
  constructor() {
    this.testResults = [];
    this.loopDetector = new Map();
    this.dialogCount = 0;
    this.alertCount = 0;
    this.intervalCount = 0;
    this.timeoutCount = 0;
  }

  async runCompleteTest() {
    console.log('🚨 DELIVERY NOTE LOOP TEST');
    console.log('===========================');
    console.log('Testing DN Packaging for infinite loops, dialog spam, and performance issues');
    console.log('');

    this.testResults = [];
    const startTime = Date.now();

    // Setup monitoring
    this.setupMonitoring();

    // Run tests
    await this.testUseEffectLoops();
    await this.testIntervalLeaks();
    await this.testDialogSpam();
    await this.testLoadNotificationsLoop();
    await this.testStorageEventLoop();
    await this.testStateUpdateLoop();
    await this.testJSONStringifyPerformance();
    await this.testMemoryLeaks();
    await this.testEventListenerLeaks();
    await this.testDebounceIssues();

    const totalDuration = Date.now() - startTime;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = this.testResults.filter(r => !r.passed).length;

    return {
      testSuite: 'Delivery Note Loop Test',
      totalTests: this.testResults.length,
      passedTests,
      failedTests,
      totalDuration,
      results: this.testResults,
      summary: this.generateSummary(passedTests, failedTests, totalDuration),
      monitoring: {
        dialogCount: this.dialogCount,
        alertCount: this.alertCount,
        intervalCount: this.intervalCount,
        timeoutCount: this.timeoutCount
      }
    };
  }

  setupMonitoring() {
    // Mock console methods to detect spam
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    let logCount = 0;
    console.log = (...args) => {
      logCount++;
      if (logCount > 100) {
        this.addIssue('Console spam detected - too many console.log calls');
      }
      return originalLog.apply(console, args);
    };

    // Mock alert/dialog functions
    global.alert = () => {
      this.alertCount++;
      if (this.alertCount > 5) {
        this.addIssue('Alert spam detected - too many alert calls');
      }
    };

    // Mock setInterval/setTimeout
    const originalSetInterval = global.setInterval;
    const originalSetTimeout = global.setTimeout;

    global.setInterval = (callback, delay) => {
      this.intervalCount++;
      if (this.intervalCount > 10) {
        this.addIssue('Interval leak detected - too many setInterval calls');
      }
      return originalSetInterval(callback, delay);
    };

    global.setTimeout = (callback, delay) => {
      this.timeoutCount++;
      if (this.timeoutCount > 50) {
        this.addIssue('Timeout spam detected - too many setTimeout calls');
      }
      return originalSetTimeout(callback, delay);
    };
  }

  addIssue(issue) {
    console.warn(`⚠️ ISSUE DETECTED: ${issue}`);
  }

  async testUseEffectLoops() {
    const testName = 'useEffect Infinite Loop Test';
    const startTime = Date.now();
    const issues = [];

    try {
      // Simulate useEffect with missing dependencies
      let renderCount = 0;
      const maxRenders = 10;

      const mockUseEffect = (callback, deps) => {
        renderCount++;
        if (renderCount > maxRenders) {
          issues.push(`useEffect infinite loop detected - ${renderCount} renders`);
          return;
        }

        // Simulate the problematic useEffect from DN
        if (!deps || deps.length === 0) {
          // Empty deps array - should only run once
          callback();
        } else {
          // Check if deps changed (simplified)
          callback();
        }
      };

      // Test the actual useEffect pattern from DN
      mockUseEffect(() => {
        // This simulates loadDeliveries, loadNotifications, etc.
        // If these functions trigger state updates that cause re-renders,
        // we get infinite loops
      }, []); // Empty deps - should be safe

      // Test problematic pattern - missing deps
      mockUseEffect(() => {
        // This would cause infinite loop if it updates state
        // that's used in the component but not in deps
      }); // No deps array - runs on every render!

      if (renderCount > 5) {
        issues.push(`Excessive re-renders detected: ${renderCount}`);
      }

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `Render count: ${renderCount}`,
        issues: issues.length > 0 ? issues : undefined
      });

    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: `Error: ${error}`,
        issues: [`Test failed with error: ${error}`]
      });
    }
  }

  async testIntervalLeaks() {
    const testName = 'Interval Memory Leak Test';
    const startTime = Date.now();
    const issues = [];

    try {
      let activeIntervals = 0;
      const intervals = [];

      // Mock the DN interval pattern
      const createInterval = () => {
        const interval = setInterval(() => {
          // Simulate loadDeliveries, loadNotifications
          activeIntervals++;
        }, 15000);
        intervals.push(interval);
        return interval;
      };

      // Create multiple intervals (simulating component re-mounts)
      for (let i = 0; i < 5; i++) {
        createInterval();
      }

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100));

      if (intervals.length > 1) {
        issues.push(`Multiple intervals created: ${intervals.length} (should be 1)`);
      }

      // Cleanup
      intervals.forEach(interval => clearInterval(interval));

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `Created ${intervals.length} intervals`,
        issues: issues.length > 0 ? issues : undefined
      });

    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: `Error: ${error}`,
        issues: [`Test failed with error: ${error}`]
      });
    }
  }

  async testDialogSpam() {
    const testName = 'Dialog Spam Detection Test';
    const startTime = Date.now();
    const issues = [];

    try {
      let dialogCallCount = 0;
      const mockShowAlert = (title, message) => {
        dialogCallCount++;
        if (dialogCallCount > 3) {
          issues.push(`Dialog spam detected: ${dialogCallCount} calls in short time`);
        }
      };

      // Simulate rapid dialog calls (like in error loops)
      for (let i = 0; i < 10; i++) {
        mockShowAlert('Error', 'Test error message');
      }

      if (dialogCallCount > 5) {
        issues.push(`Excessive dialog calls: ${dialogCallCount}`);
      }

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `Dialog calls: ${dialogCallCount}`,
        issues: issues.length > 0 ? issues : undefined
      });

    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: `Error: ${error}`,
        issues: [`Test failed with error: ${error}`]
      });
    }
  }

  async testLoadNotificationsLoop() {
    const testName = 'loadNotifications Loop Test';
    const startTime = Date.now();
    const issues = [];

    try {
      let loadCount = 0;
      const mockStorageService = {
        get: async (key) => {
          loadCount++;
          if (loadCount > 20) {
            issues.push(`loadNotifications called too many times: ${loadCount}`);
          }
          return [];
        }
      };

      const mockLoadNotifications = async () => {
        // Simulate the actual loadNotifications function
        await mockStorageService.get('deliveryNotifications');
        await mockStorageService.get('schedule');
        await mockStorageService.get('delivery');
        await mockStorageService.get('inventory');
        await mockStorageService.get('spk');
        await mockStorageService.get('production');
        await mockStorageService.get('qc');
      };

      // Call multiple times (simulating rapid calls)
      for (let i = 0; i < 10; i++) {
        await mockLoadNotifications();
      }

      if (loadCount > 50) {
        issues.push(`Excessive storage calls in loadNotifications: ${loadCount}`);
      }

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `Storage calls: ${loadCount}`,
        issues: issues.length > 0 ? issues : undefined
      });

    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: `Error: ${error}`,
        issues: [`Test failed with error: ${error}`]
      });
    }
  }

  async testStorageEventLoop() {
    const testName = 'Storage Event Loop Test';
    const startTime = Date.now();
    const issues = [];

    try {
      let eventCount = 0;
      const mockEventHandler = (event) => {
        eventCount++;
        if (eventCount > 10) {
          issues.push(`Storage event loop detected: ${eventCount} events`);
        }
      };

      // Simulate rapid storage events
      for (let i = 0; i < 15; i++) {
        mockEventHandler({ detail: { key: 'delivery' } });
      }

      if (eventCount > 12) {
        issues.push(`Excessive storage events: ${eventCount}`);
      }

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `Event count: ${eventCount}`,
        issues: issues.length > 0 ? issues : undefined
      });

    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: `Error: ${error}`,
        issues: [`Test failed with error: ${error}`]
      });
    }
  }

  async testStateUpdateLoop() {
    const testName = 'State Update Loop Test';
    const startTime = Date.now();
    const issues = [];

    try {
      let updateCount = 0;
      const mockSetState = (newState) => {
        updateCount++;
        if (updateCount > 15) {
          issues.push(`State update loop detected: ${updateCount} updates`);
        }
      };

      // Simulate the problematic setState pattern
      const mockData = [{ id: 1, name: 'test' }];
      
      // This pattern can cause loops if not handled properly
      for (let i = 0; i < 20; i++) {
        mockSetState((prev) => {
          // JSON.stringify comparison (expensive and can cause issues)
          if (JSON.stringify(prev) === JSON.stringify(mockData)) {
            return prev; // No change
          }
          return mockData;
        });
      }

      if (updateCount > 10) {
        issues.push(`Excessive state updates: ${updateCount}`);
      }

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `State updates: ${updateCount}`,
        issues: issues.length > 0 ? issues : undefined
      });

    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: `Error: ${error}`,
        issues: [`Test failed with error: ${error}`]
      });
    }
  }

  async testJSONStringifyPerformance() {
    const testName = 'JSON.stringify Performance Test';
    const startTime = Date.now();
    const issues = [];

    try {
      // Create large mock data (like DN notifications)
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        spkNo: `SPK-${i}`,
        deliveryBatches: Array.from({ length: 10 }, (_, j) => ({
          batchNo: `B${j}`,
          qty: 100,
          deliveryDate: new Date().toISOString()
        }))
      }));

      let stringifyCount = 0;
      const stringifyStart = Date.now();

      // Simulate the JSON.stringify calls in setState comparisons
      for (let i = 0; i < 100; i++) {
        JSON.stringify(largeData);
        stringifyCount++;
      }

      const stringifyDuration = Date.now() - stringifyStart;

      if (stringifyDuration > 1000) {
        issues.push(`JSON.stringify too slow: ${stringifyDuration}ms for ${stringifyCount} calls`);
      }

      if (stringifyCount > 50) {
        issues.push(`Too many JSON.stringify calls: ${stringifyCount}`);
      }

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `${stringifyCount} JSON.stringify calls in ${stringifyDuration}ms`,
        issues: issues.length > 0 ? issues : undefined
      });

    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: `Error: ${error}`,
        issues: [`Test failed with error: ${error}`]
      });
    }
  }

  async testMemoryLeaks() {
    const testName = 'Memory Leak Detection Test';
    const startTime = Date.now();
    const issues = [];

    try {
      const initialMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
      
      // Simulate memory-intensive operations
      const leakyArrays = [];
      for (let i = 0; i < 100; i++) {
        // Create large objects that might not be garbage collected
        leakyArrays.push(new Array(1000).fill({ data: 'test'.repeat(100) }));
      }

      const afterMemory = process.memoryUsage ? process.memoryUsage().heapUsed : 0;
      const memoryIncrease = afterMemory - initialMemory;

      if (memoryIncrease > 50 * 1024 * 1024) { // 50MB
        issues.push(`Significant memory increase detected: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
      }

      // Cleanup
      leakyArrays.length = 0;

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `Memory increase: ${Math.round(memoryIncrease / 1024)}KB`,
        issues: issues.length > 0 ? issues : undefined
      });

    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: `Error: ${error}`,
        issues: [`Test failed with error: ${error}`]
      });
    }
  }

  async testEventListenerLeaks() {
    const testName = 'Event Listener Leak Test';
    const startTime = Date.now();
    const issues = [];

    try {
      let listenerCount = 0;
      const mockAddEventListener = (event, handler) => {
        listenerCount++;
      };

      const mockRemoveEventListener = (event, handler) => {
        listenerCount--;
      };

      // Simulate adding listeners without proper cleanup
      for (let i = 0; i < 10; i++) {
        mockAddEventListener('app-storage-changed', () => {});
      }

      if (listenerCount > 5) {
        issues.push(`Too many event listeners: ${listenerCount}`);
      }

      // Simulate proper cleanup
      for (let i = 0; i < 5; i++) {
        mockRemoveEventListener('app-storage-changed', () => {});
      }

      if (listenerCount > 1) {
        issues.push(`Event listeners not properly cleaned up: ${listenerCount} remaining`);
      }

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `Final listener count: ${listenerCount}`,
        issues: issues.length > 0 ? issues : undefined
      });

    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: `Error: ${error}`,
        issues: [`Test failed with error: ${error}`]
      });
    }
  }

  async testDebounceIssues() {
    const testName = 'Debounce Logic Test';
    const startTime = Date.now();
    const issues = [];

    try {
      let debounceCallCount = 0;
      let actualCallCount = 0;
      let debounceTimer = null;

      const mockDebouncedFunction = () => {
        debounceCallCount++;
        
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }
        
        debounceTimer = setTimeout(() => {
          actualCallCount++;
          debounceTimer = null;
        }, 300);
      };

      // Rapid calls (should be debounced)
      for (let i = 0; i < 20; i++) {
        mockDebouncedFunction();
        await new Promise(resolve => setTimeout(resolve, 50)); // 50ms between calls
      }

      // Wait for debounce to complete
      await new Promise(resolve => setTimeout(resolve, 400));

      if (actualCallCount > 5) {
        issues.push(`Debounce not working properly: ${actualCallCount} actual calls from ${debounceCallCount} debounce calls`);
      }

      if (debounceCallCount !== 20) {
        issues.push(`Debounce call count mismatch: expected 20, got ${debounceCallCount}`);
      }

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `${debounceCallCount} debounce calls resulted in ${actualCallCount} actual calls`,
        issues: issues.length > 0 ? issues : undefined
      });

    } catch (error) {
      this.testResults.push({
        testName,
        passed: false,
        duration: Date.now() - startTime,
        details: `Error: ${error}`,
        issues: [`Test failed with error: ${error}`]
      });
    }
  }

  generateSummary(passed, failed, duration) {
    const total = passed + failed;
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : '0';
    
    let status = 'EXCELLENT';
    if (failed > 0) status = 'CRITICAL';
    if (failed > total * 0.5) status = 'EMERGENCY';

    return `DN Loop Test Complete: ${passed}/${total} tests passed (${passRate}%) in ${duration}ms - Status: ${status}`;
  }
}

// Run the test
async function runDeliveryNoteLoopTest() {
  const test = new DeliveryNoteLoopTest();
  const result = await test.runCompleteTest();
  
  console.log('🚨 DELIVERY NOTE LOOP TEST RESULTS');
  console.log('===================================');
  console.log(`Test Suite: ${result.testSuite}`);
  console.log(`Total Tests: ${result.totalTests}`);
  console.log(`Passed: ${result.passedTests} ${result.passedTests === result.totalTests ? '✅' : '⚠️'}`);
  console.log(`Failed: ${result.failedTests} ${result.failedTests > 0 ? '❌' : '✅'}`);
  console.log(`Total Duration: ${result.totalDuration}ms`);
  console.log(`Summary: ${result.summary}`);
  console.log('');

  // Monitoring results
  console.log('📊 MONITORING RESULTS');
  console.log('=====================');
  console.log(`Dialog Calls: ${result.monitoring.dialogCount}`);
  console.log(`Alert Calls: ${result.monitoring.alertCount}`);
  console.log(`Intervals Created: ${result.monitoring.intervalCount}`);
  console.log(`Timeouts Created: ${result.monitoring.timeoutCount}`);
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

  // Critical issues summary
  const criticalIssues = result.results
    .filter(r => !r.passed)
    .flatMap(r => r.issues || []);

  if (criticalIssues.length > 0) {
    console.log('🚨 CRITICAL ISSUES FOUND');
    console.log('========================');
    criticalIssues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
    console.log('');
  }

  console.log('🎯 DN Loop Test Complete!');
  
  return result;
}

// Run the test
runDeliveryNoteLoopTest().catch(console.error);