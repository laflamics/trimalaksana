import { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';
import Input from './Input';
import './ScheduleDialog.css';

interface Batch {
  id: string;
  batchNo: string;
  qty: number;
  startDate: string;
  endDate: string;
}

interface ScheduleDialogProps {
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
  } | null;
  onClose: () => void;
  onSave: (data: {
    startDate?: string;
    endDate?: string;
    batches?: Batch[];
  }) => void;
}

const ScheduleDialog = ({ item, onClose, onSave }: ScheduleDialogProps) => {
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
    } else {
      // Reset jika item null
      setStartDate('');
      setEndDate('');
      setBatches([]);
    }
  }, [item]);

  if (!item) return null;

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
      // Update existing batch
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
      // Create new batch
      const batchNo = String.fromCharCode(65 + batches.length);
      const newBatch: Batch = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        batchNo: batchNo,
        qty: batchForm.qty,
        startDate: new Date(batchForm.startDate).toISOString(),
        endDate: new Date(batchForm.endDate).toISOString(),
      };
      setBatches([...batches, newBatch]);
    }

    setShowBatchForm(false);
    setEditingBatch(null);
    setBatchForm({ qty: 0, startDate: '', endDate: '' });
  };

  const handleSave = () => {
    onSave({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      batches: batches.length > 0 ? batches : undefined,
    });
    onClose();
  };

  return (
    <div className="schedule-dialog-overlay" onClick={onClose}>
      <div className="schedule-dialog" onClick={(e) => e.stopPropagation()}>
        <Card title={`Schedule - ${item.spkNo}`}>
          <div className="schedule-dialog-content">
            <div className="schedule-info">
              <div className="info-row">
                <span className="info-label">SPK NO:</span>
                <span className="info-value">{item.spkNo}</span>
              </div>
              <div className="info-row">
                <span className="info-label">SO No:</span>
                <span className="info-value">{item.soNo}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Product:</span>
                <span className="info-value">{item.product}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Qty:</span>
                <span className="info-value">{item.qty}</span>
              </div>
            </div>

            <div className="schedule-form">
              <Input
                label="Schedule Mulai Produksi"
                type="date"
                value={startDate}
                onChange={setStartDate}
              />
              <Input
                label="Schedule Selesai Produksi"
                type="date"
                value={endDate}
                onChange={setEndDate}
              />
            </div>

            <div className="progress-info">
              <h4 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Progress Info</h4>
              <div className="info-row">
                <span className="info-label">Target:</span>
                <span className="info-value">{item.target}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Progress:</span>
                <span className="info-value">
                  {(() => {
                    const progress = item.progress || 0;
                    const target = item.target || 0;
                    const progressText = `${progress}/${target}`;
                    
                    // Tentukan warna berdasarkan kondisi
                    let color = '#d32f2f'; // Merah default (kurang dari target)
                    if (progress === target && target > 0) {
                      color = '#2e7d32'; // Hijau (sama dengan target)
                    } else if (progress > target) {
                      color = '#f57c00'; // Kuning (lebih dari target)
                    }
                    
                    return (
                      <strong style={{ color, fontSize: '14px' }}>
                        {progressText}
                      </strong>
                    );
                  })()}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Remaining:</span>
                <span 
                  className="info-value"
                  style={{
                    color: item.remaining > 0 ? '#d32f2f' : item.remaining === 0 ? '#388e3c' : 'var(--text-primary)',
                    fontWeight: item.remaining === 0 ? '600' : 'normal'
                  }}
                >
                  {item.remaining > 0 ? item.remaining : item.remaining === 0 ? 'Selesai' : item.remaining}
                </span>
              </div>
            </div>

            {/* Batch Management Section */}
            <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Batch Management</h4>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Total Qty: <strong style={{ color: 'var(--text-primary)' }}>{item.qty}</strong> | 
                  Batch Qty: <strong style={{ color: totalBatchQty === item.qty ? '#2e7d32' : '#d32f2f' }}>
                    {totalBatchQty}
                  </strong> | 
                  Remaining: <strong style={{ color: remainingQty > 0 ? '#d32f2f' : '#2e7d32' }}>
                    {remainingQty}
                  </strong>
                </div>
              </div>

              {batches.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-color)' }}>
                        <th style={{ padding: '8px', textAlign: 'left' }}>Batch</th>
                        <th style={{ padding: '8px', textAlign: 'right' }}>Qty</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Start Date</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>End Date</th>
                        <th style={{ padding: '8px', textAlign: 'center' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {batches.map((batch) => (
                        <tr key={batch.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px', fontWeight: 'bold' }}>Batch {batch.batchNo}</td>
                          <td style={{ padding: '8px', textAlign: 'right' }}>{batch.qty}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {new Date(batch.startDate).toLocaleDateString('id-ID')}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {new Date(batch.endDate).toLocaleDateString('id-ID')}
                          </td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            <button
                              onClick={() => handleEditBatch(batch)}
                              style={{
                                padding: '4px 8px',
                                marginRight: '4px',
                                backgroundColor: 'var(--primary)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
                              }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteBatch(batch.id)}
                              style={{
                                padding: '4px 8px',
                                backgroundColor: '#d32f2f',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px',
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
                    {editingBatch ? `Edit Batch ${editingBatch.batchNo}` : 'Tambah Batch Baru'}
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
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Max: {remainingQty + (editingBatch?.qty || 0)}
                      </div>
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
                <Button variant="secondary" onClick={handleAddBatch} style={{ width: '100%' }}>
                  {batches.length === 0 ? '+ Tambah Batch Pertama' : '+ Tambah Batch Lagi'}
                </Button>
              )}
            </div>

            <div className="schedule-dialog-actions">
              <Button variant="primary" onClick={handleSave}>
                Simpan Schedule
              </Button>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </Card>
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

export default ScheduleDialog;

