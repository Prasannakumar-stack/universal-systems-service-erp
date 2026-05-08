import Reminder from '../models/Reminder.js';
import { refreshSmartReminders } from '../services/reminderService.js';
import { appError } from '../utils/http.js';

export async function list(_req, res) {
  await refreshSmartReminders();
  const reminders = await Reminder.find().sort({ isRead: 1, priority: 1, createdAt: -1 }).limit(50);
  res.json({ reminders });
}

export async function markRead(req, res) {
  const reminder = await Reminder.findById(req.params.id);
  if (!reminder) throw appError('Reminder not found', 404);
  reminder.isRead = true;
  await reminder.save();
  res.json({ reminder, message: 'Reminder marked read' });
}
