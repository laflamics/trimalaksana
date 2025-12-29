# E2E Testing Documentation

## 📋 Overview

Test suite ini dibuat untuk **mendeteksi semua error dan masalah** di aplikasi dengan cara:
1. ✅ Mapping semua tombol, form fields, dan actions di setiap module
2. ✅ Test semua functionality secara sistematis
3. ✅ Detect errors, broken buttons, form issues, dll

## 🚀 Quick Start

### Install Dependencies
```bash
npm install
npx playwright install
```

### Generate UI Mapping
```bash
npm run generate:ui-mapping
```
Ini akan scan semua file dan generate `test/e2e/ui-mapping.json` dengan semua buttons, fields, dll.

### 🤖 AI-Powered Tests (RECOMMENDED!)

**Generate test cases otomatis dari UI-MAPPING.md:**
```bash
npm run generate:ai-tests
```
Ini akan generate `test/e2e/auto-generated-tests.spec.ts` dengan semua test cases.

**Run AI-powered tests (auto-explore semua UI):**
```bash
npm run test:e2e:ai
```

**Run auto-generated tests:**
```bash
npm run test:e2e:auto
```

### Run Tests

**Run semua test:**
```bash
npm run test:e2e
```

**Run dengan UI mode (interaktif, recommended untuk debugging):**
```bash
npm run test:e2e:ui
```

**Run test specific:**
```bash
# Comprehensive test (semua module)
npm run test:e2e:comprehensive

# Sales Order flow only
npm run test:e2e:so

# AI-powered auto-exploration
npm run test:e2e:ai

# Auto-generated tests
npm run test:e2e:auto

# Dengan browser visible
npm run test:e2e:headed

# Debug mode
npm run test:e2e:debug
```

## 📁 File Structure

```
test/e2e/
├── README.md                    # Dokumentasi ini
├── UI-MAPPING.md               # Complete mapping semua UI elements
├── ui-mapping.json             # Auto-generated mapping (run generate script)
├── comprehensive-test.spec.ts  # Test suite lengkap semua module
├── sales-order-flow.spec.ts    # Test flow SO dari awal sampai CLOSE
├── ai-powered-test.spec.ts    # 🤖 AI-powered auto-exploration tests
├── auto-generated-tests.spec.ts # Auto-generated dari UI-MAPPING.md
└── test-generator.ts           # Helper untuk generate tests
```

## 🤖 How AI-Powered Tests Work

### 1. Auto-Exploration (`ai-powered-test.spec.ts`)
Test ini **otomatis**:
- ✅ Detect semua buttons di halaman
- ✅ Detect semua form fields
- ✅ Test semua navigation links
- ✅ Click semua buttons dan detect errors
- ✅ Fill semua form fields dan detect issues
- ✅ Generate comprehensive report

**Tidak perlu hardcode selector!** Test akan otomatis find dan test semua elements.

### 2. Auto-Generation (`auto-generated-tests.spec.ts`)
Test ini di-generate otomatis dari `UI-MAPPING.md`:
- ✅ Parse semua modules, buttons, fields dari mapping
- ✅ Generate test code untuk setiap module
- ✅ Test semua buttons dan forms secara systematic
- ✅ Report semua errors dan issues

**Cara pakai:**
```bash
# 1. Generate test cases dari mapping
npm run generate:ai-tests

# 2. Run generated tests
npm run test:e2e:auto
```

### 3. Smart Selectors
AI tests menggunakan:
- **Semantic selectors**: `button:has-text("Create")` instead of hardcoded class
- **Auto-detection**: Find elements by text, placeholder, label
- **Error handling**: Catch semua errors dan report
- **Smart waiting**: Auto-wait untuk elements muncul

## 🧪 Test Coverage

### ✅ Modules Covered

1. **Packaging Module:**
   - ✅ Sales Orders (Create, Edit, Delete, Status transitions)
   - ✅ PPIC (SPK, PTP, Schedule)
   - ✅ Purchasing (PO, GRN)
   - ✅ Production
   - ✅ QA/QC
   - ✅ Delivery Note

2. **Finance Module:**
   - ✅ Accounting (Journal Entries)
   - ✅ Payments
   - ✅ General Ledger
   - ✅ Accounts Receivable
   - ✅ Accounts Payable
   - ✅ Financial Reports

3. **Master Module:**
   - ✅ Products
   - ✅ Materials
   - ✅ Customers
   - ✅ Suppliers
   - ✅ Inventory

### ✅ Test Types

- **Button Tests:** Semua tombol bisa diklik dan tidak error
- **Form Tests:** Semua form fields bisa diisi dan validated
- **Navigation Tests:** Semua navigation bekerja
- **Status Flow Tests:** Status transitions (DRAFT → OPEN → CLOSE)
- **Filter Tests:** Search, filter, date range
- **Export/Import Tests:** Export Excel, Import Excel

## 🔍 What Gets Detected

Test ini akan detect:

1. **Broken Buttons:**
   - Button tidak bisa diklik
   - Button click error
   - Button tidak muncul

2. **Form Issues:**
   - Field tidak bisa diisi
   - Validation tidak bekerja
   - Autocomplete tidak muncul
   - Dropdown tidak bisa dipilih

3. **Navigation Errors:**
   - Route tidak load
   - Page tidak muncul
   - Tab tidak bisa diklik

4. **Status Flow Errors:**
   - Status tidak bisa diubah
   - Transition tidak bekerja
   - Button status tidak muncul

5. **Data Issues:**
   - Data tidak save
   - Data tidak load
   - Table tidak muncul

## 📊 Test Results

Setelah run test, hasilnya ada di:
- `test-results/` - Screenshots, videos, traces
- `playwright-report/` - HTML report (buka dengan `npx playwright show-report`)

## 🐛 Debugging

### Test Gagal?

1. **Cek error message** di console
2. **Buka screenshot** di `test-results/`
3. **Run dengan UI mode** untuk lihat step-by-step:
   ```bash
   npm run test:e2e:ui
   ```
4. **Run dengan debug mode**:
   ```bash
   npm run test:e2e:debug
   ```

### Update Selectors

Kalau selector berubah, update di:
- `comprehensive-test.spec.ts` - Untuk test umum
- `sales-order-flow.spec.ts` - Untuk SO flow specific

## 📝 Adding New Tests

Untuk tambah test baru:

1. **Baca UI-MAPPING.md** untuk lihat semua elements yang ada
2. **Tambah test case** di `comprehensive-test.spec.ts`
3. **Follow pattern** yang sudah ada:
   ```typescript
   test('should do something', async ({ page }) => {
     // Navigate
     await page.click('text=Module Name');
     
     // Interact
     await page.click('button:has-text("Button Text")');
     
     // Verify
     await expect(page.locator('selector')).toBeVisible();
   });
   ```

## 🎯 Best Practices

1. **Always wait** untuk elements sebelum interact
2. **Use specific selectors** (jangan generic seperti `'select'`)
3. **Check visibility** sebelum click
4. **Handle async** dengan `waitFor` atau `waitForTimeout`
5. **Verify results** setelah action

## 📞 Support

Kalau ada masalah:
1. Cek `UI-MAPPING.md` untuk lihat semua elements
2. Run `npm run generate:ui-mapping` untuk update mapping
3. Check test results di `test-results/`

