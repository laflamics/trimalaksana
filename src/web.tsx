import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import './styles/global.css';
import { initTheme } from './utils/theme';
import './styles/common.css';
import './styles/mobile.css';
import { storageService } from './services/storage';

// Initialize theme on app load
initTheme();

console.log('🚀 Starting React web app...');

// Web app configuration - use current origin
const getWebAppBaseUrl = (): string => {
  return window.location.origin;
};

// WebSocket URL configuration
const getWebAppWebSocketUrl = (): string => {
  // Use Tailscale Funnel for data sync
  return 'wss://server-tljp.tail75a421.ts.net/ws';
};

// Initialize WebSocket and API configuration
const initializeWebAppConfig = async (): Promise<void> => {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }
  
  const config = storageService.getConfig();
  if (config.type !== 'server') {
    return;
  }
  
  // Configure WebSocket URL
  const wsUrl = getWebAppWebSocketUrl();
  localStorage.setItem('websocket_url', wsUrl);
  localStorage.setItem('websocket_enabled', 'true');
  
  // Configure API base URL
  const baseUrl = getWebAppBaseUrl();
  localStorage.setItem('server_url', baseUrl);
};

// Initialize app configuration
initializeWebAppConfig().then(() => {
  // Configuration ready
  console.log('✅ Web app configuration initialized');
});

// Initialize storage service
const initStorage = (): void => {
  const config = storageService.getConfig();
  if (config.type === 'server') {
    console.log('✅ Server mode enabled');
    console.log(`✅ Server URL: ${getWebAppBaseUrl()}`);
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

// Render React app
ReactDOM.createRoot(rootElement).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

console.log('✅ React web app rendered');
