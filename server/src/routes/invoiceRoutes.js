import { Router } from 'express';
import { authenticate } from '../auth.js';
import { hasPermission, requirePermission } from '../permissions.js';
import { create, list } from '../controllers/invoiceController.js';
import { asyncHandler } from '../utils/http.js';

const router = Router();

function requireInvoiceWrite(req, res, next) {
  const action = req.body?.amcExtraAction || req.body?.extraInvoiceAction;
  const isEdit = Boolean(req.body?.invoiceId || action);
  const permission = isEdit ? 'edit_invoice' : 'create_invoice';
  if (!hasPermission(req.user, permission)) {
    return res.status(403).json({ message: 'You do not have permission to access this resource' });
  }
  next();
}

router.use(authenticate);
router.get('/', requirePermission('view_invoices'), asyncHandler(list));
router.post('/', requireInvoiceWrite, asyncHandler(create));

export default router;
