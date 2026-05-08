import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { create, list, remove, update } from '../controllers/inventoryController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.get('/', asyncHandler(list));
router.post('/', requireRole('admin'), asyncHandler(create));
router.patch('/:id', requireRole('admin'), asyncHandler(update));
router.delete('/:id', requireRole('admin'), asyncHandler(remove));

export default router;
