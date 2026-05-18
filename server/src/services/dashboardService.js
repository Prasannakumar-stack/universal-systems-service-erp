import Booking from '../models/Booking.js';
import InventoryPart from '../models/InventoryPart.js';
import Invoice from '../models/Invoice.js';
import Notification from '../models/Notification.js';
import Payment from '../models/Payment.js';
import Reminder from '../models/Reminder.js';
import User from '../models/User.js';
import WorkOrder from '../models/WorkOrder.js';
import AMCContract from '../models/AMCContract.js';
import { notificationFilterFor } from './notificationService.js';
import { refreshSmartReminders } from './reminderService.js';

const activeWorkStatuses = ['Pending', 'In Progress', 'Awaiting Parts'];

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfTomorrow(today) {
  const date = new Date(today);
  date.setDate(date.getDate() + 1);
  return date;
}

function startOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfNextMonth(monthStart) {
  const date = new Date(monthStart);
  date.setMonth(date.getMonth() + 1);
  return date;
}

function startOfSevenDayWindow() {
  const date = startOfToday();
  date.setDate(date.getDate() - 6);
  return date;
}

function objectIdString(value) {
  return value ? String(value) : '';
}

function serializeBooking(booking) {
  return {
    id: objectIdString(booking._id),
    _id: objectIdString(booking._id),
    bookingCode: booking.bookingCode,
    customerId: booking.customerId
      ? {
        id: objectIdString(booking.customerId._id || booking.customerId),
        _id: objectIdString(booking.customerId._id || booking.customerId),
        name: booking.customerId.name || ''
      }
      : null,
    customerName: booking.customerName,
    serviceType: booking.serviceType,
    device: booking.device,
    status: booking.status,
    source: booking.source || booking.bookingSource || booking.channel || '',
    bookingSource: booking.bookingSource || booking.source || '',
    channel: booking.channel || '',
    createdAt: booking.createdAt,
    updatedAt: booking.updatedAt
  };
}

function serializeWorkOrder(order) {
  return {
    id: objectIdString(order._id),
    _id: objectIdString(order._id),
    customerId: order.customerId
      ? {
        id: objectIdString(order.customerId._id || order.customerId),
        _id: objectIdString(order.customerId._id || order.customerId),
        name: order.customerId.name || '',
        phone: order.customerId.phone || ''
      }
      : null,
    customerName: order.customerId?.name || order.customerName || '',
    serviceType: order.serviceType,
    device: order.device,
    issue: order.issue,
    technicianId: order.technicianId
      ? {
        id: objectIdString(order.technicianId._id || order.technicianId),
        _id: objectIdString(order.technicianId._id || order.technicianId),
        name: order.technicianId.name || ''
      }
      : null,
    status: order.status,
    priority: order.priority || 'Normal',
    createdAt: order.createdAt,
    updatedAt: order.updatedAt
  };
}

function serializeInvoice(invoice) {
  return {
    id: objectIdString(invoice._id),
    _id: objectIdString(invoice._id),
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId
      ? {
        id: objectIdString(invoice.customerId._id || invoice.customerId),
        _id: objectIdString(invoice.customerId._id || invoice.customerId),
        name: invoice.customerId.name || '',
        phone: invoice.customerId.phone || ''
      }
      : null,
    customerName: invoice.customerId?.name || invoice.customerName || '',
    total: Number(invoice.total || invoice.totalAmount || 0),
    paidAmount: Number(invoice.paidAmount || invoice.paid || 0),
    balance: Number(invoice.balance || invoice.balanceAmount || 0),
    status: invoice.status,
    createdAt: invoice.createdAt,
    updatedAt: invoice.updatedAt
  };
}

function serializeActivity(item, feedType) {
  return {
    id: objectIdString(item._id),
    _id: objectIdString(item._id),
    title: item.title,
    message: item.message,
    type: item.type,
    priority: item.priority || '',
    feedType,
    feedDate: item.createdAt,
    createdAt: item.createdAt
  };
}

function sevenDayRevenueRows(aggregates, windowStart) {
  const byKey = new Map(aggregates.map((item) => [item._id, Number(item.revenue || 0)]));
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(windowStart);
    date.setDate(date.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      revenue: byKey.get(key) || 0,
      bookings: 0
    };
  });
}

