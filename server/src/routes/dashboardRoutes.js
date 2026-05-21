import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { requirePermission } from '../permissions.js';
import { adminMetrics, adminStats, technicianStats } from '../controllers/dashboardController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.get('/metrics', authenticate, requirePermission('view_business_dashboard'), asyncHandler(adminMetrics));
router.get('/admin', authenticate, requirePermission('view_business_dashboard'), asyncHandler(adminStats));
router.get('/technician', authenticate, requireRole('technician'), asyncHandler(technicianStats));

export default router;
