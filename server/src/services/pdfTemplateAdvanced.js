import fs from 'node:fs';
import { LOGO_FULL_PATH, LOGO_ICON_PATH } from '../config.js';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const PAGE_X = 34;
const PAGE_RIGHT = 561;
const CONTENT_WIDTH = PAGE_RIGHT - PAGE_X;
const FOOTER_SAFE_Y = 770;
const PAGE_BOTTOM_SAFE_Y = PAGE_HEIGHT - 8;
const TABLE_TO_FINAL_GAP = 36;
const AMOUNT_TO_NEXT_GAP = 24;
const SECTION_TO_SECTION_GAP = 8;
const TERMS_TO_FOOTER_GAP = 24;

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
      meaningfulText(card.content, context),
      meaningfulText(card.body, context),
      meaningfulText(card.note, context),
      meaningfulText(card.upiText, context),
      meaningfulText(card.paymentText, context),
      meaningfulText(card.qrText, context),
      meaningfulText(card.variable, context),
      meaningfulText(card.qrValue, context),
      meaningfulText(card.qrImage, context),
      meaningfulText(card.qrImageUrl, context),
      meaningfulText(card.imageUrl, context)
    ].filter(Boolean).join('\n');
  }
  if (card.type === 'signature') {
    return [
      meaningfulText(card.content, context),
      meaningfulText(card.body, context),
      meaningfulText(card.personName, context),
      meaningfulText(card.designation, context),
      meaningfulText(card.name, context),
      meaningfulText(card.signatureText, context),
      meaningfulText(card.backupText, context),
      meaningfulText(card.variable, context),
      meaningfulText(card.imageUrl, context),
      meaningfulText(card.signatureImageUrl, context)
    ].filter(Boolean).join('\n');
  }
  return meaningfulText(card.content, context)
    || meaningfulText(card.body, context)
    || meaningfulText(card.variable, context);
}

function meaningfulText(value, context = {}) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const rendered = renderText(raw, context).trim();
  if (!rendered || rendered === '-' || /^-+$/.test(rendered)) return '';
  return rendered;
}

function defaultTitleLabels(type = '') {
  const base = String(type || '').toLowerCase();
  const label = String(CARD_LABELS[type] || '').toLowerCase();
  const labels = new Set([
    base,
    label,
    `${base} card`,
    `${label} card`,
    'custom section'
  ].filter(Boolean));
  if (base === 'qr') {
    labels.add('qr / payment card');
    labels.add('payment details');
    labels.add('qr code');
  }
  if (base === 'signature') {
    labels.add('signature card');
    labels.add('authorized signature');
  }
  if (base === 'spacer' || base === 'divider') {
    labels.add('divider');
    labels.add('spacer');
  }
  return labels;
}

function hasMeaningfulTitle(card = {}, context = {}) {
  const title = meaningfulText(card.title, context);
  if (!title) return false;
  return !defaultTitleLabels(card.type).has(title.toLowerCase());
}

function firstMeaningfulValue(card = {}, context = {}, fields = []) {
  return fields.some((field) => meaningfulText(card[field], context));
}

function hasPrintableCardContent(card = {}, context = {}) {
  if (card?.enabled === false) return false;
  const type = card.type || 'text';
  if (type === 'spacer' || type === 'divider') return true;

  if (type === 'qr') {
    return firstMeaningfulValue(card, context, [
      'content',
      'body',
      'variable',
      'note',
      'upiText',
      'paymentText',
      'qrValue',
      'qrText',
      'qrImage',
      'qrImageUrl',
      'imageUrl'
    ]);
  }

  if (type === 'signature') {
    return firstMeaningfulValue(card, context, [
      'content',
      'body',
      'variable',
      'personName',
      'designation',
      'name',
      'signatureText',
      'backupText',
      'imageUrl',
      'signatureImageUrl'
    ]);
  }

  return hasMeaningfulTitle(card, context) || Boolean(cardBodyText(card, context).trim());
}

function defaultCardHeight(card = {}) {
  if (card.type === 'spacer') return 28;
  if (card.type === 'qr') return 112;
  if (card.type === 'signature') return 96;
  return 84;
}

function useFont(doc, name, fallback) {
  try {
    doc.font(name);
  } catch {
    doc.font(fallback);
  }
}

