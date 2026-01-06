import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import Table from '../../components/Table';
import { storageService, BusinessType } from '../../services/storage';
import { safeDeleteMultipleItems, filterActiveItems } from '../../utils/data-persistence-helper';
import { getCurrentUser, isDefaultAdmin } from '../../utils/access-control-helper';
import './UserControl.css';

type BusinessId = BusinessType;

interface MenuItemConfig {
  id: string;
  label: string;
  path: string;
}

interface MenuSectionConfig {
  id: string;
  title: string;
  items: MenuItemConfig[];
}

interface BusinessMenuConfig {
  id: BusinessId;
  label: string;
  description: string;
  icon: string;
  accent: string;
  sections: MenuSectionConfig[];
}

const BUSINESS_MENU_CONFIG: BusinessMenuConfig[] = [
  {
    id: 'packaging',
    label: 'Packaging',
    description: 'Manufacturing & packaging ERP module',
    icon: '📦',
    accent: '#ff9800',
    sections: [
      {
        id: 'packaging-master',
        title: 'Master Data',
        items: [
          { id: '/packaging/master/products', label: 'Products', path: '/packaging/master/products' },
          { id: '/packaging/master/materials', label: 'Materials', path: '/packaging/master/materials' },
          { id: '/packaging/master/customers', label: 'Customers', path: '/packaging/master/customers' },
          { id: '/packaging/master/suppliers', label: 'Suppliers', path: '/packaging/master/suppliers' },
          { id: '/packaging/master/inventory', label: 'Inventory', path: '/packaging/master/inventory' },
        ],
      },
      {
        id: 'packaging-ops',
        title: 'Operations',
        items: [
          { id: '/packaging/workflow', label: 'Workflow', path: '/packaging/workflow' },
          { id: '/packaging/sales-orders', label: 'Sales Orders', path: '/packaging/sales-orders' },
          { id: '/packaging/ppic', label: 'PPIC', path: '/packaging/ppic' },
          { id: '/packaging/purchasing', label: 'Purchasing', path: '/packaging/purchasing' },
          { id: '/packaging/production', label: 'Production', path: '/packaging/production' },
          { id: '/packaging/qa-qc', label: 'QA/QC', path: '/packaging/qa-qc' },
          { id: '/packaging/delivery-note', label: 'WH & Delivery', path: '/packaging/delivery-note' },
          { id: '/packaging/return', label: 'Return', path: '/packaging/return' },
        ],
      },
      {
        id: 'packaging-finance',
        title: 'Finance & Accounting',
        items: [
          { id: '/packaging/finance/ledger', label: 'General Ledger', path: '/packaging/finance/ledger' },
          { id: '/packaging/finance/reports', label: 'Financial Reports', path: '/packaging/finance/reports' },
          { id: '/packaging/finance/invoices', label: 'Invoices', path: '/packaging/finance/invoices' },
          { id: '/packaging/finance/accounting', label: 'Accounting', path: '/packaging/finance/accounting' },
          { id: '/packaging/finance/ar', label: 'Accounts Receivable', path: '/packaging/finance/ar' },
          { id: '/packaging/finance/ap', label: 'Accounts Payable', path: '/packaging/finance/ap' },
          { id: '/packaging/finance/payments', label: 'Payments', path: '/packaging/finance/payments' },
          { id: '/packaging/finance/tax-management', label: 'Tax Management', path: '/packaging/finance/tax-management' },
          { id: '/packaging/finance/cost-analysis', label: 'Cost Analysis', path: '/packaging/finance/cost-analysis' },
          { id: '/packaging/finance/all-business-reports', label: 'All Business Reports', path: '/packaging/finance/all-business-reports' },
          { id: '/packaging/finance/coa', label: 'Chart of Accounts', path: '/packaging/finance/coa' },
        ],
      },
      {
        id: 'packaging-hr',
        title: 'HR & People',
        items: [
          { id: '/packaging/hr', label: 'HRD', path: '/packaging/hr' },
        ],
      },
      {
        id: 'packaging-settings',
        title: 'Settings & Tools',
        items: [
          { id: '/packaging/settings', label: 'Company Settings', path: '/packaging/settings' },
          { id: '/packaging/settings/report', label: 'Report Center', path: '/packaging/settings/report' },
          { id: '/packaging/settings/db-activity', label: 'DB Activity', path: '/packaging/settings/db-activity' },
          { id: '/packaging/settings/test-automation', label: 'Test Automation', path: '/packaging/settings/test-automation' },
          { id: '/packaging/settings/user-control', label: 'User Control', path: '/packaging/settings/user-control' },
        ],
      },
    ],
  },
  {
    id: 'general-trading',
    label: 'General Trading',
    description: 'Trading & distribution business unit',
    icon: '🏢',
    accent: '#2563eb',
    sections: [
      {
        id: 'gt-dashboard',
        title: 'Overview',
        items: [
          { id: '/general-trading/dashboard', label: 'Dashboard', path: '/general-trading/dashboard' },
        ],
      },
      {
        id: 'gt-master',
        title: 'Master Data',
        items: [
          { id: '/general-trading/master/products', label: 'Products', path: '/general-trading/master/products' },
          { id: '/general-trading/master/customers', label: 'Customers', path: '/general-trading/master/customers' },
          { id: '/general-trading/master/suppliers', label: 'Suppliers', path: '/general-trading/master/suppliers' },
          { id: '/general-trading/master/inventory', label: 'Inventory', path: '/general-trading/master/inventory' },
        ],
      },
      {
        id: 'gt-orders',
        title: 'Orders & Sales',
        items: [
          { id: '/general-trading/orders/sales', label: 'Sales Orders', path: '/general-trading/orders/sales' },
          { id: '/general-trading/orders/purchase', label: 'Purchase Orders', path: '/general-trading/orders/purchase' },
          { id: '/general-trading/sales/quotations', label: 'Quotations', path: '/general-trading/sales/quotations' },
          { id: '/general-trading/sales/invoices', label: 'Invoices', path: '/general-trading/sales/invoices' },
        ],
      },
      {
        id: 'gt-production',
        title: 'Production & QA',
        items: [
          { id: '/general-trading/ppic', label: 'PPIC', path: '/general-trading/ppic' },
          { id: '/general-trading/production', label: 'Production', path: '/general-trading/production' },
          { id: '/general-trading/qa-qc', label: 'QA/QC', path: '/general-trading/qa-qc' },
        ],
      },
      {
        id: 'gt-purchasing',
        title: 'Purchasing & Warehouse',
        items: [
          { id: '/general-trading/purchasing/pr', label: 'Purchase Requisition', path: '/general-trading/purchasing/pr' },
          { id: '/general-trading/purchasing/po', label: 'PO Management', path: '/general-trading/purchasing/po' },
          { id: '/general-trading/purchasing', label: 'Purchasing', path: '/general-trading/purchasing' },
          { id: '/general-trading/warehouse/stock', label: 'Stock Management', path: '/general-trading/warehouse/stock' },
          { id: '/general-trading/warehouse/receiving', label: 'Receiving', path: '/general-trading/warehouse/receiving' },
          { id: '/general-trading/warehouse/shipping', label: 'Shipping', path: '/general-trading/warehouse/shipping' },
          { id: '/general-trading/delivery-note', label: 'WH & Delivery', path: '/general-trading/delivery-note' },
          { id: '/general-trading/return', label: 'Return', path: '/general-trading/return' },
          { id: '/general-trading/workflow', label: 'Workflow', path: '/general-trading/workflow' },
        ],
      },
      {
        id: 'gt-finance',
        title: 'Finance & Accounting',
        items: [
          { id: '/general-trading/finance/ledger', label: 'General Ledger', path: '/general-trading/finance/ledger' },
          { id: '/general-trading/finance/reports', label: 'Financial Reports', path: '/general-trading/finance/reports' },
          { id: '/general-trading/finance/accounting', label: 'Accounting', path: '/general-trading/finance/accounting' },
          { id: '/general-trading/finance/ar', label: 'Accounts Receivable', path: '/general-trading/finance/ar' },
          { id: '/general-trading/finance/ap', label: 'Accounts Payable', path: '/general-trading/finance/ap' },
          { id: '/general-trading/finance/payments', label: 'Payments', path: '/general-trading/finance/payments' },
          { id: '/general-trading/finance/invoices', label: 'Invoices', path: '/general-trading/finance/invoices' },
          { id: '/general-trading/finance/tax-management', label: 'Tax Management', path: '/general-trading/finance/tax-management' },
          { id: '/general-trading/finance/cost-analysis', label: 'Cost Analysis', path: '/general-trading/finance/cost-analysis' },
          { id: '/general-trading/finance/coa', label: 'Chart of Accounts', path: '/general-trading/finance/coa' },
        ],
      },
      {
        id: 'gt-settings',
        title: 'Settings',
        items: [
          { id: '/general-trading/settings', label: 'Settings', path: '/general-trading/settings' },
          { id: '/general-trading/settings/report', label: 'Report Center', path: '/general-trading/settings/report' },
          { id: '/general-trading/settings/db-activity', label: 'DB Activity', path: '/general-trading/settings/db-activity' },
          { id: '/general-trading/settings/user-control', label: 'User Control', path: '/general-trading/settings/user-control' },
          { id: '/general-trading/settings/flow-test', label: 'Flow Test', path: '/general-trading/settings/flow-test' },
        ],
      },
    ],
  },
  {
    id: 'trucking',
    label: 'trucking',
    description: 'Fleet, delivery & expedition unit',
    icon: '🚚',
    accent: '#10b981',
    sections: [
      {
        id: 'trucking-dashboard',
        title: 'Overview',
        items: [
          { id: '/trucking/dashboard', label: 'Dashboard', path: '/trucking/dashboard' },
        ],
      },
      {
        id: 'trucking-master',
        title: 'Master Data',
        items: [
            { id: '/trucking/master/vehicles', label: 'Vehicles', path: '/trucking/master/vehicles' },
          { id: '/trucking/master/drivers', label: 'Drivers', path: '/trucking/master/drivers' },
          { id: '/trucking/master/routes', label: 'Routes', path: '/trucking/master/routes' },
          { id: '/trucking/master/customers', label: 'Customers', path: '/trucking/master/customers' },
        ],
      },
      {
        id: 'trucking-shipments',
        title: 'Shipments & trucking',
        items: [
          { id: '/trucking/shipments/delivery-orders', label: 'Delivery Orders', path: '/trucking/shipments/delivery-orders' },
          { id: '/trucking/shipments/trucking', label: 'Shipment trucking', path: '/trucking/shipments/trucking' },
          { id: '/trucking/trucking/realtime', label: 'Real-time Location', path: '/trucking/trucking/realtime' },
          { id: '/trucking/trucking/status', label: 'Status Updates', path: '/trucking/trucking/status' },
        ],
      },
      {
        id: 'trucking-schedules',
        title: 'Schedules',
        items: [
          { id: '/trucking/schedules/route-planning', label: 'Route Planning', path: '/trucking/schedules/route-planning' },
          { id: '/trucking/schedules/delivery', label: 'Delivery Schedules', path: '/trucking/schedules/delivery' },
        ],
      },
      {
        id: 'trucking-finance',
        title: 'Finance',
        items: [
          { id: '/trucking/finance/billing', label: 'Billing', path: '/trucking/finance/billing' },
          { id: '/trucking/finance/payments', label: 'Payments', path: '/trucking/finance/payments' },
          { id: '/trucking/finance/pettycash', label: 'Petty Cash', path: '/trucking/finance/pettycash' },
        ],
      },
      {
        id: 'trucking-settings',
        title: 'Settings',
        items: [
          { id: '/trucking/settings', label: 'Settings', path: '/trucking/settings' },
        ],
      },
    ],
  },
];

