import InventoryPart from '../models/InventoryPart.js';
import StockMovement from '../models/StockMovement.js';
import { appError, clean, numberValue } from '../utils/http.js';
import { logAudit } from './auditService.js';
import { createNotification } from './notificationService.js';

export function syncPartAvailability(part) {
  part.onHand = Math.max(0, numberValue(part.onHand, numberValue(part.stock, 0)));
  part.reserved = Math.max(0, numberValue(part.reserved, 0));
  if (part.reserved > part.onHand) throw appError('Reserved stock cannot exceed on hand stock');
  part.available = Math.max(0, part.onHand - part.reserved);
  part.stock = part.onHand;
}

export async function applyStockMovement({ partId, type, quantity, source = 'Manual', sourceId = null, sourceType = '', note = '', userId = null }) {
  if (!['ADD', 'USED', 'RETURN', 'ADJUST'].includes(type)) throw appError('Invalid stock movement type');
  const qty = numberValue(quantity, 0);
  if (!qty) throw appError('Quantity is required');

  const part = await InventoryPart.findById(partId);
  if (!part) throw appError('Inventory part not found', 404);
  syncPartAvailability(part);

  if (type === 'ADD' || type === 'RETURN') {
    if (qty < 0) throw appError(`${type} quantity must be positive`);
    part.onHand += qty;
  }

  if (type === 'USED') {
    if (qty < 0) throw appError('USED quantity must be positive');
    if (part.available - qty < 0) throw appError('Not enough available stock');
    if (part.onHand - qty < 0) throw appError('Not enough available stock');
    if (part.reserved > 0) part.reserved = Math.max(0, part.reserved - qty);
    part.onHand -= qty;
  }

  if (type === 'ADJUST') {
    if (part.onHand + qty < 0) throw appError('Adjustment would make stock negative');
    part.onHand += qty;
    if (part.reserved > part.onHand) part.reserved = part.onHand;
  }

  syncPartAvailability(part);
  await part.save();

  const movement = await StockMovement.create({
    partId: part._id,
    type,
    quantity: qty,
    balanceAfter: part.onHand,
    source: clean(source) || 'Manual',
    sourceId: sourceId || null,
    sourceType: clean(sourceType),
    note: clean(note),
    userId
  });
  await logAudit({
    userId,
    action: 'stock_changed',
    module: 'inventory',
    recordId: part._id,
    before: { onHand: part.onHand - (type === 'ADD' || type === 'RETURN' ? qty : type === 'USED' ? -qty : qty), reserved: part.reserved },
    after: { type, quantity: qty, onHand: part.onHand, reserved: part.reserved, available: part.available }
  });

  if (part.available <= part.lowStockLimit) {
    await createNotification({
      title: 'Low stock warning',
      message: `${part.partName} has ${part.available} available.`,
      type: 'LOW_STOCK',
      role: 'admin',
      sourceId: part._id
    });
  }

  return { part, movement };
}

export async function reservePart({ partId, quantity, userId = null, sourceId = null }) {
  const qty = Math.max(1, numberValue(quantity, 1));
  const part = await InventoryPart.findById(partId);
  if (!part) throw appError('Inventory part not found', 404);
  syncPartAvailability(part);
  if (part.available < qty) throw appError('Insufficient available stock to reserve');
  part.reserved += qty;
  syncPartAvailability(part);
  await part.save();
  await createNotification({
    title: 'Parts requested',
    message: `${qty} ${part.partName} reserved for technician request.`,
    type: 'WORK_ORDER',
    role: 'admin',
    userId,
    sourceId
  });
  return part;
}
