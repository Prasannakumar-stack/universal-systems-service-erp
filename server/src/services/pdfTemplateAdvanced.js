const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_X = 34;
const PAGE_RIGHT = 561;
const CONTENT_WIDTH = PAGE_RIGHT - PAGE_X;
const FOOTER_SAFE_Y = 770;

const CARD_LABELS = {
  text: 'Text',
  info: 'Info',
  notice: 'Notice',
  warranty: 'Warranty',
  terms: 'Terms',
  payment: 'Payment',
  bank: 'Bank Details',
  signature: 'Signature',
  qr: 'QR Code',
  'customer-message': 'Customer Message',
  'custom-field': 'Custom Field',
  spacer: 'Divider'
};

const CARD_GAP = 12;

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

function cardBodyText(card, context = {}) {
  if (card.type === 'qr') {
    return [
      renderText(card.content || '', context),
      renderText(card.variable || '', context)
    ].map((value) => value.trim()).filter(Boolean).join('\n');
  }
  return renderText(card.content || card.variable || '', context);
}

function useFont(doc, name, fallback) {
  try {
    doc.font(name);
  } catch {
    doc.font(fallback);
  }
}

function sectionCards(config = {}) {
  if (config.advancedEnabled !== true) return [];
  const customCards = config.structured?.customSectionsEnabled === true && Array.isArray(config.structured?.customSections)
    ? config.structured.customSections.filter((section) => {
      if (section?.enabled === false) return false;
      if (section?.type === 'qr' && config.structured?.qrPaymentCardEnabled !== true) return false;
      if (section?.type === 'signature' && config.structured?.signatureCardEnabled !== true) return false;
      return true;
    })
    : [];
  const cards = [...customCards];
  const hasQrCard = cards.some((card) => card.type === 'qr');
  const hasSignatureCard = cards.some((card) => card.type === 'signature');
  if (config.structured?.qrPaymentCardEnabled === true && !hasQrCard) cards.push(qrPaymentCard(config));
  if (config.structured?.signatureCardEnabled === true && !hasSignatureCard) cards.push(signatureCard(config));
  return cards;
}

function qrPaymentCard(config = {}) {
  const source = config.structured?.qrPaymentCard || {};
  const rows = [
    cleanText(source.note, ''),
    cleanText(source.upiText, '')
  ].filter(Boolean);
  return {
    id: 'advanced-qr-payment-card',
    type: 'qr',
    enabled: true,
    title: cleanText(source.title, 'Payment Details'),
    content: rows.join('\n'),
    variable: cleanText(source.qrValue, ''),
    width: config.structured?.defaultCardWidth || 'full',
    minHeight: 104,
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
    borderColor: '#d8e5f7',
    accentColor: config.design?.colors?.accentColor || config.colorAccent || '#0f2a52'
  };
}

function signatureCard(config = {}) {
  const source = config.structured?.signatureCard || {};
  const rows = [
    cleanText(source.personName, ''),
    cleanText(source.designation, '')
  ].filter(Boolean);
  return {
    id: 'advanced-signature-card',
    type: 'signature',
    enabled: true,
    title: cleanText(source.title, 'Authorized Signature'),
    content: rows.join('\n') || 'Authorized Signature',
    variable: cleanText(source.imageUrl, ''),
    width: config.structured?.defaultCardWidth || 'full',
    minHeight: 90,
    backgroundColor: '#ffffff',
    textColor: '#0f172a',
    borderColor: '#d8e5f7',
    accentColor: config.design?.colors?.accentColor || config.colorAccent || '#0f2a52'
  };
}

function cardHeight(doc, card, width, context) {
  if (card.type === 'spacer') return Number(card.minHeight || 24);
  const content = cardBodyText(card, context);
  useFont(doc, 'Body', 'Helvetica');
  const textHeight = content ? doc.fontSize(8.4).heightOfString(content, { width: width - 38, lineGap: 2 }) : 0;
  return Math.max(Number(card.minHeight || 74), textHeight + 46);
}

function widthRatioForCard(card, config = {}) {
  if (card.type === 'spacer') return 1;
  if (config.structured?.customCardWidthEnabled !== true) return 1;
  const width = card.width || config.structured?.defaultCardWidth || 'full';
  if (width === 'auto') return config.structured?.twoColumnCards === true ? 0.5 : 1;
  if (width === 'half') return 0.5;
  if (width === 'third') return 1 / 3;
  if (width === 'two-thirds') return 2 / 3;
  return 1;
}

