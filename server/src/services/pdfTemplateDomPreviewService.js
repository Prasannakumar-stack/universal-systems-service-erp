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
const PRINT_HELPER_LABEL_PATTERN = />\s*(Divider|dot|phone|address|shield|handshake|Icon|Image \/ Logo|Locked)\s*</g;
const PRINT_HELPER_NODE_PATTERN = /<[^>]+class=(["'])[^"']*(?:pdf-element-lock|pdf-element-grip|pdf-resize-handle|pdf-element-hit-area|pdf-page-break-guide|canvas-debug-label|design-helper|pdf-builder-helper)[^"']*\1[^>]*>[\s\S]*?<\/[^>]+>/gi;

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

function stripPrintHelperHtml(html = '') {
  PRINT_HELPER_LABEL_PATTERN.lastIndex = 0;
  PRINT_HELPER_NODE_PATTERN.lastIndex = 0;
  return String(html || '')
    .replace(PRINT_HELPER_NODE_PATTERN, '')
    .replace(PRINT_HELPER_LABEL_PATTERN, '><');
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
  const safeHtml = stripPrintHelperHtml(stripUnsafeHtml(normalizePrintHtml(renderTemplateVariables(canvasHtml, context))));
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
      isolation: isolate;
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
      background: transparent !important;
      z-index: 2;
    }
    .pdf-page-watermark {
      position: absolute !important;
      inset: 0 !important;
      z-index: 1;
      display: grid !important;
      place-items: center !important;
      overflow: hidden !important;
      pointer-events: none !important;
      user-select: none !important;
      -webkit-user-select: none !important;
    }
    .pdf-page-watermark img {
      display: block !important;
      width: 68% !important;
      height: auto !important;
      max-width: 75% !important;
      max-height: 75% !important;
      object-fit: contain !important;
      opacity: 0.08 !important;
      filter: grayscale(1) saturate(0.18) contrast(0.86) !important;
      pointer-events: none !important;
      user-select: none !important;
      -webkit-user-drag: none !important;
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
  const invoiceItems = Array.isArray(context.invoice_items) ? context.invoice_items : [];
  return page.evaluate(({ invoiceItems: items, templateContext, templateKey }) => {
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

    function isPageWatermarkLayer(node) {
      const classText = nodeClassText(node).toLowerCase();
      return node?.getAttribute?.('data-pdf-page-watermark') === 'true' || classText.includes('pdf-page-watermark');
    }

    function isWatermarkNode(node) {
      if (!node || isPageWatermarkLayer(node)) return false;
      const layerId = String(node?.getAttribute?.('data-pdf-layer-id') || '').toLowerCase();
      const classText = nodeClassText(node).toLowerCase();
      return layerId.includes('watermark')
        || classText.includes('is-watermark')
        || classText.includes('watermark')
        || Boolean(node?.matches?.('.pdf-canvas-image.is-watermark'))
        || Boolean(node?.querySelector?.('.pdf-canvas-image.is-watermark'));
    }

    function isSafeRepeatedNode(node) {
      const layerKind = String(node?.getAttribute?.('data-pdf-layer-kind') || '').toLowerCase();
      const layerId = String(node?.getAttribute?.('data-pdf-layer-id') || '').toLowerCase();
      const classText = nodeClassText(node).toLowerCase();
      return !isPageWatermarkLayer(node) && (layerKind === 'background'
        || classText.includes('is-background-element')
        || layerId.includes('watermark')
        || Boolean(node?.querySelector?.('.pdf-canvas-image.is-watermark')));
    }

    function watermarkImageNode(sourceNode) {
      if (!sourceNode) return null;
      if (sourceNode.matches?.('img')) return sourceNode;
      return sourceNode.querySelector?.('.pdf-canvas-image.is-watermark img')
        || sourceNode.querySelector?.('img')
        || null;
    }

    function ensurePageWatermark(pageNode, sourceNode) {
      if (!pageNode || !sourceNode || pageNode.querySelector(':scope > .pdf-page-watermark')) return;
      const sourceImage = watermarkImageNode(sourceNode);
      const source = sourceImage?.getAttribute?.('src') || sourceImage?.src || '';
      if (!source) return;
      const layer = document.createElement('div');
      layer.className = 'pdf-page-watermark';
      layer.setAttribute('data-pdf-page-watermark', 'true');
      layer.setAttribute('aria-hidden', 'true');
      const image = document.createElement('img');
      image.src = source;
      image.alt = '';
      image.setAttribute('draggable', 'false');
      layer.appendChild(image);
      const pageContent = pageNode.querySelector(':scope > .pdf-a4-page');
      pageNode.insertBefore(layer, pageContent || pageNode.firstChild);
    }

    function normalizePageWatermark(pageNode, pageContent, sourceNode) {
      if (!pageNode || !pageContent || !sourceNode) return null;
      const clone = sourceNode.cloneNode(true);
      ensurePageWatermark(pageNode, clone);
      [...pageContent.children].filter(isWatermarkNode).forEach((node) => node.remove());
      return clone;
    }

    function isPositionedFrame(node) {
      const classText = nodeClassText(node);
      return classText.includes('pdf-builder-element') || classText.includes('pdf-builder-section');
    }

    const tableToFinalGap = 36;
    const amountToNextGap = 24;
    const sectionToSectionGap = 8;
    const termsToFooterGap = 24;

    function nodeLayoutRole(node) {
      const marker = [
        node?.getAttribute?.('data-pdf-layer-role'),
        node?.getAttribute?.('data-pdf-layer-kind'),
        node?.getAttribute?.('data-pdf-layer-id'),
        node?.getAttribute?.('data-pdf-table-element-id'),
        node?.getAttribute?.('aria-label'),
        node?.getAttribute?.('title'),
        nodeClassText(node),
        String(node?.textContent || '').slice(0, 240)
      ].filter(Boolean).join(' ').toLowerCase();
      if (marker.includes('footer') || marker.includes('thank you') || marker.includes('bottom strip')) return 'footer';
      if (marker.includes('amount') || marker.includes('summary') || marker.includes('total') || marker.includes('balance')) return 'amount';
      if (marker.includes('term') || marker.includes('condition') || marker.includes('warranty')) return 'terms';
      if (marker.includes('signature') || marker.includes('acknowledgement')) return 'signature';
      if (marker.includes('notice') || marker.includes('note') || marker.includes('message')) return 'notice';
      return 'section';
    }

    function gapBetweenFinalNodes(previousRole, currentRole) {
      if (!previousRole) return 0;
      if (previousRole === currentRole) return 0;
      if (currentRole === 'footer') return termsToFooterGap;
      if (previousRole === 'amount') return amountToNextGap;
      return sectionToSectionGap;
    }

    function compactGapBetweenFinalNodes(previousRole, currentRole) {
      if (!previousRole) return 0;
      if (previousRole === currentRole) return 0;
      return 1;
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

    function rowHeightSum(rowHeights, startIndex, count) {
      let total = 0;
      for (let index = startIndex; index < startIndex + count; index += 1) {
        total += Math.max(1, Math.ceil(rowHeights[index] || 0));
      }
      return total;
    }

    function normalizeRowForPrint(row) {
      row.style.position = 'static';
      row.style.display = 'grid';
      row.style.visibility = 'visible';
      row.style.overflow = 'visible';
      row.style.opacity = row.style.opacity || '1';
      row.style.maxHeight = 'none';
      row.style.gridArea = 'auto';
      row.style.gridRow = 'auto';
      row.style.gridColumn = 'auto';
      [...row.children].forEach((cell) => {
        cell.style.position = 'static';
        cell.style.visibility = 'visible';
        cell.style.overflow = 'visible';
        cell.style.maxHeight = 'none';
        cell.style.gridArea = 'auto';
        cell.style.gridRow = 'auto';
        cell.style.gridColumn = 'auto';
      });
    }

    function tableCellAlignment(cellIndex, cellCount) {
      if (cellIndex === 0) return 'center';
      if (cellCount >= 5 && cellIndex === 2) return 'center';
      if (cellCount >= 4 && cellIndex >= cellCount - 2) return 'right';
      return 'left';
    }

    function stylePrintTable(frame) {
      const table = frame?.querySelector?.('.pdf-canvas-table');
      const grid = frame?.querySelector?.('.pdf-canvas-table-grid');
      if (!table || !grid) return;
      const head = grid.querySelector('.pdf-canvas-table-head');
      table.style.alignContent = 'start';
      table.style.gap = table.style.gap || '0.32rem';
      grid.style.border = '1px solid rgba(15, 42, 82, 0.18)';
      grid.style.borderRadius = '8px';
      grid.style.background = '#ffffff';
      grid.style.boxShadow = '0 0 0 1px rgba(255, 255, 255, 0.72) inset';
      grid.style.overflow = 'hidden';
      if (head) {
        head.style.background = '#0f2a52';
        head.style.color = '#ffffff';
        head.style.boxShadow = 'inset 0 -1px 0 rgba(255, 255, 255, 0.16)';
        [...head.children].forEach((cell, cellIndex, cells) => {
          cell.style.color = '#ffffff';
          cell.style.fontWeight = '900';
          cell.style.letterSpacing = '0';
          cell.style.textAlign = tableCellAlignment(cellIndex, cells.length);
          cell.style.padding = cell.style.padding || '0.24rem 0.3rem';
          cell.style.borderRight = cellIndex === cells.length - 1 ? '0' : '1px solid rgba(255, 255, 255, 0.16)';
        });
      }
      [...grid.querySelectorAll('.pdf-canvas-table-row')].forEach((row, rowIndex, rows) => {
        row.style.background = rowIndex % 2 === 0 ? '#ffffff' : 'rgba(248, 250, 252, 0.96)';
        row.style.boxShadow = rowIndex === rows.length - 1 ? 'none' : 'inset 0 -1px 0 rgba(148, 163, 184, 0.16)';
        [...row.children].forEach((cell, cellIndex, cells) => {
          cell.style.color = '#0f172a';
          cell.style.fontWeight = '760';
          cell.style.textAlign = tableCellAlignment(cellIndex, cells.length);
          cell.style.padding = cell.style.padding || '0.24rem 0.3rem';
          cell.style.borderRight = cellIndex === cells.length - 1 ? '0' : '1px solid rgba(148, 163, 184, 0.14)';
          cell.style.whiteSpace = 'normal';
          cell.style.overflowWrap = 'anywhere';
        });
      });
    }

    function actualRowsHeight(grid) {
      return [...(grid?.querySelectorAll?.('.pdf-canvas-table-row') || [])].reduce((sum, row) => {
        return sum + Math.max(1, Math.ceil(row.getBoundingClientRect?.().height || Number.parseFloat(row.style.height) || Number.parseFloat(row.style.minHeight) || 0));
      }, 0);
    }

    function setPrintTableBodySize(frame, rowsHeight = null) {
      const table = frame?.querySelector?.('.pdf-canvas-table');
      const grid = frame?.querySelector?.('.pdf-canvas-table-grid');
      if (!table || !grid) return;
      stylePrintTable(frame);
      const titleNode = table.querySelector(':scope > p');
      const headNode = grid.querySelector('.pdf-canvas-table-head');
      const titleNodeHeight = titleNode?.getBoundingClientRect?.().height || Number.parseFloat(titleNode?.style?.height) || 0;
      const headNodeHeight = headNode?.getBoundingClientRect?.().height || Number.parseFloat(headNode?.style?.height) || Number.parseFloat(headNode?.style?.minHeight) || 0;
      const resolvedRowsHeight = Number.isFinite(rowsHeight) ? Math.max(0, rowsHeight) : actualRowsHeight(grid);
      const bottomPadding = resolvedRowsHeight > 0 ? 3 : 0;
      const gridHeight = headNodeHeight + resolvedRowsHeight + bottomPadding;
      const tableHeight = titleNodeHeight + gridHeight;
      table.style.display = 'block';
      table.style.height = `${Math.ceil(tableHeight)}px`;
      table.style.minHeight = `${Math.ceil(tableHeight)}px`;
      table.style.maxHeight = `${Math.ceil(tableHeight)}px`;
      table.style.overflow = 'visible';
      grid.style.display = 'block';
      grid.style.height = `${Math.ceil(gridHeight)}px`;
      grid.style.minHeight = `${Math.ceil(gridHeight)}px`;
      grid.style.maxHeight = `${Math.ceil(gridHeight)}px`;
      grid.style.overflow = 'hidden';
    }

    function tableDebugForPage(pageNode) {
      const rows = [...(pageNode?.querySelectorAll?.('.pdf-canvas-table-row') || [])];
      const pageRect = pageNode?.getBoundingClientRect?.();
      const visibleRows = rows.filter((row) => {
        const rect = row.getBoundingClientRect();
        const style = window.getComputedStyle(row);
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number(style.opacity || 1) !== 0
          && rect.width > 0
          && rect.height > 0
          && (!pageRect || (rect.bottom > pageRect.top && rect.top < pageRect.bottom));
      });
      const rowSummary = (row) => [...(row?.children || [])].map((cell) => String(cell.textContent || '').trim()).filter(Boolean).join(' | ');
      const gridNode = pageNode?.querySelector?.('.pdf-canvas-table-grid');
      return {
        rowElementCount: rows.length,
        visibleRowCount: visibleRows.length,
        gridHeight: gridNode?.getBoundingClientRect?.().height || 0,
        gridOverflow: gridNode ? window.getComputedStyle(gridNode).overflow : '',
        firstRow: rowSummary(rows[0]),
        lastRow: rowSummary(rows[rows.length - 1])
      };
    }

    function replaceRows(frame, rows, offset = 0, expectedRowsHeight = 0) {
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
        normalizeRowForPrint(row);
        const cellTemplates = [...template.children];
        cells.forEach((cellText, cellIndex) => {
          const cellTemplate = cellTemplates[cellIndex] || cellTemplates[0] || headerCells[cellIndex] || headerCells[0] || document.createElement('span');
          const cell = cellTemplate.cloneNode(false);
          cell.textContent = String(cellText ?? '-');
          row.appendChild(cell);
        });
        grid.appendChild(row);
      });
      setPrintTableBodySize(frame, expectedRowsHeight);
    }

    function makeContinuationPage(sourcePage, sourceContent, repeatedNodes, watermarkSource) {
      const nextPage = sourcePage.cloneNode(false);
      nextPage.innerHTML = '';
      nextPage.setAttribute('data-pdf-continuation-page', 'true');
      nextPage.setAttribute('data-pdf-page-id', `${sourcePage.getAttribute('data-pdf-page-id') || 'page'}-continued-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
      const nextContent = sourceContent === sourcePage ? nextPage : sourceContent.cloneNode(false);
      nextContent.innerHTML = '';
      nextContent.setAttribute('data-pdf-continuation-content', 'true');
      repeatedNodes.forEach((node) => nextContent.appendChild(node.cloneNode(true)));
      if (nextContent !== nextPage) nextPage.appendChild(nextContent);
      ensurePageWatermark(nextPage, watermarkSource);
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

    function nodeTopWithinParent(node) {
      const parentRect = node?.parentElement?.getBoundingClientRect?.();
      const rect = node?.getBoundingClientRect?.();
      if (parentRect && rect && rect.width > 0 && rect.height > 0) return rect.top - parentRect.top;
      const styleTop = Number.parseFloat(node?.style?.top);
      if (Number.isFinite(styleTop)) return styleTop;
      return 0;
    }

    function nodeVisualHeight(node) {
      const rectHeight = node?.getBoundingClientRect?.().height;
      const styleHeight = Number.parseFloat(node?.style?.height);
      return Math.max(0, rectHeight || styleHeight || 0);
    }

    function parseCssRgb(value = '') {
      const color = String(value || '').trim().toLowerCase();
      const rgba = color.match(/^rgba?\(([^)]+)\)$/);
      if (!rgba) return null;
      const parts = rgba[1].split(',').map((part) => Number.parseFloat(part.trim()));
      if (parts.length < 3 || parts.slice(0, 3).some((part) => !Number.isFinite(part))) return null;
      return {
        r: parts[0],
        g: parts[1],
        b: parts[2],
        a: parts.length >= 4 && Number.isFinite(parts[3]) ? parts[3] : 1
      };
    }

    function colorHasPaint(value = '', { ignoreWhite = false } = {}) {
      const color = String(value || '').trim().toLowerCase();
      if (!color || color === 'transparent' || color === 'none') return false;
      const rgba = color.match(/^rgba?\(([^)]+)\)$/);
      if (!rgba) return true;
      const parsed = parseCssRgb(color);
      if (!parsed || parsed.a <= 0) return false;
      if (ignoreWhite && parsed.r >= 248 && parsed.g >= 248 && parsed.b >= 248) return false;
      return true;
    }

    function borderHasPaint(style, side, options = {}) {
      const width = Number.parseFloat(style.getPropertyValue(`border-${side}-width`) || '0');
      const borderStyle = style.getPropertyValue(`border-${side}-style`);
      const color = style.getPropertyValue(`border-${side}-color`);
      return width > 0 && borderStyle !== 'none' && colorHasPaint(color, options);
    }

    function hasDirectText(node) {
      return [...(node?.childNodes || [])].some((child) => {
        return child.nodeType === Node.TEXT_NODE && String(child.textContent || '').trim();
      });
    }

    function hasPaintedSurface(node, style) {
      const tag = String(node?.tagName || '').toLowerCase();
      const classText = nodeClassText(node).toLowerCase();
      if ((classText.includes('pdf-builder-element') || classText.includes('pdf-builder-section')) && node.querySelector?.('*')) return false;
      if (['img', 'svg', 'canvas', 'path', 'rect', 'circle', 'line', 'polyline', 'polygon'].includes(tag)) return true;
      if (hasDirectText(node) && colorHasPaint(style.color)) return true;
      if (colorHasPaint(style.backgroundColor, { ignoreWhite: true })) return true;
      if (style.boxShadow && style.boxShadow !== 'none') return true;
      return ['top', 'right', 'bottom', 'left'].some((side) => borderHasPaint(style, side, { ignoreWhite: true }));
    }

    function paintedBoundsForNodes(nodes) {
      const bounds = [];
      nodes.forEach((node) => {
        [node, ...(node?.querySelectorAll?.('*') || [])].forEach((candidate) => {
          if (!candidate?.getBoundingClientRect) return;
          const style = window.getComputedStyle(candidate);
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) === 0) return;
          if (!hasPaintedSurface(candidate, style)) return;
          const rect = candidate.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) return;
          bounds.push(rect);
        });
      });
      if (!bounds.length) return null;
      const top = Math.min(...bounds.map((rect) => rect.top));
      const bottom = Math.max(...bounds.map((rect) => rect.bottom));
      const left = Math.min(...bounds.map((rect) => rect.left));
      const right = Math.max(...bounds.map((rect) => rect.right));
      return { top, right, bottom, left, height: bottom - top, width: right - left };
    }

    function finalGroupMetrics(nodes) {
      const positionedNodes = nodes.filter(isPositionedFrame);
      if (!positionedNodes.length) return null;
      const parentRect = positionedNodes[0]?.parentElement?.getBoundingClientRect?.();
      const metrics = positionedNodes.map((node) => {
        const paintedNodeBounds = paintedBoundsForNodes([node]);
        const top = paintedNodeBounds && parentRect ? paintedNodeBounds.top - parentRect.top : nodeTopWithinParent(node);
        const height = paintedNodeBounds ? paintedNodeBounds.height : nodeVisualHeight(node);
        return { node, top, height, role: nodeLayoutRole(node), painted: Boolean(paintedNodeBounds) };
      });
      const painted = paintedBoundsForNodes(positionedNodes);
      const fallbackTop = Math.min(...metrics.map((metric) => metric.top));
      const fallbackBottom = Math.max(...metrics.map((metric) => metric.top + metric.height));
      const originalTop = painted && parentRect ? painted.top - parentRect.top : fallbackTop;
      const originalBottom = painted && parentRect ? painted.bottom - parentRect.top : fallbackBottom;
      const groupHeight = Math.max(0, Math.floor(originalBottom - originalTop));
      return {
        metrics,
        originalTop,
        originalBottom,
        groupHeight,
        painted: Boolean(painted)
      };
    }

    function moveMetricsGroupToTop(metrics, originalTop, targetTop) {
      if (!Array.isArray(metrics) || !metrics.length || !Number.isFinite(targetTop)) return { delta: 0 };
      const delta = targetTop - originalTop;
      metrics.forEach(({ node, top }) => {
        node.style.top = `${Math.max(0, Math.round(top + delta))}px`;
      });
      return { targetTop, delta };
    }

    function mergedGroupRole(metrics = []) {
      const roles = new Set(metrics.map((metric) => metric.role).filter(Boolean));
      if (roles.has('footer')) return 'footer';
      if (roles.has('terms')) return 'terms';
      if (roles.has('signature')) return 'signature';
      if (roles.has('notice')) return 'notice';
      if (roles.has('amount')) return 'amount';
      return 'section';
    }

    function finalVerticalGroups(metrics = []) {
      const sorted = metrics
        .slice()
        .sort((a, b) => a.top - b.top || String(a.role).localeCompare(String(b.role)));
      const groups = [];
      sorted.forEach((metric) => {
        const metricBottom = metric.top + metric.height;
        const previous = groups[groups.length - 1];
        const sameVisualBand = previous
          && metric.top <= previous.originalBottom - 1
          && (metric.role === previous.role || Math.abs(metric.top - previous.originalTop) <= 36);
        if (sameVisualBand) {
          previous.metrics.push(metric);
          previous.originalTop = Math.min(previous.originalTop, metric.top);
          previous.originalBottom = Math.max(previous.originalBottom, metricBottom);
          previous.groupHeight = previous.originalBottom - previous.originalTop;
          previous.role = mergedGroupRole(previous.metrics);
          return;
        }
        groups.push({
          metrics: [metric],
          originalTop: metric.top,
          originalBottom: metricBottom,
          groupHeight: metric.height,
          role: metric.role || 'section'
        });
      });
      return groups;
    }

    function moveGroupedFinalNodes(groupedMetrics, minimumTop, pageHeight, bottomMargin) {
      const pageLimit = pageHeight - bottomMargin;
      function buildPlacements(gapFor) {
        let previousRole = '';
        let previousBottom = null;
        let finalBottom = 0;
        let overflowIndex = -1;
        const placements = groupedMetrics.map((group, index) => {
          const requiredTop = index === 0
            ? minimumTop
            : (previousBottom ?? minimumTop) + gapFor(previousRole, group.role);
          const targetTop = Math.max(group.originalTop, requiredTop);
          const targetBottom = targetTop + group.groupHeight;
          if (overflowIndex < 0 && targetBottom > pageLimit + 0.5) overflowIndex = index;
          previousRole = group.role;
          previousBottom = targetBottom;
          finalBottom = Math.max(finalBottom, targetBottom);
          return { ...group, targetTop, targetBottom };
        });
        return { placements, overflowIndex, finalBottom };
      }

      const strictPlan = buildPlacements(gapBetweenFinalNodes);
      const compactPlan = strictPlan.overflowIndex < 0
        ? strictPlan
        : buildPlacements(compactGapBetweenFinalNodes);
      const activePlan = compactPlan.overflowIndex < 0 ? compactPlan : strictPlan;
      const { placements, overflowIndex, finalBottom } = activePlan;

      const groupsToPlace = overflowIndex < 0 ? placements : placements.slice(0, overflowIndex);
      groupsToPlace.forEach((group) => moveMetricsGroupToTop(group.metrics, group.originalTop, group.targetTop));

      const overflowGroups = overflowIndex < 0 ? [] : placements.slice(overflowIndex);
      return {
        fits: overflowIndex < 0,
        placed: true,
        targetTop: minimumTop,
        finalBottom: overflowIndex < 0
          ? finalBottom
          : Math.max(0, ...groupsToPlace.map((group) => group.targetBottom)),
        pageLimit,
        overflowNodes: overflowGroups.flatMap((group) => group.metrics.map((metric) => metric.node)),
        placedNodes: groupsToPlace.flatMap((group) => group.metrics.map((metric) => metric.node)),
        verticalGroupCount: groupedMetrics.length,
        overflowGroupCount: overflowGroups.length,
        compactSpacing: activePlan === compactPlan && strictPlan.overflowIndex >= 0
      };
    }

    function positionFinalNodesWithGaps(nodes, minimumTop, pageHeight, bottomMargin) {
      const group = finalGroupMetrics(nodes);
      if (!group || !Number.isFinite(minimumTop)) return { fits: true, placed: false, groupHeight: 0 };
      return {
        ...group,
        ...moveGroupedFinalNodes(finalVerticalGroups(group.metrics), minimumTop, pageHeight, bottomMargin)
      };
    }

    function visibleRectBottomWithinParent(node, parentRect) {
      if (!node?.getBoundingClientRect || !parentRect) return null;
      const style = window.getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) === 0) return null;
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      return rect.bottom - parentRect.top;
    }

    function tableBottomForFrame(frameNode) {
      const parentRect = frameNode?.parentElement?.getBoundingClientRect?.();
      if (!parentRect) return 0;
      const table = frameNode?.querySelector?.('.pdf-canvas-table');
      const grid = frameNode?.querySelector?.('.pdf-canvas-table-grid');
      const rowBottoms = [...(grid?.querySelectorAll?.('.pdf-canvas-table-row') || [])]
        .map((row) => visibleRectBottomWithinParent(row, parentRect))
        .filter((bottom) => Number.isFinite(bottom));
      const structuralBottoms = [grid, table]
        .map((node) => visibleRectBottomWithinParent(node, parentRect))
        .filter((bottom) => Number.isFinite(bottom));
      const measuredBottoms = rowBottoms.length ? [...rowBottoms, ...structuralBottoms] : structuralBottoms;
      if (measuredBottoms.length) return Math.max(...measuredBottoms);
      const frameBottom = visibleRectBottomWithinParent(frameNode, parentRect);
      return Number.isFinite(frameBottom) ? frameBottom : 0;
    }

    function placeFinalNodesBelowTable(nodes, tableFrame, gap, pageHeight, bottomMargin) {
      if (!nodes?.length) return { fits: true, placed: false, groupHeight: 0 };
      const tableBottom = tableBottomForFrame(tableFrame);
      const afterTableTop = tableBottom + gap;
      const placement = positionFinalNodesWithGaps(nodes, afterTableTop, pageHeight, bottomMargin);
      return { ...placement, tableBottom, targetTop: afterTableTop };
    }

    function finalPlacementDebugFor(placement) {
      if (!placement) return null;
      return {
        fits: Boolean(placement.fits),
        placed: Boolean(placement.placed),
        painted: Boolean(placement.painted),
        tableBottom: Math.round(Number(placement.tableBottom || 0)),
        targetTop: Math.round(Number(placement.targetTop ?? placement.originalTop ?? 0)),
        originalTop: Math.round(Number(placement.originalTop || 0)),
        originalBottom: Math.round(Number(placement.originalBottom || 0)),
        finalBottom: Math.round(Number(placement.finalBottom || placement.originalBottom || 0)),
        groupHeight: Math.round(Number(placement.groupHeight || 0)),
        pageLimit: Math.round(Number(placement.pageLimit || 842 - finalPlacementBottomMargin))
      };
    }

    function finalOnlyTopForGroup(group, preferredTop, pageHeight, bottomMargin, minTop) {
      if (!group) return minTop;
      const pageLimit = pageHeight - bottomMargin;
      const highestTop = Math.max(minTop, pageLimit - group.groupHeight);
      return Math.max(minTop, Math.min(preferredTop, highestTop));
    }

    function makeFinalOnlyPage(sourcePage, sourceContent, repeatedNodes, watermarkSource, finalNodes, preferredTop, pageHeight, bottomMargin, minTop) {
      const { nextPage, nextContent } = makeContinuationPage(sourcePage, sourceContent, repeatedNodes, watermarkSource);
      finalNodes.forEach((node) => nextContent.appendChild(node));
      const group = finalGroupMetrics(finalNodes);
      const targetTop = finalOnlyTopForGroup(group, preferredTop, pageHeight, bottomMargin, minTop);
      const placement = positionFinalNodesWithGaps(finalNodes, targetTop, pageHeight, bottomMargin);
      if (!placement.fits) positionFinalNodesWithGaps(finalNodes, minTop, pageHeight, bottomMargin);
      nextPage.setAttribute('data-pdf-final-sections-page', 'true');
      return { nextPage, nextContent, targetTop };
    }

    function normalizeAllPageWatermarks() {
      let normalizedCount = 0;
      [...document.querySelectorAll('.design-print-page')].forEach((pageNode) => {
        const pageContent = pageNode.querySelector(':scope > .pdf-a4-page') || pageNode;
        const sourceNode = pageNode.querySelector(':scope > .pdf-page-watermark') || [...pageContent.children].find(isWatermarkNode);
        if (!sourceNode) return;
        normalizePageWatermark(pageNode, pageContent, sourceNode);
        normalizedCount += 1;
      });
      return normalizedCount;
    }

    const renderedTablePadding = 3;
    function frameHeightForRows(rowsHeight) {
      return Math.max(
        rowHeight + titleHeight + headerHeight + renderedTablePadding,
        titleHeight + headerHeight + rowsHeight + renderedTablePadding
      );
    }

    const normalizedWatermarkCount = normalizeAllPageWatermarks();
    const tableShells = [...document.querySelectorAll('.pdf-canvas-table')];
    const tableShell = tableShells.find((table) => table.getAttribute('data-pdf-table-dynamic-rows') !== 'false') || tableShells[0];
    if (!tableShell) {
      return { reason: 'no-design-table', itemRowCount: items.length, rowsPerPage: 0, continuationPageCount: 0, finalPageCount: document.querySelectorAll('.design-print-page').length, normalizedWatermarkCount };
    }

    const frame = tableShell.closest('.pdf-builder-element');
    const pageNode = frame?.closest('.design-print-page');
    const pageContent = pageNode?.querySelector('.pdf-a4-page') || pageNode;
    const grid = tableShell.querySelector('.pdf-canvas-table-grid');
    const head = grid?.querySelector('.pdf-canvas-table-head');
    const existingRows = [...(grid?.querySelectorAll('.pdf-canvas-table-row') || [])];
    if (!frame || !pageNode || !pageContent || !grid || !head || !existingRows.length) {
      return {
        reason: 'invalid-table-structure',
        itemRowCount: items.length,
        rowsPerPage: 0,
        continuationPageCount: 0,
        finalPageCount: document.querySelectorAll('.design-print-page').length,
        hasFrame: Boolean(frame),
        hasPage: Boolean(pageNode),
        hasPageContent: Boolean(pageContent),
        hasGrid: Boolean(grid),
        hasHead: Boolean(head),
        existingRowCount: existingRows.length
      };
    }

    const dynamicRows = tableShell.getAttribute('data-pdf-table-dynamic-rows') !== 'false';
    const rowTemplate = decodeJsonAttribute(tableShell, 'data-pdf-table-row-template', []);
    const sourceRows = dynamicRows && items.length
      ? items.map((item, index) => (Array.isArray(rowTemplate) && rowTemplate.length ? rowTemplate : ['{{item_index}}', '{{item_description}}', '{{item_quantity}}', '{{item_unit_price}}', '{{item_total}}']).map((template) => valueForTemplate(template, item, index)))
      : rowsFromDom(existingRows);

    if (!sourceRows.length) {
      return { reason: 'no-source-rows', itemRowCount: 0, rowsPerPage: 0, continuationPageCount: 0, finalPageCount: document.querySelectorAll('.design-print-page').length };
    }

    const frameRect = frame.getBoundingClientRect();
    const pageRect = pageContent.getBoundingClientRect();
    const titleRect = tableShell.querySelector(':scope > p')?.getBoundingClientRect();
    const headRect = head.getBoundingClientRect();
    const rowRect = existingRows[0].getBoundingClientRect();
    const tableTop = frameRect.top - pageRect.top;
    const titleHeight = titleRect?.height || 0;
    const headerHeight = headRect.height || Number.parseFloat(head.style.minHeight) || 18;
    const rowHeight = Math.max(1, rowRect.height || Number.parseFloat(tableShell.getAttribute('data-pdf-table-row-height')) || 18);
    const tableTemplateFrame = frame.cloneNode(true);
    const rowHeights = measureRowHeights(pageContent, tableTemplateFrame, sourceRows).map((height) => height || rowHeight);

    const sourceWatermark = pageNode.querySelector(':scope > .pdf-page-watermark') || [...pageContent.children].find(isWatermarkNode);
    const watermarkSource = normalizePageWatermark(pageNode, pageContent, sourceWatermark);
    const pageChildren = [...pageContent.children];
    const repeatedNodes = pageChildren.filter((node) => node !== frame && !isWatermarkNode(node) && isSafeRepeatedNode(node));
    const tableBottom = frameRect.bottom - pageRect.top;
    const finalNodes = pageChildren.filter((node) => {
      if (node === frame || !isPositionedFrame(node) || isSafeRepeatedNode(node)) return false;
      const nodeTop = node.getBoundingClientRect().top - pageRect.top;
      return nodeTop >= tableBottom - 1;
    });
    const safeBottomMargin = 56;
    const finalPlacementBottomMargin = 0;
    const finalSectionGap = tableToFinalGap;
    const finalPlacementGap = tableToFinalGap;
    const firstPageFrameHeight = Math.max(
      rowHeight + titleHeight + headerHeight + 4,
      842 - tableTop - safeBottomMargin
    );
    const firstPageRowsHeight = Math.max(rowHeight, firstPageFrameHeight - titleHeight - headerHeight - 4);
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
    const firstPageFinalFrameHeight = Math.max(
      rowHeight + titleHeight + headerHeight + 4,
      Math.min(firstPageFrameHeight, firstFinalTop - tableTop - finalSectionGap)
    );
    const firstPageFinalRowsHeight = Math.max(rowHeight, firstPageFinalFrameHeight - titleHeight - headerHeight - 4);
    const finalFrameHeight = Math.max(
      rowHeight + titleHeight + headerHeight + 4,
      Math.min(continuationFrameHeight, firstFinalTop - continuationTop - finalSectionGap)
    );
    const finalRowsHeight = Math.max(rowHeight, finalFrameHeight - titleHeight - headerHeight - 4);
    const initialFinalGroupHeight = finalGroupMetrics(finalNodes)?.groupHeight || 0;

    function finalSectionsFitAfterRows(top, rowsHeight) {
      return top + frameHeightForRows(rowsHeight) + finalSectionGap + initialFinalGroupHeight <= 842 - finalPlacementBottomMargin + 0.5;
    }

    if (rowsFitHeight(rowHeights, 0, firstPageFinalRowsHeight)) {
      const neededRowsHeight = rowHeights.reduce((sum, height) => sum + Math.max(1, Math.ceil(height || 0)), 0);
      if (dynamicRows && items.length) replaceRows(frame, sourceRows, 0, neededRowsHeight);
      else setPrintTableBodySize(frame, neededRowsHeight);
      const neededFrameHeight = Math.min(firstPageFinalFrameHeight, frameHeightForRows(neededRowsHeight));
      setContinuationFrameBounds(frame, tableTop, neededFrameHeight);
      let finalSectionsPlacement = 'same-page';
      const finalPlacement = placeFinalNodesBelowTable(finalNodes, frame, finalPlacementGap, 842, finalPlacementBottomMargin);
      const finalPlacementDebug = finalPlacementDebugFor(finalPlacement);
      if (finalNodes.length && !finalPlacement.fits) {
        const overflowNodes = Array.isArray(finalPlacement.overflowNodes) && finalPlacement.overflowNodes.length
          ? finalPlacement.overflowNodes
          : finalNodes;
        const finalClones = overflowNodes.map((node) => node.cloneNode(true));
        overflowNodes.forEach((node) => node.remove());
        const { nextPage: finalOnlyPage } = makeFinalOnlyPage(pageNode, pageContent, repeatedNodes, watermarkSource, finalClones, firstFinalTop, 842, finalPlacementBottomMargin, continuationTop);
        pageNode.after(finalOnlyPage);
        finalSectionsPlacement = 'separate-page';
      }
      return {
        itemRowCount: sourceRows.length,
        rowsPerPage: sourceRows.length,
        chunkRowCounts: [sourceRows.length],
        totalRowsRendered: sourceRows.length,
        rowHeight,
        availableRowsHeight: firstPageFinalRowsHeight,
        continuationRowsPerPage: 0,
        continuationRowsHeight,
        finalRowsHeight,
        continuationPageCount: 0,
        finalPageCount: document.querySelectorAll('.design-print-page').length,
        finalSectionsPlacement,
        finalPlacementDebug,
        pageTableDebug: [tableDebugForPage(pageNode)]
      };
    }

    const chunks = [];
    let firstChunk = takeRowsForHeight(sourceRows, rowHeights, 0, firstPageRowsHeight);
    chunks.push({
      rows: firstChunk.rows,
      top: tableTop,
      frameHeight: firstPageFrameHeight,
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
        let nextIndex = continuationChunk.nextIndex;
        const consumesRemainingRows = nextIndex >= sourceRows.length;
        if (finalNodes.length && consumesRemainingRows && sourceRows.length - rowCursor > 1) {
          const remainingRowsHeight = rowHeightSum(rowHeights, rowCursor, sourceRows.length - rowCursor);
          if (!finalSectionsFitAfterRows(continuationTop, remainingRowsHeight)) {
            nextIndex = sourceRows.length - 1;
          }
        }
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
      const neededRowsHeight = rowHeights.reduce((sum, height) => sum + Math.max(1, Math.ceil(height || 0)), 0);
      if (dynamicRows && items.length) replaceRows(frame, sourceRows, 0, neededRowsHeight);
      else setPrintTableBodySize(frame, neededRowsHeight);
      const neededFrameHeight = Math.min(firstPageFrameHeight, frameHeightForRows(neededRowsHeight));
      setContinuationFrameBounds(frame, tableTop, neededFrameHeight);
      let finalSectionsPlacement = 'same-page';
      const finalPlacement = placeFinalNodesBelowTable(finalNodes, frame, finalPlacementGap, 842, finalPlacementBottomMargin);
      const finalPlacementDebug = finalPlacementDebugFor(finalPlacement);
      if (finalNodes.length && !finalPlacement.fits) {
        const overflowNodes = Array.isArray(finalPlacement.overflowNodes) && finalPlacement.overflowNodes.length
          ? finalPlacement.overflowNodes
          : finalNodes;
        const finalClones = overflowNodes.map((node) => node.cloneNode(true));
        overflowNodes.forEach((node) => node.remove());
        const { nextPage: finalOnlyPage } = makeFinalOnlyPage(pageNode, pageContent, repeatedNodes, watermarkSource, finalClones, firstFinalTop, 842, finalPlacementBottomMargin, continuationTop);
        pageNode.after(finalOnlyPage);
        finalSectionsPlacement = 'separate-page';
      }
      return {
        itemRowCount: sourceRows.length,
        rowsPerPage,
        chunkRowCounts: [sourceRows.length],
        totalRowsRendered: sourceRows.length,
        continuationRowsPerPage: 0,
        rowHeight,
        availableRowsHeight: firstPageRowsHeight,
        continuationPageCount: 0,
        finalPageCount: document.querySelectorAll('.design-print-page').length,
        finalSectionsPlacement,
        finalPlacementDebug,
        pageTableDebug: [tableDebugForPage(pageNode)]
      };
    }
    const finalClones = finalNodes.map((node) => node.cloneNode(true));

    finalNodes.forEach((node) => node.remove());
    const firstRowsHeight = rowHeightSum(rowHeights, 0, chunks[0].rows.length);
    const firstVisualFrameHeight = Math.min(chunks[0].frameHeight, frameHeightForRows(firstRowsHeight));
    replaceRows(frame, chunks[0].rows, 0, firstRowsHeight);
    setContinuationFrameBounds(frame, chunks[0].top, firstVisualFrameHeight);

    let insertAfter = pageNode;
    let rowOffset = chunks[0].rows.length;
    let finalSectionsPlacement = 'same-page';
    let finalPlacementDebug = null;
    chunks.slice(1).forEach((chunk, chunkIndex) => {
      const { nextPage, nextContent } = makeContinuationPage(pageNode, pageContent, repeatedNodes, watermarkSource);
      const tableClone = tableTemplateFrame.cloneNode(true);
      const renderedRowsHeight = rowHeightSum(rowHeights, rowOffset, chunk.rows.length);
      const visualFrameHeight = Math.min(chunk.frameHeight, frameHeightForRows(renderedRowsHeight));
      replaceRows(tableClone, chunk.rows, rowOffset, renderedRowsHeight);
      setContinuationFrameBounds(tableClone, chunk.top, visualFrameHeight);
      nextContent.appendChild(tableClone);
      rowOffset += chunk.rows.length;
      const isFinalRenderedChunk = chunkIndex === chunks.length - 2;
      if (isFinalRenderedChunk) {
        finalClones.forEach((node) => nextContent.appendChild(node));
      }
      insertAfter.after(nextPage);
      if (isFinalRenderedChunk) {
        const finalPlacement = placeFinalNodesBelowTable(finalClones, tableClone, finalPlacementGap, 842, finalPlacementBottomMargin);
        finalPlacementDebug = finalPlacementDebugFor(finalPlacement);
        if (finalClones.length && !finalPlacement.fits) {
          const overflowNodes = Array.isArray(finalPlacement.overflowNodes) && finalPlacement.overflowNodes.length
            ? finalPlacement.overflowNodes
            : finalClones;
          const { nextPage: finalOnlyPage } = makeFinalOnlyPage(pageNode, pageContent, repeatedNodes, watermarkSource, overflowNodes, firstFinalTop, 842, finalPlacementBottomMargin, continuationTop);
          nextPage.after(finalOnlyPage);
          insertAfter = finalOnlyPage;
          finalSectionsPlacement = 'separate-page';
          return;
        }
      }
      insertAfter = nextPage;
    });

    return {
      itemRowCount: sourceRows.length,
      rowsPerPage,
      chunkRowCounts: chunks.map((chunk) => chunk.rows.length),
      totalRowsRendered: chunks.reduce((sum, chunk) => sum + chunk.rows.length, 0),
      rowHeight,
      availableRowsHeight: firstPageRowsHeight,
      continuationRowsPerPage: Math.max(0, ...chunks.slice(1).map((chunk) => chunk.rows.length)),
      continuationRowsHeight,
      finalRowsHeight,
      continuationPageCount: chunks.length - 1,
      finalPageCount: document.querySelectorAll('.design-print-page').length,
      finalSectionsPlacement,
      finalPlacementDebug,
      pageTableDebug: [...document.querySelectorAll('.design-print-page')].map((node) => tableDebugForPage(node))
    };
  }, { invoiceItems, templateContext: context, templateKey: key });
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
    const paginationMetrics = await paginateInvoiceTablesForPrint(page, { key, context });
    const blankPageCleanup = await page.evaluate(() => {
      function nodeClassText(node) {
        return String(node?.getAttribute?.('class') || node?.className || '').toLowerCase();
      }

      function ignoredNode(node) {
        const classText = nodeClassText(node);
        return Boolean(node.closest?.('.pdf-page-watermark'))
          || Boolean(node.closest?.('[data-pdf-layer-kind="background"], .is-background-element, .pdf-canvas-image.is-watermark, .is-watermark'))
          || classText.includes('watermark');
      }

      function parsedRgb(value = '') {
        const match = String(value || '').trim().match(/^rgba?\(([^)]+)\)$/i);
        if (!match) return null;
        const parts = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
        if (parts.length < 3 || parts.slice(0, 3).some((part) => !Number.isFinite(part))) return null;
        return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 && Number.isFinite(parts[3]) ? parts[3] : 1 };
      }

      function colorPainted(value = '', ignoreWhite = false) {
        const color = String(value || '').trim().toLowerCase();
        if (!color || color === 'transparent' || color === 'none') return false;
        const rgb = parsedRgb(color);
        if (!rgb) return true;
        if (rgb.a <= 0) return false;
        if (ignoreWhite && rgb.r >= 248 && rgb.g >= 248 && rgb.b >= 248) return false;
        return true;
      }

      function borderPainted(style, side) {
        const width = Number.parseFloat(style.getPropertyValue(`border-${side}-width`) || '0');
        const borderStyle = style.getPropertyValue(`border-${side}-style`);
        const color = style.getPropertyValue(`border-${side}-color`);
        return width > 0 && borderStyle !== 'none' && colorPainted(color, true);
      }

      function directTextPainted(node, style) {
        if (!colorPainted(style.color)) return false;
        return [...(node.childNodes || [])].some((child) => child.nodeType === Node.TEXT_NODE && String(child.textContent || '').trim());
      }

      function nodePainted(node) {
        if (!node?.getBoundingClientRect || ignoredNode(node)) return false;
        const tag = String(node.tagName || '').toLowerCase();
        const classText = nodeClassText(node);
        if (classText.includes('design-print-page') || classText.includes('design-print-document') || classText.includes('pdf-a4-page')) return false;
        const style = window.getComputedStyle(node);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) === 0) return false;
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        if (['img', 'svg', 'canvas', 'path', 'rect', 'circle', 'line', 'polyline', 'polygon'].includes(tag)) return true;
        if (directTextPainted(node, style)) return true;
        if (colorPainted(style.backgroundColor, true)) return true;
        if (style.boxShadow && style.boxShadow !== 'none') return true;
        return ['top', 'right', 'bottom', 'left'].some((side) => borderPainted(style, side));
      }

      function pageHasContent(pageNode) {
        const content = pageNode.querySelector?.(':scope > .pdf-a4-page') || pageNode;
        return [content, ...(content.querySelectorAll?.('*') || [])].some(nodePainted);
      }

      let removed = 0;
      [...document.querySelectorAll('.design-print-page')].forEach((pageNode) => {
        const pagesLeft = document.querySelectorAll('.design-print-page').length;
        if (pagesLeft <= 1) return;
        if (pageHasContent(pageNode)) return;
        pageNode.remove();
        removed += 1;
      });
      const pages = [...document.querySelectorAll('.design-print-page')];
      pages.forEach((pageNode, index) => {
        if (index === pages.length - 1) {
          pageNode.style.breakAfter = 'auto';
          pageNode.style.pageBreakAfter = 'auto';
        }
      });
      return { removed, finalPageCount: pages.length };
    });
    if (process.env.PDF_DOM_PAGINATION_DEBUG === '1' && paginationMetrics) {
      console.info('[pdf-dom-pagination]', JSON.stringify({
        key,
        filenamePrefix: cleanPrefix,
        reason: paginationMetrics.reason,
        itemRowCount: paginationMetrics.itemRowCount,
        chunkRowCounts: paginationMetrics.chunkRowCounts || [],
        totalRowsRendered: paginationMetrics.totalRowsRendered,
        continuationPageCount: paginationMetrics.continuationPageCount,
        finalPageCount: paginationMetrics.finalPageCount,
        blankPageCleanup,
        finalPlacementDebug: paginationMetrics.finalPlacementDebug || null,
        pageTableDebug: paginationMetrics.pageTableDebug || []
      }));
    }
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
