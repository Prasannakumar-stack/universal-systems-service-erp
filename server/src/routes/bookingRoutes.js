import { Router } from 'express';
import { authenticate } from '../auth.js';
import { requirePermission } from '../permissions.js';
import { create, list } from '../controllers/bookingController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.get('/', authenticate, requirePermission('view_bookings'), asyncHandler(list));
router.post('/', authenticate, requirePermission('create_booking'), asyncHandler(create));

export default router;
