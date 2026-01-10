/**
 * Packaging Delete Helper
 * Helper terpusat untuk delete operations di packaging business module
 * Memastikan konsistensi dan sync antar device bekerja dengan benar
 */

import { storageService } from '../services/storage';

/**
 * 🚀 FIX 4: Standardize ID normalization - export untuk dipakai di semua tempat
 * Normalisasi ID untuk comparison (handle string vs number)
 */
export function normalizeId(id: string | number | null | undefined): string {
  if (id === null || id === undefined) return '';
  return String(id).trim();
}

/**
 * 🚀 FIX 5: Standardize filter deleted items - konsisten check deleted flags
 * Cek apakah item sudah deleted (konsisten check)
 * IMPORTANT: Pakai function ini di semua tempat untuk konsistensi
 */
export function isItemDeleted(item: any): boolean {
  if (!item) return false;
  // Cek semua kemungkinan deleted flag - konsisten di semua tempat
  return (
    item.deleted === true ||
    item.deleted === 'true' ||
    !!item.deletedAt ||
    !!item.deletedTimestamp
  );
}

/**
 * Filter active items (konsisten - cek semua deleted flags)
 */
export function filterActiveItems<T extends Record<string, any>>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  return items.filter(item => !isItemDeleted(item));
}

/**
 * Find item by ID dengan normalisasi (handle string vs number)
 */
function findItemById(
  items: any[],
  itemId: string | number,
  idField: string = 'id'
): any | null {
  if (!Array.isArray(items)) return null;
  
  const normalizedTargetId = normalizeId(itemId);
  
  for (const item of items) {
    if (!item) continue;
    const itemIdValue = item[idField];
    const normalizedItemId = normalizeId(itemIdValue);
    
    if (normalizedItemId === normalizedTargetId) {
      return item;
    }
  }
  
  return null;
}

/**
 * 🚀 TOMBSTONE PATTERN: Delete item dengan tombstone pattern (konsisten dan sync-safe)
 * 
 * Tombstone pattern = Mark item sebagai deleted, bukan hapus fisik
 * - Item tetap ada di storage dengan flag deleted: true
 * - Deleted items di-preserve untuk sync antar device
 * - Server dan device lain akan tahu item sudah di-delete
 * - Deleted items tidak akan muncul di UI (filtered out)
 * - Deleted items tidak bisa di-restore oleh server sync
 * 
 * CRITICAL: Tombstone flags:
 * - deleted: true (boolean flag)
 * - deletedAt: ISO timestamp (human readable)
 * - deletedTimestamp: number timestamp (for comparison)
 * 
 * Semua 3 flags harus ada untuk memastikan tombstone kuat dan tidak bisa di-overwrite
 */
