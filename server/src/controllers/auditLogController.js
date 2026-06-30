import AuditLog from '../models/AuditLog.js';
import AMCContract from '../models/AMCContract.js';
import Booking from '../models/Booking.js';
import InventoryPart from '../models/InventoryPart.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import WorkOrder from '../models/WorkOrder.js';
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
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).formatToParts(date);
  const part = (type) => parts.find((item) => item.type === type)?.value || '';
  return `${part('day')} ${part('month')} ${part('year')}, ${part('hour')}:${part('minute')} ${part('dayPeriod').toUpperCase()}`.trim();
}

function titleize(value = '') {
  return clean(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .replace(/\bAmc\b/g, 'AMC')
    .replace(/\bId\b/g, 'ID');
}

function lifecycleChangedFields(row = {}) {
  const action = clean(row.action);
  const before = row.before || {};
  const after = row.after || {};
  if (action.endsWith('_archived')) return 'active → archived';
  if (action.endsWith('_moved_to_trash')) return 'active → trash';
  if (action.endsWith('_restored')) {
    if (before.isDisabled || before.disabledAt) return 'disabled → active';
    if (before.isDeleted || before.deletedAt) return 'trash → active';
    if (before.archivedAt) return 'archived → active';
  }
  if (after.isDisabled || after.disabledAt) return 'active → disabled';
  return '';
}

const ACTION_CHANGE_LABELS = {
  admin_avatar_removed: 'Admin avatar removed',
  admin_avatar_updated: 'Admin avatar updated',
  amc_contract_created: 'AMC contract created',
  amc_contract_permanently_deleted: 'AMC contract permanently deleted',
  amc_contract_reassigned: 'AMC contract reassigned',
  amc_visit_work_order_created: 'Created linked work order for AMC contract',
  approval_updated: 'Work order approval updated',
  assigned: 'Work order assigned',
  auto_assigned: 'Work order auto-assigned',
  booking_created: 'Booking created',
  booking_enquiry_updated: 'Booking enquiry updated',
  company_logo_removed: 'Company logo removed',
  company_logo_updated: 'Company logo updated',
  company_profile_updated: 'Company profile updated',
  created: 'Record created',
  customer_type_changed: 'Customer type updated',
  disabled: 'active \u2192 disabled',
  inventory_part_disabled: 'active \u2192 disabled',
  inventory_part_permanently_deleted: 'Inventory part permanently deleted',
  invoice_generated: 'Invoice generated for work order',
  invoice_voided_unlock_editing: 'Invoice voided to unlock editing',
  login_failed: 'Login failed',
  login_successful: 'Login successful',
  payment_recorded: 'Payment received',
  payment_reversed: 'Payment reversed',
  part_removed: 'Part removed from work order',
  part_request_approved: 'Part request approved',
  part_request_moved_to_used: 'Part request moved to parts used',
  part_request_rejected: 'Part request rejected',
  part_requested: 'Part requested for work order',
  part_updated: 'Part used row updated',
  part_used: 'Part used in work order',
  priority_changed: 'Work order priority updated',
  restored: 'Record restored',
  security_settings_updated: 'Security settings updated',
  service_charge_updated: 'Service charge updated',
  stock_changed: 'Stock quantity updated',
  status_changed: 'Work order status updated',
  trashed: 'active \u2192 trash',
  work_order_permanently_deleted: 'Work order permanently deleted'
};

function moduleLabel(row = {}) {
  return titleize(row.module) || 'Record';
}

function businessChangeLabel(row = {}) {
  const action = clean(row.action);
  if (ACTION_CHANGE_LABELS[action]) return ACTION_CHANGE_LABELS[action];
  if (action.endsWith('_created')) return `${moduleLabel(row)} created`;
  if (action.endsWith('_updated')) return `${moduleLabel(row)} updated`;
  if (action.endsWith('_deleted')) return `${moduleLabel(row)} deleted`;
  if (action.endsWith('_removed')) return `${moduleLabel(row)} removed`;
  if (action.endsWith('_reset')) return `${moduleLabel(row)} reset`;
  if (action.endsWith('_reordered')) return `${moduleLabel(row)} order updated`;
  if (action.endsWith('_published')) return `${moduleLabel(row)} published`;
  if (action.endsWith('_renamed')) return `${moduleLabel(row)} renamed`;
  if (action.endsWith('_restored_as_draft')) return `${moduleLabel(row)} restored as draft`;
  if (action.endsWith('_restored')) return `${moduleLabel(row)} restored`;
  return '';
}

function normalizeChangedFieldsLabel(label = '') {
  return clean(label).replace(/â†’/g, '\u2192');
}

function changesLabel(row = {}) {
  const lifecycleLabel = lifecycleChangedFields(row);
  if (lifecycleLabel) return normalizeChangedFieldsLabel(lifecycleLabel);
  const businessLabel = businessChangeLabel(row);
  if (businessLabel) return normalizeChangedFieldsLabel(businessLabel);
  const changes = row.changes || [];
  if (!Array.isArray(changes) || !changes.length) return 'No field changes tracked';
  return `${moduleLabel(row)} details updated`;
}

function compactJoin(parts = [], separator = ' - ') {
  return parts.map((item) => clean(item)).filter(Boolean).join(separator);
}

function workOrderDisplayId(workOrder = {}) {
  const bookingCode = clean(workOrder.bookingId?.bookingCode);
  if (/^WO-/i.test(bookingCode)) return bookingCode;
  const id = String(workOrder._id || workOrder.id || '');
  const year = workOrder.createdAt ? new Date(workOrder.createdAt).getFullYear() : new Date().getFullYear();
  return id ? `WO-${year}-${id.slice(-6).toUpperCase()}` : '';
}

function paymentDisplayId(payment = {}) {
  const id = String(payment._id || payment.id || '');
  return id ? `PAY-${id.slice(-6).toUpperCase()}` : '';
}

function fallbackRecordLabel(row = {}) {
  const before = row.before || {};
  const after = row.after || {};
  return compactJoin([
    row.recordLabel,
    after.workOrderId || before.workOrderId,
    after.invoiceNumber || before.invoiceNumber,
    after.contractId || before.contractId,
    after.bookingCode || before.bookingCode,
    after.partName || before.partName || after.name || before.name,
    after.customerName || before.customerName
  ]);
}

async function hydrateRecordLabelMap(rows = []) {
  const idsByModule = rows.reduce((map, row) => {
    const moduleName = clean(row.module);
    const id = validObjectId(row.recordId);
    if (!moduleName || !id) return map;
    if (!map.has(moduleName)) map.set(moduleName, new Set());
    map.get(moduleName).add(String(id));
    return map;
  }, new Map());

  const labelMap = new Map();
  const tasks = [];

  if (idsByModule.has('work_order')) {
    const ids = [...idsByModule.get('work_order')];
    tasks.push(WorkOrder.find({ _id: { $in: ids } })
      .select('_id customerId createdAt bookingId')
      .populate('customerId', 'name')
      .populate('bookingId', 'bookingCode')
      .lean()
      .then((records) => records.forEach((record) => {
        labelMap.set(`work_order:${record._id}`, compactJoin([workOrderDisplayId(record), record.customerId?.name]));
      })));
  }

  if (idsByModule.has('inventory')) {
    const ids = [...idsByModule.get('inventory')];
    tasks.push(InventoryPart.find({ _id: { $in: ids } })
      .select('_id partName sku')
      .lean()
      .then((records) => records.forEach((record) => {
        labelMap.set(`inventory:${record._id}`, compactJoin([record.partName, record.sku]));
      })));
  }

  if (idsByModule.has('booking')) {
    const ids = [...idsByModule.get('booking')];
    tasks.push(Booking.find({ _id: { $in: ids } })
      .select('_id bookingCode customerName')
      .lean()
      .then((records) => records.forEach((record) => {
        labelMap.set(`booking:${record._id}`, compactJoin([record.bookingCode, record.customerName]));
      })));
  }

  if (idsByModule.has('invoice')) {
    const ids = [...idsByModule.get('invoice')];
    tasks.push(Invoice.find({ _id: { $in: ids } })
      .select('_id invoiceNumber')
      .lean()
      .then((records) => records.forEach((record) => {
        labelMap.set(`invoice:${record._id}`, record.invoiceNumber || String(record._id));
      })));
  }

  if (idsByModule.has('payment')) {
    const ids = [...idsByModule.get('payment')];
    tasks.push(Payment.find({ _id: { $in: ids } })
      .select('_id invoiceId')
      .populate('invoiceId', 'invoiceNumber')
      .lean()
      .then((records) => records.forEach((record) => {
        labelMap.set(`payment:${record._id}`, compactJoin([paymentDisplayId(record), record.invoiceId?.invoiceNumber]));
      })));
  }

  if (idsByModule.has('amc')) {
    const ids = [...idsByModule.get('amc')];
    tasks.push(AMCContract.find({ _id: { $in: ids } })
      .select('_id contractId customerName')
      .lean()
      .then((records) => records.forEach((record) => {
        labelMap.set(`amc:${record._id}`, compactJoin([record.contractId, record.customerName]));
      })));
  }

  await Promise.all(tasks);
  return labelMap;
}

function recordLabel(row = {}, labelMap = new Map()) {
  const id = String(row.recordId || '');
  const hydrated = id ? labelMap.get(`${clean(row.module)}:${id}`) : '';
  return hydrated || fallbackRecordLabel(row);
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
  const labelMap = await hydrateRecordLabelMap(rows);
  const headers = ['Date', 'User', 'Role', 'Action', 'Module', 'Record ID', 'Record Label', 'Changed Fields'];
  const csvRows = rows.map((row) => [
    csvDate(row.createdAt),
    row.userId?.name || row.userId?.username || 'System',
    row.userId?.role || 'system',
    titleize(row.action),
    titleize(row.module),
    row.recordId || '',
    recordLabel(row, labelMap),
    changesLabel(row)
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
