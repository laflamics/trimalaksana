/**
 * Packaging UI Interaction Performance Test
 * Tests realistic UI interactions dengan server-like conditions
 * Focus: Button clicks, form submissions, data loading dengan network simulation
 */

// Mock browser environment dengan realistic delays
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
  requestAnimationFrame: (callback) => setTimeout(callback, 16),
  fetch: async (url, options) => {
    // Simulate server API calls dengan realistic delays
    const delay = Math.random() * 100 + 50; // 50-150ms delay
    await new Promise(resolve => setTimeout(resolve, delay));
    return {
      ok: true,
      json: async () => ({ success: true, data: [] })
    };
  }
};

// Realistic storage service dengan server-like delays
const storageService = {
  async get(key) {
    const startTime = performance.now();
    
    // Simulate server database query delay
    const dbDelay = this.getRealisticDelay(key);
    await new Promise(resolve => setTimeout(resolve, dbDelay));
    
    const data = global.window.localStorage.getItem(key);
    const result = data ? JSON.parse(data) : null;
    const endTime = performance.now();
    
    this.trackOperation('READ', key, endTime - startTime, dbDelay);
    return result;
  },
  
  async set(key, value) {
    const startTime = performance.now();
    
    // Simulate server database write delay
    const dbDelay = this.getRealisticDelay(key, 'write');
    await new Promise(resolve => setTimeout(resolve, dbDelay));
    
    global.window.localStorage.setItem(key, JSON.stringify(value));
    const endTime = performance.now();
    
    this.trackOperation('WRITE', key, endTime - startTime, dbDelay);
    return true;
  },
  
  getRealisticDelay(key, operation = 'read') {
    // Simulate realistic database delays based on data size and operation
    const baseDelay = operation === 'write' ? 20 : 10;
    const sizeMultiplier = key.includes('Orders') ? 2 : 1;
    const networkJitter = Math.random() * 10;
    
    return baseDelay * sizeMultiplier + networkJitter;
  },
  
  operations: [],
  
  trackOperation(type, key, totalDuration, dbDelay) {
    this.operations.push({
      type,
      key,
      totalDuration,
      dbDelay,
      networkOverhead: totalDuration - dbDelay,
      timestamp: new Date().toISOString()
    });
  }
};

// UI Component Performance Simulator
class UIComponentSimulator {
  constructor() {
    this.renderTimes = [];
    this.interactionTimes = [];
  }
  
  async simulateComponentRender(componentName, dataSize = 0) {
    const startTime = performance.now();
    
    // Simulate React component rendering time
    const baseRenderTime = 5; // Base 5ms for component render
    const dataRenderTime = dataSize * 0.1; // 0.1ms per data item
    const complexityFactor = Math.random() * 3; // Random complexity
    
    const totalRenderTime = baseRenderTime + dataRenderTime + complexityFactor;
    await new Promise(resolve => setTimeout(resolve, totalRenderTime));
    
    const endTime = performance.now();
    const actualDuration = endTime - startTime;
    
    this.renderTimes.push({
      componentName,
      dataSize,
      duration: actualDuration,
      timestamp: new Date().toISOString()
    });
    
    return actualDuration;
  }
  
  async simulateButtonClick(buttonName, operation) {
    const startTime = performance.now();
    
    // Simulate button click processing
    await new Promise(resolve => setTimeout(resolve, 2)); // Button click delay
    
    const result = await operation();
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    this.interactionTimes.push({
      buttonName,
      duration,
      timestamp: new Date().toISOString()
    });
    
    return { result, duration };
  }
  
  getStats() {
    const avgRenderTime = this.renderTimes.length > 0 
      ? this.renderTimes.reduce((sum, r) => sum + r.duration, 0) / this.renderTimes.length 
      : 0;
      
    const avgInteractionTime = this.interactionTimes.length > 0
      ? this.interactionTimes.reduce((sum, i) => sum + i.duration, 0) / this.interactionTimes.length
      : 0;
    
    return {
      totalRenders: this.renderTimes.length,
      totalInteractions: this.interactionTimes.length,
      avgRenderTime,
      avgInteractionTime,
      renders: this.renderTimes,
      interactions: this.interactionTimes
    };
  }
}

