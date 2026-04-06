# Production Daily - View WO PDF Guide

**Status**: ✅ COMPLETE & WORKING  
**Date**: March 9, 2026  
**Build**: Successful  

---

## Overview

The "View WO" button in Production Daily now generates and displays a complete Work Order (SPK) PDF with all relevant information.

---

## How It Works

### 1. Button Location
- **Form Footer** (bottom of Production Daily form)
- **Green button** with 📄 icon
- **Label**: "View WO"
- **Only appears** when SPK is selected

### 2. What Happens When You Click

```
Click "View WO" Button
    ↓
Fetch SPK data from storage
    ↓
Fetch Sales Order (SO) data
    ↓
Fetch Products master data
    ↓
Fetch Materials master data
    ↓
Generate WO HTML using wo-pdf-template
    ↓
Open in new browser window
    ↓
Auto-print after 1 second
```

### 3. PDF Content

The generated WO PDF includes:

#### Header Section
- Company logo (if available)
- Company name: PT TRIMA LAKSANA JAYA PRATAMA
- Company address
- SPK title and number

#### Details Section
- **Tanggal** (Date): When SPK was created
- **No PO**: Sales Order number
- **Customer**: Customer name
- **Start Production**: Production start date
- **End Production**: Production end date
- **Status**: Current SPK status

#### Product List Table
- No (sequence number)
- Kode Produk (Product Code)
- Nama Produk (Product Name)
- Tipe Box (Box Type)
- Panjang (Length)
- Lebar (Width)
- Tinggi (Height)
- Satuan (Unit)
- Qty Req (Quantity Required)
- Finishing
- Ket (Notes)

#### Material Requirement Table
- No (sequence number)
- Kode Material (Material Code)
- Nama Material (Material Name)
- Panjang (Length)
- Lebar (Width)
- Tinggi (Height)
- Satuan (Unit)
- Qty Usage (Quantity per Unit)
- Total Usage (Total Quantity)
- Qty Out (Quantity Out)

#### Process Signature Section
- Cutting/Slitter
- Die Cut
- Centraly Rotary
- Long Way
- Sablon
- Stitching
- Approved (signature line)
- Checked (signature line)

#### Notes Section
- Special notes from Sales Order

---

## Step-by-Step Usage

### Step 1: Open Production Daily Form
1. Go to **Packaging** → **Production Daily**
2. Click **"+ New Production Daily"** button

### Step 2: Select SPK
1. In the form, search for and select an SPK
2. The form will auto-fill with SPK details
3. The "View WO" button will now be visible (green button)

### Step 3: View WO PDF
1. Click the **"📄 View WO"** button
2. A new browser window will open
3. The WO PDF will display
4. The browser's print dialog will automatically open
5. You can:
   - **Print** to physical printer
   - **Save as PDF** to your computer
   - **Cancel** to close without printing

### Step 4: Continue with Production Daily
1. After viewing WO, you can continue filling the form
2. Add Material Selected (optional)
3. Add Qty Terpakai
4. Fill other production details
5. Click **"Save Production Daily"** to save

---

## Data Sources

The View WO button fetches data from multiple sources:

| Data | Source | Storage Key |
|------|--------|-------------|
| SPK Details | Storage | `StorageKeys.PACKAGING.SPK` |
| Sales Order | Storage | `StorageKeys.PACKAGING.SALES_ORDERS` |
| Products | Storage | `StorageKeys.PACKAGING.PRODUCTS` |
| Materials | Storage | `StorageKeys.PACKAGING.MATERIALS` |
| Company Logo | Storage | `'logo'` |

---

## Error Handling

### Error: "Please select SPK first"
- **Cause**: Clicked View WO without selecting an SPK
- **Solution**: Select an SPK from the list first

### Error: "SPK not found"
- **Cause**: Selected SPK was deleted or not found in storage
- **Solution**: Refresh the page and select a different SPK

### Error: "Error generating WO PDF: [error message]"
- **Cause**: Problem fetching data or generating HTML
- **Solution**: Check browser console for details, refresh page, try again