export async function getAdminDashboardMetrics(user) {
  const today = startOfToday();
  const tomorrow = startOfTomorrow(today);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const monthStart = startOfMonth();
  const nextMonth = startOfNextMonth(monthStart);
  const sevenDayStart = startOfSevenDayWindow();

  await refreshSmartReminders();

  const [
    todaysBookings,
    pendingServiceJobs,
    unassignedJobs,
    awaitingPartsJobs,
    jobsInProgress,
    completedToday,
    completedJobs,
    overdueJobs,
    urgentActiveJobs,
    pendingPayments,
    paymentsOverdue,
    lowStockItems,
    outOfStockItems,
    activeAmcContracts,
    amcRenewalsDue,
    amcVisitsThisWeek,
    expiredAmcContracts,
    monthlyRevenueRows,
    revenueRows,
    recentBookings,
    repairQueue,
    pendingPaymentsList,
    technicians,
    workloadRows,
    notifications,
    reminders
  ] = await Promise.all([
    Booking.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
    WorkOrder.countDocuments({ status: 'Pending' }),
    WorkOrder.countDocuments({ technicianId: null }),
    WorkOrder.countDocuments({ status: 'Awaiting Parts' }),
    WorkOrder.countDocuments({ status: 'In Progress' }),
    WorkOrder.countDocuments({ status: 'Completed', updatedAt: { $gte: today, $lt: tomorrow } }),
    WorkOrder.countDocuments({ status: 'Completed' }),
    WorkOrder.countDocuments({ status: { $in: activeWorkStatuses }, updatedAt: { $lt: dayAgo } }),
    WorkOrder.countDocuments({ priority: 'Urgent', status: { $in: activeWorkStatuses } }),
    Invoice.countDocuments({ status: { $in: ['Pending', 'Partial'] }, balance: { $gt: 0 } }),
    Invoice.countDocuments({ status: { $in: ['Pending', 'Partial'] }, balance: { $gt: 0 }, createdAt: { $lt: sevenDayStart } }),
    InventoryPart.countDocuments({ $expr: { $and: [{ $gt: ['$available', 0] }, { $lte: ['$available', '$lowStockLimit'] }] } }),
    InventoryPart.countDocuments({ available: { $lte: 0 } }),
    AMCContract.countDocuments({ status: 'Active' }),
    AMCContract.countDocuments({ status: 'Active', endDate: { $gte: today, $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) } }),
    AMCContract.countDocuments({ 'visits.scheduledDate': { $gte: today, $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }, 'visits.status': 'Upcoming' }),
    AMCContract.countDocuments({ status: 'Active', endDate: { $lt: today } }),
    Payment.aggregate([
      { $match: { createdAt: { $gte: monthStart, $lt: nextMonth } } },
      { $group: { _id: null, revenue: { $sum: { $ifNull: ['$paidAmount', '$amount'] } } } }
    ]),
    Payment.aggregate([
      { $match: { createdAt: { $gte: sevenDayStart, $lt: tomorrow } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, revenue: { $sum: { $ifNull: ['$paidAmount', '$amount'] } } } },
      { $sort: { _id: 1 } }
    ]),
    Booking.find()
      .select('bookingCode customerId customerName serviceType device status bookingSource source channel createdAt updatedAt')
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    WorkOrder.find({ status: { $in: activeWorkStatuses } })
      .select('customerId customerName serviceType device issue technicianId status priority createdAt updatedAt')
      .populate('customerId', 'name phone')
      .populate('technicianId', 'name')
      .sort({ updatedAt: 1, createdAt: -1 })
      .limit(6)
      .lean(),
    Invoice.find({ status: { $in: ['Pending', 'Partial'] }, balance: { $gt: 0 } })
      .select('invoiceNumber customerId customerName total paidAmount balance status createdAt updatedAt')
      .populate('customerId', 'name phone')
      .sort({ createdAt: 1 })
      .limit(6)
      .lean(),
    User.find({ role: 'technician', active: true }).select('name username').sort({ name: 1 }).limit(20).lean(),
    WorkOrder.aggregate([
      { $match: { status: { $in: activeWorkStatuses }, technicianId: { $ne: null } } },
      { $group: { _id: '$technicianId', activeJobs: { $sum: 1 } } }
    ]),
    Notification.find(notificationFilterFor(user)).select('title message type priority createdAt').sort({ createdAt: -1 }).limit(6).lean(),
    Reminder.find({ isRead: false }).select('title message type priority createdAt').sort({ priority: 1, createdAt: -1 }).limit(6).lean()
  ]);

  const workloadByTechnician = new Map(workloadRows.map((row) => [objectIdString(row._id), Number(row.activeJobs || 0)]));
  const technicianWorkload = technicians.map((technician) => ({
    id: objectIdString(technician._id),
    _id: objectIdString(technician._id),
    name: technician.name,
    activeJobs: workloadByTechnician.get(objectIdString(technician._id)) || 0
  }));

  const activityFeed = [
    ...notifications.map((item) => serializeActivity(item, 'Notification')),
    ...reminders.map((item) => serializeActivity(item, 'Reminder'))
  ]
    .sort((a, b) => new Date(b.feedDate || 0) - new Date(a.feedDate || 0))
    .slice(0, 6);

  return {
    success: true,
    metrics: {
      todaysBookings,
      pendingServiceJobs,
      jobsInProgress,
      completedToday,
      pendingPayments,
      lowStockItems: lowStockItems + outOfStockItems,
      activeAmcContracts,
      monthlyRevenue: Number(monthlyRevenueRows[0]?.revenue || 0)
    },
    alerts: {
      outOfStockItems,
      overdueJobs,
      urgentActiveJobs,
      lowStockItems,
      pendingPayments
    },
    stats: {
      todayBookings: todaysBookings,
      pendingJobs: pendingServiceJobs,
      unassignedJobs,
      awaitingPartsJobs,
      inProgressJobs: jobsInProgress,
      completedJobs,
      paymentsOverdue,
      lowStockCritical: outOfStockItems,
      activeAmcContracts,
      amcRenewalsDue,
      amcVisitsThisWeek,
      expiredAmcContracts,
      pendingPayments,
      urgentActiveJobs
    },
    recentBookings: recentBookings.map(serializeBooking),
    repairQueue: repairQueue.map(serializeWorkOrder),
    pendingPaymentsList: pendingPaymentsList.map(serializeInvoice),
    technicianWorkload,
    activityFeed,
    revenueOverview: sevenDayRevenueRows(revenueRows, sevenDayStart)
  };
}
