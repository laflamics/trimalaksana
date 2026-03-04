# PostgreSQL + MinIO Setup Guide

## Overview
Migrate from JSON file storage to PostgreSQL + MinIO with Go API Server for production-grade data persistence and blob storage.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                            │
│              (Packaging, General Trading, Trucking)          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Go API Server                               │
│  (REST API + WebSocket for real-time sync)                  │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│   PostgreSQL     │      │     MinIO        │
│   (Structured    │      │  (Blob Storage)  │
│    Data)         │      │  (Documents,     │
│                  │      │   Images, PDFs)  │
└──────────────────┘      └──────────────────┘
```

## Phase 1: Database Setup (Week 1-2)

### 1.1 PostgreSQL Installation

**Option A: Docker (Recommended)**
```bash
docker run --name trimalaksana-postgres \
  -e POSTGRES_USER=trimalaksana \
  -e POSTGRES_PASSWORD=your_secure_password \
  -e POSTGRES_DB=trimalaksana_db \
  -p 5432:5432 \
  -v postgres_data:/var/lib/postgresql/data \
  -d postgres:15-alpine
```

**Option B: Local Installation**
```bash
# macOS
brew install postgresql@15

# Ubuntu/Debian
sudo apt-get install postgresql-15

# Windows
# Download from https://www.postgresql.org/download/windows/
```

### 1.2 Database Schema Creation

Create `scripts/init-postgresql.sql`:

```sql
-- Create databases
CREATE DATABASE trimalaksana_db;
CREATE DATABASE trimalaksana_test;

-- Connect to main database
\c trimalaksana_db;

-- ============================================
-- PACKAGING MODULE TABLES
-- ============================================

-- Products
CREATE TABLE packaging_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  unit VARCHAR(20),
  price DECIMAL(15, 2),
  stock INT DEFAULT 0,
  reorder_level INT,
  supplier_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_category (category)
);

-- Customers
CREATE TABLE packaging_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  address TEXT,
  city VARCHAR(100),
  province VARCHAR(100),
  postal_code VARCHAR(10),
  country VARCHAR(100),
  tax_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  INDEX idx_code (code),
  INDEX idx_name (name)
);

-- Sales Orders
CREATE TABLE packaging_sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  so_no VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES packaging_customers(id),
  order_date DATE NOT NULL,
  delivery_date DATE,
  status VARCHAR(20) DEFAULT 'DRAFT',
  total DECIMAL(15, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  INDEX idx_so_no (so_no),
  INDEX idx_customer_id (customer_id),
  INDEX idx_status (status)
);

-- Sales Order Items
CREATE TABLE packaging_sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  so_id UUID NOT NULL REFERENCES packaging_sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES packaging_products(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(15, 2),
  subtotal DECIMAL(15, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_so_id (so_id),
  INDEX idx_product_id (product_id)
);

-- Invoices
CREATE TABLE packaging_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no VARCHAR(50) UNIQUE NOT NULL,
  so_id UUID REFERENCES packaging_sales_orders(id),
  customer_id UUID NOT NULL REFERENCES packaging_customers(id),
  invoice_date DATE NOT NULL,
  due_date DATE,
  total DECIMAL(15, 2),
  tax DECIMAL(15, 2),
  status VARCHAR(20) DEFAULT 'DRAFT',
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  INDEX idx_invoice_no (invoice_no),
  INDEX idx_customer_id (customer_id),
  INDEX idx_status (status)
);

-- Delivery Notes
CREATE TABLE packaging_delivery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sj_no VARCHAR(50) UNIQUE NOT NULL,
  so_id UUID REFERENCES packaging_sales_orders(id),
  customer_id UUID NOT NULL REFERENCES packaging_customers(id),
  delivery_date DATE NOT NULL,
  driver VARCHAR(100),
  vehicle_no VARCHAR(20),
  status VARCHAR(20) DEFAULT 'DRAFT',
  signed_document_id UUID,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  INDEX idx_sj_no (sj_no),
  INDEX idx_customer_id (customer_id),
  INDEX idx_status (status)
);

