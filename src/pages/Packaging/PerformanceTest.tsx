import { useState, useEffect } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';

const PerformanceTest = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [loadTime, setLoadTime] = useState(0);

  useEffect(() => {
    // Simulate progressive loading
    const startTime = performance.now();
    
    const loadData = async () => {
      setIsLoading(true);
      
      // Phase 1: Critical data (instant)
      await new Promise(resolve => setTimeout(resolve, 100));
      setData([{ id: 1, name: 'Critical Data Loaded' }]);
      
      // Phase 2: Background data (non-blocking)
      requestIdleCallback(async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        setData(prev => [...prev, { id: 2, name: 'Background Data Loaded' }]);
        
        const endTime = performance.now();
        setLoadTime(endTime - startTime);
        setIsLoading(false);
      });
    };
    
    loadData();
  }, []);

  return (
    <div className="module-compact">
      <div className="page-header">
        <h1>Performance Test</h1>
        <Button onClick={() => window.location.reload()}>🔄 Reload Test</Button>
      </div>

      {/* Loading Indicator */}
      {isLoading && (
        <div className="loading-indicator">
          <div className="loading-spinner" />
          <span className="loading-text">Loading optimized data...</span>
        </div>
      )}

      {/* Performance Metrics */}
      <Card title="Performance Metrics">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <strong>Load Time:</strong> {loadTime.toFixed(2)}ms
          </div>
          <div>
            <strong>Data Items:</strong> {data.length}
          </div>
          <div>
            <strong>Status:</strong> {isLoading ? 'Loading...' : 'Complete'}
          </div>
        </div>
      </Card>

      {/* Data Display */}
      <Card title="Loaded Data">
        {data.length === 0 ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No data loaded yet...
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.map(item => (
              <div key={item.id} style={{ 
                padding: '12px', 
                backgroundColor: 'var(--bg-secondary)', 
                borderRadius: '6px' 
              }}>
                {item.name}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};

export default PerformanceTest;