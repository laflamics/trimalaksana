/**
 * WebSocket Client untuk CRUD operations (lebih cepat dari HTTP)
 * Menggunakan WebSocket untuk POST, DELETE, GET operations
 */

class WebSocketClient {
  private ws: WebSocket | null = null;
  private wsUrl: string = '';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
  private messageId = 0;
  private storageListener: ((e: StorageEvent) => void) | null = null;

  constructor() {
    this.initialize();
    this.setupStorageListener();
  }

  private initialize() {
    // Get WebSocket URL
    // Default: try to detect from serverUrl if available
    let defaultWsUrl = 'ws://server-tljp.tail75a421.ts.net:8888/ws';
    const storageConfig = localStorage.getItem('storage_config');
    if (storageConfig) {
      try {
        const config = JSON.parse(storageConfig);
        if (config.serverUrl) {
          const isHttps = config.serverUrl.startsWith('https://');
          const isTailscaleFunnel = config.serverUrl.includes('.ts.net');
          
          if (isTailscaleFunnel && isHttps) {
            // Tailscale Funnel with HTTPS - use wss:// without port
            const hostname = config.serverUrl.replace(/^https?:\/\//, '').replace(/:\d+/, '');
            defaultWsUrl = `wss://${hostname}/ws`;
          } else if (isHttps) {
            // HTTPS server - use wss:// with port
            const url = new URL(config.serverUrl);
            defaultWsUrl = `wss://${url.hostname}:${url.port || '443'}/ws`;
          }
        }
      } catch (e) {
        // Use default if parsing fails
      }
    }
    
    this.wsUrl = localStorage.getItem('websocket_url') || defaultWsUrl;
    console.log(`[WebSocketClient] 🚀 Initializing WebSocket client. URL: ${this.wsUrl}`);
    
    // Check if WebSocket is enabled (default: enabled jika belum ada setting)
    const wsEnabled = localStorage.getItem('websocket_enabled');
    console.log(`[WebSocketClient] 📋 WebSocket enabled: ${wsEnabled}`);
    
    if (wsEnabled === 'false') {
      console.warn('[WebSocketClient] ⚠️ WebSocket is disabled, skipping connection');
      return; // WebSocket explicitly disabled
    }
    
    // Auto-enable jika belum ada setting (default enabled)
    if (!wsEnabled) {
      console.log('[WebSocketClient] ✅ Auto-enabling WebSocket (default enabled)');
      localStorage.setItem('websocket_enabled', 'true');
    }

    this.connect();
  }

  private setupStorageListener() {
    // Listen untuk perubahan websocket_url dan websocket_enabled
    this.storageListener = (e: StorageEvent) => {
      if (e.key === 'websocket_url' || e.key === 'websocket_enabled') {
        // Reinitialize jika setting berubah
        if (e.key === 'websocket_url') {
          const newUrl = e.newValue || 'ws://server-tljp.tail75a421.ts.net:8888/ws';
          if (newUrl !== this.wsUrl) {
            this.wsUrl = newUrl;
            this.reconnect();
          }
        } else if (e.key === 'websocket_enabled') {
          const enabled = e.newValue === 'true';
          if (enabled && !this.isConnected()) {
            this.connect();
          } else if (!enabled && this.isConnected()) {
            if (this.ws) {
              this.ws.close();
            }
          }
        }
      }
    };
    
    window.addEventListener('storage', this.storageListener);
    
    // Juga listen untuk perubahan di tab yang sama (via custom event)
    window.addEventListener('local-storage-change', ((e: CustomEvent) => {
      if (e.detail?.key === 'websocket_url' || e.detail?.key === 'websocket_enabled') {
        if (e.detail?.key === 'websocket_url') {
          const newUrl = e.detail?.newValue || 'ws://server-tljp.tail75a421.ts.net:8888/ws';
          if (newUrl !== this.wsUrl) {
            this.wsUrl = newUrl;
            this.reconnect();
          }
        } else if (e.detail?.key === 'websocket_enabled') {
          const enabled = e.detail?.newValue === 'true';
          if (enabled && !this.isConnected()) {
            this.connect();
          } else if (!enabled && this.isConnected()) {
            if (this.ws) {
              this.ws.close();
            }
          }
        }
      }
    }) as EventListener);
  }

  private connect() {
    try {
      // Always get latest URL from localStorage before connecting
      this.wsUrl = localStorage.getItem('websocket_url') || 'ws://server-tljp.tail75a421.ts.net:8888/ws';
      console.log(`[WebSocketClient] 🔌 Connecting to: ${this.wsUrl}`);
      this.ws = new WebSocket(this.wsUrl);
      
      this.ws.onopen = () => {
        console.log('[WebSocketClient] ✅ WebSocket connected!');
        this.reconnectAttempts = 0;
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
      
      this.ws.onerror = (error) => {
        console.error('[WebSocketClient] ❌ WebSocket error:', error);
        this.ws = null;
      };
      
      this.ws.onclose = (event) => {
        console.log(`[WebSocketClient] 🔌 WebSocket closed. Code: ${event.code}, Reason: ${event.reason || 'none'}`);
        this.ws = null;
        // Try to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`[WebSocketClient] 🔄 Reconnecting in ${this.reconnectDelay * this.reconnectAttempts}ms... (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => {
            this.connect();
          }, this.reconnectDelay * this.reconnectAttempts);
        } else {
          console.warn('[WebSocketClient] ⚠️ Max reconnection attempts reached');
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
    const largeKeys = ['products', 'materials', 'bom', 'salesOrders', 'purchaseOrders', 'production', 'inventory'];
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
        console.log(`[WebSocketClient] 📤 Sending ${action} request for ${key} (timeout: ${timeout}ms)`);
        this.ws!.send(JSON.stringify(message));
        
        // Timeout based on action and key size
        setTimeout(() => {
          if (this.pendingRequests.has(requestId)) {
            this.pendingRequests.delete(requestId);
            console.error(`[WebSocketClient] ⏱️ Request timeout for ${action} ${key} after ${timeout}ms`);
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
   * POST/PUT data via WebSocket
   */
  async post(key: string, value: any, timestamp?: number): Promise<any> {
    const ready = await this.waitUntilReady();
    if (!ready) {
      throw new Error('WebSocket not available. Please enable WebSocket in settings.');
    }
    try {
      return await this.sendRequest('POST', key, value, timestamp);
    } catch (error) {
      throw error;
    }
  }

  /**
   * DELETE data via WebSocket
   */
  async delete(key: string): Promise<any> {
    const ready = await this.waitUntilReady();
    if (!ready) {
      throw new Error('WebSocket not available. Please enable WebSocket in settings.');
    }
    try {
      return await this.sendRequest('DELETE', key);
    } catch (error) {
      throw error;
    }
  }

  /**
   * GET data via WebSocket
   */
  async get(key: string): Promise<any> {
    const ready = await this.waitUntilReady();
    if (!ready) {
      throw new Error('WebSocket not available. Please enable WebSocket in settings.');
    }
    try {
      const response = await this.sendRequest('GET', key);
      return response.value;
    } catch (error) {
      throw error;
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
      console.warn('[WebSocketClient] ⚠️ WebSocket is disabled in settings');
      return false;
    }
    
    const wsUrl = localStorage.getItem('websocket_url') || 'ws://server-tljp.tail75a421.ts.net:8888/ws';
    console.log(`[WebSocketClient] 🔄 Waiting for WebSocket ready... URL: ${wsUrl}, Current state: ${this.ws ? this.ws.readyState : 'null'}`);
    
    // Try to connect if not connecting or closed
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
      console.log('[WebSocketClient] 🔌 Attempting to connect...');
      this.connect();
    }
    
    // Wait until connected or timeout
    const startTime = Date.now();
    let lastState = this.ws ? this.ws.readyState : -1;
    while (!this.isConnected() && (Date.now() - startTime) < timeout) {
      const currentState = this.ws ? this.ws.readyState : -1;
      
      // Log state changes
      if (currentState !== lastState) {
        const stateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];
        console.log(`[WebSocketClient] 📊 State changed: ${stateNames[currentState] || 'UNKNOWN'} (${currentState})`);
        lastState = currentState;
      }
      
      // Check if WebSocket is still trying to connect
      if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
        // Still connecting, wait a bit more
        await new Promise(resolve => setTimeout(resolve, 200));
      } else if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
        // Connection failed or closed, try to reconnect
        console.log('[WebSocketClient] 🔄 Reconnecting...');
        this.connect();
        await new Promise(resolve => setTimeout(resolve, 500));
      } else {
        // Wait a bit
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    const connected = this.isConnected();
    if (connected) {
      console.log('[WebSocketClient] ✅ WebSocket is ready!');
    } else {
      console.warn(`[WebSocketClient] ⚠️ WebSocket not ready after ${timeout}ms timeout`);
    }
    
    return connected;
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
