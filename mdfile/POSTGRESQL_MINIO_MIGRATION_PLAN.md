# PostgreSQL + MinIO Migration Plan

**Goal**: Migrate dari JSON file storage ke PostgreSQL + MinIO dengan Go API Server

**Current**: Electron App → WebSocket/HTTPS → Node.js Express → JSON Files
**Target**: Electron App → WebSocket/HTTPS → Go API Server → PostgreSQL + MinIO

---

## 🎯 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Electron App (React + TypeScript)                   │   │
│  │  - localStorage (cache only)                         │   │
│  │  - storageService (abstraction layer)                │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│                            ▼                                 │
│              WebSocket / HTTPS (TLS 1.3)                     │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API LAYER (NEW)                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Go API Server (Gin/Fiber Framework)                 │   │
│  │  - REST API endpoints                                │   │
│  │  - WebSocket handler                                 │   │
│  │  - Authentication & Authorization                    │   │
│  │  - Rate limiting & Caching (Redis)                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│              ┌─────────────┴─────────────┐                   │
│              ▼                           ▼                   │
│  ┌────────────────────┐      ┌────────────────────┐         │
│  │   PostgreSQL       │      │      MinIO         │         │
│  │   (Structured)     │      │   (S3 Compatible)  │         │
│  └────────────────────┘      └────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Phase 1: Database Design (PostgreSQL)

### Step 1.1: Schema Design

**Core Tables** (Packaging Module):

```sql
-- Master Data
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    satuan VARCHAR(50),
    harga DECIMAL(15,2),
    pad_code VARCHAR(100),
    business_unit VARCHAR(50) DEFAULT 'packaging',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    _version BIGINT DEFAULT 1,
    _sync_status VARCHAR(20) DEFAULT 'synced'
);

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    alamat TEXT,
    telepon VARCHAR(50),
    email VARCHAR(255),
    business_unit VARCHAR(50) DEFAULT 'packaging',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    _version BIGINT DEFAULT 1
);

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode VARCHAR(50) UNIQUE NOT NULL,
    nama VARCHAR(255) NOT NULL,
    alamat TEXT,
    telepon VARCHAR(50),
    email VARCHAR(255),
    business_unit VARCHAR(50) DEFAULT 'packaging',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    _version BIGINT DEFAULT 1
);

-- Operational Data
CREATE TABLE sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    so_no VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    order_date DATE NOT NULL,
    delivery_date DATE,
    status VARCHAR(20) DEFAULT 'DRAFT',
    confirmed BOOLEAN DEFAULT FALSE,
    total_amount DECIMAL(15,2),
    items JSONB NOT NULL, -- Array of items
    notes TEXT,
    business_unit VARCHAR(50) DEFAULT 'packaging',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    _version BIGINT DEFAULT 1
);

CREATE INDEX idx_so_customer ON sales_orders(customer_id);
CREATE INDEX idx_so_status ON sales_orders(status);
CREATE INDEX idx_so_date ON sales_orders(order_date);

-- Add more tables...
```

---


### Step 1.2: Soft Delete Pattern

```sql
-- Soft delete trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW._version = OLD._version + 1;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to all tables
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### Step 1.3: Multi-tenancy (Business Units)

```sql
-- Row Level Security (RLS)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_isolation ON products
    USING (business_unit = current_setting('app.current_business_unit')::text);

-- Set business unit per session
SET app.current_business_unit = 'packaging';
```

---

## 📦 Phase 2: MinIO Setup (Blob Storage)

### Step 2.1: MinIO Buckets Structure

```
minio/
├── packaging/
│   ├── signed-documents/     # SPK signatures, DN signatures
│   ├── product-images/        # Product photos
│   ├── invoices/              # Invoice PDFs
│   └── reports/               # Generated reports
├── general-trading/
│   ├── signed-documents/
│   ├── product-images/
│   └── invoices/
└── trucking/
    ├── signed-documents/
    ├── vehicle-photos/
    └── delivery-notes/
