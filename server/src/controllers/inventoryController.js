import InventoryPart from '../models/InventoryPart.js';
import { appError, clean, numberValue, required } from '../utils/http.js';
import { applyStockMovement, syncPartAvailability } from '../services/stockMovementService.js';

export async function list(_req, res) {
  const parts = await InventoryPart.find().sort({ partName: 1 });
  await Promise.all(parts.map(async (part) => {
    syncPartAvailability(part);
    if (part.isModified()) await part.save();
  }));
  res.json({ parts });
}

export async function create(req, res) {
  required(req.body, ['partName']);
  const onHand = numberValue(req.body.onHand ?? req.body.stock ?? req.body.availableStock, 0);
  const reserved = numberValue(req.body.reserved, 0);
  if (onHand < 0 || reserved < 0 || reserved > onHand) throw appError('Invalid stock values');
  let part = await InventoryPart.create({
    partName: clean(req.body.partName),
    category: clean(req.body.category) || 'General',
    costPrice: numberValue(req.body.costPrice, 0),
    sellingPrice: numberValue(req.body.sellingPrice, 0),
    stock: 0,
    onHand: 0,
    reserved: 0,
    available: 0,
    lowStockLimit: numberValue(req.body.lowStockLimit, 0)
  });
  if (onHand > 0) {
    const result = await applyStockMovement({
      partId: part._id,
      type: 'ADD',
      quantity: onHand,
      source: 'Opening Stock',
      note: 'Initial stock entry',
      userId: req.user._id
    });
    part = result.part;
  }
  if (reserved > 0) {
    part.reserved = reserved;
    syncPartAvailability(part);
    await part.save();
  }
  res.status(201).json({ part, message: 'Inventory part saved' });
}

export async function update(req, res) {
  const part = await InventoryPart.findById(req.params.id);
  if (!part) throw appError('Inventory part not found', 404);
  if (req.body.partName !== undefined) part.partName = clean(req.body.partName);
  if (req.body.category !== undefined) part.category = clean(req.body.category) || 'General';
  if (req.body.costPrice !== undefined) part.costPrice = numberValue(req.body.costPrice, 0);
  if (req.body.sellingPrice !== undefined) part.sellingPrice = numberValue(req.body.sellingPrice, 0);
  if (req.body.onHand !== undefined || req.body.stock !== undefined || req.body.availableStock !== undefined) {
    const onHand = numberValue(req.body.onHand ?? req.body.stock ?? req.body.availableStock, 0);
    if (onHand < 0) throw appError('Stock cannot be negative');
    part.onHand = onHand;
  }
  if (req.body.reserved !== undefined) part.reserved = numberValue(req.body.reserved, 0);
  if (req.body.lowStockLimit !== undefined) part.lowStockLimit = numberValue(req.body.lowStockLimit, 0);
  syncPartAvailability(part);
  await part.save();
  res.json({ part, message: 'Inventory updated' });
}

export async function remove(req, res) {
  const part = await InventoryPart.findByIdAndDelete(req.params.id);
  if (!part) throw appError('Inventory part not found', 404);
  res.json({ message: 'Inventory part deleted' });
}
