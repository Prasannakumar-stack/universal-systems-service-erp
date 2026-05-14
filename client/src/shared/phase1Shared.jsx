import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Bell, BookOpenCheck, Boxes, CalendarClock, CheckCircle2, ClipboardList, CreditCard, Download, Edit3, FileText, KeyRound, Loader2, PackagePlus, PhoneCall as PhoneCallIcon, Plus, ReceiptText, Save, Send, ShieldCheck, Trash2, UserRound, Users, Wrench, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ConfirmModal, EmptyState, PageHeader, SearchBox, StatCard } from '../components/Ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { apiBase, company, serviceTypes } from '../utils/constants.js';
import { currency, formatDate, statusTone } from '../utils/format.js';
export {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Link,
  useLocation,
  useNavigate,
  useParams,
  AlertTriangle,
  Bell,
  BookOpenCheck,
  Boxes,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Download,
  Edit3,
  FileText,
  KeyRound,
  Loader2,
  PackagePlus,
  PhoneCallIcon,
  Plus,
  ReceiptText,
  Save,
  Send,
  ShieldCheck,
  Trash2,
  UserRound,
  Users,
  Wrench,
  X,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ConfirmModal,
  EmptyState,
  PageHeader,
  SearchBox,
  StatCard,
  useAuth,
  useToast,
  apiBase,
  company,
  serviceTypes,
  currency,
  formatDate,
  statusTone
};export const workStatuses = ['Pending', 'In Progress', 'Awaiting Parts', 'Completed'];
export const workOrderDetailStatuses = ['Pending', 'In Progress', 'Awaiting Parts', 'Completed', 'Delivered', 'Returned'];
export const inventoryCategories = ['Laptop Parts', 'Desktop Parts', 'CCTV', 'Networking', 'Printer', 'Power Components', 'Memory', 'Storage', 'Accessories', 'Software / Service', 'Other'];
export const quickStockSources = ['Purchase', 'Manual', 'Return', 'Correction'];
export const bookingSources = ['Call', 'Walk-in Shop', 'Website'];
export const deviceTypes = ['Laptop', 'Desktop PC', 'CCTV', 'Printer', 'Toner / Cartridge', 'Network Device', 'Solar / UPS / Battery / Inverter', 'Software / Installation', 'Other'];
export const amcContractTypes = ['Basic AMC', 'Comprehensive AMC', 'CCTV AMC', 'Printer AMC', 'Networking AMC', 'Solar / UPS AMC', 'Custom'];
export const amcFrequencies = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly'];
export const assetBase = apiBase.replace(/\/api\/?$/, '');

