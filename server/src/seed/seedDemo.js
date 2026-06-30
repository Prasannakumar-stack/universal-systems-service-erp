import 'dotenv/config';
import bcrypt from 'bcryptjs';
import AMCContract from '../models/AMCContract.js';
import AuditLog from '../models/AuditLog.js';
import Booking from '../models/Booking.js';
import Communication from '../models/Communication.js';
import Customer from '../models/Customer.js';
import InventoryPart from '../models/InventoryPart.js';
import Invoice from '../models/Invoice.js';
import Notification from '../models/Notification.js';
import Payment from '../models/Payment.js';
import PurchaseImport from '../models/PurchaseImport.js';
import PurchaseUsageAllocation from '../models/PurchaseUsageAllocation.js';
import Reminder from '../models/Reminder.js';
import StockMovement from '../models/StockMovement.js';
import Supplier from '../models/Supplier.js';
import User from '../models/User.js';
import WorkOrder from '../models/WorkOrder.js';
import { connectSeedDb, disconnectSeedDb, ensureLiveDefaults, logResult } from './seedUtils.js';

const DEMO = 'DEMO-SEED';
const demoTextRegex = /DEMO-SEED|PHASE2-DEMO|PHASE4-DEMO|PURCHASE-IMPORT-DEMO/i;
const demoCodeRegex = /^(DEMO-|PHASE2-DEMO|PHASE4-DEMO|PURCHASE-IMPORT-DEMO)/i;
const demoUsernamesToRemove = ['demo.tech1', 'demo.tech2'];
const demoCustomerPhones = [
  '9000001001',
  '9000001002',
  '9000001003',
  '9000001004',
  '9000001101',
  '9000001102',
  '9000001103',
  '9000001104',
  '9000002510',
  '9000004000'
];
const demoCustomerNames = [
  'Ravi Kumar',
  'Sri Lakshmi Stores',
  'Kavya Textiles',
  'Suresh Babu',
  'Prasanna',
  'Phase4 Customer',
  'Purchase Demo Customer',
  'Rajesh Kumar',
  'Bright Prints',
  'Mettur Supermarket',
  'Arun Office Solutions'
];
const demoPartNames = [
  'Laptop Keyboard Dell Inspiron',
  'Printer Roller HP P1007',
  'RAM 8GB DDR4',
  'SSD 512GB SATA',
  'CCTV Adapter 12V 2A',
  'Laptop Keyboard - Dell Inspiron 15',
  'Laptop Keyboard — Dell Inspiron 15',
  'Printer Roller - HP P1007',
  'Printer Roller — HP P1007',
  'Laptop Charger 65W',
  'Laptop Charger',
  'Laptop Screen 14.0 LED',
  'Laptop Battery - Dell 6 Cell',
  'Laptop Battery — Dell 6 Cell',
  'SSD 1TB',
  'RAM 8GB',
  'Keyboard'
];
const demoSkus = ['US-KBD-DELL', 'US-PRN-ROLLER', 'US-RAM-8G', 'US-SSD-512', 'US-CCTV-ADP'];
const demoSupplierNames = [
  'Chennai Computer Spares',
  'Coimbatore Print Parts',
  'Mettur Network Mart',
  'Coimbatore Tech Mart',
  'Salem Printer Parts',
  'Mettur CCTV Spares'
];

if (process.env.NODE_ENV === 'production') {
  console.error('Demo seed is disabled when NODE_ENV=production.');
  process.exit(1);
}

function daysFromNow(days) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

function ids(rows = []) {
  return rows.map((row) => row?._id).filter(Boolean);
}

function normalize(value = '') {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

async function deleteAndLog(label, Model, filter) {
  const result = await Model.deleteMany(filter);
  if (result.deletedCount) console.log(`demo reset deleted ${label}: ${result.deletedCount}`);
  return result.deletedCount;
}

async function upsertUser({ username, password, name, role, phone = '', email = '' }) {
  const existing = await User.findOne({ username });
  if (existing) {
    existing.name = name;
    existing.role = role;
    existing.phone = phone;
    existing.email = email;
    existing.active = true;
    existing.forcePasswordReset = false;
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
    active: true,
    forcePasswordReset: false
  });
  return { item, created: true };
}

