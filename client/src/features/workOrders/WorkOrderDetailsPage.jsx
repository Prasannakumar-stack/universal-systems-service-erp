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
  copyTextToClipboard,
  CreditCard,
  csvCell,
  currency,
  customerCode,
  customerFromOrder,
  customerPhone,
  customerTabs,
  customerTypeLabel,
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
  getWorkOrderDisplayId,
  getPdfLabel,
  workOrderCompletedDateDisplay,
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
  UserRound,
  Users,
  useState,
  useToast,
  workOrderDetailStatuses,
  workOrderPdfFlows,
  workOrderTabs,
  WORK_ORDER_PRIORITIES,
  WorkOrderPriorityBadge,
  workStatuses,
  Wrench,
  X,
  XAxis,
  YAxis
} from '../../shared/phase1Shared.jsx';
import { technicianNameOrAdmin } from '../../utils/assignment.js';
import {
  autoAmcPartChargeType,
  autoAmcPartChargeMode,
  calculateAmcCoverageBreakdown,
  manualAmcPartChargeMode,
  normalizeAmcCoverageType,
  normalizeAmcPartChargeType,
  coveredAmcPart
} from '../../shared/amcCoverage.js';
import {
  partRequestCanMove,
  partRequestDisplayStatus,
  partRequestIsPending,
  PartRequestStatusBadge,
  partUsedTypeLabel
} from '../../shared/partWorkflow.jsx';
import { isPdfSentViaWhatsapp } from '../../shared/whatsappPdfMessage.js';
import { can, normalizeRole } from '../../utils/roles.js';
import { emitSidebarBadgesUpdated } from '../../utils/sidebarBadges.js';
import { RotateCcw } from 'lucide-react';

const detailFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071426]';
const detailNumberInputClass =
  'input [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';
const detailInfoCardClass =
  'grid h-auto min-h-[92px] content-start gap-2 rounded-2xl border border-sky-400/10 bg-slate-900/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]';
const detailLabelClass =
  'text-[10px] font-black uppercase tracking-wide text-slate-400';
const detailValueClass =
  'break-words text-sm font-semibold leading-5 text-slate-100';
const detailSectionClass =
  'surface border border-white/10 bg-[#0b172a]/75 p-4 shadow-lg shadow-slate-950/20';
const detailBillingSectionClass =
  'surface border border-white/10 bg-[#0b172a]/75 px-4 py-3.5 shadow-lg shadow-slate-950/20';
const detailPanelClass =
  'rounded-xl border border-white/10 bg-slate-950/25 p-3';
const amcChargeTypeOptions = [
  { value: autoAmcPartChargeType, label: 'Auto by AMC Coverage' },
  { value: coveredAmcPart, label: 'Covered By AMC' },
  { value: 'Chargeable', label: 'Chargeable' }
];
const workOrderPhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const workOrderPhotoMaxSize = 5 * 1024 * 1024;
const photoCategoryLabels = {
  customer_problem: 'Customer Problem Photo',
  before_service: 'Before Service Photo',
  after_service: 'After Completion Photo'
};

function normalizeAmcChargeTypeSelectValue(value) {
  const raw = String(value || '').trim();
  if (raw === autoAmcPartChargeType) return autoAmcPartChargeType;
  if (raw === coveredAmcPart || raw === 'Covered By AMC') return coveredAmcPart;
  if (raw === 'Chargeable') return 'Chargeable';
  return autoAmcPartChargeType;
}

function normalizePhotoCategory(value, fallback = 'before_service') {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'customer_problem') return 'customer_problem';
  if (raw === 'after_service') return 'after_service';
  if (raw === 'before_service') return 'before_service';
  return fallback;
}

function validatePhotoFiles(files = []) {
  for (const file of files) {
    const extOk = /\.(jpe?g|png|webp)$/i.test(file?.name || '');
    if (!workOrderPhotoTypes.has(file?.type || '') && !extOk) {
      return 'Only JPG, JPEG, PNG, and WEBP photos are allowed.';
    }
    if (Number(file?.size || 0) > workOrderPhotoMaxSize) {
      return 'Each photo must be 5 MB or less.';
    }
  }
  return '';
}

function resolvedAmcChargeType(value, contract = {}) {
  return normalizeAmcPartChargeType(normalizeAmcChargeTypeSelectValue(value), contract);
}

function amcChargeTypeMode(value) {
  return normalizeAmcChargeTypeSelectValue(value) === autoAmcPartChargeType ? autoAmcPartChargeMode : manualAmcPartChargeMode;
}

function normalizeDetailSourceLabel(source) {
  const raw = String(
    typeof source === 'object'
      ? source?.source
        || source?.bookingSource
        || source?.channel
        || source?.intakeSource
        || source?.leadSource
        || source?.bookingId?.bookingSource
        || source?.bookingId?.source
        || ''
      : source || ''
  ).trim().toLowerCase().replace(/\s+/g, ' ');

  if (!raw) return 'WEBSITE';
  if (raw.includes('call') || raw.includes('phone')) return 'CALL';
  if (raw.includes('walk') || raw.includes('shop') || raw.includes('offline') || raw === 'walkin' || raw === 'manual') return 'WALK-IN';
  return 'WEBSITE';
}

function WorkOrderDetailSourceBadge({ source }) {
  const label = normalizeDetailSourceLabel(source);
  const tones = {
    CALL: 'border-emerald-500/25 bg-emerald-500/[0.12] text-emerald-200',
    'WALK-IN': 'border-cyan-500/25 bg-cyan-500/[0.12] text-cyan-100',
    WEBSITE: 'border-indigo-400/25 bg-indigo-500/[0.12] text-indigo-200'
  };
  return (
    <span className={`inline-flex min-h-[1.625rem] items-center rounded-full border px-2.5 py-1 text-[10px] font-black tracking-wide ${tones[label] || tones.WEBSITE}`}>
      {label}
    </span>
  );
}

function WorkOrderInfoCard({ label, children, className = '' }) {
  return (
    <div className={`${detailInfoCardClass} ${className}`}>
      <p className={detailLabelClass}>{label}</p>
      <div className={detailValueClass}>{children}</div>
    </div>
  );
}