```

### Step 2.2: MinIO Configuration

```yaml
# docker-compose.yml
services:
  minio:
    image: minio/minio:latest
    container_name: trimalaksana-minio
    ports:
      - "9000:9000"      # API
      - "9001:9001"      # Console
    environment:
      MINIO_ROOT_USER: admin
      MINIO_ROOT_PASSWORD: ${MINIO_PASSWORD}
    volumes:
      - ./minio-data:/data
    command: server /data --console-address ":9001"
    networks:
      - trimalaksana-net
```

### Step 2.3: Blob Metadata in PostgreSQL

```sql
CREATE TABLE blobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket VARCHAR(100) NOT NULL,
    object_key VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(100),
    size_bytes BIGINT,
    entity_type VARCHAR(50), -- 'spk', 'delivery_note', 'invoice', etc.
    entity_id UUID,
    business_unit VARCHAR(50),
    uploaded_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    UNIQUE(bucket, object_key)
);

CREATE INDEX idx_blobs_entity ON blobs(entity_type, entity_id);
```

---

## 🚀 Phase 3: Go API Server

### Step 3.1: Project Structure

```
go-api-server/
├── cmd/
│   └── server/
│       └── main.go
├── internal/
│   ├── api/
│   │   ├── handlers/
│   │   │   ├── products.go
│   │   │   ├── sales_orders.go
│   │   │   └── websocket.go
│   │   ├── middleware/
│   │   │   ├── auth.go
│   │   │   ├── cors.go
│   │   │   └── ratelimit.go
│   │   └── routes.go
│   ├── models/
│   │   ├── product.go
│   │   ├── sales_order.go
│   │   └── base.go
│   ├── repository/
│   │   ├── postgres/
│   │   │   ├── products.go
│   │   │   └── sales_orders.go
│   │   └── minio/
│   │       └── blobs.go
│   ├── service/
│   │   ├── products.go
│   │   ├── sales_orders.go
│   │   └── sync.go
│   └── config/
│       └── config.go
├── pkg/
│   ├── database/
│   │   └── postgres.go
│   ├── storage/
│   │   └── minio.go
│   └── websocket/
│       └── hub.go
├── migrations/
│   ├── 001_create_products.up.sql
│   ├── 001_create_products.down.sql
│   └── ...
├── go.mod
├── go.sum
└── Dockerfile
```

### Step 3.2: Core Models

```go
// internal/models/base.go
package models

import (
    "time"
    "github.com/google/uuid"
)

type BaseModel struct {
    ID           uuid.UUID  `json:"id" db:"id"`
    CreatedAt    time.Time  `json:"created_at" db:"created_at"`
    UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
    DeletedAt    *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
    Version      int64      `json:"_version" db:"_version"`
    BusinessUnit string     `json:"business_unit" db:"business_unit"`
}

// internal/models/product.go
type Product struct {
    BaseModel
    Kode     string  `json:"kode" db:"kode"`
    Nama     string  `json:"nama" db:"nama"`
    Satuan   string  `json:"satuan" db:"satuan"`
    Harga    float64 `json:"harga" db:"harga"`
    PadCode  string  `json:"padCode" db:"pad_code"`
}

// internal/models/sales_order.go
type SalesOrder struct {
    BaseModel
    SoNo         string          `json:"soNo" db:"so_no"`
    CustomerID   uuid.UUID       `json:"customerId" db:"customer_id"`
    OrderDate    time.Time       `json:"orderDate" db:"order_date"`
    DeliveryDate *time.Time      `json:"deliveryDate" db:"delivery_date"`
    Status       string          `json:"status" db:"status"`
    Confirmed    bool            `json:"confirmed" db:"confirmed"`
    TotalAmount  float64         `json:"totalAmount" db:"total_amount"`
    Items        json.RawMessage `json:"items" db:"items"`
    Notes        string          `json:"notes" db:"notes"`
}
```

### Step 3.3: Repository Pattern

```go
// internal/repository/postgres/products.go
package postgres

import (
    "context"
    "github.com/google/uuid"
    "github.com/jmoiron/sqlx"
    "trimalaksana/internal/models"
)

type ProductRepository struct {
    db *sqlx.DB
}

func NewProductRepository(db *sqlx.DB) *ProductRepository {
    return &ProductRepository{db: db}
}

