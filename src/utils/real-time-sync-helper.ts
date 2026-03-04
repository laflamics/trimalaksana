/**
 * Real-time sync helper untuk listen server updates
 * Digunakan di semua Trucking pages untuk auto-reload data saat ada update dari server
 */

export interface RealTimeSyncConfig {
  keys: string[]; // Storage keys to listen for
  onUpdate: () => void; // Callback saat ada update
}

/**
 * Setup real-time listener untuk storage changes dari server
 * Returns cleanup function
 */
export function setupRealTimeSync(config: RealTimeSyncConfig): () => void {
  const handleStorageChange = (event: Event) => {
    const detail = (event as CustomEvent<{ key?: string; action?: string }>).detail;
    const key = detail?.key;
    
    // Reload data jika ada update untuk salah satu keys yang di-listen
    if (key && config.keys.includes(key)) {
      console.log(`[RealTimeSync] 🔄 Update received for ${key}, reloading...`);
      config.onUpdate();
    }
  };
  
  window.addEventListener('app-storage-changed', handleStorageChange as EventListener);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('app-storage-changed', handleStorageChange as EventListener);
  };
}

/**
 * Common Trucking storage keys untuk di-listen
 */
export const TRUCKING_SYNC_KEYS = {
  // Master data
  VEHICLES: 'trucking_vehicles',
  DRIVERS: 'trucking_drivers',
  ROUTES: 'trucking_routes',
  CUSTOMERS: 'trucking_customers',
  SUPPLIERS: 'trucking_suppliers',
  PRODUCTS: 'trucking_products',
  
  // Operations
  DELIVERY_ORDERS: 'trucking_delivery_orders',
  SURAT_JALAN: 'trucking_suratJalan',
  UNIT_SCHEDULES: 'trucking_unitSchedules',
  ROUTE_PLANS: 'trucking_route_plans',
  SALES_ORDERS: 'trucking_salesOrders',
  
  // Finance
  INVOICES: 'trucking_invoices',
  PAYMENTS: 'trucking_payments',
  BILLS: 'trucking_bills',
  JOURNAL_ENTRIES: 'trucking_journalEntries',
  ACCOUNTS: 'trucking_accounts',
  TAX_RECORDS: 'trucking_taxRecords',
  PETTYCASH_REQUESTS: 'trucking_pettycash_requests',
  PETTYCASH_MEMOS: 'trucking_pettycash_memos',
  PURCHASE_ORDERS: 'trucking_purchaseOrders',
  OPERATIONAL_EXPENSES: 'trucking_operationalExpenses',
  
  // Notifications
  UNIT_NOTIFICATIONS: 'trucking_unitNotifications',
  SURAT_JALAN_NOTIFICATIONS: 'trucking_suratJalanNotifications',
  INVOICE_NOTIFICATIONS: 'trucking_invoiceNotifications',
  PETTYCASH_NOTIFICATIONS: 'trucking_pettyCashNotifications',
  FINANCE_NOTIFICATIONS: 'trucking_financeNotifications',
  
  // System
  AUDIT_LOGS: 'trucking_auditLogs',
  USER_ACCESS_CONTROL: 'userAccessControl',
};
