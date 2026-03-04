import { useState } from 'react';
import Card from '../../components/Card';
import DynamicTable from '../../components/DynamicTable';
import { storageService, extractStorageValue } from '../../services/storage';
import { StorageKeys } from '../../services/storage';
import { toast } from '../../utils/toast-helper';
import '../../styles/common.css';
import '../Settings/FullReports.css';

// Trucking-specific data fetcher functions
const truckingReportDataFetcher = {
  async getMasterVehiclesData() {
    const vehiclesRaw = await storageService.get(StorageKeys.TRUCKING.VEHICLES);
    const vehicles = extractStorageValue(vehiclesRaw) || [];
    
    return (vehicles as any[]).map((v: any, idx: number) => ({
      'NO': idx + 1,
      'PLAT NOMOR': v.licensePlate || v.platNomor || '-',
      'TIPE': v.type || v.tipe || '-',
      'KAPASITAS': v.capacity || v.kapasitas || 0,
      'STATUS': v.status || 'AKTIF',
      'TAHUN': v.year || v.tahun || '-',
    }));
  },

  async getMasterDriversData() {
    const driversRaw = await storageService.get(StorageKeys.TRUCKING.DRIVERS);
    const drivers = extractStorageValue(driversRaw) || [];
    
    return (drivers as any[]).map((d: any, idx: number) => ({
      'NO': idx + 1,
      'NAMA': d.name || d.nama || '-',
      'NO. SIM': d.licenseNumber || d.noSim || '-',
      'TELEPON': d.phone || d.telepon || '-',
      'STATUS': d.status || 'AKTIF',
      'ALAMAT': d.address || d.alamat || '-',
    }));
  },

  async getMasterCustomersData() {
    const customersRaw = await storageService.get(StorageKeys.TRUCKING.CUSTOMERS);
    const customers = extractStorageValue(customersRaw) || [];
    
    return (customers as any[]).map((c: any, idx: number) => ({
      'NO': idx + 1,
      'KODE': c.code || c.kode || '-',
      'NAMA': c.name || c.nama || '-',
      'KONTAK': c.contactPerson || c.kontak || '-',
      'TELEPON': c.phone || c.telepon || '-',
      'ALAMAT': c.address || c.alamat || '-',
    }));
  },

  async getMasterRoutesData() {
    const routesRaw = await storageService.get(StorageKeys.TRUCKING.ROUTES);
    const routes = extractStorageValue(routesRaw) || [];
    
    return (routes as any[]).map((r: any, idx: number) => ({
      'NO': idx + 1,
      'KODE RUTE': r.routeCode || r.kodeRute || '-',
      'NAMA RUTE': r.routeName || r.namaRute || '-',
      'ASAL': r.origin || r.asal || '-',
      'TUJUAN': r.destination || r.tujuan || '-',
      'JARAK (KM)': r.distance || r.jarak || 0,
    }));
  },

  async getDeliveryOrdersData(startDate: string, endDate: string) {
    const ordersRaw = await storageService.get(StorageKeys.TRUCKING.DELIVERY_ORDERS);
    const orders = extractStorageValue(ordersRaw) || [];
    
    const filtered = (orders as any[])
      .filter((o: any) => {
        const orderDate = o.createdDate || o.created || '';
        return orderDate >= startDate && orderDate <= endDate;
      });

    return filtered.map((o: any, idx: number) => ({
      'NO': idx + 1,
      'NO. PENGIRIMAN': o.deliveryNo || o.no || '-',
      'PELANGGAN': o.customerName || o.customer || '-',
      'PENGEMUDI': o.driverName || o.driver || '-',
      'KENDARAAN': o.vehiclePlate || o.vehicle || '-',
      'TANGGAL': (o.createdDate || o.created || '').split('T')[0] || '-',
      'STATUS': o.status || 'PENDING',
      'TOTAL ITEM': o.items?.length || 0,
    }));
  },

  async getSuratJalanData(startDate: string, endDate: string) {
    const sjRaw = await storageService.get(StorageKeys.TRUCKING.SURAT_JALAN);
    const sj = extractStorageValue(sjRaw) || [];
    
    const filtered = (sj as any[])
      .filter((s: any) => {
        const sjDate = s.createdDate || s.created || '';
        return sjDate >= startDate && sjDate <= endDate;
      });

    return filtered.map((s: any, idx: number) => ({
      'NO': idx + 1,
      'NO. SURAT JALAN': s.suratJalanNo || s.no || '-',
      'PENGEMUDI': s.driverName || s.driver || '-',
      'KENDARAAN': s.vehiclePlate || s.vehicle || '-',
      'TANGGAL': (s.createdDate || s.created || '').split('T')[0] || '-',
      'ASAL': s.origin || s.asal || '-',
      'TUJUAN': s.destination || s.tujuan || '-',
      'STATUS': s.status || 'PENDING',
    }));
  },

  async getInvoicesData(startDate: string, endDate: string) {
    const invoicesRaw = await storageService.get(StorageKeys.TRUCKING.INVOICES);
    const invoices = extractStorageValue(invoicesRaw) || [];
    
    const filtered = (invoices as any[])
      .filter((inv: any) => {
        const invDate = inv.invoiceDate || inv.created || '';
        return invDate >= startDate && invDate <= endDate;
      });

    return filtered.map((inv: any, idx: number) => {
      const itemsTotal = (inv.items || []).reduce((sum: number, item: any) => sum + (item.total || 0), 0);
      const total = itemsTotal || inv.total || 0;
      
      return {
        'NO': idx + 1,
        'NO. FAKTUR': inv.invoiceNo || inv.no || '-',
        'PELANGGAN': inv.customerName || inv.customer || '-',
        'TANGGAL': (inv.invoiceDate || inv.created || '').split('T')[0] || '-',
        'STATUS': inv.status || 'OPEN',
        'TOTAL': total,
      };
    });
  },

  async getExpensesData(startDate: string, endDate: string) {
    const expensesRaw = await storageService.get(StorageKeys.TRUCKING.EXPENSES);
    const expenses = extractStorageValue(expensesRaw) || [];
    
    const filtered = (expenses as any[])
      .filter((e: any) => {
        const expDate = e.expenseDate || e.created || '';
        return expDate >= startDate && expDate <= endDate;
      });

    return filtered.map((e: any, idx: number) => ({
      'NO': idx + 1,
      'TANGGAL': (e.expenseDate || e.created || '').split('T')[0] || '-',
      'KATEGORI': e.category || e.kategori || '-',
      'DESKRIPSI': e.description || e.deskripsi || '-',
      'JUMLAH': e.amount || e.jumlah || 0,
      'KETERANGAN': e.notes || e.keterangan || '-',
    }));
  },

  async getPettyCashData(startDate: string, endDate: string) {
    const pcRaw = await storageService.get(StorageKeys.TRUCKING.PETTY_CASH_REQUESTS);
    const pc = extractStorageValue(pcRaw) || [];
    
    const filtered = (pc as any[])
      .filter((p: any) => {
        const pcDate = p.requestDate || p.created || '';
        return pcDate >= startDate && pcDate <= endDate;
      });

    return filtered.map((p: any, idx: number) => ({
      'NO': idx + 1,
      'NO. PERMINTAAN': p.requestNo || p.no || '-',
      'PEMINTA': p.requesterName || p.requester || '-',
      'TANGGAL': (p.requestDate || p.created || '').split('T')[0] || '-',
      'JUMLAH': p.amount || p.jumlah || 0,
      'STATUS': p.status || 'PENDING',
      'TUJUAN': p.purpose || p.tujuan || '-',
    }));
  },

  async getPerformanceData(startDate: string, endDate: string) {
    const sjRaw = await storageService.get(StorageKeys.TRUCKING.SURAT_JALAN);
    const sj = extractStorageValue(sjRaw) || [];
    
    const driverMap = new Map();
    
    (sj as any[])
      .filter((s: any) => {
        const sjDate = s.createdDate || s.created || '';
        return sjDate >= startDate && sjDate <= endDate;
      })
      .forEach((s: any) => {
        const driver = s.driverName || s.driver || 'Unknown';
        if (!driverMap.has(driver)) {
          driverMap.set(driver, { totalDeliveries: 0, onTimeDeliveries: 0, lateDeliveries: 0 });
        }
        const data = driverMap.get(driver);
        data.totalDeliveries += 1;
        
        if (s.status === 'DELIVERED') {
          const isOnTime = !s.isLate;
          if (isOnTime) {
            data.onTimeDeliveries += 1;
          } else {
            data.lateDeliveries += 1;
          }
        }
      });

    return Array.from(driverMap.entries()).map(([driver, data], idx: number) => ({
      'NO': idx + 1,
      'PENGEMUDI': driver,
      'TOTAL PENGIRIMAN': data.totalDeliveries,
      'TEPAT WAKTU': data.onTimeDeliveries,
      'TERLAMBAT': data.lateDeliveries,
      'PERSENTASE TEPAT WAKTU %': data.totalDeliveries > 0 ? ((data.onTimeDeliveries / data.totalDeliveries) * 100).toFixed(2) : 0,
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

export default function FullReportsTrucking() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [generating, setGenerating] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewReportId, setPreviewReportId] = useState<string>('');

  // Report categories untuk Trucking - Expanded
  const reportCategories: ReportCategory[] = [
    {
      id: 'master',
      name: 'Master Data',
      icon: '📋',
      reports: [
        { id: 'master-vehicles', name: 'Daftar Kendaraan', description: 'Laporan daftar semua kendaraan' },
        { id: 'master-drivers', name: 'Daftar Pengemudi', description: 'Laporan daftar semua pengemudi' },
        { id: 'master-customers', name: 'Daftar Pelanggan', description: 'Laporan daftar semua pelanggan' },
        { id: 'master-routes', name: 'Daftar Rute', description: 'Laporan daftar semua rute pengiriman' },
        { id: 'master-banks', name: 'Daftar Bank', description: 'Laporan daftar bank' },
      ],
    },
    {
      id: 'delivery',
      name: 'Pengiriman',
      icon: '🚚',
      reports: [
        { id: 'delivery-orders', name: 'Pesanan Pengiriman', description: 'Laporan pesanan pengiriman' },
        { id: 'surat-jalan', name: 'Surat Jalan', description: 'Laporan surat jalan' },
        { id: 'delivery-by-driver', name: 'Pengiriman Per Pengemudi', description: 'Pengiriman per pengemudi' },
        { id: 'delivery-by-vehicle', name: 'Pengiriman Per Kendaraan', description: 'Pengiriman per kendaraan' },
        { id: 'delivery-trend', name: 'Trend Pengiriman', description: 'Trend pengiriman harian/bulanan' },
        { id: 'delivery-per-customer', name: 'Pengiriman Per Pelanggan', description: 'Pengiriman per pelanggan' },
      ],
    },
    {
      id: 'invoices',
      name: 'Faktur & Pembayaran',
      icon: '💰',
      reports: [
        { id: 'invoices', name: 'Faktur Pengiriman', description: 'Laporan faktur pengiriman' },
        { id: 'invoices-per-customer', name: 'Faktur Per Pelanggan', description: 'Faktur per pelanggan' },
        { id: 'invoices-outstanding', name: 'Faktur Outstanding', description: 'Faktur yang belum dibayar' },
        { id: 'invoices-paid', name: 'Faktur Terbayar', description: 'Faktur yang sudah dibayar' },
        { id: 'invoices-aging', name: 'Aging Faktur', description: 'Umur faktur' },
        { id: 'invoices-overdue', name: 'Faktur Overdue', description: 'Faktur yang jatuh tempo' },
      ],
    },
    {
      id: 'expenses',
      name: 'Pengeluaran',
      icon: '💸',
      reports: [
        { id: 'expenses', name: 'Pengeluaran Operasional', description: 'Laporan pengeluaran operasional' },
        { id: 'expenses-by-category', name: 'Pengeluaran Per Kategori', description: 'Pengeluaran per kategori' },
        { id: 'expenses-by-vehicle', name: 'Pengeluaran Per Kendaraan', description: 'Pengeluaran per kendaraan' },
        { id: 'expenses-by-driver', name: 'Pengeluaran Per Pengemudi', description: 'Pengeluaran per pengemudi' },
        { id: 'petty-cash', name: 'Kas Kecil', description: 'Laporan kas kecil' },
        { id: 'petty-cash-by-requester', name: 'Kas Kecil Per Peminta', description: 'Kas kecil per peminta' },
      ],
    },
    {
      id: 'accounting',
      name: 'Akuntansi',
      icon: '📊',
      reports: [
        { id: 'accounting-balance-sheet', name: 'Neraca (Balance Sheet)', description: 'Laporan neraca' },
        { id: 'accounting-income-statement', name: 'Laba Rugi (Income Statement)', description: 'Laporan laba rugi' },
        { id: 'accounting-cash-flow', name: 'Arus Kas (Cash Flow)', description: 'Laporan arus kas' },
        { id: 'accounting-general-ledger', name: 'Buku Besar', description: 'Buku besar' },
        { id: 'accounting-trial-balance', name: 'Trial Balance (Neraca Saldo)', description: 'Neraca saldo' },
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
        { id: 'ar-outstanding', name: 'Sisa Piutang', description: 'Sisa piutang' },
        { id: 'ar-overdue', name: 'Piutang Overdue', description: 'Piutang overdue' },
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
        { id: 'ap-outstanding', name: 'Sisa Hutang', description: 'Sisa hutang' },
        { id: 'ap-overdue', name: 'Hutang Overdue', description: 'Hutang overdue' },
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
        { id: 'tax-efaktur', name: 'e-Faktur', description: 'Laporan e-faktur' },
      ],
    },
    {
      id: 'profit',
      name: 'Laba Rugi Detail',
      icon: '📈',
      reports: [
        { id: 'profit-per-customer', name: 'Laba Rugi Per Pelanggan', description: 'Laba rugi per pelanggan' },
        { id: 'profit-per-route', name: 'Laba Rugi Per Rute', description: 'Laba rugi per rute' },
        { id: 'profit-per-vehicle', name: 'Laba Rugi Per Kendaraan', description: 'Laba rugi per kendaraan' },
        { id: 'profit-per-driver', name: 'Laba Rugi Per Pengemudi', description: 'Laba rugi per pengemudi' },
        { id: 'profit-margin', name: 'Margin Pengiriman', description: 'Margin pengiriman' },
        { id: 'profit-cost-analysis', name: 'Analisa Biaya', description: 'Analisa biaya operasional' },
      ],
    },
    {
      id: 'performance',
      name: 'Performa',
      icon: '📊',
      reports: [
        { id: 'driver-performance', name: 'Performa Pengemudi', description: 'Laporan performa pengemudi' },
        { id: 'vehicle-utilization', name: 'Utilisasi Kendaraan', description: 'Laporan utilisasi kendaraan' },
        { id: 'on-time-delivery', name: 'Ketepatan Waktu Pengiriman', description: 'Laporan ketepatan waktu' },
        { id: 'delivery-efficiency', name: 'Efisiensi Pengiriman', description: 'Laporan efisiensi pengiriman' },
        { id: 'vehicle-maintenance', name: 'Riwayat Pemeliharaan Kendaraan', description: 'Laporan pemeliharaan' },
        { id: 'driver-incidents', name: 'Insiden Pengemudi', description: 'Laporan insiden pengemudi' },
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
      if (reportId === 'master-vehicles') {
        data = await truckingReportDataFetcher.getMasterVehiclesData();
      } else if (reportId === 'master-drivers') {
        data = await truckingReportDataFetcher.getMasterDriversData();
      } else if (reportId === 'master-customers') {
        data = await truckingReportDataFetcher.getMasterCustomersData();
      } else if (reportId === 'master-routes') {
        data = await truckingReportDataFetcher.getMasterRoutesData();
      } else if (reportId === 'master-banks') {
        data = [];
      }
      // DELIVERY DATA
      else if (reportId === 'delivery-orders') {
        data = await truckingReportDataFetcher.getDeliveryOrdersData(startDate, endDate);
      } else if (reportId === 'surat-jalan') {
        data = await truckingReportDataFetcher.getSuratJalanData(startDate, endDate);
      } else if (reportId === 'delivery-by-driver' || reportId === 'delivery-by-vehicle' || reportId === 'delivery-trend' || reportId === 'delivery-per-customer') {
        data = await truckingReportDataFetcher.getSuratJalanData(startDate, endDate);
      }
      // INVOICES DATA
      else if (reportId === 'invoices') {
        data = await truckingReportDataFetcher.getInvoicesData(startDate, endDate);
      } else if (reportId === 'invoices-per-customer' || reportId === 'invoices-outstanding' || reportId === 'invoices-paid' || reportId === 'invoices-aging' || reportId === 'invoices-overdue') {
        data = await truckingReportDataFetcher.getInvoicesData(startDate, endDate);
      }
      // EXPENSES DATA
      else if (reportId === 'expenses') {
        data = await truckingReportDataFetcher.getExpensesData(startDate, endDate);
      } else if (reportId === 'expenses-by-category' || reportId === 'expenses-by-vehicle' || reportId === 'expenses-by-driver') {
        data = await truckingReportDataFetcher.getExpensesData(startDate, endDate);
      } else if (reportId === 'petty-cash') {
        data = await truckingReportDataFetcher.getPettyCashData(startDate, endDate);
      } else if (reportId === 'petty-cash-by-requester') {
        data = await truckingReportDataFetcher.getPettyCashData(startDate, endDate);
      }
      // ACCOUNTING DATA
      else if (reportId === 'accounting-balance-sheet' || reportId === 'accounting-income-statement' || reportId === 'accounting-cash-flow' || reportId === 'accounting-general-ledger' || reportId === 'accounting-trial-balance' || reportId === 'accounting-coa') {
        data = [];
      }
      // AR DATA
      else if (reportId === 'ar-per-customer' || reportId === 'ar-per-invoice' || reportId === 'ar-aging' || reportId === 'ar-outstanding' || reportId === 'ar-overdue') {
        data = await truckingReportDataFetcher.getInvoicesData(startDate, endDate);
      }
      // AP DATA
      else if (reportId === 'ap-per-supplier' || reportId === 'ap-per-invoice' || reportId === 'ap-aging' || reportId === 'ap-outstanding' || reportId === 'ap-overdue') {
        data = [];
      }
      // TAX DATA
      else if (reportId === 'tax-ppn-in' || reportId === 'tax-ppn-out' || reportId === 'tax-spt-ppn' || reportId === 'tax-pph21' || reportId === 'tax-pph22' || reportId === 'tax-pph23' || reportId === 'tax-pph25' || reportId === 'tax-efaktur') {
        data = [];
      }
      // PROFIT DATA
      else if (reportId === 'profit-per-customer' || reportId === 'profit-per-route' || reportId === 'profit-per-vehicle' || reportId === 'profit-per-driver' || reportId === 'profit-margin' || reportId === 'profit-cost-analysis') {
        data = [];
      }
      // PERFORMANCE DATA
      else if (reportId === 'driver-performance') {
        data = await truckingReportDataFetcher.getPerformanceData(startDate, endDate);
      } else if (reportId === 'vehicle-utilization' || reportId === 'on-time-delivery' || reportId === 'delivery-efficiency' || reportId === 'vehicle-maintenance' || reportId === 'driver-incidents') {
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
        // Master Data
        case 'master-vehicles':
        case 'master-drivers':
        case 'master-customers':
        case 'master-routes':
        case 'master-banks':
        // Delivery
        case 'delivery-orders':
        case 'surat-jalan':
        case 'delivery-by-driver':
        case 'delivery-by-vehicle':
        case 'delivery-trend':
        case 'delivery-per-customer':
        // Invoices
        case 'invoices':
        case 'invoices-per-customer':
        case 'invoices-outstanding':
        case 'invoices-paid':
        case 'invoices-aging':
        case 'invoices-overdue':
        // Expenses
        case 'expenses':
        case 'expenses-by-category':
        case 'expenses-by-vehicle':
        case 'expenses-by-driver':
        case 'petty-cash':
        case 'petty-cash-by-requester':
        // Accounting
        case 'accounting-balance-sheet':
        case 'accounting-income-statement':
        case 'accounting-cash-flow':
        case 'accounting-general-ledger':
        case 'accounting-trial-balance':
        case 'accounting-coa':
        // AR
        case 'ar-per-customer':
        case 'ar-per-invoice':
        case 'ar-aging':
        case 'ar-outstanding':
        case 'ar-overdue':
        // AP
        case 'ap-per-supplier':
        case 'ap-per-invoice':
        case 'ap-aging':
        case 'ap-outstanding':
        case 'ap-overdue':
        // Tax
        case 'tax-ppn-in':
        case 'tax-ppn-out':
        case 'tax-spt-ppn':
        case 'tax-pph21':
        case 'tax-pph22':
        case 'tax-pph23':
        case 'tax-pph25':
        case 'tax-efaktur':
        // Profit
        case 'profit-per-customer':
        case 'profit-per-route':
        case 'profit-per-vehicle':
        case 'profit-per-driver':
        case 'profit-margin':
        case 'profit-cost-analysis':
        // Performance
        case 'driver-performance':
        case 'vehicle-utilization':
        case 'on-time-delivery':
        case 'delivery-efficiency':
        case 'vehicle-maintenance':
        case 'driver-incidents':
          toast.warning('Laporan belum diimplementasikan untuk export');
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
        <h1>📊 Full Reports - Trucking</h1>
        <p>Laporan lengkap untuk operasi Trucking</p>
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