export function uploadedAssetUrl(url) {
  if (!url) return '#';
  if (/^https?:\/\//i.test(url)) return url;
  return `${assetBase}${url.startsWith('/') ? url : `/${url}`}`;
}

export function useResource(load, deps = []) {
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

export function LoadingBlock() {
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

export function ErrorBlock({ message }) {
  return <EmptyState title="Unable to load this view" message={message ? 'Please retry or check your access permission.' : 'Please retry or check your access permission.'} />;
}

export function StatusBadge({ status }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusTone(status)}`}>{status}</span>;
}

export function bookingSourceValue(record) {
  const raw = String(record?.source || record?.bookingSource || record?.channel || record?.intakeSource || record?.leadSource || record?.bookingId?.bookingSource || record?.bookingId?.source || '').trim().toLowerCase();
  if (!raw) return 'Walk-in';
  if (raw.includes('call')) return 'Call';
  if (raw.includes('website') || raw.includes('web') || raw.includes('online')) return 'Website';
  if (raw.includes('walk') || raw.includes('shop') || raw.includes('manual')) return 'Walk-in Shop';
  return raw.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function BookingSourceBadge({ source }) {
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

export function AmcStatusBadge({ status }) {
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

export function Table({ children }) {
  return (
    <div className="table-wrap bg-[var(--surface)]">
      <table className="data-table">{children}</table>
    </div>
  );
}

export async function preserveScroll(callback) {
  const x = window.scrollX;
  const y = window.scrollY;
  await callback();
  requestAnimationFrame(() => {
    window.scrollTo(x, y);
  });
}

export function recordId(record) {
  if (typeof record === 'string') return record;
  return record?.id || record?._id || '';
}

export function invoiceDueAmount(invoice) {
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

export function findInvoice(invoices = [], invoiceId = '') {
  return invoices.find((invoice) => invoice.id === invoiceId || invoice._id === invoiceId);
}

export const workOrderPdfFlows = [
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

export const workOrderTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'parts', label: 'Parts' },
  { id: 'partRequests', label: 'Part Requests' },
  { id: 'billing', label: 'Billing' },
  { id: 'documents', label: 'Documents' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'notes', label: 'Notes' }
];

export const technicianWorkOrderTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'workUpdate', label: 'Checklist / Work Update' },
  { id: 'parts', label: 'Parts' },
  { id: 'partRequests', label: 'Part Requests' },
  { id: 'notes', label: 'Notes' },
  { id: 'photos', label: 'Photos' },
  { id: 'documents', label: 'Documents' }
];

export const technicianAllowedStatuses = ['In Progress', 'Awaiting Parts', 'Completed', 'Returned'];
export const technicianJobFilters = ['Today', 'All Assigned', 'Pending', 'In Progress', 'Awaiting Parts', 'Completed'];

export const customerTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'devices', label: 'Devices / Assets' },
  { id: 'serviceHistory', label: 'Service History' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'payments', label: 'Payments' },
  { id: 'notes', label: 'Notes' },
  { id: 'timeline', label: 'Timeline' }
];

export function pdfAllowed(flow, order) {
  if (!order) return false;
  return flow.allowedStatuses.includes(order.status);
}

export function pdfLockedReason(flow, order) {
  if (flow.type === 'work' && order?.status !== 'Completed') return 'Complete the job before downloading invoice PDF';
  return flow.lockedText;
}

export function getPdfLabel(pdfType) {
  if (pdfType === 'quotation') return 'Quotation PDF';
  if (pdfType === 'work') return 'Invoice PDF';
  if (pdfType === 'service-completed') return 'Service Completed PDF';
  return 'PDF';
}

export function timelineIcon(item) {
  const text = `${item?.status || ''} ${item?.message || ''}`.toLowerCase();
  if (text.includes('part')) return 'Part';
  if (text.includes('note')) return 'Note';
  if (text.includes('invoice') || text.includes('payment')) return 'Bill';
  if (item?.status || text.includes('status')) return 'Status';
  return 'Log';
}

export function bookingLabel(order) {
  return order?.bookingId?.bookingCode || `WO-${String(order?.id || order?._id || '').slice(-6).toUpperCase()}`;
}

export function customerCode(customer) {
  return `US-CUST-${String(recordId(customer)).slice(-5).toUpperCase()}`;
}

export function customerTypeLabel(customer) {
  return customer?.customerType || customer?.type || customer?.category || '';
}

export function customerWhatsAppHref(customer) {
  const phone = String(customer?.phone || '').replace(/\D/g, '');
  const whatsappPhone = phone.startsWith('91') ? phone : `91${phone}`;
  const message = `Hello ${customer?.name || 'Customer'},\nThis is Universal Systems regarding your service request.`;
  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
}

export function customerFromOrder(order) {
  return order?.customerId || {};
}

export function customerPhone(order) {
  return customerFromOrder(order)?.phone || '';
}

export function callHref(phone) {
  const cleanPhone = String(phone || '').replace(/[^\d+]/g, '');
  return cleanPhone ? `tel:${cleanPhone}` : '#';
}

export function technicianWhatsAppHref(order) {
  const customer = customerFromOrder(order);
  const phone = String(customer?.phone || '').replace(/\D/g, '');
  const whatsappPhone = phone.startsWith('91') ? phone : `91${phone}`;
  const message = `Hello ${customer?.name || 'Customer'}, this is Universal Systems technician regarding your service job.`;
  return phone ? `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}` : '#';
}

export function jobPriority(order) {
  if (order?.priority) return order.priority;
  if (order?.status === 'Awaiting Parts') return 'High';
  if (isTechnicianOverdueJob(order)) return 'High';
  return 'Normal';
}

export function jobScheduleLabel(order) {
  const value = order?.scheduledAt || order?.scheduledDate || order?.appointmentDate || order?.createdAt;
  return value ? formatDate(value) : 'Not scheduled';
}

export function isTechnicianTodayJob(order) {
  return isSameDay(order?.scheduledAt || order?.scheduledDate || order?.appointmentDate || order?.createdAt || order?.updatedAt);
}

export function isTechnicianOverdueJob(order) {
  if (!order || ['Completed', 'Delivered', 'Returned'].includes(order.status)) return false;
  const reference = new Date(order.scheduledAt || order.scheduledDate || order.createdAt || order.updatedAt || Date.now());
  return Date.now() - reference.getTime() > 24 * 60 * 60 * 1000;
}

export function deviceCategory(device = '') {
  const text = String(device).toLowerCase();
  if (text.includes('printer') || text.includes('toner') || text.includes('cartridge')) return 'Printer';
  if (text.includes('cctv') || text.includes('camera')) return 'CCTV';
  if (text.includes('network') || text.includes('router') || text.includes('lan')) return 'Networking';
  if (text.includes('solar') || text.includes('ups') || text.includes('battery') || text.includes('inverter')) return 'Solar / UPS / Inverter';
  if (text.includes('laptop') || text.includes('desktop') || text.includes('pc')) return 'PC / Laptop';
  return 'Other';
}

export function isActiveJob(order) {
  return ['Pending', 'In Progress', 'Awaiting Parts'].includes(order?.status);
}

export function isCompletedJob(order) {
  return ['Completed', 'Delivered', 'Returned'].includes(order?.status);
}

export function latestDate(items = [], fields = ['completedAt', 'createdAt']) {
  const timestamps = items.flatMap((item) => fields.map((field) => item?.[field]).filter(Boolean)).map((value) => new Date(value).getTime()).filter(Number.isFinite);
  if (!timestamps.length) return '';
  return new Date(Math.max(...timestamps)).toISOString();
}

export function isSameDay(value, day = new Date()) {
  if (!value) return false;
  const date = new Date(value);
  return date.getFullYear() === day.getFullYear() && date.getMonth() === day.getMonth() && date.getDate() === day.getDate();
}

export function buildSevenDaySeries(bookings = [], payments = []) {
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

export function SmartMetricCard({ icon: Icon, label, value, tone, to, helper, glow = false }) {
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

export function DueStatusBadge({ invoice }) {
  const createdAt = invoice?.createdAt ? new Date(invoice.createdAt) : null;
  const isOverdue = createdAt && Number.isFinite(createdAt.getTime()) && Date.now() - createdAt.getTime() > 7 * 24 * 60 * 60 * 1000;
  if (isOverdue) return <span className="inline-flex rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-bold text-rose-100">Overdue</span>;
  return <StatusBadge status={invoice?.status || 'Pending'} />;
}

export function DashboardChart({ title, children }) {
  return (
    <div className="surface lift-card p-5">
      <h2 className="text-lg font-black">{title}</h2>
      <div className="mt-4 h-72">{children}</div>
    </div>
  );
}

export function InventoryStatusBadge({ part }) {
  const available = Number(part.available || 0);
  const lowLimit = Number(part.lowStockLimit || 0);
  if (available <= 0) return <span className="inline-flex rounded-full bg-rose-500/15 px-2.5 py-1 text-xs font-bold text-rose-200">Out of Stock</span>;
  if (available <= lowLimit) return <span className="inline-flex rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-bold text-amber-100">Low Stock</span>;
  return <span className="inline-flex rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-bold text-emerald-100">Available</span>;
}

export function MovementTypeBadge({ type, quantity = 0 }) {
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

export function inventoryStockStatus(part) {
  const available = Number(part.available || 0);
  if (available <= 0) return 'out';
  if (available <= Number(part.lowStockLimit || 0)) return 'low';
  return 'in';
}

export function csvCell(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export function isToday(value) {
  if (!value) return false;
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate();
}

export function dateInputValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export function amcWhatsappHref(contract) {
  const phone = String(contract?.phone || '').replace(/\D/g, '');
  const whatsappPhone = phone.startsWith('91') ? phone : `91${phone}`;
  const message = `Hello ${contract?.customerName || 'Customer'},\nThis is Universal Systems regarding your AMC renewal for ${contract?.contractType || 'your service contract'}.`;
  return `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`;
}

export const reportSections = [
  { id: 'main', label: 'Business', to: '/admin/reports' },
  { id: 'technicians', label: 'Technician', to: '/admin/reports/technicians' },
  { id: 'inventory', label: 'Inventory', to: '/admin/reports/inventory' },
  { id: 'finance', label: 'Payments', to: '/admin/reports/finance' }
];

export function normalizeReportSection(section = 'main') {
  if (section === 'payments') return 'finance';
  return reportSections.some((item) => item.id === section) ? section : 'main';
}

export const reportRangeOptions = ['Today', 'Last 7 Days', 'This Month', 'Last Month', 'Custom Range'];

export function startOfDay(value) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function endOfDay(value) {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

export function reportRangeBounds(range, customFrom = '', customTo = '') {
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

export function dateInRange(value, bounds) {
  if (!value) return false;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return false;
  if (bounds.from && time < bounds.from.getTime()) return false;
  if (bounds.to && time > bounds.to.getTime()) return false;
  return true;
}

export function filterByRange(items = [], bounds, field = 'createdAt') {
  return items.filter((item) => dateInRange(item?.[field], bounds));
}

export function completionHours(order) {
  if (!order?.completedAt || !order?.createdAt) return null;
  const hours = (new Date(order.completedAt).getTime() - new Date(order.createdAt).getTime()) / (60 * 60 * 1000);
  return Number.isFinite(hours) && hours >= 0 ? hours : null;
}

export function averageHours(orders = []) {
  const values = orders.map(completionHours).filter((value) => value !== null);
  if (!values.length) return '—';
  const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
  return avg >= 24 ? `${(avg / 24).toFixed(1)} days` : `${avg.toFixed(1)} hrs`;
}

export function serviceTypeBucket(order) {
  const text = `${order?.serviceType || ''} ${order?.device || ''} ${order?.issue || ''}`.toLowerCase();
  if (text.includes('printer') || text.includes('toner')) return 'Printer Service';
  if (text.includes('cctv') || text.includes('camera')) return 'CCTV Service';
  if (text.includes('network') || text.includes('amc')) return 'Networking / AMC';
  if (text.includes('solar') || text.includes('ups') || text.includes('battery') || text.includes('inverter')) return 'Solar / UPS / Inverter';
  if (text.includes('software') || text.includes('installation')) return 'Software / Installation';
  if (text.includes('laptop') || text.includes('desktop') || text.includes('pc')) return 'PC / Laptop Service';
  return order?.serviceType || 'Other';
}

export function percentage(value, total) {
  if (!total) return '0%';
  return `${Math.round((Number(value || 0) / Number(total || 1)) * 100)}%`;
}

export function monthKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

export function downloadCsv(filename, headers, rows) {
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

export function WorkflowTracker({ status }) {
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

export function NotificationsPanel({ notifications = [] }) {
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

export function RemindersPanel({ reminders = [] }) {
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

export function TechnicianLoadingCards() {
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

export function TechnicianJobCard({ job, base = '/tech/work-orders', onStatusChange = null, compact = false }) {
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

export function TechnicianJobsView({ jobs, search, setSearch, filter, setFilter, quickStatus }) {
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

export function ReportBar({ label, value, total, displayValue = null }) {
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

export function ReportsNavigation({ active }) {
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

export function ReportsRangeBar({ range, setRange, customFrom, setCustomFrom, customTo, setCustomTo, onExport }) {
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

