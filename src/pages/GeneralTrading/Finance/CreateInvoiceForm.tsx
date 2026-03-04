import { useState, useMemo } from 'react';
import Button from '../../../components/Button';
import { storageService, StorageKeys } from '../../../services/storage';

interface CreateInvoiceFormProps {
  manualInvoiceData: any;
  onDataChange: (updates: any) => void;
  customers: any[];
  onCreateInvoice: (data: any) => void;
  onCancel: () => void;
  createMode: 'sj' | 'so' | 'manual';
  onModeChange: (mode: 'sj' | 'so' | 'manual') => void;
  deliveryNotes: any[];
  salesOrders: any[];
  generateInvoiceNumber: () => string;
  products: any[];
  invoices: any[];
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export const CreateInvoiceForm = ({
  manualInvoiceData,
  onDataChange,
  customers,
  onCreateInvoice,
  onCancel,
  createMode,
  onModeChange,
  deliveryNotes,
  salesOrders,
  generateInvoiceNumber,
  products,
  invoices,
  onSuccess,
  onError,
}: CreateInvoiceFormProps) => {
  const [showEditForm, setShowEditForm] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [selectedSJs, setSelectedSJs] = useState<string[]>([]);
  const [selectedSOs, setSelectedSOs] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [showProductDialog, setShowProductDialog] = useState<number | null>(null);
  const [productDialogSearch, setProductDialogSearch] = useState('');
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);
  const [customerDialogSearch, setCustomerDialogSearch] = useState('');

  const handleSelectDN = (sj: any, isSelected: boolean) => {
    if (isSelected) {
      setSelectedSJs([...selectedSJs, sj.id]);
    } else {
      setSelectedSJs(selectedSJs.filter(id => id !== sj.id));
    }
  };

  const filteredProductsForDialog = useMemo(() => {
    const filtered = products.filter((p: any) => {
      if (!productDialogSearch) return true;
      const query = productDialogSearch.toLowerCase();
      const code = (p.product_id || p.kode || '').toLowerCase();
      const name = (p.nama || '').toLowerCase();
      return code.includes(query) || name.includes(query);
    });
    return filtered.slice(0, 200);
  }, [productDialogSearch, products]);

  const filteredCustomersForDialog = useMemo(() => {
    const filtered = customers.filter((c: any) => {
      if (!customerDialogSearch) return true;
      const query = customerDialogSearch.toLowerCase();
      const code = (c.kode || '').toLowerCase();
      const name = (c.nama || '').toLowerCase();
      return code.includes(query) || name.includes(query);
    });
    return filtered.slice(0, 200);
  }, [customerDialogSearch, customers]);

  const handleSelectSO = (so: any, isSelected: boolean) => {
    if (isSelected) {
      setSelectedSOs([...selectedSOs, so.id]);
    } else {
      setSelectedSOs(selectedSOs.filter(id => id !== so.id));
    }
  };

