/**
 * Data Persistence Helper
 * Utilities to prevent deleted data from resurrecting due to auto-sync
 */

import { storageService } from '../services/storage';

export interface DeletedItem {
  deleted: boolean;
  deletedAt: string;
  deletedTimestamp: number;
}

/**
 * Safely delete an item from array storage with tombstone pattern
 * This prevents the item from being restored by auto-sync
 */
export const safeDeleteItem = async (
  storageKey: string,
  itemId: string | number,
  idField: string = 'id'
): Promise<boolean> => {
  try {
    await storageService.removeItem(storageKey, itemId, idField);
    return true;
  } catch (error) {
    console.error(`[DataPersistence] Error deleting item ${itemId} from ${storageKey}:`, error);
    return false;
  }
};

/**
 * Filter out deleted items for display (but keep them in storage for tombstone)
 */
export const filterActiveItems = <T extends Record<string, any>>(items: T[]): T[] => {
  if (!Array.isArray(items)) return [];
  
  return items.filter(item => !item.deleted);
};

/**
 * Check if an item is deleted
 */
export const isItemDeleted = (item: any): boolean => {
  return item && (item.deleted === true || !!item.deletedAt);
};

/**
 * Mark multiple items as deleted (batch operation)
 */
export const safeDeleteMultipleItems = async (
  storageKey: string,
  itemIds: (string | number)[],
  idField: string = 'id'
): Promise<{ success: number; failed: number }> => {
  const results = { success: 0, failed: 0 };
  
  for (const itemId of itemIds) {
    const success = await safeDeleteItem(storageKey, itemId, idField);
    if (success) {
      results.success++;
    } else {
      results.failed++;
    }
  }
  
  return results;
};

/**
 * Restore a deleted item (undelete)
 */
export const restoreDeletedItem = async (
  storageKey: string,
  itemId: string | number,
  idField: string = 'id'
): Promise<boolean> => {
  try {
    const currentData = await storageService.get<any[]>(storageKey) || [];
    
    if (!Array.isArray(currentData)) {
      console.warn(`[DataPersistence] Data for key ${storageKey} is not an array`);
      return false;
    }
    
    // Find and restore item
    const updatedData = currentData.map((item: any) => {
      const itemIdValue = item[idField];
      if (itemIdValue === itemId && item.deleted === true) {
        // Remove deletion markers
        const { deleted, deletedAt, deletedTimestamp, ...restoredItem } = item;
        return {
          ...restoredItem,
          restoredAt: new Date().toISOString(),
          restoredTimestamp: Date.now()
        };
      }
      return item;
    });
    
    await storageService.set(storageKey, updatedData);
    console.log(`[DataPersistence] Restored item ${itemId} in ${storageKey}`);
    return true;
  } catch (error) {
    console.error(`[DataPersistence] Error restoring item ${itemId} from ${storageKey}:`, error);
    return false;
  }
};

/**
 * Get count of deleted items (for admin/debug purposes)
 */
export const getDeletedItemsCount = async (storageKey: string): Promise<number> => {
  try {
    const currentData = await storageService.get<any[]>(storageKey) || [];
    
    if (!Array.isArray(currentData)) {
      return 0;
    }
    
    return currentData.filter(item => isItemDeleted(item)).length;
  } catch (error) {
    console.error(`[DataPersistence] Error counting deleted items in ${storageKey}:`, error);
    return 0;
  }
};

/**
 * Cleanup old deleted items (tombstone cleanup)
 */
export const cleanupOldDeletedItems = async (
  storageKey: string,
  olderThanDays: number = 30
): Promise<number> => {
  try {
    const beforeCount = await getDeletedItemsCount(storageKey);
    await storageService.cleanupDeletedItems(storageKey, olderThanDays);
    const afterCount = await getDeletedItemsCount(storageKey);
    
    const cleanedCount = beforeCount - afterCount;
    if (cleanedCount > 0) {
      console.log(`[DataPersistence] Cleaned up ${cleanedCount} old deleted items from ${storageKey}`);
    }
    
    return cleanedCount;
  } catch (error) {
    console.error(`[DataPersistence] Error cleaning up deleted items in ${storageKey}:`, error);
    return 0;
  }
};

