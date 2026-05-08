import { Router } from 'express';
import { authenticate } from '../auth.js';
import { create, list } from '../controllers/communicationController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.post('/', asyncHandler(create));
router.get('/', asyncHandler(list));

export default router;
