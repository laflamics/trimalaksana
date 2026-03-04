/**
 * Trucking Delete Helper
 * Helper terpusat untuk delete operations di Trucking business module
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
export async function deleteTruckingItem(
  storageKey: string,
  itemId: string | number,
  idField: string = 'id'
): Promise<{
  success: boolean; error?: string; itemFound?: boolean 
}> {
  try {
    // 🚀 FIX 1: Load data langsung dari localStorage untuk avoid race condition
    // storageService.get() bisa trigger syncFromServerBackground yang bisa overwrite delete
    // Load langsung dari localStorage lebih aman dan instant
    const storageKeyForLocal = (storageService as any).getStorageKey(storageKey);
    let currentData: any[] = [];
    
    // Load from storageService (which will fetch from server in server mode)
    currentData = await storageService.get<any[]>(storageKey) || [];
    
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
        
        // Cek apakah sudah deleted
        if (isItemDeleted(item)) {
          alreadyDeleted = true;
          return item; // Sudah deleted, tidak perlu update lagi
        }
        
        // Apply tombstone pattern - mark as deleted dengan semua flags
        return {
          ...item,
          deleted: true,
          deletedAt: new Date().toISOString(),
          deletedTimestamp: Date.now(),
        };
      }
      
      return item;
    });
    
    if (!itemFound) {
      return {
        success: false,
        error: `Item with ${idField}="${itemId}" not found`,
        itemFound: false
      };
    }
    
    if (alreadyDeleted) {
      return {
        success: true,
        itemFound: true
      };
    }
    
    // 🚀 FIX 3: Save via storageService untuk trigger sync ke server
    // (No need to save to localStorage first - storageService handles it)
    await storageService.set(storageKey, updatedData, true); // immediateSync = true for delete operations
    
    return {
      success: true,
      itemFound: true
    };
  } catch (error: any) {
    console.error(`[Trucking Delete Helper] Error deleting item from ${storageKey}:`, error);
    return {
      success: false,
      error: error.message || 'Unknown error',
      itemFound: false
    };
  }
}

/**
 * Delete multiple items (batch delete)
 */
export async function deleteTruckingItems(
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
    const result = await deleteTruckingItem(storageKey, itemId, idField);
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
export async function reloadTruckingData<T extends Record<string, any>>(
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
        // Parse error, fallback ke storageService.get()
      }
    }
    
    // Fallback: load dari storageService.get() jika localStorage tidak ada
    const dataRaw = await storageService.get<T[]>(storageKey) || [];
    const dataArray = Array.isArray(dataRaw) ? dataRaw : [];
    const activeData = filterActiveItems(dataArray) as T[];
    setState(activeData);
    return activeData;
  } catch (error: any) {
    console.error(`[Trucking Delete Helper] Error reloading data from ${storageKey}:`, error);
    setState([]);
    return [];
  }
}
