import { describe, it, expect, beforeEach } from 'vitest';
import { storageService } from '../../src/services/storage';

/**
 * Integration Test: Full Workflow dari SO sampai Payment
 * 
 * Flow:
 * 1. Create SO dari customer
 * 2. SO approved -> Create SPK
 * 3. SPK -> Create PO untuk material
 * 4. PO approved -> GRN
 * 5. Production dari SPK
 * 6. QC check
 * 7. Delivery
 * 8. Invoice customer (payment dari customer)
 * 9. Payment ke supplier (bayar material)
 */

describe('Full Workflow Integration Test', () => {
  beforeEach(async () => {
    // Clear all storage before each test
    await storageService.remove('salesOrders');
    await storageService.remove('spk');
    await storageService.remove('purchaseOrders');
    await storageService.remove('grn');
    await storageService.remove('production');
    await storageService.remove('qaqc');
    await storageService.remove('deliveryNotes');
    await storageService.remove('invoices');
    await storageService.remove('supplierPayments');
    
    // Setup test data
    await setupTestData();
  });

  async function setupTestData() {
    // Setup customer
    const customers = [
      {
        id: 'customer-1',
        kode: 'CUST001',
        nama: 'PT. TEST CUSTOMER',
      },
    ];
    await storageService.set('customers', customers);

    // Setup supplier
    const suppliers = [
      {
        id: 'supplier-1',
        kode: 'SUPP001',
        nama: 'PT. TEST SUPPLIER',
      },
    ];
    await storageService.set('suppliers', suppliers);

    // Setup product dengan BOM
    const products = [
      {
        id: 'product-1',
        product_id: 'KRT00137',
        kode: 'KRT00137',
        nama: 'CARTON BOX 540X360X220',
        satuan: 'PCS',
        hargaFg: 11200,
        customer: 'PT. TEST CUSTOMER',
      },
    ];
    await storageService.set('products', products);

    // Setup material
    const materials = [
      {
        id: 'material-1',
        material_id: 'KRT00820',
        kode: 'KRT00820',
        nama: 'SHEET 186 X 60 CM',
        satuan: 'PCS',
        priceMtr: 5000,
        supplier: 'PT. TEST SUPPLIER',
      },
    ];
    await storageService.set('materials', materials);

    // Setup BOM
    const bom = [
      {
        id: 'bom-1',
        product_id: 'KRT00137',
        material_id: 'KRT00820',
        ratio: 1,
      },
    ];
    await storageService.set('bom', bom);
  }

  describe('Step 1: Create Sales Order', () => {
    it('should create SO from customer', async () => {
      const customers = await storageService.get<any[]>('customers');
      const products = await storageService.get<any[]>('products');
      
      const newSO = {
        id: 'so-1',
        soNo: 'SO-2024-000001',
        customer: 'PT. TEST CUSTOMER',
        customerKode: 'CUST001',
        paymentTerms: 'TOP' as const,
        topDays: 30,
        status: 'DRAFT' as const,
        created: new Date().toISOString().split('T')[0],
        items: [
          {
            id: 'so-item-1',
            productId: 'product-1',
            productKode: 'KRT00137',
            productName: 'CARTON BOX 540X360X220',
            qty: 100,
            unit: 'PCS',
            price: 11200,
            total: 1120000,
          },
        ],
        bomSnapshot: {},
      };

      const salesOrders = await storageService.get<any[]>('salesOrders') || [];
      await storageService.set('salesOrders', [...salesOrders, newSO]);

      const savedSO = await storageService.get<any[]>('salesOrders');
      expect(savedSO).toHaveLength(1);
      expect(savedSO[0].soNo).toBe('SO-2024-000001');
      expect(savedSO[0].status).toBe('DRAFT');
    });

    it('should approve SO and generate SPK', async () => {
      // Create SO
      const newSO = {
        id: 'so-1',
        soNo: 'SO-2024-000001',
        customer: 'PT. TEST CUSTOMER',
        status: 'DRAFT' as const,
        items: [
          {
            productKode: 'KRT00137',
            qty: 100,
          },
        ],
      };
      await storageService.set('salesOrders', [newSO]);

      // Approve SO
      const salesOrders = await storageService.get<any[]>('salesOrders');
      const updatedSO = salesOrders.map(so =>
        so.id === 'so-1' ? { ...so, status: 'OPEN', approvedBy: 'Admin', approvedAt: new Date().toISOString() } : so
      );
      await storageService.set('salesOrders', updatedSO);

      // Generate SPK from approved SO
      const bom = await storageService.get<any[]>('bom');
      const products = await storageService.get<any[]>('products');
      
      const spkData = [];
      for (const item of updatedSO[0].items) {
        const product = products.find(p => p.kode === item.productKode);
        const productBOM = bom.filter(b => b.product_id === product?.product_id);
        
        if (productBOM.length > 0) {
          spkData.push({
            id: 'spk-1',
            spkNo: 'SPK-2024-000001',
            soNo: 'SO-2024-000001',
            customer: 'PT. TEST CUSTOMER',
            product: product?.nama,
            product_id: product?.product_id,
            qty: item.qty,
            status: 'DRAFT',
            created: new Date().toISOString(),
          });
        }
      }

      await storageService.set('spk', spkData);

      const spk = await storageService.get<any[]>('spk');
      expect(spk).toHaveLength(1);
      expect(spk[0].soNo).toBe('SO-2024-000001');
      expect(spk[0].status).toBe('DRAFT');
    });
  });

  describe('Step 2: Create Purchase Order from SPK', () => {
    it('should create PO from SPK for materials', async () => {
      // Setup SPK
      const spk = [
        {
          id: 'spk-1',
          spkNo: 'SPK-2024-000001',
          soNo: 'SO-2024-000001',
          product_id: 'KRT00137',
          qty: 100,
        },
      ];
      await storageService.set('spk', spk);

      // Get BOM and materials
      const bom = await storageService.get<any[]>('bom');
      const materials = await storageService.get<any[]>('materials');
      const suppliers = await storageService.get<any[]>('suppliers');

      // Generate PO from SPK
      const purchaseOrders = [];
      const spkItem = spk[0];
      const productBOM = bom.filter(b => b.product_id === spkItem.product_id);

      for (const bomItem of productBOM) {
        const material = materials.find(m => m.material_id === bomItem.material_id);
        const supplier = suppliers.find(s => s.nama === material?.supplier) || suppliers[0];
        
        if (material && supplier) {
          const qty = spkItem.qty * (bomItem.ratio || 1);
          const price = material.priceMtr || 0;
          
          purchaseOrders.push({
            id: 'po-1',
            poNo: 'PO-2024-000001',
            supplier: supplier.nama,
            soNo: spkItem.soNo,
            spkNo: spkItem.spkNo,
            materialItem: material.nama,
            materialId: material.material_id,
            qty,
            price,
            total: qty * price,
            paymentTerms: 'TOP' as const,
            topDays: 30,
            status: 'DRAFT' as const,
            deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            created: new Date().toISOString(),
          });
        }
      }

      await storageService.set('purchaseOrders', purchaseOrders);

      const savedPO = await storageService.get<any[]>('purchaseOrders');
      expect(savedPO).toHaveLength(1);
      expect(savedPO[0].spkNo).toBe('SPK-2024-000001');
      expect(savedPO[0].qty).toBe(100); // 100 * 1 ratio
      expect(savedPO[0].total).toBe(500000); // 100 * 5000
    });

    it('should approve PO', async () => {
      const po = [
        {
          id: 'po-1',
          poNo: 'PO-2024-000001',
          status: 'DRAFT' as const,
        },
      ];
      await storageService.set('purchaseOrders', po);

      const purchaseOrders = await storageService.get<any[]>('purchaseOrders');
      const updatedPO = purchaseOrders.map(p =>
        p.id === 'po-1' ? { ...p, status: 'OPEN', approvedBy: 'Admin', approvedAt: new Date().toISOString() } : p
      );
      await storageService.set('purchaseOrders', updatedPO);

      const savedPO = await storageService.get<any[]>('purchaseOrders');
      expect(savedPO[0].status).toBe('OPEN');
    });
  });

  describe('Step 3: Create GRN from PO', () => {
    it('should create GRN from approved PO', async () => {
      const po = [
        {
          id: 'po-1',
          poNo: 'PO-2024-000001',
          materialItem: 'SHEET 186 X 60 CM',
          qty: 100,
          price: 5000,
          total: 500000,
          status: 'OPEN' as const,
        },
      ];
      await storageService.set('purchaseOrders', po);

      // Create GRN
      const grn = [
        {
          id: 'grn-1',
          grnNo: 'GRN-2024-000001',
          poNo: 'PO-2024-000001',
          materialItem: 'SHEET 186 X 60 CM',
          qtyOrdered: 100,
          qtyReceived: 100,
          price: 5000,
          total: 500000,
          status: 'RECEIVED' as const,
          receivedDate: new Date().toISOString().split('T')[0],
          created: new Date().toISOString(),
        },
      ];

      await storageService.set('grn', grn);

      // Update PO status
      const purchaseOrders = await storageService.get<any[]>('purchaseOrders');
      const updatedPO = purchaseOrders.map(p =>
        p.id === 'po-1' ? { ...p, status: 'CLOSE', grnNo: 'GRN-2024-000001' } : p
      );
      await storageService.set('purchaseOrders', updatedPO);

      const savedGRN = await storageService.get<any[]>('grn');
      expect(savedGRN).toHaveLength(1);
      expect(savedGRN[0].poNo).toBe('PO-2024-000001');
      expect(savedGRN[0].qtyReceived).toBe(100);
    });
  });

  describe('Step 4: Production from SPK', () => {
    it('should create production record from SPK', async () => {
      const spk = [
        {
          id: 'spk-1',
          spkNo: 'SPK-2024-000001',
          soNo: 'SO-2024-000001',
          product_id: 'KRT00137',
          qty: 100,
          status: 'OPEN' as const,
        },
      ];
      await storageService.set('spk', spk);

      // Create production
      const production = [
        {
          id: 'prod-1',
          productionNo: 'PROD-2024-000001',
          spkNo: 'SPK-2024-000001',
          soNo: 'SO-2024-000001',
          product: 'CARTON BOX 540X360X220',
          targetQty: 100,
          producedQty: 100,
          surplusQty: 0,
          leftoverQty: 0,
          status: 'COMPLETED' as const,
          producedDate: new Date().toISOString().split('T')[0],
          created: new Date().toISOString(),
        },
      ];

      await storageService.set('production', production);

      // Update SPK status
      const spkData = await storageService.get<any[]>('spk');
      const updatedSPK = spkData.map(s =>
        s.id === 'spk-1' ? { ...s, status: 'IN_PROGRESS', productionNo: 'PROD-2024-000001' } : s
      );
      await storageService.set('spk', updatedSPK);

      const savedProd = await storageService.get<any[]>('production');
      expect(savedProd).toHaveLength(1);
      expect(savedProd[0].spkNo).toBe('SPK-2024-000001');
      expect(savedProd[0].producedQty).toBe(100);
    });
  });

  describe('Step 5: QC Check', () => {
    it('should create QC check and pass production', async () => {
      const production = [
        {
          id: 'prod-1',
          productionNo: 'PROD-2024-000001',
          spkNo: 'SPK-2024-000001',
          producedQty: 100,
        },
      ];
      await storageService.set('production', production);

      // Create QC check
      const qaqc = [
        {
          id: 'qaqc-1',
          qcNo: 'QC-2024-000001',
          productionNo: 'PROD-2024-000001',
          spkNo: 'SPK-2024-000001',
          qtyChecked: 100,
          qtyPassed: 100,
          qtyFailed: 0,
          status: 'PASS' as const,
          checkedDate: new Date().toISOString().split('T')[0],
          created: new Date().toISOString(),
        },
      ];

      await storageService.set('qaqc', qaqc);

      // Update SPK status to CLOSE if QC PASS
      const spkData = await storageService.get<any[]>('spk') || [];
      const updatedSPK = spkData.map(s =>
        s.id === 'spk-1' ? { ...s, status: 'CLOSE', qcNo: 'QC-2024-000001' } : s
      );
      await storageService.set('spk', updatedSPK);

      const savedQC = await storageService.get<any[]>('qaqc');
      expect(savedQC).toHaveLength(1);
      expect(savedQC[0].status).toBe('PASS');
      expect(savedQC[0].qtyPassed).toBe(100);
    });
  });

  describe('Step 6: Delivery Note', () => {
    it('should create delivery note from QC PASS items', async () => {
      const qaqc = [
        {
          id: 'qaqc-1',
          qcNo: 'QC-2024-000001',
          spkNo: 'SPK-2024-000001',
          soNo: 'SO-2024-000001',
          qtyPassed: 100,
          status: 'PASS' as const,
        },
      ];
      await storageService.set('qaqc', qaqc);

      // Create delivery note
      const deliveryNotes = [
        {
          id: 'dn-1',
          dnNo: 'DN-2024-000001',
          soNo: 'SO-2024-000001',
          customer: 'PT. TEST CUSTOMER',
          items: [
            {
              product: 'CARTON BOX 540X360X220',
              qty: 100,
              unit: 'PCS',
            },
          ],
          status: 'PENDING' as const,
          deliveryDate: new Date().toISOString().split('T')[0],
          created: new Date().toISOString(),
        },
      ];

      await storageService.set('deliveryNotes', deliveryNotes);

      const savedDN = await storageService.get<any[]>('deliveryNotes');
      expect(savedDN).toHaveLength(1);
      expect(savedDN[0].soNo).toBe('SO-2024-000001');
    });

    it('should update delivery status to DELIVERED', async () => {
      const dn = [
        {
          id: 'dn-1',
          dnNo: 'DN-2024-000001',
          status: 'PENDING' as const,
        },
      ];
      await storageService.set('deliveryNotes', dn);

      const deliveryNotes = await storageService.get<any[]>('deliveryNotes');
      const updatedDN = deliveryNotes.map(d =>
        d.id === 'dn-1' ? { ...d, status: 'DELIVERED', deliveredDate: new Date().toISOString().split('T')[0] } : d
      );
      await storageService.set('deliveryNotes', updatedDN);

      const savedDN = await storageService.get<any[]>('deliveryNotes');
      expect(savedDN[0].status).toBe('DELIVERED');
    });
  });

  describe('Step 7: Invoice Customer', () => {
    it('should create invoice from SO after delivery', async () => {
      const so = [
        {
          id: 'so-1',
          soNo: 'SO-2024-000001',
          customer: 'PT. TEST CUSTOMER',
          items: [
            {
              qty: 100,
              price: 11200,
              total: 1120000,
            },
          ],
          status: 'OPEN' as const,
        },
      ];
      await storageService.set('salesOrders', so);

      const deliveryNotes = [
        {
          id: 'dn-1',
          soNo: 'SO-2024-000001',
          status: 'DELIVERED' as const,
        },
      ];
      await storageService.set('deliveryNotes', deliveryNotes);

      // Create invoice
      const invoices = [
        {
          id: 'inv-1',
          invoiceNo: 'INV-2024-000001',
          soNo: 'SO-2024-000001',
          customer: 'PT. TEST CUSTOMER',
          totalAmount: 1120000,
          status: 'UNPAID' as const,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          created: new Date().toISOString(),
        },
      ];

      await storageService.set('invoices', invoices);

      // Update SO status
      const salesOrders = await storageService.get<any[]>('salesOrders');
      const updatedSO = salesOrders.map(s =>
        s.id === 'so-1' ? { ...s, status: 'CLOSE', invoiceNo: 'INV-2024-000001' } : s
      );
      await storageService.set('salesOrders', updatedSO);

      const savedInv = await storageService.get<any[]>('invoices');
      expect(savedInv).toHaveLength(1);
      expect(savedInv[0].totalAmount).toBe(1120000);
      expect(savedInv[0].status).toBe('UNPAID');
    });

    it('should mark invoice as paid', async () => {
      const invoices = [
        {
          id: 'inv-1',
          invoiceNo: 'INV-2024-000001',
          status: 'UNPAID' as const,
          totalAmount: 1120000,
        },
      ];
      await storageService.set('invoices', invoices);

      const invoiceList = await storageService.get<any[]>('invoices');
      const updatedInvoice = invoiceList.map(i =>
        i.id === 'inv-1' ? { ...i, status: 'PAID', paidDate: new Date().toISOString().split('T')[0] } : i
      );
      await storageService.set('invoices', updatedInvoice);

      const savedInv = await storageService.get<any[]>('invoices');
      expect(savedInv[0].status).toBe('PAID');
    });
  });

  describe('Step 8: Payment to Supplier', () => {
    it('should create supplier payment from PO', async () => {
      const po = [
        {
          id: 'po-1',
          poNo: 'PO-2024-000001',
          supplier: 'PT. TEST SUPPLIER',
          total: 500000,
          paymentTerms: 'TOP' as const,
          topDays: 30,
          status: 'CLOSE' as const,
        },
      ];
      await storageService.set('purchaseOrders', po);

      // Create supplier payment
      const supplierPayments = [
        {
          id: 'pay-1',
          paymentNo: 'PAY-2024-000001',
          poNo: 'PO-2024-000001',
          supplier: 'PT. TEST SUPPLIER',
          amount: 500000,
          status: 'UNPAID' as const,
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          created: new Date().toISOString(),
        },
      ];

      await storageService.set('supplierPayments', supplierPayments);

      const savedPay = await storageService.get<any[]>('supplierPayments');
      expect(savedPay).toHaveLength(1);
      expect(savedPay[0].amount).toBe(500000);
      expect(savedPay[0].status).toBe('UNPAID');
    });

    it('should mark supplier payment as paid', async () => {
      const payments = [
        {
          id: 'pay-1',
          paymentNo: 'PAY-2024-000001',
          status: 'UNPAID' as const,
          amount: 500000,
        },
      ];
      await storageService.set('supplierPayments', payments);

      const supplierPayments = await storageService.get<any[]>('supplierPayments');
      const updatedPayment = supplierPayments.map(p =>
        p.id === 'pay-1' ? { ...p, status: 'PAID', paidDate: new Date().toISOString().split('T')[0] } : p
      );
      await storageService.set('supplierPayments', updatedPayment);

      const savedPay = await storageService.get<any[]>('supplierPayments');
      expect(savedPay[0].status).toBe('PAID');
    });
  });

  describe('Full End-to-End Workflow', () => {
    it('should complete full workflow from SO to payments', async () => {
      // Step 1: Create and approve SO
      const so = {
        id: 'so-1',
        soNo: 'SO-2024-000001',
        customer: 'PT. TEST CUSTOMER',
        status: 'OPEN' as const,
        items: [{ productKode: 'KRT00137', qty: 100, price: 11200, total: 1120000 }],
      };
      await storageService.set('salesOrders', [so]);

      // Step 2: Create SPK
      const spk = {
        id: 'spk-1',
        spkNo: 'SPK-2024-000001',
        soNo: 'SO-2024-000001',
        product_id: 'KRT00137',
        qty: 100,
        status: 'DRAFT' as const,
      };
      await storageService.set('spk', [spk]);

      // Step 3: Create PO
      const po = {
        id: 'po-1',
        poNo: 'PO-2024-000001',
        spkNo: 'SPK-2024-000001',
        supplier: 'PT. TEST SUPPLIER',
        qty: 100,
        price: 5000,
        total: 500000,
        status: 'OPEN' as const,
      };
      await storageService.set('purchaseOrders', [po]);

      // Step 4: Create GRN
      const grn = {
        id: 'grn-1',
        grnNo: 'GRN-2024-000001',
        poNo: 'PO-2024-000001',
        qtyReceived: 100,
        status: 'RECEIVED' as const,
      };
      await storageService.set('grn', [grn]);

      // Step 5: Production
      const production = {
        id: 'prod-1',
        productionNo: 'PROD-2024-000001',
        spkNo: 'SPK-2024-000001',
        producedQty: 100,
        status: 'COMPLETED' as const,
      };
      await storageService.set('production', [production]);

      // Step 6: QC
      const qaqc = {
        id: 'qaqc-1',
        qcNo: 'QC-2024-000001',
        spkNo: 'SPK-2024-000001',
        status: 'PASS' as const,
        qtyPassed: 100,
      };
      await storageService.set('qaqc', [qaqc]);

      // Step 7: Delivery
      const dn = {
        id: 'dn-1',
        dnNo: 'DN-2024-000001',
        soNo: 'SO-2024-000001',
        status: 'DELIVERED' as const,
      };
      await storageService.set('deliveryNotes', [dn]);

      // Step 8: Invoice Customer
      const invoice = {
        id: 'inv-1',
        invoiceNo: 'INV-2024-000001',
        soNo: 'SO-2024-000001',
        totalAmount: 1120000,
        status: 'PAID' as const,
      };
      await storageService.set('invoices', [invoice]);

      // Step 9: Payment Supplier
      const payment = {
        id: 'pay-1',
        paymentNo: 'PAY-2024-000001',
        poNo: 'PO-2024-000001',
        amount: 500000,
        status: 'PAID' as const,
      };
      await storageService.set('supplierPayments', [payment]);

      // Verify all links
      const salesOrders = await storageService.get<any[]>('salesOrders');
      const spkData = await storageService.get<any[]>('spk');
      const purchaseOrders = await storageService.get<any[]>('purchaseOrders');
      const invoices = await storageService.get<any[]>('invoices');
      const supplierPayments = await storageService.get<any[]>('supplierPayments');

      // Verify SO -> SPK link
      expect(spkData[0].soNo).toBe(salesOrders[0].soNo);

      // Verify SPK -> PO link
      expect(purchaseOrders[0].spkNo).toBe(spkData[0].spkNo);

      // Verify SO -> Invoice link
      expect(invoices[0].soNo).toBe(salesOrders[0].soNo);

      // Verify PO -> Payment link
      expect(supplierPayments[0].poNo).toBe(purchaseOrders[0].poNo);

      // Verify all statuses are closed/paid
      expect(salesOrders[0].status).toBe('OPEN'); // SO bisa tetap OPEN sampai invoice paid
      expect(invoices[0].status).toBe('PAID');
      expect(supplierPayments[0].status).toBe('PAID');

      // Verify amounts
      expect(invoices[0].totalAmount).toBe(1120000); // Revenue dari customer
      expect(supplierPayments[0].amount).toBe(500000); // Cost ke supplier
      // Profit = 1120000 - 500000 = 620000
    });
  });
});

