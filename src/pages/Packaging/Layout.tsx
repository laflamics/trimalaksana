import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { packagingSync, type SyncStatus } from '../../services/packaging-sync';
import { storageService } from '../../services/storage';
import { getTheme, applyTheme, type Theme } from '../../utils/theme';
import { loadIconAsBase64 } from '../../utils/icon-loader';
import { 
  hasRouteAccess, 
  getFirstAccessibleRoute, 
  isDefaultAdmin, 
  getCurrentUser,
  normalizePath,
  getUserAccessData
} from '../../utils/access-control-helper';
import { logNavigation } from '../../utils/activity-logger';
import '../../components/Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

interface UserAccess {
  id: string;
  menuAccess?: Record<string, string[]>;
}

const PackagingLayout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<Theme>(getTheme());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuAccess, setUserMenuAccess] = useState<Record<string, string[]> | null>(null);
  // 🚀 OPTIMASI: Gunakan path relatif dari public folder sebagai default
  // Jangan gunakan path yang bisa menjadi file://
  const [iconSrc, setIconSrc] = useState<string>('/noxtiz.ico');
  const [iconError, setIconError] = useState(false);

  useEffect(() => {
    // Sync theme dengan localStorage
    const currentTheme = getTheme();
    setTheme(currentTheme);
    
    // Subscribe to sync status changes dari packagingSync
    const unsubscribe = packagingSync.onSyncStatusChange((status) => {
      setSyncStatus(status);
    });
    
    // Set initial sync status
    setSyncStatus(packagingSync.getSyncStatus());
    
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
        // Ini lebih reliable daripada menggunakan file:// path
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
      // Di Electron production, coba relative path dulu, lalu absolute path
      const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;
      if (isElectron) {
        // Di Electron, coba relative path dulu (./noxtiz.ico)
        setIconSrc('./noxtiz.ico');
      } else {
        // Di browser, gunakan absolute path dari public folder
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
        const currentUser = getCurrentUser();
        if (!currentUser) {
          setUserMenuAccess({});
          return;
        }
        
        // Default admin gets full access (null means no restrictions)
        if (isDefaultAdmin(currentUser)) {
          setUserMenuAccess(null);
          return;
        }
        
        // Pakai helper function yang sudah pakai filterActiveItems
        const userData = await getUserAccessData(currentUser.id);
        
        if (userData?.menuAccess) {
          setUserMenuAccess(userData.menuAccess);
        } else {
          // User not found or no menuAccess = no access
          setUserMenuAccess({});
        }
      } catch (error) {
        setUserMenuAccess({});
      }
    };
    loadUserAccess();

    // Listen for storage changes
    const handleStorageChange = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      const storageKey = detail?.key?.split('/').pop();
      // Handle both 'userAccessControl' (global) and 'packaging/userAccessControl' (prefixed)
      if (storageKey === 'userAccessControl' || detail?.key === 'userAccessControl' || detail?.key?.endsWith('/userAccessControl') || storageKey === 'currentUser') {
        loadUserAccess();
      }
    };
    window.addEventListener('app-storage-changed', handleStorageChange as EventListener);
    return () => window.removeEventListener('app-storage-changed', handleStorageChange as EventListener);
  }, []);

  const menuItems = [
    {
      title: 'MASTER',
      type: 'section',
      items: [
        { title: 'Products', path: '/packaging/master/products', icon: '📦' },
        { title: 'Materials', path: '/packaging/master/materials', icon: '🧱' },
        { title: 'Customers', path: '/packaging/master/customers', icon: '👥' },
        { title: 'Suppliers', path: '/packaging/master/suppliers', icon: '🏭' },
        { title: 'Inventory', path: '/packaging/master/inventory', icon: '📊' },
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
        { title: 'Return', path: '/packaging/return', icon: '↩️' },
      ],
    },
    {
      title: 'FINANCE',
      type: 'section',
      items: [
        { title: 'Invoices', path: '/packaging/finance/invoices', icon: '🧾' },
        { title: 'Payments', path: '/packaging/finance/payments', icon: '💳' },
        { title: 'Accounting', path: '/packaging/finance/accounting', icon: '💰' },
        { title: 'General Ledger', path: '/packaging/finance/ledger', icon: '📚' },
        { title: 'Financial Reports', path: '/packaging/finance/reports', icon: '📊' },
        // { title: 'Cost Analysis', path: '/packaging/finance/cost-analysis', icon: '💵' },
        { title: 'Accounts Receivable', path: '/packaging/finance/ar', icon: '📈' },
        { title: 'Accounts Payable', path: '/packaging/finance/ap', icon: '📉' },
        { title: 'Tax Management', path: '/packaging/finance/tax-management', icon: '🧾' },
        { title: 'All Business Reports', path: '/packaging/finance/all-business-reports', icon: '📊' },
        { title: 'COA', path: '/packaging/finance/coa', icon: '📑' },
      ],
    },
    {
      title: 'HR',
      type: 'section',
      items: [
        { title: 'HRD', path: '/packaging/hr', icon: '👔' },
      ],
    },
    {
      title: 'SETTINGS',
      type: 'section',
      items: [
        { title: 'Settings', path: '/packaging/settings', icon: '⚙️' },
        { title: 'Report', path: '/packaging/settings/report', icon: '📄' },
        { title: 'DB Activity', path: '/packaging/settings/db-activity', icon: '📝' },
        { title: 'User Control', path: '/packaging/settings/user-control', icon: '👤' },
        { title: 'Test Automation', path: '/packaging/settings/test-automation', icon: '🧪' },
      ],
    },
  ];

  // Normalize path for comparison (handle trailing slash and hash router)
  const isActive = (path: string) => {
    const currentPath = normalizePath(location.pathname);
    const menuPath = normalizePath(path);
    return currentPath === menuPath || currentPath.startsWith(menuPath + '/');
  };

  // Filter menu items based on user access
  const filteredMenuItems = useMemo(() => {
    const currentUser = getCurrentUser();
    const isAdmin = currentUser ? isDefaultAdmin(currentUser) : false;
    
    // Default admin gets full access (userMenuAccess === null)
    if (isAdmin || userMenuAccess === null) {
      return menuItems;
    }

    // User with menuAccess restrictions
    const allowedMenus = new Set(userMenuAccess['packaging'] || []);
    
    // Settings menu items that are admin-only
    const adminOnlySettingsPaths = [
      '/packaging/settings/report',
      '/packaging/settings/db-activity',
      '/packaging/settings/user-control',
      '/packaging/settings/test-automation'
    ];
    
    return menuItems.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        const normalizedItemPath = normalizePath(item.path);
        
        // Admin-only Settings items: only show to admin
        if (adminOnlySettingsPaths.some(adminPath => normalizePath(adminPath) === normalizedItemPath)) {
          return isAdmin;
        }
        
        // Other items: check against allowed menus
        return Array.from(allowedMenus).some(allowed => 
          normalizePath(allowed) === normalizedItemPath || 
          normalizedItemPath.startsWith(normalizePath(allowed) + '/')
        );
      }),
    })).filter((section) => section.items.length > 0); // Remove empty sections
  }, [userMenuAccess]);

  // Route protection: Check access when location changes
  useEffect(() => {
    const checkRouteAccess = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        navigate('/login', { replace: true });
        return;
      }

      // Default admin has full access
      if (isDefaultAdmin(currentUser)) {
        return;
      }

      const currentPath = normalizePath(location.pathname);
      const businessUnit = 'packaging';

      // Admin-only Settings paths - block non-admin access
      const adminOnlySettingsPaths = [
        '/packaging/settings/report',
        '/packaging/settings/db-activity',
        '/packaging/settings/user-control',
        '/packaging/settings/test-automation'
      ];
      
      if (adminOnlySettingsPaths.some(adminPath => normalizePath(adminPath) === currentPath)) {
        // Redirect non-admin users away from admin-only Settings pages
        const firstAccessible = await getFirstAccessibleRoute(
          businessUnit,
          'finance/reports',
          currentUser.id
        );
        navigate(firstAccessible, { replace: true });
        return;
      }

      // Check if user has access to current route
      const hasAccess = await hasRouteAccess(currentPath, businessUnit, currentUser.id);
      
      if (!hasAccess) {
        // Redirect to first accessible route
        const firstAccessible = await getFirstAccessibleRoute(
          businessUnit,
          'finance/reports',
          currentUser.id
        );
        navigate(firstAccessible, { replace: true });
      } else {
        // Log navigation if user has access
        await logNavigation(currentPath);
      }
    };

    checkRouteAccess();
  }, [location.pathname, navigate]);

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
                    if (!iconSrc) return '/noxtiz.ico';
                    // Hanya gunakan jika valid (data:, /, atau ./)
                    if (iconSrc.startsWith('data:') || iconSrc.startsWith('/') || iconSrc.startsWith('./')) {
                      return iconSrc;
                    }
                    // Skip jika file:// atau absolute Windows path - langsung return path yang valid
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
                    if (!iconError) {
                      setIconError(true);
                      const img = e.target as HTMLImageElement;
                      const currentSrc = img.src;
                      
                      // Skip jika src adalah file:// atau absolute path yang tidak valid
                      if (currentSrc.startsWith('file://') || currentSrc.match(/^[A-Z]:\\/) || currentSrc.match(/^[A-Z]:\//)) {
                        // Langsung set ke path yang valid, jangan trigger error lagi
                        const electronAPI = (window as any).electronAPI;
                        img.src = electronAPI ? './noxtiz.ico' : '/noxtiz.ico';
                        return;
                      }
                      
                      // Coba PNG sebagai fallback jika belum
                      if (!currentSrc.includes('noxtiz.png') && !currentSrc.startsWith('data:')) {
                        const electronAPI = (window as any).electronAPI;
                        img.src = electronAPI ? './noxtiz.png' : '/noxtiz.png';
                      } else {
                        // Jika semua gagal, hide image untuk prevent error berulang
                        img.style.display = 'none';
                      }
                    } else {
                      // Sudah error sebelumnya, hide image untuk prevent error berulang
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

export default PackagingLayout;

