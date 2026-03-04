# Development Guidelines - Trima Laksana ERP

**Last Updated**: February 2026  
**Architecture**: Multi-tenant ERP with PostgreSQL as source of truth  
**Tech Stack**: React 18 + TypeScript + Vite + Electron

---

## 1. Project Architecture Overview

### Business Unit Structure
The system is organized into **three independent business units**, each with its own module:

- **Packaging**: Production workflow (Sales Orders → PPIC → Production → QA/QC → Delivery)
- **General Trading**: Trading operations (Sales Orders → Purchasing → Delivery → Invoicing)
- **Trucking**: Logistics (Vehicles, Drivers, Routes, Delivery Orders)

### Data Architecture
```
PostgreSQL (Source of Truth)
    ↓
REST API (HTTP POST/GET/DELETE)
    ↓
React Components (UI)
    ↓
WebSocket (Real-time Sync to other devices)
```

**Key Principle**: PostgreSQL is the ONLY source of truth. No complex sync logic, no tombstones, no debounce.

---

## 2. Directory Structure & Organization

```
src/
├── pages/                          # Page components by business unit
│   ├── Auth/                       # Login, authentication
│   ├── Finance/                    # Shared finance module
│   ├── GeneralTrading/             # GT business unit
│   │   ├── Layout.tsx              # GT sidebar + main layout
│   │   ├── Dashboard.tsx           # GT dashboard
│   │   ├── Master/                 # Master data (Products, Customers, etc)
│   │   ├── SalesOrders.tsx         # Sales order management
│   │   ├── Purchasing.tsx          # Purchase orders
│   │   ├── DeliveryNote.tsx        # Delivery notes
│   │   ├── PPIC.tsx                # Production planning
│   │   ├── Finance/                # Finance submodule
│   │   │   ├── Invoices.tsx
│   │   │   ├── Payments.tsx
│   │   │   ├── TaxManagement.tsx
│   │   │   └── ...
│   │   └── Settings/               # GT-specific settings
│   ├── Packaging/                  # Packaging business unit (same structure)
│   ├── Trucking/                   # Trucking business unit (same structure)
│   ├── Master/                     # Shared master data
│   ├── Settings/                   # Global settings
│   ├── SuperAdmin/                 # Admin panel
│   └── Testing/                    # Test pages
├── components/                     # Reusable UI components
│   ├── Table.tsx                   # Generic data table
│   ├── Card.tsx                    # Content container
│   ├── Button.tsx                  # Button variants
│   ├── Dialog.tsx                  # Modal dialogs
│   ├── Input.tsx                   # Form input
│   ├── ProtectedRoute.tsx          # Route guard
│   ├── OptimisticButton.tsx        # Button with sync status
│   └── ...
├── services/                       # Business logic & data layer
│   ├── storage.ts                  # PostgreSQL abstraction
│   ├── api-client.ts               # HTTP client
│   ├── websocket-client.ts         # Real-time sync
│   ├── packaging-sync.ts           # Packaging data sync
│   ├── gt-sync.ts                  # GT data sync
│   ├── trucking-sync.ts            # Trucking data sync
│   ├── workflow-state-machine.ts   # Document lifecycle
│   ├── material-allocator.ts       # Material management
│   └── ...
├── hooks/                          # Custom React hooks
│   ├── useDialog.ts                # Dialog state management
│   ├── usePackagingData.ts         # Packaging data hook
│   ├── useOptimisticOperations.ts  # Optimistic updates
│   └── ...
├── utils/                          # Utility functions
│   ├── access-control-helper.ts    # Permissions
│   ├── activity-logger.ts          # Activity logging
│   ├── excel-helper.ts             # Excel import/export
│   ├── notification-helper.ts      # Toast notifications
│   └── ...
├── styles/                         # Global CSS
│   ├── index.css                   # Global styles
│   ├── variables.css               # CSS variables
│   └── ...
├── pdf/                            # PDF generators
│   ├── invoice-pdf-template.ts
│   ├── wo-pdf-template.ts
│   └── ...
└── test/                           # Test files
```

---

## 3. File Naming Conventions

