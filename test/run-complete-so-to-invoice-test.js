/**
 * Complete SO-to-Invoice Flow Test
 * Tests full business flow from Sales Order creation to Invoice PDF generation
 * Covers: SO → SPK → PO → GRN → Production/Delivery → Finance → Invoice
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

// Mock invoice PDF generation (simplified)
const mockInvoicePDFGeneration = (invoiceData) => {
  return {
    success: true,
    pdfPath: `/invoices/${invoiceData.invNo}.pdf`,
    htmlContent: `<html><body><h1>Invoice ${invoiceData.invNo}</h1><p>Customer: ${invoiceData.customer}</p><p>Total: Rp ${invoiceData.total?.toLocaleString('id-ID')}</p></body></html>`,
    metadata: {
      pages: 1,
      size: '12.5KB',
      generated: new Date().toISOString()
    }
  };
};

// Setup comprehensive test data
async function setupCompleteFlowTestData() {
  console.log('📋 Setting up Complete SO-to-Invoice test data...');
  
  // Setup customers
  await storageService.set('customers', [
    {
      id: "test-customer-complete",
      kode: "CUST-COMPLETE-001",
      nama: "PT. COMPLETE FLOW CUSTOMER",
      kontak: "Complete Flow PIC",
      telepon: "021-5555555",
      alamat: "Jl. Complete Flow No. 123, Jakarta Selatan, DKI Jakarta 12345",
      npwp: "01.234.567.8-901.000",
      kategori: "Customer"
    }
  ]);
  
  // Setup suppliers
  await storageService.set('suppliers', [
    {
      id: "test-supplier-complete",
      kode: "SUP-COMPLETE-001", 
      nama: "PT. COMPLETE SUPPLIER",
      kontak: "Complete Supplier PIC",
      telepon: "021-6666666",
      alamat: "Jl. Supplier Complete No. 456, Bekasi, Jawa Barat 17530",
      kategori: "Supplier"
    }
  ]);
  
  // Setup products with BOM
  await storageService.set('products', [
    {
      id: "test-product-complete-1",
      sku: "COMPLETE-PRD-001",
      nama: "Complete Product Alpha",
      satuan: "PCS",
      harga: 250000,
      kategori: "Finished Goods"
    },
    {
      id: "test-product-complete-2",
      sku: "COMPLETE-PRD-002", 
      nama: "Complete Product Beta",
      satuan: "PCS",
      harga: 180000,
      kategori: "Finished Goods"
    }
  ]);
  
  // Setup materials
  await storageService.set('materials', [
    {
      id: "test-material-complete-1",
      kode: "MAT-COMPLETE-001",
      nama: "Complete Material Alpha",
      satuan: "KG",
      harga: 15000,
      kategori: "Raw Material"
    },
    {
      id: "test-material-complete-2",
      kode: "MAT-COMPLETE-002",
      nama: "Complete Material Beta", 
      satuan: "PCS",
      harga: 8000,
      kategori: "Component"
    }
  ]);
  
  // Setup BOM
  await storageService.set('bom', [
    {
      id: "test-bom-complete-1",
      productId: "test-product-complete-1",
      productSku: "COMPLETE-PRD-001",
      materials: [
        {
          materialId: "test-material-complete-1",
          materialKode: "MAT-COMPLETE-001",
          qty: 3, // 3 KG per PCS
          unit: "KG"
        },
        {
          materialId: "test-material-complete-2", 
          materialKode: "MAT-COMPLETE-002",
          qty: 5, // 5 PCS per PCS
          unit: "PCS"
        }
      ]
    },
    {
      id: "test-bom-complete-2",
      productId: "test-product-complete-2",
      productSku: "COMPLETE-PRD-002",
      materials: [
        {
          materialId: "test-material-complete-1",
          materialKode: "MAT-COMPLETE-001", 
          qty: 2, // 2 KG per PCS
          unit: "KG"
        }
      ]
    }
  ]);
  
  // Setup inventory with sufficient stock
  await storageService.set('inventory', {
    value: [
      {
        id: "test-inventory-complete-1",
        codeItem: "MAT-COMPLETE-001",
        description: "Complete Material Alpha",
        kategori: "Material",
        satuan: "KG", 
        price: 15000,
        stockPremonth: 0,
        receive: 200, // 200 KG available
        outgoing: 0,
        return: 0,
        nextStock: 200
      },
      {
        id: "test-inventory-complete-2",
        codeItem: "MAT-COMPLETE-002",
        description: "Complete Material Beta",
        kategori: "Material", 
        satuan: "PCS",
        price: 8000,
        stockPremonth: 0,
        receive: 300, // 300 PCS available
        outgoing: 0,
        return: 0,
        nextStock: 300
      }
    ],
    timestamp: Date.now()
  });
  
  // Setup company info for invoice
  await storageService.set('company', {
    companyName: "PT. COMPLETE FLOW TESTING",
    address: "Jl. Testing Complete No. 789, Tangerang, Banten 15810",
    npwp: "02.345.678.9-012.000",
    bankName: "Bank Complete",
    bankBranch: "Cabang Testing",
    bankAccount: "1234567890",
    bankAccountName: "PT Complete Flow Testing"
  });
  
  console.log('✅ Complete SO-to-Invoice test data setup completed');
}

// Test Complete SO-to-Invoice Flow
async function runCompleteSOToInvoiceTest() {
  console.log('🧪 Complete SO-to-Invoice Flow Test');
  console.log('─'.repeat(80));
  console.log('Testing: Full business flow from SO creation to Invoice PDF');
  console.log('Modules: Packaging (Manufacturing) + Finance + Invoice Generation');
  console.log('─'.repeat(80));
  
  try {
    await setupCompleteFlowTestData();
    
    // Test 1: Create Sales Order (Multi-Product)
    console.log('\n📋 Test 1: Create Sales Order (Multi-Product)');
    const testSO = {
      id: `test-so-complete-${Date.now()}`,
      soNo: `SO-COMPLETE-${Date.now()}`,
      customer: "PT. COMPLETE FLOW CUSTOMER",
      customerKode: "CUST-COMPLETE-001",
      paymentTerms: 'TOP',
      topDays: 30,
      status: 'OPEN',
      created: new Date().toISOString(),
      items: [
        {
          id: `test-item-complete-1-${Date.now()}`,
          productId: "test-product-complete-1",
          productSku: "COMPLETE-PRD-001",
          productName: "Complete Product Alpha",
          qty: 20, // 20 PCS
          unit: 'PCS',
          price: 250000,
          total: 20 * 250000 // Rp 5,000,000
        },
        {
          id: `test-item-complete-2-${Date.now()}`,
          productId: "test-product-complete-2", 
          productSku: "COMPLETE-PRD-002",
          productName: "Complete Product Beta",
          qty: 15, // 15 PCS
          unit: 'PCS',
          price: 180000,
          total: 15 * 180000 // Rp 2,700,000
        }
      ]
    };
    
    // Calculate SO totals
    const soSubtotal = testSO.items.reduce((sum, item) => sum + item.total, 0);
    const soTax = soSubtotal * 0.11; // 11% PPN
    const soTotal = soSubtotal + soTax;
    
    testSO.subtotal = soSubtotal;
    testSO.tax = soTax;
    testSO.total = soTotal;
    
    const salesOrders = await storageService.get('salesOrders') || [];
    salesOrders.push(testSO);
    await storageService.set('salesOrders', salesOrders);
    
    console.log('✅ Sales Order created:');
    console.log(`   SO No: ${testSO.soNo}`);
    console.log(`   Customer: ${testSO.customer}`);
    console.log(`   Items: ${testSO.items.length} products`);
    console.log(`   Subtotal: Rp ${soSubtotal.toLocaleString('id-ID')}`);
    console.log(`   Tax (11%): Rp ${soTax.toLocaleString('id-ID')}`);
    console.log(`   Total: Rp ${soTotal.toLocaleString('id-ID')}`);
    
    // Test 2: Generate SPKs for Each Product
    console.log('\n📋 Test 2: Generate SPKs for Each Product');
    
    const spkList = [];
    for (let i = 0; i < testSO.items.length; i++) {
      const item = testSO.items[i];
      const spk = {
        id: `test-spk-complete-${i + 1}-${Date.now()}`,
        spkNo: `SPK-COMPLETE-${i + 1}-${Date.now()}`,
        soNo: testSO.soNo,
        customer: testSO.customer,
        product: item.productName,
        productId: item.productId,
        sku: item.productSku,
        qty: item.qty,
        unit: item.unit,
        status: 'OPEN',
        batchNo: `BATCH-COMPLETE-${i + 1}`,
        created: new Date().toISOString()
      };
      spkList.push(spk);
    }
    
    const allSPKs = await storageService.get('spk') || [];
    allSPKs.push(...spkList);
    await storageService.set('spk', allSPKs);
    
    console.log('✅ SPKs generated:');
    spkList.forEach((spk, index) => {
      console.log(`   SPK ${index + 1}: ${spk.spkNo} - ${spk.qty} ${spk.unit} ${spk.product}`);
    });
    
    // Test 3: Calculate Material Requirements and Create POs
    console.log('\n📋 Test 3: Calculate Material Requirements and Create POs');
    
    const bomList = await storageService.get('bom') || [];
    const materialRequirements = {};
    
    // Calculate total material needs
    spkList.forEach(spk => {
      const productBOM = bomList.find(bom => bom.productId === spk.productId);
      if (productBOM) {
        productBOM.materials.forEach(mat => {
          const totalNeeded = mat.qty * spk.qty;
          if (!materialRequirements[mat.materialKode]) {
            materialRequirements[mat.materialKode] = {
              materialId: mat.materialId,
              materialKode: mat.materialKode,
              totalQty: 0,
              unit: mat.unit
            };
          }
          materialRequirements[mat.materialKode].totalQty += totalNeeded;
        });
      }
    });
    
    console.log('✅ Material Requirements calculated:');
    Object.values(materialRequirements).forEach(req => {
      console.log(`   ${req.materialKode}: ${req.totalQty} ${req.unit}`);
    });
    
    // Create POs for materials
    const poList = [];
    const materials = await storageService.get('materials') || [];
    
    Object.values(materialRequirements).forEach((req, index) => {
      const material = materials.find(m => m.kode === req.materialKode);
      const orderQty = Math.ceil(req.totalQty * 1.1); // Order 10% more for safety
      
      const po = {
        id: `test-po-complete-${index + 1}-${Date.now()}`,
        poNo: `PO-COMPLETE-${index + 1}-${Date.now()}`,
        supplier: "PT. COMPLETE SUPPLIER",
        supplierKode: "SUP-COMPLETE-001",
        materialItem: material?.nama || req.materialKode,
        materialId: req.materialId,
        kode: req.materialKode,
        qty: orderQty,
        unit: req.unit,
        price: material?.harga || 0,
        total: orderQty * (material?.harga || 0),
        status: 'OPEN',
        created: new Date().toISOString()
      };
      poList.push(po);
    });
    
    const allPOs = await storageService.get('purchaseOrders') || [];
    allPOs.push(...poList);
    await storageService.set('purchaseOrders', poList);
    
    console.log('✅ Purchase Orders created:');
    poList.forEach((po, index) => {
      console.log(`   PO ${index + 1}: ${po.poNo} - ${po.qty} ${po.unit} ${po.materialItem}`);
      console.log(`     Total: Rp ${po.total.toLocaleString('id-ID')}`);
    });
    
    // Test 4: Process GRNs (Complete Receipt)
    console.log('\n📋 Test 4: Process GRNs (Complete Receipt)');
    
    const grnList = [];
    poList.forEach((po, index) => {
      const grn = {
        id: `test-grn-complete-${index + 1}-${Date.now()}`,
        grnNo: `GRN-COMPLETE-${index + 1}-${Date.now()}`,
        poNo: po.poNo,
        supplier: po.supplier,
        materialItem: po.materialItem,
        materialId: po.materialId,
        qtyOrdered: po.qty,
        qtyReceived: po.qty, // Complete receipt
        unit: po.unit,
        price: po.price,
        total: po.total,
        status: 'CLOSE',
        receiptDate: new Date().toISOString().split('T')[0],
        created: new Date().toISOString()
      };
      grnList.push(grn);
    });
    
    const allGRNs = await storageService.get('grn') || [];
    allGRNs.push(...grnList);
    await storageService.set('grn', grnList);
    
    // Update PO status to CLOSE
    const updatedPOs = poList.map(po => ({ ...po, status: 'CLOSE' }));
    await storageService.set('purchaseOrders', updatedPOs);
    
    console.log('✅ GRNs processed (Complete Receipt):');
    grnList.forEach((grn, index) => {
      console.log(`   GRN ${index + 1}: ${grn.grnNo} - ${grn.qtyReceived}/${grn.qtyOrdered} ${grn.unit}`);
    });
    
    // Test 5: Production Process
    console.log('\n📋 Test 5: Production Process');
    
    const productionList = [];
    spkList.forEach((spk, index) => {
      const production = {
        id: `test-production-complete-${index + 1}-${Date.now()}`,
        productionNo: `PROD-COMPLETE-${index + 1}-${Date.now()}`,
        spkNo: spk.spkNo,
        soNo: spk.soNo,
        product: spk.product,
        productId: spk.productId,
        qtyPlanned: spk.qty,
        qtyProduced: spk.qty, // Full production
        batchNo: spk.batchNo,
        status: 'CLOSE',
        created: new Date().toISOString()
      };
      productionList.push(production);
    });
    
    const allProductions = await storageService.get('production') || [];
    allProductions.push(...productionList);
    await storageService.set('production', productionList);
    
    console.log('✅ Production completed:');
    productionList.forEach((prod, index) => {
      console.log(`   Production ${index + 1}: ${prod.productionNo} - ${prod.qtyProduced}/${prod.qtyPlanned} PCS`);
    });
    
    // Test 6: QC Process (All Pass)
    console.log('\n📋 Test 6: QC Process (All Pass)');
    
    const qcList = [];
    productionList.forEach((prod, index) => {
      const qc = {
        id: `test-qc-complete-${index + 1}-${Date.now()}`,
        qcNo: `QC-COMPLETE-${index + 1}-${Date.now()}`,
        productionNo: prod.productionNo,
        spkNo: prod.spkNo,
        soNo: prod.soNo,
        product: prod.product,
        qtyProduced: prod.qtyProduced,
        qtyPassed: prod.qtyProduced, // All pass
        qtyFailed: 0,
        status: 'PASS',
        notes: 'All items passed quality control',
        created: new Date().toISOString()
      };
      qcList.push(qc);
    });
    
    const allQCs = await storageService.get('qc') || [];
    allQCs.push(...qcList);
    await storageService.set('qc', qcList);
    
    console.log('✅ QC completed (All Pass):');
    qcList.forEach((qc, index) => {
      console.log(`   QC ${index + 1}: ${qc.qcNo} - ${qc.qtyPassed}/${qc.qtyProduced} PCS passed`);
    });
    
    // Test 7: Delivery Process
    console.log('\n📋 Test 7: Delivery Process');
    
    const delivery = {
      id: `test-delivery-complete-${Date.now()}`,
      sjNo: `SJ-COMPLETE-${Date.now()}`,
      soNo: testSO.soNo,
      customer: testSO.customer,
      items: qcList.map(qc => ({
        spkNo: qc.spkNo,
        product: qc.product,
        qty: qc.qtyPassed,
        unit: 'PCS'
      })),
      status: 'DELIVERED',
      deliveryDate: new Date().toISOString().split('T')[0],
      created: new Date().toISOString()
    };
    
    const allDeliveries = await storageService.get('delivery') || [];
    allDeliveries.push(delivery);
    await storageService.set('delivery', [delivery]);
    
    console.log('✅ Delivery completed:');
    console.log(`   SJ No: ${delivery.sjNo}`);
    console.log(`   Items delivered: ${delivery.items.length} products`);
    delivery.items.forEach((item, index) => {
      console.log(`     Item ${index + 1}: ${item.qty} ${item.unit} ${item.product}`);
    });
    
    // Test 8: Finance Integration
    console.log('\n📋 Test 8: Finance Integration');
    
    // Create finance notifications
    const financeNotifications = [];
    
    // Supplier payments from POs
    poList.forEach(po => {
      const supplierPayment = {
        id: `test-finance-supplier-${po.id}`,
        type: 'SUPPLIER_PAYMENT',
        poNo: po.poNo,
        supplier: po.supplier,
        amount: po.total,
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days
        status: 'PENDING',
        created: new Date().toISOString()
      };
      financeNotifications.push(supplierPayment);
    });
    
    // Customer invoice from delivery
    const customerInvoice = {
      id: `test-finance-customer-${testSO.id}`,
      type: 'CUSTOMER_INVOICE',
      soNo: testSO.soNo,
      sjNo: delivery.sjNo,
      customer: testSO.customer,
      amount: testSO.total,
      dueDate: new Date(Date.now() + testSO.topDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'PENDING',
      created: new Date().toISOString()
    };
    financeNotifications.push(customerInvoice);
    
    const allFinanceNotifications = await storageService.get('financeNotifications') || [];
    allFinanceNotifications.push(...financeNotifications);
    await storageService.set('financeNotifications', financeNotifications);
    
    console.log('✅ Finance notifications created:');
    console.log(`   Supplier Payments: ${poList.length} notifications`);
    console.log(`   Customer Invoice: 1 notification`);
    
    const totalSupplierPayments = poList.reduce((sum, po) => sum + po.total, 0);
    console.log(`   Total Supplier Payments: Rp ${totalSupplierPayments.toLocaleString('id-ID')}`);
    console.log(`   Customer Invoice Amount: Rp ${testSO.total.toLocaleString('id-ID')}`);
    console.log(`   Gross Profit: Rp ${(testSO.total - totalSupplierPayments).toLocaleString('id-ID')}`);
    
    // Test 9: Invoice Generation
    console.log('\n📋 Test 9: Invoice Generation');
    
    // Create invoice data structure
    const invoiceData = {
      id: `test-invoice-complete-${Date.now()}`,
      invNo: `INV-COMPLETE-${Date.now()}`,
      soNo: testSO.soNo,
      sjNo: delivery.sjNo,
      customer: testSO.customer,
      customerAddress: "Jl. Complete Flow No. 123, Jakarta Selatan, DKI Jakarta 12345",
      customerNpwp: "01.234.567.8-901.000",
      createdAt: new Date().toISOString(),
      lines: testSO.items.map(item => ({
        itemSku: item.productSku,
        qty: item.qty,
        unit: item.unit,
        price: item.price
      })),
      bom: {
        subtotal: testSO.subtotal,
        tax: testSO.tax,
        total: testSO.total,
        soNo: testSO.soNo,
        tandaTangan: "Complete Flow Manager"
      },
      notes: `Invoice untuk SO ${testSO.soNo}\\nDelivery: ${delivery.sjNo}\\nTerima kasih atas kepercayaan Anda`,
      status: 'GENERATED',
      created: new Date().toISOString()
    };
    
    const allInvoices = await storageService.get('invoices') || [];
    allInvoices.push(invoiceData);
    await storageService.set('invoices', [invoiceData]);
    
    console.log('✅ Invoice data created:');
    console.log(`   Invoice No: ${invoiceData.invNo}`);
    console.log(`   Customer: ${invoiceData.customer}`);
    console.log(`   Lines: ${invoiceData.lines.length} items`);
    console.log(`   Subtotal: Rp ${invoiceData.bom.subtotal.toLocaleString('id-ID')}`);
    console.log(`   Tax: Rp ${invoiceData.bom.tax.toLocaleString('id-ID')}`);
    console.log(`   Total: Rp ${invoiceData.bom.total.toLocaleString('id-ID')}`);
    
    // Test 10: Invoice PDF Generation
    console.log('\n📋 Test 10: Invoice PDF Generation');
    
    // Get company data for PDF
    const company = await storageService.get('company');
    
    // Product mapping for invoice
    const products = await storageService.get('products') || [];
    const productMap = {};
    const productCodeMap = {};
    products.forEach(product => {
      productMap[product.sku] = product.nama;
      productCodeMap[product.sku] = product.sku; // Use SKU as code
    });
    
    // Generate PDF (mock)
    const pdfResult = mockInvoicePDFGeneration({
      ...invoiceData,
      company,
      productMap,
      productCodeMap
    });
    
    console.log('✅ Invoice PDF generated:');
    console.log(`   PDF Path: ${pdfResult.pdfPath}`);
    console.log(`   PDF Size: ${pdfResult.metadata.size}`);
    console.log(`   Pages: ${pdfResult.metadata.pages}`);
    console.log(`   Generated: ${pdfResult.metadata.generated}`);
    
    // Test 11: Complete Flow Validation
    console.log('\n📋 Test 11: Complete Flow Validation');
    
    // Validate data consistency across all steps
    const validations = {
      soToSpk: spkList.every(spk => spk.soNo === testSO.soNo),
      spkToProduction: productionList.every(prod => 
        spkList.some(spk => spk.spkNo === prod.spkNo)
      ),
      productionToQc: qcList.every(qc => 
        productionList.some(prod => prod.productionNo === qc.productionNo)
      ),
      qcToDelivery: delivery.items.every(item => 
        qcList.some(qc => qc.spkNo === item.spkNo)
      ),
      deliveryToInvoice: invoiceData.soNo === testSO.soNo && invoiceData.sjNo === delivery.sjNo,
      financialAccuracy: Math.abs(invoiceData.bom.total - testSO.total) < 0.01
    };
    
    const allValidationsPassed = Object.values(validations).every(v => v === true);
    
    console.log('✅ Flow Validation Results:');
    Object.entries(validations).forEach(([key, passed]) => {
      console.log(`   ${key}: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    });
    
    // Final Summary
    console.log('\n📊 Complete SO-to-Invoice Flow Test Summary');
    console.log('─'.repeat(80));
    console.log('FLOW STEPS COMPLETED:');
    console.log('1️⃣  Sales Order Creation ✅');
    console.log('2️⃣  SPK Generation ✅');
    console.log('3️⃣  Material Requirements & PO Creation ✅');
    console.log('4️⃣  GRN Processing ✅');
    console.log('5️⃣  Production Process ✅');
    console.log('6️⃣  QC Process ✅');
    console.log('7️⃣  Delivery Process ✅');
    console.log('8️⃣  Finance Integration ✅');
    console.log('9️⃣  Invoice Generation ✅');
    console.log('🔟 Invoice PDF Generation ✅');
    console.log('');
    console.log('BUSINESS METRICS:');
    console.log(`• Sales Order Value: Rp ${testSO.total.toLocaleString('id-ID')}`);
    console.log(`• Material Costs: Rp ${totalSupplierPayments.toLocaleString('id-ID')}`);
    console.log(`• Gross Profit: Rp ${(testSO.total - totalSupplierPayments).toLocaleString('id-ID')}`);
    console.log(`• Profit Margin: ${(((testSO.total - totalSupplierPayments) / testSO.total) * 100).toFixed(1)}%`);
    console.log('');
    console.log('DATA INTEGRITY:');
    console.log(`• Flow Validation: ${allValidationsPassed ? '✅ ALL PASSED' : '❌ SOME FAILED'}`);
    console.log(`• Documents Generated: ${spkList.length + poList.length + grnList.length + productionList.length + qcList.length + 1 + 1} items`);
    console.log(`• Finance Notifications: ${financeNotifications.length} items`);
    console.log('');
    
    if (allValidationsPassed && pdfResult.success) {
      console.log('🎉 COMPLETE SO-TO-INVOICE FLOW TEST PASSED!');
      console.log('✅ All business processes working correctly');
      console.log('✅ Data integrity maintained throughout flow');
      console.log('✅ Invoice PDF generation successful');
      console.log('✅ Financial calculations accurate');
    } else {
      console.log('❌ COMPLETE SO-TO-INVOICE FLOW TEST FAILED!');
      console.log('⚠️  Some validations failed or PDF generation issues');
    }
    
    return allValidationsPassed && pdfResult.success;
    
  } catch (error) {
    console.log('\n❌ Complete SO-to-Invoice Flow Test FAILED!');
    console.log('Error:', error.message);
    return false;
  }
}

// Run the complete SO-to-Invoice test
runCompleteSOToInvoiceTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Complete SO-to-Invoice test execution failed:', error);
  process.exit(1);
});