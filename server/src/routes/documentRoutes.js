import { Router } from 'express';
import { authenticate } from '../auth.js';
import { requireAnyPermission, requirePermission } from '../permissions.js';
import { create, downloadPdf, getById, list } from '../controllers/documentController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.post('/', requirePermission('create_invoice'), asyncHandler(create));
router.get('/', requirePermission('view_documents'), asyncHandler(list));
router.get('/:id', requirePermission('view_documents'), asyncHandler(getById));
router.get('/:id/pdf', requireAnyPermission('view_documents', 'download_invoice_pdf'), asyncHandler(downloadPdf));

export default router;