  const handleMergeAndEdit = (type: 'sj' | 'so') => {
    const selectedIds = type === 'sj' ? selectedSJs : selectedSOs;
    const sourceData = type === 'sj' ? deliveryNotes : salesOrders;
    
    if (selectedIds.length === 0) return;

    const selected = sourceData.filter((item: any) => selectedIds.includes(item.id));
    const customers_list = selected.map((item: any) => item.customer);
    const uniqueCustomers = [...new Set(customers_list)];
    
    if (uniqueCustomers.length > 1) {
      alert('⚠️ Semua SJ/SO harus dari customer yang sama!');
      return;
    }

    const itemMap = new Map<string, any>(); // Map untuk aggregate items by product name
    const dnSoNotes: string[] = [];
    
    console.log(`[handleMergeAndEdit] Processing ${type} mode, selected: ${selectedIds.length} items`);
    
    selected.forEach((item: any) => {
      console.log(`[handleMergeAndEdit] Processing ${type === 'sj' ? 'DN' : 'SO'}: ${item.sjNo || item.soNo}, items count: ${(item.items || []).length}`);
      
      (item.items || []).forEach((line: any, lineIdx: number) => {
        // For DN: use product name as key (since no SKU available)
        // For SO: try to get SKU first, then product name
        let itemSku = '';
        let productName = '';
        
        if (type === 'sj') {
          // DN mode: product field contains full product name
          productName = line.product || line.productName || '';
          itemSku = productName; // Use product name as SKU for DN
        } else {
          // SO mode: try to extract SKU from various fields
          itemSku = line.itemSku || line.productKode || line.kode || line.product_id || line.sku || line.productId || '';
          productName = line.productName || line.product || '';
          
          // If still no SKU, use product name
          if (!itemSku && productName) {
            itemSku = productName;
          }
        }
        
        // Try to find product from master data to get full name and price
        const masterProduct = products.find((p: any) => 
          p.kode === itemSku || 
          p.product_id === itemSku || 
          p.sku === itemSku ||
          p.productId === itemSku ||
          p.nama === productName
        );
        
        // Use master product name if found, otherwise use line data
        const finalProductName = masterProduct?.nama || productName || itemSku;
        const finalSku = masterProduct?.kode || masterProduct?.product_id || itemSku;
        
        // Get price from master product or line data
        let price = Number(line.price || line.unitPrice || 0);
        if (masterProduct && !price) {
          price = Number(masterProduct.hargaSales || masterProduct.hargaFg || masterProduct.harga || 0);
        }
        
        // Use product name as aggregation key to avoid duplicates
        const aggregationKey = finalProductName;
        const qty = Number(line.qty || 1);
        
        console.log(`  [Line ${lineIdx}] Product: "${finalProductName}", Qty: ${qty}, Key exists: ${itemMap.has(aggregationKey)}`);
        
        if (itemMap.has(aggregationKey)) {
          // Product already exists - add qty
          const existing = itemMap.get(aggregationKey);
          const oldQty = existing.qty;
          existing.qty += qty;
          console.log(`    → Aggregated: ${oldQty} + ${qty} = ${existing.qty}`);
        } else {
          // New product - add to map
          itemMap.set(aggregationKey, {
            itemSku: finalSku,
            product: finalProductName,
            qty: qty,
            price: price,
          });
          console.log(`    → Added new item`);
        }
      });
      
      if (type === 'sj') {
        dnSoNotes.push(`DN: ${item.sjNo}`);
      } else {
        dnSoNotes.push(`SO: ${item.soNo}`);
      }
    });
    
    // Convert map to array
    const allItems: any[] = [];
    itemMap.forEach((item) => allItems.push(item));
    
    console.log(`[handleMergeAndEdit] Final items count: ${allItems.length}`);
    allItems.forEach((item, idx) => {
      console.log(`  [${idx}] ${item.product} - Qty: ${item.qty}`);
    });

    setEditFormData({
      invoiceNo: generateInvoiceNumber(),
      customer: uniqueCustomers[0],
      soNo: selected[0].soNo || '',
      items: allItems.length > 0 ? allItems : [{ itemSku: '', product: '', qty: 1, price: 0 }],
      discount: 0,
      taxPercent: 11,
      dpPercent: 0,
      notes: dnSoNotes.join(', '),
    });
    
    setShowEditForm(true);
    setSelectedSJs([]);
    setSelectedSOs([]);
  };

