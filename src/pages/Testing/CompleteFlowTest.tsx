/**
 * Complete Flow Test Page
 * UI untuk menjalankan test complete flow SO → SJ
 * Test sync speed, timestamp handling, dan multi-device conflicts
 */

import React, { useState, useRef } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { runCompleteFlowTest, quickPerformanceTest, testTimestampConflicts, testDataIntegrity } from '../../test/run-complete-flow-test';

const CompleteFlowTest = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<string[]>([]);
  const [currentTest, setCurrentTest] = useState<string>('');
  const logRef = useRef<HTMLDivElement>(null);

  // Capture console output
  const captureConsoleOutput = (testFunction: () => Promise<void>, testName: string) => {
    return new Promise<void>((resolve) => {
      const originalLog = console.log;
      const originalError = console.error;
      const logs: string[] = [];

      console.log = (...args) => {
        const message = args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        logs.push(message);
        originalLog(...args);
      };

      console.error = (...args) => {
        const message = '❌ ERROR: ' + args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        logs.push(message);
        originalError(...args);
      };

      setCurrentTest(testName);
      
      testFunction().then(() => {
        console.log = originalLog;
        console.error = originalError;
        setTestResults(prev => [...prev, ...logs]);
        resolve();
      }).catch((error) => {
        console.log = originalLog;
        console.error = originalError;
        logs.push(`❌ Test failed: ${error.message}`);
        setTestResults(prev => [...prev, ...logs]);
        resolve();
      });
    });
  };

  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setCurrentTest('');

    try {
      // Test 1: Quick Performance
      await captureConsoleOutput(quickPerformanceTest, 'Quick Performance Test');
      
      // Test 2: Timestamp Conflicts
      await captureConsoleOutput(testTimestampConflicts, 'Timestamp Conflict Test');
      
      // Test 3: Data Integrity
      await captureConsoleOutput(testDataIntegrity, 'Data Integrity Test');
      
      // Test 4: Complete Flow (comprehensive)
      await captureConsoleOutput(async () => {
        const { completeFlowSyncTest } = await import('../../test/complete-flow-sync-test');
        await completeFlowSyncTest.testCompleteFlowWithMultiDevice();
      }, 'Complete Flow Sync Test');

      setCurrentTest('✅ All tests completed!');
      
    } catch (error) {
      console.error('Test suite failed:', error);
      setTestResults(prev => [...prev, `❌ Test suite failed: ${error.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  const runSingleTest = async (testName: string, testFunction: () => Promise<void>) => {
    setIsRunning(true);
    setTestResults([]);
    
    await captureConsoleOutput(testFunction, testName);
    
    setIsRunning(false);
  };

  const clearResults = () => {
    setTestResults([]);
    setCurrentTest('');
  };

  // Auto-scroll to bottom when new results added
  React.useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [testResults]);

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>Complete Flow Sync Test</h1>
      <p>Test complete flow dari SO sampai SJ dengan focus pada sync speed dan timestamp handling</p>
      
      {/* Test Controls */}
      <Card title="Test Controls">
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
          <Button 
            variant="primary" 
            onClick={runAllTests}
            disabled={isRunning}
            style={{ minWidth: '150px' }}
          >
            {isRunning ? 'Running...' : 'Run All Tests'}
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={() => runSingleTest('Quick Performance Test', quickPerformanceTest)}
            disabled={isRunning}
          >
            Performance Test
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={() => runSingleTest('Timestamp Conflict Test', testTimestampConflicts)}
            disabled={isRunning}
          >
            Timestamp Test
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={() => runSingleTest('Data Integrity Test', testDataIntegrity)}
            disabled={isRunning}
          >
            Integrity Test
          </Button>
          
          <Button 
            variant="secondary" 
            onClick={clearResults}
            disabled={isRunning}
          >
            Clear Results
          </Button>
        </div>
        
        {currentTest && (
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: '#e3f2fd', 
            borderRadius: '4px',
            fontSize: '14px',
            color: '#1976d2'
          }}>
            🔄 Running: {currentTest}
          </div>
        )}
      </Card>

      {/* Test Scenarios */}
      <Card title="Test Scenarios">
        <div style={{ fontSize: '14px' }}>
          <h4>🧪 What We're Testing:</h4>
          <ul>
            <li><strong>Flow Speed:</strong> SO → SPK → Production → QC → SJ (target: &lt;100ms total)</li>
            <li><strong>Timestamp Handling:</strong> Prevent data corruption from device clock differences</li>
            <li><strong>Multi-Device Conflicts:</strong> Concurrent operations from different devices</li>
            <li><strong>Data Integrity:</strong> Ensure no data loss during conflict resolution</li>
            <li><strong>Sync Performance:</strong> Background sync without blocking user</li>
          </ul>
          
          <h4>🎯 Success Criteria:</h4>
          <ul>
            <li>✅ User operations complete in &lt;10ms (instant feedback)</li>
            <li>✅ No data corruption from timestamp conflicts</li>
            <li>✅ Proper conflict resolution for production quantities</li>
            <li>✅ Inventory calculations remain accurate</li>
            <li>✅ Background sync handles network latency gracefully</li>
          </ul>
        </div>
      </Card>

      {/* Test Results */}
      <Card title="Test Results">
        <div 
          ref={logRef}
          style={{ 
            height: '500px', 
            overflow: 'auto', 
            backgroundColor: '#1e1e1e', 
            color: '#ffffff',
            padding: '16px',
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            fontSize: '12px',
            lineHeight: '1.4',
            borderRadius: '6px'
          }}
        >
          {testResults.length === 0 ? (
            <div style={{ color: '#888', fontStyle: 'italic' }}>
              Click "Run All Tests" to start testing...
            </div>
          ) : (
            testResults.map((result, index) => (
              <div 
                key={index} 
                style={{ 
                  marginBottom: '4px',
                  color: result.includes('❌') ? '#ff6b6b' : 
                        result.includes('✅') ? '#51cf66' :
                        result.includes('⚠️') ? '#ffd43b' :
                        result.includes('🔄') ? '#74c0fc' :
                        '#ffffff'
                }}
              >
                {result}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Performance Metrics */}
      <Card title="Expected Performance Metrics">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '12px', backgroundColor: '#e8f5e8', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#2e7d32' }}>✅ Optimistic Updates</h4>
            <div style={{ fontSize: '12px' }}>
              <div>SO Confirmation: &lt;5ms</div>
              <div>Production Submit: &lt;5ms</div>
              <div>GRN Submit: &lt;5ms</div>
              <div>SJ Creation: &lt;5ms</div>
            </div>
          </div>
          
          <div style={{ padding: '12px', backgroundColor: '#fff3e0', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#f57c00' }}>🔄 Background Sync</h4>
            <div style={{ fontSize: '12px' }}>
              <div>Queue Processing: Non-blocking</div>
              <div>Network Latency: Handled gracefully</div>
              <div>Retry Logic: Automatic</div>
              <div>Conflict Resolution: Automatic</div>
            </div>
          </div>
          
          <div style={{ padding: '12px', backgroundColor: '#e3f2fd', borderRadius: '6px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>🛡️ Data Integrity</h4>
            <div style={{ fontSize: '12px' }}>
              <div>Timestamp Conflicts: Resolved</div>
              <div>Production Quantities: Additive</div>
              <div>Inventory: Recalculated</div>
              <div>Audit Trail: Preserved</div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default CompleteFlowTest;