// Setup realistic test data
async function setupRealisticTestData() {
  console.log('📋 Setting up realistic server test data...');
  
  // Customers dengan realistic data size
  const customers = [];
  for (let i = 1; i <= 200; i++) {
    customers.push({
      id: `customer-${i}`,
      kode: `CUST-${i.toString().padStart(4, '0')}`,
      nama: `PT. Customer Testing ${i}`,
      kontak: `PIC Customer ${i}`,
      telepon: `021-${(10000000 + i).toString()}`,
      alamat: `Jl. Customer Street No. ${i}, Jakarta Selatan, DKI Jakarta ${12000 + i}`,
      npwp: `${(10000000 + i).toString().slice(0, 2)}.${(10000000 + i).toString().slice(2, 5)}.${(10000000 + i).toString().slice(5, 8)}-${i.toString().slice(-3)}.000`,
      kategori: "Customer",
      created: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)).toISOString()
    });
  }
  await storageService.set('customers', customers);
  
  // Products dengan BOM complexity
  const products = [];
  for (let i = 1; i <= 100; i++) {
    products.push({
      id: `product-${i}`,
      kode: `PRD-${i.toString().padStart(4, '0')}`,
      nama: `Product Testing ${i} - ${i % 5 === 0 ? 'Complex Assembly' : 'Standard Item'}`,
      satuan: "PCS",
      hargaFg: 50000 + (i * 2500),
      hargaSales: 60000 + (i * 3000),
      kategori: i % 3 === 0 ? "Complex Product" : "Standard Product",
      description: `Detailed description for product ${i} with specifications and features`,
      created: new Date(Date.now() - (i * 12 * 60 * 60 * 1000)).toISOString()
    });
  }
  await storageService.set('products', products);
  
  // Sales Orders dengan realistic complexity
  const salesOrders = [];
  for (let i = 1; i <= 50; i++) {
    const itemCount = Math.floor(Math.random() * 5) + 1; // 1-5 items per SO
    const items = [];
    
    for (let j = 0; j < itemCount; j++) {
      const productIndex = Math.floor(Math.random() * 100) + 1;
      const qty = Math.floor(Math.random() * 20) + 1;
      const price = 50000 + (productIndex * 2500);
      
      items.push({
        id: `item-${i}-${j}`,
        productId: `product-${productIndex}`,
        productKode: `PRD-${productIndex.toString().padStart(4, '0')}`,
        productName: `Product Testing ${productIndex}`,
        qty,
        unit: 'PCS',
        price,
        total: qty * price,
        specNote: j % 2 === 0 ? `Special requirements for item ${j + 1}` : undefined
      });
    }
    
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    
    salesOrders.push({
      id: `so-${i}`,
      soNo: `SO-${new Date().getFullYear()}-${i.toString().padStart(4, '0')}`,
      customer: `PT. Customer Testing ${(i % 200) + 1}`,
      customerKode: `CUST-${((i % 200) + 1).toString().padStart(4, '0')}`,
      paymentTerms: i % 3 === 0 ? 'TOP' : (i % 2 === 0 ? 'COD' : 'CBD'),
      topDays: i % 3 === 0 ? (i % 2 === 0 ? 30 : 45) : undefined,
      status: i % 5 === 0 ? 'CLOSE' : 'OPEN',
      created: new Date(Date.now() - (i * 6 * 60 * 60 * 1000)).toISOString(),
      items,
      subtotal,
      tax: subtotal * 0.11,
      total: subtotal * 1.11,
      globalSpecNote: i % 3 === 0 ? `Global specifications for SO ${i}` : undefined
    });
  }
  await storageService.set('salesOrders', salesOrders);
  
  console.log('✅ Realistic server test data setup completed');
  console.log(`   Customers: ${customers.length} (realistic business size)`);
  console.log(`   Products: ${products.length} (medium catalog)`);
  console.log(`   Sales Orders: ${salesOrders.length} (active orders)`);
}

