import { storageService } from '../services/storage';
import { getCurrentUser } from './access-control-helper';

export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  action: string;
  path: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

/**
 * Log user activity
 */
export async function logActivity(
  action: string,
  path: string,
  details?: Record<string, any>
): Promise<void> {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // Get IP address (if available)
    let ipAddress: string | undefined;
    try {
      // Try to get IP from Electron or browser
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.getIPAddress) {
        ipAddress = await electronAPI.getIPAddress();
      }
    } catch {
      // IP not available, skip
    }

    // Get user agent
    const userAgent = navigator.userAgent;

    const log: ActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      userId: currentUser.id,
      username: currentUser.username,
      fullName: currentUser.fullName,
      action,
      path,
      timestamp: new Date().toISOString(),
      ipAddress,
      userAgent,
      details,
    };

    // Load existing logs
    const existingLogs = await storageService.get<ActivityLog[]>('activityLogs') || [];
    
    // Add new log
    const updatedLogs = [log, ...existingLogs];
    
    // Keep only last 10000 logs to prevent storage bloat
    const maxLogs = 10000;
    const trimmedLogs = updatedLogs.slice(0, maxLogs);
    
    // Save logs
    await storageService.set('activityLogs', trimmedLogs);
  } catch (error) {
    // Silent fail - don't break app if logging fails
    console.error('[ActivityLogger] Error logging activity:', error);
  }
}

/**
 * Log user login
 */
export async function logLogin(userId?: string, username?: string, fullName?: string): Promise<void> {
  // If user info provided, use it directly (for login before currentUser is set)
  if (userId && username && fullName) {
    try {
      let ipAddress: string | undefined;
      try {
        const electronAPI = (window as any).electronAPI;
        if (electronAPI?.getIPAddress) {
          ipAddress = await electronAPI.getIPAddress();
        }
      } catch {
        // IP not available
      }

      const userAgent = navigator.userAgent;

      const log: ActivityLog = {
        id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        userId,
        username,
        fullName,
        action: 'LOGIN',
        path: '/login',
        timestamp: new Date().toISOString(),
        ipAddress,
        userAgent,
      };

      const existingLogs = await storageService.get<ActivityLog[]>('activityLogs') || [];
      const updatedLogs = [log, ...existingLogs];
      const maxLogs = 10000;
      const trimmedLogs = updatedLogs.slice(0, maxLogs);
      await storageService.set('activityLogs', trimmedLogs);
      return;
    } catch (error) {
      console.error('[ActivityLogger] Error logging login:', error);
      return;
    }
  }
  
  // Fallback to normal logActivity
  await logActivity('LOGIN', '/login');
}

/**
 * Log user logout
 */
export async function logLogout(): Promise<void> {
  await logActivity('LOGOUT', '/');
}

/**
 * Log navigation/route access
 */
export async function logNavigation(path: string): Promise<void> {
  await logActivity('NAVIGATE', path);
}

/**
 * Log data modification
 */
export async function logDataModification(
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entity: string,
  entityId: string,
  path: string,
  additionalDetails?: Record<string, any>
): Promise<void> {
  await logActivity(action, path, {
    entity,
    entityId,
    ...additionalDetails,
  });
}

/**
 * Log CREATE operation
 */
export async function logCreate(
  entity: string,
  entityId: string,
  path: string,
  details?: Record<string, any>
): Promise<void> {
  await logDataModification('CREATE', entity, entityId, path, details);
}

/**
 * Log UPDATE operation
 */
export async function logUpdate(
  entity: string,
  entityId: string,
  path: string,
  details?: Record<string, any>
): Promise<void> {
  await logDataModification('UPDATE', entity, entityId, path, details);
}

/**
 * Log DELETE operation
 */
export async function logDelete(
  entity: string,
  entityId: string,
  path: string,
  details?: Record<string, any>
): Promise<void> {
  await logDataModification('DELETE', entity, entityId, path, details);
}
