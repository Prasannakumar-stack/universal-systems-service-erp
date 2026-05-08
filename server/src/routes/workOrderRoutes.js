import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { workOrderUpload } from '../upload.js';
import { create, deletePart, downloadPdf, getById, list, patchApproval, patchDocumentSent, patchServiceCharge, patchStatus, postAutoAssign, postImages, postNote, postPart, postPartRequest } from '../controllers/workOrderController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.post('/', requireRole('admin'), asyncHandler(create));
router.get('/', asyncHandler(list));
router.get('/:id', asyncHandler(getById));
router.post('/:id/auto-assign', requireRole('admin'), asyncHandler(postAutoAssign));
router.get('/:id/pdf/:type', asyncHandler(downloadPdf));
router.patch('/:id/documents/:type/sent', asyncHandler(patchDocumentSent));
router.patch('/:id/approval', requireRole('admin'), asyncHandler(patchApproval));
router.patch('/:id/status', asyncHandler(patchStatus));
router.patch('/:id/service-charge', asyncHandler(patchServiceCharge));
router.post('/:id/notes', asyncHandler(postNote));
router.post('/:id/parts', asyncHandler(postPart));
router.delete('/:id/parts/:partId', asyncHandler(deletePart));
router.post('/:id/part-requests', asyncHandler(postPartRequest));
router.post('/:id/images', workOrderUpload.array('images', 6), asyncHandler(postImages));

export default router;
