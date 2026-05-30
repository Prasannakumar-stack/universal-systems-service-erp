import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  BookOpenCheck,
  Boxes,
  CreditCard,
  FileCheck2,
  Activity,
  Globe2,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  Phone,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  Wrench,
  X
} from 'lucide-react';
import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { company } from '../utils/constants.js';
import { currency } from '../utils/format.js';
import { getCustomerDisplayId, getInvoiceDisplayId, getPaymentDisplayId, getWorkOrderDisplayId } from '../shared/idHelpers.js';
import { adminWorkspaceRoles, can, canAny, canAccessRoles, normalizeRole, roleLabel } from '../utils/roles.js';
import { useThemePreference } from '../utils/theme.js';
import {
  fallbackNotificationRows,
  markAllFallbackNotificationsRead,
  markFallbackNotificationRead,
  normalizeNotification,
  timeAgo,
  unreadNotificationCount
} from '../features/notifications/notificationCenterData.js';

const TopbarBookingModal = lazy(() => import('../features/bookings/BookingsPage.jsx').then((module) => ({ default: module.BookingModal })));

const fullAccessRoles = ['admin', 'super_admin'];

const adminGroups = [
  {
    title: '',
    links: [{ to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'view_business_dashboard' }]
  },
  {
    title: 'Operations',
    links: [
      { to: '/admin/bookings', label: 'Bookings', icon: BookOpenCheck, permission: 'view_bookings', badgeKey: 'bookings' },
      { to: '/admin/work-orders', label: 'Work Orders', icon: Wrench, permission: 'view_work_orders', badgeKey: 'workOrders' }
    ]
  },
  {
    title: 'Customers',
    links: [
      { to: '/admin/customers', label: 'Customers', icon: Users, permission: 'view_customers' }
    ]
  },
  {
    title: 'Inventory',
    links: [
      { to: '/admin/parts', label: 'Products / Parts', icon: Boxes, permission: 'view_inventory', badgeKey: 'lowStock' }
    ]
  },
  {
    title: 'Sales & Billing',
    links: [
      { to: '/admin/invoices', label: 'Invoices', icon: ReceiptText, permission: 'view_invoices' },
      { to: '/admin/payments', label: 'Payments', icon: CreditCard, permission: 'view_payments', badgeKey: 'pendingPayments' }
    ]
  },
  {
    title: 'AMC & Warranty',
    links: [
      { to: '/admin/amc-contracts', label: 'AMC Contracts', icon: FileCheck2, permission: 'view_amc', badgeKey: 'amcRenewals' }
    ]
  },
  {
    title: 'Reports',
    links: [
      { to: '/admin/reports', label: 'Reports', icon: Activity, permission: 'view_reports' }
    ]
  },
  {
    title: 'System',
    links: [
      { to: '/admin/notifications', label: 'Notifications', icon: Bell, badgeKey: 'notifications' },
      { to: '/admin/technician-panel', label: 'Staff / Technicians', icon: UserRound, permission: 'manage_users' },
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: Activity, permission: 'view_audit_logs' },
      { to: '/admin/settings', label: 'Settings', icon: Settings, permission: 'view_settings' }
    ]
  }
];

