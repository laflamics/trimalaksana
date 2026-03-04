# Frontend + Backend Integration Guide

## ✅ Status

- **Frontend**: 100% ready (StorageKeys centralized)
- **Backend**: 100% ready (Node.js server with all endpoints)
- **Integration**: Ready to connect

---

## 🔌 Quick Integration (5 Minutes)

### Step 1: Create API Service

Create `src/services/api-client.ts`:

```typescript
import { StorageKeys } from './storage';

interface ApiResponse<T> {
  success?: boolean;
  value?: T;
  data?: T;
  error?: string;
  timestamp?: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8888') {
    this.baseUrl = baseUrl;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/storage/${encodeURIComponent(key)}`);
      const data: ApiResponse<T> = await response.json();
      return data.value || data.data || null;
    } catch (error) {
      console.error(`Error fetching ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/storage/${encodeURIComponent(key)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value, timestamp: Date.now() }),
      });
      const data: ApiResponse<any> = await response.json();
      return data.success !== false;
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      return false;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/storage/${encodeURIComponent(key)}`, {
        method: 'DELETE',
      });
      const data: ApiResponse<any> = await response.json();
      return data.success !== false;
    } catch (error) {
      console.error(`Error deleting ${key}:`, error);
      return false;
    }
  }

  async uploadFile(file: File, business: string = 'packaging'): Promise<string | null> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('business', business);

      const response = await fetch(`${this.baseUrl}/api/blob/upload?business=${business}`, {
        method: 'POST',
        body: formData,
      });

      const data: any = await response.json();
      return data.fileId || null;
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    }
  }

  async downloadFile(fileId: string, business: string = 'packaging'): Promise<Blob | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/blob/download/${business}/${fileId}`);
      return response.blob();
    } catch (error) {
      console.error('Error downloading file:', error);
      return null;
    }
  }

  async health(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient();
```

### Step 2: Update Storage Service

Update `src/services/storage.ts`:

```typescript
import { apiClient } from './api-client';

class StorageService {
  private useApi = true; // Enable API by default

  async get<T>(key: string): Promise<T | null> {
    // Try API first
    if (this.useApi) {
      try {
        const data = await apiClient.get<T>(key);
        if (data !== null) {
          // Also save to localStorage as backup
          localStorage.setItem(key, JSON.stringify(data));
          return data;
        }
      } catch (error) {
        console.warn(`API get failed for ${key}, using localStorage:`, error);
      }
    }

    // Fallback to localStorage
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, immediateSync?: boolean): Promise<void> {
    // Save to localStorage first (immediate)
    localStorage.setItem(key, JSON.stringify(value));

    // Then sync to API (async)
    if (this.useApi) {
      try {
        await apiClient.set(key, value);
      } catch (error) {
        console.warn(`API set failed for ${key}:`, error);
        // Data is still in localStorage, so it's safe
      }
    }
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(key);

    if (this.useApi) {
      try {
        await apiClient.delete(key);
      } catch (error) {
        console.warn(`API delete failed for ${key}:`, error);
      }
    }
  }

  // ... rest of methods
}

export const storageService = new StorageService();
```

### Step 3: Test Integration

```bash
# 1. Make sure server is running
docker-compose ps

# 2. Test health check
curl http://localhost:8888/health

# 3. Test storage
curl -X POST http://localhost:8888/api/storage/test \
  -H "Content-Type: application/json" \
  -d '{"value": [{"id": "1", "name": "Test"}], "timestamp": 1234567890}'

# 4. Retrieve data
curl http://localhost:8888/api/storage/test
```

---

## 🎯 Integration Points

### 1. Storage Operations
```typescript
// Get data
const products = await storageService.get(StorageKeys.PACKAGING.PRODUCTS);

// Save data
await storageService.set(StorageKeys.PACKAGING.PRODUCTS, products);

// Delete data
await storageService.delete(StorageKeys.PACKAGING.PRODUCTS);
```

### 2. File Upload
```typescript
// Upload file
const fileId = await apiClient.uploadFile(file, 'packaging');

// Save file reference
await storageService.set(StorageKeys.PACKAGING.DELIVERY_NOTES, {
  ...deliveryNote,
  signedDocumentId: fileId
});
```

