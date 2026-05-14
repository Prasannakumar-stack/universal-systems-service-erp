import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Bell, BookOpenCheck, Boxes, CalendarClock, CheckCircle2, ClipboardList, CreditCard, Download, Edit3, FileText, KeyRound, Loader2, PackagePlus, PhoneCall as PhoneCallIcon, Plus, ReceiptText, Save, Send, ShieldCheck, Trash2, UserRound, Users, Wrench, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ConfirmModal, EmptyState, PageHeader, SearchBox, StatCard } from '../components/Ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { apiBase, company, serviceTypes } from '../utils/constants.js';
import { currency, formatDate, statusTone } from '../utils/format.js';

const workStatuses = ['Pending', 'In Progress', 'Awaiting Parts', 'Completed'];
const workOrderDetailStatuses = ['Pending', 'In Progress', 'Awaiting Parts', 'Completed', 'Delivered', 'Returned'];
const inventoryCategories = ['Laptop Parts', 'Desktop Parts', 'CCTV', 'Networking', 'Printer', 'Power Components', 'Memory', 'Storage', 'Accessories', 'Software / Service', 'Other'];
const quickStockSources = ['Purchase', 'Manual', 'Return', 'Correction'];
const bookingSources = ['Call', 'Walk-in Shop', 'Website'];
const deviceTypes = ['Laptop', 'Desktop PC', 'CCTV', 'Printer', 'Toner / Cartridge', 'Network Device', 'Solar / UPS / Battery / Inverter', 'Software / Installation', 'Other'];
const amcContractTypes = ['Basic AMC', 'Comprehensive AMC', 'CCTV AMC', 'Printer AMC', 'Networking AMC', 'Solar / UPS AMC', 'Custom'];
const amcFrequencies = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];
const assetBase = apiBase.replace(/\/api\/?$/, '');

function uploadedAssetUrl(url) {
  if (!url) return '#';
  if (/^https?:\/\//i.test(url)) return url;
  return `${assetBase}${url.startsWith('/') ? url : `/${url}`}`;
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

function AmcStatusBadge({ status }) {
  const tone = {
    Active: 'bg-emerald-400/15 text-emerald-100',
    Upcoming: 'bg-sky-400/15 text-sky-100',
    'Due Today': 'bg-amber-400/15 text-amber-100',
    Overdue: 'bg-rose-500/15 text-rose-100',
    Completed: 'bg-emerald-400/15 text-emerald-100',
    'Renewal Due': 'bg-amber-400/15 text-amber-100',
    Expired: 'bg-rose-500/15 text-rose-100',
    Cancelled: 'bg-slate-500/15 text-slate-100'
  }[status] || 'bg-slate-500/15 text-slate-100';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{status || '-'}</span>;
}

function Table({ children }) {
  return (
    <div className="table-wrap bg-[var(--surface)]">
      <table className="data-table">{children}</table>
    </div>
  );
}

async function preserveScroll(callback) {
  const x = window.scrollX;
  const y = window.scrollY;
  await callback();
  requestAnimationFrame(() => {
    window.scrollTo(x, y);
  });
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

function findInvoice(invoices = [], invoiceId = '') {
  return invoices.find((invoice) => invoice.id === invoiceId || invoice._id === invoiceId);
}

const workOrderPdfFlows = [
  {
    type: 'quotation',
    title: 'QUOTATION PDF',
    statusText: 'Pending',
    readyText: 'Available while the job is pending.',
    lockedText: 'Available when job status is Pending.',
    allowedStatuses: ['Pending'],
    filename: 'quotation.pdf'
  },
  {
    type: 'work',
    title: 'WORK PDF / INVOICE',
    statusText: 'Completed',
    readyText: 'Available after the job is completed.',
    lockedText: 'Complete the job before downloading invoice PDF.',
    allowedStatuses: ['Completed'],
    filename: 'invoice.pdf'
  },
  {
    type: 'service-completed',
    title: 'SERVICE COMPLETED PDF',
    statusText: 'Delivered',
    readyText: 'Available after the job is delivered.',
    lockedText: 'Available after job is delivered.',
    allowedStatuses: ['Delivered'],
    filename: 'service-completed.pdf'
  }
];

const workOrderTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'parts', label: 'Parts' },
  { id: 'partRequests', label: 'Part Requests' },
  { id: 'billing', label: 'Billing' },
  { id: 'documents', label: 'Documents' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'notes', label: 'Notes' }
];

const technicianWorkOrderTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'workUpdate', label: 'Checklist / Work Update' },
  { id: 'parts', label: 'Parts' },
  { id: 'partRequests', label: 'Part Requests' },
  { id: 'notes', label: 'Notes' },
  { id: 'photos', label: 'Photos' },
  { id: 'documents', label: 'Documents' }
];

const technicianAllowedStatuses = ['In Progress', 'Awaiting Parts', 'Completed', 'Returned'];
const technicianJobFilters = ['Today', 'All Assigned', 'Pending', 'In Progress', 'Awaiting Parts', 'Completed'];

const customerTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'devices', label: 'Devices / Assets' },
  { id: 'serviceHistory', label: 'Service History' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'payments', label: 'Payments' },
  { id: 'notes', label: 'Notes' },
  { id: 'timeline', label: 'Timeline' }
];

function pdfAllowed(flow, order) {
  if (!order) return false;
  return flow.allowedStatuses.includes(order.status);
}

function pdfLockedReason(flow, order) {
  if (flow.type === 'work' && order?.status !== 'Completed') return 'Complete the job before downloading invoice PDF';
  return flow.lockedText;
}

function getPdfLabel(pdfType) {
  if (pdfType === 'quotation') return 'Quotation PDF';
  if (pdfType === 'work') return 'Invoice PDF';
  if (pdfType === 'service-completed') return 'Service Completed PDF';
  return 'PDF';
}

function timelineIcon(item) {
  const text = `${item?.status || ''} ${item?.message || ''}`.toLowerCase();
  if (text.includes('part')) return 'Part';
  if (text.includes('note')) return 'Note';
  if (text.includes('invoice') || text.includes('payment')) return 'Bill';
  if (item?.status || text.includes('status')) return 'Status';
  return 'Log';
}

function bookingLabel(order) {
  return order?.bookingId?.bookingCode || `WO-${String(order?.id || order?._id || '').slice(-6).toUpperCase()}`;
}

function customerCode(customer) {
  return `US-CUST-${String(recordId(customer)).slice(-5).toUpperCase()}`;
}

function customerTypeLabel(customer) {
  return customer?.customerType || customer?.type || customer?.category || '';
}

function customerWhatsAppHref(customer) {
  const phone = String(customer?.phone || '').replace(/\D/g, '');
  const whatsappPhone = phone.startsWith('91') ? phone : `91${phone}`;
  const message = `Hello ${customer?.name || 'Customer'},\nThis is Universal Systems regarding your service request.`;
  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
}

function customerFromOrder(order) {
  return order?.customerId || {};
}

function customerPhone(order) {
  return customerFromOrder(order)?.phone || '';
}

function callHref(phone) {
  const cleanPhone = String(phone || '').replace(/[^\d+]/g, '');
  return cleanPhone ? `tel:${cleanPhone}` : '#';
}

