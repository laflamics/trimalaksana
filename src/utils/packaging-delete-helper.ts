/**
 * Packaging Delete Helper
 * Simple delete - just remove item from array and POST back to PostgreSQL
 * No tombstone pattern, no complex sync logic
 */

import { storageService } from '../services/storage';

export function normalizeId(id: string | number | null | undefined): string {
  if (id === null || id === undefined) return '';
  return String(id).trim();
}

export function isItemDeleted(item: any): boolean {
  return false;
}

export function filterActiveItems<T extends Record<string, any>>(items: T[]): T[] {
  if (!Array.isArray(items)) return [];
  return items;
}

export async function deletePackagingItem(
  storageKey: string,
  itemId: string | number,
  idField: string = 'id'
): Promise<{ success: boolean; error?: string; itemFound?: boolean }> {
  try {
    const currentData = await storageService.get<any[]>(storageKey) || [];

    if (!Array.isArray(currentData)) {
      return {
        success: false,
        error: `Data for key ${storageKey} is not an array`,
        itemFound: false
      };
    }

    const normalizedTargetId = normalizeId(itemId);
    let itemFound = false;
    let itemIndex = -1;

    for (let i = 0; i < currentData.length; i++) {
      const item = currentData[i];
      if (!item) continue;

      const itemIdValue = item[idField];
      const normalizedItemId = normalizeId(itemIdValue);

      if (normalizedItemId === normalizedTargetId) {
        itemFound = true;
        itemIndex = i;
        break;
      }
    }

    if (!itemFound) {
      return {
        success: false,
        error: `Item with ${idField}="${itemId}" not found in ${storageKey}`,
        itemFound: false
      };
    }

    const updatedData = currentData.filter((_, index) => index !== itemIndex);
    await storageService.set(storageKey, updatedData);

    window.dispatchEvent(new CustomEvent('app-storage-changed', {
      detail: { 
        key: storageKey, 
        value: updatedData,
        action: 'delete',
        itemId: itemId
      }
    }));

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

  for (const itemId of itemIds) {
    const result = await deletePackagingItem(storageKey, itemId, idField);
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      if (result.error) {
        results.errors.push(`${itemId}: ${result.error}`);
      }
    }
  }

  return results;
}

export async function reloadPackagingData<T extends Record<string, any>>(
  storageKey: string,
  setState: (data: T[]) => void
): Promise<T[]> {
  try {
    const data = await storageService.get<T[]>(storageKey) || [];
    const dataArray = Array.isArray(data) ? data : [];
    setState(dataArray);
    return dataArray;
  } catch (error: any) {
    return [];
  }
}

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

  for (const dep of dependencies) {
    try {
      const depData = await storageService.get<any[]>(dep.storageKey) || [];
      const depDataArray = Array.isArray(depData) ? depData : [];

      const hasDependency = depDataArray.some((item: any) => 
        dep.checkFn(item, itemId)
      );

      if (hasDependency) {
        blockingReasons.push(dep.name);
      }
    } catch (error) {
      // Silent fail
    }
  }

  return {
    canDelete: blockingReasons.length === 0,
    blockingReasons
  };
}

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
  const canDelete = await canDeleteItem(itemId, storageKey, dependencies, idField);

  if (!canDelete.canDelete) {
    return {
      success: false,
      error: 'Item has dependencies',
      blockingReasons: canDelete.blockingReasons
    };
  }

  return await deletePackagingItem(storageKey, itemId, idField);
}
