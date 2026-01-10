export interface ProxyLog {
  id: string;
  timestamp: string;
  method: string;
  endpoint: string;
  status?: number;
  statusText?: string;
  requestSize?: number; // bytes
  responseSize?: number; // bytes
  duration?: number; // ms
  error?: string;
  details?: Record<string, any>;
}

const MAX_LOGS = 1000; // Keep last 1000 logs
const LOG_KEY = 'vercelProxyLogs';

/**
 * 🚀 OPTIMASI: Gunakan localStorage langsung untuk logs (tidak sync ke server)
 * Ini menghindari:
 * 1. Recursive logging (set → fetch → log → set → fetch → log...)
 * 2. Network overhead (logs hanya untuk debugging UI, tidak perlu sync)
 * 3. Storage quota issues (500MB+ dalam beberapa detik)
 */
function getLogsFromLocalStorage(): ProxyLog[] {
  try {
    const stored = localStorage.getItem(LOG_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : (parsed.value ? parsed.value : []);
  } catch {
    return [];
  }
}

function saveLogsToLocalStorage(logs: ProxyLog[]): void {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  } catch (error) {
    // Silent fail - jangan break app jika localStorage penuh
  }
}

/**
 * Log Vercel proxy request
 */
export async function logProxyRequest(
  method: string,
  endpoint: string,
  status?: number,
  statusText?: string,
  requestSize?: number,
  responseSize?: number,
  duration?: number,
  error?: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    const log: ProxyLog = {
      id: `proxy-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      timestamp: new Date().toISOString(),
      method,
      endpoint,
      status,
      statusText,
      requestSize,
      responseSize,
      duration,
      error,
      details,
    };

    // 🚀 OPTIMASI: Load dari localStorage langsung (tidak pakai storageService)
    // Ini menghindari recursive logging dan network overhead
    const existingLogs = getLogsFromLocalStorage();
    
    // Add new log at the beginning (newest first)
    const updatedLogs = [log, ...existingLogs];
    
    // Keep only last MAX_LOGS
    const trimmedLogs = updatedLogs.slice(0, MAX_LOGS);
    
    // Save logs ke localStorage langsung (tidak sync ke server)
    saveLogsToLocalStorage(trimmedLogs);
    
    // Dispatch event untuk real-time update
    window.dispatchEvent(new CustomEvent('proxy-log-updated', { detail: { log } }));
  } catch (error) {
    // Silent fail - don't break app if logging fails
  }
}

/**
 * Get all proxy logs
 */
export async function getProxyLogs(): Promise<ProxyLog[]> {
  try {
    // 🚀 OPTIMASI: Load dari localStorage langsung (tidak pakai storageService)
    // Ini menghindari recursive logging dan network overhead
    const logs = getLogsFromLocalStorage();
    return logs.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA; // Newest first
    });
  } catch (error) {
    return [];
  }
}

/**
 * Clear all proxy logs
 */
export async function clearProxyLogs(): Promise<void> {
  try {
    // 🚀 OPTIMASI: Clear dari localStorage langsung (tidak pakai storageService)
    saveLogsToLocalStorage([]);
    window.dispatchEvent(new CustomEvent('proxy-log-updated', { detail: { cleared: true } }));
  } catch (error) {
    // Silent fail
  }
}
