/**
 * Optimistic Production Submit Component
 * Menggantikan tombol submit production yang lambat dengan optimistic updates
 */

import React, { useState } from 'react';
import OptimisticButton from './OptimisticButton';
import { useOptimisticOperations } from '../hooks/useOptimisticOperations';
import Card from './Card';
import Input from './Input';
import Button from './Button';

interface Production {
  id: string;
  productionNo?: string;
  grnNo?: string;
  spkNo?: string;
  soNo: string;
  customer: string;
  status: 'DRAFT' | 'OPEN' | 'CLOSE';
  target: number;
  progress?: number;
  remaining?: number;
  productCode?: string;
  productName?: string;
  productId?: string;
  targetQty?: number;
  producedQty?: number;
}

interface OptimisticProductionSubmitProps {
  production: Production;
  onClose: () => void;
  onSuccess?: () => void;
}

const OptimisticProductionSubmit: React.FC<OptimisticProductionSubmitProps> = ({
  production,
  onClose,
  onSuccess
}) => {
  const { submitProduction } = useOptimisticOperations();
  
  const [qtyProduced, setQtyProduced] = useState<string>(
    (production.progress || production.target || 0).toString()
  );
  const [qtySurplus, setQtySurplus] = useState<string>('0');
  const [notes, setNotes] = useState<string>('');
  
  const handleOptimisticSubmit = async () => {
    const qtyProducedNum = parseFloat(qtyProduced || '0') || 0;
    const qtySurplusNum = parseFloat(qtySurplus || '0') || 0;
    
    if (qtyProducedNum <= 0) {
      throw new Error('Qty Produced must be greater than 0');
    }
    
    // Validasi tidak melebihi target
    const prevProgress = production.progress || production.producedQty || 0;
    const targetQty = production.target || production.targetQty || 0;
    const newProgress = prevProgress + qtyProducedNum;
    
    if (targetQty > 0 && newProgress > targetQty * 1.05) { // 5% tolerance
      throw new Error(`Qty Produced will exceed target. Max allowed: ${targetQty - prevProgress}`);
    }
    
    // Submit dengan optimistic updates
    await submitProduction({
      id: production.id,
      productionNo: production.productionNo || production.grnNo || '',
      spkNo: production.spkNo || '',
      soNo: production.soNo,
      qtyProduced: qtyProducedNum,
      qtySurplus: qtySurplusNum,
      target: targetQty,
      productId: production.productId || production.productCode || '',
      notes: notes
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
          <h2>Submit Production Result</h2>
          <Button variant="secondary" onClick={onClose} style={{ padding: '6px 12px' }}>✕</Button>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Production Info */}
          <div style={{ 
            padding: '12px', 
            backgroundColor: 'var(--bg-secondary)', 
            borderRadius: '6px',
            fontSize: '12px'
          }}>
            <div><strong>Production No:</strong> {production.productionNo || production.grnNo}</div>
            <div><strong>SPK No:</strong> {production.spkNo}</div>
            <div><strong>SO No:</strong> {production.soNo}</div>
            <div><strong>Customer:</strong> {production.customer}</div>
            <div><strong>Product:</strong> {production.productName || production.productCode}</div>
            <div><strong>Target:</strong> {production.target || production.targetQty} PCS</div>
            <div><strong>Current Progress:</strong> {production.progress || production.producedQty || 0} PCS</div>
            <div><strong>Remaining:</strong> {Math.max((production.target || production.targetQty || 0) - (production.progress || production.producedQty || 0), 0)} PCS</div>
          </div>
          
          {/* Input Fields */}
          <Input
            label="Qty Produced *"
            type="number"
            value={qtyProduced}
            onChange={(e) => setQtyProduced(e.target.value)}
            placeholder="Enter quantity produced"
            min="0"
            step="1"
          />
          
          <Input
            label="Qty Surplus (Optional)"
            type="number"
            value={qtySurplus}
            onChange={(e) => setQtySurplus(e.target.value)}
            placeholder="Enter surplus quantity"
            min="0"
            step="1"
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
              successMessage="Production submitted!"
              errorMessage="Submit failed"
              showSyncStatus={true}
            >
              Submit Result
            </OptimisticButton>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OptimisticProductionSubmit;