# STRUKTUR MENU PACKAGING

## 1. MASTER
   - **Products** - Master produk
   - **Materials** - Master material
   - **Customers** - Master customer
   - **Suppliers** - Master supplier

## 2. PACKAGING
   - **Workflow** - Overview alur kerja packaging
   - **Sales Orders** - Sales Order (SO)
     - Create SO dengan multiple products
     - Submit SO untuk approval
     - Approve SO oleh approver
     - BOM per produk otomatis ter-generate
   - **PPIC** - Production Planning & Inventory Control
     - **Tab SPK** - List Work Order (SPK)
     - **Tab Permintaan Tanpa PO** - Permintaan Tanpa PO (PTP)
     - **Tab Schedule** - Schedule produksi
     - **Tab Analisa** - Analisa data
   - **Purchasing** - Purchase Order (PO)
     - Create PO dari SPK untuk bahan baku
     - Pilih supplier untuk setiap material
     - Submit dan approve PO
     - Payment terms (TOP, COD, CBD)
     - GRN (Goods Receipt Note)
   - **Produksi** - Production
     - Submit hasil produksi dari SPK
     - Track qty produced vs target
     - Surplus & leftovers tracking
     - Link ke GRN jika ada
   - **QA/QC** - Quality Assurance/Quality Control
     - QC check production results
     - PASS/FAIL status
     - QC form & photo attachments
     - Auto-close SPK jika PASS
   - **Warehouse/FG** - Delivery Note (Surat Jalan)
     - Create delivery note dari QC PASS items
     - Driver & vehicle tracking
     - Signed document upload
     - Status tracking (PENDING, DELIVERED, dll)

## 3. FINANCE
   - **Finance** - Finance module
   - **Accounting** - Accounting
     - **Tab Customer Invoices** - Invoice customer
     - **Tab Supplier Payments** - Pembayaran supplier
     - **Tab Expenses (Petty Cash)** - Pengeluaran petty cash
   - **AR** - Accounts Receivable
   - **COA** - Chart of Accounts

## 4. HR
   - **HRD** - Human Resources Development
     - **Tab Dashboard** - Dashboard HR
     - **Tab Attendance** - Absensi karyawan
     - **Tab Staff** - Data karyawan
       - Form Staff dengan sub-tab:
         - Basic Info
         - Personal Info
         - Documents
         - Salary
         - Family
     - **Tab Settings** - Settings HR

## 5. SETTINGS
   - **Settings** - Company Settings
   - **Report** - Report Module
     - **Tab Summary** - Summary report
     - **Tab Comprehensive** - Comprehensive report
     - **Tab SO** - Sales Order report
     - **Tab PO** - Purchase Order report
     - **Tab Production** - Production report
     - **Tab Delivery** - Delivery report
     - **Tab Invoice** - Invoice report
     - **Tab Inventory** - Inventory report
     - **Tab HR** - HR report
   - **DB Activity** - Database Activity Log

---

## DETAIL WORKFLOW PACKAGING:

1. **Sales Order (SO)** → Module: Sales
   - Create SO dengan multiple products
   - Submit SO untuk approval
   - Approve SO oleh approver
   - BOM per produk otomatis ter-generate

2. **Work Order (SPK)** → Module: PPIC
   - Create SPK otomatis dari SO approved
   - Batch management (SPK-000001A, SPK-000001B, dst)
   - Schedule produksi
   - Progress tracking dengan color coding

3. **Purchase Order (PO)** → Module: Purchasing
   - Create PO dari SPK untuk bahan baku
   - Pilih supplier untuk setiap material
   - Submit dan approve PO
   - Payment terms (TOP, COD, CBD)

4. **Goods Receipt Note (GRN)** → Module: Warehouse/Purchasing
   - Create GRN dari PO yang sudah approved
   - Input qty yang diterima
   - Upload dokumen penerimaan
   - Post GRN untuk update inventory

5. **Production** → Module: Produksi
   - Submit hasil produksi dari SPK
   - Track qty produced vs target
   - Surplus & leftovers tracking
   - Link ke GRN jika ada

6. **QA/QC** → Module: QA/QC
   - QC check production results
   - PASS/FAIL status
   - QC form & photo attachments
   - Auto-close SPK jika PASS

7. **Delivery Note (Surat Jalan)** → Module: Finish Good
   - Create delivery note dari QC PASS items
   - Driver & vehicle tracking
   - Signed document upload
   - Status tracking (PENDING, DELIVERED, dll)

8. **Invoice** → Module: Accounting
   - Create invoice dari delivery note
   - Tax & discount calculation
   - Payment proof upload
   - Margin calculation (revenue - production cost)

