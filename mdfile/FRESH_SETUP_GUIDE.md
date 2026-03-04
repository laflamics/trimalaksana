# Fresh Setup Guide - PostgreSQL + MinIO Only

## Quick Start (Windows PC Utama)

### Step 1: Cleanup Old Setup
```bash
cd docker
cleanup-fresh.bat
```

This removes:
- All old containers
- All volumes and data
- Old images
- Local data folders

### Step 2: Fresh Setup
```bash
fresh-setup.bat
```

This:
1. Builds fresh Docker images
2. Starts PostgreSQL, MinIO, pgAdmin, Storage Server
3. Initializes database with schema
4. Creates MinIO buckets
5. Tests health endpoint
6. Shows access information

### Step 3: Verify Services

**PostgreSQL:**
- Open pgAdmin: http://localhost:5051
- Login: admin@trimalaksana.com / admin123
- Check `storage` table (should be empty)

**MinIO:**
- Open MinIO Console: http://localhost:9001
- Login: minioadmin / minioadmin123
- Check buckets created:
  - trimalaksana-packaging
  - trimalaksana-general-trading
  - trimalaksana-trucking

**Storage Server:**
```bash
curl http://localhost:9999/health
```

Should return:
```json
{
  "status": "ok",
  "database": "connected",
  "storage": "connected"
}
```

## Architecture

```
┌─────────────────────────────────────────┐
│         Docker Network                  │
│  (trimalaksana-network)                 │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐  ┌──────────────┐   │
│  │ PostgreSQL   │  │   MinIO      │   │
│  │ :5432        │  │   :9000      │   │
│  │              │  │   :9001      │   │
│  └──────────────┘  └──────────────┘   │
│         ▲                  ▲            │
│         │                  │            │
│  ┌──────────────────────────────────┐  │
│  │  Storage Server (Node.js)        │  │
│  │  :8888 (internal)                │  │
│  │  :9999 (external)                │  │
│  └──────────────────────────────────┘  │
│         ▲                                │
│         │                                │
│  ┌──────────────┐                       │
│  │  pgAdmin     │                       │
│  │  :5051       │                       │
│  └──────────────┘                       │
│                                         │
└─────────────────────────────────────────┘
         ▲
         │ (External Access)
         │
    ┌────────────┐
    │ Laptop Dev │
    │ Browser    │
    └────────────┘
```

## Data Flow

### Write (Laptop Dev → Server)
1. User creates/edits data in app
2. `storageService.set()` called
3. In server mode: POST to `http://localhost:9999/api/storage/{key}`
4. Server saves to PostgreSQL
5. Data persisted ✅

### Read (Server → Laptop Dev)
1. App loads page
2. `storageService.get()` called
3. In server mode: GET from `http://localhost:9999/api/storage/{key}`
4. Server fetches from PostgreSQL
5. Data displayed ✅

### Initial Sync (App Start)
1. App detects server mode
2. `pushLocalDataToServer()` - POST all localStorage to server
3. `syncFromServer()` - GET latest from server
4. Merge local + server data
5. All data now in PostgreSQL ✅

## Ports

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Database |
| MinIO API | 9000 | Object storage API |
| MinIO Console | 9001 | MinIO web UI |
| pgAdmin | 5051 | Database management |
| Storage Server | 9999 | App API (external) |
| Storage Server | 8888 | App API (internal) |

## Environment Variables

Server uses these from docker-compose.yml:
```
DB_USER=trimalaksana
DB_PASSWORD=trimalaksana123
DB_HOST=postgres
DB_PORT=5432
DB_NAME=trimalaksana_db
MINIO_ENDPOINT=http://minio:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
```

## Troubleshooting

### Services won't start
```bash
docker-compose -f docker-compose.yml logs
```

### PostgreSQL connection error
```bash
docker logs trimalaksana-postgres
```

### MinIO not ready
```bash
docker logs trimalaksana-minio
```

### Storage server error
```bash
docker logs docker-storage-server-1
```

### Reset everything
```bash
cleanup-fresh.bat
fresh-setup.bat
```

## Laptop Dev Configuration

In Settings:
- Server URL: `http://localhost:9999` (or Tailscale URL)
- WebSocket: Enabled
- Business: Packaging/GeneralTrading/Trucking

## Tailscale Setup

On PC Utama:
```bash
tailscale funnel --bg 9999
```

On Laptop Dev:
- Server URL: `https://server-tljp.tail75a421.ts.net` (your Tailscale URL)
- WebSocket: Enabled

## Success Indicators

✅ PostgreSQL connected
✅ MinIO connected
✅ Storage server running
✅ Data syncs to PostgreSQL
✅ Data appears on other devices
✅ No localStorage fallback
✅ Fresh data on app restart
