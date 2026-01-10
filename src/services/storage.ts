export type StorageType = 'local' | 'server';

export interface StorageConfig {
  type: StorageType;
  serverUrl?: string;
}

export type BusinessType = 'packaging' | 'general-trading' | 'trucking';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

/**
 * Extract value from wrapped storage object
 * Handles format: {value: [...], timestamp: ...}
 * Returns array or empty array as fallback
 */
export const extractStorageValue = (data: any): any[] => {
  if (!data) return [];
  // Handle wrapped object {value: ..., timestamp: ...}
  if (data && typeof data === 'object' && !Array.isArray(data) && 'value' in data) {
    const extracted = data.value;
    return Array.isArray(extracted) ? extracted : (extracted ? [] : []);
  }
  return Array.isArray(data) ? data : [];
};

class StorageService {
  private config: StorageConfig = {
    type: 'local',
  };

  // Debug flag - set to true to enable storage logs
  private DEBUG = false;

  private syncInProgress = false;
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private autoSyncEnabled = false;
  private autoSyncIntervalMs = 600000; // OPTIMIZED: 10 minutes
  private syncStatus: SyncStatus = 'idle';
  private syncStatusListeners: ((status: SyncStatus) => void)[] = [];
  private retryCount = 0;
  private maxRetries = 2; // OPTIMIZED: reduced retries
  private baseRetryDelay = 2000;
  private fetchTimeout = 3000; // OPTIMIZED: 3s timeout
  private storageEventName = 'app-storage-changed';
  
  // SMART CACHING: Cache metadata untuk avoid unnecessary requests
  private cacheMetadata = new Map<string, { timestamp: number; etag?: string; size?: number }>();
  private CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  private lastSyncTime = new Map<string, number>();
  private MIN_SYNC_INTERVAL = 30000; // 30 seconds

  // Debug logger
  private log(...args: any[]) {
    if (this.DEBUG) {
      console.log(...args);
    }
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
      // Server storage - load from local first, sync in background
      const localValueStr = localStorage.getItem(storageKey);
      let localValue = null;
      
      if (localValueStr) {
        try {
          const localParsed = JSON.parse(localValueStr);
          localValue = (localParsed.value !== undefined) ? localParsed.value : localParsed;
        } catch (error) {
          console.error(`[Storage.get] Error parsing local storage for ${key}:`, error);
        }
      }
      
      // Return local value immediately
      if (localValue !== null) {
        return localValue;
      }
      
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
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
    
    const normalizedValue = normalizeValue(value);
    
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
    }
  }

  async remove(key: string): Promise<void> {
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
    
    console.log(`[Storage.removeItem] Marked item ${itemId} as deleted in ${key} (tombstone pattern)`);
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
      console.log(`[Storage.cleanupDeletedItems] Cleaned up ${currentData.length - cleanedData.length} tombstones from ${key}`);
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

  async syncToServer(): Promise<void> {
    // Placeholder implementation for server sync
    // This would contain the actual sync logic to server
    this.setSyncStatus('syncing');
    
    try {
      // Simulate sync operation
      await new Promise(resolve => setTimeout(resolve, 100));
      this.setSyncStatus('synced');
    } catch (error) {
      this.setSyncStatus('error');
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
        console.log(`[Storage.forceReloadFromFile] Loading ${key} from file...`);
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
          
          console.log(`[Storage.forceReloadFromFile] Loaded ${Array.isArray(finalData) ? finalData.length : 'non-array'} items from file`);
          
          // Force update localStorage with file data
          const dataWithTimestamp = {
            value: finalData,
            timestamp: Date.now(),
            _timestamp: Date.now(),
            forceReloadedFromFile: true,
            fileReloadedAt: new Date().toISOString()
          };
          
          localStorage.setItem(storageKey, JSON.stringify(dataWithTimestamp));
          console.log(`[Storage.forceReloadFromFile] Updated localStorage for ${key}`);
          
          // Dispatch storage change event
          this.dispatchStorageEvent(storageKey, finalData);
          
          return finalData;
        } else {
          console.error(`[Storage.forceReloadFromFile] Failed to load ${key}: ${result.error}`);
        }
      } catch (error: any) {
        console.error(`[Storage.forceReloadFromFile] Error loading ${key}:`, error);
      }
    } else {
      console.warn(`[Storage.forceReloadFromFile] Electron API not available`);
    }
    
    return null;
  }
}

export const storageService = new StorageService();