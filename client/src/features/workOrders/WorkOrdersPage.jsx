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
