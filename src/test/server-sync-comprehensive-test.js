/**
 * Server Sync Comprehensive Test
 * Test sync antara local dan server, multi-device conflicts, timestamp consistency, dan notification sync
 */

// Mock server untuk testing
class MockServer {
  constructor() {
    this.data = new Map();
    this.syncLog = [];
    this.latency = 100; // Default 100ms latency
    this.failureRate = 0; // 0% failure rate
  }

  setLatency(ms) {
    this.latency = ms;
  }

  setFailureRate(rate) {
    this.failureRate = rate;
  }

  async get(key) {
    await this.simulateLatency();
    if (this.shouldFail()) {
      throw new Error('Server connection failed');
    }
    
    const data = this.data.get(key);
    this.syncLog.push({
      action: 'GET',
      key,
      timestamp: Date.now(),
      success: true
    });
    // Return data in consistent format
    if (data) {
      return data;
    }
    return { value: [], timestamp: Date.now(), deviceId: 'server' };
  }

  async set(key, data) {
    await this.simulateLatency();
    if (this.shouldFail()) {
      throw new Error('Server connection failed');
    }

    const existingData = this.data.get(key);
    const hasConflict = existingData && 
                       (existingData.deviceId !== data.deviceId || 
                        existingData.timestamp !== data.timestamp);
    const resolvedData = this.resolveConflict(existingData, data);
    
    this.data.set(key, resolvedData);
    this.syncLog.push({
      action: 'SET',
      key,
      timestamp: Date.now(),
      success: true,
      conflictResolved: hasConflict
    });
    
    return resolvedData;
  }

  resolveConflict(existing, incoming) {
    if (!existing) return incoming;
    
    // Check if there's a conflict (different device or different timestamp)
    const hasConflict = existing.deviceId !== incoming.deviceId || 
                       existing.timestamp !== incoming.timestamp;
    
    if (!hasConflict) {
      // No conflict, return existing (ensure format consistency)
      return {
        ...existing,
        value: existing.value !== undefined ? existing.value : existing,
        conflictResolved: false
      };
    }
    
    // Last write wins based on timestamp
    if (incoming.timestamp > existing.timestamp) {
      return {
        ...incoming,
        value: incoming.value !== undefined ? incoming.value : incoming,
        conflictResolved: true,
        previousVersion: existing
      };
    }
    
    // Existing timestamp is newer or equal, but still mark as conflict resolved
    return {
      ...existing,
      value: existing.value !== undefined ? existing.value : existing,
      conflictResolved: true,
      previousVersion: incoming
    };
  }

  async simulateLatency() {
    const actualLatency = this.latency + (Math.random() * 50); // Add jitter
    await new Promise(resolve => setTimeout(resolve, actualLatency));
  }

  shouldFail() {
    return Math.random() < this.failureRate;
  }

  getSyncLog() {
    return this.syncLog;
  }

  clearLog() {
    this.syncLog = [];
  }
}

// Mock device untuk testing multi-device scenarios
class MockDevice {
  constructor(deviceId, server) {
    this.deviceId = deviceId;
    this.server = server;
    this.localStorage = new Map();
    this.syncQueue = [];
    this.notifications = [];
    this.isOnline = true;
    this.syncInterval = null;
  }

  setOnline(online) {
    this.isOnline = online;
    if (online && !this.syncInterval) {
      this.startSync();
    } else if (!online && this.syncInterval) {
      this.stopSync();
    }
  }

  startSync() {
    this.syncInterval = setInterval(() => {
      this.processSyncQueue();
    }, 200); // Sync every 200ms
  }

  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async localSet(key, value) {
    const timestamp = Date.now() + Math.random(); // Add microsecond precision
    const wrappedData = {
      value,
      timestamp,
      deviceId: this.deviceId,
      synced: false
    };

    this.localStorage.set(key, wrappedData);
    
    // Queue for sync
    this.syncQueue.push({
      key,
      data: wrappedData,
      retryCount: 0
    });

    return wrappedData;
  }

