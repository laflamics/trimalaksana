import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { hasBusinessUnitAccess, getCurrentUser, isDefaultAdmin } from '../utils/access-control-helper';
import { logLogout, logNavigation } from '../utils/activity-logger';
import './BusinessSelector.css';

const BusinessSelector = () => {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [accessibleBusinesses, setAccessibleBusinesses] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const allBusinesses = [
    {
      id: 'packaging',
      title: 'Packaging',
      description: 'ERP untuk manajemen produksi packaging',
      icon: '📦',
      gradient: 'linear-gradient(135deg,rgb(0, 0, 0) 0%,rgb(0, 0, 0) 100%)',
      glowColor: '#667eea',
      path: '/packaging/finance/reports',
    },
    {
      id: 'general-trading',
      title: 'General Trading',
      description: 'ERP untuk bisnis trading dan distribusi',
      icon: '🏢',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      glowColor: '#f5576c',
      path: '/general-trading/finance/reports',
    },
    {
      id: 'trucking',
      title: 'Trucking',
      description: 'ERP untuk ekspedisi dan sewa armada',
      icon: '🚚',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      glowColor: '#00f2fe',
      path: '/trucking/dashboard',
    },
  ];

  // Check accessible business units
  useEffect(() => {
    const checkAccess = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        navigate('/login', { replace: true });
        return;
      }

      // Default admin has access to all
      if (isDefaultAdmin(currentUser)) {
        setAccessibleBusinesses(allBusinesses.map(b => b.id));
        setIsLoading(false);
        return;
      }

      // Check access for each business unit
      const accessible: string[] = [];
      for (const business of allBusinesses) {
        const hasAccess = await hasBusinessUnitAccess(business.id, currentUser.id);
        if (hasAccess) {
          accessible.push(business.id);
        }
      }

      setAccessibleBusinesses(accessible);
      setIsLoading(false);

      // If user has no access to any business unit, redirect to login
      if (accessible.length === 0) {
        // User tidak punya akses ke business unit manapun
        localStorage.removeItem('currentUser');
        navigate('/login', { replace: true });
      }
    };

    checkAccess();
  }, [navigate]);

  // Filter businesses based on access
  const businesses = useMemo(() => {
    return allBusinesses.filter(business => 
      accessibleBusinesses.includes(business.id)
    );
  }, [accessibleBusinesses]);

  const handleSelectBusiness = async (businessId: string, path: string) => {
    // No need to check access again - if business is in the list, user already has access
    localStorage.setItem('selectedBusiness', businessId);
    await logNavigation(path);
    navigate(path);
  };

  const handleLogout = async () => {
    await logLogout();
    localStorage.removeItem('currentUser');
    localStorage.removeItem('selectedBusiness');
    navigate('/login', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="business-selector">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '100vh',
          fontSize: '16px',
          color: 'var(--text-secondary)'
        }}>
          Memeriksa akses...
        </div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return (
      <div className="business-selector">
        <div className="business-selector-container">
          <div className="business-selector-header">
            <div className="logo-container">
              <div className="logo-glow"></div>
              <h1 className="main-title">
                <span className="title-gradient">PT.Trima Laksana Jaya Pratama</span>
              </h1>
            </div>
          </div>
          <div style={{ 
            textAlign: 'center', 
            padding: '40px 20px',
            color: 'var(--text-primary)'
          }}>
            <h2 style={{ marginBottom: '16px' }}>Tidak Ada Akses</h2>
            <p style={{ marginBottom: '24px', color: 'var(--text-secondary)' }}>
              Anda tidak memiliki akses ke business unit manapun. 
              Silakan hubungi administrator untuk mendapatkan akses.
            </p>
            <button
              onClick={() => {
                localStorage.removeItem('currentUser');
                navigate('/login', { replace: true });
              }}
              style={{
                padding: '12px 24px',
                backgroundColor: 'var(--accent-color)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Kembali ke Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="business-selector">
      <div className="animated-background">
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
        <div className="particle"></div>
      </div>
      
      <div className="business-selector-container">
        <div className="business-selector-header">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            width: '100%',
            marginBottom: '20px'
          }}>
            <div style={{ flex: 1 }}></div>
            <div className="logo-container" style={{ flex: '0 0 auto' }}>
              <div className="logo-glow"></div>
              <h1 className="main-title">
                <span className="title-gradient">PT.Trima Laksana Jaya Pratama</span>
              </h1>
            </div>
            <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleLogout}
                className="business-selector-logout-btn"
                title="Logout"
              >
                <span style={{ marginRight: '8px' }}>🚪</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
        
        <div className="business-cards">
          {businesses.map((business) => (
            <div
              key={business.id}
              className={`business-card ${hoveredCard === business.id ? 'hovered' : ''}`}
              onClick={() => handleSelectBusiness(business.id, business.path)}
              onMouseEnter={() => setHoveredCard(business.id)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{ 
                '--card-gradient': business.gradient,
                '--glow-color': business.glowColor,
              } as React.CSSProperties}
            >
              <div className="card-background"></div>
              <div className="card-glow"></div>
              <div className="business-card-content">
                <div className="business-card-icon-wrapper">
                  <div className="icon-glow"></div>
                  <div className="business-card-icon">{business.icon}</div>
                </div>
                <h3>{business.title}</h3>
                <p>{business.description}</p>
                <div className="card-arrow">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="footer">
          <p>PT.Trima Laksana Jaya Pratama</p>
          {(() => {
            const currentUser = getCurrentUser();
            if (currentUser && isDefaultAdmin(currentUser)) {
              return (
                <button
                  onClick={() => navigate('/super-admin')}
                  style={{
                    marginTop: '16px',
                    padding: '10px 20px',
                    background: 'rgba(102, 126, 234, 0.2)',
                    border: '1px solid rgba(102, 126, 234, 0.5)',
                    color: '#667eea',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.2)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  🔐 Super Admin
                </button>
              );
            }
            return null;
          })()}
        </div>
      </div>
    </div>
  );
};

export default BusinessSelector;

