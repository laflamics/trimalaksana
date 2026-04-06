import { ensureLogoIsBase64 } from '../utils/hardcoded-logo';

export const PACKAGING_RECAP_TEMPLATES = [
  { id: 1, name: 'Standard Recap', description: 'Template standar dengan nomor SJ lama di description tiap product' },
  { id: 2, name: 'Recap dengan PO', description: 'Menampilkan nomor PO di kolom description tiap product' },
  { id: 3, name: 'Recap dengan SJ List', description: 'Menampilkan REKAP nomor surat jalan di bagian keterangan' },
  { id: 4, name: 'Recap Lengkap', description: 'Kombinasi: PO di description + REKAP SJ di keterangan' },
  { id: 5, name: 'A4 - Standard Recap', description: 'Template A4 dengan margin 5mm - nomor SJ lama di description' },
  { id: 6, name: 'A4 - Recap dengan PO', description: 'Template A4 dengan margin 5mm - PO di description' },
  { id: 7, name: 'A4 - Recap dengan SJ List', description: 'Template A4 dengan margin 5mm - REKAP SJ di keterangan' },
  { id: 8, name: 'A4 - Recap Lengkap', description: 'Template A4 dengan margin 5mm - PO + REKAP SJ' },
];

// Helper function untuk get product code berdasarkan displayMode
function getProductCodeByMode(product: any, defaultCode: string, displayMode?: 'padCode' | 'productId'): string {
  if (displayMode === 'productId') {
    // User chose product_id/kode/sku (not pad code)
    // IMPORTANT: Return product_id or kode, NOT padCode
    const code = product?.product_id || product?.kode || product?.sku || product?.id || defaultCode;
    console.log('[getProductCodeByMode] displayMode=productId, returning:', code, 'from product:', product);
    return code;
  } else {
    // Default: display padCode
    const code = product?.padCode || product?.kode || product?.kodeIpos || product?.sku || product?.id || defaultCode;
    console.log('[getProductCodeByMode] displayMode=padCode, returning:', code, 'from product:', product);
    return code;
  }
}

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
  product_id?: string;
  nama?: string;
  padCode?: string;
  kodeIpos?: string;
  bom?: any;
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
  sjDate?: string;
  specNote?: string;
  items?: DeliveryItem[];
  productCodeDisplay?: 'padCode' | 'productId';
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

const getItemsHtml = (items: DeliveryItem[], products: Product[], displayMode?: 'padCode' | 'productId', descriptionType?: 'po' | 'sj' | 'none', sjList?: string[]): string => {
  console.log('[getItemsHtml] Called with displayMode:', displayMode, 'items count:', items?.length);
  
  return (items || []).map((itm, idx) => {
    let productCode = (itm.productCode || '').trim();
    console.log(`[getItemsHtml] Item ${idx}: productCode="${productCode}", product="${itm.product}"`);
    
    // If productCode is empty or looks like a name, find from master
    if (!productCode || (productCode.includes(' ') && productCode.length > 20)) {
      console.log(`[getItemsHtml] Item ${idx}: productCode is empty or looks like name, searching master...`);
      const masterProduct = products.find((p: any) => {
        const pName = (p.nama || '').toLowerCase().trim();
        const itemName = (itm.product || '').toLowerCase().trim();
        return pName === itemName;
      });
      if (masterProduct) {
        productCode = getProductCodeByMode(masterProduct, '', displayMode);
        console.log(`[getItemsHtml] Item ${idx}: Found master product, productCode now="${productCode}"`);
      }
    }
    
    let description = '';
    // Priority: manual description > auto description (po/sj)
    if ((itm as any).description && (itm as any).description.trim()) {
      description = htmlEscape((itm as any).description);
    } else if (descriptionType === 'po') {
      description = `PO: ${htmlEscape(itm.soNo || '-')}`;
    } else if (descriptionType === 'sj') {
      const sjNumber = sjList && sjList.length > idx ? sjList[idx] : (sjList && sjList.length > 0 ? sjList[0] : '-');
      description = `SJ: ${htmlEscape(sjNumber)}`;
    }
    
    return `
      <tr>
        <td style="text-align:center; padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${idx + 1}</td>
        <td style="padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${htmlEscape(productCode || '-')}</td>
        <td style="padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${htmlEscape(itm.product || '')}</td>
        <td style="text-align:center; padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${itm.qty || ''}</td>
        <td style="text-align:center; padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${itm.unit || 'PCS'}</td>
        <td style="padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${description}</td>
      </tr>
    `;
  }).join('');
};

