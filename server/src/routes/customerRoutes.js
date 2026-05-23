import { Router } from 'express';
import { authenticate } from '../auth.js';
import { requirePermission } from '../permissions.js';
import { create, getById, list, update } from '../controllers/customerController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.post('/', requirePermission('create_customer'), asyncHandler(create));
router.get('/', requirePermission('view_customers'), asyncHandler(list));
router.patch('/:id', requirePermission('edit_customer'), asyncHandler(update));
router.get('/:id', requirePermission('view_customer_360'), asyncHandler(getById));

export default router;
