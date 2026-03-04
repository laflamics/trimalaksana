export const purchaseReportTemplates = {
  purchaseOrdersReport: (data: any[], startDate?: string, endDate?: string) => {
    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';
    const normalized = data.map((po, idx) => ({
      'NO': idx + 1,
      'NO. PO': (po.poNo || '').toString().trim() || '-',
      'SUPPLIER': (po.supplier || '').toString().trim() || '-',
      'MATERIAL': (po.materialItem || '').toString().trim() || '-',
      'TANGGAL': (po.created || '').toString().split('T')[0] || '-',
      'QTY': po.qty || 0,
      'HARGA': po.price || 0,
      'TOTAL': po.total || 0,
      'STATUS': (po.status || 'OPEN').toString().trim(),
    }));
    const totalQty = normalized.reduce((sum, item) => sum + (item['QTY'] || 0), 0);
    const totalAmount = normalized.reduce((sum, item) => sum + (item['TOTAL'] || 0), 0);
    return {
      title: 'LAPORAN PESANAN PEMBELIAN',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'NO. PO', 'SUPPLIER', 'MATERIAL', 'TANGGAL', 'QTY', 'HARGA', 'TOTAL', 'STATUS'],
      data: normalized,
      totals: { 'TOTAL PO': normalized.length, 'TOTAL QTY': totalQty, 'TOTAL AMOUNT': totalAmount },
      formatting: { headerBgColor: '70AD47', headerTextColor: 'FFFFFF', alternateRowColor: true, freezePane: true, columnWidths: [6, 15, 25, 25, 12, 10, 12, 12, 10] },
    };
  },

  purchaseOrdersPerItemReport: (data: any[], startDate?: string, endDate?: string) => {
    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';
    const normalized = data.map((po, idx) => ({
      'NO': idx + 1,
      'NO. PO': (po.poNo || '').toString().trim() || '-',
      'SUPPLIER': (po.supplier || '').toString().trim() || '-',
      'MATERIAL': (po.materialItem || '').toString().trim() || '-',
      'QTY': po.qty || 0,
      'HARGA': po.price || 0,
      'TOTAL': po.total || 0,
    }));
    const totalQty = normalized.reduce((sum, item) => sum + (item['QTY'] || 0), 0);
    const totalAmount = normalized.reduce((sum, item) => sum + (item['TOTAL'] || 0), 0);
    return {
      title: 'LAPORAN PESANAN PEMBELIAN PER ITEM',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'NO. PO', 'SUPPLIER', 'MATERIAL', 'QTY', 'HARGA', 'TOTAL'],
      data: normalized,
      totals: { 'TOTAL ITEM': normalized.length, 'TOTAL QTY': totalQty, 'TOTAL AMOUNT': totalAmount },
      formatting: { headerBgColor: '70AD47', headerTextColor: 'FFFFFF', alternateRowColor: true, freezePane: true, columnWidths: [6, 15, 25, 25, 10, 12, 12] },
    };
  },

  purchaseReturnReport: (data: any[], startDate?: string, endDate?: string) => {
    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';
    const normalized = data.map((ret, idx) => ({
      'NO': idx + 1,
      'NO. RETUR': (ret.returnNo || '').toString().trim() || '-',
      'SUPPLIER': (ret.supplier || '').toString().trim() || '-',
      'MATERIAL': (ret.materialItem || '').toString().trim() || '-',
      'QTY': ret.qty || 0,
      'HARGA': ret.price || 0,
      'TOTAL': ret.total || 0,
    }));
    const totalQty = normalized.reduce((sum, item) => sum + (item['QTY'] || 0), 0);
    const totalAmount = normalized.reduce((sum, item) => sum + (item['TOTAL'] || 0), 0);
    return {
      title: 'LAPORAN RETUR PEMBELIAN',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'NO. RETUR', 'SUPPLIER', 'MATERIAL', 'QTY', 'HARGA', 'TOTAL'],
      data: normalized,
      totals: { 'TOTAL RETUR': normalized.length, 'TOTAL QTY': totalQty, 'TOTAL AMOUNT': totalAmount },
      formatting: { headerBgColor: 'FF6B6B', headerTextColor: 'FFFFFF', alternateRowColor: true, freezePane: true, columnWidths: [6, 15, 25, 25, 10, 12, 12] },
    };
  },

  purchaseReturnPerItemReport: (data: any[], startDate?: string, endDate?: string) => {
    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';
    const normalized = data.map((ret, idx) => ({
      'NO': idx + 1,
      'NO. RETUR': (ret.returnNo || '').toString().trim() || '-',
      'SUPPLIER': (ret.supplier || '').toString().trim() || '-',
      'MATERIAL': (ret.materialItem || '').toString().trim() || '-',
      'QTY': ret.qty || 0,
      'HARGA': ret.price || 0,
      'TOTAL': ret.total || 0,
    }));
    const totalQty = normalized.reduce((sum, item) => sum + (item['QTY'] || 0), 0);
    const totalAmount = normalized.reduce((sum, item) => sum + (item['TOTAL'] || 0), 0);
    return {
      title: 'LAPORAN RETUR BELI PER ITEM',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'NO. RETUR', 'SUPPLIER', 'MATERIAL', 'QTY', 'HARGA', 'TOTAL'],
      data: normalized,
      totals: { 'TOTAL ITEM': normalized.length, 'TOTAL QTY': totalQty, 'TOTAL RETUR': totalAmount },
      formatting: { headerBgColor: 'FF6B6B', headerTextColor: 'FFFFFF', alternateRowColor: true, freezePane: true, columnWidths: [6, 15, 25, 25, 10, 12, 12] },
    };
  },

  purchasePerSupplierReport: (poData: any[], startDate?: string, endDate?: string) => {
    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';
    const supplierMap = new Map<string, { count: number; totalQty: number; totalAmount: number; avgPrice: number }>();
    
    poData.forEach(po => {
      const supplier = (po.supplier || '').toString().trim();
      if (supplier) {
        const existing = supplierMap.get(supplier) || { count: 0, totalQty: 0, totalAmount: 0, avgPrice: 0 };
        const newCount = existing.count + 1;
        const newTotal = existing.totalAmount + (po.total || 0);
        supplierMap.set(supplier, {
          count: newCount,
          totalQty: existing.totalQty + (po.qty || 0),
          totalAmount: newTotal,
          avgPrice: newTotal / newCount,
        });
      }
    });

    // Calculate total for percentage
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

    return {
      title: 'LAPORAN PEMBELIAN PER SUPPLIER',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'SUPPLIER', 'JUMLAH PO', 'TOTAL QTY', 'RATA-RATA QTY/PO', 'TOTAL PEMBELIAN', 'RATA-RATA HARGA', 'SHARE %'],
      data: normalized,
      totals: { 
        'TOTAL SUPPLIER': normalized.length, 
        'TOTAL PO': normalized.reduce((sum, item) => sum + (item['JUMLAH PO'] || 0), 0), 
        'TOTAL QTY': normalized.reduce((sum, item) => sum + (item['TOTAL QTY'] || 0), 0), 
        'TOTAL PEMBELIAN': normalized.reduce((sum, item) => sum + (item['TOTAL PEMBELIAN'] || 0), 0),
      },
      formatting: { headerBgColor: '70AD47', headerTextColor: 'FFFFFF', alternateRowColor: true, freezePane: true, columnWidths: [6, 30, 12, 12, 16, 15, 15, 10] },
    };
  },

  purchasePerItemSupplierReport: (poData: any[], startDate?: string, endDate?: string) => {
    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';
    
    // Group by material and supplier
    const itemSupplierMap = new Map<string, any[]>();
    poData.forEach(po => {
      const key = `${po.materialItem}|${po.supplier}`;
      if (!itemSupplierMap.has(key)) {
        itemSupplierMap.set(key, []);
      }
      itemSupplierMap.get(key)!.push(po);
    });

    // Calculate metrics per item-supplier combination
    const normalized = Array.from(itemSupplierMap.entries())
      .map(([key, items], idx) => {
        const [material, supplier] = key.split('|');
        const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);
        const totalAmount = items.reduce((sum, item) => sum + (item.total || 0), 0);
        const avgPrice = items.length > 0 ? totalAmount / totalQty : 0;
        const unitPrice = items.length > 0 ? items[0].price || 0 : 0;
        
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

    const totalQty = normalized.reduce((sum, item) => sum + (item['TOTAL QTY'] || 0), 0);
    const totalAmount = normalized.reduce((sum, item) => sum + (item['TOTAL PEMBELIAN'] || 0), 0);

    return {
      title: 'LAPORAN PEMBELIAN PER ITEM PER SUPPLIER',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'MATERIAL', 'SUPPLIER', 'JUMLAH PO', 'TOTAL QTY', 'HARGA SATUAN', 'RATA-RATA HARGA', 'TOTAL PEMBELIAN'],
      data: normalized,
      totals: { 
        'TOTAL KOMBINASI': normalized.length, 
        'TOTAL QTY': totalQty, 
        'TOTAL PEMBELIAN': totalAmount,
      },
      formatting: { headerBgColor: '70AD47', headerTextColor: 'FFFFFF', alternateRowColor: true, freezePane: true, columnWidths: [6, 25, 25, 12, 12, 14, 16, 15] },
    };
  },

  purchaseChartTopItemsReport: (poData: any[], startDate?: string, endDate?: string) => {
    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';
    const itemMap = new Map<string, { qty: number; total: number; count: number }>();
    
    poData.forEach(po => {
      const material = (po.materialItem || '').toString().trim();
      if (material) {
        const existing = itemMap.get(material) || { qty: 0, total: 0, count: 0 };
        itemMap.set(material, { 
          qty: existing.qty + (po.qty || 0), 
          total: existing.total + (po.total || 0),
          count: existing.count + 1,
        });
      }
    });

    // Calculate total for percentage
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

    return {
      title: 'LAPORAN GRAFIK PEMBELIAN ITEM TERBESAR (TOP 10)',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'MATERIAL', 'JUMLAH PO', 'TOTAL QTY', 'RATA-RATA HARGA', 'TOTAL PEMBELIAN', 'SHARE %'],
      data: normalized,
      totals: { 
        'TOTAL ITEM': normalized.length, 
        'TOTAL QTY': normalized.reduce((sum, item) => sum + (item['TOTAL QTY'] || 0), 0), 
        'TOTAL PEMBELIAN': normalized.reduce((sum, item) => sum + (item['TOTAL PEMBELIAN'] || 0), 0),
      },
      formatting: { headerBgColor: '70AD47', headerTextColor: 'FFFFFF', alternateRowColor: true, freezePane: true, columnWidths: [6, 30, 12, 12, 16, 15, 10] },
    };
  },

  purchaseChartDailyReport: (poData: any[], startDate?: string, endDate?: string) => {
    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';
    const dailyMap = new Map<string, { 
      count: number; 
      totalQty: number; 
      totalAmount: number;
      suppliers: Set<string>;
    }>();
    
    poData.forEach(po => {
      const date = (po.created || '').toString().split('T')[0] || '-';
      const supplier = (po.supplier || '').toString().trim();
      const existing = dailyMap.get(date) || { count: 0, totalQty: 0, totalAmount: 0, suppliers: new Set() };
      existing.suppliers.add(supplier);
      dailyMap.set(date, { 
        count: existing.count + 1, 
        totalQty: existing.totalQty + (po.qty || 0), 
        totalAmount: existing.totalAmount + (po.total || 0),
        suppliers: existing.suppliers,
      });
    });

    // Sort by date and calculate metrics
    const dailyDataRaw = Array.from(dailyMap.entries())
      .map(([date, data]) => ({ 
        date, 
        count: data.count,
        totalQty: data.totalQty,
        totalAmount: data.totalAmount,
        uniqueSuppliers: data.suppliers.size,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate growth percentage and status
    const dailyData = dailyDataRaw.map((item, idx) => {
      const prevDay = idx > 0 ? dailyDataRaw[idx - 1] : null;
      const growth = prevDay && prevDay.totalAmount > 0 ? ((item.totalAmount - prevDay.totalAmount) / prevDay.totalAmount) * 100 : 0;
      
      // Calculate average per transaction
      const avgPerTransaction = item.count > 0 ? item.totalAmount / item.count : 0;
      
      // Determine status based on total amount (±20% threshold)
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

    return {
      title: 'LAPORAN GRAFIK PEMBELIAN HARIAN',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'HARI', 'SUPPLIER UNIK', 'ITEM DIBELI', 'RATA-RATA/TRANSAKSI', 'PERTUMBUHAN %', 'STATUS'],
      data: dailyData,
      totals: { 
        'TOTAL HARI': dailyData.length, 
        'TOTAL SUPPLIER': dailyData.reduce((sum, item) => sum + (item['SUPPLIER UNIK'] || 0), 0), 
        'TOTAL ITEM': dailyData.reduce((sum, item) => sum + (item['ITEM DIBELI'] || 0), 0), 
        'TOTAL PEMBELIAN': dailyData.reduce((sum, item) => sum + (item['RATA-RATA/TRANSAKSI'] || 0), 0),
      },
      formatting: { headerBgColor: '70AD47', headerTextColor: 'FFFFFF', alternateRowColor: true, freezePane: true, columnWidths: [6, 12, 14, 12, 18, 14, 10] },
    };
  },

  purchaseChartMonthlyReport: (poData: any[], startDate?: string, endDate?: string) => {
    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';
    const monthlyMap = new Map<string, { 
      count: number; 
      totalQty: number; 
      totalAmount: number;
      suppliers: Set<string>;
    }>();
    
    poData.forEach(po => {
      const month = (po.created || '').toString().split('T')[0].substring(0, 7) || '-';
      const supplier = (po.supplier || '').toString().trim();
      const existing = monthlyMap.get(month) || { count: 0, totalQty: 0, totalAmount: 0, suppliers: new Set() };
      existing.suppliers.add(supplier);
      monthlyMap.set(month, { 
        count: existing.count + 1, 
        totalQty: existing.totalQty + (po.qty || 0), 
        totalAmount: existing.totalAmount + (po.total || 0),
        suppliers: existing.suppliers,
      });
    });

    const formatMonth = (m: string) => {
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const [year, month] = m.split('-');
      return `${months[parseInt(month) - 1]} ${year}`;
    };

    // Sort by month and calculate metrics
    const monthlyDataRaw = Array.from(monthlyMap.entries())
      .map(([month, data]) => ({ 
        month, 
        count: data.count,
        totalQty: data.totalQty,
        totalAmount: data.totalAmount,
        uniqueSuppliers: data.suppliers.size,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    // Calculate growth percentage and status
    const monthlyData = monthlyDataRaw.map((item, idx) => {
      const prevMonth = idx > 0 ? monthlyDataRaw[idx - 1] : null;
      const growth = prevMonth && prevMonth.totalAmount > 0 ? ((item.totalAmount - prevMonth.totalAmount) / prevMonth.totalAmount) * 100 : 0;
      
      // Calculate average per transaction
      const avgPerTransaction = item.count > 0 ? item.totalAmount / item.count : 0;
      
      // Determine status based on total amount (±20% threshold)
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

    return {
      title: 'LAPORAN GRAFIK PEMBELIAN BULANAN',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'BULAN', 'SUPPLIER UNIK', 'ITEM DIBELI', 'RATA-RATA/TRANSAKSI', 'PERTUMBUHAN %', 'STATUS'],
      data: monthlyData,
      totals: { 
        'TOTAL BULAN': monthlyData.length, 
        'TOTAL SUPPLIER': monthlyData.reduce((sum, item) => sum + (item['SUPPLIER UNIK'] || 0), 0), 
        'TOTAL ITEM': monthlyData.reduce((sum, item) => sum + (item['ITEM DIBELI'] || 0), 0), 
        'TOTAL PEMBELIAN': monthlyData.reduce((sum, item) => sum + (item['RATA-RATA/TRANSAKSI'] || 0), 0),
      },
      formatting: { headerBgColor: '70AD47', headerTextColor: 'FFFFFF', alternateRowColor: true, freezePane: true, columnWidths: [6, 18, 14, 12, 18, 14, 10] },
    };
  },

  purchaseTaxInvoiceCSVReport: (grnData: any[], startDate?: string, endDate?: string) => {
    const dateRange = startDate && endDate ? ` (${startDate} s/d ${endDate})` : '';
    const normalized = grnData.map((grn, idx) => ({
      'NO': idx + 1,
      'NO. GRN': (grn.grnNo || '').toString().trim() || '-',
      'TANGGAL': (grn.created || '').toString().split('T')[0] || '-',
      'SUPPLIER': (grn.supplier || '').toString().trim() || '-',
      'QTY': grn.qty || grn.qtyReceived || 0,
      'SUBTOTAL': grn.subtotal || 0,
      'PAJAK': grn.tax || 0,
      'TOTAL': grn.total || 0,
    }));
    return {
      title: 'LAPORAN CSV/XML FAKTUR PAJAK MASUKAN',
      subtitle: `Per: ${new Date().toLocaleDateString('id-ID')}${dateRange}`,
      headers: ['NO', 'NO. GRN', 'TANGGAL', 'SUPPLIER', 'QTY', 'SUBTOTAL', 'PAJAK', 'TOTAL'],
      data: normalized,
      totals: { 'TOTAL GRN': normalized.length, 'TOTAL QTY': normalized.reduce((sum, item) => sum + (item['QTY'] || 0), 0), 'TOTAL SUBTOTAL': normalized.reduce((sum, item) => sum + (item['SUBTOTAL'] || 0), 0), 'TOTAL PAJAK': normalized.reduce((sum, item) => sum + (item['PAJAK'] || 0), 0), 'TOTAL': normalized.reduce((sum, item) => sum + (item['TOTAL'] || 0), 0) },
      formatting: { headerBgColor: '4472C4', headerTextColor: 'FFFFFF', alternateRowColor: true, freezePane: true, columnWidths: [6, 15, 12, 25, 10, 12, 10, 12] },
    };
  },
};