-- Journal Entries (Finance)
CREATE TABLE packaging_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date DATE NOT NULL,
  reference VARCHAR(100),
  account_code VARCHAR(20) NOT NULL,
  account_name VARCHAR(100),
  debit DECIMAL(15, 2) DEFAULT 0,
  credit DECIMAL(15, 2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  INDEX idx_entry_date (entry_date),
  INDEX idx_account_code (account_code)
);

-- ============================================
-- GENERAL TRADING MODULE TABLES
-- ============================================

CREATE TABLE gt_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  unit VARCHAR(20),
  price DECIMAL(15, 2),
  stock INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  INDEX idx_code (code)
);

CREATE TABLE gt_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  INDEX idx_code (code)
);

-- ============================================
-- TRUCKING MODULE TABLES
-- ============================================

CREATE TABLE trucking_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_no VARCHAR(50) UNIQUE NOT NULL,
  origin VARCHAR(255),
  destination VARCHAR(255),
  status VARCHAR(20) DEFAULT 'DRAFT',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP,
  INDEX idx_shipment_no (shipment_no),
  INDEX idx_status (status)
);

-- ============================================
-- BLOB STORAGE METADATA TABLE
-- ============================================

CREATE TABLE blob_storage_metadata (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id VARCHAR(255) UNIQUE NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  bucket_name VARCHAR(100),
  object_key VARCHAR(500),
  module VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id UUID,
  uploaded_by VARCHAR(100),
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  deleted_at TIMESTAMP,
  INDEX idx_file_id (file_id),
  INDEX idx_entity_id (entity_id),
  INDEX idx_module (module)
);

-- ============================================
-- ACTIVITY LOGS TABLE
-- ============================================

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100),
  action VARCHAR(50),
  module VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id UUID,
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_module (module),
  INDEX idx_created_at (created_at)
);

-- Create indexes for performance
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_blob_storage_expires ON blob_storage_metadata(expires_at);
```

Run the script:
```bash
psql -U trimalaksana -d trimalaksana_db -f scripts/init-postgresql.sql
```

## Phase 2: MinIO Setup (Week 2)

### 2.1 MinIO Installation

**Option A: Docker (Recommended)**
```bash
docker run --name trimalaksana-minio \
  -e MINIO_ROOT_USER=minioadmin \
  -e MINIO_ROOT_PASSWORD=your_secure_password \
  -p 9000:9000 \
  -p 9001:9001 \
  -v minio_data:/minio_data \
  -d minio/minio:latest \
  server /minio_data --console-address ":9001"
```

**Option B: Local Installation**
```bash
# macOS
brew install minio/stable/minio

# Ubuntu/Debian
wget https://dl.min.io/server/minio/release/linux-amd64/minio
chmod +x minio
./minio server /mnt/data
```

### 2.2 MinIO Bucket Setup

```bash
# Access MinIO console at http://localhost:9001
# Login with minioadmin / your_secure_password

# Create buckets via CLI or console:
mc alias set minio http://localhost:9000 minioadmin your_secure_password

# Create buckets
mc mb minio/packaging-documents
mc mb minio/packaging-images
mc mb minio/general-trading-documents
mc mb minio/trucking-documents

# Set bucket policies (public read for images)
mc policy set public minio/packaging-images
mc policy set private minio/packaging-documents
```

## Phase 3: Go API Server (Week 3-4)

### 3.1 Go Server Structure

Create `api/server/main.go`:

```go
package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

type Server struct {
	db    *sqlx.DB
	minio *minio.Client
	hub   *WebSocketHub
}

type WebSocketHub struct {
	clients    map[*Client]bool
	broadcast  chan interface{}
	register   chan *Client
	unregister chan *Client
}

