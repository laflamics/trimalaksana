import { ensureLogoIsBase64 } from '../utils/hardcoded-logo';
// Template test berdasarkan analisis invoice asli
// Posisi element dari foto:
// - Header info (No Transaksi, Tanggal, Kepada, Alamat, NPWP): TOP LEFT, margin ~10mm dari top
// - INVOICE title + logo: TOP CENTER, ~15mm dari top
// - Company info: TOP RIGHT, ~10mm dari top
// - Table items: START ~40mm dari top
// - Summary (Sub Total, Tax, Total): BOTTOM RIGHT, ~200mm dari top
// - Signature: BOTTOM LEFT, ~220mm dari top

export function generateInvoiceHtmlTestTemplate({
  logo,
  company,
  inv,
  customerAddress = '',
  customerNpwp = '',
  soSpecNote = '',
  productMap = {},
  productCodeMap = {},
  templateType = 'template_test',
  hideSO = false
}: any): string {
  try {
    // Ensure logo is base64 string, fallback ke hardcoded logo
    const logoSrc = ensureLogoIsBase64(logo);

    if (!inv) {
      return '<div>Error: Invoice data is missing</div>';
    }

    const bom = inv.bom || {};
    const lines = inv.lines || [];

    const subtotal = bom.subtotal ||
      lines.reduce((s: number, l: any) => s + Number(l.qty || 0) * Number(l.price || 0), 0);

    const total = bom.total || subtotal;
    const tax = bom.tax || 0;
    const discount = bom.discount || 0;
    const tanggalJt = bom.tanggalJt || '';
    const dpPo = bom.dpPo || 0;
    const tunai = bom.tunai || 0;
    const kredit = bom.kredit || 0;

    const discountPercent = subtotal > 0 ? (discount / subtotal) * 100 : 0;
    const formattedTanggalJt = tanggalJt ? new Date(tanggalJt).toLocaleDateString('id-ID') : '';
    const soNo = bom.soNo || inv.soNo || '';
    const soNoList = Array.isArray(soNo) ? soNo : (soNo ? [soNo] : []);

    // Split customer address
    let customerAddressLine1 = '';
    let customerAddressLine2 = '';
    let customerAddressLine3 = '';

    if (customerAddress) {
      const isLongAddress = customerAddress.length > 30;
      const isVeryLongAddress = customerAddress.length > 50;
      const words = customerAddress.split(/\s+/);

      if (isVeryLongAddress && words.length > 10) {
        const thirdPoint = Math.ceil(words.length / 3);
        const twoThirdPoint = Math.ceil(words.length * 2 / 3);
        customerAddressLine1 = words.slice(0, thirdPoint).join(' ');
        customerAddressLine2 = words.slice(thirdPoint, twoThirdPoint).join(' ');
        customerAddressLine3 = words.slice(twoThirdPoint).join(' ');
      } else if (isLongAddress) {
        const midPoint = Math.ceil(words.length / 2);
        customerAddressLine1 = words.slice(0, midPoint).join(' ');
        customerAddressLine2 = words.slice(midPoint).join(' ');
      } else {
        customerAddressLine1 = customerAddress;
      }
    }

    // Split company address
    let companyAddressLine1 = '';
    let companyAddressLine2 = '';
    let companyAddressLine3 = '';

    const companyFullAddress = company.address || '';
    if (companyFullAddress) {
      const isLongAddress = companyFullAddress.length > 30;
      const words = companyFullAddress.split(/\s+/);

      if (isLongAddress && words.length > 6) {
        const midPoint = Math.ceil(words.length / 2);
        companyAddressLine1 = words.slice(0, midPoint).join(' ');
        companyAddressLine2 = words.slice(midPoint).join(' ');
      } else {
        companyAddressLine1 = companyFullAddress;
      }
    }

    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Invoice ${inv.invNo || ''}</title>

<style>
  @page { 
    size: 9.5in 11in;
    margin: 10mm 10mm 10mm 10mm;
  }
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: Arial, sans-serif;
    font-size: 11px;
    line-height: 1.4;
    color: #000;
  }

  .container {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  /* HEADER SECTION */
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 15px;
    gap: 10px;
  }

  .header-left {
    flex: 1;
    font-size: 10px;
    line-height: 1.5;
  }

  .header-left-item {
    display: flex;
    margin-bottom: 2px;
  }

  .header-left-label {
    font-weight: bold;
    width: 80px;
    flex-shrink: 0;
  }

  .header-left-value {
    flex: 1;
    word-break: break-word;
  }

  .header-center {
    flex: 0 0 auto;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
  }

  .invoice-title {
    font-size: 24px;
    font-weight: bold;
    letter-spacing: 2px;
  }

  .header-logo {
    height: 60px;
    width: auto;
    max-width: 80px;
  }

  .header-right {
    flex: 1;
    font-size: 10px;
    line-height: 1.5;
    text-align: left;
  }

  .company-name {
    font-weight: bold;
    font-size: 11px;
    margin-bottom: 3px;
  }

  .company-address {
    font-size: 9px;
    margin-bottom: 3px;
  }

  .bank-info {
    font-size: 9px;
  }

  /* TABLE SECTION */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 10px;
  }

  th {
    background: #f0f0f0;
    border: 1px solid #000;
    padding: 4px;
    text-align: left;
    font-weight: bold;
    font-size: 9px;
  }

  td {
    border: 1px solid #000;
    padding: 3px 4px;
    text-align: left;
  }

  td.text-right {
    text-align: right;
  }

  tbody tr:last-child td {
    border-bottom: 2px solid #000;
  }

  /* SUMMARY SECTION */
  .summary-wrapper {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    gap: 10px;
    font-size: 10px;
  }

  .summary-left {
    flex: 1;
  }

  .summary-center {
    flex: 0 0 auto;
    width: 150px;
  }

  .summary-right {
    flex: 0 0 auto;
    width: 150px;
  }

  .summary-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9px;
  }

  .summary-table td {
    border: none;
    padding: 2px 4px;
  }

  .summary-table td:first-child {
    text-align: right;
    font-weight: bold;
    width: 60%;
  }

  .summary-table td:last-child {
    text-align: right;
    width: 40%;
  }

  .signature-block {
    margin-top: 15px;
    font-size: 9px;
  }

  .signature-name {
    margin-top: 40px;
    font-weight: bold;
  }

  .keterangan {
    font-size: 9px;
    line-height: 1.4;
    margin-top: 5px;
  }
