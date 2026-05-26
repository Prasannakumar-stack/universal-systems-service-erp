export const notificationCategories = [
  'All Categories',
  'Bookings',
  'Work Orders',
  'Invoices',
  'Payments',
  'AMC',
  'Inventory',
  'Quotations',
  'System'
];

const FALLBACK_READ_KEY = 'us_notification_center_fallback_read_ids';
const FALLBACK_CLEARED_KEY = 'us_notification_center_fallback_cleared';

const fallbackSeeds = [
  {
    id: 'demo-new-booking',
    title: 'New booking received',
    message: 'New booking #BK-2026-0054 has been created by Rahul Kumar.',
    category: 'Bookings',
    type: 'BOOKING',
    actionLabel: 'View Booking',
    target: '/admin/bookings',
    minutesAgo: 2
  },
  {
    id: 'demo-technician-assigned',
    title: 'Technician assigned',
    message: 'Technician Arjun has been assigned to Work Order #WO-2026-0123.',
    category: 'Work Orders',
    type: 'WORK_ORDER',
    actionLabel: 'View Work Order',
    target: '/admin/work-orders',
    minutesAgo: 15
  },
  {
    id: 'demo-work-order-status',
    title: 'Work order status updated',
    message: 'Work Order #WO-2026-0121 status changed to In Progress.',
    category: 'Work Orders',
    type: 'WORK_ORDER',
    actionLabel: 'View Work Order',
    target: '/admin/work-orders',
    minutesAgo: 32
  },
  {
    id: 'demo-invoice-generated',
    title: 'Invoice generated',
    message: 'Invoice #INV-2026-0089 has been generated for Rahul Kumar.',
    category: 'Invoices',
    type: 'INVOICE',
    actionLabel: 'View Invoice',
    target: '/admin/invoices',
    minutesAgo: 60
  },
  {
    id: 'demo-payment-received',
    title: 'Payment received',
    message: 'Payment of Rs.2,850.00 received for Invoice #INV-2026-0088.',
    category: 'Payments',
    type: 'PAYMENT',
    actionLabel: 'View Invoice',
    target: '/admin/invoices',
    minutesAgo: 120
  },
  {
    id: 'demo-amc-expiry',
    title: 'AMC expiry reminder',
    message: "AMC for Customer 'Suresh Electronics' will expire in 5 days.",
    category: 'AMC',
    type: 'AMC',
    actionLabel: 'View AMC',
    target: '/admin/amc-contracts',
    minutesAgo: 180
  },
  {
    id: 'demo-low-stock',
    title: 'Low stock alert',
    message: "Stock for 'Motor 1HP' is low. Only 2 left in inventory.",
    category: 'Inventory',
    type: 'LOW_STOCK',
    actionLabel: 'View Inventory',
    target: '/admin/parts',
    minutesAgo: 240
  },
  {
    id: 'demo-quotation-approved',
    title: 'Customer approved quotation',
    message: 'Customer has approved the quotation #QUO-2026-0066.',
    category: 'Quotations',
    type: 'QUOTATION',
    actionLabel: 'View Quotation',
    target: '/admin/documents?type=quotation',
    minutesAgo: 300
  },
  {
    id: 'demo-booking-followup',
    title: 'Booking follow-up due',
    message: 'Booking #BK-2026-0048 is waiting for technician confirmation.',
    category: 'Bookings',
    type: 'BOOKING',
    actionLabel: 'View Booking',
    target: '/admin/bookings',
    minutesAgo: 390
  },
  {
    id: 'demo-invoice-overdue',
    title: 'Invoice payment overdue',
    message: 'Invoice #INV-2026-0081 has crossed the follow-up window.',
    category: 'Invoices',
    type: 'PAYMENT',
    actionLabel: 'View Invoice',
    target: '/admin/invoices',
    minutesAgo: 520
  },
  {
    id: 'demo-system-backup',
    title: 'System backup completed',
    message: 'Daily workspace backup completed successfully.',
    category: 'System',
    type: 'SYSTEM',
    actionLabel: 'View Settings',
    target: '/admin/settings',
    minutesAgo: 720
  },
  {
    id: 'demo-amc-visit',
    title: 'AMC visit scheduled',
    message: 'Preventive maintenance visit is scheduled for tomorrow morning.',
    category: 'AMC',
    type: 'AMC',
    actionLabel: 'View AMC',
    target: '/admin/amc-schedule',
    minutesAgo: 900
  }
];

