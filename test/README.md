# Test Suite

Test folder untuk semua fungsi dan komponen di aplikasi.

## Struktur

```
test/
├── setup.ts                 # Test setup dan mocks
├── services/                # Test untuk services
│   └── storage.test.ts      # Storage service tests
├── utils/                   # Test untuk utilities
│   └── actions.test.ts      # Action utilities tests
├── pages/                   # Test untuk page components
│   └── HRD.test.ts          # HRD helper functions tests
├── scripts/                 # Test untuk script helpers
│   └── seed-helpers.test.ts # Seed script helpers tests
└── integration/            # Integration tests
    └── workflow.test.ts     # Full workflow E2E tests
```

## Menjalankan Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run tests with coverage
npm run test:coverage
```

## Test Coverage

### Unit Tests
- ✅ Storage Service (get, set, remove, config, sync)
- ✅ Action Utilities (notifications, edit, delete, import, print, update status)
- ✅ HRD Helper Functions (isEmptyValue, shouldHideColumn)
- ✅ Seed Script Helpers (ID generation, validation)

### Integration Tests
- ✅ **Full Workflow E2E** - Test flow lengkap dari SO sampai payment:
  1. Create SO dari customer
  2. Approve SO → Generate SPK
  3. Create PO dari SPK untuk material
  4. Approve PO → Create GRN
  5. Production dari SPK
  6. QC Check → Pass/Fail
  7. Delivery Note
  8. Invoice Customer → Payment dari customer
  9. Payment ke Supplier → Bayar material

- ✅ **Full Workflow UI E2E** - Test flow UI lengkap dengan verifikasi data muncul di table:
  1. Create SO → Verify data muncul di table (bukan "No data available")
  2. Approve SO → Verify status update di table
  3. Create PO dari SPK → Verify PO muncul di Purchasing table
  4. Approve PO & Create GRN → Verify GRN created
  5. Production → Verify production data
  6. QC Check → Verify QC process
  7. Delivery Note → Verify delivery form
  8. Invoice Customer → Verify invoice UI & data
  9. Payment Customer → Verify payment UI & data
  10. Payment Supplier → Verify supplier payment UI
  11. Close SO → Verify SO status
  12. Full Flow Integration → Test complete workflow

- ✅ **Print & PDF Functions** - Test print dan save to PDF:
  1. Print Invoice - Generate HTML dan open print window
  2. Print PO (Purchase Order) - Generate HTML dengan semua detail
  3. Print Quotation - Generate HTML dengan items dan total
  4. Save to PDF - Verify print window opens (user bisa save as PDF dari print dialog)
  5. Currency formatting untuk print/PDF
  6. Error handling untuk print failures

## Menambah Test Baru

### Unit Test
1. Buat file test di folder yang sesuai (services/, utils/, pages/, dll)
2. Import functions yang mau di-test
3. Write test cases dengan describe/it blocks
4. Run tests untuk verify

Contoh:
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from '../../src/utils/myUtils';

describe('myFunction', () => {
  it('should do something', () => {
    expect(myFunction()).toBe(expected);
  });
});
```

### Integration Test
Untuk test workflow lengkap, tambahkan di `test/integration/`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { storageService } from '../../src/services/storage';

describe('Workflow Integration', () => {
  beforeEach(async () => {
    // Setup test data
    await setupTestData();
  });

  it('should complete full workflow', async () => {
    // Test step by step
    // 1. Create SO
    // 2. Create SPK
    // 3. Create PO
    // ... dst
  });
});
```

## Workflow Test Flow

Integration test menguji flow lengkap:
1. **SO Creation** - Customer order produk
2. **SPK Generation** - Work order dari SO approved
3. **PO Creation** - Purchase order untuk material dari SPK
4. **GRN** - Goods receipt dari PO
5. **Production** - Produksi dari SPK
6. **QC Check** - Quality control
7. **Delivery** - Surat jalan ke customer
8. **Invoice** - Tagih customer
9. **Payment** - Bayar supplier untuk material

Semua link dan status di-verify di setiap step.

