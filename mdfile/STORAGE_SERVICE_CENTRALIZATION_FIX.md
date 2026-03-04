# Storage Service Centralization Fix - Server Mode Data Reading

## Problem Identified
The app was reading data directly from localStorage instead of using the `storageService`, which meant:
- In server mode, stale local data was being used instead of fresh server data
- Components bypassed the server sync mechanism
- Data wasn't being fetched from PostgreSQL even when server mode was enabled

## Root Causes Found

### 1. Direct localStorage Reads in Components
**Files affected:**
- `src/pages/Packaging/PPIC.tsx` - `loadFromLocalStorage()` function
- `src/pages/GeneralTrading/PPIC.tsx` - `loadFromLocalStorage()` function  
- `src/pages/Packaging/DeliveryNote.tsx` - Direct `localStorage.getItem()` calls

**Issue:** These components had helper functions that read directly from localStorage, bypassing `storageService.get()` which handles server mode correctly.

### 2. Direct localStorage Reads in Sync Services
**Files affected:**
- `src/services/packaging-sync.ts` - Multiple `JSON.parse(localStorage.getItem('storage_config'))` calls
- `src/services/gt-sync.ts` - Multiple `JSON.parse(localStorage.getItem('storage_config'))` calls
- `src/services/trucking-sync.ts` - Multiple `JSON.parse(localStorage.getItem('storage_config'))` calls

**Issue:** Sync services were reading the storage config directly from localStorage instead of using `storageService.getConfig()`.

## Changes Made

### 1. Packaging PPIC (`src/pages/Packaging/PPIC.tsx`)
**Before:**
```typescript
const loadFromLocalStorage = (key: string): any[] => {
  try {
    let valueStr = localStorage.getItem(key);
    if (!valueStr) {
      valueStr = localStorage.getItem(`packaging/${key}`);
    }
    if (valueStr) {
      const parsed = JSON.parse(valueStr);
      const extracted = extractStorageValue(parsed);
      return extracted;
    }
  } catch (e) {}
  return [];
};
```

**After:**
```typescript
const loadFromStorage = async (key: string): Promise<any[]> => {
  try {
    // Use storageService which handles server mode correctly
    const data = await storageService.get<any[]>(key);
    const extracted = extractStorageValue(data);
    return extracted;
  } catch (e) {
    console.error(`Error loading ${key}:`, e);
  }
  return [];
};
```

**Impact:** All data loads now go through `storageService.get()` which:
- In server mode: Fetches from PostgreSQL via WebSocket
- In local mode: Reads from localStorage/file storage
- Automatically syncs from server in background

### 2. GeneralTrading PPIC (`src/pages/GeneralTrading/PPIC.tsx`)
Same changes as Packaging PPIC - replaced `loadFromLocalStorage()` with `loadFromStorage()` that uses `storageService.get()`.

### 3. DeliveryNote (`src/pages/Packaging/DeliveryNote.tsx`)
**Before:**
```typescript
const scheduleList = (() => {
  try {
    let valueStr = localStorage.getItem(StorageKeys.PACKAGING.SCHEDULE);
    if (!valueStr) {
      valueStr = localStorage.getItem('packaging/' + StorageKeys.PACKAGING.SCHEDULE);
    }
    if (valueStr) {
      const parsed = JSON.parse(valueStr);
      const extracted = parsed.value !== undefined ? parsed.value : parsed;
      return Array.isArray(extracted) ? extracted : [];
    }
  } catch (e) {}
  return [];
})();
```

**After:**
```typescript
const scheduleList = await (async () => {
  try {
    const data = await storageService.get<any[]>(StorageKeys.PACKAGING.SCHEDULE);
    const extracted = extractStorageValue(data);
    return Array.isArray(extracted) ? extracted : [];
  } catch (e) {}
  return [];
})();
```

### 4. Sync Services (packaging-sync.ts, gt-sync.ts, trucking-sync.ts)
**Before:**
```typescript
const storageConfig = JSON.parse(localStorage.getItem('storage_config') || '{"type":"local"}');
```

**After:**
```typescript
const storageConfig = storageService.getConfig();
```

**Locations fixed:**
- `checkInitialSyncStatus()` - 1 location per file
- `syncOperation()` - 1 location per file
- `forceDownloadFromServer()` - 1 location per file
- Additional queue processing loops - 2 locations in packaging-sync.ts

## How It Works Now

### Data Flow in Server Mode
1. Component calls `storageService.get(key)`
2. StorageService checks if in server mode
3. If server mode:
   - Calls `syncFromServerInBackground(key)`
   - Which calls `syncDataFromServer(key)`
   - Which fetches from server via `websocketClient.get()`
   - Updates localStorage with server data
   - Returns merged data (server + local, with conflict resolution)
4. Component receives fresh server data

### Data Flow in Local Mode
1. Component calls `storageService.get(key)`
2. StorageService checks if in local mode
3. If local mode:
   - Tries Electron file storage first
   - Falls back to localStorage
   - Returns local data

## Testing Checklist

- [ ] Switch to server mode in Settings
- [ ] Verify products load from server (not local cache)
- [ ] Create new product on PC Utama
- [ ] Verify product appears on Laptop Dev immediately
- [ ] Check browser console for sync logs
- [ ] Verify no "loadFromLocalStorage" calls in network tab
- [ ] Test in both Packaging and GeneralTrading modules
- [ ] Test Trucking module data loading
- [ ] Verify PPIC page loads data from server
- [ ] Verify DeliveryNote loads schedule from server

## Files Modified
1. `src/pages/Packaging/PPIC.tsx` - Replaced loadFromLocalStorage with loadFromStorage
2. `src/pages/GeneralTrading/PPIC.tsx` - Replaced loadFromLocalStorage with loadFromStorage
3. `src/pages/Packaging/DeliveryNote.tsx` - Fixed schedule loading to use storageService
4. `src/services/packaging-sync.ts` - 4 locations: replaced JSON.parse(localStorage.getItem) with storageService.getConfig()
5. `src/services/gt-sync.ts` - 3 locations: replaced JSON.parse(localStorage.getItem) with storageService.getConfig()
6. `src/services/trucking-sync.ts` - 3 locations: replaced JSON.parse(localStorage.getItem) with storageService.getConfig()

## Key Insight
The issue wasn't in the storage service itself - it was working correctly. The problem was that components and services were **bypassing** the storage service by reading directly from localStorage. Now all data reads are centralized through `storageService`, which ensures:
- Server mode always fetches from PostgreSQL
- Local mode uses local storage
- Automatic background sync
- Proper conflict resolution
- No stale data issues
