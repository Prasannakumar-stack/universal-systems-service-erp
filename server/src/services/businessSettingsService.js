import fs from 'node:fs';
import mongoose from 'mongoose';
import BusinessSettings from '../models/BusinessSettings.js';
import BackupSettings from '../models/BackupSettings.js';
import BackupRecord from '../models/BackupRecord.js';
import { BACKUP_DIR, MONGO_URI, NODE_ENV, PDF_DIR, ROOT_DIR, UPLOAD_DIR } from '../config.js';
import { hasPermission, hasRole } from '../permissions.js';
import { appError, clean, numberValue } from '../utils/http.js';
import { logAudit } from './auditService.js';
import { storageSummary } from './backupService.js';

const SETTINGS_KEY = 'default';
const PREFIX_KEYS = ['invoice', 'workOrder', 'quotation', 'amc', 'paymentReceipt'];
const BUSINESS_SECTIONS = Object.freeze([
  'documentNumbering',
  'taxGst',
  'payment',
  'notificationTemplates',
  'statusWorkflows',
  'pdfTerms',
  'preferences'
]);

const SECTION_PERMISSIONS = Object.freeze({
  documentNumbering: 'manage_document_numbering',
  taxGst: 'manage_tax_settings',
  payment: 'manage_payment_settings',
  notificationTemplates: 'manage_notification_templates',
  statusWorkflows: 'manage_status_workflows',
  pdfTerms: 'manage_pdf_terms',
  preferences: 'edit_settings'
});

const AUDIT_ACTIONS = Object.freeze({
  documentNumbering: 'document_numbering_updated',
  taxGst: 'tax_gst_updated',
  payment: 'payment_settings_updated',
  notificationTemplates: 'notification_templates_updated',
  statusWorkflows: 'status_workflows_updated',
  pdfTerms: 'pdf_terms_updated',
  preferences: 'preferences_updated'
});

const NOTIFICATION_CHANNELS = Object.freeze(['whatsapp', 'sms', 'email']);
const NOTIFICATION_AUDIENCES = Object.freeze(['customer', 'admin', 'technician']);
const NOTIFICATION_VARIABLES = Object.freeze([
  '{{customerName}}', '{{customerPhone}}', '{{customerEmail}}', '{{customerAddress}}',
  '{{bookingId}}', '{{bookingDate}}', '{{bookingTime}}', '{{serviceType}}', '{{deviceType}}', '{{deviceBrand}}', '{{issueDescription}}', '{{bookingStatus}}',
  '{{technicianName}}', '{{technicianPhone}}', '{{workOrderId}}', '{{workOrderStatus}}', '{{serviceDate}}', '{{serviceSummary}}',
  '{{quotationNumber}}', '{{quotationAmount}}', '{{quotationStatus}}', '{{quotationValidDays}}', '{{approvalLink}}', '{{denyLink}}',
  '{{partName}}', '{{partQuantity}}', '{{partAmount}}', '{{partStatus}}', '{{partApprovalLink}}',
  '{{invoiceNumber}}', '{{invoiceAmount}}', '{{amount}}', '{{dueDate}}', '{{paymentLink}}', '{{paymentStatus}}',
  '{{companyName}}', '{{companyPhone}}', '{{companyWhatsApp}}', '{{companyEmail}}', '{{companyAddress}}', '{{website}}',
  '{{amcId}}', '{{amcPlan}}', '{{amcStartDate}}', '{{amcExpiryDate}}', '{{amcVisitDate}}', '{{amcDaysLeft}}', '{{renewalAmount}}',
  '{{warrantyEndDate}}', '{{warrantyDaysLeft}}'
]);

const NOTIFICATION_LEGACY_VARIABLES = Object.freeze({
  '{{phone}}': '{{customerPhone}}',
  '{{whatsapp}}': '{{companyWhatsApp}}',
  '{{email}}': '{{companyEmail}}',
  '{{address}}': '{{companyAddress}}',
  '{{invoiceNumber}}': '{{invoiceNumber}}',
  '{{amount}}': '{{amount}}',
  '{{companyName}}': '{{companyName}}',
  '{{customerName}}': '{{customerName}}',
  '{{bookingId}}': '{{bookingId}}'
});

