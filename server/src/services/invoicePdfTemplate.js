import fs from 'node:fs';
import { LOGO_FULL_PATH, LOGO_ICON_PATH } from '../config.js';
import { drawAdvancedPdfSections, drawVisualDesignPdf, shouldRenderVisualDesign } from './pdfTemplateAdvanced.js';

const fontPath = 'C:\\Windows\\Fonts\\arial.ttf';
const boldFontPath = 'C:\\Windows\\Fonts\\arialbd.ttf';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_X = 28;
const PAGE_RIGHT = 567;
const CONTENT_WIDTH = PAGE_RIGHT - PAGE_X;

const NAVY = '#063b88';
const NAVY_DARK = '#041b49';
const CYAN = '#0ea5e9';
const TEXT = '#0b1220';
const MUTED = '#475569';
const LIGHT_BLUE = '#eef7ff';
const BORDER = '#1d5fd1';
const SOFT_BORDER = '#c7ddf8';
const TABLE_LINE = '#d7e6f8';
const GREEN = '#08745f';
const GREEN_LIGHT = '#f0fdf9';
const GREEN_BORDER = '#7dd3bd';

const ONE_PAGE_AMOUNT_Y = 498;
const BOTTOM_STRIP_Y = 813;
const NON_FINAL_TABLE_LIMIT = 800;
const FINAL_SECTIONS_HEIGHT = 316;
const FINAL_SECTIONS_BOTTOM = BOTTOM_STRIP_Y - 58;
const AMOUNT_TO_WORK_NOTICE_GAP = 16;
const AMOUNT_TO_NEXT_SECTION_GAP = 12;

const INVOICE_COMPANY = {
  name: 'Universal Systems',
  tagline: 'Repair | Service | Sales | AMC',
  addressLines: [
    'MIG-H3, Housing Unit, Near 4 Roads,',
    'Mathiyankuttai Post, Mettur Dam \u2013 636452,',
    'Salem, Tamil Nadu, India.'
  ],
  phones: ['98427 81971', '70100 24368'],
  email: 'usmettur@gmail.com',
  website: 'usmettur.com',
  footerAddressLines: ['Mettur Dam, Salem,', 'Tamil Nadu \u2013 636452']
};

const DEFAULT_TERMS = [
  'Payment is required before delivery or as per company policy.',
  'Warranty, if applicable, covers only the parts or services mentioned in this invoice.',
  'Products once delivered should be checked and verified by the customer.',
  'Additional work or parts not mentioned in this invoice will be charged separately.'
];

const DEFAULT_NOTICE = [
  'Service completed successfully.',
  'You may visit our store to collect your product or arrange for delivery as per your convenience.'
];

function fontExists(filePath) {
  return fs.existsSync(filePath);
}

function registerFonts(doc) {
  if (fontExists(fontPath)) doc.registerFont('Body', fontPath);
  if (fontExists(boldFontPath)) doc.registerFont('BodyBold', boldFontPath);
  doc.font(fontExists(fontPath) ? 'Body' : 'Helvetica');
}

function bodyFont() {
  return fontExists(fontPath) ? 'Body' : 'Helvetica';
}

