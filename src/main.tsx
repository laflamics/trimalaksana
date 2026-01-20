import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/global.css';
import { initTheme } from './utils/theme';

// Initialize theme on app load
initTheme();
import './styles/common.css';
import './styles/mobile.css';
import { focusAppWindow } from './utils/actions';
import { storageService } from './services/storage';

console.log('🚀 Starting React app...');

// Set default WebSocket settings sebelum WebSocket client di-initialize
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  const config = storageService.getConfig();
  if (config.type === 'server') {
    if (!localStorage.getItem('websocket_url')) {
      localStorage.setItem('websocket_url', 'ws://server-tljp.tail75a421.ts.net:8888/ws');
    }
    if (!localStorage.getItem('websocket_enabled')) {
      localStorage.setItem('websocket_enabled', 'true');
    }
  }
}

// Import WebSocket client untuk memastikan dia di-initialize lebih awal
import './services/websocket-client';

// 🚀 NEW ARCHITECTURE: Tidak perlu auto-sync
// Server adalah single source of truth, client langsung fetch dari server saat get()
// Tidak perlu sync complex, langsung POST saat set()
const initStorage = () => {
  const config = storageService.getConfig();
  if (config.type === 'server' && config.serverUrl) {
    console.log('✅ Server mode: Server is single source of truth');
    console.log(`✅ Server URL: ${config.serverUrl}`);
    console.log('✅ Data will be fetched directly from server on get()');
    console.log('✅ Data will be posted directly to server on set()');
  } else {
    console.log('📦 Using local storage mode');
  }
};

// Initialize storage (no auto-sync needed)
initStorage();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

console.log('✅ Root element found');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
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

