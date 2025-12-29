import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/Card';
import '../../styles/compact.css';
import './Workflow.css';

interface WorkflowNode {
  id: string;
  name: string;
  module: string;
  path: string;
  icon: string;
  x: number;
  y: number;
  type: 'start' | 'process' | 'decision' | 'end' | 'finance';
  connections: string[]; // IDs of connected nodes
}

const Workflow = () => {
  const navigate = useNavigate();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [animationFrame, setAnimationFrame] = useState(0);

  // Animation loop untuk efek futuristik
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimationFrame(prev => (prev + 1) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // Define nodes dengan posisi dan connections untuk General Trading (compact untuk 1 screen)
  const nodes: WorkflowNode[] = [
    {
      id: 'sales-orders',
      name: 'Sales Orders',
      module: 'Sales Orders',
      path: '/general-trading/orders/sales',
      icon: '📋',
      x: 80,
      y: 80,
      type: 'start',
      connections: ['inventory-check'],
    },
    {
      id: 'inventory-check',
      name: 'Inventory Check',
      module: 'Stock Check',
      path: '/general-trading/master/inventory',
      icon: '🔍',
      x: 220,
      y: 80,
      type: 'decision',
      connections: ['purchasing', 'delivery-note'],
    },
    {
      id: 'purchasing',
      name: 'Purchasing',
      module: 'Purchase Order',
      path: '/general-trading/purchasing',
      icon: '🛒',
      x: 360,
      y: 180,
      type: 'process',
      connections: ['grn'],
    },
    {
      id: 'grn',
      name: 'GRN',
      module: 'Goods Receipt',
      path: '/general-trading/purchasing',
      icon: '📦',
      x: 500,
      y: 180,
      type: 'process',
      connections: ['inventory', 'payment-supplier'],
    },
    {
      id: 'inventory',
      name: 'Inventory',
      module: 'Product Stock',
      path: '/general-trading/master/inventory',
      icon: '📊',
      x: 500,
      y: 80,
      type: 'process',
      connections: ['delivery-note'],
    },
    {
      id: 'delivery-note',
      name: 'Delivery Note',
      module: 'Delivery Note',
      path: '/general-trading/delivery-note',
      icon: '🚚',
      x: 640,
      y: 80,
      type: 'process',
      connections: ['invoice'],
    },
    {
      id: 'invoice',
      name: 'Invoice',
      module: 'Customer Invoice',
      path: '/general-trading/finance/invoices',
      icon: '🧾',
      x: 780,
      y: 80,
      type: 'finance',
      connections: ['ar'],
    },
    {
      id: 'ar',
      name: 'AR',
      module: 'Accounts Receivable',
      path: '/general-trading/finance/ar',
      icon: '📈',
      x: 920,
      y: 80,
      type: 'finance',
      connections: ['payment-customer'],
    },
    {
      id: 'ap',
      name: 'AP',
      module: 'Accounts Payable',
      path: '/general-trading/finance/ap',
      icon: '📉',
      x: 500,
      y: 280,
      type: 'finance',
      connections: ['payment-supplier'],
    },
    {
      id: 'payment-supplier',
      name: 'Payment (Supplier)',
      module: 'Supplier Payment',
      path: '/general-trading/finance/payments',
      icon: '💳',
      x: 640,
      y: 280,
      type: 'finance',
      connections: ['payment'],
    },
    {
      id: 'payment-customer',
      name: 'Payment (Customer)',
      module: 'Customer Payment',
      path: '/general-trading/finance/payments',
      icon: '💳',
      x: 1060,
      y: 80,
      type: 'finance',
      connections: ['payment'],
    },
    {
      id: 'payment',
      name: 'Payment',
      module: 'Payments',
      path: '/general-trading/finance/payments',
      icon: '💰',
      x: 920,
      y: 180,
      type: 'end',
      connections: [],
    },
  ];

  const handleNodeClick = (node: WorkflowNode) => {
    navigate(node.path);
  };

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'start':
        return { main: '#10b981', glow: '#34d399', gradient: ['#10b981', '#059669'] };
      case 'process':
        return { main: '#3b82f6', glow: '#60a5fa', gradient: ['#3b82f6', '#2563eb'] };
      case 'decision':
        return { main: '#f59e0b', glow: '#fbbf24', gradient: ['#f59e0b', '#d97706'] };
      case 'finance':
        return { main: '#8b5cf6', glow: '#a78bfa', gradient: ['#8b5cf6', '#7c3aed'] };
      case 'end':
        return { main: '#ef4444', glow: '#f87171', gradient: ['#ef4444', '#dc2626'] };
      default:
        return { main: '#6b7280', glow: '#9ca3af', gradient: ['#6b7280', '#4b5563'] };
    }
  };

  const getConnectionPath = (from: WorkflowNode, to: WorkflowNode) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    
    // Jika horizontal (y sama), pakai garis lurus
    if (Math.abs(dy) < 10) {
      return `M ${from.x + 35} ${from.y} L ${to.x - 35} ${to.y}`;
    }
    
    // Jika vertical atau diagonal, pakai bezier curve
    const midX = from.x + dx / 2;
    return `M ${from.x + 35} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x - 35} ${to.y}`;
  };

  // Calculate SVG dimensions (compact untuk 1 screen)
  const maxX = Math.max(...nodes.map(n => n.x)) + 100;
  const maxY = Math.max(...nodes.map(n => n.y)) + 100;
  const svgWidth = maxX;
  const svgHeight = maxY;

  // Generate hexagon points
  const getHexagonPoints = (cx: number, cy: number, r: number) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  };

  return (
    <div className="module-compact">
      <div className="page-header">
        <h1>General Trading Workflow</h1>
        <p className="page-subtitle">Visual workflow alur kerja General Trading - Klik node untuk navigasi</p>
      </div>

      <Card>
        <div className="workflow-visual-container">
          <svg
            width="100%"
            height="400"
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ overflow: 'visible' }}
          >
            <defs>
              {/* Gradient definitions untuk setiap type */}
              <linearGradient id="gradient-start" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="1" />
                <stop offset="100%" stopColor="#059669" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="gradient-process" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="1" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="gradient-decision" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="1" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="gradient-finance" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="1" />
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="1" />
              </linearGradient>
              <linearGradient id="gradient-end" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="1" />
                <stop offset="100%" stopColor="#dc2626" stopOpacity="1" />
              </linearGradient>

              {/* Glow filter untuk efek futuristik */}
              <filter id="glow">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              
              <filter id="glow-strong">
                <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>

              {/* Animated gradient untuk connections */}
              <linearGradient id="connection-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3">
                  <animate attributeName="stop-opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
                </stop>
                <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.6">
                  <animate attributeName="stop-opacity" values="0.6;1;0.6" dur="2s" repeatCount="indefinite" />
                </stop>
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3">
                  <animate attributeName="stop-opacity" values="0.3;0.8;0.3" dur="2s" repeatCount="indefinite" />
                </stop>
              </linearGradient>

              {/* Arrow marker definition */}
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="8"
                refX="7"
                refY="2.5"
                orient="auto"
              >
                <polygon points="0 0, 8 2.5, 0 5" fill="#60a5fa" />
              </marker>
            </defs>

            {/* Render connections first (behind nodes) */}
            {nodes.map((node) =>
              node.connections.map((targetId) => {
                const targetNode = nodes.find((n) => n.id === targetId);
                if (!targetNode) return null;
                const isSelected = hoveredNode === node.id || hoveredNode === targetId;
                const nodeColor = getNodeColor(node.type);
                return (
                  <g key={`${node.id}-${targetId}`}>
                    {/* Animated connection line */}
                    <path
                      d={getConnectionPath(node, targetNode)}
                      stroke={isSelected ? nodeColor.glow : "#60a5fa"}
                      strokeWidth={isSelected ? 3 : 2}
                      fill="none"
                      markerEnd="url(#arrowhead)"
                      opacity={isSelected ? 0.9 : 0.4}
                      style={{ 
                        transition: 'all 0.3s ease',
                        filter: isSelected ? 'url(#glow)' : 'none'
                      }}
                    >
                      <animate
                        attributeName="stroke-dasharray"
                        values="0,1000;1000,0"
                        dur="3s"
                        repeatCount="indefinite"
                      />
                    </path>
                    {/* Glow effect untuk connection */}
                    {isSelected && (
                      <path
                        d={getConnectionPath(node, targetNode)}
                        stroke={nodeColor.glow}
                        strokeWidth="6"
                        fill="none"
                        opacity="0.3"
                        style={{ filter: 'url(#glow)' }}
                      />
                    )}
                  </g>
                );
              })
            )}

            {/* Render nodes */}
            {nodes.map((node) => {
              const isHovered = hoveredNode === node.id;
              const nodeColor = getNodeColor(node.type);
              const gradientId = `gradient-${node.type}`;
              const scale = isHovered ? 1.15 : 1;
              
              return (
                <g
                  key={node.id}
                  onClick={() => handleNodeClick(node)}
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  style={{ cursor: 'pointer' }}
                  transform={`translate(${node.x}, ${node.y}) scale(${scale})`}
                >
                  {/* Outer glow ring (animated) */}
                  <circle
                    cx="0"
                    cy="0"
                    r="42"
                    fill="none"
                    stroke={nodeColor.glow}
                    strokeWidth="2"
                    opacity={0.3 + Math.sin(animationFrame * 0.1) * 0.2}
                    style={{ 
                      filter: 'url(#glow)',
                      animation: 'pulse 2s ease-in-out infinite'
                    }}
                  />
                  
                  {/* Hexagon shape (futuristik) */}
                  <polygon
                    points={getHexagonPoints(0, 0, 35)}
                    fill={`url(#${gradientId})`}
                    stroke={isHovered ? '#ffffff' : nodeColor.glow}
                    strokeWidth={isHovered ? 3 : 2}
                    opacity={isHovered ? 1 : 0.95}
                    style={{ 
                      filter: `url(#glow-strong)`,
                      transition: 'all 0.3s ease',
                      transformOrigin: 'center'
                    }}
                  >
                    <animate
                      attributeName="opacity"
                      values="0.95;1;0.95"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </polygon>
                  
                  {/* Inner hexagon untuk depth */}
                  <polygon
                    points={getHexagonPoints(0, 0, 28)}
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="1"
                    opacity="0.5"
                  />
                  
                  {/* Icon */}
                  <text
                    x="0"
                    y="2"
                    textAnchor="middle"
                    fontSize="20"
                    fill="white"
                    style={{ 
                      pointerEvents: 'none',
                      filter: 'drop-shadow(0 0 4px rgba(255,255,255,0.5))'
                    }}
                  >
                    {node.icon}
                  </text>
                  
                  {/* Node name - di tengah di bawah icon */}
                  <text
                    x="0"
                    y="25"
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="600"
                    fill="white"
                    style={{ 
                      pointerEvents: 'none',
                      filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))'
                    }}
                  >
                    {node.name}
                  </text>
                  
                  {/* Module name - di tengah di bawah node name */}
                  <text
                    x="0"
                    y="36"
                    textAnchor="middle"
                    fontSize="7"
                    fill="rgba(255,255,255,0.85)"
                    style={{ 
                      pointerEvents: 'none',
                      filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))'
                    }}
                  >
                    {node.module}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="workflow-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#10b981' }}></div>
            <span>Start</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#3b82f6' }}></div>
            <span>Process</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#f59e0b' }}></div>
            <span>Decision</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#8b5cf6' }}></div>
            <span>Finance</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ef4444' }}></div>
            <span>End</span>
          </div>
        </div>

        {/* Flow Description */}
        <div className="workflow-description">
          <h3 style={{ marginBottom: '8px', fontSize: '12px', fontWeight: '600' }}>Alur Kerja General Trading:</h3>
          <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', lineHeight: '1.6', color: 'var(--text-secondary)' }}>
            <li><strong>Sales Orders</strong> → Create SO dengan multiple products</li>
            <li><strong>Inventory Check</strong> → Sistem otomatis cek stock tersedia atau tidak</li>
            <li><strong>Jika Stock Cukup:</strong> → Langsung ke Delivery Note untuk pengiriman</li>
            <li><strong>Jika Stock Kurang:</strong> → Create Purchase Request → Purchasing buat PO</li>
            <li><strong>GRN</strong> → Goods Receipt Note saat barang diterima dari supplier, update Inventory</li>
            <li><strong>Inventory</strong> → Stock otomatis ter-update setelah GRN</li>
            <li><strong>Delivery Note</strong> → Create Delivery Note setelah stock tersedia, upload surat jalan yang sudah ditandatangani</li>
            <li><strong>Invoice</strong> → Create Customer Invoice dari Delivery Note (otomatis setelah upload surat jalan)</li>
            <li><strong>AR</strong> → Accounts Receivable tracking untuk customer payment</li>
            <li><strong>AP</strong> → Accounts Payable untuk supplier payment (setelah GRN)</li>
            <li><strong>Payment</strong> → Payment processing (Customer & Supplier)</li>
          </ol>
        </div>
      </Card>
    </div>
  );
};

export default Workflow;
