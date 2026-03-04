import { useState, useEffect } from 'react';
import Button from '../../../components/Button';
import { storageService, StorageKeys } from '../../../services/storage';

interface EditInvoiceFormProps {
  invoice: any;
  customers: any[];
  onSave: (updatedInvoice: any) => void;
  onCancel: () => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

export const EditInvoiceForm = ({
  invoice,
  customers,
  onSave,
  onCancel,
  onSuccess,
  onError,
}: EditInvoiceFormProps) => {
  const [editData, setEditData] = useState(invoice);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize with default tax if missing
  useEffect(() => {
    if (editData.bom && editData.bom.taxPercent === 0 && editData.bom.tax === 0) {
      console.log('[EditInvoiceForm] Initializing with default tax 11%');
      const subtotal = editData.bom.subtotal || 0;
      const discount = editData.bom.discount || 0;
      const calculatedTax = Math.round((subtotal - discount) * 0.11);
      setEditData({
        ...editData,
        bom: {
          ...editData.bom,
          taxPercent: 11,
          tax: calculatedTax,
          total: (subtotal - discount + calculatedTax + (editData.bom.biayaLain || 0))
        }
      });
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      console.log('[EditInvoiceForm] Saving invoice:', {
        invoiceNo: editData.invoiceNo,
        bom: editData.bom,
        taxPercent: editData.bom?.taxPercent,
        tax: editData.bom?.tax,
      });

      const updatedInvoice = {
        ...editData,
        updated: new Date().toISOString(),
      };

      console.log('[EditInvoiceForm] Updated invoice to save:', {
        invoiceNo: updatedInvoice.invoiceNo,
        bom: updatedInvoice.bom,
      });

      const invoices = await storageService.get<any[]>('gt_invoices') || [];
      const invoicesArray = Array.isArray(invoices) ? invoices : [];
      const updated = invoicesArray.map((inv: any) =>
        inv.id === editData.id ? updatedInvoice : inv
      );

      console.log('[EditInvoiceForm] Final invoice in array:', updated.find((inv: any) => inv.id === editData.id));

      await storageService.set(StorageKeys.GENERAL_TRADING.INVOICES, updated);
      onSuccess?.(`✅ Invoice ${editData.invoiceNo} updated`);
      onSave(updatedInvoice);
    } catch (error: any) {
      console.error('[EditInvoiceForm] Error saving invoice:', error);
      onError?.(`Error saving invoice: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

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
          <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>Edit Invoice</h2>
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

        <div style={{ marginBottom: '16px' }}>
          {/* Invoice No & Customer */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
                Invoice No
              </label>
              <input
                type="text"
                value={editData.invoiceNo || ''}
                disabled
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
                Customer
              </label>
              <select
                value={editData.customer || ''}
                onChange={(e) => setEditData({ ...editData, customer: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              >
                <option value="">-- Select Customer --</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.nama}>
                    {c.kode} - {c.nama}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SO No & SJ No */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
                SO No
              </label>
              <input
                type="text"
                value={editData.soNo || ''}
                onChange={(e) => setEditData({ ...editData, soNo: e.target.value })}
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
                SJ No
              </label>
              <input
                type="text"
                value={editData.sjNo || ''}
                onChange={(e) => setEditData({ ...editData, sjNo: e.target.value })}
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

          {/* BOM Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
                Subtotal (Rp)
              </label>
              <input
                type="number"
                value={editData.bom?.subtotal || 0}
                onChange={(e) => setEditData({
                  ...editData,
                  bom: { ...editData.bom, subtotal: Number(e.target.value) }
                })}
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
                Discount (Rp)
              </label>
              <input
                type="number"
                value={editData.bom?.discount || 0}
                onChange={(e) => setEditData({
                  ...editData,
                  bom: { ...editData.bom, discount: Number(e.target.value) }
                })}
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
                Tax (%)
              </label>
              <input
                type="number"
                value={editData.bom?.taxPercent || 11}
                onChange={(e) => {
                  const taxPercent = Number(e.target.value) || 11;
                  const subtotal = editData.bom?.subtotal || 0;
                  const discount = editData.bom?.discount || 0;
                  const calculatedTax = Math.round((subtotal - discount) * (taxPercent / 100));
                  setEditData({
                    ...editData,
                    bom: { 
                      ...editData.bom, 
                      taxPercent: taxPercent,
                      tax: calculatedTax,
                      total: (subtotal - discount + calculatedTax + (editData.bom?.biayaLain || 0))
                    }
                  });
                }}
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
                Tax Amount (Rp)
              </label>
              <input
                type="number"
                value={editData.bom?.tax || 0}
                disabled
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
                Total (Rp)
              </label>
              <input
                type="number"
                value={editData.bom?.total || 0}
                onChange={(e) => setEditData({
                  ...editData,
                  bom: { ...editData.bom, total: Number(e.target.value) }
                })}
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
                Status
              </label>
              <select
                value={editData.status || 'OPEN'}
                onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              >
                <option value="OPEN">OPEN</option>
                <option value="PAID">PAID</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', fontWeight: '500', color: 'var(--text-primary)' }}>
              Notes
            </label>
            <textarea
              value={editData.notes || ''}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
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

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <Button 
            variant="secondary" 
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};
