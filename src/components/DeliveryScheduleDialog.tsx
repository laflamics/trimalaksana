import { useState, useEffect, useMemo } from 'react';
import Card from './Card';
import Button from './Button';
import { getTheme } from '../utils/theme';
import './ScheduleDialog.css';

interface DeliveryBatch {
  id: string;
  batchNo: string;
  qty: number;
  deliveryDate: string;
  productId?: string; // Untuk link ke product tertentu
  createSJ?: boolean; // Flag untuk menentukan batch ini akan dibuat Surat Jalan
  sjGroupId?: string; // ID group Surat Jalan - batch dengan sjGroupId yang sama akan digabung dalam 1 SJ
}

interface SPKDelivery {
  spkNo: string;
  soNo: string;
  product: string;
  productId: string;
  qty: number;
  productionBatches: any[];
  deliveryBatches: DeliveryBatch[];
}

interface DeliveryScheduleDialogProps {
  item: {
    soNo: string;
    customer: string;
    spks: SPKDelivery[];
  } | null;
  onClose: () => void;
  onSave: (data: {
    spkDeliveries: { spkNo: string; deliveryBatches: DeliveryBatch[] }[];
  }) => void;
  inline?: boolean; // Jika true, render tanpa overlay (untuk digunakan di GeneralScheduleDialog)
}

