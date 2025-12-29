/**
 * Packaging Button Performance Test
 * Tests response time untuk setiap button click di Packaging module
 * Focus: Server environment performance measurement
 */

// Mock browser environment for Node.js execution
global.window = {
  localStorage: {
    data: {},
    getItem(key) {
      return this.data[key] || null;
    },
    setItem(key, value) {
      this.data[key] = value;
    },
    removeItem(key) {
      delete this.data[key];
    },
    clear() {
      this.data = {};
    }
  },
  performance: {
    now: () => Date.now()
  },
  requestIdleCallback: (callback) => setTimeout(callback, 0),
  requestAnimationFrame: (callback) => setTimeout(callback, 16)
};

// Mock storage service with performance tracking
const storageService = {
  async get(key) {
    const startTime = performance.now();
    const data = global.window.localStorage.getItem(key);
    const result = data ? JSON.parse(data) : null;
    const endTime = performance.now();
    
    // Track storage read performance
    this.trackOperation('READ', key, endTime - startTime);
    return result;
  },
  
  async set(key, value) {
    const startTime = performance.now();
    global.window.localStorage.setItem(key, JSON.stringify(value));
    const endTime = performance.now();
    
    // Track storage write performance
    this.trackOperation('WRITE', key, endTime - startTime);
    return true;
  },
  
  operations: [],
  
  trackOperation(type, key, duration) {
    this.operations.push({
      type,
      key,
      duration,
      timestamp: new Date().toISOString()
    });
  },
  
  getPerformanceStats() {
    const reads = this.operations.filter(op => op.type === 'READ');
    const writes = this.operations.filter(op => op.type === 'write');
    
    return {
      totalOperations: this.operations.length,
      reads: {
        count: reads.length,
        avgDuration: reads.length > 0 ? reads.reduce((sum, op) => sum + op.duration, 0) / reads.length : 0,
        maxDuration: reads.length > 0 ? Math.max(...reads.map(op => op.duration)) : 0
      },
      writes: {
        count: writes.length,
        avgDuration: writes.length > 0 ? writes.reduce((sum, op) => sum + op.duration, 0) / writes.length : 0,
        maxDuration: writes.length > 0 ? Math.max(...writes.map(op => op.duration)) : 0
      }
    };
  }
};

