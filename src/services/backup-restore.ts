import { storageService, StorageKeys } from './storage';

export interface BackupData {
  timestamp: string;
  businessUnit: 'packaging' | 'general-trading' | 'trucking';
  data: Record<string, any>;
  version: string;
}

export const backupRestoreService = {
  /**
   * Backup semua data untuk satu business unit
   */
  async backupBusinessUnit(businessUnit: 'packaging' | 'general-trading' | 'trucking'): Promise<BackupData> {
    try {
      const keys = this.getBusinessUnitKeys(businessUnit);
      const data: Record<string, any> = {};

      // Collect all data for this business unit
      for (const [keyName, storageKey] of Object.entries(keys)) {
        try {
          const value = await storageService.get(storageKey);
          if (value) {
            data[keyName] = value;
          }
        } catch (error) {
          console.warn(`[Backup] Error reading ${keyName}:`, error);
        }
      }

      const backup: BackupData = {
        timestamp: new Date().toISOString(),
        businessUnit,
        data,
        version: '1.0',
      };

      return backup;
    } catch (error) {
      console.error(`[Backup] Error backing up ${businessUnit}:`, error);
      throw error;
    }
  },

  /**
   * Download backup sebagai JSON file
   */
  downloadBackup(backup: BackupData): void {
    try {
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `backup-${backup.businessUnit}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('[Backup] Error downloading backup:', error);
      throw error;
    }
  },

  /**
   * Restore data dari backup file
   */
  async restoreFromBackup(backup: BackupData): Promise<void> {
    try {
      const keys = this.getBusinessUnitKeys(backup.businessUnit);

      // Restore each data item
      for (const [keyName, storageKey] of Object.entries(keys)) {
        if (backup.data[keyName]) {
          await storageService.set(storageKey, backup.data[keyName]);
          console.log(`[Restore] Restored ${keyName} for ${backup.businessUnit}`);
        }
      }

      console.log(`[Restore] Successfully restored ${backup.businessUnit} data`);
    } catch (error) {
      console.error('[Restore] Error restoring backup:', error);
      throw error;
    }
  },

  /**
   * Get all storage keys untuk satu business unit
   */
  getBusinessUnitKeys(businessUnit: 'packaging' | 'general-trading' | 'trucking'): Record<string, string> {
    if (businessUnit === 'packaging') {
      // SEMUA key dari PACKAGING
      return {
        products: StorageKeys.PACKAGING.PRODUCTS,
        customers: StorageKeys.PACKAGING.CUSTOMERS,
        suppliers: StorageKeys.PACKAGING.SUPPLIERS,
        materials: StorageKeys.PACKAGING.MATERIALS,
        bom: StorageKeys.PACKAGING.BOM,
        staff: StorageKeys.PACKAGING.STAFF,
        salesOrders: StorageKeys.PACKAGING.SALES_ORDERS,
        quotations: StorageKeys.PACKAGING.QUOTATIONS,
        delivery: StorageKeys.PACKAGING.DELIVERY,
        invoices: StorageKeys.PACKAGING.INVOICES,
        purchaseOrders: StorageKeys.PACKAGING.PURCHASE_ORDERS,
        purchaseRequests: StorageKeys.PACKAGING.PURCHASE_REQUESTS,
        grn: StorageKeys.PACKAGING.GRN,
        grnPackaging: StorageKeys.PACKAGING.GRN_PACKAGING,
        spk: StorageKeys.PACKAGING.SPK,
        production: StorageKeys.PACKAGING.PRODUCTION,
        productionDaily: StorageKeys.PACKAGING.PRODUCTION_DAILY,
        productionResults: StorageKeys.PACKAGING.PRODUCTION_RESULTS,
        schedule: StorageKeys.PACKAGING.SCHEDULE,
        qc: StorageKeys.PACKAGING.QC,
        returns: StorageKeys.PACKAGING.RETURNS,
        inventory: StorageKeys.PACKAGING.INVENTORY,
        payments: StorageKeys.PACKAGING.PAYMENTS,
        expenses: StorageKeys.PACKAGING.EXPENSES,
        operationalExpenses: StorageKeys.PACKAGING.OPERATIONAL_EXPENSES,
        journalEntries: StorageKeys.PACKAGING.JOURNAL_ENTRIES,
        taxRecords: StorageKeys.PACKAGING.TAX_RECORDS,
        accounts: StorageKeys.PACKAGING.ACCOUNTS,
        productionNotifications: StorageKeys.PACKAGING.PRODUCTION_NOTIFICATIONS,
        deliveryNotifications: StorageKeys.PACKAGING.DELIVERY_NOTIFICATIONS,
        invoiceNotifications: StorageKeys.PACKAGING.INVOICE_NOTIFICATIONS,
        financeNotifications: StorageKeys.PACKAGING.FINANCE_NOTIFICATIONS,
        userAccessControl: StorageKeys.PACKAGING.USER_ACCESS_CONTROL,
        packagingUserAccessControl: StorageKeys.PACKAGING.PACKAGING_USER_ACCESS_CONTROL,
        userControlPin: StorageKeys.PACKAGING.USER_CONTROL_PIN,
        companySettings: StorageKeys.PACKAGING.COMPANY_SETTINGS,
        fingerprintConfig: StorageKeys.PACKAGING.FINGERPRINT_CONFIG,
        activityLogs: StorageKeys.PACKAGING.ACTIVITY_LOGS,
        attendance: StorageKeys.PACKAGING.ATTENDANCE,
        auditLogs: StorageKeys.PACKAGING.AUDIT_LOGS,
        outbox: StorageKeys.PACKAGING.OUTBOX,
        ptp: StorageKeys.PACKAGING.PTP,
      };
    } else if (businessUnit === 'general-trading') {
      // SEMUA key dari GENERAL_TRADING
      return {
        products: StorageKeys.GENERAL_TRADING.PRODUCTS,
        customers: StorageKeys.GENERAL_TRADING.CUSTOMERS,
        suppliers: StorageKeys.GENERAL_TRADING.SUPPLIERS,
        salesOrders: StorageKeys.GENERAL_TRADING.SALES_ORDERS,
        quotations: StorageKeys.GENERAL_TRADING.QUOTATIONS,
        delivery: StorageKeys.GENERAL_TRADING.DELIVERY,
        invoices: StorageKeys.GENERAL_TRADING.INVOICES,
        purchaseOrders: StorageKeys.GENERAL_TRADING.PURCHASE_ORDERS,
        purchaseRequests: StorageKeys.GENERAL_TRADING.PURCHASE_REQUESTS,
        grn: StorageKeys.GENERAL_TRADING.GRN,
        inventory: StorageKeys.GENERAL_TRADING.INVENTORY,
        payments: StorageKeys.GENERAL_TRADING.PAYMENTS,
        expenses: StorageKeys.GENERAL_TRADING.EXPENSES,
        operationalExpenses: StorageKeys.GENERAL_TRADING.OPERATIONAL_EXPENSES,
        journalEntries: StorageKeys.GENERAL_TRADING.JOURNAL_ENTRIES,
        taxRecords: StorageKeys.GENERAL_TRADING.TAX_RECORDS,
        accounts: StorageKeys.GENERAL_TRADING.ACCOUNTS,
        productionNotifications: StorageKeys.GENERAL_TRADING.PRODUCTION_NOTIFICATIONS,
        deliveryNotifications: StorageKeys.GENERAL_TRADING.DELIVERY_NOTIFICATIONS,
        invoiceNotifications: StorageKeys.GENERAL_TRADING.INVOICE_NOTIFICATIONS,
        financeNotifications: StorageKeys.GENERAL_TRADING.FINANCE_NOTIFICATIONS,
        userAccessControl: StorageKeys.GENERAL_TRADING.USER_ACCESS_CONTROL,
        companySettings: StorageKeys.GENERAL_TRADING.COMPANY_SETTINGS,
        activityLogs: StorageKeys.GENERAL_TRADING.ACTIVITY_LOGS,
        spk: StorageKeys.GENERAL_TRADING.SPK,
        schedule: StorageKeys.GENERAL_TRADING.SCHEDULE,
        bom: StorageKeys.GENERAL_TRADING.BOM,
        materials: StorageKeys.GENERAL_TRADING.MATERIALS,
        productCategories: StorageKeys.GENERAL_TRADING.PRODUCT_CATEGORIES,
        quotationLastSignature: StorageKeys.GENERAL_TRADING.QUOTATION_LAST_SIGNATURE,
        purchasingNotifications: StorageKeys.GENERAL_TRADING.PURCHASING_NOTIFICATIONS,
        ppicNotifications: StorageKeys.GENERAL_TRADING.PPIC_NOTIFICATIONS,
        productImages: StorageKeys.GENERAL_TRADING.PRODUCT_IMAGES,
      };
    } else {
      // SEMUA key dari TRUCKING
      return {
        customers: StorageKeys.TRUCKING.CUSTOMERS,
        vehicles: StorageKeys.TRUCKING.VEHICLES,
        drivers: StorageKeys.TRUCKING.DRIVERS,
        routes: StorageKeys.TRUCKING.ROUTES,
        products: StorageKeys.TRUCKING.PRODUCTS,
        suppliers: StorageKeys.TRUCKING.SUPPLIERS,
        suratJalan: StorageKeys.TRUCKING.SURAT_JALAN,
        deliveryOrders: StorageKeys.TRUCKING.DELIVERY_ORDERS,
        unitSchedules: StorageKeys.TRUCKING.UNIT_SCHEDULES,
        routePlans: StorageKeys.TRUCKING.ROUTE_PLANS,
        pettyCashRequests: StorageKeys.TRUCKING.PETTY_CASH_REQUESTS,
        pettyCashMemos: StorageKeys.TRUCKING.PETTY_CASH_MEMOS,
        invoices: StorageKeys.TRUCKING.INVOICES,
        payments: StorageKeys.TRUCKING.PAYMENTS,
        expenses: StorageKeys.TRUCKING.EXPENSES,
        operationalExpenses: StorageKeys.TRUCKING.OPERATIONAL_EXPENSES,
        journalEntries: StorageKeys.TRUCKING.JOURNAL_ENTRIES,
        taxRecords: StorageKeys.TRUCKING.TAX_RECORDS,
        accounts: StorageKeys.TRUCKING.ACCOUNTS,
        purchaseOrders: StorageKeys.TRUCKING.PURCHASE_ORDERS,
        spk: StorageKeys.TRUCKING.SPK,
        salesOrders: StorageKeys.TRUCKING.SALES_ORDERS,
        suratJalanNotifications: StorageKeys.TRUCKING.SURAT_JALAN_NOTIFICATIONS,
        financeNotifications: StorageKeys.TRUCKING.FINANCE_NOTIFICATIONS,
        unitNotifications: StorageKeys.TRUCKING.UNIT_NOTIFICATIONS,
        pettyCashNotifications: StorageKeys.TRUCKING.PETTY_CASH_NOTIFICATIONS,
        invoiceNotifications: StorageKeys.TRUCKING.INVOICE_NOTIFICATIONS,
        userAccessControl: StorageKeys.TRUCKING.USER_ACCESS_CONTROL,
        companySettings: StorageKeys.TRUCKING.COMPANY_SETTINGS,
        activityLogs: StorageKeys.TRUCKING.ACTIVITY_LOGS,
        auditLogs: StorageKeys.TRUCKING.AUDIT_LOGS,
        settings: StorageKeys.TRUCKING.SETTINGS,
      };
    }
  },

  /**
   * Parse backup file dari input
   */
  async parseBackupFile(file: File): Promise<BackupData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const backup = JSON.parse(content) as BackupData;
          
          // Validate backup structure
          if (!backup.timestamp || !backup.businessUnit || !backup.data) {
            throw new Error('Invalid backup file format');
          }
          
          resolve(backup);
        } catch (error) {
          reject(new Error(`Failed to parse backup file: ${error instanceof Error ? error.message : 'Unknown error'}`));
        }
      };
      reader.onerror = () => {
        reject(new Error('Failed to read backup file'));
      };
      reader.readAsText(file);
    });
  },

  /**
   * Get summary dari backup
   */
  getBackupSummary(backup: BackupData): Record<string, number> {
    const summary: Record<string, number> = {};
    
    for (const [key, value] of Object.entries(backup.data)) {
      if (Array.isArray(value)) {
        summary[key] = value.length;
      } else if (typeof value === 'object' && value !== null) {
        summary[key] = Object.keys(value).length;
      } else {
        summary[key] = 1;
      }
    }
    
    return summary;
  },
};
