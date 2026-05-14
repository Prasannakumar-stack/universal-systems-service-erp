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
