import { Router } from 'express';
import { authenticate } from '../auth.js';
import { requirePermission } from '../permissions.js';
import { create, list, resetPassword, update, updateStatus } from '../controllers/userController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate, requirePermission('manage_users'));
router.get('/', asyncHandler(list));
router.post('/', asyncHandler(create));
router.patch('/:id/status', asyncHandler(updateStatus));
router.patch('/:id/reset-password', asyncHandler(resetPassword));
router.patch('/:id', asyncHandler(update));

export default router;
