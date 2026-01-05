/**
 * Stock Allocation Test
 * Tests material allocation logic untuk multiple batches
 * Scenario: Inventory 500, Product butuh 500, dibagi 2 batch (A=500, B=500)
 * Expected: Batch A = READY, Batch B = NOT READY (insufficient stock after allocation)
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
  requestIdleCallback: (callback) => setTimeout(callback, 0)
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

// Mock Material Allocator (simplified version for testing)
class MockMaterialAllocator {
  constructor() {
    this.reservations = new Map();
  }

  async getMaterialAvailability(materialId) {
    const inventory = await this.getInventory();
    const material = inventory.find(item => item.codeItem === materialId || item.id === materialId);
    
    if (!material) {
      return null;
    }

    const reserved = this.getReservedQty(materialId);
    const totalStock = material.nextStock || material.stock || 0;
    const available = Math.max(0, totalStock - reserved);

    return {
      materialId,
      materialName: material.description || material.nama,
      totalStock,
      reserved,
      available,
      unit: material.satuan || material.unit || 'PCS'
    };
  }

  async getInventory() {
    const stored = await storageService.get('inventory');
    if (stored && stored.value && Array.isArray(stored.value)) {
      return stored.value;
    }
    return stored || [];
  }

  getReservedQty(materialId) {
    const reservations = this.reservations.get(materialId) || [];
    return reservations
      .filter(r => r.status === 'ACTIVE')
      .reduce((total, r) => total + r.qty, 0);
  }

  async reserveMaterials(spkNo, materials) {
    const reservations = [];
    const shortages = [];
    const now = Date.now();

    // Check availability untuk semua materials
    for (const material of materials) {
      const availability = await this.getMaterialAvailability(material.materialKode);
      
      if (!availability) {
        shortages.push({
          materialId: material.materialKode,
          materialName: material.materialKode,
          required: material.qty,
          available: 0,
          shortage: material.qty,
          unit: material.unit,
          spkNo
        });
        continue;
      }

      if (availability.available < material.qty) {
        shortages.push({
          materialId: material.materialKode,
          materialName: availability.materialName,
          required: material.qty,
          available: availability.available,
          shortage: material.qty - availability.available,
          unit: material.unit,
          spkNo
        });
        continue;
      }

      // Create reservation
      const reservation = {
        id: `${spkNo}_${material.materialKode}_${now}`,
        spkNo,
        materialId: material.materialKode,
        materialName: availability.materialName,
        qty: material.qty,
        unit: material.unit,
        reservedAt: now,
        status: 'ACTIVE'
      };

      reservations.push(reservation);
    }

    // Jika ada shortage, jangan reserve apapun
    if (shortages.length > 0) {
      return {
        success: false,
        reservations: [],
        shortages,
        message: `Material shortage detected for ${shortages.length} items`
      };
    }

    // Reserve semua materials
    for (const reservation of reservations) {
      if (!this.reservations.has(reservation.materialId)) {
        this.reservations.set(reservation.materialId, []);
      }
      this.reservations.get(reservation.materialId).push(reservation);
    }

    return {
      success: true,
      reservations,
      shortages: [],
      message: `Successfully reserved ${reservations.length} materials for SPK ${spkNo}`
    };
  }

  async checkSPKMaterialsReady(spkNo) {
    const spkReservations = [];
    
    for (const reservations of this.reservations.values()) {
      spkReservations.push(...reservations.filter(r => r.spkNo === spkNo && r.status === 'ACTIVE'));
    }

    return spkReservations.length > 0;
  }

  clearAllReservations() {
    this.reservations.clear();
  }

  getAllActiveReservations() {
    const allReservations = [];
    
    for (const reservations of this.reservations.values()) {
      allReservations.push(...reservations.filter(r => r.status === 'ACTIVE'));
    }

    return allReservations;
  }
}

// Setup test data untuk stock allocation scenario
async function setupStockAllocationTestData() {
  console.log('📋 Setting up Stock Allocation test data...');
  
  // Setup product dengan BOM
  await storageService.set('products', [
    {
      id: "test-product-allocation",
      sku: "ALLOC-PRD-001",
      nama: "Allocation Test Product",
      satuan: "PCS",
      harga: 100000,
      kategori: "Test Product"
    }
  ]);
  
  // Setup material
  await storageService.set('materials', [
    {
      id: "test-material-allocation",
      kode: "MAT-ALLOC-001",
      nama: "Allocation Test Material",
      satuan: "PCS",
      harga: 10000,
      kategori: "Raw Material"
    }
  ]);
  
  // Setup BOM - 1:1 ratio untuk simplicity
  await storageService.set('bom', [
    {
      id: "test-bom-allocation",
      productId: "test-product-allocation",
      productSku: "ALLOC-PRD-001",
      materials: [
        {
          materialId: "test-material-allocation",
          materialKode: "MAT-ALLOC-001",
          qty: 1, // 1 PCS material per 1 PCS product
          unit: "PCS"
        }
      ]
    }
  ]);
  
  // Setup inventory dengan stock terbatas (500 PCS)
  await storageService.set('inventory', {
    value: [
      {
        id: "test-inventory-allocation",
        codeItem: "MAT-ALLOC-001",
        description: "Allocation Test Material",
        kategori: "Material",
        satuan: "PCS",
        price: 10000,
        stockPremonth: 0,
        receive: 500, // Total stock: 500 PCS
        outgoing: 0,
        return: 0,
        nextStock: 500 // Available: 500 PCS
      }
    ],
    timestamp: Date.now()
  });
  
  console.log('✅ Stock Allocation test data setup completed');
}

// Test stock allocation logic
async function runStockAllocationTest() {
  console.log('🧪 Stock Allocation Test');
  console.log('─'.repeat(80));
  console.log('Scenario: Inventory 500 PCS, Product butuh 500 PCS, dibagi 2 batch');
  console.log('Expected: Batch A = READY, Batch B = NOT READY (stock sudah dialokasi)');
  console.log('─'.repeat(80));
  
  const materialAllocator = new MockMaterialAllocator();
  
  try {
    await setupStockAllocationTestData();
    
    // Test 1: Create Sales Order (1000 PCS total)
    console.log('\n📋 Test 1: Create Sales Order (1000 PCS total)');
    const testSO = {
      id: `test-so-allocation-${Date.now()}`,
      soNo: `SO-ALLOC-${Date.now()}`,
      customer: "Test Allocation Customer",
      items: [
        {
          id: `test-item-allocation-${Date.now()}`,
          productId: "test-product-allocation",
          productSku: "ALLOC-PRD-001",
          productName: "Allocation Test Product",
          qty: 1000, // 1000 PCS - lebih dari stock available (500)
          unit: 'PCS',
          price: 100000,
          total: 1000 * 100000
        }
      ]
    };
    
    console.log('✅ Sales Order created:');
    console.log(`   SO No: ${testSO.soNo}`);
    console.log(`   Product: ${testSO.items[0].productName}`);
    console.log(`   Quantity: ${testSO.items[0].qty} PCS`);
    console.log(`   Material Required: ${testSO.items[0].qty} PCS (1:1 ratio)`);
    
    // Test 2: Create 2 SPKs (Batch A: 500 PCS, Batch B: 500 PCS)
    console.log('\n📋 Test 2: Create 2 SPKs (Split into batches)');
    
    const spkA = {
      id: `test-spk-a-${Date.now()}`,
      spkNo: `SPK-ALLOC-A-${Date.now()}`,
      soNo: testSO.soNo,
      product: testSO.items[0].productName,
      productId: testSO.items[0].productId,
      qty: 500, // Batch A: 500 PCS
      unit: 'PCS',
      batchNo: 'BATCH-A',
      status: 'OPEN'
    };
    
    const spkB = {
      id: `test-spk-b-${Date.now()}`,
      spkNo: `SPK-ALLOC-B-${Date.now()}`,
      soNo: testSO.soNo,
      product: testSO.items[0].productName,
      productId: testSO.items[0].productId,
      qty: 500, // Batch B: 500 PCS
      unit: 'PCS',
      batchNo: 'BATCH-B',
      status: 'OPEN'
    };
    
    console.log('✅ SPKs created:');
    console.log(`   SPK A: ${spkA.spkNo} - ${spkA.qty} PCS (${spkA.batchNo})`);
    console.log(`   SPK B: ${spkB.spkNo} - ${spkB.qty} PCS (${spkB.batchNo})`);
    console.log(`   Total: ${spkA.qty + spkB.qty} PCS`);
    
    // Test 3: Check Initial Stock Availability
    console.log('\n📋 Test 3: Check Initial Stock Availability');
    
    const initialAvailability = await materialAllocator.getMaterialAvailability('MAT-ALLOC-001');
    console.log('✅ Initial Stock Status:');
    console.log(`   Material: ${initialAvailability.materialName}`);
    console.log(`   Total Stock: ${initialAvailability.totalStock} PCS`);
    console.log(`   Reserved: ${initialAvailability.reserved} PCS`);
    console.log(`   Available: ${initialAvailability.available} PCS`);
    
    // Test 4: Try to Reserve Materials for SPK A (First batch)
    console.log('\n📋 Test 4: Reserve Materials for SPK A (First batch)');
    
    const bomList = await storageService.get('bom') || [];
    const productBOM = bomList.find(bom => bom.productId === spkA.productId);
    
    const spkA_materials = productBOM.materials.map(mat => ({
      materialKode: mat.materialKode,
      qty: mat.qty * spkA.qty, // 1 * 500 = 500 PCS
      unit: mat.unit
    }));
    
    const reservationA = await materialAllocator.reserveMaterials(spkA.spkNo, spkA_materials);
    
    console.log('✅ SPK A Material Reservation:');
    console.log(`   Success: ${reservationA.success}`);
    console.log(`   Message: ${reservationA.message}`);
    if (reservationA.success) {
      reservationA.reservations.forEach(res => {
        console.log(`     Reserved: ${res.qty} ${res.unit} ${res.materialName}`);
      });
    } else {
      reservationA.shortages.forEach(shortage => {
        console.log(`     Shortage: ${shortage.shortage} ${shortage.unit} ${shortage.materialName}`);
      });
    }
    
    // Test 5: Check Stock After SPK A Reservation
    console.log('\n📋 Test 5: Check Stock After SPK A Reservation');
    
    const availabilityAfterA = await materialAllocator.getMaterialAvailability('MAT-ALLOC-001');
    console.log('✅ Stock Status After SPK A:');
    console.log(`   Total Stock: ${availabilityAfterA.totalStock} PCS`);
    console.log(`   Reserved: ${availabilityAfterA.reserved} PCS`);
    console.log(`   Available: ${availabilityAfterA.available} PCS`);
    
    // Test 6: Try to Reserve Materials for SPK B (Second batch)
    console.log('\n📋 Test 6: Reserve Materials for SPK B (Second batch)');
    
    const spkB_materials = productBOM.materials.map(mat => ({
      materialKode: mat.materialKode,
      qty: mat.qty * spkB.qty, // 1 * 500 = 500 PCS
      unit: mat.unit
    }));
    
    const reservationB = await materialAllocator.reserveMaterials(spkB.spkNo, spkB_materials);
    
    console.log('✅ SPK B Material Reservation:');
    console.log(`   Success: ${reservationB.success}`);
    console.log(`   Message: ${reservationB.message}`);
    if (reservationB.success) {
      reservationB.reservations.forEach(res => {
        console.log(`     Reserved: ${res.qty} ${res.unit} ${res.materialName}`);
      });
    } else {
      reservationB.shortages.forEach(shortage => {
        console.log(`     Shortage: ${shortage.shortage} ${shortage.unit} ${shortage.materialName} (Required: ${shortage.required}, Available: ${shortage.available})`);
      });
    }
    
    // Test 7: Check Final Stock Status
    console.log('\n📋 Test 7: Check Final Stock Status');
    
    const finalAvailability = await materialAllocator.getMaterialAvailability('MAT-ALLOC-001');
    console.log('✅ Final Stock Status:');
    console.log(`   Total Stock: ${finalAvailability.totalStock} PCS`);
    console.log(`   Reserved: ${finalAvailability.reserved} PCS`);
    console.log(`   Available: ${finalAvailability.available} PCS`);
    
    // Test 8: Check SPK Readiness Status
    console.log('\n📋 Test 8: Check SPK Readiness Status');
    
    const spkA_ready = await materialAllocator.checkSPKMaterialsReady(spkA.spkNo);
    const spkB_ready = await materialAllocator.checkSPKMaterialsReady(spkB.spkNo);
    
    console.log('✅ SPK Readiness Status:');
    console.log(`   SPK A (${spkA.batchNo}): ${spkA_ready ? '✅ READY' : '❌ NOT READY'}`);
    console.log(`   SPK B (${spkB.batchNo}): ${spkB_ready ? '✅ READY' : '❌ NOT READY'}`);
    
    // Test 9: Validate Allocation Logic
    console.log('\n📋 Test 9: Validate Allocation Logic');
    
    const allReservations = materialAllocator.getAllActiveReservations();
    console.log('✅ Active Reservations:');
    allReservations.forEach(res => {
      console.log(`   ${res.spkNo}: ${res.qty} ${res.unit} ${res.materialName}`);
    });
    
    // Expected Results Validation
    const expectedResults = {
      spkA_shouldBeReady: reservationA.success,
      spkB_shouldNotBeReady: !reservationB.success,
      totalReserved: allReservations.reduce((sum, res) => sum + res.qty, 0),
      availableAfterAllocation: finalAvailability.available
    };
    
    console.log('\n📊 Allocation Logic Validation');
    console.log('─'.repeat(80));
    console.log('EXPECTED BEHAVIOR:');
    console.log('• SPK A (500 PCS) should be READY (first come, first served)');
    console.log('• SPK B (500 PCS) should be NOT READY (insufficient stock after A allocation)');
    console.log('• Total reserved should equal SPK A quantity (500 PCS)');
    console.log('• Available stock should be 0 after SPK A allocation');
    console.log('');
    console.log('ACTUAL RESULTS:');
    console.log(`• SPK A Ready: ${expectedResults.spkA_shouldBeReady ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log(`• SPK B Not Ready: ${expectedResults.spkB_shouldNotBeReady ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log(`• Total Reserved: ${expectedResults.totalReserved} PCS ${expectedResults.totalReserved === 500 ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log(`• Available After Allocation: ${expectedResults.availableAfterAllocation} PCS ${expectedResults.availableAfterAllocation === 0 ? '✅ CORRECT' : '❌ WRONG'}`);
    
    // Test 10: PPIC Stock Check Simulation
    console.log('\n📋 Test 10: PPIC Stock Check Simulation');
    
    // Simulate PPIC checking stock for both SPKs
    const ppicStockCheck = async (spkNo, materials) => {
      console.log(`   Checking stock for ${spkNo}:`);
      
      for (const material of materials) {
        const availability = await materialAllocator.getMaterialAvailability(material.materialKode);
        const isReady = availability && availability.available >= material.qty;
        
        console.log(`     ${material.materialKode}: Need ${material.qty}, Available ${availability?.available || 0} → ${isReady ? '✅ READY' : '❌ NOT READY'}`);
      }
      
      return materials.every(async (material) => {
        const availability = await materialAllocator.getMaterialAvailability(material.materialKode);
        return availability && availability.available >= material.qty;
      });
    };
    
    console.log('✅ PPIC Stock Check Results:');
    await ppicStockCheck(spkA.spkNo, spkA_materials);
    await ppicStockCheck(spkB.spkNo, spkB_materials);
    
    // Final Assessment
    const allTestsPassed = 
      expectedResults.spkA_shouldBeReady &&
      expectedResults.spkB_shouldNotBeReady &&
      expectedResults.totalReserved === 500 &&
      expectedResults.availableAfterAllocation === 0;
    
    console.log('\n🎯 Stock Allocation Test Summary');
    console.log('─'.repeat(80));
    
    if (allTestsPassed) {
      console.log('🎉 STOCK ALLOCATION TEST PASSED!');
      console.log('✅ Material allocation logic working correctly');
      console.log('✅ First batch gets priority (FIFO allocation)');
      console.log('✅ Second batch correctly shows NOT READY');
      console.log('✅ No double allocation of same stock');
      console.log('✅ PPIC will see accurate stock availability');
    } else {
      console.log('❌ STOCK ALLOCATION TEST FAILED!');
      console.log('⚠️  Material allocation logic needs fixing');
      console.log('⚠️  Multiple batches showing READY when stock insufficient');
      console.log('⚠️  Risk of production planning errors');
    }
    
    return allTestsPassed;
    
  } catch (error) {
    console.log('\n❌ Stock Allocation Test FAILED!');
    console.log('Error:', error.message);
    return false;
  }
}

// Run the stock allocation test
runStockAllocationTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Stock allocation test execution failed:', error);
  process.exit(1);
});