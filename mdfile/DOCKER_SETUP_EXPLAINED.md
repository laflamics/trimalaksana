# Docker Setup Explained

## Current Configuration (docker-compose-migration.yml)

### 4 Services Running

#### 1. **storage-server** (Node.js)
```yaml
storage-server:
  build: .                          # Build from Dockerfile in docker/
  ports:
    - "0.0.0.0:8888:8888"          # Main API port
    - "0.0.0.0:8080:8888"          # Alternate port (same as 8888)
  volumes:
    - ../data:/app/data             # Mount data folder
    - ../updates:/app/updates       # Mount updates folder
  environment:
    - PORT=8888
    - NODE_ENV=production
  restart: unless-stopped           # Auto-restart if crashes
  network_mode: bridge              # Use bridge network
  depends_on:
    - postgres                      # Wait for PostgreSQL
    - minio                         # Wait for MinIO
```

**What it does:**
- Runs Node.js server (server.js)
- Handles API requests: `/api/storage/*`
- Handles WebSocket: `/ws`
- Stores data in PostgreSQL
- Stores files in MinIO

**Ports:**
- `8888` - Main API & WebSocket
- `8080` - Alternate (same as 8888)

---

#### 2. **postgres** (PostgreSQL Database)
```yaml
postgres:
  image: postgres:15-alpine         # Lightweight PostgreSQL
  container_name: trimalaksana-postgres
  environment:
    POSTGRES_USER: trimalaksana
    POSTGRES_PASSWORD: trimalaksana123
    POSTGRES_DB: trimalaksana_db
  ports:
    - "5432:5432"                   # PostgreSQL port
  volumes:
    - postgres_data:/var/lib/postgresql/data  # Persistent data
    - ./init-db.sql:/docker-entrypoint-initdb.d/init-db.sql  # Init script
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U trimalaksana"]
    interval: 10s
    timeout: 5s
    retries: 5
  restart: unless-stopped
```

**What it does:**
- Stores all application data
- Database name: `trimalaksana_db`
- User: `trimalaksana`
- Password: `trimalaksana123`

**Ports:**
- `5432` - PostgreSQL connection

**Access:**
- From Node.js: `postgres:5432` (internal Docker network)
- From laptop: `10.1.1.35:5432` (external)

---

#### 3. **minio** (S3-Compatible Storage)
```yaml
minio:
  image: minio/minio:latest
  container_name: trimalaksana-minio
  environment:
    MINIO_ROOT_USER: minioadmin
    MINIO_ROOT_PASSWORD: minioadmin123
  ports:
    - "9000:9000"                   # API port
    - "9001:9001"                   # Console port
  volumes:
    - minio_data:/minio_data        # Persistent storage
  command: server /minio_data --console-address ":9001"
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
    interval: 10s
    timeout: 5s
    retries: 5
  restart: unless-stopped
```

**What it does:**
- Stores files (images, PDFs, etc.)
- S3-compatible API
- Web console for management

**Ports:**
- `9000` - API (for uploads/downloads)
- `9001` - Console (web UI)

**Access:**
- API: `http://10.1.1.35:9000`
- Console: `http://10.1.1.35:9001`
- Credentials: `minioadmin` / `minioadmin123`

---

#### 4. **pgadmin** (PostgreSQL Management UI)
```yaml
pgadmin:
  image: dpage/pgadmin4:latest
  container_name: trimalaksana-pgadmin
  environment:
    PGADMIN_DEFAULT_EMAIL: admin@trimalaksana.com
    PGADMIN_DEFAULT_PASSWORD: admin123
  ports:
    - "5051:80"                     # Web UI port
  depends_on:
    - postgres                      # Wait for PostgreSQL
  restart: unless-stopped
```

**What it does:**
- Web UI for managing PostgreSQL
- View/edit database tables
- Run SQL queries

**Ports:**
- `5051` - Web UI

**Access:**
- URL: `http://10.1.1.35:5051`
- Email: `admin@trimalaksana.com`
- Password: `admin123`

---

## How They Connect

```
┌─────────────────────────────────────────────────────────┐
│ Docker Network (bridge)                                 │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │ storage-     │  │ postgres     │  │ minio        │ │
│  │ server       │──│ :5432        │  │ :9000/9001   │ │
│  │ :8888        │  │              │  │              │ │
│  │              │  └──────────────┘  └──────────────┘ │
│  │ (Node.js)    │                                      │
│  │              │  ┌──────────────┐                    │
│  │              │  │ pgadmin      │                    │
│  │              │──│ :80          │                    │
│  │              │  │              │                    │
│  └──────────────┘  └──────────────┘                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
         ↑
         │ (Tailscale Funnel)
         │ wss://server-tljp.tail75a421.ts.net
         │
    Laptop Dev (Linux)
```

---

## Data Flow

