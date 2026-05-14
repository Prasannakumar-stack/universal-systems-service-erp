import Customer from '../models/Customer.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import { recordPayment } from '../services/paymentService.js';
import { clean, required } from '../utils/http.js';
import { addDateRange, paginatedPayload, paginationMeta, parsePagination, searchRegex, validObjectId, withNestedIds } from '../utils/pagination.js';

export async function create(req, res) {
  required(req.body, ['invoiceId', 'method']);
  const payment = await recordPayment({ ...req.body, userId: req.user._id });
  res.status(201).json({ payment, message: 'Payment recorded' });
}

export async function list(req, res) {
  try {
    const filter = {};
    const clauses = [];
    const { page, limit, skip } = parsePagination(req.query);
    if (clean(req.query.status)) filter.status = clean(req.query.status);
    if (clean(req.query.method)) filter.method = clean(req.query.method);
    if (validObjectId(req.query.customerId)) filter.customerId = validObjectId(req.query.customerId);
    if (validObjectId(req.query.invoiceId)) filter.invoiceId = validObjectId(req.query.invoiceId);
    addDateRange(filter, req.query);

    const regex = searchRegex(req.query.search);
    if (regex) {
      const [customers, invoices] = await Promise.all([
        Customer.find({ $or: [{ name: regex }, { phone: regex }, { email: regex }] }).select('_id').limit(1000).lean(),
        Invoice.find({ invoiceNumber: regex }).select('_id').limit(1000).lean()
      ]);
      const searchFields = [
        { method: regex },
        { status: regex },
        { customerId: { $in: customers.map((item) => item._id) } },
        { invoiceId: { $in: invoices.map((item) => item._id) } }
      ];
      const objectId = validObjectId(req.query.search);
      if (objectId) searchFields.push({ _id: objectId });
      clauses.push({ $or: searchFields });
    }
    if (clauses.length) filter.$and = clauses;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [total, rows, paymentSummaryRows, invoiceSummaryRows, methods] = await Promise.all([
      Payment.countDocuments(filter),
      Payment.find(filter)
        .select('invoiceId customerId amount paidAmount balance status method transactionId createdAt updatedAt')
        .populate('invoiceId customerId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalCollected: { $sum: { $ifNull: ['$paidAmount', 0] } },
            totalPayments: { $sum: 1 },
            todayCollection: {
              $sum: {
                $cond: [
                  { $and: [{ $gte: ['$createdAt', today] }, { $lt: ['$createdAt', tomorrow] }] },
                  { $ifNull: ['$paidAmount', 0] },
                  0
                ]
              }
            }
          }
        }
      ]),
      Invoice.aggregate([
        {
          $group: {
            _id: null,
            pendingBalance: { $sum: { $ifNull: ['$balance', 0] } },
            paidInvoices: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] } },
            partialInvoices: { $sum: { $cond: [{ $eq: ['$status', 'Partial'] }, 1, 0] } }
          }
        }
      ]),
      Payment.distinct('method')
    ]);
    const payments = rows.map((payment) => withNestedIds(payment, ['invoiceId', 'customerId']));
    const summary = {
      ...(paymentSummaryRows[0] || { totalCollected: 0, totalPayments: 0, todayCollection: 0 }),
      ...(invoiceSummaryRows[0] || { pendingBalance: 0, paidInvoices: 0, partialInvoices: 0 })
    };
    res.json(paginatedPayload('payments', payments, paginationMeta(page, limit, total), {
      summary,
      methods: methods.filter(Boolean).sort()
    }));
  } catch (error) {
    console.error('Payment list failed', error);
    res.status(500).json({ success: false, message: 'Unable to load payments right now' });
  }
}
