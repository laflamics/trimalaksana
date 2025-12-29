/**
 * Real-Time Sync Engine untuk Packaging Workflow
 * Implementasi dari mdfile/PACKAGING_ACTION_PLAN.md
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
  }

  private initializeWebSocket() {
    // WebSocket untuk real-time sync (optional)
    try {
      const wsUrl = localStorage.getItem('websocket_url') || 'ws://localhost:3001/ws';
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('[PackagingSync] WebSocket connected');
      };
      
      this.ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        this.handleWebSocketMessage(message);
      };
      
      this.ws.onerror = () => {
        console.warn('[PackagingSync] WebSocket connection failed, using polling fallback');
      };
    } catch (error) {
      console.warn('[PackagingSync] WebSocket not available, using polling fallback');
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
    // 1. Update local storage immediately (0ms lag)
    const wrappedData = {
      value: data,
      timestamp: Date.now(),
      synced: false
    };
    
    localStorage.setItem(key, JSON.stringify(wrappedData));
    
    // 2. Trigger UI update immediately
    this.emitStorageChange(key, data);
    
    // 3. Queue for background sync
    this.queueSync(key, data, priority);
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
      console.error(`[PackagingSync] Error reading ${key}:`, error);
      return [];
    }
  }

  /**
   * Queue sync operation
   */
  private queueSync(key: string, data: any, priority: SyncPriority) {
    const operation: SyncOperation = {
      id: `${key}_${Date.now()}`,
      key,
      data,
      priority,
      timestamp: Date.now(),
      retryCount: 0
    };
    
    // Remove existing operation for same key
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
      if (this.syncQueue.length === 0 || this.syncStatus === 'syncing') {
        // Exponential backoff when queue is empty
        backoffDelay = Math.min(backoffDelay * 1.2, maxBackoffDelay);
        setTimeout(processQueueLoop, backoffDelay);
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
    if (this.syncQueue.length === 0) return;
    
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
      
      this.syncStatus = 'synced';
      this.emitStatusChange('synced');
      
    } catch (error) {
      console.error(`[PackagingSync] Sync failed for ${operation.key}:`, error);
      
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
        console.error(`[PackagingSync] Max retries exceeded for ${operation.key}`);
        this.syncStatus = 'error';
        this.emitStatusChange('error');
      }
    }
  }

  /**
   * Sync to server
   */
  private async syncToServer(operation: SyncOperation): Promise<void> {
    const storageConfig = JSON.parse(localStorage.getItem('storage_config') || '{"type":"local"}');
    
    if (storageConfig.type !== 'server' || !storageConfig.serverUrl) {
      return; // Skip server sync if not configured
    }
    
    const response = await fetch(`${storageConfig.serverUrl}/api/storage/${operation.key}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: operation.data,
        timestamp: operation.timestamp
      })
    });
    
    if (!response.ok) {
      throw new Error(`Server sync failed: ${response.statusText}`);
    }
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
        console.error('[PackagingSync] Listener error:', error);
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
        console.error('[PackagingSync] Status listener error:', error);
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