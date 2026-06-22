import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import PDFDocument from 'pdfkit';
import Customer from '../models/Customer.js';
import Document from '../models/Document.js';
import Invoice from '../models/Invoice.js';
import WorkOrder from '../models/WorkOrder.js';
import { COMPANY, LOGO_FULL_PATH, PDF_DIR } from '../config.js';
import { assertPermission } from '../permissions.js';
import { appError, clean, numberValue } from '../utils/http.js';
import { addDateRange, paginationMeta, parsePagination, searchRegex, validObjectId, withNestedIds } from '../utils/pagination.js';
import { logAudit } from './auditService.js';
import {
  canRenderPublishedInvoiceDom,
  documentTemplateContext,
  getTemplateByDocumentType,
  renderPublishedInvoiceDomTemplate,
  renderTemplateText,
  templateAccent
} from './pdfTemplateService.js';
import { getCompanyIdentity } from './companyProfileService.js';
import { getTechnicianScope } from './technicianScopeService.js';
import { getBusinessSettings } from './businessSettingsService.js';
import { renderInvoicePdf } from './invoicePdfTemplate.js';
import { renderQuotationPdf } from './quotationPdfTemplate.js';
import { renderServiceCompletedPdf } from './serviceCompletedPdfTemplate.js';

const populateDocument = [
  { path: 'customerId', select: 'name phone address devices' },
  { path: 'workOrderId', select: 'device deviceBrand deviceModel issue status serviceType serviceCharge partsUsed technicianId createdAt brandModel model serialNumber deviceSerialNumber serialNo', populate: { path: 'technicianId', select: 'name username' } },
  { path: 'invoiceId', select: 'invoiceNumber total paidAmount balance status createdAt' }
];

function documentTitle(type) {
  if (type === 'invoice') return 'Invoice';
  if (type === 'quotation') return 'Quotation';
  return 'Service Report';
}

function invoiceNumber() {
  return `INV-${new Date().getFullYear()}-${randomUUID().slice(0, 7).toUpperCase()}`;
}

function documentDate(value = new Date()) {
  const date = new Date(value || new Date());
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  return [
    String(safe.getDate()).padStart(2, '0'),
    String(safe.getMonth() + 1).padStart(2, '0'),
    safe.getFullYear()
  ].join('-');
}

function deviceBrandModel(workOrder = {}) {
  const combined = [workOrder.deviceBrand, workOrder.deviceModel].map((value) => String(value || '').trim()).filter(Boolean).join(' ');
  return combined || workOrder.brandModel || workOrder.deviceModel || workOrder.model || workOrder.device || '-';
}

function workOrderReference(workOrder = {}) {
  const existing = [workOrder.workOrderNumber, workOrder.workOrderId, workOrder.displayId]
    .find(Boolean);
  if (existing) return String(existing).trim().toUpperCase();
  const date = workOrder.createdAt ? new Date(workOrder.createdAt) : new Date();
  const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
  return `WO-${year}-${String(workOrder._id || workOrder.id || '').slice(-6).toUpperCase()}`;
}

export async function createDocument(payload, user = null) {
  assertPermission(user, 'create_invoice');
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

  return getDocument(document._id, user);
}

