const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_X = 34;
const PAGE_RIGHT = 561;
const CONTENT_WIDTH = PAGE_RIGHT - PAGE_X;
const FOOTER_SAFE_Y = 770;

const CARD_LABELS = {
  text: 'Text',
  notice: 'Notice',
  warranty: 'Warranty',
  terms: 'Terms',
  payment: 'Payment',
  bank: 'Bank Details',
  signature: 'Signature',
  qr: 'QR Code',
  'customer-message': 'Customer Message',
  'custom-field': 'Custom Field',
  spacer: 'Spacer'
};

function cleanText(value, fallback = '') {
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

function useFont(doc, name, fallback) {
  try {
    doc.font(name);
  } catch {
    doc.font(fallback);
  }
}

function sectionCards(config = {}) {
  if (config.advancedEnabled !== true || config.structured?.customSectionsEnabled !== true) return [];
  return Array.isArray(config.structured?.customSections)
    ? config.structured.customSections.filter((section) => section?.enabled !== false)
    : [];
}

function cardHeight(doc, card, width, context) {
  if (card.type === 'spacer') return Number(card.minHeight || 24);
  const content = renderText(card.content || card.variable || '', context);
  useFont(doc, 'Body', 'Helvetica');
  const textHeight = content ? doc.fontSize(8.4).heightOfString(content, { width: width - 38, lineGap: 2 }) : 0;
  return Math.max(Number(card.minHeight || 74), textHeight + 46);
}

function drawAdvancedHeader(doc, title, company, accentColor) {
  doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill('#ffffff');
  useFont(doc, 'BodyBold', 'Helvetica-Bold');
  doc.fontSize(12).fillColor(accentColor).text(cleanText(company?.name, 'Universal Systems'), PAGE_X, 34, { width: 240 });
  doc.fontSize(10).fillColor('#0f172a').text('Custom PDF Sections', PAGE_X, 55, { width: 240 });
  doc.fontSize(8).fillColor('#64748b').text(cleanText(title, 'PDF Template'), PAGE_RIGHT - 210, 40, { width: 210, align: 'right' });
  doc.strokeColor('#d8e5f7').lineWidth(0.7).moveTo(PAGE_X, 78).lineTo(PAGE_RIGHT, 78).stroke();
}

function drawQrPattern(doc, x, y, size, color) {
  doc.save();
  doc.roundedRect(x, y, size, size, 3).strokeColor(color).lineWidth(0.8).stroke();
  const cell = size / 9;
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const finder = (row < 3 && col < 3) || (row < 3 && col > 5) || (row > 5 && col < 3);
      if (finder || ((row * 7 + col * 11) % 5 === 0)) {
        doc.rect(x + col * cell + 1, y + row * cell + 1, Math.max(1, cell - 2), Math.max(1, cell - 2)).fillColor(color).fill();
      }
    }
  }
  doc.restore();
}

function drawCard(doc, card, x, y, width, height, context) {
  if (card.type === 'spacer') return;
  const accent = card.accentColor || '#0f2a52';
  const border = card.borderColor || '#d8e5f7';
  const background = card.backgroundColor || '#ffffff';
  const textColor = card.textColor || '#0f172a';
  doc.save();
  doc.roundedRect(x, y, width, height, 6).fillAndStroke(background, border);
  doc.rect(x, y, 5, height).fill(accent);
  const label = cleanText(card.title, CARD_LABELS[card.type] || 'Custom Section');
  useFont(doc, 'BodyBold', 'Helvetica-Bold');
  doc.fontSize(9.8).fillColor(accent).text(label, x + 18, y + 13, { width: width - 36 });

  if (card.type === 'signature') {
    doc.strokeColor('#94a3b8').lineWidth(0.7).moveTo(x + width - 185, y + height - 26).lineTo(x + width - 28, y + height - 26).stroke();
    useFont(doc, 'Body', 'Helvetica');
    doc.fontSize(7.8).fillColor('#64748b').text(renderText(card.content || card.variable || 'Authorized Signature', context), x + width - 185, y + height - 17, { width: 157, align: 'center' });
    doc.restore();
    return;
  }

  if (card.type === 'qr') {
    drawQrPattern(doc, x + 18, y + 34, 58, accent);
    useFont(doc, 'Body', 'Helvetica');
    doc.fontSize(8.3).fillColor(textColor).text(renderText(card.content || card.variable || '', context), x + 92, y + 39, { width: width - 120, lineGap: 2 });
    doc.restore();
    return;
  }

  useFont(doc, 'Body', 'Helvetica');
  const body = renderText(card.content || card.variable || '', context);
  doc.fontSize(8.4).fillColor(textColor).text(body || '-', x + 18, y + 34, { width: width - 36, lineGap: 2 });
  doc.restore();
}

export function drawAdvancedPdfSections(doc, options = {}) {
  const { config = {}, context = {}, title = '', company = {} } = options;
  const cards = sectionCards(config);
  if (!cards.length) return { pagesAdded: 0 };

  const accentColor = config.design?.colors?.accentColor || config.colorAccent || '#0f2a52';
  let pagesAdded = 0;
  let y = 96;

  doc.addPage({ size: 'A4', margin: 0 });
  pagesAdded += 1;
  drawAdvancedHeader(doc, title, company, accentColor);

  cards.forEach((card) => {
    const width = card.width === 'half' ? Math.floor((CONTENT_WIDTH - 12) / 2) : CONTENT_WIDTH;
    const height = cardHeight(doc, card, width, context);
    if (y + height > FOOTER_SAFE_Y) {
      doc.addPage({ size: 'A4', margin: 0 });
      pagesAdded += 1;
      drawAdvancedHeader(doc, title, company, accentColor);
      y = 96;
    }
    drawCard(doc, card, PAGE_X, y, width, height, context);
    y += height + 12;
  });

  return { pagesAdded };
}