  async localGet(key) {
    const data = this.localStorage.get(key);
    return data ? data.value : [];
  }

  async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    const operation = this.syncQueue.shift();
    
    try {
      const serverData = await this.server.set(operation.key, operation.data);
      
      // Update local data with server response
      this.localStorage.set(operation.key, {
        ...serverData,
        synced: true
      });

      // Trigger notification update - use serverData.value if available, otherwise use operation.data.value
      const dataForNotifications = serverData.value || operation.data.value || [];
      this.updateNotifications(operation.key, Array.isArray(dataForNotifications) ? dataForNotifications : []);
      
    } catch (error) {
      // Retry on failure - add back to queue for retry
      operation.retryCount++;
      if (operation.retryCount < 5) {
        // Add back to queue for retry (increased max retries to 5 for better recovery)
        // Use setTimeout for non-blocking delay instead of await
        setTimeout(() => {
          this.syncQueue.unshift(operation);
        }, 100 * operation.retryCount);
      }
    }
  }

  updateNotifications(key, data) {
    // Simulate notification generation based on data changes
    if (key === 'salesOrders') {
      // Ensure data is an array
      const salesOrdersArray = Array.isArray(data) ? data : [];
      
      const newNotifications = salesOrdersArray
        .filter(so => so && so.status === 'CONFIRMED' && !so.notified)
        .map(so => ({
          id: `notif-${so.id}`,
          type: 'SO_CONFIRMED',
          soNo: so.soNo,
          deviceId: this.deviceId,
          timestamp: Date.now()
        }));
      
      if (newNotifications.length > 0) {
        this.notifications.push(...newNotifications);
      }
    }
  }

  getNotifications() {
    return this.notifications;
  }

  getSyncQueueLength() {
    return this.syncQueue.length;
  }

  cleanup() {
    this.stopSync();
  }
}

class ServerSyncTest {
  constructor() {
    this.testResults = [];
    this.server = new MockServer();
    this.devices = [];
  }

  async runCompleteTest() {
    console.log('🌐 SERVER SYNC COMPREHENSIVE TEST');
    console.log('==================================');
    console.log('Testing local-server sync, multi-device conflicts, and notification consistency');
    console.log('');

    this.testResults = [];
    const startTime = Date.now();

    // Setup test environment
    this.setupDevices();

    // Run tests
    await this.testBasicSync();
    await this.testMultiDeviceConflicts();
    await this.testNetworkLatency();
    await this.testNetworkFailure();
    await this.testTimestampConsistency();
    await this.testNotificationSync();
    await this.testNotificationDuplication();
    await this.testLargeDataSync();
    await this.testConcurrentUpdates();
    await this.testOfflineSync();
    await this.testConflictResolution();
    await this.testDataCorruption();

    // Cleanup
    this.cleanup();

    const totalDuration = Date.now() - startTime;
    const passedTests = this.testResults.filter(r => r.passed).length;
    const failedTests = this.testResults.filter(r => !r.passed).length;

    return {
      testSuite: 'Server Sync Comprehensive Test',
      totalTests: this.testResults.length,
      passedTests,
      failedTests,
      totalDuration,
      results: this.testResults,
      summary: this.generateSummary(passedTests, failedTests, totalDuration)
    };
  }

  setupDevices() {
    // Create 3 mock devices
    this.devices = [
      new MockDevice('device-A', this.server),
      new MockDevice('device-B', this.server),
      new MockDevice('device-C', this.server)
    ];

    this.devices.forEach(device => device.startSync());
  }

  cleanup() {
    this.devices.forEach(device => device.cleanup());
  }

