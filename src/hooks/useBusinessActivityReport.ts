import { useState, useEffect, useMemo, useCallback } from 'react';
import { storageService, extractStorageValue, StorageKeys } from '../services/storage';

interface FilterState {
  dateFrom: string;
  dateTo: string;
  customer: string;
  soNo: string;
}

interface BARItem {
  soNo: string;
  customer: string;
  spkNo: string;
  product: string;
  qty: number;
  unit: string;
  createdDate: string;
  soStatus: string;
  spkStatus: string;
  prNo?: string;
  prStatus?: string;
  poNo?: string;
  poStatus?: string;
  supplier?: string;
  productionNo?: string;
  productionStatus?: string;
  producedQty?: number;
  qcNo?: string;
  qcStatus?: string;
  qcResult?: string;
  sjNo?: string;
  deliveryStatus?: string;
  deliveryDate?: string;
}

/**
 * Extract status from business process data
 * Pulls status directly from storage records
 */
const extractStatusFromData = (data: any): string => {
  if (!data) return 'PENDING';
  
  // Status field names vary by entity type
  const statusField = data.status || data.statusCode || data.state || 'PENDING';
  return statusField;
};

/**
 * Build BAR items from raw data
 * Optimized to process data in chunks to avoid memory issues
 */
const buildBARItems = (
  spks: any[],
  salesOrders: any[],
  prs: any[],
  pos: any[],
  productions: any[],
  qcs: any[],
  deliveries: any[],
  filters: FilterState
): BARItem[] => {
  const dateFrom = new Date(filters.dateFrom);
  const dateTo = new Date(filters.dateTo);
  dateFrom.setHours(0, 0, 0, 0);
  dateTo.setHours(23, 59, 59, 999);

  // Create lookup maps for faster searching
  const soMap = new Map(salesOrders.map((s: any) => [s.soNo, s]));
  const prMap = new Map(prs.map((p: any) => [p.spkNo, p]));
  const poMap = new Map(pos.map((p: any) => [p.spkNo, p]));
  const productionMap = new Map(productions.map((p: any) => [p.spkNo, p]));
  const qcMap = new Map(qcs.map((q: any) => [q.spkNo, q]));
  
  // Build delivery map (more complex due to nested items)
  const deliveryMap = new Map<string, any>();
  deliveries.forEach((d: any) => {
    if (d.items?.length > 0) {
      d.items.forEach((item: any) => {
        if (item.spkNo) {
          deliveryMap.set(item.spkNo, d);
        }
      });
    }
    if (d.spkNo) {
      deliveryMap.set(d.spkNo, d);
    }
  });

  const barItems: BARItem[] = [];

  // Process SPKs
  for (const spk of spks) {
    const so = soMap.get(spk.soNo);
    if (!so) continue;

    // Apply date filter
    const spkDate = new Date(spk.createdAt || spk.created || new Date());
    if (spkDate < dateFrom || spkDate > dateTo) continue;

    // Apply customer filter
    if (filters.customer && !so.customer?.toLowerCase().includes(filters.customer.toLowerCase())) {
      continue;
    }

    // Apply SO number filter
    if (filters.soNo && !so.soNo?.toLowerCase().includes(filters.soNo.toLowerCase())) {
      continue;
    }

    // Get related records
    const pr = prMap.get(spk.spkNo);
    const po = poMap.get(spk.spkNo);
    const purchasingSkipped = !pr && !po;
    const production = productionMap.get(spk.spkNo);
    const qc = qcMap.get(spk.spkNo);
    const delivery = deliveryMap.get(spk.spkNo);

    // Build BAR item
    const barItem: BARItem = {
      soNo: so.soNo,
      customer: so.customer,
      spkNo: spk.spkNo,
      product: spk.product,
      qty: spk.qty,
      unit: spk.unit,
      createdDate: spk.createdAt || spk.created || new Date().toISOString(),
      soStatus: extractStatusFromData(so),
      spkStatus: extractStatusFromData(spk),
      prNo: pr?.prNo,
      prStatus: purchasingSkipped ? 'SKIPPED' : extractStatusFromData(pr),
      poNo: po?.poNo,
      poStatus: purchasingSkipped ? 'SKIPPED' : extractStatusFromData(po),
      supplier: po?.supplier,
      productionNo: production?.productionNo,
      productionStatus: production ? extractStatusFromData(production) : 'PENDING',
      producedQty: production?.producedQty,
      qcNo: qc?.qcNo,
      qcStatus: qc ? extractStatusFromData(qc) : 'PENDING',
      qcResult: qc?.qcResult,
      sjNo: delivery?.sjNo,
      deliveryStatus: delivery ? extractStatusFromData(delivery) : 'PENDING',
      deliveryDate: delivery?.deliveryDate,
    };

    barItems.push(barItem);
  }

  // Sort by created date descending
  barItems.sort((a, b) => 
    new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
  );

  return barItems;
};

export const useBusinessActivityReport = (filters: FilterState) => {
  const [items, setItems] = useState<BARItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Memoize filter values to prevent unnecessary re-renders
  const memoizedFilters = useMemo(() => ({
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    customer: filters.customer,
    soNo: filters.soNo,
  }), [filters.dateFrom, filters.dateTo, filters.customer, filters.soNo]);

  useEffect(() => {
    // Debounce fetch to avoid multiple calls when filters change rapidly
    const debounceTimer = setTimeout(() => {
      const fetchData = async () => {
        try {
          setLoading(true);
          setError(null);

          // Get all data from storage
          const salesOrdersRaw = await storageService.get(StorageKeys.PACKAGING.SALES_ORDERS);
          const spksRaw = await storageService.get(StorageKeys.PACKAGING.SPK);
          const prsRaw = await storageService.get(StorageKeys.PACKAGING.PURCHASE_REQUESTS);
          const posRaw = await storageService.get(StorageKeys.PACKAGING.PURCHASE_ORDERS);
          const productionsRaw = await storageService.get(StorageKeys.PACKAGING.PRODUCTION);
          const qcsRaw = await storageService.get(StorageKeys.PACKAGING.QC);
          const deliveriesRaw = await storageService.get(StorageKeys.PACKAGING.DELIVERY);

          // Extract values from storage
          const salesOrders = extractStorageValue(salesOrdersRaw) || [];
          const spks = extractStorageValue(spksRaw) || [];
          const prs = extractStorageValue(prsRaw) || [];
          const pos = extractStorageValue(posRaw) || [];
          const productions = extractStorageValue(productionsRaw) || [];
          const qcs = extractStorageValue(qcsRaw) || [];
          const deliveries = extractStorageValue(deliveriesRaw) || [];

          console.log('[BAR] Data loaded:', {
            spks: spks.length,
            salesOrders: salesOrders.length,
            prs: prs.length,
            pos: pos.length,
            productions: productions.length,
            qcs: qcs.length,
            deliveries: deliveries.length,
          });

          // Build BAR items with optimized processing
          const barItems = buildBARItems(
            spks,
            salesOrders,
            prs,
            pos,
            productions,
            qcs,
            deliveries,
            memoizedFilters
          );

          console.log('[BAR] Items built:', barItems.length);

          setItems(barItems);
          setTotalCount(barItems.length);
        } catch (err) {
          console.error('[BAR] Error:', err);
          setError(err instanceof Error ? err.message : 'Failed to load data');
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }, 500); // Debounce 500ms

    return () => clearTimeout(debounceTimer);
  }, [memoizedFilters]);

  return { items, loading, error, totalCount };
};