const NOTIFICATION_TEMPLATE_CATALOG = Object.freeze([
  ['bookingReceived', 'Booking received', 'Booking', 'New service request received.', 'booking.received', 'customer', false, 'Hello {{customerName}}, your booking {{bookingId}} has been received by {{companyName}}. We will contact you shortly.', 'Booking {{bookingId}} received'],
  ['bookingConfirmed', 'Booking confirmed', 'Booking', 'Booking confirmation message.', 'booking.confirmed', 'customer', false, 'Hello {{customerName}}, your booking {{bookingId}} is confirmed for {{bookingDate}} {{bookingTime}}. Contact: {{companyPhone}}', 'Booking {{bookingId}} confirmed'],
  ['bookingRescheduled', 'Booking rescheduled', 'Booking', 'Booking schedule changed.', 'booking.rescheduled', 'customer', false, 'Hello {{customerName}}, your booking {{bookingId}} has been rescheduled to {{bookingDate}} {{bookingTime}}.', 'Booking {{bookingId}} rescheduled'],
  ['bookingCancelled', 'Booking cancelled', 'Booking', 'Booking cancellation notice.', 'booking.cancelled', 'customer', false, 'Hello {{customerName}}, your booking {{bookingId}} has been cancelled. Contact {{companyPhone}} for assistance.', 'Booking {{bookingId}} cancelled'],
  ['technicianAssigned', 'Technician assigned', 'Work Order', 'Technician assignment notice.', 'work_order.technician_assigned', 'customer', false, 'Hello {{customerName}}, {{technicianName}} has been assigned for booking {{bookingId}}.', 'Technician assigned for {{bookingId}}'],
  ['technicianOnTheWay', 'Technician on the way', 'Work Order', 'Technician travel notice.', 'work_order.technician_on_way', 'customer', false, 'Hello {{customerName}}, {{technicianName}} is on the way for your service booking {{bookingId}}.', 'Technician on the way'],
  ['workStarted', 'Work started', 'Work Order', 'Service work started.', 'work_order.started', 'customer', false, 'Hello {{customerName}}, work has started for work order {{workOrderId}}.', 'Work started for {{workOrderId}}'],
  ['workOrderCompleted', 'Work order completed', 'Work Order', 'Work order completion notice.', 'work_order.completed', 'customer', false, 'Hello {{customerName}}, your work order {{workOrderId}} is completed. Summary: {{serviceSummary}}', 'Work order {{workOrderId}} completed'],
  ['serviceCompletedPdfAttached', 'Service completed with PDF attached', 'Work Order', 'Completion notice with future PDF attachment.', 'service.completed_pdf', 'customer', true, 'Hello {{customerName}}, your service is completed. The service PDF for {{workOrderId}} is attached.', 'Service completed report'],
  ['quotationGenerated', 'Quotation generated', 'Quotation', 'Quotation generation notice.', 'quotation.generated', 'customer', true, 'Hello {{customerName}}, quotation {{quotationNumber}} for {{quotationAmount}} has been generated by {{companyName}}.', 'Quotation {{quotationNumber}} generated'],
  ['quotationApproved', 'Quotation approved', 'Quotation', 'Quotation approval confirmation.', 'quotation.approved', 'customer', false, 'Hello {{customerName}}, quotation {{quotationNumber}} has been approved. We will proceed with your service.', 'Quotation {{quotationNumber}} approved'],
  ['quotationDenied', 'Quotation denied', 'Quotation', 'Quotation denial confirmation.', 'quotation.denied', 'customer', false, 'Hello {{customerName}}, quotation {{quotationNumber}} was marked as denied. Contact {{companyPhone}} for help.', 'Quotation {{quotationNumber}} denied'],
  ['quotationRevisionRequested', 'Quotation revision requested', 'Quotation', 'Quotation revision request.', 'quotation.revision_requested', 'admin', false, 'Revision requested for quotation {{quotationNumber}} by {{customerName}}.', 'Quotation revision requested'],
  ['partApprovalRequest', 'Part approval request', 'Parts', 'Customer approval request for parts.', 'parts.approval_requested', 'customer', false, 'Hello {{customerName}}, approval is required for {{partName}} x {{partQuantity}}. Amount: {{partAmount}}. Approve: {{partApprovalLink}}', 'Part approval required'],
  ['partApproved', 'Part approved', 'Parts', 'Part approval confirmation.', 'parts.approved', 'admin', false, '{{customerName}} approved {{partName}} for work order {{workOrderId}}.', 'Part approved'],
  ['partDenied', 'Part denied', 'Parts', 'Part denial confirmation.', 'parts.denied', 'admin', false, '{{customerName}} denied {{partName}} for work order {{workOrderId}}.', 'Part denied'],
  ['partOrdered', 'Part ordered', 'Parts', 'Part ordered update.', 'parts.ordered', 'customer', false, 'Hello {{customerName}}, {{partName}} has been ordered for work order {{workOrderId}}.', 'Part ordered'],
  ['partArrived', 'Part arrived', 'Parts', 'Part arrival update.', 'parts.arrived', 'customer', false, 'Hello {{customerName}}, {{partName}} has arrived. We will continue work order {{workOrderId}}.', 'Part arrived'],
  ['invoiceGenerated', 'Invoice generated', 'Billing', 'Invoice ready notice.', 'invoice.generated', 'customer', true, 'Hello {{customerName}}, invoice {{invoiceNumber}} for {{invoiceAmount}} is ready. Payment link: {{paymentLink}}', 'Invoice {{invoiceNumber}} generated'],
  ['paymentDue', 'Payment due', 'Payment', 'Payment due reminder.', 'payment.due', 'customer', false, 'Hello {{customerName}}, payment of {{amount}} for invoice {{invoiceNumber}} is due on {{dueDate}}.', 'Payment due for {{invoiceNumber}}'],
  ['paymentOverdue', 'Payment overdue', 'Payment', 'Payment overdue reminder.', 'payment.overdue', 'customer', false, 'Hello {{customerName}}, payment of {{amount}} for invoice {{invoiceNumber}} is overdue. Please pay using {{paymentLink}}.', 'Payment overdue for {{invoiceNumber}}'],
  ['paymentReceived', 'Payment received', 'Payment', 'Payment received confirmation.', 'payment.received', 'customer', false, 'Hello {{customerName}}, payment of {{amount}} has been received. Thank you.', 'Payment received'],
  ['paymentFailed', 'Payment failed', 'Payment', 'Payment failure notice.', 'payment.failed', 'customer', false, 'Hello {{customerName}}, payment for invoice {{invoiceNumber}} failed. Please retry using {{paymentLink}}.', 'Payment failed'],
  ['amcCreated', 'AMC created', 'AMC', 'AMC contract created.', 'amc.created', 'customer', true, 'Hello {{customerName}}, AMC {{amcId}} for {{amcPlan}} has been created. Start date: {{amcStartDate}}.', 'AMC {{amcId}} created'],
  ['amcVisitScheduled', 'AMC visit scheduled', 'AMC', 'AMC visit scheduled notice.', 'amc.visit_scheduled', 'customer', false, 'Hello {{customerName}}, your AMC visit is scheduled on {{amcVisitDate}}.', 'AMC visit scheduled'],
  ['amcVisitCompleted', 'AMC visit completed', 'AMC', 'AMC visit completion notice.', 'amc.visit_completed', 'customer', false, 'Hello {{customerName}}, your AMC visit on {{amcVisitDate}} is completed.', 'AMC visit completed'],
  ['amcExpiry30Days', 'AMC expiry 30 days', 'AMC', 'AMC expiry reminder at 30 days.', 'amc.expiry_30', 'customer', false, 'Hello {{customerName}}, your AMC {{amcId}} expires in 30 days on {{amcExpiryDate}}.', 'AMC expires in 30 days'],
  ['amcExpiry15Days', 'AMC expiry 15 days', 'AMC', 'AMC expiry reminder at 15 days.', 'amc.expiry_15', 'customer', false, 'Hello {{customerName}}, your AMC {{amcId}} expires in 15 days on {{amcExpiryDate}}.', 'AMC expires in 15 days'],
  ['amcExpiry7Days', 'AMC expiry 7 days', 'AMC', 'AMC expiry reminder at 7 days.', 'amc.expiry_7', 'customer', false, 'Hello {{customerName}}, your AMC {{amcId}} expires in 7 days on {{amcExpiryDate}}.', 'AMC expires in 7 days'],
  ['amcExpired', 'AMC expired', 'AMC', 'AMC expired notice.', 'amc.expired', 'customer', false, 'Hello {{customerName}}, your AMC {{amcId}} expired on {{amcExpiryDate}}. Renewal amount: {{renewalAmount}}.', 'AMC expired'],
  ['amcRenewed', 'AMC renewed', 'AMC', 'AMC renewal confirmation.', 'amc.renewed', 'customer', true, 'Hello {{customerName}}, your AMC {{amcId}} has been renewed. New expiry date: {{amcExpiryDate}}.', 'AMC renewed'],
  ['warrantyExpiryReminder', 'Warranty expiry reminder', 'Warranty', 'Warranty expiry reminder.', 'warranty.expiry_reminder', 'customer', false, 'Hello {{customerName}}, your warranty ends on {{warrantyEndDate}}. Days left: {{warrantyDaysLeft}}.', 'Warranty expiry reminder'],
  ['newBookingInternalAlert', 'New booking internal alert', 'Internal', 'Internal alert for new bookings.', 'internal.booking_created', 'admin', false, 'New booking {{bookingId}} received from {{customerName}} for {{serviceType}}.', 'New booking alert'],
  ['technicianDelayAlert', 'Technician delay alert', 'Internal', 'Internal alert for technician delays.', 'internal.technician_delay', 'admin', false, 'Delay alert: {{technicianName}} is delayed for work order {{workOrderId}}.', 'Technician delay alert'],
  ['paymentOverdueInternalAlert', 'Payment overdue internal alert', 'Internal', 'Internal overdue payment alert.', 'internal.payment_overdue', 'admin', false, 'Payment overdue: invoice {{invoiceNumber}} for {{customerName}} is overdue by {{amount}}.', 'Payment overdue alert'],
  ['amcExpiryInternalAlert', 'AMC expiry internal alert', 'Internal', 'Internal AMC expiry alert.', 'internal.amc_expiry', 'admin', false, 'AMC {{amcId}} for {{customerName}} expires on {{amcExpiryDate}}.', 'AMC expiry alert'],
  ['lowStockPartRequiredAlert', 'Low stock / part required alert', 'Internal', 'Internal stock and parts alert.', 'internal.low_stock_part_required', 'admin', false, 'Part required: {{partName}} x {{partQuantity}} for work order {{workOrderId}}.', 'Part required alert']
]);

