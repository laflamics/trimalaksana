import { useState, useEffect, useMemo } from 'react';
import Card from '../../components/Card';
import { storageService } from '../../services/storage';
import '../../styles/common.css';

const GeneralTradingDashboard = () => {
  const [salesOrders, setSalesOrders] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [soRaw, poRaw, invRaw, payRaw, prodRaw, quotRaw, custRaw, suppRaw] = await Promise.all([
      storageService.get<any[]>('gt_salesOrders') || [],
      storageService.get<any[]>('gt_purchaseOrders') || [],
      storageService.get<any[]>('gt_invoices') || [],
      storageService.get<any[]>('gt_payments') || [],
      storageService.get<any[]>('gt_products') || [],
      storageService.get<any[]>('gt_quotations') || [],
      storageService.get<any[]>('gt_customers') || [],
      storageService.get<any[]>('gt_suppliers') || [],
    ]);
    
    // CRITICAL: Extract array from storage wrapper if needed
    const extractArray = (data: any) => {
      if (!data) return [];
      if (Array.isArray(data)) return data;
      if (typeof data === 'object' && 'value' in data && Array.isArray(data.value)) {
        return data.value;
      }
      return [];
    };
    
    setSalesOrders(extractArray(soRaw));
    setPurchaseOrders(extractArray(poRaw));
    setInvoices(extractArray(invRaw));
    setPayments(extractArray(payRaw));
    setProducts(extractArray(prodRaw));
    setQuotations(extractArray(quotRaw));
    setCustomers(extractArray(custRaw));
    setSuppliers(extractArray(suppRaw));
  };

  // KPI Calculations
  const kpis = useMemo(() => {
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();
    
    // Sales KPIs
    const monthlySales = (salesOrders || [])
      .filter(so => {
        if (!so || !so.orderDate) return false;
        const soDate = new Date(so.orderDate);
        return soDate.getMonth() === thisMonth && soDate.getFullYear() === thisYear;
      })
      .reduce((sum, so) => sum + (so.total || 0), 0);
    
    const monthlyInvoices = (invoices || [])
      .filter(inv => {
        if (!inv || !inv.invoiceDate) return false;
        const invDate = new Date(inv.invoiceDate);
        return invDate.getMonth() === thisMonth && invDate.getFullYear() === thisYear;
      })
      .reduce((sum, inv) => sum + (inv.total || 0), 0);
    
    const outstandingAR = (invoices || [])
      .filter(inv => inv && inv.status !== 'Paid' && (inv.balance || 0) > 0)
      .reduce((sum, inv) => sum + (inv.balance || 0), 0);
    
    // Purchase KPIs
    const monthlyPurchases = (purchaseOrders || [])
      .filter(po => {
        if (!po || !po.orderDate) return false;
        const poDate = new Date(po.orderDate);
        return poDate.getMonth() === thisMonth && poDate.getFullYear() === thisYear;
      })
      .reduce((sum, po) => sum + (po.total || 0), 0);
    
    const outstandingAP = (purchaseOrders || [])
      .filter(po => po && po.status === 'Received')
      .reduce((sum, po) => sum + (po.total || 0), 0);
    
    // Inventory KPIs
    const totalInventoryValue = (products || []).reduce((sum, p) => 
      sum + ((p?.stock || 0) * (p?.purchasePrice || 0)), 0);
    
    const lowStockItems = (products || []).filter(p => 
      p && (p.stock || 0) <= (p.minStock || 0)
    ).length;
    
    // Payment KPIs
    const monthlyReceipts = (payments || [])
      .filter(p => {
        if (!p || !p.paymentDate) return false;
        const pDate = new Date(p.paymentDate);
        return p.type === 'Receipt' && 
               pDate.getMonth() === thisMonth && 
               pDate.getFullYear() === thisYear;
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    const monthlyPayments = (payments || [])
      .filter(p => {
        if (!p || !p.paymentDate) return false;
        const pDate = new Date(p.paymentDate);
        return p.type === 'Payment' && 
               pDate.getMonth() === thisMonth && 
               pDate.getFullYear() === thisYear;
      })
      .reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // Pending Orders
    const pendingSO = (salesOrders || []).filter(so => 
      so && (so.status === 'Draft' || so.status === 'Confirmed')
    ).length;
    
    const pendingPO = (purchaseOrders || []).filter(po => 
      po && (po.status === 'Draft' || po.status === 'Confirmed')
    ).length;
    
    // Conversion Rate
    const totalQuotations = (quotations || []).length;
    const acceptedQuotations = (quotations || []).filter(q => 
      q && q.status === 'Accepted'
    ).length;
    const conversionRate = totalQuotations > 0 
      ? ((acceptedQuotations / totalQuotations) * 100).toFixed(1)
      : '0';
    
    return {
      monthlySales,
      monthlyInvoices,
      outstandingAR,
      monthlyPurchases,
      outstandingAP,
      totalInventoryValue,
      lowStockItems,
      monthlyReceipts,
      monthlyPayments,
      pendingSO,
      pendingPO,
      conversionRate,
      totalCustomers: (customers || []).length,
      totalSuppliers: (suppliers || []).length,
      totalProducts: (products || []).length,
    };
  }, [salesOrders, purchaseOrders, invoices, payments, products, quotations, customers, suppliers]);

  const StatCard = ({ title, value, icon, color, subtitle }: any) => (
    <Card style={{ 
      background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)`,
      border: `1px solid ${color}30`
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
            {title}
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: color, marginBottom: '4px' }}>
            {typeof value === 'number' ? `Rp ${value.toLocaleString('id-ID')}` : value}
          </div>
          {subtitle && (
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
              {subtitle}
            </div>
          )}
        </div>
        <div style={{ fontSize: '36px', opacity: 0.3 }}>
          {icon}
        </div>
      </div>
    </Card>
  );

  return (
    <div>
      <h1 style={{ marginBottom: '30px' }}>General Trading Dashboard</h1>
      
      {/* Sales KPIs */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ marginBottom: '15px', fontSize: '18px' }}>Sales Performance</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px' 
        }}>
          <StatCard 
            title="Monthly Sales Orders" 
            value={kpis.monthlySales} 
            icon="📊" 
            color="#4A90E2"
            subtitle={`${(salesOrders || []).filter(so => {
              if (!so || !so.orderDate) return false;
              const soDate = new Date(so.orderDate);
              return soDate.getMonth() === new Date().getMonth();
            }).length} orders this month`}
          />
          <StatCard 
            title="Monthly Invoices" 
            value={kpis.monthlyInvoices} 
            icon="🧾" 
            color="#50C878"
            subtitle={`${(invoices || []).filter(inv => {
              if (!inv || !inv.invoiceDate) return false;
              const invDate = new Date(inv.invoiceDate);
              return invDate.getMonth() === new Date().getMonth();
            }).length} invoices`}
          />
          <StatCard 
            title="Outstanding AR" 
            value={kpis.outstandingAR} 
            icon="💰" 
            color="#FF6B6B"
            subtitle={`${(invoices || []).filter(inv => inv && inv.status !== 'Paid' && (inv.balance || 0) > 0).length} unpaid invoices`}
          />
          <StatCard 
            title="Quotation Conversion" 
            value={`${kpis.conversionRate}%`} 
            icon="📈" 
            color="#9B59B6"
            subtitle={`${(quotations || []).filter(q => q && q.status === 'Accepted').length} / ${(quotations || []).length} accepted`}
          />
        </div>
      </div>

      {/* Purchase KPIs */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ marginBottom: '15px', fontSize: '18px' }}>Purchase & Procurement</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px' 
        }}>
          <StatCard 
            title="Monthly Purchases" 
            value={kpis.monthlyPurchases} 
            icon="🛒" 
            color="#E67E22"
            subtitle={`${(purchaseOrders || []).filter(po => {
              if (!po || !po.orderDate) return false;
              const poDate = new Date(po.orderDate);
              return poDate.getMonth() === new Date().getMonth();
            }).length} orders this month`}
          />
          <StatCard 
            title="Outstanding AP" 
            value={kpis.outstandingAP} 
            icon="📋" 
            color="#E74C3C"
            subtitle={`${(purchaseOrders || []).filter(po => po && po.status === 'Received').length} pending payments`}
          />
          <StatCard 
            title="Pending PO" 
            value={kpis.pendingPO} 
            icon="⏳" 
            color="#F39C12"
            subtitle="Orders pending"
          />
        </div>
      </div>

      {/* Inventory KPIs */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ marginBottom: '15px', fontSize: '18px' }}>Inventory Status</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px' 
        }}>
          <StatCard 
            title="Total Inventory Value" 
            value={kpis.totalInventoryValue} 
            icon="📦" 
            color="#3498DB"
            subtitle={`${kpis.totalProducts} products`}
          />
          <StatCard 
            title="Low Stock Items" 
            value={kpis.lowStockItems} 
            icon="⚠️" 
            color="#E74C3C"
            subtitle="Need reorder"
          />
        </div>
      </div>

      {/* Cash Flow KPIs */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ marginBottom: '15px', fontSize: '18px' }}>Cash Flow</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '20px' 
        }}>
          <StatCard 
            title="Monthly Receipts" 
            value={kpis.monthlyReceipts} 
            icon="💵" 
            color="#27AE60"
            subtitle="Customer payments"
          />
          <StatCard 
            title="Monthly Payments" 
            value={kpis.monthlyPayments} 
            icon="💸" 
            color="#C0392B"
            subtitle="Supplier payments"
          />
          <StatCard 
            title="Net Cash Flow" 
            value={kpis.monthlyReceipts - kpis.monthlyPayments} 
            icon="📊" 
            color={kpis.monthlyReceipts - kpis.monthlyPayments >= 0 ? "#27AE60" : "#C0392B"}
            subtitle="This month"
          />
        </div>
      </div>

      {/* Master Data Summary */}
      <div style={{ marginBottom: '30px' }}>
        <h2 style={{ marginBottom: '15px', fontSize: '18px' }}>Master Data</h2>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px' 
        }}>
          <StatCard 
            title="Total Customers" 
            value={kpis.totalCustomers} 
            icon="👥" 
            color="#3498DB"
          />
          <StatCard 
            title="Total Suppliers" 
            value={kpis.totalSuppliers} 
            icon="🏭" 
            color="#E67E22"
          />
          <StatCard 
            title="Total Products" 
            value={kpis.totalProducts} 
            icon="📦" 
            color="#9B59B6"
          />
          <StatCard 
            title="Pending SO" 
            value={kpis.pendingSO} 
            icon="📋" 
            color="#F39C12"
          />
        </div>
      </div>
    </div>
  );
};

export default GeneralTradingDashboard;
