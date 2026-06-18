import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Bell, Boxes, CalendarClock, CheckCircle2, ClipboardList, CreditCard, FileText, Plus, ReceiptText, UserRound, Wrench, ArrowUpRight } from 'lucide-react';
import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../context/AuthContext.jsx';
import { technicianNameOrAdmin } from '../../utils/assignment.js';
import { formatDate, statusTone } from '../../utils/format.js';
import { can } from '../../utils/roles.js';

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071426]';
const panelActionClass = `rounded-lg bg-white/5 px-3 py-1.5 text-xs font-bold text-sky-400 transition-colors hover:bg-white/10 hover:text-sky-300 ${focusRing}`;
const heroSecondaryActionClass = `inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-white/10 ${focusRing}`;
const dashboardCurrencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
});
const dashboardPeriods = [
  { id: 'today', label: 'Today' },
  { id: '7d', label: '7 Days' },
  { id: 'month', label: 'This Month' }
];
const quickActionItems = [
  { label: 'New Booking', to: '/app/admin/bookings', icon: CalendarClock, color: '#38bdf8', rgb: '56, 189, 248' },
  { label: 'New Work Order', to: '/app/admin/work-orders', icon: Wrench, color: '#22d3ee', rgb: '34, 211, 238' },
  { label: 'Add Customer', to: '/app/admin/customers', icon: UserRound, color: '#34d399', rgb: '52, 211, 153' },
  { label: 'Add Product', to: '/app/admin/parts', icon: Boxes, color: '#a78bfa', rgb: '167, 139, 250' },
  { label: 'Create Invoice', to: '/app/admin/invoices', icon: ReceiptText, color: '#fb923c', rgb: '251, 146, 60' },
  { label: 'Reports', to: '/app/admin/reports', icon: FileText, color: '#60a5fa', rgb: '96, 165, 250' }
];

function dashboardCurrency(value) {
  const amount = Number(value || 0);
  return dashboardCurrencyFormatter.format(Number.isFinite(amount) ? amount : 0);
}

function dashboardAxisCurrency(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return '';
  if (amount >= 100000) {
    const lakhs = amount / 100000;
    return `${Number.isInteger(lakhs) ? lakhs : lakhs.toFixed(1)}L`;
  }
  if (amount >= 1000) {
    const thousands = amount / 1000;
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
  }
  return String(Math.round(amount));
}

function dashboardSeriesTotal(rows, key) {
  return (rows || []).reduce((sum, row) => {
    const value = Number(row?.[key] || 0);
    return sum + (Number.isFinite(value) ? value : 0);
  }, 0);
}

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function dashboardPeriodRange(period) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = startOfDay(end);
  if (period === '7d') start.setDate(start.getDate() - 6);
  if (period === 'month') start.setDate(1);
  return { start, end };
}

function parseDashboardDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const raw = String(value).trim();
  const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const parsed = dateOnly
    ? new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]))
    : new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function dashboardRecordDate(record, fields) {
  for (const field of fields) {
    const parsed = parseDashboardDate(record?.[field]);
    if (parsed) return parsed;
  }
  return null;
}

function filterDashboardRecords(records, fields, period) {
  const { start, end } = dashboardPeriodRange(period);
  return (records || []).filter((record) => {
    const recordDate = dashboardRecordDate(record, fields);
    if (!recordDate) return true;
    return recordDate >= start && recordDate <= end;
  });
}

function filterDashboardRevenueRows(rows, period) {
  const chartRows = rows || [];
  if (!chartRows.length) return [];
  const datedRows = chartRows.map((row) => ({
    row,
    date: dashboardRecordDate(row, ['key', 'date', 'createdAt'])
  }));
  if (datedRows.some((item) => !item.date)) return chartRows;

  const { start, end } = dashboardPeriodRange(period);
  const filteredRows = datedRows
    .filter((item) => item.date >= start && item.date <= end)
    .map((item) => item.row);

  return filteredRows;
}

function dashboardPeriodMeta(period) {
  if (period === 'today') return { label: 'Selected Period', detail: 'Today' };
  if (period === 'month') return { label: 'Selected Period', detail: 'This Month' };
  return { label: 'Selected Period', detail: '7 Days' };
}