const BUSINESS_MENU_MAP = BUSINESS_MENU_CONFIG.reduce<Record<BusinessId, BusinessMenuConfig>>((acc, config) => {
  acc[config.id] = config;
  return acc;
}, {} as Record<BusinessId, BusinessMenuConfig>);

const MENU_LOOKUP = BUSINESS_MENU_CONFIG.reduce<Record<string, { label: string; businessId: BusinessId; section: string }>>((lookup, business) => {
  business.sections.forEach((section) => {
    section.items.forEach((item) => {
      lookup[item.id] = {
        label: item.label,
        businessId: business.id,
        section: section.title,
      };
    });
  });
  return lookup;
}, {});

const getAllMenuIds = (businessId: BusinessId) =>
  BUSINESS_MENU_MAP[businessId]?.sections.flatMap((section) => section.items.map((item) => item.id)) || [];

interface UserAccess {
  id: string;
  fullName: string;
  username: string;
  email?: string;
  phone?: string;
  role?: string;
  accessCode?: string;
  isActive: boolean;
  businessUnits: BusinessId[];
  defaultBusiness?: BusinessId;
  menuAccess: Record<BusinessId, string[]>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedTimestamp?: number;
}

interface UserFormState {
  id?: string;
  fullName: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  accessCode: string;
  isActive: boolean;
  businessUnits: BusinessId[];
  defaultBusiness: BusinessId | '';
  menuAccess: Record<BusinessId, string[]>;
  notes: string;
}