func (r *ProductRepository) GetAll(ctx context.Context, businessUnit string) ([]models.Product, error) {
    var products []models.Product
    query := `
        SELECT * FROM products 
        WHERE business_unit = $1 AND deleted_at IS NULL
        ORDER BY created_at DESC
    `
    err := r.db.SelectContext(ctx, &products, query, businessUnit)
    return products, err
}

func (r *ProductRepository) GetByID(ctx context.Context, id uuid.UUID) (*models.Product, error) {
    var product models.Product
    query := `SELECT * FROM products WHERE id = $1 AND deleted_at IS NULL`
    err := r.db.GetContext(ctx, &product, query, id)
    return &product, err
}

func (r *ProductRepository) Create(ctx context.Context, product *models.Product) error {
    query := `
        INSERT INTO products (kode, nama, satuan, harga, pad_code, business_unit)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, created_at, updated_at, _version
    `
    return r.db.QueryRowContext(
        ctx, query,
        product.Kode, product.Nama, product.Satuan, 
        product.Harga, product.PadCode, product.BusinessUnit,
    ).Scan(&product.ID, &product.CreatedAt, &product.UpdatedAt, &product.Version)
}

func (r *ProductRepository) Update(ctx context.Context, product *models.Product) error {
    query := `
        UPDATE products 
        SET kode = $1, nama = $2, satuan = $3, harga = $4, pad_code = $5
        WHERE id = $6 AND deleted_at IS NULL
        RETURNING updated_at, _version
    `
    return r.db.QueryRowContext(
        ctx, query,
        product.Kode, product.Nama, product.Satuan,
        product.Harga, product.PadCode, product.ID,
    ).Scan(&product.UpdatedAt, &product.Version)
}

func (r *ProductRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
    query := `UPDATE products SET deleted_at = NOW() WHERE id = $1`
    _, err := r.db.ExecContext(ctx, query, id)
    return err
}
```

### Step 3.4: API Handlers

```go
// internal/api/handlers/products.go
package handlers

import (
    "net/http"
    "github.com/gin-gonic/gin"
    "github.com/google/uuid"
    "trimalaksana/internal/service"
)

type ProductHandler struct {
    service *service.ProductService
}

func NewProductHandler(service *service.ProductService) *ProductHandler {
    return &ProductHandler{service: service}
}

func (h *ProductHandler) GetAll(c *gin.Context) {
    businessUnit := c.GetString("business_unit")
    
    products, err := h.service.GetAll(c.Request.Context(), businessUnit)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{
        "data": products,
        "timestamp": time.Now().Unix(),
    })
}

func (h *ProductHandler) GetByID(c *gin.Context) {
    id, err := uuid.Parse(c.Param("id"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
        return
    }
    
    product, err := h.service.GetByID(c.Request.Context(), id)
    if err != nil {
        c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{"data": product})
}

func (h *ProductHandler) Create(c *gin.Context) {
    var product models.Product
    if err := c.ShouldBindJSON(&product); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    product.BusinessUnit = c.GetString("business_unit")
    
    if err := h.service.Create(c.Request.Context(), &product); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(http.StatusCreated, gin.H{"data": product})
}

func (h *ProductHandler) Update(c *gin.Context) {
    id, err := uuid.Parse(c.Param("id"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
        return
    }
    
    var product models.Product
    if err := c.ShouldBindJSON(&product); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }
    
    product.ID = id
    
    if err := h.service.Update(c.Request.Context(), &product); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{"data": product})
}

func (h *ProductHandler) Delete(c *gin.Context) {
    id, err := uuid.Parse(c.Param("id"))
    if err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid ID"})
        return
    }
    
    if err := h.service.Delete(c.Request.Context(), id); err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(http.StatusOK, gin.H{"message": "Product deleted"})
}
```

### Step 3.5: WebSocket Handler

```go
// pkg/websocket/hub.go
package websocket

import (
    "sync"
    "github.com/gorilla/websocket"
)

type Hub struct {
    clients    map[*Client]bool
    broadcast  chan []byte
    register   chan *Client
    unregister chan *Client
    mu         sync.RWMutex
}

