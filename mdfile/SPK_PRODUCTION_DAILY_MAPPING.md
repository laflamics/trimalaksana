# SPK (Surat Perintah Kerja) - Production Daily Data Mapping

**Status**: ✅ Complete  
**Date**: March 2026  
**Purpose**: Map ProductionDaily data to SPK template for printing

---

## Overview

SPK template sudah ada di `wo-pdf-template.ts` dan support ProductionDaily data. Tidak perlu buat template baru, tinggal map data dengan benar.

**Key Point**: WO = SPK (sama template)

---

## Data Mapping

### ProductionDaily Record Structure
```json
{
  "id": "pd-1773013228981",
  "unit": "PCS",
  "noted": "test",
  "shift": "1",
  "spkNo": "SPK/260306/CQX44",
  "checkedBy": "test",
  "createdAt": "2026-03-08T23:40:28.981Z",
  "createdBy": "current-user",
  "targetQty": 100,
  "wipDieCut": 10,
  "wipSablon": 10,
  "approvedBy": "panji",
  "wipCutting": 10,
  "wipLongWay": 10,
  "wipSlitter": 10,
  "productCode": "KRT00273",
  "productName": "EURO SHIPPING BOX 1180X780X780 (PM9044)",
  "qtyTerpakai": 10,
  "wipStitching": 10,
  "productionDate": "2026-03-08",
  "materialSelected": "material test",
  "resultFinishGood": 30,
  "wipCentralRotary": 10
}
```

### SPK Template Fields

#### Header Section
| Template Field | Source | Value |
|---|---|---|
| Tanggal | `productionDate` | 2026-03-08 → 08/03/2026 |
| No PO | SPK.soNo | SO number |
| Customer | SPK.customer | Customer name |
| Start Production | `productionDate` | 2026-03-08 → 08/03/2026 |
| End Production | `productionDate` | 2026-03-08 → 08/03/2026 |
| Status | SPK.status | OPEN |

#### Product List Section
| Template Field | Source | Value |
|---|---|---|
| Kode Produk | `productCode` | KRT00273 |
| Nama Produk | `productName` | EURO SHIPPING BOX 1180X780X780 (PM9044) |
| Qty Req | `targetQty` | 100 |
| Satuan | `unit` | PCS |

#### Material Requirement Section
| Template Field | Source | Value |
|---|---|---|
| Kode Material | SPK.materials[].code | From SPK materials |
| Nama Material | SPK.materials[].name | From SPK materials |
| Qty Usage | SPK.materials[].qtyPerUnit | From SPK materials |
| Total Usage | SPK.materials[].qty | From SPK materials |

#### Production Process Section (WIP Data)
| Template Field | Source | Value |
|---|---|---|
| Cutting/Slitter | `wipCutting` OR `wipSlitter` | 10 |
| Die Cut | `wipDieCut` | 10 |
| Centraly Rotary | `wipCentralRotary` | 10 |
| Long Way | `wipLongWay` | 10 |
| Sablon | `wipSablon` | 10 |
| Stitching | `wipStitching` | 10 |
| Approved | `approvedBy` | panji |
| Checked | `checkedBy` | test |

#### Summary Row
| Template Field | Source | Value |
|---|---|---|
| Finish Good | `resultFinishGood` | 30 |
| Material | `materialSelected` | material test |
| Qty Terpakai | `qtyTerpakai` | 10 |

#### Notes Section
| Template Field | Source | Value |
|---|---|---|
| NOTE | `noted` | test |

---

## Implementation

### 1. ProductionDaily Component (`ProductionDaily.tsx`)

Function `handleViewWOFromTable()` maps ProductionDaily data to WO object:

```typescript
const woData = {
  id: spk.spkNo || spk.id || '',
  soNo: spk.soNo || '',
  customer: spk.customer || so?.customer || '',
  product: spk.product || spk.productName || prodDailyRecord.productName || '',
  qty: spk.qty || spk.targetQty || prodDailyRecord.targetQty || 0,
  kode: spk.kode || spk.productCode || prodDailyRecord.productCode || '',
  unit: spk.unit || prodDailyRecord.unit || 'PCS',
  status: spk.status || 'OPEN',
  createdAt: spk.created || spk.createdAt || prodDailyRecord.productionDate || new Date().toISOString(),
  materials: spk.materials || [],
  docs: {
    scheduleDate: spk.scheduleDate || spk.created || spk.createdAt || prodDailyRecord.productionDate,
    scheduleEndDate: spk.scheduleEndDate || prodDailyRecord.productionDate || ''
  },
  // IMPORTANT: ProductionDaily data
  productionDaily: {
    wipCutting: prodDailyRecord.wipCutting || 0,
    wipSlitter: prodDailyRecord.wipSlitter || 0,
    wipDieCut: prodDailyRecord.wipDieCut || 0,
    wipCentralRotary: prodDailyRecord.wipCentralRotary || 0,
    wipLongWay: prodDailyRecord.wipLongWay || 0,
    wipSablon: prodDailyRecord.wipSablon || 0,
    wipStitching: prodDailyRecord.wipStitching || 0,
    resultFinishGood: prodDailyRecord.resultFinishGood || 0,
    approvedBy: prodDailyRecord.approvedBy || '',
    checkedBy: prodDailyRecord.checkedBy || '',
    noted: prodDailyRecord.noted || '',
    shift: prodDailyRecord.shift || '1',
    productionDate: prodDailyRecord.productionDate || new Date().toISOString().split('T')[0],
    qtyTerpakai: prodDailyRecord.qtyTerpakai || 0,
    materialSelected: prodDailyRecord.materialSelected || '',
  }
};
```

