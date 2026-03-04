-- ============================================
-- TRIMALAKSANA DATABASE INITIALIZATION
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PACKAGING MODULE TABLES
-- ============================================

-- Products
CREATE TABLE IF NOT EXISTS packaging_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(50) UNIQUE NOT NULL,
  nama VARCHAR(255) NOT NULL,
  deskripsi TEXT,
  kategori VARCHAR(100),
  satuan VARCHAR(20),
  harga DECIMAL(15, 2),
  stok INT DEFAULT 0,
  pad_code VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  _version BIGINT DEFAULT 1,
  _sync_status VARCHAR(20) DEFAULT 'synced'
);

CREATE INDEX idx_packaging_products_kode ON packaging_products(kode);
CREATE INDEX idx_packaging_products_kategori ON packaging_products(kategori);
CREATE INDEX idx_packaging_products_deleted ON packaging_products(deleted_at);

-- Customers
CREATE TABLE IF NOT EXISTS packaging_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(50) UNIQUE NOT NULL,
  nama VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telepon VARCHAR(20),
  alamat TEXT,
  kota VARCHAR(100),
  provinsi VARCHAR(100),
  kode_pos VARCHAR(10),
  negara VARCHAR(100),
  npwp VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  _version BIGINT DEFAULT 1
);

CREATE INDEX idx_packaging_customers_kode ON packaging_customers(kode);
CREATE INDEX idx_packaging_customers_nama ON packaging_customers(nama);
CREATE INDEX idx_packaging_customers_deleted ON packaging_customers(deleted_at);

-- Suppliers
CREATE TABLE IF NOT EXISTS packaging_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(50) UNIQUE NOT NULL,
  nama VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telepon VARCHAR(20),
  alamat TEXT,
  kota VARCHAR(100),
  provinsi VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  _version BIGINT DEFAULT 1
);

CREATE INDEX idx_packaging_suppliers_kode ON packaging_suppliers(kode);
CREATE INDEX idx_packaging_suppliers_deleted ON packaging_suppliers(deleted_at);

-- Sales Orders
CREATE TABLE IF NOT EXISTS packaging_sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  so_no VARCHAR(50) UNIQUE NOT NULL,
  customer_id UUID REFERENCES packaging_customers(id),
  tgl_order DATE NOT NULL,
  tgl_kirim DATE,
  status VARCHAR(20) DEFAULT 'DRAFT',
  total DECIMAL(15, 2),
  catatan TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  _version BIGINT DEFAULT 1
);

CREATE INDEX idx_packaging_sales_orders_so_no ON packaging_sales_orders(so_no);
CREATE INDEX idx_packaging_sales_orders_customer ON packaging_sales_orders(customer_id);
CREATE INDEX idx_packaging_sales_orders_status ON packaging_sales_orders(status);
CREATE INDEX idx_packaging_sales_orders_deleted ON packaging_sales_orders(deleted_at);

-- Sales Order Items
CREATE TABLE IF NOT EXISTS packaging_sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  so_id UUID NOT NULL REFERENCES packaging_sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES packaging_products(id),
  qty INT NOT NULL,
  harga_satuan DECIMAL(15, 2),
  subtotal DECIMAL(15, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_packaging_so_items_so ON packaging_sales_order_items(so_id);
CREATE INDEX idx_packaging_so_items_product ON packaging_sales_order_items(product_id);

-- Invoices
CREATE TABLE IF NOT EXISTS packaging_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_invoice VARCHAR(50) UNIQUE NOT NULL,
  so_id UUID REFERENCES packaging_sales_orders(id),
  customer_id UUID NOT NULL REFERENCES packaging_customers(id),
  tgl_invoice DATE NOT NULL,
  tgl_jatuh_tempo DATE,
  total DECIMAL(15, 2),
  pajak DECIMAL(15, 2),
  status VARCHAR(20) DEFAULT 'DRAFT',
  tgl_bayar TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  _version BIGINT DEFAULT 1
);

CREATE INDEX idx_packaging_invoices_no ON packaging_invoices(no_invoice);
CREATE INDEX idx_packaging_invoices_customer ON packaging_invoices(customer_id);
CREATE INDEX idx_packaging_invoices_status ON packaging_invoices(status);
CREATE INDEX idx_packaging_invoices_deleted ON packaging_invoices(deleted_at);

