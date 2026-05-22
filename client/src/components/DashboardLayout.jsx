import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Bell,
  BookOpenCheck,
  Boxes,
  CreditCard,
  FileCheck2,
  Activity,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  MoreHorizontal,
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
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { company } from '../utils/constants.js';
import { currency } from '../utils/format.js';
import { getCustomerDisplayId, getInvoiceDisplayId, getPaymentDisplayId, getWorkOrderDisplayId } from '../shared/idHelpers.js';
import { adminWorkspaceRoles, can, canAny, canAccessRoles, normalizeRole, roleLabel } from '../utils/roles.js';

const fullAccessRoles = ['admin'];

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
      { to: '/admin/technician-panel', label: 'Staff / Technicians', icon: UserRound, permission: 'manage_users' },
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: Activity, permission: 'view_audit_logs' },
      { to: '/admin/settings', label: 'Settings', icon: Settings, permission: 'view_settings' }
    ]
  }
];

const technicianGroups = [
  {
    title: '',
    links: [{ to: '/technician/dashboard', label: 'Dashboard', icon: LayoutDashboard }]
  },
  {
    title: 'Operations',
    links: [
      { to: '/tech/bookings', label: 'Bookings', icon: BookOpenCheck },
      { to: '/tech/work-orders', label: 'Work Orders', icon: Wrench }
    ]
  },
  {
    title: 'Customers',
    links: [{ to: '/tech/customers', label: 'Customers', icon: Users }]
  },
  {
    title: 'Sales & Billing',
    links: [
      { to: '/tech/invoices', label: 'Invoices', icon: ReceiptText },
      { to: '/tech/payments', label: 'Payments', icon: CreditCard }
    ]
  },
  {
    title: 'AMC & Warranty',
    links: [{ to: '/tech/amc-contracts', label: 'AMC Contracts', icon: FileCheck2 }]
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
  { prefix: '/admin/audit-logs', permission: 'view_audit_logs' },
  { prefix: '/admin/settings', permission: 'view_settings' }
];

function canSeeLink(link, role) {
  if (link.permission) return can(role, link.permission);
  return !link.roles || canAccessRoles(role, link.roles);
}

function visibleAdminGroups(role) {
  return adminGroups
    .map((group) => ({ ...group, links: group.links.filter((link) => canSeeLink(link, role)) }))
    .filter((group) => group.links.length);
}

function canOpenAdminPath(pathname, role) {
  const match = adminRouteAccess.find((item) => pathname.startsWith(item.prefix));
  if (match?.permission) return can(role, match.permission);
  return match ? canAccessRoles(role, match.roles) : canAccessRoles(role, fullAccessRoles);
}

function canUseGlobalSearch(role) {
  return normalizeRole(role) === 'technician' || canAny(role, ['view_customers', 'view_bookings', 'view_work_orders', 'view_invoices', 'view_payments', 'view_inventory']);
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
    amcRenewals: { value: amcRenewalBadgeCountFromDashboard(dashboardData), tone: stats.expiredAmcContracts > 0 ? 'red' : 'orange' }
  };
}

