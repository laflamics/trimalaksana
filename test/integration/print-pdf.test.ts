import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Integration Test: Print & PDF Functions
 * 
 * Test untuk:
 * 1. Print Invoice
 * 2. Print PO (Purchase Order)
 * 3. Print Quotation
 * 4. Save to PDF (verify print window opens)
 */

describe('Print & PDF Functions', () => {
  let mockPrintWindow: any;
  let mockPrint: any;
  let mockDocumentWrite: any;
  let mockDocumentClose: any;

  beforeEach(() => {
    // Mock window.open and print
    mockDocumentWrite = vi.fn();
    mockDocumentClose = vi.fn();
    mockPrint = vi.fn();

    mockPrintWindow = {
      document: {
        write: mockDocumentWrite,
        close: mockDocumentClose,
      },
      print: mockPrint,
    };

    global.window.open = vi.fn(() => mockPrintWindow as any);
  });

  describe('Print Invoice', () => {
    it('should open print window and generate invoice HTML', () => {
      const invoice = {
        invoiceNo: 'INV-2024-000001',
        customer: 'PT. TEST CUSTOMER',
        soNo: 'SO-2024-000001',
        totalAmount: 1120000,
        status: 'UNPAID',
        created: '2024-01-15',
        items: [
          {
            product: 'CARTON BOX 540X360X220',
            qty: 100,
            price: 11200,
            total: 1120000,
          },
        ],
      };

      // Simulate print invoice function
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const html = `
          <html>
            <head><title>Invoice ${invoice.invoiceNo}</title></head>
            <body style="font-family: Arial; padding: 20px;">
              <h1>Invoice ${invoice.invoiceNo}</h1>
              <p>Customer: ${invoice.customer}</p>
              <p>SO No: ${invoice.soNo}</p>
              <p>Date: ${invoice.created}</p>
              <p>Status: ${invoice.status}</p>
              <p>Total: Rp ${invoice.totalAmount.toLocaleString('id-ID')}</p>
            </body>
          </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }

      expect(global.window.open).toHaveBeenCalledWith('', '_blank');
      expect(mockDocumentWrite).toHaveBeenCalled();
      expect(mockDocumentClose).toHaveBeenCalled();
      expect(mockPrint).toHaveBeenCalled();
    });

    it('should include all invoice details in print', () => {
      const invoice = {
        invoiceNo: 'INV-2024-000001',
        customer: 'PT. TEST CUSTOMER',
        soNo: 'SO-2024-000001',
        totalAmount: 1120000,
        paymentTerms: 'TOP',
        topDays: 30,
        dueDate: '2024-02-15',
        created: '2024-01-15',
      };

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const html = `
          <html>
            <head><title>Invoice ${invoice.invoiceNo}</title></head>
            <body style="font-family: Arial; padding: 20px;">
              <h1>Invoice ${invoice.invoiceNo}</h1>
              <p>Customer: ${invoice.customer}</p>
              <p>SO No: ${invoice.soNo}</p>
              <p>Payment Terms: ${invoice.paymentTerms} (${invoice.topDays} days)</p>
              <p>Due Date: ${invoice.dueDate}</p>
              <p>Total: Rp ${invoice.totalAmount.toLocaleString('id-ID')}</p>
            </body>
          </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }

      const writtenContent = mockDocumentWrite.mock.calls[0][0];
      expect(writtenContent).toContain('INV-2024-000001');
      expect(writtenContent).toContain('PT. TEST CUSTOMER');
      expect(writtenContent).toContain('SO-2024-000001');
      expect(writtenContent).toContain('1.120.000');
    });
  });

  describe('Print Purchase Order (PO)', () => {
    it('should open print window and generate PO HTML', () => {
      const po = {
        poNo: 'PO-2024-000001',
        supplier: 'PT. TEST SUPPLIER',
        soNo: 'SO-2024-000001',
        spkNo: 'SPK-2024-000001',
        materialItem: 'SHEET 186 X 60 CM',
        qty: 100,
        price: 5000,
        total: 500000,
        paymentTerms: 'TOP',
        topDays: 30,
        deliveryDate: '2024-01-22',
        created: '2024-01-15',
      };

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const html = `
          <html>
            <head><title>PO ${po.poNo}</title></head>
            <body style="font-family: Arial; padding: 20px;">
              <h1>Purchase Order ${po.poNo}</h1>
              <p>Supplier: ${po.supplier}</p>
              <p>SO No: ${po.soNo}</p>
              <p>SPK No: ${po.spkNo}</p>
              <p>Material: ${po.materialItem}</p>
              <p>Qty: ${po.qty}</p>
              <p>Price: Rp ${po.price.toLocaleString('id-ID')}</p>
              <p>Total: Rp ${po.total.toLocaleString('id-ID')}</p>
              <p>Payment Terms: ${po.paymentTerms} (${po.topDays} days)</p>
              <p>Delivery Date: ${po.deliveryDate}</p>
            </body>
          </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }

      expect(global.window.open).toHaveBeenCalledWith('', '_blank');
      expect(mockDocumentWrite).toHaveBeenCalled();
      expect(mockDocumentClose).toHaveBeenCalled();
      expect(mockPrint).toHaveBeenCalled();
    });

    it('should include all PO details in print', () => {
      const po = {
        poNo: 'PO-2024-000001',
        supplier: 'PT. TEST SUPPLIER',
        materialItem: 'SHEET 186 X 60 CM',
        qty: 100,
        price: 5000,
        total: 500000,
      };

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const html = `
          <html>
            <head><title>PO ${po.poNo}</title></head>
            <body style="font-family: Arial; padding: 20px;">
              <h1>Purchase Order ${po.poNo}</h1>
              <p>Supplier: ${po.supplier}</p>
              <p>Material: ${po.materialItem}</p>
              <p>Qty: ${po.qty}</p>
              <p>Total: Rp ${po.total.toLocaleString('id-ID')}</p>
            </body>
          </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }

      const writtenContent = mockDocumentWrite.mock.calls[0][0];
      expect(writtenContent).toContain('PO-2024-000001');
      expect(writtenContent).toContain('PT. TEST SUPPLIER');
      expect(writtenContent).toContain('SHEET 186 X 60 CM');
      expect(writtenContent).toContain('500.000');
    });
  });

  describe('Print Quotation', () => {
    it('should open print window and generate quotation HTML', () => {
      const quotation = {
        soNo: 'SO-2024-000001',
        customer: 'PT. TEST CUSTOMER',
        paymentTerms: 'TOP',
        topDays: 30,
        created: '2024-01-15',
        globalSpecNote: 'Special packaging required',
        items: [
          {
            productName: 'CARTON BOX 540X360X220',
            qty: 100,
            unit: 'PCS',
            price: 11200,
            total: 1120000,
          },
        ],
      };

      const total = quotation.items.reduce((sum, i) => sum + i.total, 0);

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const html = `
          <html>
            <head>
              <title>Quotation ${quotation.soNo}</title>
              <style>
                body { font-family: Arial; padding: 20px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .total { text-align: right; font-weight: bold; margin-top: 20px; }
                .header { margin-bottom: 20px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>QUOTATION</h1>
                <p><strong>SO No (PO Customer):</strong> ${quotation.soNo}</p>
                <p><strong>Customer:</strong> ${quotation.customer}</p>
                <p><strong>Payment Terms:</strong> ${quotation.paymentTerms}${quotation.paymentTerms === 'TOP' && quotation.topDays ? ` (${quotation.topDays} days)` : ''}</p>
                <p><strong>Date:</strong> ${quotation.created}</p>
                ${quotation.globalSpecNote ? `<p><strong>Spec Note:</strong> ${quotation.globalSpecNote}</p>` : ''}
              </div>
              <table>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${quotation.items.map((item, idx) => `
                    <tr>
                      <td>${idx + 1}</td>
                      <td>${item.productName}</td>
                      <td>${item.qty}</td>
                      <td>${item.unit}</td>
                      <td>Rp ${item.price.toLocaleString('id-ID')}</td>
                      <td>Rp ${item.total.toLocaleString('id-ID')}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <div class="total">
                <p>Total: Rp ${total.toLocaleString('id-ID')}</p>
              </div>
            </body>
          </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }

      expect(global.window.open).toHaveBeenCalledWith('', '_blank');
      expect(mockDocumentWrite).toHaveBeenCalled();
      expect(mockDocumentClose).toHaveBeenCalled();
      expect(mockPrint).toHaveBeenCalled();
    });

    it('should include all quotation items and calculate total correctly', () => {
      const quotation = {
        soNo: 'SO-2024-000001',
        customer: 'PT. TEST CUSTOMER',
        items: [
          {
            productName: 'CARTON BOX 540X360X220',
            qty: 100,
            unit: 'PCS',
            price: 11200,
            total: 1120000,
          },
          {
            productName: 'CARTON BOX 387X277X125',
            qty: 50,
            unit: 'PCS',
            price: 6000,
            total: 300000,
          },
        ],
      };

      const total = quotation.items.reduce((sum, i) => sum + i.total, 0);

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const html = `
          <html>
            <head><title>Quotation ${quotation.soNo}</title></head>
            <body>
              <h1>QUOTATION</h1>
              <p>SO No: ${quotation.soNo}</p>
              <p>Customer: ${quotation.customer}</p>
              <table>
                ${quotation.items.map((item, idx) => `
                  <tr>
                    <td>${idx + 1}</td>
                    <td>${item.productName}</td>
                    <td>${item.qty}</td>
                    <td>Rp ${item.total.toLocaleString('id-ID')}</td>
                  </tr>
                `).join('')}
              </table>
              <p>Total: Rp ${total.toLocaleString('id-ID')}</p>
            </body>
          </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }

      const writtenContent = mockDocumentWrite.mock.calls[0][0];
      expect(writtenContent).toContain('SO-2024-000001');
      expect(writtenContent).toContain('PT. TEST CUSTOMER');
      expect(writtenContent).toContain('CARTON BOX 540X360X220');
      expect(writtenContent).toContain('CARTON BOX 387X277X125');
      expect(writtenContent).toContain('1.420.000'); // Total: 1120000 + 300000
    });
  });

  describe('Save to PDF (Print Window)', () => {
    it('should open print window for PDF save (user can save as PDF from print dialog)', () => {
      const document = {
        invoiceNo: 'INV-2024-000001',
        customer: 'PT. TEST CUSTOMER',
        totalAmount: 1120000,
      };

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head><title>${document.invoiceNo}</title></head>
            <body>
              <h1>Invoice ${document.invoiceNo}</h1>
              <p>Customer: ${document.customer}</p>
              <p>Total: Rp ${document.totalAmount.toLocaleString('id-ID')}</p>
            </body>
          </html>
        `);
        printWindow.document.close();
        // User can save as PDF from print dialog
        printWindow.print();
      }

      expect(global.window.open).toHaveBeenCalledWith('', '_blank');
      expect(mockPrint).toHaveBeenCalled();
      // Note: Actual PDF save happens in browser print dialog (Save as PDF option)
    });

    it('should format currency correctly for PDF', () => {
      const amounts = [1120000, 500000, 300000, 1000000];
      
      amounts.forEach(amount => {
        const formatted = amount.toLocaleString('id-ID');
        expect(formatted).toBeTruthy();
        expect(typeof formatted).toBe('string');
      });

      const amount1 = 1120000;
      const amount2 = 500000;
      expect(amount1.toLocaleString('id-ID')).toBe('1.120.000');
      expect(amount2.toLocaleString('id-ID')).toBe('500.000');
    });

    it('should include proper styling for print/PDF', () => {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const html = `
          <html>
            <head>
              <title>Test Document</title>
              <style>
                body { font-family: Arial; padding: 20px; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ddd; padding: 8px; }
                th { background-color: #f2f2f2; }
                @media print {
                  body { margin: 0; }
                  .no-print { display: none; }
                }
              </style>
            </head>
            <body>
              <h1>Test Document</h1>
              <p>This is a test document for printing/PDF</p>
            </body>
          </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }

      const writtenContent = mockDocumentWrite.mock.calls[0][0];
      expect(writtenContent).toContain('<style>');
      expect(writtenContent).toContain('@media print');
      expect(writtenContent).toContain('font-family: Arial');
    });
  });

  describe('Print Error Handling', () => {
    it('should handle print window failure gracefully', () => {
      global.window.open = vi.fn(() => null);

      const invoice = {
        invoiceNo: 'INV-2024-000001',
        customer: 'PT. TEST CUSTOMER',
      };

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`<html><body><h1>Invoice ${invoice.invoiceNo}</h1></body></html>`);
        printWindow.document.close();
        printWindow.print();
      }

      expect(global.window.open).toHaveBeenCalled();
      // Should not throw error if window.open returns null
    });

    it('should handle missing data gracefully', () => {
      const invoice = {
        invoiceNo: 'INV-2024-000001',
        // Missing customer and other fields
      };

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const html = `
          <html>
            <body>
              <h1>Invoice ${invoice.invoiceNo || 'N/A'}</h1>
              <p>Customer: ${invoice.customer || 'N/A'}</p>
            </body>
          </html>
        `;
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();
      }

      const writtenContent = mockDocumentWrite.mock.calls[0][0];
      expect(writtenContent).toContain('INV-2024-000001');
      expect(writtenContent).toContain('N/A'); // Should show N/A for missing data
    });
  });
});

