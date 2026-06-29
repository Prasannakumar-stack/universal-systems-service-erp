import Booking from '../models/Booking.js';
import AMCContract from '../models/AMCContract.js';
import AuditLog from '../models/AuditLog.js';
import Customer from '../models/Customer.js';
import Document from '../models/Document.js';
import InventoryPart from '../models/InventoryPart.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import WorkOrder from '../models/WorkOrder.js';
import { assertPermission, normalizeRole } from '../permissions.js';
import { appError, clean, numberValue } from '../utils/http.js';
import { addDateRange, paginationMeta, parsePagination, searchRegex, validObjectId, withNestedIds } from '../utils/pagination.js';
import { logAudit } from './auditService.js';
import { AUTO_AMC_PART_CHARGE_MODE, AUTO_AMC_PART_CHARGE_TYPE, MANUAL_AMC_PART_CHARGE_MODE, amcPartChargeType } from './amcCoverageEngine.js';
import { createNotification } from './notificationService.js';
import { allocatePurchaseUsage, releasePurchaseUsage } from './purchaseImportService.js';
import { applyStockMovement, syncPartAvailability } from './stockMovementService.js';
import { technicianCanAccessWorkOrder, technicianWorkOrderScope } from './technicianScopeService.js';

const populateWorkOrder = [
  { path: 'customerId', select: 'name phone address devices' },
  { path: 'technicianId', select: 'name username role' },
  { path: 'timeline.userId', select: 'name username role' },
  { path: 'partRequests.userId', select: 'name username role' },
  { path: 'partRequests.approvedBy', select: 'name username role' },
  { path: 'partRequests.rejectedBy', select: 'name username role' },
  { path: 'images.uploadedBy', select: 'name username role' },
  { path: 'bookingId', select: 'bookingCode serviceType bookingSource problemImage createdAt device deviceBrand deviceModel' },
  {
    path: 'amcContractId',
    select: 'contractId contractType coverageType coverParts coverService coverVisits coveredService coveredDevices deviceBrand deviceModel contractValue startDate endDate status includedVisits invoiceId',
    populate: { path: 'invoiceId', select: 'invoiceNumber total paidAmount balance status title notes' }
  },
  { path: 'invoiceId', select: 'invoiceNumber total paidAmount balance status title notes invoiceType parentInvoiceId adjustmentForInvoiceId adjustmentNumber adjustmentType adjustmentReason internalNote createdBy createdAt' }
];

const detailPopulateWorkOrder = [
  ...populateWorkOrder,
  {
    path: 'extraInvoices',
    select: 'invoiceNumber total paidAmount balance status title notes invoiceType parentInvoiceId adjustmentForInvoiceId adjustmentNumber adjustmentType adjustmentReason internalNote createdBy workOrderId amcContractId createdAt',
    populate: [
      { path: 'parentInvoiceId', select: 'invoiceNumber total paidAmount balance status invoiceType' },
      { path: 'createdBy', select: 'name username role' }
    ],
    options: { sort: { createdAt: -1 } }
  }
];

const pendingPartRequestStatuses = ['Pending', 'Requested', 'Reserved'];
const WORK_ORDER_PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];
const WORK_ORDER_IMAGE_TYPES = ['customer_problem', 'before_service', 'after_service'];
const TRASH_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const WORK_ORDER_LIFECYCLE_AUDIT_ACTIONS = [
  'work_order_archived',
  'work_order_moved_to_trash',
  'work_order_restored',
  'work_order_permanently_deleted'
];
const WORK_ORDER_CREATION_TIMELINE_MESSAGES = [
  'Work order created',
  'Booking converted to work order',
  'AMC visit converted to service job'
];
const WORK_ORDER_HISTORY_STATUSES = ['In Progress', 'Awaiting Parts', 'Completed', 'Delivered', 'Returned'];
const INVOICE_HISTORY_STATUSES = ['Pending', 'Partial', 'Paid', 'Void'];

function isAdminUser(user) {
  const role = normalizeRole(user?.role);
  return role === 'admin' || role === 'super_admin';
}

function trashExpiryFrom(date) {
  return new Date(date.getTime() + TRASH_RETENTION_DAYS * DAY_MS);
}

function trashDaysLeft(deleteExpiresAt) {
  if (!deleteExpiresAt) return null;
  const expiresAt = new Date(deleteExpiresAt);
  if (Number.isNaN(expiresAt.getTime())) return null;
  return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / DAY_MS));
}

function workOrderLifecycleState(workOrder = {}) {
  if (workOrder.isDeleted) return 'trash';
  if (workOrder.archivedAt) return 'archived';
  return 'active';
}

function workOrderLifecycleFilter(query = {}, user = null) {
  if (!isAdminUser(user)) return { isDeleted: { $ne: true }, archivedAt: null };
  const lifecycle = clean(query.lifecycle || query.archiveStatus).toLowerCase();
  if (lifecycle === 'archived') return { isDeleted: { $ne: true }, archivedAt: { $type: 'date' } };
  if (lifecycle === 'trash') return { isDeleted: true };
  if (lifecycle === 'all') return {};
  return { isDeleted: { $ne: true }, archivedAt: null };
}

function isCreationTimelineEntry(entry = {}) {
  const message = clean(entry.message);
  return WORK_ORDER_CREATION_TIMELINE_MESSAGES.includes(message);
}

function meaningfulTimelineCount(workOrder = {}) {
  return (workOrder.timeline || []).filter((entry) => !isCreationTimelineEntry(entry)).length;
}

function emptyWorkOrderLinkedSummary(workOrder = {}) {
  const invoiceStatus = clean(workOrder.invoiceId?.status || workOrder.invoiceStatus);
  return {
    bookingCount: workOrder.bookingId ? 1 : 0,
    invoiceCount: workOrder.invoiceId ? 1 : 0,
    invoiceStatusCount: INVOICE_HISTORY_STATUSES.includes(invoiceStatus) ? 1 : 0,
    paymentCount: 0,
    amcCount: workOrder.amcContractId || workOrder.amcVisitId ? 1 : 0,
    partsUsageCount: (workOrder.partsUsed || []).length,
    partRequestCount: (workOrder.partRequests || []).length,
    photoCount: (workOrder.images || []).length,
    documentCount: (workOrder.documentsSent || []).length,
    noteCount: (workOrder.notes || []).length,
    serviceStatusCount: WORK_ORDER_HISTORY_STATUSES.includes(clean(workOrder.status)) ? 1 : 0,
    timelineCount: meaningfulTimelineCount(workOrder),
    auditCount: 0,
    hasLinkedRecords: false
  };
}

function finalizeWorkOrderLinkedSummary(summary) {
  summary.hasLinkedRecords = Boolean(
    summary.bookingCount
    || summary.invoiceCount
    || summary.invoiceStatusCount
    || summary.paymentCount
    || summary.amcCount
    || summary.partsUsageCount
    || summary.partRequestCount
    || summary.photoCount
    || summary.documentCount
    || summary.noteCount
    || summary.serviceStatusCount
    || summary.timelineCount
    || summary.auditCount
  );
  summary.message = summary.hasLinkedRecords
    ? 'Has linked payments/parts/history'
    : 'No linked records';
  return summary;
}

