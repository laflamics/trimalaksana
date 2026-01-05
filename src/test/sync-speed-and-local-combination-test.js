/**
 * Sync Speed & Local Combination Test
 * Test speed performance dan kombinasi local storage + server sync
 */

// Mock server untuk testing
class MockServer {
  constructor() {
    this.data = new Map();
    this.latency = 50; // Default 50ms latency
  }

  setLatency(ms) {
    this.latency = ms;
  }

  async get(key) {
    await this.simulateLatency();
    const data = this.data.get(key);
    return data || { value: [], timestamp: Date.now(), deviceId: 'server' };
  }

  async set(key, data) {
    await this.simulateLatency();
    this.data.set(key, data);
    return data;
  }

  async simulateLatency() {
    await new Promise(resolve => setTimeout(resolve, this.latency));
  }
}

// Mock device dengan local storage + sync
class MockDevice {
  constructor(deviceId, server) {
    this.deviceId = deviceId;
    this.server = server;
    this.localStorage = new Map();
    this.syncQueue = [];
    this.syncInProgress = false;
  }

  // Local set (instant, no sync)
  async localSet(key, value) {
    const timestamp = Date.now();
    const wrappedData = {
      value,
      timestamp,
      deviceId: this.deviceId,
      synced: false
    };
    this.localStorage.set(key, wrappedData);
    return wrappedData;
  }

  // Local get (instant)
  async localGet(key) {
    const data = this.localStorage.get(key);
    return data ? data.value : [];
  }

  // Sync to server (with latency)
  async syncToServer(key) {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    const localData = this.localStorage.get(key);
    if (!localData || localData.synced) {
      this.syncInProgress = false;
      return;
    }

    try {
      const serverData = await this.server.set(key, localData);
      this.localStorage.set(key, {
        ...serverData,
        synced: true
      });
    } catch (error) {
      throw error;
    } finally {
      this.syncInProgress = false;
    }
  }

  // Combined: Local set + sync (simulate real usage)
  async setAndSync(key, value) {
    const startTime = performance.now();
    
    // Step 1: Local set (instant)
    const localStart = performance.now();
    await this.localSet(key, value);
    const localDuration = performance.now() - localStart;
    
    // Step 2: Sync to server (with latency)
    const syncStart = performance.now();
    await this.syncToServer(key);
    const syncDuration = performance.now() - syncStart;
    
    const totalDuration = performance.now() - startTime;
    
    return {
      localDuration,
      syncDuration,
      totalDuration
    };
  }
}

class SyncSpeedTest {
  constructor() {
    this.testResults = [];
    this.server = new MockServer();
    this.device = new MockDevice('test-device', this.server);
  }

  async runAllTests() {
    console.log('🚀 SYNC SPEED & LOCAL COMBINATION TEST');
    console.log('========================================');
    console.log('Testing sync performance dan kombinasi local + sync\n');

    await this.testLocalOnlySpeed();
    await this.testSyncOnlySpeed();
    await this.testLocalThenSyncSpeed();
    await this.testCombinedSetAndSyncSpeed();
    await this.testLargeDataSyncSpeed();
    await this.testMultipleOperationsSpeed();
    await this.testLocalFirstThenSyncPattern();
    await this.testSyncWithDifferentLatency();

    this.printResults();
  }

  async testLocalOnlySpeed() {
    const testName = 'Local Storage Only Speed Test';
    const startTime = performance.now();
    
    const iterations = 100;
    const durations = [];

    for (let i = 0; i < iterations; i++) {
      const opStart = performance.now();
      await this.device.localSet(`test-${i}`, [{ id: i, value: `test-${i}` }]);
      durations.push(performance.now() - opStart);
    }

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const totalDuration = performance.now() - startTime;

    this.testResults.push({
      testName,
      avgDuration,
      minDuration,
      maxDuration,
      totalDuration,
      iterations,
      type: 'local-only'
    });
  }

