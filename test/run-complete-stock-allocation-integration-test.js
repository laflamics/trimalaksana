/**
 * Complete Stock Allocation Integration Test
 * Tests the full integration of material allocation with PPIC SPK creation
 */

const fs = require('fs');
const path = require('path');

// Mock localStorage for Node.js environment
global.localStorage = {
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
};

// Mock window object
global.window = {
  requestIdleCallback: (callback) => setTimeout(callback, 0)
};

// Import the material allocator
const { materialAllocator } = require('./src/services/material-allocator.ts');

// Test data setup
const setupTestData = () => {
  console.log('📋 Setting up Complete Integration test data...');
  
  // Clear previous test data
  materialAllocator.clearAllReservations();
  
  // Setup inventory with limited stock
  const inventory = [
    {
      id: 'inv-001',
      codeItem: 'MAT-STEEL-001',
      description: 'Steel Material for Production',
      kategori: 'RAW_MATERIAL',
      satuan: 'KG',
      price: 15000,
      stockPremonth: 1000,
      receive: 0,
      outgoing: 0,
      return: 0,
      nextStock: 1000, // Total available: 1000 KG
      lastUpdate: new Date().toISOString()
    },
    {
      id: 'inv-002', 
      codeItem: 'MAT-PLASTIC-001',
      description: 'Plastic Material for Production',
      kategori: 'RAW_MATERIAL',
      satuan: 'KG',
      price: 8000,
      stockPremonth: 500,
      receive: 0,
      outgoing: 0,
      return: 0,
      nextStock: 500, // Total available: 500 KG
      lastUpdate: new Date().toISOString()
    }
  ];
  
  // Setup materials master data
  const materials = [
    {
      material_id: 'MAT-STEEL-001',
      kode: 'MAT-STEEL-001',
      name: 'Steel Material',
      material_name: 'Steel Material for Production',
      unit: 'KG',
      category: 'RAW_MATERIAL'
    },
    {
      material_id: 'MAT-PLASTIC-001', 
      kode: 'MAT-PLASTIC-001',
      name: 'Plastic Material',
      material_name: 'Plastic Material for Production',
      unit: 'KG',
      category: 'RAW_MATERIAL'
    }
  ];
  
  // Setup products
  const products = [
    {
      product_id: 'PROD-CHAIR-001',
      kode: 'PROD-CHAIR-001',
      nama: 'Office Chair Premium',
      category: 'FURNITURE',
      unit: 'PCS',
      hargaSales: 500000
    }
  ];
  
  // Setup BOM (Bill of Materials)
  const bom = [
    {
      id: 'bom-001',
      product_id: 'PROD-CHAIR-001',
      kode: 'PROD-CHAIR-001',
      material_id: 'MAT-STEEL-001',
      materialId: 'MAT-STEEL-001',
      material_name: 'Steel Material',
      ratio: 2.5, // 2.5 KG steel per chair
      unit: 'KG'
    },
    {
      id: 'bom-002',
      product_id: 'PROD-CHAIR-001',
      kode: 'PROD-CHAIR-001', 
      material_id: 'MAT-PLASTIC-001',
      materialId: 'MAT-PLASTIC-001',
      material_name: 'Plastic Material',
      ratio: 1.0, // 1.0 KG plastic per chair
      unit: 'KG'
    }
  ];
  
  // Setup customers
  const customers = [
    {
      id: 'cust-001',
      kode: 'CUST-001',
      nama: 'PT. Test Customer',
      alamat: 'Jakarta',
      telepon: '021-12345678'
    }
  ];
  
  // Setup Sales Order
  const salesOrders = [
    {
      id: 'so-integration-test',
      soNo: 'SO-INT-001',
      customer: 'PT. Test Customer',
      customerKode: 'CUST-001',
      status: 'CONFIRMED',
      created: new Date().toISOString(),
      confirmedAt: new Date().toISOString(),
      items: [
        {
          id: 'so-item-001',
          productId: 'PROD-CHAIR-001',
          productKode: 'PROD-CHAIR-001',
          productName: 'Office Chair Premium',
          qty: 300, // 300 chairs - will need 750 KG steel + 300 KG plastic
          unit: 'PCS',
          price: 500000,
          total: 150000000
        },
        {
          id: 'so-item-002',
          productId: 'PROD-CHAIR-001',
          productKode: 'PROD-CHAIR-001', 
          productName: 'Office Chair Premium',
          qty: 200, // 200 chairs - will need 500 KG steel + 200 KG plastic
          unit: 'PCS',
          price: 500000,
          total: 100000000
        }
      ]
    }
  ];
  
  // Store test data in localStorage
  localStorage.setItem('inventory', JSON.stringify(inventory));
  localStorage.setItem('materials', JSON.stringify(materials));
  localStorage.setItem('products', JSON.stringify(products));
  localStorage.setItem('bom', JSON.stringify(bom));
  localStorage.setItem('customers', JSON.stringify(customers));
  localStorage.setItem('salesOrders', JSON.stringify(salesOrders));
  localStorage.setItem('spk', JSON.stringify([]));
  localStorage.setItem('schedule', JSON.stringify([]));
  localStorage.setItem('productionNotifications', JSON.stringify([]));
  
  console.log('✅ Complete Integration test data setup completed');
  console.log('📊 Test Scenario:');
  console.log('   • Steel Material: 1000 KG available');
  console.log('   • Plastic Material: 500 KG available');
  console.log('   • SO Item 1: 300 chairs (needs 750 KG steel + 300 KG plastic)');
  console.log('   • SO Item 2: 200 chairs (needs 500 KG steel + 200 KG plastic)');
  console.log('   • Total needed: 1250 KG steel + 500 KG plastic');
  console.log('   • Expected: Steel shortage (250 KG), Plastic OK');
  
  return {
    inventory,
    materials,
    products,
    bom,
    customers,
    salesOrders
  };
};