function notificationEmailBody(message) {
  return `${message}\n\nRegards,\n{{companyName}}\n{{companyPhone}} | {{companyEmail}}`;
}

function notificationSmsMessage(message) {
  return message.length > 220 ? `${message.slice(0, 217)}...` : message;
}

function notificationTemplateFromCatalog(item) {
  const [key, name, category, description, triggerEvent, audience, supportsAttachment, message, subject] = item;
  return {
    id: key,
    key,
    name,
    category,
    description,
    enabled: true,
    channels: {
      whatsapp: { enabled: true, message },
      sms: { enabled: true, message: notificationSmsMessage(message) },
      email: { enabled: true, subject, body: notificationEmailBody(message) }
    },
    allowedVariables: [...NOTIFICATION_VARIABLES],
    triggerEvent,
    audience,
    supportsAttachment: Boolean(supportsAttachment),
    isSystemDefault: true,
    isCustom: false,
    updatedAt: null,
    updatedBy: ''
  };
}

function buildNotificationTemplateDefaults() {
  return {
    version: 2,
    providers: {
      whatsapp: { connected: Boolean(process.env.WHATSAPP_PDF_API_URL && process.env.WHATSAPP_PDF_API_TOKEN) },
      sms: { connected: false },
      email: { connected: false }
    },
    templates: NOTIFICATION_TEMPLATE_CATALOG.map(notificationTemplateFromCatalog)
  };
}

