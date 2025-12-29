import Card from '../components/Card';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="page-subtitle">Overview sistem packaging ERP</p>
      </div>

      <div className="dashboard-grid">
        <Card title="Sales Orders" className="stat-card">
          <div className="stat-value">0</div>
          <div className="stat-label">Total SO</div>
        </Card>

        <Card title="Production" className="stat-card">
          <div className="stat-value">0</div>
          <div className="stat-label">SPK Aktif</div>
        </Card>

        <Card title="Inventory" className="stat-card">
          <div className="stat-value">0</div>
          <div className="stat-label">Material Tersedia</div>
        </Card>

        <Card title="Quality" className="stat-card">
          <div className="stat-value">0%</div>
          <div className="stat-label">Pass Rate</div>
        </Card>
      </div>

      <Card title="Recent Activity" className="mt-4">
        <p style={{ color: 'var(--text-secondary)' }}>No recent activity</p>
      </Card>
    </div>
  );
};

export default Dashboard;

