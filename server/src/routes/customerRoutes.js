import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { create, getById, list } from '../controllers/customerController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.post('/', requireRole('admin'), asyncHandler(create));
router.get('/', asyncHandler(list));
router.get('/:id', asyncHandler(getById));

export default router;
