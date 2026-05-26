import Booking from '../models/Booking.js';
import AMCContract from '../models/AMCContract.js';
import Customer from '../models/Customer.js';
import InventoryPart from '../models/InventoryPart.js';
import Invoice from '../models/Invoice.js';
import User from '../models/User.js';
import WorkOrder from '../models/WorkOrder.js';
import { assertPermission } from '../permissions.js';
import { appError, clean, numberValue } from '../utils/http.js';
import { addDateRange, paginationMeta, parsePagination, searchRegex, validObjectId, withNestedIds } from '../utils/pagination.js';
import { logAudit } from './auditService.js';
import { AUTO_AMC_PART_CHARGE_MODE, AUTO_AMC_PART_CHARGE_TYPE, MANUAL_AMC_PART_CHARGE_MODE, amcPartChargeType } from './amcCoverageEngine.js';
import { createNotification } from './notificationService.js';
import { applyStockMovement, syncPartAvailability } from './stockMovementService.js';
import { technicianCanAccessWorkOrder, technicianWorkOrderScope } from './technicianScopeService.js';

const populateWorkOrder = [
  { path: 'customerId', select: 'name phone address devices' },
  { path: 'technicianId', select: 'name username role' },
  { path: 'timeline.userId', select: 'name username role' },
  { path: 'partRequests.userId', select: 'name username role' },
  { path: 'partRequests.approvedBy', select: 'name username role' },
  { path: 'partRequests.rejectedBy', select: 'name username role' },
  { path: 'bookingId', select: 'bookingCode serviceType bookingSource problemImage' },
  {
    path: 'amcContractId',
    select: 'contractId contractType coverageType coverParts coverService coverVisits coveredService coveredDevices contractValue startDate endDate status includedVisits invoiceId',
    populate: { path: 'invoiceId', select: 'invoiceNumber total paidAmount balance status title notes' }
  },
  { path: 'invoiceId', select: 'invoiceNumber total paidAmount balance status title notes adjustmentForInvoiceId' }
];

const detailPopulateWorkOrder = [
  ...populateWorkOrder,
  {
    path: 'extraInvoices',
    select: 'invoiceNumber total paidAmount balance status title notes adjustmentForInvoiceId workOrderId amcContractId createdAt',
    options: { sort: { createdAt: -1 } }
  }
];

const pendingPartRequestStatuses = ['Pending', 'Requested', 'Reserved'];
const WORK_ORDER_PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];

