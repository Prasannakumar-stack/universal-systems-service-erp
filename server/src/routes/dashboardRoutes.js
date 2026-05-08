import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { adminStats, technicianStats } from '../controllers/dashboardController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.get('/admin', authenticate, requireRole('admin'), asyncHandler(adminStats));
router.get('/technician', authenticate, requireRole('technician'), asyncHandler(technicianStats));

export default router;
