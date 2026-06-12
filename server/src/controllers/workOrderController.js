import {
  addImages,
  addNote,
  addPart,
  autoAssignWorkOrder,
  createWorkOrder,
  deleteWorkOrder,
  getWorkOrder,
  listWorkOrders,
  markDocumentSent,
  removePart,
  updatePart,
  requestPart,
  approvePartRequest,
  rejectPartRequest,
  movePartRequestToUsed,
  updateApproval,
  updateAssignment,
  updateServiceCharge,
  updatePriority,
  updateStatus
} from '../services/workOrderService.js';
import { generateWorkOrderPdf } from '../services/workOrderPdfService.js';
import { sendWorkOrderPdfViaWhatsapp } from '../services/workOrderWhatsappPdfService.js';
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

export async function patchPart(req, res) {
  const workOrder = await updatePart(req.params.id, req.params.partId, req.body, req.user);
  res.json({ workOrder, message: 'Part updated' });
}

export async function patchServiceCharge(req, res) {
  const workOrder = await updateServiceCharge(req.params.id, req.body, req.user);
  res.json({ workOrder, message: 'Service charge updated' });
}

export async function patchPriority(req, res) {
  const workOrder = await updatePriority(req.params.id, req.body, req.user);
  res.json({ workOrder, message: 'Priority updated' });
}

export async function postPartRequest(req, res) {
  const workOrder = await requestPart(req.params.id, req.body, req.user);
  res.status(201).json({ workOrder, message: 'Part requested' });
}

export async function patchApprovePartRequest(req, res) {
  const workOrder = await approvePartRequest(req.params.id, req.params.requestId, req.user);
  res.json({ workOrder, message: 'Part request approved' });
}

export async function patchRejectPartRequest(req, res) {
  const workOrder = await rejectPartRequest(req.params.id, req.params.requestId, req.body, req.user);
  res.json({ workOrder, message: 'Part request rejected' });
}

export async function patchMovePartRequestToUsed(req, res) {
  const workOrder = await movePartRequestToUsed(req.params.id, req.params.requestId, req.user, req.body || {});
  res.json({ workOrder, message: 'Part moved to Parts Used' });
}

export async function postImages(req, res) {
  const workOrder = await addImages(req.params.id, req.files, req.user, req.body || {});
  res.status(201).json({ workOrder, message: 'Images uploaded' });
}

export async function postAutoAssign(req, res) {
  const workOrder = await autoAssignWorkOrder(req.params.id, req.user);
  res.json({ workOrder, message: 'Work order auto-assigned' });
}

export async function patchAssignment(req, res) {
  const workOrder = await updateAssignment(req.params.id, req.body, req.user);
  res.json({ workOrder, message: 'Work order assignment updated' });
}

export async function remove(req, res) {
  const result = await deleteWorkOrder(req.params.id, req.user);
  res.json({ success: true, ...result, message: 'Work order deleted' });
}

export async function downloadPdf(req, res) {
  const pdf = await generateWorkOrderPdf({ workOrderId: req.params.id, type: req.params.type, user: req.user });
  res.download(pdf.filePath, pdf.filename);
}

export async function postSendPdfWhatsapp(req, res) {
  const result = await sendWorkOrderPdfViaWhatsapp({
    workOrderId: req.params.id,
    type: req.params.type,
    user: req.user
  });
  const label =
    req.params.type === 'quotation'
      ? 'Quotation PDF'
      : req.params.type === 'work'
        ? 'Invoice PDF'
        : req.params.type === 'amc-contract'
          ? 'AMC Contract PDF'
          : req.params.type === 'amc-service-visit'
            ? 'AMC Service Visit PDF'
            : req.params.type === 'amc-invoice'
              ? 'AMC Invoice / Receipt PDF'
              : req.params.type === 'amc-renewal-reminder'
                ? 'AMC Renewal / Expiry Reminder PDF'
                : 'Service Completed PDF';
  res.json({
    success: true,
    sentViaApi: result.sentViaApi,
    apiConfigured: result.apiConfigured,
    fallback: Boolean(result.fallback),
    whatsappMessage: result.message,
    whatsappUrl: result.whatsappUrl,
    pdfUrl: result.pdfUrl || '',
    pdfFilename: result.pdfFilename || '',
    fallbackNote: result.fallbackNote || '',
    workOrder: result.workOrder,
    message: result.sentViaApi ? `${label} sent via WhatsApp` : result.fallbackNote
  });
}

export async function patchDocumentSent(req, res) {
  const workOrder = await markDocumentSent(req.params.id, req.params.type, req.body, req.user);
  res.json({ success: true, workOrder, message: 'Document marked as sent' });
}

export async function patchApproval(req, res) {
  const workOrder = await updateApproval(req.params.id, req.body, req.user);
  res.json({ success: true, workOrder, message: 'Approval updated' });
}
