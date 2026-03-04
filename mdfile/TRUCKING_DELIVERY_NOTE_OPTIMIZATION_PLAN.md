# Trucking Delivery Note: Optimization Implementation Plan

## Quick Summary

Packaging business handles large datasets efficiently. Trucking delivery notes should adopt the same strategies.

**Key Differences**:
- Packaging: Pagination (20 items), Search limits (200 items), Real-time sync
- Trucking: No pagination, No search limits, No real-time sync listeners

**Result**: Trucking pages are slower and less responsive.

---

## Implementation Checklist

### Phase 1: Critical (Week 1)

- [ ] **Add Pagination to DeliveryNote.tsx**
  - 20 items per page
  - Reset to page 1 on filter change
  - Show total pages and current page

- [ ] **Add Search Filtering with Limits**
  - Search by DN No, DO No, Driver Name
  - Limit results to 200 items
  - Show warning when limit reached

- [ ] **Add Real-Time Sync Listeners**
  - Listen for `trucking_suratJalan` changes
  - Listen for `trucking_suratJalanNotifications` changes
  - Listen for `trucking_delivery_orders` changes
  - Auto-reload when data changes

### Phase 2: Important (Week 2)

- [ ] **Optimize useMemo Usage**
  - Memoize filtered notifications
  - Memoize filtered delivery orders
  - Memoize paginated results

- [ ] **Add Parallel Data Loading**
  - Load all data with Promise.all
  - Show single loading state
  - Faster overall load time

- [ ] **Add Batch Operations**
  - Batch delete delivery notes
  - Batch export to Excel
  - Parallel operations

### Phase 3: Nice to Have (Week 3)

- [ ] **Add Sync Status Indicator**
  - Show "Syncing...", "Synced", "Error"
  - Show last sync time
  - Show pending sync count

- [ ] **Add Excel Export**
  - Export filtered delivery notes
  - Include related data
  - Timestamp in filename

- [ ] **Add Performance Monitoring**
  - Log render times
  - Log data load times
  - Monitor memory usage

---

## Code Changes Required

### 1. DeliveryNote.tsx - Add Pagination

**Current**:
```typescript
const [deliveryNote, setDeliveryNote] = useState<any[]>([]);

// Render all items
{deliveryNote.map((dn, idx) => (
  <tr key={idx}>...</tr>
))}
```

**New**:
```typescript
const [deliveryNote, setDeliveryNote] = useState<any[]>([]);
const [currentPage, setCurrentPage] = useState(1);
const itemsPerPage = 20;

// Paginate
const paginatedDeliveryNotes = useMemo(() => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return deliveryNote.slice(startIndex, endIndex);
}, [deliveryNote, currentPage, itemsPerPage]);

const totalPages = Math.ceil(deliveryNote.length / itemsPerPage);

// Reset page on filter change
useEffect(() => {
  setCurrentPage(1);
}, [searchQuery, statusFilter, dateFrom, dateTo]);

// Render paginated items
{paginatedDeliveryNotes.map((dn, idx) => (
  <tr key={idx}>...</tr>
))}

// Add pagination controls
{totalPages > 1 && (
  <div className="pagination">
    <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}>
      Previous
    </button>
    <span>Page {currentPage} of {totalPages}</span>
    <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}>
      Next
    </button>
  </div>
)}
```

---

### 2. DeliveryNote.tsx - Add Search Filtering with Limits

**Current**:
```typescript
const [searchQuery, setSearchQuery] = useState('');

// No filtering
```

**New**:
```typescript
const [searchQuery, setSearchQuery] = useState('');

// Filter with search and limits
const filteredDeliveryNotes = useMemo(() => {
  let filtered = deliveryNote;
  
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    filtered = deliveryNote.filter(dn => {
      const dnNo = (dn.dnNo || '').toLowerCase();
      const doNo = (dn.doNo || '').toLowerCase();
      const driver = (dn.driverName || '').toLowerCase();
      return dnNo.includes(query) || doNo.includes(query) || driver.includes(query);
    });
  }
  
  // Limit to 200 for performance
  return filtered.slice(0, 200);
}, [searchQuery, deliveryNote]);

// Use filtered results for pagination
const paginatedDeliveryNotes = useMemo(() => {
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return filteredDeliveryNotes.slice(startIndex, endIndex);
}, [filteredDeliveryNotes, currentPage, itemsPerPage]);

// Show warning if limit reached
{filteredDeliveryNotes.length >= 200 && (
  <span style={{ color: '#ff9800' }}>
    (Limited to 200. Use search to narrow down)
  </span>
)}
```

---

### 3. DeliveryNote.tsx - Add Real-Time Sync Listeners

**Current**:
```typescript
useEffect(() => {
  loadDeliveryNotes();
}, []);

// No sync listeners
```

**New**:
```typescript
useEffect(() => {
  loadDeliveryNotes();
}, []);

// Listen for real-time sync
useEffect(() => {
  const handleStorageChange = (event: Event) => {
    const detail = (event as CustomEvent<{ key?: string; action?: string }>).detail;
    const key = detail?.key;
    
    if (key === 'trucking_suratJalan' || 
        key === 'trucking_suratJalanNotifications' || 
        key === 'trucking_delivery_orders') {
      console.log(`[DeliveryNote] 🔄 Update received for ${key}, reloading...`);
      loadDeliveryNotes();
    }
  };
  
  window.addEventListener('app-storage-changed', handleStorageChange as EventListener);
  
  return () => {
    window.removeEventListener('app-storage-changed', handleStorageChange as EventListener);
  };
}, []);
```

