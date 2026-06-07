import AuditLog from '../models/AuditLog.js';
import BusinessSettings from '../models/BusinessSettings.js';

const SECURITY_MODULE_PATTERN = /(auth|login|logout|password|permission|role|security|session)/i;
const DATA_MODULE_PATTERN = /(booking|work_order|customer|invoice|payment|inventory|stock|amc|document|pdf|backup|settings|company|website|business)/i;

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

export async function logAudit({ userId = null, action, module, recordId = null, before = null, after = null }) {
  if (!action || !module) return null;
  const policy = await auditPolicy();
  if (!shouldWriteAudit({ action, module }, policy)) return null;
  const created = await AuditLog.create({ userId, action, module, recordId, before, after });
  const cutoff = new Date(Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000);
  AuditLog.deleteMany({ createdAt: { $lt: cutoff } }).catch(() => {});
  return created;
}
