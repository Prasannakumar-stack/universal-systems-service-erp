import AuditLog from '../models/AuditLog.js';

export async function logAudit({ userId = null, action, module, recordId = null, before = null, after = null }) {
  if (!action || !module) return null;
  return AuditLog.create({ userId, action, module, recordId, before, after });
}