function serializeWorkOrderLifecycle(order, summary = null) {
  const lifecycleState = workOrderLifecycleState(order);
  const linkedRecordSummary = finalizeWorkOrderLinkedSummary(summary || emptyWorkOrderLinkedSummary(order));
  const lifecycleAction = lifecycleState === 'active'
    ? 'archive'
    : lifecycleState === 'trash'
      ? 'restore'
      : 'restore';
  return {
    lifecycleState,
    lifecycleAction,
    linkedRecordSummary,
    canMoveToTrash: lifecycleState !== 'trash',
    canArchive: lifecycleState === 'active',
    canRestore: lifecycleState !== 'active',
    trashDaysLeft: lifecycleState === 'trash' ? trashDaysLeft(order.deleteExpiresAt) : null
  };
}

async function workOrderLinkedRecordSummaries(workOrders = []) {
  const rows = workOrders.map((order) => (typeof order.toObject === 'function' ? order.toObject() : order));
  const ids = rows.map((order) => order._id).filter(Boolean);
  const summaries = new Map(rows.map((order) => [String(order._id), emptyWorkOrderLinkedSummary(order)]));
  if (!ids.length) return summaries;

  const directBookingToOrder = new Map();
  const directInvoiceToOrder = new Map();
  rows.forEach((order) => {
    if (order.bookingId) directBookingToOrder.set(String(order.bookingId?._id || order.bookingId), String(order._id));
    if (order.invoiceId) directInvoiceToOrder.set(String(order.invoiceId?._id || order.invoiceId), String(order._id));
  });

  const directBookingIds = [...directBookingToOrder.keys()].filter(validObjectId);
  const directInvoiceIds = [...directInvoiceToOrder.keys()].filter(validObjectId);

  const [bookings, invoices, amcContracts, documentRows, auditRows] = await Promise.all([
    Booking.find({
      $or: [
        { workOrderId: { $in: ids } },
        ...(directBookingIds.length ? [{ _id: { $in: directBookingIds } }] : [])
      ]
    }).select('_id workOrderId').lean(),
    Invoice.find({
      $or: [
        { workOrderId: { $in: ids } },
        ...(directInvoiceIds.length ? [{ _id: { $in: directInvoiceIds } }] : [])
      ]
    }).select('_id workOrderId').lean(),
    AMCContract.find({ 'visits.workOrderId': { $in: ids } }).select('_id visits.workOrderId').lean(),
    Document.aggregate([
      { $match: { workOrderId: { $in: ids } } },
      { $group: { _id: '$workOrderId', count: { $sum: 1 } } }
    ]),
    AuditLog.aggregate([
      {
        $match: {
          module: 'work_order',
          recordId: { $in: ids },
          action: { $nin: WORK_ORDER_LIFECYCLE_AUDIT_ACTIONS }
        }
      },
      { $group: { _id: '$recordId', count: { $sum: 1 } } }
    ])
  ]);

  bookings.forEach((booking) => {
    const orderId = String(booking.workOrderId || directBookingToOrder.get(String(booking._id)) || '');
    const summary = summaries.get(orderId);
    if (summary) summary.bookingCount = Math.max(summary.bookingCount, 1);
  });

  const invoiceToOrder = new Map();
  invoices.forEach((invoice) => {
    const orderId = String(invoice.workOrderId || directInvoiceToOrder.get(String(invoice._id)) || '');
    if (!orderId) return;
    invoiceToOrder.set(String(invoice._id), orderId);
    const summary = summaries.get(orderId);
    if (summary) summary.invoiceCount += 1;
  });

  const invoiceIds = invoices.map((invoice) => invoice._id).filter(Boolean);
  if (invoiceIds.length) {
    const paymentRows = await Payment.aggregate([
      { $match: { invoiceId: { $in: invoiceIds } } },
      { $group: { _id: '$invoiceId', count: { $sum: 1 } } }
    ]);
    paymentRows.forEach((row) => {
      const orderId = invoiceToOrder.get(String(row._id));
      const summary = summaries.get(orderId);
      if (summary) summary.paymentCount += Number(row.count || 0);
    });
  }

  amcContracts.forEach((contract) => {
    const seen = new Set();
    (contract.visits || []).forEach((visit) => {
      const orderId = String(visit.workOrderId || '');
      if (!summaries.has(orderId) || seen.has(orderId)) return;
      seen.add(orderId);
      summaries.get(orderId).amcCount += 1;
    });
  });

  documentRows.forEach((row) => {
    const summary = summaries.get(String(row._id));
    if (summary) summary.documentCount += Number(row.count || 0);
  });

  auditRows.forEach((row) => {
    const summary = summaries.get(String(row._id));
    if (summary) summary.auditCount += Number(row.count || 0);
  });

  summaries.forEach(finalizeWorkOrderLinkedSummary);
  return summaries;
}

function assertPartsUnlocked(workOrder) {
  if (workOrder.invoiceId) {
    throw appError(
      'Parts and service charge are locked because an invoice has already been generated. Unpaid invoices must be voided first; paid or partially paid invoices require payment reversal or an adjustment invoice.',
      403
    );
  }
}

function normalizePartChargeType(value) {
  const raw = clean(value);
  return raw === 'Covered under AMC' || raw === 'Covered By AMC' ? 'Covered under AMC' : 'Chargeable';
}

function isAutoPartChargeType(value) {
  const raw = clean(value);
  return !raw || raw === AUTO_AMC_PART_CHARGE_TYPE;
}

function partChargeTypeMode(value, mode) {
  if (clean(mode) === MANUAL_AMC_PART_CHARGE_MODE) return MANUAL_AMC_PART_CHARGE_MODE;
  return isAutoPartChargeType(value) ? AUTO_AMC_PART_CHARGE_MODE : MANUAL_AMC_PART_CHARGE_MODE;
}

function workOrderPartChargeType(workOrder, fallback) {
  if (workOrder?.amcContractId && isAutoPartChargeType(fallback)) return amcPartChargeType(workOrder.amcContractId);
  return normalizePartChargeType(fallback);
}

function syncAmcPartChargeTypes(workOrder) {
  if (!workOrder?.amcContractId) return;
  const chargeType = amcPartChargeType(workOrder.amcContractId);
  (workOrder.partsUsed || []).forEach((part) => {
    if (part.chargeTypeMode !== MANUAL_AMC_PART_CHARGE_MODE) part.chargeType = chargeType;
  });
}

function storedPartChargeType(workOrder, part) {
  if (workOrder?.amcContractId && part?.chargeTypeMode !== MANUAL_AMC_PART_CHARGE_MODE) return amcPartChargeType(workOrder.amcContractId);
  return normalizePartChargeType(part?.chargeType);
}

function findUsedInventoryRow(workOrder, inventoryPartId, chargeType = '') {
  if (!inventoryPartId) return null;
  const id = String(inventoryPartId);
  const normalizedChargeType = chargeType ? normalizePartChargeType(chargeType) : '';
  return workOrder.partsUsed.find((p) => {
    if (!p.inventoryPartId || String(p.inventoryPartId) !== id) return false;
    return !normalizedChargeType || storedPartChargeType(workOrder, p) === normalizedChargeType;
  }) || null;
}

function findUsedManualRowByName(workOrder, name, chargeType = '') {
  const norm = clean(name).toLowerCase();
  if (!norm) return null;
  const normalizedChargeType = chargeType ? normalizePartChargeType(chargeType) : '';
  return workOrder.partsUsed.find((p) => {
    if (p.inventoryPartId || clean(p.name).toLowerCase() !== norm) return false;
    return !normalizedChargeType || storedPartChargeType(workOrder, p) === normalizedChargeType;
  }) || null;
}

