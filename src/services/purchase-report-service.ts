/**
 * Purchase Report Service Functions
 * 10 purchase-related report generation functions
 * 
 * CRITICAL: Always fetch from PostgreSQL server, NOT localStorage
 * Use direct storage keys like 'purchaseOrders', 'returns', 'grnPackaging'
 * These keys are mapped to PostgreSQL tables via REST API
 */

import { storageService, extractStorageValue } from './storage';
import { purchaseReportTemplates } from './purchase-report-templates';
import { excelFormatter } from '@/utils/excel-formatter';

export const purchaseReportService = {
  /**
   * PURCHASE - Purchase Orders Report
   */
  async generatePurchaseOrdersReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[PurchaseReportService] 🔄 Generating purchase orders report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        alert('⚠️ Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch from PostgreSQL server using direct key (not StorageKeys constant)
      const poRaw = await storageService.get<any[]>('purchaseOrders');
      const poData = extractStorageValue(poRaw);

      if (!poData || poData.length === 0) {
        alert('❌ Tidak ada data purchase order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      let filtered = poData;
      if (startDate && endDate) {
        filtered = poData.filter(po => {
          const poDate = po.created || po.date;
          return poDate >= startDate && poDate <= endDate;
        });
      }

      const template = purchaseReportTemplates.purchaseOrdersReport(filtered, startDate, endDate);
      const filename = excelFormatter.generateFilename('Laporan_Pesanan_Pembelian', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[PurchaseReportService] ✅ Purchase orders report generated successfully');
      alert('✅ Laporan berhasil di-export!');
    } catch (error) {
      console.error('[PurchaseReportService] ❌ Error:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PURCHASE - Purchase Orders Per Item Report
   */
  async generatePurchaseOrdersPerItemReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[PurchaseReportService] 🔄 Generating purchase orders per item report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        alert('⚠️ Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch from PostgreSQL server using direct key
      const poRaw = await storageService.get<any[]>('purchaseOrders');
      const poData = extractStorageValue(poRaw);

      if (!poData || poData.length === 0) {
        alert('❌ Tidak ada data purchase order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      let filtered = poData;
      if (startDate && endDate) {
        filtered = poData.filter(po => {
          const poDate = po.created || po.date;
          return poDate >= startDate && poDate <= endDate;
        });
      }

      const template = purchaseReportTemplates.purchaseOrdersPerItemReport(filtered, startDate, endDate);
      const filename = excelFormatter.generateFilename('Laporan_Pesanan_Pembelian_Per_Item', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[PurchaseReportService] ✅ Purchase orders per item report generated successfully');
      alert('✅ Laporan berhasil di-export!');
    } catch (error) {
      console.error('[PurchaseReportService] ❌ Error:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PURCHASE - Purchase Return Report
   */
  async generatePurchaseReturnReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[PurchaseReportService] 🔄 Generating purchase return report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        alert('⚠️ Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch from PostgreSQL server using direct key
      const returnsRaw = await storageService.get<any[]>('returns');
      const returnsData = extractStorageValue(returnsRaw);

      if (!returnsData || returnsData.length === 0) {
        alert('❌ Tidak ada data retur pembelian. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      let filtered = returnsData;
      if (startDate && endDate) {
        filtered = returnsData.filter(ret => {
          const retDate = ret.created || ret.date;
          return retDate >= startDate && retDate <= endDate;
        });
      }

      const template = purchaseReportTemplates.purchaseReturnReport(filtered, startDate, endDate);
      const filename = excelFormatter.generateFilename('Laporan_Retur_Pembelian', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[PurchaseReportService] ✅ Purchase return report generated successfully');
      alert('✅ Laporan berhasil di-export!');
    } catch (error) {
      console.error('[PurchaseReportService] ❌ Error:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PURCHASE - Purchase Per Supplier Report
   */
  async generatePurchasePerSupplierReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[PurchaseReportService] 🔄 Generating purchase per supplier report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        alert('⚠️ Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch from PostgreSQL server using direct key
      const poRaw = await storageService.get<any[]>('purchaseOrders');
      const poData = extractStorageValue(poRaw);

      if (!poData || poData.length === 0) {
        alert('❌ Tidak ada data purchase order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      const template = purchaseReportTemplates.purchasePerSupplierReport(poData, startDate, endDate);
      const filename = excelFormatter.generateFilename('Laporan_Pembelian_Per_Supplier', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[PurchaseReportService] ✅ Purchase per supplier report generated successfully');
      alert('✅ Laporan berhasil di-export!');
    } catch (error) {
      console.error('[PurchaseReportService] ❌ Error:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PURCHASE - Purchase Per Item Per Supplier Report
   */
  async generatePurchasePerItemSupplierReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[PurchaseReportService] 🔄 Generating purchase per item per supplier report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        alert('⚠️ Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch from PostgreSQL server using direct key
      const poRaw = await storageService.get<any[]>('purchaseOrders');
      const poData = extractStorageValue(poRaw);

      if (!poData || poData.length === 0) {
        alert('❌ Tidak ada data purchase order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      const template = purchaseReportTemplates.purchasePerItemSupplierReport(poData, startDate, endDate);
      const filename = excelFormatter.generateFilename('Laporan_Pembelian_Per_Item_Per_Supplier', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[PurchaseReportService] ✅ Purchase per item per supplier report generated successfully');
      alert('✅ Laporan berhasil di-export!');
    } catch (error) {
      console.error('[PurchaseReportService] ❌ Error:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PURCHASE - Purchase Chart Top Items Report
   */
  async generatePurchaseChartTopItemsReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[PurchaseReportService] 🔄 Generating purchase chart top items report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        alert('⚠️ Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch from PostgreSQL server using direct key
      const poRaw = await storageService.get<any[]>('purchaseOrders');
      const poData = extractStorageValue(poRaw);

      if (!poData || poData.length === 0) {
        alert('❌ Tidak ada data purchase order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      const template = purchaseReportTemplates.purchaseChartTopItemsReport(poData, startDate, endDate);
      const filename = excelFormatter.generateFilename('Grafik_Pembelian_Item_Terbesar', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[PurchaseReportService] ✅ Purchase chart top items report generated successfully');
      alert('✅ Laporan berhasil di-export!');
    } catch (error) {
      console.error('[PurchaseReportService] ❌ Error:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PURCHASE - Purchase Chart Daily Report
   */
  async generatePurchaseChartDailyReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[PurchaseReportService] 🔄 Generating purchase chart daily report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        alert('⚠️ Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch from PostgreSQL server using direct key
      const poRaw = await storageService.get<any[]>('purchaseOrders');
      const poData = extractStorageValue(poRaw);

      if (!poData || poData.length === 0) {
        alert('❌ Tidak ada data purchase order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      const template = purchaseReportTemplates.purchaseChartDailyReport(poData, startDate, endDate);
      const filename = excelFormatter.generateFilename('Grafik_Pembelian_Harian', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[PurchaseReportService] ✅ Purchase chart daily report generated successfully');
      alert('✅ Laporan berhasil di-export!');
    } catch (error) {
      console.error('[PurchaseReportService] ❌ Error:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PURCHASE - Purchase Chart Monthly Report
   */
  async generatePurchaseChartMonthlyReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[PurchaseReportService] 🔄 Generating purchase chart monthly report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        alert('⚠️ Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch from PostgreSQL server using direct key
      const poRaw = await storageService.get<any[]>('purchaseOrders');
      const poData = extractStorageValue(poRaw);

      if (!poData || poData.length === 0) {
        alert('❌ Tidak ada data purchase order. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      const template = purchaseReportTemplates.purchaseChartMonthlyReport(poData, startDate, endDate);
      const filename = excelFormatter.generateFilename('Grafik_Pembelian_Bulanan', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[PurchaseReportService] ✅ Purchase chart monthly report generated successfully');
      alert('✅ Laporan berhasil di-export!');
    } catch (error) {
      console.error('[PurchaseReportService] ❌ Error:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PURCHASE - Purchase Tax Invoice CSV Report
   */
  async generatePurchaseTaxInvoiceCSVReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[PurchaseReportService] 🔄 Generating purchase tax invoice CSV report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        alert('⚠️ Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch from PostgreSQL server using direct key
      const grnRaw = await storageService.get<any[]>('grnPackaging');
      const grnData = extractStorageValue(grnRaw);

      if (!grnData || grnData.length === 0) {
        alert('❌ Tidak ada data GRN. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      const template = purchaseReportTemplates.purchaseTaxInvoiceCSVReport(grnData, startDate, endDate);
      const filename = excelFormatter.generateFilename('Faktur_Pajak_Masukan_CSV', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[PurchaseReportService] ✅ Purchase tax invoice CSV report generated successfully');
      alert('✅ Laporan berhasil di-export!');
    } catch (error) {
      console.error('[PurchaseReportService] ❌ Error:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },

  /**
   * PURCHASE - Purchase Return Per Item Report
   */
  async generatePurchaseReturnPerItemReport(startDate?: string, endDate?: string): Promise<void> {
    try {
      console.log('[PurchaseReportService] 🔄 Generating purchase return per item report...');
      
      const config = storageService.getConfig();
      if (config.type !== 'server' || !config.serverUrl) {
        alert('⚠️ Report harus menggunakan server mode. Pastikan server URL sudah dikonfigurasi di Settings → Server Data');
        return;
      }

      // Fetch from PostgreSQL server using direct key
      const returnsRaw = await storageService.get<any[]>('returns');
      const returnsData = extractStorageValue(returnsRaw);

      if (!returnsData || returnsData.length === 0) {
        alert('❌ Tidak ada data retur pembelian. Pastikan data sudah diimport ke PostgreSQL.');
        return;
      }

      let filtered = returnsData;
      if (startDate && endDate) {
        filtered = returnsData.filter(ret => {
          const retDate = ret.created || ret.date;
          return retDate >= startDate && retDate <= endDate;
        });
      }

      const template = purchaseReportTemplates.purchaseReturnPerItemReport(filtered, startDate, endDate);
      const filename = excelFormatter.generateFilename('Laporan_Retur_Beli_Per_Item', startDate, endDate);
      excelFormatter.exportReport(template, filename);

      console.log('[PurchaseReportService] ✅ Purchase return per item report generated successfully');
      alert('✅ Laporan berhasil di-export!');
    } catch (error) {
      console.error('[PurchaseReportService] ❌ Error:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  },
};
