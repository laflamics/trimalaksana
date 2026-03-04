/**
 * Storage Operations Helper
 * 
 * Centralized helper functions for common storage operations.
 * Provides a consistent interface for loading, saving, updating, and deleting data.
 * 
 * Usage:
 * ```typescript
 * import { loadFromStorage, saveToStorage } from '@/utils/storage-operations-helper';
 * import { StorageKeys } from '@/services/storage';
 * 
 * // Load data
 * const data = await loadFromStorage<SalesOrder[]>(StorageKeys.GENERAL_TRADING.SALES_ORDERS);
 * 
 * // Save data
 * await saveToStorage(StorageKeys.GENERAL_TRADING.SALES_ORDERS, updatedData);
 * 
 * // Update data
 * await updateInStorage(StorageKeys.GENERAL_TRADING.SALES_ORDERS, (items) => {
 *   return items.map(item => item.id === id ? { ...item, ...updates } : item);
 * });
 * 
 * // Delete item
 * await deleteFromStorage(StorageKeys.GENERAL_TRADING.SALES_ORDERS, itemId);
 * ```
 */

import { storageService } from '@/services/storage';

/**
 * Load data from storage
 * 
 * @param key - Storage key to load from
 * @param defaultValue - Default value if key doesn't exist
 * @returns Data from storage or default value
 * 
 * @example
 * const data = await loadFromStorage<SalesOrder[]>(StorageKeys.GENERAL_TRADING.SALES_ORDERS);
 */
export async function loadFromStorage<T>(
  key: string,
  defaultValue?: T
): Promise<T | null> {
  try {
    const data = await storageService.get<T>(key);
    return data !== null ? data : (defaultValue ?? null);
  } catch (error) {
    console.error(`[StorageHelper] Error loading from ${key}:`, error);
    return defaultValue ?? null;
  }
}

/**
 * Save data to storage
 * 
 * @param key - Storage key to save to
 * @param data - Data to save
 * @param immediateSync - Whether to sync immediately (default: false)
 * 
 * @example
 * await saveToStorage(StorageKeys.GENERAL_TRADING.SALES_ORDERS, updatedData);
 */
export async function saveToStorage<T>(
  key: string,
  data: T,
  immediateSync: boolean = false
): Promise<void> {
  try {
    await storageService.set(key, data, immediateSync);
  } catch (error) {
    console.error(`[StorageHelper] Error saving to ${key}:`, error);
    throw error;
  }
}

/**
 * Update data in storage using a callback function
 * 
 * Loads current data, applies update function, and saves back to storage.
 * 
 * @param key - Storage key to update
 * @param updateFn - Function that receives current data and returns updated data
 * 
 * @example
 * await updateInStorage(StorageKeys.GENERAL_TRADING.SALES_ORDERS, (items) => {
 *   return items.map(item => item.id === id ? { ...item, status: 'completed' } : item);
 * });
 */
export async function updateInStorage<T>(
  key: string,
  updateFn: (data: T[]) => T[]
): Promise<void> {
  try {
    const currentData = await loadFromStorage<T[]>(key, []);
    if (!Array.isArray(currentData)) {
      console.warn(`[StorageHelper] Data at ${key} is not an array, skipping update`);
      return;
    }

    const updatedData = updateFn(currentData);
    await saveToStorage(key, updatedData);
  } catch (error) {
    console.error(`[StorageHelper] Error updating ${key}:`, error);
    throw error;
  }
}

/**
 * Delete a single item from storage
 * 
 * @param key - Storage key containing the array
 * @param itemId - ID of item to delete
 * @param idField - Field name to match against (default: 'id')
 * 
 * @example
 * await deleteFromStorage(StorageKeys.GENERAL_TRADING.SALES_ORDERS, '123');
 */
export async function deleteFromStorage(
  key: string,
  itemId: string | number,
  idField: string = 'id'
): Promise<void> {
  try {
    await storageService.removeItem(key, itemId, idField);
  } catch (error) {
    console.error(`[StorageHelper] Error deleting from ${key}:`, error);
    throw error;
  }
}

/**
 * Delete multiple items from storage
 * 
 * @param key - Storage key containing the array
 * @param itemIds - Array of IDs to delete
 * @param idField - Field name to match against (default: 'id')
 * 
 * @example
 * await deleteMultipleFromStorage(StorageKeys.GENERAL_TRADING.SALES_ORDERS, ['123', '456']);
 */
