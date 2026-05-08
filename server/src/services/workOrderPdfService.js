import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import WorkOrder from '../models/WorkOrder.js';
import { COMPANY, LOGO_FULL_PATH, PDF_DIR } from '../config.js';
import { appError } from '../utils/http.js';

const fontPath = 'C:\\Windows\\Fonts\\arial.ttf';
const boldFontPath = 'C:\\Windows\\Fonts\\arialbd.ttf';

const pdfTypes = ['quotation', 'work', 'service-completed'];

function fontExists(filePath) {
  return fs.existsSync(filePath);
}

function registerFonts(doc) {
  if (fontExists(fontPath)) doc.registerFont('Body', fontPath);
  if (fontExists(boldFontPath)) doc.registerFont('BodyBold', boldFontPath);
  doc.font(fontExists(fontPath) ? 'Body' : 'Helvetica');
}

function money(value) {
  return `\u20b9${Number(value || 0).toFixed(2)}`;
}

function wordsBelowThousand(number) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const n = Math.floor(number);
  if (n < 20) return ones[n];
  if (n < 100) return `${tens[Math.floor(n / 10)]} ${ones[n % 10]}`.trim();
  return `${ones[Math.floor(n / 100)]} Hundred ${wordsBelowThousand(n % 100)}`.trim();
}

function amountInWords(value) {
  let n = Math.round(Number(value || 0));
  if (n === 0) return 'Zero Rupees Only';
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  const chunks = [];
  if (crore) chunks.push(`${wordsBelowThousand(crore)} Crore`);
  if (lakh) chunks.push(`${wordsBelowThousand(lakh)} Lakh`);
  if (thousand) chunks.push(`${wordsBelowThousand(thousand)} Thousand`);
  if (n) chunks.push(wordsBelowThousand(n));
  return `${chunks.join(' ')} Rupees Only`;
}

function cleanFilePart(value) {
  return String(value || 'work-order').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase();
}

async function getPdfWorkOrder(workOrderId, user) {
  const workOrder = await WorkOrder.findById(workOrderId)
    .populate('customerId', 'name phone address devices')
    .populate('technicianId', 'name username role')
    .populate('bookingId', 'bookingCode')
    .populate('invoiceId', 'invoiceNumber total paidAmount balance status');
  if (!workOrder) throw appError('Work order not found', 404);
  if (user.role === 'technician' && String(workOrder.technicianId?._id) !== String(user._id)) {
    throw appError('You do not have permission to view this work order', 403);
  }
  return workOrder;
}

function isAllowed(type, workOrder) {
  const status = workOrder.status;
  if (type === 'quotation') return status === 'Pending';
  if (type === 'work') return status === 'Completed';
  if (type === 'service-completed') return status === 'Delivered';
  return false;
}

function customerId(workOrder) {
  return workOrder.bookingId?.bookingCode || `WO-${String(workOrder._id).slice(-6).toUpperCase()}`;
}

function serviceType(workOrder) {
  return workOrder.device || 'Service';
}

function buildRows(workOrder) {
  const rows = [];
  const serviceCharge = Number(workOrder.serviceCharge || 0);
  rows.push({
    description: `Service (${serviceType(workOrder)})`,
    quantity: 1,
    price: serviceCharge,
    total: serviceCharge
  });
  (workOrder.partsUsed || []).forEach((part) => {
    rows.push({
      description: part.name,
      quantity: part.quantity,
      price: part.unitPrice,
      total: part.total
    });
  });
  return rows;
}

