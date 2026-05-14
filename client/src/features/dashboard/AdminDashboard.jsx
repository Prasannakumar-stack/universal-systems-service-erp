import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, CalendarClock, CheckCircle2, ClipboardList, CreditCard, FileText, Loader2, PackagePlus, Plus, ReceiptText, UserRound, Wrench } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { EmptyState, PageHeader } from '../../components/Ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { currency, formatDate, statusTone } from '../../utils/format.js';

function useResource(load, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const reload = useCallback(async (options = {}) => {
    if (!options.silent) setLoading(true);
    setError('');
    try {
      setData(await load());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, deps);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}

function LoadingBlock() {
  return (
    <div className="grid gap-4">
      <div className="surface animate-pulse p-5">
        <div className="h-4 w-36 rounded bg-white/10" />
        <div className="mt-4 h-8 w-64 max-w-full rounded bg-white/10" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="surface animate-pulse p-5">
            <div className="h-10 w-10 rounded-card bg-white/10" />
            <div className="mt-4 h-7 w-20 rounded bg-white/10" />
            <div className="mt-3 h-3 w-28 rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorBlock({ message }) {
  return <EmptyState title="Unable to load this view" message={message ? 'Please retry or check your access permission.' : 'Please retry or check your access permission.'} />;
}

function StatusBadge({ status }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusTone(status)}`}>{status}</span>;
}

function bookingSourceValue(record) {
  const raw = String(record?.source || record?.bookingSource || record?.channel || record?.intakeSource || record?.leadSource || record?.bookingId?.bookingSource || record?.bookingId?.source || '').trim().toLowerCase();
  if (!raw) return 'Walk-in';
  if (raw.includes('call')) return 'Call';
  if (raw.includes('website') || raw.includes('web') || raw.includes('online')) return 'Website';
  if (raw.includes('walk') || raw.includes('shop') || raw.includes('manual')) return 'Walk-in Shop';
  return raw.replace(/\b\w/g, (char) => char.toUpperCase());
}

function BookingSourceBadge({ source }) {
  const label = bookingSourceValue({ bookingSource: source });
  const tone = {
    Call: 'booking-source-badge-call',
    'Walk-in Shop': 'booking-source-badge-shop',
    'Walk-in': 'booking-source-badge-shop',
    Website: 'booking-source-badge-website',
    Unknown: 'booking-source-badge-unknown'
  }[label] || 'booking-source-badge-unknown';
  return <span className={`booking-source-badge ${tone}`}>{label}</span>;
}

function recordId(record) {
  if (typeof record === 'string') return record;
  return record?.id || record?._id || '';
}

function invoiceDueAmount(invoice) {
  const total = Number(invoice?.total || invoice?.totalAmount || 0);
  const paid = Number(invoice?.paid || invoice?.paidAmount || 0);
  const amount = invoice?.balance
    ?? invoice?.balanceAmount
    ?? invoice?.due
    ?? invoice?.dueAmount
    ?? invoice?.remainingAmount
    ?? Math.max(0, total - paid);
  const value = Number(amount);
  return Number.isFinite(value) ? value : 0;
}

function isSameDay(value, day = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  return date.getFullYear() === day.getFullYear() && date.getMonth() === day.getMonth() && date.getDate() === day.getDate();
}

function buildSevenDaySeries(bookings = [], payments = []) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    date.setHours(0, 0, 0, 0);
    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
      bookings: 0,
      revenue: 0
    };
  });
  const byKey = new Map(days.map((day) => [day.key, day]));
  bookings.forEach((booking) => {
    const key = new Date(booking.createdAt).toISOString().slice(0, 10);
    if (byKey.has(key)) byKey.get(key).bookings += 1;
  });
  payments.forEach((payment) => {
    const key = new Date(payment.createdAt).toISOString().slice(0, 10);
    if (byKey.has(key)) byKey.get(key).revenue += Number(payment.paidAmount || payment.amount || 0);
  });
  return days;
}

function SmartMetricCard({ icon: Icon, label, value, tone, to, helper, glow = false }) {
  const numericValue = Number(value || 0);
  const displayValue = typeof value === 'string' ? value : numericValue;
  const toneClass = {
    red: 'dashboard-kpi-red',
    yellow: 'dashboard-kpi-yellow',
    blue: 'dashboard-kpi-blue',
    green: 'dashboard-kpi-green'
  }[tone] || 'border-sky-300/35 bg-sky-400/10 text-sky-100';
  const iconClass = {
    red: 'text-rose-300',
    yellow: 'text-amber-200',
    blue: 'text-sky-200',
    green: 'text-emerald-200'
  }[tone] || 'text-sky-200';

  return (
    <Link to={to} className={`dashboard-kpi-card lift-card ${toneClass} ${glow && numericValue > 0 ? 'dashboard-kpi-alert' : ''}`}>
      <div className="flex h-full items-start justify-between gap-4">
        <div className="dashboard-kpi-copy min-w-0">
          <p className="dashboard-kpi-title text-xs font-black uppercase text-slate-300">{label}</p>
          <p className="dashboard-kpi-value mt-3 text-3xl font-black text-white">{displayValue}</p>
          <p className={`dashboard-kpi-helper mt-2 text-sm font-semibold ${numericValue === 0 && typeof value !== 'string' ? 'text-emerald-200' : 'muted'}`}>
            {helper || (typeof value !== 'string' && numericValue === 0 ? 'All good' : 'Open details')}
          </p>
        </div>
        <span className="dashboard-kpi-icon">
          <Icon className={`h-5 w-5 ${iconClass}`} />
        </span>
      </div>
    </Link>
  );
}

function PriorityAlerts({ alerts = [] }) {
  const toneClass = {
    critical: 'dashboard-alert-critical',
    warning: 'dashboard-alert-warning',
    info: 'dashboard-alert-info'
  };

  return (
    <div className="dashboard-panel dashboard-priority-panel p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Priority Alerts</h2>
          <p className="mt-1 text-sm muted">Critical stock, overdue work, and payment risk in one clear queue.</p>
        </div>
        <span className="dashboard-panel-icon"><AlertTriangle className="h-5 w-5 text-[var(--warning)]" /></span>
      </div>
      <div className="dashboard-alert-grid">
        {alerts.length ? alerts.map((alert) => (
          <Link key={`${alert.level}-${alert.title}`} to={alert.to} className={`dashboard-alert-row alert-link ${toneClass[alert.level]}`}>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="dashboard-severity-badge">{alert.level}</span>
                <span className="font-black">{alert.title}</span>
              </div>
              <p className="mt-1 text-sm opacity-80">{alert.message}</p>
            </div>
            <span className="dashboard-count-badge">{alert.count}</span>
            <span className="dashboard-action-pill">{alert.action || 'View'}</span>
          </Link>
        )) : <EmptyState title="No priority alerts" message="Inventory, jobs, and payments are clear." />}
      </div>
    </div>
  );
}

function DashboardPanel({ title, icon: Icon, action, children, className = '' }) {
  return (
    <section className={`dashboard-panel p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-black">{title}</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          {Icon ? <span className="dashboard-panel-icon"><Icon className="h-5 w-5 text-[var(--brand)]" /></span> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function DashboardEmpty({ title, message }) {
  return (
    <div className="dashboard-empty-state">
      <AlertTriangle className="mx-auto mb-2 h-4 w-4 text-[var(--brand)]" />
      <p className="font-black">{title}</p>
      <p className="mt-1 text-sm muted">{message}</p>
    </div>
  );
}

function TechnicianWorkloadBars({ technicians = [] }) {
  const maxJobs = Math.max(1, ...technicians.map((tech) => Number(tech.activeJobs || 0)));

  return (
    <div className="dashboard-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-black">Technician Workload</h2>
        <Link className="btn btn-secondary py-2" to="/admin/reports/technicians">Report</Link>
      </div>
      <div className="mt-4 grid gap-4">
        {technicians.length ? technicians.map((tech) => {
          const percent = Math.min(100, Math.round((Number(tech.activeJobs || 0) / maxJobs) * 100));
          return (
            <div key={tech.id} className="dashboard-workload-row">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="truncate font-bold">{tech.name}</span>
                <span className="text-xs muted">{tech.activeJobs} active</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-300 transition-all" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        }) : <DashboardEmpty title="No technician workload" message="Assigned jobs will show here." />}
      </div>
    </div>
  );
}

function RevenueOverviewCard({ chartData = [], monthlyRevenue = 0 }) {
  const totalRevenue = chartData.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
  const bestDay = chartData.reduce((best, item) => Number(item.revenue || 0) > Number(best.revenue || 0) ? item : best, chartData[0] || { label: '-', revenue: 0 });

  return (
    <DashboardPanel title="Revenue Overview" icon={ReceiptText} action={<Link className="dashboard-card-action" to="/admin/reports/finance">Report</Link>} className="dashboard-revenue-card">
      <div className="dashboard-chart-shell">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid stroke="rgba(117,196,255,0.1)" vertical={false} />
            <XAxis dataKey="label" stroke="#aebfd7" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip formatter={(value) => currency(value)} contentStyle={{ background: '#071426', border: '1px solid rgba(117,196,255,0.25)', borderRadius: 10, color: '#fff' }} />
            <Bar dataKey="revenue" fill="#75c4ff" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="dashboard-card-footer">
        <div>
          <p className="text-xs muted">This month</p>
          <p className="font-black text-emerald-100">{currency(monthlyRevenue)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs muted">Best day</p>
          <p className="font-black text-sky-100">{bestDay.label} - {currency(bestDay.revenue || 0)}</p>
        </div>
        <div className="text-right">
          <p className="text-xs muted">7-day total</p>
          <p className="font-black text-white">{currency(totalRevenue)}</p>
        </div>
      </div>
    </DashboardPanel>
  );
}

function ActivityFeedPanel({ notifications = [], reminders = [] }) {
  const items = [
    ...notifications.map((item) => ({ ...item, feedType: 'Notification', feedDate: item.createdAt })),
    ...reminders.map((item) => ({ ...item, feedType: 'Reminder', feedDate: item.createdAt }))
  ].sort((a, b) => new Date(b.feedDate || 0) - new Date(a.feedDate || 0)).slice(0, 8);

  return (
    <DashboardPanel title="Activity Feed" icon={Bell} action={<Link className="dashboard-card-action" to="/admin/dashboard">Live</Link>} className="dashboard-activity-card">
      <div className="dashboard-timeline-list">
        {items.length ? items.map((item) => (
          <div key={`${item.feedType}-${item.id || item._id || item.title}`} className="dashboard-timeline-item">
            <span className="dashboard-timeline-dot"><Bell className="h-3.5 w-3.5" /></span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="status-badge">{item.feedType}</span>
                  {item.priority ? <span className="dashboard-soft-badge">{item.priority}</span> : null}
                </div>
                <p className="mt-2 truncate font-black">{item.title}</p>
                <p className="dashboard-feed-message mt-1 text-sm muted">{item.message}</p>
              </div>
              <p className="shrink-0 text-xs muted">{formatDate(item.feedDate)}</p>
            </div>
            </div>
          </div>
        )) : <DashboardEmpty title="No activity yet" message="Notifications and reminders will appear here." />}
      </div>
    </DashboardPanel>
  );
}

const emptyDashboardData = {
  success: true,
  metrics: {
    todaysBookings: 0,
    pendingServiceJobs: 0,
    jobsInProgress: 0,
    completedToday: 0,
    pendingPayments: 0,
    lowStockItems: 0,
    activeAmcContracts: 0,
    monthlyRevenue: 0
  },
  alerts: {
    outOfStockItems: 0,
    overdueJobs: 0,
    lowStockItems: 0,
    pendingPayments: 0
  },
  stats: {
    todayBookings: 0,
    pendingJobs: 0,
    unassignedJobs: 0,
    awaitingPartsJobs: 0,
    inProgressJobs: 0,
    completedJobs: 0,
    paymentsOverdue: 0,
    lowStockCritical: 0,
    activeAmcContracts: 0,
    amcRenewalsDue: 0,
    amcVisitsThisWeek: 0,
    pendingPayments: 0
  },
  recentBookings: [],
  repairQueue: [],
  pendingPaymentsList: [],
  technicianWorkload: [],
  notifications: [],
  reminders: [],
  revenueOverview: []
};

function normalizeDashboardMetrics(payload = {}) {
  const activityFeed = payload.activityFeed || [];
  const notifications = activityFeed.filter((item) => item.feedType === 'Notification');
  const reminders = activityFeed.filter((item) => item.feedType === 'Reminder');
  const metrics = { ...emptyDashboardData.metrics, ...(payload.metrics || {}) };
  const alerts = { ...emptyDashboardData.alerts, ...(payload.alerts || {}) };
  const stats = {
    ...emptyDashboardData.stats,
    ...(payload.stats || {}),
    todayBookings: metrics.todaysBookings,
    pendingJobs: metrics.pendingServiceJobs,
    inProgressJobs: metrics.jobsInProgress,
    pendingPayments: metrics.pendingPayments,
    lowStockCritical: alerts.outOfStockItems,
    activeAmcContracts: metrics.activeAmcContracts
  };

  return {
    ...emptyDashboardData,
    ...payload,
    metrics,
    alerts,
    stats,
    recentBookings: payload.recentBookings || [],
    repairQueue: payload.repairQueue || [],
    pendingPaymentsList: payload.pendingPaymentsList || [],
    technicianWorkload: payload.technicianWorkload || [],
    notifications,
    reminders,
    revenueOverview: payload.revenueOverview || []
  };
}

export function AdminDashboard() {
  const { request } = useAuth();
  const [lastUpdated, setLastUpdated] = useState(null);
  const loadDashboard = useCallback(async () => {
    return normalizeDashboardMetrics(await request('/dashboard/metrics'));
  }, [request]);
  const { data, loading, error, reload } = useResource(loadDashboard, [loadDashboard]);
  const dashboardData = data || emptyDashboardData;
  const chartData = dashboardData.revenueOverview || [];
  const completedToday = Number(dashboardData.metrics?.completedToday || 0);
  const monthlyRevenue = Number(dashboardData.metrics?.monthlyRevenue || 0);
  const pendingPaymentInvoices = dashboardData.pendingPaymentsList || [];
  const activeWorkOrders = dashboardData.repairQueue || [];
  const amcRenewalsDue = Number(dashboardData.stats?.amcRenewalsDue || 0) || (dashboardData.reminders || []).filter((item) => `${item.title || ''} ${item.message || ''}`.toLowerCase().includes('amc')).length;
  const alerts = useMemo(() => {
    if (!dashboardData) return [];
    return [
      { level: 'critical', title: 'Out of stock items', count: Number(dashboardData.alerts?.outOfStockItems || 0), message: 'Stock is at zero and needs immediate refill.', to: '/admin/parts', action: 'View Stock' },
      { level: 'critical', title: 'Overdue jobs', count: Number(dashboardData.alerts?.overdueJobs || 0), message: 'Jobs have not moved in more than 24 hours.', to: '/admin/work-orders', action: 'View Jobs' },
      { level: 'warning', title: 'Low stock', count: Number(dashboardData.alerts?.lowStockItems || 0), message: 'Parts are close to their low stock limit.', to: '/admin/parts', action: 'View Stock' },
      { level: 'warning', title: 'Pending payments', count: Number(dashboardData.alerts?.pendingPayments || 0), message: 'Invoices still have balance due.', to: '/admin/payments', action: 'View Payments' }
    ];
  }, [dashboardData]);

  useEffect(() => {
    if (data) setLastUpdated(new Date());
  }, [data]);

  useEffect(() => {
    const timer = setInterval(() => reload({ silent: true }), 90000);
    return () => clearInterval(timer);
  }, [reload]);

  if (loading) return <LoadingBlock />;

  return (
    <div className="admin-dashboard-page">
      <PageHeader
        title="Admin Dashboard"
        eyebrow="Smart Service Command"
        action={(
          <div className="quick-actions flex flex-wrap justify-start gap-2 md:justify-end">
            <Link className="btn btn-primary glow-action" to="/admin/bookings"><Plus className="h-4 w-4" />Booking</Link>
            <Link className="btn btn-secondary" to="/admin/work-orders"><Plus className="h-4 w-4" />Service Job</Link>
            <Link className="btn btn-secondary" to="/admin/technician-panel"><UserRound className="h-4 w-4" />Technician Panel</Link>
            <Link className="btn btn-secondary" to="/admin/stock-movements"><PackagePlus className="h-4 w-4" />Add Stock</Link>
            <Link className="btn btn-secondary" to="/admin/payments"><CreditCard className="h-4 w-4" />Record Payment</Link>
          </div>
        )}
      >
        Action-ready view of overdue work, billing, stock health, bookings, and technician load.
        {lastUpdated ? <span className="mt-1 block text-xs">Last updated: {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span> : null}
      </PageHeader>
      {error ? (
        <div className="surface mb-5 border border-amber-300/25 bg-amber-400/10 p-3 text-sm font-semibold text-amber-100">
          Dashboard metrics are temporarily unavailable. Showing the current dashboard shell while the next refresh retries.
        </div>
      ) : null}
      <div className="dashboard-kpi-grid">
        <SmartMetricCard icon={CalendarClock} label="Today's Bookings" value={dashboardData.stats.todayBookings} helper="New intake today" tone="blue" to="/admin/bookings" />
        <SmartMetricCard icon={ClipboardList} label="Pending Service Jobs" value={dashboardData.stats.pendingJobs} helper={`${dashboardData.stats.unassignedJobs || 0} unassigned`} tone="yellow" to="/admin/work-orders" />
        <SmartMetricCard icon={Wrench} label="Jobs In Progress" value={dashboardData.stats.inProgressJobs} helper={`${dashboardData.stats.awaitingPartsJobs || 0} awaiting parts`} tone="blue" to="/admin/work-orders" />
        <SmartMetricCard icon={CheckCircle2} label="Completed Today" value={completedToday} helper={`${dashboardData.stats.completedJobs || 0} completed total`} tone="green" to="/admin/work-orders" />
        <SmartMetricCard icon={CreditCard} label="Pending Payments" value={dashboardData.stats.pendingPayments || dashboardData.metrics.pendingPayments || 0} helper={`${dashboardData.stats.paymentsOverdue || 0} overdue`} tone="yellow" glow to="/admin/payments" />
        <SmartMetricCard icon={AlertTriangle} label="Low Stock Items" value={dashboardData.metrics.lowStockItems || 0} helper={`${dashboardData.alerts.outOfStockItems || 0} out of stock`} tone="red" glow to="/admin/parts" />
        <SmartMetricCard icon={FileText} label="Active AMC Contracts" value={dashboardData.stats.activeAmcContracts || 0} helper={`${amcRenewalsDue} renewals due, ${dashboardData.stats.amcVisitsThisWeek || 0} visits this week`} tone="green" to="/admin/amc-contracts" />
        <SmartMetricCard icon={ReceiptText} label="Monthly Revenue" value={currency(monthlyRevenue)} helper="Collected this month" tone="green" to="/admin/reports/finance" />
      </div>
      <div className="dashboard-priority-block">
        <PriorityAlerts alerts={alerts} />
      </div>
      <div className="dashboard-main-grid">
        <DashboardPanel title="Recent Bookings" icon={CalendarClock} action={<Link className="dashboard-card-action" to="/admin/bookings">View All</Link>} className="dashboard-list-card">
          <div className="grid gap-3">
            {dashboardData.recentBookings?.length ? dashboardData.recentBookings.slice(0, 6).map((booking) => {
              const source = booking.source || booking.bookingSource || booking.channel || 'Walk-in';
              return (
                <div key={booking.id} className="dashboard-row-card">
                  <div className="min-w-0">
                    {booking.customerId ? (
                      <Link className="truncate font-black text-sky-100 hover:text-[var(--brand)]" to={`/admin/customers/${recordId(booking.customerId)}`}>{booking.customerName}</Link>
                    ) : <p className="truncate font-black">{booking.customerName}</p>}
                    <p className="mt-1 truncate text-sm muted">{booking.bookingCode || booking.id} - {booking.serviceType || booking.device}</p>
                    <p className="mt-0.5 truncate text-xs muted">{booking.device} - {formatDate(booking.createdAt || booking.updatedAt)}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <BookingSourceBadge source={source} />
                    {booking.status ? <StatusBadge status={booking.status} /> : null}
                  </div>
                </div>
              );
            }) : <DashboardEmpty title="No new bookings" message="Fresh bookings will appear here as they arrive." />}
          </div>
        </DashboardPanel>
        <DashboardPanel title="Repair & Service Queue" icon={Wrench} action={<Link className="dashboard-card-action" to="/admin/work-orders">View All</Link>} className="dashboard-list-card">
          <div className="grid gap-3">
            {activeWorkOrders.length ? activeWorkOrders.map((order) => (
              <Link key={order.id} to={`/admin/work-orders/${order.id}`} className="dashboard-row-card alert-link">
                <div className="min-w-0">
                  <p className="truncate font-black">{order.customerId?.name || order.customerName || 'Customer'}</p>
                  <p className="mt-1 truncate text-sm muted">{order.serviceType || 'Service'} - {order.device}</p>
                  <p className="mt-0.5 truncate text-xs muted">{order.technicianId?.name || 'Unassigned'}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <StatusBadge status={order.status} />
                  {order.priority ? <span className="dashboard-soft-badge">{order.priority}</span> : null}
                </div>
              </Link>
            )) : <DashboardEmpty title="No active service jobs" message="The repair queue is clear." />}
          </div>
        </DashboardPanel>
        <DashboardPanel title="Pending Payments" icon={CreditCard} action={<Link className="dashboard-card-action" to="/admin/payments">View All</Link>} className="dashboard-list-card">
          <div className="grid gap-3">
            {pendingPaymentInvoices.length ? pendingPaymentInvoices.slice(0, 6).map((invoice) => (
              <Link key={invoice.id || invoice._id} to={`/admin/payments?invoiceId=${invoice.id || invoice._id}`} className="dashboard-row-card alert-link">
                <div className="min-w-0">
                  <p className="truncate font-black">{invoice.invoiceNumber}</p>
                  <p className="mt-1 truncate text-sm muted">{invoice.customerId?.name || invoice.customerName || 'Customer'}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className="text-lg font-black text-amber-100">{currency(invoiceDueAmount(invoice))}</span>
                  <StatusBadge status={invoice.status || 'Pending'} />
                </div>
              </Link>
            )) : <DashboardEmpty title="No pending payments" message="All balances are currently clear." />}
          </div>
        </DashboardPanel>
        <TechnicianWorkloadBars technicians={dashboardData.technicianWorkload || []} />
        <ActivityFeedPanel notifications={dashboardData.notifications || []} reminders={dashboardData.reminders || []} />
        <RevenueOverviewCard chartData={chartData} monthlyRevenue={monthlyRevenue} />
      </div>
    </div>
  );
}
