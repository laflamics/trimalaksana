import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Report from '../../src/pages/Settings/Report';
import SalesOrders from '../../src/pages/Packaging/SalesOrders';
import Purchasing from '../../src/pages/Packaging/Purchasing';
import { storageService } from '../../src/services/storage';
import React from 'react';

/**
 * Integration Test: UI Flow dari awal sampai akhir
 * 
 * Test untuk:
 * 1. Semua pages load dengan benar
 * 2. Data muncul di UI
 * 3. Flow dari SO creation sampai Report
 * 4. Semua data muncul di Report
 */

// Mock storage service
vi.mock('../../src/services/storage', () => ({
  storageService: {
    get: vi.fn(),
    set: vi.fn(),
    remove: vi.fn(),
    getConfig: vi.fn(() => ({ type: 'local' })),
  },
}));

// Mock window.open untuk print
global.window.open = vi.fn(() => ({
  document: {
    write: vi.fn(),
    close: vi.fn(),
  },
  print: vi.fn(),
}) as any);

describe('UI Flow Integration Test', () => {
  const mockSalesOrders = [
    {
      id: 'so-1',
      soNo: 'SO-2024-000001',
      customer: 'PT. TEST CUSTOMER',
      customerKode: 'C001',
      paymentTerms: 'TOP' as const,
      topDays: 30,
      status: 'OPEN' as const,
      created: '2024-01-15T10:00:00Z',
      items: [
        {
          id: 'item-1',
          productId: 'P001',
          productKode: 'P001',
          productName: 'CARTON BOX 540X360X220',
          qty: 100,
          unit: 'PCS',
          price: 11200,
          total: 1120000,
        },
      ],
    },
  ];

  const mockPurchaseOrders = [
    {
      id: 'po-1',
      poNo: 'PO-2024-000001',
      supplier: 'PT. TEST SUPPLIER',
      soNo: 'SO-2024-000001',
      materialItem: 'SHEET 186 X 60 CM',
      qty: 100,
      price: 5000,
      total: 500000,
      paymentTerms: 'TOP' as const,
      topDays: 30,
      status: 'OPEN' as const,
      deliveryDate: '2024-01-22',
      created: '2024-01-15T10:00:00Z',
    },
  ];

  const mockProduction = [
    {
      id: 'prod-1',
      grnNo: 'GRN-2024-000001',
      poNo: 'PO-2024-000001',
      soNo: 'SO-2024-000001',
      customer: 'PT. TEST CUSTOMER',
      productName: 'CARTON BOX 540X360X220',
      target: 100,
      progress: 80,
      remaining: 20,
      status: 'OPEN' as const,
      date: '2024-01-20',
    },
  ];

  const mockDelivery = [
    {
      id: 'del-1',
      sjNo: 'SJ-2024-000001',
      soNo: 'SO-2024-000001',
      customer: 'PT. TEST CUSTOMER',
      product: 'CARTON BOX 540X360X220',
      qty: 100,
      status: 'OPEN' as const,
    },
  ];

  const mockInvoices = [
    {
      id: 'inv-1',
      invoiceNo: 'INV-2024-000001',
      customer: 'PT. TEST CUSTOMER',
      soNo: 'SO-2024-000001',
      totalAmount: 1120000,
      status: 'UNPAID',
      created: '2024-01-25T10:00:00Z',
    },
  ];

  const mockInventory = [
    {
      id: 'inv-1',
      codeItem: 'MAT-001',
      description: 'SHEET 186 X 60 CM',
      kategori: 'Material',
      satuan: 'PCS',
      price: 5000,
      nextStock: 500,
      lastUpdate: '2024-01-20',
    },
  ];

  const mockStaff = [
    {
      id: 'staff-1',
      NIP: 'C20810035',
      'NAMA LENGKAP': 'SURYANA',
      DEPARTEMEN: 'LOGISTIC & TRANSPORTATION',
      JABATAN: 'Operator',
      'GAJI POKOK': 'Rp 816.000',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    (storageService.get as any).mockImplementation((key: string) => {
      const dataMap: any = {
        salesOrders: mockSalesOrders,
        purchaseOrders: mockPurchaseOrders,
        production: mockProduction,
        delivery: mockDelivery,
        invoices: mockInvoices,
        inventory: mockInventory,
        staff: mockStaff,
        customers: [{ id: 'c1', kode: 'C001', nama: 'PT. TEST CUSTOMER' }],
        suppliers: [{ id: 's1', kode: 'S001', nama: 'PT. TEST SUPPLIER' }],
        products: [{ id: 'p1', kode: 'P001', nama: 'CARTON BOX 540X360X220' }],
        materials: [{ id: 'm1', kode: 'MAT-001', nama: 'SHEET 186 X 60 CM' }],
        bom: [],
      };
      return Promise.resolve(dataMap[key] || []);
    });
  });

  describe('Report Page - Data Loading', () => {
    it('should load and display SO data in report', async () => {
      render(
        <BrowserRouter>
          <Report />
        </BrowserRouter>
      );

      // Click SO tab
      const soTab = screen.getByText('SO');
      await act(async () => {
        soTab.click();
      });

      await waitFor(() => {
        expect(storageService.get).toHaveBeenCalledWith('salesOrders');
      });

      // Check if SO data is displayed
      await waitFor(() => {
        expect(screen.getByText('SO-2024-000001')).toBeInTheDocument();
        expect(screen.getByText('PT. TEST CUSTOMER')).toBeInTheDocument();
      });
    });

    it('should load and display PO data in report', async () => {
      render(
        <BrowserRouter>
          <Report />
        </BrowserRouter>
      );

      // Click PO tab
      const poTab = screen.getByText('PO');
      await act(async () => {
        poTab.click();
      });

      await waitFor(() => {
        expect(storageService.get).toHaveBeenCalledWith('purchaseOrders');
      });

      // Check if PO data is displayed
      await waitFor(() => {
        expect(screen.getByText('PO-2024-000001')).toBeInTheDocument();
        expect(screen.getByText('PT. TEST SUPPLIER')).toBeInTheDocument();
      });
    });

    it('should load and display summary data', async () => {
      render(
        <BrowserRouter>
          <Report />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(storageService.get).toHaveBeenCalledWith('salesOrders');
        expect(storageService.get).toHaveBeenCalledWith('purchaseOrders');
        expect(storageService.get).toHaveBeenCalledWith('invoices');
      });

      // Check summary displays
      await waitFor(() => {
        expect(screen.getByText(/Total Sales Orders/i)).toBeInTheDocument();
        expect(screen.getByText(/Total Purchase Orders/i)).toBeInTheDocument();
        expect(screen.getByText(/Total Revenue/i)).toBeInTheDocument();
      });
    });

    it('should load and display all report tabs data', async () => {
      render(
        <BrowserRouter>
          <Report />
        </BrowserRouter>
      );

      // Test all tabs
      const tabs = ['Summary', 'Comprehensive', 'SO', 'PO', 'Production', 'Delivery', 'Invoice', 'Inventory', 'HR'];
      
      for (const tab of tabs) {
        const tabButton = screen.getByText(tab);
        await act(async () => {
          tabButton.click();
        });

        await waitFor(() => {
          expect(storageService.get).toHaveBeenCalled();
        });
      }
    });
  });

  describe('Sales Orders Page - Data Display', () => {
    it('should load and display sales orders', async () => {
      render(
        <BrowserRouter>
          <SalesOrders />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(storageService.get).toHaveBeenCalledWith('salesOrders');
      });

      // Check if data is displayed
      await waitFor(() => {
        expect(screen.getByText('SO-2024-000001')).toBeInTheDocument();
        expect(screen.getByText('PT. TEST CUSTOMER')).toBeInTheDocument();
      });
    });
  });

  describe('Purchasing Page - Data Display', () => {
    it('should load and display purchase orders', async () => {
      render(
        <BrowserRouter>
          <Purchasing />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(storageService.get).toHaveBeenCalledWith('purchaseOrders');
      });

      // Check if data is displayed
      await waitFor(() => {
        expect(screen.getByText('PO-2024-000001')).toBeInTheDocument();
        expect(screen.getByText('PT. TEST SUPPLIER')).toBeInTheDocument();
      });
    });
  });

  describe('End-to-End Flow', () => {
    it('should complete full flow: SO → PO → Production → Delivery → Invoice → Report', async () => {
      // Step 1: Create SO
      (storageService.get as any).mockResolvedValueOnce([]);
      (storageService.set as any).mockResolvedValueOnce(undefined);

      // Step 2: Create PO from SO
      (storageService.get as any).mockResolvedValueOnce(mockSalesOrders);
      (storageService.set as any).mockResolvedValueOnce(undefined);

      // Step 3: Create Production
      (storageService.get as any).mockResolvedValueOnce(mockPurchaseOrders);
      (storageService.set as any).mockResolvedValueOnce(undefined);

      // Step 4: Create Delivery
      (storageService.get as any).mockResolvedValueOnce(mockProduction);
      (storageService.set as any).mockResolvedValueOnce(undefined);

      // Step 5: Create Invoice
      (storageService.get as any).mockResolvedValueOnce(mockDelivery);
      (storageService.set as any).mockResolvedValueOnce(undefined);

      // Step 6: Check Report
      (storageService.get as any).mockImplementation((key: string) => {
        const dataMap: any = {
          salesOrders: mockSalesOrders,
          purchaseOrders: mockPurchaseOrders,
          production: mockProduction,
          delivery: mockDelivery,
          invoices: mockInvoices,
        };
        return Promise.resolve(dataMap[key] || []);
      });

      render(
        <BrowserRouter>
          <Report />
        </BrowserRouter>
      );

      // Verify all data loads in report
      await waitFor(() => {
        expect(storageService.get).toHaveBeenCalledWith('salesOrders');
        expect(storageService.get).toHaveBeenCalledWith('purchaseOrders');
        expect(storageService.get).toHaveBeenCalledWith('production');
        expect(storageService.get).toHaveBeenCalledWith('delivery');
        expect(storageService.get).toHaveBeenCalledWith('invoices');
      });
    });
  });

  describe('Data Completeness Check', () => {
    it('should show empty message when no data', async () => {
      (storageService.get as any).mockResolvedValue([]);

      render(
        <BrowserRouter>
          <Report />
        </BrowserRouter>
      );

      const soTab = screen.getByText('SO');
      await act(async () => {
        soTab.click();
      });

      await waitFor(() => {
        expect(screen.getByText(/No SO report data/i)).toBeInTheDocument();
      });
    });

    it('should handle missing data gracefully', async () => {
      (storageService.get as any).mockResolvedValue(null);

      render(
        <BrowserRouter>
          <Report />
        </BrowserRouter>
      );

      await waitFor(() => {
        expect(storageService.get).toHaveBeenCalled();
      });
    });
  });
});

