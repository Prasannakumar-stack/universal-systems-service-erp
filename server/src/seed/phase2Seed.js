import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDb } from '../db.js';
import User from '../models/User.js';
import Customer from '../models/Customer.js';
import InventoryPart from '../models/InventoryPart.js';
import StockMovement from '../models/StockMovement.js';
import WorkOrder from '../models/WorkOrder.js';
import Invoice from '../models/Invoice.js';
import Payment from '../models/Payment.js';
import Notification from '../models/Notification.js';

const DEMO = 'PHASE2-DEMO';

if (process.env.NODE_ENV === 'production') {
  console.error('Phase 2 demo seed is disabled in production.');
  process.exit(1);
}

async function upsertUser({ username, password, name, role }) {
  const existing = await User.findOne({ username });
  if (existing) {
    existing.name = name;
    existing.role = role;
    existing.active = true;
    existing.passwordHash = await bcrypt.hash(password, 10);
    await existing.save();
    return { item: existing, created: false };
  }
  const item = await User.create({ username, passwordHash: await bcrypt.hash(password, 10), name, role, active: true });
  return { item, created: true };
}

async function upsertCustomer(payload) {
  const existing = await Customer.findOne({ phone: payload.phone });
  if (existing) return { item: existing, created: false };
  const item = await Customer.create(payload);
  return { item, created: true };
}

async function upsertPart(payload) {
  const existing = await InventoryPart.findOne({ partName: payload.partName });
  if (existing) return { item: existing, created: false };
  const item = await InventoryPart.create({ ...payload, stock: payload.onHand, available: Math.max(0, payload.onHand - payload.reserved) });
  return { item, created: true };
}

async function upsertWorkOrder(payload) {
  const existing = await WorkOrder.findOne({ device: payload.device, issue: payload.issue });
  if (existing) return { item: existing, created: false };
  const item = await WorkOrder.create(payload);
  return { item, created: true };
}

async function upsertInvoice(payload) {
  const existing = await Invoice.findOne({ invoiceNumber: payload.invoiceNumber });
  if (existing) return { item: existing, created: false };
  const item = await Invoice.create(payload);
  return { item, created: true };
}

async function upsertPayment(payload) {
  const existing = await Payment.findOne({ invoiceId: payload.invoiceId, status: payload.status });
  if (existing) return { item: existing, created: false };
  const item = await Payment.create(payload);
  return { item, created: true };
}

async function createMovementOnce(payload) {
  const existing = await StockMovement.findOne({ source: payload.source, type: payload.type, note: payload.note });
  if (existing) return { item: existing, created: false };
  const item = await StockMovement.create(payload);
  return { item, created: true };
}

async function createNotificationOnce(payload) {
  const existing = await Notification.findOne({ title: payload.title, message: payload.message, type: payload.type });
  if (existing) return { item: existing, created: false };
  const item = await Notification.create(payload);
  return { item, created: true };
}

function log(label, result) {
  console.log(`${result.created ? 'created' : 'exists '} ${label}`);
}