function notificationTarget(item, role) {
  const normalizedRole = normalizeRole(role);
  const base = normalizedRole === 'technician' ? '/tech' : '/admin';
  const id = item?.sourceId || '';
  const text = `${item?.type || ''} ${item?.title || ''} ${item?.message || ''}`.toLowerCase();
  if (text.includes('low stock') || text.includes('stock')) return '/admin/parts';
  if (text.includes('payment')) return `${base}/payments`;
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
  const groups = visibleAdminGroups(user?.role);
  const badges = buildSidebarBadges(dashboardData);

  useEffect(() => {
    let mounted = true;
    async function loadSidebarBadges() {
      const [metricsData, paymentRows] = await Promise.all([
        request('/dashboard/metrics').catch(() => null),
        loadPaymentRowsForPaymentsBadge(request).catch(() => null)
      ]);
      if (!mounted) return;
      const paymentBadgePatch = { paymentsBadgeCount: paymentsBadgeCountFromRows(paymentRows) };
      setDashboardData(metricsData ? { ...metricsData, ...paymentBadgePatch } : paymentBadgePatch);
    }

    loadSidebarBadges();
    window.addEventListener('focus', loadSidebarBadges);
    window.addEventListener('us:billing-updated', loadSidebarBadges);
    return () => {
      mounted = false;
      window.removeEventListener('focus', loadSidebarBadges);
      window.removeEventListener('us:billing-updated', loadSidebarBadges);
    };
  }, [location.pathname, location.search, request]);

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
        {technicianGroups.map((group) => (
          <div className="enterprise-sidebar-group" key={group.title || 'dashboard'}>
            {group.title ? (
              <div className="enterprise-sidebar-heading">
                <span>{group.title}</span>
              </div>
            ) : null}
            <div className="space-y-1">
              {group.links.map((link) => <SidebarItem key={`${group.title}-${link.label}`} link={link} close={close} />)}
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

function GlobalSearch({ role }) {
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
    if (value.length < 2 || !canUseGlobalSearch(role)) {
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
          items: (customers.customers || []).map((customer) => ({
            title: customer.name || getCustomerDisplayId(customer) || 'Customer',
            meta: [getCustomerDisplayId(customer), customer.phone].filter(Boolean).join(' - '),
            to: `${base}/customers/${customer.id || customer._id}`
          }))
        },
        {
          label: 'Bookings',
          items: (bookings.bookings || []).map((booking) => ({
            title: booking.bookingCode || 'Booking',
            meta: [booking.customerName, booking.phone, booking.serviceType || booking.device].filter(Boolean).join(' - '),
            to: `${base}/bookings`
          }))
        },
        {
          label: 'Work Orders',
          items: (workOrders.workOrders || workOrders.data || []).map((order) => ({
            title: getWorkOrderDisplayId(order),
            meta: [order.customerId?.name || order.customerName, order.serviceType || order.device, order.status].filter(Boolean).join(' - '),
            to: `${base}/work-orders/${order.id || order._id}`
          }))
        },
        {
          label: 'Invoices',
          items: (invoices.invoices || []).map((invoice) => ({
            title: getInvoiceDisplayId(invoice),
            meta: [invoice.customerId?.name || invoice.customerName, invoice.status, currency(invoice.total ?? invoice.totalAmount)].filter(Boolean).join(' - '),
            to: `${base}/invoices`
          }))
        },
        {
          label: 'Payments',
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
          items: (inventory.parts || []).map((part) => ({
            title: part.partName || part.sku || 'Part',
            meta: [part.sku, part.category, `${Number(part.available || 0)} available`].filter(Boolean).join(' - '),
            to: '/admin/parts'
          }))
        }
      ].filter((group) => !isTechnician || group.label !== 'Products / Parts').map((group) => ({ ...group, items: group.items.slice(0, 5) })).filter((group) => group.items.length);
      setResultGroups(groups);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [debouncedQuery, role]);

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
      className="relative w-full max-w-xl"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        openResult(firstResult());
      }}
    >
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 muted" />
      <input
        type="search"
        className="input h-11 pl-9 pr-10"
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
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
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
    await Promise.all(unread.map((item) => request(`/notifications/${item.id}/read`, { method: 'PATCH' }).catch(() => null)));
    loadNotifications();
  }

  async function markRead(item) {
    if (!item.read) {
      await request(`/notifications/${item.id}/read`, { method: 'PATCH' }).catch(() => null);
      setNotifications((current) => current.map((row) => (row.id === item.id ? { ...row, read: true } : row)));
      setUnreadCount((count) => Math.max(0, count - 1));
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
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
            <div>
              <h2 className="text-base font-black">Notification Center</h2>
              <p className="mt-1 text-xs muted">Low stock, bookings, payments, service jobs, and reminders.</p>
            </div>
            <button type="button" className="btn btn-secondary px-3 py-2 text-xs" onClick={markAllRead} disabled={!unreadCount}>Mark all read</button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-3">
            {loading ? (
              <div className="grid min-h-28 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[var(--brand)]" /></div>
            ) : notifications.length ? notifications.map((item) => {
              const priority = priorityForNotification(item);
              return (
                <button key={item.id} type="button" className={`mb-3 block w-full rounded-card border p-3 text-left transition hover:border-sky-300/45 hover:bg-sky-400/10 ${item.read ? 'border-white/10 bg-white/[0.035]' : 'border-sky-300/25 bg-sky-400/10'}`} onClick={() => openNotification(item)}>
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold">{item.title}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${priority === 'Critical' ? 'bg-rose-500/20 text-rose-100' : priority === 'High' ? 'bg-amber-400/20 text-amber-100' : 'bg-sky-400/15 text-sky-100'}`}>{priority}</span>
                  </div>
                  <p className="mt-1 text-sm muted">{item.message}</p>
                  <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                    <span className="muted">{item.read ? 'Read' : 'Unread'}</span>
                    {!item.read ? (
                      <span className="font-black text-sky-100" onClick={(event) => {
                        event.stopPropagation();
                        markRead(item);
                      }}>Mark as read</span>
                    ) : null}
                  </div>
                </button>
              );
            }) : (
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
  const [quickOpen, setQuickOpen] = useState(false);
  const userRole = user?.role || role;
  const isTechnician = normalizeRole(userRole) === 'technician';
  const quickActions = (isTechnician ? [
    { to: '/tech/bookings', label: 'Bookings', icon: BookOpenCheck, primary: true },
    { to: '/tech/work-orders', label: 'Work Orders', icon: Wrench },
    { to: '/tech/payments', label: 'Payments', icon: CreditCard }
  ] : [
    { to: '/admin/bookings', label: 'Booking', icon: BookOpenCheck, permission: 'create_booking', primary: true },
    { to: '/admin/work-orders', label: 'Service Job', icon: Wrench, permission: 'create_work_order' },
    { to: '/admin/payments', label: 'Payment', icon: CreditCard, permission: 'record_payment' }
  ]).filter((item) => canSeeLink(item, userRole));

  return (
    <header className="enterprise-topbar">
      <div className="flex min-h-16 flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button className="icon-button enterprise-top-icon h-11 w-11 xl:hidden" onClick={openSidebar} aria-label={`Open ${isTechnician ? 'technician' : 'admin'} menu`}>
            <Menu className="h-5 w-5" />
          </button>
          <GlobalSearch role={userRole} />
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
          <div className="hidden items-center gap-2 md:flex">
            {quickActions.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink key={item.to} className={`btn ${item.primary ? 'btn-primary glow-action' : 'btn-secondary'}`} to={item.to}>
                  <Icon className="h-4 w-4" />{item.label}
                </NavLink>
              );
            })}
          </div>
          {quickActions.length ? (
            <div className="relative md:hidden">
              <button className="icon-button enterprise-top-icon h-11 w-11" type="button" onClick={() => setQuickOpen((value) => !value)} aria-label="Open quick actions">
                <MoreHorizontal className="h-5 w-5" />
              </button>
              {quickOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-48 rounded-card border border-[var(--line)] bg-[#071426] p-2 shadow-2xl">
                  {quickActions.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink key={item.to} className="flex items-center gap-2 rounded-card px-3 py-2 text-sm font-bold text-slate-200 hover:bg-sky-400/10" to={item.to} onClick={() => setQuickOpen(false)}>
                        <Icon className="h-4 w-4" />{item.label}
                      </NavLink>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
          <NotificationCenter role={userRole} />
          <div className="hidden items-center gap-3 rounded-card border border-white/10 bg-white/[0.045] px-3 py-2.5 sm:flex">
            <div className="grid h-8 w-8 place-items-center rounded-card bg-sky-400/15 text-xs font-black text-sky-100">{user?.name?.slice(0, 1) || 'A'}</div>
            <div className="min-w-0">
              <p className="max-w-36 truncate text-sm font-bold">{user?.name || 'Admin User'}</p>
              <span className="admin-role-badge mt-1 inline-flex">{roleLabel(userRole)}</span>
            </div>
          </div>
          <a href="/" className="btn btn-secondary sm:shrink-0">
            <Wrench className="h-4 w-4" />
            Website
          </a>
        </div>
      </div>
    </header>
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

  if (role === 'admin') {
    const allowed = canOpenAdminPath(location.pathname, user?.role || role);
    const auditOnly = location.pathname.startsWith('/admin/audit-logs');
    return (
      <div className="min-h-screen bg-[var(--bg)]">
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
    <div className="technician-shell min-h-screen bg-[var(--bg)]">
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
        <Outlet />
      </main>
    </div>
  );
}
