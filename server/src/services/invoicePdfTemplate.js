import fs from 'node:fs';
import { LOGO_FULL_PATH, LOGO_ICON_PATH } from '../config.js';

const fontPath = 'C:\\Windows\\Fonts\\arial.ttf';
const boldFontPath = 'C:\\Windows\\Fonts\\arialbd.ttf';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_X = 28;
const PAGE_RIGHT = 567;
const CONTENT_WIDTH = PAGE_RIGHT - PAGE_X;

const NAVY = '#082a73';
const NAVY_DARK = '#061b4f';
const TEXT = '#0f172a';
const MUTED = '#334155';
const LIGHT_BLUE = '#f1f7ff';
const BORDER = '#103a8a';
const SOFT_BORDER = '#d8e5f7';
const GREEN = '#0a7a5f';
const GREEN_LIGHT = '#f3fffb';
const GREEN_BORDER = '#73bea8';

const ONE_PAGE_AMOUNT_Y = 498;
const BOTTOM_STRIP_Y = 813;
const NON_FINAL_TABLE_LIMIT = 800;
const FINAL_SECTIONS_HEIGHT = 316;

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
  return String(value || '').replace(/\{\{([a-z0-9_]+)\}\}/gi, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(context, key)) return context[key];
    return match;
  });
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
  doc.lineWidth(options.lineWidth || 0.7).strokeColor(options.stroke || BORDER);
  if (options.fill) {
    doc.roundedRect(x, y, width, height, options.radius || 7).fillAndStroke(options.fill, options.stroke || BORDER);
  } else {
    doc.roundedRect(x, y, width, height, options.radius || 7).stroke();
  }
  doc.restore();
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
  const topY = 10;

  if (config.showCompanyLogo !== false && logoPath && fs.existsSync(logoPath)) {
    doc.image(logoPath, PAGE_X, topY, { width: 270 });
  } else {
    doc.circle(68, topY + 42, 42).strokeColor(NAVY).lineWidth(1.2).stroke();
    doc.font(boldFont()).fontSize(36).fillColor(NAVY).text('US', 38, topY + 25, { width: 60, align: 'center' });
    doc.font(boldFont()).fontSize(31).fillColor(NAVY).text(currentCompany.name.replace(/\s+Systems$/i, '\nSystems'), 120, topY + 14, { width: 176, lineGap: -4 });
  }

  doc.font(bodyFont()).fontSize(9.3).fillColor(TEXT)
    .text(currentCompany.tagline, 128, 91, { width: 178, align: 'center' });

  if (config.showCompanyDetails !== false) {
    const rightX = 342;
    const rightWidth = PAGE_RIGHT - rightX;
    drawContactLine(doc, 'address', currentCompany.addressLines.join('\n'), rightX, topY, rightWidth, { fontSize: 8.65 });
    drawContactLine(doc, 'phone', currentCompany.phones.join(' / '), rightX, topY + 47, rightWidth);
    drawContactLine(doc, 'email', currentCompany.email, rightX, topY + 66, rightWidth);
    drawContactLine(doc, 'website', currentCompany.website, rightX, topY + 85, rightWidth);
  }

  drawLine(doc, PAGE_X, 119, PAGE_RIGHT, 119, NAVY, 0.8);
}

