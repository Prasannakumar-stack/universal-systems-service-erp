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
const LIGHT_GREEN = '#f3fffb';
const GREEN = '#08785f';
const GREEN_BORDER = '#78c2aa';
const ORANGE = '#c26b1d';
const ORANGE_LIGHT = '#fff7ed';
const ORANGE_BORDER = '#f0bd84';
const BORDER = '#103a8a';
const SOFT_BORDER = '#d8e5f7';

const AMC_COMPANY = {
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

function cfgSection(config = {}, key = '') {
  return config.sections?.[key] || {};
}

function visibleFlag(source = {}, key = 'show', fallback = true) {
  return source[key] !== undefined ? source[key] !== false : fallback;
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

function amcCompany(company = {}) {
  return {
    ...AMC_COMPANY,
    name: company.name || AMC_COMPANY.name,
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
  } else if (type === 'phone' || type === 'whatsapp') {
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
  const currentCompany = amcCompany(company);
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

function drawTitle(doc, title, y = 140) {
  const longTitle = title.length > 16;
  const leftLine = longTitle ? [78, 159] : [112, 221];
  const rightLine = longTitle ? [436, 517] : [374, 483];
  const textX = longTitle ? 160 : 218;
  const textWidth = longTitle ? 276 : 158;
  drawLine(doc, leftLine[0], y, leftLine[1], y, NAVY, 1.1);
  drawLine(doc, rightLine[0], y, rightLine[1], y, NAVY, 1.1);
  doc.circle(leftLine[1], y, 3.6).fillColor(NAVY).fill();
  doc.circle(rightLine[0], y, 3.6).fillColor(NAVY).fill();
  doc.font(boldFont()).fontSize(longTitle ? 18 : 22).fillColor(NAVY).text(title, textX, y - 12, {
    width: textWidth,
    align: 'center'
  });
}

function drawWatermark(doc) {
  if (!fs.existsSync(LOGO_ICON_PATH)) return;
  doc.save();
  doc.opacity(0.06);
  doc.image(LOGO_ICON_PATH, 66, 236, { width: 465 });
  doc.restore();
}

function drawPageBase(doc, title, company, config) {
  registerFonts(doc);
  if (doc.page?.margins) {
    doc.page.margins.top = 0;
    doc.page.margins.right = 0;
    doc.page.margins.bottom = 0;
    doc.page.margins.left = 0;
  }
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill('#ffffff');
  drawHeader(doc, company, config);
  drawTitle(doc, title);
  drawWatermark(doc);
}

function drawKeyValue(doc, label, value, x, y, options = {}) {
  const labelWidth = options.labelWidth || 96;
  const colonX = x + labelWidth + 5;
  doc.font(boldFont()).fontSize(options.fontSize || 8.55).fillColor(TEXT)
    .text(label, x, y, { width: labelWidth });
  doc.text(':', colonX, y, { width: 8, align: 'center' });
  doc.font(options.boldValue === false ? bodyFont() : boldFont()).fontSize(options.fontSize || 8.55)
    .fillColor(options.valueColor || NAVY)
    .text(cleanText(value), colonX + 16, y, { width: options.valueWidth || 112, lineGap: 1.5 });
}

function drawTwoColumnDetails(doc, y, height, leftRows, rightRows) {
  drawCard(doc, PAGE_X, y, CONTENT_WIDTH, height);
  drawLine(doc, 304, y + 11, 304, y + height - 11, '#9bb4df', 0.75);
  leftRows.forEach((row, index) => {
    drawKeyValue(doc, row.label, row.value, 48, y + 19 + index * 19, {
      labelWidth: 102,
      valueWidth: 122,
      valueColor: row.valueColor || NAVY
    });
  });
  rightRows.forEach((row, index) => {
    drawKeyValue(doc, row.label, row.value, 326, y + 19 + index * 20, {
      labelWidth: 92,
      valueWidth: 116,
      valueColor: row.valueColor || NAVY,
      boldValue: index < 2
    });
  });
}

function includeRow(section, flag, row) {
  return visibleFlag(section, flag) ? [row] : [];
}

function drawSectionHeaderCard(doc, y, height, title, leftRows, rightRows) {
  doc.roundedRect(PAGE_X + 0.5, y + 0.5, CONTENT_WIDTH - 1, 24, 6).fill(LIGHT_BLUE);
  doc.rect(PAGE_X + 0.5, y + 13, CONTENT_WIDTH - 1, 11.5).fill(LIGHT_BLUE);
  drawCard(doc, PAGE_X, y, CONTENT_WIDTH, height);
  doc.font(boldFont()).fontSize(10.3).fillColor(NAVY).text(title, 43, y + 9, { width: 180 });
  drawLine(doc, 304, y + 32, 304, y + height - 11, '#9bb4df', 0.75);
  leftRows.forEach((row, index) => {
    drawKeyValue(doc, row.label, row.value, 48, y + 41 + index * 22, {
      labelWidth: row.labelWidth || 92,
      valueWidth: 130,
      boldValue: false
    });
  });
  rightRows.forEach((row, index) => {
    drawKeyValue(doc, row.label, row.value, 326, y + 41 + index * 22, {
      labelWidth: row.labelWidth || 82,
      valueWidth: 124,
      boldValue: false
    });
  });
}

function drawTable(doc, x, y, width, columns, rows, options = {}) {
  const title = options.title || '';
  if (title) doc.font(boldFont()).fontSize(10).fillColor(NAVY).text(title, x, y, { width });
  const tableY = title ? y + 16 : y;
  const headerHeight = options.headerHeight || 23;
  const rowHeight = options.rowHeight || 23;
  const totalHeight = headerHeight + rows.length * rowHeight;
  doc.roundedRect(x, tableY, width, totalHeight, 6).strokeColor(BORDER).lineWidth(0.7).stroke();
  doc.roundedRect(x, tableY, width, headerHeight, 6).fill(NAVY);
  doc.rect(x, tableY + 12, width, headerHeight - 12).fill(NAVY);
  let colX = x;
  doc.font(boldFont()).fontSize(options.headerFontSize || 7.8).fillColor('#ffffff');
  columns.forEach((column) => {
    doc.text(column.label, colX + 4, tableY + 7, { width: column.width - 8, align: column.align || 'left' });
    colX += column.width;
  });
  rows.forEach((row, index) => {
    const rowY = tableY + headerHeight + index * rowHeight;
    if (index % 2 === 1) doc.rect(x, rowY, width, rowHeight).fill('#f9fbff');
    drawLine(doc, x, rowY, x + width, rowY, '#cad8f0', 0.5);
    colX = x;
    doc.font(bodyFont()).fontSize(options.fontSize || 7.4).fillColor(TEXT);
    columns.forEach((column) => {
      const value = row[column.key] ?? '';
      if (column.statusCheck && value) {
        drawCheckDot(doc, colX + 12, rowY + 7, GREEN);
        doc.font(boldFont()).fontSize(options.fontSize || 7.4).fillColor(GREEN)
          .text(value, colX + 24, rowY + 7, { width: column.width - 30, align: column.align || 'left' });
      } else {
        doc.text(String(value), colX + 4, rowY + 7, {
          width: column.width - 8,
          align: column.align || 'left',
          lineGap: 0.5
        });
      }
      colX += column.width;
    });
  });
  colX = x;
  columns.slice(0, -1).forEach((column) => {
    colX += column.width;
    drawLine(doc, colX, tableY, colX, tableY + totalHeight, '#cad8f0', 0.5);
  });
  return tableY + totalHeight;
}

function drawCheckDot(doc, x, y, color = GREEN) {
  doc.save();
  doc.circle(x + 4, y + 4, 4).fillColor(color).fill();
  doc.strokeColor('#ffffff').lineWidth(1.05).lineCap('round').lineJoin('round')
    .moveTo(x + 2.2, y + 4).lineTo(x + 3.8, y + 5.8).lineTo(x + 6.4, y + 2.4).stroke();
  doc.restore();
}

function drawCrossDot(doc, x, y, color = ORANGE) {
  doc.save();
  doc.circle(x + 4, y + 4, 4).fillColor(color).fill();
  doc.strokeColor('#ffffff').lineWidth(1).lineCap('round')
    .moveTo(x + 2.3, y + 2.3).lineTo(x + 5.7, y + 5.7)
    .moveTo(x + 5.7, y + 2.3).lineTo(x + 2.3, y + 5.7).stroke();
  doc.restore();
}

function drawShieldIcon(doc, x, y, color = GREEN) {
  doc.save();
  doc.circle(x + 17, y + 17, 17).fill('#e5f6ef');
  doc.path(`M${x + 17} ${y + 6} L${x + 27} ${y + 10} L${x + 24} ${y + 23} L${x + 17} ${y + 29} L${x + 10} ${y + 23} L${x + 7} ${y + 10} Z`)
    .fillAndStroke('#ffffff', color);
  doc.strokeColor(color).lineWidth(1.7).lineCap('round').moveTo(x + 12, y + 18).lineTo(x + 16, y + 22).lineTo(x + 23, y + 13).stroke();
  doc.restore();
}

function drawWarningIcon(doc, x, y) {
  doc.save();
  doc.circle(x + 17, y + 17, 17).fill('#fff0df');
  doc.strokeColor(ORANGE).fillColor('#ffffff').lineWidth(1.3);
  doc.path(`M${x + 17} ${y + 6} L${x + 29} ${y + 28} L${x + 5} ${y + 28} Z`).fillAndStroke('#ffffff', ORANGE);
  doc.font(boldFont()).fontSize(14).fillColor(ORANGE).text('!', x + 14, y + 13, { width: 6, align: 'center' });
  doc.restore();
}

function drawDocumentIcon(doc, x, y, color = NAVY) {
  doc.save();
  doc.circle(x + 17, y + 17, 17).strokeColor(color).lineWidth(0.8).stroke();
  doc.roundedRect(x + 11, y + 8, 13, 18, 1.1).strokeColor(color).lineWidth(1.3).stroke();
  doc.moveTo(x + 14, y + 14).lineTo(x + 21, y + 14).moveTo(x + 14, y + 18).lineTo(x + 21, y + 18).moveTo(x + 14, y + 22).lineTo(x + 19, y + 22).stroke();
  doc.restore();
}

function drawCalendarIcon(doc, x, y, color = GREEN) {
  doc.save();
  doc.circle(x + 17, y + 17, 17).fill('#e8f8f0');
  doc.roundedRect(x + 8, y + 10, 18, 16, 2).strokeColor(color).lineWidth(1.3).stroke();
  doc.moveTo(x + 8, y + 15).lineTo(x + 26, y + 15).stroke();
  doc.moveTo(x + 12, y + 7).lineTo(x + 12, y + 12).moveTo(x + 22, y + 7).lineTo(x + 22, y + 12).stroke();
  doc.strokeColor(color).lineWidth(1.5).moveTo(x + 12, y + 21).lineTo(x + 15, y + 24).lineTo(x + 22, y + 18).stroke();
  doc.restore();
}

function drawRupeeIcon(doc, x, y, color = NAVY) {
  doc.save();
  doc.circle(x + 18, y + 18, 18).strokeColor(color).lineWidth(1.5).stroke();
  doc.font(boldFont()).fontSize(21).fillColor(color).text('\u20b9', x + 10, y + 6, { width: 17, align: 'center' });
  doc.restore();
}

function drawPaymentIcon(doc, x, y, color = NAVY) {
  doc.save();
  doc.circle(x + 18, y + 18, 18).strokeColor(color).lineWidth(1.3).stroke();
  doc.roundedRect(x + 8, y + 12, 21, 14, 2).strokeColor(color).lineWidth(1.3).stroke();
  doc.moveTo(x + 8, y + 16).lineTo(x + 29, y + 16).stroke();
  doc.moveTo(x + 12, y + 22).lineTo(x + 19, y + 22).stroke();
  doc.restore();
}

function drawBellIcon(doc, x, y) {
  doc.save();
  doc.circle(x + 18, y + 18, 18).fill('#fff0df');
  doc.strokeColor(ORANGE).lineWidth(1.4).lineCap('round').lineJoin('round');
  doc.path(`M${x + 10} ${y + 23} C${x + 13} ${y + 21} ${x + 13} ${y + 16} ${x + 13} ${y + 14} C${x + 13} ${y + 9} ${x + 23} ${y + 9} ${x + 23} ${y + 14} C${x + 23} ${y + 16} ${x + 23} ${y + 21} ${x + 26} ${y + 23} Z`).stroke();
  doc.moveTo(x + 16, y + 26).lineTo(x + 20, y + 26).stroke();
  doc.restore();
}

function drawHeadsetIcon(doc, x, y) {
  doc.save();
  doc.circle(x + 22, y + 22, 22).fill('#e1efff');
  doc.strokeColor(NAVY).lineWidth(1.5).lineCap('round').lineJoin('round');
  doc.path(`M${x + 11} ${y + 23} C${x + 11} ${y + 9} ${x + 33} ${y + 9} ${x + 33} ${y + 23}`).stroke();
  doc.roundedRect(x + 8, y + 22, 6, 9, 2).stroke();
  doc.roundedRect(x + 30, y + 22, 6, 9, 2).stroke();
  doc.moveTo(x + 31, y + 31).lineTo(x + 25, y + 35).lineTo(x + 21, y + 35).stroke();
  doc.restore();
}

function drawInfoListCard(doc, x, y, width, height, title, iconType, items, options = {}) {
  drawCard(doc, x, y, width, height, { fill: '#ffffff', stroke: options.stroke || BORDER });
  if (iconType === 'shield') drawShieldIcon(doc, x + 12, y + 11, options.iconColor || GREEN);
  if (iconType === 'warning') drawWarningIcon(doc, x + 12, y + 11);
  if (iconType === 'document') drawDocumentIcon(doc, x + 12, y + 11, options.iconColor || NAVY);
  if (iconType === 'calendar') drawCalendarIcon(doc, x + 12, y + 11, options.iconColor || GREEN);
  doc.font(boldFont()).fontSize(9.3).fillColor(options.titleColor || NAVY).text(title, x + 54, y + 12, { width: width - 66 });
  let lineY = y + 33;
  items.forEach((item, index) => {
    if (options.numbered) {
      doc.font(boldFont()).fontSize(7.1).fillColor(TEXT).text(`${index + 1}.`, x + 16, lineY, { width: 14 });
      doc.font(bodyFont()).fontSize(7.1).fillColor(TEXT).text(item, x + 32, lineY, { width: width - 45, lineGap: 0.5 });
    } else {
      if (options.cross) drawCrossDot(doc, x + 18, lineY + 0.5, ORANGE);
      else drawCheckDot(doc, x + 18, lineY + 0.5, options.iconColor || GREEN);
      doc.font(bodyFont()).fontSize(7.1).fillColor(TEXT).text(item, x + 34, lineY, { width: width - 45, lineGap: 0.5 });
    }
    lineY += options.lineStep || 13;
  });
}

function drawTermsCard(doc, y, items) {
  drawCard(doc, PAGE_X, y, CONTENT_WIDTH, 70);
  drawDocumentIcon(doc, 51, y + 16);
  drawLine(doc, 105, y + 12, 105, y + 58, NAVY, 0.8);
  doc.font(boldFont()).fontSize(9.5).fillColor(NAVY).text('TERMS & CONDITIONS', 128, y + 11, { width: 210 });
  let lineY = y + 29;
  items.forEach((item, index) => {
    doc.font(boldFont()).fontSize(6.8).fillColor(TEXT).text(`${index + 1}.`, 128, lineY, { width: 14 });
    doc.font(bodyFont()).fontSize(6.8).fillColor(TEXT).text(item, 144, lineY, { width: 390, lineGap: 0.3 });
    lineY += 8.7;
  });
}

function drawFooterContacts(doc, y, company, config = {}) {
  const currentCompany = amcCompany(company);
  const footer = config.footer || {};
  const columns = [
    footer.showCallWhatsapp !== false ? ['phone', 'Call / WhatsApp', currentCompany.phones.join(' / ')] : null,
    footer.showEmail !== false ? ['email', 'Email', currentCompany.email] : null,
    footer.showWebsite !== false ? ['website', 'Website', currentCompany.website] : null,
    footer.showAddress !== false ? ['address', 'Address', currentCompany.footerAddressLines.join('\n')] : null
  ].filter(Boolean);
  if (!columns.length) return;
  const columnWidth = CONTENT_WIDTH / columns.length;
  columns.forEach(([icon, label, value], index) => {
    const x = PAGE_X + index * columnWidth;
    if (index > 0) drawLine(doc, x, y + 2, x, y + 29, NAVY, 0.65);
    drawHeaderIcon(doc, icon, x + 10, y + 5, NAVY);
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

function drawBottomStrip(doc, text) {
  doc.roundedRect(PAGE_X, 813, CONTENT_WIDTH, 24, 4).fill(NAVY);
  drawHandshakeIcon(doc, 73, 814);
  drawLine(doc, 124, 818, 124, 833, '#ffffff', 0.6);
  doc.font(boldFont()).fontSize(9.3).fillColor('#ffffff').text(text, 142, 821, {
    width: 345,
    align: 'center'
  });
  drawLine(doc, 494, 826, 532, 826, '#ffffff', 0.6);
  doc.circle(533, 826, 2.6).fillColor('#ffffff').fill();
}

function drawFooter(doc, company, stripText, config = {}) {
  drawFooterContacts(doc, 770, company, config);
  drawBottomStrip(doc, cleanText(config.footer?.thankYouMessage || stripText, stripText));
}

function drawSignatureLine(doc, y, config = {}) {
  const signature = cfgSection(config, 'signature');
  if (signature.show === false) return;
  const label = cleanText(signature.label || config.signatureSection, '');
  if (!label) return;
  doc.strokeColor('#94a3b8').lineWidth(0.7).moveTo(384, y).lineTo(540, y).stroke();
  doc.font(bodyFont()).fontSize(8.2).fillColor(MUTED).text(label, 384, y + 8, { width: 156, align: 'center' });
}

function contractTerms() {
  return [
    'AMC coverage is valid only during the mentioned contract period.',
    'AMC service will be provided only for the covered products/services mentioned in this contract.',
    'Renewal is required before the expiry date to continue AMC coverage.',
    'Any additional parts, products, or services outside AMC scope will be charged separately.',
    'Warranty, if applicable, is subject to company/manufacturer policy.'
  ];
}

function termsFromConfig(config = {}, fallback = []) {
  const text = cfgSection(config, 'amcTerms').text || config.amcTerms || config.termsAndConditions || '';
  const rows = String(text || '').split('\n')
    .map((line) => line.replace(/^[-*\u2022]?\s*\d*\.?\s*/, '').trim())
    .filter(Boolean);
  return rows.length ? rows.slice(0, 5) : fallback;
}

export function sampleAmcContractData() {
  return {
    amcReference: 'AMC-2026-0012',
    contractDate: '29-05-2026',
    amcPeriod: '29-05-2026 to 29-05-2027',
    status: 'Active',
    customerName: 'Rahul Kumar',
    customerPhone: '98427 81971',
    customerAddress: '12, Mettur Main Road,\nMettur Dam, Salem \u2013 636452,\nTamil Nadu, India.',
    planName: 'Computer AMC Support',
    coverageType: 'Service Support',
    coveredFor: 'Desktop / Laptop / Computer System',
    technician: 'Arjun',
    contractValue: 12500,
    paymentStatus: 'Paid',
    renewalDate: '29-05-2027',
    coveredItems: [
      { device: 'Desktop PC', brandModel: 'Dell Optiplex', quantity: 1, coverageNotes: 'General AMC support', serialNumber: 'DOP-2026-001' },
      { device: 'Laptop', brandModel: 'Dell Inspiron 15', quantity: 1, coverageNotes: 'Service support', serialNumber: 'DIN-2026-015' }
    ]
  };
}

export function sampleAmcVisitData() {
  return {
    amcReference: 'AMC-2026-0012',
    visitDate: '29-05-2026',
    visitStatus: 'Completed',
    nextVisitDate: '28-06-2026',
    jobReference: 'WO-2026-0123',
    customerName: 'Rahul Kumar',
    customerPhone: '98427 81971',
    customerAddress: '12, Mettur Main Road,\nMettur Dam, Salem \u2013 636452,\nTamil Nadu, India.',
    planName: 'Computer AMC Support',
    amcPeriod: '29-05-2026 to 29-05-2027',
    coveredFor: 'Desktop / Laptop / Computer System',
    technician: 'Arjun',
    technicianNotes: 'AMC visit completed successfully.\nNo major issue found.',
    additionalCharges: 0,
    workItems: [
      { work: 'General inspection completed', status: 'Done' },
      { work: 'System cleaning and basic checkup', status: 'Done' },
      { work: 'Performance checked', status: 'Done' },
      { work: 'Customer issue verified', status: 'Done' }
    ]
  };
}

export function sampleAmcRenewalData() {
  return {
    amcReference: 'AMC-2026-0012',
    reminderDate: '29-05-2026',
    expiryDate: '29-05-2027',
    renewalStatus: 'Renewal Due',
    customerName: 'Rahul Kumar',
    customerPhone: '98427 81971',
    customerAddress: '12, Mettur Main Road,\nMettur Dam, Salem \u2013 636452,\nTamil Nadu, India.',
    planName: 'Computer AMC Support',
    currentPeriod: '29-05-2026 to 29-05-2027',
    renewalPeriod: '29-05-2027 to 29-05-2028',
    coveredFor: 'Desktop / Laptop / Computer System',
    renewalAmount: 12500
  };
}

export function renderAmcContractPdf(doc, options = {}) {
  const template = options.template || {};
  const config = template.config || {};
  const context = options.context || {};
  const data = { ...sampleAmcContractData(), ...(options.contract || {}) };
  const company = amcCompany(options.company);
  const title = cleanText(renderText(config.headerTitle || 'AMC CONTRACT', context), 'AMC CONTRACT').toUpperCase();
  drawPageBase(doc, title, company, config);

  const customerDetails = cfgSection(config, 'customerDetails');
  const amcPeriod = cfgSection(config, 'amcPeriod');
  const visitFrequency = cfgSection(config, 'visitFrequency');
  const coveredDevices = cfgSection(config, 'coveredDevices');
  const paymentDetails = cfgSection(config, 'paymentDetails');
  drawTwoColumnDetails(doc, 155, 91, [
    ...includeRow(amcPeriod, 'showAmcReference', { label: 'AMC Reference', value: data.amcReference }),
    ...includeRow(amcPeriod, 'showContractDate', { label: 'Contract Date', value: data.contractDate }),
    ...includeRow(amcPeriod, 'showAmcPeriod', { label: 'AMC Period', value: data.amcPeriod }),
    ...includeRow(amcPeriod, 'showStatus', { label: 'Status', value: data.status })
  ], [
    ...includeRow(customerDetails, 'showCustomerName', { label: 'Customer Name', value: data.customerName }),
    ...includeRow(customerDetails, 'showPhoneNumber', { label: 'Phone Number', value: data.customerPhone }),
    ...includeRow(customerDetails, 'showAddress', { label: 'Address', value: data.customerAddress })
  ]);

  const planRightRows = [];
  if (visibleFlag(coveredDevices, 'showCoveredFor')) planRightRows.push({ label: 'Covered For', value: data.coveredFor, labelWidth: 84 });
  if (visibleFlag(visitFrequency, 'showTechnician') && cleanText(data.technician, '') !== '') planRightRows.push({ label: 'Technician', value: data.technician, labelWidth: 84 });
  if (visitFrequency.show !== false) {
    drawSectionHeaderCard(doc, 253, 78, 'AMC PLAN DETAILS', [
      ...includeRow(visitFrequency, 'showPlanName', { label: 'Plan Name', value: data.planName, labelWidth: 92 }),
      ...includeRow(visitFrequency, 'showCoverageType', { label: 'Coverage Type', value: data.coverageType, labelWidth: 92 })
    ], planRightRows);
  }

  const showSerial = coveredDevices.showSerialNumber === true;
  const columns = showSerial
    ? [
      { key: 'sno', label: 'S.No', width: 36, align: 'center' },
      { key: 'device', label: 'Device / Product', width: 105 },
      { key: 'brandModel', label: 'Brand / Model', width: 95 },
      { key: 'serialNumber', label: 'Serial Number', width: 90 },
      { key: 'quantity', label: 'Qty', width: 38, align: 'center' },
      { key: 'coverageNotes', label: 'Coverage Notes', width: CONTENT_WIDTH - 364 }
    ]
    : [
      { key: 'sno', label: 'S.No', width: 45, align: 'center' },
      { key: 'device', label: 'Device / Product', width: 134 },
      { key: 'brandModel', label: 'Brand / Model', width: 120 },
      { key: 'quantity', label: 'Qty', width: 48, align: 'center' },
      { key: 'coverageNotes', label: 'Coverage Notes', width: CONTENT_WIDTH - 347 }
    ];
  if (coveredDevices.show !== false) {
    drawTable(doc, PAGE_X, 344, CONTENT_WIDTH, columns, (data.coveredItems || []).map((item, index) => ({
      sno: index + 1,
      device: item.device,
      brandModel: item.brandModel,
      serialNumber: item.serialNumber,
      quantity: item.quantity || 1,
      coverageNotes: item.coverageNotes
    })), { title: 'COVERED ITEMS', rowHeight: 23, fontSize: 7.5 });
  }

  if (paymentDetails.show !== false) {
    drawCard(doc, PAGE_X, 439, CONTENT_WIDTH, 45);
    if (visibleFlag(paymentDetails, 'showContractValue')) {
      drawRupeeIcon(doc, 50, 443);
      doc.font(boldFont()).fontSize(10.2).fillColor(NAVY).text(`AMC Contract Value: ${money(data.contractValue)}`, 95, 456, { width: 210 });
    }
    if (visibleFlag(paymentDetails, 'showPaymentStatus')) {
      drawPaymentIcon(doc, 332, 443);
      doc.font(boldFont()).fontSize(10.2).fillColor(NAVY).text(`Payment Status: ${data.paymentStatus}`, 377, 456, { width: 160 });
    }
  }

  drawInfoListCard(doc, PAGE_X, 494, 261, 108, 'COVERAGE INCLUDES', 'shield', [
    'Regular maintenance support',
    'Basic troubleshooting and inspection',
    'Priority service support',
    'Service visit as per AMC plan',
    'Support during AMC period'
  ], { iconColor: GREEN, titleColor: NAVY });
  drawInfoListCard(doc, 306, 494, 261, 108, 'NOT COVERED / EXCLUSIONS', 'warning', [
    'Spare parts are not included unless mentioned',
    'Physical damage, liquid damage, or misuse is not covered',
    'Consumables and accessories are not covered',
    'Additional work outside AMC scope will be charged separately'
  ], { cross: true, titleColor: ORANGE, lineStep: 15 });

  if (cfgSection(config, 'amcTerms').show !== false) {
    drawTermsCard(doc, 611, termsFromConfig(config, contractTerms()));
  }
  drawCard(doc, PAGE_X, 690, CONTENT_WIDTH, 58, { fill: LIGHT_GREEN, stroke: GREEN_BORDER });
  drawCalendarIcon(doc, 50, 702);
  doc.font(boldFont()).fontSize(10.2).fillColor(GREEN).text('RENEWAL REMINDER', 96, 704, { width: 210 });
  doc.font(bodyFont()).fontSize(8.7).fillColor(TEXT)
    .text(`Your AMC renewal is due before ${data.renewalDate}.`, 96, 722, { width: 360 })
    .text('Renew on time to continue uninterrupted service support.', 96, 736, { width: 360 });
  drawSignatureLine(doc, 754, config);
  drawFooter(doc, company, 'Thank you for choosing Universal Systems AMC support.', config);
}

export function renderAmcServiceVisitPdf(doc, options = {}) {
  const template = options.template || {};
  const config = template.config || {};
  const context = options.context || {};
  const data = { ...sampleAmcVisitData(), ...(options.visit || {}) };
  const company = amcCompany(options.company);
  const configuredTitle = cleanText(renderText(config.headerTitle || 'AMC SERVICE VISIT REPORT', context), 'AMC SERVICE VISIT REPORT').toUpperCase();
  const title = configuredTitle === 'AMC SERVICE VISIT' ? 'AMC SERVICE VISIT REPORT' : configuredTitle;
  drawPageBase(doc, title, company, config);

  const visitDetails = cfgSection(config, 'visitDetails');
  const customerDetails = cfgSection(config, 'customerDetails');
  const deviceChecked = cfgSection(config, 'deviceChecked');
  drawTwoColumnDetails(doc, 155, 111, [
    ...includeRow(visitDetails, 'showAmcReference', { label: 'AMC Reference', value: data.amcReference }),
    ...includeRow(visitDetails, 'showVisitDate', { label: 'Visit Date', value: data.visitDate }),
    ...includeRow(visitDetails, 'showVisitStatus', { label: 'Visit Status', value: data.visitStatus }),
    ...includeRow(visitDetails, 'showNextVisitDate', { label: 'Next Visit Date', value: data.nextVisitDate }),
    ...includeRow(visitDetails, 'showJobReference', { label: 'Job Reference', value: data.jobReference })
  ], [
    ...includeRow(customerDetails, 'showCustomerName', { label: 'Customer Name', value: data.customerName }),
    ...includeRow(customerDetails, 'showPhoneNumber', { label: 'Phone Number', value: data.customerPhone }),
    ...includeRow(customerDetails, 'showAddress', { label: 'Address', value: data.customerAddress })
  ]);

  const planRightRows = [];
  if (visibleFlag(deviceChecked, 'showCoveredFor')) planRightRows.push({ label: 'Covered For', value: data.coveredFor, labelWidth: 84 });
  if (visibleFlag(deviceChecked, 'showTechnician') && cleanText(data.technician, '') !== '') planRightRows.push({ label: 'Technician', value: data.technician, labelWidth: 84 });
  if (deviceChecked.show !== false) {
    drawSectionHeaderCard(doc, 274, 78, 'AMC PLAN DETAILS', [
      ...includeRow(deviceChecked, 'showPlanName', { label: 'Plan Name', value: data.planName, labelWidth: 92 }),
      ...includeRow(deviceChecked, 'showAmcPeriod', { label: 'AMC Period', value: data.amcPeriod, labelWidth: 92 })
    ], planRightRows);
  }

  if (cfgSection(config, 'workCompleted').show !== false) {
    drawTable(doc, PAGE_X, 364, CONTENT_WIDTH, [
      { key: 'sno', label: 'S.No', width: 45, align: 'center' },
      { key: 'work', label: 'Work Done / Checkup Details', width: 370 },
      { key: 'status', label: 'Status', width: CONTENT_WIDTH - 415, statusCheck: true }
    ], (data.workItems || []).map((item, index) => ({
      sno: index + 1,
      work: item.work,
      status: item.status || 'Done'
    })), { title: 'VISIT WORK DETAILS', rowHeight: 22, fontSize: 7.8 });
  }

  drawCard(doc, PAGE_X, 499, CONTENT_WIDTH, 53, { fill: LIGHT_GREEN, stroke: GREEN_BORDER });
  drawDocumentIcon(doc, 49, 508, GREEN);
  doc.font(boldFont()).fontSize(10.2).fillColor(GREEN).text('TECHNICIAN NOTES', 95, 511, { width: 210 });
  doc.font(bodyFont()).fontSize(8.7).fillColor(TEXT).text(cleanText(data.technicianNotes), 95, 530, { width: 390, lineGap: 1.2 });

  const partsUsed = cfgSection(config, 'partsUsed');
  const showAdditional = partsUsed.show !== false && (Number(data.additionalCharges || 0) > 0 || config.showAdditionalCharges === true);
  let nextY = 562;
  if (showAdditional) {
    drawCard(doc, PAGE_X, nextY, CONTENT_WIDTH, 38);
    doc.font(boldFont()).fontSize(9.2).fillColor(NAVY).text('ADDITIONAL CHARGES (if any)', 47, nextY + 12, { width: 210 });
    doc.font(boldFont()).fontSize(9.2).fillColor(TEXT).text(`Amount: ${money(data.additionalCharges)}`, 404, nextY + 12, { width: 110, align: 'right' });
    nextY += 48;
  }

  drawInfoListCard(doc, PAGE_X, nextY, 261, 88, 'AMC VISIT TERMS', 'document', [
    'This visit is recorded under the active AMC contract.',
    'Spare parts or additional work outside AMC scope will be charged separately.',
    'Next scheduled service date may change based on availability.'
  ], { numbered: true, lineStep: 17 });
  if (cfgSection(config, 'nextVisitNote').show !== false) {
    drawInfoListCard(doc, 306, nextY, 261, 88, 'NEXT VISIT REMINDER', 'calendar', [
      `Your next AMC visit is scheduled on ${data.nextVisitDate}.`,
      'We will reach you before the visit date.'
    ], { lineStep: 17 });
  }

  const acknowledgement = cfgSection(config, 'customerAcknowledgement');
  if (acknowledgement.show === true) {
    drawCard(doc, PAGE_X, nextY + 100, CONTENT_WIDTH, 42, { fill: '#ffffff' });
    doc.font(boldFont()).fontSize(9).fillColor(NAVY).text('CUSTOMER ACKNOWLEDGEMENT', 48, nextY + 112, { width: 190 });
    doc.font(bodyFont()).fontSize(8).fillColor(TEXT).text(cleanText(acknowledgement.text, 'Customer has acknowledged this AMC service visit.'), 247, nextY + 111, { width: 285 });
  }

  drawFooter(doc, company, 'Thank you for choosing Universal Systems AMC support.', config);
}

export function renderAmcRenewalPdf(doc, options = {}) {
  const template = options.template || {};
  const config = template.config || {};
  const context = options.context || {};
  const data = { ...sampleAmcRenewalData(), ...(options.renewal || {}) };
  const company = amcCompany(options.company);
  const title = cleanText(renderText(config.headerTitle || 'AMC RENEWAL REMINDER', context), 'AMC RENEWAL REMINDER').toUpperCase();
  drawPageBase(doc, title, company, config);

  const amcExpiryDetails = cfgSection(config, 'amcExpiryDetails');
  const customerDetails = cfgSection(config, 'customerDetails');
  const planDetails = cfgSection(config, 'planDetails');
  const renewalMessage = cfgSection(config, 'renewalMessage');
  drawTwoColumnDetails(doc, 155, 91, [
    ...includeRow(amcExpiryDetails, 'showAmcReference', { label: 'AMC Reference', value: data.amcReference }),
    ...includeRow(amcExpiryDetails, 'showReminderDate', { label: 'Reminder Date', value: data.reminderDate }),
    ...includeRow(amcExpiryDetails, 'showExpiryDate', { label: 'AMC Expiry Date', value: data.expiryDate, valueColor: '#d01818' }),
    ...includeRow(amcExpiryDetails, 'showRenewalStatus', { label: 'Renewal Status', value: data.renewalStatus, valueColor: ORANGE })
  ], [
    ...includeRow(customerDetails, 'showCustomerName', { label: 'Customer Name', value: data.customerName }),
    ...includeRow(customerDetails, 'showPhoneNumber', { label: 'Phone Number', value: data.customerPhone }),
    ...includeRow(customerDetails, 'showAddress', { label: 'Address', value: data.customerAddress })
  ]);

  drawSectionHeaderCard(doc, 253, 78, 'AMC PLAN DETAILS', [
    ...includeRow(planDetails, 'showPlanName', { label: 'Plan Name', value: data.planName, labelWidth: 92 }),
    ...includeRow(planDetails, 'showCurrentPeriod', { label: 'Current Period', value: data.currentPeriod, labelWidth: 92 })
  ], [
    ...includeRow(planDetails, 'showRenewalPeriod', { label: 'Renewal Period', value: data.renewalPeriod, labelWidth: 92 }),
    ...includeRow(planDetails, 'showCoveredFor', { label: 'Covered For', value: data.coveredFor, labelWidth: 92 })
  ]);

  let y = 342;
  if (visibleFlag(cfgSection(config, 'renewalAmount'))) {
    drawCard(doc, PAGE_X, y, CONTENT_WIDTH, 56, { fill: LIGHT_GREEN, stroke: GREEN_BORDER });
    drawRupeeIcon(doc, 55, y + 10, GREEN);
    doc.font(boldFont()).fontSize(10).fillColor(GREEN).text('RENEWAL AMOUNT', 108, y + 16, { width: 170 });
    doc.font(boldFont()).fontSize(18).fillColor(NAVY).text(money(data.renewalAmount), 342, y + 16, { width: 150, align: 'right' });
    y += 68;
  }

  if (renewalMessage.show !== false) {
    drawCard(doc, PAGE_X, y, CONTENT_WIDTH, 72, { fill: ORANGE_LIGHT, stroke: ORANGE_BORDER });
    drawBellIcon(doc, 53, y + 17);
    doc.font(boldFont()).fontSize(11).fillColor(ORANGE).text(cleanText(renewalMessage.title, 'YOUR AMC PLAN IS EXPIRING SOON!'), 102, y + 16, { width: 340 });
    doc.font(bodyFont()).fontSize(9).fillColor(TEXT).text('Renew your AMC before ', 102, y + 38, { continued: true });
    doc.font(boldFont()).fontSize(9).fillColor('#d01818').text(data.expiryDate, { continued: true });
    doc.font(bodyFont()).fontSize(9).fillColor(TEXT).text(' to continue uninterrupted service support, priority assistance, and regular maintenance coverage.', {
      width: 385,
      lineGap: 1.3
    });
    y += 84;
  }

  drawInfoListCard(doc, PAGE_X, y, 261, 100, 'CONTINUE AMC BENEFITS', 'shield', [
    'Priority service support',
    'Regular maintenance assistance',
    'Easier service planning',
    'Continued coverage for listed products'
  ], { iconColor: GREEN, lineStep: 14 });
  drawInfoListCard(doc, 306, y, 261, 100, 'RENEWAL TERMS', 'document', [
    'Renewal is required before the expiry date to continue AMC coverage.',
    'AMC coverage will continue only after renewal confirmation.',
    'Parts or services outside AMC scope will be charged separately.',
    'Renewal amount and coverage may vary based on plan and product condition.'
  ], { numbered: true, lineStep: 14 });
  y += 112;

  const contactMessage = cfgSection(config, 'contactWhatsappMessage');
  if (contactMessage.show !== false) {
    drawCard(doc, PAGE_X, y, CONTENT_WIDTH, 92, { fill: LIGHT_BLUE, stroke: '#b8daf7' });
    drawHeadsetIcon(doc, 52, y + 24);
    drawLine(doc, 116, y + 16, 116, y + 76, '#93bee9', 0.85);
    doc.font(boldFont()).fontSize(11.2).fillColor(NAVY).text(cleanText(contactMessage.title, 'READY TO RENEW?'), 138, y + 15, { width: 210 });
    doc.font(bodyFont()).fontSize(8.6).fillColor(TEXT)
      .text(cleanText(contactMessage.text, 'To continue AMC support, contact Universal Systems or confirm renewal through WhatsApp.'), 138, y + 34, { width: 360, lineGap: 1.2 });
    drawHeaderIcon(doc, 'whatsapp', 138, y + 59, NAVY);
    doc.font(boldFont()).fontSize(8).fillColor(NAVY).text(AMC_COMPANY.phones[0], 162, y + 60, { width: 92 });
    drawHeaderIcon(doc, 'email', 260, y + 59, NAVY);
    doc.text(AMC_COMPANY.email, 285, y + 60, { width: 130 });
    doc.font(boldFont()).fontSize(8.3).fillColor(NAVY).text(cleanText(contactMessage.finalLine, 'Thank you for choosing Universal Systems AMC support.'), 138, y + 77, { width: 330 });
  }

  drawFooter(doc, company, 'We value your trust. Stay connected for the best service!', config);
}