### 3. File Download
```typescript
// Get file reference
const deliveryNote = await storageService.get(StorageKeys.PACKAGING.DELIVERY_NOTES);

// Download file
const blob = await apiClient.downloadFile(deliveryNote.signedDocumentId, 'packaging');
```

---

## 🔄 Sync Strategy

### Offline-First Approach
1. **Write to localStorage immediately** (instant feedback)
2. **Sync to server asynchronously** (background)
3. **Fallback to localStorage if server unavailable**

### Conflict Resolution
- Server uses **last-write-wins** strategy
- Timestamps are tracked automatically
- Merge happens on bulk sync

### Incremental Sync
```typescript
// Get only changes since last sync
const since = localStorage.getItem('lastSyncTime') || '0';
const response = await fetch(`/api/storage/all?since=${since}`);
```

---

## 🚀 Deployment Checklist

### Local Development
- [ ] Server running on `http://localhost:8888`
- [ ] Frontend running on `http://localhost:5173`
- [ ] CORS enabled (already configured)
- [ ] Test endpoints working

### Production
- [ ] Update API URL in `api-client.ts`
- [ ] Enable HTTPS
- [ ] Add authentication
- [ ] Add rate limiting
- [ ] Set up monitoring

---

## 📊 Performance Tips

### 1. Batch Operations
```typescript
// Instead of multiple saves
for (const item of items) {
  await storageService.set(key, item);
}

// Do bulk save
await storageService.set(key, items);
```

### 2. Lazy Loading
```typescript
// Load data only when needed
const products = await storageService.get(StorageKeys.PACKAGING.PRODUCTS);
if (!products) {
  // Fetch from server or seed
}
```

### 3. Caching
```typescript
// Cache frequently accessed data
const cache = new Map();

async function getCachedData(key) {
  if (cache.has(key)) {
    return cache.get(key);
  }
  const data = await storageService.get(key);
  cache.set(key, data);
  return data;
}
```

---

## 🔒 Security Considerations

### Current Setup
- ✅ CORS configured
- ✅ File path validation
- ✅ Content-type detection

### To Add
- [ ] JWT authentication
- [ ] API key validation
- [ ] Rate limiting
- [ ] Input validation
- [ ] HTTPS in production

---

## 🐛 Troubleshooting

### Server Not Responding
```bash
# Check if server is running
curl http://localhost:8888/health

# Check logs
docker-compose logs -f storage-server

# Restart server
docker-compose restart storage-server
```

### CORS Errors
```typescript
// Already configured in server, but if issues:
// Update CORS in docker/server.js line ~80
app.use(cors({
  origin: '*', // or specific domain
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

### Data Not Syncing
```typescript
// Check if API is enabled
const useApi = true; // in StorageService

// Check network tab in browser DevTools
// Look for failed requests to /api/storage/*
```

---

## 📈 Monitoring

### Health Check
```bash
# Check server status
curl http://localhost:8888/health

# Response includes:
# - status: ok
# - uptime: seconds
# - memory: usage info
# - endpoints: available routes
```

### Logs
```bash
# View real-time logs
docker-compose logs -f storage-server

# View last 100 lines
docker-compose logs --tail=100 storage-server
```

---

## 🎓 Next Steps

1. **Implement API Client** (5 minutes)
2. **Update Storage Service** (10 minutes)
3. **Test Integration** (15 minutes)
4. **Deploy to Production** (varies)

**Total: ~30 minutes to full integration**

---

## 📞 Support

If you encounter issues:

1. Check server logs: `docker-compose logs -f storage-server`
2. Test endpoint: `curl http://localhost:8888/health`
3. Check network tab in browser DevTools
4. Verify API URL in `api-client.ts`
5. Check CORS configuration in `docker/server.js`

---

## ✅ Success Criteria

- [ ] Frontend loads without errors
- [ ] Data saves to server
- [ ] Data loads from server
- [ ] Files upload successfully
- [ ] Files download successfully
- [ ] Offline mode works (localStorage fallback)
- [ ] Sync works when online
- [ ] No CORS errors in console
- [ ] Health check returns 200

**Once all checked: You're ready for production!** 🚀
