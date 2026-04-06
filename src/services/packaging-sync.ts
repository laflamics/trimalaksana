/**
 * Real-Time Sync Engine untuk Packaging Workflow
 * Implementasi dari mdfile/PACKAGING_ACTION_PLAN.md
 */

export type SyncPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

import { storageService } from './storage';

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

class PackagingSync {
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
   * Check initial sync status based on storage config
   */
  private checkInitialSyncStatus() {
    try {
      const storageConfig = storageService.getConfig();
      
      if (storageConfig.type === 'server' && storageConfig.serverUrl) {
        // If server mode is configured, check if there are unsynced items
        const unsyncedCount = this.getUnsyncedCount();
        if (unsyncedCount === 0) {
          // No unsynced items, set status to synced
          this.syncStatus = 'synced';
          this.emitStatusChange('synced');
        } else {
          // There are unsynced items, set status to idle (will be synced when queue processes)
          this.syncStatus = 'idle';
          this.emitStatusChange('idle');
        }
      } else {
        // Local mode, set status to idle
        this.syncStatus = 'idle';
        this.emitStatusChange('idle');
      }
    } catch (error) {
    }
  }

  private initializeWebSocket() {
    // WebSocket disabled - using polling fallback only
    this.ws = null;
  }

  private handleWebSocketMessage(message: any) {
    if (message.type === 'STORAGE_CHANGED') {
      this.emitStorageChange(message.key, message.data);
    }
  }

  /**
   * Update data dengan instant local update + background sync
   * CRITICAL: Proper timestamp handling to prevent multi-device conflicts
   */
  async updateData(key: string, data: any, priority: SyncPriority = 'MEDIUM'): Promise<void> {
    // 1. Generate high-precision timestamp with device ID
    const timestamp = Date.now();
    const deviceId = this.getDeviceId();
    const preciseTimestamp = timestamp + (Math.random() * 0.999); // Add microsecond precision
    
    // 2. Wrap data with conflict resolution metadata
    const wrappedData = {
      value: data,
      timestamp: preciseTimestamp,
      deviceId: deviceId,
      lastUpdated: new Date(timestamp).toISOString(),
      synced: false,
      version: this.generateVersion(key, data)
    };
    
    // 3. Check for existing data and handle conflicts
    const existingData = this.getExistingData(key);
    const resolvedData = await this.resolveConflicts(key, existingData, wrappedData);
    
    // 4. Update local storage immediately (0ms lag)
    localStorage.setItem(key, JSON.stringify(resolvedData));
    
    // 5. Trigger UI update immediately
    this.emitStorageChange(key, resolvedData.value);
    
    // 6. Queue for background sync with conflict resolution info
    this.queueSync(key, resolvedData.value, priority, resolvedData);
  }

