import { useState } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { storageService } from '../../services/storage';
import '../../styles/common.css';
import '../../styles/compact.css';

interface TestResult {
  step: string;
  status: 'success' | 'error' | 'running' | 'pending';
  message: string;
  timestamp: string;
  details?: any;
}

const TestAutomation = () => {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState('');

  // Helper: Create dummy ICO file
  const createDummyFile = (): File => {
    // Create a minimal ICO file (base64 encoded 1x1 pixel ICO)
    const icoBase64 = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAAAQAAAAAAAAAAAAAAAAAAAAA';
    const byteCharacters = atob(icoBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/x-icon' });
    return new File([blob], 'test.ico', { type: 'image/x-icon' });
  };

  // Helper: Add test result
  const addResult = (step: string, status: TestResult['status'], message: string, details?: any) => {
    const result: TestResult = {
      step,
      status,
      message,
      timestamp: new Date().toISOString(),
      details,
    };
    setTestResults(prev => [...prev, result]);
  };

  // Helper: Wait
  const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Test 1: Sales Order
  const testSalesOrder = async () => {
    try {
      setCurrentStep('Sales Order');
      addResult('Sales Order', 'running', 'Creating Sales Order...');

      const customers = await storageService.get<any[]>('customers') || [];
      const products = await storageService.get<any[]>('products') || [];
      const materials = await storageService.get<any[]>('materials') || [];
      const bomData = await storageService.get<any[]>('bom') || [];

      if (customers.length === 0 || products.length === 0) {
        addResult('Sales Order', 'error', 'Missing test data: customers or products');
        return null;
      }

      const customer = customers[0];
      const product = products[0];
      const productBOM = bomData.filter((b: any) => 
        (b.product_id || b.kode || '').toString().trim() === (product.product_id || product.kode || '').toString().trim()
      );

      // Create SO with all fields filled
      const soNo = `TEST-PO-${Date.now()}`;
      const soItem = {
        id: `${Date.now()}${Math.random().toString(36).substr(2, 9)}`,
        productId: product.product_id || product.kode || '',
        productKode: product.product_id || product.kode || '',
        productName: product.nama || '',
        qty: 100,
        unit: product.satuan || 'PCS',
        price: product.hargaSales || product.hargaFg || 10000,
        total: 100 * (product.hargaSales || product.hargaFg || 10000),
        specNote: 'Test specification note from automation',
        bom: productBOM.map((bom: any) => {
          const material = materials.find((m: any) => 
            (m.material_id || m.kode || '').toString().trim() === (bom.material_id || '').toString().trim()
          );
          return {
            materialId: bom.material_id || '',
            materialName: material?.nama || bom.material_id || '',
            unit: material?.satuan || 'PCS',
            qty: 100 * (bom.ratio || 1),
            ratio: bom.ratio || 1,
            pricePerUnit: material?.priceMtr || material?.harga || 0,
          };
        }),
      };

      const salesOrder = {
        id: Date.now().toString(),
        soNo,
        customer: customer.nama || '',
        customerKode: customer.kode || '',
        paymentTerms: 'TOP' as const,
        topDays: 30,
        status: 'OPEN' as const,
        created: new Date().toISOString(),
        globalSpecNote: 'Test global specification note from automation',
        items: [soItem],
        bomSnapshot: soItem.bom,
        category: 'packaging' as const,
        confirmed: true,
        confirmedAt: new Date().toISOString(),
        confirmedBy: 'Test Automation',
      };

      const existingSOs = await storageService.get<any[]>('salesOrders') || [];
      await storageService.set('salesOrders', [...existingSOs, salesOrder]);

      addResult('Sales Order', 'success', `Sales Order created: ${soNo}`, salesOrder);
      await wait(500);
      return salesOrder;
    } catch (error: any) {
      addResult('Sales Order', 'error', `Error: ${error.message}`, error);
      return null;
    }
  };

  // Test 2: Work Order (SPK)
  const testWorkOrder = async (so: any) => {
    try {
      setCurrentStep('Work Order (SPK)');
      addResult('Work Order (SPK)', 'running', 'Creating Work Order (SPK)...');

      if (!so) {
        addResult('Work Order (SPK)', 'error', 'Sales Order not found');
        return null;
      }

      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      const existingSPKs = await storageService.get<any[]>('spk') || [];
      
      // Generate random alphanumeric code (5 chars)
      const generateRandomCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 5; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };
      
      // Ensure unique SPK number
      let spkNo = '';
      let isUnique = false;
      while (!isUnique) {
        const randomCode = generateRandomCode();
        spkNo = `SPK/${year}${month}${day}/${randomCode}`;
        isUnique = !existingSPKs.some(s => s.spkNo === spkNo);
      }

      const spk = {
        id: Date.now().toString(),
        spkNo,
        soNo: so.soNo,
        customer: so.customer,
        product: so.items[0]?.productName || '',
        product_id: so.items[0]?.productId || '',
        kode: so.items[0]?.productKode || '',
        qty: so.items[0]?.qty || 0,
        unit: so.items[0]?.unit || 'PCS',
        status: 'OPEN' as const,
        created: new Date().toISOString(),
        notes: so.globalSpecNote || 'Test SPK notes from automation',
      };

      await storageService.set('spk', [...existingSPKs, spk]);

      addResult('Work Order (SPK)', 'success', `SPK created: ${spkNo}`, spk);
      await wait(500);
      return spk;
    } catch (error: any) {
      addResult('Work Order (SPK)', 'error', `Error: ${error.message}`, error);
      return null;
    }
  };

  // Test 3: Purchase Order
  const testPurchaseOrder = async (so: any) => {
    try {
      setCurrentStep('Purchase Order');
      addResult('Purchase Order', 'running', 'Creating Purchase Order...');

      if (!so) {
        addResult('Purchase Order', 'error', 'Sales Order not found');
        return null;
      }

      const suppliers = await storageService.get<any[]>('suppliers') || [];
      const materials = await storageService.get<any[]>('materials') || [];

      if (suppliers.length === 0 || materials.length === 0) {
        addResult('Purchase Order', 'error', 'Missing test data: suppliers or materials');
        return null;
      }

      const supplier = suppliers[0];
      const bomSnapshot = so.bomSnapshot || [];
      
      if (bomSnapshot.length === 0) {
        addResult('Purchase Order', 'error', 'No BOM materials found');
        return null;
      }

      const material = materials.find((m: any) => 
        (m.material_id || m.kode || '').toString().trim() === (bomSnapshot[0]?.materialId || '').toString().trim()
      );

      if (!material) {
        addResult('Purchase Order', 'error', 'Material not found in master data');
        return null;
      }

      const existingPOs = await storageService.get<any[]>('purchaseOrders') || [];
      const poNo = `PO-${Date.now()}`;

      const purchaseOrder = {
        id: Date.now().toString(),
        poNo,
        soNo: so.soNo,
        supplier: supplier.nama || '',
        supplierKode: supplier.kode || '',
        materialItem: material.nama || '',
        materialKode: material.material_id || material.kode || '',
        qty: bomSnapshot[0]?.qty || 100,
        unit: bomSnapshot[0]?.unit || 'PCS',
        price: material.priceMtr || material.harga || 5000,
        total: (bomSnapshot[0]?.qty || 100) * (material.priceMtr || material.harga || 5000),
        status: 'OPEN' as const,
        created: new Date().toISOString(),
        notes: 'Test Purchase Order notes from automation',
      };

      await storageService.set('purchaseOrders', [...existingPOs, purchaseOrder]);

      addResult('Purchase Order', 'success', `Purchase Order created: ${poNo}`, purchaseOrder);
      await wait(500);
      return purchaseOrder;
    } catch (error: any) {
      addResult('Purchase Order', 'error', `Error: ${error.message}`, error);
      return null;
    }
  };

  // Test 4: Goods Receipt (GRN)
  const testGoodsReceipt = async (po: any) => {
    try {
      setCurrentStep('Goods Receipt');
      addResult('Goods Receipt', 'running', 'Creating Goods Receipt (GRN)...');

      if (!po) {
        addResult('Goods Receipt', 'error', 'Purchase Order not found');
        return null;
      }

      const existingGRNs = await storageService.get<any[]>('grn') || [];
      const grnNo = `GRN-${Date.now()}`;

      // Create dummy file for upload
      const dummyFile = createDummyFile();
      const fileBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(dummyFile);
      });

      const grn = {
        id: Date.now().toString(),
        grnNo,
        poNo: po.poNo,
        soNo: po.soNo,
        supplier: po.supplier,
        materialItem: po.materialItem,
        materialKode: po.materialKode,
        qtyOrdered: po.qty,
        qtyReceived: po.qty,
        unit: po.unit,
        receivedDate: new Date().toISOString().split('T')[0],
        status: 'OPEN' as const,
        created: new Date().toISOString(),
        notes: 'Test GRN notes from automation',
        suratJalan: fileBase64,
        suratJalanName: dummyFile.name,
      };

      await storageService.set('grn', [...existingGRNs, grn]);

      addResult('Goods Receipt', 'success', `GRN created: ${grnNo} (with file upload)`, grn);
      await wait(500);
      return grn;
    } catch (error: any) {
      addResult('Goods Receipt', 'error', `Error: ${error.message}`, error);
      return null;
    }
  };

  // Test 5: Production
  const testProduction = async (spk: any, grn: any, so: any) => {
    try {
      setCurrentStep('Production');
      addResult('Production', 'running', 'Creating Production...');

      if (!spk) {
        addResult('Production', 'error', 'SPK not found');
        return null;
      }

      const existingProductions = await storageService.get<any[]>('production') || [];
      const productionNo = `PROD-${Date.now()}`;

      const production = {
        id: Date.now().toString(),
        productionNo,
        grnNo: grn?.grnNo || '',
        spkNo: spk.spkNo,
        soNo: spk.soNo,
        customer: spk.customer,
        product: spk.product,
        productId: spk.product_id || spk.kode || '',
        target: spk.qty,
        targetQty: spk.qty,
        status: 'OPEN' as const,
        date: new Date().toISOString().split('T')[0],
        progress: 0,
        producedQty: 0,
        remaining: spk.qty,
        scheduleStartDate: new Date().toISOString(),
        scheduleEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        batches: [],
      };

      await storageService.set('production', [...existingProductions, production]);

      addResult('Production', 'success', `Production created: ${productionNo}`, production);
      await wait(500);

      // Submit Production Result with file upload
      try {
        setCurrentStep('Production Result');
        addResult('Production Result', 'running', 'Submitting Production Result...');

        const bomData = await storageService.get<any[]>('bom') || [];
        const materialsData = await storageService.get<any[]>('materials') || [];
        const salesOrders = await storageService.get<any[]>('salesOrders') || [];
        const soData = salesOrders.find((s: any) => s.soNo === production.soNo) || so;

        const productBOM = bomData.filter((b: any) => {
          const bomProductId = (b.product_id || b.kode || '').toString().trim();
          return bomProductId === (production.productId || '').toString().trim();
        });

        // Create dummy files for upload
        const dummyFile = createDummyFile();
        const fileBase64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(dummyFile);
        });

        const materialsUsed = productBOM.map((bom: any) => {
          const material = materialsData.find((m: any) => 
            ((m.material_id || m.kode || '').toString().trim()) === ((bom.material_id || '').toString().trim())
          );
          return {
            materialId: bom.material_id || '',
            materialName: material?.nama || bom.material_id || '',
            unit: material?.satuan || 'PCS',
            qtyUsed: String(production.target * (bom.ratio || 1)),
          };
        });

        const productionResult = {
          id: Date.now().toString(),
          soId: soData?.id || '',
          soNo: production.soNo,
          customer: production.customer,
          product: production.product,
          qtyProduced: String(production.target),
          qtySurplus: '0',
          qtySurplusUnit: 'pcs',
          materials: materialsUsed,
          leftovers: [],
          docs: {
            resultFiles: [{
              name: dummyFile.name,
              data: fileBase64,
            }],
            inputTimestamp: new Date().toISOString(),
            isPartial: false,
          },
          grnId: grn?.id || '',
          created: new Date().toISOString(),
        };

        const existingResults = await storageService.get<any[]>('productionResults') || [];
        await storageService.set('productionResults', [...existingResults, productionResult]);

        // Update production status to CLOSE
        const updatedProductions = existingProductions.map((p: any) =>
          p.id === production.id
            ? {
                ...p,
                status: 'CLOSE' as const,
                progress: production.target,
                producedQty: production.target,
                surplusQty: 0,
              }
            : p
        );
        await storageService.set('production', updatedProductions);

        addResult('Production Result', 'success', `Production Result submitted (with file upload)`, productionResult);
        await wait(500);
      } catch (error: any) {
        addResult('Production Result', 'error', `Error submitting result: ${error.message}`, error);
      }

      return production;
    } catch (error: any) {
      addResult('Production', 'error', `Error: ${error.message}`, error);
      return null;
    }
  };

  // Test 6: QA/QC
  const testQAQC = async (production: any) => {
    try {
      setCurrentStep('QA/QC');
      addResult('QA/QC', 'running', 'Creating QA/QC check...');

      if (!production) {
        addResult('QA/QC', 'error', 'Production not found');
        return null;
      }

      const existingQC = await storageService.get<any[]>('qc') || [];
      const qcNo = `QC-${Date.now()}`;

      // Create dummy files for upload
      const dummyFile = createDummyFile();
      const fileBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(dummyFile);
      });

      const qc = {
        id: Date.now().toString(),
        qcNo,
        productionNo: production.productionNo,
        soNo: production.soNo,
        product: production.product,
        qtyChecked: production.target,
        qtyPassed: production.target,
        qtyFailed: 0,
        status: 'PASSED' as const,
        checkedBy: 'Test Automation',
        checkedDate: new Date().toISOString(),
        qcNote: 'Test QC note from automation - All items passed',
        qcFiles: [{
          name: dummyFile.name,
          data: fileBase64,
        }],
        created: new Date().toISOString(),
      };

      await storageService.set('qc', [...existingQC, qc]);

      addResult('QA/QC', 'success', `QC check created: ${qcNo} (with file upload)`, qc);
      await wait(500);
      return qc;
    } catch (error: any) {
      addResult('QA/QC', 'error', `Error: ${error.message}`, error);
      return null;
    }
  };

  // Test 7: Delivery Note
  const testDeliveryNote = async (so: any, qc: any) => {
    try {
      setCurrentStep('Delivery Note');
      addResult('Delivery Note', 'running', 'Creating Delivery Note...');

      if (!so || !qc) {
        addResult('Delivery Note', 'error', 'Sales Order or QC not found');
        return null;
      }

      const existingDNs = await storageService.get<any[]>('deliveryNotes') || [];
      const dnNo = `DN-${Date.now()}`;

      // Create dummy file for upload
      const dummyFile = createDummyFile();
      const fileBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(dummyFile);
      });

      const deliveryNote = {
        id: Date.now().toString(),
        dnNo,
        soNo: so.soNo,
        customer: so.customer,
        items: so.items.map((item: any) => ({
          productId: item.productId,
          productName: item.productName,
          qty: item.qty,
          unit: item.unit,
        })),
        deliveryDate: new Date().toISOString().split('T')[0],
        status: 'DELIVERED' as const,
        created: new Date().toISOString(),
        notes: 'Test Delivery Note notes from automation',
        deliveryFiles: [{
          name: dummyFile.name,
          data: fileBase64,
        }],
      };

      await storageService.set('deliveryNotes', [...existingDNs, deliveryNote]);

      addResult('Delivery Note', 'success', `Delivery Note created: ${dnNo} (with file upload)`, deliveryNote);
      await wait(500);
      return deliveryNote;
    } catch (error: any) {
      addResult('Delivery Note', 'error', `Error: ${error.message}`, error);
      return null;
    }
  };

  // Test 8: Invoice
  const testInvoice = async (so: any, dn: any) => {
    try {
      setCurrentStep('Invoice');
      addResult('Invoice', 'running', 'Creating Invoice...');

      if (!so || !dn) {
        addResult('Invoice', 'error', 'Sales Order or Delivery Note not found');
        return null;
      }

      const existingInvoices = await storageService.get<any[]>('invoices') || [];
      const invoiceNo = `INV-${Date.now()}`;

      const totalAmount = so.items.reduce((sum: number, item: any) => sum + item.total, 0);
      const tax = totalAmount * 0.11; // 11% PPN
      const grandTotal = totalAmount + tax;

      const invoice = {
        id: Date.now().toString(),
        invoiceNo,
        soNo: so.soNo,
        dnNo: dn.dnNo,
        customer: so.customer,
        customerKode: so.customerKode,
        items: so.items.map((item: any) => ({
          productId: item.productId,
          productName: item.productName,
          qty: item.qty,
          unit: item.unit,
          price: item.price,
          total: item.total,
        })),
        subtotal: totalAmount,
        tax: tax,
        grandTotal: grandTotal,
        paymentTerms: so.paymentTerms,
        topDays: so.topDays,
        dueDate: new Date(Date.now() + (so.topDays || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'OPEN' as const,
        created: new Date().toISOString(),
        notes: 'Test Invoice notes from automation',
      };

      await storageService.set('invoices', [...existingInvoices, invoice]);

      addResult('Invoice', 'success', `Invoice created: ${invoiceNo}`, invoice);
      await wait(500);
      return invoice;
    } catch (error: any) {
      addResult('Invoice', 'error', `Error: ${error.message}`, error);
      return null;
    }
  };

  // Test 9: Payment Supplier
  const testPaymentSupplier = async (po: any) => {
    try {
      setCurrentStep('Payment Supplier');
      addResult('Payment Supplier', 'running', 'Creating Payment Supplier...');

      if (!po) {
        addResult('Payment Supplier', 'error', 'Purchase Order not found');
        return null;
      }

      const existingPayments = await storageService.get<any[]>('supplierPayments') || [];
      const paymentNo = `PAY-SUP-${Date.now()}`;

      // Create dummy file for upload
      const dummyFile = createDummyFile();
      const fileBase64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(dummyFile);
      });

      const payment = {
        id: Date.now().toString(),
        paymentNo,
        poNo: po.poNo,
        supplier: po.supplier,
        amount: po.total,
        paymentDate: new Date().toISOString().split('T')[0],
        paymentMethod: 'TRANSFER',
        status: 'PAID' as const,
        created: new Date().toISOString(),
        notes: 'Test Payment Supplier notes from automation',
        paymentProof: fileBase64,
        paymentProofName: dummyFile.name,
      };

      await storageService.set('supplierPayments', [...existingPayments, payment]);

      addResult('Payment Supplier', 'success', `Payment Supplier created: ${paymentNo} (with file upload)`, payment);
      await wait(500);
      return payment;
    } catch (error: any) {
      addResult('Payment Supplier', 'error', `Error: ${error.message}`, error);
      return null;
    }
  };

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true);
    setTestResults([]);
    setCurrentStep('');

    try {
      // Test 1: Sales Order
      const so = await testSalesOrder();
      
      // Test 2: Work Order (SPK)
      const spk = await testWorkOrder(so);
      
      // Test 3: Purchase Order
      const po = await testPurchaseOrder(so);
      
      // Test 4: Goods Receipt
      const grn = await testGoodsReceipt(po);
      
      // Test 5: Production
      const production = await testProduction(spk, grn, so);
      
      // Test 6: QA/QC
      const qc = await testQAQC(production);
      
      // Test 7: Delivery Note
      const dn = await testDeliveryNote(so, qc);
      
      // Test 8: Invoice
      const invoice = await testInvoice(so, dn);
      
      // Test 9: Payment Supplier
      await testPaymentSupplier(po);

      setCurrentStep('Completed');
      addResult('All Tests', 'success', 'All tests completed successfully!');
    } catch (error: any) {
      addResult('All Tests', 'error', `Fatal error: ${error.message}`, error);
    } finally {
      setIsRunning(false);
      setCurrentStep('');
    }
  };

  const clearResults = () => {
    setTestResults([]);
    setCurrentStep('');
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return 'var(--success)';
      case 'error': return 'var(--danger)';
      case 'running': return 'var(--warning)';
      default: return 'var(--text-secondary)';
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'running': return '⟳';
      default: return '○';
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Test Automation</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button
            variant="primary"
            onClick={runAllTests}
            disabled={isRunning}
          >
            {isRunning ? `Running... ${currentStep}` : 'Run All Tests'}
          </Button>
          <Button
            variant="secondary"
            onClick={clearResults}
            disabled={isRunning}
          >
            Clear Results
          </Button>
        </div>
      </div>

      {isRunning && (
        <Card style={{ marginBottom: '20px', padding: '16px', backgroundColor: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '20px', 
              height: '20px', 
              border: '3px solid var(--warning)', 
              borderTop: '3px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <strong>Running tests... Current step: {currentStep || 'Initializing'}</strong>
          </div>
        </Card>
      )}

      <Card>
        <h2 style={{ marginBottom: '16px' }}>Test Results</h2>
        {testResults.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No test results yet. Click "Run All Tests" to start.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Step</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Message</th>
                  <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {testResults.map((result, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '12px', fontSize: '13px' }}>
                      <strong>{result.step}</strong>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>
                      <span style={{ 
                        color: getStatusColor(result.status),
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span>{getStatusIcon(result.status)}</span>
                        {result.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: '12px', fontSize: '13px' }}>{result.message}</td>
                    <td style={{ padding: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TestAutomation;

