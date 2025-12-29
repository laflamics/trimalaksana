import { useState, useEffect } from 'react';
import Card from '../../../components/Card';
import Button from '../../../components/Button';
import { storageService } from '../../../services/storage';
import '../../../styles/common.css';

interface VehicleLocation {
  vehicleId: string;
  vehicleNo: string;
  driverName: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  lastUpdate: string;
  status: string;
}

const Realtime = () => {
  const [vehicles, setVehicles] = useState<VehicleLocation[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleLocation | null>(null);

  useEffect(() => {
    loadVehicles();
    const interval = setInterval(loadVehicles, 3000); // Refresh setiap 3 detik
    return () => clearInterval(interval);
  }, []);

  const loadVehicles = async () => {
    const orders = await storageService.get<any[]>('tracking_delivery_orders') || [];
    const vehiclesData: VehicleLocation[] = orders
      .filter(o => o.status === 'In Transit' && o.vehicleId)
      .map(o => ({
        vehicleId: o.vehicleId,
        vehicleNo: o.vehicleNo || 'Unknown',
        driverName: o.driverName || 'Unknown',
        latitude: o.latitude || -6.2088 + (Math.random() - 0.5) * 0.1, // Simulasi lokasi Jakarta
        longitude: o.longitude || 106.8456 + (Math.random() - 0.5) * 0.1,
        speed: o.speed || Math.floor(Math.random() * 80) + 20,
        heading: o.heading || Math.floor(Math.random() * 360),
        lastUpdate: o.lastUpdate || new Date().toISOString(),
        status: o.status,
      }));
    setVehicles(vehiclesData);
  };

  const openMap = (vehicle: VehicleLocation) => {
    window.open(`https://www.google.com/maps?q=${vehicle.latitude},${vehicle.longitude}`, '_blank');
  };

  return (
    <div>
      <div className="page-header">
        <h1>Real-time Location</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Auto-refresh every 3 seconds
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <Card title="Active Vehicles">
          {vehicles.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>
              No vehicles in transit
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {vehicles.map((vehicle, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '16px',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: selectedVehicle?.vehicleId === vehicle.vehicleId ? 'var(--bg-tertiary)' : 'var(--bg-primary)',
                  }}
                  onClick={() => setSelectedVehicle(vehicle)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, marginBottom: '4px' }}>{vehicle.vehicleNo}</h3>
                      <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Driver: {vehicle.driverName}
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Speed: {vehicle.speed} km/h | Heading: {vehicle.heading}°
                      </p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                        Last update: {new Date(vehicle.lastUpdate).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <Button variant="primary" onClick={() => openMap(vehicle)}>
                      View Map
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Vehicle Details">
          {selectedVehicle ? (
            <div>
              <h3>{selectedVehicle.vehicleNo}</h3>
              <div style={{ marginTop: '16px' }}>
                <p><strong>Driver:</strong> {selectedVehicle.driverName}</p>
                <p><strong>Status:</strong> {selectedVehicle.status}</p>
                <p><strong>Speed:</strong> {selectedVehicle.speed} km/h</p>
                <p><strong>Heading:</strong> {selectedVehicle.heading}°</p>
                <p><strong>Coordinates:</strong> {selectedVehicle.latitude.toFixed(6)}, {selectedVehicle.longitude.toFixed(6)}</p>
                <p><strong>Last Update:</strong> {new Date(selectedVehicle.lastUpdate).toLocaleString('id-ID')}</p>
              </div>
              <div style={{ marginTop: '16px' }}>
                <Button variant="primary" onClick={() => openMap(selectedVehicle)}>
                  Open in Google Maps
                </Button>
              </div>
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px' }}>
              Select a vehicle to view details
            </p>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Realtime;


