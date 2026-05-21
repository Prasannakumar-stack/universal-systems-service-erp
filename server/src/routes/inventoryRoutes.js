import { Router } from 'express';
import { authenticate } from '../auth.js';
import { requireAnyPermission, requirePermission } from '../permissions.js';
import { create, list, remove, update } from '../controllers/inventoryController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.get('/', requireAnyPermission('view_inventory', 'manage_parts_used', 'create_part_request', 'approve_part_requests'), asyncHandler(list));
router.post('/', requirePermission('create_part'), asyncHandler(create));
router.patch('/:id', requirePermission('edit_stock'), asyncHandler(update));
router.delete('/:id', requirePermission('delete_part'), asyncHandler(remove));

export default router;