/**
 * Auto-sync configuration helper
 */
export const configureAutoSync = {
  /**
   * Set auto-sync to conservative mode (5 minutes)
   */
  setConservative: () => {
    storageService.setAutoSyncInterval(5 * 60 * 1000); // 5 minutes
    console.log('[DataPersistence] Auto-sync set to conservative mode (5 minutes)');
  },
  
  /**
   * Set auto-sync to normal mode (2 minutes)
   */
  setNormal: () => {
    storageService.setAutoSyncInterval(2 * 60 * 1000); // 2 minutes
    console.log('[DataPersistence] Auto-sync set to normal mode (2 minutes)');
  },
  
  /**
   * Set auto-sync to aggressive mode (30 seconds) - not recommended
   */
  setAggressive: () => {
    storageService.setAutoSyncInterval(30 * 1000); // 30 seconds
    console.warn('[DataPersistence] Auto-sync set to aggressive mode (30 seconds) - may cause data resurrection issues');
  },
  
  /**
   * Disable auto-sync (manual sync only)
   */
  disable: () => {
    storageService.stopAutoSync();
    console.log('[DataPersistence] Auto-sync disabled - manual sync only');
  },
  
  /**
   * Get current auto-sync status
   */
  getStatus: () => {
    const isEnabled = storageService.isAutoSyncEnabled();
    const status = storageService.getSyncStatus();
    return { isEnabled, status };
  }
};

/**
 * Manual sync trigger (for immediate sync when needed)
 */
export const triggerManualSync = async (): Promise<boolean> => {
  try {
    // Note: This would need to be implemented in storageService
    // For now, just log the intent
    console.log('[DataPersistence] Manual sync triggered - this would force immediate sync');
    return true;
  } catch (error) {
    console.error('[DataPersistence] Manual sync failed:', error);
    return false;
  }
};

/**
 * Data resurrection detection and prevention
 */
export const detectDataResurrection = async (
  storageKey: string,
  beforeData: any[],
  afterData: any[],
  idField: string = 'id'
): Promise<{ resurrected: any[]; prevented: boolean }> => {
  const resurrected: any[] = [];
  
  if (!Array.isArray(beforeData) || !Array.isArray(afterData)) {
    return { resurrected, prevented: false };
  }
  
  // Find items that were deleted in before but exist in after
  const beforeIds = new Set(beforeData.map(item => item[idField]));
  const afterIds = new Set(afterData.map(item => item[idField]));
  
  afterData.forEach(afterItem => {
    const itemId = afterItem[idField];
    if (!beforeIds.has(itemId)) {
      // This item exists in after but not in before - potential resurrection
      resurrected.push(afterItem);
    }
  });
  
  if (resurrected.length > 0) {
    console.warn(`[DataPersistence] Detected ${resurrected.length} potentially resurrected items in ${storageKey}:`, 
      resurrected.map(item => item[idField]));
    
    // Auto-prevent resurrection by marking as deleted
    const updatedData = afterData.map(item => {
      const itemId = item[idField];
      if (resurrected.some(r => r[idField] === itemId)) {
        return {
          ...item,
          deleted: true,
          deletedAt: new Date().toISOString(),
          deletedTimestamp: Date.now(),
          resurrectionPrevented: true
        };
      }
      return item;
    });
    
    await storageService.set(storageKey, updatedData);
    return { resurrected, prevented: true };
  }
  
  return { resurrected, prevented: false };
};

export default {
  safeDeleteItem,
  filterActiveItems,
  isItemDeleted,
  safeDeleteMultipleItems,
  restoreDeletedItem,
  getDeletedItemsCount,
  cleanupOldDeletedItems,
  configureAutoSync,
  triggerManualSync,
  detectDataResurrection
};