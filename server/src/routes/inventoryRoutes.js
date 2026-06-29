import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { requireAnyPermission, requirePermission } from '../permissions.js';
import { create, disable, list, moveToTrash, remove, removePermanently, restore, update } from '../controllers/inventoryController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.get('/', requireAnyPermission('view_inventory', 'manage_parts_used', 'create_part_request', 'approve_part_requests'), asyncHandler(list));
router.post('/', requirePermission('create_part'), asyncHandler(create));
router.patch('/:id', requirePermission('edit_stock'), asyncHandler(update));
router.patch('/:id/disable', requirePermission('delete_part'), asyncHandler(disable));
router.patch('/:id/move-to-trash', requirePermission('delete_part'), asyncHandler(moveToTrash));
router.post('/:id/restore', requirePermission('delete_part'), asyncHandler(restore));
router.patch('/:id/enable', requirePermission('delete_part'), asyncHandler(restore));
router.delete('/:id/permanent', requireRole('admin', 'super_admin'), requirePermission('delete_part'), asyncHandler(removePermanently));
router.delete('/:id', requirePermission('delete_part'), asyncHandler(remove));

export default router;