const defaultBusinessSettings = Object.freeze({
  documentNumbering: {
    invoice: { prefix: 'INV', nextNumber: 1 },
    workOrder: { prefix: 'WO', nextNumber: 1 },
    quotation: { prefix: 'QUO', nextNumber: 1 },
    amc: { prefix: 'AMC', nextNumber: 1 },
    paymentReceipt: { prefix: 'RCPT', nextNumber: 1 },
    yearlyReset: false
  },
  taxGst: {
    enabled: false,
    gstEnabledManual: false,
    defaultPercentage: 18,
    splitCgstSgst: true,
    taxLabel: 'GST',
    showGstOnInvoices: true
  },
  payment: {
    acceptedMethods: ['Cash', 'UPI', 'Bank Transfer'],
    upiId: '',
    bankDetails: '',
    defaultPaymentStatus: 'Pending',
    paymentTermsText: 'Payment due on receipt.'
  },
  notificationTemplates: buildNotificationTemplateDefaults(),
  statusWorkflows: {
    booking: [
      { key: 'Pending', label: 'Pending', color: '#f59e0b', order: 0, active: true, protected: true },
      { key: 'Converted', label: 'Converted', color: '#22c55e', order: 1, active: true, protected: true }
    ],
    workOrder: [
      { key: 'Pending', label: 'Pending', color: '#f59e0b', order: 0, active: true, protected: true },
      { key: 'In Progress', label: 'In Progress', color: '#38bdf8', order: 1, active: true, protected: true },
      { key: 'Awaiting Parts', label: 'Awaiting Parts', color: '#a78bfa', order: 2, active: true, protected: true },
      { key: 'Completed', label: 'Completed', color: '#22c55e', order: 3, active: true, protected: true },
      { key: 'Delivered', label: 'Delivered', color: '#14b8a6', order: 4, active: true, protected: true },
      { key: 'Returned', label: 'Returned', color: '#64748b', order: 5, active: true, protected: true }
    ],
    invoice: [
      { key: 'Pending', label: 'Pending', color: '#f59e0b', order: 0, active: true, protected: true },
      { key: 'Partial', label: 'Partial', color: '#38bdf8', order: 1, active: true, protected: true },
      { key: 'Paid', label: 'Paid', color: '#22c55e', order: 2, active: true, protected: true },
      { key: 'Void', label: 'Void', color: '#ef4444', order: 3, active: true, protected: true }
    ],
    amc: [
      { key: 'Active', label: 'Active', color: '#22c55e', order: 0, active: true, protected: true },
      { key: 'Cancelled', label: 'Cancelled', color: '#ef4444', order: 1, active: true, protected: true },
      { key: 'Upcoming', label: 'Upcoming', color: '#38bdf8', order: 2, active: true, protected: true },
      { key: 'Completed', label: 'Completed', color: '#14b8a6', order: 3, active: true, protected: true }
    ]
  },
  pdfTerms: {
    invoiceTerms: 'Payment is due as per agreed service terms.',
    quotationTerms: 'This quotation is valid for 7 days unless stated otherwise.',
    serviceReportNotes: 'Service report notes are based on technician inspection at the time of visit.',
    amcTerms: 'AMC coverage is subject to contract period, visits, covered devices, and recorded terms.',
    warrantyNote: 'Warranty applies only to listed parts or services where explicitly mentioned.',
    footerNote: 'Thank you for choosing {{companyName}}.'
  },
  preferences: {
    defaultNotifications: true,
    dashboardFocus: true,
    pdfDocuments: true
  }
});

