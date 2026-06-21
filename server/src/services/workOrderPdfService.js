import fs from 'node:fs';
import path from 'node:path';
import PDFDocument from 'pdfkit';
import WorkOrder from '../models/WorkOrder.js';
import { COMPANY, LOGO_FULL_PATH, PDF_DIR } from '../config.js';
import { hasPermission } from '../permissions.js';
import { appError } from '../utils/http.js';
import { calculateAmcCoverageBreakdown, amcCoverageSummary } from './amcCoverageEngine.js';
import {
  renderAmcContractPdf,
  renderAmcRenewalPdf,
  renderAmcServiceVisitPdf
} from './amcPdfTemplates.js';
import { getBusinessSettings } from './businessSettingsService.js';
import {
  canRenderPublishedInvoiceDom,
  getTemplateByPdfType,
  renderPublishedInvoiceDomTemplate,
  renderTemplateText,
  templateAccent,
  workOrderTemplateContext
} from './pdfTemplateService.js';
import { getCompanyIdentity } from './companyProfileService.js';
import { renderInvoicePdf } from './invoicePdfTemplate.js';
import { renderQuotationPdf } from './quotationPdfTemplate.js';
import { renderServiceCompletedPdf } from './serviceCompletedPdfTemplate.js';
import { technicianCanAccessWorkOrder } from './technicianScopeService.js';

const fontPath = 'C:\\Windows\\Fonts\\arial.ttf';
const boldFontPath = 'C:\\Windows\\Fonts\\arialbd.ttf';

const pdfTypes = ['quotation', 'work', 'service-completed', 'amc-contract', 'amc-service-visit', 'amc-invoice', 'amc-renewal-reminder'];

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
    .populate('bookingId', 'bookingCode serviceType device deviceBrand deviceModel')
    .populate({
      path: 'amcContractId',
      select: 'contractId contractType coverageType coverParts coverService coverVisits coveredService coveredDevices serviceFrequency contractValue startDate endDate status includedVisits invoiceId notes visits createdAt',
      populate: { path: 'invoiceId', select: 'invoiceNumber total paidAmount balance status title notes createdAt' }
    })
    .populate('invoiceId', 'invoiceNumber total paidAmount balance status title notes createdAt');
  if (!workOrder) throw appError('Work order not found', 404);
  if (!technicianCanAccessWorkOrder(workOrder, user)) {
    throw appError('You do not have permission to view this work order', 403);
  }
  return workOrder;
}

function isAllowed(type, workOrder) {
  const status = workOrder.status;
  if (type === 'quotation') return status === 'Pending';
  if (type === 'work') return status === 'Completed';
  if (type === 'service-completed') return status === 'Delivered';
  if (type === 'amc-contract') return Boolean(workOrder.amcContractId);
  if (type === 'amc-service-visit') return Boolean(workOrder.amcContractId) && ['Completed', 'Delivered'].includes(status);
  if (type === 'amc-invoice') return Boolean(workOrder.amcContractId) && (Boolean(workOrder.amcContractId?.invoiceId) || Boolean(workOrder.invoiceId));
  if (type === 'amc-renewal-reminder') return Boolean(workOrder.amcContractId);
  return false;
}

function customerId(workOrder) {
  return workOrder.bookingId?.bookingCode || `WO-${String(workOrder._id).slice(-6).toUpperCase()}`;
}

function workOrderReference(workOrder) {
  const existing = [
    workOrder.workOrderNumber,
    workOrder.workOrderId,
    workOrder.displayId,
    /^WO-/i.test(workOrder.bookingId?.bookingCode || '') ? workOrder.bookingId.bookingCode : ''
  ].find(Boolean);
  if (existing) return String(existing).trim().toUpperCase();
  const date = workOrder.createdAt ? new Date(workOrder.createdAt) : new Date();
  const year = Number.isNaN(date.getTime()) ? new Date().getFullYear() : date.getFullYear();
  return `WO-${year}-${String(workOrder._id || '').slice(-6).toUpperCase()}`;
}

function serviceType(workOrder) {
  return workOrder.device || 'Service';
}

