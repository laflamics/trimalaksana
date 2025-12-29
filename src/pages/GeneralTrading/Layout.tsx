import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { storageService, type SyncStatus } from '../../services/storage';
import { getTheme, applyTheme, type Theme } from '../../utils/theme';
import { loadIconAsBase64 } from '../../utils/icon-loader';
import '../../components/Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

interface UserAccess {
  id: string;
  menuAccess?: Record<string, string[]>;
}

const GeneralTradingLayout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<Theme>(getTheme());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuAccess, setUserMenuAccess] = useState<Record<string, string[]> | null>(null);
  const [iconSrc, setIconSrc] = useState<string>('/noxtiz.ico');
  const [iconError, setIconError] = useState(false);

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

  // Load icon path untuk kompatibilitas Electron
  useEffect(() => {
    const loadIcon = async () => {
      const electronAPI = (window as any).electronAPI;
      
      if (electronAPI) {
        // 🚀 OPTIMASI: Di Electron, gunakan getResourceBase64 untuk mendapatkan base64 langsung
        if (electronAPI.getResourceBase64) {
          try {
            const base64Icon = await electronAPI.getResourceBase64('noxtiz.ico');
            if (base64Icon && base64Icon.startsWith('data:')) {
              setIconSrc(base64Icon);
              return;
            }
          } catch (error) {
            // Silent fail - akan gunakan fallback
          }
        }
        
        // Fallback: coba load sebagai base64 menggunakan loadIconAsBase64
        try {
          const base64Icon = await loadIconAsBase64('noxtiz.ico');
          if (base64Icon && base64Icon.startsWith('data:')) {
            setIconSrc(base64Icon);
            return;
          }
        } catch (error) {
          // Silent fail - akan gunakan fallback
        }
      }
      
      // Fallback: gunakan path relatif dari public folder
      // JANGAN PERNAH gunakan file:// atau absolute path
      const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;
      if (isElectron) {
        setIconSrc('./noxtiz.ico');
      } else {
        setIconSrc('/noxtiz.ico');
      }
    };
    
    loadIcon();
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    setTheme(newTheme);
  };

  // Load user menu access
  useEffect(() => {
    const loadUserAccess = async () => {
      try {
        const currentUserStr = localStorage.getItem('currentUser');
        if (!currentUserStr) {
          setUserMenuAccess({});
          return;
        }
        const currentUser = JSON.parse(currentUserStr);
        
        // Default admin gets full access (null means no restrictions)
        if (currentUser.username === 'admin') {
          setUserMenuAccess(null);
          return;
        }
        
        const users = await storageService.get<UserAccess[]>('userAccessControl');
        const userData = users?.find((u) => u.id === currentUser.id);
        
        if (userData?.menuAccess) {
          setUserMenuAccess(userData.menuAccess);
        } else {
          // User not found or no menuAccess = no access
          setUserMenuAccess({});
        }
      } catch (error) {
        console.error('Error loading user access:', error);
        setUserMenuAccess({});
      }
    };
    loadUserAccess();

    // Listen for storage changes
    const handleStorageChange = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      const storageKey = detail?.key?.split('/').pop();
      if (storageKey === 'userAccessControl' || storageKey === 'currentUser') {
        loadUserAccess();
      }
    };
    window.addEventListener('app-storage-changed', handleStorageChange as EventListener);
    return () => window.removeEventListener('app-storage-changed', handleStorageChange as EventListener);
  }, []);

  const menuItems = [
    {
      title: 'OVERVIEW',
      type: 'section',
      items: [
        { title: 'Dashboard', path: '/general-trading/dashboard', icon: '📊' },
      ],
    },
    {
      title: 'MASTER',
      type: 'section',
      items: [
        { title: 'Products', path: '/general-trading/master/products', icon: '📦' },
        { title: 'Customers', path: '/general-trading/master/customers', icon: '👥' },
        { title: 'Suppliers', path: '/general-trading/master/suppliers', icon: '🏭' },
        { title: 'Inventory', path: '/general-trading/master/inventory', icon: '📊' },
      ],
    },
    {
      title: 'ORDERS & SALES',
      type: 'section',
      items: [
        { title: 'Sales Orders', path: '/general-trading/orders/sales', icon: '📋' },
        { title: 'PPIC', path: '/general-trading/ppic', icon: '📋' },
      ],
    },
    {
      title: 'PURCHASING',
      type: 'section',
      items: [
        { title: 'Purchasing', path: '/general-trading/purchasing', icon: '🛒' },
        { title: 'Delivery Note', path: '/general-trading/delivery-note', icon: '🚚' },
        { title: 'Return', path: '/general-trading/return', icon: '↩️' },
      ],
    },
    {
      title: 'WORKFLOW',
      type: 'section',
      items: [
        { title: 'Workflow', path: '/general-trading/workflow', icon: '🔄' },
      ],
    },
    {
      title: 'FINANCE',
      type: 'section',
      items: [
        { title: 'Invoices', path: '/general-trading/finance/invoices', icon: '🧾' },
        { title: 'Payments', path: '/general-trading/finance/payments', icon: '💳' },
        { title: 'Accounting', path: '/general-trading/finance/accounting', icon: '💰' },
        { title: 'General Ledger', path: '/general-trading/finance/ledger', icon: '📚' },
        { title: 'Financial Reports', path: '/general-trading/finance/reports', icon: '📊' },
        { title: 'Accounts Receivable', path: '/general-trading/finance/ar', icon: '📈' },
        { title: 'Accounts Payable', path: '/general-trading/finance/ap', icon: '📉' },
        { title: 'Tax Management', path: '/general-trading/finance/tax-management', icon: '🧾' },
        { title: 'Cost Analysis', path: '/general-trading/finance/cost-analysis', icon: '💵' },
      ],
    },
    {
      title: 'SETTINGS',
      type: 'section',
      items: [
        { title: 'Settings', path: '/general-trading/settings', icon: '⚙️' },
        { title: 'Report', path: '/general-trading/settings/report', icon: '📄' },
        { title: 'DB Activity', path: '/general-trading/settings/db-activity', icon: '📝' },
        { title: 'User Control', path: '/general-trading/settings/user-control', icon: '👤' },
      ],
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Filter menu items based on user access
  const filteredMenuItems = useMemo(() => {
    const currentUserStr = localStorage.getItem('currentUser');
    const isDefaultAdmin = currentUserStr && JSON.parse(currentUserStr).username === 'admin';
    
    // Default admin gets full access (userMenuAccess === null)
    if (isDefaultAdmin || userMenuAccess === null) {
      return menuItems;
    }

    // User with menuAccess restrictions
    const allowedMenus = new Set(userMenuAccess['general-trading'] || []);
    
    return menuItems.map((section) => ({
      ...section,
      items: section.items.filter((item) => allowedMenus.has(item.path)),
    })).filter((section) => section.items.length > 0); // Remove empty sections
  }, [userMenuAccess]);

  const handleBackToSelector = () => {
    localStorage.removeItem('selectedBusiness');
    navigate('/');
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('selectedBusiness');
    navigate('/login', { replace: true });
  };

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          {sidebarOpen && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
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
              <button
                onClick={handleBackToSelector}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '4px',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '36px',
                  height: '36px',
                  transition: 'all 0.2s ease',
                }}
                title="Kembali ke Business Selector"
              >
                <img 
                  src={(() => {
                    // 🚀 OPTIMASI: Pastikan tidak pernah menggunakan file:// path untuk prevent error log
                    if (!iconSrc) {
                      const electronAPI = (window as any).electronAPI;
                      return electronAPI ? './noxtiz.ico' : '/noxtiz.ico';
                    }
                    // JANGAN PERNAH gunakan file:// atau absolute path
                    if (iconSrc.startsWith('file://') || iconSrc.match(/^[A-Z]:\\/) || iconSrc.match(/^[A-Z]:\//)) {
                      const electronAPI = (window as any).electronAPI;
                      return electronAPI ? './noxtiz.ico' : '/noxtiz.ico';
                    }
                    if (iconSrc.startsWith('data:') || iconSrc.startsWith('/') || iconSrc.startsWith('./')) {
                      return iconSrc;
                    }
                    const electronAPI = (window as any).electronAPI;
                    return electronAPI ? './noxtiz.ico' : '/noxtiz.ico';
                  })()}
                  alt="TLJP" 
                  style={{
                    width: '24px',
                    height: '24px',
                    objectFit: 'contain',
                  }}
                  onError={(e) => {
                    // 🚀 OPTIMASI: Prevent error loop dan suppress error log
                    e.stopPropagation(); // Stop error propagation
                    e.preventDefault(); // Prevent default error handling
                    if (!iconError) {
                      setIconError(true);
                      const img = e.target as HTMLImageElement;
                      const currentSrc = img.src;
                      
                      // Skip jika src adalah file:// atau absolute path yang tidak valid
                      if (currentSrc.startsWith('file://') || currentSrc.match(/^[A-Z]:\\/) || currentSrc.match(/^[A-Z]:\//)) {
                        const electronAPI = (window as any).electronAPI;
                        img.src = electronAPI ? './noxtiz.ico' : '/noxtiz.ico';
                        return;
                      }
                      
                      // Coba PNG sebagai fallback jika belum
                      if (!currentSrc.includes('noxtiz.png') && !currentSrc.startsWith('data:')) {
                        const electronAPI = (window as any).electronAPI;
                        img.src = electronAPI ? './noxtiz.png' : '/noxtiz.png';
                      } else {
                        img.style.display = 'none';
                      }
                    } else {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }
                  }}
                />
              </button>
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
                  minWidth: '36px',
                  height: '36px',
                  transition: 'all 0.2s ease',
                  opacity: theme === 'light' ? 1 : 0.6,
                }}
                title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              >
                {theme === 'light' ? '💡' : '⚫'}
              </button>
            </div>
          )}
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>
        <nav className="sidebar-nav">
          {filteredMenuItems.map((item, idx) => (
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
        <div className="sidebar-footer">
          <button
            onClick={handleLogout}
            className="logout-button"
            title="Logout"
          >
            <span className="nav-icon">🚪</span>
            {sidebarOpen && <span className="nav-text">Logout</span>}
          </button>
        </div>
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

export default GeneralTradingLayout;

