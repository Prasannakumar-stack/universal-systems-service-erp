import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import { appError, clean } from '../utils/http.js';
import { normalizeRole } from '../permissions.js';
import { addDateRange, paginatedPayload, paginationMeta, parsePagination, searchRegex, validObjectId, withNestedIds } from '../utils/pagination.js';

const AUDIT_CLEANUP_DAYS = new Set([90, 180]);
const CLEAR_ALL_CONFIRMATION = 'CLEAR AUDIT LOGS';
const EXPORT_LIMIT = 10000;

function isHighestAdmin(user) {
  const role = normalizeRole(user?.role);
  return role === 'super_admin' || role === 'admin';
}

function assertAuditMaintenanceAllowed(user) {
  if (!isHighestAdmin(user)) throw appError('Only the highest admin role can maintain audit logs', 403);
}

async function buildAuditFilter(query = {}) {
  const filter = {};
  const clauses = [];
  if (clean(query.module)) filter.module = clean(query.module);
  if (clean(query.action)) filter.action = clean(query.action);
  addDateRange(filter, query);

  const userId = validObjectId(query.userId || query.user);
  if (userId) filter.userId = userId;

  const searchText = clean(query.search);
  const regex = searchRegex(searchText);
  if (regex) {
    const users = await User.find({ $or: [{ name: regex }, { username: regex }] }).select('_id').limit(1000).lean();
    const searchClauses = [
      { action: regex },
      { module: regex },
      { recordLabel: regex },
      { userId: { $in: users.map((item) => item._id) } }
    ];
    const searchObjectId = validObjectId(searchText);
    if (searchObjectId) searchClauses.push({ recordId: searchObjectId });
    clauses.push({ $or: searchClauses });
  }
  if (clauses.length) filter.$and = clauses;
  return filter;
}

function serializeLog(log) {
  return withNestedIds(log, ['userId']);
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

function csvDate(value) {
  return value ? new Date(value).toISOString() : '';
}

function changesLabel(changes = []) {
  if (!Array.isArray(changes) || !changes.length) return '';
  return changes.map((change) => change.field).filter(Boolean).join('; ');
}

export async function list(req, res) {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = await buildAuditFilter(req.query);

    const [total, rows] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter).populate('userId', 'name username role').sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
    ]);
    const logs = rows.map(serializeLog);
    res.json(paginatedPayload('logs', logs, paginationMeta(page, limit, total)));
  } catch (error) {
    console.error('Audit log list failed', error);
    res.status(500).json({ success: false, message: 'Unable to load audit logs right now' });
  }
}

export async function stats(req, res) {
  const filter = await buildAuditFilter(req.query);
  const [total, oldest, filteredTotal, filteredOldest] = await Promise.all([
    AuditLog.countDocuments({}),
    AuditLog.findOne({}).sort({ createdAt: 1 }).select('createdAt').lean(),
    AuditLog.countDocuments(filter),
    AuditLog.findOne(filter).sort({ createdAt: 1 }).select('createdAt').lean()
  ]);
  res.json({
    success: true,
    total,
    oldestLogDate: oldest?.createdAt || null,
    filteredTotal,
    filteredOldestLogDate: filteredOldest?.createdAt || null
  });
}

export async function exportCsv(req, res) {
  const filter = await buildAuditFilter(req.query);
  const rows = await AuditLog.find(filter)
    .populate('userId', 'name username role')
    .sort({ createdAt: -1 })
    .limit(EXPORT_LIMIT)
    .lean();
  const headers = ['Date', 'User', 'Role', 'Action', 'Module', 'Record ID', 'Record Label', 'Changed Fields'];
  const csvRows = rows.map((row) => [
    csvDate(row.createdAt),
    row.userId?.name || row.userId?.username || 'System',
    row.userId?.role || 'system',
    row.action,
    row.module,
    row.recordId || '',
    row.recordLabel || '',
    changesLabel(row.changes)
  ]);
  const csv = [headers, ...csvRows].map((row) => row.map(csvCell).join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="audit-logs.csv"');
  res.send(`\uFEFF${csv}`);
}

export async function clearOlderThan(req, res) {
  assertAuditMaintenanceAllowed(req.user);
  const days = Number.parseInt(req.params.days || req.query.days, 10);
  if (!AUDIT_CLEANUP_DAYS.has(days)) throw appError('Choose a supported audit log cleanup period', 400);
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await AuditLog.deleteMany({ createdAt: { $lt: cutoff } });
  res.json({
    success: true,
    deletedCount: result.deletedCount || 0,
    message: 'Audit logs cleared successfully.'
  });
}

export async function clearAll(req, res) {
  assertAuditMaintenanceAllowed(req.user);
  if (clean(req.body?.confirmation) !== CLEAR_ALL_CONFIRMATION) {
    throw appError('Type CLEAR AUDIT LOGS to confirm clearing all audit logs', 400);
  }
  const result = await AuditLog.deleteMany({});
  res.json({
    success: true,
    deletedCount: result.deletedCount || 0,
    message: 'Audit logs cleared successfully.'
  });
}
