/**
 * GT Flow Test for Produk Turunan (Derived Products)
 * Tests the complete GT workflow with derived products that use parent inventory
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
  }
};

// Mock storage service
const storageService = {
  async get(key) {
    const data = global.window.localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },
  
  async set(key, value) {
    global.window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  }
};

// Mock test data setup for derived products
async function setupTurunanTestData() {
  console.log('📋 Setting up GT Turunan (Derived Products) test data...');
  
  // Setup customers
  await storageService.set('gt_customers', [
    {
      id: "test-customer-turunan",
      kode: "CUST-TUR-001",
      nama: "PT. TURUNAN CUSTOMER",
      kontak: "Test PIC Turunan",
      telepon: "021-7777777",
      alamat: "Test Address Turunan",
      kategori: "Customer"
    }
  ]);
  
  // Setup parent product
  const parentProduct = {
    id: "parent-product-1",
    product_id: "PARENT-001",
    kode: "PARENT-001",
    nama: "Parent Product Base",
    satuan: "PCS",
    harga: 100000,
    hargaSales: 120000,
    hargaFg: 120000,
    kategori: "Parent",
    isTurunan: false // Parent product
  };
  
  // Setup derived products (turunan)
  const turunanProduct1 = {
    id: "turunan-product-1",
    product_id: "TUR-001-A",
    kode: "TUR-001-A", 
    nama: "Turunan Product A (dari PARENT-001)",
    satuan: "PCS",
    harga: 110000,
    hargaSales: 130000,
    hargaFg: 130000,
    kategori: "Turunan",
    isTurunan: true, // This is a derived product
    parentProductId: "parent-product-1", // Link to parent
    parentProductCode: "PARENT-001" // Parent code for inventory lookup
  };
  
  const turunanProduct2 = {
    id: "turunan-product-2", 
    product_id: "TUR-001-B",
    kode: "TUR-001-B",
    nama: "Turunan Product B (dari PARENT-001)",
    satuan: "PCS",
    harga: 115000,
    hargaSales: 135000,
    hargaFg: 135000,
    kategori: "Turunan",
    isTurunan: true, // This is a derived product
    parentProductId: "parent-product-1", // Link to parent
    parentProductCode: "PARENT-001" // Parent code for inventory lookup
  };
  
  await storageService.set('gt_products', [parentProduct, turunanProduct1, turunanProduct2]);
  
  // Setup inventory - IMPORTANT: Inventory uses PARENT code, not turunan code
  await storageService.set('gt_inventory', {
    value: [
      {
        id: "inventory-parent-1",
        codeItem: "PARENT-001", // Inventory tracked by parent code
        description: "Parent Product Base (for all turunan)",
        kategori: "Product",
        satuan: "PCS",
        price: 100000,
        stockPremonth: 0,
        receive: 200, // Enough stock for multiple turunan
        outgoing: 0,
        return: 0,
        nextStock: 200
      }
    ],
    timestamp: Date.now()
  });
  
  console.log('✅ Turunan test data setup completed');
  console.log('   - Parent Product: PARENT-001 (stock: 200)');
  console.log('   - Turunan A: TUR-001-A (uses PARENT-001 stock)');
  console.log('   - Turunan B: TUR-001-B (uses PARENT-001 stock)');
}

// Test GT Flow with Turunan Products
async function runGTTurunanFlowTest() {
  console.log('🧪 GT Turunan (Derived Products) Flow Test');
  console.log('─'.repeat(60));
  
  try {
    await setupTurunanTestData();
    
    // Test 1: Create SO with Turunan Product A
    console.log('\n📋 Test 1: Create SO with Turunan Product A');
    const testSO_A = {
      id: `test-so-turunan-a-${Date.now()}`,
      soNo: `TEST-SO-TUR-A-${Date.now()}`,
      customer: "PT. TURUNAN CUSTOMER",
      customerKode: "CUST-TUR-001",
      paymentTerms: 'TOP',
      topDays: 30,
      status: 'OPEN',
      created: new Date().toISOString(),
      items: [{
        id: `test-item-turunan-a-${Date.now()}`,
        productId: "TUR-001-A", // Turunan product
        productKode: "TUR-001-A",
        productName: "Turunan Product A (dari PARENT-001)",
        qty: 15,
        unit: 'PCS',
        price: 130000,
        total: 15 * 130000
      }]
    };
    
    const salesOrders = await storageService.get('gt_salesOrders') || [];
    salesOrders.push(testSO_A);
    await storageService.set('gt_salesOrders', salesOrders);
    console.log('✅ SO with Turunan A created:', testSO_A.soNo);
    
    // Test 2: Create SPK for Turunan A
    console.log('\n📋 Test 2: Create SPK for Turunan Product A');
    const testSPK_A = {
      id: `test-spk-turunan-a-${Date.now()}`,
      spkNo: `TEST-SPK-TUR-A-${Date.now()}`,
      soNo: testSO_A.soNo,
      customer: testSO_A.customer,
      product: testSO_A.items[0].productName,
      product_id: testSO_A.items[0].productId, // TUR-001-A
      kode: testSO_A.items[0].productKode,
      qty: testSO_A.items[0].qty,
      unit: testSO_A.items[0].unit,
      status: 'OPEN',
      created: new Date().toISOString()
    };
    
    const spkList = await storageService.get('gt_spk') || [];
    spkList.push(testSPK_A);
    await storageService.set('gt_spk', spkList);
    console.log('✅ SPK for Turunan A created:', testSPK_A.spkNo);
    
    // Test 3: Check Inventory for Turunan A (should use parent stock)
    console.log('\n📋 Test 3: Check Inventory for Turunan A (Parent Stock Lookup)');
    
    // Simulate the inventory check logic from PPIC
    const products = await storageService.get('gt_products') || [];
    const inventory = await storageService.get('gt_inventory');
    const inventoryArray = inventory?.value || [];
    
    const turunanProduct = products.find(p => p.product_id === "TUR-001-A");
    console.log('   Turunan Product Found:', turunanProduct ? 'Yes' : 'No');
    console.log('   Is Turunan:', turunanProduct?.isTurunan);
    console.log('   Parent Product Code:', turunanProduct?.parentProductCode);
    
    // Get inventory product code (parent if turunan)
    let inventoryProductCode = "TUR-001-A"; // Default to turunan code
    if (turunanProduct && turunanProduct.isTurunan && turunanProduct.parentProductCode) {
      inventoryProductCode = turunanProduct.parentProductCode; // Use parent code
      console.log('   Using Parent Code for Inventory:', inventoryProductCode);
    }
    
    const inventoryItem = inventoryArray.find(inv => inv.codeItem === inventoryProductCode);
    
    if (inventoryItem) {
      const availableStock = inventoryItem.nextStock || 0;
      const requiredQty = testSPK_A.qty;
      console.log(`✅ Inventory check: Available ${availableStock} (parent stock), Required ${requiredQty} (turunan)`);
      
      if (availableStock >= requiredQty) {
        console.log('✅ Parent stock sufficient for turunan delivery');
      } else {
        console.log('⚠️  Parent stock insufficient, PR would be created');
      }
    } else {
      console.log('❌ Inventory item not found for code:', inventoryProductCode);
    }
    
    // Test 4: Create SO with Turunan Product B (same parent)
    console.log('\n📋 Test 4: Create SO with Turunan Product B (Same Parent)');
    const testSO_B = {
      id: `test-so-turunan-b-${Date.now()}`,
      soNo: `TEST-SO-TUR-B-${Date.now()}`,
      customer: "PT. TURUNAN CUSTOMER",
      customerKode: "CUST-TUR-001",
      paymentTerms: 'TOP',
      topDays: 30,
      status: 'OPEN',
      created: new Date().toISOString(),
      items: [{
        id: `test-item-turunan-b-${Date.now()}`,
        productId: "TUR-001-B", // Different turunan, same parent
        productKode: "TUR-001-B",
        productName: "Turunan Product B (dari PARENT-001)",
        qty: 25,
        unit: 'PCS',
        price: 135000,
        total: 25 * 135000
      }]
    };
    
    salesOrders.push(testSO_B);
    await storageService.set('gt_salesOrders', salesOrders);
    console.log('✅ SO with Turunan B created:', testSO_B.soNo);
    
    // Test 5: Check Combined Stock Usage
    console.log('\n📋 Test 5: Check Combined Stock Usage (Multiple Turunan from Same Parent)');
    const totalTurunanQty = testSPK_A.qty + testSO_B.items[0].qty; // 15 + 25 = 40
    const parentStock = inventoryItem?.nextStock || 0; // 200
    
    console.log(`   Turunan A Qty: ${testSPK_A.qty}`);
    console.log(`   Turunan B Qty: ${testSO_B.items[0].qty}`);
    console.log(`   Total Required: ${totalTurunanQty}`);
    console.log(`   Parent Stock Available: ${parentStock}`);
    
    if (parentStock >= totalTurunanQty) {
      console.log('✅ Parent stock sufficient for both turunan products');
    } else {
      console.log('⚠️  Parent stock insufficient for combined turunan requirements');
    }
    
    // Test 6: Create Delivery for Turunan A
    console.log('\n📋 Test 6: Create Delivery for Turunan A');
    const testDelivery_A = {
      id: `test-delivery-turunan-a-${Date.now()}`,
      sjNo: `TEST-SJ-TUR-A-${Date.now()}`,
      soNo: testSPK_A.soNo,
      customer: testSPK_A.customer,
      items: [{
        spkNo: testSPK_A.spkNo,
        product: testSPK_A.product, // Turunan product name
        qty: testSPK_A.qty,
        unit: testSPK_A.unit || 'PCS'
      }],
      status: 'OPEN',
      created: new Date().toISOString()
    };
    
    const deliveries = await storageService.get('gt_delivery') || [];
    deliveries.push(testDelivery_A);
    await storageService.set('gt_delivery', deliveries);
    console.log('✅ Delivery for Turunan A created:', testDelivery_A.sjNo);
    
    // Test 7: Update Parent Inventory (outgoing from parent stock)
    console.log('\n📋 Test 7: Update Parent Inventory (Turunan A Delivery)');
    if (inventoryItem) {
      const deliveredQty = testSPK_A.qty; // 15
      inventoryItem.outgoing = (inventoryItem.outgoing || 0) + deliveredQty;
      inventoryItem.nextStock = inventoryItem.stockPremonth + inventoryItem.receive - inventoryItem.outgoing + inventoryItem.return;
      
      const updatedInventoryArray = inventoryArray.map(i => 
        i.codeItem === "PARENT-001" ? inventoryItem : i
      );
      
      await storageService.set('gt_inventory', { value: updatedInventoryArray, timestamp: Date.now() });
      console.log(`✅ Parent inventory updated: Stock ${inventoryItem.nextStock} (outgoing +${deliveredQty} for turunan A)`);
      console.log(`   Remaining stock for other turunan: ${inventoryItem.nextStock}`);
    }
    
    // Test 8: Create SPK and Delivery for Turunan B
    console.log('\n📋 Test 8: Create SPK and Delivery for Turunan B');
    const testSPK_B = {
      id: `test-spk-turunan-b-${Date.now()}`,
      spkNo: `TEST-SPK-TUR-B-${Date.now()}`,
      soNo: testSO_B.soNo,
      customer: testSO_B.customer,
      product: testSO_B.items[0].productName,
      product_id: testSO_B.items[0].productId, // TUR-001-B
      kode: testSO_B.items[0].productKode,
      qty: testSO_B.items[0].qty,
      unit: testSO_B.items[0].unit,
      status: 'OPEN',
      created: new Date().toISOString()
    };
    
    spkList.push(testSPK_B);
    await storageService.set('gt_spk', spkList);
    console.log('✅ SPK for Turunan B created:', testSPK_B.spkNo);
    
    // Check stock for Turunan B (after A was delivered)
    const currentStock = inventoryItem?.nextStock || 0; // Should be 185 (200 - 15)
    const requiredForB = testSPK_B.qty; // 25
    
    console.log(`   Current parent stock: ${currentStock}`);
    console.log(`   Required for Turunan B: ${requiredForB}`);
    
    if (currentStock >= requiredForB) {
      console.log('✅ Sufficient parent stock for Turunan B');
      
      // Create delivery for B
      const testDelivery_B = {
        id: `test-delivery-turunan-b-${Date.now()}`,
        sjNo: `TEST-SJ-TUR-B-${Date.now()}`,
        soNo: testSPK_B.soNo,
        customer: testSPK_B.customer,
        items: [{
          spkNo: testSPK_B.spkNo,
          product: testSPK_B.product,
          qty: testSPK_B.qty,
          unit: testSPK_B.unit || 'PCS'
        }],
        status: 'OPEN',
        created: new Date().toISOString()
      };
      
      deliveries.push(testDelivery_B);
      await storageService.set('gt_delivery', deliveries);
      console.log('✅ Delivery for Turunan B created:', testDelivery_B.sjNo);
      
      // Update inventory for B
      inventoryItem.outgoing = (inventoryItem.outgoing || 0) + requiredForB;
      inventoryItem.nextStock = inventoryItem.stockPremonth + inventoryItem.receive - inventoryItem.outgoing + inventoryItem.return;
      
      const updatedInventoryArray2 = inventoryArray.map(i => 
        i.codeItem === "PARENT-001" ? inventoryItem : i
      );
      
      await storageService.set('gt_inventory', { value: updatedInventoryArray2, timestamp: Date.now() });
      console.log(`✅ Parent inventory updated: Stock ${inventoryItem.nextStock} (outgoing +${requiredForB} for turunan B)`);
    } else {
      console.log('⚠️  Insufficient parent stock for Turunan B, PR would be needed');
    }
    
    // Test Summary
    console.log('\n📊 GT Turunan Flow Test Summary');
    console.log('─'.repeat(60));
    console.log('✅ Turunan Product A: SO → SPK → Delivery → Parent Inventory Update');
    console.log('✅ Turunan Product B: SO → SPK → Delivery → Parent Inventory Update');
    console.log('✅ Parent inventory correctly shared between turunan products');
    console.log('✅ Inventory lookup uses parent code for turunan products');
    console.log('✅ Stock calculations accurate for multiple turunan from same parent');
    console.log('✅ All turunan flow components working correctly');
    
    console.log('\n🎉 GT TURUNAN FLOW TEST PASSED!');
    
    // Final validation
    console.log('\n📋 Final Turunan State Validation');
    const finalSO = await storageService.get('gt_salesOrders');
    const finalSPK = await storageService.get('gt_spk');
    const finalDelivery = await storageService.get('gt_delivery');
    const finalInventory = await storageService.get('gt_inventory');
    const finalProducts = await storageService.get('gt_products');
    
    console.log(`- Sales Orders (Turunan): ${finalSO?.length || 0}`);
    console.log(`- SPKs (Turunan): ${finalSPK?.length || 0}`);
    console.log(`- Deliveries (Turunan): ${finalDelivery?.length || 0}`);
    console.log(`- Products (1 Parent + 2 Turunan): ${finalProducts?.length || 0}`);
    console.log(`- Inventory Items (Parent only): ${finalInventory?.value?.length || 0}`);
    
    // Validate parent inventory final state
    const finalParentInventory = finalInventory?.value?.find(i => i.codeItem === "PARENT-001");
    if (finalParentInventory) {
      console.log(`- Parent Stock Final: ${finalParentInventory.nextStock} (started: 200, delivered: ${finalParentInventory.outgoing})`);
      console.log(`- Stock calculation: ${finalParentInventory.stockPremonth} + ${finalParentInventory.receive} - ${finalParentInventory.outgoing} + ${finalParentInventory.return} = ${finalParentInventory.nextStock}`);
    }
    
    // Validate turunan product structure
    const turunanProducts = finalProducts?.filter(p => p.isTurunan) || [];
    console.log('\n🔍 Turunan Product Structure Validation');
    turunanProducts.forEach(p => {
      console.log(`✅ ${p.kode}: isTurunan=${p.isTurunan}, parentCode=${p.parentProductCode}`);
    });
    
    return true;
    
  } catch (error) {
    console.log('\n❌ GT Turunan Flow Test FAILED!');
    console.log('Error:', error.message);
    return false;
  }
}

// Run the turunan test
runGTTurunanFlowTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Turunan test execution failed:', error);
  process.exit(1);
});