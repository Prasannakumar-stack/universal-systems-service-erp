import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { createContract, listContracts, listRenewals, listSchedule, postWorkOrder } from '../controllers/amcController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.get('/contracts', requireRole('admin', 'technician'), asyncHandler(listContracts));
router.post('/contracts', requireRole('admin'), asyncHandler(createContract));
router.get('/schedule', requireRole('admin', 'technician'), asyncHandler(listSchedule));
router.get('/renewals', requireRole('admin', 'technician'), asyncHandler(listRenewals));
router.post('/contracts/:id/work-orders', requireRole('admin'), asyncHandler(postWorkOrder));

export default router;
