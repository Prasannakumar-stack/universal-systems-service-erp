import mongoose from 'mongoose';
import InventoryPart from '../models/InventoryPart.js';
import PurchaseImport from '../models/PurchaseImport.js';
import PurchaseUsageAllocation from '../models/PurchaseUsageAllocation.js';
import Supplier from '../models/Supplier.js';
import { appError, clean, numberValue } from '../utils/http.js';
import { addDateRange, paginatedPayload, paginationMeta, parsePagination, searchRegex, validObjectId, withId, withIds } from '../utils/pagination.js';
import { applyStockMovement } from './stockMovementService.js';
import { upsertSupplierFromPurchase } from './supplierService.js';

const DELIVERY_STATUSES = ['Ordered', 'Received', 'Partially Received', 'Returned', 'Cancelled'];
const PAYMENT_STATUSES = ['Paid', 'Pending', 'Partial'];
const PURCHASE_SOURCES = ['Local Shop', 'Supplier', 'Online', 'Dealer', 'Other'];
const STOCK_APPLIED_STATUSES = new Set(['Received', 'Partially Received']);

function normalizeStatus(value, allowed, fallback) {
  const raw = clean(value);
  return allowed.includes(raw) ? raw : fallback;
}

function purchaseDateValue(value) {
  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function purchaseSourceLabel(purchase) {
  return [purchase.invoiceRef, purchase.supplierName].filter(Boolean).join(' - ') || 'Purchase / Import';
}

function purchaseNote(purchase) {
  return `Purchased from ${purchase.supplierName || 'Supplier'} - ${purchase.invoiceRef || 'Invoice'}`;
}

function desiredAppliedQuantity(status, item) {
  if (!STOCK_APPLIED_STATUSES.has(status)) return 0;
  return Math.max(0, numberValue(item.quantityReceived, 0));
}

async function normalizedItems(rawItems = [], existingItems = []) {
  if (!Array.isArray(rawItems) || !rawItems.length) throw appError('Add at least one purchase item');
  const existingById = new Map(existingItems.map((item) => [String(item._id || item.id), item]));
  const partIds = rawItems.map((item) => validObjectId(item.inventoryPartId || item.partId)).filter(Boolean);
  const parts = await InventoryPart.find({ _id: { $in: partIds } }).lean();
  const partsById = new Map(parts.map((part) => [String(part._id), part]));

  return rawItems.map((item) => {
    const inventoryPartId = validObjectId(item.inventoryPartId || item.partId);
    if (!inventoryPartId) throw appError('Select a valid inventory part for every item');
    const part = partsById.get(String(inventoryPartId));
    if (!part) throw appError('Inventory part not found', 404);
    const quantityOrdered = Math.max(0, numberValue(item.quantityOrdered, 0));
    const quantityReceived = Math.max(0, numberValue(item.quantityReceived, 0));
    const unitCost = Math.max(0, numberValue(item.unitCost, 0));
    if (quantityOrdered <= 0 && quantityReceived <= 0) throw appError('Each item needs ordered or received quantity');
    const existing = existingById.get(String(item.id || item._id || ''));
    return {
      _id: existing?._id || item._id || new mongoose.Types.ObjectId(),
      inventoryPartId,
      partName: clean(item.partName) || part.partName,
      category: clean(item.category) || part.category || 'General',
      brand: clean(item.brand) || part.brand || '',
      deviceModel: clean(item.deviceModel) || part.deviceModel || '',
      quantityOrdered,
      quantityReceived,
      unitCost,
      totalCost: quantityReceived * unitCost,
      stockAppliedQuantity: Math.max(0, numberValue(existing?.stockAppliedQuantity, 0))
    };
  });
}

function purchasePayload(payload = {}, supplier, items, userId = null) {
  const supplierName = clean(payload.supplierName || payload.name || supplier?.name);
  const invoiceRef = clean(payload.invoiceRef || payload.invoiceNo || payload.referenceNo);
  if (!supplierName) throw appError('Supplier / shop name is required');
  if (!invoiceRef) throw appError('Invoice / Ref No. is required');
  const totalAmount = items.reduce((sum, item) => sum + numberValue(item.totalCost, 0), 0);
  return {
    supplierId: supplier?._id || payload.supplierId || null,
    supplierName,
    contactNumber: clean(payload.contactNumber || payload.phone || supplier?.phone),
    placeCity: clean(payload.placeCity || payload.city || supplier?.city),
    purchaseSource: normalizeStatus(payload.purchaseSource, PURCHASE_SOURCES, 'Supplier'),
    invoiceRef,
    purchaseDate: purchaseDateValue(payload.purchaseDate),
    deliveryStatus: normalizeStatus(payload.deliveryStatus, DELIVERY_STATUSES, 'Ordered'),
    paymentStatus: normalizeStatus(payload.paymentStatus, PAYMENT_STATUSES, 'Pending'),
    warrantyPeriod: clean(payload.warrantyPeriod || payload.warranty),
    notes: clean(payload.notes),
    items,
    totalAmount,
    updatedBy: userId
  };
}

async function itemUsedQuantity(purchaseImportId, purchaseItemId) {
  const rows = await PurchaseUsageAllocation.aggregate([
    {
      $match: {
        purchaseImportId: new mongoose.Types.ObjectId(String(purchaseImportId)),
        purchaseItemId: new mongoose.Types.ObjectId(String(purchaseItemId))
      }
    },
    { $group: { _id: null, quantity: { $sum: '$quantity' } } }
  ]);
  return rows[0]?.quantity || 0;
}

async function assertCanReduceApplied(purchase, itemId, nextApplied) {
  const used = await itemUsedQuantity(purchase._id, itemId);
  if (nextApplied < used) {
    throw appError('Cannot reduce received stock below quantities already used in work orders');
  }
}

async function applyPurchaseStockDeltas(purchase, previousItems = []) {
  const previousById = new Map(previousItems.map((item) => [String(item._id || item.id), item]));
  const currentIds = new Set(purchase.items.map((item) => String(item._id)));

  for (const oldItem of previousItems) {
    if (!currentIds.has(String(oldItem._id))) {
      await assertCanReduceApplied(purchase, oldItem._id, 0);
      if (numberValue(oldItem.stockAppliedQuantity, 0) > 0) {
        await applyStockMovement({
          partId: oldItem.inventoryPartId,
          type: 'ADJUST',
          quantity: -numberValue(oldItem.stockAppliedQuantity, 0),
          source: purchaseSourceLabel(purchase),
          sourceId: purchase._id,
          sourceType: 'PurchaseImport',
          note: purchaseNote(purchase),
          userId: purchase.updatedBy || purchase.createdBy || null
        });
      }
    }
  }

  for (const item of purchase.items) {
    const previous = previousById.get(String(item._id));
    const currentApplied = numberValue(previous?.stockAppliedQuantity ?? item.stockAppliedQuantity, 0);
    const nextApplied = desiredAppliedQuantity(purchase.deliveryStatus, item);
    await assertCanReduceApplied(purchase, item._id, nextApplied);
    const delta = nextApplied - currentApplied;
    if (delta !== 0) {
      await applyStockMovement({
        partId: item.inventoryPartId,
        type: delta > 0 ? 'ADD' : 'ADJUST',
        quantity: delta,
        source: purchaseSourceLabel(purchase),
        sourceId: purchase._id,
        sourceType: 'PurchaseImport',
        note: purchaseNote(purchase),
        userId: purchase.updatedBy || purchase.createdBy || null
      });
    }
    item.stockAppliedQuantity = nextApplied;
  }
  purchase.totalAmount = purchase.items.reduce((sum, item) => sum + numberValue(item.totalCost, 0), 0);
  await purchase.save();
}

function purchaseSearchFilter(regex) {
  if (!regex) return {};
  return {
    $or: [
      { invoiceRef: regex },
      { supplierName: regex },
      { contactNumber: regex },
      { placeCity: regex },
      { purchaseSource: regex },
      { notes: regex },
      { 'items.partName': regex },
      { 'items.category': regex },
      { 'items.brand': regex },
      { 'items.deviceModel': regex }
    ]
  };
}

export async function listPurchases(req, res) {
  const filter = purchaseSearchFilter(searchRegex(req.query.search));
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
  if (validObjectId(req.query.supplierId)) filter.supplierId = validObjectId(req.query.supplierId);
  if (clean(req.query.deliveryStatus)) filter.deliveryStatus = clean(req.query.deliveryStatus);
  if (clean(req.query.paymentStatus)) filter.paymentStatus = clean(req.query.paymentStatus);
  addDateRange(filter, req.query, 'purchaseDate');

  const lowStockMatch = {
    $or: [
      { available: { $lte: 0 } },
      { $expr: { $and: [{ $gt: ['$available', 0] }, { $lte: ['$available', '$lowStockLimit'] }] } }
    ]
  };
  const [total, rows, summaryRows, lowStockParts, suppliers] = await Promise.all([
    PurchaseImport.countDocuments(filter),
    PurchaseImport.find(filter).populate('supplierId', 'name phone city status').sort({ purchaseDate: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    PurchaseImport.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalPurchases: { $sum: 1 },
          totalSpent: { $sum: { $ifNull: ['$totalAmount', 0] } },
          pendingDeliveries: { $sum: { $cond: [{ $in: ['$deliveryStatus', ['Ordered', 'Partially Received']] }, 1, 0] } },
          pendingPayments: { $sum: { $cond: [{ $in: ['$paymentStatus', ['Pending', 'Partial']] }, 1, 0] } },
          returnedParts: { $sum: { $cond: [{ $eq: ['$deliveryStatus', 'Returned'] }, 1, 0] } }
        }
      }
    ]),
    InventoryPart.countDocuments(lowStockMatch),
    Supplier.find({ status: 'Active' }).sort({ name: 1 }).limit(500).lean()
  ]);
  const summary = summaryRows[0] || { totalPurchases: 0, totalSpent: 0, pendingDeliveries: 0, pendingPayments: 0, returnedParts: 0 };
  summary.lowStockParts = lowStockParts;
  const purchases = withIds(rows).map((purchase) => ({
    ...purchase,
    supplierId: purchase.supplierId && typeof purchase.supplierId === 'object' ? withId(purchase.supplierId) : purchase.supplierId,
    itemsCount: purchase.items?.length || 0
  }));
  res.json(paginatedPayload('purchases', purchases, paginationMeta(page, limit, total), { summary, suppliers: withIds(suppliers) }));
}