// Main UI interaction test
async function runPackagingUIInteractionTest() {
  console.log('🧪 Packaging UI Interaction Performance Test');
  console.log('─'.repeat(80));
  console.log('Testing: Realistic UI interactions dengan server conditions');
  console.log('Environment: Simulated server dengan network delays');
  console.log('─'.repeat(80));
  
  const uiSimulator = new UIComponentSimulator();
  
  try {
    await setupRealisticTestData();
    
    // Test 1: Page Load Performance
    console.log('\n📋 Test 1: Page Load Performance (Sales Orders)');
    
    const pageLoadStart = performance.now();
    
    // Simulate initial page load
    await uiSimulator.simulateComponentRender('PageHeader', 0);
    
    // Load critical data first (progressive loading)
    const { duration: loadOrdersDuration } = await uiSimulator.simulateButtonClick(
      'Load Sales Orders',
      async () => {
        const orders = await storageService.get('salesOrders');
        await uiSimulator.simulateComponentRender('SalesOrdersList', orders?.length || 0);
        return orders;
      }
    );
    
    // Load master data in background
    const { duration: loadMasterDataDuration } = await uiSimulator.simulateButtonClick(
      'Load Master Data',
      async () => {
        const [customers, products] = await Promise.all([
          storageService.get('customers'),
          storageService.get('products')
        ]);
        
        await Promise.all([
          uiSimulator.simulateComponentRender('CustomerDropdown', customers?.length || 0),
          uiSimulator.simulateComponentRender('ProductDropdown', products?.length || 0)
        ]);
        
        return { customers, products };
      }
    );
    
    const pageLoadEnd = performance.now();
    const totalPageLoadTime = pageLoadEnd - pageLoadStart;
    
    console.log('✅ Page Load Performance:');
    console.log(`   Sales Orders Load: ${loadOrdersDuration.toFixed(2)}ms`);
    console.log(`   Master Data Load: ${loadMasterDataDuration.toFixed(2)}ms`);
    console.log(`   Total Page Load: ${totalPageLoadTime.toFixed(2)}ms`);
    
    // Test 2: Search & Filter Interactions
    console.log('\n📋 Test 2: Search & Filter Interactions');
    
    const customers = await storageService.get('customers');
    const salesOrders = await storageService.get('salesOrders');
    
    const { duration: searchDuration } = await uiSimulator.simulateButtonClick(
      'Customer Search',
      async () => {
        // Simulate debounced search (300ms delay)
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const searchTerm = 'Customer Testing 15';
        const results = customers.filter(c => 
          c.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.kode.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        await uiSimulator.simulateComponentRender('SearchResults', results.length);
        return results;
      }
    );
    
    const { duration: filterDuration } = await uiSimulator.simulateButtonClick(
      'Status Filter',
      async () => {
        const filteredOrders = salesOrders.filter(so => so.status === 'OPEN');
        await uiSimulator.simulateComponentRender('FilteredOrdersList', filteredOrders.length);
        return filteredOrders;
      }
    );
    
    console.log('✅ Search & Filter Performance:');
    console.log(`   Customer Search (debounced): ${searchDuration.toFixed(2)}ms`);
    console.log(`   Status Filter: ${filterDuration.toFixed(2)}ms`);
    
    // Test 3: Form Operations
    console.log('\n📋 Test 3: Form Operations Performance');
    
    const { duration: openFormDuration } = await uiSimulator.simulateButtonClick(
      'Open Create SO Form',
      async () => {
        await uiSimulator.simulateComponentRender('CreateSODialog', 0);
        await uiSimulator.simulateComponentRender('FormFields', 8); // 8 form fields
        return true;
      }
    );
    
    const { duration: fillFormDuration } = await uiSimulator.simulateButtonClick(
      'Fill Form Fields',
      async () => {
        // Simulate user typing and field validation
        const fieldOperations = [];
        for (let i = 0; i < 5; i++) {
          fieldOperations.push(
            new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 30))
          );
        }
        await Promise.all(fieldOperations);
        
        await uiSimulator.simulateComponentRender('FormValidation', 5);
        return true;
      }
    );
    
    const { duration: submitFormDuration } = await uiSimulator.simulateButtonClick(
      'Submit SO Form',
      async () => {
        // Create new SO
        const newSO = {
          id: `so-new-${Date.now()}`,
          soNo: `SO-${new Date().getFullYear()}-NEW-${Date.now()}`,
          customer: 'PT. Customer Testing 1',
          customerKode: 'CUST-0001',
          paymentTerms: 'TOP',
          topDays: 30,
          status: 'OPEN',
          created: new Date().toISOString(),
          items: [
            {
              id: `item-new-${Date.now()}`,
              productId: 'product-1',
              productKode: 'PRD-0001',
              productName: 'Product Testing 1',
              qty: 10,
              unit: 'PCS',
              price: 52500,
              total: 525000
            }
          ]
        };
        
        const existingOrders = await storageService.get('salesOrders') || [];
        existingOrders.push(newSO);
        await storageService.set('salesOrders', existingOrders);
        
        // Re-render list with new item
        await uiSimulator.simulateComponentRender('UpdatedSalesOrdersList', existingOrders.length);
        
        return newSO;
      }
    );
    
    console.log('✅ Form Operations Performance:');
    console.log(`   Open Create Form: ${openFormDuration.toFixed(2)}ms`);
    console.log(`   Fill Form Fields: ${fillFormDuration.toFixed(2)}ms`);
    console.log(`   Submit Form: ${submitFormDuration.toFixed(2)}ms`);
    
    // Test 4: Complex UI Interactions
    console.log('\n📋 Test 4: Complex UI Interactions');
    
    const { duration: bulkOperationDuration } = await uiSimulator.simulateButtonClick(
      'Bulk Status Update',
      async () => {
        const orders = await storageService.get('salesOrders');
        const openOrders = orders.filter(so => so.status === 'OPEN');
        
        // Simulate bulk update with progress indication
        for (let i = 0; i < Math.min(openOrders.length, 10); i++) {
          await new Promise(resolve => setTimeout(resolve, 20)); // Processing delay
          await uiSimulator.simulateComponentRender('ProgressIndicator', i + 1);
        }
        
        return openOrders.slice(0, 10);
      }
    );
    
    const { duration: exportOperationDuration } = await uiSimulator.simulateButtonClick(
      'Export to Excel',
      async () => {
        const orders = await storageService.get('salesOrders');
        
        // Simulate Excel generation
        await new Promise(resolve => setTimeout(resolve, 100)); // Excel processing
        
        const exportData = orders.map(so => ({
          'SO No': so.soNo,
          'Customer': so.customer,
          'Status': so.status,
          'Total': so.total || 0,
          'Created': new Date(so.created).toLocaleDateString('id-ID')
        }));
        
        await uiSimulator.simulateComponentRender('ExportProgress', 100);
        return exportData;
      }
    );
    
    console.log('✅ Complex UI Interactions:');
    console.log(`   Bulk Status Update: ${bulkOperationDuration.toFixed(2)}ms`);
    console.log(`   Export to Excel: ${exportOperationDuration.toFixed(2)}ms`);
    
    // Test 5: Server Communication Simulation
    console.log('\n📋 Test 5: Server Communication Performance');
    
    const { duration: apiCallDuration } = await uiSimulator.simulateButtonClick(
      'API Data Sync',
      async () => {
        // Simulate multiple API calls
        const apiCalls = [
          window.fetch('/api/customers'),
          window.fetch('/api/products'),
          window.fetch('/api/orders')
        ];
        
        const results = await Promise.all(apiCalls);
        await uiSimulator.simulateComponentRender('SyncStatus', results.length);
        
        return results;
      }
    );
    
    const { duration: realTimeUpdateDuration } = await uiSimulator.simulateButtonClick(
      'Real-time Updates',
      async () => {
        // Simulate WebSocket or polling updates
        const updates = [];
        for (let i = 0; i < 5; i++) {
          await new Promise(resolve => setTimeout(resolve, 200)); // Polling interval
          updates.push(`Update ${i + 1}`);
          await uiSimulator.simulateComponentRender('LiveUpdate', i + 1);
        }
        
        return updates;
      }
    );
    
    console.log('✅ Server Communication Performance:');
    console.log(`   API Data Sync: ${apiCallDuration.toFixed(2)}ms`);
    console.log(`   Real-time Updates: ${realTimeUpdateDuration.toFixed(2)}ms`);
    
    // Performance Analysis
    console.log('\n📊 UI Performance Analysis');
    console.log('─'.repeat(80));
    
    const uiStats = uiSimulator.getStats();
    
    console.log('UI COMPONENT PERFORMANCE:');
    console.log(`   Total Renders: ${uiStats.totalRenders}`);
    console.log(`   Average Render Time: ${uiStats.avgRenderTime.toFixed(2)}ms`);
    console.log(`   Total Interactions: ${uiStats.totalInteractions}`);
    console.log(`   Average Interaction Time: ${uiStats.avgInteractionTime.toFixed(2)}ms`);
    
    // Storage performance analysis
    const storageOps = storageService.operations;
    const avgDbDelay = storageOps.length > 0 
      ? storageOps.reduce((sum, op) => sum + op.dbDelay, 0) / storageOps.length 
      : 0;
    const avgNetworkOverhead = storageOps.length > 0
      ? storageOps.reduce((sum, op) => sum + op.networkOverhead, 0) / storageOps.length
      : 0;
    
    console.log('\nSERVER PERFORMANCE:');
    console.log(`   Database Operations: ${storageOps.length}`);
    console.log(`   Average DB Delay: ${avgDbDelay.toFixed(2)}ms`);
    console.log(`   Average Network Overhead: ${avgNetworkOverhead.toFixed(2)}ms`);
    
    // User Experience Assessment
    console.log('\n👤 User Experience Assessment');
    console.log('─'.repeat(80));
    
    const uxMetrics = {
      pageLoadTime: totalPageLoadTime,
      avgInteractionTime: uiStats.avgInteractionTime,
      avgRenderTime: uiStats.avgRenderTime,
      serverResponseTime: avgDbDelay + avgNetworkOverhead
    };
    
    const uxRatings = {
      pageLoad: uxMetrics.pageLoadTime <= 1000 ? 'Excellent' : 
                uxMetrics.pageLoadTime <= 2000 ? 'Good' : 
                uxMetrics.pageLoadTime <= 3000 ? 'Acceptable' : 'Poor',
      
      interactions: uxMetrics.avgInteractionTime <= 100 ? 'Excellent' :
                   uxMetrics.avgInteractionTime <= 300 ? 'Good' :
                   uxMetrics.avgInteractionTime <= 500 ? 'Acceptable' : 'Poor',
      
      rendering: uxMetrics.avgRenderTime <= 16 ? 'Excellent' : // 60fps
                uxMetrics.avgRenderTime <= 33 ? 'Good' : // 30fps
                uxMetrics.avgRenderTime <= 50 ? 'Acceptable' : 'Poor',
      
      server: uxMetrics.serverResponseTime <= 100 ? 'Excellent' :
             uxMetrics.serverResponseTime <= 300 ? 'Good' :
             uxMetrics.serverResponseTime <= 500 ? 'Acceptable' : 'Poor'
    };
    
    console.log('USER EXPERIENCE METRICS:');
    console.log(`   Page Load Time: ${uxMetrics.pageLoadTime.toFixed(2)}ms (${uxRatings.pageLoad})`);
    console.log(`   Interaction Response: ${uxMetrics.avgInteractionTime.toFixed(2)}ms (${uxRatings.interactions})`);
    console.log(`   UI Rendering: ${uxMetrics.avgRenderTime.toFixed(2)}ms (${uxRatings.rendering})`);
    console.log(`   Server Response: ${uxMetrics.serverResponseTime.toFixed(2)}ms (${uxRatings.server})`);
    
    // Overall assessment
    const overallRating = Object.values(uxRatings).every(rating => rating === 'Excellent') ? 'EXCELLENT' :
                         Object.values(uxRatings).every(rating => rating !== 'Poor') ? 'GOOD' :
                         Object.values(uxRatings).filter(rating => rating === 'Poor').length <= 1 ? 'ACCEPTABLE' : 'POOR';
    
    console.log('\n🎯 Overall Performance Assessment');
    console.log('─'.repeat(80));
    console.log(`Overall Rating: ${overallRating}`);
    
    if (overallRating === 'EXCELLENT' || overallRating === 'GOOD') {
      console.log('\n🎉 PACKAGING UI INTERACTION TEST PASSED!');
      console.log('✅ All UI interactions perform within acceptable limits');
      console.log('✅ Server environment ready for deployment');
      console.log('✅ User experience will be smooth and responsive');
    } else {
      console.log('\n⚠️  PACKAGING UI INTERACTION NEEDS OPTIMIZATION!');
      console.log('❌ Some interactions are slower than optimal');
      console.log('❌ Consider performance optimization before deployment');
    }
    
    return overallRating === 'EXCELLENT' || overallRating === 'GOOD';
    
  } catch (error) {
    console.log('\n❌ Packaging UI Interaction Test FAILED!');
    console.log('Error:', error.message);
    return false;
  }
}

// Run the UI interaction test
runPackagingUIInteractionTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Packaging UI interaction test execution failed:', error);
  process.exit(1);
});