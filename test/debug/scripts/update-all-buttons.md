# Update All Buttons Implementation Guide

## Pattern untuk Update Semua Module

### 1. Master Module (Customers, Suppliers, Products, Materials) ✅ DONE
- Edit: Buka form dengan data item
- Delete: Konfirmasi lalu hapus dari storage
- Import Excel: File picker (TODO: implement parser)

### 2. HRD Module
- Edit Staff: Buka form edit
- Delete Staff: Konfirmasi lalu hapus

### 3. PPIC Module
- Preview SPK: Tampilkan detail SPK
- Edit BOM: Buka form edit BOM
- PO (1 SPK): Generate PO untuk 1 SPK
- PO All SPK: Generate PO untuk semua SPK
- Schedule: Buka schedule dialog
- Update Status: Dialog update status
- View: Tampilkan detail
- Create SPK: Buka form create SPK
- Match SO: Match dengan Sales Order

### 4. Sales Orders Module
- Cek BOM: Validasi BOM
- Generate Quotation: Generate quotation PDF
- Edit: Edit SO (jika DRAFT)
- Delete: Hapus SO (jika DRAFT)
- Void: Void SO

### 5. Purchasing Module
- View Detail: Tampilkan detail PO
- Edit: Edit PO
- Create GRN: Generate GRN dari PO
- Print Preview: Print PO
- Update Status: Update status PO

### 6. Production Module
- Print: Print production result
- View Detail: Tampilkan detail
- Submit Production Result: Submit hasil produksi
- Print Preview: Print preview

### 7. QAQC Module
- View Detail: Tampilkan detail
- QC Check: Lakukan QC check
- Print Preview: Print QC report

### 8. Delivery Note Module
- Generate SJ: Generate Surat Jalan
- Edit SJ: Edit Surat Jalan
- Print Preview: Print SJ
- Update Status: Update status delivery

### 9. Finance Modules
- Mark as Paid: Update status ke paid
- View Payment: Tampilkan detail payment
- Create Invoice: Generate invoice
- Edit: Edit invoice/payment
- Update: Update invoice
- Print Preview: Print invoice/payment
- Pay - Mark as Paid: Mark sebagai paid
- Delete: Hapus record

### 10. COA Module
- Edit: Edit Chart of Account
- Delete: Hapus COA

### 11. Settings Module
- Run Migrate: Jalankan migration script

## Implementation Pattern

```typescript
// 1. Add state for editing
const [editingItem, setEditingItem] = useState<ItemType | null>(null);

// 2. Implement handlers
const handleEdit = (item: ItemType) => {
  setEditingItem(item);
  setFormData(item);
  setShowForm(true);
};

const handleDelete = async (item: ItemType) => {
  if (!confirm(`Delete "${item.name}"?`)) return;
  // Delete logic
};

const handleAction = (item: ItemType, action: string) => {
  // Action-specific logic
};

// 3. Update render function
render: (item: ItemType) => (
  <div>
    <Button onClick={() => handleEdit(item)}>Edit</Button>
    <Button onClick={() => handleDelete(item)}>Delete</Button>
    <Button onClick={() => handleAction(item, 'action')}>Action</Button>
  </div>
)
```

