import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import PdfTemplate from '../models/PdfTemplate.js';
import { COMPANY, LOGO_FULL_PATH, PDF_DIR } from '../config.js';
import { hasRole } from '../permissions.js';
import { appError, clean } from '../utils/http.js';
import { logAudit } from './auditService.js';
import { getCompanyIdentity } from './companyProfileService.js';
import { getBusinessSettings } from './businessSettingsService.js';
import {
  renderAmcContractPdf,
  renderAmcRenewalPdf,
  renderAmcServiceVisitPdf,
  sampleAmcContractData,
  sampleAmcRenewalData,
  sampleAmcVisitData
} from './amcPdfTemplates.js';
import { renderInvoicePdf, sampleInvoiceData } from './invoicePdfTemplate.js';
import { renderQuotationPdf, sampleQuotationData } from './quotationPdfTemplate.js';
import { renderServiceCompletedPdf, sampleServiceCompletedData } from './serviceCompletedPdfTemplate.js';

export const PDF_TEMPLATE_PLACEHOLDERS = [
  '{{customer_name}}',
  '{{customer_phone}}',
  '{{customer_address}}',
  '{{invoice_number}}',
  '{{invoice_date}}',
  '{{work_order_id}}',
  '{{service_name}}',
  '{{technician_name}}',
  '{{total_amount}}',
  '{{amc_start_date}}',
  '{{amc_end_date}}',
  '{{next_service_date}}'
];

const textFields = [
  'headerTitle',
  'footerText',
  'termsAndConditions',
  'paymentBankDetails',
  'signatureSection',
  'notesWarrantyText',
  'amcTerms'
];

export const PDF_TEMPLATE_DEFINITIONS = [
  {
    key: 'invoice',
    category: 'service',
    name: 'Invoice PDF',
    description: 'Invoice and payment PDF template for completed service jobs.',
    defaults: {
      headerTitle: 'INVOICE',
      showCompanyLogo: true,
      showCompanyDetails: true,
      showTechnician: true,
      footerText: 'Thank you for your business. We look forward to serving you again.',
      termsAndConditions: 'Payment is required before delivery or as per company policy.\nWarranty, if applicable, covers only the parts or services mentioned in this invoice.\nProducts once delivered should be checked and verified by the customer.\nAdditional work or parts not mentioned in this invoice will be charged separately.',
      paymentBankDetails: '',
      signatureSection: '',
      notesWarrantyText: '',
      amcTerms: '',
      colorAccent: '#0f2a52'
    }
  },
  {
    key: 'quotation',
    category: 'service',
    name: 'Quotation / Estimate PDF',
    description: 'Estimate template used before a customer approves service work.',
    defaults: {
      headerTitle: 'QUOTATION',
      showCompanyLogo: true,
      showCompanyDetails: true,
      showTechnician: true,
      showSerialNumber: false,
      footerText: 'We appreciate your trust in Universal Systems. We are always here to help!',
      termsAndConditions: '1. This quotation is not an invoice; it is only an estimate for the mentioned goods/services.\n2. This quotation is valid for 7 days from the quotation date.\n3. Work will start only after customer approval.\n4. Payment is required before delivery or as per company policy.\n5. Final price may change if additional faults, parts, or services are found.\n6. Warranty, if applicable, covers only the parts or services mentioned in this quotation.',
      paymentBankDetails: '',
      signatureSection: 'Prepared By',
      notesWarrantyText: '',
      amcTerms: '',
      colorAccent: '#0f2a52'
    }
  },
  {
    key: 'service-completed',
    category: 'service',
    name: 'Thank You / Service Completed PDF',
    description: 'Simple thank-you PDF issued after a service is completed.',
    defaults: {
      headerTitle: 'SERVICE COMPLETED!',
      showCompanyLogo: true,
      showCompanyDetails: true,
      footerText: 'We appreciate your business. Visit us again!',
      termsAndConditions: '',
      paymentBankDetails: '',
      signatureSection: '',
      notesWarrantyText: '',
      amcTerms: '',
      colorAccent: '#0f2a52'
    }
  },
  {
    key: 'amc-contract',
    category: 'amc',
    name: 'AMC Contract PDF',
    description: 'AMC contract template with period, coverage, and value details.',
    defaults: {
      headerTitle: 'AMC CONTRACT',
      showCompanyLogo: true,
      showCompanyDetails: true,
      showTechnician: true,
      showSerialNumber: false,
      footerText: 'Thank you for choosing Universal Systems AMC support.',
      termsAndConditions: '',
      paymentBankDetails: '',
      signatureSection: '',
      notesWarrantyText: '',
      amcTerms: '',
      colorAccent: '#0f2a52'
    }
  },
  {
    key: 'amc-service-visit',
    category: 'amc',
    name: 'AMC Visit / Service Report PDF',
    description: 'AMC service visit report template for completed visits.',
    defaults: {
      headerTitle: 'AMC SERVICE VISIT REPORT',
      showCompanyLogo: true,
      showCompanyDetails: true,
      showTechnician: true,
      showAdditionalCharges: true,
      footerText: 'Thank you for choosing Universal Systems AMC support.',
      termsAndConditions: '',
      paymentBankDetails: '',
      signatureSection: '',
      notesWarrantyText: '',
      amcTerms: '',
      colorAccent: '#0f2a52'
    }
  },
  {
    key: 'amc-renewal-reminder',
    category: 'amc',
    name: 'AMC Renewal / Expiry Reminder PDF',
    description: 'Renewal reminder template for expiring AMC contracts.',
    defaults: {
      headerTitle: 'AMC RENEWAL REMINDER',
      showCompanyLogo: true,
      showCompanyDetails: true,
      showRenewalAmount: true,
      footerText: 'We value your trust. Stay connected for the best service!',
      termsAndConditions: '',
      paymentBankDetails: '',
      signatureSection: '',
      notesWarrantyText: '',
      amcTerms: '',
      colorAccent: '#0f2a52'
    }
  }
];