function WorkOrderBadgeGroup({ children, justify = 'justify-start' }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${justify} [&_.inline-flex]:whitespace-nowrap [&_span]:whitespace-nowrap`}>
      {children}
    </div>
  );
}

function detailStatusButtonClass(active) {
  return [
    'inline-flex min-h-[38px] items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-semibold transition',
    'disabled:cursor-not-allowed disabled:opacity-60',
    detailFocusRing,
    active
      ? 'border-sky-300/50 bg-sky-500/20 text-sky-50 shadow-[0_0_18px_rgba(56,189,248,0.16)]'
      : 'border-white/10 bg-slate-900/70 text-slate-300 hover:border-sky-400/40 hover:bg-sky-500/10 hover:text-white'
  ].join(' ');
}

function detailTabButtonClass(active) {
  return [
    'inline-flex min-h-[38px] items-center justify-center rounded-xl border px-3.5 py-2 text-sm font-bold transition',
    detailFocusRing,
    active
      ? 'border-sky-300/40 bg-sky-500/15 text-sky-50 shadow-[0_0_16px_rgba(56,189,248,0.12)]'
      : 'border-transparent bg-transparent text-slate-400 hover:border-white/10 hover:bg-white/[0.04] hover:text-slate-100'
  ].join(' ');
}

function photoEvidenceTone(hasItems) {
  return hasItems
    ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
    : 'border-slate-500/25 bg-slate-500/10 text-slate-200';
}

function pdfWorkflowCardClass(enabled) {
  return [
    'rounded-xl border p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
    enabled
      ? 'border-sky-400/20 bg-slate-950/25'
      : 'border-slate-700/40 bg-slate-950/20 text-slate-300 opacity-90'
  ].join(' ');
}

function pdfActionButtonClass(enabled, variant = 'secondary') {
  if (!enabled) {
    return [
      'inline-flex min-h-[40px] cursor-not-allowed items-center justify-center gap-2 rounded-card',
      'border border-slate-700/50 bg-slate-900/55 px-3 py-2 text-sm font-semibold text-slate-300 opacity-90 shadow-none',
      detailFocusRing
    ].join(' ');
  }
  return `btn ${variant === 'primary' ? 'btn-primary' : 'btn-secondary'} min-h-[40px] px-3 disabled:cursor-not-allowed disabled:opacity-70`;
}

function workOrderTimelineMeta(item) {
  const text = `${item?.type || ''} ${item?.status || ''} ${item?.message || ''}`.toLowerCase();
  const messageText = String(item?.message || '').toLowerCase();
  const fallbackType = String(timelineIcon(item) || '').toLowerCase();
  const statusMessageTerms = ['status', 'status changed', 'changed back', 'previously completed', 'completed', 'delivered', 'pending', 'awaiting parts', 'in progress', 'returned'];
  if (statusMessageTerms.some((term) => messageText.includes(term)) || fallbackType.includes('status')) {
    return { label: 'Status', Icon: CheckCircle2, tone: 'border-amber-400/35 bg-amber-500/15 text-amber-100' };
  }
  if (text.includes('whatsapp') || text.includes('pdf') || text.includes('document')) {
    return { label: 'Document', Icon: Send, tone: 'border-sky-400/35 bg-sky-500/15 text-sky-100' };
  }
  if (text.includes('part') || fallbackType.includes('part')) {
    return { label: 'Part', Icon: PackagePlus, tone: 'border-cyan-400/35 bg-cyan-500/15 text-cyan-100' };
  }
  if (text.includes('invoice') || text.includes('payment') || text.includes('billing') || fallbackType.includes('bill')) {
    return { label: 'Billing', Icon: ReceiptText, tone: 'border-emerald-400/35 bg-emerald-500/15 text-emerald-100' };
  }
  if (text.includes('note') || fallbackType.includes('note')) {
    return { label: 'Note', Icon: BookOpenCheck, tone: 'border-violet-400/35 bg-violet-500/15 text-violet-100' };
  }
  if (item?.status || text.includes('status') || fallbackType.includes('status')) {
    return { label: 'Status', Icon: CheckCircle2, tone: 'border-amber-400/35 bg-amber-500/15 text-amber-100' };
  }
  return { label: 'Log', Icon: CalendarClock, tone: 'border-slate-400/30 bg-slate-500/15 text-slate-200' };
}

function partChargeType(item, contract = null) {
  if (contract) return normalizeAmcPartChargeType(item?.chargeType, contract, item?.chargeTypeMode);
  return item?.chargeType === coveredAmcPart ? coveredAmcPart : 'Chargeable';
}

function isCoveredAmcPart(item, contract = null) {
  return partChargeType(item, contract) === coveredAmcPart;
}

function amcPartBillingBadges(item, contract = null) {
  if (!contract) return [];
  const covered = isCoveredAmcPart(item, contract);
  const coverageType = normalizeAmcCoverageType(contract.coverageType);
  const badges = [{
    label: covered ? 'Covered By AMC' : 'Chargeable',
    tone: covered ? 'bg-emerald-500/15 text-emerald-100' : 'bg-rose-500/15 text-rose-100'
  }];
  if (coverageType === 'Preventive AMC') {
    badges.push({ label: 'Preventive Visit', tone: 'bg-amber-500/15 text-amber-100' });
  }
  if (!covered) {
    badges.push({ label: 'Extra Repair', tone: 'bg-orange-500/15 text-orange-100' });
  }
  return badges;
}

function getAmcContractStatus(contract) {
  if (!contract) return '-';
  if (contract.status === 'Cancelled') return 'Cancelled';
  const end = new Date(contract.endDate);
  if (Number.isNaN(end.getTime())) return contract.status || 'Active';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (daysLeft < 0) return 'Expired';
  if (daysLeft <= 30) return 'Renewal Due';
  return 'Active';
}

function amcPaymentStatusFromAmounts(contractValue, paidAmount) {
  if (Number(paidAmount || 0) >= Number(contractValue || 0) && Number(contractValue || 0) > 0) return 'Paid';
  if (Number(paidAmount || 0) > 0) return 'Partial';
  return 'Pending';
}

function uniqueInvoiceRecords(records = []) {
  const seen = new Set();
  return records.filter((invoice) => {
    const id = recordId(invoice);
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function invoiceIsVoid(invoice) {
  return String(invoice?.status || '') === 'Void';
}

function invoicePaidAmount(invoice) {
  return Number(invoice?.paidAmount || 0);
}

function invoiceBalanceAmount(invoice) {
  return Number(invoice?.balance || 0);
}

function invoiceHasPayment(invoice) {
  return ['Paid', 'Partial'].includes(String(invoice?.status || '')) || invoicePaidAmount(invoice) > 0;
}

function invoiceIsUnpaid(invoice) {
  return String(invoice?.status || '') === 'Pending' && invoicePaidAmount(invoice) <= 0;
}

function partsLockedInvoiceMessage(invoice) {
  const invoiceNo = getInvoiceDisplayId(invoice) || 'the active invoice';
  return `Parts are locked because Extra Invoice ${invoiceNo} is already generated. If unpaid, void the invoice to unlock parts. If paid, create an adjustment invoice.`;
}

export function WorkOrderDetailsPage({ role = 'admin' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { request, token, user, setUser } = useAuth();
  const { push } = useToast();
  const [note, setNote] = useState('');
  const [part, setPart] = useState({ inventoryPartId: '', partName: '', quantity: 1, unitPrice: 0, chargeType: autoAmcPartChargeType });
  const [partRequest, setPartRequest] = useState({ inventoryPartId: '', partName: '', quantity: 1, note: '' });
  const [inventoryParts, setInventoryParts] = useState([]);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [labourCharge, setLabourCharge] = useState(0);
  const [pdfBusy, setPdfBusy] = useState('');
  const [activeTab, setActiveTab] = useState('parts');
  const [photoFiles, setPhotoFiles] = useState({ before_service: [], after_service: [] });
  const [photoUploadingType, setPhotoUploadingType] = useState('');
  const [partAction, setPartAction] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [moveToUsedUnitPrice, setMoveToUsedUnitPrice] = useState('');
  const [moveToUsedChargeType, setMoveToUsedChargeType] = useState(autoAmcPartChargeType);
  const [moveToUsedNote, setMoveToUsedNote] = useState('');
  const [moveToUsedZeroReason, setMoveToUsedZeroReason] = useState('');
  const [addPartDupKind, setAddPartDupKind] = useState(null);
  const [moveDupKind, setMoveDupKind] = useState(null);
  const [editPartRow, setEditPartRow] = useState(null);
  const [voidUnlockConfirm, setVoidUnlockConfirm] = useState(false);
  const [priorityValue, setPriorityValue] = useState('Normal');
  const permissionRefreshAttemptedRef = useRef(false);
  const beforeServiceInputRef = useRef(null);
  const afterServiceInputRef = useRef(null);
  const { data, loading, error, reload } = useResource(() => request(`/work-orders/${id}`), [request, id]);
  const [liveOrder, setLiveOrder] = useState(null);
  const order = liveOrder || data?.workOrder;
  const effectiveRole = user?.role || role;
  const isTechnician = normalizeRole(effectiveRole) === 'technician';
  const base = isTechnician ? '/tech' : '/admin';
  const paymentsBase = `${base}/payments`;
  const workOrdersBase = `${base}/work-orders`;
  const permissionSubject = user || effectiveRole;
  const canCreateInvoice = can(permissionSubject, 'create_invoice');
  const canEditInvoice = can(permissionSubject, 'edit_invoice');
  const canRecordPayment = can(permissionSubject, 'record_payment');
  const canViewPayments = can(permissionSubject, 'view_payments');
  const canEditServiceCharge = can(permissionSubject, 'edit_service_charge');
  const canManagePartsUsed = can(permissionSubject, 'manage_parts_used');
  const canCreatePartRequest = can(permissionSubject, 'create_part_request');
  const canApprovePartRequests = can(permissionSubject, 'approve_part_requests');
  const canSendPdfWhatsapp = can(permissionSubject, 'send_pdf_whatsapp');
  const canEditWorkOrder = can(permissionSubject, 'edit_work_order');
  const canUpdateWorkOrderStatus = can(permissionSubject, 'update_work_order_status');
  const canAddNotes = can(permissionSubject, 'add_notes');
  const canUploadPhotos = can(permissionSubject, 'upload_photos');
  const canAssignTechnician = can(permissionSubject, 'assign_technician');

  useEffect(() => {
    if (!isTechnician || canUpdateWorkOrderStatus || permissionRefreshAttemptedRef.current) return;
    permissionRefreshAttemptedRef.current = true;
    let mounted = true;
    request('/auth/me')
      .then((result) => {
        if (!mounted || !result?.user) return;
        setUser(result.user);
        window.localStorage.setItem('us_user', JSON.stringify(result.user));
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [canUpdateWorkOrderStatus, isTechnician, request, setUser]);

  useEffect(() => {
    if (!data?.workOrder) return;
    setLiveOrder(data.workOrder);
    setServiceCharge(data.workOrder.serviceCharge || 0);
    setLabourCharge(data.workOrder.serviceCharge || 0);
    setPriorityValue(jobPriority(data.workOrder));
  }, [data?.workOrder]);

  useEffect(() => {
    request('/inventory?limit=100').then((result) => setInventoryParts(result.parts || [])).catch(() => {});
  }, [request]);

  useEffect(() => {
    if (!isTechnician && activeTab === 'overview') setActiveTab('parts');
    if (isTechnician && ['overview', 'workUpdate', 'timeline'].includes(activeTab)) setActiveTab('parts');
  }, [activeTab, isTechnician]);

  useEffect(() => {
    if (partAction?.type !== 'move') return;
    setMoveToUsedUnitPrice('');
    setMoveToUsedChargeType(autoAmcPartChargeType);
    setMoveToUsedNote('');
    setMoveToUsedZeroReason('');
  }, [partAction?.requestId, partAction?.type]);

  async function reloadSidebarAware() {
    await reload({ silent: true });
    emitSidebarBadgesUpdated();
  }

  async function saveStatus(nextStatus) {
    if (!canUpdateWorkOrderStatus) {
      push('You do not have permission to update job status', 'error');
      return;
    }
    try {
      await preserveScroll(async () => {
        const result = await request(`/work-orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status: nextStatus }) });
        if (result?.workOrder) setLiveOrder(result.workOrder);
        push('Status updated');
        await reloadSidebarAware();
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function copyPhone() {
    if (await copyTextToClipboard(phone)) push('Phone copied');
    else push('Phone not available', 'error');
  }

  async function addNote(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!canAddNotes) {
      push('You do not have permission to add notes', 'error');
      return;
    }
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/notes`, { method: 'POST', body: JSON.stringify({ text: note }) });
        setNote('');
        push('Note added');
        await reloadSidebarAware();
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
      quantity: current.quantity || 1,
      chargeType: isAmcLinked ? normalizeAmcChargeTypeSelectValue(current.chargeType) : (current.chargeType || 'Chargeable')
    }));
  }

  function handlePartQuantityChange(value) {
    let quantity = Number(value);
    if (!quantity || quantity < 1) quantity = 1;
    setPart((current) => ({ ...current, quantity }));
  }

  function handlePartRequestQuantityChange(value) {
    let quantity = Number(value);
    if (!quantity || quantity < 1) quantity = 1;
    setPartRequest((current) => ({ ...current, quantity }));
  }

  async function addPart(event, flags = {}) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (!canManagePartsUsed) {
      push('You do not have permission to add parts used', 'error');
      return;
    }

    if (partsLocked) {
      push(partsLockMessage, 'error');
      return;
    }

    if (!part.inventoryPartId && !String(part.partName || '').trim()) {
      push('Please select a part', 'error');
      return;
    }
    if (selectedPartInsufficientStock) {
      push('Not enough available stock', 'error');
      return;
    }

    const invId = part.inventoryPartId ? String(part.inventoryPartId) : '';
    const manualName = String(part.partName || '').trim();
    const selectedChargeType = isAmcLinked ? resolvedAmcChargeType(part.chargeType, amcContract) : 'Chargeable';
    if (!flags.mergeDuplicateInventory && invId) {
      const dup = order?.partsUsed?.find((row) => row.inventoryPartId && String(recordId(row.inventoryPartId)) === invId && partChargeType(row, amcContract) === selectedChargeType);
      if (dup) {
        setAddPartDupKind('inventory');
        return;
      }
    }
    if (!flags.mergeDuplicateManual && !flags.allowDuplicateManualLine && !invId && manualName) {
      const norm = manualName.toLowerCase();
      const dup = order?.partsUsed?.find((row) => !row.inventoryPartId && String(row.name || '').trim().toLowerCase() === norm && partChargeType(row, amcContract) === selectedChargeType);
      if (dup) {
        setAddPartDupKind('manual');
        return;
      }
    }

    try {
      await preserveScroll(async () => {
        const selectedChargeTypeValue = isAmcLinked ? normalizeAmcChargeTypeSelectValue(part.chargeType) : selectedChargeType;
        const result = await request(`/work-orders/${id}/parts`, { method: 'POST', body: JSON.stringify({ ...part, chargeType: selectedChargeTypeValue, chargeTypeMode: isAmcLinked ? amcChargeTypeMode(selectedChargeTypeValue) : manualAmcPartChargeMode, ...flags }) });
        if (result.workOrder) setLiveOrder(result.workOrder);
        if (part.inventoryPartId) {
          request('/inventory?limit=100').then((inventory) => setInventoryParts(inventory.parts || [])).catch(() => {});
        }
        setPart({ partName: '', quantity: 1, unitPrice: 0, inventoryPartId: '', chargeType: isAmcLinked ? autoAmcPartChargeType : 'Chargeable' });
        setAddPartDupKind(null);
        push('Part added');
        await reloadSidebarAware();
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function saveEditedPart(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!editPartRow) return;
    if (!canManagePartsUsed) {
      push('You do not have permission to edit parts used', 'error');
      return;
    }
    if (partsLocked) {
      push(partsLockMessage, 'error');
      return;
    }
    const partId = editPartRow._id || editPartRow.id;
    if (!partId) return;
    const body = {
      quantity: Math.max(1, Number(editPartRow.quantity || 1)),
      unitPrice: Math.max(0, Number(editPartRow.unitPrice || 0))
    };
    if (!editPartRow.inventoryPartId) {
      body.name = String(editPartRow.name || '').trim();
      if (!body.name) {
        push('Part name is required', 'error');
        return;
      }
    }
    const noteTrim = String(editPartRow.note || '').trim();
    if (noteTrim) body.note = noteTrim;
    if (isAmcLinked) {
      body.chargeType = normalizeAmcChargeTypeSelectValue(editPartRow.chargeType);
      body.chargeTypeMode = amcChargeTypeMode(body.chargeType);
    }
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/parts/${partId}`, { method: 'PATCH', body: JSON.stringify(body) });
        setEditPartRow(null);
        push('Part updated');
        await reloadSidebarAware();
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function removePart(partId, event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();

    if (!canManagePartsUsed) {
      push('You do not have permission to remove parts used', 'error');
      return;
    }

    if (partsLocked) {
      push(partsLockMessage, 'error');
      return;
    }

    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/parts/${partId}`, { method: 'DELETE' });
        push('Part removed');
        await reloadSidebarAware();
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function requestPart(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!canCreatePartRequest) {
      push('You do not have permission to request parts', 'error');
      return;
    }
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/part-requests`, { method: 'POST', body: JSON.stringify(partRequest) });
        setPartRequest({ inventoryPartId: '', partName: '', quantity: 1, note: '' });
        push('Part request submitted');
        await reloadSidebarAware();
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function savePriority(nextPriority) {
    if (!canEditWorkOrder) return;
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/priority`, { method: 'PATCH', body: JSON.stringify({ priority: nextPriority }) });
        setPriorityValue(nextPriority);
        push('Priority updated');
        await reloadSidebarAware();
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  function renderPrioritySummary() {
    const label = jobPriority(order);
    const helper = 'Priority shows job urgency. Admin decides which jobs should be handled first.';
    if (canEditWorkOrder) {
      return (
        <div className="grid gap-1.5">
          <WorkOrderBadgeGroup>
            <WorkOrderPriorityBadge priority={label} />
          </WorkOrderBadgeGroup>
          <select
            className={`input py-1.5 text-sm ${detailFocusRing}`}
            value={priorityValue}
            title={helper}
            onChange={(event) => savePriority(event.target.value)}
          >
            {WORK_ORDER_PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <p className="text-[11px] leading-4 muted">{helper}</p>
        </div>
      );
    }
    return (
      <div title={helper}>
        <WorkOrderBadgeGroup>
          <WorkOrderPriorityBadge priority={label} />
        </WorkOrderBadgeGroup>
      </div>
    );
  }

  async function runPartRequestAction(rawMoveOpts) {
    const moveOpts =
      rawMoveOpts &&
      typeof rawMoveOpts === 'object' &&
      (Object.prototype.hasOwnProperty.call(rawMoveOpts, 'mergeDuplicateInventory') ||
        Object.prototype.hasOwnProperty.call(rawMoveOpts, 'mergeDuplicateManual') ||
        Object.prototype.hasOwnProperty.call(rawMoveOpts, 'allowDuplicateManualLine'))
        ? rawMoveOpts
        : {};
    if (!partAction) return;
    if (!canApprovePartRequests) {
      push('You do not have permission to review part requests', 'error');
      return;
    }
    const { type, requestId } = partAction;
    try {
      await preserveScroll(async () => {
        if (type === 'approve') {
          await request(`/work-orders/${id}/part-requests/${requestId}/approve`, { method: 'PATCH' });
          push('Part request approved');
        } else if (type === 'reject') {
          const reason = String(rejectReason || '').trim();
          if (!reason) {
            push('Rejection reason is required', 'error');
            return;
          }
          await request(`/work-orders/${id}/part-requests/${requestId}/reject`, {
            method: 'PATCH',
            body: JSON.stringify({ reason })
          });
          push('Part request rejected');
        } else if (type === 'move') {
          if (!canManagePartsUsed) {
            push('You do not have permission to move parts to Parts Used', 'error');
            return;
          }
          if (partsLocked) {
            push(partsLockMessage, 'error');
            return;
          }
          const selectedMoveChargeType = isAmcLinked ? resolvedAmcChargeType(moveToUsedChargeType, amcContract) : 'Chargeable';
          if (partAction.inventoryPartId) {
            if (!moveOpts.mergeDuplicateInventory) {
              const invKey = String(partAction.inventoryPartId);
              const dup = order?.partsUsed?.find((row) => row.inventoryPartId && String(recordId(row.inventoryPartId)) === invKey && partChargeType(row, amcContract) === selectedMoveChargeType);
              if (dup) {
                setMoveDupKind('inventory');
                return;
              }
            }
            const selectedMoveChargeTypeValue = isAmcLinked ? normalizeAmcChargeTypeSelectValue(moveToUsedChargeType) : 'Chargeable';
            const patchBody = { chargeType: selectedMoveChargeTypeValue };
            if (isAmcLinked) patchBody.chargeTypeMode = amcChargeTypeMode(selectedMoveChargeTypeValue);
            if (moveOpts.mergeDuplicateInventory) patchBody.mergeDuplicateInventory = true;
            await request(`/work-orders/${id}/part-requests/${requestId}/move-to-used`, {
              method: 'PATCH',
              body: JSON.stringify(patchBody)
            });
          } else {
            const raw = String(moveToUsedUnitPrice ?? '').trim();
            if (raw === '') {
              push('Enter unit price before moving this part', 'error');
              return;
            }
            const price = Number(raw);
            if (!Number.isFinite(price) || price < 0) {
              push('Enter a valid unit price (0 or greater)', 'error');
              return;
            }
            if (price === 0) {
              const z = String(moveToUsedZeroReason || '').trim();
              if (!z) {
                push('Reason is required for ₹0 parts: confirm free, warranty, or customer-provided item', 'error');
                return;
              }
            }
            if (!moveOpts.mergeDuplicateManual && !moveOpts.allowDuplicateManualLine) {
              const norm = String(partAction.name || '').trim().toLowerCase();
              const dup = order?.partsUsed?.find((row) => !row.inventoryPartId && String(row.name || '').trim().toLowerCase() === norm && partChargeType(row, amcContract) === selectedMoveChargeType);
              if (dup) {
                setMoveDupKind('manual');
                return;
              }
            }
            const selectedMoveChargeTypeValue = isAmcLinked ? normalizeAmcChargeTypeSelectValue(moveToUsedChargeType) : 'Chargeable';
            const body = { unitPrice: price, chargeType: selectedMoveChargeTypeValue };
            if (isAmcLinked) body.chargeTypeMode = amcChargeTypeMode(selectedMoveChargeTypeValue);
            const noteTrim = String(moveToUsedNote || '').trim();
            if (noteTrim) body.note = noteTrim;
            if (price === 0) body.zeroPriceReason = String(moveToUsedZeroReason || '').trim();
            if (moveOpts.mergeDuplicateManual) body.mergeDuplicateManual = true;
            if (moveOpts.allowDuplicateManualLine) body.allowDuplicateManualLine = true;
            await request(`/work-orders/${id}/part-requests/${requestId}/move-to-used`, {
              method: 'PATCH',
              body: JSON.stringify(body)
            });
          }
          push('Part moved to Parts Used');
          setMoveDupKind(null);
        }
        setPartAction(null);
        setRejectReason('');
        setMoveToUsedUnitPrice('');
        setMoveToUsedChargeType(autoAmcPartChargeType);
        setMoveToUsedNote('');
        setMoveToUsedZeroReason('');
        await reloadSidebarAware();
      });
    } catch (err) {
      if (err.message === 'This request was already moved to Parts Used.') {
        push(err.message, 'error');
        setPartAction(null);
        await reloadSidebarAware();
        return;
      }
      push(err.message, 'error');
    }
  }

  async function generateInvoice(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!canCreateInvoice) {
      push('You do not have permission to generate invoices', 'error');
      return;
    }
    try {
      await preserveScroll(async () => {
        await request('/invoices', { method: 'POST', body: JSON.stringify({ workOrderId: id, labourCharge: serviceCharge || labourCharge }) });
        push(isAmcLinked ? 'Extra charges invoice generated' : 'Invoice generated');
        await reloadSidebarAware();
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function handleExtraInvoiceMismatch(action, event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!canEditInvoice) {
      push('You do not have permission to update invoices', 'error');
      return;
    }
    const targetInvoiceId = recordId(baseExtraInvoice || primaryExtraInvoice || order.invoiceId);
    if (!targetInvoiceId) {
      push('Existing extra invoice not found', 'error');
      return;
    }
    try {
      await preserveScroll(async () => {
        await request('/invoices', {
          method: 'POST',
          body: JSON.stringify({
            workOrderId: id,
            labourCharge: serviceCharge || labourCharge,
            amcExtraAction: action,
            invoiceId: targetInvoiceId
          })
        });
        push(action === 'void-regenerate' ? 'Extra invoice voided and regenerated' : 'Adjustment invoice created');
        await reloadSidebarAware();
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function voidExtraInvoiceAndUnlockParts() {
    if (!canEditInvoice) {
      push('You do not have permission to unlock billed parts', 'error');
      return;
    }
    const targetInvoiceId = recordId(baseExtraInvoice || primaryExtraInvoice || order.invoiceId);
    if (!targetInvoiceId) {
      push('Existing extra invoice not found', 'error');
      setVoidUnlockConfirm(false);
      return;
    }
    try {
      await preserveScroll(async () => {
        await request('/invoices', {
          method: 'POST',
          body: JSON.stringify({
            workOrderId: id,
            amcExtraAction: 'void-unlock',
            invoiceId: targetInvoiceId
          })
        });
        const refreshed = await request(`/work-orders/${id}`);
        if (refreshed.workOrder) setLiveOrder(refreshed.workOrder);
        setVoidUnlockConfirm(false);
        push('Unpaid extra invoice voided. Parts unlocked.');
        emitSidebarBadgesUpdated();
      });
    } catch (err) {
      setVoidUnlockConfirm(false);
      push(err.message, 'error');
    }
  }

  async function createAmcInvoiceFromWorkOrder(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!recordId(amcContract)) return;
    if (amcInvoiceId) {
      if (!canViewPayments && !canRecordPayment) {
        push('You do not have permission to view AMC payments', 'error');
        return;
      }
      navigate(`${paymentsBase}?invoiceId=${encodeURIComponent(amcInvoiceId)}`);
      return;
    }
    if (!canCreateInvoice) {
      push('You do not have permission to create AMC invoices', 'error');
      return;
    }
    try {
      await preserveScroll(async () => {
        const result = await request('/invoices', {
          method: 'POST',
          body: JSON.stringify({
            amcContractId: recordId(amcContract),
            contractValue: amcContractValue,
            coverage: amcContract?.coveredService || amcContract?.coveredDevices,
            notes: `AMC Coverage Type: ${amcCoverageType}\nCoverage:\n${amcContract?.coveredService || amcContract?.coveredDevices || amcContract?.contractType || 'AMC Service'}`
          })
        });
        const invoiceId = recordId(result.invoice);
        push('AMC invoice created');
        await reloadSidebarAware();
        if (invoiceId) navigate(`${paymentsBase}?invoiceId=${encodeURIComponent(invoiceId)}`);
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function saveServiceCharge(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!canEditServiceCharge) {
      push('You do not have permission to update service charges', 'error');
      return;
    }
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/service-charge`, {
          method: 'PATCH',
          body: JSON.stringify({ serviceCharge })
        });
        push('Service charge updated');
        await reloadSidebarAware();
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function autoAssignDetail(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!canAssignTechnician) {
      push('You do not have permission to assign technicians', 'error');
      return;
    }
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/auto-assign`, { method: 'POST' });
        push('Service job auto-assigned');
        await reloadSidebarAware();
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

  async function downloadWorkflowPdf(flow, regenerate = false) {
    try {
      await preserveScroll(async () => {
        setPdfBusy(`${regenerate ? 'regenerate' : 'download'}-${flow.type}`);
        await downloadPdfFile(flow.type, flow.filename);
        push(regenerate ? `${flow.title} regenerated as a fresh PDF without replacing old files` : `${flow.title} generated`);
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
    if (!canSendPdfWhatsapp) {
      push('You do not have permission to send PDFs through WhatsApp', 'error');
      return;
    }
    const phone = order.customerId?.phone || '';
    if (!phone) {
      push('Customer phone number not available', 'error');
      return;
    }

    try {
      await preserveScroll(async () => {
        setPdfBusy(`send-${flow.type}`);
        const result = await request(`/work-orders/${id}/pdf/${flow.type}/send-whatsapp`, { method: 'POST' });
        if (result.sentViaApi) {
          push(result.message || `${getPdfLabel(flow.type)} sent via WhatsApp`);
          await reloadSidebarAware();
          return;
        }
        await downloadPdfFile(flow.type, flow.filename);
        if (result.whatsappUrl) {
          window.open(result.whatsappUrl, '_blank', 'noopener,noreferrer');
        }
        push(
          result.fallbackNote ||
            'WhatsApp PDF sending API is not configured. PDF was opened/downloaded. Please attach it manually.'
        );
      });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setPdfBusy('');
    }
  }

  async function handleApproval(approvalStatus) {
    if (!canEditWorkOrder) {
      push('You do not have permission to update approval', 'error');
      return;
    }
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${id}/approval`, {
          method: 'PATCH',
          body: JSON.stringify({ approvalStatus })
        });
        push(approvalStatus === 'approved' ? 'Marked as Approved' : 'Marked as Denied');
        await reloadSidebarAware();
      });
    } catch (err) {
      push('Failed to update approval', 'error');
    }
  }

  async function uploadPhotos(event, category) {
    event.preventDefault();
    event.stopPropagation();
    if (!canUploadPhotos) {
      push('You do not have permission to upload photos', 'error');
      return;
    }
    const normalizedCategory = normalizePhotoCategory(category);
    const selectedFiles = photoFiles[normalizedCategory] || [];
    if (!selectedFiles.length) {
      push('Select at least one photo', 'error');
      return;
    }
    const validationMessage = validatePhotoFiles(selectedFiles);
    if (validationMessage) {
      push(validationMessage, 'error');
      return;
    }

    const formData = new FormData();
    formData.append('photoCategory', normalizedCategory);
    selectedFiles.forEach((file) => formData.append('images', file));

    try {
      setPhotoUploadingType(normalizedCategory);
      await preserveScroll(async () => {
        const response = await fetch(`${apiBase}/work-orders/${id}/images`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.message || 'Photo upload failed');
        setPhotoFiles((current) => ({ ...current, [normalizedCategory]: [] }));
        const inputRef = normalizedCategory === 'after_service' ? afterServiceInputRef : beforeServiceInputRef;
        if (inputRef.current) inputRef.current.value = '';
        push(`${photoCategoryLabels[normalizedCategory]} uploaded`);
        await reloadSidebarAware();
      });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setPhotoUploadingType('');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  const isAmcLinked = Boolean(recordId(order.amcContractId));
  const amcContract = isAmcLinked && typeof order.amcContractId === 'object' ? order.amcContractId : null;
  const amcInvoice = amcContract?.invoiceId && typeof amcContract.invoiceId === 'object' ? amcContract.invoiceId : null;
  const amcInvoiceId = recordId(amcInvoice || amcContract?.invoiceId);
  const amcPaymentPdfInvoiceId = recordId(order.invoiceId) || amcInvoiceId;
  const amcContractValue = Number(amcContract?.contractValue || amcInvoice?.total || 0);
  const amcPaidAmount = Number(amcInvoice?.paidAmount || 0);
  const amcPendingAmount = Math.max(0, Number(amcInvoice?.balance ?? amcContractValue - amcPaidAmount));
  const amcPaymentStatus = amcInvoice?.status || amcPaymentStatusFromAmounts(amcContractValue, amcPaidAmount);
  const amcContractStatus = getAmcContractStatus(amcContract);
  const amcCoverageType = normalizeAmcCoverageType(amcContract?.coverageType);
  const selectedPartChargeType = isAmcLinked ? resolvedAmcChargeType(part.chargeType, amcContract || {}) : (part.chargeType || 'Chargeable');
  const allPartsTotal = (order.partsUsed || []).reduce((sum, item) => sum + Number(item.total || 0), 0);
  const savedServiceCharge = Number(order.serviceCharge || 0);
  const currentServiceCharge = Number(serviceCharge || 0);
  const amcBilling = isAmcLinked ? calculateAmcCoverageBreakdown(order, { serviceCharge: currentServiceCharge }) : null;
  const chargeablePartsTotal = isAmcLinked ? amcBilling.chargeablePartsTotal : allPartsTotal;
  const partsTotal = isAmcLinked ? chargeablePartsTotal : allPartsTotal;
  const totalAmount = partsTotal + currentServiceCharge;
  const extraPayableTotal = isAmcLinked ? amcBilling.extraPayable : totalAmount;
  const currentExtraInvoice = order.invoiceId && typeof order.invoiceId === 'object' ? order.invoiceId : null;
  const allExtraInvoices = uniqueInvoiceRecords([
    currentExtraInvoice,
    ...(Array.isArray(order.extraInvoices) ? order.extraInvoices : [])
  ].filter(Boolean));
  const activeExtraInvoices = allExtraInvoices.filter((invoice) => !invoiceIsVoid(invoice));
  const primaryExtraInvoice =
    (currentExtraInvoice && !invoiceIsVoid(currentExtraInvoice) ? currentExtraInvoice : null) ||
    activeExtraInvoices.find((invoice) => !recordId(invoice.adjustmentForInvoiceId)) ||
    activeExtraInvoices[0] ||
    null;
  const baseExtraInvoice =
    activeExtraInvoices.find((invoice) => !recordId(invoice.adjustmentForInvoiceId)) ||
    primaryExtraInvoice;
  const paymentTargetExtraInvoice =
    activeExtraInvoices.find((invoice) => invoiceBalanceAmount(invoice) > 0) ||
    primaryExtraInvoice;
  const extraInvoiceTotal = activeExtraInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
  const extraInvoicePaidTotal = activeExtraInvoices.reduce((sum, invoice) => sum + invoicePaidAmount(invoice), 0);
  const extraInvoiceBalance = activeExtraInvoices.reduce((sum, invoice) => sum + invoiceBalanceAmount(invoice), 0);
  const extraInvoiceDifference = extraPayableTotal - extraInvoiceTotal;
  const extraInvoiceDifferenceAmount = Math.abs(extraInvoiceDifference);
  const extraInvoiceNeedsRefresh = isAmcLinked && activeExtraInvoices.length > 0 && Math.abs(extraInvoiceDifference) > 0.5;
  const activeExtraInvoicesAreUnpaid = activeExtraInvoices.length > 0 && activeExtraInvoices.every((invoice) => invoiceIsUnpaid(invoice));
  const activeExtraInvoicesHavePayment = activeExtraInvoices.some((invoice) => invoiceHasPayment(invoice));
  const canVoidRegenerateExtraInvoice = extraInvoiceNeedsRefresh && activeExtraInvoicesAreUnpaid;
  const canCreateAdjustmentInvoice = extraInvoiceNeedsRefresh && activeExtraInvoicesHavePayment && extraInvoiceDifference > 0.5;
  const bookingProblemUrl = order.bookingId?.problemImage?.url || '';
  const mergedPhotoMap = new Map();
  const rawPhotoEntries = [
    order.bookingId?.problemImage?.url
      ? {
          ...order.bookingId.problemImage,
          type: 'customer_problem',
          uploadedByRole: 'customer',
          uploadedAt: order.bookingId?.createdAt || order.createdAt
        }
      : null,
    ...((order.images || []).map((image) => ({
      ...image,
      uploadedAt: image.uploadedAt || image.createdAt || order.createdAt
    })))
  ].filter(Boolean);
  rawPhotoEntries.forEach((image, index) => {
    const inferredCategory =
      image.type
        ? normalizePhotoCategory(image.type)
        : bookingProblemUrl && image.url === bookingProblemUrl
          ? 'customer_problem'
          : String(image.uploadedByRole || '').toLowerCase() === 'customer'
            ? 'customer_problem'
            : 'before_service';
    const key = image.url || `${image.filename || 'photo'}-${index}`;
    const existing = mergedPhotoMap.get(key);
    const normalizedImage = {
      ...existing,
      ...image,
      type: inferredCategory,
      uploadedByRole: image.uploadedByRole || existing?.uploadedByRole || (inferredCategory === 'customer_problem' ? 'customer' : ''),
      uploadedAt: image.uploadedAt || existing?.uploadedAt || order.createdAt
    };
    mergedPhotoMap.set(key, normalizedImage);
  });
  const photoItems = Array.from(mergedPhotoMap.values());
  const customerProblemPhotos = photoItems.filter((image) => image.type === 'customer_problem');
  const beforeServicePhotos = photoItems.filter((image) => image.type === 'before_service');
  const afterServicePhotos = photoItems.filter((image) => image.type === 'after_service');
  const totalPhotoCount = customerProblemPhotos.length + beforeServicePhotos.length + afterServicePhotos.length;
  const showTechnicianPhotoUploads = role === 'technician' && canUploadPhotos;
  const workOrderDisplayId = getWorkOrderDisplayId(order);
  const customerDisplayId = getCustomerDisplayId(order.customerId);
  const invoiceDisplayId = order.invoiceId ? getInvoiceDisplayId(order.invoiceId) : '';
  const partsLocked = Boolean(recordId(order?.invoiceId)) && !invoiceIsVoid(order.invoiceId);
  const partsLockMessage = partsLockedInvoiceMessage(primaryExtraInvoice || order.invoiceId);
  const canVoidUnlockParts = isAmcLinked && partsLocked && activeExtraInvoicesAreUnpaid && Boolean(primaryExtraInvoice);
  const paidExtraInvoiceLocksParts = isAmcLinked && partsLocked && activeExtraInvoicesHavePayment;
  const hasInventoryPartsUsed = (order.partsUsed || []).some((row) => row.inventoryPartId);
  const stockDeductionSummary = partsLocked
    ? (hasInventoryPartsUsed
      ? 'Stock has already been deducted for inventory parts added to Parts Used.'
      : 'Manual parts do not reduce inventory stock.')
    : 'Inventory stock is deducted when a part is added to Parts Used.';
  const livePartTotal = Number(part.unitPrice || 0) * Number(part.quantity || 1);
  const livePartIsCovered = isAmcLinked && selectedPartChargeType === coveredAmcPart;
  const selectedInventoryPart = inventoryParts.find((item) => item.id === part.inventoryPartId);
  const selectedPartAvailable = Number(selectedInventoryPart?.available || 0);
  const selectedPartOutOfStock = Boolean(selectedInventoryPart && selectedPartAvailable <= 0);
  const selectedPartInsufficientStock = Boolean(
    selectedInventoryPart && Number(part.quantity || 0) > selectedPartAvailable
  );
  const amcDocumentFlows = [
    {
      type: 'amc-contract',
      title: 'AMC CONTRACT PDF',
      statusText: 'AMC linked',
      readyText: 'Shows contract period, value, covered devices, and included visits.',
      lockedText: 'Available only for AMC-linked jobs.',
      allowedStatuses: workOrderDetailStatuses,
      filename: 'amc-contract.pdf',
      amcOnly: true
    },
    {
      type: 'amc-service-visit',
      title: 'AMC SERVICE VISIT PDF',
      statusText: 'Completed / Delivered',
      readyText: 'Shows visit details, issue, status, and covered vs chargeable parts.',
      lockedText: 'Complete the AMC service job before downloading visit PDF.',
      allowedStatuses: ['Completed', 'Delivered'],
      filename: 'amc-service-visit.pdf',
      amcOnly: true
    },
    {
      type: 'amc-invoice',
      title: 'AMC INVOICE / RECEIPT PDF',
      statusText: 'Invoice created',
      readyText: 'Shows covered amount, payable amount, payments, balance, and invoice details.',
      lockedText: 'Create an AMC invoice or extra charges invoice before downloading this PDF.',
      allowedStatuses: workOrderDetailStatuses,
      filename: 'amc-invoice.pdf',
      amcOnly: true,
      requiresAmcInvoice: true
    },
    {
      type: 'amc-renewal-reminder',
      title: 'AMC RENEWAL / EXPIRY REMINDER PDF',
      statusText: 'AMC linked',
      readyText: 'Creates a fresh renewal reminder from the current AMC contract details.',
      lockedText: 'Available only for AMC-linked jobs.',
      allowedStatuses: workOrderDetailStatuses,
      filename: 'amc-renewal-reminder.pdf',
      amcOnly: true
    }
  ];
  const pdfFlows = isAmcLinked ? [...amcDocumentFlows, ...workOrderPdfFlows] : workOrderPdfFlows;
  const pdfFlowAllowed = (flow) => {
    if (flow.amcOnly && !isAmcLinked) return false;
    if (flow.requiresAmcInvoice && !amcPaymentPdfInvoiceId) return false;
    return pdfAllowed(flow, order);
  };
  const pdfFlowLockedReason = (flow) => {
    if (flow.requiresAmcInvoice && !amcPaymentPdfInvoiceId) return flow.lockedText;
    if (flow.amcOnly && !isAmcLinked) return flow.lockedText;
    return pdfLockedReason(flow, order);
  };
  const technicianCloneTabs = [
    { id: 'parts', label: 'Parts' },
    { id: 'partRequests', label: 'Part Requests' },
    { id: 'billing', label: 'Billing' },
    { id: 'notes', label: 'Notes' },
    { id: 'photos', label: 'Photos' },
    { id: 'documents', label: 'Documents' }
  ];
  const visibleWorkOrderTabs = isTechnician ? technicianCloneTabs : workOrderTabs;
  const contentTabs = isTechnician ? ['parts', 'partRequests', 'billing', 'notes', 'photos'] : ['overview', 'workUpdate', 'parts', 'partRequests', 'billing', 'notes', 'photos'];
  const sideTabs = isTechnician ? ['documents'] : ['documents', 'timeline'];
  const statusOptions = workOrderDetailStatuses;
  const phone = customerPhone(order);
  const completedStatuses = ['Completed', 'Delivered', 'Returned'];
  const showCompletedDate = completedStatuses.includes(order.status);
  const completedDateDisplay = workOrderCompletedDateDisplay(order, formatDate);
  const timelineDateTime = (value) => {
    if (!value) return 'Not added yet';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not added yet';
    return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const photoMetaDateTime = (value) => {
    if (!value) return 'Recently uploaded';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recently uploaded';
    return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };
  const photoUploadedBy = (image) => (
    image?.uploadedBy?.name
      || image?.uploadedBy?.username
      || (String(image?.uploadedByRole || '').toLowerCase() === 'customer'
        ? 'Customer'
        : String(image?.uploadedByRole || '').toLowerCase() === 'technician'
          ? 'Technician'
          : String(image?.uploadedByRole || '').toLowerCase() === 'admin'
            ? 'Admin'
            : 'Team')
  );
  const completionReversalEntry = order.completedAt && !showCompletedDate
    ? {
        status: order.status,
        message: `Previously completed on ${formatDate(order.completedAt)}, but status was changed back to ${order.status}.`,
        createdAt: order.updatedAt || order.completedAt,
        synthetic: true
      }
    : null;
  const visibleTimeline = completionReversalEntry ? [completionReversalEntry, ...(order.timeline || [])] : (order.timeline || []);

  function renderPhotoSection(title, items, helperText, emptyTitle, emptyMessage, className = '') {
    return (
      <section className={`${detailPanelClass} work-order-photo-section photo-section-card ${className}`.trim()}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-base font-black text-white">{title}</h3>
            <p className="mt-1 text-sm leading-5 muted">{helperText}</p>
          </div>
        </div>
        {items.length ? (
          <div className="work-order-photo-gallery mt-3">
            {items.map((image, index) => (
              <a
                key={`${title}-${image.url || image.filename || index}`}
                className="technician-photo-card work-order-photo-card"
                href={uploadedAssetUrl(image.url)}
                target="_blank"
                rel="noreferrer"
              >
                <span className="technician-photo-preview">
                  <img src={uploadedAssetUrl(image.url)} alt={image.originalName || image.filename || `${title} ${index + 1}`} loading="lazy" />
                </span>
                <span className="mt-3 block truncate text-sm font-black text-white" title={image.originalName || image.filename || `${title} ${index + 1}`}>
                  {image.originalName || image.filename || `${title} ${index + 1}`}
                </span>
                <span className="mt-2 inline-flex w-fit rounded-full border border-sky-400/20 bg-sky-500/10 px-2.5 py-1 text-[11px] font-bold text-sky-100">
                  {photoCategoryLabels[image.type] || title}
                </span>
                <span className="mt-2 block text-xs muted">Uploaded by {photoUploadedBy(image)}</span>
                <span className="mt-1 block text-xs muted">{photoMetaDateTime(image.uploadedAt || image.createdAt)}</span>
                <span className="work-order-photo-action mt-3 inline-flex min-h-[2.15rem] items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-slate-100 transition hover:border-sky-300/45 hover:text-white">
                  View Full Photo
                </span>
              </a>
            ))}
          </div>
        ) : (
          <div className="work-order-photo-empty mt-3">
            <p className="text-sm font-black text-white">{emptyTitle}</p>
            <p className="mt-1 text-sm leading-5 muted">{emptyMessage}</p>
          </div>
        )}
      </section>
    );
  }

  function renderPhotoEvidenceStrip() {
    const items = [
      {
        label: 'Customer Photo',
        status: customerProblemPhotos.length ? 'Uploaded' : 'Missing',
        hasItems: customerProblemPhotos.length > 0,
        count: customerProblemPhotos.length
      },
      {
        label: 'Before Service',
        status: beforeServicePhotos.length ? 'Uploaded' : 'Missing',
        hasItems: beforeServicePhotos.length > 0,
        count: beforeServicePhotos.length
      },
      {
        label: 'After Completion',
        status: afterServicePhotos.length ? 'Uploaded' : 'Missing',
        hasItems: afterServicePhotos.length > 0,
        count: afterServicePhotos.length
      }
    ];
    return (
      <div className="work-order-photo-evidence photo-evidence-summary mt-4 grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <div key={item.label} className="photo-summary-card rounded-2xl border border-white/10 bg-slate-950/28 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">{item.label}</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className={`inline-flex min-h-[1.8rem] items-center rounded-full border px-2.5 py-1 text-xs font-bold ${photoEvidenceTone(item.hasItems)}`}>
                {item.status}
              </span>
              <span className="text-xs font-semibold text-slate-300">
                {item.count} photo{item.count === 1 ? '' : 's'}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function photoFilesChanged(category, files) {
    const normalizedCategory = normalizePhotoCategory(category);
    const nextFiles = Array.from(files || []);
    const validationMessage = validatePhotoFiles(nextFiles);
    if (validationMessage) {
      push(validationMessage, 'error');
      const inputRef = normalizedCategory === 'after_service' ? afterServiceInputRef : beforeServiceInputRef;
      if (inputRef.current) inputRef.current.value = '';
      setPhotoFiles((current) => ({ ...current, [normalizedCategory]: [] }));
      return;
    }
    setPhotoFiles((current) => ({ ...current, [normalizedCategory]: nextFiles }));
  }

  function renderTechnicianPhotoUpload(category, title, helperText, inputRef) {
    const normalizedCategory = normalizePhotoCategory(category);
    const selectedFiles = photoFiles[normalizedCategory] || [];
    const uploading = photoUploadingType === normalizedCategory;
    const inputId = `work-order-photo-upload-${normalizedCategory}`;
    return (
      <form className={`${detailPanelClass} work-order-photo-upload-card`} onSubmit={(event) => uploadPhotos(event, normalizedCategory)}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wide text-sky-100">{title}</h3>
            <p className="mt-1 text-sm leading-5 muted">{helperText}</p>
          </div>
        </div>
        <input
          id={inputId}
          ref={inputRef}
          className="hidden"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          onChange={(event) => photoFilesChanged(normalizedCategory, event.target.files)}
        />
        <div className="work-order-photo-upload-row mt-3 flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-950/30 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="work-order-photo-upload-copy min-w-0">
            <p className="work-order-photo-upload-status text-sm font-semibold text-slate-100">
              {selectedFiles.length
                ? `${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'} selected`
                : 'No file selected yet'}
            </p>
            <p className="work-order-photo-upload-format mt-1 text-xs leading-5 muted">JPG, JPEG, PNG, WEBP up to 5 MB.</p>
          </div>
          <div className="work-order-photo-upload-actions flex flex-col gap-2 sm:flex-row sm:items-center">
            <label htmlFor={inputId} className="btn btn-secondary min-h-11 cursor-pointer justify-center whitespace-nowrap">
              <FileText className="h-4 w-4" />
              Choose Photos
            </label>
            <button
              type="submit"
              className="btn btn-primary min-h-11 justify-center whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60"
              disabled={uploading || !selectedFiles.length}
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
              {uploading ? 'Uploading...' : `Upload ${title}`}
            </button>
          </div>
        </div>
      </form>
    );
  }

  function renderPartsLockNotice(className = 'mt-2') {
    if (!partsLocked) return null;
    return (
      <div className={`${className} rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-amber-100`}>
        <p className="text-xs font-semibold leading-5">{partsLockMessage}</p>
        {paidExtraInvoiceLocksParts ? (
          <p className="mt-1 text-xs font-semibold text-amber-100/85">Payment already exists. Create an adjustment invoice instead.</p>
        ) : null}
        {canEditInvoice && canVoidUnlockParts ? (
          <button
            type="button"
            className="btn btn-secondary mt-3 py-2"
            onClick={() => setVoidUnlockConfirm(true)}
          >
            Void Extra Invoice & Unlock Parts
          </button>
        ) : null}
      </div>
    );
  }

  function renderPartRequestActions(item) {
    const requestId = item._id || item.id;
    const display = partRequestDisplayStatus(item.status);

    if (display === 'Rejected' || item.status === 'Cancelled' || item.status === 'Rejected') {
      return <span className="text-xs muted">{item.rejectionReason || item.note || 'Rejected'}</span>;
    }
    if (display === 'Moved to Parts Used' || item.status === 'Fulfilled' || item.status === 'Moved to Parts Used') {
      return <span className="inline-flex min-h-[1.75rem] cursor-not-allowed items-center rounded-full border border-slate-600/40 bg-slate-800/50 px-2.5 py-1 text-xs font-semibold text-slate-400">Already moved</span>;
    }
    if (display === 'Completed' || item.status === 'Completed') {
      return <span className="inline-flex min-h-[1.75rem] cursor-not-allowed items-center rounded-full border border-slate-600/40 bg-slate-800/50 px-2.5 py-1 text-xs font-semibold text-slate-400">Completed</span>;
    }
    if (!canApprovePartRequests) return <span className="text-xs muted">Awaiting review</span>;
    if (partRequestIsPending(item.status)) {
      return (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary py-1.5 text-xs" onClick={() => setPartAction({ type: 'approve', requestId, name: item.name, quantity: item.quantity })}>Approve</button>
          <button type="button" className="btn btn-secondary py-1.5 text-xs" onClick={() => { setRejectReason(''); setPartAction({ type: 'reject', requestId, name: item.name, quantity: item.quantity }); }}>Reject</button>
        </div>
      );
    }
    if (partRequestCanMove(item.status)) {
      if (!canManagePartsUsed) {
        return <span className="text-xs muted">Awaiting parts update</span>;
      }
      if (partsLocked) {
        return <span className="text-xs muted">Move locked — invoice exists.</span>;
      }
      const inventoryPartId = item.inventoryPartId ? recordId(item.inventoryPartId) : '';
      return (
        <button
          type="button"
          className="btn btn-primary py-1.5 text-xs"
          onClick={() => setPartAction({ type: 'move', requestId, name: item.name, quantity: item.quantity, inventoryPartId })}
        >
          Move to Parts Used
        </button>
      );
    }
    return null;
  }

  function renderPartsDuplicateModals() {
    return (
      <>
        {voidUnlockConfirm ? (
          <ConfirmModal
            title="Void extra invoice?"
            message="This will void the unpaid extra invoice and unlock parts for editing. Continue?"
            confirmLabel="Void & Unlock"
            onCancel={() => setVoidUnlockConfirm(false)}
            onConfirm={voidExtraInvoiceAndUnlockParts}
          />
        ) : null}
        {addPartDupKind === 'inventory' ? (
          <ConfirmModal
            title="Part already in Parts Used"
            message="This part is already in Parts Used. Do you want to increase the quantity instead?"
            confirmLabel="Increase quantity"
            onCancel={() => setAddPartDupKind(null)}
            onConfirm={() => {
              setAddPartDupKind(null);
              addPart(null, { mergeDuplicateInventory: true });
            }}
          />
        ) : null}
        {addPartDupKind === 'manual' ? (
          <div className="fixed inset-0 z-[95] grid place-items-center bg-black/50 p-4">
            <div className="surface w-full max-w-md p-5">
              <h2 className="text-lg font-black">Duplicate manual part name</h2>
              <p className="mt-2 text-sm leading-6 muted">
                A manual part with this name already exists. Add as a separate line or increase quantity on the existing line?
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button type="button" className="btn btn-secondary" onClick={() => setAddPartDupKind(null)}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setAddPartDupKind(null);
                    addPart(null, { allowDuplicateManualLine: true });
                  }}
                >
                  Separate line
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setAddPartDupKind(null);
                    addPart(null, { mergeDuplicateManual: true });
                  }}
                >
                  Increase quantity
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {moveDupKind === 'inventory' ? (
          <ConfirmModal
            title="Part already in Parts Used"
            message="This part is already in Parts Used. Do you want to increase the quantity instead?"
            confirmLabel="Increase quantity"
            onCancel={() => setMoveDupKind(null)}
            onConfirm={() => {
              setMoveDupKind(null);
              runPartRequestAction({ mergeDuplicateInventory: true });
            }}
          />
        ) : null}
        {moveDupKind === 'manual' ? (
          <div className="fixed inset-0 z-[95] grid place-items-center bg-black/50 p-4">
            <div className="surface w-full max-w-md p-5">
              <h2 className="text-lg font-black">Duplicate manual part name</h2>
              <p className="mt-2 text-sm leading-6 muted">
                A manual part with this name already exists. Add as a separate line or increase quantity on the existing line?
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button type="button" className="btn btn-secondary" onClick={() => setMoveDupKind(null)}>Cancel</button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setMoveDupKind(null);
                    runPartRequestAction({ allowDuplicateManualLine: true });
                  }}
                >
                  Separate line
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setMoveDupKind(null);
                    runPartRequestAction({ mergeDuplicateManual: true });
                  }}
                >
                  Increase quantity
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </>
    );
  }

  if (false && isTechnician) {
    return (
      <div className="work-order-detail pb-28 sm:pb-0">
        <PageHeader
          title={workOrderDisplayId}
          eyebrow="Repair & Service Job"
          action={(
            <div className="flex flex-wrap gap-2">
              <a className={`btn btn-secondary ${phone ? '' : 'pointer-events-none opacity-50'}`} href={callHref(phone)}><PhoneCallIcon className="h-4 w-4" />Call</a>
              <a className={`btn btn-primary ${phone ? '' : 'pointer-events-none opacity-50'}`} href={technicianWhatsAppHref(order)} target="_blank" rel="noreferrer"><Send className="h-4 w-4" />WhatsApp</a>
            </div>
          )}
        >
          {order.customerId?.name || 'Customer'} - {order.device || 'Service job'}
        </PageHeader>

        <div className={`${detailSectionClass} mb-4`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Assigned Job Summary</p>
              <h2 className="mt-1 text-2xl font-black text-white">{order.customerId?.name || 'Customer'}</h2>
              <p className="mt-1 text-sm muted">{workOrderDisplayId} - Customer ID: {customerDisplayId}</p>
              {invoiceDisplayId ? <p className="text-xs muted">Invoice ID: {invoiceDisplayId}</p> : null}
              <p className="mt-1 text-sm muted">{order.issue || 'No issue captured'}</p>
            </div>
            <WorkOrderBadgeGroup justify="justify-end">
              <StatusBadge status={order.status} />
            </WorkOrderBadgeGroup>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              ['Customer', order.customerId?.name || '-'],
              ['Phone', phone || '-'],
              ['Service Type', order.serviceType || order.service || '-'],
              ['Device', order.device || '-'],
              ['Priority', <div key="priority">{renderPrioritySummary()}</div>],
              ['Source', <WorkOrderDetailSourceBadge key="source" source={order} />],
              ['Scheduled', jobScheduleLabel(order)],
              ['Technician', technicianNameOrAdmin(order)],
              ['Created', formatDate(order.createdAt)]
            ].map(([label, value]) => (
              <WorkOrderInfoCard key={label} label={label}>{value}</WorkOrderInfoCard>
            ))}
          </div>
          {order.customerId?.address ? (
            <div className={`${detailPanelClass} mt-3`}>
              <p className={detailLabelClass}>Address</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">{order.customerId.address}</p>
            </div>
          ) : null}
        </div>

        <div className="surface sticky top-20 z-20 mb-4 border border-white/10 bg-[#071426]/90 p-1.5 shadow-lg backdrop-blur">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            {technicianWorkOrderTabs.map((tab) => (
              <button key={tab.id} type="button" className={detailTabButtonClass(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>
                <span>{tab.label}</span>
                {tab.id === 'photos' ? <span className="work-order-photo-tab-badge">{totalPhotoCount}</span> : null}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'overview' ? (
          <div className="grid gap-4 xl:grid-cols-[1fr_.8fr]">
            <div className={detailSectionClass}>
              <h2 className="text-xl font-black">Overview</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  ['Work Order ID', workOrderDisplayId],
                  ['Customer ID', customerDisplayId],
                  ...(invoiceDisplayId ? [['Invoice ID', invoiceDisplayId]] : []),
                  ['Customer name', order.customerId?.name || '-'],
                  ['Phone', phone || '-'],
                  ['Service', order.serviceType || order.service || '-'],
                  ['Device', order.device || '-'],
                  ['Problem / Issue', order.issue || '-'],
                  ...(isAmcLinked ? [
                    ['AMC Contract ID', amcContract?.contractId || '-'],
                    ['AMC Contract Type', amcContract?.contractType || '-'],
                    ['AMC Coverage Type', amcCoverageType],
                    ['AMC Contract Value', currency(amcContractValue)],
                    ['AMC Paid Amount', currency(amcPaidAmount)],
                    ['AMC Pending Amount', currency(amcPendingAmount)],
                    ['AMC Contract Status', amcContractStatus],
                    ['AMC Payment Status', amcPaymentStatus],
                    ['Covered Devices / Assets', amcContract?.coveredDevices || amcContract?.coveredService || '-']
                  ] : []),
                  ['Booking Source', <WorkOrderDetailSourceBadge key="overview-source" source={order} />],
                  ['Status', <WorkOrderBadgeGroup key="overview-status"><StatusBadge status={order.status} /></WorkOrderBadgeGroup>],
                  ['Completed Date', completedDateDisplay]
                ].map(([label, value]) => (
                  <WorkOrderInfoCard key={label} label={label}>{value}</WorkOrderInfoCard>
                ))}
              </div>
            </div>
            <div className={detailSectionClass}>
              <h2 className="text-xl font-black">Quick Contact</h2>
              <div className="mt-4 grid gap-3">
                <a className={`btn btn-secondary btn-lg ${phone ? '' : 'pointer-events-none opacity-50'}`} href={callHref(phone)}><PhoneCallIcon className="h-4 w-4" />Call Customer</a>
                <a className={`btn btn-primary btn-lg ${phone ? '' : 'pointer-events-none opacity-50'}`} href={technicianWhatsAppHref(order)} target="_blank" rel="noreferrer"><Send className="h-4 w-4" />Open WhatsApp</a>
                <Link className="btn btn-secondary btn-lg" to="/tech/work-orders">Back to My Jobs</Link>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'workUpdate' ? (
          <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
            <div className={detailSectionClass}>
              <h2 className="text-xl font-black">Status Update</h2>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {technicianAllowedStatuses.map((status) => (
                  <button key={status} type="button" className={`${detailStatusButtonClass(order.status === status)} justify-start`} onClick={() => saveStatus(status)}>
                    <CheckCircle2 className="h-4 w-4" />{status}
                  </button>
                ))}
              </div>
            </div>
            <form className={detailSectionClass} onSubmit={addNote}>
              <h2 className="text-xl font-black">Checklist / Work Update</h2>
              <textarea className="input mt-4 min-h-36" placeholder="Diagnosis / work update / follow-up needed" value={note} onChange={(event) => setNote(event.target.value)} />
              <button type="submit" className="btn btn-primary mt-3 w-full sm:w-auto">Add Work Update</button>
            </form>
          </div>
        ) : null}

        {activeTab === 'parts' ? (
          <div className="grid gap-4">
            <div className={detailSectionClass}>
              <h2 className="text-xl font-black">Parts Used</h2>
              {renderPartsLockNotice()}
              <div className="mt-4 grid gap-3">
                {order.partsUsed?.length ? order.partsUsed.map((item) => (
                  <div key={item._id || item.createdAt} className="rounded-card bg-[var(--surface-2)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-black">{item.name}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {isAmcLinked ? amcPartBillingBadges(item, amcContract).map((badge) => (
                          <span key={badge.label} className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${badge.tone}`}>{badge.label}</span>
                        )) : null}
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${item.inventoryPartId ? 'bg-sky-500/15 text-sky-100' : 'bg-slate-500/15 text-slate-100'}`}>{partUsedTypeLabel(item)}</span>
                      </div>
                    </div>
                    <p className="mt-1 text-sm muted">Qty {item.quantity} · Unit: {currency(item.unitPrice)} · Total: {currency(item.total)}</p>
                  </div>
                )) : <EmptyState title="No parts added yet." message="Add used parts that should appear on the final bill." />}
              </div>
            </div>
            <div className={detailSectionClass}>
              <h2 className="text-xl font-black">Add Used Part</h2>
              <form className="mt-4 grid gap-3 md:grid-cols-[1fr_120px_auto_auto]" onSubmit={addPart}>
                <select className="input disabled:cursor-not-allowed disabled:opacity-60" value={part.inventoryPartId || ''} disabled={partsLocked} onChange={(event) => handlePartSelect(event.target.value)}>
                  <option value="">Manual / Outside Part</option>
                  {inventoryParts.map((item) => <option key={item.id} value={item.id}>{item.partName} - {item.available} available</option>)}
                </select>
                <input className="input disabled:cursor-not-allowed disabled:opacity-60" type="number" min="1" value={part.quantity} disabled={partsLocked} onChange={(event) => handlePartQuantityChange(event.target.value)} />
                {isAmcLinked ? (
                  <select className="input disabled:cursor-not-allowed disabled:opacity-60" value={normalizeAmcChargeTypeSelectValue(part.chargeType)} disabled={partsLocked} onChange={(event) => setPart((current) => ({ ...current, chargeType: event.target.value }))}>
                    {amcChargeTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                ) : null}
                <div className="rounded-card bg-[var(--surface-2)] px-3 py-2">
                  <p className="text-xs muted">Line Total</p>
                  <p className="text-sm font-black">{livePartIsCovered ? currency(0) : currency(livePartTotal)}</p>
                </div>
                <button type="submit" className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={partsLocked || selectedPartOutOfStock || selectedPartInsufficientStock}><PackagePlus className="h-4 w-4" />Add Used Part</button>
              </form>
              {!part.inventoryPartId ? <input className="input mt-3 disabled:cursor-not-allowed disabled:opacity-60" placeholder="Manual / outside part name" value={part.partName} disabled={partsLocked} onChange={(event) => setPart((current) => ({ ...current, partName: event.target.value }))} /> : null}
              {selectedPartOutOfStock ? <p className="mt-2 text-sm font-semibold text-rose-100">Not enough available stock</p> : null}
              {selectedPartInsufficientStock && !selectedPartOutOfStock ? <p className="mt-2 text-sm font-semibold text-amber-100">Not enough available stock ({selectedPartAvailable} available).</p> : null}
              <div className="mt-4 rounded-card bg-emerald-400/10 p-3 text-emerald-100">
                <p className="text-sm font-bold">Parts total: {currency(partsTotal)}</p>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'partRequests' ? (
          <div className="grid gap-4">
            <div className={detailSectionClass}>
              <h2 className="text-xl font-black">Part Requests</h2>
              <div className="mt-4 grid gap-3">
                {order.partRequests?.length ? order.partRequests.map((item) => (
                  <div key={item._id || item.createdAt} className="rounded-card bg-[var(--surface-2)] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-black">{item.name} x {item.quantity}</p>
                      <PartRequestStatusBadge status={item.status} />
                    </div>
                    <p className="mt-1 text-sm muted">{item.note || item.rejectionReason || 'No request note'}</p>
                    <p className="mt-1 text-xs muted">Requested by {item.userId?.name || item.userId?.username || 'Team'} - {formatDate(item.createdAt)}</p>
                  </div>
                )) : <EmptyState title="No part requests yet." message="Request parts when stock or admin approval is needed." />}
              </div>
            </div>
            <form className={detailSectionClass} onSubmit={requestPart}>
              <h2 className="text-xl font-black">Request Part Approval</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_110px_auto]">
                <select className="input" value={partRequest.inventoryPartId} onChange={(event) => {
                  const selected = inventoryParts.find((item) => item.id === event.target.value);
                  setPartRequest((current) => ({ ...current, inventoryPartId: event.target.value, partName: selected?.partName || '' }));
                }}>
                  <option value="">Manual / Outside Part</option>
                  {inventoryParts.map((item) => <option key={item.id} value={item.id}>{item.partName} - {item.available} available</option>)}
                </select>
                <input className="input" type="number" min="1" value={partRequest.quantity} onChange={(event) => handlePartRequestQuantityChange(event.target.value)} />
                <button type="submit" className="btn btn-primary"><PackagePlus className="h-4 w-4" />Request Part Approval</button>
              </div>
              {!partRequest.inventoryPartId ? <input className="input mt-3" placeholder="Requested part name" value={partRequest.partName} onChange={(event) => setPartRequest((current) => ({ ...current, partName: event.target.value }))} /> : null}
              <textarea className="input mt-3 min-h-24" placeholder="Request note / reason" value={partRequest.note} onChange={(event) => setPartRequest((current) => ({ ...current, note: event.target.value }))} />
            </form>
          </div>
        ) : null}

        {activeTab === 'notes' ? (
          <div className="grid gap-4">
            <form className={detailSectionClass} onSubmit={addNote}>
              <h2 className="text-xl font-black">Technician Notes</h2>
              <textarea className="input mt-4 min-h-28" placeholder="Diagnosis, work done, customer instruction, follow-up needed" value={note} onChange={(event) => setNote(event.target.value)} />
              <button type="submit" className="btn btn-primary mt-3">Add Note</button>
            </form>
            <div className={detailSectionClass}>
              <div className="grid gap-3">
                {order.notes?.length ? order.notes.map((item) => <div key={item._id || item.createdAt} className="rounded-card bg-[var(--surface-2)] p-3"><p>{item.text}</p><p className="mt-1 text-xs muted">{item.userId?.name || item.userId?.username || 'Team'} - {formatDate(item.createdAt)}</p></div>) : <EmptyState title="No technician notes yet." message="Add diagnosis, customer instruction, or work completion notes." />}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'photos' ? (
          <div className="work-order-photos-panel grid gap-4">
            <div className={`${detailSectionClass} photos-tab-header`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">Photos</h2>
                  <p className="mt-1 text-sm muted">Review customer issue photos and upload before-service / after-completion photos.</p>
                </div>
              </div>
              {renderPhotoEvidenceStrip()}
              <div className="photo-gallery-grid mt-4 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
                {renderPhotoSection('Customer Problem Photo', customerProblemPhotos, 'Customer uploaded issue/device photos will appear here.', 'No photo uploaded yet.', 'Photos added by the customer or technician will appear here.')}
                {renderPhotoSection('Before Service Photos', beforeServicePhotos, 'Technician before-service photos will appear here.', 'No photo uploaded yet.', 'Upload before-service photos before starting work.')}
                {renderPhotoSection('After Completion Photos', afterServicePhotos, 'Technician after-completion photos will appear here.', 'No photo uploaded yet.', 'Upload completion photos after finishing the job.')}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'documents' ? (
          <div className={detailSectionClass}>
            <h2 className="text-xl font-black">Documents</h2>
            <div className="mt-4 grid gap-3">
              {pdfFlows.map((flow) => {
                const enabled = pdfFlowAllowed(flow);
                const downloading = pdfBusy === `download-${flow.type}`;
                const regenerating = pdfBusy === `regenerate-${flow.type}`;
                return (
                  <div key={flow.type} className={pdfWorkflowCardClass(enabled)}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className={`font-black ${enabled ? 'text-white' : 'text-slate-400'}`}>{flow.title}</h3>
                        <p className="mt-1 text-xs font-semibold muted">Status requirement: {flow.statusText}</p>
                      </div>
                      <FileText className={`h-5 w-5 shrink-0 ${enabled ? 'text-[var(--brand)]' : 'text-slate-600'}`} />
                    </div>
                    <span className={`mt-3 inline-flex min-h-[1.75rem] items-center rounded-full border px-2.5 py-1 text-xs font-bold ${enabled ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100' : 'border-slate-400/20 bg-slate-600/20 text-slate-200'}`}>{enabled ? 'Ready' : 'Locked'}</span>
                    <p className="mt-2 text-sm muted">{enabled ? flow.readyText : pdfFlowLockedReason(flow)}</p>
                    <div className="mt-4 grid gap-2 sm:grid-cols-3">
                      <button type="button" className={pdfActionButtonClass(enabled)} disabled={!enabled || Boolean(pdfBusy)} onClick={() => previewWorkflowPdf(flow)}><FileText className="h-4 w-4" />Preview PDF</button>
                      <button type="button" className={pdfActionButtonClass(enabled)} disabled={!enabled || Boolean(pdfBusy)} onClick={() => downloadWorkflowPdf(flow)}>{downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Download PDF</button>
                      <button type="button" className={pdfActionButtonClass(enabled)} disabled={!enabled || Boolean(pdfBusy)} onClick={() => downloadWorkflowPdf(flow, true)}>{regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}Regenerate PDF</button>
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
        {renderPartsDuplicateModals()}
      </div>
    );
  }

  return (
    <div className={`work-order-detail ${isTechnician ? 'work-order-detail--technician' : ''}`}>
      <PageHeader
        title={workOrderDisplayId}
        eyebrow="Repair & Service Job Details"
      >
        {order.customerId?.name || 'Customer'} - {order.device || 'Service job'}
      </PageHeader>

      <div className={`${detailSectionClass} work-order-detail-summary mb-4`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Job Summary</p>
            <h2 className="mt-1 truncate text-2xl font-black text-white" title={order.customerId?.name || 'Customer'}>{order.customerId?.name || 'Customer'}</h2>
            <p className="mt-1 text-sm muted">{workOrderDisplayId} - Customer ID: {customerDisplayId}</p>
            {invoiceDisplayId ? <p className="text-xs muted">Invoice ID: {invoiceDisplayId}</p> : null}
            <p className="mt-1 text-sm muted">{order.issue || 'No issue captured'}</p>
          </div>
          <WorkOrderBadgeGroup justify="justify-end">
            <StatusBadge status={order.status} />
          </WorkOrderBadgeGroup>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            ['Work Order ID', workOrderDisplayId],
            ['Source', <WorkOrderDetailSourceBadge key="source-admin" source={order} />],
            ['Technician', technicianNameOrAdmin(order)],
            ['Customer ID', customerDisplayId],
            ['Created Date', formatDate(order.createdAt)],
            ['Completed Date', showCompletedDate ? completedDateDisplay : 'Not completed yet'],
            ['Customer Name', order.customerId?.name || '-'],
            ['Phone', order.customerId?.phone || '-'],
            ['Address', order.customerId?.address || '-'],
            ['Service Type', order.serviceType || order.service || '-'],
            ['Device', order.device || '-'],
            ...(isAmcLinked ? [
              ['AMC Contract ID', amcContract?.contractId || '-'],
              ['AMC Contract Type', amcContract?.contractType || '-'],
              ['AMC Coverage Type', amcCoverageType],
              ['AMC Contract Value', currency(amcContractValue)],
              ['AMC Paid Amount', currency(amcPaidAmount)],
              ['AMC Pending Amount', currency(amcPendingAmount)],
              ['AMC Contract Status', amcContractStatus],
              ['AMC Payment Status', amcPaymentStatus],
              ['Covered Devices / Assets', amcContract?.coveredDevices || amcContract?.coveredService || '-']
            ] : []),
            ['Status', <WorkOrderBadgeGroup key="status-admin"><StatusBadge status={order.status} /></WorkOrderBadgeGroup>],
            ['Priority', <div key="priority-admin">{renderPrioritySummary()}</div>, '!min-h-[132px]']
          ].map(([label, value, className]) => (
            <WorkOrderInfoCard key={label} label={label} className={className || ''}>{value}</WorkOrderInfoCard>
          ))}
        </div>
        {!isTechnician ? <div className="mt-3">
          <span className={detailLabelClass}>Status Workflow</span>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {canUpdateWorkOrderStatus ? statusOptions.map((item) => (
              <button key={item} type="button" className={detailStatusButtonClass(order.status === item)} onClick={() => saveStatus(item)}>
                {order.status === item ? <CheckCircle2 className="h-4 w-4" /> : null}
                {item}
              </button>
            )) : <StatusBadge status={order.status} />}
            {canAssignTechnician && !order.technicianId ? <button type="button" className={`${detailStatusButtonClass(false)} border-sky-400/30 text-sky-100`} onClick={autoAssignDetail}>Auto Assign Technician</button> : null}
          </div>
        </div> : null}
        {isTechnician ? (
          <div className="technician-detail-status-workflow mt-4">
            <span className={detailLabelClass}>Status Workflow</span>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {statusOptions.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={detailStatusButtonClass(order.status === item)}
                  onClick={() => saveStatus(item)}
                  disabled={!canUpdateWorkOrderStatus}
                  aria-current={order.status === item ? 'step' : undefined}
                >
                  {order.status === item ? <CheckCircle2 className="h-4 w-4" /> : null}
                  {item}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="surface sticky top-20 z-20 mb-4 border border-white/10 bg-[#071426]/90 p-1.5 shadow-lg backdrop-blur">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {visibleWorkOrderTabs.map((tab) => (
            <button key={tab.id} type="button" className={detailTabButtonClass(activeTab === tab.id)} onClick={() => setActiveTab(tab.id)}>
              <span>{tab.label}</span>
              {tab.id === 'photos' ? <span className="work-order-photo-tab-badge">{totalPhotoCount}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {contentTabs.includes(activeTab) || sideTabs.includes(activeTab) ? <div className={`grid gap-4 ${sideTabs.includes(activeTab) ? '' : 'xl:grid-cols-[minmax(0,1fr)]'}`}>
        <div className={contentTabs.includes(activeTab) ? `grid ${activeTab === 'billing' ? 'gap-3' : 'gap-4'}` : 'hidden'}>
          <div className={activeTab === 'overview' ? detailSectionClass : 'hidden'}>
            <h2 className="text-xl font-black">Overview</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                ['Work Order ID', workOrderDisplayId],
                ['Customer ID', customerDisplayId],
                ...(invoiceDisplayId ? [['Invoice ID', invoiceDisplayId]] : []),
                ['Customer Name', order.customerId?.name || '-'],
                ['Phone', phone || '-'],
                ['Service Type', order.serviceType || order.service || '-'],
                ['Device', order.device || '-'],
                ['Problem / Issue', order.issue || '-'],
                ...(isAmcLinked ? [
                  ['AMC Contract ID', amcContract?.contractId || '-'],
                  ['AMC Contract Type', amcContract?.contractType || '-'],
                  ['AMC Coverage Type', amcCoverageType],
                  ['AMC Contract Value', currency(amcContractValue)],
                  ['AMC Paid Amount', currency(amcPaidAmount)],
                  ['AMC Pending Amount', currency(amcPendingAmount)],
                  ['AMC Contract Status', amcContractStatus],
                  ['AMC Payment Status', amcPaymentStatus],
                  ['Covered Devices / Assets', amcContract?.coveredDevices || amcContract?.coveredService || '-']
                ] : []),
                ['Booking Source', <WorkOrderDetailSourceBadge key="overview-source" source={order} />],
                ['Status', <WorkOrderBadgeGroup key="overview-status"><StatusBadge status={order.status} /></WorkOrderBadgeGroup>],
                ['Completed Date', completedDateDisplay]
              ].map(([label, value]) => (
                <WorkOrderInfoCard key={label} label={label}>{value}</WorkOrderInfoCard>
              ))}
            </div>
          </div>

          <div className={activeTab === 'workUpdate' ? detailSectionClass : 'hidden'}>
            <div className="grid gap-4 xl:grid-cols-[.85fr_1.15fr]">
              <div>
                <h2 className="text-xl font-black">Status Update</h2>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {canUpdateWorkOrderStatus ? workOrderDetailStatuses.map((status) => (
                    <button key={status} type="button" className={`${detailStatusButtonClass(order.status === status)} justify-start`} onClick={() => saveStatus(status)}>
                      {order.status === status ? <CheckCircle2 className="h-4 w-4" /> : null}
                      {status}
                    </button>
                  )) : <StatusBadge status={order.status} />}
                </div>
              </div>
              {canAddNotes ? <form onSubmit={addNote}>
                <h2 className="text-xl font-black">Checklist / Work Update</h2>
                <textarea className={`input mt-4 min-h-36 ${detailFocusRing}`} placeholder="Diagnosis / work update / follow-up needed" value={note} onChange={(event) => setNote(event.target.value)} />
                <button type="submit" className="btn btn-primary mt-3 w-full sm:w-auto">Add Work Update</button>
              </form> : null}
            </div>
          </div>

          <div className={activeTab === 'parts' ? detailSectionClass : 'hidden'}>
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-3">
              <div>
                <h2 className="text-xl font-black">Parts Used</h2>
                {renderPartsLockNotice()}
              </div>
            </div>

            {isTechnician && order.partsUsed?.length ? (
              <div className="technician-detail-card-grid mt-4">
                {order.partsUsed.map((item) => (
                  <article key={`mobile-${item._id || item.createdAt}`} className="technician-detail-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="technician-mobile-card-eyebrow">Part Used</p>
                        <h3 className="technician-mobile-card-title">{item.name}</h3>
                      </div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${item.inventoryPartId ? 'bg-sky-500/15 text-sky-100' : 'bg-slate-500/15 text-slate-100'}`}>{partUsedTypeLabel(item)}</span>
                    </div>
                    <div className="technician-detail-card-metrics">
                      <span><b>{item.quantity}</b><small>Qty</small></span>
                      <span><b>{currency(item.unitPrice)}</b><small>Unit</small></span>
                      <span><b>{currency(item.total)}</b><small>Total</small></span>
                    </div>
                    {isAmcLinked ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {amcPartBillingBadges(item, amcContract).map((badge) => (
                          <span key={badge.label} className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${badge.tone}`}>{badge.label}</span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : null}

            <div className={`mt-4 table-wrap border border-white/10 bg-[var(--surface)] ${isTechnician && order.partsUsed?.length ? 'technician-mobile-hidden-table' : ''}`}>
              {order.partsUsed?.length ? (
                <table className="data-table">
                  <thead><tr><th>Part Name</th><th>Type</th>{isAmcLinked ? <th>Charge Type</th> : null}<th>Quantity</th><th>Unit Price</th><th>Total</th>{canManagePartsUsed ? <th>Action</th> : null}</tr></thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {order.partsUsed.map((item) => (
                      <tr key={item._id || item.createdAt} className="transition-colors hover:bg-white/[0.03]">
                        <td className="font-bold">{item.name}</td>
                        <td><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${item.inventoryPartId ? 'bg-sky-500/15 text-sky-100' : 'bg-slate-500/15 text-slate-100'}`}>{partUsedTypeLabel(item)}</span></td>
                        {isAmcLinked ? (
                          <td>
                            <div className="flex flex-wrap gap-1.5">
                              {amcPartBillingBadges(item, amcContract).map((badge) => (
                                <span key={badge.label} className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${badge.tone}`}>{badge.label}</span>
                              ))}
                            </div>
                          </td>
                        ) : null}
                        <td>{item.quantity}</td>
                        <td>{currency(item.unitPrice)}</td>
                        <td className="font-black">{currency(item.total)}</td>
                        {canManagePartsUsed ? (
                          <td>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                className="icon-button h-9 w-9 disabled:cursor-not-allowed disabled:opacity-40"
                                disabled={partsLocked}
                                title={partsLocked ? partsLockMessage : 'Edit part'}
                                onClick={() => setEditPartRow({
                                  ...item,
                                  _id: item._id || item.id,
                                  chargeType: item.chargeTypeMode === manualAmcPartChargeMode ? partChargeType(item, amcContract) : autoAmcPartChargeType,
                                  chargeTypeMode: item.chargeTypeMode || autoAmcPartChargeMode,
                                  note: item.note || ''
                                })}
                                aria-label={`Edit ${item.name}`}
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="icon-button h-9 w-9 disabled:cursor-not-allowed disabled:opacity-40"
                                disabled={partsLocked}
                                onClick={(event) => removePart(item._id, event)}
                                aria-label={`Delete ${item.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState
                  title="No parts added yet."
                  message="Add parts used for this repair. Inventory stock is deducted when a part is added to Parts Used."
                />
              )}
            </div>

            <div className="mt-3 flex justify-end border-t border-white/10 pt-3">
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-2.5 text-right shadow-[0_0_22px_rgba(16,185,129,0.08)]">
                <p className="text-xs font-semibold uppercase tracking-wide muted">{isAmcLinked ? 'Chargeable Parts Total' : 'Total Amount'}</p>
                <p className="mt-0.5 text-lg font-black text-emerald-100">{currency(partsTotal)}</p>
              </div>
            </div>

            {canManagePartsUsed ? (
              <div className={`${detailPanelClass} mt-4`}>
                <h3 className="text-xs font-black uppercase tracking-wide text-sky-100">Add Used Part</h3>
                <form className="mt-3 grid gap-3" onSubmit={(event) => event.preventDefault()}>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="label">Part Type / Source</span>
                    <select className="input py-2 disabled:cursor-not-allowed disabled:opacity-60" value={part.inventoryPartId || ''} disabled={partsLocked} onChange={(event) => handlePartSelect(event.target.value)}>
                      <option value="">Manual / Outside Part</option>
                      {inventoryParts.map((item) => <option key={item.id} value={item.id}>{item.partName} - {item.available} available</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1.5">
                    <span className="label">Manual / Outside Part Name</span>
                    <input
                      className="input py-2 disabled:cursor-not-allowed disabled:opacity-60"
                      placeholder={part.inventoryPartId ? 'Using selected inventory part' : 'Enter manual part name'}
                      value={part.partName}
                      disabled={Boolean(part.inventoryPartId) || partsLocked}
                      onChange={(event) => setPart((current) => ({ ...current, partName: event.target.value }))}
                      onKeyDown={(event) => { if (event.key === 'Enter') addPart(event); }}
                    />
                  </label>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <label className="grid gap-1.5">
                    <span className="label">Quantity</span>
                    <input className="input py-2 disabled:cursor-not-allowed disabled:opacity-60" type="number" min="1" value={part.quantity} disabled={partsLocked} onChange={(event) => handlePartQuantityChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') addPart(event); }} />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="label">Unit Price</span>
                    <input className={`${detailNumberInputClass} py-2 disabled:cursor-not-allowed disabled:opacity-60`} type="number" min="0" value={part.unitPrice} disabled={partsLocked} onChange={(event) => setPart((current) => ({ ...current, unitPrice: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') addPart(event); }} />
                  </label>
                  {isAmcLinked ? (
                    <label className="grid gap-1.5">
                      <span className="label">Charge Type</span>
                      <select className="input py-2 disabled:cursor-not-allowed disabled:opacity-60" value={normalizeAmcChargeTypeSelectValue(part.chargeType)} disabled={partsLocked} onChange={(event) => setPart((current) => ({ ...current, chargeType: event.target.value }))}>
                        {amcChargeTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                  ) : null}
                  <div className="rounded-card border border-white/10 bg-[var(--surface)] px-3 py-2">
                    <p className="label">Line Total</p>
                    <p className="mt-0.5 text-base font-black text-emerald-100">{livePartIsCovered ? currency(0) : currency(livePartTotal)}</p>
                    {livePartIsCovered ? <p className="mt-1 text-[11px] font-semibold text-emerald-100">Inventory deducts, no extra payable.</p> : null}
                  </div>
                  <div className="flex items-end">
                    <button type="button" className="btn btn-primary w-full py-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={partsLocked || selectedPartOutOfStock || selectedPartInsufficientStock} onClick={addPart}>
                      <PackagePlus className="h-4 w-4" />Add Used Part
                    </button>
                  </div>
                </div>
                {selectedPartOutOfStock || selectedPartInsufficientStock ? <p className="text-xs font-semibold text-rose-100">Not enough available stock</p> : null}
                </form>
              </div>
            ) : (
              <p className="mt-3 text-sm muted">Parts used are read-only for technician accounts. Submit a part request when stock or admin approval is needed.</p>
            )}
          </div>

          <div className={activeTab === 'partRequests' ? detailSectionClass : 'hidden'}>
            <h2 className="text-xl font-black">Part Requests</h2>
            {isTechnician && order.partRequests?.length ? (
              <div className="technician-detail-card-grid mt-4">
                {order.partRequests.map((item) => (
                  <article key={`mobile-request-${item._id || item.createdAt}`} className="technician-detail-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="technician-mobile-card-eyebrow">Part Request</p>
                        <h3 className="technician-mobile-card-title">{item.name}</h3>
                        <p className="technician-mobile-card-muted">Requested {formatDate(item.createdAt)}</p>
                      </div>
                      <PartRequestStatusBadge status={item.status} />
                    </div>
                    <div className="technician-detail-card-metrics">
                      <span><b>{item.quantity}</b><small>Quantity</small></span>
                      <span><b>{item.userId?.name || item.userId?.username || '-'}</b><small>Requested By</small></span>
                    </div>
                    <p className="mt-3 text-sm leading-6 muted">{item.rejectionReason || item.note || 'No request note'}</p>
                    <p className="mt-2 text-xs muted">Awaiting admin review or fulfilment when action is required.</p>
                  </article>
                ))}
              </div>
            ) : null}
            <div className={`mt-4 table-wrap border border-white/10 bg-[var(--surface)] ${isTechnician && order.partRequests?.length ? 'technician-mobile-hidden-table' : ''}`}>
              {order.partRequests?.length ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Requested Part</th>
                      <th>Quantity</th>
                      <th>Requested By</th>
                      <th>Requested On</th>
                      <th>Reason / Note</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--line)]">
                    {order.partRequests.map((item) => (
                      <tr key={item._id || item.createdAt} className="transition-colors hover:bg-white/[0.03]">
                        <td className="font-bold">{item.name}</td>
                        <td>{item.quantity}</td>
                        <td>{item.userId?.name || item.userId?.username || '-'}</td>
                        <td>{formatDate(item.createdAt)}</td>
                        <td className="max-w-[200px] text-sm muted">{item.rejectionReason || item.note || '-'}</td>
                        <td><PartRequestStatusBadge status={item.status} /></td>
                        <td>{renderPartRequestActions(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyState title="No part requests yet." message="Request parts when stock or admin approval is needed." />
              )}
            </div>
            {canCreatePartRequest ? <div className={`${detailPanelClass} mt-4`}>
              <h3 className="text-xs font-black uppercase tracking-wide text-sky-100">Request Part Approval</h3>
              <form className="mt-3 grid gap-3" onSubmit={requestPart}>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="label">Part Type / Source</span>
                    <select className="input py-2" value={partRequest.inventoryPartId} onChange={(event) => {
                      const selected = inventoryParts.find((item) => item.id === event.target.value);
                      setPartRequest((current) => ({ ...current, inventoryPartId: event.target.value, partName: selected?.partName || '' }));
                    }}>
                      <option value="">Manual / Outside Part</option>
                      {inventoryParts.map((item) => <option key={item.id} value={item.id}>{item.partName} - {item.available} available</option>)}
                    </select>
                  </label>
                  {!partRequest.inventoryPartId ? (
                    <label className="grid gap-1.5">
                      <span className="label">Requested Part Name</span>
                      <input className="input py-2" placeholder="Requested part name" value={partRequest.partName} onChange={(event) => setPartRequest((current) => ({ ...current, partName: event.target.value }))} />
                    </label>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1.5">
                    <span className="label">Quantity</span>
                    <input className="input py-2" type="number" min="1" value={partRequest.quantity} onChange={(event) => handlePartRequestQuantityChange(event.target.value)} />
                  </label>
                  <label className="grid gap-1.5">
                    <span className="label">Request Note / Reason</span>
                    <input className="input py-2" placeholder="Request note / reason" value={partRequest.note} onChange={(event) => setPartRequest((current) => ({ ...current, note: event.target.value }))} />
                  </label>
                </div>
                <button type="submit" className="btn btn-primary min-h-11 w-full sm:w-auto"><PackagePlus className="h-4 w-4" />Request Part Approval</button>
              </form>
            </div> : null}
          </div>

          {isAmcLinked ? (
            <div className={activeTab === 'billing' ? detailBillingSectionClass : 'hidden'}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">AMC Contract Summary</p>
                  <h2 className="mt-1 text-xl font-black">{amcContract?.contractId || 'AMC Contract'}</h2>
                  <p className="mt-1 text-sm muted">{amcContract?.contractType || '-'} - {amcContract?.coveredDevices || amcContract?.coveredService || 'Coverage not specified'}</p>
                </div>
                {(amcInvoiceId ? canViewPayments || canRecordPayment : canCreateInvoice) ? (
                  <button type="button" className="btn btn-secondary h-10 px-4" onClick={createAmcInvoiceFromWorkOrder}>
                    <ReceiptText className="h-4 w-4" />{amcInvoiceId ? 'AMC Payments' : 'Create AMC Contract Invoice'}
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                <div className="rounded-xl border border-sky-400/15 bg-sky-500/10 p-4"><p className={detailLabelClass}>Contract Value</p><p className="mt-2 text-xl font-black text-sky-100">{currency(amcContractValue)}</p></div>
                <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/10 p-4 text-emerald-100"><p className={detailLabelClass}>Coverage Type</p><p className="mt-2 text-base font-black">{amcCoverageType}</p></div>
                <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-emerald-100"><p className={detailLabelClass}>Paid</p><p className="mt-2 text-xl font-black">{currency(amcPaidAmount)} / {currency(amcContractValue)}</p></div>
                <div className={`rounded-xl border p-4 ${amcPendingAmount > 0 ? 'border-amber-400/20 bg-amber-500/10 text-amber-100' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'}`}><p className={detailLabelClass}>Pending</p><p className="mt-2 text-xl font-black">{currency(amcPendingAmount)}</p></div>
                <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-4"><p className={detailLabelClass}>Contract Status</p><div className="mt-2"><StatusBadge status={amcContractStatus} /></div></div>
                <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-4"><p className={detailLabelClass}>Payment Status</p><div className="mt-2"><StatusBadge status={amcPaymentStatus} /></div></div>
              </div>
              {amcInvoiceId ? <p className="mt-3 text-xs muted">AMC Invoice: {getInvoiceDisplayId(amcInvoice)}</p> : <p className="mt-3 text-xs font-semibold text-amber-100">AMC invoice is not created yet. Create it from the contract value before collecting AMC payment.</p>}
              {extraInvoiceBalance > 0 ? <p className="mt-2 text-xs font-semibold text-amber-100">Extra Charges Pending: {currency(extraInvoiceBalance)} on the repair invoice.</p> : null}
            </div>
          ) : null}

          {canEditServiceCharge ? <form className={activeTab === 'billing' ? detailBillingSectionClass : 'hidden'} onSubmit={saveServiceCharge}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Service Charge</h2>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-[320px] sm:max-w-[360px]">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black text-cyan-200">₹</span>
                <input className={`${detailNumberInputClass} h-11 w-full rounded-xl pl-8 pr-3 ${detailFocusRing}`} type="number" min="0" step="0.01" value={serviceCharge} onChange={(event) => setServiceCharge(event.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary h-11 w-full px-5 sm:w-auto"><Save className="h-4 w-4" />Save Charge</button>
            </div>
            {savedServiceCharge !== currentServiceCharge ? <p className="mt-2 text-xs font-semibold text-amber-100">Unsaved service charge will update the saved total after saving.</p> : null}
          </form> : null}

          <div className={activeTab === 'billing' ? detailBillingSectionClass : 'hidden'}>
            <h2 className="text-xl font-black">Billing Summary</h2>
            {renderPartsLockNotice()}
            {isAmcLinked ? (
              <div className={`${detailPanelClass} mt-3`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">AMC Coverage Breakdown</p>
                    <h3 className="mt-1 font-black">Coverage Type: <span className="text-emerald-100">{amcCoverageType}</span></h3>
                  </div>
                  <p className="text-2xl font-black text-emerald-300">{currency(extraPayableTotal)}</p>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/10 p-4">
                    <p className={detailLabelClass}>Covered By AMC</p>
                    <div className="mt-3 grid gap-2 text-sm text-emerald-100">
                      {amcBilling.coveredItems.length ? amcBilling.coveredItems.map((item, index) => (
                        <p key={`${item.label}-${index}`} className="font-semibold">✓ {item.label} {item.amount > 0 ? currency(item.amount) : ''}</p>
                      )) : <p className="muted">No charge lines are covered by this AMC type.</p>}
                    </div>
                  </div>
                  <div className="rounded-xl border border-amber-400/15 bg-amber-500/10 p-4">
                    <p className={detailLabelClass}>Chargeable</p>
                    <div className="mt-3 grid gap-2 text-sm text-amber-100">
                      {amcBilling.chargeableItems.length ? amcBilling.chargeableItems.map((item, index) => (
                        <p key={`${item.label}-${index}`} className="font-semibold">• {item.label} {currency(item.amount)}</p>
                      )) : <p className="muted">No extra chargeable items.</p>}
                    </div>
                    <p className="mt-4 text-xs font-black uppercase tracking-wide text-amber-100">Extra Payable: {currency(extraPayableTotal)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-xl border border-sky-400/15 bg-sky-500/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"><p className={detailLabelClass}>Parts Total</p><p className="mt-2 text-xl font-black text-sky-100">{currency(partsTotal)}</p></div>
                <div className="rounded-xl border border-cyan-400/15 bg-cyan-500/10 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"><p className={detailLabelClass}>Service Charge</p><p className="mt-2 text-xl font-black text-cyan-100">{currency(currentServiceCharge)}</p></div>
                <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/[0.12] p-4 text-emerald-50 shadow-[0_0_28px_rgba(16,185,129,0.12)]"><p className={detailLabelClass}>Total Amount</p><p className="mt-2 text-2xl font-black text-emerald-300">{currency(extraPayableTotal)}</p></div>
              </div>
            )}
            <div className={`${detailPanelClass} mt-4`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-black">{isAmcLinked ? 'Extra Charges Invoice Status' : 'Invoice Status'}</h3>
                </div>
                <ReceiptText className="h-5 w-5 text-sky-200" />
              </div>
              {activeExtraInvoices.length ? (
                <div className="mt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-sm font-bold text-slate-100">{getInvoiceDisplayId(primaryExtraInvoice)}</p>
                    {activeExtraInvoices.length > 1 ? <p className="text-xs font-semibold muted">{activeExtraInvoices.length} active extra invoices</p> : null}
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-white/10 bg-[var(--surface)] p-3">
                      <p className={detailLabelClass}>Invoice Status</p>
                      <div className="mt-2"><WorkOrderBadgeGroup><StatusBadge status={primaryExtraInvoice?.status} /></WorkOrderBadgeGroup></div>
                    </div>
                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-emerald-100">
                      <p className={detailLabelClass}>Paid Amount</p>
                      <p className="mt-2 text-lg font-black">{currency(extraInvoicePaidTotal)}</p>
                    </div>
                    <div className={`rounded-xl border p-3 ${extraInvoiceBalance > 0 ? 'border-amber-400/20 bg-amber-500/10 text-amber-100' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'}`}>
                      <p className={detailLabelClass}>Balance Amount</p>
                      <p className="mt-2 text-lg font-black">{currency(extraInvoiceBalance)}</p>
                    </div>
                  </div>
                  {extraInvoiceNeedsRefresh ? (
                    <div className="mt-3 rounded-xl border border-amber-400/25 bg-amber-500/10 p-3 text-amber-100">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                        <div>
                          <p className="text-sm font-black">Extra invoice amount does not match current AMC billing calculation.</p>
                          <p className="mt-1 text-xs font-semibold text-amber-100/85">Invoice history is preserved. Choose the safe action based on payment status.</p>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <div className="rounded-lg border border-white/10 bg-slate-950/25 p-2">
                          <p className={detailLabelClass}>Existing Invoice Amount</p>
                          <p className="mt-1 font-black">{currency(extraInvoiceTotal)}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-slate-950/25 p-2">
                          <p className={detailLabelClass}>Correct Extra Payable</p>
                          <p className="mt-1 font-black">{currency(extraPayableTotal)}</p>
                        </div>
                        <div className="rounded-lg border border-white/10 bg-slate-950/25 p-2">
                          <p className={detailLabelClass}>Difference Amount</p>
                          <p className="mt-1 font-black">{currency(extraInvoiceDifferenceAmount)}</p>
                        </div>
                      </div>
                      {canEditInvoice ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {canVoidRegenerateExtraInvoice ? (
                            <button type="button" className="btn btn-secondary py-2" onClick={(event) => handleExtraInvoiceMismatch('void-regenerate', event)}>
                              Void & Regenerate Extra Invoice
                            </button>
                          ) : null}
                          {canCreateAdjustmentInvoice ? (
                            <button type="button" className="btn btn-primary py-2" onClick={(event) => handleExtraInvoiceMismatch('adjustment', event)}>
                              Create Adjustment Invoice
                            </button>
                          ) : null}
                          {activeExtraInvoicesHavePayment && extraInvoiceDifference <= 0.5 ? (
                            <p className="text-xs font-semibold text-amber-100/85">No positive adjustment invoice is available for this mismatch.</p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {(canViewPayments || canRecordPayment) && (!isAmcLinked || extraPayableTotal > 0) ? <button type="button" className="btn btn-secondary py-2" onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const targetInvoiceId = recordId(paymentTargetExtraInvoice);
                      if (!targetInvoiceId) {
                        alert('Invoice not found. Please generate invoice first.');
                        return;
                      }
                      navigate(`${paymentsBase}?invoiceId=${encodeURIComponent(targetInvoiceId)}`);
                    }}>Go to Payments</button> : null}
                  </div>
                </div>
              ) : canCreateInvoice && (!isAmcLinked || extraPayableTotal > 0) ? (
                <>
                  <button type="button" className="btn btn-primary mt-3 disabled:cursor-not-allowed disabled:opacity-50" disabled={isAmcLinked && extraPayableTotal <= 0} onClick={generateInvoice}><ReceiptText className="h-4 w-4" />{isAmcLinked ? 'Generate Extra Charges Invoice' : 'Generate Invoice'}</button>
                </>
              ) : isAmcLinked && extraPayableTotal <= 0 ? (
                <p className="mt-3 text-sm muted">No extra invoice needed. Covered AMC parts and service do not create customer payable amount.</p>
              ) : <p className="mt-3 text-sm muted">Invoice not generated yet.</p>}
            </div>
          </div>

          <div className={activeTab === 'notes' ? detailSectionClass : 'hidden'}>
            <h2 className="text-xl font-black">Notes</h2>
            {canAddNotes ? <form className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={addNote}>
              <textarea className={`input min-h-[92px] ${detailFocusRing}`} placeholder="Add technician note" value={note} onChange={(event) => setNote(event.target.value)} />
              <div className="flex items-end">
                <button type="submit" className="btn btn-primary min-h-[42px] w-full sm:w-auto">Add Note</button>
              </div>
            </form> : null}
            <div className="mt-4 grid gap-3">{order.notes?.length ? order.notes.map((item) => <div key={item._id || item.createdAt} className="rounded-xl border border-white/10 bg-slate-950/25 p-4"><p className="text-sm leading-6 text-slate-100">{item.text}</p><p className="mt-2 text-xs muted">{item.userId?.name || item.userId?.username || (item.userId ? 'Recorded user' : 'Team')} - {formatDate(item.createdAt)}</p></div>) : <EmptyState title="No notes yet." message="Add diagnosis, customer instruction, or work completion notes." />}</div>
          </div>

          <div className={activeTab === 'photos' ? `${detailSectionClass} work-order-photos-panel photos-tab-header` : 'hidden'}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Photos</h2>
                <p className="mt-1 text-sm muted">Review customer issue photos and upload before-service / after-completion photos.</p>
              </div>
            </div>
            {renderPhotoEvidenceStrip()}
            <div className="photo-gallery-grid mt-4 grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3">
              {renderPhotoSection('Customer Problem Photo', customerProblemPhotos, 'Customer uploaded issue/device photos will appear here.', 'No photo uploaded yet.', 'Photos added by the customer or technician will appear here.')}
              {renderPhotoSection('Before Service Photos', beforeServicePhotos, 'Take photos before repair work starts so Admin can review the device condition.', 'No photo uploaded yet.', 'Upload before-service photos before starting work.')}
              {renderPhotoSection('After Completion Photos', afterServicePhotos, 'Upload completion photos after the work is finished so Admin can verify the result.', 'No photo uploaded yet.', 'Upload completion photos after finishing the job.')}
            </div>
            {showTechnicianPhotoUploads ? <div className="mt-4 grid gap-4 xl:grid-cols-2">
              {renderTechnicianPhotoUpload('before_service', 'Before Service Photo', 'Capture the device condition before repair or service starts.', beforeServiceInputRef)}
              {renderTechnicianPhotoUpload('after_service', 'After Completion Photo', 'Capture the finished repair or completed service result.', afterServiceInputRef)}
            </div> : null}
          </div>
        </div>
        <div className={sideTabs.includes(activeTab) ? 'grid content-start gap-4' : 'hidden'}>
          <div className={activeTab === 'documents' ? detailSectionClass : 'hidden'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black">PDF Workflow</h2>
              {canEditWorkOrder ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold muted">Approval: {order.approvalStatus || 'pending'}</span>
                  <button type="button" className="rounded-xl border border-emerald-300/30 bg-emerald-500/20 px-3 py-1.5 text-sm font-bold text-emerald-50 transition hover:bg-emerald-500/30" onClick={() => handleApproval('approved')}>Approve</button>
                  <button type="button" className="rounded-xl border border-rose-300/30 bg-rose-500/20 px-3 py-1.5 text-sm font-bold text-rose-50 transition hover:bg-rose-500/30" onClick={() => handleApproval('denied')}>Deny</button>
                </div>
              ) : null}
            </div>
            <div className="mt-4 grid gap-3">
              {pdfFlows.map((flow) => {
                const enabled = pdfFlowAllowed(flow);
                const downloading = pdfBusy === `download-${flow.type}`;
                const regenerating = pdfBusy === `regenerate-${flow.type}`;
                const sending = pdfBusy === `send-${flow.type}`;
                const sentViaWhatsapp = isPdfSentViaWhatsapp(order, flow.type);
                return (
                  <div key={flow.type} className={pdfWorkflowCardClass(enabled)}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className={`font-black ${enabled ? 'text-white' : 'text-slate-400'}`}>{flow.title}</h3>
                        <p className="mt-1 text-xs font-semibold muted">Status requirement: {flow.statusText}</p>
                      </div>
                      <FileText className={`h-5 w-5 shrink-0 ${enabled ? 'text-[var(--brand)]' : 'text-slate-600'}`} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex min-h-[1.75rem] items-center rounded-full border px-2.5 py-1 text-xs font-bold ${enabled ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100' : 'border-slate-400/20 bg-slate-600/20 text-slate-200'}`}>
                        {enabled ? 'Ready' : 'Locked'}
                      </span>
                      {sentViaWhatsapp ? <span className="inline-flex min-h-[1.75rem] items-center rounded-full border border-sky-400/25 bg-sky-500/15 px-2.5 py-1 text-xs font-bold text-sky-100">Sent via WhatsApp</span> : null}
                    </div>
                    <p className="mt-2 text-sm muted">{enabled ? flow.readyText : pdfFlowLockedReason(flow)}</p>
                    <div className={`mt-4 grid gap-2 ${isTechnician ? 'sm:grid-cols-3' : 'sm:grid-cols-4'}`}>
                      <button type="button" className={pdfActionButtonClass(enabled)} disabled={!enabled || Boolean(pdfBusy)} onClick={() => previewWorkflowPdf(flow)}><FileText className="h-4 w-4" />Preview PDF</button>
                      <button type="button" className={pdfActionButtonClass(enabled)} disabled={!enabled || Boolean(pdfBusy)} onClick={() => downloadWorkflowPdf(flow)}>{downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Download PDF</button>
                      <button type="button" className={pdfActionButtonClass(enabled)} disabled={!enabled || Boolean(pdfBusy)} onClick={() => downloadWorkflowPdf(flow, true)}>{regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}Regenerate PDF</button>
                      {canSendPdfWhatsapp ? (
                        <button type="button" className={pdfActionButtonClass(enabled, 'primary')} disabled={!enabled || Boolean(pdfBusy)} onClick={() => sendWorkflowPdf(flow)}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send via WhatsApp</button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={activeTab === 'timeline' ? detailSectionClass : 'hidden'}>
            <h2 className="text-xl font-black">Timeline</h2>
            <div className="mt-3 grid gap-0">
              {visibleTimeline.length ? visibleTimeline.map((item, index) => {
                const meta = workOrderTimelineMeta(item);
                const Icon = meta.Icon;
                return (
                  <div key={`${item.synthetic ? 'completion-reversal' : 'timeline'}-${item.createdAt}`} className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-2.5 pb-3 last:pb-0">
                    {index < visibleTimeline.length - 1 ? <span className="absolute bottom-0 left-[1.125rem] top-9 w-px bg-gradient-to-b from-sky-400/30 via-slate-500/20 to-transparent" aria-hidden="true" /> : null}
                    <div className={`relative z-10 flex h-9 w-9 items-center justify-center rounded-full border ${meta.tone}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="rounded-xl border border-white/10 bg-slate-950/25 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex min-h-[1.5rem] items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${meta.tone}`}>{meta.label}</span>
                        {item.status ? <StatusBadge status={item.status} /> : null}
                      </div>
                      <p className="mt-1.5 text-sm leading-5 text-slate-100">{item.message}</p>
                      <p className="mt-1.5 text-xs muted">{item.userId?.name || item.userId?.username ? `${item.userId?.name || item.userId?.username} - ` : ''}{timelineDateTime(item.createdAt)}</p>
                    </div>
                  </div>
                );
              }) : <EmptyState title="No timeline entries yet." message="Status, billing, part, PDF, and note activity will appear here." />}
            </div>
          </div>
        </div>
      </div> : null}

      {canApprovePartRequests && partAction?.type === 'reject' ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4">
          <div className="surface w-full max-w-md p-5">
            <h2 className="text-lg font-black">Reject part request?</h2>
            <p className="mt-2 text-sm leading-6 muted">
              Reject {partAction.name} x{partAction.quantity}? This part cannot be moved to Parts Used.
            </p>
            <textarea className="input mt-4 min-h-24" placeholder="Rejection reason (required)" value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => { setPartAction(null); setRejectReason(''); }}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={runPartRequestAction}>Reject Request</button>
            </div>
          </div>
        </div>
      ) : null}

      {canApprovePartRequests && canManagePartsUsed && partAction?.type === 'move' ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4">
          <div className="surface w-full max-w-md p-5">
            <h2 className="text-lg font-black">Move to Parts Used</h2>
            {isAmcLinked ? (
              <label className="mt-4 block">
                <span className="mb-1 block text-[10px] font-black uppercase tracking-wide muted">Charge Type</span>
                <select className="input" value={normalizeAmcChargeTypeSelectValue(moveToUsedChargeType)} onChange={(event) => setMoveToUsedChargeType(event.target.value)}>
                  {amcChargeTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            ) : null}
            {partAction.inventoryPartId ? (
              <>
                <p className="mt-3 text-sm leading-6">
                  <span className="font-bold">{partAction.name}</span>
                  <span className="muted"> × {partAction.quantity}</span>
                </p>
                <p className="mt-2 text-sm">
                  Unit price (from inventory):{' '}
                  <span className="font-bold">{currency(Number(inventoryParts.find((p) => String(p.id) === String(partAction.inventoryPartId))?.sellingPrice || 0))}</span>
                </p>
                {(() => {
                  const row = inventoryParts.find((p) => String(p.id) === String(partAction.inventoryPartId));
                  const avail = Number(row?.available ?? 0);
                  const qty = Math.max(1, Number(partAction.quantity || 1));
                  const warn = Boolean(row && (avail <= 0 || avail < qty));
                  return (
                    <>
                      <p className="mt-2 text-sm">
                        Available stock: <span className="font-bold">{avail}</span>
                      </p>
                      {warn ? (
                        <p className="mt-2 text-sm font-semibold text-amber-100">
                          {avail <= 0 ? 'No stock on hand.' : `Low stock: only ${avail} available (requested ${qty}).`}
                        </p>
                      ) : null}
                    </>
                  );
                })()}
                <p className="mt-3 text-xs leading-5 muted">Stock will be deducted now when this part moves to Parts Used.</p>
              </>
            ) : (
              <>
                <p className="mt-3 text-sm leading-6">
                  <span className="font-bold">{partAction.name}</span>
                  <span className="muted"> × {partAction.quantity}</span>
                </p>
                <label className="mt-4 block">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-wide muted">Unit price (₹)</span>
                  <input
                    className={detailNumberInputClass}
                    type="number"
                    min="0"
                    step="0.01"
                    value={moveToUsedUnitPrice}
                    onChange={(event) => setMoveToUsedUnitPrice(event.target.value)}
                    placeholder="Required"
                  />
                </label>
                <label className="mt-3 block">
                  <span className="mb-1 block text-[10px] font-black uppercase tracking-wide muted">Note / reason (optional)</span>
                  <textarea
                    className="input min-h-20"
                    value={moveToUsedNote}
                    onChange={(event) => setMoveToUsedNote(event.target.value)}
                    placeholder="Supplier reference, part details, etc."
                  />
                </label>
                {(() => {
                  const trimmed = String(moveToUsedUnitPrice || '').trim();
                  const showZero = trimmed !== '' && Number(trimmed) === 0;
                  return showZero ? (
                  <div className="mt-3 rounded-card border border-amber-500/40 bg-amber-500/10 p-3">
                    <p className="text-sm font-semibold text-amber-100">This part has ₹0 price. Is this a free, warranty, or customer-provided item?</p>
                    <label className="mt-2 block">
                      <span className="mb-1 block text-xs font-bold muted">Confirmation / reason (required)</span>
                      <textarea
                        className="input min-h-20"
                        value={moveToUsedZeroReason}
                        onChange={(event) => setMoveToUsedZeroReason(event.target.value)}
                        placeholder="e.g. Warranty replacement — no charge"
                      />
                    </label>
                  </div>
                  ) : null;
                })()}
                <p className="mt-3 text-xs leading-5 muted">Manual parts do not reduce inventory stock.</p>
              </>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setPartAction(null);
                  setMoveToUsedUnitPrice('');
                  setMoveToUsedChargeType('Chargeable');
                  setMoveToUsedNote('');
                  setMoveToUsedZeroReason('');
                }}
              >
                Cancel
              </button>
              <button type="button" className="btn btn-primary" disabled={partsLocked} onClick={() => runPartRequestAction()}>
                Move to Parts Used
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {canApprovePartRequests && partAction?.type === 'approve' ? (
        <ConfirmModal
          title="Approve part request?"
          message={`Approve ${partAction.name} x${partAction.quantity}? Stock is not deducted until the part is moved to Parts Used.`}
          confirmLabel="Approve"
          onCancel={() => setPartAction(null)}
          onConfirm={runPartRequestAction}
        />
      ) : null}
      {canManagePartsUsed && editPartRow ? (
        <div className="fixed inset-0 z-[95] grid place-items-center bg-black/50 p-4">
          <form className="surface w-full max-w-md p-5" onSubmit={saveEditedPart}>
            <h2 className="text-lg font-black">Edit part</h2>
            <p className="mt-1 text-sm muted">{editPartRow.inventoryPartId ? 'Inventory part' : 'Manual / outside part'}</p>
            {partsLocked ? (
              <p className="mt-3 text-sm font-semibold text-amber-100">{partsLockMessage}</p>
            ) : (
              <div className="mt-4 grid gap-3">
                {!editPartRow.inventoryPartId ? (
                  <label className="grid gap-1.5">
                    <span className="label">Part name</span>
                    <input
                      className="input"
                      value={editPartRow.name || ''}
                      onChange={(event) => setEditPartRow((current) => ({ ...current, name: event.target.value }))}
                    />
                  </label>
                ) : (
                  <p className="text-sm font-bold">{editPartRow.name}</p>
                )}
                <label className="grid gap-1.5">
                  <span className="label">Quantity</span>
                  <input
                    className={detailNumberInputClass}
                    type="number"
                    min="1"
                    value={editPartRow.quantity}
                    onChange={(event) => setEditPartRow((current) => ({ ...current, quantity: event.target.value }))}
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="label">Unit price</span>
                  <input
                    className={detailNumberInputClass}
                    type="number"
                    min="0"
                    step="0.01"
                    value={editPartRow.unitPrice}
                    onChange={(event) => setEditPartRow((current) => ({ ...current, unitPrice: event.target.value }))}
                  />
                </label>
                {isAmcLinked ? (
                  <label className="grid gap-1.5">
                    <span className="label">Charge type</span>
                    <select
                      className="input"
                      value={normalizeAmcChargeTypeSelectValue(editPartRow.chargeType)}
                      onChange={(event) => setEditPartRow((current) => ({ ...current, chargeType: event.target.value }))}
                    >
                      {amcChargeTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </label>
                ) : null}
                <label className="grid gap-1.5">
                  <span className="label">Note (optional)</span>
                  <input
                    className="input"
                    value={editPartRow.note || ''}
                    onChange={(event) => setEditPartRow((current) => ({ ...current, note: event.target.value }))}
                  />
                </label>
                {editPartRow.inventoryPartId ? (
                  <p className="text-xs muted">Quantity changes adjust inventory stock. Price changes affect billing only.</p>
                ) : (
                  <p className="text-xs muted">Manual parts do not reduce inventory stock.</p>
                )}
              </div>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="btn btn-secondary" onClick={() => setEditPartRow(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={partsLocked}>Save</button>
            </div>
          </form>
        </div>
      ) : null}

      {canManagePartsUsed ? renderPartsDuplicateModals() : null}
    </div>
  );
}
