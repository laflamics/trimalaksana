# Laptop Dev Setup (Linux)

## 🚀 Quick Start

### Step 1: Get PC Utama IP

Ask the person at PC Utama to run:
```powershell
ipconfig
```

Look for "IPv4 Address", e.g., `192.168.1.100`

### Step 2: Update API Endpoint

Edit: `src/services/api-client.ts`

```typescript
// Replace with PC Utama IP
const API_BASE_URL = 'http://192.168.1.100:8888';
```

### Step 3: Start Frontend

```bash
npm run dev
```

Open browser: http://localhost:5173

### Step 4: Test Connection

```bash
# Test API
curl http://192.168.1.100:8888/health

# Should return: {"status":"ok",...}
```

---

## 🔍 Verify Everything Works

### Check DevTools (F12)

1. Open http://localhost:5173
2. Press F12 (DevTools)
3. Go to Network tab
4. Try to load data
5. Should see API calls to `192.168.1.100:8888`

### Check Console (F12)

1. Press F12
2. Go to Console tab
3. Should have no errors

### Test File Upload

1. Try to upload a file
2. Should succeed without errors

---

## 🔑 Credentials (for reference)

| Service | Port | User | Password |
|---------|------|------|----------|
| PostgreSQL | 5432 | trimalaksana | trimalaksana123 |
| MinIO | 9000 | minioadmin | minioadmin123 |
| pgAdmin | 5050 | admin@trimalaksana.local | admin123 |
| Node.js | 8888 | - | - |

---

## 🆘 Troubleshooting

### Can't reach PC Utama

```bash
# Check IP address
ping 192.168.1.100

# Test port
curl http://192.168.1.100:8888/health

# Check firewall on PC Utama
# Make sure port 8888 is open
```

### API returns 404

- Check API endpoint in `src/services/api-client.ts`
- Make sure it's correct IP:port

### Data not loading

1. Open DevTools (F12)
2. Go to Network tab
3. Look for API calls
4. Check if they're going to correct IP
5. Check response status

### CORS error

- This shouldn't happen, but if it does:
- Check Node.js server logs on PC Utama
- Restart Node.js server

---

## 📊 Architecture

```
Laptop Dev (Linux)
    ↓ HTTP (Port 8888)
PC Utama (Windows)
    ├─→ PostgreSQL (5432)
    ├─→ MinIO (9000/9001)
    └─→ pgAdmin (5050)
```

---

## 📝 Commands

### Start Frontend
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Test API Connection
```bash
curl http://192.168.1.100:8888/health
```

### View Network Requests
- DevTools → Network tab (F12)

### View Console Errors
- DevTools → Console tab (F12)

---

## ✅ Verification Checklist

- [ ] PC Utama services running
- [ ] API endpoint updated in code
- [ ] Frontend starts without errors
- [ ] Can reach PC Utama: `curl http://192.168.1.100:8888/health`
- [ ] Data loads in frontend
- [ ] No errors in DevTools console
- [ ] File upload works

---

## 🎯 Next Steps

1. ✅ Update API endpoint
2. ✅ Start frontend
3. ✅ Test connection
4. ✅ Verify data loading
5. ✅ Test file upload

---

**Status**: Ready to connect! 🚀