export async function getPurchase(id) {
  const purchase = await PurchaseImport.findById(id).populate('supplierId', 'name phone email address city gstNumber notes status').lean();
  if (!purchase) throw appError('Purchase / import record not found', 404);
  const allocations = await PurchaseUsageAllocation.find({ purchaseImportId: purchase._id })
    .populate({
      path: 'workOrderId',
      select: 'customerId device status createdAt',
      populate: { path: 'customerId', select: 'name phone' }
    })
    .lean();
  const usage = allocations.map((allocation) => {
    const row = withId(allocation);
    row.purchaseImportId = String(row.purchaseImportId);
    row.purchaseItemId = String(row.purchaseItemId);
    row.inventoryPartId = String(row.inventoryPartId);
    row.workOrderId = row.workOrderId && typeof row.workOrderId === 'object' ? withId(row.workOrderId) : row.workOrderId;
    if (row.workOrderId?.customerId) row.workOrderId.customerId = withId(row.workOrderId.customerId);
    return row;
  });
  const usedByItem = usage.reduce((map, allocation) => {
    const key = String(allocation.purchaseItemId);
    map[key] = (map[key] || 0) + numberValue(allocation.quantity, 0);
    return map;
  }, {});
  const totalUsed = usage.reduce((sum, allocation) => sum + numberValue(allocation.quantity, 0), 0);
  const totalRemaining = (purchase.items || []).reduce((sum, item) => {
    const used = usedByItem[String(item._id)] || 0;
    return sum + Math.max(0, numberValue(item.stockAppliedQuantity, 0) - used);
  }, 0);

  return {
    ...withId(purchase),
    supplierId: purchase.supplierId && typeof purchase.supplierId === 'object' ? withId(purchase.supplierId) : purchase.supplierId,
    usage,
    usedByItem,
    totalUsed,
    totalRemaining
  };
}