function assertSection(section) {
  const normalized = clean(section);
  if (!BUSINESS_SECTIONS.includes(normalized)) throw appError('Business settings section is not supported', 400);
  return normalized;
}

function assertSectionAccess(user, section) {
  if (!hasRole(user, 'admin')) throw appError('Only admin users can edit this settings section', 403);
  const permission = SECTION_PERMISSIONS[section];
  if (permission && !hasPermission(user, permission)) throw appError('You do not have permission to edit this settings section', 403);
  return permission;
}

function cleanText(value, fallback = '', max = 2000) {
  const text = clean(value ?? fallback);
  return text.length > max ? text.slice(0, max) : text;
}

function boolValue(value, fallback = false) {
  if (value === undefined || value === null) return Boolean(fallback);
  return Boolean(value);
}

function cleanList(value = [], fallback = []) {
  const source = Array.isArray(value) ? value : fallback;
  return Array.from(new Set(source.map((item) => cleanText(item, '', 120)).filter(Boolean)));
}

function cleanNotificationChannel(channel = {}, fallback = {}, type = 'whatsapp') {
  if (type === 'email') {
    return {
      enabled: boolValue(channel.enabled, fallback.enabled ?? true),
      subject: cleanText(channel.subject, fallback.subject || '', 300),
      body: cleanText(channel.body ?? channel.message, fallback.body || fallback.message || '', 5000)
    };
  }
  return {
    enabled: boolValue(channel.enabled, fallback.enabled ?? true),
    message: cleanText(channel.message ?? channel.body, fallback.message || fallback.body || '', 2500)
  };
}

function legacyNotificationValue(payload = {}, templateKey = '', channel = 'whatsapp') {
  if (!payload || typeof payload !== 'object') return '';
  const suffix = channel === 'sms' ? 'Sms' : channel === 'email' ? 'Email' : '';
  const key = `${templateKey}${suffix}`;
  const value = payload[key];
  if (typeof value === 'string') return value;
  if (channel === 'whatsapp' && typeof payload[templateKey] === 'string') return payload[templateKey];
  return '';
}

function mergeLegacyNotificationValues(template, payload = {}) {
  const next = { ...template, channels: { ...template.channels } };
  const whatsapp = legacyNotificationValue(payload, template.key, 'whatsapp');
  const sms = legacyNotificationValue(payload, template.key, 'sms');
  const email = legacyNotificationValue(payload, template.key, 'email');
  if (whatsapp) next.channels.whatsapp = { ...next.channels.whatsapp, message: whatsapp };
  if (sms) next.channels.sms = { ...next.channels.sms, message: sms };
  else if (whatsapp) next.channels.sms = { ...next.channels.sms, message: notificationSmsMessage(whatsapp) };
  if (email) next.channels.email = { ...next.channels.email, body: email };
  else if (whatsapp) next.channels.email = { ...next.channels.email, body: notificationEmailBody(whatsapp) };
  const enabledKey = `${template.key}Enabled`;
  if (payload[enabledKey] !== undefined) next.enabled = payload[enabledKey] !== false;
  return next;
}

