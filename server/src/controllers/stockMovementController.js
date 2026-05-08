import StockMovement from '../models/StockMovement.js';
import { applyStockMovement } from '../services/stockMovementService.js';
import { required } from '../utils/http.js';

export async function list(_req, res) {
  const filter = {};
  if (_req.query.type) filter.type = _req.query.type;
  if (_req.query.partId) filter.partId = _req.query.partId;
  if (_req.query.dateFrom || _req.query.dateTo) {
    filter.createdAt = {};
    if (_req.query.dateFrom) filter.createdAt.$gte = new Date(_req.query.dateFrom);
    if (_req.query.dateTo) filter.createdAt.$lte = new Date(_req.query.dateTo);
  }
  const movements = await StockMovement.find(filter).populate('partId userId', 'partName name username role').sort({ createdAt: -1 });
  res.json({ movements });
}

export async function create(req, res) {
  required(req.body, ['partId', 'type', 'quantity']);
  const result = await applyStockMovement({
    partId: req.body.partId,
    type: req.body.type,
    quantity: req.body.quantity,
    source: req.body.source,
    note: req.body.note,
    userId: req.user._id
  });
  res.status(201).json({ movement: result.movement, part: result.part, message: 'Stock movement recorded' });
}
