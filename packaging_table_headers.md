# TABLE HEADERS PER MODUL - PACKAGING

## 1. MASTER

### Products
- No
- Kode (SKU/ID)
- Nama
- Satuan (Unit)
- Stock Aman
- Stock Minimum
- Kategori
- Supplier
- Last Update
- User Update
- Ip Address
- Actions

**Actions:**
- Edit
- Delete
- Import Excel

### Materials
- No
- Kode (SKU/ID)
- Nama
- Satuan (Unit)
- Stock Aman
- Stock Minimum
- Kategori
- Supplier
- Last Update
- User Update
- Ip Address
- Actions

**Actions:**
- Edit
- Delete
- Import Excel

### Customers
- No
- Kode (ID)
- Nama (Company Name)
- Kontak (PIC Name)
- NPWP
- Email
- Telepon (Phone)
- Alamat (Address)
- Kategori
- Actions

**Actions:**
- Edit
- Delete
- Import Excel

**Form Fields:**
- PIC Name
- Company Name
- PIC Title
- Phone
- Email
- Address
- Documents (NIB, KTP, Others)

### Suppliers
- No
- Kode (ID)
- Nama (Company Name)
- Kontak (PIC Name)
- NPWP
- Email
- Telepon (Phone)
- Alamat (Address)
- Kategori
- Actions

**Actions:**
- Edit
- Delete
- Import Excel

**Form Fields:**
- PIC Name
- Company Name
- PIC Title
- Phone
- Email
- Address
- Documents (NIB, KTP, NPWP, Others)

---

## 2. PACKAGING

### Sales Orders (SO)
- SO No
- Customer
- Payment Terms (TOP, COD, CBD dengan TOP days jika TOP)
- Status (DRAFT, OPEN, CLOSE, VOID)
- Created
- Actions

**Actions di Sales Orders:**
- Cek BOM - Lihat BOM untuk semua produk di SO
- Generate Quotation - Generate quotation PDF
- Edit (jika status DRAFT)
- Void (jika status OPEN atau CLOSE)
- Delete (jika status DRAFT)

**Form Create SO:**
- SO No
- Customer (Autocomplete)
- Products (Multiple lines):
  - Product (Autocomplete)
  - Qty
  - UoM (Unit of Measure)
  - Price
  - Spec Note (per produk)
- Spec Note (Global - untuk semua produk)
- Payment Terms (TOP, COD, CBD)
- TOP Days (jika Payment Terms = TOP)
- BOM Preview (otomatis ter-generate dari products yang dipilih)

### PPIC

#### Tab SPK (Work Order)
- SPK NO
- SO No
- Customer
- Product
- Qty
- Status (DRAFT, OPEN, CLOSE)
- Schedule
- Progress
- Created
- Actions

**Actions di Tab SPK:**
- Preview SPK (PDF)
- Edit BOM
- PO (1 SPK) - Create PO untuk satu SPK
- PO All SPK - Create PO untuk semua SPK dari SO yang sama
- Schedule - Set schedule produksi
- Update Status

#### Tab Permintaan Tanpa PO (PTP)
- Request No
- Customer
- Product/Item
- Qty
- Unit
- Reason
- Status (DRAFT, OPEN, CLOSE)
- Request Date
- Created
- Actions

**Actions di Tab PTP:**
- View - Lihat detail PTP
- Create SPK - Buat SPK dari PTP
- Match SO - Match PTP dengan Sales Order yang sudah ada

**Form Create PTP:**
- Request No
- Customer (Autocomplete)
- Product/Item (Autocomplete - bisa produk atau material)
- Qty
- Unit
- Request Date
- Reason/Alasan (multiline, required)
- Checkbox: "Belum ada SO - akan dibuat sesuai PO customer"
- Expected SO Date (jika checkbox dicentang)

#### Tab Schedule
**Filter Periode:**
- Bulan Ini
- Bulan Lalu
- Bulan Depan
- Custom Month

