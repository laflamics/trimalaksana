# GT STORAGE PATHS ANALYSIS

## 🔍 ANALYSIS BASED ON CODE REVIEW

### GT Storage Keys Used (from SalesOrders.tsx):

**READ Operations:**
- `gt_salesOrders` - Main sales orders data
- `gt_quotations` - Quotations data  
- `gt_customers` - Customer data
- `gt_products` - Product catalog
- `gt_company` - Company settings
- `gt_ppicNotifications` - PPIC notifications
- `gt_purchaseOrders` - Purchase orders (for validation)
- `gt_delivery` - Delivery data (for validation)
- `gt_purchaseRequests` - Purchase requests (for validation)

**WRITE Operations:**
- `gt_products` - When adding new products
- `gt_quotations` - When creating/updating quotations
- `gt_salesOrders` - When creating/updating sales orders
- `gt_ppicNotifications` - When creating PPIC notifications

### GT Sync Service Paths (from gt-sync.ts):

**Server Sync Keys:**
- Uses `general-trading/` prefix for server paths
- Downloads: `gt_salesOrders`, `gt_quotations`, `gt_products`, `gt_customers`, `gt_suppliers`, `userAccessControl`
- Storage key format: `general-trading/{key}` (with dash)

### Storage Service Business Context (from storage.ts):

**Business Type:** `'general-trading'` (with dash)

**GT Data Keys for Server Sync:**
```typescript
} else if (business === 'general-trading') {
  dataKeys = [
    'gt_products', 'gt_customers', 'gt_suppliers', 'gt_salesOrders',
    'gt_purchaseOrders', 'gt_invoices', 'gt_payments', 'userAccessControl'
  ];
}
```

**Server Path Format:**
```typescript
} else if (business === 'general-trading') {
  serverPath = `general-trading/${key}`;
}
```

## 🎯 POTENTIAL ISSUES IDENTIFIED

### 1. **Similar to Packaging Issue**
- If storage config is in server mode but pointing to wrong server/business
- GT components would get null data from storage service
- UI would show empty screens

### 2. **Business Context Mismatch**
- If `selectedBusiness` is not `'general-trading'`
- Storage service would use wrong paths
- Data wouldn't load properly

### 3. **Missing GT Data Files**
- If GT data files don't exist in localStorage
- Components would show empty data
- Need to check if files were deleted

### 4. **Server Sync Configuration**
- If server mode is configured but server is unreachable
- Background sync would fail
- Local data might not be available

## 🔧 RECOMMENDED CHECKS

1. **Check if GT data files exist:**
   - `data/localStorage/gt_*.json`
   - `data/localStorage/general-trading/gt_*.json`

2. **Check storage configuration:**
   - `data/localStorage/storage_config.json`
   - `data/localStorage/selectedBusiness.json`

3. **Verify business context:**
   - Should be `'general-trading'` for GT modules to work

4. **Test GT component data loading:**
   - Check browser console for storage errors
   - Verify data is being loaded from correct paths

## 💡 LIKELY SOLUTION

If similar to packaging issue:
1. **Update storage config** to correct business context
2. **Ensure GT data files exist** in correct locations  
3. **Fix server URL** if in server mode
4. **Test GT UI** to verify data loads correctly

The pattern suggests GT might have the same configuration mismatch as packaging had.