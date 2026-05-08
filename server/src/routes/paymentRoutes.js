import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { create, list } from '../controllers/paymentController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate, requireRole('admin'));
router.post('/', asyncHandler(create));
router.get('/', asyncHandler(list));

export default router;