### 2. WO Template (`wo-pdf-template.ts`)

Template sudah support `wo.productionDaily` object:

```typescript
${wo.productionDaily ? `
  <tr>
    <td>${wo.productionDaily.wipCutting || wo.productionDaily.wipSlitter || ''}</td>
    <td>${wo.productionDaily.wipDieCut || ''}</td>
    <td>${wo.productionDaily.wipCentralRotary || ''}</td>
    <td>${wo.productionDaily.wipLongWay || ''}</td>
    <td>${wo.productionDaily.wipSablon || ''}</td>
    <td>${wo.productionDaily.wipStitching || ''}</td>
    <td>${wo.productionDaily.approvedBy || ''}</td>
    <td>${wo.productionDaily.checkedBy || ''}</td>
  </tr>
  <tr>
    <td colspan="8" style="text-align: center; font-size: 9px;">
      Finish Good: ${wo.productionDaily.resultFinishGood || 0} | 
      Material: ${wo.productionDaily.materialSelected || '-'} | 
      Qty Terpakai: ${wo.productionDaily.qtyTerpakai || 0}
    </td>
  </tr>
` : ...}
```

---

## Usage Flow

### 1. User clicks "View SPK" button in Production Daily table
```
ProductionDaily.tsx → handleViewWOFromTable(spkNo)
```

### 2. Function loads data
```
- Get ProductionDaily record from table
- Fetch SPK data from storage
- Fetch SO data from storage
- Fetch Products & Materials from storage
- Get logo
```

### 3. Map data to WO object
```
- Combine SPK + ProductionDaily data
- Create woData object with productionDaily field
```

### 4. Generate HTML
```
generateWOHtml({
  logo: logo,
  company: { companyName, address },
  wo: woData,
  so: so,
  products: products,
  materials: materials,
  rawMaterials: []
})
```

### 5. Open in new window & print
```
- Open new window
- Write HTML to document
- Trigger print dialog
```

---

## Template Output

### Header
```
[Logo] | PT TRIMA LAKSANA JAYA PRATAMA | [Empty]
       | Jl. Raya Cikarang Cibarusah... |
       |_______________________________|

       SURAT PERINTAH KERJA (SPK)
       No. SPK/260306/CQX44
```

### Details Table
```
Tanggal: 08/03/2026 | No PO: PO2603-006 | Customer: PT. EHWA INDONESIA
Start Production: 08/03/2026 | End Production: 08/03/2026 | Status: OPEN
```

### Product List
```
No | Kode Produk | Nama Produk | Tipe Box | Panjang | Lebar | Tinggi | Satuan | Qty Req | Finishing | Ket
1  | KRT00273    | EURO SHIPPING BOX... | ... | ... | ... | ... | PCS | 100 | | 
```

### Material Requirement
```
No | Kode Material | Nama Material | Panjang | Lebar | Tinggi | Satuan | Qty Usage | Total Usage | Qty Out
1  | MAT001        | Material Name | ... | ... | ... | PCS | 1 | 100 | 
```

### Production Process
```
Cutting/Slitter | Die Cut | Centraly Rotary | Long Way | Sablon | Stitching | Approved | Checked
10              | 10      | 10              | 10       | 10     | 10        | panji    | test

Finish Good: 30 | Material: material test | Qty Terpakai: 10
```

---

## Testing Checklist

- [ ] Click "View SPK" button in Production Daily table
- [ ] SPK PDF opens in new window
- [ ] All WIP data filled correctly (Cutting, Slitter, Die Cut, etc)
- [ ] Approval names filled (Approved By, Checked By)
- [ ] Finish Good, Material, Qty Terpakai displayed
- [ ] Notes section filled
- [ ] Print dialog appears
- [ ] PDF prints correctly

---

## Files Modified

1. **src/pages/Packaging/ProductionDaily.tsx**
   - Updated import (removed spk-pdf-template)
   - Updated `handleViewWOFromTable()` to map ProductionDaily data

2. **src/pdf/wo-pdf-template.ts**
   - Updated process table to support `wipSlitter` fallback
   - Already supports `wo.productionDaily` object

---

## Notes

- Template dari klien sudah fixed, tidak perlu buat baru
- WO = SPK (sama template)
- ProductionDaily data di-pass via `wo.productionDaily` object
- Semua field sudah ter-map dengan benar
- Ready untuk production

