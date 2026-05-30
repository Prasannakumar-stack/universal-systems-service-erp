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
  notificationTemplates: {
    bookingReceived: 'Hello {{customerName}}, your booking {{bookingId}} has been received by {{companyName}}. Contact: {{phone}}',
    bookingConfirmed: 'Hello {{customerName}}, your booking {{bookingId}} is confirmed. WhatsApp: {{whatsapp}}',
    technicianAssigned: 'Hello {{customerName}}, a technician has been assigned for booking {{bookingId}}.',
    workOrderCompleted: 'Hello {{customerName}}, your service work order is completed by {{companyName}}.',
    invoiceGenerated: 'Hello {{customerName}}, invoice {{invoiceNumber}} for {{amount}} is ready.',
    amcReminder: 'Hello {{customerName}}, this is an AMC reminder from {{companyName}}.',
    paymentReceived: 'Hello {{customerName}}, payment of {{amount}} has been received. Thank you.'
  },
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
  const base = { ...defaultBusinessSettings.notificationTemplates, ...(payload || {}) };
  return Object.keys(defaultBusinessSettings.notificationTemplates).reduce((result, key) => {
    result[key] = cleanText(base[key], defaultBusinessSettings.notificationTemplates[key], 1500);
    return result;
  }, {});
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
