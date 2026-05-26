import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { requirePermission } from '../permissions.js';
import { getByKey, list, preview, reset, restore, update } from '../controllers/pdfTemplateController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.get('/', requirePermission('view_settings'), asyncHandler(list));
router.get('/:key', requirePermission('view_settings'), asyncHandler(getByKey));
router.post('/:key/preview', requirePermission('view_settings'), asyncHandler(preview));
router.patch('/:key', requireRole('admin'), requirePermission('manage_pdf_templates'), asyncHandler(update));
router.post('/:key/reset', requireRole('admin'), requirePermission('manage_pdf_templates'), asyncHandler(reset));
router.post('/:key/restore/:versionId', requireRole('admin'), requirePermission('manage_pdf_templates'), asyncHandler(restore));

export default router;
