/**
 * Notification Helper
 * 
 * Centralized helper functions for managing notifications across all modules.
 * Provides a consistent interface for creating, updating, and deleting notifications.
 * 
 * Usage:
 * ```typescript
 * import { createNotification, updateNotification } from '@/utils/notification-helper';
 * import { StorageKeys } from '@/services/storage';
 * 
 * // Create notification
 * await createNotification('general-trading', 'invoice', {
 *   invoiceId: '123',
 *   amount: 1000,
 *   status: 'pending'
 * });
 * 
 * // Update notification
 * await updateNotification('general-trading', 'notificationId', {
 *   status: 'read'
 * });
 * 
 * // Delete notification
 * await deleteNotification('general-trading', 'notificationId');
 * ```
 */

import { BusinessType, StorageKeys } from '@/services/storage';
import {
  loadFromStorage,
  saveToStorage,
  updateInStorage,
  deleteFromStorage,
  filterInStorage,
} from '@/utils/storage-operations-helper';

/**
 * Get notification storage key for a business type
 */
function getNotificationKey(business: BusinessType, type: string): string {
  const typeMap: Record<string, Record<BusinessType, string>> = {
    invoice: {
      'packaging': StorageKeys.PACKAGING.INVOICE_NOTIFICATIONS,
      'general-trading': StorageKeys.GENERAL_TRADING.INVOICE_NOTIFICATIONS,
      'trucking': StorageKeys.TRUCKING.INVOICE_NOTIFICATIONS,
    },
    delivery: {
      'packaging': StorageKeys.PACKAGING.DELIVERY_NOTIFICATIONS,
      'general-trading': StorageKeys.GENERAL_TRADING.DELIVERY_NOTIFICATIONS,
      'trucking': StorageKeys.TRUCKING.SURAT_JALAN_NOTIFICATIONS,
    },
    finance: {
      'packaging': StorageKeys.PACKAGING.FINANCE_NOTIFICATIONS,
      'general-trading': StorageKeys.GENERAL_TRADING.FINANCE_NOTIFICATIONS,
      'trucking': StorageKeys.TRUCKING.FINANCE_NOTIFICATIONS,
    },
    production: {
      'packaging': StorageKeys.PACKAGING.PRODUCTION_NOTIFICATIONS,
      'general-trading': StorageKeys.GENERAL_TRADING.PRODUCTION_NOTIFICATIONS,
      'trucking': StorageKeys.TRUCKING.UNIT_NOTIFICATIONS,
    },
    pettycash: {
      'packaging': StorageKeys.PACKAGING.FINANCE_NOTIFICATIONS,
      'general-trading': StorageKeys.GENERAL_TRADING.FINANCE_NOTIFICATIONS,
      'trucking': StorageKeys.TRUCKING.PETTY_CASH_NOTIFICATIONS,
    },
    purchasing: {
      'packaging': StorageKeys.PACKAGING.PRODUCTION_NOTIFICATIONS,
      'general-trading': StorageKeys.GENERAL_TRADING.PURCHASING_NOTIFICATIONS,
      'trucking': StorageKeys.TRUCKING.UNIT_NOTIFICATIONS,
    },
    ppic: {
      'packaging': StorageKeys.PACKAGING.PRODUCTION_NOTIFICATIONS,
      'general-trading': StorageKeys.GENERAL_TRADING.PPIC_NOTIFICATIONS,
      'trucking': StorageKeys.TRUCKING.UNIT_NOTIFICATIONS,
    },
  };

  const key = typeMap[type]?.[business];
  if (!key) {
    console.warn(`[NotificationHelper] Unknown notification type: ${type} for business: ${business}`);
    return '';
  }

  return key;
}

/**
 * Create a new notification
 * 
 * @param business - Business type (packaging, general-trading, trucking)
 * @param notificationType - Type of notification (invoice, delivery, finance, etc.)
 * @param data - Notification data
 * 
 * @example
 * await createNotification('general-trading', 'invoice', {
 *   invoiceId: '123',
 *   amount: 1000,
 *   status: 'pending'
 * });
 */
export async function createNotification(
  business: BusinessType,
  notificationType: string,
  data: any
): Promise<void> {
  try {
    const key = getNotificationKey(business, notificationType);
    if (!key) return;

    const notification = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: notificationType,
      data,
      createdAt: new Date().toISOString(),
      read: false,
      ...data,
    };

    const currentNotifications = await loadFromStorage<any[]>(key, []);
    if (!Array.isArray(currentNotifications)) {
      await saveToStorage(key, [notification]);
      return;
    }

    const updatedNotifications = [...currentNotifications, notification];
    await saveToStorage(key, updatedNotifications);
  } catch (error) {
    console.error(`[NotificationHelper] Error creating notification:`, error);
    throw error;
  }
}

/**
 * Update an existing notification
 * 
 * @param business - Business type
 * @param notificationId - ID of notification to update
 * @param updates - Fields to update
 * 
 * @example
 * await updateNotification('general-trading', 'notificationId', {
 *   status: 'read'
 * });
 */
