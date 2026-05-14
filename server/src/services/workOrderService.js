import Booking from '../models/Booking.js';
import Customer from '../models/Customer.js';
import InventoryPart from '../models/InventoryPart.js';
import User from '../models/User.js';
import WorkOrder from '../models/WorkOrder.js';
import { appError, clean, numberValue } from '../utils/http.js';
import { addDateRange, paginationMeta, parsePagination, searchRegex, validObjectId, withNestedIds } from '../utils/pagination.js';
import { logAudit } from './auditService.js';
import { createNotification } from './notificationService.js';
import { applyStockMovement, reservePart } from './stockMovementService.js';

const populateWorkOrder = [
  { path: 'customerId', select: 'name phone address devices' },
  { path: 'technicianId', select: 'name username role' },
  { path: 'bookingId', select: 'bookingCode serviceType bookingSource problemImage' },
  { path: 'amcContractId', select: 'contractId contractType coveredService' },
  { path: 'invoiceId', select: 'invoiceNumber total paidAmount balance status' }
];

export async function createWorkOrder(payload, user) {
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
  if (user.role === 'technician') filter.technicianId = user._id;
  if (clean(query.status)) filter.status = clean(query.status);
  if (clean(query.priority)) filter.priority = clean(query.priority);
  if (clean(query.serviceType)) filter.serviceType = searchRegex(query.serviceType);
  if (clean(query.source)) {
    const source = searchRegex(query.source);
    clauses.push({ $or: [{ bookingSource: source }, { source }, { channel: source }] });
  }
  if (user.role !== 'technician' && validObjectId(query.technicianId)) filter.technicianId = validObjectId(query.technicianId);
  if (validObjectId(query.customerId)) filter.customerId = validObjectId(query.customerId);
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
  const workOrder = await WorkOrder.findById(id).populate(populateWorkOrder);
  if (!workOrder) throw appError('Work order not found', 404);
  if (user.role === 'technician' && String(workOrder.technicianId?._id) !== String(user._id)) {
    throw appError('You do not have permission to view this work order', 403);
  }
  return workOrder;
}

export async function updateStatus(id, payload, user) {
  const status = clean(payload.status);
  if (!['Pending', 'In Progress', 'Awaiting Parts', 'Completed', 'Delivered', 'Returned'].includes(status)) throw appError('Invalid status');
  const workOrder = await getWorkOrder(id, user);
  const before = { status: workOrder.status, completedAt: workOrder.completedAt };
  workOrder.status = status;
  if (status === 'Completed' && !workOrder.completedAt) {
    workOrder.completedAt = new Date();
  }
  workOrder.timeline.push({ status, message: clean(payload.message) || `Status changed to ${status}`, userId: user._id });
  await workOrder.save();
  await logAudit({ userId: user._id, action: 'status_changed', module: 'work_order', recordId: workOrder._id, before, after: { status, completedAt: workOrder.completedAt } });
  return getWorkOrder(id, user);
}

export async function updateServiceCharge(id, payload, user) {
  const workOrder = await getWorkOrder(id, user);
  const serviceCharge = Math.max(0, numberValue(payload.serviceCharge, 0));
  const before = { serviceCharge: workOrder.serviceCharge };
  workOrder.serviceCharge = serviceCharge;
  workOrder.timeline.push({ status: workOrder.status, message: `Service charge updated to ${serviceCharge}`, userId: user._id });
  await workOrder.save();
  await logAudit({ userId: user._id, action: 'service_charge_updated', module: 'work_order', recordId: workOrder._id, before, after: { serviceCharge } });
  return getWorkOrder(id, user);
}

export async function addNote(id, payload, user) {
  const text = clean(payload.text || payload.note);
  if (!text) throw appError('Note text is required');
  const workOrder = await getWorkOrder(id, user);
  workOrder.notes.push({ text, userId: user._id });
  workOrder.timeline.push({ status: workOrder.status, message: 'Technician note added', userId: user._id });
  await workOrder.save();
  return getWorkOrder(id, user);
}

export async function addPart(id, payload, user) {
  const workOrder = await getWorkOrder(id, user);
  const quantity = Math.max(1, numberValue(payload.quantity, 1));
  let name = clean(payload.name || payload.partName);
  let unitPrice = numberValue(payload.unitPrice || payload.price, 0);
  let inventoryPartId = payload.inventoryPartId || null;

  if (inventoryPartId) {
    const part = await InventoryPart.findById(inventoryPartId);
    if (!part) throw appError('Inventory part not found', 404);
    name = name || part.partName;
    unitPrice = unitPrice || part.sellingPrice;
    await applyStockMovement({
      partId: part._id,
      type: 'USED',
      quantity,
      source: `WO-${workOrder._id}`,
      note: `Used for ${workOrder.device}`,
      userId: user._id
    });
  }

  if (!name) throw appError('Part name is required');
  workOrder.partsUsed.push({ inventoryPartId, name, quantity, unitPrice, total: quantity * unitPrice });
  workOrder.timeline.push({ status: workOrder.status, message: `Part added: ${name}`, userId: user._id });
  await workOrder.save();
  await logAudit({ userId: user._id, action: 'part_used', module: 'work_order', recordId: workOrder._id, after: { name, quantity } });
  return getWorkOrder(id, user);
}

export async function removePart(id, partId, user) {
  const workOrder = await getWorkOrder(id, user);
  const part = workOrder.partsUsed.id(partId);
  if (!part) throw appError('Part not found', 404);
  const before = { name: part.name, quantity: part.quantity, total: part.total };
  if (part.inventoryPartId) {
    await applyStockMovement({
      partId: part.inventoryPartId,
      type: 'RETURN',
      quantity: part.quantity,
      source: `WO-${workOrder._id}`,
      note: `Removed from ${workOrder.device}`,
      userId: user._id
    });
  }
  part.deleteOne();
  workOrder.timeline.push({ status: workOrder.status, message: `Part removed: ${before.name}`, userId: user._id });
  await workOrder.save();
  await logAudit({ userId: user._id, action: 'part_removed', module: 'work_order', recordId: workOrder._id, before });
  return getWorkOrder(id, user);
}

export async function requestPart(id, payload, user) {
  const workOrder = await getWorkOrder(id, user);
  const quantity = Math.max(1, numberValue(payload.quantity, 1));
  let name = clean(payload.name || payload.partName);
  const inventoryPartId = payload.inventoryPartId || null;

  if (inventoryPartId) {
    const part = await reservePart({ partId: inventoryPartId, quantity, userId: user._id, sourceId: workOrder._id });
    name = name || part.partName;
  }

  if (!name) throw appError('Part name is required');
  workOrder.partRequests.push({
    inventoryPartId,
    name,
    quantity,
    status: inventoryPartId ? 'Reserved' : 'Requested',
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

export async function autoAssignWorkOrder(id, user) {
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

export async function addImages(id, files, user) {
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
  if (!['quotation', 'work', 'service-completed'].includes(type)) throw appError('Invalid document type');
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
    message: `${type === 'quotation' ? 'Quotation PDF' : type === 'work' ? 'Invoice PDF' : 'Service Completed PDF'} sent via ${sentVia}`,
    userId: user._id
  });
  await workOrder.save();
  return getWorkOrder(id, user);
}

export async function updateApproval(id, payload, user) {
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
