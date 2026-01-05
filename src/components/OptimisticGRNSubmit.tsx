/**
 * Optimistic GRN Submit Component
 * Menggantikan tombol submit GRN yang lambat dengan optimistic updates
 */

import React, { useState } from 'react';
import OptimisticButton from './OptimisticButton';
import { useOptimisticOperations } from '../hooks/useOptimisticOperations';
import Card from './Card';
import Input from './Input';
import Button from './Button';

interface PurchaseOrder {
  id: string;
  poNo: string;
  spkNo?: string;
  materialId: string;
  materialName: string;
  qty: number;
  unit: string;
  supplier: string;
}

interface OptimisticGRNSubmitProps {
  po: PurchaseOrder;
  totalReceived: number;
  maxAllowedQty: number;
  onClose: () => void;
  onSuccess?: () => void;
}

const OptimisticGRNSubmit: React.FC<OptimisticGRNSubmitProps> = ({
  po,
  totalReceived,
  maxAllowedQty,
  onClose,
  onSuccess
}) => {
  const { submitGRN } = useOptimisticOperations();
  
  const [qtyReceived, setQtyReceived] = useState<string>('');
  const [receivedDate, setReceivedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState<string>('');
  const [invoiceNo, setInvoiceNo] = useState<string>('');
  
  const handleOptimisticSubmit = async () => {
    const qty = Number(qtyReceived);
    
    if (isNaN(qty) || qty <= 0) {
      throw new Error('Quantity received must be greater than 0');
    }
    
    // Validasi dengan toleransi 10%
    const maxAllowedTotal = Math.ceil(po.qty * 1.1);
    const newTotal = totalReceived + qty;
    if (newTotal > maxAllowedTotal) {
      throw new Error(
        `Quantity exceeds maximum allowed. Max: ${maxAllowedQty}, Entered: ${qty}`
      );
    }
    
    if (!receivedDate) {
      throw new Error('Received date is required');
    }
    
    // Generate GRN number
    const grnNo = `GRN-${po.poNo}-${Date.now()}`;
    
    // Submit dengan optimistic updates
    await submitGRN({
      id: `grn-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      grnNo: grnNo,
      poNo: po.poNo,
      spkNo: po.spkNo,
      materialId: po.materialId,
      qtyReceived: qty,
      receivedDate: receivedDate,
      notes: notes,
      invoiceNo: invoiceNo || undefined
    });
    
    // Close dialog immediately after optimistic update
    onClose();
    
    // Call success callback if provided
    if (onSuccess) {
      onSuccess();
    }
  };
  
  return (
    <div className="dialog-overlay">
      <Card className="dialog-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>Create GRN</h2>
          <Button variant="secondary" onClick={onClose} style={{ padding: '6px 12px' }}>✕</Button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* PO Info */}
          <div style={{ 
            padding: '12px', 
            backgroundColor: 'var(--bg-secondary)', 
            borderRadius: '6px',
            fontSize: '12px'
          }}>
            <div><strong>PO No:</strong> {po.poNo}</div>
            {po.spkNo && <div><strong>SPK No:</strong> {po.spkNo}</div>}
            <div><strong>Supplier:</strong> {po.supplier}</div>
            <div><strong>Material:</strong> {po.materialName} ({po.materialId})</div>
            <div><strong>Ordered Qty:</strong> {po.qty} {po.unit}</div>
            <div><strong>Already Received:</strong> {totalReceived} {po.unit}</div>
            <div><strong>Remaining:</strong> {po.qty - totalReceived} {po.unit}</div>
            <div><strong>Max Allowed (with 10% tolerance):</strong> {maxAllowedQty} {po.unit}</div>
          </div>
          
          {/* Input Fields */}
          <Input
            label="Qty Received *"
            type="number"
            value={qtyReceived}
            onChange={(e) => setQtyReceived(e.target.value)}
            placeholder="Enter quantity received"
            min="0"
            max={maxAllowedQty.toString()}
            step="1"
          />
          
          <Input
            label="Received Date *"
            type="date"
            value={receivedDate}
            onChange={(e) => setReceivedDate(e.target.value)}
          />
          
          <Input
            label="Invoice No (Optional)"
            value={invoiceNo}
            onChange={(e) => setInvoiceNo(e.target.value)}
            placeholder="Enter invoice number"
          />
          
          <Input
            label="Notes (Optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes..."
          />
          
          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            
            <OptimisticButton
              variant="primary"
              onClick={handleOptimisticSubmit}
              successMessage="GRN created!"
              errorMessage="GRN creation failed"
              showSyncStatus={true}
            >
              Create GRN
            </OptimisticButton>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OptimisticGRNSubmit;