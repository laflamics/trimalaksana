import { useState, useEffect, useMemo } from 'react';
import Card from '../../components/Card';
import Table from '../../components/Table';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { storageService, extractStorageValue } from '../../services/storage';
import { loadLogoAsBase64 } from '../../utils/logo-loader';
import { generateBacHtml } from '../../pdf/bac-pdf-template';
import { openPrintWindow } from '../../utils/actions';
import { useDialog } from '../../hooks/useDialog';
import '../../styles/common.css';
import '../../styles/compact.css';

interface ReturnItem {
  id: string;
  returnNo: string;
  sourceType: 'SO' | 'PO';
  sourceNo: string; // SO No atau PO No
  productId: string;
  productName: string;
  productKode: string;
  qty: number;
  unit: string;
  reason?: string;
  notes?: string;
  status: 'DRAFT' | 'CONFIRMED';
  created: string;
  createdBy?: string;
}

interface SalesOrder {
  id: string;
  soNo: string;
  customer: string;
  items?: Array<{
    productId?: string;
    productKode?: string;
    productName?: string;
    qty: number;
    unit?: string;
    price?: number;
  }>;
}

interface PurchaseOrder {
  id: string;
  poNo: string;
  supplier: string;
  productItem: string;
  productId?: string;
  qty: number;
  price: number;
}

