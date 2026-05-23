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
  customerSearchText,
  getCustomerDisplayId,
  getWorkOrderDisplayId,
  getPdfLabel,
  matchesDisplaySearch,
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
import { can, normalizeRole } from '../../utils/roles.js';

export function CustomersPage({ role = 'admin' }) {
  const { request, user } = useAuth();
  const effectiveRole = user?.role || role;
  const isTechnician = normalizeRole(effectiveRole) === 'technician';
  const base = isTechnician ? '/tech' : '/admin';
  const permissionSubject = user || effectiveRole;
  const canCreateBooking = can(permissionSubject, 'create_booking');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerType, setCustomerType] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const debouncedSearch = useDebouncedValue(search);
  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return params.toString() ? `?${params}` : '';
  }, [dateFrom, dateTo, debouncedSearch, limit, page]);
  const { data, loading, error } = useResource(async () => {
    const customers = await request(`/customers${query}`);
    return {
      customers: customers.customers || customers.data || [],
      workOrders: customers.workOrders || [],
      invoices: customers.invoices || [],
      pagination: customers.pagination
    };
  }, [request, query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, dateFrom, dateTo, customerType]);

  const customers = data?.customers || [];
  const workOrders = data?.workOrders || [];
  const invoices = data?.invoices || [];
  const hasActiveFilters = Boolean(search || dateFrom || dateTo || customerType);
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
  const formatListDate = (value) => {
    if (!value) return 'Not available';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Not available';
    return formatDate(value);
  };
  const visibleCustomers = customers.filter((customer) => {
    const metrics = metricsByCustomer.get(recordId(customer)) || { jobs: [], invoices: [] };
    if (customerType && customerTypeLabel(customer) !== customerType) return false;
    const searchText = debouncedSearch.trim().toLowerCase();
    if (!searchText) return true;
    return matchesDisplaySearch(searchText, customerSearchText(customer, metrics));
  });

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;
  const pagination = paginationFrom(data, visibleCustomers.length, limit);

  return (
    <>
      <PageHeader title="Customers" eyebrow="CRM">Manage customer profiles, service history, devices, invoices, and payments.</PageHeader>
      <div className="surface customers-filter-panel mb-5 p-4">
        <div className="customers-filter-row">
          <div className="customers-search-control min-w-0">
            <SearchBox value={search} onChange={setSearch} placeholder="Search customer ID, name, phone, work order, invoice, payment" />
          </div>
          <div className="customers-date-filter-group">
            <label className="date-input-shell relative block">
              <span className="date-input-icon pointer-events-none muted" aria-hidden="true">
                <CalendarClock className="h-4 w-4" />
              </span>
              <input className="input pl-10" type="date" aria-label="Start date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
            </label>
            <label className="date-input-shell relative block">
              <span className="date-input-icon pointer-events-none muted" aria-hidden="true">
                <CalendarClock className="h-4 w-4" />
              </span>
              <input className="input pl-10" type="date" aria-label="End date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
            </label>
            <button
              className="btn customers-clear-filter-button h-10 shrink-0 border border-white/10 bg-white/[0.045] px-3.5 text-xs font-black text-sky-100 shadow-[0_0_18px_rgba(56,189,248,0.08)] hover:border-sky-300/35 hover:bg-sky-400/10 hover:text-white"
              type="button"
              aria-label="Clear filters"
              title="Clear filters"
              data-active={hasActiveFilters ? 'true' : 'false'}
              onClick={() => {
                setSearch('');
                setCustomerType('');
                setDateFrom('');
                setDateTo('');
              }}
            >
              <X className="h-3.5 w-3.5" />
              Clear Filter
            </button>
          </div>
        </div>
        {hasCustomerTypes ? (
          <select className="input customers-type-filter-control" value={customerType} onChange={(event) => setCustomerType(event.target.value)}>
            <option value="">All customer types</option>
            {['Individual', 'Business', 'AMC Customer'].map((item) => <option key={item}>{item}</option>)}
          </select>
        ) : null}
      </div>
      {!visibleCustomers.length ? <EmptyState title="No customers found" message="Customer records matching your filters will appear here." action={canCreateBooking ? <Link className="btn btn-primary" to={`${base}/bookings`}>Create Booking</Link> : null} /> : (
        <>
        {isTechnician ? (
          <div className="technician-mobile-card-list customers-mobile-cards">
            {visibleCustomers.map((customer) => {
              const metrics = metricsByCustomer.get(recordId(customer)) || { jobs: [], invoices: [] };
              const devices = [...new Set([...(customer.devices || []), ...metrics.jobs.map((order) => order.device).filter(Boolean)])];
              return (
                <TechnicianCustomerMobileCard
                  key={customer.id}
                  customer={customer}
                  metrics={metrics}
                  devices={devices}
                  base={base}
                />
              );
            })}
          </div>
        ) : null}
        <div className={`table-wrap bg-[var(--surface)] xl:overflow-x-visible ${isTechnician ? 'technician-desktop-table' : ''}`}>
          <table className="data-table min-w-[900px] table-fixed xl:min-w-0">
            <colgroup>
              <col className="w-[27%]" />
              <col className="w-[19%]" />
              <col className="w-[9%]" />
              <col className="w-[12%]" />
              <col className="w-[11%]" />
              <col className="w-[10%]" />
              <col className="w-[12%]" />
            </colgroup>
          <thead><tr><th>Customer</th><th>Device / Service</th><th>{isTechnician ? 'Assigned / Attended Jobs' : 'Jobs'}</th><th>Balance</th><th>Spent</th><th>Created</th><th className="text-center">Action</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {visibleCustomers.map((customer) => {
              const metrics = metricsByCustomer.get(recordId(customer)) || { jobs: [], invoices: [] };
              const activeJobs = metrics.jobs.filter(isActiveJob);
              const pendingBalance = metrics.invoices.reduce((sum, invoice) => sum + Number(invoice.balance || 0), 0);
              const totalSpent = metrics.invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount || 0), 0);
              const devices = [...new Set([...(customer.devices || []), ...metrics.jobs.map((order) => order.device).filter(Boolean)])];
              const initials = String(customer.name || '?')
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join('')
                .toUpperCase();
              return (
                <tr key={customer.id}>
                  <td>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[var(--brand)]/25 bg-[rgba(117,196,255,0.12)] text-xs font-black text-[var(--brand)]">
                        {initials}
                      </span>
                      <div className="min-w-0">
                        <Link className="block truncate font-black text-sky-100 hover:text-[var(--brand)]" to={`${base}/customers/${customer.id}`}>
                          {customer.name || 'Unnamed Customer'}
                        </Link>
                        <span className="mt-0.5 block truncate text-xs text-slate-300">{customer.phone || 'No phone'}</span>
                        <span className="mt-0.5 block truncate text-xs muted">{getCustomerDisplayId(customer)}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {devices.length ? (
                      <div className="min-w-0" title={devices.join(', ')}>
                        <div className="truncate font-semibold text-slate-100">{devices[0]}</div>
                        {devices.length > 1 ? <div className="mt-0.5 truncate text-xs muted">+{devices.length - 1} more</div> : null}
                      </div>
                    ) : <span className="muted">-</span>}
                  </td>
                  <td>
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${activeJobs.length ? 'bg-sky-400/15 text-sky-100' : 'bg-slate-500/15 text-slate-200'}`}>
                      {activeJobs.length ? `${activeJobs.length} Active` : 'None'}
                    </span>
                  </td>
                  <td className={pendingBalance > 0 ? 'font-black text-amber-100' : 'muted'}>{currency(pendingBalance)}</td>
                  <td className={totalSpent > 0 ? 'font-black text-emerald-100' : 'muted'}>{currency(totalSpent)}</td>
                  <td>{formatListDate(customer.createdAt)}</td>
                  <td className="whitespace-nowrap text-center align-middle">
                    <Link
                      className="btn btn-secondary inline-flex h-8 items-center justify-center whitespace-nowrap border-sky-300/25 bg-sky-400/10 px-2.5 py-1 text-[11px] font-black text-sky-100 hover:bg-sky-400/15"
                      to={`${base}/customers/${customer.id}`}
                    >
                      View 360 Profile
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
        <PaginationControls pagination={pagination} onPageChange={setPage} />
        </>
      )}
    </>
  );
}

function TechnicianCustomerMobileCard({ customer, metrics, devices, base }) {
  const jobs = metrics.jobs || [];
  const activeJobs = jobs.filter(isActiveJob);
  const completedJobs = jobs.filter(isCompletedJob);
  const lastJob = jobs[0] || null;
  const phone = customer.phone || '';

  return (
    <article className="technician-mobile-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="technician-mobile-card-eyebrow">{getCustomerDisplayId(customer)}</p>
          <h2 className="technician-mobile-card-title" title={customer.name || 'Customer'}>{customer.name || 'Customer'}</h2>
          <p className="technician-mobile-card-muted">Phone: {phone || '-'}</p>
        </div>
        <StatusBadge status={`${jobs.length} job${jobs.length === 1 ? '' : 's'}`} />
      </div>
      <div className="technician-mobile-card-body">
        <div>
          <span>Assigned / Attended Jobs</span>
          <b>{jobs.length} total, {activeJobs.length} active, {completedJobs.length} completed</b>
        </div>
        <div>
          <span>Last Job / Status</span>
          <p>{lastJob ? `${getWorkOrderDisplayId(lastJob)} - ${lastJob.status || 'Status not set'}` : 'No assigned job yet'}</p>
        </div>
        <div>
          <span>Device / Service</span>
          <p>{devices[0] || lastJob?.serviceType || 'Devices from assigned jobs'}</p>
        </div>
      </div>
      <div className="technician-mobile-contact-row">
        <a className={`btn btn-secondary ${phone ? '' : 'pointer-events-none opacity-50'}`} href={callHref(phone)}><PhoneCallIcon className="h-4 w-4" />Call</a>
        <a className={`btn btn-secondary ${phone ? '' : 'pointer-events-none opacity-50'}`} href={phone ? customerWhatsAppHref(customer) : '#'} target="_blank" rel="noreferrer"><Send className="h-4 w-4" />WhatsApp</a>
      </div>
      <div className="technician-mobile-card-footer">
        <Link className="btn btn-primary" to={`${base}/customers/${customer.id}`}>Details</Link>
      </div>
    </article>
  );
}