function normalizeWorkOrderPriority(value) {
  const raw = clean(value);
  if (!raw) return 'Normal';
  if (WORK_ORDER_PRIORITIES.includes(raw)) return raw;
  const aliases = { low: 'Low', normal: 'Normal', high: 'High', urgent: 'Urgent', medium: 'Normal', critical: 'Urgent' };
  return aliases[raw.toLowerCase()] || 'Normal';
}

function normalizeWorkOrderImageType(value, fallback = 'before_service') {
  const raw = clean(value).toLowerCase();
  if (WORK_ORDER_IMAGE_TYPES.includes(raw)) return raw;
  if (raw === 'customer' || raw === 'customer_problem_photo') return 'customer_problem';
  if (raw === 'before' || raw === 'before-service') return 'before_service';
  if (raw === 'after' || raw === 'after-service' || raw === 'completion') return 'after_service';
  return fallback;
}

function uploadedByRoleForUser(user) {
  const role = clean(user?.role).toLowerCase();
  if (role === 'technician') return 'technician';
  if (role === 'admin') return 'admin';
  return 'system';
}

function cleanDeviceDetail(value) {
  return clean(value).slice(0, 80);
}

async function releasePartReservation(inventoryPartId, quantity) {
  if (!inventoryPartId) return;
  const part = await InventoryPart.findById(inventoryPartId);
  if (!part) return;
  const qty = Math.max(1, numberValue(quantity, 1));
  syncPartAvailability(part);
  part.reserved = Math.max(0, part.reserved - qty);
  syncPartAvailability(part);
  await part.save();
}

function workOrderStockSource(workOrder) {
  return `WO-${String(workOrder._id).slice(-6).toUpperCase()}`;
}

async function assertInventoryStockAvailable(inventoryPartId, quantity) {
  const qty = Math.max(1, numberValue(quantity, 1));
  const part = await InventoryPart.findById(inventoryPartId);
  if (!part) throw appError('Inventory part not found', 404);
  syncPartAvailability(part);
  if (part.available < qty) throw appError('Not enough available stock', 400);
  return part;
}

async function deductPartsUsedStock({ workOrder, inventoryPartId, workOrderPartId, name, quantity, user }) {
  const qty = Math.max(1, numberValue(quantity, 1));
  await assertInventoryStockAvailable(inventoryPartId, qty);
  await applyStockMovement({
    partId: inventoryPartId,
    type: 'USED',
    quantity: qty,
    source: workOrderStockSource(workOrder),
    sourceId: workOrder._id,
    sourceType: 'WorkOrder',
    note: `Parts Used: ${workOrder.device || name}`,
    userId: user._id
  });
  if (workOrderPartId) {
    await allocatePurchaseUsage({
      inventoryPartId,
      workOrderId: workOrder._id,
      workOrderPartId,
      quantity: qty,
      userId: user._id
    });
  }
  workOrder.timeline.push({
    status: workOrder.status,
    message: `Stock deducted: ${name} x${qty} added to Parts Used`,
    userId: user._id
  });
}

async function restorePartsUsedStock({ workOrder, inventoryPartId, workOrderPartId, name, quantity, user }) {
  const qty = Math.max(1, numberValue(quantity, 1));
  await applyStockMovement({
    partId: inventoryPartId,
    type: 'RETURN',
    quantity: qty,
    source: workOrderStockSource(workOrder),
    sourceId: workOrder._id,
    sourceType: 'WorkOrder',
    note: `Parts Used: ${workOrder.device || name}`,
    userId: user._id
  });
  if (workOrderPartId) {
    await releasePurchaseUsage({
      inventoryPartId,
      workOrderId: workOrder._id,
      workOrderPartId,
      quantity: qty
    });
  }
  workOrder.timeline.push({
    status: workOrder.status,
    message: `Stock restored: ${name} x${qty} removed from Parts Used`,
    userId: user._id
  });
}

function markPartStockDeducted(partRow) {
  partRow.stockDeducted = true;
  partRow.stockDeductedAt = new Date();
}

export async function createWorkOrder(payload, user) {
  assertPermission(user, 'create_work_order');
  let sourceBooking = null;
  let customerId = payload.customerId;
  let serviceType = clean(payload.serviceType);
  let bookingSource = clean(payload.bookingSource || payload.source);
  let device = clean(payload.device);
  let deviceBrand = cleanDeviceDetail(payload.deviceBrand || payload.brand || payload.deviceBrandModel || payload.brandModel || '');
  let deviceModel = cleanDeviceDetail(payload.deviceModel || payload.model || '');
  let issue = clean(payload.issue);
  let technicianId = payload.technicianId || null;

  if (payload.bookingId) {
    sourceBooking = await Booking.findById(payload.bookingId);
    if (!sourceBooking) throw appError('Booking not found', 404);
    if (sourceBooking.workOrderId) throw appError('Booking is already converted to a work order', 409);
    customerId = sourceBooking.customerId;
    serviceType = sourceBooking.serviceType || serviceType;
    bookingSource = sourceBooking.bookingSource || bookingSource;
    device = sourceBooking.device;
    deviceBrand = sourceBooking.deviceBrand || deviceBrand;
    deviceModel = sourceBooking.deviceModel || deviceModel;
    issue = sourceBooking.issue;
    technicianId = payload.technicianId || sourceBooking.technicianId;
  }

  const customer = await Customer.findById(customerId);
  if (!customer) throw appError('Customer not found', 404);

  if (technicianId) {
    const technician = await User.findOne({ _id: technicianId, role: 'technician', active: true });
    if (!technician) throw appError('Select a valid active technician');
  }

  const status = technicianId ? 'In Progress' : 'Pending';
  const bookingImages = sourceBooking?.problemImage?.url
    ? [{
        type: 'customer_problem',
        url: sourceBooking.problemImage.url,
        filename: sourceBooking.problemImage.filename || 'booking-problem-image',
        originalName: sourceBooking.problemImage.originalName || '',
        mimetype: sourceBooking.problemImage.mimetype || '',
        size: sourceBooking.problemImage.size || 0,
        uploadedByRole: 'customer',
        uploadedAt: sourceBooking.createdAt || new Date()
      }]
    : [];
  const workOrder = await WorkOrder.create({
    bookingId: sourceBooking?._id || null,
    amcContractId: payload.amcContractId || null,
    amcVisitId: payload.amcVisitId || null,
    customerId,
    serviceType,
    bookingSource,
    device,
    deviceBrand,
    deviceModel,
    issue,
    technicianId,
    status,
    priority: normalizeWorkOrderPriority(payload.priority),
    images: bookingImages,
    timeline: [{ status, message: sourceBooking ? 'Booking converted to work order' : payload.amcContractId ? 'AMC visit converted to service job' : 'Work order created', userId: user._id }]
  });

  if (sourceBooking) {
    sourceBooking.status = 'Converted';
    sourceBooking.workOrderId = workOrder._id;
    await sourceBooking.save();
  }

  if (technicianId) {
    await createNotification({
      title: 'Work order assigned',
      message: `${device} work order assigned to you.`,
      type: 'WORK_ORDER',
      role: 'technician',
      userId: technicianId,
      sourceId: workOrder._id
    });
  }

  return getWorkOrder(workOrder._id, user);
}

