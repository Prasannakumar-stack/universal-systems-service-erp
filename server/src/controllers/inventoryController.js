import AuditLog from '../models/AuditLog.js';
import InventoryPart from '../models/InventoryPart.js';
import PurchaseImport from '../models/PurchaseImport.js';
import PurchaseUsageAllocation from '../models/PurchaseUsageAllocation.js';
import StockMovement from '../models/StockMovement.js';
import WorkOrder from '../models/WorkOrder.js';
import { normalizeRole } from '../permissions.js';
import { logAudit } from '../services/auditService.js';
import { appError, clean, numberValue, required } from '../utils/http.js';
import { addDateRange, paginatedPayload, paginationMeta, parsePagination, searchRegex, withIds } from '../utils/pagination.js';
import { applyStockMovement, syncPartAvailability } from '../services/stockMovementService.js';

const TRASH_RETENTION_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const INVENTORY_LIFECYCLE_AUDIT_ACTIONS = [
  'inventory_part_disabled',
  'inventory_part_moved_to_trash',
  'inventory_part_restored',
  'inventory_part_permanently_deleted'
];

function isAdminUser(user) {
  const role = normalizeRole(user?.role);
  return role === 'admin' || role === 'super_admin';
}

function trashExpiryFrom(date) {
  return new Date(date.getTime() + TRASH_RETENTION_DAYS * DAY_MS);
}

function trashDaysLeft(deleteExpiresAt) {
  if (!deleteExpiresAt) return null;
  const expiresAt = new Date(deleteExpiresAt);
  if (Number.isNaN(expiresAt.getTime())) return null;
  return Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / DAY_MS));
}

function inventoryLifecycleState(part = {}) {
  if (part.isDeleted) return 'trash';
  if (part.isDisabled) return 'disabled';
  return 'active';
}

function inventoryLifecycleFilter(query = {}, user = null) {
  if (!isAdminUser(user)) return { isDeleted: { $ne: true }, isDisabled: { $ne: true } };
  const lifecycle = clean(query.lifecycle || query.archiveStatus).toLowerCase();
  if (lifecycle === 'disabled') return { isDeleted: { $ne: true }, isDisabled: true };
  if (lifecycle === 'trash') return { isDeleted: true };
  if (lifecycle === 'all') return {};
  return { isDeleted: { $ne: true }, isDisabled: { $ne: true } };
}

function emptyPartLinkedSummary(part = {}) {
  return {
    workOrderUsageCount: 0,
    purchaseCount: 0,
    purchaseUsageCount: 0,
    stockMovementCount: 0,
    reservationCount: Number(part.reserved || 0) > 0 ? Number(part.reserved || 0) : 0,
    stockBalanceCount: Number(part.onHand || part.stock || 0) > 0 ? 1 : 0,
    auditCount: 0,
    hasLinkedRecords: false
  };
}

function finalizePartLinkedSummary(summary) {
  summary.hasLinkedRecords = Boolean(
    summary.workOrderUsageCount
    || summary.purchaseCount
    || summary.purchaseUsageCount
    || summary.stockMovementCount
    || summary.reservationCount
    || summary.stockBalanceCount
    || summary.auditCount
  );
  summary.message = summary.hasLinkedRecords
    ? 'Reserved/used in work orders or stock history'
    : 'No linked records';
  return summary;
}

function serializePartLifecycle(part, summary = null) {
  const lifecycleState = inventoryLifecycleState(part);
  const linkedRecordSummary = finalizePartLinkedSummary(summary || emptyPartLinkedSummary(part));
  const lifecycleAction = lifecycleState === 'active'
    ? 'disable'
    : lifecycleState === 'trash'
      ? 'restore'
      : 'restore';
  return {
    lifecycleState,
    lifecycleAction,
    linkedRecordSummary,
    canMoveToTrash: lifecycleState !== 'trash',
    canDisable: lifecycleState === 'active',
    canRestore: lifecycleState !== 'active',
    trashDaysLeft: lifecycleState === 'trash' ? trashDaysLeft(part.deleteExpiresAt) : null
  };
}

