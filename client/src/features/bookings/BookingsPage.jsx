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
  PaginationControls,
  paginationFrom,
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
  useDebouncedValue,
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
  WorkflowTracker,
  WorkOrderPriorityBadge,
  workOrderDetailStatuses,
  workOrderPdfFlows,
  workOrderTabs,
  workStatuses,
  Wrench,
  X,
  XAxis,
  YAxis
} from '../../shared/phase1Shared.jsx';
import { FileImage, ImageUp, UploadCloud } from 'lucide-react';
import { ADMIN_ASSIGNMENT_LABEL } from '../../utils/assignment.js';
import { can, normalizeRole } from '../../utils/roles.js';
import { emitSidebarBadgesUpdated } from '../../utils/sidebarBadges.js';

const bookingsFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071426]';
const finalBookingSources = ['Walk-in', 'Call', 'Website Booking', 'Contact Form', 'WhatsApp', 'Referral'];
const enquiryWorkflowStatuses = ['New Enquiry', 'Contacted', 'Waiting Customer', 'Closed'];
const finalBookingStatuses = ['Pending', 'New Enquiry', 'Contacted', 'Waiting Customer', 'Converted', 'Closed'];
const urgentEnquiryPattern = /\b(urgent|emergency|not working|today|immediately|no power|dead|broken|stopped)\b/i;

function normalizeBookingSource(source) {
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

  if (!raw) return 'Walk-in';
  if (raw.includes('contact form') || raw.includes('enquiry') || raw.includes('inquiry')) return 'Contact Form';
  if (raw.includes('website') || raw.includes('web') || raw.includes('online')) return 'Website Booking';
  if (raw.includes('whatsapp')) return 'WhatsApp';
  if (raw.includes('call') || raw.includes('phone')) return 'Call';
  if (raw.includes('referral')) return 'Referral';
  if (raw.includes('walk') || raw.includes('shop') || raw === 'walkin' || raw === 'manual') return 'Walk-in';
  return 'Walk-in';
}

function bookingSourceQueryValue(source) {
  const label = normalizeBookingSource(source);
  return label === 'Website Booking' ? 'Website' : label;
}

function isContactFormBooking(booking) {
  return normalizeBookingSource(booking) === 'Contact Form';
}

function displayBookingStatus(booking) {
  const status = String(booking?.status || '').trim();
  if (isContactFormBooking(booking) && (!status || status === 'Pending')) return 'New Enquiry';
  return status || 'Pending';
}

function enquiryPriority(booking) {
  const stored = String(booking?.enquiryPriority || booking?.priority || '').trim();
  if (stored === 'Urgent') return 'Urgent';
  const text = `${booking?.issue || ''} ${booking?.device || ''} ${booking?.serviceType || ''}`;
  return isContactFormBooking(booking) && urgentEnquiryPattern.test(text) ? 'Urgent' : 'Normal';
}