export async function listDocuments(query = {}, user = null) {
  const filter = {};
  const clauses = [];
  const { page, limit, skip } = parsePagination(query);
  const technicianScope = await getTechnicianScope(user);
  if (technicianScope) filter.workOrderId = { $in: technicianScope.workOrderObjectIds };
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

export async function getDocument(id, user = null) {
  const document = await Document.findById(id).populate(populateDocument);
  if (!document) throw appError('Document not found', 404);
  const technicianScope = await getTechnicianScope(user);
  if (technicianScope) {
    const workOrderId = String(document.workOrderId?._id || document.workOrderId || '');
    const customerId = String(document.customerId?._id || document.customerId || '');
    if (!technicianScope.workOrderIds.includes(workOrderId) && !technicianScope.customerIds.includes(customerId)) {
      throw appError('Document not found', 404);
    }
  }
  return document;
}

export async function generateDocumentPdf(id, user = null) {
  const document = await getDocument(id, user);
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const filename = `${document.type}-${document.id}-${Date.now()}.pdf`;
  const filePath = path.join(PDF_DIR, filename);
  const template = await getTemplateByDocumentType(document.type);
  const templateConfig = template?.config || {};
  const [company, businessSettings] = await Promise.all([
    getCompanyIdentity(),
    getBusinessSettings().catch(() => null)
  ]);
  const context = documentTemplateContext(document, company);
  if (canRenderPublishedInvoiceDom(template)) {
    return renderPublishedInvoiceDomTemplate(
      template,
      context,
      `${document.type}-${document.id}-published-design`
    );
  }
  const accent = templateAccent(template);
  const pdf = new PDFDocument({ margin: 48, size: 'A4', bufferPages: true });
  const stream = fs.createWriteStream(filePath);
  pdf.pipe(stream);

  if (document.type === 'quotation') {
    const customer = document.customerId || {};
    const workOrder = document.workOrderId || {};
    const items = [
      ...(Number(document.serviceCharge || 0) > 0
        ? [{ description: 'General Service', quantity: 1, unitPrice: document.serviceCharge, total: document.serviceCharge }]
        : []),
      ...(document.items || []).map((item) => ({
        description: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.subtotal
      }))
    ];
    renderQuotationPdf(pdf, {
      company,
      template,
      context,
      taxSettings: businessSettings?.taxGst || {},
      quotation: {
        jobReference: workOrderReference(workOrder),
        quotationDate: documentDate(document.createdAt || new Date()),
        quotationStatus: 'Pending Approval',
        customerName: customer.name || '-',
        customerPhone: customer.phone || '-',
        customerAddress: customer.address || '-',
        serviceType: workOrder.serviceType || workOrder.device || '-',
        device: workOrder.device || '-',
        brandModel: deviceBrandModel(workOrder),
        problemComplaint: workOrder.issue || '-',
        technician: workOrder.technicianId?.name || workOrder.technicianId?.username || '',
        serialNumber: workOrder.serialNumber || workOrder.deviceSerialNumber || workOrder.serialNo || '',
        items
      }
    });
    pdf.end();
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
    return { filePath, filename };
  }

  if (document.type === 'invoice') {
    const customer = document.customerId || {};
    const workOrder = document.workOrderId || {};
    const invoice = document.invoiceId || {};
    const items = [
      ...(Number(document.serviceCharge || 0) > 0
        ? [{ description: 'General Service', quantity: 1, unitPrice: document.serviceCharge, total: document.serviceCharge }]
        : []),
      ...(document.items || []).map((item) => ({
        description: item.name,
        quantity: item.quantity,
        unitPrice: item.price,
        total: item.subtotal
      }))
    ];
    const total = Number(invoice.total ?? document.totalAmount ?? items.reduce((sum, item) => sum + Number(item.total || 0), 0));
    const paidAmount = Number(invoice.paidAmount || 0);
    renderInvoicePdf(pdf, {
      company,
      template,
      context,
      invoice: {
        invoiceNo: invoice.invoiceNumber || context.invoice_number || '-',
        jobReference: workOrderReference(workOrder),
        invoiceDate: documentDate(invoice.createdAt || document.createdAt || new Date()),
        paymentStatus: invoice.status || 'Pending',
        customerName: customer.name || '-',
        customerPhone: customer.phone || '-',
        customerAddress: customer.address || '-',
        serviceType: workOrder.serviceType || workOrder.device || '-',
        device: workOrder.device || '-',
        brandModel: deviceBrandModel(workOrder),
        problemComplaint: workOrder.issue || '-',
        technician: workOrder.technicianId?.name || workOrder.technicianId?.username || '',
        items,
        subtotal: items.reduce((sum, item) => sum + Number(item.total || 0), 0),
        finalTotal: total,
        amountPaid: paidAmount,
        balance: Number(invoice.balance ?? Math.max(0, total - paidAmount))
      }
    });
    pdf.end();
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
    return { filePath, filename };
  }

  if (document.type === 'service') {
    const customer = document.customerId || {};
    renderServiceCompletedPdf(pdf, {
      company,
      template,
      context,
      service: {
        customerName: customer.name || 'Customer'
      }
    });
    pdf.end();
    await new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
    });
    return { filePath, filename };
  }

  const title = documentTitle(document.type);
  const logoPath = company.logoFilePath || LOGO_FULL_PATH;
  if (templateConfig.showCompanyLogo !== false && logoPath && fs.existsSync(logoPath)) pdf.image(logoPath, 48, 36, { width: 145 });
  pdf.fontSize(20).fillColor(accent).text(company.name || COMPANY.name, { align: 'right' });
  if (templateConfig.showCompanyDetails !== false) {
    pdf.fontSize(10).fillColor('#555').text(company.address || COMPANY.address, { align: 'right' }).text(`${(company.phones || COMPANY.phones).join(' / ')} | ${company.email || COMPANY.email}`, { align: 'right' });
  }
  pdf.moveDown();
  pdf.roundedRect(48, pdf.y + 6, 500, 32, 4).fill(accent);
  pdf.fillColor('#fff').fontSize(16).text(renderTemplateText(templateConfig.headerTitle || title, context), 60, pdf.y + 15);
  pdf.moveDown(3);
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
  const templateSections = [
    ['Notes / Warranty', templateConfig.notesWarrantyText],
    ['Terms & Conditions', templateConfig.termsAndConditions],
    ['Payment / Bank Details', templateConfig.paymentBankDetails],
    ['AMC Terms', templateConfig.amcTerms]
  ].filter(([, value]) => String(value || '').trim());
  if (templateSections.length) {
    pdf.moveDown();
    templateSections.forEach(([label, value]) => {
      pdf.fillColor('#111').fontSize(11).text(label, { underline: true });
      pdf.fillColor('#555').fontSize(9).text(renderTemplateText(value, context), { lineGap: 3 });
      pdf.moveDown(0.5);
    });
  }
  if (String(templateConfig.signatureSection || '').trim()) {
    pdf.moveDown();
    pdf.moveTo(360, pdf.y + 20).lineTo(520, pdf.y + 20).stroke();
    pdf.moveDown();
    pdf.fontSize(9).fillColor('#555').text(renderTemplateText(templateConfig.signatureSection, context), 360, pdf.y, { width: 160, align: 'center' });
  }
  const footerText = renderTemplateText(templateConfig.footerText || `${company.name || COMPANY.name} | ${(company.phones || COMPANY.phones).join(' / ')} | ${company.email || COMPANY.email}`, context);
  pdf.fontSize(8).fillColor('#777').text(footerText, 48, 770, { width: 500, align: 'center' });

  pdf.end();
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  return { filePath, filename };
}