export async function deleteMultipleFromStorage(
  key: string,
  itemIds: (string | number)[],
  idField: string = 'id'
): Promise<void> {
  try {
    const currentData = await loadFromStorage<any[]>(key, []);
    if (!Array.isArray(currentData)) {
      console.warn(`[StorageHelper] Data at ${key} is not an array, skipping delete`);
      return;
    }

    const itemIdSet = new Set(itemIds.map(id => String(id)));
    const updatedData = currentData.filter((item: any) => {
      if (!item) return true;
      const itemIdValue = item[idField];
      return !itemIdSet.has(String(itemIdValue));
    });

    await saveToStorage(key, updatedData);
  } catch (error) {
    console.error(`[StorageHelper] Error deleting multiple from ${key}:`, error);
    throw error;
  }
}

/**
 * Get count of items in storage
 * 
 * @param key - Storage key to count
 * @returns Number of items in the array
 * 
 * @example
 * const count = await getItemCount(StorageKeys.GENERAL_TRADING.SALES_ORDERS);
 */
export async function getItemCount(key: string): Promise<number> {
  try {
    const data = await loadFromStorage<any[]>(key, []);
    return Array.isArray(data) ? data.length : 0;
  } catch (error) {
    console.error(`[StorageHelper] Error getting item count from ${key}:`, error);
    return 0;
  }
}

/**
 * Clear entire storage key (delete all data)
 * 
 * @param key - Storage key to clear
 * 
 * @example
 * await clearStorage(StorageKeys.GENERAL_TRADING.SALES_ORDERS);
 */
export async function clearStorage(key: string): Promise<void> {
  try {
    await storageService.remove(key);
  } catch (error) {
    console.error(`[StorageHelper] Error clearing ${key}:`, error);
    throw error;
  }
}

/**
 * Add item to storage array
 * 
 * @param key - Storage key containing the array
 * @param item - Item to add
 * 
 * @example
 * await addToStorage(StorageKeys.GENERAL_TRADING.SALES_ORDERS, newOrder);
 */
export async function addToStorage<T>(
  key: string,
  item: T
): Promise<void> {
  try {
    const currentData = await loadFromStorage<T[]>(key, []);
    if (!Array.isArray(currentData)) {
      console.warn(`[StorageHelper] Data at ${key} is not an array, creating new array`);
      await saveToStorage(key, [item]);
      return;
    }

    const updatedData = [...currentData, item];
    await saveToStorage(key, updatedData);
  } catch (error) {
    console.error(`[StorageHelper] Error adding to ${key}:`, error);
    throw error;
  }
}

/**
 * Find item in storage by predicate
 * 
 * @param key - Storage key containing the array
 * @param predicate - Function to test each item
 * @returns First item matching predicate or null
 * 
 * @example
 * const order = await findInStorage(
 *   StorageKeys.GENERAL_TRADING.SALES_ORDERS,
 *   (item) => item.id === '123'
 * );
 */
export async function findInStorage<T>(
  key: string,
  predicate: (item: T) => boolean
): Promise<T | null> {
  try {
    const data = await loadFromStorage<T[]>(key, []);
    if (!Array.isArray(data)) {
      return null;
    }

    const found = data.find(predicate);
    return found ?? null;
  } catch (error) {
    console.error(`[StorageHelper] Error finding in ${key}:`, error);
    return null;
  }
}

/**
 * Filter items in storage by predicate
 * 
 * @param key - Storage key containing the array
 * @param predicate - Function to test each item
 * @returns Array of items matching predicate
 * 
 * @example
 * const completedOrders = await filterInStorage(
 *   StorageKeys.GENERAL_TRADING.SALES_ORDERS,
 *   (item) => item.status === 'completed'
 * );
 */
export async function filterInStorage<T>(
  key: string,
  predicate: (item: T) => boolean
): Promise<T[]> {
  try {
    const data = await loadFromStorage<T[]>(key, []);
    if (!Array.isArray(data)) {
      return [];
    }

    return data.filter(predicate);
  } catch (error) {
    console.error(`[StorageHelper] Error filtering ${key}:`, error);
    return [];
  }
}
