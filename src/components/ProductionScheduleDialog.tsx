import { useState, useEffect } from 'react';
import Card from './Card';
import Button from './Button';
import { getTheme } from '../utils/theme';
import './ScheduleDialog.css';

interface ProductionBatch {
  id: string;
  batchNo: string;
  qty: number;
  startDate: string;
  endDate: string;
}

interface SPKProduction {
  spkNo: string;
  soNo: string;
  product: string;
  productId: string;
  qty: number;
  target: number;
  progress: number;
  remaining: number;
  scheduleStartDate?: string;
  scheduleEndDate?: string;
  productionBatches: ProductionBatch[];
  overrideQty?: number; // Override qty untuk SPK (jika ada, gunakan ini sebagai qty)
}

interface ProductionScheduleDialogProps {
  item: {
    soNo: string;
    customer: string;
    spks: SPKProduction[];
  } | null;
  onClose: () => void;
  onSave: (data: {
    spkProductions: { spkNo: string; startDate?: string; endDate?: string; batches: ProductionBatch[] }[];
  }) => void;
  inline?: boolean; // Jika true, render tanpa overlay (untuk digunakan di GeneralScheduleDialog)
}

const ProductionScheduleDialog = ({ item, onClose, onSave, inline = false }: ProductionScheduleDialogProps) => {
  const [spkProductions, setSpkProductions] = useState<SPKProduction[]>([]);
  const [selectedSPKs, setSelectedSPKs] = useState<string[]>([]); // Multiple selection
  const [showBatchForm, setShowBatchForm] = useState(false);
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

  const [editingBatch, setEditingBatch] = useState<ProductionBatch | null>(null);
  const [batchForm, setBatchForm] = useState({
    qty: 0,
    startDate: '',
    endDate: '',
  });
  const [multipleBatchForms, setMultipleBatchForms] = useState<{ [spkNo: string]: { qty: number; startDate: string; endDate: string } }>({});
  const [useSameDateForAll, setUseSameDateForAll] = useState(true); // Mode input tanggal: true = sama untuk semua, false = per product
  const [commonStartDate, setCommonStartDate] = useState(''); // Start date untuk semua product (jika useSameDateForAll = true)
  const [commonEndDate, setCommonEndDate] = useState(''); // End date untuk semua product (jika useSameDateForAll = true)
  const [startDate, setStartDate] = useState(''); // Global start date untuk schedule
  const [endDate, setEndDate] = useState(''); // Global end date untuk schedule

  useEffect(() => {
    if (item && item.spks) {
      const spksWithBatches = item.spks.map((spk: SPKProduction) => ({
        ...spk,
        productionBatches: spk.productionBatches || [],
      }));
      setSpkProductions(spksWithBatches);
      if (item.spks.length > 0 && selectedSPKs.length === 0) {
        setSelectedSPKs([item.spks[0].spkNo]);
      }
      // Set global dates dari SPK yang punya scheduleStartDate/scheduleEndDate (dari notifikasi SO)
      // Cari SPK yang punya schedule dates dari notifikasi
      const spkWithSchedule = item.spks.find((spk: SPKProduction) => spk.scheduleStartDate || spk.scheduleEndDate);
      if (spkWithSchedule) {
        if (spkWithSchedule.scheduleStartDate) {
          setStartDate(spkWithSchedule.scheduleStartDate.split('T')[0]);
        }
        if (spkWithSchedule.scheduleEndDate) {
          setEndDate(spkWithSchedule.scheduleEndDate.split('T')[0]);
        }
      } else if (item.spks.length > 0) {
        // Fallback: gunakan dari SPK pertama jika ada
        if (item.spks[0].scheduleStartDate) {
          setStartDate(item.spks[0].scheduleStartDate.split('T')[0]);
        }
        if (item.spks[0].scheduleEndDate) {
          setEndDate(item.spks[0].scheduleEndDate.split('T')[0]);
        }
      }
    } else {
      setSpkProductions([]);
      setSelectedSPKs([]);
    }
  }, [item]);

  if (!item) return null;

  const handleSelectAll = () => {
    if (selectedSPKs.length === spkProductions.length) {
      // Deselect all
      setSelectedSPKs([]);
    } else {
      // Select all
      setSelectedSPKs(spkProductions.map(spk => spk.spkNo));
    }
  };

  const handleToggleSPK = (spkNo: string) => {
    if (selectedSPKs.includes(spkNo)) {
      setSelectedSPKs(selectedSPKs.filter(s => s !== spkNo));
    } else {
      setSelectedSPKs([...selectedSPKs, spkNo]);
    }
  };

  // Calculate totals for selected SPKs
  const selectedSPKObjects = spkProductions.filter(spk => selectedSPKs.includes(spk.spkNo));
  // IMPORTANT: Product qty HARUS pakai qty asli dari SPK/SO, BUKAN dari material override
  const totalQtyAll = selectedSPKObjects.reduce((sum, spk) => sum + (spk.qty || 0), 0);
  const totalBatchQtyAll = selectedSPKObjects.reduce((sum, spk) => 
    sum + spk.productionBatches.reduce((bSum, b) => bSum + b.qty, 0), 0
  );
  const remainingQtyAll = totalQtyAll - totalBatchQtyAll;

  // For single mode, use first selected SPK
  const currentSPK = selectedSPKs.length > 0 
    ? spkProductions.find(spk => spk.spkNo === selectedSPKs[0])
    : null;
  const currentProductionBatches = currentSPK?.productionBatches || [];
  const totalBatchQty = currentProductionBatches.reduce((sum, b) => sum + b.qty, 0);
  // IMPORTANT: Product qty HARUS pakai qty asli dari SPK/SO, BUKAN dari material override
  // Material override hanya untuk material requirement, bukan untuk product qty
  const currentSPKQty = currentSPK ? (currentSPK.qty || 0) : 0; // Pakai qty asli dari SPK (dari SO), bukan dari override
  const remainingQty = currentSPKQty - totalBatchQty;

  const handleAddBatch = () => {
    if (selectedSPKs.length === 0) {
      showAlert('Pilih minimal 1 product terlebih dahulu', 'Information');
      return;
    }
    
    if (selectedSPKs.length > 1) {
      // Multiple selection - initialize forms untuk setiap product
      const forms: { [spkNo: string]: { qty: number; startDate: string; endDate: string } } = {};
      selectedSPKs.forEach(spkNo => {
        const spk = spkProductions.find(s => s.spkNo === spkNo);
        if (spk) {
          const spkBatchQty = spk.productionBatches.reduce((sum, b) => sum + b.qty, 0);
          // IMPORTANT: Product qty HARUS pakai qty asli dari SPK/SO, BUKAN dari material override
          // Material override hanya untuk material requirement, bukan untuk product qty
          const spkQtyDisplay = spk.qty || 0; // Pakai qty asli dari SPK (dari SO), bukan dari override
          const spkRemaining = spkQtyDisplay - spkBatchQty;
          // Default batch dates dari global schedule dates
          const defaultStartDate = startDate || '';
          const defaultEndDate = endDate || '';
          
          forms[spkNo] = {
            qty: spkRemaining > 0 ? spkRemaining : 0,
            startDate: defaultStartDate,
            endDate: defaultEndDate,
          };
        }
      });
      setMultipleBatchForms(forms);
      setShowBatchForm(true);
    } else {
      // Single selection - form seperti biasa
      if (!currentSPK) return;
      
      setEditingBatch(null);
      // Default batch dates dari global schedule dates
      setBatchForm({
        qty: remainingQty > 0 ? remainingQty : 0,
        startDate: startDate || '',
        endDate: endDate || '',
      });
      setShowBatchForm(true);
    }
  };

  const handleSaveMultipleBatches = () => {
    // Jika mode sama untuk semua, validasi common dates
    if (useSameDateForAll) {
      if (!commonStartDate || !commonEndDate) {
        showAlert('Start date dan End date wajib diisi', 'Information');
        return;
      }
      if (new Date(commonStartDate) > new Date(commonEndDate)) {
        showAlert('Start date tidak boleh lebih besar dari End date', 'Information');
        return;
      }
      // Set dates untuk semua forms dari common dates
      const updatedForms: { [spkNo: string]: { qty: number; startDate: string; endDate: string } } = {};
      selectedSPKs.forEach(spkNo => {
        const form = multipleBatchForms[spkNo];
        if (form) {
          updatedForms[spkNo] = {
            ...form,
            startDate: commonStartDate,
            endDate: commonEndDate,
          };
        }
      });
      setMultipleBatchForms(updatedForms);
    }

    // Validate semua forms
    for (const spkNo of selectedSPKs) {
      const form = multipleBatchForms[spkNo];
      if (!form) {
        showAlert(`Form untuk ${spkNo} tidak ditemukan`, 'Information');
        return;
      }
      const startDate = useSameDateForAll ? commonStartDate : form.startDate;
      const endDate = useSameDateForAll ? commonEndDate : form.endDate;
      if (!startDate || !endDate) {
        const spk = spkProductions.find(s => s.spkNo === spkNo);
        showAlert(`Start date dan End date untuk ${spk?.product || spkNo} wajib diisi`, 'Information');
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        const spk = spkProductions.find(s => s.spkNo === spkNo);
        showAlert(`Start date tidak boleh lebih besar dari End date untuk ${spk?.product || spkNo}`, 'Information');
        return;
      }
      if (!form.qty || form.qty <= 0) {
        const spk = spkProductions.find(s => s.spkNo === spkNo);
        showAlert(`Qty untuk ${spk?.product || spkNo} harus lebih dari 0`, 'Information');
        return;
      }
    }

    // Create batches untuk semua selected SPKs
    const updated = spkProductions.map(spk => {
      if (selectedSPKs.includes(spk.spkNo)) {
        const form = multipleBatchForms[spk.spkNo];
        if (!form) return spk;
        
        const spkBatchQty = spk.productionBatches.reduce((sum, b) => sum + b.qty, 0);
        const totalQty = spkBatchQty + form.qty;
        // IMPORTANT: Product qty HARUS pakai qty asli dari SPK/SO, BUKAN dari material override
        const spkQtyDisplay = spk.qty || 0;
        
        if (totalQty > spkQtyDisplay) {
          showAlert(`Total qty batch (${totalQty}) untuk ${spk.product} tidak boleh melebihi qty SPK (${spkQtyDisplay})`, 'Information');
          return spk;
        }
        
        // Gunakan dates sesuai mode
        const batchStartDate = useSameDateForAll ? commonStartDate : form.startDate;
        const batchEndDate = useSameDateForAll ? commonEndDate : form.endDate;
        
        const batchNo = String.fromCharCode(65 + spk.productionBatches.length);
        const newBatch: ProductionBatch = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + spk.spkNo,
          batchNo: batchNo,
          qty: form.qty,
          startDate: new Date(batchStartDate).toISOString(),
          endDate: new Date(batchEndDate).toISOString(),
        };
        return {
          ...spk,
          productionBatches: [...spk.productionBatches, newBatch],
        };
      }
      return spk;
    });
    
    setSpkProductions(updated);
    setShowBatchForm(false);
    setMultipleBatchForms({});
    setUseSameDateForAll(true);
    setCommonStartDate('');
    setCommonEndDate('');
  };

  const handleEditBatch = (batch: ProductionBatch, spkNo: string) => {
    const spk = spkProductions.find(s => s.spkNo === spkNo);
    if (!spk) return;
    
    setSelectedSPKs([spkNo]);
    setEditingBatch(batch);
    setBatchForm({
      qty: batch.qty,
      startDate: batch.startDate.split('T')[0],
      endDate: batch.endDate.split('T')[0],
    });
    setShowBatchForm(true);
  };

  const handleDeleteBatch = (batchId: string, spkNo: string) => {
    showConfirm(
      'Yakin hapus batch ini?',
      () => {
        const updated = spkProductions.map(spk => {
          if (spk.spkNo === spkNo) {
            return {
              ...spk,
              productionBatches: spk.productionBatches.filter(b => b.id !== batchId),
            };
          }
          return spk;
        });
        setSpkProductions(updated);
      },
      undefined,
      'Confirm Delete'
    );
  };

  const handleSaveBatch = () => {
    if (selectedSPKs.length === 0 || !currentSPK) return;
    
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

    const totalQty = currentProductionBatches.reduce((sum, b) => 
      b.id === editingBatch?.id ? sum : sum + b.qty, 0
    ) + batchForm.qty;

    // IMPORTANT: Product qty HARUS pakai qty asli dari SPK/SO, BUKAN dari material override
    const currentSPKQtyForValidation = currentSPK ? (currentSPK.qty || 0) : 0;
    if (totalQty > currentSPKQtyForValidation) {
      showAlert(`Total qty batch (${totalQty}) tidak boleh melebihi qty SPK (${currentSPKQtyForValidation})`, 'Information');
      return;
    }

    const updated = spkProductions.map(spk => {
      if (spk.spkNo === selectedSPKs[0]) {
        if (editingBatch) {
          return {
            ...spk,
            productionBatches: spk.productionBatches.map(b => 
              b.id === editingBatch.id 
                ? {
                    ...b,
                    qty: batchForm.qty,
                    startDate: new Date(batchForm.startDate).toISOString(),
                    endDate: new Date(batchForm.endDate).toISOString(),
                  }
                : b
            ),
          };
        } else {
          const batchNo = String.fromCharCode(65 + spk.productionBatches.length);
          const newBatch: ProductionBatch = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            batchNo: batchNo,
            qty: batchForm.qty,
            startDate: new Date(batchForm.startDate).toISOString(),
            endDate: new Date(batchForm.endDate).toISOString(),
          };
          return {
            ...spk,
            productionBatches: [...spk.productionBatches, newBatch],
          };
        }
      }
      return spk;
    });

    setSpkProductions(updated);
    setShowBatchForm(false);
    setEditingBatch(null);
    setBatchForm({ qty: 0, startDate: '', endDate: '' });
  };

  const handleSave = () => {
    // Validasi Overall Schedule Dates (dari SO/notifikasi)
    if (!startDate || !endDate) {
      showAlert('Overall Schedule start date dan end date wajib diisi', 'Information');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      showAlert('Overall Schedule start date tidak boleh lebih besar dari end date', 'Information');
      return;
    }

    // Validasi Batch Dates (setiap batch harus punya dates yang valid)
    for (const spk of spkProductions) {
      for (const batch of spk.productionBatches) {
        if (!batch.startDate || !batch.endDate) {
          showAlert(`Batch ${batch.batchNo} untuk ${spk.product} belum punya start date atau end date`, 'Information');
          return;
        }
        const batchStart = new Date(batch.startDate);
        const batchEnd = new Date(batch.endDate);
        if (batchStart > batchEnd) {
          showAlert(`Batch ${batch.batchNo} untuk ${spk.product}: start date tidak boleh lebih besar dari end date`, 'Information');
          return;
        }
      }
    }

    // Save: 
    // - startDate/endDate = Overall Schedule Dates (dari SO/notifikasi) → disimpan ke scheduleStartDate/scheduleEndDate
    // - batch.startDate/batch.endDate = Batch Dates (spesifik per batch) → disimpan ke batch.startDate/batch.endDate
    const spkProductionsData = spkProductions.map(spk => ({
      spkNo: spk.spkNo,
      startDate, // Overall schedule start date (dari SO/notifikasi)
      endDate,   // Overall schedule end date (dari SO/notifikasi)
      batches: spk.productionBatches, // Setiap batch punya startDate dan endDate sendiri
    }));
    
    onSave({
      spkProductions: spkProductionsData,
    });
    // Jangan tutup jika inline mode
    if (!inline) {
      onClose();
    }
  };

  const content = (
    <div style={{ padding: inline ? '0' : '16px' }}>
      {!inline && (
        <div className="schedule-info">
          <div className="info-row">
            <span className="info-label">SO No:</span>
            <span className="info-value">{item.soNo}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Customer:</span>
            <span className="info-value">{item.customer}</span>
          </div>
          <div className="info-row">
            <span className="info-label">Total Products:</span>
            <span className="info-value">{item.spks.length}</span>
          </div>
        </div>
      )}

      {inline && (
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
            <strong>SO No:</strong> {item.soNo} | <strong>Customer:</strong> {item.customer} | <strong>Products:</strong> {item.spks.length}
          </div>
        </div>
      )}

      {/* Global Schedule Dates - Overall schedule dari SO/Notifikasi */}
      <div style={{ marginBottom: '20px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
        <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>📅 Overall Production Schedule Dates</h4>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px', fontStyle: 'italic' }}>
          Ini adalah schedule dates keseluruhan dari SO/Notifikasi. Dates ini akan digunakan sebagai default untuk batch baru, tapi setiap batch bisa punya dates sendiri.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
              Schedule Mulai Produksi *
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
              Schedule Selesai Produksi *
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
      </div>

      {/* Product Selection with Checkboxes */}
      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <label style={{ fontSize: '13px', fontWeight: 500 }}>
            Pilih Product ({selectedSPKs.length} dipilih):
          </label>
          <Button
            variant="secondary"
            onClick={handleSelectAll}
            style={{ fontSize: '11px', padding: '4px 8px' }}
          >
            {selectedSPKs.length === spkProductions.length ? '❌ Deselect All' : '✅ Select All'}
          </Button>
        </div>
        <div style={{ 
          maxHeight: '200px', 
          overflowY: 'auto', 
          border: '1px solid var(--border-color)', 
          borderRadius: '4px',
          padding: '8px',
          backgroundColor: 'var(--bg-secondary)'
        }}>
          {spkProductions.map((spk) => {
            const isSelected = selectedSPKs.includes(spk.spkNo);
            // IMPORTANT: Product qty HARUS pakai qty asli dari SPK/SO, BUKAN dari material override
            const spkQty = spk.qty || 0;
            const spkBatchQty = spk.productionBatches.reduce((sum, b) => sum + b.qty, 0);
            const spkRemaining = spkQty - spkBatchQty;
            const theme = getTheme();
            const selectedTextColor = theme === 'light' ? '#1a1a1a' : '#fff';
            const selectedBgColor = theme === 'light' ? 'rgba(76, 175, 80, 0.2)' : 'var(--primary)';
            
            return (
              <div
                key={spk.spkNo}
                onClick={() => handleToggleSPK(spk.spkNo)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '8px',
                  marginBottom: '4px',
                  backgroundColor: isSelected ? selectedBgColor : 'transparent',
                  color: isSelected ? selectedTextColor : 'var(--text-primary)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  border: `1px solid ${isSelected ? (theme === 'light' ? 'rgba(76, 175, 80, 0.5)' : 'var(--primary)') : 'var(--border-color)'}`,
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggleSPK(spk.spkNo)}
                  onClick={(e) => e.stopPropagation()}
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: isSelected ? selectedTextColor : 'var(--text-primary)' }}>
                    {spk.spkNo} - {spk.product}
                  </div>
                  <div style={{ fontSize: '11px', opacity: 0.8, color: isSelected ? selectedTextColor : 'var(--text-secondary)' }}>
                    Qty: {spkQty} | Batch: {spkBatchQty} | Remaining: {spkRemaining}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {selectedSPKs.length > 1 && (
          <div style={{ marginTop: '12px', padding: '10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', fontSize: '12px', color: 'var(--text-primary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{selectedSPKs.length} products dipilih</strong>
            <br />
            Total Qty: <strong style={{ color: 'var(--text-primary)' }}>{totalQtyAll}</strong> | 
            Batch Qty: <strong style={{ color: 'var(--text-primary)' }}>{totalBatchQtyAll}</strong> | 
            Remaining: <strong style={{ color: 'var(--text-primary)' }}>{remainingQtyAll}</strong>
          </div>
        )}
      </div>

      {/* Production Batch Management - Show for all selected SPKs */}
      {selectedSPKs.length > 0 && (
        <>
          <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>
                Production Batch Management
                {selectedSPKs.length > 1 && ` (${selectedSPKs.length} products)`}
              </h4>
              {selectedSPKs.length === 1 && currentSPK && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Total Qty: <strong style={{ color: 'var(--text-primary)' }}>{currentSPKQty}</strong> | 
                  Batch Qty: <strong style={{ color: totalBatchQty === currentSPKQty ? '#2e7d32' : '#d32f2f' }}>
                    {totalBatchQty}
                  </strong> | 
                  Remaining: <strong style={{ color: remainingQty > 0 ? '#d32f2f' : '#2e7d32' }}>
                    {remainingQty}
                  </strong>
                </div>
              )}
            </div>

            {/* Show batches untuk semua selected SPKs */}
            {selectedSPKObjects.map((spk) => {
              const spkBatches = spk.productionBatches || [];
              const spkTotalBatchQty = spkBatches.reduce((sum, b) => sum + b.qty, 0);
              // IMPORTANT: Product qty HARUS pakai qty asli dari SPK/SO, BUKAN dari material override
              const spkQtyDisplay = spk.qty || 0;
              const spkRemaining = spkQtyDisplay - spkTotalBatchQty;
              
              return (
                <div key={spk.spkNo} style={{ marginBottom: '20px', padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                  <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', color: 'var(--text-primary)' }}>
                    {spk.spkNo} - {spk.product}
                    <span style={{ fontSize: '11px', fontWeight: 'normal', marginLeft: '8px', color: 'var(--text-secondary)' }}>
                      (Qty: {spkQtyDisplay} | Batch: {spkTotalBatchQty} | Remaining: {spkRemaining})
                    </span>
                  </div>
                  
                  {spkBatches.length > 0 && (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '8px' }}>
                      <thead>
                        <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                          <th style={{ padding: '6px', textAlign: 'left', color: 'var(--text-primary)' }}>Batch</th>
                          <th style={{ padding: '6px', textAlign: 'right', color: 'var(--text-primary)' }}>Qty</th>
                          <th style={{ padding: '6px', textAlign: 'center', color: 'var(--text-primary)' }}>Start Date</th>
                          <th style={{ padding: '6px', textAlign: 'center', color: 'var(--text-primary)' }}>End Date</th>
                          <th style={{ padding: '6px', textAlign: 'center', color: 'var(--text-primary)' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spkBatches.map((batch) => (
                          <tr key={batch.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '6px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Batch {batch.batchNo}</td>
                            <td style={{ padding: '6px', textAlign: 'right', color: 'var(--text-primary)' }}>{batch.qty}</td>
                            <td style={{ padding: '6px', textAlign: 'center', color: 'var(--text-primary)' }}>
                              {new Date(batch.startDate).toLocaleDateString('id-ID')}
                            </td>
                            <td style={{ padding: '6px', textAlign: 'center', color: 'var(--text-primary)' }}>
                              {new Date(batch.endDate).toLocaleDateString('id-ID')}
                            </td>
                            <td style={{ padding: '6px', textAlign: 'center' }}>
                              <button
                                onClick={() => handleEditBatch(batch, spk.spkNo)}
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
                                onClick={() => handleDeleteBatch(batch.id, spk.spkNo)}
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
                  )}
                </div>
              );
            })}

            {showBatchForm && selectedSPKs.length === 1 && currentSPK && (
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
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Max: {remainingQty + (editingBatch?.qty || 0)}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                      Batch Start Date *
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
                    {!batchForm.startDate && startDate && (
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Default: {new Date(startDate).toLocaleDateString('id-ID')} (dari Overall Schedule)
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                      Batch End Date *
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
                    {!batchForm.endDate && endDate && (
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        Default: {new Date(endDate).toLocaleDateString('id-ID')} (dari Overall Schedule)
                      </div>
                    )}
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

            {showBatchForm && selectedSPKs.length > 1 && (
              <div style={{ padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', marginBottom: '16px' }}>
                <h5 style={{ marginTop: 0, marginBottom: '8px', color: 'var(--text-primary)' }}>
                  Tambah Production Batch untuk {selectedSPKs.length} Products
                </h5>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px', fontStyle: 'italic' }}>
                  Setiap batch akan punya dates sendiri (bisa berbeda dari Overall Schedule Dates di atas). Dates ini digunakan untuk planning produksi per batch.
                </div>
                
                {/* Mode Selection */}
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    Mode Input Batch Dates:
                  </label>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)' }}>
                      <input
                        type="radio"
                        name="dateMode"
                        checked={useSameDateForAll}
                        onChange={() => {
                          setUseSameDateForAll(true);
                          // Jika common dates belum diisi, gunakan global dates sebagai default
                          if (!commonStartDate && startDate) {
                            setCommonStartDate(startDate);
                          }
                          if (!commonEndDate && endDate) {
                            setCommonEndDate(endDate);
                          }
                          // Update semua forms dengan common dates jika sudah diisi
                          if (commonStartDate && commonEndDate) {
                            const updatedForms: { [spkNo: string]: { qty: number; startDate: string; endDate: string } } = {};
                            selectedSPKs.forEach(spkNo => {
                              const form = multipleBatchForms[spkNo];
                              if (form) {
                                updatedForms[spkNo] = {
                                  ...form,
                                  startDate: commonStartDate,
                                  endDate: commonEndDate,
                                };
                              }
                            });
                            setMultipleBatchForms(updatedForms);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Sama untuk Semua</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)' }}>
                      <input
                        type="radio"
                        name="dateMode"
                        checked={!useSameDateForAll}
                        onChange={() => setUseSameDateForAll(false)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span>Per Product</span>
                    </label>
                  </div>
                  
                  {/* Input tanggal untuk mode "Sama untuk Semua" */}
                  {useSameDateForAll && (
                    <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                          Batch Start Date untuk Semua Products *
                        </label>
                        <input
                          type="date"
                          value={commonStartDate}
                          onChange={(e) => {
                            setCommonStartDate(e.target.value);
                            // Update semua forms dengan tanggal yang sama
                            const updatedForms: { [spkNo: string]: { qty: number; startDate: string; endDate: string } } = {};
                            selectedSPKs.forEach(spkNo => {
                              const form = multipleBatchForms[spkNo];
                              if (form) {
                                updatedForms[spkNo] = {
                                  ...form,
                                  startDate: e.target.value,
                                };
                              }
                            });
                            setMultipleBatchForms(updatedForms);
                          }}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                          }}
                        />
                        {!commonStartDate && startDate && (
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Default: {new Date(startDate).toLocaleDateString('id-ID')} (dari Overall Schedule)
                          </div>
                        )}
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                          Batch End Date untuk Semua Products *
                        </label>
                        <input
                          type="date"
                          value={commonEndDate}
                          onChange={(e) => {
                            setCommonEndDate(e.target.value);
                            // Update semua forms dengan tanggal yang sama
                            const updatedForms: { [spkNo: string]: { qty: number; startDate: string; endDate: string } } = {};
                            selectedSPKs.forEach(spkNo => {
                              const form = multipleBatchForms[spkNo];
                              if (form) {
                                updatedForms[spkNo] = {
                                  ...form,
                                  endDate: e.target.value,
                                };
                              }
                            });
                            setMultipleBatchForms(updatedForms);
                          }}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-primary)',
                          }}
                        />
                        {!commonEndDate && endDate && (
                          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            Default: {new Date(endDate).toLocaleDateString('id-ID')} (dari Overall Schedule)
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {useSameDateForAll 
                    ? 'Input qty untuk setiap product. Batch start date dan end date akan sama untuk semua product (bisa berbeda dari Overall Schedule Dates).'
                    : 'Input qty, batch start date, dan batch end date untuk setiap product yang dipilih. Dates ini spesifik per batch dan bisa berbeda dari Overall Schedule Dates.'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                  {selectedSPKs.map(spkNo => {
                    const spk = spkProductions.find(s => s.spkNo === spkNo);
                    if (!spk) return null;
                    const form = multipleBatchForms[spkNo] || { qty: 0, startDate: '', endDate: '' };
                    const spkBatchQty = spk.productionBatches.reduce((sum, b) => sum + b.qty, 0);
                    // IMPORTANT: Product qty HARUS pakai qty asli dari SPK/SO, BUKAN dari material override
                    const spkQtyDisplay = spk.qty || 0;
                    const spkRemaining = spkQtyDisplay - spkBatchQty;
                    return (
                      <div key={spkNo} style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', color: 'var(--text-primary)' }}>
                          {spk.product}
                          <span style={{ fontSize: '11px', fontWeight: 'normal', marginLeft: '8px', color: 'var(--text-secondary)' }}>
                            (Qty: {spkQtyDisplay} | Batch: {spkBatchQty} | Remaining: {spkRemaining})
                          </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: useSameDateForAll ? '1fr' : '1fr 1fr', gap: '12px' }}>
                          <div>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                              Qty *
                            </label>
                            <input
                              type="number"
                              value={form.qty}
                              onChange={(e) => setMultipleBatchForms({
                                ...multipleBatchForms,
                                [spkNo]: { ...form, qty: Number(e.target.value) }
                              })}
                              min="1"
                              max={spkRemaining}
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
                              Max: {spkRemaining}
                            </div>
                          </div>
                          {!useSameDateForAll && (
                            <>
                              <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                                  Batch Start Date *
                                </label>
                                <input
                                  type="date"
                                  value={form.startDate}
                                  onChange={(e) => setMultipleBatchForms({
                                    ...multipleBatchForms,
                                    [spkNo]: { ...form, startDate: e.target.value }
                                  })}
                                  style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                  }}
                                />
                                {!form.startDate && startDate && (
                                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    Default: {new Date(startDate).toLocaleDateString('id-ID')}
                                  </div>
                                )}
                              </div>
                              <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                                  Batch End Date *
                                </label>
                                <input
                                  type="date"
                                  value={form.endDate}
                                  onChange={(e) => setMultipleBatchForms({
                                    ...multipleBatchForms,
                                    [spkNo]: { ...form, endDate: e.target.value }
                                  })}
                                  style={{
                                    width: '100%',
                                    padding: '6px 8px',
                                    border: '1px solid var(--border-color)',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--bg-primary)',
                                    color: 'var(--text-primary)',
                                  }}
                                />
                                {!form.endDate && endDate && (
                                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                    Default: {new Date(endDate).toLocaleDateString('id-ID')}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <Button variant="primary" onClick={handleSaveMultipleBatches} style={{ fontSize: '12px', padding: '6px 12px' }}>
                    Tambah Batch untuk Semua
                  </Button>
                  <Button variant="secondary" onClick={() => {
                    setShowBatchForm(false);
                    setMultipleBatchForms({});
                    setUseSameDateForAll(true);
                    setCommonStartDate('');
                    setCommonEndDate('');
                  }} style={{ fontSize: '12px', padding: '6px 12px' }}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {!showBatchForm && (
              <Button variant="primary" onClick={handleAddBatch} style={{ fontSize: '12px', padding: '6px 12px' }}>
                {selectedSPKs.length > 1 
                  ? `+ Tambah Batch untuk ${selectedSPKs.length} Products` 
                  : '+ Tambah Production Batch'}
              </Button>
            )}
          </div>
        </>
      )}

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
        {!inline && (
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button variant="primary" onClick={handleSave}>
          Simpan Production Schedule
        </Button>
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="schedule-dialog-overlay" onClick={onClose}>
      <div className="schedule-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '90%' }}>
        <Card title={`Production Schedule - ${item.customer}`}>
          <div className="schedule-dialog-content">
            {content}
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

export default ProductionScheduleDialog;