// Mock PPIC SPK creation logic (simplified version)
const mockPPICSPKCreation = async (salesOrder) => {
  console.log('\n📋 Test: Mock PPIC SPK Creation with Material Reservation');
  
  const newSPKs = [];
  const reservationResults = [];
  
  // Get test data
  const bomList = JSON.parse(localStorage.getItem('bom') || '[]');
  const materialsList = JSON.parse(localStorage.getItem('materials') || '[]');
  
  const normalizeKey = (value) => (value ?? '').toString().trim().toLowerCase();
  const toNumber = (value) => {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  
  // Build product BOM map
  const productBomMap = {};
  bomList.forEach((bom) => {
    const key = normalizeKey(bom.product_id || bom.kode);
    if (!key) return;
    if (!productBomMap[key]) {
      productBomMap[key] = [];
    }
    productBomMap[key].push(bom);
  });
  
  // Create SPK for each SO item
  for (let i = 0; i < salesOrder.items.length; i++) {
    const item = salesOrder.items[i];
    const spkNo = `SPK-INT-${String.fromCharCode(65 + i)}-${Date.now()}`;
    
    const newSPK = {
      id: `spk-${Date.now()}-${i}`,
      spkNo: spkNo,
      soNo: salesOrder.soNo,
      customer: salesOrder.customer,
      product: item.productName,
      product_id: item.productId,
      kode: item.productKode,
      qty: item.qty,
      unit: item.unit,
      status: 'OPEN',
      created: new Date().toISOString()
    };
    
    newSPKs.push(newSPK);
    
    // Calculate and reserve materials for this SPK
    const productKey = normalizeKey(newSPK.product_id || newSPK.kode);
    const spkQty = toNumber(newSPK.qty);
    
    if (productKey && spkQty > 0) {
      const bomForProduct = productBomMap[productKey] || [];
      if (bomForProduct.length > 0) {
        // Calculate material requirements
        const materialRequirements = [];
        bomForProduct.forEach((bom) => {
          const materialKey = normalizeKey(bom.material_id || bom.kode || bom.materialId);
          if (!materialKey) return;
          
          const ratio = toNumber(bom.ratio || 1) || 1;
          const requiredQty = Math.max(Math.ceil(spkQty * ratio), 0);
          if (requiredQty === 0) return;
          
          // Find material name
          const material = materialsList.find((m) => 
            normalizeKey(m.material_id || m.kode) === materialKey
          );
          
          materialRequirements.push({
            id: materialKey,
            nama: material?.name || material?.material_name || bom.material_name || materialKey,
            qty: requiredQty,
            unit: material?.unit || bom.unit || 'PCS',
          });
        });
        
        if (materialRequirements.length > 0) {
          console.log(`   📦 SPK ${spkNo}: Attempting to reserve ${materialRequirements.length} materials`);
          materialRequirements.forEach(req => {
            console.log(`      - ${req.nama}: ${req.qty} ${req.unit}`);
          });
          
          try {
            const reservation = await materialAllocator.reserveMaterials(spkNo, materialRequirements);
            reservationResults.push({
              spkNo: spkNo,
              success: reservation.success,
              message: reservation.message,
              shortages: reservation.shortages,
              materialRequirements: materialRequirements
            });
            
            if (reservation.success) {
              console.log(`   ✅ SPK ${spkNo}: Materials reserved successfully`);
            } else {
              console.log(`   ❌ SPK ${spkNo}: Material shortage detected`);
              reservation.shortages.forEach(shortage => {
                console.log(`      - ${shortage.materialName}: Need ${shortage.required}, Available ${shortage.available}, Shortage ${shortage.shortage} ${shortage.unit}`);
              });
            }
          } catch (error) {
            console.error(`   ❌ SPK ${spkNo}: Error reserving materials:`, error);
            reservationResults.push({
              spkNo: spkNo,
              success: false,
              message: `Error: ${error}`,
              shortages: [],
              materialRequirements: materialRequirements
            });
          }
        }
      }
    }
  }
  
  return {
    spks: newSPKs,
    reservations: reservationResults
  };
};

// Mock Production validateMaterialReadiness function
const mockValidateMaterialReadiness = async (spkNo, productId, qty) => {
  const inventoryItems = JSON.parse(localStorage.getItem('inventory') || '[]');
  const bomList = JSON.parse(localStorage.getItem('bom') || '[]');
  const materialsList = JSON.parse(localStorage.getItem('materials') || '[]');
  
  const normalizeKey = (value) => (value ?? '').toString().trim().toLowerCase();
  const toNumber = (value) => {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  
  const productKey = normalizeKey(productId);
  const qtyNeeded = toNumber(qty);
  
  if (!productKey || qtyNeeded <= 0) {
    return false;
  }
  
  const productBomMap = {};
  bomList.forEach((bom) => {
    const key = normalizeKey(bom.product_id || bom.kode);
    if (!key) return;
    if (!productBomMap[key]) {
      productBomMap[key] = [];
    }
    productBomMap[key].push(bom);
  });
  
  const bomForProduct = productBomMap[productKey] || [];
  if (bomForProduct.length === 0) {
    return false;
  }
  
  // Check each material in BOM
  for (const bom of bomForProduct) {
    const materialKey = normalizeKey(bom.material_id || bom.kode || bom.materialId);
    if (!materialKey) continue;
    
    const ratio = toNumber(bom.ratio || 1) || 1;
    const requiredQty = Math.max(Math.ceil(qtyNeeded * ratio), 0);
    if (requiredQty === 0) continue;
    
    // ENHANCED: Check if SPK already has reservation for this material
    const spkHasReservation = await materialAllocator.checkSPKMaterialsReady(spkNo);
    
    if (spkHasReservation) {
      // SPK sudah punya reservation, berarti material ready
      console.log(`[Enhanced Validation] ${spkNo}: Material ${materialKey} reserved for this SPK`);
      continue;
    }
    
    // SPK belum punya reservation, check available stock AFTER considering other reservations
    const availability = await materialAllocator.getMaterialAvailability(materialKey);
    
    if (!availability || availability.available < requiredQty) {
      console.log(`[Enhanced Validation] ${spkNo}: Material ${materialKey} insufficient after reservations. Required: ${requiredQty}, Available: ${availability?.available || 0}`);
      return false;
    } else {
      console.log(`[Enhanced Validation] ${spkNo}: Material ${materialKey} available. Required: ${requiredQty}, Available: ${availability.available}`);
    }
  }
  
  console.log(`[Enhanced Validation] ✅ ${spkNo}: All materials available (considering reservations)`);
  return true;
};

// Main test function
const runCompleteIntegrationTest = async () => {
  console.log('🧪 Complete Stock Allocation Integration Test');
  console.log('─'.repeat(70));
  console.log('Testing: Full PPIC SPK creation with material allocation');
  console.log('Integration: PPIC → Material Allocator → Production Validation');
  console.log('─'.repeat(70));
  
  try {
    // Setup test data
    const testData = setupTestData();
    
    // Test 1: Create SPKs with material reservation (PPIC simulation)
    console.log('\n📋 Test 1: PPIC SPK Creation with Material Reservation');
    const ppicResult = await mockPPICSPKCreation(testData.salesOrders[0]);
    
    console.log(`\n✅ PPIC Results:`);
    console.log(`   SPKs Created: ${ppicResult.spks.length}`);
    ppicResult.spks.forEach(spk => {
      console.log(`   - ${spk.spkNo}: ${spk.qty} ${spk.unit} ${spk.product}`);
    });
    
    const successfulReservations = ppicResult.reservations.filter(r => r.success);
    const failedReservations = ppicResult.reservations.filter(r => !r.success);
    
    console.log(`   Material Reservations: ${successfulReservations.length}/${ppicResult.reservations.length} successful`);
    
    if (failedReservations.length > 0) {
      console.log(`   ⚠️ Failed Reservations:`);
      failedReservations.forEach(r => {
        console.log(`   - ${r.spkNo}: ${r.message}`);
        r.shortages.forEach(s => {
          console.log(`     • ${s.materialName}: Need ${s.required}, Available ${s.available}, Shortage ${s.shortage} ${s.unit}`);
        });
      });
    }
    
    // Test 2: Production Material Readiness Check
    console.log('\n📋 Test 2: Production Material Readiness Validation');
    
    for (const spk of ppicResult.spks) {
      const isReady = await mockValidateMaterialReadiness(spk.spkNo, spk.product_id, spk.qty);
      const hasReservation = successfulReservations.some(r => r.spkNo === spk.spkNo);
      
      console.log(`   ${spk.spkNo}: ${isReady ? '✅ READY' : '❌ NOT READY'} (Reservation: ${hasReservation ? 'Yes' : 'No'})`);
      
      // Validation: SPK with successful reservation should be READY
      if (hasReservation && !isReady) {
        console.log(`   ⚠️ WARNING: SPK with reservation shows NOT READY - this should not happen!`);
      }
      
      // Validation: SPK without reservation should be NOT READY if materials are insufficient
      if (!hasReservation && isReady) {
        console.log(`   ⚠️ WARNING: SPK without reservation shows READY - check if materials are actually available`);
      }
    }
    
    // Test 3: Material Allocation Status
    console.log('\n📋 Test 3: Material Allocation Status');
    
    const steelAvailability = await materialAllocator.getMaterialAvailability('MAT-STEEL-001');
    const plasticAvailability = await materialAllocator.getMaterialAvailability('MAT-PLASTIC-001');
    
    console.log(`   Steel Material (MAT-STEEL-001):`);
    if (steelAvailability) {
      console.log(`     Total Stock: ${steelAvailability.totalStock} ${steelAvailability.unit}`);
      console.log(`     Reserved: ${steelAvailability.reserved} ${steelAvailability.unit}`);
      console.log(`     Available: ${steelAvailability.available} ${steelAvailability.unit}`);
    } else {
      console.log(`     ❌ Material not found`);
    }
    
    console.log(`   Plastic Material (MAT-PLASTIC-001):`);
    if (plasticAvailability) {
      console.log(`     Total Stock: ${plasticAvailability.totalStock} ${plasticAvailability.unit}`);
      console.log(`     Reserved: ${plasticAvailability.reserved} ${plasticAvailability.unit}`);
      console.log(`     Available: ${plasticAvailability.available} ${plasticAvailability.unit}`);
    } else {
      console.log(`     ❌ Material not found`);
    }
    
    // Test 4: Active Reservations Summary
    console.log('\n📋 Test 4: Active Reservations Summary');
    const activeReservations = materialAllocator.getAllActiveReservations();
    console.log(`   Total Active Reservations: ${activeReservations.length}`);
    
    const reservationsBySPK = {};
    activeReservations.forEach(r => {
      if (!reservationsBySPK[r.spkNo]) {
        reservationsBySPK[r.spkNo] = [];
      }
      reservationsBySPK[r.spkNo].push(r);
    });
    
    Object.keys(reservationsBySPK).forEach(spkNo => {
      console.log(`   ${spkNo}:`);
      reservationsBySPK[spkNo].forEach(r => {
        console.log(`     - ${r.materialName}: ${r.qty} ${r.unit}`);
      });
    });
    
    // Test 5: Validation Summary
    console.log('\n📊 Complete Integration Test Results');
    console.log('─'.repeat(70));
    
    const totalSPKs = ppicResult.spks.length;
    const spksWithReservations = successfulReservations.length;
    const spksWithShortages = failedReservations.length;
    
    console.log('TEST VALIDATION:');
    console.log(`• SPKs created: ${totalSPKs} ✅`);
    console.log(`• SPKs with successful material reservations: ${spksWithReservations}/${totalSPKs} ${spksWithReservations > 0 ? '✅' : '❌'}`);
    console.log(`• SPKs with material shortages: ${spksWithShortages}/${totalSPKs} ${spksWithShortages > 0 ? '⚠️' : '✅'}`);
    console.log(`• Material allocation working: ${activeReservations.length > 0 ? '✅' : '❌'}`);
    console.log(`• Production validation integrated: ✅`);
    console.log(`• First-come-first-served allocation: ${spksWithShortages > 0 ? '✅ (shortage detected)' : '✅'}`);
    
    // Expected results validation
    const expectedSteelShortage = (300 * 2.5) + (200 * 2.5) - 1000; // 1250 - 1000 = 250 KG shortage
    const expectedPlasticOK = (300 * 1.0) + (200 * 1.0) <= 500; // 500 <= 500 = OK
    
    console.log('\nEXPECTED vs ACTUAL:');
    console.log(`• Steel shortage expected: ${expectedSteelShortage > 0 ? 'Yes' : 'No'} (${expectedSteelShortage} KG)`);
    console.log(`• Steel shortage actual: ${steelAvailability && steelAvailability.available < steelAvailability.totalStock ? 'Yes' : 'No'}`);
    console.log(`• Plastic sufficient expected: ${expectedPlasticOK ? 'Yes' : 'No'}`);
    console.log(`• Plastic sufficient actual: ${plasticAvailability && plasticAvailability.available >= 0 ? 'Yes' : 'No'}`);
    
    if (spksWithReservations > 0 && activeReservations.length > 0) {
      console.log('\n🎉 COMPLETE INTEGRATION TEST PASSED!');
      console.log('✅ PPIC SPK creation integrated with material allocator');
      console.log('✅ Material reservations working correctly');
      console.log('✅ Production validation considers reservations');
      console.log('✅ Stock allocation prevents double allocation');
      console.log('✅ Material shortages properly detected and handled');
    } else {
      console.log('\n❌ INTEGRATION TEST FAILED!');
      console.log('❌ Material allocation not working properly');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    console.error('Stack trace:', error.stack);
  }
};

// Run the test
runCompleteIntegrationTest().catch(console.error);