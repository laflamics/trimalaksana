# Panduan Pengguna - Sistem ERP Trima Laksana

**Versi**: 1.0  
**Diperbarui**: Februari 2026  
**Sistem**: Enterprise Resource Planning (ERP) untuk Multi-Bisnis

---

## Daftar Isi

1. [Memulai](#memulai)
2. [Gambaran Sistem](#gambaran-sistem)
3. [Login & Autentikasi](#login--autentikasi)
4. [Unit Bisnis](#unit-bisnis)
5. [Modul General Trading](#modul-general-trading)
6. [Modul Packaging](#modul-packaging)
7. [Modul Trucking](#modul-trucking)
8. [Keuangan & Akuntansi](#keuangan--akuntansi)
9. [Manajemen Data Master](#manajemen-data-master)
10. [Tugas & Alur Kerja Umum](#tugas--alur-kerja-umum)
11. [Laporan & Analitik](#laporan--analitik)
12. [Pengaturan & Konfigurasi](#pengaturan--konfigurasi)
13. [Pemecahan Masalah](#pemecahan-masalah)
14. [FAQ](#faq)

---

## Memulai

### Persyaratan Sistem

- **Browser**: Chrome, Firefox, Safari, atau Edge (versi terbaru)
- **Internet**: Koneksi stabil (WiFi atau LAN)
- **Perangkat**: Desktop, Laptop, atau Tablet
- **Resolusi Layar**: Minimum 1024x768 (disarankan 1920x1080)

### Login Pertama Kali

1. Buka aplikasi di browser Anda
2. Masukkan **Username** dan **Password**
3. Klik **Login**
4. Pilih **Unit Bisnis** Anda (Packaging, General Trading, atau Trucking)
5. Anda akan diarahkan ke Dashboard

### Mengubah Password

1. Pergi ke **Pengaturan** → **Profil Pengguna**
2. Klik **Ubah Password**
3. Masukkan password saat ini
4. Masukkan password baru (minimum 8 karakter)
5. Konfirmasi password baru
6. Klik **Simpan**

---

## Gambaran Sistem

### Apa itu ERP Trima Laksana?

ERP Trima Laksana adalah sistem manajemen bisnis terintegrasi yang dirancang untuk menyederhanakan operasi di tiga unit bisnis:

- **Packaging**: Manajemen manufaktur dan produksi
- **General Trading**: Operasi perdagangan dan distribusi
- **Trucking**: Manajemen logistik dan transportasi

### Fitur Utama

✅ **Sinkronisasi Data Real-time** - Perubahan tersinkronisasi instan di semua perangkat  
✅ **Dukungan Multi-Perangkat** - Bekerja dari desktop, laptop, atau tablet  
✅ **Kemampuan Offline** - Lanjutkan bekerja tanpa internet  
✅ **Pencatatan Aktivitas** - Jejak audit lengkap semua tindakan  
✅ **Akses Berbasis Peran** - Kontrol akses aman berdasarkan peran pengguna  
✅ **Laporan PDF** - Buat dokumen profesional  
✅ **Integrasi Excel** - Impor/ekspor data dengan mudah  

### Gambaran Dashboard

Dashboard menampilkan:
- **Statistik Cepat**: Metrik kunci dan KPI
- **Aktivitas Terbaru**: Transaksi terbaru
- **Tugas Tertunda**: Item yang memerlukan perhatian
- **Notifikasi**: Peringatan dan pengingat sistem

---

## Login & Autentikasi

### Masuk ke Sistem

1. Masukkan **Username** Anda
2. Masukkan **Password** Anda
3. Klik **Login**

**Catatan**: Akun Anda akan dikunci setelah 5 percobaan login gagal. Hubungi administrator untuk membukanya.

### Keluar dari Sistem

1. Klik **Ikon Profil** (sudut kanan atas)
2. Klik **Logout**
3. Anda akan diarahkan ke halaman login

### Autentikasi Dua Faktor (jika diaktifkan)

1. Masukkan username dan password
2. Masukkan kode 6 digit dari aplikasi autentikator Anda
3. Klik **Verifikasi**

### Waktu Habis Sesi

- Sesi secara otomatis berakhir setelah **30 menit** tidak aktif
- Anda akan diminta untuk login kembali
- Pekerjaan yang belum disimpan akan hilang

---

## Unit Bisnis

### Beralih Unit Bisnis

1. Klik **Pemilih Unit Bisnis** (kiri atas)
2. Pilih unit yang diinginkan:
   - 📦 **Packaging** - Produksi & manufaktur
   - 🏪 **General Trading** - Perdagangan & distribusi
   - 🚚 **Trucking** - Logistik & transportasi
3. Sistem akan memuat ulang dengan data unit yang dipilih

### Izin Unit Bisnis

Akses Anda tergantung pada peran dan unit bisnis yang ditugaskan. Jika Anda tidak melihat unit bisnis, hubungi administrator.

---

## General Trading Module

### Overview

General Trading handles buying and selling of products. Main workflows:

**Sales Flow**: Sales Order → Delivery → Invoice → Payment  
**Purchase Flow**: Purchase Request → Purchase Order → GRN → Payment

### Sales Orders

#### Creating a Sales Order

1. Go to **Sales Orders** → **New Sales Order**
2. Fill in the details:
   - **Customer**: Select from dropdown
   - **Order Date**: Today's date (auto-filled)
   - **Delivery Date**: When customer expects delivery
   - **Items**: Add products and quantities
3. Click **Save**
4. Status changes to **DRAFT**

#### Confirming a Sales Order

1. Open the Sales Order
2. Review all details
3. Click **Confirm**
4. Status changes to **OPEN**
5. System creates a Delivery Note automatically

#### Canceling a Sales Order

1. Open the Sales Order (must be in DRAFT status)
2. Click **Cancel**
3. Status changes to **CANCELLED**
4. Cannot be undone

### Delivery Notes

#### Creating a Delivery Note

1. Go to **Delivery Notes** → **New Delivery Note**
2. Select the **Sales Order** to deliver
3. Verify items and quantities
4. Enter **Delivery Date** and **Driver Info**
5. Click **Save**

#### Completing a Delivery

1. Open the Delivery Note
2. Click **Mark as Delivered**
3. Enter **Actual Delivery Date**
4. Click **Confirm**
5. System creates an Invoice automatically

### Invoices

#### Viewing Invoices

1. Go to **Finance** → **Invoices**
2. See all invoices with status:
   - **DRAFT**: Not yet sent
   - **SENT**: Sent to customer
   - **PAID**: Payment received
   - **OVERDUE**: Payment past due date

#### Sending an Invoice

1. Open the Invoice
2. Click **Send to Customer**
3. Enter customer email (optional)
4. Click **Confirm**
5. Status changes to **SENT**

#### Recording Payment

1. Open the Invoice (status: SENT)
2. Click **Record Payment**
3. Enter **Payment Amount** and **Date**
4. Select **Payment Method** (Cash, Bank Transfer, Check)
5. Click **Save**
6. Status changes to **PAID**

### Purchase Orders

#### Creating a Purchase Order

1. Go to **Purchasing** → **New Purchase Order**
2. Select **Supplier**
3. Add items and quantities
4. Enter **Delivery Date**
5. Click **Save**

#### Confirming a Purchase Order

1. Open the PO (status: DRAFT)
2. Review details
3. Click **Confirm**
4. Status changes to **OPEN**
5. Supplier receives notification

#### Receiving Goods (GRN)

1. Go to **Purchasing** → **Goods Receipt Notes**
2. Click **New GRN**
3. Select the **Purchase Order**
4. Verify received items and quantities
5. Click **Save**
6. Inventory is updated automatically

---

## Packaging Module

### Overview

Packaging handles manufacturing operations. Main workflow:

**Production Flow**: Sales Order → PPIC → SPK → Production → QA/QC → Delivery

### Sales Orders (Packaging)

Same as General Trading, but triggers production workflow.

### PPIC (Production Planning & Inventory Control)

#### Viewing PPIC

1. Go to **PPIC**
2. See all sales orders pending production
3. Status indicators show:
   - 🟡 **PENDING**: Waiting to start
   - 🔵 **IN_PROGRESS**: Currently producing
   - 🟢 **COMPLETED**: Ready for QC

#### Planning Production

1. Open a Sales Order in PPIC
2. Click **Plan Production**
3. Set **Production Start Date**
4. Set **Expected Completion Date**
5. Assign **Production Team**
6. Click **Save**

### SPK (Surat Perintah Kerja - Work Order)

#### Creating a Work Order

1. Go to **Production** → **Work Orders**
2. Click **New Work Order**
3. Select **Sales Order**
4. System auto-fills:
   - Product details
   - Bill of Materials (BOM)
   - Required materials
5. Click **Create**

#### Starting Production

1. Open the Work Order
2. Click **Start Production**
3. Enter **Start Time**
4. Click **Confirm**
5. Status changes to **IN_PROGRESS**

#### Completing Production

1. Open the Work Order (status: IN_PROGRESS)
2. Enter **Actual Quantity Produced**
3. Enter **End Time**
4. Click **Complete**
5. Status changes to **COMPLETED**

### QA/QC (Quality Assurance/Control)

#### Inspecting Products

1. Go to **QA/QC** → **Inspections**
2. Click **New Inspection**
3. Select the **Work Order**
4. Perform quality checks:
   - Visual inspection
   - Dimension verification
   - Functionality test
5. Mark items as **PASS** or **FAIL**

#### Rejecting Products

1. Open the Inspection
2. Mark items as **FAIL**
3. Enter **Rejection Reason**
4. Click **Submit**
5. Work Order returns to production

#### Approving Products

1. Open the Inspection
2. Mark all items as **PASS**
3. Click **Approve**
4. Products ready for delivery

### Production Delivery

1. Go to **Delivery Notes**
2. Click **New Delivery Note**
3. Select the **Work Order** (must be QC approved)
4. Verify quantities
5. Click **Save**
6. Follow same process as General Trading delivery

---

## Trucking Module

### Overview

Trucking manages logistics and transportation. Main features:

- Vehicle management
- Driver management
- Route planning
- Delivery orders
- Surat Jalan (shipping documents)

### Vehicles

#### Adding a Vehicle

1. Go to **Master Data** → **Vehicles**
2. Click **Add Vehicle**
3. Enter details:
   - **License Plate**: Vehicle registration
   - **Type**: Truck, Van, Motorcycle, etc.
   - **Capacity**: Maximum load capacity
   - **Status**: Active/Inactive
4. Click **Save**

#### Maintenance Tracking

1. Open the Vehicle
2. Go to **Maintenance History**
3. Click **Add Maintenance Record**
4. Enter:
   - **Date**: When maintenance was done
   - **Type**: Oil change, Tire replacement, etc.
   - **Cost**: Maintenance cost
   - **Notes**: Additional details
5. Click **Save**

### Drivers

#### Adding a Driver

1. Go to **Master Data** → **Drivers**
2. Click **Add Driver**
3. Enter details:
   - **Name**: Full name
   - **License Number**: Driver's license
   - **Phone**: Contact number
   - **Status**: Active/Inactive
4. Click **Save**

#### Driver Performance

1. Open the Driver
2. View **Performance Metrics**:
   - Total deliveries
   - On-time delivery rate
   - Customer ratings
   - Incidents/complaints

### Delivery Orders

#### Creating a Delivery Order

1. Go to **Delivery Orders** → **New Order**
2. Select **Customer** and **Delivery Address**
3. Add items to deliver
4. Assign **Driver** and **Vehicle**
5. Set **Delivery Date** and **Time Window**
6. Click **Save**

#### Tracking Delivery

1. Open the Delivery Order
2. View **Status**:
   - 🟡 **PENDING**: Waiting to start
   - 🔵 **IN_TRANSIT**: On the way
   - 🟢 **DELIVERED**: Completed
3. See **Driver Location** (if GPS enabled)
4. View **Estimated Arrival Time**

### Surat Jalan (Shipping Document)

#### Generating Surat Jalan

1. Open the Delivery Order
2. Click **Generate Surat Jalan**
3. Review document details
4. Click **Print** or **Save as PDF**
5. Give to driver before departure

#### Completing Delivery

1. Driver receives Surat Jalan
2. Delivers goods to customer
3. Customer signs the document
4. Driver returns signed document
5. Upload photo/scan in system
6. Status changes to **DELIVERED**

---

## Finance & Accounting

### Overview

Finance module handles:
- Invoicing and payments
- Accounts Receivable (AR)
- Accounts Payable (AP)
- Tax management
- Financial reports

### Accounts Receivable (AR)

#### Viewing AR

1. Go to **Finance** → **Accounts Receivable**
2. See all customer invoices:
   - **Outstanding**: Not yet paid
   - **Overdue**: Past due date
   - **Paid**: Payment received

#### Collecting Payment

1. Open the Invoice
2. Click **Send Reminder**
3. Enter reminder message
4. Click **Send**
5. Customer receives email reminder

#### Recording Payment

1. Open the Invoice
2. Click **Record Payment**
3. Enter:
   - **Amount**: Payment received
   - **Date**: Payment date
   - **Method**: Cash, Bank Transfer, Check
   - **Reference**: Check number or bank reference
4. Click **Save**

### Accounts Payable (AP)

#### Viewing AP

1. Go to **Finance** → **Accounts Payable**
2. See all supplier invoices:
   - **Outstanding**: Not yet paid
   - **Overdue**: Past due date
   - **Paid**: Payment made

#### Paying Supplier

1. Open the Supplier Invoice
2. Click **Pay Invoice**
3. Enter:
   - **Amount**: Payment amount
   - **Date**: Payment date
   - **Method**: Bank Transfer, Check, Cash
   - **Reference**: Bank reference or check number
4. Click **Confirm**
5. Status changes to **PAID**

### Tax Management

#### Recording Tax

1. Go to **Finance** → **Tax Management**
2. Click **New Tax Record**
3. Enter:
   - **Type**: VAT, PPh, etc.
   - **Amount**: Tax amount
   - **Date**: Tax date
   - **Reference**: Invoice or document number
4. Click **Save**

#### Tax Reports

1. Go to **Finance** → **Tax Reports**
2. Select **Period** (monthly, quarterly, yearly)
3. Click **Generate Report**
4. View or download as PDF

### Financial Reports

#### Viewing Reports

1. Go to **Finance** → **Reports**
2. Available reports:
   - **Income Statement**: Revenue and expenses
   - **Balance Sheet**: Assets, liabilities, equity
   - **Cash Flow**: Money in and out
   - **Trial Balance**: All accounts summary

#### Generating Reports

1. Select the report type
2. Choose **Period** (date range)
3. Click **Generate**
4. View on screen or download as PDF/Excel

---

## Master Data Management

### Products

#### Adding a Product

1. Go to **Master Data** → **Products**
2. Click **Add Product**
3. Enter details:
   - **Code**: Unique product code
   - **Name**: Product name
   - **Category**: Product category
   - **Unit**: Unit of measurement (pcs, kg, etc.)
   - **Price**: Selling price
   - **Cost**: Purchase cost
   - **Stock**: Current stock level
4. Click **Save**

#### Updating Product

1. Open the Product
2. Click **Edit**
3. Modify details
4. Click **Save**

#### Deleting Product

1. Open the Product
2. Click **Delete**
3. Confirm deletion
4. Product is removed (cannot be undone)

### Customers

#### Adding a Customer

1. Go to **Master Data** → **Customers**
2. Click **Add Customer**
3. Enter details:
   - **Code**: Unique customer code
   - **Name**: Company/person name
   - **Contact Person**: Name of contact
   - **Phone**: Phone number
   - **Email**: Email address
   - **Address**: Full address
   - **City**: City name
   - **Payment Terms**: Net 30, Net 60, etc.
4. Click **Save**

#### Updating Customer

1. Open the Customer
2. Click **Edit**
3. Modify details
4. Click **Save**

### Suppliers

#### Adding a Supplier

1. Go to **Master Data** → **Suppliers**
2. Click **Add Supplier**
3. Enter details:
   - **Code**: Unique supplier code
   - **Name**: Company name
   - **Contact Person**: Contact name
   - **Phone**: Phone number
   - **Email**: Email address
   - **Address**: Full address
   - **Payment Terms**: Net 30, Net 60, etc.
4. Click **Save**

---

## Common Tasks & Workflows

### Complete Sales Workflow (General Trading)

**Step 1: Create Sales Order**
- Go to Sales Orders → New
- Select customer
- Add products and quantities
- Save

**Step 2: Confirm Sales Order**
- Open the SO
- Review details
- Click Confirm
- Status: OPEN

**Step 3: Create Delivery Note**
- Go to Delivery Notes → New
- Select the SO
- Verify items
- Save

**Step 4: Complete Delivery**
- Open Delivery Note
- Click Mark as Delivered
- Enter actual delivery date
- Confirm

**Step 5: Send Invoice**
- Open the Invoice (auto-created)
- Click Send to Customer
- Customer receives invoice

**Step 6: Record Payment**
- Open the Invoice
- Click Record Payment
- Enter payment details
- Save
- Status: PAID

### Complete Production Workflow (Packaging)

**Step 1: Create Sales Order**
- Go to Sales Orders → New
- Select customer
- Add products
- Save and Confirm

**Step 2: Plan Production (PPIC)**
- Go to PPIC
- Select the SO
- Click Plan Production
- Set dates and team
- Save

**Step 3: Create Work Order (SPK)**
- Go to Production → Work Orders
- Click New
- Select SO
- System auto-fills BOM
- Create

**Step 4: Start Production**
- Open Work Order
- Click Start Production
- Enter start time
- Confirm

**Step 5: Complete Production**
- Open Work Order
- Enter actual quantity produced
- Enter end time
- Click Complete

**Step 6: Quality Inspection (QA/QC)**
- Go to QA/QC → Inspections
- Click New
- Select Work Order
- Perform checks
- Mark as PASS or FAIL

**Step 7: Create Delivery Note**
- Go to Delivery Notes → New
- Select Work Order
- Verify quantities
- Save

**Step 8: Complete Delivery & Invoice**
- Mark delivery as complete
- Invoice auto-created
- Record payment

---

## Reports & Analytics

### Available Reports

#### Sales Reports
- **Sales by Customer**: Total sales per customer
- **Sales by Product**: Total sales per product
- **Sales Trend**: Sales over time
- **Top Customers**: Best performing customers

#### Purchase Reports
- **Purchases by Supplier**: Total purchases per supplier
- **Purchase Trend**: Purchases over time
- **Top Suppliers**: Best suppliers

#### Inventory Reports
- **Stock Level**: Current stock of all products
- **Stock Movement**: Stock in/out history
- **Low Stock Alert**: Products below reorder level
- **Inventory Valuation**: Total inventory value

#### Financial Reports
- **Income Statement**: Revenue and expenses
- **Balance Sheet**: Assets, liabilities, equity
- **Cash Flow**: Money movements
- **Profit & Loss**: P&L statement

### Generating Reports

1. Go to **Reports** section
2. Select report type
3. Choose **Period** (date range)
4. Click **Generate**
5. View on screen or download

### Exporting Data

1. Open any report
2. Click **Export**
3. Choose format:
   - **PDF**: For printing
   - **Excel**: For analysis
   - **CSV**: For data import
4. File downloads automatically

---

## Settings & Configuration

### User Profile

#### Updating Profile

1. Click **Profile Icon** (top-right)
2. Click **My Profile**
3. Edit details:
   - Name
   - Email
   - Phone
   - Department
4. Click **Save**

#### Changing Password

1. Go to **Settings** → **Change Password**
2. Enter current password
3. Enter new password
4. Confirm new password
5. Click **Save**

### Preferences

#### Setting Preferences

1. Go to **Settings** → **Preferences**
2. Configure:
   - **Language**: System language
   - **Date Format**: DD/MM/YYYY or MM/DD/YYYY
   - **Currency**: Display currency
   - **Timezone**: Your timezone
   - **Notifications**: Email alerts on/off
3. Click **Save**

### Company Settings

#### Updating Company Info

1. Go to **Settings** → **Company Settings** (Admin only)
2. Edit:
   - Company name
   - Address
   - Phone
   - Email
   - Logo
   - Tax ID
3. Click **Save**

---

## Troubleshooting

### Common Issues

#### Issue: Cannot Login

**Solution**:
1. Check username and password are correct
2. Verify CAPS LOCK is off
3. If account locked, contact administrator
4. Try clearing browser cache and cookies
5. Try different browser

#### Issue: Data Not Syncing

**Solution**:
1. Check internet connection
2. Refresh the page (F5)
3. Check if server is online
4. Try logging out and back in
5. Contact IT support if persists

#### Issue: Slow Performance

**Solution**:
1. Close other browser tabs
2. Clear browser cache
3. Reduce number of rows displayed
4. Use filters to narrow data
5. Try different browser
6. Check internet speed

#### Issue: Cannot Print/Export

**Solution**:
1. Check browser print settings
2. Ensure PDF reader is installed
3. Try different browser
4. Check file permissions
5. Contact IT support

#### Issue: Lost Unsaved Work

**Solution**:
1. Session timeout after 30 minutes of inactivity
2. Always click **Save** before leaving page
3. Use browser back button carefully
4. Contact administrator if data lost

### Getting Help

**Contact IT Support**:
- Email: support@trimalaksana.com
- Phone: +62-XXX-XXXX-XXXX
- Hours: Monday-Friday, 8 AM - 5 PM

**Report a Bug**:
1. Go to **Settings** → **Report Issue**
2. Describe the problem
3. Attach screenshot if possible
4. Click **Submit**

---

## FAQ

### General Questions

**Q: Can I access the system from my phone?**  
A: Yes, the system is responsive and works on tablets and phones. For best experience, use a tablet or desktop.

**Q: What if I forget my password?**  
A: Click "Forgot Password" on login page. You'll receive an email with reset link.

**Q: Can I work offline?**  
A: Limited offline capability. Some features require internet connection. Changes sync when you reconnect.

**Q: How often is data backed up?**  
A: Data is backed up automatically every hour. Contact IT for backup details.

### Sales & Orders

**Q: Can I edit a confirmed sales order?**  
A: No, confirmed orders cannot be edited. You must cancel and create a new one.

**Q: What happens if customer cancels order?**  
A: Contact your manager. Cancellation process depends on order status.

**Q: Can I create partial delivery?**  
A: Yes, you can deliver part of the order and complete the rest later.

### Inventory & Stock

**Q: How is stock calculated?**  
A: Stock = Opening Stock + Purchases - Sales - Returns

**Q: What is reorder level?**  
A: Minimum stock level. System alerts when stock falls below this.

**Q: Can I adjust stock manually?**  
A: Only administrators can adjust stock. Contact your manager.

### Finance & Payments

**Q: When should I record payment?**  
A: Record payment when you actually receive money from customer.

**Q: Can I delete an invoice?**  
A: No, invoices cannot be deleted. You can void/cancel if needed.

**Q: What payment methods are supported?**  
A: Cash, Bank Transfer, Check, Credit Card (if configured).

### Technical

**Q: What browsers are supported?**  
A: Chrome, Firefox, Safari, Edge (latest versions recommended).

**Q: Is my data secure?**  
A: Yes, all data is encrypted and backed up. Access is role-based.

**Q: Can I export all my data?**  
A: Yes, go to Settings → Export Data. Contact IT for bulk exports.

---

## Contact & Support

**System Administrator**: [Contact Info]  
**IT Support**: support@trimalaksana.com  
**Business Manager**: [Contact Info]  
**Finance Manager**: [Contact Info]  

**Support Hours**: Monday - Friday, 8 AM - 5 PM  
**Emergency**: [Emergency Contact]

---

**Last Updated**: February 2026  
**Version**: 1.0  
**For questions or feedback, contact your system administrator.**
