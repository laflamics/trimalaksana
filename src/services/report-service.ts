/**
 * Report Service - Data Fetching & Report Generation
 * Fetch data dari storage dan generate report dengan template engine
 */

import { storageService, StorageKeys, extractStorageValue } from './storage';
import { reportTemplateEngine } from './report-template-engine';
import { reportDataFetcher } from './report-data-fetcher';
import { excelFormatter } from '@/utils/excel-formatter';
import { toast } from '@/utils/toast-helper';
import { TemplateSelectionDialog } from '@/components/TemplateSelectionDialog';

/**
 * Helper function to filter data by date range
 * Handles multiple date field formats (ISO string, timestamp, etc)
 */
const filterByDateRange = (data: any[], startDate: string, endDate: string, dateFields: string[] = ['created', 'lastUpdate', 'date', 'deliveryDate', 'timestamp']): any[] => {
  return data.filter(item => {
    // Try to find a date field that has a value
    let dateValue = null;
    for (const field of dateFields) {
      if (item[field]) {
        dateValue = item[field];
        break;
      }
    } 
    
    if (!dateValue) return false; // Skip items without any date
    
    // Convert to ISO date string for comparison (YYYY-MM-DD)
    let dateStr = dateValue;
    if (typeof dateValue === 'number') {
      dateStr = new Date(dateValue).toISOString().split('T')[0];
    } else if (typeof dateValue === 'string' && dateValue.includes('T')) {
      dateStr = dateValue.split('T')[0];
    }
    
    return dateStr >= startDate && dateStr <= endDate;
  });
};


