# UI Mapping - Complete Module Inventory

## 📦 PACKAGING MODULE

### 1. Sales Orders (`/packaging/sales-orders`)

**Buttons:**
- `+ Create SO` - Create new Sales Order
- `Edit` - Edit existing SO (DRAFT/OPEN only)
- `Confirm` - Confirm SO (DRAFT → OPEN)
- `Void` - Void SO (OPEN/CLOSE → VOID)
- `Delete` - Delete SO (DRAFT only)
- `Save SO` / `Update SO` - Save form
- `Cancel` - Cancel form
- `+ Add Product` - Add product item to SO
- `View BOM` - View Bill of Materials
- `Generate Quotation` - Generate quotation preview
- `Print Quotation` - Print quotation

**Form Fields:**
- `SO No *` (input) - Nomor PO dari Customer
- `Customer *` (autocomplete) - Type to search customer
- `Payment Terms *` (select) - TOP/COD/CBD
- `TOP Days *` (number) - Days for TOP payment
- `Category` (select) - Packaging/Trading/Expedition
- `Global Spec Note` (textarea) - Specification note
- Product items:
  - `Product` (autocomplete) - Type to search product
  - `Qty` (number) - Quantity
  - `Price` (number) - Unit price
  - `Spec Note` (textarea) - Item-specific note

**Status Flow:**
- DRAFT → OPEN (via Confirm)
- OPEN → CLOSE (via workflow: PPIC → Production → QA/QC → Delivery)
- OPEN/CLOSE → VOID (via Void button)

**Filters:**
- Search by SO No, Customer
- Status filter: All/DRAFT/OPEN/CLOSE/VOID
- Date From/To
- Tab: All Orders / Outstanding

---

### 2. PPIC (`/packaging/ppic`)

**Buttons:**
- `Create SPK` - Create SPK from PTP
- `View` - View PTP details
- `Match SO` - Match PTP with SO
- `Close` - Close PTP
- `Create PR for Shortage` - Create Purchase Request for material shortage
- `Create SPK & Schedule` - Create SPK and production schedule
- `Link SO` - Link existing SO
- `Create & Link SO` - Create new SO and link

**Tabs:**
- SPK
- PTP
- Schedule
- Analisa
- Outstanding

**Status Flow:**
- PTP → SPK → Schedule → Production

---

### 3. Purchasing (`/packaging/purchasing`)

**Buttons:**
- `+ Create PO` - Create Purchase Order
- `Edit` - Edit PO (DRAFT only)
- `GRN` - Create Goods Receipt Note
- `View` - View PO details
- `Print` - Print PO
- `Status` - Update PO status
- `Save PO` - Save form
- `Cancel` - Cancel form
- `Approve & Create PO` - Approve and create PO

**Form Fields:**
- `Supplier` (autocomplete)
- `SO No` (input)
- `Material Item` (autocomplete)
- `Qty` (number)
- `Price` (number)
- `Payment Terms` (select)
- `TOP Days` (number)
- `Delivery Date` (date)

**Status Flow:**
- DRAFT → OPEN (via Approve)
- OPEN → CLOSE (via GRN completion)

---

### 4. Production (`/packaging/production`)

**Buttons:**
- `Submit Production` - Submit production result
- `QC Check` - Request QC check
- `View Detail` - View production details

**Form Fields:**
- `Produced Qty` (number)
- `Produced Date` (date)
- `Notes` (textarea)
- Material usage (table)

**Status Flow:**
- OPEN → CLOSE (after QC PASS)

---

### 5. QA/QC (`/packaging/qa-qc`)

**Buttons:**
- `QC Check` - Perform QC check
- `View Detail` - View QC details
- `Print Preview` - Print QC report

**Form Fields:**
- `QC Result` (select) - PASS/FAIL
- `Notes` (textarea)

**Status Flow:**
- OPEN → CLOSE (after QC PASS)
- QC PASS → Auto close SPK → Notification to Delivery

---

### 6. Delivery Note (`/packaging/delivery-note`)

**Buttons:**
- `+ Create Delivery Note` - Create new delivery note
- `Edit` - Edit delivery note
- `Save` - Save form
- `Cancel` - Cancel form
- `Save to PDF` - Save as PDF
- `Close` - Close preview

**Form Fields:**
- `SO No` (autocomplete)
- `Customer` (autocomplete)
- `Driver` (input)
- `Vehicle No` (input)
- `Delivery Date` (date)
- `Signed Document` (file upload)

**Status Flow:**
- DRAFT → OPEN → CLOSE

---

## 💰 FINANCE MODULE

### 1. Accounting (`/packaging/finance/accounting`)

**Buttons:**
- `+ New Entry` - Create journal entry
- `Edit` - Edit entry
- `Delete` - Delete entry
- `Save` - Save form
- `Cancel` - Cancel form
- `📥 Export Excel` - Export to Excel
- `📤 Import Excel` - Import from Excel