  const handleCreateManualInvoice = async () => {
    setIsCreating(true);
    try {
      const generateRandomCode = () => {
        const chars = '0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
      };
      
      const year = new Date().getFullYear();
      let invoiceNo = `INV-${year}${generateRandomCode()}`;
      
      const invoicesArray = Array.isArray(invoices) ? invoices : [];
      while (invoicesArray.some((inv: any) => inv.invoiceNo === invoiceNo)) {
        invoiceNo = `INV-${year}${generateRandomCode()}`;
      }

      const invoiceLines = manualInvoiceData.items.map((item: any) => ({
        itemSku: item.sku || item.product,
        qty: Number(item.qty || 0),
        price: Number(item.price || 0),
        soNo: item.soNo || '',
      }));

      const bomData = manualInvoiceData.bom || {};
      const subtotal = bomData.subtotal || invoiceLines.reduce((sum: number, line: any) => 
        sum + (Number(line.qty || 0) * Number(line.price || 0)), 0
      );
      const discount = bomData.discount || 0;
      const discountPercent = bomData.discountPercent || 0;
      const taxPercent = manualInvoiceData.taxPercent || bomData.taxPercent || 11;
      // Calculate tax from taxPercent if not provided
      const tax = bomData.tax || Math.round((subtotal - discount) * (taxPercent / 100));
      const biayaLain = bomData.biayaLain || 0;
      const total = bomData.total || (subtotal - discount + tax + biayaLain);

      let sjNo = '';
      let soNo = '';
      if (manualInvoiceData.sjNos && manualInvoiceData.sjNos.length > 0) {
        sjNo = manualInvoiceData.sjNos[0];
        const deliveryData = await storageService.get<any[]>('gt_delivery') || [];
        const relatedDN = deliveryData.find((dn: any) => dn.sjNo === sjNo);
        if (relatedDN) {
          soNo = relatedDN.soNo || '';
        }
      } else if (manualInvoiceData.soNos && manualInvoiceData.soNos.length > 0) {
        soNo = manualInvoiceData.soNos[0];
        const deliveryData = await storageService.get<any[]>('gt_delivery') || [];
        const relatedDN = deliveryData.find((dn: any) => manualInvoiceData.soNos.includes(dn.soNo));
        if (relatedDN) {
          sjNo = relatedDN.sjNo;
        }
      }

      const newInvoice = {
        id: Date.now().toString(),
        invoiceNo,
        soNo: soNo || '',
        sjNo: sjNo || '',
        customer: manualInvoiceData.customer,
        lines: invoiceLines,
        bom: {
          subtotal,
          discount,
          discountPercent,
          tax,
          taxPercent,
          biayaLain,
          total,
          paymentTerms: manualInvoiceData.paymentTerms || 'TOP',
          poData: {
            topDays: manualInvoiceData.topDays || 30,
          },
          sjNo: sjNo || '',
          soNo: soNo || '',
          tanggalJt: bomData.tanggalJt || '',
          dpPo: bomData.dpPo || 0,
          tunai: bomData.tunai || 0,
          kredit: bomData.kredit || 0,
          kDebet: bomData.kDebet || 0,
          kKredit: bomData.kKredit || 0,
          kembaliKeKasir: bomData.kembaliKeKasir || 0,
        },
        paymentTerms: manualInvoiceData.paymentTerms || 'TOP',
        topDays: manualInvoiceData.topDays || 30,
        status: 'OPEN',
        created: new Date().toISOString(),
        notes: manualInvoiceData.notes || '',
        templateType: manualInvoiceData.templateType || 'template1',
      };
      
      const updated = [...invoicesArray, newInvoice];
      await storageService.set(StorageKeys.GENERAL_TRADING.INVOICES, updated);

      onSuccess?.(`✅ Invoice created: ${invoiceNo}`);
      onCreateInvoice(newInvoice);
    } catch (error: any) {
      onError?.(`Error creating invoice: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  if (showEditForm && editFormData) {
    return (
      <div 
        className="dialog-overlay" 
        onClick={() => setShowEditForm(false)}
        style={{ zIndex: 99999 }}
      >
        <div 
          className="dialog-card" 
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: '700px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Edit Invoice from {createMode === 'sj' ? 'Delivery Note' : 'Sales Order'}</h2>
            <button
              onClick={() => setShowEditForm(false)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
              }}
            >
              ×
            </button>
          </div>

          <ManualInvoiceForm
            manualInvoiceData={editFormData}
            onDataChange={setEditFormData}
            customers={customers}
            generateInvoiceNumber={generateInvoiceNumber}
            products={products}
            onShowProductDialog={setShowProductDialog}
            onShowCustomerDialog={() => setShowCustomerDialog(true)}
          />

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
            <Button 
              variant="secondary" 
              onClick={() => setShowEditForm(false)}
            >
              Back
            </Button>
            <Button 
              variant="primary" 
              onClick={() => {
                onDataChange(editFormData);
                setShowEditForm(false);
                handleCreateManualInvoice();
              }}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Invoice'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="dialog-overlay" 
      onClick={onCancel}
      style={{ zIndex: 99999 }}
    >
      <div 
        className="dialog-card" 
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Create Invoice</h2>
          <button
            onClick={onCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            ×
          </button>
        </div>

        {/* Mode Tabs */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
          <button
            onClick={() => onModeChange('sj')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: createMode === 'sj' ? '2px solid var(--primary-color)' : 'none',
              backgroundColor: 'transparent',
              color: createMode === 'sj' ? 'var(--primary-color)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: createMode === 'sj' ? '600' : '400',
            }}
          >
            By Delivery Note
          </button>
          <button
            onClick={() => onModeChange('so')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: createMode === 'so' ? '2px solid var(--primary-color)' : 'none',
              backgroundColor: 'transparent',
              color: createMode === 'so' ? 'var(--primary-color)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: createMode === 'so' ? '600' : '400',
            }}
          >
            By Sales Order
          </button>
          <button
            onClick={() => onModeChange('manual')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: createMode === 'manual' ? '2px solid var(--primary-color)' : 'none',
              backgroundColor: 'transparent',
              color: createMode === 'manual' ? 'var(--primary-color)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: createMode === 'manual' ? '600' : '400',
            }}
          >
            Manual
          </button>
        </div>

        {/* By Delivery Note */}
        {createMode === 'sj' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--text-primary)' }}>
              Select Delivery Note(s)
            </label>
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto', 
              border: '1px solid var(--border-color)', 
              borderRadius: '4px',
              padding: '8px',
              backgroundColor: 'var(--bg-secondary)'
            }}>
              {deliveryNotes.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No delivery notes available
                </div>
              ) : (
                deliveryNotes.map((sj: any) => (
                  <div 
                    key={sj.id}
                    style={{
                      padding: '10px',
                      marginBottom: '6px',
                      borderRadius: '4px',
                      backgroundColor: selectedSJs.includes(sj.id) ? 'rgba(33, 150, 243, 0.2)' : 'var(--bg-primary)',
                      border: selectedSJs.includes(sj.id) ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onClick={() => handleSelectDN(sj, !selectedSJs.includes(sj.id))}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSJs.includes(sj.id)}
                      onChange={() => {}}
                      style={{ cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>{sj.sjNo}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {sj.customer} • {sj.items?.length || 0} items
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {selectedSJs.length > 0 && (
              <Button 
                variant="primary" 
                onClick={() => handleMergeAndEdit('sj')}
                style={{ marginTop: '8px', width: '100%' }}
              >
                ✏️ Edit {selectedSJs.length} Delivery Note(s)
              </Button>
            )}
          </div>
        )}

        {/* By Sales Order */}
        {createMode === 'so' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--text-primary)' }}>
              Select Sales Order(s)
            </label>
            <div style={{ 
              maxHeight: '300px', 
              overflowY: 'auto', 
              border: '1px solid var(--border-color)', 
              borderRadius: '4px',
              padding: '8px',
              backgroundColor: 'var(--bg-secondary)'
            }}>
              {salesOrders.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  No sales orders available
                </div>
              ) : (
                salesOrders.map((so: any) => (
                  <div 
                    key={so.id}
                    style={{
                      padding: '10px',
                      marginBottom: '6px',
                      borderRadius: '4px',
                      backgroundColor: selectedSOs.includes(so.id) ? 'rgba(33, 150, 243, 0.2)' : 'var(--bg-primary)',
                      border: selectedSOs.includes(so.id) ? '2px solid var(--primary-color)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onClick={() => handleSelectSO(so, !selectedSOs.includes(so.id))}
                  >
                    <input
                      type="checkbox"
                      checked={selectedSOs.includes(so.id)}
                      onChange={() => {}}
                      style={{ cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>{so.soNo}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {so.customer} • {so.items?.length || 0} items
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            {selectedSOs.length > 0 && (
              <Button 
                variant="primary" 
                onClick={() => handleMergeAndEdit('so')}
                style={{ marginTop: '8px', width: '100%' }}
              >
                ✏️ Edit {selectedSOs.length} Sales Order(s)
              </Button>
            )}
          </div>
        )}

        {/* Manual */}
        {createMode === 'manual' && (
          <ManualInvoiceForm
            manualInvoiceData={manualInvoiceData}
            onDataChange={onDataChange}
            customers={customers}
            generateInvoiceNumber={generateInvoiceNumber}
            products={products}
            onShowProductDialog={setShowProductDialog}
            onShowCustomerDialog={() => setShowCustomerDialog(true)}
          />
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <Button 
            variant="secondary" 
            onClick={onCancel}
          >
            Cancel
          </Button>
          {createMode === 'manual' && (
            <Button 
              variant="primary" 
              onClick={handleCreateManualInvoice}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Create Invoice'}
            </Button>
          )}
        </div>
      </div>

      {/* Customer Selection Dialog */}
      {showCustomerDialog && (
        <div 
          className="dialog-overlay" 
          onClick={() => {
            setShowCustomerDialog(false);
            setCustomerDialogSearch('');
          }}
          style={{ zIndex: 99999 }}
        >
          <div 
            className="dialog-card" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Select Customer</h3>
              <button
                onClick={() => {
                  setShowCustomerDialog(false);
                  setCustomerDialogSearch('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                ×
              </button>
            </div>

            <input
              type="text"
              placeholder="Search by code or name..."
              value={customerDialogSearch}
              onChange={(e) => setCustomerDialogSearch(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                marginBottom: '12px',
                fontSize: '12px',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ 
              maxHeight: '400px', 
              overflowY: 'auto', 
              border: '1px solid var(--border-color)', 
              borderRadius: '4px',
              backgroundColor: 'var(--bg-secondary)'
            }}>
              {filteredCustomersForDialog.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {customerDialogSearch ? 'No customers found' : 'No customers available'}
                </div>
              ) : (
                filteredCustomersForDialog.map((cust: any) => (
                  <div
                    key={cust.id}
                    onClick={() => {
                      onDataChange({ customer: cust.nama });
                      setShowCustomerDialog(false);
                      setCustomerDialogSearch('');
                    }}
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      backgroundColor: 'var(--bg-primary)',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(33, 150, 243, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                    }}
                  >
                    <div style={{ fontWeight: '600', fontSize: '12px', marginBottom: '4px' }}>
                      {cust.kode}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {cust.nama}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                Showing {filteredCustomersForDialog.length} of {customers.length}
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowCustomerDialog(false);
                  setCustomerDialogSearch('');
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Product Selection Dialog */}
      {showProductDialog !== null && (
        <div 
          className="dialog-overlay" 
          onClick={() => {
            setShowProductDialog(null);
            setProductDialogSearch('');
          }}
          style={{ zIndex: 99999 }}
        >
          <div 
            className="dialog-card" 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '500px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Select Product</h3>
              <button
                onClick={() => {
                  setShowProductDialog(null);
                  setProductDialogSearch('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                }}
              >
                ×
              </button>
            </div>

            <input
              type="text"
              placeholder="Search by code or name..."
              value={productDialogSearch}
              onChange={(e) => setProductDialogSearch(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                marginBottom: '12px',
                fontSize: '12px',
                boxSizing: 'border-box',
              }}
            />

            <div style={{ 
              maxHeight: '400px', 
              overflowY: 'auto', 
              border: '1px solid var(--border-color)', 
              borderRadius: '4px',
              backgroundColor: 'var(--bg-secondary)'
            }}>
              {filteredProductsForDialog.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                  {productDialogSearch ? 'No products found' : 'No products available'}
                </div>
              ) : (
                filteredProductsForDialog.map((prod: any) => (
                  <div
                    key={prod.id}
                    onClick={() => {
                      if (showProductDialog !== null) {
                        const updated = [...(manualInvoiceData.items || [])];
                        const price = prod.hargaSales || prod.hargaFg || prod.harga || 0;
                        updated[showProductDialog] = {
                          ...updated[showProductDialog],
                          product: prod.nama,
                          itemSku: prod.kode || prod.product_id,
                          price: Number(price),
                        };
                        onDataChange({ items: updated });
                        setShowProductDialog(null);
                        setProductDialogSearch('');
                      }
                    }}
                    style={{
                      padding: '12px',
                      borderBottom: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      backgroundColor: 'var(--bg-primary)',
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(33, 150, 243, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-primary)';
                    }}
                  >
                    <div style={{ fontWeight: '600', fontSize: '12px', marginBottom: '4px' }}>
                      {prod.kode || prod.product_id}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      {prod.nama}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--primary-color)', fontWeight: '500' }}>
                      {(prod.hargaSales || prod.hargaFg || prod.harga) ? 
                        `Rp ${(prod.hargaSales || prod.hargaFg || prod.harga).toLocaleString('id-ID')}` 
                        : 'Harga tidak tersedia'}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                Showing {filteredProductsForDialog.length} of {products.length}
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowProductDialog(null);
                  setProductDialogSearch('');
                }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Manual Invoice Form Component
const ManualInvoiceForm = ({
  manualInvoiceData,
  onDataChange,
  customers,
  generateInvoiceNumber,
  products,
  onShowProductDialog,
  onShowCustomerDialog,
}: {
  manualInvoiceData: any;
  onDataChange: (updates: any) => void;
  customers: any[];
  generateInvoiceNumber: () => string;
  products: any[];
  onShowProductDialog: (index: number) => void;
  onShowCustomerDialog: () => void;
}) => {

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Invoice No & Customer */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
            Invoice No
          </label>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input
              type="text"
              value={manualInvoiceData.invoiceNo || ''}
              onChange={(e) => onDataChange({ invoiceNo: e.target.value })}
              placeholder="INV-2026-001"
              style={{
                flex: 1,
                padding: '8px 10px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '12px',
              }}
            />
            <button
              onClick={() => onDataChange({ invoiceNo: generateInvoiceNumber() })}
              style={{
                padding: '8px 12px',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontSize: '12px',
              }}
              title="Generate new invoice number"
            >
              🔄
            </button>
          </div>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
            Customer *
          </label>
          <button
            onClick={onShowCustomerDialog}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '12px',
              textAlign: 'left',
              cursor: 'pointer',
            }}
          >
            {manualInvoiceData.customer || '-- Select Customer --'}
          </button>
        </div>
      </div>

      {/* SO No */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
          SO No
        </label>
        <input
          type="text"
          value={manualInvoiceData.soNo || ''}
          onChange={(e) => onDataChange({ soNo: e.target.value })}
          placeholder="SO-001"
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: '12px',
          }}
        />
      </div>

      {/* Items Table */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
          Items
        </label>
        <div style={{ overflowX: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <th style={{ padding: '6px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>SKU</th>
                <th style={{ padding: '6px', textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>Product</th>
                <th style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>Qty</th>
                <th style={{ padding: '6px', textAlign: 'right', borderBottom: '1px solid var(--border-color)' }}>Price</th>
                <th style={{ padding: '6px', textAlign: 'center', borderBottom: '1px solid var(--border-color)' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(manualInvoiceData.items || []).map((item: any, idx: number) => (
                <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '6px' }}>
                    <input
                      type="text"
                      value={item.itemSku || ''}
                      readOnly
                      placeholder="Auto"
                      style={{
                        width: '100%',
                        padding: '4px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '2px',
                        fontSize: '11px',
                        backgroundColor: 'var(--bg-secondary)',
                      }}
                    />
                  </td>
                  <td style={{ padding: '6px' }}>
                    <button
                      onClick={() => onShowProductDialog(idx)}
                      style={{
                        width: '100%',
                        padding: '4px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '2px',
                        fontSize: '11px',
                        backgroundColor: 'var(--bg-primary)',
                        color: 'var(--text-primary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={item.product || 'Click to select product'}
                    >
                      {item.product ? `${item.itemSku} - ${item.product.substring(0, 30)}...` : 'Select...'}
                    </button>
                  </td>
                  <td style={{ padding: '6px' }}>
                    <input
                      type="number"
                      value={item.qty || 0}
                      onChange={(e) => {
                        const updated = [...(manualInvoiceData.items || [])];
                        updated[idx] = { ...item, qty: Number(e.target.value) || 0 };
                        onDataChange({ items: updated });
                      }}
                      style={{
                        width: '100%',
                        padding: '4px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '2px',
                        fontSize: '11px',
                        textAlign: 'center',
                      }}
                    />
                  </td>
                  <td style={{ padding: '6px' }}>
                    <input
                      type="number"
                      value={item.price || 0}
                      onChange={(e) => {
                        const updated = [...(manualInvoiceData.items || [])];
                        updated[idx] = { ...item, price: Number(e.target.value) || 0 };
                        onDataChange({ items: updated });
                      }}
                      style={{
                        width: '100%',
                        padding: '4px',
                        border: '1px solid var(--border-color)',
                        borderRadius: '2px',
                        fontSize: '11px',
                        textAlign: 'right',
                      }}
                    />
                  </td>
                  <td style={{ padding: '6px', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        const updated = (manualInvoiceData.items || []).filter((_: any, i: number) => i !== idx);
                        onDataChange({ items: updated });
                      }}
                      style={{
                        padding: '2px 6px',
                        backgroundColor: '#ff4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '2px',
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
        <button
          onClick={() => {
            const updated = [...(manualInvoiceData.items || []), { itemSku: '', product: '', qty: 0, price: 0 }];
            onDataChange({ items: updated });
          }}
          style={{
            marginTop: '8px',
            padding: '6px 12px',
            backgroundColor: 'var(--primary-color)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          + Add Item
        </button>
      </div>

      {/* Discount, Tax, DP */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
            Discount (Rp)
          </label>
          <input
            type="number"
            value={manualInvoiceData.discount || 0}
            onChange={(e) => onDataChange({ discount: Number(e.target.value) || 0 })}
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '12px',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
            Tax (%)
          </label>
          <input
            type="number"
            value={manualInvoiceData.taxPercent !== undefined ? manualInvoiceData.taxPercent : 11}
            onChange={(e) => onDataChange({ taxPercent: Number(e.target.value) || 11 })}
            min="0"
            max="100"
            step="0.1"
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '12px',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
            DP (%) - Down Payment
          </label>
          <input
            type="number"
            value={manualInvoiceData.dpPercent || 0}
            onChange={(e) => onDataChange({ dpPercent: Number(e.target.value) || 0 })}
            min="0"
            max="100"
            step="0.1"
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid var(--border-color)',
              borderRadius: '4px',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '12px',
            }}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
          Notes
        </label>
        <textarea
          value={manualInvoiceData.notes || ''}
          onChange={(e) => onDataChange({ notes: e.target.value })}
          placeholder="Invoice notes..."
          rows={3}
          style={{
            width: '100%',
            padding: '8px 10px',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            fontFamily: 'inherit',
            resize: 'vertical',
          }}
        />
      </div>
    </div>
  );
};

