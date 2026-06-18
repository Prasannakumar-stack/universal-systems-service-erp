import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  BookOpenCheck,
  Boxes,
  CreditCard,
  FileCheck2,
  Activity,
  ChevronsLeft,
  ChevronsRight,
  Globe2,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  ReceiptText,
  Search,
  Settings,
  UserRound,
  Users,
  Wrench,
  X
} from 'lucide-react';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { resolveUserAvatarUrl, userInitials } from '../utils/avatar.js';
import { currency } from '../utils/format.js';
import { getCustomerDisplayId, getInvoiceDisplayId, getPaymentDisplayId, getWorkOrderDisplayId } from '../shared/idHelpers.js';
import { adminWorkspaceRoles, can, canAny, canAccessRoles, normalizeRole, roleLabel } from '../utils/roles.js';
import { useThemePreference } from '../utils/theme.js';
import {
  fallbackNotificationRows,
  filterClearedNotifications,
  markAllFallbackNotificationsRead,
  markFallbackNotificationRead,
  normalizeNotification,
  timeAgo,
  unreadNotificationCount
} from '../features/notifications/notificationCenterData.js';
import { SIDEBAR_BADGES_UPDATED_EVENT } from '../utils/sidebarBadges.js';

const TopbarBookingModal = lazy(() => import('../features/bookings/BookingsPage.jsx').then((module) => ({ default: module.BookingModal })));