function storageAvailable() {
  return typeof window !== 'undefined' && window.localStorage;
}

function readStoredIds() {
  if (!storageAvailable()) return new Set();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FALLBACK_READ_KEY) || '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function writeStoredIds(ids) {
  if (!storageAvailable()) return;
  window.localStorage.setItem(FALLBACK_READ_KEY, JSON.stringify(Array.from(ids)));
}

export function fallbackNotificationsCleared() {
  return storageAvailable() && window.localStorage.getItem(FALLBACK_CLEARED_KEY) === 'true';
}

export function fallbackNotificationRows() {
  if (fallbackNotificationsCleared()) return [];
  const readIds = readStoredIds();
  const now = Date.now();
  return fallbackSeeds.map((item) => ({
    ...item,
    id: item.id,
    _id: item.id,
    read: readIds.has(item.id),
    isFallback: true,
    createdAt: new Date(now - item.minutesAgo * 60 * 1000).toISOString()
  }));
}

export function markFallbackNotificationRead(id) {
  const readIds = readStoredIds();
  readIds.add(id);
  writeStoredIds(readIds);
}

export function markAllFallbackNotificationsRead() {
  writeStoredIds(new Set(fallbackSeeds.map((item) => item.id)));
}

export function clearFallbackNotifications() {
  if (!storageAvailable()) return;
  window.localStorage.setItem(FALLBACK_CLEARED_KEY, 'true');
  window.localStorage.removeItem(FALLBACK_READ_KEY);
}

export function unreadNotificationCount(rows = []) {
  return rows.filter((item) => !item.read).length;
}

export function notificationCategory(item = {}) {
  if (item.category) return item.category;
  const text = `${item.type || ''} ${item.title || ''} ${item.message || ''}`.toLowerCase();
  if (text.includes('booking')) return 'Bookings';
  if (text.includes('work_order') || text.includes('work order') || text.includes('job')) return 'Work Orders';
  if (text.includes('invoice')) return 'Invoices';
  if (text.includes('payment')) return 'Payments';
  if (text.includes('amc') || text.includes('warranty') || text.includes('renewal')) return 'AMC';
  if (text.includes('low_stock') || text.includes('stock') || text.includes('inventory')) return 'Inventory';
  if (text.includes('quotation') || text.includes('quote')) return 'Quotations';
  return 'System';
}

export function notificationActionLabel(item = {}) {
  if (item.actionLabel) return item.actionLabel;
  const category = notificationCategory(item);
  const labels = {
    Bookings: 'View Booking',
    'Work Orders': 'View Work Order',
    Invoices: 'View Invoice',
    Payments: 'View Invoice',
    AMC: 'View AMC',
    Inventory: 'View Inventory',
    Quotations: 'View Quotation',
    System: 'View Settings'
  };
  return labels[category] || 'Open';
}

export function notificationTarget(item = {}, role = 'admin') {
  if (item.target) return item.target;
  const base = role === 'technician' ? '/tech' : '/admin';
  const id = item.sourceId || '';
  const category = notificationCategory(item);
  if (category === 'Bookings') return `${base}/bookings`;
  if (category === 'Work Orders') return id ? `${base}/work-orders/${id}` : `${base}/work-orders`;
  if (category === 'Invoices' || category === 'Payments') return `${base}/invoices`;
  if (category === 'AMC') return `${base}/amc-contracts`;
  if (category === 'Inventory') return `${base}/parts`;
  if (category === 'Quotations') return `${base}/documents?type=quotation`;
  return `${base}/settings`;
}

export function normalizeNotification(item = {}, role = 'admin') {
  const id = item.id || item._id || item.title || item.message;
  const category = notificationCategory(item);
  return {
    ...item,
    id,
    category,
    title: item.title || 'System notification',
    message: item.message || item.description || 'Important workspace update.',
    actionLabel: notificationActionLabel({ ...item, category }),
    target: notificationTarget({ ...item, category }, role),
    read: Boolean(item.read),
    createdAt: item.createdAt || new Date().toISOString()
  };
}

export function timeAgo(value) {
  const date = new Date(value);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) return 'Just now';
  const seconds = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