export async function updateNotification(
  business: BusinessType,
  notificationType: string,
  notificationId: string,
  updates: any
): Promise<void> {
  try {
    const key = getNotificationKey(business, notificationType);
    if (!key) return;

    await updateInStorage(key, (notifications) => {
      return notifications.map((notification: any) => {
        if (notification.id === notificationId) {
          return {
            ...notification,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
        }
        return notification;
      });
    });
  } catch (error) {
    console.error(`[NotificationHelper] Error updating notification:`, error);
    throw error;
  }
}

/**
 * Delete a notification
 * 
 * @param business - Business type
 * @param notificationId - ID of notification to delete
 * 
 * @example
 * await deleteNotification('general-trading', 'notificationId');
 */
export async function deleteNotification(
  business: BusinessType,
  notificationType: string,
  notificationId: string
): Promise<void> {
  try {
    const key = getNotificationKey(business, notificationType);
    if (!key) return;

    await deleteFromStorage(key, notificationId);
  } catch (error) {
    console.error(`[NotificationHelper] Error deleting notification:`, error);
    throw error;
  }
}

/**
 * Get notifications by type
 * 
 * @param business - Business type
 * @param notificationType - Type of notification
 * @returns Array of notifications
 * 
 * @example
 * const invoiceNotifications = await getNotificationsByType('general-trading', 'invoice');
 */
export async function getNotificationsByType(
  business: BusinessType,
  notificationType: string
): Promise<any[]> {
  try {
    const key = getNotificationKey(business, notificationType);
    if (!key) return [];

    const notifications = await loadFromStorage<any[]>(key, []);
    return Array.isArray(notifications) ? notifications : [];
  } catch (error) {
    console.error(`[NotificationHelper] Error getting notifications:`, error);
    return [];
  }
}

/**
 * Get unread notifications
 * 
 * @param business - Business type
 * @param notificationType - Type of notification
 * @returns Array of unread notifications
 * 
 * @example
 * const unreadInvoices = await getUnreadNotifications('general-trading', 'invoice');
 */
export async function getUnreadNotifications(
  business: BusinessType,
  notificationType: string
): Promise<any[]> {
  try {
    return await filterInStorage(
      getNotificationKey(business, notificationType),
      (notification: any) => !notification.read
    );
  } catch (error) {
    console.error(`[NotificationHelper] Error getting unread notifications:`, error);
    return [];
  }
}

/**
 * Mark notification as read
 * 
 * @param business - Business type
 * @param notificationId - ID of notification
 * 
 * @example
 * await markNotificationAsRead('general-trading', 'notificationId');
 */
export async function markNotificationAsRead(
  business: BusinessType,
  notificationType: string,
  notificationId: string
): Promise<void> {
  try {
    await updateNotification(business, notificationType, notificationId, {
      read: true,
      readAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`[NotificationHelper] Error marking notification as read:`, error);
    throw error;
  }
}

/**
 * Mark all notifications as read
 * 
 * @param business - Business type
 * @param notificationType - Type of notification
 * 
 * @example
 * await markAllNotificationsAsRead('general-trading', 'invoice');
 */
export async function markAllNotificationsAsRead(
  business: BusinessType,
  notificationType: string
): Promise<void> {
  try {
    const key = getNotificationKey(business, notificationType);
    if (!key) return;

    await updateInStorage(key, (notifications) => {
      return notifications.map((notification: any) => ({
        ...notification,
        read: true,
        readAt: new Date().toISOString(),
      }));
    });
  } catch (error) {
    console.error(`[NotificationHelper] Error marking all notifications as read:`, error);
    throw error;
  }
}

/**
 * Clear all notifications
 * 
 * @param business - Business type
 * @param notificationType - Type of notification
 * 
 * @example
 * await clearAllNotifications('general-trading', 'invoice');
 */
export async function clearAllNotifications(
  business: BusinessType,
  notificationType: string
): Promise<void> {
  try {
    const key = getNotificationKey(business, notificationType);
    if (!key) return;

    await saveToStorage(key, []);
  } catch (error) {
    console.error(`[NotificationHelper] Error clearing notifications:`, error);
    throw error;
  }
}

/**
 * Get notification count
 * 
 * @param business - Business type
 * @param notificationType - Type of notification
 * @returns Number of notifications
 * 
 * @example
 * const count = await getNotificationCount('general-trading', 'invoice');
 */
export async function getNotificationCount(
  business: BusinessType,
  notificationType: string
): Promise<number> {
  try {
    const notifications = await getNotificationsByType(business, notificationType);
    return notifications.length;
  } catch (error) {
    console.error(`[NotificationHelper] Error getting notification count:`, error);
    return 0;
  }
}

/**
 * Get unread notification count
 * 
 * @param business - Business type
 * @param notificationType - Type of notification
 * @returns Number of unread notifications
 * 
 * @example
 * const unreadCount = await getUnreadNotificationCount('general-trading', 'invoice');
 */
export async function getUnreadNotificationCount(
  business: BusinessType,
  notificationType: string
): Promise<number> {
  try {
    const unreadNotifications = await getUnreadNotifications(business, notificationType);
    return unreadNotifications.length;
  } catch (error) {
    console.error(`[NotificationHelper] Error getting unread notification count:`, error);
    return 0;
  }
}
