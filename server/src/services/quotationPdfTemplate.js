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
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const FINAL_SECTIONS_BOTTOM = 752;

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
  } else if (type === 'calendar') {
    doc.roundedRect(x + 1.5, y + 3, 13.5, 12, 1.5).stroke();
    doc.moveTo(x + 1.5, y + 6.5).lineTo(x + 15, y + 6.5).stroke();
    doc.moveTo(x + 5, y + 1.5).lineTo(x + 5, y + 4.5).stroke();
    doc.moveTo(x + 11.5, y + 1.5).lineTo(x + 11.5, y + 4.5).stroke();
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

function drawDetailsCard(doc, quotation, config = {}) {
  const quotationDetails = cfgSection(config, 'quotationDetails');
  const customerDetails = cfgSection(config, 'customerDetails');
  drawCard(doc, 34, 158, 527, 80);
  let leftY = 176;
  if (visibleFlag(quotationDetails, 'showJobReference')) {
    drawKeyValue(doc, 'Job Reference', quotation.jobReference, 50, leftY, 226);
    leftY += 21;
  }
  if (visibleFlag(quotationDetails, 'showQuotationDate')) {
    drawKeyValue(doc, 'Quotation Date', quotation.quotationDate, 50, leftY, 226);
    leftY += 21;
  }
  if (visibleFlag(quotationDetails, 'showQuotationStatus')) {
    drawKeyValue(doc, 'Quotation Status', quotation.quotationStatus, 50, leftY, 226);
  }

  let rightY = 176;
  if (visibleFlag(customerDetails, 'showCustomerName')) {
    drawKeyValue(doc, 'Customer Name', quotation.customerName, 312, rightY, 226, { labelWidth: 93 });
    rightY += 21;
  }
  if (visibleFlag(customerDetails, 'showPhoneNumber')) {
    drawKeyValue(doc, 'Phone Number', quotation.customerPhone, 312, rightY, 226, { labelWidth: 93 });
    rightY += 21;
  }
  if (visibleFlag(customerDetails, 'showAddress')) {
    drawKeyValue(doc, 'Address', quotation.customerAddress, 312, rightY, 226, { labelWidth: 58, fontSize: 8.1 });
  }
}

function optionalRows(quotation, config) {
  const service = cfgSection(config, 'serviceDeviceDetails');
  const rows = [];
  if (visibleFlag(service, 'showTechnician') && quotation.technician) {
    rows.push(['Technician', quotation.technician]);
  }
  if (service.showSerialNumber === true && quotation.serialNumber) {
    rows.push(['Serial Number', quotation.serialNumber]);
  }
  return rows;
}

function drawServiceCard(doc, quotation, config = {}) {
  const rows = optionalRows(quotation, config);
  const service = cfgSection(config, 'serviceDeviceDetails');
  const problem = cfgSection(config, 'problemComplaint');
  drawCard(doc, 34, 252, 527, rows.length > 1 ? 114 : 98);
  doc.font(boldFont()).fontSize(10).fillColor(NAVY).text('SERVICE / PRODUCT DETAILS', 50, 268);
  let leftY = 292;
  if (visibleFlag(service, 'showServiceType')) {
    drawKeyValue(doc, 'Service Type', quotation.serviceType, 50, leftY, 222, { labelWidth: 82 });
    leftY += 21;
  }
  if (visibleFlag(service, 'showDevice')) {
    drawKeyValue(doc, 'Device', quotation.device, 50, leftY, 222, { labelWidth: 82 });
    leftY += 21;
  }
  if (visibleFlag(service, 'showBrandModel')) {
    drawKeyValue(doc, 'Brand / Model', quotation.brandModel, 50, leftY, 222, { labelWidth: 82 });
  }

  if (problem.show !== false) {
    doc.font(boldFont()).fontSize(8.4).fillColor(NAVY_DARK)
      .text(`${cleanText(problem.label, 'Problem / Complaint')}:`, 314, 292, { width: 118, lineBreak: false });
    doc.font(bodyFont()).fontSize(8.4).fillColor(TEXT)
      .text(cleanText(quotation.problemComplaint), 314, 311, { width: 220, height: 22, lineGap: 1 });
  }

  rows.forEach(([label, value], index) => {
    drawKeyValue(doc, label, value, 314, 334 + index * 17, 220, { labelWidth: 78 });
  });
}

function quotationColumns(config = {}) {
  const table = cfgSection(config, 'itemTable');
  const columns = [
    { key: 'sno', label: cfgLabel(config, 'sno', 'S.No'), weight: 42, align: 'center', show: visibleFlag(table, 'showSno') },
    { key: 'description', label: cfgLabel(config, 'description', 'Description'), weight: 234, align: 'left', show: true },
    { key: 'quantity', label: cfgLabel(config, 'quantity', 'Qty'), weight: 48, align: 'center', show: visibleFlag(table, 'showQuantity') },
    { key: 'unitPrice', label: cfgLabel(config, 'unitPrice', 'Unit Price (\u20b9)'), weight: 101, align: 'right', show: visibleFlag(table, 'showUnitPrice') },
    { key: 'tax', label: cfgLabel(config, 'tax', 'Tax (\u20b9)'), weight: 70, align: 'right', show: table.showTaxColumn === true },
    { key: 'total', label: cfgLabel(config, 'total', 'Total (\u20b9)'), weight: 102, align: 'right', show: visibleFlag(table, 'showTotal') }
  ].filter((column) => column.show);
  const tableWidth = 527;
  const totalWeight = columns.reduce((sum, column) => sum + column.weight, 0) || 1;
  let used = 0;
  return columns.map((column, index) => {
    const width = index === columns.length - 1 ? tableWidth - used : Math.round((column.weight / totalWeight) * tableWidth);
    used += width;
    return { ...column, width };
  });
}

function drawQuotationTableHeader(doc, x, y, columns) {
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const headerHeight = 24;
  let colX = x;
  doc.roundedRect(x, y, tableWidth, headerHeight, 6).fill(NAVY);
  doc.rect(x, y + 12, tableWidth, 12).fill(NAVY);
  doc.font(boldFont()).fontSize(8.3).fillColor('#ffffff');
  columns.forEach((column) => {
    doc.text(column.label, colX + 6, y + 8, { width: column.width - 12, align: column.align });
    colX += column.width;
  });
  colX = x;
  columns.slice(0, -1).forEach((column) => {
    colX += column.width;
    drawLine(doc, colX, y, colX, y + headerHeight, '#ffffff', 0.45);
  });
  return y + headerHeight;
}

function drawQuotationContinuationPage(doc, title, company, config) {
  doc.addPage({ size: 'A4', margin: 0 });
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill('#ffffff');
  drawWatermark(doc);
  doc.font(boldFont()).fontSize(12).fillColor(NAVY).text(quoteCompany(company).name, 34, 27, { width: 170 });
  doc.font(boldFont()).fontSize(15).fillColor(NAVY).text(`${title} (CONTINUED)`, 205, 25, { width: 185, align: 'center' });
  if (config.showCompanyDetails !== false) {
    doc.font(bodyFont()).fontSize(8).fillColor(MUTED).text(`${QUOTATION_COMPANY.phones.join(' / ')} | ${QUOTATION_COMPANY.email}`, 377, 29, { width: 180, align: 'right' });
  }
  drawLine(doc, 34, 52, 561, 52, NAVY, 0.7);
  return 68;
}

function quotationRowHeight(doc, item, columns) {
  const descriptionColumn = columns.find((column) => column.key === 'description');
  const descriptionWidth = Math.max(150, (descriptionColumn?.width || 234) - 12);
  doc.font(bodyFont()).fontSize(8.5);
  return Math.max(28, doc.heightOfString(cleanText(item.description, 'Service'), { width: descriptionWidth, lineGap: 1 }) + 16);
}

function drawQuotationGridLines(doc, x, tableTop, y, columns) {
  let colX = x;
  columns.slice(0, -1).forEach((column) => {
    colX += column.width;
    drawLine(doc, colX, tableTop, colX, y, '#dbe6f3', 0.55);
  });
  drawLine(doc, x, y, x + columns.reduce((sum, column) => sum + column.width, 0), y, BORDER, 0.65);
}

function drawItemsTable(doc, quotation, title, company, config = {}) {
  const x = 34;
  let y = 370;
  const columns = quotationColumns(config);
  const tableWidth = columns.reduce((sum, column) => sum + column.width, 0);
  const headerHeight = 24;
  const rows = quotation.items.length ? quotation.items : [{ description: 'Service', quantity: 1, unitPrice: 0, total: 0 }];
  const finalSectionsHeight = 292;
  const pageLimit = 778;
  let index = 0;
  let tableTop = y;
  let pageBreaks = 0;
  y = drawQuotationTableHeader(doc, x, y, columns);
  doc.roundedRect(x, tableTop, tableWidth, headerHeight, 6).strokeColor(BORDER).lineWidth(0.65).stroke();

  while (index < rows.length) {
    const height = quotationRowHeight(doc, rows[index], columns);
    const remainingRowsHeight = rows.slice(index).reduce((sum, row) => sum + quotationRowHeight(doc, row, columns), 0);
    const canFinishHere = remainingRowsHeight + finalSectionsHeight <= pageLimit - y;
    if (!canFinishHere && y + height > pageLimit) {
      drawQuotationGridLines(doc, x, tableTop, y, columns);
      pageBreaks += 1;
      y = drawQuotationContinuationPage(doc, title, company, config);
      tableTop = y;
      y = drawQuotationTableHeader(doc, x, y, columns);
      doc.roundedRect(x, tableTop, tableWidth, headerHeight, 6).strokeColor(BORDER).lineWidth(0.65).stroke();
      continue;
    }
    const item = rows[index];
    const rowY = y;
    if (index % 2 === 1) doc.rect(x, rowY, tableWidth, height).fill('#f8fbff');
    drawLine(doc, x, rowY, x + tableWidth, rowY, '#dbe6f3', 0.55);
    let cellX = x;
    doc.font(bodyFont()).fontSize(8.5).fillColor(TEXT);
    const values = {
      sno: String(index + 1),
      description: cleanText(item.description, 'Service'),
      quantity: String(item.quantity || 1),
      unitPrice: Number(item.unitPrice || 0).toFixed(2),
      tax: Number(item.tax || 0).toFixed(2),
      total: Number(item.total || 0).toFixed(2)
    };
    columns.forEach((column) => {
      const value = values[column.key] || '';
      doc.text(value, cellX + 6, rowY + 9, { width: column.width - 12, align: column.align, lineGap: 1 });
      cellX += column.width;
    });
    y += height;
    index += 1;
  }

  drawQuotationGridLines(doc, x, tableTop, y, columns);

  return { y: y + 16, pageBreaks };
}

function taxEnabled(taxSettings = {}, config = {}) {
  if (config.showGst === false) return false;
  if (config.showGst === true) return true;
  return Boolean(taxSettings.enabled && taxSettings.showGstOnInvoices !== false);
}

function drawAmountSummary(doc, y, subtotal, taxSettings = {}, config = {}) {
  const totalSummary = cfgSection(config, 'totalSummary');
  if (totalSummary.show === false) return { y, finalTotal: subtotal };
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

  let rowY = y + 14;
  if (visibleFlag(totalSummary, 'showSubtotal')) {
    row('Sub Total:', money(subtotal), rowY);
    rowY += 20;
  }
  if (hasGst && visibleFlag(totalSummary, 'showTax')) {
    row(`${taxSettings.taxLabel || 'GST'} (${percentage}%):`, money(gstAmount), rowY);
    rowY += 20;
  }
  if (visibleFlag(totalSummary, 'showFinalTotal')) row('Final Total:', money(finalTotal), rowY, true);
  return { y: y + height + 4, finalTotal };
}

function drawValidityNote(doc, y, config = {}) {
  const validity = cfgSection(config, 'validityNote');
  const text = cleanText(validity.text, 'This quotation is valid for 7 days from the quotation date.');
  if (validity.show === false || !text) return 0;
  drawCard(doc, 34, y, 318, 38, { fill: LIGHT_BLUE, stroke: '#b8daf7' });
  drawHeaderIcon(doc, 'calendar', 51, y + 10, NAVY);
  doc.font(boldFont()).fontSize(8.5).fillColor(NAVY).text('VALIDITY NOTE', 78, y + 8, { width: 120 });
  doc.font(bodyFont()).fontSize(7.8).fillColor(TEXT).text(text, 78, y + 21, { width: 245, lineGap: 1 });
  return 42;
}

function quotationTerms(config = {}, context = {}) {
  const terms = cfgSection(config, 'terms');
  const configured = renderText(terms.text || config.termsAndConditions || '', context).trim();
  if (!configured || /This is not an invoice,\s*only an estimate/i.test(configured)) return DEFAULT_TERMS;
  return configured.split('\n').map((line) => line.replace(/^\d+\.\s*/, '').trim()).filter(Boolean);
}

function drawTerms(doc, y, config = {}, context = {}) {
  const terms = cfgSection(config, 'terms');
  if (terms.show === false) return 0;
  drawCard(doc, 34, y, 527, 112);
  doc.font(boldFont()).fontSize(10).fillColor(NAVY).text(cleanText(terms.title, 'TERMS & CONDITIONS'), 50, y + 13);
  let lineY = y + 32;
  quotationTerms(config, context).slice(0, 6).forEach((term, index) => {
    doc.font(boldFont()).fontSize(7.5).fillColor(NAVY_DARK).text(`${index + 1}.`, 50, lineY, { width: 16 });
    doc.font(bodyFont()).fontSize(7.5).fillColor(TEXT).text(term, 68, lineY, { width: 470, lineGap: 1 });
    const height = Math.max(11, doc.heightOfString(term, { width: 470, lineGap: 1 }));
    lineY += height + 2;
  });
  return 112;
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

function drawReadyCard(doc, y, config = {}) {
  const approval = cfgSection(config, 'whatsappApprovalMessage');
  if (approval.show === false) return 0;
  const lines = cfgList(approval.messageLines, [
    'Please review this quotation carefully.',
    'To continue with the service, tap "Approve Quotation" in WhatsApp.',
    'For any questions or changes, contact us before approval.'
  ]);
  drawCard(doc, 34, y, 527, 88, { fill: LIGHT_BLUE, stroke: '#b8daf7' });
  drawHandshakeIcon(doc, 52, y + 20);
  drawLine(doc, 124, y + 15, 124, y + 73, '#b8daf7', 0.85);
  doc.font(boldFont()).fontSize(11.5).fillColor(NAVY).text(cleanText(approval.title, 'READY TO PROCEED?'), 144, y + 16, { width: 385 });
  let lineY = y + 36;
  doc.font(bodyFont()).fontSize(8.7).fillColor(TEXT);
  lines.slice(0, 3).forEach((line) => {
    doc.text(line, 144, lineY, { width: 385 });
    lineY += 14;
  });
  doc.font(boldFont()).fontSize(8.7).fillColor(NAVY_DARK)
    .text('Thank you for choosing Universal Systems.', 144, y + 77, { width: 385 });
  return 88;
}

function drawFooter(doc, company, config = {}) {
  const currentCompany = quoteCompany(company);
  const footer = config.footer || {};
  const y = 764;
  const columns = [
    footer.showCallWhatsapp !== false ? ['Call / WhatsApp', currentCompany.phones.join(' / ')] : null,
    footer.showEmail !== false ? ['Email', currentCompany.email] : null,
    footer.showWebsite !== false ? ['Website', currentCompany.website] : null,
    footer.showAddress !== false ? ['Address', currentCompany.footerAddress] : null
  ].filter(Boolean);
  if (!columns.length) return;
  const x = 34;
  const width = 527 / columns.length;
  drawLine(doc, x, y - 9, 561, y - 9, '#d9e4f2', 0.7);
  columns.forEach(([label, value], index) => {
    const colX = x + index * width;
    doc.font(boldFont()).fontSize(7.2).fillColor(NAVY).text(label, colX + 5, y, { width: width - 10, align: 'center' });
    doc.font(bodyFont()).fontSize(7).fillColor(MUTED).text(value, colX + 5, y + 13, { width: width - 10, align: 'center', lineGap: 1 });
  });
  doc.rect(0, 812, 595.28, 30).fill(NAVY);
  doc.font(boldFont()).fontSize(8.8).fillColor('#ffffff')
    .text(cleanText(footer.thankYouMessage || config.footerText, 'We appreciate your trust in Universal Systems. We are always here to help!'), 34, 823, {
      width: 527,
      align: 'center'
    });
}

function quotationFinalSectionsHeight(taxSettings = {}, config = {}) {
  let height = 4;
  if (cfgSection(config, 'totalSummary').show !== false) height += (taxEnabled(taxSettings, config) ? 80 : 62);
  if (cfgSection(config, 'validityNote').show !== false) height += 46;
  if (cfgSection(config, 'terms').show !== false) height += 120;
  if (cfgSection(config, 'whatsappApprovalMessage').show !== false) height += 88;
  return height;
}

function ensureQuotationFinalStart(doc, y, title, company, config = {}, taxSettings = {}) {
  if (y + quotationFinalSectionsHeight(taxSettings, config) <= FINAL_SECTIONS_BOTTOM) return y;
  return drawQuotationContinuationPage(doc, title, company, config);
}

function drawQuotationFinalSections(doc, y, subtotal, taxSettings, config, context) {
  const summary = drawAmountSummary(doc, y, subtotal, taxSettings, config);
  let cursor = summary.y + 4;
  const validityHeight = drawValidityNote(doc, cursor, config);
  if (validityHeight) cursor += validityHeight + 4;
  const termsHeight = drawTerms(doc, cursor, config, context);
  if (termsHeight) cursor += termsHeight + 8;
  drawReadyCard(doc, cursor, config);
  return summary;
}

function drawPageNumbers(doc, config = {}) {
  if (config.pageBreaks?.showPageNumbers === false) return;
  try {
    const range = doc.bufferedPageRange();
    for (let pageIndex = range.start; pageIndex < range.start + range.count; pageIndex += 1) {
      doc.switchToPage(pageIndex);
      doc.font(bodyFont()).fontSize(7.5).fillColor(MUTED)
        .text(`Page ${pageIndex - range.start + 1} of ${range.count}`, 491, 57, { width: 70, align: 'right' });
    }
  } catch {
    // Page numbers require buffered pages.
  }
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

  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill('#ffffff');
  drawHeader(doc, company, config);
  drawTitle(doc, title);
  drawWatermark(doc);
  drawDetailsCard(doc, quotation, config);
  drawServiceCard(doc, quotation, config);
  const table = drawItemsTable(doc, quotation, title, company, config);
  const nextY = ensureQuotationFinalStart(doc, table.y, title, company, config, taxSettings);
  const summary = drawQuotationFinalSections(doc, nextY, subtotal, taxSettings, config, context);
  drawFooter(doc, company, config);
  drawPageNumbers(doc, config);
  return { subtotal, finalTotal: summary.finalTotal };
}
