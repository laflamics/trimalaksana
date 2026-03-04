/**
 * API Client Service
 * Connects to Node.js server on PC Utama
 */

// ============================================
// Configuration - Dynamic URL Detection
// ============================================

// Detect if running in Electron app
// CRITICAL: Check process.type (only available in Electron main/preload context)
const isElectronApp = () => {
  try {
    // Check 1: window.electron.ipcRenderer (preload script injection)
    if ((window as any).electron?.ipcRenderer) {
      return true;
    }
    
    // Check 2: process.type === 'renderer' AND process.versions.electron
    if (typeof (window as any).process !== 'undefined') {
      const proc = (window as any).process;
      if (proc.type === 'renderer' && proc.versions?.electron) {
        return true;
      }
    }
    
    // Check 3: file:// protocol (Electron loads from file system)
    if (window.location.protocol === 'file:') {
      return true;
    }
    
    return false;
  } catch {
    return false;
  }
};

// Detect if running in Capacitor app
const isCapacitorApp = () => {
  try {
    return !!(window as any).Capacitor && 
           typeof (window as any).Capacitor.isNativePlatform === 'function';
  } catch {
    return false;
  }
};

// Get API Base URL with smart detection
const getAPIBaseURL = () => {
  // ELECTRON APP: Direct access to Tailscale (HTTP, no SSL issues)
  if (isElectronApp()) {
    return 'http://server-tljp.tail75a421.ts.net:9999';
  }
  
  // CAPACITOR APP: Direct access to Tailscale (HTTP, no SSL issues)
  if (isCapacitorApp()) {
    return 'http://server-tljp.tail75a421.ts.net:9999';
  }
  
  // WEB APP: Use reverse proxy at noxtiz.com (HTTPS, valid cert)
  // Browser will request: https://www.noxtiz.com/api/*
  // Nginx will forward to: http://server-tljp.tail75a421.ts.net:9999
  return `${window.location.origin}/api`;
};

const API_BASE_URL = getAPIBaseURL();

// WebSocket URL (for real-time sync)
const getWSBaseURL = () => {
  // ELECTRON APP: Direct access to Tailscale (WS, no SSL issues)
  if (isElectronApp()) {
    return 'ws://server-tljp.tail75a421.ts.net:9999/ws';
  }
  
  // CAPACITOR APP: Direct access to Tailscale (WS, no SSL issues)
  if (isCapacitorApp()) {
    return 'ws://server-tljp.tail75a421.ts.net:9999/ws';
  }
  
  // WEB APP: Use reverse proxy at noxtiz.com (WSS, valid cert)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/ws`;
};

const WS_BASE_URL = getWSBaseURL();

// ============================================
// API Client
// ============================================

export class ApiClient {
  private baseUrl: string;
  private wsUrl: string;

  constructor(baseUrl: string = API_BASE_URL, wsUrl: string = WS_BASE_URL) {
    this.baseUrl = baseUrl;
    this.wsUrl = wsUrl;
  }

  /**
   * GET - Retrieve data from server
   */
  async get(key: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/storage/${key}`);
      if (!response.ok) {
        throw new Error(`Failed to get ${key}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`[ApiClient] GET error for ${key}:`, error);
      throw error;
    }
  }

  /**
   * POST - Save data to server
   */
  async post(key: string, value: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/storage/${key}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(value),
      });
      if (!response.ok) {
        throw new Error(`Failed to post ${key}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`[ApiClient] POST error for ${key}:`, error);
      throw error;
    }
  }

  /**
   * PUT - Update data on server
   */
  async put(key: string, value: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/storage/${key}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(value),
      });
      if (!response.ok) {
        throw new Error(`Failed to put ${key}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`[ApiClient] PUT error for ${key}:`, error);
      throw error;
    }
  }

  /**
   * DELETE - Delete data from server
   */
  async delete(key: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/storage/${key}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`Failed to delete ${key}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`[ApiClient] DELETE error for ${key}:`, error);
      throw error;
    }
  }

  /**
   * GET ALL - Retrieve all data
   */
  async getAll(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/storage/all`);
      if (!response.ok) {
        throw new Error(`Failed to get all: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`[ApiClient] GET ALL error:`, error);
      throw error;
    }
  }

  /**
   * SYNC - Sync data with server
   */
  async sync(data: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/storage/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error(`Failed to sync: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`[ApiClient] SYNC error:`, error);
      throw error;
    }
  }

  /**
   * BLOB UPLOAD - Upload file to MinIO
   */
  async uploadBlob(
    file: File,
    business: 'packaging' | 'trucking' | 'general-trading'
  ): Promise<any> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      console.log(`[ApiClient] 📤 Starting upload to ${this.baseUrl}/api/blob/upload?business=${business}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(
        `${this.baseUrl}/api/blob/upload?business=${business}`,
        {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      console.log(`[ApiClient] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to upload blob: ${response.status} ${response.statusText} - ${errorText}`);
      }
      const result = await response.json();
      console.log(`[ApiClient] ✅ File uploaded: ${result.fileId}`);
      return result;
    } catch (error) {
      console.error(`[ApiClient] BLOB UPLOAD error:`, error);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Upload timeout - server not responding');
      }
      throw error;
    }
  }

  /**
   * BLOB DELETE - Delete file from MinIO
   */
  async deleteBlob(business: string, fileId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/blob/delete/${business}/${fileId}`,
        {
          method: 'DELETE',
        }
      );
      if (!response.ok) {
        throw new Error(`Failed to delete blob: ${response.statusText}`);
      }
      const result = await response.json();
      console.log(`[ApiClient] ✅ File deleted: ${fileId}`);
      return result;
    } catch (error) {
      console.error(`[ApiClient] BLOB DELETE error:`, error);
      throw error;
    }
  }

  /**
   * BLOB LIST - List files in business storage
   */
  async listBlobs(business: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/blob/list/${business}`);
      if (!response.ok) {
        throw new Error(`Failed to list blobs: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`[ApiClient] BLOB LIST error:`, error);
      throw error;
    }
  }

  /**
   * BLOB METADATA - Get file metadata
   */
  async getBlobMetadata(fileId: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/api/blob/metadata/${fileId}`);
      if (!response.ok) {
        throw new Error(`Failed to get blob metadata: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`[ApiClient] BLOB METADATA error:`, error);
      throw error;
    }
  }

  /**
   * HEALTH CHECK - Check if server is running
   */
  async health(): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      if (!response.ok) {
        throw new Error(`Server health check failed: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`[ApiClient] HEALTH CHECK error:`, error);
      throw error;
    }
  }

  /**
   * WEBSOCKET - Connect to WebSocket for real-time sync
   */
  connectWebSocket(
    onMessage: (data: any) => void,
    onError: (error: any) => void,
    onClose: () => void
  ): WebSocket {
    try {
      const ws = new WebSocket(this.wsUrl);

      ws.onopen = () => {
        console.log('[ApiClient] WebSocket connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('[ApiClient] WebSocket message parse error:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[ApiClient] WebSocket error:', error);
        onError(error);
      };

      ws.onclose = () => {
        console.log('[ApiClient] WebSocket closed');
        onClose();
      };

      return ws;
    } catch (error) {
      console.error('[ApiClient] WebSocket connection error:', error);
      throw error;
    }
  }
}

// ============================================
// Export singleton instance
// ============================================

export const apiClient = new ApiClient();

// ============================================
// Export configuration
// ============================================

export { API_BASE_URL, WS_BASE_URL };