  async testBasicSync() {
    const testName = 'Basic Local-Server Sync Test';
    const startTime = Date.now();
    const issues = [];

    try {
      const device = this.devices[0];
      
      // Create data locally
      const testData = [
        { id: '1', name: 'Test Item 1', status: 'ACTIVE' },
        { id: '2', name: 'Test Item 2', status: 'DRAFT' }
      ];

      await device.localSet('testData', testData);
      
      // Wait for sync
      await this.waitForSync(device, 1000);
      
      // Verify server has the data
      const serverData = await this.server.get('testData');
      
      if (!serverData || !serverData.value || serverData.value.length !== 2) {
        issues.push('Data not synced to server correctly');
      }

      if (serverData.deviceId !== device.deviceId) {
        issues.push('Device ID not preserved in sync');
      }

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `Synced ${testData.length} items in ${totalDuration}ms`,
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

  async testMultiDeviceConflicts() {
    const testName = 'Multi-Device Conflict Resolution Test';
    const startTime = Date.now();
    const issues = [];

    try {
      const deviceA = this.devices[0];
      const deviceB = this.devices[1];
      
      // Clear any existing data first
      await this.server.data.delete('conflictData');
      
      // Both devices update same data - Device B has later timestamp in wrapped data
      // Use sequential calls to ensure Device B's timestamp is definitely later
      const baseTime = Date.now();
      const dataA = [{ id: '1', name: 'Updated by Device A' }];
      
      // Device A sets first
      await deviceA.localSet('conflictData', dataA);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Device B sets with guaranteed later timestamp
      const dataB = [{ id: '1', name: 'Updated by Device B' }];
      await deviceB.localSet('conflictData', dataB);

      // Wait for both to sync - need to wait longer for conflict resolution
      await this.waitForSync(deviceA, 2000);
      await this.waitForSync(deviceB, 2000);
      
      // Additional wait to ensure conflict resolution completes
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check server resolution
      const serverData = await this.server.get('conflictData');
      
      if (!serverData || !serverData.conflictResolved) {
        issues.push('Conflict not detected/resolved on server');
      }

      // Later timestamp should win (Device B, because it was set later)
      if (serverData && serverData.value && serverData.value[0] && serverData.value[0].name !== 'Updated by Device B') {
        issues.push('Incorrect conflict resolution - later timestamp should win');
      }

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `Conflict resolved: ${serverData?.deviceId || 'unknown'} won`,
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

  async testNetworkLatency() {
    const testName = 'Network Latency Handling Test';
    const startTime = Date.now();
    const issues = [];

    try {
      // Set high latency
      this.server.setLatency(500);
      
      const device = this.devices[0];
      const testData = [{ id: '1', name: 'Latency Test', timestamp: Date.now() }];

      const syncStart = Date.now();
      await device.localSet('latencyData', testData);
      
      // Wait for sync to complete (queue empty) AND wait additional time for latency
      await this.waitForSync(device, 2000);
      // Additional wait to ensure latency simulation completes
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const syncDuration = Date.now() - syncStart;

      // Check if sync took at least the minimum latency time (accounting for processing time)
      if (syncDuration < 400) {
        issues.push('Sync completed too quickly - latency not simulated');
      }

      if (syncDuration > 2000) {
        issues.push(`Sync too slow: ${syncDuration}ms (should handle latency gracefully)`);
      }

      // Reset latency
      this.server.setLatency(100);

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `Sync with latency completed in ${syncDuration}ms`,
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

  async testNetworkFailure() {
    const testName = 'Network Failure Recovery Test';
    const startTime = Date.now();
    const issues = [];

    try {
      // Set high failure rate
      this.server.setFailureRate(0.8);
      
      const device = this.devices[0];
      const testData = [{ id: '1', name: 'Failure Test', timestamp: Date.now() }];

      await device.localSet('failureData', testData);
      
      // Wait for retries (operations will fail and be queued for retry)
      // Wait longer to allow multiple retry attempts
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Reset failure rate to allow successful sync
      this.server.setFailureRate(0);
      
      // Wait longer to ensure retry mechanism processes the queue after recovery
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Wait for successful sync - increase timeout
      await this.waitForSync(device, 4000);
      
      // Additional wait to ensure sync completes
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify data eventually synced
      const serverData = await this.server.get('failureData');
      
      if (!serverData || !serverData.value || serverData.value.length === 0) {
        issues.push('Data not synced after network recovery');
      }

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `Network failure recovery successful`,
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

  async testTimestampConsistency() {
    const testName = 'Timestamp Consistency Test';
    const startTime = Date.now();
    const issues = [];

    try {
      const devices = this.devices.slice(0, 2);
      const timestamps = [];
      
      // Create data on multiple devices with slight delays
      for (let i = 0; i < devices.length; i++) {
        const device = devices[i];
        const data = [{ id: `${i}`, name: `Item ${i}`, created: Date.now() }];
        
        await device.localSet('timestampData', data);
        timestamps.push(Date.now());
        
        await new Promise(resolve => setTimeout(resolve, 50)); // Small delay
      }

      // Wait for all to sync
      await Promise.all(devices.map(device => this.waitForSync(device, 1500)));

      // Verify timestamp ordering is maintained
      const serverData = await this.server.get('timestampData');
      
      if (!serverData.timestamp) {
        issues.push('Server timestamp missing');
      }

      // Check if timestamp is within reasonable range
      const now = Date.now();
      if (Math.abs(serverData.timestamp - now) > 5000) {
        issues.push('Server timestamp drift detected');
      }

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `Timestamp consistency verified`,
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

  async testNotificationSync() {
    const testName = 'Notification Synchronization Test';
    const startTime = Date.now();
    const issues = [];

    try {
      const device = this.devices[0];
      
      // Create SO that should trigger notification
      const salesOrders = [
        { id: '1', soNo: 'SO-001', status: 'CONFIRMED', notified: false },
        { id: '2', soNo: 'SO-002', status: 'DRAFT', notified: false }
      ];

      await device.localSet('salesOrders', salesOrders);
      
      // Wait for sync to complete
      await this.waitForSync(device, 1000);
      
      // Additional wait to ensure notification processing completes
      await new Promise(resolve => setTimeout(resolve, 300));

      // Check notifications generated
      const notifications = device.getNotifications();
      
      // Should have 1 notification (only CONFIRMED SO)
      if (notifications.length !== 1) {
        issues.push(`Expected 1 notification, got ${notifications.length}`);
      }

      if (notifications[0] && notifications[0].soNo !== 'SO-001') {
        issues.push('Incorrect notification generated');
      }

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `Generated ${notifications.length} notifications correctly`,
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

  async testNotificationDuplication() {
    const testName = 'Notification Duplication Prevention Test';
    const startTime = Date.now();
    const issues = [];

    try {
      const deviceA = this.devices[0];
      const deviceB = this.devices[1];
      
      // Both devices create same SO
      const salesOrder = { id: '1', soNo: 'SO-DUP', status: 'CONFIRMED', notified: false };

      await Promise.all([
        deviceA.localSet('salesOrders', [salesOrder]),
        deviceB.localSet('salesOrders', [salesOrder])
      ]);

      await this.waitForSync(deviceA, 1500);
      await this.waitForSync(deviceB, 1500);

      // Check for duplicate notifications
      const notificationsA = deviceA.getNotifications();
      const notificationsB = deviceB.getNotifications();
      
      const totalNotifications = notificationsA.length + notificationsB.length;
      const uniqueSONumbers = new Set([
        ...notificationsA.map(n => n.soNo),
        ...notificationsB.map(n => n.soNo)
      ]);

      if (totalNotifications > uniqueSONumbers.size) {
        issues.push(`Duplicate notifications detected: ${totalNotifications} total, ${uniqueSONumbers.size} unique`);
      }

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `No duplicate notifications: ${totalNotifications} total, ${uniqueSONumbers.size} unique`,
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

  async testLargeDataSync() {
    const testName = 'Large Data Synchronization Test';
    const startTime = Date.now();
    const issues = [];

    try {
      const device = this.devices[0];
      
      // Create large dataset (1000 items)
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: `item-${i}`,
        name: `Large Item ${i}`,
        description: `This is a test item with ID ${i} for large data sync testing`,
        timestamp: Date.now() + i
      }));

      const syncStart = Date.now();
      await device.localSet('largeData', largeData);
      await this.waitForSync(device, 5000);
      const syncDuration = Date.now() - syncStart;

      // Verify all data synced
      const serverData = await this.server.get('largeData');
      
      if (!serverData || !serverData.value || serverData.value.length !== 1000) {
        issues.push(`Large data sync incomplete: expected 1000 items, got ${serverData?.value?.length || 0}`);
      }

      if (syncDuration > 5000) {
        issues.push(`Large data sync too slow: ${syncDuration}ms (should be < 5000ms)`);
      }

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `Synced ${largeData.length} items in ${syncDuration}ms`,
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

  async testConcurrentUpdates() {
    const testName = 'Concurrent Updates Test';
    const startTime = Date.now();
    const issues = [];

    try {
      const devices = this.devices;
      
      // All devices update different keys simultaneously
      const updatePromises = devices.map((device, index) => {
        const data = [{ id: `concurrent-${index}`, name: `Concurrent Item ${index}`, deviceId: device.deviceId }];
        return device.localSet(`concurrentData${index}`, data);
      });

      await Promise.all(updatePromises);

      // Wait for all to sync
      await Promise.all(devices.map(device => this.waitForSync(device, 2000)));

      // Verify all data synced correctly
      for (let i = 0; i < devices.length; i++) {
        const serverData = await this.server.get(`concurrentData${i}`);
        
        if (!serverData || !serverData.value || serverData.value.length === 0) {
          issues.push(`Concurrent data ${i} not synced`);
        }

        if (serverData.deviceId !== devices[i].deviceId) {
          issues.push(`Concurrent data ${i} device ID mismatch`);
        }
      }

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `${devices.length} concurrent updates completed successfully`,
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

  async testOfflineSync() {
    const testName = 'Offline Synchronization Test';
    const startTime = Date.now();
    const issues = [];

    try {
      const device = this.devices[0];
      
      // Go offline
      device.setOnline(false);
      
      // Create data while offline
      const offlineData = [{ id: '1', name: 'Offline Item', created: Date.now() }];
      await device.localSet('offlineData', offlineData);
      
      // Verify data queued but not synced
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (device.getSyncQueueLength() === 0) {
        issues.push('Data not queued while offline');
      }

      // Go back online
      device.setOnline(true);
      
      // Wait for sync
      await this.waitForSync(device, 2000);
      
      // Verify data synced after coming online
      const serverData = await this.server.get('offlineData');
      
      if (!serverData || !serverData.value || serverData.value.length === 0) {
        issues.push('Offline data not synced after coming online');
      }

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `Offline sync recovery successful`,
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

  async testConflictResolution() {
    const testName = 'Advanced Conflict Resolution Test';
    const startTime = Date.now();
    const issues = [];

    try {
      const deviceA = this.devices[0];
      const deviceB = this.devices[1];
      
      // Create initial data
      const initialData = [{ id: '1', name: 'Initial', version: 1, timestamp: Date.now() }];
      await deviceA.localSet('conflictTest', initialData);
      await this.waitForSync(deviceA, 1000);
      
      // Small delay to ensure initial sync completes
      await new Promise(resolve => setTimeout(resolve, 200));

      // Both devices modify the same item - Device B has later timestamp
      const baseTime = Date.now();
      const dataA = [{ id: '1', name: 'Modified by A', version: 2, timestamp: baseTime }];
      const dataB = [{ id: '1', name: 'Modified by B', version: 2, timestamp: baseTime + 50 }]; // Later

      await Promise.all([
        deviceA.localSet('conflictTest', dataA),
        deviceB.localSet('conflictTest', dataB)
      ]);

      // Wait for both to sync - need to wait longer for conflict resolution
      await this.waitForSync(deviceA, 2000);
      await this.waitForSync(deviceB, 2000);
      
      // Additional wait to ensure conflict resolution completes
      await new Promise(resolve => setTimeout(resolve, 300));

      // Check resolution
      const serverData = await this.server.get('conflictTest');
      
      if (!serverData || !serverData.conflictResolved) {
        issues.push('Advanced conflict not resolved');
      }

      // Later timestamp should win (Device B)
      if (serverData && serverData.value && serverData.value[0] && serverData.value[0].name !== 'Modified by B') {
        issues.push('Incorrect advanced conflict resolution');
      }

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `Advanced conflict resolved correctly`,
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

  async testDataCorruption() {
    const testName = 'Data Corruption Prevention Test';
    const startTime = Date.now();
    const issues = [];

    try {
      const device = this.devices[0];
      
      // Create valid data
      const validData = [
        { id: '1', name: 'Valid Item 1', status: 'ACTIVE' },
        { id: '2', name: 'Valid Item 2', status: 'DRAFT' }
      ];

      await device.localSet('corruptionTest', validData);
      await this.waitForSync(device, 1000);

      // Verify data integrity
      const serverData = await this.server.get('corruptionTest');
      
      if (!Array.isArray(serverData.value)) {
        issues.push('Data structure corrupted - not an array');
      }

      if (serverData.value.length !== validData.length) {
        issues.push('Data corruption - item count mismatch');
      }

      // Check each item integrity
      serverData.value.forEach((item, index) => {
        if (!item.id || !item.name) {
          issues.push(`Data corruption - item ${index} missing required fields`);
        }
      });

      const totalDuration = Date.now() - startTime;
      const passed = issues.length === 0;

      this.testResults.push({
        testName,
        passed,
        duration: totalDuration,
        details: `Data integrity verified - no corruption detected`,
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

  async waitForSync(device, timeout = 1000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (device.getSyncQueueLength() === 0) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return false; // Timeout
  }

  generateSummary(passed, failed, duration) {
    const total = passed + failed;
    const passRate = total > 0 ? (passed / total * 100).toFixed(1) : '0';
    
    let status = 'EXCELLENT';
    if (failed > 0) status = 'NEEDS_ATTENTION';
    if (failed > total * 0.3) status = 'CRITICAL';

    return `Server Sync Test Complete: ${passed}/${total} tests passed (${passRate}%) in ${duration}ms - Status: ${status}`;
  }
}

// Run the test
async function runServerSyncTest() {
  const test = new ServerSyncTest();
  const result = await test.runCompleteTest();
  
  console.log('📊 SERVER SYNC TEST RESULTS');
  console.log('============================');
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

  // Analysis by category
  console.log('📈 ANALYSIS BY CATEGORY');
  console.log('========================');
  
  const categories = {
    'Sync': result.results.filter(r => r.testName.includes('Sync')),
    'Conflict': result.results.filter(r => r.testName.includes('Conflict')),
    'Network': result.results.filter(r => r.testName.includes('Network') || r.testName.includes('Latency') || r.testName.includes('Failure')),
    'Notification': result.results.filter(r => r.testName.includes('Notification')),
    'Performance': result.results.filter(r => r.testName.includes('Large') || r.testName.includes('Concurrent')),
    'Reliability': result.results.filter(r => r.testName.includes('Offline') || r.testName.includes('Corruption'))
  };

  Object.entries(categories).forEach(([category, tests]) => {
    if (tests.length > 0) {
      const passed = tests.filter(t => t.passed).length;
      const avgDuration = tests.reduce((sum, t) => sum + t.duration, 0) / tests.length;
      console.log(`${category}: ${passed}/${tests.length} passed, avg ${avgDuration.toFixed(1)}ms`);
    }
  });

  console.log('');
  console.log('🎯 Server Sync Test Complete!');
  
  return result;
}

// Run the test
runServerSyncTest().catch(console.error);