import { storageService, extractStorageValue } from './storage';
import { StorageKeys } from './storage';

/**
 * Report Data Fetcher - Fetch data untuk table preview
 * Keys HARUS sama dengan yang di-export ke Excel (dari report-template-engine)
 */

export const reportDataFetcher = {
  // MASTER DATA - PACKAGING
  async getMasterProductsData() {
    const productsRaw = await storageService.get(StorageKeys.PACKAGING.PRODUCTS);
    const products = extractStorageValue(productsRaw) || [];
    
    // Normalize data sesuai dengan template engine
    const normalizedData = (products as any[]).map((p: any) => ({
      code: p.code || p.kode || '-',
      name: p.name || p.nama || '-',
      category: p.category || p.kategori || '-',
      unit: p.unit || p.satuan || '-',
      price: p.price || p.hargaFg || 0,
      cost: p.cost || p.harga || 0,
      stock: p.stock || p.stok || 0,
      padCode: p.padCode || '-',
      customer: p.customer || p.pelanggan || '-',
    }));

    // Return dengan format yang sama seperti template engine
    return normalizedData.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'KODE': item.code,
      'NAMA PRODUK': item.name,
      'KATEGORI': item.category,
      'UNIT': item.unit,
      'HARGA JUAL': item.price,
      'HARGA BELI': item.cost,
      'STOK': item.stock,
      'PAD CODE': item.padCode,
      'PELANGGAN': item.customer,
      'NILAI STOK': item.stock * item.price,
    }));
  },

  async getMasterMaterialsData() {
    const materials = (await storageService.get(StorageKeys.PACKAGING.MATERIALS)) || [];
    return (materials as any[]).map((m: any, idx: number) => ({
      'NO': idx + 1,
      'KODE': m.code || m.kode || '-',
      'NAMA MATERIAL': m.name || m.nama || '-',
      'KATEGORI': m.category || m.kategori || '-',
      'UNIT': m.unit || m.satuan || '-',
      'HARGA': m.price || m.harga || 0,
      'STOK': m.stock || m.stok || 0,
    }));
  },

  async getMasterCustomersData() {
    const customers = (await storageService.get(StorageKeys.PACKAGING.CUSTOMERS)) || [];
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
    const suppliers = (await storageService.get(StorageKeys.PACKAGING.SUPPLIERS)) || [];
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
    const categories = (await storageService.get(StorageKeys.PACKAGING.PRODUCTS)) || [];
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
    const products = (await storageService.get(StorageKeys.PACKAGING.PRODUCTS)) || [];
    const unitSet = new Set();
    (products as any[]).forEach((p: any) => {
      if (p.unit || p.satuan) unitSet.add(p.unit || p.satuan);
    });
    return Array.from(unitSet).map((unit: any, idx: number) => ({
      'NO': idx + 1,
      'KODE': unit,
      'NAMA SATUAN': unit,
      'SINGKATAN': unit,
    }));
  },

  async getMasterRegionsData() {
    return [
      { 'NO': 1, 'KODE': 'REG001', 'NAMA WILAYAH': 'Jakarta', 'DESKRIPSI': 'Wilayah Jakarta' },
      { 'NO': 2, 'KODE': 'REG002', 'NAMA WILAYAH': 'Surabaya', 'DESKRIPSI': 'Wilayah Surabaya' },
    ];
  },

  async getMasterBanksData() {
    return [
      { 'NO': 1, 'KODE': 'BCA', 'NAMA BANK': 'Bank Central Asia', 'NOMOR REKENING': '-', 'ATAS NAMA': '-' },
      { 'NO': 2, 'KODE': 'MANDIRI', 'NAMA BANK': 'Bank Mandiri', 'NOMOR REKENING': '-', 'ATAS NAMA': '-' },
    ];
  },

  async getMasterStaffData() {
    const staff = (await storageService.get(StorageKeys.PACKAGING.STAFF)) || [];
    return (staff as any[]).map((s: any, idx: number) => ({
      'NO': idx + 1,
      'KODE': s.code || s.kode || '-',
      'NAMA': s.name || s.nama || '-',
      'DEPARTEMEN': s.department || s.departemen || '-',
      'TELEPON': s.phone || s.telepon || '-',
      'EMAIL': s.email || '-',
    }));
  },

  async getMasterProductsBOMData() {
    const products = (await storageService.get(StorageKeys.PACKAGING.PRODUCTS)) || [];
    return (products as any[]).map((p: any, idx: number) => ({
      'NO': idx + 1,
      'KODE PRODUK': p.code || p.kode || '-',
      'NAMA PRODUK': p.name || p.nama || '-',
      'BOM': p.bom ? 'Ada' : 'Tidak',
      'JUMLAH MATERIAL': (p.bom as any[])?.length || 0,
    }));
  },

  // SALES DATA
  async getSalesOrdersData(startDate: string, endDate: string) {
    const ordersRaw = await storageService.get(StorageKeys.PACKAGING.SALES_ORDERS);
    const orders = extractStorageValue(ordersRaw) || [];
    
    // Normalize data sesuai dengan template engine
    const normalizedData = (orders as any[])
      .filter((o: any) => {
        const orderDate = o.orderDate || o.created || '';
        return orderDate >= startDate && orderDate <= endDate;
      })
      .map((o: any) => ({
        soNo: (o.soNo || o.no || '').toString().trim() || '-',
        customer: (o.customer || o.customerName || '').toString().trim() || '-',
        customerKode: (o.customerKode || o.customerCode || '').toString().trim() || '-',
        created: (o.created || o.date || '').toString().split('T')[0] || '-',
        status: (o.status || 'OPEN').toString().trim(),
        paymentTerms: (o.paymentTerms || 'COD').toString().trim(),
        topDays: o.topDays || 0,
        itemCount: (o.items || []).length,
        subtotal: o.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0,
        discount: o.financialSummary?.discount || o.discount || 0,
        tax: o.financialSummary?.tax || o.tax || 0,
        grandTotal: o.financialSummary?.grandTotal || o.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0,
        confirmed: o.confirmed ? 'YES' : 'NO',
        confirmedAt: o.confirmedAt ? (o.confirmedAt || '').toString().split('T')[0] : '-',
      }));

    // Return dengan format yang sama seperti template engine
    return normalizedData.map((item: any, idx: number) => ({
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
    }));
  },

  async getSalesOrdersPerItemData(startDate: string, endDate: string) {
    const orders = (await storageService.get(StorageKeys.PACKAGING.SALES_ORDERS)) || [];
    const flatItems: any[] = [];
    
    (orders as any[])
      .filter((o: any) => {
        const orderDate = o.orderDate || o.created || '';
        return orderDate >= startDate && orderDate <= endDate;
      })
      .forEach((o: any) => {
        const soNo = (o.soNo || o.no || '').toString().trim() || '-';
        const customer = (o.customer || o.customerName || '').toString().trim() || '-';
        const customerKode = (o.customerKode || o.customerCode || '').toString().trim() || '-';
        const soDate = (o.created || o.date || '').toString().split('T')[0] || '-';
        const paymentTerms = (o.paymentTerms || 'COD').toString().trim();
        const topDays = o.topDays || 0;

        (o.items || []).forEach((item: any, itemIdx: number) => {
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

    // Return dengan format yang sama seperti template engine
    return flatItems.map((item: any, idx: number) => ({
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
    }));
  },

  async getSalesReturnData(startDate: string, endDate: string) {
    const returns = (await storageService.get(StorageKeys.PACKAGING.RETURNS)) || [];
    
    // Normalize data sesuai dengan template engine
    const normalizedData = (returns as any[])
      .filter((r: any) => {
        const returnDate = r.returnDate || r.created || '';
        return returnDate >= startDate && returnDate <= endDate;
      })
      .map((r: any) => ({
        returnNo: (r.returnNo || r.no || '').toString().trim() || '-',
        soNo: (r.soNo || r.referenceNo || '').toString().trim() || '-',
        customer: (r.customer || r.customerName || '').toString().trim() || '-',
        customerKode: (r.customerKode || r.customerCode || '').toString().trim() || '-',
        created: (r.created || r.date || '').toString().split('T')[0] || '-',
        reason: (r.reason || r.returnReason || '').toString().trim() || '-',
        itemCount: (r.items || []).length,
        subtotal: r.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0,
        discount: r.discount || 0,
        tax: r.tax || 0,
        grandTotal: r.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0,
        status: (r.status || 'OPEN').toString().trim(),
        notes: (r.notes || r.remarks || '').toString().trim() || '-',
      }));

    // Return dengan format yang sama seperti template engine
    return normalizedData.map((item: any, idx: number) => ({
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
    }));
  },

  async getSalesReturnPerItemData(startDate: string, endDate: string) {
    const returns = (await storageService.get(StorageKeys.PACKAGING.RETURNS)) || [];
    const items: any[] = [];
    
    (returns as any[])
      .filter((r: any) => {
        const returnDate = r.returnDate || r.created || '';
        return returnDate >= startDate && returnDate <= endDate;
      })
      .forEach((r: any) => {
        const returnNo = (r.returnNo || r.no || '').toString().trim() || '-';
        const returnDate = (r.created || r.date || '').toString().split('T')[0] || '-';
        const reason = (r.reason || r.returnReason || '').toString().trim() || '-';

        (r.items || []).forEach((item: any) => {
          items.push({
            returnNo,
            returnDate,
            productName: (item.productName || item.nama || '').toString().trim() || '-',
            qty: item.qty || 0,
            reason,
            total: item.total || 0,
          });
        });
      });

    // Return dengan format yang sama seperti template engine
    return items.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'NO. RETUR': item.returnNo,
      'TANGGAL': item.returnDate,
      'PRODUK': item.productName,
      'QTY': item.qty,
      'ALASAN': item.reason,
      'NILAI': item.total,
    }));
  },

  async getSalesByRegionData(startDate: string, endDate: string) {
    const orders = (await storageService.get(StorageKeys.PACKAGING.SALES_ORDERS)) || [];
    const customersData = (await storageService.get(StorageKeys.PACKAGING.CUSTOMERS)) || [];
    
    // Build customer lookup map
    const customerMap = new Map<string, any>();
    (customersData as any[]).forEach((cust: any) => {
      const nama = (cust.nama || cust.name || '').toString().trim().toLowerCase();
      const kode = (cust.kode || cust.code || '').toString().trim().toLowerCase();
      if (nama) customerMap.set(nama, cust);
      if (kode) customerMap.set(kode, cust);
    });

    // Build region sales map
    const regionMap = new Map<string, { 
      count: number; 
      total: number; 
      items: number;
      customers: Set<string>;
    }>();
    
    (orders as any[])
      .filter((o: any) => {
        const orderDate = o.orderDate || o.created || '';
        return orderDate >= startDate && orderDate <= endDate;
      })
      .forEach((o: any) => {
        const customerName = (o.customer || o.customerName || '').toString().trim();
        const custData = customerMap.get(customerName.toLowerCase());
        const region = custData?.city || custData?.kota || o.region || 'Tidak Diketahui';
        
        const grandTotal = o.financialSummary?.grandTotal || o.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
        const itemCount = (o.items || []).length;
        
        if (!regionMap.has(region)) {
          regionMap.set(region, { count: 0, total: 0, items: 0, customers: new Set() });
        }
        const data = regionMap.get(region)!;
        data.count += 1;
        data.total += grandTotal;
        data.items += itemCount;
        data.customers.add(customerName);
      });

    // Return dengan format yang sama seperti template engine
    return Array.from(regionMap.entries()).map(([region, data]: any, idx: number) => ({
      'NO': idx + 1,
      'WILAYAH': region,
      'JUMLAH TRANSAKSI': data.count,
      'PELANGGAN UNIK': data.customers.size,
      'TOTAL ITEM': data.items,
      'TOTAL NILAI': data.total,
    }));
  },

  async getSalesCustomerAnalysisData(startDate: string, endDate: string) {
    const orders = (await storageService.get(StorageKeys.PACKAGING.SALES_ORDERS)) || [];
    const customersData = (await storageService.get(StorageKeys.PACKAGING.CUSTOMERS)) || [];
    
    // Build customer sales map
    const customerSalesMap = new Map<string, { count: number; total: number; lastDate: string }>();
    
    (orders as any[])
      .filter((o: any) => {
        const orderDate = o.orderDate || o.created || '';
        return orderDate >= startDate && orderDate <= endDate;
      })
      .forEach((o: any) => {
        const customerName = (o.customer || o.customerName || '').toString().trim();
        const soDate = (o.created || o.date || '').toString().split('T')[0] || '-';
        const grandTotal = o.financialSummary?.grandTotal || o.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
        
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

    const analysisData = (customersData as any[]).map((cust: any) => {
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

    // Return dengan format yang sama seperti template engine
    return analysisData.map((item: any, idx: number) => ({
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
    }));
  },

  async getSalesChartTopItemsData(startDate: string, endDate: string) {
    const orders = (await storageService.get(StorageKeys.PACKAGING.SALES_ORDERS)) || [];
    const itemSalesMap = new Map<string, { qty: number; total: number }>();
    
    (orders as any[])
      .filter((o: any) => {
        const orderDate = o.orderDate || o.created || '';
        return orderDate >= startDate && orderDate <= endDate;
      })
      .forEach((o: any) => {
        (o.items || []).forEach((item: any) => {
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

    // Return dengan format yang sama seperti template engine
    return topItems.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'NAMA PRODUK': item.name,
      'TOTAL QTY': item.qty,
      'TOTAL PENJUALAN': item.total,
    }));
  },

  async getSalesChartDailyData(startDate: string, endDate: string) {
    const orders = (await storageService.get(StorageKeys.PACKAGING.SALES_ORDERS)) || [];
    const dailySalesMap = new Map<string, { 
      count: number; 
      total: number; 
      customers: Set<string>; 
      items: number;
    }>();
    
    (orders as any[])
      .filter((o: any) => {
        const orderDate = o.orderDate || o.created || '';
        return orderDate >= startDate && orderDate <= endDate;
      })
      .forEach((o: any) => {
        const soDate = (o.created || o.date || '').toString().split('T')[0] || '-';
        const grandTotal = o.financialSummary?.grandTotal || o.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
        const customerName = (o.customer || o.customerName || '').toString().trim();
        const totalQty = (o.items || []).reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
        
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

    // Return dengan format yang sama seperti template engine
    return dailyData.map((item: any, idx: number) => ({
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
    }));
  },

  async getSalesChartMonthlyData(startDate: string, endDate: string) {
    const orders = (await storageService.get(StorageKeys.PACKAGING.SALES_ORDERS)) || [];
    const monthlySalesMap = new Map<string, { 
      count: number; 
      total: number; 
      customers: Set<string>; 
      items: number;
    }>();
    
    (orders as any[])
      .filter((o: any) => {
        const orderDate = o.orderDate || o.created || '';
        return orderDate >= startDate && orderDate <= endDate;
      })
      .forEach((o: any) => {
        const soDate = (o.created || o.date || '').toString().split('T')[0] || '-';
        const yearMonth = soDate.substring(0, 7); // YYYY-MM
        const grandTotal = o.financialSummary?.grandTotal || o.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
        const customerName = (o.customer || o.customerName || '').toString().trim();
        const totalQty = (o.items || []).reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
        
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

    // Return dengan format yang sama seperti template engine
    return monthlyData.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'BULAN': formatMonth(item.month),
      'TRANSAKSI': item.count,
      'PELANGGAN UNIK': item.uniqueCustomers,
      'ITEM TERJUAL': item.totalItems,
      'TOTAL PENJUALAN': item.total,
      'RATA-RATA/TRANSAKSI': item.avgPerTransaction,
      'PERTUMBUHAN %': item.growth,
      'STATUS': item.status,
    }));
  },

  // INVENTORY DATA
  async getInventoryStockData() {
    const products = (await storageService.get(StorageKeys.PACKAGING.PRODUCTS)) || [];
    
    // Normalize data sesuai dengan template engine
    const normalizedData = (products as any[]).map((p: any) => ({
      kode: p.code || p.kode || '-',
      nama: p.name || p.nama || '-',
      kategori: p.category || p.kategori || '-',
      stok: p.stock || p.stok || 0,
      hargaBeli: p.cost || p.harga || 0,
      nilaiStok: (p.stock || p.stok || 0) * (p.cost || p.harga || 0),
      minStock: p.reorderLevel || p.reorderLvl || 0,
      maxStock: p.maxStock || p.maxStok || 0,
    }));

    // Return dengan format yang sama seperti template engine
    return normalizedData.map((item: any, idx: number) => ({
      'No': idx + 1,
      'Kode': item.kode,
      'Nama Item': item.nama,
      'Kategori': item.kategori,
      'Stok': item.stok,
      'Harga Beli': item.hargaBeli,
      'Nilai Stok': item.nilaiStok,
      'Min Stock': item.minStock,
      'Max Stock': item.maxStock,
    }));
  },

  async getInventoryStockPerWarehouseData() {
    const products = (await storageService.get(StorageKeys.PACKAGING.PRODUCTS)) || [];
    
    // Normalize data
    const normalizedData = (products as any[]).map((p: any) => ({
      kode: p.code || p.kode || '-',
      nama: p.name || p.nama || '-',
      gudang: p.warehouse || p.gudang || 'Utama',
      stok: p.stock || p.stok || 0,
    }));

    // Return dengan format yang sama seperti template engine
    return normalizedData.map((item: any, idx: number) => ({
      'No': idx + 1,
      'Kode': item.kode,
      'Nama Item': item.nama,
      'Gudang': item.gudang,
      'Stok': item.stok,
    }));
  },

  async getInventoryMinStockData() {
    const products = (await storageService.get(StorageKeys.PACKAGING.PRODUCTS)) || [];
    
    // Filter hanya produk dengan stok di bawah minimum
    const normalizedData = (products as any[])
      .filter((p: any) => (p.stock || p.stok || 0) < (p.reorderLevel || p.reorderLvl || 0))
      .map((p: any) => ({
        kode: p.code || p.kode || '-',
        nama: p.name || p.nama || '-',
        stokSaatIni: p.stock || p.stok || 0,
        reorderLevel: p.reorderLevel || p.reorderLvl || 0,
        kekurangan: (p.reorderLevel || p.reorderLvl || 0) - (p.stock || p.stok || 0),
      }));

    // Return dengan format yang sama seperti template engine
    return normalizedData.map((item: any, idx: number) => ({
      'No': idx + 1,
      'Kode': item.kode,
      'Nama Item': item.nama,
      'Stok Saat Ini': item.stokSaatIni,
      'Min Stock': item.reorderLevel,
      'Kekurangan': item.kekurangan,
    }));
  },

  async getInventoryMaxStockData() {
    const products = (await storageService.get(StorageKeys.PACKAGING.PRODUCTS)) || [];
    
    // Normalize data
    const normalizedData = (products as any[]).map((p: any) => ({
      kode: p.code || p.kode || '-',
      nama: p.name || p.nama || '-',
      stokMaksimal: p.maxStock || p.maxStok || 0,
      stokSaatIni: p.stock || p.stok || 0,
      sisaKapasitas: (p.maxStock || p.maxStok || 0) - (p.stock || p.stok || 0),
    }));

    // Return dengan format yang sama seperti template engine
    return normalizedData.map((item: any, idx: number) => ({
      'No': idx + 1,
      'Kode': item.kode,
      'Nama Item': item.nama,
      'Max Stock': item.stokMaksimal,
      'Stok Saat Ini': item.stokSaatIni,
      'Sisa Kapasitas': item.sisaKapasitas,
    }));
  },

  async getInventoryValueTotalData() {
    const products = (await storageService.get(StorageKeys.PACKAGING.PRODUCTS)) || [];
    
    // Normalize data
    const normalizedData = (products as any[]).map((p: any) => ({
      kode: p.code || p.kode || '-',
      nama: p.name || p.nama || '-',
      stok: p.stock || p.stok || 0,
      hargaBeli: p.cost || p.harga || 0,
      nilaiTotal: (p.stock || p.stok || 0) * (p.cost || p.harga || 0),
    }));

    const totalNilai = normalizedData.reduce((sum, item) => sum + item.nilaiTotal, 0);

    // Return dengan format yang sama seperti template engine
    const data = normalizedData.map((item: any, idx: number) => ({
      'No': idx + 1,
      'Kode': item.kode,
      'Nama Item': item.nama,
      'Stok': item.stok,
      'Harga Beli': item.hargaBeli,
      'Nilai Total': item.nilaiTotal,
    }));

    // Add total row
    data.push({
      'No': data.length + 1,
      'Kode': 'TOTAL',
      'Nama Item': 'TOTAL NILAI INVENTARIS',
      'Stok': '-',
      'Harga Beli': '-',
      'Nilai Total': totalNilai,
    });

    return data;
  },

  async getInventoryMutationData(startDate: string, endDate: string) {
    const mutations = (await storageService.get(StorageKeys.PACKAGING.INVENTORY)) || [];
    
    // Normalize data
    const normalizedData = (mutations as any[])
      .filter((m: any) => {
        const mutationDate = m.date || m.created || '';
        return mutationDate >= startDate && mutationDate <= endDate;
      })
      .map((m: any) => ({
        tanggal: (m.date || m.created || '').toString().split('T')[0] || '-',
        produk: (m.productName || m.product || '').toString().trim() || '-',
        tipe: (m.type || m.tipe || '').toString().trim() || '-',
        qty: m.quantity || m.qty || 0,
        keterangan: (m.description || m.keterangan || '').toString().trim() || '-',
      }));

    // Return dengan format yang sama seperti template engine
    return normalizedData.map((item: any, idx: number) => ({
      'No': idx + 1,
      'Tanggal': item.tanggal,
      'Produk': item.produk,
      'Tipe': item.tipe,
      'Qty': item.qty,
      'Keterangan': item.keterangan,
    }));
  },

  // ACCOUNTS RECEIVABLE & PAYABLE DATA
  async getARData(startDate: string, endDate: string) {
    const invoices = (await storageService.get(StorageKeys.PACKAGING.INVOICES)) || [];
    const payments = (await storageService.get(StorageKeys.PACKAGING.PAYMENTS)) || [];

    console.log('[ReportDataFetcher] 💰 getARData - Invoices:', (invoices as any)?.length, 'Payments:', (payments as any)?.length);

    // Build payments map
    const paymentsMap = new Map<string, number>();
    (payments as any[]).forEach((p: any) => {
      const invoiceNo = (p.invoiceNo || p.referenceNo || '').toString().trim();
      if (invoiceNo) {
        paymentsMap.set(invoiceNo, (paymentsMap.get(invoiceNo) || 0) + (p.amount || 0));
      }
    });

    // Filter dengan logic yang sama seperti filterByDateRange di report-service
    const filtered = (invoices as any[]).filter((item: any) => {
      let dateValue = item.created || item.date;
      if (!dateValue) return false;
      
      let dateStr = dateValue;
      if (typeof dateValue === 'number') {
        dateStr = new Date(dateValue).toISOString().split('T')[0];
      } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateStr = dateValue.split('T')[0];
      }
      
      return dateStr >= startDate && dateStr <= endDate;
    });

    // Normalize data sesuai dengan template engine
    const normalizedData = filtered
      .map((inv: any) => {
        const invoiceNo = (inv.invoiceNo || inv.no || '').toString().trim() || '-';
        // Use same field names as report-service: bom?.total || totalAmount
        const total = inv.bom?.total || inv.totalAmount || inv.financialSummary?.grandTotal || inv.total || 0;
        const paid = paymentsMap.get(invoiceNo) || (inv.paymentStatus === 'PAID' ? total : 0);
        const outstanding = total - paid;
        
        // Calculate age in days
        const invDate = new Date(inv.created || inv.date || '');
        const today = new Date();
        const ageDays = Math.floor((today.getTime() - invDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Determine status
        let status = 'LUNAS';
        if (outstanding > 0 && ageDays <= 30) status = 'LANCAR';
        else if (outstanding > 0 && ageDays > 30 && ageDays <= 60) status = 'JATUH TEMPO';
        else if (outstanding > 0 && ageDays > 60) status = 'OVERDUE';

        return {
          invoiceNo,
          customer: (inv.customer || inv.customerName || '').toString().trim() || '-',
          tanggal: (inv.created || inv.date || '').toString().split('T')[0] || '-',
          jatuhTempo: (inv.dueDate || inv.jatuhTempo || '').toString().split('T')[0] || '-',
          total,
          paid,
          outstanding,
          status,
          ageDays,
        };
      });

    console.log('[ReportDataFetcher] 💰 getARData - Filtered:', normalizedData?.length, 'Sample:', normalizedData[0]);

    // Return dengan format yang sama seperti template engine
    return normalizedData.map((item: any) => ({
      'No. Faktur': item.invoiceNo,
      'Pelanggan': item.customer,
      'Tanggal': item.tanggal,
      'Jatuh Tempo': item.jatuhTempo,
      'Total': item.total,
      'Terbayar': item.paid,
      'Sisa Piutang': item.outstanding,
      'Status': item.status,
      'Umur (hari)': item.ageDays,
    }));
  },

  async getAPData(startDate: string, endDate: string) {
    const grns = (await storageService.get(StorageKeys.PACKAGING.GRN)) || [];
    const payments = (await storageService.get(StorageKeys.PACKAGING.PAYMENTS)) || [];

    console.log('[ReportDataFetcher] 💰 getAPData - GRNs:', (grns as any)?.length, 'Payments:', (payments as any)?.length);

    // Build payments map
    const paymentsMap = new Map<string, number>();
    (payments as any[]).forEach((p: any) => {
      const grnNo = (p.grnNo || p.referenceNo || '').toString().trim();
      if (grnNo) {
        paymentsMap.set(grnNo, (paymentsMap.get(grnNo) || 0) + (p.amount || 0));
      }
    });

    // Filter dengan logic yang sama seperti filterByDateRange di report-service
    const filtered = (grns as any[]).filter((item: any) => {
      let dateValue = item.created || item.date;
      if (!dateValue) return false;
      
      let dateStr = dateValue;
      if (typeof dateValue === 'number') {
        dateStr = new Date(dateValue).toISOString().split('T')[0];
      } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateStr = dateValue.split('T')[0];
      }
      
      return dateStr >= startDate && dateStr <= endDate;
    });

    // Normalize data sesuai dengan template engine
    const normalizedData = filtered
      .map((grn: any) => {
        const grnNo = (grn.grnNo || grn.no || '').toString().trim() || '-';
        // Use same field names as report-service: bom?.total || totalAmount
        const total = grn.bom?.total || grn.totalAmount || grn.financialSummary?.grandTotal || grn.total || 0;
        const paid = paymentsMap.get(grnNo) || (grn.paymentStatus === 'PAID' ? total : 0);
        const outstanding = total - paid;
        
        // Calculate age in days
        const grnDate = new Date(grn.created || grn.date || '');
        const today = new Date();
        const ageDays = Math.floor((today.getTime() - grnDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Determine status
        let status = 'LUNAS';
        if (outstanding > 0 && ageDays <= 30) status = 'LANCAR';
        else if (outstanding > 0 && ageDays > 30 && ageDays <= 60) status = 'JATUH TEMPO';
        else if (outstanding > 0 && ageDays > 60) status = 'OVERDUE';

        return {
          grnNo,
          poNo: grn.poNo || grn.grnNo || '-',
          supplier: (grn.supplier || grn.supplierName || '').toString().trim() || '-',
          supplierName: (grn.supplier || grn.supplierName || '').toString().trim() || '-',
          tanggal: (grn.created || grn.date || '').toString().split('T')[0] || '-',
          poDate: (grn.created || grn.date || '').toString().split('T')[0] || '-',
          jatuhTempo: (grn.dueDate || grn.jatuhTempo || '').toString().split('T')[0] || '-',
          dueDate: (grn.dueDate || grn.jatuhTempo || '').toString().split('T')[0] || '-',
          total,
          totalAmount: total,
          paid,
          totalPaid: paid,
          outstanding,
          totalOutstanding: outstanding,
          status,
          ageDays,
          daysOverdue: Math.max(0, ageDays - 30),
          agingBucket: ageDays <= 30 ? 'Current' : ageDays <= 60 ? '31-60 Days' : '60+ Days',
        };
      });

    console.log('[ReportDataFetcher] 💰 getAPData - Filtered:', normalizedData?.length, 'Sample:', normalizedData[0]);

    // Return dengan format yang sama seperti template engine
    return normalizedData.map((item: any) => ({
      'No. GRN': item.grnNo,
      'No. PO': item.poNo,
      'Supplier': item.supplier,
      'supplierName': item.supplierName,
      'Tanggal': item.tanggal,
      'poDate': item.poDate,
      'Jatuh Tempo': item.jatuhTempo,
      'dueDate': item.dueDate,
      'Total': item.total,
      'totalAmount': item.totalAmount,
      'Terbayar': item.paid,
      'totalPaid': item.totalPaid,
      'Sisa Hutang': item.outstanding,
      'totalOutstanding': item.totalOutstanding,
      'Status': item.status,
      'Umur (hari)': item.ageDays,
      'daysOverdue': item.daysOverdue,
      'agingBucket': item.agingBucket,
    }));
  },

  // AP PER SUPPLIER DATA
  async getAPPerSupplierData(startDate: string, endDate: string) {
    const posRaw = await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS);
    const paymentsRaw = await storageService.get(StorageKeys.PACKAGING.PAYMENTS);
    
    const pos = extractStorageValue(posRaw) || [];
    const payments = extractStorageValue(paymentsRaw) || [];

    console.log('[ReportDataFetcher] 💰 getAPPerSupplierData - POs:', (pos as any)?.length);

    // Build payments map
    const paymentsMap = new Map<string, number>();
    (payments as any[]).forEach((p: any) => {
      const poNo = (p.poNo || p.referenceNo || '').toString().trim();
      if (poNo) {
        paymentsMap.set(poNo, (paymentsMap.get(poNo) || 0) + (p.amount || 0));
      }
    });

    // Filter dengan logic yang sama seperti filterByDateRange di report-service
    const filtered = (pos as any[]).filter((item: any) => {
      let dateValue = item.created || item.date;
      if (!dateValue) return false;
      
      let dateStr = dateValue;
      if (typeof dateValue === 'number') {
        dateStr = new Date(dateValue).toISOString().split('T')[0];
      } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateStr = dateValue.split('T')[0];
      }
      
      return dateStr >= startDate && dateStr <= endDate;
    });

    // Aggregate by supplier
    const supplierMap = new Map<string, any>();
    filtered.forEach((po: any) => {
      const supplier = (po.supplier || po.supplierName || '').toString().trim() || 'Unknown';
      const poNo = (po.poNo || po.no || '').toString().trim() || '-';
      const total = po.bom?.total || po.totalAmount || po.financialSummary?.grandTotal || po.total || 0;
      const paid = paymentsMap.get(poNo) || (po.paymentStatus === 'PAID' ? total : 0);
      const outstanding = total - paid;
      
      if (!supplierMap.has(supplier)) {
        supplierMap.set(supplier, {
          supplierName: supplier,
          totalGRN: 0,
          totalAmount: 0,
          totalPaid: 0,
          totalOutstanding: 0,
          overdueAmount: 0,
        });
      }
      
      const data = supplierMap.get(supplier)!;
      data.totalGRN += 1;
      data.totalAmount += total;
      data.totalPaid += paid;
      data.totalOutstanding += outstanding;
      
      // Calculate overdue
      const poDate = new Date(po.created || po.date || '');
      const today = new Date();
      const ageDays = Math.floor((today.getTime() - poDate.getTime()) / (1000 * 60 * 60 * 24));
      if (outstanding > 0 && ageDays > 30) {
        data.overdueAmount += outstanding;
      }
    });

    console.log('[ReportDataFetcher] 💰 getAPPerSupplierData - Suppliers:', supplierMap.size);
    
    // Format dengan column headers seperti export
    return Array.from(supplierMap.values()).map((item: any, idx: number) => ({
      'NO': idx + 1,
      'SUPPLIER': item.supplierName,
      'TOTAL PO': item.totalGRN,
      'TOTAL HUTANG': item.totalAmount,
      'TERBAYAR': item.totalPaid,
      'SISA HUTANG': item.totalOutstanding,
      'OVERDUE': item.overdueAmount,
    }));
  },

  // AP PER INVOICE DATA
  async getAPPerInvoiceData(startDate: string, endDate: string) {
    const posRaw = await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS);
    const paymentsRaw = await storageService.get(StorageKeys.PACKAGING.PAYMENTS);
    
    const pos = extractStorageValue(posRaw) || [];
    const payments = extractStorageValue(paymentsRaw) || [];

    console.log('[ReportDataFetcher] 💰 getAPPerInvoiceData - POs:', (pos as any)?.length);

    // Build payments map
    const paymentsMap = new Map<string, number>();
    (payments as any[]).forEach((p: any) => {
      const poNo = (p.poNo || p.referenceNo || '').toString().trim();
      if (poNo) {
        paymentsMap.set(poNo, (paymentsMap.get(poNo) || 0) + (p.amount || 0));
      }
    });

    // Filter dengan logic yang sama seperti filterByDateRange di report-service
    const filtered = (pos as any[]).filter((item: any) => {
      let dateValue = item.created || item.date;
      if (!dateValue) return false;
      
      let dateStr = dateValue;
      if (typeof dateValue === 'number') {
        dateStr = new Date(dateValue).toISOString().split('T')[0];
      } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateStr = dateValue.split('T')[0];
      }
      
      return dateStr >= startDate && dateStr <= endDate;
    });

    const normalizedData = filtered.map((po: any) => {
      const poNo = (po.poNo || po.no || '').toString().trim() || '-';
      const total = po.bom?.total || po.totalAmount || po.financialSummary?.grandTotal || po.total || 0;
      const paid = paymentsMap.get(poNo) || (po.paymentStatus === 'PAID' ? total : 0);
      const outstanding = total - paid;
      
      return {
        poNo: poNo,
        supplierName: (po.supplier || po.supplierName || '').toString().trim() || '-',
        poDate: (po.created || po.date || '').toString().split('T')[0] || '-',
        dueDate: (po.dueDate || po.jatuhTempo || '').toString().split('T')[0] || '-',
        totalAmount: total,
        totalPaid: paid,
        totalOutstanding: outstanding,
        status: outstanding > 0 ? 'OUTSTANDING' : 'LUNAS',
      };
    });

    console.log('[ReportDataFetcher] 💰 getAPPerInvoiceData - Records:', normalizedData.length);
    
    // Format dengan column headers seperti export
    return normalizedData.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'NO. PO': item.poNo,
      'SUPPLIER': item.supplierName,
      'TANGGAL': item.poDate,
      'JATUH TEMPO': item.dueDate,
      'TOTAL': item.totalAmount,
      'TERBAYAR': item.totalPaid,
      'SISA HUTANG': item.totalOutstanding,
      'STATUS': item.status,
    }));
  },

  // AP AGING DATA
  async getAPAgingData(startDate: string, endDate: string) {
    const posRaw = await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS);
    const paymentsRaw = await storageService.get(StorageKeys.PACKAGING.PAYMENTS);
    
    const pos = extractStorageValue(posRaw) || [];
    const payments = extractStorageValue(paymentsRaw) || [];

    console.log('[ReportDataFetcher] 💰 getAPAgingData - POs:', (pos as any)?.length);

    // Build payments map
    const paymentsMap = new Map<string, number>();
    (payments as any[]).forEach((p: any) => {
      const poNo = (p.poNo || p.referenceNo || '').toString().trim();
      if (poNo) {
        paymentsMap.set(poNo, (paymentsMap.get(poNo) || 0) + (p.amount || 0));
      }
    });

    // Filter dengan logic yang sama seperti filterByDateRange di report-service
    const filtered = (pos as any[]).filter((item: any) => {
      let dateValue = item.created || item.date;
      if (!dateValue) return false;
      
      let dateStr = dateValue;
      if (typeof dateValue === 'number') {
        dateStr = new Date(dateValue).toISOString().split('T')[0];
      } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateStr = dateValue.split('T')[0];
      }
      
      return dateStr >= startDate && dateStr <= endDate;
    });

    const normalizedData = filtered.map((po: any) => {
      const poNo = (po.poNo || po.no || '').toString().trim() || '-';
      const total = po.bom?.total || po.totalAmount || po.financialSummary?.grandTotal || po.total || 0;
      const paid = paymentsMap.get(poNo) || (po.paymentStatus === 'PAID' ? total : 0);
      const outstanding = total - paid;
      
      const poDate = new Date(po.created || po.date || '');
      const today = new Date();
      const daysOverdue = Math.floor((today.getTime() - poDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let agingBucket = 'Current';
      if (daysOverdue > 60) agingBucket = '60+ Days';
      else if (daysOverdue > 30) agingBucket = '31-60 Days';
      
      return {
        poNo: poNo,
        supplierName: (po.supplier || po.supplierName || '').toString().trim() || '-',
        poDate: (po.created || po.date || '').toString().split('T')[0] || '-',
        dueDate: (po.dueDate || po.jatuhTempo || '').toString().split('T')[0] || '-',
        daysOverdue,
        agingBucket,
        totalAmount: total,
        totalPaid: paid,
        outstanding,
      };
    });

    console.log('[ReportDataFetcher] 💰 getAPAgingData - Records:', normalizedData.length);
    
    // Format dengan column headers seperti export
    return normalizedData.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'NO. PO': item.poNo,
      'SUPPLIER': item.supplierName,
      'TANGGAL': item.poDate,
      'JATUH TEMPO': item.dueDate,
      'UMUR (HARI)': item.daysOverdue,
      'KATEGORI': item.agingBucket,
      'TOTAL': item.totalAmount,
      'TERBAYAR': item.totalPaid,
      'SISA HUTANG': item.outstanding,
    }));
  },

  // AP OUTSTANDING DATA
  async getAPOutstandingData(startDate: string, endDate: string) {
    const posRaw = await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS);
    const paymentsRaw = await storageService.get(StorageKeys.PACKAGING.PAYMENTS);
    
    const pos = extractStorageValue(posRaw) || [];
    const payments = extractStorageValue(paymentsRaw) || [];

    console.log('[ReportDataFetcher] 💰 getAPOutstandingData - POs:', (pos as any)?.length);

    // Build payments map
    const paymentsMap = new Map<string, number>();
    (payments as any[]).forEach((p: any) => {
      const poNo = (p.poNo || p.referenceNo || '').toString().trim();
      if (poNo) {
        paymentsMap.set(poNo, (paymentsMap.get(poNo) || 0) + (p.amount || 0));
      }
    });

    // Filter dengan logic yang sama seperti filterByDateRange di report-service
    const filtered = (pos as any[]).filter((item: any) => {
      let dateValue = item.created || item.date;
      if (!dateValue) return false;
      
      let dateStr = dateValue;
      if (typeof dateValue === 'number') {
        dateStr = new Date(dateValue).toISOString().split('T')[0];
      } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateStr = dateValue.split('T')[0];
      }
      
      return dateStr >= startDate && dateStr <= endDate;
    });

    const normalizedData = filtered
      .map((po: any) => {
        const poNo = (po.poNo || po.no || '').toString().trim() || '-';
        const total = po.bom?.total || po.totalAmount || po.financialSummary?.grandTotal || po.total || 0;
        const paid = paymentsMap.get(poNo) || (po.paymentStatus === 'PAID' ? total : 0);
        const outstanding = total - paid;
        
        return {
          poNo: poNo,
          supplierName: (po.supplier || po.supplierName || '').toString().trim() || '-',
          poDate: (po.created || po.date || '').toString().split('T')[0] || '-',
          dueDate: (po.dueDate || po.jatuhTempo || '').toString().split('T')[0] || '-',
          totalAmount: total,
          totalPaid: paid,
          totalOutstanding: outstanding,
          status: outstanding > 0 ? 'OUTSTANDING' : 'LUNAS',
        };
      })
      .filter((item: any) => item.totalOutstanding > 0); // Only outstanding

    console.log('[ReportDataFetcher] 💰 getAPOutstandingData - Records:', normalizedData.length);
    
    // Format dengan column headers seperti export
    return normalizedData.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'NO. PO': item.poNo,
      'SUPPLIER': item.supplierName,
      'TANGGAL': item.poDate,
      'JATUH TEMPO': item.dueDate,
      'TOTAL': item.totalAmount,
      'TERBAYAR': item.totalPaid,
      'SISA HUTANG': item.totalOutstanding,
      'STATUS': item.status,
    }));
  },

  // AP DUE DATA
  async getAPDueData(startDate: string, endDate: string) {
    const posRaw = await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS);
    const paymentsRaw = await storageService.get(StorageKeys.PACKAGING.PAYMENTS);
    
    const pos = extractStorageValue(posRaw) || [];
    const payments = extractStorageValue(paymentsRaw) || [];

    console.log('[ReportDataFetcher] 💰 getAPDueData - POs:', (pos as any)?.length);

    // Build payments map
    const paymentsMap = new Map<string, number>();
    (payments as any[]).forEach((p: any) => {
      const poNo = (p.poNo || p.referenceNo || '').toString().trim();
      if (poNo) {
        paymentsMap.set(poNo, (paymentsMap.get(poNo) || 0) + (p.amount || 0));
      }
    });

    // Filter dengan logic yang sama seperti filterByDateRange di report-service
    const filtered = (pos as any[]).filter((item: any) => {
      let dateValue = item.created || item.date;
      if (!dateValue) return false;
      
      let dateStr = dateValue;
      if (typeof dateValue === 'number') {
        dateStr = new Date(dateValue).toISOString().split('T')[0];
      } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateStr = dateValue.split('T')[0];
      }
      
      return dateStr >= startDate && dateStr <= endDate;
    });

    const today = new Date();
    const normalizedData = filtered
      .map((po: any) => {
        const poNo = (po.poNo || po.no || '').toString().trim() || '-';
        const total = po.bom?.total || po.totalAmount || po.financialSummary?.grandTotal || po.total || 0;
        const paid = paymentsMap.get(poNo) || (po.paymentStatus === 'PAID' ? total : 0);
        const outstanding = total - paid;
        const dueDate = new Date((po.dueDate || po.jatuhTempo || po.created || po.date || '').toString().split('T')[0]);
        
        return {
          poNo: poNo,
          supplierName: (po.supplier || po.supplierName || '').toString().trim() || '-',
          dueDate: dueDate.toISOString().split('T')[0],
          totalOutstanding: outstanding,
          status: dueDate <= today && outstanding > 0 ? 'OVERDUE' : 'DUE',
        };
      })
      .filter((item: any) => item.totalOutstanding > 0); // Only with outstanding

    console.log('[ReportDataFetcher] 💰 getAPDueData - Records:', normalizedData.length);
    
    // Format dengan column headers seperti export
    return normalizedData.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'NO. PO': item.poNo,
      'SUPPLIER': item.supplierName,
      'JATUH TEMPO': item.dueDate,
      'SISA HUTANG': item.totalOutstanding,
      'STATUS': item.status,
    }));
  },

  // AP OVERDUE DATA
  async getAPOverdueData(startDate: string, endDate: string) {
    const posRaw = await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS);
    const paymentsRaw = await storageService.get(StorageKeys.PACKAGING.PAYMENTS);
    
    const pos = extractStorageValue(posRaw) || [];
    const payments = extractStorageValue(paymentsRaw) || [];

    console.log('[ReportDataFetcher] 💰 getAPOverdueData - POs:', (pos as any)?.length);

    // Build payments map
    const paymentsMap = new Map<string, number>();
    (payments as any[]).forEach((p: any) => {
      const poNo = (p.poNo || p.referenceNo || '').toString().trim();
      if (poNo) {
        paymentsMap.set(poNo, (paymentsMap.get(poNo) || 0) + (p.amount || 0));
      }
    });

    // Filter dengan logic yang sama seperti filterByDateRange di report-service
    const filtered = (pos as any[]).filter((item: any) => {
      let dateValue = item.created || item.date;
      if (!dateValue) return false;
      
      let dateStr = dateValue;
      if (typeof dateValue === 'number') {
        dateStr = new Date(dateValue).toISOString().split('T')[0];
      } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateStr = dateValue.split('T')[0];
      }
      
      return dateStr >= startDate && dateStr <= endDate;
    });

    const today = new Date();
    const normalizedData = filtered
      .map((po: any) => {
        const poNo = (po.poNo || po.no || '').toString().trim() || '-';
        const total = po.bom?.total || po.totalAmount || po.financialSummary?.grandTotal || po.total || 0;
        const paid = paymentsMap.get(poNo) || (po.paymentStatus === 'PAID' ? total : 0);
        const outstanding = total - paid;
        const dueDate = new Date((po.dueDate || po.jatuhTempo || po.created || po.date || '').toString().split('T')[0]);
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          poNo: poNo,
          supplierName: (po.supplier || po.supplierName || '').toString().trim() || '-',
          dueDate: dueDate.toISOString().split('T')[0],
          daysOverdue,
          totalOutstanding: outstanding,
        };
      })
      .filter((item: any) => item.daysOverdue > 0 && item.totalOutstanding > 0); // Only overdue with outstanding

    console.log('[ReportDataFetcher] 💰 getAPOverdueData - Records:', normalizedData.length);
    
    // Return dengan format yang sama seperti template engine
    return normalizedData.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'NO. PO': item.poNo,
      'SUPPLIER': item.supplierName,
      'JATUH TEMPO': item.dueDate,
      'HARI OVERDUE': item.daysOverdue,
      'SISA HUTANG': item.totalOutstanding,
      'STATUS': 'OVERDUE',
    }));
  },

  // AP CARD DATA
  async getAPCardData(startDate: string, endDate: string) {
    const posRaw = await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS);
    const paymentsRaw = await storageService.get(StorageKeys.PACKAGING.PAYMENTS);
    
    const pos = extractStorageValue(posRaw) || [];
    const payments = extractStorageValue(paymentsRaw) || [];

    console.log('[ReportDataFetcher] 💰 getAPCardData - POs:', (pos as any)?.length);

    // Build payments map
    const paymentsMap = new Map<string, number>();
    (payments as any[]).forEach((p: any) => {
      const poNo = (p.poNo || p.referenceNo || '').toString().trim();
      if (poNo) {
        paymentsMap.set(poNo, (paymentsMap.get(poNo) || 0) + (p.amount || 0));
      }
    });

    // Filter dengan logic yang sama seperti filterByDateRange di report-service
    const filtered = (pos as any[]).filter((item: any) => {
      let dateValue = item.created || item.date;
      if (!dateValue) return false;
      
      let dateStr = dateValue;
      if (typeof dateValue === 'number') {
        dateStr = new Date(dateValue).toISOString().split('T')[0];
      } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateStr = dateValue.split('T')[0];
      }
      
      return dateStr >= startDate && dateStr <= endDate;
    });

    let runningBalance = 0;
    const normalizedData = filtered.map((po: any) => {
      const poNo = (po.poNo || po.no || '').toString().trim() || '-';
      const total = po.bom?.total || po.totalAmount || po.financialSummary?.grandTotal || po.total || 0;
      const paid = paymentsMap.get(poNo) || (po.paymentStatus === 'PAID' ? total : 0);
      
      runningBalance += total - paid;
      
      return {
        poNo: poNo,
        supplierName: (po.supplier || po.supplierName || '').toString().trim() || '-',
        poDate: (po.created || po.date || '').toString().split('T')[0] || '-',
        debit: total,
        credit: paid,
        balance: runningBalance,
      };
    });

    console.log('[ReportDataFetcher] 💰 getAPCardData - Records:', normalizedData.length);
    
    // Return dengan format yang sama seperti template engine
    return normalizedData.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'NO. PO': item.poNo,
      'SUPPLIER': item.supplierName,
      'TANGGAL': item.poDate,
      'DEBIT': item.debit,
      'KREDIT': item.credit,
      'SALDO': item.balance,
    }));
  },

  // AP ANALYSIS DATA
  async getAPAnalysisData(startDate: string, endDate: string) {
    const posRaw = await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS);
    const paymentsRaw = await storageService.get(StorageKeys.PACKAGING.PAYMENTS);
    
    const pos = extractStorageValue(posRaw) || [];
    const payments = extractStorageValue(paymentsRaw) || [];

    console.log('[ReportDataFetcher] 💰 getAPAnalysisData - POs:', (pos as any)?.length);

    // Build payments map
    const paymentsMap = new Map<string, number>();
    (payments as any[]).forEach((p: any) => {
      const poNo = (p.poNo || p.referenceNo || '').toString().trim();
      if (poNo) {
        paymentsMap.set(poNo, (paymentsMap.get(poNo) || 0) + (p.amount || 0));
      }
    });

    // Filter dengan logic yang sama seperti filterByDateRange di report-service
    const filtered = (pos as any[]).filter((item: any) => {
      let dateValue = item.created || item.date;
      if (!dateValue) return false;
      
      let dateStr = dateValue;
      if (typeof dateValue === 'number') {
        dateStr = new Date(dateValue).toISOString().split('T')[0];
      } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateStr = dateValue.split('T')[0];
      }
      
      return dateStr >= startDate && dateStr <= endDate;
    });

    // Aggregate by supplier
    const supplierMap = new Map<string, any>();
    filtered.forEach((po: any) => {
      const supplier = (po.supplier || po.supplierName || '').toString().trim() || 'Unknown';
      const poNo = (po.poNo || po.no || '').toString().trim() || '-';
      const total = po.bom?.total || po.totalAmount || po.financialSummary?.grandTotal || po.total || 0;
      const paid = paymentsMap.get(poNo) || (po.paymentStatus === 'PAID' ? total : 0);
      const outstanding = total - paid;
      
      if (!supplierMap.has(supplier)) {
        supplierMap.set(supplier, {
          supplierName: supplier,
          totalHutang: 0,
          totalTerbayar: 0,
          totalSisa: 0,
        });
      }
      
      const data = supplierMap.get(supplier)!;
      data.totalHutang += total;
      data.totalTerbayar += paid;
      data.totalSisa += outstanding;
    });

    const totalHutang = Array.from(supplierMap.values()).reduce((sum, s) => sum + s.totalHutang, 0);
    const normalizedData = Array.from(supplierMap.values()).map((item: any) => ({
      ...item,
      persentase: totalHutang > 0 ? (item.totalHutang / totalHutang) * 100 : 0,
    }));

    console.log('[ReportDataFetcher] 💰 getAPAnalysisData - Suppliers:', normalizedData.length);
    
    // Return dengan format yang sama seperti template engine
    return normalizedData.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'SUPPLIER': item.supplierName,
      'TOTAL HUTANG': item.totalHutang,
      'TOTAL TERBAYAR': item.totalTerbayar,
      'SISA HUTANG': item.totalSisa,
      'PERSENTASE %': Math.round(item.persentase * 100) / 100,
    }));
  },
  async getTaxData(startDate: string, endDate: string) {
    const invoices = (await storageService.get(StorageKeys.PACKAGING.INVOICES)) || [];

    // Normalize data
    const normalizedData = (invoices as any[])
      .filter((inv: any) => {
        const invDate = inv.created || inv.date || '';
        return invDate >= startDate && invDate <= endDate;
      })
      .map((inv: any) => ({
        invoiceNo: (inv.invoiceNo || inv.no || '').toString().trim() || '-',
        customer: (inv.customer || inv.customerName || '').toString().trim() || '-',
        tanggal: (inv.created || inv.date || '').toString().split('T')[0] || '-',
        subtotal: inv.financialSummary?.subtotal || inv.subtotal || 0,
        tax: inv.financialSummary?.tax || inv.tax || 0,
        total: inv.financialSummary?.grandTotal || inv.total || 0,
        taxRate: inv.taxRate || 10,
        npwp: (inv.npwp || '').toString().trim() || '-',
      }));

    // Return dengan format yang sama seperti template engine
    return normalizedData.map((item: any, idx: number) => ({
      'No': idx + 1,
      'No. Faktur': item.invoiceNo,
      'Pelanggan': item.customer,
      'Tanggal': item.tanggal,
      'Subtotal': item.subtotal,
      'Tarif Pajak': `${item.taxRate}%`,
      'Pajak': item.tax,
      'Total': item.total,
      'NPWP': item.npwp,
    }));
  },

  // TAX MANAGEMENT - PPN Masukan
  async getTaxPPNMasukanData(startDate: string, endDate: string) {
    const taxRecordsRaw = await storageService.get(StorageKeys.PACKAGING.TAX_RECORDS);
    const taxRecords = extractStorageValue(taxRecordsRaw) || [];

    console.log('[ReportDataFetcher] 💰 getTaxPPNMasukanData - Tax Records:', (taxRecords as any)?.length);

    // Filter PPN Masukan (Input Tax)
    const filtered = (taxRecords as any[])
      .filter((tax: any) => tax.taxType === 'PPN Masukan')
      .filter((tax: any) => {
        let dateValue = tax.taxDate || tax.created || tax.date;
        if (!dateValue) return false;
        
        let dateStr = dateValue;
        if (typeof dateValue === 'number') {
          dateStr = new Date(dateValue).toISOString().split('T')[0];
        } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
          dateStr = dateValue.split('T')[0];
        }
        
        return dateStr >= startDate && dateStr <= endDate;
      });

    const normalizedData = filtered.map((tax: any) => ({
      'Tanggal Pajak': tax.taxDate ? new Date(tax.taxDate).toLocaleDateString('id-ID') : 'N/A',
      'Referensi': (tax.reference || tax.referenceNo || '').toString().trim() || 'N/A',
      'Supplier': (tax.supplier || tax.supplierName || '').toString().trim() || 'Unknown',
      'Dasar Pengenaan': tax.baseAmount || tax.dpp || 0,
      'Tarif %': tax.taxPercent || tax.taxRate || 10,
      'Jumlah Pajak': tax.taxAmount || tax.amount || 0,
      'Status': (tax.status || 'Open').toString().trim(),
    }));

    console.log('[ReportDataFetcher] 💰 getTaxPPNMasukanData - Records:', normalizedData.length);
    return normalizedData;
  },

  // TAX MANAGEMENT - PPN Keluaran
  async getTaxPPNKeluaranData(startDate: string, endDate: string) {
    const taxRecordsRaw = await storageService.get(StorageKeys.PACKAGING.TAX_RECORDS);
    const taxRecords = extractStorageValue(taxRecordsRaw) || [];

    console.log('[ReportDataFetcher] 💰 getTaxPPNKeluaranData - Tax Records:', (taxRecords as any)?.length);

    // Filter PPN Keluaran (Output Tax)
    const filtered = (taxRecords as any[])
      .filter((tax: any) => tax.taxType === 'PPN Keluaran')
      .filter((tax: any) => {
        let dateValue = tax.taxDate || tax.created || tax.date;
        if (!dateValue) return false;
        
        let dateStr = dateValue;
        if (typeof dateValue === 'number') {
          dateStr = new Date(dateValue).toISOString().split('T')[0];
        } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
          dateStr = dateValue.split('T')[0];
        }
        
        return dateStr >= startDate && dateStr <= endDate;
      });

    const normalizedData = filtered.map((tax: any) => ({
      'Tanggal Pajak': tax.taxDate ? new Date(tax.taxDate).toLocaleDateString('id-ID') : 'N/A',
      'Referensi': (tax.reference || tax.referenceNo || '').toString().trim() || 'N/A',
      'Pelanggan': (tax.customer || tax.customerName || '').toString().trim() || 'Unknown',
      'Dasar Pengenaan': tax.baseAmount || tax.dpp || 0,
      'Tarif %': tax.taxPercent || tax.taxRate || 10,
      'Jumlah Pajak': tax.taxAmount || tax.amount || 0,
      'Status': (tax.status || 'Open').toString().trim(),
    }));

    console.log('[ReportDataFetcher] 💰 getTaxPPNKeluaranData - Records:', normalizedData.length);
    return normalizedData;
  },

  // TAX MANAGEMENT - SPT Masa PPN
  async getTaxSPTMasaPPNData(startDate: string, endDate: string) {
    const taxRecordsRaw = await storageService.get(StorageKeys.PACKAGING.TAX_RECORDS);
    const taxRecords = extractStorageValue(taxRecordsRaw) || [];

    console.log('[ReportDataFetcher] 💰 getTaxSPTMasaPPNData - Tax Records:', (taxRecords as any)?.length);

    // Filter both PPN Masukan and Keluaran
    const ppnMasukan = (taxRecords as any[])
      .filter((tax: any) => tax.taxType === 'PPN Masukan')
      .filter((tax: any) => {
        let dateValue = tax.taxDate || tax.created || tax.date;
        if (!dateValue) return false;
        
        let dateStr = dateValue;
        if (typeof dateValue === 'number') {
          dateStr = new Date(dateValue).toISOString().split('T')[0];
        } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
          dateStr = dateValue.split('T')[0];
        }
        
        return dateStr >= startDate && dateStr <= endDate;
      });

    const ppnKeluaran = (taxRecords as any[])
      .filter((tax: any) => tax.taxType === 'PPN Keluaran')
      .filter((tax: any) => {
        let dateValue = tax.taxDate || tax.created || tax.date;
        if (!dateValue) return false;
        
        let dateStr = dateValue;
        if (typeof dateValue === 'number') {
          dateStr = new Date(dateValue).toISOString().split('T')[0];
        } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
          dateStr = dateValue.split('T')[0];
        }
        
        return dateStr >= startDate && dateStr <= endDate;
      });

    const totalMasukan = ppnMasukan.reduce((sum: number, tax: any) => sum + (tax.amount || 0), 0);
    const totalKeluaran = ppnKeluaran.reduce((sum: number, tax: any) => sum + (tax.amount || 0), 0);
    const ppnTerhutang = totalKeluaran - totalMasukan;

    const normalizedData = [
      {
        'Keterangan': 'PPN Masukan',
        'Jumlah': totalMasukan,
      },
      {
        'Keterangan': 'PPN Keluaran',
        'Jumlah': totalKeluaran,
      },
      {
        'Keterangan': 'PPN Terhutang',
        'Jumlah': ppnTerhutang,
      },
    ];

    console.log('[ReportDataFetcher] 💰 getTaxSPTMasaPPNData - Records:', normalizedData.length);
    return normalizedData;
  },

  // TAX MANAGEMENT - e-Faktur
  async getTaxEFakturData(startDate: string, endDate: string) {
    const taxRecordsRaw = await storageService.get(StorageKeys.PACKAGING.TAX_RECORDS);
    const taxRecords = extractStorageValue(taxRecordsRaw) || [];

    console.log('[ReportDataFetcher] 💰 getTaxEFakturData - Tax Records:', (taxRecords as any)?.length);

    // Filter e-Faktur records
    const filtered = (taxRecords as any[])
      .filter((tax: any) => tax.taxType === 'e-Faktur' || tax.type === 'e-Faktur')
      .filter((tax: any) => {
        let dateValue = tax.taxDate || tax.created || tax.date;
        if (!dateValue) return false;
        
        let dateStr = dateValue;
        if (typeof dateValue === 'number') {
          dateStr = new Date(dateValue).toISOString().split('T')[0];
        } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
          dateStr = dateValue.split('T')[0];
        }
        
        return dateStr >= startDate && dateStr <= endDate;
      });

    const normalizedData = filtered.map((tax: any) => ({
      'Nomor Faktur': (tax.reference || tax.referenceNo || '').toString().trim() || 'N/A',
      'Tanggal Faktur': tax.taxDate ? new Date(tax.taxDate).toLocaleDateString('id-ID') : 'N/A',
      'Pelanggan': (tax.customer || tax.customerName || '').toString().trim() || 'Unknown',
      'Dasar Pengenaan': tax.baseAmount || tax.dpp || 0,
      'PPN': tax.taxAmount || tax.amount || 0,
      'Total': (tax.baseAmount || tax.dpp || 0) + (tax.taxAmount || tax.amount || 0),
      'Status': (tax.status || 'Open').toString().trim(),
    }));

    console.log('[ReportDataFetcher] 💰 getTaxEFakturData - Records:', normalizedData.length);
    return normalizedData;
  },

  // TAX MANAGEMENT - CSV Faktur Pajak
  async getTaxCSVFakturData(startDate: string, endDate: string) {
    const taxRecordsRaw = await storageService.get(StorageKeys.PACKAGING.TAX_RECORDS);
    const taxRecords = extractStorageValue(taxRecordsRaw) || [];

    console.log('[ReportDataFetcher] 💰 getTaxCSVFakturData - Tax Records:', (taxRecords as any)?.length);

    // Filter CSV Faktur records
    const filtered = (taxRecords as any[])
      .filter((tax: any) => tax.taxType === 'CSV Faktur' || tax.type === 'CSV Faktur')
      .filter((tax: any) => {
        let dateValue = tax.taxDate || tax.created || tax.date;
        if (!dateValue) return false;
        
        let dateStr = dateValue;
        if (typeof dateValue === 'number') {
          dateStr = new Date(dateValue).toISOString().split('T')[0];
        } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
          dateStr = dateValue.split('T')[0];
        }
        
        return dateStr >= startDate && dateStr <= endDate;
      });

    const normalizedData = filtered.map((tax: any) => ({
      'Tanggal': tax.taxDate ? new Date(tax.taxDate).toLocaleDateString('id-ID') : 'N/A',
      'Nomor Referensi': (tax.reference || tax.referenceNo || '').toString().trim() || 'N/A',
      'Tipe': (tax.taxType || 'N/A').toString().trim(),
      'Jenis Referensi': (tax.referenceType || 'Invoice').toString().trim(),
      'Pihak': (tax.customer || tax.customerName || tax.supplier || tax.supplierName || '').toString().trim() || 'Unknown',
      'Dasar Pengenaan': tax.baseAmount || tax.dpp || 0,
      'Tarif': `${tax.taxPercent || tax.taxRate || 10}%`,
      'Jumlah Pajak': tax.taxAmount || tax.amount || 0,
      'Total': (tax.baseAmount || tax.dpp || 0) + (tax.taxAmount || tax.amount || 0),
      'Status': (tax.status || 'Open').toString().trim(),
    }));

    console.log('[ReportDataFetcher] 💰 getTaxCSVFakturData - Records:', normalizedData.length);
    return normalizedData;
  },

  // PRODUCTION DATA
  async getProductionSPKData(startDate: string, endDate: string) {
    const spks = (await storageService.get(StorageKeys.PACKAGING.SPK)) || [];
    
    // Filter dengan logic yang sama seperti filterByDateRange di report-service
    const filtered = (spks as any[]).filter((item: any) => {
      let dateValue = item.created || item.date;
      if (!dateValue) return false;
      
      let dateStr = dateValue;
      if (typeof dateValue === 'number') {
        dateStr = new Date(dateValue).toISOString().split('T')[0];
      } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateStr = dateValue.split('T')[0];
      }
      
      return dateStr >= startDate && dateStr <= endDate;
    });
    
    const normalizedData = filtered
      .map((spk: any) => ({
        spkNo: (spk.spkNo || spk.no || '').toString().trim() || '-',
        soNo: (spk.soNo || spk.referenceNo || '').toString().trim() || '-',
        product: (spk.product || spk.productName || '').toString().trim() || '-',
        qty: spk.quantity || spk.qty || 0,
        status: (spk.status || 'DRAFT').toString().trim(),
        tanggal: (spk.created || spk.date || '').toString().split('T')[0] || '-',
      }));

    return normalizedData.map((item: any, idx: number) => ({
      'No': idx + 1,
      'No. SPK': item.spkNo,
      'No. SO': item.soNo,
      'Produk': item.product,
      'Qty': item.qty,
      'Status': item.status,
      'Tanggal': item.tanggal,
    }));
  },

  async getProductionQCData(startDate: string, endDate: string) {
    const qcs = (await storageService.get(StorageKeys.PACKAGING.QC)) || [];
    
    // Filter dengan logic yang sama seperti filterByDateRange di report-service
    const filtered = (qcs as any[]).filter((item: any) => {
      let dateValue = item.created || item.date;
      if (!dateValue) return false;
      
      let dateStr = dateValue;
      if (typeof dateValue === 'number') {
        dateStr = new Date(dateValue).toISOString().split('T')[0];
      } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateStr = dateValue.split('T')[0];
      }
      
      return dateStr >= startDate && dateStr <= endDate;
    });
    
    const normalizedData = filtered
      .map((qc: any) => ({
        qcNo: (qc.qcNo || qc.no || '').toString().trim() || '-',
        spkNo: (qc.spkNo || qc.referenceNo || '').toString().trim() || '-',
        product: (qc.product || qc.productName || '').toString().trim() || '-',
        qty: qc.quantity || qc.qty || 0,
        status: (qc.status || 'PENDING').toString().trim(),
        tanggal: (qc.created || qc.date || '').toString().split('T')[0] || '-',
      }));

    return normalizedData.map((item: any, idx: number) => ({
      'No': idx + 1,
      'No. QC': item.qcNo,
      'No. SPK': item.spkNo,
      'Produk': item.product,
      'Qty': item.qty,
      'Status': item.status,
      'Tanggal': item.tanggal,
    }));
  },

  async getProductionCostData(startDate: string, endDate: string) {
    const spks = (await storageService.get(StorageKeys.PACKAGING.SPK)) || [];
    
    // Filter dengan logic yang sama seperti filterByDateRange di report-service
    const filtered = (spks as any[]).filter((item: any) => {
      let dateValue = item.created || item.date;
      if (!dateValue) return false;
      
      let dateStr = dateValue;
      if (typeof dateValue === 'number') {
        dateStr = new Date(dateValue).toISOString().split('T')[0];
      } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateStr = dateValue.split('T')[0];
      }
      
      return dateStr >= startDate && dateStr <= endDate;
    });
    
    const normalizedData = filtered
      .map((spk: any) => ({
        spkNo: (spk.spkNo || spk.no || '').toString().trim() || '-',
        product: (spk.product || spk.productName || '').toString().trim() || '-',
        qty: spk.quantity || spk.qty || 0,
        materialCost: spk.materialCost || 0,
        laborCost: spk.laborCost || 0,
        overheadCost: spk.overheadCost || 0,
        totalCost: (spk.materialCost || 0) + (spk.laborCost || 0) + (spk.overheadCost || 0),
      }));

    return normalizedData.map((item: any, idx: number) => ({
      'No': idx + 1,
      'No. SPK': item.spkNo,
      'Produk': item.product,
      'Qty': item.qty,
      'Material Cost': item.materialCost,
      'Labor Cost': item.laborCost,
      'Overhead Cost': item.overheadCost,
      'Total Cost': item.totalCost,
    }));
  },

  async getProductionMaterialUsageData(startDate: string, endDate: string) {
    const spks = (await storageService.get(StorageKeys.PACKAGING.SPK)) || [];
    const items: any[] = [];
    
    // Filter dengan logic yang sama seperti filterByDateRange di report-service
    const filtered = (spks as any[]).filter((item: any) => {
      let dateValue = item.created || item.date;
      if (!dateValue) return false;
      
      let dateStr = dateValue;
      if (typeof dateValue === 'number') {
        dateStr = new Date(dateValue).toISOString().split('T')[0];
      } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateStr = dateValue.split('T')[0];
      }
      
      return dateStr >= startDate && dateStr <= endDate;
    });
    
    filtered.forEach((spk: any) => {
      const spkNo = (spk.spkNo || spk.no || '').toString().trim() || '-';
      const tanggal = (spk.created || spk.date || '').toString().split('T')[0] || '-';

      (spk.materials || spk.bom || []).forEach((material: any) => {
        items.push({
          spkNo,
          tanggal,
          material: (material.materialName || material.name || '').toString().trim() || '-',
          qty: material.quantity || material.qty || 0,
          unit: (material.unit || material.satuan || '').toString().trim() || '-',
          cost: material.cost || 0,
        });
      });
    });

    return items.map((item: any, idx: number) => ({
      'No': idx + 1,
      'No. SPK': item.spkNo,
      'Tanggal': item.tanggal,
      'Material': item.material,
      'Qty': item.qty,
      'Unit': item.unit,
      'Cost': item.cost,
    }));
  },

  async getProductionWasteData(startDate: string, endDate: string) {
    const wastes = (await storageService.get(StorageKeys.PACKAGING.RETURNS)) || [];
    
    // Filter dengan logic yang sama seperti filterByDateRange di report-service
    const filtered = (wastes as any[]).filter((item: any) => {
      let dateValue = item.created || item.date;
      if (!dateValue) return false;
      
      let dateStr = dateValue;
      if (typeof dateValue === 'number') {
        dateStr = new Date(dateValue).toISOString().split('T')[0];
      } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateStr = dateValue.split('T')[0];
      }
      
      return dateStr >= startDate && dateStr <= endDate;
    });
    
    const normalizedData = filtered
      .map((w: any) => ({
        wasteNo: (w.wasteNo || w.no || '').toString().trim() || '-',
        spkNo: (w.spkNo || w.referenceNo || '').toString().trim() || '-',
        product: (w.product || w.productName || '').toString().trim() || '-',
        qty: w.quantity || w.qty || 0,
        reason: (w.reason || w.keterangan || '').toString().trim() || '-',
        tanggal: (w.created || w.date || '').toString().split('T')[0] || '-',
      }));

    return normalizedData.map((item: any, idx: number) => ({
      'No': idx + 1,
      'No. Waste': item.wasteNo,
      'No. SPK': item.spkNo,
      'Produk': item.product,
      'Qty': item.qty,
      'Alasan': item.reason,
      'Tanggal': item.tanggal,
    }));
  },

  // DELIVERY DATA
  async getDeliveryData(startDate: string, endDate: string) {
    const deliveries = (await storageService.get(StorageKeys.PACKAGING.DELIVERY)) || [];
    
    const normalizedData = (deliveries as any[])
      .filter((dn: any) => {
        const dnDate = dn.created || dn.date || '';
        return dnDate >= startDate && dnDate <= endDate;
      })
      .map((dn: any) => ({
        dnNo: (dn.dnNo || dn.no || '').toString().trim() || '-',
        soNo: (dn.soNo || dn.referenceNo || '').toString().trim() || '-',
        customer: (dn.customer || dn.customerName || '').toString().trim() || '-',
        qty: (dn.items || []).reduce((sum: number, item: any) => sum + (item.qty || 0), 0),
        status: (dn.status || 'PENDING').toString().trim(),
        tanggal: (dn.created || dn.date || '').toString().split('T')[0] || '-',
      }));

    return normalizedData.map((item: any, idx: number) => ({
      'No': idx + 1,
      'No. DN': item.dnNo,
      'No. SO': item.soNo,
      'Pelanggan': item.customer,
      'Qty': item.qty,
      'Status': item.status,
      'Tanggal': item.tanggal,
    }));
  },

  // PURCHASE DATA
  async getPurchaseOrdersData(startDate: string, endDate: string) {
    const posRaw = await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS);
    const pos = extractStorageValue(posRaw) || [];
    
    const normalizedData = (pos as any[])
      .filter((po: any) => {
        const poDate = po.created || po.date || '';
        return poDate >= startDate && poDate <= endDate;
      })
      .map((po: any) => ({
        poNo: (po.poNo || po.no || '').toString().trim() || '-',
        supplier: (po.supplier || po.supplierName || '').toString().trim() || '-',
        materialItem: (po.materialItem || po.material || '').toString().trim() || '-',
        created: (po.created || po.date || '').toString().split('T')[0] || '-',
        qty: po.qty || po.quantity || 0,
        price: po.price || po.unitPrice || 0,
        total: po.total || (po.qty || po.quantity || 0) * (po.price || po.unitPrice || 0),
        status: (po.status || 'OPEN').toString().trim(),
      }));

    return normalizedData.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'NO. PO': item.poNo,
      'SUPPLIER': item.supplier,
      'MATERIAL': item.materialItem,
      'TANGGAL': item.created,
      'QTY': item.qty,
      'HARGA': item.price,
      'TOTAL': item.total,
      'STATUS': item.status,
    }));
  },

  async getPurchaseOrdersPerItemData(startDate: string, endDate: string) {
    const pos = (await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS)) || [];
    
    const normalizedData = (pos as any[])
      .filter((po: any) => {
        const poDate = po.created || po.date || '';
        return poDate >= startDate && poDate <= endDate;
      })
      .map((po: any) => ({
        poNo: (po.poNo || po.no || '').toString().trim() || '-',
        supplier: (po.supplier || po.supplierName || '').toString().trim() || '-',
        materialItem: (po.materialItem || po.material || '').toString().trim() || '-',
        qty: po.qty || po.quantity || 0,
        price: po.price || po.unitPrice || 0,
        total: po.total || (po.qty || po.quantity || 0) * (po.price || po.unitPrice || 0),
      }));

    return normalizedData.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'NO. PO': item.poNo,
      'SUPPLIER': item.supplier,
      'MATERIAL': item.materialItem,
      'QTY': item.qty,
      'HARGA': item.price,
      'TOTAL': item.total,
    }));
  },

  async getPurchaseReturnData(startDate: string, endDate: string) {
    const returns = (await storageService.get(StorageKeys.PACKAGING.RETURNS)) || [];
    
    const normalizedData = (returns as any[])
      .filter((ret: any) => {
        const returnDate = ret.created || ret.date || '';
        return returnDate >= startDate && returnDate <= endDate;
      })
      .map((ret: any) => ({
        returnNo: (ret.returnNo || ret.no || '').toString().trim() || '-',
        supplier: (ret.supplier || ret.supplierName || '').toString().trim() || '-',
        materialItem: (ret.materialItem || ret.material || '').toString().trim() || '-',
        qty: ret.qty || ret.quantity || 0,
        price: ret.price || ret.unitPrice || 0,
        total: ret.total || (ret.qty || ret.quantity || 0) * (ret.price || ret.unitPrice || 0),
      }));

    return normalizedData.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'NO. RETUR': item.returnNo,
      'SUPPLIER': item.supplier,
      'MATERIAL': item.materialItem,
      'QTY': item.qty,
      'HARGA': item.price,
      'TOTAL': item.total,
    }));
  },

  async getPurchaseReturnPerItemData(startDate: string, endDate: string) {
    const returns = (await storageService.get(StorageKeys.PACKAGING.RETURNS)) || [];
    
    const normalizedData = (returns as any[])
      .filter((ret: any) => {
        const returnDate = ret.created || ret.date || '';
        return returnDate >= startDate && returnDate <= endDate;
      })
      .map((ret: any) => ({
        returnNo: (ret.returnNo || ret.no || '').toString().trim() || '-',
        supplier: (ret.supplier || ret.supplierName || '').toString().trim() || '-',
        materialItem: (ret.materialItem || ret.material || '').toString().trim() || '-',
        qty: ret.qty || ret.quantity || 0,
        price: ret.price || ret.unitPrice || 0,
        total: ret.total || (ret.qty || ret.quantity || 0) * (ret.price || ret.unitPrice || 0),
      }));

    return normalizedData.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'NO. RETUR': item.returnNo,
      'SUPPLIER': item.supplier,
      'MATERIAL': item.materialItem,
      'QTY': item.qty,
      'HARGA': item.price,
      'TOTAL': item.total,
    }));
  },

  async getPurchasePerSupplierData(startDate: string, endDate: string) {
    const pos = (await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS)) || [];
    
    const supplierMap = new Map<string, { count: number; totalQty: number; totalAmount: number; avgPrice: number }>();
    
    (pos as any[])
      .filter((po: any) => {
        const poDate = po.created || po.date || '';
        return poDate >= startDate && poDate <= endDate;
      })
      .forEach((po: any) => {
        const supplier = (po.supplier || po.supplierName || '').toString().trim();
        if (supplier) {
          const existing = supplierMap.get(supplier) || { count: 0, totalQty: 0, totalAmount: 0, avgPrice: 0 };
          const newCount = existing.count + 1;
          const newTotal = existing.totalAmount + (po.total || 0);
          supplierMap.set(supplier, {
            count: newCount,
            totalQty: existing.totalQty + (po.qty || po.quantity || 0),
            totalAmount: newTotal,
            avgPrice: newTotal / newCount,
          });
        }
      });

    const totalAmount = Array.from(supplierMap.values()).reduce((sum, s) => sum + s.totalAmount, 0);

    const normalized = Array.from(supplierMap.entries())
      .map(([supplier, data], idx) => {
        const percentage = totalAmount > 0 ? (data.totalAmount / totalAmount) * 100 : 0;
        const avgQtyPerPO = data.count > 0 ? Math.round(data.totalQty / data.count) : 0;
        return {
          'NO': idx + 1,
          'SUPPLIER': supplier,
          'JUMLAH PO': data.count,
          'TOTAL QTY': data.totalQty,
          'RATA-RATA QTY/PO': avgQtyPerPO,
          'TOTAL PEMBELIAN': Math.round(data.totalAmount),
          'RATA-RATA HARGA': Math.round(data.avgPrice),
          'SHARE %': Math.round(percentage * 10) / 10,
        };
      })
      .sort((a, b) => (b['TOTAL PEMBELIAN'] || 0) - (a['TOTAL PEMBELIAN'] || 0));

    return normalized;
  },

  async getPurchasePerItemSupplierData(startDate: string, endDate: string) {
    const pos = (await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS)) || [];
    
    const itemSupplierMap = new Map<string, any[]>();
    (pos as any[])
      .filter((po: any) => {
        const poDate = po.created || po.date || '';
        return poDate >= startDate && poDate <= endDate;
      })
      .forEach((po: any) => {
        const key = `${po.materialItem || po.material}|${po.supplier || po.supplierName}`;
        if (!itemSupplierMap.has(key)) {
          itemSupplierMap.set(key, []);
        }
        itemSupplierMap.get(key)!.push(po);
      });

    const normalized = Array.from(itemSupplierMap.entries())
      .map(([key, items], idx) => {
        const [material, supplier] = key.split('|');
        const totalQty = items.reduce((sum, item) => sum + (item.qty || item.quantity || 0), 0);
        const totalAmount = items.reduce((sum, item) => sum + (item.total || 0), 0);
        const avgPrice = items.length > 0 ? totalAmount / totalQty : 0;
        const unitPrice = items.length > 0 ? items[0].price || items[0].unitPrice || 0 : 0;
        
        return {
          'NO': idx + 1,
          'MATERIAL': material || '-',
          'SUPPLIER': supplier || '-',
          'JUMLAH PO': items.length,
          'TOTAL QTY': totalQty,
          'HARGA SATUAN': Math.round(unitPrice),
          'RATA-RATA HARGA': Math.round(avgPrice),
          'TOTAL PEMBELIAN': Math.round(totalAmount),
        };
      })
      .sort((a, b) => (b['TOTAL PEMBELIAN'] || 0) - (a['TOTAL PEMBELIAN'] || 0));

    return normalized;
  },

  async getPurchaseChartTopItemsData(startDate: string, endDate: string) {
    const pos = (await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS)) || [];
    const itemMap = new Map<string, { qty: number; total: number; count: number }>();
    
    (pos as any[])
      .filter((po: any) => {
        const poDate = po.created || po.date || '';
        return poDate >= startDate && poDate <= endDate;
      })
      .forEach((po: any) => {
        const material = (po.materialItem || po.material || '').toString().trim();
        if (material) {
          const existing = itemMap.get(material) || { qty: 0, total: 0, count: 0 };
          itemMap.set(material, { 
            qty: existing.qty + (po.qty || po.quantity || 0), 
            total: existing.total + (po.total || 0),
            count: existing.count + 1,
          });
        }
      });

    const totalAmount = Array.from(itemMap.values()).reduce((sum, item) => sum + item.total, 0);

    const normalized = Array.from(itemMap.entries())
      .map(([material, data], idx) => {
        const percentage = totalAmount > 0 ? (data.total / totalAmount) * 100 : 0;
        const avgPrice = data.qty > 0 ? data.total / data.qty : 0;
        return {
          'NO': idx + 1,
          'MATERIAL': material,
          'JUMLAH PO': data.count,
          'TOTAL QTY': data.qty,
          'RATA-RATA HARGA': Math.round(avgPrice),
          'TOTAL PEMBELIAN': Math.round(data.total),
          'SHARE %': Math.round(percentage * 10) / 10,
        };
      })
      .sort((a, b) => (b['TOTAL PEMBELIAN'] || 0) - (a['TOTAL PEMBELIAN'] || 0))
      .slice(0, 10);

    return normalized;
  },

  async getPurchaseChartDailyData(startDate: string, endDate: string) {
    const pos = (await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS)) || [];
    const dailyMap = new Map<string, { 
      count: number; 
      totalQty: number; 
      totalAmount: number;
      suppliers: Set<string>;
    }>();
    
    (pos as any[])
      .filter((po: any) => {
        const poDate = po.created || po.date || '';
        return poDate >= startDate && poDate <= endDate;
      })
      .forEach((po: any) => {
        const date = (po.created || po.date || '').toString().split('T')[0] || '-';
        const supplier = (po.supplier || po.supplierName || '').toString().trim();
        const existing = dailyMap.get(date) || { count: 0, totalQty: 0, totalAmount: 0, suppliers: new Set() };
        existing.suppliers.add(supplier);
        dailyMap.set(date, { 
          count: existing.count + 1, 
          totalQty: existing.totalQty + (po.qty || po.quantity || 0), 
          totalAmount: existing.totalAmount + (po.total || 0),
          suppliers: existing.suppliers,
        });
      });

    const dailyDataRaw = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ 
        date, 
        count: data.count,
        totalQty: data.totalQty,
        totalAmount: data.totalAmount,
        uniqueSuppliers: data.suppliers.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const dailyData = dailyDataRaw.map((item, idx) => {
      const prevDay = idx > 0 ? dailyDataRaw[idx - 1] : null;
      const growth = prevDay && prevDay.totalAmount > 0 ? ((item.totalAmount - prevDay.totalAmount) / prevDay.totalAmount) * 100 : 0;
      const avgPerTransaction = item.count > 0 ? item.totalAmount / item.count : 0;
      const allAmounts = dailyDataRaw.map(d => d.totalAmount);
      const avgAmount = allAmounts.reduce((a, b) => a + b, 0) / allAmounts.length;
      let status = 'NORMAL';
      if (item.totalAmount > avgAmount * 1.2) status = 'TINGGI';
      else if (item.totalAmount < avgAmount * 0.8) status = 'RENDAH';
      
      return {
        'NO': idx + 1,
        'HARI': item.date,
        'SUPPLIER UNIK': item.uniqueSuppliers,
        'ITEM DIBELI': item.totalQty,
        'RATA-RATA/TRANSAKSI': Math.round(avgPerTransaction),
        'PERTUMBUHAN %': Math.round(growth * 10) / 10,
        'STATUS': status,
      };
    });

    return dailyData;
  },

  async getPurchaseChartMonthlyData(startDate: string, endDate: string) {
    const pos = (await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS)) || [];
    const monthlyMap = new Map<string, { 
      count: number; 
      totalQty: number; 
      totalAmount: number;
      suppliers: Set<string>;
    }>();
    
    (pos as any[])
      .filter((po: any) => {
        const poDate = po.created || po.date || '';
        return poDate >= startDate && poDate <= endDate;
      })
      .forEach((po: any) => {
        const month = (po.created || po.date || '').toString().split('T')[0].substring(0, 7) || '-';
        const supplier = (po.supplier || po.supplierName || '').toString().trim();
        const existing = monthlyMap.get(month) || { count: 0, totalQty: 0, totalAmount: 0, suppliers: new Set() };
        existing.suppliers.add(supplier);
        monthlyMap.set(month, { 
          count: existing.count + 1, 
          totalQty: existing.totalQty + (po.qty || po.quantity || 0), 
          totalAmount: existing.totalAmount + (po.total || 0),
          suppliers: existing.suppliers,
        });
      });

    const formatMonth = (m: string) => {
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const [year, month] = m.split('-');
      return `${months[parseInt(month) - 1]} ${year}`;
    };

    const monthlyDataRaw = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ 
        month, 
        count: data.count,
        totalQty: data.totalQty,
        totalAmount: data.totalAmount,
        uniqueSuppliers: data.suppliers.size,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    const monthlyData = monthlyDataRaw.map((item, idx) => {
      const prevMonth = idx > 0 ? monthlyDataRaw[idx - 1] : null;
      const growth = prevMonth && prevMonth.totalAmount > 0 ? ((item.totalAmount - prevMonth.totalAmount) / prevMonth.totalAmount) * 100 : 0;
      const avgPerTransaction = item.count > 0 ? item.totalAmount / item.count : 0;
      const allAmounts = monthlyDataRaw.map(d => d.totalAmount);
      const avgAmount = allAmounts.reduce((a, b) => a + b, 0) / allAmounts.length;
      let status = 'NORMAL';
      if (item.totalAmount > avgAmount * 1.2) status = 'TINGGI';
      else if (item.totalAmount < avgAmount * 0.8) status = 'RENDAH';
      
      return {
        'NO': idx + 1,
        'BULAN': formatMonth(item.month),
        'SUPPLIER UNIK': item.uniqueSuppliers,
        'ITEM DIBELI': item.totalQty,
        'RATA-RATA/TRANSAKSI': Math.round(avgPerTransaction),
        'PERTUMBUHAN %': Math.round(growth * 10) / 10,
        'STATUS': status,
      };
    });

    return monthlyData;
  },

  async getPurchaseTaxInvoiceCSVData(startDate: string, endDate: string) {
    const grns = (await storageService.get(StorageKeys.PACKAGING.GRN)) || [];
    
    const normalized = (grns as any[])
      .filter((grn: any) => {
        const grnDate = grn.created || grn.date || '';
        return grnDate >= startDate && grnDate <= endDate;
      })
      .map((grn: any, idx: number) => ({
        'NO': idx + 1,
        'NO. GRN': (grn.grnNo || grn.no || '').toString().trim() || '-',
        'TANGGAL': (grn.created || grn.date || '').toString().split('T')[0] || '-',
        'SUPPLIER': (grn.supplier || grn.supplierName || '').toString().trim() || '-',
        'QTY': grn.qty || grn.qtyReceived || grn.quantity || 0,
        'SUBTOTAL': grn.subtotal || 0,
        'PAJAK': grn.tax || 0,
        'TOTAL': grn.total || 0,
      }));

    return normalized;
  },

  // DELIVERY DATA
  async getDeliveryNoteData(startDate: string, endDate: string) {
    const deliveriesRaw = await storageService.get(StorageKeys.PACKAGING.DELIVERY);
    const deliveries = (extractStorageValue(deliveriesRaw) || []) as any[];
    
    console.log('[ReportDataFetcher] 📦 getDeliveryNoteData - Raw:', (deliveriesRaw as any)?.length, 'Extracted:', deliveries?.length);
    
    // Filter dengan logic yang sama seperti filterByDateRange di report-service
    const filtered = (deliveries as any[]).filter((item: any) => {
      let dateValue = item.created || item.date || item.deliveryDate;
      if (!dateValue) return false;
      
      let dateStr = dateValue;
      if (typeof dateValue === 'number') {
        dateStr = new Date(dateValue).toISOString().split('T')[0];
      } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateStr = dateValue.split('T')[0];
      }
      
      return dateStr >= startDate && dateStr <= endDate;
    });
    
    const flatData = filtered
      .flatMap((dn: any, dnIdx: number) =>
        (dn.items || []).map((item: any, itemIdx: number) => ({
          'No': dnIdx * 100 + itemIdx + 1,
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

    console.log('[ReportDataFetcher] 📦 getDeliveryNoteData - Filtered:', flatData?.length);
    return flatData;
  },

  async getDeliveryPerItemData(startDate: string, endDate: string) {
    const deliveriesRaw = await storageService.get(StorageKeys.PACKAGING.DELIVERY);
    const deliveries = (extractStorageValue(deliveriesRaw) || []) as any[];
    
    console.log('[ReportDataFetcher] 📦 getDeliveryPerItemData - Raw:', (deliveriesRaw as any)?.length, 'Extracted:', deliveries?.length);
    
    // Filter dengan logic yang sama seperti filterByDateRange di report-service
    const filtered = (deliveries as any[]).filter((item: any) => {
      let dateValue = item.created || item.date || item.deliveryDate;
      if (!dateValue) return false;
      
      let dateStr = dateValue;
      if (typeof dateValue === 'number') {
        dateStr = new Date(dateValue).toISOString().split('T')[0];
      } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateStr = dateValue.split('T')[0];
      }
      
      return dateStr >= startDate && dateStr <= endDate;
    });
    
    const flatData = filtered
      .flatMap((dn: any, dnIdx: number) =>
        (dn.items || []).map((item: any, itemIdx: number) => ({
          'NO': dnIdx * 100 + itemIdx + 1,
          'NO. PENGIRIMAN': dn.deliveryNo || dn.dnNo || dn.sjNo || '-',
          'PELANGGAN': dn.customer || dn.customerName || '-',
          'TANGGAL': (dn.deliveryDate || dn.created || dn.date || '-').toString().split('T')[0],
          'KODE ITEM': item.productCode || item.itemCode || item.code || '-',
          'NAMA ITEM': item.product || item.productName || item.itemName || item.name || '-',
          'QTY': item.qty || 0,
          'SATUAN': item.unit || 'PCS',
        }))
      );

    console.log('[ReportDataFetcher] 📦 getDeliveryPerItemData - Filtered:', flatData?.length);
    return flatData;
  },

  async getSuratJalanData(startDate: string, endDate: string) {
    const deliveriesRaw = await storageService.get(StorageKeys.PACKAGING.DELIVERY);
    const deliveries = (extractStorageValue(deliveriesRaw) || []) as any[];
    
    console.log('[ReportDataFetcher] 📦 getSuratJalanData - Raw:', (deliveriesRaw as any)?.length, 'Extracted:', deliveries?.length);
    
    // Filter dengan logic yang sama seperti filterByDateRange di report-service
    const filtered = (deliveries as any[]).filter((item: any) => {
      let dateValue = item.created || item.date || item.deliveryDate;
      if (!dateValue) return false;
      
      let dateStr = dateValue;
      if (typeof dateValue === 'number') {
        dateStr = new Date(dateValue).toISOString().split('T')[0];
      } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateStr = dateValue.split('T')[0];
      }
      
      return dateStr >= startDate && dateStr <= endDate;
    });
    
    const flatData = filtered
      .map((sj: any, idx: number) => ({
        'NO': idx + 1,
        'NO. SURAT JALAN': sj.sjNo || sj.suratJalanNo || sj.no || '-',
        'PELANGGAN': sj.customer || sj.customerName || '-',
        'TANGGAL': (sj.deliveryDate || sj.created || sj.date || '-').toString().split('T')[0],
        'PENGEMUDI': sj.driver || sj.driverName || '-',
        'KENDARAAN': sj.vehicle || sj.vehiclePlate || sj.vehicleNo || '-',
        'ITEM': (sj.items || []).length,
        'QTY': (sj.items || []).reduce((sum: number, item: any) => sum + (item.qty || 0), 0),
        'STATUS': sj.status || 'OPEN',
        'CATATAN': sj.notes || sj.remarks || sj.specNote || '-',
      }));

    console.log('[ReportDataFetcher] 📦 getSuratJalanData - Filtered:', flatData?.length);
    return flatData;
  },

  async getDeliveryByCustomerData(startDate: string, endDate: string) {
    const deliveriesRaw = await storageService.get(StorageKeys.PACKAGING.DELIVERY);
    const deliveries = (extractStorageValue(deliveriesRaw) || []) as any[];
    
    console.log('[ReportDataFetcher] 📦 getDeliveryByCustomerData - Raw:', (deliveriesRaw as any)?.length, 'Extracted:', deliveries?.length);
    
    // Filter dengan logic yang sama seperti filterByDateRange di report-service
    const filtered = (deliveries as any[]).filter((item: any) => {
      let dateValue = item.created || item.date || item.deliveryDate;
      if (!dateValue) return false;
      
      let dateStr = dateValue;
      if (typeof dateValue === 'number') {
        dateStr = new Date(dateValue).toISOString().split('T')[0];
      } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateStr = dateValue.split('T')[0];
      }
      
      return dateStr >= startDate && dateStr <= endDate;
    });
    
    const customerMap = new Map<string, any>();
    
    filtered.forEach((sj: any) => {
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

    console.log('[ReportDataFetcher] 📦 getDeliveryByCustomerData - Filtered:', normalizedData?.length);
    return normalizedData.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'PELANGGAN': item.customer,
      'JUMLAH PENGIRIMAN': item.deliveryCount,
      'JUMLAH ITEM': item.totalItems,
      'TOTAL QTY': item.totalQty,
    }));
  },

  async getDeliveryTrendData(startDate: string, endDate: string) {
    const deliveriesRaw = await storageService.get(StorageKeys.PACKAGING.DELIVERY);
    const deliveries = (extractStorageValue(deliveriesRaw) || []) as any[];
    
    console.log('[ReportDataFetcher] 📦 getDeliveryTrendData - Raw:', (deliveriesRaw as any)?.length, 'Extracted:', deliveries?.length);
    
    // Filter dengan logic yang sama seperti filterByDateRange di report-service
    const filtered = (deliveries as any[]).filter((item: any) => {
      let dateValue = item.created || item.date || item.deliveryDate;
      if (!dateValue) return false;
      
      let dateStr = dateValue;
      if (typeof dateValue === 'number') {
        dateStr = new Date(dateValue).toISOString().split('T')[0];
      } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
        dateStr = dateValue.split('T')[0];
      }
      
      return dateStr >= startDate && dateStr <= endDate;
    });
    
    const dateMap = new Map<string, any>();
    
    filtered.forEach((sj: any) => {
      const date = (sj.created || sj.date || '').toString().split('T')[0] || 'Unknown';
      if (!dateMap.has(date)) {
        dateMap.set(date, {
          date,
          deliveryCount: 0,
          totalItems: 0,
          totalQty: 0,
        });
      }
      
      const entry = dateMap.get(date)!;
      entry.deliveryCount += 1;
      entry.totalItems += (sj.items || []).length;
      entry.totalQty += (sj.items || []).reduce((sum: number, item: any) => sum + (item.qty || 0), 0);
    });

    const normalizedData = Array.from(dateMap.values())
      .sort((a, b) => a.date.localeCompare(b.date));

    console.log('[ReportDataFetcher] 📦 getDeliveryTrendData - Filtered:', normalizedData?.length);
    return normalizedData.map((item: any, idx: number) => ({
      'NO': idx + 1,
      'TANGGAL': item.date,
      'JUMLAH PENGIRIMAN': item.deliveryCount,
      'JUMLAH ITEM': item.totalItems,
      'TOTAL QTY': item.totalQty,
    }));
  },

  // PROFIT & LOSS DATA FETCHERS
  // Best Practice: Tarik dari SALES_ORDERS (revenue) + PURCHASE_ORDERS (cost)
  
  async getProfitPerItemData(startDate: string, endDate: string) {
    const salesOrdersRaw = await storageService.get(StorageKeys.PACKAGING.SALES_ORDERS);
    const posRaw = await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS);
    const productsRaw = await storageService.get('products');
    
    const salesOrders = extractStorageValue(salesOrdersRaw) || [];
    const pos = extractStorageValue(posRaw) || [];
    const products = extractStorageValue(productsRaw) || [];

    console.log('[ReportDataFetcher] 📈 getProfitPerItemData - Sales Orders:', (salesOrders as any)?.length, 'POs:', (pos as any)?.length, 'Products:', (products as any)?.length);

    // Build product lookup map
    const productMap = new Map<string, any>();
    (products as any[]).forEach((prod: any) => {
      const kode = (prod.kode || prod.code || '').toString().trim().toLowerCase();
      const nama = (prod.nama || prod.name || '').toString().trim().toLowerCase();
      if (kode) productMap.set(kode, prod);
      if (nama) productMap.set(nama, prod);
    });

    // Build item revenue map from sales orders
    const itemRevenueMap = new Map<string, { kode: string; nama: string; qty: number; revenue: number; avgPrice: number }>();
    (salesOrders as any[])
      .filter((so: any) => {
        let dateValue = so.created || so.date;
        if (!dateValue) return false;
        let dateStr = dateValue;
        if (typeof dateValue === 'number') dateStr = new Date(dateValue).toISOString().split('T')[0];
        else if (typeof dateValue === 'string' && dateValue.includes('T')) dateStr = dateValue.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .forEach((so: any) => {
        (so.items || []).forEach((item: any) => {
          const productKode = (item.productKode || item.kode || '').toString().trim();
          const productName = (item.productName || item.nama || '').toString().trim();
          const key = productKode || productName;
          
          if (key) {
            const qty = item.qty || 0;
            const price = item.price || 0;
            const total = item.total || (qty * price);
            
            const existing = itemRevenueMap.get(key) || { kode: productKode, nama: productName, qty: 0, revenue: 0, avgPrice: 0 };
            const newQty = existing.qty + qty;
            const newRevenue = existing.revenue + total;
            
            itemRevenueMap.set(key, {
              kode: productKode || existing.kode,
              nama: productName || existing.nama,
              qty: newQty,
              revenue: newRevenue,
              avgPrice: newQty > 0 ? newRevenue / newQty : 0,
            });
          }
        });
      });

    // Build item cost map from purchase orders
    const itemCostMap = new Map<string, { qty: number; cost: number; avgCost: number }>();
    (pos as any[])
      .filter((po: any) => {
        let dateValue = po.created || po.date;
        if (!dateValue) return false;
        let dateStr = dateValue;
        if (typeof dateValue === 'number') dateStr = new Date(dateValue).toISOString().split('T')[0];
        else if (typeof dateValue === 'string' && dateValue.includes('T')) dateStr = dateValue.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .forEach((po: any) => {
        (po.items || []).forEach((item: any) => {
          const productKode = (item.productKode || item.kode || '').toString().trim();
          const productName = (item.productName || item.nama || '').toString().trim();
          const key = productKode || productName;
          
          if (key) {
            const qty = item.qty || 0;
            const price = item.price || 0;
            const total = item.total || (qty * price);
            
            const existing = itemCostMap.get(key) || { qty: 0, cost: 0, avgCost: 0 };
            const newQty = existing.qty + qty;
            const newCost = existing.cost + total;
            
            itemCostMap.set(key, {
              qty: newQty,
              cost: newCost,
              avgCost: newQty > 0 ? newCost / newQty : 0,
            });
          }
        });
      });

    // Merge data
    const allItems = new Set([...itemRevenueMap.keys(), ...itemCostMap.keys()]);
    const profitData = Array.from(allItems).map((itemKey: string) => {
      const revenue = itemRevenueMap.get(itemKey) || { kode: '', nama: '', qty: 0, revenue: 0, avgPrice: 0 };
      const cost = itemCostMap.get(itemKey) || { qty: 0, cost: 0, avgCost: 0 };
      
      const cogs = cost.cost;
      const grossProfit = revenue.revenue - cogs;
      const marginPercent = revenue.revenue > 0 ? (grossProfit / revenue.revenue) * 100 : 0;

      return {
        productKode: revenue.kode || '-',
        productName: revenue.nama || '-',
        qtySold: revenue.qty,
        sellingPrice: revenue.avgPrice,
        revenue: revenue.revenue,
        costPrice: cost.avgCost,
        cogs: cogs,
        grossProfit: grossProfit,
        marginPercent: Math.round(marginPercent * 100) / 100,
      };
    });

    console.log('[ReportDataFetcher] 📈 getProfitPerItemData - Items:', profitData.length, 'Sample:', profitData.slice(0, 2));
    return profitData;
  },

  async getProfitPerCustomerData(startDate: string, endDate: string) {
    const salesOrdersRaw = await storageService.get(StorageKeys.PACKAGING.SALES_ORDERS);
    const posRaw = await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS);
    
    const salesOrders = extractStorageValue(salesOrdersRaw) || [];
    const pos = extractStorageValue(posRaw) || [];

    console.log('[ReportDataFetcher] 📈 getProfitPerCustomerData - Sales Orders:', (salesOrders as any)?.length);

    // Build customer revenue map from sales orders
    const customerRevenueMap = new Map<string, { kode: string; nama: string; revenue: number }>();
    (salesOrders as any[])
      .filter((so: any) => {
        let dateValue = so.created || so.date;
        if (!dateValue) return false;
        let dateStr = dateValue;
        if (typeof dateValue === 'number') dateStr = new Date(dateValue).toISOString().split('T')[0];
        else if (typeof dateValue === 'string' && dateValue.includes('T')) dateStr = dateValue.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .forEach((so: any) => {
        const customerKode = (so.customerKode || so.customerCode || '').toString().trim();
        const customerName = (so.customer || so.customerName || '').toString().trim();
        const key = customerKode || customerName;
        
        if (key) {
          const total = so.financialSummary?.grandTotal || so.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
          const existing = customerRevenueMap.get(key) || { kode: customerKode, nama: customerName, revenue: 0 };
          customerRevenueMap.set(key, {
            kode: customerKode || existing.kode,
            nama: customerName || existing.nama,
            revenue: existing.revenue + total,
          });
        }
      });

    // Build customer cost map from purchase orders (allocated by customer)
    const customerCostMap = new Map<string, number>();
    const totalCost = (pos as any[])
      .filter((po: any) => {
        let dateValue = po.created || po.date;
        if (!dateValue) return false;
        let dateStr = dateValue;
        if (typeof dateValue === 'number') dateStr = new Date(dateValue).toISOString().split('T')[0];
        else if (typeof dateValue === 'string' && dateValue.includes('T')) dateStr = dateValue.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .reduce((sum: number, po: any) => sum + (po.items?.reduce((s: number, item: any) => s + (item.total || 0), 0) || 0), 0);

    // Allocate costs proportionally
    const totalRevenue = Array.from(customerRevenueMap.values()).reduce((sum, c) => sum + c.revenue, 0);
    const profitData = Array.from(customerRevenueMap.entries()).map(([key, customer]) => {
      const allocatedCost = totalRevenue > 0 ? (customer.revenue / totalRevenue) * totalCost : 0;
      const grossProfit = customer.revenue - allocatedCost;
      const marginPercent = customer.revenue > 0 ? (grossProfit / customer.revenue) * 100 : 0;

      return {
        customerKode: customer.kode || '-',
        customerName: customer.nama || '-',
        totalSales: customer.revenue,
        totalCOGS: allocatedCost,
        grossProfit: grossProfit,
        operatingExpense: 0,
        netProfit: grossProfit,
        marginPercent: Math.round(marginPercent * 100) / 100,
      };
    });

    console.log('[ReportDataFetcher] 📈 getProfitPerCustomerData - Customers:', profitData.length, 'Sample:', profitData.slice(0, 2));
    return profitData;
  },

  async getProfitPerSupplierData(startDate: string, endDate: string) {
    const posRaw = await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS);
    const salesOrdersRaw = await storageService.get(StorageKeys.PACKAGING.SALES_ORDERS);
    
    const pos = extractStorageValue(posRaw) || [];
    const salesOrders = extractStorageValue(salesOrdersRaw) || [];

    console.log('[ReportDataFetcher] 📈 getProfitPerSupplierData - POs:', (pos as any)?.length);

    // Build supplier cost map
    const supplierCostMap = new Map<string, { kode: string; nama: string; cost: number }>();
    (pos as any[])
      .filter((po: any) => {
        let dateValue = po.created || po.date;
        if (!dateValue) return false;
        let dateStr = dateValue;
        if (typeof dateValue === 'number') dateStr = new Date(dateValue).toISOString().split('T')[0];
        else if (typeof dateValue === 'string' && dateValue.includes('T')) dateStr = dateValue.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .forEach((po: any) => {
        const supplierKode = (po.supplierKode || po.supplierCode || '').toString().trim();
        const supplierName = (po.supplier || po.supplierName || '').toString().trim();
        const key = supplierKode || supplierName;
        
        if (key) {
          const total = po.bom?.total || po.totalAmount || po.financialSummary?.grandTotal || 0;
          const existing = supplierCostMap.get(key) || { kode: supplierKode, nama: supplierName, cost: 0 };
          supplierCostMap.set(key, {
            kode: supplierKode || existing.kode,
            nama: supplierName || existing.nama,
            cost: existing.cost + total,
          });
        }
      });

    // Calculate total revenue
    const totalRevenue = (salesOrders as any[])
      .filter((so: any) => {
        let dateValue = so.created || so.date;
        if (!dateValue) return false;
        let dateStr = dateValue;
        if (typeof dateValue === 'number') dateStr = new Date(dateValue).toISOString().split('T')[0];
        else if (typeof dateValue === 'string' && dateValue.includes('T')) dateStr = dateValue.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .reduce((sum: number, so: any) => sum + (so.financialSummary?.grandTotal || so.items?.reduce((s: number, item: any) => s + (item.total || 0), 0) || 0), 0);

    // Allocate revenue proportionally
    const totalCost = Array.from(supplierCostMap.values()).reduce((sum, s) => sum + s.cost, 0);
    const profitData = Array.from(supplierCostMap.entries()).map(([key, supplier]) => {
      const allocatedRevenue = totalCost > 0 ? (supplier.cost / totalCost) * totalRevenue : 0;
      const grossProfit = allocatedRevenue - supplier.cost;
      const marginPercent = allocatedRevenue > 0 ? (grossProfit / allocatedRevenue) * 100 : 0;

      return {
        supplierKode: supplier.kode || '-',
        supplierName: supplier.nama || '-',
        totalPurchase: supplier.cost,
        totalSales: allocatedRevenue,
        grossProfit: grossProfit,
        marginPercent: Math.round(marginPercent * 100) / 100,
      };
    });

    console.log('[ReportDataFetcher] 📈 getProfitPerSupplierData - Suppliers:', profitData.length, 'Sample:', profitData.slice(0, 2));
    return profitData;
  },

  async getProfitPerSalesData(startDate: string, endDate: string) {
    const salesOrdersRaw = await storageService.get(StorageKeys.PACKAGING.SALES_ORDERS);
    const posRaw = await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS);
    
    const salesOrders = extractStorageValue(salesOrdersRaw) || [];
    const pos = extractStorageValue(posRaw) || [];

    console.log('[ReportDataFetcher] 📈 getProfitPerSalesData - Sales Orders:', (salesOrders as any)?.length);

    // Build sales person revenue map
    const salesRevenueMap = new Map<string, number>();
    (salesOrders as any[])
      .filter((so: any) => {
        let dateValue = so.created || so.date;
        if (!dateValue) return false;
        let dateStr = dateValue;
        if (typeof dateValue === 'number') dateStr = new Date(dateValue).toISOString().split('T')[0];
        else if (typeof dateValue === 'string' && dateValue.includes('T')) dateStr = dateValue.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .forEach((so: any) => {
        const salesPerson = (so.salesPerson || so.createdBy || 'Unknown').toString().trim();
        const total = so.financialSummary?.grandTotal || so.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
        salesRevenueMap.set(salesPerson, (salesRevenueMap.get(salesPerson) || 0) + total);
      });

    // Calculate total cost
    const totalCost = (pos as any[])
      .filter((po: any) => {
        let dateValue = po.created || po.date;
        if (!dateValue) return false;
        let dateStr = dateValue;
        if (typeof dateValue === 'number') dateStr = new Date(dateValue).toISOString().split('T')[0];
        else if (typeof dateValue === 'string' && dateValue.includes('T')) dateStr = dateValue.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .reduce((sum: number, po: any) => sum + (po.bom?.total || po.totalAmount || po.financialSummary?.grandTotal || po.total || 0), 0);

    // Allocate cost proportionally
    const totalRevenue = Array.from(salesRevenueMap.values()).reduce((a, b) => a + b, 0);
    const profitData = Array.from(salesRevenueMap.entries()).map(([salesPerson, revenue]) => {
      const allocatedCost = totalRevenue > 0 ? (revenue / totalRevenue) * totalCost : 0;
      const grossProfit = revenue - allocatedCost;
      const marginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

      return {
        salesName: salesPerson,
        totalSales: revenue,
        totalCOGS: allocatedCost,
        grossProfit: grossProfit,
        commission: 0,
        netProfit: grossProfit,
        marginPercent: Math.round(marginPercent * 100) / 100,
      };
    });

    console.log('[ReportDataFetcher] 📈 getProfitPerSalesData - Sales:', profitData.length, 'Sample:', profitData.slice(0, 2));
    return profitData;
  },

  async getProfitPerRegionData(startDate: string, endDate: string) {
    const salesOrdersRaw = await storageService.get(StorageKeys.PACKAGING.SALES_ORDERS);
    const customersRaw = await storageService.get('customers');
    const posRaw = await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS);
    
    const salesOrders = extractStorageValue(salesOrdersRaw) || [];
    const customers = extractStorageValue(customersRaw) || [];
    const pos = extractStorageValue(posRaw) || [];

    console.log('[ReportDataFetcher] 📈 getProfitPerRegionData - Sales Orders:', (salesOrders as any)?.length);

    // Build customer region map
    const customerRegionMap = new Map<string, string>();
    (customers as any[]).forEach((cust: any) => {
      const custName = (cust.name || cust.nama || '').toString().trim();
      const region = (cust.city || cust.kota || 'Unknown').toString().trim();
      if (custName) customerRegionMap.set(custName, region);
    });

    // Build region revenue map
    const regionRevenueMap = new Map<string, number>();
    (salesOrders as any[])
      .filter((so: any) => {
        let dateValue = so.created || so.date;
        if (!dateValue) return false;
        let dateStr = dateValue;
        if (typeof dateValue === 'number') dateStr = new Date(dateValue).toISOString().split('T')[0];
        else if (typeof dateValue === 'string' && dateValue.includes('T')) dateStr = dateValue.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .forEach((so: any) => {
        const customerName = (so.customer || so.customerName || '').toString().trim();
        const region = customerRegionMap.get(customerName) || 'Unknown';
        const total = so.financialSummary?.grandTotal || so.items?.reduce((sum: number, item: any) => sum + (item.total || 0), 0) || 0;
        regionRevenueMap.set(region, (regionRevenueMap.get(region) || 0) + total);
      });

    // Calculate total cost
    const totalCost = (pos as any[])
      .filter((po: any) => {
        let dateValue = po.created || po.date;
        if (!dateValue) return false;
        let dateStr = dateValue;
        if (typeof dateValue === 'number') dateStr = new Date(dateValue).toISOString().split('T')[0];
        else if (typeof dateValue === 'string' && dateValue.includes('T')) dateStr = dateValue.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .reduce((sum: number, po: any) => sum + (po.bom?.total || po.totalAmount || po.financialSummary?.grandTotal || po.total || 0), 0);

    // Allocate cost proportionally
    const totalRevenue = Array.from(regionRevenueMap.values()).reduce((a, b) => a + b, 0);
    const profitData = Array.from(regionRevenueMap.entries()).map(([region, revenue]) => {
      const allocatedCost = totalRevenue > 0 ? (revenue / totalRevenue) * totalCost : 0;
      const grossProfit = revenue - allocatedCost;
      const marginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

      return {
        region: region,
        totalSales: revenue,
        totalCOGS: allocatedCost,
        grossProfit: grossProfit,
        operatingExpense: 0,
        netProfit: grossProfit,
        marginPercent: Math.round(marginPercent * 100) / 100,
      };
    });

    console.log('[ReportDataFetcher] 📈 getProfitPerRegionData - Regions:', profitData.length, 'Sample:', profitData.slice(0, 2));
    return profitData;
  },

  async getProfitPerCategoryData(startDate: string, endDate: string) {
    const salesOrdersRaw = await storageService.get(StorageKeys.PACKAGING.SALES_ORDERS);
    const posRaw = await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS);
    
    const salesOrders = extractStorageValue(salesOrdersRaw) || [];
    const pos = extractStorageValue(posRaw) || [];

    console.log('[ReportDataFetcher] 📈 getProfitPerCategoryData - Sales Orders:', (salesOrders as any)?.length);

    // Build category revenue map from sales orders
    const categoryRevenueMap = new Map<string, number>();
    (salesOrders as any[])
      .filter((so: any) => {
        let dateValue = so.created || so.date;
        if (!dateValue) return false;
        let dateStr = dateValue;
        if (typeof dateValue === 'number') dateStr = new Date(dateValue).toISOString().split('T')[0];
        else if (typeof dateValue === 'string' && dateValue.includes('T')) dateStr = dateValue.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .forEach((so: any) => {
        (so.items || []).forEach((item: any) => {
          const category = (item.category || item.kategori || 'Unknown').toString().trim();
          const total = item.total || 0;
          categoryRevenueMap.set(category, (categoryRevenueMap.get(category) || 0) + total);
        });
      });

    // Build category cost map from purchase orders
    const categoryCostMap = new Map<string, number>();
    (pos as any[])
      .filter((po: any) => {
        let dateValue = po.created || po.date;
        if (!dateValue) return false;
        let dateStr = dateValue;
        if (typeof dateValue === 'number') dateStr = new Date(dateValue).toISOString().split('T')[0];
        else if (typeof dateValue === 'string' && dateValue.includes('T')) dateStr = dateValue.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .forEach((po: any) => {
        (po.items || []).forEach((item: any) => {
          const category = (item.category || item.kategori || 'Unknown').toString().trim();
          const total = item.total || 0;
          categoryCostMap.set(category, (categoryCostMap.get(category) || 0) + total);
        });
      });

    // Merge data
    const allCategories = new Set([...categoryRevenueMap.keys(), ...categoryCostMap.keys()]);
    const profitData = Array.from(allCategories).map((category: string) => {
      const revenue = categoryRevenueMap.get(category) || 0;
      const cost = categoryCostMap.get(category) || 0;
      const profit = revenue - cost;
      const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

      return {
        category: category,
        totalSales: revenue,
        totalCOGS: cost,
        grossProfit: profit,
        marginPercent: Math.round(margin * 100) / 100,
      };
    });

    console.log('[ReportDataFetcher] 📈 getProfitPerCategoryData - Categories:', profitData.length, 'Sample:', profitData.slice(0, 2));
    return profitData;
  },

  async getProfitMarginData(startDate: string, endDate: string) {
    const salesOrdersRaw = await storageService.get(StorageKeys.PACKAGING.SALES_ORDERS);
    const posRaw = await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS);
    
    const salesOrders = extractStorageValue(salesOrdersRaw) || [];
    const pos = extractStorageValue(posRaw) || [];

    console.log('[ReportDataFetcher] 📈 getProfitMarginData - Sales Orders:', (salesOrders as any)?.length);

    // Calculate total revenue
    const totalRevenue = (salesOrders as any[])
      .filter((so: any) => {
        let dateValue = so.created || so.date;
        if (!dateValue) return false;
        let dateStr = dateValue;
        if (typeof dateValue === 'number') dateStr = new Date(dateValue).toISOString().split('T')[0];
        else if (typeof dateValue === 'string' && dateValue.includes('T')) dateStr = dateValue.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .reduce((sum: number, so: any) => sum + (so.financialSummary?.grandTotal || so.items?.reduce((s: number, item: any) => s + (item.total || 0), 0) || 0), 0);

    // Calculate total cost
    const totalCost = (pos as any[])
      .filter((po: any) => {
        let dateValue = po.created || po.date;
        if (!dateValue) return false;
        let dateStr = dateValue;
        if (typeof dateValue === 'number') dateStr = new Date(dateValue).toISOString().split('T')[0];
        else if (typeof dateValue === 'string' && dateValue.includes('T')) dateStr = dateValue.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .reduce((sum: number, po: any) => sum + (po.bom?.total || po.totalAmount || po.financialSummary?.grandTotal || po.total || 0), 0);

    const profit = totalRevenue - totalCost;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

    const profitData = [
      {
        period: 'Summary',
        totalSales: totalRevenue,
        totalCOGS: totalCost,
        grossProfit: profit,
        grossMarginPercent: Math.round(margin * 100) / 100,
        operatingExpense: 0,
        netProfit: profit,
        netMarginPercent: Math.round(margin * 100) / 100,
      },
    ];

    console.log('[ReportDataFetcher] 📈 getProfitMarginData - Margin:', Math.round(margin * 100) / 100 + '%');
    return profitData;
  },

  async getProfitCOGSData(startDate: string, endDate: string) {
    const posRaw = await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS);
    const productionRaw = await storageService.get(StorageKeys.PACKAGING.PRODUCTION);
    
    const pos = extractStorageValue(posRaw) || [];
    const production = extractStorageValue(productionRaw) || [];

    console.log('[ReportDataFetcher] 📈 getProfitCOGSData - POs:', (pos as any)?.length, 'Production:', (production as any)?.length);

    // Calculate COGS from purchase orders
    const cogsFromPO = (pos as any[])
      .filter((po: any) => {
        let dateValue = po.created || po.date;
        if (!dateValue) return false;
        let dateStr = dateValue;
        if (typeof dateValue === 'number') dateStr = new Date(dateValue).toISOString().split('T')[0];
        else if (typeof dateValue === 'string' && dateValue.includes('T')) dateStr = dateValue.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .reduce((sum: number, po: any) => sum + (po.bom?.total || po.totalAmount || po.financialSummary?.grandTotal || 0), 0);

    // Calculate COGS from production (material + labor + overhead)
    const cogsFromProduction = (production as any[])
      .filter((prod: any) => {
        let dateValue = prod.created || prod.date;
        if (!dateValue) return false;
        let dateStr = dateValue;
        if (typeof dateValue === 'number') dateStr = new Date(dateValue).toISOString().split('T')[0];
        else if (typeof dateValue === 'string' && dateValue.includes('T')) dateStr = dateValue.split('T')[0];
        return dateStr >= startDate && dateStr <= endDate;
      })
      .reduce((sum: number, prod: any) => {
        const materialCost = prod.materialCost || 0;
        const laborCost = prod.laborCost || 0;
        const overheadCost = prod.overheadCost || 0;
        return sum + materialCost + laborCost + overheadCost;
      }, 0);

    const totalCOGS = cogsFromPO + cogsFromProduction;

    const cogsData = [
      {
        productKode: '-',
        productName: 'Total COGS Summary',
        qtySold: 0,
        sellingPrice: 0,
        totalSales: 0,
        costPrice: 0,
        totalCOGS: totalCOGS,
        grossProfit: 0,
      },
    ];

    console.log('[ReportDataFetcher] 📈 getProfitCOGSData - Total COGS:', Math.round(totalCOGS));
    return cogsData;
  },

  // CUSTOM DATA - Packaging Sales Order Export
  async getPackagingSalesOrderExportData(startDate: string, endDate: string) {
    try {
      const ordersRaw = await storageService.get(StorageKeys.PACKAGING.SALES_ORDERS);
      const ordersArray = extractStorageValue(ordersRaw) || [];
      const deliveryArray = (await storageService.get(StorageKeys.PACKAGING.DELIVERY)) || [];
      const inventoryData = extractStorageValue(await storageService.get('inventory')) || [];
      const customersData = extractStorageValue(await storageService.get(StorageKeys.PACKAGING.CUSTOMERS)) || [];

      // Build lookup maps
      const deliveryMap = new Map<string, any[]>();
      (deliveryArray as any[]).forEach((dn: any) => {
        if (dn.soNo) {
          if (!deliveryMap.has(dn.soNo)) {
            deliveryMap.set(dn.soNo, []);
          }
          deliveryMap.get(dn.soNo)!.push(dn);
        }
      });

      const inventoryMap = new Map<string, any>();
      (inventoryData as any[]).forEach((inv: any) => {
        const code = inv.codeItem || inv.productCode || inv.item_code || inv.kodeIpos;
        if (code) {
          inventoryMap.set(code, inv);
        }
      });

      const customerMap = new Map<string, any>();
      (customersData as any[]).forEach((cust: any) => {
        if (cust.kode || cust.code) {
          customerMap.set(cust.kode || cust.code, cust);
        }
      });

      // Generate report data: 1 row per SO item
      const reportData: any[] = [];
      let rowNo = 1;

      (ordersArray as any[])
        .filter((o: any) => {
          const orderDate = o.created || o.date || '';
          return orderDate >= startDate && orderDate <= endDate;
        })
        .forEach((order: any) => {
          const deliveryNotesForSO = deliveryMap.get(order.soNo) || [];
          
          // Calculate total delivered qty per product
          const deliveredQtyMap = new Map<string, number>();
          deliveryNotesForSO.forEach((dn: any) => {
            if (dn.items && Array.isArray(dn.items)) {
              dn.items.forEach((item: any) => {
                const productCode = item.productCode || item.product;
                const currentQty = deliveredQtyMap.get(productCode) || 0;
                deliveredQtyMap.set(productCode, currentQty + (item.qty || 0));
              });
            }
          });

          // Process each item in SO
          (order.items || []).forEach((item: any) => {
            const productCode = item.productKode;
            const inventory = inventoryMap.get(productCode);
            const customer = customerMap.get(order.customerKode || '');
            
            // Calculate inventory flow
            const stockAwal = (inventory?.stockPremonth || 0) + 
                             (inventory?.stockP1 || 0) + 
                             (inventory?.stockP2 || 0) + 
                             (inventory?.receive || 0);
            const produksi = 0;
            const delivery = deliveredQtyMap.get(productCode) || 0;
            const remainPO = item.qty - delivery;
            const nextStock = (stockAwal - delivery) || 0;
            
            // Calculate financial
            const totalTagihan = item.total || (item.qty * item.price);
            const totalRpRemain = remainPO * item.price;

            reportData.push({
              no: rowNo++,
              kodePel: order.customerKode || '',
              kdItem: productCode,
              date: order.created ? order.created.split('T')[0] : '',
              noTransaksi: order.soNo,
              customer: order.customer,
              namaItem: item.productName,
              jml: item.qty,
              harga: item.price,
              total: totalTagihan,
              stockAwal: stockAwal,
              produksi: produksi,
              delivery: delivery,
              remainPO: remainPO,
              nextStock: nextStock,
              totalTagihan: totalTagihan,
              totalRpRemain: totalRpRemain,
            });
          });
        });

      // Return dengan format yang sama seperti template engine
      return reportData.map((item: any) => ({
        'NO': item.no,
        'KODE PEL.': item.kodePel,
        'KD. ITEM': item.kdItem,
        'DATE': item.date,
        'NO TRANSAKSI': item.noTransaksi,
        'CUSTOMER': item.customer,
        'NAMA ITEM': item.namaItem,
        'JML': item.jml,
        'HARGA': item.harga,
        'TOTAL': item.total,
        'STOCK AWAL': item.stockAwal,
        'PRODUKSI': item.produksi,
        'DELIVERY': item.delivery,
        'REMAIN PO': item.remainPO,
        'NEXT STOCK': item.nextStock,
        'TOTAL TAGIHAN': item.totalTagihan,
        'TOTAL RP. REMAIN': item.totalRpRemain,
      }));
    } catch (error) {
      console.error('[ReportDataFetcher] Error in getPackagingSalesOrderExportData:', error);
      return [];
    }
  },
};