  /**
   * Get data dengan caching
   */
  async getData(key: string): Promise<any> {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      
      // Handle wrapped format {value: ..., timestamp: ...}
      if (parsed && typeof parsed === 'object' && 'value' in parsed) {
        return Array.isArray(parsed.value) ? parsed.value : [];
      }
      
      // Handle direct array format (backward compatibility)
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Get device ID for conflict resolution
   */
  private getDeviceId(): string {
    let deviceId = localStorage.getItem('device_id');
    if (!deviceId) {
      deviceId = 'device-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('device_id', deviceId);
    }
    return deviceId;
  }

  /**
   * Generate version hash for data
   */
  private generateVersion(key: string, data: any): string {
    const dataString = JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get existing data from localStorage
   */
  private getExistingData(key: string): any {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      return JSON.parse(stored);
    } catch (error) {
      return null;
    }
  }

  /**
   * CRITICAL: Resolve conflicts between existing and new data
   * Prevents data corruption from timestamp conflicts between devices
   * SPECIAL HANDLING for deletion conflicts
   */
  private async resolveConflicts(key: string, existingData: any, newData: any): Promise<any> {
    // No existing data - no conflict
    if (!existingData) {
      return newData;
    }

    // Same device - no conflict (sequential updates)
    if (existingData.deviceId === newData.deviceId) {
      return newData;
    }

    // Different devices - potential conflict
    const existingTimestamp = existingData.timestamp || 0;
    const newTimestamp = newData.timestamp || 0;

    // CRITICAL: Check for deletion conflicts
    const existingHasDeletions = this.hasDeletions(existingData.value);
    const newHasDeletions = this.hasDeletions(newData.value);

    if (existingHasDeletions || newHasDeletions) {
      return await this.resolveDeletionConflicts(key, existingData, newData);
    }

    // Apply normal conflict resolution strategy based on data type
    const resolvedData = await this.applyConflictResolution(key, existingData, newData);
    
    return resolvedData;
  }

  /**
   * Check if data contains deleted items
   */
  private hasDeletions(data: any): boolean {
    if (!Array.isArray(data)) return false;
    return data.some((item: any) => item.deleted === true || item.deletedAt);
  }

  /**
   * CRITICAL: Resolve deletion conflicts between devices
   * Ensures deleted items stay deleted and proper tombstone handling
   */
  private async resolveDeletionConflicts(key: string, existingData: any, newData: any): Promise<any> {
    const existingItems = Array.isArray(existingData.value) ? existingData.value : [];
    const newItems = Array.isArray(newData.value) ? newData.value : [];

    // Create a map of all items by ID
    const itemMap = new Map<string, any>();
    
    // Process existing items first
    existingItems.forEach((item: any) => {
      const itemId = this.getItemId(item);
      if (itemId) {
        itemMap.set(itemId, {
          ...item,
          source: 'existing',
          timestamp: existingData.timestamp,
          deviceId: existingData.deviceId
        });
      }
    });

    // Process new items and handle conflicts
    newItems.forEach((item: any) => {
      const itemId = this.getItemId(item);
      if (!itemId) return;

      const existingItem = itemMap.get(itemId);
      
      if (!existingItem) {
        // New item - add it
        itemMap.set(itemId, {
          ...item,
          source: 'new',
          timestamp: newData.timestamp,
          deviceId: newData.deviceId
        });
      } else {
        // Conflict resolution for same item
        const resolvedItem = this.resolveSingleItemDeletionConflict(existingItem, {
          ...item,
          source: 'new',
          timestamp: newData.timestamp,
          deviceId: newData.deviceId
        });
        
        itemMap.set(itemId, resolvedItem);
      }
    });

    // Convert back to array
    const resolvedItems = Array.from(itemMap.values()).map(item => {
      // Remove conflict resolution metadata
      const { source, ...cleanItem } = item;
      return cleanItem;
    });

    return {
      ...newData,
      value: resolvedItems,
      conflictResolution: 'deletionAware',
      conflictTimestamp: Date.now(),
      deletionConflictsResolved: true
    };
  }

  /**
   * Resolve deletion conflict for a single item
   */
  private resolveSingleItemDeletionConflict(existingItem: any, newItem: any): any {
    const existingDeleted = existingItem.deleted === true || existingItem.deletedAt;
    const newDeleted = newItem.deleted === true || newItem.deletedAt;

    // Case 1: Both deleted - use latest deletion timestamp
    if (existingDeleted && newDeleted) {
      const existingDeletionTime = existingItem.deletedTimestamp || existingItem.timestamp;
      const newDeletionTime = newItem.deletedTimestamp || newItem.timestamp;
      
      return newDeletionTime > existingDeletionTime ? newItem : existingItem;
    }

    // Case 2: Only existing is deleted - deletion wins (tombstone preservation)
    if (existingDeleted && !newDeleted) {
      return {
        ...newItem, // Keep any updates
        deleted: true,
        deletedAt: existingItem.deletedAt,
        deletedTimestamp: existingItem.deletedTimestamp,
        deletedBy: existingItem.deletedBy || existingItem.deviceId,
        resurrectionPrevented: true
      };
    }

    // Case 3: Only new is deleted - deletion wins
    if (!existingDeleted && newDeleted) {
      return newItem;
    }

    // Case 4: Neither deleted - normal conflict resolution (latest timestamp)
    return newItem.timestamp > existingItem.timestamp ? newItem : existingItem;
  }

  /**
   * Get item ID from various ID fields
   */
  private getItemId(item: any): string | null {
    return item.id || item._id || item.code || item.number || 
           item.soNo || item.spkNo || item.poNo || item.grnNo || 
           item.sjNo || item.invoiceNo || null;
  }

  /**
   * Apply conflict resolution strategy based on data type
   */
  private async applyConflictResolution(key: string, existingData: any, newData: any): Promise<any> {
    const existingValue = existingData.value;
    const newValue = newData.value;

    // Strategy 1: Production data - additive merge for quantities
    if (key === 'production' && Array.isArray(existingValue) && Array.isArray(newValue)) {
      return this.resolveProductionConflicts(existingData, newData);
    }

    // Strategy 2: Inventory data - recalculate from operations
    if (key === 'inventory' && Array.isArray(existingValue) && Array.isArray(newValue)) {
      return this.resolveInventoryConflicts(existingData, newData);
    }

    // Strategy 3: Sales Orders - merge compatible changes
    if (key === 'salesOrders' && Array.isArray(existingValue) && Array.isArray(newValue)) {
      return this.resolveSalesOrderConflicts(existingData, newData);
    }

    // Strategy 4: Default - Last Write Wins (latest timestamp)
    if (newData.timestamp > existingData.timestamp) {
      return {
        ...newData,
        conflictResolution: 'lastWriteWins',
        conflictTimestamp: Date.now(),
        previousVersion: {
          timestamp: existingData.timestamp,
          deviceId: existingData.deviceId,
          version: existingData.version
        }
      };
    } else {
      // Keep existing data (it's newer)
      return existingData;
    }
  }

  /**
   * Resolve production conflicts - additive merge for quantities
   */
  private resolveProductionConflicts(existingData: any, newData: any): any {
    const existingProductions = existingData.value || [];
    const newProductions = newData.value || [];

    // Find productions that exist in both datasets
    const mergedProductions = [...existingProductions];
    
    newProductions.forEach((newProd: any) => {
      const existingIndex = mergedProductions.findIndex((existing: any) => existing.id === newProd.id);
      
      if (existingIndex >= 0) {
        const existingProd = mergedProductions[existingIndex];
        
        // CRITICAL: For production quantities, add them together (both devices produced)
        if (existingProd.qtyProduced && newProd.qtyProduced) {
          mergedProductions[existingIndex] = {
            ...existingProd,
            ...newProd,
            qtyProduced: (existingProd.qtyProduced || 0) + (newProd.qtyProduced || 0),
            progress: (existingProd.progress || 0) + (newProd.qtyProduced || 0),
            conflictResolved: true,
            mergedOperations: [
              { deviceId: existingData.deviceId, qty: existingProd.qtyProduced, timestamp: existingData.timestamp },
              { deviceId: newData.deviceId, qty: newProd.qtyProduced, timestamp: newData.timestamp }
            ]
          };
        } else {
          // No quantity conflict - use latest timestamp
          mergedProductions[existingIndex] = newData.timestamp > existingData.timestamp ? newProd : existingProd;
        }
      } else {
        // New production - add it
        mergedProductions.push(newProd);
      }
    });

    return {
      ...newData,
      value: mergedProductions,
      conflictResolution: 'productionAdditive',
      conflictTimestamp: Date.now()
    };
  }

  /**
   * Resolve inventory conflicts - recalculate from operations
   */
  private resolveInventoryConflicts(existingData: any, newData: any): any {
    const existingInventory = existingData.value || [];
    const newInventory = newData.value || [];

    const mergedInventory = [...existingInventory];

    newInventory.forEach((newItem: any) => {
      const existingIndex = mergedInventory.findIndex((existing: any) => 
        existing.id === newItem.id || existing.codeItem === newItem.codeItem
      );

      if (existingIndex >= 0) {
        const existingItem = mergedInventory[existingIndex];
        
        // CRITICAL: Recalculate inventory from base + all operations
        const baseStock = existingItem.stockPremonth || 0;
        const totalReceive = Math.max(existingItem.receive || 0, newItem.receive || 0);
        const totalOutgoing = Math.max(existingItem.outgoing || 0, newItem.outgoing || 0);
        const totalReturn = Math.max(existingItem.return || 0, newItem.return || 0);
        
        mergedInventory[existingIndex] = {
          ...existingItem,
          ...newItem,
          receive: totalReceive,
          outgoing: totalOutgoing,
          return: totalReturn,
          nextStock: baseStock + totalReceive - totalOutgoing + totalReturn,
          conflictResolved: true,
          lastCalculated: new Date().toISOString(),
          operations: [
            { type: 'RECEIVE', qty: totalReceive, source: 'merged' },
            { type: 'OUTGOING', qty: totalOutgoing, source: 'merged' },
            { type: 'RETURN', qty: totalReturn, source: 'merged' }
          ]
        };
      } else {
        mergedInventory.push(newItem);
      }
    });

    return {
      ...newData,
      value: mergedInventory,
      conflictResolution: 'inventoryRecalculate',
      conflictTimestamp: Date.now()
    };
  }

  /**
   * Resolve sales order conflicts - merge compatible changes
   */
  private resolveSalesOrderConflicts(existingData: any, newData: any): any {
    const existingSOs = existingData.value || [];
    const newSOs = newData.value || [];

    const mergedSOs = [...existingSOs];

    newSOs.forEach((newSO: any) => {
      const existingIndex = mergedSOs.findIndex((existing: any) => existing.id === newSO.id);

      if (existingIndex >= 0) {
        const existingSO = mergedSOs[existingIndex];
        
        // Merge compatible changes (confirmation + customer updates)
        mergedSOs[existingIndex] = {
          ...existingSO,
          ...newSO,
          // Keep confirmation if either device confirmed
          confirmed: existingSO.confirmed || newSO.confirmed,
          confirmedAt: existingSO.confirmedAt || newSO.confirmedAt,
          // Use latest customer info
          customer: newData.timestamp > existingData.timestamp ? newSO.customer : existingSO.customer,
          conflictResolved: true,
          mergedChanges: {
            existingDevice: existingData.deviceId,
            newDevice: newData.deviceId,
            mergedAt: new Date().toISOString()
          }
        };
      } else {
        mergedSOs.push(newSO);
      }
    });

    return {
      ...newData,
      value: mergedSOs,
      conflictResolution: 'salesOrderMerge',
      conflictTimestamp: Date.now()
    };
  }
  /**
   * Queue sync operation with conflict resolution metadata
   */
  private queueSync(key: string, data: any, priority: SyncPriority, metadata?: any) {
    const operation: SyncOperation = {
      id: `${key}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      key,
      data,
      priority,
      timestamp: Date.now(),
      retryCount: 0,
      metadata: metadata // Include conflict resolution info
    };
    
    // Remove existing operation for same key to prevent duplicates
    this.syncQueue = this.syncQueue.filter(op => op.key !== key);
    
    // Insert based on priority
    const priorityOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
    const insertIndex = this.syncQueue.findIndex(op => 
      priorityOrder[op.priority] > priorityOrder[priority]
    );
    
    if (insertIndex === -1) {
      this.syncQueue.push(operation);
    } else {
      this.syncQueue.splice(insertIndex, 0, operation);
    }
  }

  /**
   * Process sync queue dengan optimasi
   */
  private startQueueProcessor() {
    let backoffDelay = 1000; // Start with 1s
    const maxBackoffDelay = 30000; // Max 30s
    
    const processQueueLoop = async () => {
      if (this.syncQueue.length === 0) {
        // Queue is empty, check final status
        const unsyncedCount = this.getUnsyncedCount();
        const storageConfig = storageService.getConfig();
        
        if (storageConfig.type === 'server' && storageConfig.serverUrl) {
          if (unsyncedCount === 0) {
            this.syncStatus = 'synced';
            this.emitStatusChange('synced');
          } else {
            this.syncStatus = 'idle';
            this.emitStatusChange('idle');
          }
        } else {
          this.syncStatus = 'idle';
          this.emitStatusChange('idle');
        }
        
        // Exponential backoff when queue is empty
        backoffDelay = Math.min(backoffDelay * 1.2, maxBackoffDelay);
        setTimeout(processQueueLoop, backoffDelay);
        return;
      }
      
      if (this.syncStatus === 'syncing') {
        // Still syncing, wait a bit
        setTimeout(processQueueLoop, 100);
        return;
      }
      
      // Reset backoff when we have work
      backoffDelay = 1000;
      
      await this.processQueue();
      
      // Continue processing with short delay
      setTimeout(processQueueLoop, 100);
    };
    
    processQueueLoop();
  }

  private async processQueue() {
    if (this.syncQueue.length === 0) {
      // Queue is empty, check final status
      const unsyncedCount = this.getUnsyncedCount();
      const storageConfig = storageService.getConfig();
      
      if (storageConfig.type === 'server' && storageConfig.serverUrl) {
        if (unsyncedCount === 0) {
          this.syncStatus = 'synced';
          this.emitStatusChange('synced');
        } else {
          this.syncStatus = 'idle';
          this.emitStatusChange('idle');
        }
      } else {
        this.syncStatus = 'idle';
        this.emitStatusChange('idle');
      }
      return;
    }
    
    this.syncStatus = 'syncing';
    this.emitStatusChange('syncing');
    
    const operation = this.syncQueue.shift()!;
    
    try {
      await this.syncToServer(operation);
      
      // Mark as synced in localStorage
      const stored = localStorage.getItem(operation.key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object' && 'value' in parsed) {
          parsed.synced = true;
          localStorage.setItem(operation.key, JSON.stringify(parsed));
        }
      }
      
      // Check if queue is empty after sync
      if (this.syncQueue.length === 0) {
        const unsyncedCount = this.getUnsyncedCount();
        const storageConfig = storageService.getConfig();
        
        if (storageConfig.type === 'server' && storageConfig.serverUrl) {
          if (unsyncedCount === 0) {
            this.syncStatus = 'synced';
            this.emitStatusChange('synced');
          } else {
            this.syncStatus = 'idle';
            this.emitStatusChange('idle');
          }
        } else {
          this.syncStatus = 'idle';
          this.emitStatusChange('idle');
        }
      }
      // If queue is not empty, status will remain 'syncing' and processQueue will be called again
      
    } catch (error) {
      if (operation.retryCount < this.maxRetries) {
        // Retry with exponential backoff
        operation.retryCount++;
        const delay = this.baseRetryDelay * Math.pow(2, operation.retryCount - 1);
        
        const timeoutId = setTimeout(() => {
          this.syncQueue.unshift(operation);
          this.retryTimeouts.delete(operation.id);
        }, delay);
        
        this.retryTimeouts.set(operation.id, timeoutId);
      } else {
        this.syncStatus = 'error';
        this.emitStatusChange('error');
      }
    }
  }

  /**
   * Sync to server with conflict resolution metadata
   */
  private async syncToServer(operation: SyncOperation): Promise<void> {
    const storageConfig = storageService.getConfig();
    
    if (storageConfig.type !== 'server' || !storageConfig.serverUrl) {
      return; // Skip server sync if not configured
    }
    
    try {
      const response = await fetch(`${storageConfig.serverUrl}/api/storage/${encodeURIComponent(operation.key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: operation.data,
          timestamp: operation.timestamp
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error: any) {
      // Handle conflict atau error lainnya
      if (error.message && error.message.includes('conflict')) {
        // Try to get server data for conflict resolution
        try {
          const getResponse = await fetch(`${storageConfig.serverUrl}/api/storage/${encodeURIComponent(operation.key)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (getResponse.ok) {
            const serverData = await getResponse.json();
            await this.handleServerConflict(operation, serverData);
            return;
          }
          throw error;
        } catch (getError) {
          throw error;
        }
      }
      throw error;
    }
  }

  /**
   * Handle server-side conflicts
   */
  private async handleServerConflict(operation: SyncOperation, serverData: any): Promise<void> {
    
    // Get current local data
    const localData = this.getExistingData(operation.key);
    
    // Resolve conflict between local and server data
    const resolvedData = await this.resolveConflicts(operation.key, serverData, localData);
    
    // Update local storage with resolved data
    localStorage.setItem(operation.key, JSON.stringify({
      ...resolvedData,
      synced: true,
      serverConflictResolved: true,
      serverConflictTimestamp: Date.now()
    }));
    
    // Emit update to UI
    this.emitStorageChange(operation.key, resolvedData.value);
    
    // Retry sync with resolved data
    const retryOperation: SyncOperation = {
      ...operation,
      data: resolvedData.value,
      metadata: {
        ...operation.metadata,
        serverConflictResolved: true,
        originalServerData: serverData
      }
    };
    
    await this.syncToServer(retryOperation);
  }

  /**
   * Emit storage change event
   */
  private emitStorageChange(key: string, data: any) {
    const listeners = this.listeners.get(key) || [];
    listeners.forEach(listener => {
      try {
        listener(data);
      } catch (error) {
      }
    });
    
    // Also emit global storage event
    window.dispatchEvent(new CustomEvent('app-storage-changed', {
      detail: { key, data }
    }));
  }

  /**
   * Emit status change event
   */
  private emitStatusChange(status: SyncStatus) {
    const listeners = this.listeners.get('status') || [];
    listeners.forEach(listener => {
      try {
        listener(status);
      } catch (error) {
      }
    });
  }

  /**
   * Add event listener
   */
  addEventListener(event: string, listener: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(event: string, listener: Function) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Get sync status
   */
  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  /**
   * Subscribe to sync status changes (compatible with storageService API)
   */
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.addEventListener('status', callback);
    // Return unsubscribe function
    return () => {
      this.removeEventListener('status', callback);
    };
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return {
      pending: this.syncQueue.length,
      status: this.syncStatus,
      unsynced: this.getUnsyncedCount()
    };
  }

  /**
   * Get unsynced data count
   */
  private getUnsyncedCount(): number {
    let count = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object' && 'synced' in parsed && !parsed.synced) {
              count++;
            }
          }
        } catch (error) {
          // Skip invalid JSON
        }
      }
    }
    return count;
  }

  /**
   * Force sync all unsynced data
   */
  async forceSyncAll(): Promise<void> {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object' && 'synced' in parsed && !parsed.synced) {
              this.queueSync(key, parsed.value, 'HIGH');
            }
          }
        } catch (error) {
          // Skip invalid JSON
        }
      }
    }
  }

  /**
   * Clear all pending operations
   */
  clearQueue(): void {
    this.syncQueue = [];
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
  }

  /**
   * Destroy instance
   */
  destroy(): void {
    this.clearQueue();
    if (this.ws) {
      this.ws.close();
    }
    this.listeners.clear();
  }
}

// Singleton instance
export const packagingSync = new PackagingSync();