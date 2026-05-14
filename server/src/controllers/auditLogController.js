import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';
import { clean } from '../utils/http.js';
import { addDateRange, paginatedPayload, paginationMeta, parsePagination, searchRegex, withNestedIds } from '../utils/pagination.js';

export async function list(req, res) {
  try {
    const filter = {};
    const clauses = [];
    const { page, limit, skip } = parsePagination(req.query);
    if (clean(req.query.module)) filter.module = clean(req.query.module);
    if (clean(req.query.action)) filter.action = clean(req.query.action);
    addDateRange(filter, req.query);

    const regex = searchRegex(req.query.search);
    if (regex) {
      const users = await User.find({ $or: [{ name: regex }, { username: regex }] }).select('_id').limit(1000).lean();
      clauses.push({
        $or: [
          { action: regex },
          { module: regex },
          { userId: { $in: users.map((item) => item._id) } }
        ]
      });
    }
    if (clauses.length) filter.$and = clauses;

    const [total, rows] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter).populate('userId', 'name username role').sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
    ]);
    const logs = rows.map((log) => withNestedIds(log, ['userId']));
    res.json(paginatedPayload('logs', logs, paginationMeta(page, limit, total)));
  } catch (error) {
    console.error('Audit log list failed', error);
    res.status(500).json({ success: false, message: 'Unable to load audit logs right now' });
  }
}
