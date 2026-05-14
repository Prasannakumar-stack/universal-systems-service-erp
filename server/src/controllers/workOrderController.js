import {
  addImages,
  addNote,
  addPart,
  autoAssignWorkOrder,
  createWorkOrder,
  getWorkOrder,
  listWorkOrders,
  markDocumentSent,
  removePart,
  requestPart,
  updateApproval,
  updateServiceCharge,
  updateStatus
} from '../services/workOrderService.js';
import { generateWorkOrderPdf } from '../services/workOrderPdfService.js';
import { required } from '../utils/http.js';

export async function create(req, res) {
  if (!req.body.bookingId) required(req.body, ['customerId', 'device', 'issue']);
  const workOrder = await createWorkOrder(req.body, req.user);
  res.status(201).json({ workOrder, message: 'Work order created' });
}

export async function list(req, res) {
  try {
    const { workOrders, pagination } = await listWorkOrders(req.query, req.user);
    res.json({ success: true, data: workOrders, workOrders, pagination });
  } catch (error) {
    console.error('Work order list failed', error);
    res.status(500).json({ success: false, message: 'Unable to load work orders right now' });
  }
}

export async function getById(req, res) {
  const workOrder = await getWorkOrder(req.params.id, req.user);
  res.json({ workOrder });
}

export async function patchStatus(req, res) {
  const workOrder = await updateStatus(req.params.id, req.body, req.user);
  res.json({ workOrder, message: 'Status updated' });
}

export async function postNote(req, res) {
  const workOrder = await addNote(req.params.id, req.body, req.user);
  res.status(201).json({ workOrder, message: 'Note added' });
}

export async function postPart(req, res) {
  const workOrder = await addPart(req.params.id, req.body, req.user);
  res.status(201).json({ workOrder, message: 'Part added' });
}

export async function deletePart(req, res) {
  const workOrder = await removePart(req.params.id, req.params.partId, req.user);
  res.json({ workOrder, message: 'Part removed' });
}

export async function patchServiceCharge(req, res) {
  const workOrder = await updateServiceCharge(req.params.id, req.body, req.user);
  res.json({ workOrder, message: 'Service charge updated' });
}

export async function postPartRequest(req, res) {
  const workOrder = await requestPart(req.params.id, req.body, req.user);
  res.status(201).json({ workOrder, message: 'Part requested' });
}

export async function postImages(req, res) {
  const workOrder = await addImages(req.params.id, req.files, req.user);
  res.status(201).json({ workOrder, message: 'Images uploaded' });
}

export async function postAutoAssign(req, res) {
  const workOrder = await autoAssignWorkOrder(req.params.id, req.user);
  res.json({ workOrder, message: 'Work order auto-assigned' });
}

export async function downloadPdf(req, res) {
  const pdf = await generateWorkOrderPdf({ workOrderId: req.params.id, type: req.params.type, user: req.user });
  res.download(pdf.filePath, pdf.filename);
}

export async function patchDocumentSent(req, res) {
  const workOrder = await markDocumentSent(req.params.id, req.params.type, req.body, req.user);
  res.json({ success: true, workOrder, message: 'Document marked as sent' });
}

export async function patchApproval(req, res) {
  const workOrder = await updateApproval(req.params.id, req.body, req.user);
  res.json({ success: true, workOrder, message: 'Approval updated' });
}
