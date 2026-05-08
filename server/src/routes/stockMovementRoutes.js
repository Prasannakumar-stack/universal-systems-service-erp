import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { create, list } from '../controllers/stockMovementController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate, requireRole('admin'));
router.get('/', asyncHandler(list));
router.post('/', asyncHandler(create));

export default router;
