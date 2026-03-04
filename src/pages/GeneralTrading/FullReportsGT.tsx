import { useState } from 'react';
import Card from '../../components/Card';
import DynamicTable from '../../components/DynamicTable';
import { reportService } from '../../services/report-service';
import { purchaseReportService } from '../../services/purchase-report-service';
import { storageService, extractStorageValue } from '../../services/storage';
import { StorageKeys } from '../../services/storage';
import { toast } from '../../utils/toast-helper';
import '../../styles/common.css';
import '../Settings/FullReports.css';

// GT-specific data fetcher functions
const gtReportDataFetcher = {
  async getMasterProductsData() {
    const productsRaw = await storageService.get(StorageKeys.GENERAL_TRADING.PRODUCTS);
    const products = extractStorageValue(productsRaw) || [];
    
    return (products as any[]).map((p: any, idx: number) => ({
      'NO': idx + 1,
      'KODE': p.code || p.kode || '-',
      'NAMA PRODUK': p.name || p.nama || '-',
      'KATEGORI': p.category || p.kategori || '-',
      'UNIT': p.unit || p.satuan || '-',
      'HARGA JUAL': p.price || p.hargaFg || 0,
      'HARGA BELI': p.cost || p.harga || 0,
      'STOK': p.stock || p.stok || 0,
    }));
  },

  async getMasterCustomersData() {
    const customers = (await storageService.get(StorageKeys.GENERAL_TRADING.CUSTOMERS)) || [];
    return (customers as any[]).map((c: any, idx: number) => ({
      'NO': idx + 1,
      'KODE': c.code || c.kode || '-',
      'NAMA': c.name || c.nama || '-',
      'KONTAK': c.contactPerson || c.kontak || '-',
      'TELEPON': c.phone || c.telepon || '-',
      'EMAIL': c.email || '-',
      'ALAMAT': c.address || c.alamat || '-',
      'KOTA': c.city || c.kota || '-',
    }));
  },

  async getMasterSuppliersData() {
    const suppliers = (await storageService.get(StorageKeys.GENERAL_TRADING.SUPPLIERS)) || [];
    return (suppliers as any[]).map((s: any, idx: number) => ({
      'NO': idx + 1,
      'KODE': s.code || s.kode || '-',
      'NAMA': s.name || s.nama || '-',
      'KONTAK': s.contactPerson || s.kontak || '-',
      'TELEPON': s.phone || s.telepon || '-',
      'EMAIL': s.email || '-',
      'ALAMAT': s.address || s.alamat || '-',
    }));
  },

  async getMasterCategoriesData() {
    const categories = (await storageService.get(StorageKeys.GENERAL_TRADING.PRODUCTS)) || [];
    const categorySet = new Set();
    (categories as any[]).forEach((p: any) => {
      if (p.category || p.kategori) categorySet.add(p.category || p.kategori);
    });
    return Array.from(categorySet).map((cat: any, idx: number) => ({
      'NO': idx + 1,
      'KODE': cat,
      'NAMA KATEGORI': cat,
    }));
  },

  async getMasterUnitsData() {
    const products = (await storageService.get(StorageKeys.GENERAL_TRADING.PRODUCTS)) || [];
    const unitSet = new Set();
    (products as any[]).forEach((p: any) => {
      if (p.unit || p.satuan) unitSet.add(p.unit || p.satuan);
    });
    return Array.from(unitSet).map((unit: any, idx: number) => ({
      'NO': idx + 1,
      'KODE': unit,
      'NAMA SATUAN': unit,
    }));
  },

  async getMasterRegionsData() {
    return [
      { 'NO': 1, 'KODE': 'REG001', 'NAMA WILAYAH': 'Jakarta', 'DESKRIPSI': 'Wilayah Jakarta' },
      { 'NO': 2, 'KODE': 'REG002', 'NAMA WILAYAH': 'Surabaya', 'DESKRIPSI': 'Wilayah Surabaya' },
    ];
  },

  async getSalesOrdersData(startDate: string, endDate: string) {
    const ordersRaw = await storageService.get(StorageKeys.GENERAL_TRADING.SALES_ORDERS);
    const orders = extractStorageValue(ordersRaw) || [];
    
    const filtered = (orders as any[])
      .filter((o: any) => {
        const orderDate = o.orderDate || o.created || '';
        return orderDate >= startDate && orderDate <= endDate;
      });

    return filtered.map((o: any, idx: number) => {
      // Calculate total from items
      const itemsTotal = (o.items || []).reduce((sum: number, item: any) => sum + (item.total || 0), 0);
      const total = itemsTotal || o.financialSummary?.grandTotal || o.total || 0;
      
      return {
        'NO': idx + 1,
        'NO. SO': o.soNo || o.no || '-',
        'KODE PELANGGAN': o.customerKode || o.customerCode || '-',
        'NAMA PELANGGAN': o.customer || o.customerName || '-',
        'TANGGAL': (o.created || o.date || '').split('T')[0] || '-',
        'STATUS': o.status || 'OPEN',
        'TOTAL': total,
      };
    });
  },

  async getSalesOrdersPerItemData(startDate: string, endDate: string) {
    const orders = (await storageService.get(StorageKeys.GENERAL_TRADING.SALES_ORDERS)) || [];
    const flatItems: any[] = [];
    
    (orders as any[])
      .filter((o: any) => {
        const orderDate = o.orderDate || o.created || '';
        return orderDate >= startDate && orderDate <= endDate;
      })
      .forEach((o: any) => {
        (o.items || []).forEach((item: any, itemIdx: number) => {
          flatItems.push({
            soNo: o.soNo || o.no || '-',
            customer: o.customer || o.customerName || '-',
            soDate: (o.created || o.date || '').split('T')[0] || '-',
            itemNo: itemIdx + 1,
            productKode: item.productKode || item.kode || '-',
            productName: item.productName || item.nama || '-',
            qty: item.qty || 0,
            unit: item.unit || item.satuan || '-',
            price: item.price || 0,
            total: item.total || 0,
          });
        });
      });

    return flatItems.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'NO. SO': item.soNo,
      'TANGGAL': item.soDate,
      'PELANGGAN': item.customer,
      'ITEM': item.itemNo,
      'KODE PRODUK': item.productKode,
      'NAMA PRODUK': item.productName,
      'QTY': item.qty,
      'SATUAN': item.unit,
      'HARGA': item.price,
      'TOTAL': item.total,
    }));
  },

  async getPurchaseOrdersData(startDate: string, endDate: string) {
    const posRaw = await storageService.get(StorageKeys.GENERAL_TRADING.PURCHASE_ORDERS);
    const pos = extractStorageValue(posRaw) || [];
    
    const filtered = (pos as any[])
      .filter((po: any) => {
        const poDate = po.created || po.date || '';
        return poDate >= startDate && poDate <= endDate;
      });

    return filtered.map((po: any, idx: number) => {
      // Calculate total from items
      const itemsTotal = (po.items || []).reduce((sum: number, item: any) => sum + (item.total || 0), 0);
      const total = itemsTotal || po.financialSummary?.grandTotal || po.total || 0;
      
      return {
        'NO': idx + 1,
        'NO. PO': po.poNo || po.no || '-',
        'SUPPLIER': po.supplier || po.supplierName || '-',
        'TANGGAL': (po.created || po.date || '').split('T')[0] || '-',
        'STATUS': po.status || 'OPEN',
        'TOTAL': total,
      };
    });
  },

  async getPurchaseOrdersPerItemData(startDate: string, endDate: string) {
    const pos = (await storageService.get(StorageKeys.GENERAL_TRADING.PURCHASE_ORDERS)) || [];
    const flatItems: any[] = [];
    
    (pos as any[])
      .filter((po: any) => {
        const poDate = po.created || po.date || '';
        return poDate >= startDate && poDate <= endDate;
      })
      .forEach((po: any) => {
        (po.items || []).forEach((item: any, itemIdx: number) => {
          flatItems.push({
            poNo: po.poNo || po.no || '-',
            supplier: po.supplier || po.supplierName || '-',
            poDate: (po.created || po.date || '').split('T')[0] || '-',
            itemNo: itemIdx + 1,
            productKode: item.productKode || item.kode || '-',
            productName: item.productName || item.nama || '-',
            qty: item.qty || 0,
            unit: item.unit || item.satuan || '-',
            price: item.price || 0,
            total: item.total || 0,
          });
        });
      });

    return flatItems.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'NO. PO': item.poNo,
      'TANGGAL': item.poDate,
      'SUPPLIER': item.supplier,
      'ITEM': item.itemNo,
      'KODE PRODUK': item.productKode,
      'NAMA PRODUK': item.productName,
      'QTY': item.qty,
      'SATUAN': item.unit,
      'HARGA': item.price,
      'TOTAL': item.total,
    }));
  },

  // INVENTORY DATA
  async getInventoryStockData() {
    const inventoryRaw = await storageService.get(StorageKeys.GENERAL_TRADING.INVENTORY);
    const inventory = extractStorageValue(inventoryRaw) || [];
    
    return (inventory as any[]).map((inv: any, idx: number) => ({
      'NO': idx + 1,
      'KODE PRODUK': inv.productCode || inv.kode || '-',
      'NAMA PRODUK': inv.productName || inv.nama || '-',
      'STOK': inv.quantity || inv.qty || 0,
      'SATUAN': inv.unit || inv.satuan || '-',
      'HARGA BELI': inv.costPrice || inv.hargaBeli || 0,
      'HARGA JUAL': inv.sellPrice || inv.hargaJual || 0,
      'NILAI STOK': (inv.quantity || 0) * (inv.costPrice || 0),
    }));
  },

  // AR DATA
  async getARData(startDate: string, endDate: string) {
    const invoicesRaw = await storageService.get(StorageKeys.GENERAL_TRADING.INVOICES);
    const paymentsRaw = await storageService.get(StorageKeys.GENERAL_TRADING.PAYMENTS);
    
    const invoices = extractStorageValue(invoicesRaw) || [];
    const payments = extractStorageValue(paymentsRaw) || [];

    const paymentMap = new Map();
    (payments as any[]).forEach((p: any) => {
      if (!paymentMap.has(p.invoiceId)) {
        paymentMap.set(p.invoiceId, 0);
      }
      paymentMap.set(p.invoiceId, (paymentMap.get(p.invoiceId) || 0) + (p.amount || 0));
    });

    return (invoices as any[])
      .filter((inv: any) => {
        const invDate = inv.invoiceDate || inv.created || '';
        return invDate >= startDate && invDate <= endDate;
      })
      .map((inv: any, idx: number) => {
        const paid = paymentMap.get(inv.id) || 0;
        const outstanding = (inv.total || 0) - paid;
        return {
          'NO': idx + 1,
          'NO. FAKTUR': inv.invoiceNo || inv.no || '-',
          'PELANGGAN': inv.customerName || inv.customer || '-',
          'TANGGAL': (inv.invoiceDate || inv.created || '').split('T')[0] || '-',
          'TOTAL': inv.total || 0,
          'TERBAYAR': paid,
          'SISA': outstanding,
          'STATUS': outstanding > 0 ? 'OUTSTANDING' : 'PAID',
        };
      });
  },

  // AP DATA
  async getAPPerSupplierData(startDate: string, endDate: string) {
    const posRaw = await storageService.get(StorageKeys.GENERAL_TRADING.PURCHASE_ORDERS);
    const paymentsRaw = await storageService.get(StorageKeys.GENERAL_TRADING.PAYMENTS);
    
    const pos = extractStorageValue(posRaw) || [];
    const payments = extractStorageValue(paymentsRaw) || [];

    const supplierMap = new Map();
    
    (pos as any[])
      .filter((po: any) => {
        const poDate = po.created || po.date || '';
        return poDate >= startDate && poDate <= endDate;
      })
      .forEach((po: any) => {
        const supplier = po.supplier || po.supplierName || 'Unknown';
        if (!supplierMap.has(supplier)) {
          supplierMap.set(supplier, { totalPO: 0, totalPaid: 0 });
        }
        const data = supplierMap.get(supplier);
        data.totalPO += po.total || 0;
      });

    (payments as any[]).forEach((p: any) => {
      const supplier = p.supplierName || p.supplier || 'Unknown';
      if (supplierMap.has(supplier)) {
        const data = supplierMap.get(supplier);
        data.totalPaid += p.amount || 0;
      }
    });

    return Array.from(supplierMap.entries()).map(([supplier, data], idx: number) => ({
      'NO': idx + 1,
      'SUPPLIER': supplier,
      'TOTAL PO': data.totalPO,
      'TOTAL HUTANG': data.totalPO,
      'TERBAYAR': data.totalPaid,
      'SISA HUTANG': data.totalPO - data.totalPaid,
    }));
  },

  // PROFIT DATA
  async getProfitPerItemData(startDate: string, endDate: string) {
    const salesOrdersRaw = await storageService.get(StorageKeys.GENERAL_TRADING.SALES_ORDERS);
    const posRaw = await storageService.get(StorageKeys.GENERAL_TRADING.PURCHASE_ORDERS);
    
    const salesOrders = extractStorageValue(salesOrdersRaw) || [];
    const pos = extractStorageValue(posRaw) || [];

    const itemMap = new Map();

    // Collect sales data
    (salesOrders as any[])
      .filter((so: any) => {
        const soDate = so.created || so.date || '';
        return soDate >= startDate && soDate <= endDate;
      })
      .forEach((so: any) => {
        (so.items || []).forEach((item: any) => {
          const key = item.productKode || item.kode || 'Unknown';
          if (!itemMap.has(key)) {
            itemMap.set(key, {
              productName: item.productName || item.nama || '-',
              salesQty: 0,
              salesAmount: 0,
              costAmount: 0,
            });
          }
          const data = itemMap.get(key);
          data.salesQty += item.qty || 0;
          data.salesAmount += item.total || 0;
        });
      });

    // Collect cost data
    (pos as any[])
      .filter((po: any) => {
        const poDate = po.created || po.date || '';
        return poDate >= startDate && poDate <= endDate;
      })
      .forEach((po: any) => {
        (po.items || []).forEach((item: any) => {
          const key = item.productKode || item.kode || 'Unknown';
          if (itemMap.has(key)) {
            const data = itemMap.get(key);
            data.costAmount += item.total || 0;
          }
        });
      });

    return Array.from(itemMap.entries()).map(([key, data], idx: number) => ({
      'NO': idx + 1,
      'KODE PRODUK': key,
      'NAMA PRODUK': data.productName,
      'QTY TERJUAL': data.salesQty,
      'PENJUALAN': data.salesAmount,
      'HPP': data.costAmount,
      'LABA RUGI': data.salesAmount - data.costAmount,
      'MARGIN %': data.salesAmount > 0 ? (((data.salesAmount - data.costAmount) / data.salesAmount) * 100).toFixed(2) : 0,
    }));
  },

  async getProfitPerCustomerData(startDate: string, endDate: string) {
    const salesOrdersRaw = await storageService.get(StorageKeys.GENERAL_TRADING.SALES_ORDERS);
    const salesOrders = extractStorageValue(salesOrdersRaw) || [];

    const customerMap = new Map();

    (salesOrders as any[])
      .filter((so: any) => {
        const soDate = so.created || so.date || '';
        return soDate >= startDate && soDate <= endDate;
      })
      .forEach((so: any) => {
        const customer = so.customer || so.customerName || 'Unknown';
        if (!customerMap.has(customer)) {
          customerMap.set(customer, { salesAmount: 0, costAmount: 0 });
        }
        const data = customerMap.get(customer);
        data.salesAmount += so.total || 0;
        // Estimate cost as 70% of sales
        data.costAmount += (so.total || 0) * 0.7;
      });

    return Array.from(customerMap.entries()).map(([customer, data], idx: number) => ({
      'NO': idx + 1,
      'PELANGGAN': customer,
      'PENJUALAN': data.salesAmount,
      'HPP': data.costAmount,
      'LABA RUGI': data.salesAmount - data.costAmount,
      'MARGIN %': data.salesAmount > 0 ? (((data.salesAmount - data.costAmount) / data.salesAmount) * 100).toFixed(2) : 0,
    }));
  },
};

