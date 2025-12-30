/**
 * Template Struktur PDF Work Order (SPK)
 * Diambil dari: desktop/src/workorders.tsx - fungsi generate SPK HTML
 */

interface Company {
  companyName?: string;
  address?: string;
}

interface Product {
  id?: string;
  sku?: string;
  name?: string;
  bom?: {
    materials?: Array<{
      panjang?: string | number;
      lebar?: string | number;
      tinggi?: string | number;
      unit?: string;
    }>;
  } | Array<{
    panjang?: string | number;
    lebar?: string | number;
    tinggi?: string | number;
    unit?: string;
  }>;
}

interface Material {
  id?: string;
  sku?: string;
  name?: string;
  materialId?: string;
  materialCode?: string;
  materialName?: string;
  panjang?: string | number;
  lebar?: string | number;
  tinggi?: string | number;
  unit?: string;
  qtyPerUnit?: string | number;
  qty?: string | number;
}

interface SOLine {
  itemSku?: string;
  qty?: string | number;
}

interface WO {
  id: string;
  soId?: string;
  soNo?: string;
  customer?: string;
  product?: string;
  qty?: string | number;
  status?: string;
  createdAt?: string;
  materials?: Material[];
  docs?: {
    scheduleDate?: string;
  };
}

interface SO {
  soNo?: string;
  customer?: string;
  specNote?: string;
  lines?: SOLine[];
}

interface ProductLine {
  no: number;
  kodeProduk: string;
  namaProduk: string;
  tipeBox: string;
  panjang: string;
  lebar: string;
  tinggi: string;
  satuan: string;
  qtyReq: string;
  finishing: string;
  ket: string;
}

interface MaterialLine {
  no: number;
  kodeMaterial: string;
  namaMaterial: string;
  panjang: string;
  lebar: string;
  tinggi: string;
  satuan: string;
  qtyUsage: string;
  totalUsage: string;
  qtyOut: string;
}

interface GenerateWOHtmlParams {
  logo: string;                    // Base64 logo atau URL
  company?: Company;                // { companyName, address } - optional
  wo: WO;                           // Work Order data
  so?: SO | null;                   // Sales Order data - optional
  products?: Product[];             // Array of products untuk lookup
  materials?: Material[];           // Master materials untuk lookup
  rawMaterials?: Material[];        // Raw materials untuk lookup
}

