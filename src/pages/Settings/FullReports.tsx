import { useState } from 'react';
import Card from '../../components/Card';
import Input from '../../components/Input';
import DynamicTable from '../../components/DynamicTable';
import { reportService } from '../../services/report-service';
import { purchaseReportService } from '../../services/purchase-report-service';
import { reportDataFetcher } from '../../services/report-data-fetcher';
import { toast } from '../../utils/toast-helper';
import '../../styles/common.css';
import './FullReports.css';

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

export default function FullReports() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [generating, setGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewReportId, setPreviewReportId] = useState<string>('');

  // All report categories based on iPos Professional
  const reportCategories: ReportCategory[] = [
    {
      id: 'master',
      name: 'Master Data',
      icon: '📋',
      reports: [
        { id: 'master-products', name: 'Daftar Item/Produk', description: 'Laporan daftar semua produk' },
        { id: 'master-products-bom', name: 'Daftar Item/Produk-BOM', description: 'Laporan daftar semua produk dengan bom' },
        { id: 'master-materials', name: 'Daftar Item/Material', description: 'Laporan daftar semua material'},
        { id: 'master-customers', name: 'Daftar Pelanggan', description: 'Laporan daftar semua pelanggan' },
        { id: 'master-suppliers', name: 'Daftar Supplier', description: 'Laporan daftar semua supplier' },
        { id: 'master-employees', name: 'Daftar Karyawan/Sales', description: 'Laporan daftar karyawan' },
        { id: 'master-categories', name: 'Daftar Kategori Produk', description: 'Laporan kategori produk' },
        { id: 'master-units', name: 'Daftar Satuan', description: 'Laporan satuan pengukuran' },
        { id: 'master-regions', name: 'Daftar Wilayah', description: 'Laporan wilayah pelanggan' },
        { id: 'master-banks', name: 'Daftar Bank', description: 'Laporan daftar bank' },
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
        { id: 'sales-per-region', name: 'Penjualan Per Wilayah Pelanggan', description: 'Penjualan per wilayah' },
        { id: 'sales-per-item-region', name: 'Penjualan Per Item Per Wilayah', description: 'Detail item per wilayah' },
        { id: 'sales-customer-analysis', name: 'Analisa Pelanggan Aktif/Tidak Aktif', description: 'Analisa pelanggan' },
        { id: 'sales-chart-top-items', name: 'Grafik Penjualan Item Terbaik', description: 'Chart top items' },
        { id: 'sales-chart-daily', name: 'Grafik Penjualan Harian', description: 'Chart harian' },
        { id: 'sales-chart-monthly', name: 'Grafik Penjualan Bulanan', description: 'Chart bulanan' },
        { id: 'sales-chart-customer-expiry', name: 'Grafik Kadaluarsa Pelanggan', description: 'Chart kadaluarsa' },
        { id: 'sales-tax-invoice-csv', name: 'CSV/XML Faktur Pajak Keluaran', description: 'Export faktur pajak' },
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
        { id: 'purchase-tax-invoice-csv', name: 'CSV/XML Faktur Pajak Masukan', description: 'Export faktur pajak' },
      ],
    },
    {
      id: 'packaging-delivery',
      name: 'Pengiriman Packaging',
      icon: '📦',
      reports: [
        { id: 'packaging-delivery-note', name: 'Nota Pengiriman Packaging', description: 'Laporan delivery' },
        { id: 'packaging-delivery-per-item', name: 'Nota Pengiriman Per Item', description: 'Delivery per item' },
        { id: 'packaging-surat-jalan', name: 'Surat Jalan Packaging', description: 'Laporan surat jalan' },
        { id: 'packaging-delivery-by-customer', name: 'Pengiriman Per Customer', description: 'Delivery per customer' },
        { id: 'packaging-delivery-trend', name: 'Trend Pengiriman Harian/Bulanan', description: 'Trend delivery' },
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
        { id: 'inventory-card-per-item', name: 'Kartu Stok Per Item', description: 'Kartu stok per item' },
        { id: 'inventory-mutation', name: 'Mutasi Stok', description: 'Laporan mutasi stok' },
        { id: 'inventory-adjustment', name: 'Penyesuaian Stok (Stock Opname)', description: 'Stock opname' },
        { id: 'inventory-value-cost', name: 'Stok Berdasarkan Harga Beli', description: 'Nilai stok harga beli' },
        { id: 'inventory-value-sell', name: 'Stok Berdasarkan Harga Jual', description: 'Nilai stok harga jual' },
        { id: 'inventory-value-total', name: 'Nilai Persediaan', description: 'Total nilai persediaan' },
        { id: 'inventory-expiry', name: 'Barang Kadaluarsa', description: 'Laporan barang kadaluarsa' },
        { id: 'inventory-slow-moving', name: 'Barang Slow Moving', description: 'Barang slow moving' },
        { id: 'inventory-fast-moving', name: 'Barang Fast Moving', description: 'Barang fast moving' },
        { id: 'inventory-abc-analysis', name: 'Analisa ABC', description: 'Analisa ABC inventory' },
        { id: 'inventory-chart-per-warehouse', name: 'Grafik Stok Per Gudang', description: 'Chart stok gudang' },
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
        { id: 'accounting-journal-memorial', name: 'Jurnal Memorial', description: 'Jurnal memorial' },
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
        { id: 'tax-pph29', name: 'PPh 29', description: 'Laporan PPh 29' },
        { id: 'tax-pph-final', name: 'PPh Final', description: 'Laporan PPh final' },
        { id: 'tax-efaktur', name: 'e-Faktur', description: 'Laporan e-faktur' },
        { id: 'tax-csv', name: 'CSV Faktur Pajak', description: 'Export CSV faktur pajak' },
      ],
    },
    {
      id: 'production',
      name: 'Produksi',
      icon: '🏭',
      reports: [
        { id: 'production-bom', name: 'Bill of Material (BOM)', description: 'Laporan BOM' },
        { id: 'production-wo', name: 'SPK', description: 'Laporan work order atau SPK' },
        { id: 'production-report', name: 'Produksi', description: 'Laporan produksi' },
        { id: 'production-cost', name: 'Biaya Produksi', description: 'Biaya produksi' },
        { id: 'production-material-usage', name: 'Material Usage', description: 'Penggunaan material' },
        { id: 'production-capacity', name: 'Kapasitas Produksi', description: 'Kapasitas produksi' },
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
        { id: 'custom-packaging-sales-export', name: 'Packaging Sales Order Export', description: 'Laporan Custom Sales' },
      ],
    },
  ];

  // Filter reports based on search and category
  const filteredCategories = reportCategories
    .map(category => ({
      ...category,
      reports: category.reports.filter(report =>
        (selectedCategory === 'all' || category.id === selectedCategory) &&
        (searchQuery === '' ||
          report.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.description.toLowerCase().includes(searchQuery.toLowerCase()))
      ),
    }))
    .filter(category => category.reports.length > 0);

  const handleViewData = async (reportId: string, reportName: string) => {
    setPreviewTitle(reportName);
    setPreviewReportId(reportId);
    setPreviewData([]);
    
    try {
      let data: any[] = [];

      // MASTER DATA
      if (reportId === 'master-products') {
        data = await reportDataFetcher.getMasterProductsData();
      } else if (reportId === 'master-products-bom') {
        data = await reportDataFetcher.getMasterProductsBOMData();
      } else if (reportId === 'master-materials') {
        data = await reportDataFetcher.getMasterMaterialsData();
      } else if (reportId === 'master-customers') {
        data = await reportDataFetcher.getMasterCustomersData();
      } else if (reportId === 'master-suppliers') {
        data = await reportDataFetcher.getMasterSuppliersData();
      } else if (reportId === 'master-categories') {
        data = await reportDataFetcher.getMasterCategoriesData();
      } else if (reportId === 'master-units') {
        data = await reportDataFetcher.getMasterUnitsData();
      } else if (reportId === 'master-regions') {
        data = await reportDataFetcher.getMasterRegionsData();
      } else if (reportId === 'master-banks') {
        data = await reportDataFetcher.getMasterBanksData();
      } else if (reportId === 'master-employees') {
        data = await reportDataFetcher.getMasterStaffData();
      }
      // SALES DATA
      else if (reportId === 'sales-orders') {
        data = await reportDataFetcher.getSalesOrdersData(startDate, endDate);
      } else if (reportId === 'sales-orders-per-item') {
        data = await reportDataFetcher.getSalesOrdersPerItemData(startDate, endDate);
      } else if (reportId === 'sales-return') {
        data = await reportDataFetcher.getSalesReturnData(startDate, endDate);
      } else if (reportId === 'sales-return-per-item') {
        data = await reportDataFetcher.getSalesReturnPerItemData(startDate, endDate);
      } else if (reportId === 'sales-per-region') {
        data = await reportDataFetcher.getSalesByRegionData(startDate, endDate);
      } else if (reportId === 'sales-customer-analysis') {
        data = await reportDataFetcher.getSalesCustomerAnalysisData(startDate, endDate);
      } else if (reportId === 'sales-chart-top-items') {
        data = await reportDataFetcher.getSalesChartTopItemsData(startDate, endDate);
      } else if (reportId === 'sales-chart-daily') {
        data = await reportDataFetcher.getSalesChartDailyData(startDate, endDate);
      } else if (reportId === 'sales-chart-monthly') {
        data = await reportDataFetcher.getSalesChartMonthlyData(startDate, endDate);
      }
      // INVENTORY DATA
      else if (reportId === 'inventory-stock') {
        data = await reportDataFetcher.getInventoryStockData();
      } else if (reportId === 'inventory-stock-per-warehouse') {
        data = await reportDataFetcher.getInventoryStockPerWarehouseData();
      } else if (reportId === 'inventory-min-stock') {
        data = await reportDataFetcher.getInventoryMinStockData();
      } else if (reportId === 'inventory-max-stock') {
        data = await reportDataFetcher.getInventoryMaxStockData();
      } else if (reportId === 'inventory-value-total') {
        data = await reportDataFetcher.getInventoryValueTotalData();
      } else if (reportId === 'inventory-mutation') {
        data = await reportDataFetcher.getInventoryMutationData(startDate, endDate);
      }
      // PURCHASE DATA
      else if (reportId === 'purchase-orders') {
        data = await reportDataFetcher.getPurchaseOrdersData(startDate, endDate);
      } else if (reportId === 'purchase-orders-per-item') {
        data = await reportDataFetcher.getPurchaseOrdersPerItemData(startDate, endDate);
      } else if (reportId === 'purchase-return') {
        data = await reportDataFetcher.getPurchaseReturnData(startDate, endDate);
      } else if (reportId === 'purchase-return-per-item') {
        data = await reportDataFetcher.getPurchaseReturnPerItemData(startDate, endDate);
      } else if (reportId === 'purchase-per-supplier') {
        data = await reportDataFetcher.getPurchasePerSupplierData(startDate, endDate);
      } else if (reportId === 'purchase-per-item-supplier') {
        data = await reportDataFetcher.getPurchasePerItemSupplierData(startDate, endDate);
      } else if (reportId === 'purchase-chart-top-items') {
        data = await reportDataFetcher.getPurchaseChartTopItemsData(startDate, endDate);
      } else if (reportId === 'purchase-chart-daily') {
        data = await reportDataFetcher.getPurchaseChartDailyData(startDate, endDate);
      } else if (reportId === 'purchase-chart-monthly') {
        data = await reportDataFetcher.getPurchaseChartMonthlyData(startDate, endDate);
      } else if (reportId === 'purchase-tax-invoice-csv') {
        data = await reportDataFetcher.getPurchaseTaxInvoiceCSVData(startDate, endDate);
      }
      // DELIVERY DATA
      else if (reportId === 'packaging-delivery-note') {
        data = await reportDataFetcher.getDeliveryNoteData(startDate, endDate);
      } else if (reportId === 'packaging-delivery-per-item') {
        data = await reportDataFetcher.getDeliveryPerItemData(startDate, endDate);
      } else if (reportId === 'packaging-surat-jalan') {
        data = await reportDataFetcher.getSuratJalanData(startDate, endDate);
      } else if (reportId === 'packaging-delivery-by-customer') {
        data = await reportDataFetcher.getDeliveryByCustomerData(startDate, endDate);
      } else if (reportId === 'packaging-delivery-trend') {
        data = await reportDataFetcher.getDeliveryTrendData(startDate, endDate);
      }
      // PRODUCTION DATA
      else if (reportId === 'production-wo') {
        data = await reportDataFetcher.getProductionSPKData(startDate, endDate);
      } else if (reportId === 'production-report') {
        data = await reportDataFetcher.getProductionQCData(startDate, endDate);
      } else if (reportId === 'production-cost') {
        data = await reportDataFetcher.getProductionCostData(startDate, endDate);
      } else if (reportId === 'production-material-usage') {
        data = await reportDataFetcher.getProductionMaterialUsageData(startDate, endDate);
      } else if (reportId === 'production-capacity') {
        data = await reportDataFetcher.getProductionWasteData(startDate, endDate);
      }
      // AR DATA
      else if (reportId === 'ar-per-customer' || reportId === 'ar-per-invoice' || reportId === 'ar-aging' || reportId === 'ar-payment' || reportId === 'ar-outstanding' || reportId === 'ar-due' || reportId === 'ar-overdue' || reportId === 'ar-card' || reportId === 'ar-analysis') {
        data = await reportDataFetcher.getARData(startDate, endDate);
      }
      // AP DATA - Per Supplier
      else if (reportId === 'ap-per-supplier') {
        data = await reportDataFetcher.getAPPerSupplierData(startDate, endDate);
      }
      // AP DATA - Per Invoice
      else if (reportId === 'ap-per-invoice') {
        data = await reportDataFetcher.getAPPerInvoiceData(startDate, endDate);
      }
      // AP DATA - Aging
      else if (reportId === 'ap-aging') {
        data = await reportDataFetcher.getAPAgingData(startDate, endDate);
      }
      // AP DATA - Payment
      else if (reportId === 'ap-payment') {
        data = await reportDataFetcher.getAPData(startDate, endDate);
      }
      // AP DATA - Outstanding
      else if (reportId === 'ap-outstanding') {
        data = await reportDataFetcher.getAPOutstandingData(startDate, endDate);
      }
      // AP DATA - Due
      else if (reportId === 'ap-due') {
        data = await reportDataFetcher.getAPDueData(startDate, endDate);
      }
      // AP DATA - Overdue
      else if (reportId === 'ap-overdue') {
        data = await reportDataFetcher.getAPOverdueData(startDate, endDate);
      }
      // AP DATA - Card
      else if (reportId === 'ap-card') {
        data = await reportDataFetcher.getAPCardData(startDate, endDate);
      }
      // AP DATA - Analysis
      else if (reportId === 'ap-analysis') {
        data = await reportDataFetcher.getAPAnalysisData(startDate, endDate);
      }
      // TAX DATA - PPN Masukan
      else if (reportId === 'tax-ppn-in') {
        data = await reportDataFetcher.getTaxPPNMasukanData(startDate, endDate);
      }
      // TAX DATA - PPN Keluaran
      else if (reportId === 'tax-ppn-out') {
        data = await reportDataFetcher.getTaxPPNKeluaranData(startDate, endDate);
      }
      // TAX DATA - SPT Masa PPN
      else if (reportId === 'tax-spt-ppn') {
        data = await reportDataFetcher.getTaxSPTMasaPPNData(startDate, endDate);
      }
      // TAX DATA - e-Faktur
      else if (reportId === 'tax-efaktur') {
        data = await reportDataFetcher.getTaxEFakturData(startDate, endDate);
      }
      // TAX DATA - CSV Faktur Pajak
      else if (reportId === 'tax-csv') {
        data = await reportDataFetcher.getTaxCSVFakturData(startDate, endDate);
      }
      // PROFIT DATA - Per Item
      else if (reportId === 'profit-per-item') {
        data = await reportDataFetcher.getProfitPerItemData(startDate, endDate);
      }
      // PROFIT DATA - Per Customer
      else if (reportId === 'profit-per-customer') {
        data = await reportDataFetcher.getProfitPerCustomerData(startDate, endDate);
      }
      // PROFIT DATA - Per Supplier
      else if (reportId === 'profit-per-supplier') {
        data = await reportDataFetcher.getProfitPerSupplierData(startDate, endDate);
      }
      // PROFIT DATA - Per Sales
      else if (reportId === 'profit-per-sales') {
        data = await reportDataFetcher.getProfitPerSalesData(startDate, endDate);
      }
      // PROFIT DATA - Per Region
      else if (reportId === 'profit-per-region') {
        data = await reportDataFetcher.getProfitPerRegionData(startDate, endDate);
      }
      // PROFIT DATA - Per Category
      else if (reportId === 'profit-per-category') {
        data = await reportDataFetcher.getProfitPerCategoryData(startDate, endDate);
      }
      // PROFIT DATA - Margin
      else if (reportId === 'profit-margin') {
        data = await reportDataFetcher.getProfitMarginData(startDate, endDate);
      }
      // PROFIT DATA - COGS
      else if (reportId === 'profit-cogs') {
        data = await reportDataFetcher.getProfitCOGSData(startDate, endDate);
      }
      // CUSTOM DATA - Packaging Sales Order Export
      else if (reportId === 'custom-packaging-sales-export') {
        data = await reportDataFetcher.getPackagingSalesOrderExportData(startDate, endDate);
      }

      setPreviewData(data);
    } catch (error) {
      console.error('Error loading preview data:', error);
      toast.error('Gagal memuat preview data');
      setPreviewData([]);
    }
  };

  const handleExportReport = async (reportId: string, reportName: string) => {
    setGenerating(true);
    try {
      // Map reportId to report service function
      switch(reportId) {
        // PACKAGING - Sales Orders (Primary)
        case 'sales-orders':
          await reportService.generatePackagingSalesOrdersReport(startDate, endDate);
          break;
        case 'sales-orders-per-item':
          await reportService.generatePackagingSalesOrdersPerItemReport(startDate, endDate);
          break;
        case 'sales-return':
          await reportService.generatePackagingSalesReturnReport(startDate, endDate);
          break;
        case 'sales-per-region':
          await reportService.generatePackagingSalesByRegionReport(startDate, endDate);
          break;
        case 'sales-per-item-region':
          // Same as sales-per-region for now
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
        case 'sales-chart-customer-expiry':
          await reportService.generateSalesChartCustomerExpiryReport(startDate, endDate);
          break;
        case 'sales-tax-invoice-csv':
          await reportService.generateSalesTaxInvoiceCSVReport(startDate, endDate);
          break;
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
        case 'purchase-tax-invoice-csv':
          await purchaseReportService.generatePurchaseTaxInvoiceCSVReport(startDate, endDate);
          break;
        case 'sales':
          await reportService.generateGTInvoicesReport(startDate, endDate);
          break;

        // PRODUCTION
        case 'production-bom':
          await reportService.generateProductionBOMReport();
          break;
        case 'production-wo':
          await reportService.generateProductionSPKReport(startDate, endDate);
          break;
        case 'production-report':
          await reportService.generateProductionReport(startDate, endDate);
          break;
        case 'production-cost':
          await reportService.generateProductionCostReport(startDate, endDate);
          break;
        case 'production-material-usage':
          await reportService.generateMaterialUsageReport(startDate, endDate);
          break;
        case 'production-capacity':
          await reportService.generateProductionCapacityReport();
          break;

        // PACKAGING DELIVERY
        case 'packaging-delivery-note':
          await reportService.generatePackagingDeliveryNoteReport(startDate, endDate);
          break;
        case 'packaging-delivery-per-item':
          await reportService.generatePackagingDeliveryPerItemReport(startDate, endDate);
          break;
        case 'packaging-surat-jalan':
          await reportService.generatePackagingSuratJalanReport(startDate, endDate);
          break;
        case 'packaging-delivery-by-customer':
          await reportService.generatePackagingDeliveryByCustomerReport(startDate, endDate);
          break;
        case 'packaging-delivery-trend':
          await reportService.generatePackagingDeliveryTrendReport(startDate, endDate);
          break;

        // MASTER DATA
        case 'master-products':
          await reportService.generateMasterProductsReport();
          break;
        case 'master-products-bom':
          await reportService.generateMasterProductsBOMReport();
          break;
        case 'master-materials':
          await reportService.generateMasterMaterialsReport();
          break;
        case 'master-customers':
          await reportService.generateMasterCustomersReport();
          break;
        case 'master-suppliers':
          await reportService.generateMasterSuppliersReport();
          break;
        case 'master-employees':
          await reportService.generateMasterStaffReport();
          break;
        case 'master-categories':
          await reportService.generateMasterCategoriesReport();
          break;
        case 'master-units':
          await reportService.generateMasterUnitsReport();
          break;
        case 'master-regions':
          await reportService.generateMasterRegionsReport();
          break;
        case 'master-banks':
          await reportService.generateMasterBanksReport();
          break;

        // INVENTORY
        case 'inventory-stock':
          await reportService.generateInventoryStockReport();
          break;
        case 'inventory-stock-per-warehouse':
          await reportService.generateInventoryStockPerWarehouseReport();
          break;
        case 'inventory-min-stock':
          await reportService.generateInventoryMinStockReport();
          break;
        case 'inventory-max-stock':
          await reportService.generateInventoryMaxStockReport();
          break;
        case 'inventory-value-total':
          await reportService.generateInventoryValueTotalReport();
          break;
        case 'inventory-mutation':
          await reportService.generateInventoryMutationReport(startDate, endDate);
          break;
        case 'inventory-abc-analysis':
          await reportService.generateInventoryABCAnalysisReport();
          break;
        case 'inventory-fast-moving':
          await reportService.generateInventoryFastMovingReport();
          break;
        case 'inventory-slow-moving':
          await reportService.generateInventorySlowMovingReport();
          break;
        case 'inventory-value-sell':
          await reportService.generateInventoryBySellingPriceReport();
          break;
        case 'inventory-card':
          await reportService.generateInventoryStockCardReport();
          break;
        case 'inventory-card-per-item':
          await reportService.generateInventoryStockCardPerItemReport();
          break;
        case 'inventory-chart-per-warehouse':
          await reportService.generateInventoryStockPerWarehouseReport();
          break;

        // ACCOUNTING
        case 'accounting-balance-sheet':
          await reportService.generateBalanceSheetReport();
          break;
        case 'accounting-income-statement':
          await reportService.generateIncomeStatementReport(startDate, endDate);
          break;
        case 'accounting-equity-changes':
          await reportService.generateEquityChangesReport(startDate, endDate);
          break;
        case 'accounting-cash-flow':
          await reportService.generateCashFlowReport(startDate, endDate);
          break;
        case 'accounting-general-ledger':
          await reportService.generateGeneralLedgerReport(startDate, endDate);
          break;
        case 'accounting-journal-general':
          await reportService.generateGeneralJournalReport(startDate, endDate);
          break;
        case 'accounting-journal-sales':
          await reportService.generateSalesJournalReport(startDate, endDate);
          break;
        case 'accounting-journal-purchase':
          await reportService.generatePurchaseJournalReport(startDate, endDate);
          break;
        case 'accounting-journal-cash-in':
          await reportService.generateCashInJournalReport(startDate, endDate);
          break;
        case 'accounting-journal-cash-out':
          await reportService.generateCashOutJournalReport(startDate, endDate);
          break;
        case 'accounting-journal-memorial':
          await reportService.generateMemorialJournalReport(startDate, endDate);
          break;
        case 'accounting-trial-balance':
          await reportService.generateTrialBalanceReport(startDate, endDate);
          break;
        case 'accounting-bank-statement':
          await reportService.generateBankStatementReport(startDate, endDate);
          break;
        case 'accounting-coa':
          await reportService.generateChartOfAccountReport();
          break;

        // AR/AP
        case 'ar-per-customer':
          await reportService.generateARPerCustomerReport(startDate, endDate);
          break;
        case 'ar-per-invoice':
          await reportService.generateARPerInvoiceReport(startDate, endDate);
          break;
        case 'ar-aging':
          await reportService.generateARAgingReport(startDate, endDate);
          break;
        case 'ar-payment':
          await reportService.generateARPaymentReport(startDate, endDate);
          break;
        case 'ar-outstanding':
          await reportService.generateAROutstandingReport(startDate, endDate);
          break;
        case 'ar-due':
          await reportService.generateARDueReport(startDate, endDate);
          break;
        case 'ar-overdue':
          await reportService.generateAROverdueReport(startDate, endDate);
          break;
        case 'ar-card':
          await reportService.generateARCardReport(startDate, endDate);
          break;
        case 'ar-analysis':
          await reportService.generateARAnalysisReport(startDate, endDate);
          break;
        case 'ap-per-supplier':
          await reportService.generateAPPerSupplierReport(startDate, endDate);
          break;
        case 'ap-per-invoice':
          await reportService.generateAPPerInvoiceReport(startDate, endDate);
          break;
        case 'ap-aging':
          await reportService.generateAPAgingReport(startDate, endDate);
          break;
        case 'ap-payment':
          await reportService.generateAPPaymentReport(startDate, endDate);
          break;
        case 'ap-outstanding':
          await reportService.generateAPOutstandingReport(startDate, endDate);
          break;
        case 'ap-due':
          await reportService.generateAPDueReport(startDate, endDate);
          break;
        case 'ap-overdue':
          await reportService.generateAPOverdueReport(startDate, endDate);
          break;
        case 'ap-card':
          await reportService.generateAPCardReport(startDate, endDate);
          break;
        case 'ap-analysis':
          await reportService.generateAPAnalysisReport(startDate, endDate);
          break;

        // TAX REPORTS
        case 'tax-ppn-in':
          await reportService.generateTaxPPNMasukanReport(startDate, endDate);
          break;
        case 'tax-ppn-out':
          await reportService.generateTaxPPNKeluaranReport(startDate, endDate);
          break;
        case 'tax-spt-ppn':
          await reportService.generateTaxSPTMasaPPNReport(startDate, endDate);
          break;
        case 'tax-pph21':
          await reportService.generateTaxPPh21Report(startDate, endDate);
          break;
        case 'tax-pph22':
          await reportService.generateTaxPPh22Report(startDate, endDate);
          break;
        case 'tax-pph23':
          await reportService.generateTaxPPh23Report(startDate, endDate);
          break;
        case 'tax-pph25':
          await reportService.generateTaxPPh25Report(startDate, endDate);
          break;
        case 'tax-pph29':
          await reportService.generateTaxPPh29Report(startDate, endDate);
          break;
        case 'tax-pph-final':
          await reportService.generateTaxPPhFinalReport(startDate, endDate);
          break;
        case 'tax-efaktur':
          await reportService.generateTaxEFakturReport(startDate, endDate);
          break;
        case 'tax-csv':
          await reportService.generateTaxCSVFakturReport(startDate, endDate);
          break;

        // PROFIT REPORTS
        case 'profit-per-item':
          await reportService.generateProfitPerItemReport(startDate, endDate);
          break;
        case 'profit-per-customer':
          await reportService.generateProfitPerCustomerReport(startDate, endDate);
          break;
        case 'profit-per-supplier':
          await reportService.generateProfitPerSupplierReport(startDate, endDate);
          break;
        case 'profit-per-sales':
          await reportService.generateProfitPerSalesReport(startDate, endDate);
          break;
        case 'profit-per-region':
          await reportService.generateProfitPerRegionReport(startDate, endDate);
          break;
        case 'profit-per-category':
          await reportService.generateProfitPerCategoryReport(startDate, endDate);
          break;
        case 'profit-margin':
          await reportService.generateProfitMarginReport(startDate, endDate);
          break;
        case 'profit-cogs':
          await reportService.generateProfitCOGSReport(startDate, endDate);
          break;

        // CUSTOM REPORTS
        case 'custom-packaging-sales-export':
          await reportService.generatePackagingSalesOrderExportReport(startDate, endDate);
          break;

        default:
          toast.error(`Laporan "${reportName}" belum diimplementasikan.`);
          return;
      }

      toast.success(`Laporan "${reportName}" berhasil di-export!`);
    } catch (error) {
      console.error('Error exporting report:', error);
      toast.error('Gagal export laporan. Silakan coba lagi.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="full-reports-page">
      {/* Filters */}
      <Card title="Filter Laporan">
        <div className="reports-filters">
          <div className="filter-row">
            <div className="filter-group">
              <label>🔍 Cari Laporan</label>
              <Input
                type="text"
                placeholder="Cari nama laporan..."
                value={searchQuery}
                onChange={setSearchQuery}
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
              <Input
                type="date"
                value={startDate}
                onChange={setStartDate}
              />
            </div>

            <div className="filter-group">
              <label>📅 Tanggal Akhir</label>
              <Input
                type="date"
                value={endDate}
                onChange={setEndDate}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Main Content - Vertical Stacked */}
      <div className="full-reports-container">
        {/* Category Tabs - Horizontal */}
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
                        onClick={() => handleViewData(report.id, report.name)}
                        disabled={generating}
                        title={`Preview data untuk ${report.name}`}
                      >
                        📝
                      </button>
                      <button
                        className="excel-export-btn"
                        onClick={() => handleExportReport(report.id, report.name)}
                        disabled={generating}
                        title={`Export ${report.name} ke Excel`}
                      >
                        <svg viewBox="0 0 24 24" width="20" height="20">
                          <rect x="2" y="3" width="14" height="14" fill="none" stroke="white" strokeWidth="1.5" rx="1"/>
                          <line x1="6" y1="3" x2="6" y2="17" stroke="white" strokeWidth="1"/>
                          <line x1="10" y1="3" x2="10" y2="17" stroke="white" strokeWidth="1"/>
                          <line x1="2" y1="7" x2="16" y2="7" stroke="white" strokeWidth="1"/>
                          <line x1="2" y1="11" x2="16" y2="11" stroke="white" strokeWidth="1"/>
                          <line x1="2" y1="15" x2="16" y2="15" stroke="white" strokeWidth="1"/>
                          <rect x="17" y="12" width="2" height="4" fill="white"/>
                          <rect x="20" y="9" width="2" height="7" fill="white"/>
                          <rect x="23" y="6" width="2" height="10" fill="white"/>
                        </svg>
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
                <p>Klik tombol 👁️ untuk melihat preview data</p>
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
              {filteredCategories.reduce((sum, cat) => sum + cat.reports.length, 0)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