-- Delivery Notes (Surat Jalan)
CREATE TABLE IF NOT EXISTS packaging_delivery_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_sj VARCHAR(50) UNIQUE NOT NULL,
  so_id UUID REFERENCES packaging_sales_orders(id),
  customer_id UUID NOT NULL REFERENCES packaging_customers(id),
  tgl_kirim DATE NOT NULL,
  driver VARCHAR(100),
  no_kendaraan VARCHAR(20),
  status VARCHAR(20) DEFAULT 'DRAFT',
  signed_document_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  _version BIGINT DEFAULT 1
);

CREATE INDEX idx_packaging_delivery_notes_no ON packaging_delivery_notes(no_sj);
CREATE INDEX idx_packaging_delivery_notes_customer ON packaging_delivery_notes(customer_id);
CREATE INDEX idx_packaging_delivery_notes_status ON packaging_delivery_notes(status);
CREATE INDEX idx_packaging_delivery_notes_deleted ON packaging_delivery_notes(deleted_at);

-- Journal Entries (Finance)
CREATE TABLE IF NOT EXISTS packaging_journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tgl_entry DATE NOT NULL,
  referensi VARCHAR(100),
  kode_akun VARCHAR(20) NOT NULL,
  nama_akun VARCHAR(100),
  debit DECIMAL(15, 2) DEFAULT 0,
  kredit DECIMAL(15, 2) DEFAULT 0,
  deskripsi TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  _version BIGINT DEFAULT 1
);

CREATE INDEX idx_packaging_journal_entries_tgl ON packaging_journal_entries(tgl_entry);
CREATE INDEX idx_packaging_journal_entries_akun ON packaging_journal_entries(kode_akun);
CREATE INDEX idx_packaging_journal_entries_deleted ON packaging_journal_entries(deleted_at);

-- ============================================
-- GENERAL TRADING MODULE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS gt_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(50) UNIQUE NOT NULL,
  nama VARCHAR(255) NOT NULL,
  kategori VARCHAR(100),
  satuan VARCHAR(20),
  harga DECIMAL(15, 2),
  stok INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  _version BIGINT DEFAULT 1
);

CREATE INDEX idx_gt_products_kode ON gt_products(kode);
CREATE INDEX idx_gt_products_deleted ON gt_products(deleted_at);

CREATE TABLE IF NOT EXISTS gt_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode VARCHAR(50) UNIQUE NOT NULL,
  nama VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  telepon VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  _version BIGINT DEFAULT 1
);

CREATE INDEX idx_gt_customers_kode ON gt_customers(kode);
CREATE INDEX idx_gt_customers_deleted ON gt_customers(deleted_at);

-- ============================================
-- TRUCKING MODULE TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS trucking_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  no_shipment VARCHAR(50) UNIQUE NOT NULL,
  asal VARCHAR(255),
  tujuan VARCHAR(255),
  status VARCHAR(20) DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  _version BIGINT DEFAULT 1
);

CREATE INDEX idx_trucking_shipments_no ON trucking_shipments(no_shipment);
CREATE INDEX idx_trucking_shipments_status ON trucking_shipments(status);
CREATE INDEX idx_trucking_shipments_deleted ON trucking_shipments(deleted_at);

-- ============================================
-- BLOB STORAGE METADATA TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS blob_storage_metadata (
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
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_blob_storage_file_id ON blob_storage_metadata(file_id);
CREATE INDEX idx_blob_storage_entity ON blob_storage_metadata(entity_type, entity_id);
CREATE INDEX idx_blob_storage_module ON blob_storage_metadata(module);
CREATE INDEX idx_blob_storage_deleted ON blob_storage_metadata(deleted_at);

-- ============================================
-- ACTIVITY LOGS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100),
  action VARCHAR(50),
  module VARCHAR(50),
  entity_type VARCHAR(50),
  entity_id UUID,
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_module ON activity_logs(module);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);

-- ============================================
-- SYNC STATUS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key VARCHAR(255) NOT NULL UNIQUE,
  last_synced_at TIMESTAMPTZ,
  sync_status VARCHAR(20) DEFAULT 'pending',
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sync_status_key ON sync_status(storage_key);
CREATE INDEX idx_sync_status_status ON sync_status(sync_status);

-- ============================================
-- GENERIC STORAGE TABLE (for server-postgres-only.js)
-- ============================================

CREATE TABLE IF NOT EXISTS storage (
  key VARCHAR(255) PRIMARY KEY,
  value JSONB NOT NULL,
  timestamp BIGINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_storage_timestamp ON storage(timestamp);
