import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { PDF_DIR, PORT } from '../config.js';
import { appError } from '../utils/http.js';

const MAX_DRAFT_HTML_BYTES = 4_500_000;
const DRAFT_CANVAS_WIDTH = 595;
const DRAFT_CANVAS_HEIGHT = 842;
const DESIGN_TEMPLATE_KEYS = new Set([
  'invoice',
  'quotation',
  'service-completed',
  'amc-contract',
  'amc-service-visit',
  'amc-renewal-reminder'
]);

function byteLength(value = '') {
  return Buffer.byteLength(String(value || ''), 'utf8');
}

function stripUnsafeHtml(html = '') {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object\b[^>]*>[\s\S]*?<\/object>/gi, '')
    .replace(/<embed\b[^>]*>[\s\S]*?<\/embed>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '');
}

function validateCanvasRequest({ key, canvasHtml, meta, label = 'Invoice DOM preview' }) {
  if (!DESIGN_TEMPLATE_KEYS.has(key)) throw appError(`${label} is not available for this template`, 400);
  if (!meta || meta.templateKey !== key) throw appError(`Invalid ${label.toLowerCase()} metadata`, 400);
  const html = String(canvasHtml || '').trim();
  if (!html) throw appError(`${label} requires a captured design canvas`, 400);
  if (byteLength(html) > MAX_DRAFT_HTML_BYTES) throw appError(`${label} canvas is too large`, 413);
  const width = Number(meta.width);
  const height = Number(meta.height);
  if (Math.round(width) !== DRAFT_CANVAS_WIDTH || Math.round(height) !== DRAFT_CANVAS_HEIGHT) {
    throw appError(`${label} canvas size is invalid`, 400);
  }
  return html;
}

function canvasPageCount(meta = {}) {
  const count = Number(meta.pageCount || 1);
  if (!Number.isFinite(count) || count < 1) return 1;
  return Math.min(20, Math.round(count));
}