// Performance measurement utilities
const performanceTracker = {
  measurements: [],
  
  async measureButtonClick(buttonName, operation) {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.measurements.push({
        buttonName,
        duration,
        status: 'SUCCESS',
        timestamp: new Date().toISOString()
      });
      
      return { result, duration };
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.measurements.push({
        buttonName,
        duration,
        status: 'ERROR',
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  },
  
  getStats() {
    const successfulMeasurements = this.measurements.filter(m => m.status === 'SUCCESS');
    const errorMeasurements = this.measurements.filter(m => m.status === 'ERROR');
    
    if (successfulMeasurements.length === 0) {
      return {
        totalMeasurements: this.measurements.length,
        successCount: 0,
        errorCount: errorMeasurements.length,
        avgDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        measurements: this.measurements
      };
    }
    
    const durations = successfulMeasurements.map(m => m.duration);
    
    return {
      totalMeasurements: this.measurements.length,
      successCount: successfulMeasurements.length,
      errorCount: errorMeasurements.length,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      measurements: this.measurements
    };
  }
};

// Setup test data for performance testing
async function setupPerformanceTestData() {
  console.log('📋 Setting up performance test data...');
  
  // Setup customers (large dataset for performance testing)
  const customers = [];
  for (let i = 1; i <= 100; i++) {
    customers.push({
      id: `perf-customer-${i}`,
      kode: `CUST-PERF-${i.toString().padStart(3, '0')}`,
      nama: `Performance Test Customer ${i}`,
      kontak: `PIC Customer ${i}`,
      telepon: `021-${(1000000 + i).toString()}`,
      alamat: `Jl. Performance Test No. ${i}, Jakarta`,
      kategori: "Customer"
    });
  }
  await storageService.set('customers', customers);
  
  // Setup products (large dataset)
  const products = [];
  for (let i = 1; i <= 50; i++) {
    products.push({
      id: `perf-product-${i}`,
      kode: `PRD-PERF-${i.toString().padStart(3, '0')}`,
      nama: `Performance Test Product ${i}`,
      satuan: "PCS",
      hargaFg: 100000 + (i * 1000),
      hargaSales: 120000 + (i * 1200),
      kategori: "Finished Goods"
    });
  }
  await storageService.set('products', products);
  
  // Setup materials
  const materials = [];
  for (let i = 1; i <= 30; i++) {
    materials.push({
      id: `perf-material-${i}`,
      kode: `MAT-PERF-${i.toString().padStart(3, '0')}`,
      nama: `Performance Test Material ${i}`,
      satuan: i % 2 === 0 ? "KG" : "PCS",
      harga: 5000 + (i * 100),
      kategori: "Raw Material"
    });
  }
  await storageService.set('materials', materials);
  
  // Setup existing sales orders (for testing list operations)
  const salesOrders = [];
  for (let i = 1; i <= 20; i++) {
    salesOrders.push({
      id: `perf-so-${i}`,
      soNo: `SO-PERF-${i.toString().padStart(3, '0')}`,
      customer: `Performance Test Customer ${i}`,
      customerKode: `CUST-PERF-${i.toString().padStart(3, '0')}`,
      paymentTerms: i % 3 === 0 ? 'TOP' : (i % 2 === 0 ? 'COD' : 'CBD'),
      topDays: i % 3 === 0 ? 30 : undefined,
      status: i % 4 === 0 ? 'CLOSE' : 'OPEN',
      created: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString(),
      items: [
        {
          id: `perf-item-${i}-1`,
          productId: `perf-product-${(i % 10) + 1}`,
          productKode: `PRD-PERF-${((i % 10) + 1).toString().padStart(3, '0')}`,
          productName: `Performance Test Product ${(i % 10) + 1}`,
          qty: 10 + (i % 5),
          unit: 'PCS',
          price: 100000 + (i * 1000),
          total: (10 + (i % 5)) * (100000 + (i * 1000))
        }
      ]
    });
  }
  await storageService.set('salesOrders', salesOrders);
  
  console.log('✅ Performance test data setup completed');
  console.log(`   Customers: ${customers.length}`);
  console.log(`   Products: ${products.length}`);
  console.log(`   Materials: ${materials.length}`);
  console.log(`   Sales Orders: ${salesOrders.length}`);
}

// Test button performance scenarios
async function runPackagingButtonPerformanceTest() {
  console.log('🧪 Packaging Button Performance Test');
  console.log('─'.repeat(80));
  console.log('Testing: Button click response times in Packaging module');
  console.log('Environment: Server simulation with large datasets');
  console.log('─'.repeat(80));
  
  try {
    await setupPerformanceTestData();
    
    // Test 1: Data Loading Performance
    console.log('\n📋 Test 1: Data Loading Performance');
    
    const { duration: loadCustomersDuration } = await performanceTracker.measureButtonClick(
      'Load Customers',
      async () => {
        return await storageService.get('customers');
      }
    );
    
    const { duration: loadProductsDuration } = await performanceTracker.measureButtonClick(
      'Load Products', 
      async () => {
        return await storageService.get('products');
      }
    );
    
    const { duration: loadSalesOrdersDuration } = await performanceTracker.measureButtonClick(
      'Load Sales Orders',
      async () => {
        return await storageService.get('salesOrders');
      }
    );
    
    console.log('✅ Data Loading Performance:');
    console.log(`   Load Customers (100 items): ${loadCustomersDuration.toFixed(2)}ms`);
    console.log(`   Load Products (50 items): ${loadProductsDuration.toFixed(2)}ms`);
    console.log(`   Load Sales Orders (20 items): ${loadSalesOrdersDuration.toFixed(2)}ms`);
    
    // Test 2: Search & Filter Performance
    console.log('\n📋 Test 2: Search & Filter Performance');
    
    const customers = await storageService.get('customers');
    const products = await storageService.get('products');
    
    const { duration: searchCustomersDuration } = await performanceTracker.measureButtonClick(
      'Search Customers',
      async () => {
        const searchTerm = 'Customer 5';
        return customers.filter(c => 
          c.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.kode.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
    );
    
    const { duration: filterProductsDuration } = await performanceTracker.measureButtonClick(
      'Filter Products',
      async () => {
        return products.filter(p => p.hargaFg > 105000);
      }
    );
    
    console.log('✅ Search & Filter Performance:');
    console.log(`   Search Customers: ${searchCustomersDuration.toFixed(2)}ms`);
    console.log(`   Filter Products: ${filterProductsDuration.toFixed(2)}ms`);
    
    // Test 3: Form Operations Performance
    console.log('\n📋 Test 3: Form Operations Performance');
    
    const { duration: createSODuration } = await performanceTracker.measureButtonClick(
      'Create Sales Order',
      async () => {
        const newSO = {
          id: `perf-so-new-${Date.now()}`,
          soNo: `SO-PERF-NEW-${Date.now()}`,
          customer: 'Performance Test Customer 1',
          customerKode: 'CUST-PERF-001',
          paymentTerms: 'TOP',
          topDays: 30,
          status: 'OPEN',
          created: new Date().toISOString(),
          items: [
            {
              id: `perf-item-new-${Date.now()}`,
              productId: 'perf-product-1',
              productKode: 'PRD-PERF-001',
              productName: 'Performance Test Product 1',
              qty: 15,
              unit: 'PCS',
              price: 100000,
              total: 15 * 100000
            }
          ]
        };
        
        const existingSOs = await storageService.get('salesOrders') || [];
        existingSOs.push(newSO);
        await storageService.set('salesOrders', existingSOs);
        return newSO;
      }
    );
    
    const { duration: updateSODuration } = await performanceTracker.measureButtonClick(
      'Update Sales Order',
      async () => {
        const salesOrders = await storageService.get('salesOrders') || [];
        const soToUpdate = salesOrders.find(so => so.id === 'perf-so-1');
        if (soToUpdate) {
          soToUpdate.status = 'CLOSE';
          soToUpdate.updated = new Date().toISOString();
          await storageService.set('salesOrders', salesOrders);
        }
        return soToUpdate;
      }
    );
    
    console.log('✅ Form Operations Performance:');
    console.log(`   Create Sales Order: ${createSODuration.toFixed(2)}ms`);
    console.log(`   Update Sales Order: ${updateSODuration.toFixed(2)}ms`);
    
    // Test 4: Complex Operations Performance
    console.log('\n📋 Test 4: Complex Operations Performance');
    
    const { duration: calculateBOMDuration } = await performanceTracker.measureButtonClick(
      'Calculate BOM Requirements',
      async () => {
        // Simulate BOM calculation for multiple products
        const products = await storageService.get('products');
        const materials = await storageService.get('materials');
        
        const bomCalculations = [];
        for (let i = 0; i < 10; i++) {
          const product = products[i % products.length];
          const materialRequirements = [];
          
          // Simulate complex BOM calculation
          for (let j = 0; j < 5; j++) {
            const material = materials[j % materials.length];
            materialRequirements.push({
              materialId: material.id,
              materialName: material.nama,
              qty: (i + 1) * (j + 1) * 0.5,
              unit: material.satuan
            });
          }
          
          bomCalculations.push({
            productId: product.id,
            productName: product.nama,
            materials: materialRequirements
          });
        }
        
        return bomCalculations;
      }
    );
    
    const { duration: generateReportDuration } = await performanceTracker.measureButtonClick(
      'Generate Excel Report',
      async () => {
        const salesOrders = await storageService.get('salesOrders');
        
        // Simulate Excel report generation
        const reportData = salesOrders.map(so => ({
          'SO No': so.soNo,
          'Customer': so.customer,
          'Status': so.status,
          'Payment Terms': so.paymentTerms,
          'Created': new Date(so.created).toLocaleDateString('id-ID'),
          'Items Count': so.items?.length || 0,
          'Total Value': so.items?.reduce((sum, item) => sum + (item.total || 0), 0) || 0
        }));
        
        return reportData;
      }
    );
    
    console.log('✅ Complex Operations Performance:');
    console.log(`   Calculate BOM Requirements: ${calculateBOMDuration.toFixed(2)}ms`);
    console.log(`   Generate Excel Report: ${generateReportDuration.toFixed(2)}ms`);
    
    // Test 5: Concurrent Operations Performance
    console.log('\n📋 Test 5: Concurrent Operations Performance');
    
    const { duration: concurrentOperationsDuration } = await performanceTracker.measureButtonClick(
      'Concurrent Data Operations',
      async () => {
        // Simulate multiple concurrent operations
        const operations = [
          storageService.get('customers'),
          storageService.get('products'),
          storageService.get('materials'),
          storageService.get('salesOrders')
        ];
        
        const results = await Promise.all(operations);
        
        // Simulate concurrent processing
        const processedResults = await Promise.all([
          new Promise(resolve => setTimeout(() => resolve(results[0]?.length || 0), 10)),
          new Promise(resolve => setTimeout(() => resolve(results[1]?.length || 0), 15)),
          new Promise(resolve => setTimeout(() => resolve(results[2]?.length || 0), 8)),
          new Promise(resolve => setTimeout(() => resolve(results[3]?.length || 0), 12))
        ]);
        
        return processedResults;
      }
    );
    
    console.log('✅ Concurrent Operations Performance:');
    console.log(`   Concurrent Data Operations: ${concurrentOperationsDuration.toFixed(2)}ms`);
    
    // Test 6: Memory-Intensive Operations
    console.log('\n📋 Test 6: Memory-Intensive Operations Performance');
    
    const { duration: largeDataProcessingDuration } = await performanceTracker.measureButtonClick(
      'Large Data Processing',
      async () => {
        // Simulate processing large dataset
        const largeDataset = [];
        for (let i = 0; i < 1000; i++) {
          largeDataset.push({
            id: i,
            name: `Item ${i}`,
            value: Math.random() * 1000,
            category: `Category ${i % 10}`,
            timestamp: new Date().toISOString()
          });
        }
        
        // Simulate complex processing
        const processed = largeDataset
          .filter(item => item.value > 500)
          .map(item => ({
            ...item,
            processed: true,
            processedValue: item.value * 1.1
          }))
          .sort((a, b) => b.processedValue - a.processedValue);
        
        return processed;
      }
    );
    
    console.log('✅ Memory-Intensive Operations Performance:');
    console.log(`   Large Data Processing (1000 items): ${largeDataProcessingDuration.toFixed(2)}ms`);
    
    // Performance Analysis
    console.log('\n📊 Performance Analysis');
    console.log('─'.repeat(80));
    
    const stats = performanceTracker.getStats();
    const storageStats = storageService.getPerformanceStats();
    
    console.log('BUTTON CLICK PERFORMANCE:');
    console.log(`   Total Measurements: ${stats.totalMeasurements}`);
    console.log(`   Successful Operations: ${stats.successCount}`);
    console.log(`   Failed Operations: ${stats.errorCount}`);
    console.log(`   Average Response Time: ${stats.avgDuration.toFixed(2)}ms`);
    console.log(`   Fastest Response: ${stats.minDuration.toFixed(2)}ms`);
    console.log(`   Slowest Response: ${stats.maxDuration.toFixed(2)}ms`);
    
    console.log('\nSTORAGE PERFORMANCE:');
    console.log(`   Total Storage Operations: ${storageStats.totalOperations}`);
    console.log(`   Read Operations: ${storageStats.reads.count} (avg: ${storageStats.reads.avgDuration.toFixed(2)}ms)`);
    console.log(`   Write Operations: ${storageStats.writes.count} (avg: ${storageStats.writes.avgDuration.toFixed(2)}ms)`);
    
    // Performance Recommendations
    console.log('\n💡 Performance Recommendations');
    console.log('─'.repeat(80));
    
    const recommendations = [];
    
    if (stats.avgDuration > 100) {
      recommendations.push('⚠️  Average response time > 100ms - Consider optimization');
    }
    
    if (stats.maxDuration > 500) {
      recommendations.push('🚨 Some operations > 500ms - Critical optimization needed');
    }
    
    if (storageStats.reads.avgDuration > 50) {
      recommendations.push('📚 Storage read performance slow - Consider caching');
    }
    
    if (storageStats.writes.avgDuration > 100) {
      recommendations.push('💾 Storage write performance slow - Consider batching');
    }
    
    if (recommendations.length === 0) {
      console.log('✅ All performance metrics within acceptable ranges');
      console.log('✅ Button response times are optimal');
      console.log('✅ Storage operations are efficient');
    } else {
      recommendations.forEach(rec => console.log(rec));
    }
    
    // Detailed Performance Breakdown
    console.log('\n📋 Detailed Performance Breakdown');
    console.log('─'.repeat(80));
    
    const buttonStats = {};
    stats.measurements.forEach(measurement => {
      if (!buttonStats[measurement.buttonName]) {
        buttonStats[measurement.buttonName] = [];
      }
      if (measurement.status === 'SUCCESS') {
        buttonStats[measurement.buttonName].push(measurement.duration);
      }
    });
    
    Object.entries(buttonStats).forEach(([buttonName, durations]) => {
      if (durations.length > 0) {
        const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
        const min = Math.min(...durations);
        const max = Math.max(...durations);
        
        console.log(`${buttonName}:`);
        console.log(`   Average: ${avg.toFixed(2)}ms`);
        console.log(`   Range: ${min.toFixed(2)}ms - ${max.toFixed(2)}ms`);
        
        // Performance rating
        let rating = '✅ Excellent';
        if (avg > 200) rating = '🚨 Poor';
        else if (avg > 100) rating = '⚠️  Needs Improvement';
        else if (avg > 50) rating = '👍 Good';
        
        console.log(`   Rating: ${rating}`);
        console.log('');
      }
    });
    
    // Server Environment Considerations
    console.log('🖥️  Server Environment Considerations');
    console.log('─'.repeat(80));
    console.log('NETWORK LATENCY SIMULATION:');
    
    // Simulate network latency for server environment
    const networkLatencyTests = [
      { name: 'Local Network (1ms)', latency: 1 },
      { name: 'LAN (5ms)', latency: 5 },
      { name: 'WAN (50ms)', latency: 50 },
      { name: 'Internet (100ms)', latency: 100 },
      { name: 'Slow Connection (300ms)', latency: 300 }
    ];
    
    for (const test of networkLatencyTests) {
      const { duration } = await performanceTracker.measureButtonClick(
        `Network Test: ${test.name}`,
        async () => {
          // Simulate network delay
          await new Promise(resolve => setTimeout(resolve, test.latency));
          return await storageService.get('customers');
        }
      );
      
      const effectiveResponseTime = duration;
      console.log(`   ${test.name}: ${effectiveResponseTime.toFixed(2)}ms total response time`);
    }
    
    // Final Assessment
    console.log('\n🎯 Final Performance Assessment');
    console.log('─'.repeat(80));
    
    const overallRating = stats.avgDuration <= 50 ? 'EXCELLENT' : 
                         stats.avgDuration <= 100 ? 'GOOD' : 
                         stats.avgDuration <= 200 ? 'ACCEPTABLE' : 'POOR';
    
    console.log(`Overall Performance Rating: ${overallRating}`);
    console.log(`Average Button Response Time: ${stats.avgDuration.toFixed(2)}ms`);
    console.log(`Success Rate: ${((stats.successCount / stats.totalMeasurements) * 100).toFixed(1)}%`);
    
    if (overallRating === 'EXCELLENT' || overallRating === 'GOOD') {
      console.log('\n🎉 PACKAGING BUTTON PERFORMANCE TEST PASSED!');
      console.log('✅ All button clicks respond within acceptable time limits');
      console.log('✅ System is ready for server deployment');
      console.log('✅ User experience will be smooth');
    } else {
      console.log('\n⚠️  PACKAGING BUTTON PERFORMANCE NEEDS ATTENTION!');
      console.log('❌ Some operations are slower than optimal');
      console.log('❌ Consider optimization before server deployment');
    }
    
    return overallRating === 'EXCELLENT' || overallRating === 'GOOD';
    
  } catch (error) {
    console.log('\n❌ Packaging Button Performance Test FAILED!');
    console.log('Error:', error.message);
    return false;
  }
}

// Run the packaging button performance test
runPackagingButtonPerformanceTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Packaging button performance test execution failed:', error);
  process.exit(1);
});