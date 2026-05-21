import { Router } from 'express';
import { authenticate } from '../auth.js';
import { requirePermission } from '../permissions.js';
import { createContract, listContracts, listRenewals, listSchedule, postWorkOrder } from '../controllers/amcController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.get('/contracts', requirePermission('view_amc'), asyncHandler(listContracts));
router.post('/contracts', requirePermission('create_amc'), asyncHandler(createContract));
router.get('/schedule', requirePermission('view_amc'), asyncHandler(listSchedule));
router.get('/renewals', requirePermission('view_amc'), asyncHandler(listRenewals));
router.post('/contracts/:id/work-orders', requirePermission('create_amc_job'), asyncHandler(postWorkOrder));

export default router;
