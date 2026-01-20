import { storageService, extractStorageValue } from '../services/storage';
import { filterActiveItems } from './data-persistence-helper';

export interface UserAccess {
  id: string;
  fullName: string;
  username: string;
  role?: string;
  accessCode?: string;
  isActive: boolean;
  businessUnits: string[];
  defaultBusiness?: string;
  menuAccess?: Record<string, string[]>;
  deleted?: boolean;
  deletedAt?: string;
  deletedTimestamp?: number;
  createdAt?: string;
  updatedAt?: string;
  padCode?: string;
}

export interface CurrentUser {
  id: string;
  fullName: string;
  username: string;
  role?: string;
  defaultBusiness?: string;
}

/**
 * Get current user from localStorage
 */
export function getCurrentUser(): CurrentUser | null {
  try {
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) return null;
    return JSON.parse(currentUserStr);
  } catch {
    return null;
  }
}

/**
 * Check if user is default admin
 */
export function isDefaultAdmin(user: CurrentUser | null): boolean {
  return user?.username === 'admin';
}

/**
 * Normalize path for comparison (remove trailing slash, handle hash router)
 */
export function normalizePath(path: string): string {
  // Remove hash prefix if present (#/)
  let normalized = path.replace(/^#\//, '/');
  // Remove trailing slash
  normalized = normalized.replace(/\/$/, '');
  // Ensure starts with /
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized;
  }
  return normalized;
}

/**
 * Check if path matches menu access (supports exact and prefix matching)
 */
export function pathMatchesAccess(path: string, allowedPaths: string[]): boolean {
  const normalizedPath = normalizePath(path);
  
  // Check exact match
  if (allowedPaths.some(allowed => normalizePath(allowed) === normalizedPath)) {
    return true;
  }
  
  // Check prefix match (for nested routes)
  // Example: /packaging/finance/reports matches /packaging/finance/reports?filter=xxx
  return allowedPaths.some(allowed => {
    const normalizedAllowed = normalizePath(allowed);
    return normalizedPath.startsWith(normalizedAllowed + '/') || 
           normalizedPath === normalizedAllowed;
  });
}

/**
 * Get user access data from storage
 */
export async function getUserAccessData(userId: string): Promise<UserAccess | null> {
  try {
    const rawUsers = await storageService.get<UserAccess[]>('userAccessControl');
    // 🚀 FIX: Extract array with robust handling (handle object {} case)
    const users = extractStorageValue(rawUsers) as UserAccess[];
    if (!users || !Array.isArray(users) || users.length === 0) return null;
    
    // Filter active and non-deleted users
    const activeUsers = filterActiveItems(users);
    return activeUsers.find(u => u.id === userId) || null;
  } catch {
    return null;
  }
}

/**
 * Check if user has access to a specific route
 */
export async function hasRouteAccess(
  path: string,
  businessUnit: string,
  userId?: string
): Promise<boolean> {
  // Get current user if userId not provided
  const currentUser = userId ? { id: userId } as CurrentUser : getCurrentUser();
  if (!currentUser) return false;
  
  // Default admin has full access
  if (isDefaultAdmin(currentUser)) return true;
  
  // Get user access data
  const userAccess = await getUserAccessData(currentUser.id);
  if (!userAccess) return false;
  
  // Check if user is active
  if (!userAccess.isActive) return false;
  
  // Check if user has access to business unit
  if (!userAccess.businessUnits.includes(businessUnit)) return false;
  
  // Check menu access
  const menuAccess = userAccess.menuAccess || {};
  const allowedPaths = menuAccess[businessUnit] || [];
  
  // If no menu access defined, deny access
  if (allowedPaths.length === 0) return false;
  
  return pathMatchesAccess(path, allowedPaths);
}

/**
 * Check if user has access to business unit
 */
export async function hasBusinessUnitAccess(
  businessUnit: string,
  userId?: string
): Promise<boolean> {
  const currentUser = userId ? { id: userId } as CurrentUser : getCurrentUser();
  if (!currentUser) return false;
  
  // Default admin has full access
  if (isDefaultAdmin(currentUser)) return true;
  
  const userAccess = await getUserAccessData(currentUser.id);
  if (!userAccess) return false;
  
  if (!userAccess.isActive) return false;
  
  return userAccess.businessUnits.includes(businessUnit);
}

/**
 * Get first accessible route for a business unit
 */
