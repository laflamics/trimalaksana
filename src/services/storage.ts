export type StorageType = 'local' | 'server';

export interface StorageConfig {
  type: StorageType;
  serverUrl?: string;
}

export type BusinessType = 'packaging' | 'general-trading' | 'trucking';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

import { websocketClient } from './websocket-client';

/**
 * Extract value from wrapped storage object
 * Simple: Handle format {value: [...], timestamp: ...}
 * Returns array or empty array as fallback
 */
export const extractStorageValue = (data: any): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  
  // Simple: Handle wrapped object {value: [...], timestamp: ...}
  if (data && typeof data === 'object' && 'value' in data) {
    const extracted = data.value;
    if (Array.isArray(extracted)) return extracted;
    if (!extracted || (typeof extracted === 'object' && Object.keys(extracted).length === 0)) return [];
  }
  
  return [];
};

class StorageService {
  private config: StorageConfig = {
    type: 'local',
  };

  // Debug flag - set to true to enable storage logs
  private DEBUG = false;

  private syncInProgress = false;
  private syncFromServerInProgress = false;
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private autoSyncEnabled = false;
  private autoSyncIntervalMs = 600000; // OPTIMIZED: 10 minutes
  private syncStatus: SyncStatus = 'idle';
  private syncStatusListeners: ((status: SyncStatus) => void)[] = [];
  private storageEventName = 'app-storage-changed';
  private lastSyncFromServerTime = 0;
  private MIN_SYNC_FROM_SERVER_INTERVAL = 120000; // OPTIMIZED: 2 minutes minimum interval (sebelumnya 1 menit) - kurangi background syncs
  // CRITICAL: Flag to prevent POST to server when syncing FROM server
  private syncingFromServer = new Set<string>();
  
  // SYNC TIMEOUTS AND RETRIES
  private readonly INITIAL_SYNC_TIMEOUT = 60000; // 30 seconds for initial sync
  private readonly REGULAR_SYNC_TIMEOUT = 5000; // 5 seconds for regular sync
  private readonly MAX_RETRIES = 3; // Maximum retry attempts
  private readonly BASE_RETRY_DELAY = 2000; // sBase delay between retries (progressive)
  
  // SMART CACHING: Cache metadata untuk avoid unnecessary requests
  private cacheMetadata = new Map<string, { timestamp: number; etag?: string; size?: number }>();
  private CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private lastSyncTime = new Map<string, number>();
  private MIN_SYNC_INTERVAL = 60000; // OPTIMIZED: 60 seconds (sebelumnya 30 detik) - kurangi unnecessary syncs
  private syncToServerTimeouts = new Map<string, NodeJS.Timeout>();
  private SYNC_TO_SERVER_DEBOUNCE = 5000; // OPTIMIZED: 5 seconds debounce (sebelumnya 2 detik) - batch lebih banyak changes
  private backgroundSyncInProgress = new Set<string>(); // Track keys being synced in background

  constructor() {
    // Listen untuk WebSocket broadcast messages dari server
    // Update local storage saat ada perubahan di server (real-time sync)
    if (typeof window !== 'undefined') {
      window.addEventListener('app-storage-changed', this.handleStorageChangeEvent.bind(this) as EventListener);
    }
  }

  /**
   * Handle storage change event from WebSocket broadcast
   * Update local storage saat ada perubahan di server
   */
  private async handleStorageChangeEvent(event: Event) {
    const customEvent = event as CustomEvent<{ key: string; value: any; action?: string }>;
    const eventDetail = customEvent.detail;
    
    if (!eventDetail || !eventDetail.key) return;
    
    const broadcastKey = eventDetail.key;
    const broadcastValue = eventDetail.value;
    const broadcastAction = eventDetail.action;
    
    // Skip jika ini dari server sync yang sedang berjalan (prevent loop)
    if (this.syncingFromServer.has(broadcastKey)) {
      return;
    }
    
    // Skip jika ini dari local set (prevent double update)
    // Hanya handle jika ini dari server broadcast
    const config = this.getConfig();
    if (config.type !== 'server') {
      return; // Only handle in server mode
    }
    
    // Check if this is a broadcast from server (not from local set)
    // Server broadcasts have action 'update' or 'delete' from WebSocket
    if (broadcastAction === 'update' || broadcastAction === 'delete') {
      console.log(`[Storage] 📥 Received server broadcast for ${broadcastKey}, updating local storage...`);
      
      try {
        // Server broadcast key sudah include prefix (e.g., "packaging/products")
        // Extract actual key jika ada prefix
        let actualKey = broadcastKey;
        if (broadcastKey.includes('/')) {
          // Key sudah ada prefix, extract bagian setelah slash terakhir
          const parts = broadcastKey.split('/');
          actualKey = parts[parts.length - 1];
        }
        
        const storageKey = this.getStorageKey(actualKey);
        
        // CRITICAL: Set flag to prevent POST to server when updating from broadcast
        this.syncingFromServer.add(actualKey);
        
        try {
          if (broadcastAction === 'delete') {
            // Delete from local storage
            localStorage.removeItem(storageKey);
            console.log(`[Storage] ✅ Deleted ${broadcastKey} from local storage (server broadcast)`);
          } else {
            // Update local storage with server data
            const dataToSave = {
              value: broadcastValue,
              timestamp: Date.now(),
              _timestamp: Date.now(),
              syncedFromServer: true,
              serverSyncAt: new Date().toISOString()
            };
            
            localStorage.setItem(storageKey, JSON.stringify(dataToSave));
            console.log(`[Storage] ✅ Updated ${broadcastKey} in local storage (server broadcast)`);
          }
        } finally {
          // Remove flag after update
          this.syncingFromServer.delete(actualKey);
        }
      } catch (error: any) {
        console.error(`[Storage] ❌ Error updating local storage from server broadcast for ${broadcastKey}:`, error.message);
        // Try to clean up flag if actualKey was set
        if (broadcastKey.includes('/')) {
          const parts = broadcastKey.split('/');
          const actualKey = parts[parts.length - 1];
          this.syncingFromServer.delete(actualKey);
        }
      }
    }
  }

