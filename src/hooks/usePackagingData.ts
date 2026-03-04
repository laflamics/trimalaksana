/**
 * React Hooks untuk Packaging Data
 * Implementasi dari mdfile/PACKAGING_ACTION_PLAN.md
 * Easy React integration dengan optimistic updates
 */

import { useState, useEffect, useCallback } from 'react';
import { packagingSync } from '../services/packaging-sync';
import { materialAllocator } from '../services/material-allocator';
import { workflowStateMachine, WorkflowEntity, WorkflowStatus } from '../services/workflow-state-machine';
import { StorageKeys } from '../services/storage';

export interface UsePackagingDataOptions {
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Record<string, any>;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export interface UsePackagingDataResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  
  // CRUD operations
  add: (item: T) => Promise<void>;
  update: (id: string, updates: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  
  // Search & pagination
  search: (query: string, fields: string[]) => Promise<T[]>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  
  // Workflow operations
  canTransition: (id: string, to: WorkflowStatus) => Promise<boolean>;
  transition: (id: string, to: WorkflowStatus, data?: any) => Promise<void>;
  
  // Material operations (untuk SPK)
  checkMaterialAvailability?: (spkNo: string, materials: any[]) => Promise<any>;
  reserveMaterials?: (spkNo: string, materials: any[]) => Promise<any>;
}

/**
 * Base hook untuk packaging data
 */
function usePackagingData<T extends { id: string; status?: string }>(
  key: string,
  entity: WorkflowEntity,
  options: UsePackagingDataOptions = {}
): UsePackagingDataResult<T> {
  const {
    pageSize = 50,
    sortBy = 'created',
    sortOrder = 'desc',
    filters = {},
    autoRefresh = false,
    refreshInterval = 30000
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Load data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const rawData = await packagingSync.getData(key);
      let filteredData = Array.isArray(rawData) ? rawData : [];
      
      // Apply filters
      if (Object.keys(filters).length > 0) {
        filteredData = filteredData.filter(item => {
          return Object.entries(filters).every(([field, value]) => {
            if (value === null || value === undefined || value === '') return true;
            return item[field] === value;
          });
        });
      }
      
      // Apply sorting
      if (sortBy) {
        filteredData.sort((a, b) => {
          const aVal = a[sortBy];
          const bVal = b[sortBy];
          
          if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
          if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
          return 0;
        });
      }
      
      setData(filteredData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [key, filters, sortBy, sortOrder]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(loadData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, loadData]);

  // Listen to storage changes
  useEffect(() => {
    const handleStorageChange = (event: CustomEvent) => {
      if (event.detail.key === key) {
        setData(event.detail.data || []);
      }
    };

    window.addEventListener('app-storage-changed', handleStorageChange as EventListener);
    return () => {
      window.removeEventListener('app-storage-changed', handleStorageChange as EventListener);
    };
  }, [key]);

  // CRUD operations
  const add = useCallback(async (item: T) => {
    try {
      const newItem = {
        ...item,
        id: item.id || `${key}_${Date.now()}`,
        created: new Date().toISOString(),
        status: item.status || 'DRAFT'
      };
      
      const updatedData = [...data, newItem];
      await packagingSync.updateData(key, updatedData, 'HIGH');
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to add item');
    }
  }, [key, data]);

  const update = useCallback(async (id: string, updates: Partial<T>) => {
    try {
      const updatedData = data.map(item => 
        item.id === id 
          ? { ...item, ...updates, lastUpdated: new Date().toISOString() }
          : item
      );
      
      await packagingSync.updateData(key, updatedData, 'HIGH');
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update item');
    }
  }, [key, data]);

  const remove = useCallback(async (id: string) => {
    try {
      const updatedData = data.filter(item => item.id !== id);
      await packagingSync.updateData(key, updatedData, 'MEDIUM');
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to remove item');
    }
  }, [key, data]);

  // Search
  const search = useCallback(async (query: string, fields: string[]): Promise<T[]> => {
    if (!query.trim()) return data;
    
    const lowerQuery = query.toLowerCase();
    return data.filter(item => {
      return fields.some(field => {
        const value = (item as any)[field]; // Safe type assertion for dynamic field access
        return value && value.toString().toLowerCase().includes(lowerQuery);
      });
    });
  }, [data]);

  // Pagination
  const loadMore = useCallback(async () => {
    setCurrentPage(prev => prev + 1);
  }, []);

  const refresh = useCallback(async () => {
    setCurrentPage(1);
    await loadData();
  }, [loadData]);

  // Workflow operations
  const canTransition = useCallback(async (id: string, to: WorkflowStatus): Promise<boolean> => {
    try {
      const item = data.find(d => d.id === id);
      if (!item || !item.status) return false;
      
      const result = await workflowStateMachine.canTransition(
        entity, 
        id, 
        item.status as WorkflowStatus, 
        to
      );
      
      return result.valid;
    } catch (err) {
      console.error('Transition validation failed:', err);
      return false;
    }
  }, [entity, data]);

  const transition = useCallback(async (id: string, to: WorkflowStatus, transitionData?: any) => {
    try {
      await workflowStateMachine.transition(entity, id, to, transitionData);
      await loadData(); // Refresh data after transition
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Transition failed');
    }
  }, [entity, loadData]);

  // Material operations (untuk SPK)
  const checkMaterialAvailability = useCallback(async (spkNo: string, materials: any[]) => {
    const shortages = [];
    const availabilities = [];
    
    for (const material of materials) {
      const availability = await materialAllocator.getMaterialAvailability(material.id);
      if (availability) {
        availabilities.push(availability);
        if (availability.available < material.qty) {
          shortages.push({
            materialId: material.id,
            materialName: material.nama,
            required: material.qty,
            available: availability.available,
            shortage: material.qty - availability.available,
            unit: material.unit || material.satuan,
            spkNo: spkNo // Use the spkNo parameter here
          });
        }
      }
    }
    
    return {
      shortages,
      availabilities,
      hasShortage: shortages.length > 0
    };
  }, []);
  const reserveMaterials = useCallback(async (spkNo: string, materials: any[]) => {
    return await materialAllocator.reserveMaterials(spkNo, materials);
  }, []);

  // Calculate pagination info
  const total = data.length;
  const hasMore = currentPage * pageSize < total;
  const paginatedData = data.slice(0, currentPage * pageSize);

  return {
    data: paginatedData,
    loading,
    error,
    total,
    hasMore,
    add,
    update,
    remove,
    search,
    loadMore,
    refresh,
    canTransition,
    transition,
    ...(entity === 'spk' && { checkMaterialAvailability, reserveMaterials })
  };
}

/**
 * Specialized hooks untuk setiap entity
 */

export function useSalesOrders(options?: UsePackagingDataOptions) {
  return usePackagingData(StorageKeys.PACKAGING.SALES_ORDERS, 'salesOrder', options);
}

export function useSPK(options?: UsePackagingDataOptions) {
  return usePackagingData(StorageKeys.PACKAGING.SPK, 'spk', options);
}

export function usePurchaseOrders(options?: UsePackagingDataOptions) {
  return usePackagingData(StorageKeys.PACKAGING.PURCHASE_ORDERS, 'purchaseOrder', options);
}

export function useGRN(options?: UsePackagingDataOptions) {
  return usePackagingData(StorageKeys.PACKAGING.GRN, 'grn', options);
}

export function useProduction(options?: UsePackagingDataOptions) {
  return usePackagingData(StorageKeys.PACKAGING.PRODUCTION, 'production', options);
}

export function useQC(options?: UsePackagingDataOptions) {
  return usePackagingData(StorageKeys.PACKAGING.QC, 'qc', options);
}

export function useDelivery(options?: UsePackagingDataOptions) {
  return usePackagingData(StorageKeys.PACKAGING.DELIVERY, 'delivery', options);
}

export function useInvoices(options?: UsePackagingDataOptions) {
  return usePackagingData(StorageKeys.PACKAGING.INVOICES, 'invoice', options);
}

/**
 * Hook untuk material status
 */
export function useMaterialStatus(spkNo?: string) {
  const [availability, setAvailability] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMaterialStatus = useCallback(async () => {
    if (!spkNo) return;
    
    setLoading(true);
    try {
      const spkReservations = materialAllocator.getSPKReservations(spkNo);
      setReservations(spkReservations);
      
      // Get availability for each reserved material
      const availabilities = [];
      for (const reservation of spkReservations) {
        const avail = await materialAllocator.getMaterialAvailability(reservation.materialId);
        if (avail) {
          availabilities.push(avail);
        }
      }
      setAvailability(availabilities);
    } catch (error) {
      console.error('Failed to load material status:', error);
    } finally {
      setLoading(false);
    }
  }, [spkNo]);

  useEffect(() => {
    loadMaterialStatus();
  }, [loadMaterialStatus]);

  return {
    availability,
    reservations,
    loading,
    refresh: loadMaterialStatus
  };
}

/**
 * Hook untuk workflow status
 */
export function useWorkflowStatus(entity: WorkflowEntity, id: string) {
  const [currentState, setCurrentState] = useState<WorkflowStatus | null>(null);
  const [availableTransitions, setAvailableTransitions] = useState<WorkflowStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const loadWorkflowStatus = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      // Get current state from storage
      const storageKey = entity === 'salesOrder' ? StorageKeys.PACKAGING.SALES_ORDERS : entity;
      const data = await packagingSync.getData(storageKey);
      const item = data.find((d: any) => d.id === id);
      
      if (item) {
        setCurrentState(item.status || 'DRAFT');
        
        // Get available transitions (simplified - would need full workflow rules)
        const transitions: WorkflowStatus[] = [];
        switch (item.status) {
          case 'DRAFT':
            transitions.push('OPEN');
            break;
          case 'OPEN':
            transitions.push('CONFIRMED', 'VOID');
            break;
          case 'CONFIRMED':
            transitions.push('CLOSE', 'VOID');
            break;
        }
        setAvailableTransitions(transitions);
      }
    } catch (error) {
      console.error('Failed to load workflow status:', error);
    } finally {
      setLoading(false);
    }
  }, [entity, id]);

  useEffect(() => {
    loadWorkflowStatus();
  }, [loadWorkflowStatus]);

  return {
    currentState,
    availableTransitions,
    loading,
    refresh: loadWorkflowStatus
  };
}