**Table Structure:**
- **Header Row**: Freeze di top (position: sticky, top: 0, zIndex: 20)
- **Freeze Columns (10 kolom pertama - sticky left):**
  1. **SCHEDULE DELIVERY** - left: 0px, width: 35px, zIndex: 22
     - Menampilkan tanggal delivery dari Delivery Note (Surat Jalan)
  2. **End production** - left: 35px, width: 35px, zIndex: 22
     - Menampilkan tanggal selesai produksi (scheduleEndDate dari docs)
  3. **NO** - left: 70px, width: 40px, zIndex: 22
     - Nomor urut SPK dalam schedule
  4. **TGL PRODUKSI** - left: 110px, width: 100px, zIndex: 22
     - Tanggal schedule produksi (scheduleDate dari docs)
  5. **CUSTOMER** - left: 210px, width: 100px, zIndex: 22
     - Nama customer dari SO
  6. **PO customer** - left: 310px, width: 100px, zIndex: 22
     - PO Number dari customer (SO No, atau PTP requestNo jika belum ada SO)
  7. **SPK NO** - left: 410px, width: 80px, zIndex: 22
     - Nomor SPK (Work Order ID)
  8. **CODE** - left: 490px, width: 100px, zIndex: 22
     - Product Code/SKU
  9. **ITEM** - left: 590px, width: 200px, zIndex: 22
     - Nama produk/item
  10. **Quantity** - left: 790px, width: 60px, zIndex: 22
      - Quantity produk

- **Non-Freeze Columns (scrollable):**
  - **Unit** - width: 50px
  - **PLAN/ACTUAL** - width: 60px
    - Menampilkan "PLAN" atau "ACTUAL" untuk membedakan baris
  - **Day 1, Day 2, Day 3, ... Day 31** - 31 kolom, masing-masing width: 35px
    - Menampilkan dot color coding untuk tracking produksi per hari
  - **KETERANGAN** - width: 100px
    - Kolom untuk catatan/keterangan tambahan

**Freeze Behavior:**
- Semua freeze columns menggunakan `position: sticky` dengan `left` position yang berbeda
- Setiap freeze column memiliki `zIndex: 22` untuk memastikan berada di atas kolom non-freeze
- Background color disesuaikan dengan row color (untuk data rows) atau grey.100 (untuk header)
- Box shadow digunakan untuk efek visual pemisah: `boxShadow: '2px 0 2px -1px rgba(0,0,0,0.1)'`
- Header row juga freeze di top dengan `position: sticky, top: 0, zIndex: 20`