### 1. **Add New Product** (Laptop Dev)
```
Laptop Dev
  ↓ (wss://)
Tailscale Funnel
  ↓
PC Utama (storage-server:8888)
  ↓ (POST /api/storage/products)
Node.js (server.js)
  ↓
PostgreSQL (trimalaksana_db)
  ↓
Save to: data/localStorage/products.json
```

### 2. **Get Products** (Laptop Dev)
```
Laptop Dev
  ↓ (wss://)
Tailscale Funnel
  ↓
PC Utama (storage-server:8888)
  ↓ (GET /api/storage/products)
Node.js (server.js)
  ↓
PostgreSQL (trimalaksana_db)
  ↓
Return data to Laptop Dev
```

### 3. **Upload File** (Laptop Dev)
```
Laptop Dev
  ↓ (POST /api/blob/upload)
Tailscale Funnel
  ↓
PC Utama (storage-server:8888)
  ↓
MinIO (minio:9000)
  ↓
Save to: minio_data/
```

---

## Volumes (Persistent Data)

### Named Volumes
```yaml
volumes:
  postgres_data:    # PostgreSQL database files
  minio_data:       # MinIO storage files
```

**Location on PC Utama:**
- `postgres_data` → Docker volume (managed by Docker)
- `minio_data` → Docker volume (managed by Docker)

### Bind Mounts
```yaml
volumes:
  - ../data:/app/data              # data/ folder → /app/data in container
  - ../updates:/app/updates        # updates/ folder → /app/updates in container
```

**Location on PC Utama:**
- `D:\trimalaksanaapps\possgresql\data` → `/app/data` in container
- `D:\trimalaksanaapps\possgresql\updates` → `/app/updates` in container

---

## Environment Variables

### PostgreSQL
```
POSTGRES_USER: trimalaksana
POSTGRES_PASSWORD: trimalaksana123
POSTGRES_DB: trimalaksana_db
```

### MinIO
```
MINIO_ROOT_USER: minioadmin
MINIO_ROOT_PASSWORD: minioadmin123
```

### pgAdmin
```
PGADMIN_DEFAULT_EMAIL: admin@trimalaksana.com
PGADMIN_DEFAULT_PASSWORD: admin123
```

### Node.js
```
PORT: 8888
NODE_ENV: production
```

---

## Startup Order

1. **PostgreSQL starts first** (no dependencies)
2. **MinIO starts** (no dependencies)
3. **pgAdmin starts** (depends_on: postgres)
4. **storage-server starts** (depends_on: postgres, minio)

---

## Health Checks

### PostgreSQL
```
Command: pg_isready -U trimalaksana
Interval: 10s
Timeout: 5s
Retries: 5
```

### MinIO
```
Command: curl -f http://localhost:9000/minio/health/live
Interval: 10s
Timeout: 5s
Retries: 5
```

---

## Restart Policy

All services have:
```yaml
restart: unless-stopped
```

**Meaning:**
- Auto-restart if container crashes
- Don't restart if manually stopped
- Restart on PC reboot

---

## How to Start

```bash
cd D:\trimalaksanaapps\possgresql\docker
docker-compose -f docker-compose-migration.yml up -d
```

## How to Stop

```bash
docker-compose -f docker-compose-migration.yml down
```

## How to View Logs

```bash
# All services
docker-compose -f docker-compose-migration.yml logs

# Specific service
docker-compose -f docker-compose-migration.yml logs storage-server
docker-compose -f docker-compose-migration.yml logs postgres
docker-compose -f docker-compose-migration.yml logs minio
docker-compose -f docker-compose-migration.yml logs pgadmin
```

---

## Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| Node.js API | http://10.1.1.35:8888 | - |
| Node.js Health | http://10.1.1.35:8888/health | - |
| PostgreSQL | 10.1.1.35:5432 | trimalaksana / trimalaksana123 |
| MinIO API | http://10.1.1.35:9000 | minioadmin / minioadmin123 |
| MinIO Console | http://10.1.1.35:9001 | minioadmin / minioadmin123 |
| pgAdmin | http://10.1.1.35:5051 | admin@trimalaksana.com / admin123 |
| Tailscale | wss://server-tljp.tail75a421.ts.net | - |

---

## Fresh Setup Checklist

- [ ] All 4 containers running: `docker ps`
- [ ] PostgreSQL healthy: `docker-compose logs postgres`
- [ ] MinIO healthy: `docker-compose logs minio`
- [ ] Node.js responding: `curl http://10.1.1.35:8888/health`
- [ ] pgAdmin accessible: http://10.1.1.35:5051
- [ ] MinIO console accessible: http://10.1.1.35:9001
- [ ] Tailscale endpoint working: `curl https://server-tljp.tail75a421.ts.net/health`
- [ ] Old auto-start disabled
- [ ] Browser cache cleared
- [ ] Can add new product and persist

---

**Status**: Setup complete and ready for testing ✅
