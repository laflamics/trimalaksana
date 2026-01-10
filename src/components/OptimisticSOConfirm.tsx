/**
 * Optimistic Sales Order Confirmation Component
 * Menggantikan tombol confirm SO yang lambat dengan optimistic updates
 */

import React from 'react';
import OptimisticButton from './OptimisticButton';
import { useOptimisticOperations } from '../hooks/useOptimisticOperations';

interface SalesOrder {
  id: string;
  soNo: string;
  customer: string;
  customerKode?: string;
  status: 'OPEN' | 'CLOSE';
  items: Array<{
    id: string;
    productId: string;
    productKode: string;
    productName: string;
    qty: number;
    unit: string;
    price: number;
    total: number;
  }>;
  confirmed?: boolean;
  confirmedAt?: string;
}

interface OptimisticSOConfirmProps {
  salesOrder: SalesOrder;
  onSuccess?: () => void;
  style?: React.CSSProperties;
  className?: string;
}

const OptimisticSOConfirm: React.FC<OptimisticSOConfirmProps> = ({
  salesOrder,
  onSuccess,
  style,
  className
}) => {
  const { confirmSalesOrder } = useOptimisticOperations();
  
  const handleOptimisticConfirm = async () => {
    if (salesOrder.confirmed) {
      throw new Error('Sales Order already confirmed');
    }
    
    if (salesOrder.status !== 'OPEN') {
      throw new Error('Only OPEN sales orders can be confirmed');
    }
    
    if (!salesOrder.items || salesOrder.items.length === 0) {
      throw new Error('Sales Order must have at least one item');
    }
    
    // Submit dengan optimistic updates
    await confirmSalesOrder({
      id: salesOrder.id,
      soNo: salesOrder.soNo,
      customer: salesOrder.customer,
      items: salesOrder.items
    });
    
    // Call success callback if provided
    if (onSuccess) {
      onSuccess();
    }
  };
  
  // Don't show button if already confirmed
  if (salesOrder.confirmed) {
    return (
      <div style={{ 
        ...style,
        padding: '4px 8px',
        backgroundColor: '#4CAF50',
        color: 'white',
        borderRadius: '4px',
        fontSize: '11px',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        ✓ Confirmed
      </div>
    );
  }
  
  return (
    <OptimisticButton
      variant="primary"
      onClick={handleOptimisticConfirm}
      successMessage={`SO ${salesOrder.soNo} confirmed!`}
      errorMessage="Confirmation failed"
      showSyncStatus={true}
      style={{
        fontSize: '11px',
        padding: '4px 8px',
        ...style
      }}
      className={className}
    >
      ✓ Confirm SO
    </OptimisticButton>
  );
};

export default OptimisticSOConfirm;