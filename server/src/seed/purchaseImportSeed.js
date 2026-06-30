import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDb } from '../db.js';
import Customer from '../models/Customer.js';
import InventoryPart from '../models/InventoryPart.js';
import PurchaseImport from '../models/PurchaseImport.js';
import User from '../models/User.js';
import WorkOrder from '../models/WorkOrder.js';
import { createPurchase, getPurchase, updatePurchase } from '../services/purchaseImportService.js';
import { syncPartAvailability } from '../services/stockMovementService.js';
import { addPart } from '../services/workOrderService.js';

const DEMO = 'PURCHASE-IMPORT-DEMO';

if (process.env.NODE_ENV === 'production') {
  console.error('Purchase/import demo seed is disabled in production.');
  process.exit(1);
}

function demoDate(value) {
  return new Date(`${value}T00:00:00.000+05:30`);
}

function log(label, action) {
  console.log(`${action.padEnd(8)} ${label}`);
}

async function demoAdmin() {
  const admin = await User.findOne({ role: 'admin' });
  if (admin) return admin;
  return User.findOne({ active: true }) || User.findOne();
}

async function upsertPart(payload) {
  const existing = await InventoryPart.findOne({ partName: payload.partName });
  if (existing) {
    if (!existing.category || existing.category === 'General') existing.category = payload.category;
    if (!existing.unitType) existing.unitType = 'Piece';
    if (!Number(existing.costPrice || 0)) existing.costPrice = payload.costPrice;
    if (!Number(existing.sellingPrice || 0)) existing.sellingPrice = payload.sellingPrice;
    if (!Number(existing.lowStockLimit || 0)) existing.lowStockLimit = payload.lowStockLimit;
    syncPartAvailability(existing);
    await existing.save();
    return { item: existing, created: false };
  }
  const item = await InventoryPart.create({
    partName: payload.partName,
    category: payload.category,
    sku: payload.sku || '',
    brand: payload.brand || '',
    unitType: 'Piece',
    costPrice: payload.costPrice,
    sellingPrice: payload.sellingPrice,
    onHand: 0,
    reserved: 0,
    lowStockLimit: payload.lowStockLimit
  });
  return { item, created: true };
}

function payloadWithPartIds(sample, parts) {
  return {
    supplierName: sample.supplierName,
    contactNumber: sample.contactNumber,
    placeCity: sample.placeCity,
    purchaseSource: sample.purchaseSource,
    invoiceRef: sample.invoiceRef,
    purchaseDate: sample.purchaseDate,
    deliveryStatus: sample.deliveryStatus,
    paymentStatus: sample.paymentStatus,
    warrantyPeriod: sample.warrantyPeriod,
    notes: sample.notes,
    items: sample.items.map((item) => ({
      inventoryPartId: parts[item.partName]._id,
      partName: item.partName,
      category: parts[item.partName].category,
      quantityOrdered: item.quantityOrdered,
      quantityReceived: item.quantityReceived,
      unitCost: item.unitCost
    }))
  };
}

function preserveExistingItemIds(payload, existing) {
  if (!existing) return payload;
  const existingByPart = new Map((existing.items || []).map((item) => [String(item.inventoryPartId), item]));
  return {
    ...payload,
    items: payload.items.map((item) => {
      const existingItem = existingByPart.get(String(item.inventoryPartId));
      return existingItem ? { ...item, id: String(existingItem._id) } : item;
    })
  };
}

async function upsertPurchase(sample, parts, user) {
  const existing = await PurchaseImport.findOne({ invoiceRef: sample.invoiceRef });
  const payload = preserveExistingItemIds(payloadWithPartIds(sample, parts), existing);
  if (existing) {
    const purchase = await updatePurchase(existing._id, payload, user);
    log(`purchase ${sample.invoiceRef}`, 'updated');
    return purchase;
  }
  const purchase = await createPurchase(payload, user);
  log(`purchase ${sample.invoiceRef}`, 'created');
  return purchase;
}

async function firstOrCreateCustomer() {
  const existing = await Customer.findOne({ phone: 'DEMO-PI-CUST' });
  if (existing) return existing;
  return Customer.create({
    name: 'Purchase Demo Customer',
    phone: 'DEMO-PI-CUST',
    email: 'purchase.customer@demo.example',
    address: 'Demo Area, Sample City',
    devices: ['Dell Inspiron 15']
  });
}

async function ensureFifoUsage(parts, admin) {
  const customer = await firstOrCreateCustomer();
  let workOrder = await WorkOrder.findOne({ issue: `${DEMO} FIFO usage display` });
  if (!workOrder) {
    workOrder = await WorkOrder.create({
      customerId: customer._id,
      device: 'Dell Inspiron 15',
      issue: `${DEMO} FIFO usage display`,
      status: 'In Progress',
      priority: 'Normal',
      timeline: [{ status: 'In Progress', message: 'Demo work order for purchase FIFO usage display', userId: admin?._id || null }]
    });
    log('FIFO demo work order', 'created');
  } else {
    log('FIFO demo work order', 'exists');
  }

  const usagePart = parts['Laptop Charger 65W'];
  const alreadyUsed = (workOrder.partsUsed || []).some((part) => String(part.inventoryPartId || '') === String(usagePart._id));
  if (!alreadyUsed) {
    await addPart(
      workOrder._id,
      {
        inventoryPartId: usagePart._id,
        name: usagePart.partName,
        quantity: 1,
        unitPrice: usagePart.sellingPrice || 1800,
        mergeDuplicateInventory: true
      },
      admin
    );
    log('FIFO usage Laptop Charger 65W x1', 'created');
  } else {
    log('FIFO usage Laptop Charger 65W x1', 'exists');
  }
}