try {
  await connectDb();

  const admin = await upsertUser({ username: 'admin', password: 'admin123', name: 'Admin', role: 'admin' });
  const tech = await upsertUser({ username: 'emp1', password: 'emp123', name: 'Technician', role: 'technician' });
  log('user admin', admin);
  log('user emp1', tech);

  const customers = {};
  for (const payload of [
    { name: 'Ravi Kumar', phone: '9000001001', email: 'ravi@example.com', address: 'Mettur', devices: ['Lenovo Laptop'] },
    { name: 'Suresh Babu', phone: '9000001002', email: 'suresh@example.com', address: 'Salem', devices: ['Dell Desktop'] },
    { name: 'Prasanna', phone: '9000001003', email: 'prasanna@example.com', address: 'Erode', devices: ['HP Laptop'] }
  ]) {
    const result = await upsertCustomer(payload);
    customers[payload.name] = result.item;
    log(`customer ${payload.name}`, result);
  }

  const parts = {};
  for (const payload of [
    { partName: 'RAM 8GB', category: 'Memory', sellingPrice: 2200, onHand: 12, reserved: 2, lowStockLimit: 3 },
    { partName: 'SSD 1TB', category: 'Storage', sellingPrice: 6200, onHand: 6, reserved: 1, lowStockLimit: 2 },
    { partName: 'Keyboard', category: 'Laptop', sellingPrice: 1450, onHand: 3, reserved: 1, lowStockLimit: 3 },
    { partName: 'Laptop Charger', category: 'Power', sellingPrice: 1800, onHand: 1, reserved: 0, lowStockLimit: 2 }
  ]) {
    const result = await upsertPart(payload);
    parts[payload.partName] = result.item;
    log(`part ${payload.partName}`, result);
  }

  const movementRows = [
    { partId: parts['RAM 8GB']._id, type: 'ADD', quantity: 10, source: `${DEMO}-ADD`, note: 'ADD stock demo', userId: admin.item._id },
    { partId: parts['SSD 1TB']._id, type: 'USED', quantity: 1, source: `${DEMO}-USED`, note: 'USED stock demo', userId: tech.item._id },
    { partId: parts.Keyboard._id, type: 'RETURN', quantity: 1, source: `${DEMO}-RETURN`, note: 'RETURN stock demo', userId: admin.item._id },
    { partId: parts['RAM 8GB']._id, type: 'ADJUST', quantity: -1, source: `${DEMO}-ADJUST`, note: 'ADJUST stock demo', userId: admin.item._id },
    { partId: parts['Laptop Charger']._id, type: 'ADJUST', quantity: -1, source: `${DEMO}-LOW-STOCK`, note: 'LOW STOCK example', userId: admin.item._id }
  ];
  for (const payload of movementRows) log(`movement ${payload.type} ${payload.note}`, await createMovementOnce(payload));

  const workOrders = [];
  for (const payload of [
    { customerId: customers['Ravi Kumar']._id, device: 'Lenovo Laptop', issue: 'Display flickering', technicianId: null, status: 'Pending' },
    { customerId: customers['Suresh Babu']._id, device: 'Dell Desktop', issue: 'Boot failure', technicianId: tech.item._id, status: 'In Progress' },
    { customerId: customers.Prasanna._id, device: 'HP Laptop', issue: 'Keyboard replacement', technicianId: tech.item._id, status: 'Awaiting Parts', partRequests: [{ inventoryPartId: parts.Keyboard._id, name: 'Keyboard', quantity: 1, status: 'Reserved', userId: tech.item._id }] },
    { customerId: customers['Ravi Kumar']._id, device: 'Lenovo Laptop', issue: 'RAM upgrade completed', technicianId: tech.item._id, status: 'Completed', partsUsed: [{ inventoryPartId: parts['RAM 8GB']._id, name: 'RAM 8GB', quantity: 1, unitPrice: 2200, total: 2200 }] }
  ]) {
    const result = await upsertWorkOrder({
      ...payload,
      timeline: [{ status: payload.status, message: `${DEMO} work order`, userId: admin.item._id }]
    });
    workOrders.push(result.item);
    log(`work order ${payload.status}`, result);
  }

  const invoices = [];
  for (const [index, payload] of [
    { status: 'Paid', total: 2500, paidAmount: 2500, balance: 0 },
    { status: 'Partial', total: 6200, paidAmount: 3000, balance: 3200 },
    { status: 'Pending', total: 1800, paidAmount: 0, balance: 1800 }
  ].entries()) {
    const result = await upsertInvoice({
      invoiceNumber: `${DEMO}-INV-${index + 1}`,
      workOrderId: workOrders[index + 1]._id,
      customerId: workOrders[index + 1].customerId,
      items: [{ description: `${DEMO} service`, quantity: 1, rate: payload.total, amount: payload.total }],
      ...payload
    });
    invoices.push(result.item);
    log(`invoice ${payload.status}`, result);
  }

  for (const invoice of invoices) {
    const paidAmount = invoice.status === 'Pending' ? 0 : invoice.paidAmount;
    const result = await upsertPayment({
      invoiceId: invoice._id,
      customerId: invoice.customerId,
      amount: invoice.total,
      paidAmount,
      balance: invoice.balance,
      status: invoice.status,
      method: invoice.status === 'Paid' ? 'Cash' : 'UPI'
    });
    log(`payment ${invoice.status}`, result);
  }

  const notifications = [
    { title: 'New booking received', message: 'Ravi Kumar submitted a service booking.', type: 'BOOKING', role: 'admin' },
    { title: 'Low stock warning', message: 'Laptop Charger has 1 available.', type: 'LOW_STOCK', role: 'admin' },
    { title: 'Payment pending', message: `${DEMO}-INV-3 has payment pending.`, type: 'PAYMENT', role: 'admin' },
    { title: 'Work order assigned', message: 'Dell Desktop work order assigned to Technician.', type: 'WORK_ORDER', role: 'technician', userId: tech.item._id }
  ];
  for (const payload of notifications) log(`notification ${payload.title}`, await createNotificationOnce(payload));

  console.log('Phase 2 seed complete.');
  await mongoose.disconnect();
} catch (error) {
  console.error('Phase 2 seed failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
}