async function createStockMovement(payload) {
  const item = await StockMovement.create(payload);
  return { item, created: true };
}

async function clearDemoSeedData() {
  console.log('DEMO RESET ONLY: removing known demo/sample seed records before reseeding.');
  console.log('This does not wipe all data and does not remove roles, permissions, settings, PDF templates, or live-looking records.');

  const demoCustomers = await Customer.find({
    $or: [
      { phone: { $in: demoCustomerPhones } },
      { name: { $in: demoCustomerNames } },
      { email: /demo@example\.com|purchase-demo@example\.com|\.demo@example\.com/i }
    ]
  }).select('_id').lean();
  const demoCustomerIds = ids(demoCustomers);

  const demoParts = await InventoryPart.find({
    $or: [
      { sku: /^DEMO-/i },
      { sku: { $in: demoSkus } },
      { partName: { $in: demoPartNames } },
      { purchaseRef: demoTextRegex },
      { description: demoTextRegex }
    ]
  }).select('_id').lean();
  const demoPartIds = ids(demoParts);

  const demoBookings = await Booking.find({
    $or: [
      { bookingCode: demoCodeRegex },
      { bookingCode: /^US-BK-10\d\d$/i },
      { customerId: { $in: demoCustomerIds } },
      { issue: demoTextRegex }
    ]
  }).select('_id').lean();
  const demoBookingIds = ids(demoBookings);

  const demoInvoices = await Invoice.find({
    $or: [
      { invoiceNumber: demoCodeRegex },
      { invoiceNumber: /^US-INV-10\d\d$/i },
      { customerId: { $in: demoCustomerIds } },
      { notes: demoTextRegex }
    ]
  }).select('_id').lean();
  const demoInvoiceIds = ids(demoInvoices);

  const demoWorkOrders = await WorkOrder.find({
    $or: [
      { bookingId: { $in: demoBookingIds } },
      { customerId: { $in: demoCustomerIds } },
      { invoiceId: { $in: demoInvoiceIds } },
      { issue: demoTextRegex },
      { source: DEMO }
    ]
  }).select('_id').lean();
  const demoWorkOrderIds = ids(demoWorkOrders);

  const demoPurchaseImports = await PurchaseImport.find({
    $or: [
      { invoiceRef: demoCodeRegex },
      { supplierName: { $in: demoSupplierNames } },
      { notes: demoTextRegex },
      { 'items.inventoryPartId': { $in: demoPartIds } }
    ]
  }).select('_id').lean();
  const demoPurchaseImportIds = ids(demoPurchaseImports);

  const allDemoRecordIds = [
    ...demoCustomerIds,
    ...demoPartIds,
    ...demoBookingIds,
    ...demoInvoiceIds,
    ...demoWorkOrderIds,
    ...demoPurchaseImportIds
  ];

  await deleteAndLog('purchase usage allocations', PurchaseUsageAllocation, {
    $or: [
      { purchaseImportId: { $in: demoPurchaseImportIds } },
      { inventoryPartId: { $in: demoPartIds } },
      { workOrderId: { $in: demoWorkOrderIds } }
    ]
  });
  await deleteAndLog('payments', Payment, {
    $or: [
      { invoiceId: { $in: demoInvoiceIds } },
      { customerId: { $in: demoCustomerIds } },
      { transactionId: demoCodeRegex }
    ]
  });
  await deleteAndLog('invoices', Invoice, {
    $or: [
      { _id: { $in: demoInvoiceIds } },
      { workOrderId: { $in: demoWorkOrderIds } },
      { customerId: { $in: demoCustomerIds } }
    ]
  });
  await deleteAndLog('communications', Communication, {
    $or: [
      { customerId: { $in: demoCustomerIds } },
      { workOrderId: { $in: demoWorkOrderIds } },
      { message: demoTextRegex }
    ]
  });
  await deleteAndLog('reminders', Reminder, {
    $or: [
      { relatedId: { $in: allDemoRecordIds } },
      { title: /^Demo|^Pending payment$|^Work order not updated$|^Low stock$/i },
      { message: demoTextRegex }
    ]
  });
  await deleteAndLog('notifications', Notification, {
    $or: [
      { sourceId: { $in: allDemoRecordIds } },
      { title: /^Demo|^New booking received$|^Low stock warning$|^Payment pending$|^Work order assigned$/i },
      { message: demoTextRegex }
    ]
  });
  await deleteAndLog('audit logs', AuditLog, {
    $or: [
      { action: /^demo_seed/i },
      { recordId: { $in: allDemoRecordIds } },
      { 'after.mode': 'demo' }
    ]
  });
  await deleteAndLog('AMC contracts', AMCContract, {
    $or: [
      { contractId: demoCodeRegex },
      { contractId: /^US-AMC-10\d\d$/i },
      { customerId: { $in: demoCustomerIds } },
      { notes: demoTextRegex }
    ]
  });
  await deleteAndLog('work orders', WorkOrder, { _id: { $in: demoWorkOrderIds } });
  await deleteAndLog('bookings', Booking, { _id: { $in: demoBookingIds } });
  await deleteAndLog('stock movements', StockMovement, {
    $or: [
      { partId: { $in: demoPartIds } },
      { source: demoCodeRegex },
      { source: /^US-STOCK-10\d\d$/i },
      { note: demoTextRegex }
    ]
  });
  await deleteAndLog('purchase/import records', PurchaseImport, { _id: { $in: demoPurchaseImportIds } });
  await deleteAndLog('inventory parts/products', InventoryPart, { _id: { $in: demoPartIds } });
  await deleteAndLog('suppliers', Supplier, {
    $or: [
      { name: { $in: demoSupplierNames } },
      { normalizedName: { $in: demoSupplierNames.map(normalize) } }
    ]
  });
  await deleteAndLog('customers', Customer, { _id: { $in: demoCustomerIds } });
  await deleteAndLog('old demo users', User, { username: { $in: demoUsernamesToRemove } });
}