| Pattern | Usage | Example |
|---------|-------|---------|
| `PascalCase.tsx` | React components | `SalesOrders.tsx`, `DeliveryNote.tsx` |
| `camelCase.ts` | Services, utilities, hooks | `api-client.ts`, `storage.ts` |
| `camelCase.css` | Component styles | `Table.css`, `Layout.css` |
| `camelCase-helper.ts` | Utility helpers | `access-control-helper.ts` |
| `*-sync.ts` | Data sync services | `packaging-sync.ts`, `gt-sync.ts` |
| `*-template.ts` | PDF generators | `invoice-pdf-template.ts` |
| `*-state-machine.ts` | State machines | `workflow-state-machine.ts` |

---

## 4. Component Development Guidelines

### 4.1 Component Structure

```typescript
import React, { useState, useEffect } from 'react';
import './ComponentName.css';
import Button from '@/components/Button';
import { storageService } from '@/services/storage';

interface ComponentProps {
  id?: string;
  onClose?: () => void;
  onSave?: (data: any) => void;
}

export default function ComponentName({ id, onClose, onSave }: ComponentProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Load data from service
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="component-name">
      {/* Component content */}
    </div>
  );
}
```

### 4.2 Component Best Practices

✅ **DO**:
- Use TypeScript interfaces for all props
- Handle loading and error states
- Use custom hooks for shared logic
- Keep components focused and single-responsibility
- Use CSS classes instead of inline styles
- Implement proper error boundaries
- Add JSDoc comments for complex logic

❌ **DON'T**:
- Use `any` type (use `unknown` or specific types)
- Access localStorage directly (use storageService)
- Hardcode URLs or API endpoints
- Use prop drilling (use custom hooks instead)
- Leave promises unhandled
- Use magic strings (use constants)

### 4.3 Reusable Components

#### Table Component
```typescript
import Table, { Column } from '@/components/Table';

interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

const columns: Column<Product>[] = [
  { key: 'name', header: 'Product Name' },
  { key: 'price', header: 'Price', render: (item) => `Rp ${item.price.toLocaleString()}` },
  { key: 'stock', header: 'Stock' },
];

<Table
  columns={columns}
  data={products}
  onRowClick={(product) => handleEdit(product)}
  pageSize={20}
  showPagination={true}
/>
```

#### Card Component
```typescript
import Card from '@/components/Card';

<Card title="Sales Orders" icon="📦">
  <div>Card content here</div>
</Card>
```

#### Button Component
```typescript
import Button from '@/components/Button';

<Button variant="primary" onClick={handleSave}>Save</Button>
<Button variant="secondary" onClick={handleCancel}>Cancel</Button>
<Button variant="danger" onClick={handleDelete}>Delete</Button>
```

#### Dialog Component
```typescript
import { useDialog } from '@/hooks/useDialog';

const { isOpen, open, close } = useDialog();

<Dialog isOpen={isOpen} onClose={close} title="Confirm Action">
  <p>Are you sure?</p>
  <Button onClick={handleConfirm}>Yes</Button>
  <Button onClick={close}>No</Button>
</Dialog>
```

---

## 5. Service Layer Guidelines

### 5.1 Storage Service (PostgreSQL)

```typescript
import { storageService } from '@/services/storage';
import { StorageKeys } from '@/services/storage';

// Get data
const products = await storageService.get(StorageKeys.PACKAGING.PRODUCTS);

// Save data
await storageService.set(StorageKeys.PACKAGING.PRODUCTS, products);

// Delete data
await storageService.remove(StorageKeys.PACKAGING.PRODUCTS);

// Batch operations
await storageService.batch([
  { action: 'set', key: StorageKeys.PACKAGING.PRODUCTS, value: products },
  { action: 'set', key: StorageKeys.PACKAGING.SALES_ORDERS, value: orders },
]);
```

### 5.2 Storage Keys Registry

**ALWAYS use StorageKeys constants, never hardcode strings:**

```typescript
// ✅ CORRECT
const data = await storageService.get(StorageKeys.PACKAGING.PRODUCTS);

// ❌ WRONG
const data = await storageService.get('products');
```

**Available Keys**:
- `StorageKeys.PACKAGING.*` - Packaging module data
- `StorageKeys.GENERAL_TRADING.*` - GT module data
- `StorageKeys.TRUCKING.*` - Trucking module data
- `StorageKeys.SHARED.*` - Cross-business data

### 5.3 Creating Custom Services

