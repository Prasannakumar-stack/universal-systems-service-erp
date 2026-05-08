import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { list } from '../controllers/auditLogController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate, requireRole('admin'));
router.get('/', asyncHandler(list));

export default router;