export async function deletePackagingItem(
  storageKey: string,
  itemId: string | number,
  idField: string = 'id'
): Promise<{ success: boolean; error?: string; itemFound?: boolean }> {
  try {
    // 🚀 FIX 1: Load data langsung dari localStorage untuk avoid race condition
    // storageService.get() bisa trigger syncFromServerBackground yang bisa overwrite delete
    // Load langsung dari localStorage lebih aman dan instant
    const storageKeyForLocal = (storageService as any).getStorageKey(storageKey);
    let currentData: any[] = [];
    
    // Try load dari localStorage dulu (instant, no sync trigger)
    const stored = localStorage.getItem(storageKeyForLocal);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const extracted = parsed.value !== undefined ? parsed.value : parsed;
        currentData = Array.isArray(extracted) ? extracted : [];
      } catch (e) {
        // Parse error, fallback ke storageService.get()
        currentData = await storageService.get<any[]>(storageKey) || [];
      }
    } else {
      // Tidak ada di localStorage, fallback ke storageService.get()
      currentData = await storageService.get<any[]>(storageKey) || [];
    }
    
    if (!Array.isArray(currentData)) {
      return {
        success: false,
        error: `Data for key ${storageKey} is not an array`,
        itemFound: false
      };
    }
    
    // Find item dengan normalisasi ID
    const normalizedTargetId = normalizeId(itemId);
    let itemFound = false;
    let alreadyDeleted = false;
    
    // 🚀 TOMBSTONE: Apply tombstone pattern - mark as deleted, jangan hapus fisik
    const updatedData = currentData.map((item: any) => {
      if (!item) return item;
      
      const itemIdValue = item[idField];
      const normalizedItemId = normalizeId(itemIdValue);
      
      if (normalizedItemId === normalizedTargetId) {
        itemFound = true;
        
        // Cek apakah sudah deleted (tombstone sudah ada)
        if (isItemDeleted(item)) {
          alreadyDeleted = true;
          // 🚀 TOMBSTONE: Keep existing tombstone - jangan overwrite
          // Pastikan semua tombstone flags tetap ada
          return {
            ...item,
            deleted: true,
            deletedAt: item.deletedAt || new Date().toISOString(),
            deletedTimestamp: item.deletedTimestamp || Date.now()
          };
        }
        
        // 🚀 TOMBSTONE: Mark as deleted dengan SEMUA tombstone flags
        // Semua 3 flags harus ada untuk memastikan tombstone kuat
        const tombstoneTimestamp = Date.now();
        return {
          ...item,
          deleted: true,                    // Boolean flag (primary)
          deletedAt: new Date().toISOString(), // ISO timestamp (human readable)
          deletedTimestamp: tombstoneTimestamp  // Number timestamp (for comparison)
        };
      }
      
      return item;
    });
    
    if (!itemFound) {
      return {
        success: false,
        error: `Item with ${idField}="${itemId}" not found in ${storageKey}`,
        itemFound: false
      };
    }
    
    if (alreadyDeleted) {
      return {
        success: true,
        error: `Item already deleted`,
        itemFound: true
      };
    }
    
    // 🚀 TOMBSTONE: Pakai storageService.set() untuk save tombstone
    // storageService.set() akan:
    // 1. Save ke localStorage (instant, local)
    // 2. Save ke file storage (Electron, async)
    // 3. Sync ke server (background, dengan tombstone flags)
    // 
    // CRITICAL: Semua deleted items (tombstone) akan di-sync ke server
    // Server akan preserve tombstone dan tidak akan restore deleted items
    await storageService.set(storageKey, updatedData);
    
    // 🚀 TOMBSTONE: Verify tombstone berhasil di-save
    // Pastikan item benar-benar punya semua tombstone flags
    // 🚀 FIX 1: Load langsung dari localStorage untuk avoid race condition
    const verifyStored = localStorage.getItem(storageKeyForLocal);
    let verifyData: any[] = [];
    if (verifyStored) {
      try {
        const verifyParsed = JSON.parse(verifyStored);
        const verifyExtracted = verifyParsed.value !== undefined ? verifyParsed.value : verifyParsed;
        verifyData = Array.isArray(verifyExtracted) ? verifyExtracted : [];
      } catch (e) {
        // Parse error, fallback ke storageService.get()
        verifyData = await storageService.get<any[]>(storageKey) || [];
      }
    } else {
      // Tidak ada di localStorage, fallback ke storageService.get()
      verifyData = await storageService.get<any[]>(storageKey) || [];
    }
    const deletedItem = Array.isArray(verifyData) ? verifyData.find((item: any) => {
      if (!item) return false;
      const itemIdValue = item[idField];
      const normalizedItemId = normalizeId(itemIdValue);
      return normalizedItemId === normalizedTargetId;
    }) : null;
    
    // Verify tombstone flags lengkap
    if (deletedItem) {
      const hasTombstone = isItemDeleted(deletedItem);
      if (!hasTombstone) {
        console.error('[PackagingDelete] ❌ TOMBSTONE FAILED: Item not marked as deleted after save:', deletedItem);
        return {
          success: false,
          error: 'Tombstone pattern failed - item not marked as deleted after save',
          itemFound: true
        };
      }
      
      // Verify semua tombstone flags ada
      const hasAllFlags = deletedItem.deleted === true && 
                          deletedItem.deletedAt && 
                          deletedItem.deletedTimestamp;
      if (!hasAllFlags) {
        console.warn('[PackagingDelete] ⚠️ TOMBSTONE INCOMPLETE: Missing some tombstone flags:', {
          deleted: deletedItem.deleted,
          deletedAt: deletedItem.deletedAt,
          deletedTimestamp: deletedItem.deletedTimestamp
        });
        // Tidak return error, tapi warn - tombstone masih bisa bekerja dengan 1 flag
      }
    }
    
    // 🚀 TOMBSTONE: Dispatch events untuk trigger UI update
    // Events akan trigger filter otomatis di semua module yang listen
    // Deleted items (tombstone) akan di-filter out dari UI
    const actualStorageKey = (storageService as any).getStorageKey(storageKey);
    window.dispatchEvent(new CustomEvent('app-storage-changed', {
      detail: { 
        key: actualStorageKey, 
        value: updatedData, // Includes tombstone items
        action: 'delete',
        storageKey: storageKey,
        itemId: itemId,
        tombstone: true // Flag untuk indicate tombstone pattern
      }
    }));
    
    // 🚀 TOMBSTONE: Dispatch custom event untuk packaging delete
    window.dispatchEvent(new CustomEvent('packaging-item-deleted', {
      detail: {
        storageKey: storageKey,
        itemId: itemId,
        idField: idField,
        deletedData: updatedData, // Includes tombstone items
        tombstone: true // Flag untuk indicate tombstone pattern
      }
    }));
    
    // 🚀 TOMBSTONE: Return immediately - tombstone sudah di-save
    // - Local: Item sudah di-mark deleted (tombstone)
    // - UI: Filter akan otomatis hide deleted items
    // - Server: Sync akan berjalan di background dengan tombstone flags
    // - Other devices: Akan terima tombstone dan apply deletion
    return {
      success: true,
      itemFound: true
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error',
      itemFound: false
    };
  }
}