function escapeHtml(value = '') {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderTemplateVariables(html = '', context = {}) {
  return String(html || '').replace(/\{\{([a-z0-9_]+)\}\}/gi, (_match, key) => {
    if (!Object.prototype.hasOwnProperty.call(context, key)) return '-';
    const next = context[key];
    return escapeHtml(next === undefined || next === null || next === '' ? '-' : next);
  });
}

function normalizePrintHtml(canvasHtml = '') {
  const html = String(canvasHtml || '').trim();
  if (/class=(["'])[^"']*\bdesign-print-document\b/i.test(html)) return html;
  if (/class=(["'])[^"']*\bpdf-a4-page\b/i.test(html)) {
    return `<div class="design-print-document"><section class="design-print-page">${html}</section></div>`;
  }
  return `<div class="design-print-document"><section class="design-print-page">${html}</section></div>`;
}

function previewHtmlDocument(canvasHtml = '', context = {}) {
  const safeHtml = stripUnsafeHtml(normalizePrintHtml(renderTemplateVariables(canvasHtml, context)));
  const serverBase = `http://localhost:${PORT}`;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <base href="${serverBase}/">
  <style>
    @page { size: ${DRAFT_CANVAS_WIDTH}px ${DRAFT_CANVAS_HEIGHT}px; margin: 0; }
    html, body {
      width: ${DRAFT_CANVAS_WIDTH}px;
      min-height: ${DRAFT_CANVAS_HEIGHT}px;
      margin: 0;
      padding: 0;
      overflow: visible;
      background: #ffffff;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    * {
      box-sizing: border-box;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    body {
      position: relative;
    }
    .design-print-document {
      background: #ffffff;
      width: ${DRAFT_CANVAS_WIDTH}px;
      margin: 0;
      padding: 0;
      overflow: visible;
    }
    .design-print-page {
      position: relative !important;
      display: block !important;
      width: ${DRAFT_CANVAS_WIDTH}px !important;
      height: ${DRAFT_CANVAS_HEIGHT}px !important;
      overflow: hidden !important;
      margin: 0 !important;
      padding: 0 !important;
      break-after: page;
      page-break-after: always;
      background: #ffffff;
    }
    .design-print-page:last-child {
      break-after: auto;
      page-break-after: auto;
    }
    .design-print-page > .pdf-a4-page {
      position: absolute !important;
      inset: 0 auto auto 0 !important;
      width: ${DRAFT_CANVAS_WIDTH}px !important;
      height: ${DRAFT_CANVAS_HEIGHT}px !important;
      transform: none !important;
      overflow: hidden !important;
      margin: 0 !important;
      background: #ffffff;
    }
    .design-print-document img,
    .design-print-document svg {
      max-width: none;
    }
  </style>
</head>
<body>
  ${safeHtml}
</body>
</html>`;
}

async function paginateInvoiceTablesForPrint(page, { key, context = {} } = {}) {
  if (key !== 'invoice') return null;
  const invoiceItems = Array.isArray(context.invoice_items) ? context.invoice_items : [];
  return page.evaluate(({ invoiceItems: items, templateContext }) => {
    function decodeJsonAttribute(node, name, fallback) {
      const raw = node?.getAttribute?.(name);
      if (!raw) return fallback;
      try {
        const parsed = JSON.parse(decodeURIComponent(raw));
        return parsed ?? fallback;
      } catch {
        return fallback;
      }
    }

    function valueForTemplate(template, item, index) {
      const rowContext = {
        ...(templateContext || {}),
        ...(item || {}),
        item_index: item?.item_index || String(index + 1)
      };
      return String(template || '').replace(/\{\{([a-z0-9_]+)\}\}/gi, (_match, key) => {
        const value = Object.prototype.hasOwnProperty.call(rowContext, key) ? rowContext[key] : '-';
        return value === undefined || value === null || value === '' ? '-' : String(value);
      });
    }

    function nodeClassText(node) {
      return String(node?.getAttribute?.('class') || node?.className || '');
    }

    function isSafeRepeatedNode(node) {
      const layerKind = String(node?.getAttribute?.('data-pdf-layer-kind') || '').toLowerCase();
      const layerId = String(node?.getAttribute?.('data-pdf-layer-id') || '').toLowerCase();
      const classText = nodeClassText(node).toLowerCase();
      return layerKind === 'background'
        || classText.includes('is-background-element')
        || layerId.includes('watermark')
        || Boolean(node?.querySelector?.('.pdf-canvas-image.is-watermark'));
    }

    function isPositionedFrame(node) {
      const classText = nodeClassText(node);
      return classText.includes('pdf-builder-element') || classText.includes('pdf-builder-section');
    }

    function rowsFromDom(rowNodes) {
      return rowNodes.map((row) => [...row.children].map((cell) => String(cell.textContent || '').trim()));
    }

    function takeRowsForHeight(rows, rowHeights, startIndex, availableHeight) {
      const chunk = [];
      let usedHeight = 0;
      for (let index = startIndex; index < rows.length; index += 1) {
        const rowHeight = Math.max(1, Math.ceil(rowHeights[index] || 0));
        if (chunk.length && usedHeight + rowHeight > availableHeight) break;
        chunk.push(rows[index]);
        usedHeight += rowHeight;
      }
      if (!chunk.length && startIndex < rows.length) chunk.push(rows[startIndex]);
      return { rows: chunk, nextIndex: startIndex + chunk.length, usedHeight };
    }

    function rowsFitHeight(rowHeights, startIndex, availableHeight) {
      let usedHeight = 0;
      for (let index = startIndex; index < rowHeights.length; index += 1) {
        usedHeight += Math.max(1, Math.ceil(rowHeights[index] || 0));
        if (usedHeight > availableHeight) return false;
      }
      return true;
    }

    function firstTailIndexForHeight(rowHeights, startIndex, availableHeight) {
      let usedHeight = 0;
      for (let index = rowHeights.length - 1; index >= startIndex; index -= 1) {
        const nextHeight = usedHeight + Math.max(1, Math.ceil(rowHeights[index] || 0));
        if (nextHeight > availableHeight) return index + 1;
        usedHeight = nextHeight;
      }
      return startIndex;
    }

    function replaceRows(frame, rows, offset = 0) {
      const grid = frame?.querySelector?.('.pdf-canvas-table-grid');
      if (!grid) return;
      const currentRows = [...grid.querySelectorAll('.pdf-canvas-table-row')];
      const rowTemplates = currentRows.length ? currentRows.map((row) => row.cloneNode(true)) : [];
      const headerCells = [...(grid.querySelector('.pdf-canvas-table-head')?.children || [])];
      currentRows.forEach((row) => row.remove());
      rows.forEach((cells, rowIndex) => {
        const template = rowTemplates[(rowIndex + offset) % Math.max(1, rowTemplates.length)] || document.createElement('div');
        const row = template.cloneNode(false);
        if (!row.classList.contains('pdf-canvas-table-row')) row.classList.add('pdf-canvas-table-row');
        const cellTemplates = [...template.children];
        cells.forEach((cellText, cellIndex) => {
          const cellTemplate = cellTemplates[cellIndex] || cellTemplates[0] || headerCells[cellIndex] || headerCells[0] || document.createElement('span');
          const cell = cellTemplate.cloneNode(false);
          cell.textContent = String(cellText ?? '-');
          row.appendChild(cell);
        });
        grid.appendChild(row);
      });
    }

    function makeContinuationPage(sourcePage, sourceContent, repeatedNodes) {
      const nextPage = sourcePage.cloneNode(false);
      nextPage.innerHTML = '';
      nextPage.setAttribute('data-pdf-continuation-page', 'true');
      nextPage.setAttribute('data-pdf-page-id', `${sourcePage.getAttribute('data-pdf-page-id') || 'page'}-continued-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
      const nextContent = sourceContent === sourcePage ? nextPage : sourceContent.cloneNode(false);
      nextContent.innerHTML = '';
      nextContent.setAttribute('data-pdf-continuation-content', 'true');
      repeatedNodes.forEach((node) => nextContent.appendChild(node.cloneNode(true)));
      if (nextContent !== nextPage) nextPage.appendChild(nextContent);
      return { nextPage, nextContent };
    }

    function measureRowHeights(pageContent, frameTemplate, rows) {
      const measurementFrame = frameTemplate.cloneNode(true);
      measurementFrame.style.visibility = 'hidden';
      measurementFrame.style.pointerEvents = 'none';
      measurementFrame.style.left = '-10000px';
      measurementFrame.style.top = '0';
      measurementFrame.style.zIndex = '-1';
      pageContent.appendChild(measurementFrame);
      replaceRows(measurementFrame, rows, 0);
      const heights = [...measurementFrame.querySelectorAll('.pdf-canvas-table-row')].map((row) => Math.ceil(row.getBoundingClientRect().height || 0));
      measurementFrame.remove();
      return heights;
    }

    function setContinuationFrameBounds(frameNode, top, height) {
      frameNode.style.top = `${Math.max(0, Math.round(top))}px`;
      frameNode.style.height = `${Math.max(1, Math.round(height))}px`;
      frameNode.style.maxHeight = `${Math.max(1, Math.round(height))}px`;
      frameNode.style.overflow = 'hidden';
    }

    const tableShells = [...document.querySelectorAll('.pdf-canvas-table[data-pdf-invoice-table="true"]')];
    const tableShell = tableShells.find((table) => table.getAttribute('data-pdf-table-dynamic-rows') !== 'false') || tableShells[0];
    if (!tableShell) {
      return { itemRowCount: items.length, rowsPerPage: 0, continuationPageCount: 0, finalPageCount: document.querySelectorAll('.design-print-page').length };
    }

    const frame = tableShell.closest('.pdf-builder-element');
    const pageNode = frame?.closest('.design-print-page');
    const pageContent = pageNode?.querySelector('.pdf-a4-page') || pageNode;
    const grid = tableShell.querySelector('.pdf-canvas-table-grid');
    const head = grid?.querySelector('.pdf-canvas-table-head');
    const existingRows = [...(grid?.querySelectorAll('.pdf-canvas-table-row') || [])];
    if (!frame || !pageNode || !pageContent || !grid || !head || !existingRows.length) {
      return { itemRowCount: items.length, rowsPerPage: 0, continuationPageCount: 0, finalPageCount: document.querySelectorAll('.design-print-page').length };
    }

    const dynamicRows = tableShell.getAttribute('data-pdf-table-dynamic-rows') !== 'false';
    const rowTemplate = decodeJsonAttribute(tableShell, 'data-pdf-table-row-template', []);
    const sourceRows = dynamicRows && items.length
      ? items.map((item, index) => (Array.isArray(rowTemplate) && rowTemplate.length ? rowTemplate : ['{{item_index}}', '{{item_description}}', '{{item_quantity}}', '{{item_unit_price}}', '{{item_total}}']).map((template) => valueForTemplate(template, item, index)))
      : rowsFromDom(existingRows);

    if (!sourceRows.length) {
      return { itemRowCount: 0, rowsPerPage: 0, continuationPageCount: 0, finalPageCount: document.querySelectorAll('.design-print-page').length };
    }

    const frameRect = frame.getBoundingClientRect();
    const pageRect = pageContent.getBoundingClientRect();
    const titleRect = tableShell.querySelector(':scope > p')?.getBoundingClientRect();
    const headRect = head.getBoundingClientRect();
    const rowRect = existingRows[0].getBoundingClientRect();
    const frameHeight = Math.max(1, frameRect.height || Number.parseFloat(frame.style.height) || 120);
    const tableTop = frameRect.top - pageRect.top;
    const availableFrameHeight = Math.max(1, Math.min(frameHeight, 842 - tableTop));
    const titleHeight = titleRect?.height || 0;
    const headerHeight = headRect.height || Number.parseFloat(head.style.minHeight) || 18;
    const rowHeight = Math.max(1, rowRect.height || Number.parseFloat(tableShell.getAttribute('data-pdf-table-row-height')) || 18);
    const firstPageRowsHeight = Math.max(rowHeight, availableFrameHeight - titleHeight - headerHeight - 4);
    const tableTemplateFrame = frame.cloneNode(true);
    const rowHeights = measureRowHeights(pageContent, tableTemplateFrame, sourceRows).map((height) => height || rowHeight);

    const pageChildren = [...pageContent.children];
    const repeatedNodes = pageChildren.filter((node) => node !== frame && isSafeRepeatedNode(node));
    const tableBottom = frameRect.bottom - pageRect.top;
    const finalNodes = pageChildren.filter((node) => {
      if (node === frame || !isPositionedFrame(node) || isSafeRepeatedNode(node)) return false;
      const nodeTop = node.getBoundingClientRect().top - pageRect.top;
      return nodeTop >= tableBottom - 1;
    });
    const safeBottomMargin = 36;
    const finalSectionGap = 12;
    const minContinuationTop = 64;
    const maxContinuationTop = 108;
    const continuationTop = Math.max(minContinuationTop, Math.min(tableTop, maxContinuationTop));
    const continuationFrameHeight = Math.max(
      rowHeight + titleHeight + headerHeight + 4,
      842 - continuationTop - safeBottomMargin
    );
    const continuationRowsHeight = Math.max(rowHeight, continuationFrameHeight - titleHeight - headerHeight - 4);
    const firstFinalTop = finalNodes.length
      ? Math.min(...finalNodes.map((node) => node.getBoundingClientRect().top - pageRect.top))
      : 842 - safeBottomMargin;
    const finalFrameHeight = Math.max(
      rowHeight + titleHeight + headerHeight + 4,
      Math.min(continuationFrameHeight, firstFinalTop - continuationTop - finalSectionGap)
    );
    const finalRowsHeight = Math.max(rowHeight, finalFrameHeight - titleHeight - headerHeight - 4);

    const chunks = [];
    const firstChunk = takeRowsForHeight(sourceRows, rowHeights, 0, firstPageRowsHeight);
    chunks.push({
      rows: firstChunk.rows,
      top: tableTop,
      frameHeight,
      rowsHeight: firstPageRowsHeight,
      isFinal: firstChunk.nextIndex >= sourceRows.length
    });
    let rowCursor = firstChunk.nextIndex;
    while (rowCursor < sourceRows.length) {
      if (rowsFitHeight(rowHeights, rowCursor, finalRowsHeight)) {
        chunks.push({
          rows: sourceRows.slice(rowCursor),
          top: continuationTop,
          frameHeight: finalFrameHeight,
          rowsHeight: finalRowsHeight,
          isFinal: true
        });
        rowCursor = sourceRows.length;
      } else {
        const continuationChunk = takeRowsForHeight(sourceRows, rowHeights, rowCursor, continuationRowsHeight);
        const finalTailStart = firstTailIndexForHeight(rowHeights, rowCursor, finalRowsHeight);
        const nextIndex = Math.max(
          rowCursor + 1,
          Math.min(continuationChunk.nextIndex, finalTailStart)
        );
        chunks.push({
          rows: sourceRows.slice(rowCursor, nextIndex),
          top: continuationTop,
          frameHeight: continuationFrameHeight,
          rowsHeight: continuationRowsHeight,
          isFinal: false
        });
        rowCursor = nextIndex;
      }
    }

    const rowsPerPage = Math.max(1, firstChunk.rows.length);

    if (chunks.length <= 1) {
      if (dynamicRows && items.length) replaceRows(frame, sourceRows, 0);
      return {
        itemRowCount: sourceRows.length,
        rowsPerPage,
        continuationRowsPerPage: 0,
        rowHeight,
        availableRowsHeight: firstPageRowsHeight,
        continuationPageCount: 0,
        finalPageCount: document.querySelectorAll('.design-print-page').length
      };
    }
    const finalClones = finalNodes.map((node) => node.cloneNode(true));

    finalNodes.forEach((node) => node.remove());
    replaceRows(frame, chunks[0].rows, 0);

    let insertAfter = pageNode;
    let rowOffset = chunks[0].rows.length;
    chunks.slice(1).forEach((chunk, chunkIndex) => {
      const { nextPage, nextContent } = makeContinuationPage(pageNode, pageContent, repeatedNodes);
      const tableClone = tableTemplateFrame.cloneNode(true);
      setContinuationFrameBounds(tableClone, chunk.top, chunk.frameHeight);
      replaceRows(tableClone, chunk.rows, rowOffset);
      nextContent.appendChild(tableClone);
      rowOffset += chunk.rows.length;
      if (chunkIndex === chunks.length - 2) {
        finalClones.forEach((node) => nextContent.appendChild(node));
      }
      insertAfter.after(nextPage);
      insertAfter = nextPage;
    });

    return {
      itemRowCount: sourceRows.length,
      rowsPerPage,
      rowHeight,
      availableRowsHeight: firstPageRowsHeight,
      continuationRowsPerPage: Math.max(0, ...chunks.slice(1).map((chunk) => chunk.rows.length)),
      continuationRowsHeight,
      finalRowsHeight,
      continuationPageCount: chunks.length - 1,
      finalPageCount: document.querySelectorAll('.design-print-page').length
    };
  }, { invoiceItems, templateContext: context });
}

async function renderInvoiceCanvasDomPdf({ key, canvasHtml, meta, context = {}, filenamePrefix = 'invoice-dom-preview', label = 'Invoice DOM preview' }) {
  const html = validateCanvasRequest({ key, canvasHtml, meta, label });
  const pageCount = canvasPageCount(meta);
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const cleanPrefix = String(filenamePrefix || 'invoice-dom-preview').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'invoice-dom-preview';
  const filename = `${cleanPrefix}-${Date.now()}.pdf`;
  const filePath = path.join(PDF_DIR, filename);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: {
        width: DRAFT_CANVAS_WIDTH,
        height: DRAFT_CANVAS_HEIGHT
      },
      javaScriptEnabled: false
    });
    await page.setContent(previewHtmlDocument(html, context), { waitUntil: 'networkidle' });
    await paginateInvoiceTablesForPrint(page, { key, context });
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({
      width: `${DRAFT_CANVAS_WIDTH}px`,
      height: `${DRAFT_CANVAS_HEIGHT}px`,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true
    });
    fs.writeFileSync(filePath, pdf);
    await page.close();
  } finally {
    await browser.close();
  }
  return { filePath, filename };
}

export async function renderInvoiceDraftDomPreviewPdf({ key, draftCanvasHtml, draftMeta }) {
  return renderInvoiceCanvasDomPdf({
    key,
    canvasHtml: draftCanvasHtml,
    meta: draftMeta,
    filenamePrefix: `${key}-draft-dom-preview`,
    label: 'PDF draft preview'
  });
}

export async function renderInvoicePublishedDomPdf({ key = 'invoice', publishedHtml, publishedMeta, context = {}, filenamePrefix = 'invoice-published-dom' }) {
  return renderInvoiceCanvasDomPdf({
    key,
    canvasHtml: publishedHtml,
    meta: publishedMeta,
    context,
    filenamePrefix,
    label: 'Invoice published design'
  });
}