function technicianWhatsAppHref(order) {
  const customer = customerFromOrder(order);
  const phone = String(customer?.phone || '').replace(/\D/g, '');
  const whatsappPhone = phone.startsWith('91') ? phone : `91${phone}`;
  const message = `Hello ${customer?.name || 'Customer'}, this is Universal Systems technician regarding your service job.`;
  return phone ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}` : '#';
}

function jobPriority(order) {
  if (order?.priority) return order.priority;
  if (order?.status === 'Awaiting Parts') return 'High';
  if (isTechnicianOverdueJob(order)) return 'High';
  return 'Normal';
}

function jobScheduleLabel(order) {
  const value = order?.scheduledAt || order?.scheduledDate || order?.appointmentDate || order?.createdAt;
  return value ? formatDate(value) : 'Not scheduled';
}

function isTechnicianTodayJob(order) {
  return isSameDay(order?.scheduledAt || order?.scheduledDate || order?.appointmentDate || order?.createdAt || order?.updatedAt);
}

function isTechnicianOverdueJob(order) {
  if (!order || ['Completed', 'Delivered', 'Returned'].includes(order.status)) return false;
  const reference = new Date(order.scheduledAt || order.scheduledDate || order.createdAt || order.updatedAt || Date.now());
  return Date.now() - reference.getTime() > 24 * 60 * 60 * 1000;
}

function deviceCategory(device = '') {
  const text = String(device).toLowerCase();
  if (text.includes('printer') || text.includes('toner') || text.includes('cartridge')) return 'Printer';
  if (text.includes('cctv') || text.includes('camera')) return 'CCTV';
  if (text.includes('network') || text.includes('router') || text.includes('lan')) return 'Networking';
  if (text.includes('solar') || text.includes('ups') || text.includes('battery') || text.includes('inverter')) return 'Solar / UPS / Inverter';
  if (text.includes('laptop') || text.includes('desktop') || text.includes('pc')) return 'PC / Laptop';
  return 'Other';
}

function isActiveJob(order) {
  return ['Pending', 'In Progress', 'Awaiting Parts'].includes(order?.status);
}

function isCompletedJob(order) {
  return ['Completed', 'Delivered', 'Returned'].includes(order?.status);
}

function latestDate(items = [], fields = ['completedAt', 'createdAt']) {
  const timestamps = items.flatMap((item) => fields.map((field) => item?.[field]).filter(Boolean)).map((value) => new Date(value).getTime()).filter(Number.isFinite);
  if (!timestamps.length) return '';
  return new Date(Math.max(...timestamps)).toISOString();
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

function DueStatusBadge({ invoice }) {
  const createdAt = invoice?.createdAt ? new Date(invoice.createdAt) : null;
  const isOverdue = createdAt && Number.isFinite(createdAt.getTime()) && Date.now() - createdAt.getTime() > 7 * 24 * 60 * 60 * 1000;
  if (isOverdue) return <span className="inline-flex rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-bold text-rose-100">Overdue</span>;
  return <StatusBadge status={invoice?.status || 'Pending'} />;
}

function DashboardChart({ title, children }) {
  return (
    <div className="surface lift-card p-5">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-4 h-72">{children}</div>
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

function InventoryStatusBadge({ part }) {
  const available = Number(part.available || 0);
  const lowLimit = Number(part.lowStockLimit || 0);
  if (available <= 0) return <span className="inline-flex rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-bold text-rose-200">Out of Stock</span>;
  if (available <= lowLimit) return <span className="inline-flex rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-bold text-amber-100">Low Stock</span>;
  return <span className="inline-flex rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-bold text-emerald-100">Available</span>;
}

function MovementTypeBadge({ type, quantity = 0 }) {
  const tone = type === 'ADJUST' && Number(quantity) < 0
    ? 'bg-rose-500/15 text-rose-100'
    : {
      ADD: 'bg-emerald-400/15 text-emerald-100',
      USED: 'bg-sky-400/15 text-sky-100',
      RETURN: 'bg-cyan-400/15 text-cyan-100',
      ADJUST: 'bg-amber-400/15 text-amber-100'
    }[type] || 'bg-rose-500/15 text-rose-100';
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{type}</span>;
}

function inventoryStockStatus(part) {
  const available = Number(part.available || 0);
  if (available <= 0) return 'out';
  if (available <= Number(part.lowStockLimit || 0)) return 'low';
  return 'in';
}

function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

function dateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

function amcWhatsappHref(contract) {
  const phone = String(contract?.phone || '').replace(/\D/g, '');
  const whatsappPhone = phone.startsWith('91') ? phone : `91${phone}`;
  const message = `Hello ${contract?.customerName || 'Customer'},\nThis is Universal Systems regarding your AMC renewal for ${contract?.contractType || 'your service contract'}.`;
  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
}

const reportSections = [
  { id: 'main', label: 'Business', to: '/admin/reports' },
  { id: 'technicians', label: 'Technician', to: '/admin/reports/technicians' },
  { id: 'inventory', label: 'Inventory', to: '/admin/reports/inventory' },
  { id: 'finance', label: 'Payments', to: '/admin/reports/finance' }
];

function normalizeReportSection(section = 'main') {
  if (section === 'payments') return 'finance';
  return reportSections.some((item) => item.id === section) ? section : 'main';
}

const reportRangeOptions = ['Today', 'Last 7 Days', 'This Month', 'Last Month', 'Custom Range'];

function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(value) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

function reportRangeBounds(range, customFrom = '', customTo = '') {
  const now = new Date();
  if (range === 'Today') return { from: startOfDay(now), to: endOfDay(now) };
  if (range === 'Last 7 Days') {
    const from = startOfDay(now);
    from.setDate(from.getDate() - 6);
    return { from, to: endOfDay(now) };
  }
  if (range === 'This Month') return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: endOfDay(now) };
  if (range === 'Last Month') return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)) };
  return {
    from: customFrom ? startOfDay(customFrom) : null,
    to: customTo ? endOfDay(customTo) : null
  };
}

function dateInRange(value, bounds) {
  if (!value) return false;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return false;
  if (bounds.from && time < bounds.from.getTime()) return false;
  if (bounds.to && time > bounds.to.getTime()) return false;
  return true;
}

function filterByRange(items = [], bounds, field = 'createdAt') {
  return items.filter((item) => dateInRange(item?.[field], bounds));
}

function completionHours(order) {
  if (!order?.completedAt || !order?.createdAt) return null;
  const hours = (new Date(order.completedAt).getTime() - new Date(order.createdAt).getTime()) / (60 * 60 * 1000);
  return Number.isFinite(hours) && hours >= 0 ? hours : null;
}

function averageHours(orders = []) {
  const values = orders.map(completionHours).filter((value) => value !== null);
  if (!values.length) return '—';
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return avg >= 24 ? `${(avg / 24).toFixed(1)} days` : `${avg.toFixed(1)} hrs`;
}

function serviceTypeBucket(order) {
  const text = `${order?.serviceType || ''} ${order?.device || ''} ${order?.issue || ''}`.toLowerCase();
  if (text.includes('printer') || text.includes('toner')) return 'Printer Service';
  if (text.includes('cctv') || text.includes('camera')) return 'CCTV Service';
  if (text.includes('network') || text.includes('amc')) return 'Networking / AMC';
  if (text.includes('solar') || text.includes('ups') || text.includes('battery') || text.includes('inverter')) return 'Solar / UPS / Inverter';
  if (text.includes('software') || text.includes('installation')) return 'Software / Installation';
  if (text.includes('laptop') || text.includes('desktop') || text.includes('pc')) return 'PC / Laptop Service';
  return order?.serviceType || 'Other';
}

function percentage(value, total) {
  if (!total) return '0%';
  return `${Math.round((Number(value || 0) / Number(total || 1)) * 100)}%`;
}

function monthKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

function downloadCsv(filename, headers, rows) {
  const content = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function WorkflowTracker({ status }) {
  const steps = ['Received', 'Diagnosing', 'Repairing', 'Ready', 'Delivered'];
  const indexByStatus = {
    Pending: 0,
    'Awaiting Parts': 1,
    'In Progress': 2,
    Completed: 3,
    Delivered: 4
  };
  const activeIndex = indexByStatus[status] ?? 0;

  return (
    <div className="surface p-5">
      <h2 className="text-xl font-black">Workflow Progress</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-5">
        {steps.map((step, index) => (
          <div key={step} className={`workflow-step ${index <= activeIndex ? 'workflow-step-active' : ''}`}>
            <span>{index + 1}</span>
            <p>{step}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NotificationsPanel({ notifications = [] }) {
  return (
    <div className="surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <Bell className="h-5 w-5 text-[var(--brand)]" />
        <h2 className="text-xl font-black">Notifications</h2>
      </div>
      <div className="grid gap-3">
        {notifications.length ? notifications.map((item) => (
          <div key={item.id} className="rounded-card bg-[var(--surface-2)] p-3">
            <p className="font-bold">{item.title}</p>
            <p className="mt-1 text-sm muted">{item.message}</p>
            <p className="mt-1 text-xs muted">{formatDate(item.createdAt)}</p>
          </div>
        )) : <p className="text-sm muted">No notifications.</p>}
      </div>
    </div>
  );
}

function RemindersPanel({ reminders = [] }) {
  return (
    <div className="surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
        <h2 className="text-xl font-black">Reminders</h2>
      </div>
      <div className="grid gap-3">
        {reminders.length ? reminders.map((item) => (
          <div key={item.id} className="rounded-card bg-[var(--surface-2)] p-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-bold">{item.title}</p>
              <span className="status-badge">{item.priority}</span>
            </div>
            <p className="mt-1 text-sm muted">{item.message}</p>
          </div>
        )) : <p className="text-sm muted">No reminders.</p>}
      </div>
    </div>
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

function TechnicianLoadingCards() {
  return (
    <div className="grid gap-4">
      {[1, 2, 3].map((item) => (
        <div key={item} className="surface animate-pulse p-5">
          <div className="h-4 w-32 rounded bg-white/10" />
          <div className="mt-4 h-7 w-48 rounded bg-white/10" />
          <div className="mt-4 grid gap-2">
            <div className="h-3 w-full rounded bg-white/10" />
            <div className="h-3 w-3/4 rounded bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

function TechnicianJobCard({ job, base = '/tech/work-orders', onStatusChange = null, compact = false }) {
  const customer = customerFromOrder(job);
  const phone = customerPhone(job);
  const priority = jobPriority(job);
  return (
    <div className="surface lift-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-lg font-black">{customer.name || 'Customer'}</p>
          <p className="mt-1 text-sm font-semibold text-sky-100">{job.serviceType || job.service || 'Service Job'}</p>
          <p className="mt-1 text-sm muted">{job.device || 'Device not captured'}</p>
        </div>
        <StatusBadge status={job.status} />
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        <p className="line-clamp-2"><span className="font-bold">Issue:</span> {job.issue || 'No issue captured'}</p>
        {customer.address ? <p className="line-clamp-2 muted"><span className="font-bold text-slate-200">Address:</span> {customer.address}</p> : null}
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-black ${priority === 'High' ? 'bg-amber-400/15 text-amber-100' : 'bg-sky-400/15 text-sky-100'}`}>{priority} Priority</span>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-bold text-slate-200">{jobScheduleLabel(job)}</span>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Link className="btn btn-primary" to={`${base}/${recordId(job)}`}>Open Job</Link>
        <a className={`btn btn-secondary ${phone ? '' : 'pointer-events-none opacity-50'}`} href={callHref(phone)}><PhoneCallIcon className="h-4 w-4" />Call</a>
        <a className={`btn btn-secondary ${phone ? '' : 'pointer-events-none opacity-50'}`} href={technicianWhatsAppHref(job)} target="_blank" rel="noreferrer"><Send className="h-4 w-4" />WhatsApp</a>
      </div>
      {!compact && onStatusChange ? (
        <div className="mt-4 grid gap-2 border-t border-white/10 pt-4 sm:grid-cols-2">
          {technicianAllowedStatuses.filter((status) => status !== job.status).slice(0, 4).map((status) => (
            <button key={status} type="button" className="btn btn-secondary" onClick={() => onStatusChange(recordId(job), status)}>
              Set {status}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TechnicianJobsView({ jobs, search, setSearch, filter, setFilter, quickStatus }) {
  const visibleJobs = useMemo(() => {
    const rows = jobs.filter((job) => {
      if (filter === 'Today') return isTechnicianTodayJob(job);
      if (filter === 'All Assigned') return true;
      return job.status === filter;
    });
    return rows.sort((a, b) => {
      const activeRank = (item) => ['Pending', 'In Progress', 'Awaiting Parts'].includes(item.status) ? 0 : 1;
      return activeRank(a) - activeRank(b) || new Date(a.scheduledAt || a.createdAt || 0) - new Date(b.scheduledAt || b.createdAt || 0);
    });
  }, [jobs, filter]);

  return (
    <>
      <PageHeader title="My Repair & Service Jobs" eyebrow="Technician">
        Mobile-first view of assigned service jobs, status updates, parts, notes, and photos.
      </PageHeader>
      <div className="surface mb-5 p-4">
        <SearchBox value={search} onChange={setSearch} placeholder="Search customer, phone, service, device, issue" />
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {technicianJobFilters.map((item) => (
            <button key={item} type="button" className={`tab-button ${filter === item ? 'tab-button-active' : ''}`} onClick={() => setFilter(item)}>
              {item}
            </button>
          ))}
        </div>
      </div>
      {!visibleJobs.length ? (
        <EmptyState title={filter === 'Today' ? 'No jobs assigned today.' : 'No jobs found'} message={filter === 'Today' ? "You're all clear." : 'Assigned jobs matching this filter will appear here.'} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {visibleJobs.map((job) => <TechnicianJobCard key={recordId(job)} job={job} onStatusChange={quickStatus} />)}
        </div>
      )}
    </>
  );
}

function ReportBar({ label, value, total, displayValue = null }) {
  const width = total ? Math.min(100, Math.round((Number(value || 0) / Number(total || 1)) * 100)) : 0;
  return (
    <div className="rounded-card bg-[var(--surface-2)] p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-bold">{label}</span>
        <span className="text-sm muted">{displayValue ?? value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-300" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function ReportsNavigation({ active }) {
  return (
    <div className="surface mb-5 p-3">
      <div className="tabs-list">
        {reportSections.map((item) => (
          <Link key={item.id} className={`tab-button ${active === item.id ? 'tab-button-active' : ''}`} to={item.to}>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ReportsRangeBar({ range, setRange, customFrom, setCustomFrom, customTo, setCustomTo, onExport }) {
  return (
    <div className="surface reports-range-bar mb-5 grid gap-3 p-4 lg:grid-cols-[220px_170px_170px_auto_auto]">
      <select className="input" value={range} onChange={(event) => setRange(event.target.value)}>
        {reportRangeOptions.map((item) => <option key={item}>{item}</option>)}
      </select>
      {range === 'Custom Range' ? (
        <>
          <input className="input" type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
          <input className="input" type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
        </>
      ) : <><div className="hidden lg:block" /><div className="hidden lg:block" /></>}
      <button type="button" className="btn btn-secondary" onClick={onExport}><Download className="h-4 w-4" />Export CSV</button>
      <button type="button" className="btn btn-secondary" onClick={() => window.print()}><FileText className="h-4 w-4" />Print</button>
    </div>
  );
}

export function ReportsAnalyticsPage({ section = 'main' }) {
  const { request } = useAuth();
  const [range, setRange] = useState('This Month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const loadReports = useCallback(async () => {
    const [bookings, workOrders, invoices, payments, inventory, movements, customers, amcContracts, amcSchedule, users] = await Promise.all([
      request('/bookings').catch(() => ({ bookings: [] })),
      request('/work-orders').catch(() => ({ workOrders: [] })),
      request('/invoices').catch(() => ({ invoices: [] })),
      request('/payments').catch(() => ({ payments: [] })),
      request('/inventory').catch(() => ({ parts: [] })),
      request('/stock-movements').catch(() => ({ movements: [] })),
      request('/customers').catch(() => ({ customers: [] })),
      request('/amc/contracts').catch(() => ({ contracts: [], summary: {} })),
      request('/amc/schedule').catch(() => ({ schedule: [] })),
      request('/users').catch(() => ({ users: [] }))
    ]);
    return {
      bookings: bookings.bookings || [],
      workOrders: workOrders.workOrders || [],
      invoices: invoices.invoices || [],
      payments: payments.payments || [],
      parts: inventory.parts || [],
      movements: movements.movements || [],
      customers: customers.customers || [],
      amcContracts: amcContracts.contracts || [],
      amcSummary: amcContracts.summary || {},
      amcSchedule: amcSchedule.schedule || [],
      users: users.users || []
    };
  }, [request]);
  const { data, loading, error } = useResource(loadReports, [loadReports]);

  const bounds = useMemo(() => reportRangeBounds(range, customFrom, customTo), [range, customFrom, customTo]);

  const report = useMemo(() => {
    const raw = data || {};
    const bookings = filterByRange(raw.bookings || [], bounds);
    const workOrders = filterByRange(raw.workOrders || [], bounds);
    const invoices = filterByRange(raw.invoices || [], bounds);
    const payments = filterByRange(raw.payments || [], bounds);
    const movements = filterByRange(raw.movements || [], bounds);
    const customers = filterByRange(raw.customers || [], bounds);
    const amcContracts = (raw.amcContracts || []).filter((contract) => dateInRange(contract.createdAt || contract.startDate || contract.endDate, bounds));
    const amcSchedule = (raw.amcSchedule || []).filter((visit) => dateInRange(visit.scheduledDate || visit.createdAt, bounds));
    const allWorkOrders = raw.workOrders || [];
    const allInvoices = raw.invoices || [];
    const allPayments = raw.payments || [];
    const allCustomers = raw.customers || [];
    const allContracts = raw.amcContracts || [];
    const allSchedule = raw.amcSchedule || [];
    const parts = raw.parts || [];

    const completedJobs = workOrders.filter((job) => ['Completed', 'Delivered'].includes(job.status));
    const activeJobs = allWorkOrders.filter((job) => ['Pending', 'In Progress', 'Awaiting Parts'].includes(job.status));
    const lowStockItems = parts.filter((part) => inventoryStockStatus(part) === 'low');
    const outOfStockItems = parts.filter((part) => inventoryStockStatus(part) === 'out');
    const paidAmount = payments.reduce((sum, payment) => sum + Number(payment.paidAmount || payment.amount || 0), 0);
    const totalInvoiceValue = invoices.reduce((sum, invoice) => sum + Number(invoice.total || invoice.totalAmount || 0), 0);
    const pendingBalance = invoices.reduce((sum, invoice) => sum + invoiceDueAmount(invoice), 0);
    const activeAmc = allContracts.filter((contract) => contract.status === 'Active').length;
    const amcRenewalsDue = allContracts.filter((contract) => contract.renewalStatus === 'Renewal Due').length;

    const serviceTypeRows = Object.entries(workOrders.reduce((map, job) => {
      const key = serviceTypeBucket(job);
      map[key] = (map[key] || 0) + 1;
      return map;
    }, {})).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

    const technicianRows = (raw.users || []).filter((user) => user.role === 'technician').map((tech) => {
      const jobs = allWorkOrders.filter((job) => recordId(job.technicianId) === recordId(tech));
      const completed = jobs.filter((job) => ['Completed', 'Delivered'].includes(job.status));
      const inProgress = jobs.filter((job) => job.status === 'In Progress');
      const awaitingParts = jobs.filter((job) => job.status === 'Awaiting Parts');
      const pending = jobs.filter((job) => job.status === 'Pending');
      const partsValue = jobs.reduce((sum, job) => sum + (job.partsUsed || []).reduce((partSum, part) => partSum + Number(part.total || 0), 0), 0);
      const notesCount = jobs.reduce((sum, job) => sum + (job.notes || []).length, 0);
      const returned = jobs.filter((job) => job.status === 'Returned').length;
      return {
        technician: tech,
        assigned: jobs.length,
        completed: completed.length,
        inProgress: inProgress.length,
        awaitingParts: awaitingParts.length,
        pending: pending.length,
        completionRate: percentage(completed.length, jobs.length),
        averageCompletion: averageHours(completed),
        partsValue,
        notesCount,
        returned,
        lastActivity: latestDate(jobs, ['updatedAt', 'completedAt', 'createdAt'])
      };
    });

    const revenueByMonth = Object.values(allPayments.reduce((map, payment) => {
      const key = monthKey(payment.createdAt);
      if (!map[key]) map[key] = { month: key, revenue: 0 };
      map[key].revenue += Number(payment.paidAmount || payment.amount || 0);
      return map;
    }, {})).slice(-12);

    const paymentMethodRows = Object.entries(payments.reduce((map, payment) => {
      const method = payment.method || 'Other';
      map[method] = (map[method] || 0) + Number(payment.paidAmount || payment.amount || 0);
      return map;
    }, {})).map(([method, total]) => ({ method, total })).sort((a, b) => b.total - a.total);

    const pendingByCustomer = Object.values(invoices.reduce((map, invoice) => {
      const id = recordId(invoice.customerId) || invoice.customerId?.phone || invoice.customerId?.name || 'unknown';
      if (!map[id]) map[id] = { customer: invoice.customerId?.name || 'Customer', phone: invoice.customerId?.phone || '', balance: 0 };
      map[id].balance += invoiceDueAmount(invoice);
      return map;
    }, {})).filter((row) => row.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 12);

    const usedByPart = movements.filter((movement) => movement.type === 'USED').reduce((map, movement) => {
      const id = recordId(movement.partId);
      map[id] = (map[id] || 0) + Math.abs(Number(movement.quantity || 0));
      return map;
    }, {});

    const inventoryRows = parts.map((part) => ({
      ...part,
      usedQuantity: usedByPart[recordId(part)] || 0,
      stockValue: Number(part.onHand || 0) * Number(part.costPrice || part.sellingPrice || 0),
      stockStatus: inventoryStockStatus(part)
    })).sort((a, b) => b.usedQuantity - a.usedQuantity || String(a.partName || '').localeCompare(String(b.partName || '')));

    const customerRows = allCustomers.map((customer) => {
      const customerJobs = allWorkOrders.filter((job) => recordId(job.customerId) === recordId(customer));
      const customerInvoices = allInvoices.filter((invoice) => recordId(invoice.customerId) === recordId(customer));
      const totalSpent = customerInvoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount || invoice.paid || 0), 0);
      const pending = customerInvoices.reduce((sum, invoice) => sum + invoiceDueAmount(invoice), 0);
      const activeAmcContracts = allContracts.filter((contract) => recordId(contract.customerId) === recordId(customer) && contract.status === 'Active').length;
      return {
        customer,
        totalJobs: customerJobs.length,
        totalSpent,
        pendingBalance: pending,
        activeAmc: activeAmcContracts,
        lastServiceDate: latestDate(customerJobs, ['completedAt', 'updatedAt', 'createdAt'])
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent || b.totalJobs - a.totalJobs);

    return {
      raw,
      bookings,
      workOrders,
      invoices,
      payments,
      movements,
      amcContracts,
      amcSchedule,
      parts,
      summary: {
        totalRevenue: paidAmount,
        pendingPayments: pendingBalance,
        completedJobs: completedJobs.length,
        activeRepairJobs: activeJobs.length,
        lowStockItems: lowStockItems.length,
        activeAmcContracts: activeAmc,
        amcRenewalsDue,
        totalCustomers: allCustomers.length
      },
      operations: {
        totalBookings: bookings.length,
        totalJobs: workOrders.length,
        pending: workOrders.filter((job) => job.status === 'Pending').length,
        inProgress: workOrders.filter((job) => job.status === 'In Progress').length,
        awaitingParts: workOrders.filter((job) => job.status === 'Awaiting Parts').length,
        completed: workOrders.filter((job) => job.status === 'Completed').length,
        delivered: workOrders.filter((job) => job.status === 'Delivered').length,
        returned: workOrders.filter((job) => job.status === 'Returned').length,
        averageCompletion: averageHours(workOrders),
        serviceTypeRows
      },
      technicians: technicianRows,
      finance: {
        totalInvoiceValue,
        totalCollected: paidAmount,
        pendingBalance,
        partialPayments: invoices.filter((invoice) => invoice.status === 'Partial').length,
        paidInvoices: invoices.filter((invoice) => invoice.status === 'Paid').length,
        pendingInvoices: invoices.filter((invoice) => invoice.status === 'Pending').length,
        todayCollection: allPayments.filter((payment) => isToday(payment.createdAt)).reduce((sum, payment) => sum + Number(payment.paidAmount || payment.amount || 0), 0),
        monthlyRevenue: allPayments.filter((payment) => {
          const date = new Date(payment.createdAt);
          const now = new Date();
          return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
        }).reduce((sum, payment) => sum + Number(payment.paidAmount || payment.amount || 0), 0),
        revenueByMonth,
        paymentMethodRows,
        pendingByCustomer
      },
      inventory: {
        rows: inventoryRows,
        totalParts: parts.length,
        stockValue: inventoryRows.reduce((sum, row) => sum + row.stockValue, 0),
        lowStock: lowStockItems.length,
        outOfStock: outOfStockItems.length,
        usedQuantity: movements.filter((movement) => movement.type === 'USED').reduce((sum, movement) => sum + Math.abs(Number(movement.quantity || 0)), 0),
        added: movements.filter((movement) => movement.type === 'ADD').reduce((sum, movement) => sum + Number(movement.quantity || 0), 0),
        returned: movements.filter((movement) => movement.type === 'RETURN').reduce((sum, movement) => sum + Number(movement.quantity || 0), 0),
        adjusted: movements.filter((movement) => movement.type === 'ADJUST').reduce((sum, movement) => sum + Number(movement.quantity || 0), 0),
        deadStock: inventoryRows.filter((row) => !row.usedQuantity).length
      },
      amc: {
        contracts: allContracts,
        active: allContracts.filter((contract) => contract.status === 'Active').length,
        expiringSoon: allContracts.filter((contract) => contract.renewalStatus === 'Renewal Due').length,
        expired: allContracts.filter((contract) => contract.renewalStatus === 'Expired').length,
        visitsThisMonth: allSchedule.filter((visit) => {
          const date = new Date(visit.scheduledDate);
          const now = new Date();
          return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
        }).length,
        completedVisits: allSchedule.filter((visit) => visit.status === 'Completed').length,
        overdueVisits: allSchedule.filter((visit) => visit.status === 'Overdue').length,
        contractValue: allContracts.reduce((sum, contract) => sum + Number(contract.contractValue || 0), 0),
        renewalDueAmount: allContracts.filter((contract) => ['Renewal Due', 'Expired'].includes(contract.renewalStatus)).reduce((sum, contract) => sum + Number(contract.contractValue || 0), 0)
      },
      customers: {
        rows: customerRows,
        newThisMonth: allCustomers.filter((customer) => {
          const date = new Date(customer.createdAt);
          const now = new Date();
          return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
        }).length,
        repeatCustomers: customerRows.filter((row) => row.totalJobs > 1).length,
        withPendingBalance: customerRows.filter((row) => row.pendingBalance > 0).length,
        withActiveAmc: customerRows.filter((row) => row.activeAmc > 0).length
      }
    };
  }, [data, bounds]);

  const activeSection = normalizeReportSection(section);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [activeSection]);

  function exportCurrentSection() {
    if (!report) return;
    if (activeSection === 'main') {
      downloadCsv('business-report.csv', ['Metric', 'Value'], [
        ['Total revenue', report.summary.totalRevenue],
        ['Pending payments', report.summary.pendingPayments],
        ['Completed jobs', report.summary.completedJobs],
        ['Active repair jobs', report.summary.activeRepairJobs],
        ['Low stock items', report.summary.lowStockItems],
        ['Active AMC contracts', report.summary.activeAmcContracts],
        ['AMC renewals due', report.summary.amcRenewalsDue],
        ['Total customers', report.summary.totalCustomers],
        ['Total bookings', report.operations.totalBookings],
        ['Total service jobs', report.operations.totalJobs],
        ['Average completion', report.operations.averageCompletion],
        ...report.operations.serviceTypeRows.map((row) => [`Jobs - ${row.name}`, row.count])
      ]);
      return;
    }
    if (activeSection === 'technicians') {
      downloadCsv('technician-report.csv', ['Technician', 'Assigned', 'Completed', 'In Progress', 'Awaiting Parts', 'Completion Rate', 'Last Activity'], report.technicians.map((row) => [row.technician.name, row.assigned, row.completed, row.inProgress, row.awaitingParts, row.completionRate, row.lastActivity]));
      return;
    }
    if (activeSection === 'finance') {
      downloadCsv('finance-report.csv', ['Metric', 'Value'], [
        ['Total invoice value', report.finance.totalInvoiceValue],
        ['Total collected', report.finance.totalCollected],
        ['Pending balance', report.finance.pendingBalance],
        ['Partial payments', report.finance.partialPayments],
        ['Paid invoices', report.finance.paidInvoices],
        ['Pending invoices', report.finance.pendingInvoices],
        ["Today's collection", report.finance.todayCollection],
        ['Monthly revenue', report.finance.monthlyRevenue],
        ...report.finance.paymentMethodRows.map((row) => [`Collection - ${row.method}`, row.total]),
        ...report.finance.pendingByCustomer.map((row) => [`Pending - ${row.customer}`, row.balance])
      ]);
      return;
    }
    if (activeSection === 'inventory') {
      downloadCsv('inventory-report.csv', ['Part', 'Category', 'On Hand', 'Reserved', 'Available', 'Used Quantity', 'Stock Value', 'Status'], report.inventory.rows.map((row) => [row.partName, row.category, row.onHand, row.reserved, row.available, row.usedQuantity, row.stockValue, row.stockStatus]));
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div className="reports-page">
      <PageHeader title="Reports & Analytics" eyebrow="Business Intelligence">
        Track service performance, revenue, stock, technicians, payments, and AMC renewals.
      </PageHeader>
      <ReportsNavigation active={activeSection} />
      <ReportsRangeBar range={range} setRange={setRange} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} onExport={exportCurrentSection} />

      {activeSection === 'main' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SmartMetricCard icon={CreditCard} label="Total Revenue" value={currency(report.summary.totalRevenue)} tone="green" to="/admin/reports/finance" />
          <SmartMetricCard icon={AlertTriangle} label="Pending Payments" value={currency(report.summary.pendingPayments)} tone="yellow" to="/admin/reports/finance" />
          <SmartMetricCard icon={CheckCircle2} label="Completed Jobs" value={report.summary.completedJobs} tone="green" to="/admin/work-orders?status=Completed" />
          <SmartMetricCard icon={Wrench} label="Active Repair Jobs" value={report.summary.activeRepairJobs} tone="blue" to="/admin/work-orders" />
          <SmartMetricCard icon={AlertTriangle} label="Low Stock Items" value={report.summary.lowStockItems} tone="red" to="/admin/reports/inventory" />
          <SmartMetricCard icon={FileText} label="Active AMC Contracts" value={report.summary.activeAmcContracts} tone="green" to="/admin/amc-contracts" />
          <SmartMetricCard icon={Bell} label="AMC Renewals Due" value={report.summary.amcRenewalsDue} tone="yellow" to="/admin/amc-renewals" />
          <SmartMetricCard icon={Users} label="Total Customers" value={report.summary.totalCustomers} tone="blue" to="/admin/customers" />
        </div>
      ) : null}

      {activeSection === 'main' ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
          <div className="surface p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Operations Summary</h2>
              <Link className="btn btn-secondary py-2" to="/admin/work-orders">Open Jobs</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard icon={BookOpenCheck} label="Total Bookings" value={report.operations.totalBookings} />
              <StatCard icon={Wrench} label="Total Service Jobs" value={report.operations.totalJobs} />
              <StatCard icon={CalendarClock} label="Pending Jobs" value={report.operations.pending} tone="yellow" />
              <StatCard icon={Wrench} label="In Progress Jobs" value={report.operations.inProgress} />
              <StatCard icon={PackagePlus} label="Awaiting Parts" value={report.operations.awaitingParts} tone="yellow" />
              <StatCard icon={CheckCircle2} label="Completed Jobs" value={report.operations.completed} tone="green" />
              <StatCard icon={CheckCircle2} label="Delivered Jobs" value={report.operations.delivered} tone="green" />
              <StatCard icon={AlertTriangle} label="Returned Jobs" value={report.operations.returned} tone="red" />
            </div>
            <p className="mt-4 rounded-card bg-[var(--surface-2)] p-3 text-sm font-bold">Average completion time: {report.operations.averageCompletion}</p>
          </div>
          <div className="surface p-5">
            <h2 className="text-xl font-black">Jobs by Service Type</h2>
            <div className="mt-4 grid gap-3">
              {report.operations.serviceTypeRows.length ? report.operations.serviceTypeRows.map((row) => <ReportBar key={row.name} label={row.name} value={row.count} total={report.operations.totalJobs} />) : <EmptyState title="No report data for this period." message="Try changing the date range." />}
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === 'technicians' ? (
        <div className="surface mt-6 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">Technician Performance Report</h2>
            <Link className="btn btn-secondary py-2" to="/admin/work-orders?view=technicians">Technician Jobs</Link>
          </div>
          {!report.technicians.length ? <EmptyState title="No technician data" message="Technician reports will appear after jobs are assigned." /> : (
            <Table>
              <thead><tr><th>Technician</th><th>Assigned</th><th>Completed</th><th>In Progress</th><th>Awaiting Parts</th><th>Completion Rate</th><th>Last Activity</th><th>Action</th></tr></thead>
              <tbody>
                {report.technicians.map((row) => (
                  <tr key={recordId(row.technician)}>
                    <td className="font-bold">{row.technician.name}<span className="block text-xs muted">{row.notesCount} notes - {currency(row.partsValue)} parts</span></td>
                    <td>{row.assigned}</td>
                    <td>{row.completed}</td>
                    <td>{row.inProgress}</td>
                    <td>{row.awaitingParts}</td>
                    <td>{row.completionRate}<span className="block text-xs muted">Avg {row.averageCompletion}</span></td>
                    <td>{row.lastActivity ? formatDate(row.lastActivity) : '-'}</td>
                    <td><Link className="btn btn-secondary py-2" to={`/admin/work-orders?technicianId=${recordId(row.technician)}`}>View Jobs</Link></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      ) : null}

      {activeSection === 'finance' ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_.9fr]">
          <div className="surface p-5">
            <h2 className="text-xl font-black">Finance Report</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard icon={ReceiptText} label="Total Invoice Value" value={currency(report.finance.totalInvoiceValue)} />
              <StatCard icon={CreditCard} label="Total Collected" value={currency(report.finance.totalCollected)} tone="green" />
              <StatCard icon={AlertTriangle} label="Pending Balance" value={currency(report.finance.pendingBalance)} tone="red" />
              <StatCard icon={ReceiptText} label="Partial Payments" value={report.finance.partialPayments} tone="yellow" />
              <StatCard icon={CheckCircle2} label="Paid Invoices" value={report.finance.paidInvoices} tone="green" />
              <StatCard icon={AlertTriangle} label="Pending Invoices" value={report.finance.pendingInvoices} tone="yellow" />
              <StatCard icon={CreditCard} label="Today's Collection" value={currency(report.finance.todayCollection)} />
              <StatCard icon={CreditCard} label="Monthly Revenue" value={currency(report.finance.monthlyRevenue)} tone="green" />
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <DashboardChart title="Revenue by Month">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.finance.revenueByMonth}>
                    <CartesianGrid stroke="rgba(117,196,255,0.12)" vertical={false} />
                    <XAxis dataKey="month" stroke="#aebfd7" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#aebfd7" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => currency(value)} contentStyle={{ background: '#071426', border: '1px solid rgba(117,196,255,0.25)', borderRadius: 8 }} />
                    <Bar dataKey="revenue" fill="#22c55e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </DashboardChart>
              <div className="surface p-5">
                <h3 className="text-lg font-black">Collection by Payment Method</h3>
                <div className="mt-4 grid gap-3">
                  {report.finance.paymentMethodRows.length ? report.finance.paymentMethodRows.map((row) => <ReportBar key={row.method} label={row.method} value={row.total} displayValue={currency(row.total)} total={report.finance.totalCollected || 1} />) : <p className="text-sm muted">No payments in this period.</p>}
                </div>
              </div>
            </div>
          </div>
          <div className="surface p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Pending Balance by Customer</h2>
              <Link className="btn btn-secondary py-2" to="/admin/payments">Payments</Link>
            </div>
            <div className="grid gap-3">
              {report.finance.pendingByCustomer.length ? report.finance.pendingByCustomer.map((row) => (
                <div key={`${row.customer}-${row.phone}`} className="rounded-card bg-[var(--surface-2)] p-3">
                  <p className="font-bold">{row.customer}</p>
                  <p className="text-sm muted">{row.phone || 'Phone not captured'}</p>
                  <p className="mt-2 text-lg font-black text-amber-100">{currency(row.balance)}</p>
                </div>
              )) : <EmptyState title="No pending balances" message="Payments are clear for this period." />}
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === 'inventory' ? (
        <div className="surface mt-6 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">Inventory Report</h2>
            <Link className="btn btn-secondary py-2" to="/admin/parts">Open Inventory</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Boxes} label="Total Parts / Products" value={report.inventory.totalParts} />
            <StatCard icon={CreditCard} label="Total Stock Value" value={currency(report.inventory.stockValue)} />
            <StatCard icon={AlertTriangle} label="Low Stock Items" value={report.inventory.lowStock} tone="yellow" />
            <StatCard icon={AlertTriangle} label="Out of Stock Items" value={report.inventory.outOfStock} tone="red" />
            <StatCard icon={Wrench} label="Stock Used by Jobs" value={report.inventory.usedQuantity} />
            <StatCard icon={PackagePlus} label="Stock Added" value={report.inventory.added} tone="green" />
            <StatCard icon={PackagePlus} label="Stock Returned" value={report.inventory.returned} tone="green" />
            <StatCard icon={ReceiptText} label="Dead Stock Items" value={report.inventory.deadStock} tone="yellow" />
          </div>
          <div className="mt-5">
            {!report.inventory.rows.length ? <EmptyState title="No inventory data" message="Inventory reports will appear after parts are added." /> : (
              <Table>
                <thead><tr><th>Part</th><th>Category</th><th>On Hand</th><th>Reserved</th><th>Available</th><th>Used Quantity</th><th>Stock Value</th><th>Status</th></tr></thead>
                <tbody>
                  {report.inventory.rows.slice(0, 50).map((part) => <tr key={recordId(part)}><td className="font-bold">{part.partName}</td><td>{part.category}</td><td>{part.onHand}</td><td>{part.reserved}</td><td>{part.available}</td><td>{part.usedQuantity}</td><td>{currency(part.stockValue)}</td><td><InventoryStatusBadge part={part} /></td></tr>)}
                </tbody>
              </Table>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AdminDashboard() {
  const { request } = useAuth();
  const [lastUpdated, setLastUpdated] = useState(null);
  const loadDashboard = useCallback(async () => {
    const [dashboard, bookings, payments, workOrders, invoices] = await Promise.all([
      request('/dashboard/admin'),
      request('/bookings').catch(() => ({ bookings: [] })),
      request('/payments').catch(() => ({ payments: [] })),
      request('/work-orders').catch(() => ({ workOrders: [] })),
      request('/invoices').catch(() => ({ invoices: [] }))
    ]);
    return {
      ...dashboard,
      bookings: bookings.bookings || [],
      payments: payments.payments || [],
      workOrders: workOrders.workOrders || [],
      invoices: invoices.invoices || []
    };
  }, [request]);
  const { data, loading, error, reload } = useResource(loadDashboard, [loadDashboard]);
  const chartData = useMemo(() => buildSevenDaySeries(data?.bookings || [], data?.payments || []), [data?.bookings, data?.payments]);
  const completedToday = useMemo(() => (data?.workOrders || []).filter((order) => order.status === 'Completed' && isSameDay(order.updatedAt || order.completedAt || order.createdAt)).length, [data?.workOrders]);
  const monthlyRevenue = useMemo(() => {
    const now = new Date();
    return (data?.payments || []).filter((payment) => {
      const date = new Date(payment.createdAt);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    }).reduce((sum, payment) => sum + Number(payment.paidAmount || payment.amount || 0), 0);
  }, [data?.payments]);
  const pendingPaymentInvoices = useMemo(() => (data?.invoices || []).filter((invoice) => ['Pending', 'Partial'].includes(invoice.status) && invoiceDueAmount(invoice) > 0), [data?.invoices]);
  const activeWorkOrders = useMemo(() => (data?.workOrders || []).filter((order) => ['Pending', 'In Progress', 'Awaiting Parts'].includes(order.status)).slice(0, 6), [data?.workOrders]);
  const amcRenewalsDue = useMemo(() => Number(data?.stats?.amcRenewalsDue || 0) || (data?.reminders || []).filter((item) => `${item.title || ''} ${item.message || ''}`.toLowerCase().includes('amc')).length, [data?.stats?.amcRenewalsDue, data?.reminders]);
  const alerts = useMemo(() => {
    if (!data) return [];
    return [
      { level: 'critical', title: 'Out of stock items', count: Number(data.stats?.lowStockCritical || 0), message: 'Stock is at zero and needs immediate refill.', to: '/admin/parts', action: 'View Stock' },
      { level: 'critical', title: 'Overdue jobs', count: Number(data.stats?.jobsOverdue || 0), message: 'Jobs have not moved in more than 24 hours.', to: '/admin/work-orders', action: 'View Jobs' },
      { level: 'warning', title: 'Low stock', count: Number(data.lowStockAlerts?.length || 0), message: 'Parts are close to their low stock limit.', to: '/admin/parts', action: 'View Stock' },
      { level: 'warning', title: 'Pending payments', count: Number(data.stats?.pendingPayments || 0), message: 'Invoices still have balance due.', to: '/admin/payments', action: 'View Payments' }
    ];
  }, [data]);

  useEffect(() => {
    if (data) setLastUpdated(new Date());
  }, [data]);

  useEffect(() => {
    const timer = setInterval(() => reload({ silent: true }), 18000);
    return () => clearInterval(timer);
  }, [reload]);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

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
      <div className="dashboard-kpi-grid">
        <SmartMetricCard icon={CalendarClock} label="Today's Bookings" value={data.stats.todayBookings} helper="New intake today" tone="blue" to="/admin/bookings" />
        <SmartMetricCard icon={ClipboardList} label="Pending Service Jobs" value={data.stats.pendingJobs} helper={`${data.stats.unassignedJobs || 0} unassigned`} tone="yellow" to="/admin/work-orders" />
        <SmartMetricCard icon={Wrench} label="Jobs In Progress" value={data.stats.inProgressJobs} helper={`${data.stats.awaitingPartsJobs || 0} awaiting parts`} tone="blue" to="/admin/work-orders" />
        <SmartMetricCard icon={CheckCircle2} label="Completed Today" value={completedToday} helper={`${data.stats.completedJobs || 0} completed total`} tone="green" to="/admin/work-orders" />
        <SmartMetricCard icon={CreditCard} label="Pending Payments" value={pendingPaymentInvoices.length || data.stats.pendingPayments} helper={`${data.stats.paymentsOverdue || 0} overdue`} tone="yellow" glow to="/admin/payments" />
        <SmartMetricCard icon={AlertTriangle} label="Low Stock Items" value={(data.lowStockAlerts?.length || 0) + Number(data.stats.lowStockCritical || 0)} helper={`${data.stats.lowStockCritical || 0} out of stock`} tone="red" glow to="/admin/parts" />
        <SmartMetricCard icon={FileText} label="Active AMC Contracts" value={data.stats.activeAmcContracts || 0} helper={`${amcRenewalsDue} renewals due, ${data.stats.amcVisitsThisWeek || 0} visits this week`} tone="green" to="/admin/amc-contracts" />
        <SmartMetricCard icon={ReceiptText} label="Monthly Revenue" value={currency(monthlyRevenue)} helper="Collected this month" tone="green" to="/admin/reports/finance" />
      </div>
      <div className="dashboard-priority-block">
        <PriorityAlerts alerts={alerts} />
      </div>
      <div className="dashboard-main-grid">
        <DashboardPanel title="Recent Bookings" icon={CalendarClock} action={<Link className="dashboard-card-action" to="/admin/bookings">View All</Link>} className="dashboard-list-card">
          <div className="grid gap-3">
            {data.recentBookings?.length ? data.recentBookings.slice(0, 6).map((booking) => {
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
        <TechnicianWorkloadBars technicians={data.technicianWorkload || []} />
        <ActivityFeedPanel notifications={data.notifications || []} reminders={data.reminders || []} />
        <RevenueOverviewCard chartData={chartData} monthlyRevenue={monthlyRevenue} />
      </div>
    </div>
  );

}

/*
      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <div className="surface p-5">
          <h2 className="text-xl font-black">Recent Bookings</h2>
          <div className="mt-4 grid gap-3">
            {data.recentBookings?.length ? data.recentBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between gap-3 rounded-card bg-[var(--surface-2)] p-3">
                <div className="min-w-0">
                  <p className="truncate font-bold">{booking.customerName}</p>
                  <p className="truncate text-sm muted">{booking.bookingCode} · {booking.device}</p>
                </div>
                <StatusBadge status={booking.status} />
              </div>
            )) : <p className="text-sm muted">No bookings yet.</p>}
          </div>
        </div>
        <div className="surface p-5">
          <h2 className="text-xl font-black">Low Stock Alerts</h2>
          <div className="mt-4 grid gap-3">
            {data.lowStockAlerts?.length ? data.lowStockAlerts.map((part) => (
              <div key={part.id} className="flex items-center justify-between rounded-card bg-[var(--surface-2)] p-3">
                <div>
                  <p className="font-bold">{part.partName}</p>
                  <p className="text-sm muted">{part.category}</p>
                </div>
                <span className="status-badge">{part.available} available</span>
              </div>
            )) : <p className="text-sm muted">No low stock items.</p>}
          </div>
        </div>
        <NotificationsPanel notifications={data.notifications || []} />
        <RemindersPanel reminders={data.reminders || []} />
        <div className="surface p-5">
          <h2 className="text-xl font-black">Technician Workload</h2>
          <div className="mt-4 grid gap-3">
            {data.technicianWorkload?.length ? data.technicianWorkload.map((tech) => (
              <div key={tech.id} className="flex items-center justify-between rounded-card bg-[var(--surface-2)] p-3">
                <span className="font-bold">{tech.name}</span>
                <span className="status-badge">{tech.activeJobs} active</span>
              </div>
            )) : <p className="text-sm muted">No technicians.</p>}
          </div>
        </div>
      </div>
    </>
  );
*/

export function TechnicianPanelPage() {
  const panelLinks = [
    { to: '/admin/technician-tasks', label: 'Technician Tasks', icon: UserRound, text: 'Open the existing technician task view.' },
    { to: '/admin/work-orders', label: 'Assigned Work Orders', icon: BookOpenCheck, text: 'Review assigned service and repair jobs.' },
    { to: '/admin/work-orders?status=Completed', label: 'Completed Jobs', icon: CheckCircle2, text: 'Check jobs that have reached completion.' }
  ];

  return (
    <>
      <PageHeader title="Technician Panel" eyebrow="Operations">
        Technician-related navigation is grouped here while the main Admin sidebar stays focused.
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-3">
        {panelLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} to={item.to} className="surface lift-card block p-5">
              <span className="grid h-11 w-11 place-items-center rounded-card bg-sky-400/15 text-sky-100">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-xl font-black">{item.label}</h2>
              <p className="mt-2 text-sm leading-6 muted">{item.text}</p>
            </Link>
          );
        })}
      </div>
    </>
  );
}

function defaultAmcForm() {
  const start = new Date();
  const end = new Date();
  end.setFullYear(end.getFullYear() + 1);
  return {
    customerId: '',
    customerName: '',
    phone: '',
    address: '',
    contractType: 'Basic AMC',
    coveredDevices: '',
    serviceFrequency: 'Quarterly',
    startDate: dateInputValue(start),
    endDate: dateInputValue(end),
    contractValue: '',
    includedVisits: '4',
    notes: ''
  };
}

export function AMCContractsPage() {
  const { request } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(defaultAmcForm);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const { data, loading, error, reload } = useResource(() => request('/amc/contracts'), [request]);

  useEffect(() => {
    request('/customers').then((result) => setCustomers(result.customers || [])).catch(() => setCustomers([]));
  }, [request]);

  const contracts = data?.contracts || [];
  const summary = data?.summary || {};
  const visibleContracts = contracts.filter((contract) => {
    const text = `${contract.contractId} ${contract.customerName} ${contract.phone} ${contract.contractType} ${contract.coveredService}`.toLowerCase();
    return !search || text.includes(search.toLowerCase());
  });

  function selectCustomer(customerId) {
    const customer = customers.find((item) => recordId(item) === customerId);
    setForm((current) => ({
      ...current,
      customerId,
      customerName: customer?.name || current.customerName,
      phone: customer?.phone || current.phone,
      address: customer?.address || current.address
    }));
  }

  async function submit(event) {
    event.preventDefault();
    try {
      await request('/amc/contracts', { method: 'POST', body: JSON.stringify(form) });
      push('AMC contract created');
      setForm(defaultAmcForm());
      setFormOpen(false);
      reload();
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function createJob(contract) {
    try {
      const result = await request(`/amc/contracts/${recordId(contract)}/work-orders`, {
        method: 'POST',
        body: JSON.stringify({ issue: `AMC service visit for ${contract.contractType}` })
      });
      push('Repair & Service Job created from AMC');
      navigate(`/admin/work-orders/${recordId(result.workOrder)}`);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <PageHeader
        title="AMC Contracts"
        eyebrow="AMC & Contracts"
        action={<button className="btn btn-primary" onClick={() => setFormOpen((value) => !value)}><Plus className="h-4 w-4" />New AMC Contract</button>}
      >
        Manage service contracts, covered assets, renewal status, visits, and AMC-linked repair jobs.
      </PageHeader>

      <div className="surface mb-5 p-3">
        <div className="tabs-list">
          <Link className="tab-button tab-button-active" to="/admin/amc-contracts">Contracts</Link>
          <Link className="tab-button" to="/admin/amc-schedule">Schedule</Link>
          <Link className="tab-button" to="/admin/amc-renewals">Renewals</Link>
          <Link className="tab-button" to="/admin/warranties">Warranties</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FileText} label="Active AMC Contracts" value={summary.activeContracts || 0} tone="green" />
        <StatCard icon={AlertTriangle} label="Renewals Due" value={summary.renewalDue || 0} tone="yellow" />
        <StatCard icon={CalendarClock} label="Visits This Week" value={summary.visitsThisWeek || 0} />
        <StatCard icon={AlertTriangle} label="Expired Contracts" value={summary.expiredContracts || 0} tone="red" />
      </div>

      {formOpen ? (
        <form className="surface mt-6 p-5" onSubmit={submit}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Create AMC Contract</h2>
            <button type="button" className="icon-button" onClick={() => setFormOpen(false)} aria-label="Close AMC form"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label>
              <span className="label">Existing customer</span>
              <select className="input" value={form.customerId} onChange={(event) => selectCustomer(event.target.value)}>
                <option value="">Manual / new customer</option>
                {customers.map((customer) => <option key={recordId(customer)} value={recordId(customer)}>{customer.name} - {customer.phone}</option>)}
              </select>
            </label>
            <label>
              <span className="label">Customer</span>
              <input className="input" value={form.customerName} onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} required />
            </label>
            <label>
              <span className="label">Phone</span>
              <input className="input" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} required />
            </label>
            <label className="md:col-span-3">
              <span className="label">Address</span>
              <input className="input" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
            </label>
            <label>
              <span className="label">Contract Type</span>
              <select className="input" value={form.contractType} onChange={(event) => setForm((current) => ({ ...current, contractType: event.target.value }))}>
                {amcContractTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label>
              <span className="label">Service Frequency</span>
              <select className="input" value={form.serviceFrequency} onChange={(event) => setForm((current) => ({ ...current, serviceFrequency: event.target.value }))}>
                {amcFrequencies.map((frequency) => <option key={frequency}>{frequency}</option>)}
              </select>
            </label>
            <label>
              <span className="label">Included Visits</span>
              <input className="input" type="number" min="0" value={form.includedVisits} onChange={(event) => setForm((current) => ({ ...current, includedVisits: event.target.value }))} />
            </label>
            <label>
              <span className="label">Start Date</span>
              <input className="input" type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} required />
            </label>
            <label>
              <span className="label">End Date</span>
              <input className="input" type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} required />
            </label>
            <label>
              <span className="label">Contract Value</span>
              <input className="input" type="number" min="0" value={form.contractValue} onChange={(event) => setForm((current) => ({ ...current, contractValue: event.target.value }))} />
            </label>
            <label className="md:col-span-3">
              <span className="label">Covered Devices / Assets</span>
              <textarea className="input min-h-24" value={form.coveredDevices} onChange={(event) => setForm((current) => ({ ...current, coveredDevices: event.target.value }))} placeholder="Example: office laptops, printer, CCTV DVR, network rack" />
            </label>
            <label className="md:col-span-3">
              <span className="label">Notes</span>
              <textarea className="input min-h-24" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <button className="btn btn-primary"><Save className="h-4 w-4" />Save AMC Contract</button>
          </div>
        </form>
      ) : null}

      <div className="surface mt-6 p-5">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
          <SearchBox value={search} onChange={setSearch} placeholder="Search contract, customer, phone, service" />
          <Link className="btn btn-secondary" to="/admin/amc-schedule"><CalendarClock className="h-4 w-4" />Schedule</Link>
          <Link className="btn btn-secondary" to="/admin/amc-renewals"><AlertTriangle className="h-4 w-4" />Renewals</Link>
        </div>
        {!visibleContracts.length ? (
          <EmptyState title="No AMC contracts yet" message="Create the first AMC contract to track visits and renewal reminders." action={<button className="btn btn-primary" onClick={() => setFormOpen(true)}>Create AMC Contract</button>} />
        ) : (
          <Table>
            <thead><tr><th>Contract ID</th><th>Customer</th><th>Plan / Coverage</th><th>Period</th><th>Value</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {visibleContracts.map((contract) => (
                <tr key={recordId(contract)}>
                  <td className="font-bold">{contract.contractId}</td>
                  <td>
                    <span className="block font-semibold text-slate-100">{contract.customerName || '-'}</span>
                    <span className="mt-1 block text-xs muted">Phone: {contract.phone || '-'}</span>
                  </td>
                  <td>
                    <span className="block font-semibold text-slate-100">{contract.contractType || '-'}</span>
                    <span className="mt-1 block text-xs muted">{contract.coveredService || '-'}</span>
                  </td>
                  <td className="whitespace-nowrap">{formatDate(contract.startDate)} to {formatDate(contract.endDate)}</td>
                  <td>{currency(contract.contractValue)}</td>
                  <td><AmcStatusBadge status={contract.status} /></td>
                  <td>
                    <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                      <Link className="btn btn-secondary py-2" to="/admin/amc-schedule">Schedule</Link>
                      <button className="btn btn-primary py-2" onClick={() => createJob(contract)}>Create Job</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}

export function AMCSchedulePage() {
  const { request } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useResource(() => request('/amc/schedule'), [request]);
  const schedule = data?.schedule || [];
  const visibleSchedule = status ? schedule.filter((visit) => visit.status === status) : schedule;

  async function createJob(visit) {
    try {
      const result = await request(`/amc/contracts/${visit.contractId}/work-orders`, {
        method: 'POST',
        body: JSON.stringify({ visitId: visit.id, issue: `AMC scheduled visit for ${visit.contractType}` })
      });
      push('Repair & Service Job created from AMC visit');
      reload();
      navigate(`/admin/work-orders/${recordId(result.workOrder)}`);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <PageHeader
        title="AMC Schedule"
        eyebrow="AMC & Contracts"
        action={<Link className="btn btn-secondary" to="/admin/amc-contracts"><FileText className="h-4 w-4" />Contracts</Link>}
      >
        Track upcoming, due today, overdue, and completed AMC service visits.
      </PageHeader>
      <div className="surface mb-5 p-3">
        <div className="tabs-list">
          <Link className="tab-button" to="/admin/amc-contracts">Contracts</Link>
          <Link className="tab-button tab-button-active" to="/admin/amc-schedule">Schedule</Link>
          <Link className="tab-button" to="/admin/amc-renewals">Renewals</Link>
          <Link className="tab-button" to="/admin/warranties">Warranties</Link>
        </div>
      </div>
      <div className="surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <select className="input max-w-xs" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {['Upcoming', 'Due Today', 'Overdue', 'Completed'].map((item) => <option key={item}>{item}</option>)}
          </select>
          <Link className="btn btn-secondary" to="/admin/amc-renewals"><AlertTriangle className="h-4 w-4" />Renewals</Link>
        </div>
        {!visibleSchedule.length ? (
          <EmptyState title="No AMC visits scheduled" message="Visits will appear after AMC contracts are created." action={<Link className="btn btn-primary" to="/admin/amc-contracts">Create AMC Contract</Link>} />
        ) : (
          <Table>
            <thead><tr><th>Customer</th><th>Contract</th><th>Service Type</th><th>Scheduled Date</th><th>Technician</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {visibleSchedule.map((visit) => (
                <tr key={visit.id}>
                  <td className="font-bold">{visit.customerName}<span className="block text-xs muted">{visit.phone}</span></td>
                  <td>{visit.contractCode}</td>
                  <td>{visit.serviceType}</td>
                  <td>{formatDate(visit.scheduledDate)}</td>
                  <td>{visit.technicianId?.name || 'Unassigned'}</td>
                  <td><AmcStatusBadge status={visit.status} /></td>
                  <td>
                    {recordId(visit.workOrderId) ? (
                      <Link className="btn btn-secondary py-2" to={`/admin/work-orders/${recordId(visit.workOrderId)}`}>Open Job</Link>
                    ) : (
                      <button className="btn btn-primary py-2" onClick={() => createJob(visit)}><Wrench className="h-4 w-4" />Create Job</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}

export function AMCRenewalsPage() {
  const { request } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useResource(() => request('/amc/renewals'), [request]);
  const renewals = data?.renewals || [];
  const expiring = renewals.filter((contract) => contract.renewalStatus === 'Renewal Due');
  const expired = renewals.filter((contract) => contract.renewalStatus === 'Expired');

  async function createJob(contract) {
    try {
      const result = await request(`/amc/contracts/${recordId(contract)}/work-orders`, {
        method: 'POST',
        body: JSON.stringify({ issue: `AMC renewal service visit for ${contract.contractType}` })
      });
      push('Repair & Service Job created from AMC');
      reload();
      navigate(`/admin/work-orders/${recordId(result.workOrder)}`);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <PageHeader
        title="AMC Renewals"
        eyebrow="AMC & Contracts"
        action={<Link className="btn btn-primary" to="/admin/amc-contracts"><Plus className="h-4 w-4" />New Contract</Link>}
      >
        Review contracts expiring in 30 days and expired AMC agreements.
      </PageHeader>
      <div className="surface mb-5 p-3">
        <div className="tabs-list">
          <Link className="tab-button" to="/admin/amc-contracts">Contracts</Link>
          <Link className="tab-button" to="/admin/amc-schedule">Schedule</Link>
          <Link className="tab-button tab-button-active" to="/admin/amc-renewals">Renewals</Link>
          <Link className="tab-button" to="/admin/warranties">Warranties</Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard icon={AlertTriangle} label="Expiring in 30 Days" value={expiring.length} tone="yellow" />
        <StatCard icon={AlertTriangle} label="Expired Contracts" value={expired.length} tone="red" />
      </div>
      <div className="surface mt-6 p-5">
        {!renewals.length ? (
          <EmptyState title="No AMC renewals due" message="Renewal reminders will appear when contracts are near expiry." action={<Link className="btn btn-secondary" to="/admin/amc-contracts">View Contracts</Link>} />
        ) : (
          <Table>
            <thead><tr><th>Contract</th><th>Customer</th><th>Phone</th><th>Contract Type</th><th>End Date</th><th>Renewal Status</th><th>Value</th><th>Action</th></tr></thead>
            <tbody>
              {renewals.map((contract) => (
                <tr key={recordId(contract)}>
                  <td className="font-bold">{contract.contractId}</td>
                  <td>{contract.customerName}</td>
                  <td>{contract.phone}</td>
                  <td>{contract.contractType}</td>
                  <td>{formatDate(contract.endDate)}</td>
                  <td><AmcStatusBadge status={contract.renewalStatus} /></td>
                  <td>{currency(contract.contractValue)}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <a className="btn btn-secondary py-2" href={amcWhatsappHref(contract)} target="_blank" rel="noreferrer"><Send className="h-4 w-4" />WhatsApp</a>
                      <button className="btn btn-primary py-2" onClick={() => createJob(contract)}>Create Job</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}

export function BookingsPage() {
  const { request } = useAuth();
  const { push } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [source, setSource] = useState('');
  const { data, loading, error, reload } = useResource(() => request('/bookings'), [request]);

  useEffect(() => {
    request('/users').then((result) => setTechnicians(result.users.filter((user) => user.role === 'technician' && user.active))).catch(() => {});
  }, [request]);

  async function convert(bookingId, technicianId) {
    try {
      await preserveScroll(async () => {
        await request('/work-orders', { method: 'POST', body: JSON.stringify({ bookingId, technicianId: technicianId || undefined }) });
        push('Booking converted to service job');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  const bookings = (data.bookings || []).filter((booking) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [
      booking.bookingCode,
      booking.customerName,
      booking.phone,
      booking.device,
      booking.issue
    ].filter(Boolean).join(' ').toLowerCase().includes(term);
    const matchesStatus = !status || booking.status === status;
    const matchesService = !serviceType || `${booking.device || ''} ${booking.issue || ''}`.toLowerCase().includes(serviceType.toLowerCase());
    const matchesSource = !source || bookingSourceValue(booking) === source;
    return matchesSearch && matchesStatus && matchesService && matchesSource;
  });

  return (
    <>
      <PageHeader title="Bookings" eyebrow="Admin" action={<button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" />Create Booking</button>}>
        Booking intake is kept separate from repair and service jobs. Convert a booking when service work begins.
      </PageHeader>
      <div className="surface mb-5 grid gap-3 p-4 lg:grid-cols-[1fr_180px_220px_180px]">
        <SearchBox value={search} onChange={setSearch} placeholder="Search booking, customer, phone, device, issue" />
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option>Pending</option>
          <option>Converted</option>
        </select>
        <select className="input" value={serviceType} onChange={(event) => setServiceType(event.target.value)}>
          <option value="">All service types</option>
          {serviceTypes.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="input" value={source} onChange={(event) => setSource(event.target.value)}>
          <option value="">All sources</option>
          {bookingSources.map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      {!bookings.length ? <EmptyState title="No bookings found" message="Try changing the search or filters, or create the first booking." action={<button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" />Create Booking</button>} /> : (
        <div className="table-wrap bookings-table-wrap bg-[var(--surface)]">
          <table className="data-table bookings-table">
            <colgroup>
              <col className="booking-col-booking" />
              <col className="booking-col-customer" />
              <col className="booking-col-source booking-source-column" />
              <col className="booking-col-device" />
              <col className="booking-col-issue" />
              <col className="booking-col-action" />
            </colgroup>
          <thead>
            <tr><th>Booking</th><th>Customer</th><th className="booking-source-column">Source</th><th>Device / Service</th><th>Issue</th><th>Convert / Open</th></tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td>
                  <span className="block font-bold text-slate-100">{booking.bookingCode}</span>
                  <span className="mt-1 block text-xs font-normal muted">{formatDate(booking.createdAt)}</span>
                </td>
                <td>
                  <span className="block font-semibold text-slate-100">{booking.customerName || 'Customer'}</span>
                  <span className="mt-1 block text-xs muted">Phone: {booking.phone || '-'}</span>
                  <span className="booking-source-inline mt-2"><BookingSourceBadge source={bookingSourceValue(booking)} /></span>
                </td>
                <td className="booking-source-column">
                  <BookingSourceBadge source={bookingSourceValue(booking)} />
                </td>
                <td>
                  <span className="booking-line-clamp font-semibold text-slate-100">{booking.device || booking.serviceType || 'General Service'}</span>
                  {booking.serviceType && booking.serviceType !== booking.device ? <span className="mt-1 block truncate text-xs muted">{booking.serviceType}</span> : null}
                </td>
                <td><span className="booking-line-clamp">{booking.issue || 'No issue captured'}</span></td>
                <td><ConvertBooking booking={booking} technicians={technicians} onConvert={convert} /></td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      )}
      {formOpen ? <BookingModal onClose={() => setFormOpen(false)} onSaved={reload} /> : null}
    </>
  );
}

function ConvertBooking({ booking, technicians, onConvert }) {
  const [technicianId, setTechnicianId] = useState(booking.technicianId?.id || '');
  if (booking.status === 'Converted') {
    return (
      <div className="booking-action-cell">
        {booking.workOrderId ? (
          <Link className="btn btn-secondary booking-action-button" to={`/admin/work-orders/${booking.workOrderId.id || booking.workOrderId}`}>Open Service Job</Link>
        ) : (
          <span className="status-badge booking-action-button justify-center">Converted</span>
        )}
      </div>
    );
  }
  return (
    <div className="booking-convert-controls">
      <select className="input booking-technician-select" value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}>
        <option value="">Unassigned</option>
        {technicians.map((tech) => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
      </select>
      <button type="button" className="btn btn-primary booking-action-button" onClick={() => onConvert(booking.id, technicianId)}>Convert</button>
    </div>
  );
}

function BookingModal({ onClose, onSaved }) {
  const { request } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState({ customerName: '', phone: '', address: '', serviceType: serviceTypes[0] || 'PC / Laptop Service', device: 'Laptop', bookingSource: 'Walk-in Shop', issue: '' });
  const [saving, setSaving] = useState(false);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await request('/bookings', { method: 'POST', body: JSON.stringify(form) });
      push('Booking created');
      onSaved();
      onClose();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4">
      <form className="surface max-h-[92vh] w-full max-w-3xl overflow-y-auto p-5" onSubmit={submit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Create Booking</h2>
            <p className="mt-1 text-sm muted">Capture intake details without changing the existing booking API.</p>
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onClose} aria-label="Close booking modal"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label><span className="label">Customer name</span><input className="input" value={form.customerName} onChange={(event) => update('customerName', event.target.value)} required /></label>
          <label><span className="label">Phone</span><input className="input" value={form.phone} onChange={(event) => update('phone', event.target.value)} required /></label>
          <label>
            <span className="label">Service Type</span>
            <select className="input" value={form.serviceType} onChange={(event) => update('serviceType', event.target.value)}>
              {serviceTypes.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Device / Asset</span>
            <select className="input" value={form.device} onChange={(event) => update('device', event.target.value)}>
              {deviceTypes.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Booking Source</span>
            <select className="input" value={form.bookingSource} onChange={(event) => update('bookingSource', event.target.value)}>
              {bookingSources.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2"><span className="label">Address</span><textarea className="input min-h-24" value={form.address} onChange={(event) => update('address', event.target.value)} /></label>
          <label className="sm:col-span-2"><span className="label">Issue / Requirement</span><textarea className="input min-h-24" value={form.issue} onChange={(event) => update('issue', event.target.value)} required /></label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}><Save className="h-4 w-4" />Save</button>
        </div>
      </form>
    </div>
  );
}

export function WorkOrdersPage({ role = 'admin' }) {
  const { request } = useAuth();
  const { push } = useToast();
  const location = useLocation();
  const statusParam = useMemo(() => new URLSearchParams(location.search).get('status') || '', [location.search]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(statusParam);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [source, setSource] = useState('');
  const [techFilter, setTechFilter] = useState('Today');
  const [technicians, setTechnicians] = useState([]);
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (role === 'admin' && status) params.set('status', status);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (role === 'admin' && technicianId) params.set('technicianId', technicianId);
    return params.toString() ? `?${params}` : '';
  }, [role, status, dateFrom, dateTo, technicianId]);
  const { data, loading, error, reload } = useResource(() => request(`/work-orders${query}`), [request, query]);
  const base = role === 'admin' ? '/admin/work-orders' : '/tech/work-orders';

  useEffect(() => {
    if (role === 'admin') setStatus(statusParam);
  }, [role, statusParam]);

  useEffect(() => {
    if (role === 'admin') request('/users').then((result) => setTechnicians(result.users.filter((user) => user.role === 'technician' && user.active))).catch(() => {});
  }, [request, role]);

  async function autoAssign(id) {
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/auto-assign`, { method: 'POST' });
        push('Service job auto-assigned');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function quickStatus(id, nextStatus) {
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) });
        push('Service job status updated');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  const workOrders = (data.workOrders || []).filter((order) => {
    const searchText = search.trim().toLowerCase();
    const searchable = `${order.customerId?.name || ''} ${order.customerId?.phone || ''} ${order.serviceType || ''} ${order.service || ''} ${order.device || ''} ${order.issue || ''}`.toLowerCase();
    if (searchText && !searchable.includes(searchText)) return false;
    if (source && bookingSourceValue(order) !== source) return false;
    if (!serviceType) return true;
    return `${order.serviceType || ''} ${order.service || ''} ${order.device || ''} ${order.issue || ''}`.toLowerCase().includes(serviceType.toLowerCase());
  });

  if (role === 'technician') {
    return (
      <TechnicianJobsView
        jobs={workOrders}
        search={search}
        setSearch={setSearch}
        filter={techFilter}
        setFilter={setTechFilter}
        quickStatus={quickStatus}
      />
    );
  }

  return (
    <>
      <PageHeader title={role === 'admin' ? 'Repair & Service Jobs' : 'My Repair & Service Jobs'} eyebrow={role === 'admin' ? 'Operations' : 'Technician'}>
        Track active service jobs, repairs, installations, parts, billing, and completion.
      </PageHeader>
      <div className="surface mb-5 grid gap-3 p-4 xl:grid-cols-[1fr_160px_170px_160px_150px_150px_180px]">
        <SearchBox value={search} onChange={setSearch} placeholder="Search customer, phone, device, service, issue" />
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {workOrderDetailStatuses.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="input" value={serviceType} onChange={(event) => setServiceType(event.target.value)}>
          <option value="">All service types</option>
          {serviceTypes.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="input" value={source} onChange={(event) => setSource(event.target.value)}>
          <option value="">All sources</option>
          {bookingSources.map((item) => <option key={item}>{item}</option>)}
        </select>
        <input className="input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <input className="input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        {role === 'admin' ? (
          <select className="input" value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}>
            <option value="">All technicians</option>
            {technicians.map((tech) => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
          </select>
        ) : null}
      </div>
      {!workOrders.length ? <EmptyState title="No repair/service jobs found" message="No jobs match the current search or filters." /> : (
        <Table>
          <thead><tr><th>Customer</th><th className="booking-source-column">Source</th><th>Service / Device</th><th>Technician</th><th>Status</th><th>Invoice / Payment</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {workOrders.map((order) => (
              <tr key={order.id}>
                <td className="font-bold">{role === 'admin' && order.customerId ? <Link className="text-sky-100 hover:text-[var(--brand)]" to={`/admin/customers/${recordId(order.customerId)}`}>{order.customerId?.name}</Link> : order.customerId?.name}<span className="block text-xs muted">{order.customerId?.phone}</span><span className="booking-source-inline mt-2"><BookingSourceBadge source={bookingSourceValue(order)} /></span></td>
                <td className="booking-source-column"><BookingSourceBadge source={bookingSourceValue(order)} /></td>
                <td><span className="font-semibold">{order.serviceType || order.service || 'Service Job'}</span><span className="block text-xs muted">{order.device || '-'}</span><span className="block max-w-xs truncate text-xs muted">{order.issue}</span></td>
                <td>{order.technicianId?.name || 'Unassigned'}</td>
                <td><StatusBadge status={order.status} /></td>
                <td>{order.invoiceId ? <StatusBadge status={order.invoiceId.status} /> : <StatusBadge status="Not Generated" />}</td>
                <td>{formatDate(order.createdAt)}</td>
                <td>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link className="btn btn-secondary py-2" to={`${base}/${order.id}`}>Details</Link>
                    {role === 'admin' && !order.technicianId ? <button type="button" className="btn btn-primary py-2" onClick={() => autoAssign(order.id)}>Assign</button> : null}
                    <label className="min-w-40">
                      <span className="mb-1 block text-[10px] font-black uppercase tracking-wide muted">Update Status</span>
                      <select className="input py-2" value={order.status} onChange={(event) => quickStatus(order.id, event.target.value)}>
                        {workOrderDetailStatuses.map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </label>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}

export function WorkOrderDetailsPage({ role = 'admin' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { request, token } = useAuth();
  const { push } = useToast();
  const [note, setNote] = useState('');
  const [part, setPart] = useState({ partName: '', quantity: 1, unitPrice: 0 });
  const [partRequest, setPartRequest] = useState({ inventoryPartId: '', partName: '', quantity: 1, note: '' });
  const [inventoryParts, setInventoryParts] = useState([]);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [labourCharge, setLabourCharge] = useState(0);
  const [pdfBusy, setPdfBusy] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [photoFiles, setPhotoFiles] = useState([]);
  const { data, loading, error, reload } = useResource(() => request(`/work-orders/${id}`), [request, id]);
  const order = data?.workOrder;

  useEffect(() => {
    if (!order) return;
    setServiceCharge(order.serviceCharge || 0);
    setLabourCharge(order.serviceCharge || 0);
  }, [order?.id, order?.serviceCharge]);

  useEffect(() => {
    request('/inventory').then((result) => setInventoryParts(result.parts || [])).catch(() => {});
  }, [request]);

  async function saveStatus(nextStatus) {
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) });
        push('Status updated');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function addNote(event) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/notes`, { method: 'POST', body: JSON.stringify({ text: note }) });
        setNote('');
        push('Note added');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  function handlePartSelect(value) {
    const selected = inventoryParts.find((item) => item.id === value);
    setPart((current) => ({
      ...current,
      inventoryPartId: value,
      partName: selected?.partName || '',
      unitPrice: selected?.sellingPrice || current.unitPrice,
      quantity: current.quantity || 1
    }));
  }

  function handlePartQuantityChange(value) {
    let quantity = Number(value);
    if (!quantity || quantity < 1) quantity = 1;
    setPart((current) => ({ ...current, quantity }));
  }

  async function addPart(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (!part.inventoryPartId && !String(part.partName || '').trim()) {
      push('Please select a part', 'error');
      return;
    }
    if (selectedPartOutOfStock) {
      push('Out of stock — choose another part for demo', 'error');
      return;
    }

    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/parts`, { method: 'POST', body: JSON.stringify(part) });
        setPart({ partName: '', quantity: 1, unitPrice: 0 });
        push('Part added');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function removePart(partId, event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/parts/${partId}`, { method: 'DELETE' });
        push('Part removed');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function requestPart(event) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/part-requests`, { method: 'POST', body: JSON.stringify(partRequest) });
        setPartRequest({ inventoryPartId: '', partName: '', quantity: 1, note: '' });
        push('Part requested');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function generateInvoice(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    try {
      await preserveScroll(async () => {
        await request('/invoices', { method: 'POST', body: JSON.stringify({ workOrderId: id, labourCharge: serviceCharge || labourCharge }) });
        push('Invoice generated');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function saveServiceCharge(event) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/service-charge`, {
          method: 'PATCH',
          body: JSON.stringify({ serviceCharge })
        });
        push('Service charge updated');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function autoAssignDetail(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/auto-assign`, { method: 'POST' });
        push('Service job auto-assigned');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function downloadPdfFile(type, fallbackFilename) {
    const response = await fetch(`${apiBase}/work-orders/${id}/pdf/${type}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || 'PDF download failed');
    }
    const blob = await response.blob();
    const disposition = response.headers.get('content-disposition') || '';
    const filename = disposition.match(/filename="?([^"]+)"?/i)?.[1] || fallbackFilename;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadWorkflowPdf(flow) {
    try {
      await preserveScroll(async () => {
        setPdfBusy(`download-${flow.type}`);
        await downloadPdfFile(flow.type, flow.filename);
        push(`${flow.title} generated`);
      });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setPdfBusy('');
    }
  }

  async function previewWorkflowPdf(flow) {
    try {
      await preserveScroll(async () => {
        const authToken = token || localStorage.getItem('us_token') || localStorage.getItem('adminToken') || localStorage.getItem('token');
        const response = await fetch(`${apiBase}/work-orders/${id}/pdf/${flow.type}?preview=true`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
        });
        if (!response.ok) throw new Error('PDF preview failed');
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      });
    } catch (err) {
      console.error('PDF preview error:', err);
      push('PDF preview failed. Please login again.', 'error');
    }
  }

  async function sendWorkflowPdf(flow) {
    const phone = order.customerId?.phone || '';
    if (!phone) {
      push('Customer phone number not available', 'error');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    const whatsappPhone = cleanPhone.startsWith('91') ? cleanPhone : `91${cleanPhone}`;
    const message =
      `Hello ${order.customerId?.name || 'Customer'},\n\n` +
      `Your ${getPdfLabel(flow.type)} from Universal Systems is ready.\n\n` +
      `Service: ${order.serviceType || order.service || '-'}\n` +
      `Device: ${order.device || '-'}\n` +
      `Total: ${currency(totalAmount || 0)}\n\n` +
      `Please contact Universal Systems to receive the PDF.\n\n` +
      `Please review and reply with:\n` +
      `APPROVE\n` +
      `DENY\n\n` +
      `Thank you,\nUniversal Systems`;

    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');

    try {
      await preserveScroll(async () => {
        setPdfBusy(`send-${flow.type}`);
        await request(`/work-orders/${id}/documents/${flow.type}/sent`, {
          method: 'PATCH',
          body: JSON.stringify({
            sentVia: 'WhatsApp',
            sentAt: new Date().toISOString()
          })
        });
        push('WhatsApp opened and marked as sent');
        reload({ silent: true });
      });
    } catch (err) {
      push('WhatsApp opened, but status not saved', 'error');
    } finally {
      setPdfBusy('');
    }
  }

  async function handleApproval(approvalStatus) {
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/approval`, {
          method: 'PATCH',
          body: JSON.stringify({ approvalStatus })
        });
        push(approvalStatus === 'approved' ? 'Marked as Approved' : 'Marked as Denied');
        reload({ silent: true });
      });
    } catch (err) {
      push('Failed to update approval', 'error');
    }
  }

  async function uploadPhotos(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!photoFiles.length) {
      push('Select at least one photo', 'error');
      return;
    }

    const formData = new FormData();
    photoFiles.forEach((file) => formData.append('images', file));

    try {
      await preserveScroll(async () => {
        const response = await fetch(`${apiBase}/work-orders/${id}/images`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || 'Photo upload failed');
        setPhotoFiles([]);
        push('Photo uploaded');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  const partsTotal = (order.partsUsed || []).reduce((sum, item) => sum + Number(item.total || 0), 0);
  const savedServiceCharge = Number(order.serviceCharge || 0);
  const currentServiceCharge = Number(serviceCharge || 0);
  const totalAmount = partsTotal + currentServiceCharge;
  const imageItems = (order.images?.length ? order.images : order.bookingId?.problemImage?.url ? [order.bookingId.problemImage] : []) || [];
  const rawCustomerId = recordId(order.customerId) || recordId(order.bookingId) || order.id || order._id || '';
  const customerId = `US-${String(rawCustomerId).slice(-4).toUpperCase()}`;
  const livePartTotal = Number(part.unitPrice || 0) * Number(part.quantity || 1);
  const selectedInventoryPart = inventoryParts.find((item) => item.id === part.inventoryPartId);
  const selectedPartAvailable = Number(selectedInventoryPart?.available || 0);
  const selectedPartOutOfStock = Boolean(selectedInventoryPart && selectedPartAvailable <= 0);
  const contentTabs = ['parts', 'partRequests', 'billing', 'notes'];
  const sideTabs = ['documents', 'timeline'];
  const phone = customerPhone(order);

  if (role === 'technician') {
    return (
      <div className="work-order-detail pb-28 sm:pb-0">
        <PageHeader
          title="Technician Job"
          eyebrow={bookingLabel(order)}
          action={(
            <div className="flex flex-wrap gap-2">
              <a className={`btn btn-secondary ${phone ? '' : 'pointer-events-none opacity-50'}`} href={callHref(phone)}><PhoneCallIcon className="h-4 w-4" />Call</a>
              <a className={`btn btn-primary ${phone ? '' : 'pointer-events-none opacity-50'}`} href={technicianWhatsAppHref(order)} target="_blank" rel="noreferrer"><Send className="h-4 w-4" />WhatsApp</a>
            </div>
          )}
        >
          {order.customerId?.name || 'Customer'} - {order.device || 'Service job'}
        </PageHeader>

        <div className="surface mb-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Assigned Repair & Service Job</p>
              <h2 className="mt-1 text-2xl font-black">{bookingLabel(order)}</h2>
              <p className="mt-1 text-sm muted">{order.issue || 'No issue captured'}</p>
            </div>
            <StatusBadge status={order.status} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Customer', order.customerId?.name || '-'],
              ['Phone', phone || '-'],
              ['Service Type', order.serviceType || order.service || '-'],
              ['Device', order.device || '-'],
              ['Priority', jobPriority(order)],
              ['Scheduled', jobScheduleLabel(order)],
              ['Technician', order.technicianId?.name || 'Assigned technician'],
              ['Created', formatDate(order.createdAt)]
            ].map(([label, value]) => (
              <div key={label} className="rounded-card bg-[var(--surface-2)] p-3">
                <p className="label">{label}</p>
                <p className="mt-1 text-sm font-bold">{value}</p>
              </div>
            ))}
          </div>
          {order.customerId?.address ? (
            <div className="mt-3 rounded-card bg-[var(--surface-2)] p-3">
              <p className="label">Address</p>
              <p className="mt-1 text-sm font-bold leading-6">{order.customerId.address}</p>
            </div>
          ) : null}
        </div>

        <div className="surface sticky top-20 z-20 mb-4 p-3">
          <div className="tabs-list">
            {technicianWorkOrderTabs.map((tab) => (
              <button key={tab.id} type="button" className={`tab-button ${activeTab === tab.id ? 'tab-button-active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' ? (
          <div className="grid gap-4 xl:grid-cols-[1fr_.8fr]">
            <div className="surface p-4">
              <h2 className="text-xl font-black">Overview</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ['Work Order ID', bookingLabel(order)],
                  ['Customer ID', customerId],
                  ['Customer name', order.customerId?.name || '-'],
                  ['Phone', phone || '-'],
                  ['Service', order.serviceType || order.service || '-'],
                  ['Device', order.device || '-'],
                  ['Problem / Issue', order.issue || '-'],
                  ['Booking Source', bookingSourceValue(order)],
                  ['Status', <StatusBadge status={order.status} />],
                  ['Completed Date', order.completedAt ? formatDate(order.completedAt) : 'Not completed']
                ].map(([label, value]) => (
                  <div key={label} className="rounded-card bg-[var(--surface-2)] p-3">
                    <p className="label">{label}</p>
                    <div className="mt-1 text-sm font-bold leading-5">{value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="surface p-4">
              <h2 className="text-xl font-black">Quick Contact</h2>
              <div className="mt-4 grid gap-3">
                <a className={`btn btn-secondary btn-lg ${phone ? '' : 'pointer-events-none opacity-50'}`} href={callHref(phone)}><PhoneCallIcon className="h-4 w-4" />Call Customer</a>
                <a className={`btn btn-primary btn-lg ${phone ? '' : 'pointer-events-none opacity-50'}`} href={technicianWhatsAppHref(order)} target="_blank" rel="noreferrer"><Send className="h-4 w-4" />Open WhatsApp</a>
                <Link className="btn btn-secondary btn-lg" to="/tech/work-orders">Back to My Jobs</Link>
              </div>
            </div>
            <WorkflowTracker status={order.status} />
          </div>
        ) : null}

        {activeTab === 'workUpdate' ? (
          <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
            <div className="surface p-4">
              <h2 className="text-xl font-black">Status Update</h2>
              <p className="mt-1 text-sm muted">Use the existing service job status workflow.</p>
              <div className="mt-4 grid gap-2">
                {technicianAllowedStatuses.map((status) => (
                  <button key={status} type="button" className={`btn ${order.status === status ? 'btn-primary' : 'btn-secondary'} justify-start`} onClick={() => saveStatus(status)}>
                    <CheckCircle2 className="h-4 w-4" />{status}
                  </button>
                ))}
              </div>
            </div>
            <form className="surface p-4" onSubmit={addNote}>
              <h2 className="text-xl font-black">Checklist / Work Update</h2>
              <p className="mt-1 text-sm muted">Add diagnosis, work done, customer instructions, or follow-up notes.</p>
              <textarea className="input mt-4 min-h-36" placeholder="Diagnosis / work update / follow-up needed" value={note} onChange={(event) => setNote(event.target.value)} />
              <button type="submit" className="btn btn-primary mt-3 w-full sm:w-auto">Add Work Update</button>
            </form>
          </div>
        ) : null}

        {activeTab === 'parts' ? (
          <div className="grid gap-4">
            <div className="surface p-4">
              <h2 className="text-xl font-black">Parts Used</h2>
              <div className="mt-4 grid gap-3">
                {order.partsUsed?.length ? order.partsUsed.map((item) => (
                  <div key={item._id || item.createdAt} className="rounded-card bg-[var(--surface-2)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-black">{item.name}</p>
                      <span className="status-badge">Qty {item.quantity}</span>
                    </div>
                    <p className="mt-1 text-sm muted">Unit: {currency(item.unitPrice)} - Total: {currency(item.total)}</p>
                  </div>
                )) : <EmptyState title="No parts added yet." message="Parts used for this service job will appear here." />}
              </div>
            </div>
            <div className="surface p-4">
              <h2 className="text-xl font-black">Add Part</h2>
              <form className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_auto_auto]" onSubmit={addPart}>
                <select className="input" value={part.inventoryPartId || ''} onChange={(event) => handlePartSelect(event.target.value)}>
                  <option value="">Manual part</option>
                  {inventoryParts.map((item) => <option key={item.id} value={item.id}>{item.partName} - {item.available} available</option>)}
                </select>
                <input className="input" type="number" min="1" value={part.quantity} onChange={(event) => handlePartQuantityChange(event.target.value)} />
                <div className="rounded-card bg-[var(--surface-2)] px-3 py-2">
                  <p className="text-xs muted">Line Total</p>
                  <p className="text-sm font-black">{currency(livePartTotal)}</p>
                </div>
                <button type="submit" className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={selectedPartOutOfStock}><PackagePlus className="h-4 w-4" />Add Part</button>
              </form>
              {!part.inventoryPartId ? <input className="input mt-3" placeholder="Manual part name" value={part.partName} onChange={(event) => setPart((current) => ({ ...current, partName: event.target.value }))} /> : null}
              {selectedInventoryPart ? <p className="mt-3 text-sm muted">Using inventory price: {currency(part.unitPrice)}. Stock will be handled by the backend ledger.</p> : null}
              {selectedPartOutOfStock ? <p className="mt-2 text-sm font-semibold text-rose-100">Out of stock — choose another part for demo</p> : null}
              {selectedInventoryPart && selectedPartAvailable > 0 && Number(part.quantity || 0) > selectedPartAvailable ? <p className="mt-2 text-sm font-semibold text-amber-100">Stock warning: only {selectedPartAvailable} available. Backend stock rules will validate this when saved.</p> : null}
              <div className="mt-4 rounded-card bg-emerald-400/10 p-3 text-emerald-100">
                <p className="text-sm font-bold">Parts total: {currency(partsTotal)}</p>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'partRequests' ? (
          <div className="grid gap-4">
            <div className="surface p-4">
              <h2 className="text-xl font-black">Part Requests</h2>
              <div className="mt-4 grid gap-3">
                {order.partRequests?.length ? order.partRequests.map((item) => (
                  <div key={item._id || item.createdAt} className="rounded-card bg-[var(--surface-2)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-black">{item.name} x {item.quantity}</p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 text-sm muted">{item.note || 'No request note'}</p>
                    <p className="mt-1 text-xs muted">Requested by {item.userId?.name || item.userId?.username || 'Team'} - {formatDate(item.createdAt)}</p>
                  </div>
                )) : <EmptyState title="No part requests yet." message="Request parts when inventory or approval is needed." />}
              </div>
            </div>
            <form className="surface p-4" onSubmit={requestPart}>
              <h2 className="text-xl font-black">Request Part</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_110px_auto]">
                <select className="input" value={partRequest.inventoryPartId} onChange={(event) => {
                  const selected = inventoryParts.find((item) => item.id === event.target.value);
                  setPartRequest((current) => ({ ...current, inventoryPartId: event.target.value, partName: selected?.partName || '' }));
                }}>
                  <option value="">Manual request</option>
                  {inventoryParts.map((item) => <option key={item.id} value={item.id}>{item.partName} - {item.available} available</option>)}
                </select>
                <input className="input" type="number" min="1" value={partRequest.quantity} onChange={(event) => setPartRequest((current) => ({ ...current, quantity: event.target.value }))} />
                <button type="submit" className="btn btn-primary"><PackagePlus className="h-4 w-4" />Request</button>
              </div>
              {!partRequest.inventoryPartId ? <input className="input mt-3" placeholder="Requested part name" value={partRequest.partName} onChange={(event) => setPartRequest((current) => ({ ...current, partName: event.target.value }))} /> : null}
              <textarea className="input mt-3 min-h-24" placeholder="Reason / note" value={partRequest.note} onChange={(event) => setPartRequest((current) => ({ ...current, note: event.target.value }))} />
            </form>
          </div>
        ) : null}

        {activeTab === 'notes' ? (
          <div className="grid gap-4">
            <form className="surface p-4" onSubmit={addNote}>
              <h2 className="text-xl font-black">Technician Notes</h2>
              <textarea className="input mt-4 min-h-28" placeholder="Diagnosis, work done, customer instruction, follow-up needed" value={note} onChange={(event) => setNote(event.target.value)} />
              <button type="submit" className="btn btn-primary mt-3">Add Note</button>
            </form>
            <div className="surface p-4">
              <div className="grid gap-3">
                {order.notes?.length ? order.notes.map((item) => <div key={item._id || item.createdAt} className="rounded-card bg-[var(--surface-2)] p-3"><p>{item.text}</p><p className="mt-1 text-xs muted">{item.userId?.name || item.userId?.username || 'Team'} - {formatDate(item.createdAt)}</p></div>) : <EmptyState title="No technician notes yet." message="Add diagnosis, customer instruction, or work completion notes." />}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'photos' ? (
          <div className="grid gap-4">
            <div className="surface p-4">
              <h2 className="text-xl font-black">Photos / Problem Image</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {imageItems.length ? imageItems.map((image, index) => (
                  <a key={image.url || image.filename || index} className="rounded-card border border-[var(--line)] bg-[var(--surface-2)] p-4 transition hover:border-sky-300/60" href={uploadedAssetUrl(image.url)} target="_blank" rel="noreferrer">
                    <FileText className="mb-3 h-5 w-5 text-[var(--brand)]" />
                    <p className="font-black">{index === 0 ? 'Customer problem image' : `Service photo ${index}`}</p>
                    <p className="mt-1 text-sm muted">{image.originalName || image.filename || `Image ${index + 1}`}</p>
                  </a>
                )) : <EmptyState title="No image uploaded" message="Customer problem images and technician photos will appear here." />}
              </div>
            </div>
            <form className="surface p-4" onSubmit={uploadPhotos}>
              <h2 className="text-xl font-black">Upload Technician Photos</h2>
              <p className="mt-1 text-sm muted">Before service, after service, or other job attachments.</p>
              <input className="input mt-4" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => setPhotoFiles(Array.from(event.target.files || []))} />
              <button type="submit" className="btn btn-primary mt-3"><PackagePlus className="h-4 w-4" />Upload Photos</button>
            </form>
          </div>
        ) : null}

        {activeTab === 'documents' ? (
          <div className="surface p-4">
            <h2 className="text-xl font-black">Documents</h2>
            <p className="mt-1 text-sm muted">Technicians can view or download allowed PDFs. Billing and payment edits stay in admin.</p>
            <div className="mt-4 grid gap-3">
              {workOrderPdfFlows.map((flow) => {
                const enabled = pdfAllowed(flow, order);
                const downloading = pdfBusy === `download-${flow.type}`;
                return (
                  <div key={flow.type} className={`rounded-card border border-[var(--line)] bg-[var(--surface-2)] p-4 ${enabled ? '' : 'opacity-70'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black">{flow.title}</h3>
                        <p className="mt-1 text-xs font-semibold muted">Status requirement: {flow.statusText}</p>
                      </div>
                      <span className={`rounded px-2 py-1 text-xs font-bold ${enabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-100'}`}>{enabled ? 'Ready' : 'Locked'}</span>
                    </div>
                    <p className="mt-2 text-sm muted">{enabled ? flow.readyText : pdfLockedReason(flow, order)}</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <button type="button" className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50" disabled={!enabled || Boolean(pdfBusy)} onClick={() => previewWorkflowPdf(flow)}><FileText className="h-4 w-4" />Preview PDF</button>
                      <button type="button" className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50" disabled={!enabled || Boolean(pdfBusy)} onClick={() => downloadWorkflowPdf(flow)}>{downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Download PDF</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-sky-300/20 bg-[#061426]/95 p-3 shadow-2xl backdrop-blur sm:hidden">
          <div className="grid grid-cols-3 gap-2">
            <a className={`btn btn-secondary px-2 ${phone ? '' : 'pointer-events-none opacity-50'}`} href={callHref(phone)}><PhoneCallIcon className="h-4 w-4" />Call</a>
            <a className={`btn btn-secondary px-2 ${phone ? '' : 'pointer-events-none opacity-50'}`} href={technicianWhatsAppHref(order)} target="_blank" rel="noreferrer"><Send className="h-4 w-4" />WhatsApp</a>
            <button type="button" className="btn btn-primary px-2" onClick={() => saveStatus(order.status === 'Completed' ? 'Returned' : 'Completed')}><CheckCircle2 className="h-4 w-4" />Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="work-order-detail">
      <PageHeader title={bookingLabel(order)} eyebrow="Repair & Service Job Details">
        {order.customerId?.name || 'Customer'} - {order.device || 'Service job'}
      </PageHeader>

      <div className="surface mb-4 p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Repair & Service Job</p>
            <h2 className="mt-1 text-2xl font-black">{bookingLabel(order)}</h2>
            <p className="mt-1 text-sm muted">{order.customerId?.name || 'Customer'} - {order.issue || 'No issue captured'}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Work Order ID', bookingLabel(order)],
            ['Customer', order.customerId?.name || '-'],
            ['Phone', order.customerId?.phone || '-'],
            ['Service Type', order.serviceType || order.service || '-'],
            ['Device', order.device || '-'],
            ['Status', <StatusBadge status={order.status} />],
            ['Priority', order.priority || (order.status === 'Awaiting Parts' ? 'High' : 'Normal')],
            ['Technician', order.technicianId?.name || 'Unassigned'],
            ['Created', formatDate(order.createdAt)],
            ['Completed', order.completedAt ? formatDate(order.completedAt) : 'Not completed']
          ].map(([label, value]) => (
            <div key={label} className="rounded-card bg-[var(--surface-2)] p-3">
              <p className="label">{label}</p>
              <p className="mt-1 text-sm font-bold">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="surface sticky top-20 z-20 mb-4 p-3">
        <div className="tabs-list">
          {workOrderTabs.map((tab) => (
            <button key={tab.id} type="button" className={`tab-button ${activeTab === tab.id ? 'tab-button-active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' ? <div className="grid gap-4">
      <div className="surface p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">Overview</h2>
            <p className="mt-1 text-sm muted">Customer, device, issue, assignment, and status controls.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            ['Customer ID', customerId],
            ['Service', order.serviceType || order.service || order.device || '-'],
            ['Customer Name', order.customerId?.name || '-'],
            ['Device', order.device || '-'],
            ['Phone', order.customerId?.phone || '-'],
            ['Problem', order.issue || '-'],
            ['Image', imageItems.length ? imageItems.map((image, index) => (
              <a key={image.url || image.filename || index} className="block text-sky-100 hover:text-[var(--brand)]" href={uploadedAssetUrl(image.url)} target="_blank" rel="noreferrer">
                {image.originalName || image.filename || `Image ${index + 1}`}
              </a>
            )) : 'No image uploaded'],
            ['Priority', order.priority || (order.status === 'Awaiting Parts' ? 'High' : 'Normal')],
            ['Technician', order.technicianId?.name || 'Unassigned'],
            ['Status', <StatusBadge status={order.status} />],
            ['Created Date', formatDate(order.createdAt)],
            ['Completed Date', order.completedAt ? formatDate(order.completedAt) : 'Not completed'],
            ['Booking Source', bookingSourceValue(order)]
          ].map(([label, value]) => (
            <div key={label} className="rounded-card bg-[var(--surface-2)] p-3">
              <p className="label">{label}</p>
              <div className="mt-1 text-sm font-bold leading-5">{value}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3">
          <div>
            <span className="label">Status Buttons</span>
            <div className="flex flex-wrap gap-2">
              {workOrderDetailStatuses.map((item) => (
                <button key={item} type="button" className={`btn ${order.status === item ? 'bg-blue-500 text-white shadow-lg ring-1 ring-blue-200/50 hover:bg-blue-400' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'} px-4 py-2.5 text-sm font-semibold rounded-card`} onClick={() => saveStatus(item)}>
                  {item}
                </button>
              ))}
              {role === 'admin' && !order.technicianId ? <button type="button" className="btn btn-secondary" onClick={autoAssignDetail}>Auto Assign Technician</button> : null}
            </div>
          </div>
        </div>
      </div>
      <WorkflowTracker status={order.status} />
      </div> : null}

      {activeTab !== 'overview' ? <div className={`grid gap-4 ${sideTabs.includes(activeTab) ? '' : 'xl:grid-cols-[minmax(0,1fr)]'}`}>
        <div className={contentTabs.includes(activeTab) ? 'grid gap-4' : 'hidden'}>
          <div className={activeTab === 'parts' ? 'surface p-4' : 'hidden'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black">Parts Used</h2>
            </div>
            <div className="mt-4 table-wrap bg-[var(--surface)]">
              <table className="data-table">
                <thead><tr><th>Part Name</th><th>Quantity</th><th>Unit Price</th><th>Total</th><th>Delete</th></tr></thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {order.partsUsed?.length ? order.partsUsed.map((item) => (
                    <tr key={item._id || item.createdAt}>
                      <td className="font-bold">{item.name}</td><td>{item.quantity}</td><td>{currency(item.unitPrice)}</td><td className="font-black">{currency(item.total)}</td>
                      <td><button type="button" className="icon-button h-9 w-9" onClick={(event) => removePart(item._id, event)} aria-label={`Delete ${item.name}`}><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  )) : <tr><td colSpan="5" className="muted">No parts added yet.</td></tr>}
                  <tr>
                    <td colSpan="5">
                      <form className="flex flex-col gap-3 md:flex-row md:items-center" onSubmit={(event) => event.preventDefault()}>
                        <select className="input flex-1" value={part.inventoryPartId || ''} onChange={(event) => handlePartSelect(event.target.value)}>
                          <option value="">Manual part</option>
                          {inventoryParts.map((item) => <option key={item.id} value={item.id}>{item.partName} - {item.available} available</option>)}
                        </select>
                        <input className="input md:w-20" type="number" min="1" value={part.quantity} onChange={(event) => handlePartQuantityChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addPart(event); }} />
                        <input className="input md:w-28" type="number" min="0" value={part.unitPrice} onChange={(event) => setPart((current) => ({ ...current, unitPrice: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') addPart(event); }} />
                        <div className="rounded-card bg-[var(--surface-2)] px-3 py-2 text-right md:w-28">
                          <p className="text-xs muted">Line Total</p>
                          <p className="text-sm font-black">{currency(livePartTotal)}</p>
                        </div>
                        <button type="button" className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={selectedPartOutOfStock} onClick={addPart}><PackagePlus className="h-4 w-4" />+ Add Part</button>
                      </form>
                      {!part.inventoryPartId ? <input className="input mt-3" placeholder="Manual part name" value={part.partName} onChange={(event) => setPart((current) => ({ ...current, partName: event.target.value }))} /> : null}
                      {selectedPartOutOfStock ? <p className="mt-3 text-sm font-semibold text-rose-100">Out of stock — choose another part for demo</p> : null}
                      {selectedInventoryPart && selectedPartAvailable > 0 && Number(part.quantity || 0) > selectedPartAvailable ? <p className="mt-3 text-sm font-semibold text-amber-100">Stock warning: only {selectedPartAvailable} available. Backend stock rules will validate this when saved.</p> : null}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-4 pt-4 border-t border-gray-700">
              <div className="text-right">
                <p className="text-sm text-gray-400">Total Amount</p>
                <p className="text-2xl font-bold text-green-400">
                  {currency(partsTotal)}
                </p>
              </div>
            </div>
          </div>

          <div className={activeTab === 'partRequests' ? 'surface p-4' : 'hidden'}>
            <h2 className="text-xl font-black">Part Requests</h2>
            <div className="mt-4 grid gap-2">
              {order.partRequests?.length ? order.partRequests.map((item) => (
                <div key={item._id || item.createdAt} className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-[var(--surface-2)] p-3">
                  <span className="font-bold">
                    {item.name} x {item.quantity}
                    <span className="block text-xs font-normal muted">{item.note || 'No note'}</span>
                    <span className="block text-xs font-normal muted">Requested by {item.userId?.name || item.userId?.username || (item.userId ? 'Recorded user' : '-')} - {formatDate(item.createdAt)}</span>
                  </span>
                  <StatusBadge status={item.status} />
                </div>
              )) : <p className="text-sm muted">No part requests yet.</p>}
            </div>
            <form className="mt-4 grid gap-3 md:grid-cols-[1fr_110px_auto]" onSubmit={requestPart}>
              <select className="input" value={partRequest.inventoryPartId} onChange={(event) => {
                const selected = inventoryParts.find((item) => item.id === event.target.value);
                setPartRequest((current) => ({ ...current, inventoryPartId: event.target.value, partName: selected?.partName || '' }));
              }}>
                <option value="">Manual request</option>
                {inventoryParts.map((item) => <option key={item.id} value={item.id}>{item.partName} - {item.available} available</option>)}
              </select>
              <input className="input" type="number" min="1" value={partRequest.quantity} onChange={(event) => setPartRequest((current) => ({ ...current, quantity: event.target.value }))} />
              <button type="submit" className="btn btn-secondary"><PackagePlus className="h-4 w-4" />Request Part</button>
            </form>
            {!partRequest.inventoryPartId ? <input className="input mt-3" placeholder="Requested part name" value={partRequest.partName} onChange={(event) => setPartRequest((current) => ({ ...current, partName: event.target.value }))} /> : null}
            <input className="input mt-3" placeholder="Request note" value={partRequest.note} onChange={(event) => setPartRequest((current) => ({ ...current, note: event.target.value }))} />
          </div>

          <form className={activeTab === 'billing' ? 'surface p-4' : 'hidden'} onSubmit={saveServiceCharge}>
            <h2 className="text-xl font-black">Service Charge</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <input className="input" type="number" min="0" step="0.01" value={serviceCharge} onChange={(event) => setServiceCharge(event.target.value)} />
              <button type="submit" className="btn btn-primary"><Save className="h-4 w-4" />Save Charge</button>
            </div>
            {savedServiceCharge !== currentServiceCharge ? <p className="mt-2 text-xs font-semibold text-amber-100">Unsaved service charge will update the saved total after saving.</p> : null}
          </form>

          <div className={activeTab === 'billing' ? 'surface p-4' : 'hidden'}>
            <h2 className="text-xl font-black">Summary</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-card bg-[var(--surface-2)] p-4"><p className="text-sm muted">Parts Total</p><p className="mt-2 text-xl font-black">{currency(partsTotal)}</p></div>
              <div className="rounded-card bg-[var(--surface-2)] p-4"><p className="text-sm muted">Service Charge</p><p className="mt-2 text-xl font-black">{currency(currentServiceCharge)}</p></div>
              <div className="rounded-card border border-green-500 bg-green-900/30 p-4 text-emerald-50"><p className="text-sm text-gray-400">Total Amount</p><p className="mt-2 text-2xl font-bold text-green-400">{currency(totalAmount)}</p></div>
            </div>
            <div className="mt-5 rounded-card bg-[var(--surface-2)] p-4">
              <h3 className="font-black">Invoice</h3>
              {order.invoiceId ? (
                <div className="mt-3">
                  <p className="font-bold">{order.invoiceId.invoiceNumber}</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-card bg-[var(--surface)] p-3">
                      <p className="text-xs font-bold muted">Invoice Status</p>
                      <div className="mt-2"><StatusBadge status={order.invoiceId.status} /></div>
                    </div>
                    <div className="rounded-card bg-emerald-500/10 p-3 text-emerald-100">
                      <p className="text-xs font-bold text-emerald-200/80">Paid Amount</p>
                      <p className="mt-2 text-lg font-black">{currency(order.invoiceId.paidAmount)}</p>
                    </div>
                    <div className={`rounded-card p-3 ${Number(order.invoiceId.balance || 0) > 0 ? 'bg-amber-500/10 text-amber-100' : 'bg-emerald-500/10 text-emerald-100'}`}>
                      <p className="text-xs font-bold opacity-80">Balance Amount</p>
                      <p className="mt-2 text-lg font-black">{currency(order.invoiceId.balance)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {role === 'admin' ? <button type="button" className="btn btn-secondary py-2" onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const invoice = order.invoiceId;
                      const targetInvoiceId = invoice.id || invoice._id || invoice.invoiceId || invoice.number;
                      if (!targetInvoiceId) {
                        alert('Invoice not found. Please generate invoice first.');
                        return;
                      }
                      navigate(`/admin/payments?invoiceId=${encodeURIComponent(targetInvoiceId)}`);
                    }}>Go to Payments</button> : null}
                  </div>
                </div>
              ) : role === 'admin' ? (
                <button type="button" className="btn btn-primary mt-3" onClick={generateInvoice}><ReceiptText className="h-4 w-4" />Generate Invoice</button>
              ) : <p className="mt-3 text-sm muted">Invoice not generated yet.</p>}
            </div>
          </div>

          <div className={activeTab === 'notes' ? 'surface p-4' : 'hidden'}>
            <h2 className="text-xl font-black">Notes</h2>
            <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={addNote}>
              <input className="input" placeholder="Add technician note" value={note} onChange={(event) => setNote(event.target.value)} />
              <button type="submit" className="btn btn-primary">Add Note</button>
            </form>
            <div className="mt-4 grid gap-3">{order.notes?.length ? order.notes.map((item) => <div key={item._id || item.createdAt} className="rounded-card bg-[var(--surface-2)] p-3"><p>{item.text}</p><p className="mt-1 text-xs muted">{item.userId?.name || item.userId?.username || (item.userId ? 'Recorded user' : 'Team')} - {formatDate(item.createdAt)}</p></div>) : <p className="text-sm muted">No notes yet.</p>}</div>
          </div>
        </div>
        <div className={sideTabs.includes(activeTab) ? 'grid content-start gap-4' : 'hidden'}>
          <div className={activeTab === 'documents' ? 'surface p-4' : 'hidden'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black">PDF Workflow</h2>
              {role === 'admin' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold muted">Approval: {order.approvalStatus || 'pending'}</span>
                  <button type="button" className="rounded bg-green-600 px-3 py-1 text-sm font-bold text-white" onClick={() => handleApproval('approved')}>Approve</button>
                  <button type="button" className="rounded bg-red-600 px-3 py-1 text-sm font-bold text-white" onClick={() => handleApproval('denied')}>Deny</button>
                </div>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3">
              {workOrderPdfFlows.map((flow) => {
                const enabled = pdfAllowed(flow, order);
                const downloading = pdfBusy === `download-${flow.type}`;
                const sending = pdfBusy === `send-${flow.type}`;
                return (
                  <div key={flow.type} className={`rounded-card border border-[var(--line)] bg-[var(--surface-2)] p-4 ${enabled ? '' : 'opacity-70'}`}>
                    <div className="flex items-start justify-between gap-3"><div><h3 className="font-black">{flow.title}</h3><p className="mt-1 text-xs font-semibold muted">Status requirement: {flow.statusText}</p></div><FileText className="h-5 w-5 shrink-0 text-[var(--brand)]" /></div>
                    <span className={`mt-3 inline-flex rounded px-2 py-1 text-xs font-bold ${enabled ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-100'}`}>
                      {enabled ? 'Ready' : 'Locked'}
                    </span>
                    <p className="mt-2 text-sm muted">{enabled ? flow.readyText : pdfLockedReason(flow, order)}</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <button type="button" className="btn btn-secondary px-3 disabled:cursor-not-allowed disabled:opacity-50" disabled={!enabled || Boolean(pdfBusy)} onClick={() => previewWorkflowPdf(flow)}><FileText className="h-4 w-4" />Preview PDF</button>
                      <button type="button" className="btn btn-secondary px-3 disabled:cursor-not-allowed disabled:opacity-50" disabled={!enabled || Boolean(pdfBusy)} onClick={() => downloadWorkflowPdf(flow)}>{downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Download PDF</button>
                      <button type="button" className="btn btn-primary px-3 disabled:cursor-not-allowed disabled:opacity-50" disabled={!enabled || Boolean(pdfBusy)} onClick={() => sendWorkflowPdf(flow)}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}WhatsApp</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={activeTab === 'timeline' ? 'surface p-4' : 'hidden'}>
            <h2 className="text-xl font-black">Timeline</h2>
            <div className="mt-4 grid gap-3">{order.timeline?.length ? order.timeline.map((item) => <div key={item.createdAt} className="rounded-card border border-[var(--line)] p-3"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-sky-400/15 px-2.5 py-1 text-xs font-black text-sky-100">{timelineIcon(item)}</span><StatusBadge status={item.status} /></div><p className="mt-2 text-sm">{item.message}</p><p className="mt-1 text-xs muted">{formatDate(item.createdAt)}</p></div>) : <p className="text-sm muted">No timeline entries yet.</p>}</div>
          </div>
        </div>
      </div> : null}
    </div>
  );
}


export function CustomersPage() {
  const { request } = useAuth();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerType, setCustomerType] = useState('');
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return params.toString() ? `?${params}` : '';
  }, [dateFrom, dateTo]);
  const { data, loading, error } = useResource(async () => {
    const [customers, workOrders, invoices] = await Promise.all([
      request(`/customers${query}`),
      request('/work-orders'),
      request('/invoices')
    ]);
    return {
      customers: customers.customers || [],
      workOrders: workOrders.workOrders || [],
      invoices: invoices.invoices || []
    };
  }, [request, query]);

  const customers = data?.customers || [];
  const workOrders = data?.workOrders || [];
  const invoices = data?.invoices || [];
  const metricsByCustomer = useMemo(() => {
    const map = new Map();
    customers.forEach((customer) => {
      map.set(recordId(customer), { jobs: [], invoices: [] });
    });
    workOrders.forEach((order) => {
      const customerId = recordId(order.customerId);
      if (!customerId) return;
      if (!map.has(customerId)) map.set(customerId, { jobs: [], invoices: [] });
      map.get(customerId).jobs.push(order);
    });
    invoices.forEach((invoice) => {
      const customerId = recordId(invoice.customerId);
      if (!customerId) return;
      if (!map.has(customerId)) map.set(customerId, { jobs: [], invoices: [] });
      map.get(customerId).invoices.push(invoice);
    });
    return map;
  }, [customers, workOrders, invoices]);

  const hasCustomerTypes = customers.some((customer) => customerTypeLabel(customer));
  const visibleCustomers = customers.filter((customer) => {
    const metrics = metricsByCustomer.get(recordId(customer)) || { jobs: [], invoices: [] };
    if (customerType && customerTypeLabel(customer) !== customerType) return false;
    const searchText = search.trim().toLowerCase();
    if (!searchText) return true;
    const haystack = [
      customer.name,
      customer.phone,
      customer.address,
      customer.devices?.join(' '),
      customerTypeLabel(customer),
      ...metrics.jobs.map((order) => `${bookingLabel(order)} ${order.device || ''} ${order.issue || ''} ${order.status || ''}`),
      ...metrics.invoices.map((invoice) => `${invoice.invoiceNumber || ''} ${invoice.status || ''}`)
    ].join(' ').toLowerCase();
    return haystack.includes(searchText);
  });

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <PageHeader title="Customers" eyebrow="CRM">Manage customer profiles, service history, devices, invoices, and payments.</PageHeader>
      <div className="surface mb-5 grid gap-3 p-4 xl:grid-cols-[1fr_190px_160px_160px]">
        <SearchBox value={search} onChange={setSearch} placeholder="Search customer name, phone, device, invoice, booking" />
        <select className="input" value={customerType} onChange={(event) => setCustomerType(event.target.value)} disabled={!hasCustomerTypes}>
          <option value="">{hasCustomerTypes ? 'All customer types' : 'Customer type unavailable'}</option>
          {['Individual', 'Business', 'AMC Customer'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <input className="input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <input className="input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
      </div>
      {!visibleCustomers.length ? <EmptyState title="No customers found" message="Customer records matching your filters will appear here." action={<Link className="btn btn-primary" to="/admin/bookings">Create Booking</Link>} /> : (
        <Table>
          <thead><tr><th>Customer Name</th><th>Phone</th><th>Devices / Services</th><th>Active Jobs</th><th>Pending Balance</th><th>Total Spent</th><th>Created Date</th><th>Action</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {visibleCustomers.map((customer) => {
              const metrics = metricsByCustomer.get(recordId(customer)) || { jobs: [], invoices: [] };
              const activeJobs = metrics.jobs.filter(isActiveJob);
              const pendingBalance = metrics.invoices.reduce((sum, invoice) => sum + Number(invoice.balance || 0), 0);
              const totalSpent = metrics.invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount || 0), 0);
              const devices = [...new Set([...(customer.devices || []), ...metrics.jobs.map((order) => order.device).filter(Boolean)])];
              return (
                <tr key={customer.id}>
                  <td className="font-bold">
                    <Link className="text-sky-100 hover:text-[var(--brand)]" to={`/admin/customers/${customer.id}`}>{customer.name}</Link>
                    <span className="mt-1 block text-xs muted">{customerTypeLabel(customer) || customerCode(customer)}</span>
                  </td>
                  <td>{customer.phone || '-'}</td>
                  <td>{devices.length ? <div className="flex max-w-md flex-wrap gap-1.5">{devices.slice(0, 3).map((device) => <span key={device} className="status-badge">{device}</span>)}{devices.length > 3 ? <span className="status-badge">+{devices.length - 3}</span> : null}</div> : '-'}</td>
                  <td><StatusBadge status={activeJobs.length ? `${activeJobs.length} Active` : 'No Active Jobs'} /></td>
                  <td className={pendingBalance > 0 ? 'font-black text-amber-100' : 'muted'}>{currency(pendingBalance)}</td>
                  <td className="font-bold">{currency(totalSpent)}</td>
                  <td>{formatDate(customer.createdAt)}</td>
                  <td><Link className="btn btn-secondary py-2" to={`/admin/customers/${customer.id}`}>View 360 Profile</Link></td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}

export function CustomerProfilePage() {
  const { id } = useParams();
  const { request } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [historyStatus, setHistoryStatus] = useState('');
  const [historyServiceType, setHistoryServiceType] = useState('');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const { data, loading, error } = useResource(async () => {
    const [profile, payments] = await Promise.all([
      request(`/customers/${id}`),
      request(`/payments?customerId=${encodeURIComponent(id)}`).catch(() => ({ payments: [] }))
    ]);
    return { ...profile, payments: payments.payments || [] };
  }, [request, id]);

  const customer = data?.customer || {};
  const serviceHistory = data?.serviceHistory || [];
  const invoices = data?.invoices || [];
  const payments = data?.payments || [];
  const totalSpent = invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount || 0), 0);
  const pendingBalance = invoices.reduce((sum, invoice) => sum + Number(invoice.balance || 0), 0);
  const activeOrders = serviceHistory.filter(isActiveJob);
  const completedOrders = serviceHistory.filter(isCompletedJob);
  const lastServiceDate = latestDate(serviceHistory);
  const invoiceByWorkOrder = useMemo(() => invoices.reduce((map, invoice) => {
    map.set(recordId(invoice.workOrderId), invoice);
    return map;
  }, new Map()), [invoices]);
  const deviceRows = useMemo(() => {
    const names = [...new Set([...(customer.devices || []), ...serviceHistory.map((order) => order.device).filter(Boolean)])];
    return names.map((name) => {
      const jobs = serviceHistory.filter((order) => String(order.device || '').toLowerCase() === String(name).toLowerCase());
      return {
        name,
        category: deviceCategory(name),
        serialNumber: '-',
        warrantyStatus: '-',
        lastServiceDate: latestDate(jobs),
        serviceCount: jobs.length,
        firstJobId: jobs[0]?.id || jobs[0]?._id || ''
      };
    });
  }, [customer.devices, serviceHistory]);
  const filteredServiceHistory = serviceHistory.filter((order) => {
    if (historyStatus && order.status !== historyStatus) return false;
    if (historyServiceType) {
      const text = `${order.serviceType || ''} ${order.service || ''} ${order.device || ''} ${order.issue || ''}`.toLowerCase();
      if (!text.includes(historyServiceType.toLowerCase())) return false;
    }
    const created = order.createdAt ? new Date(order.createdAt).getTime() : 0;
    if (historyDateFrom && created < new Date(historyDateFrom).getTime()) return false;
    if (historyDateTo && created > new Date(historyDateTo).getTime() + 86400000) return false;
    return true;
  });
  const timelineEvents = useMemo(() => {
    const events = [];
    if (customer.createdAt) events.push({ date: customer.createdAt, title: 'Customer created', detail: 'Customer profile created in CRM.', status: 'CRM' });
    serviceHistory.forEach((order) => {
      events.push({ date: order.createdAt, title: 'Service job created', detail: `${bookingLabel(order)} - ${order.device || 'Service job'}`, status: order.status, to: `/admin/work-orders/${order.id}` });
      (order.timeline || []).forEach((item) => events.push({ date: item.createdAt, title: item.message, detail: `${bookingLabel(order)} - ${order.device || '-'}`, status: item.status, to: `/admin/work-orders/${order.id}` }));
      if (order.completedAt) events.push({ date: order.completedAt, title: 'Job completed', detail: `${bookingLabel(order)} completed.`, status: order.status, to: `/admin/work-orders/${order.id}` });
    });
    invoices.forEach((invoice) => {
      events.push({ date: invoice.createdAt, title: 'Invoice generated', detail: `${invoice.invoiceNumber} - ${currency(invoice.total)}`, status: invoice.status, to: recordId(invoice.workOrderId) ? `/admin/work-orders/${recordId(invoice.workOrderId)}` : '' });
    });
    payments.forEach((payment) => {
      events.push({ date: payment.createdAt, title: 'Payment recorded', detail: `${currency(payment.paidAmount)} via ${payment.method || '-'}`, status: payment.status });
    });
    return events.filter((event) => event.date).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [customer.createdAt, serviceHistory, invoices, payments]);
  const whatsappPhone = String(customer.phone || '').replace(/\D/g, '');
  const pendingInvoice = invoices.find((invoice) => Number(invoice.balance || 0) > 0);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div className="customer-360-page">
      <PageHeader
        title={customer.name}
        eyebrow="Customer 360"
        action={(
          <div className="flex flex-wrap gap-2">
            {whatsappPhone ? <a className="btn btn-secondary" href={customerWhatsAppHref(customer)} target="_blank" rel="noreferrer"><PhoneCallIcon className="h-4 w-4" />WhatsApp</a> : <button className="btn btn-secondary" type="button" disabled><PhoneCallIcon className="h-4 w-4" />WhatsApp</button>}
            <Link className="btn btn-primary" to="/admin/bookings"><Plus className="h-4 w-4" />Create Booking</Link>
            <button className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled>Create Service Job</button>
          </div>
        )}
      >
        {customer.phone || 'No phone'} {customer.address ? `- ${customer.address}` : ''}
      </PageHeader>

      <div className="surface mb-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Customer Profile</p>
            <h2 className="mt-1 text-2xl font-black">{customer.name}</h2>
            <p className="mt-1 text-sm muted">{customerCode(customer)} - Joined {formatDate(customer.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={customerTypeLabel(customer) || 'Customer'} />
            {pendingBalance > 0 ? <StatusBadge status="Pending" /> : <StatusBadge status="Paid" />}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Phone</p><p className="mt-1 text-sm font-bold">{customer.phone || '-'}</p></div>
          <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Address</p><p className="mt-1 text-sm font-bold">{customer.address || 'Not added'}</p></div>
          <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Customer Type</p><p className="mt-1 text-sm font-bold">{customerTypeLabel(customer) || 'Not added yet'}</p></div>
          <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Customer ID</p><p className="mt-1 text-sm font-bold">{customerCode(customer)}</p></div>
        </div>
      </div>

      <div className="surface customer-hero mb-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div><p className="text-sm muted">Total Jobs</p><p className="mt-2 text-2xl font-black">{serviceHistory.length}</p></div>
          <div><p className="text-sm muted">Active Jobs</p><p className="mt-2 text-2xl font-black">{activeOrders.length}</p></div>
          <div><p className="text-sm muted">Completed Jobs</p><p className="mt-2 text-2xl font-black">{completedOrders.length}</p></div>
          <div><p className="text-sm muted">Total Spent</p><p className="mt-2 text-2xl font-black">{currency(totalSpent)}</p></div>
          <div><p className="text-sm muted">Pending Balance</p><p className="mt-2 text-2xl font-black text-amber-100">{currency(pendingBalance)}</p></div>
          <div><p className="text-sm muted">Last Service Date</p><p className="mt-2 text-lg font-black">{lastServiceDate ? formatDate(lastServiceDate) : 'No service yet'}</p></div>
          <div><p className="text-sm muted">AMC Status</p><p className="mt-2 text-lg font-black">{customer.amcStatus || 'No active record'}</p></div>
          <div><p className="text-sm muted">Warranty Items</p><p className="mt-2 text-lg font-black">{customer.warrantyItems?.length ? customer.warrantyItems.length : 'No active record'}</p></div>
        </div>
      </div>

      <div className="surface sticky top-20 z-20 mb-4 p-3">
        <div className="tabs-list">
          {customerTabs.map((tab) => (
            <button key={tab.id} type="button" className={`tab-button ${activeTab === tab.id ? 'tab-button-active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
          <div className="grid content-start gap-5">
            {pendingBalance > 0 ? (
              <div className="surface border-amber-300/30 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-100" />
                  <div>
                    <h2 className="text-lg font-black text-amber-100">Pending Payment Alert</h2>
                    <p className="mt-1 text-sm muted">Outstanding balance is {currency(pendingBalance)}.</p>
                    <Link className="btn btn-primary mt-4" to={`/admin/payments${pendingInvoice ? `?invoiceId=${recordId(pendingInvoice)}` : ''}`}>Record Payment</Link>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="surface p-5">
              <h2 className="text-xl font-black">Customer Details</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Name</p><p className="font-bold">{customer.name}</p></div>
                <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Customer ID</p><p className="font-bold">{customerCode(customer)}</p></div>
                <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Type</p><p className="font-bold">{customerTypeLabel(customer) || 'Not added yet'}</p></div>
                <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Joined</p><p className="font-bold">{formatDate(customer.createdAt)}</p></div>
              </div>
            </div>
            <div className="surface p-5">
              <h2 className="text-xl font-black">Contact Details</h2>
              <div className="mt-4 grid gap-3">
                <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Phone</p><p className="font-bold">{customer.phone || '-'}</p></div>
                <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Address</p><p className="font-bold">{customer.address || 'Not added'}</p></div>
              </div>
            </div>
            <div className="surface p-5">
              <h2 className="text-xl font-black">Quick Actions</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link className="btn btn-primary" to="/admin/bookings"><Plus className="h-4 w-4" />Create Booking</Link>
                <button className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled>Create Repair / Service Job</button>
                <Link className="btn btn-secondary" to="/admin/documents/new"><FileText className="h-4 w-4" />Generate Quotation</Link>
                {whatsappPhone ? <a className="btn btn-secondary" href={customerWhatsAppHref(customer)} target="_blank" rel="noreferrer"><PhoneCallIcon className="h-4 w-4" />Open WhatsApp</a> : null}
              </div>
            </div>
          </div>
          <div className="grid gap-5">
            <div className="surface p-5">
              <h2 className="text-xl font-black">Recent Service Jobs</h2>
              <div className="mt-4 grid gap-3">
                {serviceHistory.slice(0, 4).length ? serviceHistory.slice(0, 4).map((order) => <Link key={order.id} className="rounded-card bg-[var(--surface-2)] p-3" to={`/admin/work-orders/${order.id}`}><b>{bookingLabel(order)} - {order.device}</b><p className="text-sm muted">{order.issue}</p><StatusBadge status={order.status} /></Link>) : <EmptyState title="No service jobs yet" message="Create the first booking for this customer." action={<Link className="btn btn-primary" to="/admin/bookings">Create Booking</Link>} />}
              </div>
            </div>
            <div className="surface p-5">
              <h2 className="text-xl font-black">Recent Invoices</h2>
              <div className="mt-4 grid gap-3">
                {invoices.slice(0, 4).length ? invoices.slice(0, 4).map((invoice) => <div key={invoice.id} className="rounded-card bg-[var(--surface-2)] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><b>{invoice.invoiceNumber}</b><StatusBadge status={invoice.status} /></div><p className="mt-1 text-sm muted">Total {currency(invoice.total)} - Balance {currency(invoice.balance)}</p></div>) : <EmptyState title="No invoices generated yet" message="Invoices will appear after a work order is billed." />}
              </div>
            </div>
            <div className="surface p-5">
              <h2 className="text-xl font-black">Active AMC</h2>
              {customer.amcStatus ? <StatusBadge status={customer.amcStatus} /> : <p className="mt-2 text-sm muted">No active AMC data available.</p>}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'devices' ? (
        <div className="surface p-5">
          <h2 className="text-xl font-black">Devices / Assets</h2>
          <div className="mt-4 table-wrap bg-[var(--surface)]">
            {deviceRows.length ? (
              <table className="data-table">
                <thead><tr><th>Device Name</th><th>Category</th><th>Serial Number</th><th>Warranty Status</th><th>Last Service Date</th><th>Service Count</th><th>Action</th></tr></thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {deviceRows.map((device) => (
                    <tr key={device.name}>
                      <td className="font-bold">{device.name}</td>
                      <td><StatusBadge status={device.category} /></td>
                      <td>{device.serialNumber}</td>
                      <td>{device.warrantyStatus}</td>
                      <td>{device.lastServiceDate ? formatDate(device.lastServiceDate) : '-'}</td>
                      <td>{device.serviceCount}</td>
                      <td>{device.firstJobId ? <Link className="btn btn-secondary py-2" to={`/admin/work-orders/${device.firstJobId}`}>View History</Link> : <button type="button" className="btn btn-secondary py-2" onClick={() => setActiveTab('serviceHistory')}>View History</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState title="No devices linked yet" message="Devices will appear from bookings and repair jobs." action={<Link className="btn btn-primary" to="/admin/bookings">Create Booking</Link>} />}
          </div>
        </div>
      ) : null}

      {activeTab === 'serviceHistory' ? (
        <div className="surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Service History</h2>
              <p className="mt-1 text-sm muted">Full repair and service job history for this customer.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[170px_190px_160px_160px]">
            <select className="input" value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value)}>
              <option value="">All statuses</option>
              {workOrderDetailStatuses.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className="input" value={historyServiceType} onChange={(event) => setHistoryServiceType(event.target.value)}>
              <option value="">All service types</option>
              {serviceTypes.map((item) => <option key={item}>{item}</option>)}
            </select>
            <input className="input" type="date" value={historyDateFrom} onChange={(event) => setHistoryDateFrom(event.target.value)} />
            <input className="input" type="date" value={historyDateTo} onChange={(event) => setHistoryDateTo(event.target.value)} />
          </div>
          <div className="mt-4 table-wrap bg-[var(--surface)]">
            {filteredServiceHistory.length ? (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Job ID</th><th>Service Type</th><th>Device</th><th>Issue</th><th>Technician</th><th>Status</th><th>Total Amount</th><th>Action</th></tr></thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {filteredServiceHistory.map((order) => {
                    const invoice = invoiceByWorkOrder.get(recordId(order));
                    const total = invoice?.total ?? (Number(order.serviceCharge || 0) + (order.partsUsed || []).reduce((sum, part) => sum + Number(part.total || 0), 0));
                    return (
                      <tr key={order.id}>
                        <td>{formatDate(order.createdAt)}</td>
                        <td className="font-bold">{bookingLabel(order)}</td>
                        <td>{order.serviceType || order.service || '-'}</td>
                        <td>{order.device || '-'}</td>
                        <td className="max-w-xs truncate">{order.issue || '-'}</td>
                        <td>{order.technicianId?.name || 'Unassigned'}</td>
                        <td><StatusBadge status={order.status} /></td>
                        <td className="font-bold">{currency(total)}</td>
                        <td><Link className="btn btn-secondary py-2" to={`/admin/work-orders/${order.id}`}>Open Job</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : <EmptyState title="No service jobs yet" message="Create the first booking for this customer." action={<Link className="btn btn-primary" to="/admin/bookings">Create Booking</Link>} />}
          </div>
        </div>
      ) : null}

      {activeTab === 'invoices' ? (
        <div className="surface p-5">
          <h2 className="text-xl font-black">Invoices</h2>
          <div className="mt-4 table-wrap bg-[var(--surface)]">
            {invoices.length ? (
              <table className="data-table">
                <thead><tr><th>Invoice Number</th><th>Date</th><th>Service Job</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Action</th></tr></thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="font-bold">{invoice.invoiceNumber}</td>
                      <td>{formatDate(invoice.createdAt)}</td>
                      <td>{recordId(invoice.workOrderId) ? <Link className="text-sky-100 hover:text-[var(--brand)]" to={`/admin/work-orders/${recordId(invoice.workOrderId)}`}>{bookingLabel(invoice.workOrderId)}</Link> : '-'}</td>
                      <td>{currency(invoice.total)}</td>
                      <td className="text-emerald-100">{currency(invoice.paidAmount)}</td>
                      <td className={Number(invoice.balance || 0) > 0 ? 'font-black text-amber-100' : 'text-emerald-100'}>{currency(invoice.balance)}</td>
                      <td><StatusBadge status={invoice.status} /></td>
                      <td><div className="flex flex-wrap gap-2">{recordId(invoice.workOrderId) ? <Link className="btn btn-secondary py-2" to={`/admin/work-orders/${recordId(invoice.workOrderId)}`}>Open Job</Link> : null}{Number(invoice.balance || 0) > 0 ? <Link className="btn btn-primary py-2" to={`/admin/payments?invoiceId=${recordId(invoice)}`}>Record Payment</Link> : null}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState title="No invoices generated yet" message="Invoices will appear after a work order is billed." />}
          </div>
        </div>
      ) : null}

      {activeTab === 'payments' ? (
        <div className="surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">Payments</h2>
            <Link className="btn btn-primary" to={`/admin/payments${pendingInvoice ? `?invoiceId=${recordId(pendingInvoice)}` : ''}`}><CreditCard className="h-4 w-4" />Record Payment</Link>
          </div>
          <div className="mt-4 table-wrap bg-[var(--surface)]">
            {payments.length ? (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Invoice</th><th>Amount Paid</th><th>Method</th><th>Balance After</th><th>Status</th></tr></thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.createdAt)}</td>
                      <td>{payment.invoiceId?.invoiceNumber || '-'}</td>
                      <td className="font-bold text-emerald-100">{currency(payment.paidAmount)}</td>
                      <td>{payment.method || '-'}</td>
                      <td className={Number(payment.balance || 0) > 0 ? 'font-bold text-amber-100' : 'text-emerald-100'}>{currency(payment.balance)}</td>
                      <td><StatusBadge status={payment.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState title="No payments recorded yet" message="Payments will appear after invoice payment is recorded." action={pendingInvoice ? <Link className="btn btn-primary" to={`/admin/payments?invoiceId=${recordId(pendingInvoice)}`}>Record Payment</Link> : null} />}
          </div>
        </div>
      ) : null}

      {activeTab === 'notes' ? (
        <div className="surface p-5">
          <h2 className="text-xl font-black">Notes</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input className="input" placeholder="Customer notes API not available yet" disabled />
            <button type="button" className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50" disabled>Add Note</button>
          </div>
          <div className="mt-4 grid gap-3">
            {customer.notes?.length ? customer.notes.map((note) => <div key={note.createdAt} className="rounded-card bg-[var(--surface-2)] p-3"><p>{note.text}</p><p className="mt-1 text-xs muted">{note.userId?.name || note.userId?.username || 'Team'} - {formatDate(note.createdAt)}</p></div>) : <EmptyState title="No notes yet" message="Customer notes will appear here when notes support is connected." />}
          </div>
        </div>
      ) : null}

      {activeTab === 'timeline' ? (
        <div className="surface p-5">
          <h2 className="text-xl font-black">Timeline</h2>
          <div className="mt-4 grid gap-3">
            {timelineEvents.length ? timelineEvents.map((event, index) => {
              const body = (
                <div className="rounded-card border border-[var(--line)] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-sky-400/15 px-2.5 py-1 text-xs font-black text-sky-100">{event.title}</span>
                    <StatusBadge status={event.status || 'Log'} />
                  </div>
                  <p className="mt-2 text-sm">{event.detail}</p>
                  <p className="mt-1 text-xs muted">{formatDate(event.date)}</p>
                </div>
              );
              return event.to ? <Link key={`${event.date}-${index}`} to={event.to}>{body}</Link> : <div key={`${event.date}-${index}`}>{body}</div>;
            }) : <EmptyState title="No timeline events yet" message="Customer activity will appear as bookings, service jobs, invoices, and payments are created." />}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function PaymentsPage() {
  const { request } = useAuth();
  const { push } = useToast();
  const location = useLocation();
  const invoiceIdParam = useMemo(() => new URLSearchParams(location.search).get('invoiceId') || '', [location.search]);
  const invoiceIdParamHandled = useRef('');
  const [form, setForm] = useState({ invoiceId: invoiceIdParam, paidAmount: '', method: 'Cash', transactionId: '' });
  const [paymentStatus, setPaymentStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const paymentQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (paymentStatus) params.set('status', paymentStatus);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return params.toString() ? `?${params}` : '';
  }, [paymentStatus, dateFrom, dateTo]);
  const { data, loading, error, reload } = useResource(async () => {
    const [payments, invoices] = await Promise.all([request(`/payments${paymentQuery}`), request('/invoices')]);
    return { ...payments, invoices: invoices.invoices };
  }, [request, paymentQuery]);

  useEffect(() => {
    if (!invoiceIdParam) {
      invoiceIdParamHandled.current = '';
      return;
    }
    if (!data?.invoices?.length) {
      setForm((current) => ({ ...current, invoiceId: invoiceIdParam }));
      return;
    }
    if (invoiceIdParamHandled.current === invoiceIdParam) return;
    const invoice = findInvoice(data.invoices, invoiceIdParam);
    const dueAmount = invoiceDueAmount(invoice);
    setForm((current) => ({
      ...current,
      invoiceId: invoiceIdParam,
      paidAmount: dueAmount > 0 ? String(dueAmount) : ''
    }));
    invoiceIdParamHandled.current = invoiceIdParam;
  }, [invoiceIdParam, data?.invoices]);

  function selectInvoice(invoiceId) {
    const invoice = findInvoice(data?.invoices || [], invoiceId);
    const dueAmount = invoiceDueAmount(invoice);
    setForm((current) => ({
      ...current,
      invoiceId,
      paidAmount: dueAmount > 0 ? String(dueAmount) : ''
    }));
  }

  async function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    const paidAmount = Number(form.paidAmount);
    const invoice = findInvoice(data?.invoices || [], form.invoiceId);
    const dueAmount = invoiceDueAmount(invoice);
    if (!form.invoiceId) {
      push('Please select an invoice', 'error');
      return;
    }
    if (!form.paidAmount || !Number.isFinite(paidAmount) || paidAmount <= 0) {
      push('Please enter a paid amount greater than zero', 'error');
      return;
    }
    if (!invoice) {
      push('Selected invoice was not found', 'error');
      return;
    }
    if (invoice && paidAmount > dueAmount) {
      push('Paid amount cannot exceed due amount', 'error');
      return;
    }
    try {
      await preserveScroll(async () => {
        await request('/payments', {
          method: 'POST',
          body: JSON.stringify({ invoiceId: form.invoiceId, amount: form.paidAmount, method: form.method, transactionId: form.transactionId })
        });
        setForm((current) => ({ ...current, paidAmount: '', transactionId: '' }));
        push('Payment recorded');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  const selectedInvoice = findInvoice(data.invoices, form.invoiceId);
  const paymentSummaryByInvoice = (data.payments || []).reduce((map, payment) => {
    const id = payment.invoiceId?.id || payment.invoiceId?._id || payment.invoiceId;
    if (!id) return map;
    map.set(id, [...(map.get(id) || []), payment]);
    return map;
  }, new Map());
  function paymentMethodDisplay(payment) {
    const invoice = payment?.invoiceId;
    const invoiceId = invoice?.id || invoice?._id || invoice;
    const payments = paymentSummaryByInvoice.get(invoiceId) || (payment ? [payment] : []);
    if (!payments.length) return '-';
    const byMethod = payments.reduce((summary, payment) => {
      const method = payment.method || 'Other';
      summary[method] = Number(summary[method] || 0) + Number(payment.paidAmount || 0);
      return summary;
    }, {});
    const entries = Object.entries(byMethod);
    if (entries.length <= 1) return payment?.method || entries[0]?.[0] || '-';
    return entries.map(([method, amount]) => `${method} ${currency(amount)}`).join(' + ');
  }
  const paymentTotals = {
    totalCollected: (data.payments || []).reduce((sum, payment) => sum + Number(payment.paidAmount || 0), 0),
    pendingBalance: (data.invoices || []).reduce((sum, invoice) => sum + invoiceDueAmount(invoice), 0),
    paidInvoices: (data.invoices || []).filter((invoice) => invoice.status === 'Paid').length,
    partialInvoices: (data.invoices || []).filter((invoice) => invoice.status === 'Partial').length,
    todayCollection: (data.payments || []).filter((payment) => isToday(payment.createdAt)).reduce((sum, payment) => sum + Number(payment.paidAmount || 0), 0)
  };

  return (
    <div className="payments-page">
      <PageHeader title="Payments" eyebrow="Billing">Record cash, UPI, and partial payments with invoice balance tracking.</PageHeader>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={CreditCard} label="Total Collected" value={currency(paymentTotals.totalCollected)} tone="green" />
        <StatCard icon={AlertTriangle} label="Pending Balance" value={currency(paymentTotals.pendingBalance)} tone="red" />
        <StatCard icon={CheckCircle2} label="Paid Invoices" value={paymentTotals.paidInvoices} tone="green" />
        <StatCard icon={ReceiptText} label="Partial Invoices" value={paymentTotals.partialInvoices} tone="yellow" />
        <StatCard icon={CalendarClock} label="Today's Collection" value={currency(paymentTotals.todayCollection)} />
      </div>
      <div className="surface mb-5 grid gap-3 p-4 md:grid-cols-[180px_160px_160px]">
        <select className="input" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
          <option value="">All statuses</option>
          {['Paid', 'Partial', 'Pending'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <input className="input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <input className="input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
      </div>
      <form className="surface mb-5 grid gap-4 p-5 xl:grid-cols-[1.2fr_.8fr]" onSubmit={submit}>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="md:col-span-2">
            <span className="label">Select Invoice</span>
            <select className="input" value={form.invoiceId} onChange={(event) => selectInvoice(event.target.value)} required>
              <option value="">Select invoice</option>
              {data.invoices.filter((invoice) => invoiceDueAmount(invoice) > 0 || invoice.id === form.invoiceId || invoice._id === form.invoiceId).map((invoice) => {
                const invoiceId = invoice.id || invoice._id;
                return <option key={invoiceId} value={invoiceId}>{invoice.invoiceNumber} - {currency(invoiceDueAmount(invoice))} due</option>;
              })}
            </select>
          </label>
          <label>
            <span className="label">Payment Amount</span>
            <input className="input" type="number" min="1" placeholder="Paid amount" value={form.paidAmount} onChange={(event) => setForm((current) => ({ ...current, paidAmount: event.target.value }))} required />
          </label>
          <label>
            <span className="label">Payment Method</span>
            <select className="input" value={form.method} onChange={(event) => setForm((current) => ({ ...current, method: event.target.value }))}>
              <option>Cash</option><option>UPI</option><option disabled>Cash + UPI</option>
            </select>
          </label>
          {form.method === 'UPI' ? <label><span className="label">Transaction ID</span><input className="input" placeholder="Transaction ID (optional)" value={form.transactionId} onChange={(event) => setForm((current) => ({ ...current, transactionId: event.target.value }))} /></label> : null}
          <label>
            <span className="label">Payment Note</span>
            <input className="input" placeholder="Payment note not supported by current API" disabled />
          </label>
          <button type="submit" className="btn btn-primary self-end"><CreditCard className="h-4 w-4" />Record Payment</button>
        </div>
        <div className="rounded-card bg-[var(--surface-2)] p-4">
          <h2 className="font-black">Selected Invoice</h2>
          {selectedInvoice ? (
            <div className="mt-4 grid gap-3">
              <div><p className="text-sm muted">Customer</p><p className="font-bold">{selectedInvoice.customerId?.name || '-'}</p></div>
              <div className="grid grid-cols-3 gap-2">
                <div><p className="text-xs muted">Total</p><p className="font-black">{currency(selectedInvoice.total)}</p></div>
                <div><p className="text-xs muted">Paid</p><p className="font-black text-emerald-100">{currency(selectedInvoice.paidAmount)}</p></div>
                <div><p className="text-xs muted">Balance</p><p className="font-black text-amber-100">{currency(selectedInvoice.balance)}</p></div>
              </div>
              <StatusBadge status={selectedInvoice.status} />
            </div>
          ) : <p className="mt-3 text-sm muted">Select an invoice to see customer, total, paid amount, and balance.</p>}
        </div>
      </form>
      {!data.payments?.length ? <EmptyState title="No payments recorded yet" message="Payments will appear after invoice payment is recorded." /> : (
        <Table>
          <thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Amount Paid</th><th>Method</th><th>Balance After</th><th>Status</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {data.payments.map((payment) => <tr key={payment.id}><td>{formatDate(payment.createdAt)}</td><td className="font-bold"><Link className="text-sky-100 hover:text-[var(--brand)]" to="/admin/invoices">{payment.invoiceId?.invoiceNumber}</Link></td><td>{payment.customerId?.name}</td><td className="font-bold text-emerald-100">{currency(payment.paidAmount)}</td><td>{paymentMethodDisplay(payment)}</td><td className={Number(payment.balance || 0) > 0 ? 'font-bold text-amber-100' : 'text-emerald-100'}>{currency(payment.balance)}</td><td><StatusBadge status={payment.status} /></td></tr>)}
          </tbody>
        </Table>
      )}
    </div>
  );
}

export function TechnicianDashboard() {
  const { request, user } = useAuth();
  const { data, loading, error } = useResource(() => request('/dashboard/technician'), [request]);
  if (loading) return <TechnicianLoadingCards />;
  if (error) return <ErrorBlock message={error} />;

  const jobs = data.jobs || [];
  const todayJobs = jobs.filter(isTechnicianTodayJob);
  const inProgressJobs = jobs.filter((job) => job.status === 'In Progress');
  const awaitingPartsJobs = jobs.filter((job) => job.status === 'Awaiting Parts');
  const completedToday = jobs.filter((job) => job.status === 'Completed' && isSameDay(job.completedAt || job.updatedAt || job.createdAt));
  const pendingUpdates = jobs.filter((job) => ['Pending', 'In Progress', 'Awaiting Parts'].includes(job.status) && !(job.notes || []).length);
  const activeJobs = jobs.filter((job) => ['Pending', 'In Progress', 'Awaiting Parts'].includes(job.status));
  const nextJob = [...activeJobs].sort((a, b) => new Date(a.scheduledAt || a.createdAt || 0) - new Date(b.scheduledAt || b.createdAt || 0))[0];
  const urgentJobs = jobs.filter(isTechnicianOverdueJob).slice(0, 4);
  const recentCompleted = jobs.filter((job) => ['Completed', 'Delivered', 'Returned'].includes(job.status)).slice(0, 4);

  return (
    <>
      <PageHeader title="Technician Dashboard" eyebrow={`Welcome, ${user?.name || 'Technician'}`}>
        Today’s assigned jobs, next job, status updates, parts, notes, and technician notifications.
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={CalendarClock} label="Today's Jobs" value={todayJobs.length} />
        <StatCard icon={Wrench} label="In Progress" value={inProgressJobs.length} />
        <StatCard icon={PackagePlus} label="Awaiting Parts" value={awaitingPartsJobs.length} tone="yellow" />
        <StatCard icon={CheckCircle2} label="Completed Today" value={completedToday.length} tone="green" />
        <StatCard icon={AlertTriangle} label="Pending Notes / Updates" value={pendingUpdates.length} tone="yellow" />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <div className="grid gap-5">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Next Job</h2>
              <Link className="btn btn-secondary py-2" to="/tech/work-orders">View All</Link>
            </div>
            {nextJob ? <TechnicianJobCard job={nextJob} compact /> : <EmptyState title="No jobs assigned today." message="You're all clear." />}
          </div>
          <div className="surface p-5">
            <h2 className="text-xl font-black">Urgent / Overdue Jobs</h2>
            <div className="mt-4 grid gap-3">
              {urgentJobs.length ? urgentJobs.map((job) => (
                <TechnicianJobCard key={recordId(job)} job={job} compact />
              )) : <p className="text-sm muted">No urgent jobs right now.</p>}
            </div>
          </div>
        </div>
        <div className="grid gap-5">
          <div className="surface p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Today’s Assigned Jobs</h2>
              <span className="status-badge">{todayJobs.length}</span>
            </div>
            <div className="mt-4 grid gap-3">
              {todayJobs.length ? todayJobs.slice(0, 5).map((job) => <TechnicianJobCard key={recordId(job)} job={job} compact />) : <p className="text-sm muted">No jobs assigned today.</p>}
            </div>
          </div>
          <div className="surface p-5">
            <h2 className="text-xl font-black">Recent Completed Jobs</h2>
            <div className="mt-4 grid gap-3">
              {recentCompleted.length ? recentCompleted.map((job) => <TechnicianJobCard key={recordId(job)} job={job} compact />) : <p className="text-sm muted">No completed jobs yet.</p>}
            </div>
          </div>
          <NotificationsPanel notifications={data.notifications || []} />
        </div>
      </div>
    </>
  );
}

export function InventoryPage() {
  const { request } = useAuth();
  const { push } = useToast();
  const { data, loading, error, reload } = useResource(() => request('/inventory'), [request]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [editor, setEditor] = useState(null);
  const [quickStockPart, setQuickStockPart] = useState(null);
  const [deletePart, setDeletePart] = useState(null);

  const parts = data?.parts || [];
  const categories = useMemo(() => Array.from(new Set(parts.map((part) => part.category || 'General'))).sort(), [parts]);
  const filteredParts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = parts.filter((part) => {
      const matchesSearch = !term || `${part.partName} ${part.category} ${part.sku || ''} ${part.brand || ''}`.toLowerCase().includes(term);
      const matchesCategory = !category || part.category === category;
      const matchesStatus = !stockStatus || inventoryStockStatus(part) === stockStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
    return rows.sort((a, b) => {
      if (sortBy === 'stock') return Number(a.available || 0) - Number(b.available || 0);
      if (sortBy === 'value') return (Number(b.onHand || 0) * Number(b.costPrice || b.sellingPrice || 0)) - (Number(a.onHand || 0) * Number(a.costPrice || a.sellingPrice || 0));
      return String(a.partName || '').localeCompare(String(b.partName || ''));
    });
  }, [parts, search, category, stockStatus, sortBy]);
  const totals = useMemo(() => ({
    totalParts: parts.length,
    lowStock: parts.filter((part) => inventoryStockStatus(part) === 'low').length,
    outOfStock: parts.filter((part) => inventoryStockStatus(part) === 'out').length,
    stockValue: parts.reduce((sum, part) => sum + Number(part.onHand || 0) * Number(part.costPrice || part.sellingPrice || 0), 0),
    totalUnits: parts.reduce((sum, part) => sum + Number(part.onHand || 0), 0),
    reserved: parts.reduce((sum, part) => sum + Number(part.reserved || 0), 0)
  }), [parts]);

  async function savePart(partForm) {
    try {
      await preserveScroll(async () => {
        const payload = {
          partName: partForm.partName,
          category: partForm.category,
          costPrice: partForm.costPrice,
          sellingPrice: partForm.sellingPrice,
          onHand: partForm.onHand,
          reserved: partForm.reserved,
          lowStockLimit: partForm.lowStockLimit
        };
        if (partForm.id) await request(`/inventory/${partForm.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        else await request('/inventory', { method: 'POST', body: JSON.stringify(payload) });
        setEditor(null);
        push(partForm.id ? 'Inventory part updated' : 'Inventory part added');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function confirmDeletePart() {
    if (!deletePart) return;
    try {
      await preserveScroll(async () => {
        await request(`/inventory/${deletePart.id}`, { method: 'DELETE' });
        push('Inventory part deleted');
        setDeletePart(null);
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function addQuickStock(stockForm) {
    const quantity = Number(stockForm.quantity || 0);
    if (!quantity || (stockForm.type !== 'ADJUST' && quantity <= 0)) {
      push(stockForm.type === 'ADJUST' ? 'Adjustment quantity cannot be zero' : 'Quantity must be greater than 0', 'error');
      return;
    }
    try {
      await preserveScroll(async () => {
        await request('/stock-movements', {
          method: 'POST',
          body: JSON.stringify({
            partId: stockForm.partId,
            type: stockForm.type,
            quantity: stockForm.quantity,
            source: stockForm.source,
            note: stockForm.note
          })
        });
        push('Stock added');
        setQuickStockPart(null);
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;
  return (
    <div className="inventory-page">
      <PageHeader
        title="Inventory / Stock Management"
        eyebrow="Stock Control"
        action={<button type="button" className="btn btn-primary" onClick={() => setEditor({})}><Plus className="h-4 w-4" />Add Part</button>}
      >
        Track parts, products, stock availability, reserved quantity, low stock, and stock value.
      </PageHeader>
      <div className="surface mb-5 p-3">
        <div className="tabs-list">
          <Link className="tab-button tab-button-active" to="/admin/parts">Products / Parts</Link>
          <Link className="tab-button" to="/admin/stock-movements">Stock Movements</Link>
        </div>
      </div>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard icon={PackagePlus} label="Total Parts" value={totals.totalParts} />
        <StatCard icon={Boxes} label="Total Units" value={totals.totalUnits} />
        <StatCard icon={AlertTriangle} label="Low Stock Items" value={totals.lowStock} tone="yellow" />
        <StatCard icon={AlertTriangle} label="Out of Stock Items" value={totals.outOfStock} tone="red" />
        <StatCard icon={CreditCard} label="Total Stock Value" value={currency(totals.stockValue)} />
        <StatCard icon={ClipboardList} label="Reserved Stock" value={totals.reserved} />
      </div>
      <div className="surface mb-5 grid gap-3 p-4 xl:grid-cols-[1fr_180px_180px_190px]">
        <SearchBox value={search} onChange={setSearch} placeholder="Search part name, category, SKU, brand" />
        <select className="input" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="input" value={stockStatus} onChange={(event) => setStockStatus(event.target.value)}>
          <option value="">All stock statuses</option>
          <option value="in">Available</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
        <select className="input" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="name">Sort: Name</option>
          <option value="stock">Sort: Stock Low to High</option>
          <option value="value">Sort: Stock Value</option>
        </select>
      </div>
      {!filteredParts.length ? <EmptyState title="No inventory items found" message="Try changing the search or filters." /> : (
        <>
        <p className="mb-3 text-xs font-semibold muted">Available = On Hand - Reserved. Reserved means stock assigned to active service jobs but not yet billed.</p>
        <div className="table-wrap inventory-products-table-wrap bg-[var(--surface)]">
          <table className="data-table inventory-products-table">
            <colgroup>
              <col className="inventory-col-part" />
              <col className="inventory-col-category" />
              <col className="inventory-col-stock" />
              <col className="inventory-col-pricing" />
              <col className="inventory-col-low" />
              <col className="inventory-col-status" />
              <col className="inventory-col-actions" />
            </colgroup>
            <thead><tr><th>Part / Product</th><th>Category</th><th>Stock</th><th>Pricing</th><th>Low Stock Limit</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody className="divide-y divide-[var(--line)]">
              {filteredParts.map((part) => {
                const stockValue = Number(part.onHand || 0) * Number(part.costPrice || part.sellingPrice || 0);
                return (
                  <tr key={part.id}>
                    <td className="font-bold">
                      {part.partName}
                      <span className="block text-xs font-normal muted">{part.brand || part.sku || 'Product / part'}</span>
                    </td>
                    <td>{part.category || 'General'}</td>
                    <td>
                      <div className="inventory-cell-stack">
                        <span>On hand: {part.onHand || 0}</span>
                        <span>Reserved: {part.reserved || 0}</span>
                        <span className="font-black text-sky-100">Available: {part.available || 0}</span>
                      </div>
                    </td>
                    <td>
                      <div className="inventory-cell-stack">
                        <span>Selling: {currency(part.sellingPrice)}</span>
                        <span>Cost: {currency(part.costPrice)}</span>
                        <span className="font-black text-sky-100">Value: {currency(stockValue)}</span>
                      </div>
                    </td>
                    <td className="text-center font-bold">{part.lowStockLimit}</td>
                    <td><InventoryStatusBadge part={part} /></td>
                    <td>
                      <div className="inventory-actions">
                        <button type="button" className="btn btn-secondary inventory-action-button" onClick={() => setEditor(part)}>Edit</button>
                        <button type="button" className="btn btn-primary inventory-action-button" onClick={() => setQuickStockPart(part)}><PackagePlus className="h-4 w-4" />Add Stock</button>
                        <Link className="btn btn-secondary inventory-action-button inventory-action-wide" to={`/admin/stock-movements?partId=${part.id}`}>View Movements</Link>
                        <button type="button" className="icon-button inventory-delete-button text-rose-100" onClick={() => setDeletePart(part)} aria-label={`Delete ${part.partName}`}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </>
      )}
      {editor ? <InventoryPartModal part={editor} onClose={() => setEditor(null)} onSave={savePart} /> : null}
      {quickStockPart ? <QuickStockModal part={quickStockPart} onClose={() => setQuickStockPart(null)} onSave={addQuickStock} /> : null}
      {deletePart ? (
        <ConfirmModal
          title="Delete Inventory Part"
          message={`Delete ${deletePart.partName}? This removes the part from inventory.`}
          confirmLabel="Delete"
          onCancel={() => setDeletePart(null)}
          onConfirm={confirmDeletePart}
        />
      ) : null}
    </div>
  );
}

function InventoryPartModal({ part, onClose, onSave }) {
  const [form, setForm] = useState({
    id: part.id || '',
    partName: part.partName || '',
    category: inventoryCategories.includes(part.category) ? part.category : 'Other',
    costPrice: part.costPrice || 0,
    sellingPrice: part.sellingPrice || 0,
    onHand: part.onHand || 0,
    reserved: part.reserved || 0,
    lowStockLimit: part.lowStockLimit || 0
  });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const priceWarning = Number(form.costPrice || 0) > Number(form.sellingPrice || 0);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4">
      <form className="surface max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); onSave(form); }}>
        <h2 className="text-xl font-black">{form.id ? 'Edit Part' : 'Add Part'}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label><span className="label">Part Name</span><input className="input" value={form.partName} onChange={(event) => update('partName', event.target.value)} required /></label>
          <label>
            <span className="label">Category</span>
            <select className="input" value={form.category} onChange={(event) => update('category', event.target.value)}>
              {inventoryCategories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Cost Price</span>
            <span className="relative block"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold muted">₹</span><input className="input pl-7" type="number" min="0" step="0.01" value={form.costPrice} onChange={(event) => update('costPrice', event.target.value)} /></span>
          </label>
          <label>
            <span className="label">Selling Price</span>
            <span className="relative block"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold muted">₹</span><input className="input pl-7" type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(event) => update('sellingPrice', event.target.value)} /></span>
          </label>
          <label><span className="label">On Hand</span><input className="input" type="number" min="0" value={form.onHand} onChange={(event) => update('onHand', event.target.value)} /></label>
          <label><span className="label">Reserved</span><input className="input" type="number" min="0" value={form.reserved} onChange={(event) => update('reserved', event.target.value)} /></label>
          <label><span className="label">Low Limit</span><input className="input" type="number" min="0" value={form.lowStockLimit} onChange={(event) => update('lowStockLimit', event.target.value)} /></label>
        </div>
        {priceWarning ? <p className="mt-3 text-sm font-semibold text-amber-100">Cost price is higher than selling price</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary"><Save className="h-4 w-4" />Save Part</button>
        </div>
      </form>
    </div>
  );
}

function QuickStockModal({ part, onClose, onSave }) {
  const [form, setForm] = useState({ partId: part.id, type: 'ADD', quantity: 1, source: 'Purchase', note: '' });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4">
      <form className="surface w-full max-w-lg p-5" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); onSave(form); }}>
        <h2 className="text-xl font-black">Add / Adjust Stock</h2>
        <div className="mt-4 grid gap-4">
          <label><span className="label">Part / Product</span><input className="input" value={part.partName} readOnly /></label>
          <label>
            <span className="label">Movement Type</span>
            <select className="input" value={form.type} onChange={(event) => update('type', event.target.value)}>
              {['ADD', 'RETURN', 'ADJUST'].map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label><span className="label">Quantity</span><input className="input" type="number" min={form.type === 'ADJUST' ? undefined : '1'} value={form.quantity} onChange={(event) => update('quantity', event.target.value)} /></label>
          <label>
            <span className="label">Source</span>
            <select className="input" value={form.source} onChange={(event) => update('source', event.target.value)}>
              {quickStockSources.map((source) => <option key={source}>{source}</option>)}
            </select>
          </label>
          <label><span className="label">Note</span><input className="input" value={form.note} onChange={(event) => update('note', event.target.value)} /></label>
        </div>
        <p className="mt-4 rounded-card bg-amber-400/10 p-3 text-sm font-semibold text-amber-100">Stock movements are recorded in the ledger and audit log.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary"><PackagePlus className="h-4 w-4" />Save Stock</button>
        </div>
      </form>
    </div>
  );
}

export function StockMovementsPage() {
  const { request } = useAuth();
  const location = useLocation();
  const partIdParam = useMemo(() => new URLSearchParams(location.search).get('partId') || '', [location.search]);
  const [movementType, setMovementType] = useState('');
  const [partId, setPartId] = useState(partIdParam);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const movementQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (movementType) params.set('type', movementType);
    if (partId) params.set('partId', partId);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return params.toString() ? `?${params}` : '';
  }, [movementType, partId, dateFrom, dateTo]);
  const { data, loading, error, reload } = useResource(async () => {
    const [movements, inventory] = await Promise.all([request(`/stock-movements${movementQuery}`), request('/inventory')]);
    return { ...movements, parts: inventory.parts || [] };
  }, [request, movementQuery]);
  const { push } = useToast();
  const [form, setForm] = useState({ partId: '', type: 'ADD', quantity: 1, source: 'Manual', note: '' });

  useEffect(() => {
    setPartId(partIdParam);
  }, [partIdParam]);

  async function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    const quantity = Number(form.quantity || 0);
    if (!quantity || (form.type !== 'ADJUST' && quantity <= 0)) {
      push(form.type === 'ADJUST' ? 'Adjustment quantity cannot be zero' : 'Quantity must be greater than 0', 'error');
      return;
    }
    try {
      await preserveScroll(async () => {
        await request('/stock-movements', { method: 'POST', body: JSON.stringify(form) });
        setForm({ partId: '', type: 'ADD', quantity: 1, source: 'Manual', note: '' });
        push('Stock movement recorded');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  const movements = data.movements || [];
  const filteredMovements = movements.filter((movement) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [
      movement.partId?.partName,
      movement.source,
      movement.note,
      movement.userId?.name,
      movement.userId?.username
    ].filter(Boolean).join(' ').toLowerCase().includes(term);
  });
  const lowStockAlerts = (data.parts || []).filter((part) => inventoryStockStatus(part) !== 'in').length;
  const movementTotals = {
    addedToday: movements.filter((movement) => movement.type === 'ADD' && isToday(movement.createdAt)).reduce((sum, movement) => sum + Number(movement.quantity || 0), 0),
    usedToday: movements.filter((movement) => movement.type === 'USED' && isToday(movement.createdAt)).reduce((sum, movement) => sum + Number(movement.quantity || 0), 0),
    returnedToday: movements.filter((movement) => movement.type === 'RETURN' && isToday(movement.createdAt)).reduce((sum, movement) => sum + Number(movement.quantity || 0), 0),
    adjustments: movements.filter((movement) => movement.type === 'ADJUST').length,
    lowStockAlerts
  };

  function exportCsv() {
    const rows = [
      ['Date', 'Part', 'Type', 'Quantity', 'Source', 'Note', 'User'],
      ...filteredMovements.map((movement) => [
        formatDate(movement.createdAt),
        movement.partId?.partName || '',
        movement.type,
        movement.quantity,
        movement.source || '',
        movement.note || '',
        movement.userId?.name || movement.userId?.username || ''
      ])
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'stock-movements.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stock-movements-page">
      <PageHeader
        title="Stock Movement Ledger"
        eyebrow="Inventory Audit"
        action={<button type="button" className="btn btn-secondary" onClick={exportCsv}><Download className="h-4 w-4" />Export CSV</button>}
      >
        Every stock add, use, return, transfer, and adjustment is tracked here.
      </PageHeader>
      <div className="surface mb-5 p-3">
        <div className="tabs-list">
          <Link className="tab-button" to="/admin/parts">Products / Parts</Link>
          <Link className="tab-button tab-button-active" to="/admin/stock-movements">Stock Movements</Link>
        </div>
      </div>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={PackagePlus} label="Added Today" value={movementTotals.addedToday} tone="green" />
        <StatCard icon={Wrench} label="Used Today" value={movementTotals.usedToday} />
        <StatCard icon={PackagePlus} label="Returned Today" value={movementTotals.returnedToday} tone="green" />
        <StatCard icon={ReceiptText} label="Adjustments" value={movementTotals.adjustments} tone="yellow" />
        <StatCard icon={AlertTriangle} label="Low Stock Alerts" value={movementTotals.lowStockAlerts} tone="yellow" />
      </div>
      <div className="surface mb-5 grid gap-3 p-4 md:grid-cols-[1fr_180px_220px_160px_160px]">
        <SearchBox value={search} onChange={setSearch} placeholder="Search part, source, user, note" />
        <select className="input" value={movementType} onChange={(event) => setMovementType(event.target.value)}>
          <option value="">All types</option>
          {['ADD', 'USED', 'RETURN', 'ADJUST'].map((type) => <option key={type}>{type}</option>)}
        </select>
        <select className="input" value={partId} onChange={(event) => setPartId(event.target.value)}>
          <option value="">All parts</option>
          {data.parts.map((part) => <option key={part.id} value={part.id}>{part.partName}</option>)}
        </select>
        <input className="input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <input className="input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
      </div>
      <form className="surface mb-5 grid gap-3 p-5 md:grid-cols-[1fr_140px_120px_160px_1fr_auto]" onSubmit={submit}>
        <label>
          <span className="label">Select part</span>
          <select className="input" value={form.partId} onChange={(event) => setForm((current) => ({ ...current, partId: event.target.value }))} required>
            <option value="">Select part</option>
            {data.parts.map((part) => <option key={part.id} value={part.id}>{part.partName} - {part.available} available</option>)}
          </select>
        </label>
        <label>
          <span className="label">Movement Type</span>
          <select className="input" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
            {['ADD', 'USED', 'RETURN', 'ADJUST'].map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Quantity</span>
          <input className="input" type="number" min={form.type === 'ADJUST' ? undefined : '1'} value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} />
        </label>
        <label>
          <span className="label">Source</span>
          <select className="input" value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}>
            {quickStockSources.map((source) => <option key={source}>{source}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Note</span>
          <input className="input" value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
        </label>
        <button type="submit" className="btn btn-primary self-end">Save</button>
      </form>
      <p className="mb-3 text-xs font-semibold muted">Stock movements are recorded through the existing stock movement API and mirrored into audit logs.</p>
      {!filteredMovements.length ? <EmptyState title="No stock movement recorded yet" message="Stock movements will appear when parts are added, used, returned, or adjusted." /> : (
        <div className="table-wrap stock-movements-table-wrap bg-[var(--surface)]">
          <table className="data-table stock-movements-table">
            <colgroup>
              <col className="stock-movement-col-date" />
              <col className="stock-movement-col-part" />
              <col className="stock-movement-col-movement" />
              <col className="stock-movement-col-source" />
              <col className="stock-movement-col-note" />
              <col className="stock-movement-col-user" />
            </colgroup>
          <thead><tr><th>Date</th><th>Part</th><th>Movement</th><th>Source / Link</th><th>Note</th><th>User</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {filteredMovements.map((movement) => {
              const sourceId = recordId(movement.sourceId) || movement.sourceId;
              const sourceLabel = sourceId ? `WO-${String(sourceId).slice(-6).toUpperCase()}` : '-';
              return (
                <tr key={movement.id}>
                  <td>{formatDate(movement.createdAt)}</td>
                  <td className="font-bold">{movement.partId?.partName || '-'}</td>
                  <td>
                    <div className="stock-movement-stack">
                      <MovementTypeBadge type={movement.type} quantity={movement.quantity} />
                      <span>Qty: {movement.quantity}</span>
                      <span className="font-bold text-sky-100">Balance: {movement.balanceAfter ?? '-'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="stock-movement-stack">
                      <span className="font-semibold text-slate-100">{movement.source || '-'}</span>
                      {sourceId ? <Link className="text-sky-100 hover:text-[var(--brand)]" to={`/admin/work-orders/${sourceId}`}>{sourceLabel}</Link> : <span className="muted">-</span>}
                    </div>
                  </td>
                  <td><span className="stock-movement-note" title={movement.note || '-'}>{movement.note || '-'}</span></td>
                  <td>{movement.userId?.name || movement.userId?.username || '-'}</td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function InvoicesPage() {
  const { request, token } = useAuth();
  const { push } = useToast();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const { data, loading, error } = useResource(async () => {
    const [invoices, payments] = await Promise.all([request('/invoices'), request('/payments')]);
    return { invoices: invoices.invoices || [], payments: payments.payments || [] };
  }, [request]);
  const paymentsByInvoice = useMemo(() => (data?.payments || []).reduce((map, payment) => {
    const invoiceId = recordId(payment.invoiceId);
    if (!invoiceId) return map;
    map.set(invoiceId, [...(map.get(invoiceId) || []), payment]);
    return map;
  }, new Map()), [data?.payments]);
  const invoices = (data?.invoices || []).filter((invoice) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || [
      invoice.invoiceNumber,
      invoice.customerId?.name,
      invoice.customerId?.phone,
      invoice.workOrderId?.device,
      invoice.workOrderId?.issue,
      bookingLabel(invoice.workOrderId)
    ].filter(Boolean).join(' ').toLowerCase().includes(term);
    const matchesStatus = !status || invoice.status === status;
    const created = invoice.createdAt ? new Date(invoice.createdAt).getTime() : 0;
    const matchesDateFrom = !dateFrom || created >= new Date(dateFrom).getTime();
    const matchesDateTo = !dateTo || created <= new Date(dateTo).getTime() + 86400000;
    const invoicePayments = paymentsByInvoice.get(recordId(invoice)) || [];
    const matchesMethod = !paymentMethod || invoicePayments.some((payment) => payment.method === paymentMethod);
    return matchesSearch && matchesStatus && matchesDateFrom && matchesDateTo && matchesMethod;
  });
  const totals = {
    totalInvoices: invoices.length,
    pending: invoices.filter((invoice) => invoice.status === 'Pending').length,
    partial: invoices.filter((invoice) => invoice.status === 'Partial').length,
    paid: invoices.filter((invoice) => invoice.status === 'Paid').length,
    totalValue: invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
    balance: invoices.reduce((sum, invoice) => sum + invoiceDueAmount(invoice), 0)
  };
  const availableMethods = [...new Set((data?.payments || []).map((payment) => payment.method).filter(Boolean))];

  async function downloadWorkPdf(invoice, preview = false) {
    const workOrderId = recordId(invoice.workOrderId);
    if (!workOrderId) return;
    try {
      const response = await fetch(`${apiBase}/work-orders/${workOrderId}/pdf/work${preview ? '?preview=true' : ''}`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await response.blob();
      if (!response.ok) throw new Error('PDF is available only when the linked service job status allows it.');
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      if (preview) {
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return;
      }
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = `${invoice.invoiceNumber || 'invoice'}.pdf`;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  function sendInvoiceWhatsApp(invoice) {
    const phone = String(invoice.customerId?.phone || '').replace(/\D/g, '');
    if (!phone) {
      push('Customer phone number not available', 'error');
      return;
    }
    const whatsappPhone = phone.startsWith('91') ? phone : `91${phone}`;
    const message = `Hello ${invoice.customerId?.name || 'Customer'}, your invoice ${invoice.invoiceNumber} from Universal Systems is ready. Balance: ${currency(invoiceDueAmount(invoice))}.`;
    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <PageHeader title="Invoices" eyebrow="Billing" action={<Link className="btn btn-primary" to="/admin/payments"><CreditCard className="h-4 w-4" />Record Payment</Link>}>Invoices are generated from repair/service jobs and linked to payments.</PageHeader>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard icon={ReceiptText} label="Total Invoices" value={totals.totalInvoices} />
        <StatCard icon={ReceiptText} label="Pending Invoices" value={totals.pending} tone="yellow" />
        <StatCard icon={CreditCard} label="Partial Payments" value={totals.partial} tone="yellow" />
        <StatCard icon={CheckCircle2} label="Paid Invoices" value={totals.paid} tone="green" />
        <StatCard icon={ReceiptText} label="Total Invoice Value" value={currency(totals.totalValue)} />
        <StatCard icon={AlertTriangle} label="Pending Balance" value={currency(totals.balance)} tone="red" />
      </div>
      <div className="surface mb-5 grid gap-3 p-4 xl:grid-cols-[1fr_170px_170px_160px_160px]">
        <SearchBox value={search} onChange={setSearch} placeholder="Search invoice, customer, phone, service job" />
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {['Pending', 'Partial', 'Paid'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="input" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} disabled={!availableMethods.length}>
          <option value="">{availableMethods.length ? 'All payment methods' : 'No payment method data'}</option>
          {availableMethods.map((method) => <option key={method}>{method}</option>)}
        </select>
        <input className="input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <input className="input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
      </div>
      {!invoices.length ? <EmptyState title="No invoices generated yet" message="Invoices will appear after a repair/service job is billed." /> : (
        <Table>
          <thead><tr><th>Invoice Number</th><th>Customer</th><th>Work Order / Job</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Created Date</th><th>Action</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="font-bold">{invoice.invoiceNumber}</td>
                <td>{invoice.customerId?.name}<span className="block text-xs muted">{invoice.customerId?.phone}</span></td>
                <td>{recordId(invoice.workOrderId) ? <Link className="text-sky-100 hover:text-[var(--brand)]" to={`/admin/work-orders/${recordId(invoice.workOrderId)}`}>{bookingLabel(invoice.workOrderId)}<span className="block text-xs muted">{invoice.workOrderId?.device || '-'}</span></Link> : '-'}</td>
                <td>{currency(invoice.total)}</td>
                <td>{currency(invoice.paidAmount)}</td>
                <td className={invoiceDueAmount(invoice) > 0 ? 'font-black text-amber-100' : 'font-bold text-emerald-100'}>{currency(invoiceDueAmount(invoice))}</td>
                <td><StatusBadge status={invoice.status} /></td>
                <td>{formatDate(invoice.createdAt)}</td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn btn-secondary py-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={invoice.workOrderId?.status !== 'Completed'} onClick={() => downloadWorkPdf(invoice, true)}>Preview</button>
                    <button type="button" className="btn btn-secondary py-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={invoice.workOrderId?.status !== 'Completed'} onClick={() => downloadWorkPdf(invoice)}><Download className="h-4 w-4" />PDF</button>
                    <Link className="btn btn-primary py-2" to={`/admin/payments?invoiceId=${invoice.id || invoice._id}`}>Go to Payments</Link>
                    <button type="button" className="btn btn-secondary py-2" onClick={() => sendInvoiceWhatsApp(invoice)}><Send className="h-4 w-4" />WhatsApp</button>
                  </div>
                  {invoice.workOrderId?.status !== 'Completed' ? <p className="mt-2 text-xs font-semibold text-amber-100">Complete the job before downloading invoice PDF</p> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}

function documentLabel(type) {
  if (type === 'invoice') return 'Invoice';
  if (type === 'quotation') return 'Quotation';
  if (type === 'service') return 'Service Completed';
  if (type === 'amc') return 'AMC Agreement';
  return 'Service Report';
}

function documentStatusLabel(status) {
  if (status === 'draft') return 'Draft';
  if (status === 'sent') return 'Sent';
  if (status === 'approved') return 'Ready';
  return status || 'Ready';
}

export function DocumentsPage() {
  const { request, token } = useAuth();
  const { push } = useToast();
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return params.toString() ? `?${params}` : '';
  }, [type, status, dateFrom, dateTo]);
  const { data, loading, error } = useResource(() => request(`/documents${query}`), [request, query]);
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;
  const documents = (data.documents || []).filter((document) => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) return true;
    return `${document.customerId?.name || ''} ${document.customerId?.phone || ''} ${document.workOrderId?.device || ''} ${document.workOrderId?.issue || ''}`.toLowerCase().includes(term);
  });

  async function downloadDocumentPdf(document) {
    try {
      const response = await fetch(`${apiBase}/documents/${document.id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await response.blob();
      if (!response.ok) throw new Error('PDF download failed');
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = `${document.type}-${document.id}.pdf`;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  function sendWhatsApp(document) {
    const phone = String(document.customerId?.phone || '').replace(/\D/g, '');
    if (!phone) {
      push('Customer phone number not available', 'error');
      return;
    }
    const whatsappPhone = phone.startsWith('91') ? phone : `91${phone}`;
    const message = `Hello ${document.customerId?.name || 'Customer'}, your ${documentLabel(document.type)} from Universal Systems is ready. Total: ${currency(document.totalAmount)}.`;
    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <>
      <PageHeader title="Documents & PDFs" eyebrow="Billing & PDF" action={<Link className="btn btn-primary" to="/admin/documents/new"><Plus className="h-4 w-4" />Create Document</Link>}>
        Generate quotations, invoices, AMC agreements, and service completion PDFs from work order data.
      </PageHeader>
      <div className="surface mb-5 grid gap-3 p-4 xl:grid-cols-[180px_180px_1fr_160px_160px]">
        <select className="input" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">All types</option>
          <option value="quotation">Quotation</option>
          <option value="invoice">Invoice</option>
          <option value="service">Service Completed</option>
          <option disabled>AMC Agreement (coming soon)</option>
        </select>
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="approved">Ready</option>
          <option value="sent">Sent</option>
          <option disabled>Paid</option>
          <option disabled>Locked</option>
        </select>
        <SearchBox value={customerSearch} onChange={setCustomerSearch} placeholder="Filter by customer or service job" />
        <input className="input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <input className="input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
      </div>
      {!documents.length ? <EmptyState title="No documents generated yet" message="Create quotation or invoice from a work order." action={<Link className="btn btn-primary" to="/admin/documents/new">Create Document</Link>} /> : (
        <Table>
          <thead><tr><th>Date</th><th>Type</th><th>Customer</th><th>Service Job</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {documents.map((document) => (
              <tr key={document.id}>
                <td>{formatDate(document.createdAt)}</td>
                <td className="font-bold">{documentLabel(document.type)}</td>
                <td>{document.customerId?.name}<span className="block text-xs muted">{document.customerId?.phone}</span></td>
                <td>{document.workOrderId?.device}<span className="block max-w-xs truncate text-xs muted">{document.workOrderId?.issue}</span></td>
                <td>{currency(document.totalAmount)}</td>
                <td><StatusBadge status={documentStatusLabel(document.status)} /></td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <Link className="btn btn-secondary py-2" to={`/admin/documents/${document.id}`}>Preview</Link>
                    <button type="button" className="btn btn-secondary py-2" onClick={() => downloadDocumentPdf(document)}><Download className="h-4 w-4" />Download</button>
                    <button type="button" className="btn btn-primary py-2" onClick={() => sendWhatsApp(document)}><Send className="h-4 w-4" />WhatsApp</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}

export function CreateDocumentPage() {
  const { request } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ type: 'invoice', workOrderId: '' });
  const { data, loading, error } = useResource(() => request('/work-orders'), [request]);

  async function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    try {
      const result = await request('/documents', { method: 'POST', body: JSON.stringify(form) });
      push('Document created');
      navigate(`/admin/documents/${result.document.id}`);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <PageHeader title="Create Document" eyebrow="Auto Generated">
        Select a service job and document type. Customer, job details, parts, service charge, and totals are pulled automatically.
      </PageHeader>
      <form className="surface max-w-3xl p-5" onSubmit={submit}>
        <div className="grid gap-4">
          <label>
            <span className="label">Document Type</span>
            <select className="input" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
              <option value="invoice">Invoice</option>
              <option value="quotation">Quotation</option>
              <option value="service">Service Report</option>
            </select>
          </label>
          <label>
            <span className="label">Service Job</span>
            <select className="input" value={form.workOrderId} onChange={(event) => setForm((current) => ({ ...current, workOrderId: event.target.value }))} required>
              <option value="">Select service job</option>
              {data.workOrders?.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.customerId?.name} - {order.device} - {order.status}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Link className="btn btn-secondary" to="/admin/documents">Cancel</Link>
          <button type="submit" className="btn btn-primary"><ReceiptText className="h-4 w-4" />Create</button>
        </div>
      </form>
    </>
  );
}

export function DocumentPreviewPage() {
  const { id } = useParams();
  const { request, token } = useAuth();
  const { push } = useToast();
  const [payment, setPayment] = useState({ paidAmount: '', method: 'Cash' });
  const { data, loading, error, reload } = useResource(() => request(`/documents/${id}`), [request, id]);
  const document = data?.document;

  async function downloadPdf(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    try {
      await preserveScroll(async () => {
        const response = await fetch(`${apiBase}/documents/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
        const blob = await response.blob();
        if (!response.ok) throw new Error('PDF download failed');
        const url = URL.createObjectURL(blob);
        const anchor = window.document.createElement('a');
        anchor.href = url;
        anchor.download = `${document.type}-${document.id}.pdf`;
        window.document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function previewPdf(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    try {
      await preserveScroll(async () => {
        const response = await fetch(`${apiBase}/documents/${id}/pdf?preview=true`, { headers: { Authorization: `Bearer ${token}` } });
        const blob = await response.blob();
        if (!response.ok) throw new Error('PDF preview failed');
        const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  function sendDocumentWhatsApp(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const phone = String(document.customerId?.phone || '').replace(/\D/g, '');
    if (!phone) {
      push('Customer phone number not available', 'error');
      return;
    }
    const whatsappPhone = phone.startsWith('91') ? phone : `91${phone}`;
    const message = `Hello ${document.customerId?.name || 'Customer'}, your ${documentLabel(document.type)} from Universal Systems is ready. Total: ${currency(document.totalAmount)}.`;
    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  async function recordPayment(event) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await preserveScroll(async () => {
        await request('/payments', { method: 'POST', body: JSON.stringify({ invoiceId: recordId(document.invoiceId), paidAmount: payment.paidAmount, method: payment.method }) });
        setPayment({ paidAmount: '', method: 'Cash' });
        push('Payment recorded');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <PageHeader title={`${documentLabel(document.type)} Preview`} eyebrow="Document" action={<button type="button" className="btn btn-primary" onClick={downloadPdf}>Download PDF</button>}>
        Generated from work-order data. No manual item entry required.
      </PageHeader>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="surface p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-black">{documentLabel(document.type)}</h2>
              <p className="mt-1 text-sm muted">Created {formatDate(document.createdAt)}</p>
            </div>
            <span className="status-badge">{document.status}</span>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-card bg-[var(--surface-2)] p-4">
              <p className="label">Company</p>
              <p className="font-bold">{company.name}</p>
              <p className="text-sm muted">{company.address}</p>
              <p className="text-sm muted">{company.phones.join(', ')}</p>
            </div>
            <div className="rounded-card bg-[var(--surface-2)] p-4">
              <p className="label">Customer</p>
              <p className="font-bold">{document.customerId?.name}</p>
              <p className="text-sm muted">{document.customerId?.phone}</p>
              <p className="text-sm muted">{document.customerId?.address}</p>
            </div>
            <div className="rounded-card bg-[var(--surface-2)] p-4 md:col-span-2">
              <p className="label">Service Job</p>
              <p className="font-bold">{document.workOrderId?.device}</p>
              <p className="text-sm muted">{document.workOrderId?.issue}</p>
              <StatusBadge status={document.workOrderId?.status} />
            </div>
          </div>
          <div className="mt-6">
            <Table>
              <thead><tr><th>Item</th><th>Quantity</th><th>Price</th><th>Subtotal</th></tr></thead>
              <tbody className="divide-y divide-[var(--line)]">
                {document.items?.length ? document.items.map((item, index) => <tr key={`${item.name}-${index}`}><td className="font-bold">{item.name}</td><td>{item.quantity}</td><td>{currency(item.price)}</td><td>{currency(item.subtotal)}</td></tr>) : <tr><td colSpan="4" className="muted">No parts used.</td></tr>}
              </tbody>
            </Table>
          </div>
          <div className="mt-5 rounded-card bg-[var(--surface-2)] p-4 text-right">
            <p className="text-sm muted">Service Charge: {currency(document.serviceCharge)}</p>
            <p className="mt-1 text-2xl font-black">Total: {currency(document.totalAmount)}</p>
          </div>
        </div>
        <div className="grid content-start gap-5">
          {document.type === 'invoice' && document.invoiceId ? (
            <div className="surface p-5">
              <h2 className="text-xl font-black">Payment Summary</h2>
              <div className="mt-4 rounded-card bg-[var(--surface-2)] p-4">
                <p className="font-bold">{document.invoiceId.invoiceNumber}</p>
                <p className="text-sm muted">Paid: {currency(document.invoiceId.paidAmount)}</p>
                <p className="text-sm muted">Balance: {currency(document.invoiceId.balance)}</p>
                <StatusBadge status={document.invoiceId.status} />
              </div>
              <Link className="btn btn-secondary mt-4 w-full" to={`/admin/payments?invoiceId=${recordId(document.invoiceId)}`}>Go to Payments</Link>
              {document.invoiceId.balance > 0 ? (
                <form className="mt-4 grid gap-3" onSubmit={recordPayment}>
                  <input className="input" type="number" min="1" max={document.invoiceId.balance} placeholder="Paid amount" value={payment.paidAmount} onChange={(event) => setPayment((current) => ({ ...current, paidAmount: event.target.value }))} required />
                  <select className="input" value={payment.method} onChange={(event) => setPayment((current) => ({ ...current, method: event.target.value }))}>
                    <option>Cash</option>
                    <option>UPI</option>
                  </select>
                  <button type="submit" className="btn btn-primary"><CreditCard className="h-4 w-4" />Record Payment</button>
                </form>
              ) : <p className="mt-4 text-sm muted">Invoice is fully paid.</p>}
            </div>
          ) : null}
          <div className="surface p-5">
            <h2 className="text-xl font-black">PDF Actions</h2>
            <p className="mt-2 text-sm muted">The generated PDF template remains unchanged.</p>
            <div className="mt-4 grid gap-2">
              <button type="button" className="btn btn-secondary w-full" onClick={previewPdf}><FileText className="h-4 w-4" />Preview PDF</button>
              <button type="button" className="btn btn-secondary w-full" onClick={downloadPdf}><Download className="h-4 w-4" />Download PDF</button>
              <button type="button" className="btn btn-primary w-full" onClick={sendDocumentWhatsApp}><Send className="h-4 w-4" />Send via WhatsApp</button>
            </div>
          </div>
          <div className="surface p-5">
            <h2 className="text-xl font-black">Status</h2>
            <div className="mt-4 rounded-card bg-[var(--surface-2)] p-4">
              <StatusBadge status={documentStatusLabel(document.status)} />
              <p className="mt-3 text-sm muted">Created {formatDate(document.createdAt)}</p>
              <p className="mt-1 text-sm muted">Total {currency(document.totalAmount)}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export function AuditLogsPage() {
  const { request } = useAuth();
  const [moduleName, setModuleName] = useState('');
  const [actionName, setActionName] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (moduleName) params.set('module', moduleName);
    if (actionName) params.set('action', actionName);
    return params.toString() ? `?${params}` : '';
  }, [moduleName, actionName]);
  const { data, loading, error } = useResource(() => request(`/audit-logs${query}`), [request, query]);

  useEffect(() => {
    if (!selectedLog) return undefined;
    function closeOnEscape(event) {
      if (event.key === 'Escape') setSelectedLog(null);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedLog]);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  const jsonText = (value, emptyText) => (value == null ? emptyText : JSON.stringify(value, null, 2));
  const logs = (data.logs || []).filter((log) => {
    const userText = `${log.userId?.name || ''} ${log.userId?.username || ''}`.toLowerCase();
    const matchesUser = !userSearch.trim() || userText.includes(userSearch.trim().toLowerCase());
    const created = new Date(log.createdAt);
    const matchesFrom = !dateFrom || created >= new Date(dateFrom);
    const matchesTo = !dateTo || created <= new Date(`${dateTo}T23:59:59`);
    return matchesUser && matchesFrom && matchesTo;
  });

  return (
    <>
      <PageHeader title="Audit Logs" eyebrow="ADMIN ONLY">
        Company internal activity history. Tracks important status, stock, payment, invoice, and document changes.
      </PageHeader>
      <div className="surface mb-5 grid gap-3 p-4 xl:grid-cols-[220px_220px_1fr_160px_160px]">
        <select className="input" value={moduleName} onChange={(event) => setModuleName(event.target.value)}>
          <option value="">All modules</option>
          {['booking', 'work_order', 'inventory', 'invoice', 'payment', 'document', 'communication'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="input" value={actionName} onChange={(event) => setActionName(event.target.value)}>
          <option value="">All actions</option>
          {['booking_created', 'invoice_generated', 'created', 'updated', 'payment_recorded', 'stock_movement', 'stock_changed', 'status_changed', 'auto_assigned'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <SearchBox value={userSearch} onChange={setUserSearch} placeholder="Filter by user" />
        <input className="input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <input className="input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
      </div>
      {!logs.length ? <EmptyState title="No audit logs" message="No audit records match the current filters." /> : (
        <Table>
          <thead><tr><th>Date</th><th>User</th><th>Action</th><th>Module</th><th>Before / After</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{formatDate(log.createdAt)}</td>
                <td>{log.userId?.name || log.userId?.username || '-'}</td>
                <td className="font-bold">{log.action}</td>
                <td>{log.module}</td>
                <td>
                  <button type="button" className="btn btn-secondary py-2" onClick={() => setSelectedLog(log)}>
                    View JSON changes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {selectedLog ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/65 p-4" onClick={() => setSelectedLog(null)}>
          <div className="surface max-h-[90vh] w-full max-w-5xl overflow-hidden p-0 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="audit-log-changes-title" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">ADMIN ONLY</p>
                <h2 id="audit-log-changes-title" className="mt-1 text-xl font-black">Audit Log Changes</h2>
              </div>
              <button type="button" className="icon-button h-9 w-9" onClick={() => setSelectedLog(null)} aria-label="Close audit log changes">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[calc(90vh-5rem)] overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Date', formatDate(selectedLog.createdAt)],
                  ['User', selectedLog.userId?.name || selectedLog.userId?.username || '-'],
                  ['Action', selectedLog.action || '-'],
                  ['Module', selectedLog.module || '-']
                ].map(([label, value]) => (
                  <div key={label} className="rounded-card bg-[var(--surface-2)] p-3">
                    <p className="label">{label}</p>
                    <p className="mt-1 break-words text-sm font-bold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="label mb-2">Before</p>
                  <pre className="max-h-[56vh] overflow-auto rounded-card border border-white/10 bg-black/35 p-4 font-mono text-xs leading-5 text-slate-100">{jsonText(selectedLog.before, 'No previous value')}</pre>
                </div>
                <div>
                  <p className="label mb-2">After</p>
                  <pre className="max-h-[56vh] overflow-auto rounded-card border border-white/10 bg-black/35 p-4 font-mono text-xs leading-5 text-slate-100">{jsonText(selectedLog.after, 'No updated value')}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

const emptyTechnicianForm = {
  name: '',
  phone: '',
  username: '',
  password: '',
  confirmPassword: '',
  technicianTitle: 'Technician',
  status: 'Active'
};

function SettingsInfoCard({ title, icon: Icon, children }) {
  return (
    <div className="surface p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-card bg-sky-400/15 text-[var(--brand)]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}

function TeamAccessSection() {
  const { request } = useAuth();
  const { push } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const { data, loading, error, reload } = useResource(() => request('/users'), [request]);

  const technicians = useMemo(
    () => (data?.users || [])
      .filter((user) => user.role === 'technician')
      .sort((a, b) => a.name.localeCompare(b.name)),
    [data?.users]
  );
  const activeCount = technicians.filter((tech) => tech.active).length;
  const disabledCount = technicians.length - activeCount;

  async function toggleStatus(technician) {
    try {
      await request(`/users/${technician.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !technician.active })
      });
      push(technician.active ? 'Technician account disabled' : 'Technician account enabled');
      reload({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function createTechnician(form) {
    if (form.password !== form.confirmPassword) throw new Error('Passwords do not match');
    await request('/users', {
      method: 'POST',
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        username: form.username,
        password: form.password,
        role: 'technician',
        technicianTitle: form.technicianTitle,
        active: form.status === 'Active'
      })
    });
    push('Technician created');
    setAddOpen(false);
    reload({ silent: true });
  }

  async function updateTechnician(form) {
    await request(`/users/${editUser.id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        username: form.username,
        technicianTitle: form.technicianTitle,
        active: form.status === 'Active'
      })
    });
    push('Technician updated');
    setEditUser(null);
    reload({ silent: true });
  }

  async function resetPassword(password, confirmPassword) {
    if (password !== confirmPassword) throw new Error('Passwords do not match');
    await request(`/users/${resetUser.id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password })
    });
    push('Temporary password updated. Share it securely with the technician.');
    setResetUser(null);
    reload({ silent: true });
  }

  return (
    <div className="surface p-5 lg:col-span-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-card bg-sky-400/15 text-[var(--brand)]">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black">Team & Access</h2>
              <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase text-amber-100">Admin only</span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 muted">Manage technician login access, temporary passwords, and account status.</p>
          </div>
        </div>
        <button type="button" className="btn btn-primary shrink-0" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Technician
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ['Total Technicians', technicians.length],
          ['Active Technicians', activeCount],
          ['Disabled Accounts', disabledCount]
        ].map(([label, value]) => (
          <div key={label} className="rounded-card border border-white/10 bg-white/[0.045] p-3">
            <p className="text-xs font-black uppercase text-[var(--brand)]">{label}</p>
            <p className="mt-1 text-2xl font-black">{value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-card border border-white/10 bg-white/[0.035] p-3 text-sm muted">
        Passwords are encrypted and cannot be viewed after saving.
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="rounded-card border border-[var(--line)] bg-[var(--surface-2)] p-4 text-sm muted">Loading technician accounts...</div>
        ) : error ? (
          <div className="rounded-card border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">Unable to load technician accounts.</div>
        ) : technicians.length ? (
          <div className="table-wrap bg-[var(--surface)]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Technician</th>
                  <th>Username / Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {technicians.map((tech) => (
                  <tr key={tech.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-card bg-sky-400/15 text-sm font-black text-sky-100">
                          {tech.name?.slice(0, 1) || 'T'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold">{tech.name}</p>
                          <p className="text-xs muted">Employee login account</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="font-bold">{tech.username}</p>
                      <p className="text-xs muted">{tech.phone || 'No phone added'}</p>
                    </td>
                    <td>{tech.technicianTitle || 'Technician'}</td>
                    <td>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tech.active ? 'bg-emerald-400/15 text-emerald-100' : 'bg-slate-500/20 text-slate-200'}`}>
                        {tech.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{tech.updatedAt ? formatDate(tech.updatedAt) : '-'}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn btn-secondary" onClick={() => setResetUser(tech)}>
                          <KeyRound className="h-4 w-4" />
                          Reset Password
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => toggleStatus(tech)}>
                          {tech.active ? 'Disable' : 'Enable'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => setEditUser(tech)}>
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No technician accounts"
            message="Create technician credentials here so service staff can sign in to the technician panel."
            action={
              <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Technician
              </button>
            }
          />
        )}
      </div>

      {addOpen ? <TechnicianAccountModal title="Add Technician" submitLabel="Create Technician" onClose={() => setAddOpen(false)} onSubmit={createTechnician} /> : null}
      {editUser ? <TechnicianAccountModal title="Edit Technician" submitLabel="Save Changes" technician={editUser} editMode onClose={() => setEditUser(null)} onSubmit={updateTechnician} /> : null}
      {resetUser ? <ResetPasswordModal technician={resetUser} onClose={() => setResetUser(null)} onSubmit={resetPassword} /> : null}
    </div>
  );
}

function TechnicianAccountModal({ title, submitLabel, technician = null, editMode = false, onClose, onSubmit }) {
  const { push } = useToast();
  const [form, setForm] = useState(() => technician ? {
    name: technician.name || '',
    phone: technician.phone || '',
    username: technician.username || '',
    password: '',
    confirmPassword: '',
    technicianTitle: technician.technicianTitle || 'Technician',
    status: technician.active ? 'Active' : 'Inactive'
  } : emptyTechnicianForm);
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4">
      <form className="surface max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5" onSubmit={submit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">{title}</h2>
            <p className="mt-1 text-sm muted">Technician credentials are encrypted before storage.</p>
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onClose} aria-label="Close technician modal">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="label">Technician Name</span>
            <input className="input" value={form.name} onChange={(event) => update('name', event.target.value)} required />
          </label>
          <label>
            <span className="label">Phone</span>
            <input className="input" value={form.phone} onChange={(event) => update('phone', event.target.value)} />
          </label>
          <label>
            <span className="label">Username</span>
            <input className="input" value={form.username} onChange={(event) => update('username', event.target.value)} required />
          </label>
          <label>
            <span className="label">Role</span>
            <select className="input" value={form.technicianTitle} onChange={(event) => update('technicianTitle', event.target.value)}>
              <option>Technician</option>
              <option>Senior Technician</option>
            </select>
          </label>
          {!editMode ? (
            <>
              <label>
                <span className="label">Temporary Password</span>
                <input className="input" type="password" value={form.password} onChange={(event) => update('password', event.target.value)} minLength={6} required />
              </label>
              <label>
                <span className="label">Confirm Password</span>
                <input className="input" type="password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} minLength={6} required />
              </label>
            </>
          ) : null}
          <label>
            <span className="label">Status</span>
            <select className="input" value={form.status} onChange={(event) => update('status', event.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </label>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function ResetPasswordModal({ technician, onClose, onSubmit }) {
  const { push } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(password, confirmPassword);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4">
      <form className="surface w-full max-w-md p-5" onSubmit={submit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Reset Password</h2>
            <p className="mt-1 text-sm muted">{technician.name} will use this temporary password for technician login.</p>
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onClose} aria-label="Close password reset modal">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          <label>
            <span className="label">New Temporary Password</span>
            <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
          </label>
          <label>
            <span className="label">Confirm Password</span>
            <input className="input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={6} required />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving}>
            <KeyRound className="h-4 w-4" />
            {saving ? 'Saving...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function SystemSettingsPage() {
  return (
    <>
      <PageHeader title="Settings" eyebrow="System">
        Review workspace identity, access, and operational defaults.
      </PageHeader>
      <div className="grid gap-5 lg:grid-cols-2">
        <SettingsInfoCard title="Workspace Profile" icon={ShieldCheck}>
          <div className="mt-4 grid gap-3">
            {[
              ['Company', company.name],
              ['Location', company.address],
              ['Phone', company.phones.join(' / ')],
              ['Email', company.email]
            ].map(([label, value]) => (
              <div key={label} className="rounded-card bg-[var(--surface-2)] p-3">
                <p className="text-xs font-black uppercase text-[var(--brand)]">{label}</p>
                <p className="mt-1 font-bold">{value}</p>
              </div>
            ))}
          </div>
        </SettingsInfoCard>
        <SettingsInfoCard title="System Access" icon={KeyRound}>
          <div className="mt-4 grid gap-3">
            <div className="rounded-card bg-[var(--surface-2)] p-3">
              <p className="text-xs font-black uppercase text-[var(--brand)]">Admin Sidebar</p>
              <p className="mt-1 font-bold">Dashboard, operations, customers, inventory, billing, AMC, reports, audit logs, and settings.</p>
            </div>
            <div className="rounded-card bg-[var(--surface-2)] p-3">
              <p className="text-xs font-black uppercase text-[var(--brand)]">Audit Trail</p>
              <p className="mt-1 font-bold">Operational changes remain available from System / Audit Logs.</p>
            </div>
          </div>
        </SettingsInfoCard>
        <TeamAccessSection />
      </div>
    </>
  );
}