function DashboardPeriodFilter({ value, onChange }) {
  return (
    <div className="dashboard-period-filter" role="group" aria-label="Dashboard period">
      {dashboardPeriods.map((period) => (
        <button
          key={period.id}
          type="button"
          className={`dashboard-period-pill ${focusRing}`}
          data-active={value === period.id}
          aria-pressed={value === period.id}
          onClick={() => onChange(period.id)}
        >
          {period.label}
        </button>
      ))}
    </div>
  );
}

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
          {index > 0 && <span className="shrink-0 text-slate-600">Ã‚Â·</span>}
          <span className={`truncate ${item.className || 'max-w-[120px]'}`}>{item.value}</span>
        </span>
      ))}
    </p>
  );
}

function TechnicianWorkloadBars({ technicians = [] }) {
  const maxJobs = Math.max(1, ...technicians.map((tech) => Number(tech.activeJobs || 0)));

  return (
    <DashboardPanel title="Technician Workload" icon={UserRound} action={<Link className={panelActionClass} to="/app/admin/reports/technicians">Report</Link>}>
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

function QuickActionsCard() {
  return (
    <DashboardPanel title="Quick Actions" icon={Plus} className="dashboard-quick-actions-card">
      <div className="dashboard-quick-actions-grid">
        {quickActionItems.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              to={action.to}
              className={`dashboard-quick-action-tile ${focusRing}`}
              style={{ '--quick-action-color': action.color, '--quick-action-rgb': action.rgb }}
            >
              <span className="dashboard-quick-action-icon">
                <Icon className="h-4 w-4" />
              </span>
              <span className="dashboard-quick-action-label">{action.label}</span>
              <ArrowUpRight className="dashboard-quick-action-arrow h-3.5 w-3.5" />
            </Link>
          );
        })}
      </div>
    </DashboardPanel>
  );
}

function normalizeRevenueRows(rows = []) {
  return rows.map((item, index) => {
    const billed = Number(item?.billed || 0);
    const collected = Number(item?.collected || item?.revenue || 0);
    const key = item?.key || item?.date || item?.createdAt || `revenue-${index}`;
    return {
      ...item,
      key,
      label: item?.label || key || `Day ${index + 1}`,
      billed: Number.isFinite(billed) ? billed : 0,
      collected: Number.isFinite(collected) ? collected : 0,
      revenue: Number.isFinite(collected) ? collected : 0,
      balance: (Number.isFinite(billed) ? billed : 0) - (Number.isFinite(collected) ? collected : 0)
    };
  });
}

function revenueTrendPercent(rows = [], key = 'collected') {
  const comparableRows = rows.filter((item) => Number(item?.[key] || 0) > 0);
  if (comparableRows.length < 2) return null;
  const first = Number(comparableRows[0]?.[key] || 0);
  const last = Number(comparableRows[comparableRows.length - 1]?.[key] || 0);
  if (!first || !Number.isFinite(first) || !Number.isFinite(last)) return null;
  return ((last - first) / first) * 100;
}

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const billedItem = payload.find((item) => item.dataKey === 'billed');
  const collectedItem = payload.find((item) => item.dataKey === 'collected');
  const billed = Number(billedItem?.value || 0);
  const collected = Number(collectedItem?.value || 0);
  const balance = billed - collected;

  return (
    <div
      style={{
        background: '#061523',
        border: '1px solid rgba(103,232,249,0.22)',
        borderRadius: '14px',
        color: '#f8fafc',
        padding: '0.7rem 0.8rem',
        boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)'
      }}
    >
      <p style={{ margin: 0, color: '#e2e8f0', fontSize: '0.78rem', fontWeight: 900 }}>{label}</p>
      <div style={{ marginTop: '0.45rem', display: 'grid', gap: '0.28rem' }}>
        <p style={{ margin: 0, color: '#93c5fd', fontSize: '0.8rem', fontWeight: 900 }}>Billed: {dashboardCurrency(billed)}</p>
        <p style={{ margin: 0, color: '#67e8f9', fontSize: '0.8rem', fontWeight: 900 }}>Collected: {dashboardCurrency(collected)}</p>
        <p style={{ margin: 0, color: '#cbd5e1', fontSize: '0.78rem', fontWeight: 800 }}>Balance: {dashboardCurrency(balance)}</p>
      </div>
    </div>
  );
}