  // Debug logger
  private log(...args: any[]) {
    if (this.DEBUG) {
      console.log(...args);
    }
  }

  // Android-compatible timeout helper
  // AbortSignal.timeout() mungkin tidak tersedia di Android WebView lama
  private createTimeoutSignal(timeoutMs: number): AbortSignal {
    // Cek apakah AbortSignal.timeout() tersedia
    if (typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal && typeof AbortSignal.timeout === 'function') {
      try {
        return AbortSignal.timeout(timeoutMs);
      } catch (e) {
        // Fallback jika timeout() gagal
      }
    }
    
    // Fallback: gunakan AbortController dengan setTimeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);
    
    // Cleanup timeout jika signal sudah di-abort dari luar
    controller.signal.addEventListener('abort', () => {
      clearTimeout(timeoutId);
    });
    
    return controller.signal;
  }

  // Get current business context
  getBusinessContext(): BusinessType {
    const selected = localStorage.getItem('selectedBusiness');
    if (selected === 'general-trading' || selected === 'trucking') {
      return selected;
    }
    return 'packaging';
  }

  // Get storage key with business context prefix
  private getStorageKey(key: string, forServer: boolean = false): string {
    const business = this.getBusinessContext();
    if (business === 'packaging') {
      return key;
    }
    if (forServer) {
      return key; // Server uses normalized keys
    }
    return `${business}/${key}`;
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

  async get<T>(key: string): Promise<T | null> {
    const config = this.getConfig();
    const storageKey = this.getStorageKey(key);
    
    if (config.type === 'local') {
      // Try file-based storage first (if Electron)
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.loadStorage) {
        try {
          const result = await electronAPI.loadStorage(storageKey);
          if (result.success && result.data !== null) {
            const data = result.data;
            // Extract value if wrapped
            let finalData = (data.value !== undefined) ? data.value : data;
            
            // CRITICAL: Ensure arrays are properly extracted
            if (Array.isArray(finalData)) {
              finalData = finalData.map((item: any) => {
                if (item && typeof item === 'object') {
                  // Ensure padCode exists for products
                  if (!('padCode' in item) && (item.kode || item.nama || item.harga)) {
                    return { ...item, padCode: '' };
                  }
                }
                return item;
              });
            }
            
            // FORCE UPDATE localStorage with file data to ensure consistency
            try {
              const dataWithTimestamp = {
                value: finalData,
                timestamp: Date.now(),
                _timestamp: Date.now(),
                loadedFromFile: true,
                fileLoadedAt: new Date().toISOString()
              };
              localStorage.setItem(storageKey, JSON.stringify(dataWithTimestamp));
            } catch (e) {
              // Silent fail on localStorage update
            }
            
            return finalData;
          }
        } catch (error: any) {
          if (error.code !== 'ENOENT') {
            console.error(`[Storage.get] File storage error for ${key}:`, error);
          }
        }
      }
      
      // Fallback to localStorage
      const value = localStorage.getItem(storageKey);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          // Extract value if wrapped
          let finalData = (parsed.value !== undefined) ? parsed.value : parsed;
          
          // CRITICAL: Ensure arrays are properly extracted
          if (Array.isArray(finalData)) {
            finalData = finalData.map((item: any) => {
              if (item && typeof item === 'object') {
                // Ensure padCode exists for products
                if (!('padCode' in item) && (item.kode || item.nama || item.harga)) {
                  return { ...item, padCode: '' };
                }
              }
              return item;
            });
          }
          
          return finalData;
        } catch (error) {
          console.error(`[Storage.get] Error parsing localStorage for ${key}:`, error);
        }
      }
      return null;
    } else {
      // Server storage - ALWAYS load from local first, sync in background
      // CRITICAL: Never block get() if server sync fails - always return local data
      const localValueStr = localStorage.getItem(storageKey);
      let localValue = null;
      
      if (localValueStr) {
        try {
          const localParsed = JSON.parse(localValueStr);
          localValue = (localParsed.value !== undefined) ? localParsed.value : localParsed;
          
          // CRITICAL: Ensure arrays are properly extracted
          if (Array.isArray(localValue)) {
            localValue = localValue.map((item: any) => {
              if (item && typeof item === 'object') {
                // Ensure padCode exists for products
                if (!('padCode' in item) && (item.kode || item.nama || item.harga)) {
                  return { ...item, padCode: '' };
                }
              }
              return item;
            });
          }
          
          console.log(`[Storage.get] ✅ Using local data for ${key} (${Array.isArray(localValue) ? localValue.length + ' items' : 'object'})`);
        } catch (error) {
          console.error(`[Storage.get] ❌ Error parsing local storage for ${key}:`, error);
        }
      } else {
        console.log(`[Storage.get] ⚠️ No local data for ${key}, will try to sync from server`);
      }
      
      // Start background sync if no local data or data is old (prevent duplicate syncs)
      // CRITICAL: Don't block - sync in background, return local data immediately
      if ((localValue === null || this.shouldSyncFromServer(key)) && !this.backgroundSyncInProgress.has(key)) {
        this.backgroundSyncInProgress.add(key);
        console.log(`[Storage.get] 🔄 Starting background sync for ${key}...`);
        this.syncFromServerInBackground(key).catch(error => {
          console.warn(`[Storage.get] ⚠️ Background sync failed for ${key}, using local data:`, error.message);
          // Don't throw - we already have local data or will return null
        }).finally(() => {
          this.backgroundSyncInProgress.delete(key);
        });
      }
      
      // CRITICAL: Always return local value immediately (or null if not available)
      // Never wait for server sync - local data is always available first
      return localValue;
    }
  }

  async set<T>(key: string, value: T, immediateSync: boolean = false, skipServerSync: boolean = false): Promise<void> {
    const config = this.getConfig();
    const storageKey = this.getStorageKey(key);
    
    // Check if data actually changed
    const existingData = localStorage.getItem(storageKey);
    let dataChanged = true;
    let existingTimestamp: number | null = null;
    
    if (existingData) {
      try {
        const parsed = JSON.parse(existingData);
        existingTimestamp = parsed.timestamp || parsed._timestamp || null;
        const existingValue = parsed.value !== undefined ? parsed.value : parsed;
        
        if (JSON.stringify(existingValue) === JSON.stringify(value)) {
          dataChanged = false;
        }
      } catch (e) {
        dataChanged = true;
      }
    }
    
    const timestamp = dataChanged ? Date.now() : (existingTimestamp || Date.now());
    
    // CRITICAL: Clean value - flatten nested structure untuk prevent Electron recursion error
    // Electron contextBridge tidak support nested objects lebih dari 1000 level
    let cleanedValue = value;
    if (value && typeof value === 'object') {
      try {
        // Deep clone dengan JSON parse/stringify untuk flatten nested structure
        cleanedValue = JSON.parse(JSON.stringify(value));
      } catch (e) {
        // Jika gagal, gunakan value as-is
      }
    }
    
    // Normalize value - ensure padCode for products
    const normalizeValue = (val: any): any => {
      if (Array.isArray(val)) {
        return val.map(item => {
          if (item && typeof item === 'object') {
            // Skip BOM objects
            const isBOMObject = item.product_id !== undefined && item.material_id !== undefined && 
                               !('padCode' in item) && !('nama' in item) && !('kode' in item);
            
            if (isBOMObject) {
              return item;
            }
            
            // Ensure padCode for products
            if (!('padCode' in item) && (item.kode || item.nama || item.harga)) {
              return { ...item, padCode: '' };
            }
          }
          return item;
        });
      }
      return val;
    };
    
    const normalizedValue = normalizeValue(cleanedValue);
    
    const dataWithTimestamp = {
      value: normalizedValue,
      timestamp,
      _timestamp: timestamp,
    };
    
    // Save to file storage if available
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.saveStorage) {
      try {
        await electronAPI.saveStorage(storageKey, dataWithTimestamp);
      } catch (error) {
        console.error('File storage error, falling back to localStorage:', error);
      }
    }
    
    // Always save to localStorage
    if (dataChanged) {
      localStorage.setItem(storageKey, JSON.stringify(dataWithTimestamp));
      this.dispatchStorageEvent(storageKey, value);
      
      // Sync to server in background if in server mode
      // CRITICAL: Skip server sync if this is from server sync (prevent double POST)
      if (config.type === 'server' && config.serverUrl && !skipServerSync && !this.syncingFromServer.has(key)) {
        // Clear existing timeout for this key
        const existingTimeout = this.syncToServerTimeouts.get(key);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }
        
        // CRITICAL: Jika immediateSync = true, langsung sync tanpa debounce
        // Ini untuk operasi penting seperti confirm SO, create SPK, create PR, schedule, notifikasi
        if (immediateSync) {
          // Sync immediately without debounce
          // CRITICAL: Fire and forget - don't await to prevent blocking UI
          this.syncDataToServer(key, normalizedValue, config.serverUrl)
            .catch(error => {
              console.error(`[Storage.set] ❌ Failed to sync ${key} to server immediately:`, error.message);
            });
        } else {
          // Set new timeout with debounce for non-critical operations
        const timeout = setTimeout(() => {
          this.syncToServerTimeouts.delete(key);
          // Don't await - sync in background
          if (config.serverUrl) {
            this.syncDataToServer(key, normalizedValue, config.serverUrl).catch(error => {
              console.warn(`[Storage.set] Failed to sync ${key} to server:`, error.message);
            });
          }
        }, this.SYNC_TO_SERVER_DEBOUNCE);
        
        this.syncToServerTimeouts.set(key, timeout);
        }
      }
    }
  }

  async remove(key: string): Promise<void> {
    const config = this.getConfig();
    const storageKey = this.getStorageKey(key);
    
    // Try file-based storage first
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.deleteStorage) {
      try {
        await electronAPI.deleteStorage(storageKey);
      } catch (error) {
        console.error('File storage delete error:', error);
      }
    }
    
    localStorage.removeItem(storageKey);
    this.dispatchStorageEvent(storageKey, null);
    
    // CRITICAL: Delete from server if in server mode
    if (config.type === 'server' && config.serverUrl) {
      try {
        const business = this.getBusinessContext();
        let serverPath = '';
        
        // Determine server path based on business and key
        if (business === 'packaging') {
          serverPath = `packaging/${key}`;
        } else if (business === 'general-trading') {
          serverPath = `general-trading/${key}`;
        } else if (business === 'trucking') {
          serverPath = `trucking/${key}`;
        }
        
        // Pakai WebSocket saja (lebih cepat, tidak pakai HTTP/Vercel)
        // Wait until WebSocket is ready (auto-connect if needed)
        const ready = await websocketClient.waitUntilReady(10000);
        if (!ready) {
          throw new Error('WebSocket not available. Please enable WebSocket in settings.');
        }
        
        await websocketClient.delete(serverPath);
      } catch (error: any) {
        console.error(`[Storage.remove] ❌ Failed to delete ${key} from server:`, error.message);
        // Don't throw - local delete already succeeded
      }
    }
  }

  // ENHANCED: Remove specific item from array with tombstone tracking
  async removeItem(key: string, itemId: string | number, idField: string = 'id'): Promise<void> {
    const currentData = await this.get<any[]>(key) || [];
    
    if (!Array.isArray(currentData)) {
      console.warn(`[Storage.removeItem] Data for key ${key} is not an array`);
      return;
    }
    
    // Find and mark item as deleted (tombstone pattern)
    const updatedData = currentData.map((item: any) => {
      const itemIdValue = item[idField];
      if (itemIdValue === itemId) {
        // Mark as deleted instead of removing (tombstone pattern)
        return {
          ...item,
          deleted: true,
          deletedAt: new Date().toISOString(),
          deletedTimestamp: Date.now()
        };
      }
      return item;
    });
    
    // Save updated data with tombstone
    await this.set(key, updatedData);
    
  }

  // ENHANCED: Permanently remove deleted items (cleanup tombstones)
  async cleanupDeletedItems(key: string, olderThanDays: number = 30): Promise<void> {
    const currentData = await this.get<any[]>(key) || [];
    
    if (!Array.isArray(currentData)) {
      return;
    }
    
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
    
    // Remove items that have been deleted for more than specified days
    const cleanedData = currentData.filter((item: any) => {
      if (item.deleted === true && item.deletedTimestamp) {
        return item.deletedTimestamp > cutoffTime;
      }
      return !item.deleted; // Keep non-deleted items
    });
    
    if (cleanedData.length !== currentData.length) {
      await this.set(key, cleanedData);
    }
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
      console.error('Failed to dispatch storage event:', error);
    }
  }

  // SYNC STATUS METHODS (required by components)
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

  private setSyncStatus(status: SyncStatus) {
    if (this.syncStatus !== status) {
      this.syncStatus = status;
      this.syncStatusListeners.forEach(callback => {
        try {
          callback(status);
        } catch (error) {
          console.error('Error in sync status callback:', error);
        }
      });
    }
  }

  isAutoSyncEnabled(): boolean {
    return this.autoSyncEnabled;
  }

  stopAutoSync(): void {
    this.autoSyncEnabled = false;
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }

  setAutoSyncInterval(intervalMs: number): void {
    this.autoSyncIntervalMs = intervalMs;
    if (this.autoSyncEnabled) {
      this.stopAutoSync();
      // Restart with new interval if it was enabled
      // Note: startAutoSync method would need to be implemented
    }
  }

  /**
   * Sync specific data key to server
   */
  private async syncDataToServer(key: string, data: any, serverUrl: string, retryCount: number = 0): Promise<void> {
    const retryDelay = this.BASE_RETRY_DELAY * (retryCount + 1);
    
    try {
      const business = this.getBusinessContext();
      let serverPath = '';
      
      // Determine server path based on business and key
      if (business === 'packaging') {
        serverPath = `packaging/${key}`;
      } else if (business === 'general-trading') {
        serverPath = `general-trading/${key}`;
      } else if (business === 'trucking') {
        serverPath = `trucking/${key}`;
      }
      
      // CRITICAL: Ensure data is in correct format before sending
      // If data is wrapped in {value: ...}, extract it
      let dataToSync = data;
      if (data && typeof data === 'object' && !Array.isArray(data) && 'value' in data) {
        // Data is wrapped, extract the actual value
        dataToSync = data.value;
      }
      
      // CRITICAL: For notifications and arrays, ensure it's always an array
      if (key.includes('Notifications') || key.includes('Requests') || key.includes('Orders')) {
        if (!Array.isArray(dataToSync)) {
          console.error(`[Storage.syncDataToServer] ❌ Data for ${key} should be array but got: ${typeof dataToSync}`);
          // Try to extract if it's nested
          if (dataToSync && typeof dataToSync === 'object' && 'value' in dataToSync) {
            dataToSync = dataToSync.value;
          }
          // If still not array, wrap in array or use empty array
          if (!Array.isArray(dataToSync)) {
            console.error(`[Storage.syncDataToServer] ❌ Cannot convert to array, using empty array`);
            dataToSync = [];
          }
        }
      }
      
      // Pakai WebSocket saja (lebih cepat, tidak pakai HTTP/Vercel)
      // Wait until WebSocket is ready (auto-connect if needed)
      const ready = await websocketClient.waitUntilReady(10000);
      if (!ready) {
        throw new Error('WebSocket not available. Please enable WebSocket in settings.');
      }
      
      await websocketClient.post(serverPath, dataToSync, Date.now());
      
    } catch (error: any) {
      // Retry logic for network errors and timeouts
      if (retryCount < this.MAX_RETRIES && (
        error.name === 'AbortError' || 
        error.name === 'TimeoutError' ||
        error.message.includes('aborted') ||
        error.message.includes('timeout') ||
        error.message.includes('network') ||
        error.message.includes('fetch')
      )) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.syncDataToServer(key, data, serverUrl, retryCount + 1);
      }
      
      // Don't throw - just log warning (background sync shouldn't break app)
      console.warn(`[Storage.syncDataToServer] ⚠️ Failed to sync ${key} to server:`, error.message);
    }
  }

  async syncToServer(): Promise<void> {
    const config = this.getConfig();
    
    if (config.type !== 'server' || !config.serverUrl) {
      console.warn('[Storage.syncToServer] Not in server mode or no server URL configured');
      return;
    }
    
    this.setSyncStatus('syncing');
    
    try {
      const business = this.getBusinessContext();
      let dataKeys: string[] = [];
      
      if (business === 'packaging') {
        dataKeys = [
          'products', 'materials', 'customers', 'suppliers', 
          'userAccessControl', 'salesOrders', 'purchaseOrders',
          'production', 'inventory', 'bom', 'spk', 'qc', 'quotations'
        ];
      } else if (business === 'general-trading') {
        dataKeys = [
          'gt_products', 'gt_customers', 'gt_suppliers', 'gt_salesOrders',
          'gt_purchaseOrders', 'gt_purchaseRequests', 'gt_invoices', 'gt_payments', 
          'gt_spk', 'gt_schedule', 'gt_delivery', 'gt_inventory',
          'gt_deliveryNotifications', 'gt_purchasingNotifications', 'gt_financeNotifications',
          'gt_returns', 'gt_grn', 'gt_quotations',
          'userAccessControl'
        ];
      } else if (business === 'trucking') {
        dataKeys = [
          // Master Data
          'trucking_customers', 'trucking_vehicles', 'trucking_drivers', 'trucking_routes',
          // Operations
          'trucking_delivery_orders', 'trucking_suratJalan', 'trucking_route_plans',
          'trucking_unitSchedules', 'trucking_salesOrders',
          // Finance
          'trucking_invoices', 'trucking_payments', 'trucking_bills',
          'trucking_journalEntries', 'trucking_accounts', 'trucking_taxRecords',
          'trucking_pettycash_requests', 'trucking_pettycash_memos', 'trucking_purchaseOrders',
          // Notifications
          'trucking_unitNotifications', 'trucking_suratJalanNotifications',
          'trucking_invoiceNotifications', 'trucking_pettyCashNotifications',
          // System
          'trucking_settings', 'trucking_auditLogs', 'trucking_route_ready',
          'userAccessControl'
        ];
      }
      
      // Sync each data type to server
      let syncedCount = 0;
      for (const key of dataKeys) {
        try {
          const data = await this.get<any>(key);
          if (data !== null && data !== undefined) {
            await this.syncDataToServer(key, data, config.serverUrl);
            syncedCount++;
          }
        } catch (error: any) {
          console.warn(`[Storage.syncToServer] ⚠️ Failed to sync ${key}:`, error.message);
        }
      }
      
      this.setSyncStatus('synced');
      
    } catch (error) {
      console.error('[Storage.syncToServer] ❌ Sync failed:', error);
      this.setSyncStatus('error');
      throw error;
    }
  }

  /**
   * Sync data from server to local storage
   * This method is called by Settings pages when switching to server mode
   */
  async syncFromServer(): Promise<void> {
    console.log('[Storage.syncFromServer] 🚀 syncFromServer called');
    
    const config = this.getConfig();
    console.log('[Storage.syncFromServer] 📋 Config:', { type: config.type, serverUrl: config.serverUrl });
    
    if (config.type !== 'server' || !config.serverUrl) {
      console.warn('[Storage.syncFromServer] ⚠️ Not in server mode or no server URL configured');
      return;
    }
    
    // Prevent multiple simultaneous syncs
    if (this.syncFromServerInProgress) {
      console.log('[Storage.syncFromServer] ⏭️ Sync already in progress, skipping...');
      return;
    }
    
    // Prevent too frequent syncs
    const now = Date.now();
    if (now - this.lastSyncFromServerTime < this.MIN_SYNC_FROM_SERVER_INTERVAL) {
      console.log('[Storage.syncFromServer] ⏭️ Sync too frequent, skipping...');
      return;
    }
    
    console.log('[Storage.syncFromServer] ✅ Starting sync...');
    this.syncFromServerInProgress = true;
    this.lastSyncFromServerTime = now;
    this.setSyncStatus('syncing');
    
    try {
      
      // Get business context to determine what data to sync
      const business = this.getBusinessContext();
      console.log('[Storage.syncFromServer] 🏢 Business context:', business);
      
      // Define data keys to sync based on business type
      let dataKeys: string[] = [];
      
      if (business === 'packaging') {
        dataKeys = [
          'products', 'materials', 'customers', 'suppliers', 
          'userAccessControl', 'salesOrders', 'purchaseOrders',
          'production', 'inventory', 'bom', 'spk', 'qc'
        ];
      } else if (business === 'general-trading') {
        dataKeys = [
          'gt_products', 'gt_customers', 'gt_suppliers', 'gt_salesOrders',
          'gt_purchaseOrders', 'gt_purchaseRequests', 'gt_invoices', 'gt_payments', 
          'gt_spk', 'gt_schedule', 'gt_delivery', 'gt_inventory',
          'gt_deliveryNotifications', 'gt_purchasingNotifications', 'gt_financeNotifications',
          'gt_returns', 'gt_grn', 'gt_quotations',
          'userAccessControl'
        ];
      } else if (business === 'trucking') {
        dataKeys = [
          // Master Data
          'trucking_customers', 'trucking_vehicles', 'trucking_drivers', 'trucking_routes',
          // Operations
          'trucking_delivery_orders', 'trucking_suratJalan', 'trucking_route_plans',
          'trucking_unitSchedules', 'trucking_salesOrders',
          // Finance
          'trucking_invoices', 'trucking_payments', 'trucking_bills',
          'trucking_journalEntries', 'trucking_accounts', 'trucking_taxRecords',
          'trucking_pettycash_requests', 'trucking_pettycash_memos', 'trucking_purchaseOrders',
          // Notifications
          'trucking_unitNotifications', 'trucking_suratJalanNotifications',
          'trucking_invoiceNotifications', 'trucking_pettyCashNotifications',
          // System
          'trucking_settings', 'trucking_auditLogs', 'trucking_route_ready',
          'userAccessControl'
        ];
      }
      
      
      // Sync each data type from server
      let syncedCount = 0;
      let failedKeys: string[] = [];
      
      console.log(`[Storage.syncFromServer] 🚀 Starting sync for ${dataKeys.length} keys:`, dataKeys);
      
      for (const key of dataKeys) {
        try {
          console.log(`[Storage.syncFromServer] 🔄 Syncing ${key}...`);
          await this.syncDataFromServer(key, config.serverUrl);
          console.log(`[Storage.syncFromServer] ✅ Successfully synced ${key}`);
          syncedCount++;
        } catch (error: any) {
          console.error(`[Storage.syncFromServer] ❌ Failed to sync ${key}:`, error.message, error);
          failedKeys.push(key);
          // Continue with other keys - don't fail entire sync for one key
        }
      }
      
      console.log(`[Storage.syncFromServer] 📊 Sync complete: ${syncedCount} succeeded, ${failedKeys.length} failed`);
      
      
      if (failedKeys.length > 0) {
        console.warn(`[Storage.syncFromServer] ⚠️ Failed keys: ${failedKeys.join(', ')}`);
        // Still mark as synced if majority succeeded
        if (syncedCount > failedKeys.length) {
          this.setSyncStatus('synced');
        } else {
          this.setSyncStatus('error');
          throw new Error(`Sync failed for most data types: ${failedKeys.join(', ')}`);
        }
      } else {
        this.setSyncStatus('synced');
      }
      
    } catch (error) {
      console.error('[Storage.syncFromServer] ❌ Sync failed:', error);
      this.setSyncStatus('error');
      throw error;
    } finally {
      this.syncFromServerInProgress = false;
    }
  }

  /**
   * Sync specific data key from server with retry logic
   */
  private async syncDataFromServer(key: string, serverUrl: string, retryCount: number = 0): Promise<void> {
    const retryDelay = this.BASE_RETRY_DELAY * (retryCount + 1); // Progressive delay: 2s, 4s, 6s
    
    try {
      const business = this.getBusinessContext();
      let serverPath = '';
      
      // Determine server path based on business and key
      if (business === 'packaging') {
        serverPath = `packaging/${key}`;
      } else if (business === 'general-trading') {
        serverPath = `general-trading/${key}`;
      } else if (business === 'trucking') {
        serverPath = `trucking/${key}`;
      }
      
      
      // Use longer timeout for initial sync, shorter for regular sync
      const timeout = retryCount === 0 ? this.INITIAL_SYNC_TIMEOUT : this.REGULAR_SYNC_TIMEOUT;
      
      // Fetch from server with appropriate timeout
      // Pakai WebSocket untuk GET (lebih cepat, tidak pakai HTTP/Vercel)
      // Wait until WebSocket is ready (auto-connect if needed)
      const ready = await websocketClient.waitUntilReady(10000);
      if (!ready) {
        throw new Error('WebSocket not available. Please enable WebSocket in settings.');
      }
      
      console.log(`[Storage.syncDataFromServer] 🔄 Syncing ${key} from server path: ${serverPath}`);
      
      const serverDataRaw = await websocketClient.get(serverPath);
      console.log(`[Storage.syncDataFromServer] 📥 Received data for ${key}:`, {
        type: typeof serverDataRaw,
        isArray: Array.isArray(serverDataRaw),
        isEmpty: serverDataRaw && typeof serverDataRaw === 'object' && Object.keys(serverDataRaw).length === 0,
        hasValue: serverDataRaw && typeof serverDataRaw === 'object' && 'value' in serverDataRaw,
        keys: serverDataRaw && typeof serverDataRaw === 'object' ? Object.keys(serverDataRaw) : null,
        preview: Array.isArray(serverDataRaw) ? `Array[${serverDataRaw.length}]` : JSON.stringify(serverDataRaw).substring(0, 100)
      });
      
      // websocketClient.get() sudah return value langsung (bukan wrapped)
      // Server mengirim {success: true, value: fileValue, timestamp: ...}
      // websocketClient.get() return response.value yang adalah fileValue
      // fileValue bisa jadi:
      // 1. Array langsung (jika file isinya array)
      // 2. Object dengan .value property (jika file format {value: [...], timestamp: ...})
      // 3. Empty object {} (jika file tidak ada atau kosong)
      
      // CRITICAL: Extract array dari nested structure (handle nested value.value.value...)
      // Gunakan extractStorageValue untuk flatten nested structure
      let serverArray = extractStorageValue(serverDataRaw);
      console.log(`[Storage.syncDataFromServer] 📊 Extracted array for ${key}:`, {
        isArray: Array.isArray(serverArray),
        length: Array.isArray(serverArray) ? serverArray.length : 0
      });
      
      // CRITICAL: Ensure serverArray is always an array
      // If server returns empty object {} or non-array, convert to empty array
      if (!Array.isArray(serverArray)) {
        // Check if it's an empty object (file doesn't exist on server)
        if (serverDataRaw && typeof serverDataRaw === 'object' && Object.keys(serverDataRaw).length === 0) {
          // Empty object means no data on server, skip sync (don't overwrite local)
          console.log(`[Storage.syncDataFromServer] ⏭️ Skipping ${key} - empty object (file doesn't exist on server)`);
          return;
        }
        // Log warning but don't fail - might be valid empty state
        console.warn(`[Storage.syncDataFromServer] ⚠️ ${key} is not an array, converting to empty array`);
        serverArray = [];
      }
      
      if (serverArray.length > 0) {
        console.log(`[Storage.syncDataFromServer] 📦 Server has ${serverArray.length} items for ${key}, merging with local...`);
        
        // Get local data first
        const localData = await this.get<any[]>(key) || [];
        const localArray = Array.isArray(localData) ? localData : [];
        console.log(`[Storage.syncDataFromServer] 📦 Local has ${localArray.length} items for ${key}`);
        
        // Merge strategy: combine local and server, prefer newer items
        // For arrays, merge by ID to avoid duplicates
        // CRITICAL: Preserve tombstone (deleted items) - tombstone always wins!
        const mergedMap = new Map<string | number, any>();
        
        // Helper function untuk cek tombstone
        const isDeleted = (it: any) => it.deleted === true || it.deleted === 'true' || !!it.deletedAt || !!it.deletedTimestamp;
        
        // Add server items first (including tombstones)
        serverArray.forEach(item => {
          if (item && typeof item === 'object') {
            const itemId = item.id || item.soNo || item.poNo || item.spkNo || item.kode || item.product_id || item.material_id;
            if (itemId) {
              mergedMap.set(itemId, item);
            }
          }
        });
        
        // Add local items (will overwrite server items with same ID if local is newer)
        // CRITICAL: Always preserve local items, especially newly created ones
        // CRITICAL: Preserve tombstone (deleted items) - tombstone always wins!
        localArray.forEach((item, index) => {
          if (item && typeof item === 'object') {
            const itemId = item.id || item.soNo || item.poNo || item.spkNo || item.kode || item.product_id || item.material_id;
            
            // Helper function untuk cek tombstone
            const isDeleted = (it: any) => it.deleted === true || it.deleted === 'true' || !!it.deletedAt || !!it.deletedTimestamp;
            
            // If item has ID, merge by ID
            if (itemId) {
              const serverItem = mergedMap.get(itemId);
              if (serverItem) {
                const localDeleted = isDeleted(item);
                const serverDeleted = isDeleted(serverItem);
                
                // CRITICAL: Tombstone preservation - jika salah satu deleted, preserve tombstone
                if (localDeleted && !serverDeleted) {
                  // Local deleted, server not deleted - preserve local tombstone (deletion wins)
                  mergedMap.set(itemId, item);
                } else if (!localDeleted && serverDeleted) {
                  // Server deleted, local not deleted - preserve server tombstone (deletion wins)
                  mergedMap.set(itemId, serverItem);
                } else if (localDeleted && serverDeleted) {
                  // Both deleted - prefer newer deletion timestamp
                  const localDelTime = item.deletedTimestamp || item.deletedAt ? new Date(item.deletedAt).getTime() : 0;
                  const serverDelTime = serverItem.deletedTimestamp || serverItem.deletedAt ? new Date(serverItem.deletedAt).getTime() : 0;
                  mergedMap.set(itemId, localDelTime >= serverDelTime ? item : serverItem);
                } else {
                  // Neither deleted - compare timestamps - prefer newer one
                  const localTime = item.created ? new Date(item.created).getTime() : (item.timestamp || 0);
                  const serverTime = serverItem.created ? new Date(serverItem.created).getTime() : (serverItem.timestamp || 0);
                  
                  // Prefer local if it's newer OR if timestamps are equal (local takes precedence)
                  if (localTime >= serverTime) {
                    mergedMap.set(itemId, item);
                  }
                }
                // No logging for normal merge operations to reduce console spam
              } else {
                // Local item not in server - keep it (newly created or deleted)
                mergedMap.set(itemId, item);
              }
            } else {
              // Item without clear ID - check if it's a duplicate by comparing all fields
              // For items without ID, we'll add them if they're not already in the map
              // Use index as fallback ID to ensure uniqueness
              const fallbackId = `local-${index}-${JSON.stringify(item).substring(0, 50)}`;
              if (!mergedMap.has(fallbackId)) {
                mergedMap.set(fallbackId, item);
              }
            }
          }
        });
        
        // Convert map back to array
        const mergedArray = Array.from(mergedMap.values());
        
        // CRITICAL: Clean data - remove any nested structure sebelum save
        // Pastikan setiap item adalah plain object, tidak ada nested structure yang dalam
        const cleanedArray = mergedArray.map((item: any) => {
          if (!item || typeof item !== 'object') return item;
          // Deep clone untuk remove nested references, tapi limit depth
          return JSON.parse(JSON.stringify(item));
        });
        
        // Only update if there are actual changes
        const localStr = JSON.stringify(localArray.sort((a, b) => {
          const aId = a.id || a.soNo || a.poNo || '';
          const bId = b.id || b.soNo || b.poNo || '';
          return String(aId).localeCompare(String(bId));
        }));
        const mergedStr = JSON.stringify(cleanedArray.sort((a, b) => {
          const aId = a.id || a.soNo || a.poNo || '';
          const bId = b.id || b.soNo || b.poNo || '';
          return String(aId).localeCompare(String(bId));
        }));
        
        if (localStr !== mergedStr) {
          // CRITICAL: Set flag to prevent POST to server when syncing FROM server
          this.syncingFromServer.add(key);
          try {
            // CRITICAL: skipServerSync = true to prevent POST to server
            await this.set(key, cleanedArray, false, true);
          } finally {
            // Remove flag after sync
            this.syncingFromServer.delete(key);
          }
          // Synced successfully
        } else {
          // Already in sync
        }
      } else {
        // Non-array data - handle differently
        // Use serverDataRaw directly for non-array objects
        if (serverDataRaw && typeof serverDataRaw === 'object' && !Array.isArray(serverDataRaw) && Object.keys(serverDataRaw).length > 0) {
          // For non-array objects, merge with local
          const localData = await this.get<any>(key);
          if (localData && typeof localData === 'object' && !Array.isArray(localData)) {
            // Merge objects
            const merged = { ...localData, ...serverDataRaw };
            // CRITICAL: Set flag to prevent POST to server when syncing FROM server
            this.syncingFromServer.add(key);
            try {
              await this.set(key, merged, false, true);
            } finally {
              this.syncingFromServer.delete(key);
            }
            // Synced successfully
          } else {
            // No local data or different type - use server data
            // CRITICAL: Set flag to prevent POST to server when syncing FROM server
            this.syncingFromServer.add(key);
            try {
              await this.set(key, serverDataRaw, false, true);
            } finally {
              this.syncingFromServer.delete(key);
            }
            // Synced successfully (non-array)
          }
        }
      }
      
      // CRITICAL: Handle empty array case separately
      if (Array.isArray(serverArray) && serverArray.length === 0) {
        console.log(`[Storage.syncDataFromServer] 📭 Server returned empty array for ${key}`);
        
        // Server returned empty array - ensure local is also empty array
        const localData = await this.get<any[]>(key) || [];
        const localArray = Array.isArray(localData) ? localData : [];
        
        console.log(`[Storage.syncDataFromServer] 📭 Local has ${localArray.length} items for ${key}`);
        
        // CRITICAL: If local has data but server is empty, keep local (newly created items)
        // Only update if local is not an array or is empty
        if (!Array.isArray(localData) || localArray.length === 0) {
          console.log(`[Storage.syncDataFromServer] ✅ Updating ${key} to empty array (local is also empty)`);
          
          // CRITICAL: Set flag to prevent POST to server when syncing FROM server
          this.syncingFromServer.add(key);
          try {
            // CRITICAL: Ensure we save as empty array, not object
            // CRITICAL: skipServerSync = true to prevent POST to server
            await this.set(key, [], false, true);
          } finally {
            // Remove flag after sync
            this.syncingFromServer.delete(key);
          }
        } else {
          console.log(`[Storage.syncDataFromServer] ⏭️ Skipping ${key} - local has data but server is empty (keeping local)`);
        }
      }
      
    } catch (error: any) {
      // Check if error is because file doesn't exist on server (empty response)
      // Server returns {success: true, value: {}, timestamp: 0} for non-existent files
      // This is handled above, but if error occurs, check for empty object case
      if (error.message && (
        error.message.includes('File doesn\'t exist') ||
        error.message.includes('ENOENT') ||
        error.message.includes('not found')
      )) {
        // File doesn't exist on server - skip sync (don't overwrite local)
        return;
      }
      
      console.error(`[Storage.syncDataFromServer] ❌ Failed to sync ${key} (attempt ${retryCount + 1}):`, error.message);
      
      // Retry logic for network errors and timeouts
      if (retryCount < this.MAX_RETRIES && (
        error.name === 'AbortError' || 
        error.name === 'TimeoutError' ||
        error.message.includes('aborted') ||
        error.message.includes('timeout') ||
        error.message.includes('network') ||
        error.message.includes('fetch') ||
        error.message.includes('WebSocket')
      )) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.syncDataFromServer(key, serverUrl, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Force reload data from file (for GT data sync issues)
   */
  async forceReloadFromFile<T>(key: string): Promise<T | null> {
    const storageKey = this.getStorageKey(key);
    
    // Try file-based storage first (if Electron)
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.loadStorage) {
      try {
        const result = await electronAPI.loadStorage(storageKey);
        
        if (result.success && result.data !== null) {
          const data = result.data;
          // Extract value if wrapped
          let finalData = (data.value !== undefined) ? data.value : data;
          
          // CRITICAL: Ensure arrays are properly extracted
          if (Array.isArray(finalData)) {
            finalData = finalData.map((item: any) => {
              if (item && typeof item === 'object') {
                // Ensure padCode exists for products
                if (!('padCode' in item) && (item.kode || item.nama || item.harga)) {
                  return { ...item, padCode: '' };
                }
              }
              return item;
            });
          }
          
          // Force update localStorage with file data
          const dataWithTimestamp = {
            value: finalData,
            timestamp: Date.now(),
            _timestamp: Date.now(),
            forceReloadedFromFile: true,
            fileReloadedAt: new Date().toISOString()
          };
          
          localStorage.setItem(storageKey, JSON.stringify(dataWithTimestamp));
          
          // Dispatch storage change event
          this.dispatchStorageEvent(storageKey, finalData);
          
          return finalData;
        } else {
          console.error(`[Storage.forceReloadFromFile] Failed to load ${key}: ${result.error}`);
        }
      } catch (error: any) {
        console.error(`[Storage.forceReloadFromFile] Error loading ${key}:`, error);
      }
    }
    
    return null;
  }

  /**
   * Check if data should be synced from server
   */
  private shouldSyncFromServer(key: string): boolean {
    const lastSync = this.lastSyncTime.get(key) || 0;
    const now = Date.now();
    return (now - lastSync) > this.MIN_SYNC_INTERVAL;
  }

  /**
   * Sync data from server in background
   */
  private async syncFromServerInBackground(key: string): Promise<void> {
    const config = this.getConfig();
    
    if (config.type !== 'server' || !config.serverUrl) {
      return;
    }
    
    try {
      console.log(`[Storage.syncFromServerInBackground] 🔄 Syncing ${key} from server...`);
      await this.syncDataFromServer(key, config.serverUrl);
      console.log(`[Storage.syncFromServerInBackground] ✅ Successfully synced ${key} from server`);
    } catch (error: any) {
      // CRITICAL: Don't throw error - just log and continue using local data
      console.warn(`[Storage.syncFromServerInBackground] ⚠️ Failed to sync ${key} from server, will use local data:`, error.message);
      // Local data is still available, so this is not a critical error
    }
  }
}

export const storageService = new StorageService();