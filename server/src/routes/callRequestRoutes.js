import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { convert, list, update } from '../controllers/callRequestController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate, requireRole('admin'));
router.get('/', asyncHandler(list));
router.patch('/:id', asyncHandler(update));
router.post('/:id/convert', asyncHandler(convert));

export default router;