function sanitizeNotificationTemplate(item = {}, fallback = {}) {
  const fallbackChannels = fallback.channels || {};
  const key = cleanText(item.key || fallback.key || item.id, fallback.key || '', 100);
  const category = cleanText(item.category, fallback.category || 'Other', 40);
  const audience = cleanText(item.audience, fallback.audience || 'customer', 40);
  return {
    id: cleanText(item.id || key, fallback.id || key, 120),
    key,
    name: cleanText(item.name, fallback.name || key, 140),
    category,
    description: cleanText(item.description, fallback.description || '', 500),
    enabled: boolValue(item.enabled, fallback.enabled ?? true),
    channels: {
      whatsapp: cleanNotificationChannel(item.channels?.whatsapp || {}, fallbackChannels.whatsapp || {}, 'whatsapp'),
      sms: cleanNotificationChannel(item.channels?.sms || {}, fallbackChannels.sms || {}, 'sms'),
      email: cleanNotificationChannel(item.channels?.email || {}, fallbackChannels.email || {}, 'email')
    },
    allowedVariables: cleanList(item.allowedVariables, fallback.allowedVariables || NOTIFICATION_VARIABLES),
    triggerEvent: cleanText(item.triggerEvent, fallback.triggerEvent || '', 120),
    audience: NOTIFICATION_AUDIENCES.includes(audience) ? audience : (fallback.audience || 'customer'),
    supportsAttachment: boolValue(item.supportsAttachment, fallback.supportsAttachment),
    isSystemDefault: boolValue(item.isSystemDefault, fallback.isSystemDefault),
    isCustom: boolValue(item.isCustom, fallback.isCustom),
    updatedAt: item.updatedAt || fallback.updatedAt || null,
    updatedBy: cleanText(item.updatedBy, fallback.updatedBy || '', 140)
  };
}

function sanitizeNotificationProviders(providers = {}, fallback = {}) {
  return NOTIFICATION_CHANNELS.reduce((result, channel) => {
    result[channel] = {
      connected: boolValue(providers?.[channel]?.connected, fallback?.[channel]?.connected),
      label: cleanText(providers?.[channel]?.label, fallback?.[channel]?.label || '')
    };
    return result;
  }, {});
}

function sanitizeNumberingItem(item = {}, fallback = {}) {
  const prefix = cleanText(item.prefix, fallback.prefix, 12).toUpperCase();
  if (!prefix || !/^[A-Z0-9_-]+$/.test(prefix)) throw appError('Document prefixes must use letters, numbers, hyphen, or underscore', 400);
  const nextNumber = Math.floor(numberValue(item.nextNumber, fallback.nextNumber || 1));
  if (!Number.isFinite(nextNumber) || nextNumber < 1) throw appError('Next document numbers must be positive integers', 400);
  return { prefix, nextNumber };
}

function sanitizeDocumentNumbering(payload = {}) {
  const base = { ...defaultBusinessSettings.documentNumbering, ...(payload || {}) };
  const next = PREFIX_KEYS.reduce((result, key) => {
    result[key] = sanitizeNumberingItem(base[key], defaultBusinessSettings.documentNumbering[key]);
    return result;
  }, {});
  const prefixes = PREFIX_KEYS.map((key) => next[key].prefix);
  if (new Set(prefixes).size !== prefixes.length) throw appError('Document prefixes must be unique', 400);
  return { ...next, yearlyReset: Boolean(base.yearlyReset) };
}

function sanitizeTaxGst(payload = {}) {
  const base = { ...defaultBusinessSettings.taxGst, ...(payload || {}) };
  const percentage = numberValue(base.defaultPercentage, defaultBusinessSettings.taxGst.defaultPercentage);
  if (percentage < 0 || percentage > 100) throw appError('Default GST percentage must be between 0 and 100', 400);
  return {
    enabled: Boolean(base.enabled),
    gstEnabledManual: Boolean(base.gstEnabledManual),
    defaultPercentage: percentage,
    splitCgstSgst: Boolean(base.splitCgstSgst),
    taxLabel: cleanText(base.taxLabel, 'GST', 40),
    showGstOnInvoices: Boolean(base.showGstOnInvoices)
  };
}

function sanitizePayment(payload = {}) {
  const base = { ...defaultBusinessSettings.payment, ...(payload || {}) };
  const acceptedMethods = Array.isArray(base.acceptedMethods)
    ? base.acceptedMethods.map((item) => cleanText(item, '', 40)).filter(Boolean)
    : defaultBusinessSettings.payment.acceptedMethods;
  const defaultPaymentStatus = cleanText(base.defaultPaymentStatus, 'Pending', 20);
  if (!['Pending', 'Partial', 'Paid'].includes(defaultPaymentStatus)) throw appError('Default payment status is not supported', 400);
  return {
    acceptedMethods: Array.from(new Set(acceptedMethods)),
    upiId: cleanText(base.upiId, '', 120),
    bankDetails: cleanText(base.bankDetails, '', 1500),
    defaultPaymentStatus,
    paymentTermsText: cleanText(base.paymentTermsText, defaultBusinessSettings.payment.paymentTermsText, 1500)
  };
}

