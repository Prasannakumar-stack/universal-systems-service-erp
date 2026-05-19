import Booking from '../models/Booking.js';
import CallRequest from '../models/CallRequest.js';
import InventoryPart from '../models/InventoryPart.js';
import Invoice from '../models/Invoice.js';
import Notification from '../models/Notification.js';
import Payment from '../models/Payment.js';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import WorkOrder from '../models/WorkOrder.js';
import { getAmcSummary } from '../services/amcService.js';
import { getAdminDashboardMetrics } from '../services/dashboardService.js';
import { notificationFilterFor } from '../services/notificationService.js';
import { refreshSmartReminders } from '../services/reminderService.js';
import { technicianWorkOrderScope } from '../services/technicianScopeService.js';

export async function adminMetrics(req, res) {
  try {
    const dashboard = await getAdminDashboardMetrics(req.user);
    res.json(dashboard);
  } catch (error) {
    console.error('Dashboard metrics failed', error);
    res.status(500).json({ success: false, message: 'Unable to load dashboard metrics right now' });
  }
}

export async function adminStats(_req, res) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await refreshSmartReminders();

  const [todayBookings, createdToday, pendingJobs, unassignedJobs, awaitingPartsJobs, jobsOverdue, highPriorityCalls, inProgressJobs, completedJobs, pendingPayments, paymentsOverdue, payments, lowStockAlerts, lowStockCritical, recentBookings, notifications, reminders, technicians, amcSummary] = await Promise.all([
    Booking.countDocuments({ createdAt: { $gte: today } }),
    WorkOrder.countDocuments({ createdAt: { $gte: today } }),
    WorkOrder.countDocuments({ status: 'Pending' }),
    WorkOrder.countDocuments({ technicianId: null }),
    WorkOrder.countDocuments({ status: 'Awaiting Parts' }),
    WorkOrder.countDocuments({ status: { $ne: 'Completed' }, updatedAt: { $lt: dayAgo } }),
    CallRequest.countDocuments({ status: 'New', $or: [{ message: /urgent|high/i }, { serviceInterest: /urgent|high/i }] }),
    WorkOrder.countDocuments({ status: 'In Progress' }),
    WorkOrder.countDocuments({ status: 'Completed' }),
    Invoice.countDocuments({ status: { $in: ['Pending', 'Partial'] }, balance: { $gt: 0 } }),
    Invoice.countDocuments({ status: { $in: ['Pending', 'Partial'] }, balance: { $gt: 0 }, createdAt: { $lt: weekAgo } }),
    Payment.find({ createdAt: { $gte: today } }),
    InventoryPart.find({ $expr: { $lte: ['$available', '$lowStockLimit'] } }).sort({ available: 1 }).limit(8),
    InventoryPart.countDocuments({ available: { $lte: 0 } }),
    Booking.find().populate('customerId technicianId workOrderId').sort({ createdAt: -1 }).limit(8),
    Notification.find(notificationFilterFor(_req.user)).sort({ createdAt: -1 }).limit(8),
    Reminder.find({ isRead: false }).sort({ priority: 1, createdAt: -1 }).limit(8),
    User.find({ role: 'technician', active: true }).sort({ name: 1 }),
    getAmcSummary().catch(() => ({ activeContracts: 0, renewalDue: 0, visitsThisWeek: 0, expiredContracts: 0 }))
  ]);
  const technicianWorkload = await Promise.all(technicians.map(async (technician) => ({
    id: technician.id,
    name: technician.name,
    activeJobs: await WorkOrder.countDocuments({ technicianId: technician._id, status: { $in: ['Pending', 'In Progress', 'Awaiting Parts'] } })
  })));

  res.json({
    stats: {
      todayBookings,
      todayJobs: createdToday,
      revenue: payments.reduce((sum, payment) => sum + payment.paidAmount, 0),
      pendingJobs,
      unassignedJobs,
      awaitingPartsJobs,
      jobsOverdue,
      highPriorityCalls,
      inProgressJobs,
      completedJobs,
      pendingPayments,
      paymentsOverdue,
      lowStockCritical,
      activeAmcContracts: amcSummary.activeContracts,
      amcRenewalsDue: amcSummary.renewalDue,
      amcVisitsThisWeek: amcSummary.visitsThisWeek,
      expiredAmcContracts: amcSummary.expiredContracts
    },
    lowStockAlerts,
    recentBookings,
    notifications,
    reminders,
    technicianWorkload
  });
}

export async function technicianStats(req, res) {
  const workOrderScope = technicianWorkOrderScope(req.user) || { technicianId: req.user._id };
  const [jobs, notifications] = await Promise.all([
    WorkOrder.find(workOrderScope).populate('customerId invoiceId').sort({ createdAt: -1 }),
    Notification.find(notificationFilterFor(req.user)).sort({ createdAt: -1 }).limit(8)
  ]);
  res.json({
    jobs,
    notifications,
    stats: {
      assigned: jobs.length,
      active: jobs.filter((job) => ['Pending', 'In Progress', 'Awaiting Parts'].includes(job.status)).length,
      awaitingParts: jobs.filter((job) => job.status === 'Awaiting Parts').length,
      completed: jobs.filter((job) => job.status === 'Completed').length
    }
  });
}
