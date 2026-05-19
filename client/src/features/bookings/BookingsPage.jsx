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
  workOrderDetailStatuses,
  workOrderPdfFlows,
  workOrderTabs,
  workStatuses,
  Wrench,
  X,
  XAxis,
  YAxis
} from '../../shared/phase1Shared.jsx';

const bookingsFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071426]';
const finalBookingSources = ['Walk-in', 'Call', 'Website'];

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
  if (raw.includes('call') || raw.includes('phone') || raw.includes('whatsapp')) return 'Call';
  if (raw.includes('website') || raw.includes('web') || raw.includes('online')) return 'Website';
  if (raw.includes('walk') || raw.includes('shop') || raw === 'walkin' || raw === 'manual') return 'Walk-in';
  return 'Walk-in';
}

function BookingSourceBadge({ source }) {
  const label = normalizeBookingSource(source);
  const tones = {
    Call: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    'Walk-in': 'border-sky-500/20 bg-sky-500/10 text-sky-300',
    Website: 'border-purple-500/20 bg-purple-500/10 text-purple-300'
  };

  return (
    <span className={`booking-source-badge inline-flex max-w-full items-center justify-center truncate rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${tones[label] || tones['Walk-in']}`} title={label}>
      {label}
    </span>
  );
}

export function BookingsPage({ role = 'admin' }) {
  const { request } = useAuth();
  const { push } = useToast();
  const location = useLocation();
  const isTechnician = role === 'technician';
  const workOrdersBase = isTechnician ? '/tech/work-orders' : '/admin/work-orders';
  const [formOpen, setFormOpen] = useState(false);
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
    if (source) params.set('source', normalizeBookingSource(source));
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
    request('/users?role=technician&active=true&limit=100').then((result) => setTechnicians(result.users.filter((user) => user.role === 'technician' && user.active))).catch(() => {});
  }, [request]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, serviceType, source]);

  useEffect(() => {
    if (customerBookingSeed.open) setFormOpen(true);
  }, [customerBookingSeed.open]);

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
          <div className="relative shrink-0">
            <span className="pointer-events-none absolute inset-0 -m-1 rounded-2xl bg-sky-500/25 blur-md" aria-hidden="true" />
            <button
              type="button"
              className={`relative inline-flex items-center justify-center gap-2 rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-bold text-white shadow-[0_0_20px_rgba(14,165,233,0.28)] transition-all hover:-translate-y-0.5 hover:bg-sky-400 hover:shadow-[0_0_24px_rgba(14,165,233,0.4)] ${bookingsFocusRing}`}
              onClick={() => setFormOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create Booking
            </button>
          </div>
        </div>
      </header>

      <section className="bookings-filter-bar surface border border-white/10 bg-[#0b172a]/60 p-4 shadow-lg backdrop-blur-md">
        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(18rem,1fr)_minmax(9.5rem,0.55fr)_minmax(12rem,0.72fr)_minmax(9.5rem,0.55fr)]">
          <SearchBox value={search} onChange={setSearch} placeholder="Search booking, customer, phone, device, issue" />
          <select className={`input bookings-filter-control ${bookingsFocusRing}`} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            <option>Pending</option>
            <option>Converted</option>
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
          action={(
            <button type="button" className={`btn btn-primary ${bookingsFocusRing}`} onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Booking
            </button>
          )}
        />
      ) : (
        <>
        <div className="bookings-table-shell table-wrap bookings-table-wrap">
          <table className="data-table bookings-table">
            <colgroup>
              <col className="booking-col-booking" style={{ width: '11%' }} />
              <col className="booking-col-customer" style={{ width: '16%' }} />
              <col className="booking-col-source booking-source-column" style={{ width: '8%' }} />
              <col className="booking-col-device" style={{ width: '13%' }} />
              <col className="booking-col-issue" style={{ width: '29%' }} />
              <col className="booking-col-action" style={{ width: isTechnician ? '12%' : '23%', minWidth: isTechnician ? '8rem' : '15rem' }} />
            </colgroup>
          <thead>
            <tr>
              <th>Booking</th>
              <th>Customer</th>
              <th className="booking-source-column">Source</th>
              <th>Device / Service</th>
              <th>Issue</th>
              <th>{isTechnician ? 'Actions' : 'Convert / Open'}</th>
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
                  <span className="booking-source-inline mt-2"><BookingSourceBadge source={booking} /></span>
                </td>
                <td className="booking-source-column">
                  <BookingSourceBadge source={booking} />
                </td>
                <td className="bookings-cell-device">
                  <span className="booking-line-clamp font-bold text-slate-100" title={booking.device || booking.serviceType || 'General Service'}>
                    {booking.device || booking.serviceType || 'General Service'}
                  </span>
                  {booking.serviceType && booking.serviceType !== booking.device ? (
                    <span className="mt-1 block truncate text-xs font-medium text-slate-500" title={booking.serviceType}>{booking.serviceType}</span>
                  ) : null}
                </td>
                <td className="bookings-cell-issue">
                  <span className="booking-line-clamp max-w-full text-sm leading-5 text-slate-300" title={booking.issue || 'No issue captured'}>
                    {booking.issue || 'No issue captured'}
                  </span>
                </td>
                <td className={`bookings-cell-action ${isTechnician ? 'min-w-[8rem]' : 'min-w-[15rem]'}`}>
                  {isTechnician ? (
                    <TechnicianBookingActions booking={booking} workOrdersBase={workOrdersBase} />
                  ) : (
                    <ConvertBooking booking={booking} technicians={technicians} onConvert={convert} workOrdersBase={workOrdersBase} />
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
      {formOpen ? <BookingModal initialCustomer={customerBookingSeed.open ? customerBookingSeed : null} onClose={() => setFormOpen(false)} onSaved={reload} /> : null}
    </div>
  );
}

function TechnicianBookingActions({ booking, workOrdersBase }) {
  const workOrderId = recordId(booking.workOrderId);
  const detailsClass = `btn btn-primary booking-action-button booking-open-job-btn ${workOrderId ? '' : 'pointer-events-none opacity-50'}`;

  return (
    <div className="booking-action-cell">
      <div className="flex flex-wrap items-center justify-center gap-2">
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
    </div>
  );
}

function ConvertBooking({ booking, technicians, onConvert, workOrdersBase = '/admin/work-orders' }) {
  const [technicianId, setTechnicianId] = useState(booking.technicianId?.id || '');
  const focusRing =
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071426]';

  if (booking.status === 'Converted') {
    return (
      <div className="booking-action-cell">
        {booking.workOrderId ? (
          <Link
            className={`btn btn-secondary booking-action-button booking-open-job-btn inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-sky-100 transition-all hover:-translate-y-0.5 hover:border-sky-400/30 hover:bg-white/10 hover:text-white ${focusRing}`}
            style={{ maxWidth: 'none', minWidth: '9.25rem' }}
            to={`${workOrdersBase}/${booking.workOrderId.id || booking.workOrderId}`}
          >
            Open Service Job
          </Link>
        ) : (
          <span className="status-badge booking-action-button justify-center">Converted</span>
        )}
      </div>
    );
  }
  return (
    <div className="booking-convert-controls">
      <select
        className={`input booking-technician-select bookings-filter-control ${focusRing}`}
        style={{ minWidth: '8.75rem', maxWidth: '9.75rem' }}
        value={technicianId}
        onChange={(event) => setTechnicianId(event.target.value)}
      >
        <option value="">Unassigned</option>
        {technicians.map((tech) => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
      </select>
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

function BookingModal({ initialCustomer = null, onClose, onSaved }) {
  const { request } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState(() => ({
    customerName: initialCustomer?.customerName || '',
    phone: initialCustomer?.phone || '',
    address: initialCustomer?.address || '',
    serviceType: serviceTypes[0] || 'PC / Laptop Service',
    device: 'Laptop',
    bookingSource: 'Walk-in',
    issue: ''
  }));
  const [saving, setSaving] = useState(false);
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    if (!initialCustomer) return;
    setForm((current) => ({
      ...current,
      customerName: initialCustomer.customerName || current.customerName,
      phone: initialCustomer.phone || current.phone,
      address: initialCustomer.address || current.address
    }));
  }, [initialCustomer]);

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
              {finalBookingSources.map((item) => <option key={item}>{item}</option>)}
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