export async function listWorkOrders(query, user) {
  const baseFilter = {};
  const clauses = [];
  const { page, limit, skip } = parsePagination(query);
  if (clean(query.status)) baseFilter.status = clean(query.status);
  if (clean(query.priority)) baseFilter.priority = clean(query.priority);
  if (clean(query.serviceType)) baseFilter.serviceType = searchRegex(query.serviceType);
  if (clean(query.source)) {
    const source = searchRegex(query.source);
    clauses.push({ $or: [{ bookingSource: source }, { source }, { channel: source }] });
  }
  if (clean(query.technicianId).toLowerCase() === 'admin') baseFilter.technicianId = null;
  else if (validObjectId(query.technicianId)) baseFilter.technicianId = validObjectId(query.technicianId);
  if (validObjectId(query.customerId)) baseFilter.customerId = validObjectId(query.customerId);
  const technicianScope = technicianWorkOrderScope(user);
  if (technicianScope) clauses.push(technicianScope);
  addDateRange(baseFilter, query);

  const search = clean(query.search);
  const regex = searchRegex(search);
  if (regex) {
    const [customers, technicians] = await Promise.all([
      Customer.find({ $or: [{ name: regex }, { phone: regex }] }).select('_id').limit(1000).lean(),
      User.find({ $or: [{ name: regex }, { username: regex }], role: 'technician' }).select('_id').limit(1000).lean()
    ]);
    const searchFields = [
      { device: regex },
      { deviceBrand: regex },
      { deviceModel: regex },
      { issue: regex },
      { serviceType: regex },
      { status: regex },
      { bookingSource: regex },
      { customerId: { $in: customers.map((item) => item._id) } },
      { technicianId: { $in: technicians.map((item) => item._id) } }
    ];
    const objectId = validObjectId(search);
    if (objectId) searchFields.push({ _id: objectId });
    clauses.push({ $or: searchFields });
  }
  if (clauses.length) baseFilter.$and = clauses;

  const filter = { ...baseFilter, ...workOrderLifecycleFilter(query, user) };
  const lifecycleCountQueries = {
    active: { ...baseFilter, ...workOrderLifecycleFilter({ lifecycle: 'active' }, user) },
    archived: { ...baseFilter, ...workOrderLifecycleFilter({ lifecycle: 'archived' }, user) },
    trash: { ...baseFilter, ...workOrderLifecycleFilter({ lifecycle: 'trash' }, user) },
    all: { ...baseFilter, ...workOrderLifecycleFilter({ lifecycle: 'all' }, user) }
  };

  const [total, rows, activeCount, archivedCount, trashCount, allCount] = await Promise.all([
    WorkOrder.countDocuments(filter),
    WorkOrder.find(filter).populate(populateWorkOrder).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    WorkOrder.countDocuments(lifecycleCountQueries.active),
    WorkOrder.countDocuments(lifecycleCountQueries.archived),
    WorkOrder.countDocuments(lifecycleCountQueries.trash),
    WorkOrder.countDocuments(lifecycleCountQueries.all)
  ]);
  const linkedSummaries = await workOrderLinkedRecordSummaries(rows);
  const workOrders = rows.map((order) => {
    const lifecycle = serializeWorkOrderLifecycle(order, linkedSummaries.get(String(order._id)));
    return {
      ...withNestedIds(order, ['customerId', 'technicianId', 'bookingId', 'amcContractId', 'invoiceId']),
      ...lifecycle
    };
  });
  return {
    workOrders,
    pagination: paginationMeta(page, limit, total),
    lifecycleCounts: {
      active: activeCount,
      archived: archivedCount,
      trash: trashCount,
      all: allCount
    }
  };
}

export async function getWorkOrder(id, user) {
  const workOrder = await WorkOrder.findById(id).populate(detailPopulateWorkOrder);
  if (!workOrder) throw appError('Work order not found', 404);
  if (!isAdminUser(user) && (workOrder.isDeleted || workOrder.archivedAt)) throw appError('Work order not found', 404);
  if (!technicianCanAccessWorkOrder(workOrder, user)) throw appError('Work order not found', 404);
  return workOrder;
}

export async function updateStatus(id, payload, user) {
  assertPermission(user, 'update_work_order_status');
  const status = clean(payload.status);
  if (!['Pending', 'In Progress', 'Awaiting Parts', 'Completed', 'Delivered', 'Returned'].includes(status)) throw appError('Invalid status');
  const workOrder = await getWorkOrder(id, user);
  const oldStatus = workOrder.status;
  if (user.role === 'technician' && ['Completed', 'Delivered', 'Returned'].includes(oldStatus) && ['Pending', 'In Progress', 'Awaiting Parts'].includes(status)) {
    throw appError('Technicians cannot move a completed work order back to an active status', 403);
  }
  const before = { status: workOrder.status, completedAt: workOrder.completedAt };
  workOrder.status = status;
  if (status === 'Completed' && !workOrder.completedAt) {
    workOrder.completedAt = new Date();
  }
  const actor = user.name || user.username || 'Team member';
  const reason = clean(payload.message);
  const message = `Status changed from ${oldStatus} to ${status} by ${actor}.${reason ? ` Reason: ${reason}` : ''}`;
  workOrder.timeline.push({ status, message, userId: user._id });
  await workOrder.save();
  await logAudit({ userId: user._id, action: 'status_changed', module: 'work_order', recordId: workOrder._id, before, after: { status, completedAt: workOrder.completedAt } });
  return getWorkOrder(id, user);
}

export async function updateServiceCharge(id, payload, user) {
  assertPermission(user, 'edit_service_charge');
  const workOrder = await getWorkOrder(id, user);
  assertPartsUnlocked(workOrder);
  const serviceCharge = Math.max(0, numberValue(payload.serviceCharge, 0));
  const before = { serviceCharge: workOrder.serviceCharge };
  workOrder.serviceCharge = serviceCharge;
  workOrder.timeline.push({ status: workOrder.status, message: `Service charge updated to ${serviceCharge}`, userId: user._id });
  await workOrder.save();
  await logAudit({ userId: user._id, action: 'service_charge_updated', module: 'work_order', recordId: workOrder._id, before, after: { serviceCharge } });
  return getWorkOrder(id, user);
}

export async function updatePriority(id, payload, user) {
  assertPermission(user, 'edit_work_order', 'You do not have permission to change job priority');
  const priority = normalizeWorkOrderPriority(payload.priority);
  const workOrder = await getWorkOrder(id, user);
  const before = { priority: workOrder.priority || 'Normal' };
  workOrder.priority = priority;
  const actor = user.name || user.username || 'Admin';
  workOrder.timeline.push({
    status: workOrder.status,
    message: `Priority changed to ${priority} by ${actor}`,
    userId: user._id
  });
  await workOrder.save();
  await logAudit({
    userId: user._id,
    action: 'priority_changed',
    module: 'work_order',
    recordId: workOrder._id,
    before,
    after: { priority }
  });
  return getWorkOrder(id, user);
}

export async function addNote(id, payload, user) {
  assertPermission(user, 'add_notes');
  const text = clean(payload.text || payload.note);
  if (!text) throw appError('Note text is required');
  const workOrder = await getWorkOrder(id, user);
  workOrder.notes.push({ text, userId: user._id });
  workOrder.timeline.push({ status: workOrder.status, message: 'Technician note added', userId: user._id });
  await workOrder.save();
  return getWorkOrder(id, user);
}

