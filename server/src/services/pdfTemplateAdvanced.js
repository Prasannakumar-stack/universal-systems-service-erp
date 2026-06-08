import fs from 'node:fs';

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
  spacer: 'Spacer',
  divider: 'Divider',
  card: 'Card',
  image: 'Image / Logo',
  table: 'Table',
  icon: 'Icon'
};

const CARD_GAP = 12;

function cleanText(value, fallback = '') {
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

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function designElements(config = {}) {
  if (config.design?.enabled !== true) return [];
  const sectionSource = Array.isArray(config.design?.sections) ? config.design.sections : [];
  const sections = sectionSource
    .filter((section) => section && section.enabled !== false && section.visible !== false)
    .map((section, index) => ({
      ...section,
      type: 'section',
      pageId: section.pageId || 'page-1',
      zIndex: Number(section.zIndex || index + 1)
    }));
  const source = Array.isArray(config.design?.customElements) && config.design.customElements.length
    ? config.design.customElements
    : Array.isArray(config.design?.elements)
      ? config.design.elements
      : [];
  const elements = source
    .filter((element) => element && element.enabled !== false && element.visible !== false)
    .map((element, index) => ({
      ...element,
      pageId: element.pageId || 'page-1',
      zIndex: Number(element.zIndex || index + 20)
    }));
  return [...sections, ...elements]
    .sort((a, b) => (a.pageId || '').localeCompare(b.pageId || '') || a.zIndex - b.zIndex);
}

function designPagesForElements(config = {}, elements = []) {
  const savedPages = Array.isArray(config.design?.pages) ? config.design.pages : [];
  const pageIds = new Set(elements.map((element) => element.pageId || 'page-1'));
  return [...pageIds].map((pageId, index) => {
    const saved = savedPages.find((page) => page?.id === pageId) || {};
    return {
      id: pageId,
      name: saved.name || `Page ${index + 1}`,
      elements: elements.filter((element) => (element.pageId || 'page-1') === pageId)
    };
  });
}

function designElementFrame(element = {}) {
  const margin = element.printSafe === false ? 0 : 24;
  const fallbackWidth = element.type === 'section' ? CONTENT_WIDTH : element.type === 'divider' ? 260 : 220;
  const fallbackHeight = element.type === 'section' ? 80 : element.type === 'divider' ? 22 : 76;
  let x = clampNumber(element.x, margin, margin, PAGE_WIDTH - margin - 24);
  let y = clampNumber(element.y, 118, margin, PAGE_HEIGHT - margin - 8);
  let width = clampNumber(element.width, fallbackWidth, 24, PAGE_WIDTH - margin * 2);
  let height = clampNumber(element.height, fallbackHeight, 8, PAGE_HEIGHT - margin * 2);
  if (element.fullWidth || element.widthMode === 'full') {
    x = PAGE_X;
    width = CONTENT_WIDTH;
  }
  if (x + width > PAGE_WIDTH - margin) width = Math.max(24, PAGE_WIDTH - margin - x);
  if (y + height > PAGE_HEIGHT - margin) height = Math.max(8, PAGE_HEIGHT - margin - y);
  return { x, y, width, height };
}

function contentForElement(element = {}) {
  return element.content && typeof element.content === 'object' ? element.content : { text: String(element.content || '') };
}

function drawElementShell(doc, element, frame) {
  if (element.type === 'divider' || element.type === 'spacer') return;
  const style = element.style || {};
  const radius = clampNumber(style.borderRadius, 8, 0, 32);
  const borderWidth = clampNumber(style.borderWidth, 1, 0, 8);
  const background = style.backgroundColor || element.backgroundColor || '#ffffff';
  const borderColor = style.borderColor || element.borderColor || '#cbd5e1';
  if (style.shadow) {
    doc.save();
    doc.opacity(0.08).roundedRect(frame.x + 4, frame.y + 5, frame.width, frame.height, radius).fill('#0f172a');
    doc.restore();
  }
  doc.roundedRect(frame.x, frame.y, frame.width, frame.height, radius).fill(background);
  if (borderWidth > 0) {
    doc.roundedRect(frame.x, frame.y, frame.width, frame.height, radius)
      .strokeColor(borderColor)
      .lineWidth(borderWidth)
      .stroke();
  }
}

function drawDividerElement(doc, element, frame, context = {}) {
  const style = element.style || {};
  const color = style.accentColor || '#0284c7';
  const y = frame.y + Math.max(4, frame.height / 2);
  doc.save();
  doc.strokeColor(color).lineWidth(clampNumber(style.dividerThickness, 2, 1, 8));
  if (style.dividerStyle === 'dashed') doc.dash(6, { space: 4 });
  if (style.dividerStyle === 'dotted') doc.dash(1, { space: 3 });
  doc.moveTo(frame.x, y).lineTo(frame.x + frame.width, y).stroke();
  if (doc.undash) doc.undash();
  const label = cleanText(contentForElement(element).label, '');
  if (label) {
    useFont(doc, 'BodyBold', 'Helvetica-Bold');
    doc.roundedRect(frame.x + 12, y - 8, Math.min(170, frame.width - 24), 16, 8).fill('#ffffff');
    doc.fontSize(7.6).fillColor(color).text(renderText(label, context), frame.x + 18, y - 5, { width: Math.min(158, frame.width - 36) });
  }
  doc.restore();
}

function drawTextElement(doc, element, frame, context) {
  const style = element.style || {};
  const content = contentForElement(element);
  const text = renderText(content.text || element.title || element.name || 'Text block', context);
  drawElementShell(doc, element, frame);
  useFont(doc, Number(style.fontWeight || 700) >= 700 ? 'BodyBold' : 'Body', Number(style.fontWeight || 700) >= 700 ? 'Helvetica-Bold' : 'Helvetica');
  doc.fontSize(clampNumber(style.fontSize, 13, 8, 32)).fillColor(style.textColor || element.textColor || '#0f172a')
    .text(text, frame.x + 12, frame.y + 12, {
      width: Math.max(12, frame.width - 24),
      height: Math.max(8, frame.height - 18),
      align: style.alignment || element.alignment || 'left',
      lineGap: 2
    });
}

function drawCardElement(doc, element, frame, context) {
  const style = element.style || {};
  const content = contentForElement(element);
  const accent = style.accentColor || '#0284c7';
  drawElementShell(doc, element, frame);
  doc.rect(frame.x, frame.y, 5, frame.height).fill(accent);
  useFont(doc, 'BodyBold', 'Helvetica-Bold');
  doc.fontSize(Math.max(8, clampNumber(style.fontSize, 13, 8, 32) * 0.78)).fillColor(accent)
    .text(renderText(content.title || element.name || 'Card', context), frame.x + 16, frame.y + 12, { width: Math.max(12, frame.width - 32) });
  useFont(doc, Number(style.fontWeight || 700) >= 700 ? 'BodyBold' : 'Body', Number(style.fontWeight || 700) >= 700 ? 'Helvetica-Bold' : 'Helvetica');
  doc.fontSize(clampNumber(style.fontSize, 13, 8, 32) * 0.72).fillColor(style.textColor || '#0f172a')
    .text(renderText(content.body || '-', context), frame.x + 16, frame.y + 34, {
      width: Math.max(12, frame.width - 32),
      height: Math.max(8, frame.height - 42),
      columns: element.twoColumn ? 2 : 1,
      columnGap: 10,
      lineGap: 2,
      align: style.alignment || element.alignment || 'left'
    });
}

function drawSectionElement(doc, element, frame, context) {
  const style = element.style || {};
  const content = contentForElement(element);
  const accent = style.accentColor || '#0f2a52';
  const kind = content.kind || element.role || 'details';
  drawElementShell(doc, { ...element, type: 'card' }, frame);
  doc.rect(frame.x, frame.y, 5, frame.height).fill(accent);
  if (element.showTitle !== false) {
    useFont(doc, 'BodyBold', 'Helvetica-Bold');
    doc.fontSize(8.8).fillColor(accent)
      .text(renderText(content.title || element.title || element.name || 'Section', context), frame.x + 14, frame.y + 10, { width: Math.max(12, frame.width - 28) });
  }
  const bodyX = frame.x + 14;
  const bodyY = frame.y + (element.showTitle === false ? 12 : 30);
  const bodyWidth = Math.max(12, frame.width - 28);
  const bodyHeight = Math.max(8, frame.height - (bodyY - frame.y) - 10);
  if (kind === 'header') {
    doc.roundedRect(bodyX, bodyY, 34, 34, 7).fill(accent);
    useFont(doc, 'BodyBold', 'Helvetica-Bold');
    doc.fontSize(9).fillColor('#ffffff').text('US', bodyX, bodyY + 11, { width: 34, align: 'center' });
    useFont(doc, 'BodyBold', 'Helvetica-Bold');
    doc.fontSize(11).fillColor(style.textColor || '#0f172a')
      .text(renderText(content.title || element.title || 'PDF Document', context), bodyX + 44, bodyY + 2, { width: bodyWidth - 44 });
    useFont(doc, 'Body', 'Helvetica');
    doc.fontSize(7.4).fillColor('#475569')
      .text(renderText(content.body || 'Company details', context), bodyX + 44, bodyY + 17, { width: bodyWidth - 44, height: bodyHeight - 14, lineGap: 1 });
    return;
  }
  if (kind === 'table') {
    const columns = Array.isArray(content.columns) && content.columns.length ? content.columns.slice(0, 4) : ['Description', 'Qty', 'Rate', 'Total'];
    const rows = Array.isArray(content.rows) && content.rows.length ? content.rows.slice(0, 4) : [];
    const columnWidth = bodyWidth / columns.length;
    doc.roundedRect(bodyX, bodyY, bodyWidth, 18, 5).fill(accent);
    useFont(doc, 'BodyBold', 'Helvetica-Bold');
    doc.fontSize(6.8).fillColor('#ffffff');
    columns.forEach((column, index) => {
      doc.text(renderText(column, context), bodyX + index * columnWidth + 4, bodyY + 5, { width: columnWidth - 8 });
    });
    useFont(doc, 'Body', 'Helvetica');
    doc.fontSize(6.7).fillColor(style.textColor || '#0f172a');
    rows.forEach((row, rowIndex) => {
      const rowY = bodyY + 18 + rowIndex * 18;
      doc.rect(bodyX, rowY, bodyWidth, 18).fill(rowIndex % 2 ? '#ffffff' : '#f8fafc');
      row.slice(0, columns.length).forEach((cell, cellIndex) => {
        doc.fillColor(style.textColor || '#0f172a').text(renderText(cell, context), bodyX + cellIndex * columnWidth + 4, rowY + 5, { width: columnWidth - 8 });
      });
    });
    doc.rect(bodyX, bodyY, bodyWidth, Math.min(bodyHeight, 18 + rows.length * 18)).strokeColor(style.borderColor || '#d8e5f7').lineWidth(0.4).stroke();
    return;
  }
  if (kind === 'amount') {
    const rows = Array.isArray(content.rows) && content.rows.length ? content.rows.slice(0, 5) : [['Total', 'Rs. 0']];
    useFont(doc, 'Body', 'Helvetica');
    rows.forEach(([label, value], index) => {
      const rowY = bodyY + index * 17;
      doc.fontSize(7.4).fillColor('#64748b').text(renderText(label, context), bodyX, rowY, { width: bodyWidth * 0.55 });
      useFont(doc, index === rows.length - 1 ? 'BodyBold' : 'Body', index === rows.length - 1 ? 'Helvetica-Bold' : 'Helvetica');
      doc.fontSize(index === rows.length - 1 ? 8.6 : 7.6).fillColor(index === rows.length - 1 ? accent : (style.textColor || '#0f172a'))
        .text(renderText(value, context), bodyX + bodyWidth * 0.55, rowY, { width: bodyWidth * 0.45, align: 'right' });
      useFont(doc, 'Body', 'Helvetica');
    });
    return;
  }
  const rows = Array.isArray(content.rows) ? content.rows.slice(0, 6) : [];
  if (rows.length) {
    rows.forEach(([label, value], index) => {
      const rowY = bodyY + index * 14;
      useFont(doc, 'Body', 'Helvetica');
      doc.fontSize(6.9).fillColor('#64748b').text(renderText(label, context), bodyX, rowY, { width: bodyWidth * 0.42 });
      useFont(doc, 'BodyBold', 'Helvetica-Bold');
      doc.fontSize(7.1).fillColor(style.textColor || '#0f172a').text(renderText(value, context), bodyX + bodyWidth * 0.42, rowY, { width: bodyWidth * 0.58 });
    });
    return;
  }
  useFont(doc, 'Body', 'Helvetica');
  doc.fontSize(7.6).fillColor(style.textColor || '#0f172a')
    .text(renderText(content.body || content.text || '-', context), bodyX, bodyY, {
      width: bodyWidth,
      height: bodyHeight,
      lineGap: 2,
      align: style.alignment || element.alignment || 'left'
    });
}

function drawQrElement(doc, element, frame, context) {
  const style = element.style || {};
  const content = contentForElement(element);
  const accent = style.accentColor || '#0284c7';
  drawElementShell(doc, element, frame);
  const size = Math.min(64, Math.max(42, frame.height - 30), Math.max(42, frame.width * 0.34));
  drawQrPattern(doc, frame.x + 14, frame.y + 16, size, accent);
  useFont(doc, 'BodyBold', 'Helvetica-Bold');
  doc.fontSize(9).fillColor(accent).text(renderText(content.label || 'QR CODE', context), frame.x + size + 28, frame.y + 18, { width: Math.max(20, frame.width - size - 42) });
  useFont(doc, 'Body', 'Helvetica');
  doc.fontSize(7.8).fillColor(style.textColor || '#334155')
    .text(renderText(content.helperText || `${content.qrType || element.qrType || 'payment'} QR placeholder`, context), frame.x + size + 28, frame.y + 36, {
      width: Math.max(20, frame.width - size - 42),
      height: Math.max(8, frame.height - 42),
      lineGap: 2
    });
}

function drawSignatureElement(doc, element, frame, context) {
  const style = element.style || {};
  const content = contentForElement(element);
  drawElementShell(doc, element, frame);
  useFont(doc, 'BodyBold', 'Helvetica-Bold');
  doc.fontSize(8.6).fillColor(style.textColor || '#0f172a')
    .text(renderText(content.label || 'Authorized Signature', context), frame.x + 12, frame.y + 12, { width: frame.width - 24, align: style.alignment || element.alignment || 'left' });
  const lineY = frame.y + frame.height - 30;
  doc.strokeColor(style.borderColor || '#94a3b8').lineWidth(0.8).moveTo(frame.x + 18, lineY).lineTo(frame.x + frame.width - 18, lineY).stroke();
  useFont(doc, 'Body', 'Helvetica');
  doc.fontSize(7.6).fillColor('#64748b').text(renderText([content.name, content.designation].filter(Boolean).join(' / ') || 'Name / designation', context), frame.x + 18, lineY + 8, {
    width: frame.width - 36,
    align: style.alignment || element.alignment || 'center'
  });
}

function drawImageElement(doc, element, frame, company = {}) {
  const style = element.style || {};
  const content = contentForElement(element);
  drawElementShell(doc, element, frame);
  const logoPath = company.logoFilePath;
  if ((content.imageMode || 'logo') === 'logo' && logoPath && fs.existsSync(logoPath)) {
    doc.image(logoPath, frame.x + 12, frame.y + 12, {
      fit: [Math.max(20, frame.width - 24), Math.max(20, frame.height - 24)],
      align: 'center',
      valign: 'center'
    });
    return;
  }
  useFont(doc, 'BodyBold', 'Helvetica-Bold');
  doc.fontSize(9).fillColor(style.textColor || '#64748b')
    .text(cleanText(content.label, 'Image / Logo'), frame.x + 12, frame.y + Math.max(12, frame.height / 2 - 5), { width: frame.width - 24, align: 'center' });
}

function drawSpacerElement(doc, element, frame) {
  const style = element.style || {};
  doc.save();
  doc.roundedRect(frame.x, frame.y, frame.width, frame.height, 6)
    .strokeColor(style.borderColor || '#cbd5e1')
    .lineWidth(0.7)
    .dash(3, { space: 3 })
    .stroke();
  if (doc.undash) doc.undash();
  useFont(doc, 'BodyBold', 'Helvetica-Bold');
  doc.fontSize(7.5).fillColor('#94a3b8').text(cleanText(contentForElement(element).label, 'Spacer'), frame.x, frame.y + Math.max(4, frame.height / 2 - 4), { width: frame.width, align: 'center' });
  doc.restore();
}

function drawTableElement(doc, element, frame, context) {
  const style = element.style || {};
  const content = contentForElement(element);
  const accent = style.accentColor || '#0f2a52';
  const columns = Array.isArray(content.columns) && content.columns.length ? content.columns.slice(0, 6) : ['Description', 'Qty', 'Rate', 'Total'];
  const rows = Array.isArray(content.rows) && content.rows.length ? content.rows.slice(0, 12) : [['Item', '1', 'Rs. 0', 'Rs. 0']];
  const paddingX = 10;
  const titleHeight = content.title ? 16 : 0;
  const tableX = frame.x + paddingX;
  const tableY = frame.y + 8 + titleHeight;
  const tableWidth = Math.max(20, frame.width - paddingX * 2);
  const rowHeight = clampNumber(style.rowHeight, 18, 12, 34);
  const columnWidth = tableWidth / columns.length;
  drawElementShell(doc, element, frame);
  if (content.title) {
    useFont(doc, 'BodyBold', 'Helvetica-Bold');
    doc.fontSize(Math.max(7, clampNumber(style.fontSize, 12, 8, 32) * 0.72)).fillColor(accent)
      .text(renderText(content.title, context), frame.x + paddingX, frame.y + 8, { width: tableWidth, height: 12 });
  }
  doc.roundedRect(tableX, tableY, tableWidth, rowHeight, 4).fill(accent);
  useFont(doc, 'BodyBold', 'Helvetica-Bold');
  doc.fontSize(Math.max(5.8, clampNumber(style.fontSize, 10, 8, 32) * 0.62)).fillColor('#ffffff');
  columns.forEach((column, index) => {
    doc.text(renderText(column, context), tableX + index * columnWidth + 4, tableY + 5, {
      width: Math.max(8, columnWidth - 8),
      height: rowHeight - 6
    });
  });
  useFont(doc, 'Body', 'Helvetica');
  doc.fontSize(Math.max(5.8, clampNumber(style.fontSize, 10, 8, 32) * 0.6));
  rows.forEach((row, rowIndex) => {
    const rowY = tableY + rowHeight + rowIndex * rowHeight;
    if (rowY + rowHeight > frame.y + frame.height - 6) return;
    doc.rect(tableX, rowY, tableWidth, rowHeight).fill(rowIndex % 2 ? '#ffffff' : '#f8fafc');
    (Array.isArray(row) ? row : [row]).slice(0, columns.length).forEach((cell, cellIndex) => {
      doc.fillColor(style.textColor || '#0f172a').text(renderText(cell, context), tableX + cellIndex * columnWidth + 4, rowY + 5, {
        width: Math.max(8, columnWidth - 8),
        height: rowHeight - 6,
        lineGap: 1
      });
    });
  });
  const tableHeight = Math.min(rowHeight * (rows.length + 1), Math.max(rowHeight, frame.y + frame.height - tableY - 6));
  doc.rect(tableX, tableY, tableWidth, tableHeight).strokeColor(style.borderColor || '#d8e5f7').lineWidth(0.5).stroke();
}

function drawIconElement(doc, element, frame, context) {
  const style = element.style || {};
  const content = contentForElement(element);
  const accent = style.accentColor || '#0284c7';
  const label = renderText(content.label || content.iconName || element.name || 'Icon', context);
  drawElementShell(doc, element, frame);
  const iconSize = Math.min(22, Math.max(12, frame.height - 14), Math.max(12, frame.width * 0.32));
  const iconX = frame.x + 8;
  const iconY = frame.y + Math.max(6, (frame.height - iconSize) / 2);
  doc.roundedRect(iconX, iconY, iconSize, iconSize, Math.max(4, iconSize / 4)).fill(accent);
  useFont(doc, 'BodyBold', 'Helvetica-Bold');
  doc.fontSize(Math.max(7, iconSize * 0.42)).fillColor('#ffffff').text(label.slice(0, 1).toUpperCase(), iconX, iconY + iconSize * 0.32, {
    width: iconSize,
    align: 'center'
  });
  doc.fontSize(clampNumber(style.fontSize, 10, 8, 32)).fillColor(style.textColor || '#0f172a')
    .text(label, iconX + iconSize + 7, frame.y + Math.max(5, frame.height / 2 - 5), {
      width: Math.max(8, frame.width - iconSize - 22),
      height: Math.max(8, frame.height - 10),
      align: style.alignment || element.alignment || 'left'
    });
}

function drawDesignElement(doc, element, context, company) {
  const frame = designElementFrame(element);
  if (element.type === 'section') return drawSectionElement(doc, element, frame, context);
  if (element.type === 'divider') return drawDividerElement(doc, element, frame, context);
  if (element.type === 'spacer') return drawSpacerElement(doc, element, frame);
  if (element.type === 'table') return drawTableElement(doc, element, frame, context);
  if (element.type === 'icon') return drawIconElement(doc, element, frame, context);
  if (element.type === 'card') return drawCardElement(doc, element, frame, context);
  if (element.type === 'qr') return drawQrElement(doc, element, frame, context);
  if (element.type === 'signature') return drawSignatureElement(doc, element, frame, context);
  if (element.type === 'image') return drawImageElement(doc, element, frame, company);
  return drawTextElement(doc, element, frame, context);
}

function drawDesignPdfPages(doc, options = {}) {
  const { config = {}, context = {}, company = {} } = options;
  const elements = options.elements || designElements(config);
  if (!elements.length) return 0;
  let pagesAdded = 0;
  designPagesForElements(config, elements).forEach((page) => {
    if (!page.elements.length) return;
    if (pagesAdded > 0 || options.useCurrentPageForFirst !== true) {
      doc.addPage({ size: 'A4', margin: 0 });
    }
    pagesAdded += 1;
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(config.design?.page?.backgroundColor || '#ffffff');
    doc.strokeColor('#e2e8f0').lineWidth(0.7).rect(18, 18, PAGE_WIDTH - 36, PAGE_HEIGHT - 36).stroke();
    page.elements
      .slice()
      .sort((a, b) => Number(a.zIndex || 0) - Number(b.zIndex || 0))
      .forEach((element) => drawDesignElement(doc, element, context, company));
  });
  return pagesAdded;
}

export function shouldRenderVisualDesign(config = {}) {
  return config.design?.enabled === true
    && config.design?.visualElementMode !== false
    && designElements(config).length > 0;
}

export function drawVisualDesignPdf(doc, options = {}) {
  return drawDesignPdfPages(doc, { ...options, useCurrentPageForFirst: true });
}

export function drawAdvancedPdfSections(doc, options = {}) {
  const { config = {}, context = {}, title = '', company = {} } = options;
  const cards = sectionCards(config);
  const positionedElements = designElements(config);
  if (!cards.length && !positionedElements.length) return { pagesAdded: 0 };

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

  if (cards.length) {
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
  }

  pagesAdded += drawDesignPdfPages(doc, { config, context, title, company, elements: positionedElements });

  return { pagesAdded };
}