export function generateWOHtml({
  logo,
  company,
  wo,
  so = null,
  products = [],
  materials = [],
  rawMaterials = []
}: GenerateWOHtmlParams): string {
  // Logo harus sudah base64 string (dari component yang memanggil template ini)
  // Fallback ke placeholder base64 jika tidak ada
  const logoSrc = logo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwN2JmZiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkxPR088L3RleHQ+PC9zdmc+';
  
  // Fix SPK number format - support both old format (SPK-xxx) and new format (SPK/xxx)
  const normalizeSPK = (spk: string) => {
    if (spk.startsWith('SPK-') || spk.startsWith('SPK/')) {
      return spk;
    }
    // Default to new format (slash)
    return `SPK/${spk}`;
  };
  const spkNo = normalizeSPK(wo.id);
  
  // Format tanggal: DD/MM/YYYY
  const formatDate = (date: Date | null): string => {
    if (!date) return '';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const woDate = formatDate(wo.createdAt ? new Date(wo.createdAt) : new Date());
  const scheduleDate = wo.docs?.scheduleDate ? new Date(wo.docs.scheduleDate) : null;
  const startDate = scheduleDate ? formatDate(scheduleDate) : woDate;
  const endDate = scheduleDate ? formatDate(new Date(scheduleDate.getTime() + 24*60*60*1000)) : ''; // +1 hari

  // Cari product info untuk setiap line
  const soLines = so?.lines || [];
  const productLines: ProductLine[] = soLines.map((line, idx) => {
    const itemSku = String(line.itemSku || '').trim();
    const foundProduct = products.find((p) => {
      const pId = String(p.id || '').trim();
      const pSku = String(p.sku || '').trim();
      if (pId && itemSku && pId === itemSku) return true;
      if (pSku && itemSku && pSku.toUpperCase() === itemSku.toUpperCase()) return true;
      return false;
    });
    
    const productName = foundProduct ? (foundProduct.name || '-') : '-';
    const productSku = foundProduct ? (foundProduct.sku || itemSku) : itemSku;
    const bom = foundProduct?.bom || {};
    const bomObj = bom && typeof bom === 'object' && !Array.isArray(bom) ? bom : null;
    const bomMaterials = bomObj?.materials || (Array.isArray(bom) ? bom : []);
    const firstMaterial = bomMaterials[0] || {};
    
    return {
      no: idx + 1,
      kodeProduk: productSku,
      namaProduk: productName,
      tipeBox: productSku,
      panjang: String(firstMaterial.panjang || '0.00'),
      lebar: String(firstMaterial.lebar || '0.00'),
      tinggi: String(firstMaterial.tinggi || '0.00'),
      satuan: firstMaterial.unit || 'PCS',
      qtyReq: String(line.qty || '0'),
      finishing: '',
      ket: ''
    };
  });

  // Format material requirement - cari material ID dari master materials
  const woMaterials = Array.isArray(wo.materials) ? wo.materials : [];
  const materialLines: MaterialLine[] = woMaterials.map((m, idx) => {
    const materialName = m.materialName || m.name || '';
    // Cari material ID dari master materials/products
    let materialId = m.materialId || m.materialCode || m.id || '';
    
    // Jika tidak ada materialId, cari dari master materials
    if (!materialId && materialName) {
      // Cari dari materials (kategori material)
      const foundMaterial = materials.find((mat) => {
        const matName = mat.name || '';
        return matName === materialName || matName.toLowerCase() === materialName.toLowerCase();
      });
      if (foundMaterial) {
        materialId = foundMaterial.id || foundMaterial.sku || '';
      }
      
      // Jika masih tidak ketemu, cari dari rawMaterials
      if (!materialId) {
        const foundRawMaterial = rawMaterials.find((rm) => {
          const rmName = rm.materialName || rm.name || '';
          return rmName === materialName || rmName.toLowerCase() === materialName.toLowerCase();
        });
        if (foundRawMaterial) {
          materialId = foundRawMaterial.materialId || foundRawMaterial.materialCode || foundRawMaterial.id || '';
        }
      }
    }
    
    return {
      no: idx + 1,
      kodeMaterial: materialId || '-',
      namaMaterial: materialName || '-',
      panjang: String(m.panjang || '0.00'),
      lebar: String(m.lebar || '0.00'),
      tinggi: String(m.tinggi || '0.00'),
      satuan: m.unit || 'PCS',
      qtyUsage: String(Math.round(Number(m.qtyPerUnit || 1))),
      totalUsage: String(Math.round(Number(m.qty || 0))),
      qtyOut: ''
    };
  });

  const companyName = company?.companyName || 'PT TRIMA LAKSANA JAYA PRATAMA';
  const companyAddress = company?.address || 'Jl. Raya Cikarang Cibarusah Kp. Kukun RT 11/06 Desa Ciantra Kecamatan Cikarang Selatan Kabupaten Bekasi';

  // Split company address untuk display
  const addressLines = (companyAddress || '').split(',').map(line => line.trim()).filter(line => line);
  const addressLine1 = addressLines[0] || '';
  const addressLine2 = addressLines.slice(1).join(', ') || '';

  const html = `<!doctype html>
<html>
<head>
  <meta charset='utf-8'>
  <title>SPK - ${spkNo}</title>
  <style>
    @page { 
      size: Letter; 
      margin: 12mm; 
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
      font-size: 12px; 
      color: #000; 
      padding: 8mm 10mm 14mm 10mm; 
    }
    @media print {
      @page { 
        size: Letter; 
        margin: 12mm; 
      }
      body { 
        padding: 8mm 10mm 14mm 10mm; 
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
      margin-bottom: 4px;
    }

    .header-left {
      width: 20%;
      flex-shrink: 0;
      position: relative;
      z-index: 1;
    }

    .header-logo {
      height: 90px;
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
      line-height: 1.3;
      font-size: 12px;
      padding: 0 20px;
      padding-bottom: 6px;
      margin-bottom: 4px;
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
      font-size: 22px;
      margin-bottom: 2px;
    }

    .header-center-text .company-address {
      font-size: 11px;
      text-align: center;
      line-height: 1.4;
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

    /* SPK title di bawah garis header - sejajar dengan header center */
    .spk-title-wrapper {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-top: 4px;
      margin-bottom: 12px;
    }

    .spk-title-wrapper .spk-spacer-left {
      width: 20%;
      flex-shrink: 0;
    }

    .spk-title-section {
      flex: 1;
      text-align: center;
      padding: 0 20px;
    }

    .spk-title-wrapper .spk-spacer-right {
      width: 20%;
      flex-shrink: 0;
    }

    .spk-title-section .spk-title {
      font-weight: 700;
      font-size: 20px;
      letter-spacing: 1px;
      margin-bottom: 4px;
      text-transform: uppercase;
    }

    .spk-title-section .spk-number {
      font-weight: 600;
      font-size: 12px;
    }
    .wo-details { width: 100%; border-collapse: collapse; margin: 15px 0; }
    .wo-details th, .wo-details td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 11px; }
    .wo-details th { background-color: #f0f0f0; font-weight: bold; }
    .section-title { font-weight: bold; margin-top: 20px; margin-bottom: 10px; font-size: 12px; }
    .data-table { width: 100%; border-collapse: collapse; margin: 10px 0; table-layout: fixed; }
    .data-table th, .data-table td { border: 1px solid #000; padding: 6px; text-align: left; font-size: 10px; }
    .data-table th { background-color: #f0f0f0; font-weight: bold; text-align: center; }
    .data-table td { text-align: center; min-height: 30px; }
    .data-table .text-left { text-align: left; }
    .data-table tbody tr:empty td,
    .data-table tbody tr td:empty { min-height: 50px; height: 50px; }
    .note-section { 
      margin-top: 0; 
    }
    .note-label { 
      font-weight: 700; 
      margin-bottom: 4px;
      font-size: 11px;
    }
    .note-text { 
      font-size: 11px;
      line-height: 1.4;
      margin-bottom: 8px;
      padding-bottom: 1.4em;
      min-height: 2.8em;
    }
    .process-table { 
      width: 100%; 
      border-collapse: collapse; 
      margin: 20px 0; 
      table-layout: fixed; 
    }
    .process-table th, .process-table td { 
      border: 1px solid #000; 
      padding: 4px; 
      text-align: center; 
      font-size: 10px; 
      height: 30px; 
    }
    .process-table th { 
      background-color: #f0f0f0; 
      font-weight: bold; 
      height: 30px;
    }
    .process-table th:nth-child(1) {
      width: 70%;
    }
    .process-table th:nth-child(2) {
      width: 30%;
    }
    .process-table tbody tr:nth-child(1) td {
      height: 50px;
    }
    .process-table tbody tr:nth-child(2) td {
      height: 30px;
    }
 
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="${logoSrc}" class="header-logo" alt="Logo" onerror="this.style.display='none'; this.onerror=null;" />
    </div>
    <div class="header-center-text">
      <div class="company-name">${companyName}</div>
      <div class="company-address">
        ${addressLine1 ? `<span class="company-address-line">${addressLine1}</span>` : ''}
        ${addressLine2 ? `<span class="company-address-line">${addressLine2}</span>` : ''}
      </div>
    </div>
    <div class="header-right"></div>
  </div>

  <div class="spk-title-wrapper">
    <div class="spk-spacer-left"></div>
    <div class="spk-title-section">
      <div class="spk-title">SURAT PERINTAH KERJA (SPK)</div>
      <div class="spk-number">No. ${spkNo}</div>
    </div>
    <div class="spk-spacer-right"></div>
  </div>
  
  <table class="wo-details">
    <tr>
      <th style="width: 12%;">Tanggal</th>
      <td style="width: 20%;">${woDate}</td>
      <th style="width: 12%;">No PO</th>
      <td style="width: 20%;">${so?.soNo || wo.soNo || '-'}</td>
      <th style="width: 12%;">Customer</th>
      <td style="width: 24%;">${so?.customer || wo.customer || '-'}</td>
    </tr>
    <tr>
      <th>Start Production</th>
      <td>${startDate}</td>
      <th>End Production</th>
      <td>${endDate}</td>
      <th>Status</th>
      <td>${wo.status || '-'}</td>
    </tr>
  </table>
  
  <div class="section-title">Product List:</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 4%;">No</th>
        <th style="width: 12%;">Kode Produk</th>
        <th style="width: 18%;">Nama Produk</th>
        <th style="width: 10%;">Tipe Box</th>
        <th style="width: 8%;">Panjang</th>
        <th style="width: 8%;">Lebar</th>
        <th style="width: 8%;">Tinggi</th>
        <th style="width: 8%;">Satuan</th>
        <th style="width: 8%;">Qty Req</th>
        <th style="width: 8%;">Finishing</th>
        <th style="width: 8%;">Ket.</th>
      </tr>
    </thead>
    <tbody>
      ${productLines.length > 0 ? productLines.map((p) => `
        <tr>
          <td>${p.no}</td>
          <td class="text-left">${p.kodeProduk}</td>
          <td class="text-left">${p.namaProduk}</td>
          <td class="text-left">${p.tipeBox}</td>
          <td>${p.panjang}</td>
          <td>${p.lebar}</td>
          <td>${p.tinggi}</td>
          <td>${p.satuan}</td>
          <td>${p.qtyReq}</td>
          <td>${p.finishing}</td>
          <td>${p.ket}</td>
        </tr>
      `).join('') : '<tr><td colspan="11" style="text-align:center;">No products</td></tr>'}
      ${productLines.length > 0 && productLines.length < 3 ? Array(3 - productLines.length).fill(0).map(() => `
        <tr>
          <td style="width: 4%; height: 50px;"></td><td style="width: 12%; height: 50px;"></td><td style="width: 18%; height: 50px;"></td><td style="width: 10%; height: 50px;"></td><td style="width: 8%; height: 50px;"></td><td style="width: 8%; height: 50px;"></td><td style="width: 8%; height: 50px;"></td><td style="width: 8%; height: 50px;"></td><td style="width: 8%; height: 50px;"></td><td style="width: 8%; height: 50px;"></td><td style="width: 8%; height: 50px;"></td>
        </tr>
      `).join('') : ''}
    </tbody>
  </table>
  
  <div class="section-title">Material Requirement:</div>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 4%;">No</th>
        <th style="width: 12%;">Kode Material</th>
        <th style="width: 20%;">Nama Material</th>
        <th style="width: 8%;">Panjang</th>
        <th style="width: 8%;">Lebar</th>
        <th style="width: 8%;">Tinggi</th>
        <th style="width: 8%;">Satuan</th>
        <th style="width: 10%;">Qty Usage</th>
        <th style="width: 10%;">Total Usage</th>
        <th style="width: 12%;">Qty Out</th>
      </tr>
    </thead>
    <tbody>
      ${materialLines.length > 0 ? materialLines.map((m) => `
        <tr>
          <td>${m.no}</td>
          <td class="text-left">${m.kodeMaterial}</td>
          <td class="text-left">${m.namaMaterial}</td>
          <td>${m.panjang}</td>
          <td>${m.lebar}</td>
          <td>${m.tinggi}</td>
          <td>${m.satuan}</td>
          <td>${m.qtyUsage}</td>
          <td>${m.totalUsage}</td>
          <td>${m.qtyOut}</td>
        </tr>
      `).join('') : '<tr><td colspan="10" style="text-align:center;">No materials</td></tr>'}
      ${materialLines.length > 0 && materialLines.length < 3 ? Array(3 - materialLines.length).fill(0).map(() => `
        <tr>
          <td style="width: 4%; height: 50px;"></td><td style="width: 12%; height: 50px;"></td><td style="width: 20%; height: 50px;"></td><td style="width: 8%; height: 50px;"></td><td style="width: 8%; height: 50px;"></td><td style="width: 8%; height: 50px;"></td><td style="width: 8%; height: 50px;"></td><td style="width: 10%; height: 50px;"></td><td style="width: 10%; height: 50px;"></td><td style="width: 12%; height: 50px;"></td>
        </tr>
      `).join('') : ''}
    </tbody>
  </table>
  
  <div class="note-section">
    <div class="note-label">NOTE:</div>
    <div class="note-text">${so?.specNote || ''}</div>
  </div>
  
  <table class="process-table">
    <thead>
      <tr>
        <th style="width: 12.5%;">Cutting/Slitter</th>
        <th style="width: 12.5%;">Die Cut</th>
        <th style="width: 12.5%;">Centraly Rotary</th>
        <th style="width: 12.5%;">Long Way</th>
        <th style="width: 12.5%;">Sablon</th>
        <th style="width: 12.5%;">Stitching</th>
        <th style="width: 12.5%;">Approved</th>
        <th style="width: 12.5%;">Checked</th>
      </tr>
    </thead>
    <tbody>
      ${Array(2).fill(0).map(() => `
        <tr>
          <td></td><td></td><td></td><td></td><td></td><td></td><td></td><td></td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</body>
</html>`;

  return html;
}