function boldFont() {
  return fontExists(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold';
}

function cleanText(value, fallback = '-') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function renderText(value = '', context = {}) {
  return String(value || '').replace(/\{\{([a-z0-9_.]+)\}\}/gi, (_match, key) => {
    const normalizedKey = String(key || '').replace(/\./g, '_');
    if (!Object.prototype.hasOwnProperty.call(context, normalizedKey)) return '-';
    const next = context[normalizedKey];
    return next === undefined || next === null || next === '' ? '-' : next;
  });
}

function cfgSection(config = {}, key = '') {
  return config.sections?.[key] || {};
}

function visibleFlag(source = {}, key = 'show', fallback = true) {
  return source[key] !== undefined ? source[key] !== false : fallback;
}

function cfgList(value = [], fallback = []) {
  const source = Array.isArray(value) ? value : String(value || '').split('\n');
  const rows = source.map((line) => String(line || '').trim()).filter(Boolean);
  return rows.length ? rows : fallback;
}

function cfgLabel(config = {}, key = '', fallback = '') {
  return cleanText(cfgSection(config, 'itemTable').labels?.[key], fallback);
}

function money(value) {
  return `\u20b9${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

function amount(value) {
  return Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function wordsBelowThousand(number) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = Math.floor(number);
  if (n < 20) return ones[n];
  if (n < 100) return `${tens[Math.floor(n / 10)]} ${ones[n % 10]}`.trim();
  return `${ones[Math.floor(n / 100)]} Hundred ${wordsBelowThousand(n % 100)}`.trim();
}

function amountInWords(value) {
  let n = Math.round(Number(value || 0));
  if (n === 0) return 'Rupees Zero Only';
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const chunks = [];
  if (crore) chunks.push(`${wordsBelowThousand(crore)} Crore`);
  if (lakh) chunks.push(`${wordsBelowThousand(lakh)} Lakh`);
  if (thousand) chunks.push(`${wordsBelowThousand(thousand)} Thousand`);
  if (n) chunks.push(wordsBelowThousand(n));
  return `Rupees ${chunks.join(' ')} Only`;
}

function formatDate(value = new Date()) {
  const date = new Date(value || new Date());
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  return [
    String(safe.getDate()).padStart(2, '0'),
    String(safe.getMonth() + 1).padStart(2, '0'),
    safe.getFullYear()
  ].join('-');
}

function invoiceCompany(company = {}) {
  return {
    ...INVOICE_COMPANY,
    name: company.name || INVOICE_COMPANY.name,
    logoFilePath: company.logoFilePath || LOGO_FULL_PATH
  };
}

function drawLine(doc, x1, y1, x2, y2, color = SOFT_BORDER, width = 0.7) {
  doc.strokeColor(color).lineWidth(width).moveTo(x1, y1).lineTo(x2, y2).stroke();
}

function drawCard(doc, x, y, width, height, options = {}) {
  doc.save();
  doc.lineWidth(options.lineWidth || 0.7).strokeColor(options.stroke || SOFT_BORDER);
  if (options.fill) {
    doc.roundedRect(x, y, width, height, options.radius || 8).fillAndStroke(options.fill, options.stroke || SOFT_BORDER);
  } else {
    doc.roundedRect(x, y, width, height, options.radius || 8).stroke();
  }
  doc.restore();
}

function drawSectionLabel(doc, label, x, y, width, color = NAVY) {
  doc.font(boldFont()).fontSize(8.2).fillColor(color).text(String(label || '').toUpperCase(), x, y, {
    width,
    characterSpacing: 0.35
  });
}

function drawHeaderIcon(doc, type, x, y, color = NAVY) {
  doc.save();
  doc.lineWidth(1.15).strokeColor(color).fillColor(color).lineCap('round').lineJoin('round');
  if (type === 'address') {
    doc.circle(x + 7, y + 6.5, 4.8).stroke();
    doc.circle(x + 7, y + 6.5, 1.2).fill();
    doc.moveTo(x + 7, y + 11.3).lineTo(x + 7, y + 15.8).stroke();
  } else if (type === 'phone') {
    doc.path(`M${x + 2} ${y + 2} C${x + 4.5} ${y + 9.5} ${x + 8.2} ${y + 13} ${x + 15.5} ${y + 15.5}`).stroke();
    doc.path(`M${x + 2} ${y + 2} L${x + 5.5} ${y + 1.3} L${x + 7.7} ${y + 5.3} L${x + 5.5} ${y + 6.7}`).stroke();
    doc.path(`M${x + 10.4} ${y + 10.3} L${x + 12} ${y + 8.2} L${x + 16.2} ${y + 10.5} L${x + 15.5} ${y + 15.5}`).stroke();
  } else if (type === 'email') {
    doc.roundedRect(x + 1.5, y + 3, 15, 10.5, 1.4).stroke();
    doc.moveTo(x + 2.8, y + 4.7).lineTo(x + 9, y + 9).lineTo(x + 15.2, y + 4.7).stroke();
  } else if (type === 'website') {
    doc.circle(x + 8.5, y + 8, 6.3).stroke();
    doc.moveTo(x + 2.5, y + 8).lineTo(x + 14.5, y + 8).stroke();
    doc.moveTo(x + 8.5, y + 1.8).bezierCurveTo(x + 6.1, y + 4.6, x + 6.1, y + 11.4, x + 8.5, y + 14.2).stroke();
    doc.moveTo(x + 8.5, y + 1.8).bezierCurveTo(x + 10.9, y + 4.6, x + 10.9, y + 11.4, x + 8.5, y + 14.2).stroke();
  }
  doc.restore();
}

function drawContactLine(doc, type, text, x, y, width, options = {}) {
  drawHeaderIcon(doc, type, x, y + 0.5, NAVY);
  doc.font(bodyFont()).fontSize(options.fontSize || 9).fillColor(TEXT)
    .text(text, x + 25, y, { width: width - 25, lineGap: 1.8 });
}

function drawHeader(doc, company, config = {}) {
  const currentCompany = invoiceCompany(company);
  const logoPath = currentCompany.logoFilePath || LOGO_FULL_PATH;
  const topY = 12;

  drawCard(doc, PAGE_X, topY, CONTENT_WIDTH, 104, { fill: '#fbfdff', stroke: SOFT_BORDER, radius: 10, lineWidth: 0.75 });
  doc.roundedRect(PAGE_X + 1, topY + 1, 10, 102, 8).fill(CYAN);

  if (config.showCompanyLogo !== false && logoPath && fs.existsSync(logoPath)) {
    doc.image(logoPath, PAGE_X + 18, topY + 15, { fit: [238, 48], align: 'left', valign: 'center' });
  } else {
    doc.circle(75, topY + 42, 34).strokeColor(NAVY).lineWidth(1.2).stroke();
    doc.font(boldFont()).fontSize(28).fillColor(NAVY).text('US', 51, topY + 27, { width: 48, align: 'center' });
    doc.font(boldFont()).fontSize(24).fillColor(NAVY).text(currentCompany.name, 122, topY + 26, { width: 176, lineGap: -2 });
  }

  doc.font(boldFont()).fontSize(8.4).fillColor(MUTED)
    .text(currentCompany.tagline, PAGE_X + 20, topY + 72, { width: 238, align: 'center' });

  if (config.showCompanyDetails !== false) {
    const rightX = 336;
    const rightWidth = PAGE_RIGHT - rightX;
    drawCard(doc, rightX - 8, topY + 10, rightWidth + 2, 84, { fill: '#f4f9ff', stroke: '#d8e9fb', radius: 8, lineWidth: 0.55 });
    drawContactLine(doc, 'address', currentCompany.addressLines.join('\n'), rightX, topY + 17, rightWidth, { fontSize: 7.75 });
    drawContactLine(doc, 'phone', currentCompany.phones.join(' / '), rightX, topY + 53, rightWidth, { fontSize: 8.25 });
    drawContactLine(doc, 'email', currentCompany.email, rightX, topY + 69, rightWidth, { fontSize: 8.25 });
    drawContactLine(doc, 'website', currentCompany.website, rightX, topY + 84, rightWidth, { fontSize: 8.25 });
  }

  drawLine(doc, PAGE_X, 122, PAGE_RIGHT, 122, NAVY, 1.1);
  drawLine(doc, PAGE_X, 125, PAGE_X + 156, 125, CYAN, 2.2);
}

function drawTitle(doc, title) {
  const y = 139;
  drawLine(doc, 86, y, 220, y, SOFT_BORDER, 0.9);
  drawLine(doc, 376, y, 510, y, SOFT_BORDER, 0.9);
  doc.roundedRect(222, y - 17, 152, 34, 17).fillAndStroke('#f4f9ff', '#cfe3fb');
  doc.circle(220, y, 3.4).fillColor(CYAN).fill();
  doc.circle(376, y, 3.4).fillColor(CYAN).fill();
  doc.font(boldFont()).fontSize(21).fillColor(NAVY).text(title || 'INVOICE', 224, y - 9, {
    width: 145,
    align: 'center'
  });
}

function drawWatermark(doc) {
  if (!fs.existsSync(LOGO_ICON_PATH)) return;
  doc.save();
  doc.opacity(0.06);
  doc.image(LOGO_ICON_PATH, 54, 236, { width: 487 });
  doc.restore();
}

function drawSmallIcon(doc, type, x, y, color = NAVY) {
  doc.save();
  doc.lineWidth(1.05).strokeColor(color).fillColor(color).lineCap('round').lineJoin('round');
  if (type === 'invoice') {
    doc.roundedRect(x + 2, y + 1.5, 12.5, 16, 1.2).stroke();
    doc.moveTo(x + 5, y + 6).lineTo(x + 11.5, y + 6).stroke();
    doc.moveTo(x + 5, y + 9.5).lineTo(x + 11.5, y + 9.5).stroke();
    doc.moveTo(x + 5, y + 13).lineTo(x + 10, y + 13).stroke();
  } else if (type === 'work') {
    doc.roundedRect(x + 1.5, y + 4, 14, 13, 1.6).stroke();
    doc.roundedRect(x + 5, y + 1, 7, 4.8, 1.3).stroke();
    doc.circle(x + 12.4, y + 14.2, 2.4).stroke();
  } else if (type === 'date') {
    doc.roundedRect(x + 1.5, y + 3.5, 15, 14, 1.5).stroke();
    doc.moveTo(x + 1.5, y + 7).lineTo(x + 16.5, y + 7).stroke();
    doc.moveTo(x + 5.2, y + 1.8).lineTo(x + 5.2, y + 5).stroke();
    doc.moveTo(x + 12.8, y + 1.8).lineTo(x + 12.8, y + 5).stroke();
  } else if (type === 'status') {
    doc.roundedRect(x + 1.5, y + 4, 15, 11.5, 1.5).stroke();
    doc.moveTo(x + 1.5, y + 7).lineTo(x + 16.5, y + 7).stroke();
    doc.circle(x + 12, y + 12, 1.4).stroke();
  }
  doc.restore();
}

function drawColonValue(doc, label, value, x, y, widths = {}) {
  const labelWidth = widths.label || 130;
  const valueWidth = widths.value || 150;
  const colonX = x + labelWidth + 5;
  doc.font(boldFont()).fontSize(widths.fontSize || 8.8).fillColor(TEXT)
    .text(label, x, y, { width: labelWidth });
  doc.text(':', colonX, y, { width: 10, align: 'center' });
  doc.font(boldFont()).fontSize(widths.fontSize || 8.8).fillColor(NAVY)
    .text(cleanText(value), colonX + 18, y, { width: valueWidth, lineGap: 2 });
}

function drawInvoiceDetailsCard(doc, invoice, config = {}) {
  const y = 154;
  const invoiceDetails = cfgSection(config, 'invoiceDetails');
  const customerDetails = cfgSection(config, 'customerDetails');
  drawCard(doc, PAGE_X, y, CONTENT_WIDTH, 132, { fill: '#ffffff', stroke: SOFT_BORDER, radius: 10 });
  doc.roundedRect(PAGE_X + 1, y + 1, CONTENT_WIDTH - 2, 28, 9).fill('#f3f8ff');
  doc.rect(PAGE_X + 1, y + 18, CONTENT_WIDTH - 2, 11).fill('#f3f8ff');
  drawSectionLabel(doc, 'Invoice Details', 45, y + 10, 170);
  drawSectionLabel(doc, 'Bill To', 330, y + 10, 160);
  drawLine(doc, 304, y + 20, 304, y + 121, '#bad2ef', 0.75);

  const leftRows = [
    visibleFlag(invoiceDetails, 'showInvoiceNumber') ? ['invoice', 'Invoice No', invoice.invoiceNo] : null,
    visibleFlag(invoiceDetails, 'showJobReference') ? ['work', 'Job Reference', invoice.jobReference] : null,
    visibleFlag(invoiceDetails, 'showInvoiceDate') ? ['date', 'Invoice Date', invoice.invoiceDate] : null,
    visibleFlag(invoiceDetails, 'showPaymentStatus') ? ['status', 'Payment Status', invoice.paymentStatus] : null
  ].filter(Boolean);
  const rowY = leftRows.length > 3 ? [187, 211, 235, 259] : [190, 219, 248];
  leftRows.forEach(([icon, label, value], index) => {
    drawSmallIcon(doc, icon, 44, rowY[index] - 6, CYAN);
    drawColonValue(doc, label, value, 79, rowY[index], { label: 122, value: 76, fontSize: 8.65 });
  });

  let rightY = 188;
  if (visibleFlag(customerDetails, 'showCustomerName')) {
    drawColonValue(doc, 'Customer Name', invoice.customerName, 330, rightY, { label: 94, value: 101, fontSize: 8.65 });
    rightY += 25;
  }
  if (visibleFlag(customerDetails, 'showPhoneNumber')) {
    drawColonValue(doc, 'Phone Number', invoice.customerPhone, 330, rightY, { label: 94, value: 101, fontSize: 8.65 });
    rightY += 25;
  }
  if (visibleFlag(customerDetails, 'showAddress')) {
    doc.font(boldFont()).fontSize(8.65).fillColor(TEXT).text('Address', 330, rightY, { width: 94 });
    doc.text(':', 428, rightY, { width: 10, align: 'center' });
    doc.font(bodyFont()).fontSize(8.45).fillColor(TEXT)
      .text(cleanText(invoice.customerAddress), 448, rightY, { width: 94, lineGap: 1.7 });
  }
}

function drawKeyValue(doc, label, value, x, y, options = {}) {
  const labelWidth = options.labelWidth || 100;
  const colonX = x + labelWidth + 5;
  doc.font(boldFont()).fontSize(options.fontSize || 8.8).fillColor(TEXT).text(label, x, y, { width: labelWidth });
  doc.text(':', colonX, y, { width: 9, align: 'center' });
  doc.font(bodyFont()).fontSize(options.fontSize || 8.8).fillColor(NAVY).text(cleanText(value), colonX + 17, y, {
    width: options.valueWidth || 116,
    lineGap: 2
  });
}

function drawServiceDetailsCard(doc, invoice, config = {}) {
  const y = 294;
  const serviceDetails = cfgSection(config, 'serviceDetails');
  doc.roundedRect(PAGE_X + 0.5, y + 0.5, CONTENT_WIDTH - 1, 28, 8).fill(LIGHT_BLUE);
  doc.rect(PAGE_X + 0.5, y + 16, CONTENT_WIDTH - 1, 12.5).fill(LIGHT_BLUE);
  drawCard(doc, PAGE_X, y, CONTENT_WIDTH, 108, { fill: '#ffffff', stroke: SOFT_BORDER, radius: 10 });
  doc.roundedRect(PAGE_X + 12, y + 9, 5, 11, 2).fill(CYAN);
  drawSectionLabel(doc, 'Service Details', 42, y + 10, 180);
  drawLine(doc, 304, y + 35, 304, y + 96, '#bad2ef', 0.75);

  let leftY = y + 43;
  if (visibleFlag(serviceDetails, 'showServiceType')) {
    drawKeyValue(doc, 'Service Type', invoice.serviceType, 45, leftY, { labelWidth: 99, valueWidth: 118, fontSize: 8.65 });
    leftY += 23;
  }
  if (visibleFlag(serviceDetails, 'showDevice')) {
    drawKeyValue(doc, 'Device', invoice.device, 45, leftY, { labelWidth: 99, valueWidth: 118, fontSize: 8.65 });
    leftY += 23;
  }
  if (visibleFlag(serviceDetails, 'showBrandModel')) {
    drawKeyValue(doc, 'Brand / Model', invoice.brandModel, 45, leftY, { labelWidth: 99, valueWidth: 118, fontSize: 8.65 });
  }

  let rightY = y + 43;
  if (visibleFlag(serviceDetails, 'showProblemComplaint')) {
    doc.font(boldFont()).fontSize(8.65).fillColor(TEXT).text('Problem / Complaint', 330, rightY, { width: 105 });
    doc.text(':', 437, rightY, { width: 9, align: 'center' });
    doc.font(bodyFont()).fontSize(8.45).fillColor(NAVY)
      .text(cleanText(invoice.problemComplaint), 454, rightY, { width: 84, lineGap: 1.8 });
    rightY += 35;
  }

  if (visibleFlag(serviceDetails, 'showTechnician') && cleanText(invoice.technician, '') !== '') {
    drawKeyValue(doc, 'Technician', invoice.technician, 330, rightY, { labelWidth: 92, valueWidth: 86, fontSize: 8.65 });
  }
}

function tableColumns(config = {}) {
  const table = cfgSection(config, 'itemTable');
  const wanted = [
    { key: 'sno', label: cfgLabel(config, 'sno', 'S.No.'), weight: 48, align: 'center', show: visibleFlag(table, 'showSno') },
    { key: 'description', label: cfgLabel(config, 'description', 'Description'), weight: 176, align: 'left', show: true },
    { key: 'quantity', label: cfgLabel(config, 'quantity', 'Qty'), weight: 72, align: 'center', show: visibleFlag(table, 'showQuantity') },
    { key: 'unitPrice', label: cfgLabel(config, 'unitPrice', 'Unit Price (\u20b9)'), weight: 108, align: 'right', show: visibleFlag(table, 'showUnitPrice') },
    { key: 'tax', label: cfgLabel(config, 'tax', 'Tax (\u20b9)'), weight: 78, align: 'right', show: table.showTaxColumn === true },
    { key: 'total', label: cfgLabel(config, 'total', 'Total (\u20b9)'), weight: 108, align: 'right', show: visibleFlag(table, 'showTotal') }
  ].filter((column) => column.show);
  const totalWeight = wanted.reduce((sum, column) => sum + column.weight, 0) || 1;
  let used = 0;
  return wanted.map((column, index) => {
    const width = index === wanted.length - 1 ? CONTENT_WIDTH - used : Math.round((column.weight / totalWeight) * CONTENT_WIDTH);
    used += width;
    return { ...column, width };
  });
}

function drawItemsHeader(doc, y, config = {}) {
  const columns = tableColumns(config);
  const headerHeight = 26;
  let x = PAGE_X;
  doc.roundedRect(PAGE_X, y, CONTENT_WIDTH, headerHeight, 8).fill(NAVY_DARK);
  doc.rect(PAGE_X, y + 13, CONTENT_WIDTH, 13).fill(NAVY_DARK);
  doc.rect(PAGE_X, y + headerHeight - 3, CONTENT_WIDTH, 3).fill(CYAN);
  doc.font(boldFont()).fontSize(9.25).fillColor('#ffffff');
  columns.forEach((column) => {
    doc.text(column.label, x + 8, y + 7.3, { width: column.width - 16, align: column.align });
    x += column.width;
  });
  x = PAGE_X;
  columns.slice(0, -1).forEach((column) => {
    x += column.width;
    drawLine(doc, x, y + 4, x, y + headerHeight - 5, '#ffffff', 0.35);
  });
  return y + headerHeight;
}

function rowHeight(doc, item, config = {}) {
  const descriptionColumn = tableColumns(config).find((column) => column.key === 'description');
  const descriptionWidth = Math.max(120, (descriptionColumn?.width || 176) - 12);
  doc.font(bodyFont()).fontSize(8.8);
  return Math.max(26, doc.heightOfString(cleanText(item.description, 'Service'), { width: descriptionWidth, lineGap: 1.2 }) + 14);
}

function drawItemRow(doc, item, index, y, height, config = {}) {
  const columns = tableColumns(config);
  let x = PAGE_X;
  doc.rect(PAGE_X, y, CONTENT_WIDTH, height).fill(index % 2 ? '#f8fbff' : '#ffffff');
  drawLine(doc, PAGE_X, y, PAGE_RIGHT, y, TABLE_LINE, 0.45);
  doc.font(bodyFont()).fontSize(8.75).fillColor(TEXT);
  const values = {
    sno: String(index + 1),
    description: cleanText(item.description, 'Service'),
    quantity: String(item.quantity || 1),
    unitPrice: amount(item.unitPrice),
    tax: amount(item.tax || 0),
    total: amount(item.total)
  };
  columns.forEach((column) => {
    const value = values[column.key] || '';
    const isAmountColumn = ['unitPrice', 'tax', 'total'].includes(column.key);
    doc.font(isAmountColumn ? boldFont() : bodyFont()).fillColor(isAmountColumn ? NAVY : TEXT);
    doc.text(value, x + 8, y + 8.3, { width: column.width - 16, align: column.align, lineGap: 1.2 });
    x += column.width;
  });
  x = PAGE_X;
  columns.slice(0, -1).forEach((column) => {
    x += column.width;
    drawLine(doc, x, y, x, y + height, TABLE_LINE, 0.45);
  });
  drawLine(doc, PAGE_X, y + height, PAGE_RIGHT, y + height, TABLE_LINE, 0.45);
}

function drawContinuationPage(doc, title, company, config) {
  doc.addPage({ size: 'A4', margin: 0 });
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill('#ffffff');
  drawWatermark(doc);
  doc.font(boldFont()).fontSize(12).fillColor(NAVY).text(invoiceCompany(company).name, PAGE_X, 26, { width: 180 });
  doc.font(boldFont()).fontSize(16).fillColor(NAVY).text(`${title} (CONTINUED)`, 205, 24, { width: 185, align: 'center' });
  if (config.showCompanyDetails !== false) {
    doc.font(bodyFont()).fontSize(8).fillColor(MUTED)
      .text(`${INVOICE_COMPANY.phones.join(' / ')} | ${INVOICE_COMPANY.email}`, 377, 29, { width: 180, align: 'right' });
  }
  drawLine(doc, PAGE_X, 50, PAGE_RIGHT, 50, NAVY, 0.7);
  return 66;
}

function normalizeItems(items = []) {
  const rows = Array.isArray(items) ? items : [];
  if (!rows.length) {
    return [{ description: 'Service', quantity: 1, unitPrice: 0, total: 0 }];
  }
  return rows.map((item) => {
    const quantity = Number(item.quantity ?? item.qty ?? 1);
    const unitPrice = Number(item.unitPrice ?? item.price ?? item.rate ?? 0);
    return {
      description: cleanText(item.description || item.name, 'Service'),
      quantity,
      unitPrice,
      total: Number(item.total ?? item.amount ?? (quantity * unitPrice))
    };
  });
}

function drawItemsTable(doc, items, title, company, config) {
  const rows = normalizeItems(items);
  let y = 409;
  let index = 0;
  let tableStartedY = y;
  let pageBreaks = 0;
  y = drawItemsHeader(doc, y, config);
  doc.roundedRect(PAGE_X, tableStartedY, CONTENT_WIDTH, 26, 8).strokeColor(SOFT_BORDER).lineWidth(0.7).stroke();

  while (index < rows.length) {
    const remainingHeight = rows.slice(index).reduce((sum, item) => sum + rowHeight(doc, item, config), 0);
    const canFinishHere = remainingHeight + FINAL_SECTIONS_HEIGHT <= NON_FINAL_TABLE_LIMIT - y;

    if (!canFinishHere && y + rowHeight(doc, rows[index], config) > NON_FINAL_TABLE_LIMIT) {
      pageBreaks += 1;
      y = drawContinuationPage(doc, title, company, config);
      tableStartedY = y;
      y = drawItemsHeader(doc, y, config);
      doc.roundedRect(PAGE_X, tableStartedY, CONTENT_WIDTH, 26, 8).strokeColor(SOFT_BORDER).lineWidth(0.7).stroke();
      continue;
    }

    const height = rowHeight(doc, rows[index], config);
    drawItemRow(doc, rows[index], index, y, height, config);
    y += height;
    index += 1;

    if (index < rows.length && !canFinishHere && y + rowHeight(doc, rows[index], config) > NON_FINAL_TABLE_LIMIT) {
      pageBreaks += 1;
      y = drawContinuationPage(doc, title, company, config);
      tableStartedY = y;
      y = drawItemsHeader(doc, y, config);
      doc.roundedRect(PAGE_X, tableStartedY, CONTENT_WIDTH, 26, 8).strokeColor(SOFT_BORDER).lineWidth(0.7).stroke();
    }
  }

  drawLine(doc, PAGE_X, y, PAGE_RIGHT, y, SOFT_BORDER, 0.75);
  return { y: y + 12, rows, pageBreaks };
}

function drawRupeeIcon(doc, x, y) {
  doc.save();
  doc.circle(x + 18, y + 18, 18).fillAndStroke('#e8f5ff', '#bae0fb');
  doc.font(boldFont()).fontSize(22).fillColor(NAVY).text('\u20b9', x + 10, y + 6, { width: 17, align: 'center' });
  doc.restore();
}

function amountSectionHeight(doc, totals) {
  const summary = cfgSection(totals.config || {}, 'amountSummary');
  const rows = [
    visibleFlag(summary, 'showSubtotal') ? 'subtotal' : null,
    visibleFlag(summary, 'showFinalTotal') ? 'finalTotal' : null,
    visibleFlag(summary, 'showAmountPaid') ? 'amountPaid' : null
  ].filter(Boolean);
  const hasBalance = visibleFlag(summary, 'showBalanceDue');
  const rowGap = hasBalance ? 16 : 20;
  const rowsBottom = rows.length ? 34 + (rows.length - 1) * rowGap + 14 : 34;
  const summaryHeight = hasBalance ? rowsBottom + 6 + 27 : rowsBottom + 14;
  if (!visibleFlag(summary, 'showAmountInWords')) return Math.max(104, summaryHeight);
  doc.font(bodyFont()).fontSize(8.35);
  const wordsHeight = doc.heightOfString(cleanText(totals.words, ''), { width: 144, lineGap: 2 });
  return Math.max(104, Math.ceil(56 + wordsHeight + 16), summaryHeight);
}

function drawAmountSection(doc, y, totals) {
  const summary = cfgSection(totals.config || {}, 'amountSummary');
  const leftWidth = 248;
  const rightX = 330;
  const rightWidth = PAGE_RIGHT - rightX;
  const height = amountSectionHeight(doc, totals);

  if (visibleFlag(summary, 'showAmountInWords')) {
    drawCard(doc, PAGE_X, y, leftWidth, height, { fill: '#fbfdff', stroke: SOFT_BORDER, radius: 10 });
    doc.roundedRect(PAGE_X + 1, y + 1, 7, height - 2, 5).fill(CYAN);
    drawRupeeIcon(doc, 57, y + 31);
    doc.font(boldFont()).fontSize(9.6).fillColor(NAVY).text('Amount in Words', 112, y + 35, { width: 126 });
    doc.font(bodyFont()).fontSize(8.35).fillColor(TEXT).text(totals.words, 112, y + 56, { width: 144, lineGap: 2 });
  }

  drawCard(doc, rightX, y, rightWidth, height, { fill: '#ffffff', stroke: SOFT_BORDER, radius: 10 });
  doc.roundedRect(rightX + 1, y + 1, rightWidth - 2, 24, 9).fill('#f3f8ff');
  doc.rect(rightX + 1, y + 14, rightWidth - 2, 11).fill('#f3f8ff');
  drawSectionLabel(doc, 'Amount Summary', rightX + 14, y + 9, rightWidth - 28);
  const rows = [
    visibleFlag(summary, 'showSubtotal') ? ['Sub Total', money(totals.subtotal), false] : null,
    visibleFlag(summary, 'showFinalTotal') ? ['Final Total', money(totals.finalTotal), true] : null,
    visibleFlag(summary, 'showAmountPaid') ? ['Amount Paid', money(totals.amountPaid), false] : null
  ].filter(Boolean);
  const rowGap = visibleFlag(summary, 'showBalanceDue') ? 16 : 20;
  rows.forEach(([label, value, bold], index) => {
    const rowY = y + 34 + index * rowGap;
    doc.font(bold ? boldFont() : boldFont()).fontSize(bold ? 10.4 : 8.9).fillColor(bold ? NAVY : TEXT)
      .text(label, rightX + 14, rowY, { width: 83 });
    doc.text(':', rightX + 98, rowY, { width: 10, align: 'center' });
    doc.font(boldFont()).fontSize(bold ? 11.2 : 8.9).fillColor(bold ? NAVY : TEXT)
      .text(value, rightX + 124, rowY, { width: rightWidth - 139, align: 'right' });
    if (index < rows.length - 1) drawLine(doc, rightX + 14, rowY + 14.5, rightX + rightWidth - 14, rowY + 14.5, '#e0ebf7', 0.5);
  });

  if (visibleFlag(summary, 'showBalanceDue')) {
    const rowsBottom = rows.length ? y + 34 + (rows.length - 1) * rowGap + 14 : y + 34;
    const balanceY = Math.max(y + height - 27, rowsBottom + 6);
    doc.roundedRect(rightX + 0.5, balanceY, rightWidth - 1, 26.5, 7).fill(NAVY_DARK);
    doc.rect(rightX + 0.5, balanceY, rightWidth - 1, 9).fill(NAVY_DARK);
    doc.rect(rightX + 0.5, y + height - 4, rightWidth - 1, 3).fill(CYAN);
    doc.font(boldFont()).fontSize(9.7).fillColor('#ffffff').text('Balance Due', rightX + 14, balanceY + 7, { width: 83 });
    doc.text(':', rightX + 98, balanceY + 7, { width: 10, align: 'center' });
    doc.text(money(totals.balance), rightX + 124, balanceY + 7, { width: rightWidth - 139, align: 'right' });
  }

  return height;
}

function drawCheckDot(doc, x, y, color = GREEN) {
  doc.circle(x + 4, y + 4, 4).fillColor(color).fill();
  doc.strokeColor('#ffffff').lineWidth(0.95).lineCap('round').lineJoin('round')
    .moveTo(x + 2.2, y + 4.1).lineTo(x + 3.75, y + 5.7).lineTo(x + 6.35, y + 2.45).stroke();
}

function drawCompletionBadge(doc, x, y) {
  doc.save();
  doc.circle(x + 17, y + 17, 17).fillAndStroke(GREEN, '#9de7d1');
  doc.strokeColor('#ffffff').lineWidth(2).lineCap('round').lineJoin('round')
    .moveTo(x + 9.4, y + 17.2).lineTo(x + 14.8, y + 22.5).lineTo(x + 25.5, y + 11.6).stroke();
  doc.restore();
}

function drawWorkNotice(doc, y, config = {}) {
  const notice = cfgSection(config, 'workCompletionNotice');
  if (notice.show === false) return 0;
  const lines = cfgList(notice.messageLines, DEFAULT_NOTICE);
  drawCard(doc, PAGE_X, y, CONTENT_WIDTH, 67, { fill: GREEN_LIGHT, stroke: GREEN_BORDER, radius: 10 });
  doc.roundedRect(PAGE_X + 1, y + 1, 7, 65, 5).fill(GREEN);
  drawCompletionBadge(doc, 58, y + 10);
  drawLine(doc, 112, y + 12, 112, y + 56, GREEN_BORDER, 0.75);
  doc.font(boldFont()).fontSize(10.1).fillColor(GREEN).text(cleanText(notice.title, 'WORK COMPLETION NOTICE'), 130, y + 13, { width: 310 });
  let lineY = y + 36;
  lines.slice(0, 3).forEach((line) => {
    drawCheckDot(doc, 130, lineY + 1, GREEN);
    doc.font(bodyFont()).fontSize(8.45).fillColor(TEXT).text(line, 146, lineY, { width: 365, lineGap: 1.4 });
    lineY += line.includes('arrange') ? 20 : 13;
  });
  return 67;
}

function drawDocumentIcon(doc, x, y) {
  doc.save();
  doc.circle(x + 21, y + 21, 21).fillAndStroke('#eef7ff', '#c9def7');
  doc.roundedRect(x + 13, y + 10, 15, 22, 1.2).strokeColor(NAVY).lineWidth(1.5).stroke();
  doc.moveTo(x + 17, y + 17).lineTo(x + 25, y + 17).stroke();
  doc.moveTo(x + 17, y + 22).lineTo(x + 25, y + 22).stroke();
  doc.moveTo(x + 17, y + 27).lineTo(x + 23, y + 27).stroke();
  doc.restore();
}

function invoiceTerms(config = {}, context = {}) {
  const terms = cfgSection(config, 'terms');
  const configured = renderText(terms.text || config.termsAndConditions || '', context).trim();
  const oldDefault = /Payment is due before product delivery\.\s*Warranty is subject/i;
  if (!configured || oldDefault.test(configured)) return DEFAULT_TERMS;
  return configured
    .split('\n')
    .map((line) => line.replace(/^[-*\u2022]?\s*\d*\.?\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 4);
}

function drawTerms(doc, y, config = {}, context = {}) {
  const terms = cfgSection(config, 'terms');
  if (terms.show === false) return 0;
  drawCard(doc, PAGE_X, y, CONTENT_WIDTH, 73, { fill: '#ffffff', stroke: SOFT_BORDER, radius: 10 });
  doc.roundedRect(PAGE_X + 1, y + 1, 7, 71, 5).fill(NAVY);
  drawDocumentIcon(doc, 51, y + 15);
  drawLine(doc, 105, y + 12, 105, y + 61, SOFT_BORDER, 0.75);
  doc.font(boldFont()).fontSize(9.8).fillColor(NAVY).text(cleanText(terms.title, 'TERMS & CONDITIONS'), 128, y + 12, { width: 210 });
  let lineY = y + 31;
  invoiceTerms(config, context).forEach((term) => {
    drawCheckDot(doc, 129, lineY + 0.5, NAVY);
    doc.font(bodyFont()).fontSize(7.7).fillColor(TEXT).text(term, 145, lineY, { width: 389, lineGap: 0.6 });
    lineY += 11.6;
  });
  return 73;
}

function drawFooterIcon(doc, type, x, y) {
  if (type === 'phone' || type === 'email' || type === 'website' || type === 'address') {
    drawHeaderIcon(doc, type, x, y, NAVY);
  }
}

function drawFooterContacts(doc, y, company, config = {}) {
  const currentCompany = invoiceCompany(company);
  const footer = config.footer || {};
  const columns = [
    footer.showCallWhatsapp !== false ? ['phone', 'Call / WhatsApp', currentCompany.phones.join(' / ')] : null,
    footer.showEmail !== false ? ['email', 'Email', currentCompany.email] : null,
    footer.showWebsite !== false ? ['website', 'Website', currentCompany.website] : null,
    footer.showAddress !== false ? ['address', 'Address', currentCompany.footerAddressLines.join('\n')] : null
  ].filter(Boolean);
  if (!columns.length) return;
  const cardHeight = 56;
  drawCard(doc, PAGE_X, y - 2, CONTENT_WIDTH, cardHeight, { fill: '#fbfdff', stroke: '#e0ebf7', radius: 8, lineWidth: 0.55 });
  const columnWidth = CONTENT_WIDTH / columns.length;
  columns.forEach(([icon, label, value], index) => {
    const x = PAGE_X + index * columnWidth;
    const valueWidth = Math.max(54, columnWidth - 47);
    if (index > 0) drawLine(doc, x, y + 4, x, y + cardHeight - 8, SOFT_BORDER, 0.65);
    drawFooterIcon(doc, icon, x + 10, y + 8);
    doc.font(boldFont()).fontSize(7.35).fillColor(NAVY).text(label, x + 38, y + 6, { width: valueWidth, height: 10 });
    doc.font(bodyFont()).fontSize(6.55).fillColor(TEXT).text(value, x + 38, y + 19, {
      width: valueWidth,
      height: 31,
      lineGap: 1.15,
      ellipsis: true
    });
  });
}

function drawHandshakeIcon(doc, x, y) {
  doc.save();
  doc.circle(x + 12, y + 12, 12).fillAndStroke('#0d3b91', '#7ea4ef');
  doc.translate(x + 5.5, y + 6);
  doc.lineWidth(1.1).strokeColor('#ffffff').lineCap('round').lineJoin('round');
  doc.path('M1 7 L4 4 L7 7 L5 9 Z').stroke();
  doc.path('M17 7 L14 4 L11 7 L13 9 Z').stroke();
  doc.path('M5 7 L8 5 L12 9').stroke();
  doc.path('M5 10 L7 12').stroke();
  doc.path('M8 10 L10 12').stroke();
  doc.path('M11 9 L14 12').stroke();
  doc.restore();
}

function drawBottomStrip(doc, config = {}, context = {}, company = {}) {
  const currentCompany = invoiceCompany(company);
  const footerContext = {
    ...context,
    company_name: cleanText(context.company_name || currentCompany.name, currentCompany.name),
    company: cleanText(context.company || currentCompany.name, currentCompany.name)
  };
  const rawMessage = cleanText(config.footer?.thankYouMessage || config.footerText, 'Thank you for your business. We look forward to serving you again.');
  const message = cleanText(renderText(rawMessage, footerContext), 'Thank you for your business. We look forward to serving you again.');
  doc.roundedRect(PAGE_X, BOTTOM_STRIP_Y, CONTENT_WIDTH, 24, 6).fill(NAVY_DARK);
  doc.rect(PAGE_X, BOTTOM_STRIP_Y + 21, CONTENT_WIDTH, 3).fill(CYAN);
  drawHandshakeIcon(doc, 78, BOTTOM_STRIP_Y + 1);
  drawLine(doc, 129, BOTTOM_STRIP_Y + 5, 129, BOTTOM_STRIP_Y + 20, '#ffffff', 0.6);
  doc.font(boldFont()).fontSize(9.5).fillColor('#ffffff')
    .text(message, 147, BOTTOM_STRIP_Y + 8, {
      width: 330,
      align: 'center'
    });
  drawLine(doc, 484, BOTTOM_STRIP_Y + 14, 532, BOTTOM_STRIP_Y + 14, '#ffffff', 0.6);
  doc.circle(533, BOTTOM_STRIP_Y + 14, 2.7).fillColor('#ffffff').fill();
}

function drawFinalSections(doc, startY, totals, config, context, company) {
  let y = startY;
  const amountHeight = drawAmountSection(doc, y, { ...totals, config });
  const noticeVisible = cfgSection(config, 'workCompletionNotice').show !== false;
  y += amountHeight + (noticeVisible ? AMOUNT_TO_WORK_NOTICE_GAP : AMOUNT_TO_NEXT_SECTION_GAP);
  const noticeHeight = drawWorkNotice(doc, y, config);
  if (noticeHeight) y += noticeHeight + 7;
  const termsHeight = drawTerms(doc, y, config, context);
  if (termsHeight) y += termsHeight + 10;
  drawFooterContacts(doc, Math.min(y, BOTTOM_STRIP_Y - 56), company, config);
  drawBottomStrip(doc, config, context, company);
}

function finalSectionsDrawHeight(doc, config = {}, totals = {}) {
  const noticeVisible = cfgSection(config, 'workCompletionNotice').show !== false;
  let height = amountSectionHeight(doc, { ...totals, config }) + (noticeVisible ? AMOUNT_TO_WORK_NOTICE_GAP : AMOUNT_TO_NEXT_SECTION_GAP);
  if (cfgSection(config, 'workCompletionNotice').show !== false) height += 74;
  if (cfgSection(config, 'terms').show !== false) height += 73;
  return height;
}

function ensureFinalSectionStart(doc, y, title, company, config = {}, totals = {}) {
  if (y + finalSectionsDrawHeight(doc, config, totals) <= FINAL_SECTIONS_BOTTOM) return y;
  return drawContinuationPage(doc, title, company, config);
}

function drawPageNumbers(doc, config = {}) {
  if (config.pageBreaks?.showPageNumbers === false) return;
  try {
    const range = doc.bufferedPageRange();
    for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
      doc.switchToPage(pageIndex);
      doc.font(bodyFont()).fontSize(7.5).fillColor(MUTED)
        .text(`Page ${pageIndex - range.start + 1} of ${range.count}`, PAGE_RIGHT - 75, 57, { width: 70, align: 'right' });
    }
  } catch {
    // Page numbers require buffered pages. Existing non-buffered callers can still render PDFs.
  }
}

function blankInvoiceData() {
  return {
    invoiceNo: '-',
    jobReference: '-',
    invoiceDate: formatDate(new Date()),
    paymentStatus: 'Pending',
    customerName: '-',
    customerPhone: '-',
    customerAddress: '-',
    serviceType: '-',
    device: '-',
    brandModel: '-',
    problemComplaint: '-',
    technician: '',
    items: [],
    amountPaid: 0,
    balance: null,
    subtotal: null,
    finalTotal: null
  };
}

function splitBrandModel(value = '') {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { brand: '-', model: parts[0] || '-' };
  return { brand: parts[0], model: parts.slice(1).join(' ') };
}

function visualInvoiceContext(context = {}, invoice = {}, items = [], totals = {}) {
  const brandModel = invoice.brandModel || [invoice.deviceBrand, invoice.deviceModel].filter(Boolean).join(' ').trim();
  const fallback = splitBrandModel(brandModel);
  const invoiceItems = items.map((item, index) => ({
    item_index: String(index + 1),
    item_description: cleanText(item.description, 'Service'),
    item_quantity: String(item.quantity || 1),
    item_unit_price: money(item.unitPrice),
    item_total: money(item.total)
  }));
  return {
    ...context,
    invoice_no: invoice.invoiceNo || context.invoice_no || context.invoice_number || '-',
    invoice_number: invoice.invoiceNo || context.invoice_number || context.invoice_no || '-',
    invoice_date: invoice.invoiceDate || context.invoice_date || '-',
    payment_status: invoice.paymentStatus || context.payment_status || '-',
    customer_name: invoice.customerName || context.customer_name || '-',
    customer_phone: invoice.customerPhone || context.customer_phone || '-',
    customer_address: invoice.customerAddress || context.customer_address || '-',
    work_order_id: invoice.jobReference || context.work_order_id || context.work_order_no || '-',
    work_order_no: invoice.jobReference || context.work_order_no || context.work_order_id || '-',
    service_type: invoice.serviceType || context.service_type || context.service_name || '-',
    service_name: invoice.serviceType || context.service_name || context.service_type || '-',
    device: invoice.device || context.device || '-',
    device_name: invoice.deviceName || invoice.device || context.device_name || context.device || '-',
    device_brand: invoice.deviceBrand || invoice.brand || context.device_brand || (fallback.model !== '-' ? fallback.brand : '-'),
    device_model: invoice.deviceModel || invoice.model || context.device_model || (fallback.model !== '-' ? fallback.model : brandModel || '-'),
    brand_model: brandModel || context.brand_model || '-',
    problem_complaint: invoice.problemComplaint || invoice.problemDescription || context.problem_complaint || '-',
    problem_description: invoice.problemDescription || invoice.problemComplaint || context.problem_description || context.problem_complaint || '-',
    technician_name: invoice.technician || invoice.technicianName || context.technician_name || '-',
    total_amount: money(totals.subtotal),
    subtotal_amount: money(totals.subtotal),
    final_total: money(totals.finalTotal),
    amount_paid: money(totals.amountPaid),
    balance_due: money(totals.balance),
    amount_in_words: invoice.amountInWords || totals.words || context.amount_in_words || '-',
    item_index: invoiceItems[0]?.item_index || '1',
    item_description: invoiceItems[0]?.item_description || '-',
    item_quantity: invoiceItems[0]?.item_quantity || '1',
    item_unit_price: invoiceItems[0]?.item_unit_price || money(0),
    item_total: invoiceItems[0]?.item_total || money(0),
    invoice_items: invoiceItems
  };
}

export function sampleInvoiceData() {
  return {
    invoiceNo: 'INV-2026-0089',
    jobReference: 'WO-2026-0123',
    invoiceDate: '28-05-2026',
    paymentStatus: 'Pending',
    customerName: 'Rahul Kumar',
    customerPhone: '98427 81971',
    customerAddress: '12, Mettur Main Road,\nMettur Dam \u2013 636452,\nSalem, Tamil Nadu.',
    serviceType: 'Laptop Service',
    device: 'Laptop',
    brandModel: 'Dell Inspiron 15',
    problemComplaint: 'System running slow and needs RAM upgrade.',
    technician: 'Arjun',
    items: [
      { description: 'General Service', quantity: 1, unitPrice: 700, total: 700 },
      { description: 'RAM 4GB DDR4', quantity: 1, unitPrice: 500, total: 500 }
    ],
    amountPaid: 0
  };
}

export function renderInvoicePdf(doc, options = {}) {
  registerFonts(doc);
  if (doc.page?.margins) {
    doc.page.margins.top = 0;
    doc.page.margins.right = 0;
    doc.page.margins.bottom = 0;
    doc.page.margins.left = 0;
  }

  const template = options.template || {};
  const config = template.config || {};
  const context = options.context || {};
  const company = invoiceCompany(options.company);
  const invoice = {
    ...blankInvoiceData(),
    ...(options.invoice || {})
  };

  const title = cleanText(renderText(config.headerTitle || 'INVOICE', context), 'INVOICE').toUpperCase();
  const items = normalizeItems(invoice.items);
  const subtotal = Number(invoice.subtotal ?? items.reduce((sum, item) => sum + Number(item.total || 0), 0));
  const finalTotal = Number(invoice.finalTotal ?? invoice.total ?? subtotal);
  const amountPaid = Number(invoice.amountPaid ?? invoice.paidAmount ?? 0);
  const balance = Number(invoice.balance ?? Math.max(0, finalTotal - amountPaid));
  const totals = {
    subtotal,
    finalTotal,
    amountPaid,
    balance,
    words: invoice.amountInWords || amountInWords(finalTotal)
  };

  if (shouldRenderVisualDesign(config)) {
    drawVisualDesignPdf(doc, { config, context: visualInvoiceContext(context, invoice, items, totals), title, company });
    drawPageNumbers(doc, config);
    return { subtotal, finalTotal, amountPaid, balance };
  }

  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill('#ffffff');
  drawHeader(doc, company, config);
  drawTitle(doc, title);
  drawWatermark(doc);
  drawInvoiceDetailsCard(doc, invoice, config);
  drawServiceDetailsCard(doc, invoice, config);
  const table = drawItemsTable(doc, items, title, company, config);
  const defaultFinalY = table.pageBreaks > 0 ? table.y + 6 : Math.max(ONE_PAGE_AMOUNT_Y, table.y + 6);
  const compactFinalY = table.pageBreaks > 0 ? defaultFinalY : table.y;
  const preferredFinalY = defaultFinalY + finalSectionsDrawHeight(doc, config, totals) <= FINAL_SECTIONS_BOTTOM
    ? defaultFinalY
    : compactFinalY;
  const finalY = ensureFinalSectionStart(doc, preferredFinalY, title, company, config, totals);
  drawFinalSections(doc, finalY, totals, config, context, company);
  drawAdvancedPdfSections(doc, { config, context, title, company });
  drawPageNumbers(doc, config);
  return { subtotal, finalTotal, amountPaid, balance };
}
