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
  // Disabled by default untuk performa - hanya log error/warning
  private DEBUG = false;

  private syncInProgress = false;
  private autoSyncInterval: NodeJS.Timeout | null = null;
  private autoSyncEnabled = false;
  private autoSyncIntervalMs = 300000; // Default: sync setiap 5 menit (increased from 30s untuk reduce race conditions)
  private syncStatus: SyncStatus = 'idle';
  private syncStatusListeners: ((status: SyncStatus) => void)[] = [];
  private retryCount = 0;
  private maxRetries = 3;
  private baseRetryDelay = 1000; // 1 second
  private fetchTimeout = 10000; // 10 seconds timeout untuk fetch request
  private storageEventName = 'app-storage-changed';

  // Debug logger - only logs when DEBUG is true
  private log(...args: any[]) {
    if (this.DEBUG) {
      console.log(...args);
    }
  }
  
  // Get last sync timestamp from localStorage (persistent)
  private getLastSyncTimestamp(): number {
    const saved = localStorage.getItem('last_sync_timestamp');
    return saved ? parseInt(saved, 10) : 0;
  }
  
  // Save last sync timestamp to localStorage (persistent)
  private setLastSyncTimestamp(timestamp: number): void {
    localStorage.setItem('last_sync_timestamp', timestamp.toString());
  }

  // Get current business context
  getBusinessContext(): BusinessType {
    const selected = localStorage.getItem('selectedBusiness');
    if (selected === 'general-trading' || selected === 'trucking') {
      return selected;
    }
    // Default to packaging for backward compatibility
    return 'packaging';
  }

  // Get storage key with business context prefix
  private getStorageKey(key: string, forServer: boolean = false): string {
    const business = this.getBusinessContext();
    // Packaging tetap pakai key asli untuk backward compatibility
    if (business === 'packaging') {
      return key;
    }
    // For server mode: use normalized key (no path prefix) because server stores data with normalized keys
    // For local mode: use prefix for localStorage/file storage organization
    if (forServer) {
      return key; // Server already stores with normalized keys (e.g., "gt_products" not "general-trading/gt_products")
    }
    // General Trading dan Trucking pakai prefix untuk local storage
    return `${business}/${key}`;
  }

  async setConfig(config: StorageConfig) {
    const oldConfig = this.config;
    this.config = config;
    localStorage.setItem('storage_config', JSON.stringify(config));
    
    if (config.type === 'server' && config.serverUrl) {
      // If switching from local to server, reset sync timestamp to force full sync
      if (oldConfig.type === 'local') {
        this.setLastSyncTimestamp(0); // Reset to force full sync of all local data
      }
      // Push all local data to server first
      await this.syncToServer();
      // Start auto-sync dari server ke client (will also push local changes periodically)
      this.startAutoSync();
    } else {
      // Stop auto-sync jika mode local
      this.stopAutoSync();
    }
  }

  // Start auto-sync dari server ke client (polling) - PUBLIC METHOD
  startAutoSync() {
    if (this.autoSyncEnabled) return; // Already running
    
    const config = this.getConfig();
    if (config.type !== 'server' || !config.serverUrl) return;
    
    this.autoSyncEnabled = true;
    this.log(`🔄 Auto-sync started (polling every ${this.autoSyncIntervalMs}ms)`);
    
    // CRITICAL: Reset last sync timestamp untuk force full sync saat pertama kali
    // Ini memastikan user baru atau user yang datanya belum ter-update akan dapat semua data dari server
    const lastSyncTimestamp = this.getLastSyncTimestamp();
    if (lastSyncTimestamp === 0) {
      this.log('🔄 First sync detected - will pull all data from server');
    }
    
    // Sync TO server first (push local data to server)
    this.syncToServer().then(() => {
      this.log('✅ Initial sync to server completed');
      // Then sync FROM server (pull server data to local)
      // Ini akan pull semua data jika lastSyncTimestamp === 0 (user baru atau belum pernah sync)
      this.syncFromServer().then(() => {
        this.log('✅ Initial sync from server completed - all data should be available');
      }).catch((error) => {
        console.error('❌ Initial sync from server failed:', error);
      });
    }).catch((error) => {
      console.error('❌ Initial sync to server failed:', error);
      // Still try to sync from server even if push failed
      // Ini penting untuk user baru yang belum punya data local
      this.syncFromServer().then(() => {
        this.log('✅ Sync from server completed after push failure - all data should be available');
      }).catch((syncError) => {
        console.error('❌ Sync from server also failed:', syncError);
      });
    });
    
    // Then sync periodically: BOTH push to server AND pull from server
    // This ensures local updates are pushed to server, and server updates are pulled to local
    // Use setTimeout dengan requestIdleCallback untuk tidak blocking UI
    this.autoSyncInterval = setInterval(() => {
      if (this.autoSyncEnabled) {
        // Sync di background tanpa blocking UI
        if (typeof window !== 'undefined' && (window as any).requestIdleCallback) {
          (window as any).requestIdleCallback(() => {
            this.syncToServer().then(() => {
              this.syncFromServer();
            }).catch((error) => {
              this.log('Auto-sync push failed, still pulling from server:', error);
              this.syncFromServer();
            });
          }, { timeout: 5000 });
        } else {
          // Fallback untuk browser yang tidak support requestIdleCallback
          setTimeout(() => {
            this.syncToServer().then(() => {
              this.syncFromServer();
            }).catch((error) => {
              this.log('Auto-sync push failed, still pulling from server:', error);
              this.syncFromServer();
            });
          }, 0);
        }
      }
    }, this.autoSyncIntervalMs);
  }

  // Stop auto-sync - PUBLIC METHOD
  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
    this.autoSyncEnabled = false;
  }

  // Set auto-sync interval (in milliseconds) - PUBLIC METHOD
  setAutoSyncInterval(ms: number) {
    this.autoSyncIntervalMs = ms;
    // Restart dengan interval baru jika sedang running
    if (this.autoSyncEnabled) {
      this.stopAutoSync();
      this.startAutoSync();
    }
  }

  // Check if auto-sync is enabled - PUBLIC METHOD
  isAutoSyncEnabled(): boolean {
    return this.autoSyncEnabled;
  }

  // Get current sync status - PUBLIC METHOD
  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  // Subscribe to sync status changes - PUBLIC METHOD
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.syncStatusListeners.push(callback);
    // Return unsubscribe function
    return () => {
      const index = this.syncStatusListeners.indexOf(callback);
      if (index > -1) {
        this.syncStatusListeners.splice(index, 1);
      }
    };
  }

  // Update sync status and notify listeners - PRIVATE METHOD
  private setSyncStatus(status: SyncStatus) {
    this.syncStatus = status;
    this.syncStatusListeners.forEach(listener => listener(status));
  }

  // Check if key belongs to current business context - PRIVATE METHOD
  private isKeyForCurrentBusiness(key: string): boolean {
    const business = this.getBusinessContext();
    
    // Packaging: no prefix
    if (business === 'packaging') {
      // Only sync keys without prefix (packaging data)
      return !key.includes('/') || key.startsWith('storage_config');
    }
    
    // General Trading & Trucking: must have prefix
    const prefix = `${business}/`;
    return key.startsWith(prefix) || key.startsWith('storage_config');
  }

  getConfig(): StorageConfig {
    const saved = localStorage.getItem('storage_config');
    if (saved) {
      const config = JSON.parse(saved);
      // Normalize serverUrl: trim spaces and ensure proper format
      if (config.serverUrl) {
        config.serverUrl = config.serverUrl.trim().replace(/\s+/g, ''); // Remove all spaces
        
        // Remove port from Tailscale funnel URLs (they don't need port)
        const isTailscaleFunnel = config.serverUrl.includes('tailscale') || 
                                  config.serverUrl.includes('tail') || 
                                  config.serverUrl.includes('.ts.net');
        
        if (isTailscaleFunnel) {
          // Remove port if present (e.g., :8888)
          config.serverUrl = config.serverUrl.replace(/:\d+(\/|$)/, '$1');
          // Ensure it uses https://
          if (!config.serverUrl.startsWith('https://')) {
            config.serverUrl = config.serverUrl.replace(/^http:\/\//, 'https://');
          }
        } else {
          // Ensure it starts with http:// for non-Tailscale
          if (!config.serverUrl.startsWith('http://') && !config.serverUrl.startsWith('https://')) {
            config.serverUrl = `http://${config.serverUrl}`;
          }
        }
      }
      return config;
    }
    return this.config;
  }

  async get<T>(key: string, retryCount: number = 0): Promise<T | null> {
    const config = this.getConfig();
    const storageKey = this.getStorageKey(key);
    const maxRetries = 3;
    const retryDelay = 100 * Math.pow(2, retryCount); // Exponential backoff: 100ms, 200ms, 400ms
    
    if (config.type === 'local') {
      // Try file-based storage first (if Electron)
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.loadStorage) {
        try {
          const result = await electronAPI.loadStorage(storageKey);
          if (result.success && result.data !== null) {
            const data = result.data;
            // Extract value if wrapped with timestamp or value wrapper
            let finalData = (data.value !== undefined) ? data.value : data;
            
            // Normalize data untuk ensure padCode selalu ter-include
            // IMPORTANT: BOM objects tidak perlu padCode, hanya products dan inventory items
            if (Array.isArray(finalData)) {
              finalData = finalData.map((item: any) => {
                if (item && typeof item === 'object') {
                  // Skip normalization untuk BOM objects (tidak punya padCode field)
                  // BOM objects hanya punya: id, product_id, material_id, ratio
                  const isBOMObject = item.product_id !== undefined && item.material_id !== undefined && 
                                     !('padCode' in item) && !('nama' in item) && !('kode' in item) && 
                                     !('harga' in item) && !('hargaFg' in item) && !('hargaSales' in item);
                  
                  if (isBOMObject) {
                    // BOM object - jangan tambahkan padCode
                    return item;
                  }
                  
                  // Ensure padCode is always present (even if empty string) untuk products dan inventory items
                  if (!('padCode' in item)) {
                    return { ...item, padCode: '' };
                  }
                }
                return item;
              });
            }
            
            // Reduced logging untuk performa - hanya log jika DEBUG mode
            this.log(`[Storage.get] Loaded ${key} (${storageKey}) from file: ${Array.isArray(finalData) ? finalData.length : 'object'} items`);
            return finalData;
          } else {
            // File doesn't exist or returned null - skip retry untuk file yang memang tidak ada (normal)
            // Only retry jika file locked atau error yang bisa recover
            if (retryCount < maxRetries && result.success && result.error && result.error.includes('locked')) {
              this.log(`[Storage.get] File storage locked for ${key}, retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              return this.get<T>(key, retryCount + 1);
            }
            // Don't log error if file doesn't exist (that's normal for optional data)
            // Only log if it's an unexpected error (result.success === false)
            if (!result.success && result.error && !result.error.includes('not found') && !result.error.includes('ENOENT')) {
              console.warn(`[Storage.get] File storage failed for ${key} (${storageKey}): ${result.error || 'Unknown error'}`);
            }
          }
        } catch (error: any) {
          // Retry on file lock or temporary errors only
          if (retryCount < maxRetries && (error.code === 'EBUSY' || error.code === 'EAGAIN' || error.message?.includes('locked'))) {
            this.log(`[Storage.get] File locked for ${key}, retrying in ${retryDelay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            return this.get<T>(key, retryCount + 1);
          }
          // Don't log ENOENT (file not found) - itu normal untuk optional data
          if (error.code !== 'ENOENT') {
            console.error(`[Storage.get] File storage error for ${key} (${storageKey}):`, error);
          }
        }
      }
      
      // Fallback to localStorage (instant, no retry needed)
      const value = localStorage.getItem(storageKey);
      if (value) {
        try {
          const parsed = JSON.parse(value);
          // Extract value if wrapped with timestamp
          let finalData = (parsed.value !== undefined) ? parsed.value : parsed;
          
          // Normalize data untuk ensure padCode selalu ter-include
          // IMPORTANT: BOM objects tidak perlu padCode, hanya products dan inventory items
          if (Array.isArray(finalData)) {
            finalData = finalData.map((item: any) => {
              if (item && typeof item === 'object') {
                // Skip normalization untuk BOM objects (tidak punya padCode field)
                const isBOMObject = item.product_id !== undefined && item.material_id !== undefined && 
                                   !('padCode' in item) && !('nama' in item) && !('kode' in item) && 
                                   !('harga' in item) && !('hargaFg' in item) && !('hargaSales' in item);
                
                if (isBOMObject) {
                  // BOM object - jangan tambahkan padCode
                  return item;
                }
                
                // Ensure padCode is always present (even if empty string) untuk products dan inventory items
                if (!('padCode' in item)) {
                  return { ...item, padCode: '' };
                }
              }
              return item;
            });
          }
          
          // Reduced logging untuk performa
          this.log(`[Storage.get] Loaded ${key} (${storageKey}) from localStorage: ${Array.isArray(finalData) ? finalData.length : 'object'} items`);
          return finalData;
        } catch (error) {
          console.error(`[Storage.get] Error parsing localStorage for ${key}:`, error);
        }
      }
      // Return null silently if no data found (normal for optional/empty data)
      return null;
    } else {
      // Server storage - LOAD FROM LOCAL FIRST, then sync from server in background
      const serverKey = this.getStorageKey(key, true); // true = for server
      
      // STEP 1: Load from local storage first (instant response)
      const localValueStr = localStorage.getItem(storageKey);
      let localValue = null;
      let localTimestamp = 0;
      
      if (localValueStr) {
        try {
          const localParsed = JSON.parse(localValueStr);
          localValue = (localParsed.value !== undefined) ? localParsed.value : localParsed;
          localTimestamp = localParsed.timestamp || localParsed._timestamp || 0;
        } catch (error) {
          console.error(`[Storage.get] Error parsing local storage for ${key}:`, error);
        }
      }
      
      // STEP 2: Return local value immediately (if available)
      // This ensures UI loads instantly without waiting for server
      if (localValue !== null) {
        // Sync from server in background (don't wait)
        this.syncFromServerBackground(key, serverKey, storageKey, localValue, localTimestamp).catch((error) => {
          // Silent fail - local data already returned
          console.warn(`[Storage.get] Background sync failed for ${key}:`, error);
        });
        return localValue;
      }
      
      // STEP 3: If no local data, try fetch from server with timeout (non-blocking)
      // IMPORTANT: Jangan blocking UI, return null/empty dulu, sync di background
      // Sync dari server di background saja, tidak blocking
      this.syncFromServerBackground(key, serverKey, storageKey, null, 0).catch((error) => {
        // Silent fail - return null/empty array
        console.warn(`[Storage.get] Background fetch from server failed for ${key}:`, error.message || error);
      });
      
      // Return null/empty immediately (don't wait for server)
      // Server sync akan update localStorage di background jika berhasil
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const config = this.getConfig();
    const storageKey = this.getStorageKey(key);
    
    // 🚀 OPTIMASI: Cek apakah data benar-benar berubah sebelum generate timestamp baru
    // Ini mencegah timestamp berubah meskipun data tidak berubah (yang bisa menyebabkan sync issue)
    const existingData = localStorage.getItem(storageKey);
    let existingTimestamp: number | null = null;
    let dataChanged = true;
    
    if (existingData) {
      try {
        const parsed = JSON.parse(existingData);
        existingTimestamp = parsed.timestamp || parsed._timestamp || null;
        
        // Compare data (exclude timestamp fields)
        const existingValue = parsed.value;
        
        // Normalize data untuk comparison - ensure padCode is always included
        // IMPORTANT: BOM objects tidak perlu padCode, hanya products dan inventory items
        const normalizeForComparison = (data: any): any => {
          if (Array.isArray(data)) {
            return data.map(item => {
              if (item && typeof item === 'object') {
                // Skip normalization untuk BOM objects (tidak punya padCode field)
                const isBOMObject = item.product_id !== undefined && item.material_id !== undefined && 
                                   !('padCode' in item) && !('nama' in item) && !('kode' in item) && 
                                   !('harga' in item) && !('hargaFg' in item) && !('hargaSales' in item);
                
                if (isBOMObject) {
                  // BOM object - jangan tambahkan padCode
                  return item;
                }
                
                // Ensure padCode is always present (even if empty string) untuk products dan inventory items
                const normalized = { ...item };
                if (!('padCode' in normalized)) {
                  normalized.padCode = '';
                }
                return normalized;
              }
              return item;
            });
          }
          return data;
        };
        
        const normalizedExisting = normalizeForComparison(existingValue);
        const normalizedNew = normalizeForComparison(value);
        
        if (JSON.stringify(normalizedExisting) === JSON.stringify(normalizedNew)) {
          // Data tidak berubah, gunakan timestamp yang lama
          dataChanged = false;
        }
      } catch (e) {
        // Jika parse error, anggap data berubah
        dataChanged = true;
      }
    }
    
    // Hanya generate timestamp baru jika data benar-benar berubah
    const timestamp = dataChanged ? Date.now() : (existingTimestamp || Date.now());
    
    // Normalize value untuk ensure padCode selalu ter-include
    // IMPORTANT: BOM objects tidak perlu padCode, hanya products dan inventory items
    const normalizeValue = (val: any): any => {
      if (Array.isArray(val)) {
        return val.map(item => {
          if (item && typeof item === 'object') {
            // Skip normalization untuk BOM objects (tidak punya padCode field)
            // BOM objects hanya punya: id, product_id, material_id, ratio
            const isBOMObject = item.product_id !== undefined && item.material_id !== undefined && 
                               !('padCode' in item) && !('nama' in item) && !('kode' in item) && 
                               !('harga' in item) && !('hargaFg' in item) && !('hargaSales' in item);
            
            if (isBOMObject) {
              // BOM object - jangan tambahkan padCode
              return item;
            }
            
            // Ensure padCode is always present (even if empty string) untuk products dan inventory items
            const normalized = { ...item };
            if (!('padCode' in normalized)) {
              normalized.padCode = '';
            }
            return normalized;
          }
          return item;
        });
      }
      return val;
    };
    
    const normalizedValue = normalizeValue(value);
    
    // Prepare data with timestamp
    const dataWithTimestamp = {
      value: normalizedValue,
      timestamp,
      _timestamp: timestamp, // Backward compatibility
    };
    
    // Always save to local first (for offline support)
    const electronAPI = (window as any).electronAPI;
    if (electronAPI && electronAPI.saveStorage) {
      try {
        await electronAPI.saveStorage(storageKey, dataWithTimestamp);
      } catch (error) {
        console.error('File storage error, falling back to localStorage:', error);
      }
    }
    
    // Hanya update localStorage dan push ke server jika data berubah
    if (dataChanged) {
      localStorage.setItem(storageKey, JSON.stringify(dataWithTimestamp));
      this.dispatchStorageEvent(storageKey, value);
      
      // If server mode is active, also push to server (async, don't wait)
      // Hanya push jika data benar-benar berubah
      if (config.type === 'server' && config.serverUrl) {
      const serverKey = this.getStorageKey(key, true); // true = for server (normalized key)
      
      // IMPORTANT: Kirim semua data termasuk deleted items (tombstone pattern)
      // Deleted items perlu di-sync ke server agar device lain tahu ada yang di-delete
      // Server akan terima data dengan flag deleted: true atau deletedAt
      let valueToSend: any = value;
      
      // Kirim semua data termasuk deleted items untuk tombstone sync
      // Device lain perlu tahu tentang deletions untuk sync yang benar
      if (Array.isArray(value)) {
        // Kirim semua items termasuk yang deleted (tombstone pattern)
        // Device lain akan filter deleted items saat display, tapi tetap simpan untuk sync
        valueToSend = value; // Keep all items including deleted ones
      } else if (value && typeof value === 'object' && (value as any).deleted) {
        // Single object yang di-delete - tetap kirim ke server untuk tombstone sync
        // Device lain perlu tahu bahwa object ini sudah di-delete
        this.log(`[Storage] Pushing deleted single object ${key} to server (tombstone)`);
        // Continue to push deleted object
      }
      
      // Push to server asynchronously (don't block UI)
      fetch(`${config.serverUrl}/api/storage/${serverKey}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ value: valueToSend, timestamp }),
        mode: 'cors', // Explicit CORS mode for Android WebView compatibility
        credentials: 'omit', // Don't send credentials
      }).then(async (response) => {
        if (response.ok) {
          const result = await response.json();
          // Update local timestamp with server's timestamp (might be different after merge)
          const finalTimestamp = result.timestamp || timestamp;
          const finalData = {
            value, // Keep original value with deleted items for tombstone
            timestamp: finalTimestamp,
            _timestamp: finalTimestamp,
          };
          // Update local storage with server's timestamp
          localStorage.setItem(storageKey, JSON.stringify(finalData));
          if (electronAPI && electronAPI.saveStorage) {
            try {
              await electronAPI.saveStorage(storageKey, finalData);
            } catch (error) {
              // Silent fail for file update
            }
          }
        } else {
          // Get error details for better debugging
          let errorText = '';
          try {
            const errorData = await response.text();
            errorText = errorData ? `: ${errorData.substring(0, 200)}` : '';
          } catch (e) {
            // Ignore error reading response
          }
          console.warn(`[Storage] Failed to push ${key} to server: ${response.status}${errorText}`);
          // Data already saved locally, will be synced later by auto-sync
          // Don't throw error - data is saved locally, sync will retry
        }
      }).catch((error) => {
        console.warn(`[Storage] Error pushing ${key} to server:`, error);
        // Data already saved locally, will be synced later by auto-sync
        // Don't throw error - data is saved locally, sync will retry
      });
      }
    } else {
      // Data tidak berubah, tidak perlu dispatch event atau push ke server
      // Tapi tetap update localStorage untuk memastikan timestamp konsisten (jika ada perubahan timestamp dari server)
      localStorage.setItem(storageKey, JSON.stringify(dataWithTimestamp));
    }
  }

  async remove(key: string): Promise<void> {
    const config = this.getConfig();
    const storageKey = this.getStorageKey(key);
    
    if (config.type === 'local') {
      // Try file-based storage first (if Electron)
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.deleteStorage) {
        try {
          await electronAPI.deleteStorage(storageKey);
        } catch (error) {
          console.error('File storage delete error:', error);
        }
      }
      
      // Also remove from localStorage
      localStorage.removeItem(storageKey);
      this.dispatchStorageEvent(storageKey, null);
    } else {
      // Server storage - use normalized key (no path prefix)
      const serverKey = this.getStorageKey(key, true); // true = for server
      try {
        await fetch(`${config.serverUrl}/api/storage/${serverKey}`, {
          method: 'DELETE',
          mode: 'cors', // Explicit CORS mode for Android WebView compatibility
          credentials: 'omit', // Don't send credentials
          headers: {
            'Accept': 'application/json',
          },
        });
        localStorage.removeItem(storageKey);
        this.dispatchStorageEvent(storageKey, null);
      } catch (error) {
        console.error('Server storage error:', error);
        localStorage.removeItem(storageKey);
        this.dispatchStorageEvent(storageKey, null);
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

  // Debounce untuk storage events - prevent terlalu banyak events
  private eventDebounceTimer: NodeJS.Timeout | null = null;
  private pendingEvents: Map<string, any> = new Map();
  
  private dispatchStorageEvent(key: string, value: any) {
    if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') {
      return;
    }
    
    // Store pending event
    this.pendingEvents.set(key, value);
    
    // Clear existing timer
    if (this.eventDebounceTimer) {
      clearTimeout(this.eventDebounceTimer);
    }
    
    // Debounce: batch events dalam 50ms untuk prevent terlalu banyak events
    this.eventDebounceTimer = setTimeout(() => {
      try {
        // Dispatch semua pending events sekaligus
        this.pendingEvents.forEach((eventValue, eventKey) => {
          const event = new CustomEvent(this.storageEventName, {
            detail: {
              key: eventKey,
              value: eventValue,
            },
          });
          window.dispatchEvent(event);
        });
        
        // Clear pending events
        this.pendingEvents.clear();
        this.eventDebounceTimer = null;
      } catch (error) {
        console.error('Failed to dispatch storage event:', error);
      }
    }, 50); // Debounce 50ms untuk batch events
  }

  async syncToServer(): Promise<void> {
    if (this.syncInProgress) return;
    this.syncInProgress = true;
    this.setSyncStatus('syncing');

    try {
      const config = this.getConfig();
      if (!config.serverUrl) {
        this.setSyncStatus('idle');
        return;
      }

      // Get only changed data since last sync (incremental sync)
      // For first sync, sync all data
      const localData: Record<string, any> = {};
      const timestamps: Record<string, number> = {};
      
      // Helper function to process a key-value pair
      const processKeyValue = (key: string, valueStr: string | null, source: 'localStorage' | 'fileStorage') => {
        if (!key || key.startsWith('storage_config')) return;
        
        // Filter by business context
        if (!this.isKeyForCurrentBusiness(key)) {
          return;
        }
        
        // Normalize key: remove path separators (e.g., "general-trading/gt_products" -> "gt_products")
        let normalizedKey = key;
        if (key.includes('/')) {
          const parts = key.split('/');
          normalizedKey = parts[parts.length - 1];
          this.log(`[Storage] Normalizing sync key: "${key}" -> "${normalizedKey}"`);
        }
        // Remove .json extension if present
        normalizedKey = normalizedKey.replace(/\.json$/, '');
        
        // Ensure key doesn't contain path separators (safety check)
        if (normalizedKey.includes('/')) {
          console.warn(`[Storage] Key still contains path separator: "${normalizedKey}", fixing...`);
          normalizedKey = normalizedKey.split('/').pop() || normalizedKey;
        }
        
        if (!valueStr) return;
        
        let parsed: any;
        let value: any;
        let timestamp: number;
        
        try {
          // If valueStr is already an object (from file storage), use it directly
          if (typeof valueStr === 'object') {
            parsed = valueStr;
          } else {
            parsed = JSON.parse(valueStr);
          }
          
          // Handle both wrapped format {value, timestamp} and direct values
          if (parsed && typeof parsed === 'object' && parsed.value !== undefined) {
            value = parsed.value;
            timestamp = parsed.timestamp || parsed._timestamp || Date.now();
          } else if (parsed && typeof parsed === 'object' && (parsed.timestamp || parsed._timestamp)) {
            // Has timestamp but no value wrapper
            value = parsed;
            timestamp = parsed.timestamp || parsed._timestamp || Date.now();
          } else {
            // Direct value (string, number, etc.)
            value = parsed;
            timestamp = Date.now();
          }
        } catch (e) {
          // If not valid JSON, treat as string
          value = valueStr;
          timestamp = Date.now();
        }
        
        // Sync strategy: 
        // 1. If first sync (lastSyncTimestamp === 0), sync ALL data
        // 2. If data is newer than last sync, sync it (incremental)
        // 3. Also sync if we're not sure (timestamp is 0 or missing) - this handles offline data
        const lastSyncTimestamp = this.getLastSyncTimestamp();
        const shouldSync = lastSyncTimestamp === 0 || // First sync: sync all
                          timestamp > lastSyncTimestamp || // Data is newer than last sync
                          timestamp === 0 || // No timestamp (old data or offline data) - sync to be safe
                          !timestamp; // Missing timestamp - sync to be safe
        
        if (shouldSync) {
          // Use normalized key for server sync
          localData[normalizedKey] = value;
          timestamps[normalizedKey] = timestamp || Date.now(); // Use current time if timestamp missing
        }
      };
      
      // Try to load from file storage first (if Electron)
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.loadAllStorage) {
        try {
          const result = await electronAPI.loadAllStorage();
          if (result.success && result.data) {
            const allFileData = result.data;
            const fileKeys = Object.keys(allFileData);
            // Reduced logging untuk performa
      // console.log(`[Storage] Found ${fileKeys.length} keys in file storage: ${fileKeys.slice(0, 10).join(', ')}${fileKeys.length > 10 ? '...' : ''}`);
            
            for (const fileKey of fileKeys) {
              try {
                const fileData = allFileData[fileKey];
                // fileData might be wrapped {value, timestamp} or direct value
                const valueStr = typeof fileData === 'string' ? fileData : JSON.stringify(fileData);
                processKeyValue(fileKey, valueStr, 'fileStorage');
              } catch (error: any) {
                console.warn(`[Storage] Error processing file storage key ${fileKey}:`, error);
              }
            }
          }
        } catch (error) {
          console.warn('[Storage] Error loading all file storage:', error);
        }
      }
      
      // Also scan localStorage (fallback or for browser mode)
      // Note: localStorage might have different keys than file storage (e.g., prefixed keys)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const valueStr = localStorage.getItem(key);
          // Normalize key untuk check apakah sudah ada
          let normalizedKey = key;
          if (key.includes('/')) {
            const parts = key.split('/');
            normalizedKey = parts[parts.length - 1];
          }
          normalizedKey = normalizedKey.replace(/\.json$/, '');
          
          // Skip if already processed from file storage (check normalized key)
          if (!localData[normalizedKey] && !timestamps[normalizedKey]) {
            processKeyValue(key, valueStr, 'localStorage');
          }
        }
      }
      
      // Handle signedDocumentPath: upload file to server and get server path
      // This is needed for PDF files that are stored locally but need to be synced to server
      if (localData['delivery'] && Array.isArray(localData['delivery']) && config.serverUrl) {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI && electronAPI.loadUploadedFile) {
          try {
            // Process each delivery item that has signedDocumentPath
            const processedDelivery = await Promise.all(localData['delivery'].map(async (item: any) => {
              // If item has signedDocumentPath but no serverSignedDocumentPath, upload the file
              if (item.signedDocumentPath && !item.serverSignedDocumentPath) {
                try {
                  console.log(`[Storage] 📤 Uploading file to server: ${item.signedDocumentPath}`);
                  // Load file from local path
                  const fileResult = await electronAPI.loadUploadedFile(item.signedDocumentPath);
                  if (fileResult && fileResult.success && fileResult.data) {
                    console.log(`[Storage] ✅ File loaded from local path, size: ${fileResult.data.length} chars`);
                    // Upload file to server
                    const uploadUrl = `${config.serverUrl}/api/storage/upload-file`;
                    console.log(`[Storage] 📤 Uploading to: ${uploadUrl}`);
                    const uploadResponse = await fetch(uploadUrl, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify({
                        base64Data: fileResult.data,
                        fileName: item.signedDocumentName || 'document.pdf',
                        fileType: item.signedDocumentType || 'pdf',
                      }),
                    });
                    
                    if (uploadResponse.ok) {
                      const uploadResult = await uploadResponse.json();
                      console.log(`[Storage] ✅ Upload result:`, uploadResult);
                      if (uploadResult.success && uploadResult.filePath) {
                        // Update item with server file path
                        console.log(`[Storage] ✅ File uploaded successfully: ${uploadResult.filePath}`);
                        const updatedItem = {
                          ...item,
                          serverSignedDocumentPath: uploadResult.filePath, // Server file path
                          serverSignedDocumentName: uploadResult.fileName,
                          // Keep local signedDocumentPath for local reference
                          // Don't include base64 in sync data (file is already on server)
                        };
                        
                        // IMPORTANT: Save updated item back to local storage so serverSignedDocumentPath is persisted
                        try {
                          const allDeliveries = await storageService.get<any[]>('delivery') || [];
                          const updatedDeliveries = allDeliveries.map((d: any) => 
                            d.id === item.id ? updatedItem : d
                          );
                          await storageService.set('delivery', updatedDeliveries);
                          console.log(`[Storage] ✅ Saved serverSignedDocumentPath to local storage for delivery ${item.id}`);
                        } catch (saveError: any) {
                          console.warn(`[Storage] ⚠️ Failed to save serverSignedDocumentPath to local storage:`, saveError);
                          // Continue anyway - at least sync will have the updated data
                        }
                        
                        return updatedItem;
                      } else {
                        console.warn(`[Storage] ⚠️ Upload response OK but no filePath:`, uploadResult);
                      }
                    } else {
                      const errorText = await uploadResponse.text();
                      console.error(`[Storage] ❌ Failed to upload file to server: ${uploadResponse.status} ${uploadResponse.statusText}`);
                      console.error(`[Storage] Error response:`, errorText);
                    }
                  } else {
                    console.warn(`[Storage] ⚠️ Failed to load file from local path:`, fileResult);
                  }
                } catch (fileError: any) {
                  console.error(`[Storage] ❌ Failed to process file from path ${item.signedDocumentPath}:`, fileError);
                  console.error(`[Storage] Error stack:`, fileError.stack);
                  // Continue without file upload - at least sync the metadata
                }
              }
              return item;
            }));
            localData['delivery'] = processedDelivery;
          } catch (error: any) {
            console.warn('[Storage] Error processing delivery signedDocumentPath:', error);
            // Continue with original data if processing fails
          }
        }
      }

      // Reduced logging untuk performa - hanya log jika ada perubahan signifikan
      if (Object.keys(localData).length > 0) {
        this.log(`[Storage] Total keys to sync: ${Object.keys(localData).length}`);
        this.log(`[Storage] Keys: ${Object.keys(localData).slice(0, 5).join(', ')}${Object.keys(localData).length > 5 ? '...' : ''}`);
      }

      // Only sync if there's data to sync
      if (Object.keys(localData).length > 0) {
        // Sync to server with timestamps (with retry)
        await this.syncToServerWithRetry(config.serverUrl, localData, timestamps);
        this.setLastSyncTimestamp(Date.now()); // Update last sync timestamp (persistent)
      }
      
      this.retryCount = 0; // Reset retry count on success
      this.setSyncStatus('synced');
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const isConnectionError = errorMessage?.includes('timeout') || 
                                errorMessage?.includes('Koneksi gagal') || 
                                errorMessage?.includes('Connection timeout') ||
                                errorMessage?.includes('ERR_CONNECTION_TIMED_OUT') ||
                                errorMessage?.includes('Failed to fetch') ||
                                errorMessage?.includes('NetworkError');
      
      if (isConnectionError) {
        console.warn(`⚠️ Sync error (connection): ${errorMessage}`);
        this.setSyncStatus('error');
        // Untuk connection error, kurangi retry atau skip retry jika sudah terlalu banyak
        if (this.retryCount < this.maxRetries) {
          const delay = this.baseRetryDelay * Math.pow(2, this.retryCount);
          this.retryCount++;
          setTimeout(() => {
            this.syncInProgress = false;
            this.syncToServer();
          }, delay);
          return; // Don't reset syncInProgress yet
        } else {
          this.retryCount = 0; // Reset after max retries
        }
      } else {
        // Error lainnya (bukan connection error)
        this.setSyncStatus('error');
        // Retry dengan exponential backoff
        if (this.retryCount < this.maxRetries) {
          const delay = this.baseRetryDelay * Math.pow(2, this.retryCount);
          this.retryCount++;
          setTimeout(() => {
            this.syncInProgress = false;
            this.syncToServer();
          }, delay);
          return; // Don't reset syncInProgress yet
        } else {
          this.retryCount = 0; // Reset after max retries
        }
      }
    } finally {
      if (this.retryCount === 0) {
        this.syncInProgress = false;
      }
    }
  }

  // Helper method for sync with retry
  private async syncToServerWithRetry(serverUrl: string, localData: Record<string, any>, _timestamps: Record<string, number>): Promise<void> {
    // CRITICAL: Ensure localData is a valid object
    if (!localData || typeof localData !== 'object' || Array.isArray(localData)) {
      console.warn('[Storage] Invalid localData format in syncToServerWithRetry:', typeof localData, Array.isArray(localData));
      return;
    }
    
    // Ensure all keys are normalized (no path separators) - safety check
    // IMPORTANT: Filter out deleted items before sending to server (tombstone pattern)
    const normalizedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(localData)) {
      let normalizedKey = key;
      if (key.includes('/')) {
        const parts = key.split('/');
        normalizedKey = parts[parts.length - 1];
      }
      normalizedKey = normalizedKey.replace(/\.json$/, '');
      if (normalizedKey.includes('/')) {
        normalizedKey = normalizedKey.split('/').pop() || normalizedKey;
      }
      
      // IMPORTANT: Kirim semua data termasuk deleted items (tombstone pattern)
      // Deleted items perlu di-sync ke server agar device lain tahu ada yang di-delete
      let valueToSend = value;
      if (Array.isArray(value)) {
        // Kirim semua items termasuk yang deleted (tombstone pattern)
        // Device lain akan filter deleted items saat display, tapi tetap simpan untuk sync
        valueToSend = value; // Keep all items including deleted ones
      } else if (value && typeof value === 'object' && (value as any).deleted) {
        // Single object yang di-delete - tetap kirim ke server untuk tombstone sync
        this.log(`[Storage] Syncing deleted single object ${normalizedKey} to server (tombstone)`);
        // Continue to sync deleted object
      }
      
      normalizedData[normalizedKey] = valueToSend;
    }
    
    // If data is too large, sync in batches
    const keys = Object.keys(normalizedData);
    const BATCH_SIZE = 20; // Reduce batch size to 20 keys to avoid payload too large
    
    if (keys.length > BATCH_SIZE) {
      for (let i = 0; i < keys.length; i += BATCH_SIZE) {
        const batch = keys.slice(i, i + BATCH_SIZE);
        const batchData: Record<string, any> = {};
        batch.forEach(key => {
          batchData[key] = normalizedData[key];
        });
        
        // Create AbortController untuk timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.fetchTimeout);
        
        try {
          const response = await fetch(`${serverUrl}/api/storage/sync`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ 
              data: batchData,
              timestamp: Date.now(),
            }),
            mode: 'cors', // Explicit CORS mode for Android WebView compatibility
            credentials: 'omit', // Don't send credentials
            signal: controller.signal, // Attach abort signal
          });
          
          clearTimeout(timeoutId); // Clear timeout jika request berhasil
          
          if (!response.ok) {
            if (response.status === 413) {
              throw new Error(`Payload too large. Try syncing smaller batches or increase server body size limit.`);
            }
            throw new Error(`Server responded with status ${response.status}`);
          }
          
          await response.json();
        } catch (error: any) {
          clearTimeout(timeoutId); // Clear timeout jika error
          if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('TIMED_OUT')) {
            throw new Error(`Connection timeout: Server tidak merespons dalam ${this.fetchTimeout}ms. Pastikan server tersedia dan koneksi internet stabil.`);
          }
          if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_TIMED_OUT') || error.message?.includes('NetworkError')) {
            throw new Error(`Koneksi gagal: Server tidak dapat dijangkau. Pastikan server berjalan dan koneksi internet stabil.`);
          }
          throw error; // Re-throw error lainnya
        }
        
      }
    } else {
      // Small data, sync all at once
      // Create AbortController untuk timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.fetchTimeout);
      
      try {
        const response = await fetch(`${serverUrl}/api/storage/sync`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ 
            data: normalizedData,
            timestamp: Date.now(),
          }),
          mode: 'cors', // Explicit CORS mode for Android WebView compatibility
          credentials: 'omit', // Don't send credentials
          signal: controller.signal, // Attach abort signal
        });
        
        clearTimeout(timeoutId); // Clear timeout jika request berhasil
        
        if (!response.ok) {
          if (response.status === 413) {
            throw new Error(`Payload too large. Try syncing smaller batches or increase server body size limit.`);
          }
          throw new Error(`Server responded with status ${response.status}`);
        }
        
        await response.json();
      } catch (error: any) {
        clearTimeout(timeoutId); // Clear timeout jika error
        if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('TIMED_OUT')) {
          throw new Error(`Connection timeout: Server tidak merespons dalam ${this.fetchTimeout}ms. Pastikan server tersedia dan koneksi internet stabil.`);
        }
        if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_TIMED_OUT') || error.message?.includes('NetworkError')) {
          throw new Error(`Koneksi gagal: Server tidak dapat dijangkau. Pastikan server berjalan dan koneksi internet stabil.`);
        }
        throw error; // Re-throw error lainnya
      }
    }
  }

  async syncFromServer(): Promise<void> {
    if (this.syncInProgress) return;
    this.syncInProgress = true;
    this.setSyncStatus('syncing');

    try {
      const config = this.getConfig();
      if (!config.serverUrl) {
        this.log('[Storage] No server URL configured, skipping sync');
        this.setSyncStatus('idle');
        return;
      }

      // Test server connection first with health check
      try {
        const healthUrl = `${config.serverUrl}/health`;
        const healthController = new AbortController();
        const healthTimeoutId = setTimeout(() => healthController.abort(), this.fetchTimeout);
        
        const healthResponse = await fetch(healthUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          mode: 'cors', // Explicit CORS mode for Android WebView compatibility
          credentials: 'omit', // Don't send credentials
          signal: healthController.signal,
        });
        
        clearTimeout(healthTimeoutId);
        
        if (!healthResponse.ok) {
          console.warn(`[Storage] Server health check failed: ${healthResponse.status}`);
          // Continue anyway, might be temporary
        }
      } catch (healthError: any) {
        if (healthError.name === 'AbortError') {
          console.warn(`[Storage] Server health check timeout: Server tidak merespons dalam ${this.fetchTimeout}ms`);
        } else {
          console.warn(`[Storage] Server health check error:`, healthError);
        }
        // Continue anyway, might be temporary
      }

      // Incremental sync: only get data changed since last sync
      const lastSyncTimestamp = this.getLastSyncTimestamp();
      const sinceParam = lastSyncTimestamp > 0 ? `?since=${lastSyncTimestamp}` : '';
      const url = `${config.serverUrl}/api/storage/all${sinceParam}`;
      this.log(`[Storage] Syncing from server: ${url}`);
      
      // Create AbortController untuk timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.fetchTimeout);
      
      let response: Response;
      try {
        response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors', // Explicit CORS mode for Android WebView compatibility
          credentials: 'omit', // Don't send credentials
          signal: controller.signal, // Attach abort signal
        });
        
        clearTimeout(timeoutId); // Clear timeout jika request berhasil
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error(`[Storage] Server responded with ${response.status}: ${errorText}`);
          console.error(`[Storage] URL attempted: ${url}`);
          console.error(`[Storage] Server URL config: ${config.serverUrl}`);
          
          // If 404, endpoint might not exist - log warning but don't throw
          if (response.status === 404) {
            console.warn(`[Storage] Endpoint /api/storage/all not found. Server might not be running or endpoint not available.`);
            this.setSyncStatus('idle');
            return; // Don't throw, just skip sync
          }
          
          throw new Error(`Server responded with status ${response.status}`);
        }
      } catch (error: any) {
        clearTimeout(timeoutId); // Clear timeout jika error
        if (error.name === 'AbortError' || error.message?.includes('timeout') || error.message?.includes('TIMED_OUT')) {
          throw new Error(`Connection timeout: Server tidak merespons dalam ${this.fetchTimeout}ms. Pastikan server tersedia dan koneksi internet stabil.`);
        }
        if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_CONNECTION_TIMED_OUT') || error.message?.includes('NetworkError')) {
          throw new Error(`Koneksi gagal: Server tidak dapat dijangkau. Pastikan server berjalan dan koneksi internet stabil.`);
        }
        throw error; // Re-throw error lainnya
      }
      
      // Response is OK, process data
      const result = await response.json();
      const serverDataRaw = result.data || result; // Support both old and new format
      const serverTimestamps = result.timestamps || {};
      
      // CRITICAL: Ensure serverData is an object (not null, not array, not primitive)
      const serverData = (serverDataRaw && typeof serverDataRaw === 'object' && !Array.isArray(serverDataRaw)) 
        ? serverDataRaw 
        : {};
      
      // Update last sync timestamp if server provides it (persistent)
      if (result.serverTime) {
        this.setLastSyncTimestamp(result.serverTime);
      }
      
      let merged = 0;
      let conflicts = 0;
      let synced = 0;
      const localChangesToPush: Record<string, { value: any; timestamp: number }> = {}; // Track local changes that are newer
      
      // Update local storage dengan merge dan conflict resolution
      const electronAPI = (window as any).electronAPI;
      
      // CRITICAL: Ensure serverData is iterable (object with keys)
      if (!serverData || typeof serverData !== 'object' || Array.isArray(serverData)) {
        console.warn(`[Storage] Server data is not a valid object:`, typeof serverData, Array.isArray(serverData));
        this.setSyncStatus('idle');
        return;
      }
      
      for (const [key, serverValue] of Object.entries(serverData)) {
          // Filter by business context
          if (!this.isKeyForCurrentBusiness(key)) {
            continue;
          }
          
          const serverTimestamp = serverTimestamps[key] || 0;
          
          // CRITICAL: Handle case where server sends deleted key (deleted: true, value: null)
          // Server mengirim format: {deleted: true, value: null, timestamp: ...}
          // Atau server mengirim langsung null jika key sudah di-delete
          if (serverValue === null || (serverValue && typeof serverValue === 'object' && serverValue.deleted === true && serverValue.value === null)) {
            // Key sudah di-delete di server, hapus dari local storage
            this.log(`[Storage] Server indicates key ${key} is deleted, removing from local storage`);
            localStorage.removeItem(key);
            const business = this.getBusinessContext();
            if (business !== 'packaging') {
              const prefixedKey = `${business}/${key}`;
              localStorage.removeItem(prefixedKey);
            }
            
            // Also remove from file storage if Electron
            const electronAPI = (window as any).electronAPI;
            if (electronAPI && electronAPI.deleteStorage) {
              try {
                await electronAPI.deleteStorage(key);
                if (business !== 'packaging') {
                  await electronAPI.deleteStorage(`${business}/${key}`);
                }
              } catch (error) {
                // Ignore file storage errors
              }
            }
            
            synced++;
            continue; // Skip to next key
          }
          
          // Extract value if serverValue is a wrapper object
          let actualServerValue = serverValue;
          if (serverValue && typeof serverValue === 'object' && 'value' in serverValue && !Array.isArray(serverValue)) {
            // Server mengirim wrapper object {value: ..., timestamp: ...}
            actualServerValue = serverValue.value;
          }
          
          // Get local value - check file storage first (Electron), then localStorage
          let localValue = null;
          let localTimestamp = 0;
          let localKey = key;
          
          // Try to get from file storage first (Electron)
          if (electronAPI && electronAPI.getStorage) {
            try {
              // Try with business prefix first
              const business = this.getBusinessContext();
              if (business !== 'packaging') {
                const prefixedKey = `${business}/${key}`;
                const fileData = await electronAPI.getStorage(prefixedKey);
                if (fileData && fileData.value !== undefined) {
                  localValue = fileData.value;
                  localTimestamp = fileData.timestamp || fileData._timestamp || 0;
                  localKey = prefixedKey;
                }
              }
              
              // If not found, try without prefix
              if (!localValue) {
                const fileData = await electronAPI.getStorage(key);
                if (fileData && fileData.value !== undefined) {
                  localValue = fileData.value;
                  localTimestamp = fileData.timestamp || fileData._timestamp || 0;
                }
              }
            } catch (e) {
              // Ignore file storage errors, fallback to localStorage
            }
          }
          
          // Fallback to localStorage if not found in file storage
          if (!localValue) {
            let localValueStr = localStorage.getItem(key);
            
            // If not found, try with business prefix
            if (!localValueStr) {
              const business = this.getBusinessContext();
              if (business !== 'packaging') {
                const prefixedKey = `${business}/${key}`;
                localValueStr = localStorage.getItem(prefixedKey);
                if (localValueStr) {
                  localKey = prefixedKey;
                }
              }
            }
            
            if (localValueStr) {
              try {
                const localParsed = JSON.parse(localValueStr);
                // Handle both wrapped format {value, timestamp} and direct values
                if (localParsed && typeof localParsed === 'object' && localParsed.value !== undefined) {
                  localValue = localParsed.value;
                  localTimestamp = localParsed.timestamp || localParsed._timestamp || 0;
                } else if (localParsed && typeof localParsed === 'object' && (localParsed.timestamp || localParsed._timestamp)) {
                  localValue = localParsed;
                  localTimestamp = localParsed.timestamp || localParsed._timestamp || 0;
                } else {
                  // Direct value (string, number, etc.) - not an object
                  localValue = localParsed;
                  localTimestamp = 0;
                }
              } catch (e) {
                // If not valid JSON, treat as string
                localValue = localValueStr;
                localTimestamp = 0;
              }
            }
          }
          
          // IMPORTANT: For arrays, if timestamp is 0, try to get max timestamp from items
          // This handles cases where file storage saves arrays directly without wrapper
          if (Array.isArray(localValue) && localTimestamp === 0) {
            let maxItemTimestamp = 0;
            localValue.forEach((item: any) => {
              if (item && typeof item === 'object') {
                const itemTimestamp = item.timestamp || item._timestamp || 
                                     (item.lastUpdate ? new Date(item.lastUpdate).getTime() : 0);
                if (itemTimestamp > maxItemTimestamp) {
                  maxItemTimestamp = itemTimestamp;
                }
              }
            });
            if (maxItemTimestamp > 0) {
              localTimestamp = maxItemTimestamp;
              this.log(`[Storage] Extracted timestamp ${localTimestamp} from array items for ${key}`);
            }
          }
          
          // Merge data dengan conflict resolution - LAST WRITE WINS
          // IMPORTANT: Handle tombstone pattern - item yang sudah di-delete di local tidak boleh di-overwrite oleh server
          let finalValue: any = actualServerValue;
          let finalTimestamp = serverTimestamp;
          
          if (localValue && localTimestamp > 0) {
            // IMPORTANT: Cek apakah local data punya item yang sudah di-delete (tombstone pattern)
            // Jika ada, pastikan item tersebut tidak di-overwrite oleh server
            const hasDeletedItems = Array.isArray(localValue) && localValue.some((item: any) => item.deleted === true || item.deletedAt);
            
            if (localTimestamp > serverTimestamp) {
              // Local is newer - LAST WRITE WINS: use local as base, merge server changes only if timestamp very close
              finalValue = this.mergeData(localValue, actualServerValue, localTimestamp, serverTimestamp);
              finalTimestamp = localTimestamp;
              if (Math.abs(localTimestamp - serverTimestamp) > 1000) {
                conflicts++;
                this.log(`[Storage] Conflict resolved: local (${localTimestamp}) is newer than server (${serverTimestamp}), using local`);
                // Track this local change to push back to server
                localChangesToPush[key] = { value: finalValue, timestamp: finalTimestamp };
              } else {
                merged++;
              }
            } else if (serverTimestamp > localTimestamp) {
              // Server is newer - LAST WRITE WINS: use server as base, merge local changes only if timestamp very close
              // IMPORTANT: Pastikan item yang sudah di-delete di local tidak di-overwrite oleh server (tombstone protection)
              
              // SPECIAL CASE: For GT products, if local data has complete price info (harga beli AND harga jual),
              // prioritize local data even if server timestamp is newer (to preserve CSV seed updates)
              if (key === 'gt_products' && Array.isArray(localValue) && Array.isArray(actualServerValue)) {
                const localHasCompletePrice = localValue.some((item: any) => {
                  const hasHargaBeli = item.harga && item.harga > 0;
                  const hasHargaJual = (item.hargaSales || item.hargaFg) && (item.hargaSales || item.hargaFg || 0) > 0;
                  return hasHargaBeli && hasHargaJual;
                });
                
                if (localHasCompletePrice) {
                  // Local has complete price data - merge but prioritize local price data
                  this.log(`[Storage] GT Products: Local has complete price data, preserving local prices even though server is newer`);
                  finalValue = this.mergeGTProductsWithPricePriority(localValue, actualServerValue);
                  finalTimestamp = localTimestamp; // Use local timestamp to prevent overwrite
                  conflicts++;
                  localChangesToPush[key] = { value: finalValue, timestamp: finalTimestamp };
                } else {
                  finalValue = this.mergeData(actualServerValue, localValue, serverTimestamp, localTimestamp);
                  finalTimestamp = serverTimestamp;
                }
              } else {
                finalValue = this.mergeData(actualServerValue, localValue, serverTimestamp, localTimestamp);
                finalTimestamp = serverTimestamp;
              }
              
              // IMPORTANT: Jika ada deleted items di local, pastikan mereka tetap ada di finalValue
              if (hasDeletedItems && Array.isArray(finalValue)) {
                const deletedItems = (localValue as any[]).filter((item: any) => item.deleted === true || item.deletedAt);
                const deletedIds = new Set<string | number>();
                deletedItems.forEach((item: any) => {
                  const id = item.id || item._id || item.code || item.number || item.sjNo || item.soNo;
                  if (id !== undefined && id !== null) {
                    deletedIds.add(id);
                  }
                });
                
                // Pastikan deleted items ada di finalValue
                const finalValueArray = finalValue as any[];
                deletedItems.forEach((deletedItem: any) => {
                  const id = deletedItem.id || deletedItem._id || deletedItem.code || deletedItem.number || deletedItem.sjNo || deletedItem.soNo;
                  if (id !== undefined && id !== null) {
                    const existsInFinal = finalValueArray.some((item: any) => {
                      const itemId = item.id || item._id || item.code || item.number || item.sjNo || item.soNo;
                      return itemId === id;
                    });
                    if (!existsInFinal) {
                      finalValueArray.push(deletedItem); // Tambahkan deleted item untuk tombstone
                      this.log(`[Storage] Preserving deleted item ${id} in finalValue (tombstone)`);
                    } else {
                      // Update existing item dengan deleted flag
                      const index = finalValueArray.findIndex((item: any) => {
                        const itemId = item.id || item._id || item.code || item.number || item.sjNo || item.soNo;
                        return itemId === id;
                      });
                      if (index >= 0) {
                        finalValueArray[index] = { ...finalValueArray[index], deleted: true, deletedAt: deletedItem.deletedAt || new Date().toISOString() };
                        this.log(`[Storage] Marking item ${id} as deleted in finalValue (tombstone)`);
                      }
                    }
                  }
                });
              }
              
              if (Math.abs(serverTimestamp - localTimestamp) > 1000) {
                conflicts++;
                this.log(`[Storage] Conflict resolved: server (${serverTimestamp}) is newer than local (${localTimestamp}), using server (with tombstone protection)`);
              } else {
                merged++;
              }
            } else {
              // Timestamps equal, merge both
              finalValue = this.mergeData(actualServerValue, localValue, serverTimestamp, localTimestamp);
              finalTimestamp = serverTimestamp;
              merged++;
            }
          }
          
          // IMPORTANT: Filter out deleted items sebelum save (untuk UI display)
          // Tapi tetap simpan di storage untuk tombstone pattern
          // Filter akan dilakukan di loadDeliveries di DeliveryNote.tsx
          
          // Normalize finalValue untuk ensure padCode selalu ter-include
          // IMPORTANT: BOM objects tidak perlu padCode, hanya products dan inventory items
          const normalizeValue = (val: any): any => {
            if (Array.isArray(val)) {
              return val.map(item => {
                if (item && typeof item === 'object') {
                  // Skip normalization untuk BOM objects (tidak punya padCode field)
                  const isBOMObject = item.product_id !== undefined && item.material_id !== undefined && 
                                     !('padCode' in item) && !('nama' in item) && !('kode' in item) && 
                                     !('harga' in item) && !('hargaFg' in item) && !('hargaSales' in item);
                  
                  if (isBOMObject) {
                    // BOM object - jangan tambahkan padCode
                    return item;
                  }
                  
                  // Ensure padCode is always present (even if empty string) untuk products dan inventory items
                  const normalized = { ...item };
                  if (!('padCode' in normalized)) {
                    normalized.padCode = '';
                  }
                  return normalized;
                }
                return item;
              });
            }
            return val;
          };
          
          const normalizedFinalValue = normalizeValue(finalValue);
          
          // Save merged result to the correct key (use localKey if found, otherwise use normalized key)
          const dataToSave = {
            value: normalizedFinalValue,
            timestamp: finalTimestamp,
            _timestamp: finalTimestamp,
          };
          
          // Save to both keys if needed (for backward compatibility)
          localStorage.setItem(localKey, JSON.stringify(dataToSave));
          if (localKey !== key) {
            // Also save to normalized key for consistency
            localStorage.setItem(key, JSON.stringify(dataToSave));
          }
          synced++;
          
          // Update file storage jika Electron
          if (electronAPI && electronAPI.saveStorage) {
            try {
              await electronAPI.saveStorage(localKey, dataToSave);
            } catch (error) {
              console.error(`Error saving ${localKey} to file during sync:`, error);
            }
          }
        }
        
      // Push local changes that are newer back to server
      if (Object.keys(localChangesToPush).length > 0) {
        this.log(`[Storage] Pushing ${Object.keys(localChangesToPush).length} local changes back to server (local was newer)`);
        for (const [key, data] of Object.entries(localChangesToPush)) {
          const serverKey = this.getStorageKey(key, true); // Normalized key for server
          
          // IMPORTANT: Filter out deleted items before sending to server (tombstone pattern)
          let valueToSend = data.value;
          if (Array.isArray(data.value)) {
            // Filter out deleted items untuk server
            // IMPORTANT: Kirim semua items termasuk yang deleted (tombstone pattern)
            // Device lain perlu tahu tentang deletions untuk sync yang benar
            valueToSend = data.value; // Keep all items including deleted ones
          } else if (data.value && typeof data.value === 'object' && (data.value as any).deleted) {
            // Single object yang di-delete - tetap kirim ke server untuk tombstone sync
            this.log(`[Storage] Pushing deleted single object ${key} to server (tombstone)`);
            // Continue to push deleted object
          }
          
          fetch(`${config.serverUrl}/api/storage/${serverKey}`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ value: valueToSend, timestamp: data.timestamp }),
            mode: 'cors',
            credentials: 'omit',
          }).then(async (response) => {
            if (!response.ok) {
              // Get error details for better debugging
              let errorText = '';
              try {
                const errorData = await response.text();
                errorText = errorData ? `: ${errorData.substring(0, 200)}` : '';
              } catch (e) {
                // Ignore error reading response
              }
              console.warn(`[Storage] Failed to push local change ${key} to server: ${response.status}${errorText}`);
            }
          }).catch((error) => {
            console.warn(`[Storage] Failed to push local change ${key} to server:`, error);
            // Will be retried by next sync cycle
          });
        }
      }
        
      // Reduced logging - hanya log jika ada perubahan signifikan
      if (synced > 0 || merged > 0 || conflicts > 0) {
        this.log(`✅ Synced ${synced} keys from server${merged > 0 ? ` (${merged} merged)` : ''}${conflicts > 0 ? ` (${conflicts} conflicts resolved)` : ''}`);
      }
      this.retryCount = 0; // Reset retry count on success
      this.setSyncStatus('synced');
      
      // Update last sync timestamp after successful sync from server
      this.setLastSyncTimestamp(Date.now());
    } catch (error) {
      console.error('Sync from server error:', error);
      this.setSyncStatus('error');
      // Retry with exponential backoff
        if (this.retryCount < this.maxRetries) {
          const delay = this.baseRetryDelay * Math.pow(2, this.retryCount);
          this.retryCount++;
          setTimeout(() => {
            this.syncInProgress = false;
            this.syncFromServer();
          }, delay);
          return; // Don't reset syncInProgress yet
        } else {
          this.retryCount = 0; // Reset after max retries
        }
    } finally {
      if (this.retryCount === 0) {
        this.syncInProgress = false;
      }
    }
  }
  
  // Background sync from server (non-blocking)
  // If localValue is null, this will fetch from server and save to localStorage
  private async syncFromServerBackground(key: string, serverKey: string, storageKey: string, localValue: any, localTimestamp: number): Promise<void> {
    try {
      const config = this.getConfig();
      if (!config.serverUrl) return;
      
      // Add timeout untuk prevent hanging jika server tidak respond
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${config.serverUrl}/api/storage/${serverKey}`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Handle 404 gracefully - endpoint tidak ada di server, skip silently
      if (response.status === 404) {
        // Endpoint tidak ada di server - ini normal untuk beberapa key (seperti tracking_accounts, tracking_journalEntries)
        // Skip silently tanpa log error untuk menghindari noise di console
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        const serverValue = data.value;
        const serverTimestamp = data.timestamp || 0;
        
        // Merge if both exist
        if (localValue && serverValue) {
          const merged = this.mergeData(serverValue, localValue, serverTimestamp, localTimestamp);
          // Save merged result locally
          const finalTimestamp = Math.max(serverTimestamp, localTimestamp);
          const dataToSave = {
            value: merged,
            timestamp: finalTimestamp,
            _timestamp: finalTimestamp,
          };
          localStorage.setItem(storageKey, JSON.stringify(dataToSave));
          
          // Also save to file storage if Electron
          const electronAPI = (window as any).electronAPI;
          if (electronAPI && electronAPI.saveStorage) {
            try {
              await electronAPI.saveStorage(storageKey, dataToSave);
            } catch (error) {
              // Silent fail for file storage
            }
          }
          
          // Dispatch event untuk notify components bahwa data updated
          this.dispatchStorageEvent(storageKey, merged);
        } else if (serverValue && !localValue) {
          // Server has data but local doesn't - save it
          const dataToSave = {
            value: serverValue,
            timestamp: serverTimestamp,
            _timestamp: serverTimestamp,
          };
          localStorage.setItem(storageKey, JSON.stringify(dataToSave));
          
          // Also save to file storage if Electron
          const electronAPI = (window as any).electronAPI;
          if (electronAPI && electronAPI.saveStorage) {
            try {
              await electronAPI.saveStorage(storageKey, dataToSave);
            } catch (error) {
              // Silent fail for file storage
            }
          }
          
          // Dispatch event untuk notify components bahwa data updated
          this.dispatchStorageEvent(storageKey, serverValue);
        }
      } else {
        // Other non-200 responses - log warning but don't block
        console.warn(`[Storage] ⚠️ Background sync failed for ${key}: HTTP ${response.status}`);
      }
    } catch (error: any) {
      // Silent fail - local data already returned to user (or null if no local data)
      // Error akan di-log di console untuk debugging
      if (error.name === 'AbortError') {
        // Timeout sudah di-handle dengan timeout, skip log untuk menghindari noise
        return;
      } else if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        // 404 errors - skip log karena endpoint mungkin tidak ada di server
        return;
      }
      // Silent fail untuk background sync errors
    }
  }
  
  // Helper method untuk merge GT products dengan prioritas harga lengkap dari local
  private mergeGTProductsWithPricePriority(localProducts: any[], serverProducts: any[]): any[] {
    const merged: any[] = [];
    const seenIds = new Set<string | number>();
    
    // First, add local products (they have priority for price data)
    localProducts.forEach((localItem: any) => {
      const id = localItem.product_id || localItem.kode || localItem.id;
      if (id !== undefined && id !== null) {
        seenIds.add(id);
      }
      merged.push(localItem);
    });
    
    // Then, add server products that don't exist in local (by ID)
    serverProducts.forEach((serverItem: any) => {
      const id = serverItem.product_id || serverItem.kode || serverItem.id;
      if (id !== undefined && id !== null && !seenIds.has(id)) {
        merged.push(serverItem);
        seenIds.add(id);
      } else if (id !== undefined && id !== null && seenIds.has(id)) {
        // Product exists in both - update local product with server data but preserve price if local has complete price
        const localIndex = merged.findIndex((item: any) => {
          const itemId = item.product_id || item.kode || item.id;
          return itemId === id;
        });
        if (localIndex >= 0) {
          const localItem = merged[localIndex];
          const hasLocalCompletePrice = localItem.harga && localItem.harga > 0 && 
                                       (localItem.hargaSales || localItem.hargaFg) && 
                                       (localItem.hargaSales || localItem.hargaFg || 0) > 0;
          
          if (hasLocalCompletePrice) {
            // Preserve local price data, but update other fields from server
            merged[localIndex] = {
              ...serverItem,
              harga: localItem.harga,
              hargaSales: localItem.hargaSales || localItem.hargaFg || serverItem.hargaSales || serverItem.hargaFg,
              hargaFg: localItem.hargaSales || localItem.hargaFg || serverItem.hargaSales || serverItem.hargaFg,
              padCode: localItem.padCode || serverItem.padCode || '', // Preserve padCode from local
              lastUpdate: localItem.lastUpdate, // Keep local lastUpdate
              timestamp: localItem.timestamp || localItem._timestamp || Date.now(),
              _timestamp: localItem.timestamp || localItem._timestamp || Date.now(),
            };
          } else {
            // Local doesn't have complete price, use server data but preserve padCode from local
            merged[localIndex] = {
              ...serverItem,
              padCode: localItem.padCode || serverItem.padCode || '', // Preserve padCode from local if server doesn't have it
            };
          }
        }
      }
    });
    
    return merged;
  }

  // Helper method untuk merge data dengan conflict resolution
  // LAST WRITE WINS: Untuk array, yang timestamp lebih baru menang sepenuhnya
  // IMPORTANT: Handle tombstone pattern - item yang sudah di-delete di local tidak boleh di-overwrite oleh server
  private mergeData(newerData: any, olderData: any, newerTimestamp: number, olderTimestamp: number): any {
    // If both are arrays, use LAST WRITE WINS strategy
    // Array dengan timestamp lebih baru menang sepenuhnya (untuk handle delete dengan benar)
    if (Array.isArray(newerData) && Array.isArray(olderData)) {
      // IMPORTANT: Cek apakah olderData (local) punya item yang sudah di-delete (tombstone pattern)
      // Jika ada, jangan biarkan server mengembalikannya
      const deletedIds = new Set<string | number>();
      olderData.forEach((item: any) => {
        if (item.deleted === true || item.deletedAt) {
          const id = item.id || item._id || item.code || item.number || item.sjNo || item.soNo;
          if (id !== undefined && id !== null) {
            deletedIds.add(id);
          }
        }
      });
      
      // Jika timestamp sama atau sangat dekat (< 1 detik), merge untuk avoid duplicates
      const timeDiff = Math.abs(newerTimestamp - olderTimestamp);
      if (timeDiff < 1000) {
        // Timestamp sangat dekat, merge arrays (avoid duplicates by ID)
        // IMPORTANT: Skip item dari server yang sudah di-delete di local
        const merged: any[] = [];
        const seenIds = new Set<string | number>();
        const localItemsMap = new Map<string | number, any>();
        
        // Create map of local items by ID for quick lookup
        olderData.forEach((item: any) => {
          const id = item.id || item._id || item.code || item.number || item.sjNo || item.soNo || item.kode || item.product_id;
          if (id !== undefined && id !== null) {
            localItemsMap.set(id, item);
          }
        });
        
        // Add newer items first (skip yang sudah di-delete di local)
        newerData.forEach((item: any) => {
          const id = item.id || item._id || item.code || item.number || item.sjNo || item.soNo || item.kode || item.product_id;
          // Skip jika item ini sudah di-delete di local
          if (id !== undefined && id !== null && deletedIds.has(id)) {
            this.log(`[Storage] Skipping server item ${id} - already deleted locally (tombstone)`);
            return; // Skip item ini
          }
          if (id !== undefined && id !== null) {
            seenIds.add(id);
            // IMPORTANT: Preserve padCode from local if server doesn't have it
            const localItem = localItemsMap.get(id);
            if (localItem && localItem.padCode && !item.padCode) {
              item = { ...item, padCode: localItem.padCode };
            }
          }
          merged.push(item);
        });
        
        // Add older items that don't exist in newer (termasuk yang sudah di-delete untuk tombstone)
        olderData.forEach((item: any) => {
          const id = item.id || item._id || item.code || item.number || item.sjNo || item.soNo || item.kode || item.product_id;
          if (id === undefined || id === null || !seenIds.has(id)) {
            merged.push(item); // Include deleted items untuk tombstone pattern
          }
        });
        
        return merged;
      } else {
        // Timestamp berbeda signifikan
        // Jika newerData adalah local (newerTimestamp = localTimestamp), gunakan local sepenuhnya (termasuk deleted items)
        // Jika newerData adalah server (newerTimestamp = serverTimestamp), filter out item yang sudah di-delete di local
        if (deletedIds.size > 0) {
          // Filter out item dari server yang sudah di-delete di local
          const filteredNewer = newerData.filter((item: any) => {
            const id = item.id || item._id || item.code || item.number || item.sjNo || item.soNo || item.kode || item.product_id;
            if (id !== undefined && id !== null && deletedIds.has(id)) {
              this.log(`[Storage] Filtering out server item ${id} - already deleted locally (tombstone)`);
              return false; // Filter out item ini
            }
            return true;
          });
          
          // Create map of local items by ID for quick lookup
          const localItemsMap = new Map<string | number, any>();
          olderData.forEach((item: any) => {
            const id = item.id || item._id || item.code || item.number || item.sjNo || item.soNo || item.kode || item.product_id;
            if (id !== undefined && id !== null) {
              localItemsMap.set(id, item);
            }
          });
          
          // Merge dengan olderData (local) yang mungkin punya deleted items
          // IMPORTANT: Preserve padCode from local if server doesn't have it
          const merged: any[] = filteredNewer.map((item: any) => {
            const id = item.id || item._id || item.code || item.number || item.sjNo || item.soNo || item.kode || item.product_id;
            if (id !== undefined && id !== null) {
              const localItem = localItemsMap.get(id);
              if (localItem && localItem.padCode && !item.padCode) {
                return { ...item, padCode: localItem.padCode };
              }
            }
            return item;
          });
          
          const seenIds = new Set<string | number>();
          merged.forEach((item: any) => {
            const id = item.id || item._id || item.code || item.number || item.sjNo || item.soNo || item.kode || item.product_id;
            if (id !== undefined && id !== null) {
              seenIds.add(id);
            }
          });
          
          // Add older items (local) yang tidak ada di newer (termasuk deleted items)
          olderData.forEach((item: any) => {
            const id = item.id || item._id || item.code || item.number || item.sjNo || item.soNo || item.kode || item.product_id;
            if (id === undefined || id === null || !seenIds.has(id)) {
              merged.push(item); // Include deleted items untuk tombstone pattern
            }
          });
          
          this.log(`[Storage] Array conflict: newer timestamp ${newerTimestamp} vs older ${olderTimestamp}, merged with tombstone protection (${merged.length} items, ${deletedIds.size} deleted items preserved)`);
          return merged;
        } else {
          // Tidak ada deleted items, tapi tetap preserve padCode dari local jika server tidak punya
          const localItemsMap = new Map<string | number, any>();
          olderData.forEach((item: any) => {
            const id = item.id || item._id || item.code || item.number || item.sjNo || item.soNo || item.kode || item.product_id;
            if (id !== undefined && id !== null) {
              localItemsMap.set(id, item);
            }
          });
          
          // Preserve padCode from local if server doesn't have it
          const preservedData = newerData.map((item: any) => {
            const id = item.id || item._id || item.code || item.number || item.sjNo || item.soNo || item.kode || item.product_id;
            if (id !== undefined && id !== null) {
              const localItem = localItemsMap.get(id);
              if (localItem && localItem.padCode && !item.padCode) {
                return { ...item, padCode: localItem.padCode };
              }
            }
            return item;
          });
          
          this.log(`[Storage] Array conflict: newer timestamp ${newerTimestamp} vs older ${olderTimestamp}, using newer array with padCode preservation (${preservedData.length} items)`);
          return preservedData;
        }
      }
    }
    
    // If both are objects, merge objects (newer wins for conflicts)
    if (typeof newerData === 'object' && newerData !== null && 
        typeof olderData === 'object' && olderData !== null &&
        !Array.isArray(newerData) && !Array.isArray(olderData)) {
      return {
        ...olderData,
        ...newerData,
      };
    }
    
    // Otherwise, newer wins
    return newerData;
  }

  async importFromJsonFiles(): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      // Check if we're in Electron
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.readDataFiles) {
        const data = await electronAPI.readDataFiles();
        
        // CRITICAL: Ensure data is an object
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          console.warn('[Storage] Invalid data format from readDataFiles:', typeof data, Array.isArray(data));
          return { imported: 0, errors: ['Invalid data format'] };
        }
        
        // Import all data to file storage AND localStorage
        for (const [key, value] of Object.entries(data)) {
          try {
            // Normalize key: remove path separators and normalize GT keys
            // e.g., "general-trading/gt_products" -> "gt_products"
            let normalizedKey = key;
            if (key.includes('/')) {
              // Extract filename from path (e.g., "general-trading/gt_products" -> "gt_products")
              const parts = key.split('/');
              normalizedKey = parts[parts.length - 1];
            }
            // Remove .json extension if present
            normalizedKey = normalizedKey.replace(/\.json$/, '');
            
            // Ensure key doesn't contain path separators (safety check)
            if (normalizedKey.includes('/')) {
              console.warn(`[Storage] Key still contains path separator: "${normalizedKey}", fixing...`);
              normalizedKey = normalizedKey.split('/').pop() || normalizedKey;
            }
            
            // Skip BOM for GT (General Trading doesn't use BOM)
            if (normalizedKey === 'bom' || normalizedKey === 'gt_bom') {
              continue;
            }
            
            // Check if value already has timestamp (from previous export)
            let dataToSave: any;
            let timestamp: number;
            let actualValue = value;
            
            // If value is already wrapped with timestamp, unwrap it first
            if (value && typeof value === 'object' && 'value' in value && 'timestamp' in value) {
              // Data already wrapped with timestamp
              const wrapped = value as any;
              actualValue = wrapped.value || value;
              timestamp = wrapped.timestamp || wrapped._timestamp || Date.now();
            } else {
              // New data, use as is
              actualValue = value;
              timestamp = Date.now();
            }
            
            // Wrap with timestamp for storage
            dataToSave = {
              value: actualValue,
              timestamp,
              _timestamp: timestamp,
            };
            
            // Save to file storage FIRST (data/localStorage/*.json)
            if (electronAPI.saveStorage) {
              try {
                const result = await electronAPI.saveStorage(normalizedKey, dataToSave);
                if (!result.success) {
                  errors.push(`Failed to save ${normalizedKey}: ${result.error}`);
                }
              } catch (saveError: any) {
                errors.push(`Error saving ${normalizedKey}: ${saveError.message}`);
              }
            }
            
            // Also save to localStorage as backup with normalized key
            localStorage.setItem(normalizedKey, JSON.stringify(dataToSave));
            
            // Also push to server if in server mode (use normalized key)
            const config = this.getConfig();
            if (config.type === 'server' && config.serverUrl) {
              try {
                // Use normalizedKey (not original key) for server push
                const serverKey = normalizedKey; // Already normalized (e.g., "gt_products" not "general-trading/gt_products")
                const serverUrl = `${config.serverUrl}/api/storage/${serverKey}`;
                
                const response = await fetch(serverUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ value: actualValue, timestamp }),
                });
                
                if (!response.ok) {
                  console.warn(`[Storage] Failed to push ${serverKey} to server: ${response.status}`);
                } else {
                }
              } catch (error: any) {
                console.warn(`[Storage] Error pushing ${normalizedKey} to server:`, error.message);
                // Don't add to errors - server push is optional
              }
            }
            
            imported++;
          } catch (error: any) {
            errors.push(`Error importing ${key}: ${error.message}`);
          }
        }
      } else {
        // Not in Electron, try to fetch from data folder via HTTP (for dev)
        try {
          const response = await fetch('/data');
          if (response.ok) {
            // This won't work in production, but good for dev
            errors.push('Cannot import from files in browser. Please use Electron app or run: npm run seed');
          }
        } catch {
          errors.push('Cannot access file system. Please run: npm run seed to generate JSON files, then refresh.');
        }
      }
    } catch (error: any) {
      errors.push(`Import error: ${error.message}`);
    }

    return { imported, errors };
  }

  // Export all data to JSON - PUBLIC METHOD
  async exportAllData(): Promise<{ success: boolean; data?: Record<string, any>; error?: string }> {
    try {
      const allData: Record<string, any> = {};
      
      // Get all localStorage keys (filtered by business context)
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.startsWith('storage_config')) {
          // Filter by business context
          if (!this.isKeyForCurrentBusiness(key)) {
            continue;
          }
          
          const value = localStorage.getItem(key);
          if (value) {
            try {
              const parsed = JSON.parse(value);
              // Extract value if wrapped with timestamp
              allData[key] = (parsed.value !== undefined) ? parsed.value : parsed;
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
      
      // Try to export via Electron if available
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.exportLocalStorage) {
        try {
          await electronAPI.exportLocalStorage(allData);
          return { success: true, data: allData };
        } catch (error: any) {
          console.error('Electron export error:', error);
          // Fallback: return data for manual download
          return { success: true, data: allData };
        }
      }
      
      // Return data for manual download (browser)
      return { success: true, data: allData };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async importFromBundle(): Promise<{ imported: number; errors: string[] }> {
    const errors: string[] = [];
    let imported = 0;

    try {
      // Check if we're in Electron
      const electronAPI = (window as any).electronAPI;
      if (electronAPI && electronAPI.readBundleData) {
        const data = await electronAPI.readBundleData();
        
        // CRITICAL: Ensure data is an object
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          console.warn('[Storage] Invalid data format from readBundleData:', typeof data, Array.isArray(data));
          return { imported: 0, errors: ['Invalid data format'] };
        }
        
        // Import all data from bundle to file storage AND localStorage
        for (const [key, value] of Object.entries(data)) {
          try {
            // Check if value already has timestamp (from previous export)
            let dataToSave: any;
            let timestamp: number;
            let actualValue = value;
            
            // If value is already wrapped with timestamp, unwrap it first
            if (value && typeof value === 'object' && 'value' in value && 'timestamp' in value) {
              // Data already wrapped with timestamp
              const wrapped = value as any;
              actualValue = wrapped.value || value;
              timestamp = wrapped.timestamp || wrapped._timestamp || Date.now();
            } else {
              // New data, use as is
              actualValue = value;
              timestamp = Date.now();
            }
            
            // Wrap with timestamp for storage
            dataToSave = {
              value: actualValue,
              timestamp,
              _timestamp: timestamp,
            };
            
            // Save to file storage FIRST (data/localStorage/*.json)
            if (electronAPI.saveStorage) {
              try {
                const result = await electronAPI.saveStorage(key, dataToSave);
                if (!result.success) {
                  errors.push(`Failed to save ${key}: ${result.error}`);
                }
              } catch (saveError: any) {
                errors.push(`Error saving ${key}: ${saveError.message}`);
              }
            }
            
            // Also save to localStorage as backup
            localStorage.setItem(key, JSON.stringify(dataToSave));
            
            // Also push to server if in server mode
            const config = this.getConfig();
            if (config.type === 'server' && config.serverUrl) {
              try {
                await fetch(`${config.serverUrl}/api/storage/${key}`, {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                  },
                  body: JSON.stringify({ value: actualValue, timestamp }),
                  mode: 'cors', // Explicit CORS mode for Android WebView compatibility
                  credentials: 'omit', // Don't send credentials
                });
              } catch (error) {
                // Silent fail for server push
              }
            }
            
            imported++;
          } catch (error: any) {
            errors.push(`Error importing ${key}: ${error.message}`);
          }

        }
      } else {
        errors.push('Cannot import from bundle. Please use Electron app.');
      }
    } catch (error: any) {
      errors.push(`Import error: ${error.message}`);
    }

    return { imported, errors };
  }
}

export const storageService = new StorageService();