```typescript
// services/my-service.ts
import { storageService } from './storage';
import { StorageKeys } from './storage';

export const myService = {
  async getItems() {
    return await storageService.get(StorageKeys.PACKAGING.PRODUCTS);
  },

  async addItem(item: any) {
    const items = await this.getItems();
    items.push(item);
    await storageService.set(StorageKeys.PACKAGING.PRODUCTS, items);
  },

  async updateItem(id: string, updates: any) {
    const items = await this.getItems();
    const index = items.findIndex(i => i.id === id);
    if (index !== -1) {
      items[index] = { ...items[index], ...updates };
      await storageService.set(StorageKeys.PACKAGING.PRODUCTS, items);
    }
  },

  async deleteItem(id: string) {
    const items = await this.getItems();
    const filtered = items.filter(i => i.id !== id);
    await storageService.set(StorageKeys.PACKAGING.PRODUCTS, filtered);
  },
};
```

---

## 6. Custom Hooks Guidelines

### 6.1 Data Fetching Hook

```typescript
import { useState, useEffect, useCallback } from 'react';
import { storageService } from '@/services/storage';

export function useData<T>(key: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await storageService.get(key);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}
```

### 6.2 Dialog Hook

```typescript
import { useState } from 'react';

export function useDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(!isOpen),
  };
}
```

### 6.3 Form Hook

```typescript
import { useState, useCallback } from 'react';

export function useForm<T>(initialValues: T) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  return { values, errors, handleChange, setValues, setErrors, reset };
}
```

---

## 7. Type Definitions & Interfaces

### 7.1 Core Types

```typescript
// Storage
export type StorageType = 'local' | 'server';
export type BusinessType = 'packaging' | 'general-trading' | 'trucking';
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

// Workflow
export type WorkflowEntity = 
  | 'salesOrder' 
  | 'spk' 
  | 'purchaseOrder' 
  | 'grn' 
  | 'production' 
  | 'qc' 
  | 'delivery' 
  | 'invoice';

export type WorkflowStatus = 
  | 'DRAFT' 
  | 'OPEN' 
  | 'CONFIRMED' 
  | 'APPROVED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'CLOSE' 
  | 'VOID' 
  | 'CANCELLED';

// Access Control
export interface UserAccess {
  id: string;
  fullName: string;
  username: string;
  isActive: boolean;
  businessUnits: string[];
  menuAccess?: Record<string, string[]>;
}
```

### 7.2 Entity Interfaces

```typescript
// Product
export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  category: string;
  unit: string;
  price: number;
  cost: number;
  stock: number;
  reorderLevel: number;
  createdAt: string;
  updatedAt: string;
}

// Sales Order
export interface SalesOrder {
  id: string;
  soNo: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  deliveryDate: string;
  items: SalesOrderItem[];
  status: WorkflowStatus;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesOrderItem {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
}
```

---

## 8. State Management Patterns

### 8.1 Component State

Use React hooks for component-level state:

```typescript
const [data, setData] = useState<T[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

### 8.2 Shared State

Use custom hooks instead of prop drilling:

```typescript
// ✅ CORRECT - Use custom hook
const { data, loading } = usePackagingData('products');

// ❌ WRONG - Prop drilling
<Component data={data} loading={loading} onUpdate={onUpdate} />
```

### 8.3 Global State

For truly global state (user, theme, etc), use a service:

```typescript
export const userService = {
  currentUser: null as User | null,
  
  async login(username: string, password: string) {
    // Login logic
    this.currentUser = user;
  },
  
  logout() {
    this.currentUser = null;
  },
};
```

---

## 9. Error Handling & Validation

### 9.1 Try-Catch Pattern

```typescript
try {
  const result = await storageService.get(key);
  setData(result);
} catch (err) {
  const message = err instanceof Error ? err.message : 'Unknown error';
  setError(message);
  console.error('Error loading data:', err);
}
```

### 9.2 Validation

```typescript
function validateProduct(product: any): string[] {
  const errors: string[] = [];
  
  if (!product.code?.trim()) errors.push('Product code is required');
  if (!product.name?.trim()) errors.push('Product name is required');
  if (product.price < 0) errors.push('Price must be positive');
  if (product.stock < 0) errors.push('Stock must be non-negative');
  
  return errors;
}

// Usage
const errors = validateProduct(product);
if (errors.length > 0) {
  setError(errors.join(', '));
  return;
}
```

### 9.3 Error Boundaries

```typescript
import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <div className="error">Something went wrong: {this.state.error?.message}</div>;
    }

    return this.props.children;
  }
}
```

---

## 10. API Integration Patterns

### 10.1 REST API Endpoints

```typescript
// GET - Fetch data
const data = await storageService.get(StorageKeys.PACKAGING.PRODUCTS);