export async function addPart(id, payload, user) {
  assertPermission(user, 'manage_parts_used');
  const workOrder = await getWorkOrder(id, user);
  assertPartsUnlocked(workOrder);
  syncAmcPartChargeTypes(workOrder);
  const quantity = Math.max(1, numberValue(payload.quantity, 1));
  let name = clean(payload.name || payload.partName);
  let unitPrice = numberValue(payload.unitPrice || payload.price, 0);
  let inventoryPartId = payload.inventoryPartId || null;
  const chargeType = workOrderPartChargeType(workOrder, payload.chargeType);
  const chargeTypeMode = workOrder?.amcContractId ? partChargeTypeMode(payload.chargeType, payload.chargeTypeMode) : MANUAL_AMC_PART_CHARGE_MODE;
  const mergeDupInv = Boolean(payload.mergeDuplicateInventory);
  const mergeDupMan = Boolean(payload.mergeDuplicateManual);
  const allowDupManLine = Boolean(payload.allowDuplicateManualLine);

  if (inventoryPartId) {
    const part = await InventoryPart.findById(inventoryPartId);
    if (!part) throw appError('Inventory part not found', 404);
    name = name || part.partName;
    unitPrice = unitPrice || part.sellingPrice;
  }

  if (!name) throw appError('Part name is required');

  let merged = false;
  let stockQtyToDeduct = 0;

  if (inventoryPartId) {
    const existing = findUsedInventoryRow(workOrder, inventoryPartId, chargeType);
    if (existing) {
      if (!mergeDupInv) {
        throw appError('This part is already in Parts Used. Confirm to increase quantity instead.', 409);
      }
      stockQtyToDeduct = existing.stockDeducted ? quantity : Math.max(1, numberValue(existing.quantity, 1)) + quantity;
      existing.quantity += quantity;
      existing.total = existing.quantity * numberValue(existing.unitPrice, 0);
      merged = true;
    } else {
      stockQtyToDeduct = quantity;
      workOrder.partsUsed.push({
        inventoryPartId,
        name,
        quantity,
        unitPrice,
        total: quantity * unitPrice,
        chargeType,
        chargeTypeMode,
        source: workOrderStockSource(workOrder),
        addedAt: new Date(),
        stockDeducted: false
      });
    }
  } else {
    const existingManual = findUsedManualRowByName(workOrder, name, chargeType);
    if (existingManual) {
      if (mergeDupMan) {
        existingManual.quantity += quantity;
        existingManual.total = existingManual.quantity * numberValue(existingManual.unitPrice, 0);
        merged = true;
      } else if (allowDupManLine) {
        workOrder.partsUsed.push({ inventoryPartId: null, name, quantity, unitPrice, total: quantity * unitPrice, chargeType, chargeTypeMode, source: 'Manual', addedAt: new Date() });
      } else {
        throw appError('A manual part with this name already exists. Add as separate line or increase quantity.', 409);
      }
    } else {
      workOrder.partsUsed.push({ inventoryPartId: null, name, quantity, unitPrice, total: quantity * unitPrice, chargeType, chargeTypeMode, source: 'Manual', addedAt: new Date(), stockDeducted: false });
    }
  }

  if (inventoryPartId && stockQtyToDeduct > 0) {
    const row = findUsedInventoryRow(workOrder, inventoryPartId, chargeType);
    await deductPartsUsedStock({ workOrder, inventoryPartId, workOrderPartId: row?._id, name, quantity: stockQtyToDeduct, user });
    if (row) markPartStockDeducted(row);
  }

  workOrder.timeline.push({
    status: workOrder.status,
    message: merged ? `Part quantity increased: ${name} (+${quantity}, ${chargeType})` : `Part added: ${name} (${chargeType})`,
    userId: user._id
  });
  await workOrder.save();
  await logAudit({ userId: user._id, action: 'part_used', module: 'work_order', recordId: workOrder._id, after: { name, quantity, chargeType, chargeTypeMode, merged } });
  return getWorkOrder(id, user);
}

export async function updatePart(id, partId, payload, user) {
  assertPermission(user, 'manage_parts_used');
  const workOrder = await getWorkOrder(id, user);
  assertPartsUnlocked(workOrder);
  syncAmcPartChargeTypes(workOrder);
  const part = workOrder.partsUsed.id(partId);
  if (!part) throw appError('Part not found', 404);

  const oldQty = Math.max(1, numberValue(part.quantity, 1));
  const newQty = payload.quantity !== undefined ? Math.max(1, numberValue(payload.quantity, 1)) : oldQty;
  const newUnitPrice =
    payload.unitPrice !== undefined ? Math.max(0, numberValue(payload.unitPrice, part.unitPrice)) : numberValue(part.unitPrice, 0);

  if (!part.inventoryPartId && payload.name !== undefined) {
    const nextName = clean(payload.name);
    if (!nextName) throw appError('Part name is required');
    part.name = nextName;
  }
  if (payload.note !== undefined) {
    part.note = clean(payload.note);
  }
  if (payload.chargeType !== undefined) {
    part.chargeType = workOrderPartChargeType(workOrder, payload.chargeType);
    part.chargeTypeMode = workOrder?.amcContractId ? partChargeTypeMode(payload.chargeType, payload.chargeTypeMode) : MANUAL_AMC_PART_CHARGE_MODE;
  }

  const isInventory = Boolean(part.inventoryPartId);
  if (isInventory && part.stockDeducted) {
    const delta = newQty - oldQty;
    if (delta > 0) {
      await deductPartsUsedStock({
        workOrder,
        inventoryPartId: part.inventoryPartId,
        workOrderPartId: part._id,
        name: part.name,
        quantity: delta,
        user
      });
    } else if (delta < 0) {
      await restorePartsUsedStock({
        workOrder,
        inventoryPartId: part.inventoryPartId,
        workOrderPartId: part._id,
        name: part.name,
        quantity: -delta,
        user
      });
    }
  }

  part.quantity = newQty;
  part.unitPrice = newUnitPrice;
  part.total = newQty * newUnitPrice;
  workOrder.timeline.push({
    status: workOrder.status,
    message: `Part updated: ${part.name} (qty ${newQty}, unit ${newUnitPrice}, ${normalizePartChargeType(part.chargeType)})`,
    userId: user._id
  });
  await workOrder.save();
  await logAudit({
    userId: user._id,
    action: 'part_updated',
    module: 'work_order',
    recordId: workOrder._id,
    after: { partId, name: part.name, quantity: newQty, unitPrice: newUnitPrice, chargeType: normalizePartChargeType(part.chargeType) }
  });
  return getWorkOrder(id, user);
}

export async function removePart(id, partId, user) {
  assertPermission(user, 'manage_parts_used');
  const workOrder = await getWorkOrder(id, user);
  assertPartsUnlocked(workOrder);
  syncAmcPartChargeTypes(workOrder);
  const part = workOrder.partsUsed.id(partId);
  if (!part) throw appError('Part not found', 404);
  const before = { name: part.name, quantity: part.quantity, total: part.total };
  if (part.inventoryPartId && part.stockDeducted) {
    await restorePartsUsedStock({
      workOrder,
      inventoryPartId: part.inventoryPartId,
      workOrderPartId: part._id,
      name: part.name,
      quantity: part.quantity,
      user
    });
  }
  part.deleteOne();
  workOrder.timeline.push({ status: workOrder.status, message: `Part removed: ${before.name}`, userId: user._id });
  await workOrder.save();
  await logAudit({ userId: user._id, action: 'part_removed', module: 'work_order', recordId: workOrder._id, before });
  return getWorkOrder(id, user);
}