const DeliveryScheduleDialog = ({ item, onClose, onSave, inline = false }: DeliveryScheduleDialogProps) => {
  const [spkDeliveries, setSpkDeliveries] = useState<SPKDelivery[]>([]);
  const [selectedSPKs, setSelectedSPKs] = useState<string[]>([]); // Multiple selection
  const [selectionMode, setSelectionMode] = useState<'single' | 'multiple'>('single'); // Default: single
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [editingBatch, setEditingBatch] = useState<DeliveryBatch | null>(null);
  const [batchForm, setBatchForm] = useState({
    qty: 0,
    deliveryDate: '',
    productId: '',
  });
  const [multipleBatchForms, setMultipleBatchForms] = useState<{ [spkNo: string]: { qty: number; deliveryDate: string } }>({});
  const [useSameDateForAll, setUseSameDateForAll] = useState(true); // Mode input tanggal: true = sama untuk semua, false = per product
  const [commonDeliveryDate, setCommonDeliveryDate] = useState(''); // Tanggal delivery untuk semua product (jika useSameDateForAll = true)
  // IMPORTANT: SJ groups sekarang dynamic - tidak terbatas hanya 6, bisa ratusan
  // Generate SJ groups berdasarkan batches yang sudah ada + beberapa default untuk dropdown
  const generateSjGroups = (currentBatches: DeliveryBatch[]): { id: string; name: string }[] => {
    // Extract semua sjGroupId yang sudah digunakan dari batches
    const usedGroupIds = new Set<string>();
    if (Array.isArray(currentBatches)) {
      currentBatches.forEach(batch => {
        if (batch && batch.sjGroupId && batch.createSJ) {
          usedGroupIds.add(batch.sjGroupId);
        }
      });
    }
    
    // Generate groups untuk yang sudah digunakan
    const usedGroups: { id: string; name: string }[] = [];
    usedGroupIds.forEach(groupId => {
      const match = groupId.match(/sj-group-(\d+)/);
      if (match) {
        const number = parseInt(match[1]);
        usedGroups.push({
          id: groupId,
          name: `SJ-${number}`,
        });
      }
    });
    
    // Sort by number untuk konsistensi
    usedGroups.sort((a, b) => {
      const numA = parseInt(a.id.match(/sj-group-(\d+)/)?.[1] || '0');
      const numB = parseInt(b.id.match(/sj-group-(\d+)/)?.[1] || '0');
      return numA - numB;
    });
    
    // Tambahkan beberapa default groups untuk dropdown (jika belum ada)
    // Cari angka tertinggi dari used groups
    const maxNumber = usedGroups.length > 0 
      ? Math.max(...usedGroups.map(g => parseInt(g.id.match(/sj-group-(\d+)/)?.[1] || '0')))
      : 0;
    
    // Tambahkan 10 groups berikutnya untuk dropdown (atau sampai 100 jika maxNumber besar)
    const defaultGroups: { id: string; name: string }[] = [];
    const startNumber = maxNumber + 1;
    const endNumber = Math.min(startNumber + 10, Math.max(100, maxNumber + 10)); // Minimal sampai 100 atau maxNumber + 10
    
    for (let i = startNumber; i <= endNumber; i++) {
      const groupId = `sj-group-${i}`;
      if (!usedGroupIds.has(groupId)) {
        defaultGroups.push({
          id: groupId,
          name: `SJ-${i}`,
        });
      }
    }
    
    // Gabungkan used groups + default groups
    return [...usedGroups, ...defaultGroups];
  };
  
  // Generate SJ groups berdasarkan batches yang ada
  const sjGroups = useMemo(() => {
    // Collect semua batches dari spkDeliveries
    const batches: DeliveryBatch[] = [];
    spkDeliveries.forEach(spk => {
      if (spk && Array.isArray(spk.deliveryBatches)) {
        batches.push(...spk.deliveryBatches.filter((b: any) => b && b.createSJ));
      }
    });
    return generateSjGroups(batches);
  }, [spkDeliveries]);
  
  // Fungsi untuk mendapatkan SJ group berikutnya secara dynamic
  // IMPORTANT: Bisa generate SJ group baru jika perlu (tidak terbatas hanya 6)
  const getNextSjGroup = (currentBatches: DeliveryBatch[]): string => {
    // Defensive check: ensure currentBatches is an array
    if (!Array.isArray(currentBatches)) {
      return 'sj-group-1'; // Default ke SJ-1
    }
    
    // Hitung berapa banyak batch yang sudah ada untuk setiap SJ group
    const groupCounts: { [groupId: string]: number } = {};
    
    currentBatches.forEach(batch => {
      // Defensive check: ensure batch exists and has required properties
      if (batch && batch.sjGroupId && batch.createSJ) {
        groupCounts[batch.sjGroupId] = (groupCounts[batch.sjGroupId] || 0) + 1;
      }
    });
    
    // Jika tidak ada batch yang sudah punya sjGroupId, return SJ-1
    if (Object.keys(groupCounts).length === 0) {
      return 'sj-group-1';
    }
    
    // Cari SJ group dengan batch paling sedikit (round-robin)
    let minCount = Infinity;
    let selectedGroupId = 'sj-group-1'; // Default ke SJ-1
    
    Object.entries(groupCounts).forEach(([groupId, count]) => {
      if (count < minCount) {
        minCount = count;
        selectedGroupId = groupId;
      }
    });
    
    // IMPORTANT: Jika semua group sudah punya batch yang sama, generate group baru
    // Cari angka tertinggi dari semua group yang digunakan
    const allGroupNumbers = Object.keys(groupCounts).map(groupId => {
      const match = groupId.match(/sj-group-(\d+)/);
      return match ? parseInt(match[1]) : 0;
    });
    
    if (allGroupNumbers.length > 0) {
      const maxGroupNumber = Math.max(...allGroupNumbers);
      // Jika semua group sudah digunakan dengan jumlah yang sama, generate group baru
      const allSameCount = Object.values(groupCounts).every(count => count === minCount);
      if (allSameCount && minCount > 0) {
        // Generate group baru dengan angka berikutnya
        const nextGroupNumber = maxGroupNumber + 1;
        return `sj-group-${nextGroupNumber}`;
      }
    }
    
    return selectedGroupId;
  };
  
  // Custom Dialog state
  const [dialogState, setDialogState] = useState<{
    show: boolean;
    type: 'alert' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    type: 'alert',
    title: '',
    message: '',
  });

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
      type: 'alert',
      title: '',
      message: '',
    });
  };

  useEffect(() => {
    if (item && item.spks) {
      // Ensure all batches have createSJ field (default true if not set)
      const spksWithCreateSJ = item.spks.map((spk: SPKDelivery) => ({
        ...spk,
        deliveryBatches: (spk.deliveryBatches || []).map((batch: DeliveryBatch) => ({
          ...batch,
          createSJ: batch.createSJ !== false, // Default true if not set
        })),
      }));
      setSpkDeliveries(spksWithCreateSJ);
      if (item.spks.length > 0 && selectedSPKs.length === 0) {
        setSelectedSPKs([item.spks[0].spkNo]);
      }
    } else {
      setSpkDeliveries([]);
      setSelectedSPKs([]);
    }
  }, [item]);

  if (!item) return null;

  const handleSelectAll = () => {
    if (selectedSPKs.length === spkDeliveries.length) {
      // Deselect all
      setSelectedSPKs([]);
    } else {
      // Select all
      setSelectedSPKs(spkDeliveries.map(spk => spk.spkNo));
    }
  };

  const handleToggleSPK = (spkNo: string) => {
    if (selectionMode === 'single') {
      setSelectedSPKs([spkNo]);
    } else {
      if (selectedSPKs.includes(spkNo)) {
        setSelectedSPKs(selectedSPKs.filter(s => s !== spkNo));
      } else {
        setSelectedSPKs([...selectedSPKs, spkNo]);
      }
    }
  };

  // Calculate totals for selected SPKs
  const selectedSPKObjects = spkDeliveries.filter(spk => selectedSPKs.includes(spk.spkNo));
  const totalQtyAll = selectedSPKObjects.reduce((sum, spk) => sum + spk.qty, 0);
  const totalBatchQtyAll = selectedSPKObjects.reduce((sum, spk) => 
    sum + spk.deliveryBatches.reduce((bSum, b) => bSum + b.qty, 0), 0
  );
  const remainingQtyAll = totalQtyAll - totalBatchQtyAll;

  // For single mode, use first selected SPK
  const currentSPK = selectionMode === 'single' && selectedSPKs.length > 0 
    ? spkDeliveries.find(spk => spk.spkNo === selectedSPKs[0])
    : null;
  const currentDeliveryBatches = currentSPK?.deliveryBatches || [];
  const totalBatchQty = currentDeliveryBatches.reduce((sum, b) => sum + b.qty, 0);
  const remainingQty = (currentSPK?.qty || 0) - totalBatchQty;

  const handleAddBatch = () => {
    if (selectedSPKs.length === 0) {
      showAlert('Pilih minimal 1 product terlebih dahulu', 'Warning');
      return;
    }
    
    if (selectionMode === 'multiple' && selectedSPKs.length > 1) {
      // Multiple selection - initialize forms untuk setiap product
      const forms: { [spkNo: string]: { qty: number; deliveryDate: string } } = {};
      selectedSPKs.forEach(spkNo => {
        const spk = spkDeliveries.find(s => s.spkNo === spkNo);
        if (spk) {
          const spkBatchQty = spk.deliveryBatches.reduce((sum, b) => sum + b.qty, 0);
          const spkRemaining = spk.qty - spkBatchQty;
          forms[spkNo] = {
            qty: spkRemaining > 0 ? spkRemaining : 0,
            deliveryDate: useSameDateForAll ? commonDeliveryDate : '', // Jika mode sama, gunakan commonDeliveryDate
          };
        }
      });
      setMultipleBatchForms(forms);
      setShowBatchForm(true);
    } else {
      // Single selection - form seperti biasa
      if (!currentSPK) return;
      
      setEditingBatch(null);
      setBatchForm({
        qty: remainingQty > 0 ? remainingQty : 0,
        deliveryDate: '',
        productId: currentSPK.productId,
      });
      setShowBatchForm(true);
    }
  };

  const handleSaveMultipleBatches = () => {
    // Jika mode sama untuk semua, validasi commonDeliveryDate
    if (useSameDateForAll) {
      if (!commonDeliveryDate) {
        showAlert('Delivery date wajib diisi', 'Warning');
        return;
      }
      // Set deliveryDate untuk semua forms dari commonDeliveryDate
      const updatedForms: { [spkNo: string]: { qty: number; deliveryDate: string } } = {};
      selectedSPKs.forEach(spkNo => {
        const form = multipleBatchForms[spkNo];
        if (form) {
          updatedForms[spkNo] = {
            ...form,
            deliveryDate: commonDeliveryDate,
          };
        }
      });
      setMultipleBatchForms(updatedForms);
    }

    // Validate semua forms
    for (const spkNo of selectedSPKs) {
      const form = multipleBatchForms[spkNo];
      if (!form) {
        showAlert(`Form untuk ${spkNo} tidak ditemukan`, 'Error');
        return;
      }
      const deliveryDate = useSameDateForAll ? commonDeliveryDate : form.deliveryDate;
      if (!deliveryDate) {
        const spk = spkDeliveries.find(s => s.spkNo === spkNo);
        showAlert(`Delivery date untuk ${spk?.product || spkNo} wajib diisi`, 'Warning');
        return;
      }
      if (!form.qty || form.qty <= 0) {
        const spk = spkDeliveries.find(s => s.spkNo === spkNo);
        showAlert(`Qty untuk ${spk?.product || spkNo} harus lebih dari 0`, 'Warning');
        return;
      }
    }

    // Create batches untuk semua selected SPKs
    const updated = spkDeliveries.map(spk => {
      if (selectedSPKs.includes(spk.spkNo)) {
        const form = multipleBatchForms[spk.spkNo];
        if (!form) return spk;
        
        const spkBatchQty = spk.deliveryBatches.reduce((sum, b) => sum + b.qty, 0);
        const totalQty = spkBatchQty + form.qty;
        
        if (totalQty > spk.qty) {
          showAlert(`Total qty batch (${totalQty}) untuk ${spk.product} tidak boleh melebihi qty SPK (${spk.qty})`, 'Error');
          return spk;
        }
        
        // Gunakan deliveryDate sesuai mode
        const deliveryDate = useSameDateForAll ? commonDeliveryDate : form.deliveryDate;
        
        const batchNo = String.fromCharCode(65 + (Array.isArray(spk.deliveryBatches) ? spk.deliveryBatches.length : 0));
        const newBatch: DeliveryBatch = {
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9) + spk.spkNo,
          batchNo: batchNo,
          qty: form.qty,
          deliveryDate: new Date(deliveryDate).toISOString(),
          productId: spk.productId,
          createSJ: true, // Default true, user bisa uncheck jika tidak mau buat SJ
          sjGroupId: getNextSjGroup(Array.isArray(spk.deliveryBatches) ? spk.deliveryBatches : []), // Auto-assign SJ group secara round-robin
        };
        return {
          ...spk,
          deliveryBatches: [...spk.deliveryBatches, newBatch],
        };
      }
      return spk;
    });
    
    setSpkDeliveries(updated);
    setShowBatchForm(false);
    setMultipleBatchForms({});
    setUseSameDateForAll(true);
    setCommonDeliveryDate('');
  };

  const handleEditBatch = (batch: DeliveryBatch, spkNo: string) => {
    const spk = spkDeliveries.find(s => s.spkNo === spkNo);
    if (!spk) return;
    
    setSelectionMode('single');
    setSelectedSPKs([spkNo]);
    setEditingBatch(batch);
    setBatchForm({
      qty: batch.qty,
      deliveryDate: batch.deliveryDate.split('T')[0],
      productId: batch.productId || spk.productId || '',
    });
    setShowBatchForm(true);
  };

  const handleDeleteBatch = (batchId: string, spkNo: string) => {
    showConfirm(
      'Yakin hapus batch delivery ini?',
      () => {
        const updated = spkDeliveries.map(spk => {
          if (spk.spkNo === spkNo) {
            return {
              ...spk,
              deliveryBatches: spk.deliveryBatches.filter(b => b.id !== batchId),
            };
          }
          return spk;
        });
        setSpkDeliveries(updated);
        closeDialog();
      },
      () => closeDialog(),
      'Konfirmasi Hapus'
    );
  };

  const handleSaveBatch = () => {
    if (selectedSPKs.length === 0 || !currentSPK) return;
    
    if (!batchForm.qty || batchForm.qty <= 0) {
      showAlert('Qty batch harus lebih dari 0', 'Warning');
      return;
    }
    if (!batchForm.deliveryDate) {
      showAlert('Delivery date wajib diisi', 'Warning');
      return;
    }

    const totalQty = currentDeliveryBatches.reduce((sum, b) => 
      b.id === editingBatch?.id ? sum : sum + b.qty, 0
    ) + batchForm.qty;

    if (totalQty > currentSPK.qty) {
      showAlert(`Total qty batch (${totalQty}) tidak boleh melebihi qty SPK (${currentSPK.qty})`, 'Error');
      return;
    }

    const updated = spkDeliveries.map(spk => {
      if (spk.spkNo === selectedSPKs[0]) {
        if (editingBatch) {
          return {
            ...spk,
            deliveryBatches: spk.deliveryBatches.map(b => 
              b.id === editingBatch.id 
                ? {
                    ...b,
                    qty: batchForm.qty,
                    deliveryDate: new Date(batchForm.deliveryDate).toISOString(),
                    productId: batchForm.productId,
                    createSJ: editingBatch.createSJ !== false, // Keep existing createSJ value
                    sjGroupId: editingBatch.sjGroupId, // Keep existing sjGroupId value
                  }
                : b
            ),
          };
        } else {
          const batchNo = String.fromCharCode(65 + spk.deliveryBatches.length);
          const newBatch: DeliveryBatch = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            batchNo: batchNo,
            qty: batchForm.qty,
            deliveryDate: new Date(batchForm.deliveryDate).toISOString(),
            productId: batchForm.productId,
            createSJ: true, // Default true, user bisa uncheck jika tidak mau buat SJ
            sjGroupId: (() => {
              // Hitung semua batches yang sudah ada untuk round-robin
              const allBatches: DeliveryBatch[] = [];
              spkDeliveries.forEach(s => {
                if (s && Array.isArray(s.deliveryBatches)) {
                  allBatches.push(...s.deliveryBatches.filter((b: any) => b && b.createSJ && s.spkNo !== spk.spkNo));
                }
              });
              if (Array.isArray(spk.deliveryBatches)) {
                allBatches.push(...spk.deliveryBatches.filter((b: any) => b && b.createSJ));
              }
              return getNextSjGroup(allBatches);
            })(), // Auto-assign SJ group secara round-robin
          };
          return {
            ...spk,
            deliveryBatches: [...spk.deliveryBatches, newBatch],
          };
        }
      }
      return spk;
    });

    setSpkDeliveries(updated);
    setShowBatchForm(false);
    setEditingBatch(null);
    setBatchForm({ qty: 0, deliveryDate: '', productId: '' });
  };

  const handleSave = () => {
    const spkDeliveriesData = spkDeliveries.map(spk => ({
      spkNo: spk.spkNo,
      deliveryBatches: spk.deliveryBatches,
    }));
    
    onSave({
      spkDeliveries: spkDeliveriesData,
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

      {/* Product Selection with Checkboxes */}
            <div style={{ marginTop: '20px', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', fontWeight: 500 }}>
                  Pilih Product ({selectedSPKs.length} dipilih):
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button
                    variant="secondary"
                    onClick={() => setSelectionMode(selectionMode === 'single' ? 'multiple' : 'single')}
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    {selectionMode === 'single' ? '🔘 Single' : '☑️ Multiple'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={handleSelectAll}
                    style={{ fontSize: '11px', padding: '4px 8px' }}
                  >
                    {selectedSPKs.length === spkDeliveries.length ? '❌ Deselect All' : '✅ Select All'}
                  </Button>
                </div>
              </div>
              <div style={{ 
                maxHeight: '200px', 
                overflowY: 'auto', 
                border: '1px solid var(--border-color)', 
                borderRadius: '4px',
                padding: '8px',
                backgroundColor: 'var(--bg-secondary)'
              }}>
                {spkDeliveries.map((spk) => {
                  const isSelected = selectedSPKs.includes(spk.spkNo);
                  const spkBatchQty = spk.deliveryBatches.reduce((sum, b) => sum + b.qty, 0);
                  const spkRemaining = spk.qty - spkBatchQty;
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
                          Qty: {spk.qty} | Batch: {spkBatchQty} | Remaining: {spkRemaining}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {selectionMode === 'multiple' && selectedSPKs.length > 1 && (
                <div style={{ marginTop: '12px', padding: '10px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px', fontSize: '12px', color: 'var(--text-primary)' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>Multiple Selection Mode:</strong> {selectedSPKs.length} products dipilih
                  <br />
                  Total Qty: <strong style={{ color: 'var(--text-primary)' }}>{totalQtyAll}</strong> | 
                  Batch Qty: <strong style={{ color: 'var(--text-primary)' }}>{totalBatchQtyAll}</strong> | 
                  Remaining: <strong style={{ color: 'var(--text-primary)' }}>{remainingQtyAll}</strong>
                </div>
              )}
            </div>

            {/* Delivery Batch Management - Show for all selected SPKs */}
            {selectedSPKs.length > 0 && (
              <>
                <div style={{ marginTop: '24px', padding: '16px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>
                      Delivery Batch Management
                      {selectionMode === 'multiple' && selectedSPKs.length > 1 && ` (${selectedSPKs.length} products)`}
                    </h4>
                    {selectionMode === 'single' && currentSPK && (
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Total Qty: <strong style={{ color: 'var(--text-primary)' }}>{currentSPK.qty}</strong> | 
                        Batch Qty: <strong style={{ color: totalBatchQty === currentSPK.qty ? '#2e7d32' : '#d32f2f' }}>
                          {totalBatchQty}
                        </strong> | 
                        Remaining: <strong style={{ color: remainingQty > 0 ? '#d32f2f' : '#2e7d32' }}>
                          {remainingQty}
                        </strong>
                      </div>
                    )}
                  </div>

                  {/* Show batches for all selected SPKs */}
                  {selectedSPKObjects.map((spk) => {
                    const spkBatches = spk.deliveryBatches || [];
                    const spkTotalBatchQty = spkBatches.reduce((sum, b) => sum + b.qty, 0);
                    const spkRemaining = spk.qty - spkTotalBatchQty;
                    
                    return (
                      <div key={spk.spkNo} style={{ marginBottom: '20px', padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                        <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', color: 'var(--text-primary)' }}>
                          {spk.spkNo} - {spk.product}
                          <span style={{ fontSize: '11px', fontWeight: 'normal', marginLeft: '8px', color: 'var(--text-secondary)' }}>
                            (Qty: {spk.qty} | Batch: {spkTotalBatchQty} | Remaining: {spkRemaining})
                          </span>
                        </div>
                        
                        {spkBatches.length > 0 && (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '8px' }}>
                            <thead>
                              <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '6px', textAlign: 'center', color: 'var(--text-primary)', width: '60px' }}>Create SJ</th>
                                <th style={{ padding: '6px', textAlign: 'left', color: 'var(--text-primary)' }}>Batch</th>
                                <th style={{ padding: '6px', textAlign: 'right', color: 'var(--text-primary)' }}>Qty</th>
                                <th style={{ padding: '6px', textAlign: 'center', color: 'var(--text-primary)' }}>Delivery Date</th>
                                <th style={{ padding: '6px', textAlign: 'center', color: 'var(--text-primary)' }}>SJ Group</th>
                                <th style={{ padding: '6px', textAlign: 'center', color: 'var(--text-primary)' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {spkBatches.map((batch) => (
                                <tr key={batch.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                  <td style={{ padding: '6px', textAlign: 'center' }}>
                                    <input
                                      type="checkbox"
                                      checked={batch.createSJ !== false}
                                      onChange={(e) => {
                                        const updated = spkDeliveries.map(s => {
                                          if (s.spkNo === spk.spkNo) {
                                            return {
                                              ...s,
                                              deliveryBatches: s.deliveryBatches.map(b =>
                                                b.id === batch.id
                                                  ? { ...b, createSJ: e.target.checked }
                                                  : b
                                              ),
                                            };
                                          }
                                          return s;
                                        });
                                        setSpkDeliveries(updated);
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                      style={{ cursor: 'pointer' }}
                                      title={batch.createSJ !== false ? 'Batch ini akan dibuat Surat Jalan' : 'Batch ini tidak akan dibuat Surat Jalan'}
                                    />
                                  </td>
                                  <td style={{ padding: '6px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Batch {batch.batchNo}</td>
                                  <td style={{ padding: '6px', textAlign: 'right', color: 'var(--text-primary)' }}>{batch.qty}</td>
                                  <td style={{ padding: '6px', textAlign: 'center', color: 'var(--text-primary)' }}>
                                    {(() => {
                                      try {
                                        const date = new Date(batch.deliveryDate);
                                        if (isNaN(date.getTime())) return '-';
                                        const day = String(date.getDate()).padStart(2, '0');
                                        const month = String(date.getMonth() + 1).padStart(2, '0');
                                        const year = date.getFullYear();
                                        return `${day}/${month}/${year}`;
                                      } catch {
                                        return '-';
                                      }
                                    })()}
                                  </td>
                                  <td style={{ padding: '6px', textAlign: 'center' }}>
                                    {batch.createSJ !== false ? (
                                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        <select
                                          value={batch.sjGroupId || ''}
                                          onChange={(e) => {
                                            const updated = spkDeliveries.map(s => {
                                              if (s.spkNo === spk.spkNo) {
                                                return {
                                                  ...s,
                                                  deliveryBatches: s.deliveryBatches.map(b =>
                                                    b.id === batch.id
                                                      ? { ...b, sjGroupId: e.target.value || undefined }
                                                      : b
                                                  ),
                                                };
                                              }
                                              return s;
                                            });
                                            setSpkDeliveries(updated);
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          style={{
                                            flex: 1,
                                            padding: '4px 6px',
                                            fontSize: '11px',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '4px',
                                            backgroundColor: 'var(--bg-primary)',
                                            color: 'var(--text-primary)',
                                            cursor: 'pointer',
                                            minWidth: '80px',
                                          }}
                                          title="Pilih SJ Group untuk batch ini. Batch dengan group yang sama akan digabung dalam 1 Surat Jalan. SJ Groups otomatis tersedia (tidak terbatas)."
                                        >
                                          <option value="">- Pilih Group -</option>
                                          {sjGroups.map(group => (
                                            <option key={group.id} value={group.id}>{group.name}</option>
                                          ))}
                                        </select>
                                        <input
                                          type="text"
                                          placeholder="SJ-XX"
                                          onBlur={(e) => {
                                            const customValue = e.target.value.trim();
                                            if (customValue && /^SJ-\d+$/i.test(customValue)) {
                                              const match = customValue.match(/SJ-(\d+)/i);
                                              if (match) {
                                                const number = parseInt(match[1]);
                                                const customGroupId = `sj-group-${number}`;
                                                const updated = spkDeliveries.map(s => {
                                                  if (s.spkNo === spk.spkNo) {
                                                    return {
                                                      ...s,
                                                      deliveryBatches: s.deliveryBatches.map(b =>
                                                        b.id === batch.id
                                                          ? { ...b, sjGroupId: customGroupId }
                                                          : b
                                                      ),
                                                    };
                                                  }
                                                  return s;
                                                });
                                                setSpkDeliveries(updated);
                                                e.target.value = '';
                                              }
                                            }
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              e.currentTarget.blur();
                                            }
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                          style={{
                                            width: '60px',
                                            padding: '4px 6px',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '4px',
                                            backgroundColor: 'var(--bg-primary)',
                                            color: 'var(--text-primary)',
                                            fontSize: '11px',
                                          }}
                                          title="Input manual SJ Group (format: SJ-XX, contoh: SJ-100)"
                                        />
                                      </div>
                                    ) : (
                                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>-</span>
                                    )}
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

                  {showBatchForm && selectionMode === 'single' && currentSPK && (
                    <div style={{ padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', marginBottom: '16px' }}>
                      <h5 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--text-primary)' }}>
                        {editingBatch ? `Edit Delivery Batch ${editingBatch.batchNo}` : 'Tambah Delivery Batch Baru'}
                      </h5>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
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
                            Delivery Date *
                          </label>
                          <input
                            type="date"
                            value={batchForm.deliveryDate}
                            onChange={(e) => setBatchForm({ ...batchForm, deliveryDate: e.target.value })}
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
                          setBatchForm({ qty: 0, deliveryDate: '', productId: '' });
                        }} style={{ fontSize: '12px', padding: '6px 12px' }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {showBatchForm && selectionMode === 'multiple' && selectedSPKs.length > 1 && (
                    <div style={{ padding: '16px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '6px', marginBottom: '16px' }}>
                      <h5 style={{ marginTop: 0, marginBottom: '12px', color: 'var(--text-primary)' }}>
                        Tambah Delivery Batch untuk {selectedSPKs.length} Products
                      </h5>
                      
                      {/* Mode Selection */}
                      <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>
                          Mode Input Delivery Date:
                        </label>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-primary)' }}>
                            <input
                              type="radio"
                              name="dateMode"
                              checked={useSameDateForAll}
                              onChange={() => {
                                setUseSameDateForAll(true);
                                // Update semua forms dengan commonDeliveryDate jika sudah diisi
                                if (commonDeliveryDate) {
                                  const updatedForms: { [spkNo: string]: { qty: number; deliveryDate: string } } = {};
                                  selectedSPKs.forEach(spkNo => {
                                    const form = multipleBatchForms[spkNo];
                                    if (form) {
                                      updatedForms[spkNo] = {
                                        ...form,
                                        deliveryDate: commonDeliveryDate,
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
                          <div style={{ marginTop: '12px' }}>
                            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                              Delivery Date untuk Semua Products *
                            </label>
                            <input
                              type="date"
                              value={commonDeliveryDate}
                              onChange={(e) => {
                                setCommonDeliveryDate(e.target.value);
                                // Update semua forms dengan tanggal yang sama
                                const updatedForms: { [spkNo: string]: { qty: number; deliveryDate: string } } = {};
                                selectedSPKs.forEach(spkNo => {
                                  const form = multipleBatchForms[spkNo];
                                  if (form) {
                                    updatedForms[spkNo] = {
                                      ...form,
                                      deliveryDate: e.target.value,
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
                          </div>
                        )}
                      </div>

                      <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {useSameDateForAll 
                          ? 'Input qty untuk setiap product. Delivery date akan sama untuk semua product.'
                          : 'Input qty dan delivery date untuk setiap product yang dipilih.'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto' }}>
                        {selectedSPKs.map(spkNo => {
                          const spk = spkDeliveries.find(s => s.spkNo === spkNo);
                          if (!spk) return null;
                          const form = multipleBatchForms[spkNo] || { qty: 0, deliveryDate: '' };
                          const spkBatchQty = spk.deliveryBatches.reduce((sum, b) => sum + b.qty, 0);
                          const spkRemaining = spk.qty - spkBatchQty;
                          return (
                            <div key={spkNo} style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                              <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', color: 'var(--text-primary)' }}>
                                {spk.product}
                                <span style={{ fontSize: '11px', fontWeight: 'normal', marginLeft: '8px', color: 'var(--text-secondary)' }}>
                                  (Qty: {spk.qty} | Batch: {spkBatchQty} | Remaining: {spkRemaining})
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
                                  <div>
                                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: 500 }}>
                                      Delivery Date *
                                    </label>
                                    <input
                                      type="date"
                                      value={form.deliveryDate}
                                      onChange={(e) => setMultipleBatchForms({
                                        ...multipleBatchForms,
                                        [spkNo]: { ...form, deliveryDate: e.target.value }
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
                                  </div>
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
                          setCommonDeliveryDate('');
                        }} style={{ fontSize: '12px', padding: '6px 12px' }}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {!showBatchForm && (
                    <Button variant="primary" onClick={handleAddBatch} style={{ fontSize: '12px', padding: '6px 12px' }}>
                      {selectionMode === 'multiple' && selectedSPKs.length > 1 
                        ? `+ Tambah Batch untuk ${selectedSPKs.length} Products` 
                        : '+ Tambah Delivery Batch'}
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
                Simpan Delivery Schedule
              </Button>
            </div>


      {/* Custom Dialog */}
      {dialogState.show && (
        <div className="dialog-overlay" onClick={dialogState.type === 'alert' ? closeDialog : undefined} style={{ zIndex: 10001 }}>
          <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                {dialogState.title}
              </h3>
            </div>
            
            <div style={{ marginBottom: '24px', fontSize: '14px', color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>
              {dialogState.message}
            </div>
            
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {dialogState.type === 'confirm' && (
                <Button variant="secondary" onClick={() => {
                  if (dialogState.onCancel) dialogState.onCancel();
                  closeDialog();
                }}>
                  Cancel
                </Button>
              )}
              <Button variant="primary" onClick={() => {
                if (dialogState.onConfirm) dialogState.onConfirm();
                if (dialogState.type === 'alert') closeDialog();
              }}>
                {dialogState.type === 'alert' ? 'OK' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="schedule-dialog-overlay" onClick={onClose}>
      <div className="schedule-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', width: '90%' }}>
        <Card title={`Schedule Delivery - ${item.customer}`}>
          <div className="schedule-dialog-content">
            {content}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default DeliveryScheduleDialog;
