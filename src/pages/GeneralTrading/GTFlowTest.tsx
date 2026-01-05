import { useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { GTFlowTester } from '../../test/gt-flow-test';
import '../../styles/common.css';

const GTFlowTest = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<string>('');

  const runTests = async () => {
    setIsRunning(true);
    setTestResults('🧪 Starting GT Flow Tests...\n\n');

    try {
      // Capture console output
      const originalLog = console.log;
      let output = '';
      
      console.log = (...args: any[]) => {
        const message = args.join(' ');
        output += message + '\n';
        originalLog(...args);
      };

      const tester = new GTFlowTester();
      await tester.runAllTests();

      // Restore console.log
      console.log = originalLog;
      
      setTestResults(output);
    } catch (error: any) {
      setTestResults(prev => prev + `\n💥 Test execution failed: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const clearResults = () => {
    setTestResults('');
  };

  return (
    <div className="module-compact">
      <div className="page-header">
        <h1>GT Flow Test Runner</h1>
        <p>Test the complete General Trading workflow from SO to Delivery</p>
      </div>

      <Card className="mb-4">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '16px' }}>
          <Button
            variant="primary"
            onClick={runTests}
            disabled={isRunning}
            style={{ minWidth: '120px' }}
          >
            {isRunning ? '🔄 Running...' : '🧪 Run Tests'}
          </Button>
          
          <Button
            variant="secondary"
            onClick={clearResults}
            disabled={isRunning}
          >
            🗑️ Clear Results
          </Button>
        </div>

        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          <p><strong>Test Coverage:</strong></p>
          <ul style={{ marginLeft: '20px', lineHeight: '1.6' }}>
            <li>Setup test data (customers, products, inventory)</li>
            <li>GT SalesOrders: Create SO, validation, quotation flow</li>
            <li>GT PPIC: Notifications, SPK creation, inventory check, PR creation</li>
            <li>GT DeliveryNote: Notifications, delivery creation, inventory update, SJ generation</li>
            <li>Integration: Complete flow, stock shortage, multiple products</li>
            <li>Cleanup test data</li>
          </ul>
        </div>
      </Card>

      {testResults && (
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0 }}>Test Results</h3>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              {new Date().toLocaleString()}
            </div>
          </div>
          
          <div 
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '16px',
              fontFamily: 'monospace',
              fontSize: '13px',
              lineHeight: '1.4',
              whiteSpace: 'pre-wrap',
              maxHeight: '600px',
              overflowY: 'auto',
              color: 'var(--text-primary)'
            }}
          >
            {testResults}
          </div>
        </Card>
      )}

      {!testResults && (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧪</div>
            <p>Click "Run Tests" to start testing the GT flow</p>
            <p style={{ fontSize: '14px', marginTop: '12px' }}>
              This will create test data, run through the complete GT workflow, and clean up afterwards.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default GTFlowTest;