async function partLinkedRecordSummaries(parts = []) {
  const rows = parts.map((part) => (typeof part.toObject === 'function' ? part.toObject() : part));
  const ids = rows.map((part) => part._id).filter(Boolean);
  const summaries = new Map(rows.map((part) => [String(part._id), emptyPartLinkedSummary(part)]));
  if (!ids.length) return summaries;

  const [workOrders, purchases, purchaseUsageRows, stockMovementRows, auditRows] = await Promise.all([
    WorkOrder.find({ $or: [{ 'partsUsed.inventoryPartId': { $in: ids } }, { 'partRequests.inventoryPartId': { $in: ids } }] })
      .select('partsUsed.inventoryPartId partRequests.inventoryPartId')
      .lean(),
    PurchaseImport.find({ 'items.inventoryPartId': { $in: ids } }).select('items.inventoryPartId').lean(),
    PurchaseUsageAllocation.aggregate([
      { $match: { inventoryPartId: { $in: ids } } },
      { $group: { _id: '$inventoryPartId', count: { $sum: 1 } } }
    ]),
    StockMovement.aggregate([
      { $match: { partId: { $in: ids } } },
      { $group: { _id: '$partId', count: { $sum: 1 } } }
    ]),
    AuditLog.aggregate([
      {
        $match: {
          module: 'inventory',
          recordId: { $in: ids },
          action: { $nin: INVENTORY_LIFECYCLE_AUDIT_ACTIONS }
        }
      },
      { $group: { _id: '$recordId', count: { $sum: 1 } } }
    ])
  ]);

  workOrders.forEach((order) => {
    const touchedPartIds = new Set();
    (order.partsUsed || []).forEach((part) => {
      if (part.inventoryPartId) touchedPartIds.add(String(part.inventoryPartId));
    });
    (order.partRequests || []).forEach((part) => {
      if (part.inventoryPartId) touchedPartIds.add(String(part.inventoryPartId));
    });
    touchedPartIds.forEach((partId) => {
      const summary = summaries.get(partId);
      if (summary) summary.workOrderUsageCount += 1;
    });
  });

  purchases.forEach((purchase) => {
    const touchedPartIds = new Set();
    (purchase.items || []).forEach((item) => {
      if (item.inventoryPartId) touchedPartIds.add(String(item.inventoryPartId));
    });
    touchedPartIds.forEach((partId) => {
      const summary = summaries.get(partId);
      if (summary) summary.purchaseCount += 1;
    });
  });

  purchaseUsageRows.forEach((row) => {
    const summary = summaries.get(String(row._id));
    if (summary) summary.purchaseUsageCount += Number(row.count || 0);
  });

  stockMovementRows.forEach((row) => {
    const summary = summaries.get(String(row._id));
    if (summary) summary.stockMovementCount += Number(row.count || 0);
  });

  auditRows.forEach((row) => {
    const summary = summaries.get(String(row._id));
    if (summary) summary.auditCount += Number(row.count || 0);
  });

  summaries.forEach(finalizePartLinkedSummary);
  return summaries;
}

