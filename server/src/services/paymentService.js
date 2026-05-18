import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import { appError, clean, numberValue } from '../utils/http.js';
import { logAudit } from './auditService.js';
import { createNotification } from './notificationService.js';

function invoiceStatus(total, paidAmount) {
  if (total - paidAmount <= 0) return 'Paid';
  if (paidAmount > 0) return 'Partial';
  return 'Pending';
}

export async function recordPayment(payload) {
  const invoice = await Invoice.findById(payload.invoiceId);
  if (!invoice) throw appError('Invoice not found', 404);
  if (invoice.status === 'Void') throw appError('Cannot record payment against a void invoice', 400);

  const paidAmount = numberValue(payload.paidAmount ?? payload.amount, 0);
  if (paidAmount <= 0) throw appError('Payment amount must be greater than zero');
  if (!['Cash', 'UPI'].includes(payload.method)) throw appError('Payment method must be Cash or UPI');

  const previousPayments = await Payment.find({ invoiceId: invoice._id });
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
