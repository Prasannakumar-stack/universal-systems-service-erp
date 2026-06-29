import { Router } from 'express';
import { authenticate } from '../auth.js';
import { requirePermission } from '../permissions.js';
import { clearAll, clearOlderThan, exportCsv, list, stats } from '../controllers/auditLogController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate, requirePermission('view_audit_logs'));
router.get('/stats', asyncHandler(stats));
router.get('/export.csv', asyncHandler(exportCsv));
router.delete('/older-than/:days', asyncHandler(clearOlderThan));
router.delete('/all', asyncHandler(clearAll));
router.get('/', asyncHandler(list));

export default router;