const definitionsByKey = new Map(PDF_TEMPLATE_DEFINITIONS.map((definition) => [definition.key, definition]));

export function templateKeyForPdfType(type = '') {
  if (type === 'work' || type === 'amc-invoice') return 'invoice';
  if (type === 'quotation') return 'quotation';
  if (type === 'service-completed') return 'service-completed';
  if (type === 'amc-contract') return 'amc-contract';
  if (type === 'amc-service-visit') return 'amc-service-visit';
  if (type === 'amc-renewal-reminder') return 'amc-renewal-reminder';
  return clean(type);
}

export function templateKeyForDocumentType(type = '') {
  if (type === 'invoice') return 'invoice';
  if (type === 'quotation') return 'quotation';
  if (type === 'service') return 'service-completed';
  return clean(type);
}

function defaultConfigFor(key) {
  const definition = definitionsByKey.get(key);
  return { ...(definition?.defaults || {}) };
}

function assertTemplateKey(key) {
  const normalized = clean(key);
  if (!definitionsByKey.has(normalized)) throw appError('PDF template not found', 404);
  return normalized;
}

function assertAdmin(user) {
  if (!hasRole(user, 'admin')) throw appError('Only admin users can edit PDF templates', 403);
}

function cleanText(value, fallback = '', max = 5000) {
  const text = String(value ?? fallback ?? '').replace(/\r\n/g, '\n');
  return text.length > max ? text.slice(0, max) : text;
}

function sanitizeColor(value, fallback = '#0f2a52') {
  const text = clean(value || fallback);
  return /^#[0-9a-f]{6}$/i.test(text) ? text : fallback;
}

function sanitizeConfig(payload = {}, key = '') {
  const base = { ...defaultConfigFor(key), ...(payload || {}) };
  const sanitized = {};
  textFields.forEach((field) => {
    sanitized[field] = cleanText(base[field], defaultConfigFor(key)[field] || '');
  });
  sanitized.showCompanyLogo = Boolean(base.showCompanyLogo);
  sanitized.showCompanyDetails = Boolean(base.showCompanyDetails);
  sanitized.showTechnician = base.showTechnician !== undefined ? Boolean(base.showTechnician) : key === 'quotation';
  sanitized.showSerialNumber = Boolean(base.showSerialNumber);
  sanitized.showAdditionalCharges = base.showAdditionalCharges !== undefined ? Boolean(base.showAdditionalCharges) : key === 'amc-service-visit';
  sanitized.showRenewalAmount = base.showRenewalAmount !== undefined ? Boolean(base.showRenewalAmount) : key === 'amc-renewal-reminder';
  sanitized.colorAccent = sanitizeColor(base.colorAccent, defaultConfigFor(key).colorAccent || '#0f2a52');
  return sanitized;
}