func NewHub() *Hub {
    return &Hub{
        clients:    make(map[*Client]bool),
        broadcast:  make(chan []byte, 256),
        register:   make(chan *Client),
        unregister: make(chan *Client),
    }
}

func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            h.mu.Lock()
            h.clients[client] = true
            h.mu.Unlock()
            
        case client := <-h.unregister:
            h.mu.Lock()
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                close(client.send)
            }
            h.mu.Unlock()
            
        case message := <-h.broadcast:
            h.mu.RLock()
            for client := range h.clients {
                select {
                case client.send <- message:
                default:
                    close(client.send)
                    delete(h.clients, client)
                }
            }
            h.mu.RUnlock()
        }
    }
}

func (h *Hub) BroadcastChange(entityType string, action string, data interface{}) {
    message := map[string]interface{}{
        "type":   "storage-changed",
        "entity": entityType,
        "action": action,
        "data":   data,
        "timestamp": time.Now().Unix(),
    }
    
    jsonData, _ := json.Marshal(message)
    h.broadcast <- jsonData
}
```

---

## 🔄 Phase 4: Migration Strategy

### Step 4.1: Data Migration Script

```go
// cmd/migrate/main.go
package main

import (
    "encoding/json"
    "io/ioutil"
    "log"
)

func migrateProducts() error {
    // Read JSON file
    data, err := ioutil.ReadFile("data/localStorage/products.json")
    if err != nil {
        return err
    }
    
    var jsonData struct {
        Value []map[string]interface{} `json:"value"`
    }
    
    if err := json.Unmarshal(data, &jsonData); err != nil {
        return err
    }
    
    // Insert to PostgreSQL
    for _, item := range jsonData.Value {
        product := models.Product{
            Kode:         item["kode"].(string),
            Nama:         item["nama"].(string),
            Satuan:       item["satuan"].(string),
            Harga:        item["harga"].(float64),
            PadCode:      item["padCode"].(string),
            BusinessUnit: "packaging",
        }
        
        if err := productRepo.Create(ctx, &product); err != nil {
            log.Printf("Error migrating product %s: %v", product.Kode, err)
        }
    }
    
    return nil
}
```

### Step 4.2: Dual-Write Period

```typescript
// Client-side: Write to both old and new system
async function saveProduct(product: Product) {
    // 1. Write to new PostgreSQL API
    try {
        await fetch('/api/v2/products', {
            method: 'POST',
            body: JSON.stringify(product)
        });
    } catch (error) {
        console.error('Failed to write to new API:', error);
    }
    
    // 2. Write to old JSON system (fallback)
    await storageService.set('products', product);
}
```

---

## 📅 Rollout Timeline

### Week 1-2: Setup Infrastructure
- [ ] Setup PostgreSQL container
- [ ] Setup MinIO container
- [ ] Design database schema
- [ ] Create migrations

### Week 3-4: Build Go API
- [ ] Setup Go project structure
- [ ] Implement repository layer
- [ ] Implement service layer
- [ ] Implement API handlers
- [ ] Add WebSocket support

### Week 5-6: Data Migration
- [ ] Write migration scripts
- [ ] Test migration with sample data
- [ ] Migrate master data (products, customers, suppliers)
- [ ] Migrate operational data

### Week 7-8: Client Integration
- [ ] Update storageService to support dual-write
- [ ] Test CRUD operations
- [ ] Test sync mechanism
- [ ] Performance testing

### Week 9-10: Cutover
- [ ] Switch to PostgreSQL as primary
- [ ] Monitor for issues
- [ ] Disable old JSON system
- [ ] Cleanup

---

## 🎯 Benefits

✅ **Performance**: PostgreSQL queries faster than JSON parsing
✅ **Scalability**: Handle millions of records
✅ **ACID**: Transaction support
✅ **Relationships**: Foreign keys & joins
✅ **Full-text search**: Built-in search capabilities
✅ **Backup**: Point-in-time recovery
✅ **Blob storage**: Efficient file handling with MinIO
✅ **S3 Compatible**: Easy migration to AWS S3 later

---

**Next Steps**: 
1. Finalize storage keys centralization (current task)
2. Setup PostgreSQL + MinIO containers
3. Start Go API development