function sanitizeNotificationTemplates(payload = {}) {
  const defaults = buildNotificationTemplateDefaults();
  const incomingTemplates = Array.isArray(payload?.templates) ? payload.templates : [];
  const incomingByKey = new Map(incomingTemplates.map((item) => [cleanText(item.key || item.id, '', 120), item]));
  const templates = defaults.templates.map((defaultTemplate) => {
    const legacyMerged = mergeLegacyNotificationValues(defaultTemplate, payload);
    const incoming = incomingByKey.get(defaultTemplate.key);
    return sanitizeNotificationTemplate(incoming || legacyMerged, legacyMerged);
  });
  incomingTemplates
    .filter((item) => item?.isCustom || !templates.some((template) => template.key === cleanText(item.key || item.id, '', 120)))
    .forEach((item) => {
      const customKey = cleanText(item.key || item.id, `custom_${templates.length + 1}`, 120);
      const fallback = {
        id: customKey,
        key: customKey,
        name: cleanText(item.name, 'Custom template', 140),
        category: cleanText(item.category, 'Other', 40),
        description: cleanText(item.description, '', 500),
        enabled: true,
        channels: {
          whatsapp: { enabled: true, message: '' },
          sms: { enabled: true, message: '' },
          email: { enabled: true, subject: '', body: '' }
        },
        allowedVariables: [...NOTIFICATION_VARIABLES],
        triggerEvent: cleanText(item.triggerEvent, 'custom.manual', 120),
        audience: 'customer',
        supportsAttachment: false,
        isSystemDefault: false,
        isCustom: true,
        updatedAt: null,
        updatedBy: ''
      };
      templates.push(sanitizeNotificationTemplate({ ...item, key: customKey, id: item.id || customKey, isCustom: true, isSystemDefault: false }, fallback));
    });
  return {
    version: 2,
    providers: sanitizeNotificationProviders(payload?.providers || {}, defaults.providers),
    legacyVariableAliases: NOTIFICATION_LEGACY_VARIABLES,
    templates
  };
}

function sanitizeWorkflowItem(item = {}, fallback = {}, index = 0) {
  const protectedStatus = Boolean(fallback.protected || item.protected);
  const key = cleanText(item.key || item.label, fallback.key, 80);
  const label = cleanText(item.label || item.key, fallback.label || key, 80);
  return {
    key,
    label,
    color: cleanText(item.color, fallback.color || '#75c4ff', 20),
    order: Math.max(0, Math.floor(numberValue(item.order, fallback.order ?? index))),
    active: protectedStatus ? true : item.active !== false,
    protected: protectedStatus
  };
}

function sanitizeStatusWorkflows(payload = {}) {
  const result = {};
  Object.entries(defaultBusinessSettings.statusWorkflows).forEach(([workflowKey, defaults]) => {
    const incoming = Array.isArray(payload?.[workflowKey]) ? payload[workflowKey] : defaults;
    const byKey = new Map(defaults.map((item) => [item.key, item]));
    const merged = incoming.map((item, index) => sanitizeWorkflowItem(item, byKey.get(item.key) || {}, index));
    defaults.filter((item) => item.protected && !merged.some((current) => current.key === item.key)).forEach((item) => merged.push(item));
    result[workflowKey] = merged.sort((a, b) => a.order - b.order).map((item, index) => ({ ...item, order: index }));
  });
  return result;
}

function sanitizePdfTerms(payload = {}) {
  const base = { ...defaultBusinessSettings.pdfTerms, ...(payload || {}) };
  return Object.keys(defaultBusinessSettings.pdfTerms).reduce((result, key) => {
    result[key] = cleanText(base[key], defaultBusinessSettings.pdfTerms[key], 2500);
    return result;
  }, {});
}

function sanitizePreferences(payload = {}) {
  const base = { ...defaultBusinessSettings.preferences, ...(payload || {}) };
  return {
    defaultNotifications: Boolean(base.defaultNotifications),
    dashboardFocus: Boolean(base.dashboardFocus),
    pdfDocuments: Boolean(base.pdfDocuments)
  };
}

function sanitizeSection(section, payload) {
  if (section === 'documentNumbering') return sanitizeDocumentNumbering(payload);
  if (section === 'taxGst') return sanitizeTaxGst(payload);
  if (section === 'payment') return sanitizePayment(payload);
  if (section === 'notificationTemplates') return sanitizeNotificationTemplates(payload);
  if (section === 'statusWorkflows') return sanitizeStatusWorkflows(payload);
  if (section === 'pdfTerms') return sanitizePdfTerms(payload);
  if (section === 'preferences') return sanitizePreferences(payload);
  return payload;
}