try {
  await connectSeedDb();
  await ensureLiveDefaults();
  await clearDemoSeedData();

  const admin = await upsertUser({
    username: 'admin',
    password: 'admin123',
    name: 'Demo Admin',
    role: 'admin',
    phone: 'DEMO-ADMIN',
    email: 'admin@demo.example'
  });
  const kavi = await upsertUser({
    username: 'emp1',
    password: 'emp123',
    name: 'Demo Technician A',
    role: 'technician',
    phone: 'DEMO-TECH-A',
    email: 'tech.a@demo.example'
  });
  const raju = await upsertUser({
    username: 'emp2',
    password: 'emp123',
    name: 'Demo Technician B',
    role: 'technician',
    phone: 'DEMO-TECH-B',
    email: 'tech.b@demo.example'
  });
  logResult('demo admin admin', admin);
  logResult('demo technician emp1', kavi);
  logResult('demo technician emp2', raju);

  const customers = {};
  for (const payload of [
    {
      name: 'Demo Home Customer',
      phone: 'DEMO-CUST-1001',
      email: 'home.customer@demo.example',
      address: 'Demo Area, Sample City',
      customerType: 'Home',
      devices: ['Dell Inspiron Laptop']
    },
    {
      name: 'Demo Print Shop',
      phone: 'DEMO-CUST-1002',
      email: 'print.shop@demo.example',
      address: 'Demo Market Road, Sample City',
      customerType: 'Business',
      devices: ['HP LaserJet P1007']
    },
    {
      name: 'Demo Office Customer',
      phone: 'DEMO-CUST-1003',
      email: 'office.customer@demo.example',
      address: 'Demo Business Park, Sample City',
      customerType: 'Business',
      devices: ['Office Desktop']
    },
    {
      name: 'Demo Retail Store',
      phone: 'DEMO-CUST-1004',
      email: 'retail.store@demo.example',
      address: 'Demo Retail Street, Sample City',
      customerType: 'Business',
      devices: ['CCTV DVR']
    }
  ]) {
    const item = await Customer.create(payload);
    customers[payload.name] = item;
    logResult(`demo customer ${payload.name}`, { item, created: true });
  }

  const parts = {};
  const partRows = [
    {
      partName: 'Laptop Keyboard Dell Inspiron',
      category: 'Laptop Parts',
      sku: 'US-KBD-DELL',
      brand: 'Dell Compatible',
      deviceModel: 'Inspiron',
      compatibleDeviceType: 'Laptop',
      supplier: 'Demo Computer Spares',
      costPrice: 750,
      sellingPrice: 1350,
      onHand: 3,
      reserved: 0,
      lowStockLimit: 2
    },
    {
      partName: 'Printer Roller HP P1007',
      category: 'Printer',
      sku: 'US-PRN-ROLLER',
      brand: 'HP Compatible',
      deviceModel: 'P1007',
      compatibleDeviceType: 'Printer',
      supplier: 'Demo Print Parts',
      costPrice: 900,
      sellingPrice: 1450,
      onHand: 3,
      reserved: 0,
      lowStockLimit: 2
    },
    {
      partName: 'RAM 8GB DDR4',
      category: 'Memory',
      sku: 'US-RAM-8G',
      brand: 'Crucial',
      deviceModel: 'DDR4',
      compatibleDeviceType: 'Desktop/Laptop',
      supplier: 'Demo Computer Spares',
      costPrice: 1450,
      sellingPrice: 2300,
      onHand: 4,
      reserved: 0,
      lowStockLimit: 2
    },
    {
      partName: 'SSD 512GB SATA',
      category: 'Storage',
      sku: 'US-SSD-512',
      brand: 'Kingston',
      deviceModel: 'SATA',
      compatibleDeviceType: 'Desktop/Laptop',
      supplier: 'Demo Computer Spares',
      costPrice: 2100,
      sellingPrice: 3200,
      onHand: 3,
      reserved: 0,
      lowStockLimit: 2
    },
    {
      partName: 'CCTV Adapter 12V 2A',
      category: 'CCTV',
      sku: 'US-CCTV-ADP',
      brand: 'SecurePower',
      deviceModel: '12V 2A',
      compatibleDeviceType: 'CCTV Camera',
      supplier: 'Demo CCTV Spares',
      costPrice: 180,
      sellingPrice: 450,
      onHand: 8,
      reserved: 0,
      lowStockLimit: 3
    }
  ];
  for (const payload of partRows) {
    const item = await InventoryPart.create(payload);
    parts[payload.partName] = item;
    logResult(`demo part ${payload.partName}`, { item, created: true });
  }

  const bookings = {};
  const bookingRows = [
    {
      bookingCode: 'US-BK-1001',
      customer: customers['Demo Home Customer'],
      serviceType: 'Laptop Repair',
      bookingSource: 'Walk-in',
      device: 'Dell Inspiron Laptop',
      deviceBrand: 'Dell',
      deviceModel: 'Inspiron',
      issue: 'Keyboard keys not working and replacement required.',
      technicianId: kavi.item._id,
      preferredDate: daysFromNow(-4),
      preferredTime: '10:30 AM'
    },
    {
      bookingCode: 'US-BK-1002',
      customer: customers['Demo Print Shop'],
      serviceType: 'Printer Service',
      bookingSource: 'Phone Call',
      device: 'HP LaserJet P1007',
      deviceBrand: 'HP',
      deviceModel: 'P1007',
      issue: 'Paper jam due to worn pickup roller.',
      technicianId: raju.item._id,
      preferredDate: daysFromNow(-3),
      preferredTime: '12:00 PM'
    },
    {
      bookingCode: 'US-BK-1003',
      customer: customers['Demo Office Customer'],
      serviceType: 'Desktop Repair',
      bookingSource: 'Website Booking',
      device: 'Office Desktop',
      deviceBrand: 'Assembled PC',
      deviceModel: 'Core i5',
      issue: 'Upgrade desktop with SSD and RAM.',
      technicianId: kavi.item._id,
      preferredDate: daysFromNow(-2),
      preferredTime: '03:00 PM'
    },
    {
      bookingCode: 'US-BK-1004',
      customer: customers['Demo Retail Store'],
      serviceType: 'CCTV Service',
      bookingSource: 'WhatsApp',
      device: 'CCTV DVR',
      deviceBrand: 'Hikvision',
      deviceModel: '8 Channel DVR',
      issue: 'Two cameras offline after adapter failure.',
      technicianId: raju.item._id,
      preferredDate: daysFromNow(-1),
      preferredTime: '05:00 PM'
    }
  ];
  for (const payload of bookingRows) {
    const item = await Booking.create({
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
      preferredDate: payload.preferredDate,
      preferredTime: payload.preferredTime,
      technicianId: payload.technicianId,
      status: 'Converted'
    });
    bookings[payload.bookingCode] = item;
    logResult(`demo booking ${payload.bookingCode}`, { item, created: true });
  }

  const workOrders = {};
  const workOrderRows = [
    {
      key: 'US-WO-1001',
      booking: bookings['US-BK-1001'],
      customer: customers['Demo Home Customer'],
      serviceType: 'Laptop Repair',
      bookingSource: 'Walk-in',
      device: 'Dell Inspiron Laptop',
      deviceBrand: 'Dell',
      deviceModel: 'Inspiron',
      issue: 'Keyboard keys not working and replacement required.',
      technicianId: kavi.item._id,
      status: 'Delivered',
      priority: 'Normal',
      completedAt: daysFromNow(-3),
      serviceCharge: 650,
      partsUsed: [
        {
          inventoryPartId: parts['Laptop Keyboard Dell Inspiron']._id,
          name: 'Laptop Keyboard Dell Inspiron',
          quantity: 1,
          unitPrice: 1350,
          total: 1350,
          chargeType: 'Chargeable',
          chargeTypeMode: 'Manual',
          source: 'Inventory',
          stockDeducted: true,
          stockDeductedAt: daysFromNow(-3)
        }
      ],
      timeline: [
        { status: 'Pending', message: 'Booking converted to work order.', userId: admin.item._id },
        { status: 'Completed', message: 'Keyboard replaced and tested.', userId: kavi.item._id },
        { status: 'Delivered', message: 'Laptop delivered to customer.', userId: admin.item._id }
      ]
    },
    {
      key: 'US-WO-1002',
      booking: bookings['US-BK-1002'],
      customer: customers['Demo Print Shop'],
      serviceType: 'Printer Service',
      bookingSource: 'Phone Call',
      device: 'HP LaserJet P1007',
      deviceBrand: 'HP',
      deviceModel: 'P1007',
      issue: 'Paper jam due to worn pickup roller.',
      technicianId: raju.item._id,
      status: 'Completed',
      priority: 'Normal',
      completedAt: daysFromNow(-2),
      serviceCharge: 550,
      partsUsed: [
        {
          inventoryPartId: parts['Printer Roller HP P1007']._id,
          name: 'Printer Roller HP P1007',
          quantity: 1,
          unitPrice: 1450,
          total: 1450,
          chargeType: 'Chargeable',
          chargeTypeMode: 'Manual',
          source: 'Inventory',
          stockDeducted: true,
          stockDeductedAt: daysFromNow(-2)
        }
      ],
      timeline: [
        { status: 'Pending', message: 'Booking converted to work order.', userId: admin.item._id },
        { status: 'Completed', message: 'Printer roller replaced and test print completed.', userId: raju.item._id }
      ]
    },
    {
      key: 'US-WO-1003',
      booking: bookings['US-BK-1003'],
      customer: customers['Demo Office Customer'],
      serviceType: 'Desktop Repair',
      bookingSource: 'Website Booking',
      device: 'Office Desktop',
      deviceBrand: 'Assembled PC',
      deviceModel: 'Core i5',
      issue: 'Upgrade desktop with SSD and RAM.',
      technicianId: kavi.item._id,
      status: 'In Progress',
      priority: 'High',
      serviceCharge: 900,
      partsUsed: [
        {
          inventoryPartId: parts['SSD 512GB SATA']._id,
          name: 'SSD 512GB SATA',
          quantity: 1,
          unitPrice: 3200,
          total: 3200,
          chargeType: 'Chargeable',
          chargeTypeMode: 'Manual',
          source: 'Inventory',
          stockDeducted: true,
          stockDeductedAt: daysFromNow(-1)
        },
        {
          inventoryPartId: parts['RAM 8GB DDR4']._id,
          name: 'RAM 8GB DDR4',
          quantity: 1,
          unitPrice: 2300,
          total: 2300,
          chargeType: 'Chargeable',
          chargeTypeMode: 'Manual',
          source: 'Inventory',
          stockDeducted: true,
          stockDeductedAt: daysFromNow(-1)
        }
      ],
      timeline: [
        { status: 'Pending', message: 'Booking converted to work order.', userId: admin.item._id },
        { status: 'In Progress', message: 'SSD and RAM upgrade in progress.', userId: kavi.item._id }
      ]
    },
    {
      key: 'US-WO-1004',
      booking: bookings['US-BK-1004'],
      customer: customers['Demo Retail Store'],
      serviceType: 'CCTV Service',
      bookingSource: 'WhatsApp',
      device: 'CCTV DVR',
      deviceBrand: 'Hikvision',
      deviceModel: '8 Channel DVR',
      issue: 'Two cameras offline after adapter failure.',
      technicianId: raju.item._id,
      status: 'Completed',
      priority: 'Normal',
      completedAt: daysFromNow(-1),
      serviceCharge: 500,
      partsUsed: [
        {
          inventoryPartId: parts['CCTV Adapter 12V 2A']._id,
          name: 'CCTV Adapter 12V 2A',
          quantity: 2,
          unitPrice: 450,
          total: 900,
          chargeType: 'Chargeable',
          chargeTypeMode: 'Manual',
          source: 'Inventory',
          stockDeducted: true,
          stockDeductedAt: daysFromNow(-1)
        }
      ],
      timeline: [
        { status: 'Pending', message: 'Booking converted to work order.', userId: admin.item._id },
        { status: 'Completed', message: 'Adapters replaced and cameras verified.', userId: raju.item._id }
      ]
    }
  ];
  for (const payload of workOrderRows) {
    const item = await WorkOrder.create({
      bookingId: payload.booking._id,
      customerId: payload.customer._id,
      serviceType: payload.serviceType,
      bookingSource: payload.bookingSource,
      source: payload.bookingSource,
      device: payload.device,
      deviceBrand: payload.deviceBrand,
      deviceModel: payload.deviceModel,
      issue: payload.issue,
      technicianId: payload.technicianId,
      status: payload.status,
      priority: payload.priority,
      completedAt: payload.completedAt || null,
      serviceCharge: payload.serviceCharge,
      serviceChargeBillingType: 'chargeable',
      partsUsed: payload.partsUsed,
      timeline: payload.timeline
    });
    payload.booking.workOrderId = item._id;
    await payload.booking.save();
    workOrders[payload.key] = item;
    logResult(`demo work order ${payload.key}`, { item, created: true });
  }

  const invoiceRows = [
    {
      invoiceNumber: 'US-INV-1001',
      workOrder: workOrders['US-WO-1001'],
      customer: customers['Demo Home Customer'],
      title: 'Laptop Keyboard Replacement',
      items: [
        { description: 'Laptop Keyboard Dell Inspiron', quantity: 1, rate: 1350, amount: 1350 },
        { description: 'Keyboard replacement service', quantity: 1, rate: 650, amount: 650 }
      ],
      total: 2000,
      paidAmount: 2000,
      balance: 0,
      status: 'Paid',
      method: 'UPI',
      transactionId: 'DEMO-UPI-1001'
    },
    {
      invoiceNumber: 'US-INV-1002',
      workOrder: workOrders['US-WO-1002'],
      customer: customers['Demo Print Shop'],
      title: 'Printer Roller Replacement',
      items: [
        { description: 'Printer Roller HP P1007', quantity: 1, rate: 1450, amount: 1450 },
        { description: 'Printer service charge', quantity: 1, rate: 550, amount: 550 }
      ],
      total: 2000,
      paidAmount: 1000,
      balance: 1000,
      status: 'Partial',
      method: 'Cash',
      transactionId: ''
    },
    {
      invoiceNumber: 'US-INV-1003',
      workOrder: workOrders['US-WO-1003'],
      customer: customers['Demo Office Customer'],
      title: 'SSD and RAM Upgrade',
      items: [
        { description: 'SSD 512GB SATA', quantity: 1, rate: 3200, amount: 3200 },
        { description: 'RAM 8GB DDR4', quantity: 1, rate: 2300, amount: 2300 },
        { description: 'Upgrade and data migration service', quantity: 1, rate: 900, amount: 900 }
      ],
      total: 6400,
      paidAmount: 0,
      balance: 6400,
      status: 'Pending',
      method: 'Cash',
      transactionId: ''
    },
    {
      invoiceNumber: 'US-INV-1004',
      workOrder: workOrders['US-WO-1004'],
      customer: customers['Demo Retail Store'],
      title: 'CCTV Adapter Replacement',
      items: [
        { description: 'CCTV Adapter 12V 2A', quantity: 2, rate: 450, amount: 900 },
        { description: 'CCTV service charge', quantity: 1, rate: 500, amount: 500 }
      ],
      total: 1400,
      paidAmount: 1400,
      balance: 0,
      status: 'Paid',
      method: 'UPI',
      transactionId: 'DEMO-UPI-1004'
    }
  ];

  const invoices = {};
  for (const payload of invoiceRows) {
    const invoice = await Invoice.create({
      invoiceNumber: payload.invoiceNumber,
      workOrderId: payload.workOrder._id,
      customerId: payload.customer._id,
      title: payload.title,
      items: payload.items,
      total: payload.total,
      paidAmount: payload.paidAmount,
      balance: payload.balance,
      status: payload.status,
      notes: 'Simple demo invoice for client walkthrough.',
      createdBy: admin.item._id
    });
    await Payment.create({
      invoiceId: invoice._id,
      customerId: payload.customer._id,
      amount: payload.total,
      paidAmount: payload.paidAmount,
      balance: payload.balance,
      status: payload.status,
      method: payload.method,
      transactionId: payload.transactionId
    });
    payload.workOrder.invoiceId = invoice._id;
    await payload.workOrder.save();
    invoices[payload.invoiceNumber] = invoice;
    logResult(`demo invoice/payment ${payload.invoiceNumber}`, { item: invoice, created: true });
  }

  for (const payload of partRows) {
    await createStockMovement({
      partId: parts[payload.partName]._id,
      type: 'ADD',
      quantity: payload.onHand,
      balanceAfter: payload.onHand,
      source: `US-STOCK-${payload.sku}`,
      sourceType: 'Manual',
      note: 'Opening stock for clean demo data.',
      userId: admin.item._id
    });
  }

  const amc = await AMCContract.create({
    contractId: 'US-AMC-1001',
    customerId: customers['Demo Retail Store']._id,
    customerName: customers['Demo Retail Store'].name,
    phone: customers['Demo Retail Store'].phone,
    address: customers['Demo Retail Store'].address,
    contractType: 'CCTV AMC',
    coverageType: 'Service Only AMC',
    coverParts: false,
    coverService: true,
    coverVisits: true,
    coveredService: 'Quarterly CCTV health check and DVR maintenance',
    coveredDevices: '8 CCTV cameras and DVR',
    deviceBrand: 'Hikvision',
    deviceModel: '8 Channel DVR',
    serviceFrequency: 'Quarterly',
    startDate: daysFromNow(-30),
    endDate: daysFromNow(335),
    contractValue: 12000,
    technicianId: raju.item._id,
    includedVisits: 4,
    notes: 'Single AMC example for client walkthrough.',
    status: 'Active',
    visits: [
      { serviceType: 'Quarterly CCTV health check', scheduledDate: daysFromNow(45), technicianId: raju.item._id, status: 'Upcoming' }
    ]
  });
  logResult('demo AMC US-AMC-1001', { item: amc, created: true });

  await AuditLog.create({
    userId: admin.item._id,
    action: 'demo_seed_created',
    module: 'demo_seed',
    recordId: customers['Demo Home Customer']._id,
    before: null,
    after: {
      mode: 'demo',
      customers: 4,
      bookings: 4,
      workOrders: 4,
      invoices: Object.keys(invoices).length,
      inventoryParts: Object.keys(parts).length,
      amcContracts: 1
    }
  });

  console.log('Demo seed complete. Kept a small connected sample dataset only.');
  console.log('Demo users created: admin, emp1, emp2. Keep credentials off camera.');
  await disconnectSeedDb();
} catch (error) {
  console.error('Demo seed failed:', error.message);
  await disconnectSeedDb();
  process.exit(1);
}
