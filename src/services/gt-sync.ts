/**
 * Real-Time Sync Engine untuk General Trading Workflow
 * Based on packaging-sync.ts pattern but adapted for GT
 */

export type SyncPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

import { websocketClient } from './websocket-client';

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
      // FIX: Cek business context - hanya download jika business context adalah general-trading
      const selectedBusiness = localStorage.getItem('selectedBusiness');
      if (selectedBusiness !== 'general-trading') {
        // Bukan GT business, skip download dan set status ke synced
        this.syncStatus = 'synced';
        this.emitStatusChange('synced');
        return;
      }
      
      const storageConfig = JSON.parse(localStorage.getItem('storage_config') || '{"type":"local"}');
      
      if (storageConfig.type === 'server' && storageConfig.serverUrl) {
        // Server mode - check and download data
        this.syncStatus = 'syncing';
        this.emitStatusChange('syncing');
        
        try {
          // Download essential GT data from server
          await this.downloadServerData('gt_salesOrders', storageConfig.serverUrl);
          await this.downloadServerData('userAccessControl', storageConfig.serverUrl);
          
          // Check if there are unsynced local changes
          const unsyncedCount = this.getUnsyncedCount();
          if (unsyncedCount === 0) {
            this.syncStatus = 'synced';
            this.emitStatusChange('synced');
          } else {
            // Has local data but server is empty - this is normal for first device
            this.syncStatus = 'synced';
            this.emitStatusChange('synced');
          }
        } catch (error) {
          // If server sync fails but we have local data, still mark as synced for local use
          this.syncStatus = 'synced';
          this.emitStatusChange('synced');
        }
      } else {
        // Local mode, set status to synced (no server sync needed)
        this.syncStatus = 'synced';
        this.emitStatusChange('synced');
      }
    } catch (error) {
      this.syncStatus = 'error';
      this.emitStatusChange('error');
    }
  }

  private initializeWebSocket() {
    // WebSocket untuk real-time sync (wajib untuk performa optimal)
    try {
      // Check if WebSocket is explicitly enabled
      const wsEnabled = localStorage.getItem('websocket_enabled') === 'true';
      if (!wsEnabled) {
        // WebSocket disabled - use polling fallback silently
        return;
      }
      
      // Use fixed WebSocket URL
      const wsUrl = 'ws://server-tljp.tail75a421.ts.net:8888/ws';
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (e) {
        }
      };
      
      this.ws.onerror = () => {
        // Silently handle WebSocket errors - polling will be used instead
        this.ws = null;
      };
      
      this.ws.onclose = () => {
        // WebSocket closed - will use polling
        this.ws = null;
      };
    } catch (error) {
      // Silently fail - polling will be used instead
      this.ws = null;
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
    }, 10000); // OPTIMIZED: Process every 10 seconds (sebelumnya 2 detik) - kurangi bandwidth usage
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
        throw error;
      }
    }
  }

  private async syncToServer(key: string, data: any, _serverUrl: string): Promise<void> {
    // Upload local changes to server via WebSocket (lebih cepat, tidak pakai HTTP/Vercel)
    const ready = await websocketClient.waitUntilReady(10000);
    if (!ready) {
      throw new Error('WebSocket not available. Please enable WebSocket in settings.');
    }
    
    await websocketClient.post(key, data, Date.now());
  }

  /**
   * Download data from server and merge with local data
   */
  private async downloadServerData(key: string, _serverUrl: string): Promise<void> {
    try {
      // Both server and local use general-trading/ with dash
      const storageKey = `general-trading/${key}`;
      const currentData = localStorage.getItem(storageKey);
      let currentOrders: any[] = [];
      
      if (currentData) {
        try {
          const parsed = JSON.parse(currentData);
          currentOrders = parsed.value || parsed || [];
        } catch (e) {
        }
      }
      
      // Download from server via WebSocket (lebih cepat)
      const ready = await websocketClient.waitUntilReady(10000);
      if (!ready) {
        throw new Error('WebSocket not available. Please enable WebSocket in settings.');
      }
      
      const serverDataRaw = await websocketClient.get(storageKey);
      
      // WebSocket returns {value: ..., timestamp: ...} format
      let serverData = serverDataRaw;
      if (serverDataRaw && typeof serverDataRaw === 'object' && 'value' in serverDataRaw) {
        serverData = serverDataRaw.value;
      }
      
      // Process server data with multiple extraction methods
      let serverOrders: any[] = [];
      
      // Method 1: Wrapped format with .value property
      if (serverData && serverData.value && Array.isArray(serverData.value)) {
        serverOrders = serverData.value;
      }
      // Method 2: Direct array format
      else if (Array.isArray(serverData)) {
        serverOrders = serverData;
      }
      // Method 3: Data property format
      else if (serverData && serverData.data && Array.isArray(serverData.data)) {
        serverOrders = serverData.data;
      }
      // Method 4: Check for other common property names
      else if (serverData && serverData.items && Array.isArray(serverData.items)) {
        serverOrders = serverData.items;
      }
      // Method 5: Check if .value is an empty object (server has no data)
      else if (serverData && serverData.value && typeof serverData.value === 'object' && Object.keys(serverData.value).length === 0) {
        return;
      }
      
      if (serverOrders.length === 0) {
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
      
    } catch (error) {
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
      const dataTypes = ['gt_salesOrders', 'gt_quotations', 'gt_products', 'gt_customers', 'gt_suppliers', 'userAccessControl'];
      
      for (const dataType of dataTypes) {
        try {
          await this.downloadServerData(dataType, storageConfig.serverUrl);
        } catch (error) {
          // Continue with other data types
        }
      }
      
      this.syncStatus = 'synced';
      this.emitStatusChange('synced');
      
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
      }
    });
  }

  private emitStorageChange(key: string, data: any) {
    const callbacks = this.listeners.get(key) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
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