export async function list(req, res) {
  try {
    const baseFilter = {};
    const { page, limit, skip } = parsePagination(req.query);
    const regex = searchRegex(req.query.search);
    if (regex) baseFilter.$or = [
      { partName: regex },
      { category: regex },
      { sku: regex },
      { supplier: regex },
      { purchaseRef: regex },
      { brand: regex },
      { deviceModel: regex },
      { compatibleDeviceType: regex }
    ];
    if (clean(req.query.category)) baseFilter.category = clean(req.query.category);
    if (clean(req.query.stockStatus)) {
      if (req.query.stockStatus === 'out' || req.query.stockStatus === 'outOfStock') baseFilter.available = { $lte: 0 };
      if (req.query.stockStatus === 'low' || req.query.stockStatus === 'lowStock') baseFilter.$expr = { $and: [{ $gt: ['$available', 0] }, { $lte: ['$available', '$lowStockLimit'] }] };
      if (req.query.stockStatus === 'in' || req.query.stockStatus === 'inStock') baseFilter.$expr = { $gt: ['$available', '$lowStockLimit'] };
    }
    addDateRange(baseFilter, req.query);
    const filter = { ...baseFilter, ...inventoryLifecycleFilter(req.query, req.user) };
    const lifecycleCountQueries = {
      active: { ...baseFilter, ...inventoryLifecycleFilter({ lifecycle: 'active' }, req.user) },
      disabled: { ...baseFilter, ...inventoryLifecycleFilter({ lifecycle: 'disabled' }, req.user) },
      trash: { ...baseFilter, ...inventoryLifecycleFilter({ lifecycle: 'trash' }, req.user) },
      all: { ...baseFilter, ...inventoryLifecycleFilter({ lifecycle: 'all' }, req.user) }
    };

    const sortBy = clean(req.query.sortBy);
    const sort = sortBy === 'stock'
      ? { available: 1, partName: 1 }
      : sortBy === 'value'
        ? { onHand: -1, partName: 1 }
        : { partName: 1 };

    const [total, rows, summaryRows, categories, activeCount, disabledCount, trashCount, allCount] = await Promise.all([
      InventoryPart.countDocuments(filter),
      InventoryPart.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      InventoryPart.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            totalParts: { $sum: 1 },
            totalUnits: { $sum: { $ifNull: ['$onHand', 0] } },
            reserved: { $sum: { $ifNull: ['$reserved', 0] } },
            stockValue: { $sum: { $multiply: [{ $ifNull: ['$onHand', 0] }, { $ifNull: ['$costPrice', 0] }] } },
            lowStock: {
              $sum: {
                $cond: [
                  { $and: [{ $gt: ['$available', 0] }, { $lte: ['$available', '$lowStockLimit'] }] },
                  1,
                  0
                ]
              }
            },
            outOfStock: { $sum: { $cond: [{ $lte: ['$available', 0] }, 1, 0] } }
          }
        }
      ]),
      InventoryPart.distinct('category', inventoryLifecycleFilter(req.query, req.user)),
      InventoryPart.countDocuments(lifecycleCountQueries.active),
      InventoryPart.countDocuments(lifecycleCountQueries.disabled),
      InventoryPart.countDocuments(lifecycleCountQueries.trash),
      InventoryPart.countDocuments(lifecycleCountQueries.all)
    ]);
    const summary = summaryRows[0] || { totalParts: 0, totalUnits: 0, reserved: 0, stockValue: 0, lowStock: 0, outOfStock: 0 };
    const linkedSummaries = await partLinkedRecordSummaries(rows);
    const parts = withIds(rows).map((part, index) => ({
      ...part,
      ...serializePartLifecycle(rows[index], linkedSummaries.get(String(rows[index]._id)))
    }));
    res.json(paginatedPayload('parts', parts, paginationMeta(page, limit, total), {
      summary,
      categories: categories.filter(Boolean).sort(),
      lifecycleCounts: {
        active: activeCount,
        disabled: disabledCount,
        trash: trashCount,
        all: allCount
      }
    }));
  } catch (error) {
    console.error('Inventory list failed', error);
    res.status(500).json({ success: false, message: 'Unable to load inventory right now' });
  }
}

export async function create(req, res) {
  required(req.body, ['partName', 'category', 'unitType', 'costPrice', 'sellingPrice', 'onHand', 'lowStockLimit']);
  const onHand = numberValue(req.body.onHand ?? req.body.stock ?? req.body.availableStock, 0);
  const costPrice = numberValue(req.body.costPrice, 0);
  const sellingPrice = numberValue(req.body.sellingPrice, 0);
  const lowStockLimit = numberValue(req.body.lowStockLimit, 0);
  const brand = clean(req.body.brand);
  if (onHand < 0 || costPrice < 0 || sellingPrice < 0 || lowStockLimit < 0) throw appError('Stock and price values cannot be negative');
  let part = await InventoryPart.create({
    partName: clean(req.body.partName),
    category: clean(req.body.category) || 'General',
    sku: clean(req.body.sku),
    brand,
    deviceModel: clean(req.body.deviceModel),
    compatibleDeviceType: clean(req.body.compatibleDeviceType),
    supplier: clean(req.body.supplier || req.body.supplierName),
    purchaseRef: clean(req.body.purchaseRef || req.body.invoiceRef),
    description: clean(req.body.description || req.body.notes),
    unitType: clean(req.body.unitType) || 'Piece',
    costPrice,
    sellingPrice,
    stock: 0,
    onHand: 0,
    reserved: 0,
    available: 0,
    lowStockLimit
  });
  if (onHand > 0) {
    const result = await applyStockMovement({
      partId: part._id,
      type: 'ADD',
      quantity: onHand,
      source: 'Opening Stock',
      note: 'Opening stock added.',
      userId: req.user._id
    });
    part = result.part;
  }
  res.status(201).json({ part, message: 'Inventory part saved' });
}

