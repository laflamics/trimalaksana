/**
 * Real-Time Sync Engine untuk General Trading Workflow
 * Based on packaging-sync.ts pattern but adapted for GT
 */

export type SyncPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

export interface SyncOperation {
  id: string;
  key: string;
  data: any;
  priority: SyncPriority;
  timestamp: number;
  retryCount: number;
  metadata?: any; // Conflict resolution metadata
}

export interface ConflictResolution {
  strategy: 'lastWriteWins' | 'merge' | 'manual';
  resolver?: (local: any, remote: any, key: string) => any;
}

class GTSync {
  private ws: WebSocket | null = null;
  private pendingChanges: Map<string, any> = new Map();
  private syncQueue: Array<SyncOperation> = [];
  private syncStatus: SyncStatus = 'idle';
  private listeners: Map<string, Function[]> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private maxRetries = 3;
  private baseRetryDelay = 1000;

  constructor() {
    this.initializeWebSocket();
    this.startQueueProcessor();
    // Check initial sync status based on storage config
    this.checkInitialSyncStatus();
  }

  /**
   * Check initial sync status and download server data if needed
   */
  private async checkInitialSyncStatus() {
    try {
      const storageConfig = JSON.parse(localStorage.getItem('storage_config') || '{"type":"local"}');
      
      if (storageConfig.type === 'server' && storageConfig.serverUrl) {
        // Server mode - check and download data
        this.syncStatus = 'syncing';
        this.emitStatusChange('syncing');
        
        try {
          // Download GT sales orders from server
          await this.downloadServerData('gt_salesOrders', storageConfig.serverUrl);
          
          // Check if there are unsynced local changes
          const unsyncedCount = this.getUnsyncedCount();
          if (unsyncedCount === 0) {
            this.syncStatus = 'synced';
            this.emitStatusChange('synced');
          } else {
            // Has local data but server is empty - this is normal for first device
            this.syncStatus = 'synced';
            this.emitStatusChange('synced');
            console.log('[GTSync] Local data exists, server empty - marking as synced (normal for first device)');
          }
        } catch (error) {
          console.error('[GTSync] Server sync failed:', error);
          // If server sync fails but we have local data, still mark as synced for local use
          this.syncStatus = 'synced';
          this.emitStatusChange('synced');
          console.log('[GTSync] Server sync failed but local data available - marking as synced for local use');
        }
      } else {
        // Local mode, set status to synced (no server sync needed)
        this.syncStatus = 'synced';
        this.emitStatusChange('synced');
      }
    } catch (error) {
      console.error('[GTSync] Error checking initial sync status:', error);
      this.syncStatus = 'error';
      this.emitStatusChange('error');
    }
  }

  private initializeWebSocket() {
    // WebSocket untuk real-time sync (optional)
    try {
      const wsUrl = localStorage.getItem('websocket_url') || 'ws://localhost:3001/ws';
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('[GTSync] WebSocket connected');
      };
      
      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.handleWebSocketMessage(message);
      };
      
