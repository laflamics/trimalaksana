// Type definitions
interface Company {
  companyName?: string;
  address?: string;
  phone?: string;
}

interface Product {
  id?: string;
  sku?: string;
  name?: string;
  kode?: string;
  bom?: any;
}

interface SOLine {
  itemSku?: string;
  qty?: string | number;
  spkNo?: string;
  productName?: string;
}

interface DeliveryItem {
  product?: string;
  productCode?: string;
  qty?: number | string;
  unit?: string;
  spkNo?: string;
  soNo?: string;
}

interface DeliveryNote {
  soNo?: string;
  customer?: string;
  customerAddress?: string;
  product?: string;
  qty?: number | string;
  qtyProduced?: number | string;
  sjDate?: string;
  specNote?: string;
  items?: DeliveryItem[];
  soLines?: SOLine[];
}

interface SJData {
  sjNo?: string;
  sjDate?: string;
  driver?: string;
  vehicleNo?: string;
}

interface GenerateSuratJalanHtmlParams {
  logo?: string;
  company?: Company;
  item: DeliveryNote;
  sjData?: SJData;
  products?: Product[];
}

export function generateSuratJalanHtml({
  logo,
  company,
  item,
  sjData,
  products = []
}: GenerateSuratJalanHtmlParams): string {
  // Logo harus sudah base64 string (dari component yang memanggil template ini)
  // Fallback ke placeholder base64 jika tidak ada
  const logoSrc = logo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwN2JmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxPR088L3RleHQ+PC9zdmc+';
  
  // Helper tanggal — format YYYY-MM-DD
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) {
      const d = new Date();
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    }
    try {
      const d = new Date(dateStr);
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    } catch {
      return dateStr || '';
    }
  };

  // Find product helper
  const findProductByItemSku = (itemSku: string) => {
    if (!itemSku) return null;
    const key = String(itemSku).trim().toUpperCase();
    return products.find(p => 
      (String(p.sku || '').toUpperCase() === key) || 
      (String(p.id || '').toUpperCase() === key) ||
      (String(p.kode || '').toUpperCase() === key)
    ) || null;
  };

  // Get productCodeDisplay preference (default: 'padCode')
  const productCodeDisplay = (item as any).productCodeDisplay || 'padCode';

  // Prepare main product values (baris pertama sesuai SO line 1)
  // ITEM ambil dari productName di soLines (dari SPK no dan Product di delivery items)
  let mainProductName = item.product || '';
  let mainProductId = item.product || '';
  let mainProductUnit = 'PCS';

  // Helper function untuk mendapatkan product code berdasarkan preference
  // Prioritas: Pad Code → KRT (kodeIpos) → Code/SKU
  const getProductCode = (product: any, defaultCode: string): string => {
    if (productCodeDisplay === 'padCode') {
      // Default: Pad Code → KRT (kodeIpos) → Code/SKU
      return product?.padCode || product?.kodeIpos || product?.sku || product?.kode || product?.id || defaultCode;
    } else {
      // Product ID / SKU ID (tetap dengan prioritas yang sama)
      return product?.padCode || product?.kodeIpos || product?.sku || product?.kode || product?.id || defaultCode;
    }
  };

  if (item.soLines && item.soLines.length > 0) {
    const first = item.soLines[0];
    // Prioritaskan productName dari soLines (dari delivery items)
    if (first.productName) {
      mainProductName = first.productName;
    }
    const sku = first.itemSku || '';
    if (sku) {
      const found = findProductByItemSku(sku);
      if (found) {
        // PRODUCT CODE berdasarkan preference (Pad Code atau Product ID)
        mainProductId = getProductCode(found, sku);
        // Jika productName belum ada, gunakan nama dari master product
        if (!first.productName) {
          mainProductName = found.name || sku;
        }
        const bom = (found as any).bom;
        if (bom) {
          if (Array.isArray(bom)) {
            mainProductUnit = bom[0]?.unit || mainProductUnit;
          } else if (bom.materials && Array.isArray(bom.materials)) {
            mainProductUnit = bom.materials[0]?.unit || mainProductUnit;
          }
        }
      } else {
        // Jika tidak ditemukan, gunakan SKU sebagai ID
        mainProductId = sku;
        if (!first.productName) {
          mainProductName = sku;
        }
      }
    }
  } else if (item.product) {
    const found = findProductByItemSku(String(item.product));
    if (found) {
      mainProductName = found.name || mainProductName;
      // PRODUCT CODE berdasarkan preference (Pad Code atau Product ID)
      mainProductId = getProductCode(found, mainProductId);
      const bom = (found as any).bom;
      if (bom) {
        if (Array.isArray(bom)) mainProductUnit = bom[0]?.unit || mainProductUnit;
        else if (bom.materials && Array.isArray(bom.materials)) mainProductUnit = bom.materials[0]?.unit || mainProductUnit;
      }
    }
  }

  const sj = sjData || { sjNo: '', sjDate: '', driver: '', vehicleNo: '' };
  const companyName = company?.companyName || 'PT. TRIMA LAKSANA JAYA PRATAMA';
  const fullAddress = 'Jl. Raya Cikarang Cibarusah Kp. Kukun RT 11/06 Desa Ciantra Kecamatan Cikarang Selatan Kabupaten Bekasi';
  
  // Split alamat menjadi 2 baris dengan cara yang lebih sederhana dan memastikan semua muncul
  let addressLine1 = '';
  let addressLine2 = '';
  
  // Cari posisi split yang tepat - cari koma terakhir atau "Kabupaten" untuk split
  const kabupatenIndex = fullAddress.toLowerCase().indexOf('kabupaten');
  const lastCommaIndex = fullAddress.lastIndexOf(',');
  
  if (kabupatenIndex !== -1) {
    // Split di "Kabupaten" - baris 1 sampai sebelum "Kabupaten", baris 2 dari "Kabupaten"
    addressLine1 = fullAddress.substring(0, kabupatenIndex).trim();
    addressLine2 = fullAddress.substring(kabupatenIndex).trim();
  } else if (lastCommaIndex !== -1 && lastCommaIndex > fullAddress.length * 0.4) {
    // Jika ada koma di posisi > 40% dari panjang, split di koma terakhir
    addressLine1 = fullAddress.substring(0, lastCommaIndex).trim();
    addressLine2 = fullAddress.substring(lastCommaIndex + 1).trim();
  } else {
    // Coba split di tengah jika alamat terlalu panjang
    const words = fullAddress.split(/\s+/);
    if (words.length > 8) {
      // Split di tengah jumlah kata
      const midPoint = Math.ceil(words.length / 2);
      addressLine1 = words.slice(0, midPoint).join(' ');
      addressLine2 = words.slice(midPoint).join(' ');
    } else {
      // Alamat pendek, semua di baris 1
      addressLine1 = fullAddress;
      addressLine2 = '';
    }
  }
  
  // Validasi final: pastikan semua bagian alamat ada (tidak ada yang hilang)
  const combinedAddress = (addressLine1 + ' ' + addressLine2).trim().replace(/\s+/g, ' ');
  const normalizedFull = fullAddress.replace(/\s+/g, ' ').trim();
  if (combinedAddress.length < normalizedFull.length * 0.98) {
    // Jika ada yang hilang lebih dari 2%, gunakan alamat lengkap di baris 1
    addressLine1 = fullAddress;
    addressLine2 = '';
  }

  // HTML escape utility
  const htmlEscape = (s: any) => {
    if (s === undefined || s === null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
  };

  // Split customer address menjadi 2-3 baris jika terlalu panjang
  const customerAddress = item.customerAddress || '';
  let customerAddressLine1 = '';
  let customerAddressLine2 = '';
  let customerAddressLine3 = '';
  
  if (customerAddress) {
    // Cek panjang alamat
    const isLongAddress = customerAddress.length > 30;
    const isVeryLongAddress = customerAddress.length > 50;
    
    // Cari posisi split yang tepat
    const kabupatenIndex = customerAddress.toLowerCase().indexOf('kabupaten');
    const lastCommaIndex = customerAddress.lastIndexOf(',');
    const words = customerAddress.split(/\s+/);
    
    if (isVeryLongAddress && words.length > 10) {
      // Alamat sangat panjang - bagi jadi 3 baris
      const thirdPoint = Math.ceil(words.length / 3);
      const twoThirdPoint = Math.ceil(words.length * 2 / 3);
      customerAddressLine1 = words.slice(0, thirdPoint).join(' ');
      customerAddressLine2 = words.slice(thirdPoint, twoThirdPoint).join(' ');
      customerAddressLine3 = words.slice(twoThirdPoint).join(' ');
    } else if (kabupatenIndex !== -1) {
      // Split di "Kabupaten" - baris 1 sampai sebelum "Kabupaten", baris 2 dari "Kabupaten"
      customerAddressLine1 = customerAddress.substring(0, kabupatenIndex).trim();
      const afterKabupaten = customerAddress.substring(kabupatenIndex).trim();
      // Jika setelah kabupaten masih panjang, bagi lagi
      if (afterKabupaten.length > 40 && isVeryLongAddress) {
        const midPoint = Math.ceil(afterKabupaten.length / 2);
        const spaceIndex = afterKabupaten.indexOf(' ', midPoint);
        if (spaceIndex !== -1) {
          customerAddressLine2 = afterKabupaten.substring(0, spaceIndex).trim();
          customerAddressLine3 = afterKabupaten.substring(spaceIndex).trim();
        } else {
          customerAddressLine2 = afterKabupaten;
          customerAddressLine3 = '';
        }
      } else {
        customerAddressLine2 = afterKabupaten;
        customerAddressLine3 = '';
      }
    } else if (lastCommaIndex !== -1 && (lastCommaIndex > customerAddress.length * 0.3 || isLongAddress)) {
      // Split di koma terakhir
      customerAddressLine1 = customerAddress.substring(0, lastCommaIndex).trim();
      const afterComma = customerAddress.substring(lastCommaIndex + 1).trim();
      // Jika setelah koma masih panjang, bagi lagi
      if (afterComma.length > 40 && isVeryLongAddress) {
        const midPoint = Math.ceil(afterComma.length / 2);
        const spaceIndex = afterComma.indexOf(' ', midPoint);
        if (spaceIndex !== -1) {
          customerAddressLine2 = afterComma.substring(0, spaceIndex).trim();
          customerAddressLine3 = afterComma.substring(spaceIndex).trim();
        } else {
          customerAddressLine2 = afterComma;
          customerAddressLine3 = '';
        }
      } else {
        customerAddressLine2 = afterComma;
        customerAddressLine3 = '';
      }
    } else if (isLongAddress) {
      // Alamat panjang - split di tengah atau jadi 3 baris
      if (words.length > 10 && isVeryLongAddress) {
        const thirdPoint = Math.ceil(words.length / 3);
        const twoThirdPoint = Math.ceil(words.length * 2 / 3);
        customerAddressLine1 = words.slice(0, thirdPoint).join(' ');
        customerAddressLine2 = words.slice(thirdPoint, twoThirdPoint).join(' ');
        customerAddressLine3 = words.slice(twoThirdPoint).join(' ');
      } else if (words.length > 6) {
        const midPoint = Math.ceil(words.length / 2);
        customerAddressLine1 = words.slice(0, midPoint).join(' ');
        customerAddressLine2 = words.slice(midPoint).join(' ');
        customerAddressLine3 = '';
      } else {
        const midPoint = Math.ceil(customerAddress.length / 2);
        const spaceIndex = customerAddress.indexOf(' ', midPoint);
        if (spaceIndex !== -1) {
          customerAddressLine1 = customerAddress.substring(0, spaceIndex).trim();
          customerAddressLine2 = customerAddress.substring(spaceIndex).trim();
          customerAddressLine3 = '';
        } else {
          customerAddressLine1 = customerAddress.substring(0, midPoint).trim();
          customerAddressLine2 = customerAddress.substring(midPoint).trim();
          customerAddressLine3 = '';
        }
      }
    } else {
      // Alamat pendek, semua di baris 1
      customerAddressLine1 = customerAddress;
      customerAddressLine2 = '';
      customerAddressLine3 = '';
    }
    
    // Validasi final: pastikan semua bagian alamat ada
    const combinedAddress = (customerAddressLine1 + ' ' + customerAddressLine2 + ' ' + customerAddressLine3).trim().replace(/\s+/g, ' ');
    const normalizedFull = customerAddress.replace(/\s+/g, ' ').trim();
    if (combinedAddress.length < normalizedFull.length * 0.95) {
      // Jika ada yang hilang lebih dari 5%, gunakan alamat lengkap di baris 1
      customerAddressLine1 = customerAddress;
      customerAddressLine2 = '';
      customerAddressLine3 = '';
    }
  }

  // Build table rows for SO lines (we already used first line for main product)
  // ITEM ambil dari productName di soLines (dari SPK no dan Product di delivery items)
  const extraRowsHtml = (item.soLines || []).slice(1).map((line, idx) => {
    const sku = line.itemSku || '';
    const found = findProductByItemSku(sku);
    // Prioritaskan productName dari soLines (dari delivery items)
    let prodName = line.productName || mainProductName || '-';
    let prodId = sku || '';
    let unit = 'PCS';
    if (found) {
      // PRODUCT CODE berdasarkan preference (Pad Code atau Product ID)
      prodId = getProductCode(found, sku);
      // Jika productName belum ada, gunakan nama dari master product
      if (!line.productName) {
        prodName = found.name || sku;
      }
      const bom = (found as any).bom;
      if (bom) {
        if (Array.isArray(bom)) unit = bom[0]?.unit || unit;
        else if (bom.materials && Array.isArray(bom.materials)) unit = bom.materials[0]?.unit || unit;
      }
    } else {
      // Jika tidak ditemukan, gunakan SKU sebagai ID
      prodId = sku;
      if (!line.productName) {
        prodName = sku;
      }
    }
    return `
      <tr>
        <td style="text-align:center; padding:4px 3px; font-size:10px; font-family: Arial, Helvetica, sans-serif;">${idx + 2}</td>
        <td style="padding:4px 3px; font-size:10px; font-family: Arial, Helvetica, sans-serif;">${htmlEscape(prodId)}</td>
        <td style="padding:4px 3px; font-size:10px; font-family: Arial, Helvetica, sans-serif;">${htmlEscape(prodName)}</td>
        <td style="text-align:center; padding:4px 3px; font-size:10px; font-family: Arial, Helvetica, sans-serif;">${line.qty || ''}</td>
        <td style="text-align:center; padding:4px 3px; font-size:10px; font-family: Arial, Helvetica, sans-serif;">${unit}</td>
        <td style="padding:4px 3px;"></td>
      </tr>
    `;
  }).join('');

  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SURAT JALAN - ${htmlEscape(item.soNo || sj.sjNo || '')}</title>
  <style>
    @page { 
      size: A5; 
      margin: 8mm; 
    }
    
    /* Ensure images load properly for PDF */
    img {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    * {
      box-sizing: border-box;
    }
    html, body { 
      margin: 0; 
      padding: 0; 
      -webkit-print-color-adjust: exact; 
      background: #fff; 
    }
    body { 
      font-family: Arial, Helvetica, sans-serif; 
      font-size: 11px; 
      color: #000; 
      padding: 4mm 6mm 8mm 6mm; 
    }

    /* Header: Logo kiri, Company name + address center, garis sejajar dengan panjang alamat */
    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 2px;
    }

    .header-left {
      width: 20%;
      flex-shrink: 0;
      position: relative;
      z-index: 1;
    }

    .header-logo {
      height: 70px;
      width: auto;
      max-width: 100%;
      object-fit: contain;
      position: relative;
      z-index: 0;
      opacity: 1;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      display: block;
    }

    .header-logo[src=""],
    .header-logo:not([src]) {
      display: none;
    }

    .header-center-text {
      flex: 1;
      text-align: center;
      line-height: 1.2;
      font-size: 11px;
      padding: 0 15px;
      padding-bottom: 4px;
      margin-bottom: 2px;
      position: relative;
    }

    .header-center-text::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      border-bottom: 2px solid #000;
    }

    .header-center-text .company-name {
      font-weight: 700;
      text-align: center;
      font-size: 18px;
      margin-bottom: 1px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .header-center-text .company-address {
      font-size: 10px;
      text-align: center;
      line-height: 1.3;
      font-family: Arial, Helvetica, sans-serif;
    }

    .header-center-text .company-address-line {
      display: block;
    }

    .header-right {
      width: 20%;
      flex-shrink: 0;
      text-align: auto;
      font-size: 12px;
      padding-top: 0;
    }

    /* SURAT JALAN title di bawah garis header - sejajar dengan header center */
    .sj-title-wrapper {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-top: 2px;
      margin-bottom: 8px;
    }

    .sj-title-wrapper .sj-spacer-left {
      width: 20%;
      flex-shrink: 0;
    }

    .sj-title-section {
      flex: 1;
      text-align: center;
      padding: 0 15px;
    }

    .sj-title-wrapper .sj-spacer-right {
      width: 20%;
      flex-shrink: 0;
    }

    .sj-title-section .title {
      font-weight: 700;
      font-size: 16px;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .sj-title-section .sj-number {
      font-weight: 600;
      font-size: 11px;
      font-family: Arial, Helvetica, sans-serif;
    }

    /* Info section */
    .info {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      font-size: 10px;
      line-height: 1.4;
      font-family: Arial, Helvetica, sans-serif;
    }

    .info .left {
      width: 60%;
    }

    .info .right {
      width: 35%;
      margin-left: auto;
      padding-left: 2%;
    }

    .info .info-row {
      margin-bottom: 3px;
      line-height: 1.4;
    }

    .info .left .info-row:last-child {
      margin-bottom: 0;
    }

    .info .right .info-row:last-child {
      margin-bottom: 0;
    }

    .info .label {
      display: inline-block;
      font-weight: 700;
      width: 150px;
      vertical-align: top;
      padding-right: 8px;
      position: relative;
    }

    .info .label-text {
      text-align: left;
      display: inline-block;
    }

    .info .label-colon {
      position: absolute;
      right: calc(4px + 12mm);
    }

    .info .right .label {
      width: 160px;
    }

    .info .value {
      display: inline-block;
      word-wrap: break-word;
      word-break: break-word;
      vertical-align: top;
      margin-left: -12mm;
    }

    .info .value-line {
      display: block;
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }

    .info .value-line:first-child {
      margin-bottom: 0;
    }

    .info .value-line:not(:first-child) {
      margin-top: 2px;
      margin-bottom: 0;
    }

    /* Items table */
    table.items {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 10px;
      font-family: Arial, Helvetica, sans-serif;
    }

    table.items thead th {
      border: 1px solid #000;
      padding: 5px 4px;
      background: #f6f6f6;
      font-weight: 700;
      text-align: left;
      font-family: Arial, Helvetica, sans-serif;
    }

    table.items thead th:nth-child(1),
    table.items thead th:nth-child(4),
    table.items thead th:nth-child(5) {
      text-align: center;
    }

    table.items td {
      border: 1px solid #000;
      padding: 5px 4px;
      vertical-align: top;
      font-family: Arial, Helvetica, sans-serif;
    }

    table.items tbody tr:last-child td {
      border-bottom: 1px solid #000;
    }

    /* Footer */
    .footer {
      margin-top: 12px;
    }

    .footer-left {
      font-size: 10px;
      margin-bottom: 10px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .keterangan {
      margin-top: 0;
    }

    .keterangan .title {
      font-weight: 700;
      margin-bottom: 2px;
      font-size: 10px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .keterangan .note-text {
      font-size: 10px;
      line-height: 1.3;
      margin-bottom: 4px;
      padding-bottom: 0.8em;
      font-family: Arial, Helvetica, sans-serif;
    }

    .footer-date {
      margin-top: 6px;
      font-size: 10px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .footer-hormat {
      margin-top: 4px;
      font-size: 10px;
      margin-bottom: 10px;
      font-family: Arial, Helvetica, sans-serif;
    }

    /* Signature section - sejajar horizontal: PIC, Driver, Penerima */
    .signature-section {
      display: flex;
      justify-content: flex-start;
      align-items: flex-start;
      width: 100%;
      margin-top: 10px;
      gap: 10px;
    }

    .sig {
      text-align: left;
      font-size: 10px;
      min-width: 80px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .sig-right {
      text-align: right;
      font-size: 10px;
      min-width: 80px;
      margin-left: auto;
      font-family: Arial, Helvetica, sans-serif;
    }

    .sig .line,
    .sig-right .line {
      border-top: 1px solid #000;
      margin-top: 40px;
      display: block;
      width: 70%;
    }

    .sig-right .line {
      margin-left: auto;
      margin-right: 0;
    }

    .sig .label,
    .sig-right .label {
      margin-top: 4px;
      font-weight: 600;
      font-family: Arial, Helvetica, sans-serif;
    }

    .sig .driver-name {
      margin-top: 4px;
      font-weight: 700;
      font-size: 10px;
      font-family: Arial, Helvetica, sans-serif;
    }

    @media print {
      @page { 
        size: A5; 
        margin: 8mm; 
      }
      body { 
        padding: 4mm 6mm 8mm 6mm; 
        font-family: Arial, Helvetica, sans-serif;
      }
      .header-logo {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        max-width: 100%;
        height: auto;
        max-height: 70px;
        display: block;
      }
      
      .header-logo[src=""],
      .header-logo:not([src]) {
        display: none;
      }
    }
  </style>
  <script>
    // Logo sudah base64 dari component, tidak perlu conversion lagi
    // Hanya pastikan logo load dengan benar
    (function() {
      function ensureLogoLoads() {
        const logoImg = document.querySelector('.header-logo');
        if (!logoImg) return;
        
        const src = logoImg.src || logoImg.getAttribute('src');
        if (!src) {
          logoImg.style.display = 'none';
          return;
        }
        
        // Jika sudah base64, pastikan load dengan benar
        if (src.startsWith('data:')) {
          // Base64 logo, pastikan tidak ada error
          logoImg.onerror = function() {
            console.warn('Logo base64 failed to load');
            this.style.display = 'none';
          };
        }
      }
      
      // Try immediately and on DOM ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', ensureLogoLoads);
      } else {
        ensureLogoLoads();
      }
    })();
  </script>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="${logoSrc}" class="header-logo" alt="Logo" onerror="this.style.display='none'; this.onerror=null;" />
    </div>
    <div class="header-center-text">
      <div class="company-name">${htmlEscape(companyName)}</div>
      <div class="company-address">
        ${addressLine1 ? `<span class="company-address-line">${htmlEscape(addressLine1)}</span>` : ''}
        ${addressLine2 ? `<span class="company-address-line">${htmlEscape(addressLine2)}</span>` : ''}
      </div>
    </div>
    <div class="header-right"></div>
  </div>

  <div class="sj-title-wrapper">
    <div class="sj-spacer-left"></div>
    <div class="sj-title-section">
      <div class="title">SURAT JALAN</div>
      <div class="sj-number">No. ${htmlEscape(sj.sjNo || '')}</div>
    </div>
    <div class="sj-spacer-right"></div>
  </div>

  <div class="info">
    <div class="left">
      <div class="info-row">
        <span class="label"><span class="label-text">Delivery Date</span><span class="label-colon"> :</span></span>
        <span class="value">${formatDate(sj.sjDate || item.sjDate || '')}</span>
      </div>
      <div class="info-row">
        <span class="label"><span class="label-text">Customer</span><span class="label-colon"> :</span></span>
        <span class="value">${htmlEscape(item.customer || '-')}</span>
      </div>
      <div class="info-row">
        <span class="label"><span class="label-text">Alamat</span><span class="label-colon"> :</span></span>
        <span class="value">
          ${customerAddressLine1 ? `<span class="value-line">${htmlEscape(customerAddressLine1)}</span>` : ''}
          ${customerAddressLine2 ? `<span class="value-line">${htmlEscape(customerAddressLine2)}</span>` : ''}
          ${customerAddressLine3 ? `<span class="value-line">${htmlEscape(customerAddressLine3)}</span>` : ''}
        </span>
      </div>
    </div>

    <div class="right">
      <div class="info-row">
        <span class="label"><span class="label-text">No. Kendaraan</span><span class="label-colon"> :</span></span>
        <span class="value">${htmlEscape(sj.vehicleNo || '')}</span>
      </div>
      <div class="info-row">
        <span class="label"><span class="label-text">No-PO</span><span class="label-colon"> :</span></span>
        <span class="value">${htmlEscape(item.soNo || '')}</span>
      </div>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:5%;">NO</th>
        <th style="width:18%;">PRODUCT CODE</th>
        <th style="width:46%;">ITEM</th>
        <th style="width:8%;">QTY</th>
        <th style="width:8%;">UOM</th>
        <th style="width:15%;">DESCRIPTION</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align:center;">1</td>
        <td>${htmlEscape(mainProductId)}</td>
        <td>${htmlEscape(mainProductName)}</td>
        <td style="text-align:center;">${item.qtyProduced || (item.soLines && item.soLines[0] ? item.soLines[0].qty : '') || ''}</td>
        <td style="text-align:center;">${mainProductUnit}</td>
        <td></td>
      </tr>
      ${extraRowsHtml || ''}
    </tbody>
  </table>

  <div class="footer">
    <div class="footer-left">
      <div class="keterangan">
        <div class="title">Keterangan :</div>
        <div class="note-text">
          ${item.specNote ? htmlEscape(item.specNote) : ''}
        </div>
      </div>
      <div class="footer-date">Bekasi, ${formatDate(sj.sjDate || item.sjDate || '')}</div>
      <div class="footer-hormat">Hormat Kami</div>
    </div>

    <div class="signature-section">
      <div class="sig">
        <span class="line"></span>
        <div class="label">PIC</div>
      </div>

      <div class="sig">
        <span class="line"></span>
        <div class="label">Driver</div>
        ${sj.driver ? `<div class="driver-name">${htmlEscape(sj.driver)}</div>` : ''}
      </div>

      <div class="sig-right">
        <span class="line"></span>
        <div class="label">Penerima</div>
      </div>
    </div>
  </div>
</body>
</html>
`;

  return html;
}

// Template untuk SJ Recap
export function generateSuratJalanRecapHtml({
  logo,
  company,
  item,
  sjData,
  products: _products = []
}: GenerateSuratJalanHtmlParams): string {
  const logoSrc = logo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwN2JmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxPR088L3RleHQ+PC9zdmc+';
  
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) {
      const d = new Date();
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    }
    try {
      const d = new Date(dateStr);
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yy}-${mm}-${dd}`;
    } catch {
      return dateStr || '';
    }
  };

  const htmlEscape = (s: any) => {
    if (s === undefined || s === null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
  };

  const sj = sjData || { sjNo: '', sjDate: '', driver: '', vehicleNo: '' };
  const companyName = company?.companyName || 'PT. TRIMA LAKSANA JAYA PRATAMA';
  const fullAddress = 'Jl. Raya Cikarang Cibarusah Kp. Kukun RT 11/06 Desa Ciantra Kecamatan Cikarang Selatan Kabupaten Bekasi';
  
  let addressLine1 = '';
  let addressLine2 = '';
  const kabupatenIndex = fullAddress.toLowerCase().indexOf('kabupaten');
  if (kabupatenIndex !== -1) {
    addressLine1 = fullAddress.substring(0, kabupatenIndex).trim();
    addressLine2 = fullAddress.substring(kabupatenIndex).trim();
  } else {
    addressLine1 = fullAddress;
    addressLine2 = '';
  }

  const customerAddress = item.customerAddress || '';
  let customerAddressLine1 = '';
  let customerAddressLine2 = '';
  if (customerAddress) {
    const kabupatenIndex = customerAddress.toLowerCase().indexOf('kabupaten');
    if (kabupatenIndex !== -1) {
      customerAddressLine1 = customerAddress.substring(0, kabupatenIndex).trim();
      customerAddressLine2 = customerAddress.substring(kabupatenIndex).trim();
    } else {
      customerAddressLine1 = customerAddress;
      customerAddressLine2 = '';
    }
  }

  // Build SO numbers list (vertical) untuk SJ Recap
  const soNos = (item as any).soNos || [];
  const soNo = item.soNo || '';
  // Untuk SJ Recap, prioritaskan soNos jika ada, jika tidak ada gunakan soNo sebagai fallback
  const allSoNos = Array.isArray(soNos) && soNos.length > 0 ? soNos : (soNo ? [soNo] : []);
  const soNosHtml = allSoNos.length > 0 
    ? allSoNos.map((so: string) => `<div class="value-line">${htmlEscape(so)}</div>`).join('')
    : '<div class="value-line">-</div>';

  // Build items table dengan description berisi nomor SJ lama
  const itemsHtml = (item.items || []).map((itm, idx) => {
    // Extract SJ numbers dari productCode (format: "BASE_CODE (SJ-xxx) (SJ-yyy)" atau "(SJ-xxx) (SJ-yyy)")
    const productCode = itm.productCode || '';
    // Extract semua nomor SJ dari dalam tanda kurung
    const sjMatches = productCode.match(/\(([^)]+)\)/g) || [];
    // Ambil hanya nomor SJ (hapus tanda kurung)
    const sjNumbers = sjMatches.map(match => match.replace(/[()]/g, '').trim());
    // Gabungkan dengan koma dan spasi, hanya tampilkan nomor SJ tanpa product code
    const description = sjNumbers.length > 0 ? sjNumbers.join(', ') : '';
    return `
      <tr>
        <td style="text-align:center; padding:4px 3px; font-size:10px; font-family: Arial, Helvetica, sans-serif;">${idx + 1}</td>
        <td style="padding:4px 3px; font-size:10px; font-family: Arial, Helvetica, sans-serif;">${htmlEscape(itm.productCode?.replace(/\s*\([^)]*\)/g, '').trim() || '')}</td>
        <td style="padding:4px 3px; font-size:10px; font-family: Arial, Helvetica, sans-serif;">${htmlEscape(itm.product || '')}</td>
        <td style="text-align:center; padding:4px 3px; font-size:10px; font-family: Arial, Helvetica, sans-serif;">${itm.qty || ''}</td>
        <td style="text-align:center; padding:4px 3px; font-size:10px; font-family: Arial, Helvetica, sans-serif;">${itm.unit || 'PCS'}</td>
        <td style="padding:4px 3px; font-size:10px; font-family: Arial, Helvetica, sans-serif;">${htmlEscape(description)}</td>
      </tr>
    `;
  }).join('');

  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SURAT JALAN RECAP - ${htmlEscape(sj.sjNo || '')}</title>
  <style>
    @page { 
      size: A5; 
      margin: 8mm; 
    }
    
    img {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    * {
      box-sizing: border-box;
    }
    html, body { 
      margin: 0; 
      padding: 0; 
      -webkit-print-color-adjust: exact; 
      background: #fff; 
    }
    body { 
      font-family: Arial, Helvetica, sans-serif; 
      font-size: 11px; 
      color: #000; 
      padding: 4mm 6mm 8mm 6mm; 
    }

    .header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 2px;
    }

    .header-left {
      width: 20%;
      flex-shrink: 0;
      position: relative;
      z-index: 1;
    }

    .header-logo {
      height: 70px;
      width: auto;
      max-width: 100%;
      object-fit: contain;
      position: relative;
      z-index: 0;
      opacity: 1;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      display: block;
    }

    .header-logo[src=""],
    .header-logo:not([src]) {
      display: none;
    }

    .header-center-text {
      flex: 1;
      text-align: center;
      line-height: 1.2;
      font-size: 11px;
      padding: 0 15px;
      padding-bottom: 4px;
      margin-bottom: 2px;
      position: relative;
    }

    .header-center-text::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      border-bottom: 2px solid #000;
    }

    .header-center-text .company-name {
      font-weight: 700;
      text-align: center;
      font-size: 18px;
      margin-bottom: 1px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .header-center-text .company-address {
      font-size: 10px;
      text-align: center;
      line-height: 1.3;
      font-family: Arial, Helvetica, sans-serif;
    }

    .header-center-text .company-address-line {
      display: block;
    }

    .header-right {
      width: 20%;
      flex-shrink: 0;
      text-align: auto;
      font-size: 11px;
      padding-top: 0;
      font-family: Arial, Helvetica, sans-serif;
    }

    .sj-title-wrapper {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-top: 2px;
      margin-bottom: 8px;
    }

    .sj-title-wrapper .sj-spacer-left {
      width: 20%;
      flex-shrink: 0;
    }

    .sj-title-section {
      flex: 1;
      text-align: center;
      padding: 0 15px;
    }

    .sj-title-wrapper .sj-spacer-right {
      width: 20%;
      flex-shrink: 0;
    }

    .sj-title-section .title {
      font-weight: 700;
      font-size: 16px;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .sj-title-section .sj-number {
      font-weight: 600;
      font-size: 11px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .info {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      font-size: 10px;
      line-height: 1.4;
      font-family: Arial, Helvetica, sans-serif;
    }

    .info .left {
      width: 60%;
    }

    .info .right {
      width: 35%;
      margin-left: auto;
      padding-left: 2%;
    }

    .info .info-row {
      margin-bottom: 6px;
      line-height: 1.6;
    }

    .info .left .info-row:last-child {
      margin-bottom: 0;
    }

    .info .right .info-row:last-child {
      margin-bottom: 0;
    }

    .info .label {
      display: inline-block;
      font-weight: 700;
      width: 150px;
      vertical-align: top;
      padding-right: 8px;
      position: relative;
    }

    .info .label-text {
      text-align: left;
      display: inline-block;
    }

    .info .label-colon {
      position: absolute;
      right: calc(4px + 12mm);
    }

    .info .right .label {
      width: 160px;
    }

    .info .value {
      display: inline-block;
      word-wrap: break-word;
      word-break: break-word;
      vertical-align: top;
      margin-left: -12mm;
    }

    .info .value-line {
      display: block;
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }

    .info .value-line:first-child {
      margin-bottom: 0;
    }

    .info .value-line:not(:first-child) {
      margin-top: 2px;
      margin-bottom: 0;
    }

    .info .info-row-po {
      display: flex;
      align-items: flex-start;
    }

    .info .info-row-po .label {
      flex-shrink: 0;
      width: 160px;
      position: relative;
    }

    .info .info-row-po .label-colon {
      position: absolute;
      right: calc(4px + 12mm);
    }

    .info .value-po {
      display: block;
      margin-left: 0 !important;
      flex: 1;
      padding-left: 0;
      vertical-align: top;
    }

    .info .value-po .value-line {
      display: block;
      margin: 0;
      padding: 0;
      line-height: 1.6;
    }

    .info .value-po .value-line:first-child {
      margin-bottom: 0;
    }

    .info .value-po .value-line:not(:first-child) {
      margin-top: 2px;
      margin-bottom: 0;
    }

    table.items {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
      font-size: 10px;
      font-family: Arial, Helvetica, sans-serif;
    }

    table.items thead th {
      border: 1px solid #000;
      padding: 5px 4px;
      background: #f6f6f6;
      font-weight: 700;
      text-align: left;
      font-family: Arial, Helvetica, sans-serif;
    }

    table.items thead th:nth-child(1),
    table.items thead th:nth-child(4),
    table.items thead th:nth-child(5) {
      text-align: center;
    }

    table.items td {
      border: 1px solid #000;
      padding: 5px 4px;
      vertical-align: top;
      font-family: Arial, Helvetica, sans-serif;
    }

    table.items tbody tr:last-child td {
      border-bottom: 1px solid #000;
    }

    .footer {
      margin-top: 12px;
    }

    .footer-left {
      font-size: 10px;
      margin-bottom: 10px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .keterangan {
      margin-top: 0;
    }

    .keterangan .title {
      font-weight: 700;
      margin-bottom: 2px;
      font-size: 10px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .keterangan .note-text {
      font-size: 10px;
      line-height: 1.3;
      margin-bottom: 4px;
      padding-bottom: 0.8em;
      font-family: Arial, Helvetica, sans-serif;
    }

    .footer-date {
      margin-top: 6px;
      font-size: 10px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .footer-hormat {
      margin-top: 4px;
      font-size: 10px;
      margin-bottom: 10px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .signature-section {
      display: flex;
      justify-content: flex-start;
      align-items: flex-start;
      width: 100%;
      margin-top: 10px;
      gap: 10px;
    }

    .sig {
      text-align: left;
      font-size: 10px;
      min-width: 80px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .sig-right {
      text-align: right;
      font-size: 10px;
      min-width: 80px;
      margin-left: auto;
      font-family: Arial, Helvetica, sans-serif;
    }

    .sig .line,
    .sig-right .line {
      border-top: 1px solid #000;
      margin-top: 40px;
      display: block;
      width: 70%;
    }

    .sig-right .line {
      margin-left: auto;
      margin-right: 0;
    }

    .sig .label,
    .sig-right .label {
      margin-top: 4px;
      font-weight: 600;
      font-family: Arial, Helvetica, sans-serif;
    }

    .sig .driver-name {
      margin-top: 4px;
      font-weight: 700;
      font-size: 10px;
      font-family: Arial, Helvetica, sans-serif;
    }

    @media print {
      @page { 
        size: A5; 
        margin: 8mm; 
      }
      body { 
        padding: 4mm 6mm 8mm 6mm; 
        font-family: Arial, Helvetica, sans-serif;
      }
      .header-logo {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        max-width: 100%;
        height: auto;
        max-height: 70px;
        display: block;
      }
      
      .header-logo[src=""],
      .header-logo:not([src]) {
        display: none;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="${logoSrc}" class="header-logo" alt="Logo" onerror="this.style.display='none'; this.onerror=null;" />
    </div>
    <div class="header-center-text">
      <div class="company-name">${htmlEscape(companyName)}</div>
      <div class="company-address">
        ${addressLine1 ? `<span class="company-address-line">${htmlEscape(addressLine1)}</span>` : ''}
        ${addressLine2 ? `<span class="company-address-line">${htmlEscape(addressLine2)}</span>` : ''}
      </div>
    </div>
    <div class="header-right"></div>
  </div>

  <div class="sj-title-wrapper">
    <div class="sj-spacer-left"></div>
    <div class="sj-title-section">
      <div class="title">SURAT JALAN</div>
      <div class="sj-number">No. ${htmlEscape(sj.sjNo || '')}</div>
    </div>
    <div class="sj-spacer-right"></div>
  </div>

  <div class="info">
    <div class="left">
      <div class="info-row">
        <span class="label"><span class="label-text">Delivery Date</span><span class="label-colon"> :</span></span>
        <span class="value">${formatDate(sj.sjDate || (item as any).deliveryDate || '')}</span>
      </div>
      <div class="info-row">
        <span class="label"><span class="label-text">Customer</span><span class="label-colon"> :</span></span>
        <span class="value">${htmlEscape(item.customer || '-')}</span>
      </div>
      <div class="info-row">
        <span class="label"><span class="label-text">Alamat</span><span class="label-colon"> :</span></span>
        <span class="value">
          ${customerAddressLine1 ? `<span class="value-line">${htmlEscape(customerAddressLine1)}</span>` : ''}
          ${customerAddressLine2 ? `<span class="value-line">${htmlEscape(customerAddressLine2)}</span>` : ''}
        </span>
      </div>
    </div>

    <div class="right">
      <div class="info-row">
        <span class="label"><span class="label-text">No. Kendaraan</span><span class="label-colon"> :</span></span>
        <span class="value">${htmlEscape(sj.vehicleNo || '')}</span>
      </div>
      <div class="info-row info-row-po">
        <span class="label"><span class="label-text">No.PO</span><span class="label-colon"> :</span></span>
        <span class="value value-po">
          ${soNosHtml}
        </span>
      </div>
    </div>
  </div>

  <table class="items">
    <thead>
      <tr>
        <th style="width:5%;">NO</th>
        <th style="width:18%;">PRODUCT CODE</th>
        <th style="width:46%;">ITEM</th>
        <th style="width:8%;">QTY</th>
        <th style="width:8%;">UOM</th>
        <th style="width:15%;">DESCRIPTION</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml || ''}
    </tbody>
  </table>

  <div class="footer">
    <div class="footer-left">
      <div class="keterangan">
        <div class="title">Keterangan :</div>
        <div class="note-text">
          ${item.specNote ? htmlEscape(item.specNote) : ''}
        </div>
      </div>
      <div class="footer-date">Bekasi, ${formatDate(sj.sjDate || (item as any).deliveryDate || '')}</div>
      <div class="footer-hormat">Hormat Kami</div>
    </div>

    <div class="signature-section">
      <div class="sig">
        <span class="line"></span>
        <div class="label">PIC</div>
      </div>

      <div class="sig">
        <span class="line"></span>
        <div class="label">Driver</div>
        ${sj.driver ? `<div class="driver-name">${htmlEscape(sj.driver)}</div>` : ''}
      </div>

      <div class="sig-right">
        <span class="line"></span>
        <div class="label">Penerima</div>
      </div>
    </div>
  </div>
</body>
</html>
`;

  return html;
}

// Template untuk GT Delivery Note (Template 2)
export function generateGTDeliveryNoteHtml({
  logo,
  company,
  item,
  sjData,
  products = []
}: GenerateSuratJalanHtmlParams): string {
  const logoSrc = logo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwN2JmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxPR088L3RleHQ+PC9zdmc+';
  
  const formatDate = (dateStr?: string): string => {
    if (!dateStr) {
      const d = new Date();
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${dd} ${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][d.getMonth()]} ${yy}`;
    }
    try {
      const d = new Date(dateStr);
      const yy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${dd} ${['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][d.getMonth()]} ${yy}`;
    } catch {
      return dateStr || '';
    }
  };

  const htmlEscape = (s: any) => {
    if (s === undefined || s === null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');
  };

  const sj = sjData || { sjNo: '', sjDate: '', driver: '', vehicleNo: '' };
  const companyName = company?.companyName || 'PT TRIMA LAKSANA JAYA PRATAMA';
  const companyAddress = company?.address || 'Jalan Raya Cikarang-Gibarusah, Kp.Kukun RT.11/06, Desa Ciantra, Cikarang Selatan';
  const companyEmail = 'aliaudah.trimalaksana@pratamasystem.co.id';
  
  const customerName = item.customer || '-';
  const customerAddress = item.customerAddress || '-';
  const customerPIC = (item as any).customerPIC || '-';
  const poNo = item.soNo || '-';
  // PIC Program bisa berbeda dari customerPIC, fallback ke customerPIC jika tidak ada
  const picProgram = (item as any).picProgram || customerPIC || '-';

  // Format SJ number untuk display (hilangkan prefix jika ada)
  const sjNoDisplay = sj.sjNo?.replace(/^SJ-/, '') || sj.sjNo || '';

  // Build items table
  const items = item.items || [];
  const soLines = item.soLines || [];
  
  // Combine items dan soLines untuk table
  const tableItems: Array<{
    poLineNo: string;
    itemCode: string;
    description: string;
    ordered: number;
    delivered: number;
    outstanding: number;
  }> = [];

  if (soLines.length > 0) {
    soLines.forEach((line, idx) => {
      const qty = Number(line.qty || 0);
      tableItems.push({
        poLineNo: '-',
        itemCode: '-',
        description: htmlEscape(line.productName || ''),
        ordered: qty,
        delivered: qty,
        outstanding: 0,
      });
    });
  } else if (items.length > 0) {
    items.forEach((itm) => {
      const qty = Number(itm.qty || 0);
      tableItems.push({
        poLineNo: '-',
        itemCode: '-',
        description: htmlEscape(itm.product || ''),
        ordered: qty,
        delivered: qty,
        outstanding: 0,
      });
    });
  } else {
    // Fallback untuk old format
    const qty = Number(item.qty || 0);
    tableItems.push({
      poLineNo: '-',
      itemCode: '-',
      description: htmlEscape(item.product || ''),
      ordered: qty,
      delivered: qty,
      outstanding: 0,
    });
  }

  const itemsHtml = tableItems.map((itm, idx) => `
    <tr>
      <td style="text-align:center; padding:4px 3px; font-size:10px; font-family: Arial, Helvetica, sans-serif;">${htmlEscape(itm.poLineNo)}</td>
      <td style="text-align:center; padding:4px 3px; font-size:10px; font-family: Arial, Helvetica, sans-serif;">${htmlEscape(itm.itemCode)}</td>
      <td style="padding:4px 3px; font-size:10px; font-family: Arial, Helvetica, sans-serif;">${itm.description}</td>
      <td style="text-align:center; padding:4px 3px; font-size:10px; font-family: Arial, Helvetica, sans-serif;">${itm.ordered}</td>
      <td style="text-align:center; padding:4px 3px; font-size:10px; font-family: Arial, Helvetica, sans-serif;">${itm.delivered}</td>
      <td style="text-align:center; padding:4px 3px; font-size:10px; font-family: Arial, Helvetica, sans-serif;">${itm.outstanding > 0 ? itm.outstanding : '-'}</td>
    </tr>
  `).join('');

  // Add empty rows untuk space
  const emptyRows = Array.from({ length: Math.max(0, 10 - tableItems.length) }, (_, idx) => `
    <tr>
      <td style="text-align:center;">&nbsp;</td>
      <td style="text-align:center;">&nbsp;</td>
      <td>&nbsp;</td>
      <td style="text-align:center;">&nbsp;</td>
      <td style="text-align:center;">&nbsp;</td>
      <td style="text-align:center;">&nbsp;</td>
    </tr>
  `).join('');

  const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Delivery Note - ${htmlEscape(sjNoDisplay)}</title>
  <style>
    @page { 
      size: A5; 
      margin: 8mm; 
    }
    * {
      box-sizing: border-box;
    }
    html, body { 
      margin: 0; 
      padding: 0; 
      background: #fff; 
    }
    body { 
      font-family: Arial, Helvetica, sans-serif; 
      font-size: 10px; 
      color: #000; 
      padding: 4mm 6mm 8mm 6mm;
      line-height: 1.3;
    }

    .header-title {
      text-align: center;
      font-size: 18px;
      font-weight: 700;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .header-info {
      text-align: left;
      font-size: 10px;
      font-weight: 700;
      margin-bottom: 10px;
      line-height: 1.4;
      font-family: Arial, Helvetica, sans-serif;
    }

    .header-info-item {
      display: flex;
      gap: 0;
      align-items: flex-start;
      margin-bottom: 4px;
    }

    .header-info-label {
      font-weight: 700;
      min-width: 140px;
      position: relative;
    }

    .header-info-colon {
      position: absolute;
      right: 0;
    }

    .header-info-value {
      margin-left: 8px;
    }

    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      gap: 15px;
    }

    .from-section, .to-section {
      width: 48%;
    }

    .section-title {
      font-weight: 700;
      margin-bottom: 4px;
      font-size: 11px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .section-content {
      font-size: 10px;
      line-height: 1.4;
      font-family: Arial, Helvetica, sans-serif;
    }

    .order-details {
      margin-bottom: 10px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .order-detail-item {
      display: flex;
      gap: 0;
      align-items: flex-start;
    }

    .order-detail-label {
      font-weight: 700;
      min-width: 120px;
      position: relative;
    }

    .order-detail-colon {
      position: absolute;
      right: 0;
    }

    .order-detail-value {
      margin-left: 8px;
    }

    hr {
      border: none;
      border-top: 1px solid #000;
      margin: 8px 0;
    }

    table.items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
      font-size: 10px;
      font-family: Arial, Helvetica, sans-serif;
    }

    table.items-table th {
      border: 1px solid #000;
      padding: 5px 4px;
      background: #f0f0f0;
      font-weight: 700;
      text-align: center;
      font-family: Arial, Helvetica, sans-serif;
    }

    table.items-table td {
      border: 1px solid #000;
      padding: 5px 4px;
      text-align: left;
      font-family: Arial, Helvetica, sans-serif;
    }

    table.items-table td:first-child,
    table.items-table td:nth-child(2),
    table.items-table td:nth-child(4),
    table.items-table td:nth-child(5),
    table.items-table td:nth-child(6) {
      text-align: center;
    }

    .note-section {
      margin-bottom: 0;
    }

    .note-label {
      font-weight: 700;
      margin-bottom: 4px;
      font-size: 10px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .note-box {
      border: 1px solid #000;
      min-height: 60px;
      padding: 5px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .signature-section {
      display: flex;
      justify-content: space-between;
      margin-top: 8px;
    }

    .signature-block {
      width: 45%;
    }

    .signature-title {
      font-size: 10px;
      font-weight: 700;
      margin-bottom: 30px;
      font-family: Arial, Helvetica, sans-serif;
    }

    .signature-line {
      border-top: 1px solid #000;
      margin-top: 0;
      margin-bottom: 35px;
      width: 100%;
    }

    .signature-label {
      font-size: 10px;
      margin-bottom: 3px;
      font-family: Arial, Helvetica, sans-serif;
    }
  </style>
</head>
<body>
  <div class="header-title">Delivery Note</div>
  
  <div class="header-info">
    <div class="header-info-item">
      <span class="header-info-label">
        <span>No.Srt.Jalan</span>
        <span class="header-info-colon">:</span>
      </span>
      <span class="header-info-value">${htmlEscape(sjNoDisplay)}</span>
    </div>
    <div class="header-info-item">
      <span class="header-info-label">
        <span>Tanggal</span>
        <span class="header-info-colon">:</span>
      </span>
      <span class="header-info-value">${formatDate(sj.sjDate || item.sjDate)}</span>
    </div>
  </div>

  <div class="info-section">
    <div class="from-section">
      <div class="section-title">From</div>
      <div class="section-content">
        ${htmlEscape(companyName)}<br/>
        ${htmlEscape(companyAddress)}<br/>
        Email: ${htmlEscape(companyEmail)}
      </div>
    </div>
    <div class="to-section">
      <div class="section-title">To</div>
      <div class="section-content">
        ${htmlEscape(customerName)}<br/>
        ${htmlEscape(customerAddress)}<br/>
        ${customerPIC && customerPIC !== '-' ? `PIC. ${htmlEscape(customerPIC)}` : ''}
      </div>
    </div>
  </div>

  <hr/>

  <div class="order-details">
    <div class="order-detail-item">
      <span class="order-detail-label">
        <span>PO No.</span>
        <span class="order-detail-colon">:</span>
      </span>
      <span class="order-detail-value">${htmlEscape(poNo)}</span>
    </div>
    <div class="order-detail-item">
      <span class="order-detail-label">
        <span>PIC Program</span>
        <span class="order-detail-colon">:</span>
      </span>
      <span class="order-detail-value">${htmlEscape(picProgram)}</span>
    </div>
  </div>

  <hr/>

  <table class="items-table">
    <thead>
      <tr>
        <th style="width:10%;">PO Line #</th>
        <th style="width:12%;">Item Code</th>
        <th style="width:38%;">Description</th>
        <th style="width:13%;">Ordered</th>
        <th style="width:13%;">Delivered</th>
        <th style="width:14%;">Outstanding</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
      ${emptyRows}
    </tbody>
  </table>

  <div class="note-section">
    <div class="note-label">Note:</div>
    <div class="note-box">
      ${item.specNote ? htmlEscape(item.specNote) : '&nbsp;'}
    </div>
  </div>

  <div class="signature-section">
    <div class="signature-block">
      <div class="signature-title">Sender:</div>
      <div class="signature">(............................)</div>
      <div class="signature-label">Name: ${(item as any).senderName ? htmlEscape((item as any).senderName) : ''}</div>
      <div class="signature-label">Title: ${(item as any).senderTitle ? htmlEscape((item as any).senderTitle) : ''}</div>
      <div class="signature-label">Date: ${(item as any).senderDate ? formatDate((item as any).senderDate) : ''}</div>
    </div>
    <div class="signature-block">
      <div class="signature-title">Receiver:</div>
      <div class="signature">(............................)</div>
      <div class="signature-label">Name: ${(item as any).receiverName ? htmlEscape((item as any).receiverName) : ''}</div>
      <div class="signature-label">Title: ${(item as any).receiverTitle ? htmlEscape((item as any).receiverTitle) : ''}</div>
      <div class="signature-label">Date: ${(item as any).receiverDate ? formatDate((item as any).receiverDate) : ''}</div>
    </div>
  </div>
</body>
</html>
`;

  return html;
}