// POST - Create/Update data
await storageService.set(StorageKeys.PACKAGING.PRODUCTS, products);

// DELETE - Remove data
await storageService.remove(StorageKeys.PACKAGING.PRODUCTS);

// Batch operations
await storageService.batch([
  { action: 'set', key: StorageKeys.PACKAGING.PRODUCTS, value: products },
  { action: 'set', key: StorageKeys.PACKAGING.SALES_ORDERS, value: orders },
]);
```

### 10.2 WebSocket Real-time Sync

```typescript
// Listen for storage changes
window.addEventListener('app-storage-changed', (event: any) => {
  const { key, value } = event.detail;
  
  if (key === StorageKeys.PACKAGING.PRODUCTS) {
    setProducts(value);
  }
});

// Listen for storage deletions
window.addEventListener('app-storage-deleted', (event: any) => {
  const { key } = event.detail;
  
  if (key === StorageKeys.PACKAGING.PRODUCTS) {
    setProducts([]);
  }
});
```

### 10.3 File Upload (MinIO)

```typescript
import { apiClient } from '@/services/api-client';

// Upload file
const formData = new FormData();
formData.append('file', file);
formData.append('business', 'packaging');

const response = await apiClient.uploadBlob(formData);
const fileId = response.fileId;

// Delete file
await apiClient.deleteBlob('packaging', fileId);

// List files
const files = await apiClient.listBlobs('packaging');
```

---

## 11. Styling Guidelines

### 11.1 CSS Organization

```css
/* ComponentName.css */

/* Variables */
:root {
  --primary-color: #007bff;
  --secondary-color: #6c757d;
  --danger-color: #dc3545;
  --success-color: #28a745;
  --spacing-unit: 8px;
}

/* Component styles */
.component-name {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-unit);
  padding: calc(var(--spacing-unit) * 2);
}

.component-name__header {
  font-size: 18px;
  font-weight: bold;
  color: var(--primary-color);
}

.component-name__content {
  flex: 1;
}

/* Responsive */
@media (max-width: 768px) {
  .component-name {
    padding: var(--spacing-unit);
  }
}
```

### 11.2 CSS Naming (BEM)

```css
/* Block */
.card { }

/* Element */
.card__header { }
.card__title { }
.card__content { }

/* Modifier */
.card--primary { }
.card--danger { }
.card__button--disabled { }
```

### 11.3 Utility Classes

```css
/* Spacing */
.mt-1 { margin-top: var(--spacing-unit); }
.mt-2 { margin-top: calc(var(--spacing-unit) * 2); }
.p-2 { padding: calc(var(--spacing-unit) * 2); }

/* Display */
.flex { display: flex; }
.flex-col { flex-direction: column; }
.gap-2 { gap: calc(var(--spacing-unit) * 2); }

/* Text */
.text-center { text-align: center; }
.text-bold { font-weight: bold; }
.text-muted { color: var(--secondary-color); }
```

---

## 12. Testing Guidelines

### 12.1 Unit Tests

```typescript
// services/my-service.test.ts
import { myService } from './my-service';
import { storageService } from './storage';

jest.mock('./storage');

describe('myService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should get items', async () => {
    const mockItems = [{ id: '1', name: 'Item 1' }];
    (storageService.get as jest.Mock).mockResolvedValue(mockItems);

    const result = await myService.getItems();

    expect(result).toEqual(mockItems);
    expect(storageService.get).toHaveBeenCalled();
  });

  it('should add item', async () => {
    const mockItems = [{ id: '1', name: 'Item 1' }];
    const newItem = { id: '2', name: 'Item 2' };
    
    (storageService.get as jest.Mock).mockResolvedValue(mockItems);
    (storageService.set as jest.Mock).mockResolvedValue(undefined);

    await myService.addItem(newItem);

    expect(storageService.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([...mockItems, newItem])
    );
  });
});
```

### 12.2 Component Tests

```typescript
// components/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('should render button with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('should call onClick handler', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Click me</Button>);
    expect(screen.getByText('Click me')).toBeDisabled();
  });
});
```

---

## 13. Performance Optimization

### 13.1 Memoization

```typescript
import { memo, useMemo, useCallback } from 'react';

