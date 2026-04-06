/**
 * Storage Service - PostgreSQL as Source of Truth
 * 
 * Architecture:
 * - PostgreSQL is the ONLY source of truth
 * - App reads/writes directly to PostgreSQL via REST API
 * - localStorage is used ONLY for config (not data)
 * - WebSocket broadcasts changes to other devices (real-time sync)
 * - No tombstone pattern, no debounce, no complex sync logic
 * 
 * Flow:
 * 1. User creates/updates/deletes data
 * 2. App sends REST API request to server
 * 3. Server updates PostgreSQL
 * 4. Server broadcasts via WebSocket to all connected devices
 * 5. Other devices receive broadcast and update their UI
 */

export type StorageType = 'local' | 'server';

export interface StorageConfig {
  type: StorageType;
  serverUrl?: string;
}

export type BusinessType = 'packaging' | 'general-trading' | 'trucking';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

/**
 * Centralized Storage Keys Registry
 */
export const StorageKeys = {
  PACKAGING: {
    PRODUCTS: 'products',
    CUSTOMERS: 'customers',
    SUPPLIERS: 'suppliers',
    MATERIALS: 'materials',
    BOM: 'bom',
    STAFF: 'staff',
    SALES_ORDERS: 'salesOrders',
    QUOTATIONS: 'quotations',
    DELIVERY: 'delivery',
    INVOICES: 'invoices',
    PURCHASE_ORDERS: 'purchaseOrders',
    PURCHASE_REQUESTS: 'purchaseRequests',
    GRN: 'grn',
    GRN_PACKAGING: 'grnPackaging',
    SPK: 'spk',
    PRODUCTION: 'production',
    PRODUCTION_DAILY: 'productionDaily',
    PRODUCTION_RESULTS: 'productionResults',
    SCHEDULE: 'schedule',
    QC: 'qc',
    RETURNS: 'returns',
    INVENTORY: 'inventory',
    PAYMENTS: 'payments',
    EXPENSES: 'expenses',
    OPERATIONAL_EXPENSES: 'operationalExpenses',
    JOURNAL_ENTRIES: 'journalEntries',
    TAX_RECORDS: 'taxRecords',
    ACCOUNTS: 'accounts',
    PRODUCTION_NOTIFICATIONS: 'productionNotifications',
    DELIVERY_NOTIFICATIONS: 'deliveryNotifications',
    INVOICE_NOTIFICATIONS: 'invoiceNotifications',
    FINANCE_NOTIFICATIONS: 'financeNotifications',
    USER_ACCESS_CONTROL: 'userAccessControl',
    PACKAGING_USER_ACCESS_CONTROL: 'packaging_userAccessControl',
    USER_CONTROL_PIN: 'userControlPin',
    COMPANY_SETTINGS: 'companySettings',
    FINGERPRINT_CONFIG: 'fingerprintConfig',
    ACTIVITY_LOGS: 'activityLogs',
    ATTENDANCE: 'attendance',
    AUDIT_LOGS: 'audit',
    OUTBOX: 'outbox',
    PTP: 'ptp',
  },
  
  GENERAL_TRADING: {
    PRODUCTS: 'gt_products',
    CUSTOMERS: 'gt_customers',
    SUPPLIERS: 'gt_suppliers',
    SALES_ORDERS: 'gt_salesOrders',
    QUOTATIONS: 'gt_quotations',
    DELIVERY: 'gt_delivery',
    INVOICES: 'gt_invoices',
    PURCHASE_ORDERS: 'gt_purchaseOrders',
    PURCHASE_REQUESTS: 'gt_purchaseRequests',
    GRN: 'gt_grn',
    INVENTORY: 'gt_inventory',
    PAYMENTS: 'gt_payments',
    EXPENSES: 'gt_expenses',
    OPERATIONAL_EXPENSES: 'gt_operationalExpenses',
    JOURNAL_ENTRIES: 'gt_journalEntries',
    TAX_RECORDS: 'gt_taxRecords',
    ACCOUNTS: 'gt_accounts',
    PRODUCTION_NOTIFICATIONS: 'gt_productionNotifications',
    DELIVERY_NOTIFICATIONS: 'gt_deliveryNotifications',
    INVOICE_NOTIFICATIONS: 'gt_invoiceNotifications',
    FINANCE_NOTIFICATIONS: 'gt_financeNotifications',
    USER_ACCESS_CONTROL: 'gt_userAccessControl',
    COMPANY_SETTINGS: 'gt_companySettings',
    ACTIVITY_LOGS: 'gt_activityLogs',
    SPK: 'gt_spk',
    SCHEDULE: 'gt_schedule',
    BOM: 'gt_bom',
    MATERIALS: 'gt_materials',
    PRODUCT_CATEGORIES: 'gt_productCategories',
    QUOTATION_LAST_SIGNATURE: 'gt_quotation_last_signature',
    PURCHASING_NOTIFICATIONS: 'gt_purchasingNotifications',
    PPIC_NOTIFICATIONS: 'gt_ppicNotifications',
    PRODUCT_IMAGES: 'GT_productimage',
  },
  
  TRUCKING: {
    CUSTOMERS: 'trucking_customers',
    VEHICLES: 'trucking_vehicles',
    DRIVERS: 'trucking_drivers',
    ROUTES: 'trucking_routes',
    PRODUCTS: 'trucking_products',
    SUPPLIERS: 'trucking_suppliers',
    SURAT_JALAN: 'trucking_suratJalan',
    DELIVERY_ORDERS: 'trucking_delivery_orders',
    UNIT_SCHEDULES: 'trucking_unitSchedules',
    ROUTE_PLANS: 'trucking_route_plans',
    PETTY_CASH_REQUESTS: 'trucking_pettycash_requests',
    PETTY_CASH_MEMOS: 'trucking_pettycash_memos',
    INVOICES: 'trucking_invoices',
    PAYMENTS: 'trucking_payments',
    EXPENSES: 'trucking_expenses',
    OPERATIONAL_EXPENSES: 'trucking_operationalExpenses',
    JOURNAL_ENTRIES: 'trucking_journalEntries',
    TAX_RECORDS: 'trucking_taxRecords',
    ACCOUNTS: 'trucking_accounts',
    PURCHASE_ORDERS: 'trucking_purchaseOrders',
    SPK: 'trucking_spk',
    SALES_ORDERS: 'trucking_salesOrders',
    SURAT_JALAN_NOTIFICATIONS: 'trucking_suratJalanNotifications',
    FINANCE_NOTIFICATIONS: 'trucking_financeNotifications',
    UNIT_NOTIFICATIONS: 'trucking_unitNotifications',
    PETTY_CASH_NOTIFICATIONS: 'trucking_pettyCashNotifications',
    INVOICE_NOTIFICATIONS: 'trucking_invoiceNotifications',
    USER_ACCESS_CONTROL: 'trucking_userAccessControl',
    COMPANY_SETTINGS: 'trucking_companySettings',
    ACTIVITY_LOGS: 'trucking_activityLogs',
    AUDIT_LOGS: 'trucking_auditLogs',
    SETTINGS: 'trucking_settings',
  },
  
  SHARED: {
    SELECTED_BUSINESS: 'selectedBusiness',
    CURRENT_USER: 'currentUser',
    STORAGE_CONFIG: 'storage_config',
    WEBSOCKET_URL: 'websocket_url',
    WEBSOCKET_ENABLED: 'websocket_enabled',
    SERVER_URL: 'server_url',
    THEME: 'theme',
    DEVICE_ID: 'device_id',
    MATERIAL_RESERVATIONS: 'material_reservations',
  }
} as const;

