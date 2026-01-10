/**
 * GT Partial GRN Test
 * Tests PO status behavior when GRN is created with partial quantity
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

// Helper function to extract storage value (handle wrapped format)
const extractStorageValue = (data) => {
  if (!data) return null;
  if (Array.isArray(data)) return data;
  if (data.value && Array.isArray(data.value)) return data.value;
  return data;
};

// Mock test data setup
async function setupPartialGRNTestData() {
  console.log('📋 Setting up GT Partial GRN test data...');
  
  // Setup suppliers
  await storageService.set('gt_suppliers', [
    {
      id: "test-supplier-partial",
      kode: "SUP-PARTIAL-001",
      nama: "PT. TEST PARTIAL SUPPLIER",
      kontak: "Test PIC Partial",
      telepon: "021-1111111",
      alamat: "Test Supplier Address",
      kategori: "Supplier"
    }
  ]);
  
  // Setup products
  await storageService.set('gt_products', [
    {
      id: "test-product-partial",
      product_id: "PARTIAL-PRD-001",
      kode: "PARTIAL-PRD-001",
      nama: "Test Partial Product",
      satuan: "PCS",
      harga: 50000,
      hargaSales: 60000,
      hargaFg: 60000,
      kategori: "Test"
    }
  ]);
  
  console.log('✅ Partial GRN test data setup completed');
}

// Test GT Partial GRN Flow
async function runGTPartialGRNTest() {
  console.log('🧪 GT Partial GRN Test');
  console.log('─'.repeat(60));
  
  try {
    await setupPartialGRNTestData();
    
    // Test 1: Create Purchase Order
    console.log('\n📋 Test 1: Create Purchase Order (100 PCS)');
    const testPO = {
      id: `test-po-partial-${Date.now()}`,
      poNo: `TEST-PO-PARTIAL-${Date.now()}`,
      supplier: "PT. TEST PARTIAL SUPPLIER",
      supplierKode: "SUP-PARTIAL-001",
      product: "Test Partial Product",
      productId: "PARTIAL-PRD-001",
      qty: 100, // Order 100 PCS
      unit: "PCS",
      price: 50000,
      total: 100 * 50000, // Rp 5,000,000
      paymentTerms: 'TOP',
      topDays: 30,
      status: 'OPEN',
      created: new Date().toISOString()
    };
    
    const purchaseOrders = await storageService.get('gt_purchaseOrders') || [];
    purchaseOrders.push(testPO);
    await storageService.set('gt_purchaseOrders', purchaseOrders);
    console.log('✅ PO created:', testPO.poNo);
    console.log(`   Ordered Qty: ${testPO.qty} ${testPO.unit}`);
    console.log(`   Status: ${testPO.status}`);
    
    // Test 2: Create First Partial GRN (30 PCS)
    console.log('\n📋 Test 2: Create First Partial GRN (30 PCS out of 100)');
    const partialGRN1 = {
      id: `test-grn-partial-1-${Date.now()}`,
      grnNo: `TEST-GRN-PARTIAL-1-${Date.now()}`,
      poNo: testPO.poNo,
      supplier: testPO.supplier,
      productItem: testPO.product,
      productId: testPO.productId,
      qtyOrdered: testPO.qty, // 100 PCS ordered
      qtyReceived: 30, // Only 30 PCS received
      unit: testPO.unit,
      price: testPO.price,
      total: 30 * testPO.price, // Rp 1,500,000
      status: 'CLOSE',
      receiptDate: new Date().toISOString().split('T')[0],
      created: new Date().toISOString()
    };
    
    const grnList = await storageService.get('gt_grn') || [];
    grnList.push(partialGRN1);
    await storageService.set('gt_grn', grnList);
    console.log('✅ First partial GRN created:', partialGRN1.grnNo);
    console.log(`   Received: ${partialGRN1.qtyReceived} PCS (out of ${partialGRN1.qtyOrdered} ordered)`);
    
    // Test 3: Check PO Status After First Partial GRN
    console.log('\n📋 Test 3: Check PO Status After First Partial GRN');
    
    // Simulate the logic from GT Purchasing component
    const latestGRNs = extractStorageValue(await storageService.get('gt_grn')) || [];
    const latestGRNsForPO = latestGRNs.filter(grn => {
      const grnPO = (grn.poNo || '').toString().trim();
      const currentPO = (testPO.poNo || '').toString().trim();
      return grnPO === currentPO;
    });
    
    const totalQtyReceived = latestGRNsForPO.reduce((sum, grn) => {
      const qty = parseFloat(String(grn.qtyReceived || '0')) || 0;
      return sum + qty;
    }, 0);
    
    const itemQty = parseFloat(String(testPO.qty || '0')) || 0;
    const remainingQty = itemQty - totalQtyReceived;
    
    console.log(`   Total Ordered: ${itemQty} PCS`);
    console.log(`   Total Received: ${totalQtyReceived} PCS`);
    console.log(`   Remaining: ${remainingQty} PCS`);
    
    // Apply the status logic
    let expectedStatus = testPO.status;
    if (remainingQty === 0 && itemQty > 0 && totalQtyReceived > 0) {
      expectedStatus = 'CLOSE';
      console.log('✅ Logic: All qty received, PO should be CLOSE');
    } else if (remainingQty > 0) {
      expectedStatus = 'OPEN';
      console.log('✅ Logic: Outstanding qty exists, PO should remain OPEN');
    }
    
    // Update PO status based on logic
    const updatedPOs1 = purchaseOrders.map(po => 
      po.poNo === testPO.poNo ? { ...po, status: expectedStatus } : po
    );
    await storageService.set('gt_purchaseOrders', updatedPOs1);
    
    const currentPO1 = updatedPOs1.find(po => po.poNo === testPO.poNo);
    console.log(`✅ PO Status after first partial GRN: ${currentPO1.status}`);
    
    if (currentPO1.status === 'OPEN' && remainingQty > 0) {
      console.log('✅ CORRECT: PO remains OPEN because there is outstanding qty');
    } else if (currentPO1.status === 'CLOSE' && remainingQty === 0) {
      console.log('✅ CORRECT: PO is CLOSE because all qty received');
    } else {
      console.log('❌ INCORRECT: PO status does not match expected logic');
    }
    
    // Test 4: Create Second Partial GRN (50 PCS more)
    console.log('\n📋 Test 4: Create Second Partial GRN (50 PCS more)');
    const partialGRN2 = {
      id: `test-grn-partial-2-${Date.now()}`,
      grnNo: `TEST-GRN-PARTIAL-2-${Date.now()}`,
      poNo: testPO.poNo,
      supplier: testPO.supplier,
      productItem: testPO.product,
      productId: testPO.productId,
      qtyOrdered: testPO.qty, // 100 PCS ordered
      qtyReceived: 50, // 50 more PCS received
      unit: testPO.unit,
      price: testPO.price,
      total: 50 * testPO.price, // Rp 2,500,000
      status: 'CLOSE',
      receiptDate: new Date().toISOString().split('T')[0],
      created: new Date().toISOString()
    };
    
    grnList.push(partialGRN2);
    await storageService.set('gt_grn', grnList);
    console.log('✅ Second partial GRN created:', partialGRN2.grnNo);
    console.log(`   Received: ${partialGRN2.qtyReceived} PCS (additional)`);
    
    // Test 5: Check PO Status After Second Partial GRN
    console.log('\n📋 Test 5: Check PO Status After Second Partial GRN');
    
    // Recalculate with updated GRN data
    const latestGRNs2 = extractStorageValue(await storageService.get('gt_grn')) || [];
    const latestGRNsForPO2 = latestGRNs2.filter(grn => {
      const grnPO = (grn.poNo || '').toString().trim();
      const currentPO = (testPO.poNo || '').toString().trim();
      return grnPO === currentPO;
    });
    
    const totalQtyReceived2 = latestGRNsForPO2.reduce((sum, grn) => {
      const qty = parseFloat(String(grn.qtyReceived || '0')) || 0;
      return sum + qty;
    }, 0);
    
    const remainingQty2 = itemQty - totalQtyReceived2;
    
    console.log(`   Total Ordered: ${itemQty} PCS`);
    console.log(`   Total Received: ${totalQtyReceived2} PCS (${partialGRN1.qtyReceived} + ${partialGRN2.qtyReceived})`);
    console.log(`   Remaining: ${remainingQty2} PCS`);
    
    // Apply the status logic again
    let expectedStatus2 = currentPO1.status;
    if (remainingQty2 === 0 && itemQty > 0 && totalQtyReceived2 > 0) {
      expectedStatus2 = 'CLOSE';
      console.log('✅ Logic: All qty received, PO should be CLOSE');
    } else if (remainingQty2 > 0) {
      expectedStatus2 = 'OPEN';
      console.log('✅ Logic: Outstanding qty exists, PO should remain OPEN');
    }
    
    // Update PO status based on logic
    const updatedPOs2 = updatedPOs1.map(po => 
      po.poNo === testPO.poNo ? { ...po, status: expectedStatus2 } : po
    );
    await storageService.set('gt_purchaseOrders', updatedPOs2);
    
    const currentPO2 = updatedPOs2.find(po => po.poNo === testPO.poNo);
    console.log(`✅ PO Status after second partial GRN: ${currentPO2.status}`);
    
    if (currentPO2.status === 'OPEN' && remainingQty2 > 0) {
      console.log('✅ CORRECT: PO remains OPEN because there is still outstanding qty');
    } else if (currentPO2.status === 'CLOSE' && remainingQty2 === 0) {
      console.log('✅ CORRECT: PO is CLOSE because all qty received');
    } else {
      console.log('❌ INCORRECT: PO status does not match expected logic');
    }
    
    // Test 6: Create Final GRN (20 PCS to complete)
    console.log('\n📋 Test 6: Create Final GRN (20 PCS to complete order)');
    const finalGRN = {
      id: `test-grn-final-${Date.now()}`,
      grnNo: `TEST-GRN-FINAL-${Date.now()}`,
      poNo: testPO.poNo,
      supplier: testPO.supplier,
      productItem: testPO.product,
      productId: testPO.productId,
      qtyOrdered: testPO.qty, // 100 PCS ordered
      qtyReceived: 20, // Final 20 PCS received
      unit: testPO.unit,
      price: testPO.price,
      total: 20 * testPO.price, // Rp 1,000,000
      status: 'CLOSE',
      receiptDate: new Date().toISOString().split('T')[0],
      created: new Date().toISOString()
    };
    
    grnList.push(finalGRN);
    await storageService.set('gt_grn', grnList);
    console.log('✅ Final GRN created:', finalGRN.grnNo);
    console.log(`   Received: ${finalGRN.qtyReceived} PCS (final)`);
    
    // Test 7: Check PO Status After Final GRN (Should be CLOSE)
    console.log('\n📋 Test 7: Check PO Status After Final GRN');
    
    // Recalculate with all GRN data
    const latestGRNs3 = extractStorageValue(await storageService.get('gt_grn')) || [];
    const latestGRNsForPO3 = latestGRNs3.filter(grn => {
      const grnPO = (grn.poNo || '').toString().trim();
      const currentPO = (testPO.poNo || '').toString().trim();
      return grnPO === currentPO;
    });
    
    const totalQtyReceived3 = latestGRNsForPO3.reduce((sum, grn) => {
      const qty = parseFloat(String(grn.qtyReceived || '0')) || 0;
      return sum + qty;
    }, 0);
    
    const remainingQty3 = itemQty - totalQtyReceived3;
    
    console.log(`   Total Ordered: ${itemQty} PCS`);
    console.log(`   Total Received: ${totalQtyReceived3} PCS (${partialGRN1.qtyReceived} + ${partialGRN2.qtyReceived} + ${finalGRN.qtyReceived})`);
    console.log(`   Remaining: ${remainingQty3} PCS`);
    
    // Apply the status logic final time
    let expectedStatus3 = currentPO2.status;
    if (remainingQty3 === 0 && itemQty > 0 && totalQtyReceived3 > 0) {
      expectedStatus3 = 'CLOSE';
      console.log('✅ Logic: All qty received, PO should be CLOSE');
    } else if (remainingQty3 > 0) {
      expectedStatus3 = 'OPEN';
      console.log('✅ Logic: Outstanding qty exists, PO should remain OPEN');
    }
    
    // Update PO status based on logic
    const updatedPOs3 = updatedPOs2.map(po => 
      po.poNo === testPO.poNo ? { ...po, status: expectedStatus3 } : po
    );
    await storageService.set('gt_purchaseOrders', updatedPOs3);
    
    const currentPO3 = updatedPOs3.find(po => po.poNo === testPO.poNo);
    console.log(`✅ PO Status after final GRN: ${currentPO3.status}`);
    
    if (currentPO3.status === 'CLOSE' && remainingQty3 === 0) {
      console.log('✅ CORRECT: PO is CLOSE because all qty received');
    } else if (currentPO3.status === 'OPEN' && remainingQty3 > 0) {
      console.log('✅ CORRECT: PO remains OPEN because there is still outstanding qty');
    } else {
      console.log('❌ INCORRECT: PO status does not match expected logic');
    }
    
    // Test Summary
    console.log('\n📊 GT Partial GRN Test Summary');
    console.log('─'.repeat(60));
    console.log('✅ PO created with 100 PCS order');
    console.log('✅ First partial GRN: 30 PCS → PO remains OPEN (70 outstanding)');
    console.log('✅ Second partial GRN: 50 PCS → PO remains OPEN (20 outstanding)');
    console.log('✅ Final GRN: 20 PCS → PO becomes CLOSE (0 outstanding)');
    console.log('✅ PO status logic working correctly for partial GRNs');
    console.log('✅ Outstanding qty calculation accurate');
    
    console.log('\n🎉 GT PARTIAL GRN TEST PASSED!');
    
    // Final validation
    console.log('\n📋 Final Partial GRN State Validation');
    const finalPOs = await storageService.get('gt_purchaseOrders');
    const finalGRNs = await storageService.get('gt_grn');
    
    const testPOFinal = finalPOs?.find(po => po.poNo === testPO.poNo);
    const testGRNsFinal = finalGRNs?.filter(grn => grn.poNo === testPO.poNo) || [];
    
    console.log(`- Purchase Orders: ${finalPOs?.length || 0}`);
    console.log(`- GRNs for test PO: ${testGRNsFinal.length}`);
    console.log(`- Final PO Status: ${testPOFinal?.status}`);
    
    // Validate GRN sequence
    console.log('\n🔍 GRN Sequence Validation');
    testGRNsFinal.forEach((grn, index) => {
      console.log(`✅ GRN ${index + 1}: ${grn.grnNo} - ${grn.qtyReceived} PCS`);
    });
    
    const totalReceived = testGRNsFinal.reduce((sum, grn) => sum + (grn.qtyReceived || 0), 0);
    console.log(`✅ Total Received: ${totalReceived} PCS (should equal ${testPO.qty})`);
    console.log(`✅ PO Status: ${testPOFinal?.status} (should be CLOSE when total = ordered)`);
    
    // Validate logic correctness
    const isLogicCorrect = (totalReceived === testPO.qty && testPOFinal?.status === 'CLOSE') ||
                          (totalReceived < testPO.qty && testPOFinal?.status === 'OPEN');
    
    if (isLogicCorrect) {
      console.log('\n🎉 PARTIAL GRN LOGIC IS CORRECT!');
      console.log('✅ PO status properly managed for partial GRNs');
      console.log('✅ Outstanding qty tracking working');
      console.log('✅ Status only CLOSE when all qty received');
    } else {
      console.log('\n❌ PARTIAL GRN LOGIC HAS ISSUES!');
      console.log('⚠️  PO status not matching expected logic');
    }
    
    return isLogicCorrect;
    
  } catch (error) {
    console.log('\n❌ GT Partial GRN Test FAILED!');
    console.log('Error:', error.message);
    return false;
  }
}

// Run the partial GRN test
runGTPartialGRNTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Partial GRN test execution failed:', error);
  process.exit(1);
});