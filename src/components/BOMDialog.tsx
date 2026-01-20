import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Card from './Card';
import Button from './Button';
import { storageService } from '../services/storage';
import '../styles/common.css';
import './BOMDialog.css';

interface BOMItem {
  id?: string;
  materialId: string;  // camelCase untuk konsistensi dengan SO
  materialName?: string;  // camelCase untuk konsistensi dengan SO
  ratio: number;
}

interface BOMDialogProps {
  productId: string;
  productName: string;
  productKode: string;
  onClose: () => void;
  onSave: (bomItems: BOMItem[]) => void;
}

const BOMDialog = ({ productId, productName, productKode, onClose, onSave }: BOMDialogProps) => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [loading, setLoading] = useState(true);
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

  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [materialInputValue, setMaterialInputValue] = useState('');
  const [ratio, setRatio] = useState('1');
  const [ratioInputValue, setRatioInputValue] = useState('');
  const [ratioInputValues, setRatioInputValues] = useState<{ [key: number]: string }>({});
  const [previewQty, setPreviewQty] = useState<string>('1'); // Qty product untuk preview qty material

  const productKodeRef = useRef(productKode);
  const productIdRef = useRef(productId);
  const onSaveRef = useRef(onSave);
  const isSavingRef = useRef(false);
  const isLoadingRef = useRef(false);
  const lastProductIdRef = useRef<string>('');
  const lastProductKodeRef = useRef<string>('');

  useEffect(() => {
    productKodeRef.current = productKode;
    productIdRef.current = productId;
    onSaveRef.current = onSave;
  }, [productKode, productId, onSave]);

  const loadData = useCallback(async () => {
    // Prevent multiple simultaneous loads
    if (isLoadingRef.current) {
      return;
    }
    
    const currentProductId = (productIdRef.current || '').toString().trim();
    const currentProductKode = (productKodeRef.current || '').toString().trim();
    const currentKey = `${currentProductId}-${currentProductKode}`;
    const lastKey = `${lastProductIdRef.current}-${lastProductKodeRef.current}`;
    
    // Skip if same product
    if (currentKey === lastKey && currentKey !== '') {
      return;
    }
    
    isLoadingRef.current = true;
    lastProductIdRef.current = currentProductId;
    lastProductKodeRef.current = currentProductKode;
    
    try {
      setLoading(true);
      // Load materials
      const materialsData = await storageService.get<any[]>('materials') || [];
      setMaterials(materialsData);

      // Load existing BOM for this product
      const bomData = await storageService.get<any[]>('bom') || [];
      const targetId = (productKodeRef.current || productIdRef.current || '').toString().trim().toLowerCase();
      
      if (!targetId) {
        console.warn('[BOMDialog] No targetId provided, cannot load BOM');
        setBomItems([]);
        return;
      }
      
      // Load products untuk cross-reference kodeIpos
      const productsData = await storageService.get<any[]>('products') || [];
      
      // Build lookup map untuk performa lebih baik
      const productsByKode = new Map<string, any>();
      const productsByKodeIpos = new Map<string, any>();
      const productsByProductId = new Map<string, any>();
      const productsByPadCode = new Map<string, any>();
      
      productsData.forEach(p => {
        if (!p) return;
        const pKode = String(p.kode || '').trim().toLowerCase();
        const pKodeIpos = String(p.kodeIpos || '').trim().toLowerCase();
        const pProductId = String(p.product_id || '').trim().toLowerCase();
        const pPadCode = String(p.padCode || '').trim().toLowerCase();
        
        if (pKode) productsByKode.set(pKode, p);
        if (pKodeIpos) productsByKodeIpos.set(pKodeIpos, p);
        if (pProductId) productsByProductId.set(pProductId, p);
        if (pPadCode) productsByPadCode.set(pPadCode, p);
      });
      
      // Cari produk yang sedang di-edit untuk mendapatkan semua identifier-nya
      const targetProduct = productsByKode.get(targetId) || 
                           productsByKodeIpos.get(targetId) || 
                           productsByProductId.get(targetId) || 
                           productsByPadCode.get(targetId);
      
      // Build set of all possible identifiers untuk produk ini
      const targetIdentifiers = new Set<string>();
      targetIdentifiers.add(targetId);
      
      if (targetProduct) {
        const pKode = String(targetProduct.kode || '').trim().toLowerCase();
        const pKodeIpos = String(targetProduct.kodeIpos || '').trim().toLowerCase();
        const pProductId = String(targetProduct.product_id || '').trim().toLowerCase();
        const pPadCode = String(targetProduct.padCode || '').trim().toLowerCase();
        
        if (pKode) targetIdentifiers.add(pKode);
        if (pKodeIpos) targetIdentifiers.add(pKodeIpos);
        if (pProductId) targetIdentifiers.add(pProductId);
        if (pPadCode) targetIdentifiers.add(pPadCode);
      }
      
      // Filter BOM: BOM product_id harus match dengan salah satu identifier dari produk ini
      const productBOM = bomData.filter(b => {
        if (!b) return false;
        
        // BOM product_id bisa dari b.product_id, b.padCode, atau b.kode
        const bomProductId = String(b.product_id || b.padCode || b.kode || '').trim().toLowerCase();
        
        // Skip jika BOM tidak punya product_id
        if (!bomProductId) return false;
        
        // Direct match: BOM product_id langsung match dengan salah satu identifier produk ini
        if (targetIdentifiers.has(bomProductId)) {
          return true;
        }
        
        // Cross-reference: Cari produk yang punya kode/kodeIpos/product_id/padCode sama dengan bomProductId
        const bomMatchingProduct = productsByKode.get(bomProductId) || 
                                   productsByKodeIpos.get(bomProductId) || 
                                   productsByProductId.get(bomProductId) || 
                                   productsByPadCode.get(bomProductId);
        
        // Jika ada produk yang match dengan bomProductId, cek apakah produk itu sama dengan produk target
        if (bomMatchingProduct && targetProduct) {
          return bomMatchingProduct.id === targetProduct.id;
        }
        
        return false;
      });
      
      console.log(`[BOMDialog] Loaded ${productBOM.length} BOM items for product ${targetId}`, {
        targetId,
        targetIdentifiers: Array.from(targetIdentifiers),
        bomCount: productBOM.length,
        bomProductIds: productBOM.map(b => b.product_id)
      });

      // Map BOM items with material names
      // IMPORTANT: Deduplicate berdasarkan material_id (jika ada duplicate material_id untuk product yang sama)
      // Tapi tetap load semua BOM entries yang match dengan product
      const bomMap = new Map<string, any>();
      productBOM.forEach(bom => {
        // Support both snake_case (dari storage) dan camelCase (backward compatibility)
        const materialId = (bom.material_id || bom.materialId || '').toString().trim();
        if (!materialId) return; // Skip jika tidak ada material_id
        
        // Jika material_id sudah ada, keep yang pertama (deduplicate)
        // Tapi pastikan semua BOM entries di-iterasi, bukan hanya yang terakhir
        if (!bomMap.has(materialId)) {
          const material = materialsData.find(m => 
            (m.material_id || m.kode) === materialId
          );
          bomMap.set(materialId, {
            id: bom.id,
            materialId: materialId,  // camelCase untuk konsistensi dengan SO
            materialName: material?.nama || bom.materialName || bom.material_name || '',  // camelCase untuk konsistensi dengan SO, support backward compatibility
            ratio: bom.ratio || 1,
          });
        }
      });

      const finalBomItems = Array.from(bomMap.values());
      console.log(`[BOMDialog] Final BOM items: ${finalBomItems.length}`, finalBomItems.map(b => ({ materialId: b.materialId, ratio: b.ratio })));
      setBomItems(finalBomItems);
    } catch (error) {
      console.error('Error loading BOM data:', error);
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [productId, productKode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getMaterialInputDisplayValue = () => {
    if (materialInputValue !== undefined && materialInputValue !== '') {
      return materialInputValue;
    }
    if (selectedMaterialId) {
      const material = materials.find(m => (m.material_id || m.kode) === selectedMaterialId);
      if (material) {
        return `${material.material_id || material.kode} - ${material.nama}`;
      }
      return selectedMaterialId;
    }
    return '';
  };

  const handleMaterialInputChange = (text: string) => {
    setMaterialInputValue(text);
    if (!text) {
      setSelectedMaterialId('');
      return;
    }
    const normalized = text.toLowerCase();
    const matchedMaterial = materials.find(m => {
      const label = `${m.material_id || m.kode || ''}${(m.material_id || m.kode) ? ' - ' : ''}${m.nama || ''}`.toLowerCase();
      const code = ((m.material_id || m.kode) || '').toLowerCase();
      const name = (m.nama || '').toLowerCase();
      return label === normalized || code === normalized || name === normalized;
    });
    if (matchedMaterial) {
      setSelectedMaterialId(matchedMaterial.material_id || matchedMaterial.kode || '');
    } else {
      setSelectedMaterialId(text);
    }
  };

  const handleAddBOMItem = useCallback(() => {
    if (!selectedMaterialId) {
      showAlert('Pilih material terlebih dahulu', 'Information');
      return;
    }

    const ratioNum = parseFloat(ratio) || 1;
    if (ratioNum <= 0) {
      showAlert('Ratio harus lebih besar dari 0', 'Information');
      return;
    }

    setBomItems(prevItems => {
      // Check for duplicate material - prevent duplicate di BOM yang sama
      if (prevItems.some(item => item.materialId === selectedMaterialId)) {  // camelCase untuk konsistensi dengan SO
        showAlert('Material ini sudah ada di BOM. Pilih material lain atau edit yang sudah ada.', 'Information');
        return prevItems;
      }

      const material = materials.find(m => (m.material_id || m.kode) === selectedMaterialId);
      if (!material) {
        showAlert('Material tidak ditemukan', 'Information');
        return prevItems;
      }

      const newItem: BOMItem = {
        materialId: selectedMaterialId,  // camelCase untuk konsistensi dengan SO
        materialName: material.nama || '',  // camelCase untuk konsistensi dengan SO
        ratio: ratioNum,
      };

      return [...prevItems, newItem];
    });

    setSelectedMaterialId('');
    setMaterialInputValue('');
    setRatio('1');
    setRatioInputValue('');
  }, [selectedMaterialId, ratio, materials]);

  const handleRemoveBOMItem = useCallback((index: number) => {
    setBomItems(prevItems => prevItems.filter((_, i) => i !== index));
  }, []);

  // Helper function untuk remove leading zero dari input angka
  const removeLeadingZero = (value: string): string => {
    if (!value) return value;
    // Jika hanya "0", "0.", atau "0," biarkan
    if (value === '0' || value === '0.' || value === '0,') {
      return value;
    }
    // Hapus semua leading zero kecuali untuk "0." atau "0,"
    if (value.startsWith('0') && value.length > 1) {
      // Jika dimulai dengan "0." atau "0," biarkan
      if (value.startsWith('0.') || value.startsWith('0,')) {
        return value;
      }
      // Hapus semua leading zero
      const cleaned = value.replace(/^0+/, '');
      return cleaned || '0';
    }
    return value;
  };

  const handleUpdateRatio = useCallback((index: number, newRatio: string) => {
    const ratioNum = parseFloat(newRatio) || 1;
    if (ratioNum <= 0) {
      showAlert('Ratio harus lebih besar dari 0', 'Information');
      return;
    }

    setBomItems(prevItems => prevItems.map((item, i) =>
      i === index ? { ...item, ratio: ratioNum } : item
    ));
  }, []);

  const handleSave = useCallback(() => {
    // Prevent multiple calls
    if (isSavingRef.current) {
      return;
    }
    
    isSavingRef.current = true;
    try {
      onSaveRef.current(bomItems);
      // Reset flag after a delay to allow save to complete
      setTimeout(() => {
        isSavingRef.current = false;
      }, 1000);
    } catch (error) {
      console.error('Error in handleSave:', error);
      isSavingRef.current = false;
    }
  }, [bomItems]);

  // Memoize filtered materials untuk prevent re-render
  const availableMaterials = useMemo(() => {
    const bomMaterialIds = new Set(bomItems.map(item => item.materialId));  // camelCase untuk konsistensi dengan SO
    return materials.filter(m => !bomMaterialIds.has(m.material_id || m.kode));
  }, [materials, bomItems]);

  if (loading) {
    return (
      <div className="dialog-overlay" onClick={onClose}>
        <Card className="dialog-card" onClick={(e) => e.stopPropagation()}>
          <p>Loading...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <Card 
        title={`Edit BOM - ${productName} (${productKode})`}
        className="dialog-card bom-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bom-dialog-content">
          <div className="bom-add-section">
            <h3 style={{ marginBottom: '12px', color: 'var(--text-primary)' }}>Tambah Material</h3>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <input
                  type="text"
                  list="material-list-bom"
                  value={getMaterialInputDisplayValue()}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleMaterialInputChange(e.target.value);
                  }}
                  onBlur={(e) => {
                    const value = e.target.value;
                    const matchedMaterial = availableMaterials.find(m => {
                      const label = `${m.material_id || m.kode || ''}${(m.material_id || m.kode) ? ' - ' : ''}${m.nama || ''}`;
                      return label === value;
                    });
                    if (matchedMaterial) {
                      setSelectedMaterialId(matchedMaterial.material_id || matchedMaterial.kode || '');
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  placeholder="-- Pilih Material --"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
                <datalist id="material-list-bom">
                  {availableMaterials.map(m => (
                    <option key={m.id || m.material_id || m.kode} value={`${m.material_id || m.kode} - ${m.nama}`}>
                      {m.material_id || m.kode} - {m.nama}
                    </option>
                  ))}
                </datalist>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', width: '120px' }}>
                <label style={{ fontSize: '12px', marginBottom: '4px', color: 'var(--text-secondary)' }}>Ratio</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={ratioInputValue !== undefined && ratioInputValue !== '' ? ratioInputValue : (ratio !== undefined && ratio !== null && ratio !== '1' && ratio !== '0' ? String(ratio) : '')}
                  onFocus={(e) => {
                    const input = e.target as HTMLInputElement;
                    const currentVal = ratio;
                    if (currentVal === '1' || currentVal === '0' || currentVal === '' || currentVal === null || currentVal === undefined) {
                      setRatioInputValue('');
                      input.value = '';
                    } else {
                      input.select();
                    }
                  }}
                  onMouseDown={(e) => {
                    const input = e.target as HTMLInputElement;
                    const currentVal = ratio;
                    if (currentVal === '1' || currentVal === '0' || currentVal === '' || currentVal === null || currentVal === undefined) {
                      setRatioInputValue('');
                      input.value = '';
                    }
                  }}
                  onChange={(e) => {
                    let val = e.target.value;
                    val = val.replace(/[^\d.,]/g, '');
                    const cleaned = removeLeadingZero(val);
                    setRatioInputValue(cleaned);
                    setRatio(cleaned === '' ? '1' : cleaned);
                  }}
                  onBlur={(e) => {
                    const val = e.target.value;
                    if (val === '' || isNaN(Number(val)) || Number(val) <= 0) {
                      setRatio('1');
                      setRatioInputValue('');
                    } else {
                      setRatio(val);
                      setRatioInputValue('');
                    }
                  }}
                  onKeyDown={(e) => {
                    const input = e.target as HTMLInputElement;
                    const currentVal = input.value;
                    if ((currentVal === '' || currentVal === '0' || currentVal === '1') && /^[1-9]$/.test(e.key)) {
                      e.preventDefault();
                      const newVal = e.key;
                      setRatioInputValue(newVal);
                      input.value = newVal;
                      setRatio(newVal);
                    }
                  }}
                  placeholder="1"
                  style={{
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <Button variant="primary" onClick={handleAddBOMItem}>
                Tambah
              </Button>
            </div>
          </div>

          <div className="bom-list-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Daftar BOM</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Preview Qty Product:</label>
                <input
                  type="text"
                  value={previewQty}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '' || /^\d*\.?\d*$/.test(val)) {
                      setPreviewQty(val);
                    }
                  }}
                  placeholder="1"
                  style={{
                    width: '80px',
                    padding: '4px 8px',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    textAlign: 'right',
                  }}
                />
              </div>
            </div>
            {bomItems.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)', padding: '20px', textAlign: 'center' }}>
                Belum ada material di BOM. Tambahkan material di atas.
              </p>
            ) : (
              <div className="bom-table">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '10px', borderBottom: '2px solid var(--border-color)' }}>Material</th>
                      <th style={{ textAlign: 'right', padding: '10px', borderBottom: '2px solid var(--border-color)' }}>Ratio</th>
                      <th style={{ textAlign: 'right', padding: '10px', borderBottom: '2px solid var(--border-color)' }}>Qty (Preview)</th>
                      <th style={{ textAlign: 'left', padding: '10px', borderBottom: '2px solid var(--border-color)' }}>Unit</th>
                      <th style={{ textAlign: 'center', padding: '10px', borderBottom: '2px solid var(--border-color)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bomItems.map((item, index) => {
                      const previewQtyNum = parseFloat(previewQty) || 1;
                      const calculatedQty = previewQtyNum * item.ratio;
                      const material = materials.find(m => (m.material_id || m.kode) === item.materialId);  // camelCase untuk konsistensi dengan SO
                      const unit = material?.satuan || material?.unit || 'PCS';
                      
                      return (
                        <tr key={index}>
                          <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ fontWeight: '500' }}>{item.materialName || '-'}</div>  {/* camelCase untuk konsistensi dengan SO */}
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>({item.materialId})</div>  {/* camelCase untuk konsistensi dengan SO */}
                          </td>
                          <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>
                            <input
                              type="text"
                              inputMode="decimal"
                              value={ratioInputValues[index] !== undefined ? ratioInputValues[index] : (item.ratio !== undefined && item.ratio !== null && item.ratio !== 0 && item.ratio !== 1 ? String(item.ratio) : (item.ratio === 1 ? '1' : ''))}
                              onFocus={(e) => {
                                const input = e.target as HTMLInputElement;
                                const currentRatio = item.ratio;
                                if (currentRatio === 1 || currentRatio === 0 || currentRatio === null || currentRatio === undefined) {
                                  setRatioInputValues(prev => ({ ...prev, [index]: '' }));
                                  input.value = '';
                                } else {
                                  input.select();
                                }
                              }}
                              onMouseDown={(e) => {
                                const input = e.target as HTMLInputElement;
                                const currentRatio = item.ratio;
                                if (currentRatio === 1 || currentRatio === 0 || currentRatio === null || currentRatio === undefined) {
                                  setRatioInputValues(prev => ({ ...prev, [index]: '' }));
                                  input.value = '';
                                }
                              }}
                              onChange={(e) => {
                                let val = e.target.value;
                                val = val.replace(/[^\d.,]/g, '');
                                const cleaned = removeLeadingZero(val);
                                setRatioInputValues(prev => ({ ...prev, [index]: cleaned }));
                                handleUpdateRatio(index, cleaned === '' ? '1' : cleaned);
                              }}
                              onBlur={(e) => {
                                const val = e.target.value;
                                if (val === '' || isNaN(Number(val)) || Number(val) <= 0) {
                                  handleUpdateRatio(index, '1');
                                  setRatioInputValues(prev => {
                                    const newVal = { ...prev };
                                    delete newVal[index];
                                    return newVal;
                                  });
                                } else {
                                  handleUpdateRatio(index, val);
                                  setRatioInputValues(prev => {
                                    const newVal = { ...prev };
                                    delete newVal[index];
                                    return newVal;
                                  });
                                }
                              }}
                              onKeyDown={(e) => {
                                const input = e.target as HTMLInputElement;
                                const currentVal = input.value;
                                if ((currentVal === '' || currentVal === '0' || currentVal === '1') && /^[1-9]$/.test(e.key)) {
                                  e.preventDefault();
                                  const newVal = e.key;
                                  setRatioInputValues(prev => ({ ...prev, [index]: newVal }));
                                  input.value = newVal;
                                  handleUpdateRatio(index, newVal);
                                }
                              }}
                              placeholder="1"
                              style={{
                                width: '100px',
                                padding: '6px 8px',
                                border: '1px solid var(--border-color)',
                                borderRadius: '4px',
                                backgroundColor: 'var(--bg-primary)',
                                color: 'var(--text-primary)',
                                textAlign: 'right',
                              }}
                            />
                          </td>
                          <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', textAlign: 'right', color: 'var(--text-secondary)' }}>
                            {Math.ceil(calculatedQty)}
                          </td>
                          <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)' }}>
                            {unit}
                          </td>
                          <td style={{ padding: '10px', borderBottom: '1px solid var(--border-color)', textAlign: 'center' }}>
                            <Button 
                              variant="danger" 
                              onClick={() => handleRemoveBOMItem(index)}
                              style={{ padding: '4px 8px', fontSize: '12px' }}
                            >
                              Hapus
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Simpan BOM
          </Button>
        </div>
      </Card>
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

export default BOMDialog;

