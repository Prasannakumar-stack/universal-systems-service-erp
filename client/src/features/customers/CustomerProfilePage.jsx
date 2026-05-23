import {
  AlertTriangle,
  amcContractTypes,
  amcFrequencies,
  AmcStatusBadge,
  amcWhatsappHref,
  apiBase,
  assetBase,
  averageHours,
  Bar,
  BarChart,
  Bell,
  bookingLabel,
  BookingSourceBadge,
  bookingSources,
  bookingSourceValue,
  BookOpenCheck,
  Boxes,
  buildSevenDaySeries,
  CalendarClock,
  callHref,
  CartesianGrid,
  CheckCircle2,
  ClipboardList,
  company,
  completionHours,
  ConfirmModal,
  CreditCard,
  csvCell,
  currency,
  customerCode,
  customerFromOrder,
  customerPhone,
  customerTabs,
  customerWhatsAppHref,
  DashboardChart,
  dateInputValue,
  dateInRange,
  deviceCategory,
  deviceTypes,
  Download,
  downloadCsv,
  DueStatusBadge,
  Edit3,
  EmptyState,
  endOfDay,
  ErrorBlock,
  FileText,
  filterByRange,
  findInvoice,
  formatDate,
  getCustomerDisplayId,
  getInvoiceDisplayId,
  getPaymentDisplayId,
  getWorkOrderDisplayId,
  getPdfLabel,
  inventoryCategories,
  InventoryStatusBadge,
  inventoryStockStatus,
  invoiceDueAmount,
  isActiveJob,
  isCompletedJob,
  isSameDay,
  isTechnicianOverdueJob,
  isTechnicianTodayJob,
  isToday,
  jobPriority,
  jobScheduleLabel,
  KeyRound,
  latestDate,
  Line,
  LineChart,
  Link,
  Loader2,
  LoadingBlock,
  monthKey,
  MovementTypeBadge,
  normalizeReportSection,
  NotificationsPanel,
  PackagePlus,
  PageHeader,
  pdfAllowed,
  pdfLockedReason,
  percentage,
  PhoneCallIcon,
  Plus,
  preserveScroll,
  quickStockSources,
  ReceiptText,
  recordId,
  RemindersPanel,
  ReportBar,
  reportRangeBounds,
  reportRangeOptions,
  reportSections,
  ReportsNavigation,
  ReportsRangeBar,
  ResponsiveContainer,
  Save,
  SearchBox,
  Send,
  serviceTypeBucket,
  serviceTypes,
  ShieldCheck,
  SmartMetricCard,
  startOfDay,
  StatCard,
  StatusBadge,
  statusTone,
  Table,
  technicianAllowedStatuses,
  TechnicianJobCard,
  technicianJobFilters,
  TechnicianJobsView,
  TechnicianLoadingCards,
  technicianWhatsAppHref,
  technicianWorkOrderTabs,
  timelineIcon,
  Tooltip,
  Trash2,
  uploadedAssetUrl,
  useAuth,
  useCallback,
  useEffect,
  useLocation,
  useMemo,
  useNavigate,
  useParams,
  useRef,
  useResource,
  useDebouncedValue,
  UserRound,
  Users,
  useState,
  useToast,
  WorkflowTracker,
  workOrderDetailStatuses,
  workOrderPdfFlows,
  workOrderTabs,
  workStatuses,
  Wrench,
  X,
  XAxis,
  YAxis
} from '../../shared/phase1Shared.jsx';
import { technicianNameOrAdmin } from '../../utils/assignment.js';
import { can, normalizeRole } from '../../utils/roles.js';

const customerTypeOptions = ['', 'Regular', 'AMC', 'Business', 'VIP', 'Walk-in'];
const noteTypeOptions = ['Diagnosis note', 'Customer instruction', 'Payment follow-up', 'Warranty note', 'General note'];
const notePrefillText = {
  'Diagnosis note': 'Diagnosis details: ',
  'Customer instruction': 'Customer instruction: ',
  'Payment follow-up': 'Payment follow-up: ',
  'Warranty note': 'Warranty note: ',
  'General note': ''
};

function customerTimelineMeta(event) {
  const text = `${event?.type || ''} ${event?.title || ''} ${event?.detail || ''} ${event?.status || ''}`.toLowerCase();
  if (text.includes('profile') || text.includes('customer type')) return { label: 'Profile', Icon: UserRound, tone: 'border-sky-400/35 bg-sky-500/15 text-sky-100' };
  if (text.includes('payment')) return { label: 'Payment', Icon: CreditCard, tone: 'border-emerald-400/35 bg-emerald-500/15 text-emerald-100' };
  if (text.includes('invoice') || text.includes('billing')) return { label: 'Invoice', Icon: ReceiptText, tone: 'border-sky-400/35 bg-sky-500/15 text-sky-100' };
  if (text.includes('part')) return { label: 'Part', Icon: PackagePlus, tone: 'border-cyan-400/35 bg-cyan-500/15 text-cyan-100' };
  if (text.includes('note')) return { label: 'Note', Icon: BookOpenCheck, tone: 'border-violet-400/35 bg-violet-500/15 text-violet-100' };
  if (text.includes('whatsapp') || text.includes('message')) return { label: 'WhatsApp', Icon: Send, tone: 'border-emerald-400/35 bg-emerald-500/15 text-emerald-100' };
  if (text.includes('booking') || text.includes('work order') || text.includes('service job')) return { label: 'Work Order', Icon: Wrench, tone: 'border-sky-400/35 bg-sky-500/15 text-sky-100' };
  if (text.includes('status') || event?.status) return { label: 'Status', Icon: CheckCircle2, tone: 'border-amber-400/35 bg-amber-500/15 text-amber-100' };
  if (text.includes('customer')) return { label: 'Customer', Icon: UserRound, tone: 'border-slate-400/30 bg-slate-500/15 text-slate-200' };
  return { label: 'Log', Icon: CalendarClock, tone: 'border-slate-400/30 bg-slate-500/15 text-slate-200' };
}

