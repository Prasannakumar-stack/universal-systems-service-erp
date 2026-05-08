import Invoice from '../models/Invoice.js';
import { createInvoice } from '../services/invoiceService.js';
import { required } from '../utils/http.js';

export async function create(req, res) {
  required(req.body, ['workOrderId']);
  const invoice = await createInvoice(req.body, req.user);
  res.status(201).json({ invoice, message: 'Invoice generated' });
}

export async function list(_req, res) {
  const invoices = await Invoice.find().populate('workOrderId customerId').sort({ createdAt: -1 });
  res.json({ invoices });
}
