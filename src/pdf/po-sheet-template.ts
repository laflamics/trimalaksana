/**
 * Template PDF Purchase Order Sheet (Format Baru)
 * Format sederhana dengan:
 * - Header: PO number, PO date, Supplier, PIC, Page, status
 * - Table: no, item, quality, score, Qty, keterangan
 * - Footer: PT TrimaLaksana Jaya Pratama dan alamat lengkap
 */

interface POSheetParams {
  poNo: string;
  poDate: string;
  supplier: string;
  supplierAddress?: string;
  pic?: string;
  status: string;
  items: Array<{
    no: number;
    item: string;
    quality?: string;
    score?: string | number;
    qty: number;
    unit?: string;
    price?: number;
    keterangan?: string;
  }>;
  companyName: string;
  companyAddress: string;
  logo?: string;
  page?: number;
  totalPages?: number;
}

export function generatePOSheetHtml({
  poNo,
  poDate,
  supplier,
  supplierAddress = '',
  pic = '-',
  status,
  items,
  companyName,
  companyAddress,
  logo,
  page = 1,
  totalPages = 1,
}: POSheetParams): string {
  // Logo fallback
  const logoSrc = logo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwN2JmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxPR088L3RleHQ+PC9zdmc+';
  
  // Split address menjadi 2 baris
  let addressLine1 = '';
  let addressLine2 = '';
  const kabupatenIndex = companyAddress.toLowerCase().indexOf('kabupaten');
  if (kabupatenIndex !== -1) {
    addressLine1 = companyAddress.substring(0, kabupatenIndex).trim();
    addressLine2 = companyAddress.substring(kabupatenIndex).trim();
  } else {
    const words = companyAddress.split(/\s+/);
    if (words.length > 8) {
      const midPoint = Math.ceil(words.length / 2);
      addressLine1 = words.slice(0, midPoint).join(' ');
      addressLine2 = words.slice(midPoint).join(' ');
    } else {
      addressLine1 = companyAddress;
      addressLine2 = '';
    }
  }
  
  // HTML escape utility
  const htmlEscape = (s: any) => {
    if (s === undefined || s === null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  const html = `<!doctype html>
<html>
<head>
  <meta charset='utf-8'>
  <title>${poNo}</title>
  <style>
    @page { 
      size: A4 landscape; 
      margin: 8mm; 
    }
    
    * {
      box-sizing: border-box;
    }
    
    html, body { 
      margin: 0; 
      padding: 0; 
      -webkit-print-color-adjust: exact; 
      print-color-adjust: exact;
      background: #fff; 
    }
    
    body { 
      font-family: Arial, sans-serif; 
      font-size: 11px; 
      color: #000; 
      padding: 3mm 6mm; 
    }
    
    @media print {
      @page { 
        size: A4 landscape; 
        margin: 8mm; 
      }
      body { 
        padding: 3mm 6mm; 
      }
    }
    
    .title {
      text-align: center;
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 6px;
      margin-top: 2px;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 6px;
    }
    
    .header-left {
      flex: 1;
    }
    
    .header-right {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    
    .header-row {
      display: flex;
      margin-bottom: 2px;
      font-size: 11px;
      align-items: center;
    }
    
    .header-row-right {
      display: table;
      margin-bottom: 2px;
      font-size: 11px;
      margin-left: auto;
      table-layout: fixed;
      width: 280px;
    }
    
    .header-row-right .header-label {
      display: table-cell;
      font-weight: bold;
      text-align: right;
      padding-right: 10px;
      white-space: nowrap;
      vertical-align: middle;
      width: 80px;
    }
    
    .header-row-right .header-value {
      display: table-cell;
      text-align: left;
      padding-left: 0;
      white-space: nowrap;
      vertical-align: middle;
      width: 200px;
    }
    
    .header-label {
      font-weight: bold;
      min-width: 90px;
      display: inline-block;
      text-align: left;
    }
    
    .header-value {
      display: inline-block;
      margin-left: 5px;
      text-align: left;
    }
    
    .table-container {
      margin: 6px 0;
    }
    
    .item-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
      font-size: 10px;
    }
    
    .item-table th,
    .item-table td {
      border: 1px solid #000;
      padding: 4px 6px;
      text-align: left;
      vertical-align: middle;
      min-height: 28px;
    }
    
    .item-table th {
      background-color: #f0f0f0;
      font-weight: bold;
      text-align: center;
      font-size: 10px;
    }
    
    .item-table td {
      font-size: 10px;
    }
    
    .item-table .col-no {
      width: 4%;
      text-align: center;
    }
    
    .item-table .col-item {
      width: 28%;
    }
    
    .item-table .col-quality {
      width: 14%;
      text-align: center;
    }
    
    .item-table .col-score {
      width: 9%;
      text-align: center;
    }
    
    .item-table .col-qty {
      width: 8%;
      text-align: right;
    }
    
    .item-table .col-unit {
      width: 6%;
      text-align: center;
    }
    
    .item-table .col-price {
      width: 12%;
      text-align: right;
    }
    
    .item-table .col-keterangan {
      width: 25%;
    }
    
    /* Header: Logo kiri, Company name + address center, garis sejajar dengan panjang alamat */
    .header-kop {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 2px;
      margin-top: 0;
    }

    .header-kop-left {
      width: 20%;
      flex-shrink: 0;
      position: relative;
      z-index: 1;
    }

    .header-kop-logo {
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

    .header-kop-logo[src=""],
    .header-kop-logo:not([src]) {
      display: none;
    }

    .header-kop-center {
      flex: 1;
      text-align: center;
      line-height: 1.2;
      font-size: 11px;
      padding: 0 15px;
      padding-bottom: 2px;
      margin-bottom: 1px;
      position: relative;
    }

    .header-kop-center::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 100%;
      border-bottom: 2px solid #000;
    }

    .header-kop-center .company-name {
      font-weight: 700;
      text-align: center;
      font-size: 18px;
      margin-bottom: 1px;
    }

    .header-kop-center .company-address {
      font-size: 10px;
      text-align: center;
      line-height: 1.3;
    }

    .header-kop-center .company-address-line {
      display: block;
    }

    .header-kop-right {
      width: 20%;
      flex-shrink: 0;
    }
    
    /* Signature table untuk Prepare, Check, Approve */
    .signature-table {
      width: 50%;
      border-collapse: collapse;
      margin-top: 6px;
      margin-left: auto;
      margin-right: 0;
      table-layout: fixed;
    }
    
    .signature-table th,
    .signature-table td {
      border: 1px solid #000;
      padding: 3px;
      text-align: center;
      font-size: 9px;
      height: 24px;
    }
    
    .signature-table th {
      background-color: #f0f0f0;
      font-weight: bold;
      height: 24px;
    }
    
    .signature-table th:nth-child(1),
    .signature-table th:nth-child(2),
    .signature-table th:nth-child(3) {
      width: 33.33%;
    }
    
    .signature-table tbody tr:nth-child(1) td {
      height: 40px;
    }
    
    .signature-table tbody tr:nth-child(2) td {
      height: 24px;
    }
    
    .page-info {
      text-align: right;
      font-size: 10px;
      margin-top: 6px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header-kop">
    <div class="header-kop-left">
      <img src="${logoSrc}" class="header-kop-logo" alt="Logo" onerror="this.style.display='none'; this.onerror=null;" />
    </div>
    <div class="header-kop-center">
      <div class="company-name">${htmlEscape(companyName)}</div>
      <div class="company-address">
        ${addressLine1 ? `<span class="company-address-line">${htmlEscape(addressLine1)}</span>` : ''}
        ${addressLine2 ? `<span class="company-address-line">${htmlEscape(addressLine2)}</span>` : ''}
      </div>
    </div>
    <div class="header-kop-right"></div>
  </div>

  <div class="title">PURCHASE REQUISITION</div>
  
  <div class="header">
    <div class="header-left">
      <div class="header-row">
        <span class="header-label">PO Number:</span>
        <span class="header-value">${poNo}</span>
      </div>
      <div class="header-row">
        <span class="header-label">PO Date:</span>
        <span class="header-value">${poDate}</span>
      </div>
      <div class="header-row">
        <span class="header-label">Supplier:</span>
        <span class="header-value">${supplier}</span>
      </div>
      ${supplierAddress ? `
      <div class="header-row">
        <span class="header-label">Address:</span>
        <span class="header-value">${supplierAddress}</span>
      </div>
      ` : ''}
    </div>
    <div class="header-right">
      <div class="header-row-right">
        <span class="header-label">PIC:</span><span class="header-value">${pic}</span>
      </div>
      <div class="header-row-right">
        <span class="header-label">Status:</span><span class="header-value">${status}</span>
      </div>
      <div class="header-row-right">
        <span class="header-label">Page:</span><span class="header-value">${page}${totalPages > 1 ? ` / ${totalPages}` : ''}</span>
      </div>
    </div>
  </div>
  
  <div class="table-container">
    <table class="item-table">
      <thead>
        <tr>
          <th class="col-no">No</th>
          <th class="col-item">Item</th>
          <th class="col-quality">Quality</th>
          <th class="col-score">Score</th>
          <th class="col-qty">Qty</th>
          <th class="col-unit">Unit</th>
          <th class="col-price">Harga Satuan</th>
          <th class="col-keterangan">Keterangan</th>
        </tr>
      </thead>
      <tbody>
        ${items.length > 0 ? items.map(item => {
          const price = typeof item.price === 'number' ? item.price : 0;
          return `
          <tr>
            <td class="col-no">${item.no}</td>
            <td class="col-item">${item.item || ''}</td>
            <td class="col-quality">${item.quality || ''}</td>
            <td class="col-score">${item.score !== undefined && item.score !== null ? item.score : ''}</td>
            <td class="col-qty">${typeof item.qty === 'number' ? item.qty.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 }) : item.qty || ''}</td>
            <td class="col-unit">${item.unit || ''}</td>
            <td class="col-price">${price > 0 ? `Rp ${price.toLocaleString('id-ID')}` : ''}</td>
            <td class="col-keterangan">${item.keterangan || ''}</td>
          </tr>
        `;
        }).join('') : ''}
        ${items.length > 0 && items.length <= 12 ? Array(Math.max(0, 12 - items.length)).fill(0).map((_, idx) => `
          <tr>
            <td class="col-no">${items.length + idx + 1}</td>
            <td class="col-item"></td>
            <td class="col-quality"></td>
            <td class="col-score"></td>
            <td class="col-qty"></td>
            <td class="col-unit"></td>
            <td class="col-price"></td>
            <td class="col-keterangan"></td>
          </tr>
        `).join('') : ''}
      </tbody>
    </table>
  </div>
  
  <table class="signature-table">
    <thead>
      <tr>
        <th>Prepare</th>
        <th>Check</th>
        <th>Approve</th>
      </tr>
    </thead>
    <tbody>
      ${Array(2).fill(0).map(() => `
        <tr>
          <td></td><td></td><td></td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  ${totalPages > 1 ? `<div class="page-info">Page ${page} of ${totalPages}</div>` : ''}
</body>
</html>`;

  return html;
}