  async testSyncOnlySpeed() {
    const testName = 'Server Sync Only Speed Test';
    const startTime = performance.now();
    
    const iterations = 50; // Less iterations karena lebih lambat
    const durations = [];

    for (let i = 0; i < iterations; i++) {
      const opStart = performance.now();
      await this.device.localSet(`sync-${i}`, [{ id: i, value: `sync-${i}` }]);
      await this.device.syncToServer(`sync-${i}`);
      durations.push(performance.now() - opStart);
    }

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const totalDuration = performance.now() - startTime;

    this.testResults.push({
      testName,
      avgDuration,
      minDuration,
      maxDuration,
      totalDuration,
      iterations,
      type: 'sync-only'
    });
  }

  async testLocalThenSyncSpeed() {
    const testName = 'Local First Then Sync Speed Test';
    const startTime = performance.now();
    
    const iterations = 50;
    const localDurations = [];
    const syncDurations = [];
    const totalDurations = [];

    for (let i = 0; i < iterations; i++) {
      // Local set first
      const localStart = performance.now();
      await this.device.localSet(`combined-${i}`, [{ id: i, value: `combined-${i}` }]);
      const localDuration = performance.now() - localStart;
      localDurations.push(localDuration);

      // Then sync
      const syncStart = performance.now();
      await this.device.syncToServer(`combined-${i}`);
      const syncDuration = performance.now() - syncStart;
      syncDurations.push(syncDuration);

      totalDurations.push(localDuration + syncDuration);
    }

    const avgLocal = localDurations.reduce((a, b) => a + b, 0) / localDurations.length;
    const avgSync = syncDurations.reduce((a, b) => a + b, 0) / syncDurations.length;
    const avgTotal = totalDurations.reduce((a, b) => a + b, 0) / totalDurations.length;
    const totalDuration = performance.now() - startTime;

    this.testResults.push({
      testName,
      avgLocalDuration: avgLocal,
      avgSyncDuration: avgSync,
      avgDuration: avgTotal,
      totalDuration,
      iterations,
      type: 'local-then-sync'
    });
  }

  async testCombinedSetAndSyncSpeed() {
    const testName = 'Combined Set & Sync Speed Test';
    const startTime = performance.now();
    
    const iterations = 50;
    const durations = [];

    for (let i = 0; i < iterations; i++) {
      const result = await this.device.setAndSync(`combined-op-${i}`, [{ id: i, value: `combined-op-${i}` }]);
      durations.push(result.totalDuration);
    }

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    const totalDuration = performance.now() - startTime;

    this.testResults.push({
      testName,
      avgDuration,
      minDuration,
      maxDuration,
      totalDuration,
      iterations,
      type: 'combined'
    });
  }

  async testLargeDataSyncSpeed() {
    const testName = 'Large Data Sync Speed Test';
    const startTime = performance.now();
    
    const sizes = [100, 500, 1000, 2000, 5000];
    const results = [];

    for (const size of sizes) {
      const largeData = Array.from({ length: size }, (_, i) => ({
        id: `item-${i}`,
        name: `Large Item ${i}`,
        description: `This is item ${i} of ${size} items`,
        timestamp: Date.now() + i
      }));

      const syncStart = performance.now();
      await this.device.localSet('largeData', largeData);
      await this.device.syncToServer('largeData');
      const syncDuration = performance.now() - syncStart;

      results.push({
        size,
        duration: syncDuration,
        itemsPerMs: size / syncDuration
      });
    }

    const totalDuration = performance.now() - startTime;

    this.testResults.push({
      testName,
      results,
      totalDuration,
      type: 'large-data'
    });
  }

  async testMultipleOperationsSpeed() {
    const testName = 'Multiple Operations Speed Test';
    const startTime = performance.now();
    
    const operations = 100;
    const localOps = [];
    const syncOps = [];

    // Batch 1: Local only (fast)
    const localStart = performance.now();
    for (let i = 0; i < operations; i++) {
      await this.device.localSet(`batch-local-${i}`, [{ id: i }]);
    }
    localOps.push(performance.now() - localStart);

    // Batch 2: Local + Sync (slower)
    const syncStart = performance.now();
    for (let i = 0; i < operations; i++) {
      await this.device.localSet(`batch-sync-${i}`, [{ id: i }]);
      await this.device.syncToServer(`batch-sync-${i}`);
    }
    syncOps.push(performance.now() - syncStart);

    const totalDuration = performance.now() - startTime;

    this.testResults.push({
      testName,
      localOpsTotal: localOps[0],
      syncOpsTotal: syncOps[0],
      localOpsAvg: localOps[0] / operations,
      syncOpsAvg: syncOps[0] / operations,
      speedDifference: syncOps[0] / localOps[0],
      totalDuration,
      operations,
      type: 'multiple-ops'
    });
  }

