import Notification from '../models/Notification.js';
import { notificationFilterFor } from '../services/notificationService.js';
import { appError } from '../utils/http.js';

export async function list(req, res) {
  const requestedPage = Number(req.query.page || 1);
  const requestedLimit = Number(req.query.limit || 30);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const limit = Number.isFinite(requestedLimit) ? Math.min(100, Math.max(1, requestedLimit)) : 30;
  const filter = notificationFilterFor(req.user);
  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Notification.countDocuments(filter),
    Notification.countDocuments({ ...filter, read: false })
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  res.json({
    notifications,
    unreadCount,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    }
  });
}

export async function markRead(req, res) {
  const notification = await Notification.findOne({ _id: req.params.id, ...notificationFilterFor(req.user) });
  if (!notification) throw appError('Notification not found', 404);
  notification.read = true;
  await notification.save();
  res.json({ notification, message: 'Notification marked read' });
}

export async function markAllRead(req, res) {
  const result = await Notification.updateMany(
    { ...notificationFilterFor(req.user), read: false },
    { $set: { read: true } }
  );
  res.json({ modifiedCount: result.modifiedCount || 0, message: 'Notifications marked read' });
}

export async function clearAll(req, res) {
  const result = await Notification.deleteMany(notificationFilterFor(req.user));
  res.json({ deletedCount: result.deletedCount || 0, message: 'Notifications cleared' });
}
