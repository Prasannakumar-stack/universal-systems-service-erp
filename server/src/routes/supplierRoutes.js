import { Router } from 'express';
import { authenticate } from '../auth.js';
import { requirePermission } from '../permissions.js';
import { create, list, remove, update } from '../controllers/supplierController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.get('/', requirePermission('view_inventory'), asyncHandler(list));
router.post('/', requirePermission('edit_stock'), asyncHandler(create));
router.patch('/:id', requirePermission('edit_stock'), asyncHandler(update));
router.delete('/:id', requirePermission('delete_part'), asyncHandler(remove));

export default router;