export async function update(req, res) {
  const part = await InventoryPart.findById(req.params.id);
  if (!part) throw appError('Inventory part not found', 404);
  if (req.body.partName !== undefined) part.partName = clean(req.body.partName);
  if (req.body.category !== undefined) part.category = clean(req.body.category) || 'General';
  if (req.body.sku !== undefined) part.sku = clean(req.body.sku);
  if (req.body.brand !== undefined) part.brand = clean(req.body.brand);
  if (req.body.deviceModel !== undefined) part.deviceModel = clean(req.body.deviceModel);
  if (req.body.compatibleDeviceType !== undefined) part.compatibleDeviceType = clean(req.body.compatibleDeviceType);
  if (req.body.supplier !== undefined || req.body.supplierName !== undefined) part.supplier = clean(req.body.supplier || req.body.supplierName);
  if (req.body.purchaseRef !== undefined || req.body.invoiceRef !== undefined) part.purchaseRef = clean(req.body.purchaseRef || req.body.invoiceRef);
  if (req.body.description !== undefined || req.body.notes !== undefined) part.description = clean(req.body.description || req.body.notes);
  if (req.body.unitType !== undefined) part.unitType = clean(req.body.unitType) || 'Piece';
  if (req.body.costPrice !== undefined) {
    const costPrice = numberValue(req.body.costPrice, 0);
    if (costPrice < 0) throw appError('Cost price cannot be negative');
    part.costPrice = costPrice;
  }
  if (req.body.sellingPrice !== undefined) {
    const sellingPrice = numberValue(req.body.sellingPrice, 0);
    if (sellingPrice < 0) throw appError('Selling price cannot be negative');
    part.sellingPrice = sellingPrice;
  }
  if (req.body.onHand !== undefined || req.body.stock !== undefined || req.body.availableStock !== undefined) {
    const onHand = numberValue(req.body.onHand ?? req.body.stock ?? req.body.availableStock, 0);
    if (onHand < 0) throw appError('Stock cannot be negative');
    part.onHand = onHand;
  }
  if (req.body.lowStockLimit !== undefined) {
    const lowStockLimit = numberValue(req.body.lowStockLimit, 0);
    if (lowStockLimit < 0) throw appError('Low stock limit cannot be negative');
    part.lowStockLimit = lowStockLimit;
  }
  syncPartAvailability(part);
  await part.save();
  res.json({ part, message: 'Inventory updated' });
}

export async function disable(req, res) {
  const part = await InventoryPart.findById(req.params.id);
  if (!part) throw appError('Inventory part not found', 404);
  if (part.isDeleted) throw appError('Restore the part before disabling it', 409);
  if (part.isDisabled) throw appError('Inventory part is already disabled', 409);

  const linkedSummaries = await partLinkedRecordSummaries([part]);
  const linkedRecordSummary = linkedSummaries.get(String(part._id)) || finalizePartLinkedSummary(emptyPartLinkedSummary(part));
  const before = part.toObject();
  part.isDisabled = true;
  part.disabledAt = new Date();
  part.disabledBy = req.user?._id || null;
  await part.save();
  await logAudit({
    userId: req.user?._id || null,
    action: 'inventory_part_disabled',
    module: 'inventory',
    recordId: part._id,
    before,
    after: { disabledAt: part.disabledAt, linkedRecordSummary }
  });
  res.json({
    success: true,
    id: String(part._id),
    action: 'disabled',
    message: 'Part disabled. You can enable it again from Disabled parts.'
  });
}