export const reportService = {
  /**
   * PACKAGING - Sales Orders Report
   */
  async generatePackagingSalesOrdersReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating packaging sales orders report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch packaging sales orders using correct storage key
      const soRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.SALES_ORDERS);
      const soData = extractStorageValue(soRaw);

      if (!soData || soData.length === 0) {
        toast.error('Tidak ada data sales order di packaging. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Filter by date if provided
      let filtered = soData;
      if (startDate && endDate) {
        filtered = soData.filter(so => {
          const soDate = so.created || so.date;
          return soDate >= startDate && soDate <= endDate;
        });
      }

      // Generate template
      const template = reportTemplateEngine.packagingSalesOrdersReport(filtered, startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Pesanan_Penjualan_Packaging', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Packaging sales orders report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating packaging sales orders report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PACKAGING - Sales by Region Report
   */
  async generatePackagingSalesByRegionReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating packaging sales by region report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch sales orders and customers - use direct keys like master products report
      const soRaw = await storageService.get<any[]>('salesOrders');
      const customersRaw = await storageService.get<any[]>('customers');
      
      const soData = extractStorageValue(soRaw);
      const customersData = extractStorageValue(customersRaw);

      if (!soData || soData.length === 0) {
        toast.error('Tidak ada data sales order di packaging. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Filter by date if provided
      let filtered = soData;
      if (startDate && endDate) {
        filtered = soData.filter(so => {
          const soDate = so.created || so.date;
          return soDate >= startDate && soDate <= endDate;
        });
      }

      // Generate template
      const template = reportTemplateEngine.packagingSalesByRegionReport(filtered, customersData || [], startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Penjualan_Per_Wilayah_Packaging', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Packaging sales by region report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating packaging sales by region report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PACKAGING - Sales Return Report
   */
  async generatePackagingSalesReturnReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating packaging sales return report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch packaging returns using correct storage key
      const returnsRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.RETURNS);
      const returnsData = extractStorageValue(returnsRaw);

      if (!returnsData || returnsData.length === 0) {
        toast.error('Tidak ada data retur penjualan di packaging. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Filter by date if provided
      let filtered = returnsData;
      if (startDate && endDate) {
        filtered = returnsData.filter(ret => {
          const retDate = ret.created || ret.date;
          return retDate >= startDate && retDate <= endDate;
        });
      }

      // Generate template
      const template = reportTemplateEngine.packagingSalesReturnReport(filtered, startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Retur_Penjualan_Packaging', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Packaging sales return report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating packaging sales return report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PACKAGING - Sales Orders Per Item Report
   */
  async generatePackagingSalesOrdersPerItemReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating packaging sales orders per item report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch packaging sales orders using correct storage key
      const soRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.SALES_ORDERS);
      const soData = extractStorageValue(soRaw);

      if (!soData || soData.length === 0) {
        toast.error('Tidak ada data sales order di packaging. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Filter by date if provided
      let filtered = soData;
      if (startDate && endDate) {
        filtered = soData.filter(so => {
          const soDate = so.created || so.date;
          return soDate >= startDate && soDate <= endDate;
        });
      }

      // Generate template
      const template = reportTemplateEngine.packagingSalesOrdersPerItemReport(filtered, startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Pesanan_Per_Item_Packaging', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Packaging sales orders per item report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating packaging sales orders per item report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * GENERAL TRADING - Sales Report
   */
  async generateGTSalesReport(startDate: string, endDate: string): Promise<void> {
    try {
      // Fetch invoices dari storage
      const invoices = await storageService.get<any[]>(StorageKeys.PACKAGING.INVOICES);
      const data = extractStorageValue(invoices);

      // Filter by date
      const filtered = data.filter(inv => {
        const invDate = inv.created || inv.date;
        return invDate >= startDate && invDate <= endDate;
      });

      // Flatten items dari invoices
      const flatData = filtered.flatMap(inv =>
        (inv.lines || []).map((line: any) => ({
          created: inv.created,
          soNo: inv.soNo,
          customer: inv.customer,
          itemName: line.itemName,
          qty: line.qty,
          unit: line.unit,
          price: line.price,
          amount: line.total,
        }))
      );

      // Generate template
      const template = reportTemplateEngine.gtSalesReport(flatData, startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Penjualan_GT', startDate, endDate);
      excelFormatter.exportReport(template, filename);
    } catch (error) {
      console.error('Error generating GT sales report:', error);
      throw error;
    }
  },

  /**
   * GENERAL TRADING - Purchase Report
   */
  async generateGTPurchaseReport(startDate: string, endDate: string): Promise<void> {
    try {
      // Fetch GRN dari storage
      const grns = await storageService.get<any[]>(StorageKeys.PACKAGING.GRN);
      const data = extractStorageValue(grns);

      // Filter by date
      const filtered = data.filter(grn => {
        const grnDate = grn.created || grn.date;
        return grnDate >= startDate && grnDate <= endDate;
      });

      // Flatten items
      const flatData = filtered.flatMap(grn =>
        (grn.lines || []).map((line: any) => ({
          created: grn.created,
          poNo: grn.poNo,
          supplier: grn.supplier,
          itemName: line.itemName,
          qty: line.qty,
          unit: line.unit,
          price: line.price,
          total: line.total,
        }))
      );

      // Generate template
      const template = reportTemplateEngine.gtPurchaseReport(flatData, startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Pembelian_GT', startDate, endDate);
      excelFormatter.exportReport(template, filename);
    } catch (error) {
      console.error('Error generating GT purchase report:', error);
      throw error;
    }
  },

  /**
   * GENERAL TRADING - Invoices Report
   */
  async generateGTInvoicesReport(startDate: string, endDate: string): Promise<void> {
    try {
      const invoices = await storageService.get<any[]>(StorageKeys.PACKAGING.INVOICES);
      const data = extractStorageValue(invoices);

      // Filter by date
      const filtered = data.filter(inv => {
        const invDate = inv.created || inv.date;
        return invDate >= startDate && invDate <= endDate;
      });

      // Generate template
      const template = reportTemplateEngine.gtInvoicesReport(filtered, startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Faktur_GT', startDate, endDate);
      excelFormatter.exportReport(template, filename);
    } catch (error) {
      console.error('Error generating GT invoices report:', error);
      throw error;
    }
  },

  /**
   * PACKAGING - Production Report
   */
  async generatePackagingProductionReport(): Promise<void> {
    try {
      const spks = await storageService.get<any[]>(StorageKeys.PACKAGING.SPK);
      const data = extractStorageValue(spks);

      // Generate template
      const template = reportTemplateEngine.packagingProductionReport(data);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Produksi_Packaging');
      excelFormatter.exportReport(template, filename);
    } catch (error) {
      console.error('Error generating packaging production report:', error);
      throw error;
    }
  },

  /**
   * PACKAGING 
   */
  async generatePackagingQCReport(): Promise<void> {
    try {
      const qcData = await storageService.get<any[]>(StorageKeys.PACKAGING.QC);
      const data = extractStorageValue(qcData);

      // Generate template
      const template = reportTemplateEngine.packagingQCReport(data);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_QC_Packaging');
      excelFormatter.exportReport(template, filename);
    } catch (error) {
      console.error('Error generating packaging QC report:', error);
      throw error;
    }
  },

  /** Delivery Report
   */
  async generatePackagingDeliveryNoteReport(startDate: string, endDate: string): Promise<void> {
    try {
      const deliveries = await storageService.get<any[]>(StorageKeys.PACKAGING.DELIVERY);
      const data = extractStorageValue(deliveries);

      console.log('[ReportService] 📦 Packaging delivery note report - Raw data count:', data?.length);

      // Filter by date using helper function
      const filtered = filterByDateRange(data, startDate, endDate);

      console.log('[ReportService] 📦 Filtered delivery note data count:', filtered.length);

      // Generate template
      const template = reportTemplateEngine.packagingDeliveryReport(filtered, startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Pengiriman_Packaging', startDate, endDate);
      excelFormatter.exportReport(template, filename);
    } catch (error) {
      console.error('Error generating packaging delivery report:', error);
      throw error;
    }
  },

  /**
   * packaging - Invoices Report
   */
  async generatePackagingInvoicesReport(startDate: string, endDate: string): Promise<void> {
    try {
      const invoices = await storageService.get<any[]>(StorageKeys.PACKAGING.INVOICES);
      const data = extractStorageValue(invoices);

      // Filter by date
      const filtered = data.filter(inv => {
        const invDate = inv.created || inv.date;
        return invDate >= startDate && invDate <= endDate;
      });

      // Generate template
      const template = reportTemplateEngine.packagingInvoicesReport(filtered, startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Faktur_packaging', startDate, endDate);
      excelFormatter.exportReport(template, filename);
    } catch (error) {
      console.error('Error generating packaging invoices report:', error);
      throw error;
    }
  },

  /**
   * PACKAGING - Sales Customer Analysis Report
   * Analisa pelanggan aktif/tidak aktif berdasarkan sales orders
   */
  async generateSalesCustomerAnalysisReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating sales customer analysis report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch sales orders and customers
      const soRaw = await storageService.get<any[]>('salesOrders');
      const customersRaw = await storageService.get<any[]>('customers');
      
      const soData = extractStorageValue(soRaw);
      const customersData = extractStorageValue(customersRaw);

      if (!soData || soData.length === 0) {
        toast.error('Tidak ada data sales order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Generate template
      const template = reportTemplateEngine.salesCustomerAnalysisReport(soData, customersData || [], startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Analisa_Pelanggan_Aktif_Tidak_Aktif', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Sales customer analysis report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating sales customer analysis report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PACKAGING - Sales Chart Top Items Report
   * Grafik penjualan item terbaik
   */
  async generateSalesChartTopItemsReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating sales chart top items report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch sales orders
      const soRaw = await storageService.get<any[]>('salesOrders');
      const soData = extractStorageValue(soRaw);

      if (!soData || soData.length === 0) {
        toast.error('Tidak ada data sales order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Generate template
      const template = reportTemplateEngine.salesChartTopItemsReport(soData, startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Grafik_Penjualan_Item_Terbaik', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Sales chart top items report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating sales chart top items report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PACKAGING - Sales Chart Daily Report
   * Grafik penjualan harian
   */
  async generateSalesChartDailyReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating sales chart daily report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch sales orders
      const soRaw = await storageService.get<any[]>('salesOrders');
      const soData = extractStorageValue(soRaw);

      if (!soData || soData.length === 0) {
        toast.error('Tidak ada data sales order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Generate template
      const template = reportTemplateEngine.salesChartDailyReport(soData, startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Grafik_Penjualan_Harian', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Sales chart daily report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating sales chart daily report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PACKAGING - Sales Chart Monthly Report
   * Grafik penjualan bulanan
   */
  async generateSalesChartMonthlyReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating sales chart monthly report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch sales orders
      const soRaw = await storageService.get<any[]>('salesOrders');
      const soData = extractStorageValue(soRaw);

      if (!soData || soData.length === 0) {
        toast.error('Tidak ada data sales order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Generate template
      const template = reportTemplateEngine.salesChartMonthlyReport(soData, startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Grafik_Penjualan_Bulanan', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Sales chart monthly report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating sales chart monthly report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PACKAGING - Sales Chart Customer Expiry Report
   * Grafik kadaluarsa pelanggan
   */
  async generateSalesChartCustomerExpiryReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating sales chart customer expiry report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch sales orders and customers
      const soRaw = await storageService.get<any[]>('salesOrders');
      const customersRaw = await storageService.get<any[]>('customers');
      
      const soData = extractStorageValue(soRaw);
      const customersData = extractStorageValue(customersRaw);

      if (!soData || soData.length === 0) {
        toast.error('Tidak ada data sales order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Generate template
      const template = reportTemplateEngine.salesChartCustomerExpiryReport(soData, customersData || [], startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Grafik_Kadaluarsa_Pelanggan', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Sales chart customer expiry report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating sales chart customer expiry report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PACKAGING - Sales Tax Invoice CSV Report
   * CSV/XML Faktur Pajak Keluaran
   */
  async generateSalesTaxInvoiceCSVReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating sales tax invoice CSV report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch invoices
      const invoicesRaw = await storageService.get<any[]>('invoices');
      const invoicesData = extractStorageValue(invoicesRaw);

      if (!invoicesData || invoicesData.length === 0) {
        toast.error('Tidak ada data faktur. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Generate template
      const template = reportTemplateEngine.salesTaxInvoiceCSVReport(invoicesData, startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Faktur_Pajak_Keluaran_CSV', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Sales tax invoice CSV report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating sales tax invoice CSV report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * MASTER DATA - Products Report
   * FORCE SERVER MODE - Always fetch dari PostgreSQL, bukan localStorage
   * PAD Code = customer code dari customer master
   * Stock = nextStock dari inventory table
   */
  async generateMasterProductsReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating master products report...');
      
      // Get storage config
      const config = storageService.getConfig();
      console.log('[ReportService] 📡 Storage config BEFORE:', config);
      
      // FORCE SERVER MODE untuk reports
      if (config.type !== 'server' || !config.serverUrl) {
        console.warn('[ReportService] ⚠️ Not in server mode, forcing server mode...');
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }
      
      console.log('[ReportService] ✅ Server mode confirmed:', config.serverUrl);
      
      // Fetch products, customers, dan inventory dari SERVER - SAMA SEPERTI Products.tsx
      const productsRaw = await storageService.get<any[]>('products');
      const customersRaw = await storageService.get<any[]>('customers');
      const inventoryRaw = await storageService.get<any[]>('inventory');
      
      // Extract value menggunakan helper function - SAMA SEPERTI Products.tsx
      const productsData = extractStorageValue(productsRaw);
      const customersData = extractStorageValue(customersRaw);
      const inventoryData = extractStorageValue(inventoryRaw);
      
      console.log('[ReportService] 📊 Fetched data dari SERVER:', {
        productsCount: productsData.length,
        customersCount: customersData.length,
        inventoryCount: inventoryData.length,
        storageType: config.type,
        serverUrl: config.serverUrl,
        productsDataSample: productsData.slice(0, 2),
        customersDataSample: customersData.slice(0, 2),
        inventoryDataSample: inventoryData.slice(0, 2),
      });

      if (!productsData || productsData.length === 0) {
        console.warn('[ReportService] ⚠️ No products found in server storage');
        toast.error('Tidak ada data produk di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Build customer lookup map: customer name -> customer code
      const customerCodeMap = new Map<string, string>();
      customersData.forEach((cust: any) => {
        if (cust.nama && cust.kode) {
          customerCodeMap.set(cust.nama.toLowerCase().trim(), cust.kode.trim());
        }
      });
      
      console.log('[ReportService] 🔍 Customer code map created:', {
        size: customerCodeMap.size,
        sample: Array.from(customerCodeMap.entries()).slice(0, 3),
      });

      // Build inventory lookup map: product_id/kode -> nextStock
      // Inventory items bisa match dengan product berdasarkan:
      // 1. codeItem (inventory) == kode (product)
      // 2. codeItem (inventory) == product_id (product)
      // 3. item_code (inventory) == kode (product)
      const inventoryMap = new Map<string, number>();
      inventoryData.forEach((inv: any) => {
        const codeItem = (inv.codeItem || inv.item_code || '').toString().trim().toLowerCase();
        const nextStock = Number(inv.nextStock || 0) || 0;
        
        if (codeItem) {
          inventoryMap.set(codeItem, nextStock);
        }
      });
      
      console.log('[ReportService] 📦 Inventory map created:', {
        size: inventoryMap.size,
        sample: Array.from(inventoryMap.entries()).slice(0, 5),
      });

      // Generate template dengan data dari server + customer codes + inventory stock
      const template = reportTemplateEngine.masterProductsReport(productsData, customerCodeMap, inventoryMap);
      
      console.log('[ReportService] 📋 Template generated:', {
        title: template.title,
        dataRows: template.data.length,
        headers: template.headers,
        sample: template.data.slice(0, 3),
        totals: template.totals,
      });

      // Export ke Excel
      const filename = excelFormatter.generateFilename('Daftar_Produk');
      excelFormatter.exportReport(template, filename);
      
      console.log('[ReportService] ✅ Master products report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating master products report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * MASTER DATA - Products with BOM Report
   * FORCE SERVER MODE - Always fetch dari PostgreSQL, bukan localStorage
   */
  async generateMasterProductsBOMReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating master products with BOM report...');
      
      // Get storage config
      const config = storageService.getConfig();
      console.log('[ReportService] 📡 Storage config:', config);
      
      // FORCE SERVER MODE untuk reports
      if (config.type !== 'server' || !config.serverUrl) {
        console.warn('[ReportService] ⚠️ Not in server mode, forcing server mode...');
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }
      
      console.log('[ReportService] ✅ Server mode confirmed:', config.serverUrl);
      
      // Fetch products, BOM, dan materials dari SERVER
      const productsRaw = await storageService.get<any[]>('products');
      const bomRaw = await storageService.get<any[]>('bom');
      const materialsRaw = await storageService.get<any[]>('materials');
      
      // Extract value menggunakan helper function
      const productsData = extractStorageValue(productsRaw);
      const bomData = extractStorageValue(bomRaw);
      const materialsData = extractStorageValue(materialsRaw);
      
      console.log('[ReportService] 📊 Fetched data dari SERVER:', {
        productsCount: productsData.length,
        bomCount: bomData.length,
        materialsCount: materialsData.length,
        storageType: config.type,
        serverUrl: config.serverUrl,
      });

      if (!productsData || productsData.length === 0) {
        console.warn('[ReportService] ⚠️ No products found in server storage');
        toast.error('Tidak ada data produk di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Build materials lookup map
      const materialsMap = new Map<string, any>();
      materialsData.forEach((mat: any) => {
        const kode = (mat.kode || mat.code || '').toString().trim().toLowerCase();
        if (kode) {
          materialsMap.set(kode, mat);
        }
      });
      
      console.log('[ReportService] 🔍 Materials map created:', {
        size: materialsMap.size,
      });

      // Generate template dengan data dari server
      const template = reportTemplateEngine.masterProductsBOMReport(productsData, bomData, materialsMap);
      
      console.log('[ReportService] 📋 Template generated:', {
        title: template.title,
        dataRows: template.data.length,
        headers: template.headers,
      });

      // Export ke Excel
      const filename = excelFormatter.generateFilename('Daftar_Produk_BOM');
      excelFormatter.exportReport(template, filename);
      
      console.log('[ReportService] ✅ Master products with BOM report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating master products with BOM report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * MASTER DATA - Customers Report
   * FORCE SERVER MODE - Always fetch dari PostgreSQL, bukan localStorage
   */
  async generateMasterCustomersReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating master customers report...');
      
      // Get storage config
      const config = storageService.getConfig();
      console.log('[ReportService] 📡 Storage config:', config);
      
      // FORCE SERVER MODE untuk reports
      if (config.type !== 'server' || !config.serverUrl) {
        console.warn('[ReportService] ⚠️ Not in server mode, forcing server mode...');
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }
      
      console.log('[ReportService] ✅ Server mode confirmed:', config.serverUrl);
      
      // Fetch customers dari SERVER
      const customersRaw = await storageService.get<any[]>('customers');
      
      // Extract value menggunakan helper function
      const customersData = extractStorageValue(customersRaw);
      
      console.log('[ReportService] 📊 Fetched customers dari SERVER:', {
        customersCount: customersData.length,
        storageType: config.type,
        serverUrl: config.serverUrl,
        customersDataSample: customersData.slice(0, 2),
      });

      if (!customersData || customersData.length === 0) {
        console.warn('[ReportService] ⚠️ No customers found in server storage');
        toast.error('Tidak ada data pelanggan di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Generate template
      const template = reportTemplateEngine.masterCustomersReport(customersData);
      
      console.log('[ReportService] 📋 Template generated:', {
        title: template.title,
        dataRows: template.data.length,
        headers: template.headers,
      });

      // Export ke Excel
      const filename = excelFormatter.generateFilename('Daftar_Pelanggan');
      excelFormatter.exportReport(template, filename);
      
      console.log('[ReportService] ✅ Master customers report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating master customers report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * MASTER DATA - Suppliers Report
   * FORCE SERVER MODE - Always fetch dari PostgreSQL, bukan localStorage
   */
  async generateMasterSuppliersReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating master suppliers report...');
      
      // Get storage config
      const config = storageService.getConfig();
      console.log('[ReportService] 📡 Storage config:', config);
      
      // FORCE SERVER MODE untuk reports
      if (config.type !== 'server' || !config.serverUrl) {
        console.warn('[ReportService] ⚠️ Not in server mode, forcing server mode...');
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }
      
      console.log('[ReportService] ✅ Server mode confirmed:', config.serverUrl);
      
      // Fetch suppliers dari SERVER
      const suppliersRaw = await storageService.get<any[]>('suppliers');
      
      // Extract value menggunakan helper function
      const suppliersData = extractStorageValue(suppliersRaw);
      
      console.log('[ReportService] 📊 Fetched suppliers dari SERVER:', {
        suppliersCount: suppliersData.length,
        storageType: config.type,
        serverUrl: config.serverUrl,
        suppliersDataSample: suppliersData.slice(0, 2),
      });

      if (!suppliersData || suppliersData.length === 0) {
        console.warn('[ReportService] ⚠️ No suppliers found in server storage');
        toast.error('Tidak ada data supplier di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Generate template
      const template = reportTemplateEngine.masterSuppliersReport(suppliersData);
      
      console.log('[ReportService] 📋 Template generated:', {
        title: template.title,
        dataRows: template.data.length,
        headers: template.headers,
      });

      // Export ke Excel
      const filename = excelFormatter.generateFilename('Daftar_Supplier');
      excelFormatter.exportReport(template, filename);
      
      console.log('[ReportService] ✅ Master suppliers report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating master suppliers report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * MASTER DATA - Materials Report
   * Fetch dari inventory, filter hanya material items
   */
  async generateMasterMaterialsReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating master materials report...');
      
      // Get storage config
      const config = storageService.getConfig();
      console.log('[ReportService] 📡 Storage config:', config);
      
      // FORCE SERVER MODE untuk reports
      if (config.type !== 'server' || !config.serverUrl) {
        console.warn('[ReportService] ⚠️ Not in server mode, forcing server mode...');
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }
      
      console.log('[ReportService] ✅ Server mode confirmed:', config.serverUrl);
      
      // Fetch inventory dari SERVER (bukan 'materials' yang tidak ada)
      const inventoryRaw = await storageService.get<any[]>('inventory');
      
      // Extract value menggunakan helper function
      let inventoryData = extractStorageValue(inventoryRaw);
      
      console.log('[ReportService] 📊 Fetched inventory dari SERVER:', {
        inventoryCount: inventoryData.length,
        storageType: config.type,
        serverUrl: config.serverUrl,
      });

      if (!inventoryData || inventoryData.length === 0) {
        console.warn('[ReportService] ⚠️ No inventory found in server storage');
        toast.error('Tidak ada data inventory di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Filter hanya material items (kategori = 'Material')
      const materialsData = inventoryData.filter((item: any) => {
        const kategori = (item.kategori || '').toLowerCase().trim();
        return kategori === 'material';
      });

      console.log('[ReportService] 📊 Filtered materials:', {
        totalInventory: inventoryData.length,
        materialsCount: materialsData.length,
        materialsSample: materialsData.slice(0, 2),
      });

      if (materialsData.length === 0) {
        console.warn('[ReportService] ⚠️ No material items found in inventory');
        toast.error('Tidak ada data material di inventory. Pastikan kategori item sudah diset ke "Material".');
        return;
      }

      // Transform inventory structure ke template structure
      // Template expects: kode, nama, satuan, kategori, supplier, harga, stockAman
      const transformedData = materialsData.map((item: any) => ({
        kode: item.codeItem || item.item_code || '',
        nama: item.description || '',
        satuan: item.satuan || 'PCS',
        kategori: item.kategori || 'Material',
        supplier: item.supplierName || '',
        harga: item.price || 0,
        stockAman: item.nextStock || 0, // Use nextStock as stock display
      }));

      // Generate template
      const template = reportTemplateEngine.masterMaterialsReport(transformedData);
      
      console.log('[ReportService] 📋 Template generated:', {
        title: template.title,
        dataRows: template.data.length,
        headers: template.headers,
      });

      // Export ke Excel
      const filename = excelFormatter.generateFilename('Daftar_Material');
      excelFormatter.exportReport(template, filename);
      
      console.log('[ReportService] ✅ Master materials report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating master materials report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * MASTER DATA - Staff/Employees Report
   * FORCE SERVER MODE - Always fetch dari PostgreSQL, bukan localStorage
   */
  async generateMasterStaffReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating master staff report...');
      
      // Get storage config
      const config = storageService.getConfig();
      console.log('[ReportService] 📡 Storage config:', config);
      
      // FORCE SERVER MODE untuk reports
      if (config.type !== 'server' || !config.serverUrl) {
        console.warn('[ReportService] ⚠️ Not in server mode, forcing server mode...');
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }
      
      console.log('[ReportService] ✅ Server mode confirmed:', config.serverUrl);
      
      // Fetch staff dari SERVER
      const staffRaw = await storageService.get<any[]>('staff');
      
      // Extract value menggunakan helper function
      const staffData = extractStorageValue(staffRaw);
      
      console.log('[ReportService] 📊 Fetched staff dari SERVER:', {
        staffCount: staffData.length,
        storageType: config.type,
        serverUrl: config.serverUrl,
        staffDataSample: staffData.slice(0, 2),
      });

      if (!staffData || staffData.length === 0) {
        console.warn('[ReportService] ⚠️ No staff found in server storage');
        toast.error('Tidak ada data karyawan di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Generate template
      const template = reportTemplateEngine.masterStaffReport(staffData);
      
      console.log('[ReportService] 📋 Template generated:', {
        title: template.title,
        dataRows: template.data.length,
        headers: template.headers,
      });

      // Export ke Excel
      const filename = excelFormatter.generateFilename('Daftar_Karyawan');
      excelFormatter.exportReport(template, filename);
      
      console.log('[ReportService] ✅ Master staff report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating master staff report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * MASTER DATA - Categories Report
   * Combine product categories dan material categories dari inventory
   */
  async generateMasterCategoriesReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating master categories report...');
      
      // Get storage config
      const config = storageService.getConfig();
      console.log('[ReportService] 📡 Storage config:', config);
      
      // FORCE SERVER MODE untuk reports
      if (config.type !== 'server' || !config.serverUrl) {
        console.warn('[ReportService] ⚠️ Not in server mode, forcing server mode...');
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }
      
      console.log('[ReportService] ✅ Server mode confirmed:', config.serverUrl);
      
      // Fetch inventory dari SERVER
      const inventoryRaw = await storageService.get<any[]>('inventory');
      
      // Extract value menggunakan helper function
      let inventoryData = extractStorageValue(inventoryRaw);
      
      console.log('[ReportService] 📊 Fetched inventory dari SERVER:', {
        inventoryCount: inventoryData.length,
        storageType: config.type,
        serverUrl: config.serverUrl,
      });

      if (!inventoryData || inventoryData.length === 0) {
        console.warn('[ReportService] ⚠️ No inventory found in server storage');
        toast.error('Tidak ada data inventory di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Generate template dengan data lengkap
      const template = reportTemplateEngine.masterCompleteInventoryReport(inventoryData);
      
      console.log('[ReportService] 📋 Template generated:', {
        title: template.title,
        dataRows: template.data.length,
        headers: template.headers,
      });

      // Export ke Excel
      const filename = excelFormatter.generateFilename('Daftar_Kategori_Produk');
      excelFormatter.exportReport(template, filename);
      
      console.log('[ReportService] ✅ Master categories report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating master categories report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * INVENTORY - Stock Report
   * Fetch dari inventory table + join dengan products untuk nama & kategori
   */
  async generateInventoryStockReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating inventory stock report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch inventory + products dari SERVER - use 'inventory' key (not 'inventory')
      const inventoryRaw = await storageService.get<any[]>('inventory');
      const productsRaw = await storageService.get<any[]>('products');
      
      const inventoryData = extractStorageValue(inventoryRaw);
      const productsData = extractStorageValue(productsRaw);

      console.log('[ReportService] 📊 Fetched data:', {
        inventoryCount: inventoryData?.length || 0,
        productsCount: productsData?.length || 0,
        inventorySample: inventoryData?.slice(0, 2),
      });

      if (!inventoryData || inventoryData.length === 0) {
        toast.error('Tidak ada data inventory. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Build product lookup map: product_id/kode -> product details
      const productMap = new Map<string, any>();
      productsData?.forEach((prod: any) => {
        if (prod.id) productMap.set(prod.id.toString().toLowerCase(), prod);
        if (prod.kode) productMap.set(prod.kode.toString().toLowerCase(), prod);
        if (prod.product_id) productMap.set(prod.product_id.toString().toLowerCase(), prod);
      });

      // Enrich inventory data dengan product info
      // Inventory fields: codeItem, description, kategori, satuan, price, nextStock
      // Price logic:
      // - Material: use hargaBeli (cost price)
      // - Product: use hargaFG (selling price)
      const enrichedData = inventoryData.map((inv: any) => {
        const productKey = (inv.codeItem || inv.item_code || '').toString().toLowerCase();
        const product = productMap.get(productKey);
        const kategori = (inv.kategori || product?.kategori || product?.category || '').toLowerCase().trim();
        
        // Determine price based on kategori
        let harga = Number(inv.price || 0);
        if (kategori === 'product') {
          // For products, use hargaFG (selling price)
          harga = Number(product?.hargaFG || product?.harga || inv.price || 0);
        } else {
          // For materials, use hargaBeli (cost price)
          harga = Number(product?.hargaBeli || inv.price || 0);
        }

        const stok = Number(inv.nextStock || inv.stock || 0);
        const nilaiStok = stok * harga;

        return {
          no: inv.no || '',
          kode: inv.codeItem || inv.item_code || '',
          nama: inv.description || product?.nama || product?.name || '',
          kategori: kategori,
          stok: stok,
          hargaBeli: harga,
          nilaiStok: nilaiStok,
          minStock: Number(inv.minStock || product?.minStock || 0),
          maxStock: Number(inv.maxStock || product?.maxStock || 0),
        };
      });

      console.log('[ReportService] 📦 Enriched inventory data:', {
        count: enrichedData.length,
        sample: enrichedData.slice(0, 3),
      });

      // Generate template
      const template = reportTemplateEngine.inventoryStockReport(enrichedData);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Stok_Barang');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Inventory stock report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating inventory stock report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * MASTER DATA - Units Report
   * Tarik satuan unik dari product dan material
   */
  async generateMasterUnitsReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating master units report...');
      
      // Get storage config
      const config = storageService.getConfig();
      console.log('[ReportService] 📡 Storage config:', config);
      
      // FORCE SERVER MODE untuk reports
      if (config.type !== 'server' || !config.serverUrl) {
        console.warn('[ReportService] ⚠️ Not in server mode, forcing server mode...');
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }
      
      console.log('[ReportService] ✅ Server mode confirmed:', config.serverUrl);
      
      // Fetch inventory dari SERVER
      const inventoryRaw = await storageService.get<any[]>('inventory');
      
      // Extract value menggunakan helper function
      let inventoryData = extractStorageValue(inventoryRaw);
      
      console.log('[ReportService] 📊 Fetched inventory dari SERVER:', {
        inventoryCount: inventoryData.length,
        storageType: config.type,
        serverUrl: config.serverUrl,
      });

      if (!inventoryData || inventoryData.length === 0) {
        console.warn('[ReportService] ⚠️ No inventory found in server storage');
        toast.error('Tidak ada data inventory di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Generate template
      const template = reportTemplateEngine.masterUnitsReport(inventoryData);
      
      console.log('[ReportService] 📋 Template generated:', {
        title: template.title,
        dataRows: template.data.length,
        headers: template.headers,
      });

      // Export ke Excel
      const filename = excelFormatter.generateFilename('Daftar_Satuan');
      excelFormatter.exportReport(template, filename);
      
      console.log('[ReportService] ✅ Master units report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating master units report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * ACCOUNTS RECEIVABLE - AR Report (Piutang)
   * Fetch invoices dan payments, hitung outstanding piutang per customer
   */
  async generateARReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating AR report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch invoices dan payments dari PACKAGING
      const invoicesRaw = await storageService.get('invoices');
      const paymentsRaw = await storageService.get('payments');
      
      const invoices = extractStorageValue(invoicesRaw) || [];
      const payments = extractStorageValue(paymentsRaw) || [];

      console.log('[ReportService] 📊 AR Report - Data fetched:', {
        invoicesCount: invoices.length,
        paymentsCount: payments.length,
      });

      if (!invoices || invoices.length === 0) {
        toast.error('Tidak ada data invoices. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Build payments map: invoiceNo -> total paid
      const paymentsMap = new Map<string, number>();
      payments.forEach((payment: any) => {
        const invoiceNo = payment.invoiceNo || payment.refNo || '';
        if (invoiceNo) {
          const current = paymentsMap.get(invoiceNo) || 0;
          paymentsMap.set(invoiceNo, current + (payment.amount || 0));
        }
      });

      // Build AR data
      const arData = invoices.map((inv: any) => {
        const invoiceNo = inv.invoiceNo || inv.no || '';
        const total = inv.amount || inv.total || 0;
        const paid = paymentsMap.get(invoiceNo) || 0;
        const outstanding = total - paid;
        const dueDate = new Date(inv.dueDate || inv.created || inv.date);
        const isOverdue = dueDate < new Date();

        return {
          'No. Faktur': invoiceNo,
          'Pelanggan': inv.customer || inv.customerName || '',
          'Tanggal': inv.created || inv.date || '',
          'Jatuh Tempo': inv.dueDate || inv.created || inv.date || '',
          'Total': total,
          'Terbayar': paid,
          'Sisa Piutang': outstanding,
          'Status': isOverdue ? 'OVERDUE' : (outstanding > 0 ? 'OUTSTANDING' : 'LUNAS'),
          'Umur (hari)': Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)),
        };
      });

      // Calculate totals
      const totalInvoice = arData.reduce((sum: number, row: any) => sum + row['Total'], 0);
      const totalPaid = arData.reduce((sum: number, row: any) => sum + row['Terbayar'], 0);
      const totalOutstanding = arData.reduce((sum: number, row: any) => sum + row['Sisa Piutang'], 0);

      // Generate template
      const template = reportTemplateEngine.arReport(arData, {
        totalInvoice,
        totalPaid,
        totalOutstanding,
      });

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Piutang_AR');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ AR report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating AR report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * ACCOUNTS PAYABLE - AP Report (Hutang)
   * Fetch GRN dan payments, hitung outstanding hutang per supplier
   */
  async generateAPReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating AP report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch GRN dan payments dari PACKAGING
      const grnRaw = await storageService.get('grn');
      const paymentsRaw = await storageService.get('payments');
      
      const grns = extractStorageValue(grnRaw) || [];
      const payments = extractStorageValue(paymentsRaw) || [];

      console.log('[ReportService] 📊 AP Report - Data fetched:', {
        grnCount: grns.length,
        paymentsCount: payments.length,
      });

      if (!grns || grns.length === 0) {
        toast.error('Tidak ada data GRN. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Build payments map: grnNo -> total paid
      const paymentsMap = new Map<string, number>();
      payments.forEach((payment: any) => {
        const grnNo = payment.grnNo || payment.refNo || '';
        if (grnNo) {
          const current = paymentsMap.get(grnNo) || 0;
          paymentsMap.set(grnNo, current + (payment.amount || 0));
        }
      });

      // Build AP data
      const apData = grns.map((grn: any) => {
        const grnNo = grn.grnNo || grn.no || '';
        const total = grn.amount || grn.total || 0;
        const paid = paymentsMap.get(grnNo) || 0;
        const outstanding = total - paid;
        const dueDate = new Date(grn.dueDate || grn.created || grn.date);
        const isOverdue = dueDate < new Date();

        return {
          'No. GRN': grnNo,
          'Supplier': grn.supplier || grn.supplierName || '',
          'Tanggal': grn.created || grn.date || '',
          'Jatuh Tempo': grn.dueDate || grn.created || grn.date || '',
          'Total': total,
          'Terbayar': paid,
          'Sisa Hutang': outstanding,
          'Status': isOverdue ? 'OVERDUE' : (outstanding > 0 ? 'OUTSTANDING' : 'LUNAS'),
          'Umur (hari)': Math.floor((new Date().getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)),
        };
      });

      // Calculate totals
      const totalInvoice = apData.reduce((sum: number, row: any) => sum + row['Total'], 0);
      const totalPaid = apData.reduce((sum: number, row: any) => sum + row['Terbayar'], 0);
      const totalOutstanding = apData.reduce((sum: number, row: any) => sum + row['Sisa Hutang'], 0);

      // Generate template
      const template = reportTemplateEngine.apReport(apData, {
        totalInvoice,
        totalPaid,
        totalOutstanding,
      });

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Hutang_AP');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ AP report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating AP report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  // AR REPORTS - 9 methods
  async generateARPerCustomerReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating AR per customer report...');
      
      // 🚀 Fetch packaging invoices from storage
      const invoicesRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.INVOICES);
      const invoices = extractStorageValue(invoicesRaw);
      
      if (!invoices || invoices.length === 0) {
        toast.error('Tidak ada data invoices dari packaging.');
        return;
      }
      
      // Aggregate invoices by customer
      const arByCustomer: Record<string, any> = {};
      invoices.forEach((inv: any) => {
        const custName = inv.customer || inv.customerName || 'Unknown';
        if (!arByCustomer[custName]) {
          arByCustomer[custName] = {
            customerName: custName,
            totalInvoices: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalOutstanding: 0,
            overdueAmount: 0,
          };
        }
        arByCustomer[custName].totalInvoices += 1;
        const amount = inv.bom?.total || inv.totalAmount || 0;
        arByCustomer[custName].totalAmount += amount;
        // Calculate paid based on paymentStatus
        const paid = inv.paymentStatus === 'PAID' ? amount : 0;
        arByCustomer[custName].totalPaid += paid;
        arByCustomer[custName].totalOutstanding += amount - paid;
        
        // Check if overdue
        if (inv.created && new Date(inv.created) < new Date() && arByCustomer[custName].totalOutstanding > 0) {
          arByCustomer[custName].overdueAmount += amount - paid;
        }
      });
      
      const aggregatedData = Object.values(arByCustomer);
      const template = reportTemplateEngine.arPerCustomerReport(aggregatedData);
      const filename = excelFormatter.generateFilename('Piutang_Per_Pelanggan', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ AR per customer report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  async generateARPerInvoiceReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating AR per invoice report...');
      const invoicesRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.INVOICES);
      const invoices = extractStorageValue(invoicesRaw);
      if (!invoices || invoices.length === 0) {
        toast.error('Tidak ada data invoices dari packaging.');
        return;
      }
      
      // Transform invoices to AR per invoice format
      const arPerInvoice = invoices.map((inv: any) => {
        const amount = inv.bom?.total || inv.totalAmount || 0;
        const paid = inv.paymentStatus === 'PAID' ? amount : 0;
        return {
          invoiceNo: inv.invoiceNo || inv.noFaktur || 'N/A',
          customerName: inv.customer || inv.customerName || 'Unknown',
          invoiceDate: inv.created || inv.invoiceDate || inv.date || new Date().toISOString(),
          dueDate: inv.dueDate || new Date().toISOString(),
          totalAmount: amount,
          totalPaid: paid,
          totalOutstanding: amount - paid,
          status: amount - paid > 0 ? 'OUTSTANDING' : 'LUNAS',
        };
      });
      
      const template = reportTemplateEngine.arPerInvoiceReport(arPerInvoice);
      const filename = excelFormatter.generateFilename('Piutang_Per_Faktur', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ AR per invoice report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  async generateARAgingReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating AR aging report...');
      const invoicesRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.INVOICES);
      const invoices = extractStorageValue(invoicesRaw);
      if (!invoices || invoices.length === 0) {
        toast.error('Tidak ada data invoices dari packaging.');
        return;
      }
      
      // Calculate aging buckets
      const today = new Date();
      const arAging = invoices.map((inv: any) => {
        const dueDate = new Date(inv.dueDate || inv.created || inv.invoiceDate || new Date());
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const amount = inv.bom?.total || inv.totalAmount || 0;
        const paid = inv.paymentStatus === 'PAID' ? amount : 0;
        const outstanding = amount - paid;
        
        let agingBucket = 'Current';
        if (daysOverdue > 90) agingBucket = '> 90 days';
        else if (daysOverdue > 60) agingBucket = '61-90 days';
        else if (daysOverdue > 30) agingBucket = '31-60 days';
        else if (daysOverdue > 0) agingBucket = '1-30 days';
        
        return {
          invoiceNo: inv.invoiceNo || inv.noFaktur || 'N/A',
          customerName: inv.customer || inv.customerName || 'Unknown',
          invoiceDate: inv.created || inv.invoiceDate || inv.date || new Date().toISOString(),
          dueDate: inv.dueDate || new Date().toISOString(),
          daysOverdue: Math.max(0, daysOverdue),
          agingBucket,
          totalAmount: amount,
          totalPaid: paid,
          outstanding,
        };
      });
      
      const template = reportTemplateEngine.arAgingReport(arAging);
      const filename = excelFormatter.generateFilename('Aging_Piutang', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ AR aging report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  async generateARPaymentReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating AR payment report...');
      const paymentsRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.PAYMENTS);
      const payments = extractStorageValue(paymentsRaw);
      if (!payments || payments.length === 0) {
        toast.error('Tidak ada data pembayaran dari packaging.');
        return;
      }
      
      // Filter AR payments (customer payments)
      const arPayments = payments.filter((pmt: any) => pmt.type === 'AR' || pmt.customer).map((pmt: any) => ({
        paymentNo: pmt.paymentNo || pmt.noReferensi || 'N/A',
        invoiceNo: pmt.invoiceNo || pmt.noFaktur || 'N/A',
        customerName: pmt.customer || pmt.customerName || 'Unknown',
        paymentDate: pmt.paymentDate || pmt.created || new Date().toISOString(),
        paymentMethod: pmt.paymentMethod || pmt.metode || 'Unknown',
        paymentAmount: pmt.paymentAmount || pmt.amount || 0,
        reference: pmt.reference || pmt.referensi || '',
      }));
      
      const template = reportTemplateEngine.arPaymentReport(arPayments);
      const filename = excelFormatter.generateFilename('Pembayaran_Piutang', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ AR payment report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  async generateAROutstandingReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating AR outstanding report...');
      const invoicesRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.INVOICES);
      const invoices = extractStorageValue(invoicesRaw);
      if (!invoices || invoices.length === 0) {
        toast.error('Tidak ada data invoices dari packaging.');
        return;
      }
      
      // Filter only outstanding invoices
      const outstanding = invoices.filter((inv: any) => {
        const amount = inv.bom?.total || inv.totalAmount || 0;
        const paid = inv.paymentStatus === 'PAID' ? amount : 0;
        return amount - paid > 0;
      }).map((inv: any) => {
        const amount = inv.bom?.total || inv.totalAmount || 0;
        const paid = inv.paymentStatus === 'PAID' ? amount : 0;
        return {
          invoiceNo: inv.invoiceNo || inv.noFaktur || 'N/A',
          customerName: inv.customer || inv.customerName || 'Unknown',
          invoiceDate: inv.created || inv.invoiceDate || inv.date || new Date().toISOString(),
          dueDate: inv.dueDate || new Date().toISOString(),
          totalAmount: amount,
          totalPaid: paid,
          outstanding: amount - paid,
        };
      });
      
      const template = reportTemplateEngine.arOutstandingReport(outstanding);
      const filename = excelFormatter.generateFilename('Sisa_Piutang', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ AR outstanding report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  async generateARDueReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating AR due report...');
      const invoicesRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.INVOICES);
      const invoices = extractStorageValue(invoicesRaw);
      if (!invoices || invoices.length === 0) {
        toast.error('Tidak ada data invoices dari packaging.');
        return;
      }
      
      // Filter invoices due soon (within 7 days)
      const today = new Date();
      const dueInSevenDays = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const dueSoon = invoices.filter((inv: any) => {
        const dueDate = new Date(inv.dueDate || inv.created || inv.invoiceDate || new Date());
        const amount = inv.bom?.total || inv.totalAmount || 0;
        const paid = inv.paymentStatus === 'PAID' ? amount : 0;
        return dueDate <= dueInSevenDays && amount - paid > 0;
      }).map((inv: any) => {
        const amount = inv.bom?.total || inv.totalAmount || 0;
        const paid = inv.paymentStatus === 'PAID' ? amount : 0;
        return {
          invoiceNo: inv.invoiceNo || inv.noFaktur || 'N/A',
          customerName: inv.customer || inv.customerName || 'Unknown',
          invoiceDate: inv.created || inv.invoiceDate || inv.date || new Date().toISOString(),
          dueDate: inv.dueDate || new Date().toISOString(),
          daysUntilDue: Math.ceil((new Date(inv.dueDate || inv.created || inv.invoiceDate || new Date()).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
          totalAmount: amount,
          totalPaid: paid,
          outstanding: amount - paid,
        };
      });
      
      const template = reportTemplateEngine.arDueReport(dueSoon);
      const filename = excelFormatter.generateFilename('Piutang_Jatuh_Tempo', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ AR due report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  async generateAROverdueReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating AR overdue report...');
      const invoicesRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.INVOICES);
      const invoices = extractStorageValue(invoicesRaw);
      if (!invoices || invoices.length === 0) {
        toast.error('Tidak ada data invoices dari packaging.');
        return;
      }
      
      // Filter overdue invoices
      const today = new Date();
      const overdue = invoices.filter((inv: any) => {
        const dueDate = new Date(inv.dueDate || inv.created || new Date());
        const amount = inv.bom?.total || 0;
        const paid = inv.paymentStatus === 'PAID' ? amount : 0;
        return dueDate < today && amount - paid > 0;
      }).map((inv: any) => {
        const amount = inv.bom?.total || 0;
        const paid = inv.paymentStatus === 'PAID' ? amount : 0;
        return {
          invoiceNo: inv.invoiceNo || inv.noFaktur || 'N/A',
          customerName: inv.customer || inv.customerName || 'Unknown',
          invoiceDate: inv.created || inv.invoiceDate || new Date().toISOString(),
          dueDate: inv.dueDate || new Date().toISOString(),
          daysOverdue: Math.floor((today.getTime() - new Date(inv.dueDate || inv.created || new Date()).getTime()) / (1000 * 60 * 60 * 24)),
          totalAmount: amount,
          totalPaid: paid,
          outstanding: amount - paid,
        };
      });
      
      const template = reportTemplateEngine.arOverdueReport(overdue);
      const filename = excelFormatter.generateFilename('Piutang_Overdue', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ AR overdue report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  async generateARCardReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating AR card report...');
      const invoicesRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.INVOICES);
      const invoices = extractStorageValue(invoicesRaw);
      if (!invoices || invoices.length === 0) {
        toast.error('Tidak ada data invoices dari packaging.');
        return;
      }
      
      // Create AR card (detail per invoice)
      const arCard = invoices.map((inv: any) => {
        const amount = inv.bom?.total || 0;
        const paid = inv.paymentStatus === 'PAID' ? amount : 0;
        return {
          invoiceNo: inv.invoiceNo || inv.noFaktur || 'N/A',
          customerName: inv.customer || inv.customerName || 'Unknown',
          invoiceDate: inv.created || inv.invoiceDate || new Date().toISOString(),
          dueDate: inv.dueDate || new Date().toISOString(),
          totalAmount: amount,
          totalPaid: paid,
          outstanding: amount - paid,
          status: amount - paid > 0 ? 'OUTSTANDING' : 'LUNAS',
        };
      });
      
      const template = reportTemplateEngine.arCardReport(arCard);
      const filename = excelFormatter.generateFilename('Kartu_Piutang', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ AR card report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  async generateARAnalysisReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating AR analysis report...');
      const invoicesRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.INVOICES);
      const invoices = extractStorageValue(invoicesRaw);
      if (!invoices || invoices.length === 0) {
        toast.error('Tidak ada data invoices dari packaging.');
        return;
      }
      
      // Aggregate by customer for analysis
      const arAnalysis: Record<string, any> = {};
      invoices.forEach((inv: any) => {
        const custName = inv.customer || inv.customerName || 'Unknown';
        if (!arAnalysis[custName]) {
          arAnalysis[custName] = {
            customerName: custName,
            totalInvoices: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalOutstanding: 0,
            overdueAmount: 0,
            averagePaymentDays: 0,
          };
        }
        const amount = inv.bom?.total || 0;
        const paid = inv.paymentStatus === 'PAID' ? amount : 0;
        arAnalysis[custName].totalInvoices += 1;
        arAnalysis[custName].totalAmount += amount;
        arAnalysis[custName].totalPaid += paid;
        arAnalysis[custName].totalOutstanding += amount - paid;
        
        if (inv.dueDate && new Date(inv.dueDate) < new Date()) {
          arAnalysis[custName].overdueAmount += amount - paid;
        }
      });
      
      const analysisData = Object.values(arAnalysis);
      const template = reportTemplateEngine.arAnalysisReport(analysisData);
      const filename = excelFormatter.generateFilename('Analisa_Piutang', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ AR analysis report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  // AP REPORTS - 9 methods
  async generateAPPerSupplierReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating AP per supplier report...');
      
      // ✅ FORCE SERVER MODE
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // ✅ Fetch POs + Payments (sama seperti AP page)
      const [posRaw, paymentsRaw] = await Promise.all([
        storageService.get<any[]>('purchaseOrders'),
        storageService.get<any[]>('payments'),
      ]);
      
      const pos = extractStorageValue(posRaw);
      const payments = extractStorageValue(paymentsRaw);
      
      if (!pos || pos.length === 0) {
        toast.error('Tidak ada data Purchase Order di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }
      
      // ✅ Build payments map
      const paymentsMap = new Map<string, number>();
      (Array.isArray(payments) ? payments : []).forEach((p: any) => {
        const poNo = p.poNo || p.purchaseOrderNo || '';
        if (poNo) {
          const current = paymentsMap.get(poNo) || 0;
          paymentsMap.set(poNo, current + (p.amount || 0));
        }
      });
      
      // ✅ Aggregate POs by supplier
      const apBySupplier: Record<string, any> = {};
      (Array.isArray(pos) ? pos : []).forEach((po: any) => {
        const suppName = po.supplier || po.supplierName || 'Unknown';
        if (!apBySupplier[suppName]) {
          apBySupplier[suppName] = {
            supplierName: suppName,
            totalPO: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalOutstanding: 0,
            overdueAmount: 0,
          };
        }
        apBySupplier[suppName].totalPO += 1;
        const amount = po.total || 0;
        const paid = paymentsMap.get(po.poNo) || 0;
        const outstanding = amount - paid;
        
        apBySupplier[suppName].totalAmount += amount;
        apBySupplier[suppName].totalPaid += paid;
        apBySupplier[suppName].totalOutstanding += outstanding;
        
        // Check if overdue
        const dueDate = new Date(po.dueDate || po.created || new Date());
        if (dueDate < new Date() && outstanding > 0) {
          apBySupplier[suppName].overdueAmount += outstanding;
        }
      });
      
      const aggregatedData = Object.values(apBySupplier);
      const template = reportTemplateEngine.apPerSupplierReport(aggregatedData);
      const filename = excelFormatter.generateFilename('Hutang_Per_Supplier', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ AP per supplier report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  async generateAPPerInvoiceReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating AP per invoice report...');
      
      // ✅ FORCE SERVER MODE
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // ✅ Fetch POs + Payments
      const [posRaw, paymentsRaw] = await Promise.all([
        storageService.get<any[]>('purchaseOrders'),
        storageService.get<any[]>('payments'),
      ]);
      
      const pos = extractStorageValue(posRaw);
      const payments = extractStorageValue(paymentsRaw);
      
      if (!pos || pos.length === 0) {
        toast.error('Tidak ada data Purchase Order di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }
      
      // ✅ Build payments map
      const paymentsMap = new Map<string, number>();
      (Array.isArray(payments) ? payments : []).forEach((p: any) => {
        const poNo = p.poNo || p.purchaseOrderNo || '';
        if (poNo) {
          const current = paymentsMap.get(poNo) || 0;
          paymentsMap.set(poNo, current + (p.amount || 0));
        }
      });
      
      // ✅ Transform POs to AP per invoice format
      const apPerInvoice = (Array.isArray(pos) ? pos : []).map((po: any) => {
        const amount = po.total || 0;
        const paid = paymentsMap.get(po.poNo) || 0;
        const outstanding = amount - paid;
        
        return {
          poNo: po.poNo || 'N/A',
          supplierName: po.supplier || po.supplierName || 'Unknown',
          poDate: po.created || po.poDate || new Date().toISOString(),
          dueDate: po.dueDate || new Date().toISOString(),
          totalAmount: amount,
          totalPaid: paid,
          totalOutstanding: outstanding,
          status: outstanding > 0 ? 'OUTSTANDING' : 'LUNAS',
        };
      });
      
      const template = reportTemplateEngine.apPerInvoiceReport(apPerInvoice);
      const filename = excelFormatter.generateFilename('Hutang_Per_Faktur', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ AP per invoice report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  async generateAPAgingReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating AP aging report...');
      
      // ✅ FORCE SERVER MODE
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // ✅ Fetch POs + Payments
      const [posRaw, paymentsRaw] = await Promise.all([
        storageService.get<any[]>('purchaseOrders'),
        storageService.get<any[]>('payments'),
      ]);
      
      const pos = extractStorageValue(posRaw);
      const payments = extractStorageValue(paymentsRaw);
      
      if (!pos || pos.length === 0) {
        toast.error('Tidak ada data Purchase Order di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }
      
      // ✅ Build payments map
      const paymentsMap = new Map<string, number>();
      (Array.isArray(payments) ? payments : []).forEach((p: any) => {
        const poNo = p.poNo || p.purchaseOrderNo || '';
        if (poNo) {
          const current = paymentsMap.get(poNo) || 0;
          paymentsMap.set(poNo, current + (p.amount || 0));
        }
      });
      
      // ✅ Calculate aging buckets
      const today = new Date();
      const apAging = (Array.isArray(pos) ? pos : []).map((po: any) => {
        const dueDate = new Date(po.dueDate || po.created || new Date());
        const daysOverdue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        const amount = po.total || 0;
        const paid = paymentsMap.get(po.poNo) || 0;
        const outstanding = amount - paid;
        
        let agingBucket = 'Current';
        if (daysOverdue > 90) agingBucket = '> 90 days';
        else if (daysOverdue > 60) agingBucket = '61-90 days';
        else if (daysOverdue > 30) agingBucket = '31-60 days';
        else if (daysOverdue > 0) agingBucket = '1-30 days';
        
        return {
          poNo: po.poNo || 'N/A',
          supplierName: po.supplier || po.supplierName || 'Unknown',
          poDate: po.created || po.poDate || new Date().toISOString(),
          dueDate: po.dueDate || new Date().toISOString(),
          daysOverdue: Math.max(0, daysOverdue),
          agingBucket,
          totalAmount: amount,
          totalPaid: paid,
          outstanding,
        };
      });
      
      const template = reportTemplateEngine.apAgingReport(apAging);
      const filename = excelFormatter.generateFilename('Aging_Hutang', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ AP aging report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  async generateAPPaymentReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating AP payment report...');
      
      // ✅ FORCE SERVER MODE
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // ✅ Fetch payments
      const paymentsRaw = await storageService.get<any[]>('payments');
      const payments = extractStorageValue(paymentsRaw);
      
      if (!payments || payments.length === 0) {
        toast.error('Tidak ada data pembayaran di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }
      
      // ✅ Filter AP payments (supplier payments)
      const apPayments = (Array.isArray(payments) ? payments : [])
        .filter((pmt: any) => pmt.type === 'Payment' && (pmt.supplier || pmt.poNo))
        .map((pmt: any) => ({
          paymentNo: pmt.paymentNo || pmt.transactionNo || 'N/A',
          poNo: pmt.poNo || pmt.purchaseOrderNo || 'N/A',
          supplierName: pmt.supplier || pmt.supplierName || 'Unknown',
          paymentDate: pmt.paymentDate || pmt.paidDate || pmt.created || new Date().toISOString(),
          paymentMethod: pmt.paymentMethod || 'Bank Transfer',
          paymentAmount: pmt.amount || 0,
          reference: pmt.reference || pmt.transactionNo || '',
          notes: pmt.notes || pmt.description || '',
        }));
      
      const template = reportTemplateEngine.apPaymentReport(apPayments);
      const filename = excelFormatter.generateFilename('Pembayaran_Hutang', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ AP payment report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  async generateAPOutstandingReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating AP outstanding report...');
      
      // ✅ FORCE SERVER MODE
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // ✅ Fetch POs + Payments
      const [posRaw, paymentsRaw] = await Promise.all([
        storageService.get<any[]>('purchaseOrders'),
        storageService.get<any[]>('payments'),
      ]);
      
      const pos = extractStorageValue(posRaw);
      const payments = extractStorageValue(paymentsRaw);
      
      if (!pos || pos.length === 0) {
        toast.error('Tidak ada data Purchase Order di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }
      
      // ✅ Build payments map
      const paymentsMap = new Map<string, number>();
      (Array.isArray(payments) ? payments : []).forEach((p: any) => {
        const poNo = p.poNo || p.purchaseOrderNo || '';
        if (poNo) {
          const current = paymentsMap.get(poNo) || 0;
          paymentsMap.set(poNo, current + (p.amount || 0));
        }
      });
      
      // ✅ Filter only outstanding POs
      const outstanding = (Array.isArray(pos) ? pos : [])
        .filter((po: any) => {
          const amount = po.total || 0;
          const paid = paymentsMap.get(po.poNo) || 0;
          return amount - paid > 0;
        })
        .map((po: any) => {
          const amount = po.total || 0;
          const paid = paymentsMap.get(po.poNo) || 0;
          return {
            poNo: po.poNo || 'N/A',
            supplierName: po.supplier || po.supplierName || 'Unknown',
            poDate: po.created || po.poDate || new Date().toISOString(),
            dueDate: po.dueDate || new Date().toISOString(),
            totalAmount: amount,
            totalPaid: paid,
            outstanding: amount - paid,
          };
        });
      
      const template = reportTemplateEngine.apOutstandingReport(outstanding);
      const filename = excelFormatter.generateFilename('Sisa_Hutang', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ AP outstanding report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  async generateAPDueReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating AP due report...');
      
      // ✅ FORCE SERVER MODE
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // ✅ Fetch POs + Payments
      const [posRaw, paymentsRaw] = await Promise.all([
        storageService.get<any[]>('purchaseOrders'),
        storageService.get<any[]>('payments'),
      ]);
      
      const pos = extractStorageValue(posRaw);
      const payments = extractStorageValue(paymentsRaw);
      
      if (!pos || pos.length === 0) {
        toast.error('Tidak ada data Purchase Order di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }
      
      // ✅ Build payments map
      const paymentsMap = new Map<string, number>();
      (Array.isArray(payments) ? payments : []).forEach((p: any) => {
        const poNo = p.poNo || p.purchaseOrderNo || '';
        if (poNo) {
          const current = paymentsMap.get(poNo) || 0;
          paymentsMap.set(poNo, current + (p.amount || 0));
        }
      });
      
      // ✅ Filter POs due soon (within 7 days)
      const today = new Date();
      const dueInSevenDays = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const dueSoon = (Array.isArray(pos) ? pos : [])
        .filter((po: any) => {
          const dueDate = new Date(po.dueDate || po.created || new Date());
          const amount = po.total || 0;
          const paid = paymentsMap.get(po.poNo) || 0;
          const outstanding = amount - paid;
          return dueDate <= dueInSevenDays && outstanding > 0;
        })
        .map((po: any) => {
          const amount = po.total || 0;
          const paid = paymentsMap.get(po.poNo) || 0;
          return {
            poNo: po.poNo || 'N/A',
            supplierName: po.supplier || po.supplierName || 'Unknown',
            poDate: po.created || po.poDate || new Date().toISOString(),
            dueDate: po.dueDate || new Date().toISOString(),
            daysUntilDue: Math.ceil((new Date(po.dueDate || po.created || new Date()).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
            totalAmount: amount,
            totalPaid: paid,
            outstanding: amount - paid,
          };
        });
      
      const template = reportTemplateEngine.apDueReport(dueSoon);
      const filename = excelFormatter.generateFilename('Hutang_Jatuh_Tempo', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ AP due report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  async generateAPOverdueReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating AP overdue report...');
      
      // ✅ FORCE SERVER MODE
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // ✅ Fetch POs + Payments
      const [posRaw, paymentsRaw] = await Promise.all([
        storageService.get<any[]>('purchaseOrders'),
        storageService.get<any[]>('payments'),
      ]);
      
      const pos = extractStorageValue(posRaw);
      const payments = extractStorageValue(paymentsRaw);
      
      if (!pos || pos.length === 0) {
        toast.error('Tidak ada data Purchase Order di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }
      
      // ✅ Build payments map
      const paymentsMap = new Map<string, number>();
      (Array.isArray(payments) ? payments : []).forEach((p: any) => {
        const poNo = p.poNo || p.purchaseOrderNo || '';
        if (poNo) {
          const current = paymentsMap.get(poNo) || 0;
          paymentsMap.set(poNo, current + (p.amount || 0));
        }
      });
      
      // ✅ Filter overdue POs
      const today = new Date();
      const overdue = (Array.isArray(pos) ? pos : [])
        .filter((po: any) => {
          const dueDate = new Date(po.dueDate || po.created || new Date());
          const amount = po.total || 0;
          const paid = paymentsMap.get(po.poNo) || 0;
          const outstanding = amount - paid;
          return dueDate < today && outstanding > 0;
        })
        .map((po: any) => {
          const amount = po.total || 0;
          const paid = paymentsMap.get(po.poNo) || 0;
          return {
            poNo: po.poNo || 'N/A',
            supplierName: po.supplier || po.supplierName || 'Unknown',
            poDate: po.created || po.poDate || new Date().toISOString(),
            dueDate: po.dueDate || new Date().toISOString(),
            daysOverdue: Math.floor((today.getTime() - new Date(po.dueDate || po.created || new Date()).getTime()) / (1000 * 60 * 60 * 24)),
            totalAmount: amount,
            totalPaid: paid,
            outstanding: amount - paid,
          };
        });
      
      const template = reportTemplateEngine.apOverdueReport(overdue);
      const filename = excelFormatter.generateFilename('Hutang_Overdue', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ AP overdue report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  async generateAPCardReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating AP card report...');
      
      // ✅ FORCE SERVER MODE
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // ✅ Fetch POs + Payments
      const [posRaw, paymentsRaw] = await Promise.all([
        storageService.get<any[]>('purchaseOrders'),
        storageService.get<any[]>('payments'),
      ]);
      
      const pos = extractStorageValue(posRaw);
      const payments = extractStorageValue(paymentsRaw);
      
      if (!pos || pos.length === 0) {
        toast.error('Tidak ada data Purchase Order di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }
      
      // ✅ Build payments map
      const paymentsMap = new Map<string, number>();
      (Array.isArray(payments) ? payments : []).forEach((p: any) => {
        const poNo = p.poNo || p.purchaseOrderNo || '';
        if (poNo) {
          const current = paymentsMap.get(poNo) || 0;
          paymentsMap.set(poNo, current + (p.amount || 0));
        }
      });
      
      // ✅ Create AP card (detail per PO)
      const apCard = (Array.isArray(pos) ? pos : []).map((po: any) => {
        const amount = po.total || 0;
        const paid = paymentsMap.get(po.poNo) || 0;
        const outstanding = amount - paid;
        
        return {
          poNo: po.poNo || 'N/A',
          supplierName: po.supplier || po.supplierName || 'Unknown',
          poDate: po.created || po.poDate || new Date().toISOString(),
          dueDate: po.dueDate || new Date().toISOString(),
          totalAmount: amount,
          totalPaid: paid,
          outstanding: outstanding,
          status: outstanding > 0 ? 'OUTSTANDING' : 'LUNAS',
        };
      });
      
      const template = reportTemplateEngine.apCardReport(apCard);
      const filename = excelFormatter.generateFilename('Kartu_Hutang', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ AP card report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  async generateAPAnalysisReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating AP analysis report...');
      
      // ✅ FORCE SERVER MODE
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // ✅ Fetch POs + Payments
      const [posRaw, paymentsRaw] = await Promise.all([
        storageService.get<any[]>('purchaseOrders'),
        storageService.get<any[]>('payments'),
      ]);
      
      const pos = extractStorageValue(posRaw);
      const payments = extractStorageValue(paymentsRaw);
      
      if (!pos || pos.length === 0) {
        toast.error('Tidak ada data Purchase Order di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }
      
      // ✅ Build payments map
      const paymentsMap = new Map<string, number>();
      (Array.isArray(payments) ? payments : []).forEach((p: any) => {
        const poNo = p.poNo || p.purchaseOrderNo || '';
        if (poNo) {
          const current = paymentsMap.get(poNo) || 0;
          paymentsMap.set(poNo, current + (p.amount || 0));
        }
      });
      
      // ✅ Aggregate by supplier for analysis
      const apAnalysis: Record<string, any> = {};
      (Array.isArray(pos) ? pos : []).forEach((po: any) => {
        const suppName = po.supplier || po.supplierName || 'Unknown';
        if (!apAnalysis[suppName]) {
          apAnalysis[suppName] = {
            supplierName: suppName,
            totalPO: 0,
            totalAmount: 0,
            totalPaid: 0,
            totalOutstanding: 0,
            overdueAmount: 0,
          };
        }
        const amount = po.total || 0;
        const paid = paymentsMap.get(po.poNo) || 0;
        const outstanding = amount - paid;
        
        apAnalysis[suppName].totalPO += 1;
        apAnalysis[suppName].totalAmount += amount;
        apAnalysis[suppName].totalPaid += paid;
        apAnalysis[suppName].totalOutstanding += outstanding;
        
        // Check if overdue
        const dueDate = new Date(po.dueDate || po.created || new Date());
        if (dueDate < new Date() && outstanding > 0) {
          apAnalysis[suppName].overdueAmount += outstanding;
        }
      });
      
      const analysisData = Object.values(apAnalysis);
      const template = reportTemplateEngine.apAnalysisReport(analysisData);
      const filename = excelFormatter.generateFilename('Analisa_Hutang', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ AP analysis report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * MASTER DATA - Banks Report
   * Extract unique banks from AP/Payment data and COA/Settings
   */
  async generateMasterBanksReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating master banks report...');
      
      // Get storage config
      const config = storageService.getConfig();
      console.log('[ReportService] 📡 Storage config:', config);
      
      // FORCE SERVER MODE untuk reports
      if (config.type !== 'server' || !config.serverUrl) {
        console.warn('[ReportService] ⚠️ Not in server mode, forcing server mode...');
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }
      
      console.log('[ReportService] ✅ Server mode confirmed:', config.serverUrl);
      
      // Fetch data dari SERVER
      // 1. Get invoices (untuk extract bank dari payment data)
      const invoicesRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.INVOICES);
      const invoicesData = extractStorageValue(invoicesRaw);
      
      // 2. Get GRN (untuk extract bank dari supplier payment)
      const grnRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.GRN);
      const grnData = extractStorageValue(grnRaw);
      
      // 3. Get payments data
      const paymentsRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.PAYMENTS);
      const paymentsData = extractStorageValue(paymentsRaw);
      
      // 4. Get settings (untuk bank dari COA/Settings)
      const settingsRaw = await storageService.get<any>('settings');
      const settingsData = extractStorageValue(settingsRaw);
      
      console.log('[ReportService] 📊 Fetched data dari SERVER:', {
        invoicesCount: invoicesData?.length || 0,
        grnCount: grnData?.length || 0,
        paymentsCount: paymentsData?.length || 0,
        hasSettings: !!settingsData,
      });

      // Generate template
      const template = reportTemplateEngine.masterBanksReport(
        invoicesData || [],
        grnData || [],
        paymentsData || [],
        settingsData || {}
      );
      
      console.log('[ReportService] 📋 Template generated:', {
        title: template.title,
        dataRows: template.data.length,
        headers: template.headers,
      });

      // Export ke Excel
      const filename = excelFormatter.generateFilename('Daftar_Bank');
      excelFormatter.exportReport(template, filename);
      
      console.log('[ReportService] ✅ Master banks report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating master banks report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * MASTER DATA - Regions Report
   * Extract unique regions/cities from customers and suppliers
   */
  async generateMasterRegionsReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating master regions report...');
      
      // Get storage config
      const config = storageService.getConfig();
      console.log('[ReportService] 📡 Storage config:', config);
      
      // FORCE SERVER MODE untuk reports
      if (config.type !== 'server' || !config.serverUrl) {
        console.warn('[ReportService] ⚠️ Not in server mode, forcing server mode...');
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }
      
      console.log('[ReportService] ✅ Server mode confirmed:', config.serverUrl);
      
      // Fetch customers dan suppliers dari SERVER
      const customersRaw = await storageService.get<any[]>('customers');
      const suppliersRaw = await storageService.get<any[]>('suppliers');
      
      // Extract values menggunakan helper function
      const customersData = extractStorageValue(customersRaw);
      const suppliersData = extractStorageValue(suppliersRaw);
      
      console.log('[ReportService] 📊 Fetched data dari SERVER:', {
        customersCount: customersData.length,
        suppliersCount: suppliersData.length,
        storageType: config.type,
        serverUrl: config.serverUrl,
      });

      if ((!customersData || customersData.length === 0) && (!suppliersData || suppliersData.length === 0)) {
        console.warn('[ReportService] ⚠️ No customers or suppliers found in server storage');
        toast.error('Tidak ada data pelanggan atau supplier di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Generate template
      const template = reportTemplateEngine.masterRegionsReport(customersData, suppliersData);
      
      console.log('[ReportService] 📋 Template generated:', {
        title: template.title,
        dataRows: template.data.length,
        headers: template.headers,
      });

      // Export ke Excel
      const filename = excelFormatter.generateFilename('Daftar_Wilayah');
      excelFormatter.exportReport(template, filename);
      
      console.log('[ReportService] ✅ Master regions report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating master regions report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PACKAGING DELIVERY - Delivery Per Item Report
   * Detail pengiriman dianalisis per item
   * Fetch dari PACKAGING delivery notes, bukan packaging surat jalan
   */
  async generatePackagingDeliveryPerItemReport(startDate: string, endDate: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating packaging delivery per item report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch delivery notes dari PACKAGING storage
      console.log('[ReportService] 📦 Fetching from StorageKeys.PACKAGING.DELIVERY:', StorageKeys.PACKAGING.DELIVERY);
      const deliveriesRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.DELIVERY);
      console.log('[ReportService] 📦 Raw data from storage:', deliveriesRaw?.length, 'items');
      
      const deliveriesData = extractStorageValue(deliveriesRaw);
      console.log('[ReportService] 📦 Extracted data length:', deliveriesData?.length);

      if (!deliveriesData || deliveriesData.length === 0) {
        console.warn('[ReportService] ⚠️ No delivery data found. Raw:', deliveriesRaw);
        toast.error('Tidak ada data pengiriman di packaging. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Filter by date using helper function
      const filtered = filterByDateRange(deliveriesData, startDate, endDate);
      console.log('[ReportService] 📦 Filtered data count:', filtered.length);

      // Generate template
      const template = reportTemplateEngine.packagingDeliveryPerItemReport(filtered, startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Pengiriman_Per_Item_Packaging', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Packaging delivery per item report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating packaging delivery per item report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PACKAGING DELIVERY - Surat Jalan Report
   * Laporan surat jalan (dokumen pengiriman) dari PACKAGING
   * Fetch dari PACKAGING delivery notes, bukan packaging surat jalan
   */
  async generatePackagingSuratJalanReport(startDate: string, endDate: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating packaging surat jalan report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch delivery notes dari PACKAGING storage
      console.log('[ReportService] 📦 Fetching from StorageKeys.PACKAGING.DELIVERY:', StorageKeys.PACKAGING.DELIVERY);
      const deliveryNotesRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.DELIVERY);
      console.log('[ReportService] 📦 Raw data from storage:', deliveryNotesRaw?.length, 'items');
      
      const deliveryNotesData = extractStorageValue(deliveryNotesRaw);
      console.log('[ReportService] 📦 Extracted data length:', deliveryNotesData?.length);

      if (!deliveryNotesData || deliveryNotesData.length === 0) {
        console.warn('[ReportService] ⚠️ No delivery data found. Raw:', deliveryNotesRaw);
        toast.error('Tidak ada data surat jalan di packaging. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Filter by date using helper function
      const filtered = filterByDateRange(deliveryNotesData, startDate, endDate);
      console.log('[ReportService] 📦 Filtered data count:', filtered.length);

      // Generate template
      const template = reportTemplateEngine.packagingSuratJalanReport(filtered, startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Surat_Jalan_Packaging', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Packaging surat jalan report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating packaging surat jalan report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PACKAGING DELIVERY - Delivery By Customer Report
   * Agregat pengiriman per customer
   * Fetch dari PACKAGING delivery notes, bukan packaging surat jalan
   */
  async generatePackagingDeliveryByCustomerReport(startDate: string, endDate: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating packaging delivery by customer report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch delivery notes dari PACKAGING storage (bukan packaging)
      console.log('[ReportService] 📦 Fetching from StorageKeys.PACKAGING.DELIVERY:', StorageKeys.PACKAGING.DELIVERY);
      const deliveriesRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.DELIVERY);
      console.log('[ReportService] 📦 Raw data from storage:', deliveriesRaw?.length, 'items');
      
      const deliveriesData = extractStorageValue(deliveriesRaw);
      console.log('[ReportService] 📦 Extracted data length:', deliveriesData?.length);

      if (!deliveriesData || deliveriesData.length === 0) {
        console.warn('[ReportService] ⚠️ No delivery data found. Raw:', deliveriesRaw);
        toast.error('Tidak ada data pengiriman di packaging. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Filter by date using helper function
      const filtered = filterByDateRange(deliveriesData, startDate, endDate);
      console.log('[ReportService] 📦 Filtered data count:', filtered.length);

      // Generate template
      const template = reportTemplateEngine.packagingDeliveryByCustomerReport(filtered, startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Pengiriman_Per_Customer_Packaging', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Packaging delivery by customer report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating packaging delivery by customer report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PACKAGING DELIVERY - Delivery Trend Report
   * Analisis trend pengiriman harian/bulanan
   * Fetch dari PACKAGING delivery notes, bukan packaging surat jalan
   */
  async generatePackagingDeliveryTrendReport(startDate: string, endDate: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating packaging delivery trend report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch delivery notes dari PACKAGING storage (bukan packaging)
      console.log('[ReportService] 📦 Fetching from StorageKeys.PACKAGING.DELIVERY:', StorageKeys.PACKAGING.DELIVERY);
      const deliveriesRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.DELIVERY);
      console.log('[ReportService] 📦 Raw data from storage:', deliveriesRaw?.length, 'items');
      
      const deliveriesData = extractStorageValue(deliveriesRaw);
      console.log('[ReportService] 📦 Extracted data length:', deliveriesData?.length);

      if (!deliveriesData || deliveriesData.length === 0) {
        console.warn('[ReportService] ⚠️ No delivery data found. Raw:', deliveriesRaw);
        toast.error('Tidak ada data pengiriman di packaging. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Filter by date using helper function
      const filtered = filterByDateRange(deliveriesData, startDate, endDate);
      console.log('[ReportService] 📦 Filtered data count:', filtered.length);

      // Generate template
      const template = reportTemplateEngine.packagingDeliveryTrendReport(filtered, startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Trend_Pengiriman_Packaging', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Packaging delivery trend report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating packaging delivery trend report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * INVENTORY - Stock Per Warehouse Report
   * Group inventory by warehouse/gudang
   */
  async generateInventoryStockPerWarehouseReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating inventory stock per warehouse report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch inventory + products dari SERVER - use 'inventory' key
      const inventoryRaw = await storageService.get<any[]>('inventory');
      const productsRaw = await storageService.get<any[]>('products');
      
      const inventoryData = extractStorageValue(inventoryRaw);
      const productsData = extractStorageValue(productsRaw);

      if (!inventoryData || inventoryData.length === 0) {
        toast.error('Tidak ada data inventory. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Build product lookup map
      const productMap = new Map<string, any>();
      productsData?.forEach((prod: any) => {
        if (prod.id) productMap.set(prod.id.toString().toLowerCase(), prod);
        if (prod.kode) productMap.set(prod.kode.toString().toLowerCase(), prod);
      });

      // Group by warehouse
      const groupedByWarehouse: Record<string, any[]> = {};
      inventoryData.forEach((inv: any) => {
        const warehouse = inv.warehouse || inv.gudang || 'Default';
        if (!groupedByWarehouse[warehouse]) {
          groupedByWarehouse[warehouse] = [];
        }

        const productKey = (inv.codeItem || inv.item_code || '').toString().toLowerCase();
        const product = productMap.get(productKey);
        const kategori = (inv.kategori || product?.kategori || product?.category || '').toLowerCase().trim();
        
        // Determine price based on kategori
        let harga = Number(inv.price || 0);
        if (kategori === 'product') {
          // For products, use hargaFG (selling price)
          harga = Number(product?.hargaFG || product?.harga || inv.price || 0);
        } else {
          // For materials, use hargaBeli (cost price)
          harga = Number(product?.hargaBeli || inv.price || 0);
        }
        
        const stok = Number(inv.nextStock || inv.stock || 0);

        groupedByWarehouse[warehouse].push({
          kode: inv.codeItem || inv.item_code || '',
          nama: inv.description || product?.nama || product?.name || '',
          stok: stok,
          hargaBeli: harga,
          nilaiStok: stok * harga,
        });
      });

      // Generate template
      const template = reportTemplateEngine.inventoryStockPerWarehouseReport(groupedByWarehouse);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Stok_Per_Gudang');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Inventory stock per warehouse report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating inventory stock per warehouse report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * INVENTORY - Minimum Stock Report
   * Items below minimum stock level
   */
  async generateInventoryMinStockReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating inventory minimum stock report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch inventory + products dari SERVER
      const inventoryRaw = await storageService.get<any[]>('inventory');
      const productsRaw = await storageService.get<any[]>('products');
      
      const inventoryData = extractStorageValue(inventoryRaw);
      const productsData = extractStorageValue(productsRaw);

      if (!inventoryData || inventoryData.length === 0) {
        toast.error('Tidak ada data inventory. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Build product lookup map
      const productMap = new Map<string, any>();
      productsData?.forEach((prod: any) => {
        if (prod.id) productMap.set(prod.id.toString().toLowerCase(), prod);
        if (prod.kode) productMap.set(prod.kode.toString().toLowerCase(), prod);
      });

      // Filter items below min stock
      const belowMinStock = inventoryData.filter((inv: any) => {
        const productKey = (inv.codeItem || inv.item_code || '').toString().toLowerCase();
        const product = productMap.get(productKey);
        const minStock = Number(inv.minStock || product?.minStock || 0);
        const currentStock = Number(inv.nextStock || inv.stock || 0);
        return currentStock < minStock;
      }).map((inv: any) => {
        const productKey = (inv.codeItem || inv.item_code || '').toString().toLowerCase();
        const product = productMap.get(productKey);
        const minStock = Number(inv.minStock || product?.minStock || 0);
        const currentStock = Number(inv.nextStock || inv.stock || 0);

        return {
          kode: inv.codeItem || inv.item_code || product?.kode || '',
          nama: inv.description || product?.nama || product?.name || '',
          stokSaatIni: currentStock,
          minStock: minStock,
          selisih: minStock - currentStock,
        };
      });

      // Generate template
      const template = reportTemplateEngine.inventoryMinStockReport(belowMinStock);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Stok_Minimum');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Inventory minimum stock report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating inventory minimum stock report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * INVENTORY - Maximum Stock Report
   * Items above maximum stock level
   */
  async generateInventoryMaxStockReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating inventory maximum stock report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch inventory + products dari SERVER
      const inventoryRaw = await storageService.get<any[]>('inventory');
      const productsRaw = await storageService.get<any[]>('products');
      
      const inventoryData = extractStorageValue(inventoryRaw);
      const productsData = extractStorageValue(productsRaw);

      if (!inventoryData || inventoryData.length === 0) {
        toast.error('Tidak ada data inventory. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Build product lookup map
      const productMap = new Map<string, any>();
      productsData?.forEach((prod: any) => {
        if (prod.id) productMap.set(prod.id.toString().toLowerCase(), prod);
        if (prod.kode) productMap.set(prod.kode.toString().toLowerCase(), prod);
      });

      // Filter items above max stock
      const aboveMaxStock = inventoryData.filter((inv: any) => {
        const productKey = (inv.codeItem || inv.item_code || '').toString().toLowerCase();
        const product = productMap.get(productKey);
        const maxStock = Number(inv.maxStock || product?.maxStock || 0);
        const currentStock = Number(inv.nextStock || inv.stock || 0);
        return maxStock > 0 && currentStock > maxStock;
      }).map((inv: any) => {
        const productKey = (inv.codeItem || inv.item_code || '').toString().toLowerCase();
        const product = productMap.get(productKey);
        const maxStock = Number(inv.maxStock || product?.maxStock || 0);
        const currentStock = Number(inv.nextStock || inv.stock || 0);

        return {
          kode: inv.codeItem || inv.item_code || product?.kode || '',
          nama: inv.description || product?.nama || product?.name || '',
          stokSaatIni: currentStock,
          maxStock: maxStock,
          selisih: currentStock - maxStock,
        };
      });

      // Generate template
      const template = reportTemplateEngine.inventoryMaxStockReport(aboveMaxStock);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Stok_Maksimum');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Inventory maximum stock report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating inventory maximum stock report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * INVENTORY - Total Inventory Value Report
   * Total nilai persediaan (sum of all stock * cost)
   */
  async generateInventoryValueTotalReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating inventory total value report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch inventory + products dari SERVER
      const inventoryRaw = await storageService.get<any[]>('inventory');
      const productsRaw = await storageService.get<any[]>('products');
      
      const inventoryData = extractStorageValue(inventoryRaw);
      const productsData = extractStorageValue(productsRaw);

      if (!inventoryData || inventoryData.length === 0) {
        toast.error('Tidak ada data inventory. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Build product lookup map
      const productMap = new Map<string, any>();
      productsData?.forEach((prod: any) => {
        if (prod.id) productMap.set(prod.id.toString().toLowerCase(), prod);
        if (prod.kode) productMap.set(prod.kode.toString().toLowerCase(), prod);
      });

      // Calculate total value
      let totalValue = 0;
      const valueData = inventoryData.map((inv: any) => {
        const productKey = (inv.codeItem || inv.item_code || '').toString().toLowerCase();
        const product = productMap.get(productKey);
        const kategori = (inv.kategori || product?.kategori || product?.category || '').toLowerCase().trim();
        
        // Determine price based on kategori
        let harga = Number(inv.price || 0);
        if (kategori === 'product') {
          // For products, use hargaFG (selling price)
          harga = Number(product?.hargaFG || product?.harga || inv.price || 0);
        } else {
          // For materials, use hargaBeli (cost price)
          harga = Number(product?.hargaBeli || inv.price || 0);
        }
        
        const stock = Number(inv.nextStock || inv.stock || 0);
        const value = stock * harga;
        totalValue += value;

        return {
          kode: inv.codeItem || inv.item_code || product?.kode || '',
          nama: inv.description || product?.nama || product?.name || '',
          stok: stock,
          hargaBeli: harga,
          nilaiStok: value,
        };
      });

      // Generate template
      const template = reportTemplateEngine.inventoryValueTotalReport(valueData, totalValue);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Nilai_Persediaan');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Inventory total value report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating inventory total value report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * INVENTORY - Inventory Mutation Report
   * Stok awal, masuk, keluar, stok akhir
   */
  async generateInventoryMutationReport(startDate: string, endDate: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating inventory mutation report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch inventory + products dari SERVER
      const inventoryRaw = await storageService.get<any[]>('inventory');
      const productsRaw = await storageService.get<any[]>('products');
      
      const inventoryData = extractStorageValue(inventoryRaw);
      const productsData = extractStorageValue(productsRaw);

      if (!inventoryData || inventoryData.length === 0) {
        toast.error('Tidak ada data inventory. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Build product lookup map
      const productMap = new Map<string, any>();
      productsData?.forEach((prod: any) => {
        if (prod.id) productMap.set(prod.id.toString().toLowerCase(), prod);
        if (prod.kode) productMap.set(prod.kode.toString().toLowerCase(), prod);
      });

      // Map inventory to mutation format
      const mutationData = inventoryData.map((inv: any) => {
        const productKey = (inv.codeItem || inv.item_code || '').toString().toLowerCase();
        const product = productMap.get(productKey);

        return {
          tanggal: inv.created || inv.updated || new Date().toISOString().split('T')[0],
          kode: inv.codeItem || inv.item_code || product?.kode || '',
          nama: inv.description || product?.nama || product?.name || '',
          stokAwal: Number(inv.stock || 0),
          masuk: Number(inv.inbound || 0),
          keluar: Number(inv.outbound || 0),
          stokAkhir: Number(inv.nextStock || inv.stock || 0),
        };
      });

      // Filter by date
      const filtered = mutationData.filter(item => {
        const itemDate = item.tanggal.split('T')[0];
        return itemDate >= startDate && itemDate <= endDate;
      });

      // Generate template
      const template = reportTemplateEngine.inventoryMutationReport(filtered, startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Mutasi_Stok', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Inventory mutation report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating inventory mutation report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * INVENTORY - ABC Analysis Report
   * Categorize items as A (80% value), B (15% value), C (5% value)
   */
  async generateInventoryABCAnalysisReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating inventory ABC analysis report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch data
      const soRaw = await storageService.get<any[]>('salesOrders');
      const inventoryRaw = await storageService.get<any[]>('inventory');
      
      const soData = extractStorageValue(soRaw);
      const inventoryData = extractStorageValue(inventoryRaw);

      if (!soData || soData.length === 0) {
        toast.error('Tidak ada data sales order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // STEP 1: Aggregate Sales Order by productKode
      const soAggregated = new Map<string, any>();
      soData.forEach((so: any) => {
        if (!so.items || so.items.length === 0) return;
        
        so.items.forEach((item: any) => {
          const kode = (item.productKode || item.productId || '').toString().toLowerCase().trim();
          if (!kode) return;
          
          if (!soAggregated.has(kode)) {
            soAggregated.set(kode, {
              kode: item.productKode || item.productId,
              nama: item.productName || '',
              qty: 0,
              price: item.price || 0,
              nilai: 0,
            });
          }
          
          const existing = soAggregated.get(kode)!;
          existing.qty += Number(item.qty || 0);
          existing.nilai += Number(item.total || 0);
        });
      });

      if (soAggregated.size === 0) {
        toast.error('Tidak ada item dalam sales order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // STEP 2: Build inventory lookup map
      const inventoryMap = new Map<string, any>();
      inventoryData?.forEach((inv: any) => {
        const codeItem = (inv.codeItem || inv.item_code || '').toString().toLowerCase().trim();
        const kodeIpos = (inv.kodeIpos || '').toString().toLowerCase().trim();
        
        if (codeItem) inventoryMap.set(codeItem, inv);
        if (kodeIpos) inventoryMap.set(kodeIpos, inv);
      });

      // STEP 3: Enrich SO data with inventory info and calculate value
      const withValue = Array.from(soAggregated.values())
        .map((item: any) => {
          const kodeKey = item.kode.toString().toLowerCase().trim();
          const invItem = inventoryMap.get(kodeKey);
          
          return {
            kode: item.kode,
            nama: item.nama,
            stok: invItem?.nextStock || 0,
            qty: item.qty,
            harga: item.price,
            nilaiKeluar: item.nilai,
            kategori: invItem?.kategori || 'Product',
          };
        })
        .sort((a, b) => b.nilaiKeluar - a.nilaiKeluar); // Sort by value DESC

      // STEP 4: Calculate cumulative percentage for ABC categorization
      let cumulative = 0;
      const total = withValue.reduce((sum, item) => sum + item.nilaiKeluar, 0);

      const withCategory = withValue.map(item => {
        cumulative += item.nilaiKeluar;
        const percentage = (cumulative / total) * 100;

        let category = 'C';
        if (percentage <= 80) category = 'A';
        else if (percentage <= 95) category = 'B';

        return {
          ...item,
          kategoriABC: category,
          persentase: percentage.toFixed(2),
        };
      });

      // Generate template
      const template = reportTemplateEngine.inventoryABCAnalysisReport(withCategory, total);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Analisa_ABC');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Inventory ABC analysis report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating inventory ABC analysis report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * INVENTORY - Fast Moving Items Report
   * Items dengan turnover tinggi (banyak keluar)
   */
  async generateInventoryFastMovingReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating fast moving items report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch data
      const soRaw = await storageService.get<any[]>('salesOrders');
      const inventoryRaw = await storageService.get<any[]>('inventory');
      
      const soData = extractStorageValue(soRaw);
      const inventoryData = extractStorageValue(inventoryRaw);

      if (!soData || soData.length === 0) {
        toast.error('Tidak ada data sales order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // STEP 1: Aggregate Sales Order by productKode
      const soAggregated = new Map<string, any>();
      soData.forEach((so: any) => {
        if (!so.items || so.items.length === 0) return;
        
        so.items.forEach((item: any) => {
          const kode = (item.productKode || item.productId || '').toString().toLowerCase().trim();
          if (!kode) return;
          
          if (!soAggregated.has(kode)) {
            soAggregated.set(kode, {
              kode: item.productKode || item.productId,
              nama: item.productName || '',
              qty: 0,
              price: item.price || 0,
              nilai: 0,
            });
          }
          
          const existing = soAggregated.get(kode)!;
          existing.qty += Number(item.qty || 0);
          existing.nilai += Number(item.total || 0);
        });
      });

      if (soAggregated.size === 0) {
        toast.error('Tidak ada item dalam sales order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // STEP 2: Build inventory lookup map
      const inventoryMap = new Map<string, any>();
      inventoryData?.forEach((inv: any) => {
        const codeItem = (inv.codeItem || inv.item_code || '').toString().toLowerCase().trim();
        const kodeIpos = (inv.kodeIpos || '').toString().toLowerCase().trim();
        
        if (codeItem) inventoryMap.set(codeItem, inv);
        if (kodeIpos) inventoryMap.set(kodeIpos, inv);
      });

      // STEP 3: Enrich SO data with inventory info
      const fastMoving = Array.from(soAggregated.values())
        .map((item: any) => {
          const kodeKey = item.kode.toString().toLowerCase().trim();
          const invItem = inventoryMap.get(kodeKey);
          
          return {
            kode: item.kode,
            nama: item.nama,
            stok: invItem?.nextStock || 0,
            keluar: item.qty,
            harga: item.price,
            nilaiKeluar: item.nilai,
            kategori: invItem?.kategori || 'Product',
          };
        })
        .sort((a, b) => b.keluar - a.keluar); // Sort by qty DESC

      const template = reportTemplateEngine.inventoryFastMovingReport(fastMoving);
      const filename = excelFormatter.generateFilename('Laporan_Barang_Fast_Moving');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Fast moving items report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating fast moving items report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * INVENTORY - Slow Moving Items Report
   * Items dengan turnover rendah (sedikit keluar)
   * Aggregate dari Sales Order, sorted by qty ASC (terendah dulu)
   */
  async generateInventorySlowMovingReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating slow moving items report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch data
      const soRaw = await storageService.get<any[]>('salesOrders');
      const inventoryRaw = await storageService.get<any[]>('inventory');
      
      const soData = extractStorageValue(soRaw);
      const inventoryData = extractStorageValue(inventoryRaw);

      if (!soData || soData.length === 0) {
        toast.error('Tidak ada data sales order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // STEP 1: Aggregate Sales Order by productKode
      const soAggregated = new Map<string, any>();
      soData.forEach((so: any) => {
        if (!so.items || so.items.length === 0) return;
        
        so.items.forEach((item: any) => {
          const kode = (item.productKode || item.productId || '').toString().toLowerCase().trim();
          if (!kode) return;
          
          if (!soAggregated.has(kode)) {
            soAggregated.set(kode, {
              kode: item.productKode || item.productId,
              nama: item.productName || '',
              qty: 0,
              price: item.price || 0,
              nilai: 0,
            });
          }
          
          const existing = soAggregated.get(kode)!;
          existing.qty += Number(item.qty || 0);
          existing.nilai += Number(item.total || 0);
        });
      });

      if (soAggregated.size === 0) {
        toast.error('Tidak ada item dalam sales order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // STEP 2: Build inventory lookup map
      const inventoryMap = new Map<string, any>();
      inventoryData?.forEach((inv: any) => {
        const codeItem = (inv.codeItem || inv.item_code || '').toString().toLowerCase().trim();
        const kodeIpos = (inv.kodeIpos || '').toString().toLowerCase().trim();
        
        if (codeItem) inventoryMap.set(codeItem, inv);
        if (kodeIpos) inventoryMap.set(kodeIpos, inv);
      });

      // STEP 3: Enrich SO data with inventory info
      const slowMoving = Array.from(soAggregated.values())
        .map((item: any) => {
          const kodeKey = item.kode.toString().toLowerCase().trim();
          const invItem = inventoryMap.get(kodeKey);
          
          return {
            kode: item.kode,
            nama: item.nama,
            stok: invItem?.nextStock || 0,
            keluar: item.qty,
            harga: item.price,
            nilaiKeluar: item.nilai,
            kategori: invItem?.kategori || 'Product',
          };
        })
        .sort((a, b) => a.keluar - b.keluar); // Sort by qty ASC (terendah dulu)

      const template = reportTemplateEngine.inventorySlowMovingReport(slowMoving);
      const filename = excelFormatter.generateFilename('Laporan_Barang_Slow_Moving');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Slow moving items report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating slow moving items report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * INVENTORY - Stock by Selling Price Report
   * Inventory grouped by selling price (hargaFG)
   */
  async generateInventoryBySellingPriceReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating inventory by selling price report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      const inventoryRaw = await storageService.get<any[]>('inventory');
      const productsRaw = await storageService.get<any[]>('products');
      
      const inventoryData = extractStorageValue(inventoryRaw);
      const productsData = extractStorageValue(productsRaw);

      if (!inventoryData || inventoryData.length === 0) {
        toast.error('Tidak ada data inventory. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      const productMap = new Map<string, any>();
      productsData?.forEach((prod: any) => {
        if (prod.id) productMap.set(prod.id.toString().toLowerCase(), prod);
        if (prod.kode) productMap.set(prod.kode.toString().toLowerCase(), prod);
      });

      const data = inventoryData.map((inv: any) => {
        const productKey = (inv.codeItem || inv.item_code || '').toString().toLowerCase();
        const product = productMap.get(productKey);
        const hargaFG = Number(product?.hargaFG || product?.harga || inv.price || 0);
        const stok = Number(inv.nextStock || 0);

        return {
          kode: inv.codeItem || inv.item_code || '',
          nama: inv.description || product?.nama || '',
          stok: stok,
          hargaJual: hargaFG,
          nilaiJual: stok * hargaFG,
        };
      }).sort((a, b) => b.hargaJual - a.hargaJual);

      const template = reportTemplateEngine.inventoryBySellingPriceReport(data);
      const filename = excelFormatter.generateFilename('Laporan_Stok_Berdasarkan_Harga_Jual');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Inventory by selling price report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating inventory by selling price report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * INVENTORY - Stock Card Report (Kartu Stok)
   * Detailed stock movement history from Sales Order
   */
  async generateInventoryStockCardReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating stock card report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch data
      const soRaw = await storageService.get<any[]>('salesOrders');
      const inventoryRaw = await storageService.get<any[]>('inventory');
      
      const soData = extractStorageValue(soRaw);
      const inventoryData = extractStorageValue(inventoryRaw);

      if (!soData || soData.length === 0) {
        toast.error('Tidak ada data sales order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // STEP 1: Aggregate Sales Order by productKode
      const soAggregated = new Map<string, any>();
      soData.forEach((so: any) => {
        if (!so.items || so.items.length === 0) return;
        
        so.items.forEach((item: any) => {
          const kode = (item.productKode || item.productId || '').toString().toLowerCase().trim();
          if (!kode) return;
          
          if (!soAggregated.has(kode)) {
            soAggregated.set(kode, {
              kode: item.productKode || item.productId,
              nama: item.productName || '',
              qty: 0,
              price: item.price || 0,
              nilai: 0,
            });
          }
          
          const existing = soAggregated.get(kode)!;
          existing.qty += Number(item.qty || 0);
          existing.nilai += Number(item.total || 0);
        });
      });

      if (soAggregated.size === 0) {
        toast.error('Tidak ada item dalam sales order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // STEP 2: Build inventory lookup map
      const inventoryMap = new Map<string, any>();
      inventoryData?.forEach((inv: any) => {
        const codeItem = (inv.codeItem || inv.item_code || '').toString().toLowerCase().trim();
        const kodeIpos = (inv.kodeIpos || '').toString().toLowerCase().trim();
        
        if (codeItem) inventoryMap.set(codeItem, inv);
        if (kodeIpos) inventoryMap.set(kodeIpos, inv);
      });

      // STEP 3: Build stock card data
      const data = Array.from(soAggregated.values())
        .map((item: any) => {
          const kodeKey = item.kode.toString().toLowerCase().trim();
          const invItem = inventoryMap.get(kodeKey);
          
          const stokAwal = invItem?.stockPremonth || 0;
          const masuk = invItem?.receive || 0;
          const keluar = item.qty; // From SO
          const stokAkhir = invItem?.nextStock || 0;
          const harga = item.price;

          return {
            kode: item.kode,
            nama: item.nama,
            satuan: invItem?.satuan || 'PCS',
            stokAwal: stokAwal,
            masuk: masuk,
            keluar: keluar,
            stokAkhir: stokAkhir,
            harga: harga,
            nilaiAwal: stokAwal * harga,
            nilaiMasuk: masuk * harga,
            nilaiKeluar: keluar * harga,
            nilaiAkhir: stokAkhir * harga,
          };
        });

      const template = reportTemplateEngine.inventoryStockCardReport(data);
      const filename = excelFormatter.generateFilename('Laporan_Kartu_Stok');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Stock card report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating stock card report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * INVENTORY - Stock Card Per Item Report (Kartu Stok Per Item)
   * Detailed stock card for each item with P1 and P2 breakdown from Sales Order
   */
  async generateInventoryStockCardPerItemReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating stock card per item report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch data
      const soRaw = await storageService.get<any[]>('salesOrders');
      const inventoryRaw = await storageService.get<any[]>('inventory');
      
      const soData = extractStorageValue(soRaw);
      const inventoryData = extractStorageValue(inventoryRaw);

      if (!soData || soData.length === 0) {
        toast.error('Tidak ada data sales order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // STEP 1: Aggregate Sales Order by productKode
      const soAggregated = new Map<string, any>();
      soData.forEach((so: any) => {
        if (!so.items || so.items.length === 0) return;
        
        so.items.forEach((item: any) => {
          const kode = (item.productKode || item.productId || '').toString().toLowerCase().trim();
          if (!kode) return;
          
          if (!soAggregated.has(kode)) {
            soAggregated.set(kode, {
              kode: item.productKode || item.productId,
              nama: item.productName || '',
              qty: 0,
              price: item.price || 0,
            });
          }
          
          const existing = soAggregated.get(kode)!;
          existing.qty += Number(item.qty || 0);
        });
      });

      if (soAggregated.size === 0) {
        toast.error('Tidak ada item dalam sales order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // STEP 2: Build inventory lookup map
      const inventoryMap = new Map<string, any>();
      inventoryData?.forEach((inv: any) => {
        const codeItem = (inv.codeItem || inv.item_code || '').toString().toLowerCase().trim();
        const kodeIpos = (inv.kodeIpos || '').toString().toLowerCase().trim();
        
        if (codeItem) inventoryMap.set(codeItem, inv);
        if (kodeIpos) inventoryMap.set(kodeIpos, inv);
      });

      // STEP 3: Build stock card per item data
      const data = Array.from(soAggregated.values())
        .map((item: any) => {
          const kodeKey = item.kode.toString().toLowerCase().trim();
          const invItem = inventoryMap.get(kodeKey);
          
          const stockP1 = invItem?.stockP1 || 0;
          const stockP2 = invItem?.stockP2 || 0;
          const masuk = invItem?.receive || 0;
          const keluar = item.qty; // From SO
          const stokAkhir = invItem?.nextStock || 0;

          return {
            kode: item.kode,
            nama: item.nama,
            satuan: invItem?.satuan || 'PCS',
            stockP1: stockP1,
            stockP2: stockP2,
            stockAwal: stockP1 + stockP2,
            masuk: masuk,
            keluar: keluar,
            stokAkhir: stokAkhir,
            harga: item.price,
          };
        });

      const template = reportTemplateEngine.inventoryStockCardPerItemReport(data);
      const filename = excelFormatter.generateFilename('Laporan_Kartu_Stok_Per_Item');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Stock card per item report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating stock card per item report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * INVENTORY - Stock Per Warehouse Report (Stok Barang Per Gudang)
   * Detailed breakdown of stock by warehouse with P1 and P2
   */
  async generateInventoryStockPerWarehouseDetailedReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating stock per warehouse detailed report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      const inventoryRaw = await storageService.get<any[]>('inventory');
      const productsRaw = await storageService.get<any[]>('products');
      
      const inventoryData = extractStorageValue(inventoryRaw);
      const productsData = extractStorageValue(productsRaw);

      if (!inventoryData || inventoryData.length === 0) {
        toast.error('Tidak ada data inventory. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      const productMap = new Map<string, any>();
      productsData?.forEach((prod: any) => {
        if (prod.id) productMap.set(prod.id.toString().toLowerCase(), prod);
        if (prod.kode) productMap.set(prod.kode.toString().toLowerCase(), prod);
      });

      // Group by warehouse
      const groupedByWarehouse: Record<string, any[]> = {};
      inventoryData.forEach((inv: any) => {
        const warehouse = inv.warehouse || inv.gudang || 'Default';
        if (!groupedByWarehouse[warehouse]) {
          groupedByWarehouse[warehouse] = [];
        }

        const productKey = (inv.codeItem || inv.item_code || '').toString().toLowerCase();
        const product = productMap.get(productKey);
        const kategori = (inv.kategori || product?.kategori || '').toLowerCase().trim();
        
        let harga = Number(inv.price || 0);
        if (kategori === 'product') {
          harga = Number(product?.hargaFG || product?.harga || inv.price || 0);
        } else {
          harga = Number(product?.hargaBeli || inv.price || 0);
        }

        const stockP1 = Number(inv.stockP1 || 0);
        const stockP2 = Number(inv.stockP2 || 0);
        const stokAkhir = Number(inv.nextStock || 0);

        groupedByWarehouse[warehouse].push({
          kode: inv.codeItem || inv.item_code || '',
          nama: inv.description || product?.nama || '',
          satuan: inv.satuan || product?.satuan || '',
          stockP1: stockP1,
          stockP2: stockP2,
          stokAkhir: stokAkhir,
          harga: harga,
          nilaiStok: stokAkhir * harga,
        });
      });

      const template = reportTemplateEngine.inventoryStockPerWarehouseDetailedReport(groupedByWarehouse);
      const filename = excelFormatter.generateFilename('Laporan_Stok_Barang_Per_Gudang');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Stock per warehouse detailed report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating stock per warehouse detailed report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PRODUCTION - Bill of Material (BOM) Report
   * BOM data embedded dalam product.bom array
   */
  async generateProductionBOMReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating production BOM report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      console.log('[ReportService] ✅ Server mode confirmed:', config.serverUrl);

      // Fetch products dan materials dari SERVER
      const productsRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.PRODUCTS);
      const materialsRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.MATERIALS);
      
      const productsData = extractStorageValue(productsRaw);
      const materialsData = extractStorageValue(materialsRaw);

      console.log('[ReportService] 📊 Fetched data dari SERVER:', {
        productsCount: productsData.length,
        materialsCount: materialsData.length,
      });

      if (!productsData || productsData.length === 0) {
        console.warn('[ReportService] ⚠️ No products found in server storage');
        toast.error('Tidak ada data produk. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Build material lookup map: material_id -> material name
      const materialMap = new Map<string, string>();
      if (materialsData && Array.isArray(materialsData)) {
        materialsData.forEach((mat: any) => {
          const materialId = (mat.material_id || mat.kode || '').toString().trim();
          const materialName = (mat.nama || mat.name || '').toString().trim();
          if (materialId && materialName) {
            materialMap.set(materialId.toLowerCase(), materialName);
          }
        });
      }

      console.log('[ReportService] 🔍 Material map created:', {
        size: materialMap.size,
        sample: Array.from(materialMap.entries()).slice(0, 3),
      });

      // Flatten BOM data dari product.bom array dengan enrichment
      const flatBomData: any[] = [];
      productsData.forEach((product: any) => {
        if (product.bom && Array.isArray(product.bom) && product.bom.length > 0) {
          product.bom.forEach((bomItem: any) => {
            const materialId = (bomItem.material_id || '').toString().trim();
            const materialName = materialMap.get(materialId.toLowerCase()) || bomItem.material_name || materialId;
            
            flatBomData.push({
              productKode: product.kode || product.product_id || '',
              productName: product.nama || '',
              materialKode: materialId,
              materialName: materialName,
              ratio: bomItem.ratio || 1,
              unit: bomItem.unit || 'Unit',
            });
          });
        }
      });

      console.log('[ReportService] 📦 Flattened BOM data dengan enrichment:', {
        count: flatBomData.length,
        sample: flatBomData.slice(0, 3),
      });

      if (flatBomData.length === 0) {
        toast.error('Tidak ada data BOM. Pastikan produk memiliki BOM yang sudah dikonfigurasi.');
        return;
      }

      const template = reportTemplateEngine.productionBOMReport(flatBomData);
      const filename = excelFormatter.generateFilename('Laporan_BOM');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Production BOM report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating production BOM report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PRODUCTION - SPK (Work Order) Report
   */
  async generateProductionSPKReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating production SPK report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch SPK, Schedule, dan Production data
      const spkRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.SPK);
      const scheduleRaw = await storageService.get<any[]>('schedule');
      const productionRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.PRODUCTION);
      
      const spkData = extractStorageValue(spkRaw);
      const scheduleData = extractStorageValue(scheduleRaw);
      const productionData = extractStorageValue(productionRaw);

      if (!spkData || spkData.length === 0) {
        toast.error('Tidak ada data SPK. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      console.log('[ReportService] 📊 Fetched data:', {
        spkCount: spkData.length,
        scheduleCount: scheduleData?.length || 0,
        productionCount: productionData?.length || 0,
      });

      // Enrich SPK data dengan schedule dan production data
      const enrichedSPKData = spkData.map((spk: any) => {
        // Cari schedule untuk SPK ini
        const schedule = scheduleData?.find((s: any) => s.spkNo === spk.spkNo);
        
        // Cari production untuk SPK ini
        const production = productionData?.find((p: any) => p.spkNo === spk.spkNo);

        // Debug logging untuk first few items
        if (spkData.indexOf(spk) < 2) {
          console.log(`[ReportService] SPK ${spk.spkNo}:`, {
            hasSchedule: !!schedule,
            scheduleStartDate: schedule?.scheduleStartDate,
            scheduleEndDate: schedule?.scheduleEndDate,
            hasProduction: !!production,
            productionStartDate: production?.startDate,
            productionEndDate: production?.endDate,
          });
        }

        return {
          ...spk,
          // Qty Order dari SPK
          target: spk.qty || spk.target || 0,
          targetQty: spk.qty || spk.targetQty || 0,
          quantity: spk.qty || spk.quantity || 0,
          
          // Qty Produksi dari Production
          producedQty: production?.producedQty || production?.progress || 0,
          actualQuantity: production?.actualQuantity || 0,
          progress: production?.progress || 0,
          
          // Tanggal dari Schedule (support both scheduleStartDate dan startDate)
          scheduleStartDate: schedule?.scheduleStartDate || schedule?.startDate || production?.startDate,
          scheduleEndDate: schedule?.scheduleEndDate || schedule?.endDate || production?.endDate,
          
          // Tanggal dari Production
          productionStartDate: production?.startDate,
          productionEndDate: production?.endDate,
          producedDate: production?.endDate,
          
          // Status
          status: spk.status || 'DRAFT',
        };
      });

      let filtered = enrichedSPKData;
      if (startDate && endDate) {
        filtered = enrichedSPKData.filter(spk => {
          const spkDate = spk.scheduleStartDate || spk.productionStartDate || spk.created || spk.date;
          return spkDate >= startDate && spkDate <= endDate;
        });
      }

      console.log('[ReportService] 📦 Enriched SPK data:', {
        count: filtered.length,
        sample: filtered.slice(0, 2),
      });

      const template = reportTemplateEngine.productionSPKReport(filtered, startDate, endDate);
      const filename = excelFormatter.generateFilename('Laporan_SPK', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Production SPK report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating production SPK report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PRODUCTION - Production Report
   */
  async generateProductionReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating production report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch SPK, Schedule, Production, and Sales Orders data
      const spkRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.SPK);
      const scheduleRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.SCHEDULE);
      const productionRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.PRODUCTION);
      const soRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.SALES_ORDERS);
      
      const spkData = extractStorageValue(spkRaw);
      const scheduleData = extractStorageValue(scheduleRaw);
      const productionData = extractStorageValue(productionRaw);
      const soData = extractStorageValue(soRaw);

      if (!spkData || spkData.length === 0) {
        toast.error('Tidak ada data produksi. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      console.log('[ReportService] 📊 Fetched data:', {
        spkCount: spkData.length,
        scheduleCount: scheduleData?.length || 0,
        productionCount: productionData?.length || 0,
        soCount: soData?.length || 0,
      });

      // Build SO lookup map: soNo -> SO data
      const soMap = new Map<string, any>();
      if (soData && Array.isArray(soData)) {
        soData.forEach((so: any) => {
          const soNo = (so.soNo || so.id || '').toString().trim();
          if (soNo) {
            soMap.set(soNo.toLowerCase(), so);
          }
        });
      }

      // Build schedule lookup map: spkNo -> schedule data
      const scheduleMap = new Map<string, any>();
      if (scheduleData && Array.isArray(scheduleData)) {
        scheduleData.forEach((sched: any) => {
          const spkNo = (sched.spkNo || sched.workOrderNo || '').toString().trim();
          if (spkNo) {
            scheduleMap.set(spkNo.toLowerCase(), sched);
          }
        });
      }

      // Build production lookup map: spkNo -> production data
      const productionMap = new Map<string, any>();
      if (productionData && Array.isArray(productionData)) {
        productionData.forEach((prod: any) => {
          const spkNo = (prod.spkNo || prod.workOrderNo || '').toString().trim();
          if (spkNo) {
            productionMap.set(spkNo.toLowerCase(), prod);
          }
        });
      }

      // Enrich SPK data with schedule and production data
      const enrichedData = spkData.map((spk: any) => {
        const spkNo = spk.spkNo || spk.id || '';
        const soNo = (spk.soNo || spk.salesOrderNo || '').toString().trim();
        
        const schedule = scheduleMap.get(spkNo.toLowerCase());
        const production = productionMap.get(spkNo.toLowerCase());
        const so = soMap.get(soNo.toLowerCase());

        return {
          ...spk,
          // Qty Order from SO (if available) or SPK
          quantity: so?.totalQty || so?.qty || spk.qty || spk.quantity || 0,
          // Qty Produksi from Production data
          actualQuantity: production?.producedQty || production?.actualQuantity || 0,
          // Tanggal Mulai from Schedule
          startDate: schedule?.scheduleStartDate || schedule?.startDate || production?.startDate || '-',
          // Tanggal Selesai from Schedule
          endDate: schedule?.scheduleEndDate || schedule?.endDate || production?.endDate || '-',
        };
      });

      let filtered = enrichedData;
      if (startDate && endDate) {
        filtered = enrichedData.filter(item => {
          const itemDate = item.created || item.date;
          return itemDate >= startDate && itemDate <= endDate;
        });
      }

      const template = reportTemplateEngine.packagingProductionReport(filtered);
      const filename = excelFormatter.generateFilename('Laporan_Produksi', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Production report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating production report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PRODUCTION - Production Cost Report
   */
  async generateProductionCostReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating production cost report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch SPK, Products, Materials, BOM, and Sales Orders data
      // IMPORTANT: BOM is stored separately in StorageKeys.PACKAGING.BOM, not embedded in products
      const spkRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.SPK);
      const productsRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.PRODUCTS);
      const materialsRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.MATERIALS);
      const bomRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.BOM);
      const soRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.SALES_ORDERS);
      
      const spkData = extractStorageValue(spkRaw);
      const productsData = extractStorageValue(productsRaw);
      const materialsData = extractStorageValue(materialsRaw);
      const bomData = extractStorageValue(bomRaw);
      const soData = extractStorageValue(soRaw);

      if (!spkData || spkData.length === 0) {
        toast.error('Tidak ada data produksi. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      console.log('[ReportService] 📊 Fetched data:', {
        spkCount: spkData.length,
        productsCount: productsData?.length || 0,
        materialsCount: materialsData?.length || 0,
        bomCount: bomData?.length || 0,
        soCount: soData?.length || 0,
      });

      // Build material lookup map: material_id -> { name, price }
      const materialMap = new Map<string, { name: string; price: number }>();
      if (materialsData && Array.isArray(materialsData)) {
        materialsData.forEach((mat: any) => {
          const materialId = (mat.material_id || mat.kode || '').toString().trim();
          const materialName = (mat.nama || mat.name || '').toString().trim();
          const materialPrice = parseFloat(mat.harga || mat.price || '0') || 0;
          if (materialId && materialName) {
            materialMap.set(materialId.toLowerCase(), {
              name: materialName,
              price: materialPrice,
            });
          }
        });
        
        // Debug: Show material prices
        console.log('[ReportService] 💰 Material Prices (first 5):');
        let count = 0;
        materialsData.forEach((mat: any) => {
          if (count < 5) {
            const materialId = (mat.material_id || mat.kode || '').toString().trim();
            const materialPrice = parseFloat(mat.harga || mat.price || '0') || 0;
            console.log(`  ${materialId}: Rp ${materialPrice.toLocaleString('id-ID')}`);
            count++;
          }
        });
      }
      const productBomMap = new Map<string, any[]>();
      if (bomData && Array.isArray(bomData)) {
        bomData.forEach((bomItem: any) => {
          const productId = (bomItem.product_id || bomItem.kode || '').toString().trim().toLowerCase();
          if (!productId) return;
          
          if (!productBomMap.has(productId)) {
            productBomMap.set(productId, []);
          }
          productBomMap.get(productId)!.push(bomItem);
        });
        
        // Debug: Show first few BOM items
        console.log('[ReportService] 📋 BOM Map Sample (first 3 products):');
        let count = 0;
        bomData.slice(0, 10).forEach((bomItem: any) => {
          const productId = (bomItem.product_id || bomItem.kode || '').toString().trim().toLowerCase();
          if (productId && count < 3) {
            const bomItems = productBomMap.get(productId) || [];
            console.log(`  Product: ${productId}, BOM Items: ${bomItems.length}`);
            bomItems.slice(0, 2).forEach((item: any) => {
              console.log(`    - Material: ${item.material_id || item.kode}, Ratio: ${item.ratio || item.qty}`);
            });
            count++;
          }
        });
      }

      // Build SO lookup map: soNo -> SO data
      const soMap = new Map<string, any>();
      if (soData && Array.isArray(soData)) {
        soData.forEach((so: any) => {
          const soNo = (so.soNo || so.id || '').toString().trim();
          if (soNo) {
            soMap.set(soNo.toLowerCase(), so);
          }
        });
      }

      // Enrich SPK data with quantity and material costs
      const enrichedSPKData = spkData.map((spk: any, idx: number) => {
        const spkNo = (spk.spkNo || spk.id || '').toString().trim();
        const soNo = (spk.soNo || spk.salesOrderNo || '').toString().trim();
        
        // Get SO data for quantity
        const so = soMap.get(soNo.toLowerCase());
        const soQty = so?.totalQty || so?.qty || 0;
        
        // Get quantity from SPK or SO
        const quantity = spk.qty || spk.quantity || soQty || 0;

        // Get product code - try multiple field name variations
        const productKode = (spk.kode || spk.product_id || spk.productId || '').toString().trim().toLowerCase();

        // Calculate material cost from BOM
        let materialCost = 0;
        let bomItemCount = 0;
        let debugInfo = '';
        
        // Get BOM items for this product
        const bomItems = productBomMap.get(productKode) || [];
        
        if (bomItems.length > 0) {
          bomItems.forEach((bomItem: any) => {
            const materialId = (bomItem.material_id || bomItem.materialId || bomItem.kode || '').toString().trim();
            const materialInfo = materialMap.get(materialId.toLowerCase());
            const materialPrice = materialInfo?.price || bomItem.price || bomItem.harga || 0;
            const ratio = bomItem.ratio || bomItem.qty || 1;
            
            // Material cost = (material price × ratio) × quantity
            if (materialPrice > 0) {
              materialCost += (materialPrice * ratio) * quantity;
              bomItemCount++;
            }
          });
          
          // Debug log for first few items
          if (idx < 3) {
            debugInfo = `BOM found, items: ${bomItems.length}, Calculated: ${bomItemCount}, Cost: ${materialCost}`;
            console.log(`[ReportService] 🔍 SPK ${spkNo}: ${debugInfo}`);
          }
        } else {
          if (idx < 3) {
            debugInfo = `Product ${productKode} - BOM not found in BOM storage`;
            console.log(`[ReportService] ⚠️ SPK ${spkNo}: ${debugInfo}`);
            console.log(`[ReportService]   Available BOM products: ${Array.from(productBomMap.keys()).slice(0, 5).join(', ')}`);
          }
        }

        return {
          spkNo: spkNo,
          productName: spk.productName || spk.product || productKode,
          quantity: quantity,
          materialCost: materialCost,
          laborCost: spk.laborCost || 0,
          overheadCost: spk.overheadCost || 0,
          created: spk.created || spk.date || new Date().toISOString(),
        };
      });

      console.log('[ReportService] 💰 Enriched SPK data with costs:', {
        count: enrichedSPKData.length,
        materialMapSize: materialMap.size,
        productBomMapSize: productBomMap.size,
        totalMaterialCost: enrichedSPKData.reduce((sum, item) => sum + (item.materialCost || 0), 0),
        sample: enrichedSPKData.slice(0, 2),
      });

      // If no material costs calculated, log detailed warning
      if (enrichedSPKData.every(item => item.materialCost === 0)) {
        console.warn('[ReportService] ⚠️ WARNING: All material costs are 0. Detailed diagnostics:');
        console.warn('  1. BOM data exists:', bomData && bomData.length > 0, `(${bomData?.length || 0} items)`);
        console.warn('  2. Materials master data exists:', materialsData && materialsData.length > 0, `(${materialsData?.length || 0} items)`);
        console.warn('  3. Material prices are set:', Array.from(materialMap.values()).some(m => m.price > 0));
        console.warn('  4. BOM items linked to products:', productBomMap.size > 0, `(${productBomMap.size} products with BOM)`);
        
        // Show sample data for debugging
        if (bomData && bomData.length > 0) {
          console.warn('  📦 Sample BOM items:', bomData.slice(0, 3));
        }
        if (materialsData && materialsData.length > 0) {
          console.warn('  📋 Sample materials:', materialsData.slice(0, 3));
        }
        if (spkData && spkData.length > 0) {
          console.warn('  📄 Sample SPK:', spkData.slice(0, 2).map(s => ({ spkNo: s.spkNo, kode: s.kode, qty: s.qty })));
        }
      }

      let filtered = enrichedSPKData;
      if (startDate && endDate) {
        filtered = enrichedSPKData.filter(spk => {
          const spkDate = spk.created;
          return spkDate >= startDate && spkDate <= endDate;
        });
      }

      const template = reportTemplateEngine.productionCostReport(filtered, startDate, endDate);
      const filename = excelFormatter.generateFilename('Laporan_Biaya_Produksi', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Production cost report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating production cost report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PRODUCTION - Material Usage Report
   */
  async generateMaterialUsageReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating material usage report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch SPK, Products, dan Materials data
      const spkRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.SPK);
      const productsRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.PRODUCTS);
      const materialsRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.MATERIALS);
      
      const spkData = extractStorageValue(spkRaw);
      const productsData = extractStorageValue(productsRaw);
      const materialsData = extractStorageValue(materialsRaw);

      if (!spkData || spkData.length === 0) {
        toast.error('Tidak ada data produksi. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      console.log('[ReportService] 📊 Fetched data:', {
        spkCount: spkData.length,
        productsCount: productsData?.length || 0,
        materialsCount: materialsData?.length || 0,
      });

      // Build material lookup map: material_id -> { name, price }
      const materialMap = new Map<string, { name: string; price: number }>();
      if (materialsData && Array.isArray(materialsData)) {
        materialsData.forEach((mat: any) => {
          const materialId = (mat.material_id || mat.kode || '').toString().trim();
          const materialName = (mat.nama || mat.name || '').toString().trim();
          const materialPrice = parseFloat(mat.harga || mat.price || '0') || 0;
          if (materialId && materialName) {
            materialMap.set(materialId.toLowerCase(), {
              name: materialName,
              price: materialPrice,
            });
          }
        });
      }

      console.log('[ReportService] 🔍 Material map created:', {
        size: materialMap.size,
        sample: Array.from(materialMap.entries()).slice(0, 3),
      });

      // Build product lookup map: product_id -> product_name
      const productMap = new Map<string, string>();
      if (productsData && Array.isArray(productsData)) {
        productsData.forEach((prod: any) => {
          const productId = (prod.kode || prod.product_id || '').toString().trim();
          const productName = (prod.nama || '').toString().trim();
          if (productId && productName) {
            productMap.set(productId.toLowerCase(), productName);
          }
        });
      }

      // Flatten material usage data dari SPK + BOM
      const materialUsageData: any[] = [];
      
      spkData.forEach((spk: any) => {
        const spkNo = spk.spkNo || spk.id || '';
        const spkDate = spk.created || spk.date || new Date().toISOString();
        const productKode = spk.kode || spk.product_id || '';
        const productName = spk.productName || spk.product || productMap.get(productKode.toLowerCase()) || productKode;
        const spkQty = spk.qty || spk.quantity || 0;

        // Cari product untuk mendapatkan BOM
        const product = productsData?.find((p: any) => 
          (p.kode || p.product_id || '').toString().trim().toLowerCase() === productKode.toLowerCase()
        );

        if (product && product.bom && Array.isArray(product.bom)) {
          // Flatten BOM items
          product.bom.forEach((bomItem: any) => {
            // Support both snake_case (material_id) and camelCase (materialId)
            const materialId = (bomItem.material_id || bomItem.materialId || '').toString().trim();
            // Support both snake_case (material_name) and camelCase (materialName)
            const bomMaterialName = bomItem.material_name || bomItem.materialName || '';
            
            // Get material info from lookup map (includes name and price)
            const materialInfo = materialMap.get(materialId.toLowerCase());
            const materialName = materialInfo?.name || bomMaterialName || materialId;
            const materialPrice = materialInfo?.price || bomItem.price || 0;
            
            const ratio = bomItem.ratio || 1;
            const usedQty = spkQty * ratio;

            materialUsageData.push({
              date: spkDate,
              spkNo: spkNo,
              productKode: productKode,
              productName: productName,
              materialId: materialId,
              materialName: materialName,
              usedQty: usedQty,
              ratio: ratio,
              unit: bomItem.unit || 'Unit',
              price: materialPrice,
              created: spkDate,
            });
          });
        }
      });

      console.log('[ReportService] 📦 Flattened material usage data:', {
        count: materialUsageData.length,
        sample: materialUsageData.slice(0, 3),
      });

      if (materialUsageData.length === 0) {
        toast.error('Tidak ada data penggunaan material. Pastikan SPK memiliki BOM yang sudah dikonfigurasi.');
        return;
      }

      let filtered = materialUsageData;
      if (startDate && endDate) {
        filtered = materialUsageData.filter(item => {
          const itemDate = item.date || item.created;
          return itemDate >= startDate && itemDate <= endDate;
        });
      }

      const template = reportTemplateEngine.productionMaterialUsageReport(filtered, startDate, endDate);
      const filename = excelFormatter.generateFilename('Laporan_Penggunaan_Material', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Material usage report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating material usage report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PRODUCTION - Waste/Scrap Report
   */
  async generateWasteReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating waste/scrap report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      const spkRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.SPK);
      const spkData = extractStorageValue(spkRaw);

      if (!spkData || spkData.length === 0) {
        toast.error('Tidak ada data produksi. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      let filtered = spkData;
      if (startDate && endDate) {
        filtered = spkData.filter(spk => {
          const spkDate = spk.created || spk.date;
          return spkDate >= startDate && spkDate <= endDate;
        });
      }

      const template = reportTemplateEngine.productionWasteReport(filtered, startDate, endDate);
      const filename = excelFormatter.generateFilename('Laporan_Waste_Scrap', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Waste/scrap report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating waste/scrap report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PRODUCTION - Production Capacity Report
   * 
   * Calculates production capacity metrics from:
   * - SPK (Surat Perintah Kerja) - production orders
   * - Production data - actual production progress
   * - Schedule data - planned dates
   */
  async generateProductionCapacityReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating production capacity report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch all required data
      const spkRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.SPK);
      const productionRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.PRODUCTION);
      const scheduleRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.SCHEDULE);
      
      const spkData = extractStorageValue(spkRaw);
      const productionData = extractStorageValue(productionRaw);
      const scheduleData = extractStorageValue(scheduleRaw);

      if (!spkData || spkData.length === 0) {
        toast.error('Tidak ada data produksi. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      console.log('[ReportService] 📊 Fetched data:', {
        spkCount: spkData.length,
        productionCount: productionData?.length || 0,
        scheduleCount: scheduleData?.length || 0,
      });

      // Build production lookup map: spkNo -> production data
      const productionMap = new Map<string, any>();
      if (productionData && Array.isArray(productionData)) {
        productionData.forEach((prod: any) => {
          const spkNo = (prod.spkNo || '').toString().trim();
          if (spkNo) {
            productionMap.set(spkNo.toLowerCase(), prod);
          }
        });
      }

      // Build schedule lookup map: spkNo -> schedule data
      const scheduleMap = new Map<string, any>();
      if (scheduleData && Array.isArray(scheduleData)) {
        scheduleData.forEach((sched: any) => {
          const spkNo = (sched.spkNo || '').toString().trim();
          if (spkNo) {
            scheduleMap.set(spkNo.toLowerCase(), sched);
          }
        });
      }

      // Enrich SPK data with production metrics
      const enrichedData = spkData.map((spk: any, idx: number) => {
        const spkNo = (spk.spkNo || spk.id || '').toString().trim();
        const production = productionMap.get(spkNo.toLowerCase());
        const schedule = scheduleMap.get(spkNo.toLowerCase());

        // Get production metrics
        const targetQty = spk.qty || spk.quantity || 0;
        const producedQty = production?.producedQty || production?.progress || 0;
        const startDate = schedule?.scheduleStartDate || production?.startDate || spk.created;
        // endDate is available but not used in calculation - kept for future enhancements

        // Calculate capacity metrics
        const daysElapsed = startDate ? Math.ceil((new Date().getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const dailyCapacity = daysElapsed > 0 ? Math.ceil(targetQty / daysElapsed) : targetQty;
        const monthlyCapacity = dailyCapacity * 25; // Assume 25 working days per month
        const utilization = targetQty > 0 ? ((producedQty / targetQty) * 100).toFixed(2) : '0';
        const downtime = production?.downtime || 0;
        const efficiency = production?.efficiency || ((producedQty / targetQty) * 100).toFixed(2) + '%';

        return {
          spkNo: spkNo,
          productionLine: spk.productionLine || spk.line || `Line ${idx + 1}`,
          dailyCapacity: dailyCapacity,
          monthlyCapacity: monthlyCapacity,
          actualProduction: producedQty,
          utilization: utilization + '%',
          downtime: downtime,
          efficiency: efficiency,
          targetQty: targetQty,
          daysElapsed: daysElapsed,
        };
      });

      console.log('[ReportService] 💰 Enriched capacity data:', {
        count: enrichedData.length,
        totalCapacity: enrichedData.reduce((sum, item) => sum + item.dailyCapacity, 0),
        totalProduction: enrichedData.reduce((sum, item) => sum + item.actualProduction, 0),
        sample: enrichedData.slice(0, 2),
      });

      const template = reportTemplateEngine.productionCapacityReport(enrichedData);
      const filename = excelFormatter.generateFilename('Laporan_Kapasitas_Produksi');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Production capacity report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating production capacity report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * ACCOUNTING - Balance Sheet (Neraca) Report
   * Fetch journal entries and accounts, calculate balances, generate balance sheet
   */
  async generateBalanceSheetReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating balance sheet report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch journal entries and accounts
      const journalEntriesRaw = await storageService.get(StorageKeys.PACKAGING.JOURNAL_ENTRIES);
      const accountsRaw = await storageService.get(StorageKeys.PACKAGING.ACCOUNTS);
      
      const journalEntries = extractStorageValue(journalEntriesRaw);
      const accounts = extractStorageValue(accountsRaw);

      if (!accounts || accounts.length === 0) {
        toast.error('Tidak ada data akun. Pastikan Chart of Accounts sudah dikonfigurasi.');
        return;
      }

      console.log('[ReportService] 📊 Fetched data:', {
        journalEntriesCount: journalEntries?.length || 0,
        accountsCount: accounts.length,
      });

      // Calculate account balances from journal entries
      const accountBalances = new Map<string, { debit: number; credit: number }>();
      
      // Initialize all accounts with 0 balance
      accounts.forEach((account: any) => {
        const code = (account.code || '').toString().trim();
        if (code) {
          accountBalances.set(code, { debit: 0, credit: 0 });
        }
      });

      // Sum up debits and credits from journal entries
      if (journalEntries && Array.isArray(journalEntries)) {
        journalEntries.forEach((entry: any) => {
          const accountCode = (entry.account || entry.accountCode || '').toString().trim();
          if (accountCode && accountBalances.has(accountCode)) {
            const current = accountBalances.get(accountCode)!;
            const debit = Number(entry.debit || 0);
            const credit = Number(entry.credit || 0);
            
            accountBalances.set(accountCode, {
              debit: current.debit + debit,
              credit: current.credit + credit,
            });
          }
        });
      }

      // Build balance sheet data with account balances
      const balanceSheetData = accounts.map((account: any) => {
        const code = (account.code || '').toString().trim();
        const balances = accountBalances.get(code) || { debit: 0, credit: 0 };
        
        // Calculate net balance based on account type
        // Assets: Debit is positive, Credit is negative
        // Liabilities & Equity: Credit is positive, Debit is negative
        const accountType = (account.type || '').toUpperCase();
        let balance = 0;
        
        if (accountType === 'ASSET') {
          balance = balances.debit - balances.credit;
        } else if (accountType === 'LIABILITY' || accountType === 'EQUITY') {
          balance = balances.credit - balances.debit;
        } else if (accountType === 'REVENUE') {
          balance = balances.credit - balances.debit;
        } else if (accountType === 'EXPENSE') {
          balance = balances.debit - balances.credit;
        }

        return {
          code: code,
          name: account.name || '',
          type: accountType,
          debit: balances.debit,
          credit: balances.credit,
          balance: Math.abs(balance), // Use absolute value for display
          balanceSign: balance >= 0 ? '+' : '-',
        };
      });

      // Generate template
      const template = reportTemplateEngine.balanceSheetReport(balanceSheetData);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Neraca_Balance_Sheet');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Balance sheet report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating balance sheet report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * ACCOUNTING - Income Statement (Laba Rugi) Report
   * Priority: invoices + operationalExpenses + taxRecords
   * Fallback: journal entries if available
   */
  async generateIncomeStatementReport(startDate: string, endDate: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating income statement report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.error('Server configuration required for this report');
        return;
      }

      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      // PRIMARY: Try to get from invoices + operationalExpenses + taxRecords
      // Try both direct keys and StorageKeys variants
      let invoicesRaw = await storageService.get('invoices');
      if (!invoicesRaw) invoicesRaw = await storageService.get(StorageKeys.PACKAGING.INVOICES);
      
      let operationalExpensesRaw = await storageService.get('operationalExpenses');
      if (!operationalExpensesRaw) operationalExpensesRaw = await storageService.get(StorageKeys.PACKAGING.OPERATIONAL_EXPENSES);
      
      let taxRecordsRaw = await storageService.get('taxRecords');
      if (!taxRecordsRaw) taxRecordsRaw = await storageService.get(StorageKeys.PACKAGING.TAX_RECORDS);

      const invoices = extractStorageValue(invoicesRaw);
      const operationalExpenses = extractStorageValue(operationalExpensesRaw);
      const taxRecords = extractStorageValue(taxRecordsRaw);

      console.log('[ReportService] 📊 Income Statement - Data fetched:', {
        invoicesCount: invoices?.length || 0,
        expensesCount: operationalExpenses?.length || 0,
        taxRecordsCount: taxRecords?.length || 0,
      });

      let totalRevenue = 0;
      let totalExpenses = 0;
      let totalTax = 0;

      // Calculate revenue from invoices
      if (invoices && invoices.length > 0) {
        totalRevenue = invoices
          .filter((inv: any) => {
            const invDate = new Date(inv.date || inv.createdAt);
            return invDate >= startDateObj && invDate <= endDateObj;
          })
          .reduce((sum: number, inv: any) => sum + (inv.amount || inv.total || 0), 0);
      }

      // Calculate expenses from operational expenses
      if (operationalExpenses && operationalExpenses.length > 0) {
        totalExpenses = operationalExpenses
          .filter((exp: any) => {
            const expDate = new Date(exp.date || exp.createdAt);
            return expDate >= startDateObj && expDate <= endDateObj;
          })
          .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
      }

      // Calculate tax from tax records
      if (taxRecords && taxRecords.length > 0) {
        totalTax = taxRecords
          .filter((tax: any) => {
            const taxDate = new Date(tax.date || tax.createdAt);
            return taxDate >= startDateObj && taxDate <= endDateObj;
          })
          .reduce((sum: number, tax: any) => sum + (tax.amount || 0), 0);
      }

      const netProfit = totalRevenue - totalExpenses - totalTax;

      // Build report data
      const incomeStatementData = [
        {
          'Keterangan': 'PENDAPATAN (REVENUE)',
          'Jumlah': totalRevenue,
          '_isHeader': true,
        },
        {
          'Keterangan': 'Penjualan Produk/Jasa',
          'Jumlah': totalRevenue,
        },
        {
          'Keterangan': 'TOTAL PENDAPATAN',
          'Jumlah': totalRevenue,
          '_isTotal': true,
        },
        {
          'Keterangan': '',
          'Jumlah': '',
          '_isBlank': true,
        },
        {
          'Keterangan': 'BEBAN (EXPENSES)',
          'Jumlah': totalExpenses,
          '_isHeader': true,
        },
        {
          'Keterangan': 'Beban Operasional',
          'Jumlah': totalExpenses,
        },
        {
          'Keterangan': 'TOTAL BEBAN',
          'Jumlah': totalExpenses,
          '_isTotal': true,
        },
        {
          'Keterangan': '',
          'Jumlah': '',
          '_isBlank': true,
        },
        {
          'Keterangan': 'LABA SEBELUM PAJAK',
          'Jumlah': totalRevenue - totalExpenses,
          '_isSubtotal': true,
        },
        {
          'Keterangan': 'PAJAK',
          'Jumlah': totalTax,
        },
        {
          'Keterangan': 'LABA BERSIH (NET PROFIT)',
          'Jumlah': netProfit,
          '_isGrandTotal': true,
        },
      ];

      // Generate template
      const template = reportTemplateEngine.incomeStatementReport(incomeStatementData);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Laba_Rugi_Income_Statement');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Income statement report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating income statement report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * ACCOUNTING - Equity Changes (Perubahan Modal) Report
   * Priority: Calculate from Income Statement (Net Profit)
   * Fallback: journal entries if available
   */
  async generateEquityChangesReport(startDate: string, endDate: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating equity changes report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.error('Server configuration required for this report');
        return;
      }

      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      // Get accounts to find opening balance
      let accountsRaw = await storageService.get('accounts');
      if (!accountsRaw) accountsRaw = await storageService.get(StorageKeys.PACKAGING.ACCOUNTS);
      const accounts = extractStorageValue(accountsRaw);

      // Get equity accounts
      const equityAccounts = accounts.filter((a: any) => a.type === 'EQUITY');
      
      // Calculate opening balance from equity accounts
      let openingBalance = 0;
      equityAccounts.forEach((account: any) => {
        openingBalance += account.balance || 0;
      });

      // Calculate net profit from invoices - expenses - tax
      let invoicesRaw = await storageService.get('invoices');
      if (!invoicesRaw) invoicesRaw = await storageService.get(StorageKeys.PACKAGING.INVOICES);
      
      let operationalExpensesRaw = await storageService.get('operationalExpenses');
      if (!operationalExpensesRaw) operationalExpensesRaw = await storageService.get(StorageKeys.PACKAGING.OPERATIONAL_EXPENSES);
      
      let taxRecordsRaw = await storageService.get('taxRecords');
      if (!taxRecordsRaw) taxRecordsRaw = await storageService.get(StorageKeys.PACKAGING.TAX_RECORDS);

      const invoices = extractStorageValue(invoicesRaw);
      const operationalExpenses = extractStorageValue(operationalExpensesRaw);
      const taxRecords = extractStorageValue(taxRecordsRaw);

      console.log('[ReportService] 📊 Equity Changes - Data fetched:', {
        accountsCount: accounts?.length || 0,
        invoicesCount: invoices?.length || 0,
        expensesCount: operationalExpenses?.length || 0,
        taxRecordsCount: taxRecords?.length || 0,
      });

      let totalRevenue = 0;
      let totalExpenses = 0;
      let totalTax = 0;

      // Revenue from invoices
      if (invoices && invoices.length > 0) {
        totalRevenue = invoices
          .filter((inv: any) => {
            const invDate = new Date(inv.date || inv.createdAt);
            return invDate >= startDateObj && invDate <= endDateObj;
          })
          .reduce((sum: number, inv: any) => sum + (inv.amount || inv.total || 0), 0);
      }

      // Expenses from operational expenses
      if (operationalExpenses && operationalExpenses.length > 0) {
        totalExpenses = operationalExpenses
          .filter((exp: any) => {
            const expDate = new Date(exp.date || exp.createdAt);
            return expDate >= startDateObj && expDate <= endDateObj;
          })
          .reduce((sum: number, exp: any) => sum + (exp.amount || 0), 0);
      }

      // Tax from tax records
      if (taxRecords && taxRecords.length > 0) {
        totalTax = taxRecords
          .filter((tax: any) => {
            const taxDate = new Date(tax.date || tax.createdAt);
            return taxDate >= startDateObj && taxDate <= endDateObj;
          })
          .reduce((sum: number, tax: any) => sum + (tax.amount || 0), 0);
      }

      const netProfit = totalRevenue - totalExpenses - totalTax;
      const closingBalance = openingBalance + netProfit;

      // Build report data
      const equityChangesData = [
        {
          'Keterangan': 'MODAL AWAL (OPENING BALANCE)',
          'Jumlah': openingBalance,
          '_isHeader': true,
        },
        {
          'Keterangan': 'Saldo Awal Periode',
          'Jumlah': openingBalance,
        },
        {
          'Keterangan': '',
          'Jumlah': '',
          '_isBlank': true,
        },
        {
          'Keterangan': 'PERUBAHAN MODAL (CHANGES)',
          'Jumlah': netProfit,
          '_isHeader': true,
        },
        {
          'Keterangan': 'Laba/Rugi Periode',
          'Jumlah': netProfit,
        },
        {
          'Keterangan': '',
          'Jumlah': '',
          '_isBlank': true,
        },
        {
          'Keterangan': 'MODAL AKHIR (CLOSING BALANCE)',
          'Jumlah': closingBalance,
          '_isGrandTotal': true,
        },
        {
          'Keterangan': 'Saldo Akhir Periode',
          'Jumlah': closingBalance,
        },
      ];

      // Generate template
      const template = reportTemplateEngine.equityChangesReport(equityChangesData);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Perubahan_Modal_Equity_Changes');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Equity changes report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating equity changes report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * ACCOUNTING - Cash Flow (Arus Kas) Report
   * Track cash inflows and outflows from payments and operational expenses
   */
  async generateCashFlowReport(startDate: string, endDate: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating cash flow report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.error('Server configuration required for this report');
        return;
      }

      // Fetch payments and operational expenses
      let paymentsRaw = await storageService.get('payments');
      if (!paymentsRaw) paymentsRaw = await storageService.get(StorageKeys.PACKAGING.PAYMENTS);
      
      let operationalExpensesRaw = await storageService.get('operationalExpenses');
      if (!operationalExpensesRaw) operationalExpensesRaw = await storageService.get(StorageKeys.PACKAGING.OPERATIONAL_EXPENSES);

      const payments = extractStorageValue(paymentsRaw);
      const operationalExpenses = extractStorageValue(operationalExpensesRaw);

      console.log('[ReportService] 📊 Cash Flow - Data fetched:', {
        paymentsCount: payments?.length || 0,
        expensesCount: operationalExpenses?.length || 0,
      });

      // Filter by date range
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      const filteredPayments = payments.filter((p: any) => {
        const pDate = new Date(p.date || p.createdAt);
        return pDate >= startDateObj && pDate <= endDateObj;
      });

      const filteredExpenses = operationalExpenses.filter((e: any) => {
        const eDate = new Date(e.date || e.createdAt);
        return eDate >= startDateObj && eDate <= endDateObj;
      });

      // Calculate cash inflows (from customer payments)
      const cashInflows = filteredPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

      // Calculate cash outflows (operational expenses)
      const cashOutflows = filteredExpenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

      // Calculate net cash flow
      const netCashFlow = cashInflows - cashOutflows;

      // Build report data
      const cashFlowData = [
        {
          'Keterangan': 'ARUS KAS MASUK (CASH INFLOWS)',
          'Jumlah': cashInflows,
          '_isHeader': true,
        },
        {
          'Keterangan': 'Penerimaan dari Pelanggan',
          'Jumlah': cashInflows,
        },
        {
          'Keterangan': 'TOTAL ARUS KAS MASUK',
          'Jumlah': cashInflows,
          '_isTotal': true,
        },
        {
          'Keterangan': '',
          'Jumlah': '',
          '_isBlank': true,
        },
        {
          'Keterangan': 'ARUS KAS KELUAR (CASH OUTFLOWS)',
          'Jumlah': cashOutflows,
          '_isHeader': true,
        },
        {
          'Keterangan': 'Pembayaran Beban Operasional',
          'Jumlah': cashOutflows,
        },
        {
          'Keterangan': 'TOTAL ARUS KAS KELUAR',
          'Jumlah': cashOutflows,
          '_isTotal': true,
        },
        {
          'Keterangan': '',
          'Jumlah': '',
          '_isBlank': true,
        },
        {
          'Keterangan': 'ARUS KAS BERSIH (NET CASH FLOW)',
          'Jumlah': netCashFlow,
          '_isGrandTotal': true,
        },
      ];

      // Generate template
      const template = reportTemplateEngine.cashFlowReport(cashFlowData);

      // Export
      const filename = excelFormatter.generateFilename('Laporan_Arus_Kas_Cash_Flow');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Cash flow report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating cash flow report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * ACCOUNTING - General Ledger Report
   */
  async generateGeneralLedgerReport(startDate: string, endDate: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating general ledger report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Server configuration required for this report');
        return;
      }

      // Fetch journal entries from Packaging
      const journalRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.JOURNAL_ENTRIES);
      const journalData = extractStorageValue(journalRaw);

      if (!journalData || journalData.length === 0) {
        toast.error('Tidak ada data jurnal. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Filter by date
      const filtered = journalData.filter(j => {
        const jDate = j.date || j.created;
        return jDate >= startDate && jDate <= endDate;
      });

      // Generate template
      const template = reportTemplateEngine.generalLedgerReport(filtered, startDate, endDate);

      // Export
      const filename = excelFormatter.generateFilename('Buku_Besar', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ General ledger report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating general ledger report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * ACCOUNTING - General Journal Report
   */
  async generateGeneralJournalReport(startDate: string, endDate: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating general journal report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Server configuration required for this report');
        return;
      }

      const journalRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.JOURNAL_ENTRIES);
      const journalData = extractStorageValue(journalRaw);

      if (!journalData || journalData.length === 0) {
        toast.error('Tidak ada data jurnal. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      const filtered = journalData.filter(j => {
        const jDate = j.date || j.created;
        return jDate >= startDate && jDate <= endDate;
      });

      const template = reportTemplateEngine.generalJournalReport(filtered, startDate, endDate);
      const filename = excelFormatter.generateFilename('Jurnal_Umum', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ General journal report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating general journal report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * ACCOUNTING - Sales Journal Report
   */
  async generateSalesJournalReport(startDate: string, endDate: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating sales journal report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Server configuration required for this report');
        return;
      }

      const invoicesRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.INVOICES);
      const invoicesData = extractStorageValue(invoicesRaw);

      if (!invoicesData || invoicesData.length === 0) {
        toast.error('Tidak ada data faktur penjualan. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      const filtered = invoicesData.filter(inv => {
        const invDate = inv.created || inv.date;
        return invDate >= startDate && invDate <= endDate;
      });

      if (filtered.length === 0) {
        toast.warning('Tidak ada data faktur dalam periode yang dipilih.');
        return;
      }

      const template = reportTemplateEngine.salesJournalReport(filtered, startDate, endDate);
      const filename = excelFormatter.generateFilename('Jurnal_Penjualan', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Sales journal report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating sales journal report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * ACCOUNTING - Purchase Journal Report
   */
  async generatePurchaseJournalReport(startDate: string, endDate: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating purchase journal report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Server configuration required for this report');
        return;
      }

      const grnRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.GRN);
      const grnData = extractStorageValue(grnRaw);

      if (!grnData || grnData.length === 0) {
        toast.error('Tidak ada data penerimaan barang. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      const filtered = grnData.filter(grn => {
        const grnDate = grn.created || grn.date;
        return grnDate >= startDate && grnDate <= endDate;
      });

      if (filtered.length === 0) {
        toast.warning('Tidak ada data penerimaan barang dalam periode yang dipilih.');
        return;
      }

      const template = reportTemplateEngine.purchaseJournalReport(filtered, startDate, endDate);
      const filename = excelFormatter.generateFilename('Jurnal_Pembelian', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Purchase journal report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating purchase journal report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * ACCOUNTING - Cash In Journal Report
   */
  async generateCashInJournalReport(startDate: string, endDate: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating cash in journal report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Server configuration required for this report');
        return;
      }

      const paymentsRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.PAYMENTS);
      const paymentsData = extractStorageValue(paymentsRaw);

      if (!paymentsData || paymentsData.length === 0) {
        toast.error('Tidak ada data pembayaran masuk. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      const filtered = paymentsData.filter(p => {
        const pDate = p.date || p.created;
        return pDate >= startDate && pDate <= endDate && p.type === 'in';
      });

      const template = reportTemplateEngine.cashInJournalReport(filtered, startDate, endDate);
      const filename = excelFormatter.generateFilename('Jurnal_Kas_Masuk', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Cash in journal report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating cash in journal report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * ACCOUNTING - Cash Out Journal Report
   */
  async generateCashOutJournalReport(startDate: string, endDate: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating cash out journal report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Server configuration required for this report');
        return;
      }

      const paymentsRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.PAYMENTS);
      const paymentsData = extractStorageValue(paymentsRaw);

      if (!paymentsData || paymentsData.length === 0) {
        toast.error('Tidak ada data pembayaran keluar. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      const filtered = paymentsData.filter(p => {
        const pDate = p.date || p.created;
        return pDate >= startDate && pDate <= endDate && p.type === 'out';
      });

      const template = reportTemplateEngine.cashOutJournalReport(filtered, startDate, endDate);
      const filename = excelFormatter.generateFilename('Jurnal_Kas_Keluar', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Cash out journal report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating cash out journal report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * ACCOUNTING - Memorial Journal Report
   */
  async generateMemorialJournalReport(startDate: string, endDate: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating memorial journal report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Server configuration required for this report');
        return;
      }

      const journalRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.JOURNAL_ENTRIES);
      const journalData = extractStorageValue(journalRaw);

      if (!journalData || journalData.length === 0) {
        toast.error('Tidak ada data jurnal memorial. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      const filtered = journalData.filter(j => {
        const jDate = j.date || j.created;
        return jDate >= startDate && jDate <= endDate && j.type === 'memorial';
      });

      const template = reportTemplateEngine.memorialJournalReport(filtered, startDate, endDate);
      const filename = excelFormatter.generateFilename('Jurnal_Memorial', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Memorial journal report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating memorial journal report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * ACCOUNTING - Trial Balance Report
   */
  async generateTrialBalanceReport(startDate: string, endDate: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating trial balance report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Server configuration required for this report');
        return;
      }

      const journalRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.JOURNAL_ENTRIES);
      const accountsRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.ACCOUNTS);
      
      const journalData = extractStorageValue(journalRaw);
      const accountsData = extractStorageValue(accountsRaw);

      if (!journalData || journalData.length === 0) {
        toast.error('Tidak ada data jurnal. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      const filtered = journalData.filter(j => {
        const jDate = j.date || j.created;
        return jDate >= startDate && jDate <= endDate;
      });

      const template = reportTemplateEngine.trialBalanceReport(filtered, accountsData || [], startDate, endDate);
      const filename = excelFormatter.generateFilename('Neraca_Saldo_Trial_Balance', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Trial balance report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating trial balance report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * ACCOUNTING - Bank Statement Report
   */
  async generateBankStatementReport(startDate: string, endDate: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating bank statement report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Server configuration required for this report');
        return;
      }

      const bankTransactionsRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.PAYMENTS);
      const bankTransactionsData = extractStorageValue(bankTransactionsRaw);

      if (!bankTransactionsData || bankTransactionsData.length === 0) {
        toast.error('Tidak ada data transaksi bank. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      const filtered = bankTransactionsData.filter(bt => {
        const btDate = bt.date || bt.created;
        return btDate >= startDate && btDate <= endDate;
      });

      const template = reportTemplateEngine.bankStatementReport(filtered, startDate, endDate);
      const filename = excelFormatter.generateFilename('Rekening_Koran_Bank_Statement', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Bank statement report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating bank statement report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * ACCOUNTING - Chart of Account Report
   */
  async generateChartOfAccountReport(): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating chart of account report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Server configuration required for this report');
        return;
      }

      const coaRaw = await storageService.get<any[]>(StorageKeys.PACKAGING.ACCOUNTS);
      const coaData = extractStorageValue(coaRaw);

      if (!coaData || coaData.length === 0) {
        toast.error('Tidak ada data chart of account. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      const template = reportTemplateEngine.chartOfAccountReport(coaData);
      const filename = excelFormatter.generateFilename('Daftar_Akun_Chart_of_Account');
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Chart of account report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error generating chart of account report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * TAX REPORTS - PPN Masukan (Input Tax)
   */
  async generateTaxPPNMasukanReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating PPN Masukan report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      const taxRecordsRaw = await storageService.get<any[]>('taxRecords');
      const taxRecords = extractStorageValue(taxRecordsRaw);
      
      if (!taxRecords || taxRecords.length === 0) {
        toast.error('Tidak ada data pajak di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Filter PPN Masukan (Input Tax)
      const ppnMasukan = (Array.isArray(taxRecords) ? taxRecords : [])
        .filter((tax: any) => tax.taxType === 'PPN Masukan')
        .filter((tax: any) => {
          if (!startDate || !endDate) return true;
          const taxDate = new Date(tax.taxDate).toISOString().split('T')[0];
          return taxDate >= startDate && taxDate <= endDate;
        });

      const template = reportTemplateEngine.taxPPNMasukanReport(ppnMasukan);
      const filename = excelFormatter.generateFilename('PPN_Masukan', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ PPN Masukan report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * TAX REPORTS - PPN Keluaran (Output Tax)
   */
  async generateTaxPPNKeluaranReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating PPN Keluaran report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      const taxRecordsRaw = await storageService.get<any[]>('taxRecords');
      const taxRecords = extractStorageValue(taxRecordsRaw);
      
      if (!taxRecords || taxRecords.length === 0) {
        toast.error('Tidak ada data pajak di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Filter PPN Keluaran (Output Tax)
      const ppnKeluaran = (Array.isArray(taxRecords) ? taxRecords : [])
        .filter((tax: any) => tax.taxType === 'PPN Keluaran')
        .filter((tax: any) => {
          if (!startDate || !endDate) return true;
          const taxDate = new Date(tax.taxDate).toISOString().split('T')[0];
          return taxDate >= startDate && taxDate <= endDate;
        });

      const template = reportTemplateEngine.taxPPNKeluaranReport(ppnKeluaran);
      const filename = excelFormatter.generateFilename('PPN_Keluaran', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ PPN Keluaran report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * TAX REPORTS - SPT Masa PPN
   */
  async generateTaxSPTMasaPPNReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating SPT Masa PPN report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      const taxRecordsRaw = await storageService.get<any[]>('taxRecords');
      const taxRecords = extractStorageValue(taxRecordsRaw);
      
      if (!taxRecords || taxRecords.length === 0) {
        toast.error('Tidak ada data pajak di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Filter PPN records
      const ppnRecords = (Array.isArray(taxRecords) ? taxRecords : [])
        .filter((tax: any) => tax.taxType === 'PPN Masukan' || tax.taxType === 'PPN Keluaran')
        .filter((tax: any) => {
          if (!startDate || !endDate) return true;
          const taxDate = new Date(tax.taxDate).toISOString().split('T')[0];
          return taxDate >= startDate && taxDate <= endDate;
        });

      // Calculate totals
      const ppnMasukan = ppnRecords.filter((t: any) => t.taxType === 'PPN Masukan');
      const ppnKeluaran = ppnRecords.filter((t: any) => t.taxType === 'PPN Keluaran');
      
      const totalMasukan = ppnMasukan.reduce((sum: number, t: any) => sum + (t.taxAmount || 0), 0);
      const totalKeluaran = ppnKeluaran.reduce((sum: number, t: any) => sum + (t.taxAmount || 0), 0);
      const ppnTerhutang = totalKeluaran - totalMasukan;

      const sptData = {
        ppnMasukan,
        ppnKeluaran,
        totalMasukan,
        totalKeluaran,
        ppnTerhutang,
      };

      const template = reportTemplateEngine.taxSPTMasaPPNReport(sptData);
      const filename = excelFormatter.generateFilename('SPT_Masa_PPN', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ SPT Masa PPN report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * TAX REPORTS - e-Faktur
   */
  async generateTaxEFakturReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating e-Faktur report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      const taxRecordsRaw = await storageService.get<any[]>('taxRecords');
      const taxRecords = extractStorageValue(taxRecordsRaw);
      
      if (!taxRecords || taxRecords.length === 0) {
        toast.error('Tidak ada data pajak di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Filter PPN Keluaran for e-Faktur
      const eFaktur = (Array.isArray(taxRecords) ? taxRecords : [])
        .filter((tax: any) => tax.taxType === 'PPN Keluaran' && tax.referenceType === 'Invoice')
        .filter((tax: any) => {
          if (!startDate || !endDate) return true;
          const taxDate = new Date(tax.taxDate).toISOString().split('T')[0];
          return taxDate >= startDate && taxDate <= endDate;
        });

      const template = reportTemplateEngine.taxEFakturReport(eFaktur);
      const filename = excelFormatter.generateFilename('e-Faktur', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ e-Faktur report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * TAX REPORTS - CSV Faktur Pajak
   */
  async generateTaxCSVFakturReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating CSV Faktur Pajak report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      const taxRecordsRaw = await storageService.get<any[]>('taxRecords');
      const taxRecords = extractStorageValue(taxRecordsRaw);
      
      if (!taxRecords || taxRecords.length === 0) {
        toast.error('Tidak ada data pajak di server. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      // Filter all tax records
      const csvData = (Array.isArray(taxRecords) ? taxRecords : [])
        .filter((tax: any) => {
          if (!startDate || !endDate) return true;
          const taxDate = new Date(tax.taxDate).toISOString().split('T')[0];
          return taxDate >= startDate && taxDate <= endDate;
        });

      const template = reportTemplateEngine.taxCSVFakturReport(csvData);
      const filename = excelFormatter.generateFilename('CSV_Faktur_Pajak', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      console.log('[ReportService] ✅ CSV Faktur Pajak report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * TAX REPORTS - PPh 21 (Withholding Tax on Salaries)
   * Placeholder - requires payroll/salary data
   */
  async generateTaxPPh21Report(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating PPh 21 report...');
      toast.error('Laporan PPh 21 memerlukan data payroll/gaji yang belum terintegrasi. Silakan hubungi administrator.');
      return;
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * TAX REPORTS - PPh 22 (Withholding Tax on Purchases)
   * Placeholder - requires purchase data with PPh 22
   */
  async generateTaxPPh22Report(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating PPh 22 report...');
      toast.error('Laporan PPh 22 memerlukan data pembelian dengan PPh 22 yang belum terintegrasi. Silakan hubungi administrator.');
      return;
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * TAX REPORTS - PPh 23 (Withholding Tax on Services)
   * Placeholder - requires service/invoice data with PPh 23
   */
  async generateTaxPPh23Report(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating PPh 23 report...');
      toast.error('Laporan PPh 23 memerlukan data layanan dengan PPh 23 yang belum terintegrasi. Silakan hubungi administrator.');
      return;
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * TAX REPORTS - PPh 25 (Corporate Income Tax Installment)
   * Placeholder - requires financial data
   */
  async generateTaxPPh25Report(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating PPh 25 report...');
      toast.error('Laporan PPh 25 memerlukan data keuangan yang belum terintegrasi. Silakan hubungi administrator.');
      return;
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * TAX REPORTS - PPh 29 (Corporate Income Tax Annual)
   * Placeholder - requires annual financial data
   */
  async generateTaxPPh29Report(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating PPh 29 report...');
      toast.error('Laporan PPh 29 memerlukan data keuangan tahunan yang belum terintegrasi. Silakan hubungi administrator.');
      return;
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * TAX REPORTS - PPh Final (Final Withholding Tax)
   * Placeholder - requires specific transaction data
   */
  async generateTaxPPhFinalReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating PPh Final report...');
      toast.error('Laporan PPh Final memerlukan data transaksi khusus yang belum terintegrasi. Silakan hubungi administrator.');
      return;
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  // PROFIT & LOSS REPORTS - 8 methods

  /**
   * PROFIT - Laba Rugi Per Item
   */
  async generateProfitPerItemReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating profit per item report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      const data = await reportDataFetcher.getProfitPerItemData(startDate || '', endDate || '');
      const template = reportTemplateEngine.profitPerItemReport(data);
      const filename = excelFormatter.generateFilename('Laba_Rugi_Per_Item', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      
      console.log('[ReportService] ✅ Profit per item report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PROFIT - Laba Rugi Per Pelanggan
   */
  async generateProfitPerCustomerReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating profit per customer report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      const data = await reportDataFetcher.getProfitPerCustomerData(startDate || '', endDate || '');
      const template = reportTemplateEngine.profitPerCustomerReport(data);
      const filename = excelFormatter.generateFilename('Laba_Rugi_Per_Pelanggan', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      
      console.log('[ReportService] ✅ Profit per customer report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PROFIT - Laba Rugi Per Supplier
   */
  async generateProfitPerSupplierReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating profit per supplier report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      const data = await reportDataFetcher.getProfitPerSupplierData(startDate || '', endDate || '');
      const template = reportTemplateEngine.profitPerSupplierReport(data);
      const filename = excelFormatter.generateFilename('Laba_Rugi_Per_Supplier', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      
      console.log('[ReportService] ✅ Profit per supplier report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PROFIT - Laba Rugi Per Sales
   */
  async generateProfitPerSalesReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating profit per sales report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      const data = await reportDataFetcher.getProfitPerSalesData(startDate || '', endDate || '');
      const template = reportTemplateEngine.profitPerSalesReport(data);
      const filename = excelFormatter.generateFilename('Laba_Rugi_Per_Sales', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      
      console.log('[ReportService] ✅ Profit per sales report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PROFIT - Laba Rugi Per Wilayah
   */
  async generateProfitPerRegionReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating profit per region report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      const data = await reportDataFetcher.getProfitPerRegionData(startDate || '', endDate || '');
      const template = reportTemplateEngine.profitPerRegionReport(data);
      const filename = excelFormatter.generateFilename('Laba_Rugi_Per_Wilayah', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      
      console.log('[ReportService] ✅ Profit per region report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PROFIT - Laba Rugi Per Kategori
   */
  async generateProfitPerCategoryReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating profit per category report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      const data = await reportDataFetcher.getProfitPerCategoryData(startDate || '', endDate || '');
      const template = reportTemplateEngine.profitPerCategoryReport(data);
      const filename = excelFormatter.generateFilename('Laba_Rugi_Per_Kategori', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      
      console.log('[ReportService] ✅ Profit per category report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PROFIT - Margin Penjualan
   */
  async generateProfitMarginReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating profit margin report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      const data = await reportDataFetcher.getProfitMarginData(startDate || '', endDate || '');
      const template = reportTemplateEngine.profitMarginReport(data);
      const filename = excelFormatter.generateFilename('Margin_Penjualan', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      
      console.log('[ReportService] ✅ Profit margin report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PROFIT - HPP (Harga Pokok Penjualan)
   */
  async generateProfitCOGSReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating COGS report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      const data = await reportDataFetcher.getProfitCOGSData(startDate || '', endDate || '');
      const template = reportTemplateEngine.profitCOGSReport(data);
      const filename = excelFormatter.generateFilename('HPP_Harga_Pokok_Penjualan', startDate, endDate);
      excelFormatter.exportReport(template, filename);
      
      console.log('[ReportService] ✅ COGS report generated successfully');
      toast.success('Laporan berhasil di-export!');
    } catch (error) {
      console.error('[ReportService] ❌ Error:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * CUSTOM - Packaging Sales Order Export Report
   * Export data penjualan packaging dengan inventory flow dan financial summary
   */
  async generatePackagingSalesOrderExportReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[ReportService] 🔄 Generating packaging sales order export report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        toast.warning('Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch data using report data fetcher
      const data = await reportDataFetcher.getPackagingSalesOrderExportData(startDate || '', endDate || '');

      if (!data || data.length === 0) {
        toast.error('Tidak ada data sales order untuk periode yang dipilih');
        return;
      }

      // Generate template using report template engine
      const template = reportTemplateEngine.packagingSalesOrderExportReport(data, startDate, endDate);

      // Export to Excel
      const filename = excelFormatter.generateFilename('Packaging_Sales_Order_Export', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[ReportService] ✅ Packaging sales order export report generated successfully');
      toast.success(`Laporan berhasil di-export! (${data.length} items)`);
    } catch (error) {
      console.error('[ReportService] ❌ Error generating packaging sales order export report:', error);
      toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },
};

