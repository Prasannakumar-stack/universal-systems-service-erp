import fs from 'node:fs';
import { LOGO_FULL_PATH, LOGO_ICON_PATH } from '../config.js';
import { drawAdvancedPdfSections } from './pdfTemplateAdvanced.js';

const fontPath = 'C:\\Windows\\Fonts\\arial.ttf';
const boldFontPath = 'C:\\Windows\\Fonts\\arialbd.ttf';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_X = 28;
const PAGE_RIGHT = 567;
const CONTENT_WIDTH = PAGE_RIGHT - PAGE_X;

const NAVY = '#082a73';
const TEXT = '#0f172a';
const MUTED = '#334155';
const LIGHT_BLUE = '#f1f7ff';
const BLUE_BORDER = '#bfd7f8';
const GOLD = '#d89b1d';

const THANK_YOU_COMPANY = {
  name: 'Universal Systems',
  tagline: 'Repair | Service | Sales | AMC',
  addressLines: [
    'MIG-H3, Housing Unit, Near 4 Roads,',
    'Mathiyankuttai Post, Mettur Dam \u2013 636452,',
    'Salem, Tamil Nadu, India.'
  ],
  phones: ['98427 81971', '70100 24368'],
  email: 'usmettur@gmail.com',
  website: 'usmettur.com'
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
  return String(value || '').replace(/\{\{([a-z0-9_]+)\}\}/gi, (_match, key) => {
    if (!Object.prototype.hasOwnProperty.call(context, key)) return '-';
    const next = context[key];
    return next === undefined || next === null || next === '' ? '-' : next;
  });
}

function cfgSection(config = {}, key = '') {
  return config.sections?.[key] || {};
}

function cfgList(value = [], fallback = []) {
  const source = Array.isArray(value) ? value : String(value || '').split('\n');
  const rows = source.map((line) => String(line || '').trim()).filter(Boolean);
  return rows.length ? rows : fallback;
}

function thankYouCompany(company = {}) {
  return {
    ...THANK_YOU_COMPANY,
    name: company.name || THANK_YOU_COMPANY.name,
    logoFilePath: company.logoFilePath || LOGO_FULL_PATH
  };
}

function drawLine(doc, x1, y1, x2, y2, color = NAVY, width = 0.75) {
  doc.strokeColor(color).lineWidth(width).moveTo(x1, y1).lineTo(x2, y2).stroke();
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
  const currentCompany = thankYouCompany(company);
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

function drawWatermark(doc) {
  if (!fs.existsSync(LOGO_ICON_PATH)) return;
  doc.save();
  doc.opacity(0.06);
  doc.image(LOGO_ICON_PATH, 91, 254, { width: 414 });
  doc.restore();
}

function drawTitle(doc, title) {
  doc.font(boldFont()).fontSize(28).fillColor(NAVY)
    .text(title, 58, 160, { width: 360 });
  drawLine(doc, 59, 202, 144, 202, NAVY, 1.1);
  doc.circle(148, 202, 3.5).fillColor(NAVY).fill();
}

function drawStar(doc, x, y) {
  const points = [];
  const outer = 6.4;
  const inner = 2.8;
  const cx = x + outer;
  const cy = y + outer;
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    points.push([cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius]);
  }
  doc.save();
  doc.polygon(...points).fillColor(GOLD).fill();
  doc.restore();
}

function drawHighlights(doc, y, config = {}) {
  const support = cfgSection(config, 'supportMessage');
  if (support.show === false) return;
  const points = cfgList(support.highlightLines, [
    'Your satisfaction is our priority',
    'Quality service you can trust',
    'We are always here to help'
  ]);
  points.forEach((point, index) => {
    const rowY = y + index * 26;
    drawStar(doc, 72, rowY + 1);
    doc.font(boldFont()).fontSize(12).fillColor(NAVY).text(point, 96, rowY, { width: 350 });
  });
}

function drawShieldIcon(doc, x, y) {
  doc.save();
  doc.circle(x + 24, y + 24, 24).fill('#e1efff');
  doc.strokeColor(NAVY).fillColor('#ffffff').lineWidth(1.4).lineJoin('round');
  doc.path(`M${x + 24} ${y + 10} L${x + 36} ${y + 15} L${x + 33} ${y + 31} L${x + 24} ${y + 39} L${x + 15} ${y + 31} L${x + 12} ${y + 15} Z`).fillAndStroke('#ffffff', NAVY);
  doc.strokeColor(NAVY).lineWidth(1.8).lineCap('round')
    .moveTo(x + 18.5, y + 25).lineTo(x + 22.5, y + 29.5).lineTo(x + 30.5, y + 20.2).stroke();
  doc.restore();
}

function drawAmcCard(doc, y, config = {}) {
  const support = cfgSection(config, 'supportMessage');
  if (support.show === false) return;
  doc.roundedRect(58, y, 479, 86, 8).fillAndStroke(LIGHT_BLUE, BLUE_BORDER);
  drawShieldIcon(doc, 76, y + 19);
  drawLine(doc, 142, y + 15, 142, y + 71, '#93bee9', 0.9);
  doc.font(boldFont()).fontSize(12.2).fillColor(NAVY)
    .text(cleanText(support.amcTitle, 'Need regular service support?'), 164, y + 18, { width: 310 });
  doc.font(bodyFont()).fontSize(10.2).fillColor(TEXT)
    .text(cleanText(support.amcText, 'Universal Systems also provides AMC plans for regular maintenance and priority service.'), 164, y + 39, {
      width: 325,
      lineGap: 2
    });
  doc.font(boldFont()).fontSize(10.3).fillColor(NAVY)
    .text(cleanText(support.amcFinalLine, 'Contact us anytime to know more.'), 164, y + 66, { width: 310 });
}

