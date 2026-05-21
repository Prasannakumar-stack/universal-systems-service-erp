import { Router } from 'express';
import { authenticate } from '../auth.js';
import { requirePermission } from '../permissions.js';
import { list } from '../controllers/auditLogController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate, requirePermission('view_audit_logs'));
router.get('/', asyncHandler(list));

export default router;
