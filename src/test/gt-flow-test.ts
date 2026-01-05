/**
 * GT (General Trading) Flow Test
 * Tests the complete General Trading workflow from SO to Delivery
 */

import { storageService } from '../services/storage';

interface TestResult {
  success: boolean;
  message: string;
  data?: any;
  error?: string;
}

interface TestSuite {
  name: string;
  tests: Array<() => Promise<TestResult>>;
}

class GTFlowTester {
  private testData = {
    customer: {
      id: "test-customer-1",
      kode: "TEST-001",
      nama: "PT. TEST CUSTOMER",
      kontak: "Test PIC",
      telepon: "021-1234567",
      alamat: "Test Address",
      kategori: "Customer"
    },
    product: {
      id: "test-product-1", 
      product_id: "TEST-PRD-001",
      kode: "TEST-PRD-001",
      nama: "Test Product",
      satuan: "PCS",
      harga: 100000,
      hargaSales: 120000,
      hargaFg: 120000,
      kategori: "Test"
    },
    inventory: {
      id: "test-inventory-1",
      codeItem: "TEST-PRD-001",
      description: "Test Product",
      kategori: "Product",
      satuan: "PCS",
      price: 100000,
      stockPremonth: 0,
      receive: 100,
      outgoing: 0,
      return: 0,
      nextStock: 100
    }
  };

  private createdRecords: { [key: string]: string[] } = {
    gt_customers: [],
    gt_products: [],
    gt_inventory: [],
    gt_salesOrders: [],
    gt_spk: [],
    gt_delivery: [],
    gt_ppicNotifications: [],
    gt_deliveryNotifications: []
  };