  async testLocalFirstThenSyncPattern() {
    const testName = 'Local First Then Sync Pattern Test';
    const startTime = performance.now();
    
    // Simulate real-world pattern: user does multiple local operations, then syncs all
    const localOps = 20;
    const keys = [];

    // Step 1: Do multiple local operations (fast, user doesn't wait)
    const localStart = performance.now();
    for (let i = 0; i < localOps; i++) {
      const key = `pattern-${i}`;
      keys.push(key);
      await this.device.localSet(key, [{ id: i, value: `pattern-${i}` }]);
    }
    const localDuration = performance.now() - localStart;

    // Step 2: Sync all at once (background, user can continue working)
    const syncStart = performance.now();
    await Promise.all(keys.map(key => this.device.syncToServer(key)));
    const syncDuration = performance.now() - syncStart;

    const totalDuration = performance.now() - startTime;

    this.testResults.push({
      testName,
      localOps,
      localDuration,
      syncDuration,
      totalDuration,
      userPerceivedTime: localDuration, // User only waits for local ops
      backgroundSyncTime: syncDuration, // Sync happens in background
      type: 'pattern'
    });
  }

  async testSyncWithDifferentLatency() {
    const testName = 'Sync Speed with Different Network Latency';
    const startTime = performance.now();
    
    const latencies = [10, 50, 100, 200, 500];
    const results = [];

    for (const latency of latencies) {
      this.server.setLatency(latency);
      
      const syncStart = performance.now();
      await this.device.localSet('latency-test', [{ id: 1, value: 'test' }]);
      await this.device.syncToServer('latency-test');
      const syncDuration = performance.now() - syncStart;

      results.push({
        latency,
        syncDuration,
        overhead: syncDuration - latency
      });
    }

    // Reset to default
    this.server.setLatency(50);

    const totalDuration = performance.now() - startTime;

    this.testResults.push({
      testName,
      results,
      totalDuration,
      type: 'latency'
    });
  }

