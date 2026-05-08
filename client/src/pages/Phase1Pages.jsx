import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Bell, Boxes, CalendarClock, CheckCircle2, ClipboardList, CreditCard, Download, FileText, Loader2, PackagePlus, PhoneCall as PhoneCallIcon, Plus, ReceiptText, Save, Send, Trash2, Users, Wrench, X } from 'lucide-react';
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
const bookingSources = ['Walk-in', 'Call', 'Website', 'WhatsApp', 'Referral'];
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
    <div className="surface grid min-h-48 place-items-center">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--brand)]" />
    </div>
  );
}

function ErrorBlock({ message }) {
  return <EmptyState title="Unable to load" message={message} />;
}

function StatusBadge({ status }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusTone(status)}`}>{status}</span>;
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
    lockedText: 'Available after job is completed.',
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

function SmartMetricCard({ icon: Icon, label, value, tone, to }) {
  const numericValue = Number(value || 0);
  const displayValue = typeof value === 'string' ? value : numericValue;
  const toneClass = {
    red: 'border-rose-400/35 bg-rose-500/10 text-rose-200',
    yellow: 'border-amber-300/35 bg-amber-400/10 text-amber-100',
    blue: 'border-sky-300/35 bg-sky-400/10 text-sky-100',
    green: 'border-emerald-300/35 bg-emerald-400/10 text-emerald-100'
  }[tone] || 'border-sky-300/35 bg-sky-400/10 text-sky-100';
  const iconClass = {
    red: 'text-rose-300',
    yellow: 'text-amber-200',
    blue: 'text-sky-200',
    green: 'text-emerald-200'
  }[tone] || 'text-sky-200';

  return (
    <Link to={to} className={`surface lift-card block border ${toneClass} p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold muted">{label}</p>
          <p className="mt-3 text-3xl font-black">{displayValue}</p>
          {typeof value !== 'string' && numericValue === 0 ? <p className="mt-2 text-sm font-semibold text-emerald-200">All good</p> : null}
        </div>
        <span className="grid h-11 w-11 place-items-center rounded-card bg-white/10">
          <Icon className={`h-5 w-5 ${iconClass}`} />
        </span>
      </div>
    </Link>
  );
}

