/**
 * WebSocket Client untuk Real-Time Sync dan Event Broadcasting
 * 
 * ARCHITECTURE:
 * - POST / PUT / DELETE → REST API (HTTP) → PostgreSQL
 * - GET → REST API (HTTP) → PostgreSQL
 * - Real-time sync → WebSocket → broadcast changes to other devices
 * 
 * WebSocket methods (post, delete, get) are DEPRECATED and kept only for backward compatibility.
 * All data operations should use REST API via storageService or direct fetch calls.
 */

import { StorageKeys } from './storage';

class WebSocketClient {
  private ws: WebSocket | null = null;
  private wsUrl: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3; // Reduced from 5
  private reconnectDelay = 2000; // Increased from 1000 to prevent spam
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
  private messageId = 0;
  private storageListener: ((e: StorageEvent) => void) | null = null;
  private lastErrorTime = 0; // Track last error to prevent spam
  private connectionAttempted = false; // Track if we tried to connect

  constructor() {
    this.initialize();
    this.setupStorageListener();
  }

  private initialize() {
    // Get WebSocket URL from localStorage (set by Settings page)
    // Default to Tailscale Funnel if not set
    const storedWsUrl = localStorage.getItem('websocket_url');
    this.wsUrl = storedWsUrl || 'wss://server-tljp.tail75a421.ts.net/ws';
    
    // Store in localStorage for reference
    localStorage.setItem('websocket_url', this.wsUrl);
    localStorage.setItem('websocket_enabled', 'true');

    console.log(`[WebSocketClient] 🔌 Initialized with URL: ${this.wsUrl}`);
    
    this.connect();
    
    // Listen for WebSocket URL changes from Settings page
    this.setupStorageListener();
  }

  private setupStorageListener() {
    // Listen untuk perubahan websocket_url dan websocket_enabled
    this.storageListener = (e: StorageEvent) => {
      if (e.key === 'websocket_url' && e.newValue) {
        const newWsUrl = e.newValue;
        if (newWsUrl !== this.wsUrl) {
          console.log(`[WebSocketClient] 🔄 WebSocket URL changed from ${this.wsUrl} to ${newWsUrl}`);
          this.wsUrl = newWsUrl;
          // Reconnect with new URL
          if (this.ws) {
            this.ws.close();
          }
          this.reconnectAttempts = 0;
          this.connect();
        }
      } else if (e.key === 'websocket_enabled') {
        const enabled = e.newValue === 'true';
        if (enabled && !this.isConnected()) {
          console.log(`[WebSocketClient] 🔌 WebSocket enabled, connecting...`);
          this.reconnectAttempts = 0;
          this.connect();
        } else if (!enabled && this.isConnected()) {
          console.log(`[WebSocketClient] 🔌 WebSocket disabled, closing...`);
          if (this.ws) {
            this.ws.close();
          }
        }
      }
    };
    
    window.addEventListener('storage', this.storageListener);
  }

