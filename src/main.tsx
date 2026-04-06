import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/global.css';
import { initTheme } from './utils/theme';
import './styles/common.css';
import './styles/mobile.css';
import { focusAppWindow } from './utils/actions';
import { storageService } from './services/storage';

// Initialize theme on app load
initTheme();

console.log('🚀 Starting React app...');

// Production-safe base URL configuration
// Uses window.location.origin for both local and production environments
const getProductionBaseUrl = (): string => {
  if (typeof window === 'undefined') {
    // Fallback for SSR/build time
    return import.meta.env.VITE_API_URL || 'http://localhost:8888';
  }
  
  // Check if running in Electron (file:// protocol)
  if (window.location.protocol === 'file:') {
    // For Electron, use localhost:8888 as default
    return 'http://localhost:8888';
  }
  
  // Runtime: use current origin (works for both local and Tailscale Funnel)
  return window.location.origin;
};

// WebSocket URL configuration - ALWAYS use Tailscale Funnel for data sync
const getProductionWebSocketUrl = (): string => {
  // Always connect to Tailscale Funnel for data sync
  // This ensures all devices sync to the same server
  return 'wss://server-tljp.tail75a421.ts.net/ws';
};

// Initialize WebSocket and API configuration
const initializeAppConfig = async (): Promise<void> => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  
  // Check for server URL from query parameter or environment
  const urlParams = new URLSearchParams(window.location.search);
  const serverUrlParam = urlParams.get('serverUrl');
  const envServerUrl = import.meta.env.VITE_SERVER_URL;
  
  if (serverUrlParam || envServerUrl) {
    const serverUrl = serverUrlParam || envServerUrl;
    console.log(`🔧 Setting server URL from parameter/env: ${serverUrl}`);
    await storageService.setConfig({
      type: 'server',
      serverUrl: serverUrl
    });
  }
  
  const config = storageService.getConfig();
  if (config.type !== 'server') {
    return;
  }
  
  // Configure WebSocket URL
  const wsUrl = getProductionWebSocketUrl();
  localStorage.setItem('websocket_url', wsUrl);
  localStorage.setItem('websocket_enabled', 'true');
  
  // Configure API base URL
  const baseUrl = getProductionBaseUrl();
  localStorage.setItem('server_url', baseUrl);
};

// Initialize app configuration
initializeAppConfig().then(() => {
  // Configuration ready
  console.log('✅ App configuration initialized');
});

// Initialize storage service
const initStorage = (): void => {
  const config = storageService.getConfig();
  if (config.type === 'server') {
    console.log('✅ Server mode enabled');
    console.log(`✅ Server URL: ${getProductionBaseUrl()}`);
  } else {
    console.log('📦 Local storage mode');
  }
};

initStorage();

// React app initialization
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

console.log('✅ Root element found');

// Render React app without StrictMode to prevent double requests in development
ReactDOM.createRoot(rootElement).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

console.log('✅ React app rendered');

if (typeof window !== 'undefined') {
  let focusRestorePending = false;
  let dialogOpen = false;
  let listenerAdded = true; // Track apakah listener sudah di-add
  let ensureWindowFocusHandler: ((e: MouseEvent) => void) | null = null;
  
  // Expose function untuk set dialog state - OPTIMIZED untuk performa
  (window as any).setDialogOpen = (open: boolean) => {
    // Skip jika state sama (prevent unnecessary add/remove)
    if (dialogOpen === open) return;
    
    // Use requestAnimationFrame untuk non-blocking update
    requestAnimationFrame(() => {
      dialogOpen = open;
      
      // REMOVE event listener saat dialog terbuka, ADD kembali saat ditutup
      if (ensureWindowFocusHandler) {
        if (open) {
          // Dialog terbuka - REMOVE listener (hanya jika sudah di-add)
          if (listenerAdded) {
            window.removeEventListener('mousedown', ensureWindowFocusHandler);
            listenerAdded = false;
          }
        } else {
          // Dialog ditutup - ADD kembali listener (hanya jika belum di-add)
          if (!listenerAdded) {
            window.addEventListener('mousedown', ensureWindowFocusHandler, { passive: true });
            listenerAdded = true;
          }
        }
      }
    });
  };
  
  ensureWindowFocusHandler = (e: MouseEvent) => {
    // Skip jika dialog terbuka
    if (dialogOpen) return;
    
    // Skip jika target adalah input, textarea, select, atau element di dalam dialog
    const target = e.target as HTMLElement;
    if (!target) return;
    
    // Skip untuk input elements dan parent-nya
    let element: HTMLElement | null = target;
    while (element) {
      if (element.tagName === 'INPUT' || 
          element.tagName === 'TEXTAREA' || 
          element.tagName === 'SELECT' ||
          element.isContentEditable ||
          element.getAttribute('contenteditable') === 'true') {
        return;
      }
      element = element.parentElement;
    }
    
    // Skip jika klik di dalam dialog atau form
    if (target.closest('.dialog-overlay') || 
        target.closest('.dialog-card') ||
        target.closest('form') ||
        target.closest('[role="dialog"]')) {
      return;
    }
    
    if (document.hasFocus() || focusRestorePending) return;
    focusRestorePending = true;
    focusAppWindow();
    window.setTimeout(() => {
      focusRestorePending = false;
    }, 500);
  };
  
  // Add listener saat pertama kali
  window.addEventListener('mousedown', ensureWindowFocusHandler);
  console.log('✅ Global mousedown listener added');
}