const Return = () => {
  const [returns, setReturns] = useState<ReturnItem[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewPdfData, setViewPdfData] = useState<{ html: string; returnNo: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'error' | 'info' } | null>(null);
  
  // Custom Dialog - menggunakan hook terpusat
  const { showAlert: showAlertBase, DialogComponent } = useDialog();
  
  // Wrapper untuk kompatibilitas dengan urutan parameter yang berbeda
  const showAlert = (title: string, message: string) => {
    showAlertBase(message, title);
  };
  
  const [formData, setFormData] = useState<Partial<ReturnItem>>({
    sourceType: 'SO',
    sourceNo: '',
    productId: '',
    productName: '',
    productKode: '',
    qty: 0,
    unit: 'PCS',
    reason: '',
    notes: '',
    status: 'DRAFT',
  });
  const [selectedSourceItems, setSelectedSourceItems] = useState<Array<{
    productId: string;
    productKode: string;
    productName: string;
    qty: number;
    unit: string;
  }>>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [returnsData, soData, poData] = await Promise.all([
        storageService.get<ReturnItem[]>('gt_returns'),
        storageService.get<SalesOrder[]>('gt_salesOrders'),
        storageService.get<PurchaseOrder[]>('gt_purchaseOrders'),
      ]);

      setReturns(extractStorageValue(returnsData) || []);
      setSalesOrders(extractStorageValue(soData) || []);
      setPurchaseOrders(extractStorageValue(poData) || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timeout);
  }, [toast]);

  const showToast = (message: string, variant: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, variant });
  };


  const handleSourceTypeChange = (type: 'SO' | 'PO') => {
    setFormData({
      ...formData,
      sourceType: type,
      sourceNo: '',
      productId: '',
      productName: '',
      productKode: '',
      qty: 0,
    });
    setSelectedSourceItems([]);
  };

  const handleSourceNoChange = async (sourceNo: string) => {
    if (!sourceNo) {
      setSelectedSourceItems([]);
      return;
    }

    setFormData({
      ...formData,
      sourceNo,
      productId: '',
      productName: '',
      productKode: '',
      qty: 0,
    });

    // Load items dari SO atau PO
    if (formData.sourceType === 'SO') {
      const so = salesOrders.find(s => s.soNo === sourceNo);
      if (so && so.items) {
        const items = so.items.map((item: any) => ({
          productId: item.productId || item.productKode || '',
          productKode: item.productKode || item.productId || '',
          productName: item.productName || item.product || '',
          qty: Number(item.qty || 0),
          unit: item.unit || 'PCS',
        }));
        setSelectedSourceItems(items);
      } else {
        setSelectedSourceItems([]);
      }
    } else {
      // PO
      const po = purchaseOrders.find(p => p.poNo === sourceNo);
      if (po) {
        setSelectedSourceItems([{
          productId: po.productId || '',
          productKode: po.productId || '',
          productName: po.productItem || '',
          qty: po.qty || 0,
          unit: 'PCS',
        }]);
      } else {
        setSelectedSourceItems([]);
      }
    }
  };

  const handleProductChange = (productName: string) => {
    const item = selectedSourceItems.find(i => 
      i.productName === productName || 
      i.productKode === productName ||
      i.productId === productName
    );
    
    if (item) {
      setFormData({
        ...formData,
        productId: item.productId,
        productKode: item.productKode,
        productName: item.productName,
        unit: item.unit,
        qty: 0,
      });
    }
  };

  const handleSave = async () => {
    if (!formData.sourceNo || !formData.productName || !formData.qty || formData.qty <= 0) {
      showAlert('Validasi', 'Mohon lengkapi semua field yang wajib!');
      return;
    }

    try {
      setLoading(true);
      
      // Generate Return No
      const now = new Date();
      const year = String(now.getFullYear()).slice(-2);
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const randomCode = Math.random().toString(36).substr(2, 5).toUpperCase();
      const returnNo = `RET-${year}${month}${day}-${randomCode}`;

      const newReturn: ReturnItem = {
        id: Date.now().toString(),
        returnNo,
        sourceType: formData.sourceType || 'SO',
        sourceNo: formData.sourceNo,
        productId: formData.productId || '',
        productName: formData.productName,
        productKode: formData.productKode || '',
        qty: formData.qty || 0,
        unit: formData.unit || 'PCS',
        reason: formData.reason || '',
        notes: formData.notes || '',
        status: 'CONFIRMED',
        created: new Date().toISOString(),
      };

      // Save return
      const currentReturns = extractStorageValue(await storageService.get<ReturnItem[]>('gt_returns')) || [];
      await storageService.set('gt_returns', [...currentReturns, newReturn]);

      // Update inventory - tambah receipt (return)
      const inventory = extractStorageValue(await storageService.get<any[]>('gt_inventory')) || [];
      const products = extractStorageValue(await storageService.get<any[]>('gt_products')) || [];
      const productCode = formData.productKode || formData.productId || '';
      
      // Cek apakah product adalah turunan, jika ya gunakan parent product ID untuk inventory
      let inventoryProductCode = productCode;
      const product = products.find((p: any) => 
        (p.kode || '').toString().trim().toLowerCase() === productCode.toLowerCase() ||
        (p.product_id || '').toString().trim().toLowerCase() === productCode.toLowerCase()
      );
      
      if (product && product.isTurunan && product.parentProductId) {
        const parentProduct = products.find((p: any) => p.id === product.parentProductId);
        if (parentProduct) {
          inventoryProductCode = (parentProduct.kode || parentProduct.product_id || '').toString().trim();
          console.log(`[Return] Product turunan detected: ${product.nama} (${productCode}) -> Using parent: ${parentProduct.nama} (${inventoryProductCode})`);
        }
      }
      
      const inventoryItem = inventory.find((inv: any) => 
        inv.codeItem?.toLowerCase() === inventoryProductCode.toLowerCase() ||
        inv.sku?.toLowerCase() === inventoryProductCode.toLowerCase()
      );

      if (inventoryItem) {
        const updatedInventory = inventory.map((inv: any) => {
          if (inv.id === inventoryItem.id) {
            const stockPremonth = inv.stockPremonth || 0;
            const receive = inv.receive || 0;
            const outgoing = inv.outgoing || 0;
            const returnQty = (inv.return || 0) + (formData.qty || 0);
            // Formula: stockPremonth + receive - outgoing + return
            const nextStock = stockPremonth + receive - outgoing + returnQty;
            
            return {
              ...inv,
              return: returnQty,
              nextStock: nextStock,
              lastUpdate: new Date().toISOString(),
            };
          }
          return inv;
        });
        await storageService.set('gt_inventory', updatedInventory);
      } else {
        // Jika tidak ada di inventory, buat baru
        const stockPremonth = 0;
        const receive = 0;
        const outgoing = 0;
        const returnQty = formData.qty || 0;
        // Formula: stockPremonth + receive - outgoing + return
        const nextStock = stockPremonth + receive - outgoing + returnQty;
        
        const newInventoryItem = {
          id: Date.now().toString(),
          codeItem: inventoryProductCode, // Gunakan parent product code jika turunan
          description: formData.productName,
          kategori: 'Product',
          satuan: formData.unit || 'PCS',
          price: 0,
          stockPremonth: stockPremonth,
          receive: receive,
          outgoing: outgoing,
          return: returnQty,
          nextStock: nextStock,
          lastUpdate: new Date().toISOString(),
        };
        await storageService.set('gt_inventory', [...inventory, newInventoryItem]);
      }

      // Trigger storage change event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-storage-changed', {
          detail: { key: 'gt_returns' }
        }));
        window.dispatchEvent(new CustomEvent('app-storage-changed', {
          detail: { key: 'gt_inventory' }
        }));
      }

      setReturns([...currentReturns, newReturn]);
      setShowForm(false);
      setFormData({
        sourceType: 'SO',
        sourceNo: '',
        productId: '',
        productName: '',
        productKode: '',
        qty: 0,
        unit: 'PCS',
        reason: '',
        notes: '',
        status: 'DRAFT',
      });
      setSelectedSourceItems([]);
      
      showToast('Return berhasil disimpan dan inventory telah diupdate!', 'success');
    } catch (error: any) {
      console.error('Error saving return:', error);
      showToast(`Gagal menyimpan return: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredReturns = useMemo(() => {
    if (!searchQuery) return returns;
    const query = searchQuery.toLowerCase();
    return returns.filter(r =>
      r.returnNo.toLowerCase().includes(query) ||
      r.sourceNo.toLowerCase().includes(query) ||
      r.productName.toLowerCase().includes(query) ||
      r.productKode.toLowerCase().includes(query)
    );
  }, [returns, searchQuery]);

  const columns = [
    { key: 'returnNo', header: 'Return No' },
    { key: 'sourceType', header: 'Source Type' },
    { key: 'sourceNo', header: 'Source No' },
    { key: 'productName', header: 'Product' },
    { key: 'productKode', header: 'Product Code' },
    {
      key: 'qty',
      header: 'Qty',
      render: (item: ReturnItem) => `${item.qty} ${item.unit}`,
    },
    { key: 'reason', header: 'Reason' },
    {
      key: 'created',
      header: 'Created Date',
      render: (item: ReturnItem) => new Date(item.created).toLocaleDateString('id-ID'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item: ReturnItem) => (
        <span style={{ 
          color: item.status === 'CONFIRMED' ? '#4caf50' : '#ff9800',
          fontWeight: '600'
        }}>
          {item.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (item: ReturnItem) => (
        <Button
          variant="secondary"
          onClick={() => handleViewBac(item)}
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          📄 View BAC
        </Button>
      ),
    },
  ];

  const handleViewBac = async (item: ReturnItem) => {
    try {
      // Load company settings
      const companySettings = await storageService.get<any>('companySettings');
      const company = {
        companyName: companySettings?.companyName || 'PT TRIMA LAKSANA JAYA PRATAMA',
        address: companySettings?.address || 'Jl. Raya Bekasi Km. 28, Cikarang, Bekasi 17530',
      };

      // Load logo
      const logo = await loadLogoAsBase64();

      // Load source data (customer atau supplier)
      let sourceData: { customer?: string; supplier?: string } = {};
      if (item.sourceType === 'SO') {
        const so = salesOrders.find(s => s.soNo === item.sourceNo);
        if (so) {
          sourceData = { customer: so.customer };
        }
      } else {
        const po = purchaseOrders.find(p => p.poNo === item.sourceNo);
        if (po) {
          sourceData = { supplier: po.supplier };
        }
      }

      // Generate PDF HTML
      const html = generateBacHtml({
        logo,
        company,
        returnData: item,
        sourceData,
      });

      // Set PDF data untuk preview
      setViewPdfData({ html, returnNo: item.returnNo });
    } catch (error: any) {
      console.error('Error generating BAC PDF:', error);
      showToast(`Gagal generate PDF: ${error.message}`, 'error');
    }
  };

  const handleSaveToPDF = async () => {
    if (!viewPdfData) return;

    try {
      const electronAPI = (window as any).electronAPI;
      const fileName = `BAC-${viewPdfData.returnNo}.pdf`;

      if (electronAPI && typeof electronAPI.savePdf === 'function') {
        const result = await electronAPI.savePdf(viewPdfData.html, fileName);
        if (result.success) {
          showToast(`PDF berhasil disimpan ke:\n${result.path}`, 'success');
          setViewPdfData(null);
        } else if (!result.canceled) {
          showToast(`Gagal menyimpan PDF: ${result.error || 'Unknown error'}`, 'error');
        }
      } else {
        // Fallback: open print window jika tidak ada Electron API
        openPrintWindow(viewPdfData.html);
      }
    } catch (error: any) {
      showToast(`Error saving PDF: ${error.message}`, 'error');
    }
  };

  const sourceOptions = formData.sourceType === 'SO' 
    ? salesOrders.map(so => ({ value: so.soNo, label: `${so.soNo} - ${so.customer}` }))
    : purchaseOrders.map(po => ({ value: po.poNo, label: `${po.poNo} - ${po.supplier}` }));

  return (
    <div className="compact-page">
      <div className="page-header">
        <div>
          <h1 style={{ marginBottom: '8px' }}>Return Barang</h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '14px' }}>
            Kelola return barang dari SO atau PO
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => setShowForm(true)}
          style={{ fontSize: '14px', padding: '8px 16px' }}
        >
          + Tambah Return
        </Button>
      </div>

      {/* Search */}
      <Card className="mb-4">
        <Input
          label="Search"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by Return No, Source No, Product Name..."
        />
      </Card>

      {/* Form Dialog */}
      {showForm && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => {
            setShowForm(false);
            setFormData({
              sourceType: 'SO',
              sourceNo: '',
              productId: '',
              productName: '',
              productKode: '',
              qty: 0,
              unit: 'PCS',
              reason: '',
              notes: '',
              status: 'DRAFT',
            });
            setSelectedSourceItems([]);
          }}
        >
          <Card
            className="dialog-card"
            title="Tambah Return Barang"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflow: 'auto' }}
          >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Source Type *
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleSourceTypeChange('SO')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: `2px solid ${formData.sourceType === 'SO' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    borderRadius: '6px',
                    backgroundColor: formData.sourceType === 'SO' ? 'var(--primary-color)' : 'transparent',
                    color: formData.sourceType === 'SO' ? '#fff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: formData.sourceType === 'SO' ? '600' : '400',
                  }}
                >
                  Sales Order (SO)
                </button>
                <button
                  type="button"
                  onClick={() => handleSourceTypeChange('PO')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    border: `2px solid ${formData.sourceType === 'PO' ? 'var(--primary-color)' : 'var(--border-color)'}`,
                    borderRadius: '6px',
                    backgroundColor: formData.sourceType === 'PO' ? 'var(--primary-color)' : 'transparent',
                    color: formData.sourceType === 'PO' ? '#fff' : 'var(--text-primary)',
                    cursor: 'pointer',
                    fontWeight: formData.sourceType === 'PO' ? '600' : '400',
                  }}
                >
                  Purchase Order (PO)
                </button>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                {formData.sourceType === 'SO' ? 'SO No' : 'PO No'} *
              </label>
              <input
                type="text"
                list={`${formData.sourceType}-list`}
                value={formData.sourceNo || ''}
                onChange={(e) => handleSourceNoChange(e.target.value)}
                placeholder={`-- Pilih ${formData.sourceType === 'SO' ? 'SO' : 'PO'} No --`}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
              <datalist id={`${formData.sourceType}-list`}>
                {sourceOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </datalist>
            </div>
          </div>

          {selectedSourceItems.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Product *
              </label>
              <select
                value={formData.productName || ''}
                onChange={(e) => handleProductChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="">-- Pilih Product --</option>
                {selectedSourceItems.map((item, idx) => (
                  <option key={idx} value={item.productName}>
                    {item.productName} ({item.productKode}) - Qty: {item.qty} {item.unit}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Qty Return *
              </label>
              <input
                type="number"
                value={formData.qty || ''}
                onChange={(e) => setFormData({ ...formData, qty: Number(e.target.value) || 0 })}
                placeholder="0"
                min="0"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
                Unit
              </label>
              <input
                type="text"
                value={formData.unit || 'PCS'}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="PCS"
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Reason (Alasan Return)
            </label>
            <input
              type="text"
              value={formData.reason || ''}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Masukkan alasan return..."
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-primary)', fontWeight: '500' }}>
              Notes (Catatan)
            </label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Masukkan catatan tambahan..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <Button
              variant="secondary"
              onClick={() => {
                setShowForm(false);
                setFormData({
                  sourceType: 'SO',
                  sourceNo: '',
                  productId: '',
                  productName: '',
                  productKode: '',
                  qty: 0,
                  unit: 'PCS',
                  reason: '',
                  notes: '',
                  status: 'DRAFT',
                });
                setSelectedSourceItems([]);
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Return'}
            </Button>
          </div>
          </Card>
        </div>
      )}

      {/* Table */}
      <Card>
        <div className="module-compact">
          {loading && !showForm ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading returns...
            </div>
          ) : filteredReturns.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {searchQuery ? 'No returns found matching your search.' : 'No return data. Click "Tambah Return" to add new return.'}
            </div>
          ) : (
            <Table
              columns={columns}
              data={filteredReturns}
              emptyMessage="No return data available"
            />
          )}
        </div>
      </Card>

      {/* PDF Preview Dialog */}
      {viewPdfData && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
          }}
          onClick={() => setViewPdfData(null)}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90%', width: '1200px', maxHeight: '90vh', overflow: 'auto' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>Preview BAC - {viewPdfData.returnNo}</h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Button variant="primary" onClick={handleSaveToPDF}>
                    💾 Save to PDF
                  </Button>
                  <Button variant="secondary" onClick={() => setViewPdfData(null)}>
                    ✕ Close
                  </Button>
                </div>
              </div>
              <iframe
                srcDoc={viewPdfData.html}
                style={{
                  width: '100%',
                  height: '70vh',
                  border: 'none',
                  backgroundColor: '#fff',
                }}
                title="PDF Preview"
              />
            </Card>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: 20,
            right: 20,
            backgroundColor:
              toast.variant === 'success'
                ? 'rgba(46, 125, 50, 0.95)'
                : toast.variant === 'error'
                ? 'rgba(211, 47, 47, 0.95)'
                : 'rgba(66, 66, 66, 0.95)',
            color: '#fff',
            padding: '12px 18px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 12000,
            minWidth: '240px',
            maxWidth: '400px',
            fontSize: '14px',
            whiteSpace: 'pre-line',
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Custom Dialog - menggunakan hook terpusat */}
      <DialogComponent />
    </div>
  );
};

export default Return;

