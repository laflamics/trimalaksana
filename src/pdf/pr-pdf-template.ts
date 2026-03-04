import { ensureLogoIsBase64 } from '../utils/hardcoded-logo';
/**
 * Template Struktur PDF Purchase Request (PR)
 * Mirip dengan PO template, tapi untuk Purchase Request
 * 
 * Usage:
 *   - Ganti semua variable dengan data yang sesuai
 *   - Variable yang perlu diisi:
 *     * logo (base64 atau URL)
 *     * company (object dengan companyName, address)
 *     * detail (object dengan prNo, createdAt, spkNo, soNo)
 *     * customer, product
 *     * enrichedLines (array of items dengan itemName, itemSku, qty, price, unit, description)
 *     * total
 */

interface PRHtmlParams {
  logo: string;
  company: { companyName: string; address: string };
  detail: { prNo: string; createdAt: string; spkNo?: string; soNo?: string };
  customer: string;
  product: string;
  enrichedLines: Array<{ itemName: string; itemSku: string; qty: number; price: number; unit: string; description: string }>;
  total: number;
}

export function generatePRHtml({
  logo,
  company,
  detail,
  customer,
  product,
  enrichedLines,
  total,
}: PRHtmlParams): string {
  // Logo harus sudah base64 string (dari component yang memanggil template ini)
  // Fallback ke placeholder base64 jika tidak ada
  const logoSrc = ensureLogoIsBase64(logo);
  
  // Format tanggal: DD/MM/YYYY
  const formatDate = (dateStr: string | undefined): string => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  const prDate = formatDate(detail.createdAt || new Date().toISOString());

  const html = `<!doctype html>
<html>
<head>
  <meta charset='utf-8'>
  <title>${detail.prNo}</title>
  <style>
    @page { 
      size: Letter; 
      margin: 10mm; 
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
      font-family: Arial, sans-serif; 
      font-size: 11px; 
      color: #000; 
      padding: 5mm 8mm 10mm 8mm; 
    }
    @media print {
      @page { 
        size: Letter; 
        margin: 10mm; 
      }
      body { 
        padding: 5mm 8mm 10mm 8mm; 
      }
      .header-logo {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        max-width: 100%;
        height: auto;
        max-height: 90px;
        display: block;
      }
      
      .header-logo[src=""],
      .header-logo:not([src]) {
        display: none;
      }
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
    }

    .header-center-text .company-address {
      font-size: 10px;
      text-align: center;
      line-height: 1.3;
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
    /* PR title di bawah garis header - sejajar dengan header center */
    .pr-title-wrapper {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-top: 2px;
      margin-bottom: 8px;
    }

    .pr-title-wrapper .pr-spacer-left {
      width: 20%;
      flex-shrink: 0;
    }

    .pr-title-section {
      flex: 1;
      text-align: center;
      padding: 0 20px;
    }

    .pr-title-wrapper .pr-spacer-right {
      width: 20%;
      flex-shrink: 0;
    }

    .pr-title-section .pr-title {
      font-weight: 700;
      font-size: 16px;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
      text-transform: uppercase;
    }

    .pr-title-section .pr-number {
      font-weight: 600;
      font-size: 11px;
    }
    .order-details { 
      display: table; 
      width: 100%; 
      margin: 8px 0 12px 0; 
      border-collapse: separate;
      border-spacing: 0;
    }
    .order-details-left, .order-details-right { 
      display: table-cell;
      width: 50%; 
      vertical-align: top;
      padding-right: 12px;
    }
    .order-details-right {
      padding-right: 0;
      padding-left: 12px;
    }
    .order-detail-row { 
      margin: 2px 0; 
      font-size: 11px; 
      line-height: 1.4;
      display: block;
    }
    .order-detail-label { 
      font-weight: bold; 
      display: inline-block; 
      width: 110px; 
      vertical-align: top;
    }
    .item-intro { 
      margin: 6px 0 4px 0; 
      font-size: 11px; 
    }
    .item-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 6px 0 10px 0; 
      font-size: 10px; 
      table-layout: auto;
    }
    .item-table th, .item-table td { 
      border: 1px solid #000; 
      padding: 4px 6px; 
      text-align: center; 
      vertical-align: middle;
      white-space: nowrap;
      height: 28px;
    }
    .item-table th { 
      background-color: #f0f0f0; 
      font-weight: bold; 
      font-size: 10px;
      text-transform: uppercase;
    }
    .item-table td { 
      font-size: 10px;
    }
    .item-table .text-left { 
      text-align: left; 
      padding-left: 4px;
      white-space: normal;
      word-wrap: break-word;
    }
    .summary-left { 
      width: 48%; 
    }
    .summary-right { 
      width: auto; 
      margin-left: auto;
      text-align: right;
    }
    .summary-section { 
      display: flex; 
      justify-content: space-between; 
      margin-top: 8px; 
      align-items: flex-start;
    }
    .summary-row { 
      margin: 2px 0; 
      font-size: 11px; 
      line-height: 1.4;
      display: table;
      width: 100%;
      max-width: 400px;
      margin-left: auto;
    }
    .summary-label { 
      font-weight: bold; 
      text-align: left;
      display: table-cell;
      width: 150px;
      min-width: 150px;
      max-width: 150px;
      white-space: nowrap;
      padding-right: 0;
      vertical-align: baseline;
    }
    .summary-value { 
      font-weight: bold; 
      text-align: left;
      display: table-cell;
      white-space: nowrap;
      padding-left: 5px;
    }
    .note-section { 
      margin-top: 0; 
    }
    .note-label { 
      font-weight: 700; 
      margin-bottom: 2px;
      font-size: 10px;
    }
    .note-text { 
      font-size: 10px;
      line-height: 1.3;
      margin-bottom: 4px;
      padding-bottom: 1em;
      min-height: 2em;
    }
    .signature-section {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 15px;
      margin-top: 10px;
      margin-left: 0;
      margin-right: 0;
      padding-left: 0;
      padding-right: 0;
      width: 100%;
      box-sizing: border-box;
    }
    .approval-table { 
      border-collapse: collapse; 
      table-layout: fixed;
      flex: 0 0 auto;
    }
    .approval-table th, .approval-table td { 
      border: 1px solid #000; 
      padding: 3px; 
      text-align: center; 
      font-size: 10px; 
      height: 24px; 
      vertical-align: middle;
      width: 150px;
    }
    .approval-table tbody tr:nth-child(1) td {
      height: 40px;
    }
    .approval-table tbody tr:nth-child(2) td {
      height: 24px;
    }
    .approval-table tbody tr:nth-child(3) td {
      height: 18px;
    }
    .approval-table th { 
      background-color: #f0f0f0; 
      font-weight: bold; 
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="${logoSrc}" class="header-logo" alt="Logo" onerror="this.style.display='none'; this.onerror=null;" />
    </div>
    <div class="header-center-text">
      <div class="company-name">${company.companyName || 'PT TRIMA LAKSANA JAYA PRATAMA'}</div>
      <div class="company-address">
        ${(company.address || 'Jl. Raya Cikarang Cibarusah Kp. Kukun RT 11/06 Desa Ciantra Kecamatan Cikarang Selatan Kabupaten Bekasi').split(',').map((line: string) => `<span class="company-address-line">${line.trim()}</span>`).join('')}
      </div>
    </div>
    <div class="header-right"></div>
  </div>

  <div class="pr-title-wrapper">
    <div class="pr-spacer-left"></div>
    <div class="pr-title-section">
      <div class="pr-title">PURCHASE REQUEST</div>
      <div class="pr-number">No. ${detail.prNo}</div>
    </div>
    <div class="pr-spacer-right"></div>
  </div>

  <div class="order-details">
    <div class="order-details-left">
      <div class="order-detail-row">
        <span class="order-detail-label">Tanggal</span>
        <span>: ${prDate}</span>
      </div>
      <div class="order-detail-row">
        <span class="order-detail-label">SPK No</span>
        <span>: ${detail.spkNo || '-'}</span>
      </div>
      <div class="order-detail-row">
        <span class="order-detail-label">SO No</span>
        <span>: ${detail.soNo || '-'}</span>
      </div>
      <div class="order-detail-row">
        <span class="order-detail-label">Customer</span>
        <span>: ${customer || '-'}</span>
      </div>
    </div>
    <div class="order-details-right">
      <div class="order-detail-row">
        <span class="order-detail-label">Product</span>
        <span>: ${product || '-'}</span>
      </div>
    </div>
  </div>

  <div class="item-intro">Detail item sebagai berikut :</div>
  <table class="item-table">
    <thead>
      <tr>
        <th rowspan="2">NO</th>
        <th rowspan="2">SKU</th>
        <th rowspan="2">NAMA ITEM</th>
        <th colspan="2">JUMLAH</th>
        <th colspan="2">SUB TOTAL</th>
      </tr>
      <tr>
        <th>Qt.</th>
        <th>UNIT</th>
        <th>SATUAN</th>
        <th>Rp.</th>
      </tr>
    </thead>
    <tbody>
      ${enrichedLines.length > 0 ? enrichedLines.map((l, idx) => {
        const q = Number(l.qty || 0);
        const p = Number(l.price || 0);
        const a = q * p;
        const u = l.unit || '';
        const itemName = l.itemName || '-';
        const itemSku = l.itemSku || '-';
        
        return `
          <tr>
            <td>${idx + 1}</td>
            <td class="text-left">${itemSku}</td>
            <td class="text-left">${itemName}</td>
            <td style="text-align: right;">${q.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}</td>
            <td>${u}</td>
            <td style="text-align: right;">${p.toLocaleString('id-ID')}</td>
            <td style="text-align: right;">${a.toLocaleString('id-ID')}</td>
          </tr>
        `;
      }).join('') : '<tr><td colspan="7" style="text-align:center;">No items</td></tr>'}
      ${enrichedLines.length > 0 && enrichedLines.length <= 8 ? Array(Math.max(0, 8 - enrichedLines.length)).fill(0).map(() => `
        <tr>
          <td></td><td></td><td></td><td></td><td></td><td></td><td></td>
        </tr>
      `).join('') : ''}
    </tbody>
  </table>

  <div class="summary-section">
    <div class="summary-left">
      <div class="note-section">
        <div class="note-label">NOTE:</div>
        <div class="note-text"></div>
      </div>
    </div>
    <div class="summary-right">
      <div class="summary-row">
        <span class="summary-label">TOTAL</span>
        <span class="summary-value">: Rp ${total.toLocaleString('id-ID')}</span>
      </div>
    </div>
  </div>

  <div class="signature-section">
    <table class="approval-table">
      <thead>
        <tr>
          <th>APPROVAL</th>
          <th>CHECKED</th>
          <th>PIC</th>
        </tr>
      </thead>
      <tbody>
        ${Array(2).fill(0).map(() => `
          <tr>
            <td></td>
            <td></td>
            <td></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
</body>
</html>`;

  return html;
}
