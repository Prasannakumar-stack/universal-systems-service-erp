import fs from 'node:fs';
import { LOGO_FULL_PATH, LOGO_ICON_PATH } from '../config.js';

const fontPath = 'C:\\Windows\\Fonts\\arial.ttf';
const boldFontPath = 'C:\\Windows\\Fonts\\arialbd.ttf';

const NAVY = '#0f2a52';
const NAVY_DARK = '#0b1f3f';
const TEXT = '#1e293b';
const MUTED = '#475569';
const LIGHT_BLUE = '#eef7ff';
const BORDER = '#17406d';
const SOFT_BORDER = '#d6e3f3';

const QUOTATION_COMPANY = {
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
  footerAddress: 'Mettur Dam, Salem, Tamil Nadu \u2013 636452'
};

const DEFAULT_TERMS = [
  'This quotation is not an invoice; it is only an estimate for the mentioned goods/services.',
  'This quotation is valid for 7 days from the quotation date.',
  'Work will start only after customer approval.',
  'Payment is required before delivery or as per company policy.',
  'Final price may change if additional faults, parts, or services are found.',
  'Warranty, if applicable, covers only the parts or services mentioned in this quotation.'
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

function money(value) {
  return `\u20b9${Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
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

function quoteCompany(company = {}) {
  return {
    ...QUOTATION_COMPANY,
    name: company.name || QUOTATION_COMPANY.name,
    logoFilePath: company.logoFilePath || LOGO_FULL_PATH
  };
}

function drawLine(doc, x1, y1, x2, y2, color = SOFT_BORDER, width = 0.7) {
  doc.strokeColor(color).lineWidth(width).moveTo(x1, y1).lineTo(x2, y2).stroke();
}

function drawCard(doc, x, y, width, height, options = {}) {
  doc.save();
  doc.lineWidth(options.lineWidth || 0.65).strokeColor(options.stroke || BORDER);
  if (options.fill) {
    doc.roundedRect(x, y, width, height, options.radius || 7).fillAndStroke(options.fill, options.stroke || BORDER);
  } else {
    doc.roundedRect(x, y, width, height, options.radius || 7).stroke();
  }
  doc.restore();
}

function drawKeyValue(doc, label, value, x, y, width, options = {}) {
  const labelWidth = options.labelWidth || 88;
  doc.font(boldFont()).fontSize(options.fontSize || 8.4).fillColor(NAVY_DARK)
    .text(`${label}:`, x, y, { width: labelWidth, lineBreak: false });
  doc.font(bodyFont()).fontSize(options.fontSize || 8.4).fillColor(TEXT)
    .text(cleanText(value), x + labelWidth, y, { width: width - labelWidth, lineGap: 1 });
}

function drawHeaderIcon(doc, type, x, y) {
  doc.save();
  doc.lineWidth(1.05).strokeColor(NAVY).fillColor(NAVY).lineCap('round').lineJoin('round');
  if (type === 'address') {
    doc.circle(x + 5.5, y + 5, 4.1).stroke();
    doc.circle(x + 5.5, y + 5, 1.1).fill();
    doc.moveTo(x + 5.5, y + 9.1).lineTo(x + 5.5, y + 13).stroke();
  } else if (type === 'phone') {
    doc.path(`M${x + 2} ${y + 2} C${x + 4} ${y + 9} ${x + 8} ${y + 12} ${x + 14} ${y + 14}`);
    doc.path(`M${x + 2} ${y + 2} L${x + 5} ${y + 1} L${x + 7} ${y + 5} L${x + 5} ${y + 6}`);
    doc.path(`M${x + 10} ${y + 10} L${x + 11} ${y + 8} L${x + 15} ${y + 10} L${x + 14} ${y + 14}`);
    doc.stroke();
  } else if (type === 'email') {
    doc.roundedRect(x + 1.5, y + 2.5, 13, 9.5, 1.4).stroke();
    doc.moveTo(x + 2.5, y + 4).lineTo(x + 8, y + 8).lineTo(x + 13.5, y + 4).stroke();
  } else if (type === 'website') {
    doc.circle(x + 8, y + 7.5, 6).stroke();
    doc.moveTo(x + 2.5, y + 7.5).lineTo(x + 13.5, y + 7.5).stroke();
    doc.moveTo(x + 8, y + 1.7).bezierCurveTo(x + 5.8, y + 4.4, x + 5.8, y + 10.6, x + 8, y + 13.3).stroke();
    doc.moveTo(x + 8, y + 1.7).bezierCurveTo(x + 10.2, y + 4.4, x + 10.2, y + 10.6, x + 8, y + 13.3).stroke();
  }
  doc.restore();
}

function drawContactRow(doc, type, text, x, y, width, options = {}) {
  drawHeaderIcon(doc, type, x, y + 1);
  doc.font(bodyFont()).fontSize(options.fontSize || 7.25).fillColor(MUTED)
    .text(text, x + 20, y, { width: width - 20, lineGap: 1.1 });
}

function drawHeader(doc, company, config = {}) {
  const currentCompany = quoteCompany(company);
  const topY = 25;
  const leftX = 34;
  const rightX = 340;
  const rightWidth = 221;
  const logoPath = currentCompany.logoFilePath || LOGO_FULL_PATH;

  if (config.showCompanyLogo !== false && logoPath && fs.existsSync(logoPath)) {
    doc.image(logoPath, leftX, topY, { width: 170 });
  } else {
    doc.circle(leftX + 22.5, topY + 22.5, 22.5).strokeColor(NAVY).lineWidth(1).stroke();
    doc.font(boldFont()).fontSize(16).fillColor(NAVY).text('US', leftX + 8, topY + 14, { width: 30, align: 'center' });
    const nameText = currentCompany.name.replace(/\s+Systems$/i, '\nSystems');
    doc.font(boldFont()).fontSize(16.5).fillColor(NAVY_DARK)
      .text(nameText, leftX + 58, topY + 4, { width: 174, lineGap: -1 });
  }

  doc.font(bodyFont()).fontSize(8.5).fillColor(MUTED)
    .text(currentCompany.tagline, leftX, topY + 62, { width: 245 });

  if (config.showCompanyDetails !== false) {
    drawContactRow(doc, 'address', currentCompany.addressLines.join('\n'), rightX, topY, rightWidth, { fontSize: 7.1 });
    drawContactRow(doc, 'phone', currentCompany.phones.join(' / '), rightX, topY + 37, rightWidth);
    drawContactRow(doc, 'email', currentCompany.email, rightX, topY + 53, rightWidth);
    drawContactRow(doc, 'website', currentCompany.website, rightX, topY + 69, rightWidth);
  }

  drawLine(doc, 34, 113, 561, 113, NAVY, 0.7);
}

function drawTitle(doc, title) {
  drawLine(doc, 132, 132, 228, 132, NAVY, 1);
  drawLine(doc, 367, 132, 463, 132, NAVY, 1);
  doc.font(boldFont()).fontSize(18).fillColor(NAVY).text(title || 'QUOTATION', 230, 121, {
    width: 135,
    align: 'center'
  });
}

function drawWatermark(doc) {
  if (!fs.existsSync(LOGO_ICON_PATH)) return;
  doc.save();
  doc.opacity(0.07);
  doc.image(LOGO_ICON_PATH, 36, 244, { width: 524 });
  doc.restore();
}

function drawDetailsCard(doc, quotation) {
  drawCard(doc, 34, 158, 527, 80);
  drawKeyValue(doc, 'Job Reference', quotation.jobReference, 50, 176, 226);
  drawKeyValue(doc, 'Quotation Date', quotation.quotationDate, 50, 197, 226);
  drawKeyValue(doc, 'Quotation Status', quotation.quotationStatus, 50, 218, 226);

  drawKeyValue(doc, 'Customer Name', quotation.customerName, 312, 176, 226, { labelWidth: 93 });
  drawKeyValue(doc, 'Phone Number', quotation.customerPhone, 312, 197, 226, { labelWidth: 93 });
  drawKeyValue(doc, 'Address', quotation.customerAddress, 312, 218, 226, { labelWidth: 58, fontSize: 8.1 });
}

function optionalRows(quotation, config) {
  const rows = [];
  if (config.showTechnician !== false && quotation.technician) {
    rows.push(['Technician', quotation.technician]);
  }
  if (config.showSerialNumber === true && quotation.serialNumber) {
    rows.push(['Serial Number', quotation.serialNumber]);
  }
  return rows;
}

function drawServiceCard(doc, quotation, config = {}) {
  const rows = optionalRows(quotation, config);
  drawCard(doc, 34, 252, 527, rows.length > 1 ? 114 : 98);
  doc.font(boldFont()).fontSize(10).fillColor(NAVY).text('SERVICE / PRODUCT DETAILS', 50, 268);
  drawKeyValue(doc, 'Service Type', quotation.serviceType, 50, 292, 222, { labelWidth: 82 });
  drawKeyValue(doc, 'Device', quotation.device, 50, 313, 222, { labelWidth: 82 });
  drawKeyValue(doc, 'Brand / Model', quotation.brandModel, 50, 334, 222, { labelWidth: 82 });

  doc.font(boldFont()).fontSize(8.4).fillColor(NAVY_DARK)
    .text('Problem / Complaint:', 314, 292, { width: 118, lineBreak: false });
  doc.font(bodyFont()).fontSize(8.4).fillColor(TEXT)
    .text(cleanText(quotation.problemComplaint), 314, 311, { width: 220, height: 22, lineGap: 1 });

  rows.forEach(([label, value], index) => {
    drawKeyValue(doc, label, value, 314, 334 + index * 17, 220, { labelWidth: 78 });
  });
}

function drawItemsTable(doc, quotation) {
  const x = 34;
  const y = 370;
  const columns = [
    { label: 'S.No', width: 42, align: 'center' },
    { label: 'Description', width: 234, align: 'left' },
    { label: 'Qty', width: 48, align: 'center' },
    { label: 'Unit Price (\u20b9)', width: 101, align: 'right' },
    { label: 'Total (\u20b9)', width: 102, align: 'right' }
  ];
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const headerHeight = 24;
  const rowHeight = 28;
  const rows = quotation.items.length ? quotation.items : [{ description: 'Service', quantity: 1, unitPrice: 0, total: 0 }];
  const tableHeight = headerHeight + rows.length * rowHeight;
  let colX = x;

  doc.roundedRect(x, y, tableWidth, tableHeight, 6).strokeColor(BORDER).lineWidth(0.65).stroke();
  doc.roundedRect(x, y, tableWidth, headerHeight, 6).fill(NAVY);
  doc.rect(x, y + 12, tableWidth, 12).fill(NAVY);
  doc.font(boldFont()).fontSize(8.3).fillColor('#ffffff');
  columns.forEach((column) => {
    doc.text(column.label, colX + 6, y + 8, { width: column.width - 12, align: column.align });
    colX += column.width;
  });

  rows.forEach((item, index) => {
    const rowY = y + headerHeight + index * rowHeight;
    if (index % 2 === 1) doc.rect(x, rowY, tableWidth, rowHeight).fill('#f8fbff');
    drawLine(doc, x, rowY, x + tableWidth, rowY, '#dbe6f3', 0.55);
    let cellX = x;
    doc.font(bodyFont()).fontSize(8.5).fillColor(TEXT);
    [
      String(index + 1),
      cleanText(item.description, 'Service'),
      String(item.quantity || 1),
      Number(item.unitPrice || 0).toFixed(2),
      Number(item.total || 0).toFixed(2)
    ].forEach((value, cellIndex) => {
      const column = columns[cellIndex];
      doc.text(value, cellX + 6, rowY + 9, { width: column.width - 12, align: column.align });
      cellX += column.width;
    });
  });

  colX = x;
  columns.slice(0, -1).forEach((column) => {
    colX += column.width;
    drawLine(doc, colX, y, colX, y + tableHeight, '#dbe6f3', 0.55);
  });

  return y + tableHeight + 16;
}

function taxEnabled(taxSettings = {}, config = {}) {
  if (config.showGst === false) return false;
  if (config.showGst === true) return true;
  return Boolean(taxSettings.enabled && taxSettings.showGstOnInvoices !== false);
}

function drawAmountSummary(doc, y, subtotal, taxSettings = {}, config = {}) {
  const hasGst = taxEnabled(taxSettings, config);
  const percentage = Number(taxSettings.defaultPercentage ?? 18);
  const gstAmount = hasGst ? subtotal * (percentage / 100) : 0;
  const finalTotal = subtotal + gstAmount;
  const height = hasGst ? 76 : 58;
  const x = 366;
  const width = 195;
  drawCard(doc, x, y, width, height, { fill: '#ffffff' });

  function row(label, value, rowY, bold = false) {
    doc.font(bold ? boldFont() : bodyFont()).fontSize(bold ? 9.5 : 8.5).fillColor(bold ? NAVY_DARK : MUTED)
      .text(label, x + 14, rowY, { width: 82 });
    doc.font(bold ? boldFont() : bodyFont()).fontSize(bold ? 9.5 : 8.5).fillColor(bold ? NAVY_DARK : TEXT)
      .text(value, x + 100, rowY, { width: 78, align: 'right' });
  }

  row('Sub Total:', money(subtotal), y + 14);
  if (hasGst) row(`${taxSettings.taxLabel || 'GST'} (${percentage}%):`, money(gstAmount), y + 34);
  row('Final Total:', money(finalTotal), y + (hasGst ? 54 : 34), true);
  return { y: y + height + 4, finalTotal };
}

function quotationTerms(config = {}, context = {}) {
  const configured = renderText(config.termsAndConditions || '', context).trim();
  if (!configured || /This is not an invoice,\s*only an estimate/i.test(configured)) return DEFAULT_TERMS;
  return configured.split('\n').map((line) => line.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
}

function drawTerms(doc, y, config = {}, context = {}) {
  drawCard(doc, 34, y, 527, 112);
  doc.font(boldFont()).fontSize(10).fillColor(NAVY).text('TERMS & CONDITIONS', 50, y + 13);
  let lineY = y + 32;
  quotationTerms(config, context).slice(0, 6).forEach((term, index) => {
    doc.font(boldFont()).fontSize(7.5).fillColor(NAVY_DARK).text(`${index + 1}.`, 50, lineY, { width: 16 });
    doc.font(bodyFont()).fontSize(7.5).fillColor(TEXT).text(term, 68, lineY, { width: 470, lineGap: 1 });
    const height = Math.max(11, doc.heightOfString(term, { width: 470, lineGap: 1 }));
    lineY += height + 2;
  });
}

function drawHandshakeIcon(doc, x, y) {
  doc.save();
  doc.circle(x + 24, y + 24, 24).fillAndStroke('#dbeeff', '#b9dcff');
  doc.translate(x + 12, y + 12);
  doc.lineWidth(1.65).strokeColor(NAVY).lineCap('round').lineJoin('round');
  doc.path('M2 14 L8 8 L13 13 L9 17 Z').stroke();
  doc.path('M30 14 L24 8 L19 13 L23 17 Z').stroke();
  doc.path('M10 14 L14 10 L20 16').stroke();
  doc.path('M9 17 L13 21').stroke();
  doc.path('M14 17 L18 21').stroke();
  doc.path('M19 16 L23 20').stroke();
  doc.restore();
}

function drawReadyCard(doc, y) {
  drawCard(doc, 34, y, 527, 88, { fill: LIGHT_BLUE, stroke: '#b8daf7' });
  drawHandshakeIcon(doc, 52, y + 20);
  drawLine(doc, 124, y + 15, 124, y + 73, '#b8daf7', 0.85);
  doc.font(boldFont()).fontSize(11.5).fillColor(NAVY).text('READY TO PROCEED?', 144, y + 16, { width: 385 });
  doc.font(bodyFont()).fontSize(8.7).fillColor(TEXT)
    .text('Please review this quotation carefully.', 144, y + 36, { width: 385 })
    .text('To continue with the service, tap \u201cApprove Quotation\u201d in WhatsApp.', 144, y + 50, { width: 385 })
    .text('For any questions or changes, contact us before approval.', 144, y + 64, { width: 385 });
  doc.font(boldFont()).fontSize(8.7).fillColor(NAVY_DARK)
    .text('Thank you for choosing Universal Systems.', 144, y + 77, { width: 385 });
}

function drawFooter(doc, company) {
  const currentCompany = quoteCompany(company);
  const y = 764;
  const columns = [
    ['Call / WhatsApp', currentCompany.phones.join(' / ')],
    ['Email', currentCompany.email],
    ['Website', currentCompany.website],
    ['Address', currentCompany.footerAddress]
  ];
  const x = 34;
  const width = 527 / 4;
  drawLine(doc, x, y - 9, 561, y - 9, '#d9e4f2', 0.7);
  columns.forEach(([label, value], index) => {
    const colX = x + index * width;
    doc.font(boldFont()).fontSize(7.2).fillColor(NAVY).text(label, colX + 5, y, { width: width - 10, align: 'center' });
    doc.font(bodyFont()).fontSize(7).fillColor(MUTED).text(value, colX + 5, y + 13, { width: width - 10, align: 'center', lineGap: 1 });
  });
  doc.rect(0, 812, 595.28, 30).fill(NAVY);
  doc.font(boldFont()).fontSize(8.8).fillColor('#ffffff')
    .text('We appreciate your trust in Universal Systems. We are always here to help!', 34, 823, {
      width: 527,
      align: 'center'
    });
}

export function sampleQuotationData() {
  return {
    jobReference: 'WO-2026-0123',
    quotationDate: '27-05-2026',
    quotationStatus: 'Pending Approval',
    customerName: 'Rahul Kumar',
    customerPhone: '98427 81971',
    customerAddress: '12, Mettur Main Road, Mettur Dam \u2013 636452, Salem, Tamil Nadu.',
    serviceType: 'Laptop Service',
    device: 'Laptop',
    brandModel: 'Dell Inspiron 15',
    problemComplaint: 'System running slow and needs RAM upgrade.',
    technician: 'Arjun',
    serialNumber: 'DL-INS15-2026',
    items: [
      { description: 'General Service', quantity: 1, unitPrice: 700, total: 700 },
      { description: 'RAM 4GB DDR4', quantity: 1, unitPrice: 500, total: 500 }
    ]
  };
}

function blankQuotationData() {
  return {
    jobReference: '-',
    quotationDate: '',
    quotationStatus: 'Pending Approval',
    customerName: '-',
    customerPhone: '-',
    customerAddress: '-',
    serviceType: '-',
    device: '-',
    brandModel: '-',
    problemComplaint: '-',
    technician: '',
    serialNumber: '',
    items: []
  };
}

export function renderQuotationPdf(doc, options = {}) {
  registerFonts(doc);
  if (doc.page?.margins) {
    doc.page.margins.top = 0;
    doc.page.margins.right = 0;
    doc.page.margins.bottom = 0;
    doc.page.margins.left = 0;
  }
  const company = quoteCompany(options.company);
  const template = options.template || {};
  const config = template.config || {};
  const context = options.context || {};
  const quotation = {
    ...blankQuotationData(),
    ...(options.quotation || {})
  };
  quotation.quotationDate = quotation.quotationDate || formatDate(new Date());
  quotation.items = (quotation.items || []).map((item) => ({
    description: cleanText(item.description, 'Service'),
    quantity: Number(item.quantity || item.qty || 1),
    unitPrice: Number(item.unitPrice ?? item.price ?? item.rate ?? 0),
    total: Number(item.total ?? item.amount ?? (Number(item.quantity || item.qty || 1) * Number(item.unitPrice ?? item.price ?? item.rate ?? 0)))
  }));

  const title = cleanText(renderText(config.headerTitle || 'QUOTATION', context), 'QUOTATION').toUpperCase();
  const taxSettings = options.taxSettings || {};
  const subtotal = quotation.items.reduce((sum, item) => sum + Number(item.total || 0), 0);

  doc.rect(0, 0, 595.28, 841.89).fill('#ffffff');
  drawHeader(doc, company, config);
  drawTitle(doc, title);
  drawWatermark(doc);
  drawDetailsCard(doc, quotation);
  drawServiceCard(doc, quotation, config);
  let nextY = drawItemsTable(doc, quotation);
  const summary = drawAmountSummary(doc, nextY, subtotal, taxSettings, config);
  drawTerms(doc, summary.y + 4, config, context);
  drawReadyCard(doc, 664);
  drawFooter(doc, company);
  return { subtotal, finalTotal: summary.finalTotal };
}