function sectionCards(config = {}, context = {}) {
  if (config.advancedEnabled !== true) return [];
  const customCards = config.structured?.customSectionsEnabled === true && Array.isArray(config.structured?.customSections)
    ? config.structured.customSections.filter((section) => hasPrintableCardContent(section, context))
    : [];
  const cards = [...customCards];
  const hasQrCard = cards.some((card) => card.type === 'qr');
  const hasSignatureCard = cards.some((card) => card.type === 'signature');
  if (config.structured?.qrPaymentCardEnabled === true && !hasQrCard) {
    const card = qrPaymentCard(config);
    if (hasPrintableCardContent(card, context)) cards.push(card);
  }
  if (config.structured?.signatureCardEnabled === true && !hasSignatureCard) {
    const card = signatureCard(config);
    if (hasPrintableCardContent(card, context)) cards.push(card);
  }
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
    content: rows.join('\n'),
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
  const textWidth = card.type === 'qr' ? width - 126 : width - 58;
  const textHeight = content ? doc.fontSize(8.4).heightOfString(content, { width: Math.max(48, textWidth), lineGap: 2 }) : 0;
  return Math.max(Number(card.minHeight || defaultCardHeight(card)), textHeight + 56);
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
  doc.roundedRect(PAGE_X, 30, CONTENT_WIDTH, 54, 10).fill('#f7fbff');
  doc.roundedRect(PAGE_X, 30, CONTENT_WIDTH, 54, 10).strokeColor('#d8e5f7').lineWidth(0.8).stroke();
  doc.rect(PAGE_X, 30, 4, 54).fill(accentColor);
  useFont(doc, 'BodyBold', 'Helvetica-Bold');
  doc.fontSize(12).fillColor(accentColor).text(cleanText(company?.name, 'Universal Systems'), PAGE_X + 18, 43, { width: 230 });
  doc.fontSize(10).fillColor('#0f172a').text('Additional Information', PAGE_X + 18, 61, { width: 230 });
  useFont(doc, 'Body', 'Helvetica');
  doc.fontSize(7.6).fillColor('#64748b').text(cleanText(title, 'PDF Template'), PAGE_RIGHT - 220, 46, { width: 198, align: 'right' });
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

function drawCardMark(doc, type, x, y, accent) {
  const labels = {
    text: 'T',
    info: 'i',
    notice: '!',
    qr: 'QR',
    signature: 'S',
    payment: 'Rs',
    bank: 'Rs',
    terms: 'T'
  };
  const label = labels[type] || '*';
  doc.save();
  doc.roundedRect(x, y, 22, 22, 6).fill('#f0f7ff');
  doc.roundedRect(x, y, 22, 22, 6).strokeColor('#cfe3f8').lineWidth(0.55).stroke();
  useFont(doc, 'BodyBold', 'Helvetica-Bold');
  doc.fontSize(label.length > 1 ? 6.6 : 9).fillColor(accent).text(label, x, y + 6, { width: 22, align: 'center' });
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
    doc.strokeColor('#cfe3f8').lineWidth(0.7).moveTo(x, y + Math.floor(height / 2)).lineTo(x + width, y + Math.floor(height / 2)).stroke();
    if (label) {
      useFont(doc, 'BodyBold', 'Helvetica-Bold');
      doc.roundedRect(x + 12, y + Math.floor(height / 2) - 9, Math.min(190, width - 24), 18, 9).fill('#ffffff');
      doc.roundedRect(x + 12, y + Math.floor(height / 2) - 9, Math.min(190, width - 24), 18, 9).strokeColor('#d8e5f7').lineWidth(0.45).stroke();
      doc.fontSize(7.8).fillColor(accent).text(label, x + 20, y + Math.floor(height / 2) - 5, { width: Math.min(174, width - 40) });
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
  doc.roundedRect(x + 12, y + 12, width - 24, Math.max(1, height - 24), 5).fillOpacity(0.025).fill(accent).fillOpacity(1);
  doc.rect(x, y, 4, height).fill(accent);
  drawCardMark(doc, card.type, x + 16, y + 12, accent);
  const label = cleanText(card.title, CARD_LABELS[card.type] || 'Custom Section');
  useFont(doc, 'BodyBold', 'Helvetica-Bold');
  doc.fontSize(9.8).fillColor(accent).text(label, x + 48, y + 15, { width: width - 68 });

  if (card.type === 'signature') {
    doc.strokeColor('#94a3b8').lineWidth(0.7).moveTo(x + width - 190, y + height - 28).lineTo(x + width - 28, y + height - 28).stroke();
    useFont(doc, 'Body', 'Helvetica');
    const signatureText = cardBodyText(card, context);
    if (signatureText) {
      doc.fontSize(7.8).fillColor('#64748b').text(signatureText, x + width - 190, y + height - 18, { width: 162, align: 'center' });
    }
    doc.restore();
    return;
  }

  if (card.type === 'qr') {
    drawQrPattern(doc, x + 20, y + 42, 58, accent);
    useFont(doc, 'Body', 'Helvetica');
    const qrText = cardBodyText(card, context);
    if (qrText) {
      doc.fontSize(8.3).fillColor(textColor).text(qrText, x + 96, y + 45, { width: width - 124, lineGap: 2 });
    }
    doc.restore();
    return;
  }

  useFont(doc, 'Body', 'Helvetica');
  const body = cardBodyText(card, context);
  if (body) {
    doc.fontSize(8.4).fillColor(textColor).text(body, x + 20, y + 46, { width: width - 40, lineGap: 2 });
  }
  doc.restore();
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function isInvoiceManifestElement(element = {}) {
  return [
    element.id,
    element.sourceKey,
    element.manifestSemanticId,
    element.manifest?.semanticId
  ].some((value) => {
    const text = String(value || '');
    return text.startsWith('invoice.') || text.replace(/[^a-z0-9]/gi, '').toLowerCase().startsWith('invoice');
  });
}

function isEditorHelperText(value = '') {
  const normalized = String(value || '').trim().toLowerCase();
  return [
    '',
    'divider',
    'spacer',
    'add details here',
    'image / logo',
    'text block',
    'new text block',
    'card title',
    'card',
    'table',
    'icon'
  ].includes(normalized);
}

function printableText(value = '', fallback = '', options = {}) {
  const raw = String(value ?? '').trim();
  if (options.suppressHelpers && isEditorHelperText(raw)) return '';
  if (!raw) return fallback;
  return raw;
}

function designElements(config = {}) {
  if (config.design?.enabled !== true) return [];
  if (config.design?.published !== true && config.design?.previewDraft !== true) return [];
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
  if (isInvoiceManifestElement(element)) {
    let x = clampNumber(element.x, 0, 0, PAGE_WIDTH);
    let y = clampNumber(element.y, 0, 0, PAGE_HEIGHT);
    let width = clampNumber(element.width, 1, 0.1, PAGE_WIDTH);
    let height = clampNumber(element.height, 1, 0.1, PAGE_HEIGHT);
    if (x + width > PAGE_WIDTH) width = Math.max(0.1, PAGE_WIDTH - x);
    if (y + height > PAGE_HEIGHT) height = Math.max(0.1, PAGE_HEIGHT - y);
    return { x, y, width, height };
  }
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
  const transparentBackground = String(background).toLowerCase() === 'transparent';
  if (!style.shadow && transparentBackground && borderWidth <= 0) return;
  if (style.shadow) {
    doc.save();
    doc.opacity(0.08).roundedRect(frame.x + 4, frame.y + 5, frame.width, frame.height, radius).fill('#0f172a');
    doc.restore();
  }
  if (!transparentBackground) {
    doc.roundedRect(frame.x, frame.y, frame.width, frame.height, radius).fill(background);
  }
  if (borderWidth > 0) {
    doc.roundedRect(frame.x, frame.y, frame.width, frame.height, radius)
      .strokeColor(borderColor)
      .lineWidth(borderWidth)
      .stroke();
  }
}

function drawDividerElement(doc, element, frame, context = {}) {
  const style = element.style || {};
  const invoiceElement = isInvoiceManifestElement(element);
  const color = style.accentColor || '#0284c7';
  const vertical = style.orientation === 'vertical'
    || Number(style.rotate) === 90
    || (invoiceElement && !style.orientation && frame.height > frame.width);
  const lineWidth = invoiceElement ? clampNumber(style.dividerThickness, 1, 0.1, 8) : clampNumber(style.dividerThickness, 2, 1, 8);
  doc.save();
  doc.strokeColor(color).lineWidth(lineWidth);
  if (style.dividerStyle === 'dashed') doc.dash(6, { space: 4 });
  if (style.dividerStyle === 'dotted') doc.dash(1, { space: 3 });
  if (vertical) {
    const x = frame.x + Math.max(0, frame.width / 2);
    doc.moveTo(x, frame.y).lineTo(x, frame.y + frame.height).stroke();
  } else {
    const y = frame.y + Math.max(0, frame.height / 2);
    doc.moveTo(frame.x, y).lineTo(frame.x + frame.width, y).stroke();
  }
  if (doc.undash) doc.undash();
  const label = invoiceElement && contentForElement(element).renderLabel !== true
    ? ''
    : printableText(contentForElement(element).label, '', { suppressHelpers: invoiceElement });
  if (label && !vertical) {
    const y = frame.y + Math.max(0, frame.height / 2);
    useFont(doc, 'BodyBold', 'Helvetica-Bold');
    doc.roundedRect(frame.x + 12, y - 8, Math.min(170, frame.width - 24), 16, 8).fill('#ffffff');
    doc.fontSize(7.6).fillColor(color).text(renderText(label, context), frame.x + 18, y - 5, { width: Math.min(158, frame.width - 36) });
  }
  doc.restore();
}

function drawTextElement(doc, element, frame, context) {
  const style = element.style || {};
  const content = contentForElement(element);
  const invoiceElement = isInvoiceManifestElement(element);
  const rawText = invoiceElement
    ? printableText(content.text, '', { suppressHelpers: true })
    : (content.text || element.title || element.name || 'Text block');
  const text = renderText(rawText, context);
  if (!text && invoiceElement) return;
  const paddingX = invoiceElement ? 0 : clampNumber(style.paddingX ?? style.padding ?? 12, 12, 0, 48);
  const paddingY = invoiceElement ? 0 : clampNumber(style.paddingY ?? style.padding ?? 12, 12, 0, 48);
  const fontSize = invoiceElement
    ? clampNumber(style.fontSize, 9, 4, 40)
    : clampNumber(style.fontSize, 13, 8, 32);
  const lineHeight = clampNumber(style.lineHeight, invoiceElement ? 1.16 : 1.2, 0.85, 2.4);
  const lineGap = invoiceElement ? Math.max(0, fontSize * (lineHeight - 1)) : 2;
  drawElementShell(doc, element, frame);
  useFont(doc, Number(style.fontWeight || 700) >= 700 ? 'BodyBold' : 'Body', Number(style.fontWeight || 700) >= 700 ? 'Helvetica-Bold' : 'Helvetica');
  doc.fontSize(fontSize).fillColor(style.textColor || element.textColor || '#0f172a')
    .text(text, frame.x + paddingX, frame.y + paddingY, {
      width: Math.max(12, frame.width - paddingX * 2),
      height: Math.max(8, frame.height - paddingY * 2),
      align: style.alignment || element.alignment || 'left',
      lineGap,
      ellipsis: false
    });
}

function drawCardElement(doc, element, frame, context) {
  const style = element.style || {};
  const content = contentForElement(element);
  const invoiceElement = isInvoiceManifestElement(element);
  const accent = style.accentColor || '#0284c7';
  drawElementShell(doc, element, frame);
  if (content.boxOnly) return;
  const title = invoiceElement
    ? printableText(content.title, '', { suppressHelpers: true })
    : printableText(content.title || element.name, 'Card', { suppressHelpers: false });
  const body = invoiceElement
    ? printableText(content.body, '', { suppressHelpers: true })
    : printableText(content.body, '-', { suppressHelpers: false });
  if (invoiceElement && !title && !body) return;
  doc.rect(frame.x, frame.y, 5, frame.height).fill(accent);
  useFont(doc, 'BodyBold', 'Helvetica-Bold');
  doc.fontSize(Math.max(8, clampNumber(style.fontSize, 13, 8, 32) * 0.78)).fillColor(accent)
    .text(renderText(title, context), frame.x + 16, frame.y + 12, { width: Math.max(12, frame.width - 32) });
  useFont(doc, Number(style.fontWeight || 700) >= 700 ? 'BodyBold' : 'Body', Number(style.fontWeight || 700) >= 700 ? 'Helvetica-Bold' : 'Helvetica');
  doc.fontSize(clampNumber(style.fontSize, 13, 8, 32) * 0.72).fillColor(style.textColor || '#0f172a')
    .text(renderText(body, context), frame.x + 16, frame.y + 34, {
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
  const headerBackground = style.headerBackgroundColor || accent;
  const headerTextColor = style.headerTextColor || '#ffffff';
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
    doc.roundedRect(bodyX, bodyY, bodyWidth, 18, 5).fill(headerBackground);
    useFont(doc, 'BodyBold', 'Helvetica-Bold');
    doc.fontSize(6.8).fillColor(headerTextColor);
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

function resolveDesignImagePath(content = {}, company = {}) {
  const mode = String(content.imageMode || '').toLowerCase();
  const assetPath = String(content.assetPath || content.imageUrl || content.src || '').trim();
  if (mode === 'watermark' || assetPath.endsWith('/logo-icon.png') || assetPath.endsWith('\\logo-icon.png')) {
    return fs.existsSync(LOGO_ICON_PATH) ? LOGO_ICON_PATH : '';
  }
  if (assetPath.endsWith('/logo-full.png') || assetPath.endsWith('\\logo-full.png')) {
    return fs.existsSync(LOGO_FULL_PATH) ? LOGO_FULL_PATH : '';
  }
  if (mode === 'logo' || !mode) {
    const logoPath = company.logoFilePath || LOGO_FULL_PATH;
    if (logoPath && fs.existsSync(logoPath)) return logoPath;
    return fs.existsSync(LOGO_FULL_PATH) ? LOGO_FULL_PATH : '';
  }
  if (assetPath && fs.existsSync(assetPath)) return assetPath;
  return '';
}

function drawImageElement(doc, element, frame, company = {}) {
  const style = element.style || {};
  const content = contentForElement(element);
  const invoiceElement = isInvoiceManifestElement(element);
  drawElementShell(doc, element, frame);
  const imagePath = resolveDesignImagePath(content, company);
  if (imagePath) {
    const padding = content.fitToFrame ? 0 : clampNumber(style.padding ?? 12, 12, 0, 48);
    const minFit = invoiceElement ? 0.1 : 20;
    const imageWidth = Math.max(minFit, frame.width - padding * 2);
    const imageHeight = Math.max(minFit, frame.height - padding * 2);
    const objectFit = ['cover', 'fill'].includes(content.objectFit) ? content.objectFit : 'contain';
    const imageOptions = {
      align: 'center',
      valign: 'center'
    };
    if (objectFit === 'cover') imageOptions.cover = [imageWidth, imageHeight];
    else if (objectFit === 'fill') {
      imageOptions.width = imageWidth;
      imageOptions.height = imageHeight;
    } else {
      imageOptions.fit = [imageWidth, imageHeight];
    }
    doc.image(imagePath, frame.x + padding, frame.y + padding, imageOptions);
    return;
  }
  if (invoiceElement) return;
  useFont(doc, 'BodyBold', 'Helvetica-Bold');
  doc.fontSize(9).fillColor(style.textColor || '#64748b')
    .text(cleanText(content.label, 'Image / Logo'), frame.x + 12, frame.y + Math.max(12, frame.height / 2 - 5), { width: frame.width - 24, align: 'center' });
}

function drawSpacerElement(doc, element, frame) {
  const style = element.style || {};
  const invoiceElement = isInvoiceManifestElement(element);
  const label = printableText(contentForElement(element).label, '', { suppressHelpers: invoiceElement });
  if (invoiceElement && !label) return;
  doc.save();
  doc.roundedRect(frame.x, frame.y, frame.width, frame.height, 6)
    .strokeColor(style.borderColor || '#cbd5e1')
    .lineWidth(0.7)
    .dash(3, { space: 3 })
    .stroke();
  if (doc.undash) doc.undash();
  if (label) {
    useFont(doc, 'BodyBold', 'Helvetica-Bold');
    doc.fontSize(7.5).fillColor('#94a3b8').text(label, frame.x, frame.y + Math.max(4, frame.height / 2 - 4), { width: frame.width, align: 'center' });
  }
  doc.restore();
}

function tableColumnWidths(content = {}, columns = [], tableWidth = 0) {
  const source = Array.isArray(content.columnWidths) ? content.columnWidths : [];
  const weights = columns.map((_column, index) => {
    const value = Number(source[index]);
    return Number.isFinite(value) && value > 0 ? value : 1;
  });
  const total = weights.reduce((sum, value) => sum + value, 0) || columns.length || 1;
  return weights.map((value) => (tableWidth * value) / total);
}

function tableRowsForElement(content = {}, context = {}) {
  const previewRows = Array.isArray(content.rows) && content.rows.length ? content.rows.slice(0, 12) : [['Item', '1', 'Rs. 0', 'Rs. 0']];
  if (content.dynamicRows !== true || !Array.isArray(context.invoice_items) || !context.invoice_items.length) return previewRows;
  const rowTemplate = Array.isArray(content.rowTemplate) && content.rowTemplate.length
    ? content.rowTemplate
    : ['{{item_index}}', '{{item_description}}', '{{item_quantity}}', '{{item_unit_price}}', '{{item_total}}'];
  return context.invoice_items.map((item) => rowTemplate.map((cell) => renderText(cell, { ...context, ...item })));
}

function drawTableElement(doc, element, frame, context, options = {}) {
  const style = element.style || {};
  const content = contentForElement(element);
  const invoiceElement = isInvoiceManifestElement(element);
  const accent = style.accentColor || '#0f2a52';
  const headerBackground = style.headerBackgroundColor || accent;
  const headerTextColor = style.headerTextColor || '#ffffff';
  const columns = Array.isArray(content.columns) && content.columns.length ? content.columns.slice(0, 6) : ['Description', 'Qty', 'Rate', 'Total'];
  const rows = Array.isArray(options.rows) ? options.rows : tableRowsForElement(content, context);
  const outerPaddingX = clampNumber(style.tablePaddingX ?? style.outerPaddingX ?? style.padding ?? 0, 0, 0, 48);
  const outerPaddingY = clampNumber(style.tablePaddingY ?? style.outerPaddingY ?? style.padding ?? 0, 0, 0, 48);
  const cellPaddingX = clampNumber(style.paddingX, 4, 0, 24);
  const cellPaddingY = clampNumber(style.paddingY, 5, 0, 24);
  const rowBackgroundColor = style.rowBackgroundColor || '#ffffff';
  const alternateRowBackgroundColor = style.alternateRowBackgroundColor || '#f8fafc';
  const borderColor = style.borderColor || '#d8e5f7';
  const borderWidth = clampNumber(style.borderWidth, 0.5, 0, 4);
  const tableTitle = printableText(content.title, '', { suppressHelpers: invoiceElement });
  const titleHeight = tableTitle ? 16 : 0;
  const tableX = frame.x + outerPaddingX;
  const tableY = frame.y + outerPaddingY + titleHeight;
  const tableWidth = Math.max(20, frame.width - outerPaddingX * 2);
  const rowHeight = clampNumber(style.rowHeight, 18, 12, 34);
  const columnWidths = tableColumnWidths(content, columns, tableWidth);
  const align = style.alignment || element.alignment || 'left';
  drawElementShell(doc, element, frame);
  if (tableTitle) {
    useFont(doc, 'BodyBold', 'Helvetica-Bold');
    doc.fontSize(Math.max(7, clampNumber(style.fontSize, 12, 8, 32) * 0.72)).fillColor(accent)
      .text(renderText(tableTitle, context), frame.x + outerPaddingX, frame.y + 8, { width: tableWidth, height: 12 });
  }
  doc.roundedRect(tableX, tableY, tableWidth, rowHeight, 4).fill(headerBackground);
  useFont(doc, 'BodyBold', 'Helvetica-Bold');
  doc.fontSize(Math.max(5.8, clampNumber(style.fontSize, 10, 8, 32) * 0.62)).fillColor(headerTextColor);
  let columnX = tableX;
  columns.forEach((column, index) => {
    const columnWidth = columnWidths[index] || (tableWidth / columns.length);
    doc.text(renderText(column, context), columnX + cellPaddingX, tableY + cellPaddingY, {
      width: Math.max(8, columnWidth - cellPaddingX * 2),
      height: Math.max(6, rowHeight - cellPaddingY * 2),
      align
    });
    columnX += columnWidth;
  });
  useFont(doc, 'Body', 'Helvetica');
  doc.fontSize(Math.max(5.8, clampNumber(style.fontSize, 10, 8, 32) * 0.6));
  rows.forEach((row, rowIndex) => {
    const rowY = tableY + rowHeight + rowIndex * rowHeight;
    if (rowY + rowHeight > frame.y + frame.height - 6) return;
    doc.rect(tableX, rowY, tableWidth, rowHeight).fill(rowIndex % 2 ? alternateRowBackgroundColor : rowBackgroundColor);
    columnX = tableX;
    (Array.isArray(row) ? row : [row]).slice(0, columns.length).forEach((cell, cellIndex) => {
      const columnWidth = columnWidths[cellIndex] || (tableWidth / columns.length);
      doc.fillColor(style.textColor || '#0f172a').text(renderText(cell, context), columnX + cellPaddingX, rowY + cellPaddingY, {
        width: Math.max(8, columnWidth - cellPaddingX * 2),
        height: Math.max(6, rowHeight - cellPaddingY * 2),
        lineGap: 1,
        align
      });
      columnX += columnWidth;
    });
  });
  const tableHeight = Math.min(rowHeight * (rows.length + 1), Math.max(rowHeight, frame.y + frame.height - tableY - 6));
  if (borderWidth > 0) {
    doc.rect(tableX, tableY, tableWidth, tableHeight).strokeColor(borderColor).lineWidth(borderWidth).stroke();
  }
}

function visibleTableRowCapacity(element, frame) {
  const style = element.style || {};
  const content = contentForElement(element);
  const invoiceElement = isInvoiceManifestElement(element);
  const tableTitle = printableText(content.title, '', { suppressHelpers: invoiceElement });
  const titleHeight = tableTitle ? 16 : 0;
  const outerPaddingY = clampNumber(style.tablePaddingY ?? style.outerPaddingY ?? style.padding ?? 0, 0, 0, 48);
  const rowHeight = clampNumber(style.rowHeight, 18, 12, 34);
  const tableY = frame.y + outerPaddingY + titleHeight;
  const rowsTop = tableY + rowHeight;
  const rowsBottom = frame.y + frame.height - 6;
  return Math.max(1, Math.floor((rowsBottom - rowsTop) / rowHeight));
}

function continuationTableFrame(sourceFrame) {
  const top = Math.max(96, Math.min(sourceFrame.y, 140));
  return {
    x: sourceFrame.x,
    y: top,
    width: sourceFrame.width,
    height: Math.max(120, FOOTER_SAFE_Y - top)
  };
}

function continuationChunksForTable(element, frame, context) {
  const content = contentForElement(element);
  if (content.dynamicRows !== true) return [];
  const rows = tableRowsForElement(content, context);
  const firstCapacity = visibleTableRowCapacity(element, frame);
  if (rows.length <= firstCapacity) return [];
  const nextFrame = continuationTableFrame(frame);
  const nextCapacity = visibleTableRowCapacity(element, nextFrame);
  const chunks = [];
  for (let cursor = firstCapacity; cursor < rows.length; cursor += nextCapacity) {
    chunks.push({
      rows: rows.slice(cursor, cursor + nextCapacity),
      frame: nextFrame
    });
  }
  return chunks;
}

function visualElementRole(element = {}) {
  const content = contentForElement(element);
  const marker = [
    element.role,
    element.layoutRole,
    element.id,
    element.name,
    element.title,
    element.sourceKey,
    element.manifestSemanticId,
    content.kind,
    content.title,
    content.label,
    content.text
  ].filter(Boolean).join(' ').toLowerCase();
  if (element.type === 'table' || marker.includes('table') || marker.includes('item') || marker.includes('parts')) return 'table';
  if (marker.includes('footer') || marker.includes('thank you') || marker.includes('bottom strip')) return 'footer';
  if (marker.includes('amount') || marker.includes('summary') || marker.includes('total') || marker.includes('balance')) return 'amount';
  if (marker.includes('term') || marker.includes('condition') || marker.includes('warranty')) return 'terms';
  if (marker.includes('signature') || marker.includes('acknowledgement')) return 'signature';
  if (marker.includes('notice') || marker.includes('note') || marker.includes('message')) return 'notice';
  return 'section';
}

function visualGapBetween(previousRole, currentRole) {
  if (!previousRole) return 0;
  if (previousRole === currentRole) return 0;
  if (currentRole === 'footer') return TERMS_TO_FOOTER_GAP;
  if (previousRole === 'amount') return AMOUNT_TO_NEXT_GAP;
  return SECTION_TO_SECTION_GAP;
}

function tableRenderedBottom(element, frame, rows = []) {
  const style = element.style || {};
  const content = contentForElement(element);
  const invoiceElement = isInvoiceManifestElement(element);
  const tableTitle = printableText(content.title, '', { suppressHelpers: invoiceElement });
  const titleHeight = tableTitle ? 16 : 0;
  const outerPaddingY = clampNumber(style.tablePaddingY ?? style.outerPaddingY ?? style.padding ?? 0, 0, 0, 48);
  const rowHeight = clampNumber(style.rowHeight, 18, 12, 34);
  return frame.y + outerPaddingY + titleHeight + rowHeight * ((Array.isArray(rows) ? rows.length : 0) + 1);
}

function elementWithFrame(element = {}, frame = {}, extra = {}) {
  return {
    ...element,
    ...extra,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height
  };
}

function tableElementForRows(element, frame, rows, idSuffix = '') {
  const bottom = tableRenderedBottom(element, frame, rows);
  const nextFrame = {
    ...frame,
    height: Math.max(frame.height, bottom - frame.y + 6)
  };
  return elementWithFrame(element, nextFrame, {
    id: idSuffix ? `${element.id || 'table'}-${idSuffix}` : element.id,
    __pdfRows: rows
  });
}

function fitRowsForFrame(element, frame, rows, startIndex = 0) {
  const capacity = Math.max(1, visibleTableRowCapacity(element, frame));
  const endIndex = Math.min(rows.length, startIndex + capacity);
  return {
    rows: rows.slice(startIndex, endIndex),
    nextIndex: endIndex,
    capacity
  };
}

function layoutLowerElementsForPage(elements = [], startY, pageLimit = PAGE_BOTTOM_SAFE_Y, preserveOriginal = true) {
  if (!elements.length) return { elements: [], fits: true, bottom: startY };
  let previousRole = '';
  let cursor = startY;
  let bottom = startY;
  let fits = true;
  const planned = elements
    .map((element) => ({ element, frame: designElementFrame(element), role: visualElementRole(element) }))
    .sort((a, b) => a.frame.y - b.frame.y || Number(a.element.zIndex || 0) - Number(b.element.zIndex || 0))
    .map(({ element, frame, role }) => {
      const minTop = cursor + visualGapBetween(previousRole, role);
      const y = preserveOriginal ? Math.max(frame.y, minTop) : Math.max(startY, minTop);
      const nextFrame = { ...frame, y };
      const elementBottom = y + frame.height;
      if (elementBottom > pageLimit + 0.5) fits = false;
      cursor = elementBottom;
      bottom = Math.max(bottom, elementBottom);
      previousRole = role;
      return elementWithFrame(element, nextFrame);
    });
  return { elements: planned, fits, bottom };
}

function paginateLowerElements(elements = [], startY, pageLimit = PAGE_BOTTOM_SAFE_Y) {
  if (!elements.length) return [];
  const pages = [];
  let current = [];
  let previousRole = '';
  let cursor = startY;
  elements
    .map((element) => ({ element, frame: designElementFrame(element), role: visualElementRole(element) }))
    .sort((a, b) => a.frame.y - b.frame.y || Number(a.element.zIndex || 0) - Number(b.element.zIndex || 0))
    .forEach(({ element, frame, role }) => {
      const gap = visualGapBetween(previousRole, role);
      let y = current.length ? cursor + gap : startY;
      if (current.length && y + frame.height > pageLimit + 0.5) {
        pages.push(current);
        current = [];
        previousRole = '';
        cursor = startY;
        y = startY;
      }
      const nextFrame = { ...frame, y: Math.max(startY, y) };
      current.push(elementWithFrame(element, nextFrame));
      cursor = nextFrame.y + frame.height;
      previousRole = role;
    });
  if (current.length) pages.push(current);
  return pages;
}

function sortForDrawing(elements = []) {
  return elements.slice().sort((a, b) => Number(a.zIndex || 0) - Number(b.zIndex || 0));
}

function planVisualPageRender(elements = [], context = {}) {
  const sortedElements = sortForDrawing(elements);
  const dynamicTable = sortedElements.find((element) => {
    const content = contentForElement(element);
    return element?.type === 'table' && content.dynamicRows === true;
  });
  if (!dynamicTable) return [{ elements: sortedElements }];

  const tableFrame = designElementFrame(dynamicTable);
  const tableBottom = tableFrame.y + tableFrame.height;
  const lowerElements = sortedElements.filter((element) => {
    if (element === dynamicTable) return false;
    if (shouldRepeatOnTableContinuation(element, tableFrame)) return false;
    return designElementFrame(element).y >= tableBottom - 1;
  });
  const lowerSet = new Set(lowerElements);
  const upperElements = sortedElements.filter((element) => element !== dynamicTable && !lowerSet.has(element));
  const repeatedElements = sortedElements.filter((element) => shouldRepeatOnTableContinuation(element, tableFrame));
  const rows = tableRowsForElement(contentForElement(dynamicTable), context);
  if (!rows.length) return [{ elements: sortedElements }];

  const firstLowerTop = lowerElements.length
    ? Math.min(...lowerElements.map((element) => designElementFrame(element).y))
    : PAGE_BOTTOM_SAFE_Y;
  const firstFrameBottom = Math.max(
    tableFrame.y + 40,
    Math.min(FOOTER_SAFE_Y, firstLowerTop - TABLE_TO_FINAL_GAP)
  );
  const firstFrame = {
    ...tableFrame,
    height: Math.max(40, firstFrameBottom - tableFrame.y)
  };
  const pages = [];
  const firstChunk = fitRowsForFrame(dynamicTable, firstFrame, rows, 0);
  pages.push({
    elements: sortForDrawing([
      ...upperElements,
      tableElementForRows(dynamicTable, firstFrame, firstChunk.rows)
    ])
  });

  let rowCursor = firstChunk.nextIndex;
  let finalTableFrame = firstFrame;
  let finalTableRows = firstChunk.rows;
  let finalPageIndex = 0;

  while (rowCursor < rows.length) {
    const continuationFrame = continuationTableFrame(tableFrame);
    const chunk = fitRowsForFrame(dynamicTable, continuationFrame, rows, rowCursor);
    finalTableFrame = continuationFrame;
    finalTableRows = chunk.rows;
    finalPageIndex = pages.length;
    pages.push({
      elements: sortForDrawing([
        ...repeatedElements,
        tableElementForRows(dynamicTable, continuationFrame, chunk.rows, `continued-${pages.length}`)
      ])
    });
    rowCursor = chunk.nextIndex;
  }

  const finalTableBottom = tableRenderedBottom(dynamicTable, finalTableFrame, finalTableRows);
  const lowerStart = finalTableBottom + TABLE_TO_FINAL_GAP;
  const finalLower = layoutLowerElementsForPage(lowerElements, lowerStart, PAGE_BOTTOM_SAFE_Y, true);
  if (lowerElements.length && finalLower.fits) {
    pages[finalPageIndex] = {
      elements: sortForDrawing([
        ...pages[finalPageIndex].elements,
        ...finalLower.elements
      ])
    };
  } else if (lowerElements.length) {
    const lowerPageTop = Math.max(96, Math.min(firstLowerTop, 140));
    paginateLowerElements(lowerElements, lowerPageTop, PAGE_BOTTOM_SAFE_Y).forEach((lowerPage) => {
      pages.push({ elements: sortForDrawing([...repeatedElements, ...lowerPage]) });
    });
  }
  return pages;
}

function shouldRepeatOnTableContinuation(element, tableFrame) {
  if (!element || element.type === 'table') return false;
  if (element.backgroundElement || element.content?.backgroundElement) return true;
  const frame = designElementFrame(element);
  return frame.y + frame.height <= tableFrame.y - 4;
}

function logSkippedDesignElement(error, element = {}, context = 'visual design') {
  const id = element.id || element.name || element.type || 'unknown';
  console.error(`[PDF ${context}] Skipped invalid element "${id}".`, error?.stack || error);
}

function drawDesignElementSafely(doc, element, context, company, label = 'visual design') {
  try {
    if (element?.type === 'table' && Array.isArray(element.__pdfRows)) {
      drawTableElement(doc, element, designElementFrame(element), context, { rows: element.__pdfRows });
      return;
    }
    drawDesignElement(doc, element, context, company);
  } catch (error) {
    logSkippedDesignElement(error, element, label);
  }
}

function drawScaledIcon(doc, frame, baseSize, draw) {
  const size = Math.max(1, Math.min(frame.width, frame.height));
  const scale = size / baseSize;
  const x = frame.x + Math.max(0, (frame.width - baseSize * scale) / 2);
  const y = frame.y + Math.max(0, (frame.height - baseSize * scale) / 2);
  doc.save();
  doc.translate(x, y);
  doc.scale(scale);
  draw();
  doc.restore();
}

function iconFrameForStyle(frame, style = {}) {
  const explicitSize = Number(style.iconSize || 0);
  if (!Number.isFinite(explicitSize) || explicitSize <= 0) return frame;
  const size = Math.max(4, Math.min(explicitSize, frame.width, frame.height));
  return {
    x: frame.x + Math.max(0, (frame.width - size) / 2),
    y: frame.y + Math.max(0, (frame.height - size) / 2),
    width: size,
    height: size
  };
}

function drawContactVariantIcon(doc, type, frame, color, strokeWidth = 1.15) {
  drawScaledIcon(doc, frame, 18, () => {
    doc.lineWidth(strokeWidth).strokeColor(color).fillColor(color).lineCap('round').lineJoin('round');
    if (type === 'address') {
      doc.circle(7, 6.5, 4.8).stroke();
      doc.circle(7, 6.5, 1.2).fill();
      doc.moveTo(7, 11.3).lineTo(7, 15.8).stroke();
    } else if (type === 'phone') {
      doc.path('M2 2 C4.5 9.5 8.2 13 15.5 15.5').stroke();
      doc.path('M2 2 L5.5 1.3 L7.7 5.3 L5.5 6.7').stroke();
      doc.path('M10.4 10.3 L12 8.2 L16.2 10.5 L15.5 15.5').stroke();
    } else if (type === 'email') {
      doc.roundedRect(1.5, 3, 15, 10.5, 1.4).stroke();
      doc.moveTo(2.8, 4.7).lineTo(9, 9).lineTo(15.2, 4.7).stroke();
    } else if (type === 'website') {
      doc.circle(8.5, 8, 6.3).stroke();
      doc.moveTo(2.5, 8).lineTo(14.5, 8).stroke();
      doc.moveTo(8.5, 1.8).bezierCurveTo(6.1, 4.6, 6.1, 11.4, 8.5, 14.2).stroke();
      doc.moveTo(8.5, 1.8).bezierCurveTo(10.9, 4.6, 10.9, 11.4, 8.5, 14.2).stroke();
    }
  });
}

function drawSmallVariantIcon(doc, type, frame, color, strokeWidth = 1.05) {
  drawScaledIcon(doc, frame, 18, () => {
    doc.lineWidth(strokeWidth).strokeColor(color).fillColor(color).lineCap('round').lineJoin('round');
    if (type === 'invoice') {
      doc.roundedRect(2, 1.5, 12.5, 16, 1.2).stroke();
      doc.moveTo(5, 6).lineTo(11.5, 6).stroke();
      doc.moveTo(5, 9.5).lineTo(11.5, 9.5).stroke();
      doc.moveTo(5, 13).lineTo(10, 13).stroke();
    } else if (type === 'work') {
      doc.roundedRect(1.5, 4, 14, 13, 1.6).stroke();
      doc.roundedRect(5, 1, 7, 4.8, 1.3).stroke();
      doc.circle(12.4, 14.2, 2.4).stroke();
    } else if (type === 'date') {
      doc.roundedRect(1.5, 3.5, 15, 14, 1.5).stroke();
      doc.moveTo(1.5, 7).lineTo(16.5, 7).stroke();
      doc.moveTo(5.2, 1.8).lineTo(5.2, 5).stroke();
      doc.moveTo(12.8, 1.8).lineTo(12.8, 5).stroke();
    } else if (type === 'status') {
      doc.roundedRect(1.5, 4, 15, 11.5, 1.5).stroke();
      doc.moveTo(1.5, 7).lineTo(16.5, 7).stroke();
      doc.circle(12, 12, 1.4).stroke();
    }
  });
}

function drawCheckDotIcon(doc, frame, color, strokeWidth = 1.05) {
  const scale = Math.max(0.1, Math.min(frame.width / 8, frame.height / 8));
  const x = frame.x + Math.max(0, (frame.width - 8 * scale) / 2);
  const y = frame.y + Math.max(0, (frame.height - 8 * scale) / 2);
  doc.save();
  doc.translate(x, y);
  doc.scale(scale);
  doc.circle(4, 4, 4).fillColor(color).fill();
  doc.strokeColor('#ffffff').lineWidth(strokeWidth).lineCap('round').lineJoin('round')
    .moveTo(2.2, 4)
    .lineTo(3.8, 5.8)
    .lineTo(6.4, 2.4)
    .stroke();
  doc.restore();
}

function drawCompletionBadgeIcon(doc, frame, color, strokeWidth = 2.1) {
  const scale = Math.max(0.1, Math.min(frame.width / 34, frame.height / 48));
  const x = frame.x + Math.max(0, (frame.width - 34 * scale) / 2);
  const y = frame.y + Math.max(0, (frame.height - 48 * scale) / 2);
  doc.save();
  doc.translate(x, y);
  doc.scale(scale);
  doc.circle(17, 17, 17).fillColor(color).fill();
  doc.strokeColor('#ffffff').lineWidth(strokeWidth).lineCap('round').lineJoin('round')
    .moveTo(9.4, 17.2)
    .lineTo(14.8, 22.5)
    .lineTo(25.5, 11.6)
    .stroke();
  doc.polygon([7, 30], [1, 48], [12, 43]).fillColor(color).fill();
  doc.polygon([26.5, 30], [34, 48], [21.5, 43]).fillColor(color).fill();
  doc.restore();
}

function iconVariantForEmoji(value = '') {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.includes('📍')) return 'address';
  if (text.includes('☎') || text.includes('📞')) return 'phone';
  if (text.includes('✉') || text.includes('📧')) return 'email';
  if (text.includes('🌐') || text.includes('🌍') || text.includes('🌎')) return 'website';
  if (text.includes('✅') || text.includes('✔') || text.includes('✓')) return 'check';
  if (text.includes('₹')) return 'rupee';
  return '';
}

function drawRupeeIcon(doc, frame, color, strokeWidth = 1.7) {
  const size = Math.min(frame.width, frame.height);
  const x = frame.x + Math.max(0, (frame.width - size) / 2);
  const y = frame.y + Math.max(0, (frame.height - size) / 2);
  doc.circle(x + size / 2, y + size / 2, Math.max(0.1, size / 2 - 1)).strokeColor(color).lineWidth(strokeWidth).stroke();
  useFont(doc, 'BodyBold', 'Helvetica-Bold');
  doc.fontSize(Math.max(12, size * 0.62)).fillColor(color).text('Rs', x, y + size * 0.24, { width: size, align: 'center' });
}

function drawGenericEmojiFallbackIcon(doc, frame, color, strokeWidth = 1.1) {
  drawScaledIcon(doc, frame, 18, () => {
    doc.lineWidth(strokeWidth).strokeColor(color).fillColor(color).lineCap('round').lineJoin('round');
    doc.circle(9, 9, 6.2).stroke();
    doc.moveTo(5.6, 9).lineTo(8, 11.4).lineTo(12.6, 6.6).stroke();
  });
}

const vectorIconNameAliases = {
  'badge-check': 'completion',
  'check-badge': 'completion',
  'check-circle': 'check',
  'circle-check': 'check',
  calendar: 'date',
  mail: 'email',
  file: 'document',
  'file-text': 'document',
  clipboard: 'work',
  'clipboard-check': 'work',
  credit: 'status',
  'credit-card': 'status',
  map: 'address',
  'map-pin': 'address',
  location: 'address',
  globe: 'website',
  web: 'website',
  message: 'whatsapp',
  support: 'headset'
};

function normalizeVectorIconName(value = '') {
  const normalized = String(value || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  return vectorIconNameAliases[normalized] || normalized;
}

function drawStarIcon(doc, frame, color, strokeWidth = 1.25) {
  drawScaledIcon(doc, frame, 24, () => {
    doc.lineWidth(strokeWidth).strokeColor(color).fillColor(color).lineJoin('round');
    doc.path('M12 3 L14.7 8.5 L20.8 9.4 L16.4 13.7 L17.4 19.8 L12 17 L6.6 19.8 L7.6 13.7 L3.2 9.4 L9.3 8.5 Z').stroke();
  });
}

function drawShieldIcon(doc, frame, color, strokeWidth = 1.25) {
  drawScaledIcon(doc, frame, 24, () => {
    doc.lineWidth(strokeWidth).strokeColor(color).fillColor(color).lineCap('round').lineJoin('round');
    doc.path('M12 3 L20 6 V12 C20 17 17 20 12 22 C7 20 4 17 4 12 V6 Z').stroke();
    doc.moveTo(8, 12).lineTo(11, 15).lineTo(16, 9).stroke();
  });
}

function drawBellIcon(doc, frame, color, strokeWidth = 1.25) {
  drawScaledIcon(doc, frame, 24, () => {
    doc.lineWidth(strokeWidth).strokeColor(color).fillColor(color).lineCap('round').lineJoin('round');
    doc.path('M6 17 H18 L16.5 14.5 V10 C16.5 7.5 14.5 5.5 12 5.5 C9.5 5.5 7.5 7.5 7.5 10 V14.5 Z').stroke();
    doc.moveTo(10, 20).lineTo(14, 20).stroke();
  });
}

function drawHeadsetIcon(doc, frame, color, strokeWidth = 1.2) {
  drawScaledIcon(doc, frame, 24, () => {
    doc.lineWidth(strokeWidth).strokeColor(color).fillColor(color).lineCap('round').lineJoin('round');
    doc.path('M4 13 C4 8 7.5 4.5 12 4.5 C16.5 4.5 20 8 20 13').stroke();
    doc.roundedRect(3.8, 12, 3.4, 5.5, 1.2).stroke();
    doc.roundedRect(16.8, 12, 3.4, 5.5, 1.2).stroke();
    doc.path('M20 16 C20 19 17 20.5 13.5 20.5').stroke();
  });
}

function drawDocumentIcon(doc, frame, color, strokeWidth = 1.3) {
  drawScaledIcon(doc, frame, 24, () => {
    doc.lineWidth(strokeWidth).strokeColor(color).fillColor(color).lineCap('round').lineJoin('round');
    doc.path('M7 3 H15 L19 7 V21 H7 Z').stroke();
    doc.moveTo(15, 3).lineTo(15, 7).lineTo(19, 7).stroke();
    doc.moveTo(9.5, 11).lineTo(16, 11).stroke();
    doc.moveTo(9.5, 15).lineTo(16, 15).stroke();
    doc.moveTo(9.5, 18).lineTo(14, 18).stroke();
  });
}

function drawEmojiModeIcon(doc, content, frame, color) {
  // PDFKit cannot consistently embed color emoji, so emoji mode uses stable vector equivalents in generated PDFs.
  const variant = iconVariantForEmoji(content.emoji) || String(content.variant || content.iconName || '').toLowerCase();
  if (['address', 'phone', 'email', 'website'].includes(variant)) {
    drawContactVariantIcon(doc, variant, frame, color);
    return;
  }
  if (variant === 'check') {
    drawCheckDotIcon(doc, frame, color);
    return;
  }
  if (variant === 'rupee') {
    drawRupeeIcon(doc, frame, color);
    return;
  }
  drawGenericEmojiFallbackIcon(doc, frame, color);
}

function drawIconElement(doc, element, frame, context) {
  const style = element.style || {};
  const content = contentForElement(element);
  const invoiceElement = isInvoiceManifestElement(element);
  const accent = style.iconColor || style.accentColor || '#0284c7';
  const variant = normalizeVectorIconName(content.variant || content.iconName || '');
  const strokeWidth = clampNumber(style.strokeWidth, 2, 0.5, 8);
  const iconFrame = iconFrameForStyle(frame, style);
  const label = renderText(
    invoiceElement
      ? printableText(content.label, '', { suppressHelpers: true })
      : (content.label || content.iconName || element.name || 'Icon'),
    context
  );
  drawElementShell(doc, element, frame);
  if (content.iconMode === 'emoji') {
    drawEmojiModeIcon(doc, content, iconFrame, accent);
    return;
  }
  if (invoiceElement && !variant && !label) return;
  if (['address', 'phone', 'email', 'website', 'whatsapp'].includes(variant)) {
    drawContactVariantIcon(doc, variant === 'whatsapp' ? 'phone' : variant, iconFrame, accent, strokeWidth);
    return;
  }
  if (['invoice', 'work', 'date', 'status'].includes(variant)) {
    drawSmallVariantIcon(doc, variant, iconFrame, accent, strokeWidth);
    return;
  }
  if (variant === 'dot') {
    doc.circle(iconFrame.x + iconFrame.width / 2, iconFrame.y + iconFrame.height / 2, Math.min(iconFrame.width, iconFrame.height) / 2).fillColor(accent).fill();
    return;
  }
  if (variant === 'check') {
    drawCheckDotIcon(doc, iconFrame, accent, strokeWidth);
    return;
  }
  if (variant === 'rupee') {
    drawRupeeIcon(doc, iconFrame, accent, strokeWidth);
    return;
  }
  if (variant === 'star') {
    drawStarIcon(doc, iconFrame, accent, strokeWidth);
    return;
  }
  if (variant === 'shield') {
    drawShieldIcon(doc, iconFrame, accent, strokeWidth);
    return;
  }
  if (variant === 'bell') {
    drawBellIcon(doc, iconFrame, accent, strokeWidth);
    return;
  }
  if (variant === 'headset') {
    drawHeadsetIcon(doc, iconFrame, accent, strokeWidth);
    return;
  }
  if (variant === 'document') {
    drawDocumentIcon(doc, iconFrame, accent, strokeWidth);
    return;
  }
  if (variant === 'completion' || variant === 'handshake') {
    if (variant === 'completion') {
      drawCompletionBadgeIcon(doc, iconFrame, accent, strokeWidth);
      return;
    }
    const size = Math.min(iconFrame.width, iconFrame.height);
    const cx = iconFrame.x + iconFrame.width / 2;
    const cy = iconFrame.y + Math.min(iconFrame.height / 2, size / 2 + 1);
    doc.circle(cx, cy, size * 0.42).fillColor('#0d3b91').fill();
    doc.strokeColor('#ffffff').lineWidth(Math.max(1, strokeWidth)).lineCap('round').lineJoin('round');
    doc.moveTo(cx - size * 0.22, cy).lineTo(cx - size * 0.05, cy - size * 0.12).lineTo(cx + size * 0.2, cy + size * 0.14).stroke();
    doc.moveTo(cx - size * 0.12, cy + size * 0.18).lineTo(cx + size * 0.12, cy + size * 0.18).stroke();
    return;
  }
  drawGenericEmojiFallbackIcon(doc, iconFrame, accent, strokeWidth);
}

function drawDesignElement(doc, element, context, company) {
  const frame = designElementFrame(element);
  const opacity = clampNumber(element.style?.opacity, 1, 0, 1);
  const draw = () => {
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
  };
  if (opacity < 1) {
    doc.save();
    doc.opacity(opacity);
    draw();
    doc.restore();
    return undefined;
  }
  return draw();
}

function drawDesignPdfPages(doc, options = {}) {
  const { config = {}, context = {}, company = {} } = options;
  const elements = options.elements || designElements(config);
  if (!elements.length) return 0;
  let pagesAdded = 0;
  const pageBackground = config.design?.page?.backgroundColor || '#ffffff';
  const drawPageBackground = () => {
    doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT).fill(pageBackground);
    if (config.design?.showPageBoundary === true) {
      doc.strokeColor('#e2e8f0').lineWidth(0.7).rect(18, 18, PAGE_WIDTH - 36, PAGE_HEIGHT - 36).stroke();
    }
  };
  designPagesForElements(config, elements).forEach((page) => {
    if (!page.elements.length) return;
    const plannedPages = planVisualPageRender(page.elements, context);
    plannedPages.forEach((plannedPage, plannedIndex) => {
      if (pagesAdded > 0 || options.useCurrentPageForFirst !== true) {
        doc.addPage({ size: 'A4', margin: 0 });
      }
      pagesAdded += 1;
      drawPageBackground();
      const label = plannedIndex > 0 ? 'visual design continuation' : 'visual design';
      sortForDrawing(plannedPage.elements).forEach((element) => {
        drawDesignElementSafely(doc, element, context, company, label);
      });
    });
  });
  return pagesAdded;
}

export function shouldRenderVisualDesign(config = {}) {
  return config.design?.enabled === true
    && (config.design?.published === true || config.design?.previewDraft === true)
    && config.design?.visualElementMode !== false
    && designElements(config).length > 0;
}

export function drawVisualDesignPdf(doc, options = {}) {
  return drawDesignPdfPages(doc, { ...options, useCurrentPageForFirst: true });
}

export function drawAdvancedPdfSections(doc, options = {}) {
  const { config = {}, context = {}, title = '', company = {} } = options;
  const cards = sectionCards(config, context);
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
