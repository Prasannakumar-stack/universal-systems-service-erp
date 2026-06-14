import { Router } from 'express';
import { authenticate } from '../auth.js';
import { requirePermission } from '../permissions.js';
import { create, list, reverse } from '../controllers/paymentController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.get('/', requirePermission('view_payments'), asyncHandler(list));
router.post('/', requirePermission('record_payment'), asyncHandler(create));
router.patch('/:id/reverse', requirePermission('edit_payment'), asyncHandler(reverse));

export default router;
