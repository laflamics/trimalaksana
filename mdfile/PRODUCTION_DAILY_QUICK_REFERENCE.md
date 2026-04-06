# Production Daily - Quick Reference Card

---

## 🎯 Quick Start

### Open Production Daily
1. Go to **Packaging** → **Production Daily**
2. Click **"+ New Production Daily"**

### Select SPK
1. Search for SPK by number, product code, or name
2. Click on SPK to select
3. Form auto-fills with SPK details

### View WO PDF
1. Click green **"📄 View WO"** button
2. PDF opens in new window
3. Print dialog appears automatically
4. Print or save as PDF

### Fill Material Info
1. Enter material name/code in **"Material Selected"** (optional)
2. Enter quantity in **"Qty Terpakai"**

### Save
1. Click **"Save Production Daily"**
2. Data saved to storage

---

## 📋 Form Sections

### Section 1: SPK Selection
- Search and select SPK
- Shows SPK No, Product Code, Product Name, Qty

### Section 2: Production Details
- Production Date (auto-filled with today)
- Shift (1, 2, or 3)

### Section 3: WIP Data
- Cutting, Slitter, Die Cut, Central Rotary
- Long Way, Sablon, Stitching, Finish Good

### Section 4: Material & Approval
- **Material Selected** (optional text)
- **Qty Terpakai** (number)
- Approved By (name)
- Checked By (name)
- Notes (textarea)

---

## 🔘 Buttons

| Button | Color | Action | When |
|--------|-------|--------|------|
| View WO | Green | Open WO PDF | After SPK selected |
| Save | Blue | Save form | Always |
| Cancel | Gray | Close form | Always |
| Export Excel | Blue | Export data | In table view |

---

## 📊 Table Columns

| Column | Data |
|--------|------|
| SPK No | Work order number |
| Product Code | Product code |
| Product Name | Product name |
| Target Qty | Required quantity |
| Cutting | WIP cutting qty |
| Slitter | WIP slitter qty |
| Die Cut | WIP die cut qty |
| Central Rotary | WIP central rotary qty |
| Long Way | WIP long way qty |
| Sablon | WIP sablon qty |
| Stitching | WIP stitching qty |
| Finish Good | Final quantity |
| **Material** | Material used |
| **Qty Terpakai** | Quantity used |
| Approved By | Approver name |
| Checked By | Checker name |

---

## 🖨️ View WO PDF Contents

### Header
- Company logo
- Company name & address
- SPK title and number

### Details
- Date, PO No, Customer
- Start/End Production dates
- Status

### Product List
- Product code, name, dimensions
- Quantity required
- Finishing notes

### Material Requirement
- Material code, name, dimensions
- Quantity usage
- Total usage

### Signature Section
- Process checkboxes (Cutting, Die Cut, etc.)
- Approved & Checked signature lines

### Notes
- Special notes from Sales Order

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save form |
| Ctrl+P | Print WO PDF |
| Escape | Close form |
| Tab | Next field |
| Shift+Tab | Previous field |

---

## 🔍 Search Tips

### Search SPK by:
- **SPK Number**: "SPK-001" or "SPK/001"
- **Product Code**: "PROD-123"
- **Product Name**: "Box A4"

### Search Production Daily by:
- **SPK No**: "SPK-001"
- **Product Code**: "PROD-123"
- **Product Name**: "Box A4"

---

## 💾 Data Storage

| Data | Stored In |
|------|-----------|
| Production Daily | `productionDaily` |
| SPK | `StorageKeys.PACKAGING.SPK` |
| Sales Orders | `StorageKeys.PACKAGING.SALES_ORDERS` |
| Products | `StorageKeys.PACKAGING.PRODUCTS` |
| Materials | `StorageKeys.PACKAGING.MATERIALS` |

---

## 📤 Export to Excel

### Included Columns:
- SPK No, Product Code, Product Name
- Target Qty, Unit
- All WIP data (Cutting, Slitter, etc.)
- **Material Selected**
- **Qty Terpakai**
- Approved By, Checked By, Notes
- Created At

### File Name:
`Production_Daily_YYYY-MM-DD.xlsx`

---

## ⚠️ Common Issues

| Issue | Solution |
|-------|----------|
| View WO button not showing | Select SPK first |
| PDF doesn't open | Check pop-up blocker |
| Print dialog doesn't appear | Press Ctrl+P manually |
| Data not saving | Check browser storage quota |
| SPK not found | Refresh page and try again |

---

## 🎨 Input Field Colors

| State | Color |
|-------|-------|
| Normal | Black text on white |
| Focus | Blue border, black text |
| Dark Mode | Black text on dark bg |
| Disabled | Gray text, 50% opacity |

---

## 📱 Mobile Support

- ✅ Responsive design
- ✅ Touch-friendly buttons
- ✅ Mobile-optimized form
- ✅ Works on tablets
- ✅ Works on phones (landscape recommended)

---

## 🔐 Data Security

- ✅ Data stored locally
- ✅ No data sent to external servers
- ✅ Encrypted storage
- ✅ User access control
- ✅ Activity logging

---

## 📞 Support

### If you encounter issues:
1. Check browser console (F12)
2. Verify SPK data is complete
3. Ensure logo is uploaded
4. Try refreshing the page
5. Contact support if problem persists

### Error Messages:
- "Please select SPK first" → Select SPK before clicking View WO
- "SPK not found" → SPK was deleted, select another
- "Error generating WO PDF" → Check browser console for details

---

## 🚀 Tips & Tricks

1. **Quick SPK Search**: Type product code to find SPK quickly
2. **Auto-fill**: Form auto-fills when you select SPK
3. **Optional Fields**: Material Selected is optional, Qty Terpakai is required
4. **Batch Export**: Export all records to Excel at once
5. **Print Multiple**: Open multiple WO PDFs in different tabs

---

## 📅 Date Format

- **Production Date**: YYYY-MM-DD (e.g., 2026-03-09)
- **Display Format**: DD/MM/YYYY in PDF
- **Storage Format**: ISO 8601 (2026-03-09T10:30:00Z)

---

## 🔄 Workflow

```
1. Open Production Daily
   ↓
2. Select SPK
   ↓
3. (Optional) View WO PDF
   ↓
4. Fill Production Details
   ↓
5. Fill WIP Data
   ↓
6. Fill Material Info
   ↓
7. Fill Approval Info
   ↓
8. Save
   ↓
9. View in Table
   ↓
10. Export to Excel (optional)
```

---

## 📊 Data Validation

| Field | Required | Type | Validation |
|-------|----------|------|-----------|
| SPK No | Yes | Text | Must exist in SPK list |
| Material Selected | No | Text | Any text allowed |
| Qty Terpakai | Yes | Number | Must be >= 0 |
| Approved By | No | Text | Any text allowed |
| Checked By | No | Text | Any text allowed |
| Notes | No | Text | Any text allowed |

---

## 🎯 Best Practices

1. ✅ Always select SPK first
2. ✅ View WO PDF before starting production
3. ✅ Fill all WIP data accurately
4. ✅ Record material usage immediately
5. ✅ Save form before closing
6. ✅ Export to Excel for backup
7. ✅ Review data before printing

---

## 📝 Notes

- Material Selected is optional (for tracking purposes)
- Qty Terpakai should match actual material used
- All timestamps are auto-generated
- Data is saved immediately when you click Save
- You can edit records by selecting them from the table

---

**Last Updated**: March 9, 2026  
**Version**: 1.0.6  
**Status**: Production Ready