export async function createPurchase(payload = {}, user) {
  const supplier = await upsertSupplierFromPurchase(payload, user?._id || null);
  const items = await normalizedItems(payload.items || []);
  const purchase = await PurchaseImport.create({
    ...purchasePayload(payload, supplier, items, user?._id || null),
    createdBy: user?._id || null
  });
  await applyPurchaseStockDeltas(purchase, []);
  return getPurchase(purchase._id);
}

export async function updatePurchase(id, payload = {}, user) {
  const purchase = await PurchaseImport.findById(id);
  if (!purchase) throw appError('Purchase / import record not found', 404);
  const previousItems = purchase.items.map((item) => item.toObject());
  const supplier = await upsertSupplierFromPurchase(payload, user?._id || null);
  const items = await normalizedItems(payload.items || [], purchase.items);
  Object.assign(purchase, purchasePayload(payload, supplier, items, user?._id || null));
  await applyPurchaseStockDeltas(purchase, previousItems);
  return getPurchase(purchase._id);
}

export async function deletePurchase(id, user) {
  const purchase = await PurchaseImport.findById(id);
  if (!purchase) throw appError('Purchase / import record not found', 404);
  for (const item of purchase.items) {
    await assertCanReduceApplied(purchase, item._id, 0);
  }
  for (const item of purchase.items) {
    const applied = numberValue(item.stockAppliedQuantity, 0);
    if (applied > 0) {
      await applyStockMovement({
        partId: item.inventoryPartId,
        type: 'ADJUST',
        quantity: -applied,
        source: purchaseSourceLabel(purchase),
        sourceId: purchase._id,
        sourceType: 'PurchaseImport',
        note: `Deleted purchase import: ${purchaseNote(purchase)}`,
        userId: user?._id || null
      });
    }
  }
  await PurchaseUsageAllocation.deleteMany({ purchaseImportId: purchase._id });
  await purchase.deleteOne();
  return purchase;
}

