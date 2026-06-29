import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { requireAnyPermission, requirePermission } from '../permissions.js';
import { handleUploadErrors, workOrderUpload } from '../upload.js';
import { archive, create, deletePart, downloadPdf, getById, list, moveToTrash, patchApproval, patchApprovePartRequest, patchAssignment, patchDocumentSent, patchMovePartRequestToUsed, patchPart, patchPriority, patchRejectPartRequest, patchServiceCharge, patchStatus, postAutoAssign, postImages, postNote, postPart, postPartRequest, postSendPdfWhatsapp, remove, removePermanently, restore } from '../controllers/workOrderController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.post('/', requirePermission('create_work_order'), asyncHandler(create));
router.get('/', requirePermission('view_work_orders'), asyncHandler(list));
router.get('/:id', requirePermission('view_work_orders'), asyncHandler(getById));
router.post('/:id/auto-assign', requirePermission('assign_technician'), asyncHandler(postAutoAssign));
router.patch('/:id/assignment', requirePermission('assign_technician'), asyncHandler(patchAssignment));
router.patch('/:id/archive', requirePermission('delete_work_order'), asyncHandler(archive));
router.patch('/:id/move-to-trash', requirePermission('delete_work_order'), asyncHandler(moveToTrash));
router.post('/:id/restore', requirePermission('delete_work_order'), asyncHandler(restore));
router.delete('/:id/permanent', requireRole('admin', 'super_admin'), requirePermission('delete_work_order'), asyncHandler(removePermanently));
router.delete('/:id', requirePermission('delete_work_order'), asyncHandler(remove));
router.get('/:id/pdf/:type', requireAnyPermission('view_documents', 'download_invoice_pdf'), asyncHandler(downloadPdf));
router.post('/:id/pdf/:type/send-whatsapp', requirePermission('send_pdf_whatsapp'), asyncHandler(postSendPdfWhatsapp));
router.patch('/:id/documents/:type/sent', requirePermission('mark_document_sent'), asyncHandler(patchDocumentSent));
router.patch('/:id/approval', requirePermission('edit_work_order'), asyncHandler(patchApproval));
router.patch('/:id/status', requirePermission('update_work_order_status'), asyncHandler(patchStatus));
router.patch('/:id/service-charge', requirePermission('edit_service_charge'), asyncHandler(patchServiceCharge));
router.patch('/:id/priority', requirePermission('edit_work_order'), asyncHandler(patchPriority));
router.post('/:id/notes', requirePermission('add_notes'), asyncHandler(postNote));
router.post('/:id/parts', requirePermission('manage_parts_used'), asyncHandler(postPart));
router.patch('/:id/parts/:partId', requirePermission('manage_parts_used'), asyncHandler(patchPart));
router.delete('/:id/parts/:partId', requirePermission('manage_parts_used'), asyncHandler(deletePart));
router.post('/:id/part-requests', requirePermission('create_part_request'), asyncHandler(postPartRequest));
router.patch('/:id/part-requests/:requestId/approve', requirePermission('approve_part_requests'), asyncHandler(patchApprovePartRequest));
router.patch('/:id/part-requests/:requestId/reject', requirePermission('approve_part_requests'), asyncHandler(patchRejectPartRequest));
router.patch('/:id/part-requests/:requestId/move-to-used', requirePermission('approve_part_requests'), asyncHandler(patchMovePartRequestToUsed));
router.post('/:id/images', requirePermission('upload_photos'), workOrderUpload.array('images', 6), handleUploadErrors, asyncHandler(postImages));

export default router;
