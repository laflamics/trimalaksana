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
    keterangan?: string;
  }>;
  companyName: string;
  companyAddress: string;
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
  page = 1,
  totalPages = 1,
}: POSheetParams): string {
  const html = `<!doctype html>
<html>
<head>
  <meta charset='utf-8'>
  <title>${poNo}</title>
  <style>
    @page { 
      size: A4 landscape; 
      margin: 12mm; 
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
      font-size: 13px; 
      color: #000; 
      padding: 8mm; 
    }
    
    @media print {
      @page { 
        size: A4 landscape; 
        margin: 12mm; 
      }
      body { 
        padding: 8mm; 
      }
    }
    
    .title {
      text-align: center;
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #000;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid #000;
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
      margin-bottom: 6px;
      font-size: 13px;
      align-items: center;
    }
    
    .header-row-right {
      display: table;
      margin-bottom: 6px;
      font-size: 13px;
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
      margin: 15px 0;
    }
    
    .item-table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 12px;
    }
    
    .item-table th,
    .item-table td {
      border: 1px solid #000;
      padding: 8px 10px;
      text-align: left;
      vertical-align: middle;
      min-height: 35px;
    }
    
    .item-table th {
      background-color: #f0f0f0;
      font-weight: bold;
      text-align: center;
      font-size: 12px;
    }
    
    .item-table td {
      font-size: 12px;
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
      width: 9%;
      text-align: right;
    }
    
    .item-table .col-keterangan {
      width: 36%;
    }
    
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #000;
      text-align: center;
      font-size: 12px;
    }
    
    .footer-company {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 4px;
    }
    
    .footer-address {
      font-size: 12px;
      line-height: 1.4;
    }
    
    .page-info {
      text-align: right;
      font-size: 11px;
      margin-top: 10px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="title">PURCHASE ORDER SHEET</div>
  
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
          <th class="col-keterangan">Keterangan</th>
        </tr>
      </thead>
      <tbody>
        ${items.length > 0 ? items.map(item => `
          <tr>
            <td class="col-no">${item.no}</td>
            <td class="col-item">${item.item || ''}</td>
            <td class="col-quality">${item.quality || ''}</td>
            <td class="col-score">${item.score !== undefined && item.score !== null ? item.score : ''}</td>
            <td class="col-qty">${typeof item.qty === 'number' ? item.qty.toLocaleString('id-ID') : item.qty || ''}</td>
            <td class="col-keterangan">${item.keterangan || ''}</td>
          </tr>
        `).join('') : ''}
        ${Array(Math.max(0, 10 - items.length)).fill(0).map((_, idx) => `
          <tr>
            <td class="col-no">${items.length + idx + 1}</td>
            <td class="col-item"></td>
            <td class="col-quality"></td>
            <td class="col-score"></td>
            <td class="col-qty"></td>
            <td class="col-keterangan"></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <div class="footer">
    <div class="footer-company">${companyName}</div>
    <div class="footer-address">${companyAddress}</div>
  </div>
  
  ${totalPages > 1 ? `<div class="page-info">Page ${page} of ${totalPages}</div>` : ''}
</body>
</html>`;

  return html;
}