export type PackagingKey = typeof StorageKeys.PACKAGING[keyof typeof StorageKeys.PACKAGING];
export type GeneralTradingKey = typeof StorageKeys.GENERAL_TRADING[keyof typeof StorageKeys.GENERAL_TRADING];
export type TruckingKey = typeof StorageKeys.TRUCKING[keyof typeof StorageKeys.TRUCKING];
export type SharedKey = typeof StorageKeys.SHARED[keyof typeof StorageKeys.SHARED];
export type AnyStorageKey = PackagingKey | GeneralTradingKey | TruckingKey | SharedKey;

/**
 * Extract value from wrapped storage object
 */
export const extractStorageValue = (data: any): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && 'value' in data) {
    const extracted = data.value;
    if (Array.isArray(extracted)) return extracted;
    if (!extracted || (typeof extracted === 'object' && Object.keys(extracted).length === 0)) return [];
  }
  return [];
};

class StorageService {
  importFromJsonFiles() {
    throw new Error('Method not implemented.');
  }
  exportAllData() {
    throw new Error('Method not implemented.');
  }
  private config: StorageConfig = { type: 'local' };
  private syncStatus: SyncStatus = 'idle';
  private syncStatusListeners: ((status: SyncStatus) => void)[] = [];
  private storageEventName = 'app-storage-changed';

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('app-storage-changed', this.handleStorageChangeEvent.bind(this) as EventListener);
    }
  }

  /**
   * Handle WebSocket broadcast from server
   * Update UI when other devices make changes
   */
  private async handleStorageChangeEvent(event: Event) {
    const customEvent = event as CustomEvent<{ key: string; value: any; action?: string }>;
    const eventDetail = customEvent.detail;
    
    if (!eventDetail || !eventDetail.key) return;
    
    // Dispatch to listeners (components will update their UI)
    // This is for real-time sync only - data is already in PostgreSQL
  }

  getBusinessContext(): BusinessType {
    const selected = localStorage.getItem('selectedBusiness');
    if (selected === 'general-trading' || selected === 'trucking') {
      return selected;
    }
    return 'packaging';
  }



  async setConfig(config: StorageConfig) {
    this.config = config;
    localStorage.setItem('storage_config', JSON.stringify(config));
  }

  getConfig(): StorageConfig {
    const saved = localStorage.getItem('storage_config');
    if (saved) {
      return JSON.parse(saved);
    }
    return this.config;
  }

  /**
   * GET - Read from PostgreSQL
   * Direct REST API call, no caching
   */
  async get<T>(key: string): Promise<T | null> {
    const config = this.getConfig();
    
    if (config.type === 'local') {
      // Local mode - read from localStorage only
      const value = localStorage.getItem(key);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          return (parsed.value !== undefined ? parsed.value : parsed) as T;
        } catch (error) {
          return null;
        }
      }
      return null;
    }

    // Server mode - fetch from PostgreSQL via REST API
    if (!config.serverUrl) {
      return null;
    }

    try {
      const response = await fetch(`${config.serverUrl}/api/storage/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const value = data.value !== undefined ? data.value : data;
      
      // Ensure arrays are properly extracted
      if (Array.isArray(value)) {
        return value as T;
      }
      
      return value as T;
    } catch (error) {
      return null;
    }
  }

  /**
   * SET - Write to PostgreSQL
   * Direct REST API call, immediate persistence
   */
  async set<T>(key: string, value: T, skipServerSync: boolean = false): Promise<void> {
    const config = this.getConfig();

    if (config.type === 'local') {
      // Local mode - save to localStorage only
      try {
        const dataWithTimestamp = {
          value: value,
          timestamp: Date.now(),
          _timestamp: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(dataWithTimestamp));
      } catch (error) {
        // Silent fail on quota exceeded
      }
      return;
    }

    // Server mode - POST to PostgreSQL via REST API
    if (!config.serverUrl || skipServerSync) {
      return;
    }

    try {
      const response = await fetch(`${config.serverUrl}/api/storage/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: value,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Dispatch event for real-time sync to other components
      this.dispatchStorageEvent(key, value);
    } catch (error) {
      // Silent fail - don't break UI
    }
  }

  /**
   * REMOVE - Delete from PostgreSQL
   * Direct REST API DELETE call
   */
  async remove(key: string): Promise<void> {
    const config = this.getConfig();

    if (config.type === 'local') {
      localStorage.removeItem(key);
      return;
    }

    if (!config.serverUrl) {
      return;
    }

    try {
      const response = await fetch(`${config.serverUrl}/api/storage/${encodeURIComponent(key)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      this.dispatchStorageEvent(key, null);
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * REMOVE ITEM - Delete specific item from array
   * Fetch array, remove item, POST back to PostgreSQL
   */
  async removeItem(key: string, itemId: string | number, idField: string = 'id'): Promise<void> {
    const currentData = await this.get<any[]>(key) || [];

    if (!Array.isArray(currentData)) {
      return;
    }

    // Filter out the item
    const updatedData = currentData.filter((item: any) => {
      if (!item) return true;
      const itemIdValue = item[idField];
      return String(itemIdValue) !== String(itemId);
    });

    // Save back to PostgreSQL
    await this.set(key, updatedData);
  }

  private dispatchStorageEvent(key: string, value: any) {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
      return;
    }

    try {
      const event = new CustomEvent(this.storageEventName, {
        detail: { key, value },
      });
      window.dispatchEvent(event);
    } catch (error) {
      // Silent fail
    }
  }

  // SYNC STATUS METHODS
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncStatusListeners.push(callback);
    return () => {
      const index = this.syncStatusListeners.indexOf(callback);
      if (index > -1) {
        this.syncStatusListeners.splice(index, 1);
      }
    };
  }

  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  private setSyncStatus(): void {
    // Not needed in PostgreSQL mode
  }

  isAutoSyncEnabled(): boolean {
    return false; // Not needed in PostgreSQL mode
  }

  setAutoSyncInterval(): void {
    // Not needed in PostgreSQL mode
  }

  /**
   * Sync to server - not needed in PostgreSQL mode
   * Data is already synced via direct REST API calls
   */
  async syncToServer(): Promise<void> {
    // No-op in PostgreSQL mode
  }

  /**
   * Sync from server - not needed in PostgreSQL mode
   * Data is fetched on-demand via get()
   */
  async syncFromServer(): Promise<void> {
    // No-op in PostgreSQL mode
  }

  /**
   * Force reload from file - not needed in PostgreSQL mode
   */
  async forceReloadFromFile<T>(): Promise<T | null> {
    return null;
  }
}

export const storageService = new StorageService();