function drawPhoneIcon(doc, x, y) {
  drawHeaderIcon(doc, 'phone', x, y, NAVY);
}

function drawBottomStrip(doc, config = {}) {
  if (cfgSection(config, 'thankYouFooter').show === false) return;
  doc.roundedRect(PAGE_X, 796, CONTENT_WIDTH, 31, 5).fill(NAVY);
  doc.font(boldFont()).fontSize(12).fillColor('#ffffff')
    .text(cleanText(config.footer?.thankYouMessage || config.footerText, 'We appreciate your business. Visit us again!'), PAGE_X + 24, 805, {
      width: CONTENT_WIDTH - 48,
      align: 'center'
    });
}

function drawTermsCard(doc, y, config = {}, context = {}) {
  const terms = cfgSection(config, 'terms');
  if (terms.show !== true) return 0;
  const text = renderText(terms.text || config.termsAndConditions || '', context).trim();
  if (!text) return 0;
  const rows = text.split('\n').map((line) => line.replace(/^[-*\u2022]?\s*\d*\.?\s*/, '').trim()).filter(Boolean).slice(0, 3);
  doc.roundedRect(58, y, 479, 58, 8).fillAndStroke('#ffffff', BLUE_BORDER);
  doc.font(boldFont()).fontSize(10).fillColor(NAVY).text(cleanText(terms.title, 'TERMS'), 78, y + 11, { width: 140 });
  let lineY = y + 28;
  rows.forEach((row) => {
    doc.font(bodyFont()).fontSize(7.8).fillColor(TEXT).text(row, 78, lineY, { width: 430, lineGap: 0.8 });
    lineY += 11;
  });
  return 58;
}

function drawLetterBody(doc, service, company, config = {}, context = {}) {
  const currentCompany = thankYouCompany(company);
  const customerName = cleanText(service.customerName, 'Rahul Kumar');

  const customerDetails = cfgSection(config, 'customerDetails');
  if (customerDetails.show !== false && customerDetails.showCustomerName !== false) {
    doc.font(boldFont()).fontSize(13).fillColor(TEXT)
      .text(`Dear ${customerName},`, 58, 232, { width: 430 });
  }

  const paragraphs = cfgList(cfgSection(config, 'whatWeDid').messageLines, [
    `Thank you for choosing ${currentCompany.name}.`,
    'We are delighted to have successfully completed your service and handed over your product.',
    'Your trust and support mean a lot to us.',
    'We look forward to serving you again in the future.',
    'If you need any assistance or service, feel free to contact us anytime.'
  ]);
  doc.font(bodyFont()).fontSize(12).fillColor(TEXT);
  let y = 271;
  if (cfgSection(config, 'whatWeDid').show !== false) {
    paragraphs.forEach((paragraph) => {
      doc.text(paragraph, 58, y, { width: 466, lineGap: 4 });
      y += Math.max(25, doc.heightOfString(paragraph, { width: 466, lineGap: 4 }) + 16);
    });
  }

  drawHighlights(doc, 444, config);
  drawAmcCard(doc, 534, config);
  const termsHeight = drawTermsCard(doc, 628, config, context);
  const closingY = termsHeight ? 704 : 655;

  if (cfgSection(config, 'thankYouFooter').show !== false) {
    doc.font(bodyFont()).fontSize(12).fillColor(TEXT)
      .text('Warm Regards,', 58, closingY, { width: 250 });
    doc.font(boldFont()).fontSize(13.2).fillColor(NAVY)
      .text(currentCompany.name, 58, closingY + 23, { width: 250 });
    drawPhoneIcon(doc, 58, closingY + 55);
    const contactLabel = cleanText(cfgSection(config, 'thankYouFooter').contactLabel, 'Contact');
    doc.font(boldFont()).fontSize(11).fillColor(NAVY)
      .text(`${contactLabel}: ${currentCompany.phones[0] || '98427 81971'}`, 84, closingY + 56, { width: 220 });
  }
}

function blankServiceCompletedData() {
  return {
    customerName: 'Rahul Kumar'
  };
}

export function sampleServiceCompletedData() {
  return blankServiceCompletedData();
}

export function renderServiceCompletedPdf(doc, options = {}) {
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
  const company = thankYouCompany(options.company);
  const service = {
    ...blankServiceCompletedData(),
    ...(options.service || {})
  };
  const summary = cfgSection(config, 'serviceSummary');
  const title = cleanText(renderText(summary.title || config.headerTitle || 'SERVICE COMPLETED!', context), 'SERVICE COMPLETED!').toUpperCase();

  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill('#ffffff');
  drawHeader(doc, company, config);
  drawWatermark(doc);
  if (summary.show !== false) drawTitle(doc, title);
  drawLetterBody(doc, service, company, config, context);
  drawBottomStrip(doc, config);
  drawAdvancedPdfSections(doc, { config, context, title, company });
}