const technicianGroups = [
  {
    title: '',
    links: [{ to: '/technician/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'view_dashboard' }]
  },
  {
    title: 'Operations',
    links: [
      { to: '/tech/bookings', label: 'Bookings', icon: BookOpenCheck, permission: 'view_bookings', badgeKey: 'bookings' },
      { to: '/tech/work-orders', label: 'Work Orders', icon: Wrench, permission: 'view_work_orders', badgeKey: 'workOrders' }
    ]
  },
  {
    title: 'Customers',
    links: [{ to: '/tech/customers', label: 'Customers', icon: Users, permission: 'view_customers', badgeKey: 'customers' }]
  },
  {
    title: 'Sales & Billing',
    links: [
      { to: '/tech/invoices', label: 'Invoices', icon: ReceiptText, permission: 'view_invoices', badgeKey: 'pendingInvoices' },
      { to: '/tech/payments', label: 'Payments', icon: CreditCard, permission: 'view_payments', badgeKey: 'pendingPayments' }
    ]
  },
  {
    title: 'Inventory',
    links: [{ to: '/tech/parts', label: 'Products / Parts', icon: Boxes, permission: 'view_inventory', badgeKey: 'lowStock' }]
  },
  {
    title: 'AMC & Warranty',
    links: [{ to: '/tech/amc-contracts', label: 'AMC Contracts', icon: FileCheck2, permission: 'view_amc', badgeKey: 'amcContracts' }]
  },
  {
    title: 'System',
    links: [{ to: '/tech/settings', label: 'Settings', icon: Settings }]
  }
];

const adminRouteAccess = [
  { prefix: '/admin/dashboard', permission: 'view_business_dashboard' },
  { prefix: '/admin/technician-panel', permission: 'manage_users' },
  { prefix: '/admin/technician-tasks', permission: 'assign_technician' },
  { prefix: '/admin/bookings', permission: 'view_bookings' },
  { prefix: '/admin/work-orders', permission: 'view_work_orders' },
  { prefix: '/admin/customers', permission: 'view_customers' },
  { prefix: '/admin/amc', permission: 'view_amc' },
  { prefix: '/admin/warranties', permission: 'view_amc' },
  { prefix: '/admin/parts', permission: 'view_inventory' },
  { prefix: '/admin/stock', permission: 'view_stock_movements' },
  { prefix: '/admin/documents', permission: 'view_documents' },
  { prefix: '/admin/quotations', permission: 'view_documents' },
  { prefix: '/admin/invoices', permission: 'view_invoices' },
  { prefix: '/admin/payments', permission: 'view_payments' },
  { prefix: '/admin/reports/finance', permission: 'view_reports' },
  { prefix: '/admin/reports/inventory', permission: 'view_reports' },
  { prefix: '/admin/reports/technicians', permission: 'view_reports' },
  { prefix: '/admin/reports', permission: 'view_reports' },
  { prefix: '/admin/notifications', roles: adminWorkspaceRoles },
  { prefix: '/admin/audit-logs', permission: 'view_audit_logs' },
  { prefix: '/admin/settings', permission: 'view_settings' }
];

const technicianRouteAccess = [
  { prefix: '/tech/dashboard', permission: 'view_dashboard' },
  { prefix: '/technician/dashboard', permission: 'view_dashboard' },
  { prefix: '/tech/bookings', permission: 'view_bookings' },
  { prefix: '/technician/bookings', permission: 'view_bookings' },
  { prefix: '/tech/work-orders', permission: 'view_work_orders' },
  { prefix: '/technician/work-orders', permission: 'view_work_orders' },
  { prefix: '/tech/customers', permission: 'view_customers' },
  { prefix: '/technician/customers', permission: 'view_customers' },
  { prefix: '/tech/invoices', permission: 'view_invoices' },
  { prefix: '/technician/invoices', permission: 'view_invoices' },
  { prefix: '/tech/payments', permission: 'view_payments' },
  { prefix: '/technician/payments', permission: 'view_payments' },
  { prefix: '/tech/parts', permission: 'view_inventory' },
  { prefix: '/technician/parts', permission: 'view_inventory' },
  { prefix: '/tech/amc', permission: 'view_amc' },
  { prefix: '/technician/amc', permission: 'view_amc' },
  { prefix: '/tech/warranties', permission: 'view_amc' },
  { prefix: '/technician/warranties', permission: 'view_amc' },
  { prefix: '/tech/settings' },
  { prefix: '/technician/settings' },
  { prefix: '/technician/profile' }
];

function canSeeLink(link, subject) {
  if (link.permission) return can(subject, link.permission);
  return !link.roles || canAccessRoles(roleFromSubject(subject), link.roles);
}

function roleFromSubject(subject) {
  return typeof subject === 'string' ? subject : subject?.role;
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
    green: 'enterprise-sidebar-badge-green'
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
    notifications: { value: dashboardData?.notificationsUnreadCount || 0, tone: 'blue' }
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
  const base = normalizedRole === 'technician' ? '/tech' : '/admin';
  const id = item?.sourceId || '';
  const text = `${item?.type || ''} ${item?.title || ''} ${item?.message || ''}`.toLowerCase();
  if (text.includes('quotation') || text.includes('quote')) return `${base}/documents?type=quotation`;
  if (text.includes('low stock') || text.includes('stock')) return '/admin/parts';
  if (text.includes('payment')) return `${base}/invoices`;
  if (text.includes('invoice')) return `${base}/invoices`;
  if (text.includes('amc') || text.includes('renewal')) return normalizedRole === 'technician' ? '/tech/amc-contracts' : '/admin/amc-renewals';
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
    <span className={`enterprise-sidebar-badge ${sidebarBadgeClass(badge.tone)}`}>
      {value > 99 ? '99+' : value}
    </span>
  );
}

function SidebarItem({ link, close, badge }) {
  const Icon = link.icon;
  const location = useLocation();

  if (link.disabled) {
    return (
      <div className="enterprise-sidebar-item enterprise-sidebar-item-disabled" aria-disabled="true">
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="min-w-0 truncate">{link.label}</span>
        <span className="ml-auto rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-black uppercase text-slate-400">Soon</span>
      </div>
    );
  }

  return (
    <NavLink
      to={link.to}
      end={link.to === '/admin/dashboard' || link.to === '/tech/dashboard' || link.to === '/technician/dashboard'}
      onClick={close}
      className={({ isActive }) => `enterprise-sidebar-item ${isSidebarLinkActive(link.to, location, isActive) ? 'enterprise-sidebar-item-active' : ''}`}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="min-w-0 truncate">{link.label}</span>
      <SidebarBadge badge={badge} />
    </NavLink>
  );
}

function isSidebarLinkActive(to, location, isActive) {
  const [path, search = ''] = to.split('?');
  if (search) return location.pathname === path && location.search === `?${search}`;
  if (to === '/admin/dashboard' || to === '/tech/dashboard' || to === '/technician/dashboard') return location.pathname === path;
  if (to === '/admin/documents') return location.pathname.startsWith(path) && !new URLSearchParams(location.search).has('type');
  return isActive;
}

function AdminSidebar({ close }) {
  const { logout, request, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [dashboardData, setDashboardData] = useState(null);
  const [companyProfile, setCompanyProfile] = useState(null);
  const groups = visibleAdminGroups(user);
  const badges = buildSidebarBadges(dashboardData);
  const displayCompany = companyProfile?.name || company.name;
  const displayPhone = companyProfile?.phone || company.phones.join(' / ');
  const displayLocation = companyProfile?.address ? companyProfile.address.split(',').slice(-2).join(',').trim() || companyProfile.address : 'Mettur Dam';

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
    return () => {
      mounted = false;
      window.removeEventListener('focus', loadSidebarBadges);
      window.removeEventListener('us:billing-updated', loadSidebarBadges);
      window.removeEventListener('us:notifications-updated', loadSidebarBadges);
    };
  }, [location.pathname, location.search, request]);

  useEffect(() => {
    let mounted = true;
    request('/settings/company-profile')
      .then((result) => {
        if (mounted) setCompanyProfile(result.company || null);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [request]);

  function handleLogout() {
    logout();
    navigate('/admin/login');
  }

  return (
    <aside className="enterprise-sidebar">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-card border border-sky-300/25 bg-sky-400/15">
            <Wrench className="h-5 w-5 text-[var(--brand)]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-black leading-tight">{displayCompany}</h2>
            <p className="text-sm font-bold text-sky-100">Service ERP</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 rounded-card border border-white/10 bg-white/[0.045] p-3 text-xs text-slate-300">
          <span className="inline-flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[var(--brand)]" />{displayLocation}</span>
          <span className="inline-flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-[var(--brand)]" />{displayPhone}</span>
          <span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-[var(--brand)]" />Sales, service, AMC & billing</span>
        </div>
      </div>

      <nav className="enterprise-sidebar-nav flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div className="enterprise-sidebar-group" key={group.title || 'dashboard'}>
            {group.title ? (
              <div className="enterprise-sidebar-heading">
                <span>{group.title}</span>
              </div>
            ) : null}
            <div className="space-y-1">
              {group.links.map((link) => <SidebarItem key={`${group.title}-${link.label}`} link={link} close={close} badge={badges[link.badgeKey]} />)}
            </div>
          </div>
        ))}
      </nav>

      <div className="enterprise-sidebar-footer border-t border-white/10 p-3">
        <div className="mb-3 flex items-center gap-3 rounded-card border border-white/10 bg-white/[0.045] p-3">
          <div className="grid h-9 w-9 place-items-center rounded-card bg-sky-400/15 text-sm font-black text-sky-100">
            {user?.name?.slice(0, 1) || 'A'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{user?.name || 'Admin User'}</p>
            <span className="admin-role-badge mt-1 inline-flex">{roleLabel(user?.role || 'admin')}</span>
          </div>
        </div>
        <button className="btn btn-secondary w-full justify-start" onClick={handleLogout}>
          <LogOut className="h-4 w-4 shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  );
}

function TechnicianSidebar({ close }) {
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
    return () => {
      mounted = false;
      window.removeEventListener('focus', loadTechnicianSidebarBadges);
      window.removeEventListener('us:billing-updated', loadTechnicianSidebarBadges);
    };
  }, [badgeKeySignature, location.pathname, location.search, request, user]);

  function handleLogout() {
    logout();
    navigate('/technician/login');
  }

  return (
    <aside className="enterprise-sidebar">
      <div className="border-b border-white/10 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-card border border-sky-300/25 bg-sky-400/15">
            <Wrench className="h-5 w-5 text-[var(--brand)]" />
          </span>
          <div className="min-w-0">
            <h2 className="text-lg font-black leading-tight">Universal Systems</h2>
            <p className="text-sm font-bold text-sky-100">Service ERP</p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 rounded-card border border-white/10 bg-white/[0.045] p-3 text-xs text-slate-300">
          <span className="inline-flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-[var(--brand)]" />Mettur Dam</span>
          <span className="inline-flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-[var(--brand)]" />{company.phones.join(' / ')}</span>
          <span className="inline-flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5 text-[var(--brand)]" />Sales, service, AMC & billing</span>
        </div>
      </div>

      <nav className="enterprise-sidebar-nav flex-1 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div className="enterprise-sidebar-group" key={group.title || 'dashboard'}>
            {group.title ? (
              <div className="enterprise-sidebar-heading">
                <span>{group.title}</span>
              </div>
            ) : null}
            <div className="space-y-1">
              {group.links.map((link) => <SidebarItem key={`${group.title}-${link.label}`} link={link} close={close} badge={badges[link.badgeKey]} />)}
            </div>
          </div>
        ))}
      </nav>

      <div className="enterprise-sidebar-footer border-t border-white/10 p-3">
        <div className="mb-3 flex items-center gap-3 rounded-card border border-white/10 bg-white/[0.045] p-3">
          <div className="grid h-9 w-9 place-items-center rounded-card bg-sky-400/15 text-sm font-black text-sky-100">
            {user?.name?.slice(0, 1) || 'T'}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{user?.name || 'Technician'}</p>
            <span className="admin-role-badge mt-1 inline-flex">{roleLabel(user?.role || 'technician')}</span>
          </div>
        </div>
        <button className="btn btn-secondary w-full justify-start" onClick={handleLogout}>
          <LogOut className="h-4 w-4 shrink-0" />
          Logout
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
  const base = isTechnician ? '/tech' : '/admin';
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
      const normalizedRows = rows.map((item) => normalizeNotification(item, role));
      setNotifications(normalizedRows);
      setUnreadCount(remoteRows.length ? finiteNumber(data.unreadCount ?? unreadNotificationCount(normalizedRows)) : unreadNotificationCount(normalizedRows));
    } catch {
      const fallbackRows = (normalizeRole(role) === 'technician' ? [] : fallbackNotificationRows()).map((item) => normalizeNotification(item, role));
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
        {unreadCount ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">{unreadCount}</span> : null}
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
                  navigate(normalizeRole(role) === 'technician' ? '/tech/dashboard' : '/admin/notifications');
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
              <div className="grid h-8 w-8 place-items-center rounded-card bg-sky-400/15 text-xs font-black text-sky-100">{user?.name?.slice(0, 1) || 'A'}</div>
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
  const { themePreference, resolvedTheme } = useThemePreference();
  const shellThemeClass = resolvedTheme === 'light' ? 'theme-light' : 'theme-dark';
  const shellThemeProps = {
    'data-theme-preference': themePreference,
    'data-theme': resolvedTheme,
    style: { colorScheme: resolvedTheme }
  };

  if (role === 'admin') {
    const allowed = canOpenAdminPath(location.pathname, user || role);
    const auditOnly = location.pathname.startsWith('/admin/audit-logs');
    return (
      <div className={`app-shell admin-shell min-h-screen bg-[var(--bg)] ${shellThemeClass}`} {...shellThemeProps}>
        <div className="fixed inset-y-0 left-0 z-40 hidden w-[292px] xl:block">
          <AdminSidebar />
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
      <div className="fixed inset-y-0 left-0 z-40 hidden w-[292px] xl:block">
        <TechnicianSidebar />
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