  private connect() {
    try {
      // Use WebSocket URL from localStorage (set by Settings page)
      // Or use default Tailscale Funnel
      const storedWsUrl = localStorage.getItem('websocket_url');
      if (storedWsUrl) {
        this.wsUrl = storedWsUrl;
      } else {
        this.wsUrl = 'wss://server-tljp.tail75a421.ts.net/ws';
      }
      
      // Only log on first attempt (not spam on retries)
      if (this.reconnectAttempts === 0) {
        console.log(`[WebSocketClient] 🔌 Attempting connection to: ${this.wsUrl}`);
      }
      
      try {
        this.ws = new WebSocket(this.wsUrl);
      } catch (wsConstructorError) {
        console.error('[WebSocketClient] ❌ Failed to construct WebSocket:', wsConstructorError);
        this.ws = null;
        return;
      }
      
      this.ws.onopen = () => {
        console.log('[WebSocketClient] ✅ WebSocket connected!');
        this.reconnectAttempts = 0;
        this.connectionAttempted = false;
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Handle response to pending requests
          if (data.requestId && this.pendingRequests.has(data.requestId)) {
            const { resolve, reject } = this.pendingRequests.get(data.requestId)!;
            this.pendingRequests.delete(data.requestId);
            
            if (data.success) {
              resolve(data);
            } else {
              reject(new Error(data.error || 'WebSocket request failed'));
            }
            return;
          }
          
          // Handle broadcast messages
          if (data.type === 'STORAGE_CHANGED' || data.type === 'STORAGE_DELETED') {
            window.dispatchEvent(new CustomEvent('app-storage-changed', {
              detail: {
                key: data.key,
                value: data.data,
                action: data.type === 'STORAGE_DELETED' ? 'delete' : 'update'
              }
            }));
          }
        } catch (error) {
          // Silent error handling
        }
      };
      
      this.ws.onerror = (event) => {
        // Throttle error logging - max 1 error per 10 seconds
        const now = Date.now();
        if (now - this.lastErrorTime > 10000) {
          console.log(`[WebSocketClient] ⚠️ WebSocket connection failed, will retry...`);
          this.lastErrorTime = now;
        }
        this.ws = null;
      };
      
      this.ws.onclose = (event) => {
        this.ws = null;
        // Try to reconnect with exponential backoff
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
          
          // Silent reconnect - don't spam log
          setTimeout(() => {
            this.connect();
          }, delay);
        }
      };
    } catch (error) {
      // Silent error handling - will fallback to HTTP
      this.ws = null;
    }
  }

  private isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Send request via WebSocket
   */
  private async sendRequest(action: string, key: string, value?: any, timestamp?: number): Promise<any> {
    if (!this.isConnected()) {
      throw new Error('WebSocket not connected');
    }

    const requestId = `req_${Date.now()}_${++this.messageId}`;
    
    // Determine timeout based on action and key
    // GET requests for large keys (products, materials, etc.) need longer timeout
    const largeKeys = [
      StorageKeys.PACKAGING.PRODUCTS,
      StorageKeys.PACKAGING.MATERIALS,
      StorageKeys.PACKAGING.BOM,
      StorageKeys.PACKAGING.SALES_ORDERS,
      StorageKeys.PACKAGING.PURCHASE_ORDERS,
      StorageKeys.PACKAGING.PRODUCTION,
      StorageKeys.PACKAGING.INVENTORY
    ];
    const isLargeKey = largeKeys.some(largeKey => key.includes(largeKey));
    const timeout = action === 'GET' && isLargeKey ? 60000 : // 60 seconds for large GET requests
                    action === 'GET' ? 30000 : // 30 seconds for regular GET requests
                    10000; // 10 seconds for POST/DELETE
    
    return new Promise((resolve, reject) => {
      // Store request handler
      this.pendingRequests.set(requestId, { resolve, reject });
      
      // Send request
      const message = {
        requestId,
        action,
        key,
        value,
        timestamp: timestamp || Date.now()
      };
      
      try {
        this.ws!.send(JSON.stringify(message));
        
        // Timeout based on action and key size
        setTimeout(() => {
          if (this.pendingRequests.has(requestId)) {
            this.pendingRequests.delete(requestId);
            reject(new Error(`WebSocket request timeout for ${action} ${key}`));
          }
        }, timeout);
      } catch (error) {
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }

  /**
   * Helper: Get HTTP server URL from WebSocket URL (with caching)
   */
  private getHttpServerUrl(): string {
    const wsUrl = localStorage.getItem('websocket_url');
    
    // If WebSocket URL is configured, convert it to HTTP
    if (wsUrl) {
      if (wsUrl.includes('ts.net')) {
        // Tailscale Funnel: wss://server-tljp.tail75a421.ts.net/ws -> https://server-tljp.tail75a421.ts.net
        return wsUrl
          .replace(/^wss:\/\//, 'https://')
          .replace(/^ws:\/\//, 'http://')
          .replace(/\/ws$/, '');
      } else {
        // Direct IP: ws://10.1.1.35:9999/ws -> http://10.1.1.35:9999
        return wsUrl
          .replace(/^wss:\/\//, 'https://')
          .replace(/^ws:\/\//, 'http://')
          .replace(/\/ws$/, '');
      }
    }
    
    // Fallback to stored server_url if available
    const storedUrl = localStorage.getItem('server_url');
    if (storedUrl) {
      return storedUrl;
    }
    
    // Ultimate fallback: Use Tailscale Funnel as default with port 9999
    return 'https://server-tljp.tail75a421.ts.net';
  }

  /**
   * POST/PUT data via WebSocket with HTTP fallback
   */
  async post(key: string, value: any, timestamp?: number): Promise<any> {
    // Normalize key: remove business prefix if present
    const normalizedKey = key.replace(/^(packaging\/|general-trading\/|trucking\/)/, '');
    
    // Try WebSocket if connected
    if (this.isConnected()) {
      try {
        return await this.sendRequest('POST', normalizedKey, value, timestamp);
      } catch (wsError) {
        const errorMsg = wsError instanceof Error ? wsError.message : String(wsError);
        console.log(`[WebSocketClient] POST via WebSocket failed, falling back to HTTP: ${errorMsg}`);
      }
    }
    
    // Fallback to HTTP POST immediately
    try {
      const serverUrl = this.getHttpServerUrl();
      const url = `${serverUrl}/api/storage/${encodeURIComponent(normalizedKey)}`;
      console.log(`[WebSocketClient] 📤 Falling back to HTTP POST for ${normalizedKey} (original: ${key}) to ${serverUrl}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value, timestamp: timestamp || Date.now() })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[WebSocketClient] ✅ Posted data via HTTP for ${normalizedKey}`);
        return data;
      } else {
        throw new Error(`HTTP POST failed: ${response.status}`);
      }
    } catch (httpError) {
      console.error(`[WebSocketClient] ❌ Both WebSocket and HTTP POST failed for ${normalizedKey}:`, httpError);
      throw new Error(`Failed to post data: WebSocket unavailable and HTTP failed`);
    }
  }

  /**
   * DELETE data via WebSocket with HTTP fallback
   */
  async delete(key: string): Promise<any> {
    // Normalize key: remove business prefix if present
    const normalizedKey = key.replace(/^(packaging\/|general-trading\/|trucking\/)/, '');
    
    // Try WebSocket if connected
    if (this.isConnected()) {
      try {
        return await this.sendRequest('DELETE', normalizedKey);
      } catch (wsError) {
        const errorMsg = wsError instanceof Error ? wsError.message : String(wsError);
        console.log(`[WebSocketClient] DELETE via WebSocket failed, falling back to HTTP: ${errorMsg}`);
      }
    }
    
    // Fallback to HTTP DELETE immediately
    try {
      const serverUrl = this.getHttpServerUrl();
      const url = `${serverUrl}/api/storage/${encodeURIComponent(normalizedKey)}`;
      console.log(`[WebSocketClient] 🗑️ Falling back to HTTP DELETE for ${normalizedKey} (original: ${key}) to ${serverUrl}`);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[WebSocketClient] ✅ Deleted data via HTTP for ${normalizedKey}`);
        return data;
      } else {
        throw new Error(`HTTP DELETE failed: ${response.status}`);
      }
    } catch (httpError) {
      console.error(`[WebSocketClient] ❌ Both WebSocket and HTTP DELETE failed for ${normalizedKey}:`, httpError);
      throw new Error(`Failed to delete data: WebSocket unavailable and HTTP failed`);
    }
  }

  /**
   * GET data via WebSocket with HTTP fallback
   */
  async get(key: string): Promise<any> {
    // Normalize key: remove business prefix if present (packaging/, general-trading/, trucking/)
    // Server expects keys without prefix
    const normalizedKey = key.replace(/^(packaging\/|general-trading\/|trucking\/)/, '');
    
    // First, try WebSocket if available (non-blocking)
    if (this.isConnected()) {
      try {
        const response = await this.sendRequest('GET', normalizedKey);
        return response.value;
      } catch (wsError) {
        const errorMsg = wsError instanceof Error ? wsError.message : String(wsError);
        console.log(`[WebSocketClient] GET via WebSocket failed, falling back to HTTP: ${errorMsg}`);
      }
    }
    
    // Fallback to HTTP GET immediately (don't wait for WebSocket)
    try {
      const serverUrl = this.getHttpServerUrl();
      const url = `${serverUrl}/api/storage/${encodeURIComponent(normalizedKey)}`;
      console.log(`[WebSocketClient] 📡 Falling back to HTTP GET for ${normalizedKey} (original: ${key}) from ${serverUrl}`);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log(`[WebSocketClient] ✅ Got data via HTTP for ${normalizedKey}`);
        return data.value || data;
      } else {
        throw new Error(`HTTP GET failed: ${response.status}`);
      }
    } catch (httpError) {
      console.error(`[WebSocketClient] ❌ Both WebSocket and HTTP GET failed for ${normalizedKey}:`, httpError);
      throw new Error(`WebSocket not available and HTTP GET failed. Server offline?`);
    }
  }

  /**
   * Wait until WebSocket is ready (with timeout)
   */
  async waitUntilReady(timeout: number = 15000): Promise<boolean> {
    if (this.isConnected()) {
      return true;
    }
    
    // Check if WebSocket is enabled
    const wsEnabled = localStorage.getItem('websocket_enabled');
    if (wsEnabled === 'false') {
      return false;
    }
    
    const wsUrl = localStorage.getItem('websocket_url') || 'wss://server-tljp.tail75a421.ts.net/ws';
    
    // Try to connect if not connecting or closed
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
      this.connect();
    }
    
    // Wait until connected or timeout (without spam logging)
    const startTime = Date.now();
    while (!this.isConnected() && (Date.now() - startTime) < timeout) {
      // Check if WebSocket is still trying to connect
      if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
        // Still connecting, wait a bit more
        await new Promise(resolve => setTimeout(resolve, 200));
      } else if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
        // Connection failed or closed, try to reconnect
        this.connect();
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return this.isConnected();
  }

  /**
   * Check if WebSocket is available and connected
   */
  isAvailable(): boolean {
    const wsEnabled = localStorage.getItem('websocket_enabled');
    if (wsEnabled === 'false') {
      return false;
    }
    return this.isConnected();
  }

  /**
   * Reconnect WebSocket
   */
  reconnect() {
    if (this.ws) {
      this.ws.close();
    }
    this.connect();
  }
}

export const websocketClient = new WebSocketClient();
