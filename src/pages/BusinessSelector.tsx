import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './BusinessSelector.css';

const BusinessSelector = () => {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const businesses = [
    {
      id: 'packaging',
      title: 'Packaging',
      description: 'ERP untuk manajemen produksi packaging',
      icon: '📦',
      gradient: 'linear-gradient(135deg,rgb(0, 0, 0) 0%,rgb(0, 0, 0) 100%)',
      glowColor: '#667eea',
      path: '/packaging/dashboard',
    },
    {
      id: 'general-trading',
      title: 'General Trading',
      description: 'ERP untuk bisnis trading dan distribusi',
      icon: '🏢',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      glowColor: '#f5576c',
      path: '/general-trading/dashboard',
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

  const handleSelectBusiness = (businessId: string, path: string) => {
    localStorage.setItem('selectedBusiness', businessId);
    navigate(path);
  };

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
          <div className="logo-container">
            <div className="logo-glow"></div>
            <h1 className="main-title">
              <span className="title-gradient">PT.Trima Laksana Jaya Pratama</span>
            </h1>
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
        </div>
      </div>
    </div>
  );
};

export default BusinessSelector;

