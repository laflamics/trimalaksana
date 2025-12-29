import { loadLogoAsBase64 } from '../utils/logo-loader';

export function generateBacHtml({
  logo,
  company,
  returnData,
  sourceData,
}: {
  logo?: string;
  company: {
    companyName?: string;
    address?: string;
  };
  returnData: {
    returnNo: string;
    sourceType: 'SO' | 'PO';
    sourceNo: string;
    productName: string;
    productKode: string;
    qty: number;
    unit: string;
    reason?: string;
    notes?: string;
    created: string;
  };
  sourceData?: {
    customer?: string;
    supplier?: string;
  };
}): string {
  const returnDate = new Date(returnData.created);
  const formattedDate = returnDate.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>BAC - ${returnData.returnNo}</title>

<style>
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: Arial, sans-serif;
    font-size: 13px;
    padding: 15mm;
    color: #000;
  }

  .header {
    text-align: center;
    margin-bottom: 20px;
  }

  .logo {
    max-width: 80px;
    max-height: 80px;
    margin-bottom: 10px;
  }

  .company-name {
    font-weight: bold;
    font-size: 16px;
    margin-bottom: 5px;
    text-transform: uppercase;
  }

  .company-address {
    font-size: 11px;
    line-height: 1.4;
  }

  .title {
    text-align: center;
    font-size: 20px;
    font-weight: bold;
    text-decoration: underline;
    margin: 20px 0;
    text-transform: uppercase;
  }

  .info-section {
    margin-bottom: 15px;
  }

  .info-row {
    display: flex;
    margin-bottom: 8px;
    align-items: flex-start;
  }

  .info-label {
    font-weight: bold;
    min-width: 150px;
    flex-shrink: 0;
  }

  .info-value {
    flex: 1;
  }

  .divider {
    border-top: 1px solid #000;
    margin: 15px 0;
  }

  .content-section {
    margin-bottom: 20px;
  }

  .content-label {
    font-weight: bold;
    margin-bottom: 8px;
  }

  .content-text {
    line-height: 1.6;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }

  th, td {
    border: 1px solid #000;
    padding: 8px;
    text-align: left;
  }

  th {
    background-color: #f2f2f2;
    font-weight: bold;
  }

  .signature-section {
    margin-top: 40px;
    display: flex;
    justify-content: space-between;
  }

  .signature-box {
    text-align: center;
    width: 45%;
    min-width: 240px;
  }

  .signature-label {
    font-weight: bold;
    margin-bottom: 80px;
  }

  .signature-line {
    border-top: 1px solid #000;
    margin-top: 5px;
    padding-top: 5px;
    min-width: 190px;
    width: 100%;
  }

  .signature-name {
    font-weight: bold;
    margin-top: 5px;
  }
</style>
</head>
<body>

  <!-- HEADER -->
  <div class="header">
    ${logo ? `<img src="${logo}" alt="Logo" class="logo" />` : ''}
    <div class="company-name">${company.companyName || 'PT TRIMA LAKSANA JAYA PRATAMA'}</div>
    <div class="company-address">${company.address || 'Jl. Raya Bekasi Km. 28, Cikarang, Bekasi 17530'}</div>
  </div>

  <!-- TITLE -->
  <div class="title">BERITA ACARA</div>

  <!-- INFO SECTION -->
  <div class="info-section">
    <div class="info-row">
      <div class="info-label">No. BAC:</div>
      <div class="info-value">${returnData.returnNo}</div>
    </div>
    <div class="info-row">
      <div class="info-label">Tanggal:</div>
      <div class="info-value">${formattedDate}</div>
    </div>
    <div class="info-row">
      <div class="info-label">${returnData.sourceType === 'SO' ? 'SO No' : 'PO No'}:</div>
      <div class="info-value">${returnData.sourceNo}</div>
    </div>
    ${returnData.sourceType === 'SO' && sourceData?.customer ? `
    <div class="info-row">
      <div class="info-label">Customer:</div>
      <div class="info-value">${sourceData.customer}</div>
    </div>
    ` : ''}
    ${returnData.sourceType === 'PO' && sourceData?.supplier ? `
    <div class="info-row">
      <div class="info-label">Supplier:</div>
      <div class="info-value">${sourceData.supplier}</div>
    </div>
    ` : ''}
  </div>

  <div class="divider"></div>

  <!-- CONTENT SECTION -->
  <div class="content-section">
    <div class="content-label">Barang yang Dikembalikan:</div>
    <table>
      <thead>
        <tr>
          <th>No</th>
          <th>Kode Barang</th>
          <th>Nama Barang</th>
          <th>Qty</th>
          <th>Satuan</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="text-align: center;">1</td>
          <td>${returnData.productKode}</td>
          <td>${returnData.productName}</td>
          <td style="text-align: center;">${returnData.qty}</td>
          <td style="text-align: center;">${returnData.unit}</td>
        </tr>
      </tbody>
    </table>
  </div>

  ${returnData.reason ? `
  <div class="content-section">
    <div class="content-label">Alasan Return:</div>
    <div class="content-text">${returnData.reason}</div>
  </div>
  ` : ''}

  ${returnData.notes ? `
  <div class="content-section">
    <div class="content-label">Catatan:</div>
    <div class="content-text">${returnData.notes}</div>
  </div>
  ` : ''}

  <div class="divider"></div>

  <!-- SIGNATURE SECTION -->
  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-label">Yang Menyerahkan</div>
      <div class="signature-line"></div>
      <div class="signature-name">${returnData.sourceType === 'SO' ? (sourceData?.customer || '') : (sourceData?.supplier || '')}</div>
    </div>
    <div class="signature-box">
      <div class="signature-label">Yang Menerima</div>
      <div class="signature-line"></div>
      <div class="signature-name">PT TRIMA LAKSANA JAYA PRATAMA</div>
    </div>
  </div>

</body>
</html>`;
}

