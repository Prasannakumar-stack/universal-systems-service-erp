import { Router } from 'express';
import { authenticate } from '../auth.js';
import { requireAnyPermission } from '../permissions.js';
import { create, list } from '../controllers/communicationController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.post('/', requireAnyPermission('add_notes', 'edit_customer'), asyncHandler(create));
router.get('/', requireAnyPermission('add_notes', 'view_customers'), asyncHandler(list));

export default router;