  printResults() {
    console.log('\n📊 TEST RESULTS');
    console.log('================\n');

    this.testResults.forEach((result, index) => {
      console.log(`${index + 1}. ${result.testName}`);
      
      if (result.type === 'local-only') {
        console.log(`   ✅ Local Only Performance:`);
        console.log(`      - Average: ${result.avgDuration.toFixed(2)}ms`);
        console.log(`      - Min: ${result.minDuration.toFixed(2)}ms`);
        console.log(`      - Max: ${result.maxDuration.toFixed(2)}ms`);
        console.log(`      - Total (${result.iterations} ops): ${result.totalDuration.toFixed(2)}ms`);
        console.log(`      - Throughput: ${(result.iterations / result.totalDuration * 1000).toFixed(0)} ops/sec`);
      }
      
      else if (result.type === 'sync-only') {
        console.log(`   ✅ Sync Only Performance:`);
        console.log(`      - Average: ${result.avgDuration.toFixed(2)}ms`);
        console.log(`      - Min: ${result.minDuration.toFixed(2)}ms`);
        console.log(`      - Max: ${result.maxDuration.toFixed(2)}ms`);
        console.log(`      - Total (${result.iterations} ops): ${result.totalDuration.toFixed(2)}ms`);
        console.log(`      - Throughput: ${(result.iterations / result.totalDuration * 1000).toFixed(0)} ops/sec`);
      }
      
      else if (result.type === 'local-then-sync') {
        console.log(`   ✅ Local + Sync Performance:`);
        console.log(`      - Local Avg: ${result.avgLocalDuration.toFixed(2)}ms`);
        console.log(`      - Sync Avg: ${result.avgSyncDuration.toFixed(2)}ms`);
        console.log(`      - Total Avg: ${result.avgDuration.toFixed(2)}ms`);
        console.log(`      - Local %: ${(result.avgLocalDuration / result.avgDuration * 100).toFixed(1)}%`);
        console.log(`      - Sync %: ${(result.avgSyncDuration / result.avgDuration * 100).toFixed(1)}%`);
      }
      
      else if (result.type === 'combined') {
        console.log(`   ✅ Combined Operation Performance:`);
        console.log(`      - Average: ${result.avgDuration.toFixed(2)}ms`);
        console.log(`      - Min: ${result.minDuration.toFixed(2)}ms`);
        console.log(`      - Max: ${result.maxDuration.toFixed(2)}ms`);
      }
      
      else if (result.type === 'large-data') {
        console.log(`   ✅ Large Data Sync Performance:`);
        result.results.forEach(r => {
          console.log(`      - ${r.size} items: ${r.duration.toFixed(2)}ms (${r.itemsPerMs.toFixed(2)} items/ms)`);
        });
      }
      
      else if (result.type === 'multiple-ops') {
        console.log(`   ✅ Multiple Operations Comparison:`);
        console.log(`      - Local Only (${result.operations} ops): ${result.localOpsTotal.toFixed(2)}ms`);
        console.log(`      - Local + Sync (${result.operations} ops): ${result.syncOpsTotal.toFixed(2)}ms`);
        console.log(`      - Speed Difference: ${result.speedDifference.toFixed(2)}x slower with sync`);
        console.log(`      - Local Avg: ${result.localOpsAvg.toFixed(2)}ms/op`);
        console.log(`      - Sync Avg: ${result.syncOpsAvg.toFixed(2)}ms/op`);
      }
      
      else if (result.type === 'pattern') {
        console.log(`   ✅ Real-World Pattern Performance:`);
        console.log(`      - Local Ops (${result.localOps}): ${result.localDuration.toFixed(2)}ms`);
        console.log(`      - Background Sync: ${result.syncDuration.toFixed(2)}ms`);
        console.log(`      - User Perceived Time: ${result.userPerceivedTime.toFixed(2)}ms (only local ops)`);
        console.log(`      - Background Sync Time: ${result.backgroundSyncTime.toFixed(2)}ms (non-blocking)`);
        console.log(`      - Total Time: ${result.totalDuration.toFixed(2)}ms`);
      }
      
      else if (result.type === 'latency') {
        console.log(`   ✅ Network Latency Impact:`);
        result.results.forEach(r => {
          console.log(`      - ${r.latency}ms latency: ${r.syncDuration.toFixed(2)}ms total (${r.overhead.toFixed(2)}ms overhead)`);
        });
      }
      
      console.log('');
    });

    // Summary
    console.log('📈 PERFORMANCE SUMMARY');
    console.log('=======================\n');
    
    const localOnly = this.testResults.find(r => r.type === 'local-only');
    const syncOnly = this.testResults.find(r => r.type === 'sync-only');
    const pattern = this.testResults.find(r => r.type === 'pattern');
    
    if (localOnly && syncOnly) {
      const speedup = syncOnly.avgDuration / localOnly.avgDuration;
      console.log(`⚡ Local Only: ${localOnly.avgDuration.toFixed(2)}ms avg`);
      console.log(`🌐 Sync Only: ${syncOnly.avgDuration.toFixed(2)}ms avg`);
      console.log(`📊 Speed Difference: ${speedup.toFixed(2)}x slower with sync`);
      console.log(`💡 Recommendation: Use local-first pattern for instant UI feedback`);
    }
    
    if (pattern) {
      console.log(`\n🎯 Real-World Pattern:`);
      console.log(`   User Perceived: ${pattern.userPerceivedTime.toFixed(2)}ms (instant)`);
      console.log(`   Background Sync: ${pattern.backgroundSyncTime.toFixed(2)}ms (non-blocking)`);
      console.log(`   ✅ User experience: EXCELLENT (no waiting for sync)`);
    }
    
    console.log('\n🎉 SYNC SPEED TEST COMPLETE!');
  }
}

// Run the test
async function runSyncSpeedTest() {
  const test = new SyncSpeedTest();
  await test.runAllTests();
}

runSyncSpeedTest().catch(console.error);