function addHeader(doc, title) {
  registerFonts(doc);
  doc.fillColor('#0f2a52');
  if (fs.existsSync(LOGO_FULL_PATH)) doc.image(LOGO_FULL_PATH, 42, 30, { width: 155 });
  doc.font(fontExists(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fontSize(17).text(COMPANY.name, 340, 34, { width: 200, align: 'right' });
  doc.font(fontExists(fontPath) ? 'Body' : 'Helvetica').fontSize(9).fillColor('#32445c');
  doc.text(COMPANY.address.replace(/\n/g, ', '), 300, 60, { width: 240, align: 'right' });
  doc.text(`Phone: ${COMPANY.phones.join(' / ')}`, 300, 98, { width: 240, align: 'right' });
  doc.text(`Email: ${COMPANY.email}`, 300, 114, { width: 240, align: 'right' });
  doc.roundedRect(40, 150, 515, 34, 4).fill('#0f2a52');
  doc.fillColor('#ffffff').font(fontExists(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fontSize(15).text(title, 52, 160);
}

function addCustomerDetails(doc, workOrder, y) {
  const customer = workOrder.customerId || {};
  doc.font(fontExists(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fontSize(11).fillColor('#0f172a').text('CUSTOMER DETAILS', 52, y);
  doc.font(fontExists(fontPath) ? 'Body' : 'Helvetica').fontSize(9).fillColor('#334155');
  const left = [
    `Customer ID: ${customerId(workOrder)}`,
    `Date: ${new Date().toLocaleDateString('en-IN')}`,
    `Service Type: ${serviceType(workOrder)}`
  ];
  const right = [
    `Customer Name: ${customer.name || '-'}`,
    `Customer Address: ${customer.address || '-'}`,
    `Customer Phone: ${customer.phone || '-'}`
  ];
  left.forEach((text, index) => doc.text(text, 52, y + 20 + index * 16, { width: 230 }));
  right.forEach((text, index) => doc.text(text, 310, y + 20 + index * 16, { width: 230 }));
}

function table(doc, rows, startY, lastColumnLabel) {
  const columns = [
    { label: 'Description', x: 52, width: 250 },
    { label: 'Quantity', x: 310, width: 60 },
    { label: 'Price', x: 376, width: 74 },
    { label: lastColumnLabel, x: 456, width: 88 }
  ];
  let y = startY;
  doc.roundedRect(48, y, 500, 24, 2).fill('#eaf1fb');
  doc.fillColor('#0f2a52').font(fontExists(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fontSize(9);
  columns.forEach((col) => doc.text(col.label, col.x, y + 8, { width: col.width }));
  y += 24;
  doc.font(fontExists(fontPath) ? 'Body' : 'Helvetica').fillColor('#1e293b');
  rows.forEach((row) => {
    const rowHeight = Math.max(28, doc.heightOfString(row.description, { width: 240 }) + 14);
    doc.rect(48, y, 500, rowHeight).strokeColor('#d7dee8').stroke();
    doc.text(row.description, 52, y + 9, { width: 250 });
    doc.text(String(row.quantity), 310, y + 9, { width: 60 });
    doc.text(money(row.price), 376, y + 9, { width: 74 });
    doc.text(money(row.total), 456, y + 9, { width: 88 });
    y += rowHeight;
  });
  return y + 18;
}

function footer(doc, message = '') {
  const y = 770;
  doc.strokeColor('#cbd5e1').lineWidth(0.7).moveTo(40, y - 8).lineTo(555, y - 8).stroke();
  doc.fontSize(8).fillColor('#64748b').text(message || `${COMPANY.name} | ${COMPANY.phones.join(' / ')} | ${COMPANY.email}`, 40, y, {
    width: 515,
    align: 'center'
  });
}

function buildQuotation(doc, workOrder) {
  addHeader(doc, 'QUOTATION');
  addCustomerDetails(doc, workOrder, 205);
  const rows = buildRows(workOrder);
  const partsTotal = (workOrder.partsUsed || []).reduce((sum, part) => sum + Number(part.total || 0), 0);
  const productsTotal = Number(workOrder.serviceCharge || 0);
  const finalTotal = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  let y = table(doc, rows, 315, 'Total');
  doc.font(fontExists(fontPath) ? 'Body' : 'Helvetica').fontSize(9).fillColor('#334155');
  doc.text(`Parts Total: ${money(partsTotal)}`, 356, y, { width: 188, align: 'right' });
  doc.text(`Products Total: ${money(productsTotal)}`, 356, y + 16, { width: 188, align: 'right' });
  doc.font(fontExists(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fillColor('#0f172a').text(`Final Total: ${money(finalTotal)}`, 356, y + 36, { width: 188, align: 'right' });
  y += 82;
  doc.fontSize(10).text('Terms & Conditions:', 52, y);
  doc.font(fontExists(fontPath) ? 'Body' : 'Helvetica').fontSize(9).fillColor('#334155');
  doc.text('1. This is not an invoice, only an estimate', 52, y + 18);
  doc.text('2. Payment required before delivery', 52, y + 34);
  footer(doc);
}

function buildInvoice(doc, workOrder) {
  addHeader(doc, 'INVOICE');
  addCustomerDetails(doc, workOrder, 205);
  const rows = buildRows(workOrder);
  const subtotal = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const invoice = workOrder.invoiceId;
  const total = Number(invoice?.total ?? subtotal);
  let y = table(doc, rows, 315, 'Subtotal');
  doc.font(fontExists(fontPath) ? 'Body' : 'Helvetica').fontSize(9).fillColor('#334155');
  doc.text(`Subtotal: ${money(subtotal)}`, 356, y, { width: 188, align: 'right' });
  doc.font(fontExists(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fillColor('#0f172a');
  doc.text(`Total Amount: ${money(total)}`, 356, y + 20, { width: 188, align: 'right' });
  doc.font(fontExists(fontPath) ? 'Body' : 'Helvetica').fillColor('#334155');
  doc.text(`Amount in Words: ${amountInWords(total)}`, 52, y + 58, { width: 492 });
  doc.text(`Payment Status: ${invoice?.status || 'Pending'}`, 52, y + 78);
  doc.font(fontExists(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fillColor('#0f172a').text('WORK NOTICE', 52, y + 116);
  doc.font(fontExists(fontPath) ? 'Body' : 'Helvetica').fillColor('#334155').text('Your product/service has been successfully completed.\nYou may collect your product.', 52, y + 136, { width: 492, lineGap: 5 });
  footer(doc, 'Thank you for choosing Universal Systems.');
}

function buildServiceCompleted(doc, workOrder) {
  const customer = workOrder.customerId || {};
  addHeader(doc, 'SERVICE COMPLETED!');
  doc.font(fontExists(fontPath) ? 'Body' : 'Helvetica').fontSize(12).fillColor('#334155');
  doc.text(`Dear ${customer.name || 'Customer'},`, 70, 240);
  doc.text('Thank you for choosing UNIVERSAL SYSTEMS.', 70, 280, { width: 455, lineGap: 5 });
  doc.text('We are delighted to inform that your service has been successfully completed.', 70, 320, { width: 455, lineGap: 5 });
  doc.text('Your trust and support mean a lot to us.', 70, 370, { width: 455, lineGap: 5 });
  doc.font(fontExists(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fillColor('#0f2a52');
  doc.text('\u2605 Your satisfaction is our priority', 90, 430);
  doc.text('\u2605 Quality service you can trust', 90, 456);
  doc.font(fontExists(fontPath) ? 'Body' : 'Helvetica').fillColor('#334155');
  doc.text('Warm Regards,', 70, 540);
  doc.font(fontExists(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').text('UNIVERSAL SYSTEMS', 70, 565);
  doc.font(fontExists(fontPath) ? 'Body' : 'Helvetica').text(`Contact: ${COMPANY.phones.join(' / ')}`, 70, 590);
  doc.font(fontExists(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fillColor('#0f172a').text('We appreciate your business. Visit us again!', 70, 670, {
    width: 455,
    align: 'center'
  });
  footer(doc);
}

function buildPdf(doc, type, workOrder) {
  if (type === 'quotation') buildQuotation(doc, workOrder);
  if (type === 'work') buildInvoice(doc, workOrder);
  if (type === 'service-completed') buildServiceCompleted(doc, workOrder);
}

export function pdfCaption(type, workOrder) {
  const customer = workOrder.customerId || {};
  const total = buildRows(workOrder).reduce((sum, row) => sum + Number(row.total || 0), 0);
  if (type === 'quotation') return `Hello ${customer.name || 'Customer'}, please find your quotation from Universal Systems for ${serviceType(workOrder)}. Total: ${money(total)}. Please confirm approval.`;
  if (type === 'work') return `Hello ${customer.name || 'Customer'}, your invoice/work details from Universal Systems are ready. Total: ${money(workOrder.invoiceId?.total ?? total)}.`;
  return `Hello ${customer.name || 'Customer'}, your service has been completed successfully. Thank you for choosing Universal Systems.`;
}

export async function generateWorkOrderPdf({ workOrderId, type, user }) {
  if (!pdfTypes.includes(type)) throw appError('Invalid PDF type');
  const workOrder = await getPdfWorkOrder(workOrderId, user);
  if (!isAllowed(type, workOrder)) throw appError('Available after status change', 409);

  fs.mkdirSync(PDF_DIR, { recursive: true });
  const filename = `${customerId(workOrder)}-${cleanFilePart(type)}-${Date.now()}.pdf`;
  const filePath = path.join(PDF_DIR, filename);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: false });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    buildPdf(doc, type, workOrder);
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return { filePath, filename, workOrder, caption: pdfCaption(type, workOrder) };
}
