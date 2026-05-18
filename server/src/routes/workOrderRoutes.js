import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { workOrderUpload } from '../upload.js';
import { create, deletePart, downloadPdf, getById, list, patchApproval, patchApprovePartRequest, patchDocumentSent, patchMovePartRequestToUsed, patchPart, patchPriority, patchRejectPartRequest, patchServiceCharge, patchStatus, postAutoAssign, postImages, postNote, postPart, postPartRequest, postSendPdfWhatsapp } from '../controllers/workOrderController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.post('/', requireRole('admin'), asyncHandler(create));
router.get('/', asyncHandler(list));
router.get('/:id', asyncHandler(getById));
router.post('/:id/auto-assign', requireRole('admin'), asyncHandler(postAutoAssign));
router.get('/:id/pdf/:type', asyncHandler(downloadPdf));
router.post('/:id/pdf/:type/send-whatsapp', asyncHandler(postSendPdfWhatsapp));
router.patch('/:id/documents/:type/sent', asyncHandler(patchDocumentSent));
router.patch('/:id/approval', requireRole('admin'), asyncHandler(patchApproval));
router.patch('/:id/status', asyncHandler(patchStatus));
router.patch('/:id/service-charge', asyncHandler(patchServiceCharge));
router.patch('/:id/priority', requireRole('admin'), asyncHandler(patchPriority));
router.post('/:id/notes', asyncHandler(postNote));
router.post('/:id/parts', asyncHandler(postPart));
router.patch('/:id/parts/:partId', asyncHandler(patchPart));
router.delete('/:id/parts/:partId', asyncHandler(deletePart));
router.post('/:id/part-requests', asyncHandler(postPartRequest));
router.patch('/:id/part-requests/:requestId/approve', requireRole('admin'), asyncHandler(patchApprovePartRequest));
router.patch('/:id/part-requests/:requestId/reject', requireRole('admin'), asyncHandler(patchRejectPartRequest));
router.patch('/:id/part-requests/:requestId/move-to-used', requireRole('admin'), asyncHandler(patchMovePartRequestToUsed));
router.post('/:id/images', workOrderUpload.array('images', 6), asyncHandler(postImages));

export default router;