function dateTimeLocalValue(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function BookingSourceBadge({ source }) {
  const label = normalizeBookingSource(source);
  const tones = {
    Call: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    'Contact Form': 'border-amber-400/25 bg-amber-400/10 text-amber-200',
    Referral: 'border-fuchsia-400/20 bg-fuchsia-400/10 text-fuchsia-200',
    WhatsApp: 'border-green-400/20 bg-green-400/10 text-green-200',
    'Walk-in': 'border-sky-500/20 bg-sky-500/10 text-sky-300',
    'Website Booking': 'border-purple-500/20 bg-purple-500/10 text-purple-300'
  };

  return (
    <span className={`booking-source-badge inline-flex max-w-full items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${tones[label] || tones['Walk-in']}`} title={label}>
      {label}
    </span>
  );
}

export function BookingsPage({ role = 'admin' }) {
  const { request, user } = useAuth();
  const { push } = useToast();
  const location = useLocation();
  const effectiveRole = user?.role || role;
  const isTechnician = normalizeRole(effectiveRole) === 'technician';
  const permissionSubject = user || effectiveRole;
  const canCreateBooking = can(permissionSubject, 'create_booking');
  const canConvertBooking = can(permissionSubject, 'create_work_order');
  const canAssignTechnician = can(permissionSubject, 'assign_technician');
  const workOrdersBase = isTechnician ? '/app/tech/work-orders' : '/app/admin/work-orders';
  const [formOpen, setFormOpen] = useState(false);
  const [detailsBooking, setDetailsBooking] = useState(null);
  const [detailsSaving, setDetailsSaving] = useState(false);
  const [technicians, setTechnicians] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [source, setSource] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const debouncedSearch = useDebouncedValue(search);
  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (status) params.set('status', status);
    if (serviceType) params.set('serviceType', serviceType);
    if (source) params.set('source', bookingSourceQueryValue(source));
    return `?${params}`;
  }, [debouncedSearch, limit, page, serviceType, source, status]);
  const customerBookingSeed = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      open: params.get('openBooking') === '1',
      customerName: params.get('customerName') || '',
      phone: params.get('phone') || '',
      address: params.get('address') || ''
    };
  }, [location.search]);
  const { data, loading, error, reload } = useResource(() => request(`/bookings${query}`), [request, query]);

  useEffect(() => {
    if (!canAssignTechnician) {
      setTechnicians([]);
      return;
    }
    request('/users?role=technician&active=true&limit=100').then((result) => setTechnicians(result.users.filter((user) => user.role === 'technician' && user.active))).catch(() => {});
  }, [canAssignTechnician, request]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, serviceType, source]);

  useEffect(() => {
    if (customerBookingSeed.open && canCreateBooking) setFormOpen(true);
  }, [canCreateBooking, customerBookingSeed.open]);

  async function copyPhone(phone) {
    if (await copyTextToClipboard(phone)) push('Phone copied');
    else push('Phone not available', 'error');
  }

  async function convert(bookingId, technicianId) {
    if (!canConvertBooking) {
      push('You do not have permission to create work orders', 'error');
      return false;
    }
    try {
      await preserveScroll(async () => {
        await request('/work-orders', { method: 'POST', body: JSON.stringify({ bookingId, technicianId: technicianId || undefined }) });
        push('Booking converted to service job');
        reload({ silent: true });
        emitSidebarBadgesUpdated();
      });
      return true;
    } catch (err) {
      push(err.message, 'error');
      return false;
    }
  }

  async function saveEnquiryDetails(bookingId, payload) {
    setDetailsSaving(true);
    try {
      const result = await request(`/bookings/${bookingId}`, { method: 'PATCH', body: JSON.stringify(payload) });
      const updated = result.booking;
      if (updated) setDetailsBooking(updated);
      push('Enquiry details saved');
      reload({ silent: true });
      return true;
    } catch (err) {
      push(err.message, 'error');
      return false;
    } finally {
      setDetailsSaving(false);
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  const bookings = data?.bookings || data?.data || [];
  const pagination = paginationFrom(data, bookings.length, limit);

  return (
    <div className="bookings-page mx-auto max-w-[1920px] space-y-6">
      <header className="bookings-page-header relative overflow-hidden rounded-3xl border border-white/10 bg-[#0b172a]/80 p-5 shadow-2xl backdrop-blur-xl sm:p-6 lg:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-500/10 via-transparent to-emerald-500/5" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-56 w-56 rounded-full bg-sky-500/10 blur-[80px]" />
        <div className="relative z-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-sky-400/90">{isTechnician ? 'Operations' : 'Admin'}</p>
            <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">Bookings</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-400">
              {isTechnician ? 'Booking intake records with linked service jobs.' : 'Booking intake is kept separate from repair and service jobs. Convert a booking when service work begins.'}
            </p>
          </div>
          {canCreateBooking ? <div className="relative shrink-0">
            <span className="pointer-events-none absolute inset-0 -m-1 rounded-2xl bg-sky-500/25 blur-md" aria-hidden="true" />
            <button
              type="button"
              className={`relative inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(14,165,233,0.28)] transition-all hover:-translate-y-0.5 hover:bg-sky-400 hover:shadow-[0_0_24px_rgba(14,165,233,0.4)] ${bookingsFocusRing}`}
              onClick={() => setFormOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create Booking
            </button>
          </div> : null}
        </div>
      </header>

      <section className="bookings-filter-bar surface border border-white/10 bg-[#0b172a]/60 p-4 shadow-lg backdrop-blur-md">
        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(18rem,1fr)_minmax(9.5rem,0.55fr)_minmax(12rem,0.72fr)_minmax(9.5rem,0.55fr)]">
          <SearchBox value={search} onChange={setSearch} placeholder="Search booking, customer, phone, device, issue" />
          <select className={`input bookings-filter-control ${bookingsFocusRing}`} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {finalBookingStatuses.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className={`input bookings-filter-control ${bookingsFocusRing}`} value={serviceType} onChange={(event) => setServiceType(event.target.value)}>
            <option value="">All service types</option>
            {serviceTypes.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className={`input bookings-filter-control ${bookingsFocusRing}`} value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="">All sources</option>
            {finalBookingSources.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
      </section>
      {!bookings.length ? (
        <EmptyState
          title="No bookings found"
          message="Try changing filters or create a new booking."
          action={canCreateBooking ? (
            <button type="button" className={`btn btn-primary ${bookingsFocusRing}`} onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Booking
            </button>
          ) : null}
        />
      ) : (
        <>
        {isTechnician ? (
          <div className="technician-mobile-card-list bookings-mobile-cards">
            {bookings.map((booking) => (
              <TechnicianBookingMobileCard
                key={booking.id}
                booking={booking}
                workOrdersBase={workOrdersBase}
                onCopyPhone={copyPhone}
              />
            ))}
          </div>
        ) : null}
        <div className={`bookings-table-shell table-wrap bookings-table-wrap ${isTechnician ? 'technician-desktop-table' : ''}`}>
          <table className={`data-table bookings-table ${isTechnician ? 'bookings-table--technician' : 'bookings-table--admin'}`}>
            <colgroup>
              <col className="booking-col-booking" style={{ width: '9%' }} />
              <col className="booking-col-customer" style={{ width: '14%' }} />
              <col className="booking-col-source booking-source-column" style={{ width: '12%' }} />
              <col className="booking-col-device" style={{ width: '12%' }} />
              <col className="booking-col-issue" style={{ width: '20%' }} />
              <col className="booking-col-status" style={{ width: '13%' }} />
              <col className="booking-col-action" style={{ width: isTechnician ? '120px' : '20%' }} />
            </colgroup>
          <thead>
            <tr>
              <th>Booking</th>
              <th>Customer</th>
              <th className="booking-source-column">Source</th>
              <th>Device / Service</th>
              <th>Issue</th>
              <th>Status / Priority</th>
              <th className="bookings-action-header">Actions</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((booking) => (
              <tr key={booking.id} className="bookings-table-row transition-all duration-200 hover:bg-sky-400/[0.065] hover:shadow-[inset_3px_0_0_rgba(56,189,248,0.62),0_10px_28px_rgba(0,8,22,0.12)]">
                <td className="bookings-cell-booking">
                  <span className="block truncate font-bold text-slate-100" title={booking.bookingCode}>{booking.bookingCode}</span>
                  <span className="mt-1 block text-xs font-medium text-slate-500">{formatDate(booking.createdAt)}</span>
                </td>
                <td className="bookings-cell-customer">
                  <span className="block truncate font-bold text-slate-100" title={booking.customerName || 'Customer'}>{booking.customerName || 'Customer'}</span>
                  <span className="mt-1 block truncate text-xs font-medium text-slate-500" title={`Phone: ${booking.phone || '-'}`}>Phone: {booking.phone || '-'}</span>
                  {booking.duplicateInfo?.hasDuplicate ? <span className="mt-2 inline-flex rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-200">Duplicate</span> : null}
                  <span className="booking-source-inline mt-2"><BookingSourceBadge source={booking} /></span>
                </td>
                <td className="booking-source-column">
                  <BookingSourceBadge source={booking} />
                </td>
                <td className="bookings-cell-device">
                  <span className="booking-line-clamp font-bold text-slate-100" title={booking.device || booking.serviceType || 'General Service'}>
                    {booking.device || booking.serviceType || 'General Service'}
                  </span>
                  {bookingDeviceBrandModel(booking) ? (
                    <span className="mt-1 block truncate text-xs font-semibold text-slate-300" title={bookingDeviceBrandModel(booking)}>{bookingDeviceBrandModel(booking)}</span>
                  ) : null}
                  {booking.serviceType && booking.serviceType !== booking.device ? (
                    <span className="mt-1 block truncate text-xs font-medium text-slate-500" title={booking.serviceType}>{booking.serviceType}</span>
                  ) : null}
                </td>
                <td className="bookings-cell-issue">
                  <span className="booking-line-clamp max-w-full text-sm leading-5 text-slate-300" title={booking.issue || 'No issue captured'}>
                    {booking.issue || 'No issue captured'}
                  </span>
                  {booking.followUpAt || booking.followUpReminder ? (
                    <span className="mt-2 inline-flex max-w-full truncate rounded-full border border-sky-400/20 bg-sky-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-sky-200" title={booking.followUpReminder || formatDate(booking.followUpAt)}>
                      Follow-up set
                    </span>
                  ) : null}
                </td>
                <td className="bookings-cell-status">
                  <div className="flex flex-col gap-2">
                    <EnquiryStatusBadge status={displayBookingStatus(booking)} />
                    {isContactFormBooking(booking) && enquiryPriority(booking) === 'Urgent' ? <EnquiryPriorityBadge priority="Urgent" /> : null}
                  </div>
                </td>
                <td className={`bookings-cell-action ${isTechnician ? 'min-w-[120px]' : ''}`}>
                  {isTechnician ? (
                    <TechnicianBookingActions booking={booking} workOrdersBase={workOrdersBase} />
                  ) : (
                    <div className="booking-action-cell booking-action-cell--stacked">
                      <button type="button" className={`btn btn-secondary booking-action-button booking-view-details-btn ${bookingsFocusRing}`} onClick={() => setDetailsBooking(booking)}>
                        View Details
                      </button>
                      <ConvertBooking booking={booking} technicians={technicians} onConvert={convert} workOrdersBase={workOrdersBase} canConvert={canConvertBooking} canAssignTechnician={canAssignTechnician} />
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
        <div className="bookings-pagination-shell w-full">
          <PaginationControls pagination={pagination} onPageChange={setPage} />
        </div>
        </>
      )}
      {detailsBooking ? (
        <EnquiryDetailsDrawer
          booking={detailsBooking}
          technicians={technicians}
          workOrdersBase={workOrdersBase}
          canConvert={canConvertBooking}
          canAssignTechnician={canAssignTechnician}
          saving={detailsSaving}
          onClose={() => setDetailsBooking(null)}
          onSave={saveEnquiryDetails}
          onConvert={convert}
        />
      ) : null}
      {canCreateBooking && formOpen ? <BookingModal initialCustomer={customerBookingSeed.open ? customerBookingSeed : null} onClose={() => setFormOpen(false)} onSaved={reload} /> : null}
    </div>
  );
}

function EnquiryStatusBadge({ status }) {
  const label = status || 'Pending';
  const tones = {
    'New Enquiry': 'border-sky-400/25 bg-sky-500/10 text-sky-200',
    Contacted: 'border-emerald-400/25 bg-emerald-500/10 text-emerald-200',
    'Waiting Customer': 'border-amber-400/25 bg-amber-500/10 text-amber-200',
    Converted: 'border-green-400/25 bg-green-500/10 text-green-200',
    Closed: 'border-slate-400/20 bg-slate-500/10 text-slate-300',
    Pending: 'border-slate-400/20 bg-slate-500/10 text-slate-300'
  };
  return (
    <span className={`inline-flex w-fit items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${tones[label] || tones.Pending}`}>
      {label}
    </span>
  );
}

function EnquiryPriorityBadge({ priority }) {
  const urgent = priority === 'Urgent';
  return (
    <span className={`inline-flex w-fit items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${urgent ? 'border-rose-400/25 bg-rose-500/10 text-rose-200' : 'border-cyan-400/20 bg-cyan-500/10 text-cyan-200'}`}>
      {urgent ? 'Urgent' : 'Normal'}
    </span>
  );
}

function DetailPill({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-slate-100">{value || '-'}</p>
    </div>
  );
}

function bookingDeviceBrandModel(booking = {}) {
  return [booking.deviceBrand, booking.deviceModel].map((value) => String(value || '').trim()).filter(Boolean).join(' ');
}

function EnquiryDetailsDrawer({ booking, technicians, workOrdersBase, canConvert, canAssignTechnician, saving, onClose, onSave, onConvert }) {
  const [form, setForm] = useState(() => ({
    status: displayBookingStatus(booking),
    adminNote: booking.adminNote || '',
    followUpReminder: booking.followUpReminder || '',
    followUpAt: dateTimeLocalValue(booking.followUpAt)
  }));
  const [technicianId, setTechnicianId] = useState(booking.technicianId?.id || '');
  const isContact = isContactFormBooking(booking);
  const workOrderId = recordId(booking.workOrderId);
  const currentStatus = displayBookingStatus(booking);
  const isConverted = currentStatus === 'Converted' || Boolean(workOrderId);
  const priority = enquiryPriority(booking);
  const detailTypeLabel = isContact ? 'Enquiry Details' : 'Booking Details';
  const showUrgentPriority = priority === 'Urgent';

  useEffect(() => {
    setForm({
      status: displayBookingStatus(booking),
      adminNote: booking.adminNote || '',
      followUpReminder: booking.followUpReminder || '',
      followUpAt: dateTimeLocalValue(booking.followUpAt)
    });
    setTechnicianId(booking.technicianId?.id || '');
  }, [booking]);

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  async function submit(event) {
    event.preventDefault();
    await onSave(booking.id, form);
  }

  async function convertFromDrawer() {
    const converted = await onConvert(booking.id, technicianId);
    if (converted) onClose();
  }

  return (
    <div className="fixed inset-0 z-[90] flex justify-end bg-black/55 p-3 backdrop-blur-sm sm:p-5" role="presentation" onClick={onClose}>
      <aside
        className="booking-enquiry-drawer surface flex h-full w-full max-w-3xl flex-col overflow-hidden border border-white/10 bg-[#081426]/95 shadow-[0_28px_90px_rgba(0,0,0,0.5)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-enquiry-details-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="booking-enquiry-drawer-header flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-sky-300/90">{detailTypeLabel}</p>
            <h2 id="booking-enquiry-details-title" className="mt-1 truncate text-2xl font-black text-white">{booking.customerName || 'Customer'}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <BookingSourceBadge source={booking} />
              <EnquiryStatusBadge status={currentStatus} />
              {showUrgentPriority ? <EnquiryPriorityBadge priority="Urgent" /> : null}
            </div>
          </div>
          <button type="button" className="icon-button h-10 w-10 shrink-0" onClick={onClose} aria-label="Close enquiry details">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={submit}>
          <div className="booking-enquiry-drawer-body min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <DetailPill label="Booking / Enquiry ID" value={booking.bookingCode || booking.id} />
              <DetailPill label="Phone number" value={booking.phone || '-'} />
              <DetailPill label="Service interest" value={booking.serviceType || booking.device || 'General Service'} />
              <DetailPill label="Created" value={formatDate(booking.createdAt)} />
              <DetailPill label="Device / Asset" value={booking.device || '-'} />
              <DetailPill label="Device Brand" value={booking.deviceBrand || 'Not specified'} />
              <DetailPill label="Device Model" value={booking.deviceModel || 'Not specified'} />
            </div>

            <section className="booking-message-card rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <p className="booking-modal-label">Full message</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-100">{booking.issue || 'No message captured.'}</p>
            </section>

            {booking.duplicateInfo?.hasDuplicate ? (
              <div className="booking-duplicate-card rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-amber-100">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-black">Existing customer/enquiry found.</p>
                    <div className="mt-2 grid gap-1.5">
                      {(booking.duplicateInfo.matches || []).map((match, index) => (
                        <p key={`${match.type}-${match.label}-${index}`} className="rounded-xl border border-amber-300/15 bg-black/10 px-3 py-2 text-xs font-semibold text-amber-50/90">
                          {match.type}: {match.label}{match.reference ? ` - ${match.reference}` : ''}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {isContact && !isConverted ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="booking-modal-field">
                    <span className="booking-modal-label">Enquiry status</span>
                    <select className={`input booking-modal-control ${bookingsFocusRing}`} value={form.status} onChange={(event) => update('status', event.target.value)}>
                      {enquiryWorkflowStatuses.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="booking-modal-field">
                    <span className="booking-modal-label">Follow-up date/time</span>
                    <input className={`input booking-modal-control ${bookingsFocusRing}`} type="datetime-local" value={form.followUpAt} onChange={(event) => update('followUpAt', event.target.value)} />
                  </label>
                </div>
                <label className="booking-modal-field">
                  <span className="booking-modal-label">Follow-up reminder</span>
                  <input className={`input booking-modal-control ${bookingsFocusRing}`} value={form.followUpReminder} onChange={(event) => update('followUpReminder', event.target.value)} placeholder="Follow up with customer tomorrow." />
                </label>
                <label className="booking-modal-field">
                  <span className="booking-modal-label">Admin notes</span>
                  <textarea className={`input booking-modal-control booking-modal-textarea ${bookingsFocusRing}`} value={form.adminNote} onChange={(event) => update('adminNote', event.target.value)} placeholder="Customer asked for pricing. Follow up with customer tomorrow." />
                </label>
              </>
            ) : isContact && isConverted ? (
              <section className="rounded-2xl border border-emerald-400/20 bg-emerald-500/[0.08] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="booking-modal-label">Converted enquiry</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-emerald-100/90">This Contact Form enquiry is linked to a service job. Conversion controls are locked to protect the service record.</p>
                  </div>
                  <EnquiryStatusBadge status="Converted" />
                </div>
                {booking.adminNote || booking.followUpReminder || booking.followUpAt ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <DetailPill label="Follow-up" value={booking.followUpReminder || formatDate(booking.followUpAt)} />
                    <DetailPill label="Admin notes" value={booking.adminNote || '-'} />
                  </div>
                ) : null}
              </section>
            ) : (
              <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="booking-modal-label">Booking status</p>
                <div className="mt-2"><EnquiryStatusBadge status={currentStatus} /></div>
              </section>
            )}
          </div>

          <div className="booking-enquiry-drawer-footer border-t border-white/10 p-5">
            {!isConverted && canAssignTechnician && canConvert ? (
              <label className="booking-modal-field mb-3">
                <span className="booking-modal-label">Assign technician on convert</span>
                <select className={`input booking-modal-control ${bookingsFocusRing}`} value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}>
                  <option value="">{ADMIN_ASSIGNMENT_LABEL}</option>
                  {technicians.map((tech) => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
                </select>
              </label>
            ) : null}
            <div className="booking-modal-footer-actions">
              {isConverted ? (
                <>
                  {workOrderId ? <Link className="btn btn-primary booking-modal-action" to={`${workOrdersBase}/${workOrderId}`}>Open Service Job</Link> : null}
                  <button type="button" className="btn btn-secondary booking-modal-action" onClick={onClose}>Close</button>
                </>
              ) : isContact ? (
                <>
                  <button type="submit" className="btn btn-secondary booking-modal-action" disabled={saving}>
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving...' : 'Save Enquiry'}
                  </button>
                  {canConvert ? (
                    <button type="button" className="btn btn-primary booking-modal-action" onClick={convertFromDrawer}>
                      Convert
                    </button>
                  ) : null}
                  <button type="button" className="btn btn-secondary booking-modal-action" onClick={onClose}>Close</button>
                </>
              ) : (
                <>
                  {canConvert ? (
                    <button type="button" className="btn btn-primary booking-modal-action" onClick={convertFromDrawer}>
                      Convert
                    </button>
                  ) : null}
                  <button type="button" className="btn btn-secondary booking-modal-action" onClick={onClose}>Close</button>
                </>
              )}
            </div>
          </div>
        </form>
      </aside>
    </div>
  );
}

function TechnicianBookingActions({ booking, workOrdersBase }) {
  const workOrderId = recordId(booking.workOrderId);
  const detailsClass = `btn btn-primary booking-action-button booking-details-btn ${workOrderId ? '' : 'pointer-events-none opacity-50'}`;

  return (
    <div className="booking-action-cell">
      {workOrderId ? (
        <Link className={detailsClass} to={`${workOrdersBase}/${workOrderId}`}>
          Details
        </Link>
      ) : (
        <span className={detailsClass} aria-disabled="true">
          Details
        </span>
      )}
    </div>
  );
}

function TechnicianBookingMobileCard({ booking, workOrdersBase, onCopyPhone }) {
  const linkedJob = booking.workOrderId && typeof booking.workOrderId === 'object' ? booking.workOrderId : null;
  const workOrderId = recordId(booking.workOrderId);
  const phone = booking.phone || linkedJob?.customerId?.phone || '';
  const status = linkedJob?.status || booking.status || 'Pending';
  const priority = jobPriority(linkedJob || booking);
  const service = linkedJob?.serviceType || linkedJob?.service || booking.serviceType || 'Service Job';
  const device = linkedJob?.device || booking.device || service;
  const issue = linkedJob?.issue || booking.issue || 'No issue captured';
  const displayId = linkedJob ? getWorkOrderDisplayId(linkedJob) : (booking.bookingCode || 'Booking');

  return (
    <article className="technician-mobile-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="technician-mobile-card-eyebrow">{displayId}</p>
          <h2 className="technician-mobile-card-title" title={booking.customerName || 'Customer'}>{booking.customerName || 'Customer'}</h2>
          <p className="technician-mobile-card-muted">Phone: {phone || '-'}</p>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="technician-mobile-card-body">
        <div>
          <span>Service / Device</span>
          <b>{service}{device && device !== service ? ` / ${device}` : ''}</b>
        </div>
        <div>
          <span>Problem</span>
          <p>{issue}</p>
        </div>
      </div>
      <div className="technician-mobile-meta-row">
        <BookingSourceBadge source={booking} />
        {priority ? <WorkOrderPriorityBadge priority={priority} /> : null}
        <span>{formatDate(linkedJob?.createdAt || booking.createdAt)}</span>
      </div>
      <div className="technician-mobile-contact-row">
        <a className={`btn btn-secondary ${phone ? '' : 'pointer-events-none opacity-50'}`} href={callHref(phone)}><PhoneCallIcon className="h-4 w-4" />Call</a>
        <a className={`btn btn-secondary ${phone ? '' : 'pointer-events-none opacity-50'}`} href={phone ? customerWhatsAppHref({ name: booking.customerName, phone }) : '#'} target="_blank" rel="noreferrer"><Send className="h-4 w-4" />WhatsApp</a>
        <button type="button" className={`btn btn-secondary ${phone ? '' : 'pointer-events-none opacity-50'}`} onClick={() => onCopyPhone(phone)}><ClipboardList className="h-4 w-4" />Copy</button>
      </div>
      <div className="technician-mobile-card-footer">
        {workOrderId ? (
          <Link className="btn btn-primary" to={`${workOrdersBase}/${workOrderId}`}>Details</Link>
        ) : (
          <span className="btn btn-primary pointer-events-none opacity-50" aria-disabled="true">Details</span>
        )}
      </div>
    </article>
  );
}

function ConvertBooking({ booking, technicians, onConvert, workOrdersBase = '/app/admin/work-orders', canConvert = false, canAssignTechnician = false }) {
  const [technicianId, setTechnicianId] = useState(booking.technicianId?.id || '');
  const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071426]';
  const workOrderId = recordId(booking.workOrderId);

  if (displayBookingStatus(booking) === 'Converted' || workOrderId) {
    return (
      <div className="booking-action-cell">
        {workOrderId ? (
          <Link
            className={`btn btn-secondary booking-action-button booking-open-job-btn inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-sky-100 transition-all hover:-translate-y-0.5 hover:border-sky-400/30 hover:bg-white/10 hover:text-white ${focusRing}`}
            style={{ maxWidth: 'none', minWidth: '9.25rem' }}
            to={`${workOrdersBase}/${workOrderId}`}
          >
            Open Service Job
          </Link>
        ) : (
          <span className="status-badge booking-action-button justify-center">Converted</span>
        )}
      </div>
    );
  }
  if (!canConvert) {
    return <span className="text-xs font-semibold text-slate-500">Pending conversion</span>;
  }
  return (
    <div className="booking-convert-controls">
      {canAssignTechnician ? (
        <select
          className={`input booking-technician-select bookings-filter-control ${focusRing}`}
          value={technicianId}
          onChange={(event) => setTechnicianId(event.target.value)}
        >
          {/* Admin maps to an empty technicianId so old unassigned records stay compatible. */}
          <option value="">{ADMIN_ASSIGNMENT_LABEL}</option>
          {technicians.map((tech) => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
        </select>
      ) : null}
      <button
        type="button"
        className={`btn btn-primary booking-action-button booking-convert-btn ${focusRing}`}
        onClick={() => onConvert(booking.id, technicianId)}
      >
        Convert
      </button>
    </div>
  );
}

export function BookingModal({ initialCustomer = null, onClose, onSaved }) {
  const { request } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState(() => ({
    customerName: initialCustomer?.customerName || '',
    phone: initialCustomer?.phone || '',
    address: initialCustomer?.address || '',
    serviceType: serviceTypes[0] || 'PC / Laptop Service',
    device: 'Laptop',
    deviceBrand: '',
    deviceModel: '',
    bookingSource: 'Walk-in',
    issue: ''
  }));
  const [deviceImage, setDeviceImage] = useState(null);
  const [deviceImagePreview, setDeviceImagePreview] = useState('');
  const [saving, setSaving] = useState(false);
  const deviceImageInputRef = useRef(null);
  const deviceImagePreviewRef = useRef('');
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  function resetDeviceImage() {
    if (deviceImagePreviewRef.current) {
      URL.revokeObjectURL(deviceImagePreviewRef.current);
      deviceImagePreviewRef.current = '';
    }
    setDeviceImage(null);
    setDeviceImagePreview('');
    if (deviceImageInputRef.current) deviceImageInputRef.current.value = '';
  }

  function resetBookingExtras() {
    setForm((current) => ({ ...current, deviceBrand: '', deviceModel: '' }));
    resetDeviceImage();
  }

  function closeModal() {
    resetBookingExtras();
    onClose();
  }

  function chooseDeviceImage(file) {
    if (!file) return;
    if (file.type && !file.type.startsWith('image/')) {
      push('Please select an image file', 'error');
      return;
    }
    if (deviceImagePreviewRef.current) URL.revokeObjectURL(deviceImagePreviewRef.current);
    const nextPreview = URL.createObjectURL(file);
    deviceImagePreviewRef.current = nextPreview;
    setDeviceImage(file);
    setDeviceImagePreview(nextPreview);
  }

  useEffect(() => {
    if (!initialCustomer) return;
    setForm((current) => ({
      ...current,
      customerName: initialCustomer.customerName || current.customerName,
      phone: initialCustomer.phone || current.phone,
      address: initialCustomer.address || current.address
    }));
  }, [initialCustomer]);

  useEffect(() => () => {
    if (deviceImagePreviewRef.current) URL.revokeObjectURL(deviceImagePreviewRef.current);
  }, []);

  async function submit(event) {
    event.preventDefault();
    if (!form.deviceBrand.trim()) {
      push('Device brand is required.', 'error');
      return;
    }
    setSaving(true);
    try {
      await request('/bookings', { method: 'POST', body: JSON.stringify(form) });
      push('Booking created');
      resetBookingExtras();
      emitSidebarBadgesUpdated();
      onSaved();
      onClose();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="booking-modal-overlay">
      <form className="booking-modal-shell" onSubmit={submit}>
        <div className="booking-modal-header">
          <div className="min-w-0">
            <p className="booking-modal-eyebrow">New intake</p>
            <h2>Create Booking</h2>
            <p>Capture customer, device, and service details.</p>
          </div>
          <button type="button" className="booking-modal-close" onClick={closeModal} aria-label="Close booking modal"><X className="h-4 w-4" /></button>
        </div>
        <div className="booking-modal-body">
          <label className="booking-modal-field">
            <span className="booking-modal-label">Customer name</span>
            <input className="input booking-modal-control" value={form.customerName} onChange={(event) => update('customerName', event.target.value)} required />
          </label>
          <label className="booking-modal-field">
            <span className="booking-modal-label">Phone</span>
            <input className="input booking-modal-control" value={form.phone} onChange={(event) => update('phone', event.target.value)} required />
          </label>
          <label className="booking-modal-field">
            <span className="booking-modal-label">Service Type</span>
            <select className="input booking-modal-control" value={form.serviceType} onChange={(event) => update('serviceType', event.target.value)}>
              {serviceTypes.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="booking-modal-field">
            <span className="booking-modal-label">Device / Asset</span>
            <select className="input booking-modal-control" value={form.device} onChange={(event) => update('device', event.target.value)}>
              {deviceTypes.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="booking-modal-field">
            <span className="booking-modal-label">Device Brand <span className="amc-required">Required</span></span>
            <input className="input booking-modal-control" value={form.deviceBrand} onChange={(event) => update('deviceBrand', event.target.value)} maxLength={80} placeholder="Dell, HP, Lenovo, Epson, Hikvision..." required />
          </label>
          <label className="booking-modal-field">
            <span className="booking-modal-label">Device Model</span>
            <input className="input booking-modal-control" value={form.deviceModel} onChange={(event) => update('deviceModel', event.target.value)} maxLength={80} placeholder="Inspiron 3511, LaserJet 1020, DS-2CE16D0..." />
          </label>
          <label className="booking-modal-field">
            <span className="booking-modal-label">Booking Source</span>
            <select className="input booking-modal-control" value={form.bookingSource} onChange={(event) => update('bookingSource', event.target.value)}>
              {finalBookingSources.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label className="booking-modal-field sm:col-span-2">
            <span className="booking-modal-label">Address</span>
            <textarea className="input booking-modal-control booking-modal-textarea" value={form.address} onChange={(event) => update('address', event.target.value)} />
          </label>
          <label className="booking-modal-field sm:col-span-2">
            <span className="booking-modal-label">Issue / Requirement</span>
            <textarea className="input booking-modal-control booking-modal-textarea" value={form.issue} onChange={(event) => update('issue', event.target.value)} required />
          </label>
          <div className="booking-modal-upload-field sm:col-span-2">
            <span className="booking-modal-label">Device Image / Photo upload</span>
            <button
              type="button"
              className={`booking-modal-upload ${deviceImagePreview ? 'booking-modal-upload-active' : ''}`}
              onClick={() => deviceImageInputRef.current?.click()}
            >
              {deviceImagePreview ? (
                <span className="booking-modal-upload-preview">
                  <img src={deviceImagePreview} alt="Selected device preview" />
                  <span>
                    <b><FileImage className="h-4 w-4" />{deviceImage?.name || 'Selected image'}</b>
                    <small>Preview only. This image is not saved with the booking yet.</small>
                  </span>
                </span>
              ) : (
                <span className="booking-modal-upload-empty">
                  <span className="booking-modal-upload-icon"><UploadCloud className="h-5 w-5" /></span>
                  <span>
                    <b>Upload device photo</b>
                    <small>Optional image preview for intake reference</small>
                  </span>
                  <ImageUp className="booking-modal-upload-action h-4 w-4" />
                </span>
              )}
            </button>
            <input
              ref={deviceImageInputRef}
              className="sr-only"
              type="file"
              accept="image/*"
              onChange={(event) => chooseDeviceImage(event.target.files?.[0])}
            />
            {deviceImagePreview ? (
              <button type="button" className="booking-modal-remove-image" onClick={resetDeviceImage}>
                <Trash2 className="h-3.5 w-3.5" />
                Remove image
              </button>
            ) : null}
          </div>
        </div>
        <div className="booking-modal-footer">
          <button type="button" className="btn btn-secondary booking-modal-cancel" onClick={closeModal}>Cancel</button>
          <button type="submit" className="btn btn-primary booking-modal-save" disabled={saving}><Save className="h-4 w-4" />Save</button>
        </div>
      </form>
    </div>
  );
}