export async function requestPart(id, payload, user) {
  assertPermission(user, 'create_part_request');
  const workOrder = await getWorkOrder(id, user);
  const quantity = Math.max(1, numberValue(payload.quantity, 1));
  let name = clean(payload.name || payload.partName);
  const inventoryPartId = payload.inventoryPartId || null;

  if (inventoryPartId) {
    const part = await InventoryPart.findById(inventoryPartId);
    if (!part) throw appError('Inventory part not found', 404);
    name = name || part.partName;
  }

  if (!name) throw appError('Part name is required');
  workOrder.partRequests.push({
    inventoryPartId,
    name,
    quantity,
    status: 'Pending',
    note: clean(payload.note),
    userId: user._id
  });
  workOrder.status = 'Awaiting Parts';
  workOrder.timeline.push({ status: 'Awaiting Parts', message: `Part requested: ${name}`, userId: user._id });
  await workOrder.save();
  await logAudit({ userId: user._id, action: 'part_requested', module: 'work_order', recordId: workOrder._id, after: { name, quantity } });

  await createNotification({
    title: 'Parts requested',
    message: `${user.name} requested ${quantity} ${name}.`,
    type: 'WORK_ORDER',
    role: 'admin',
    sourceId: workOrder._id
  });

  return getWorkOrder(id, user);
}

export async function approvePartRequest(id, requestId, user) {
  assertPermission(user, 'approve_part_requests', 'You do not have permission to approve part requests');
  const workOrder = await getWorkOrder(id, user);
  const partRequest = workOrder.partRequests.id(requestId);
  if (!partRequest) throw appError('Part request not found', 404);
  if (!pendingPartRequestStatuses.includes(partRequest.status)) {
    throw appError('Only pending part requests can be approved', 400);
  }

  if (partRequest.status === 'Reserved') {
    await releasePartReservation(partRequest.inventoryPartId, partRequest.quantity);
  }

  const adminName = user.name || user.username || 'Admin';
  partRequest.status = 'Approved';
  partRequest.approvedBy = user._id;
  partRequest.approvedAt = new Date();
  workOrder.timeline.push({
    status: workOrder.status,
    message: `Part request approved: ${partRequest.name} x${partRequest.quantity} by ${adminName}`,
    userId: user._id
  });
  await workOrder.save();
  await logAudit({
    userId: user._id,
    action: 'part_request_approved',
    module: 'work_order',
    recordId: workOrder._id,
    after: { requestId, name: partRequest.name, quantity: partRequest.quantity }
  });
  return getWorkOrder(id, user);
}

export async function rejectPartRequest(id, requestId, payload, user) {
  assertPermission(user, 'approve_part_requests', 'You do not have permission to reject part requests');
  const reason = clean(payload.reason || payload.rejectionReason || payload.note);
  if (!reason) throw appError('Rejection reason is required');
  const workOrder = await getWorkOrder(id, user);
  const partRequest = workOrder.partRequests.id(requestId);
  if (!partRequest) throw appError('Part request not found', 404);
  if (!pendingPartRequestStatuses.includes(partRequest.status)) {
    throw appError('Only pending part requests can be rejected', 400);
  }

  if (partRequest.status === 'Reserved') {
    await releasePartReservation(partRequest.inventoryPartId, partRequest.quantity);
  }

  const adminName = user.name || user.username || 'Admin';
  partRequest.status = 'Rejected';
  partRequest.rejectionReason = reason;
  partRequest.rejectedBy = user._id;
  partRequest.rejectedAt = new Date();
  workOrder.timeline.push({
    status: workOrder.status,
    message: `Part request rejected: ${partRequest.name} x${partRequest.quantity}. Reason: ${reason}`,
    userId: user._id
  });
  await workOrder.save();
  await logAudit({
    userId: user._id,
    action: 'part_request_rejected',
    module: 'work_order',
    recordId: workOrder._id,
    after: { requestId, name: partRequest.name, quantity: partRequest.quantity, reason }
  });
  return getWorkOrder(id, user);
}

export async function movePartRequestToUsed(id, requestId, user, payload = {}) {
  assertPermission(user, 'approve_part_requests', 'You do not have permission to move approved parts');
  assertPermission(user, 'manage_parts_used', 'You do not have permission to move approved parts');
  const workOrder = await getWorkOrder(id, user);
  assertPartsUnlocked(workOrder);
  syncAmcPartChargeTypes(workOrder);
  const partRequest = workOrder.partRequests.id(requestId);
  if (!partRequest) throw appError('Part request not found', 404);

  if (partRequest.status === 'Moved to Parts Used' || partRequest.status === 'Fulfilled') {
    throw appError('This request was already moved to Parts Used.', 400);
  }
  if (partRequest.status !== 'Approved') {
    throw appError('Only approved part requests can be moved to Parts Used', 400);
  }

  let unitPrice = 0;
  const timelineBits = [];

  if (partRequest.inventoryPartId) {
    const inventoryPart = await InventoryPart.findById(partRequest.inventoryPartId);
    if (!inventoryPart) throw appError('Inventory part not found', 404);
    unitPrice = numberValue(inventoryPart.sellingPrice, 0);
  } else {
    const raw = payload?.unitPrice;
    if (raw === undefined || raw === null || String(raw).trim() === '') {
      throw appError('Unit price is required for manual or outside parts', 400);
    }
    unitPrice = Number(raw);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw appError('Unit price must be a number greater than or equal to 0', 400);
    }
    if (unitPrice === 0) {
      const zeroReason = clean(payload.zeroPriceReason || payload.zeroPriceNote || '');
      if (!zeroReason) {
        throw appError('Reason is required when unit price is ₹0 (free, warranty, or customer-provided part)', 400);
      }
      timelineBits.push(`₹0: ${zeroReason}`);
    }
    const moveNote = clean(payload.note || '');
    if (moveNote) timelineBits.push(`Note: ${moveNote}`);
  }

  const quantity = Math.max(1, numberValue(partRequest.quantity, 1));
  const chargeType = workOrderPartChargeType(workOrder, payload.chargeType);
  const chargeTypeMode = workOrder?.amcContractId ? partChargeTypeMode(payload.chargeType, payload.chargeTypeMode) : MANUAL_AMC_PART_CHARGE_MODE;
  const mergeDupInv = Boolean(payload.mergeDuplicateInventory);
  const mergeDupMan = Boolean(payload.mergeDuplicateManual);
  const allowDupManLine = Boolean(payload.allowDuplicateManualLine);

  let merged = false;
  let stockQtyToDeduct = 0;
  const invPartId = partRequest.inventoryPartId || null;

  if (invPartId) {
    const existing = findUsedInventoryRow(workOrder, invPartId, chargeType);
    if (existing) {
      if (!mergeDupInv) {
        throw appError('This part is already in Parts Used. Confirm to increase quantity instead.', 409);
      }
      stockQtyToDeduct = existing.stockDeducted ? quantity : Math.max(1, numberValue(existing.quantity, 1)) + quantity;
      existing.quantity += quantity;
      existing.total = existing.quantity * numberValue(existing.unitPrice, 0);
      merged = true;
    } else {
      stockQtyToDeduct = quantity;
      workOrder.partsUsed.push({
        inventoryPartId: invPartId,
        name: partRequest.name,
        quantity,
        unitPrice,
        total: quantity * unitPrice,
        chargeType,
        chargeTypeMode,
        source: workOrderStockSource(workOrder),
        addedAt: new Date(),
        stockDeducted: false
      });
    }
  } else {
    const existingManual = findUsedManualRowByName(workOrder, partRequest.name, chargeType);
    if (existingManual) {
      if (mergeDupMan) {
        existingManual.quantity += quantity;
        existingManual.total = existingManual.quantity * numberValue(existingManual.unitPrice, 0);
        merged = true;
      } else if (allowDupManLine) {
        workOrder.partsUsed.push({
          inventoryPartId: null,
          name: partRequest.name,
          quantity,
          unitPrice,
          total: quantity * unitPrice,
          chargeType,
          chargeTypeMode,
          source: 'Manual',
          addedAt: new Date()
        });
      } else {
        throw appError('A manual part with this name already exists. Add as separate line or increase quantity.', 409);
      }
    } else {
      workOrder.partsUsed.push({
        inventoryPartId: null,
        name: partRequest.name,
        quantity,
        unitPrice,
        total: quantity * unitPrice,
        chargeType,
        chargeTypeMode,
        source: 'Manual',
        addedAt: new Date()
      });
    }
  }

  if (invPartId && stockQtyToDeduct > 0) {
    await deductPartsUsedStock({
      workOrder,
      inventoryPartId: invPartId,
      name: partRequest.name,
      quantity: stockQtyToDeduct,
      user
    });
    const row = findUsedInventoryRow(workOrder, invPartId, chargeType);
    if (row) markPartStockDeducted(row);
  }

  partRequest.status = 'Moved to Parts Used';
  partRequest.movedAt = new Date();
  const timelineSuffix = timelineBits.length ? ` — ${timelineBits.join('; ')}` : '';
  workOrder.timeline.push({
    status: workOrder.status,
    message: `${merged ? 'Approved part merged into Parts Used' : 'Approved part moved to Parts Used'}: ${partRequest.name} x${quantity} (${chargeType})${timelineSuffix}`,
    userId: user._id
  });
  await workOrder.save();
  await logAudit({
    userId: user._id,
    action: 'part_request_moved_to_used',
    module: 'work_order',
    recordId: workOrder._id,
    after: { requestId, name: partRequest.name, quantity, unitPrice, chargeType, chargeTypeMode, inventoryPartId: partRequest.inventoryPartId || null, merged }
  });
  return getWorkOrder(id, user);
}

