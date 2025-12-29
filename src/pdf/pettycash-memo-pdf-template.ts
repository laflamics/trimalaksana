/**
 * Template PDF untuk INTERNAL MEMO - Permohonan Dana Petty Cash
 * Format sesuai dengan screenshot yang diberikan user
 */

interface PettyCashMemoItem {
  no: number;
  customer: string;
  tujuan: string;
  unit: string;
  uraian: string;
  ket: string;
  nominal: number;
}

interface PettyCashMemoParams {
  logo: string;
  company: { companyName: string; address: string };
  memoDate: string;
  location: string; // Lokasi (contoh: Cikarang)
  items: PettyCashMemoItem[];
  total: number;
  bankAccountNo: string;
  bankName: string;
  recipientName: string;
}

export function generatePettyCashMemoHtml({
  logo,
  company,
  memoDate,
  location,
  items,
  total,
  bankAccountNo,
  bankName,
  recipientName,
}: PettyCashMemoParams): string {
  const logoSrc = logo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwN2JmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxPR088L3RleHQ+PC9zdmc+';
  
  // Format tanggal: DD Month YYYY (contoh: 26 November 2025)
  const formatDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      const day = d.getDate();
      const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
                      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day} ${month} ${year}`;
    } catch {
      return dateStr;
    }
  };

  const formattedDate = formatDate(memoDate);
  const formattedTotal = total.toLocaleString('id-ID');
  
  // Format total dengan IDR (sesuai screenshot)
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('id-ID');
  };

  // Generate table rows
  const tableRows = items.map(item => `
    <tr>
      <td style="text-align: center;">${item.no}</td>
      <td style="text-align: left; padding-left: 6px;">${item.customer || ''}</td>
      <td style="text-align: left; padding-left: 6px;">${item.tujuan || ''}</td>
      <td style="text-align: center;">${item.unit || ''}</td>
      <td style="text-align: left; padding-left: 6px;">${item.uraian || ''}</td>
      <td style="text-align: center;">${item.ket || ''}</td>
      <td style="text-align: right; padding-right: 6px;">Rp ${formatCurrency(item.nominal)}</td>
    </tr>
  `).join('');

  const html = `<!doctype html>
<html>
<head>
  <meta charset='utf-8'>
  <title>INTERNAL MEMO - Permohonan Dana</title>
  <style>
    @page { 
      size: Letter; 
      margin: 12mm; 
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
      font-family: Arial, sans-serif; 
      font-size: 12px; 
      color: #000; 
      padding: 8mm 10mm 14mm 10mm; 
    }
    
    .memo-header {
      text-align: center;
      margin-bottom: 20px;
    }
    
    .memo-title {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 8px;
      letter-spacing: 1px;
    }
    
    .memo-date {
      text-align: right;
      font-size: 12px;
      margin-top: -30px;
      margin-bottom: 20px;
    }
    
    .memo-subject {
      margin-bottom: 12px;
      font-size: 12px;
    }
    
    .memo-subject-label {
      font-weight: bold;
      display: inline-block;
    }
    
    .memo-greeting {
      margin-bottom: 12px;
      font-size: 12px;
    }
    
    .memo-instruction {
      margin-bottom: 16px;
      font-size: 12px;
    }
    
    .memo-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 11px;
    }
    
    .memo-table th,
    .memo-table td {
      border: 1px solid #000;
      padding: 6px 4px;
      text-align: center;
      vertical-align: middle;
    }
    
    .memo-table th {
      background-color: #f0f0f0;
      font-weight: bold;
      font-size: 11px;
    }
    
    .memo-table td {
      font-size: 11px;
    }
    
    .memo-table th:nth-child(1),
    .memo-table td:nth-child(1) {
      width: 5%;
    }
    
    .memo-table th:nth-child(2),
    .memo-table td:nth-child(2) {
      width: 12%;
      text-align: left;
    }
    
    .memo-table th:nth-child(3),
    .memo-table td:nth-child(3) {
      width: 12%;
      text-align: left;
    }
    
    .memo-table th:nth-child(4),
    .memo-table td:nth-child(4) {
      width: 10%;
    }
    
    .memo-table th:nth-child(5),
    .memo-table td:nth-child(5) {
      width: 25%;
      text-align: left;
    }
    
    .memo-table th:nth-child(6),
    .memo-table td:nth-child(6) {
      width: 10%;
    }
    
    .memo-table th:nth-child(7),
    .memo-table td:nth-child(7) {
      width: 16%;
      text-align: right;
    }
    
    .total-row {
      font-weight: bold;
      background-color: #f9f9f9;
    }
    
    .total-label {
      text-align: left;
      padding-left: 6px;
      font-weight: bold;
    }
    
    .total-amount {
      text-align: right;
      padding-right: 6px;
      font-weight: bold;
    }
    
    .bank-section {
      margin-top: 20px;
      font-size: 12px;
      line-height: 1.6;
    }
    
    .bank-details {
      margin-top: 12px;
      font-size: 12px;
    }
    
    .bank-detail-row {
      margin: 4px 0;
    }
    
    .bank-label {
      font-weight: bold;
      display: inline-block;
      min-width: 120px;
    }
    
    @media print {
      @page { 
        size: Letter; 
        margin: 12mm; 
      }
      body { 
        padding: 8mm 10mm 14mm 10mm; 
      }
    }
  </style>
</head>
<body>
  <div class="memo-header">
    <div class="memo-title">INTERNAL MEMO</div>
    <div class="memo-date">${location}, ${formattedDate}</div>
  </div>
  
  <div class="memo-subject">
    <span class="memo-subject-label">Perihal</span>: Permohonan Dana
  </div>
  
  <div class="memo-greeting">
    Dear Sir,
  </div>
  
  <div class="memo-instruction">
    Please transfer funds according to Operational Budget (OPEX/ Petty Cash & Cost) :
  </div>
  
  <table class="memo-table">
    <thead>
      <tr>
        <th>No.</th>
        <th>Customer</th>
        <th>Tujuan</th>
        <th>Unit</th>
        <th>Uraian</th>
        <th>Ket</th>
        <th>Nominal</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
      <tr class="total-row">
        <td colspan="6" class="total-label">TOTAL PENGAJUAN DANA OPERASIONAL</td>
        <td class="total-amount">IDR ${formattedTotal}</td>
      </tr>
    </tbody>
  </table>
  
  <div class="bank-section">
    <div>
      Mohon untuk di approval & proses transfer budget pengeluaran dana diatas, sejumlah ke No. Rekening
    </div>
    
    <div class="bank-details">
      <div class="bank-detail-row">
        <span class="bank-label">No. Rekening:</span> ${bankAccountNo}
      </div>
      <div class="bank-detail-row">
        <span class="bank-label">BANK:</span> ${bankName}
      </div>
      <div class="bank-detail-row">
        <span class="bank-label">Recipient Name:</span> ${recipientName}
      </div>
    </div>
    
    <div style="margin-top: 16px; font-weight: bold;">
      IDR ${formattedTotal}
    </div>
  </div>
</body>
</html>`;

  return html;
}

