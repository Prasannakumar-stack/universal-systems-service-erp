import { Router } from 'express';
import { authenticate } from '../auth.js';
import { requirePermission } from '../permissions.js';
import { create, list } from '../controllers/paymentController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.get('/', requirePermission('view_payments'), asyncHandler(list));
router.post('/', requirePermission('record_payment'), asyncHandler(create));

export default router;