</style>
</head>

<body>

<div class="container">

  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      <div class="header-left-item">
        <span class="header-left-label">No Transaksi</span>
        <span class="header-left-value">: ${inv.invNo || '-'}</span>
      </div>
      <div class="header-left-item">
        <span class="header-left-label">Tanggal</span>
        <span class="header-left-value">: ${inv.createdAt ? new Date(inv.createdAt).toLocaleDateString('id-ID') : '-'}</span>
      </div>
      <div class="header-left-item">
        <span class="header-left-label">Kepada</span>
        <span class="header-left-value" style="font-weight: bold;">: ${inv.customer || '-'}</span>
      </div>
      <div class="header-left-item">
        <span class="header-left-label">Alamat</span>
        <span class="header-left-value">: ${customerAddressLine1 || '-'}</span>
      </div>
      ${customerAddressLine2 ? `<div class="header-left-item"><span class="header-left-label"></span><span class="header-left-value">${customerAddressLine2}</span></div>` : ''}
      ${customerAddressLine3 ? `<div class="header-left-item"><span class="header-left-label"></span><span class="header-left-value">${customerAddressLine3}</span></div>` : ''}
      <div class="header-left-item">
        <span class="header-left-label">NPWP</span>
        <span class="header-left-value">: ${customerNpwp || '-'}</span>
      </div>
    </div>

    <div class="header-center">
      <div class="invoice-title">INVOICE</div>
      ${logoSrc ? `<img src="${logoSrc}" class="header-logo" alt="Logo" onerror="this.style.display='none';" />` : ''}
    </div>

    <div class="header-right">
      <div class="company-name">${company.companyName || ''}</div>
      <div class="company-address">
        ${companyAddressLine1 || ''}
        ${companyAddressLine2 ? `<br/>${companyAddressLine2}` : ''}
      </div>
      <div class="bank-info">
        <strong>${company.bankName || 'Bank MANDIRI, KCP JKT Cimanggis'}</strong><br/>
        AC: ${company.bankAccount || '129-00-1116726-5'}
      </div>
    </div>
  </div>

  <!-- TABLE -->
  <table>
    <thead>
      <tr>
        <th style="width: 5%;">No</th>
        <th style="width: 10%;">Kode Item</th>
        <th style="width: 35%;">Nama Item</th>
        ${!hideSO ? '<th style="width: 10%;">SO</th>' : ''}
        <th style="width: 12%;">Satuan</th>
        <th style="width: 12%;">Harga</th>
        ${hideSO ? '<th style="width: 8%;">POT</th>' : ''}
        <th style="width: 12%;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${lines.map((l: any, i: number): string => {
        let name = productMap[l.itemSku] || l.itemSku;
        name = name.replace(/\s*\(SO:\s*[^)]+\)/gi, '').trim();
        const code = productCodeMap[l.itemSku] || '';
        const soNo = l.soNo || '';
        const pot = l.pot || 0;
        const totalLine = Number(l.qty || 0) * Number(l.price || 0);

        return `
          <tr>
            <td>${i + 1}</td>
            <td>${code || ''}</td>
            <td>${name}</td>
            ${!hideSO ? `<td>${soNo || '-'}</td>` : ''}
            <td>${l.qty} ${l.unit || 'PCS'}</td>
            <td class="text-right">${Number(l.price).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            ${hideSO ? `<td class="text-right">${Number(pot).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>` : ''}
            <td class="text-right">${totalLine.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
          </tr>
        `;
      }).join('')}
      ${Array(Math.max(0, 15 - lines.length)).fill(0).map(() => `
        <tr>
          <td></td>
          <td></td>
          <td></td>
          ${!hideSO ? '<td></td>' : ''}
          <td></td>
          <td></td>
          ${hideSO ? '<td></td>' : ''}
          <td></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- SUMMARY -->
  <div class="summary-wrapper">
    <div class="summary-left">
      <div class="keterangan">
        ${inv.notes ? `Keterangan : ${inv.notes}` : (soNoList.length > 0 ? soNoList.map((so: string) => `Keterangan : ${so}`).join('<br/>') : 'Keterangan : -')}
      </div>
      <div class="signature-block">
        Hormat kami<br/><br/><br/><br/>
        <div class="signature-name">${bom.tandaTangan || '(.........................)'}
        </div>
      </div>
    </div>

    <div class="summary-center">
      <table class="summary-table">
        <tr>
          <td>Jml Item :</td>
          <td>${lines.length}</td>
        </tr>
        <tr>
          <td>Potongan :</td>
          <td>${discountPercent.toFixed(2)}%</td>
        </tr>
        <tr>
          <td>Pajak (11%):</td>
          <td>${tax.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td>Lain-lain :</td>
          <td>${(bom.biayaLain || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td>Jatuh Tempo :</td>
          <td>${formattedTanggalJt || '-'}</td>
        </tr>
      </table>
    </div>

    <div class="summary-right">
      <table class="summary-table">
        <tr>
          <td>Sub Total :</td>
          <td>${subtotal.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        <tr style="font-weight: bold; border-top: 2px solid #000;">
          <td>Total Akhir :</td>
          <td>${total.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td>DP PO :</td>
          <td>${dpPo.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td>Tunai :</td>
          <td>${tunai.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
        <tr>
          <td>Kredit :</td>
          <td>${kredit.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
      </table>
    </div>
  </div>

</div>

</body>
</html>`;
  } catch (error: any) {
    console.error('Error generating invoice HTML:', error);
    return `<div style="color: red; padding: 20px;">Error generating invoice: ${error.message}</div>`;
  }
}