export async function autoAssignWorkOrder(id, user) {
  assertPermission(user, 'assign_technician');
  const workOrder = await WorkOrder.findById(id);
  if (!workOrder) throw appError('Work order not found', 404);
  if (workOrder.technicianId) throw appError('Work order already has an assigned technician', 409);

  const technicians = await User.find({ role: 'technician', active: true }).sort({ name: 1 });
  if (!technicians.length) throw appError('No active technicians available');

  const workloads = await Promise.all(technicians.map(async (technician) => ({
    technician,
    activeJobs: await WorkOrder.countDocuments({ technicianId: technician._id, status: { $in: ['Pending', 'In Progress', 'Awaiting Parts'] } })
  })));
  workloads.sort((a, b) => a.activeJobs - b.activeJobs || a.technician.name.localeCompare(b.technician.name));
  const selected = workloads[0].technician;

  const before = { technicianId: null, status: workOrder.status };
  workOrder.technicianId = selected._id;
  if (workOrder.status === 'Pending') workOrder.status = 'In Progress';
  workOrder.timeline.push({ status: workOrder.status, message: `Auto-assigned to ${selected.name}`, userId: user._id });
  await workOrder.save();

  await createNotification({
    title: 'Work order assigned',
    message: `${workOrder.device} work order assigned to you.`,
    type: 'WORK_ORDER',
    role: 'technician',
    userId: selected._id,
    sourceId: workOrder._id
  });
  await logAudit({
    userId: user._id,
    action: 'auto_assigned',
    module: 'work_order',
    recordId: workOrder._id,
    before,
    after: { technicianId: selected._id, technicianName: selected.name, status: workOrder.status }
  });

  return getWorkOrder(id, user);
}

export async function updateAssignment(id, payload, user) {
  assertPermission(user, 'assign_technician', 'You do not have permission to assign work orders');
  const workOrder = await WorkOrder.findById(id);
  if (!workOrder) throw appError('Work order not found', 404);

  const rawTechnicianId = clean(payload.technicianId);
  const before = { technicianId: workOrder.technicianId || null, status: workOrder.status };
  let nextTechnician = null;

  if (rawTechnicianId) {
    const technicianId = validObjectId(rawTechnicianId);
    if (!technicianId) throw appError('Select a valid active technician');
    nextTechnician = await User.findOne({ _id: technicianId, role: 'technician', active: true });
    if (!nextTechnician) throw appError('Select a valid active technician');
    workOrder.technicianId = nextTechnician._id;
    if (workOrder.status === 'Pending') workOrder.status = 'In Progress';
  } else {
    workOrder.technicianId = null;
  }

  workOrder.timeline.push({
    status: workOrder.status,
    message: nextTechnician ? `Assigned to ${nextTechnician.name}` : 'Assigned to Admin',
    userId: user._id
  });
  await workOrder.save();

  if (nextTechnician) {
    await createNotification({
      title: 'Work order assigned',
      message: `${workOrder.device} work order assigned to you.`,
      type: 'WORK_ORDER',
      role: 'technician',
      userId: nextTechnician._id,
      sourceId: workOrder._id
    });
  }

  await logAudit({
    userId: user._id,
    action: 'assigned',
    module: 'work_order',
    recordId: workOrder._id,
    before,
    after: {
      technicianId: nextTechnician?._id || null,
      technicianName: nextTechnician?.name || 'Admin',
      status: workOrder.status
    }
  });

  return getWorkOrder(id, user);
}

export async function archiveWorkOrder(id, user) {
  assertPermission(user, 'delete_work_order', 'You do not have permission to archive work orders');
  const workOrder = await WorkOrder.findById(id);
  if (!workOrder) throw appError('Work order not found', 404);
  if (workOrder.isDeleted) throw appError('Restore the work order before archiving it', 409);
  if (workOrder.archivedAt) throw appError('Work order is already archived', 409);

  const linkedSummaries = await workOrderLinkedRecordSummaries([workOrder]);
  const linkedRecordSummary = linkedSummaries.get(String(workOrder._id)) || finalizeWorkOrderLinkedSummary(emptyWorkOrderLinkedSummary(workOrder));
  const before = {
    customerId: workOrder.customerId,
    technicianId: workOrder.technicianId || null,
    status: workOrder.status,
    bookingId: workOrder.bookingId || null,
    amcContractId: workOrder.amcContractId || null,
    amcVisitId: workOrder.amcVisitId || null,
    archivedAt: workOrder.archivedAt || null,
    linkedRecordSummary
  };

  workOrder.archivedAt = new Date();
  workOrder.archivedBy = user?._id || null;
  await workOrder.save();
  await logAudit({
    userId: user?._id || null,
    action: 'work_order_archived',
    module: 'work_order',
    recordId: workOrder._id,
    before,
    after: { archivedAt: workOrder.archivedAt, linkedRecordSummary }
  });
  return {
    id: String(workOrder._id),
    action: 'archived',
    message: 'Work order archived. You can restore it from Archived work orders.'
  };
}

