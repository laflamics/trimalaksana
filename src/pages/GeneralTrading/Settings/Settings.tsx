import { useState, useEffect } from 'react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import Input from '../../../components/Input';
import { storageService, StorageType, SyncStatus } from '../../../services/storage';
import { dockerServerService } from '../../../services/docker-server';
import { getTheme, applyTheme, Theme } from '../../../utils/theme';
import { checkMobileUpdate, downloadMobileAPK, getAPKFileName } from '../../../utils/actions';
import '../../../styles/compact.css';

const Settings = () => {
  const [storageType, setStorageType] = useState<StorageType>('local');
  const [serverUrl, setServerUrl] = useState('');
  // Custom Dialog state
  const [dialogState, setDialogState] = useState<{
    show: boolean;
    type: 'alert' | 'confirm' | null;
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    type: null,
    title: '',
    message: '',
  });

  // Helper functions untuk dialog
  const showAlert = (message: string, title: string = 'Information') => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'alert',
      title,
      message,
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void, title: string = 'Confirmation') => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
      onCancel,
    });
  };

  const closeDialog = () => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
    setDialogState({
      show: false,
      type: null,
      title: '',
      message: '',
    });
  };

  const [serverPort, setServerPort] = useState(8888);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'checking' | 'connected' | 'failed'>('idle');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [companyName, setCompanyName] = useState('PT TRIMA LAKSANA JAYA PRATAMA');
  const [companyAddress, setCompanyAddress] = useState('Jl. Raya Bekasi Km. 28, Cikarang, Bekasi 17530');
  const [bankName, setBankName] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [npwp, setNpwp] = useState('');
  const [buffer, setBuffer] = useState('5000000');
  const [workingCapital, setWorkingCapital] = useState('5000000');
  const [theme, setTheme] = useState<Theme>('dark');
  const [appVersion, setAppVersion] = useState<string>('');
  const [updateStatus, setUpdateStatus] = useState<{ status: string; message: string; version?: string } | null>(null);
  const [updateProgress, setUpdateProgress] = useState<{ percent: number } | null>(null);
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  useEffect(() => {
    // Load app version (Electron atau Capacitor)
    if (window.electronAPI?.getAppVersion) {
      // Desktop (Electron)
      window.electronAPI.getAppVersion().then((version: string) => {
        setAppVersion(version);
      });
    } else if ((window as any).Capacitor) {
      // Mobile (Capacitor) - get version from package.json via fetch
      fetch('/package.json').then(res => res.json()).then((pkg: any) => {
        setAppVersion(pkg.version || '1.0.0');
      }).catch(() => {
        // Fallback: use hardcoded version
        setAppVersion('1.0.6');
      });
    } else {
      // Web - use hardcoded version
      setAppVersion('1.0.6');
    }

    // Listen for update status (Desktop only)
    if (window.electronAPI?.onUpdateStatus) {
      window.electronAPI.onUpdateStatus((status: any) => {
        setUpdateStatus(status);
        if (status.status === 'not-available' || status.status === 'error') {
          setCheckingUpdate(false);
        }
        // Clear progress when download is complete
        if (status.status === 'downloaded') {
          setUpdateProgress(null);
        }
      });
    }

    // Listen for update progress
    if (window.electronAPI?.onUpdateProgress) {
      window.electronAPI.onUpdateProgress((progress: any) => {
        setUpdateProgress(progress);
        // Clear progress when download reaches 100%
        if (progress.percent >= 100) {
          setTimeout(() => {
            setUpdateProgress(null);
          }, 1000);
        }
      });
    }
  }, []);

  const loadSettings = async () => {
    const config = storageService.getConfig();
    setStorageType(config.type || 'local');
    
    if (config.serverUrl) {
      // Skip WebSocket URLs (ws:// or wss://) - hanya ambil HTTP/HTTPS URLs
      const serverUrlStr = config.serverUrl.trim();
      if (serverUrlStr.startsWith('ws://') || serverUrlStr.startsWith('wss://')) {
        // Ini WebSocket URL, skip dan set default
        setServerUrl('server-tljp.tail75a421.ts.net');
        setServerPort(8888);
      } else {
        try {
          const url = new URL(serverUrlStr);
          const hostname = url.hostname.trim();
          const isTailscaleFunnel = hostname.includes('tailscale') || hostname.includes('tail') || hostname.includes('.ts.net');
          
          setServerUrl(hostname);
          // Tailscale funnel tidak perlu port, set default 8888 hanya untuk display
          if (isTailscaleFunnel) {
            setServerPort(8888); // Default untuk display, tapi tidak digunakan
          } else {
            setServerPort(Number(url.port) || 8888);
          }
        } catch (e) {
          // If URL parsing fails, try to extract from string
          const match = serverUrlStr.match(/https?:\/\/([^:\/]+):?(\d+)?/);
          if (match) {
            const hostname = match[1].trim();
            const isTailscaleFunnel = hostname.includes('tailscale') || hostname.includes('tail') || hostname.includes('.ts.net');
            
            setServerUrl(hostname);
            if (isTailscaleFunnel) {
              setServerPort(8888); // Default untuk display
            } else {
              setServerPort(match[2] ? Number(match[2]) : 8888);
            }
          } else {
            // If all parsing fails, set default
            setServerUrl('server-tljp.tail75a421.ts.net');
            setServerPort(8888);
          }
        }
      }
    } else if (config.type === 'server') {
      // Auto-set default Tailscale server jika mode server tapi belum ada URL
      if (!config.serverUrl) {
        setServerUrl('server-tljp.tail75a421.ts.net');
        setServerPort(8888);
      } else {
        setServerPort(8888);
      }
    }
    
    // Set default server URL jika kosong dan mode server
    if (storageType === 'server' && !serverUrl) {
      setServerUrl('server-tljp.tail75a421.ts.net');
      setServerPort(8888);
    }

    // Load company settings
    const companySettings = await storageService.get<{ companyName: string; address: string; bankName?: string; bankAccount?: string; npwp?: string; buffer?: string; workingCapital?: string }>('companySettings');
    if (companySettings) {
      setCompanyName(companySettings.companyName || 'PT TRIMA LAKSANA JAYA PRATAMA');
      setCompanyAddress(companySettings.address || 'Jl. Raya Bekasi Km. 28, Cikarang, Bekasi 17530');
      setBankName(companySettings.bankName || 'Bank MANDIRI, KCP JKT Cimanggis');
      setBankAccount(companySettings.bankAccount || '129-00-1116726-5');
      setNpwp(companySettings.npwp || '');
      setBuffer(companySettings.buffer || '5000000');
      setWorkingCapital(companySettings.workingCapital || '5000000');
    }

    // Load theme
    const currentTheme = getTheme();
    setTheme(currentTheme);
    
    // Set default WebSocket URL if not set
    if (config.type === 'server' && !localStorage.getItem('websocket_url')) {
      localStorage.setItem('websocket_url', 'ws://server-tljp.tail75a421.ts.net:8888/ws');
      localStorage.setItem('websocket_enabled', 'true');
    }
  };

  useEffect(() => {
    loadSettings();
    
    // 🚀 NEW ARCHITECTURE: Tidak perlu auto-sync
    // Server adalah single source of truth, client langsung fetch dari server saat get()
    // Tidak perlu sync complex, langsung POST saat set()
    const config = storageService.getConfig();
    if (config.type === 'server' && config.serverUrl) {
      console.log('✅ Server mode: Server is single source of truth');
    }
    
    // Subscribe to sync status changes
    const unsubscribe = storageService.onSyncStatusChange((status) => {
      setSyncStatus(status);
    });
    
    // Set initial sync status
    setSyncStatus(storageService.getSyncStatus());
    
    return () => {
      unsubscribe();
    };
  }, []);

  const handleCheckConnection = async () => {
    setConnectionStatus('checking');
    try {
      // Set default jika kosong atau jika ini WebSocket URL
      let currentServerUrl = serverUrl.trim();
      if (!currentServerUrl || currentServerUrl.startsWith('ws://') || currentServerUrl.startsWith('wss://')) {
        currentServerUrl = 'server-tljp.tail75a421.ts.net';
        setServerUrl(currentServerUrl);
        setServerPort(8888);
      }
      
      // Normalize serverUrl (remove http:// or https:// if user accidentally included it)
      let cleanUrl = currentServerUrl.replace(/^https?:\/\//, '').trim();
      // Jika masih ada ws:// atau wss://, hapus juga
      cleanUrl = cleanUrl.replace(/^wss?:\/\//, '').trim();
      // Use https for Tailscale funnel and Vercel, http for others
      const isTailscaleFunnel = cleanUrl.includes('tailscale') || cleanUrl.includes('tail') || cleanUrl.includes('.ts.net');
      const protocol = isTailscaleFunnel ? 'https' : 'http';
      
      // Tailscale funnel tidak perlu port
      const fullUrl = isTailscaleFunnel
        ? `${protocol}://${cleanUrl}` 
        : `${protocol}://${cleanUrl}:${serverPort}`;
      
      console.log(`[Settings] Checking connection to: ${fullUrl}`);
      
      // Try simple fetch first for better error reporting
      try {
        const healthUrl = `${fullUrl}/health`;
        console.log(`[Settings] Health check URL: ${healthUrl}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 seconds timeout
        
        const testResponse = await fetch(healthUrl, {
          method: 'GET',
          headers: { 
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          mode: 'cors', // Explicit CORS mode
        });
        
        clearTimeout(timeoutId);
        
        console.log(`[Settings] Direct fetch test:`, testResponse.status, testResponse.statusText);
        console.log(`[Settings] Response headers:`, Object.fromEntries(testResponse.headers.entries()));
        
        // Check status code directly (200-299 range)
        if (testResponse.status >= 200 && testResponse.status < 300) {
          try {
            const data = await testResponse.json();
            console.log(`[Settings] Health check response:`, data);
            setConnectionStatus('connected');
            return;
          } catch (jsonError) {
            // If JSON parse fails, check response text
            const text = await testResponse.text();
            console.log(`[Settings] Response text:`, text);
            if (text.includes('ok') || text.includes('status') || text.includes('healthy')) {
              console.log(`[Settings] Connection successful (text check)`);
              setConnectionStatus('connected');
              return;
            }
          }
        } else {
          const text = await testResponse.text().catch(() => '');
          console.error(`[Settings] Connection failed:`, testResponse.status, testResponse.statusText, text);
        }
      } catch (fetchError: any) {
        console.error(`[Settings] Direct fetch failed:`, fetchError);
        console.error(`[Settings] Error type:`, fetchError.name);
        console.error(`[Settings] Error message:`, fetchError.message);
        console.error(`[Settings] Error code:`, fetchError.code);
        if (fetchError.name === 'AbortError') {
          console.error(`[Settings] Request timeout after 20 seconds`);
        }
      }
      
      // Fallback to service
      const connected = await dockerServerService.checkConnection(fullUrl);
      setConnectionStatus(connected ? 'connected' : 'failed');
      if (!connected) {
        console.error(`[Settings] Connection failed. Check console for details.`);
        const testUrl = isTailscaleFunnel ? fullUrl : `${fullUrl}/health`;
        showAlert(`Connection failed!\n\nURL: ${fullUrl}\n\nPlease check:\n1. Server is running\n2. Tailscale funnel is active\n3. Try in browser: ${testUrl}\n4. Check console for detailed error`, 'Error');
      }
    } catch (error: any) {
      console.error(`[Settings] Connection error:`, error);
      setConnectionStatus('failed');
      // Normalize error URL display (same logic as handleCheckConnection)
      let cleanErrorUrl = serverUrl.replace(/^https?:\/\//, '').trim();
      const isTailscaleFunnel = cleanErrorUrl.includes('tailscale') || cleanErrorUrl.includes('tail') || cleanErrorUrl.includes('.ts.net');
      const protocol = isTailscaleFunnel ? 'https' : 'http';
      const errorUrl = isTailscaleFunnel
        ? `${protocol}://${cleanErrorUrl}`
        : `${protocol}://${cleanErrorUrl}:${serverPort}`;
      showAlert(`Connection error: ${error.message}\n\nURL: ${errorUrl}\n\nPlease check console for details.`, 'Error');
    }
  };

  const handleSave = async () => {
    // Trim serverUrl to remove any spaces
    let cleanServerUrl = serverUrl.trim();
    
    // Set default jika kosong atau jika ini WebSocket URL
    if (storageType === 'server' && (!cleanServerUrl || cleanServerUrl.startsWith('ws://') || cleanServerUrl.startsWith('wss://'))) {
      cleanServerUrl = 'server-tljp.tail75a421.ts.net';
      setServerUrl(cleanServerUrl);
      setServerPort(8888);
    }
    
    // Remove protocol if user accidentally included it (HTTP/HTTPS only)
    cleanServerUrl = cleanServerUrl.replace(/^https?:\/\//, '');
    // Juga hapus ws:// atau wss:// jika ada
    cleanServerUrl = cleanServerUrl.replace(/^wss?:\/\//, '');
    // Use https for Tailscale funnel and Vercel, http for others
    const isTailscaleFunnel = cleanServerUrl.includes('tailscale') || cleanServerUrl.includes('tail') || cleanServerUrl.includes('.ts.net');
    const protocol = isTailscaleFunnel ? 'https' : 'http';
    // Tailscale funnel tidak perlu port
    const finalServerUrl = isTailscaleFunnel
      ? `${protocol}://${cleanServerUrl}`
      : `${protocol}://${cleanServerUrl}:${serverPort}`;
    const config = {
      type: storageType,
      serverUrl: storageType === 'server' ? finalServerUrl : undefined,
    };
    await storageService.setConfig(config);
    if (storageType === 'server') {
      await storageService.syncFromServer();
      // Set default WebSocket URL
      localStorage.setItem('websocket_url', 'ws://server-tljp.tail75a421.ts.net:8888/ws');
      localStorage.setItem('websocket_enabled', 'true');
    }

    // Save company settings
    await storageService.set('companySettings', {
      companyName: companyName,
      address: companyAddress,
      bankName: bankName,
      bankAccount: bankAccount,
      npwp: npwp,
      buffer: buffer,
      workingCapital: workingCapital,
    });

    // Save and apply theme
    applyTheme(theme);

    showAlert('Settings saved!', 'Information');
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  const handleCheckUpdate = async () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    setUpdateProgress(null);
    
    try {
      // Desktop (Electron) - use electron-updater
      if (window.electronAPI?.checkForUpdates) {
        const result = await window.electronAPI.checkForUpdates();
        if (!result.success) {
          showAlert(result.message || 'Failed to check for updates', 'Error');
          setCheckingUpdate(false);
        }
        return;
      }
      
      // Mobile (Capacitor) - check server for APK updates
      if ((window as any).Capacitor) {
        try {
          const currentVersion = appVersion || '1.0.0';
          const result = await checkMobileUpdate(currentVersion, storageService);
          
          if (result.available && result.version) {
            setUpdateStatus({
              status: 'available',
              message: result.message,
              version: result.version
            });
          } else {
            setUpdateStatus({
              status: result.available ? 'available' : 'not-available',
              message: result.message,
              version: result.version || undefined
            });
          }
        } catch (error: any) {
          console.error('Error checking for mobile update:', error);
          setUpdateStatus({
            status: 'error',
            message: `Failed to check for updates: ${error.message}`
          });
        } finally {
          setCheckingUpdate(false);
        }
        return;
      }
      
      // Fallback
      showAlert('Update feature not available', 'Information');
      setCheckingUpdate(false);
    } catch (error: any) {
      showAlert(`Error: ${error.message}`, 'Error');
      setCheckingUpdate(false);
    }
  };

  const handleDownloadUpdate = async () => {
    // Desktop (Electron)
    if (window.electronAPI?.downloadUpdate) {
      try {
        // Set initial progress
        setUpdateProgress({ percent: 0 });
        setUpdateStatus({
          status: 'downloading',
          message: 'Downloading update...',
          version: updateStatus?.version
        });
        
        const result = await window.electronAPI.downloadUpdate();
        if (!result.success) {
          showAlert(result.message || 'Failed to download update', 'Error');
          setUpdateProgress(null);
          setUpdateStatus({
            status: 'error',
            message: result.message || 'Failed to download update',
            version: updateStatus?.version
          });
        }
        // Note: Status 'downloaded' akan di-set otomatis oleh electron-updater via onUpdateStatus
      } catch (error: any) {
        showAlert(`Error: ${error.message}`, 'Error');
        setUpdateProgress(null);
        setUpdateStatus({
          status: 'error',
          message: `Download failed: ${error.message}`,
          version: updateStatus?.version
        });
      }
      return;
    }
    
    // Mobile (Capacitor) - download APK
    if ((window as any).Capacitor) {
      // Set loading state immediately
      setUpdateProgress({ percent: 0 });
      setUpdateStatus({
        status: 'downloading',
        message: 'Preparing download...',
        version: updateStatus?.version
      });
      
      try {
        await downloadMobileUpdate();
      } catch (error: any) {
        showAlert(`Error: ${error.message}`, 'Error');
        setUpdateProgress(null);
        setUpdateStatus({
          status: 'error',
          message: `Download failed: ${error.message}`,
          version: updateStatus?.version
        });
      }
      return;
    }
    
    showAlert('Download update not available', 'Information');
  };

  const downloadMobileUpdate = async () => {
    try {
      if (!updateStatus?.version) {
        showAlert('No update available', 'Information');
        setUpdateProgress(null);
        return;
      }
      
      // Get server URL from config
      const config = storageService.getConfig();
      let serverUrl = config.serverUrl || 'server-tljp.tail75a421.ts.net';
      
      // Normalize server URL (same logic as handleCheckConnection)
      if (!serverUrl.startsWith('http')) {
        const isTailscaleFunnel = serverUrl.includes('.ts.net') || serverUrl.includes('tailscale') || serverUrl.includes('tail');
        const protocol = isTailscaleFunnel ? 'https' : 'http';
        serverUrl = `${protocol}://${serverUrl}`;
      }
      serverUrl = serverUrl.replace(/:\d+$/, ''); // Remove port if exists
      
      // Get APK filename using helper
      setUpdateStatus({
        status: 'downloading',
        message: 'Fetching update information...',
        version: updateStatus.version
      });
      setUpdateProgress({ percent: 5 });
      
      const apkFile = await getAPKFileName(serverUrl);
      
      setUpdateStatus({
        status: 'downloading',
        message: `Downloading ${apkFile}...`,
        version: updateStatus.version
      });
      
      // Download APK using helper with progress callback
      const downloadResult = await downloadMobileAPK(serverUrl, apkFile, (percent, message) => {
        setUpdateProgress({ percent });
        setUpdateStatus({
          status: 'downloading',
          message,
          version: updateStatus.version
        });
      });
      
      // Download complete - APK sudah di-save ke Downloads dan install dialog sudah muncul
      setUpdateStatus({
        status: 'downloaded',
        message: `APK saved to Downloads folder.\nFile: ${downloadResult.filePath}\n\nInstall dialog should appear automatically. If not, check Downloads folder.`,
        version: updateStatus.version
      });
      
      // Keep progress for 2 seconds, then clear
      setTimeout(() => {
        setUpdateProgress(null);
      }, 2000);
      
      showAlert(`APK berhasil di-download dan disimpan ke folder Downloads.\n\nFile: ${downloadResult.filePath}\n\nDialog install seharusnya muncul otomatis. Jika tidak, buka folder Downloads dan klik file APK untuk install.`, 'Success');
    } catch (error: any) {
      console.error('[Mobile Update] Error:', error);
      setUpdateProgress(null);
      setUpdateStatus({
        status: 'error',
        message: `Download failed: ${error.message}`,
        version: updateStatus?.version
      });
      throw error; // Re-throw untuk handleDownloadUpdate
    }
  };

  const handleInstallUpdate = async () => {
    if (!window.electronAPI?.installUpdate) return;
    showConfirm(
      'Aplikasi akan restart untuk menginstall update. Lanjutkan?',
      async () => {
        try {
          await window.electronAPI.installUpdate();
        } catch (error: any) {
          showAlert(`Error: ${error.message}`, 'Error');
        }
      },
      undefined,
      'Confirm Update'
    );
  };

  return (
    <div className="module-compact">
      <div className="page-header">
        <h1>Company Settings</h1>
      </div>

      <Card title="Company Information">
        <Input
          label="Company Name"
          value={companyName}
          onChange={setCompanyName}
          placeholder="PT TRIMA LAKSANA JAYA PRATAMA"
        />
        <Input
          label="Company Address"
          value={companyAddress}
          onChange={setCompanyAddress}
          placeholder="Jl. Raya Bekasi Km. 28, Cikarang, Bekasi 17530"
        />
        <Input
          label="Bank Name"
          value={bankName}
          onChange={setBankName}
          placeholder="Bank MANDIRI, KCP JKT Cimanggis"
        />
        <Input
          label="Bank Account Number"
          value={bankAccount}
          onChange={setBankAccount}
          placeholder="129-00-1116726-5"
        />
        <Input
          label="NPWP"
          value={npwp}
          onChange={setNpwp}
          placeholder="01.234.567.8-901.000"
        />
        <Input
          label="Buffer (Rp)"
          type="number"
          value={buffer}
          onChange={setBuffer}
          placeholder="5000000"
        />
        <Input
          label="Working Capital (Rp)"
          type="number"
          value={workingCapital}
          onChange={setWorkingCapital}
          placeholder="5000000"
        />
        <div className="settings-actions" style={{ marginTop: '20px' }}>
          <Button onClick={handleSave} variant="primary">
            Save Company Info
          </Button>
        </div>
      </Card>

      <Card title="Appearance" style={{ marginTop: '20px' }}>
        <div className="settings-group">
          <label className="settings-label">Theme</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                value="dark"
                checked={theme === 'dark'}
                onChange={(e) => handleThemeChange(e.target.value as Theme)}
              />
              <span>🌙 Dark (Gelap)</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                value="light"
                checked={theme === 'light'}
                onChange={(e) => handleThemeChange(e.target.value as Theme)}
              />
              <span>☀️ Light (Terang)</span>
            </label>
          </div>
        </div>
      </Card>

      <Card title="Storage Configuration" style={{ marginTop: '20px' }}>
        <div className="settings-group">
          <label className="settings-label">Storage Type</label>
          <div className="radio-group">
            <label className="radio-label">
              <input
                type="radio"
                value="local"
                checked={storageType === 'local'}
                onChange={(e) => setStorageType(e.target.value as StorageType)}
              />
              <span>Local Storage</span>
            </label>
            <label className="radio-label">
              <input
                type="radio"
                value="server"
                checked={storageType === 'server'}
                onChange={(e) => {
                  setStorageType(e.target.value as StorageType);
                  // Auto-set Tailscale server URL saat pilih server mode
                  if (!serverUrl || serverUrl.trim() === '') {
                    setServerUrl('server-tljp.tail75a421.ts.net');
                    setServerPort(8888);
                  }
                }}
              />
              <span>Docker Server</span>
            </label>
          </div>
        </div>

        {storageType === 'server' && (
          <>
            <Input
              label="Server URL"
              value={serverUrl}
              onChange={setServerUrl}
              placeholder="server-tljp.tail75a421.ts.net (default)"
            />
            <Input
              label="Server Port"
              type="number"
              value={String(serverPort)}
              onChange={(v) => setServerPort(Number(v))}
            />
            <div className="settings-actions">
              <Button onClick={handleCheckConnection} variant="secondary">
                Check Connection
              </Button>
              <span className={`connection-status status-${connectionStatus}`}>
                {connectionStatus === 'checking' && 'Checking...'}
                {connectionStatus === 'connected' && '✓ Connected'}
                {connectionStatus === 'failed' && '✗ Connection Failed'}
              </span>
            </div>
            
            {storageType === 'server' && (
              <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <div style={{ marginBottom: '8px', fontWeight: '600', color: 'var(--text-primary)' }}>💡 Tips Koneksi:</div>
                <div style={{ marginBottom: '4px' }}>• <strong>Local IP:</strong> 192.168.x.x (WiFi sama)</div>
                <div style={{ marginBottom: '4px' }}>• <strong>Tailscale:</strong> 100.64.x.x (tidak perlu domain)</div>
                <div style={{ marginBottom: '4px' }}>• <strong>Domain:</strong> yourdomain.com (perlu bayar domain)</div>
                <div style={{ marginTop: '8px', fontSize: '11px', fontStyle: 'italic' }}>
                  📖 Lihat docker/TAILSCALE_SETUP.md untuk setup Tailscale
                </div>
              </div>
            )}
            
            {storageType === 'server' && (
              <div style={{ marginTop: '12px', padding: '8px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Sync Status:</span>
                  <span style={{ 
                    fontSize: '12px',
                    fontWeight: '500',
                    color: syncStatus === 'synced' ? 'var(--success)' : 
                           syncStatus === 'syncing' ? '#ff9800' : 
                           syncStatus === 'error' ? 'var(--error)' : 'var(--text-secondary)'
                  }}>
                    {syncStatus === 'idle' && '● Idle'}
                    {syncStatus === 'syncing' && '🔄 Syncing...'}
                    {syncStatus === 'synced' && '✓ Synced'}
                    {syncStatus === 'error' && '✗ Error'}
                  </span>
                </div>
              </div>
            )}
          </>
        )}

        <div className="settings-actions" style={{ marginTop: '20px' }}>
          <Button onClick={handleSave} variant="primary">
            Save Settings
          </Button>
        </div>
      </Card>

      {/* Application Update - Show for both Desktop (Electron) and Mobile (Capacitor) */}
      {(window.electronAPI || (window as any).Capacitor) && (
        <Card title="Application Update" style={{ marginTop: '20px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Current Version: <strong>{appVersion || 'Loading...'}</strong>
            </div>
            {updateStatus && (
              <div style={{ 
                marginBottom: '8px', 
                padding: '8px', 
                borderRadius: '4px',
                backgroundColor: updateStatus.status === 'available' ? 'var(--success-bg)' : 
                                 updateStatus.status === 'error' ? 'var(--error-bg)' : 
                                 'var(--bg-secondary)',
                color: updateStatus.status === 'available' ? 'var(--success)' : 
                       updateStatus.status === 'error' ? 'var(--error)' : 
                       'var(--text-primary)',
                fontSize: '13px'
              }}>
                {updateStatus.message}
                {updateStatus.version && ` (v${updateStatus.version})`}
              </div>
            )}
            {updateProgress && (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Downloading: {Math.round(updateProgress.percent)}%
                </div>
                <div style={{ 
                  width: '100%', 
                  height: '8px', 
                  backgroundColor: 'var(--bg-secondary)', 
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    width: `${updateProgress.percent}%`, 
                    height: '100%', 
                    backgroundColor: 'var(--primary)',
                    transition: 'width 0.3s'
                  }} />
                </div>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {/* Desktop: Check for Updates via electron-updater */}
            {window.electronAPI && (
              <Button 
                onClick={handleCheckUpdate} 
                variant="secondary"
                disabled={checkingUpdate}
              >
                {checkingUpdate ? 'Checking...' : 'Check for Updates'}
              </Button>
            )}
            {/* Mobile: Check for Updates via server API */}
            {(window as any).Capacitor && !window.electronAPI && (
              <Button 
                onClick={handleCheckUpdate} 
                variant="secondary"
                disabled={checkingUpdate}
              >
                {checkingUpdate ? 'Checking...' : 'Check for Updates'}
              </Button>
            )}
            {updateStatus?.status === 'available' && (
              <Button 
                onClick={handleDownloadUpdate} 
                variant="primary"
                disabled={!!updateProgress}
              >
                {updateProgress ? 'Downloading...' : 'Download Update'}
              </Button>
            )}
            {updateStatus?.status === 'downloaded' && (
              <Button 
                onClick={handleInstallUpdate} 
                variant="primary"
              >
                Install & Restart
              </Button>
            )}
          </div>
          <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            💡 Update akan menginstall versi baru tanpa menghapus data Anda.
          </div>
        </Card>
      )}
      {/* Custom Dialog */}
      {dialogState.show && (
        <div className="dialog-overlay" onClick={closeDialog}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>{dialogState.title}</h2>
                <Button variant="secondary" onClick={closeDialog} style={{ padding: '6px 12px' }}>✕</Button>
              </div>
              <p style={{ marginBottom: '20px', whiteSpace: 'pre-wrap' }}>{dialogState.message}</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                {dialogState.type === 'confirm' && (
                  <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
                )}
                <Button
                  variant="primary"
                  onClick={() => {
                    if (dialogState.onConfirm) dialogState.onConfirm();
                    closeDialog();
                  }}
                >
                  {dialogState.type === 'confirm' ? 'Confirm' : 'OK'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}


    </div>
  );
};

export default Settings;

