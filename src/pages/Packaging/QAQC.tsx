import React, { useState, useEffect, useMemo, useRef } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import NotificationBell from '../../components/NotificationBell';
import { storageService } from '../../services/storage';
import { openPrintWindow } from '../../utils/actions';
import { filterActiveItems } from '../../utils/data-persistence-helper';
import { deletePackagingItem } from '../../utils/packaging-delete-helper';
import * as XLSX from 'xlsx';
import { createStyledWorksheet, setColumnWidths, ExcelColumn } from '../../utils/excel-helper';
import '../../styles/common.css';
import '../../styles/compact.css';

interface QCResult {
  id: string;
  qcNo?: string;
  productionNo?: string;
  spkNo?: string;
  soNo: string;
  customer: string;
  product: string;
  qty: number;
  qcResult?: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSE';
  created: string;
  batchNo?: string; // Batch number (A, B, C, etc.)
  sjGroupId?: string; // SJ Group ID untuk delivery batch trigger
  deliveryBatches?: any[]; // Delivery batches info dari schedule
}

// Action Menu Component untuk QC (dropdown 3 titik)
const QCActionMenu = ({
  item,
  onViewDetail,
  onQCCheck,
  onPrint,
  onDelete,
}: {
  item: QCResult;
  onViewDetail?: () => void;
  onQCCheck?: () => void;
  onPrint?: () => void;
  onDelete?: () => void;
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
          buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  useEffect(() => {
    if (showMenu && buttonRef.current) {
      // Use requestAnimationFrame to ensure menu is rendered before calculating position
      requestAnimationFrame(() => {
        if (!buttonRef.current) return;
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const menuHeight = 200; // Estimated menu height
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        const spaceAbove = buttonRect.top;
        const gap = 0; // No gap for tight positioning
        
        // If not enough space below but enough space above, position above
        if (spaceBelow < menuHeight && spaceAbove > menuHeight) {
          setMenuPosition({
            top: buttonRect.top - menuHeight - gap,
            right: window.innerWidth - buttonRect.left,
          });
        } else {
          // Default: position below with small gap
          setMenuPosition({
            top: buttonRect.bottom + gap,
            right: window.innerWidth - buttonRect.left,
          });
        }
      });
    }
  }, [showMenu]);

  return (
    <>
      <div ref={buttonRef} style={{ position: 'relative', display: 'inline-block' }}>
        <Button 
          variant="secondary" 
          onClick={() => setShowMenu(!showMenu)}
          style={{ fontSize: '10px', padding: '3px 6px', minHeight: '24px' }}
        >
          ⋮
        </Button>
      </div>
      {showMenu && (
        <div 
          ref={menuRef}
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            right: `${menuPosition.right}px`,
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10000,
            minWidth: '160px',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {onViewDetail && (
            <button
              onClick={() => { onViewDetail(); setShowMenu(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '11px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              👁️ View Detail
            </button>
          )}
          {onQCCheck && item.status === 'OPEN' && (
            <button
              onClick={() => { onQCCheck(); setShowMenu(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '11px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              ✅ QC Check
            </button>
          )}
          {onPrint && (
            <button
              onClick={() => { onPrint(); setShowMenu(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '11px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              🖨️ Print Preview
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => { onDelete(); setShowMenu(false); }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '6px 10px',
                border: 'none',
                background: 'transparent',
                color: '#f44336',
                cursor: 'pointer',
                fontSize: '11px',
                borderRadius: '4px',
                borderTop: '1px solid var(--border-color)',
                marginTop: '4px',
                paddingTop: '8px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              🗑️ Delete
            </button>
          )}
        </div>
      )}
    </>
  );
};

const QAQC = () => {
  const [qcResults, setQcResults] = useState<QCResult[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [selectedQCForCheck, setSelectedQCForCheck] = useState<QCResult | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogState, setDialogState] = useState<{
    show: boolean;
    type?: 'alert' | 'confirm';
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    type: 'alert',
    title: '',
    message: '',
    confirmLabel: 'OK',
  });

  const showAlert = (title: string, message: string, confirmLabel = 'OK') => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'alert',
      title,
      message,
      confirmLabel,
      onConfirm: undefined,
    });
  };

  const closeDialog = () => {
    setDialogState(prev => ({ ...prev, show: false }));
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
  };

  useEffect(() => {
    loadQCResults();
    // Refresh setiap 2 detik untuk cek notifikasi baru
    const interval = setInterval(loadQCResults, 2000);
    return () => clearInterval(interval);
  }, []);

  const loadQCResults = async () => {
    let data = await storageService.get<QCResult[]>('qc') || [];
    // Ensure data is always an array and filter deleted items (tombstone pattern)
    const dataArray = Array.isArray(data) ? data : [];
    const activeData = filterActiveItems(dataArray);
    setQcResults(activeData);
    
    // Helper function untuk match SPK (handle batch format)
    const matchSPK = (spk1: string, spk2: string): boolean => {
      if (!spk1 || !spk2) return false;
      if (spk1 === spk2) return true;
      const normalize = (spk: string) => spk.replace(/-/g, '/');
      const normalized1 = normalize(spk1);
      const normalized2 = normalize(spk2);
      if (normalized1 === normalized2) return true;
      const base1 = normalized1.split('/').slice(0, 2).join('/');
      const base2 = normalized2.split('/').slice(0, 2).join('/');
      return base1 === base2;
    };
    
    // Filter notifications - QC yang status OPEN (baru dari Production)
    // IMPORTANT: Exclude QC yang sudah CLOSE atau sudah ada QC record dengan status CLOSE untuk SPK yang sama
    const pendingQC = activeData.filter((q: any) => {
      // Skip jika status bukan OPEN
      if (q.status !== 'OPEN') {
        return false;
      }
      
      // Skip jika sudah ada QC record dengan status CLOSE untuk SPK yang sama
      const hasClosedQC = activeData.some((existingQC: any) => {
        if (existingQC.id === q.id) return false; // Skip diri sendiri
        if (existingQC.status !== 'CLOSE') return false; // Hanya cek yang CLOSE
        
        // Match berdasarkan spkNo (jika ada)
        if (q.spkNo && existingQC.spkNo) {
          return matchSPK(q.spkNo, existingQC.spkNo);
        }
        
        // Match berdasarkan soNo (jika tidak ada spkNo)
        if (q.soNo && existingQC.soNo) {
          return (q.soNo || '').toString().trim() === (existingQC.soNo || '').toString().trim();
        }
        
        return false;
      });
      
      if (hasClosedQC) {
        console.log(`[QC Filter] Excluding QC ${q.qcNo || q.id} for SPK ${q.spkNo || q.soNo}: already has CLOSE QC record`);
        return false;
      }
      
      return true;
    }).sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());
    
    setNotifications(pendingQC);
  };

  const handleViewDetail = (item: QCResult) => {
    let detailMsg = `SO No: ${item.soNo}\nCustomer: ${item.customer}\nProduct: ${item.product}\nQty: ${item.qty}`;
    
    // Tampilkan batch info jika ada
    if (item.batchNo) {
      detailMsg += `\nBatch: ${item.batchNo}`;
    }
    if (item.sjGroupId) {
      detailMsg += `\nSJ Group ID: ${item.sjGroupId}`;
    }
    if (item.deliveryBatches && item.deliveryBatches.length > 0) {
      detailMsg += `\n\nDelivery Batches:`;
      item.deliveryBatches.forEach((batch: any, idx: number) => {
        detailMsg += `\n  Batch ${batch.batchNo || String.fromCharCode(65 + idx)}: ${batch.qty} PCS`;
        if (batch.deliveryDate) {
          const deliveryDate = new Date(batch.deliveryDate).toLocaleDateString('id-ID');
          detailMsg += ` (Delivery: ${deliveryDate})`;
        }
      });
    }
    
    showAlert('QC Detail', detailMsg);
  };

  const handleQCCheck = (item: QCResult) => {
    setSelectedQCForCheck(item);
  };

  const handleSaveQCCheck = async (data: any) => {
    if (!selectedQCForCheck) return;
    
    try {
      // Cek production status - QC hanya bisa dilakukan setelah production CLOSE
      const productionList = await storageService.get<any[]>('production') || [];
      const production = productionList.find((p: any) => 
        p.soNo === selectedQCForCheck.soNo && p.status === 'CLOSE'
      );
      
      if (!production) {
        showAlert(
          'QC Check blocked',
          `Cannot perform QC Check for SO: ${selectedQCForCheck.soNo}\n\nProduction must be CLOSE first.`,
        );
        return;
      }
      
      // Update QC status
      const qcList = await storageService.get<any[]>('qc') || [];
      const updated = qcList.map(q =>
        q.id === selectedQCForCheck.id 
          ? { 
              ...q, 
              status: 'CLOSE' as const, 
              qcResult: data.qcResult,
              qcNote: data.qcNote,
              qcFiles: data.qcFiles,
              qcDate: new Date().toISOString(),
            }
          : q
      );
      await storageService.set('qc', updated);
      setQcResults(updated);
      
      // Handle QC FAIL: Reset production status dari CLOSE ke OPEN agar bisa submit lagi
      if (data.qcResult === 'FAIL') {
        const productionList = await storageService.get<any[]>('production') || [];
        const updatedProduction = productionList.map((p: any) => {
          // Reset production status jika QC FAIL (bisa submit lagi)
          if ((p.soNo === selectedQCForCheck.soNo || p.spkNo === selectedQCForCheck.spkNo) && p.status === 'CLOSE') {
            console.log(`🔄 [QC FAIL] Reset production ${p.productionNo || p.grnNo} status dari CLOSE ke OPEN`);
            return { ...p, status: 'OPEN' };
          }
          return p;
        });
        await storageService.set('production', updatedProduction);
        
        // Reset schedule status juga jika ada
        const scheduleList = await storageService.get<any[]>('schedule') || [];
        const updatedSchedules = scheduleList.map((s: any) => {
          if (s.spkNo === selectedQCForCheck.spkNo && s.status === 'CLOSE') {
            console.log(`🔄 [QC FAIL] Reset schedule ${s.spkNo} status dari CLOSE ke OPEN`);
            return { ...s, status: 'OPEN' };
          }
          return s;
        });
        await storageService.set('schedule', updatedSchedules);
        
        showAlert(
          `⚠️ QC Result: FAIL\n\n` +
          `Production status telah di-reset ke OPEN.\n` +
          `Production dapat submit result lagi untuk memperbaiki produk yang gagal QC.\n\n` +
          `Note: Material yang sudah digunakan tetap terpakai (tidak di-return).`,
          'QC FAIL'
        );
        setSelectedQCForCheck(null);
        await loadQCResults();
        return; // Stop di sini, tidak lanjut ke inventory update
      }
      
      // Handle QC PARTIAL: Sebagian PASS, sebagian FAIL
      if (data.qcResult === 'PARTIAL' || (data.qtyPassed && data.qtyFailed && data.qtyPassed > 0 && data.qtyFailed > 0)) {
        const qtyPassed = data.qtyPassed || 0;
        const qtyFailed = data.qtyFailed || 0;
        
        // Update inventory hanya untuk qty yang PASS
        // (Inventory update logic akan menggunakan qtyPassed, bukan qty total)
        
        // Reset production status ke OPEN untuk qty yang FAIL (bisa submit lagi)
        if (qtyFailed > 0) {
          const productionList = await storageService.get<any[]>('production') || [];
          const updatedProduction = productionList.map((p: any) => {
            if ((p.soNo === selectedQCForCheck.soNo || p.spkNo === selectedQCForCheck.spkNo) && p.status === 'CLOSE') {
              console.log(`🔄 [QC PARTIAL] Reset production ${p.productionNo || p.grnNo} status dari CLOSE ke OPEN untuk qty FAIL: ${qtyFailed}`);
              return { ...p, status: 'OPEN' };
            }
            return p;
          });
          await storageService.set('production', updatedProduction);
          
          // Reset schedule status juga jika ada
          const scheduleList = await storageService.get<any[]>('schedule') || [];
          const updatedSchedules = scheduleList.map((s: any) => {
            if (s.spkNo === selectedQCForCheck.spkNo && s.status === 'CLOSE') {
              console.log(`🔄 [QC PARTIAL] Reset schedule ${s.spkNo} status dari CLOSE ke OPEN untuk qty FAIL: ${qtyFailed}`);
              return { ...s, status: 'OPEN' };
            }
            return s;
          });
          await storageService.set('schedule', updatedSchedules);
        }
        
        // Update QC record dengan qtyPassed dan qtyFailed
        const qcList = await storageService.get<any[]>('qc') || [];
        const updatedQC = qcList.map(q =>
          q.id === selectedQCForCheck.id 
            ? { 
                ...q, 
                status: 'CLOSE' as const, 
                qcResult: 'PARTIAL',
                qtyPassed: qtyPassed,
                qtyFailed: qtyFailed,
                qcNote: data.qcNote,
                qcFiles: data.qcFiles,
                qcDate: new Date().toISOString(),
              }
            : q
        );
        await storageService.set('qc', updatedQC);
        setQcResults(updatedQC);
        
        // Update inventory hanya untuk qty yang PASS (gunakan qtyPassed, bukan qty total)
        // Lanjut ke inventory update dengan qtyPassed
        const inventoryUpdateQty = qtyPassed;
        
        showAlert(
          `⚠️ QC Result: PARTIAL\n\n` +
          `Qty PASS: ${qtyPassed} PCS\n` +
          `Qty FAIL: ${qtyFailed} PCS\n\n` +
          `Inventory akan di-update untuk qty PASS (${qtyPassed} PCS).\n` +
          `Production status di-reset ke OPEN untuk qty FAIL (${qtyFailed} PCS) agar bisa submit lagi.`,
          'QC PARTIAL'
        );
        
        // Update inventory dengan qtyPassed (lanjut ke logic inventory update di bawah)
        // Tapi gue perlu modify logic inventory update untuk pakai qtyPassed
        // Untuk sekarang, gue akan set flag untuk pakai qtyPassed
        selectedQCForCheck.qty = inventoryUpdateQty; // Override qty untuk inventory update
      }
      
      // Auto-close SPK if PASS (full PASS atau PARTIAL dengan semua qty sudah di-handle)
      if (data.qcResult === 'PASS' || (data.qcResult === 'PARTIAL' && data.qtyFailed === 0)) {
        const spkList = await storageService.get<any[]>('spk') || [];
        const updatedSPK = spkList.map((s: any) =>
          (s.soNo === selectedQCForCheck.soNo || s.spkNo === selectedQCForCheck.spkNo) && s.status === 'OPEN'
            ? { ...s, status: 'CLOSE' }
            : s
        );
        await storageService.set('spk', updatedSPK);
        
        // Update inventory - Product RECEIVE dari QC PASS (bukan dari Production)
        try {
          const inventory = await storageService.get<any[]>('inventory') || [];
          const products = await storageService.get<any[]>('products') || [];
          const customers = await storageService.get<any[]>('customers') || [];
          const salesOrders = await storageService.get<any[]>('salesOrders') || [];
          
          const so = salesOrders.find((s: any) => s.soNo === selectedQCForCheck.soNo);
          const spkList = await storageService.get<any[]>('spk') || [];
          const spkNo = selectedQCForCheck.spkNo || '';
          
          // Cari SPK untuk mendapatkan product yang spesifik
          const spk = spkList.find((s: any) => s.spkNo === spkNo);
          const qcProductName = (selectedQCForCheck.product || '').toString().trim().toLowerCase();
          const qcProductId = spk?.product_id || spk?.kode || '';
          
          if (so && so.items) {
            for (const soItem of so.items) {
              const productId = (soItem.productId || soItem.productKode || '').toString().trim();
              const product = products.find((p: any) => {
                const pId = (p.product_id || p.kode || '').toString().trim();
                return pId === productId || pId.toLowerCase() === productId.toLowerCase();
              });
              
              if (!product) {
                console.warn(`⚠️ [QC Inventory] Product not found: ${productId}`);
                continue;
              }
              
              const productCode = product.product_id || product.kode || '';
              const productName = product.nama || '';
              
              // FILTER: Hanya update product yang sesuai dengan QC (berdasarkan product name atau product_id dari SPK)
              // QC PASS hanya untuk 1 product dengan 1 SPK, bukan semua product di SO
              const productNameMatch = qcProductName && productName.toLowerCase().trim() === qcProductName;
              const productIdMatch = qcProductId && (productCode.toLowerCase() === qcProductId.toLowerCase() || productId.toLowerCase() === qcProductId.toLowerCase());
              
              if (!productNameMatch && !productIdMatch && (qcProductName || qcProductId)) {
                console.log(`ℹ️ [QC Inventory] Skip product ${productName} (${productCode}) - tidak match dengan QC product: ${selectedQCForCheck.product} (SPK: ${spkNo})`);
                continue; // Skip product yang tidak match
              }
              
              // IMPORTANT: Pakai qty dari soItem (per product), BUKAN dari selectedQCForCheck.qty (total)
              // Karena setiap product di SO punya qty masing-masing
              // Tapi jika ada qtyPassed dari QC PARTIAL, pakai itu (proporsional dengan soItem.qty)
              let qtyPassed = soItem.qty || 0;
              if (data.qcResult === 'PARTIAL' && data.qtyPassed) {
                // Jika QC PARTIAL, hitung proporsional qtyPassed untuk product ini
                const totalQty = selectedQCForCheck.qty || soItem.qty || 0;
                const qtyPassedRatio = totalQty > 0 ? data.qtyPassed / totalQty : 0;
                qtyPassed = Math.round(soItem.qty * qtyPassedRatio);
              }
              
              // Get price dari SO (Sales Order) - bukan dari master product
              const soPrice = soItem.price || soItem.unitPrice || 0;
              const pricePerUnit = qtyPassed > 0 ? soPrice / qtyPassed : soPrice;
              
              // Find existing product inventory
              let existingProductInventory = inventory.find((inv: any) => {
                const invCode = (inv.codeItem || '').toString().trim().toLowerCase();
                const invDesc = (inv.description || '').toLowerCase().trim();
                const searchCode = productCode.toLowerCase().trim();
                const searchName = productName.toLowerCase().trim();
                return invCode === searchCode || invDesc === searchName;
              });
              
              // Get customer untuk supplierName (Product = Customer)
              const customer = customers.find((c: any) => c.nama === selectedQCForCheck.customer) || customers[0];
              
              // ANTI-DUPLICATE: Cek di inventory apakah SPK sudah pernah diproses
              if (existingProductInventory && spkNo) {
                const processedSPKs = existingProductInventory.processedSPKs || [];
                if (processedSPKs.includes(spkNo)) {
                  console.warn(`⚠️ [QC Inventory] SPK ${spkNo} sudah pernah diproses untuk product ${productCode}. Skip update.`);
                  continue; // Skip product ini, lanjut ke product berikutnya
                }
              }
              
              if (existingProductInventory) {
                // Update existing product inventory - tambah RECEIVE dari QC PASS
                // Update price dengan price dari SO (jika ada)
                const oldReceive = existingProductInventory.receive || 0;
                const newReceive = oldReceive + qtyPassed;
                const updatedPrice = soPrice > 0 ? pricePerUnit : (existingProductInventory.price || product.hargaFg || product.hargaSales || 0);
                
                // Tambahkan SPK number ke processedSPKs untuk anti-duplicate
                const processedSPKs = existingProductInventory.processedSPKs || [];
                if (spkNo && !processedSPKs.includes(spkNo)) {
                  processedSPKs.push(spkNo);
                }
                
                existingProductInventory.receive = newReceive;
                existingProductInventory.price = updatedPrice; // Update price dari SO
                existingProductInventory.supplierName = selectedQCForCheck.customer || customer?.nama || existingProductInventory.supplierName;
                existingProductInventory.processedSPKs = processedSPKs; // Track SPK yang sudah diproses
                existingProductInventory.nextStock = 
                  (existingProductInventory.stockPremonth || 0) + 
                  newReceive - 
                  (existingProductInventory.outgoing || 0) + 
                  (existingProductInventory.return || 0);
                existingProductInventory.lastUpdate = new Date().toISOString();
                console.log(`✅ [QC Inventory] Product inventory updated (RECEIVE from QC PASS - SPK ${spkNo}):`);
                console.log(`   Product: ${productName} (${productCode})`);
                console.log(`   SPK: ${spkNo}`);
                console.log(`   Receive: ${oldReceive} → ${newReceive} (+${qtyPassed})`);
                console.log(`   Price: ${updatedPrice} (from SO)`);
                console.log(`   Customer: ${selectedQCForCheck.customer}`);
              } else {
                // Create new product inventory entry
                // Price diambil dari SO, bukan dari master product
                const productPrice = soPrice > 0 ? pricePerUnit : (product.hargaFg || product.hargaSales || 0);
                const newInventoryEntry = {
                  id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                  supplierName: selectedQCForCheck.customer || customer?.nama || '',
                  codeItem: productCode,
                  description: productName,
                  kategori: product.kategori || 'Product',
                  satuan: product.satuan || 'PCS',
                  price: productPrice, // Price dari SO
                  stockPremonth: 0,
                  receive: qtyPassed,
                  outgoing: 0,
                  return: 0,
                  nextStock: 0 + qtyPassed - 0 + 0, // stockPremonth + receive - outgoing + return
                  processedSPKs: spkNo ? [spkNo] : [], // Track SPK yang sudah diproses
                  lastUpdate: new Date().toISOString(),
                };
                inventory.push(newInventoryEntry);
                console.log(`✅ [QC Inventory] New product inventory created (RECEIVE from QC PASS - SPK ${spkNo}):`);
                console.log(`   Product: ${productName} (${productCode})`);
                console.log(`   SPK: ${spkNo}`);
                console.log(`   Receive: ${qtyPassed}`);
                console.log(`   Price: ${productPrice} (from SO)`);
                console.log(`   Customer: ${selectedQCForCheck.customer}`);
              }
            }
          }
          
          await storageService.set('inventory', inventory);
          console.log(`✅ [QC Inventory] Inventory updated for QC PASS`);
        } catch (error: any) {
          console.error(`❌ [QC Inventory] Error updating inventory:`, error);
          // Jangan block QC process jika inventory update gagal
        }
        
        // REMOVED: QC tidak lagi membuat delivery notifications
        // Hanya PPIC yang membuat delivery notifications dari schedule
        // Delivery Note akan auto-update status berdasarkan Production CLOSE + QC PASS
        // Ini mencegah duplikasi notifikasi antara QC dan PPIC
        //   // Support both formats: old format (strip) and new format (slash)
        //   const normalize = (spk: string) => {
        //     // Convert to slash format for comparison
        //     return spk.replace(/-/g, '/');
        //   };
        //   const normalized1 = normalize(spk1);
        //   const normalized2 = normalize(spk2);
        //   if (normalized1 === normalized2) return true;
        //   // Match base SPK (first 2 parts: SPK/251212)
        //   const base1 = normalized1.split('/').slice(0, 2).join('/');
        //   const base2 = normalized2.split('/').slice(0, 2).join('/');
        //   return base1 === base2;
        // };
        // 
        // const qcSpkNo = selectedQCForCheck.spkNo;
        // const qcSoNo = selectedQCForCheck.soNo;
        // 
        // // Cek apakah production sudah CLOSE untuk SPK ini
        // const prod = productionList.find((p: any) => {
        //   if (!p.spkNo) return false;
        //   return qcSpkNo && matchSPK(p.spkNo, qcSpkNo) && p.status === 'CLOSE';
        // });
        
        // REMOVED: QC tidak lagi membuat delivery notifications
        // Hanya PPIC yang membuat delivery notifications dari schedule
        // Delivery Note akan auto-update status berdasarkan Production CLOSE + QC PASS
        // Ini mencegah duplikasi notifikasi antara QC dan PPIC
        
        showAlert(
          'QC Completed',
          `QC Check completed (${data.qcResult})\n\n✅ SPK auto-closed\n✅ Inventory updated (Product RECEIVE from QC PASS)`,
        );
      } else {
        showAlert(
          'QC Result',
          `QC Check completed (${data.qcResult})\n\n⚠️ SPK remains OPEN - production needs rework`,
        );
      }
      
      setSelectedQCForCheck(null);
      await loadQCResults();
    } catch (error: any) {
      showAlert('Error', `Error performing QC check: ${error.message}`);
      throw error;
    }
  };

  const handlePrint = (item: QCResult) => {
    const html = `
        <html>
          <head><title>QC Report ${item.soNo}</title></head>
          <body style="font-family: Arial; padding: 20px;">
            <h1>QC Report ${item.soNo}</h1>
            <p>Customer: ${item.customer}</p>
            <p>Product: ${item.product}</p>
            <p>Qty: ${item.qty}</p>
            <p>Status: ${item.status}</p>
          </body>
        </html>
    `;
    openPrintWindow(html);
  };

  const handleDeleteQC = async (item: QCResult) => {
    if (!item || !item.id) {
      showAlert('QC tidak valid. Mohon coba lagi.', 'Error');
      return;
    }

    const qcNo = item.qcNo || item.id;
    
    // Check if QC has related data (production, delivery, etc.)
    try {
      const [productionList, deliveryList] = await Promise.all([
        storageService.get<any[]>('production') || [],
        storageService.get<any[]>('delivery') || [],
      ]);

      const hasProduction = productionList.some((p: any) => 
        p.soNo === item.soNo || (item.spkNo && p.spkNo === item.spkNo)
      );
      
      const hasDelivery = deliveryList.some((dn: any) => 
        dn.soNo === item.soNo || (item.spkNo && dn.spkNo === item.spkNo) ||
        (dn.items || []).some((itm: any) => itm.spkNo === item.spkNo)
      );

      if (hasProduction || hasDelivery) {
        const reasons: string[] = [];
        if (hasProduction) reasons.push('Production data');
        if (hasDelivery) reasons.push('Delivery Note data');
        
        showAlert(
          `Tidak bisa menghapus QC ${qcNo} karena masih memiliki data turunan:\n\n${reasons.map(r => `• ${r}`).join('\n')}\n\nSilakan bersihkan data turunan tersebut terlebih dahulu.`,
          'Cannot Delete QC'
        );
        return;
      }

      // Show confirmation dialog
      setDialogState({
        show: true,
        type: 'confirm',
        title: 'Delete QC',
        message: `Hapus QC ${qcNo}?\n\nTindakan ini akan:\n• Menghapus QC dari daftar\n• Menghapus notifikasi terkait\n\nPastikan tidak ada proses lanjutan untuk QC ini.`,
        onConfirm: async () => {
          try {
            // 🚀 FIX: Pakai packaging delete helper untuk konsistensi dan sync yang benar
            const deleteResult = await deletePackagingItem('qc', item.id, 'id');
            if (!deleteResult.success) {
              showAlert(`Gagal menghapus QC: ${deleteResult.error || 'Unknown error'}`, 'Error');
              return;
            }
            
            // Reload QC data (loadQCResults sudah pakai filterActiveItems)
            await loadQCResults();
            
            showAlert(`QC ${qcNo} berhasil dihapus.`, 'Success');
          } catch (error: any) {
            showAlert(`Error deleting QC: ${error.message}`, 'Error');
          }
        },
      });
    } catch (error: any) {
      showAlert(`Error checking QC dependencies: ${error.message}`, 'Error');
    }
  };

  const columns = [
    { key: 'qcNo', header: 'QC No' },
    { key: 'productionNo', header: 'Production No' },
    { key: 'soNo', header: 'SO No' },
    { key: 'customer', header: 'Customer' },
    { key: 'product', header: 'Product' },
    { key: 'qty', header: 'Qty' },
    {
      key: 'batchNo',
      header: 'Batch',
      render: (item: QCResult) => (
        item.batchNo ? (
          <span style={{ 
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            backgroundColor: 'var(--bg-tertiary)',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            color: 'var(--primary)',
            border: '1px solid var(--border-color)',
          }}>
            Batch {item.batchNo}
          </span>
        ) : (
          <span style={{ color: 'var(--text-secondary)' }}>-</span>
        )
      ),
    },
    {
      key: 'qcResult',
      header: 'QC Result',
      render: (item: QCResult) => (
        item.qcResult ? (
          <span className={`status-badge status-${item.qcResult.toLowerCase()}`}>
            {item.qcResult}
          </span>
        ) : (
          <span style={{ color: 'var(--text-secondary)' }}>-</span>
        )
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: QCResult) => (
        <span className={`status-badge status-${item.status.toLowerCase()}`}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (item: QCResult) => {
        if (!item.created) return '-';
        try {
          const date = new Date(item.created);
          const day = String(date.getDate()).padStart(2, '0');
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const year = date.getFullYear();
          return `${day}/${month}/${year}`;
        } catch {
          return '-';
        }
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: QCResult) => (
        <QCActionMenu
          item={item}
          onViewDetail={() => handleViewDetail(item)}
          onQCCheck={() => handleQCCheck(item)}
          onPrint={() => handlePrint(item)}
          onDelete={() => handleDeleteQC(item)}
        />
      ),
    },
  ];

  const filteredQCResults = useMemo(() => {
    // Ensure qcResults is always an array
    const qcResultsArray = Array.isArray(qcResults) ? qcResults : [];
    const filtered = qcResultsArray.filter(qc => {
      if (!qc) return false;
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        (qc.qcNo || '').toLowerCase().includes(query) ||
        (qc.productionNo || '').toLowerCase().includes(query) ||
        (qc.spkNo || '').toLowerCase().includes(query) ||
        (qc.soNo || '').toLowerCase().includes(query) ||
        (qc.customer || '').toLowerCase().includes(query) ||
        (qc.product || '').toLowerCase().includes(query) ||
        (qc.status || '').toLowerCase().includes(query) ||
        (qc.qcResult || '').toLowerCase().includes(query)
      );
    });
    
    // Sort: Terbaru di atas, CLOSE di bawah
    return filtered.sort((a, b) => {
      // Priority 1: CLOSE status di bawah, yang lain di atas
      const statusOrder: Record<string, number> = { 'CLOSE': 1, 'OPEN': 0, 'DRAFT': 0 };
      const statusDiff = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
      if (statusDiff !== 0) return statusDiff;
      
      // Priority 2: Yang paling baru di atas (berdasarkan created date)
      const dateA = new Date(a.created || 0).getTime();
      const dateB = new Date(b.created || 0).getTime();
      return dateB - dateA; // Descending (newest first)
    });
  }, [qcResults, searchQuery]);

  // Format notifications untuk NotificationBell
  const qcNotifications = useMemo(() => {
    return notifications.map((notif: any) => ({
      id: notif.id,
      title: `QC ${notif.qcNo || notif.productionNo || 'New'}`,
      message: `SO: ${notif.soNo} | Customer: ${notif.customer} | Product: ${notif.product} | Qty: ${notif.qty} PCS`,
      timestamp: notif.created,
      qc: notif, // Keep original data
    }));
  }, [notifications]);

  const handleExportExcel = async () => {
    try {
      const wb = XLSX.utils.book_new();
      
      // Helper function untuk add summary row
      const addSummaryRow = (ws: XLSX.WorkSheet, columns: ExcelColumn[], summaryData: Record<string, any>) => {
        const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
        const summaryRowIdx = range.e.r + 2;
        const emptyRowIdx = range.e.r + 1;
        
        columns.forEach((_, colIdx) => {
          const emptyCell = XLSX.utils.encode_cell({ r: emptyRowIdx, c: colIdx });
          ws[emptyCell] = { t: 's', v: '' };
          
          const summaryCell = XLSX.utils.encode_cell({ r: summaryRowIdx, c: colIdx });
          const col = columns[colIdx];
          const value = summaryData[col.key] ?? '';
          
          if (col.format === 'currency' && typeof value === 'number') {
            ws[summaryCell] = { t: 'n', v: value, z: '#,##0' };
          } else if (col.format === 'number' && typeof value === 'number') {
            ws[summaryCell] = { t: 'n', v: value };
          } else {
            ws[summaryCell] = { t: 's', v: String(value || '') };
          }
        });
        
        ws['!ref'] = XLSX.utils.encode_range({
          s: { r: 0, c: 0 },
          e: { r: summaryRowIdx, c: range.e.c },
        });
      };
      
      // Load semua QC data (bukan hanya filtered)
      const allQCData = await storageService.get<any[]>('qc') || [];
      
      // Sheet 1: All QC Results - Detail lengkap
      const qcDataExport = allQCData.map((qc: any) => ({
        qcNo: qc.qcNo || '',
        productionNo: qc.productionNo || '',
        spkNo: qc.spkNo || '',
        soNo: qc.soNo || '',
        customer: qc.customer || '',
        product: qc.product || '',
        qty: qc.qty || 0,
        qcResult: qc.qcResult || '',
        qcNote: qc.qcNote || '',
        qcDate: qc.qcDate || '',
        qcFiles: qc.qcFiles ? (Array.isArray(qc.qcFiles) ? qc.qcFiles.length : 1) : 0,
        status: qc.status || '',
        created: qc.created || '',
      }));

      if (qcDataExport.length > 0) {
        const qcColumns: ExcelColumn[] = [
          { key: 'qcNo', header: 'QC No', width: 20 },
          { key: 'productionNo', header: 'Production No', width: 20 },
          { key: 'spkNo', header: 'SPK No', width: 20 },
          { key: 'soNo', header: 'SO No', width: 20 },
          { key: 'customer', header: 'Customer', width: 30 },
          { key: 'product', header: 'Product', width: 40 },
          { key: 'qty', header: 'Qty', width: 12, format: 'number' },
          { key: 'qcResult', header: 'QC Result', width: 15 },
          { key: 'qcNote', header: 'QC Note', width: 50 },
          { key: 'qcDate', header: 'QC Date', width: 18, format: 'date' },
          { key: 'qcFiles', header: 'QC Files Count', width: 15, format: 'number' },
          { key: 'status', header: 'Status', width: 15 },
          { key: 'created', header: 'Created Date', width: 18, format: 'date' },
        ];
        const wsQC = createStyledWorksheet(qcDataExport, qcColumns, 'Sheet 1 - QC Results');
        setColumnWidths(wsQC, qcColumns);
        const totalQty = qcDataExport.reduce((sum, qc) => sum + (qc.qty || 0), 0);
        const passCount = qcDataExport.filter(qc => qc.qcResult === 'PASS').length;
        const failCount = qcDataExport.filter(qc => qc.qcResult === 'FAIL').length;
        addSummaryRow(wsQC, qcColumns, {
          qcNo: 'TOTAL',
          qty: totalQty,
          qcResult: `PASS: ${passCount}, FAIL: ${failCount}`,
        });
        XLSX.utils.book_append_sheet(wb, wsQC, 'Sheet 1 - QC Results');
      }

      // Sheet 2: QC Summary by Status
      const statusSummary: Record<string, any> = {};
      allQCData.forEach((qc: any) => {
        const status = qc.status || 'Unknown';
        const result = qc.qcResult || 'Pending';
        const key = `${status}_${result}`;
        if (!statusSummary[key]) {
          statusSummary[key] = {
            status: status,
            qcResult: result,
            count: 0,
            totalQty: 0,
          };
        }
        statusSummary[key].count++;
        statusSummary[key].totalQty += qc.qty || 0;
      });

      const statusSummaryData = Object.values(statusSummary);
      if (statusSummaryData.length > 0) {
        const statusColumns: ExcelColumn[] = [
          { key: 'status', header: 'Status', width: 15 },
          { key: 'qcResult', header: 'QC Result', width: 15 },
          { key: 'count', header: 'Count', width: 12, format: 'number' },
          { key: 'totalQty', header: 'Total Qty', width: 15, format: 'number' },
        ];
        const wsStatus = createStyledWorksheet(statusSummaryData, statusColumns, 'Sheet 2 - QC Summary');
        setColumnWidths(wsStatus, statusColumns);
        const totalCount = statusSummaryData.reduce((sum: number, s: any) => sum + (s.count || 0), 0);
        const totalSummaryQty = statusSummaryData.reduce((sum: number, s: any) => sum + (s.totalQty || 0), 0);
        addSummaryRow(wsStatus, statusColumns, {
          status: 'TOTAL',
          count: totalCount,
          totalQty: totalSummaryQty,
        });
        XLSX.utils.book_append_sheet(wb, wsStatus, 'Sheet 2 - QC Summary');
      }

      if (wb.SheetNames.length === 0) {
        showAlert('Error', 'No data available to export');
        return;
      }

      const fileName = `QC_Results_Complete_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);
      showAlert('Success', `✅ Exported complete QC data (${qcDataExport.length} QC results) to ${fileName}`);
    } catch (error: any) {
      showAlert('Error', `Error exporting to Excel: ${error.message}`);
    }
  };

  return (
    <div className="module-compact">
      <div className="page-header">
        <h1>QA/QC - Quality Assurance/Quality Control</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {notifications.length > 0 && (
            <NotificationBell
              notifications={qcNotifications}
              onNotificationClick={(notification) => {
                if (notification.qc) {
                  handleQCCheck(notification.qc);
                }
              }}
              icon="📋"
              emptyMessage="Tidak ada QC yang perlu diproses"
            />
          )}
          <Button variant="secondary" onClick={handleExportExcel}>📥 Export Excel</Button>
        </div>
      </div>

      {/* Notifications dari Production - HIDDEN, menggunakan NotificationBell di header */}
      {false && notifications.length > 0 && (
        <Card className="mb-4">
          <div
            style={{
              padding: '12px',
              backgroundColor: document.documentElement.getAttribute('data-theme') === 'light' ? '#4caf50' : '#2e7d32',
              borderRadius: '8px',
              color: document.documentElement.getAttribute('data-theme') === 'light' ? '#1a1a1a' : '#ffffff',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
                  📧 New Notifications ({notifications.length})
                </h3>
                <div style={{ fontSize: '14px', marginTop: '4px' }}>
                  Production selesai, siap untuk QC Check
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by QC No, Production No, SPK No, SO No, Customer, Product, Status, QC Result..."
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
        <Table columns={columns} data={filteredQCResults} emptyMessage={searchQuery ? "No QC results found matching your search" : "No QC results"} />
      </Card>

      {selectedQCForCheck && (
        <QCCheckDialog
          qc={selectedQCForCheck}
          onClose={() => setSelectedQCForCheck(null)}
          onSave={handleSaveQCCheck}
          showAlert={showAlert}
        />
      )}

      {dialogState.show && (() => {
        const titleLower = (dialogState.title || 'Info').toLowerCase();
        let iconType = 'info';
        let iconChar = 'ℹ️';
        if (titleLower.includes('success') || titleLower.includes('berhasil')) {
          iconType = 'success';
          iconChar = '✓';
        } else if (titleLower.includes('error') || titleLower.includes('gagal') || titleLower.includes('cannot')) {
          iconType = 'error';
          iconChar = '✕';
        } else if (titleLower.includes('warning') || titleLower.includes('peringatan') || titleLower.includes('validation')) {
          iconType = 'warning';
          iconChar = '⚠';
        }
        
        return (
          <div className="dialog-overlay" onClick={dialogState.type === 'alert' ? closeDialog : undefined}>
            <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
              <div className={`dialog-icon ${iconType}`}>
                {iconChar}
              </div>
              <h3 className="dialog-title">
                {dialogState.title || 'Info'}
              </h3>
              <div className="dialog-message">
                {dialogState.message}
              </div>
              <div className="dialog-actions">
                {dialogState.type === 'confirm' && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      if (dialogState.onCancel) dialogState.onCancel();
                      closeDialog();
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={() => {
                    if (dialogState.onConfirm) {
                      dialogState.onConfirm();
                    }
                    if (dialogState.type === 'alert') {
                      closeDialog();
                    }
                  }}
                >
                  {dialogState.type === 'confirm' ? 'Confirm' : (dialogState.confirmLabel || 'OK')}
                </Button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

// QC Check Dialog Component
const QCCheckDialog = ({
  qc,
  onClose,
  onSave,
  showAlert,
}: {
  qc: QCResult;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
  showAlert: (title: string, message: string) => void;
}) => {
  const [qcResult, setQcResult] = useState<string>('PASS');
  const [qtyPassed, setQtyPassed] = useState<string>(qc.qty?.toString() || '0');
  const [qtyFailed, setQtyFailed] = useState<string>('0');
  const [qcNote, setQcNote] = useState<string>('');
  const [qcFiles, setQcFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setQcFiles(files);
  };

  const handleSubmit = async () => {
    if (!['PASS', 'FAIL'].includes(qcResult.toUpperCase())) {
      showAlert('Validation', 'QC Result harus PASS atau FAIL');
      return;
    }

    const qtyPassedNum = parseFloat(qtyPassed || '0') || 0;
    const qtyFailedNum = parseFloat(qtyFailed || '0') || 0;
    const totalQty = qtyPassedNum + qtyFailedNum;
    const qcQty = qc.qty || 0;

    // Validasi: total qtyPassed + qtyFailed tidak boleh melebihi qty di QC
    if (totalQty > qcQty) {
      showAlert('Validation Error', `Total qty PASS + FAIL (${totalQty}) melebihi qty QC (${qcQty} PCS)`);
      return;
    }

    // Jika QC Result = PASS, qtyPassed harus > 0
    if (qcResult === 'PASS' && qtyPassedNum <= 0) {
      showAlert('Validation Error', 'Qty PASS harus lebih dari 0 jika QC Result = PASS');
      return;
    }

    // Jika QC Result = FAIL, qtyFailed harus > 0
    if (qcResult === 'FAIL' && qtyFailedNum <= 0) {
      showAlert('Validation Error', 'Qty FAIL harus lebih dari 0 jika QC Result = FAIL');
      return;
    }

    // Jika QC Result = PARTIAL, qtyPassed dan qtyFailed harus > 0
    if (qcResult === 'PARTIAL') {
      if (qtyPassedNum <= 0 || qtyFailedNum <= 0) {
        showAlert('Validation Error', 'Qty PASS dan Qty FAIL harus lebih dari 0 jika QC Result = PARTIAL');
        return;
      }
    }

    // Convert files to base64
    const qcFilesBase64: any[] = [];
    for (const file of qcFiles) {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      qcFilesBase64.push({
        name: file.name,
        data: base64,
      });
    }

    const submitData = {
      qcResult: qcResult.toUpperCase(),
      qtyPassed: qtyPassedNum,
      qtyFailed: qtyFailedNum,
      qcNote: qcNote.trim(),
      qcFiles: qcFilesBase64.length > 0 ? qcFilesBase64 : undefined,
    };

    setLoading(true);
    try {
      await onSave(submitData);
      onClose();
    } catch (error: any) {
      showAlert('Error', `Error submitting QC check: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
        <Card className="dialog-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>QC Check</h2>
            <Button variant="secondary" onClick={onClose} style={{ padding: '6px 12px' }}>✕</Button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: '6px', fontSize: '13px' }}>
              <div><strong>QC No:</strong> {qc.qcNo || '-'}</div>
              <div><strong>Production No:</strong> {qc.productionNo || '-'}</div>
              <div><strong>SPK No:</strong> {qc.spkNo || '-'}</div>
              <div><strong>SO No:</strong> {qc.soNo}</div>
              <div><strong>Customer:</strong> {qc.customer}</div>
              <div><strong>Product:</strong> {qc.product}</div>
              <div><strong>Qty:</strong> {qc.qty} PCS</div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              QC Result *
            </label>
            <select
              value={qcResult}
              onChange={(e) => {
                setQcResult(e.target.value);
                // Auto-set qty berdasarkan result
                if (e.target.value === 'PASS') {
                  setQtyPassed(qc.qty?.toString() || '0');
                  setQtyFailed('0');
                } else if (e.target.value === 'FAIL') {
                  setQtyPassed('0');
                  setQtyFailed(qc.qty?.toString() || '0');
                }
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="PASS">PASS</option>
              <option value="FAIL">FAIL</option>
              <option value="PARTIAL">PARTIAL (PASS + FAIL)</option>
            </select>
          </div>

          {qcResult === 'PARTIAL' && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Qty PASS * (Max: {qc.qty} PCS)
                </label>
                <input
                  type="number"
                  value={qtyPassed}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQtyPassed(val);
                    // Auto-calculate qtyFailed
                    const passed = parseFloat(val || '0') || 0;
                    const failed = Math.max(0, (qc.qty || 0) - passed);
                    setQtyFailed(failed.toString());
                  }}
                  min="0"
                  max={qc.qty || 0}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
                  Qty FAIL * (Auto-calculated)
                </label>
                <input
                  type="number"
                  value={qtyFailed}
                  onChange={(e) => {
                    const val = e.target.value;
                    setQtyFailed(val);
                    // Auto-calculate qtyPassed
                    const failed = parseFloat(val || '0') || 0;
                    const passed = Math.max(0, (qc.qty || 0) - failed);
                    setQtyPassed(passed.toString());
                  }}
                  min="0"
                  max={qc.qty || 0}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid var(--border-color)',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              QC Note
            </label>
            <textarea
              value={qcNote}
              onChange={(e) => setQcNote(e.target.value)}
              placeholder="Enter QC notes or remarks..."
              rows={4}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>
              QC Files (Optional)
            </label>
            <input
              type="file"
              multiple
              onChange={handleFileChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            />
            {qcFiles.length > 0 && (
              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {qcFiles.length} file(s) selected
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit QC Check'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};



export default QAQC;
