import Notification from '../models/Notification.js';
import { notificationFilterFor } from '../services/notificationService.js';
import { appError } from '../utils/http.js';

export async function list(req, res) {
  const notifications = await Notification.find(notificationFilterFor(req.user)).sort({ createdAt: -1 }).limit(30);
  res.json({ notifications, unreadCount: notifications.filter((item) => !item.read).length });
}

export async function markRead(req, res) {
  const notification = await Notification.findOne({ _id: req.params.id, ...notificationFilterFor(req.user) });
  if (!notification) throw appError('Notification not found', 404);
  notification.read = true;
  await notification.save();
  res.json({ notification, message: 'Notification marked read' });
}