**Form Fields:**
- `Entry Date` (date)
- `Reference` (input)
- `Account` (select)
- `Description` (textarea)
- `Debit` (number)
- `Credit` (number)

---

### 2. Payments (`/packaging/finance/payments`)

**Buttons:**
- `+ Record Payment` - Create payment
- `Edit` - Edit payment
- `Delete` - Delete payment
- `Save` - Save form
- `Cancel` - Cancel form
- `📥 Export Excel` - Export
- `📋 Download Template` - Download import template
- `📤 Import Excel` - Import

**Form Fields:**
- `Payment Date` (date)
- `Type` (select) - Receipt/Payment
- `Invoice No` / `PO No` (input)
- `Amount` (number)
- `Payment Method` (select)
- `Payment Proof` (file upload)

---

### 3. Accounts Receivable (`/packaging/finance/ar`)

**Buttons:**
- `📥 Export Excel` - Export AR report

**Filters:**
- Search
- Status filter
- Date range

---

### 4. Accounts Payable (`/packaging/finance/ap`)

**Buttons:**
- `📥 Export Excel` - Export AP report

---

### 5. General Ledger (`/packaging/finance/ledger`)

**Buttons:**
- `+ New Entry` - Create ledger entry
- `Edit` - Edit entry
- `Delete` - Delete entry
- `Save` - Save form
- `Cancel` - Cancel form
- `📥 Export Excel` - Export
- `📋 Download Template` - Download template
- `📤 Import Excel` - Import

**Form Fields:**
- `Entry Date` (date)
- `Reference` (input)
- `Account` (select)
- `Account Name` (input)
- `Debit` (number)
- `Credit` (number)
- `Description` (textarea)

---

### 6. Financial Reports (`/packaging/finance/reports`)

**Buttons:**
- `Print` - Print report
- `Export` - Export report

**Filters:**
- Date range
- Report type

---

## 📋 MASTER MODULE

### 1. Products (`/packaging/master/products`)

**Buttons:**
- `+ Add Product` - Create product
- `Edit` - Edit product
- `Delete` - Delete product
- `Save` - Save form
- `Cancel` - Cancel form

**Form Fields:**
- `Kode` (input)
- `Nama` (input)
- `Satuan` (input)
- `Harga FG` (number)
- `Harga Sales` (number)

---

### 2. Materials (`/packaging/master/materials`)

**Buttons:**
- `+ Add Material` - Create material
- `Edit` - Edit material
- `Delete` - Delete material

**Form Fields:**
- `Kode` (input)
- `Nama` (input)
- `Satuan` (input)
- `Price Mtr` (number)

---

### 3. Customers (`/packaging/master/customers`)

**Buttons:**
- `+ Add Customer` - Create customer
- `Edit` - Edit customer
- `Delete` - Delete customer

**Form Fields:**
- `Kode` (input)
- `Nama` (input)
- `Alamat` (textarea)
- `Telepon` (input)

---

### 4. Suppliers (`/packaging/master/suppliers`)

**Buttons:**
- `+ Add Supplier` - Create supplier
- `Edit` - Edit supplier
- `Delete` - Delete supplier

**Form Fields:**
- `Kode` (input)
- `Nama` (input)
- `Alamat` (textarea)
- `Telepon` (input)

---

### 5. Inventory (`/packaging/master/inventory`)

**Buttons:**
- `📥 Export Excel` - Export inventory

**Filters:**
- Search
- Material filter

---

## 🔄 COMMON PATTERNS

### Status Badges
- DRAFT (gray)
- OPEN (blue)
- CLOSE/CLOSED (green)
- VOID (red)
- PENDING (yellow)
- PAID (green)
- UNPAID (red)

### Common Actions
- Create/Add
- Edit
- Delete
- View/Detail
- Print/Export
- Save/Cancel
- Confirm/Approve
- Reject/Void

### Form Patterns
- Autocomplete fields (Customer, Product, Material, Supplier)
- Date pickers
- Number inputs
- Text areas
- File uploads
- Status selects

---

## 🧪 TEST PRIORITIES

### Critical Paths (Must Test)
1. **Sales Order Flow:**
   - Create SO → Confirm → PPIC → Production → QA/QC → Delivery → Invoice → Payment → CLOSE

2. **Purchase Order Flow:**
   - Create PO → Approve → GRN → Inventory Update

3. **Finance Flow:**
   - Journal Entry → General Ledger → Financial Reports

### High Priority
- All CRUD operations (Create, Read, Update, Delete)
- Status transitions
- Form validations
- Autocomplete functionality
- Export/Import features

### Medium Priority
- Filters and search
- Date range selections
- File uploads
- Print/PDF generation

### Low Priority
- UI responsiveness
- Loading states
- Error messages

