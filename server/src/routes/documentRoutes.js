import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { create, downloadPdf, getById, list } from '../controllers/documentController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate, requireRole('admin'));
router.post('/', asyncHandler(create));
router.get('/', asyncHandler(list));
router.get('/:id', asyncHandler(getById));
router.get('/:id/pdf', asyncHandler(downloadPdf));

export default router;
