/**
 * Report Template Engine - IPOS Style
 * Reusable templates untuk semua jenis report
 * Setiap template handle formatting, headers, totals, dan styling
 */

export interface ReportTemplate {
  title: string;
  subtitle?: string;
  headers: string[];
  data: any[];
  totals?: Record<string, number | string>;
  formatting?: {
    headerBgColor?: string;
    headerTextColor?: string;
    alternateRowColor?: boolean;
    freezePane?: boolean;
    columnWidths?: number[];
  };
}

export interface ReportData {
  startDate?: string;
  endDate?: string;
  items: any[];
  summary?: Record<string, any>;
}

/**
 * Report Template Engine
 * Menyediakan template untuk berbagai jenis laporan
 */
export const reportTemplateEngine = {
  /**
   * PACKAGING - Sales Return Report
   */
  packagingSalesReturnReport: (data: any[], startDate?: string, endDate?: string): ReportTemplate => {
    // Normalize data
    const normalizedData = data.map(ret => ({
      returnNo: (ret.returnNo || ret.no || '').toString().trim() || '-',
      soNo: (ret.soNo || ret.referenceNo || '').toString().trim() || '-',
      customer: (ret.customer || ret.customerName || '').toString().trim() || '-',
      customerKode: (ret.customerKode || ret.customerCode || '').toString().trim() || '-',
      created: (ret.created || ret.date || '').toString().split('T')[0] || '-',
      reason: (ret.reason || ret.returnReason || '').toString().trim() || '-',
      itemCount: (ret.items || []).length,
      subtotal: ret.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0,
      discount: ret.discount || 0,
      tax: ret.tax || 0,
      grandTotal: ret.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0,
      status: (ret.status || 'OPEN').toString().trim(),
      notes: (ret.notes || ret.remarks || '').toString().trim() || '-',
    }));

    // Calculate totals
    const totalSubtotal = normalizedData.reduce((sum, item) => sum + item.subtotal, 0);
    const totalDiscount = normalizedData.reduce((sum, item) => sum + item.discount, 0);
    const totalTax = normalizedData.reduce((sum, item) => sum + item.tax, 0);
    const totalGrandTotal = normalizedData.reduce((sum, item) => sum + item.grandTotal, 0);

    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';

    return {
      title: 'LAPORAN RETUR PENJUALAN - PACKAGING',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'NO. RETUR', 'NO. SO', 'KODE PELANGGAN', 'NAMA PELANGGAN', 'TANGGAL', 'ITEM', 'ALASAN', 'SUBTOTAL', 'DISKON', 'PAJAK', 'TOTAL', 'STATUS', 'CATATAN'],
      data: normalizedData.map((item, idx) => ({
        'NO': idx + 1,
        'NO. RETUR': item.returnNo,
        'NO. SO': item.soNo,
        'KODE PELANGGAN': item.customerKode,
        'NAMA PELANGGAN': item.customer,
        'TANGGAL': item.created,
        'ITEM': item.itemCount,
        'ALASAN': item.reason,
        'SUBTOTAL': item.subtotal,
        'DISKON': item.discount,
        'PAJAK': item.tax,
        'TOTAL': item.grandTotal,
        'STATUS': item.status,
        'CATATAN': item.notes,
      })),
      totals: {
        'TOTAL RETUR': normalizedData.length,
        'TOTAL SUBTOTAL': totalSubtotal,
        'TOTAL DISKON': totalDiscount,
        'TOTAL PAJAK': totalTax,
        'TOTAL GRAND TOTAL': totalGrandTotal,
      },
      formatting: {
        headerBgColor: 'FF6B6B', // Professional red for returns
        headerTextColor: 'FFFFFF', // White text
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 12, 12, 20, 12, 8, 15, 12, 10, 10, 12, 10, 20],
      },
    };
  },

  /**
   * PACKAGING - Sales Orders Per Item Report
   */
  packagingSalesOrdersPerItemReport: (data: any[], startDate?: string, endDate?: string): ReportTemplate => {
    // Flatten items from all sales orders
    const flatItems: any[] = [];
    
    data.forEach(so => {
      const soNo = (so.soNo || so.no || '').toString().trim() || '-';
      const customer = (so.customer || so.customerName || '').toString().trim() || '-';
      const customerKode = (so.customerKode || so.customerCode || '').toString().trim() || '-';
      const soDate = (so.created || so.date || '').toString().split('T')[0] || '-';
      const paymentTerms = (so.paymentTerms || 'COD').toString().trim();
      const topDays = so.topDays || 0;

      (so.items || []).forEach((item: any, itemIdx: number) => {
        flatItems.push({
          soNo,
          customer,
          customerKode,
          soDate,
          paymentTerms: paymentTerms === 'TOP' ? `TOP ${topDays}` : paymentTerms,
          itemNo: itemIdx + 1,
          productKode: (item.productKode || item.kode || '').toString().trim() || '-',
          productName: (item.productName || item.nama || '').toString().trim() || '-',
          qty: item.qty || 0,
          unit: (item.unit || item.satuan || '').toString().trim() || '-',
          price: item.price || 0,
          total: item.total || (item.qty || 0) * (item.price || 0),
          specNote: (item.specNote || item.spec || '').toString().trim() || '-',
          padCode: (item.padCode || '').toString().trim() || '-',
          discountPercent: item.discountPercent || 0,
        });
      });
    });

    // Calculate totals
    const totalQty = flatItems.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = flatItems.reduce((sum, item) => sum + item.total, 0);
    const totalDiscount = flatItems.reduce((sum, item) => sum + (item.total * (item.discountPercent / 100)), 0);

    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';

    return {
      title: 'LAPORAN PESANAN PENJUALAN PER ITEM - PACKAGING',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'NO. SO', 'TANGGAL', 'KODE PELANGGAN', 'NAMA PELANGGAN', 'ITEM', 'KODE PRODUK', 'NAMA PRODUK', 'QTY', 'SATUAN', 'HARGA', 'DISKON %', 'TOTAL', 'TERMS', 'SPEC/NOTE'],
      data: flatItems.map((item, idx) => ({
        'NO': idx + 1,
        'NO. SO': item.soNo,
        'TANGGAL': item.soDate,
        'KODE PELANGGAN': item.customerKode,
        'NAMA PELANGGAN': item.customer,
        'ITEM': item.itemNo,
        'KODE PRODUK': item.productKode,
        'NAMA PRODUK': item.productName,
        'QTY': item.qty,
        'SATUAN': item.unit,
        'HARGA': item.price,
        'DISKON %': item.discountPercent,
        'TOTAL': item.total,
        'TERMS': item.paymentTerms,
        'SPEC/NOTE': item.specNote,
      })),
      totals: {
        'TOTAL ITEM': flatItems.length,
        'TOTAL QTY': totalQty,
        'TOTAL HARGA': totalPrice,
        'TOTAL DISKON': totalDiscount,
      },
      formatting: {
        headerBgColor: '70AD47', // Professional green
        headerTextColor: 'FFFFFF', // White text
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 12, 12, 20, 6, 12, 20, 8, 8, 12, 10, 12, 10, 20],
      },
    };
  },

  /**
   * PACKAGING - Sales Orders Report
   */
  packagingSalesOrdersReport: (data: any[], startDate?: string, endDate?: string): ReportTemplate => {
    // Normalize data
    const normalizedData = data.map(so => ({
      soNo: (so.soNo || so.no || '').toString().trim() || '-',
      customer: (so.customer || so.customerName || '').toString().trim() || '-',
      customerKode: (so.customerKode || so.customerCode || '').toString().trim() || '-',
      created: (so.created || so.date || '').toString().split('T')[0] || '-',
      status: (so.status || 'OPEN').toString().trim(),
      paymentTerms: (so.paymentTerms || 'COD').toString().trim(),
      topDays: so.topDays || 0,
      itemCount: (so.items || []).length,
      subtotal: so.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0,
      discount: so.financialSummary?.discount || so.discount || 0,
      tax: so.financialSummary?.tax || so.tax || 0,
      grandTotal: so.financialSummary?.grandTotal || so.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0,
      confirmed: so.confirmed ? 'YES' : 'NO',
      confirmedAt: so.confirmedAt ? (so.confirmedAt || '').toString().split('T')[0] : '-',
    }));

    // Calculate totals
    const totalSubtotal = normalizedData.reduce((sum, item) => sum + item.subtotal, 0);
    const totalDiscount = normalizedData.reduce((sum, item) => sum + item.discount, 0);
    const totalTax = normalizedData.reduce((sum, item) => sum + item.tax, 0);
    const totalGrandTotal = normalizedData.reduce((sum, item) => sum + item.grandTotal, 0);

    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';

    return {
      title: 'LAPORAN PESANAN PENJUALAN - PACKAGING',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'NO. SO', 'KODE PELANGGAN', 'NAMA PELANGGAN', 'TANGGAL', 'STATUS', 'ITEM', 'SUBTOTAL', 'DISKON', 'PAJAK', 'TOTAL', 'TERMS', 'CONFIRMED'],
      data: normalizedData.map((item, idx) => ({
        'NO': idx + 1,
        'NO. SO': item.soNo,
        'KODE PELANGGAN': item.customerKode,
        'NAMA PELANGGAN': item.customer,
        'TANGGAL': item.created,
        'STATUS': item.status,
        'ITEM': item.itemCount,
        'SUBTOTAL': item.subtotal,
        'DISKON': item.discount,
        'PAJAK': item.tax,
        'TOTAL': item.grandTotal,
        'TERMS': item.paymentTerms === 'TOP' ? `TOP ${item.topDays}` : item.paymentTerms,
        'CONFIRMED': item.confirmed,
      })),
      totals: {
        'TOTAL PESANAN': normalizedData.length,
        'TOTAL SUBTOTAL': totalSubtotal,
        'TOTAL DISKON': totalDiscount,
        'TOTAL PAJAK': totalTax,
        'TOTAL GRAND TOTAL': totalGrandTotal,
      },
      formatting: {
        headerBgColor: '70AD47', // Professional green
        headerTextColor: 'FFFFFF', // White text
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 15, 15, 25, 12, 10, 8, 15, 12, 12, 15, 12, 12],
      },
    };
  },

  /**
   * PACKAGING - Sales Customer Analysis Report
   * Analisa pelanggan aktif/tidak aktif
   */
  salesCustomerAnalysisReport: (soData: any[], customersData: any[], startDate?: string, endDate?: string): ReportTemplate => {
    // Build customer sales map
    const customerSalesMap = new Map<string, { count: number; total: number; lastDate: string }>();
    
    soData.forEach(so => {
      const customerName = (so.customer || so.customerName || '').toString().trim();
      const soDate = (so.created || so.date || '').toString().split('T')[0] || '-';
      const grandTotal = so.financialSummary?.grandTotal || so.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
      
      if (customerName) {
        const existing = customerSalesMap.get(customerName) || { count: 0, total: 0, lastDate: soDate };
        customerSalesMap.set(customerName, {
          count: existing.count + 1,
          total: existing.total + grandTotal,
          lastDate: soDate > existing.lastDate ? soDate : existing.lastDate,
        });
      }
    });

    // Determine active/inactive status (inactive if no sales in last 90 days)
    const today = new Date();
    const ninetyDaysAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const analysisData = customersData.map((cust: any) => {
      const custName = (cust.nama || cust.name || '').toString().trim();
      const sales = customerSalesMap.get(custName) || { count: 0, total: 0, lastDate: '-' };
      const isActive = sales.count > 0 && sales.lastDate >= ninetyDaysAgo;
      
      return {
        kode: (cust.kode || cust.code || '').toString().trim() || '-',
        nama: custName || '-',
        alamat: (cust.alamat || cust.address || '').toString().trim() || '-',
        kontak: (cust.kontak || cust.contact || '').toString().trim() || '-',
        telepon: (cust.telepon || cust.phone || '').toString().trim() || '-',
        totalPenjualan: sales.total,
        jumlahTransaksi: sales.count,
        tanggalTerakhir: sales.lastDate,
        status: isActive ? 'AKTIF' : 'TIDAK AKTIF',
      };
    });

    const totalActive = analysisData.filter(a => a.status === 'AKTIF').length;
    const totalInactive = analysisData.filter(a => a.status === 'TIDAK AKTIF').length;
    const totalSales = analysisData.reduce((sum, a) => sum + a.totalPenjualan, 0);

    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';

    return {
      title: 'LAPORAN ANALISA PELANGGAN AKTIF/TIDAK AKTIF',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'KODE', 'NAMA PELANGGAN', 'ALAMAT', 'KONTAK', 'TELEPON', 'TOTAL PENJUALAN', 'JUMLAH TRANSAKSI', 'TANGGAL TERAKHIR', 'STATUS'],
      data: analysisData.map((item, idx) => ({
        'NO': idx + 1,
        'KODE': item.kode,
        'NAMA PELANGGAN': item.nama,
        'ALAMAT': item.alamat,
        'KONTAK': item.kontak,
        'TELEPON': item.telepon,
        'TOTAL PENJUALAN': item.totalPenjualan,
        'JUMLAH TRANSAKSI': item.jumlahTransaksi,
        'TANGGAL TERAKHIR': item.tanggalTerakhir,
        'STATUS': item.status,
      })),
      totals: {
        'TOTAL PELANGGAN AKTIF': totalActive,
        'TOTAL PELANGGAN TIDAK AKTIF': totalInactive,
        'TOTAL PENJUALAN': totalSales,
      },
      formatting: {
        headerBgColor: '70AD47',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 25, 30, 15, 15, 15, 12, 15, 12],
      },
    };
  },

  /**
   * PACKAGING - Sales Chart Top Items Report
   * Grafik penjualan item terbaik
   */
  salesChartTopItemsReport: (soData: any[], startDate?: string, endDate?: string): ReportTemplate => {
    const itemSalesMap = new Map<string, { qty: number; total: number }>();
    
    soData.forEach(so => {
      (so.items || []).forEach((item: any) => {
        const productName = (item.productName || item.nama || '').toString().trim();
        const qty = item.qty || 0;
        const total = item.total || 0;
        
        if (productName) {
          const existing = itemSalesMap.get(productName) || { qty: 0, total: 0 };
          itemSalesMap.set(productName, {
            qty: existing.qty + qty,
            total: existing.total + total,
          });
        }
      });
    });

    // Sort by total sales descending and take top 10
    const topItems = Array.from(itemSalesMap.entries())
      .map(([name, sales]) => ({ name, ...sales }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';

    return {
      title: 'LAPORAN GRAFIK PENJUALAN ITEM TERBAIK',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'NAMA PRODUK', 'TOTAL QTY', 'TOTAL PENJUALAN'],
      data: topItems.map((item, idx) => ({
        'NO': idx + 1,
        'NAMA PRODUK': item.name,
        'TOTAL QTY': item.qty,
        'TOTAL PENJUALAN': item.total,
      })),
      totals: {
        'TOTAL ITEM': topItems.length,
        'TOTAL QTY': topItems.reduce((sum, i) => sum + i.qty, 0),
        'TOTAL PENJUALAN': topItems.reduce((sum, i) => sum + i.total, 0),
      },
      formatting: {
        headerBgColor: '70AD47',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 30, 12, 15],
      },
    };
  },

  /**
   * PACKAGING - Sales Chart Daily Report
   * Grafik penjualan harian - Comprehensive dengan trend analysis
   */
  salesChartDailyReport: (soData: any[], startDate?: string, endDate?: string): ReportTemplate => {
    const dailySalesMap = new Map<string, { 
      count: number; 
      total: number; 
      customers: Set<string>; 
      items: number;
    }>();
    
    soData.forEach(so => {
      const soDate = (so.created || so.date || '').toString().split('T')[0] || '-';
      const grandTotal = so.financialSummary?.grandTotal || so.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
      const customerName = (so.customer || so.customerName || '').toString().trim();
      const itemCount = (so.items || []).length;
      const totalQty = (so.items || []).reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
      
      const existing = dailySalesMap.get(soDate) || { count: 0, total: 0, customers: new Set(), items: 0 };
      existing.customers.add(customerName);
      
      dailySalesMap.set(soDate, {
        count: existing.count + 1,
        total: existing.total + grandTotal,
        customers: existing.customers,
        items: existing.items + totalQty,
      });
    });

    // Sort by date
    const dailyDataRaw = Array.from(dailySalesMap.entries())
      .map(([date, sales]) => ({ 
        date, 
        count: sales.count,
        total: sales.total,
        uniqueCustomers: sales.customers.size,
        totalItems: sales.items,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate growth percentage and status
    const dailyData = dailyDataRaw.map((item, idx) => {
      const prevDay = idx > 0 ? dailyDataRaw[idx - 1] : null;
      const growth = prevDay ? ((item.total - prevDay.total) / prevDay.total) * 100 : 0;
      
      // Calculate average
      const avgPerTransaction = item.count > 0 ? item.total / item.count : 0;
      
      // Determine status based on total sales
      const allTotals = dailyDataRaw.map(d => d.total);
      const avgTotal = allTotals.reduce((a, b) => a + b, 0) / allTotals.length;
      let status = 'NORMAL';
      if (item.total > avgTotal * 1.2) status = 'TINGGI';
      else if (item.total < avgTotal * 0.8) status = 'RENDAH';
      
      return {
        ...item,
        avgPerTransaction: Math.round(avgPerTransaction),
        growth: Math.round(growth * 10) / 10,
        status,
      };
    });

    // Get day name
    const getDayName = (dateStr: string) => {
      const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
      const date = new Date(dateStr + 'T00:00:00');
      return days[date.getDay()];
    };

    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';

    return {
      title: 'LAPORAN GRAFIK PENJUALAN HARIAN',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'TANGGAL', 'HARI', 'TRANSAKSI', 'PELANGGAN UNIK', 'ITEM TERJUAL', 'TOTAL PENJUALAN', 'RATA-RATA/TRANSAKSI', 'PERTUMBUHAN %', 'STATUS'],
      data: dailyData.map((item, idx) => ({
        'NO': idx + 1,
        'TANGGAL': item.date,
        'HARI': getDayName(item.date),
        'TRANSAKSI': item.count,
        'PELANGGAN UNIK': item.uniqueCustomers,
        'ITEM TERJUAL': item.totalItems,
        'TOTAL PENJUALAN': item.total,
        'RATA-RATA/TRANSAKSI': item.avgPerTransaction,
        'PERTUMBUHAN %': item.growth,
        'STATUS': item.status,
      })),
      totals: {
        'TOTAL HARI': dailyData.length,
        'TOTAL TRANSAKSI': dailyData.reduce((sum, d) => sum + d.count, 0),
        'TOTAL PELANGGAN UNIK': new Set(dailyData.flatMap(d => d.uniqueCustomers)).size,
        'TOTAL ITEM TERJUAL': dailyData.reduce((sum, d) => sum + d.totalItems, 0),
        'TOTAL PENJUALAN': dailyData.reduce((sum, d) => sum + d.total, 0),
        'RATA-RATA PENJUALAN/HARI': Math.round(dailyData.reduce((sum, d) => sum + d.total, 0) / dailyData.length),
        'HARI TINGGI': dailyData.filter(d => d.status === 'TINGGI').length,
        'HARI NORMAL': dailyData.filter(d => d.status === 'NORMAL').length,
        'HARI RENDAH': dailyData.filter(d => d.status === 'RENDAH').length,
      },
      formatting: {
        headerBgColor: '70AD47',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 12, 10, 14, 12, 15, 18, 12, 10],
      },
    };
  },

  /**
   * PACKAGING - Sales Chart Monthly Report
   * Grafik penjualan bulanan - Comprehensive dengan trend analysis
   */
  salesChartMonthlyReport: (soData: any[], startDate?: string, endDate?: string): ReportTemplate => {
    const monthlySalesMap = new Map<string, { 
      count: number; 
      total: number; 
      customers: Set<string>; 
      items: number;
    }>();
    
    soData.forEach(so => {
      const soDate = (so.created || so.date || '').toString().split('T')[0] || '-';
      const yearMonth = soDate.substring(0, 7); // YYYY-MM
      const grandTotal = so.financialSummary?.grandTotal || so.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
      const customerName = (so.customer || so.customerName || '').toString().trim();
      const itemCount = (so.items || []).length;
      const totalQty = (so.items || []).reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
      
      const existing = monthlySalesMap.get(yearMonth) || { count: 0, total: 0, customers: new Set(), items: 0 };
      existing.customers.add(customerName);
      
      monthlySalesMap.set(yearMonth, {
        count: existing.count + 1,
        total: existing.total + grandTotal,
        customers: existing.customers,
        items: existing.items + totalQty,
      });
    });

    // Sort by month
    const monthlyDataRaw = Array.from(monthlySalesMap.entries())
      .map(([month, sales]) => ({ 
        month, 
        count: sales.count,
        total: sales.total,
        uniqueCustomers: sales.customers.size,
        totalItems: sales.items,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate growth percentage and status
    const monthlyData = monthlyDataRaw.map((item, idx) => {
      const prevMonth = idx > 0 ? monthlyDataRaw[idx - 1] : null;
      const growth = prevMonth ? ((item.total - prevMonth.total) / prevMonth.total) * 100 : 0;
      
      // Calculate average
      const avgPerTransaction = item.count > 0 ? item.total / item.count : 0;
      
      // Determine status based on total sales
      const allTotals = monthlyDataRaw.map(d => d.total);
      const avgTotal = allTotals.reduce((a, b) => a + b, 0) / allTotals.length;
      let status = 'NORMAL';
      if (item.total > avgTotal * 1.2) status = 'TINGGI';
      else if (item.total < avgTotal * 0.8) status = 'RENDAH';
      
      return {
        ...item,
        avgPerTransaction: Math.round(avgPerTransaction),
        growth: Math.round(growth * 10) / 10,
        status,
      };
    });

    // Format month display (YYYY-MM -> Bulan Tahun)
    const formatMonth = (monthStr: string) => {
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const [year, month] = monthStr.split('-');
      return `${months[parseInt(month) - 1]} ${year}`;
    };

    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';

    return {
      title: 'LAPORAN GRAFIK PENJUALAN BULANAN',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'BULAN', 'TRANSAKSI', 'PELANGGAN UNIK', 'ITEM TERJUAL', 'TOTAL PENJUALAN', 'RATA-RATA/TRANSAKSI', 'PERTUMBUHAN %', 'STATUS'],
      data: monthlyData.map((item, idx) => ({
        'NO': idx + 1,
        'BULAN': formatMonth(item.month),
        'TRANSAKSI': item.count,
        'PELANGGAN UNIK': item.uniqueCustomers,
        'ITEM TERJUAL': item.totalItems,
        'TOTAL PENJUALAN': item.total,
        'RATA-RATA/TRANSAKSI': item.avgPerTransaction,
        'PERTUMBUHAN %': item.growth,
        'STATUS': item.status,
      })),
      totals: {
        'TOTAL BULAN': monthlyData.length,
        'TOTAL TRANSAKSI': monthlyData.reduce((sum, m) => sum + m.count, 0),
        'TOTAL PELANGGAN UNIK': new Set(monthlyData.flatMap(m => m.uniqueCustomers)).size,
        'TOTAL ITEM TERJUAL': monthlyData.reduce((sum, m) => sum + m.totalItems, 0),
        'TOTAL PENJUALAN': monthlyData.reduce((sum, m) => sum + m.total, 0),
        'RATA-RATA PENJUALAN/BULAN': Math.round(monthlyData.reduce((sum, m) => sum + m.total, 0) / monthlyData.length),
        'BULAN TINGGI': monthlyData.filter(m => m.status === 'TINGGI').length,
        'BULAN NORMAL': monthlyData.filter(m => m.status === 'NORMAL').length,
        'BULAN RENDAH': monthlyData.filter(m => m.status === 'RENDAH').length,
      },
      formatting: {
        headerBgColor: '70AD47',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 18, 10, 14, 12, 15, 18, 12, 10],
      },
    };
  },

  /**
   * PACKAGING - Sales Chart Customer Expiry Report
   * Grafik kadaluarsa pelanggan
   */
  salesChartCustomerExpiryReport: (soData: any[], customersData: any[], startDate?: string, endDate?: string): ReportTemplate => {
    // Build customer sales map
    const customerSalesMap = new Map<string, { lastDate: string }>();
    
    soData.forEach(so => {
      const customerName = (so.customer || so.customerName || '').toString().trim();
      const soDate = (so.created || so.date || '').toString().split('T')[0] || '-';
      
      if (customerName) {
        const existing = customerSalesMap.get(customerName) || { lastDate: soDate };
        customerSalesMap.set(customerName, {
          lastDate: soDate > existing.lastDate ? soDate : existing.lastDate,
        });
      }
    });

    // Calculate days since last purchase
    const today = new Date();
    const expiryData = customersData
      .map((cust: any) => {
        const custName = (cust.nama || cust.name || '').toString().trim();
        const sales = customerSalesMap.get(custName);
        
        if (!sales) return null;
        
        const lastDate = new Date(sales.lastDate);
        const daysSince = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          nama: custName,
          lastDate: sales.lastDate,
          daysSince,
          category: daysSince <= 30 ? 'AKTIF' : daysSince <= 90 ? 'SEDANG' : 'KADALUARSA',
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => b.daysSince - a.daysSince);

    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';

    return {
      title: 'LAPORAN GRAFIK KADALUARSA PELANGGAN',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'NAMA PELANGGAN', 'TANGGAL TERAKHIR', 'HARI SEJAK PEMBELIAN', 'KATEGORI'],
      data: expiryData.map((item: any, idx: number) => ({
        'NO': idx + 1,
        'NAMA PELANGGAN': item.nama,
        'TANGGAL TERAKHIR': item.lastDate,
        'HARI SEJAK PEMBELIAN': item.daysSince,
        'KATEGORI': item.category,
      })),
      totals: {
        'TOTAL PELANGGAN': expiryData.length,
        'AKTIF (0-30 hari)': expiryData.filter((e: any) => e.category === 'AKTIF').length,
        'SEDANG (31-90 hari)': expiryData.filter((e: any) => e.category === 'SEDANG').length,
        'KADALUARSA (>90 hari)': expiryData.filter((e: any) => e.category === 'KADALUARSA').length,
      },
      formatting: {
        headerBgColor: 'FF6B6B',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 25, 15, 20, 15],
      },
    };
  },

  /**
   * PACKAGING - Sales Tax Invoice CSV Report
   * CSV/XML Faktur Pajak Keluaran
   */
  salesTaxInvoiceCSVReport: (invoicesData: any[], startDate?: string, endDate?: string): ReportTemplate => {
    const csvData = invoicesData.map((inv: any) => ({
      invoiceNo: (inv.invoiceNo || inv.no || '').toString().trim() || '-',
      date: (inv.created || inv.date || '').toString().split('T')[0] || '-',
      customer: (inv.customer || inv.customerName || '').toString().trim() || '-',
      npwp: (inv.npwp || '').toString().trim() || '-',
      subtotal: inv.bom?.subtotal || inv.subtotal || 0,
      tax: inv.bom?.tax || inv.tax || 0,
      total: inv.bom?.total || inv.total || 0,
      status: (inv.status || 'OPEN').toString().trim(),
    }));

    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';

    return {
      title: 'LAPORAN CSV/XML FAKTUR PAJAK KELUARAN',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'NO. FAKTUR', 'TANGGAL', 'PELANGGAN', 'NPWP', 'SUBTOTAL', 'PAJAK', 'TOTAL', 'STATUS'],
      data: csvData.map((item, idx) => ({
        'NO': idx + 1,
        'NO. FAKTUR': item.invoiceNo,
        'TANGGAL': item.date,
        'PELANGGAN': item.customer,
        'NPWP': item.npwp,
        'SUBTOTAL': item.subtotal,
        'PAJAK': item.tax,
        'TOTAL': item.total,
        'STATUS': item.status,
      })),
      totals: {
        'TOTAL FAKTUR': csvData.length,
        'TOTAL SUBTOTAL': csvData.reduce((sum, i) => sum + i.subtotal, 0),
        'TOTAL PAJAK': csvData.reduce((sum, i) => sum + i.tax, 0),
        'TOTAL': csvData.reduce((sum, i) => sum + i.total, 0),
      },
      formatting: {
        headerBgColor: '4472C4',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 15, 12, 25, 15, 12, 10, 12, 10],
      },
    };
  },

  /**
   * PACKAGING - Sales by Region Report
   * Detailed breakdown of sales by customer region with address information
   */
  packagingSalesByRegionReport: (soData: any[], customersData: any[], startDate?: string, endDate?: string): ReportTemplate => {
    // Build customer lookup map: customer name/code -> full customer data
    const customerMap = new Map<string, any>();
    customersData.forEach((cust: any) => {
      const nama = (cust.nama || cust.name || '').toString().trim().toLowerCase();
      const kode = (cust.kode || cust.code || '').toString().trim().toLowerCase();
      if (nama) customerMap.set(nama, cust);
      if (kode) customerMap.set(kode, cust);
    });

    // Flatten sales orders by region with address info
    const regionSalesMap = new Map<string, any[]>();

    soData.forEach(so => {
      const soNo = (so.soNo || so.no || '').toString().trim() || '-';
      const customerName = (so.customer || so.customerName || '').toString().trim();
      const customerKode = (so.customerKode || so.customerCode || '').toString().trim() || '-';
      const soDate = (so.created || so.date || '').toString().split('T')[0] || '-';
      const subtotal = so.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
      const discount = so.financialSummary?.discount || so.discount || 0;
      const tax = so.financialSummary?.tax || so.tax || 0;
      const grandTotal = so.financialSummary?.grandTotal || so.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
      const itemCount = (so.items || []).length;

      // Lookup customer details
      const customerLookup = customerMap.get(customerName.toLowerCase()) || customerMap.get(customerKode.toLowerCase());
      const alamat = (customerLookup?.alamat || customerLookup?.address || '').toString().trim() || '-';
      const kontak = (customerLookup?.kontak || customerLookup?.contact || '').toString().trim() || '-';
      const telepon = (customerLookup?.telepon || customerLookup?.phone || '').toString().trim() || '-';

      // Use customer name as region key (simple grouping)
      const regionKey = customerName || 'TIDAK DIKETAHUI';
      const regionKeyLower = regionKey.toLowerCase();

      if (!regionSalesMap.has(regionKeyLower)) {
        regionSalesMap.set(regionKeyLower, []);
      }

      regionSalesMap.get(regionKeyLower)!.push({
        soNo,
        customerKode,
        customerName,
        soDate,
        itemCount,
        subtotal,
        discount,
        tax,
        grandTotal,
        alamat,
        kontak,
        telepon,
      });
    });

    // Convert to array and sort by customer name
    const regionArray = Array.from(regionSalesMap.entries())
      .map(([key, sales]) => ({
        region: key.charAt(0).toUpperCase() + key.slice(1),
        sales,
      }))
      .sort((a, b) => a.region.localeCompare(b.region));

    // Flatten for report display
    const flatData: any[] = [];
    let rowNum = 1;

    regionArray.forEach(regionGroup => {
      regionGroup.sales.forEach((sale: any, idx: number) => {
        flatData.push({
          no: rowNum++,
          wilayah: idx === 0 ? regionGroup.region : '', // Show customer name only on first row
          soNo: sale.soNo,
          customerKode: sale.customerKode,
          customerName: sale.customerName,
          soDate: sale.soDate,
          alamat: sale.alamat,
          kontak: sale.kontak,
          telepon: sale.telepon,
          itemCount: sale.itemCount,
          subtotal: sale.subtotal,
          discount: sale.discount,
          tax: sale.tax,
          grandTotal: sale.grandTotal,
        });
      });
    });

    // Calculate totals
    const totalSO = flatData.length;
    const totalSubtotal = flatData.reduce((sum, item) => sum + item.subtotal, 0);
    const totalDiscount = flatData.reduce((sum, item) => sum + item.discount, 0);
    const totalTax = flatData.reduce((sum, item) => sum + item.tax, 0);
    const totalGrandTotal = flatData.reduce((sum, item) => sum + item.grandTotal, 0);

    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';

    return {
      title: 'LAPORAN PENJUALAN PER WILAYAH PELANGGAN - PACKAGING',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'PELANGGAN', 'NO. SO', 'KODE PELANGGAN', 'TANGGAL', 'ALAMAT', 'KONTAK', 'TELEPON', 'ITEM', 'SUBTOTAL', 'DISKON', 'PAJAK', 'TOTAL'],
      data: flatData.map((item) => ({
        'NO': item.no,
        'PELANGGAN': item.wilayah,
        'NO. SO': item.soNo,
        'KODE PELANGGAN': item.customerKode,
        'TANGGAL': item.soDate,
        'ALAMAT': item.alamat,
        'KONTAK': item.kontak,
        'TELEPON': item.telepon,
        'ITEM': item.itemCount,
        'SUBTOTAL': item.subtotal,
        'DISKON': item.discount,
        'PAJAK': item.tax,
        'TOTAL': item.grandTotal,
      })),
      totals: {
        'TOTAL PENJUALAN': totalSO,
        'TOTAL SUBTOTAL': totalSubtotal,
        'TOTAL DISKON': totalDiscount,
        'TOTAL PAJAK': totalTax,
        'TOTAL GRAND TOTAL': totalGrandTotal,
      },
      formatting: {
        headerBgColor: '70AD47', // Professional green
        headerTextColor: 'FFFFFF', // White text
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 20, 12, 15, 12, 30, 15, 15, 8, 12, 10, 10, 12],
      },
    };
  },

  /**
   * PACKAGING - Sales Report
   */
  gtSalesReport: (data: any[], startDate: string, endDate: string): ReportTemplate => {
    const totalAmount = data.reduce((sum, item) => sum + (item.amount || 0), 0);
    const totalQty = data.reduce((sum, item) => sum + (item.qty || 0), 0);

    return {
      title: 'LAPORAN PENJUALAN',
      subtitle: `Periode: ${startDate} s/d ${endDate}`,
      headers: ['No', 'Tanggal', 'No. SO', 'Pelanggan', 'Item', 'Qty', 'Unit', 'Harga', 'Total'],
      data: data.map((item, idx) => ({
        'No': idx + 1,
        'Tanggal': item.created || item.date || '-',
        'No. SO': item.soNo || '-',
        'Pelanggan': item.customer || item.customerName || '-',
        'Item': item.itemName || item.productName || '-',
        'Qty': item.qty || 0,
        'Unit': item.unit || '-',
        'Harga': item.price || 0,
        'Total': item.amount || 0,
      })),
      totals: {
        'TOTAL PENJUALAN': totalAmount,
        'TOTAL ITEM': totalQty,
      },
      formatting: {
        headerBgColor: 'FFD966',
        headerTextColor: '000000',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [5, 12, 15, 25, 20, 8, 8, 12, 15],
      },
    };
  },

  /**
   * PACKAGING - Purchase Report
   */
  gtPurchaseReport: (data: any[], startDate: string, endDate: string): ReportTemplate => {
    const totalAmount = data.reduce((sum, item) => sum + (item.total || 0), 0);
    const totalQty = data.reduce((sum, item) => sum + (item.qty || 0), 0);

    return {
      title: 'LAPORAN PEMBELIAN',
      subtitle: `Periode: ${startDate} s/d ${endDate}`,
      headers: ['No', 'Tanggal', 'No. PO', 'Supplier', 'Item', 'Qty', 'Unit', 'Harga', 'Total'],
      data: data.map((item, idx) => ({
        'No': idx + 1,
        'Tanggal': item.created || item.date || '-',
        'No. PO': item.poNo || '-',
        'Supplier': item.supplier || item.supplierName || '-',
        'Item': item.itemName || item.productName || '-',
        'Qty': item.qty || 0,
        'Unit': item.unit || '-',
        'Harga': item.price || 0,
        'Total': item.total || 0,
      })),
      totals: {
        'TOTAL PEMBELIAN': totalAmount,
        'TOTAL ITEM': totalQty,
      },
      formatting: {
        headerBgColor: 'B4C7E7',
        headerTextColor: '000000',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [5, 12, 15, 25, 20, 8, 8, 12, 15],
      },
    };
  },

  /**
   * PACKAGING - Invoices Report
   */
  gtInvoicesReport: (data: any[], startDate: string, endDate: string): ReportTemplate => {
    const totalAmount = data.reduce((sum, item) => sum + (item.bom?.total || item.total || 0), 0);
    const totalTax = data.reduce((sum, item) => sum + (item.bom?.tax || 0), 0);

    return {
      title: 'LAPORAN FAKTUR PENJUALAN',
      subtitle: `Periode: ${startDate} s/d ${endDate}`,
      headers: ['No', 'Tanggal', 'No. Faktur', 'Pelanggan', 'Subtotal', 'Pajak', 'Total', 'Status', 'Pembayaran'],
      data: data.map((item, idx) => ({
        'No': idx + 1,
        'Tanggal': item.created || '-',
        'No. Faktur': item.invoiceNo || '-',
        'Pelanggan': item.customer || '-',
        'Subtotal': item.bom?.subtotal || 0,
        'Pajak': item.bom?.tax || 0,
        'Total': item.bom?.total || item.total || 0,
        'Status': item.status || 'OPEN',
        'Pembayaran': item.paymentStatus || 'OPEN',
      })),
      totals: {
        'TOTAL FAKTUR': totalAmount,
        'TOTAL PAJAK': totalTax,
      },
      formatting: {
        headerBgColor: 'C6E0B4',
        headerTextColor: '000000',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [5, 12, 18, 25, 15, 12, 15, 12, 12],
      },
    };
  },

  /**
   * PRODUCTION - Bill of Material (BOM) Report
   */
  productionBOMReport: (data: any[]): ReportTemplate => {
    const normalizedData = data.map((item, idx) => ({
      'No': idx + 1,
      'Produk': item.productName || item.productKode || '-',
      'Material': item.materialName || item.materialKode || '-',
      'Ratio': item.ratio || 1,
      'Satuan': item.unit || 'Unit',
    }));

    return {
      title: 'LAPORAN BILL OF MATERIAL (BOM)',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No', 'Produk', 'Material', 'Ratio', 'Satuan'],
      data: normalizedData,
      formatting: {
        headerBgColor: '4472C4',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 40, 50, 10, 12],
      },
    };
  },

  /**
   * PACKAGING - Production Report
   */
  packagingProductionReport: (data: any[]): ReportTemplate => {
    const totalQty = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
    const totalProduced = data.reduce((sum, item) => sum + (item.actualQuantity || 0), 0);

    return {
      title: 'LAPORAN PRODUKSI',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No', 'No. SPK', 'Produk', 'Qty Order', 'Qty Produksi', 'Status', 'Tanggal Mulai', 'Tanggal Selesai'],
      data: data.map((item, idx) => ({
        'No': idx + 1,
        'No. SPK': item.spkNo || item.id || '-',
        'Produk': item.productName || item.product || '-',
        'Qty Order': item.quantity || 0,
        'Qty Produksi': item.actualQuantity || 0,
        'Status': item.status || 'DRAFT',
        'Tanggal Mulai': item.startDate || '-',
        'Tanggal Selesai': item.endDate || '-',
      })),
      totals: {
        'TOTAL ORDER': totalQty,
        'TOTAL PRODUKSI': totalProduced,
      },
      formatting: {
        headerBgColor: 'E2EFDA',
        headerTextColor: '000000',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [5, 15, 25, 12, 15, 12, 15, 15],
      },
    };
  },

  /**
   * PACKAGING - QC Report
   */
  packagingQCReport: (data: any[]): ReportTemplate => {
    const totalPass = data.filter(item => item.status === 'PASS').length;
    const totalFail = data.filter(item => item.status === 'FAIL').length;

    return {
      title: 'LAPORAN QUALITY CONTROL',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No', 'No. SPK', 'Produk', 'Qty', 'Status QC', 'Catatan', 'Tanggal QC'],
      data: data.map((item, idx) => ({
        'No': idx + 1,
        'No. SPK': item.spkNo || item.id || '-',
        'Produk': item.productName || item.product || '-',
        'Qty': item.quantity || 0,
        'Status QC': item.status || 'PENDING',
        'Catatan': item.notes || '-',
        'Tanggal QC': item.qcDate || '-',
      })),
      totals: {
        'TOTAL PASS': totalPass,
        'TOTAL FAIL': totalFail,
      },
      formatting: {
        headerBgColor: 'F4B084',
        headerTextColor: '000000',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [5, 15, 25, 10, 12, 25, 15],
      },
    };
  },

  /**
   * PRODUCTION - SPK (Work Order) Report
   */
  productionSPKReport: (data: any[], startDate?: string, endDate?: string): ReportTemplate => {
    const normalizedData = data.map((item, idx) => {
      // Helper function to format date
      const formatDate = (dateValue: any): string => {
        if (!dateValue) return '-';
        try {
          const dateStr = dateValue.toString();
          if (dateStr === '-' || dateStr === '') return '-';
          // Extract date part (YYYY-MM-DD)
          const datePart = dateStr.split('T')[0];
          return datePart && datePart !== 'Invalid Date' ? datePart : '-';
        } catch (e) {
          return '-';
        }
      };

      return {
        'No': idx + 1,
        'No. SPK': item.spkNo || item.id || '-',
        'Produk': item.productName || item.product || '-',
        'Qty Order': item.target || item.targetQty || item.quantity || 0,
        'Qty Produksi': item.producedQty || item.actualQuantity || item.progress || 0,
        'Status': item.status || 'DRAFT',
        'Tanggal Mulai': formatDate(
          item.scheduleStartDate || 
          item.productionStartDate || 
          item.startDate || 
          item.date
        ),
        'Tanggal Selesai': formatDate(
          item.scheduleEndDate || 
          item.productionEndDate || 
          item.producedDate || 
          item.endDate
        ),
      };
    });

    const totalQty = normalizedData.reduce((sum, item) => sum + (item['Qty Order'] || 0), 0);
    const totalProduced = normalizedData.reduce((sum, item) => sum + (item['Qty Produksi'] || 0), 0);

    return {
      title: 'LAPORAN SURAT PERINTAH KERJA (SPK)',
      subtitle: startDate && endDate ? `Periode: ${startDate} s/d ${endDate}` : `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No', 'No. SPK', 'Produk', 'Qty Order', 'Qty Produksi', 'Status', 'Tanggal Mulai', 'Tanggal Selesai'],
      data: normalizedData,
      totals: {
        'TOTAL ORDER': totalQty,
        'TOTAL PRODUKSI': totalProduced,
      },
      formatting: {
        headerBgColor: '4472C4',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [5, 15, 25, 12, 15, 12, 15, 15],
      },
    };
  },

  /**
   * PRODUCTION - Production Cost Report
   */
  productionCostReport: (data: any[], startDate?: string, endDate?: string): ReportTemplate => {
    const normalizedData = data.map((item, idx) => ({
      'No': idx + 1,
      'No. SPK': item.spkNo || item.id || '-',
      'Produk': item.productName || item.product || '-',
      'Qty': item.quantity || 0,
      'Biaya Material': item.materialCost || 0,
      'Biaya Tenaga Kerja': item.laborCost || 0,
      'Biaya Overhead': item.overheadCost || 0,
      'Total Biaya': (item.materialCost || 0) + (item.laborCost || 0) + (item.overheadCost || 0),
      'Biaya Per Unit': ((item.materialCost || 0) + (item.laborCost || 0) + (item.overheadCost || 0)) / (item.quantity || 1),
    }));

    const totalMaterial = normalizedData.reduce((sum, item) => sum + (item['Biaya Material'] || 0), 0);
    const totalLabor = normalizedData.reduce((sum, item) => sum + (item['Biaya Tenaga Kerja'] || 0), 0);
    const totalOverhead = normalizedData.reduce((sum, item) => sum + (item['Biaya Overhead'] || 0), 0);
    const totalCost = totalMaterial + totalLabor + totalOverhead;

    return {
      title: 'LAPORAN BIAYA PRODUKSI',
      subtitle: startDate && endDate ? `Periode: ${startDate} s/d ${endDate}` : `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No', 'No. SPK', 'Produk', 'Qty', 'Biaya Material', 'Biaya Tenaga Kerja', 'Biaya Overhead', 'Total Biaya', 'Biaya Per Unit'],
      data: normalizedData,
      totals: {
        'TOTAL BIAYA MATERIAL': totalMaterial,
        'TOTAL BIAYA TENAGA KERJA': totalLabor,
        'TOTAL BIAYA OVERHEAD': totalOverhead,
        'TOTAL BIAYA PRODUKSI': totalCost,
      },
      formatting: {
        headerBgColor: 'ED7D31',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [5, 15, 25, 10, 15, 18, 15, 15, 15],
      },
    };
  },

  /**
   * PRODUCTION - Material Usage Report
   */
  productionMaterialUsageReport: (data: any[], startDate?: string, endDate?: string): ReportTemplate => {
    const normalizedData = data.map((item, idx) => ({
      'No': idx + 1,
      'Tanggal': (item.created || item.date || '-').toString().split('T')[0],
      'No. SPK': item.spkNo || item.id || '-',
      'Produk': item.productName || item.product || '-',
      'Material': item.materialName || item.material || '-',
      'Qty Digunakan': item.usedQty || item.qty || 0,
      'Satuan': item.unit || 'Unit',
      'Harga': item.price || 0,
      'Total': (item.usedQty || item.qty || 0) * (item.price || 0),
    }));

    const totalUsed = normalizedData.reduce((sum, item) => sum + (item['Qty Digunakan'] || 0), 0);
    const totalCost = normalizedData.reduce((sum, item) => sum + (item['Total'] || 0), 0);

    return {
      title: 'LAPORAN PENGGUNAAN MATERIAL',
      subtitle: startDate && endDate ? `Periode: ${startDate} s/d ${endDate}` : `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No', 'Tanggal', 'No. SPK', 'Produk', 'Material', 'Qty Digunakan', 'Satuan', 'Harga', 'Total'],
      data: normalizedData,
      totals: {
        'TOTAL QTY DIGUNAKAN': totalUsed,
        'TOTAL BIAYA MATERIAL': totalCost,
      },
      formatting: {
        headerBgColor: '70AD47',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [5, 12, 15, 25, 25, 15, 10, 12, 12],
      },
    };
  },

  /**
   * PRODUCTION - Waste/Scrap Report
   */
  productionWasteReport: (data: any[], startDate?: string, endDate?: string): ReportTemplate => {
    const normalizedData = data.map((item, idx) => ({
      'No': idx + 1,
      'Tanggal': (item.created || item.date || '-').toString().split('T')[0],
      'No. SPK': item.spkNo || item.id || '-',
      'Produk': item.productName || item.product || '-',
      'Qty Waste': item.wasteQty || item.qty || 0,
      'Satuan': item.unit || 'Unit',
      'Alasan': item.reason || item.wasteReason || '-',
      'Nilai': item.wasteValue || 0,
      'Catatan': item.notes || '-',
    }));

    const totalWaste = normalizedData.reduce((sum, item) => sum + (item['Qty Waste'] || 0), 0);
    const totalValue = normalizedData.reduce((sum, item) => sum + (item['Nilai'] || 0), 0);

    return {
      title: 'LAPORAN WASTE/SCRAP PRODUKSI',
      subtitle: startDate && endDate ? `Periode: ${startDate} s/d ${endDate}` : `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No', 'Tanggal', 'No. SPK', 'Produk', 'Qty Waste', 'Satuan', 'Alasan', 'Nilai', 'Catatan'],
      data: normalizedData,
      totals: {
        'TOTAL QTY WASTE': totalWaste,
        'TOTAL NILAI WASTE': totalValue,
      },
      formatting: {
        headerBgColor: 'C55A11',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [5, 12, 15, 25, 12, 10, 20, 12, 20],
      },
    };
  },

  /**
   * PRODUCTION - Production Capacity Report
   */
  productionCapacityReport: (data: any[]): ReportTemplate => {
    const normalizedData = data.map((item, idx) => ({
      'No': idx + 1,
      'Lini Produksi': item.productionLine || item.line || `Line ${idx + 1}`,
      'Kapasitas Harian': item.dailyCapacity || 0,
      'Kapasitas Bulanan': item.monthlyCapacity || (item.dailyCapacity || 0) * 25,
      'Produksi Aktual': item.actualProduction || 0,
      'Utilisasi': item.utilization || '0%',
      'Downtime': item.downtime || 0,
      'Efisiensi': item.efficiency || '0%',
    }));

    return {
      title: 'LAPORAN KAPASITAS PRODUKSI',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No', 'Lini Produksi', 'Kapasitas Harian', 'Kapasitas Bulanan', 'Produksi Aktual', 'Utilisasi', 'Downtime', 'Efisiensi'],
      data: normalizedData,
      totals: {
        'Total Kapasitas Harian': normalizedData.reduce((sum, row) => sum + (row['Kapasitas Harian'] || 0), 0),
        'Total Produksi Aktual': normalizedData.reduce((sum, row) => sum + (row['Produksi Aktual'] || 0), 0),
        'Rata-rata Utilisasi': normalizedData.length > 0 
          ? (normalizedData.reduce((sum, row) => {
              const util = parseFloat(row['Utilisasi'] || '0');
              return sum + util;
            }, 0) / normalizedData.length).toFixed(2) + '%'
          : '0%',
      },
      formatting: {
        headerBgColor: '5B9BD5',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [5, 20, 15, 18, 15, 12, 12, 12],
      },
    };
  },

  /**
   * PACKAGING - Delivery Report
   */
  packagingDeliveryReport: (data: any[], startDate?: string, endDate?: string): ReportTemplate => {
    const flatData = data.flatMap(dn =>
      (dn.items || []).map((item: any, idx: number) => ({
        'No': idx + 1,
        'Tanggal': (dn.deliveryDate || dn.created || dn.date || '-').toString().split('T')[0],
        'No. Pengiriman': dn.deliveryNo || dn.dnNo || dn.sjNo || '-',
        'No. SPK': dn.spkNo || '-',
        'Pelanggan': dn.customer || '-',
        'Produk': item.productName || item.product || '-',
        'Qty': item.qty || 0,
        'Satuan': item.unit || '-',
        'Status': dn.status || 'OPEN',
      }))
    );

    return {
      title: 'LAPORAN PENGIRIMAN PRODUKSI',
      subtitle: startDate && endDate ? `Periode: ${startDate} s/d ${endDate}` : undefined,
      headers: ['No', 'Tanggal', 'No. Pengiriman', 'No. SPK', 'Pelanggan', 'Produk', 'Qty', 'Satuan', 'Status'],
      data: flatData,
      totals: {
        'Total Pengiriman': flatData.length,
        'Total Qty': flatData.reduce((sum, row) => sum + (row['Qty'] || 0), 0),
      },
      formatting: {
        headerBgColor: 'A6D96F',
        headerTextColor: '000000',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [5, 12, 18, 15, 20, 25, 10, 10, 12],
      },
    };
  },

  /**
   * PACKAGING - BOM Report
   */
  packagingBOMReport: (data: any[]): ReportTemplate => {
    const flatData = data.flatMap(bom =>
      (bom.materials || bom.items || []).map((material: any, idx: number) => ({
        'No': idx + 1,
        'Produk': bom.productName || bom.product || '-',
        'Kode Material': material.materialCode || material.code || '-',
        'Nama Material': material.materialName || material.name || '-',
        'Qty Dibutuhkan': material.qty || material.quantity || 0,
        'Satuan': material.unit || '-',
        'Harga': material.price || 0,
        'Total': (material.qty || 0) * (material.price || 0),
      }))
    );

    return {
      title: 'LAPORAN BILL OF MATERIAL (BOM)',
      headers: ['No', 'Produk', 'Kode Material', 'Nama Material', 'Qty Dibutuhkan', 'Satuan', 'Harga', 'Total'],
      data: flatData,
      totals: {
        'Total Material': flatData.length,
        'Total Biaya': flatData.reduce((sum, row) => sum + (row['Total'] || 0), 0),
      },
      formatting: {
        headerBgColor: '70AD47',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [5, 20, 15, 25, 15, 10, 12, 12],
      },
    };
  },

  /**
   * PACKAGING - Material Usage Report
   */
  packagingMaterialUsageReport: (data: any[], startDate?: string, endDate?: string): ReportTemplate => {
    const flatData = data.flatMap(usage =>
      (usage.materials || usage.items || []).map((material: any, idx: number) => ({
        'No': idx + 1,
        'Tanggal': usage.created || usage.date || '-',
        'No. SPK': usage.spkNo || '-',
        'Produk': usage.productName || usage.product || '-',
        'Kode Material': material.materialCode || material.code || '-',
        'Nama Material': material.materialName || material.name || '-',
        'Qty Digunakan': material.usedQty || material.qty || 0,
        'Satuan': material.unit || '-',
        'Harga': material.price || 0,
        'Total': (material.usedQty || material.qty || 0) * (material.price || 0),
      }))
    );

    return {
      title: 'LAPORAN PENGGUNAAN MATERIAL',
      subtitle: startDate && endDate ? `Periode: ${startDate} s/d ${endDate}` : undefined,
      headers: ['No', 'Tanggal', 'No. SPK', 'Produk', 'Kode Material', 'Nama Material', 'Qty Digunakan', 'Satuan', 'Harga', 'Total'],
      data: flatData,
      totals: {
        'Total Penggunaan': flatData.length,
        'Total Biaya Material': flatData.reduce((sum, row) => sum + (row['Total'] || 0), 0),
      },
      formatting: {
        headerBgColor: 'FFC000',
        headerTextColor: '000000',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [5, 12, 12, 20, 15, 25, 12, 10, 12, 12],
      },
    };
  },

  /**
   * PACKAGING - Production Cost Report
   */
  packagingProductionCostReport: (data: any[], startDate?: string, endDate?: string): ReportTemplate => {
    const flatData = data.map((prod, idx) => ({
      'No': idx + 1,
      'Tanggal': prod.created || prod.date || '-',
      'No. SPK': prod.spkNo || '-',
      'Produk': prod.productName || prod.product || '-',
      'Qty Target': prod.targetQty || prod.target || 0,
      'Qty Produksi': prod.producedQty || prod.progress || 0,
      'Biaya Material': prod.materialCost || 0,
      'Biaya Tenaga Kerja': prod.laborCost || 0,
      'Biaya Overhead': prod.overheadCost || 0,
      'Total Biaya': (prod.materialCost || 0) + (prod.laborCost || 0) + (prod.overheadCost || 0),
      'Biaya Per Unit': ((prod.materialCost || 0) + (prod.laborCost || 0) + (prod.overheadCost || 0)) / (prod.producedQty || 1),
    }));

    return {
      title: 'LAPORAN BIAYA PRODUKSI',
      subtitle: startDate && endDate ? `Periode: ${startDate} s/d ${endDate}` : undefined,
      headers: ['No', 'Tanggal', 'No. SPK', 'Produk', 'Qty Target', 'Qty Produksi', 'Biaya Material', 'Biaya Tenaga Kerja', 'Biaya Overhead', 'Total Biaya', 'Biaya Per Unit'],
      data: flatData,
      totals: {
        'Total Produksi': flatData.length,
        'Total Biaya Material': flatData.reduce((sum, row) => sum + (row['Biaya Material'] || 0), 0),
        'Total Biaya Tenaga Kerja': flatData.reduce((sum, row) => sum + (row['Biaya Tenaga Kerja'] || 0), 0),
        'Total Biaya Overhead': flatData.reduce((sum, row) => sum + (row['Biaya Overhead'] || 0), 0),
        'Total Biaya Keseluruhan': flatData.reduce((sum, row) => sum + (row['Total Biaya'] || 0), 0),
      },
      formatting: {
        headerBgColor: 'FF6B6B',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [5, 12, 12, 20, 10, 12, 12, 15, 12, 12, 12],
      },
    };
  },

  /**
   * PACKAGING - Waste/Scrap Report
   */
  packagingWasteReport: (data: any[], startDate?: string, endDate?: string): ReportTemplate => {
    const flatData = data.map((waste, idx) => ({
      'No': idx + 1,
      'Tanggal': waste.created || waste.date || '-',
      'No. SPK': waste.spkNo || '-',
      'Produk': waste.productName || waste.product || '-',
      'Jenis Waste': waste.wasteType || waste.type || '-',
      'Qty Waste': waste.wasteQty || waste.qty || 0,
      'Satuan': waste.unit || '-',
      'Alasan': waste.reason || '-',
      'Nilai Waste': waste.wasteValue || 0,
    }));

    return {
      title: 'LAPORAN WASTE/SCRAP PRODUKSI',
      subtitle: startDate && endDate ? `Periode: ${startDate} s/d ${endDate}` : undefined,
      headers: ['No', 'Tanggal', 'No. SPK', 'Produk', 'Jenis Waste', 'Qty Waste', 'Satuan', 'Alasan', 'Nilai Waste'],
      data: flatData,
      totals: {
        'Total Waste': flatData.length,
        'Total Qty Waste': flatData.reduce((sum, row) => sum + (row['Qty Waste'] || 0), 0),
        'Total Nilai Waste': flatData.reduce((sum, row) => sum + (row['Nilai Waste'] || 0), 0),
      },
      formatting: {
        headerBgColor: 'C55A11',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [5, 12, 12, 20, 15, 10, 10, 25, 12],
      },
    };
  },

  /**
   * packaging - Delivery Report
   */
  PackagingDeliveryReport: (data: any[], startDate: string, endDate: string): ReportTemplate => {
    const totalDeliveries = data.length;
    const totalAmount = data.reduce((sum, item) => sum + (item.total || 0), 0);

    return {
      title: 'LAPORAN PENGIRIMAN',
      subtitle: `Periode: ${startDate} s/d ${endDate}`,
      headers: ['No', 'Tanggal', 'No. Surat Jalan', 'Pengemudi', 'Kendaraan', 'Tujuan', 'Status', 'Total'],
      data: data.map((item, idx) => ({
        'No': idx + 1,
        'Tanggal': item.created || item.date || '-',
        'No. Surat Jalan': item.sjNo || item.deliveryNo || '-',
        'Pengemudi': item.driver || item.driverName || '-',
        'Kendaraan': item.vehicle || item.vehiclePlate || '-',
        'Tujuan': item.destination || item.customer || '-',
        'Status': item.status || 'PENDING',
        'Total': item.total || 0,
      })),
      totals: {
        'TOTAL PENGIRIMAN': totalDeliveries,
        'TOTAL NILAI': totalAmount,
      },
      formatting: {
        headerBgColor: 'D9E1F2',
        headerTextColor: '000000',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [5, 12, 18, 18, 15, 25, 12, 15],
      },
    };
  },

  /**
   * packaging - Invoices Report
   */
  packagingInvoicesReport: (data: any[], startDate: string, endDate: string): ReportTemplate => {
    const totalAmount = data.reduce((sum, item) => sum + (item.bom?.total || item.total || 0), 0);

    return {
      title: 'LAPORAN FAKTUR PENGIRIMAN',
      subtitle: `Periode: ${startDate} s/d ${endDate}`,
      headers: ['No', 'Tanggal', 'No. Faktur', 'Pelanggan', 'Jasa Angkutan', 'Total', 'Status', 'Pembayaran'],
      data: data.map((item, idx) => ({
        'No': idx + 1,
        'Tanggal': item.created || '-',
        'No. Faktur': item.invoiceNo || '-',
        'Pelanggan': item.customer || '-',
        'Jasa Angkutan': item.lines?.[0]?.itemName || 'JASA ANGKUTAN',
        'Total': item.bom?.total || item.total || 0,
        'Status': item.status || 'OPEN',
        'Pembayaran': item.paymentStatus || 'OPEN',
      })),
      totals: {
        'TOTAL FAKTUR': totalAmount,
      },
      formatting: {
        headerBgColor: 'A9D08E',
        headerTextColor: '000000',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [5, 12, 18, 25, 20, 15, 12, 12],
      },
    };
  },

  /**
   * MASTER DATA - Products Report
   */
  masterProductsReport: (data: any[], customerCodeMap?: Map<string, string>, inventoryMap?: Map<string, number>): ReportTemplate => {
    // Normalize data dengan PAD Code dari customer master dan stock dari inventory
    const normalizedData = data.map(item => {
      // Kode: gunakan kode, fallback ke product_id
      const kode = (item.kode || item.product_id || item.code || item.sku || '').toString().trim();
      
      // PAD Code = customer code dari customer master
      // Lookup berdasarkan customer name
      const customerName = (item.customer || item.supplier || '').toString().trim().toLowerCase();
      let padCode = '-';
      
      if (customerName && customerCodeMap) {
        padCode = customerCodeMap.get(customerName) || '-';
      }
      
      // Stock = lookup dari inventory map menggunakan kode
      // Fallback ke stockAman jika tidak ada di inventory
      let stok = Number(item.stockAman || item.stock || 0) || 0;
      
      if (inventoryMap && kode) {
        const inventoryStock = inventoryMap.get(kode.toLowerCase());
        if (inventoryStock !== undefined) {
          stok = inventoryStock;
        }
      }
      
      return {
        no: 0, // Will be set in map
        kode: kode || '-',
        nama: (item.nama || item.name || item.productName || '').toString().trim() || '-',
        kategori: (item.kategori || item.category || '').toString().trim() || '-',
        satuan: (item.satuan || item.unit || '').toString().trim() || '-',
        hargaJual: Number(item.hargaFg || item.price || 0) || 0,
        hargaBeli: Number(item.harga || item.cost || 0) || 0,
        stok: stok, // From inventory map or fallback to stockAman
        padCode: padCode, // Customer code dari customer master
        pelanggan: (item.customer || item.supplier || '').toString().trim() || '-',
      };
    });

    // Calculate totals
    const totalStok = normalizedData.reduce((sum, item) => sum + (item.stok || 0), 0);
    const totalNilai = normalizedData.reduce((sum, item) => sum + ((item.stok || 0) * (item.hargaJual || 0)), 0);

    return {
      title: 'DAFTAR PRODUK',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      // UPPERCASE headers, professional order
      headers: ['NO', 'KODE', 'NAMA PRODUK', 'KATEGORI', 'UNIT', 'HARGA JUAL', 'HARGA BELI', 'STOK', 'PAD CODE', 'PELANGGAN', 'NILAI STOK'],
      data: normalizedData.map((item, idx) => ({
        'NO': idx + 1,
        'KODE': item.kode,
        'NAMA PRODUK': item.nama,
        'KATEGORI': item.kategori,
        'UNIT': item.satuan,
        'HARGA JUAL': item.hargaJual,
        'HARGA BELI': item.hargaBeli,
        'STOK': item.stok,
        'PAD CODE': item.padCode,
        'PELANGGAN': item.pelanggan,
        'NILAI STOK': (item.stok * item.hargaJual),
      })),
      totals: {
        'TOTAL STOK': totalStok,
        'TOTAL NILAI': totalNilai,
      },
      formatting: {
        headerBgColor: '4472C4', // Professional blue
        headerTextColor: 'FFFFFF', // White text
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 30, 15, 10, 15, 15, 12, 15, 20, 15],
      },
    };
  },

  /**
   * MASTER DATA - Products with BOM Report
   */
  masterProductsBOMReport: (productsData: any[], bomData: any[], materialsMap?: Map<string, any>): ReportTemplate => {
    // Flatten products with their BOM items
    const flatData: any[] = [];
    
    productsData.forEach((product: any) => {
      const productKode = (product.kode || product.product_id || product.code || '').toString().trim().toLowerCase();
      
      // Find BOM items for this product
      const bomItems = bomData.filter((bom: any) => {
        const bomProductKode = (bom.product_id || bom.kode || '').toString().trim().toLowerCase();
        return bomProductKode === productKode;
      });
      
      if (bomItems.length === 0) {
        // Product without BOM
        flatData.push({
          productKode: (product.kode || product.product_id || '').toString().trim() || '-',
          productNama: (product.nama || product.name || '').toString().trim() || '-',
          materialKode: '-',
          materialNama: '-',
          ratio: '-',
          satuan: '-',
        });
      } else {
        // Product with BOM items
        bomItems.forEach((bom: any) => {
          const materialKode = (bom.material_id || bom.kode || '').toString().trim().toLowerCase();
          const material = materialsMap?.get(materialKode);
          
          flatData.push({
            productKode: (product.kode || product.product_id || '').toString().trim() || '-',
            productNama: (product.nama || product.name || '').toString().trim() || '-',
            materialKode: (bom.material_id || bom.kode || '').toString().trim() || '-',
            materialNama: (material?.nama || material?.name || bom.material_name || '').toString().trim() || '-',
            ratio: Number(bom.ratio || 1) || 1,
            satuan: (material?.satuan || material?.unit || bom.unit || '').toString().trim() || '-',
          });
        });
      }
    });

    return {
      title: 'DAFTAR PRODUK DENGAN BOM',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      // UPPERCASE headers
      headers: ['NO', 'KODE PRODUK', 'NAMA PRODUK', 'KODE MATERIAL', 'NAMA MATERIAL', 'RATIO', 'SATUAN', 'HARGA'],
      data: flatData.map((item, idx) => ({
        'NO': idx + 1,
        'KODE PRODUK': item.productKode,
        'NAMA PRODUK': item.productNama,
        'KODE MATERIAL': item.materialKode,
        'NAMA MATERIAL': item.materialNama,
        'RATIO': item.ratio,
        'SATUAN': item.satuan,
      })),
      totals: {
        'TOTAL ITEMS': flatData.length,
      },
      formatting: {
        headerBgColor: '70AD47', // Professional green
        headerTextColor: 'FFFFFF', // White text
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 15, 30, 15, 30, 10, 10, 12],
      },
    };
  },

  /**
   * MASTER DATA - Customers Report
   */
  masterCustomersReport: (data: any[]): ReportTemplate => {
    // Normalize data
    const normalizedData = data.map(item => ({
      kode: (item.kode || item.code || item.id || '').toString().trim() || '-',
      nama: (item.nama || item.name || item.customerName || '').toString().trim() || '-',
      kontak: (item.kontak || item.contact || item.contactPerson || '').toString().trim() || '-',
      telepon: (item.telepon || item.phone || item.telephone || '').toString().trim() || '-',
      email: (item.email || '').toString().trim() || '-',
      alamat: (item.alamat || item.address || '').toString().trim() || '-',
      kota: (item.kota || item.city || '').toString().trim() || '-',
      npwp: (item.npwp || item.taxId || '').toString().trim() || '-',
      kategori: (item.kategori || item.category || '').toString().trim() || '-',
    }));

    return {
      title: 'DAFTAR PELANGGAN',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      // UPPERCASE headers, professional order
      headers: ['NO', 'KODE', 'NAMA PELANGGAN', 'KONTAK', 'TELEPON', 'EMAIL', 'ALAMAT', 'KOTA', 'NPWP', 'KATEGORI'],
      data: normalizedData.map((item, idx) => ({
        'NO': idx + 1,
        'KODE': item.kode,
        'NAMA PELANGGAN': item.nama,
        'KONTAK': item.kontak,
        'TELEPON': item.telepon,
        'EMAIL': item.email,
        'ALAMAT': item.alamat,
        'KOTA': item.kota,
        'NPWP': item.npwp,
        'KATEGORI': item.kategori,
      })),
      totals: {
        'TOTAL PELANGGAN': normalizedData.length,
      },
      formatting: {
        headerBgColor: '4472C4', // Professional blue
        headerTextColor: 'FFFFFF', // White text
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 25, 20, 15, 25, 30, 15, 15, 15],
      },
    };
  },

  /**
   * MASTER DATA - Suppliers Report
   */
  masterSuppliersReport: (data: any[]): ReportTemplate => {
    // Normalize data
    const normalizedData = data.map(item => ({
      kode: (item.kode || item.code || item.id || '').toString().trim() || '-',
      nama: (item.nama || item.name || item.supplierName || '').toString().trim() || '-',
      kontak: (item.kontak || item.contact || item.contactPerson || '').toString().trim() || '-',
      telepon: (item.telepon || item.phone || item.telephone || '').toString().trim() || '-',
      email: (item.email || '').toString().trim() || '-',
      alamat: (item.alamat || item.address || '').toString().trim() || '-',
      kota: (item.kota || item.city || '').toString().trim() || '-',
      npwp: (item.npwp || item.taxId || '').toString().trim() || '-',
      kategori: (item.kategori || item.category || '').toString().trim() || '-',
    }));

    return {
      title: 'DAFTAR SUPPLIER',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      // UPPERCASE headers, professional order
      headers: ['NO', 'KODE', 'NAMA SUPPLIER', 'KONTAK', 'TELEPON', 'EMAIL', 'ALAMAT', 'KOTA', 'NPWP', 'KATEGORI'],
      data: normalizedData.map((item, idx) => ({
        'NO': idx + 1,
        'KODE': item.kode,
        'NAMA SUPPLIER': item.nama,
        'KONTAK': item.kontak,
        'TELEPON': item.telepon,
        'EMAIL': item.email,
        'ALAMAT': item.alamat,
        'KOTA': item.kota,
        'NPWP': item.npwp,
        'KATEGORI': item.kategori,
      })),
      totals: {
        'TOTAL SUPPLIER': normalizedData.length,
      },
      formatting: {
        headerBgColor: '70AD47', // Professional green
        headerTextColor: 'FFFFFF', // White text
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 25, 20, 15, 25, 30, 15, 15, 15],
      },
    };
  },

  /**
   * MASTER DATA - Materials Report
   * Pull stock dari inventory table (seperti products)
   */
  masterMaterialsReport: (data: any[], inventoryMap?: Map<string, number>): ReportTemplate => {
    // Normalize data dengan stock dari inventory
    const normalizedData = data.map(item => {
      const kode = (item.kode || item.code || item.sku || '').toString().trim().toLowerCase();
      
      // Stock = lookup dari inventory map menggunakan kode
      // Fallback ke stockAman jika tidak ada di inventory
      let stock = Number(item.stockAman || item.stock || 0) || 0;
      
      if (inventoryMap && kode) {
        const inventoryStock = inventoryMap.get(kode);
        if (inventoryStock !== undefined) {
          stock = inventoryStock;
        }
      }
      
      return {
        kode: (item.kode || item.code || item.sku || '').toString().trim() || '-',
        nama: (item.nama || item.name || item.materialName || '').toString().trim() || '-',
        satuan: (item.satuan || item.unit || item.uom || '').toString().trim() || '-',
        kategori: (item.kategori || item.category || '').toString().trim() || '-',
        supplier: (item.supplier || item.supplierName || '').toString().trim() || '-',
        stock: stock,
        harga: Number(item.harga || item.price || item.priceMtr || 0) || 0,
      };
    });

    const totalStock = normalizedData.reduce((sum, item) => sum + (item.stock || 0), 0);
    const totalNilai = normalizedData.reduce((sum, item) => sum + ((item.stock || 0) * (item.harga || 0)), 0);

    return {
      title: 'DAFTAR MATERIAL',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      // UPPERCASE headers, professional order
      headers: ['NO', 'KODE', 'NAMA MATERIAL', 'SATUAN', 'KATEGORI', 'SUPPLIER', 'STOCK', 'HARGA', 'NILAI STOK'],
      data: normalizedData.map((item, idx) => ({
        'NO': idx + 1,
        'KODE': item.kode,
        'NAMA MATERIAL': item.nama,
        'SATUAN': item.satuan,
        'KATEGORI': item.kategori,
        'SUPPLIER': item.supplier,
        'STOCK': item.stock,
        'HARGA': item.harga,
        'NILAI STOK': (item.stock * item.harga),
      })),
      totals: {
        'TOTAL STOCK': totalStock,
        'TOTAL NILAI': totalNilai,
      },
      formatting: {
        headerBgColor: 'FFC000', // Professional orange/gold
        headerTextColor: '000000', // Black text
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 30, 10, 15, 20, 12, 12, 15],
      },
    };
  },

  /**
   * MASTER DATA - Staff/Employees Report
   */
  masterStaffReport: (data: any[]): ReportTemplate => {
    // Normalize data
    const normalizedData = data.map(item => ({
      nip: (item.nip || item.employeeId || '').toString().trim() || '-',
      namaLengkap: (item.namaLengkap || item.name || item.fullName || '').toString().trim() || '-',
      departemen: (item.departemen || item.department || '').toString().trim() || '-',
      section: (item.section || item.divisi || '').toString().trim() || '-',
      jabatan: (item.jabatan || item.position || item.title || '').toString().trim() || '-',
      tanggalLahir: (item.tanggalLahir || item.dateOfBirth || '').toString().trim() || '-',
      noHp: (item.noHp || item.phone || item.telephone || '').toString().trim() || '-',
      noKtp: (item.noKtp || item.ktpNumber || '').toString().trim() || '-',
      noNpwp: (item.noNpwp || item.npwp || item.taxId || '').toString().trim() || '-',
      namaBank: (item.namaBank || item.bankName || '').toString().trim() || '-',
      noRekening: (item.noRekening || item.accountNumber || '').toString().trim() || '-',
      gajiPokok: Number(item.gajiPokok || item.baseSalary || 0) || 0,
    }));

    return {
      title: 'DAFTAR KARYAWAN',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      // UPPERCASE headers, professional order
      headers: ['NO', 'NIP', 'NAMA LENGKAP', 'DEPARTEMEN', 'SECTION', 'JABATAN', 'TANGGAL LAHIR', 'NO HP', 'NO KTP', 'NO NPWP', 'NAMA BANK', 'NO REKENING', 'GAJI POKOK'],
      data: normalizedData.map((item, idx) => ({
        'NO': idx + 1,
        'NIP': item.nip,
        'NAMA LENGKAP': item.namaLengkap,
        'DEPARTEMEN': item.departemen,
        'SECTION': item.section,
        'JABATAN': item.jabatan,
        'TANGGAL LAHIR': item.tanggalLahir,
        'NO HP': item.noHp,
        'NO KTP': item.noKtp,
        'NO NPWP': item.noNpwp,
        'NAMA BANK': item.namaBank,
        'NO REKENING': item.noRekening,
        'GAJI POKOK': item.gajiPokok,
      })),
      totals: {
        'TOTAL KARYAWAN': normalizedData.length,
        'TOTAL GAJI POKOK': normalizedData.reduce((sum, item) => sum + (item.gajiPokok || 0), 0),
      },
      formatting: {
        headerBgColor: 'FF6B6B', // Professional red
        headerTextColor: 'FFFFFF', // White text
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 25, 15, 12, 15, 15, 15, 15, 15, 15, 15, 15],
      },
    };
  },

  /**
   * MASTER DATA - Categories Report
   * Combine product categories dan material categories
   */
  masterCategoriesReport: (data: any[]): ReportTemplate => {
    // Normalize data
    const normalizedData = data.map(item => ({
      type: (item.type || 'Unknown').toString().trim(),
      kategori: (item.kategori || item.category || '').toString().trim() || '-',
      jumlahItem: item.jumlahItem || item.count || 0,
      deskripsi: (item.deskripsi || item.description || '').toString().trim() || '-',
    }));

    const totalItems = normalizedData.reduce((sum, item) => sum + (item.jumlahItem || 0), 0);

    return {
      title: 'DAFTAR KATEGORI PRODUK',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['NO', 'TIPE', 'KATEGORI', 'JUMLAH ITEM', 'DESKRIPSI'],
      data: normalizedData.map((item, idx) => ({
        'NO': idx + 1,
        'TIPE': item.type,
        'KATEGORI': item.kategori,
        'JUMLAH ITEM': item.jumlahItem,
        'DESKRIPSI': item.deskripsi,
      })),
      totals: {
        'TOTAL KATEGORI': normalizedData.length,
        'TOTAL ITEM': totalItems,
      },
      formatting: {
        headerBgColor: '70AD47', // Professional green
        headerTextColor: 'FFFFFF', // White text
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 15, 25, 15, 30],
      },
    };
  },

  /**
   * MASTER DATA - Complete Inventory Report
   * Tarik semua data dari inventory (Product + Material) dengan detail lengkap
   */
  masterCompleteInventoryReport: (data: any[]): ReportTemplate => {
    // Normalize data dengan detail lengkap
    const normalizedData = data.map(item => ({
      tipe: (item.kategori || '').toLowerCase().trim() === 'material' ? 'Material' : 'Product',
      kode: (item.codeItem || item.item_code || '').toString().trim() || '-',
      nama: (item.description || item.nama || '').toString().trim() || '-',
      supplier: (item.supplierName || item.supplier || '').toString().trim() || '-',
      satuan: (item.satuan || item.unit || 'PCS').toString().trim() || 'PCS',
      harga: Number(item.price || 0) || 0,
      stockAman: Number(item.stockP1 || 0) || 0,
      stockMinimum: Number(item.stockP2 || 0) || 0,
      stockAkhir: Number(item.nextStock || 0) || 0,
      nilaiStok: (Number(item.nextStock || 0) * Number(item.price || 0)) || 0,
    }));

    const totalStok = normalizedData.reduce((sum, item) => sum + (item.stockAkhir || 0), 0);
    const totalNilai = normalizedData.reduce((sum, item) => sum + (item.nilaiStok || 0), 0);
    const totalHarga = normalizedData.reduce((sum, item) => sum + (item.harga || 0), 0);

    return {
      title: 'DAFTAR LENGKAP INVENTORY',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')} | Total Item: ${normalizedData.length}`,
      headers: ['NO', 'TIPE', 'KODE', 'NAMA ITEM', 'SUPPLIER', 'SATUAN', 'HARGA', 'STOCK AMAN', 'STOCK MIN', 'STOCK AKHIR', 'NILAI STOK'],
      data: normalizedData.map((item, idx) => ({
        'NO': idx + 1,
        'TIPE': item.tipe,
        'KODE': item.kode,
        'NAMA ITEM': item.nama,
        'SUPPLIER': item.supplier,
        'SATUAN': item.satuan,
        'HARGA': item.harga,
        'STOCK AMAN': item.stockAman,
        'STOCK MIN': item.stockMinimum,
        'STOCK AKHIR': item.stockAkhir,
        'NILAI STOK': item.nilaiStok,
      })),
      totals: {
        'TOTAL ITEM': normalizedData.length,
        'TOTAL STOCK': totalStok,
        'TOTAL HARGA': totalHarga,
        'TOTAL NILAI': totalNilai,
      },
      formatting: {
        headerBgColor: '4472C4', // Professional blue
        headerTextColor: 'FFFFFF', // White text
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 15, 30, 20, 10, 12, 12, 12, 12, 15],
      },
    };
  },

  /**
   * MASTER DATA - Units Report
   * Tarik satuan unik dari product dan material
   */
  masterUnitsReport: (data: any[]): ReportTemplate => {
    // Extract unique units dengan count
    const unitMap = new Map<string, { satuan: string; jumlahItem: number; tipe: string[] }>();
    
    data.forEach(item => {
      const satuan = (item.satuan || item.unit || 'PCS').toString().trim().toUpperCase();
      const tipe = (item.kategori || '').toLowerCase().trim() === 'material' ? 'Material' : 'Product';
      
      if (!unitMap.has(satuan)) {
        unitMap.set(satuan, { satuan, jumlahItem: 0, tipe: [] });
      }
      
      const entry = unitMap.get(satuan)!;
      entry.jumlahItem += 1;
      if (!entry.tipe.includes(tipe)) {
        entry.tipe.push(tipe);
      }
    });

    // Convert to array dan sort
    const normalizedData = Array.from(unitMap.values())
      .sort((a, b) => b.jumlahItem - a.jumlahItem)
      .map(item => ({
        satuan: item.satuan,
        jumlahItem: item.jumlahItem,
        tipe: item.tipe.join(', '),
        deskripsi: `Satuan ${item.satuan}`,
      }));

    const totalItem = normalizedData.reduce((sum, item) => sum + (item.jumlahItem || 0), 0);

    return {
      title: 'DAFTAR SATUAN PENGUKURAN',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')} | Total Satuan: ${normalizedData.length}`,
      headers: ['NO', 'SATUAN', 'JUMLAH ITEM', 'TIPE', 'DESKRIPSI'],
      data: normalizedData.map((item, idx) => ({
        'NO': idx + 1,
        'SATUAN': item.satuan,
        'JUMLAH ITEM': item.jumlahItem,
        'TIPE': item.tipe,
        'DESKRIPSI': item.deskripsi,
      })),
      totals: {
        'TOTAL SATUAN': normalizedData.length,
        'TOTAL ITEM': totalItem,
      },
      formatting: {
        headerBgColor: 'FFC000', // Professional orange/gold
        headerTextColor: '000000', // Black text
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 15, 15, 20, 30],
      },
    };
  },

  /**
   * INVENTORY - Stock Report
   */
  inventoryStockReport: (data: any[]): ReportTemplate => {
    const totalValue = data.reduce((sum, item) => sum + (item.nilaiStok || 0), 0);

    return {
      title: 'LAPORAN STOK BARANG',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No', 'Kode', 'Nama Item', 'Kategori', 'Stok', 'Harga Beli', 'Nilai Stok', 'Min Stock', 'Max Stock'],
      data: data.map((item, idx) => ({
        'No': idx + 1,
        'Kode': item.kode || item.code || item.sku || '-',
        'Nama Item': item.nama || item.name || item.productName || '-',
        'Kategori': item.kategori || item.category || '-',
        'Stok': item.stok || item.stock || 0,
        'Harga Beli': item.hargaBeli || item.cost || 0,
        'Nilai Stok': item.nilaiStok || ((item.stok || item.stock || 0) * (item.hargaBeli || item.cost || 0)),
        'Min Stock': item.minStock || 0,
        'Max Stock': item.maxStock || 0,
      })),
      totals: {
        'TOTAL STOK': data.reduce((sum, item) => sum + (item.stok || item.stock || 0), 0),
        'TOTAL NILAI': totalValue,
      },
      formatting: {
        headerBgColor: 'C6E0B4',
        headerTextColor: '000000',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [5, 12, 25, 15, 10, 15, 15, 12, 12],
      },
    };
  },

  /**
   * ACCOUNTS RECEIVABLE - AR Report
   */
  arReport: (data: any[], totals?: any): ReportTemplate => {
    const totalOutstanding = totals?.totalOutstanding || data.reduce((sum, item) => sum + (item['Sisa Piutang'] || 0), 0);
    const totalPaid = totals?.totalPaid || data.reduce((sum, item) => sum + (item['Terbayar'] || 0), 0);
    const totalInvoice = totals?.totalInvoice || data.reduce((sum, item) => sum + (item['Total'] || 0), 0);

    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `LAPORAN PIUTANG USAHA (ACCOUNTS RECEIVABLE)\nPer: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No. Faktur', 'Pelanggan', 'Tanggal', 'Jatuh Tempo', 'Total', 'Terbayar', 'Sisa Piutang', 'Status', 'Umur (hari)'],
      data: data.map((item) => ({
        'No. Faktur': item['No. Faktur'] || '-',
        'Pelanggan': item['Pelanggan'] || '-',
        'Tanggal': item['Tanggal'] || '-',
        'Jatuh Tempo': item['Jatuh Tempo'] || '-',
        'Total': item['Total'] || 0,
        'Terbayar': item['Terbayar'] || 0,
        'Sisa Piutang': item['Sisa Piutang'] || 0,
        'Status': item['Status'] || '-',
        'Umur (hari)': item['Umur (hari)'] || 0,
      })),
      totals: {
        'TOTAL FAKTUR': totalInvoice,
        'TOTAL TERBAYAR': totalPaid,
        'TOTAL PIUTANG': totalOutstanding,
      },
      formatting: {
        headerBgColor: 'FFE699',
        headerTextColor: '000000',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [15, 25, 15, 15, 15, 12, 15, 12, 12],
      },
    };
  },

  /**
   * ACCOUNTS PAYABLE - AP Report
   */
  apReport: (data: any[], totals?: any): ReportTemplate => {
    const totalOutstanding = totals?.totalOutstanding || data.reduce((sum, item) => sum + (item['Sisa Hutang'] || 0), 0);
    const totalPaid = totals?.totalPaid || data.reduce((sum, item) => sum + (item['Terbayar'] || 0), 0);
    const totalInvoice = totals?.totalInvoice || data.reduce((sum, item) => sum + (item['Total'] || 0), 0);

    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `LAPORAN HUTANG USAHA (ACCOUNTS PAYABLE)\nPer: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No. GRN', 'Supplier', 'Tanggal', 'Jatuh Tempo', 'Total', 'Terbayar', 'Sisa Hutang', 'Status', 'Umur (hari)'],
      data: data.map((item) => ({
        'No. GRN': item['No. GRN'] || '-',
        'Supplier': item['Supplier'] || '-',
        'Tanggal': item['Tanggal'] || '-',
        'Jatuh Tempo': item['Jatuh Tempo'] || '-',
        'Total': item['Total'] || 0,
        'Terbayar': item['Terbayar'] || 0,
        'Sisa Hutang': item['Sisa Hutang'] || 0,
        'Status': item['Status'] || '-',
        'Umur (hari)': item['Umur (hari)'] || 0,
      })),
      totals: {
        'TOTAL FAKTUR': totalInvoice,
        'TOTAL TERBAYAR': totalPaid,
        'TOTAL HUTANG': totalOutstanding,
      },
      formatting: {
        headerBgColor: 'F8CBAD',
        headerTextColor: '000000',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [15, 25, 15, 15, 15, 12, 15, 12, 12],
      },
    };
  },

  /**
   * MASTER DATA - Banks Report
   * Extract unique banks from AP/Payment data and COA/Settings
   */
  masterBanksReport: (invoicesData: any[], grnData: any[], paymentsData: any[], settingsData: any): ReportTemplate => {
    // Collect all banks from different sources
    const banksMap = new Map<string, { 
      bankName: string; 
      accountNumber: string; 
      source: string[]; 
      invoiceCount: number; 
      paymentCount: number;
      grnCount: number;
    }>();

    // Helper function to normalize bank name
    const normalizeBankName = (name: string): string => {
      if (!name) return '';
      return name.trim().toUpperCase();
    };

    // 1. Extract banks from invoices (customer payments)
    invoicesData.forEach(invoice => {
      const bankName = normalizeBankName(invoice.bankName || invoice.bank || '');
      const accountNumber = (invoice.bankAccount || invoice.accountNumber || '').toString().trim();
      
      if (bankName) {
        const key = bankName.toLowerCase();
        if (!banksMap.has(key)) {
          banksMap.set(key, { 
            bankName, 
            accountNumber: accountNumber || '-', 
            source: ['Invoice'],
            invoiceCount: 0,
            paymentCount: 0,
            grnCount: 0,
          });
        }
        const bank = banksMap.get(key)!;
        bank.invoiceCount += 1;
        if (!bank.source.includes('Invoice')) {
          bank.source.push('Invoice');
        }
      }
    });

    // 2. Extract banks from GRN (supplier payments)
    grnData.forEach(grn => {
      const bankName = normalizeBankName(grn.bankName || grn.bank || '');
      const accountNumber = (grn.bankAccount || grn.accountNumber || '').toString().trim();
      
      if (bankName) {
        const key = bankName.toLowerCase();
        if (!banksMap.has(key)) {
          banksMap.set(key, { 
            bankName, 
            accountNumber: accountNumber || '-', 
            source: ['GRN'],
            invoiceCount: 0,
            paymentCount: 0,
            grnCount: 0,
          });
        }
        const bank = banksMap.get(key)!;
        bank.grnCount += 1;
        if (!bank.source.includes('GRN')) {
          bank.source.push('GRN');
        }
      }
    });

    // 3. Extract banks from payments
    paymentsData.forEach(payment => {
      const bankName = normalizeBankName(payment.bankName || payment.bank || '');
      const accountNumber = (payment.bankAccount || payment.accountNumber || '').toString().trim();
      
      if (bankName) {
        const key = bankName.toLowerCase();
        if (!banksMap.has(key)) {
          banksMap.set(key, { 
            bankName, 
            accountNumber: accountNumber || '-', 
            source: ['Payment'],
            invoiceCount: 0,
            paymentCount: 0,
            grnCount: 0,
          });
        }
        const bank = banksMap.get(key)!;
        bank.paymentCount += 1;
        if (!bank.source.includes('Payment')) {
          bank.source.push('Payment');
        }
      }
    });

    // 4. Extract banks from settings/COA
    if (settingsData) {
      // Check for bank in settings
      if (settingsData.bankName) {
        const bankName = normalizeBankName(settingsData.bankName);
        const accountNumber = (settingsData.bankAccount || settingsData.accountNumber || '').toString().trim();
        
        if (bankName) {
          const key = bankName.toLowerCase();
          if (!banksMap.has(key)) {
            banksMap.set(key, { 
              bankName, 
              accountNumber: accountNumber || '-', 
              source: ['Settings'],
              invoiceCount: 0,
              paymentCount: 0,
              grnCount: 0,
            });
          } else {
            const bank = banksMap.get(key)!;
            if (!bank.source.includes('Settings')) {
              bank.source.push('Settings');
            }
          }
        }
      }

      // Check for COA banks (if stored in settings)
      if (settingsData.coaBanks && Array.isArray(settingsData.coaBanks)) {
        settingsData.coaBanks.forEach((coaBank: any) => {
          const bankName = normalizeBankName(coaBank.name || coaBank.bankName || '');
          const accountNumber = (coaBank.accountNumber || coaBank.account || '').toString().trim();
          
          if (bankName) {
            const key = bankName.toLowerCase();
            if (!banksMap.has(key)) {
              banksMap.set(key, { 
                bankName, 
                accountNumber: accountNumber || '-', 
                source: ['COA'],
                invoiceCount: 0,
                paymentCount: 0,
                grnCount: 0,
              });
            } else {
              const bank = banksMap.get(key)!;
              if (!bank.source.includes('COA')) {
                bank.source.push('COA');
              }
            }
          }
        });
      }
    }

    // Convert to array and sort by bank name
    const banksArray = Array.from(banksMap.values())
      .sort((a, b) => a.bankName.localeCompare(b.bankName));

    // Normalize data
    const normalizedData = banksArray.map(bank => ({
      namaBank: bank.bankName || '-',
      nomorRekening: bank.accountNumber,
      sumber: bank.source.join(', '),
      jumlahTransaksi: bank.invoiceCount + bank.paymentCount + bank.grnCount,
      invoiceCount: bank.invoiceCount,
      paymentCount: bank.paymentCount,
      grnCount: bank.grnCount,
    }));

    return {
      title: 'DAFTAR BANK',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['NO', 'NAMA BANK', 'NOMOR REKENING', 'SUMBER DATA', 'INVOICE', 'PAYMENT', 'GRN', 'TOTAL TRANSAKSI'],
      data: normalizedData.map((item, idx) => ({
        'NO': idx + 1,
        'NAMA BANK': item.namaBank,
        'NOMOR REKENING': item.nomorRekening,
        'SUMBER DATA': item.sumber,
        'INVOICE': item.invoiceCount,
        'PAYMENT': item.paymentCount,
        'GRN': item.grnCount,
        'TOTAL TRANSAKSI': item.jumlahTransaksi,
      })),
      totals: {
        'TOTAL BANK': normalizedData.length,
        'TOTAL TRANSAKSI': normalizedData.reduce((sum, item) => sum + item.jumlahTransaksi, 0),
      },
      formatting: {
        headerBgColor: '4472C4', // Professional blue
        headerTextColor: 'FFFFFF', // White text
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 20, 18, 20, 10, 10, 10, 15],
      },
    };
  },

  /**
   * MASTER DATA - Regions Report
   * Extract unique regions/cities from customers and suppliers
   */
  masterRegionsReport: (customersData: any[], suppliersData: any[]): ReportTemplate => {
    // Collect all regions from customers and suppliers
    const regionsMap = new Map<string, { city: string; customers: number; suppliers: number; addresses: string[] }>();

    // Process customers
    customersData.forEach(customer => {
      const city = (customer.kota || customer.city || customer.alamat || '').toString().trim();
      if (city) {
        const key = city.toLowerCase();
        if (!regionsMap.has(key)) {
          regionsMap.set(key, { city, customers: 0, suppliers: 0, addresses: [] });
        }
        const region = regionsMap.get(key)!;
        region.customers += 1;
        const address = (customer.alamat || customer.address || '').toString().trim();
        if (address && !region.addresses.includes(address)) {
          region.addresses.push(address);
        }
      }
    });

    // Process suppliers
    suppliersData.forEach(supplier => {
      const city = (supplier.kota || supplier.city || supplier.alamat || '').toString().trim();
      if (city) {
        const key = city.toLowerCase();
        if (!regionsMap.has(key)) {
          regionsMap.set(key, { city, customers: 0, suppliers: 0, addresses: [] });
        }
        const region = regionsMap.get(key)!;
        region.suppliers += 1;
        const address = (supplier.alamat || supplier.address || '').toString().trim();
        if (address && !region.addresses.includes(address)) {
          region.addresses.push(address);
        }
      }
    });

    // Convert to array and sort by city name
    const regionsArray = Array.from(regionsMap.values())
      .sort((a, b) => a.city.localeCompare(b.city));

    // Normalize data
    const normalizedData = regionsArray.map(region => ({
      wilayah: region.city || '-',
      jumlahPelanggan: region.customers,
      jumlahSupplier: region.suppliers,
      totalEntitas: region.customers + region.suppliers,
      alamat: region.addresses.slice(0, 3).join('; ') || '-', // Show first 3 addresses
    }));

    return {
      title: 'DAFTAR WILAYAH',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['NO', 'WILAYAH', 'JUMLAH PELANGGAN', 'JUMLAH SUPPLIER', 'TOTAL ENTITAS', 'ALAMAT CONTOH'],
      data: normalizedData.map((item, idx) => ({
        'NO': idx + 1,
        'WILAYAH': item.wilayah,
        'JUMLAH PELANGGAN': item.jumlahPelanggan,
        'JUMLAH SUPPLIER': item.jumlahSupplier,
        'TOTAL ENTITAS': item.totalEntitas,
        'ALAMAT CONTOH': item.alamat,
      })),
      totals: {
        'TOTAL WILAYAH': normalizedData.length,
        'TOTAL PELANGGAN': normalizedData.reduce((sum, item) => sum + item.jumlahPelanggan, 0),
        'TOTAL SUPPLIER': normalizedData.reduce((sum, item) => sum + item.jumlahSupplier, 0),
      },
      formatting: {
        headerBgColor: 'FF6B6B', // Professional red
        headerTextColor: 'FFFFFF', // White text
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 20, 18, 18, 15, 40],
      },
    };
  },

  /**
   * PACKAGING DELIVERY - Delivery Per Item Report
   */
  packagingDeliveryPerItemReport: (data: any[], startDate?: string, endDate?: string): ReportTemplate => {
    const flatData = data.flatMap(dn =>
      (dn.items || []).map((item: any) => ({
        deliveryNo: (dn.sjNo || dn.no || '').toString().trim() || '-',
        customer: (dn.customer || dn.customerName || '').toString().trim() || '-',
        created: (dn.deliveryDate || dn.created || dn.date || '').toString().split('T')[0] || '-',
        itemCode: (item.productCode || item.itemCode || item.code || '').toString().trim() || '-',
        itemName: (item.product || item.productName || item.itemName || item.name || '').toString().trim() || '-',
        qty: item.qty || 0,
        unit: (item.unit || 'PCS').toString().trim(),
      }))
    );

    const totalQty = flatData.reduce((sum, item) => sum + item.qty, 0);
    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';

    return {
      title: 'LAPORAN PENGIRIMAN PER ITEM - PACKAGING',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'NO. PENGIRIMAN', 'PELANGGAN', 'TANGGAL', 'KODE ITEM', 'NAMA ITEM', 'QTY', 'SATUAN'],
      data: flatData.map((item, idx) => ({
        'NO': idx + 1,
        'NO. PENGIRIMAN': item.deliveryNo,
        'PELANGGAN': item.customer,
        'TANGGAL': item.created,
        'KODE ITEM': item.itemCode,
        'NAMA ITEM': item.itemName,
        'QTY': item.qty,
        'SATUAN': item.unit,
      })),
      totals: {
        'TOTAL ITEM': flatData.length,
        'TOTAL QTY': totalQty,
      },
      formatting: {
        headerBgColor: '4472C4',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 15, 20, 12, 12, 20, 10, 10],
      },
    };
  },

  /**
   * PACKAGING DELIVERY - Surat Jalan Report
   */
  packagingSuratJalanReport: (data: any[], startDate?: string, endDate?: string): ReportTemplate => {
    const normalizedData = data.map(sj => ({
      suratJalanNo: (sj.sjNo || sj.suratJalanNo || sj.no || '').toString().trim() || '-',
      customer: (sj.customer || sj.customerName || '').toString().trim() || '-',
      created: (sj.deliveryDate || sj.created || sj.date || '').toString().split('T')[0] || '-',
      driver: (sj.driver || sj.driverName || '').toString().trim() || '-',
      vehicle: (sj.vehicle || sj.vehiclePlate || sj.vehicleNo || '').toString().trim() || '-',
      itemCount: (sj.items || []).length,
      totalQty: (sj.items || []).reduce((sum: number, item: any) => sum + (item.qty || 0), 0),
      status: (sj.status || 'OPEN').toString().trim(),
      notes: (sj.notes || sj.remarks || sj.specNote || '').toString().trim() || '-',
    }));

    const totalDeliveries = normalizedData.length;
    const totalItems = normalizedData.reduce((sum, item) => sum + item.itemCount, 0);
    const totalQty = normalizedData.reduce((sum, item) => sum + item.totalQty, 0);
    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';

    return {
      title: 'LAPORAN SURAT JALAN - PACKAGING',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'NO. SURAT JALAN', 'PELANGGAN', 'TANGGAL', 'PENGEMUDI', 'KENDARAAN', 'ITEM', 'QTY', 'STATUS', 'CATATAN'],
      data: normalizedData.map((item, idx) => ({
        'NO': idx + 1,
        'NO. SURAT JALAN': item.suratJalanNo,
        'PELANGGAN': item.customer,
        'TANGGAL': item.created,
        'PENGEMUDI': item.driver,
        'KENDARAAN': item.vehicle,
        'ITEM': item.itemCount,
        'QTY': item.totalQty,
        'STATUS': item.status,
        'CATATAN': item.notes,
      })),
      totals: {
        'TOTAL PENGIRIMAN': totalDeliveries,
        'TOTAL ITEM': totalItems,
        'TOTAL QTY': totalQty,
      },
      formatting: {
        headerBgColor: '4472C4',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 15, 20, 12, 15, 15, 10, 10, 10, 20],
      },
    };
  },

  /**
   * PACKAGING DELIVERY - Delivery By Customer Report
   */
  packagingDeliveryByCustomerReport: (data: any[], startDate?: string, endDate?: string): ReportTemplate => {
    // Group by customer
    const customerMap = new Map<string, any>();
    
    data.forEach(sj => {
      const customer = (sj.customer || sj.customerName || '').toString().trim() || 'Unknown';
      if (!customerMap.has(customer)) {
        customerMap.set(customer, {
          customer,
          deliveryCount: 0,
          totalItems: 0,
          totalQty: 0,
        });
      }
      
      const entry = customerMap.get(customer)!;
      entry.deliveryCount += 1;
      entry.totalItems += (sj.items || []).length;
      entry.totalQty += (sj.items || []).reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
    });

    const normalizedData = Array.from(customerMap.values())
      .sort((a, b) => b.totalQty - a.totalQty);

    const totalDeliveries = normalizedData.reduce((sum, item) => sum + item.deliveryCount, 0);
    const totalItems = normalizedData.reduce((sum, item) => sum + item.totalItems, 0);
    const totalQty = normalizedData.reduce((sum, item) => sum + item.totalQty, 0);
    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';

    return {
      title: 'LAPORAN PENGIRIMAN PER CUSTOMER - PACKAGING',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'PELANGGAN', 'JUMLAH PENGIRIMAN', 'JUMLAH ITEM', 'TOTAL QTY'],
      data: normalizedData.map((item, idx) => ({
        'NO': idx + 1,
        'PELANGGAN': item.customer,
        'JUMLAH PENGIRIMAN': item.deliveryCount,
        'JUMLAH ITEM': item.totalItems,
        'TOTAL QTY': item.totalQty,
      })),
      totals: {
        'TOTAL CUSTOMER': normalizedData.length,
        'TOTAL PENGIRIMAN': totalDeliveries,
        'TOTAL ITEM': totalItems,
        'TOTAL QTY': totalQty,
      },
      formatting: {
        headerBgColor: '4472C4',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 25, 18, 15, 12],
      },
    };
  },

  /**
   * PACKAGING DELIVERY - Delivery Trend Report
   */
  packagingDeliveryTrendReport: (data: any[], startDate?: string, endDate?: string): ReportTemplate => {
    // Group by date
    const dateMap = new Map<string, any>();
    
    data.forEach(sj => {
      const date = (sj.created || sj.date || '').toString().split('T')[0] || 'Unknown';
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          deliveryCount: 0,
          totalItems: 0,
          totalQty: 0,
          totalAmount: 0,
        });
      }
      
      const entry = dateMap.get(date)!;
      entry.deliveryCount += 1;
      entry.totalItems += (sj.items || []).length;
      entry.totalQty += (sj.items || []).reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
    });

    const normalizedData = Array.from(dateMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    const totalDeliveries = normalizedData.reduce((sum, item) => sum + item.deliveryCount, 0);
    const totalItems = normalizedData.reduce((sum, item) => sum + item.totalItems, 0);
    const totalQty = normalizedData.reduce((sum, item) => sum + item.totalQty, 0);
    const avgDeliveryPerDay = normalizedData.length > 0 ? (totalDeliveries / normalizedData.length).toFixed(2) : '0';
    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';

    return {
      title: 'LAPORAN TREND PENGIRIMAN - PACKAGING',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'TANGGAL', 'JUMLAH PENGIRIMAN', 'JUMLAH ITEM', 'TOTAL QTY'],
      data: normalizedData.map((item, idx) => ({
        'NO': idx + 1,
        'TANGGAL': item.date,
        'JUMLAH PENGIRIMAN': item.deliveryCount,
        'JUMLAH ITEM': item.totalItems,
        'TOTAL QTY': item.totalQty,
      })),
      totals: {
        'TOTAL HARI': normalizedData.length,
        'TOTAL PENGIRIMAN': totalDeliveries,
        'TOTAL ITEM': totalItems,
        'TOTAL QTY': totalQty,
        'RATA-RATA PENGIRIMAN/HARI': avgDeliveryPerDay,
      },
      formatting: {
        headerBgColor: '4472C4',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 18, 15, 12],
      },
    };
  },

  /**
   * INVENTORY - Stock Per Warehouse Report
   */
  inventoryStockPerWarehouseReport: (groupedByWarehouse: Record<string, any[]>): ReportTemplate => {
    const allData: any[] = [];
    let totalValue = 0;

    Object.entries(groupedByWarehouse).forEach(([warehouse, items]) => {
      allData.push({
        'NO': '',
        'GUDANG': warehouse,
        'KODE': '',
        'NAMA': '',
        'STOK': '',
        'HARGA BELI': '',
        'NILAI STOK': '',
      });

      items.forEach((item, idx) => {
        const value = item.stok * item.hargaBeli;
        totalValue += value;
        allData.push({
          'NO': idx + 1,
          'GUDANG': '',
          'KODE': item.kode,
          'NAMA': item.nama,
          'STOK': item.stok,
          'HARGA BELI': item.hargaBeli,
          'NILAI STOK': value,
        });
      });
    });

    return {
      title: 'LAPORAN STOK BARANG PER GUDANG',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['NO', 'GUDANG', 'KODE', 'NAMA', 'STOK', 'HARGA BELI', 'NILAI STOK'],
      data: allData,
      totals: {
        'TOTAL NILAI': totalValue,
      },
      formatting: {
        headerBgColor: 'C6E0B4',
        headerTextColor: '000000',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 20, 12, 25, 10, 15, 15],
      },
    };
  },

  /**
   * INVENTORY - Minimum Stock Report
   */
  inventoryMinStockReport: (data: any[]): ReportTemplate => {
    return {
      title: 'LAPORAN STOK MINIMUM',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['NO', 'KODE', 'NAMA', 'STOK SAAT INI', 'MIN STOCK', 'SELISIH'],
      data: data.map((item, idx) => ({
        'NO': idx + 1,
        'KODE': item.kode,
        'NAMA': item.nama,
        'STOK SAAT INI': item.stokSaatIni,
        'MIN STOCK': item.minStock,
        'SELISIH': item.selisih,
      })),
      totals: {
        'TOTAL ITEM DIBAWAH MIN': data.length,
      },
      formatting: {
        headerBgColor: 'FF6B6B',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 25, 15, 12, 12],
      },
    };
  },

  /**
   * INVENTORY - Maximum Stock Report
   */
  inventoryMaxStockReport: (data: any[]): ReportTemplate => {
    return {
      title: 'LAPORAN STOK MAKSIMUM',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['NO', 'KODE', 'NAMA', 'STOK SAAT INI', 'MAX STOCK', 'SELISIH'],
      data: data.map((item, idx) => ({
        'NO': idx + 1,
        'KODE': item.kode,
        'NAMA': item.nama,
        'STOK SAAT INI': item.stokSaatIni,
        'MAX STOCK': item.maxStock,
        'SELISIH': item.selisih,
      })),
      totals: {
        'TOTAL ITEM DIATAS MAX': data.length,
      },
      formatting: {
        headerBgColor: 'FFC000',
        headerTextColor: '000000',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 25, 15, 12, 12],
      },
    };
  },

  /**
   * INVENTORY - Total Value Report
   */
  inventoryValueTotalReport: (data: any[], totalValue: number): ReportTemplate => {
    return {
      title: 'LAPORAN NILAI PERSEDIAAN',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['NO', 'KODE', 'NAMA', 'STOK', 'HARGA BELI', 'NILAI STOK'],
      data: data.map((item, idx) => ({
        'NO': idx + 1,
        'KODE': item.kode,
        'NAMA': item.nama,
        'STOK': item.stok,
        'HARGA BELI': item.hargaBeli,
        'NILAI STOK': item.nilaiStok,
      })),
      totals: {
        'TOTAL NILAI PERSEDIAAN': totalValue,
      },
      formatting: {
        headerBgColor: 'C6E0B4',
        headerTextColor: '000000',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 25, 10, 15, 15],
      },
    };
  },

  /**
   * INVENTORY - Mutation Report
   */
  inventoryMutationReport: (data: any[], startDate?: string, endDate?: string): ReportTemplate => {
    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';
    
    return {
      title: 'LAPORAN MUTASI STOK',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'TANGGAL', 'KODE', 'NAMA', 'STOK AWAL', 'MASUK', 'KELUAR', 'STOK AKHIR'],
      data: data.map((item, idx) => ({
        'NO': idx + 1,
        'TANGGAL': item.tanggal,
        'KODE': item.kode,
        'NAMA': item.nama,
        'STOK AWAL': item.stokAwal,
        'MASUK': item.masuk,
        'KELUAR': item.keluar,
        'STOK AKHIR': item.stokAkhir,
      })),
      totals: {
        'TOTAL TRANSAKSI': data.length,
      },
      formatting: {
        headerBgColor: '4472C4',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 12, 25, 12, 10, 10, 12],
      },
    };
  },

  /**
   * INVENTORY - ABC Analysis Report
   */
  inventoryABCAnalysisReport: (data: any[], totalValue: number): ReportTemplate => {
    const categoryA = data.filter(item => item.kategori === 'A').length;
    const categoryB = data.filter(item => item.kategori === 'B').length;
    const categoryC = data.filter(item => item.kategori === 'C').length;

    return {
      title: 'LAPORAN ANALISA ABC INVENTORY',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['NO', 'KATEGORI', 'KODE', 'NAMA', 'STOK', 'HARGA BELI', 'NILAI STOK', 'PERSENTASE'],
      data: data.map((item, idx) => ({
        'NO': idx + 1,
        'KATEGORI': item.kategori,
        'KODE': item.kode,
        'NAMA': item.nama,
        'STOK': item.stok,
        'HARGA BELI': item.hargaBeli,
        'NILAI STOK': item.nilaiStok,
        'PERSENTASE': `${item.persentase}%`,
      })),
      totals: {
        'TOTAL NILAI': totalValue,
        'KATEGORI A': categoryA,
        'KATEGORI B': categoryB,
        'KATEGORI C': categoryC,
      },
      formatting: {
        headerBgColor: '70AD47',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 12, 25, 10, 15, 15, 12],
      },
    };
  },

  inventoryFastMovingReport(data: any[]): any {
    return {
      title: 'LAPORAN BARANG FAST MOVING',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No', 'Kode', 'Nama Item', 'Stok', 'Keluar', 'Harga', 'Nilai Keluar'],
      data: data.map((item, idx) => ({
        'No': idx + 1,
        'Kode': item.kode,
        'Nama Item': item.nama,
        'Stok': item.stok,
        'Keluar': item.outgoing,
        'Harga': item.harga,
        'Nilai Keluar': item.nilaiKeluar,
      })),
      formatting: {
        headerBgColor: 'FF6B6B',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 25, 10, 10, 12, 15],
      },
    };
  },

  inventorySlowMovingReport(data: any[]): any {
    return {
      title: 'LAPORAN BARANG SLOW MOVING',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No', 'Kode', 'Nama Item', 'Stok', 'Keluar', 'Harga', 'Nilai Stok'],
      data: data.map((item, idx) => ({
        'No': idx + 1,
        'Kode': item.kode,
        'Nama Item': item.nama,
        'Stok': item.stok,
        'Keluar': item.outgoing,
        'Harga': item.harga,
        'Nilai Stok': item.nilaiStok,
      })),
      formatting: {
        headerBgColor: 'FFA500',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 25, 10, 10, 12, 15],
      },
    };
  },

  inventoryBySellingPriceReport(data: any[]): any {
    return {
      title: 'LAPORAN STOK BERDASARKAN HARGA JUAL',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No', 'Kode', 'Nama Item', 'Stok', 'Harga Jual', 'Nilai Jual'],
      data: data.map((item, idx) => ({
        'No': idx + 1,
        'Kode': item.kode,
        'Nama Item': item.nama,
        'Stok': item.stok,
        'Harga Jual': item.hargaJual,
        'Nilai Jual': item.nilaiJual,
      })),
      formatting: {
        headerBgColor: '4472C4',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 25, 10, 15, 15],
      },
    };
  },

  inventoryStockCardReport(data: any[]): any {
    return {
      title: 'LAPORAN KARTU STOK',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No', 'Kode', 'Nama Item', 'Satuan', 'Stok Awal', 'Masuk', 'Keluar', 'Stok Akhir', 'Harga', 'Nilai Awal', 'Nilai Masuk', 'Nilai Keluar', 'Nilai Akhir'],
      data: data.map((item, idx) => ({
        'No': idx + 1,
        'Kode': item.kode,
        'Nama Item': item.nama,
        'Satuan': item.satuan,
        'Stok Awal': item.stokAwal,
        'Masuk': item.masuk,
        'Keluar': item.keluar,
        'Stok Akhir': item.stokAkhir,
        'Harga': item.harga,
        'Nilai Awal': item.nilaiAwal,
        'Nilai Masuk': item.nilaiMasuk,
        'Nilai Keluar': item.nilaiKeluar,
        'Nilai Akhir': item.nilaiAkhir,
      })),
      formatting: {
        headerBgColor: '70AD47',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 25, 8, 10, 10, 10, 10, 12, 12, 12, 12, 12],
      },
    };
  },

  inventoryStockCardPerItemReport(data: any[]): any {
    return {
      title: 'LAPORAN KARTU STOK PER ITEM',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No', 'Kode', 'Nama Item', 'Satuan', 'Stock P1', 'Stock P2', 'Stok Awal', 'Masuk', 'Keluar', 'Stok Akhir', 'Harga'],
      data: data.map((item, idx) => ({
        'No': idx + 1,
        'Kode': item.kode,
        'Nama Item': item.nama,
        'Satuan': item.satuan,
        'Stock P1': item.stockP1,
        'Stock P2': item.stockP2,
        'Stok Awal': item.stockAwal,
        'Masuk': item.masuk,
        'Keluar': item.keluar,
        'Stok Akhir': item.stokAkhir,
        'Harga': item.harga,
      })),
      formatting: {
        headerBgColor: '70AD47',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 25, 8, 10, 10, 10, 10, 10, 10, 12],
      },
    };
  },

  inventoryStockPerWarehouseDetailedReport(groupedByWarehouse: Record<string, any[]>): any {
    const allData: any[] = [];
    let warehouseIndex = 0;

    for (const [warehouse, items] of Object.entries(groupedByWarehouse)) {
      allData.push({
        'No': '',
        'Gudang': warehouse,
        'Kode': '',
        'Nama Item': '',
        'Satuan': '',
        'Stock P1': '',
        'Stock P2': '',
        'Stok Akhir': '',
        'Harga': '',
        'Nilai Stok': '',
      });

      items.forEach((item, idx) => {
        allData.push({
          'No': idx + 1,
          'Gudang': '',
          'Kode': item.kode,
          'Nama Item': item.nama,
          'Satuan': item.satuan,
          'Stock P1': item.stockP1,
          'Stock P2': item.stockP2,
          'Stok Akhir': item.stokAkhir,
          'Harga': item.harga,
          'Nilai Stok': item.nilaiStok,
        });
      });

      warehouseIndex++;
    }

    return {
      title: 'LAPORAN STOK BARANG PER GUDANG',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No', 'Gudang', 'Kode', 'Nama Item', 'Satuan', 'Stock P1', 'Stock P2', 'Stok Akhir', 'Harga', 'Nilai Stok'],
      data: allData,
      formatting: {
        headerBgColor: '70AD47',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 15, 12, 25, 8, 10, 10, 10, 12, 15],
      },
    };
  },

  inventoryStockChartPerWarehouseReport(data: any[]): any {
    return {
      title: 'LAPORAN GRAFIK STOK PER GUDANG',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No', 'Gudang', 'Total Items', 'Total Stok', 'Total Nilai'],
      data: data.map((item, idx) => ({
        'No': idx + 1,
        'Gudang': item.warehouse,
        'Total Items': item.totalItems,
        'Total Stok': item.totalStok,
        'Total Nilai': item.totalNilai,
      })),
      formatting: {
        headerBgColor: '4472C4',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 20, 15, 15, 15],
      },
    };
  },

  /**
   * ACCOUNTING - Balance Sheet (Neraca) Report
   * Display assets, liabilities, and equity with their balances
   */
  balanceSheetReport(data: any[]): ReportTemplate {
    // Group accounts by type
    const assetAccounts = data.filter((a: any) => a.type === 'ASSET');
    const liabilityAccounts = data.filter((a: any) => a.type === 'LIABILITY');
    const equityAccounts = data.filter((a: any) => a.type === 'EQUITY');

    // Calculate totals
    const totalAssets = assetAccounts.reduce((sum: number, a: any) => sum + a.balance, 0);
    const totalLiabilities = liabilityAccounts.reduce((sum: number, a: any) => sum + a.balance, 0);
    const totalEquity = equityAccounts.reduce((sum: number, a: any) => sum + a.balance, 0);
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

    // Build report data with sections
    const reportData: any[] = [];

    // ASSETS Section
    reportData.push({
      'Kode': 'AKTIVA',
      'Nama Akun': 'AKTIVA (ASSETS)',
      'Debit': '',
      'Kredit': '',
      'Saldo': '',
      '_isHeader': true,
    });

    assetAccounts.forEach((account: any) => {
      reportData.push({
        'Kode': account.code,
        'Nama Akun': account.name,
        'Debit': account.debit,
        'Kredit': account.credit,
        'Saldo': account.balance,
      });
    });

    reportData.push({
      'Kode': '',
      'Nama Akun': 'TOTAL AKTIVA',
      'Debit': '',
      'Kredit': '',
      'Saldo': totalAssets,
      '_isTotal': true,
    });

    reportData.push({
      'Kode': '',
      'Nama Akun': '',
      'Debit': '',
      'Kredit': '',
      'Saldo': '',
      '_isBlank': true,
    });

    // LIABILITIES Section
    reportData.push({
      'Kode': 'KEWAJIBAN',
      'Nama Akun': 'KEWAJIBAN (LIABILITIES)',
      'Debit': '',
      'Kredit': '',
      'Saldo': '',
      '_isHeader': true,
    });

    liabilityAccounts.forEach((account: any) => {
      reportData.push({
        'Kode': account.code,
        'Nama Akun': account.name,
        'Debit': account.debit,
        'Kredit': account.credit,
        'Saldo': account.balance,
      });
    });

    reportData.push({
      'Kode': '',
      'Nama Akun': 'TOTAL KEWAJIBAN',
      'Debit': '',
      'Kredit': '',
      'Saldo': totalLiabilities,
      '_isTotal': true,
    });

    reportData.push({
      'Kode': '',
      'Nama Akun': '',
      'Debit': '',
      'Kredit': '',
      'Saldo': '',
      '_isBlank': true,
    });

    // EQUITY Section
    reportData.push({
      'Kode': 'MODAL',
      'Nama Akun': 'MODAL (EQUITY)',
      'Debit': '',
      'Kredit': '',
      'Saldo': '',
      '_isHeader': true,
    });

    equityAccounts.forEach((account: any) => {
      reportData.push({
        'Kode': account.code,
        'Nama Akun': account.name,
        'Debit': account.debit,
        'Kredit': account.credit,
        'Saldo': account.balance,
      });
    });

    reportData.push({
      'Kode': '',
      'Nama Akun': 'TOTAL MODAL',
      'Debit': '',
      'Kredit': '',
      'Saldo': totalEquity,
      '_isTotal': true,
    });

    reportData.push({
      'Kode': '',
      'Nama Akun': '',
      'Debit': '',
      'Kredit': '',
      'Saldo': '',
      '_isBlank': true,
    });

    // GRAND TOTAL
    reportData.push({
      'Kode': '',
      'Nama Akun': 'TOTAL KEWAJIBAN + MODAL',
      'Debit': '',
      'Kredit': '',
      'Saldo': totalLiabilitiesAndEquity,
      '_isGrandTotal': true,
    });

    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `NERACA (BALANCE SHEET)\nPer: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['Kode', 'Nama Akun', 'Debit', 'Kredit', 'Saldo'],
      data: reportData,
      totals: {
        'TOTAL AKTIVA': totalAssets,
        'TOTAL KEWAJIBAN': totalLiabilities,
        'TOTAL MODAL': totalEquity,
        'TOTAL KEWAJIBAN + MODAL': totalLiabilitiesAndEquity,
      },
      formatting: {
        headerBgColor: '1F4E78',
        headerTextColor: 'FFFFFF',
        alternateRowColor: false,
        freezePane: true,
        columnWidths: [10, 30, 15, 15, 15],
      },
    };
  },

  /**
   * ACCOUNTING - Income Statement (Laba Rugi) Report Template
   * Display revenue, expenses, and net profit
   */
  incomeStatementReport(data: any[]): ReportTemplate {
    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `LAPORAN LABA RUGI (INCOME STATEMENT)\nPeriode: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['Keterangan', 'Jumlah'],
      data: data,
      totals: {
        'TOTAL PENDAPATAN': data.find((d: any) => d._isTotal && d.Keterangan === 'TOTAL PENDAPATAN')?.Jumlah || 0,
        'TOTAL BEBAN': data.find((d: any) => d._isTotal && d.Keterangan === 'TOTAL BEBAN')?.Jumlah || 0,
        'LABA BERSIH': data.find((d: any) => d._isGrandTotal)?.Jumlah || 0,
      },
      formatting: {
        headerBgColor: '1F4E78',
        headerTextColor: 'FFFFFF',
        alternateRowColor: false,
        freezePane: true,
        columnWidths: [40, 20],
      },
    };
  },

  /**
   * ACCOUNTING - Equity Changes (Perubahan Modal) Report Template
   * Display opening balance, changes, and closing balance
   */
  equityChangesReport(data: any[]): ReportTemplate {
    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `LAPORAN PERUBAHAN MODAL (EQUITY CHANGES)\nPeriode: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['Keterangan', 'Jumlah'],
      data: data,
      totals: {
        'MODAL AWAL': data.find((d: any) => d.Keterangan === 'Saldo Awal Periode')?.Jumlah || 0,
        'PERUBAHAN MODAL': data.find((d: any) => d.Keterangan === 'Laba/Rugi Periode')?.Jumlah || 0,
        'MODAL AKHIR': data.find((d: any) => d._isGrandTotal)?.Jumlah || 0,
      },
      formatting: {
        headerBgColor: '1F4E78',
        headerTextColor: 'FFFFFF',
        alternateRowColor: false,
        freezePane: true,
        columnWidths: [40, 20],
      },
    };
  },

  /**
   * ACCOUNTING - Cash Flow (Arus Kas) Report Template
   * Display cash inflows, outflows, and net cash flow
   */
  cashFlowReport(data: any[]): ReportTemplate {
    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `LAPORAN ARUS KAS (CASH FLOW)\nPeriode: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['Keterangan', 'Jumlah'],
      data: data,
      totals: {
        'TOTAL ARUS KAS MASUK': data.find((d: any) => d._isTotal && d.Keterangan === 'TOTAL ARUS KAS MASUK')?.Jumlah || 0,
        'TOTAL ARUS KAS KELUAR': data.find((d: any) => d._isTotal && d.Keterangan === 'TOTAL ARUS KAS KELUAR')?.Jumlah || 0,
        'ARUS KAS BERSIH': data.find((d: any) => d._isGrandTotal)?.Jumlah || 0,
      },
      formatting: {
        headerBgColor: '1F4E78',
        headerTextColor: 'FFFFFF',
        alternateRowColor: false,
        freezePane: true,
        columnWidths: [40, 20],
      },
    };
  },

  /**
   * ACCOUNTS RECEIVABLE - AR Per Customer Report Template
   */
  arPerCustomerReport(data: any[]): ReportTemplate {
    const reportData = data.map((ar: any) => ({
      'Pelanggan': ar.customerName,
      'Total Invoice': ar.totalInvoices,
      'Total Piutang': ar.totalAmount,
      'Terbayar': ar.totalPaid,
      'Sisa Piutang': ar.totalOutstanding,
      'Overdue': ar.overdueAmount,
      'Status': ar.totalOutstanding > 0 ? 'OUTSTANDING' : 'LUNAS',
    }));

    const totalAmount = data.reduce((sum: number, ar: any) => sum + ar.totalAmount, 0);
    const totalPaid = data.reduce((sum: number, ar: any) => sum + ar.totalPaid, 0);
    const totalOutstanding = data.reduce((sum: number, ar: any) => sum + ar.totalOutstanding, 0);

    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `LAPORAN PIUTANG PER PELANGGAN (AR)\nPeriode: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['Pelanggan', 'Total Invoice', 'Total Piutang', 'Terbayar', 'Sisa Piutang', 'Overdue', 'Status'],
      data: reportData,
      totals: {
        'TOTAL PIUTANG': totalAmount,
        'TOTAL TERBAYAR': totalPaid,
        'TOTAL SISA PIUTANG': totalOutstanding,
      },
      formatting: {
        headerBgColor: '1F4E78',
        headerTextColor: 'FFFFFF',
        alternateRowColor: false,
        freezePane: true,
        columnWidths: [25, 12, 15, 15, 15, 15, 12],
      },
    };
  },

  /**
   * ACCOUNTS PAYABLE - AP Per Supplier Report Template
   */
  apPerSupplierReport(data: any[]): ReportTemplate {
    const reportData = data.map((ap: any) => ({
      'Supplier': ap.supplierName,
      'Total GRN': ap.totalGRN,
      'Total Hutang': ap.totalAmount,
      'Terbayar': ap.totalPaid,
      'Sisa Hutang': ap.totalOutstanding,
      'Overdue': ap.overdueAmount,
      'Status': ap.totalOutstanding > 0 ? 'OUTSTANDING' : 'LUNAS',
    }));

    const totalAmount = data.reduce((sum: number, ap: any) => sum + ap.totalAmount, 0);
    const totalPaid = data.reduce((sum: number, ap: any) => sum + ap.totalPaid, 0);
    const totalOutstanding = data.reduce((sum: number, ap: any) => sum + ap.totalOutstanding, 0);

    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `LAPORAN HUTANG PER SUPPLIER (AP)\nPeriode: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['Supplier', 'Total GRN', 'Total Hutang', 'Terbayar', 'Sisa Hutang', 'Overdue', 'Status'],
      data: reportData,
      totals: {
        'TOTAL HUTANG': totalAmount,
        'TOTAL TERBAYAR': totalPaid,
        'TOTAL SISA HUTANG': totalOutstanding,
      },
      formatting: {
        headerBgColor: '1F4E78',
        headerTextColor: 'FFFFFF',
        alternateRowColor: false,
        freezePane: true,
        columnWidths: [25, 12, 15, 15, 15, 15, 12],
      },
    };
  },

  /**
   * General Ledger Report Template
   */
  generalLedgerReport(journalData: any[], startDate: string, endDate: string) {
    const headers = ['Tanggal', 'No. Akun', 'Nama Akun', 'Debit', 'Kredit', 'Saldo'];
    let totalDebit = 0;
    let totalCredit = 0;
    const data = journalData.map(j => {
      const debit = j.debit || 0;
      const credit = j.credit || 0;
      totalDebit += debit;
      totalCredit += credit;
      return [
        j.date || j.created || '',
        j.accountCode || '',
        j.accountName || '',
        debit,
        credit,
        debit - credit,
      ];
    });

    return {
      title: `Buku Besar (General Ledger) - ${startDate} s/d ${endDate}`,
      headers,
      data,
      totals: {
        'TOTAL DEBIT': totalDebit,
        'TOTAL KREDIT': totalCredit,
      },
      formatting: {
        headerBgColor: '1F4E78',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [15, 12, 25, 15, 15, 15],
      },
    };
  },

  /**
   * General Journal Report Template
   */
  generalJournalReport(journalData: any[], startDate: string, endDate: string) {
    const headers = ['Tanggal', 'No. Jurnal', 'Keterangan', 'No. Akun', 'Nama Akun', 'Debit', 'Kredit'];
    let totalDebit = 0;
    let totalCredit = 0;
    const data = journalData.map(j => {
      const debit = j.debit || 0;
      const credit = j.credit || 0;
      totalDebit += debit;
      totalCredit += credit;
      return [
        j.date || j.created || '',
        j.journalNo || '',
        j.description || '',
        j.accountCode || '',
        j.accountName || '',
        debit,
        credit,
      ];
    });

    return {
      title: `Jurnal Umum (General Journal) - ${startDate} s/d ${endDate}`,
      headers,
      data,
      totals: {
        'TOTAL DEBIT': totalDebit,
        'TOTAL KREDIT': totalCredit,
      },
      formatting: {
        headerBgColor: '1F4E78',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [15, 12, 25, 12, 25, 15, 15],
      },
    };
  },

  /**
   * Sales Journal Report Template
   */
  salesJournalReport(invoiceData: any[], startDate: string, endDate: string) {
    const headers = ['Tanggal', 'No. Faktur', 'Pelanggan', 'Debit Piutang', 'Kredit Penjualan', 'Pajak'];
    let totalDebit = 0;
    let totalCredit = 0;
    let totalTax = 0;
    const data = invoiceData.map(inv => {
      const amount = inv.grandTotal || inv.total || inv.amount || 0;
      const tax = inv.tax || inv.pajak || 0;
      totalDebit += amount;
      totalCredit += amount;
      totalTax += tax;
      return [
        inv.created || inv.date || inv.tanggal || '',
        inv.invoiceNo || inv.noFaktur || inv.soNo || '',
        inv.customer || inv.pelanggan || inv.customerName || '',
        amount,
        amount,
        tax,
      ];
    });

    return {
      title: `Jurnal Penjualan (Sales Journal) - ${startDate} s/d ${endDate}`,
      headers,
      data,
      totals: {
        'TOTAL DEBIT': totalDebit,
        'TOTAL KREDIT': totalCredit,
        'TOTAL PAJAK': totalTax,
      },
      formatting: {
        headerBgColor: '1F4E78',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [15, 15, 25, 15, 15, 15],
      },
    };
  },

  /**
   * Purchase Journal Report Template
   */
  purchaseJournalReport(grnData: any[], startDate: string, endDate: string) {
    const headers = ['Tanggal', 'No. GRN', 'Supplier', 'Debit Pembelian', 'Kredit Hutang', 'Pajak'];
    let totalDebit = 0;
    let totalCredit = 0;
    let totalTax = 0;
    const data = grnData.map(grn => {
      const amount = grn.totalAmount || grn.total || grn.amount || 0;
      const tax = grn.tax || grn.pajak || 0;
      totalDebit += amount;
      totalCredit += amount;
      totalTax += tax;
      return [
        grn.created || grn.date || grn.tanggal || '',
        grn.grnNo || grn.noGrn || grn.poNo || '',
        grn.supplier || grn.supplierName || '',
        amount,
        amount,
        tax,
      ];
    });

    return {
      title: `Jurnal Pembelian (Purchase Journal) - ${startDate} s/d ${endDate}`,
      headers,
      data,
      totals: {
        'TOTAL DEBIT': totalDebit,
        'TOTAL KREDIT': totalCredit,
        'TOTAL PAJAK': totalTax,
      },
      formatting: {
        headerBgColor: '1F4E78',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [15, 15, 25, 15, 15, 15],
      },
    };
  },

  /**
   * Cash In Journal Report Template
   */
  cashInJournalReport(paymentData: any[], startDate: string, endDate: string) {
    const headers = ['Tanggal', 'No. Bukti', 'Keterangan', 'Debit Kas', 'Kredit Piutang'];
    let totalDebit = 0;
    let totalCredit = 0;
    const data = paymentData.map(p => {
      const amount = p.amount || 0;
      totalDebit += amount;
      totalCredit += amount;
      return [
        p.date || p.created || '',
        p.referenceNo || '',
        p.description || '',
        amount,
        amount,
      ];
    });

    return {
      title: `Jurnal Kas Masuk (Cash In Journal) - ${startDate} s/d ${endDate}`,
      headers,
      data,
      totals: {
        'TOTAL DEBIT': totalDebit,
        'TOTAL KREDIT': totalCredit,
      },
      formatting: {
        headerBgColor: '1F4E78',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [15, 15, 25, 15, 15],
      },
    };
  },

  /**
   * Cash Out Journal Report Template
   */
  cashOutJournalReport(paymentData: any[], startDate: string, endDate: string) {
    const headers = ['Tanggal', 'No. Bukti', 'Keterangan', 'Debit Hutang', 'Kredit Kas'];
    let totalDebit = 0;
    let totalCredit = 0;
    const data = paymentData.map(p => {
      const amount = p.amount || 0;
      totalDebit += amount;
      totalCredit += amount;
      return [
        p.date || p.created || '',
        p.referenceNo || '',
        p.description || '',
        amount,
        amount,
      ];
    });

    return {
      title: `Jurnal Kas Keluar (Cash Out Journal) - ${startDate} s/d ${endDate}`,
      headers,
      data,
      totals: {
        'TOTAL DEBIT': totalDebit,
        'TOTAL KREDIT': totalCredit,
      },
      formatting: {
        headerBgColor: '1F4E78',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [15, 15, 25, 15, 15],
      },
    };
  },

  /**
   * Memorial Journal Report Template
   */
  memorialJournalReport(journalData: any[], startDate: string, endDate: string) {
    const headers = ['Tanggal', 'No. Jurnal', 'Keterangan', 'No. Akun', 'Nama Akun', 'Debit', 'Kredit'];
    let totalDebit = 0;
    let totalCredit = 0;
    const data = journalData.map(j => {
      const debit = j.debit || 0;
      const credit = j.credit || 0;
      totalDebit += debit;
      totalCredit += credit;
      return [
        j.date || j.created || '',
        j.journalNo || '',
        j.description || '',
        j.accountCode || '',
        j.accountName || '',
        debit,
        credit,
      ];
    });

    return {
      title: `Jurnal Memorial - ${startDate} s/d ${endDate}`,
      headers,
      data,
      totals: {
        'TOTAL DEBIT': totalDebit,
        'TOTAL KREDIT': totalCredit,
      },
      formatting: {
        headerBgColor: '1F4E78',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [15, 12, 25, 12, 25, 15, 15],
      },
    };
  },

  /**
   * Trial Balance Report Template
   */
  trialBalanceReport(journalData: any[], accountsData: any[], startDate: string, endDate: string) {
    // Calculate account balances
    const accountBalances = new Map<string, { debit: number; credit: number; name: string }>();
    
    journalData.forEach(j => {
      const code = j.accountCode || '';
      const name = j.accountName || '';
      if (!accountBalances.has(code)) {
        accountBalances.set(code, { debit: 0, credit: 0, name });
      }
      const balance = accountBalances.get(code)!;
      balance.debit += Number(j.debit || 0);
      balance.credit += Number(j.credit || 0);
    });

    const headers = ['No. Akun', 'Nama Akun', 'Debit', 'Kredit'];
    const data = Array.from(accountBalances.entries()).map(([code, balance]) => [
      code,
      balance.name,
      balance.debit,
      balance.credit,
    ]);

    const totalDebit = data.reduce((sum, row) => sum + (Number(row[2]) || 0), 0);
    const totalCredit = data.reduce((sum, row) => sum + (Number(row[3]) || 0), 0);

    return {
      title: `Neraca Saldo (Trial Balance) - ${startDate} s/d ${endDate}`,
      headers,
      data,
      totals: {
        'TOTAL DEBIT': totalDebit,
        'TOTAL KREDIT': totalCredit,
      },
      formatting: {
        headerBgColor: '1F4E78',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [12, 30, 15, 15],
      },
    };
  },

  /**
   * Bank Statement Report Template
   */
  bankStatementReport(bankTransactionData: any[], startDate: string, endDate: string) {
    const headers = ['Tanggal', 'No. Referensi', 'Keterangan', 'Debit', 'Kredit', 'Saldo'];
    let runningBalance = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    const data = bankTransactionData.map(bt => {
      const debit = bt.type === 'in' ? (bt.amount || 0) : 0;
      const credit = bt.type === 'out' ? (bt.amount || 0) : 0;
      totalDebit += debit;
      totalCredit += credit;
      runningBalance += debit - credit;
      return [
        bt.date || bt.created || '',
        bt.referenceNo || '',
        bt.description || '',
        debit,
        credit,
        runningBalance,
      ];
    });

    return {
      title: `Rekening Koran (Bank Statement) - ${startDate} s/d ${endDate}`,
      headers,
      data,
      totals: {
        'TOTAL DEBIT': totalDebit,
        'TOTAL KREDIT': totalCredit,
      },
      formatting: {
        headerBgColor: '1F4E78',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [15, 15, 25, 15, 15, 15],
      },
    };
  },

  /**
   * Chart of Account Report Template
   */
  chartOfAccountReport(coaData: any[]) {
    const headers = ['No. Akun', 'Nama Akun', 'Tipe Akun', 'Kategori', 'Status'];
    const data = coaData.map(coa => [
      coa.accountCode || coa.code || '',
      coa.accountName || coa.name || '',
      coa.accountType || coa.type || '',
      coa.category || '',
      coa.status || 'Active',
    ]);

    return {
      title: 'Daftar Akun (Chart of Account)',
      headers,
      data,
      totals: {
        'TOTAL AKUN': coaData.length,
      },
      formatting: {
        headerBgColor: '1F4E78',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [12, 30, 15, 15, 12],
      },
    };
  },



  arPerInvoiceReport: (data: any[]): ReportTemplate => ({
    title: 'Piutang Per Faktur',
    headers: ['No. Faktur', 'Pelanggan', 'Tanggal', 'Total', 'Terbayar', 'Sisa'],
    data: data.map(d => ({ ...d })),
  }),

  arAgingReport: (data: any[]): ReportTemplate => ({
    title: 'Aging Piutang',
    headers: ['No. Faktur', 'Pelanggan', 'Tanggal', 'Jatuh Tempo', 'Umur (hari)', 'Sisa'],
    data: data.map(d => ({ ...d })),
  }),

  arPaymentReport: (data: any[]): ReportTemplate => ({
    title: 'Pembayaran Piutang',
    headers: ['Tanggal', 'No. Referensi', 'Pelanggan', 'Jumlah', 'Metode'],
    data: data.map(d => ({ ...d })),
  }),

  arOutstandingReport: (data: any[]): ReportTemplate => ({
    title: 'Sisa Piutang',
    headers: ['No. Faktur', 'Pelanggan', 'Tanggal', 'Total', 'Terbayar', 'Sisa'],
    data: data.filter((d: any) => (d.amount || 0) - (d.paid || 0) > 0).map(d => ({ ...d })),
  }),

  arDueReport: (data: any[]): ReportTemplate => ({
    title: 'Piutang Jatuh Tempo',
    headers: ['No. Faktur', 'Pelanggan', 'Jatuh Tempo', 'Sisa', 'Status'],
    data: data.map(d => ({ ...d })),
  }),

  arOverdueReport: (data: any[]): ReportTemplate => ({
    title: 'Piutang Overdue',
    headers: ['No. Faktur', 'Pelanggan', 'Jatuh Tempo', 'Umur (hari)', 'Sisa'],
    data: data.filter((d: any) => new Date(d.dueDate || d.date) < new Date()).map(d => ({ ...d })),
  }),

  arCardReport: (data: any[]): ReportTemplate => ({
    title: 'Kartu Piutang',
    headers: ['No. Faktur', 'Pelanggan', 'Tanggal', 'Debit', 'Kredit', 'Saldo'],
    data: data.map(d => ({ ...d })),
  }),

  arAnalysisReport: (data: any[]): ReportTemplate => ({
    title: 'Analisa Piutang',
    headers: ['Pelanggan', 'Total Piutang', 'Terbayar', 'Sisa', 'Persentase'],
    data: data.map(d => ({ ...d })),
  }),

  // AP TEMPLATE METHODS
  apPerInvoiceReport: (data: any[]): ReportTemplate => {
    const reportData = data.map((ap: any) => ({
      'No. PO': ap.poNo || 'N/A',
      'Supplier': ap.supplierName || 'Unknown',
      'Tanggal PO': ap.poDate ? new Date(ap.poDate).toLocaleDateString('id-ID') : 'N/A',
      'Jatuh Tempo': ap.dueDate ? new Date(ap.dueDate).toLocaleDateString('id-ID') : 'N/A',
      'Total Hutang': ap.totalAmount || 0,
      'Terbayar': ap.totalPaid || 0,
      'Sisa Hutang': ap.totalOutstanding || 0,
      'Status': ap.status || 'OUTSTANDING',
    }));

    const totalAmount = data.reduce((sum: number, ap: any) => sum + (ap.totalAmount || 0), 0);
    const totalPaid = data.reduce((sum: number, ap: any) => sum + (ap.totalPaid || 0), 0);
    const totalOutstanding = data.reduce((sum: number, ap: any) => sum + (ap.totalOutstanding || 0), 0);

    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `LAPORAN HUTANG PER FAKTUR\nPeriode: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No. PO', 'Supplier', 'Tanggal PO', 'Jatuh Tempo', 'Total Hutang', 'Terbayar', 'Sisa Hutang', 'Status'],
      data: reportData,
      totals: {
        'TOTAL HUTANG': totalAmount,
        'TOTAL TERBAYAR': totalPaid,
        'TOTAL SISA HUTANG': totalOutstanding,
      },
    };
  },

  apAgingReport: (data: any[]): ReportTemplate => {
    const reportData = data.map((ap: any) => ({
      'No. PO': ap.poNo || 'N/A',
      'Supplier': ap.supplierName || 'Unknown',
      'Tanggal PO': ap.poDate ? new Date(ap.poDate).toLocaleDateString('id-ID') : 'N/A',
      'Jatuh Tempo': ap.dueDate ? new Date(ap.dueDate).toLocaleDateString('id-ID') : 'N/A',
      'Umur (hari)': ap.daysOverdue || 0,
      'Aging Bucket': ap.agingBucket || 'Current',
      'Total Hutang': ap.totalAmount || 0,
      'Terbayar': ap.totalPaid || 0,
      'Sisa Hutang': ap.outstanding || 0,
    }));

    const totalAmount = data.reduce((sum: number, ap: any) => sum + (ap.totalAmount || 0), 0);
    const totalPaid = data.reduce((sum: number, ap: any) => sum + (ap.totalPaid || 0), 0);
    const totalOutstanding = data.reduce((sum: number, ap: any) => sum + (ap.outstanding || 0), 0);

    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `LAPORAN AGING HUTANG (UMUR HUTANG)\nPeriode: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No. PO', 'Supplier', 'Tanggal PO', 'Jatuh Tempo', 'Umur (hari)', 'Aging Bucket', 'Total Hutang', 'Terbayar', 'Sisa Hutang'],
      data: reportData,
      totals: {
        'TOTAL HUTANG': totalAmount,
        'TOTAL TERBAYAR': totalPaid,
        'TOTAL SISA HUTANG': totalOutstanding,
      },
    };
  },

  apPaymentReport: (data: any[]): ReportTemplate => {
    const reportData = data.map((pmt: any) => ({
      'No. Pembayaran': pmt.paymentNo || 'N/A',
      'No. PO': pmt.poNo || 'N/A',
      'Supplier': pmt.supplierName || 'Unknown',
      'Tanggal Pembayaran': pmt.paymentDate ? new Date(pmt.paymentDate).toLocaleDateString('id-ID') : 'N/A',
      'Metode Pembayaran': pmt.paymentMethod || 'Bank Transfer',
      'Jumlah Pembayaran': pmt.paymentAmount || 0,
      'Referensi': pmt.reference || '',
      'Catatan': pmt.notes || '',
    }));

    const totalPayment = data.reduce((sum: number, pmt: any) => sum + (pmt.paymentAmount || 0), 0);

    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `LAPORAN PEMBAYARAN HUTANG\nPeriode: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No. Pembayaran', 'No. PO', 'Supplier', 'Tanggal Pembayaran', 'Metode Pembayaran', 'Jumlah Pembayaran', 'Referensi', 'Catatan'],
      data: reportData,
      totals: {
        'TOTAL PEMBAYARAN': totalPayment,
      },
    };
  },

  apOutstandingReport: (data: any[]): ReportTemplate => {
    const reportData = data.map((ap: any) => ({
      'No. PO': ap.poNo || 'N/A',
      'Supplier': ap.supplierName || 'Unknown',
      'Tanggal PO': ap.poDate ? new Date(ap.poDate).toLocaleDateString('id-ID') : 'N/A',
      'Jatuh Tempo': ap.dueDate ? new Date(ap.dueDate).toLocaleDateString('id-ID') : 'N/A',
      'Total Hutang': ap.totalAmount || 0,
      'Terbayar': ap.totalPaid || 0,
      'Sisa Hutang': ap.outstanding || 0,
    }));

    const totalAmount = data.reduce((sum: number, ap: any) => sum + (ap.totalAmount || 0), 0);
    const totalPaid = data.reduce((sum: number, ap: any) => sum + (ap.totalPaid || 0), 0);
    const totalOutstanding = data.reduce((sum: number, ap: any) => sum + (ap.outstanding || 0), 0);

    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `LAPORAN SISA HUTANG\nPeriode: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No. PO', 'Supplier', 'Tanggal PO', 'Jatuh Tempo', 'Total Hutang', 'Terbayar', 'Sisa Hutang'],
      data: reportData,
      totals: {
        'TOTAL HUTANG': totalAmount,
        'TOTAL TERBAYAR': totalPaid,
        'TOTAL SISA HUTANG': totalOutstanding,
      },
    };
  },

  apDueReport: (data: any[]): ReportTemplate => {
    const reportData = data.map((ap: any) => ({
      'No. PO': ap.poNo || 'N/A',
      'Supplier': ap.supplierName || 'Unknown',
      'Tanggal PO': ap.poDate ? new Date(ap.poDate).toLocaleDateString('id-ID') : 'N/A',
      'Jatuh Tempo': ap.dueDate ? new Date(ap.dueDate).toLocaleDateString('id-ID') : 'N/A',
      'Hari Hingga Jatuh Tempo': ap.daysUntilDue || 0,
      'Total Hutang': ap.totalAmount || 0,
      'Terbayar': ap.totalPaid || 0,
      'Sisa Hutang': ap.outstanding || 0,
    }));

    const totalAmount = data.reduce((sum: number, ap: any) => sum + (ap.totalAmount || 0), 0);
    const totalPaid = data.reduce((sum: number, ap: any) => sum + (ap.totalPaid || 0), 0);
    const totalOutstanding = data.reduce((sum: number, ap: any) => sum + (ap.outstanding || 0), 0);

    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `LAPORAN HUTANG JATUH TEMPO\nPeriode: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No. PO', 'Supplier', 'Tanggal PO', 'Jatuh Tempo', 'Hari Hingga Jatuh Tempo', 'Total Hutang', 'Terbayar', 'Sisa Hutang'],
      data: reportData,
      totals: {
        'TOTAL HUTANG': totalAmount,
        'TOTAL TERBAYAR': totalPaid,
        'TOTAL SISA HUTANG': totalOutstanding,
      },
    };
  },

  apOverdueReport: (data: any[]): ReportTemplate => {
    const reportData = data.map((ap: any) => ({
      'No. PO': ap.poNo || 'N/A',
      'Supplier': ap.supplierName || 'Unknown',
      'Tanggal PO': ap.poDate ? new Date(ap.poDate).toLocaleDateString('id-ID') : 'N/A',
      'Jatuh Tempo': ap.dueDate ? new Date(ap.dueDate).toLocaleDateString('id-ID') : 'N/A',
      'Umur (hari)': ap.daysOverdue || 0,
      'Total Hutang': ap.totalAmount || 0,
      'Terbayar': ap.totalPaid || 0,
      'Sisa Hutang': ap.outstanding || 0,
    }));

    const totalAmount = data.reduce((sum: number, ap: any) => sum + (ap.totalAmount || 0), 0);
    const totalPaid = data.reduce((sum: number, ap: any) => sum + (ap.totalPaid || 0), 0);
    const totalOutstanding = data.reduce((sum: number, ap: any) => sum + (ap.outstanding || 0), 0);

    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `LAPORAN HUTANG OVERDUE\nPeriode: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No. PO', 'Supplier', 'Tanggal PO', 'Jatuh Tempo', 'Umur (hari)', 'Total Hutang', 'Terbayar', 'Sisa Hutang'],
      data: reportData,
      totals: {
        'TOTAL HUTANG': totalAmount,
        'TOTAL TERBAYAR': totalPaid,
        'TOTAL SISA HUTANG': totalOutstanding,
      },
    };
  },

  apCardReport: (data: any[]): ReportTemplate => {
    const reportData = data.map((ap: any) => ({
      'No. PO': ap.poNo || 'N/A',
      'Supplier': ap.supplierName || 'Unknown',
      'Tanggal PO': ap.poDate ? new Date(ap.poDate).toLocaleDateString('id-ID') : 'N/A',
      'Jatuh Tempo': ap.dueDate ? new Date(ap.dueDate).toLocaleDateString('id-ID') : 'N/A',
      'Total Hutang': ap.totalAmount || 0,
      'Terbayar': ap.totalPaid || 0,
      'Sisa Hutang': ap.outstanding || 0,
      'Status': ap.status || 'OUTSTANDING',
    }));

    const totalAmount = data.reduce((sum: number, ap: any) => sum + (ap.totalAmount || 0), 0);
    const totalPaid = data.reduce((sum: number, ap: any) => sum + (ap.totalPaid || 0), 0);
    const totalOutstanding = data.reduce((sum: number, ap: any) => sum + (ap.outstanding || 0), 0);

    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `LAPORAN KARTU HUTANG\nPeriode: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['No. PO', 'Supplier', 'Tanggal PO', 'Jatuh Tempo', 'Total Hutang', 'Terbayar', 'Sisa Hutang', 'Status'],
      data: reportData,
      totals: {
        'TOTAL HUTANG': totalAmount,
        'TOTAL TERBAYAR': totalPaid,
        'TOTAL SISA HUTANG': totalOutstanding,
      },
    };
  },

  apAnalysisReport: (data: any[]): ReportTemplate => {
    const reportData = data.map((ap: any) => ({
      'Supplier': ap.supplierName || 'Unknown',
      'Total PO': ap.totalPO || 0,
      'Total Hutang': ap.totalAmount || 0,
      'Terbayar': ap.totalPaid || 0,
      'Sisa Hutang': ap.totalOutstanding || 0,
      'Overdue': ap.overdueAmount || 0,
      'Persentase': ap.totalAmount > 0 ? `${((ap.totalOutstanding / ap.totalAmount) * 100).toFixed(2)}%` : '0%',
    }));

    const totalAmount = data.reduce((sum: number, ap: any) => sum + (ap.totalAmount || 0), 0);
    const totalPaid = data.reduce((sum: number, ap: any) => sum + (ap.totalPaid || 0), 0);
    const totalOutstanding = data.reduce((sum: number, ap: any) => sum + (ap.totalOutstanding || 0), 0);

    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `LAPORAN ANALISA HUTANG\nPeriode: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['Supplier', 'Total PO', 'Total Hutang', 'Terbayar', 'Sisa Hutang', 'Overdue', 'Persentase'],
      data: reportData,
      totals: {
        'TOTAL HUTANG': totalAmount,
        'TOTAL TERBAYAR': totalPaid,
        'TOTAL SISA HUTANG': totalOutstanding,
      },
    };
  },

  /**
   * TAX TEMPLATES
   */
  taxPPNMasukanReport: (data: any[]): ReportTemplate => {
    const reportData = data.map((tax: any) => ({
      'Tanggal Pajak': tax.taxDate ? new Date(tax.taxDate).toLocaleDateString('id-ID') : 'N/A',
      'Referensi': tax.reference || 'N/A',
      'Supplier': tax.supplier || 'Unknown',
      'Dasar Pengenaan': tax.baseAmount || 0,
      'Tarif %': tax.taxPercent || 0,
      'Jumlah Pajak': tax.taxAmount || 0,
      'Status': tax.status || 'Open',
    }));

    const totalBase = data.reduce((sum: number, tax: any) => sum + (tax.baseAmount || 0), 0);
    const totalTax = data.reduce((sum: number, tax: any) => sum + (tax.taxAmount || 0), 0);

    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `LAPORAN PPN MASUKAN\nPeriode: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['Tanggal Pajak', 'Referensi', 'Supplier', 'Dasar Pengenaan', 'Tarif %', 'Jumlah Pajak', 'Status'],
      data: reportData,
      totals: {
        'TOTAL DASAR PENGENAAN': totalBase,
        'TOTAL PPN MASUKAN': totalTax,
      },
    };
  },

  taxPPNKeluaranReport: (data: any[]): ReportTemplate => {
    const reportData = data.map((tax: any) => ({
      'Tanggal Pajak': tax.taxDate ? new Date(tax.taxDate).toLocaleDateString('id-ID') : 'N/A',
      'Referensi': tax.reference || 'N/A',
      'Pelanggan': tax.customer || 'Unknown',
      'Dasar Pengenaan': tax.baseAmount || 0,
      'Tarif %': tax.taxPercent || 0,
      'Jumlah Pajak': tax.taxAmount || 0,
      'Status': tax.status || 'Open',
    }));

    const totalBase = data.reduce((sum: number, tax: any) => sum + (tax.baseAmount || 0), 0);
    const totalTax = data.reduce((sum: number, tax: any) => sum + (tax.taxAmount || 0), 0);

    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `LAPORAN PPN KELUARAN\nPeriode: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['Tanggal Pajak', 'Referensi', 'Pelanggan', 'Dasar Pengenaan', 'Tarif %', 'Jumlah Pajak', 'Status'],
      data: reportData,
      totals: {
        'TOTAL DASAR PENGENAAN': totalBase,
        'TOTAL PPN KELUARAN': totalTax,
      },
    };
  },

  taxSPTMasaPPNReport: (data: any): ReportTemplate => {
    const { ppnMasukan, ppnKeluaran, totalMasukan, totalKeluaran, ppnTerhutang } = data;

    const reportData = [
      {
        'Keterangan': 'PPN Masukan',
        'Jumlah Transaksi': ppnMasukan.length,
        'Total Dasar': ppnMasukan.reduce((sum: number, t: any) => sum + (t.baseAmount || 0), 0),
        'Total Pajak': totalMasukan,
      },
      {
        'Keterangan': 'PPN Keluaran',
        'Jumlah Transaksi': ppnKeluaran.length,
        'Total Dasar': ppnKeluaran.reduce((sum: number, t: any) => sum + (t.baseAmount || 0), 0),
        'Total Pajak': totalKeluaran,
      },
      {
        'Keterangan': 'PPN Terhutang/(Lebih Bayar)',
        'Jumlah Transaksi': '-',
        'Total Dasar': '-',
        'Total Pajak': ppnTerhutang,
      },
    ];

    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `LAPORAN SPT MASA PPN\nPeriode: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['Keterangan', 'Jumlah Transaksi', 'Total Dasar', 'Total Pajak'],
      data: reportData,
    };
  },

  taxEFakturReport: (data: any[]): ReportTemplate => {
    const reportData = data.map((tax: any) => ({
      'Nomor Faktur': tax.reference || 'N/A',
      'Tanggal Faktur': tax.taxDate ? new Date(tax.taxDate).toLocaleDateString('id-ID') : 'N/A',
      'Pelanggan': tax.customer || 'Unknown',
      'Dasar Pengenaan': tax.baseAmount || 0,
      'PPN': tax.taxAmount || 0,
      'Total': tax.totalAmount || 0,
      'Status': tax.status || 'Open',
    }));

    const totalBase = data.reduce((sum: number, tax: any) => sum + (tax.baseAmount || 0), 0);
    const totalTax = data.reduce((sum: number, tax: any) => sum + (tax.taxAmount || 0), 0);
    const totalAmount = data.reduce((sum: number, tax: any) => sum + (tax.totalAmount || 0), 0);

    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `LAPORAN e-FAKTUR\nPeriode: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['Nomor Faktur', 'Tanggal Faktur', 'Pelanggan', 'Dasar Pengenaan', 'PPN', 'Total', 'Status'],
      data: reportData,
      totals: {
        'TOTAL DASAR PENGENAAN': totalBase,
        'TOTAL PPN': totalTax,
        'TOTAL FAKTUR': totalAmount,
      },
    };
  },

  taxCSVFakturReport: (data: any[]): ReportTemplate => {
    const reportData = data.map((tax: any) => ({
      'Tanggal': tax.taxDate ? new Date(tax.taxDate).toLocaleDateString('id-ID') : 'N/A',
      'Nomor Referensi': tax.reference || 'N/A',
      'Tipe': tax.taxType || 'N/A',
      'Jenis Referensi': tax.referenceType || 'N/A',
      'Pihak': tax.customer || tax.supplier || 'Unknown',
      'Dasar Pengenaan': tax.baseAmount || 0,
      'Tarif': `${tax.taxPercent || 0}%`,
      'Jumlah Pajak': tax.taxAmount || 0,
      'Total': tax.totalAmount || 0,
      'Status': tax.status || 'Open',
    }));

    const totalBase = data.reduce((sum: number, tax: any) => sum + (tax.baseAmount || 0), 0);
    const totalTax = data.reduce((sum: number, tax: any) => sum + (tax.taxAmount || 0), 0);
    const totalAmount = data.reduce((sum: number, tax: any) => sum + (tax.totalAmount || 0), 0);

    return {
      title: 'PT. TRIMA LAKSANA',
      subtitle: `LAPORAN CSV FAKTUR PAJAK\nPeriode: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['Tanggal', 'Nomor Referensi', 'Tipe', 'Jenis Referensi', 'Pihak', 'Dasar Pengenaan', 'Tarif', 'Jumlah Pajak', 'Total', 'Status'],
      data: reportData,
      totals: {
        'TOTAL DASAR PENGENAAN': totalBase,
        'TOTAL PAJAK': totalTax,
        'TOTAL SEMUA': totalAmount,
      },
    };
  },

  /**
   * PROFIT - Laba Rugi Per Item
   */
  profitPerItemReport: (data: any[]): ReportTemplate => {
    const reportData = data.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'KODE PRODUK': item.productKode || '-',
      'NAMA PRODUK': item.productName || '-',
      'QTY TERJUAL': item.qtySold || 0,
      'HARGA JUAL': item.sellingPrice || 0,
      'REVENUE': item.revenue || 0,
      'HARGA BELI': item.costPrice || 0,
      'COGS': item.cogs || 0,
      'GROSS PROFIT': item.grossProfit || 0,
      'MARGIN %': item.marginPercent || 0,
    }));

    const totalQty = data.reduce((sum: number, item: any) => sum + (item.qtySold || 0), 0);
    const totalRevenue = data.reduce((sum: number, item: any) => sum + (item.revenue || 0), 0);
    const totalCOGS = data.reduce((sum: number, item: any) => sum + (item.cogs || 0), 0);
    const totalGrossProfit = totalRevenue - totalCOGS;
    const avgMargin = totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0;

    return {
      title: 'LAPORAN LABA RUGI PER ITEM',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['NO', 'KODE PRODUK', 'NAMA PRODUK', 'QTY TERJUAL', 'HARGA JUAL', 'REVENUE', 'HARGA BELI', 'COGS', 'GROSS PROFIT', 'MARGIN %'],
      data: reportData,
      totals: {
        'TOTAL QTY': totalQty,
        'TOTAL REVENUE': totalRevenue,
        'TOTAL COGS': totalCOGS,
        'TOTAL GROSS PROFIT': totalGrossProfit,
        'RATA-RATA MARGIN %': Math.round(avgMargin * 100) / 100,
      },
      formatting: {
        headerBgColor: '70AD47',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 20, 12, 12, 12, 12, 12, 14, 10],
      },
    };
  },

  /**
   * PROFIT - Laba Rugi Per Pelanggan
   */
  profitPerCustomerReport: (data: any[]): ReportTemplate => {
    const reportData = data.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'KODE PELANGGAN': item.customerKode || '-',
      'NAMA PELANGGAN': item.customerName || '-',
      'TOTAL PENJUALAN': item.totalSales || 0,
      'TOTAL COGS': item.totalCOGS || 0,
      'GROSS PROFIT': item.grossProfit || 0,
      'OPERATING EXPENSE': item.operatingExpense || 0,
      'NET PROFIT': item.netProfit || 0,
      'MARGIN %': item.marginPercent || 0,
    }));

    const totalSales = data.reduce((sum: number, item: any) => sum + (item.totalSales || 0), 0);
    const totalCOGS = data.reduce((sum: number, item: any) => sum + (item.totalCOGS || 0), 0);
    const totalGrossProfit = totalSales - totalCOGS;
    const totalOpEx = data.reduce((sum: number, item: any) => sum + (item.operatingExpense || 0), 0);
    const totalNetProfit = totalGrossProfit - totalOpEx;
    const avgMargin = totalSales > 0 ? (totalNetProfit / totalSales) * 100 : 0;

    return {
      title: 'LAPORAN LABA RUGI PER PELANGGAN',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['NO', 'KODE PELANGGAN', 'NAMA PELANGGAN', 'TOTAL PENJUALAN', 'TOTAL COGS', 'GROSS PROFIT', 'OPERATING EXPENSE', 'NET PROFIT', 'MARGIN %'],
      data: reportData,
      totals: {
        'TOTAL PENJUALAN': totalSales,
        'TOTAL COGS': totalCOGS,
        'TOTAL GROSS PROFIT': totalGrossProfit,
        'TOTAL OPERATING EXPENSE': totalOpEx,
        'TOTAL NET PROFIT': totalNetProfit,
        'RATA-RATA MARGIN %': Math.round(avgMargin * 100) / 100,
      },
      formatting: {
        headerBgColor: '70AD47',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 20, 14, 12, 14, 16, 12, 10],
      },
    };
  },

  /**
   * PROFIT - Laba Rugi Per Supplier
   */
  profitPerSupplierReport: (data: any[]): ReportTemplate => {
    const reportData = data.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'KODE SUPPLIER': item.supplierKode || '-',
      'NAMA SUPPLIER': item.supplierName || '-',
      'TOTAL PEMBELIAN': item.totalPurchase || 0,
      'TOTAL PENJUALAN': item.totalSales || 0,
      'GROSS PROFIT': item.grossProfit || 0,
      'MARGIN %': item.marginPercent || 0,
    }));

    const totalPurchase = data.reduce((sum: number, item: any) => sum + (item.totalPurchase || 0), 0);
    const totalSales = data.reduce((sum: number, item: any) => sum + (item.totalSales || 0), 0);
    const totalGrossProfit = totalSales - totalPurchase;
    const avgMargin = totalSales > 0 ? (totalGrossProfit / totalSales) * 100 : 0;

    return {
      title: 'LAPORAN LABA RUGI PER SUPPLIER',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['NO', 'KODE SUPPLIER', 'NAMA SUPPLIER', 'TOTAL PEMBELIAN', 'TOTAL PENJUALAN', 'GROSS PROFIT', 'MARGIN %'],
      data: reportData,
      totals: {
        'TOTAL PEMBELIAN': totalPurchase,
        'TOTAL PENJUALAN': totalSales,
        'TOTAL GROSS PROFIT': totalGrossProfit,
        'RATA-RATA MARGIN %': Math.round(avgMargin * 100) / 100,
      },
      formatting: {
        headerBgColor: '70AD47',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 20, 14, 14, 14, 10],
      },
    };
  },

  /**
   * PROFIT - Laba Rugi Per Sales
   */
  profitPerSalesReport: (data: any[]): ReportTemplate => {
    const reportData = data.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'NAMA SALES': item.salesName || '-',
      'TOTAL PENJUALAN': item.totalSales || 0,
      'TOTAL COGS': item.totalCOGS || 0,
      'GROSS PROFIT': item.grossProfit || 0,
      'KOMISI': item.commission || 0,
      'NET PROFIT': item.netProfit || 0,
      'MARGIN %': item.marginPercent || 0,
    }));

    const totalSales = data.reduce((sum: number, item: any) => sum + (item.totalSales || 0), 0);
    const totalCOGS = data.reduce((sum: number, item: any) => sum + (item.totalCOGS || 0), 0);
    const totalGrossProfit = totalSales - totalCOGS;
    const totalCommission = data.reduce((sum: number, item: any) => sum + (item.commission || 0), 0);
    const totalNetProfit = totalGrossProfit - totalCommission;
    const avgMargin = totalSales > 0 ? (totalNetProfit / totalSales) * 100 : 0;

    return {
      title: 'LAPORAN LABA RUGI PER SALES',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['NO', 'NAMA SALES', 'TOTAL PENJUALAN', 'TOTAL COGS', 'GROSS PROFIT', 'KOMISI', 'NET PROFIT', 'MARGIN %'],
      data: reportData,
      totals: {
        'TOTAL PENJUALAN': totalSales,
        'TOTAL COGS': totalCOGS,
        'TOTAL GROSS PROFIT': totalGrossProfit,
        'TOTAL KOMISI': totalCommission,
        'TOTAL NET PROFIT': totalNetProfit,
        'RATA-RATA MARGIN %': Math.round(avgMargin * 100) / 100,
      },
      formatting: {
        headerBgColor: '70AD47',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 20, 14, 12, 14, 10, 12, 10],
      },
    };
  },

  /**
   * PROFIT - Laba Rugi Per Wilayah
   */
  profitPerRegionReport: (data: any[]): ReportTemplate => {
    const reportData = data.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'WILAYAH': item.region || '-',
      'TOTAL PENJUALAN': item.totalSales || 0,
      'TOTAL COGS': item.totalCOGS || 0,
      'GROSS PROFIT': item.grossProfit || 0,
      'OPERATING EXPENSE': item.operatingExpense || 0,
      'NET PROFIT': item.netProfit || 0,
      'MARGIN %': item.marginPercent || 0,
    }));

    const totalSales = data.reduce((sum: number, item: any) => sum + (item.totalSales || 0), 0);
    const totalCOGS = data.reduce((sum: number, item: any) => sum + (item.totalCOGS || 0), 0);
    const totalGrossProfit = totalSales - totalCOGS;
    const totalOpEx = data.reduce((sum: number, item: any) => sum + (item.operatingExpense || 0), 0);
    const totalNetProfit = totalGrossProfit - totalOpEx;
    const avgMargin = totalSales > 0 ? (totalNetProfit / totalSales) * 100 : 0;

    return {
      title: 'LAPORAN LABA RUGI PER WILAYAH',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['NO', 'WILAYAH', 'TOTAL PENJUALAN', 'TOTAL COGS', 'GROSS PROFIT', 'OPERATING EXPENSE', 'NET PROFIT', 'MARGIN %'],
      data: reportData,
      totals: {
        'TOTAL PENJUALAN': totalSales,
        'TOTAL COGS': totalCOGS,
        'TOTAL GROSS PROFIT': totalGrossProfit,
        'TOTAL OPERATING EXPENSE': totalOpEx,
        'TOTAL NET PROFIT': totalNetProfit,
        'RATA-RATA MARGIN %': Math.round(avgMargin * 100) / 100,
      },
      formatting: {
        headerBgColor: '70AD47',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 15, 14, 12, 14, 16, 12, 10],
      },
    };
  },

  /**
   * PROFIT - Laba Rugi Per Kategori
   */
  profitPerCategoryReport: (data: any[]): ReportTemplate => {
    const reportData = data.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'KATEGORI': item.category || '-',
      'TOTAL PENJUALAN': item.totalSales || 0,
      'TOTAL COGS': item.totalCOGS || 0,
      'GROSS PROFIT': item.grossProfit || 0,
      'MARGIN %': item.marginPercent || 0,
    }));

    const totalSales = data.reduce((sum: number, item: any) => sum + (item.totalSales || 0), 0);
    const totalCOGS = data.reduce((sum: number, item: any) => sum + (item.totalCOGS || 0), 0);
    const totalGrossProfit = totalSales - totalCOGS;
    const avgMargin = totalSales > 0 ? (totalGrossProfit / totalSales) * 100 : 0;

    return {
      title: 'LAPORAN LABA RUGI PER KATEGORI',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['NO', 'KATEGORI', 'TOTAL PENJUALAN', 'TOTAL COGS', 'GROSS PROFIT', 'MARGIN %'],
      data: reportData,
      totals: {
        'TOTAL PENJUALAN': totalSales,
        'TOTAL COGS': totalCOGS,
        'TOTAL GROSS PROFIT': totalGrossProfit,
        'RATA-RATA MARGIN %': Math.round(avgMargin * 100) / 100,
      },
      formatting: {
        headerBgColor: '70AD47',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 20, 14, 12, 14, 10],
      },
    };
  },

  /**
   * PROFIT - Margin Penjualan
   */
  profitMarginReport: (data: any[]): ReportTemplate => {
    const reportData = data.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'PERIODE': item.period || '-',
      'TOTAL PENJUALAN': item.totalSales || 0,
      'TOTAL COGS': item.totalCOGS || 0,
      'GROSS PROFIT': item.grossProfit || 0,
      'GROSS MARGIN %': item.grossMarginPercent || 0,
      'OPERATING EXPENSE': item.operatingExpense || 0,
      'NET PROFIT': item.netProfit || 0,
      'NET MARGIN %': item.netMarginPercent || 0,
    }));

    const totalSales = data.reduce((sum: number, item: any) => sum + (item.totalSales || 0), 0);
    const totalCOGS = data.reduce((sum: number, item: any) => sum + (item.totalCOGS || 0), 0);
    const totalGrossProfit = totalSales - totalCOGS;
    const totalOpEx = data.reduce((sum: number, item: any) => sum + (item.operatingExpense || 0), 0);
    const totalNetProfit = totalGrossProfit - totalOpEx;
    const grossMargin = totalSales > 0 ? (totalGrossProfit / totalSales) * 100 : 0;
    const netMargin = totalSales > 0 ? (totalNetProfit / totalSales) * 100 : 0;

    return {
      title: 'LAPORAN MARGIN PENJUALAN',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['NO', 'PERIODE', 'TOTAL PENJUALAN', 'TOTAL COGS', 'GROSS PROFIT', 'GROSS MARGIN %', 'OPERATING EXPENSE', 'NET PROFIT', 'NET MARGIN %'],
      data: reportData,
      totals: {
        'TOTAL PENJUALAN': totalSales,
        'TOTAL COGS': totalCOGS,
        'TOTAL GROSS PROFIT': totalGrossProfit,
        'GROSS MARGIN %': Math.round(grossMargin * 100) / 100,
        'TOTAL OPERATING EXPENSE': totalOpEx,
        'TOTAL NET PROFIT': totalNetProfit,
        'NET MARGIN %': Math.round(netMargin * 100) / 100,
      },
      formatting: {
        headerBgColor: '70AD47',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 15, 14, 12, 14, 14, 16, 12, 12],
      },
    };
  },

  /**
   * PROFIT - HPP (Harga Pokok Penjualan)
   */
  profitCOGSReport: (data: any[]): ReportTemplate => {
    const reportData = data.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'KODE PRODUK': item.productKode || '-',
      'NAMA PRODUK': item.productName || '-',
      'QTY TERJUAL': item.qtySold || 0,
      'HARGA BELI': item.costPrice || 0,
      'TOTAL HPP': item.totalCOGS || 0,
      'HARGA JUAL': item.sellingPrice || 0,
      'TOTAL PENJUALAN': item.totalSales || 0,
      'GROSS PROFIT': item.grossProfit || 0,
    }));

    const totalQty = data.reduce((sum: number, item: any) => sum + (item.qtySold || 0), 0);
    const totalCOGS = data.reduce((sum: number, item: any) => sum + (item.totalCOGS || 0), 0);
    const totalSales = data.reduce((sum: number, item: any) => sum + (item.totalSales || 0), 0);
    const totalGrossProfit = totalSales - totalCOGS;

    return {
      title: 'LAPORAN HPP (HARGA POKOK PENJUALAN)',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}`,
      headers: ['NO', 'KODE PRODUK', 'NAMA PRODUK', 'QTY TERJUAL', 'HARGA BELI', 'TOTAL HPP', 'HARGA JUAL', 'TOTAL PENJUALAN', 'GROSS PROFIT'],
      data: reportData,
      totals: {
        'TOTAL QTY': totalQty,
        'TOTAL HPP': totalCOGS,
        'TOTAL PENJUALAN': totalSales,
        'TOTAL GROSS PROFIT': totalGrossProfit,
      },
      formatting: {
        headerBgColor: '70AD47',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: [6, 12, 20, 12, 12, 12, 12, 14, 14],
      },
    };
  },

  /**
   * CUSTOM - Packaging Sales Order Export Report
   * Export data penjualan packaging dengan inventory flow dan financial summary
   */
  packagingSalesOrderExportReport(data: any[], startDate?: string, endDate?: string): ReportTemplate {
    // Calculate totals
    const totalJml = data.reduce((sum, row) => sum + (row['JML'] || 0), 0);
    const totalDelivery = data.reduce((sum, row) => sum + (row['DELIVERY'] || 0), 0);
    const totalRemainPO = data.reduce((sum, row) => sum + (row['REMAIN PO'] || 0), 0);
    const totalTagihan = data.reduce((sum, row) => sum + (row['TOTAL TAGIHAN'] || 0), 0);
    const totalRpRemain = data.reduce((sum, row) => sum + (row['TOTAL RP. REMAIN'] || 0), 0);

    // Format date range for title
    const dateRangeText = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';

    const columns = [
      { key: 'NO', width: 6 },
      { key: 'KODE PEL.', width: 12 },
      { key: 'KD. ITEM', width: 12 },
      { key: 'DATE', width: 12 },
      { key: 'NO TRANSAKSI', width: 18 },
      { key: 'CUSTOMER', width: 30 },
      { key: 'NAMA ITEM', width: 40 },
      { key: 'JML', width: 10 },
      { key: 'HARGA', width: 14 },
      { key: 'TOTAL', width: 14 },
      { key: 'STOCK AWAL', width: 12 },
      { key: 'PRODUKSI', width: 12 },
      { key: 'DELIVERY', width: 12 },
      { key: 'REMAIN PO', width: 12 },
      { key: 'NEXT STOCK', width: 12 },
      { key: 'TOTAL TAGIHAN', width: 16 },
      { key: 'TOTAL RP. REMAIN', width: 16 },
    ];

    return {
      title: `Laporan Export Penjualan Packaging${dateRangeText}`,
      subtitle: 'Data Penjualan dengan Inventory Flow dan Financial Summary',
      headers: columns.map(col => col.key),
      data: data,
      totals: {
        'NO': 'TOTAL',
        'JML': totalJml,
        'DELIVERY': totalDelivery,
        'REMAIN PO': totalRemainPO,
        'TOTAL TAGIHAN': totalTagihan,
        'TOTAL RP. REMAIN': totalRpRemain,
      },
      formatting: {
        headerBgColor: '4472C4',
        headerTextColor: 'FFFFFF',
        alternateRowColor: true,
        freezePane: true,
        columnWidths: columns.map(col => col.width),
      },
    };
  },

};