function drawTitle(doc, title) {
  const y = 139;
  drawLine(doc, 132, y, 224, y, NAVY, 1.2);
  drawLine(doc, 371, y, 463, y, NAVY, 1.2);
  doc.circle(224, y, 3.8).fillColor(NAVY).fill();
  doc.circle(371, y, 3.8).fillColor(NAVY).fill();
  doc.font(boldFont()).fontSize(25).fillColor(NAVY).text(title || 'INVOICE', 225, 125, {
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

function drawInvoiceDetailsCard(doc, invoice) {
  const y = 154;
  drawCard(doc, PAGE_X, y, CONTENT_WIDTH, 132);
  drawLine(doc, 304, y + 12, 304, y + 121, '#9bb4df', 0.8);

  const leftRows = [
    ['invoice', 'Invoice No', invoice.invoiceNo],
    ['work', 'Job Reference', invoice.jobReference],
    ['date', 'Invoice Date', invoice.invoiceDate],
    ['status', 'Payment Status', invoice.paymentStatus]
  ];
  const rowY = [176, 203, 230, 257];
  leftRows.forEach(([icon, label, value], index) => {
    drawSmallIcon(doc, icon, 42, rowY[index] - 5);
    drawColonValue(doc, label, value, 78, rowY[index], { label: 128, value: 68 });
  });

  drawColonValue(doc, 'Customer Name', invoice.customerName, 330, 176, { label: 93, value: 103 });
  drawColonValue(doc, 'Phone Number', invoice.customerPhone, 330, 203, { label: 93, value: 103 });
  doc.font(boldFont()).fontSize(8.8).fillColor(TEXT).text('Address', 330, 230, { width: 93 });
  doc.text(':', 428, 230, { width: 10, align: 'center' });
  doc.font(bodyFont()).fontSize(8.8).fillColor(TEXT)
    .text(cleanText(invoice.customerAddress), 448, 230, { width: 94, lineGap: 2 });
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
  doc.roundedRect(PAGE_X + 0.5, y + 0.5, CONTENT_WIDTH - 1, 25, 6).fill(LIGHT_BLUE);
  doc.rect(PAGE_X + 0.5, y + 14, CONTENT_WIDTH - 1, 11.5).fill(LIGHT_BLUE);
  drawCard(doc, PAGE_X, y, CONTENT_WIDTH, 108);
  doc.font(boldFont()).fontSize(10.6).fillColor(NAVY).text('SERVICE DETAILS', 40, y + 10);
  drawLine(doc, 304, y + 32, 304, y + 97, '#9bb4df', 0.8);

  drawKeyValue(doc, 'Service Type', invoice.serviceType, 45, y + 41, { labelWidth: 99, valueWidth: 118 });
  drawKeyValue(doc, 'Device', invoice.device, 45, y + 64, { labelWidth: 99, valueWidth: 118 });
  drawKeyValue(doc, 'Brand / Model', invoice.brandModel, 45, y + 87, { labelWidth: 99, valueWidth: 118 });

  doc.font(boldFont()).fontSize(8.8).fillColor(TEXT).text('Problem / Complaint', 330, y + 41, { width: 105 });
  doc.text(':', 437, y + 41, { width: 9, align: 'center' });
  doc.font(bodyFont()).fontSize(8.8).fillColor(NAVY)
    .text(cleanText(invoice.problemComplaint), 454, y + 41, { width: 82, lineGap: 2 });

  if (config.showTechnician !== false && cleanText(invoice.technician, '') !== '') {
    drawKeyValue(doc, 'Technician', invoice.technician, 330, y + 76, { labelWidth: 92, valueWidth: 86 });
  }
}

function tableColumns() {
  return [
    { label: 'S.No.', width: 61, align: 'center' },
    { label: 'Description', width: 167, align: 'left' },
    { label: 'Qty', width: 88, align: 'center' },
    { label: 'Unit Price (\u20b9)', width: 116, align: 'right' },
    { label: 'Total (\u20b9)', width: CONTENT_WIDTH - 61 - 167 - 88 - 116, align: 'right' }
  ];
}

function drawItemsHeader(doc, y) {
  const columns = tableColumns();
  const headerHeight = 24;
  let x = PAGE_X;
  doc.roundedRect(PAGE_X, y, CONTENT_WIDTH, headerHeight, 6).fill(NAVY);
  doc.rect(PAGE_X, y + 12, CONTENT_WIDTH, 12).fill(NAVY);
  doc.font(boldFont()).fontSize(9.5).fillColor('#ffffff');
  columns.forEach((column) => {
    doc.text(column.label, x + 6, y + 7, { width: column.width - 12, align: column.align });
    x += column.width;
  });
  x = PAGE_X;
  columns.slice(0, -1).forEach((column) => {
    x += column.width;
    drawLine(doc, x, y, x, y + headerHeight, '#ffffff', 0.45);
  });
  return y + headerHeight;
}

function rowHeight(doc, item) {
  doc.font(bodyFont()).fontSize(8.8);
  return Math.max(26, doc.heightOfString(cleanText(item.description, 'Service'), { width: 154 }) + 14);
}

function drawItemRow(doc, item, index, y, height) {
  const columns = tableColumns();
  let x = PAGE_X;
  doc.rect(PAGE_X, y, CONTENT_WIDTH, height).fill(index % 2 ? '#f9fbff' : '#ffffff');
  drawLine(doc, PAGE_X, y, PAGE_RIGHT, y, '#cad8f0', 0.55);
  doc.font(bodyFont()).fontSize(8.8).fillColor(TEXT);
  [
    String(index + 1),
    cleanText(item.description, 'Service'),
    String(item.quantity || 1),
    amount(item.unitPrice),
    amount(item.total)
  ].forEach((value, cellIndex) => {
    const column = columns[cellIndex];
    doc.text(value, x + 6, y + 8, { width: column.width - 12, align: column.align, lineGap: 1.2 });
    x += column.width;
  });
  x = PAGE_X;
  columns.slice(0, -1).forEach((column) => {
    x += column.width;
    drawLine(doc, x, y, x, y + height, '#cad8f0', 0.55);
  });
  drawLine(doc, PAGE_X, y + height, PAGE_RIGHT, y + height, '#cad8f0', 0.55);
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
  y = drawItemsHeader(doc, y);
  doc.roundedRect(PAGE_X, tableStartedY, CONTENT_WIDTH, 24, 6).strokeColor(BORDER).lineWidth(0.7).stroke();

  while (index < rows.length) {
    const remainingHeight = rows.slice(index).reduce((sum, item) => sum + rowHeight(doc, item), 0);
    const canFinishHere = remainingHeight + FINAL_SECTIONS_HEIGHT <= NON_FINAL_TABLE_LIMIT - y;

    if (!canFinishHere && y + rowHeight(doc, rows[index]) > NON_FINAL_TABLE_LIMIT) {
      pageBreaks += 1;
      y = drawContinuationPage(doc, title, company, config);
      tableStartedY = y;
      y = drawItemsHeader(doc, y);
      doc.roundedRect(PAGE_X, tableStartedY, CONTENT_WIDTH, 24, 6).strokeColor(BORDER).lineWidth(0.7).stroke();
      continue;
    }

    const height = rowHeight(doc, rows[index]);
    drawItemRow(doc, rows[index], index, y, height);
    y += height;
    index += 1;

    if (index < rows.length && !canFinishHere && y + rowHeight(doc, rows[index]) > NON_FINAL_TABLE_LIMIT) {
      pageBreaks += 1;
      y = drawContinuationPage(doc, title, company, config);
      tableStartedY = y;
      y = drawItemsHeader(doc, y);
      doc.roundedRect(PAGE_X, tableStartedY, CONTENT_WIDTH, 24, 6).strokeColor(BORDER).lineWidth(0.7).stroke();
    }
  }

  drawLine(doc, PAGE_X, y, PAGE_RIGHT, y, BORDER, 0.7);
  return { y: y + 12, rows, pageBreaks };
}

function drawRupeeIcon(doc, x, y) {
  doc.save();
  doc.circle(x + 18, y + 18, 18).strokeColor(NAVY).lineWidth(1.7).stroke();
  doc.font(boldFont()).fontSize(22).fillColor(NAVY).text('\u20b9', x + 10, y + 6, { width: 17, align: 'center' });
  doc.restore();
}

function drawAmountSection(doc, y, totals) {
  const leftWidth = 248;
  const rightX = 330;
  const rightWidth = PAGE_RIGHT - rightX;
  const height = 104;

  drawCard(doc, PAGE_X, y, leftWidth, height);
  drawRupeeIcon(doc, 57, y + 31);
  doc.font(boldFont()).fontSize(9.7).fillColor(NAVY).text('Amount in Words', 112, y + 41, { width: 126 });
  doc.font(bodyFont()).fontSize(8.3).fillColor(TEXT).text(totals.words, 112, y + 61, { width: 144, lineGap: 2 });

  drawCard(doc, rightX, y, rightWidth, height);
  const rows = [
    ['Sub Total', money(totals.subtotal), false],
    ['Final Total', money(totals.finalTotal), true],
    ['Amount Paid', money(totals.amountPaid), false]
  ];
  rows.forEach(([label, value, bold], index) => {
    const rowY = y + 14 + index * 26;
    doc.font(bold ? boldFont() : boldFont()).fontSize(bold ? 10.4 : 8.9).fillColor(bold ? NAVY : TEXT)
      .text(label, rightX + 14, rowY, { width: 83 });
    doc.text(':', rightX + 98, rowY, { width: 10, align: 'center' });
    doc.font(boldFont()).fontSize(bold ? 11.2 : 8.9).fillColor(bold ? NAVY : TEXT)
      .text(value, rightX + 124, rowY, { width: rightWidth - 139, align: 'right' });
    if (index === 0) drawLine(doc, rightX + 14, y + 38, rightX + rightWidth - 14, y + 38, NAVY, 0.7);
    if (index === 2) {
      doc.save();
      doc.dash(2, { space: 2 });
      drawLine(doc, rightX + 14, y + 77, rightX + rightWidth - 14, y + 77, NAVY, 0.7);
      doc.undash();
      doc.restore();
    }
  });

  doc.roundedRect(rightX + 0.5, y + 77, rightWidth - 1, 26.5, 5).fill(NAVY);
  doc.rect(rightX + 0.5, y + 77, rightWidth - 1, 9).fill(NAVY);
  doc.font(boldFont()).fontSize(9.7).fillColor('#ffffff').text('Balance Due', rightX + 14, y + 84, { width: 83 });
  doc.text(':', rightX + 98, y + 84, { width: 10, align: 'center' });
  doc.text(money(totals.balance), rightX + 124, y + 84, { width: rightWidth - 139, align: 'right' });
}

function drawCheckDot(doc, x, y, color = GREEN) {
  doc.circle(x + 4, y + 4, 4).fillColor(color).fill();
  doc.strokeColor('#ffffff').lineWidth(1.05).lineCap('round').lineJoin('round')
    .moveTo(x + 2.2, y + 4).lineTo(x + 3.8, y + 5.8).lineTo(x + 6.4, y + 2.4).stroke();
}

function drawCompletionBadge(doc, x, y) {
  doc.save();
  doc.circle(x + 17, y + 17, 17).fillColor(GREEN).fill();
  doc.strokeColor('#ffffff').lineWidth(2.1).lineCap('round').lineJoin('round')
    .moveTo(x + 9.4, y + 17.2).lineTo(x + 14.8, y + 22.5).lineTo(x + 25.5, y + 11.6).stroke();
  doc.polygon([x + 7, y + 30], [x + 1, y + 48], [x + 12, y + 43]).fillColor(GREEN).fill();
  doc.polygon([x + 26.5, y + 30], [x + 34, y + 48], [x + 21.5, y + 43]).fillColor(GREEN).fill();
  doc.restore();
}

function drawWorkNotice(doc, y) {
  drawCard(doc, PAGE_X, y, CONTENT_WIDTH, 67, { fill: GREEN_LIGHT, stroke: GREEN_BORDER });
  drawCompletionBadge(doc, 58, y + 10);
  drawLine(doc, 112, y + 12, 112, y + 56, GREEN_BORDER, 0.8);
  doc.font(boldFont()).fontSize(10.3).fillColor(GREEN).text('WORK COMPLETION NOTICE', 130, y + 13, { width: 310 });
  let lineY = y + 36;
  DEFAULT_NOTICE.forEach((line) => {
    drawCheckDot(doc, 130, lineY + 1, GREEN);
    doc.font(bodyFont()).fontSize(8.45).fillColor(TEXT).text(line, 146, lineY, { width: 365, lineGap: 1.4 });
    lineY += line.includes('arrange') ? 20 : 13;
  });
}

function drawDocumentIcon(doc, x, y) {
  doc.save();
  doc.circle(x + 21, y + 21, 21).strokeColor(NAVY).lineWidth(0.8).stroke();
  doc.roundedRect(x + 13, y + 10, 15, 22, 1.2).strokeColor(NAVY).lineWidth(1.5).stroke();
  doc.moveTo(x + 17, y + 17).lineTo(x + 25, y + 17).stroke();
  doc.moveTo(x + 17, y + 22).lineTo(x + 25, y + 22).stroke();
  doc.moveTo(x + 17, y + 27).lineTo(x + 23, y + 27).stroke();
  doc.restore();
}

function invoiceTerms(config = {}, context = {}) {
  const configured = renderText(config.termsAndConditions || '', context).trim();
  const oldDefault = /Payment is due before product delivery\.\s*Warranty is subject/i;
  if (!configured || oldDefault.test(configured)) return DEFAULT_TERMS;
  return configured
    .split('\n')
    .map((line) => line.replace(/^[-*\u2022]?\s*\d*\.?\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 4);
}

function drawTerms(doc, y, config = {}, context = {}) {
  drawCard(doc, PAGE_X, y, CONTENT_WIDTH, 73);
  drawDocumentIcon(doc, 51, y + 15);
  drawLine(doc, 105, y + 12, 105, y + 61, NAVY, 0.8);
  doc.font(boldFont()).fontSize(9.8).fillColor(NAVY).text('TERMS & CONDITIONS', 128, y + 12, { width: 210 });
  let lineY = y + 31;
  invoiceTerms(config, context).forEach((term) => {
    drawCheckDot(doc, 129, lineY + 0.5, NAVY);
    doc.font(bodyFont()).fontSize(7.7).fillColor(TEXT).text(term, 145, lineY, { width: 389, lineGap: 0.6 });
    lineY += 11.6;
  });
}

function drawFooterIcon(doc, type, x, y) {
  if (type === 'phone' || type === 'email' || type === 'website' || type === 'address') {
    drawHeaderIcon(doc, type, x, y, NAVY);
  }
}

function drawFooterContacts(doc, y, company) {
  const currentCompany = invoiceCompany(company);
  const columns = [
    ['phone', 'Call / WhatsApp', currentCompany.phones.join(' / ')],
    ['email', 'Email', currentCompany.email],
    ['website', 'Website', currentCompany.website],
    ['address', 'Address', currentCompany.footerAddressLines.join('\n')]
  ];
  const columnWidth = CONTENT_WIDTH / 4;
  columns.forEach(([icon, label, value], index) => {
    const x = PAGE_X + index * columnWidth;
    if (index > 0) drawLine(doc, x, y + 2, x, y + 29, NAVY, 0.65);
    drawFooterIcon(doc, icon, x + 10, y + 5);
    doc.font(boldFont()).fontSize(7.6).fillColor(NAVY).text(label, x + 40, y + 2, { width: columnWidth - 44 });
    doc.font(bodyFont()).fontSize(7.15).fillColor(TEXT).text(value, x + 40, y + 14, { width: columnWidth - 44, lineGap: 1 });
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

function drawBottomStrip(doc) {
  doc.roundedRect(PAGE_X, BOTTOM_STRIP_Y, CONTENT_WIDTH, 24, 4).fill(NAVY);
  drawHandshakeIcon(doc, 78, BOTTOM_STRIP_Y + 1);
  drawLine(doc, 129, BOTTOM_STRIP_Y + 5, 129, BOTTOM_STRIP_Y + 20, '#ffffff', 0.6);
  doc.font(boldFont()).fontSize(9.5).fillColor('#ffffff')
    .text('Thank you for your business. We look forward to serving you again.', 147, BOTTOM_STRIP_Y + 8, {
      width: 330,
      align: 'center'
    });
  drawLine(doc, 484, BOTTOM_STRIP_Y + 14, 532, BOTTOM_STRIP_Y + 14, '#ffffff', 0.6);
  doc.circle(533, BOTTOM_STRIP_Y + 14, 2.7).fillColor('#ffffff').fill();
}

function drawFinalSections(doc, startY, totals, config, context, company) {
  drawAmountSection(doc, startY, totals);
  drawWorkNotice(doc, startY + 116);
  drawTerms(doc, startY + 190, config, context);
  drawFooterContacts(doc, startY + 273, company);
  drawBottomStrip(doc);
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

  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill('#ffffff');
  drawHeader(doc, company, config);
  drawTitle(doc, title);
  drawWatermark(doc);
  drawInvoiceDetailsCard(doc, invoice);
  drawServiceDetailsCard(doc, invoice, config);
  const table = drawItemsTable(doc, items, title, company, config);
  const finalY = table.pageBreaks > 0 ? table.y + 6 : Math.max(ONE_PAGE_AMOUNT_Y, table.y + 6);
  drawFinalSections(doc, finalY, totals, config, context, company);
  return { subtotal, finalTotal, amountPaid, balance };
}
