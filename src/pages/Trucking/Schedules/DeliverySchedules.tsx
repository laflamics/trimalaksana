import { useState, useEffect, useMemo } from 'react';
import Card from '../../../components/Card';
import Table from '../../../components/Table';
import Button from '../../../components/Button';
import { storageService } from '../../../services/storage';
import '../../../styles/common.css';

interface DeliverySchedule {
  id: string;
  doNo: string;
  customerName: string;
  scheduledDate: string;
  scheduledTime: string;
  vehicleNo: string;
  driverName: string;
  routeName: string;
  status: string;
  priority: 'High' | 'Medium' | 'Low';
}

const DeliverySchedules = () => {
  const [schedules, setSchedules] = useState<DeliverySchedule[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSchedules();
    const interval = setInterval(loadSchedules, 10000); // Refresh setiap 10 detik
    return () => clearInterval(interval);
  }, []);

  const loadSchedules = async () => {
    const orders = await storageService.get<any[]>('trucking_delivery_orders') || [];
    const plans = await storageService.get<any[]>('trucking_route_plans') || [];
    
    const schedulesData: DeliverySchedule[] = [];
    
    // Generate schedules dari delivery orders
    orders.forEach(order => {
      if (order.scheduledDate) {
        schedulesData.push({
          id: order.id,
          doNo: order.doNo,
          customerName: order.customerName || '',
          scheduledDate: order.scheduledDate,
          scheduledTime: order.scheduledTime || '09:00',
          vehicleNo: order.vehicleNo || 'TBD',
          driverName: order.driverName || 'TBD',
          routeName: order.routeName || 'TBD',
          status: order.status,
          priority: order.priority || 'Medium',
        });
      }
    });

    // Generate schedules dari route plans
    plans.forEach(plan => {
      if (plan.doNumbers && plan.doNumbers.length > 0) {
        plan.doNumbers.forEach((doNo: string) => {
          const order = orders.find(o => o.doNo === doNo);
          if (order && !schedulesData.find(s => s.doNo === doNo)) {
            schedulesData.push({
              id: `${plan.id}-${doNo}`,
              doNo: doNo,
              customerName: order.customerName || '',
              scheduledDate: plan.planDate,
              scheduledTime: plan.estimatedDeparture ? new Date(plan.estimatedDeparture).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '09:00',
              vehicleNo: plan.vehicleNo || 'TBD',
              driverName: plan.driverName || 'TBD',
              routeName: plan.routeName || 'TBD',
              status: plan.status,
              priority: 'Medium',
            });
          }
        });
      }
    });

    setSchedules(schedulesData.sort((a, b) => {
      const dateA = new Date(`${a.scheduledDate} ${a.scheduledTime}`);
      const dateB = new Date(`${b.scheduledDate} ${b.scheduledTime}`);
      return dateA.getTime() - dateB.getTime();
    }));
  };

  const filteredSchedules = useMemo(() => {
    return (schedules || []).filter(schedule => {
      if (!schedule) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (schedule.doNo || '').toLowerCase().includes(query) ||
        (schedule.customerName || '').toLowerCase().includes(query) ||
        (schedule.vehicleNo || '').toLowerCase().includes(query) ||
        (schedule.driverName || '').toLowerCase().includes(query) ||
        (schedule.status || '').toLowerCase().includes(query)
      );
    });
  }, [schedules, searchQuery]);

  const columns = [
    { key: 'doNo', header: 'DO No' },
    { key: 'customerName', header: 'Customer' },
    { key: 'scheduledDate', header: 'Scheduled Date' },
    { key: 'scheduledTime', header: 'Scheduled Time' },
    { key: 'vehicleNo', header: 'Vehicle' },
    { key: 'driverName', header: 'Driver' },
    { key: 'routeName', header: 'Route' },
    {
      key: 'priority',
      header: 'Priority',
      render: (item: DeliverySchedule) => (
        <span className={`status-badge status-${item.priority?.toLowerCase()}`}>
          {item.priority}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: DeliverySchedule) => (
        <span className={`status-badge status-${item.status?.toLowerCase().replace(' ', '-')}`}>
          {item.status}
        </span>
      ),
    },
  ];

  const todaySchedules = filteredSchedules.filter(s => {
    const today = new Date().toISOString().split('T')[0];
    return s.scheduledDate === today;
  });

  const upcomingSchedules = filteredSchedules.filter(s => {
    const today = new Date();
    const scheduleDate = new Date(`${s.scheduledDate} ${s.scheduledTime}`);
    return scheduleDate > today;
  });

  return (
    <div>
      <div className="page-header">
        <h1>Delivery Schedules</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Auto-refresh every 10 seconds
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <Card title={`Today's Deliveries (${todaySchedules.length})`}>
          {todaySchedules.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
              No deliveries scheduled for today
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {todaySchedules.slice(0, 5).map(schedule => (
                <div key={schedule.id} style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{schedule.doNo}</strong>
                      <p style={{ margin: '4px 0', fontSize: '12px' }}>{schedule.customerName}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {schedule.scheduledTime} | {schedule.vehicleNo} | {schedule.driverName}
                      </p>
                    </div>
                    <span className={`status-badge status-${schedule.status?.toLowerCase().replace(' ', '-')}`}>
                      {schedule.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title={`Upcoming Deliveries (${upcomingSchedules.length})`}>
          {upcomingSchedules.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>
              No upcoming deliveries
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {upcomingSchedules.slice(0, 5).map(schedule => (
                <div key={schedule.id} style={{ padding: '12px', border: '1px solid var(--border)', borderRadius: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong>{schedule.doNo}</strong>
                      <p style={{ margin: '4px 0', fontSize: '12px' }}>{schedule.customerName}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {schedule.scheduledDate} {schedule.scheduledTime} | {schedule.vehicleNo}
                      </p>
                    </div>
                    <span className={`status-badge status-${schedule.status?.toLowerCase().replace(' ', '-')}`}>
                      {schedule.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by DO No, Customer, Vehicle, Driver, Status..."
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'inherit',
            }}
          />
        </div>
        <Table columns={columns} data={filteredSchedules} emptyMessage={searchQuery ? "No schedules found matching your search" : "No delivery schedules"} />
      </Card>
    </div>
  );
};

export default DeliverySchedules;


