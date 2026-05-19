import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { create, list } from '../controllers/bookingController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.get('/', authenticate, requireRole('admin', 'technician'), asyncHandler(list));
router.post('/', authenticate, requireRole('admin', 'technician'), asyncHandler(create));

export default router;
