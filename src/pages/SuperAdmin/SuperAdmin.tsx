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
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [users, setUsers] = useState<UserAccess[]>([]);

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
        const logs = await storageService.get<ActivityLog[]>('activityLogs') || [];
        // Sort by timestamp descending (newest first)
        const sortedLogs = logs.sort((a, b) => {
          const timeA = new Date(a.timestamp).getTime();
          const timeB = new Date(b.timestamp).getTime();
          return timeB - timeA;
        });
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
      const storageKey = detail?.key?.split('/').pop();
      if (storageKey === 'activityLogs') {
        loadLogs();
      }
    };

    window.addEventListener('app-storage-changed', handleStorageChange as EventListener);
    return () => window.removeEventListener('app-storage-changed', handleStorageChange as EventListener);
  }, []);

  // Load users for filter
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const allUsers = await storageService.get<UserAccess[]>('userAccessControl') || [];
        // Filter active and non-deleted users menggunakan helper function
        const activeUsers = filterActiveItems(allUsers);
        setUsers(activeUsers.filter(u => u.isActive));
      } catch (error) {
        console.error('Error loading users:', error);
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
    if (window.confirm('Hapus semua activity logs? Tindakan ini tidak dapat dibatalkan.')) {
      await storageService.set('activityLogs', []);
      setActivityLogs([]);
    }
  };

  const logColumns = [
    {
      key: 'timestamp',
      header: 'Waktu',
      render: (log: ActivityLog) => (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {formatDateTime(log.timestamp)}
        </span>
      ),
    },
    {
      key: 'user',
      header: 'User',
      render: (log: ActivityLog) => (
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
      key: 'action',
      header: 'Aksi',
      render: (log: ActivityLog) => (
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
      render: (log: ActivityLog) => (
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
      render: (log: ActivityLog) => (
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
    </div>
  );
};

export default SuperAdmin;