export function CustomerProfilePage({ role = 'admin' }) {
  const { id } = useParams();
  const { request, user } = useAuth();
  const { push } = useToast();
  const effectiveRole = user?.role || role;
  const isTechnician = normalizeRole(effectiveRole) === 'technician';
  const base = isTechnician ? '/tech' : '/admin';
  const permissionSubject = user || effectiveRole;
  const canManageCustomer = can(permissionSubject, 'edit_customer');
  const canCreateBooking = can(permissionSubject, 'create_booking');
  const canRecordPayments = can(permissionSubject, 'record_payment');
  const canExportReports = can(permissionSubject, 'export_reports');
  const canAddCustomerNote = can(permissionSubject, 'add_notes') || canManageCustomer;
  const workOrdersBase = `${base}/work-orders`;
  const paymentsBase = `${base}/payments`;
  const bookingsBase = `${base}/bookings`;
  const [activeTab, setActiveTab] = useState('overview');
  const [historySearch, setHistorySearch] = useState('');
  const debouncedHistorySearch = useDebouncedValue(historySearch);
  const [historyStatus, setHistoryStatus] = useState('');
  const [historyServiceType, setHistoryServiceType] = useState('');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const [showWhatsappPreview, setShowWhatsappPreview] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', phone: '', address: '', customerType: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [noteModal, setNoteModal] = useState(null);
  const [noteSaving, setNoteSaving] = useState(false);
  const { data, loading, error, reload } = useResource(async () => {
    const [profile, payments, communications] = await Promise.all([
      request(`/customers/${id}`),
      request(`/payments?customerId=${encodeURIComponent(id)}`).catch(() => ({ payments: [] })),
      request(`/communications?customerId=${encodeURIComponent(id)}`).catch(() => ({ communications: [] }))
    ]);
    return { ...profile, payments: payments.payments || [], communications: communications.communications || [] };
  }, [request, id]);

  const customer = data?.customer || {};
  const serviceHistory = data?.serviceHistory || [];
  const invoices = data?.invoices || [];
  const payments = data?.payments || [];
  const communications = data?.communications || [];
  const profileEvents = data?.profileEvents || [];
  const notAdded = 'Not available';
  const noAmcAdded = 'No active AMC';
  const noWarrantyAdded = 'No warranty record';
  const noteSuggestions = ['Diagnosis note', 'Customer instruction', 'Payment follow-up', 'Warranty note'];
  const visibleCustomerTabs = customerTabs.filter((tab) => tab.id !== 'devices');
  useEffect(() => {
    if (activeTab === 'devices') setActiveTab('overview');
  }, [activeTab]);
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
        serialNumber: notAdded,
        warrantyStatus: noWarrantyAdded,
        lastServiceDate: latestDate(jobs),
        serviceCount: jobs.length,
        firstJobId: jobs[0]?.id || jobs[0]?._id || ''
      };
    });
  }, [customer.devices, noWarrantyAdded, notAdded, serviceHistory]);
  const technicianNameForOrder = (order) => technicianNameOrAdmin(order);
  const filteredServiceHistory = serviceHistory.filter((order) => {
    const searchText = debouncedHistorySearch.trim().toLowerCase();
    if (searchText) {
      const text = `${getWorkOrderDisplayId(order)} ${order.serviceType || ''} ${order.service || ''} ${order.device || ''} ${order.issue || ''} ${technicianNameForOrder(order)}`.toLowerCase();
      if (!text.includes(searchText)) return false;
    }
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
  const customerNotes = useMemo(() => {
    const embeddedNotes = (customer.notes || []).map((note) => ({
      id: note._id || note.id || note.createdAt,
      text: note.text,
      createdAt: note.createdAt,
      user: note.userId?.name || note.userId?.username || 'Team'
    }));
    const communicationNotes = communications
      .filter((item) => item.type === 'Note')
      .map((item) => ({
        id: item._id || item.id || item.createdAt,
        text: item.message,
        createdAt: item.createdAt,
        user: item.createdBy?.name || item.createdBy?.username || 'Team'
      }));
    return [...embeddedNotes, ...communicationNotes]
      .filter((note) => note.text)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  }, [communications, customer.notes]);
  const timelineEvents = useMemo(() => {
    const events = [];
    if (customer.createdAt) events.push({ date: customer.createdAt, title: 'Customer created', detail: 'Customer profile created in CRM.', type: 'customer', source: 'CRM' });
    serviceHistory.forEach((order) => {
      events.push({
        date: order.createdAt,
        title: order.bookingId ? 'Booking converted to work order' : 'Service job created',
        detail: `${bookingLabel(order)} - ${order.device || 'Service job'}`,
        status: order.status,
        type: 'work_order',
        source: 'Service Job',
        to: `${workOrdersBase}/${order.id}`
      });
      (order.timeline || []).forEach((item) => events.push({
        date: item.createdAt,
        title: item.message || 'Status changed',
        detail: `${bookingLabel(order)} - ${order.device || '-'}`,
        status: item.status,
        type: item.type || timelineIcon(item),
        source: item.userId?.name || item.userId?.username || 'Work Order',
        to: `${workOrdersBase}/${order.id}`
      }));
      if (order.completedAt) events.push({ date: order.completedAt, title: 'Job completed', detail: `${bookingLabel(order)} completed.`, status: order.status, type: 'status', source: 'Work Order', to: `${workOrdersBase}/${order.id}` });
    });
    invoices.forEach((invoice) => {
      events.push({ date: invoice.createdAt, title: 'Invoice generated', detail: `${invoice.invoiceNumber} - ${currency(invoice.total)}`, status: invoice.status, type: 'invoice', source: 'Billing', to: recordId(invoice.workOrderId) ? `${workOrdersBase}/${recordId(invoice.workOrderId)}` : '' });
    });
    payments.forEach((payment) => {
      events.push({ date: payment.createdAt, title: 'Payment recorded', detail: `${currency(payment.paidAmount)} via ${payment.method || '-'}`, status: payment.status, type: 'payment', source: 'Payments' });
    });
    communications.forEach((item) => {
      events.push({
        date: item.createdAt,
        title: item.type === 'Note' ? 'Note added' : `${item.type || 'Communication'} recorded`,
        detail: item.message,
        type: item.type || 'communication',
        source: item.createdBy?.name || item.createdBy?.username || 'Team',
        to: recordId(item.workOrderId) ? `${workOrdersBase}/${recordId(item.workOrderId)}` : ''
      });
    });
    profileEvents.forEach((item) => {
      const previousType = String(item.before?.customerType || '').trim();
      const nextType = String(item.after?.customerType || '').trim();
      events.push({
        date: item.createdAt,
        title: previousType && nextType
          ? `Customer type changed from ${previousType} to ${nextType}`
          : nextType
            ? `Customer type updated to ${nextType}`
            : 'Customer type cleared',
        detail: previousType || nextType
          ? `Old customer type: ${previousType || notAdded}. New customer type: ${nextType || notAdded}.`
          : 'Customer type was updated.',
        type: 'PROFILE',
        source: item.userId?.name || item.userId?.username || 'Profile'
      });
    });
    return events.filter((event) => event.date).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [communications, customer.createdAt, serviceHistory, invoices, payments, profileEvents, notAdded, workOrdersBase]);
  const whatsappPhone = String(customer.phone || '').replace(/\D/g, '');
  const hasCustomerPhone = Boolean(whatsappPhone);
  const pendingInvoice = invoices.find((invoice) => Number(invoice.balance || 0) > 0);
  const customerNameText = customer.name || 'Unnamed Customer';
  const isLongCustomerName = customerNameText.length > 34;
  const whatsappMessagePreview = `Hello ${customer.name || 'Customer'},\nThis is Universal Systems regarding your service request.`;
  const formatReadableDate = (value) => {
    if (!value) return notAdded;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return notAdded;
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };
  const formatDisplayDate = (value) => {
    if (!value) return notAdded;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return notAdded;
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };
  const formatTimelineDateTime = (value) => {
    if (!value) return notAdded;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return notAdded;
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  const customerInitials = String(customer.name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
  const customerDisplayId = getCustomerDisplayId(customer) || notAdded;
  const joinedDate = formatDisplayDate(customer.createdAt);
  const rawCustomerType = String(customer.customerType || '').trim();
  const customerTypeValue = rawCustomerType || notAdded;
  const formattedLastServiceDate = formatReadableDate(lastServiceDate);
  const amcStatus = customer.amcStatus || noAmcAdded;
  const warrantyStatus = customer.warrantyStatus || (customer.warrantyItems?.length ? `${customer.warrantyItems.length} active item${customer.warrantyItems.length === 1 ? '' : 's'}` : noWarrantyAdded);
  const showCustomerTypeBadge = Boolean(rawCustomerType);
  const paymentLink = `${paymentsBase}${pendingInvoice ? `?invoiceId=${recordId(pendingInvoice)}` : ''}`;
  const bookingPrefillLink = useMemo(() => {
    const params = new URLSearchParams({ openBooking: '1' });
    if (customer.name) params.set('customerName', customer.name);
    if (customer.phone) params.set('phone', customer.phone);
    if (customer.address) params.set('address', customer.address);
    return `${bookingsBase}?${params.toString()}`;
  }, [bookingsBase, customer.address, customer.name, customer.phone]);
  const hasHistoryFilters = Boolean(historySearch || historyStatus || historyServiceType || historyDateFrom || historyDateTo);
  const currentCustomerType = rawCustomerType;
  const profileDetails = [
    { label: 'Phone', value: customer.phone || notAdded, copyValue: customer.phone },
    { label: 'Address', value: customer.address || notAdded },
    { label: 'Customer Type', value: customerTypeValue },
    { label: 'Customer ID', value: customerDisplayId, copyValue: customerDisplayId },
    { label: 'Joined Date', value: joinedDate },
    { label: 'AMC Status', value: amcStatus },
    { label: 'Warranty Status', value: warrantyStatus }
  ];
  const kpiItems = [
    { label: 'Total Jobs', value: serviceHistory.length, tone: 'text-slate-50', tab: 'serviceHistory' },
    { label: 'Active Jobs', value: activeOrders.length, tone: 'text-sky-100', tab: 'serviceHistory' },
    { label: 'Completed Jobs', value: completedOrders.length, tone: 'text-emerald-100', tab: 'serviceHistory' },
    { label: 'Pending Balance', value: currency(pendingBalance), tone: pendingBalance > 0 ? 'text-amber-100' : 'text-slate-50', valueClass: 'text-xl leading-snug whitespace-normal break-words', tab: 'invoices', cardClass: pendingBalance > 0 ? 'border-amber-300/35 bg-amber-400/[0.08] shadow-[0_0_28px_rgba(251,191,36,0.13)]' : '' },
    { label: 'Total Spent', value: currency(totalSpent), tone: totalSpent > 0 ? 'text-emerald-100' : 'text-slate-50', valueClass: 'text-xl leading-snug whitespace-normal break-words', tab: 'invoices', cardClass: totalSpent > 0 ? 'border-emerald-300/25 bg-emerald-400/[0.07]' : '' },
    { label: 'Last Service Date', value: formattedLastServiceDate, tone: 'text-slate-50', valueClass: 'text-base leading-snug whitespace-normal', tab: 'serviceHistory' }
  ];
  const panelClass = 'surface border border-white/10 bg-[linear-gradient(180deg,rgba(16,47,87,0.72),rgba(8,27,52,0.92))] p-5 shadow-[0_18px_55px_rgba(0,8,22,0.18)]';
  const profilePanelClass = 'surface border border-white/10 bg-[linear-gradient(180deg,rgba(16,47,87,0.72),rgba(8,27,52,0.92))] p-4 shadow-[0_18px_55px_rgba(0,8,22,0.18)] sm:p-5';
  const compactFieldClass = 'rounded-card border border-white/10 bg-white/[0.045] px-3 py-2.5';
  const notifyComingSoon = () => push('Coming soon', 'info');
  const notifyPhoneUnavailable = () => push('Phone not available', 'info');
  const openEditCustomer = () => {
    if (!canManageCustomer) {
      push('You do not have permission to edit customers', 'error');
      return;
    }
    setEditForm({
      name: customer.name || '',
      phone: customer.phone || '',
      address: customer.address || '',
      customerType: currentCustomerType
    });
    setEditModalOpen(true);
  };
  const saveEditCustomer = async (event) => {
    event.preventDefault();
    if (!canManageCustomer) {
      push('You do not have permission to edit customers', 'error');
      return;
    }
    setEditSaving(true);
    try {
      await request(`/customers/${recordId(customer) || id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editForm.name,
          phone: editForm.phone,
          address: editForm.address,
          customerType: editForm.customerType
        })
      });
      await reload({ silent: true });
      setEditModalOpen(false);
      push('Customer updated');
    } catch (err) {
      push(err.message || 'Unable to update customer', 'error');
    } finally {
      setEditSaving(false);
    }
  };
  const openNoteModal = (type = 'General note') => {
    if (!canAddCustomerNote) {
      push('You do not have permission to add customer notes', 'error');
      return;
    }
    setNoteModal({
      type,
      text: notePrefillText[type] || ''
    });
  };
  const saveCustomerNote = async (event) => {
    event.preventDefault();
    if (!canAddCustomerNote) {
      push('You do not have permission to add customer notes', 'error');
      return;
    }
    const text = String(noteModal?.text || '').trim();
    if (!text) {
      push('Add a note before saving', 'error');
      return;
    }
    setNoteSaving(true);
    try {
      await request('/communications', {
        method: 'POST',
        body: JSON.stringify({
          customerId: recordId(customer) || id,
          type: 'Note',
          message: text
        })
      });
      push('Customer note saved');
      setNoteModal(null);
      reload({ silent: true });
    } catch (err) {
      const message = String(err?.message || '');
      push(message.toLowerCase().includes('not found') ? 'Notes saving is not connected yet.' : (message || 'Notes saving is not connected yet.'), 'error');
    } finally {
      setNoteSaving(false);
    }
  };
  const serviceHistoryAmount = (order) => {
    const invoice = invoiceByWorkOrder.get(recordId(order));
    return invoice?.total ?? (Number(order.serviceCharge || 0) + (order.partsUsed || []).reduce((sum, part) => sum + Number(part.total || 0), 0));
  };
  const exportFileSafeId = String(customerDisplayId || recordId(customer) || 'customer')
    .replace(/[^a-z0-9-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase() || 'customer';
  const exportServiceHistory = () => {
    if (!filteredServiceHistory.length) {
      push('No service history to export', 'info');
      return;
    }
    downloadCsv(`${exportFileSafeId}-service-history.csv`, ['Date', 'Work Order ID', 'Service / Device', 'Issue', 'Technician', 'Status', 'Amount'], filteredServiceHistory.map((order) => [
      formatDisplayDate(order.createdAt),
      getWorkOrderDisplayId(order),
      `${order.serviceType || order.service || notAdded} / ${order.device || notAdded}`,
      order.issue || notAdded,
      technicianNameForOrder(order),
      order.status || notAdded,
      currency(serviceHistoryAmount(order))
    ]));
    push('Service history exported');
  };
  const exportInvoices = () => {
    if (!invoices.length) {
      push('No invoices to export', 'info');
      return;
    }
    downloadCsv(`${exportFileSafeId}-invoices.csv`, ['Invoice ID', 'Date', 'Linked Job', 'Total', 'Paid', 'Balance', 'Status'], invoices.map((invoice) => [
      getInvoiceDisplayId(invoice),
      formatDisplayDate(invoice.createdAt),
      recordId(invoice.workOrderId) ? getWorkOrderDisplayId(invoice.workOrderId) : notAdded,
      currency(invoice.total),
      currency(invoice.paidAmount),
      currency(invoice.balance),
      invoice.status || notAdded
    ]));
    push('Invoices exported');
  };
  const openWhatsappPreview = () => setShowWhatsappPreview(true);
  const confirmOpenWhatsapp = () => {
    setShowWhatsappPreview(false);
    window.open(customerWhatsAppHref(customer), '_blank', 'noopener,noreferrer');
  };
  const copyToClipboard = useCallback(async (value) => {
    const text = String(value || '').trim();
    if (!text || text === notAdded) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const input = document.createElement('textarea');
        input.value = text;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      push('Copied');
    } catch {
      push('Copy failed', 'error');
    }
  }, [notAdded, push]);
  const renderCopyButton = (value, label) => {
    if (!value || value === notAdded) return null;
    return (
      <button
        type="button"
        className="icon-button h-7 w-7 shrink-0 border-white/10 bg-white/[0.045] text-slate-300 hover:border-sky-300/35 hover:bg-sky-400/10 hover:text-sky-100"
        aria-label={label}
        title={label}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          copyToClipboard(value);
        }}
      >
        <ClipboardList className="h-3.5 w-3.5" />
      </button>
    );
  };

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div className={`customer-360-page mx-auto max-w-[1600px] space-y-5 overflow-x-hidden ${isTechnician ? 'customer-360-page--technician' : ''}`}>
      <section className="surface customer-hero overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-[var(--brand)]/30 bg-[rgba(117,196,255,0.16)] text-xl font-black text-[var(--brand)] shadow-[0_0_35px_rgba(117,196,255,0.18)]">
              {customerInitials}
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Customer 360</p>
              <div className="mt-1 flex min-w-0 max-w-5xl flex-wrap items-start gap-3">
                <h1 className={`line-clamp-2 max-w-full whitespace-normal break-words font-black tracking-tight text-white ${isLongCustomerName ? 'text-2xl leading-tight sm:text-3xl' : 'text-3xl leading-tight sm:text-4xl sm:leading-[1.08]'}`}>{customerNameText}</h1>
                {showCustomerTypeBadge ? <span className="inline-flex shrink-0 items-center rounded-full border border-amber-300/40 bg-amber-400/15 px-3 py-1 text-xs font-black uppercase tracking-wide text-amber-100 shadow-[0_0_24px_rgba(251,191,36,0.18)]">{rawCustomerType.toUpperCase()}</span> : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-slate-400">
                <span className="text-slate-300">{customer.phone || notAdded}</span>
                <span className="max-w-2xl truncate">{customer.address || notAdded}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <p className="text-xs font-semibold uppercase text-slate-500">{customerDisplayId}</p>
                {renderCopyButton(customerDisplayId, 'Copy Customer ID')}
              </div>
              {isTechnician ? (
                <div className="technician-mobile-contact-row customer-hero-contact-row mt-3">
                  {hasCustomerPhone ? (
                    <a className="btn btn-secondary h-10 px-3" href={callHref(customer.phone)}><PhoneCallIcon className="h-4 w-4" />Call</a>
                  ) : (
                    <button type="button" className="btn btn-secondary h-10 px-3 opacity-60" onClick={notifyPhoneUnavailable}><PhoneCallIcon className="h-4 w-4" />Call</button>
                  )}
                  {hasCustomerPhone ? (
                    <a className="btn btn-secondary h-10 px-3" href={customerWhatsAppHref(customer)} target="_blank" rel="noreferrer"><Send className="h-4 w-4" />WhatsApp</a>
                  ) : (
                    <button type="button" className="btn btn-secondary h-10 px-3 opacity-60" onClick={notifyPhoneUnavailable}><Send className="h-4 w-4" />WhatsApp</button>
                  )}
                  <button type="button" className="btn btn-secondary h-10 px-3" disabled={!hasCustomerPhone} onClick={() => copyToClipboard(customer.phone)}><ClipboardList className="h-4 w-4" />Copy Phone</button>
                </div>
              ) : null}
            </div>
          </div>
          {canCreateBooking ? <div className="customer-hero-actions flex flex-wrap items-center gap-2 xl:justify-end">
            <Link className="btn btn-primary customer-create-booking-btn h-10 px-4" to={bookingPrefillLink}><Plus className="h-4 w-4" />Create Booking</Link>
          </div> : null}
        </div>
      </section>

      <section className={profilePanelClass}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Customer Profile</p>
            <h2 className="mt-1 text-xl font-black">Profile Snapshot</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManageCustomer ? <button
              type="button"
              className="btn btn-secondary h-9 px-3 text-xs font-black"
              onClick={openEditCustomer}
            >
              <Edit3 className="h-3.5 w-3.5" />Edit
            </button> : null}
            <StatusBadge status={customerTypeValue} />
            <StatusBadge status={pendingBalance > 0 ? 'Payment Due' : 'Paid'} />
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {profileDetails.map((item) => (
            <div key={item.label} className={compactFieldClass}>
              <p className="label">{item.label}</p>
              <div className="mt-1 flex min-w-0 items-start justify-between gap-2">
                <p className="min-w-0 break-words text-sm font-bold leading-5 text-slate-50" title={String(item.value)}>{item.value}</p>
                {renderCopyButton(item.copyValue, `Copy ${item.label}`)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={panelClass}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
          {kpiItems.map((item) => {
            const content = (
              <>
                <p className="text-xs font-bold uppercase text-slate-400">{item.label}</p>
                <p className={`mt-2 font-black ${item.valueClass || 'truncate text-2xl'} ${item.tone}`} title={String(item.value)}>{item.value}</p>
              </>
            );
            const className = `rounded-card border border-white/10 bg-white/[0.045] p-4 text-left transition hover:-translate-y-0.5 hover:border-sky-300/35 hover:bg-sky-400/10 hover:shadow-[0_0_26px_rgba(56,189,248,0.14)] focus:outline-none focus:ring-2 focus:ring-sky-300/30 ${item.cardClass || ''}`;
            return item.tab ? (
              <button key={item.label} type="button" className={`${className} cursor-pointer`} onClick={() => setActiveTab(item.tab)}>
                {content}
              </button>
            ) : (
              <div key={item.label} className={className}>
                {content}
              </div>
            );
          })}
        </div>
      </section>

      <section className="surface sticky top-20 z-20 p-2">
        <div className="tabs-list border-b-0 p-0">
          {visibleCustomerTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-button h-11 justify-center px-4 ${activeTab === tab.id ? 'tab-button-active shadow-[0_0_24px_rgba(117,196,255,0.12)]' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'overview' ? (
        <div className="grid gap-5">
          {pendingBalance > 0 ? (
            <div className="surface border border-amber-300/25 bg-[linear-gradient(135deg,rgba(248,192,78,0.16),rgba(8,27,52,0.92))] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-400/15 text-amber-100"><AlertTriangle className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-lg font-black text-amber-100">Pending Payment Alert</h2>
                    <p className="mt-1 text-sm muted">Outstanding balance is {currency(pendingBalance)}.</p>
                  </div>
                </div>
                {canRecordPayments ? <Link className="btn btn-primary h-10 shrink-0 px-4" to={paymentLink}>Record Payment</Link> : null}
              </div>
            </div>
          ) : null}
          <div className="grid gap-5 xl:grid-cols-2">
            <div className={panelClass}>
              <h2 className="text-xl font-black">Recent Service Jobs</h2>
              <div className="mt-4 grid gap-3">
                {serviceHistory.slice(0, 4).length ? serviceHistory.slice(0, 4).map((order) => (
                  <Link key={order.id} className="rounded-card border border-white/10 bg-white/[0.045] p-4 transition hover:border-sky-300/30 hover:bg-sky-400/10" to={`${workOrdersBase}/${order.id}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <b className="truncate text-slate-50">{getWorkOrderDisplayId(order)}</b>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="mt-2 truncate text-sm font-bold">{order.serviceType || order.service || notAdded}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-slate-400">{order.device || notAdded}</p>
                    <p className="mt-1 line-clamp-2 text-sm muted">{order.issue || notAdded}</p>
                  </Link>
                )) : <EmptyState title="No service jobs yet" message="Assigned or attended jobs for this customer will appear here." action={canCreateBooking ? <Link className="btn btn-primary" to={bookingPrefillLink}>Create Booking</Link> : null} />}
              </div>
            </div>
            <div className={panelClass}>
              <h2 className="text-xl font-black">Recent Invoices</h2>
              <div className="mt-4 grid gap-3">
                {invoices.slice(0, 4).length ? invoices.slice(0, 4).map((invoice) => (
                  <div key={invoice.id} className="rounded-card border border-white/10 bg-white/[0.045] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <b className="min-w-0 break-all">{getInvoiceDisplayId(invoice)}</b>
                        {renderCopyButton(getInvoiceDisplayId(invoice), 'Copy Invoice ID')}
                      </div>
                      <StatusBadge status={invoice.status} />
                    </div>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                      <span className="muted">Total <b className="text-slate-100">{currency(invoice.total)}</b></span>
                      <span className="muted">Paid <b className="text-emerald-100">{currency(invoice.paidAmount)}</b></span>
                      <span className="muted">Balance <b className={Number(invoice.balance || 0) > 0 ? 'text-amber-100' : 'text-emerald-100'}>{currency(invoice.balance)}</b></span>
                    </div>
                  </div>
                )) : <EmptyState title="No invoices generated yet" message="Invoices will appear after a work order is billed." />}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'serviceHistory' ? (
        <div className={panelClass}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Service History</h2>
              <p className="mt-1 text-sm muted">Full repair and service job history for this customer.</p>
            </div>
            {canExportReports ? <button type="button" className="btn btn-secondary h-9 px-3 text-xs font-black" onClick={exportServiceHistory}>
              <Download className="h-3.5 w-3.5" />Export
            </button> : null}
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(220px,1fr)_170px_190px_160px_160px_auto]">
            <SearchBox value={historySearch} onChange={setHistorySearch} placeholder="Search jobs, device, issue, technician" />
            <select className="input" value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value)}>
              <option value="">All statuses</option>
              {workOrderDetailStatuses.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className="input" value={historyServiceType} onChange={(event) => setHistoryServiceType(event.target.value)}>
              <option value="">All service types</option>
              {serviceTypes.map((item) => <option key={item}>{item}</option>)}
            </select>
            <label className="relative block">
              <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 muted" />
              <input className="input pl-10" type="date" aria-label="Start date" value={historyDateFrom} onChange={(event) => setHistoryDateFrom(event.target.value)} />
            </label>
            <label className="relative block">
              <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 muted" />
              <input className="input pl-10" type="date" aria-label="End date" value={historyDateTo} onChange={(event) => setHistoryDateTo(event.target.value)} />
            </label>
            {hasHistoryFilters ? (
              <button
                className="btn h-10 border border-[var(--brand-2)]/70 bg-[rgba(31,140,255,0.08)] px-4 text-[var(--brand)] shadow-[0_0_24px_rgba(31,140,255,0.16)] hover:bg-[rgba(31,140,255,0.16)]"
                type="button"
                onClick={() => {
                  setHistorySearch('');
                  setHistoryStatus('');
                  setHistoryServiceType('');
                  setHistoryDateFrom('');
                  setHistoryDateTo('');
                }}
              >
                Clear Filters
              </button>
            ) : null}
          </div>
          {isTechnician && filteredServiceHistory.length ? (
            <div className="technician-detail-card-grid mt-4">
              {filteredServiceHistory.map((order) => {
                const total = serviceHistoryAmount(order);
                return (
                  <article key={order.id} className="technician-detail-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="technician-mobile-card-eyebrow">{getWorkOrderDisplayId(order)}</p>
                        <h3 className="technician-mobile-card-title">{order.serviceType || order.service || notAdded}</h3>
                        <p className="technician-mobile-card-muted">{order.device || notAdded}</p>
                      </div>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-sm leading-6 text-slate-200">{order.issue || notAdded}</p>
                    <div className="technician-detail-card-metrics">
                      <span><small>Date</small><b>{formatDisplayDate(order.createdAt)}</b></span>
                      <span><small>Technician</small><b>{technicianNameForOrder(order)}</b></span>
                      <span><small>Amount</small><b>{currency(total)}</b></span>
                    </div>
                    <div className="technician-mobile-card-footer">
                      <Link className="btn btn-secondary" to={`${workOrdersBase}/${order.id}`}>Open Job</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
          <div className={`mt-4 table-wrap bg-transparent lg:overflow-x-visible ${isTechnician && filteredServiceHistory.length ? 'technician-mobile-hidden-table' : ''}`}>
            {filteredServiceHistory.length ? (
              <table className="data-table min-w-[860px] table-fixed lg:min-w-0">
                <colgroup>
                  <col className="w-[11%]" />
                  <col className="w-[25%]" />
                  <col className="w-[21%]" />
                  <col className="w-[14%]" />
                  <col className="w-[12%]" />
                  <col className="w-[8%]" />
                  <col className="w-[9%]" />
                </colgroup>
                <thead><tr><th>Date</th><th>Service / Device</th><th>Issue</th><th>Technician</th><th>Status</th><th className="text-right">Amount</th><th className="text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {filteredServiceHistory.map((order) => {
                    const total = serviceHistoryAmount(order);
                    const workOrderDisplayId = getWorkOrderDisplayId(order);
                    const technicianName = technicianNameForOrder(order);
                    return (
                      <tr key={order.id}>
                        <td className="whitespace-nowrap">{formatDisplayDate(order.createdAt)}</td>
                        <td className="!whitespace-normal">
                          <div className="min-w-0">
                            <p className="break-words text-sm font-bold leading-5 text-slate-50">{order.serviceType || order.service || notAdded}</p>
                            <p className="mt-1 truncate text-xs font-semibold text-slate-400">{order.device || notAdded}</p>
                            <div className="mt-1 flex min-w-0 items-center gap-2">
                              <span className="min-w-0 truncate whitespace-nowrap text-[11px] font-black uppercase tracking-wide text-slate-500" title={workOrderDisplayId}>{workOrderDisplayId}</span>
                              {renderCopyButton(workOrderDisplayId, 'Copy Work Order ID')}
                            </div>
                          </div>
                        </td>
                        <td className="!whitespace-normal"><p className="line-clamp-2 text-sm leading-5 text-slate-200" title={order.issue || notAdded}>{order.issue || notAdded}</p></td>
                        <td><span className="block max-w-[10rem] truncate text-sm font-semibold text-slate-100" title={technicianName}>{technicianName}</span></td>
                        <td><StatusBadge status={order.status} /></td>
                        <td className="text-right"><span className="block whitespace-nowrap text-sm font-bold" title={currency(total)}>{currency(total)}</span></td>
                        <td className="text-right"><Link className="btn btn-secondary h-8 px-3 py-1.5 text-xs" to={`${workOrdersBase}/${order.id}`}>Open Job</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : <EmptyState title="No service jobs found" message="Matching service jobs will appear here." action={canCreateBooking ? <Link className="btn btn-primary" to={bookingPrefillLink}>Create Booking</Link> : null} />}
          </div>
        </div>
      ) : null}

      {activeTab === 'invoices' ? (
        <div className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">Invoices</h2>
            {canExportReports ? <button type="button" className="btn btn-secondary h-9 px-3 text-xs font-black" onClick={exportInvoices}>
              <Download className="h-3.5 w-3.5" />Export
            </button> : null}
          </div>
          {isTechnician && invoices.length ? (
            <div className="technician-detail-card-grid mt-4">
              {invoices.map((invoice) => (
                <article key={invoice.id} className="technician-detail-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="technician-mobile-card-eyebrow">{getInvoiceDisplayId(invoice)}</p>
                      <h3 className="technician-mobile-card-title">{recordId(invoice.workOrderId) ? getWorkOrderDisplayId(invoice.workOrderId) : 'Invoice'}</h3>
                      <p className="technician-mobile-card-muted">{formatDisplayDate(invoice.createdAt)}</p>
                    </div>
                    <StatusBadge status={invoice.status} />
                  </div>
                  <div className="technician-detail-card-metrics">
                    <span><small>Total</small><b>{currency(invoice.total)}</b></span>
                    <span><small>Paid</small><b>{currency(invoice.paidAmount)}</b></span>
                    <span><small>Balance</small><b>{currency(invoice.balance)}</b></span>
                  </div>
                  <div className="technician-mobile-card-footer">
                    {recordId(invoice.workOrderId) ? <Link className="btn btn-secondary" to={`${workOrdersBase}/${recordId(invoice.workOrderId)}`}>Open Job</Link> : null}
                    <span className="technician-mobile-readonly-pill">Read-only billing</span>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          <div className={`mt-4 table-wrap bg-transparent xl:overflow-x-visible ${isTechnician && invoices.length ? 'technician-mobile-hidden-table' : ''}`}>
            {invoices.length ? (
              <table className="data-table min-w-[860px] table-fixed xl:min-w-0">
                <colgroup>
                  <col className="w-[16%]" />
                  <col className="w-[11%]" />
                  <col className="w-[15%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[11%]" />
                  <col className="w-[10%]" />
                  <col className="w-[17%]" />
                </colgroup>
                <thead><tr><th>Invoice ID</th><th>Date</th><th>Linked Job</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th className="text-right">Action</th></tr></thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="font-black">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="min-w-0 break-all">{getInvoiceDisplayId(invoice)}</span>
                          {renderCopyButton(getInvoiceDisplayId(invoice), 'Copy Invoice ID')}
                        </div>
                      </td>
                      <td>{formatDisplayDate(invoice.createdAt)}</td>
                      <td>{recordId(invoice.workOrderId) ? <Link className="truncate text-sky-100 hover:text-[var(--brand)]" to={`${workOrdersBase}/${recordId(invoice.workOrderId)}`}>{getWorkOrderDisplayId(invoice.workOrderId)}</Link> : <span className="muted">{notAdded}</span>}</td>
                      <td className="font-bold">{currency(invoice.total)}</td>
                      <td className="font-bold text-emerald-100">{currency(invoice.paidAmount)}</td>
                      <td className={Number(invoice.balance || 0) > 0 ? 'font-black text-amber-100' : 'font-bold text-emerald-100'}>{currency(invoice.balance)}</td>
                      <td><StatusBadge status={invoice.status} /></td>
                      <td>
                        <div className="flex flex-wrap justify-end gap-2">
                          {recordId(invoice.workOrderId) ? <Link className="btn btn-secondary py-2" to={`${workOrdersBase}/${recordId(invoice.workOrderId)}`}>Open Job</Link> : null}
                          {canRecordPayments && Number(invoice.balance || 0) > 0 ? <Link className="btn btn-primary py-2" to={`${paymentsBase}?invoiceId=${recordId(invoice)}`}>Record Payment</Link> : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState title="No invoices generated yet" message="Invoices will appear after a work order is billed." />}
          </div>
        </div>
      ) : null}

      {activeTab === 'payments' ? (
        <div className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">Payments</h2>
            {canRecordPayments ? <Link className="btn btn-primary h-10 px-4" to={paymentLink}><CreditCard className="h-4 w-4" />Record Payment</Link> : null}
          </div>
          <div className="mt-4">
            {payments.length ? (
              <>
              {isTechnician ? (
                <div className="technician-detail-card-grid">
                  {payments.map((payment) => (
                    <article key={payment.id} className="technician-detail-card">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="technician-mobile-card-eyebrow">{getPaymentDisplayId(payment)}</p>
                          <h3 className="technician-mobile-card-title">{getInvoiceDisplayId(payment.invoiceId)}</h3>
                          <p className="technician-mobile-card-muted">{formatDisplayDate(payment.createdAt)}</p>
                        </div>
                        <StatusBadge status={payment.status} />
                      </div>
                      <div className="technician-detail-card-metrics">
                        <span><small>Paid</small><b>{currency(payment.paidAmount)}</b></span>
                        <span><small>Method</small><b>{payment.method || notAdded}</b></span>
                        <span><small>Balance</small><b>{currency(payment.balance)}</b></span>
                      </div>
                      <div className="technician-mobile-card-footer">
                        <span className="technician-mobile-readonly-pill">Read-only payment</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
              <div className={`table-wrap bg-transparent xl:overflow-x-visible ${isTechnician ? 'technician-mobile-hidden-table' : ''}`}>
                <table className="data-table min-w-[760px] table-fixed xl:min-w-0">
                  <thead><tr><th>Date</th><th>Payment ID</th><th>Linked Invoice</th><th>Amount Paid</th><th>Method</th><th>Balance After</th><th>Status</th></tr></thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{formatDisplayDate(payment.createdAt)}</td>
                        <td className="font-bold">{getPaymentDisplayId(payment)}</td>
                        <td>
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="min-w-0 break-all">{getInvoiceDisplayId(payment.invoiceId)}</span>
                            {renderCopyButton(getInvoiceDisplayId(payment.invoiceId), 'Copy Invoice ID')}
                          </div>
                        </td>
                        <td className="font-bold text-emerald-100">{currency(payment.paidAmount)}</td>
                        <td>{payment.method || notAdded}</td>
                        <td className={Number(payment.balance || 0) > 0 ? 'font-bold text-amber-100' : 'text-emerald-100'}>{currency(payment.balance)}</td>
                        <td><StatusBadge status={payment.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </>
            ) : (
              <EmptyState
                icon={CreditCard}
                title="No payments recorded"
                message="Payments will appear here once this customer pays an invoice or outstanding balance."
                action={canRecordPayments ? <Link className="btn btn-primary" to={paymentLink}>Record Payment</Link> : null}
              />
            )}
          </div>
        </div>
      ) : null}

      {activeTab === 'notes' ? (
        <div className={panelClass}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">Notes</h2>
            {canAddCustomerNote ? <button type="button" className="btn btn-secondary" onClick={() => openNoteModal('General note')}>Add Note</button> : null}
          </div>
          <div className="mt-4 grid gap-3">
            {customerNotes.length ? customerNotes.map((note) => (
              <div key={note.id || note.createdAt} className="rounded-card border border-white/10 bg-white/[0.045] p-4">
                <p>{note.text}</p>
                <p className="mt-2 text-xs muted">{note.user} - {formatTimelineDateTime(note.createdAt)}</p>
              </div>
            )) : (
              <EmptyState
                icon={FileText}
                title="No notes yet"
                message="Use notes to track diagnosis, customer instructions, payment follow-ups, and warranty details."
                action={canAddCustomerNote ? (
                  <div className="flex flex-col items-center gap-3">
                    <button type="button" className="btn btn-secondary" onClick={() => openNoteModal('General note')}>Add Note</button>
                    <div className="flex flex-wrap justify-center gap-2">
                      {noteSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          type="button"
                          className="rounded-full border border-sky-300/20 bg-sky-400/10 px-3 py-1.5 text-xs font-bold text-sky-100 transition hover:border-sky-300/40 hover:bg-sky-400/15"
                          onClick={() => openNoteModal(suggestion)}
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              />
            )}
          </div>
        </div>
      ) : null}

      {activeTab === 'timeline' ? (
        <div className={panelClass}>
          <h2 className="text-xl font-black">Timeline</h2>
          <div className="mt-3 grid gap-0">
            {timelineEvents.length ? timelineEvents.map((event, index) => {
              const meta = customerTimelineMeta(event);
              const Icon = meta.Icon;
              return (
                <div key={`${event.date}-${index}`} className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-2.5 pb-3 last:pb-0">
                  {index < timelineEvents.length - 1 ? <span className="absolute bottom-0 left-[1.125rem] top-9 w-px bg-gradient-to-b from-sky-400/30 via-slate-500/20 to-transparent" aria-hidden="true" /> : null}
                  <div className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border ${meta.tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="rounded-xl border border-white/10 bg-slate-950/25 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex min-h-[1.5rem] items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${meta.tone}`}>{meta.label}</span>
                      {event.status ? <StatusBadge status={event.status} /> : null}
                      {event.source ? <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-300">{event.source}</span> : null}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold leading-5 text-slate-100">{event.title}</p>
                        <p className="mt-1 text-sm leading-5 text-slate-300">{event.detail || 'Customer activity recorded.'}</p>
                        <p className="mt-1.5 text-xs muted">{formatTimelineDateTime(event.date)}</p>
                      </div>
                      {event.to ? <Link className="btn btn-secondary h-8 px-3 py-1.5 text-xs" to={event.to}>Open</Link> : null}
                    </div>
                  </div>
                </div>
              );
            }) : <EmptyState title="No timeline events yet" message="Customer activity will appear as bookings, service jobs, invoices, payments, WhatsApp messages, and notes are created." />}
          </div>
        </div>
      ) : null}

      {editModalOpen ? (
        <div className="fixed inset-0 z-[90] grid place-items-end bg-black/55 p-3 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="edit-customer-title">
          <form className="surface w-full max-w-2xl border border-white/10 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]" onSubmit={saveEditCustomer}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Customer Profile</p>
                <h2 id="edit-customer-title" className="mt-1 text-xl font-black text-white">Edit Customer</h2>
                <p className="mt-1 text-sm muted">Update customer identity, contact details, and customer type.</p>
              </div>
              <button type="button" className="icon-button h-8 w-8" aria-label="Close edit customer" onClick={() => setEditModalOpen(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label>
                <span className="label">Customer Name</span>
                <input className="input" value={editForm.name} onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label>
                <span className="label">Phone</span>
                <input className="input" value={editForm.phone} onChange={(event) => setEditForm((current) => ({ ...current, phone: event.target.value }))} />
              </label>
              <label>
                <span className="label">Customer Type</span>
                <select className="input" value={editForm.customerType} onChange={(event) => setEditForm((current) => ({ ...current, customerType: event.target.value }))}>
                  {customerTypeOptions.map((option) => <option key={option || 'empty'} value={option}>{option || 'Not available'}</option>)}
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className="label">Address</span>
                <textarea className="input min-h-24" value={editForm.address} onChange={(event) => setEditForm((current) => ({ ...current, address: event.target.value }))} />
              </label>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn btn-secondary h-10 px-4" onClick={() => setEditModalOpen(false)} disabled={editSaving}>Cancel</button>
              <button type="submit" className="btn btn-primary h-10 px-4" disabled={editSaving}>
                {editSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {noteModal ? (
        <div className="fixed inset-0 z-[90] grid place-items-end bg-black/55 p-3 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="add-customer-note-title">
          <form className="surface w-full max-w-xl border border-white/10 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]" onSubmit={saveCustomerNote}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Customer Notes</p>
                <h2 id="add-customer-note-title" className="mt-1 text-xl font-black text-white">Add Customer Note</h2>
              </div>
              <button type="button" className="icon-button h-8 w-8" aria-label="Close note modal" onClick={() => setNoteModal(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid gap-4">
              <label>
                <span className="label">Note Type</span>
                <select
                  className="input"
                  value={noteModal.type}
                  onChange={(event) => {
                    const nextType = event.target.value;
                    setNoteModal((current) => {
                      const currentPrefill = notePrefillText[current.type] || '';
                      return {
                        type: nextType,
                        text: !current.text || current.text === currentPrefill ? (notePrefillText[nextType] || '') : current.text
                      };
                    });
                  }}
                >
                  {noteTypeOptions.map((option) => <option key={option}>{option}</option>)}
                </select>
              </label>
              <label>
                <span className="label">Note</span>
                <textarea
                  className="input min-h-36"
                  value={noteModal.text}
                  onChange={(event) => setNoteModal((current) => ({ ...current, text: event.target.value }))}
                  placeholder="Add diagnosis, customer instruction, payment follow-up, or warranty details"
                />
              </label>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn btn-secondary h-10 px-4" onClick={() => setNoteModal(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary h-10 px-4" disabled={noteSaving || !String(noteModal.text || '').trim()}>
                <Save className="h-4 w-4" />
                Save Note
              </button>
            </div>
          </form>
        </div>
      ) : null}

      {showWhatsappPreview ? (
        <div className="fixed inset-0 z-[90] grid place-items-end bg-black/55 p-3 sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="whatsapp-preview-title">
          <div className="surface w-full max-w-lg border border-white/10 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">WhatsApp Preview</p>
                <h2 id="whatsapp-preview-title" className="mt-1 text-xl font-black text-white">Confirm message</h2>
              </div>
              <button type="button" className="icon-button h-8 w-8" aria-label="Close WhatsApp preview" onClick={() => setShowWhatsappPreview(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className={compactFieldClass}>
                  <p className="label">Customer</p>
                  <p className="mt-1 line-clamp-2 text-sm font-bold text-slate-50">{customerNameText}</p>
                </div>
                <div className={compactFieldClass}>
                  <p className="label">Phone</p>
                  <p className="mt-1 text-sm font-bold text-slate-50">{customer.phone || notAdded}</p>
                </div>
              </div>
              <div className="rounded-card border border-white/10 bg-white/[0.045] p-4">
                <p className="label">Message Preview</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-100">{whatsappMessagePreview}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn btn-secondary h-10 px-4" onClick={() => setShowWhatsappPreview(false)}>Cancel</button>
              <button type="button" className="btn btn-primary h-10 px-4" onClick={confirmOpenWhatsapp}><Send className="h-4 w-4" />Open WhatsApp</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