async function ensurePdfTemplates() {
  await Promise.all(PDF_TEMPLATE_DEFINITIONS.map((definition) => PdfTemplate.findOneAndUpdate(
    { key: definition.key },
    {
      $set: {
        category: definition.category,
        name: definition.name,
        description: definition.description
      },
      $setOnInsert: {
        status: 'Active',
        version: 1,
        config: sanitizeConfig(definition.defaults, definition.key),
        versions: []
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )));
}

function userSummary(user) {
  if (!user) return null;
  return {
    id: String(user._id || user.id || ''),
    name: user.name || user.username || 'User',
    username: user.username || '',
    role: user.role || ''
  };
}

function serializeVersion(version) {
  return {
    id: String(version._id || ''),
    version: version.version,
    editedAt: version.editedAt,
    editedBy: userSummary(version.editedBy),
    action: version.action || 'updated',
    config: version.config || {}
  };
}

function serializeTemplate(template) {
  const item = template?.toObject ? template.toObject() : template;
  return {
    id: String(item._id || item.id || ''),
    key: item.key,
    category: item.category,
    name: item.name,
    description: item.description,
    status: item.status || 'Active',
    version: item.version || 1,
    config: sanitizeConfig(item.config || {}, item.key),
    lastEditedDate: item.updatedAt || item.createdAt,
    lastEditedBy: userSummary(item.lastEditedBy),
    versions: (item.versions || []).map(serializeVersion).sort((a, b) => b.version - a.version),
    updatedAt: item.updatedAt,
    createdAt: item.createdAt
  };
}

async function findTemplate(key) {
  await ensurePdfTemplates();
  return PdfTemplate.findOne({ key })
    .populate('lastEditedBy', 'name username role')
    .populate('versions.editedBy', 'name username role');
}

function addVersionSnapshot(template, action = 'updated') {
  template.versions.push({
    version: template.version || 1,
    config: sanitizeConfig(template.config || {}, template.key),
    editedAt: template.updatedAt || template.createdAt || new Date(),
    editedBy: template.lastEditedBy || null,
    action
  });
  if (template.versions.length > 15) template.versions = template.versions.slice(-15);
}

export async function listPdfTemplates() {
  await ensurePdfTemplates();
  const rows = await PdfTemplate.find({})
    .populate('lastEditedBy', 'name username role')
    .populate('versions.editedBy', 'name username role')
    .sort({ category: -1, name: 1 });
  const order = PDF_TEMPLATE_DEFINITIONS.map((definition) => definition.key);
  return rows.map(serializeTemplate).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
}

export async function getPdfTemplate(key) {
  const normalized = assertTemplateKey(key);
  const template = await findTemplate(normalized);
  if (!template) throw appError('PDF template not found', 404);
  return serializeTemplate(template);
}

export async function getTemplateByKey(key) {
  if (!definitionsByKey.has(key)) return null;
  const template = await findTemplate(key);
  return template ? serializeTemplate(template) : {
    key,
    config: sanitizeConfig(defaultConfigFor(key), key)
  };
}

export async function getTemplateByPdfType(type) {
  return getTemplateByKey(templateKeyForPdfType(type));
}

export async function getTemplateByDocumentType(type) {
  return getTemplateByKey(templateKeyForDocumentType(type));
}

export async function updatePdfTemplate(key, payload = {}, user = null) {
  assertAdmin(user);
  const normalized = assertTemplateKey(key);
  const template = await findTemplate(normalized);
  if (!template) throw appError('PDF template not found', 404);
  const before = sanitizeConfig(template.config || {}, normalized);
  addVersionSnapshot(template, 'updated');
  template.config = sanitizeConfig(payload.config || payload, normalized);
  template.version = (template.version || 1) + 1;
  template.lastEditedBy = user?._id || null;
  await template.save();
  await logAudit({
    userId: user?._id || null,
    action: 'pdf_template_updated',
    module: 'pdf_template',
    recordId: template._id,
    before,
    after: { key: normalized, version: template.version, config: template.config }
  });
  return getPdfTemplate(normalized);
}

export async function resetPdfTemplate(key, user = null) {
  assertAdmin(user);
  const normalized = assertTemplateKey(key);
  const template = await findTemplate(normalized);
  if (!template) throw appError('PDF template not found', 404);
  const before = sanitizeConfig(template.config || {}, normalized);
  addVersionSnapshot(template, 'reset');
  template.config = sanitizeConfig(defaultConfigFor(normalized), normalized);
  template.version = (template.version || 1) + 1;
  template.lastEditedBy = user?._id || null;
  await template.save();
  await logAudit({
    userId: user?._id || null,
    action: 'pdf_template_reset',
    module: 'pdf_template',
    recordId: template._id,
    before,
    after: { key: normalized, version: template.version, config: template.config }
  });
  return getPdfTemplate(normalized);
}

export async function restorePdfTemplateVersion(key, versionId, user = null) {
  assertAdmin(user);
  const normalized = assertTemplateKey(key);
  const template = await findTemplate(normalized);
  if (!template) throw appError('PDF template not found', 404);
  const version = template.versions.id(versionId) || template.versions.find((item) => String(item.version) === String(versionId));
  if (!version) throw appError('Template version not found', 404);
  const before = sanitizeConfig(template.config || {}, normalized);
  addVersionSnapshot(template, 'restored');
  template.config = sanitizeConfig(version.config || {}, normalized);
  template.version = (template.version || 1) + 1;
  template.lastEditedBy = user?._id || null;
  await template.save();
  await logAudit({
    userId: user?._id || null,
    action: 'pdf_template_restored',
    module: 'pdf_template',
    recordId: template._id,
    before,
    after: { key: normalized, restoredFrom: version.version, version: template.version, config: template.config }
  });
  return getPdfTemplate(normalized);
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-IN');
}

function formatAmount(value) {
  return `Rs. ${Number(value || 0).toFixed(2)}`;
}

function fallbackCompany(company = COMPANY) {
  return {
    name: company.name || COMPANY.name,
    address: company.address || COMPANY.address,
    phones: Array.isArray(company.phones) && company.phones.length ? company.phones : COMPANY.phones,
    email: company.email || COMPANY.email,
    whatsappNumber: company.whatsappNumber || '',
    logoFilePath: company.logoFilePath || LOGO_FULL_PATH
  };
}

export function buildTemplateContext(source = {}, company = COMPANY) {
  const currentCompany = fallbackCompany(company);
  return {
    company_name: currentCompany.name,
    company_phone: currentCompany.phones.join(' / '),
    company_email: currentCompany.email,
    customer_name: source.customerName || '-',
    customer_phone: source.customerPhone || '-',
    customer_address: source.customerAddress || '-',
    invoice_number: source.invoiceNumber || '-',
    invoice_date: formatDate(source.invoiceDate || new Date()),
    work_order_id: source.workOrderId || '-',
    service_name: source.serviceName || '-',
    technician_name: source.technicianName || '-',
    total_amount: formatAmount(source.totalAmount || 0),
    amc_start_date: formatDate(source.amcStartDate),
    amc_end_date: formatDate(source.amcEndDate),
    next_service_date: formatDate(source.nextServiceDate)
  };
}

export function renderTemplateText(value = '', context = {}) {
  const text = String(value || '');
  return text.replace(/\{\{([a-z0-9_]+)\}\}/gi, (match, key) => {
    if (Object.prototype.hasOwnProperty.call(context, key)) return context[key];
    return match;
  });
}

export function templateAccent(template, fallback = '#0f2a52') {
  return sanitizeColor(template?.config?.colorAccent, fallback);
}

export function workOrderTemplateContext(workOrder = {}, company = COMPANY) {
  const customer = workOrder.customerId || {};
  const contract = workOrder.amcContractId || {};
  const invoice = workOrder.invoiceId || contract.invoiceId || {};
  const visits = Array.isArray(contract.visits) ? contract.visits : [];
  const nextVisit = visits
    .filter((visit) => visit?.scheduledDate && new Date(visit.scheduledDate).getTime() >= Date.now())
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0];
  const fallbackTotal = Number(workOrder.serviceCharge || 0)
    + (workOrder.partsUsed || []).reduce((sum, part) => sum + Number(part.total || 0), 0);
  const total = invoice.total != null
    ? Number(invoice.total || 0)
    : contract.contractValue != null
      ? Number(contract.contractValue || 0)
      : fallbackTotal;
  return buildTemplateContext({
    customerName: customer.name,
    customerPhone: customer.phone,
    customerAddress: customer.address,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.createdAt || new Date(),
    workOrderId: workOrder.bookingId?.bookingCode || `WO-${String(workOrder._id || '').slice(-6).toUpperCase()}`,
    serviceName: workOrder.serviceType || workOrder.device || contract.contractType,
    technicianName: workOrder.technicianId?.name || workOrder.technicianId?.username || 'Admin',
    totalAmount: total,
    amcStartDate: contract.startDate,
    amcEndDate: contract.endDate,
    nextServiceDate: nextVisit?.scheduledDate
  }, company);
}

export function documentTemplateContext(document = {}, company = COMPANY) {
  const customer = document.customerId || {};
  const workOrder = document.workOrderId || {};
  const invoice = document.invoiceId || {};
  return buildTemplateContext({
    customerName: customer.name,
    customerPhone: customer.phone,
    customerAddress: customer.address,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.createdAt || document.createdAt,
    workOrderId: workOrder.bookingId?.bookingCode || `WO-${String(workOrder._id || workOrder.id || '').slice(-6).toUpperCase()}`,
    serviceName: workOrder.serviceType || workOrder.device,
    technicianName: workOrder.technicianId?.name || workOrder.technicianId?.username || 'Admin',
    totalAmount: document.totalAmount || invoice.total || 0
  }, company);
}

function sampleContextFor(key, company = COMPANY) {
  const now = new Date();
  const next = new Date(now);
  next.setDate(next.getDate() + 30);
  return buildTemplateContext({
    customerName: 'Rahul Kumar',
    customerPhone: '98427 81971',
    customerAddress: 'Mettur Dam, Salem',
    invoiceNumber: key === 'quotation' ? 'QUO-2026-0066' : 'INV-2026-0089',
    invoiceDate: now,
    workOrderId: 'WO-2026-0123',
    serviceName: key.startsWith('amc') ? 'Computer AMC Support' : 'Laptop Service',
    technicianName: 'Arjun',
    totalAmount: key.startsWith('amc') ? 12500 : 2850,
    amcStartDate: now,
    amcEndDate: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate()),
    nextServiceDate: next
  }, company);
}