try {
  await connectDb();
  const admin = await demoAdmin();
  if (!admin) throw new Error('Create an admin user before seeding purchase/import demo records.');

  const partPayloads = [
    { partName: 'Laptop Keyboard — Dell Inspiron 15', category: 'Laptop Parts', costPrice: 700, sellingPrice: 1200, lowStockLimit: 2 },
    { partName: 'CCTV Adapter 12V 2A', category: 'CCTV', costPrice: 200, sellingPrice: 450, lowStockLimit: 5 },
    { partName: 'Laptop Charger 65W', category: 'Power Components', costPrice: 1400, sellingPrice: 1900, lowStockLimit: 2 },
    { partName: 'Printer Roller — HP P1007', category: 'Printer', costPrice: 900, sellingPrice: 1350, lowStockLimit: 2 },
    { partName: 'SSD 1TB', category: 'Storage', costPrice: 4200, sellingPrice: 6200, lowStockLimit: 2 },
    { partName: 'Laptop Screen 14.0 LED', category: 'Laptop Parts', costPrice: 2800, sellingPrice: 3900, lowStockLimit: 1 },
    { partName: 'RAM 8GB', category: 'Memory', costPrice: 1450, sellingPrice: 2200, lowStockLimit: 3 },
    { partName: 'Laptop Battery — Dell 6 Cell', category: 'Power Components', costPrice: 1200, sellingPrice: 1800, lowStockLimit: 2 }
  ];

  const parts = {};
  for (const payload of partPayloads) {
    const result = await upsertPart(payload);
    parts[payload.partName] = result.item;
    log(`part ${payload.partName}`, result.created ? 'created' : 'exists');
  }

  const samples = [
    {
      invoiceRef: 'INV-2505-0012',
      supplierName: 'Demo Supplier A',
      contactNumber: 'DEMO-SUP-A',
      placeCity: 'Sample City',
      purchaseSource: 'Supplier',
      purchaseDate: demoDate('2026-05-31'),
      deliveryStatus: 'Received',
      paymentStatus: 'Paid',
      warrantyPeriod: '6 Months',
      notes: 'Good quality parts. Fast delivery.',
      items: [
        { partName: 'Laptop Keyboard — Dell Inspiron 15', quantityOrdered: 5, quantityReceived: 5, unitCost: 700 },
        { partName: 'CCTV Adapter 12V 2A', quantityOrdered: 10, quantityReceived: 10, unitCost: 200 },
        { partName: 'Laptop Charger 65W', quantityOrdered: 5, quantityReceived: 5, unitCost: 1400 }
      ]
    },
    {
      invoiceRef: 'INV-2505-0011',
      supplierName: 'Demo Supplier B',
      contactNumber: 'DEMO-SUP-B',
      placeCity: 'Sample City',
      purchaseSource: 'Supplier',
      purchaseDate: demoDate('2026-05-30'),
      deliveryStatus: 'Partially Received',
      paymentStatus: 'Partial',
      warrantyPeriod: '3 Months',
      notes: 'Some items pending delivery. Balance payment after full delivery.',
      items: [
        { partName: 'Printer Roller — HP P1007', quantityOrdered: 4, quantityReceived: 2, unitCost: 900 },
        { partName: 'SSD 1TB', quantityOrdered: 3, quantityReceived: 1, unitCost: 4200 }
      ]
    },
    {
      invoiceRef: 'PO-2505-0009',
      supplierName: 'Online Store Amazon',
      contactNumber: '--',
      placeCity: 'Online',
      purchaseSource: 'Online',
      purchaseDate: demoDate('2026-05-28'),
      deliveryStatus: 'Ordered',
      paymentStatus: 'Pending',
      warrantyPeriod: '1 Year',
      notes: 'Online order placed. Waiting for delivery.',
      items: [
        { partName: 'Laptop Screen 14.0 LED', quantityOrdered: 2, quantityReceived: 0, unitCost: 2800 },
        { partName: 'RAM 8GB', quantityOrdered: 5, quantityReceived: 0, unitCost: 1450 }
      ]
    },
    {
      invoiceRef: 'INV-2505-0008',
      supplierName: 'Local Market Shop',
      contactNumber: 'DEMO-SUP-C',
      placeCity: 'Sample City',
      purchaseSource: 'Local Shop',
      purchaseDate: demoDate('2026-05-27'),
      deliveryStatus: 'Returned',
      paymentStatus: 'Paid',
      warrantyPeriod: 'No Warranty',
      notes: 'Parts returned due to quality issue.',
      items: [
        { partName: 'Laptop Battery — Dell 6 Cell', quantityOrdered: 3, quantityReceived: 0, unitCost: 1200 }
      ]
    }
  ];

  const purchases = [];
  for (const sample of samples) {
    purchases.push(await upsertPurchase(sample, parts, admin));
  }

  await ensureFifoUsage(parts, admin);

  for (const purchase of purchases) {
    const detail = await getPurchase(purchase.id || purchase._id);
    console.log(`summary  ${detail.invoiceRef}: items=${detail.items.length}, used=${detail.totalUsed || 0}, remaining=${detail.totalRemaining || 0}`);
  }

  console.log('Purchase/import demo seed complete.');
  await mongoose.disconnect();
} catch (error) {
  console.error('Purchase/import demo seed failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
}