/**
 * Delete multiple items (batch operation - parallel untuk lebih cepat)
 */
export async function deletePackagingItems(
  storageKey: string,
  itemIds: (string | number)[],
  idField: string = 'id'
): Promise<{ success: number; failed: number; errors: string[] }> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };
  
  // Delete semua items secara parallel (lebih cepat dari sequential)
  const deletePromises = itemIds.map(async (itemId) => {
    const result = await deletePackagingItem(storageKey, itemId, idField);
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      if (result.error) {
        results.errors.push(`${itemId}: ${result.error}`);
      }
    }
    return result;
  });
  
  await Promise.all(deletePromises);
  
  return results;
}

/**
 * Reload data setelah delete (dengan filter active items)
 * 🚀 FIX: Filter otomatis bekerja di sini - setelah delete apapun, langsung filter
 */
export async function reloadPackagingData<T extends Record<string, any>>(
  storageKey: string,
  setState: (data: T[]) => void
): Promise<T[]> {
  try {
    // 🚀 FIX: Tidak perlu wait - langsung load dari localStorage (instant)
    // Data sudah ter-save dengan deleted flag, filter akan otomatis hide deleted items
    const actualStorageKey = (storageService as any).getStorageKey(storageKey);
    const stored = localStorage.getItem(actualStorageKey);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const data = parsed.value || parsed;
        const dataArray = Array.isArray(data) ? data : [];
        // 🚀 FIX: Filter otomatis - deleted items tidak akan muncul
        const activeData = filterActiveItems(dataArray) as T[];
        setState(activeData);
        return activeData;
      } catch (e) {
        // Fallback ke storageService.get() jika parse error
      }
    }
    
    // Fallback: load dari storageService (akan trigger sync, tapi sudah di-filter)
    const data = await storageService.get<T[]>(storageKey) || [];
    const activeData = filterActiveItems(data) as T[];
    setState(activeData);
    return activeData;
  } catch (error: any) {
    return [];
  }
}

/**
 * Cek apakah item bisa di-delete (cek dependencies)
 */
export async function canDeleteItem(
  itemId: string | number,
  storageKey: string,
  dependencies: {
    storageKey: string;
    checkFn: (item: any, targetId: string | number) => boolean;
    name: string;
  }[],
  idField: string = 'id'
): Promise<{ canDelete: boolean; blockingReasons: string[] }> {
  const blockingReasons: string[] = [];
  
  // Cek setiap dependency
  for (const dep of dependencies) {
    try {
      const depData = await storageService.get<any[]>(dep.storageKey) || [];
      const activeDepData = filterActiveItems(depData);
      
      const hasDependency = activeDepData.some((item: any) => 
        dep.checkFn(item, itemId)
      );
      
      if (hasDependency) {
        blockingReasons.push(dep.name);
      }
    } catch (error) {
      // Silent fail - continue check
    }
  }
  
  return {
    canDelete: blockingReasons.length === 0,
    blockingReasons
  };
}

/**
 * Delete item dengan validasi dependencies
 */
export async function safeDeletePackagingItem(
  storageKey: string,
  itemId: string | number,
  dependencies: {
    storageKey: string;
    checkFn: (item: any, targetId: string | number) => boolean;
    name: string;
  }[],
  idField: string = 'id'
): Promise<{ success: boolean; error?: string; blockingReasons?: string[] }> {
  // Cek dependencies dulu
  const canDelete = await canDeleteItem(itemId, storageKey, dependencies, idField);
  
  if (!canDelete.canDelete) {
    return {
      success: false,
      error: 'Item has dependencies',
      blockingReasons: canDelete.blockingReasons
    };
  }
  
  // Delete item
  return await deletePackagingItem(storageKey, itemId, idField);
}
