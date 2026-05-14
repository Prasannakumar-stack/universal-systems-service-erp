import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { create, list, resetPassword, update, updateStatus } from '../controllers/userController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate, requireRole('admin'));
router.get('/', asyncHandler(list));
router.post('/', asyncHandler(create));
router.patch('/:id/status', asyncHandler(updateStatus));
router.patch('/:id/reset-password', asyncHandler(resetPassword));
router.patch('/:id', asyncHandler(update));

export default router;
