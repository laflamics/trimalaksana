/**
 * Storage Keys Test
 * Verify all keys are properly defined
 */

import { StorageKeys } from './storage';

describe('StorageKeys', () => {
  describe('PACKAGING Module', () => {
    it('should have all master data keys', () => {
      expect(StorageKeys.PACKAGING.PRODUCTS).toBe('products');
      expect(StorageKeys.PACKAGING.CUSTOMERS).toBe('customers');
      expect(StorageKeys.PACKAGING.SUPPLIERS).toBe('suppliers');
      expect(StorageKeys.PACKAGING.MATERIALS).toBe('materials');
      expect(StorageKeys.PACKAGING.BOM).toBe('bom');
      expect(StorageKeys.PACKAGING.STAFF).toBe('staff');
    });

    it('should have all operational keys', () => {
      expect(StorageKeys.PACKAGING.SALES_ORDERS).toBe('salesOrders');
      expect(StorageKeys.PACKAGING.QUOTATIONS).toBe('quotations');
      expect(StorageKeys.PACKAGING.DELIVERY).toBe('delivery');
      expect(StorageKeys.PACKAGING.INVOICES).toBe('invoices');
      expect(StorageKeys.PACKAGING.PURCHASE_ORDERS).toBe('purchaseOrders');
      expect(StorageKeys.PACKAGING.PURCHASE_REQUESTS).toBe('purchaseRequests');
      expect(StorageKeys.PACKAGING.GRN).toBe('grn');
      expect(StorageKeys.PACKAGING.GRN_PACKAGING).toBe('grnPackaging');
      expect(StorageKeys.PACKAGING.SPK).toBe('spk');
      expect(StorageKeys.PACKAGING.PRODUCTION).toBe('production');
      expect(StorageKeys.PACKAGING.SCHEDULE).toBe('schedule');
      expect(StorageKeys.PACKAGING.QC).toBe('qc');
      expect(StorageKeys.PACKAGING.RETURNS).toBe('returns');
    });

    it('should have inventory key', () => {
      expect(StorageKeys.PACKAGING.INVENTORY).toBe('inventory');
    });

    it('should have all finance keys', () => {
      expect(StorageKeys.PACKAGING.PAYMENTS).toBe('payments');
      expect(StorageKeys.PACKAGING.EXPENSES).toBe('expenses');
      expect(StorageKeys.PACKAGING.OPERATIONAL_EXPENSES).toBe('operationalExpenses');
      expect(StorageKeys.PACKAGING.JOURNAL_ENTRIES).toBe('journalEntries');
      expect(StorageKeys.PACKAGING.TAX_RECORDS).toBe('taxRecords');
      expect(StorageKeys.PACKAGING.ACCOUNTS).toBe('accounts');
    });

    it('should have all notification keys', () => {
      expect(StorageKeys.PACKAGING.PRODUCTION_NOTIFICATIONS).toBe('productionNotifications');
      expect(StorageKeys.PACKAGING.DELIVERY_NOTIFICATIONS).toBe('deliveryNotifications');
      expect(StorageKeys.PACKAGING.INVOICE_NOTIFICATIONS).toBe('invoiceNotifications');
      expect(StorageKeys.PACKAGING.FINANCE_NOTIFICATIONS).toBe('financeNotifications');
    });

    it('should have all settings keys', () => {
      expect(StorageKeys.PACKAGING.USER_ACCESS_CONTROL).toBe('userAccessControl');
      expect(StorageKeys.PACKAGING.COMPANY_SETTINGS).toBe('companySettings');
      expect(StorageKeys.PACKAGING.ACTIVITY_LOGS).toBe('activityLogs');
    });
  });

  describe('GENERAL_TRADING Module', () => {
    it('should have all keys with gt_ prefix', () => {
      expect(StorageKeys.GENERAL_TRADING.PRODUCTS).toBe('gt_products');
      expect(StorageKeys.GENERAL_TRADING.CUSTOMERS).toBe('gt_customers');
      expect(StorageKeys.GENERAL_TRADING.SALES_ORDERS).toBe('gt_salesOrders');
      expect(StorageKeys.GENERAL_TRADING.INVOICES).toBe('gt_invoices');
    });
  });

  describe('TRUCKING Module', () => {
    it('should have all keys with trucking_ prefix', () => {
      expect(StorageKeys.TRUCKING.CUSTOMERS).toBe('trucking_customers');
      expect(StorageKeys.TRUCKING.VEHICLES).toBe('trucking_vehicles');
      expect(StorageKeys.TRUCKING.SURAT_JALAN).toBe('trucking_suratJalan');
      expect(StorageKeys.TRUCKING.DELIVERY_ORDERS).toBe('trucking_delivery_orders');
    });
  });

  describe('SHARED Keys', () => {
    it('should have all shared keys', () => {
      expect(StorageKeys.SHARED.SELECTED_BUSINESS).toBe('selectedBusiness');
      expect(StorageKeys.SHARED.CURRENT_USER).toBe('currentUser');
      expect(StorageKeys.SHARED.STORAGE_CONFIG).toBe('storage_config');
      expect(StorageKeys.SHARED.THEME).toBe('theme');
    });
  });

  describe('Type Safety', () => {
    it('should be immutable (as const)', () => {
      // This test verifies TypeScript compilation
      // If StorageKeys is not 'as const', this would fail at compile time
      const key: 'products' = StorageKeys.PACKAGING.PRODUCTS;
      expect(key).toBe('products');
    });
  });
});
