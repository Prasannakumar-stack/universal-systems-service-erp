import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, CalendarClock, CheckCircle2, ClipboardList, CreditCard, FileText, Plus, ReceiptText, UserRound, Wrench, Zap, ArrowUpRight } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../context/AuthContext.jsx';
import { currency, formatDate, statusTone } from '../../utils/format.js';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071426]';
const panelActionClass = `rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-sky-400 transition-colors hover:bg-white/10 hover:text-sky-300 ${focusRing}`;
const heroSecondaryActionClass = `inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/10 ${focusRing}`;

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
    <div className="grid gap-6 p-6">
      <div className="animate-pulse rounded-3xl border border-white/5 bg-[#0b172a] p-8">
        <div className="h-6 w-48 rounded-md bg-white/10" />
        <div className="mt-4 h-4 w-96 rounded-md bg-white/5 max-w-full" />
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        {[1, 2, 3, 4, 5].map((item) => (
          <div key={item} className="animate-pulse rounded-2xl border border-white/5 bg-[#0b172a] p-5">
            <div className="flex items-start justify-between">
              <div className="h-4 w-24 rounded bg-white/10" />
              <div className="h-10 w-10 rounded-xl bg-white/5" />
            </div>
            <div className="mt-4 h-8 w-16 rounded bg-white/10" />
            <div className="mt-4 h-3 w-32 rounded bg-white/5 max-w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  return <span className={`inline-flex max-w-[9rem] items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusTone(status)}`}>{status}</span>;
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
  const tailwindTones = {
    Call: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
    'Walk-in Shop': 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    'Walk-in': 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    Website: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
    Unknown: 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
  };
  const twTone = tailwindTones[label] || tailwindTones.Unknown;
  return <span className={`inline-flex max-w-[9rem] items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${twTone}`}>{label}</span>;
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

function SmartMetricCard({ icon: Icon, label, value, tone, to, helper, glow = false }) {
  const numericValue = Number(value || 0);
  const displayValue = typeof value === 'string' ? value : numericValue;
  const valueClassName = typeof value === 'string'
    ? 'mt-2 max-w-full whitespace-nowrap text-[1.05rem] leading-tight sm:text-xl xl:text-[1.25rem] 2xl:text-[1.4rem]'
    : 'mt-2 truncate text-2xl sm:text-3xl';

  const tones = {
    red: 'from-rose-500/10 to-rose-900/20 border-rose-500/20 group-hover:border-rose-400/50 group-hover:shadow-[0_0_20px_rgba(225,29,72,0.15)]',
    yellow: 'from-amber-500/10 to-amber-900/20 border-amber-500/20 group-hover:border-amber-400/50 group-hover:shadow-[0_0_20px_rgba(217,119,6,0.15)]',
    blue: 'from-sky-500/10 to-sky-900/20 border-sky-500/20 group-hover:border-sky-400/50 group-hover:shadow-[0_0_20px_rgba(14,165,233,0.15)]',
    green: 'from-emerald-500/10 to-emerald-900/20 border-emerald-500/20 group-hover:border-emerald-400/50 group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]',
  };

  const iconBgTones = {
    red: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
    yellow: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    blue: 'bg-sky-500/10 text-sky-400 border border-sky-500/20',
    green: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  };

  const selectedTone = tones[tone] || tones.blue;
  const selectedIconBg = iconBgTones[tone] || iconBgTones.blue;

  return (
    <Link to={to} className={`group relative flex h-full min-h-[152px] flex-col overflow-hidden rounded-2xl border bg-gradient-to-br ${selectedTone} p-5 transition-all duration-300 hover:-translate-y-0.5 ${glow && numericValue > 0 ? 'ring-1 ring-white/10' : ''} ${focusRing}`}>
      <div className="flex flex-1 flex-col justify-between">
        <div className="flex items-start justify-between">
          <div className="min-w-0 pr-3">
            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400/90">{label}</p>
            <p className={`${valueClassName} font-black tracking-tight text-white`} title={String(displayValue)}>{displayValue}</p>
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selectedIconBg}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between">
          <p className={`min-w-0 truncate pr-2 text-xs font-semibold ${numericValue === 0 && typeof value !== 'string' ? 'text-emerald-400' : 'text-slate-400'}`} title={helper}>
            {helper || (typeof value !== 'string' && numericValue === 0 ? 'All clear' : 'View details')}
          </p>
          <ArrowUpRight className="h-4 w-4 text-slate-500 opacity-0 transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-white group-hover:opacity-100" />
        </div>
      </div>
    </Link>
  );
}

function PriorityAlerts({ alerts = [] }) {
  const visibleAlerts = alerts.filter((alert) => Number(alert.count || 0) > 0);
  const tones = {
    critical: 'border-rose-500/30 bg-rose-500/5',
    warning: 'border-amber-500/30 bg-amber-500/5',
    info: 'border-sky-500/30 bg-sky-500/5'
  };

  const badgeTones = {
    critical: 'bg-rose-500/20 text-rose-300 border-rose-500/20',
    warning: 'bg-amber-500/20 text-amber-300 border-amber-500/20',
    info: 'bg-sky-500/20 text-sky-300 border-sky-500/20'
  };

  return (
    <div className="rounded-3xl border border-white/5 bg-[#0b172a] p-6 shadow-xl lg:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white">Priority Alerts</h2>
          <p className="mt-1 text-sm font-medium text-slate-400">Critical stock, overdue work, and payment risk in one clear queue.</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="h-6 w-6 text-amber-400" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {visibleAlerts.length ? visibleAlerts.map((alert) => (
          <Link key={`${alert.level}-${alert.title}`} to={alert.to} className={`group flex min-h-[150px] flex-col justify-between rounded-2xl border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.5)] ${tones[alert.level]} ${focusRing}`}>
            <div>
              <div className="flex items-center justify-between">
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest ${badgeTones[alert.level]}`}>{alert.level}</span>
                <span className="flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-white/10 px-2.5 text-xs font-black text-white shadow-inner">{alert.count}</span>
              </div>
              <p className="mt-4 font-bold text-white transition-colors group-hover:text-sky-400">{alert.title}</p>
              <p className="mt-1.5 text-xs font-medium text-slate-400 line-clamp-2">{alert.message}</p>
            </div>
            <div className="mt-5 flex items-center text-xs font-bold text-slate-300 transition-colors group-hover:text-white">
              <span className="rounded-lg bg-white/5 px-3 py-1.5">{alert.action || 'View'}</span>
            </div>
          </Link>
        )) : (
          <div className="sm:col-span-2 lg:col-span-4">
            <DashboardEmpty title="No priority alerts" message="Critical stock, overdue jobs, and payment risks will appear here." compact />
          </div>
        )}
      </div>
    </div>
  );
}

function DashboardPanel({ title, icon: Icon, action, children, className = '' }) {
  return (
    <section className={`flex flex-col rounded-3xl border border-white/5 bg-[#0b172a] p-5 shadow-xl lg:p-6 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <h2 className="flex items-center gap-2.5 text-lg font-black tracking-tight text-white">
          {Icon && <Icon className="h-5 w-5 text-sky-400" />}
          {title}
        </h2>
        {action}
      </div>
      <div className="flex-1">
        {children}
      </div>
    </section>
  );
}

function DashboardEmpty({ title, message, compact = false }) {
  return (
    <div className={`flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-center backdrop-blur-sm ${compact ? 'min-h-0 p-3 sm:p-4' : 'h-full p-8'}`}>
      <div className={`${compact ? 'mb-2 h-8 w-8' : 'mb-3 h-12 w-12'} flex items-center justify-center rounded-full bg-white/5`}>
        <AlertTriangle className={`${compact ? 'h-4 w-4' : 'h-5 w-5'} text-slate-400`} />
      </div>
      <p className="text-sm font-bold text-slate-200">{title}</p>
      <p className="mt-1 max-w-[200px] text-xs font-medium text-slate-400">{message}</p>
    </div>
  );
}

function MetaRow({ items = [] }) {
  const visibleItems = items
    .map((item) => (typeof item === 'object' ? item : { value: item }))
    .filter((item) => item.value !== null && item.value !== undefined && String(item.value).trim() !== '');

  if (!visibleItems.length) return null;

  return (
    <p className="mt-1.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">
      {visibleItems.map((item, index) => (
        <span key={`${item.value}-${index}`} className="inline-flex min-w-0 items-center gap-1.5">
          {index > 0 && <span className="shrink-0 text-slate-600">·</span>}
          <span className={`truncate ${item.className || 'max-w-[120px]'}`}>{item.value}</span>
        </span>
      ))}
    </p>
  );
}

function TechnicianWorkloadBars({ technicians = [] }) {
  const maxJobs = Math.max(1, ...technicians.map((tech) => Number(tech.activeJobs || 0)));

  return (
    <DashboardPanel title="Technician Workload" icon={UserRound} action={<Link className={panelActionClass} to="/admin/reports/technicians">Report</Link>}>
      <div className="grid gap-6">
        {technicians.length ? technicians.map((tech) => {
          const percent = Math.min(100, Math.round((Number(tech.activeJobs || 0) / maxJobs) * 100));
          return (
            <div key={tech.id} className="group">
              <div className="mb-2.5 flex min-w-0 items-center justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-bold text-slate-200" title={tech.name}>{tech.name}</span>
                <span className="rounded-md bg-white/5 px-2 py-0.5 text-xs font-bold text-slate-400">{tech.activeJobs} active</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800/50 shadow-inner">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-400 transition-all duration-1000 group-hover:shadow-[0_0_10px_rgba(56,189,248,0.5)]" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        }) : <DashboardEmpty title="No workload" message="Assigned jobs will show here." />}
      </div>
    </DashboardPanel>
  );
}

function RevenueOverviewCard({ chartData = [], monthlyRevenue = 0 }) {
  const totalRevenue = chartData.reduce((sum, item) => sum + Number(item.revenue || 0), 0);
  const bestDay = chartData.reduce((best, item) => Number(item.revenue || 0) > Number(best.revenue || 0) ? item : best, chartData[0] || { label: '-', revenue: 0 });
  const hasData = totalRevenue > 0;
  const monthlyRevenueLabel = currency(monthlyRevenue);
  const totalRevenueLabel = currency(totalRevenue);
  const bestDayRevenueLabel = currency(bestDay.revenue || 0);

  return (
    <DashboardPanel title="Revenue Overview" icon={Zap} action={<Link className={`rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-emerald-400 transition-colors hover:bg-white/10 hover:text-emerald-300 ${focusRing}`} to="/admin/reports/finance">Report</Link>} className="col-span-1 self-start xl:col-span-2">
      <div className={`${hasData ? 'mb-4 sm:mb-6' : 'mb-3'} grid gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 sm:grid-cols-3 sm:gap-4 sm:p-5`}>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">This Month</p>
          <p className="mt-1 truncate text-xl font-black text-emerald-400 sm:text-2xl" title={monthlyRevenueLabel}>{monthlyRevenueLabel}</p>
        </div>
        <div className="min-w-0 border-t border-white/10 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">7-Day Total</p>
          <p className="mt-1 truncate text-xl font-black text-white sm:text-2xl" title={totalRevenueLabel}>{totalRevenueLabel}</p>
        </div>
        <div className="min-w-0 border-t border-white/10 pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Best Day ({bestDay.label})</p>
          <p className="mt-1 truncate text-xl font-black text-sky-400 sm:text-2xl" title={bestDayRevenueLabel}>{bestDayRevenueLabel}</p>
        </div>
      </div>
      {hasData ? (
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={11} fontWeight={600} tickLine={false} axisLine={false} tickFormatter={(val) => val > 0 ? `₹${val}` : ''} />
              <Tooltip
                formatter={(value) => currency(value)}
                contentStyle={{ background: '#0b172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', color: '#fff', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
              />
              <Bar dataKey="revenue" fill="url(#colorRevenue)" radius={[8, 8, 0, 0]} />
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={1}/>
                  <stop offset="100%" stopColor="#0284c7" stopOpacity={0.6}/>
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex items-center justify-center">
          <DashboardEmpty title="No revenue activity this week" message="Revenue trends will appear after payments are recorded." compact />
        </div>
      )}
    </DashboardPanel>
  );
}

function ActivityFeedPanel({ notifications = [], reminders = [] }) {
  const rawItems = [
    ...notifications.map((item) => ({ ...item, feedType: 'Notification', feedDate: item.createdAt })),
    ...reminders.map((item) => ({ ...item, feedType: 'Reminder', feedDate: item.createdAt }))
  ]
    .filter((item) => item.title || item.message)
    .sort((a, b) => new Date(b.feedDate || 0) - new Date(a.feedDate || 0));

  const uniqueItems = [];
  const seenStock = new Set();
  for (const item of rawItems) {
    const stockText = `${item.title || ''} ${item.message || ''}`.toLowerCase();
    if (stockText.includes('stock')) {
      const key = stockText.replace(/\b\d+(\.\d+)?\b/g, '#').replace(/\s+/g, ' ').trim();
      if (seenStock.has(key)) continue;
      seenStock.add(key);
    }
    uniqueItems.push(item);
  }
  const items = uniqueItems.slice(0, 5);

  return (
    <DashboardPanel title="Activity Feed" icon={Bell} action={<Link className={panelActionClass} to="/admin/dashboard">Live</Link>}>
      <div className="relative max-h-[330px] space-y-5 overflow-y-auto pl-8 pr-4 [scrollbar-color:rgba(148,163,184,0.28)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-600/30 [&::-webkit-scrollbar-track]:bg-transparent">
        <span className="pointer-events-none absolute bottom-0 left-[7px] top-0 w-px bg-white/10" />
        {items.length ? items.map((item, idx) => (
          <div key={`${item.feedType}-${item.id || item._id || item.title || idx}`} className="relative group">
            <span className="absolute -left-[31px] top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#0b172a] border border-sky-400/50 group-hover:border-sky-400 transition-colors">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400"></span>
            </span>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-slate-300">{item.feedType}</span>
                  {item.priority && <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-rose-400 border border-rose-500/20">{item.priority}</span>}
                </div>
                <p className="shrink-0 text-xs font-bold text-slate-500">{formatDate(item.feedDate)}</p>
              </div>
              <p className="mt-2 truncate text-sm font-bold text-white" title={item.title}>{item.title}</p>
              <p className="mt-1 text-xs font-medium text-slate-400 line-clamp-2">{item.message}</p>
            </div>
          </div>
        )) : <DashboardEmpty title="No activity" message="Events will appear here." />}
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

  if (loading) return <div className="mx-auto max-w-[1920px] p-4 lg:p-8"><LoadingBlock /></div>;

  return (
    <div className="mx-auto max-w-[1920px] p-4 space-y-6 pb-12 sm:p-6 lg:p-8">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b172a]/80 p-6 shadow-2xl backdrop-blur-xl lg:p-10">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-emerald-500/5" />
        <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-sky-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">Dashboard</h1>
            <p className="mt-3 text-sm font-medium text-slate-400 sm:text-base">Today's business overview, service activity, and priority alerts.</p>
            {lastUpdated && (
              <p className="mt-4 flex items-center gap-2 text-xs font-bold text-slate-500">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                LIVE UPDATED: {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link className={`inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all hover:-translate-y-0.5 hover:bg-sky-400 hover:shadow-[0_0_25px_rgba(14,165,233,0.45)] ${focusRing}`} to="/admin/bookings">
              <Plus className="h-4 w-4" /> New Booking
            </Link>
            <Link className={heroSecondaryActionClass} to="/admin/work-orders">
              <Wrench className="h-4 w-4" /> New Work Order
            </Link>
            <Link className={heroSecondaryActionClass} to="/admin/payments">
              <CreditCard className="h-4 w-4" /> Record Payment
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5 backdrop-blur-md">
          <div className="flex items-center gap-3 text-amber-200">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-bold">Dashboard metrics are temporarily unavailable. Retrying soon.</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        <SmartMetricCard icon={CalendarClock} label="Today's Bookings" value={dashboardData.stats.todayBookings} helper="New intake today" tone="blue" to="/admin/bookings" />
        <SmartMetricCard icon={ClipboardList} label="Pending Service Jobs" value={dashboardData.stats.pendingJobs} helper={`${dashboardData.stats.unassignedJobs || 0} total unassigned`} tone="yellow" to="/admin/work-orders" />
        <SmartMetricCard icon={AlertTriangle} label="Urgent Jobs" value={dashboardData.stats.urgentActiveJobs || dashboardData.alerts?.urgentActiveJobs || 0} helper="Active jobs marked Urgent" tone="red" glow to="/admin/work-orders?priority=Urgent" />
        <SmartMetricCard icon={Wrench} label="Jobs In Progress" value={dashboardData.stats.inProgressJobs} helper={`${dashboardData.stats.awaitingPartsJobs || 0} awaiting parts`} tone="blue" to="/admin/work-orders" />
        <SmartMetricCard icon={CheckCircle2} label="Completed Today" value={completedToday} helper={`${dashboardData.stats.completedJobs || 0} completed total`} tone="green" to="/admin/work-orders" />
        <SmartMetricCard icon={CreditCard} label="Pending Payments" value={dashboardData.stats.pendingPayments || dashboardData.metrics.pendingPayments || 0} helper={`${dashboardData.stats.paymentsOverdue || 0} overdue`} tone="yellow" glow to="/admin/payments" />
        <SmartMetricCard icon={AlertTriangle} label="Low Stock Items" value={dashboardData.metrics.lowStockItems || 0} helper={`${dashboardData.alerts.outOfStockItems || 0} out of stock`} tone="red" glow to="/admin/parts" />
        <SmartMetricCard icon={FileText} label="Active AMC Contracts" value={dashboardData.stats.activeAmcContracts || 0} helper={`${amcRenewalsDue} renewals due`} tone="green" to="/admin/amc-contracts" />
        <SmartMetricCard icon={ReceiptText} label="Monthly Revenue" value={currency(monthlyRevenue)} helper="Collected this month" tone="green" to="/admin/reports/finance" />
      </div>

      {/* Priority Alerts */}
      <PriorityAlerts alerts={alerts} />

      {/* Main Grid: Lists & Charts */}
      <div className="grid gap-6 lg:gap-8 xl:grid-cols-3">
        <DashboardPanel title="Recent Bookings" icon={CalendarClock} action={<Link className={panelActionClass} to="/admin/bookings">View All</Link>}>
          <div className="grid gap-3">
            {dashboardData.recentBookings?.length ? dashboardData.recentBookings.slice(0, 6).map((booking) => {
              const source = booking.source || booking.bookingSource || booking.channel || 'Walk-in';
              return (
                <div key={booking.id} className="group flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 transition-all duration-300 hover:bg-white/10 hover:shadow-lg">
                  <div className="min-w-0 flex-1">
                    {booking.customerId ? (
                      <Link className={`block truncate text-sm font-bold text-sky-400 transition-colors hover:text-sky-300 ${focusRing}`} to={`/admin/customers/${recordId(booking.customerId)}`} title={booking.customerName}>{booking.customerName}</Link>
                    ) : <p className="block truncate text-sm font-bold text-white" title={booking.customerName}>{booking.customerName}</p>}
                    <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-300">{booking.serviceType || 'Service'}{booking.device ? ` · ${booking.device}` : ''}</p>
                    <MetaRow items={[
                      { value: booking.bookingCode || booking.id, className: 'max-w-[92px]' },
                      { value: formatDate(booking.createdAt || booking.updatedAt), className: 'max-w-[120px]' }
                    ]} />
                  </div>
                  <div className="flex max-w-[9rem] shrink-0 flex-col items-end gap-2.5">
                    <BookingSourceBadge source={source} />
                    {booking.status && <StatusBadge status={booking.status} />}
                  </div>
                </div>
              );
            }) : <DashboardEmpty title="No new bookings" message="New bookings will appear here once created." />}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Service Queue" icon={Wrench} action={<Link className={panelActionClass} to="/admin/work-orders">View All</Link>}>
          <div className="grid gap-3">
            {activeWorkOrders.length ? activeWorkOrders.slice(0, 6).map((order) => (
              <Link key={order.id} to={`/admin/work-orders/${order.id}`} className={`group flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 transition-all duration-300 hover:border-sky-500/30 hover:bg-white/10 hover:shadow-lg ${focusRing}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white transition-colors group-hover:text-sky-400" title={order.customerId?.name || order.customerName || 'Customer'}>{order.customerId?.name || order.customerName || 'Customer'}</p>
                  <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-300">{order.serviceType || 'Service'}{order.device ? ` · ${order.device}` : ''}</p>
                  <MetaRow items={[
                    { value: order.id, className: 'max-w-[92px]' },
                    { value: `Tech: ${order.technicianId?.name || 'Unassigned'}`, className: 'max-w-[120px]' },
                    { value: formatDate(order.createdAt || order.updatedAt), className: 'max-w-[120px]' }
                  ]} />
                </div>
                <div className="flex max-w-[9rem] shrink-0 flex-col items-end gap-2.5">
                  <StatusBadge status={order.status} />
                  <span className={`max-w-full truncate rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${String(order.priority || 'Normal').toLowerCase() === 'urgent' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/20' : 'bg-slate-800 text-slate-300 border border-white/5'}`}>{order.priority || 'Normal'}</span>
                </div>
              </Link>
            )) : <DashboardEmpty title="No active service jobs" message="The repair queue is currently clear." />}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Pending Payments" icon={CreditCard} action={<Link className={panelActionClass} to="/admin/payments">View All</Link>}>
          <div className="grid gap-3">
            {pendingPaymentInvoices.length ? pendingPaymentInvoices.slice(0, 6).map((invoice) => (
              <Link key={invoice.id || invoice._id} to={`/admin/payments?invoiceId=${invoice.id || invoice._id}`} className={`group flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 transition-all duration-300 hover:border-amber-500/30 hover:bg-white/10 hover:shadow-lg ${focusRing}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white transition-colors group-hover:text-amber-400" title={invoice.invoiceNumber}>{invoice.invoiceNumber}</p>
                  <p className="mt-1.5 truncate text-xs font-medium text-slate-400" title={invoice.customerId?.name || invoice.customerName || 'Customer'}>{invoice.customerId?.name || invoice.customerName || 'Customer'}</p>
                </div>
                <div className="flex min-w-0 shrink-0 flex-col items-end gap-2">
                  <span className="max-w-[120px] truncate text-right text-lg font-black tracking-tight text-amber-400" title={currency(invoiceDueAmount(invoice))}>{currency(invoiceDueAmount(invoice))}</span>
                  <StatusBadge status={invoice.status || 'Pending'} />
                </div>
              </Link>
            )) : <DashboardEmpty title="No pending payments" message="Payments will appear here after invoices are unpaid." />}
          </div>
        </DashboardPanel>

        <RevenueOverviewCard chartData={chartData} monthlyRevenue={monthlyRevenue} />
        <div className="flex flex-col gap-6 lg:gap-8 xl:col-span-1">
          <TechnicianWorkloadBars technicians={dashboardData.technicianWorkload || []} />
          <ActivityFeedPanel notifications={dashboardData.notifications || []} reminders={dashboardData.reminders || []} />
        </div>
      </div>
    </div>
  );
}
