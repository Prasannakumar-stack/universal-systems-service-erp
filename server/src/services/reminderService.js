import Document from '../models/Document.js';
import InventoryPart from '../models/InventoryPart.js';
import Invoice from '../models/Invoice.js';
import Reminder from '../models/Reminder.js';
import WorkOrder from '../models/WorkOrder.js';

async function upsertReminder(payload) {
  return Reminder.findOneAndUpdate(
    { type: payload.type, relatedId: payload.relatedId, title: payload.title },
    { $setOnInsert: payload },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

export async function refreshSmartReminders() {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [pendingInvoices, staleWorkOrders, quotations, lowStockParts] = await Promise.all([
    Invoice.find({ balance: { $gt: 0 }, status: { $in: ['Pending', 'Partial'] } }).limit(20),
    WorkOrder.find({ status: { $ne: 'Completed' }, updatedAt: { $lt: dayAgo } }).limit(20),
    Document.find({ type: 'quotation', status: { $ne: 'approved' } }).limit(20),
    InventoryPart.find({ $expr: { $lte: ['$available', '$lowStockLimit'] } }).limit(20)
  ]);

  await Promise.all([
    ...pendingInvoices.map((invoice) => upsertReminder({
      title: 'Pending payment',
      message: `${invoice.invoiceNumber} has ${invoice.balance} balance due.`,
      type: 'payment',
      priority: 'high',
      relatedId: invoice._id
    })),
    ...staleWorkOrders.map((order) => upsertReminder({
      title: 'Work order not updated',
      message: `${order.device} has not been updated for over 24 hours.`,
      type: 'work_order',
      priority: 'medium',
      relatedId: order._id
    })),
    ...quotations.map((document) => upsertReminder({
      title: 'Quotation awaiting approval',
      message: `Quotation for ${document.totalAmount} is still awaiting approval.`,
      type: 'quotation',
      priority: 'medium',
      relatedId: document._id
    })),
    ...lowStockParts.map((part) => upsertReminder({
      title: 'Low stock',
      message: `${part.partName} has ${part.available} available.`,
      type: 'stock',
      priority: part.available <= 0 ? 'critical' : 'high',
      relatedId: part._id
    }))
  ]);
}
