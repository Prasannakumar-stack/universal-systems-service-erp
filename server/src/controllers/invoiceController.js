import Customer from '../models/Customer.js';
import AMCContract from '../models/AMCContract.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import WorkOrder from '../models/WorkOrder.js';
import { createInvoice } from '../services/invoiceService.js';
import { clean, required } from '../utils/http.js';
import { addDateRange, paginatedPayload, paginationMeta, parsePagination, searchRegex, validObjectId, withNestedIds } from '../utils/pagination.js';

export async function create(req, res) {
  if (!req.body.workOrderId && !req.body.amcContractId) required(req.body, ['workOrderId']);
  const invoice = await createInvoice(req.body, req.user);
  res.status(201).json({ invoice, message: 'Invoice generated' });
}

export async function list(req, res) {
  try {
    const filter = {};
    const clauses = [];
    const { page, limit, skip } = parsePagination(req.query);

    if (validObjectId(req.query.invoiceId)) filter._id = validObjectId(req.query.invoiceId);
    if (validObjectId(req.query.customerId)) filter.customerId = validObjectId(req.query.customerId);
    if (clean(req.query.status)) filter.status = clean(req.query.status);
    if (clean(req.query.paymentStatus)) {
      const paymentStatus = clean(req.query.paymentStatus).toLowerCase();
      if (['unpaid', 'pending'].includes(paymentStatus)) filter.balance = { $gt: 0 };
      if (paymentStatus === 'paid') filter.balance = { $lte: 0 };
      if (paymentStatus === 'partial') filter.status = 'Partial';
    }
    addDateRange(filter, req.query);

    if (clean(req.query.method)) {
      const invoiceIds = await Payment.distinct('invoiceId', { method: clean(req.query.method) });
      clauses.push({ _id: { $in: invoiceIds } });
    }

    const regex = searchRegex(req.query.search);
    if (regex) {
      const [customers, workOrders] = await Promise.all([
        Customer.find({ $or: [{ name: regex }, { phone: regex }, { email: regex }] }).select('_id').limit(1000).lean(),
        WorkOrder.find({ $or: [{ device: regex }, { issue: regex }, { serviceType: regex }] }).select('_id').limit(1000).lean()
      ]);
      const amcContracts = await AMCContract.find({ $or: [{ contractId: regex }, { customerName: regex }, { phone: regex }, { contractType: regex }, { coverageType: regex }, { coveredService: regex }, { coveredDevices: regex }] }).select('_id').limit(1000).lean();
      const searchFields = [
        { invoiceNumber: regex },
        { title: regex },
        { notes: regex },
        { status: regex },
        { customerId: { $in: customers.map((item) => item._id) } },
        { workOrderId: { $in: workOrders.map((item) => item._id) } },
        { amcContractId: { $in: amcContracts.map((item) => item._id) } }
      ];
      const objectId = validObjectId(req.query.search);
      if (objectId) searchFields.push({ _id: objectId });
      clauses.push({ $or: searchFields });
    }
    if (clauses.length) filter.$and = clauses;

    const [total, rows, summaryRows, paymentMethods] = await Promise.all([
      Invoice.countDocuments(filter),
      Invoice.find(filter)
        .select('invoiceNumber workOrderId amcContractId customerId title notes total paidAmount balance status adjustmentForInvoiceId createdAt updatedAt')
        .populate('workOrderId amcContractId customerId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Invoice.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalInvoices: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] } },
            partial: { $sum: { $cond: [{ $eq: ['$status', 'Partial'] }, 1, 0] } },
            paid: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] } },
            totalValue: { $sum: { $ifNull: ['$total', 0] } },
            balance: { $sum: { $ifNull: ['$balance', 0] } }
          }
        }
      ]),
      Payment.distinct('method')
    ]);
    const invoices = rows.map((invoice) => withNestedIds(invoice, ['workOrderId', 'amcContractId', 'customerId']));
    const summary = summaryRows[0] || { totalInvoices: 0, pending: 0, partial: 0, paid: 0, totalValue: 0, balance: 0 };
    res.json(paginatedPayload('invoices', invoices, paginationMeta(page, limit, total), {
      summary,
      paymentMethods: paymentMethods.filter(Boolean).sort()
    }));
  } catch (error) {
    console.error('Invoice list failed', error);
    res.status(500).json({ success: false, message: 'Unable to load invoices right now' });
  }
}
