import { randomUUID } from 'node:crypto';
import Invoice from '../models/Invoice.js';
import WorkOrder from '../models/WorkOrder.js';
import { appError, clean, numberValue } from '../utils/http.js';
import { logAudit } from './auditService.js';

function invoiceNumber() {
  return `INV-${new Date().getFullYear()}-${randomUUID().slice(0, 7).toUpperCase()}`;
}

function invoiceStatus(total, paidAmount) {
  if (paidAmount >= total && total > 0) return 'Paid';
  if (paidAmount > 0) return 'Partial';
  return 'Pending';
}

export async function createInvoice(payload, user = null) {
  const workOrder = await WorkOrder.findById(payload.workOrderId);
  if (!workOrder) throw appError('Work order not found', 404);

  const labour = numberValue(payload.labourCharge, 0);
  const items = [];
  if (labour > 0) items.push({ description: 'Labour charge', quantity: 1, rate: labour, amount: labour });
  workOrder.partsUsed.forEach((part) => {
    items.push({ description: part.name, quantity: part.quantity, rate: part.unitPrice, amount: part.total });
  });
  (payload.items || []).forEach((item) => {
    const quantity = Math.max(1, numberValue(item.quantity, 1));
    const rate = numberValue(item.rate, 0);
    items.push({ description: clean(item.description), quantity, rate, amount: quantity * rate });
  });
  if (!items.length) throw appError('Invoice needs at least one charge or part');

  const total = items.reduce((sum, item) => sum + item.amount, 0);
  const invoice = await Invoice.create({
    invoiceNumber: invoiceNumber(),
    workOrderId: workOrder._id,
    customerId: workOrder.customerId,
    items,
    total,
    paidAmount: 0,
    balance: total,
    status: 'Pending'
  });

  workOrder.invoiceId = invoice._id;
  workOrder.timeline.push({ status: workOrder.status, message: `Invoice ${invoice.invoiceNumber} generated` });
  await workOrder.save();
  try {
    await logAudit({
      userId: user?._id || user?.id || null,
      action: 'invoice_generated',
      module: 'invoice',
      recordId: invoice._id,
      after: {
        entityType: 'Invoice',
        invoiceId: invoice._id,
        invoiceNumber: invoice.invoiceNumber,
        workOrderId: workOrder._id,
        bookingId: workOrder.bookingId || null,
        customerId: workOrder.customerId,
        amount: invoice.total,
        timestamp: invoice.createdAt
      }
    });
  } catch (error) {
    console.warn('Audit log failed for invoice generation:', error.message);
  }
  return invoice;
}

export async function applyPaymentToInvoice(invoiceId, paidAmount) {
  const invoice = await Invoice.findById(invoiceId);
  if (!invoice) throw appError('Invoice not found', 404);
  invoice.paidAmount = Math.min(invoice.total, invoice.paidAmount + paidAmount);
  invoice.balance = Math.max(0, invoice.total - invoice.paidAmount);
  invoice.status = invoiceStatus(invoice.total, invoice.paidAmount);
  await invoice.save();
  return invoice;
}
