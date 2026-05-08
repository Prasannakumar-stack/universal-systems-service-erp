import AuditLog from '../models/AuditLog.js';

export async function list(req, res) {
  const filter = {};
  if (req.query.module) filter.module = req.query.module;
  if (req.query.action) filter.action = req.query.action;
  const logs = await AuditLog.find(filter).populate('userId', 'name username role').sort({ createdAt: -1 }).limit(100);
  res.json({ logs });
}
