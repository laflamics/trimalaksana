---
inclusion: auto
---

# Project Context & Architecture

## Project Overview
Multi-module ERP system dengan 3 main business units:
- **Packaging**: Kemasan produk, sales orders, delivery notes, PPIC, purchasing
- **General Trading**: Penjualan umum dengan sales orders
- **Trucking**: Logistik dan pengiriman

## Module Structure

### Pages Structure
```
src/pages/
├── Packaging/
│   ├── Layout.tsx (main container)
│   ├── SalesOrders.tsx (SO management)
│   ├── DeliveryNote.tsx (DN creation & management)
│   ├── PPIC.tsx (production planning)
│   ├── Purchasing.tsx (PO management)
│   └── [other modules]
├── GeneralTrading/
│   ├── Layout.tsx
│   └── SalesOrders.tsx
├── Trucking/
│   └── Layout.tsx
├── Master/
│   ├── Materials.tsx
│   ├── Customers.tsx
│   ├── Suppliers.tsx
│   └── Inventory.tsx
└── SuperAdmin/
    ├── SuperAdmin.tsx
    └── BackupRestore.tsx
```

## Key Services & Utilities

### Core Services
- **backup-restore.ts**: Backup/restore functionality untuk database
- **blob-service-web.ts**: File upload/download handling (Vercel blob storage)
- **packaging-sync.ts**: Sync logic untuk packaging module

### Hooks
- **useDialog.tsx**: Dialog/modal management hook (widely used)

### Components
- **Table.tsx**: Reusable table component (used across modules)
- **ErrorBoundary.tsx**: Error handling wrapper

### Styling
- **toast.css**: Toast notification styles

## Common Patterns

### Dialog Management
```typescript
// useDialog hook untuk manage dialog state
const { openDialog, closeDialog, isOpen } = useDialog();
```

### Table Usage
```typescript
// Table component untuk list/grid display
<Table data={data} columns={columns} />
```

### Toast Notifications
```typescript
// Toast untuk user feedback
toast.success("Operation successful");
```

## Performance Optimizations Done
- Optimistic updates di SalesOrders & DeliveryNote
- PPIC performance optimization (mclaren speed)
- Toast optimization
- Product dropdown caching di Inventory

## Important Files Reference
#[[file:src/pages/Packaging/DeliveryNote.tsx]]
#[[file:src/pages/Packaging/SalesOrders.tsx]]
#[[file:src/pages/Packaging/PPIC.tsx]]
#[[file:src/services/backup-restore.ts]]
#[[file:src/services/blob-service-web.ts]]
#[[file:src/hooks/useDialog.tsx]]
#[[file:src/components/Table.tsx]]

## Recent Work Areas
- Delivery Note: Template changes, performance fixes
- Sales Orders: Optimization, duplicate prevention
- PPIC: Speed improvements
- Backup/Restore: Feature implementation
- Dialog & Toast: Layout improvements

## Development Notes
- Use optimistic updates untuk better UX
- Always handle errors dengan ErrorBoundary
- Use useDialog hook untuk modal management
- Table component handles pagination & sorting
- Blob service handles file operations