function drawPreviewPdf(doc, template, company = COMPANY, businessSettings = null) {
  const currentCompany = fallbackCompany(company);
  const config = template.config || {};
  const context = sampleContextFor(template.key, currentCompany);
  const accent = templateAccent(template);
  if (template.key === 'service-completed') {
    renderServiceCompletedPdf(doc, {
      company: currentCompany,
      template,
      context,
      service: sampleServiceCompletedData()
    });
    return;
  }
  if (template.key === 'invoice') {
    renderInvoicePdf(doc, {
      company: currentCompany,
      template,
      context,
      invoice: sampleInvoiceData()
    });
    return;
  }
  if (template.key === 'quotation') {
    renderQuotationPdf(doc, {
      company: currentCompany,
      template,
      context,
      taxSettings: businessSettings?.taxGst || {},
      quotation: sampleQuotationData()
    });
    return;
  }
  if (template.key === 'amc-contract') {
    renderAmcContractPdf(doc, {
      company: currentCompany,
      template,
      context,
      contract: sampleAmcContractData()
    });
    return;
  }
  if (template.key === 'amc-service-visit') {
    renderAmcServiceVisitPdf(doc, {
      company: currentCompany,
      template,
      context,
      visit: sampleAmcVisitData()
    });
    return;
  }
  if (template.key === 'amc-renewal-reminder') {
    renderAmcRenewalPdf(doc, {
      company: currentCompany,
      template,
      context,
      renewal: sampleAmcRenewalData()
    });
    return;
  }
  doc.fillColor(accent);
  const logoPath = currentCompany.logoFilePath || LOGO_FULL_PATH;
  if (config.showCompanyLogo !== false && logoPath && fs.existsSync(logoPath)) doc.image(logoPath, 42, 30, { width: 145 });
  doc.fontSize(17).fillColor(accent).text(currentCompany.name, 330, 34, { width: 210, align: 'right' });
  if (config.showCompanyDetails) {
    doc.fontSize(9).fillColor('#32445c').text(String(currentCompany.address || '').replace(/\n/g, ', '), 300, 60, { width: 240, align: 'right' });
    doc.text(`Phone: ${currentCompany.phones.join(' / ')}`, 300, 98, { width: 240, align: 'right' });
    doc.text(`Email: ${currentCompany.email}`, 300, 114, { width: 240, align: 'right' });
  }
  doc.roundedRect(40, 150, 515, 34, 4).fill(accent);
  doc.fillColor('#ffffff').fontSize(15).text(renderTemplateText(config.headerTitle, context), 52, 160);
  doc.fillColor('#0f172a').fontSize(12).text('Sample Customer Details', 52, 210);
  doc.fillColor('#334155').fontSize(10);
  doc.text(`Customer: ${context.customer_name}`, 52, 235);
  doc.text(`Phone: ${context.customer_phone}`, 52, 252);
  doc.text(`Work Order: ${context.work_order_id}`, 52, 269);
  doc.text(`Service: ${context.service_name}`, 310, 235);
  doc.text(`Technician: ${context.technician_name}`, 310, 252);
  doc.text(`Total: ${context.total_amount}`, 310, 269);
  doc.roundedRect(48, 315, 500, 28, 2).fill('#eaf1fb');
  doc.fillColor(accent).fontSize(10).text('Description', 58, 324).text('Amount', 430, 324);
  doc.fillColor('#334155').text('Template preview line item', 58, 358).text(context.total_amount, 430, 358);
  let y = 410;
  [
    ['Notes / Warranty', config.notesWarrantyText],
    ['Terms & Conditions', config.termsAndConditions],
    ['Payment / Bank Details', config.paymentBankDetails],
    ['AMC Terms', config.amcTerms]
  ].forEach(([label, value]) => {
    if (!value) return;
    doc.fillColor('#0f172a').fontSize(11).text(label, 52, y);
    doc.fillColor('#334155').fontSize(9).text(renderTemplateText(value, context), 52, y + 16, { width: 492, lineGap: 3 });
    y += Math.max(58, doc.heightOfString(renderTemplateText(value, context), { width: 492 }) + 36);
  });
  if (config.signatureSection) {
    doc.strokeColor('#94a3b8').lineWidth(0.7).moveTo(350, 700).lineTo(520, 700).stroke();
    doc.fillColor('#334155').fontSize(9).text(renderTemplateText(config.signatureSection, context), 365, 710);
  }
  doc.strokeColor('#cbd5e1').lineWidth(0.7).moveTo(40, 770).lineTo(555, 770).stroke();
  doc.fontSize(8).fillColor('#64748b').text(renderTemplateText(config.footerText, context), 40, 778, { width: 515, align: 'center' });
}

export async function generatePdfTemplatePreview(key) {
  const template = await getPdfTemplate(key);
  const [company, businessSettings] = await Promise.all([
    getCompanyIdentity(),
    getBusinessSettings().catch(() => null)
  ]);
  fs.mkdirSync(PDF_DIR, { recursive: true });
  const filename = `${template.key}-template-preview-${Date.now()}.pdf`;
  const filePath = path.join(PDF_DIR, filename);
  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    drawPreviewPdf(doc, template, company, businessSettings);
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
  return { filePath, filename };
}