export async function moveToTrash(req, res) {
  const part = await InventoryPart.findById(req.params.id);
  if (!part) throw appError('Inventory part not found', 404);
  if (part.isDeleted) throw appError('Inventory part is already in Trash', 409);

  const linkedSummaries = await partLinkedRecordSummaries([part]);
  const linkedRecordSummary = linkedSummaries.get(String(part._id)) || finalizePartLinkedSummary(emptyPartLinkedSummary(part));
  const before = part.toObject();

  const deletedAt = new Date();
  part.isDeleted = true;
  part.deletedAt = deletedAt;
  part.deletedBy = req.user?._id || null;
  part.deleteExpiresAt = trashExpiryFrom(deletedAt);
  await part.save();
  await logAudit({
    userId: req.user?._id || null,
    action: 'inventory_part_moved_to_trash',
    module: 'inventory',
    recordId: part._id,
    before,
    after: { deletedAt: part.deletedAt, deleteExpiresAt: part.deleteExpiresAt }
  });
  res.json({
    success: true,
    id: String(part._id),
    action: 'trashed',
    message: 'Moved to Trash. You can restore this part within 30 days from Trash.'
  });
}

export async function remove(req, res) {
  return moveToTrash(req, res);
}

export async function restore(req, res) {
  const part = await InventoryPart.findById(req.params.id);
  if (!part) throw appError('Inventory part not found', 404);
  if (!part.isDeleted && !part.isDisabled) throw appError('Inventory part is already active', 409);

  const restoringFromTrash = Boolean(part.isDeleted);
  if (restoringFromTrash && part.deleteExpiresAt && new Date(part.deleteExpiresAt).getTime() < Date.now()) {
    throw appError('Trash restore period has expired. Permanently delete it from Trash or contact an administrator.', 410);
  }

  const before = {
    isDisabled: Boolean(part.isDisabled),
    disabledAt: part.disabledAt || null,
    isDeleted: Boolean(part.isDeleted),
    deletedAt: part.deletedAt || null,
    deleteExpiresAt: part.deleteExpiresAt || null
  };

  if (part.isDeleted) {
    part.isDeleted = false;
    part.deletedAt = null;
    part.deletedBy = null;
    part.deleteExpiresAt = null;
  } else {
    part.isDisabled = false;
    part.disabledAt = null;
    part.disabledBy = null;
  }

  await part.save();
  await logAudit({
    userId: req.user?._id || null,
    action: 'inventory_part_restored',
    module: 'inventory',
    recordId: part._id,
    before,
    after: {
      isDisabled: Boolean(part.isDisabled),
      disabledAt: part.disabledAt || null,
      isDeleted: Boolean(part.isDeleted),
      deletedAt: part.deletedAt || null,
      deleteExpiresAt: part.deleteExpiresAt || null
    }
  });
  res.json({
    success: true,
    id: String(part._id),
    action: 'restored',
    message: 'Part restored.'
  });
}

export async function removePermanently(req, res) {
  if (!isAdminUser(req.user)) throw appError('Only Admin users can permanently delete parts', 403);
  const part = await InventoryPart.findOne({ _id: req.params.id, isDeleted: true });
  if (!part) throw appError('Inventory part not found in Trash', 404);

  const linkedSummaries = await partLinkedRecordSummaries([part]);
  const linkedRecordSummary = linkedSummaries.get(String(part._id)) || finalizePartLinkedSummary(emptyPartLinkedSummary(part));
  if (linkedRecordSummary.hasLinkedRecords) {
    throw appError('This item is used in existing records. You can disable or archive it instead.', 409);
  }

  const before = part.toObject();
  await part.deleteOne();
  await logAudit({
    userId: req.user?._id || null,
    action: 'inventory_part_permanently_deleted',
    module: 'inventory',
    recordId: part._id,
    before
  });
  res.json({ success: true, id: String(part._id), action: 'permanentlyDeleted', message: 'Inventory part permanently deleted.' });
}
