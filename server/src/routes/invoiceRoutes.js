import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { create, list } from '../controllers/invoiceController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.get('/', requireRole('admin', 'technician'), asyncHandler(list));
router.post('/', requireRole('admin'), asyncHandler(create));

export default router;
