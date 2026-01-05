/**
 * React Hook untuk Optimistic Operations
 * Menyediakan fungsi-fungsi optimistic untuk digunakan di komponen React
 */

import { useState, useCallback } from 'react';
import { optimisticOps } from '../services/optimistic-operations';

export interface UseOptimisticOperationsResult {
  // GRN Operations
  submitGRN: (grnData: any) => Promise<void>;
  
  // Production Operations
  submitProduction: (productionData: any) => Promise<void>;
  
  // Sales Order Operations
  confirmSalesOrder: (soData: any) => Promise<void>;
  
  // Delete Operations
  deleteItem: (deleteData: any) => Promise<void>;
  
  // General state
  isProcessing: boolean;
  lastResult: any;
  error: string | null;
  
  // Sync status
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  queueStatus: any;
  
  // Utility functions
  forceSyncAll: () => Promise<void>;
  clearError: () => void;
}

export const useOptimisticOperations = (): UseOptimisticOperationsResult => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [queueStatus, setQueueStatus] = useState<any>(null);
  
  // Update sync status
  const updateSyncStatus = useCallback(() => {
    const status = optimisticOps.getSyncStatus();
    const queue = optimisticOps.getQueueStatus();
    setSyncStatus(status);
    setQueueStatus(queue);
  }, []);
  
  // GRN Submit dengan optimistic updates
  const submitGRN = useCallback(async (grnData: {
    id: string;
    grnNo: string;
    poNo: string;
    spkNo?: string;
    materialId: string;
    qtyReceived: number;
    receivedDate: string;
    notes?: string;
    invoiceNo?: string;
  }) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await optimisticOps.submitGRN(grnData);
      
      if (result.success) {
        setLastResult(result);
        // Success feedback sudah ditangani oleh OptimisticButton
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err; // Re-throw untuk OptimisticButton
    } finally {
      setIsProcessing(false);
      updateSyncStatus();
    }
  }, [updateSyncStatus]);
  
  // Production Submit dengan optimistic updates
  const submitProduction = useCallback(async (productionData: {
    id: string;
    productionNo: string;
    spkNo: string;
    soNo: string;
    qtyProduced: number;
    qtySurplus?: number;
    target?: number;
    productId?: string;
    notes?: string;
  }) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await optimisticOps.submitProduction(productionData);
      
      if (result.success) {
        setLastResult(result);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
      updateSyncStatus();
    }
  }, [updateSyncStatus]);
  
  // Sales Order Confirmation dengan optimistic updates
  const confirmSalesOrder = useCallback(async (soData: {
    id: string;
    soNo: string;
    customer: string;
    items: any[];
  }) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await optimisticOps.confirmSalesOrder(soData);
      
      if (result.success) {
        setLastResult(result);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
      updateSyncStatus();
    }
  }, [updateSyncStatus]);
  
  // Force sync all pending operations
  const forceSyncAll = useCallback(async () => {
    setIsProcessing(true);
    try {
      await optimisticOps.forceSyncAll();
      updateSyncStatus();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Sync failed';
      setError(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  }, [updateSyncStatus]);
  
  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  // Delete Item dengan optimistic updates
  const deleteItem = useCallback(async (deleteData: {
    storageKey: string;
    itemId: string;
    idField?: string;
    reason?: string;
  }) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      const result = await optimisticOps.deleteItem(deleteData);
      
      if (result.success) {
        setLastResult(result);
      } else {
        throw new Error(result.message);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      throw err;
    } finally {
      setIsProcessing(false);
      updateSyncStatus();
    }
  }, [updateSyncStatus]);

  return {
    submitGRN,
    submitProduction,
    confirmSalesOrder,
    deleteItem,
    isProcessing,
    lastResult,
    error,
    syncStatus,
    queueStatus,
    forceSyncAll,
    clearError
  };
};