function allDefaults() {
  return {
    key: SETTINGS_KEY,
    documentNumbering: sanitizeDocumentNumbering(defaultBusinessSettings.documentNumbering),
    taxGst: sanitizeTaxGst(defaultBusinessSettings.taxGst),
    payment: sanitizePayment(defaultBusinessSettings.payment),
    notificationTemplates: sanitizeNotificationTemplates(defaultBusinessSettings.notificationTemplates),
    statusWorkflows: sanitizeStatusWorkflows(defaultBusinessSettings.statusWorkflows),
    pdfTerms: sanitizePdfTerms(defaultBusinessSettings.pdfTerms),
    preferences: sanitizePreferences(defaultBusinessSettings.preferences)
  };
}

function serializeBusinessSettings(settings) {
  const item = settings?.toObject ? settings.toObject() : settings;
  const defaults = allDefaults();
  return {
    id: String(item?._id || item?.id || ''),
    key: SETTINGS_KEY,
    documentNumbering: sanitizeDocumentNumbering(item?.documentNumbering || defaults.documentNumbering),
    taxGst: sanitizeTaxGst(item?.taxGst || defaults.taxGst),
    payment: sanitizePayment(item?.payment || defaults.payment),
    notificationTemplates: sanitizeNotificationTemplates(item?.notificationTemplates || defaults.notificationTemplates),
    statusWorkflows: sanitizeStatusWorkflows(item?.statusWorkflows || defaults.statusWorkflows),
    pdfTerms: sanitizePdfTerms(item?.pdfTerms || defaults.pdfTerms),
    preferences: sanitizePreferences(item?.preferences || defaults.preferences),
    updatedAt: item?.updatedAt || null,
    createdAt: item?.createdAt || null
  };
}

export async function ensureBusinessSettings() {
  return BusinessSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: allDefaults() },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

export async function getBusinessSettings() {
  const settings = await ensureBusinessSettings();
  return serializeBusinessSettings(settings);
}

export async function updateBusinessSettingsSection(section, payload = {}, user = null) {
  const normalizedSection = assertSection(section);
  assertSectionAccess(user, normalizedSection);
  const existing = await ensureBusinessSettings();
  const before = serializeBusinessSettings(existing)[normalizedSection];
  const sectionPayload = payload?.[normalizedSection] || payload?.settings || payload;
  const sanitized = sanitizeSection(normalizedSection, sectionPayload);
  existing.set(normalizedSection, sanitized);
  existing.lastUpdatedBy = user?._id || null;
  await existing.save();
  const after = serializeBusinessSettings(existing)[normalizedSection];
  await logAudit({
    userId: user?._id || null,
    action: AUDIT_ACTIONS[normalizedSection],
    module: 'business_settings',
    recordId: existing._id,
    before,
    after
  });
  return { section: normalizedSection, settings: after, allSettings: serializeBusinessSettings(existing) };
}

function fileStatus(dirPath) {
  return {
    path: dirPath,
    exists: fs.existsSync(dirPath),
    writable: fs.existsSync(dirPath)
  };
}

export async function getSystemInformation() {
  const [storage, backupSettings, latestBackup] = await Promise.all([
    storageSummary().catch(() => null),
    BackupSettings.findOne({ key: SETTINGS_KEY }).lean().catch(() => null),
    BackupRecord.findOne({ status: { $in: ['completed', 'restored'] } }).sort({ createdAt: -1 }).lean().catch(() => null)
  ]);
  const packageJson = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  const dbReady = mongoose.connection.readyState === 1;
  return {
    appVersion: packageJson.version || '1.0.0',
    appName: packageJson.name || 'Service ERP',
    environment: NODE_ENV,
    apiStatus: 'Online',
    databaseStatus: dbReady ? 'Connected' : 'Disconnected',
    databaseName: mongoose.connection.name || MONGO_URI.split('/').pop() || '',
    storage,
    paths: {
      root: fileStatus(ROOT_DIR),
      uploads: fileStatus(UPLOAD_DIR),
      pdfs: fileStatus(PDF_DIR),
      backups: fileStatus(BACKUP_DIR)
    },
    lastBackup: latestBackup ? {
      id: String(latestBackup._id),
      filename: latestBackup.filename,
      createdAt: latestBackup.createdAt,
      size: latestBackup.size || 0,
      status: latestBackup.status
    } : null,
    backupSettings: {
      automaticBackupEnabled: Boolean(backupSettings?.automaticBackupEnabled),
      backupFrequency: backupSettings?.backupFrequency || 'Weekly',
      lastBackupAt: backupSettings?.lastBackupAt || null
    },
    build: {
      node: process.version,
      timestamp: new Date().toISOString()
    }
  };
}