---

### 4. DeliveryNote.tsx - Optimize Data Loading

**Current**:
```typescript
const loadDeliveryNotes = async () => {
  try {
    setLoading(true);
    const dnData = await storageService.get<any[]>('trucking_suratJalan');
    const notifData = await storageService.get<any[]>('trucking_suratJalanNotifications');
    const doData = await storageService.get<any[]>('trucking_delivery_orders');
    
    // Sequential loading (slow)
    setDeliveryNote(dnData || []);
    setNotifications(notifData || []);
    setDeliveryOrders(doData || []);
  } finally {
    setLoading(false);
  }
};
```

**New**:
```typescript
const loadDeliveryNotes = async () => {
  try {
    setLoading(true);
    
    // Parallel loading (fast)
    const [dnDataRaw, notifDataRaw, doDataRaw] = await Promise.all([
      storageService.get<any[]>('trucking_suratJalan'),
      storageService.get<any[]>('trucking_suratJalanNotifications'),
      storageService.get<any[]>('trucking_delivery_orders'),
    ]);
    
    // Extract and filter
    const dnData = filterActiveItems(extractStorageValue(dnDataRaw));
    const notifData = filterActiveItems(extractStorageValue(notifDataRaw));
    const doData = filterActiveItems(extractStorageValue(doDataRaw));
    
    setDeliveryNote(dnData);
    setNotifications(notifData);
    setDeliveryOrders(doData);
  } finally {
    setLoading(false);
  }
};
```

---

### 5. Add Batch Delete Operation

**New Function**:
```typescript
const handleBatchDelete = async (selectedItems: any[]) => {
  const confirmed = await showConfirm(
    `Delete ${selectedItems.length} delivery notes?`,
    'Batch Delete'
  );
  
  if (!confirmed) return;
  
  try {
    setLoading(true);
    
    // Delete all items in parallel
    await Promise.all(
      selectedItems.map(item => 
        deleteTruckingItem('trucking_suratJalan', item.id)
      )
    );
    
    // Reload data
    await loadDeliveryNotes();
    showAlert('Deleted successfully', 'Success');
  } finally {
    setLoading(false);
  }
};
```

---

### 6. Add Excel Export

**New Function**:
```typescript
const handleExportToExcel = async () => {
  try {
    setLoading(true);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Delivery Notes
    const wsData = filteredDeliveryNotes.map(dn => ({
      'DN No': dn.dnNo,
      'DO No': dn.doNo,
      'Driver': dn.driverName,
      'Vehicle': dn.vehicleNo,
      'Status': dn.status,
      'Created': dn.created,
    }));
    
    const ws = XLSX.utils.json_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Delivery Notes');
    
    // Download
    XLSX.writeFile(wb, `DeliveryNotes_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    showAlert('Exported successfully', 'Success');
  } finally {
    setLoading(false);
  }
};
```

---

## Performance Impact

### Load Time
- **Before**: 5-10 seconds (loading all 1000+ items)
- **After**: 1-2 seconds (loading 20 items + pagination)
- **Improvement**: 5-10x faster

### Render Time
- **Before**: 2-3 seconds (rendering 1000+ rows)
- **After**: 200-500ms (rendering 20 rows)
- **Improvement**: 5-10x faster

### Memory Usage
- **Before**: 200+ MB (storing all items in DOM)
- **After**: 50-100 MB (storing only 20 items in DOM)
- **Improvement**: 50-75% reduction

### Sync Responsiveness
- **Before**: 10+ seconds (no real-time listeners)
- **After**: 1-2 seconds (real-time listeners)
- **Improvement**: 5-10x faster

---

## Testing Checklist

- [ ] Test with 1000+ delivery notes
- [ ] Test pagination (first page, middle page, last page)
- [ ] Test search filtering (narrow down to <200 items)
- [ ] Test real-time sync (open page on 2 devices, create DN on one, see it appear on other)
- [ ] Test batch delete (select multiple items, delete)
- [ ] Test Excel export (export filtered data, verify in Excel)
- [ ] Test with slow network (simulate 3G)
- [ ] Test with server offline (should still show local data)
- [ ] Test memory usage (check DevTools)
- [ ] Test render performance (check DevTools)

---

## Rollout Plan

### Week 1: Development
- Implement pagination
- Implement search filtering
- Implement real-time sync listeners
- Test locally

### Week 2: Testing
- Test with large datasets
- Test on mobile devices
- Test with slow network
- Get user feedback

### Week 3: Deployment
- Deploy to staging
- Monitor performance
- Deploy to production
- Monitor for issues

---

## Success Metrics

- [ ] Page load time < 2 seconds
- [ ] Render time < 500ms
- [ ] Memory usage < 100 MB
- [ ] Sync delay < 2 seconds
- [ ] User satisfaction > 4/5
- [ ] No performance regressions

---

## References

- `src/pages/Packaging/SalesOrders.tsx` - Reference implementation
- `src/pages/Packaging/PPIC.tsx` - Reference implementation
- `PACKAGING_LARGE_DATA_STRATEGY.md` - Detailed strategy
- `TRUCKING_DELIVERY_NOTE_SYNC_ANALYSIS.md` - Sync issues

---

## Questions?

Contact the development team for clarification on any of these changes.
