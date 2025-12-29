/**
 * Template Struktur PDF Quotation
 * Diambil dari: desktop/src/general-trading/sales-orders.tsx - fungsi generateQuotationHtmlFromData()
 */

interface Company {
  companyName?: string;
  address?: string;
  phone?: string;
  picPurchasingName?: string;
}

interface QuotationItem {
  no?: string | number;
  description?: string;
  qty?: string | number;
  uom?: string;
  unitPrice?: string | number;
  amount?: string | number;
}

interface QuotationData {
  quoteNo?: string;
  quoteDate?: string;
  customerName?: string;
  customerAddress?: string;
  attnTo?: string;
  contact?: string;
  items?: QuotationItem[];
  discountPercent?: string | number;
  remarks?: string[];
}

interface SO {
  soNo?: string;
}

interface GenerateQuotationHtmlParams {
  logoBase64: string;              // Base64 logo
  company: Company;                 // { companyName, address, phone, picPurchasingName }
  qData: QuotationData;             // { quoteNo, quoteDate, customerName, customerAddress, attnTo, contact, items, discountPercent, remarks }
  so?: SO | null;                   // { soNo } - optional
}

export function generateQuotationHtml({
  logoBase64,
  company,
  qData,
  so = null
}: GenerateQuotationHtmlParams): string {
  // Format tanggal untuk Quote Date: "October 27, 2015"
  const formatDateLong = (dateStr: string): string => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    } catch {
      return dateStr;
    }
  };

  const soDate = qData.quoteDate ? formatDateLong(qData.quoteDate) : formatDateLong(new Date().toISOString());
  const quoteNo = qData.quoteNo || `QUO-${so?.soNo || Date.now()}`;
  
  const companyName = company.companyName || 'PT. TRIMA LAKSANA JAYA PRATAMA';
  const companyAddress = company.address || 'Jl. Raya Cikarang Cibarusah Km. 10';
  const companyAddress2 = 'RT. 11/06, Desa Ciantra Kec. Cikarang Selatan';
  const companyAddress3 = 'Bekasi';
  const companyPhone = company.phone || '021 8982 3556';
  const directorName = company.picPurchasingName || 'M. ALAUDDIN';
  
  // Parse items
  const items = qData.items || [];
  const subtotal = items.reduce((sum, item) => sum + (Number(item.amount || 0)), 0);
  const discountPercent = Number(qData.discountPercent || 0);
  const discount = subtotal * discountPercent / 100;
  const total = subtotal - discount;
  
  // Format customer address (split by newline atau comma)
  const customerAddressLines = (qData.customerAddress || '').split('\n').filter(l => l.trim());
  if (customerAddressLines.length === 0 && qData.customerAddress) {
    customerAddressLines.push(qData.customerAddress);
  }
  
  const html = `<!doctype html>
<html>
<head>
  <meta charset='utf-8'>
  <title>Quotation ${quoteNo}</title>
  <style>
    @page { 
      size: A4 portrait; 
      margin: 15mm 25mm; 
    }
    * { 
      box-sizing: border-box; 
    }
    body { 
      font-family: Arial, sans-serif; 
      font-size: 13px; 
      margin: 0; 
      padding: 0 20px; 
      color: #000; 
    }
    .header { 
      display: flex; 
      justify-content: space-between; 
      align-items: flex-start; 
      margin-bottom: 20px; 
      border-bottom: 2px solid #000; 
      padding-bottom: 12px; 
    }
    .header-left { 
      flex: 1; 
      padding-right: 20px; 
      max-width: 60%; 
    }
    .company-name { 
      font-weight: bold; 
      font-size: 18px; 
      margin-bottom: 8px; 
    }
    .company-address { 
      font-size: 12px; 
      line-height: 1.6; 
      margin-bottom: 2px; 
    }
    .header-right { 
      text-align: right; 
      position: relative; 
      flex-shrink: 0; 
      padding-left: 20px; 
    }
    .logo { 
      width: 90px; 
      height: auto; 
      margin-bottom: 12px; 
    }
    .quote-info { 
      text-align: right; 
      font-size: 12px; 
      margin-top: 8px; 
      line-height: 1.8; 
    }
    .quote-info-label { 
      font-weight: bold; 
    }
    .item-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 18px 0; 
      font-size: 12px; 
    }
    .item-table thead tr { 
      background-color: #000; 
      color: #fff; 
    }
    .item-table th { 
      padding: 10px 6px; 
      text-align: left; 
      font-weight: bold; 
      font-size: 12px; 
    }
    .item-table th:nth-child(3), 
    .item-table th:nth-child(4), 
    .item-table th:nth-child(5), 
    .item-table th:nth-child(6) { 
      text-align: right; 
    }
    .item-table td { 
      padding: 6px 6px; 
      border-bottom: 1px solid #ddd; 
      font-size: 12px; 
    }
    .item-table tbody tr:nth-child(even) { 
      background-color: #f5f5f5; 
    }
    .item-table td:nth-child(3), 
    .item-table td:nth-child(4), 
    .item-table td:nth-child(5), 
    .item-table td:nth-child(6) { 
      text-align: right; 
    }
    .summary-section { 
      margin-top: 18px; 
      display: flex; 
      justify-content: flex-end; 
    }
    .summary-table { 
      border-collapse: collapse; 
      font-size: 12px; 
      width: 280px; 
    }
    .summary-table td { 
      padding: 6px 10px; 
      text-align: right; 
    }
    .summary-table td:first-child { 
      text-align: left; 
      font-weight: bold; 
    }
    .summary-table .total-row { 
      font-weight: bold; 
      border-top: 1px solid #000; 
    }
    .remarks-section { 
      margin-top: 25px; 
      font-size: 12px; 
    }
    .remarks-label { 
      font-weight: bold; 
      margin-bottom: 8px; 
    }
    .remarks-list { 
      margin: 0; 
      padding-left: 20px; 
      line-height: 1.8; 
    }
    .signature-section { 
      margin-top: 40px; 
      text-align: right; 
      font-size: 12px; 
    }
    .signature-company { 
      font-weight: bold; 
      margin-bottom: 50px; 
    }
    .signature-box { 
      margin-top: 50px; 
      width: 220px; 
      margin-left: auto; 
      padding-bottom: 5px; 
    }
    .signature-image {
      margin-bottom: 10px;
      max-width: 200px;
      max-height: 80px;
      object-fit: contain;
    }
    .signature-line {
      border-top: 1px solid #000;
      margin-top: 5px;
      padding-top: 5px;
    }
    .signature-name { 
      margin-top: 5px; 
      font-weight: bold; 
    }
    .signature-title { 
      font-size: 11px; 
      margin-top: 3px; 
    }
    .recipient-section {
      margin-top: 20px;
      margin-bottom: 15px;
    }
    .recipient-name {
      font-weight: bold;
      font-size: 14px;
      margin-bottom: 5px;
    }
    .recipient-address {
      font-size: 12px;
      line-height: 1.6;
      margin-bottom: 2px;
    }
    .salutation {
      margin-bottom: 15px;
      font-size: 12px;
    }
    .intro-text {
      margin-bottom: 15px;
      font-size: 12px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <div class="company-name">${companyName}</div>
      <div class="company-address">${companyAddress}</div>
      <div class="company-address">${companyAddress2}</div>
      <div class="company-address">${companyAddress3}</div>
      <div class="company-address" style="margin-top: 5px;">Tel: ${companyPhone}</div>
    </div>
    <div class="header-right">
      <img src="${logoBase64}" class="logo" alt="Logo" />
      <div class="quote-info">
        <div><span class="quote-info-label">Quote No.:</span> ${quoteNo}</div>
        <div><span class="quote-info-label">Quote Date:</span> ${soDate}</div>
      </div>
    </div>
  </div>

  <div class="recipient-section">
    <div class="recipient-left">
      <div class="recipient-name">${qData.customerName || ''}</div>
      ${customerAddressLines.map(line => `<div class="recipient-address">${line}</div>`).join('')}
    </div>
  </div>

  <div class="salutation">
    <div><strong>Attn. To:</strong> ${qData.attnTo || '-'}</div>
    <div><strong>Contact:</strong> ${qData.contact || '-'}</div>
  </div>

  <div class="intro-text">
    <div><strong>Dear Mr./Mrs.</strong></div>
    <div>Thanks for your Inquiry.</div>
    <div>Here we offer the Requested Goods Below:</div>
  </div>

  <table class="item-table">
    <thead>
      <tr>
        <th style="width: 5%;">NO</th>
        <th style="width: 45%;">DESCRIPTION</th>
        <th style="width: 10%;">QTY</th>
        <th style="width: 10%;">UoM</th>
        <th style="width: 15%;">UNIT PRICE</th>
        <th style="width: 15%;">AMOUNT</th>
      </tr>
    </thead>
    <tbody>
      ${items.length > 0 ? items.map((item) => `
        <tr>
          <td>${item.no || ''}</td>
          <td>${item.description || ''}</td>
          <td>${Number(item.qty || 0).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 })}</td>
          <td>${item.uom || 'Pcs'}</td>
          <td>Rp ${Number(item.unitPrice || 0).toLocaleString('id-ID')}</td>
          <td>Rp ${Number(item.amount || 0).toLocaleString('id-ID')}</td>
        </tr>
      `).join('') : '<tr><td colspan="6" style="text-align:center;">No items</td></tr>'}
      ${items.length > 0 && items.length < 10 ? Array(10 - items.length).fill(0).map(() => `
        <tr>
          <td></td><td></td><td></td><td></td><td></td><td></td>
        </tr>
      `).join('') : ''}
    </tbody>
  </table>

  <div class="summary-section">
    <table class="summary-table">
      <tr>
        <td>Sub Total:</td>
        <td>Rp ${subtotal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
      <tr>
        <td>Discount (${discountPercent}%):</td>
        <td>Rp ${discount > 0 ? discount.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>
      </tr>
      <tr class="total-row">
        <td>Total:</td>
        <td>Rp ${total.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      </tr>
    </table>
  </div>

  <div class="remarks-section">
    <div class="remarks-label">Remark:</div>
    <ul class="remarks-list">
      ${(qData.remarks || []).map(r => `<li>${r}</li>`).join('')}
    </ul>
  </div>

  <div class="signature-section">
    <div class="signature-company">${companyName}</div>
    <div class="signature-box">
      <div class="signature-line">
        <div class="signature-name">${directorName}</div>
        <div class="signature-title">Direktur Utama</div>
      </div>
    </div>
  </div>
</body>
</html>`;

  return html;
}

