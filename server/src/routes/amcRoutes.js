import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { createContract, listContracts, listRenewals, listSchedule, postWorkOrder } from '../controllers/amcController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate, requireRole('admin'));
router.get('/contracts', asyncHandler(listContracts));
router.post('/contracts', asyncHandler(createContract));
router.get('/schedule', asyncHandler(listSchedule));
router.get('/renewals', asyncHandler(listRenewals));
router.post('/contracts/:id/work-orders', asyncHandler(postWorkOrder));

export default router;