function PriorityAlerts({ alerts = [] }) {
  const toneClass = {
    critical: 'border-rose-400/30 bg-rose-500/10 text-rose-100',
    warning: 'border-amber-300/30 bg-amber-400/10 text-amber-100',
    info: 'border-sky-300/30 bg-sky-400/10 text-sky-100'
  };

  return (
    <div className="surface p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">Priority Alerts</h2>
          <p className="mt-1 text-sm muted">Critical work, stock, payments, and new intake in one view.</p>
        </div>
        <AlertTriangle className="h-5 w-5 text-[var(--warning)]" />
      </div>
      <div className="grid gap-3">
        {alerts.length ? alerts.map((alert) => (
          <Link key={`${alert.level}-${alert.title}`} to={alert.to} className={`alert-link rounded-card border p-3 ${toneClass[alert.level]}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase">{alert.level}</p>
                <p className="mt-1 font-bold">{alert.title}</p>
              </div>
              <span className="status-badge bg-white/10 text-white">{alert.count}</span>
            </div>
            <p className="mt-1 text-sm opacity-80">{alert.message}</p>
          </Link>
        )) : <EmptyState title="No pending jobs" message="Inventory, jobs, and payments are clear." />}
      </div>
    </div>
  );
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
    <div className="surface p-5">
      <h2 className="text-xl font-black">Technician Workload</h2>
      <div className="mt-4 grid gap-4">
        {technicians.length ? technicians.map((tech) => {
          const percent = Math.min(100, Math.round((Number(tech.activeJobs || 0) / maxJobs) * 100));
          return (
            <div key={tech.id} className="rounded-card bg-[var(--surface-2)] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <span className="font-bold">{tech.name}</span>
                <span className="text-xs muted">{tech.activeJobs} active</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-300 transition-all" style={{ width: `${percent}%` }} />
              </div>
            </div>
          );
        }) : <p className="text-sm muted">No technician workload yet.</p>}
      </div>
    </div>
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
      RETURN: 'bg-purple-400/15 text-purple-100',
      ADJUST: 'bg-orange-400/15 text-orange-100'
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
      Number(data.stats?.lowStockCritical || 0) > 0 ? { level: 'critical', title: 'Out of stock items', count: data.stats.lowStockCritical, message: 'Stock is at zero and needs immediate refill.', to: '/admin/parts' } : null,
      Number(data.stats?.jobsOverdue || 0) > 0 ? { level: 'critical', title: 'Overdue jobs', count: data.stats.jobsOverdue, message: 'Jobs have not moved in more than 24 hours.', to: '/admin/work-orders' } : null,
      Number(data.lowStockAlerts?.length || 0) > 0 ? { level: 'warning', title: 'Low stock', count: data.lowStockAlerts.length, message: 'Parts are close to their low stock limit.', to: '/admin/parts' } : null,
      Number(data.stats?.pendingPayments || 0) > 0 ? { level: 'warning', title: 'Pending payments', count: data.stats.pendingPayments, message: 'Invoices still have balance due.', to: '/admin/invoices' } : null,
      Number(data.stats?.todayBookings || 0) > 0 ? { level: 'info', title: 'New bookings', count: data.stats.todayBookings, message: 'Fresh service bookings received today.', to: '/admin/bookings' } : null
    ].filter(Boolean);
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
    <>
      <PageHeader
        title="Admin Dashboard"
        eyebrow="Smart Service Command"
        action={(
          <div className="quick-actions flex flex-wrap justify-start gap-2 md:justify-end">
            <Link className="btn btn-primary glow-action" to="/admin/bookings"><Plus className="h-4 w-4" />Booking</Link>
            <Link className="btn btn-secondary" to="/admin/work-orders"><Plus className="h-4 w-4" />Service Job</Link>
            <Link className="btn btn-secondary" to="/admin/stock-movements"><PackagePlus className="h-4 w-4" />Add Stock</Link>
            <Link className="btn btn-secondary" to="/admin/payments"><CreditCard className="h-4 w-4" />Record Payment</Link>
          </div>
        )}
      >
        Action-ready view of overdue work, billing, stock health, bookings, and technician load.
        {lastUpdated ? <span className="mt-1 block text-xs">Last updated: {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span> : null}
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SmartMetricCard icon={CalendarClock} label="Today's Bookings" value={data.stats.todayBookings} tone="blue" to="/admin/bookings" />
        <SmartMetricCard icon={ClipboardList} label="Pending Service Jobs" value={data.stats.pendingJobs} tone="yellow" to="/admin/work-orders" />
        <SmartMetricCard icon={Wrench} label="Jobs In Progress" value={data.stats.inProgressJobs} tone="blue" to="/admin/work-orders" />
        <SmartMetricCard icon={CheckCircle2} label="Completed Today" value={completedToday} tone="green" to="/admin/work-orders" />
        <SmartMetricCard icon={CreditCard} label="Pending Payments" value={pendingPaymentInvoices.length || data.stats.pendingPayments} tone="yellow" to="/admin/invoices" />
        <SmartMetricCard icon={AlertTriangle} label="Low Stock Items" value={(data.lowStockAlerts?.length || 0) + Number(data.stats.lowStockCritical || 0)} tone="red" to="/admin/parts" />
        <SmartMetricCard icon={FileText} label="Active AMC Contracts" value={data.stats.activeAmcContracts || 0} tone="green" to="/admin/amc-contracts" />
        <SmartMetricCard icon={Bell} label="AMC Renewals Due" value={amcRenewalsDue} tone="yellow" to="/admin/amc-renewals" />
        <SmartMetricCard icon={CalendarClock} label="AMC Visits This Week" value={data.stats.amcVisitsThisWeek || 0} tone="blue" to="/admin/amc-schedule" />
        <SmartMetricCard icon={AlertTriangle} label="Expired Contracts" value={data.stats.expiredAmcContracts || 0} tone="red" to="/admin/amc-renewals" />
        <SmartMetricCard icon={ReceiptText} label="Monthly Revenue" value={currency(monthlyRevenue)} tone="green" to="/admin/payments" />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <PriorityAlerts alerts={alerts} />
        <div className="grid gap-5 lg:grid-cols-2">
          <DashboardChart title="Bookings Last 7 Days">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="rgba(117,196,255,0.12)" vertical={false} />
                <XAxis dataKey="label" stroke="#aebfd7" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} stroke="#aebfd7" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#071426', border: '1px solid rgba(117,196,255,0.25)', borderRadius: 8 }} />
                <Line type="monotone" dataKey="bookings" stroke="#75c4ff" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </DashboardChart>
          <DashboardChart title="Revenue Last 7 Days">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid stroke="rgba(117,196,255,0.12)" vertical={false} />
                <XAxis dataKey="label" stroke="#aebfd7" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#aebfd7" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `Rs.${value}`} />
                <Tooltip formatter={(value) => currency(value)} contentStyle={{ background: '#071426', border: '1px solid rgba(117,196,255,0.25)', borderRadius: 8 }} />
                <Bar dataKey="revenue" fill="#22c55e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </DashboardChart>
        </div>
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <div className="surface lift-card p-5">
          <h2 className="text-xl font-black">Recent Bookings</h2>
          <div className="mt-4 grid gap-3">
            {data.recentBookings?.length ? data.recentBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between gap-3 rounded-card bg-[var(--surface-2)] p-3">
                <div className="min-w-0">
                  {booking.customerId ? (
                    <Link className="truncate font-bold text-sky-100 hover:text-[var(--brand)]" to={`/admin/customers/${recordId(booking.customerId)}`}>{booking.customerName}</Link>
                  ) : <p className="truncate font-bold">{booking.customerName}</p>}
                  <p className="truncate text-sm muted">{booking.bookingCode} - {booking.device}</p>
                </div>
                <StatusBadge status={booking.status} />
              </div>
            )) : <p className="text-sm muted">No new bookings today.</p>}
          </div>
        </div>
        <div className="surface lift-card p-5">
          <h2 className="text-xl font-black">Repair & Service Queue</h2>
          <div className="mt-4 grid gap-3">
            {activeWorkOrders.length ? activeWorkOrders.map((order) => (
              <Link key={order.id} to={`/admin/work-orders/${order.id}`} className="alert-link flex items-center justify-between gap-3 rounded-card bg-[var(--surface-2)] p-3">
                <div className="min-w-0">
                  <p className="truncate font-bold">{order.customerId?.name || 'Customer'}</p>
                  <p className="truncate text-sm muted">{order.device} - {order.technicianId?.name || 'Unassigned'}</p>
                </div>
                <StatusBadge status={order.status} />
              </Link>
            )) : <p className="text-sm muted">No active service jobs.</p>}
          </div>
        </div>
        <div className="surface lift-card p-5">
          <h2 className="text-xl font-black">Pending Payments</h2>
          <div className="mt-4 grid gap-3">
            {pendingPaymentInvoices.length ? pendingPaymentInvoices.slice(0, 6).map((invoice) => (
              <Link key={invoice.id} to={`/admin/payments?invoiceId=${invoice.id || invoice._id}`} className="alert-link flex items-center justify-between gap-3 rounded-card bg-[var(--surface-2)] p-3">
                <div className="min-w-0">
                  <p className="truncate font-bold">{invoice.invoiceNumber}</p>
                  <p className="truncate text-sm muted">{invoice.customerId?.name || 'Customer'}</p>
                </div>
                <span className="font-black text-amber-100">{currency(invoiceDueAmount(invoice))}</span>
              </Link>
            )) : <p className="text-sm muted">No pending payments.</p>}
          </div>
        </div>
        <div className="surface lift-card p-5">
          <h2 className="text-xl font-black">Low Stock Alerts</h2>
          <div className="mt-4 grid gap-3">
            {data.lowStockAlerts?.length ? data.lowStockAlerts.map((part) => (
              <Link key={part.id} to="/admin/parts" className="alert-link flex items-center justify-between rounded-card bg-[var(--surface-2)] p-3">
                <div>
                  <p className="font-bold">{part.partName}</p>
                  <p className="text-sm muted">{part.category}</p>
                </div>
                <span className="status-badge">{part.available} available</span>
              </Link>
            )) : <p className="text-sm muted">Inventory healthy</p>}
          </div>
        </div>
        <NotificationsPanel notifications={data.notifications || []} />
        <RemindersPanel reminders={data.reminders || []} />
        <TechnicianWorkloadBars technicians={data.technicianWorkload || []} />
      </div>
    </>
  );

  return (
    <>
      <PageHeader title="Admin Dashboard" eyebrow="Phase 2 Core">
        Today bookings, job load, payments, stock alerts, and notifications.
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={AlertTriangle} label="Jobs Overdue" value={data.stats.jobsOverdue} tone="yellow" />
        <StatCard icon={CalendarClock} label="Today Bookings" value={data.stats.todayBookings} />
        <StatCard icon={PhoneCallIcon} label="High Priority Calls" value={data.stats.highPriorityCalls} tone="yellow" />
        <StatCard icon={Users} label="Unassigned Jobs" value={data.stats.unassignedJobs} tone="yellow" />
        <StatCard icon={PackagePlus} label="Jobs Awaiting Parts" value={data.stats.awaitingPartsJobs} tone="yellow" />
        <StatCard icon={Wrench} label="Jobs In Progress" value={data.stats.inProgressJobs} />
        <StatCard icon={CreditCard} label="Pending Payments" value={data.stats.pendingPayments} tone="yellow" />
        <StatCard icon={CreditCard} label="Payments Overdue" value={data.stats.paymentsOverdue} tone="yellow" />
        <StatCard icon={AlertTriangle} label="Low Stock Alerts" value={data.lowStockAlerts?.length || 0} tone="yellow" />
        <StatCard icon={AlertTriangle} label="Low Stock Critical" value={data.stats.lowStockCritical} tone="yellow" />
      </div>
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
            <thead><tr><th>Contract ID</th><th>Customer</th><th>Phone</th><th>Contract Type</th><th>Covered Service</th><th>Start</th><th>End</th><th>Renewal</th><th>Value</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {visibleContracts.map((contract) => (
                <tr key={recordId(contract)}>
                  <td className="font-bold">{contract.contractId}</td>
                  <td>{contract.customerName}</td>
                  <td>{contract.phone}</td>
                  <td>{contract.contractType}</td>
                  <td>{contract.coveredService}</td>
                  <td>{formatDate(contract.startDate)}</td>
                  <td>{formatDate(contract.endDate)}</td>
                  <td><AmcStatusBadge status={contract.renewalStatus} /></td>
                  <td>{currency(contract.contractValue)}</td>
                  <td><AmcStatusBadge status={contract.status} /></td>
                  <td>
                    <div className="flex flex-wrap gap-2">
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
    return matchesSearch && matchesStatus && matchesService;
  });

  return (
    <>
      <PageHeader title="Bookings" eyebrow="Admin" action={<button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" />Create Booking</button>}>
        Booking intake is kept separate from repair and service jobs. Convert a booking when service work begins.
      </PageHeader>
      <div className="surface mb-5 grid gap-3 p-4 lg:grid-cols-[1fr_180px_220px]">
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
      </div>
      {!bookings.length ? <EmptyState title="No bookings found" message="Try changing the search or filters, or create the first booking." action={<button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" />Create Booking</button>} /> : (
        <Table>
          <thead>
            <tr><th>Booking</th><th>Customer</th><th>Device / Service</th><th>Issue</th><th>Status</th><th>Convert / Open</th></tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td className="font-bold">{booking.bookingCode}<span className="block text-xs font-normal muted">{formatDate(booking.createdAt)}</span></td>
                <td>{booking.customerName}<span className="block text-xs muted">{booking.phone}</span></td>
                <td>{booking.device || 'General Service'}</td>
                <td className="max-w-xs truncate">{booking.issue}</td>
                <td><StatusBadge status={booking.status} /></td>
                <td><ConvertBooking booking={booking} technicians={technicians} onConvert={convert} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {formOpen ? <BookingModal onClose={() => setFormOpen(false)} onSaved={reload} /> : null}
    </>
  );
}

function ConvertBooking({ booking, technicians, onConvert }) {
  const [technicianId, setTechnicianId] = useState(booking.technicianId?.id || '');
  if (booking.status === 'Converted') {
    return booking.workOrderId ? <Link className="btn btn-secondary py-2" to={`/admin/work-orders/${booking.workOrderId.id || booking.workOrderId}`}>Open Service Job</Link> : 'Converted';
  }
  return (
    <div className="flex min-w-64 gap-2">
      <select className="input py-2" value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}>
        <option value="">Unassigned</option>
        {technicians.map((tech) => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
      </select>
      <button type="button" className="btn btn-primary py-2" onClick={() => onConvert(booking.id, technicianId)}>Convert</button>
    </div>
  );
}

function BookingModal({ onClose, onSaved }) {
  const { request } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState({ customerName: '', phone: '', address: '', serviceType: serviceTypes[0] || 'PC / Laptop Service', device: 'Laptop', bookingSource: 'Walk-in', issue: '' });
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
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [technicians, setTechnicians] = useState([]);
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (technicianId) params.set('technicianId', technicianId);
    return params.toString() ? `?${params}` : '';
  }, [status, dateFrom, dateTo, technicianId]);
  const { data, loading, error, reload } = useResource(() => request(`/work-orders${query}`), [request, query]);
  const base = role === 'admin' ? '/admin/work-orders' : '/tech/work-orders';

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
    if (!serviceType) return true;
    return `${order.serviceType || ''} ${order.service || ''} ${order.device || ''} ${order.issue || ''}`.toLowerCase().includes(serviceType.toLowerCase());
  });

  return (
    <>
      <PageHeader title={role === 'admin' ? 'Repair & Service Jobs' : 'My Repair & Service Jobs'} eyebrow={role === 'admin' ? 'Operations' : 'Technician'}>
        Track active service jobs, repairs, installations, parts, billing, and completion.
      </PageHeader>
      <div className="surface mb-5 grid gap-3 p-4 xl:grid-cols-[1fr_170px_170px_160px_160px_190px]">
        <SearchBox value={search} onChange={setSearch} placeholder="Search customer, phone, device, service, issue" />
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {workOrderDetailStatuses.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="input" value={serviceType} onChange={(event) => setServiceType(event.target.value)}>
          <option value="">All service types</option>
          {serviceTypes.map((item) => <option key={item}>{item}</option>)}
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
          <thead><tr><th>Customer</th><th>Service / Device</th><th>Technician</th><th>Status</th><th>Invoice / Payment</th><th>Created</th><th>Actions</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {workOrders.map((order) => (
              <tr key={order.id}>
                <td className="font-bold">{role === 'admin' && order.customerId ? <Link className="text-sky-100 hover:text-[var(--brand)]" to={`/admin/customers/${recordId(order.customerId)}`}>{order.customerId?.name}</Link> : order.customerId?.name}<span className="block text-xs muted">{order.customerId?.phone}</span></td>
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

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  const partsTotal = (order.partsUsed || []).reduce((sum, item) => sum + Number(item.total || 0), 0);
  const savedServiceCharge = Number(order.serviceCharge || 0);
  const currentServiceCharge = Number(serviceCharge || 0);
  const totalAmount = partsTotal + currentServiceCharge;
  const imageItems = order.images || [];
  const rawCustomerId = recordId(order.customerId) || recordId(order.bookingId) || order.id || order._id || '';
  const customerId = `US-${String(rawCustomerId).slice(-4).toUpperCase()}`;
  const livePartTotal = Number(part.unitPrice || 0) * Number(part.quantity || 1);
  const selectedInventoryPart = inventoryParts.find((item) => item.id === part.inventoryPartId);
  const selectedPartAvailable = Number(selectedInventoryPart?.available || 0);
  const contentTabs = ['parts', 'partRequests', 'billing', 'notes'];
  const sideTabs = ['documents', 'timeline'];

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
            ['Booking Source', order.bookingSource || order.bookingId?.bookingSource || order.bookingId?.source || 'Not captured']
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
                        <button type="button" className="btn btn-primary" onClick={addPart}><PackagePlus className="h-4 w-4" />+ Add Part</button>
                      </form>
                      {!part.inventoryPartId ? <input className="input mt-3" placeholder="Manual part name" value={part.partName} onChange={(event) => setPart((current) => ({ ...current, partName: event.target.value }))} /> : null}
                      {selectedInventoryPart && selectedPartAvailable <= 0 ? <p className="mt-3 text-sm font-semibold text-rose-100">Stock warning: this part is currently out of stock.</p> : null}
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
                    <p className="mt-2 text-sm muted">{enabled ? flow.readyText : flow.lockedText}</p>
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
          <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Customer Type</p><p className="mt-1 text-sm font-bold">{customerTypeLabel(customer) || 'Not set'}</p></div>
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
          <div><p className="text-sm muted">AMC Status</p><p className="mt-2 text-lg font-black">{customer.amcStatus || 'Not available'}</p></div>
          <div><p className="text-sm muted">Warranty Items</p><p className="mt-2 text-lg font-black">{customer.warrantyItems?.length || 'Not available'}</p></div>
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
                <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Type</p><p className="font-bold">{customerTypeLabel(customer) || 'Not set'}</p></div>
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
  function paymentMethodSummary(invoice) {
    const payments = paymentSummaryByInvoice.get(invoice?.id || invoice?._id) || [];
    if (!payments.length) return '-';
    const byMethod = payments.reduce((summary, payment) => {
      summary[payment.method] = Number(summary[payment.method] || 0) + Number(payment.paidAmount || 0);
      return summary;
    }, {});
    return Object.entries(byMethod).map(([method, amount]) => `${method} ${currency(amount)}`).join(' + ');
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
            {data.payments.map((payment) => <tr key={payment.id}><td>{formatDate(payment.createdAt)}</td><td className="font-bold"><Link className="text-sky-100 hover:text-[var(--brand)]" to="/admin/invoices">{payment.invoiceId?.invoiceNumber}</Link></td><td>{payment.customerId?.name}</td><td className="font-bold text-emerald-100">{currency(payment.paidAmount)}</td><td>{paymentMethodSummary(payment.invoiceId)}</td><td className={Number(payment.balance || 0) > 0 ? 'font-bold text-amber-100' : 'text-emerald-100'}>{currency(payment.balance)}</td><td><StatusBadge status={payment.status} /></td></tr>)}
          </tbody>
        </Table>
      )}
    </div>
  );
}

export function TechnicianDashboard() {
  const { request, user } = useAuth();
  const { data, loading, error } = useResource(() => request('/dashboard/technician'), [request]);
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;
  return (
    <>
      <PageHeader title={`Welcome, ${user?.name || 'Technician'}`} eyebrow="Technician Dashboard">Your panel only shows service jobs assigned to your account.</PageHeader>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Wrench} label="Assigned Jobs" value={data.stats.assigned} />
        <StatCard icon={CalendarClock} label="Active Jobs" value={data.stats.active} tone="yellow" />
        <StatCard icon={PackagePlus} label="Awaiting Parts" value={data.stats.awaitingParts} tone="yellow" />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="surface p-5">
          <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-black">My Jobs</h2><Link className="btn btn-secondary" to="/tech/work-orders">View All</Link></div>
          {data.jobs?.length ? (
            <div className="grid gap-3">
              {data.jobs.slice(0, 6).map((job) => <Link key={job.id} className="flex items-center justify-between rounded-card bg-[var(--surface-2)] p-3" to={`/tech/work-orders/${job.id}`}><span><b>{job.customerId?.name}</b><span className="block text-sm muted">{job.device}</span></span><StatusBadge status={job.status} /></Link>)}
            </div>
          ) : <p className="text-sm muted">No assigned jobs.</p>}
        </div>
        <div className="grid gap-5">
          <div className="surface p-5">
            <h2 className="text-xl font-black">Priority Jobs</h2>
            <div className="mt-4 grid gap-3">
              {(data.jobs || []).filter((job) => job.status === 'Awaiting Parts' || job.status === 'Pending').slice(0, 4).map((job) => (
                <Link key={job.id} className="flex items-center justify-between rounded-card bg-[var(--surface-2)] p-3" to={`/tech/work-orders/${job.id}`}>
                  <span><b>{job.device}</b><span className="block text-sm muted">{job.customerId?.name}</span></span>
                  <StatusBadge status={job.status} />
                </Link>
              ))}
              {!(data.jobs || []).some((job) => job.status === 'Awaiting Parts' || job.status === 'Pending') ? <p className="text-sm muted">No priority jobs.</p> : null}
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
        <Table>
          <thead><tr><th>Part / Product Name</th><th>Category</th><th>Selling Price</th><th>Cost Price</th><th>On Hand</th><th>Reserved</th><th>Available</th><th>Low Stock Limit</th><th>Stock Value</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {filteredParts.map((part) => {
              const stockValue = Number(part.onHand || 0) * Number(part.costPrice || part.sellingPrice || 0);
              return (
                <tr key={part.id}>
                  <td className="font-bold">{part.partName}<span className="block text-xs font-normal muted">{part.brand || part.sku || 'Product / part'}</span></td>
                  <td>{part.category || 'General'}</td>
                  <td>{currency(part.sellingPrice)}</td>
                  <td>{currency(part.costPrice)}</td>
                  <td>{part.onHand}</td>
                  <td><span className="inline-flex rounded-full bg-sky-400/15 px-2.5 py-1 text-xs font-bold text-sky-100">{part.reserved || 0}</span></td>
                  <td className="font-black">{part.available}</td>
                  <td>{part.lowStockLimit}</td>
                  <td className="font-bold">{currency(stockValue)}</td>
                  <td><InventoryStatusBadge part={part} /></td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn btn-secondary py-2" onClick={() => setEditor(part)}>Edit</button>
                      <button type="button" className="btn btn-primary py-2" onClick={() => setQuickStockPart(part)}><PackagePlus className="h-4 w-4" />Add Stock</button>
                      <Link className="btn btn-secondary py-2" to={`/admin/stock-movements?partId=${part.id}`}>View Movements</Link>
                      <button type="button" className="icon-button h-10 w-10 text-rose-100" onClick={() => setDeletePart(part)} aria-label={`Delete ${part.partName}`}><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
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
        <Table>
          <thead><tr><th>Date</th><th>Part</th><th>Movement Type</th><th>Quantity</th><th>Balance After</th><th>Source</th><th>Work Order / Invoice Link</th><th>Note</th><th>User</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {filteredMovements.map((movement) => <tr key={movement.id}><td>{formatDate(movement.createdAt)}</td><td className="font-bold">{movement.partId?.partName}</td><td><MovementTypeBadge type={movement.type} quantity={movement.quantity} /></td><td>{movement.quantity}</td><td>{movement.balanceAfter ?? '-'}</td><td>{movement.source}</td><td>{movement.sourceId ? <Link className="text-sky-100 hover:text-[var(--brand)]" to={`/admin/work-orders/${movement.sourceId}`}>Open Source</Link> : '-'}</td><td>{movement.note || '-'}</td><td>{movement.userId?.name || movement.userId?.username || '-'}</td></tr>)}
          </tbody>
        </Table>
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
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (moduleName) params.set('module', moduleName);
    if (actionName) params.set('action', actionName);
    return params.toString() ? `?${params}` : '';
  }, [moduleName, actionName]);
  const { data, loading, error } = useResource(() => request(`/audit-logs${query}`), [request, query]);
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

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
      <PageHeader title="Audit Logs" eyebrow="Admin Only">
        Important status, assignment, stock, payment, and document changes are tracked here.
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
                  <details className="rounded-card bg-[var(--surface-2)] p-3">
                    <summary className="cursor-pointer text-sm font-bold text-sky-100">View JSON changes</summary>
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <div>
                        <p className="label">Before</p>
                        <pre className="max-h-60 overflow-auto rounded-card bg-black/20 p-3 text-xs">{log.before ? JSON.stringify(log.before, null, 2) : '-'}</pre>
                      </div>
                      <div>
                        <p className="label">After</p>
                        <pre className="max-h-60 overflow-auto rounded-card bg-black/20 p-3 text-xs">{log.after ? JSON.stringify(log.after, null, 2) : '-'}</pre>
                      </div>
                    </div>
                  </details>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}

