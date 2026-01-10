/**
 * Stock Allocation Fix Test
 * Tests integration of material allocator dengan PPIC stock checking
 * Fix: validateMaterialReadiness harus consider material reservations
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

// Enhanced Material Allocator with proper integration
class EnhancedMaterialAllocator {
  constructor() {
    this.reservations = new Map();
  }

  async getMaterialAvailability(materialId) {
    const inventory = await this.getInventory();
    
    // Try multiple material ID formats
    const normalizedId = materialId.toLowerCase();
    const material = inventory.find(item => {
      const itemCode = (item.codeItem || item.id || '').toLowerCase();
      return itemCode === normalizedId || 
             itemCode === materialId ||
             item.codeItem === materialId ||
             item.id === materialId;
    });
    
    if (!material) {
      console.log(`[MaterialAllocator] Material not found: ${materialId}, available items:`, 
        inventory.map(i => i.codeItem || i.id));
      return null;
    }

    const reserved = this.getReservedQty(materialId);
    const totalStock = material.nextStock || material.stock || 0;
    const available = Math.max(0, totalStock - reserved);

    console.log(`[MaterialAllocator] ${materialId}: Total=${totalStock}, Reserved=${reserved}, Available=${available}`);

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
    // Normalize material ID untuk consistent lookup
    const normalizedId = materialId.toUpperCase();
    
    let totalReserved = 0;
    
    // Check all reservations dengan case-insensitive matching
    for (const [key, reservations] of this.reservations) {
      if (key.toUpperCase() === normalizedId) {
        totalReserved += reservations
          .filter(r => r.status === 'ACTIVE')
          .reduce((total, r) => total + r.qty, 0);
      }
    }
    
    console.log(`[MaterialAllocator] Reserved qty for ${materialId}: ${totalReserved} (normalized: ${normalizedId})`);
    
    return totalReserved;
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
      const normalizedKey = reservation.materialId.toUpperCase();
      if (!this.reservations.has(normalizedKey)) {
        this.reservations.set(normalizedKey, []);
      }
      this.reservations.get(normalizedKey).push(reservation);
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

    console.log(`[MaterialAllocator] SPK ${spkNo} has ${spkReservations.length} active reservations`);
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

// Enhanced validateMaterialReadiness yang consider reservations
async function enhancedValidateMaterialReadiness(notif, batchQty, materialAllocator) {
  try {
    const inventoryItems = await storageService.get('inventory') || [];
    const bomList = await storageService.get('bom') || [];
    
    const normalizeKey = (value) => (value ?? '').toString().trim().toLowerCase();
    const toNumber = (value) => {
      if (typeof value === 'number' && !Number.isNaN(value)) return value;
      const parsed = parseFloat(value);
      return Number.isNaN(parsed) ? 0 : parsed;
    };
    
    const productKey = normalizeKey(notif.productId || notif.product || notif.productCode);
    const qtyNeeded = batchQty !== undefined ? batchQty : toNumber(notif.qty || notif.target || notif.targetQty);
    
    if (!productKey || qtyNeeded <= 0) {
      console.log(`[Enhanced Validation] ${notif.spkNo}: Invalid productKey or qtyNeeded`, { productKey, qtyNeeded });
      return false;
    }
    
    // Find BOM for product
    const productBOM = bomList.find(bom => 
      normalizeKey(bom.productId || bom.product_id) === productKey ||
      normalizeKey(bom.productSku) === productKey
    );
    
    if (!productBOM) {
      console.log(`[Enhanced Validation] ${notif.spkNo}: No BOM found for product`, productKey);
      return false;
    }
    
    // Get inventory array
    let inventory = inventoryItems;
    if (inventoryItems.value && Array.isArray(inventoryItems.value)) {
      inventory = inventoryItems.value;
    }
    
    // Check each material in BOM
    for (const material of productBOM.materials || []) {
      const materialKey = normalizeKey(material.materialKode || material.materialId);
      if (!materialKey) continue;
      
      const ratio = toNumber(material.qty || material.ratio || 1);
      const requiredQty = Math.ceil(qtyNeeded * ratio);
      if (requiredQty <= 0) continue;
      
      // ENHANCED: Use material allocator to get REAL availability (considering reservations)
      const availability = await materialAllocator.getMaterialAvailability(materialKey);
      
      if (!availability) {
        // Try alternative material key formats
        const altKeys = [
          material.materialKode,
          material.materialId,
          material.kode,
          materialKey.toUpperCase(),
          `MAT-${materialKey.replace(/^mat-/i, '').toUpperCase()}`
        ].filter(Boolean);
        
        let foundAvailability = null;
        for (const altKey of altKeys) {
          foundAvailability = await materialAllocator.getMaterialAvailability(altKey);
          if (foundAvailability) {
            console.log(`[Enhanced Validation] ${notif.spkNo}: Found material with alternative key: ${altKey}`);
            break;
          }
        }
        
        if (!foundAvailability) {
          console.log(`[Enhanced Validation] ${notif.spkNo}: Material ${materialKey} not found in inventory (tried: ${altKeys.join(', ')})`);
          return false;
        }
        
        availability = foundAvailability;
      }
      
      // CRITICAL: Check available stock AFTER reservations, not total stock
      // IMPORTANT: Jika SPK ini belum punya reservation, cek available stock
      // Jika SPK ini sudah punya reservation, cek apakah reservation masih valid
      
      const spkHasReservation = await materialAllocator.checkSPKMaterialsReady(notif.spkNo);
      
      if (spkHasReservation) {
        // SPK sudah punya reservation, berarti ready
        console.log(`[Enhanced Validation] ${notif.spkNo}: Material ${materialKey} reserved for this SPK`);
        continue;
      } else {
        // SPK belum punya reservation, cek available stock
        if (availability.available < requiredQty) {
          console.log(`[Enhanced Validation] ${notif.spkNo}: Material ${materialKey} insufficient after reservations. Required: ${requiredQty}, Available: ${availability.available} (Total: ${availability.totalStock}, Reserved: ${availability.reserved})`);
          return false;
        } else {
          console.log(`[Enhanced Validation] ${notif.spkNo}: Material ${materialKey} available without reservation. Required: ${requiredQty}, Available: ${availability.available}`);
        }
      }
    }
    
    console.log(`[Enhanced Validation] ✅ ${notif.spkNo}: All materials available (considering reservations)`);
    return true;
  } catch (error) {
    console.error('Error in enhanced material validation', error);
    return false;
  }
}

// Setup test data
async function setupEnhancedTestData() {
  console.log('📋 Setting up Enhanced Stock Allocation test data...');
  
  // Setup product dengan BOM
  await storageService.set('products', [
    {
      id: "test-product-enhanced",
      sku: "ENH-PRD-001",
      nama: "Enhanced Test Product",
      satuan: "PCS",
      harga: 100000,
      kategori: "Test Product"
    }
  ]);
  
  // Setup material
  await storageService.set('materials', [
    {
      id: "test-material-enhanced",
      kode: "MAT-ENH-001",
      nama: "Enhanced Test Material",
      satuan: "PCS",
      harga: 10000,
      kategori: "Raw Material"
    }
  ]);
  
  // Setup BOM
  await storageService.set('bom', [
    {
      id: "test-bom-enhanced",
      productId: "test-product-enhanced",
      productSku: "ENH-PRD-001",
      materials: [
        {
          materialId: "test-material-enhanced",
          materialKode: "MAT-ENH-001",
          qty: 1, // 1:1 ratio
          unit: "PCS"
        }
      ]
    }
  ]);
  
  // Setup inventory dengan stock terbatas (500 PCS)
  await storageService.set('inventory', {
    value: [
      {
        id: "test-inventory-enhanced",
        codeItem: "MAT-ENH-001",
        description: "Enhanced Test Material",
        kategori: "Material",
        satuan: "PCS",
        price: 10000,
        stockPremonth: 0,
        receive: 500,
        outgoing: 0,
        return: 0,
        nextStock: 500
      }
    ],
    timestamp: Date.now()
  });
  
  console.log('✅ Enhanced test data setup completed');
}

// Test enhanced stock allocation with proper PPIC integration
async function runEnhancedStockAllocationTest() {
  console.log('🧪 Enhanced Stock Allocation Test');
  console.log('─'.repeat(80));
  console.log('Testing: PPIC stock checking dengan material allocation integration');
  console.log('Fix: validateMaterialReadiness considers material reservations');
  console.log('─'.repeat(80));
  
  const materialAllocator = new EnhancedMaterialAllocator();
  
  try {
    await setupEnhancedTestData();
    
    // Test 1: Create 2 SPKs
    console.log('\n📋 Test 1: Create 2 SPKs (500 PCS each)');
    
    const spkA = {
      spkNo: `SPK-ENH-A-${Date.now()}`,
      productId: "test-product-enhanced",
      productSku: "ENH-PRD-001",
      qty: 500,
      batchNo: 'BATCH-A'
    };
    
    const spkB = {
      spkNo: `SPK-ENH-B-${Date.now()}`,
      productId: "test-product-enhanced", 
      productSku: "ENH-PRD-001",
      qty: 500,
      batchNo: 'BATCH-B'
    };
    
    console.log('✅ SPKs created:');
    console.log(`   SPK A: ${spkA.spkNo} - ${spkA.qty} PCS`);
    console.log(`   SPK B: ${spkB.spkNo} - ${spkB.qty} PCS`);
    
    // Test 2: PPIC Stock Check BEFORE any reservations
    console.log('\n📋 Test 2: PPIC Stock Check BEFORE Reservations');
    
    const spkA_readyBefore = await enhancedValidateMaterialReadiness(spkA, spkA.qty, materialAllocator);
    const spkB_readyBefore = await enhancedValidateMaterialReadiness(spkB, spkB.qty, materialAllocator);
    
    console.log('✅ PPIC Check Results (Before Reservations):');
    console.log(`   SPK A: ${spkA_readyBefore ? '✅ READY' : '❌ NOT READY'}`);
    console.log(`   SPK B: ${spkB_readyBefore ? '✅ READY' : '❌ NOT READY'}`);
    
    // Test 3: Reserve materials for SPK A
    console.log('\n📋 Test 3: Reserve Materials for SPK A');
    
    const bomList = await storageService.get('bom') || [];
    const productBOM = bomList.find(bom => bom.productId === spkA.productId);
    
    const spkA_materials = productBOM.materials.map(mat => ({
      materialKode: mat.materialKode,
      qty: mat.qty * spkA.qty,
      unit: mat.unit
    }));
    
    const reservationA = await materialAllocator.reserveMaterials(spkA.spkNo, spkA_materials);
    
    console.log('✅ SPK A Reservation Result:');
    console.log(`   Success: ${reservationA.success}`);
    console.log(`   Message: ${reservationA.message}`);
    
    // Test 4: PPIC Stock Check AFTER SPK A reservation
    console.log('\n📋 Test 4: PPIC Stock Check AFTER SPK A Reservation');
    
    const spkA_readyAfter = await enhancedValidateMaterialReadiness(spkA, spkA.qty, materialAllocator);
    const spkB_readyAfter = await enhancedValidateMaterialReadiness(spkB, spkB.qty, materialAllocator);
    
    console.log('✅ PPIC Check Results (After SPK A Reservation):');
    console.log(`   SPK A: ${spkA_readyAfter ? '✅ READY' : '❌ NOT READY'} (should be READY - has reservation)`);
    console.log(`   SPK B: ${spkB_readyAfter ? '✅ READY' : '❌ NOT READY'} (should be NOT READY - no stock left)`);
    
    // Test 5: Try to reserve materials for SPK B
    console.log('\n📋 Test 5: Try to Reserve Materials for SPK B');
    
    const spkB_materials = productBOM.materials.map(mat => ({
      materialKode: mat.materialKode,
      qty: mat.qty * spkB.qty,
      unit: mat.unit
    }));
    
    const reservationB = await materialAllocator.reserveMaterials(spkB.spkNo, spkB_materials);
    
    console.log('✅ SPK B Reservation Result:');
    console.log(`   Success: ${reservationB.success}`);
    console.log(`   Message: ${reservationB.message}`);
    if (!reservationB.success) {
      reservationB.shortages.forEach(shortage => {
        console.log(`     Shortage: ${shortage.shortage} ${shortage.unit} ${shortage.materialName}`);
      });
    }
    
    // Test 6: Final PPIC Stock Check
    console.log('\n📋 Test 6: Final PPIC Stock Check');
    
    const spkA_finalReady = await enhancedValidateMaterialReadiness(spkA, spkA.qty, materialAllocator);
    const spkB_finalReady = await enhancedValidateMaterialReadiness(spkB, spkB.qty, materialAllocator);
    
    console.log('✅ Final PPIC Check Results:');
    console.log(`   SPK A: ${spkA_finalReady ? '✅ READY' : '❌ NOT READY'}`);
    console.log(`   SPK B: ${spkB_finalReady ? '✅ READY' : '❌ NOT READY'}`);
    
    // Test 7: Compare OLD vs NEW validation logic
    console.log('\n📋 Test 7: Compare OLD vs NEW Validation Logic');
    
    // Simulate OLD logic (without considering reservations)
    const oldValidation = async (spk) => {
      const inventory = await storageService.get('inventory');
      const inventoryArray = inventory?.value || [];
      const material = inventoryArray.find(item => item.codeItem === 'MAT-ENH-001');
      const availableStock = material?.nextStock || 0;
      const requiredQty = spk.qty * 1; // 1:1 ratio
      
      return availableStock >= requiredQty;
    };
    
    const spkA_oldLogic = await oldValidation(spkA);
    const spkB_oldLogic = await oldValidation(spkB);
    
    console.log('✅ Validation Logic Comparison:');
    console.log('');
    console.log('OLD LOGIC (without reservations):');
    console.log(`   SPK A: ${spkA_oldLogic ? '✅ READY' : '❌ NOT READY'} (WRONG - doesn\'t consider reservations)`);
    console.log(`   SPK B: ${spkB_oldLogic ? '✅ READY' : '❌ NOT READY'} (WRONG - doesn\'t consider reservations)`);
    console.log('');
    console.log('NEW LOGIC (with reservations):');
    console.log(`   SPK A: ${spkA_finalReady ? '✅ READY' : '❌ NOT READY'} (CORRECT - has reservation)`);
    console.log(`   SPK B: ${spkB_finalReady ? '✅ READY' : '❌ NOT READY'} (CORRECT - no stock after A allocation)`);
    
    // Test 8: Material Allocation Status
    console.log('\n📋 Test 8: Material Allocation Status');
    
    const materialAvailability = await materialAllocator.getMaterialAvailability('MAT-ENH-001');
    const allReservations = materialAllocator.getAllActiveReservations();
    
    console.log('✅ Material Status:');
    console.log(`   Total Stock: ${materialAvailability.totalStock} PCS`);
    console.log(`   Reserved: ${materialAvailability.reserved} PCS`);
    console.log(`   Available: ${materialAvailability.available} PCS`);
    console.log(`   Active Reservations: ${allReservations.length}`);
    
    allReservations.forEach(res => {
      console.log(`     ${res.spkNo}: ${res.qty} ${res.unit} ${res.materialName}`);
    });
    
    // Validation Results
    console.log('\n📊 Enhanced Stock Allocation Test Results');
    console.log('─'.repeat(80));
    
    const testResults = {
      bothReadyBefore: spkA_readyBefore && spkB_readyBefore,
      spkA_readyAfterReservation: spkA_readyAfter,
      spkB_notReadyAfterReservation: !spkB_readyAfter,
      reservationA_success: reservationA.success,
      reservationB_failure: !reservationB.success,
      oldLogicWrong: spkA_oldLogic && spkB_oldLogic, // Both show ready (wrong)
      newLogicCorrect: spkA_finalReady && !spkB_finalReady // A ready, B not ready (correct)
    };
    
    console.log('TEST VALIDATION:');
    console.log(`• Both SPKs ready before reservations: ${testResults.bothReadyBefore ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log(`• SPK A ready after reservation: ${testResults.spkA_readyAfterReservation ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log(`• SPK B not ready after A reservation: ${testResults.spkB_notReadyAfterReservation ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log(`• SPK A reservation successful: ${testResults.reservationA_success ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log(`• SPK B reservation failed: ${testResults.reservationB_failure ? '✅ CORRECT' : '❌ WRONG'}`);
    console.log(`• Old logic shows both ready (wrong): ${testResults.oldLogicWrong ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
    console.log(`• New logic shows correct status: ${testResults.newLogicCorrect ? '✅ CORRECT' : '❌ WRONG'}`);
    
    const allTestsPassed = Object.values(testResults).every(result => result === true);
    
    if (allTestsPassed) {
      console.log('\n🎉 ENHANCED STOCK ALLOCATION TEST PASSED!');
      console.log('✅ Material allocation properly integrated with PPIC');
      console.log('✅ Stock checking considers reservations');
      console.log('✅ No more false "READY" status for insufficient stock');
      console.log('✅ First-come-first-served allocation working');
    } else {
      console.log('\n❌ ENHANCED STOCK ALLOCATION TEST FAILED!');
      console.log('⚠️  Integration between material allocator and PPIC needs work');
    }
    
    return allTestsPassed;
    
  } catch (error) {
    console.log('\n❌ Enhanced Stock Allocation Test FAILED!');
    console.log('Error:', error.message);
    return false;
  }
}

// Run the enhanced test
runEnhancedStockAllocationTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Enhanced stock allocation test execution failed:', error);
  process.exit(1);
});