export async function getFirstAccessibleRoute(
  businessUnit: string,
  defaultRoute: string,
  userId?: string
): Promise<string> {
  const currentUser = userId ? { id: userId } as CurrentUser : getCurrentUser();
  if (!currentUser) return defaultRoute;
  
  // Default admin has full access
  if (isDefaultAdmin(currentUser)) {
    // Convert relative path to full path for admin
    if (!defaultRoute.startsWith('/')) {
      return `/${businessUnit}/${defaultRoute}`;
    }
    return defaultRoute;
  }
  
  const userAccess = await getUserAccessData(currentUser.id);
  if (!userAccess || !userAccess.isActive) {
    // Convert relative path to full path
    if (!defaultRoute.startsWith('/')) {
      return `/${businessUnit}/${defaultRoute}`;
    }
    return defaultRoute;
  }
  
  const menuAccess = userAccess.menuAccess || {};
  const allowedPaths = menuAccess[businessUnit] || [];
  
  if (allowedPaths.length === 0) {
    // Convert relative path to full path
    if (!defaultRoute.startsWith('/')) {
      return `/${businessUnit}/${defaultRoute}`;
    }
    return defaultRoute;
  }
  
  // Convert relative defaultRoute to full path for comparison
  const fullDefaultRoute = defaultRoute.startsWith('/') 
    ? defaultRoute 
    : `/${businessUnit}/${defaultRoute}`;
  
  // Check if default route is accessible
  if (pathMatchesAccess(fullDefaultRoute, allowedPaths)) {
    return fullDefaultRoute;
  }
  
  // Return first accessible route (already full path)
  return allowedPaths[0] || fullDefaultRoute;
}

/**
 * Get all accessible routes for a business unit
 */
export async function getAccessibleRoutes(
  businessUnit: string,
  userId?: string
): Promise<string[]> {
  const currentUser = userId ? { id: userId } as CurrentUser : getCurrentUser();
  if (!currentUser) return [];
  
  // Default admin - return all (empty array means all)
  if (isDefaultAdmin(currentUser)) return [];
  
  const userAccess = await getUserAccessData(currentUser.id);
  if (!userAccess || !userAccess.isActive) return [];
  
  const menuAccess = userAccess.menuAccess || {};
  return menuAccess[businessUnit] || [];
}

/**
 * Validate user login (check isActive and deleted status)
 * 🚀 FIX: Extract array with robust handling to prevent "is not an array" errors
 */
export async function validateUserLogin(username: string): Promise<{
  valid: boolean;
  user: UserAccess | null;
  error?: string;
}> {
  try {
    const normalizedUsername = username.trim().toLowerCase();
    const rawUsers = await storageService.get<UserAccess[]>('userAccessControl');
    
    // 🚀 FIX: Extract array with robust handling (handle object {} case)
    const users = extractStorageValue(rawUsers) as UserAccess[];
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      console.warn('[validateUserLogin] No users found or data is not an array:', users);
      return { valid: false, user: null, error: 'User tidak ditemukan. Pastikan user sudah terdaftar di User Control.' };
    }
    
    // Filter active and non-deleted users
    const activeUsers = filterActiveItems(users);
    
    if (activeUsers.length === 0) {
      console.warn('[validateUserLogin] No active users found');
      return { valid: false, user: null, error: 'Tidak ada user aktif. Hubungi admin.' };
    }
    
    const user = activeUsers.find(
      (u) => (u.username || '').toLowerCase() === normalizedUsername
    );
    
    if (!user) {
      console.warn(`[validateUserLogin] User not found: ${normalizedUsername}. Available users:`, activeUsers.map(u => u.username));
      return { valid: false, user: null, error: `User "${username}" tidak ditemukan. Pastikan username benar atau hubungi admin untuk registrasi.` };
    }
    
    if (!user.isActive) {
      return { valid: false, user: null, error: 'User tidak aktif. Hubungi admin untuk mengaktifkan akun.' };
    }
    
    if (user.deleted) {
      return { valid: false, user: null, error: 'User telah dihapus. Hubungi admin untuk registrasi ulang.' };
    }
    
    console.log(`[validateUserLogin] ✅ User found: ${user.username} (${user.fullName})`);
    return { valid: true, user };
  } catch (error: any) {
    console.error('[validateUserLogin] Error:', error);
    return { valid: false, user: null, error: error.message || 'Error validasi user' };
  }
}
