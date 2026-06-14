import Customer from '../models/Customer.js';
import AMCContract from '../models/AMCContract.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import { recordPayment, reversePayment } from '../services/paymentService.js';
import { getTechnicianScope } from '../services/technicianScopeService.js';
import { clean, required } from '../utils/http.js';
import { addDateRange, paginatedPayload, paginationMeta, parsePagination, searchRegex, validObjectId, withNestedIds } from '../utils/pagination.js';

export async function create(req, res) {
  required(req.body, ['invoiceId', 'method']);
  const payment = await recordPayment({ ...req.body, userId: req.user._id }, req.user);
  res.status(201).json({ payment, message: 'Payment recorded' });
}

export async function reverse(req, res) {
  const result = await reversePayment(req.params.id, req.body, req.user);
  res.json({ ...result, message: 'Payment reversed successfully.' });
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
    const technicianScope = await getTechnicianScope(req.user);
    if (technicianScope) clauses.push({ invoiceId: { $in: technicianScope.invoiceObjectIds } });

    const regex = searchRegex(req.query.search);
    if (regex) {
      const [customers, amcContracts] = await Promise.all([
        Customer.find({ $or: [{ name: regex }, { phone: regex }, { email: regex }] }).select('_id').limit(1000).lean(),
        AMCContract.find({ $or: [{ contractId: regex }, { customerName: regex }, { phone: regex }, { contractType: regex }, { coverageType: regex }, { coveredService: regex }, { coveredDevices: regex }] }).select('_id').limit(1000).lean()
      ]);
      const invoices = await Invoice.find({
        $or: [
          { invoiceNumber: regex },
          { title: regex },
          { notes: regex },
          { amcContractId: { $in: amcContracts.map((item) => item._id) } }
        ]
      }).select('_id').limit(1000).lean();
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
    const invoiceSummaryFilter = technicianScope ? { _id: { $in: technicianScope.invoiceObjectIds } } : {};
    const paymentSummaryFilter = { ...filter };
    if (paymentSummaryFilter.status === 'Reversed') {
      paymentSummaryFilter.status = '__no_active_payment_status__';
    } else if (!paymentSummaryFilter.status) {
      paymentSummaryFilter.status = { $ne: 'Reversed' };
    }

    const [total, rows, paymentSummaryRows, invoiceSummaryRows, methods] = await Promise.all([
      Payment.countDocuments(filter),
      Payment.find(filter)
        .select('invoiceId customerId amount paidAmount balance status method transactionId reversalReason reversedAt reversedBy createdAt updatedAt')
        .populate({ path: 'invoiceId', populate: [{ path: 'workOrderId' }, { path: 'amcContractId' }] })
        .populate('customerId')
        .populate('reversedBy', 'name username role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.aggregate([
        { $match: paymentSummaryFilter },
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
        { $match: invoiceSummaryFilter },
        {
          $group: {
            _id: null,
            pendingBalance: { $sum: { $ifNull: ['$balance', 0] } },
            paidInvoices: { $sum: { $cond: [{ $eq: ['$status', 'Paid'] }, 1, 0] } },
            partialInvoices: { $sum: { $cond: [{ $eq: ['$status', 'Partial'] }, 1, 0] } }
          }
        }
      ]),
      Payment.distinct('method', { ...(technicianScope ? { invoiceId: { $in: technicianScope.invoiceObjectIds } } : {}), status: { $ne: 'Reversed' } })
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