export async function moveWorkOrderToTrash(id, user) {
  assertPermission(user, 'delete_work_order', 'You do not have permission to move work orders to Trash');
  const workOrder = await WorkOrder.findById(id);
  if (!workOrder) throw appError('Work order not found', 404);
  if (workOrder.isDeleted) throw appError('Work order is already in Trash', 409);

  const linkedSummaries = await workOrderLinkedRecordSummaries([workOrder]);
  const linkedRecordSummary = linkedSummaries.get(String(workOrder._id)) || finalizeWorkOrderLinkedSummary(emptyWorkOrderLinkedSummary(workOrder));
  const before = {
    customerId: workOrder.customerId,
    technicianId: workOrder.technicianId || null,
    status: workOrder.status,
    bookingId: workOrder.bookingId || null,
    amcContractId: workOrder.amcContractId || null,
    amcVisitId: workOrder.amcVisitId || null,
    archivedAt: workOrder.archivedAt || null,
    linkedRecordSummary
  };

  const deletedAt = new Date();
  workOrder.isDeleted = true;
  workOrder.deletedAt = deletedAt;
  workOrder.deletedBy = user?._id || null;
  workOrder.deleteExpiresAt = trashExpiryFrom(deletedAt);
  await workOrder.save();
  await logAudit({
    userId: user?._id || null,
    action: 'work_order_moved_to_trash',
    module: 'work_order',
    recordId: workOrder._id,
    before,
    after: { deletedAt: workOrder.deletedAt, deleteExpiresAt: workOrder.deleteExpiresAt }
  });
  return {
    id: String(workOrder._id),
    action: 'trashed',
    message: 'Moved to Trash. You can restore this work order within 30 days from Trash.'
  };
}

export async function deleteWorkOrder(id, user) {
  return moveWorkOrderToTrash(id, user);
}

export async function restoreWorkOrder(id, user) {
  assertPermission(user, 'delete_work_order', 'You do not have permission to restore work orders');
  const workOrder = await WorkOrder.findById(id);
  if (!workOrder) throw appError('Work order not found', 404);
  if (!workOrder.isDeleted && !workOrder.archivedAt) throw appError('Work order is already active', 409);

  const restoringFromTrash = Boolean(workOrder.isDeleted);
  if (restoringFromTrash && workOrder.deleteExpiresAt && new Date(workOrder.deleteExpiresAt).getTime() < Date.now()) {
    throw appError('Trash restore period has expired. Permanently delete it from Trash or contact an administrator.', 410);
  }

  const before = {
    archivedAt: workOrder.archivedAt || null,
    isDeleted: Boolean(workOrder.isDeleted),
    deletedAt: workOrder.deletedAt || null,
    deleteExpiresAt: workOrder.deleteExpiresAt || null
  };

  if (workOrder.isDeleted) {
    workOrder.isDeleted = false;
    workOrder.deletedAt = null;
    workOrder.deletedBy = null;
    workOrder.deleteExpiresAt = null;
  } else {
    workOrder.archivedAt = null;
    workOrder.archivedBy = null;
  }

  await workOrder.save();
  await logAudit({
    userId: user?._id || null,
    action: 'work_order_restored',
    module: 'work_order',
    recordId: workOrder._id,
    before,
    after: {
      archivedAt: workOrder.archivedAt || null,
      isDeleted: Boolean(workOrder.isDeleted),
      deletedAt: workOrder.deletedAt || null,
      deleteExpiresAt: workOrder.deleteExpiresAt || null
    }
  });

  return {
    id: String(workOrder._id),
    action: 'restored',
    message: 'Work order restored.'
  };
}

export async function permanentlyDeleteWorkOrder(id, user) {
  assertPermission(user, 'delete_work_order', 'You do not have permission to permanently delete work orders');
  if (!isAdminUser(user)) throw appError('Only Admin users can permanently delete work orders', 403);
  const workOrder = await WorkOrder.findOne({ _id: id, isDeleted: true });
  if (!workOrder) throw appError('Work order not found in Trash', 404);

  const linkedSummaries = await workOrderLinkedRecordSummaries([workOrder]);
  const linkedRecordSummary = linkedSummaries.get(String(workOrder._id)) || finalizeWorkOrderLinkedSummary(emptyWorkOrderLinkedSummary(workOrder));
  if (linkedRecordSummary.hasLinkedRecords) {
    throw appError('This item is used in existing records. You can disable or archive it instead.', 409);
  }

  const before = {
    customerId: workOrder.customerId,
    technicianId: workOrder.technicianId || null,
    status: workOrder.status,
    deletedAt: workOrder.deletedAt || null,
    deleteExpiresAt: workOrder.deleteExpiresAt || null
  };

  await WorkOrder.deleteOne({ _id: workOrder._id });
  await logAudit({
    userId: user?._id || null,
    action: 'work_order_permanently_deleted',
    module: 'work_order',
    recordId: workOrder._id,
    before
  });

  return { id: String(workOrder._id), action: 'permanentlyDeleted', message: 'Work order permanently deleted.' };
}

export async function addImages(id, files, user, payload = {}) {
  assertPermission(user, 'upload_photos');
  if (!files?.length) throw appError('Select at least one image');
  const workOrder = await getWorkOrder(id, user);
  const photoType = normalizeWorkOrderImageType(payload.photoCategory || payload.type, 'before_service');
  files.forEach((file) => {
    workOrder.images.push({
      type: photoType,
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype || '',
      size: file.size || 0,
      uploadedBy: user?._id || null,
      uploadedByRole: uploadedByRoleForUser(user),
      uploadedAt: new Date()
    });
  });
  const timelineLabel = photoType === 'after_service'
    ? 'after-completion'
    : photoType === 'customer_problem'
      ? 'customer problem'
      : 'before-service';
  workOrder.timeline.push({
    status: workOrder.status,
    message: `${files.length} ${timelineLabel} photo(s) uploaded`,
    userId: user._id
  });
  await workOrder.save();
  return getWorkOrder(id, user);
}

export async function markDocumentSent(id, type, payload, user) {
  assertPermission(user, 'mark_document_sent');
  if (!['quotation', 'work', 'service-completed', 'amc-contract', 'amc-service-visit', 'amc-invoice', 'amc-renewal-reminder'].includes(type)) throw appError('Invalid document type');
  const workOrder = await getWorkOrder(id, user);
  const sentAt = payload.sentAt ? new Date(payload.sentAt) : new Date();
  const sentVia = clean(payload.sentVia) || 'WhatsApp';
  const existing = workOrder.documentsSent.find((item) => item.type === type);

  if (existing) {
    existing.sentVia = sentVia;
    existing.sentAt = sentAt;
  } else {
    workOrder.documentsSent.push({ type, sentVia, sentAt });
  }

  workOrder.timeline.push({
    type: 'document',
    status: workOrder.status,
    message: `${documentLabel(type)} sent via ${sentVia}`,
    userId: user._id
  });
  await workOrder.save();
  return getWorkOrder(id, user);
}

function documentLabel(type) {
  if (type === 'quotation') return 'Quotation PDF';
  if (type === 'work') return 'Invoice PDF';
  if (type === 'amc-contract') return 'AMC Contract PDF';
  if (type === 'amc-service-visit') return 'AMC Service Visit PDF';
  if (type === 'amc-invoice') return 'AMC Invoice / Receipt PDF';
  if (type === 'amc-renewal-reminder') return 'AMC Renewal / Expiry Reminder PDF';
  return 'Service Completed PDF';
}

export async function updateApproval(id, payload, user) {
  assertPermission(user, 'edit_work_order');
  const approvalStatus = clean(payload.approvalStatus);
  if (!['approved', 'denied'].includes(approvalStatus)) throw appError('Invalid approval status');
  const workOrder = await getWorkOrder(id, user);
  workOrder.approvalStatus = approvalStatus;
  workOrder.timeline.push({
    type: 'approval',
    status: workOrder.status,
    message: approvalStatus === 'approved' ? 'Customer approved quotation' : 'Customer denied quotation',
    userId: user._id
  });
  await workOrder.save();
  await logAudit({
    userId: user._id,
    action: 'approval_updated',
    module: 'work_order',
    recordId: workOrder._id,
    after: { approvalStatus }
  });
  return getWorkOrder(id, user);
}
