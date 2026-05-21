import { Router } from 'express';
import { authenticate } from '../auth.js';
import { requirePermission } from '../permissions.js';
import { convert, list, update } from '../controllers/callRequestController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate, requirePermission('manage_call_requests'));
router.get('/', asyncHandler(list));
router.patch('/:id', asyncHandler(update));
router.post('/:id/convert', asyncHandler(convert));

export default router;
