/**
 * Real-Time Sync Engine untuk Trucking Business Module
 * Based on gt-sync.ts pattern - simplified but functional
 */

export type SyncPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

import { websocketClient } from './websocket-client';
import { storageService } from './storage';

export interface SyncOperation {
  id: string;
  key: string;
  data: any;
  priority: SyncPriority;
  timestamp: number;
  retryCount: number;
  metadata?: any;
}

class TruckingSync {
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
    this.checkInitialSyncStatus();
  }

  /**
   * Check initial sync status and download server data if needed
   */
  private async checkInitialSyncStatus() {
    try {
      const selectedBusiness = localStorage.getItem('selectedBusiness');
      if (selectedBusiness !== 'trucking') {
        this.syncStatus = 'synced';
        this.emitStatusChange('synced');
        return;
      }
      
      const storageConfig = storageService.getConfig();
      
      if (storageConfig.type === 'server' && storageConfig.serverUrl) {
        this.syncStatus = 'syncing';
        this.emitStatusChange('syncing');
        
        try {
          // Download essential Trucking data from server
          const essentialKeys = [
            'trucking_customers', 'trucking_vehicles', 'trucking_drivers', 'trucking_routes',
            'trucking_delivery_orders', 'trucking_suratJalan', 'trucking_unitSchedules',
            'trucking_invoices', 'trucking_payments', 'trucking_purchaseOrders',
            'trucking_suratJalanNotifications', 'trucking_invoiceNotifications',
            'userAccessControl'
          ];
          
          await Promise.all(
            essentialKeys.map(key => this.downloadServerData(key, storageConfig.serverUrl))
          );
          
          this.syncStatus = 'synced';
          this.emitStatusChange('synced');
        } catch (error) {
          this.syncStatus = 'synced';
          this.emitStatusChange('synced');
        }
      } else {
        this.syncStatus = 'synced';
        this.emitStatusChange('synced');
      }
    } catch (error) {
      this.syncStatus = 'synced';
      this.emitStatusChange('synced');
    }
  }

  private initializeWebSocket() {
    try {
      const wsEnabled = localStorage.getItem('websocket_enabled') === 'true';
      if (!wsEnabled) return;
      
      const wsUrl = 'wss://server-tljp.tail75a421.ts.net/ws';
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('[TruckingSync] WebSocket connected');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'STORAGE_CHANGED') {
            this.emitStorageChange(message.key, message.data);
          }
        } catch (e) {
          // Ignore parse errors
        }
      };
      
      this.ws.onerror = () => {
        this.ws = null;
      };
      
      this.ws.onclose = () => {
        this.ws = null;
      };
    } catch (error) {
      this.ws = null;
    }
  }

  /**
   * Update data dengan instant local update + background sync
   */
  async updateData(key: string, data: any, priority: SyncPriority = 'MEDIUM'): Promise<void> {
    this.pendingChanges.set(key, data);
    
    const operation: SyncOperation = {
      id: `${key}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      key,
      data,
      priority,
      timestamp: Date.now(),
      retryCount: 0
    };
    
    this.addToQueue(operation);
    this.emitStorageChange(key, data);
  }

  private addToQueue(operation: SyncOperation) {
    this.syncQueue = this.syncQueue.filter(op => op.key !== operation.key);
    
    this.syncQueue.push(operation);
    this.syncQueue.sort((a, b) => {
      const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const aPriority = priorityOrder[a.priority];
      const bPriority = priorityOrder[b.priority];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return a.timestamp - b.timestamp;
    });
  }

  private startQueueProcessor() {
    setInterval(async () => {
      if (this.syncQueue.length > 0 && this.syncStatus !== 'syncing') {
        await this.processQueue();
      }
    }, 10000); // Process every 10 seconds
  }

  private async processQueue() {
    if (this.syncQueue.length === 0) return;
    
    this.syncStatus = 'syncing';
    this.emitStatusChange('syncing');
    
    try {
      const operation = this.syncQueue.shift()!;
      await this.syncOperation(operation);
      
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
      const storageConfig = storageService.getConfig();
      
      if (storageConfig.type === 'local') {
        return;
      }
      
      if (storageConfig.serverUrl) {
        await this.syncToServer(operation.key, operation.data, storageConfig.serverUrl);
      }
    } catch (error) {
      operation.retryCount++;
      
      if (operation.retryCount < this.maxRetries) {
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

  private async syncToServer(key: string, data: any, serverUrl: string): Promise<void> {
    const response = await fetch(`${serverUrl}/api/storage/${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        value: data,
        timestamp: Date.now()
      })
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  }

  /**
   * Download data from server and merge with local data
   */
  private async downloadServerData(key: string, serverUrl: string): Promise<void> {
    try {
      const currentData = localStorage.getItem(key);
      let currentItems: any[] = [];
      
      if (currentData) {
        try {
          const parsed = JSON.parse(currentData);
          currentItems = parsed.value || parsed || [];
        } catch (e) {
          // Ignore parse errors
        }
      }
      
      const response = await fetch(`${serverUrl}/api/storage/${encodeURIComponent(key)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const serverDataRaw = await response.json();
      
      let serverData = serverDataRaw;
      if (serverDataRaw && typeof serverDataRaw === 'object' && 'value' in serverDataRaw) {
        serverData = serverDataRaw.value;
      }
      
      let serverItems: any[] = [];
      
      if (serverData && serverData.value && Array.isArray(serverData.value)) {
        serverItems = serverData.value;
      } else if (Array.isArray(serverData)) {
        serverItems = serverData;
      } else if (serverData && serverData.data && Array.isArray(serverData.data)) {
        serverItems = serverData.data;
      } else if (serverData && serverData.items && Array.isArray(serverData.items)) {
        serverItems = serverData.items;
      }
      
      if (serverItems.length === 0) {
        return;
      }
      
      const mergedItems = [...currentItems];
      let newCount = 0;
      
      serverItems.forEach(serverItem => {
        const exists = currentItems.some(localItem => 
          localItem.id === serverItem.id || 
          localItem.sjNo === serverItem.sjNo ||
          localItem.doNo === serverItem.doNo
        );
        
        if (!exists) {
          mergedItems.push(serverItem);
          newCount++;
        }
      });
      
      const finalData = {
        value: mergedItems,
        timestamp: Date.now(),
        _timestamp: Date.now(),
        lastUpdate: new Date().toISOString(),
        syncedFromServer: true,
        serverSyncAt: new Date().toISOString(),
        newItemsAdded: newCount
      };
      
      localStorage.setItem(key, JSON.stringify(finalData));
      
      window.dispatchEvent(new CustomEvent('app-storage-changed', {
        detail: { 
          key,
          value: mergedItems,
          action: 'server-sync'
        }
      }));
      
    } catch (error) {
      // Don't throw - allow sync to continue
    }
  }

  /**
   * Force download all Trucking data from server
   */
  async forceDownloadFromServer(): Promise<void> {
    const storageConfig = storageService.getConfig();
    
    if (storageConfig.type !== 'server' || !storageConfig.serverUrl) {
      throw new Error('Server mode not configured');
    }
    
    this.syncStatus = 'syncing';
    this.emitStatusChange('syncing');
    
    try {
      const dataTypes = [
        'trucking_customers', 'trucking_vehicles', 'trucking_drivers', 'trucking_routes',
        'trucking_delivery_orders', 'trucking_suratJalan', 'trucking_unitSchedules',
        'trucking_invoices', 'trucking_payments', 'trucking_purchaseOrders',
        'userAccessControl'
      ];
      
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

  private getUnsyncedCount(): number {
    return this.syncQueue.length + this.pendingChanges.size;
  }

  getQueueStatus() {
    return {
      queueLength: this.syncQueue.length,
      pendingChanges: this.pendingChanges.size,
      status: this.syncStatus,
      retryCount: this.retryTimeouts.size
    };
  }

  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    if (!this.listeners.has('syncStatus')) {
      this.listeners.set('syncStatus', []);
    }
    
    this.listeners.get('syncStatus')!.push(callback);
    
    return () => {
      const callbacks = this.listeners.get('syncStatus') || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  onStorageChange(key: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    
    this.listeners.get(key)!.push(callback);
    
    return () => {
      const callbacks = this.listeners.get(key) || [];
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    };
  }

  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  async forceSyncAll(): Promise<void> {
    if (this.syncQueue.length === 0 && this.pendingChanges.size === 0) {
      this.syncStatus = 'synced';
      this.emitStatusChange('synced');
      return;
    }
    
    this.syncStatus = 'syncing';
    this.emitStatusChange('syncing');
    
    try {
      for (const [key, data] of this.pendingChanges.entries()) {
        await this.updateData(key, data, 'HIGH');
      }
      
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
        // Ignore callback errors
      }
    });
  }

  private emitStorageChange(key: string, data: any) {
    const callbacks = this.listeners.get(key) || [];
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        // Ignore callback errors
      }
    });
  }

  destroy() {
    if (this.ws) {
      this.ws.close();
    }
    
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
export const truckingSync = new TruckingSync();
