import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import { assertPermission } from '../permissions.js';
import { appError, clean, numberValue } from '../utils/http.js';
import { logAudit } from './auditService.js';
import { createNotification } from './notificationService.js';

function invoiceStatus(total, paidAmount) {
  if (total - paidAmount <= 0) return 'Paid';
  if (paidAmount > 0) return 'Partial';
  return 'Pending';
}

function activePaymentFilter(invoiceId) {
  return { invoiceId, status: { $ne: 'Reversed' } };
}

async function syncInvoicePaymentState(invoice) {
  const activePayments = await Payment.find(activePaymentFilter(invoice._id)).select('paidAmount').lean();
  const totalPaid = activePayments.reduce((sum, payment) => sum + Number(payment.paidAmount || 0), 0);
  const cappedPaid = Math.min(Number(invoice.total || 0), Math.max(0, totalPaid));
  invoice.paidAmount = cappedPaid;
  invoice.balance = Math.max(0, Number(invoice.total || 0) - cappedPaid);
  invoice.status = invoiceStatus(Number(invoice.total || 0), cappedPaid);
  await invoice.save();
  return invoice;
}

export async function recordPayment(payload, user = null) {
  assertPermission(user, 'record_payment');
  const invoice = await Invoice.findById(payload.invoiceId);
  if (!invoice) throw appError('Invoice not found', 404);
  if (invoice.status === 'Void') throw appError('Cannot record payment against a void invoice', 400);

  const paidAmount = numberValue(payload.paidAmount ?? payload.amount, 0);
  if (paidAmount <= 0) throw appError('Payment amount must be greater than zero');
  if (!['Cash', 'UPI'].includes(payload.method)) throw appError('Payment method must be Cash or UPI');

  const previousPayments = await Payment.find(activePaymentFilter(invoice._id));
  const previousPaid = previousPayments.reduce((sum, payment) => sum + Number(payment.paidAmount || 0), 0);
  const currentBalance = Math.max(0, Number(invoice.total || 0) - previousPaid);
  if (paidAmount > currentBalance) throw appError('Amount exceeds balance');

  const before = { balance: currentBalance, paidAmount: previousPaid };
  const totalPaid = previousPaid + paidAmount;
  const balance = Math.max(0, Number(invoice.total || 0) - totalPaid);
  invoice.paidAmount = Math.min(Number(invoice.total || 0), totalPaid);
  invoice.balance = balance;
  invoice.status = invoiceStatus(Number(invoice.total || 0), invoice.paidAmount);
  await invoice.save();

  const payment = await Payment.create({
    invoiceId: invoice._id,
    customerId: invoice.customerId,
    amount: invoice.total,
    paidAmount,
    balance: invoice.balance,
    status: invoice.status,
    method: payload.method,
    transactionId: payload.method === 'UPI' ? clean(payload.transactionId) : ''
  });

  if (invoice.status !== 'Paid') {
    await createNotification({
      title: 'Payment pending',
      message: `${invoice.invoiceNumber} has ${invoice.balance} balance due.`,
      type: 'PAYMENT',
      role: 'admin',
      sourceId: invoice._id
    });
  }

  await logAudit({
    userId: payload.userId || null,
    action: 'payment_recorded',
    module: 'payment',
    recordId: payment._id,
    before,
    after: { balance: invoice.balance, paidAmount: invoice.paidAmount, status: invoice.status }
  });

  return payment;
}

export async function reversePayment(paymentId, payload = {}, user = null) {
  assertPermission(user, 'edit_payment');
  if (user?.role !== 'admin') throw appError('Only admin users can reverse payments', 403);

  const reason = clean(payload.reason);
  if (!reason) throw appError('Reversal reason is required', 400);

  const payment = await Payment.findById(paymentId);
  if (!payment) throw appError('Payment not found', 404);
  if (!payment.invoiceId) throw appError('Payment is not linked to an invoice', 400);
  if (payment.status === 'Reversed' || payment.reversedAt) throw appError('Payment is already reversed', 400);
  if (numberValue(payment.paidAmount, 0) <= 0) throw appError('Only positive payments can be reversed', 400);

  const invoice = await Invoice.findById(payment.invoiceId);
  if (!invoice) throw appError('Linked invoice not found', 404);
  if (invoice.status === 'Void') throw appError('Cannot reverse payment against a void invoice', 400);

  const before = {
    paymentStatus: payment.status,
    invoicePaidAmount: invoice.paidAmount,
    invoiceBalance: invoice.balance,
    invoiceStatus: invoice.status
  };

  payment.status = 'Reversed';
  payment.reversalReason = reason;
  payment.reversedAt = new Date();
  payment.reversedBy = user?._id || user?.id || null;
  await payment.save();

  await syncInvoicePaymentState(invoice);

  await logAudit({
    userId: user?._id || user?.id || null,
    action: 'payment_reversed',
    module: 'payment',
    recordId: payment._id,
    before,
    after: {
      paymentStatus: payment.status,
      reversalReason: reason,
      reversedAt: payment.reversedAt,
      invoiceId: invoice._id,
      invoicePaidAmount: invoice.paidAmount,
      invoiceBalance: invoice.balance,
      invoiceStatus: invoice.status
    }
  });

  return { payment, invoice };
}