type Client struct {
	hub  *WebSocketHub
	conn *websocket.Conn
	send chan interface{}
}

func main() {
	// Database connection
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
	)

	db, err := sqlx.Connect("postgres", dsn)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// MinIO connection
	minioClient, err := minio.New(os.Getenv("MINIO_ENDPOINT"), &minio.Options{
		Creds: credentials.NewStaticV4(
			os.Getenv("MINIO_ACCESS_KEY"),
			os.Getenv("MINIO_SECRET_KEY"),
			"",
		),
		Secure: false,
	})
	if err != nil {
		log.Fatalf("Failed to connect to MinIO: %v", err)
	}

	// Initialize server
	hub := &WebSocketHub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan interface{}),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}

	server := &Server{
		db:    db,
		minio: minioClient,
		hub:   hub,
	}

	// Start WebSocket hub
	go hub.run()

	// Setup routes
	router := mux.NewRouter()

	// Packaging routes
	router.HandleFunc("/api/packaging/products", server.getProducts).Methods("GET")
	router.HandleFunc("/api/packaging/products", server.createProduct).Methods("POST")
	router.HandleFunc("/api/packaging/sales-orders", server.getSalesOrders).Methods("GET")
	router.HandleFunc("/api/packaging/invoices", server.getInvoices).Methods("GET")
	router.HandleFunc("/api/packaging/delivery-notes", server.getDeliveryNotes).Methods("GET")

	// File upload
	router.HandleFunc("/api/upload", server.uploadFile).Methods("POST")
	router.HandleFunc("/api/download/{fileId}", server.downloadFile).Methods("GET")

	// WebSocket
	router.HandleFunc("/ws", server.handleWebSocket)

	// Start server
	log.Printf("Server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", router))
}

// Handler functions
func (s *Server) getProducts(w http.ResponseWriter, r *http.Request) {
	// Implementation
}

func (s *Server) createProduct(w http.ResponseWriter, r *http.Request) {
	// Implementation
}

func (s *Server) uploadFile(w http.ResponseWriter, r *http.Request) {
	// Implementation
}

func (s *Server) downloadFile(w http.ResponseWriter, r *http.Request) {
	// Implementation
}

func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade error: %v", err)
		return
	}

	client := &Client{
		hub:  s.hub,
		conn: conn,
		send: make(chan interface{}, 256),
	}

	s.hub.register <- client
	go client.writePump()
	go client.readPump()
}

// WebSocket hub methods
func (h *WebSocketHub) run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}

func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		var msg interface{}
		err := c.conn.ReadJSON(&msg)
		if err != nil {
			break
		}
		c.hub.broadcast <- msg
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(54 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.conn.WriteJSON(message); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
```

### 3.2 Environment Configuration

Create `.env.production`:
```
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=trimalaksana
DB_PASSWORD=your_secure_password
DB_NAME=trimalaksana_db

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=your_secure_password

# Server
API_PORT=8080
API_HOST=0.0.0.0
NODE_ENV=production
```

## Phase 4: Frontend Integration (Week 4-5)

### 4.1 Update Storage Service

Create `src/services/api-storage.ts`:

```typescript
import { StorageKeys } from './storage';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

class ApiStorageService {
  private apiUrl: string;
  private ws: WebSocket | null = null;

  constructor(apiUrl: string = 'http://localhost:8080') {
    this.apiUrl = apiUrl;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const response = await fetch(`${this.apiUrl}/api/data/${key}`);
      const result: ApiResponse<T> = await response.json();
      return result.success ? result.data || null : null;
    } catch (error) {
      console.error(`Error fetching ${key}:`, error);
      return null;
    }
  }

  async set<T>(key: string, value: T, immediateSync?: boolean): Promise<void> {
    try {
      const response = await fetch(`${this.apiUrl}/api/data/${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      });

      if (!response.ok) {
        throw new Error(`Failed to save ${key}`);
      }

      if (immediateSync) {
        this.broadcastSync(key, value);
      }
    } catch (error) {
      console.error(`Error saving ${key}:`, error);
      throw error;
    }
  }

  async uploadFile(file: File, module: string): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('module', module);

    const response = await fetch(`${this.apiUrl}/api/upload`, {
      method: 'POST',
      body: formData,
    });

    const result: ApiResponse<{ fileId: string }> = await response.json();
    if (!result.success) throw new Error(result.error);
    return result.data!.fileId;
  }

  async downloadFile(fileId: string): Promise<Blob> {
    const response = await fetch(`${this.apiUrl}/api/download/${fileId}`);
    return response.blob();
  }

  connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`ws://localhost:8080/ws`);
        this.ws.onopen = () => resolve();
        this.ws.onerror = reject;
      } catch (error) {
        reject(error);
      }
    });
  }

  private broadcastSync(key: string, value: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'sync', key, value }));
    }
  }
}