const getHtmlTemplate = (logo: string, company: Company | undefined, item: DeliveryNote, sjData: SJData | undefined, itemsHtml: string, keterangan: string, poNos?: string[]): string => {
  const logoSrc = ensureLogoIsBase64(logo);
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
  }

  const customerAddress = item.customerAddress || '';
  let customerAddressLine1 = '';
  let customerAddressLine2 = '';
  if (customerAddress) {
    const idx = customerAddress.toLowerCase().indexOf('kabupaten');
    if (idx !== -1) {
      customerAddressLine1 = customerAddress.substring(0, idx).trim();
      customerAddressLine2 = customerAddress.substring(idx).trim();
    } else {
      customerAddressLine1 = customerAddress;
    }
  }

  // Format PO list for display (horizontal, comma-separated)
  const poListHtml = poNos && poNos.length > 0 ? poNos.map(po => htmlEscape(po)).join(', ') : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SURAT JALAN RECAP - ${htmlEscape(sj.sjNo || '')}</title>
  <style>
    @page { size: 9.5in 11in; margin: -5mm 2px 10mm 5mm; }
    img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; background: #fff; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: bold; color: #000; padding: 1px 2px 10mm 2px; transform: scale(0.95); transform-origin: top left; width: 105.26%; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 2px; }
    .header-left { width: 20%; flex-shrink: 0; }
    .header-logo { height: 80px; width: auto; max-width: 100%; object-fit: contain; display: block; }
    .header-logo[src=""], .header-logo:not([src]) { display: none; }
    .header-center-text { flex: 1; text-align: center; line-height: 1.2; font-size: 15px; font-weight: bold; padding: 0 15px; padding-bottom: 4px; margin-bottom: 2px; position: relative; }
    .header-center-text::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; border-bottom: 2px solid #000; }
    .header-center-text .company-name { font-weight: 700; text-align: center; font-size: 15px; margin-bottom: 1px; }
    .header-center-text .company-address { font-size: 11px; font-weight: bold; text-align: center; line-height: 1.3; }
    .header-right { width: 20%; flex-shrink: 0; }
    .sj-title-wrapper { display: flex; align-items: flex-start; justify-content: space-between; margin-top: 2px; margin-bottom: 8px; }
    .sj-title-section { flex: 1; text-align: center; padding: 0 15px; }
    .sj-title-section .title { font-weight: 700; font-size: 15px; margin-bottom: 2px; }
    .sj-title-section .sj-number { font-weight: 600; font-size: 15px; }
    .info { display: flex; justify-content: space-between; margin-top: 6px; font-size: 16px; font-weight: bold; line-height: 1.8; }
    .info .left { width: 60%; }
    .info .right { width: 35%; margin-left: auto; padding-left: 2%; }
    .info .info-row { margin-bottom: 6px; line-height: 1.6; }
    .info .label { display: inline-block; font-weight: 700; width: 180px; vertical-align: top; padding-right: 8px; position: relative; }
    .info .value { display: inline-block; word-wrap: break-word; word-break: break-word; vertical-align: top; margin-left: -8mm; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 19px; font-weight: bold; }
    table.items thead th { border: 1px solid #000; padding: 5px 4px; background: #f6f6f6; font-weight: 700; text-align: left; }
    table.items thead th:nth-child(1), table.items thead th:nth-child(4), table.items thead th:nth-child(5) { text-align: center; }
    table.items td { border: 1px solid #000; padding: 5px 4px; vertical-align: top; }
    .footer { margin-top: 12px; }
    .keterangan .title { font-weight: 700; margin-bottom: 2px; font-size: 19px; }
    .keterangan .note-text { font-size: 19px; font-weight: bold; line-height: 1.3; margin-bottom: 4px; word-wrap: break-word; word-break: break-word; }
    .footer-date { margin-top: 6px; font-size: 19px; font-weight: bold; }
    .footer-hormat { margin-top: 4px; font-size: 19px; font-weight: bold; margin-bottom: 10px; }
    .signature-section { display: flex; justify-content: flex-start; align-items: flex-start; width: 100%; margin-top: 45px; gap: 10px; }
    .sig { text-align: left; font-size: 19px; font-weight: bold; min-width: 80px; }
    .sig-right { text-align: right; font-size: 19px; font-weight: bold; min-width: 80px; margin-left: auto; }
    .sig .line, .sig-right .line { border-top: 1px solid #000; margin-top: 60px; display: block; width: 100%; }
    .sig .label, .sig-right .label { margin-top: 4px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="${logoSrc}" class="header-logo" alt="Logo" />
    </div>
    <div class="header-center-text">
      <div class="company-name">${htmlEscape(companyName)}</div>
      <div class="company-address">
        ${addressLine1 ? `<div>${htmlEscape(addressLine1)}</div>` : ''}
        ${addressLine2 ? `<div>${htmlEscape(addressLine2)}</div>` : ''}
      </div>
    </div>
    <div class="header-right"></div>
  </div>

  <div class="sj-title-wrapper">
    <div style="width: 20%;"></div>
    <div class="sj-title-section">
      <div class="title">SURAT JALAN RECAP</div>
      <div class="sj-number">No. ${htmlEscape(sj.sjNo || '')}</div>
    </div>
    <div style="width: 20%;"></div>
  </div>

  <div class="info">
    <div class="left">
      <div class="info-row">
        <span class="label">Delivery Date :</span>
        <span class="value">${formatDate(sj.sjDate || item.sjDate || '')}</span>
      </div>
      <div class="info-row">
        <span class="label">Customer :</span>
        <span class="value">${htmlEscape(item.customer || '-')}</span>
      </div>
      <div class="info-row">
        <span class="label">Alamat :</span>
        <span class="value">
          ${customerAddressLine1 ? `<div>${htmlEscape(customerAddressLine1)}</div>` : ''}
          ${customerAddressLine2 ? `<div>${htmlEscape(customerAddressLine2)}</div>` : ''}
        </span>
      </div>
    </div>
    <div class="right">
      <div class="info-row">
        <span class="label">No. Kendaraan :</span>
        <span class="value">${htmlEscape(sj.vehicleNo || '')}</span>
      </div>
      ${poListHtml ? `<div class="info-row">
        <span class="label">No.PO :</span>
        <span class="value">${poListHtml}</span>
      </div>` : ''}
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
      ${itemsHtml}
    </tbody>
  </table>

  <div class="footer">
    <div class="keterangan">
      <div class="title">Keterangan :</div>
      <div class="note-text">${htmlEscape(keterangan)}</div>
    </div>
    <div class="footer-date">Bekasi, ${formatDate(sj.sjDate || item.sjDate || '')}</div>
    <div class="footer-hormat">Hormat Kami</div>

    <div class="signature-section">
      <div class="sig">
        <span class="line"></span>
        <div class="label">PIC</div>
      </div>
      <div class="sig">
        <span class="line"></span>
        <div class="label">Driver</div>
      </div>
      <div class="sig-right">
        <span class="line"></span>
        <div class="label">Penerima</div>
      </div>
    </div>
  </div>
</body>
</html>`;
};

// A4 Template with 5mm margin
function getHtmlTemplateA4(logoSrc: string, company: Company | undefined, item: any, sj: any, itemsHtml: string, keterangan: string, poNos?: string[]): string {
  const companyName = company?.companyName || 'PT TRIMA LAKSANA JAYA PRATAMA';
  const companyAddress = company?.address || 'Jl. Raya Cikarang Cibarusah Kp. Kukun RT 11/06 Desa Ciantra Kecamatan Cikarang Selatan\nKabupaten Bekasi';

  let addressLine1 = '';
  let addressLine2 = '';
  if (companyAddress) {
    const idx = companyAddress.toLowerCase().indexOf('kabupaten');
    if (idx !== -1) {
      addressLine1 = companyAddress.substring(0, idx).trim();
      addressLine2 = companyAddress.substring(idx).trim();
    } else {
      addressLine1 = companyAddress;
    }
  }

  const customerAddress = item.customerAddress || '';
  let customerAddressLine1 = '';
  let customerAddressLine2 = '';
  if (customerAddress) {
    const idx = customerAddress.toLowerCase().indexOf('kabupaten');
    if (idx !== -1) {
      customerAddressLine1 = customerAddress.substring(0, idx).trim();
      customerAddressLine2 = customerAddress.substring(idx).trim();
    } else {
      customerAddressLine1 = customerAddress;
    }
  }

  const poListHtml = poNos && poNos.length > 0 ? poNos.map(po => htmlEscape(po)).join(', ') : '';

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SURAT JALAN RECAP - ${htmlEscape(sj.sjNo || '')}</title>
  <style>
    @page { size: A4; margin: 5mm 5mm 5mm 5mm; }
    img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; background: #fff; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: bold; color: #000; padding: 5mm; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 2px; }
    .header-left { width: 20%; flex-shrink: 0; }
    .header-logo { height: 80px; width: auto; max-width: 100%; object-fit: contain; display: block; }
    .header-logo[src=""], .header-logo:not([src]) { display: none; }
    .header-center-text { flex: 1; text-align: center; line-height: 1.2; font-size: 15px; font-weight: bold; padding: 0 15px; padding-bottom: 4px; margin-bottom: 2px; position: relative; }
    .header-center-text::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; border-bottom: 2px solid #000; }
    .header-center-text .company-name { font-weight: 700; text-align: center; font-size: 15px; margin-bottom: 1px; }
    .header-center-text .company-address { font-size: 11px; font-weight: bold; text-align: center; line-height: 1.3; }
    .header-right { width: 20%; flex-shrink: 0; }
    .sj-title-wrapper { display: flex; align-items: flex-start; justify-content: space-between; margin-top: 2px; margin-bottom: 8px; }
    .sj-title-section { flex: 1; text-align: center; padding: 0 15px; }
    .sj-title-section .title { font-weight: 700; font-size: 15px; margin-bottom: 2px; }
    .sj-title-section .sj-number { font-weight: 600; font-size: 15px; }
    .info { display: flex; justify-content: space-between; margin-top: 6px; font-size: 16px; font-weight: bold; line-height: 1.8; }
    .info .left { width: 60%; }
    .info .right { width: 35%; margin-left: auto; padding-left: 2%; }
    .info .info-row { margin-bottom: 6px; line-height: 1.6; }
    .info .label { display: inline-block; font-weight: 700; width: 180px; vertical-align: top; padding-right: 8px; position: relative; }
    .info .value { display: inline-block; word-wrap: break-word; word-break: break-word; vertical-align: top; margin-left: -8mm; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 19px; font-weight: bold; }
    table.items thead th { border: 1px solid #000; padding: 5px 4px; background: #f6f6f6; font-weight: 700; text-align: left; }
    table.items thead th:nth-child(1), table.items thead th:nth-child(4), table.items thead th:nth-child(5) { text-align: center; }
    table.items td { border: 1px solid #000; padding: 5px 4px; vertical-align: top; }
    .footer { margin-top: 12px; }
    .keterangan .title { font-weight: 700; margin-bottom: 2px; font-size: 19px; }
    .keterangan .note-text { font-size: 19px; font-weight: bold; line-height: 1.3; margin-bottom: 4px; word-wrap: break-word; word-break: break-word; }
    .footer-date { margin-top: 6px; font-size: 19px; font-weight: bold; }
    .footer-hormat { margin-top: 4px; font-size: 19px; font-weight: bold; margin-bottom: 10px; }
    .signature-section { display: flex; justify-content: flex-start; align-items: flex-start; width: 100%; margin-top: 45px; gap: 10px; }
    .sig { text-align: left; font-size: 19px; font-weight: bold; min-width: 80px; }
    .sig-right { text-align: right; font-size: 19px; font-weight: bold; min-width: 80px; margin-left: auto; }
    .sig .line, .sig-right .line { border-top: 1px solid #000; margin-top: 60px; display: block; width: 100%; }
    .sig .label, .sig-right .label { margin-top: 4px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="${logoSrc}" class="header-logo" alt="Logo" />
    </div>
    <div class="header-center-text">
      <div class="company-name">${htmlEscape(companyName)}</div>
      <div class="company-address">
        ${addressLine1 ? `<div>${htmlEscape(addressLine1)}</div>` : ''}
        ${addressLine2 ? `<div>${htmlEscape(addressLine2)}</div>` : ''}
      </div>
    </div>
    <div class="header-right"></div>
  </div>

  <div class="sj-title-wrapper">
    <div style="width: 20%;"></div>
    <div class="sj-title-section">
      <div class="title">SURAT JALAN RECAP</div>
      <div class="sj-number">No. ${htmlEscape(sj.sjNo || '')}</div>
    </div>
    <div style="width: 20%;"></div>
  </div>

  <div class="info">
    <div class="left">
      <div class="info-row">
        <span class="label">Delivery Date :</span>
        <span class="value">${formatDate(sj.sjDate || item.sjDate || '')}</span>
      </div>
      <div class="info-row">
        <span class="label">Customer :</span>
        <span class="value">${htmlEscape(item.customer || '-')}</span>
      </div>
      <div class="info-row">
        <span class="label">Alamat :</span>${customerAddressLine1 ? `<div>${htmlEscape(customerAddressLine1)}</div>` : ''}
          ${customerAddressLine2 ? `<div>${htmlEscape(customerAddressLine2)}</div>` : ''}
        </span>
      </div>
    </div>
    <div class="right">
      <div class="info-row">
        <span class="label">No. Kendaraan :</span>
        <span class="value">${htmlEscape(sj.vehicleNo || '')}</span>
      </div>
      ${poListHtml ? `<div class="info-row">
        <span class="label">No.PO :</span>
        <span class="value">${poListHtml}</span>
      </div>` : ''}
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
      ${itemsHtml}
    </tbody>
  </table>

  <div class="footer">
    <div class="keterangan">
      <div class="title">Keterangan :</div>
      <div class="note-text">${htmlEscape(keterangan)}</div>
    </div>
    <div class="footer-date">Bekasi, ${formatDate(sj.sjDate || item.sjDate || '')}</div>
    <div class="footer-hormat">Hormat Kami</div>

    <div class="signature-section">
      <div class="sig">
        <span class="line"></span>
        <div class="label">PIC</div>
      </div>
      <div class="sig">
        <span class="line"></span>
        <div class="label">Driver</div>
      </div>
      <div class="sig-right">
        <span class="line"></span>
        <div class="label">Penerima</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function generatePackagingRecapWithPOHtml(params: GenerateSuratJalanHtmlParams): string {
  const sjList = (params.item as any).sjList || [];
  const itemsHtml = getItemsHtml(params.item.items || [], params.products || [], params.item.productCodeDisplay, 'po', sjList);
  const keterangan = params.item.specNote || '';
  const poNos = (params.item as any).poNos || [];
  return getHtmlTemplate(params.logo || '', params.company, params.item, params.sjData, itemsHtml, keterangan, poNos);
}

export function generatePackagingRecapWithSJListHtml(params: GenerateSuratJalanHtmlParams): string {
  const itemsHtml = getItemsHtml(params.item.items || [], params.products || [], params.item.productCodeDisplay, 'none');
  const sjList = (params.item as any).sjList || [];
  const keterangan = sjList.length > 0 ? `REKAP: ${sjList.join(', ')}` : (params.item.specNote || '');
  return getHtmlTemplate(params.logo || '', params.company, params.item, params.sjData, itemsHtml, keterangan);
}

export function generatePackagingRecapStandardHtml(params: GenerateSuratJalanHtmlParams): string {
  const sjList = (params.item as any).sjList || [];
  const itemsHtml = getItemsHtml(params.item.items || [], params.products || [], params.item.productCodeDisplay, 'sj', sjList);
  const keterangan = params.item.specNote || '';
  return getHtmlTemplate(params.logo || '', params.company, params.item, params.sjData, itemsHtml, keterangan);
}

export function generatePackagingRecapCompleteHtml(params: GenerateSuratJalanHtmlParams): string {
  const sjList = (params.item as any).sjList || [];
  const itemsHtml = getItemsHtml(params.item.items || [], params.products || [], params.item.productCodeDisplay, 'sj', sjList);
  const poNos = (params.item as any).poNos || [];
  const keterangan = poNos.length > 0 ? `PO: ${poNos.join(', ')}` : (params.item.specNote || '');
  return getHtmlTemplate(params.logo || '', params.company, params.item, params.sjData, itemsHtml, keterangan);
}

export function generatePackagingRecapHtmlByTemplate(templateId: number, params: GenerateSuratJalanHtmlParams): string {
  switch (templateId) {
    case 1:
      return generatePackagingRecapStandardHtml(params);
    case 2:
      return generatePackagingRecapWithPOHtml(params);
    case 3:
      return generatePackagingRecapWithSJListHtml(params);
    case 4:
      return generatePackagingRecapCompleteHtml(params);
    case 5:
      return generatePackagingRecapStandardHtmlA4(params);
    case 6:
      return generatePackagingRecapWithPOHtmlA4(params);
    case 7:
      return generatePackagingRecapWithSJListHtmlA4(params);
    case 8:
      return generatePackagingRecapCompleteHtmlA4(params);
    default:
      return generatePackagingRecapStandardHtml(params);
  }
}

// A4 Template Functions
function generatePackagingRecapStandardHtmlA4(params: GenerateSuratJalanHtmlParams): string {
  const sjList = (params.item as any).sjList || [];
  const itemsHtml = getItemsHtml(params.item.items || [], params.products || [], params.item.productCodeDisplay, 'sj', sjList);
  const keterangan = params.item.specNote || '';
  return getHtmlTemplateA4(params.logo || '', params.company, params.item, params.sjData, itemsHtml, keterangan);
}

function generatePackagingRecapWithPOHtmlA4(params: GenerateSuratJalanHtmlParams): string {
  const sjList = (params.item as any).sjList || [];
  const itemsHtml = getItemsHtml(params.item.items || [], params.products || [], params.item.productCodeDisplay, 'sj', sjList);
  const keterangan = params.item.specNote || '';
  const poNos = (params.item as any).poNos || [];
  return getHtmlTemplateA4(params.logo || '', params.company, params.item, params.sjData, itemsHtml, keterangan, poNos);
}

function generatePackagingRecapWithSJListHtmlA4(params: GenerateSuratJalanHtmlParams): string {
  const itemsHtml = getItemsHtml(params.item.items || [], params.products || [], params.item.productCodeDisplay, 'none');
  const sjList = (params.item as any).sjList || [];
  const keterangan = sjList.length > 0 ? `REKAP: ${sjList.join(', ')}` : (params.item.specNote || '');
  return getHtmlTemplateA4(params.logo || '', params.company, params.item, params.sjData, itemsHtml, keterangan);
}

function generatePackagingRecapCompleteHtmlA4(params: GenerateSuratJalanHtmlParams): string {
  const sjList = (params.item as any).sjList || [];
  const itemsHtml = getItemsHtml(params.item.items || [], params.products || [], params.item.productCodeDisplay, 'sj', sjList);
  const poNos = (params.item as any).poNos || [];
  
  // Debug
  console.log('[Template 8] poNos:', JSON.stringify(poNos));
  console.log('[Template 8] poNos.length:', poNos.length);
  
  const keterangan = poNos.length > 0 ? `PO: ${poNos.join(', ')}` : (params.item.specNote || '');
  
  console.log('[Template 8] keterangan final:', keterangan);
  
  return getHtmlTemplateA4(params.logo || '', params.company, params.item, params.sjData, itemsHtml, keterangan, poNos);
}
