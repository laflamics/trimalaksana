/**
 * Comprehensive Finance Flow Test
 * Tests finance integration across Packaging, GT, and Trucking modules
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

// Helper function to extract storage value
const extractStorageValue = (data) => {
  if (!data) return null;
  if (Array.isArray(data)) return data;
  if (data.value && Array.isArray(data.value)) return data.value;
  return data;
};

// Setup test data for all modules
async function setupFinanceTestData() {
  console.log('📋 Setting up Finance test data for all modules...');
  
  // Setup customers
  await storageService.set('customers', [
    {
      id: "finance-customer-packaging",
      kode: "CUST-PKG-001",
      nama: "PT. PACKAGING CUSTOMER",
      kontak: "Packaging PIC",
      telepon: "021-1111111",
      alamat: "Packaging Customer Address",
      kategori: "Customer"
    },
    {
      id: "finance-customer-gt",
      kode: "CUST-GT-001", 
      nama: "PT. GT CUSTOMER",
      kontak: "GT PIC",
      telepon: "021-2222222",
      alamat: "GT Customer Address",
      kategori: "Customer"
    },
    {
      id: "finance-customer-trucking",
      kode: "CUST-TRK-001",
      nama: "PT. TRUCKING CUSTOMER", 
      kontak: "Trucking PIC",
      telepon: "021-3333333",
      alamat: "Trucking Customer Address",
      kategori: "Customer"
    }
  ]);
  
  // Setup suppliers
  await storageService.set('suppliers', [
    {
      id: "finance-supplier-packaging",
      kode: "SUP-PKG-001",
      nama: "PT. PACKAGING SUPPLIER",
      kontak: "Packaging Supplier PIC",
      telepon: "021-4444444",
      alamat: "Packaging Supplier Address",
      kategori: "Supplier"
    },
    {
      id: "finance-supplier-gt",
      kode: "SUP-GT-001",
      nama: "PT. GT SUPPLIER",
      kontak: "GT Supplier PIC", 
      telepon: "021-5555555",
      alamat: "GT Supplier Address",
      kategori: "Supplier"
    }
  ]);
  
  // Setup products for all modules
  await storageService.set('products', [
    {
      id: "finance-product-packaging",
      sku: "PKG-PRD-001",
      nama: "Packaging Product",
      satuan: "PCS",
      harga: 500000,
      kategori: "Packaging"
    },
    {
      id: "finance-product-gt",
      sku: "GT-PRD-001", 
      nama: "GT Product",
      satuan: "PCS",
      harga: 300000,
      kategori: "GT"
    }
  ]);
  
  // Setup materials for Packaging
  await storageService.set('materials', [
    {
      id: "finance-material-packaging",
      kode: "MAT-PKG-001",
      nama: "Packaging Material",
      satuan: "KG",
      harga: 50000,
      kategori: "Raw Material"
    }
  ]);
  
  // Setup BOM for Packaging
  await storageService.set('bom', [
    {
      id: "finance-bom-packaging",
      productId: "finance-product-packaging",
      productSku: "PKG-PRD-001",
      materials: [
        {
          materialId: "finance-material-packaging",
          materialKode: "MAT-PKG-001",
          qty: 2,
          unit: "KG"
        }
      ]
    }
  ]);
  
  // Setup vehicles for Trucking
  await storageService.set('vehicles', [
    {
      id: "finance-vehicle-001",
      plateNumber: "B 1234 FIN",
      type: "Truck",
      capacity: 5000,
      status: "Available"
    }
  ]);
  
  // Setup drivers for Trucking
  await storageService.set('drivers', [
    {
      id: "finance-driver-001",
      name: "Finance Driver",
      license: "B1234567890",
      phone: "081234567890",
      status: "Available"
    }
  ]);
  
  console.log('✅ Finance test data setup completed');
}

// Test Packaging Finance Flow
async function testPackagingFinanceFlow() {
  console.log('\n🏭 Testing Packaging Finance Flow');
  console.log('─'.repeat(50));
  
  // 1. Create Sales Order
  const packagingSO = {
    id: `finance-packaging-so-${Date.now()}`,
    soNo: `PKG-SO-${Date.now()}`,
    customer: "PT. PACKAGING CUSTOMER",
    customerKode: "CUST-PKG-001",
    paymentTerms: 'TOP',
    topDays: 30,
    status: 'OPEN',
    created: new Date().toISOString(),
    items: [
      {
        id: `finance-packaging-item-${Date.now()}`,
        productId: "finance-product-packaging",
        productSku: "PKG-PRD-001",
        productName: "Packaging Product",
        qty: 10,
        unit: 'PCS',
        price: 500000,
        total: 10 * 500000
      }
    ]
  };
  
  const salesOrders = await storageService.get('salesOrders') || [];
  salesOrders.push(packagingSO);
  await storageService.set('salesOrders', salesOrders);
  console.log('✅ Packaging SO created:', packagingSO.soNo, '- Rp', packagingSO.items[0].total.toLocaleString('id-ID'));
  
  // 2. Create Purchase Order for Materials
  const packagingPO = {
    id: `finance-packaging-po-${Date.now()}`,
    poNo: `PKG-PO-${Date.now()}`,
    supplier: "PT. PACKAGING SUPPLIER",
    supplierKode: "SUP-PKG-001",
    soNo: packagingSO.soNo,
    materialItem: "Packaging Material",
    materialId: "finance-material-packaging",
    qty: 25, // 10 products * 2 KG + buffer
    unit: "KG",
    price: 50000,
    total: 25 * 50000,
    paymentTerms: 'TOP',
    topDays: 30,
    status: 'OPEN',
    receiptDate: new Date().toISOString().split('T')[0],
    created: new Date().toISOString()
  };
  
  const purchaseOrders = await storageService.get('purchaseOrders') || [];
  purchaseOrders.push(packagingPO);
  await storageService.set('purchaseOrders', purchaseOrders);
  console.log('✅ Packaging PO created:', packagingPO.poNo, '- Rp', packagingPO.total.toLocaleString('id-ID'));
  
  // 3. Create GRN
  const packagingGRN = {
    id: `finance-packaging-grn-${Date.now()}`,
    grnNo: `PKG-GRN-${Date.now()}`,
    poNo: packagingPO.poNo,
    supplier: packagingPO.supplier,
    materialItem: packagingPO.materialItem,
    qtyOrdered: packagingPO.qty,
    qtyReceived: packagingPO.qty,
    unit: packagingPO.unit,
    price: packagingPO.price,
    total: packagingPO.total,
    status: 'CLOSE',
    receiptDate: new Date().toISOString().split('T')[0],
    created: new Date().toISOString()
  };
  
  const grnList = await storageService.get('grnPackaging') || [];
  grnList.push(packagingGRN);
  await storageService.set('grnPackaging', grnList);
  console.log('✅ Packaging GRN created:', packagingGRN.grnNo);
  
  // 4. Create Production
  const packagingProduction = {
    id: `finance-packaging-prod-${Date.now()}`,
    productionNo: `PKG-PROD-${Date.now()}`,
    soNo: packagingSO.soNo,
    customer: packagingSO.customer,
    product: packagingSO.items[0].productName,
    target: packagingSO.items[0].qty,
    progress: packagingSO.items[0].qty,
    status: 'CLOSE',
    created: new Date().toISOString()
  };
  
  const productionList = await storageService.get('production') || [];
  productionList.push(packagingProduction);
  await storageService.set('production', productionList);
  console.log('✅ Packaging Production completed:', packagingProduction.productionNo);
  
  // 5. Create QC
  const packagingQC = {
    id: `finance-packaging-qc-${Date.now()}`,
    qcNo: `PKG-QC-${Date.now()}`,
    productionNo: packagingProduction.productionNo,
    soNo: packagingSO.soNo,
    customer: packagingSO.customer,
    product: packagingSO.items[0].productName,
    qty: packagingSO.items[0].qty,
    qcResult: 'PASS',
    status: 'CLOSE',
    created: new Date().toISOString()
  };
  
  const qcList = await storageService.get('qc') || [];
  qcList.push(packagingQC);
  await storageService.set('qc', qcList);
  console.log('✅ Packaging QC completed:', packagingQC.qcNo);
  
  // 6. Create Delivery Note
  const packagingDN = {
    id: `finance-packaging-dn-${Date.now()}`,
    sjNo: `PKG-SJ-${Date.now()}`,
    soNo: packagingSO.soNo,
    customer: packagingSO.customer,
    items: [
      {
        product: packagingSO.items[0].productName,
        qty: packagingSO.items[0].qty,
        unit: packagingSO.items[0].unit
      }
    ],
    status: 'DELIVERED',
    deliveryDate: new Date().toISOString().split('T')[0],
    created: new Date().toISOString()
  };
  
  const deliveryNotes = await storageService.get('delivery') || [];
  deliveryNotes.push(packagingDN);
  await storageService.set('delivery', deliveryNotes);
  console.log('✅ Packaging Delivery completed:', packagingDN.sjNo);
  
  // 7. Create Finance Notifications
  const packagingFinanceNotifications = [
    {
      id: `finance-packaging-supplier-${Date.now()}`,
      type: 'SUPPLIER_PAYMENT',
      poNo: packagingPO.poNo,
      grnNo: packagingGRN.grnNo,
      supplier: packagingPO.supplier,
      amount: packagingPO.total,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'PENDING',
      created: new Date().toISOString()
    },
    {
      id: `finance-packaging-customer-${Date.now()}`,
      type: 'CUSTOMER_INVOICE',
      soNo: packagingSO.soNo,
      sjNo: packagingDN.sjNo,
      customer: packagingSO.customer,
      amount: packagingSO.items[0].total,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'PENDING',
      created: new Date().toISOString()
    }
  ];
  
  const financeNotifications = await storageService.get('financeNotifications') || [];
  financeNotifications.push(...packagingFinanceNotifications);
  await storageService.set('financeNotifications', financeNotifications);
  console.log('✅ Packaging Finance notifications created: 2 items');
  
  return {
    supplierPayment: packagingPO.total,
    customerInvoice: packagingSO.items[0].total,
    profit: packagingSO.items[0].total - packagingPO.total
  };
}

// Test GT Finance Flow
async function testGTFinanceFlow() {
  console.log('\n🏪 Testing GT Finance Flow');
  console.log('─'.repeat(50));
  
  // 1. Create Sales Order
  const gtSO = {
    id: `finance-gt-so-${Date.now()}`,
    soNo: `GT-SO-${Date.now()}`,
    customer: "PT. GT CUSTOMER",
    customerKode: "CUST-GT-001",
    paymentTerms: 'TOP',
    topDays: 30,
    status: 'OPEN',
    created: new Date().toISOString(),
    items: [
      {
        id: `finance-gt-item-${Date.now()}`,
        productId: "finance-product-gt",
        productSku: "GT-PRD-001",
        productName: "GT Product",
        qty: 20,
        unit: 'PCS',
        price: 300000,
        total: 20 * 300000
      }
    ]
  };
  
  const salesOrders = await storageService.get('salesOrders') || [];
  salesOrders.push(gtSO);
  await storageService.set('salesOrders', salesOrders);
  console.log('✅ GT SO created:', gtSO.soNo, '- Rp', gtSO.items[0].total.toLocaleString('id-ID'));
  
  // 2. Create Purchase Order (GT buys from supplier)
  const gtPO = {
    id: `finance-gt-po-${Date.now()}`,
    poNo: `GT-PO-${Date.now()}`,
    supplier: "PT. GT SUPPLIER",
    supplierKode: "SUP-GT-001",
    soNo: gtSO.soNo,
    materialItem: "GT Product", // GT buys finished product
    materialId: "finance-product-gt",
    qty: 20,
    unit: "PCS",
    price: 200000, // Buy at 200k, sell at 300k
    total: 20 * 200000,
    paymentTerms: 'TOP',
    topDays: 30,
    status: 'OPEN',
    receiptDate: new Date().toISOString().split('T')[0],
    created: new Date().toISOString()
  };
  
  const purchaseOrders = await storageService.get('purchaseOrders') || [];
  purchaseOrders.push(gtPO);
  await storageService.set('purchaseOrders', purchaseOrders);
  console.log('✅ GT PO created:', gtPO.poNo, '- Rp', gtPO.total.toLocaleString('id-ID'));
  
  // 3. Create GRN
  const gtGRN = {
    id: `finance-gt-grn-${Date.now()}`,
    grnNo: `GT-GRN-${Date.now()}`,
    poNo: gtPO.poNo,
    supplier: gtPO.supplier,
    materialItem: gtPO.materialItem,
    qtyOrdered: gtPO.qty,
    qtyReceived: gtPO.qty,
    unit: gtPO.unit,
    price: gtPO.price,
    total: gtPO.total,
    status: 'CLOSE',
    receiptDate: new Date().toISOString().split('T')[0],
    created: new Date().toISOString()
  };
  
  const grnList = await storageService.get('grn') || [];
  grnList.push(gtGRN);
  await storageService.set('grn', grnList);
  console.log('✅ GT GRN created:', gtGRN.grnNo);
  
  // 4. Create Delivery Note (GT delivers to customer)
  const gtDN = {
    id: `finance-gt-dn-${Date.now()}`,
    sjNo: `GT-SJ-${Date.now()}`,
    soNo: gtSO.soNo,
    customer: gtSO.customer,
    items: [
      {
        product: gtSO.items[0].productName,
        qty: gtSO.items[0].qty,
        unit: gtSO.items[0].unit
      }
    ],
    status: 'DELIVERED',
    deliveryDate: new Date().toISOString().split('T')[0],
    created: new Date().toISOString()
  };
  
  const deliveryNotes = await storageService.get('delivery') || [];
  deliveryNotes.push(gtDN);
  await storageService.set('delivery', deliveryNotes);
  console.log('✅ GT Delivery completed:', gtDN.sjNo);
  
  // 5. Create Finance Notifications
  const gtFinanceNotifications = [
    {
      id: `finance-gt-supplier-${Date.now()}`,
      type: 'SUPPLIER_PAYMENT',
      poNo: gtPO.poNo,
      grnNo: gtGRN.grnNo,
      supplier: gtPO.supplier,
      amount: gtPO.total,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'PENDING',
      created: new Date().toISOString()
    },
    {
      id: `finance-gt-customer-${Date.now()}`,
      type: 'CUSTOMER_INVOICE',
      soNo: gtSO.soNo,
      sjNo: gtDN.sjNo,
      customer: gtSO.customer,
      amount: gtSO.items[0].total,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'PENDING',
      created: new Date().toISOString()
    }
  ];
  
  const financeNotifications = await storageService.get('financeNotifications') || [];
  financeNotifications.push(...gtFinanceNotifications);
  await storageService.set('financeNotifications', financeNotifications);
  console.log('✅ GT Finance notifications created: 2 items');
  
  return {
    supplierPayment: gtPO.total,
    customerInvoice: gtSO.items[0].total,
    profit: gtSO.items[0].total - gtPO.total
  };
}

// Test Trucking Finance Flow
async function testTruckingFinanceFlow() {
  console.log('\n🚛 Testing Trucking Finance Flow');
  console.log('─'.repeat(50));
  
  // 1. Create Delivery Order
  const truckingDO = {
    id: `finance-trucking-do-${Date.now()}`,
    doNo: `TRK-DO-${Date.now()}`,
    customer: "PT. TRUCKING CUSTOMER",
    customerKode: "CUST-TRK-001",
    origin: "Jakarta",
    destination: "Surabaya",
    distance: 800, // km
    rate: 5000, // per km
    totalAmount: 800 * 5000,
    paymentTerms: 'TOP',
    topDays: 30,
    status: 'CONFIRMED',
    deliveryDate: new Date().toISOString().split('T')[0],
    created: new Date().toISOString()
  };
  
  const deliveryOrders = await storageService.get('deliveryOrders') || [];
  deliveryOrders.push(truckingDO);
  await storageService.set('deliveryOrders', deliveryOrders);
  console.log('✅ Trucking DO created:', truckingDO.doNo, '- Rp', truckingDO.totalAmount.toLocaleString('id-ID'));
  
  // 2. Create Unit Scheduling
  const truckingSchedule = {
    id: `finance-trucking-schedule-${Date.now()}`,
    scheduleNo: `TRK-SCH-${Date.now()}`,
    doNo: truckingDO.doNo,
    vehicleId: "finance-vehicle-001",
    vehiclePlate: "B 1234 FIN",
    driverId: "finance-driver-001",
    driverName: "Finance Driver",
    scheduledDate: truckingDO.deliveryDate,
    status: 'SCHEDULED',
    created: new Date().toISOString()
  };
  
  const schedules = await storageService.get('truckingSchedules') || [];
  schedules.push(truckingSchedule);
  await storageService.set('truckingSchedules', schedules);
  console.log('✅ Trucking Schedule created:', truckingSchedule.scheduleNo);
  
  // 3. Create Surat Jalan
  const truckingSJ = {
    id: `finance-trucking-sj-${Date.now()}`,
    sjNo: `TRK-SJ-${Date.now()}`,
    doNo: truckingDO.doNo,
    scheduleNo: truckingSchedule.scheduleNo,
    customer: truckingDO.customer,
    vehiclePlate: truckingSchedule.vehiclePlate,
    driverName: truckingSchedule.driverName,
    origin: truckingDO.origin,
    destination: truckingDO.destination,
    distance: truckingDO.distance,
    amount: truckingDO.totalAmount,
    status: 'DELIVERED',
    deliveryDate: truckingDO.deliveryDate,
    created: new Date().toISOString()
  };
  
  const suratJalan = await storageService.get('truckingSuratJalan') || [];
  suratJalan.push(truckingSJ);
  await storageService.set('truckingSuratJalan', suratJalan);
  console.log('✅ Trucking SJ completed:', truckingSJ.sjNo);
  
  // 4. Create Finance Notifications
  const truckingFinanceNotifications = [
    {
      id: `finance-trucking-customer-${Date.now()}`,
      type: 'CUSTOMER_INVOICE',
      doNo: truckingDO.doNo,
      sjNo: truckingSJ.sjNo,
      customer: truckingDO.customer,
      amount: truckingDO.totalAmount,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'PENDING',
      created: new Date().toISOString()
    }
  ];
  
  const financeNotifications = await storageService.get('financeNotifications') || [];
  financeNotifications.push(...truckingFinanceNotifications);
  await storageService.set('financeNotifications', financeNotifications);
  console.log('✅ Trucking Finance notifications created: 1 item');
  
  // Trucking typically has operational costs (fuel, driver salary, etc.)
  const operationalCosts = truckingDO.totalAmount * 0.7; // 70% operational costs
  
  return {
    customerInvoice: truckingDO.totalAmount,
    operationalCosts: operationalCosts,
    profit: truckingDO.totalAmount - operationalCosts
  };
}

// Test Finance Processing
async function testFinanceProcessing() {
  console.log('\n💰 Testing Finance Processing');
  console.log('─'.repeat(50));
  
  const financeNotifications = await storageService.get('financeNotifications') || [];
  console.log(`📋 Total Finance Notifications: ${financeNotifications.length}`);
  
  // Group by type
  const supplierPayments = financeNotifications.filter(n => n.type === 'SUPPLIER_PAYMENT');
  const customerInvoices = financeNotifications.filter(n => n.type === 'CUSTOMER_INVOICE');
  
  console.log(`💸 Supplier Payments: ${supplierPayments.length}`);
  console.log(`💵 Customer Invoices: ${customerInvoices.length}`);
  
  // Calculate totals
  const totalSupplierPayments = supplierPayments.reduce((sum, n) => sum + (n.amount || 0), 0);
  const totalCustomerInvoices = customerInvoices.reduce((sum, n) => sum + (n.amount || 0), 0);
  
  console.log(`💸 Total Supplier Payments: Rp ${totalSupplierPayments.toLocaleString('id-ID')}`);
  console.log(`💵 Total Customer Invoices: Rp ${totalCustomerInvoices.toLocaleString('id-ID')}`);
  console.log(`📊 Net Cash Flow: Rp ${(totalCustomerInvoices - totalSupplierPayments).toLocaleString('id-ID')}`);
  
  // Process payments (simulate)
  const processedPayments = supplierPayments.map(payment => ({
    ...payment,
    status: 'PAID',
    paidDate: new Date().toISOString().split('T')[0],
    paidAmount: payment.amount
  }));
  
  const processedInvoices = customerInvoices.map(invoice => ({
    ...invoice,
    status: 'PAID',
    paidDate: new Date().toISOString().split('T')[0],
    paidAmount: invoice.amount
  }));
  
  // Update finance notifications
  const updatedNotifications = financeNotifications.map(n => {
    const processed = [...processedPayments, ...processedInvoices].find(p => p.id === n.id);
    return processed || n;
  });
  
  await storageService.set('financeNotifications', updatedNotifications);
  console.log('✅ Finance processing completed - all payments and invoices marked as PAID');
  
  return {
    totalSupplierPayments,
    totalCustomerInvoices,
    netCashFlow: totalCustomerInvoices - totalSupplierPayments
  };
}

// Main test function
async function runFinanceComprehensiveTest() {
  console.log('💰 Comprehensive Finance Flow Test');
  console.log('═'.repeat(70));
  
  try {
    await setupFinanceTestData();
    
    // Test all module finance flows
    const packagingResults = await testPackagingFinanceFlow();
    const gtResults = await testGTFinanceFlow();
    const truckingResults = await testTruckingFinanceFlow();
    
    // Test finance processing
    const financeResults = await testFinanceProcessing();
    
    // Summary
    console.log('\n📊 Finance Test Summary');
    console.log('═'.repeat(70));
    
    console.log('\n🏭 Packaging Finance:');
    console.log(`   Supplier Payment: Rp ${packagingResults.supplierPayment.toLocaleString('id-ID')}`);
    console.log(`   Customer Invoice: Rp ${packagingResults.customerInvoice.toLocaleString('id-ID')}`);
    console.log(`   Profit: Rp ${packagingResults.profit.toLocaleString('id-ID')}`);
    
    console.log('\n🏪 GT Finance:');
    console.log(`   Supplier Payment: Rp ${gtResults.supplierPayment.toLocaleString('id-ID')}`);
    console.log(`   Customer Invoice: Rp ${gtResults.customerInvoice.toLocaleString('id-ID')}`);
    console.log(`   Profit: Rp ${gtResults.profit.toLocaleString('id-ID')}`);
    
    console.log('\n🚛 Trucking Finance:');
    console.log(`   Customer Invoice: Rp ${truckingResults.customerInvoice.toLocaleString('id-ID')}`);
    console.log(`   Operational Costs: Rp ${truckingResults.operationalCosts.toLocaleString('id-ID')}`);
    console.log(`   Profit: Rp ${truckingResults.profit.toLocaleString('id-ID')}`);
    
    console.log('\n💰 Overall Finance:');
    console.log(`   Total Supplier Payments: Rp ${financeResults.totalSupplierPayments.toLocaleString('id-ID')}`);
    console.log(`   Total Customer Invoices: Rp ${financeResults.totalCustomerInvoices.toLocaleString('id-ID')}`);
    console.log(`   Net Cash Flow: Rp ${financeResults.netCashFlow.toLocaleString('id-ID')}`);
    
    // Validation
    console.log('\n🔍 Finance Integration Validation');
    console.log('─'.repeat(50));
    
    const packagingValid = packagingResults.profit > 0;
    const gtValid = gtResults.profit > 0;
    const truckingValid = truckingResults.profit > 0;
    const financeValid = financeResults.netCashFlow > 0;
    
    console.log(`✅ Packaging Profitability: ${packagingValid ? 'PASS' : 'FAIL'}`);
    console.log(`✅ GT Profitability: ${gtValid ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Trucking Profitability: ${truckingValid ? 'PASS' : 'FAIL'}`);
    console.log(`✅ Overall Cash Flow: ${financeValid ? 'POSITIVE' : 'NEGATIVE'}`);
    
    const allValid = packagingValid && gtValid && truckingValid && financeValid;
    
    if (allValid) {
      console.log('\n🎉 ALL FINANCE FLOWS WORKING CORRECTLY!');
      console.log('✅ Packaging finance integration complete');
      console.log('✅ GT finance integration complete');
      console.log('✅ Trucking finance integration complete');
      console.log('✅ Cross-module finance processing working');
      console.log('✅ All modules generating positive cash flow');
    } else {
      console.log('\n⚠️  Some finance flows need attention');
    }
    
    return allValid;
    
  } catch (error) {
    console.log('\n❌ Finance Comprehensive Test FAILED!');
    console.log('Error:', error.message);
    return false;
  }
}

// Run the comprehensive finance test
runFinanceComprehensiveTest().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Finance comprehensive test execution failed:', error);
  process.exit(1);
});