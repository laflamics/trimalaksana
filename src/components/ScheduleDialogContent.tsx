import { useState, useEffect } from 'react';
import Card from '../components/Card';
import Button from './Button';
import Input from './Input';

interface Batch {
  id: string;
  batchNo: string;
  qty: number;
  startDate: string;
  endDate: string;
}

interface ScheduleDialogContentProps {
  item: {
    spkNo: string;
    soNo: string;
    product: string;
    qty: number;
    target: number;
    progress: number;
    remaining: number;
    scheduleStartDate?: string;
    scheduleEndDate?: string;
    scheduleDate?: string;
    batches?: Batch[];
  };
  onSave: (data: {
    startDate?: string;
    endDate?: string;
    batches?: Batch[];
  }) => void;
}

const ScheduleDialogContent = ({ item, onSave }: ScheduleDialogContentProps) => {
  const [startDate, setStartDate] = useState('');
  // Custom Dialog state
  const [dialogState, setDialogState] = useState<{
    show: boolean;
    type: 'alert' | 'confirm' | null;
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    type: null,
    title: '',
    message: '',
  });

  // Helper functions untuk dialog
  const showAlert = (message: string, title: string = 'Information') => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'alert',
      title,
      message,
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void, title: string = 'Confirmation') => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
      onCancel,
    });
  };

  const closeDialog = () => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
    setDialogState({
      show: false,
      type: null,
      title: '',
      message: '',
    });
  };

  const [endDate, setEndDate] = useState('');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [batchForm, setBatchForm] = useState({
    qty: 0,
    startDate: '',
    endDate: '',
  });

  // Auto-fill dates dari SPK jika ada
  useEffect(() => {
    if (item) {
      if (item.scheduleStartDate && typeof item.scheduleStartDate === 'string') {
        setStartDate(item.scheduleStartDate.split('T')[0]);
      } else {
        setStartDate('');
      }
      if (item.scheduleEndDate && typeof item.scheduleEndDate === 'string') {
        setEndDate(item.scheduleEndDate.split('T')[0]);
      } else {
        setEndDate('');
      }
      if (item.batches && item.batches.length > 0) {
        setBatches(item.batches);
      } else {
        setBatches([]);
      }
    }
  }, [item]);

  const totalBatchQty = batches.reduce((sum, b) => sum + b.qty, 0);
  const remainingQty = item.qty - totalBatchQty;

  const handleAddBatch = () => {
    setEditingBatch(null);
    setBatchForm({
      qty: remainingQty > 0 ? remainingQty : 0,
      startDate: startDate || '',
      endDate: endDate || '',
    });
    setShowBatchForm(true);
  };

  const handleEditBatch = (batch: Batch) => {
    setEditingBatch(batch);
    setBatchForm({
      qty: batch.qty,
      startDate: batch.startDate && typeof batch.startDate === 'string' ? batch.startDate.split('T')[0] : '',
      endDate: batch.endDate && typeof batch.endDate === 'string' ? batch.endDate.split('T')[0] : '',
    });
    setShowBatchForm(true);
  };

  const handleDeleteBatch = (batchId: string) => {
    showConfirm(
      'Yakin hapus batch ini?',
      () => {
        setBatches(batches.filter(b => b.id !== batchId));
      },
      undefined,
      'Confirm Delete'
    );
  };

  const handleSaveBatch = () => {
    if (!batchForm.qty || batchForm.qty <= 0) {
      showAlert('Qty batch harus lebih dari 0', 'Information');
      return;
    }
    if (!batchForm.startDate || !batchForm.endDate) {
      showAlert('Start date dan End date batch wajib diisi', 'Information');
      return;
    }
    if (new Date(batchForm.startDate) > new Date(batchForm.endDate)) {
      showAlert('Start date tidak boleh lebih besar dari End date', 'Information');
      return;
    }

    const totalQty = batches.reduce((sum, b) => 
      b.id === editingBatch?.id ? sum : sum + b.qty, 0
    ) + batchForm.qty;

    if (totalQty > item.qty) {
      showAlert(`Total qty batch (${totalQty}) tidak boleh melebihi qty SPK (${item.qty})`, 'Information');
      return;
    }

    if (editingBatch) {
      setBatches(batches.map(b => 
        b.id === editingBatch.id 
          ? {
              ...b,
              qty: batchForm.qty,
              startDate: new Date(batchForm.startDate).toISOString(),
              endDate: new Date(batchForm.endDate).toISOString(),
            }
          : b
      ));
    } else {
      const batchNo = String.fromCharCode(65 + batches.length);
      setBatches([...batches, {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        batchNo: batchNo,
        qty: batchForm.qty,
        startDate: new Date(batchForm.startDate).toISOString(),
        endDate: new Date(batchForm.endDate).toISOString(),
      }]);
    }

    setShowBatchForm(false);
    setEditingBatch(null);
    setBatchForm({ qty: 0, startDate: '', endDate: '' });
  };

  const handleSave = () => {
    if (!startDate || !endDate) {
      showAlert('Schedule start date dan end date wajib diisi', 'Information');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      showAlert('Start date tidak boleh lebih besar dari End date', 'Information');
      return;
    }

    onSave({
      startDate,
      endDate,
      batches,
    });
  };

  return (
    <div style={{ padding: '16px' }}>
      <h3 style={{ margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
        Production Schedule - {item.spkNo}
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
            Schedule Mulai Produksi
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
            Schedule Selesai Produksi
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 8px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>

      <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ color: 'var(--text-primary)' }}>Target: <strong>{item.target}</strong></span>
          <span style={{ color: 'var(--text-primary)' }}>Progress: <strong>{item.progress}</strong></span>
          <span style={{ color: item.remaining > 0 ? '#d32f2f' : '#2e7d32' }}>
            Remaining: <strong>{item.remaining > 0 ? item.remaining : 'Selesai'}</strong>
          </span>
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          Batch Qty: {totalBatchQty} | Remaining: {remainingQty}
        </div>
      </div>

      {batches.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ marginBottom: '8px', color: 'var(--text-primary)' }}>Production Batches</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '6px', textAlign: 'left' }}>Batch</th>
                <th style={{ padding: '6px', textAlign: 'right' }}>Qty</th>
                <th style={{ padding: '6px', textAlign: 'center' }}>Start Date</th>
                <th style={{ padding: '6px', textAlign: 'center' }}>End Date</th>
                <th style={{ padding: '6px', textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch) => (
                <tr key={batch.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '6px', fontWeight: 'bold' }}>Batch {batch.batchNo}</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>{batch.qty}</td>
                  <td style={{ padding: '6px', textAlign: 'center' }}>
                    {new Date(batch.startDate).toLocaleDateString('id-ID')}
                  </td>
                  <td style={{ padding: '6px', textAlign: 'center' }}>
                    {new Date(batch.endDate).toLocaleDateString('id-ID')}
                  </td>
                  <td style={{ padding: '6px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleEditBatch(batch)}
                      style={{
                        padding: '3px 6px',
                        marginRight: '4px',
                        backgroundColor: 'var(--primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteBatch(batch.id)}
                      style={{
                        padding: '3px 6px',
                        backgroundColor: '#d32f2f',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                    >
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showBatchForm && (
        <div style={{ padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', marginBottom: '16px' }}>
          <h5 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--text-primary)' }}>
            {editingBatch ? `Edit Production Batch ${editingBatch.batchNo}` : 'Tambah Production Batch Baru'}
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                Qty *
              </label>
              <input
                type="number"
                value={batchForm.qty}
                onChange={(e) => setBatchForm({ ...batchForm, qty: Number(e.target.value) })}
                min="1"
                max={remainingQty + (editingBatch?.qty || 0)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                Start Date *
              </label>
              <input
                type="date"
                value={batchForm.startDate}
                onChange={(e) => setBatchForm({ ...batchForm, startDate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                End Date *
              </label>
              <input
                type="date"
                value={batchForm.endDate}
                onChange={(e) => setBatchForm({ ...batchForm, endDate: e.target.value })}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button variant="primary" onClick={handleSaveBatch} style={{ fontSize: '12px', padding: '6px 12px' }}>
              {editingBatch ? 'Update Batch' : 'Tambah Batch'}
            </Button>
            <Button variant="secondary" onClick={() => {
              setShowBatchForm(false);
              setEditingBatch(null);
              setBatchForm({ qty: 0, startDate: '', endDate: '' });
            }} style={{ fontSize: '12px', padding: '6px 12px' }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!showBatchForm && (
        <Button variant="primary" onClick={handleAddBatch} style={{ fontSize: '12px', padding: '6px 12px', marginBottom: '16px' }}>
          + Tambah Production Batch
        </Button>
      )}

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
        <Button variant="primary" onClick={handleSave} style={{ fontSize: '12px', padding: '6px 12px' }}>
          Simpan Production Schedule
        </Button>
      </div>
      {/* Custom Dialog */}
      {dialogState.show && (
        <div className="dialog-overlay" onClick={closeDialog}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>{dialogState.title}</h2>
                <Button variant="secondary" onClick={closeDialog} style={{ padding: '6px 12px' }}>✕</Button>
              </div>
              <p style={{ marginBottom: '20px', whiteSpace: 'pre-wrap' }}>{dialogState.message}</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                {dialogState.type === 'confirm' && (
                  <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
                )}
                <Button
                  variant="primary"
                  onClick={() => {
                    if (dialogState.onConfirm) dialogState.onConfirm();
                    closeDialog();
                  }}
                >
                  {dialogState.type === 'confirm' ? 'Confirm' : 'OK'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

    </div>
  );
};

export default ScheduleDialogContent;

