import { useState, useEffect, useMemo } from 'react';
import Card from '../../components/Card';
import { storageService } from '../../services/storage';
import '../../styles/common.css';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  color?: string;
}

const StatCard = ({ title, value, subtitle, icon, color }: StatCardProps) => {
  return (
    <Card style={{ background: color ? `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)` : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0, marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
            {title}
          </h3>
          <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: 'var(--text-primary)' }}>
            {value}
          </p>
          {subtitle && (
            <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <div style={{ fontSize: '32px', opacity: 0.3 }}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

const TruckingDashboard = () => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [bills, setBills] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Refresh setiap 30 detik
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    const [vehiclesDataRaw, driversDataRaw, ordersDataRaw, billsDataRaw, paymentsDataRaw] = await Promise.all([
      storageService.get<any[]>('trucking_vehicles') || [],
      storageService.get<any[]>('trucking_drivers') || [],
      storageService.get<any[]>('trucking_delivery_orders') || [],
      storageService.get<any[]>('trucking_bills') || [],
      storageService.get<any[]>('trucking_payments') || [],
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
    
    setVehicles(extractArray(vehiclesDataRaw));
    setDrivers(extractArray(driversDataRaw));
    setOrders(extractArray(ordersDataRaw));
    setBills(extractArray(billsDataRaw));
    setPayments(extractArray(paymentsDataRaw));
  };

  const kpis = useMemo(() => {
    // Safety checks: ensure all data are arrays
    const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
    const safeDrivers = Array.isArray(drivers) ? drivers : [];
    const safeOrders = Array.isArray(orders) ? orders : [];
    const safeBills = Array.isArray(bills) ? bills : [];
    const safePayments = Array.isArray(payments) ? payments : [];
    
    const totalVehicles = safeVehicles.length;
    const activeVehicles = safeVehicles.filter(v => v && v.status === 'Active').length;
    const totalDrivers = safeDrivers.length;
    const activeDrivers = safeDrivers.filter(d => d && d.status === 'Active').length;
    
    const totalOrders = safeOrders.length;
    const openOrders = safeOrders.filter(o => o && o.status === 'Open').length;
    const closeOrders = safeOrders.filter(o => o && o.status === 'Close').length;
    
    const totalBills = safeBills.length;
    const unpaidBills = safeBills.filter(b => b && (b.status === 'Sent' || b.status === 'Overdue')).length;
    const paidBills = safeBills.filter(b => b && b.status === 'Paid').length;
    
    const totalRevenue = safePayments.reduce((sum, p) => sum + (p && p.amount ? p.amount : 0), 0);
    const pendingRevenue = safeBills.filter(b => b && (b.status === 'Sent' || b.status === 'Overdue')).reduce((sum, b) => sum + (b.total || 0), 0);

    return {
      totalVehicles,
      activeVehicles,
      totalDrivers,
      activeDrivers,
      totalOrders,
      openOrders,
      closeOrders,
      totalBills,
      unpaidBills,
      paidBills,
      totalRevenue,
      pendingRevenue,
    };
  }, [vehicles, drivers, orders, bills, payments]);

  const recentOrders = useMemo(() => {
    return (orders || [])
      .filter(o => o && o.orderDate)
      .sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime())
      .slice(0, 5);
  }, [orders]);

  const recentBills = useMemo(() => {
    return (bills || [])
      .filter(b => b && b.billDate)
      .sort((a, b) => new Date(b.billDate).getTime() - new Date(a.billDate).getTime())
      .slice(0, 5);
  }, [bills]);

  return (
    <div>
      <div className="page-header">
        <h1>Trucking Dashboard</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatCard
          title="Total Vehicles"
          value={kpis.totalVehicles}
          subtitle={`${kpis.activeVehicles} Active`}
          icon="🚛"
          color="#3B82F6"
        />
        <StatCard
          title="Total Drivers"
          value={kpis.totalDrivers}
          subtitle={`${kpis.activeDrivers} Active`}
          icon="👨‍✈️"
          color="#10B981"
        />
        <StatCard
          title="Total Orders"
          value={kpis.totalOrders}
          subtitle={`${kpis.openOrders} Open, ${kpis.closeOrders} Closed`}
          icon="📦"
          color="#F59E0B"
        />
        <StatCard
          title="Closed Orders"
          value={kpis.closeOrders}
          subtitle={`${kpis.totalOrders > 0 ? Math.round((kpis.closeOrders / kpis.totalOrders) * 100) : 0}% completion rate`}
          icon="✅"
          color="#10B981"
        />
        <StatCard
          title="Total Bills"
          value={kpis.totalBills}
          subtitle={`${kpis.unpaidBills} Unpaid, ${kpis.paidBills} Paid`}
          icon="💰"
          color="#8B5CF6"
        />
        <StatCard
          title="Total Revenue"
          value={`Rp ${kpis.totalRevenue.toLocaleString('id-ID')}`}
          subtitle={`Rp ${kpis.pendingRevenue.toLocaleString('id-ID')} Pending`}
          icon="💳"
          color="#EF4444"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Card title="Recent Delivery Orders">
          {recentOrders.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
              No recent orders
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentOrders.map(order => (
                <div key={order.id} style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{order.doNo || 'N/A'}</strong>
                      <p style={{ margin: '4px 0', fontSize: '12px' }}>{order.customerName || 'N/A'}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString('id-ID') : 'N/A'}
                      </p>
                    </div>
                    <span className={`status-badge status-${(order.status || '').toLowerCase().replace(' ', '-')}`}>
                      {order.status || 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Recent Bills">
          {recentBills.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
              No recent bills
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {recentBills.map(bill => (
                <div key={bill.id} style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{bill.billNo || 'N/A'}</strong>
                      <p style={{ margin: '4px 0', fontSize: '12px' }}>{bill.customerName || 'N/A'}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Rp {(bill.total || 0).toLocaleString('id-ID')} | Due: {bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('id-ID') : 'N/A'}
                      </p>
                    </div>
                    <span className={`status-badge status-${(bill.status || '').toLowerCase()}`}>
                      {bill.status || 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TruckingDashboard;