const fullAccessRoles = ['admin', 'super_admin'];
const adminGroups = [
  {
    title: '',
    links: [{ to: '/app/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'view_business_dashboard' }]
  },
  {
    title: 'Operations',
    links: [
      { to: '/app/admin/bookings', label: 'Bookings', icon: BookOpenCheck, permission: 'view_bookings', badgeKey: 'bookings' },
      { to: '/app/admin/work-orders', label: 'Work Orders', icon: Wrench, permission: 'view_work_orders', badgeKey: 'workOrders' }
    ]
  },
  {
    title: 'Customers',
    links: [
      { to: '/app/admin/customers', label: 'Customers', icon: Users, permission: 'view_customers' }
    ]
  },
  {
    title: 'Inventory',
    links: [
      { to: '/app/admin/parts', label: 'Products / Parts', icon: Boxes, permission: 'view_inventory', badgeKey: 'lowStock' }
    ]
  },
  {
    title: 'Sales & Billing',
    links: [
      { to: '/app/admin/invoices', label: 'Invoices', icon: ReceiptText, permission: 'view_invoices' },
      { to: '/app/admin/payments', label: 'Payments', icon: CreditCard, permission: 'view_payments', badgeKey: 'pendingPayments' }
    ]
  },
  {
    title: 'AMC & Warranty',
    links: [
      { to: '/app/admin/amc-contracts', label: 'AMC Contracts', icon: FileCheck2, permission: 'view_amc', badgeKey: 'amcRenewals' }
    ]
  },
  {
    title: 'Reports',
    links: [
      { to: '/app/admin/reports', label: 'Reports', icon: Activity, permission: 'view_reports' }
    ]
  },
  {
    title: 'System',
    links: [
      { to: '/app/admin/notifications', label: 'Notifications', icon: Bell, badgeKey: 'notifications' },
      { to: '/app/admin/technician-panel', label: 'Staff / Technicians', icon: UserRound, permission: 'manage_users' },
      { to: '/app/admin/audit-logs', label: 'Audit Logs', icon: Activity, permission: 'view_audit_logs' },
      { to: '/app/admin/settings', label: 'Settings', icon: Settings, permission: 'view_settings' }
    ]
  }
];

const technicianGroups = [
  {
    title: '',
    links: [{ to: '/app/tech/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'view_dashboard' }]
  },
  {
    title: 'Operations',
    links: [
      { to: '/app/tech/bookings', label: 'Bookings', icon: BookOpenCheck, permission: 'view_bookings', badgeKey: 'bookings' },
      { to: '/app/tech/work-orders', label: 'Work Orders', icon: Wrench, permission: 'view_work_orders', badgeKey: 'workOrders' }
    ]
  },
  {
    title: 'Customers',
    links: [{ to: '/app/tech/customers', label: 'Customers', icon: Users, permission: 'view_customers', badgeKey: 'customers' }]
  },
  {
    title: 'Sales & Billing',
    links: [
      { to: '/app/tech/invoices', label: 'Invoices', icon: ReceiptText, permission: 'view_invoices', badgeKey: 'pendingInvoices' },
      { to: '/app/tech/payments', label: 'Payments', icon: CreditCard, permission: 'view_payments', badgeKey: 'pendingPayments' }
    ]
  },
  {
    title: 'Inventory',
    links: [{ to: '/app/tech/parts', label: 'Products / Parts', icon: Boxes, permission: 'view_inventory', badgeKey: 'lowStock' }]
  },
  {
    title: 'AMC & Warranty',
    links: [{ to: '/app/tech/amc-contracts', label: 'AMC Contracts', icon: FileCheck2, permission: 'view_amc', badgeKey: 'amcContracts' }]
  },
  {
    title: 'System',
    links: [{ to: '/app/tech/settings', label: 'Settings', icon: Settings }]
  }
];

const adminRouteAccess = [
  { prefix: '/app/admin/dashboard', permission: 'view_business_dashboard' },
  { prefix: '/app/admin/technician-panel', permission: 'manage_users' },
  { prefix: '/app/admin/technician-tasks', permission: 'assign_technician' },
  { prefix: '/app/admin/bookings', permission: 'view_bookings' },
  { prefix: '/app/admin/work-orders', permission: 'view_work_orders' },
  { prefix: '/app/admin/customers', permission: 'view_customers' },
  { prefix: '/app/admin/amc', permission: 'view_amc' },
  { prefix: '/app/admin/warranties', permission: 'view_amc' },
  { prefix: '/app/admin/parts', permission: 'view_inventory' },
  { prefix: '/app/admin/stock', permission: 'view_stock_movements' },
  { prefix: '/app/admin/documents', permission: 'view_documents' },
  { prefix: '/app/admin/quotations', permission: 'view_documents' },
  { prefix: '/app/admin/invoices', permission: 'view_invoices' },
  { prefix: '/app/admin/payments', permission: 'view_payments' },
  { prefix: '/app/admin/reports/finance', permission: 'view_reports' },
  { prefix: '/app/admin/reports/inventory', permission: 'view_reports' },
  { prefix: '/app/admin/reports/technicians', permission: 'view_reports' },
  { prefix: '/app/admin/reports', permission: 'view_reports' },
  { prefix: '/app/admin/notifications', roles: adminWorkspaceRoles },
  { prefix: '/app/admin/audit-logs', permission: 'view_audit_logs' },
  { prefix: '/app/admin/settings', permission: 'view_settings' }
];

const technicianRouteAccess = [
  { prefix: '/app/tech/dashboard', permission: 'view_dashboard' },
  { prefix: '/app/tech/dashboard', permission: 'view_dashboard' },
  { prefix: '/app/tech/bookings', permission: 'view_bookings' },
  { prefix: '/app/tech/bookings', permission: 'view_bookings' },
  { prefix: '/app/tech/work-orders', permission: 'view_work_orders' },
  { prefix: '/app/tech/work-orders', permission: 'view_work_orders' },
  { prefix: '/app/tech/customers', permission: 'view_customers' },
  { prefix: '/app/tech/customers', permission: 'view_customers' },
  { prefix: '/app/tech/invoices', permission: 'view_invoices' },
  { prefix: '/app/tech/invoices', permission: 'view_invoices' },
  { prefix: '/app/tech/payments', permission: 'view_payments' },
  { prefix: '/app/tech/payments', permission: 'view_payments' },
  { prefix: '/app/tech/parts', permission: 'view_inventory' },
  { prefix: '/app/tech/parts', permission: 'view_inventory' },
  { prefix: '/app/tech/amc', permission: 'view_amc' },
  { prefix: '/app/tech/amc', permission: 'view_amc' },
  { prefix: '/app/tech/warranties', permission: 'view_amc' },
  { prefix: '/app/tech/warranties', permission: 'view_amc' },
  { prefix: '/app/tech/settings' },
  { prefix: '/app/tech/settings' },
  { prefix: '/app/tech/profile' }
];

function canSeeLink(link, subject) {
  if (link.permission) return can(subject, link.permission);
  return !link.roles || canAccessRoles(roleFromSubject(subject), link.roles);
}

function roleFromSubject(subject) {
  return typeof subject === 'string' ? subject : subject?.role;
}

const sidebarCollapsedStoragePrefix = 'us:dashboard-sidebar-collapsed:';
const sidebarCollapsedCompactWidth = '88px';
const sidebarExpandedWidth = '292px';

function sidebarCollapsedStorageKey(role) {
  return `${sidebarCollapsedStoragePrefix}${normalizeRole(role)}`;
}

function readSidebarCollapsedState(role) {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(sidebarCollapsedStorageKey(role)) === '1';
  } catch {
    return false;
  }
}

function persistSidebarCollapsedState(role, collapsed) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(sidebarCollapsedStorageKey(role), collapsed ? '1' : '0');
  } catch {
    // Ignore storage failures and fall back to the current session state.
  }
}

function CurrentUserAvatar({ user, fallback = 'A', className = '' }) {
  const avatarUrl = resolveUserAvatarUrl(user);
  const initial = userInitials(user, fallback);
  const [imageState, setImageState] = useState(avatarUrl ? 'loading' : 'idle');

  useEffect(() => {
    setImageState(avatarUrl ? 'loading' : 'idle');
  }, [avatarUrl]);

  const hasLoadedImage = Boolean(avatarUrl) && imageState === 'loaded';
  const shouldRenderImage = Boolean(avatarUrl) && imageState !== 'error';
  const avatarLabel = `${user?.name || user?.username || 'User'} avatar`;

  return (
    <div
      className={`current-user-avatar ${hasLoadedImage ? 'current-user-avatar-has-image' : 'current-user-avatar-fallback'} ${className}`}
      aria-label={avatarLabel}
    >
      <span className="current-user-avatar-fallback-text" aria-hidden={hasLoadedImage}>{initial}</span>
      {shouldRenderImage ? (
        <img
          src={avatarUrl}
          alt=""
          className={hasLoadedImage ? 'is-loaded' : 'is-loading'}
          onLoad={() => setImageState('loaded')}
          onError={() => setImageState('error')}
        />
      ) : null}
    </div>
  );
}

function SidebarBrandMark({ collapsed = false }) {
  if (collapsed) {
    return null;
  }

  return (
    <div className="flex min-w-0 items-center">
      <img
        src="/logo-full.png"
        alt=""
        className="h-auto max-h-[72px] w-[190px] max-w-full shrink object-contain object-left"
        draggable="false"
      />
    </div>
  );
}

function visibleAdminGroups(subject) {
  return adminGroups
    .map((group) => ({ ...group, links: group.links.filter((link) => canSeeLink(link, subject)) }))
    .filter((group) => group.links.length);
}

function visibleTechnicianGroups(subject) {
  return technicianGroups
    .map((group) => ({ ...group, links: group.links.filter((link) => canSeeLink(link, subject)) }))
    .filter((group) => group.links.length);
}

function canOpenAdminPath(pathname, subject) {
  const match = adminRouteAccess.find((item) => pathname.startsWith(item.prefix));
  if (match?.permission) return can(subject, match.permission);
  return match ? canAccessRoles(roleFromSubject(subject), match.roles) : canAccessRoles(roleFromSubject(subject), fullAccessRoles);
}

function canOpenTechnicianPath(pathname, subject) {
  const match = technicianRouteAccess.find((item) => pathname.startsWith(item.prefix));
  if (match?.permission) return can(subject, match.permission);
  return Boolean(match);
}

function canUseGlobalSearch(subject) {
  return canAny(subject, ['view_customers', 'view_bookings', 'view_work_orders', 'view_invoices', 'view_payments', 'view_inventory']);
}

function sidebarBadgeClass(tone) {
  const classes = {
    blue: 'enterprise-sidebar-badge-blue',
    orange: 'enterprise-sidebar-badge-orange',
    red: 'enterprise-sidebar-badge-red',
    green: 'enterprise-sidebar-badge-green',
    notification: 'enterprise-sidebar-badge-notification'
  };
  return classes[tone] || classes.blue;
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function hasFiniteNumber(source, key) {
  return source && Object.prototype.hasOwnProperty.call(source, key) && Number.isFinite(Number(source[key]));
}

function normalizedStatus(value) {
  return String(value || '').trim().toLowerCase();
}

function sumExistingNumbers(source, keys) {
  return keys.reduce((sum, key) => (hasFiniteNumber(source, key) ? sum + finiteNumber(source[key]) : sum), 0);
}

function isActionNeededBooking(record) {
  const status = normalizedStatus(record?.status || record?.bookingStatus);
  if (['completed', 'cancelled', 'canceled', 'converted', 'closed'].includes(status)) return false;
  if (['pending', 'new', 'unassigned'].includes(status)) return true;
  return !record?.technicianId && !record?.workOrderId && status !== '';
}

function bookingBadgeCountFromDashboard(dashboardData) {
  const stats = dashboardData?.stats || {};
  const explicitCount = sumExistingNumbers(stats, ['pendingBookings', 'newBookings', 'unassignedBookings']);
  if (explicitCount > 0) return explicitCount;
  return (dashboardData?.recentBookings || []).filter(isActionNeededBooking).length;
}

function workOrderBadgeCountFromDashboard(dashboardData) {
  const stats = dashboardData?.stats || {};
  const explicitCount = sumExistingNumbers(stats, ['pendingJobs', 'inProgressJobs', 'awaitingPartsJobs']);
  if (explicitCount > 0) return explicitCount;
  return (dashboardData?.repairQueue || []).filter((record) => (
    ['pending', 'in progress', 'awaiting parts'].includes(normalizedStatus(record?.status))
  )).length;
}

function lowStockBadgeCountFromDashboard(dashboardData) {
  const metrics = dashboardData?.metrics || {};
  const alerts = dashboardData?.alerts || {};
  if (hasFiniteNumber(metrics, 'lowStockItems')) return finiteNumber(metrics.lowStockItems);
  if (hasFiniteNumber(alerts, 'lowStockItems') || hasFiniteNumber(alerts, 'outOfStockItems')) {
    return finiteNumber(alerts.lowStockItems) + finiteNumber(alerts.outOfStockItems);
  }
  return Array.isArray(dashboardData?.lowStockAlerts) ? dashboardData.lowStockAlerts.length : 0;
}

function normalizePaymentStatus(invoice) {
  return String(
    invoice?.paymentStatus
    || invoice?.invoiceStatus
    || invoice?.status
    || ''
  ).trim().toLowerCase();
}

function isPendingInvoice(invoice) {
  return normalizePaymentStatus(invoice) === 'pending';
}

function isPartialInvoice(invoice) {
  const status = normalizePaymentStatus(invoice);
  return status === 'partial' || status === 'partially paid';
}

function paymentRowsFromPayload(payload) {
  return payload?.payments || payload?.data || [];
}

function paymentsBadgeCountFromRows(paymentRows) {
  if (!Array.isArray(paymentRows)) return null;
  const pendingInvoiceCount = paymentRows.filter(isPendingInvoice).length;
  const partialInvoiceCount = paymentRows.filter(isPartialInvoice).length;
  const paymentsBadgeCount = pendingInvoiceCount + partialInvoiceCount;
  return paymentsBadgeCount > 0 ? paymentsBadgeCount : null;
}

async function loadPaymentRowsForPaymentsBadge(request) {
  const paymentRows = [];
  const limit = 50;

  for (let page = 1; page <= 100; page += 1) {
    const payload = await request(`/payments?limit=${limit}&page=${page}`);
    const rows = paymentRowsFromPayload(payload);
    paymentRows.push(...rows);
    if (rows.length < limit) break;
  }

  return paymentRows;
}

function amcRenewalBadgeCountFromDashboard(dashboardData) {
  const stats = dashboardData?.stats || {};
  return sumExistingNumbers(stats, ['amcRenewalsDue', 'expiredAmcContracts']);
}

function buildSidebarBadges(dashboardData) {
  const stats = dashboardData?.stats || {};
  const alerts = dashboardData?.alerts || {};
  const lowStockCount = lowStockBadgeCountFromDashboard(dashboardData);
  const paymentsBadgeCount = dashboardData?.paymentsBadgeCount ?? null;
  return {
    bookings: { value: bookingBadgeCountFromDashboard(dashboardData), tone: 'blue' },
    workOrders: { value: workOrderBadgeCountFromDashboard(dashboardData), tone: 'blue' },
    lowStock: { value: lowStockCount, tone: Number(alerts.outOfStockItems || stats.lowStockCritical || 0) > 0 ? 'red' : 'orange' },
    pendingPayments: { value: paymentsBadgeCount > 0 ? paymentsBadgeCount : null, tone: 'red' },
    amcRenewals: { value: amcRenewalBadgeCountFromDashboard(dashboardData), tone: stats.expiredAmcContracts > 0 ? 'red' : 'orange' },
    notifications: { value: dashboardData?.notificationsUnreadCount || 0, tone: 'notification' }
  };
}

const technicianActiveStatuses = ['pending', 'in progress', 'awaiting parts'];

function technicianJobsFromDashboard(dashboardData) {
  if (Array.isArray(dashboardData?.jobs)) return dashboardData.jobs;
  if (Array.isArray(dashboardData?.workOrders)) return dashboardData.workOrders;
  if (Array.isArray(dashboardData?.data)) return dashboardData.data;
  return [];
}

function recordKey(value) {
  if (!value) return '';
  if (typeof value === 'object') return String(value.id || value._id || '');
  return String(value);
}

function uniqueCount(values) {
  return new Set(values.map(recordKey).filter(Boolean)).size;
}

function isTechnicianActiveJob(job) {
  return technicianActiveStatuses.includes(normalizedStatus(job?.status));
}

function technicianBookingBadgeCount(dashboardData) {
  const stats = dashboardData?.stats || {};
  const explicitCount = sumExistingNumbers(stats, ['pendingBookings', 'newBookings', 'assignedBookings']);
  if (explicitCount > 0) return explicitCount;
  return uniqueCount(
    technicianJobsFromDashboard(dashboardData)
      .filter((job) => isTechnicianActiveJob(job) && recordKey(job?.bookingId))
      .map((job) => job.bookingId)
  );
}

function technicianWorkOrderBadgeCount(dashboardData) {
  const stats = dashboardData?.stats || {};
  if (hasFiniteNumber(stats, 'active')) return finiteNumber(stats.active);
  return technicianJobsFromDashboard(dashboardData).filter(isTechnicianActiveJob).length;
}

function technicianCustomerBadgeCount(dashboardData) {
  return uniqueCount(technicianJobsFromDashboard(dashboardData).map((job) => job?.customerId));
}

function technicianInvoiceRows(dashboardData) {
  const invoices = new Map();
  technicianJobsFromDashboard(dashboardData).forEach((job) => {
    [job?.invoiceId, job?.amcContractId?.invoiceId].forEach((invoice) => {
      const id = recordKey(invoice);
      if (!id || invoices.has(id) || typeof invoice !== 'object') return;
      invoices.set(id, invoice);
    });
  });
  return Array.from(invoices.values());
}

function invoiceBalance(invoice) {
  if (hasFiniteNumber(invoice, 'balance')) return finiteNumber(invoice.balance);
  if (hasFiniteNumber(invoice, 'balanceAmount')) return finiteNumber(invoice.balanceAmount);
  const total = finiteNumber(invoice?.total ?? invoice?.totalAmount ?? invoice?.amount);
  const paid = finiteNumber(invoice?.paidAmount ?? invoice?.amountPaid ?? invoice?.paid);
  return Math.max(0, total - paid);
}

function technicianPendingInvoiceCount(dashboardData) {
  return technicianInvoiceRows(dashboardData).filter((invoice) => normalizedStatus(invoice?.status) === 'pending').length;
}

function technicianPendingPaymentCount(dashboardData) {
  return technicianInvoiceRows(dashboardData).filter((invoice) => {
    const status = normalizedStatus(invoice?.status);
    return invoiceBalance(invoice) > 0 || ['pending', 'partial', 'partially paid', 'unpaid', 'overdue'].includes(status);
  }).length;
}

function technicianInventoryBadge(dashboardData) {
  const summary = dashboardData?.inventorySummary || {};
  const lowStock = finiteNumber(summary.lowStock ?? summary.lowStockItems);
  const outOfStock = finiteNumber(summary.outOfStock ?? summary.outOfStockItems);
  return {
    value: lowStock + outOfStock,
    tone: outOfStock > 0 ? 'red' : 'orange'
  };
}

function technicianAmcBadge(dashboardData) {
  const summary = dashboardData?.amcSummary || {};
  const renewals = finiteNumber(summary.renewalDue ?? summary.amcRenewalsDue);
  const expired = finiteNumber(summary.expiredContracts ?? summary.expiredAmcContracts);
  const active = finiteNumber(summary.activeContracts ?? summary.activeAmcContracts);
  const total = hasFiniteNumber(summary, 'totalContracts')
    ? finiteNumber(summary.totalContracts)
    : Array.isArray(dashboardData?.amcContracts) ? dashboardData.amcContracts.length : 0;
  const attentionCount = renewals + expired;
  if (attentionCount > 0) return { value: attentionCount, tone: expired > 0 ? 'red' : 'orange' };
  return { value: active || total, tone: 'green' };
}

function buildTechnicianSidebarBadges(dashboardData) {
  return {
    bookings: { value: technicianBookingBadgeCount(dashboardData), tone: 'blue' },
    workOrders: { value: technicianWorkOrderBadgeCount(dashboardData), tone: 'blue' },
    customers: { value: technicianCustomerBadgeCount(dashboardData), tone: 'green' },
    pendingInvoices: { value: technicianPendingInvoiceCount(dashboardData), tone: 'orange' },
    pendingPayments: { value: technicianPendingPaymentCount(dashboardData), tone: 'red' },
    lowStock: technicianInventoryBadge(dashboardData),
    amcContracts: technicianAmcBadge(dashboardData)
  };
}

function sidebarBadgeKeys(groups) {
  return groups.flatMap((group) => group.links.map((link) => link.badgeKey).filter(Boolean));
}

function notificationTarget(item, role) {
  if (item?.target) return item.target;
  const normalizedRole = normalizeRole(role);
  const base = normalizedRole === 'technician' ? '/app/tech' : '/app/admin';
  const id = item?.sourceId || '';
  const text = `${item?.type || ''} ${item?.title || ''} ${item?.message || ''}`.toLowerCase();
  if (text.includes('quotation') || text.includes('quote')) return `${base}/documents?type=quotation`;
  if (text.includes('low stock') || text.includes('stock')) return '/app/admin/parts';
  if (text.includes('payment')) return `${base}/invoices`;
  if (text.includes('invoice')) return `${base}/invoices`;
  if (text.includes('amc') || text.includes('renewal')) return normalizedRole === 'technician' ? '/app/tech/amc-contracts' : '/app/admin/amc-renewals';
  if (text.includes('booking')) return `${base}/bookings`;
  if (text.includes('work order') || text.includes('job') || item?.type === 'WORK_ORDER') {
    if (id) return `${base}/work-orders/${id}`;
    return `${base}/work-orders`;
  }
  return `${base}/dashboard`;
}

function SidebarBadge({ badge }) {
  const value = Number(badge?.value || 0);
  if (!value) return null;
  return (
    <span className={`enterprise-sidebar-badge ${sidebarBadgeClass(badge.tone)}`} aria-label={`${value > 99 ? '99+' : value} items`}>
      {value > 99 ? '99+' : value}
    </span>
  );
}

const technicianHiddenBadgeKeys = new Set(['customers', 'amcContracts']);

function shouldHideTechnicianSidebarBadge(link) {
  const label = String(link?.label || '').trim().toLowerCase();
  const to = String(link?.to || '').trim().toLowerCase();
  return label === 'customers'
    || label === 'amc contracts'
    || to === '/app/tech/customers'
    || to === '/app/tech/amc-contracts';
}

function SidebarItem({ link, close, badge, collapsed = false }) {
  const Icon = link.icon;
  const location = useLocation();
  const itemLabelClass = collapsed ? 'sr-only' : 'min-w-0 truncate';
  const itemClass = `${collapsed ? 'enterprise-sidebar-item-collapsed' : ''}`.trim();
  const ariaLabel = collapsed ? link.label : undefined;

  if (link.disabled) {
    return (
      <div className={`enterprise-sidebar-item enterprise-sidebar-item-disabled ${itemClass}`} aria-disabled="true" title={link.label}>
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className={itemLabelClass}>{link.label}</span>
        {badge ? <span className="ml-auto rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-black uppercase text-slate-400">Soon</span> : null}
      </div>
    );
  }

  return (
    <NavLink
      to={link.to}
      end={link.to === '/app/admin/dashboard' || link.to === '/app/tech/dashboard' || link.to === '/app/tech/dashboard'}
      onClick={close}
      aria-label={ariaLabel}
      title={ariaLabel || link.label}
      className={({ isActive }) => `enterprise-sidebar-item ${itemClass} ${isSidebarLinkActive(link.to, location, isActive) ? 'enterprise-sidebar-item-active' : ''}`.trim()}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className={itemLabelClass}>{link.label}</span>
      <div className={collapsed ? 'enterprise-sidebar-badge-anchor' : ''}>
        <SidebarBadge badge={badge} />
      </div>
    </NavLink>
  );
}

function isSidebarLinkActive(to, location, isActive) {
  const [path, search = ''] = to.split('?');
  if (search) return location.pathname === path && location.search === `?${search}`;
  if (to === '/app/admin/dashboard' || to === '/app/tech/dashboard' || to === '/app/tech/dashboard') return location.pathname === path;
  if (to === '/app/admin/documents') return location.pathname.startsWith(path) && !new URLSearchParams(location.search).has('type');
  return isActive;
}

function AdminSidebar({ close, collapsed = false, onToggleCollapse = null }) {
  const { logout, request, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboardData, setDashboardData] = useState(null);
  const groups = visibleAdminGroups(user);
  const badges = buildSidebarBadges(dashboardData);

  useEffect(() => {
    let mounted = true;
    async function loadSidebarBadges() {
      const [metricsData, paymentRows, notificationData] = await Promise.all([
        request('/dashboard/metrics').catch(() => null),
        loadPaymentRowsForPaymentsBadge(request).catch(() => null),
        request('/notifications?limit=100').catch(() => null)
      ]);
      if (!mounted) return;
      const notificationRows = notificationData?.notifications || [];
      const fallbackRows = notificationData && notificationRows.length ? [] : fallbackNotificationRows();
      const notificationsUnreadCount = notificationRows.length
        ? finiteNumber(notificationData?.unreadCount ?? unreadNotificationCount(notificationRows))
        : unreadNotificationCount(fallbackRows);
      const paymentBadgePatch = { paymentsBadgeCount: paymentsBadgeCountFromRows(paymentRows) };
      const notificationBadgePatch = { notificationsUnreadCount };
      setDashboardData(metricsData ? { ...metricsData, ...paymentBadgePatch, ...notificationBadgePatch } : { ...paymentBadgePatch, ...notificationBadgePatch });
    }

    loadSidebarBadges();
    window.addEventListener('focus', loadSidebarBadges);
    window.addEventListener('us:billing-updated', loadSidebarBadges);
    window.addEventListener('us:notifications-updated', loadSidebarBadges);
    window.addEventListener(SIDEBAR_BADGES_UPDATED_EVENT, loadSidebarBadges);
    return () => {
      mounted = false;
      window.removeEventListener('focus', loadSidebarBadges);
      window.removeEventListener('us:billing-updated', loadSidebarBadges);
      window.removeEventListener('us:notifications-updated', loadSidebarBadges);
      window.removeEventListener(SIDEBAR_BADGES_UPDATED_EVENT, loadSidebarBadges);
    };
  }, [location.pathname, location.search, request]);

  function handleLogout() {
    logout();
    navigate('/app');
  }

  return (
    <aside className={`enterprise-sidebar ${collapsed ? 'enterprise-sidebar-collapsed' : ''}`}>
      <div className={`border-b border-white/10 ${collapsed ? 'enterprise-sidebar-header-collapsed' : 'p-4 pb-3'}`}>
        {collapsed ? (
          <>
            {onToggleCollapse ? (
              <button
                type="button"
                className="icon-button enterprise-sidebar-toggle-collapsed z-20 bg-white/5 shadow-[0_10px_24px_rgba(2,8,23,0.3)]"
                onClick={onToggleCollapse}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
              </button>
            ) : null}
          </>
        ) : (
          <div className="flex items-center gap-3">
            <SidebarBrandMark collapsed={collapsed} />
            {onToggleCollapse ? (
              <button
                type="button"
                className="icon-button ml-auto h-9 w-9 shrink-0 bg-white/5"
                onClick={onToggleCollapse}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
              </button>
            ) : null}
          </div>
        )}
      </div>

      <nav className={`enterprise-sidebar-nav flex-1 overflow-y-auto ${collapsed ? 'enterprise-sidebar-nav-collapsed' : 'px-3 py-3'}`}>
        {groups.map((group) => (
          <div className={`enterprise-sidebar-group ${collapsed ? 'enterprise-sidebar-group-collapsed' : ''}`} key={group.title || 'dashboard'}>
            {group.title && !collapsed ? (
              <div className="enterprise-sidebar-heading">
                <span>{group.title}</span>
              </div>
            ) : null}
            <div className="space-y-1">
              {group.links.map((link) => <SidebarItem key={`${group.title}-${link.label}`} link={link} close={close} badge={badges[link.badgeKey]} collapsed={collapsed} />)}
            </div>
          </div>
        ))}
      </nav>

      <div className={`enterprise-sidebar-footer border-t border-white/10 ${collapsed ? 'enterprise-sidebar-footer-collapsed' : 'p-3'}`}>
        <div className={`mb-3 rounded-card border border-white/10 bg-white/[0.045] ${collapsed ? 'enterprise-sidebar-profile-collapsed' : 'flex items-center gap-3 p-3'}`}>
          <CurrentUserAvatar user={user} fallback="A" className={`${collapsed ? 'h-11 w-11 text-sm' : 'h-12 w-12 text-base'}`} />
          {collapsed ? null : (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{user?.name || 'Admin User'}</p>
              <span className="admin-role-badge mt-1 inline-flex">{roleLabel(user?.role || 'admin')}</span>
            </div>
          )}
        </div>
        <button className={`btn btn-secondary ${collapsed ? 'enterprise-sidebar-logout-collapsed' : 'w-full justify-start'}`} onClick={handleLogout} title="Logout" aria-label="Logout">
          <LogOut className="h-4 w-4 shrink-0" />
          {collapsed ? null : <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

function TechnicianSidebar({ close, collapsed = false, onToggleCollapse = null }) {
  const { user, logout, request } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboardData, setDashboardData] = useState(null);
  const groups = visibleTechnicianGroups(user);
  const badgeKeySignature = sidebarBadgeKeys(groups).join('|');
  const badges = buildTechnicianSidebarBadges(dashboardData);

  useEffect(() => {
    let mounted = true;

    async function loadTechnicianSidebarBadges() {
      const badgeKeys = new Set(badgeKeySignature.split('|').filter(Boolean));
      const [technicianData, inventoryData, amcData] = await Promise.all([
        request('/dashboard/technician').catch(() => null),
        badgeKeys.has('lowStock') ? request('/inventory?limit=1').catch(() => null) : Promise.resolve(null),
        badgeKeys.has('amcContracts') ? request('/amc/contracts').catch(() => null) : Promise.resolve(null)
      ]);
      if (!mounted) return;
      setDashboardData({
        ...(technicianData || {}),
        inventorySummary: inventoryData?.summary || null,
        amcSummary: amcData?.summary || null,
        amcContracts: amcData?.contracts || []
      });
    }

    loadTechnicianSidebarBadges();
    window.addEventListener('focus', loadTechnicianSidebarBadges);
    window.addEventListener('us:billing-updated', loadTechnicianSidebarBadges);
    window.addEventListener(SIDEBAR_BADGES_UPDATED_EVENT, loadTechnicianSidebarBadges);
    return () => {
      mounted = false;
      window.removeEventListener('focus', loadTechnicianSidebarBadges);
      window.removeEventListener('us:billing-updated', loadTechnicianSidebarBadges);
      window.removeEventListener(SIDEBAR_BADGES_UPDATED_EVENT, loadTechnicianSidebarBadges);
    };
  }, [badgeKeySignature, location.pathname, location.search, request, user]);

  function handleLogout() {
    logout();
    navigate('/app');
  }

  return (
    <aside className={`enterprise-sidebar ${collapsed ? 'enterprise-sidebar-collapsed' : ''}`}>
      <div className={`border-b border-white/10 ${collapsed ? 'enterprise-sidebar-header-collapsed' : 'p-4 pb-3'}`}>
        {collapsed ? (
          <>
            {onToggleCollapse ? (
              <button
                type="button"
                className="icon-button enterprise-sidebar-toggle-collapsed z-20 bg-white/5 shadow-[0_10px_24px_rgba(2,8,23,0.3)]"
                onClick={onToggleCollapse}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
              </button>
            ) : null}
          </>
        ) : (
          <div className="flex items-center gap-3">
            <SidebarBrandMark collapsed={collapsed} />
            {onToggleCollapse ? (
              <button
                type="button"
                className="icon-button ml-auto h-9 w-9 shrink-0 bg-white/5"
                onClick={onToggleCollapse}
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
              </button>
            ) : null}
          </div>
        )}
      </div>

      <nav className={`enterprise-sidebar-nav flex-1 overflow-y-auto ${collapsed ? 'enterprise-sidebar-nav-collapsed' : 'px-3 py-3'}`}>
        {groups.map((group) => (
          <div className={`enterprise-sidebar-group ${collapsed ? 'enterprise-sidebar-group-collapsed' : ''}`} key={group.title || 'dashboard'}>
            {group.title && !collapsed ? (
              <div className="enterprise-sidebar-heading">
                <span>{group.title}</span>
              </div>
            ) : null}
            <div className="space-y-1">
              {group.links.map((link) => (
                <SidebarItem
                  key={`${group.title}-${link.label}`}
                  link={link}
                  close={close}
                  badge={shouldHideTechnicianSidebarBadge(link) || technicianHiddenBadgeKeys.has(link.badgeKey) ? null : badges[link.badgeKey]}
                  collapsed={collapsed}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className={`enterprise-sidebar-footer border-t border-white/10 ${collapsed ? 'enterprise-sidebar-footer-collapsed' : 'p-3'}`}>
        <div className={`mb-3 rounded-card border border-white/10 bg-white/[0.045] ${collapsed ? 'enterprise-sidebar-profile-collapsed' : 'flex items-center gap-3 p-3'}`}>
          <CurrentUserAvatar user={user} fallback="T" className={`${collapsed ? 'h-11 w-11 text-sm' : 'h-12 w-12 text-base'}`} />
          {collapsed ? null : (
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{user?.name || 'Technician'}</p>
              <span className="admin-role-badge mt-1 inline-flex">{roleLabel(user?.role || 'technician')}</span>
            </div>
          )}
        </div>
        <button className={`btn btn-secondary ${collapsed ? 'enterprise-sidebar-logout-collapsed' : 'w-full justify-start'}`} onClick={handleLogout} title="Logout" aria-label="Logout">
          <LogOut className="h-4 w-4 shrink-0" />
          {collapsed ? null : <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}

function GlobalSearch({ role, permissionSubject = role }) {
  const { request } = useAuth();
  const navigate = useNavigate();
  const searchRef = useRef(null);
  const requestRef = useRef(request);
  const isTechnician = normalizeRole(role) === 'technician';
  const base = isTechnician ? '/app/tech' : '/app/admin';
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [resultGroups, setResultGroups] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    requestRef.current = request;
  }, [request]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const value = debouncedQuery;
    if (value.length < 2 || !canUseGlobalSearch(permissionSubject)) {
      setResultGroups([]);
      setOpen(false);
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);
    setOpen(true);
    const encoded = encodeURIComponent(value);
    Promise.all([
      requestRef.current(`/customers?search=${encoded}&limit=5`).catch(() => ({ customers: [] })),
      requestRef.current(`/bookings?search=${encoded}&limit=5`).catch(() => ({ bookings: [] })),
      requestRef.current(`/work-orders?search=${encoded}&limit=5`).catch(() => ({ workOrders: [] })),
      requestRef.current(`/invoices?search=${encoded}&limit=5`).catch(() => ({ invoices: [] })),
      requestRef.current(`/payments?search=${encoded}&limit=5`).catch(() => ({ payments: [] })),
      requestRef.current(`/inventory?search=${encoded}&limit=5`).catch(() => ({ parts: [] }))
    ]).then(([customers, bookings, workOrders, invoices, payments, inventory]) => {
      if (!active) return;
      const groups = [
        {
          label: 'Customers',
          permission: 'view_customers',
          items: (customers.customers || []).map((customer) => ({
            title: customer.name || getCustomerDisplayId(customer) || 'Customer',
            meta: [getCustomerDisplayId(customer), customer.phone].filter(Boolean).join(' - '),
            to: `${base}/customers/${customer.id || customer._id}`
          }))
        },
        {
          label: 'Bookings',
          permission: 'view_bookings',
          items: (bookings.bookings || []).map((booking) => ({
            title: booking.bookingCode || 'Booking',
            meta: [booking.customerName, booking.phone, booking.serviceType || booking.device].filter(Boolean).join(' - '),
            to: `${base}/bookings`
          }))
        },
        {
          label: 'Work Orders',
          permission: 'view_work_orders',
          items: (workOrders.workOrders || workOrders.data || []).map((order) => ({
            title: getWorkOrderDisplayId(order),
            meta: [order.customerId?.name || order.customerName, order.serviceType || order.device, order.status].filter(Boolean).join(' - '),
            to: `${base}/work-orders/${order.id || order._id}`
          }))
        },
        {
          label: 'Invoices',
          permission: 'view_invoices',
          items: (invoices.invoices || []).map((invoice) => ({
            title: getInvoiceDisplayId(invoice),
            meta: [invoice.customerId?.name || invoice.customerName, invoice.status, currency(invoice.total ?? invoice.totalAmount)].filter(Boolean).join(' - '),
            to: `${base}/invoices`
          }))
        },
        {
          label: 'Payments',
          permission: 'view_payments',
          items: (payments.payments || []).map((payment) => {
            const invoiceId = payment.invoiceId?.id || payment.invoiceId?._id || payment.invoiceId;
            return {
              title: getPaymentDisplayId(payment),
              meta: [payment.customerId?.name, payment.method, currency(payment.paidAmount ?? payment.amount)].filter(Boolean).join(' - '),
              to: invoiceId ? `${base}/payments?invoiceId=${encodeURIComponent(invoiceId)}` : `${base}/payments`
            };
          })
        },
        {
          label: 'Products / Parts',
          permission: 'view_inventory',
          items: (inventory.parts || []).map((part) => ({
            title: part.partName || part.sku || 'Part',
            meta: [part.sku, part.category, `${Number(part.available || 0)} available`].filter(Boolean).join(' - '),
            to: `${base}/parts`
          }))
        }
      ].filter((group) => can(permissionSubject, group.permission)).map((group) => ({ ...group, items: group.items.slice(0, 5) })).filter((group) => group.items.length);
      setResultGroups(groups);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [debouncedQuery, permissionSubject, role]);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (searchRef.current?.contains(event.target)) return;
      setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [open]);

  function firstResult() {
    return resultGroups.find((group) => group.items.length)?.items[0] || null;
  }

  function openResult(result) {
    if (!result?.to) return;
    setQuery('');
    setDebouncedQuery('');
    setResultGroups([]);
    setOpen(false);
    navigate(result.to);
  }

  return (
    <form
      ref={searchRef}
      className="search-input-shell relative w-full max-w-xl"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        openResult(firstResult());
      }}
    >
      <span className="search-input-icon pointer-events-none muted" aria-hidden="true">
        <Search className="h-4 w-4" />
      </span>
      <input
        type="search"
        className="input search-input-control h-11 pl-9 pr-10"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          if (event.target.value.trim().length >= 2) setOpen(true);
        }}
        onFocus={() => {
          if (debouncedQuery.length >= 2) setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            openResult(firstResult());
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
          }
        }}
        placeholder="Search customers, phone, invoice, booking, parts"
      />
      {loading ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--brand)]" /> : null}
      {open && debouncedQuery.length >= 2 ? (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-card border border-[var(--line)] bg-[#071426] shadow-2xl">
          {resultGroups.length ? resultGroups.map((group) => (
            <div key={group.label} className="border-b border-white/10 last:border-b-0">
              <p className="px-4 pt-3 text-[10px] font-black uppercase tracking-wider text-sky-200/75">{group.label}</p>
              {group.items.map((result) => (
                <button
                  key={`${group.label}-${result.title}-${result.to}`}
                  type="button"
                  className="block w-full px-4 py-3 text-left transition hover:bg-sky-400/10"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => openResult(result)}
                >
                  <span className="block truncate font-bold text-slate-100">{result.title}</span>
                  <span className="mt-0.5 block truncate text-sm muted">{result.meta || group.label}</span>
                </button>
              ))}
            </div>
          )) : !loading ? <p className="px-4 py-3 text-sm muted">No matching records found</p> : null}
        </div>
      ) : null}
    </form>
  );
}

function priorityForNotification(item) {
  const text = `${item?.type || ''} ${item?.title || ''} ${item?.message || ''}`.toLowerCase();
  if (text.includes('low_stock') || text.includes('low stock') || text.includes('overdue')) return 'Critical';
  if (text.includes('payment') || text.includes('work order')) return 'High';
  return 'Normal';
}

function NotificationCenter({ role }) {
  const { request } = useAuth();
  const navigate = useNavigate();
  const notificationRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  async function loadNotifications() {
    setLoading(true);
    try {
      const data = await request('/notifications');
      const remoteRows = data.notifications || [];
      const rows = remoteRows.length ? remoteRows : normalizeRole(role) === 'technician' ? [] : fallbackNotificationRows();
      const normalizedRows = filterClearedNotifications(rows.map((item) => normalizeNotification(item, role)));
      setNotifications(normalizedRows);
      setUnreadCount(remoteRows.length ? finiteNumber(data.unreadCount ?? unreadNotificationCount(normalizedRows)) : unreadNotificationCount(normalizedRows));
    } catch {
      const fallbackRows = filterClearedNotifications((normalizeRole(role) === 'technician' ? [] : fallbackNotificationRows()).map((item) => normalizeNotification(item, role)));
      setNotifications(fallbackRows);
      setUnreadCount(unreadNotificationCount(fallbackRows));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
    const timer = setInterval(loadNotifications, 30000);
    return () => clearInterval(timer);
  }, [request, role]);

  useEffect(() => {
    if (!open) return undefined;

    function handlePointerDown(event) {
      if (notificationRef.current?.contains(event.target)) return;
      setOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  async function markAllRead() {
    const unread = notifications.filter((item) => !item.read);
    const remoteUnread = unread.filter((item) => !item.isFallback);
    if (remoteUnread.length) {
      try {
        await request('/notifications/read-all', { method: 'PATCH' });
      } catch {
        await Promise.all(remoteUnread.map((item) => request(`/notifications/${item.id}/read`, { method: 'PATCH' }).catch(() => null)));
      }
    }
    if (unread.some((item) => item.isFallback)) markAllFallbackNotificationsRead();
    setNotifications((current) => current.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
    window.dispatchEvent(new Event('us:notifications-updated'));
    loadNotifications();
  }

  async function markRead(item) {
    if (!item.read) {
      if (item.isFallback) {
        markFallbackNotificationRead(item.id);
      } else {
        await request(`/notifications/${item.id}/read`, { method: 'PATCH' }).catch(() => null);
      }
      setNotifications((current) => current.map((row) => (row.id === item.id ? { ...row, read: true } : row)));
      setUnreadCount((count) => Math.max(0, count - 1));
      window.dispatchEvent(new Event('us:notifications-updated'));
    }
  }

  async function openNotification(item) {
    await markRead(item);
    setOpen(false);
    navigate(notificationTarget(item, role));
  }

  return (
    <div className="relative" ref={notificationRef}>
      <button
        type="button"
        className="icon-button enterprise-top-icon relative h-11 w-11"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? 'Close notifications' : 'Open notifications'}
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" />
        {unreadCount ? (
          <span className="enterprise-notification-bell-badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="notification-drawer">
          <div className="notification-drawer-header">
            <div className="notification-drawer-heading">
              <h2 className="text-base font-black">Notification Center</h2>
              <p className="mt-1 text-xs muted">Low stock, bookings, payments, service jobs, and reminders.</p>
            </div>
            <button type="button" className="btn btn-secondary notification-mark-all-button" onClick={markAllRead} disabled={!unreadCount}>Mark all read</button>
          </div>
          <div className="notification-drawer-list">
            {loading ? (
              <div className="grid min-h-28 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[var(--brand)]" /></div>
            ) : notifications.length ? notifications.slice(0, 5).map((item) => {
              const priority = priorityForNotification(item);
              return (
                <button key={item.id} type="button" className={`mb-3 block w-full rounded-card border p-3 text-left transition hover:border-sky-300/45 hover:bg-sky-400/10 ${item.read ? 'border-white/10 bg-white/[0.035]' : 'border-sky-300/25 bg-sky-400/10'}`} onClick={() => openNotification(item)}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{item.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${priority === 'Critical' ? 'bg-rose-500/20 text-rose-100' : priority === 'High' ? 'bg-amber-400/20 text-amber-100' : 'bg-sky-400/15 text-sky-100'}`}>{priority}</span>
                  </div>
                  <p className="mt-1 text-sm muted">{item.message}</p>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                    <span className="muted">{timeAgo(item.createdAt)}</span>
                    {!item.read ? (
                      <span className="font-black text-sky-100" onClick={(event) => {
                        event.stopPropagation();
                        markRead(item);
                      }}>Mark as read</span>
                    ) : null}
                  </div>
                </button>
              );
            }).concat([
              <button
                key="view-all-notifications"
                type="button"
                className="btn btn-secondary mt-1 w-full justify-center"
                onClick={() => {
                  setOpen(false);
                  navigate(normalizeRole(role) === 'technician' ? '/app/tech/dashboard' : '/app/admin/notifications');
                }}
              >
                View all notifications
              </button>
            ]) : (
              <div className="grid min-h-32 place-items-center text-center">
                <div>
                  <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-[var(--brand)]" />
                  <p className="font-bold">No notifications yet</p>
                  <p className="mt-1 text-sm muted">New operational alerts will appear here.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AdminTopBar({ role, openSidebar }) {
  const { user } = useAuth();
  const [bookingOpen, setBookingOpen] = useState(false);
  const userRole = user?.role || role;
  const isTechnician = normalizeRole(userRole) === 'technician';
  const permissionSubject = user || userRole;
  const canCreateBooking = can(permissionSubject, 'create_booking');

  return (
    <>
      <header className="enterprise-topbar">
        <div className="enterprise-topbar-inner">
          <div className="enterprise-topbar-search">
            <button className="icon-button enterprise-top-icon h-11 w-11 xl:hidden" onClick={openSidebar} aria-label={`Open ${isTechnician ? 'technician' : 'admin'} menu`}>
              <Menu className="h-5 w-5" />
            </button>
            <GlobalSearch role={userRole} permissionSubject={permissionSubject} />
          </div>
          <div className="enterprise-topbar-controls">
            {canCreateBooking ? (
              <button className="btn btn-primary glow-action enterprise-primary-action enterprise-booking-action" type="button" onClick={() => setBookingOpen(true)}>
                <BookOpenCheck className="h-4 w-4" />
                <span>Booking</span>
              </button>
            ) : null}
            <NavLink className="btn btn-secondary enterprise-website-action" to="/">
              <Globe2 className="h-4 w-4" />
              <span>Website</span>
            </NavLink>
            <NotificationCenter role={userRole} />
            <div className="enterprise-user-chip">
              <CurrentUserAvatar user={user} fallback={isTechnician ? 'T' : 'A'} className="h-11 w-11 text-sm" />
              <div className="min-w-0">
                <p className="max-w-36 truncate text-sm font-bold">{user?.name || 'Admin User'}</p>
                <span className="admin-role-badge mt-1 inline-flex">{roleLabel(userRole)}</span>
              </div>
            </div>
          </div>
        </div>
      </header>
      {bookingOpen ? (
        <Suspense fallback={null}>
          <TopbarBookingModal onClose={() => setBookingOpen(false)} onSaved={() => setBookingOpen(false)} />
        </Suspense>
      ) : null}
    </>
  );
}

function UnauthorizedPanel({ role, auditOnly = false }) {
  return (
    <div className="surface grid min-h-[60vh] place-items-center p-6 text-center">
      <div className="max-w-md">
        <ShieldCheck className="mx-auto mb-4 h-10 w-10 text-[var(--brand)]" />
        <p className="text-xs font-black uppercase text-[var(--brand)]">Access denied</p>
        <h1 className="mt-2 text-2xl font-black">{auditOnly ? 'Audit logs are admin only.' : 'This module is restricted.'}</h1>
        <p className="mt-3 text-sm leading-6 muted">
          {auditOnly ? 'Access denied. Audit logs are available only for admin users.' : `Your current role is ${roleLabel(role)}. Use an allowed module from the sidebar or contact an administrator for access.`}
        </p>
      </div>
    </div>
  );
}

export default function DashboardLayout({ role }) {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => readSidebarCollapsedState(role));
  const { themePreference, resolvedTheme } = useThemePreference();
  const shellThemeClass = resolvedTheme === 'light' ? 'theme-light' : 'theme-dark';
  const shellThemeProps = {
    'data-theme-preference': themePreference,
    'data-theme': resolvedTheme,
    style: { colorScheme: resolvedTheme, '--enterprise-sidebar-width': sidebarCollapsed ? sidebarCollapsedCompactWidth : sidebarExpandedWidth }
  };

  useEffect(() => {
    setSidebarCollapsed(readSidebarCollapsedState(role));
  }, [role]);

  useEffect(() => {
    persistSidebarCollapsedState(role, sidebarCollapsed);
  }, [role, sidebarCollapsed]);

  if (role === 'admin') {
    const allowed = canOpenAdminPath(location.pathname, user || role);
    const auditOnly = location.pathname.startsWith('/app/admin/audit-logs');
    return (
      <div className={`app-shell admin-shell min-h-screen bg-[var(--bg)] ${shellThemeClass}`} {...shellThemeProps}>
        <div className="fixed inset-y-0 left-0 z-40 hidden xl:block" style={{ width: sidebarCollapsed ? sidebarCollapsedCompactWidth : sidebarExpandedWidth }}>
          <AdminSidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((value) => !value)} />
        </div>
        <AdminTopBar role={role} openSidebar={() => setOpen(true)} />
        {open ? (
          <div className="fixed inset-0 z-[70] bg-black/55 xl:hidden" onClick={() => setOpen(false)}>
            <div className="h-full w-[292px] max-w-[88vw]" onClick={(event) => event.stopPropagation()}>
              <AdminSidebar close={() => setOpen(false)} />
              <button className="absolute right-4 top-4 icon-button h-9 w-9 bg-[var(--surface)]" onClick={() => setOpen(false)} aria-label="Close admin menu">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : null}
        <main className="enterprise-main p-4 md:p-6">
          {allowed ? <Outlet /> : <UnauthorizedPanel role={user?.role || role} auditOnly={auditOnly} />}
        </main>
      </div>
    );
  }

  return (
    <div className={`app-shell technician-shell min-h-screen bg-[var(--bg)] ${shellThemeClass}`} {...shellThemeProps}>
      <div className="fixed inset-y-0 left-0 z-40 hidden xl:block" style={{ width: sidebarCollapsed ? sidebarCollapsedCompactWidth : sidebarExpandedWidth }}>
        <TechnicianSidebar collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((value) => !value)} />
      </div>
      <AdminTopBar role={role} openSidebar={() => setOpen(true)} />
      {open ? (
        <div className="fixed inset-0 z-[70] bg-black/55 xl:hidden" onClick={() => setOpen(false)}>
          <div className="h-full w-[292px] max-w-[88vw]" onClick={(event) => event.stopPropagation()}>
            <TechnicianSidebar close={() => setOpen(false)} />
            <button className="absolute right-4 top-4 icon-button h-9 w-9 bg-[var(--surface)]" onClick={() => setOpen(false)} aria-label="Close technician menu">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}
      <main className="enterprise-main p-4 md:p-6">
        {canOpenTechnicianPath(location.pathname, user || role) ? <Outlet /> : <UnauthorizedPanel role={user?.role || role} />}
      </main>
    </div>
  );
}
