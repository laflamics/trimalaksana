import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { storageService } from '../../services/storage';
import { getCurrentUser, isDefaultAdmin } from '../../utils/access-control-helper';
import { filterActiveItems } from '../../utils/data-persistence-helper';
import { ActivityLog } from '../../utils/activity-logger';
import { ProxyLog, getProxyLogs, clearProxyLogs } from '../../utils/proxy-logger';
import UserControl from '../Settings/UserControl';
import '../../styles/common.css';
import '../../styles/compact.css';
import './SuperAdmin.css';

const USER_CONTROL_PIN_KEY = 'userControlPin';
const DEFAULT_USER_CONTROL_PIN = '7777';

// Component untuk manage PIN User Control (hanya Super Admin)
const UserControlPinManager = () => {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadPin();
  }, []);

  const loadPin = async () => {
    const currentPin = await storageService.get<string>(USER_CONTROL_PIN_KEY);
    setPin(currentPin || DEFAULT_USER_CONTROL_PIN);
  };

  const handleSavePin = async () => {
    if (!pin.trim()) {
      setMessage({ type: 'error', text: 'PIN tidak boleh kosong.' });
      return;
    }
    if (pin.trim().length < 4) {
      setMessage({ type: 'error', text: 'PIN minimal 4 karakter.' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await storageService.set(USER_CONTROL_PIN_KEY, pin.trim());
      setMessage({ type: 'success', text: 'PIN berhasil diubah.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card 
      title="🔐 User Control PIN" 
      style={{ marginBottom: '20px' }}
    >
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <Input
          label="PIN untuk Edit User Control"
          type="password"
          value={pin}
          onChange={setPin}
          placeholder="Masukkan PIN (min 4 karakter)"
        />
        <Button 
          variant="primary" 
          onClick={handleSavePin}
          disabled={loading}
          style={{ marginTop: '20px' }}
        >
          {loading ? 'Menyimpan...' : 'Simpan PIN'}
        </Button>
      </div>
      {message && (
        <div style={{ 
          marginTop: '10px', 
          padding: '8px 12px', 
          borderRadius: '4px',
          backgroundColor: message.type === 'success' ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
          color: message.type === 'success' ? '#4caf50' : '#f44336',
          fontSize: '14px'
        }}>
          {message.text}
        </div>
      )}
      <p style={{ marginTop: '10px', fontSize: '12px', color: 'var(--text-secondary)' }}>
        PIN ini diperlukan untuk mengedit User Control. Hanya Super Admin yang dapat mengubah PIN ini.
      </p>
    </Card>
  );
};

interface UserAccess {
  updatedAt: any;
  id: string;
  fullName: string;
  username: string;
  role?: string;
  isActive: boolean;
  businessUnits: string[];
  menuAccess?: Record<string, string[]>;
}

const SuperAdmin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'logs' | 'proxy' | 'usage'>('users');
  const [activityLogs, setActivityLogs] = useState<(ActivityLog & { businessContext?: string })[]>([]);
  const [proxyLogs, setProxyLogs] = useState<ProxyLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [proxySearchQuery, setProxySearchQuery] = useState('');
  const [proxyDateFilter, setProxyDateFilter] = useState('');
  const [users, setUsers] = useState<UserAccess[]>([]);
  
  // USAGE MONITORING: Track bandwidth dan performance
  const [usageStats, setUsageStats] = useState<{
    totalRequests: number;
    totalBandwidth: number;
    avgResponseTime: number;
    errorRate: number;
    lastUpdated: string;
    dailyStats: Array<{
      date: string;
      requests: number;
      bandwidth: number;
      errors: number;
    }>;
  }>({
    totalRequests: 0,
    totalBandwidth: 0,
    avgResponseTime: 0,
    errorRate: 0,
    lastUpdated: new Date().toISOString(),
    dailyStats: []
  });

  // Load usage statistics
  useEffect(() => {
    const loadUsageStats = async () => {
      try {
        // Calculate usage from proxy logs
        const logs = await getProxyLogs();
        const today = new Date().toISOString().split('T')[0];
        
        const todayLogs = logs.filter(log => 
          log.timestamp.startsWith(today)
        );
        
        const totalRequests = todayLogs.length;
        const totalBandwidth = todayLogs.reduce((sum, log) => 
          sum + (log.requestSize || 0) + (log.responseSize || 0), 0
        );
        const avgResponseTime = todayLogs.length > 0 
          ? todayLogs.reduce((sum, log) => sum + (log.duration || 0), 0) / todayLogs.length
          : 0;
        const errorCount = todayLogs.filter(log => 
          log.status && log.status >= 400
        ).length;
        const errorRate = totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0;
        
        // Group by date for daily stats
        const dailyStats = logs.reduce((acc: any[], log) => {
          const date = log.timestamp.split('T')[0];
          const existing = acc.find(stat => stat.date === date);
          
          if (existing) {
            existing.requests++;
            existing.bandwidth += (log.requestSize || 0) + (log.responseSize || 0);
            if (log.status && log.status >= 400) existing.errors++;
          } else {
            acc.push({
              date,
              requests: 1,
              bandwidth: (log.requestSize || 0) + (log.responseSize || 0),
              errors: log.status && log.status >= 400 ? 1 : 0
            });
          }
          
          return acc;
        }, []).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7); // Last 7 days
        
        setUsageStats({
          totalRequests,
          totalBandwidth,
          avgResponseTime: Math.round(avgResponseTime),
          errorRate: Math.round(errorRate * 100) / 100,
          lastUpdated: new Date().toISOString(),
          dailyStats
        });
      } catch (error) {
        console.error('Error loading usage stats:', error);
      }
    };
    
    loadUsageStats();
    
    // Update stats every 5 minutes
    const interval = setInterval(loadUsageStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if user is admin
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser || !isDefaultAdmin(currentUser)) {
      navigate('/login', { replace: true });
      return;
    }
  }, [navigate]);

  // Load activity logs
  useEffect(() => {
    const loadLogs = async () => {
      try {
        console.log('[SuperAdmin] Loading activity logs from all business contexts...');
        
        // Define all business contexts to read from
        const contexts = [
          { name: 'Packaging', key: 'activityLogs' },
          { name: 'GT', key: 'general-trading/activityLogs' },
          { name: 'Trucking', key: 'trucking/activityLogs' }
        ];
        
        const allLogs: (ActivityLog & { businessContext?: string })[] = [];
        
        // Load logs from each business context
        for (const context of contexts) {
          console.log(`[SuperAdmin] Loading ${context.name} activity logs...`);
          let logs = await storageService.get<ActivityLog[]>(context.key) || [];
          console.log(`[SuperAdmin] Raw ${context.name} logs: ${logs.length} items`);
          
          // If we have very few logs, try force reload from file
          if (logs.length <= 1) {
            console.log(`[SuperAdmin] Few ${context.name} logs detected, trying force reload from file...`);
            const fileData = await storageService.forceReloadFromFile<ActivityLog[]>(context.key);
            if (fileData && Array.isArray(fileData) && fileData.length > logs.length) {
              console.log(`[SuperAdmin] Force reload successful: ${fileData.length} ${context.name} logs from file`);
              logs = fileData;
            }
          }
          
          // Add business context to each log
          const logsWithContext = logs.map(log => ({
            ...log,
            businessContext: context.name
          }));
          
          allLogs.push(...logsWithContext);
          console.log(`[SuperAdmin] Added ${logsWithContext.length} ${context.name} logs to collection`);
        }
        
        // Sort by timestamp descending (newest first)
        const sortedLogs = allLogs.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeB - timeA;
        });
        
        console.log(`[SuperAdmin] Total activity logs loaded: ${sortedLogs.length} from all business contexts`);
        setActivityLogs(sortedLogs);
      } catch (error) {
        console.error('Error loading activity logs:', error);
        setActivityLogs([]);
      }
    };

    loadLogs();

    // Listen for new logs
    const handleStorageChange = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      const changedKey = detail?.key || '';
      
      // Check if any activity logs changed (from any business context)
      if (changedKey === 'activityLogs' || 
          changedKey === 'general-trading/activityLogs' || 
          changedKey === 'trucking/activityLogs' ||
          changedKey.endsWith('/activityLogs')) {
        console.log(`[SuperAdmin] Activity logs changed: ${changedKey}, reloading...`);
        loadLogs();
      }
    };

    window.addEventListener('app-storage-changed', handleStorageChange as EventListener);
    return () => window.removeEventListener('app-storage-changed', handleStorageChange as EventListener);
  }, []);

  // Load proxy logs
  useEffect(() => {
    const loadProxyLogs = async () => {
      try {
        const logs = await getProxyLogs();
        setProxyLogs(logs);
      } catch (error) {
        setProxyLogs([]);
      }
    };

    loadProxyLogs();

    // 🚀 OPTIMASI: Listen for new proxy logs dengan debouncing
    // Hanya update UI kalau benar-benar ada log baru (cek ID terakhir)
    let lastLogId: string | null = null;
    let updateTimeout: NodeJS.Timeout | null = null;
    
    const handleProxyLogUpdate = async () => {
      // Debounce: tunggu 100ms sebelum update (menghindari spam update)
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
      
      updateTimeout = setTimeout(async () => {
        try {
          const currentLogs = await getProxyLogs();
          // Hanya update kalau ada log baru (cek ID pertama)
          if (currentLogs.length > 0) {
            const newLastLogId = currentLogs[0]?.id;
            if (newLastLogId !== lastLogId) {
              lastLogId = newLastLogId;
              setProxyLogs(currentLogs);
            }
          } else {
            // Kalau logs di-clear
            lastLogId = null;
            setProxyLogs([]);
          }
        } catch (error) {
          // Silent fail
        }
      }, 100); // Debounce 100ms
    };

    // Set initial lastLogId
    getProxyLogs().then(logs => {
      if (logs.length > 0) {
        lastLogId = logs[0]?.id || null;
      }
    });

    const eventHandler = handleProxyLogUpdate as unknown as EventListener;
    window.addEventListener('proxy-log-updated', eventHandler);
    return () => {
      window.removeEventListener('proxy-log-updated', eventHandler);
      if (updateTimeout) {
        clearTimeout(updateTimeout);
      }
    };
  }, []); // 🚀 FIX: Hapus dependency proxyLogs.length untuk menghindari infinite loop

  // Load users for filter
  useEffect(() => {
    const loadUsers = async () => {
      try {
        // SIMPLIFIED: SuperAdmin hanya baca dari packaging karena bisa edit semua unit bisnis
        // Tidak perlu merge dari semua sources, cukup dari packaging saja
        const storageKey = 'userAccessControl';
        
        console.log(`[SuperAdmin] Loading users from packaging (${storageKey})...`);
        
        // Load hanya dari packaging (main storage)
        const rawUserData = (await storageService.get<UserAccess[]>(storageKey)) || [];
        
        console.log(`[SuperAdmin] Raw data from ${storageKey}:`, rawUserData);
        
        // CRITICAL: Extract arrays from storage wrapper if needed
        const extractArray = (data: any): UserAccess[] => {
          if (!data) return [];
          if (Array.isArray(data)) return data;
          if (data && typeof data === 'object' && 'value' in data && Array.isArray(data.value)) {
            return data.value;
          }
          return [];
        };
        
        const allUsers = extractArray(rawUserData);
        
        console.log(`[SuperAdmin] Extracted ${allUsers.length} users from packaging`);
        
        // Filter active and non-deleted users menggunakan helper function
        const activeUsers = filterActiveItems(allUsers);
        console.log(`[SuperAdmin] Active users: ${activeUsers.length}`);
        
        // Filter hanya yang isActive
        const finalUsers = activeUsers.filter(u => u.isActive !== false);
        console.log(`[SuperAdmin] Final active users: ${finalUsers.length}`);
        
        setUsers(finalUsers);
      } catch (error) {
        console.error('Error loading users:', error);
        setUsers([]);
      }
    };
    loadUsers();
  }, []);

  // Filter logs
  const filteredLogs = useMemo(() => {
    let filtered = activityLogs;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.username.toLowerCase().includes(query) ||
        log.fullName.toLowerCase().includes(query) ||
        log.action.toLowerCase().includes(query) ||
        log.path.toLowerCase().includes(query)
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];
        return logDate === dateFilter;
      });
    }

    if (userFilter) {
      filtered = filtered.filter(log => log.userId === userFilter);
    }

    return filtered;
  }, [activityLogs, searchQuery, dateFilter, userFilter]);

  // Filter proxy logs
  const filteredProxyLogs = useMemo(() => {
    let filtered = proxyLogs;

    if (proxySearchQuery) {
      const query = proxySearchQuery.toLowerCase();
      filtered = filtered.filter(log =>
        log.method.toLowerCase().includes(query) ||
        log.endpoint.toLowerCase().includes(query) ||
        log.statusText?.toLowerCase().includes(query) ||
        log.error?.toLowerCase().includes(query)
      );
    }

    if (proxyDateFilter) {
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];
        return logDate === proxyDateFilter;
      });
    }

    return filtered;
  }, [proxyLogs, proxySearchQuery, proxyDateFilter]);

  const formatDateTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
    } catch {
      return timestamp;
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Full Name', 'Username', 'User ID', 'Action', 'Path', 'Details', 'IP Address'].join(','),
      ...filteredLogs.map(log =>
        [
          log.timestamp,
          `"${log.fullName || 'N/A'}"`,
          log.username || 'N/A',
          log.userId || 'N/A',
          `"${log.action}"`,
          `"${log.path || '-'}"`,
          `"${log.details ? JSON.stringify(log.details).replace(/"/g, '""') : '-'}"`,
          log.ipAddress || ''
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `activity-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearLogs = async () => {
    if (window.confirm('Hapus semua activity logs dari semua business context (Packaging, GT, Trucking)? Tindakan ini tidak dapat dibatalkan.')) {
      try {
        // Clear logs from all business contexts
        await storageService.set('activityLogs', []);
        await storageService.set('general-trading/activityLogs', []);
        await storageService.set('trucking/activityLogs', []);
        setActivityLogs([]);
        console.log('[SuperAdmin] All activity logs cleared');
      } catch (error) {
        console.error('[SuperAdmin] Error clearing logs:', error);
      }
    }
  };

  const clearProxyLogsHandler = async () => {
    if (window.confirm('Hapus semua proxy logs? Tindakan ini tidak dapat dibatalkan.')) {
      await clearProxyLogs();
      setProxyLogs([]);
    }
  };

  const exportProxyLogs = () => {
    const csvContent = [
      ['Timestamp', 'Method', 'Endpoint', 'Status', 'Status Text', 'Request Size (KB)', 'Response Size (KB)', 'Duration (ms)', 'Error'].join(','),
      ...filteredProxyLogs.map(log =>
        [
          log.timestamp,
          log.method,
          `"${log.endpoint}"`,
          log.status || '',
          `"${log.statusText || ''}"`,
          log.requestSize ? (log.requestSize / 1024).toFixed(2) : '',
          log.responseSize ? (log.responseSize / 1024).toFixed(2) : '',
          log.duration || '',
          `"${log.error || ''}"`
        ].join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `proxy-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const logColumns = [
    {
      key: 'timestamp',
      header: 'Waktu',
      render: (log: ActivityLog & { businessContext?: string }) => (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {formatDateTime(log.timestamp)}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (log: ActivityLog & { businessContext?: string }) => (
        <div>
          <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>
            {log.fullName || 'N/A'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            <strong>Username:</strong> @{log.username || 'N/A'}
          </div>
          {log.userId && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', opacity: 0.7 }}>
              ID: {log.userId}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'businessContext',
      header: 'Business Unit',
      render: (log: ActivityLog & { businessContext?: string }) => (
        <span style={{ 
          padding: '3px 8px', 
          borderRadius: '12px',
          backgroundColor: log.businessContext === 'Packaging' ? 'rgba(76, 175, 80, 0.1)' :
                          log.businessContext === 'GT' ? 'rgba(33, 150, 243, 0.1)' :
                          log.businessContext === 'Trucking' ? 'rgba(255, 152, 0, 0.1)' :
                          'rgba(158, 158, 158, 0.1)',
          color: log.businessContext === 'Packaging' ? '#4caf50' :
                 log.businessContext === 'GT' ? '#2196F3' :
                 log.businessContext === 'Trucking' ? '#ff9800' :
                 '#9e9e9e',
          fontSize: '11px',
          fontWeight: '600'
        }}>
          {log.businessContext || 'Unknown'}
        </span>
      ),
    },
    {
      key: 'action',
      header: 'Aksi',
      render: (log: ActivityLog & { businessContext?: string }) => (
        <span style={{ 
          padding: '4px 8px', 
          borderRadius: '4px',
          backgroundColor: log.action === 'LOGIN' ? 'rgba(76, 175, 80, 0.1)' :
                          log.action === 'LOGOUT' ? 'rgba(244, 67, 54, 0.1)' :
                          'rgba(33, 150, 243, 0.1)',
          color: log.action === 'LOGIN' ? '#4caf50' :
                 log.action === 'LOGOUT' ? '#f44336' :
                 '#2196F3',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {log.action}
        </span>
      ),
    },
    {
      key: 'path',
      header: 'Path / Route',
      render: (log: ActivityLog & { businessContext?: string }) => (
        <code style={{ 
          fontSize: '12px', 
          color: 'var(--text-primary)',
          backgroundColor: 'var(--bg-secondary)',
          padding: '2px 6px',
          borderRadius: '4px'
        }}>
          {log.path || '-'}
        </code>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      render: (log: ActivityLog & { businessContext?: string }) => (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {log.ipAddress || '-'}
        </span>
      ),
    },
  ];

  return (
    <div className="module-compact super-admin-page">
      <div className="page-header">
        <div>
          <h1>Super Admin</h1>
          <p>Kelola user dan monitor aktivitas sistem</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Button variant="secondary" onClick={() => navigate('/')}>
            Kembali
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="super-admin-tabs">
        <button
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👤 User Control
        </button>
        <button
          className={`tab-button ${activeTab === 'logs' ? 'active' : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          📋 Activity Logs
        </button>
        <button
          className={`tab-button ${activeTab === 'proxy' ? 'active' : ''}`}
          onClick={() => setActiveTab('proxy')}
        >
          🌐 Proxy Logs
        </button>
        <button
          className={`tab-button ${activeTab === 'usage' ? 'active' : ''}`}
          onClick={() => setActiveTab('usage')}
        >
          📊 Usage Stats
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <div className="tab-content">
          <UserControlPinManager />
          <UserControl />
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="tab-content">
          <Card
            title="Activity Logs"
            actions={
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Input
                  placeholder="Cari user, action, path..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                />
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={setDateFilter}
                />
                <select
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    minWidth: '150px'
                  }}
                >
                  <option value="">Semua User</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.fullName} (@{user.username})
                    </option>
                  ))}
                </select>
                <Button variant="secondary" onClick={exportLogs}>
                  📥 Export CSV
                </Button>
                <Button variant="danger" onClick={clearLogs}>
                  🗑️ Clear Logs
                </Button>
              </div>
            }
          >
            <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Total: {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''}
            </div>
            <Table
              columns={logColumns}
              data={filteredLogs}
              emptyMessage="Belum ada activity logs"
              getRowStyle={(log) => ({
                backgroundColor: log.action === 'LOGIN' ? 'rgba(76, 175, 80, 0.05)' :
                                 log.action === 'LOGOUT' ? 'rgba(244, 67, 54, 0.05)' :
                                 undefined
              })}
            />
          </Card>
        </div>
      )}

      {activeTab === 'proxy' && (
        <div className="tab-content">
          <Card
            title="🌐 Vercel Proxy Logs"
            actions={
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <Input
                  placeholder="Cari method, endpoint, error..."
                  value={proxySearchQuery}
                  onChange={setProxySearchQuery}
                />
                <Input
                  type="date"
                  value={proxyDateFilter}
                  onChange={setProxyDateFilter}
                />
                <Button variant="secondary" onClick={exportProxyLogs}>
                  📥 Export CSV
                </Button>
                <Button variant="danger" onClick={clearProxyLogsHandler}>
                  🗑️ Clear Logs
                </Button>
              </div>
            }
          >
            <div style={{ marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Total: {filteredProxyLogs.length} log{filteredProxyLogs.length !== 1 ? 's' : ''}
              {filteredProxyLogs.length > 0 && (
                <span style={{ marginLeft: '16px' }}>
                  Latest: {formatDateTime(filteredProxyLogs[0].timestamp)}
                </span>
              )}
            </div>
            <Table
              columns={[
                {
                  key: 'timestamp',
                  header: 'Waktu',
                  render: (log: ProxyLog) => (
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {formatDateTime(log.timestamp)}
                    </span>
                  ),
                },
                {
                  key: 'method',
                  header: 'Method',
                  render: (log: ProxyLog) => (
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '4px',
                      backgroundColor: log.method === 'GET' ? 'rgba(33, 150, 243, 0.1)' :
                                      log.method === 'POST' ? 'rgba(76, 175, 80, 0.1)' :
                                      log.method === 'DELETE' ? 'rgba(244, 67, 54, 0.1)' :
                                      'rgba(158, 158, 158, 0.1)',
                      color: log.method === 'GET' ? '#2196F3' :
                             log.method === 'POST' ? '#4caf50' :
                             log.method === 'DELETE' ? '#f44336' :
                             '#9e9e9e',
                      fontSize: '12px',
                      fontWeight: '600'
                    }}>
                      {log.method}
                    </span>
                  ),
                },
                {
                  key: 'endpoint',
                  header: 'Endpoint',
                  render: (log: ProxyLog) => (
                    <code style={{ 
                      fontSize: '12px', 
                      color: 'var(--text-primary)',
                      backgroundColor: 'var(--bg-secondary)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      wordBreak: 'break-all'
                    }}>
                      {log.endpoint}
                    </code>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (log: ProxyLog) => (
                    <div>
                      {log.status ? (
                        <span style={{ 
                          padding: '4px 8px', 
                          borderRadius: '4px',
                          backgroundColor: log.status >= 200 && log.status < 300 ? 'rgba(76, 175, 80, 0.1)' :
                                          log.status >= 400 ? 'rgba(244, 67, 54, 0.1)' :
                                          'rgba(255, 152, 0, 0.1)',
                          color: log.status >= 200 && log.status < 300 ? '#4caf50' :
                                 log.status >= 400 ? '#f44336' :
                                 '#ff9800',
                          fontSize: '12px',
                          fontWeight: '600'
                        }}>
                          {log.status} {log.statusText || ''}
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {log.error ? '❌ Error' : '-'}
                        </span>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'size',
                  header: 'Size',
                  render: (log: ProxyLog) => (
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {log.requestSize && (
                        <div>Req: {(log.requestSize / 1024).toFixed(2)} KB</div>
                      )}
                      {log.responseSize && (
                        <div>Res: {(log.responseSize / 1024).toFixed(2)} KB</div>
                      )}
                    </div>
                  ),
                },
                {
                  key: 'duration',
                  header: 'Duration',
                  render: (log: ProxyLog) => (
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {log.duration ? `${log.duration}ms` : '-'}
                    </span>
                  ),
                },
                {
                  key: 'error',
                  header: 'Error',
                  render: (log: ProxyLog) => (
                    log.error ? (
                      <span style={{ 
                        fontSize: '12px', 
                        color: '#f44336',
                        wordBreak: 'break-word'
                      }}>
                        {log.error}
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>-</span>
                    )
                  ),
                },
              ]}
              data={filteredProxyLogs}
              emptyMessage="Belum ada proxy logs"
              getRowStyle={(log) => ({
                backgroundColor: log.error ? 'rgba(244, 67, 54, 0.05)' :
                                 log.status && log.status >= 400 ? 'rgba(244, 67, 54, 0.05)' :
                                 log.status && log.status >= 200 && log.status < 300 ? 'rgba(76, 175, 80, 0.05)' :
                                 undefined
              })}
            />
          </Card>
        </div>
      )}

      {activeTab === 'usage' && (
        <div className="tab-content">
          <Card
            title="📊 Vercel Usage Statistics"
            actions={
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Last updated: {new Date(usageStats.lastUpdated).toLocaleString('id-ID')}
              </div>
            }
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ 
                padding: '16px', 
                borderRadius: '8px', 
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                border: '1px solid rgba(33, 150, 243, 0.2)'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#2196F3' }}>
                  {usageStats.totalRequests.toLocaleString()}
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Total Requests Today
                </div>
              </div>
              
              <div style={{ 
                padding: '16px', 
                borderRadius: '8px', 
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                border: '1px solid rgba(76, 175, 80, 0.2)'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#4caf50' }}>
                  {(usageStats.totalBandwidth / 1024 / 1024).toFixed(2)} MB
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Total Bandwidth Today
                </div>
              </div>
              
              <div style={{ 
                padding: '16px', 
                borderRadius: '8px', 
                backgroundColor: 'rgba(255, 152, 0, 0.1)',
                border: '1px solid rgba(255, 152, 0, 0.2)'
              }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#ff9800' }}>
                  {usageStats.avgResponseTime}ms
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Avg Response Time
                </div>
              </div>
              
              <div style={{ 
                padding: '16px', 
                borderRadius: '8px', 
                backgroundColor: usageStats.errorRate > 5 ? 'rgba(244, 67, 54, 0.1)' : 'rgba(76, 175, 80, 0.1)',
                border: `1px solid ${usageStats.errorRate > 5 ? 'rgba(244, 67, 54, 0.2)' : 'rgba(76, 175, 80, 0.2)'}`
              }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: usageStats.errorRate > 5 ? '#f44336' : '#4caf50' }}>
                  {usageStats.errorRate}%
                </div>
                <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Error Rate
                </div>
              </div>
            </div>
            
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>Daily Usage (Last 7 Days)</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {usageStats.dailyStats.map(stat => (
                  <div key={stat.date} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    padding: '12px',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-secondary)'
                  }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>
                        {new Date(stat.date).toLocaleDateString('id-ID', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {stat.date}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600' }}>
                          {stat.requests.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Requests
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600' }}>
                          {(stat.bandwidth / 1024 / 1024).toFixed(1)} MB
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Bandwidth
                        </div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: '600', color: stat.errors > 0 ? '#f44336' : '#4caf50' }}>
                          {stat.errors}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Errors
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div style={{ 
              padding: '16px', 
              borderRadius: '8px', 
              backgroundColor: 'rgba(33, 150, 243, 0.05)',
              border: '1px solid rgba(33, 150, 243, 0.1)'
            }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: '#2196F3' }}>
                🚀 Optimization Status
              </h4>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                <div>✅ Smart caching enabled (10-minute duration)</div>
                <div>✅ Visibility-based sync (only when user active)</div>
                <div>✅ Optimized intervals (10min auto-sync, 30s min interval)</div>
                <div>✅ Payload compression for large arrays (&gt;100 items)</div>
                <div>✅ Intelligent change detection (5-minute threshold)</div>
                <div>✅ Enhanced error handling (3s timeout, 2 max retries)</div>
                <div style={{ marginTop: '8px', fontWeight: '600', color: '#4caf50' }}>
                  Expected savings: 60-70% usage reduction
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SuperAdmin;
