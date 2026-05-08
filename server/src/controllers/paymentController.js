import Payment from '../models/Payment.js';
import { recordPayment } from '../services/paymentService.js';
import { required } from '../utils/http.js';

export async function create(req, res) {
  required(req.body, ['invoiceId', 'method']);
  const payment = await recordPayment({ ...req.body, userId: req.user._id });
  res.status(201).json({ payment, message: 'Payment recorded' });
}

export async function list(_req, res) {
  const filter = {};
  if (_req.query.status) filter.status = _req.query.status;
  if (_req.query.customerId) filter.customerId = _req.query.customerId;
  if (_req.query.dateFrom || _req.query.dateTo) {
    filter.createdAt = {};
    if (_req.query.dateFrom) filter.createdAt.$gte = new Date(_req.query.dateFrom);
    if (_req.query.dateTo) filter.createdAt.$lte = new Date(_req.query.dateTo);
  }
  const payments = await Payment.find(filter).populate('invoiceId customerId').sort({ createdAt: -1 });
  res.json({ payments });
}
