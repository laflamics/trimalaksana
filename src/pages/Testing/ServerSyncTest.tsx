import React, { useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import '../../styles/common.css';

interface TestResult {
  testName: string;
  passed: boolean;
  duration: number;
  details: string;
  issues?: string[];
}

interface ServerSyncTestResult {
  testSuite: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  results: TestResult[];
  summary: string;
}

const ServerSyncTest = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [testResult, setTestResult] = useState<ServerSyncTestResult | null>(null);
  const [currentTest, setCurrentTest] = useState<string>('');

  const runTest = async () => {
    setIsRunning(true);
    setTestResult(null);
    setCurrentTest('Initializing Server Sync Test...');

    try {
      // Mock test results based on the actual test output
      const mockResults: ServerSyncTestResult = {
        testSuite: 'Server Sync Comprehensive Test',
        totalTests: 12,
        passedTests: 8,
        failedTests: 4,
        totalDuration: 4693,
        summary: 'Server Sync Test Complete: 8/12 tests passed (66.7%) in 4693ms - Status: CRITICAL',
        results: [
          {
            testName: 'Basic Local-Server Sync Test',
            passed: false,
            duration: 352,
            details: 'Synced 2 items in 352ms',
            issues: ['Data not synced to server correctly', 'Device ID not preserved in sync']
          },
          {
            testName: 'Multi-Device Conflict Resolution Test',
            passed: false,
            duration: 263,
            details: 'Conflict resolved: device-A won',
            issues: ['Incorrect conflict resolution - later timestamp should win']
          },
          {
            testName: 'Network Latency Handling Test',
            passed: false,
            duration: 62,
            details: 'Sync with latency completed in 62ms',
            issues: ['Sync completed too quickly - latency not simulated']
          },
          {
            testName: 'Network Failure Recovery Test',
            passed: true,
            duration: 1115,
            details: 'Network failure recovery successful'
          },
          {
            testName: 'Timestamp Consistency Test',
            passed: true,
            duration: 448,
            details: 'Timestamp consistency verified'
          },
          {
            testName: 'Notification Synchronization Test',
            passed: false,
            duration: 62,
            details: 'Generated 0 notifications correctly',
            issues: ['Expected 1 notification, got 0']
          },
          {
            testName: 'Notification Duplication Prevention Test',
            passed: true,
            duration: 186,
            details: 'No duplicate notifications: 1 total, 1 unique'
          },
          {
            testName: 'Large Data Synchronization Test',
            passed: true,
            duration: 327,
            details: 'Synced 1000 items in 187ms'
          },
          {
            testName: 'Concurrent Updates Test',
            passed: true,
            duration: 421,
            details: '3 concurrent updates completed successfully'
          },
          {
            testName: 'Offline Synchronization Test',
            passed: true,
            duration: 875,
            details: 'Offline sync recovery successful'
          },
          {
            testName: 'Advanced Conflict Resolution Test',
            passed: true,
            duration: 389,
            details: 'Advanced conflict resolved correctly'
          },
          {
            testName: 'Data Corruption Prevention Test',
            passed: true,
            duration: 188,
            details: 'Data integrity verified - no corruption detected'
          }
        ]
      };

      // Simulate test progress
      const testSteps = [
        'Testing basic local-server sync...',
        'Testing multi-device conflicts...',
        'Testing network latency handling...',
        'Testing network failure recovery...',
        'Testing timestamp consistency...',
        'Testing notification synchronization...',
        'Testing notification duplication prevention...',
        'Testing large data synchronization...',
        'Testing concurrent updates...',
        'Testing offline synchronization...',
        'Testing advanced conflict resolution...',
        'Testing data corruption prevention...',
        'Generating final report...'
      ];

      for (let i = 0; i < testSteps.length; i++) {
        setCurrentTest(testSteps[i]);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      setTestResult(mockResults);
      setCurrentTest('Server sync test completed!');
    } catch (error) {
      console.error('Test failed:', error);
      setCurrentTest(`Test failed: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? '✅' : '❌';
  };

  const getStatusColor = (passed: boolean) => {
    return passed ? 'var(--success)' : 'var(--error)';
  };

  const getCategoryColor = (passRate: number) => {
    if (passRate >= 0.9) return 'var(--success)';
    if (passRate >= 0.7) return 'var(--warning)';
    return 'var(--error)';
  };

  const getSeverityColor = (issue: string) => {
    if (issue.includes('CRITICAL') || issue.includes('not synced') || issue.includes('Device ID')) {
      return 'var(--error)';
    }
    if (issue.includes('Expected') || issue.includes('Incorrect')) {
      return 'var(--warning)';
    }
    return 'var(--info)';
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card>
        <div style={{ padding: '20px' }}>
          <h2 style={{ margin: '0 0 20px 0', color: 'var(--text-primary)' }}>
            🌐 Server Sync Comprehensive Test
          </h2>
          
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Test sync antara local dan server, multi-device conflicts, timestamp consistency, dan notification synchronization
          </p>

          <div style={{ marginBottom: '20px' }}>
            <Button 
              variant="primary" 
              onClick={runTest} 
              disabled={isRunning}
              style={{ marginRight: '10px' }}
            >
              {isRunning ? '🔄 Running Test...' : '🚀 Run Server Sync Test'}
            </Button>
          </div>

          {isRunning && (
            <div style={{ 
              padding: '15px', 
              backgroundColor: 'var(--bg-secondary)', 
              borderRadius: '8px',
              marginBottom: '20px',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                color: 'var(--text-primary)' 
              }}>
                <div style={{ 
                  width: '20px', 
                  height: '20px', 
                  border: '2px solid var(--primary)', 
                  borderTop: '2px solid transparent', 
                  borderRadius: '50%', 
                  animation: 'spin 1s linear infinite',
                  marginRight: '10px' 
                }} />
                {currentTest}
              </div>
            </div>
          )}

          {testResult && (
            <div>
              {/* Summary Card */}
              <Card style={{ marginBottom: '20px' }}>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: 'var(--text-primary)' }}>
                    📊 Test Summary
                  </h3>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '15px',
                    marginBottom: '15px'
                  }}>
                    <div style={{ 
                      padding: '15px', 
                      backgroundColor: 'var(--bg-tertiary)', 
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {testResult.totalTests}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        Total Tests
                      </div>
                    </div>
                    
                    <div style={{ 
                      padding: '15px', 
                      backgroundColor: 'var(--bg-tertiary)', 
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success)' }}>
                        {testResult.passedTests}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        Passed
                      </div>
                    </div>
                    
                    <div style={{ 
                      padding: '15px', 
                      backgroundColor: 'var(--bg-tertiary)', 
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ 
                        fontSize: '24px', 
                        fontWeight: 'bold', 
                        color: 'var(--error)'
                      }}>
                        {testResult.failedTests}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        Failed
                      </div>
                    </div>
                    
                    <div style={{ 
                      padding: '15px', 
                      backgroundColor: 'var(--bg-tertiary)', 
                      borderRadius: '8px',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                        {testResult.totalDuration}ms
                      </div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        Total Duration
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ 
                    padding: '15px', 
                    backgroundColor: 'var(--error-bg)', 
                    borderRadius: '8px',
                    border: '1px solid var(--error)',
                    color: 'var(--text-primary)'
                  }}>
                    <strong>Status: CRITICAL ⚠️</strong><br />
                    {testResult.summary}
                  </div>
                </div>
              </Card>

              {/* Category Analysis */}
              <Card style={{ marginBottom: '20px' }}>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: 'var(--text-primary)' }}>
                    📈 Analysis by Category
                  </h3>
                  
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                    gap: '15px'
                  }}>
                    {[
                      { name: 'Sync', tests: testResult.results.filter(r => r.testName.includes('Sync')), icon: '🔄' },
                      { name: 'Conflict', tests: testResult.results.filter(r => r.testName.includes('Conflict')), icon: '⚔️' },
                      { name: 'Network', tests: testResult.results.filter(r => r.testName.includes('Network') || r.testName.includes('Latency') || r.testName.includes('Failure')), icon: '🌐' },
                      { name: 'Notification', tests: testResult.results.filter(r => r.testName.includes('Notification')), icon: '🔔' },
                      { name: 'Performance', tests: testResult.results.filter(r => r.testName.includes('Large') || r.testName.includes('Concurrent')), icon: '⚡' },
                      { name: 'Reliability', tests: testResult.results.filter(r => r.testName.includes('Offline') || r.testName.includes('Corruption')), icon: '🛡️' }
                    ].map(category => {
                      if (category.tests.length === 0) return null;
                      
                      const passed = category.tests.filter(t => t.passed).length;
                      const total = category.tests.length;
                      const passRate = passed / total;
                      const avgDuration = category.tests.reduce((sum, t) => sum + t.duration, 0) / total;
                      
                      return (
                        <div key={category.name} style={{ 
                          padding: '15px', 
                          backgroundColor: 'var(--bg-tertiary)', 
                          borderRadius: '8px',
                          border: `2px solid ${getCategoryColor(passRate)}`
                        }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            marginBottom: '8px' 
                          }}>
                            <span style={{ fontSize: '20px', marginRight: '8px' }}>
                              {category.icon}
                            </span>
                            <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>
                              {category.name}
                            </span>
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                            {passed}/{total} passed ({(passRate * 100).toFixed(1)}%)
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                            Avg: {avgDuration.toFixed(1)}ms
                          </div>
                          <div style={{ 
                            color: getCategoryColor(passRate),
                            fontSize: '12px',
                            fontWeight: 'bold',
                            marginTop: '5px'
                          }}>
                            {passRate >= 0.9 ? '✅ Excellent' : passRate >= 0.7 ? '⚠️ Needs Attention' : '❌ Critical'}
                          </div>
                        </div>
                      );
                    }).filter(Boolean)}
                  </div>
                </div>
              </Card>

              {/* Critical Issues */}
              {testResult.failedTests > 0 && (
                <Card style={{ marginBottom: '20px' }}>
                  <div style={{ padding: '20px' }}>
                    <h3 style={{ margin: '0 0 15px 0', color: 'var(--error)' }}>
                      🚨 Critical Issues Found
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                      {testResult.results
                        .filter(test => !test.passed && test.issues)
                        .map((test, index) => (
                          <div 
                            key={index}
                            style={{ 
                              padding: '15px', 
                              backgroundColor: 'var(--error-bg)', 
                              borderRadius: '8px',
                              border: '1px solid var(--error)'
                            }}
                          >
                            <div style={{ 
                              fontWeight: 'bold', 
                              color: 'var(--error)', 
                              marginBottom: '8px' 
                            }}>
                              ❌ {test.testName}
                            </div>
                            <div style={{ 
                              color: 'var(--text-secondary)', 
                              fontSize: '13px',
                              marginBottom: '8px'
                            }}>
                              {test.details}
                            </div>
                            {test.issues && (
                              <div>
                                <div style={{ 
                                  fontWeight: 'bold', 
                                  color: 'var(--text-primary)', 
                                  fontSize: '12px',
                                  marginBottom: '5px'
                                }}>
                                  Issues:
                                </div>
                                {test.issues.map((issue, issueIndex) => (
                                  <div 
                                    key={issueIndex}
                                    style={{ 
                                      color: getSeverityColor(issue),
                                      fontSize: '12px',
                                      marginLeft: '10px',
                                      marginBottom: '3px'
                                    }}
                                  >
                                    • {issue}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* Detailed Results */}
              <Card>
                <div style={{ padding: '20px' }}>
                  <h3 style={{ margin: '0 0 15px 0', color: 'var(--text-primary)' }}>
                    📋 Detailed Test Results
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {testResult.results.map((test, index) => (
                      <div 
                        key={index}
                        style={{ 
                          padding: '15px', 
                          backgroundColor: 'var(--bg-secondary)', 
                          borderRadius: '8px',
                          border: `1px solid ${test.passed ? 'var(--success)' : 'var(--error)'}`
                        }}
                      >
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'flex-start',
                          marginBottom: '8px'
                        }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            flex: 1
                          }}>
                            <span style={{ fontSize: '16px' }}>
                              {getStatusIcon(test.passed)}
                            </span>
                            <span style={{ 
                              fontWeight: 'bold', 
                              color: 'var(--text-primary)' 
                            }}>
                              {test.testName}
                            </span>
                          </div>
                          
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px'
                          }}>
                            <span style={{ 
                              color: 'var(--text-secondary)',
                              fontSize: '12px'
                            }}>
                              {test.duration}ms
                            </span>
                            <span style={{ 
                              color: getStatusColor(test.passed),
                              fontWeight: 'bold',
                              fontSize: '12px'
                            }}>
                              {test.passed ? 'PASS' : 'FAIL'}
                            </span>
                          </div>
                        </div>
                        
                        <div style={{ 
                          color: 'var(--text-secondary)', 
                          fontSize: '13px'
                        }}>
                          {test.details}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </Card>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ServerSyncTest;