function assertPartsUnlocked(workOrder) {
  if (workOrder.invoiceId) {
    throw appError(
      'Parts are locked because an invoice has already been generated. To change parts, cancel/void the invoice or create an adjustment.',
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

async function deductPartsUsedStock({ workOrder, inventoryPartId, name, quantity, user }) {
  const qty = Math.max(1, numberValue(quantity, 1));
  await assertInventoryStockAvailable(inventoryPartId, qty);
  await applyStockMovement({
    partId: inventoryPartId,
    type: 'USED',
    quantity: qty,
    source: workOrderStockSource(workOrder),
    sourceId: workOrder._id,
    note: `Parts Used: ${workOrder.device || name}`,
    userId: user._id
  });
  workOrder.timeline.push({
    status: workOrder.status,
    message: `Stock deducted: ${name} x${qty} added to Parts Used`,
    userId: user._id
  });
}

async function restorePartsUsedStock({ workOrder, inventoryPartId, name, quantity, user }) {
  const qty = Math.max(1, numberValue(quantity, 1));
  await applyStockMovement({
    partId: inventoryPartId,
    type: 'RETURN',
    quantity: qty,
    source: workOrderStockSource(workOrder),
    sourceId: workOrder._id,
    note: `Parts Used: ${workOrder.device || name}`,
    userId: user._id
  });
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
        url: sourceBooking.problemImage.url,
        filename: sourceBooking.problemImage.filename || 'booking-problem-image',
        originalName: sourceBooking.problemImage.originalName || '',
        mimetype: sourceBooking.problemImage.mimetype || '',
        size: sourceBooking.problemImage.size || 0
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
  const filter = {};
  const clauses = [];
  const { page, limit, skip } = parsePagination(query);
  if (clean(query.status)) filter.status = clean(query.status);
  if (clean(query.priority)) filter.priority = clean(query.priority);
  if (clean(query.serviceType)) filter.serviceType = searchRegex(query.serviceType);
  if (clean(query.source)) {
    const source = searchRegex(query.source);
    clauses.push({ $or: [{ bookingSource: source }, { source }, { channel: source }] });
  }
  if (clean(query.technicianId).toLowerCase() === 'admin') filter.technicianId = null;
  else if (validObjectId(query.technicianId)) filter.technicianId = validObjectId(query.technicianId);
  if (validObjectId(query.customerId)) filter.customerId = validObjectId(query.customerId);
  const technicianScope = technicianWorkOrderScope(user);
  if (technicianScope) clauses.push(technicianScope);
  addDateRange(filter, query);

  const search = clean(query.search);
  const regex = searchRegex(search);
  if (regex) {
    const [customers, technicians] = await Promise.all([
      Customer.find({ $or: [{ name: regex }, { phone: regex }] }).select('_id').limit(1000).lean(),
      User.find({ $or: [{ name: regex }, { username: regex }], role: 'technician' }).select('_id').limit(1000).lean()
    ]);
    const searchFields = [
      { device: regex },
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
  if (clauses.length) filter.$and = clauses;

  const [total, rows] = await Promise.all([
    WorkOrder.countDocuments(filter),
    WorkOrder.find(filter).populate(populateWorkOrder).sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
  ]);
  const workOrders = rows.map((order) => withNestedIds(order, ['customerId', 'technicianId', 'bookingId', 'amcContractId', 'invoiceId']));
  return { workOrders, pagination: paginationMeta(page, limit, total) };
}

export async function getWorkOrder(id, user) {
  const workOrder = await WorkOrder.findById(id).populate(detailPopulateWorkOrder);
  if (!workOrder) throw appError('Work order not found', 404);
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
    await deductPartsUsedStock({ workOrder, inventoryPartId, name, quantity: stockQtyToDeduct, user });
    const row = findUsedInventoryRow(workOrder, inventoryPartId, chargeType);
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
        name: part.name,
        quantity: delta,
        user
      });
    } else if (delta < 0) {
      await restorePartsUsedStock({
        workOrder,
        inventoryPartId: part.inventoryPartId,
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

export async function deleteWorkOrder(id, user) {
  assertPermission(user, 'delete_work_order', 'You do not have permission to delete work orders');
  const workOrder = await WorkOrder.findById(id);
  if (!workOrder) throw appError('Work order not found', 404);

  const invoiceCount = await Invoice.countDocuments({ workOrderId: workOrder._id });
  if (workOrder.invoiceId || invoiceCount) {
    throw appError('Work orders with generated invoices cannot be deleted', 409);
  }
  if ((workOrder.partsUsed || []).length || (workOrder.partRequests || []).length) {
    throw appError('Remove parts and part requests before deleting this work order', 409);
  }

  const before = {
    customerId: workOrder.customerId,
    technicianId: workOrder.technicianId || null,
    status: workOrder.status,
    bookingId: workOrder.bookingId || null,
    amcContractId: workOrder.amcContractId || null,
    amcVisitId: workOrder.amcVisitId || null
  };

  await WorkOrder.deleteOne({ _id: workOrder._id });

  if (workOrder.bookingId) {
    await Booking.updateOne(
      { _id: workOrder.bookingId },
      { $set: { status: 'Pending', workOrderId: null } }
    );
  }

  if (workOrder.amcContractId && workOrder.amcVisitId) {
    await AMCContract.updateOne(
      { _id: workOrder.amcContractId, 'visits._id': workOrder.amcVisitId },
      { $set: { 'visits.$.status': 'Upcoming', 'visits.$.completedAt': null, 'visits.$.workOrderId': null } }
    );
  }

  await logAudit({
    userId: user._id,
    action: 'deleted',
    module: 'work_order',
    recordId: workOrder._id,
    before
  });

  return { id: String(workOrder._id) };
}

export async function addImages(id, files, user) {
  assertPermission(user, 'upload_photos');
  if (!files?.length) throw appError('Select at least one image');
  const workOrder = await getWorkOrder(id, user);
  files.forEach((file) => {
    workOrder.images.push({
      url: `/uploads/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype || '',
      size: file.size || 0
    });
  });
  workOrder.timeline.push({ status: workOrder.status, message: `${files.length} image(s) uploaded`, userId: user._id });
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