interface ReportCategory {
  id: string;
  name: string;
  icon: string;
  reports: ReportItem[];
}

interface ReportItem {
  id: string;
  name: string;
  description: string;
}

export default function FullReportsGT() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [generating, setGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewReportId, setPreviewReportId] = useState<string>('');

  // Report categories untuk General Trading
  const reportCategories: ReportCategory[] = [
    {
      id: 'master',
      name: 'Master Data',
      icon: '📋',
      reports: [
        { id: 'master-products', name: 'Daftar Item/Produk', description: 'Laporan daftar semua produk' },
        { id: 'master-customers', name: 'Daftar Pelanggan', description: 'Laporan daftar semua pelanggan' },
        { id: 'master-suppliers', name: 'Daftar Supplier', description: 'Laporan daftar semua supplier' },
        { id: 'master-categories', name: 'Daftar Kategori Produk', description: 'Laporan kategori produk' },
        { id: 'master-units', name: 'Daftar Satuan', description: 'Laporan satuan pengukuran' },
        { id: 'master-regions', name: 'Daftar Wilayah', description: 'Laporan wilayah pelanggan' },
      ],
    },
    {
      id: 'sales',
      name: 'Penjualan',
      icon: '💰',
      reports: [
        { id: 'sales-orders', name: 'Pesanan Penjualan', description: 'Laporan pesanan penjualan' },
        { id: 'sales-orders-per-item', name: 'Pesanan Penjualan Per Item', description: 'Detail pesanan per item' },
        { id: 'sales-return', name: 'Retur Penjualan', description: 'Laporan retur penjualan' },
        { id: 'sales-return-per-item', name: 'Retur Jual Per Item', description: 'Retur per item' },
        { id: 'sales-per-region', name: 'Penjualan Per Wilayah', description: 'Penjualan per wilayah' },
        { id: 'sales-per-item-region', name: 'Penjualan Per Item Per Wilayah', description: 'Detail item per wilayah' },
        { id: 'sales-customer-analysis', name: 'Analisa Pelanggan', description: 'Analisa pelanggan aktif/tidak aktif' },
        { id: 'sales-chart-top-items', name: 'Grafik Penjualan Item Terbaik', description: 'Chart top items' },
        { id: 'sales-chart-daily', name: 'Grafik Penjualan Harian', description: 'Chart harian' },
        { id: 'sales-chart-monthly', name: 'Grafik Penjualan Bulanan', description: 'Chart bulanan' },
      ],
    },
    {
      id: 'purchase',
      name: 'Pembelian',
      icon: '🛒',
      reports: [
        { id: 'purchase-orders', name: 'Pesanan Pembelian', description: 'Laporan PO' },
        { id: 'purchase-orders-per-item', name: 'Pesanan Pembelian Per Item', description: 'PO per item' },
        { id: 'purchase-return', name: 'Retur Pembelian', description: 'Laporan retur' },
        { id: 'purchase-return-per-item', name: 'Retur Beli Per Item', description: 'Retur per item' },
        { id: 'purchase-per-supplier', name: 'Pembelian Per Supplier', description: 'Pembelian per supplier' },
        { id: 'purchase-per-item-supplier', name: 'Pembelian Per Item Per Supplier', description: 'Pembelian item vs supplier' },
        { id: 'purchase-chart-top-items', name: 'Grafik Pembelian Item Terbesar', description: 'Chart item terbesar' },
        { id: 'purchase-chart-daily', name: 'Grafik Pembelian Harian', description: 'Chart harian' },
        { id: 'purchase-chart-monthly', name: 'Grafik Pembelian Bulanan', description: 'Chart bulanan' },
      ],
    },
    {
      id: 'inventory',
      name: 'Persediaan',
      icon: '📦',
      reports: [
        { id: 'inventory-stock', name: 'Stok Barang', description: 'Laporan stok barang' },
        { id: 'inventory-stock-per-warehouse', name: 'Stok Barang Per Gudang', description: 'Stok per gudang' },
        { id: 'inventory-min-stock', name: 'Stok Minimum', description: 'Laporan stok minimum' },
        { id: 'inventory-max-stock', name: 'Stok Maksimum', description: 'Laporan stok maksimum' },
        { id: 'inventory-card', name: 'Kartu Stok', description: 'Kartu stok barang' },
        { id: 'inventory-mutation', name: 'Mutasi Stok', description: 'Laporan mutasi stok' },
        { id: 'inventory-adjustment', name: 'Penyesuaian Stok (Stock Opname)', description: 'Stock opname' },
        { id: 'inventory-value-cost', name: 'Stok Berdasarkan Harga Beli', description: 'Nilai stok harga beli' },
        { id: 'inventory-value-sell', name: 'Stok Berdasarkan Harga Jual', description: 'Nilai stok harga jual' },
        { id: 'inventory-value-total', name: 'Nilai Persediaan', description: 'Total nilai persediaan' },
        { id: 'inventory-expiry', name: 'Barang Kadaluarsa', description: 'Laporan barang kadaluarsa' },
        { id: 'inventory-slow-moving', name: 'Barang Slow Moving', description: 'Barang slow moving' },
        { id: 'inventory-fast-moving', name: 'Barang Fast Moving', description: 'Barang fast moving' },
        { id: 'inventory-abc-analysis', name: 'Analisa ABC', description: 'Analisa ABC inventory' },
      ],
    },
    {
      id: 'accounting',
      name: 'Akuntansi',
      icon: '📊',
      reports: [
        { id: 'accounting-balance-sheet', name: 'Neraca (Balance Sheet)', description: 'Laporan neraca' },
        { id: 'accounting-income-statement', name: 'Laba Rugi (Income Statement)', description: 'Laporan laba rugi' },
        { id: 'accounting-equity-changes', name: 'Perubahan Modal', description: 'Laporan perubahan modal' },
        { id: 'accounting-cash-flow', name: 'Arus Kas (Cash Flow)', description: 'Laporan arus kas' },
        { id: 'accounting-general-ledger', name: 'Buku Besar', description: 'Buku besar' },
        { id: 'accounting-journal-general', name: 'Jurnal Umum', description: 'Jurnal umum' },
        { id: 'accounting-journal-sales', name: 'Jurnal Penjualan', description: 'Jurnal penjualan' },
        { id: 'accounting-journal-purchase', name: 'Jurnal Pembelian', description: 'Jurnal pembelian' },
        { id: 'accounting-journal-cash-in', name: 'Jurnal Kas Masuk', description: 'Jurnal kas masuk' },
        { id: 'accounting-journal-cash-out', name: 'Jurnal Kas Keluar', description: 'Jurnal kas keluar' },
        { id: 'accounting-trial-balance', name: 'Trial Balance (Neraca Saldo)', description: 'Neraca saldo' },
        { id: 'accounting-bank-statement', name: 'Rekening Koran', description: 'Rekening koran' },
        { id: 'accounting-coa', name: 'Chart of Account (COA)', description: 'Daftar akun' },
      ],
    },
    {
      id: 'ar',
      name: 'Piutang (AR)',
      icon: '💵',
      reports: [
        { id: 'ar-per-customer', name: 'Piutang Per Pelanggan', description: 'Piutang per pelanggan' },
        { id: 'ar-per-invoice', name: 'Piutang Per Faktur', description: 'Piutang per faktur' },
        { id: 'ar-aging', name: 'Aging Piutang (Umur Piutang)', description: 'Umur piutang' },
        { id: 'ar-payment', name: 'Pembayaran Piutang', description: 'Pembayaran piutang' },
        { id: 'ar-outstanding', name: 'Sisa Piutang', description: 'Sisa piutang' },
        { id: 'ar-due', name: 'Piutang Jatuh Tempo', description: 'Piutang jatuh tempo' },
        { id: 'ar-overdue', name: 'Piutang Overdue', description: 'Piutang overdue' },
        { id: 'ar-card', name: 'Kartu Piutang', description: 'Kartu piutang' },
        { id: 'ar-analysis', name: 'Analisa Piutang', description: 'Analisa piutang' },
      ],
    },
    {
      id: 'ap',
      name: 'Hutang (AP)',
      icon: '💸',
      reports: [
        { id: 'ap-per-supplier', name: 'Hutang Per Supplier', description: 'Hutang per supplier' },
        { id: 'ap-per-invoice', name: 'Hutang Per Faktur', description: 'Hutang per faktur' },
        { id: 'ap-aging', name: 'Aging Hutang (Umur Hutang)', description: 'Umur hutang' },
        { id: 'ap-payment', name: 'Pembayaran Hutang', description: 'Pembayaran hutang' },
        { id: 'ap-outstanding', name: 'Sisa Hutang', description: 'Sisa hutang' },
        { id: 'ap-due', name: 'Hutang Jatuh Tempo', description: 'Hutang jatuh tempo' },
        { id: 'ap-overdue', name: 'Hutang Overdue', description: 'Hutang overdue' },
        { id: 'ap-card', name: 'Kartu Hutang', description: 'Kartu hutang' },
        { id: 'ap-analysis', name: 'Analisa Hutang', description: 'Analisa hutang' },
      ],
    },
    {
      id: 'tax',
      name: 'Pajak',
      icon: '📄',
      reports: [
        { id: 'tax-ppn-in', name: 'PPN Masukan', description: 'Laporan PPN masukan' },
        { id: 'tax-ppn-out', name: 'PPN Keluaran', description: 'Laporan PPN keluaran' },
        { id: 'tax-spt-ppn', name: 'SPT Masa PPN', description: 'SPT masa PPN' },
        { id: 'tax-pph21', name: 'PPh 21', description: 'Laporan PPh 21' },
        { id: 'tax-pph22', name: 'PPh 22', description: 'Laporan PPh 22' },
        { id: 'tax-pph23', name: 'PPh 23', description: 'Laporan PPh 23' },
        { id: 'tax-pph25', name: 'PPh 25', description: 'Laporan PPh 25' },
        { id: 'tax-pph-final', name: 'PPh Final', description: 'Laporan PPh final' },
        { id: 'tax-efaktur', name: 'e-Faktur', description: 'Laporan e-faktur' },
        { id: 'tax-csv', name: 'CSV Faktur Pajak', description: 'Export CSV faktur pajak' },
      ],
    },
    {
      id: 'profit',
      name: 'Laba Rugi Detail',
      icon: '📈',
      reports: [
        { id: 'profit-per-item', name: 'Laba Rugi Per Item', description: 'Laba rugi per item' },
        { id: 'profit-per-customer', name: 'Laba Rugi Per Pelanggan', description: 'Laba rugi per pelanggan' },
        { id: 'profit-per-supplier', name: 'Laba Rugi Per Supplier', description: 'Laba rugi per supplier' },
        { id: 'profit-per-sales', name: 'Laba Rugi Per Sales', description: 'Laba rugi per sales' },
        { id: 'profit-per-region', name: 'Laba Rugi Per Wilayah', description: 'Laba rugi per wilayah' },
        { id: 'profit-per-category', name: 'Laba Rugi Per Kategori', description: 'Laba rugi per kategori' },
        { id: 'profit-margin', name: 'Margin Penjualan', description: 'Margin penjualan' },
        { id: 'profit-cogs', name: 'HPP (Harga Pokok Penjualan)', description: 'Laporan HPP' },
      ],
    },
    {
      id: 'custom',
      name: 'Custom/Khusus',
      icon: '⚙️',
      reports: [
        { id: 'custom-promo', name: 'Promo/Diskon', description: 'Laporan promo' },
        { id: 'custom-gt-sales-export', name: 'General Trading Sales Export', description: 'Laporan custom penjualan GT' },
      ],
    },
  ];



  const handleViewData = async (reportId: string) => {
    const reportName = reportCategories
      .flatMap(cat => cat.reports)
      .find(r => r.id === reportId)?.name || 'Report';
    
    setPreviewTitle(reportName);
    setPreviewReportId(reportId);
    setPreviewData([]);
    
    try {
      let data: any[] = [];

      // MASTER DATA
      if (reportId === 'master-products') {
        data = await gtReportDataFetcher.getMasterProductsData();
      } else if (reportId === 'master-customers') {
        data = await gtReportDataFetcher.getMasterCustomersData();
      } else if (reportId === 'master-suppliers') {
        data = await gtReportDataFetcher.getMasterSuppliersData();
      } else if (reportId === 'master-categories') {
        data = await gtReportDataFetcher.getMasterCategoriesData();
      } else if (reportId === 'master-units') {
        data = await gtReportDataFetcher.getMasterUnitsData();
      } else if (reportId === 'master-regions') {
        data = await gtReportDataFetcher.getMasterRegionsData();
      }
      // SALES DATA
      else if (reportId === 'sales-orders') {
        data = await gtReportDataFetcher.getSalesOrdersData(startDate, endDate);
      } else if (reportId === 'sales-orders-per-item') {
        data = await gtReportDataFetcher.getSalesOrdersPerItemData(startDate, endDate);
      } else if (reportId === 'sales-return') {
        data = [];
      } else if (reportId === 'sales-return-per-item') {
        data = [];
      } else if (reportId === 'sales-per-region') {
        data = [];
      } else if (reportId === 'sales-per-item-region') {
        data = [];
      } else if (reportId === 'sales-customer-analysis') {
        data = [];
      } else if (reportId === 'sales-chart-top-items') {
        data = [];
      } else if (reportId === 'sales-chart-daily') {
        data = [];
      } else if (reportId === 'sales-chart-monthly') {
        data = [];
      }
      // PURCHASE DATA
      else if (reportId === 'purchase-orders') {
        data = await gtReportDataFetcher.getPurchaseOrdersData(startDate, endDate);
      } else if (reportId === 'purchase-orders-per-item') {
        data = await gtReportDataFetcher.getPurchaseOrdersPerItemData(startDate, endDate);
      } else if (reportId === 'purchase-return') {
        data = [];
      } else if (reportId === 'purchase-return-per-item') {
        data = [];
      } else if (reportId === 'purchase-per-supplier') {
        data = [];
      } else if (reportId === 'purchase-per-item-supplier') {
        data = [];
      } else if (reportId === 'purchase-chart-top-items') {
        data = [];
      } else if (reportId === 'purchase-chart-daily') {
        data = [];
      } else if (reportId === 'purchase-chart-monthly') {
        data = [];
      }
      // INVENTORY DATA
      else if (reportId === 'inventory-stock') {
        data = await gtReportDataFetcher.getInventoryStockData();
      } else if (reportId === 'inventory-stock-per-warehouse') {
        data = await gtReportDataFetcher.getInventoryStockData();
      } else if (reportId === 'inventory-min-stock') {
        data = await gtReportDataFetcher.getInventoryStockData();
      } else if (reportId === 'inventory-max-stock') {
        data = await gtReportDataFetcher.getInventoryStockData();
      } else if (reportId === 'inventory-card') {
        data = await gtReportDataFetcher.getInventoryStockData();
      } else if (reportId === 'inventory-mutation') {
        data = [];
      } else if (reportId === 'inventory-adjustment') {
        data = [];
      } else if (reportId === 'inventory-value-cost') {
        data = await gtReportDataFetcher.getInventoryStockData();
      } else if (reportId === 'inventory-value-sell') {
        data = await gtReportDataFetcher.getInventoryStockData();
      } else if (reportId === 'inventory-value-total') {
        data = await gtReportDataFetcher.getInventoryStockData();
      } else if (reportId === 'inventory-expiry') {
        data = [];
      } else if (reportId === 'inventory-slow-moving') {
        data = [];
      } else if (reportId === 'inventory-fast-moving') {
        data = [];
      } else if (reportId === 'inventory-abc-analysis') {
        data = [];
      }
      // ACCOUNTING DATA
      else if (reportId === 'accounting-balance-sheet' || reportId === 'accounting-income-statement' || reportId === 'accounting-equity-changes' || reportId === 'accounting-cash-flow' || reportId === 'accounting-general-ledger' || reportId === 'accounting-journal-general' || reportId === 'accounting-journal-sales' || reportId === 'accounting-journal-purchase' || reportId === 'accounting-journal-cash-in' || reportId === 'accounting-journal-cash-out' || reportId === 'accounting-trial-balance' || reportId === 'accounting-bank-statement' || reportId === 'accounting-coa') {
        data = [];
      }
      // AR DATA
      else if (reportId === 'ar-per-customer' || reportId === 'ar-per-invoice' || reportId === 'ar-aging' || reportId === 'ar-payment' || reportId === 'ar-outstanding' || reportId === 'ar-due' || reportId === 'ar-overdue' || reportId === 'ar-card' || reportId === 'ar-analysis') {
        data = await gtReportDataFetcher.getARData(startDate, endDate);
      }
      // AP DATA
      else if (reportId === 'ap-per-supplier') {
        data = await gtReportDataFetcher.getAPPerSupplierData(startDate, endDate);
      } else if (reportId === 'ap-per-invoice') {
        data = [];
      } else if (reportId === 'ap-aging') {
        data = [];
      } else if (reportId === 'ap-payment') {
        data = [];
      } else if (reportId === 'ap-outstanding') {
        data = [];
      } else if (reportId === 'ap-due') {
        data = [];
      } else if (reportId === 'ap-overdue') {
        data = [];
      } else if (reportId === 'ap-card') {
        data = [];
      } else if (reportId === 'ap-analysis') {
        data = [];
      }
      // TAX DATA
      else if (reportId === 'tax-ppn-in') {
        data = [];
      } else if (reportId === 'tax-ppn-out') {
        data = [];
      } else if (reportId === 'tax-spt-ppn') {
        data = [];
      } else if (reportId === 'tax-pph21' || reportId === 'tax-pph22' || reportId === 'tax-pph23' || reportId === 'tax-pph25' || reportId === 'tax-pph-final') {
        data = [];
      } else if (reportId === 'tax-efaktur') {
        data = [];
      } else if (reportId === 'tax-csv') {
        data = [];
      }
      // PROFIT DATA
      else if (reportId === 'profit-per-item') {
        data = await gtReportDataFetcher.getProfitPerItemData(startDate, endDate);
      } else if (reportId === 'profit-per-customer') {
        data = await gtReportDataFetcher.getProfitPerCustomerData(startDate, endDate);
      } else if (reportId === 'profit-per-supplier') {
        data = [];
      } else if (reportId === 'profit-per-sales') {
        data = [];
      } else if (reportId === 'profit-per-region') {
        data = [];
      } else if (reportId === 'profit-per-category') {
        data = [];
      } else if (reportId === 'profit-margin') {
        data = [];
      } else if (reportId === 'profit-cogs') {
        data = [];
      }
      // CUSTOM DATA
      else if (reportId === 'custom-promo') {
        data = [];
      } else if (reportId === 'custom-gt-sales-export') {
        data = [];
      }

      setPreviewData(data);
    } catch (error) {
      console.error('Error loading preview data:', error);
      toast.error('Gagal memuat preview data');
      setPreviewData([]);
    }
  };

  const handleExportReport = async (reportId: string) => {
    setGenerating(true);
    try {
      switch(reportId) {
        // SALES
        case 'sales-orders':
          await reportService.generatePackagingSalesOrdersReport(startDate, endDate);
          break;
        case 'sales-orders-per-item':
          await reportService.generatePackagingSalesOrdersPerItemReport(startDate, endDate);
          break;
        case 'sales-return':
          await reportService.generatePackagingSalesReturnReport(startDate, endDate);
          break;
        case 'sales-return-per-item':
          await reportService.generatePackagingSalesReturnReport(startDate, endDate);
          break;
        case 'sales-per-region':
          await reportService.generatePackagingSalesByRegionReport(startDate, endDate);
          break;
        case 'sales-per-item-region':
          await reportService.generatePackagingSalesByRegionReport(startDate, endDate);
          break;
        case 'sales-customer-analysis':
          await reportService.generateSalesCustomerAnalysisReport(startDate, endDate);
          break;
        case 'sales-chart-top-items':
          await reportService.generateSalesChartTopItemsReport(startDate, endDate);
          break;
        case 'sales-chart-daily':
          await reportService.generateSalesChartDailyReport(startDate, endDate);
          break;
        case 'sales-chart-monthly':
          await reportService.generateSalesChartMonthlyReport(startDate, endDate);
          break;
        // PURCHASE
        case 'purchase-orders':
          await purchaseReportService.generatePurchaseOrdersReport(startDate, endDate);
          break;
        case 'purchase-orders-per-item':
          await purchaseReportService.generatePurchaseOrdersPerItemReport(startDate, endDate);
          break;
        case 'purchase-return':
          await purchaseReportService.generatePurchaseReturnReport(startDate, endDate);
          break;
        case 'purchase-return-per-item':
          await purchaseReportService.generatePurchaseReturnPerItemReport(startDate, endDate);
          break;
        case 'purchase-per-supplier':
          await purchaseReportService.generatePurchasePerSupplierReport(startDate, endDate);
          break;
        case 'purchase-per-item-supplier':
          await purchaseReportService.generatePurchasePerItemSupplierReport(startDate, endDate);
          break;
        case 'purchase-chart-top-items':
          await purchaseReportService.generatePurchaseChartTopItemsReport(startDate, endDate);
          break;
        case 'purchase-chart-daily':
          await purchaseReportService.generatePurchaseChartDailyReport(startDate, endDate);
          break;
        case 'purchase-chart-monthly':
          await purchaseReportService.generatePurchaseChartMonthlyReport(startDate, endDate);
          break;
        // INVENTORY
        case 'inventory-stock':
        case 'inventory-stock-per-warehouse':
        case 'inventory-min-stock':
        case 'inventory-max-stock':
        case 'inventory-card':
        case 'inventory-mutation':
        case 'inventory-adjustment':
        case 'inventory-value-cost':
        case 'inventory-value-sell':
        case 'inventory-value-total':
        case 'inventory-expiry':
        case 'inventory-slow-moving':
        case 'inventory-fast-moving':
        case 'inventory-abc-analysis':
          toast.warning('Laporan inventory belum diimplementasikan');
          break;
        // ACCOUNTING
        case 'accounting-balance-sheet':
        case 'accounting-income-statement':
        case 'accounting-equity-changes':
        case 'accounting-cash-flow':
        case 'accounting-general-ledger':
        case 'accounting-journal-general':
        case 'accounting-journal-sales':
        case 'accounting-journal-purchase':
        case 'accounting-journal-cash-in':
        case 'accounting-journal-cash-out':
        case 'accounting-trial-balance':
        case 'accounting-bank-statement':
        case 'accounting-coa':
          toast.warning('Laporan akuntansi belum diimplementasikan');
          break;
        // AR
        case 'ar-per-customer':
        case 'ar-per-invoice':
        case 'ar-aging':
        case 'ar-payment':
        case 'ar-outstanding':
        case 'ar-due':
        case 'ar-overdue':
        case 'ar-card':
        case 'ar-analysis':
          await reportService.generateARReport();
          break;
        // AP
        case 'ap-per-supplier':
        case 'ap-per-invoice':
        case 'ap-aging':
        case 'ap-payment':
        case 'ap-outstanding':
        case 'ap-due':
        case 'ap-overdue':
        case 'ap-card':
        case 'ap-analysis':
          await reportService.generateAPReport();
          break;
        // TAX
        case 'tax-ppn-in':
        case 'tax-ppn-out':
        case 'tax-spt-ppn':
        case 'tax-pph21':
        case 'tax-pph22':
        case 'tax-pph23':
        case 'tax-pph25':
        case 'tax-pph-final':
        case 'tax-efaktur':
        case 'tax-csv':
          toast.warning('Laporan pajak belum diimplementasikan');
          break;
        // PROFIT
        case 'profit-per-item':
        case 'profit-per-customer':
        case 'profit-per-supplier':
        case 'profit-per-sales':
        case 'profit-per-region':
        case 'profit-per-category':
        case 'profit-margin':
        case 'profit-cogs':
          toast.warning('Laporan laba rugi belum diimplementasikan');
          break;
        // CUSTOM
        case 'custom-promo':
        case 'custom-gt-sales-export':
          toast.warning('Laporan custom belum diimplementasikan');
          break;
        default:
          toast.warning('Report belum diimplementasikan');
      }
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="full-reports-page">
      <div className="full-reports-header">
        <h1>📊 Full Reports - General Trading</h1>
        <p>Laporan lengkap untuk operasi General Trading</p>
      </div>

      {/* Filters */}
      <Card title="Filter Laporan">
        <div className="reports-filters">
          <div className="filter-row">
            <div className="filter-group">
              <label>🔍 Cari Laporan</label>
              <input
                type="text"
                placeholder="Cari nama laporan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="filter-select"
              />
            </div>
            <div className="filter-group">
              <label>📁 Kategori</label>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="filter-select"
              >
                <option value="">Semua Kategori</option>
                {reportCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.icon} {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label>📅 Tanggal Mulai</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="filter-select"
              />
            </div>

            <div className="filter-group">
              <label>📅 Tanggal Akhir</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="filter-select"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content - 2 Column Layout */}
      <div className="full-reports-container">
        {/* Left Column - Reports Grid */}
        <div className="reports-list-column">
          <div className="reports-categories">
            {reportCategories.map(category => (
              <button
                key={category.id}
                className={`category-header ${selectedCategory === category.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
              >
                <span className="category-header-icon">{category.icon}</span>
                <span className="category-header-title">{category.name}</span>
                <span className="category-header-count">{category.reports.length}</span>
              </button>
            ))}
          </div>

          {/* Reports Grid - Shown when category selected */}
          {selectedCategory && (
            <div className="reports-grid">
              {reportCategories
                .find(c => c.id === selectedCategory)
                ?.reports.filter(report =>
                  searchQuery === '' ||
                  report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  report.description.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map(report => (
                  <div key={report.id} className="report-card">
                    <div className="report-card-buttons">
                      <button
                        className="view-data-btn"
                        onClick={() => handleViewData(report.id)}
                        disabled={generating}
                        title={`Preview data untuk ${report.name}`}
                      >
                        📝
                      </button>
                      <button
                        className="excel-export-btn"
                        onClick={() => handleExportReport(report.id)}
                        disabled={generating}
                        title={`Export ${report.name} ke Excel`}
                      >
                        📊
                      </button>
                    </div>
                    <div className="report-info">
                      <h4>{report.name}</h4>
                      <p>{report.description}</p>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Right Column - Data Preview */}
        <div className="data-preview-column">
          {previewData.length > 0 ? (
            <Card title={`📊 ${previewTitle}`}>
              <DynamicTable 
                data={previewData} 
                title={previewTitle}
                reportId={previewReportId}
              />
            </Card>
          ) : (
            <Card title="📊 Preview Data">
              <div className="data-preview-empty">
                <p>Klik tombol 📝 untuk melihat preview data</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Summary */}
      <Card title="📊 Ringkasan">
        <div className="reports-summary">
          <div className="summary-item">
            <span className="summary-label">Total Kategori:</span>
            <span className="summary-value">{reportCategories.length}</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Laporan:</span>
            <span className="summary-value">
              {reportCategories.reduce((sum, cat) => sum + cat.reports.length, 0)}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Laporan Ditampilkan:</span>
            <span className="summary-value">
              {selectedCategory 
                ? reportCategories.find(c => c.id === selectedCategory)?.reports.length || 0
                : 0
              }
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
