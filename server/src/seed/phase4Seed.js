import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDb } from '../db.js';
import AuditLog from '../models/AuditLog.js';
import Communication from '../models/Communication.js';
import Customer from '../models/Customer.js';
import Invoice from '../models/Invoice.js';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import WorkOrder from '../models/WorkOrder.js';

const DEMO = 'PHASE4-DEMO';

if (process.env.NODE_ENV === 'production') {
  console.error('Phase 4 demo seed is disabled in production.');
  process.exit(1);
}

function log(label, created) {
  console.log(`${created ? 'created' : 'exists '} ${label}`);
}

async function firstOrCreateCustomer() {
  const existing = await Customer.findOne();
  if (existing) return existing;
  return Customer.create({ name: 'Phase4 Demo Customer', phone: 'DEMO-P4-CUST', address: 'Demo Address, Sample City', devices: ['Demo Laptop'] });
}

async function firstTech() {
  return User.findOne({ role: 'technician', active: true }) || User.findOne({ role: 'technician' });
}

async function createWorkOrderOnce(match, payload) {
  const existing = await WorkOrder.findOne(match);
  if (existing) return { item: existing, created: false };
  const item = await WorkOrder.create(payload);
  return { item, created: true };
}

async function createReminderOnce(payload) {
  const existing = await Reminder.findOne({ title: payload.title, type: payload.type, relatedId: payload.relatedId });
  if (existing) return false;
  await Reminder.create(payload);
  return true;
}

async function createCommunicationOnce(payload) {
  const existing = await Communication.findOne({ message: payload.message, type: payload.type });
  if (existing) return false;
  await Communication.create(payload);
  return true;
}

async function createAuditOnce(payload) {
  const existing = await AuditLog.findOne({ action: payload.action, module: payload.module, recordId: payload.recordId });
  if (existing) return false;
  await AuditLog.create(payload);
  return true;
}

try {
  await connectDb();
  const admin = await User.findOne({ role: 'admin' });
  const technician = await firstTech();
  const customer = await firstOrCreateCustomer();

  const overdue = await createWorkOrderOnce(
    { issue: `${DEMO} overdue diagnosis` },
    {
      customerId: customer._id,
      device: 'Demo Overdue Laptop',
      issue: `${DEMO} overdue diagnosis`,
      technicianId: technician?._id || null,
      status: 'In Progress',
      timeline: [{ status: 'In Progress', message: `${DEMO} overdue job`, userId: admin?._id || null }]
    }
  );
  await WorkOrder.updateOne({ _id: overdue.item._id }, { $set: { updatedAt: new Date(Date.now() - 48 * 60 * 60 * 1000) } });
  log('overdue job', overdue.created);

  const awaiting = await createWorkOrderOnce(
    { issue: `${DEMO} awaiting parts` },
    {
      customerId: customer._id,
      device: 'Demo Awaiting Parts Laptop',
      issue: `${DEMO} awaiting parts`,
      technicianId: technician?._id || null,
      status: 'Awaiting Parts',
      partRequests: [{ name: 'Laptop Charger', quantity: 1, status: 'Requested', userId: technician?._id || null }],
      timeline: [{ status: 'Awaiting Parts', message: `${DEMO} awaiting parts job`, userId: admin?._id || null }]
    }
  );
  log('awaiting parts job', awaiting.created);

  let invoice = await Invoice.findOne({ invoiceNumber: `${DEMO}-OVERDUE-PAYMENT` });
  if (!invoice) {
    invoice = await Invoice.create({
      invoiceNumber: `${DEMO}-OVERDUE-PAYMENT`,
      workOrderId: overdue.item._id,
      customerId: customer._id,
      items: [{ description: 'Overdue payment demo', quantity: 1, rate: 2400, amount: 2400 }],
      total: 2400,
      paidAmount: 0,
      balance: 2400,
      status: 'Pending'
    });
    await Invoice.updateOne({ _id: invoice._id }, { $set: { createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) } });
    log('overdue payment invoice', true);
  } else {
    log('overdue payment invoice', false);
  }

  const reminders = [
    { title: 'Pending payment', message: 'Demo invoice payment is overdue.', type: 'payment', priority: 'high', relatedId: invoice._id },
    { title: 'Work order not updated', message: 'Demo overdue job needs an update.', type: 'work_order', priority: 'medium', relatedId: overdue.item._id },
    { title: 'Low stock', message: 'Demo low stock needs attention.', type: 'stock', priority: 'critical', relatedId: customer._id }
  ];
  for (const reminder of reminders) log(`reminder ${reminder.title}`, await createReminderOnce(reminder));

  const communications = [
    { customerId: customer._id, workOrderId: overdue.item._id, type: 'Call', message: `${DEMO} called customer about diagnosis`, createdBy: admin?._id || technician?._id },
    { customerId: customer._id, workOrderId: overdue.item._id, type: 'WhatsApp', message: `${DEMO} sent estimate update`, createdBy: admin?._id || technician?._id },
    { customerId: customer._id, workOrderId: awaiting.item._id, type: 'Email', message: `${DEMO} emailed parts delay`, createdBy: admin?._id || technician?._id },
    { customerId: customer._id, workOrderId: awaiting.item._id, type: 'Note', message: `${DEMO} internal follow-up note`, createdBy: technician?._id || admin?._id }
  ];
  for (const communication of communications) log(`communication ${communication.type}`, await createCommunicationOnce(communication));

  const audits = [
    { userId: admin?._id, action: 'status_changed', module: 'work_order', recordId: overdue.item._id, before: { status: 'Pending' }, after: { status: 'In Progress' } },
    { userId: admin?._id, action: 'auto_assigned', module: 'work_order', recordId: overdue.item._id, before: { technicianId: null }, after: { technicianId: technician?._id } },
    { userId: technician?._id, action: 'part_requested', module: 'work_order', recordId: awaiting.item._id, before: null, after: { part: 'Laptop Charger' } },
    { userId: admin?._id, action: 'payment_recorded', module: 'payment', recordId: invoice._id, before: { balance: 2400 }, after: { balance: 2400 } },
    { userId: admin?._id, action: 'created', module: 'document', recordId: invoice._id, before: null, after: { type: 'invoice' } }
  ];
  for (const audit of audits) log(`audit ${audit.action}`, await createAuditOnce(audit));

  console.log('Phase 4 seed complete.');
  await mongoose.disconnect();
} catch (error) {
  console.error('Phase 4 seed failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
}