export const apiStorageService = new ApiStorageService();
```

### 4.2 Update Storage Service to Use API

Modify `src/services/storage.ts` to use API when available:

```typescript
// ... existing code ...

class StorageService {
  private useApi: boolean = false;
  private apiService: any = null;

  constructor() {
    this.useApi = process.env.REACT_APP_USE_API === 'true';
    if (this.useApi) {
      this.apiService = require('./api-storage').apiStorageService;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.useApi && this.apiService) {
      return this.apiService.get<T>(key);
    }
    // Fallback to localStorage
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  }

  async set<T>(key: string, value: T, immediateSync?: boolean): Promise<void> {
    if (this.useApi && this.apiService) {
      await this.apiService.set(key, value, immediateSync);
    }
    // Always save to localStorage as backup
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ... rest of methods ...
}
```

## Phase 5: Migration & Testing (Week 5-6)

### 5.1 Data Migration Script

Create `scripts/migrate-to-postgresql.js`:

```javascript
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function migrateData() {
  try {
    console.log('Starting data migration...');

    // Read all JSON files from localStorage
    const dataDir = path.join(__dirname, '../data/localStorage');
    const files = fs.readdirSync(dataDir);

    for (const file of files) {
      if (!file.endsWith('.json')) continue;

      const filePath = path.join(dataDir, file);
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const tableName = file.replace('.json', '');

      console.log(`Migrating ${file}...`);

      // Insert data into PostgreSQL
      if (Array.isArray(data)) {
        for (const item of data) {
          await insertItem(tableName, item);
        }
      }
    }

    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await pool.end();
  }
}

async function insertItem(table, item) {
  // Implementation based on table schema
}

migrateData();
```

### 5.2 Testing Checklist

- [ ] PostgreSQL connection working
- [ ] MinIO bucket creation successful
- [ ] Go API server running
- [ ] WebSocket connection established
- [ ] Data migration complete
- [ ] File upload/download working
- [ ] Real-time sync functioning
- [ ] Fallback to localStorage working
- [ ] Performance benchmarks met

## Deployment Checklist

- [ ] Database backups configured
- [ ] MinIO replication setup
- [ ] API server load balancing
- [ ] SSL/TLS certificates installed
- [ ] Environment variables secured
- [ ] Monitoring and logging configured
- [ ] Disaster recovery plan documented
- [ ] User training completed

## Timeline Summary

| Phase | Duration | Tasks |
|-------|----------|-------|
| 1 | Week 1-2 | PostgreSQL setup, schema creation |
| 2 | Week 2 | MinIO setup, bucket configuration |
| 3 | Week 3-4 | Go API server development |
| 4 | Week 4-5 | Frontend integration |
| 5 | Week 5-6 | Migration, testing, deployment |

**Total: 6 weeks to production**

## Next Steps

1. Set up PostgreSQL locally
2. Create database schema
3. Install and configure MinIO
4. Start Go API server development
5. Begin frontend integration
