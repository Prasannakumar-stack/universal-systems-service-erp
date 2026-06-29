import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';
import BusinessSettings from '../models/BusinessSettings.js';

const SECURITY_MODULE_PATTERN = /(auth|login|logout|password|permission|role|security|session)/i;
const DATA_MODULE_PATTERN = /(booking|work_order|customer|invoice|payment|inventory|stock|amc|document|pdf|backup|settings|company|website|business)/i;
const MAX_AUDIT_FIELDS = 40;
const MAX_AUDIT_STRING_LENGTH = 400;
const MAX_AUDIT_ARRAY_ITEMS = 6;
const MAX_AUDIT_OBJECT_KEYS = 14;
const SENSITIVE_FIELD_PATTERN = /(password|passwordhash|token|secret|otp|cookie|authorization|signature|reset|salt)/i;
const LARGE_FIELD_PATTERN = /(base64|buffer|html|content|manifest|config|versions|services|permissions|file|image|photo|avatar|template)/i;

async function auditPolicy() {
  const settings = await BusinessSettings.findOne({ key: 'default' }).select('securitySettings').lean().catch(() => null);
  const audit = settings?.securitySettings?.audit || {};
  return {
    enabled: audit.auditLoggingEnabled !== false,
    retentionDays: [30, 90, 180, 365].includes(Number(audit.auditRetentionDays)) ? Number(audit.auditRetentionDays) : 90,
    logAdminActivities: audit.logAdminActivities !== false,
    logDataChanges: audit.logDataChanges !== false,
    logSecurityEvents: audit.logSecurityEvents !== false
  };
}

function shouldWriteAudit({ action = '', module = '' }, policy) {
  if (!policy.enabled) return false;
  const text = `${action} ${module}`;
  if (SECURITY_MODULE_PATTERN.test(text)) return policy.logSecurityEvents;
  if (DATA_MODULE_PATTERN.test(text)) return policy.logDataChanges;
  return policy.logAdminActivities;
}

function isPlainObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date) && !isObjectIdLike(value);
}

function isObjectIdLike(value) {
  return Boolean(value && typeof value === 'object' && typeof value.toHexString === 'function');
}

function compactString(value = '') {
  const text = String(value);
  return text.length > MAX_AUDIT_STRING_LENGTH ? `${text.slice(0, MAX_AUDIT_STRING_LENGTH)}...` : text;
}

function compactAuditValue(value, depth = 0) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (isObjectIdLike(value)) return String(value);
  if (typeof value === 'string') return compactString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) {
    if (!value.length) return [];
    const primitiveOnly = value.every((item) => item === null || ['string', 'number', 'boolean'].includes(typeof item) || item instanceof Date || isObjectIdLike(item));
    if (!primitiveOnly || value.length > MAX_AUDIT_ARRAY_ITEMS) return `${value.length} item${value.length === 1 ? '' : 's'}`;
    return value.map((item) => compactAuditValue(item, depth + 1));
  }
  if (!isPlainObject(value) || depth >= 2) {
    const keys = value && typeof value === 'object' ? Object.keys(value).length : 0;
    return keys ? `${keys} field${keys === 1 ? '' : 's'}` : compactString(value);
  }
  const output = {};
  Object.entries(value).slice(0, MAX_AUDIT_OBJECT_KEYS).forEach(([key, item]) => {
    if (SENSITIVE_FIELD_PATTERN.test(key)) return;
    output[key] = compactAuditValue(item, depth + 1);
  });
  return output;
}

function flattenAuditFields(value, prefix = '', depth = 0, result = {}) {
  if (Object.keys(result).length >= MAX_AUDIT_FIELDS) return result;
  if (!isPlainObject(value)) {
    if (prefix) result[prefix] = compactAuditValue(value, depth);
    return result;
  }

  Object.entries(value).forEach(([key, item]) => {
    if (Object.keys(result).length >= MAX_AUDIT_FIELDS) return;
    if (SENSITIVE_FIELD_PATTERN.test(key)) return;
    const field = prefix ? `${prefix}.${key}` : key;
    if (LARGE_FIELD_PATTERN.test(key)) {
      result[field] = compactAuditValue(item, depth + 1);
      return;
    }
    if (isPlainObject(item) && depth < 1) {
      flattenAuditFields(item, field, depth + 1, result);
      return;
    }
    result[field] = compactAuditValue(item, depth + 1);
  });
  return result;
}

function stableAuditJson(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function safeAuditKey(field = '') {
  return String(field || 'value').replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 80) || 'value';
}

function changedAuditFields(before, after) {
  const beforeFields = flattenAuditFields(before || {});
  const afterFields = flattenAuditFields(after || {});
  const keys = Array.from(new Set([...Object.keys(beforeFields), ...Object.keys(afterFields)])).slice(0, MAX_AUDIT_FIELDS);
  return keys
    .filter((field) => stableAuditJson(beforeFields[field]) !== stableAuditJson(afterFields[field]))
    .map((field) => ({
      field,
      before: beforeFields[field] === undefined ? null : beforeFields[field],
      after: afterFields[field] === undefined ? null : afterFields[field]
    }));
}

function objectFromChanges(changes = [], side = 'after') {
  const rows = changes
    .filter((change) => change?.[side] !== undefined)
    .map((change) => [safeAuditKey(change.field), change[side]]);
  return rows.length ? Object.fromEntries(rows) : null;
}

function firstLabelValue(source = {}) {
  if (!source || typeof source !== 'object') return '';
  const candidates = [
    source.recordLabel,
    source.displayId,
    source.workOrderId,
    source.invoiceNumber,
    source.contractId,
    source.customerName,
    source.partName,
    source.part,
    source.name,
    source.username,
    source.title,
    source.filename,
    source.key,
    source.id,
    source._id
  ];
  const value = candidates.find((item) => item !== undefined && item !== null && String(item).trim());
  return value ? compactString(value).slice(0, 160) : '';
}

function deriveRecordLabel(recordLabel, before, after) {
  return compactString(recordLabel || firstLabelValue(after) || firstLabelValue(before)).slice(0, 160);
}

function normalizeRecordId(recordId) {
  if (!recordId) return null;
  const value = String(recordId);
  return mongoose.Types.ObjectId.isValid(value) ? recordId : null;
}

function compactAuditPayload({ before = null, after = null, recordLabel = '' }) {
  const changes = changedAuditFields(before, after);
  return {
    recordLabel: deriveRecordLabel(recordLabel, before, after),
    changes,
    before: objectFromChanges(changes, 'before'),
    after: objectFromChanges(changes, 'after')
  };
}

export async function logAudit({ userId = null, action, module, recordId = null, recordLabel = '', before = null, after = null }) {
  if (!action || !module) return null;
  const policy = await auditPolicy();
  if (!shouldWriteAudit({ action, module }, policy)) return null;
  const compact = compactAuditPayload({ before, after, recordLabel });
  const created = await AuditLog.create({
    userId,
    action,
    module,
    recordId: normalizeRecordId(recordId),
    recordLabel: compact.recordLabel,
    changes: compact.changes,
    before: compact.before,
    after: compact.after
  });
  const cutoff = new Date(Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000);
  AuditLog.deleteMany({ createdAt: { $lt: cutoff } }).catch(() => {});
  return created;
}
