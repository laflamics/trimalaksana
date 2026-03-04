import { ensureLogoIsBase64 } from '../utils/hardcoded-logo';
// Packaging Delivery Recap Templates
// Template 1: Description dengan nomor PO di tiap product
// Template 2: Keterangan dengan REKAP nomor surat jalan

export const PACKAGING_RECAP_TEMPLATES = [
  {
    id: 1,
    name: 'Standard Recap',
    description: 'Template standar dengan nomor SJ lama di description tiap product',
  },
  {
    id: 2,
    name: 'Recap dengan PO',
    description: 'Menampilkan nomor PO di kolom description tiap product',
  },
  {
    id: 3,
    name: 'Recap dengan SJ List',
    description: 'Menampilkan REKAP nomor surat jalan di bagian keterangan',
  },
  {
    id: 4,
    name: 'Recap Lengkap',
    description: 'Kombinasi: PO di description + REKAP SJ di keterangan',
  },
];

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

// Template 1: Recap dengan PO Number di Description tiap product
export function generatePackagingRecapWithPOHtml({
  logo,
  company,
  item,
  sjData,
  products = []
}: GenerateSuratJalanHtmlParams): string {
  const logoSrc = ensureLogoIsBase64(logo);

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

  const findProductByItemSku = (itemSku: string) => {
    if (!itemSku) return null;
    const key = String(itemSku).trim().toUpperCase();
    return products.find(p => 
      (String(p.sku || '').toUpperCase() === key) || 
      (String(p.id || '').toUpperCase() === key) ||
      (String(p.kode || '').toUpperCase() === key)
    ) || null;
  };

  const getProductCode = (product: any, defaultCode: string): string => {
    return product?.padCode || product?.kode || product?.kodeIpos || product?.sku || product?.id || defaultCode;
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

  // Build items table dengan PO number di description
  const itemsHtml = (item.items || []).map((itm, idx) => {
    const productCode = itm.productCode || '';
    // Extract PO number dari soNo atau dari item
    const poNumber = itm.soNo || item.soNo || '-';
    
    return `
      <tr>
        <td style="text-align:center; padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${idx + 1}</td>
        <td style="padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${htmlEscape(productCode)}</td>
        <td style="padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${htmlEscape(itm.product || '')}</td>
        <td style="text-align:center; padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${itm.qty || ''}</td>
        <td style="text-align:center; padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${itm.unit || 'PCS'}</td>
        <td style="padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">PO: ${htmlEscape(poNumber)}</td>
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
    @page { size: 9.5in 11in; margin: -5mm 2px 10mm 5mm; }
    img { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; background: #fff; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 15px; font-weight: bold; color: #000; padding: 1px 2px 10mm 2px; transform: scale(0.95); transform-origin: top left; width: 105.26%; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 2px; }
    .header-left { width: 20%; flex-shrink: 0; position: relative; z-index: 1; }
    .header-logo { height: 80px; width: auto; max-width: 100%; object-fit: contain; position: relative; z-index: 0; opacity: 1; -webkit-print-color-adjust: exact; print-color-adjust: exact; display: block; }
    .header-logo[src=""], .header-logo:not([src]) { display: none; }
    .header-center-text { flex: 1; text-align: center; line-height: 1.2; font-size: 15px; font-weight: bold; padding: 0 15px; padding-bottom: 4px; margin-bottom: 2px; position: relative; }
    .header-center-text::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; border-bottom: 2px solid #000; }
    .header-center-text .company-name { font-weight: 700; text-align: center; font-size: 15px; margin-bottom: 1px; font-family: Arial, Helvetica, sans-serif; }
    .header-center-text .company-address { font-size: 11px; font-weight: bold; text-align: center; line-height: 1.3; font-family: Arial, Helvetica, sans-serif; }
    .header-center-text .company-address-line { display: block; }
    .header-right { width: 20%; flex-shrink: 0; text-align: auto; font-size: 15px; font-weight: bold; padding-top: 0; font-family: Arial, Helvetica, sans-serif; }
    .sj-title-wrapper { display: flex; align-items: flex-start; justify-content: space-between; margin-top: 2px; margin-bottom: 8px; }
    .sj-title-wrapper .sj-spacer-left { width: 20%; flex-shrink: 0; }
    .sj-title-section { flex: 1; text-align: center; padding: 0 15px; }
    .sj-title-wrapper .sj-spacer-right { width: 20%; flex-shrink: 0; }
    .sj-title-section .title { font-weight: 700; font-size: 15px; letter-spacing: 0.5px; margin-bottom: 2px; font-family: Arial, Helvetica, sans-serif; }
    .sj-title-section .sj-number { font-weight: 600; font-size: 15px; font-family: Arial, Helvetica, sans-serif; }
    .info { display: flex; justify-content: space-between; margin-top: 6px; font-size: 16px; font-weight: bold; line-height: 1.8; font-family: Arial, Helvetica, sans-serif; }
    .info .left { width: 60%; }
    .info .right { width: 35%; margin-left: auto; padding-left: 2%; }
    .info .info-row { margin-bottom: 6px; line-height: 1.6; }
    .info .label { display: inline-block; font-weight: 700; width: 180px; vertical-align: top; padding-right: 8px; position: relative; }
    .info .label-text { text-align: left; display: inline-block; }
    .info .label-colon { position: absolute; right: calc(4px + 8mm); }
    .info .value { display: inline-block; word-wrap: break-word; word-break: break-word; vertical-align: top; margin-left: -8mm; }
    .info .value-line { display: block; margin: 0; padding: 0; line-height: 1.6; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 19px; font-weight: bold; font-family: Arial, Helvetica, sans-serif; }
    table.items thead th { border: 1px solid #000; padding: 5px 4px; background: #f6f6f6; font-weight: 700; text-align: left; font-family: Arial, Helvetica, sans-serif; }
    table.items thead th:nth-child(1), table.items thead th:nth-child(4), table.items thead th:nth-child(5) { text-align: center; }
    table.items td { border: 1px solid #000; padding: 5px 4px; vertical-align: top; font-family: Arial, Helvetica, sans-serif; }
    .footer { margin-top: 12px; }
    .keterangan { margin-top: 0; }
    .keterangan .title { font-weight: 700; margin-bottom: 2px; font-size: 19px; font-family: Arial, Helvetica, sans-serif; }
    .keterangan .note-text { font-size: 19px; font-weight: bold; line-height: 1.3; margin-bottom: 4px; padding-bottom: 0.8em; font-family: Arial, Helvetica, sans-serif; }
    .footer-date { margin-top: 6px; font-size: 19px; font-weight: bold; font-family: Arial, Helvetica, sans-serif; }
    .footer-hormat { margin-top: 4px; font-size: 19px; font-weight: bold; margin-bottom: 10px; font-family: Arial, Helvetica, sans-serif; }
    .signature-section { display: flex; justify-content: flex-start; align-items: flex-start; width: 100%; margin-top: 45px; gap: 10px; }
    .sig { text-align: left; font-size: 19px; font-weight: bold; min-width: 80px; font-family: Arial, Helvetica, sans-serif; }
    .sig-right { text-align: right; font-size: 19px; font-weight: bold; min-width: 80px; margin-left: auto; font-family: Arial, Helvetica, sans-serif; }
    .sig .line, .sig-right .line { border-top: 1px solid #000; margin-top: 60px; display: block; width: 100%; }
    .sig .label, .sig-right .label { margin-top: 4px; font-weight: 600; font-family: Arial, Helvetica, sans-serif; }
    @media print { @page { size: 9.5in 11in; margin: -5mm 2px 10mm 5mm; } body { padding: 1px 2px 10mm 2px; font-family: Arial, Helvetica, sans-serif; } .header-logo { -webkit-print-color-adjust: exact; print-color-adjust: exact; max-width: 100%; height: auto; max-height: 100px; display: block; } .header-logo[src=""], .header-logo:not([src]) { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="${logoSrc}" class="header-logo" alt="Logo"  />
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
      <div class="title">SURAT JALAN RECAP</div>
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
        </span>
      </div>
    </div>
    <div class="right">
      <div class="info-row">
        <span class="label"><span class="label-text">No. Kendaraan</span><span class="label-colon"> :</span></span>
        <span class="value">${htmlEscape(sj.vehicleNo || '')}</span>
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


// Template 2: Recap dengan REKAP nomor surat jalan di Keterangan
export function generatePackagingRecapWithSJListHtml({
  logo,
  company,
  item,
  sjData,
  products = []
}: GenerateSuratJalanHtmlParams): string {
  const logoSrc = ensureLogoIsBase64(logo);

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

  // Build items table
  const itemsHtml = (item.items || []).map((itm, idx) => {
    const productCode = itm.productCode || '';
    
    return `
      <tr>
        <td style="text-align:center; padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${idx + 1}</td>
        <td style="padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${htmlEscape(productCode)}</td>
        <td style="padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${htmlEscape(itm.product || '')}</td>
        <td style="text-align:center; padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${itm.qty || ''}</td>
        <td style="text-align:center; padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${itm.unit || 'PCS'}</td>
        <td style="padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;"></td>
      </tr>
    `;
  }).join('');

  // Build REKAP note dengan list nomor SJ
  const sjList = (item as any).sjList || [];
  const recapNote = sjList.length > 0 
    ? `REKAP: ${sjList.join(', ')}`
    : item.specNote || '';

  const html = `
<!doctype html>
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
    .header-left { width: 20%; flex-shrink: 0; position: relative; z-index: 1; }
    .header-logo { height: 80px; width: auto; max-width: 100%; object-fit: contain; position: relative; z-index: 0; opacity: 1; -webkit-print-color-adjust: exact; print-color-adjust: exact; display: block; }
    .header-logo[src=""], .header-logo:not([src]) { display: none; }
    .header-center-text { flex: 1; text-align: center; line-height: 1.2; font-size: 15px; font-weight: bold; padding: 0 15px; padding-bottom: 4px; margin-bottom: 2px; position: relative; }
    .header-center-text::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; border-bottom: 2px solid #000; }
    .header-center-text .company-name { font-weight: 700; text-align: center; font-size: 15px; margin-bottom: 1px; font-family: Arial, Helvetica, sans-serif; }
    .header-center-text .company-address { font-size: 11px; font-weight: bold; text-align: center; line-height: 1.3; font-family: Arial, Helvetica, sans-serif; }
    .header-center-text .company-address-line { display: block; }
    .header-right { width: 20%; flex-shrink: 0; text-align: auto; font-size: 15px; font-weight: bold; padding-top: 0; font-family: Arial, Helvetica, sans-serif; }
    .sj-title-wrapper { display: flex; align-items: flex-start; justify-content: space-between; margin-top: 2px; margin-bottom: 8px; }
    .sj-title-wrapper .sj-spacer-left { width: 20%; flex-shrink: 0; }
    .sj-title-section { flex: 1; text-align: center; padding: 0 15px; }
    .sj-title-wrapper .sj-spacer-right { width: 20%; flex-shrink: 0; }
    .sj-title-section .title { font-weight: 700; font-size: 15px; letter-spacing: 0.5px; margin-bottom: 2px; font-family: Arial, Helvetica, sans-serif; }
    .sj-title-section .sj-number { font-weight: 600; font-size: 15px; font-family: Arial, Helvetica, sans-serif; }
    .info { display: flex; justify-content: space-between; margin-top: 6px; font-size: 16px; font-weight: bold; line-height: 1.8; font-family: Arial, Helvetica, sans-serif; }
    .info .left { width: 60%; }
    .info .right { width: 35%; margin-left: auto; padding-left: 2%; }
    .info .info-row { margin-bottom: 6px; line-height: 1.6; }
    .info .label { display: inline-block; font-weight: 700; width: 180px; vertical-align: top; padding-right: 8px; position: relative; }
    .info .label-text { text-align: left; display: inline-block; }
    .info .label-colon { position: absolute; right: calc(4px + 8mm); }
    .info .value { display: inline-block; word-wrap: break-word; word-break: break-word; vertical-align: top; margin-left: -8mm; }
    .info .value-line { display: block; margin: 0; padding: 0; line-height: 1.6; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 19px; font-weight: bold; font-family: Arial, Helvetica, sans-serif; }
    table.items thead th { border: 1px solid #000; padding: 5px 4px; background: #f6f6f6; font-weight: 700; text-align: left; font-family: Arial, Helvetica, sans-serif; }
    table.items thead th:nth-child(1), table.items thead th:nth-child(4), table.items thead th:nth-child(5) { text-align: center; }
    table.items td { border: 1px solid #000; padding: 5px 4px; vertical-align: top; font-family: Arial, Helvetica, sans-serif; }
    .footer { margin-top: 12px; }
    .keterangan { margin-top: 0; }
    .keterangan .title { font-weight: 700; margin-bottom: 2px; font-size: 19px; font-family: Arial, Helvetica, sans-serif; }
    .keterangan .note-text { font-size: 19px; font-weight: bold; line-height: 1.3; margin-bottom: 4px; padding-bottom: 0.8em; font-family: Arial, Helvetica, sans-serif; word-wrap: break-word; word-break: break-word; }
    .footer-date { margin-top: 6px; font-size: 19px; font-weight: bold; font-family: Arial, Helvetica, sans-serif; }
    .footer-hormat { margin-top: 4px; font-size: 19px; font-weight: bold; margin-bottom: 10px; font-family: Arial, Helvetica, sans-serif; }
    .signature-section { display: flex; justify-content: flex-start; align-items: flex-start; width: 100%; margin-top: 45px; gap: 10px; }
    .sig { text-align: left; font-size: 19px; font-weight: bold; min-width: 80px; font-family: Arial, Helvetica, sans-serif; }
    .sig-right { text-align: right; font-size: 19px; font-weight: bold; min-width: 80px; margin-left: auto; font-family: Arial, Helvetica, sans-serif; }
    .sig .line, .sig-right .line { border-top: 1px solid #000; margin-top: 60px; display: block; width: 100%; }
    .sig .label, .sig-right .label { margin-top: 4px; font-weight: 600; font-family: Arial, Helvetica, sans-serif; }
    @media print { @page { size: 9.5in 11in; margin: -5mm 2px 10mm 5mm; } body { padding: 1px 2px 10mm 2px; font-family: Arial, Helvetica, sans-serif; } .header-logo { -webkit-print-color-adjust: exact; print-color-adjust: exact; max-width: 100%; height: auto; max-height: 100px; display: block; } .header-logo[src=""], .header-logo:not([src]) { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="${logoSrc}" class="header-logo" alt="Logo"  />
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
      <div class="title">SURAT JALAN RECAP</div>
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
        </span>
      </div>
    </div>
    <div class="right">
      <div class="info-row">
        <span class="label"><span class="label-text">No. Kendaraan</span><span class="label-colon"> :</span></span>
        <span class="value">${htmlEscape(sj.vehicleNo || '')}</span>
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
          ${htmlEscape(recapNote)}
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


// Template 3: Recap Lengkap dengan PO di Description + REKAP SJ di Keterangan
export function generatePackagingRecapCompleteHtml({
  logo,
  company,
  item,
  sjData,
  products = []
}: GenerateSuratJalanHtmlParams): string {
  const logoSrc = ensureLogoIsBase64(logo);

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

  // Build items table dengan PO number di description
  const itemsHtml = (item.items || []).map((itm, idx) => {
    const productCode = itm.productCode || '';
    const poNumber = itm.soNo || item.soNo || '-';
    
    return `
      <tr>
        <td style="text-align:center; padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${idx + 1}</td>
        <td style="padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${htmlEscape(productCode)}</td>
        <td style="padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${htmlEscape(itm.product || '')}</td>
        <td style="text-align:center; padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${itm.qty || ''}</td>
        <td style="text-align:center; padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">${itm.unit || 'PCS'}</td>
        <td style="padding:4px 3px; font-size:15px; font-weight:bold; font-family: Arial, Helvetica, sans-serif;">PO: ${htmlEscape(poNumber)}</td>
      </tr>
    `;
  }).join('');

  // Build REKAP note dengan list nomor SJ
  const sjList = (item as any).sjList || [];
  const recapNote = sjList.length > 0 
    ? `REKAP: ${sjList.join(', ')}`
    : item.specNote || '';

  const html = `
<!doctype html>
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
    .header-left { width: 20%; flex-shrink: 0; position: relative; z-index: 1; }
    .header-logo { height: 80px; width: auto; max-width: 100%; object-fit: contain; position: relative; z-index: 0; opacity: 1; -webkit-print-color-adjust: exact; print-color-adjust: exact; display: block; }
    .header-logo[src=""], .header-logo:not([src]) { display: none; }
    .header-center-text { flex: 1; text-align: center; line-height: 1.2; font-size: 15px; font-weight: bold; padding: 0 15px; padding-bottom: 4px; margin-bottom: 2px; position: relative; }
    .header-center-text::after { content: ''; position: absolute; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; border-bottom: 2px solid #000; }
    .header-center-text .company-name { font-weight: 700; text-align: center; font-size: 15px; margin-bottom: 1px; font-family: Arial, Helvetica, sans-serif; }
    .header-center-text .company-address { font-size: 11px; font-weight: bold; text-align: center; line-height: 1.3; font-family: Arial, Helvetica, sans-serif; }
    .header-center-text .company-address-line { display: block; }
    .header-right { width: 20%; flex-shrink: 0; text-align: auto; font-size: 15px; font-weight: bold; padding-top: 0; font-family: Arial, Helvetica, sans-serif; }
    .sj-title-wrapper { display: flex; align-items: flex-start; justify-content: space-between; margin-top: 2px; margin-bottom: 8px; }
    .sj-title-wrapper .sj-spacer-left { width: 20%; flex-shrink: 0; }
    .sj-title-section { flex: 1; text-align: center; padding: 0 15px; }
    .sj-title-wrapper .sj-spacer-right { width: 20%; flex-shrink: 0; }
    .sj-title-section .title { font-weight: 700; font-size: 15px; letter-spacing: 0.5px; margin-bottom: 2px; font-family: Arial, Helvetica, sans-serif; }
    .sj-title-section .sj-number { font-weight: 600; font-size: 15px; font-family: Arial, Helvetica, sans-serif; }
    .info { display: flex; justify-content: space-between; margin-top: 6px; font-size: 16px; font-weight: bold; line-height: 1.8; font-family: Arial, Helvetica, sans-serif; }
    .info .left { width: 60%; }
    .info .right { width: 35%; margin-left: auto; padding-left: 2%; }
    .info .info-row { margin-bottom: 6px; line-height: 1.6; }
    .info .label { display: inline-block; font-weight: 700; width: 180px; vertical-align: top; padding-right: 8px; position: relative; }
    .info .label-text { text-align: left; display: inline-block; }
    .info .label-colon { position: absolute; right: calc(4px + 8mm); }
    .info .value { display: inline-block; word-wrap: break-word; word-break: break-word; vertical-align: top; margin-left: -8mm; }
    .info .value-line { display: block; margin: 0; padding: 0; line-height: 1.6; }
    table.items { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 19px; font-weight: bold; font-family: Arial, Helvetica, sans-serif; }
    table.items thead th { border: 1px solid #000; padding: 5px 4px; background: #f6f6f6; font-weight: 700; text-align: left; font-family: Arial, Helvetica, sans-serif; }
    table.items thead th:nth-child(1), table.items thead th:nth-child(4), table.items thead th:nth-child(5) { text-align: center; }
    table.items td { border: 1px solid #000; padding: 5px 4px; vertical-align: top; font-family: Arial, Helvetica, sans-serif; }
    .footer { margin-top: 12px; }
    .keterangan { margin-top: 0; }
    .keterangan .title { font-weight: 700; margin-bottom: 2px; font-size: 19px; font-family: Arial, Helvetica, sans-serif; }
    .keterangan .note-text { font-size: 19px; font-weight: bold; line-height: 1.3; margin-bottom: 4px; padding-bottom: 0.8em; font-family: Arial, Helvetica, sans-serif; word-wrap: break-word; word-break: break-word; }
    .footer-date { margin-top: 6px; font-size: 19px; font-weight: bold; font-family: Arial, Helvetica, sans-serif; }
    .footer-hormat { margin-top: 4px; font-size: 19px; font-weight: bold; margin-bottom: 10px; font-family: Arial, Helvetica, sans-serif; }
    .signature-section { display: flex; justify-content: flex-start; align-items: flex-start; width: 100%; margin-top: 45px; gap: 10px; }
    .sig { text-align: left; font-size: 19px; font-weight: bold; min-width: 80px; font-family: Arial, Helvetica, sans-serif; }
    .sig-right { text-align: right; font-size: 19px; font-weight: bold; min-width: 80px; margin-left: auto; font-family: Arial, Helvetica, sans-serif; }
    .sig .line, .sig-right .line { border-top: 1px solid #000; margin-top: 60px; display: block; width: 100%; }
    .sig .label, .sig-right .label { margin-top: 4px; font-weight: 600; font-family: Arial, Helvetica, sans-serif; }
    @media print { @page { size: 9.5in 11in; margin: -5mm 2px 10mm 5mm; } body { padding: 1px 2px 10mm 2px; font-family: Arial, Helvetica, sans-serif; } .header-logo { -webkit-print-color-adjust: exact; print-color-adjust: exact; max-width: 100%; height: auto; max-height: 100px; display: block; } .header-logo[src=""], .header-logo:not([src]) { display: none; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <img src="${logoSrc}" class="header-logo" alt="Logo"  />
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
      <div class="title">SURAT JALAN RECAP</div>
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
        </span>
      </div>
    </div>
    <div class="right">
      <div class="info-row">
        <span class="label"><span class="label-text">No. Kendaraan</span><span class="label-colon"> :</span></span>
        <span class="value">${htmlEscape(sj.vehicleNo || '')}</span>
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
          ${htmlEscape(recapNote)}
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

// Helper function untuk select template berdasarkan ID
export function generatePackagingRecapHtmlByTemplate(
  templateId: number,
  params: GenerateSuratJalanHtmlParams
): string {
  switch (templateId) {
    case 1:
      // Template 1: Standard Recap (dari suratjalan-pdf-template.ts)
      // Ini adalah template recap standar yang sudah ada
      return generatePackagingRecapWithPOHtml(params);
    case 2:
      // Template 2: Recap dengan PO
      return generatePackagingRecapWithPOHtml(params);
    case 3:
      // Template 3: Recap dengan SJ List
      return generatePackagingRecapWithSJListHtml(params);
    case 4:
      // Template 4: Recap Lengkap (PO + SJ List)
      return generatePackagingRecapCompleteHtml(params);
    default:
      // Default ke template 1
      return generatePackagingRecapWithPOHtml(params);
  }
}
