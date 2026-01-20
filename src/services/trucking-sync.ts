/**
 * Real-Time Sync Engine untuk Trucking Business Module
 * Mirip dengan packaging-sync.ts dan gt-sync.ts
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
  metadata?: any;
}

export interface ConflictResolution {
  strategy: 'lastWriteWins' | 'merge' | 'manual';
  resolver?: (local: any, remote: any, key: string) => any;
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
    // Check initial sync status based on storage config
    this.checkInitialSyncStatus();
  }

  /**
   * Check initial sync status based on storage config
   */
  private async checkInitialSyncStatus() {
    try {
      const storageConfig = JSON.parse(localStorage.getItem('storage_config') || '{"type":"local"}');
      
      if (storageConfig.type === 'server' && storageConfig.serverUrl) {
        // Server mode - check and download data
        this.syncStatus = 'syncing';
        this.emitStatusChange('syncing');
        
        try {
          // Download essential Trucking data from server
          const essentialKeys = [
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
          
          // Download all essential keys in parallel
          await Promise.all(
            essentialKeys.map(key => this.downloadServerData(key, storageConfig.serverUrl))
          );
          
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
      // Default to synced on error
      this.syncStatus = 'synced';
      this.emitStatusChange('synced');
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
      
      // Try to connect WebSocket
      try {
        this.ws = new WebSocket(wsUrl);
        
        this.ws.onopen = () => {
          this.syncStatus = 'synced';
          this.emitStatusChange('synced');
        };
        
        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (message.type === 'data_change') {
              // Handle real-time data change from server
              // Trigger sync for this key
              this.syncKey(message.key);
            }
          } catch (error) {
          }
        };
        
        this.ws.onerror = (error) => {
          // Don't change status on WebSocket error - polling will handle sync
        };
        
        this.ws.onclose = () => {
          // Try to reconnect after delay
          setTimeout(() => {
            if (this.ws?.readyState === WebSocket.CLOSED) {
              this.initializeWebSocket();
            }
          }, 5000);
        };
      } catch (error) {
      }
    } catch (error) {
    }
  }

  private async downloadServerData(key: string, serverUrl: string): Promise<void> {
    try {
      // Pakai WebSocket saja (lebih cepat, tidak pakai HTTP/Vercel)
      const ready = await websocketClient.waitUntilReady(10000);
      if (!ready) {
        return; // Skip if WebSocket not available
      }
      
      await websocketClient.get(key);
    } catch (error) {
      // Don't throw - allow sync to continue
    }
  }

  private getUnsyncedCount(): number {
    // Check localStorage for unsynced items
    // This is a simplified check - in real implementation, you'd track pending changes
    return 0; // Assume synced if no explicit tracking
  }

  private syncKey(key: string): void {
    // Trigger sync for specific key
    // This would integrate with storageService
  }

  private startQueueProcessor(): void {
    // Process sync queue periodically
    setInterval(() => {
      if (this.syncQueue.length > 0) {
        const operation = this.syncQueue.shift();
        if (operation) {
          this.processSyncOperation(operation);
        }
      }
    }, 1000);
  }

  private async processSyncOperation(operation: SyncOperation): Promise<void> {
    // Process individual sync operation
    // This would integrate with storageService to sync data
  }

  private emitStatusChange(status: SyncStatus): void {
    this.syncStatus = status;
    // Emit to storageService so Layout can listen
    const listeners = this.listeners.get('status');
    if (listeners) {
      listeners.forEach(listener => listener(status));
    }
  }

  getStatus(): SyncStatus {
    return this.syncStatus;
  }

  onStatusChange(callback: (status: SyncStatus) => void): () => void {
    if (!this.listeners.has('status')) {
      this.listeners.set('status', []);
    }
    this.listeners.get('status')!.push(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get('status');
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  destroy(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.syncQueue = [];
    this.pendingChanges.clear();
  }
}

// Export singleton instance
export const truckingSync = new TruckingSync();