function RevenueOverviewCard({ chartData = [], monthlyCollection = 0, dashboardPeriod = '7d' }) {
  const safeChartData = Array.isArray(chartData) ? chartData : [];
  const totalBilled = dashboardSeriesTotal(safeChartData, 'billed');
  const totalCollected = dashboardSeriesTotal(safeChartData, 'collected');
  const balance = totalBilled - totalCollected;
  const hasRevenue = safeChartData.length > 0 && (totalBilled > 0 || totalCollected > 0);
  const maxRevenue = Math.max(1, ...safeChartData.map((item) => Math.max(Number(item.billed || 0), Number(item.collected || 0))));
  const trend = revenueTrendPercent(safeChartData, 'collected');
  const hasTrend = Number.isFinite(trend);
  const trendTone = !hasTrend ? 'neutral' : trend >= 0 ? 'positive' : 'negative';
  const trendLabel = hasTrend ? `${trend >= 0 ? '+' : ''}${trend.toFixed(Math.abs(trend) >= 10 ? 0 : 1)}%` : 'Trend pending';
  const selectedPeriodMeta = dashboardPeriodMeta(dashboardPeriod);

  return (
    <section className="dashboard-revenue-modern-card xl:col-span-2">
      <div className="dashboard-revenue-card-body relative z-10 flex flex-col gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="dashboard-revenue-icon">
                <ReceiptText className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200/75">Finance pulse</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight text-white">Revenue Overview</h2>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-400">Billed invoice value and collected payments for the selected dashboard period.</p>
          </div>
          <Link className={`dashboard-revenue-report-link ${focusRing}`} to="/app/admin/reports/finance">
            Report
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
          <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-sky-200">
            <span className="h-2.5 w-2.5 rounded-full bg-sky-300" />
            Billed
          </span>
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-cyan-200">
            <span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />
            Collected
          </span>
        </div>

        <div className="dashboard-revenue-summary-grid">
          <div className="dashboard-revenue-summary-item dashboard-revenue-summary-primary">
            <p>Collected This Month</p>
            <strong title={dashboardCurrency(monthlyCollection)}>{dashboardCurrency(monthlyCollection)}</strong>
            <span>real payments this calendar month</span>
          </div>
          <div className="dashboard-revenue-summary-item">
            <p>Billed</p>
            <strong title={dashboardCurrency(totalBilled)}>{dashboardCurrency(totalBilled)}</strong>
            <span>{selectedPeriodMeta.detail}</span>
          </div>
          <div className="dashboard-revenue-summary-item">
            <p>Collected</p>
            <strong title={dashboardCurrency(totalCollected)}>{dashboardCurrency(totalCollected)}</strong>
            <span>{selectedPeriodMeta.detail}</span>
          </div>
          <div className="dashboard-revenue-summary-item">
            <p>Balance</p>
            <strong className={balance > 0 ? 'text-amber-200' : balance < 0 ? 'text-cyan-200' : ''}>{dashboardCurrency(balance)}</strong>
            <span>{selectedPeriodMeta.detail}</span>
          </div>
          <div className="dashboard-revenue-summary-item">
            <p>Collection Trend</p>
            <strong className={`dashboard-revenue-trend dashboard-revenue-trend-${trendTone}`}>{trendLabel}</strong>
            <span>{hasTrend ? 'first to latest collected day' : 'needs two collection days'}</span>
          </div>
        </div>

        <div className="dashboard-revenue-chart-shell">
          {hasRevenue ? (
            <div className="dashboard-revenue-chart-inner">
              <div className="dashboard-revenue-css-bars" aria-hidden="true">
                {safeChartData.map((item) => {
                  const peakValue = Math.max(Number(item.billed || 0), Number(item.collected || 0));
                  const height = peakValue > 0 ? Math.max(8, Math.round((peakValue / maxRevenue) * 100)) : 0;
                  return (
                    <span key={item.key || item.label} className="dashboard-revenue-css-bar-track">
                      <span className="dashboard-revenue-css-bar" style={{ '--revenue-height': `${height}%` }} />
                    </span>
                  );
                })}
              </div>
              <ResponsiveContainer width="100%" height={252}>
                <ComposedChart data={safeChartData} margin={{ top: 16, right: 12, left: 0, bottom: 6 }}>
                  <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
                  <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} />
                  <YAxis width={48} stroke="#94a3b8" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} tickFormatter={dashboardAxisCurrency} />
                  <Tooltip
                    content={<RevenueTooltip />}
                    cursor={{ fill: 'rgba(103,232,249,0.07)' }}
                  />
                  <Bar dataKey="billed" name="Billed" fill="#60a5fa" stroke="#93c5fd" strokeWidth={1} radius={[10, 10, 4, 4]} barSize={22} maxBarSize={36} minPointSize={2} isAnimationActive={false} />
                  <Area type="monotone" dataKey="collected" name="Collected" fill="#22d3ee" fillOpacity={0.16} stroke="#67e8f9" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#67e8f9', stroke: '#083344', strokeWidth: 2 }} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="dashboard-revenue-empty-shell">
              <DashboardEmpty title="No billed or collected activity in the selected period." message="Revenue trends will appear here after invoices or payments are recorded for this period." compact />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ActivityFeedPanel({ notifications = [], reminders = [], className = '' }) {
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
    <DashboardPanel title="Activity Feed" icon={Bell} action={<Link className={panelActionClass} to="/app/admin/audit-logs">View All</Link>} className={className}>
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
        )) : <DashboardEmpty title="No activity in selected period" message="Events will appear here as work changes." />}
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
  const { request, user } = useAuth();
  const canCreateBooking = can(user, 'create_booking');
  const canCreateWorkOrder = can(user, 'create_work_order');
  const canRecordPayment = can(user, 'record_payment');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dashboardPeriod, setDashboardPeriod] = useState('7d');

  const loadDashboard = useCallback(async () => {
    return normalizeDashboardMetrics(await request('/dashboard/metrics'));
  }, [request]);

  const { data, loading, error, reload } = useResource(loadDashboard, [loadDashboard]);
  const dashboardData = data || emptyDashboardData;
  const completedToday = Number(dashboardData.metrics?.completedToday || 0);
  const monthlyCollection = Number(dashboardData.metrics?.monthlyRevenue || 0);
  const revenueRows = useMemo(
    () => normalizeRevenueRows(dashboardData.revenueOverview || []),
    [dashboardData.revenueOverview]
  );
  const filteredRevenueRows = useMemo(
    () => filterDashboardRevenueRows(revenueRows, dashboardPeriod),
    [revenueRows, dashboardPeriod]
  );
  const recentBookings = useMemo(
    () => filterDashboardRecords(dashboardData.recentBookings || [], ['createdAt', 'updatedAt'], dashboardPeriod),
    [dashboardData.recentBookings, dashboardPeriod]
  );
  const pendingPaymentInvoices = dashboardData.pendingPaymentsList || [];
  const activeWorkOrders = dashboardData.repairQueue || [];
  const periodNotifications = useMemo(
    () => filterDashboardRecords(dashboardData.notifications || [], ['feedDate', 'createdAt'], dashboardPeriod),
    [dashboardData.notifications, dashboardPeriod]
  );
  const periodReminders = useMemo(
    () => filterDashboardRecords(dashboardData.reminders || [], ['feedDate', 'createdAt'], dashboardPeriod),
    [dashboardData.reminders, dashboardPeriod]
  );
  const amcRenewalsDue = Number(dashboardData.stats?.amcRenewalsDue || 0) || (dashboardData.reminders || []).filter((item) => `${item.title || ''} ${item.message || ''}`.toLowerCase().includes('amc')).length;

  const alerts = useMemo(() => {
    if (!dashboardData) return [];
    // High overdue/pending numbers can come from local demo data; keep that note internal.
    return [
      { level: 'critical', title: 'Out of stock items', count: Number(dashboardData.alerts?.outOfStockItems || 0), message: 'Stock is at zero and needs immediate refill.', to: '/app/admin/parts', action: 'View Stock' },
      { level: 'critical', title: 'Overdue jobs', count: Number(dashboardData.alerts?.overdueJobs || 0), message: 'Jobs have not moved in more than 24 hours.', to: '/app/admin/work-orders', action: 'View Jobs' },
      { level: 'warning', title: 'Low stock', count: Number(dashboardData.alerts?.lowStockItems || 0), message: 'Parts are close to their low stock limit.', to: '/app/admin/parts', action: 'View Stock' },
      { level: 'warning', title: 'Pending payments', count: Number(dashboardData.alerts?.pendingPayments || 0), message: 'Invoices still have balance due.', to: '/app/admin/payments', action: 'View Payments' }
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
    <div className="admin-dashboard-page mx-auto max-w-[1920px] overflow-x-hidden p-4 space-y-6 pb-12 sm:p-6 lg:p-8">
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

          <div className="dashboard-header-controls flex flex-col items-start gap-3 sm:items-end">
            <DashboardPeriodFilter value={dashboardPeriod} onChange={setDashboardPeriod} />
            <div className="flex flex-wrap items-center gap-3">
              {canCreateBooking ? <Link className={`inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(14,165,233,0.3)] transition-all hover:-translate-y-0.5 hover:bg-sky-400 hover:shadow-[0_0_25px_rgba(14,165,233,0.45)] ${focusRing}`} to="/app/admin/bookings">
                <Plus className="h-4 w-4" /> New Booking
              </Link> : null}
              {canCreateWorkOrder ? <Link className={heroSecondaryActionClass} to="/app/admin/work-orders">
                <Wrench className="h-4 w-4" /> New Work Order
              </Link> : null}
              {canRecordPayment ? <Link className={heroSecondaryActionClass} to="/app/admin/payments">
                <CreditCard className="h-4 w-4" /> Record Payment
              </Link> : null}
            </div>
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
        <SmartMetricCard icon={CalendarClock} label="Today's Bookings" value={dashboardData.stats.todayBookings} helper="New intake today" tone="blue" to="/app/admin/bookings" />
        <SmartMetricCard icon={ClipboardList} label="Pending Service Jobs" value={dashboardData.stats.pendingJobs} helper={`${dashboardData.stats.unassignedJobs || 0} total unassigned`} tone="yellow" to="/app/admin/work-orders" />
        <SmartMetricCard icon={AlertTriangle} label="Urgent Jobs" value={dashboardData.stats.urgentActiveJobs || dashboardData.alerts?.urgentActiveJobs || 0} helper="Active jobs marked Urgent" tone="red" glow to="/app/admin/work-orders?priority=Urgent" />
        <SmartMetricCard icon={Wrench} label="Jobs In Progress" value={dashboardData.stats.inProgressJobs} helper={`${dashboardData.stats.awaitingPartsJobs || 0} awaiting parts`} tone="blue" to="/app/admin/work-orders" />
        <SmartMetricCard icon={CheckCircle2} label="Completed Today" value={completedToday} helper={`${dashboardData.stats.completedJobs || 0} completed total`} tone="green" to="/app/admin/work-orders" />
        <SmartMetricCard icon={CreditCard} label="Pending Payments" value={dashboardData.stats.pendingPayments || dashboardData.metrics.pendingPayments || 0} helper={`${dashboardData.stats.paymentsOverdue || 0} overdue`} tone="yellow" glow to="/app/admin/payments" />
        <SmartMetricCard icon={AlertTriangle} label="Low Stock Items" value={dashboardData.metrics.lowStockItems || 0} helper={`${dashboardData.alerts.outOfStockItems || 0} out of stock`} tone="red" glow to="/app/admin/parts" />
        <SmartMetricCard icon={FileText} label="Active AMC Contracts" value={dashboardData.stats.activeAmcContracts || 0} helper={`${amcRenewalsDue} renewals due`} tone="green" to="/app/admin/amc-contracts" />
        <SmartMetricCard icon={ReceiptText} label="Monthly Collection" value={dashboardCurrency(monthlyCollection)} helper="Collected this calendar month" tone="green" to="/app/admin/reports/finance" />
      </div>

      {/* Priority Alerts */}
      <PriorityAlerts alerts={alerts} />

      {/* Main Grid: Lists & Charts */}
      <div className="grid gap-x-6 gap-y-5 lg:gap-x-8 lg:gap-y-6 xl:grid-cols-3">
        <DashboardPanel title="Recent Bookings" icon={CalendarClock} action={<Link className={panelActionClass} to="/app/admin/bookings">View All</Link>}>
          <div className="grid gap-3">
            {recentBookings.length ? recentBookings.slice(0, 6).map((booking) => {
              const source = booking.source || booking.bookingSource || booking.channel || 'Walk-in';
              return (
                <div key={booking.id} className="group flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 transition-all duration-300 hover:bg-white/10 hover:shadow-lg">
                  <div className="min-w-0 flex-1">
                    {booking.customerId ? (
                      <Link className={`block truncate text-sm font-bold text-sky-400 transition-colors hover:text-sky-300 ${focusRing}`} to={`/app/admin/customers/${recordId(booking.customerId)}`} title={booking.customerName}>{booking.customerName}</Link>
                    ) : <p className="block truncate text-sm font-bold text-white" title={booking.customerName}>{booking.customerName}</p>}
                    <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-300">{booking.serviceType || 'Service'}{booking.device ? ` Ã‚Â· ${booking.device}` : ''}</p>
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
            }) : <DashboardEmpty title="No bookings in selected period" message="New bookings will appear here once created." />}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Service Queue" icon={Wrench} action={<Link className={panelActionClass} to="/app/admin/work-orders">View All</Link>}>
          <div className="grid gap-3">
            {activeWorkOrders.length ? activeWorkOrders.slice(0, 6).map((order) => (
              <Link key={order.id} to={`/app/admin/work-orders/${order.id}`} className={`group flex min-w-0 items-start justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 transition-all duration-300 hover:border-sky-500/30 hover:bg-white/10 hover:shadow-lg ${focusRing}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white transition-colors group-hover:text-sky-400" title={order.customerId?.name || order.customerName || 'Customer'}>{order.customerId?.name || order.customerName || 'Customer'}</p>
                  <p className="mt-1 line-clamp-2 text-xs font-medium text-slate-300">{order.serviceType || 'Service'}{order.device ? ` Ã‚Â· ${order.device}` : ''}</p>
                  <MetaRow items={[
                    { value: order.id, className: 'max-w-[92px]' },
                    { value: `Tech: ${technicianNameOrAdmin(order)}`, className: 'max-w-[120px]' },
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

        <DashboardPanel title="Pending Payments" icon={CreditCard} action={<Link className={panelActionClass} to="/app/admin/payments">View All</Link>}>
          <div className="grid gap-3">
            {pendingPaymentInvoices.length ? pendingPaymentInvoices.slice(0, 6).map((invoice) => (
              <Link key={invoice.id || invoice._id} to={`/app/admin/payments?invoiceId=${invoice.id || invoice._id}`} className={`group flex min-w-0 items-center justify-between gap-3 rounded-2xl border border-white/5 bg-white/5 p-4 transition-all duration-300 hover:border-amber-500/30 hover:bg-white/10 hover:shadow-lg ${focusRing}`}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white transition-colors group-hover:text-amber-400" title={invoice.invoiceNumber}>{invoice.invoiceNumber}</p>
                  <p className="mt-1.5 truncate text-xs font-medium text-slate-400" title={invoice.customerId?.name || invoice.customerName || 'Customer'}>{invoice.customerId?.name || invoice.customerName || 'Customer'}</p>
                </div>
                <div className="flex min-w-0 shrink-0 flex-col items-end gap-2">
                  <span className="max-w-[120px] truncate text-right text-lg font-black tracking-tight text-amber-400" title={dashboardCurrency(invoiceDueAmount(invoice))}>{dashboardCurrency(invoiceDueAmount(invoice))}</span>
                  <StatusBadge status={invoice.status || 'Pending'} />
                </div>
              </Link>
            )) : <DashboardEmpty title="No pending payments" message="Payments will appear here after invoices are unpaid." />}
          </div>
        </DashboardPanel>

        <RevenueOverviewCard chartData={filteredRevenueRows} monthlyCollection={monthlyCollection} dashboardPeriod={dashboardPeriod} />

        <TechnicianWorkloadBars technicians={dashboardData.technicianWorkload || []} />
        <ActivityFeedPanel notifications={periodNotifications} reminders={periodReminders} className="xl:col-span-2" />
        <QuickActionsCard />
      </div>
    </div>
  );
}