---

## Technical Details

### Function: `handleViewWO()`

```typescript
const handleViewWO = async () => {
  // 1. Validate SPK is selected
  if (!formData.spkNo) {
    alert('Please select SPK first');
    return;
  }

  // 2. Fetch SPK data
  const spk = spkList.find((s: any) => s.spkNo === formData.spkNo);

  // 3. Fetch related data (SO, Products, Materials)
  const so = soList.find((s: any) => s.soNo === spk.soNo);
  const products = await storageService.get(StorageKeys.PACKAGING.PRODUCTS);
  const materials = await storageService.get(StorageKeys.PACKAGING.MATERIALS);

  // 4. Prepare WO data structure
  const woData = {
    id: spk.spkNo,
    soNo: spk.soNo,
    customer: spk.customer,
    // ... other fields
  };

  // 5. Generate HTML using wo-pdf-template
  const woHtml = generateWOHtml({
    logo: logo,
    company: { companyName, address },
    wo: woData,
    so: so,
    products: products,
    materials: materials,
    rawMaterials: []
  });

  // 6. Open in new window
  const newWindow = window.open('', '_blank');
  newWindow.document.open();
  newWindow.document.write(woHtml);
  newWindow.document.close();

  // 7. Auto-print after 1 second
  setTimeout(() => {
    newWindow.print();
  }, 1000);
};
```

### Template: `generateWOHtml()`
- **File**: `src/pdf/wo-pdf-template.ts`
- **Returns**: Complete HTML string with embedded CSS
- **Supports**: Print-friendly styling, logo embedding, responsive layout

---

## Browser Compatibility

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome | ✅ Full | Recommended |
| Firefox | ✅ Full | Works well |
| Safari | ✅ Full | Works well |
| Edge | ✅ Full | Works well |
| IE 11 | ❌ Not supported | Use modern browser |

---

## Print Tips

### For Best Results:
1. **Use Chrome or Firefox** - Best print quality
2. **Set margins to minimal** - More content per page
3. **Enable background graphics** - For logo and colors
4. **Use A4 paper size** - Standard size
5. **Portrait orientation** - Default

### Print Settings:
```
Margins: Minimal (8mm)
Paper Size: A4
Orientation: Portrait
Background Graphics: ON
Scale: 100%
```

---

## Troubleshooting

### WO PDF doesn't open
- **Check**: Pop-up blocker settings
- **Solution**: Allow pop-ups for this website

### Print dialog doesn't appear
- **Check**: Browser print settings
- **Solution**: Manually press Ctrl+P or Cmd+P

### Logo doesn't appear in PDF
- **Check**: Logo is stored in system
- **Solution**: Upload logo in Settings first

### Data is incomplete
- **Check**: SPK has all required fields
- **Solution**: Ensure SPK is properly filled before creating

---

## Features

✅ **Auto-generates WO PDF** from SPK data  
✅ **Includes all product details** from Sales Order  
✅ **Shows material requirements** from SPK  
✅ **Displays company logo** if available  
✅ **Print-friendly layout** with proper formatting  
✅ **Auto-print** after PDF loads  
✅ **Error handling** with user feedback  
✅ **Works offline** (uses local storage data)  

---

## Related Features

- **Material Selected**: Optional field to track material used
- **Qty Terpakai**: Quantity of material used
- **Excel Export**: Export production daily with WO data
- **Production Details**: Fill WIP data for each process

---

## Next Steps

After viewing WO:
1. Fill Material Selected (optional)
2. Fill Qty Terpakai
3. Fill Approved By and Checked By
4. Add any notes
5. Click "Save Production Daily"

---

## Support

If you encounter issues:
1. Check browser console (F12) for errors
2. Verify SPK data is complete
3. Ensure logo is uploaded
4. Try refreshing the page
5. Contact support if problem persists

---

**Last Updated**: March 9, 2026  
**Version**: 1.0.6-build.164  
**Status**: Production Ready