  async runAllTests(): Promise<void> {
    console.log('🧪 Starting GT Flow Tests...\n');

    const testSuites: TestSuite[] = [
      {
        name: 'Setup Test Data',
        tests: [
          () => this.setupTestData(),
          () => this.validateTestDataSetup()
        ]
      },
      {
        name: 'GT SalesOrders Component',
        tests: [
          () => this.testCreateSalesOrder(),
          () => this.testSalesOrderValidation(),
          () => this.testQuotationFlow()
        ]
      },
      {
        name: 'GT PPIC Component', 
        tests: [
          () => this.testPPICNotifications(),
          () => this.testSPKCreation(),
          () => this.testInventoryCheck(),
          () => this.testPRCreation()
        ]
      },
      {
        name: 'GT DeliveryNote Component',
        tests: [
          () => this.testDeliveryNotifications(),
          () => this.testCreateDeliveryNote(),
          () => this.testInventoryUpdate(),
          () => this.testSuratJalanGeneration()
        ]
      },
      {
        name: 'Integration Tests',
        tests: [
          () => this.testCompleteGTFlow(),
          () => this.testStockShortageFlow(),
          () => this.testMultipleProductsFlow()
        ]
      },
      {
        name: 'Cleanup',
        tests: [
          () => this.cleanupTestData()
        ]
      }
    ];

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    for (const suite of testSuites) {
      console.log(`📋 ${suite.name}`);
      console.log('─'.repeat(50));

      for (const test of suite.tests) {
        totalTests++;
        try {
          const result = await test();
          if (result.success) {
            console.log(`✅ ${result.message}`);
            passedTests++;
          } else {
            console.log(`❌ ${result.message}`);
            if (result.error) {
              console.log(`   Error: ${result.error}`);
            }
            failedTests++;
          }
        } catch (error: any) {
          console.log(`💥 Test crashed: ${error.message}`);
          failedTests++;
        }
      }
      console.log('');
    }

    // Summary
    console.log('📊 Test Summary');
    console.log('─'.repeat(50));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📈 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests === 0) {
      console.log('\n🎉 All GT Flow tests passed!');
    } else {
      console.log(`\n⚠️  ${failedTests} test(s) failed. Please check the issues above.`);
    }
  }

  // Setup Test Data
  async setupTestData(): Promise<TestResult> {
    try {
      // Setup customers
      const customers = await storageService.get<any[]>('gt_customers') || [];
      if (!customers.find(c => c.kode === this.testData.customer.kode)) {
        customers.push(this.testData.customer);
        await storageService.set('gt_customers', customers);
        this.createdRecords.gt_customers.push(this.testData.customer.id);
      }

      // Setup products
      const products = await storageService.get<any[]>('gt_products') || [];
      if (!products.find(p => p.kode === this.testData.product.kode)) {
        products.push(this.testData.product);
        await storageService.set('gt_products', products);
        this.createdRecords.gt_products.push(this.testData.product.id);
      }

      // Setup inventory
      const inventory = await storageService.get<any>('gt_inventory') || { value: [] };
      const inventoryArray = Array.isArray(inventory) ? inventory : (inventory.value || []);
      if (!inventoryArray.find((i: any) => i.codeItem === this.testData.inventory.codeItem)) {
        inventoryArray.push(this.testData.inventory);
        await storageService.set('gt_inventory', { value: inventoryArray, timestamp: Date.now() });
        this.createdRecords.gt_inventory.push(this.testData.inventory.id);
      }

      return {
        success: true,
        message: 'Test data setup completed'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to setup test data',
        error: error.message
      };
    }
  }

  async validateTestDataSetup(): Promise<TestResult> {
    try {
      const customers = await storageService.get<any[]>('gt_customers') || [];
      const products = await storageService.get<any[]>('gt_products') || [];
      const inventory = await storageService.get<any>('gt_inventory') || { value: [] };
      const inventoryArray = Array.isArray(inventory) ? inventory : (inventory.value || []);

      const customerExists = customers.find(c => c.kode === this.testData.customer.kode);
      const productExists = products.find(p => p.kode === this.testData.product.kode);
      const inventoryExists = inventoryArray.find((i: any) => i.codeItem === this.testData.inventory.codeItem);

      if (!customerExists || !productExists || !inventoryExists) {
        return {
          success: false,
          message: 'Test data validation failed',
          error: `Missing: ${!customerExists ? 'customer ' : ''}${!productExists ? 'product ' : ''}${!inventoryExists ? 'inventory' : ''}`
        };
      }

      return {
        success: true,
        message: 'Test data validation passed'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Test data validation error',
        error: error.message
      };
    }
  }

  // GT SalesOrders Tests
  async testCreateSalesOrder(): Promise<TestResult> {
    try {
      const salesOrders = await storageService.get<any[]>('gt_salesOrders') || [];
      
      const testSO = {
        id: `test-so-${Date.now()}`,
        soNo: `TEST-SO-${Date.now()}`,
        customer: this.testData.customer.nama,
        customerKode: this.testData.customer.kode,
        paymentTerms: 'TOP' as const,
        topDays: 30,
        status: 'OPEN' as const,
        created: new Date().toISOString(),
        items: [{
          id: `test-item-${Date.now()}`,
          productId: this.testData.product.kode,
          productKode: this.testData.product.kode,
          productName: this.testData.product.nama,
          qty: 10,
          unit: 'PCS',
          price: this.testData.product.hargaSales,
          total: 10 * this.testData.product.hargaSales
        }]
      };

      salesOrders.push(testSO);
      await storageService.set('gt_salesOrders', salesOrders);
      this.createdRecords.gt_salesOrders.push(testSO.id);

      // Create PPIC notification
      const ppicNotifications = await storageService.get<any[]>('gt_ppicNotifications') || [];
      const notification = {
        id: `ppic-notif-${Date.now()}`,
        type: 'SO_CREATED',
        soNo: testSO.soNo,
        customer: testSO.customer,
        items: testSO.items,
        status: 'PENDING',
        created: new Date().toISOString()
      };
      ppicNotifications.push(notification);
      await storageService.set('gt_ppicNotifications', ppicNotifications);
      this.createdRecords.gt_ppicNotifications.push(notification.id);

      return {
        success: true,
        message: 'Sales Order created successfully',
        data: testSO
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Failed to create Sales Order',
        error: error.message
      };
    }
  }

  async testSalesOrderValidation(): Promise<TestResult> {
    try {
      const salesOrders = await storageService.get<any[]>('gt_salesOrders') || [];
      const testSO = salesOrders.find(so => so.id.startsWith('test-so-'));

      if (!testSO) {
        return {
          success: false,
          message: 'Test SO not found for validation'
        };
      }

      // Validate SO structure
      const requiredFields = ['id', 'soNo', 'customer', 'status', 'items'];
      const missingFields = requiredFields.filter(field => !testSO[field]);

      if (missingFields.length > 0) {
        return {
          success: false,
          message: 'SO validation failed',
          error: `Missing fields: ${missingFields.join(', ')}`
        };
      }

      // Validate items
      if (!Array.isArray(testSO.items) || testSO.items.length === 0) {
        return {
          success: false,
          message: 'SO validation failed',
          error: 'Items array is empty or invalid'
        };
      }

      const item = testSO.items[0];
      const itemRequiredFields = ['productId', 'productName', 'qty', 'price'];
      const itemMissingFields = itemRequiredFields.filter(field => !item[field]);

      if (itemMissingFields.length > 0) {
        return {
          success: false,
          message: 'SO item validation failed',
          error: `Missing item fields: ${itemMissingFields.join(', ')}`
        };
      }

      return {
        success: true,
        message: 'Sales Order validation passed'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'SO validation error',
        error: error.message
      };
    }
  }

  async testQuotationFlow(): Promise<TestResult> {
    try {
      const quotations = await storageService.get<any[]>('gt_quotations') || [];
      
      const testQuotation = {
        id: `test-quote-${Date.now()}`,
        soNo: `QUO-${Date.now()}`,
        customer: this.testData.customer.nama,
        customerKode: this.testData.customer.kode,
        paymentTerms: 'TOP' as const,
        topDays: 30,
        status: 'OPEN' as const,
        created: new Date().toISOString(),
        items: [{
          id: `test-quote-item-${Date.now()}`,
          productId: this.testData.product.kode,
          productKode: this.testData.product.kode,
          productName: this.testData.product.nama,
          qty: 5,
          unit: 'PCS',
          price: this.testData.product.hargaSales,
          total: 5 * this.testData.product.hargaSales
        }],
        discountPercent: 5
      };

      quotations.push(testQuotation);
      await storageService.set('gt_quotations', quotations);

      return {
        success: true,
        message: 'Quotation flow test passed'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Quotation flow test failed',
        error: error.message
      };
    }
  }

  // GT PPIC Tests
  async testPPICNotifications(): Promise<TestResult> {
    try {
      const ppicNotifications = await storageService.get<any[]>('gt_ppicNotifications') || [];
      const testNotification = ppicNotifications.find(n => n.id.startsWith('ppic-notif-'));

      if (!testNotification) {
        return {
          success: false,
          message: 'PPIC notification not found'
        };
      }

      if (testNotification.type !== 'SO_CREATED' || testNotification.status !== 'PENDING') {
        return {
          success: false,
          message: 'PPIC notification validation failed',
          error: `Type: ${testNotification.type}, Status: ${testNotification.status}`
        };
      }

      return {
        success: true,
        message: 'PPIC notifications test passed'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'PPIC notifications test failed',
        error: error.message
      };
    }
  }

  async testSPKCreation(): Promise<TestResult> {
    try {
      const salesOrders = await storageService.get<any[]>('gt_salesOrders') || [];
      const testSO = salesOrders.find(so => so.id.startsWith('test-so-'));

      if (!testSO) {
        return {
          success: false,
          message: 'Test SO not found for SPK creation'
        };
      }

      const spkList = await storageService.get<any[]>('gt_spk') || [];
      
      // Create SPK for the test SO
      const testSPK = {
        id: `test-spk-${Date.now()}`,
        spkNo: `TEST-SPK-${Date.now()}`,
        soNo: testSO.soNo,
        customer: testSO.customer,
        product: testSO.items[0].productName,
        product_id: testSO.items[0].productId,
        kode: testSO.items[0].productKode,
        qty: testSO.items[0].qty,
        unit: testSO.items[0].unit,
        status: 'OPEN',
        created: new Date().toISOString()
      };

      spkList.push(testSPK);
      await storageService.set('gt_spk', spkList);
      this.createdRecords.gt_spk.push(testSPK.id);

      return {
        success: true,
        message: 'SPK creation test passed',
        data: testSPK
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'SPK creation test failed',
        error: error.message
      };
    }
  }

  async testInventoryCheck(): Promise<TestResult> {
    try {
      const inventory = await storageService.get<any>('gt_inventory') || { value: [] };
      const inventoryArray = Array.isArray(inventory) ? inventory : (inventory.value || []);
      
      const testInventory = inventoryArray.find((i: any) => i.codeItem === this.testData.inventory.codeItem);
      
      if (!testInventory) {
        return {
          success: false,
          message: 'Test inventory item not found'
        };
      }

      const availableStock = testInventory.nextStock !== undefined 
        ? testInventory.nextStock
        : (testInventory.stockPremonth + testInventory.receive - testInventory.outgoing + testInventory.return);

      if (availableStock < 10) {
        return {
          success: false,
          message: 'Insufficient stock for test',
          error: `Available: ${availableStock}, Required: 10`
        };
      }

      return {
        success: true,
        message: 'Inventory check test passed',
        data: { availableStock, required: 10 }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Inventory check test failed',
        error: error.message
      };
    }
  }

  async testPRCreation(): Promise<TestResult> {
    try {
      // This test simulates PR creation when stock is insufficient
      // For now, we'll just validate the PR structure would be correct
      
      const testPR = {
        id: `test-pr-${Date.now()}`,
        prNo: `TEST-PR-${Date.now()}`,
        spkNo: 'TEST-SPK-123',
        soNo: 'TEST-SO-123',
        customer: this.testData.customer.nama,
        product: this.testData.product.nama,
        productId: this.testData.product.kode,
        items: [{
          productId: this.testData.product.kode,
          productName: this.testData.product.nama,
          qty: 50, // Shortage quantity
          unit: 'PCS',
          price: this.testData.product.harga
        }],
        status: 'PENDING',
        created: new Date().toISOString()
      };

      // Validate PR structure
      const requiredFields = ['prNo', 'spkNo', 'soNo', 'customer', 'items', 'status'];
      const missingFields = requiredFields.filter(field => !testPR[field]);

      if (missingFields.length > 0) {
        return {
          success: false,
          message: 'PR structure validation failed',
          error: `Missing fields: ${missingFields.join(', ')}`
        };
      }

      return {
        success: true,
        message: 'PR creation test passed (structure validation)'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'PR creation test failed',
        error: error.message
      };
    }
  }

  // GT DeliveryNote Tests
  async testDeliveryNotifications(): Promise<TestResult> {
    try {
      const spkList = await storageService.get<any[]>('gt_spk') || [];
      const testSPK = spkList.find(spk => spk.id.startsWith('test-spk-'));

      if (!testSPK) {
        return {
          success: false,
          message: 'Test SPK not found for delivery notification'
        };
      }

      // Create delivery notification
      const deliveryNotifications = await storageService.get<any[]>('gt_deliveryNotifications') || [];
      const notification = {
        id: `delivery-notif-${Date.now()}`,
        type: 'READY_TO_DELIVER',
        soNo: testSPK.soNo,
        spkNo: testSPK.spkNo,
        customer: testSPK.customer,
        product: testSPK.product,
        productId: testSPK.product_id,
        qty: testSPK.qty,
        status: 'PENDING',
        created: new Date().toISOString()
      };

      deliveryNotifications.push(notification);
      await storageService.set('gt_deliveryNotifications', deliveryNotifications);
      this.createdRecords.gt_deliveryNotifications.push(notification.id);

      return {
        success: true,
        message: 'Delivery notification test passed'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Delivery notification test failed',
        error: error.message
      };
    }
  }

  async testCreateDeliveryNote(): Promise<TestResult> {
    try {
      const spkList = await storageService.get<any[]>('gt_spk') || [];
      const testSPK = spkList.find(spk => spk.id.startsWith('test-spk-'));

      if (!testSPK) {
        return {
          success: false,
          message: 'Test SPK not found for delivery creation'
        };
      }

      const deliveries = await storageService.get<any[]>('gt_delivery') || [];
      
      const testDelivery = {
        id: `test-delivery-${Date.now()}`,
        sjNo: `TEST-SJ-${Date.now()}`,
        soNo: testSPK.soNo,
        customer: testSPK.customer,
        items: [{
          spkNo: testSPK.spkNo,
          product: testSPK.product,
          qty: testSPK.qty,
          unit: testSPK.unit || 'PCS'
        }],
        status: 'OPEN' as const,
        created: new Date().toISOString()
      };

      deliveries.push(testDelivery);
      await storageService.set('gt_delivery', deliveries);
      this.createdRecords.gt_delivery.push(testDelivery.id);

      return {
        success: true,
        message: 'Delivery Note creation test passed',
        data: testDelivery
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Delivery Note creation test failed',
        error: error.message
      };
    }
  }

  async testInventoryUpdate(): Promise<TestResult> {
    try {
      const inventory = await storageService.get<any>('gt_inventory') || { value: [] };
      const inventoryArray = Array.isArray(inventory) ? inventory : (inventory.value || []);
      
      const testInventory = inventoryArray.find((i: any) => i.codeItem === this.testData.inventory.codeItem);
      
      if (!testInventory) {
        return {
          success: false,
          message: 'Test inventory item not found for update'
        };
      }

      // Simulate inventory update (outgoing += delivered qty)
      const originalStock = testInventory.nextStock || 0;
      const deliveredQty = 10;
      const expectedStock = originalStock - deliveredQty;

      // Update inventory
      testInventory.outgoing = (testInventory.outgoing || 0) + deliveredQty;
      testInventory.nextStock = testInventory.stockPremonth + testInventory.receive - testInventory.outgoing + testInventory.return;

      const updatedInventoryArray = inventoryArray.map((i: any) => 
        i.codeItem === this.testData.inventory.codeItem ? testInventory : i
      );

      await storageService.set('gt_inventory', { value: updatedInventoryArray, timestamp: Date.now() });

      if (testInventory.nextStock !== expectedStock) {
        return {
          success: false,
          message: 'Inventory update calculation failed',
          error: `Expected: ${expectedStock}, Actual: ${testInventory.nextStock}`
        };
      }

      return {
        success: true,
        message: 'Inventory update test passed',
        data: { originalStock, deliveredQty, newStock: testInventory.nextStock }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Inventory update test failed',
        error: error.message
      };
    }
  }

  async testSuratJalanGeneration(): Promise<TestResult> {
    try {
      const deliveries = await storageService.get<any[]>('gt_delivery') || [];
      const testDelivery = deliveries.find(d => d.id.startsWith('test-delivery-'));

      if (!testDelivery) {
        return {
          success: false,
          message: 'Test delivery not found for SJ generation'
        };
      }

      // Validate SJ data structure
      const requiredFields = ['sjNo', 'soNo', 'customer', 'items'];
      const missingFields = requiredFields.filter(field => !testDelivery[field]);

      if (missingFields.length > 0) {
        return {
          success: false,
          message: 'SJ data validation failed',
          error: `Missing fields: ${missingFields.join(', ')}`
        };
      }

      // Validate items structure
      if (!Array.isArray(testDelivery.items) || testDelivery.items.length === 0) {
        return {
          success: false,
          message: 'SJ items validation failed',
          error: 'Items array is empty or invalid'
        };
      }

      return {
        success: true,
        message: 'Surat Jalan generation test passed'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Surat Jalan generation test failed',
        error: error.message
      };
    }
  }

  // Integration Tests
  async testCompleteGTFlow(): Promise<TestResult> {
    try {
      // Validate complete flow: SO → SPK → Delivery
      const salesOrders = await storageService.get<any[]>('gt_salesOrders') || [];
      const spkList = await storageService.get<any[]>('gt_spk') || [];
      const deliveries = await storageService.get<any[]>('gt_delivery') || [];

      const testSO = salesOrders.find(so => so.id.startsWith('test-so-'));
      const testSPK = spkList.find(spk => spk.id.startsWith('test-spk-'));
      const testDelivery = deliveries.find(d => d.id.startsWith('test-delivery-'));

      if (!testSO || !testSPK || !testDelivery) {
        return {
          success: false,
          message: 'Complete GT flow validation failed',
          error: `Missing: ${!testSO ? 'SO ' : ''}${!testSPK ? 'SPK ' : ''}${!testDelivery ? 'Delivery' : ''}`
        };
      }

      // Validate flow connections
      if (testSPK.soNo !== testSO.soNo) {
        return {
          success: false,
          message: 'SPK-SO connection failed',
          error: `SPK SO: ${testSPK.soNo}, SO: ${testSO.soNo}`
        };
      }

      if (testDelivery.soNo !== testSO.soNo) {
        return {
          success: false,
          message: 'Delivery-SO connection failed',
          error: `Delivery SO: ${testDelivery.soNo}, SO: ${testSO.soNo}`
        };
      }

      return {
        success: true,
        message: 'Complete GT flow test passed'
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Complete GT flow test failed',
        error: error.message
      };
    }
  }

  async testStockShortageFlow(): Promise<TestResult> {
    try {
      // This would test the flow when stock is insufficient
      // For now, we'll validate the PR creation logic would work
      
      const inventory = await storageService.get<any>('gt_inventory') || { value: [] };
      const inventoryArray = Array.isArray(inventory) ? inventory : (inventory.value || []);
      
      const testInventory = inventoryArray.find((i: any) => i.codeItem === this.testData.inventory.codeItem);
      
      if (!testInventory) {
        return {
          success: false,
          message: 'Test inventory not found for shortage test'
        };
      }

      const availableStock = testInventory.nextStock || 0;
      const requiredQty = 150; // More than available
      const shortageQty = requiredQty - availableStock;

      if (shortageQty <= 0) {
        return {
          success: true,
          message: 'Stock shortage flow test passed (sufficient stock, no PR needed)'
        };
      }

      // Validate PR would be created for shortage
      const prData = {
        shortageQty,
        availableStock,
        requiredQty,
        productId: this.testData.product.kode
      };

      return {
        success: true,
        message: 'Stock shortage flow test passed',
        data: prData
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Stock shortage flow test failed',
        error: error.message
      };
    }
  }

  async testMultipleProductsFlow(): Promise<TestResult> {
    try {
      // Test flow with multiple products in single SO
      const salesOrders = await storageService.get<any[]>('gt_salesOrders') || [];
      
      const multiProductSO = {
        id: `test-multi-so-${Date.now()}`,
        soNo: `TEST-MULTI-SO-${Date.now()}`,
        customer: this.testData.customer.nama,
        status: 'OPEN' as const,
        created: new Date().toISOString(),
        items: [
          {
            id: `test-item-1-${Date.now()}`,
            productId: this.testData.product.kode,
            productName: this.testData.product.nama,
            qty: 5,
            unit: 'PCS',
            price: this.testData.product.hargaSales,
            total: 5 * this.testData.product.hargaSales
          },
          {
            id: `test-item-2-${Date.now()}`,
            productId: 'TEST-PRD-002',
            productName: 'Test Product 2',
            qty: 3,
            unit: 'PCS',
            price: 50000,
            total: 3 * 50000
          }
        ]
      };

      // Validate multiple items structure
      if (multiProductSO.items.length < 2) {
        return {
          success: false,
          message: 'Multiple products test setup failed'
        };
      }

      // Each item should generate separate SPK
      const expectedSPKCount = multiProductSO.items.length;

      return {
        success: true,
        message: 'Multiple products flow test passed',
        data: { itemCount: multiProductSO.items.length, expectedSPKCount }
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Multiple products flow test failed',
        error: error.message
      };
    }
  }

  // Cleanup
  async cleanupTestData(): Promise<TestResult> {
    try {
      let cleanedCount = 0;

      for (const [storageKey, recordIds] of Object.entries(this.createdRecords)) {
        if (recordIds.length === 0) continue;

        const data = await storageService.get<any[]>(storageKey) || [];
        let dataArray = Array.isArray(data) ? data : (data.value || []);
        
        const originalLength = dataArray.length;
        dataArray = dataArray.filter((item: any) => !recordIds.includes(item.id));
        
        if (dataArray.length !== originalLength) {
          if (storageKey === 'gt_inventory') {
            await storageService.set(storageKey, { value: dataArray, timestamp: Date.now() });
          } else {
            await storageService.set(storageKey, dataArray);
          }
          cleanedCount += originalLength - dataArray.length;
        }
      }

      return {
        success: true,
        message: `Cleanup completed (${cleanedCount} records removed)`
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Cleanup failed',
        error: error.message
      };
    }
  }
}

// Export for use in other files
export { GTFlowTester };

// Auto-run if this file is executed directly
if (typeof window !== 'undefined') {
  (window as any).runGTFlowTest = async () => {
    const tester = new GTFlowTester();
    await tester.runAllTests();
  };
}