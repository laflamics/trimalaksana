# Invoice PDF Template Guide

## Template Locations in `src/pdf/invoice-pdf-template.ts`

### Template 1 (Default) - Lines 1-816
- **Description**: Default invoice template
- **Used when**: `templateType` is not specified or is 'template1'
- **Body Padding**: `5mm 2px 10mm 2px` (top: 5mm)
- **Page Margin**: `1mm 2px 1mm 2px`
- **Features**:
  - Logo on left with negative margin (-0.5cm)
  - Invoice title centered
  - Company info on right
  - Standard layout

### Template 2 - Lines 819-1524
- **Description**: Layout baru sesuai spesifikasi
- **Used when**: `templateType === 'template2'`
- **Body Padding**: `10mm 2px 10mm 2px` (top: 10mm)
- **Page Margin**: `10mm 2px 10mm 2px`
- **Features**:
  - New layout specification
  - Different header arrangement

### Template 3 - Lines 1527-2153
- **Description**: Alternative layout
- **Used when**: `templateType === 'template3'`
- **Body Padding**: `10mm 2px 10mm 2px` (top: 10mm)
- **Page Margin**: `10mm 2px 10mm 2px`
- **Features**:
  - Variant of template 2

### Template 4 - Lines 2156-2837
- **Description**: Mirip template 2 tapi terbilang di dalam table paling bawah
- **Used when**: `templateType === 'template4'`
- **Body Padding**: `10mm 2px 10mm 2px` (top: 10mm)
- **Page Margin**: `10mm 2px 10mm 2px`
- **Features**:
  - Similar to template 2
  - "Terbilang" (amount in words) placed in bottom table

## Recent Fixes

### Fixed Issues:
1. ✅ Removed negative top margins that were cutting off headers
2. ✅ Added proper top padding to body (5mm for template1, 10mm for others)
3. ✅ Adjusted page margins to prevent content cutoff

### Current Status:
- Template 1: 5mm top padding (balanced for logo positioning)
- Templates 2-4: 10mm top padding (more space at top)
- All negative margins removed except where needed for layout

## How to Use

When generating invoices, specify the template:
```javascript
generateInvoiceHtml({
  logo,
  company,
  inv,
  templateType: 'template1' // or 'template2', 'template3', 'template4'
})
```

If `templateType` is not specified, it defaults to template1.
