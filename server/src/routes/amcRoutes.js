import { Router } from 'express';
import { authenticate, requireRole } from '../auth.js';
import { requirePermission } from '../permissions.js';
import { archiveContract, createContract, listContracts, listRenewals, listSchedule, moveContractToTrash, patchAssignment, postWorkOrder, removeContract, removeContractPermanently, restoreContract } from '../controllers/amcController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

router.use(authenticate);
router.get('/contracts', requirePermission('view_amc'), asyncHandler(listContracts));
router.post('/contracts', requirePermission('create_amc'), asyncHandler(createContract));
router.patch('/contracts/:id/assignment', requirePermission('assign_technician'), asyncHandler(patchAssignment));
router.patch('/contracts/:id/archive', requirePermission('create_amc'), asyncHandler(archiveContract));
router.patch('/contracts/:id/move-to-trash', requirePermission('create_amc'), asyncHandler(moveContractToTrash));
router.post('/contracts/:id/restore', requirePermission('create_amc'), asyncHandler(restoreContract));
router.delete('/contracts/:id/permanent', requireRole('admin', 'super_admin'), requirePermission('create_amc'), asyncHandler(removeContractPermanently));
router.delete('/contracts/:id', requirePermission('create_amc'), asyncHandler(removeContract));
router.get('/schedule', requirePermission('view_amc'), asyncHandler(listSchedule));
router.get('/renewals', requirePermission('view_amc'), asyncHandler(listRenewals));
router.post('/contracts/:id/work-orders', requirePermission('create_amc_job'), asyncHandler(postWorkOrder));

export default router;