const createEmptyForm = (): UserFormState => ({
  fullName: '',
  username: '',
  email: '',
  phone: '',
  role: '',
  accessCode: '',
  isActive: true,
  businessUnits: [],
  defaultBusiness: '',
  menuAccess: {
    packaging: [],
    'general-trading': [],
    trucking: [],
  },
  notes: '',
});

const formatDateTime = (value?: string) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
};

const getMenuCount = (menuAccess: Record<BusinessId, string[]>) =>
  Object.values(menuAccess || {}).reduce((sum, items) => sum + (items?.length || 0), 0);

const USER_CONTROL_PIN_KEY = 'userControlPin';
const DEFAULT_USER_CONTROL_PIN = '7777';

const UserControl = () => {
  const [users, setUsers] = useState<UserAccess[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [pinDialogVisible, setPinDialogVisible] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pendingEditAction, setPendingEditAction] = useState<(() => void) | null>(null);
  const [currentBusinessUnit, setCurrentBusinessUnit] = useState<string>('');
  const [currentUserBusinessUnits, setCurrentUserBusinessUnits] = useState<BusinessId[]>([]);
  
  // Custom Dialog state
  const [dialogState, setDialogState] = useState<{
    show: boolean;
    type: 'alert' | 'confirm' | null;
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  }>({
    show: false,
    type: null,
    title: '',
    message: '',
  });

  // Helper functions untuk dialog
  const showAlert = (message: string, title: string = 'Information') => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'alert',
      title,
      message,
    });
  };

  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void, title: string = 'Confirmation') => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(true);
    }
    setDialogState({
      show: true,
      type: 'confirm',
      title,
      message,
      onConfirm,
      onCancel,
    });
  };

  const closeDialog = () => {
    if (typeof window !== 'undefined' && (window as any).setDialogOpen) {
      (window as any).setDialogOpen(false);
    }
    setDialogState({
      show: false,
      type: null,
      title: '',
      message: '',
    });
  };

  const [selectedUser, setSelectedUser] = useState<UserAccess | null>(null);
  const [formState, setFormState] = useState<UserFormState>(createEmptyForm());
  const [formVisible, setFormVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    // FIXED: Use unified storage key 'userAccessControl' (without business prefix)
    // User access control is global/shared across business units
    const storageKey = 'userAccessControl';
    
    // Migration: Merge data from old business-specific keys if they exist
    const oldPackagingKey = 'packaging_userAccessControl';
    const oldPackagingData = (await storageService.get<UserAccess[]>(oldPackagingKey)) || [];
    const currentData = (await storageService.get<UserAccess[]>(storageKey)) || [];
    
    // CRITICAL: Combine all data sources first
    const allDataSources = [...currentData, ...oldPackagingData];
    
    // Merge: Combine data from old key and current key, deduplicate by ID
    // CRITICAL: Use Map to ensure ID uniqueness - last one wins if duplicate
    const mergedUsers = new Map<string, UserAccess>();
    
    // Add all users, keeping the one with latest updatedAt if duplicate
    allDataSources.forEach(user => {
      if (user && user.id) {
        const existing = mergedUsers.get(user.id);
        if (!existing) {
          mergedUsers.set(user.id, user);
        } else {
          // If duplicate, keep the one with latest updatedAt
          const existingUpdatedAt = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
          const userUpdatedAt = user.updatedAt ? new Date(user.updatedAt).getTime() : 0;
          if (userUpdatedAt > existingUpdatedAt) {
            mergedUsers.set(user.id, user);
          }
        }
      }
    });
    
    const stored = Array.from(mergedUsers.values());
    
    // CRITICAL: Always save deduplicated data back to ensure consistency
    // This prevents duplicates from accumulating
    if (stored.length !== allDataSources.length) {
      await storageService.set(storageKey, stored);
      console.log(`[UserControl] Deduplicated: ${allDataSources.length} -> ${stored.length} users (removed ${allDataSources.length - stored.length} duplicates)`);
    }
    
    // If we merged data from old key, save it back to unified key
    if (oldPackagingData.length > 0 && stored.length > currentData.length) {
      await storageService.set(storageKey, stored);
      console.log(`[UserControl] Migrated ${oldPackagingData.length} users from ${oldPackagingKey} to ${storageKey}`);
    }
    
    // Filter out deleted users for display using filterActiveItems helper
    const activeUsers = filterActiveItems(stored);
    setUsers(activeUsers);
    setSelectedUser((prev) => {
      if (!prev) {
        return activeUsers[0] || null;
      }
      return activeUsers.find((user) => user.id === prev.id) || activeUsers[0] || null;
    });
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ key?: string }>).detail;
      const storageKey = detail?.key?.split('/').pop();
      if (storageKey === 'userAccessControl' || storageKey === 'packaging_userAccessControl') {
        loadUsers();
      }
    };

    window.addEventListener('app-storage-changed', handler as EventListener);
    return () => {
      window.removeEventListener('app-storage-changed', handler as EventListener);
    };
  }, [loadUsers]);

  // Get current user's business units
  useEffect(() => {
    const loadCurrentUserBusinessUnits = async () => {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        setCurrentUserBusinessUnits([]);
        return;
      }
      
      // Super admin has access to all business units
      if (isDefaultAdmin(currentUser)) {
        setCurrentUserBusinessUnits(['packaging', 'general-trading', 'trucking']);
        return;
      }
      
      // Get current user's business units from storage
      const allUsers = await storageService.get<UserAccess[]>('userAccessControl') || [];
      const currentUserData = allUsers.find(u => u.id === currentUser.id);
      setCurrentUserBusinessUnits(currentUserData?.businessUnits || []);
    };
    
    loadCurrentUserBusinessUnits();
  }, [users]); // Reload when users change

  const filteredUsers = useMemo(() => {
    // Filter by business unit first (if not super admin)
    const currentUser = getCurrentUser();
    const isSuperAdmin = currentUser && isDefaultAdmin(currentUser);
    
    let businessFilteredUsers = users;
    if (!isSuperAdmin && currentUserBusinessUnits.length > 0) {
      // User yang punya akses ke 3 business unit (Packaging + GT + Trucking) bisa lihat semua user
      // User yang punya akses kurang dari 3 hanya bisa lihat user yang business units-nya sama persis
      const hasAllThreeBusinessUnits = currentUserBusinessUnits.length === 3 && 
        currentUserBusinessUnits.includes('packaging' as BusinessId) &&
        currentUserBusinessUnits.includes('general-trading' as BusinessId) &&
        currentUserBusinessUnits.includes('trucking' as BusinessId);
      
      if (hasAllThreeBusinessUnits) {
        // User dengan 3 business units bisa lihat semua user
        businessFilteredUsers = users;
      } else {
        // User dengan kurang dari 3 business units hanya bisa lihat user yang business units-nya sama persis
        businessFilteredUsers = users.filter((user) => {
          // Check if user has the same business units as current user
          if (user.businessUnits.length !== currentUserBusinessUnits.length) {
            return false;
          }
          
          // Check if all business units match
          const userUnitsSet = new Set(user.businessUnits);
          const currentUnitsSet = new Set(currentUserBusinessUnits);
          
          // Check if sets are equal
          if (userUnitsSet.size !== currentUnitsSet.size) {
            return false;
          }
          
          for (const unit of userUnitsSet) {
            if (!currentUnitsSet.has(unit)) {
              return false;
            }
          }
          
          return true;
        });
      }
    }
    
    // Then filter by search query
    if (!searchQuery) return businessFilteredUsers;
    const query = searchQuery.toLowerCase();
    return businessFilteredUsers.filter((user) => {
      return (
        user.fullName.toLowerCase().includes(query) ||
        (user.username || '').toLowerCase().includes(query) ||
        (user.role || '').toLowerCase().includes(query) ||
        user.businessUnits.some((unit) => {
          const config = BUSINESS_MENU_MAP[unit];
          return config?.label?.toLowerCase().includes(query) || false;
        })
      );
    });
  }, [users, searchQuery, currentUserBusinessUnits]);

  useEffect(() => {
    if (!selectedUser && filteredUsers.length > 0) {
      setSelectedUser(filteredUsers[0]);
    }
  }, [filteredUsers, selectedUser]);

  const handleSelectUser = (user: UserAccess) => {
    setSelectedUser(user);
  };

  const handleStartCreate = () => {
    setFormState(createEmptyForm());
    setFormVisible(true);
  };

  // Get current business unit from localStorage
  useEffect(() => {
    const selectedBusiness = localStorage.getItem('selectedBusiness') || '';
    setCurrentBusinessUnit(selectedBusiness);
  }, []);

  // Get User Control PIN
  const getUserControlPin = async (): Promise<string> => {
    const pin = await storageService.get<string>(USER_CONTROL_PIN_KEY);
    return pin || DEFAULT_USER_CONTROL_PIN;
  };

  // Check if user has access to edit User Control in current business unit
  const canEditUserControl = async (): Promise<boolean> => {
    const currentUser = getCurrentUser();
    if (!currentUser) return false;
    
    // Super admin can always edit (no business unit check needed)
    if (isDefaultAdmin(currentUser)) return true;
    
    // If no business unit selected, check if user has access to any business unit
    if (!currentBusinessUnit) {
      const users = await storageService.get<UserAccess[]>('userAccessControl') || [];
      const userData = users.find(u => u.id === currentUser.id);
      if (!userData || !userData.isActive || userData.deleted) return false;
      // If user has at least one business unit, allow edit (for Super Admin context)
      return userData.businessUnits.length > 0;
    }
    
    // Check if user has access to User Control menu in current business unit
    const users = await storageService.get<UserAccess[]>('userAccessControl') || [];
    const userData = users.find(u => u.id === currentUser.id);
    
    if (!userData || !userData.isActive || userData.deleted) return false;
    
    // Check if user has access to current business unit
    if (!userData.businessUnits.includes(currentBusinessUnit as BusinessId)) return false;
    
    // Check if user has access to User Control menu in current business unit
    const menuAccess = userData.menuAccess || {};
    const userControlPath = `/${currentBusinessUnit}/settings/user-control`;
    const allowedMenus = menuAccess[currentBusinessUnit as BusinessId] || [];
    
    return allowedMenus.includes(userControlPath);
  };

  // Validate PIN and proceed with edit
  const handlePinSubmit = async () => {
    const correctPin = await getUserControlPin();
    if (pinInput.trim() !== correctPin) {
      showAlert('PIN salah. Silakan coba lagi.', 'PIN Salah');
      setPinInput('');
      return;
    }
    
    // Check business unit access
    const hasAccess = await canEditUserControl();
    if (!hasAccess) {
      showAlert('Anda tidak memiliki akses untuk mengedit User Control di business unit ini.', 'Akses Ditolak');
      setPinDialogVisible(false);
      setPinInput('');
      setPendingEditAction(null);
      return;
    }
    
    // PIN correct and has access, proceed with edit
    setPinDialogVisible(false);
    setPinInput('');
    if (pendingEditAction) {
      pendingEditAction();
      setPendingEditAction(null);
    }
  };

  const handleEditUser = (user: UserAccess) => {
    try {
      // Store the edit action
      const editAction = () => {
        const currentUser = getCurrentUser();
        const isSuperAdmin = currentUser && isDefaultAdmin(currentUser);
        
        // Filter business units based on current business unit (if not super admin)
        let filteredBusinessUnits = user.businessUnits || [];
        let filteredMenuAccess = user.menuAccess || {};
        
        if (!isSuperAdmin && currentBusinessUnit) {
          // Only keep business units that match current business unit
          const currentBusinessId = currentBusinessUnit as BusinessId;
          filteredBusinessUnits = filteredBusinessUnits.filter(unit => unit === currentBusinessId);
          // Only keep menu access for current business unit
          filteredMenuAccess = {
            packaging: [],
            'general-trading': [],
            trucking: [],
            [currentBusinessId]: filteredMenuAccess[currentBusinessId] || []
          } as Record<BusinessId, string[]>;
        }
        
        setFormState({
          id: user.id,
          fullName: user.fullName,
          username: user.username,
          email: user.email || '',
          phone: user.phone || '',
          role: user.role || '',
          accessCode: user.accessCode || '',
          isActive: user.isActive,
          businessUnits: filteredBusinessUnits,
          defaultBusiness: filteredBusinessUnits.length > 0 
            ? (user.defaultBusiness && filteredBusinessUnits.includes(user.defaultBusiness) 
                ? user.defaultBusiness 
                : filteredBusinessUnits[0])
            : '',
          menuAccess: filteredMenuAccess,
          notes: user.notes || '',
        });
        setFormVisible(true);
      };
      
      // Check if super admin - no PIN needed
      const currentUser = getCurrentUser();
      if (currentUser && isDefaultAdmin(currentUser)) {
        editAction();
        return;
      }
      
      // Show PIN dialog
      setPendingEditAction(() => editAction);
      setPinDialogVisible(true);
    } catch (error: any) {
      console.error('[UserControl] Error in handleEditUser:', error);
      showAlert(`Error: ${error.message || 'Gagal membuka form edit'}`, 'Error');
    }
  };

  const handleDeleteUser = async (user: UserAccess) => {
    showConfirm(
      `Hapus akses untuk ${user.fullName}?`,
      async () => {
        // FIXED: Use unified storage key 'userAccessControl' (without business prefix)
        const storageKey = 'userAccessControl';
        
        // Use safe deletion pattern to prevent resurrection
        const allUsers = (await storageService.get<UserAccess[]>(storageKey)) || [];
        const updated = allUsers.map(u => 
          u.id === user.id 
            ? { ...u, deleted: true, deletedAt: new Date().toISOString(), deletedTimestamp: Date.now() }
            : u
        );
        
        await storageService.set(storageKey, updated);
        
        // Filter active users for display
        const activeUsers = filterActiveItems(updated);
        setUsers(activeUsers);
        
        // Remove from selected if was selected
        setSelectedUserIds(prev => {
          const next = new Set(prev);
          next.delete(user.id);
          return next;
        });
        
        setSelectedUser((prev) => {
          if (!prev || prev.id === user.id) {
            return activeUsers[0] || null;
          }
          return prev;
        });
        
        console.log(`[UserControl] Safely deleted user ${user.fullName} (ID: ${user.id}) using tombstone pattern`);
      },
      undefined,
      'Confirm Delete'
    );
  };

  // Handle bulk delete (multiple users)
  const handleBulkDelete = async () => {
    if (selectedUserIds.size === 0) {
      showAlert('Pilih minimal satu user untuk dihapus.', 'Information');
      return;
    }

    const selectedUsers = users.filter(u => selectedUserIds.has(u.id));
    const userNames = selectedUsers.map(u => u.fullName).join(', ');
    
    showConfirm(
      `Hapus ${selectedUserIds.size} user berikut?\n${userNames}`,
      async () => {
        const storageKey = 'userAccessControl';
        
        // Use safeDeleteMultipleItems for bulk delete with tombstone pattern
        const userIds = Array.from(selectedUserIds);
        const result = await safeDeleteMultipleItems(storageKey, userIds, 'id');
        
        if (result.failed > 0) {
          showAlert(`Gagal menghapus ${result.failed} user. ${result.success} user berhasil dihapus.`, 'Warning');
        } else {
          showAlert(`Berhasil menghapus ${result.success} user.`, 'Success');
        }
        
        // Reload users to refresh display
        await loadUsers();
        
        // Clear selection
        setSelectedUserIds(new Set());
        
        console.log(`[UserControl] Bulk deleted ${result.success} users using tombstone pattern`);
      },
      undefined,
      'Confirm Bulk Delete'
    );
  };

  // Handle select all checkbox
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedUserIds(new Set(filteredUsers.map(u => u.id)));
    } else {
      setSelectedUserIds(new Set());
    }
  };

  // Handle individual checkbox
  const handleSelectUserCheckbox = (userId: string, checked: boolean) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (checked) {
        next.add(userId);
      } else {
        next.delete(userId);
      }
      return next;
    });
  };

  const allSelected = filteredUsers.length > 0 && selectedUserIds.size === filteredUsers.length;
  const someSelected = selectedUserIds.size > 0 && selectedUserIds.size < filteredUsers.length;
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // Update indeterminate state of select all checkbox
  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const handleBusinessToggle = (businessId: BusinessId) => {
    // Check if user is super admin
    const currentUser = getCurrentUser();
    const isSuperAdmin = currentUser && isDefaultAdmin(currentUser);
    
    // If not super admin, only allow toggling current business unit
    if (!isSuperAdmin && businessId !== currentBusinessUnit) {
      showAlert('Anda hanya dapat mengatur business unit yang sesuai dengan business unit yang dipilih.', 'Akses Ditolak');
      return;
    }
    
    setFormState((prev) => {
      const exists = prev.businessUnits.includes(businessId);
      const nextUnits = exists
        ? prev.businessUnits.filter((id) => id !== businessId)
        : [...prev.businessUnits, businessId];

      const nextMenuAccess = { ...prev.menuAccess };
      if (!exists) {
        nextMenuAccess[businessId] = nextMenuAccess[businessId] || [];
      } else {
        delete nextMenuAccess[businessId];
      }

      const newDefault =
        nextUnits.length === 0
          ? ''
          : nextUnits.includes(prev.defaultBusiness as BusinessId)
          ? prev.defaultBusiness
          : nextUnits[0];

      return {
        ...prev,
        businessUnits: nextUnits,
        menuAccess: nextMenuAccess,
        defaultBusiness: newDefault,
      };
    });
  };

  const handleMenuToggle = (businessId: BusinessId, menuId: string) => {
    setFormState((prev) => {
      const current = new Set(prev.menuAccess[businessId] || []);
      if (current.has(menuId)) {
        current.delete(menuId);
      } else {
        current.add(menuId);
      }
      return {
        ...prev,
        menuAccess: {
          ...prev.menuAccess,
          [businessId]: Array.from(current),
        },
      };
    });
  };

  const handleSelectAllMenus = (businessId: BusinessId) => {
    const allMenus = getAllMenuIds(businessId);
    setFormState((prev) => ({
      ...prev,
      menuAccess: {
        ...prev.menuAccess,
        [businessId]: allMenus,
      },
    }));
  };

  const handleClearMenus = (businessId: BusinessId) => {
    setFormState((prev) => ({
      ...prev,
      menuAccess: {
        ...prev.menuAccess,
        [businessId]: [],
      },
    }));
  };

  const sanitizeMenuAccess = (businessUnits: BusinessId[], access: Record<BusinessId, string[]>) => {
    return businessUnits.reduce<Record<BusinessId, string[]>>((acc, unit) => {
      const allowed = new Set(getAllMenuIds(unit));
      const selected = access[unit] || [];
      // Filter out invalid menu IDs and normalize paths
      acc[unit] = selected
        .filter((menuId) => {
          // Check if menuId exists in allowed menus
          if (!allowed.has(menuId)) {
            return false;
          }
          // Validate format: must start with /business-unit/
          const businessPrefix = `/${unit}/`;
          if (!menuId.startsWith(businessPrefix)) {
            return false;
          }
          return true;
        })
        .map((menuId) => {
          // Normalize path: remove trailing slash, ensure proper format
          let normalized = menuId.trim();
          if (normalized.endsWith('/') && normalized.length > 1) {
            normalized = normalized.slice(0, -1);
          }
          return normalized;
        });
      return acc;
    }, {} as Record<BusinessId, string[]>);
  };

  const handleSaveUser = async () => {
    if (!formState.fullName.trim()) {
      showAlert('Nama lengkap wajib diisi.', 'Information');
      return;
    }
    if (!formState.username.trim()) {
      showAlert('Username wajib diisi.', 'Information');
      return;
    }
    if (formState.businessUnits.length === 0) {
      showAlert('Pilih minimal satu unit bisnis.', 'Information');
      return;
    }

    // Check business unit access for non-admin users (skip for super admin)
    const currentUser = getCurrentUser();
    const isSuperAdmin = currentUser && isDefaultAdmin(currentUser);
    
    // Filter business units and menu access for non-admin users
    let finalBusinessUnits = formState.businessUnits;
    let finalMenuAccess = formState.menuAccess;
    
    if (!isSuperAdmin) {
      const hasAccess = await canEditUserControl();
      if (!hasAccess) {
        showAlert('Anda tidak memiliki akses untuk mengedit User Control di business unit ini.', 'Akses Ditolak');
        return;
      }
      
      // Filter to only include current business unit
      if (currentBusinessUnit) {
        finalBusinessUnits = finalBusinessUnits.filter(unit => unit === currentBusinessUnit as BusinessId);
        const currentBusinessId = currentBusinessUnit as BusinessId;
        finalMenuAccess = {
          packaging: [],
          'general-trading': [],
          trucking: [],
          [currentBusinessId]: finalMenuAccess[currentBusinessId] || []
        } as Record<BusinessId, string[]>;
      }
    }

    setSaving(true);
    try {
      // CRITICAL: Load all users (including deleted) from storage to check for duplicates
      const storageKey = 'userAccessControl';
      const allStoredUsers = (await storageService.get<UserAccess[]>(storageKey)) || [];
      
      const timestamp = new Date().toISOString();
      
      // Validate and sanitize menu access before saving
      const sanitizedAccess = sanitizeMenuAccess(finalBusinessUnits, finalMenuAccess);
      
      // Validate that at least one business unit has menu access if business units are selected
      const hasAnyMenuAccess = Object.values(sanitizedAccess).some(menus => menus.length > 0);
      if (finalBusinessUnits.length > 0 && !hasAnyMenuAccess) {
        showAlert('Pilih minimal satu menu untuk unit bisnis yang dipilih.', 'Information');
        setSaving(false);
        return;
      }
      
      const defaultBusiness = formState.defaultBusiness && finalBusinessUnits.includes(formState.defaultBusiness as BusinessId)
        ? (formState.defaultBusiness as BusinessId)
        : finalBusinessUnits[0];

      // Generate or use existing ID
      let userId = formState.id || `usr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      
      // CRITICAL: Anti-duplicate check - ensure ID is unique
      // Check if ID already exists (excluding current user if editing)
      const existingUserWithId = allStoredUsers.find(u => u.id === userId && (!formState.id || u.id !== formState.id));
      if (existingUserWithId) {
        // If editing and ID matches, that's OK
        // But if creating new or ID changed to existing one, generate new ID
        if (!formState.id || userId !== formState.id) {
          // Generate new unique ID
          let attempts = 0;
          while (allStoredUsers.some(u => u.id === userId) && attempts < 10) {
            userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
            attempts++;
          }
          if (attempts >= 10) {
            throw new Error('Gagal membuat ID unik. Silakan coba lagi.');
          }
        }
      }

      const payload: UserAccess = {
        id: userId,
        fullName: formState.fullName.trim(),
        username: formState.username.trim(),
        email: formState.email.trim() || undefined,
        phone: formState.phone.trim() || undefined,
        role: formState.role.trim() || undefined,
        accessCode: formState.accessCode.trim() || undefined,
        isActive: formState.isActive,
        businessUnits: finalBusinessUnits,
        defaultBusiness,
        menuAccess: sanitizedAccess,
        notes: formState.notes.trim() || undefined,
        createdAt: formState.id
          ? allStoredUsers.find((u) => u.id === formState.id)?.createdAt || timestamp
          : timestamp,
        updatedAt: timestamp,
      };

      // CRITICAL: Deduplicate by ID - use Map to ensure uniqueness
      const userMap = new Map<string, UserAccess>();
      
      // Add all existing users first (excluding the one being edited if editing)
      allStoredUsers.forEach(user => {
        if (user.id && user.id !== payload.id) {
          userMap.set(user.id, user);
        }
      });
      
      // Add/update the current payload (this will overwrite if ID exists)
      userMap.set(payload.id, payload);
      
      // Convert back to array
      const updatedList = Array.from(userMap.values());
      
      // Save to storage
      await storageService.set(storageKey, updatedList);
      
      // Filter active users for display
      const activeUsers = filterActiveItems(updatedList);
      setUsers(activeUsers);
      setSelectedUser(payload);
      setFormState(createEmptyForm());
      setFormVisible(false);
      showAlert('User access tersimpan ✅', 'Success');
      
      console.log(`[UserControl] Saved user ${payload.fullName} (ID: ${payload.id}) - ensured ID uniqueness`);
    } catch (error: any) {
      console.error(error);
      showAlert(`Gagal menyimpan user: ${error.message || error}`, 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelForm = () => {
    setFormState(createEmptyForm());
    setFormVisible(false);
  };

  const userColumns = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          ref={selectAllCheckboxRef}
          checked={allSelected}
          onChange={(e) => handleSelectAll(e.target.checked)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
      render: (user: UserAccess) => (
        <input
          type="checkbox"
          checked={selectedUserIds.has(user.id)}
          onChange={(e) => {
            e.stopPropagation();
            handleSelectUserCheckbox(user.id, e.target.checked);
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    },
    {
      key: 'fullName',
      header: 'User',
      render: (user: UserAccess) => (
        <div className="user-cell">
          <strong>{user.fullName}</strong>
          <span className="muted-text">@{user.username}</span>
        </div>
      ),
    },
    {
      key: 'businessUnits',
      header: 'Units',
      render: (user: UserAccess) => (
        <div className="chip-row">
          {user.businessUnits.map((unit) => (
            <span key={unit} className="access-chip">
              {(() => {
                const config = BUSINESS_MENU_MAP[unit];
                return config ? `${config.icon} ${config.label}` : unit;
              })()}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'menuAccess',
      header: 'Menus',
      render: (user: UserAccess) => (
        <div className="muted-text">{getMenuCount(user.menuAccess)} menu</div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (user: UserAccess) => user.role || '-',
    },
    {
      key: 'status',
      header: 'Status',
      render: (user: UserAccess) => (
        <span className={`status-chip ${user.isActive ? 'active' : 'inactive'}`}>
          {user.isActive ? 'ACTIVE' : 'INACTIVE'}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Update',
      render: (user: UserAccess) => (
        <span className="muted-text">{formatDateTime(user.updatedAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (user: UserAccess) => (
        <div className="table-actions">
          <Button
            variant="secondary"
            onClick={(e) => {
              e?.stopPropagation();
              handleEditUser(user);
            }}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            onClick={(e) => {
              e?.stopPropagation();
              handleDeleteUser(user);
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const businessUsage = BUSINESS_MENU_CONFIG.map((config) => ({
      ...config,
      count: users.filter((u) => u.businessUnits.includes(config.id)).length,
    }));
    return { total, active, businessUsage };
  }, [users]);

  return (
    <div className="module-compact user-control-page">
      <div className="page-header">
        <div>
          <h1>User Control</h1>
          <p>Kelola akses menu & unit bisnis per user</p>
        </div>
        <Button onClick={handleStartCreate}>+ Tambah User</Button>
      </div>

      {/* Daftar User - Paling Atas */}
      <Card
        title="Daftar User"
        actions={
          <div className="user-list-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {selectedUserIds.size > 0 && (
              <Button
                variant="danger"
                onClick={handleBulkDelete}
                style={{ marginRight: '8px' }}
              >
                Hapus {selectedUserIds.size} User
              </Button>
            )}
            <Input
              placeholder="Cari nama, username, role..."
              value={searchQuery}
              onChange={setSearchQuery}
              className="search-input"
            />
          </div>
        }
      >
        <Table
          columns={userColumns}
          data={filteredUsers}
          onRowClick={handleSelectUser}
          emptyMessage="Belum ada data user. Tambahkan user pertama."
          getRowStyle={(user) => ({
            backgroundColor:
              selectedUser?.id === user.id ? 'rgba(33, 150, 243, 0.08)' : undefined,
          })}
        />
      </Card>

      <div className="user-control-grid">
        <div className="user-control-left">
          <Card title="Distribusi Akses">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-label">Total User</div>
                <div className="stat-value">{stats.total}</div>
                <div className="stat-desc">{stats.active} aktif</div>
              </div>
              {stats.businessUsage.map((business) => (
                <div key={business.id} className="stat-card small">
                  <div className="stat-label">
                    {business.icon} {business.label}
                  </div>
                  <div className="stat-value">{business.count}</div>
                  <div className="stat-desc">user</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="user-control-right">
          {!formVisible && (
            <Card title="Akses Terpilih">
              {selectedUser ? (
                <div className="selected-detail">
                  <div className="selected-header">
                    <div>
                      <h2>{selectedUser.fullName}</h2>
                      <p>@{selectedUser.username}</p>
                    </div>
                    <span className={`status-chip ${selectedUser.isActive ? 'active' : 'inactive'}`}>
                      {selectedUser.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                  <div className="selected-meta">
                    <div>
                      <label>Role</label>
                      <strong>{selectedUser.role || '-'}</strong>
                    </div>
                    <div>
                      <label>Default Unit</label>
                      <strong>
                        {selectedUser.defaultBusiness
                          ? (BUSINESS_MENU_MAP[selectedUser.defaultBusiness]?.label || selectedUser.defaultBusiness)
                          : '-'}
                      </strong>
                    </div>
                    <div>
                      <label>Total Menu</label>
                      <strong>{getMenuCount(selectedUser.menuAccess)}</strong>
                    </div>
                  </div>

                  <div className="chip-row">
                    {selectedUser.businessUnits.map((unit) => (
                      <span key={unit} className="access-chip large">
                        {(() => {
                          const config = BUSINESS_MENU_MAP[unit];
                          return config ? `${config.icon} ${config.label}` : unit;
                        })()}
                      </span>
                    ))}
                  </div>

                  <div className="menu-preview">
                    {selectedUser.businessUnits.map((unit) => {
                      const menus = selectedUser.menuAccess[unit] || [];
                      return (
                        <div key={unit} className="menu-preview-section">
                          <div className="menu-section-title">
                            {(() => {
                              const config = BUSINESS_MENU_MAP[unit];
                              return config ? `${config.label} (${menus.length} menu)` : `${unit} (${menus.length} menu)`;
                            })()}
                          </div>
                          {menus.length === 0 ? (
                            <p className="muted-text">Belum ada menu yang dipilih.</p>
                          ) : (
                            <div className="menu-pill-grid">
                              {menus.map((menuId) => (
                                <span key={menuId} className="menu-pill">
                                  {MENU_LOOKUP[menuId]?.label || menuId}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {selectedUser.notes && (
                    <div className="notes-box">
                      <label>Catatan</label>
                      <p>{selectedUser.notes}</p>
                    </div>
                  )}

                  <div className="selected-footer">
                    <span>Created: {formatDateTime(selectedUser.createdAt)}</span>
                    <span>Updated: {formatDateTime(selectedUser.updatedAt)}</span>
                  </div>

                  <div className="selected-actions">
                    <Button onClick={() => handleEditUser(selectedUser)}>Edit Access</Button>
                    <Button variant="secondary" onClick={handleStartCreate}>
                      Tambah Baru
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="muted-text">Pilih user untuk melihat detail akses.</p>
              )}
            </Card>
          )}
        </div>
      </div>

      {/* PIN Dialog */}
      {pinDialogVisible && (
        <div className="dialog-overlay" onClick={() => { setPinDialogVisible(false); setPinInput(''); setPendingEditAction(null); }} style={{ zIndex: 10001 }}>
          <div className="dialog-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="dialog-header">
              <h3>Masukkan PIN</h3>
              <button className="dialog-close" onClick={() => { setPinDialogVisible(false); setPinInput(''); setPendingEditAction(null); }}>×</button>
            </div>
            <div className="dialog-content">
              <p style={{ marginBottom: '20px', color: 'var(--text-secondary)' }}>
                Untuk mengedit User Control, masukkan PIN yang telah ditetapkan.
              </p>
              <div onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handlePinSubmit();
                }
              }}>
                <Input
                  label="PIN"
                  type="password"
                  value={pinInput}
                  onChange={setPinInput}
                  placeholder="Masukkan PIN"
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
                <Button variant="secondary" onClick={() => { setPinDialogVisible(false); setPinInput(''); setPendingEditAction(null); }}>
                  Batal
                </Button>
                <Button variant="primary" onClick={handlePinSubmit}>
                  Masuk
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal Dialog */}
      {formVisible && (
        <div className="dialog-overlay" onClick={handleCancelForm} style={{ zIndex: 10000 }}>
          <div className="dialog-card user-form-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="dialog-header">
              <h3>{formState.id ? 'Edit User Access' : 'Tambah User Access'}</h3>
              <button className="dialog-close" onClick={handleCancelForm}>×</button>
            </div>

            <div className="dialog-content">
              <div className="form-grid">
                <Input
                  label="Nama Lengkap"
                  value={formState.fullName}
                  onChange={(value) => setFormState((prev) => ({ ...prev, fullName: value }))}
                  placeholder="e.g., Andi Saputra"
                />
                <Input
                  label="Username"
                  value={formState.username}
                  onChange={(value) => setFormState((prev) => ({ ...prev, username: value }))}
                  placeholder="andi.saputra"
                />
                <Input
                  label="Role / Jabatan"
                  value={formState.role}
                  onChange={(value) => setFormState((prev) => ({ ...prev, role: value }))}
                  placeholder="PPIC Supervisor"
                />
                <Input
                  label="Access Code / PIN"
                  value={formState.accessCode}
                  onChange={(value) => setFormState((prev) => ({ ...prev, accessCode: value }))}
                  placeholder="Opsional, contoh: 1234"
                />
                <Input
                  label="Email"
                  value={formState.email}
                  onChange={(value) => setFormState((prev) => ({ ...prev, email: value }))}
                  placeholder="user@company.com"
                />
                <Input
                  label="No. HP"
                  value={formState.phone}
                  onChange={(value) => setFormState((prev) => ({ ...prev, phone: value }))}
                  placeholder="08xxxxxxxxxx"
                />
                <label className="toggle-field">
                  <span>Aktifkan User</span>
                  <input
                    type="checkbox"
                    checked={formState.isActive}
                    onChange={(e) =>
                      setFormState((prev) => ({ ...prev, isActive: e.target.checked }))
                    }
                  />
                </label>
              </div>

              <div className="section-divider" />

              <div className="section-header">
                <div>
                  <h3>Unit Bisnis</h3>
                  <p>Pilih bisnis yang boleh diakses</p>
                </div>
              </div>

              <div className="business-grid-compact">
                {(() => {
                  // Filter business units based on selectedBusiness (if not super admin)
                  const currentUser = getCurrentUser();
                  const isSuperAdmin = currentUser && isDefaultAdmin(currentUser);
                  
                  // If super admin, show all business units
                  // If not super admin, only show current business unit
                  const availableBusinesses = isSuperAdmin 
                    ? BUSINESS_MENU_CONFIG 
                    : BUSINESS_MENU_CONFIG.filter(business => business.id === currentBusinessUnit);
                  
                  return availableBusinesses.map((business) => {
                    const selected = formState.businessUnits.includes(business.id);
                    return (
                      <label
                        key={business.id}
                        className={`business-card-compact ${selected ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => handleBusinessToggle(business.id)}
                        />
                        <span className="business-icon-compact">{business.icon}</span>
                        <span className="business-label-compact">{business.label}</span>
                      </label>
                    );
                  });
                })()}
              </div>

              {formState.businessUnits.length > 0 && (
                <>
                  <div className="default-business">
                    <label>Default unit ketika login:</label>
                    <div className="radio-row">
                      {(() => {
                        // Filter business units based on current business unit (if not super admin)
                        const currentUser = getCurrentUser();
                        const isSuperAdmin = currentUser && isDefaultAdmin(currentUser);
                        
                        const unitsToShow = isSuperAdmin 
                          ? formState.businessUnits 
                          : formState.businessUnits.filter(unit => unit === currentBusinessUnit);
                        
                        return unitsToShow.map((unit) => {
                          const config = BUSINESS_MENU_MAP[unit];
                          if (!config) return null; // Skip if business unit not found
                          return (
                            <label key={unit} className="radio-option">
                              <input
                                type="radio"
                                value={unit}
                                checked={formState.defaultBusiness === unit}
                                onChange={() =>
                                  setFormState((prev) => ({ ...prev, defaultBusiness: unit }))
                                }
                              />
                              {config.label}
                            </label>
                          );
                        });
                      })()}
                    </div>
                  </div>

                  <div className="section-divider" />

                  <div className="section-header">
                    <div>
                      <h3>Akses Menu</h3>
                      <p>Checklist menu yang boleh digunakan per unit</p>
                    </div>
                  </div>

                  <div className="menu-access-list">
                    {(() => {
                      // Filter business units based on current business unit (if not super admin)
                      const currentUser = getCurrentUser();
                      const isSuperAdmin = currentUser && isDefaultAdmin(currentUser);
                      
                      const unitsToShow = isSuperAdmin 
                        ? formState.businessUnits 
                        : formState.businessUnits.filter(unit => unit === currentBusinessUnit);
                      
                      return unitsToShow.map((unit) => {
                        const config = BUSINESS_MENU_MAP[unit];
                        if (!config) return null; // Skip if business unit not found in config
                        const allMenus = getAllMenuIds(unit);
                        const selectedMenus = formState.menuAccess[unit] || [];

                        return (
                          <div key={unit} className="menu-access-card">
                            <div className="menu-access-header">
                              <div>
                                <h4>{config.label}</h4>
                                <span className="muted-text">
                                  {selectedMenus.length}/{allMenus.length} menu
                                </span>
                              </div>
                              <div className="menu-actions">
                                <Button
                                  variant="secondary"
                                  onClick={() => handleSelectAllMenus(unit)}
                                >
                                  Pilih Semua
                                </Button>
                                <Button variant="secondary" onClick={() => handleClearMenus(unit)}>
                                  Bersihkan
                                </Button>
                              </div>
                            </div>
                            {config.sections.map((section) => (
                              <div key={section.id} className="menu-section">
                                <div className="menu-section-title">{section.title}</div>
                                <div className="menu-checkbox-grid">
                                  {section.items.map((item) => {
                                    const checked = selectedMenus.includes(item.id);
                                    return (
                                      <label key={item.id} className="checkbox-option">
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={() => handleMenuToggle(unit, item.id)}
                                        />
                                        <span>{item.label}</span>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </>
              )}

              <label className="notes-field">
                <span>Catatan Opsional</span>
                <textarea
                  value={formState.notes}
                  onChange={(e) =>
                    setFormState((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  placeholder="Tambahkan catatan akses atau batasan khusus..."
                />
              </label>
            </div>

            <div className="form-actions">
              <Button variant="primary" onClick={handleSaveUser} disabled={saving}>
                {saving ? 'Menyimpan...' : formState.id ? 'Update Access' : 'Simpan User'}
              </Button>
              <Button variant="secondary" onClick={handleCancelForm}>
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Custom Dialog */}
      {dialogState.show && (
        <div className="dialog-overlay" onClick={closeDialog}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <Card className="dialog-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2>{dialogState.title}</h2>
                <Button variant="secondary" onClick={closeDialog} style={{ padding: '6px 12px' }}>✕</Button>
              </div>
              <p style={{ marginBottom: '20px', whiteSpace: 'pre-wrap' }}>{dialogState.message}</p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                {dialogState.type === 'confirm' && (
                  <Button variant="secondary" onClick={closeDialog}>Cancel</Button>
                )}
                <Button
                  variant="primary"
                  onClick={() => {
                    if (dialogState.onConfirm) dialogState.onConfirm();
                    closeDialog();
                  }}
                >
                  {dialogState.type === 'confirm' ? 'Confirm' : 'OK'}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserControl;

