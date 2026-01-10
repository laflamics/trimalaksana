import axios from 'axios';

export interface DockerServerConfig {
  url: string;
  port: number;
}

class DockerServerService {
  private baseUrl = '';

  async checkConnection(url: string): Promise<boolean> {
    const fullUrl = url.endsWith('/health') ? url : `${url}/health`;
    console.log(`[Docker Server] Checking connection to: ${fullUrl}`);
    
    // Try with fetch first (more reliable in Electron, longer timeout for network)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds for network latency
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
        // Remove mode restriction for Android WebView compatibility
        // Android WebView will use network_security_config.xml for certificate handling
        mode: 'cors', // Explicitly set CORS mode for better compatibility
        credentials: 'omit', // Don't send credentials for better security
      });
      
      clearTimeout(timeoutId);
      
      console.log(`[Docker Server] Response status:`, response.status, response.statusText);
      console.log(`[Docker Server] Response headers:`, Object.fromEntries(response.headers.entries()));
      
      // Check status code directly (200-299 range)
      if (response.status >= 200 && response.status < 300) {
        try {
          const data = await response.json();
          console.log(`[Docker Server] Connection successful (fetch):`, response.status, data);
          return true;
        } catch (jsonError) {
          // If JSON parse fails, check if response text is OK
          const text = await response.text();
          console.log(`[Docker Server] Response text:`, text);
          if (text.includes('ok') || text.includes('status')) {
            console.log(`[Docker Server] Connection successful (text check):`, response.status);
            return true;
          }
          console.error(`[Docker Server] JSON parse error:`, jsonError);
          return false;
        }
      } else {
        const text = await response.text().catch(() => '');
        console.error(`[Docker Server] Connection failed (fetch):`, response.status, response.statusText, text);
        return false;
      }
    } catch (fetchError: any) {
      console.warn(`[Docker Server] Fetch failed:`, fetchError.message);
      
      // Fallback to axios with longer timeout
      try {
        const response = await axios.get(fullUrl, { 
          timeout: 15000, // 15 seconds
          headers: {
            'Accept': 'application/json',
          },
        });
        console.log(`[Docker Server] Connection successful (axios):`, response.status, response.data);
        return response.status === 200;
      } catch (axiosError: any) {
        console.error(`[Docker Server] Connection failed (axios):`, axiosError.message);
        console.error(`[Docker Server] Error details:`, {
          url: fullUrl,
          code: axiosError.code,
          response: axiosError.response?.status,
          message: axiosError.message,
          fetchError: fetchError.message,
        });
        
        // Provide helpful error message
        if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
          console.error(`[Docker Server] ⚠️ TIMEOUT - Possible issues:`);
          console.error(`  1. Firewall blocking port 3001 on server`);
          console.error(`  2. Docker not binding to 0.0.0.0 (check docker-compose.yml)`);
          console.error(`  3. Tailscale not connected or routing issue`);
          console.error(`  4. Network connectivity issue`);
          console.error(`  → Test from browser: Open http://${fullUrl.replace('http://', '').replace('/health', '')}/health`);
        }
        
        return false;
      }
    }
  }

  async startServer(config: DockerServerConfig): Promise<boolean> {
    // In production, this would interact with Docker API
    // For now, assume server is already running
    this.baseUrl = `http://${config.url}:${config.port}`;
    return await this.checkConnection(this.baseUrl);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}

export const dockerServerService = new DockerServerService();

