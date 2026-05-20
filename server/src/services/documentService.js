import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import PDFDocument from 'pdfkit';
import Customer from '../models/Customer.js';
import Document from '../models/Document.js';
import Invoice from '../models/Invoice.js';
import WorkOrder from '../models/WorkOrder.js';
import { COMPANY, PDF_DIR } from '../config.js';
import { appError, clean, numberValue } from '../utils/http.js';
import { addDateRange, paginationMeta, parsePagination, searchRegex, validObjectId, withNestedIds } from '../utils/pagination.js';
import { logAudit } from './auditService.js';

const populateDocument = [
  { path: 'customerId', select: 'name phone address devices' },
  { path: 'workOrderId', select: 'device issue status serviceCharge partsUsed technicianId createdAt', populate: { path: 'technicianId', select: 'name username' } },
  { path: 'invoiceId', select: 'invoiceNumber total paidAmount balance status' }
];

function documentTitle(type) {
  if (type === 'invoice') return 'Invoice';
  if (type === 'quotation') return 'Quotation';
  return 'Service Report';
}

function invoiceNumber() {
  return `INV-${new Date().getFullYear()}-${randomUUID().slice(0, 7).toUpperCase()}`;
}

export async function createDocument(payload, user = null) {
  const type = clean(payload.type).toLowerCase();
  if (!['invoice', 'quotation', 'service'].includes(type)) throw appError('Invalid document type');

  const workOrder = await WorkOrder.findById(payload.workOrderId).populate('customerId');
  if (!workOrder) throw appError('Work order not found', 404);

  const serviceCharge = numberValue(workOrder.serviceCharge, 0);
  const items = workOrder.partsUsed.map((part) => ({
    name: part.name,
    quantity: part.quantity,
    price: part.unitPrice,
    subtotal: part.total
  }));
  const itemsTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalAmount = itemsTotal + serviceCharge;

  const document = await Document.create({
    type,
    workOrderId: workOrder._id,
    customerId: workOrder.customerId._id,
    items,
    serviceCharge,
    totalAmount,
    status: 'draft'
  });

  if (type === 'invoice') {
    const invoiceItems = [
      ...(serviceCharge > 0 ? [{ description: 'Service charge', quantity: 1, rate: serviceCharge, amount: serviceCharge }] : []),
      ...items.map((item) => ({ description: item.name, quantity: item.quantity, rate: item.price, amount: item.subtotal }))
    ];
    const invoice = await Invoice.create({
      invoiceNumber: invoiceNumber(),
      workOrderId: workOrder._id,
      customerId: workOrder.customerId._id,
      items: invoiceItems.length ? invoiceItems : [{ description: 'Service work', quantity: 1, rate: 0, amount: 0 }],
      total: totalAmount,
      paidAmount: 0,
      balance: totalAmount,
      status: 'Pending'
    });
    document.invoiceId = invoice._id;
    workOrder.invoiceId = invoice._id;
    await Promise.all([document.save(), workOrder.save()]);
  }

  await logAudit({
    userId: user?._id || null,
    action: 'created',
    module: 'document',
    recordId: document._id,
    after: { type: document.type, totalAmount: document.totalAmount, workOrderId: document.workOrderId }
  });

  return getDocument(document._id);
}