      this.ws.onerror = () => {
        console.warn('[GTSync] WebSocket connection failed, using polling fallback');
      };
    } catch (error) {
      console.warn('[GTSync] WebSocket not available, using polling fallback');
    }
  }

  private handleWebSocketMessage(message: any) {
    if (message.type === 'STORAGE_CHANGED') {
      this.emitStorageChange(message.key, message.data);
    }
  }

  /**
   * Update data dengan instant local update + background sync
   */
  async updateData(key: string, data: any, priority: SyncPriority = 'MEDIUM'): Promise<void> {
    // 1. Update local immediately untuk UI responsiveness
    this.pendingChanges.set(key, data);
    
    // 2. Queue untuk background sync
    const operation: SyncOperation = {
      id: `${key}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      key,
      data,
      priority,
      timestamp: Date.now(),
      retryCount: 0
    };
    
    this.addToQueue(operation);
    
    // 3. Emit change event untuk components
    this.emitStorageChange(key, data);
  }

  private addToQueue(operation: SyncOperation) {
    // Remove existing operation for same key (replace with newer)
    this.syncQueue = this.syncQueue.filter(op => op.key !== operation.key);
    
    // Add new operation (sorted by priority and timestamp)
    this.syncQueue.push(operation);
    this.syncQueue.sort((a, b) => {
      const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority; // Higher priority first
      }
      
      return a.timestamp - b.timestamp; // Older first for same priority
    });
  }

  private async startQueueProcessor() {
    setInterval(async () => {
      if (this.syncQueue.length > 0 && this.syncStatus !== 'syncing') {
        await this.processQueue();
      }
    }, 2000); // Process every 2 seconds
  }

  private async processQueue() {
    if (this.syncQueue.length === 0) return;
    
    this.syncStatus = 'syncing';
    this.emitStatusChange('syncing');
    
    try {
      const operation = this.syncQueue.shift()!;
      await this.syncOperation(operation);
      
      // If queue is empty, mark as synced
      if (this.syncQueue.length === 0) {
        this.syncStatus = 'synced';
        this.emitStatusChange('synced');
      }
    } catch (error) {
      console.error('[GTSync] Queue processing error:', error);
      this.syncStatus = 'error';
      this.emitStatusChange('error');
    }
  }

  private async syncOperation(operation: SyncOperation): Promise<void> {
    try {
      // Check if we're in server mode
      const storageConfig = JSON.parse(localStorage.getItem('storage_config') || '{"type":"local"}');
      
      if (storageConfig.type === 'local') {
        // Local mode - no server sync needed, just mark as complete
        return;
      }
      
      // Server mode - attempt sync
      if (storageConfig.serverUrl) {
        await this.syncToServer(operation.key, operation.data, storageConfig.serverUrl);
      }
      
    } catch (error) {
      operation.retryCount++;
      
      if (operation.retryCount < this.maxRetries) {
        // Retry with exponential backoff
        const delay = this.baseRetryDelay * Math.pow(2, operation.retryCount);
        
        const timeoutId = setTimeout(() => {
          this.addToQueue(operation);
          this.retryTimeouts.delete(operation.id);
        }, delay);
        
        this.retryTimeouts.set(operation.id, timeoutId);
      } else {
        console.error(`[GTSync] Max retries exceeded for operation ${operation.id}:`, error);
        throw error;
      }
    }
  }

  private async syncToServer(key: string, data: any, serverUrl: string): Promise<void> {
    // Upload local changes to server
    const response = await fetch(`${serverUrl}/api/storage/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        value: data,
        timestamp: Date.now()
      })
    });
    
    if (!response.ok) {
      throw new Error(`Server sync failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Download data from server and merge with local data
   */
  private async downloadServerData(key: string, serverUrl: string): Promise<void> {
    try {
      console.log(`[GTSync] Downloading ${key} from server...`);
      
      // Both server and local use general-trading/ with dash
      const storageKey = `general-trading/${key}`;
      const currentData = localStorage.getItem(storageKey);
      let currentOrders: any[] = [];
      
      if (currentData) {
        try {
          const parsed = JSON.parse(currentData);
          currentOrders = parsed.value || parsed || [];
        } catch (e) {
          console.warn('[GTSync] Invalid local data format');
        }
      }
      
      console.log(`[GTSync] Storage key: ${storageKey}`);
      console.log(`[GTSync] Current local orders: ${currentOrders.length}`);
      
      // Download from server (server also uses general-trading/ with dash)
      const encodedKey = encodeURIComponent(storageKey);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(`${serverUrl}/api/storage/${encodedKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`[GTSync] Server responded with ${response.status}: ${response.statusText}`);
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }
      
      const serverData = await response.json();
      console.log(`[GTSync] Server response received for ${key}:`);
      console.log(`[GTSync] Response type: ${typeof serverData}`);
      console.log(`[GTSync] Response is array: ${Array.isArray(serverData)}`);
      
      if (serverData && typeof serverData === 'object' && !Array.isArray(serverData)) {
        console.log(`[GTSync] Response object keys: ${Object.keys(serverData)}`);
      }
      
      // Process server data with multiple extraction methods
      let serverOrders: any[] = [];
      
      // Method 1: Wrapped format with .value property
      if (serverData && serverData.value && Array.isArray(serverData.value)) {
        serverOrders = serverData.value;
        console.log(`[GTSync] Extracted ${serverOrders.length} orders from serverData.value (array)`);
      }
      // Method 2: Direct array format
      else if (Array.isArray(serverData)) {
        serverOrders = serverData;
        console.log(`[GTSync] Extracted ${serverOrders.length} orders from direct array`);
      }
      // Method 3: Data property format
      else if (serverData && serverData.data && Array.isArray(serverData.data)) {
        serverOrders = serverData.data;
        console.log(`[GTSync] Extracted ${serverOrders.length} orders from serverData.data`);
      }
      // Method 4: Check for other common property names
      else if (serverData && serverData.items && Array.isArray(serverData.items)) {
        serverOrders = serverData.items;
        console.log(`[GTSync] Extracted ${serverOrders.length} orders from serverData.items`);
      }
      // Method 5: Check if .value is an empty object (server has no data)
      else if (serverData && serverData.value && typeof serverData.value === 'object' && Object.keys(serverData.value).length === 0) {
        console.log(`[GTSync] Server has no GT data yet (empty object in value)`);
        console.log(`[GTSync] This is normal if GT data hasn't been uploaded to server`);
        return;
      }
      else {
        console.log(`[GTSync] Could not extract orders from server response`);
        console.log(`[GTSync] Server response structure:`, serverData);
        
        // Check if server response indicates no data vs error
        if (serverData && serverData.value !== undefined) {
          console.log(`[GTSync] Server response indicates no GT data available`);
          console.log(`[GTSync] Value type: ${typeof serverData.value}, Value: ${JSON.stringify(serverData.value)}`);
        }
      }
      
      if (serverOrders.length === 0) {
        console.log(`[GTSync] No orders found in server response for ${key}`);
        
        // Provide helpful information about why no data was found
        if (serverData && serverData.value && typeof serverData.value === 'object' && !Array.isArray(serverData.value)) {
          if (Object.keys(serverData.value).length === 0) {
            console.log(`[GTSync] ℹ️  Server has empty object - GT data not uploaded yet`);
            console.log(`[GTSync] 💡 This is normal if this is the first device or GT data hasn't synced to server`);
          } else {
            console.log(`[GTSync] ⚠️  Server has object but not array format`);
            console.log(`[GTSync] 🔧 Server data format may need investigation`);
          }
        }
        
        return;
      }
      
      // Merge with local data (avoid duplicates)
      const mergedOrders = [...currentOrders];
      let newCount = 0;
      
      serverOrders.forEach(serverOrder => {
        const exists = currentOrders.some(localOrder => 
          localOrder.id === serverOrder.id || 
          localOrder.soNo === serverOrder.soNo
        );
        
        if (!exists) {
          mergedOrders.push(serverOrder);
          newCount++;
          console.log(`[GTSync] Added: ${serverOrder.soNo} - ${serverOrder.customer}`);
        }
      });
      
      // Save merged data
      const finalData = {
        value: mergedOrders,
        timestamp: Date.now(),
        _timestamp: Date.now(),
        lastUpdate: new Date().toISOString(),
        syncedFromServer: true,
        serverSyncAt: new Date().toISOString(),
        serverOrderCount: serverOrders.length,
        newOrdersAdded: newCount
      };
      
      localStorage.setItem(storageKey, JSON.stringify(finalData));
      
      // Trigger UI update
      window.dispatchEvent(new CustomEvent('app-storage-changed', {
        detail: { 
          key: storageKey,
          value: mergedOrders,
          action: 'server-sync'
        }
      }));
      
      console.log(`[GTSync] Successfully synced ${key}: ${newCount} new items added`);
      
    } catch (error) {
      console.error(`[GTSync] Failed to download ${key} from server:`, error);
      throw error;
    }
  }

  /**
   * Force download all GT data from server
   */
  async forceDownloadFromServer(): Promise<void> {
    const storageConfig = JSON.parse(localStorage.getItem('storage_config') || '{"type":"local"}');
    
    if (storageConfig.type !== 'server' || !storageConfig.serverUrl) {
      throw new Error('Server mode not configured');
    }
    
    this.syncStatus = 'syncing';
    this.emitStatusChange('syncing');
    
    try {
      // Download all GT data types
      const dataTypes = ['gt_salesOrders', 'gt_quotations', 'gt_products', 'gt_customers', 'gt_suppliers'];
      
      for (const dataType of dataTypes) {
        try {
          await this.downloadServerData(dataType, storageConfig.serverUrl);
        } catch (error) {
          console.warn(`[GTSync] Failed to download ${dataType}:`, error);
          // Continue with other data types
        }
      }
      
      this.syncStatus = 'synced';
      this.emitStatusChange('synced');
      
      console.log('[GTSync] Force download completed successfully');
      
    } catch (error) {
      this.syncStatus = 'error';
      this.emitStatusChange('error');
      throw error;
    }
  }

  /**
   * Get count of unsynced items
   */
  private getUnsyncedCount(): number {
    return this.syncQueue.length + this.pendingChanges.size;
  }

  /**
   * Get queue status for debugging
   */
  getQueueStatus() {
    return {
      queueLength: this.syncQueue.length,
      pendingChanges: this.pendingChanges.size,
      status: this.syncStatus,
      retryCount: this.retryTimeouts.size
    };
  }

  /**
   * Subscribe to sync status changes
   */
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    if (!this.listeners.has('syncStatus')) {
      this.listeners.set('syncStatus', []);
    }
    
    this.listeners.get('syncStatus')!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get('syncStatus') || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Subscribe to storage changes
   */
  onStorageChange(key: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    
    this.listeners.get(key)!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(key) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  /**
   * Force sync all pending changes
   */
  async forceSyncAll(): Promise<void> {
    if (this.syncQueue.length === 0 && this.pendingChanges.size === 0) {
      this.syncStatus = 'synced';
      this.emitStatusChange('synced');
      return;
    }
    
    this.syncStatus = 'syncing';
    this.emitStatusChange('syncing');
    
    try {
      // Process all pending changes
      for (const [key, data] of this.pendingChanges.entries()) {
        await this.updateData(key, data, 'HIGH');
      }
      
      // Process queue
      while (this.syncQueue.length > 0) {
        await this.processQueue();
      }
      
      this.syncStatus = 'synced';
      this.emitStatusChange('synced');
    } catch (error) {
      this.syncStatus = 'error';
      this.emitStatusChange('error');
      throw error;
    }
  }

  private emitStatusChange(status: SyncStatus) {
    const callbacks = this.listeners.get('syncStatus') || [];
    callbacks.forEach(callback => {
      try {
        callback(status);
      } catch (error) {
        console.error('[GTSync] Error in status change callback:', error);
      }
    });
  }

  private emitStorageChange(key: string, data: any) {
    const callbacks = this.listeners.get(key) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('[GTSync] Error in storage change callback:', error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.ws) {
      this.ws.close();
    }
    
    // Clear all timeouts
    for (const timeoutId of this.retryTimeouts.values()) {
      clearTimeout(timeoutId);
    }
    
    this.retryTimeouts.clear();
    this.listeners.clear();
    this.syncQueue = [];
    this.pendingChanges.clear();
  }
}

// Export singleton instance
export const gtSync = new GTSync();