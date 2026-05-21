import { Router } from 'express';
import { authenticate } from '../auth.js';
import { requirePermission } from '../permissions.js';
import { create, list } from '../controllers/stockMovementController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.get('/', requirePermission('view_stock_movements'), asyncHandler(list));
router.post('/', requirePermission('edit_stock'), asyncHandler(create));

export default router;
