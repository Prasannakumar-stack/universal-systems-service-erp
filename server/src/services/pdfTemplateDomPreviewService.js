import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { PDF_DIR, PORT } from '../config.js';
import { appError } from '../utils/http.js';

const MAX_DRAFT_HTML_BYTES = 4_500_000;
const DRAFT_CANVAS_WIDTH = 595;
const DRAFT_CANVAS_HEIGHT = 842;
const CSS_SCALE = 96 / 72;

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

function validateDraftRequest({ key, draftCanvasHtml, draftMeta }) {
  if (key !== 'invoice') throw appError('Draft DOM preview is only available for invoice templates', 400);
  if (!draftMeta || draftMeta.templateKey !== 'invoice') throw appError('Invalid invoice draft preview metadata', 400);
  const html = String(draftCanvasHtml || '').trim();
  if (!html) throw appError('Invoice draft preview requires a captured design canvas', 400);
  if (byteLength(html) > MAX_DRAFT_HTML_BYTES) throw appError('Invoice draft preview canvas is too large', 413);
  const width = Number(draftMeta.width);
  const height = Number(draftMeta.height);
  if (Math.round(width) !== DRAFT_CANVAS_WIDTH || Math.round(height) !== DRAFT_CANVAS_HEIGHT) {
    throw appError('Invoice draft preview canvas size is invalid', 400);
  }
  return html;
}

function previewHtmlDocument(canvasHtml = '') {
  const safeHtml = stripUnsafeHtml(canvasHtml);
  const serverBase = `http://localhost:${PORT}`;
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <base href="${serverBase}/">
  <style>
    @page { size: A4; margin: 0; }
    html, body {
      width: 210mm;
      height: 297mm;
      margin: 0;
      padding: 0;
      overflow: hidden;
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
    .draft-print-shell {
      position: absolute;
      inset: 0 auto auto 0;
      width: ${DRAFT_CANVAS_WIDTH}px;
      height: ${DRAFT_CANVAS_HEIGHT}px;
      overflow: hidden;
      transform: scale(${CSS_SCALE});
      transform-origin: top left;
      background: #ffffff;
    }
    .draft-print-shell .pdf-a4-page {
      position: relative !important;
      width: ${DRAFT_CANVAS_WIDTH}px !important;
      height: ${DRAFT_CANVAS_HEIGHT}px !important;
      transform: none !important;
      overflow: hidden !important;
      margin: 0 !important;
    }
    .draft-print-shell img,
    .draft-print-shell svg {
      max-width: none;
    }
  </style>
</head>
<body>
  <main class="draft-print-shell">${safeHtml}</main>
</body>
</html>`;
}

export async function renderInvoiceDraftDomPreviewPdf({ key, draftCanvasHtml, draftMeta }) {
  const html = validateDraftRequest({ key, draftCanvasHtml, draftMeta });
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const filename = `${key}-draft-dom-preview-${Date.now()}.pdf`;
  const filePath = path.join(PDF_DIR, filename);
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: {
        width: Math.round(DRAFT_CANVAS_WIDTH * CSS_SCALE),
        height: Math.round(DRAFT_CANVAS_HEIGHT * CSS_SCALE)
      },
      javaScriptEnabled: false
    });
    await page.setContent(previewHtmlDocument(html), { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
      pageRanges: '1'
    });
    fs.writeFileSync(filePath, pdf);
    await page.close();
  } finally {
    await browser.close();
  }
  return { filePath, filename };
}
