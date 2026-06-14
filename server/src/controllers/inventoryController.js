import InventoryPart from '../models/InventoryPart.js';
import { appError, clean, numberValue, required } from '../utils/http.js';
import { addDateRange, paginatedPayload, paginationMeta, parsePagination, searchRegex, withIds } from '../utils/pagination.js';
import { applyStockMovement, syncPartAvailability } from '../services/stockMovementService.js';

export async function list(req, res) {
  try {
    const filter = {};
    const { page, limit, skip } = parsePagination(req.query);
    const regex = searchRegex(req.query.search);
    if (regex) filter.$or = [
      { partName: regex },
      { category: regex },
      { sku: regex },
      { supplier: regex },
      { purchaseRef: regex },
      { brand: regex },
      { deviceModel: regex },
      { compatibleDeviceType: regex }
    ];
    if (clean(req.query.category)) filter.category = clean(req.query.category);
    if (clean(req.query.stockStatus)) {
      if (req.query.stockStatus === 'out' || req.query.stockStatus === 'outOfStock') filter.available = { $lte: 0 };
      if (req.query.stockStatus === 'low' || req.query.stockStatus === 'lowStock') filter.$expr = { $and: [{ $gt: ['$available', 0] }, { $lte: ['$available', '$lowStockLimit'] }] };
      if (req.query.stockStatus === 'in' || req.query.stockStatus === 'inStock') filter.$expr = { $gt: ['$available', '$lowStockLimit'] };
    }
    addDateRange(filter, req.query);

    const sortBy = clean(req.query.sortBy);
    const sort = sortBy === 'stock'
      ? { available: 1, partName: 1 }
      : sortBy === 'value'
        ? { onHand: -1, partName: 1 }
        : { partName: 1 };

    const [total, rows, summaryRows, categories] = await Promise.all([
      InventoryPart.countDocuments(filter),
      InventoryPart.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      InventoryPart.aggregate([
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
      InventoryPart.distinct('category')
    ]);
    const summary = summaryRows[0] || { totalParts: 0, totalUnits: 0, reserved: 0, stockValue: 0, lowStock: 0, outOfStock: 0 };
    const parts = withIds(rows);
    res.json(paginatedPayload('parts', parts, paginationMeta(page, limit, total), {
      summary,
      categories: categories.filter(Boolean).sort()
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

export async function remove(req, res) {
  const part = await InventoryPart.findByIdAndDelete(req.params.id);
  if (!part) throw appError('Inventory part not found', 404);
  res.json({ message: 'Inventory part deleted' });
}