// Memoize component
const ProductCard = memo(({ product }: { product: Product }) => {
  return <div>{product.name}</div>;
});

// Memoize expensive computation
const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

// Memoize callback
const handleClick = useCallback(() => {
  doSomething();
}, []);
```

### 13.2 Lazy Loading

```typescript
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

export function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### 13.3 Pagination

```typescript
// Always paginate large datasets
const [page, setPage] = useState(1);
const pageSize = 50;
const startIndex = (page - 1) * pageSize;
const endIndex = startIndex + pageSize;
const paginatedData = data.slice(startIndex, endIndex);
```

---

## 14. Security Best Practices

### 14.1 Input Validation

```typescript
// Always validate user input
function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '');
}
```

### 14.2 Access Control

```typescript
import { accessControlHelper } from '@/utils/access-control-helper';

// Check user permissions
if (!accessControlHelper.hasAccess(user, 'packaging', 'sales-orders')) {
  return <div>Access Denied</div>;
}

// Protect routes
<ProtectedRoute
  businessUnit="packaging"
  requiredAccess="sales-orders"
  component={SalesOrders}
/>
```

### 14.3 Activity Logging

```typescript
import { activityLogger } from '@/utils/activity-logger';

// Log all user actions
await activityLogger.log({
  action: 'CREATE',
  entity: 'SalesOrder',
  entityId: soNo,
  userId: user.id,
  details: { amount: totalAmount },
  timestamp: new Date().toISOString(),
});
```

---

## 15. Common Patterns & Anti-Patterns

### ✅ Good Patterns

1. **Separation of Concerns**: Services handle data, components handle UI
2. **Reusable Components**: Table, Card, Button used across modules
3. **Type Safety**: Full TypeScript with strict mode
4. **Error Boundaries**: Catch React errors gracefully
5. **Optimistic Updates**: UI updates immediately, syncs in background
6. **Access Control**: Route guards with permission checking
7. **Activity Logging**: All user actions logged for audit
8. **Centralized Storage Keys**: Single source of truth for data keys

### ❌ Anti-Patterns to Avoid

1. **Direct localStorage access** - Use storageService instead
2. **Hardcoded URLs** - Use configuration from environment
3. **Inline styles** - Use CSS classes instead
4. **Prop drilling** - Use custom hooks for shared state
5. **Unhandled promises** - Always catch errors
6. **Magic strings** - Use StorageKeys constants
7. **Mixing business logic in components** - Use services
8. **No error handling** - Always handle errors gracefully

---

## 16. Debugging Tips

### 16.1 Console Logging

```typescript
// Use descriptive log messages
console.log('[SalesOrders] Loading data...');
console.error('[SalesOrders] Error loading data:', error);
console.warn('[SalesOrders] Deprecated API used');

// Use console groups
console.group('Data Loading');
console.log('Start time:', new Date());
console.log('Data:', data);
console.groupEnd();
```

### 16.2 React DevTools

- Install React DevTools browser extension
- Use Profiler to identify performance issues
- Use Components tab to inspect component tree

### 16.3 Network Debugging

- Open DevTools Network tab
- Check API requests and responses
- Verify WebSocket connections

---

## 17. Deployment Checklist

- [ ] All TypeScript errors resolved
- [ ] All tests passing
- [ ] No console errors or warnings
- [ ] Environment variables configured
- [ ] API endpoints verified
- [ ] Database migrations applied
- [ ] Activity logging enabled
- [ ] Access control configured
- [ ] Error boundaries in place
- [ ] Performance optimized
- [ ] Security checks passed
- [ ] Documentation updated

---

## 18. Quick Reference

### Import Patterns
```typescript
// Absolute imports
import { storageService } from '@/services/storage';
import Button from '@/components/Button';
import { useDialog } from '@/hooks/useDialog';

// Relative imports
import './ComponentName.css';
```

### Storage Operations
```typescript
// Get
const data = await storageService.get(StorageKeys.PACKAGING.PRODUCTS);

// Set
await storageService.set(StorageKeys.PACKAGING.PRODUCTS, products);

// Remove
await storageService.remove(StorageKeys.PACKAGING.PRODUCTS);
```

### Component Template
```typescript
import React, { useState, useEffect } from 'react';
import './ComponentName.css';

export default function ComponentName() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load data
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return <div className="component-name">{/* Content */}</div>;
}
```

---

**Questions?** Check the mdfile/ directory for detailed implementation guides.