function widthForCard(card, config = {}) {
  const ratio = widthRatioForCard(card, config);
  if (ratio >= 1) return CONTENT_WIDTH;
  return Math.max(130, Math.floor((CONTENT_WIDTH - CARD_GAP) * ratio));
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

function drawCard(doc, card, x, y, width, height, context, options = {}) {
  const accent = card.accentColor || '#0f2a52';
  const borderStyle = options.borderStyle || 'default';
  const border = borderStyle === 'highlight' ? accent : card.borderColor || '#d8e5f7';
  const background = card.backgroundColor || '#ffffff';
  const textColor = card.textColor || '#0f172a';

  if (card.type === 'spacer') {
    const label = cleanText(card.title, '');
    doc.save();
    doc.strokeColor(accent).lineWidth(0.7).moveTo(x, y + Math.floor(height / 2)).lineTo(x + width, y + Math.floor(height / 2)).stroke();
    if (label) {
      useFont(doc, 'BodyBold', 'Helvetica-Bold');
      doc.roundedRect(x + 12, y + Math.floor(height / 2) - 8, Math.min(180, width - 24), 16, 8).fill('#ffffff');
      doc.fontSize(7.8).fillColor(accent).text(label, x + 18, y + Math.floor(height / 2) - 5, { width: Math.min(168, width - 36) });
    }
    doc.restore();
    return;
  }

  doc.save();
  doc.roundedRect(x, y, width, height, 6).fill(background);
  if (borderStyle !== 'none') {
    doc.roundedRect(x, y, width, height, 6)
      .strokeColor(border)
      .lineWidth(borderStyle === 'thin' ? 0.45 : borderStyle === 'highlight' ? 1.2 : 0.7)
      .stroke();
  }
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
    doc.fontSize(8.3).fillColor(textColor).text(cardBodyText(card, context) || 'Payment details will appear here after configuration.', x + 92, y + 39, { width: width - 120, lineGap: 2 });
    doc.restore();
    return;
  }

  useFont(doc, 'Body', 'Helvetica');
  const body = cardBodyText(card, context);
  doc.fontSize(8.4).fillColor(textColor).text(body || '-', x + 18, y + 34, { width: width - 36, lineGap: 2 });
  doc.restore();
}

export function drawAdvancedPdfSections(doc, options = {}) {
  const { config = {}, context = {}, title = '', company = {} } = options;
  const cards = sectionCards(config);
  if (!cards.length) return { pagesAdded: 0 };

  const accentColor = config.design?.colors?.accentColor || config.colorAccent || '#0f2a52';
  const borderStyle = config.structured?.borderStyle || 'default';
  const twoColumnCards = config.structured?.twoColumnCards === true;
  let pagesAdded = 0;
  let y = 96;
  let rowX = PAGE_X;
  let rowUsed = 0;
  let rowHeight = 0;

  function flushRow() {
    if (!rowHeight) return;
    y += rowHeight + CARD_GAP;
    rowX = PAGE_X;
    rowUsed = 0;
    rowHeight = 0;
  }

  doc.addPage({ size: 'A4', margin: 0 });
  pagesAdded += 1;
  drawAdvancedHeader(doc, title, company, accentColor);

  cards.forEach((card) => {
    const width = widthForCard(card, config);
    const height = cardHeight(doc, card, width, context);
    const needsRow = twoColumnCards && width < CONTENT_WIDTH;
    if (!needsRow) flushRow();
    if (needsRow && rowUsed > 0 && rowUsed + CARD_GAP + width > CONTENT_WIDTH) flushRow();
    if (y + height > FOOTER_SAFE_Y) {
      rowX = PAGE_X;
      rowUsed = 0;
      rowHeight = 0;
      doc.addPage({ size: 'A4', margin: 0 });
      pagesAdded += 1;
      drawAdvancedHeader(doc, title, company, accentColor);
      y = 96;
    }
    const x = needsRow ? rowX : PAGE_X;
    drawCard(doc, card, x, y, width, height, context, { borderStyle });
    if (needsRow) {
      rowHeight = Math.max(rowHeight, height);
      rowUsed += (rowUsed ? CARD_GAP : 0) + width;
      rowX += width + CARD_GAP;
      if (rowUsed >= CONTENT_WIDTH - 1) flushRow();
      return;
    }
    y += height + CARD_GAP;
  });
  flushRow();

  return { pagesAdded };
}
