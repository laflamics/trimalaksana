import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getTheme, applyTheme, type Theme } from '../utils/theme';
import { storageService, type SyncStatus } from '../services/storage';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<Theme>(getTheme());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const location = useLocation();

  useEffect(() => {
    // Sync theme dengan localStorage
    const currentTheme = getTheme();
    setTheme(currentTheme);
    
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

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    setTheme(newTheme);
  };

  const menuItems = [
    {
      title: 'MASTER',
      type: 'section',
      items: [
        { title: 'Products', path: '/master/products', icon: '📦' },
        { title: 'Materials', path: '/master/materials', icon: '🧱' },
        { title: 'Customers', path: '/master/customers', icon: '👥' },
        { title: 'Suppliers', path: '/master/suppliers', icon: '🏭' },
        { title: 'Inventory', path: '/master/inventory', icon: '📊' },
      ],
    },
    {
      title: 'PACKAGING',
      type: 'section',
      items: [
        { title: 'Workflow', path: '/packaging/workflow', icon: '🔄' },
        { title: 'Sales Orders', path: '/packaging/sales-orders', icon: '📋' },
        { title: 'PPIC', path: '/packaging/ppic', icon: '📅' },
        { title: 'Purchasing', path: '/packaging/purchasing', icon: '🛒' },
        { title: 'Production', path: '/packaging/production', icon: '⚙️' },
        { title: 'QA/QC', path: '/packaging/qa-qc', icon: '✅' },
        { title: 'WH/Delivery', path: '/packaging/delivery-note', icon: '🚚' },
      ],
    },
    {
      title: 'FINANCE',
      type: 'section',
      items: [
        { title: 'Finance', path: '/finance', icon: '💰' },
        { title: 'Accounting', path: '/finance/accounting', icon: '📊' },
        { title: 'AR', path: '/finance/ar', icon: '📈' },
        { title: 'COA', path: '/finance/coa', icon: '📑' },
      ],
    },
    {
      title: 'HR',
      type: 'section',
      items: [
        { title: 'HRD', path: '/hr', icon: '👔' },
      ],
    },
    {
      title: 'SETTINGS',
      type: 'section',
      items: [
        { title: 'Settings', path: '/settings', icon: '⚙️' },
        { title: 'Report', path: '/settings/report', icon: '📄' },
        { title: 'DB Activity', path: '/settings/db-activity', icon: '📝' },
      ],
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          {sidebarOpen && (
            <div style={{ 
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flex: 1,
              minWidth: 0
            }}>
              <div style={{ 
                display: 'flex',
                flexDirection: 'column',
                lineHeight: '1.2',
                flex: 1,
                minWidth: 0
              }}>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: '600',
                  color: 'var(--text-primary)'
                }}>
                  PT Trima Laksana
                </span>
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: '500',
                  color: 'var(--text-secondary)'
                }}>
                  Jaya Pratama
                </span>
              </div>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={toggleTheme}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: theme === 'light' ? '#ffaa00' : 'var(--text-secondary)',
                padding: '6px 10px',
                cursor: 'pointer',
                borderRadius: '6px',
                fontSize: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                opacity: theme === 'light' ? 1 : 0.6,
              }}
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              {theme === 'light' ? '💡' : '⚫'}
            </button>
          )}
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item, idx) => (
            <div key={idx} className="nav-section">
              <div className="nav-section-title">{item.title}</div>
              {item.items?.map((subItem) => (
                <Link
                  key={subItem.path}
                  to={subItem.path}
                  className={`nav-item ${isActive(subItem.path) ? 'active' : ''}`}
                >
                  <span className="nav-icon">{subItem.icon}</span>
                  {sidebarOpen && <span className="nav-text">{subItem.title}</span>}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        {/* Sync Status Indicator - Pojok Kanan Atas */}
        <div style={{
          position: 'fixed',
          top: '12px',
          right: '12px',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: syncStatus === 'synced' ? '#4caf50' : '#f44336',
              boxShadow: syncStatus === 'synced' 
                ? '0 0 8px rgba(76, 175, 80, 0.6)' 
                : '0 0 8px rgba(244, 67, 54, 0.6)',
              animation: syncStatus === 'syncing' ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }}
            title={syncStatus === 'synced' ? 'Data tersinkronisasi' : syncStatus === 'syncing' ? 'Sedang sinkronisasi...' : 'Data tidak tersinkronisasi'}
          />
          <span style={{
            fontSize: '12px',
            color: 'var(--text-secondary)',
            fontWeight: '500',
          }}>
            {syncStatus === 'synced' ? 'Sync' : syncStatus === 'syncing' ? 'Syncing...' : 'Not Sync'}
          </span>
        </div>
        {children}
      </main>
    </div>
  );
};

export default Layout;