**Color Coding di Schedule (dot per hari di kolom Day 1-31):**
- **Merah** (#d32f2f) - SPK sudah CLOSE (dot muncul di hari scheduleDate atau startDate)
- **Kuning** (#fbc02d) - Selesai produksi (dot muncul di endDate, hanya jika status belum CLOSE)
- **Hijau** (#388e3c) - Mulai produksi (dot muncul di startDate, hanya jika status belum CLOSE)
- **Hijau default** (#388e3c) - Jika ada scheduleDate tapi tidak ada start/end date (jika status belum CLOSE)

**Dot Display Logic:**
- Dot hanya muncul di baris PLAN (tidak di baris ACTUAL)
- Prioritas warna:
  1. Merah (jika status CLOSE) - muncul di startDate atau scheduleDate
  2. Kuning (jika ada endDate dan belum CLOSE) - muncul di endDate
  3. Hijau (jika ada startDate dan belum CLOSE) - muncul di startDate
  4. Hijau default (jika hanya ada scheduleDate dan belum CLOSE) - muncul di scheduleDate
- Dot size: 14px x 14px, border-radius: 50% (circle)

**Data per Row:**
- Setiap SPK muncul 2 baris: **PLAN** dan **ACTUAL**
- **PLAN Row**: 
  - Menampilkan semua data schedule di freeze columns (scheduleDeliveryDate, endProductionDate, NO, scheduleDate, customer, PO customer, SPK NO, CODE, ITEM, Quantity)
  - Menampilkan "PLAN" di kolom PLAN/ACTUAL
  - Menampilkan dot color coding di kolom Day 1-31 sesuai dengan tanggal schedule
  - Unit ditampilkan di kolom Unit
- **ACTUAL Row**: 
  - Baris kosong di semua freeze columns (untuk tracking actual production nanti)
  - Menampilkan "ACTUAL" di kolom PLAN/ACTUAL
  - Kolom Day 1-31 kosong (untuk input actual production per hari)
- **Grouping**: 
  - Data di-group berdasarkan week (minggu)
  - Week header: "WEEK 1", "WEEK 2", dst (dengan background color grey.200)
  - Setiap week bisa punya day header (SENIN, SELASA, dst) jika ada multiple days dalam week yang sama
- **PTP Unschedule**: 
  - PTP yang belum di-schedule muncul di group khusus: "PTP (Permintaan Tanpa PO) - Belum Di-Schedule"
  - Background color: warning.light (kuning)
- **Row Color**: 
  - Setiap row memiliki background color yang di-generate dari SO No atau PTP requestNo
  - Color konsisten untuk semua SPK dari SO yang sama

**Schedule Dialog (untuk set schedule):**
- **SPK NO** - Display only (read-only)
- **SO No** - Display only (read-only)
- **Product** - Display only (read-only)
- **Qty** - Display only (read-only)
- **Tanggal Schedule Produksi** (required) - Date picker
  - Disimpan sebagai `docs.scheduleDate` (ISO string format)
  - Digunakan untuk sorting dan filtering schedule berdasarkan periode
  - Digunakan untuk menampilkan di kolom "TGL PRODUKSI"
- **Schedule Mulai Produksi** (optional) - Date picker
  - Disimpan sebagai `docs.scheduleStartDate` (ISO string format)
  - Digunakan untuk dot hijau di kolom Day (jika status belum CLOSE)
  - Jika tidak diisi, akan menggunakan scheduleDate sebagai fallback
- **Schedule Selesai Produksi** (optional) - Date picker
  - Disimpan sebagai `docs.scheduleEndDate` (ISO string format)
  - Digunakan untuk dot kuning di kolom Day (jika status belum CLOSE)
  - Digunakan untuk menampilkan di kolom "End production"
- **Progress Info** (Display only, calculated):
  - **Target**: Qty dari SPK (wo.qty)
  - **Progress**: Total qty yang sudah diproduksi
    - Dihitung dari production results yang:
      - Product match dengan SPK product
      - SO match (soId atau soNo)
      - Status = OPEN
    - Sum dari semua qtyProduced
  - **Remaining**: Target - Progress
    - Jika > 0: ditampilkan dengan warna merah (error.main)
    - Jika = 0: ditampilkan dengan warna hijau (success.main) - "Selesai"
    - Jika < 0: ditampilkan sebagai surplus dengan warna default
- **Actions**: 
  - **Simpan Schedule** - Save semua schedule dates ke SPK docs
    - Update SPK dengan PUT `/api/wo/${woId}`
    - Body: `{ docs: { scheduleDate, scheduleStartDate, scheduleEndDate } }`
    - Reload data setelah save
  - **Create Batch Baru** - Create SPK batch baru
    - Quantity dihitung dari remaining (atau target jika remaining = 0)
    - Materials quantity di-recalculate berdasarkan ratio batch baru
    - Batch lama (batch A) quantity dikurangi dengan batch baru
    - Jika batch lama quantity jadi 0, bisa di-cancel atau biarkan

#### Tab Analisa
**Dashboard Statistik (Cards):**
- Total SPK
- Total PO
- Total SO
- Total FG
- Total PTP

**Status Statistik (Grid):**
- Status SPK: DRAFT, OPEN, CLOSE (dengan count)
- Status PO: DRAFT, OPEN, CLOSE (dengan count)
- Status SO: DRAFT, OPEN, CLOSE, VOID (dengan count)
- Status PTP: DRAFT, OPEN, CLOSE (dengan count)

**Detail Data (Sub-tabs):**

**Tab SPK:**
- ID/No
- Customer/Supplier
- Product/Item
- Qty
- Status
- Created

**Tab PO:**
- ID/No (PO No)
- Customer/Supplier (Supplier)
- Product/Item (jumlah items)
- Qty (total qty dari semua lines)
- Status
- Created

**Tab SO:**
- ID/No (SO No)
- Customer/Supplier (Customer)
- Product/Item (jumlah items)
- Qty (total qty dari semua lines)
- Status
- Created

**Tab FG:**
- ID/No (SKU)
- Customer/Supplier (Customer)
- Product/Item (Product Name)
- Qty (Stock/Available Qty)
- Status
- Created

**Tab PTP:**
- ID/No (Request No)
- Customer/Supplier (Customer Name)
- Product/Item (Product/Material Name)
- Qty
- Status
- Created (Request Date)

### Purchasing

#### Purchase Order (PO)
- PO No
- Supplier
- SO No
- Material/Item (dari lines)
- Qty (dari lines)
- Price (dari lines)
- Total
- Payment Terms (TOP, COD, CBD)
- TOP Days
- Status (DRAFT, OPEN, CLOSE)
- Delivery Date
- Created
- Actions

**Actions di PO:**
- View Detail
- Edit
- Create GRN (jika status OPEN)
- Print Preview (PDF)
- Update Status

**PO Detail Dialog:**
- PO No
- Supplier Info (Name, Address, Phone)
- Delivery Date
- SO No
- Lines (Material/Item, Qty, Price, Total)
- Payment Terms
- Include Tax checkbox
- Total, Subtotal, PPN, Grand Total
- Actions: Edit, Create GRN, Print Preview

**Create PO dari SPK:**
- Pilih Supplier untuk setiap Material
- Materials dengan supplier yang sama akan digroup menjadi satu PO
- Preview PO yang akan dibuat

#### Goods Receipt Note (GRN)
- GRN No
- PO No
- SO No
- Customer
- Spec Note
- Status (DRAFT, OPEN, CLOSE)
- Date
- Target (WO)
- Progress
- Remaining
- Docs
- Print
- Actions

### Produksi (Production)
- GRN No
- PO No
- SO No
- Customer
- Spec Note
- Status (DRAFT, OPEN, CLOSE)
- Date
- Target (WO) - Total qty dari semua SPK untuk SO
- Progress - Total qty yang sudah diproduksi (dari production results dengan status OPEN)
- Remaining - Target - Progress
- Docs
- Print
- Actions

**Actions di Produksi:**
- View Detail
- Submit Production Result
- Print Preview

**Submit Production Result Dialog:**
- SO No
- Product
- Qty Produced
- Qty Surplus (optional)
- Qty Surplus Unit
- Materials Used (array)
- Leftovers (array - sisa raw material)
- Result Files (upload)
- Actions: Submit

### QA/QC
- SO No
- Customer
- Product
- Qty
- Status (DRAFT, OPEN, CLOSE)
- Created
- Actions

**Actions di QA/QC:**
- View Detail
- QC Check (PASS/FAIL)
- Print Preview

**QC Check Dialog:**
- SO No
- Customer
- Product
- Qty Produced
- QC Result (PASS/FAIL) - Internal QC result, status dokumen tetap DRAFT/OPEN/CLOSE
- QC Form Files (upload)
- Photo Files (upload)
- Note
- Actions: Submit QC

**Note:** Auto-close SPK jika QC result = PASS (status dokumen jadi CLOSE)

### Finish Good (Delivery Note)
- SJ No (Surat Jalan No)
- SO No
- Customer
- Product
- Qty
- Status (DRAFT, OPEN, CLOSE)
- Actions

**Actions di Finish Good:**
- Generate SJ (jika belum ada SJ)
- Edit SJ (jika sudah ada SJ)
- Update Status
- Print Preview (Surat Jalan PDF)

**Generate SJ Dialog:**
- SJ No
- SJ Date
- Driver
- Vehicle No
- Actions: Generate

**Edit SJ Dialog:**
- Driver
- Vehicle No
- SJ Date
- Reason (jika edit)
- Signed Files (upload dokumen yang sudah ditandatangani)
- Actions: Update

**Status Flow:**
- DRAFT → OPEN → CLOSE

---

## 3. FINANCE

### Finance
#### Tab Supplier Payments
- PO No
- Supplier
- SO No
- Total
- Status (DRAFT, OPEN, CLOSE)
- Actions (Mark as Paid / View Payment)

**Mark as Paid Dialog:**
- PO No
- Supplier
- Total
- Paid Date
- Payment Proof (upload files)
- Actions: Mark as Paid

#### Tab Expenses (Petty Cash)
- Expense No
- Category
- Description
- Amount
- Paid By
- Expense Date
- Receipt Proof
- Notes
- Actions

**Create Expense Dialog:**
- Expense No
- Category
- Description
- Amount
- Paid By
- Expense Date
- Receipt Proof (upload)
- Notes
- Actions: Create Expense

### Accounting
#### Tab Customer Invoices
**Pending QC Passed Items:**
- SO No
- Customer
- Product
- Qty
- Actions (Create Invoice)

**Existing Invoices:**
- Invoice No
- Customer
- Status (DRAFT, OPEN, CLOSE)
- Payment Terms (TOP, COD, CBD)
- Created
- Actions (Edit, Update, Print Preview)

**Create Invoice Dialog:**
- Invoice No
- Surat Jalan No
- Payment Terms (TOP, COD, CBD)
- SO No
- Customer
- Address
- Product
- Invoice Lines:
  - Product Name
  - Qty (editable)
  - Price (editable)
  - Subtotal
- Tax (%)
- Discount Type (Percent / Fixed Amount)
- Discount (% atau Fixed Amount)
- Calculation Summary:
  - Subtotal
  - Discount
  - Tax
  - Grand Total
- Actions: Create Invoice

**Edit Invoice Dialog:**
- Sama seperti Create Invoice
- Bisa edit lines, tax, discount
- Actions: Update Invoice

**Update Invoice Dialog:**
- Payment Proof (upload files)
- Actions: Update Payment Proof

#### Tab Supplier Payments
- PO No
- Supplier
- SO No
- Total
- Payment Terms
- TOP (days)
- PO Date
- Received Date
- Due Date
- Status (DRAFT, OPEN, CLOSE)
- Actions (Pay - Mark as Paid)

**Pay Supplier Dialog:**
- PO No
- Supplier
- Total
- Paid Date
- Payment Proof (upload files)
- Actions: Mark as Paid

#### Tab Expenses (Petty Cash)
- Expense No
- Category
- Description
- Amount
- Paid By
- Expense Date
- Receipt Proof
- Notes
- Actions

**Create Expense Dialog:**
- Expense No
- Category
- Description
- Amount
- Paid By
- Expense Date
- Receipt Proof (upload)
- Notes
- Actions: Create Expense

### AR (Accounts Receivable)
#### Tab Supplier Payments
- PO No
- Supplier
- SO No
- Total
- Payment Terms
- TOP (days)
- PO Date
- Received Date
- Due Date
- Status (DRAFT, OPEN, CLOSE)
- Action (Mark as Paid)

**Mark as Paid Dialog:**
- PO No
- Supplier
- Total
- Paid Date
- Actions: Mark as Paid

#### Tab Customer Payments
- Invoice No
- Customer
- SO No
- SJ No
- Total
- Payment Terms
- Invoice Date
- Due Date
- Status (DRAFT, OPEN, CLOSE)
- Action (Mark as Paid)

**Mark as Paid Dialog:**
- Invoice No
- Customer
- Total
- Paid Date
- Actions: Mark as Paid

### COA (Chart of Accounts)
- Kode Akun
- Nama Akun
- Tipe
- Deskripsi
- Status
- Aksi

---

## 4. HR

### HRD
#### Tab Dashboard
- (Dashboard statistics)

#### Tab Attendance
- Date
- Staff ID
- Staff Name
- Check In
- Check Out
- Status
- Actions

#### Tab Staff
- NIP
- NAMA LENGKAP
- DEPARTEMEN
- SECTION
- JABATAN
- TANGGAL LAHIR
- ALAMAT
- ALAMAT KTP
- NO.HP
- NO.KTP
- NO.PASPOR
- NO.SIM A
- NO.SIM C
- NO.BPJSTEK
- NO.BPJSKES
- NO.NPWP
- NO.REKENING
- NAMA BANK
- GAJI POKOK
- PREMI HADIR
- TUNJ.TRANSPORT
- TUNJ.MAKAN
- (dan field lainnya)
- Actions

#### Tab Settings
- (Settings configuration)

---

## 5. SETTINGS

### Settings
- (Company settings form)

### Report
#### Tab Summary
- (Summary report view)

#### Tab Comprehensive
- (Comprehensive report view)

#### Tab SO
- SO No
- Customer
- Product
- Qty
- Price
- Total
- Status
- Created
- (dan field lainnya)

#### Tab PO
- PO No
- Supplier
- SO No
- Material
- Qty
- Price
- Total
- Status
- Created
- (dan field lainnya)

#### Tab Production
- (Production report fields)

#### Tab Delivery
- (Delivery report fields)

#### Tab Invoice
- (Invoice report fields)

#### Tab Inventory
- (Inventory report fields)

#### Tab HR
- (HR report fields)

### DB Activity
**Sections (dengan pagination):**

**Products:**
- ID
- SKU
- Name
- Created

**Customers:**
- ID
- PIC Name
- Company
- Phone
- Created

**Suppliers:**
- ID
- PIC Name
- Company
- Phone
- Created

**Sales Orders (SO):**
- ID
- SO No
- Customer
- Status
- Created

**Purchase Orders (PO):**
- ID
- PO No
- Supplier
- Payment Terms
- TOP (days)
- Status
- Created

**Invoices:**
- ID
- Invoice No
- Customer
- Status
- Paid At
- Created

**SPK:**
- SPK NO
- SO No
- Product
- Qty
- Status
- Created

**Goods Receipt Notes (GRN):**
- ID
- GRN No
- PO ID
- Status
- Date
- Created

**Production Results:**
- ID
- SO No
- Product
- Qty Produced
- Status
- Created

**QC Checks:**
- Type
- ID
- SO No
- Product
- GRN Line ID
- Stage
- Status
- Created

**Delivery Notes:**
- ID
- SJ No
- SO No
- Customer
- Product
- Qty
- Status
- Created

**Expenses:**
- ID
- Expense No
- Category
- Description
- Amount
- Paid By
- Expense Date
- Created

**Audit Logs:**
- ID
- Ref Type
- Ref ID
- Actor ID
- Action
- Created

**Outbox Events (Undelivered):**
- ID
- Ref Type
- Ref ID
- Operation
- Created

**Company Settings:**
- Company Name
- Address
- Phone
- Purchasing PIC (Name, Phone)

**Actions:**
- Refresh
- Run Migrate
- Seed Database
- Clear Data (dengan checkbox untuk pilih tabel yang akan dihapus)

---


