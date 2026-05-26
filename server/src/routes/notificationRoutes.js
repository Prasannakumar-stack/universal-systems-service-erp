import { Router } from 'express';
import { authenticate } from '../auth.js';
import { clearAll, list, markAllRead, markRead } from '../controllers/notificationController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.get('/', asyncHandler(list));
router.patch('/read-all', asyncHandler(markAllRead));
router.delete('/', asyncHandler(clearAll));
router.patch('/:id/read', asyncHandler(markRead));

export default router;
