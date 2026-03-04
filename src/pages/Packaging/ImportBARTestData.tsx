import React, { useState } from 'react';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { storageService, StorageKeys } from '../../services/storage';
import '../../styles/common.css';

/**
 * Import BAR Test Data
 * This page allows importing sample data for testing the Business Activity Report
 */
const ImportBARTestData: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const importTestData = async () => {
    try {
      setLoading(true);
      setMessage(null);

      // Get existing sales orders
      const salesOrdersRaw = await storageService.get(StorageKeys.PACKAGING.SALES_ORDERS);
      const salesOrders = Array.isArray(salesOrdersRaw) ? salesOrdersRaw : [];

      if (salesOrders.length === 0) {
        setMessage({ type: 'error', text: 'No sales orders found. Please create sales orders first.' });
        setLoading(false);
        return;
      }

      console.log('[BAR Import] Found sales orders:', salesOrders.length);

      // Create SPK data from first 5 sales orders
      const spks = salesOrders.slice(0, 5).map((so: any, idx: number) => ({
        id: `spk-${idx}`,
        spkNo: `SPK-${String(idx + 1).padStart(5, '0')}`,
        soNo: so.soNo,
        product: so.items?.[0]?.productName || 'Product',
        qty: so.items?.[0]?.qty || 100,
        unit: so.items?.[0]?.unit || 'PC',
        status: ['OPEN', 'CLOSE'][Math.floor(Math.random() * 2)],
        created: so.created,
        createdAt: so.created,
      }));

      // Create production data
      const productions = spks.slice(0, 3).map((spk: any, idx: number) => ({
        id: `prod-${idx}`,
        productionNo: `PROD-${String(idx + 1).padStart(5, '0')}`,
        spkNo: spk.spkNo,
        soNo: spk.soNo,
        status: ['OPEN', 'CLOSE'][Math.floor(Math.random() * 2)],
        producedQty: spk.qty,
        created: new Date(new Date(spk.created).getTime() + 86400000).toISOString(),
      }));

      // Create QC data
      const qcs = productions.slice(0, 2).map((prod: any, idx: number) => ({
        id: `qc-${idx}`,
        qcNo: `QC-${String(idx + 1).padStart(5, '0')}`,
        spkNo: prod.spkNo,
        status: ['PASS', 'FAIL'][Math.floor(Math.random() * 2)],
        qcResult: ['PASS', 'FAIL'][Math.floor(Math.random() * 2)],
        created: new Date(new Date(prod.created).getTime() + 86400000).toISOString(),
      }));

      // Create delivery data
      const deliveries = qcs.slice(0, 1).map((qc: any, idx: number) => ({
        id: `delivery-${idx}`,
        sjNo: `SJ-${String(idx + 1).padStart(5, '0')}`,
        spkNo: qc.spkNo,
        status: 'DELIVERED',
        deliveryDate: new Date(new Date(qc.created).getTime() + 86400000).toISOString(),
        items: [{ spkNo: qc.spkNo }],
      }));

      console.log('[BAR Import] Generated:', {
        spks: spks.length,
        productions: productions.length,
        qcs: qcs.length,
        deliveries: deliveries.length,
      });

      // Save to storage
      await storageService.set(StorageKeys.PACKAGING.SPK, spks);
      await storageService.set(StorageKeys.PACKAGING.PRODUCTION, productions);
      await storageService.set(StorageKeys.PACKAGING.QC, qcs);
      await storageService.set(StorageKeys.PACKAGING.DELIVERY, deliveries);

      setMessage({
        type: 'success',
        text: `✅ Test data imported successfully!\n\nCreated:\n- ${spks.length} SPKs\n- ${productions.length} Productions\n- ${qcs.length} QCs\n- ${deliveries.length} Deliveries\n\nGo to BAR to see the data.`,
      });

      console.log('[BAR Import] ✅ Data imported successfully');
    } catch (error) {
      console.error('[BAR Import] Error:', error);
      setMessage({
        type: 'error',
        text: `Error importing test data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <Card title="Import BAR Test Data">
        <div style={{ padding: '20px' }}>
          <p>This will create sample SPK, Production, QC, and Delivery records for testing the Business Activity Report.</p>
          <p style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            Note: This requires existing Sales Orders in the system.
          </p>

          <div style={{ marginTop: '20px' }}>
            <Button
              onClick={importTestData}
              disabled={loading}
              variant="primary"
            >
              {loading ? 'Importing...' : 'Import Test Data'}
            </Button>
          </div>

          {message && (
            <div
              style={{
                marginTop: '20px',
                padding: '15px',
                borderRadius: '4px',
                backgroundColor: message.type === 'success' ? '#e8f5e9' : '#ffebee',
                color: message.type === 'success' ? '#2e7d32' : '#c62828',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '12px',
              }}
            >
              {message.text}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ImportBARTestData;