export async function listDocuments(query = {}) {
  const filter = {};
  const clauses = [];
  const { page, limit, skip } = parsePagination(query);
  if (clean(query.type)) filter.type = clean(query.type);
  if (clean(query.status)) filter.status = clean(query.status);
  if (validObjectId(query.customerId)) filter.customerId = validObjectId(query.customerId);
  addDateRange(filter, query);

  const regex = searchRegex(query.search);
  if (regex) {
    const [customers, workOrders] = await Promise.all([
      Customer.find({ $or: [{ name: regex }, { phone: regex }, { email: regex }] }).select('_id').limit(1000).lean(),
      WorkOrder.find({ $or: [{ device: regex }, { issue: regex }, { serviceType: regex }] }).select('_id').limit(1000).lean()
    ]);
    clauses.push({
      $or: [
        { type: regex },
        { status: regex },
        { customerId: { $in: customers.map((item) => item._id) } },
        { workOrderId: { $in: workOrders.map((item) => item._id) } }
      ]
    });
  }
  if (clauses.length) filter.$and = clauses;

  const [total, rows] = await Promise.all([
    Document.countDocuments(filter),
    Document.find(filter).populate(populateDocument).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
  ]);
  const documents = rows.map((document) => withNestedIds(document, ['customerId', 'workOrderId', 'invoiceId']));
  return { documents, pagination: paginationMeta(page, limit, total) };
}

export async function getDocument(id) {
  const document = await Document.findById(id).populate(populateDocument);
  if (!document) throw appError('Document not found', 404);
  return document;
}

export async function generateDocumentPdf(id) {
  const document = await getDocument(id);
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const filename = `${document.type}-${document.id}.pdf`;
  const filePath = path.join(PDF_DIR, filename);
  const pdf = new PDFDocument({ margin: 48, size: 'A4' });
  const stream = fs.createWriteStream(filePath);
  pdf.pipe(stream);

  const title = documentTitle(document.type);
  pdf.fontSize(20).text(COMPANY.name, { align: 'left' });
  pdf.fontSize(10).fillColor('#555').text(COMPANY.address).text(`${COMPANY.phones.join(' / ')} | ${COMPANY.email}`);
  pdf.moveDown();
  pdf.fillColor('#111').fontSize(18).text(title, { align: 'right' });
  pdf.fontSize(10).text(`Date: ${new Date(document.createdAt).toLocaleDateString('en-IN')}`, { align: 'right' });
  pdf.moveDown();

  const customer = document.customerId;
  const workOrder = document.workOrderId;
  pdf.fontSize(12).text('Customer Details', { underline: true });
  pdf.fontSize(10).text(customer.name).text(customer.phone).text(customer.address || '');
  pdf.moveDown();
  pdf.fontSize(12).text('Work Order', { underline: true });
  pdf.fontSize(10).text(`Device: ${workOrder.device}`).text(`Issue: ${workOrder.issue}`).text(`Status: ${workOrder.status}`);
  pdf.moveDown();

  pdf.fontSize(12).text('Items', { underline: true });
  pdf.moveDown(0.5);
  const startX = pdf.x;
  pdf.fontSize(10).text('Item', startX, pdf.y, { width: 230, continued: true }).text('Qty', { width: 55, align: 'right', continued: true }).text('Price', { width: 95, align: 'right', continued: true }).text('Subtotal', { width: 95, align: 'right' });
  pdf.moveTo(startX, pdf.y + 3).lineTo(545, pdf.y + 3).stroke();
  pdf.moveDown(0.6);
  document.items.forEach((item) => {
    pdf.text(item.name, startX, pdf.y, { width: 230, continued: true }).text(String(item.quantity), { width: 55, align: 'right', continued: true }).text(item.price.toFixed(2), { width: 95, align: 'right', continued: true }).text(item.subtotal.toFixed(2), { width: 95, align: 'right' });
  });
  if (!document.items.length) pdf.text('No parts used', startX, pdf.y);
  pdf.moveDown();
  pdf.text(`Service Charge: ${document.serviceCharge.toFixed(2)}`, { align: 'right' });
  pdf.fontSize(13).text(`Total: ${document.totalAmount.toFixed(2)}`, { align: 'right' });
  pdf.moveDown();

  if (document.type === 'service') {
    pdf.fontSize(12).text('Service Report', { underline: true });
    pdf.fontSize(10).text(`Technician: ${workOrder.technicianId?.name || 'Admin'}`).text(`Resolution Status: ${workOrder.status}`);
  }

  pdf.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  return { filePath, filename };
}
