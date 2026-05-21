import { Router } from 'express';
import { authenticate } from '../auth.js';
import { hasPermission, hasRole } from '../permissions.js';
import { list, reset, update } from '../controllers/rolePermissionController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

function requireAdminRoleEditor(req, res, next) {
  if (!hasRole(req.user, 'admin') || !hasPermission(req.user, 'manage_roles')) {
    return res.status(403).json({ message: 'You do not have permission to manage role permissions' });
  }
  next();
}

router.use(authenticate, requireAdminRoleEditor);
router.get('/', asyncHandler(list));
router.patch('/:role', asyncHandler(update));
router.post('/reset/:role', asyncHandler(reset));

export default router;
