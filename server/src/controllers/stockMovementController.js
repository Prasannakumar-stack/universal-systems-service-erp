import InventoryPart from '../models/InventoryPart.js';
import StockMovement from '../models/StockMovement.js';
import User from '../models/User.js';
import { applyStockMovement } from '../services/stockMovementService.js';
import { clean, required } from '../utils/http.js';
import { addDateRange, paginatedPayload, paginationMeta, parsePagination, searchRegex, validObjectId, withNestedIds } from '../utils/pagination.js';

export async function list(req, res) {
  try {
    const filter = {};
    const clauses = [];
    const { page, limit, skip } = parsePagination(req.query);
    if (clean(req.query.type)) filter.type = clean(req.query.type);
    if (validObjectId(req.query.partId)) filter.partId = validObjectId(req.query.partId);
    addDateRange(filter, req.query);

    const regex = searchRegex(req.query.search);
    if (regex) {
      const [parts, users] = await Promise.all([
        InventoryPart.find({ $or: [{ partName: regex }, { category: regex }] }).select('_id').limit(1000).lean(),
        User.find({ $or: [{ name: regex }, { username: regex }] }).select('_id').limit(1000).lean()
      ]);
      clauses.push({
        $or: [
          { source: regex },
          { note: regex },
          { type: regex },
          { sourceType: regex },
          { partId: { $in: parts.map((item) => item._id) } },
          { userId: { $in: users.map((item) => item._id) } }
        ]
      });
    }
    if (clauses.length) filter.$and = clauses;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [total, rows, summaryRows] = await Promise.all([
      StockMovement.countDocuments(filter),
      StockMovement.find(filter)
        .populate('partId userId', 'partName name username role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      StockMovement.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            addedToday: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'ADD'] }, { $gte: ['$createdAt', today] }, { $lt: ['$createdAt', tomorrow] }] }, '$quantity', 0] } },
            usedToday: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'USED'] }, { $gte: ['$createdAt', today] }, { $lt: ['$createdAt', tomorrow] }] }, '$quantity', 0] } },
            returnedToday: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'RETURN'] }, { $gte: ['$createdAt', today] }, { $lt: ['$createdAt', tomorrow] }] }, '$quantity', 0] } },
            adjustments: { $sum: { $cond: [{ $eq: ['$type', 'ADJUST'] }, 1, 0] } }
          }
        }
      ])
    ]);
    const movements = rows.map((movement) => {
      const row = withNestedIds(movement, ['partId', 'userId']);
      if (row.sourceId) row.sourceId = String(row.sourceId);
      return row;
    });
    const summary = summaryRows[0] || { addedToday: 0, usedToday: 0, returnedToday: 0, adjustments: 0 };
    res.json(paginatedPayload('movements', movements, paginationMeta(page, limit, total), { summary }));
  } catch (error) {
    console.error('Stock movement list failed', error);
    res.status(500).json({ success: false, message: 'Unable to load stock movements right now' });
  }
}

export async function create(req, res) {
  required(req.body, ['partId', 'type', 'quantity']);
  const result = await applyStockMovement({
    partId: req.body.partId,
    type: req.body.type,
    quantity: req.body.quantity,
    source: req.body.source,
    sourceId: req.body.sourceId,
    sourceType: req.body.sourceType,
    note: req.body.note,
    userId: req.user._id
  });
  res.status(201).json({ movement: result.movement, part: result.part, message: 'Stock movement recorded' });
}
