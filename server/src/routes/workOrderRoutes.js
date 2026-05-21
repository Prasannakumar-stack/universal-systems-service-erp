import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { handleUploadErrors, workOrderUpload } from '../upload.js';
import { create, deletePart, downloadPdf, getById, list, patchApproval, patchApprovePartRequest, patchAssignment, patchDocumentSent, patchMovePartRequestToUsed, patchPart, patchPriority, patchRejectPartRequest, patchServiceCharge, patchStatus, postAutoAssign, postImages, postNote, postPart, postPartRequest, postSendPdfWhatsapp, remove } from '../controllers/workOrderController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.post('/', requireRole('admin'), asyncHandler(create));
router.get('/', asyncHandler(list));
router.get('/:id', asyncHandler(getById));
router.post('/:id/auto-assign', requireRole('admin'), asyncHandler(postAutoAssign));
router.patch('/:id/assignment', requireRole('admin'), asyncHandler(patchAssignment));
router.delete('/:id', requireRole('admin'), asyncHandler(remove));
router.get('/:id/pdf/:type', asyncHandler(downloadPdf));
router.post('/:id/pdf/:type/send-whatsapp', requireRole('admin'), asyncHandler(postSendPdfWhatsapp));
router.patch('/:id/documents/:type/sent', requireRole('admin'), asyncHandler(patchDocumentSent));
router.patch('/:id/approval', requireRole('admin'), asyncHandler(patchApproval));
router.patch('/:id/status', asyncHandler(patchStatus));
router.patch('/:id/service-charge', requireRole('admin'), asyncHandler(patchServiceCharge));
router.patch('/:id/priority', requireRole('admin'), asyncHandler(patchPriority));
router.post('/:id/notes', asyncHandler(postNote));
router.post('/:id/parts', requireRole('admin'), asyncHandler(postPart));
router.patch('/:id/parts/:partId', requireRole('admin'), asyncHandler(patchPart));
router.delete('/:id/parts/:partId', requireRole('admin'), asyncHandler(deletePart));
router.post('/:id/part-requests', asyncHandler(postPartRequest));
router.patch('/:id/part-requests/:requestId/approve', requireRole('admin'), asyncHandler(patchApprovePartRequest));
router.patch('/:id/part-requests/:requestId/reject', requireRole('admin'), asyncHandler(patchRejectPartRequest));
router.patch('/:id/part-requests/:requestId/move-to-used', requireRole('admin'), asyncHandler(patchMovePartRequestToUsed));
router.post('/:id/images', workOrderUpload.array('images', 6), handleUploadErrors, asyncHandler(postImages));

export default router;
