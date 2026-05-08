import Notification from '../models/Notification.js';

export async function createNotification({ title, message, type, role = 'admin', userId = null, sourceId = null }) {
  return Notification.create({ title, message, type, role, userId, sourceId });
}

export function notificationFilterFor(user) {
  const shared = [{ role: 'all' }];
  if (user.role === 'admin') shared.push({ role: 'admin' });
  if (user.role === 'technician') {
    shared.push({ role: 'technician', userId: user._id }, { role: 'technician', userId: null });
  }
  return { $or: shared };
}
