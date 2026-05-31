import { Router } from 'express';
import { authenticate } from '../auth.js';
import { requirePermission } from '../permissions.js';
import { create, detail, list, remove, update, uploadBill } from '../controllers/purchaseImportController.js';
import { asyncHandler } from '../utils/http.js';
import { handleUploadErrors, purchaseBillUpload } from '../upload.js';

const router = Router();

router.use(authenticate);
router.get('/', requirePermission('view_inventory'), asyncHandler(list));
router.get('/:id', requirePermission('view_inventory'), asyncHandler(detail));
router.post('/', requirePermission('edit_stock'), asyncHandler(create));
router.patch('/:id', requirePermission('edit_stock'), asyncHandler(update));
router.delete('/:id', requirePermission('delete_part'), asyncHandler(remove));
router.post('/:id/bill', requirePermission('edit_stock'), purchaseBillUpload.single('bill'), handleUploadErrors, asyncHandler(uploadBill));

export default router;
