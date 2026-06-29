import 'dotenv/config';
import bcrypt from 'bcryptjs';
import AMCContract from '../models/AMCContract.js';
import AuditLog from '../models/AuditLog.js';
import Booking from '../models/Booking.js';
import Customer from '../models/Customer.js';
import InventoryPart from '../models/InventoryPart.js';
import Invoice from '../models/Invoice.js';
import Notification from '../models/Notification.js';
import Payment from '../models/Payment.js';
import StockMovement from '../models/StockMovement.js';
import Supplier from '../models/Supplier.js';
import User from '../models/User.js';
import WorkOrder from '../models/WorkOrder.js';
import { connectSeedDb, disconnectSeedDb, ensureLiveDefaults, logResult } from './seedUtils.js';

const DEMO = 'DEMO-SEED';

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function normalize(value = '') {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function upsertUser({ username, password, name, role, phone = '', email = '' }) {
  const existing = await User.findOne({ username });
  if (existing) {
    existing.name = name;
    existing.role = role;
    existing.phone = phone;
    existing.email = email;
    existing.active = true;
    existing.passwordHash = await bcrypt.hash(password, 10);
    await existing.save();
    return { item: existing, created: false };
  }
  const item = await User.create({
    username,
    passwordHash: await bcrypt.hash(password, 10),
    name,
    role,
    phone,
    email,
    active: true
  });
  return { item, created: true };
}

async function upsertByModel(Model, match, payload) {
  const existing = await Model.findOne(match);
  if (existing) {
    Object.assign(existing, payload);
    await existing.save();
    return { item: existing, created: false };
  }
  const item = await Model.create(payload);
  return { item, created: true };
}

async function upsertSupplier(payload, user) {
  const normalizedName = normalize(payload.name);
  const normalizedPhone = normalize(payload.phone).replace(/\D/g, '');
  const normalizedCity = normalize(payload.city);
  return upsertByModel(
    Supplier,
    { normalizedName, normalizedPhone, normalizedCity },
    { ...payload, normalizedName, normalizedPhone, normalizedCity, createdBy: user?._id || null, updatedBy: user?._id || null }
  );
}

async function createStockMovementOnce(payload) {
  const existing = await StockMovement.findOne({ partId: payload.partId, type: payload.type, source: payload.source, note: payload.note });
  if (existing) return { item: existing, created: false };
  const item = await StockMovement.create(payload);
  return { item, created: true };
}

async function createPaymentOnce(payload) {
  const existing = await Payment.findOne({ invoiceId: payload.invoiceId, status: payload.status, paidAmount: payload.paidAmount });
  if (existing) return { item: existing, created: false };
  const item = await Payment.create(payload);
  return { item, created: true };
}

async function createNotificationOnce(payload) {
  const existing = await Notification.findOne({ title: payload.title, message: payload.message, type: payload.type });
  if (existing) return { item: existing, created: false };
  const item = await Notification.create(payload);
  return { item, created: true };
}

async function createAuditOnce(payload) {
  const existing = await AuditLog.findOne({ action: payload.action, module: payload.module, recordId: payload.recordId });
  if (existing) return { item: existing, created: false };
  const item = await AuditLog.create(payload);
  return { item, created: true };
}

try {
  await connectSeedDb();
  const defaults = await ensureLiveDefaults();
  const admin = defaults.admin.item;

  const tech1 = await upsertUser({
    username: 'demo.tech1',
    password: 'demo12345',
    name: 'Arun Technician',
    role: 'technician',
    phone: '9000002101',
    email: 'arun.tech@example.com'
  });
  const tech2 = await upsertUser({
    username: 'demo.tech2',
    password: 'demo12345',
    name: 'Meena Technician',
    role: 'technician',
    phone: '9000002102',
    email: 'meena.tech@example.com'
  });
  logResult('demo technician demo.tech1', tech1);
  logResult('demo technician demo.tech2', tech2);

  const customers = {};
  for (const payload of [
    { name: 'Ravi Kumar', phone: '9000001001', email: 'ravi.demo@example.com', address: 'Mettur Dam', customerType: 'Home', devices: ['Lenovo IdeaPad 3', 'HP Ink Tank Printer'] },
    { name: 'Sri Lakshmi Stores', phone: '9000001002', email: 'stores.demo@example.com', address: 'Salem Main Road', customerType: 'Business', devices: ['Billing Desktop', 'CCTV DVR'] },
    { name: 'Kavya Textiles', phone: '9000001003', email: 'textiles.demo@example.com', address: 'Bhavani', customerType: 'Business', devices: ['Canon Printer', 'Office Network'] },
    { name: 'Suresh Babu', phone: '9000001004', email: 'suresh.demo@example.com', address: 'Erode', customerType: 'Home', devices: ['Dell Inspiron Laptop'] }
  ]) {
    const result = await upsertByModel(Customer, { phone: payload.phone }, payload);
    customers[payload.name] = result.item;
    logResult(`demo customer ${payload.name}`, result);
  }

  const suppliers = {};
  for (const payload of [
    { name: 'Chennai Computer Spares', phone: '9876543210', email: 'sales@chennaicomputerspares.example', city: 'Chennai', address: 'Ritchie Street, Chennai', gstNumber: '33ABCDE1234F1Z5', notes: 'Laptop and desktop parts supplier.' },
    { name: 'Coimbatore Print Parts', phone: '9444567890', email: 'orders@printparts.example', city: 'Coimbatore', address: 'Gandhipuram, Coimbatore', gstNumber: '33PQRSX5678L1Z2', notes: 'Printer rollers, cartridges, and service kits.' },
    { name: 'Mettur Network Mart', phone: '9994356789', email: 'support@networkmart.example', city: 'Mettur', address: 'Four Roads, Mettur', gstNumber: '', notes: 'Networking and CCTV accessories.' }
  ]) {
    const result = await upsertSupplier(payload, admin);
    suppliers[payload.name] = result.item;
    logResult(`demo supplier ${payload.name}`, result);
  }

  const parts = {};
  for (const payload of [
    { partName: 'SSD 512GB SATA', category: 'Storage', sku: 'DEMO-SSD-512', brand: 'Kingston', supplier: 'Chennai Computer Spares', costPrice: 2100, sellingPrice: 3200, onHand: 8, reserved: 1, lowStockLimit: 2 },
    { partName: 'Laptop Keyboard Dell Inspiron', category: 'Laptop Parts', sku: 'DEMO-KBD-DELL', brand: 'Dell Compatible', supplier: 'Chennai Computer Spares', costPrice: 750, sellingPrice: 1350, onHand: 4, reserved: 1, lowStockLimit: 2 },
    { partName: 'Printer Roller HP P1007', category: 'Printer', sku: 'DEMO-PRN-ROLLER', brand: 'HP Compatible', supplier: 'Coimbatore Print Parts', costPrice: 900, sellingPrice: 1450, onHand: 2, reserved: 0, lowStockLimit: 2 },
    { partName: 'CCTV Adapter 12V 2A', category: 'CCTV', sku: 'DEMO-CCTV-ADP', brand: 'SecurePower', supplier: 'Mettur Network Mart', costPrice: 180, sellingPrice: 450, onHand: 12, reserved: 2, lowStockLimit: 4 },
    { partName: 'RAM 8GB DDR4', category: 'Memory', sku: 'DEMO-RAM-8G', brand: 'Crucial', supplier: 'Chennai Computer Spares', costPrice: 1450, sellingPrice: 2300, onHand: 6, reserved: 0, lowStockLimit: 3 }
  ]) {
    const result = await upsertByModel(InventoryPart, { sku: payload.sku }, payload);
    parts[payload.partName] = result.item;
    logResult(`demo part ${payload.partName}`, result);
  }

  for (const part of Object.values(parts)) {
    await createStockMovementOnce({
      partId: part._id,
      type: 'ADD',
      quantity: part.onHand,
      balanceAfter: part.onHand,
      source: DEMO,
      sourceType: 'Manual',
      note: `${DEMO} opening stock`,
      userId: admin._id
    });
  }

  const bookings = {};
  for (const payload of [
    { bookingCode: 'DEMO-BK-001', customer: customers['Ravi Kumar'], serviceType: 'Laptop Repair', bookingSource: 'Website Booking', device: 'Lenovo IdeaPad 3', deviceBrand: 'Lenovo', deviceModel: 'IdeaPad 3', issue: 'Laptop is very slow and needs SSD upgrade.', status: 'Converted', preferredDate: daysFromNow(-3), preferredTime: '10:30 AM' },
    { bookingCode: 'DEMO-BK-002', customer: customers['Sri Lakshmi Stores'], serviceType: 'CCTV Installation & Maintenance', bookingSource: 'Contact Form', device: 'CCTV DVR', deviceBrand: '', deviceModel: '', issue: 'Two cameras are offline after power fluctuation.', status: 'New Enquiry', preferredDate: daysFromNow(1), preferredTime: '04:00 PM', followUpReminder: 'Call owner before visit.' },
    { bookingCode: 'DEMO-BK-003', customer: customers['Kavya Textiles'], serviceType: 'Printer Service / Toner Refilling', bookingSource: 'Call', device: 'Canon Printer', deviceBrand: 'Canon', deviceModel: 'LBP2900', issue: 'Paper jam and low print quality.', status: 'Contacted', preferredDate: daysFromNow(2), preferredTime: '11:00 AM' }
  ]) {
    const bookingPayload = {
      bookingCode: payload.bookingCode,
      customerId: payload.customer._id,
      customerName: payload.customer.name,
      phone: payload.customer.phone,
      email: payload.customer.email,
      address: payload.customer.address,
      serviceType: payload.serviceType,
      bookingSource: payload.bookingSource,
      device: payload.device,
      deviceBrand: payload.deviceBrand,
      deviceModel: payload.deviceModel,
      issue: payload.issue,
      status: payload.status,
      preferredDate: payload.preferredDate,
      preferredTime: payload.preferredTime,
      followUpReminder: payload.followUpReminder || '',
      technicianId: payload.status === 'Converted' ? tech1.item._id : null
    };
    const result = await upsertByModel(Booking, { bookingCode: payload.bookingCode }, bookingPayload);
    bookings[payload.bookingCode] = result.item;
    logResult(`demo booking ${payload.bookingCode}`, result);
  }

  const workOrders = {};
  for (const payload of [
    {
      key: 'DEMO-WO-001',
      booking: bookings['DEMO-BK-001'],
      customer: customers['Ravi Kumar'],
      serviceType: 'Laptop Repair',
      device: 'Lenovo IdeaPad 3',
      deviceBrand: 'Lenovo',
      deviceModel: 'IdeaPad 3',
      issue: `${DEMO} SSD upgrade and cleanup`,
      technicianId: tech1.item._id,
      status: 'Completed',
      priority: 'Normal',
      completedAt: daysFromNow(-1),
      serviceCharge: 850,
      partsUsed: [{ inventoryPartId: parts['SSD 512GB SATA']._id, name: 'SSD 512GB SATA', quantity: 1, unitPrice: 3200, total: 3200, stockDeducted: true }],
      timeline: [
        { status: 'Pending', message: 'Demo booking converted to work order.', userId: admin._id },
        { status: 'Completed', message: 'SSD installed and system optimized.', userId: tech1.item._id }
      ]
    },
    {
      key: 'DEMO-WO-002',
      customer: customers['Sri Lakshmi Stores'],
      serviceType: 'CCTV Service',
      device: 'Shop CCTV DVR',
      deviceBrand: 'Hikvision',
      deviceModel: 'DVR-8CH',
      issue: `${DEMO} two CCTV cameras offline`,
      technicianId: tech2.item._id,
      status: 'In Progress',
      priority: 'High',
      serviceCharge: 600,
      partRequests: [{ inventoryPartId: parts['CCTV Adapter 12V 2A']._id, name: 'CCTV Adapter 12V 2A', quantity: 2, status: 'Reserved', userId: tech2.item._id }],
      timeline: [{ status: 'In Progress', message: 'Technician checking DVR power supply.', userId: tech2.item._id }]
    },
    {
      key: 'DEMO-WO-003',
      customer: customers['Kavya Textiles'],
      serviceType: 'Printer Service / Toner Refilling',
      device: 'Canon LBP2900',
      deviceBrand: 'Canon',
      deviceModel: 'LBP2900',
      issue: `${DEMO} printer paper jam and roller replacement`,
      technicianId: tech1.item._id,
      status: 'Awaiting Parts',
      priority: 'Normal',
      serviceCharge: 500,
      partRequests: [{ inventoryPartId: parts['Printer Roller HP P1007']._id, name: 'Printer Roller HP P1007', quantity: 1, status: 'Requested', userId: tech1.item._id }],
      timeline: [{ status: 'Awaiting Parts', message: 'Roller replacement required.', userId: tech1.item._id }]
    }
  ]) {
    const result = await upsertByModel(WorkOrder, { issue: payload.issue }, {
      bookingId: payload.booking?._id || null,
      customerId: payload.customer._id,
      serviceType: payload.serviceType,
      bookingSource: payload.booking ? payload.booking.bookingSource : 'Walk-in',
      device: payload.device,
      deviceBrand: payload.deviceBrand,
      deviceModel: payload.deviceModel,
      issue: payload.issue,
      technicianId: payload.technicianId,
      status: payload.status,
      priority: payload.priority,
      completedAt: payload.completedAt || null,
      serviceCharge: payload.serviceCharge,
      partsUsed: payload.partsUsed || [],
      partRequests: payload.partRequests || [],
      timeline: payload.timeline
    });
    workOrders[payload.key] = result.item;
    if (payload.booking) {
      payload.booking.workOrderId = result.item._id;
      payload.booking.status = 'Converted';
      await payload.booking.save();
    }
    logResult(`demo work order ${payload.key}`, result);
  }

  const invoices = {};
  for (const payload of [
    { invoiceNumber: 'DEMO-INV-001', workOrder: workOrders['DEMO-WO-001'], customer: customers['Ravi Kumar'], title: 'Laptop SSD Upgrade', items: [{ description: 'SSD 512GB SATA', quantity: 1, rate: 3200, amount: 3200 }, { description: 'Installation and optimization', quantity: 1, rate: 850, amount: 850 }], total: 4050, paidAmount: 4050, balance: 0, status: 'Paid' },
    { invoiceNumber: 'DEMO-INV-002', workOrder: workOrders['DEMO-WO-002'], customer: customers['Sri Lakshmi Stores'], title: 'CCTV Service Visit', items: [{ description: 'CCTV diagnosis and adapter replacement estimate', quantity: 1, rate: 1500, amount: 1500 }], total: 1500, paidAmount: 500, balance: 1000, status: 'Partial' },
    { invoiceNumber: 'DEMO-INV-003', workOrder: workOrders['DEMO-WO-003'], customer: customers['Kavya Textiles'], title: 'Printer Service Estimate', items: [{ description: 'Printer roller and service charge', quantity: 1, rate: 1950, amount: 1950 }], total: 1950, paidAmount: 0, balance: 1950, status: 'Pending' }
  ]) {
    const result = await upsertByModel(Invoice, { invoiceNumber: payload.invoiceNumber }, {
      invoiceNumber: payload.invoiceNumber,
      workOrderId: payload.workOrder._id,
      customerId: payload.customer._id,
      title: payload.title,
      items: payload.items,
      total: payload.total,
      paidAmount: payload.paidAmount,
      balance: payload.balance,
      status: payload.status,
      createdBy: admin._id
    });
    invoices[payload.invoiceNumber] = result.item;
    payload.workOrder.invoiceId = result.item._id;
    await payload.workOrder.save();
    logResult(`demo invoice ${payload.invoiceNumber}`, result);
  }

  for (const invoice of Object.values(invoices)) {
    const result = await createPaymentOnce({
      invoiceId: invoice._id,
      customerId: invoice.customerId,
      amount: invoice.total,
      paidAmount: invoice.paidAmount,
      balance: invoice.balance,
      status: invoice.status,
      method: invoice.status === 'Paid' ? 'UPI' : 'Cash',
      transactionId: invoice.status === 'Paid' ? 'DEMO-UPI-001' : ''
    });
    logResult(`demo payment ${invoice.invoiceNumber}`, result);
  }

  const amc = await upsertByModel(AMCContract, { contractId: 'DEMO-AMC-001' }, {
    contractId: 'DEMO-AMC-001',
    customerId: customers['Sri Lakshmi Stores']._id,
    customerName: customers['Sri Lakshmi Stores'].name,
    phone: customers['Sri Lakshmi Stores'].phone,
    address: customers['Sri Lakshmi Stores'].address,
    contractType: 'CCTV AMC',
    coverageType: 'Preventive AMC',
    coverParts: false,
    coverService: true,
    coverVisits: true,
    coveredService: 'CCTV maintenance and DVR health checks',
    coveredDevices: '8 CCTV cameras and DVR',
    deviceBrand: 'Hikvision',
    deviceModel: '8 Channel DVR',
    serviceFrequency: 'Quarterly',
    startDate: daysFromNow(-30),
    endDate: daysFromNow(335),
    contractValue: 12000,
    technicianId: tech2.item._id,
    includedVisits: 4,
    notes: `${DEMO} sample AMC for training.`,
    status: 'Active',
    visits: [
      { serviceType: 'Preventive maintenance', scheduledDate: daysFromNow(10), technicianId: tech2.item._id, status: 'Upcoming' },
      { serviceType: 'DVR health check', scheduledDate: daysFromNow(100), technicianId: tech2.item._id, status: 'Upcoming' }
    ]
  });
  logResult('demo AMC DEMO-AMC-001', amc);

  for (const payload of [
    { title: 'Demo booking received', message: 'Sri Lakshmi Stores submitted a CCTV enquiry.', type: 'BOOKING', role: 'admin', sourceId: bookings['DEMO-BK-002']._id },
    { title: 'Demo low stock warning', message: 'Printer Roller HP P1007 is at the reorder limit.', type: 'LOW_STOCK', role: 'admin', sourceId: parts['Printer Roller HP P1007']._id },
    { title: 'Demo payment follow-up', message: 'DEMO-INV-002 has a pending balance of 1000.', type: 'PAYMENT', role: 'admin', sourceId: invoices['DEMO-INV-002']._id },
    { title: 'Demo work order assigned', message: 'CCTV service is assigned to Meena Technician.', type: 'WORK_ORDER', role: 'technician', userId: tech2.item._id, sourceId: workOrders['DEMO-WO-002']._id }
  ]) {
    logResult(`demo notification ${payload.title}`, await createNotificationOnce(payload));
  }

  for (const payload of [
    { userId: admin._id, action: 'demo_seed_created', module: 'customer', recordId: customers['Ravi Kumar']._id, before: null, after: { mode: 'demo' } },
    { userId: admin._id, action: 'demo_seed_created', module: 'work_order', recordId: workOrders['DEMO-WO-001']._id, before: null, after: { status: 'Completed' } },
    { userId: admin._id, action: 'demo_seed_created', module: 'invoice', recordId: invoices['DEMO-INV-001']._id, before: null, after: { status: 'Paid' } },
    { userId: admin._id, action: 'demo_seed_created', module: 'amc', recordId: amc.item._id, before: null, after: { status: 'Active' } }
  ]) {
    logResult(`demo audit ${payload.module}`, await createAuditOnce(payload));
  }

  console.log('Demo seed complete.');
  console.log('Demo login: admin / admin123, demo.tech1 / demo12345, demo.tech2 / demo12345');
  await disconnectSeedDb();
} catch (error) {
  console.error('Demo seed failed:', error.message);
  await disconnectSeedDb();
  process.exit(1);
}
