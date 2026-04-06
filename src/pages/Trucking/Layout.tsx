import { useState, useMemo, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { getTheme, applyTheme, type Theme } from '../../utils/theme';

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';
import { loadIconAsBase64 } from '../../utils/icon-loader';
import { 
  hasRouteAccess, 
  getFirstAccessibleRoute, 
  isDefaultAdmin, 
  getCurrentUser,
  normalizePath,
  getUserAccessData
} from '../../utils/access-control-helper';
import { filterActiveItems } from '../../utils/data-persistence-helper';
import { useLanguage } from '../../hooks/useLanguage';
import '../../components/Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

interface UserAccess {
  id: string;
  menuAccess?: Record<string, string[]>;
}

const TruckingLayout = ({ children }: LayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [theme, setTheme] = useState<Theme>(getTheme());
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const location = useLocation();
  const navigate = useNavigate();
  const [userMenuAccess, setUserMenuAccess] = useState<Record<string, string[]> | null>(null);
  const [iconSrc, setIconSrc] = useState<string>('/tljp.ico');
  const [iconError, setIconError] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    // Sync theme dengan localStorage
    const currentTheme = getTheme();
    setTheme(currentTheme);
    
    // Set initial sync status to synced (no WebSocket)
    setSyncStatus('synced');
  }, []);

  // Load icon path untuk kompatibilitas Electron
  useEffect(() => {
    const loadIcon = async () => {
      const electronAPI = (window as any).electronAPI;
      
      if (electronAPI) {
        // 🚀 OPTIMASI: Di Electron, gunakan getResourceBase64 untuk mendapatkan base64 langsung
        if (electronAPI.getResourceBase64) {
          try {
            const base64Icon = await electronAPI.getResourceBase64('tljp.ico');
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
          const base64Icon = await loadIconAsBase64('tljp.ico');
          if (base64Icon && base64Icon.startsWith('data:')) {
            setIconSrc(base64Icon);
            return;
          }
        } catch (error) {
          // Silent fail - akan gunakan fallback
        }
      }
      
      // Fallback: gunakan path relatif dari public folder
      const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;
      if (isElectron) {
        setIconSrc('./tljp.ico');
      } else {
        setIconSrc('/tljp.ico');
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
        console.error('Error loading user access:', error);
        setUserMenuAccess({});
      }
    };
    loadUserAccess();

    const handleStorageChange = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      const storageKey = detail?.key?.split('/').pop();
      // Handle both 'userAccessControl' (global) and prefixed versions
      if (storageKey === 'userAccessControl' || detail?.key === 'userAccessControl' || detail?.key?.endsWith('/userAccessControl') || storageKey === 'currentUser') {
        loadUserAccess();
      }
    };
    window.addEventListener('app-storage-changed', handleStorageChange as EventListener);
    return () => window.removeEventListener('app-storage-changed', handleStorageChange as EventListener);
  }, []);

  const menuItems = useMemo(() => [
    {
      title: t('master.title') || 'MASTER',
      type: 'section',
      items: [
        { title: t('trucking.vehicles') || 'Vehicles', path: '/trucking/master/vehicles', icon: '🚛' },
        { title: t('trucking.drivers') || 'Drivers', path: '/trucking/master/drivers', icon: '👨‍✈️' },
        { title: t('trucking.routes') || 'Routes', path: '/trucking/master/routes', icon: '🗺️' },
        { title: t('master.customers') || 'Customers', path: '/trucking/master/customers', icon: '👥' },
      ],
    },
    {
      title: t('trucking.operations') || 'OPERATIONS',
      type: 'section',
      items: [
        { title: t('trucking.deliveryOrders') || 'Delivery Orders', path: '/trucking/shipments/delivery-orders', icon: '📦' },
        { title: t('trucking.pettyCash') || 'Petty Cash', path: '/trucking/finance/pettycash', icon: '💵' },
        { title: t('delivery.title') || 'Delivery Note', path: '/trucking/shipments/delivery-note', icon: '📋' },
      ],
    },
    {
      title: t('finance.title') || 'FINANCE',
      type: 'section',
      items: [
        { title: t('finance.invoices') || 'Invoices', path: '/trucking/finance/invoices', icon: '🧾' },
        { title: t('finance.payments') || 'Payments', path: '/trucking/finance/payments', icon: '💳' },
        { title: t('trucking.accounting') || 'Accounting', path: '/trucking/finance/accounting', icon: '💰' },
        { title: t('trucking.generalLedger') || 'General Ledger', path: '/trucking/finance/ledger', icon: '📚' },
        { title: t('finance.reports') || 'Financial Reports', path: '/trucking/finance/reports', icon: '📊' },
        { title: t('finance.accountsReceivable') || 'Accounts Receivable', path: '/trucking/finance/ar', icon: '📈' },
        { title: t('finance.accountsPayable') || 'Accounts Payable', path: '/trucking/finance/ap', icon: '📉' },
        { title: t('finance.taxManagement') || 'Tax Management', path: '/trucking/finance/tax-management', icon: '🧾' },
        { title: t('trucking.costAnalysis') || 'Cost Analysis', path: '/trucking/finance/cost-analysis', icon: '💵' },
        { title: t('trucking.operationalExpenses') || 'Operational Expenses', path: '/trucking/finance/operational-expenses', icon: '💸' },
        { title: t('trucking.coa') || 'COA', path: '/trucking/finance/coa', icon: '📋' },
      ],
    },
    {
      title: t('settings.title') || 'SETTINGS',
      type: 'section',
      items: [
        { title: t('settings.title') || 'Settings', path: '/trucking/settings', icon: '⚙️' },
        { title: 'Report', path: '/trucking/settings/report', icon: '📄' },
        { title: 'Full Reports', path: '/trucking/settings/full-reports', icon: '📊' },
        { title: 'Server Data', path: '/trucking/settings/server-data', icon: '🗄️' },
        { title: 'User Control', path: '/trucking/settings/user-control', icon: '👤' },
      ],
    },
  ], [t]);

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
    
    if (isAdmin || userMenuAccess === null) {
      return menuItems;
    }

    // If userMenuAccess is still loading or invalid, return empty menu
    if (!userMenuAccess || typeof userMenuAccess !== 'object') {
      return [];
    }

    // User with menuAccess restrictions
    const truckingAccess = userMenuAccess['trucking'];
    const allowedMenus = new Set(Array.isArray(truckingAccess) ? truckingAccess : []);
    
    // Settings menu items that are admin-only
    const adminOnlySettingsPaths = [
      '/trucking/settings/db-activity',
      '/trucking/settings/user-control'
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
    })).filter((section) => section.items.length > 0);
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
      const businessUnit = 'trucking';

      // Admin-only Settings paths - block non-admin access
      const adminOnlySettingsPaths = [
        '/trucking/settings/db-activity',
        '/trucking/settings/user-control'
      ];
      
      if (adminOnlySettingsPaths.some(adminPath => normalizePath(adminPath) === currentPath)) {
        // Redirect non-admin users away from admin-only Settings pages
        const firstAccessible = await getFirstAccessibleRoute(
          businessUnit,
          'dashboard',
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
          'dashboard',
          currentUser.id
        );
        navigate(firstAccessible, { replace: true });
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
    <div className="layout" style={{ '--accent-color': '#374151' } as React.CSSProperties}>
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
                    if (!iconSrc) return '/tljp.ico';
                    if (iconSrc.startsWith('data:') || iconSrc.startsWith('/') || iconSrc.startsWith('./')) {
                      return iconSrc;
                    }
                    const electronAPI = (window as any).electronAPI;
                    return electronAPI ? './tljp.ico' : '/tljp.ico';
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
                        const electronAPI = (window as any).electronAPI;
                        img.src = electronAPI ? './tljp.ico' : '/tljp.ico';
                        return;
                      }
                      
                      // Coba PNG sebagai fallback jika belum
                      if (!currentSrc.includes('tljp.png') && !currentSrc.startsWith('data:')) {
                        const electronAPI = (window as any).electronAPI;
                        img.src = electronAPI ? './tljp.png' : '/tljp.png';
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

export default TruckingLayout;