export async function savePurchaseBill(id, file, user) {
  const purchase = await PurchaseImport.findById(id);
  if (!purchase) throw appError('Purchase / import record not found', 404);
  if (!file) throw appError('Bill / invoice file is required');
  purchase.billFile = {
    url: `/uploads/${file.filename}`,
    filename: file.filename,
    originalName: file.originalname || '',
    mimetype: file.mimetype || '',
    size: file.size || 0,
    uploadedAt: new Date()
  };
  purchase.updatedBy = user?._id || null;
  await purchase.save();
  return getPurchase(purchase._id);
}

export async function allocatePurchaseUsage({ inventoryPartId, workOrderId, workOrderPartId, quantity, userId = null }) {
  const qty = Math.max(0, numberValue(quantity, 0));
  if (!inventoryPartId || !workOrderId || !workOrderPartId || qty <= 0) return [];
  let remaining = qty;
  const purchases = await PurchaseImport.find({
    deliveryStatus: { $in: ['Received', 'Partially Received'] },
    'items.inventoryPartId': inventoryPartId
  }).sort({ purchaseDate: 1, createdAt: 1 });
  const created = [];

  for (const purchase of purchases) {
    for (const item of purchase.items) {
      if (String(item.inventoryPartId) !== String(inventoryPartId)) continue;
      const used = await itemUsedQuantity(purchase._id, item._id);
      const available = Math.max(0, numberValue(item.stockAppliedQuantity, 0) - used);
      if (available <= 0) continue;
      const take = Math.min(available, remaining);
      const allocation = await PurchaseUsageAllocation.create({
        purchaseImportId: purchase._id,
        purchaseItemId: item._id,
        inventoryPartId,
        workOrderId,
        workOrderPartId,
        quantity: take,
        userId
      });
      created.push(allocation);
      remaining -= take;
      if (remaining <= 0) return created;
    }
  }
  return created;
}

export async function releasePurchaseUsage({ inventoryPartId, workOrderId, workOrderPartId, quantity }) {
  if (!inventoryPartId || !workOrderId || !workOrderPartId) return 0;
  let remaining = Math.max(0, numberValue(quantity, 0));
  if (remaining <= 0) return 0;
  let released = 0;
  const allocations = await PurchaseUsageAllocation.find({ inventoryPartId, workOrderId, workOrderPartId }).sort({ createdAt: -1 });
  for (const allocation of allocations) {
    const current = numberValue(allocation.quantity, 0);
    if (current <= remaining) {
      released += current;
      remaining -= current;
      await allocation.deleteOne();
    } else {
      allocation.quantity = current - remaining;
      released += remaining;
      remaining = 0;
      await allocation.save();
    }
    if (remaining <= 0) break;
  }
  return released;
}

export async function releaseAllPurchaseUsageForWorkOrderPart({ inventoryPartId, workOrderId, workOrderPartId }) {
  if (!inventoryPartId || !workOrderId || !workOrderPartId) return;
  await PurchaseUsageAllocation.deleteMany({ inventoryPartId, workOrderId, workOrderPartId });
}