function deviceBrandModel(workOrder = {}) {
  const combined = [workOrder.deviceBrand, workOrder.deviceModel].map((value) => String(value || '').trim()).filter(Boolean).join(' ');
  return combined || workOrder.brandModel || workOrder.deviceModel || workOrder.model || workOrder.device || '-';
}

function partChargeType(part) {
  return part?.chargeType === 'Covered under AMC' ? 'Covered under AMC' : 'Chargeable';
}

function buildRows(workOrder, options = {}) {
  const rows = [];
  const serviceCharge = Number(workOrder.serviceCharge || 0);
  const billingOnly = Boolean(options.billingOnly);
  const isAmcWorkOrder = Boolean(workOrder.amcContractId);
  if (isAmcWorkOrder) {
    const breakdown = calculateAmcCoverageBreakdown(workOrder);
    if ((!billingOnly || breakdown.chargeableServiceTotal > 0) && serviceCharge > 0) {
      const covered = breakdown.coverService;
      if (!billingOnly || !covered) {
        rows.push({
          description: `Service (${serviceType(workOrder)})${covered ? ' (Covered by AMC)' : ' (Chargeable)'}`,
          quantity: 1,
          price: serviceCharge,
          total: covered ? 0 : serviceCharge
        });
      }
    }
    breakdown.parts.forEach((part) => {
      if (billingOnly && part.coveredByAmc) return;
      rows.push({
        description: part.coveredByAmc ? `${part.name} (Covered by AMC)` : `${part.name} (Chargeable)`,
        quantity: part.quantity,
        price: part.unitPrice,
        total: part.coveredByAmc ? 0 : part.total
      });
    });
    return rows;
  }
  if (!billingOnly || serviceCharge > 0) {
    rows.push({
      description: `Service (${serviceType(workOrder)})`,
      quantity: 1,
      price: serviceCharge,
      total: serviceCharge
    });
  }
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

function contractStatus(contract) {
  if (!contract) return '-';
  if (contract.status === 'Cancelled') return 'Cancelled';
  const end = new Date(contract.endDate);
  if (Number.isNaN(end.getTime())) return contract.status || 'Active';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (daysLeft < 0) return 'Expired';
  if (daysLeft <= 30) return 'Renewal Due';
  return 'Active';
}

function amcCoveredNotCovered(contract = {}) {
  const coverage = amcCoverageSummary(contract);
  const covered = [];
  const notCovered = ['Physical damage', 'Customer misuse'];
  if (coverage.coverParts) covered.push('Replacement parts');
  else notCovered.push('Replacement parts');
  if (coverage.coverService) covered.push('Service labor');
  else notCovered.push('Repair/service labor');
  if (coverage.coverVisits) covered.push(`${contract.serviceFrequency || 'Scheduled'} visits`);
  else notCovered.push('Service visits');
  return { covered, notCovered };
}

function companyFallback(company = {}) {
  return {
    name: company.name || COMPANY.name,
    address: company.address || COMPANY.address,
    phones: Array.isArray(company.phones) && company.phones.length ? company.phones : COMPANY.phones,
    email: company.email || COMPANY.email,
    whatsappNumber: company.whatsappNumber || '',
    logoFilePath: company.logoFilePath || LOGO_FULL_PATH
  };
}

function displayDate(value = new Date()) {
  const date = new Date(value || new Date());
  if (Number.isNaN(date.getTime())) return new Date().toLocaleDateString('en-IN');
  return date.toLocaleDateString('en-IN');
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

function addHeader(doc, title, template = null, context = {}, company = COMPANY) {
  registerFonts(doc);
  const currentCompany = companyFallback(company);
  const config = template?.config || {};
  const accent = templateAccent(template);
  const resolvedTitle = renderTemplateText(config.headerTitle || title, context);
  doc.fillColor(accent);
  if (config.showCompanyLogo !== false && currentCompany.logoFilePath && fs.existsSync(currentCompany.logoFilePath)) doc.image(currentCompany.logoFilePath, 42, 30, { width: 155 });
  doc.font(fontExists(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fontSize(17).text(currentCompany.name, 340, 34, { width: 200, align: 'right' });
  if (config.showCompanyDetails !== false) {
    doc.font(fontExists(fontPath) ? 'Body' : 'Helvetica').fontSize(9).fillColor('#32445c');
    doc.text(String(currentCompany.address || '').replace(/\n/g, ', '), 300, 60, { width: 240, align: 'right' });
    doc.text(`Phone: ${currentCompany.phones.join(' / ')}`, 300, 98, { width: 240, align: 'right' });
    doc.text(`Email: ${currentCompany.email}`, 300, 114, { width: 240, align: 'right' });
  }
  doc.roundedRect(40, 150, 515, 34, 4).fill('#0f2a52');
  doc.roundedRect(40, 150, 515, 34, 4).fill(accent);
  doc.fillColor('#ffffff').font(fontExists(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fontSize(15).text(resolvedTitle, 52, 160);
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

function footer(doc, message = '', template = null, context = {}, company = COMPANY) {
  const y = 770;
  const config = template?.config || {};
  const currentCompany = companyFallback(company);
  const footerText = renderTemplateText(config.footerText || message || `${currentCompany.name} | ${currentCompany.phones.join(' / ')} | ${currentCompany.email}`, context);
  doc.strokeColor('#cbd5e1').lineWidth(0.7).moveTo(40, y - 8).lineTo(555, y - 8).stroke();
  doc.fontSize(8).fillColor('#64748b').text(footerText, 40, y, {
    width: 515,
    align: 'center'
  });
}

function templateBlock(doc, label, value, x, y, width, template, context) {
  const text = renderTemplateText(value || '', context).trim();
  if (!text) return y;
  doc.font(fontExists(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fontSize(10).fillColor('#0f172a').text(label, x, y);
  doc.font(fontExists(fontPath) ? 'Body' : 'Helvetica').fontSize(9).fillColor('#334155').text(text, x, y + 16, { width, lineGap: 4 });
  return y + Math.max(42, doc.heightOfString(text, { width }) + 30);
}

function addTemplateNotes(doc, y, template, context, options = {}) {
  const config = template?.config || {};
  const width = options.width || 492;
  const x = options.x || 52;
  let nextY = y;
  if (options.notes !== false) nextY = templateBlock(doc, 'NOTES / WARRANTY', config.notesWarrantyText, x, nextY, width, template, context);
  if (options.terms !== false) nextY = templateBlock(doc, 'TERMS & CONDITIONS', config.termsAndConditions, x, nextY, width, template, context);
  if (options.payment !== false) nextY = templateBlock(doc, 'PAYMENT / BANK DETAILS', config.paymentBankDetails, x, nextY, width, template, context);
  if (options.amcTerms) nextY = templateBlock(doc, 'AMC TERMS', config.amcTerms, x, nextY, width, template, context);
  return nextY;
}

function addTemplateSignature(doc, y, template, context, options = {}) {
  const config = template?.config || {};
  const label = renderTemplateText(config.signatureSection || '', context).trim();
  if (!label) return;
  const left = options.left ?? 360;
  const right = options.right ?? 520;
  doc.strokeColor('#94a3b8').lineWidth(0.7).moveTo(left, y).lineTo(right, y).stroke();
  doc.font(fontExists(fontPath) ? 'Body' : 'Helvetica').fontSize(9).fillColor('#334155').text(label, left + 20, y + 8, { width: right - left - 20, align: 'center' });
}

function quotationApprovalStatus(workOrder) {
  if (workOrder.approvalStatus === 'approved') return 'Approved';
  if (workOrder.approvalStatus === 'denied') return 'Denied';
  return 'Pending Approval';
}

function buildQuotation(doc, workOrder, template, context, company, businessSettings = null) {
  const customer = workOrder.customerId || {};
  const rows = buildRows(workOrder);
  renderQuotationPdf(doc, {
    company,
    template,
    context,
    taxSettings: businessSettings?.taxGst || {},
    quotation: {
      jobReference: workOrderReference(workOrder),
      quotationDate: documentDate(new Date()),
      quotationStatus: quotationApprovalStatus(workOrder),
      customerName: customer.name || '-',
      customerPhone: customer.phone || '-',
      customerAddress: customer.address || '-',
      serviceType: workOrder.serviceType || workOrder.bookingId?.serviceType || serviceType(workOrder),
      device: workOrder.device || '-',
      brandModel: deviceBrandModel(workOrder),
      problemComplaint: workOrder.issue || '-',
      technician: workOrder.technicianId?.name || workOrder.technicianId?.username || '',
      serialNumber: workOrder.serialNumber || workOrder.deviceSerialNumber || workOrder.serialNo || '',
      items: rows.map((row) => ({
        description: row.description,
        quantity: row.quantity,
        unitPrice: row.price,
        total: row.total
      }))
    }
  });
}

function amcPeriod(contract = {}) {
  return `${documentDate(contract.startDate || new Date())} to ${documentDate(contract.endDate || new Date())}`;
}

function nextYearDate(value = new Date()) {
  const date = new Date(value || new Date());
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  return new Date(safe.getFullYear() + 1, safe.getMonth(), safe.getDate());
}

function nextAmcVisitDate(contract = {}, fallback = new Date()) {
  const visits = Array.isArray(contract.visits) ? contract.visits : [];
  const nextVisit = visits
    .filter((visit) => visit?.scheduledDate && new Date(visit.scheduledDate).getTime() >= Date.now())
    .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate))[0];
  if (nextVisit?.scheduledDate) return nextVisit.scheduledDate;
  const date = new Date(fallback || new Date());
  const safe = Number.isNaN(date.getTime()) ? new Date() : date;
  safe.setDate(safe.getDate() + 30);
  return safe;
}

function coveredItemsForAmc(workOrder = {}) {
  const contract = workOrder.amcContractId || {};
  const customer = workOrder.customerId || {};
  const devices = Array.isArray(customer.devices) && customer.devices.length
    ? customer.devices
    : String(contract.coveredDevices || workOrder.device || 'Desktop / Laptop / Computer System')
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean);
  const rows = devices.length ? devices : [workOrder.device || 'Computer System'];
  return rows.slice(0, 4).map((device, index) => ({
    device,
    brandModel: index === 0 ? deviceBrandModel(workOrder) : '-',
    quantity: 1,
    coverageNotes: index === 0 ? 'General AMC support' : 'Service support',
    serialNumber: workOrder.serialNumber || workOrder.deviceSerialNumber || workOrder.serialNo || '-'
  }));
}

function latestTechnicianNote(workOrder = {}) {
  const notes = (workOrder.notes || []).map((note) => note.text).filter(Boolean);
  return notes.length ? notes.slice(-2).join('\n') : 'AMC visit completed successfully.\nNo major issue found.';
}

function amcBaseData(workOrder = {}) {
  const contract = workOrder.amcContractId || {};
  const customer = workOrder.customerId || {};
  return {
    amcReference: contract.contractId || 'AMC-2026-0012',
    customerName: customer.name || contract.customerName || 'Customer',
    customerPhone: customer.phone || contract.phone || '-',
    customerAddress: customer.address || contract.address || '-',
    planName: contract.coveredService || contract.contractType || 'Computer AMC Support',
    coverageType: amcCoverageSummary(contract).coverageType || contract.coverageType || 'Service Support',
    coveredFor: contract.coveredDevices || contract.coveredService || workOrder.device || 'Desktop / Laptop / Computer System',
    technician: workOrder.technicianId?.name || workOrder.technicianId?.username || ''
  };
}

function invoicePayloadForWorkOrder(workOrder, context) {
  const isAmcWorkOrder = Boolean(workOrder.amcContractId);
  const rows = buildRows(workOrder, { billingOnly: isAmcWorkOrder });
  const subtotal = rows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const invoice = workOrder.invoiceId;
  const total = Number(invoice?.total ?? subtotal);
  const customer = workOrder.customerId || {};
  return {
    invoiceNo: invoice?.invoiceNumber || context.invoice_number || '-',
    jobReference: workOrderReference(workOrder),
    invoiceDate: documentDate(invoice?.createdAt || new Date()),
    paymentStatus: invoice?.status || 'Pending',
    customerName: customer.name || '-',
    customerPhone: customer.phone || '-',
    customerAddress: customer.address || '-',
    serviceType: workOrder.serviceType || workOrder.bookingId?.serviceType || serviceType(workOrder),
    device: workOrder.device || '-',
    brandModel: deviceBrandModel(workOrder),
    problemComplaint: workOrder.issue || '-',
    technician: workOrder.technicianId?.name || workOrder.technicianId?.username || '',
    items: rows.map((row) => ({
      description: row.description,
      quantity: row.quantity,
      unitPrice: row.price,
      total: row.total
    })),
    subtotal,
    finalTotal: total,
    amountPaid: Number(invoice?.paidAmount || 0),
    balance: Number(invoice?.balance ?? Math.max(0, total - Number(invoice?.paidAmount || 0)))
  };
}

function invoiceDomContextForWorkOrder(context = {}, invoice = {}) {
  const invoiceItems = (invoice.items || []).map((item, index) => ({
    item_index: String(index + 1),
    item_description: item.description || '-',
    item_quantity: String(item.quantity ?? 1),
    item_unit_price: money(item.unitPrice ?? item.price ?? item.rate ?? 0),
    item_total: money(item.total ?? item.amount ?? 0)
  }));
  return {
    ...context,
    invoice_items: invoiceItems,
    item_index: invoiceItems[0]?.item_index || context.item_index || '1',
    item_description: invoiceItems[0]?.item_description || context.item_description || '-',
    item_quantity: invoiceItems[0]?.item_quantity || context.item_quantity || '1',
    item_unit_price: invoiceItems[0]?.item_unit_price || context.item_unit_price || money(0),
    item_total: invoiceItems[0]?.item_total || context.item_total || money(0)
  };
}

function buildInvoice(doc, workOrder, template, context, company) {
  renderInvoicePdf(doc, {
    company,
    template,
    context,
    invoice: invoicePayloadForWorkOrder(workOrder, context)
  });
}

function addAmcContractBlock(doc, workOrder, y, title = 'AMC CONTRACT SUMMARY') {
  const contract = workOrder.amcContractId || {};
  const invoice = contract.invoiceId || {};
  const coverage = amcCoverageSummary(contract);
  const value = Number(contract.contractValue || invoice.total || 0);
  const paid = Number(invoice.paidAmount || 0);
  const balance = Number(invoice.balance ?? Math.max(0, value - paid));
  doc.font(fontExists(boldFontPath) ? 'BodyBold' : 'Helvetica-Bold').fontSize(11).fillColor('#0f172a').text(title, 52, y);
  doc.font(fontExists(fontPath) ? 'Body' : 'Helvetica').fontSize(9).fillColor('#334155');
  const left = [
    `Contract ID: ${contract.contractId || '-'}`,
    `Contract Type: ${contract.contractType || '-'}`,
    `Coverage Type: ${coverage.coverageType}`,
    `Contract Status: ${contractStatus(contract)}`,
    `Period: ${contract.startDate ? new Date(contract.startDate).toLocaleDateString('en-IN') : '-'} to ${contract.endDate ? new Date(contract.endDate).toLocaleDateString('en-IN') : '-'}`
  ];
  const right = [
    `Contract Value: ${money(value)}`,
    `Paid: ${money(paid)}`,
    `Pending: ${money(balance)}`,
    `Payment Status: ${invoice.status || 'Pending'}`
  ];
  left.forEach((text, index) => doc.text(text, 52, y + 20 + index * 16, { width: 230 }));
  right.forEach((text, index) => doc.text(text, 310, y + 20 + index * 16, { width: 230 }));
  doc.text(`Covered Devices: ${contract.coveredDevices || contract.coveredService || '-'}`, 52, y + 106, { width: 492 });
}

function buildAmcContractPdf(doc, workOrder, template, context, company) {
  const contract = workOrder.amcContractId || {};
  const invoice = contract.invoiceId || {};
  renderAmcContractPdf(doc, {
    company,
    template,
    context,
    contract: {
      ...amcBaseData(workOrder),
      contractDate: documentDate(contract.createdAt || new Date()),
      amcPeriod: amcPeriod(contract),
      status: contractStatus(contract),
      contractValue: Number(contract.contractValue || invoice.total || 0),
      paymentStatus: invoice.status || (Number(invoice.paidAmount || 0) > 0 ? 'Paid' : 'Pending'),
      renewalDate: documentDate(contract.endDate || new Date()),
      coveredItems: coveredItemsForAmc(workOrder)
    }
  });
}

function buildAmcServiceVisitPdf(doc, workOrder, template, context, company) {
  const contract = workOrder.amcContractId || {};
  const breakdown = calculateAmcCoverageBreakdown(workOrder);
  renderAmcServiceVisitPdf(doc, {
    company,
    template,
    context,
    visit: {
      ...amcBaseData(workOrder),
      visitDate: documentDate(workOrder.completedAt || workOrder.updatedAt || new Date()),
      visitStatus: workOrder.status === 'Delivered' ? 'Completed' : workOrder.status || 'Completed',
      nextVisitDate: documentDate(nextAmcVisitDate(contract, workOrder.completedAt || workOrder.updatedAt || new Date())),
      jobReference: workOrderReference(workOrder),
      amcPeriod: amcPeriod(contract),
      technicianNotes: latestTechnicianNote(workOrder),
      additionalCharges: Number(breakdown.extraPayable || 0)
    }
  });
}

function buildAmcInvoicePdf(doc, workOrder, template, context, company) {
  const contract = workOrder.amcContractId || {};
  const contractInvoice = contract.invoiceId || {};
  const extraInvoice = workOrder.invoiceId || {};
  const invoice = extraInvoice.invoiceNumber ? extraInvoice : contractInvoice;
  const breakdown = calculateAmcCoverageBreakdown(workOrder);
  addHeader(doc, 'AMC INVOICE / RECEIPT', template, context, company);
  addCustomerDetails(doc, workOrder, 205);
  addAmcContractBlock(doc, workOrder, 315);
  const total = Number(invoice.total || contract.contractValue || 0);
  const paid = Number(invoice.paidAmount || 0);
  const balance = Number(invoice.balance ?? Math.max(0, total - paid));
  const rows = extraInvoice.invoiceNumber
    ? buildRows(workOrder, { billingOnly: true })
    : [{ description: `AMC Contract - ${contract.contractType || 'AMC'}`, quantity: 1, price: total, total }];
  let y = table(doc, rows.length ? rows : [{ description: 'No extra payable amount', quantity: 1, price: 0, total: 0 }], 455, 'Amount');
  doc.font(fontExists(fontPath) ? 'Body' : 'Helvetica').fontSize(9).fillColor('#334155');
  doc.text(`Invoice: ${invoice.invoiceNumber || '-'}`, 52, y, { width: 240 });
  doc.text(`Covered Amount: ${money(breakdown.coveredTotal)}`, 52, y + 18, { width: 240 });
  doc.text(`Payable Amount: ${money(total)}`, 356, y, { width: 188, align: 'right' });
  doc.text(`Paid: ${money(paid)}`, 356, y + 18, { width: 188, align: 'right' });
  doc.text(`Balance: ${money(balance)}`, 356, y + 36, { width: 188, align: 'right' });
  doc.text(`Payment Status: ${invoice.status || 'Pending'}`, 52, y + 36, { width: 240 });
  addTemplateNotes(doc, y + 58, template, context, { notes: true, terms: true, payment: true });
  addTemplateSignature(doc, 710, template, context);
  footer(doc, `AMC invoice and payment receipt summary from ${companyFallback(company).name}.`, template, context, company);
}

function buildServiceCompleted(doc, workOrder, template, context, company) {
  const customer = workOrder.customerId || {};
  renderServiceCompletedPdf(doc, {
    company,
    template,
    context,
    service: {
      customerName: customer.name || 'Customer'
    }
  });
}

function buildAmcRenewalReminderPdf(doc, workOrder, template, context, company) {
  const contract = workOrder.amcContractId || {};
  const expiryDate = contract.endDate || new Date();
  renderAmcRenewalPdf(doc, {
    company,
    template,
    context,
    renewal: {
      ...amcBaseData(workOrder),
      reminderDate: documentDate(new Date()),
      expiryDate: documentDate(expiryDate),
      renewalStatus: 'Renewal Due',
      currentPeriod: amcPeriod(contract),
      renewalPeriod: `${documentDate(expiryDate)} to ${documentDate(nextYearDate(expiryDate))}`,
      renewalAmount: Number(contract.contractValue || contract.invoiceId?.total || 0)
    }
  });
}

function buildPdf(doc, type, workOrder, template, company, businessSettings = null) {
  const context = workOrderTemplateContext(workOrder, company);
  if (type === 'quotation') buildQuotation(doc, workOrder, template, context, company, businessSettings);
  if (type === 'work') buildInvoice(doc, workOrder, template, context, company);
  if (type === 'service-completed') buildServiceCompleted(doc, workOrder, template, context, company);
  if (type === 'amc-contract') buildAmcContractPdf(doc, workOrder, template, context, company);
  if (type === 'amc-service-visit') buildAmcServiceVisitPdf(doc, workOrder, template, context, company);
  if (type === 'amc-invoice') buildAmcInvoicePdf(doc, workOrder, template, context, company);
  if (type === 'amc-renewal-reminder') buildAmcRenewalReminderPdf(doc, workOrder, template, context, company);
}

export function pdfCaption(type, workOrder, company = COMPANY) {
  const currentCompany = companyFallback(company);
  const customer = workOrder.customerId || {};
  const total = buildRows(workOrder).reduce((sum, row) => sum + Number(row.total || 0), 0);
  if (type === 'quotation') return `Hello ${customer.name || 'Customer'}, please find your quotation from ${currentCompany.name} for ${serviceType(workOrder)}. Total: ${money(total)}. Please confirm approval.`;
  if (type === 'work') return `Hello ${customer.name || 'Customer'}, your invoice/work details from ${currentCompany.name} are ready. Total: ${money(workOrder.invoiceId?.total ?? total)}.`;
  if (type === 'amc-contract') return `Hello ${customer.name || 'Customer'}, your AMC contract PDF from ${currentCompany.name} is ready. Contract value: ${money(workOrder.amcContractId?.contractValue || 0)}.`;
  if (type === 'amc-service-visit') return `Hello ${customer.name || 'Customer'}, your AMC service visit PDF from ${currentCompany.name} is ready.`;
  if (type === 'amc-invoice') return `Hello ${customer.name || 'Customer'}, your AMC invoice/receipt PDF from ${currentCompany.name} is ready. Balance: ${money(workOrder.invoiceId?.balance ?? workOrder.amcContractId?.invoiceId?.balance ?? 0)}.`;
  if (type === 'amc-renewal-reminder') return `Hello ${customer.name || 'Customer'}, your AMC renewal reminder from ${currentCompany.name} is ready.`;
  return `Hello ${customer.name || 'Customer'}, your service has been completed successfully. Thank you for choosing ${currentCompany.name}.`;
}

export async function generateWorkOrderPdf({ workOrderId, type, user }) {
  if (!hasPermission(user, 'view_documents') && !hasPermission(user, 'download_invoice_pdf')) {
    throw appError('You do not have permission to access this resource', 403);
  }
  if (!pdfTypes.includes(type)) throw appError('Invalid PDF type');
  const workOrder = await getPdfWorkOrder(workOrderId, user);
  if (!isAllowed(type, workOrder)) throw appError('Available after status change', 409);
  const template = await getTemplateByPdfType(type);
  const [company, businessSettings] = await Promise.all([
    getCompanyIdentity(),
    getBusinessSettings().catch(() => null)
  ]);
  if (type === 'work' && canRenderPublishedInvoiceDom(template)) {
    const context = workOrderTemplateContext(workOrder, company);
    const invoiceContext = invoiceDomContextForWorkOrder(context, invoicePayloadForWorkOrder(workOrder, context));
    const pdf = await renderPublishedInvoiceDomTemplate(
      template,
      invoiceContext,
      `${customerId(workOrder)}-${cleanFilePart(type)}-published-design`
    );
    return { ...pdf, workOrder, caption: pdfCaption(type, workOrder, company) };
  }

  fs.mkdirSync(PDF_DIR, { recursive: true });
  const filename = `${customerId(workOrder)}-${cleanFilePart(type)}-${Date.now()}.pdf`;
  const filePath = path.join(PDF_DIR, filename);

  await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);
    buildPdf(doc, type, workOrder, template, company, businessSettings);
    doc.end();
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return { filePath, filename, workOrder, caption: pdfCaption(type, workOrder, company) };
}
