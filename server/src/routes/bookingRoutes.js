import { Router } from 'express';
import { authenticate } from '../auth.js';
import { requirePermission } from '../permissions.js';
import { create, list, update } from '../controllers/bookingController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.get('/', authenticate, requirePermission('view_bookings'), asyncHandler(list));
router.post('/', authenticate, requirePermission('create_booking'), asyncHandler(create));
router.patch('/:id', authenticate, requirePermission('edit_booking'), asyncHandler(update));

export default router;
