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
  workOrderSearchText,
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
  sortWorkOrdersByPriority,
  WorkOrderPriorityBadge,
  WORK_ORDER_PRIORITIES,
  normalizeWorkOrderPriority,
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
  XAxis,
  YAxis
} from '../../shared/phase1Shared.jsx';
import { MoreHorizontal, Search, X } from 'lucide-react';
import { ADMIN_ASSIGNMENT_LABEL, technicianNameOrAdmin } from '../../utils/assignment.js';

const WORK_ORDER_SOURCES = ['Walk-in', 'Call', 'Website'];
const ADMIN_TECHNICIAN_FILTER_VALUE = 'admin';

function normalizeSourceLabel(source) {
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

  if (!raw) return 'Website';
  if (raw.includes('call') || raw.includes('phone')) return 'Call';
  if (raw.includes('walk') || raw.includes('shop') || raw.includes('offline') || raw === 'walkin' || raw === 'manual') return 'Walk-in';
  if (raw.includes('website') || raw.includes('web') || raw.includes('online') || raw.includes('whatsapp') || raw.includes('referral')) return 'Website';
  return 'Website';
}

const SOURCE_DISPLAY = {
  Call: 'CALL',
  'Walk-in': 'WALK-IN',
  Website: 'WEBSITE'
};

function normalizeStatusParam(value) {
  const raw = String(value || '').trim().toLowerCase();
  const bySlug = {
    pending: 'Pending',
    'in-progress': 'In Progress',
    'awaiting-parts': 'Awaiting Parts',
    completed: 'Completed',
    delivered: 'Delivered',
    returned: 'Returned'
  };
  if (bySlug[raw]) return bySlug[raw];
  return workOrderDetailStatuses.find((status) => status.toLowerCase() === raw) || '';
}

function WorkOrderSourceBadge({ source }) {
  const key = normalizeSourceLabel(source);
  const label = SOURCE_DISPLAY[key] || 'WEBSITE';
  const tones = {
    CALL: 'border-emerald-500/25 bg-emerald-500/[0.12] text-emerald-200',
    'WALK-IN': 'border-cyan-500/25 bg-cyan-500/[0.12] text-cyan-100',
    WEBSITE: 'border-indigo-400/25 bg-indigo-500/[0.12] text-indigo-200'
  };

  return (
    <span
      className={`inline-flex min-h-[1.625rem] max-w-full items-center justify-center truncate rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-wide ${tones[label] || tones.WEBSITE}`}
      title={label}
    >
      {label}
    </span>
  );
}

const workOrdersFocusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#071426]';
const workOrdersFilterClass =
  `work-orders-filter-control h-12 w-full min-w-0 rounded-xl border border-sky-400/20 bg-slate-950/40 px-4 pr-12 text-sm text-slate-100 ${workOrdersFocusRing}`;
const workOrdersDateClass =
  `work-orders-filter-control work-orders-date-input h-12 w-full min-w-0 rounded-xl border border-sky-400/20 bg-slate-950/40 px-4 pr-12 text-sm text-slate-100 [color-scheme:dark] ${workOrdersFocusRing}`;
const workOrdersThClass =
  'px-3 py-3 align-middle whitespace-nowrap text-[11px] font-extrabold uppercase tracking-wide text-slate-400';
const workOrdersThLeftClass = `${workOrdersThClass} text-left`;
const workOrdersThCenterClass = `${workOrdersThClass} text-center`;
const workOrdersTdClass = 'px-4 py-3 align-middle min-w-0';
const workOrdersClearBtnClass =
  `inline-flex h-12 w-full min-w-[170px] items-center justify-center rounded-xl border border-sky-400/40 bg-sky-500/15 px-6 text-sm font-semibold text-sky-100 transition hover:border-sky-300/70 hover:bg-sky-500/25 hover:shadow-[0_0_22px_rgba(56,189,248,0.22)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 ${workOrdersFocusRing}`;
const workOrdersDetailsBtnClass =
  `inline-flex h-10 min-h-[38px] min-w-[64px] items-center justify-center rounded-xl border border-sky-400/25 bg-slate-800/80 px-3 text-sm font-semibold text-slate-100 transition hover:border-sky-300/60 hover:bg-sky-500/15 hover:text-white hover:shadow-[0_0_18px_rgba(56,189,248,0.16)] ${workOrdersFocusRing}`;

function WorkOrdersBadgeCell({ children, justify = 'justify-start' }) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${justify} [&_.inline-flex]:whitespace-nowrap [&_span]:whitespace-nowrap`}>
      {children}
    </div>
  );
}

export function WorkOrdersPage({ role = 'admin' }) {
  const { request } = useAuth();
  const { push } = useToast();
  const location = useLocation();
  const routeParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const statusParam = useMemo(() => normalizeStatusParam(routeParams.get('status')), [routeParams]);
  const priorityParam = useMemo(() => new URLSearchParams(location.search).get('priority') || '', [location.search]);
  const technicianIdParam = useMemo(() => new URLSearchParams(location.search).get('technicianId') || '', [location.search]);
  const filterParam = useMemo(() => routeParams.get('filter') || '', [routeParams]);
  const notesParam = useMemo(() => routeParams.get('notes') || '', [routeParams]);
  const todayFilterDate = useMemo(() => filterParam === 'today' ? dateInputValue(new Date()) : '', [filterParam]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState(statusParam);
  const [dateFrom, setDateFrom] = useState(todayFilterDate);
  const [dateTo, setDateTo] = useState(todayFilterDate);
  const [technicianId, setTechnicianId] = useState(technicianIdParam);
  const [serviceType, setServiceType] = useState('');
  const [source, setSource] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [technicians, setTechnicians] = useState([]);
  const [assignOrder, setAssignOrder] = useState(null);
  const [deleteOrder, setDeleteOrder] = useState(null);
  const [actionMenuId, setActionMenuId] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const debouncedSearch = useDebouncedValue(search);
  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (status) params.set('status', status);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (role === 'admin' && technicianId) params.set('technicianId', technicianId === ADMIN_TECHNICIAN_FILTER_VALUE ? ADMIN_TECHNICIAN_FILTER_VALUE : technicianId);
    if (serviceType) params.set('serviceType', serviceType);
    if (source) params.set('source', normalizeSourceLabel(source));
    if (priorityFilter) params.set('priority', priorityFilter);
    return params.toString() ? `?${params}` : '';
  }, [dateFrom, dateTo, debouncedSearch, limit, page, priorityFilter, role, serviceType, source, status, technicianId]);
  const { data, loading, error, reload } = useResource(() => request(`/work-orders${query}`), [request, query]);
  const base = role === 'admin' ? '/admin/work-orders' : '/tech/work-orders';

  useEffect(() => {
    setStatus(statusParam);
  }, [statusParam]);

  useEffect(() => {
    if (filterParam !== 'today') return;
    setDateFrom(todayFilterDate);
    setDateTo(todayFilterDate);
  }, [filterParam, todayFilterDate]);

  useEffect(() => {
    if (role === 'admin') setPriorityFilter(priorityParam);
  }, [priorityParam, role]);

  useEffect(() => {
    if (role === 'admin') setTechnicianId(technicianIdParam);
  }, [role, technicianIdParam]);

  useEffect(() => {
    if (role === 'admin') request('/users?role=technician&active=true&limit=100').then((result) => setTechnicians(result.users.filter((user) => user.role === 'technician' && user.active))).catch(() => {});
  }, [request, role]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, dateFrom, dateTo, technicianId, serviceType, source, priorityFilter]);

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

  async function saveAssignment(order, nextTechnicianId) {
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${recordId(order)}/assignment`, {
          method: 'PATCH',
          body: JSON.stringify({ technicianId: nextTechnicianId || null })
        });
        push(nextTechnicianId ? 'Work order assigned' : 'Work order assigned to Admin');
        setActionMenuId('');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
      throw err;
    }
  }

  async function confirmDeleteWorkOrder() {
    if (!deleteOrder) return;
    try {
      await preserveScroll(async () => {
        await request(`/work-orders/${recordId(deleteOrder)}`, { method: 'DELETE' });
        push('Work order deleted');
        setDeleteOrder(null);
        setActionMenuId('');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  function clearFilters() {
    setSearch('');
    setPriorityFilter('');
    setStatus('');
    setServiceType('');
    setSource('');
    setDateFrom('');
    setDateTo('');
    setTechnicianId('');
    setPage(1);
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

  async function copyPhone(phone) {
    if (await copyTextToClipboard(phone)) push('Phone copied');
    else push('Phone not available', 'error');
  }

  const workOrders = Array.isArray(data?.workOrders) ? data.workOrders : Array.isArray(data?.data) ? data.data : [];
  const searchTerm = debouncedSearch.trim();
  const filteredWorkOrders = useMemo(() => {
    let rows = searchTerm
      ? workOrders.filter((order) => matchesDisplaySearch(searchTerm, workOrderSearchText(order)))
      : workOrders;
    if (priorityFilter) {
      rows = rows.filter((order) => normalizeWorkOrderPriority(order.priority) === priorityFilter);
    }
    if (source) {
      rows = rows.filter((order) => normalizeSourceLabel(order) === source);
    }
    if (notesParam === 'pending') {
      rows = rows.filter((order) => ['Pending', 'In Progress', 'Awaiting Parts'].includes(order.status) && !(order.notes || []).length);
    }
    return sortWorkOrdersByPriority(rows);
  }, [notesParam, priorityFilter, searchTerm, source, workOrders]);
  const visibleWorkOrders = filteredWorkOrders;
  const pagination = paginationFrom(data, workOrders.length, limit);
  const actionColumnWidth = role === 'admin' ? '190px' : '120px';

  if (loading) return <div className="work-orders-page mx-auto max-w-[1920px]"><LoadingBlock /></div>;
  if (error) return <div className="work-orders-page mx-auto max-w-[1920px]"><ErrorBlock message={error} /></div>;

  return (
    <div className="work-orders-page mx-auto max-w-[1920px] space-y-6">
      <header className="work-orders-page-header">
        <p className="text-xs font-black uppercase tracking-widest text-sky-400/90">Operations</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-white sm:text-3xl">
          Repair & Service Jobs
        </h1>
        <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-400">
          Track active service jobs, repairs, installations, parts, billing, and completion.
        </p>
        <div className="mt-5 border-b border-white/10" aria-hidden="true" />
      </header>

      <section className="work-orders-filter-bar surface min-w-0 border border-white/10 bg-[#0b172a]/60 p-4 shadow-lg backdrop-blur-md">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-12">
          <div className="work-orders-filter-search relative min-w-0 md:col-span-2 lg:col-span-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className={`h-12 w-full min-w-0 rounded-xl border border-sky-400/20 bg-slate-950/40 pl-10 pr-4 text-sm text-slate-100 placeholder:text-slate-500 ${workOrdersFocusRing}`}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search work order ID, customer, phone"
            />
          </div>
          <select className={`${workOrdersFilterClass} lg:col-span-2`} value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)}>
            <option value="">All priorities</option>
            {WORK_ORDER_PRIORITIES.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select className={`${workOrdersFilterClass} lg:col-span-2`} value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {workOrderDetailStatuses.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className={`${workOrdersFilterClass} lg:col-span-2`} value={serviceType} onChange={(event) => setServiceType(event.target.value)}>
            <option value="">All service types</option>
            {serviceTypes.map((item) => <option key={item}>{item}</option>)}
          </select>
          <select className={`${workOrdersFilterClass} lg:col-span-2`} value={source} onChange={(event) => setSource(event.target.value)}>
            <option value="">All sources</option>
            {WORK_ORDER_SOURCES.map((item) => <option key={item} value={item}>{SOURCE_DISPLAY[item]}</option>)}
          </select>
          <input className={`${workOrdersDateClass} lg:col-span-2`} type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} aria-label="Date from" />
          <input className={`${workOrdersDateClass} lg:col-span-2`} type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} aria-label="Date to" />
          {role === 'admin' ? (
            <select className={`${workOrdersFilterClass} lg:col-span-3`} value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}>
              <option value="">All technicians</option>
              <option value={ADMIN_TECHNICIAN_FILTER_VALUE}>{ADMIN_ASSIGNMENT_LABEL}</option>
              {technicians.map((tech) => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
            </select>
          ) : null}
          <button type="button" className={`${workOrdersClearBtnClass} lg:col-span-2`} onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      </section>

      {!visibleWorkOrders.length ? (
        <EmptyState
          icon={ClipboardList}
          title="No repair or service jobs"
          message="Adjust your filters or search to find jobs, or create work from a booking."
        />
      ) : (
        <>
        {role === 'technician' ? (
          <div className="technician-mobile-card-list work-orders-mobile-cards">
            {visibleWorkOrders.map((order) => (
              <TechnicianWorkOrderMobileCard
                key={recordId(order)}
                order={order}
                base={base}
                onCopyPhone={copyPhone}
              />
            ))}
          </div>
        ) : null}
        <div className={`work-orders-table-shell work-orders-table-shell--summary table-wrap border border-white/10 bg-[var(--surface)] ${role === 'technician' ? 'technician-desktop-table' : ''}`}>
          <table className="data-table work-orders-table work-orders-table--summary w-full min-w-0 table-fixed" style={{ '--work-order-action-width': actionColumnWidth }}>
            <colgroup>
              <col className="work-orders-col-summary-customer" style={{ width: '18%' }} />
              <col className="booking-source-column work-orders-col-summary-source" style={{ width: '7%' }} />
              <col className="work-orders-col-summary-service" style={{ width: '20%' }} />
              <col className="work-orders-col-summary-tech" style={{ width: '11%' }} />
              <col className="work-orders-col-summary-priority" style={{ width: '8%' }} />
              <col className="work-orders-col-summary-status" style={{ width: '9%' }} />
              <col className="work-orders-col-summary-payment" style={{ width: '9%' }} />
              <col className="work-orders-col-summary-actions" style={{ width: actionColumnWidth }} />
            </colgroup>
            <thead className="work-orders-table-head">
              <tr>
                <th className={workOrdersThLeftClass}>Work Order / Customer</th>
                <th className={`${workOrdersThCenterClass} work-orders-th-source`}>Source</th>
                <th className={workOrdersThLeftClass}>Service / Device</th>
                <th className={workOrdersThLeftClass}>Technician</th>
                <th className={workOrdersThCenterClass}>Priority</th>
                <th className={workOrdersThCenterClass}>Status</th>
                <th className={workOrdersThCenterClass}>Payment</th>
                <th className={`${workOrdersThCenterClass} px-4`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {visibleWorkOrders.map((order) => (
                <tr
                  key={order.id}
                  className="work-orders-table-row transition-colors duration-150 hover:bg-sky-400/[0.05] hover:shadow-[inset_2px_0_0_rgba(56,189,248,0.45)]"
                >
                  <td className={`${workOrdersTdClass} work-orders-cell-customer !whitespace-normal text-left`}>
                    <div className="min-w-0">
                      {role === 'admin' && order.customerId ? (
                        <Link className={`block truncate font-bold text-slate-100 hover:text-sky-300 ${workOrdersFocusRing}`} title={order.customerId?.name} to={`/admin/customers/${recordId(order.customerId)}`}>{order.customerId?.name || 'Customer'}</Link>
                      ) : (
                        <span className="block truncate font-bold text-slate-100" title={order.customerId?.name}>{order.customerId?.name || 'Customer'}</span>
                      )}
                      <span className="mt-0.5 block truncate text-xs text-slate-300" title={order.customerId?.phone}>{order.customerId?.phone || '-'}</span>
                      <span className="mt-1 block truncate font-mono text-[11px] font-semibold text-slate-500" title={getWorkOrderDisplayId(order)}>{getWorkOrderDisplayId(order)}</span>
                      <span className="booking-source-inline mt-1.5"><WorkOrderSourceBadge source={order} /></span>
                    </div>
                  </td>
                  <td className={`${workOrdersTdClass} work-orders-td-source booking-source-column text-center`}>
                    <WorkOrderSourceBadge source={order} />
                  </td>
                  <td className={`${workOrdersTdClass} work-orders-cell-service !whitespace-normal text-left`}>
                    <div className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-100" title={order.serviceType || order.service || 'Service Job'}>{order.serviceType || order.service || 'Service Job'}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-400" title={order.device || '-'}>{order.device || '-'}</span>
                      {order.issue ? <span className="mt-0.5 block truncate text-xs text-slate-400" title={order.issue}>{order.issue}</span> : null}
                    </div>
                  </td>
                  <td className={`${workOrdersTdClass} text-left`}>
                    <span className="block max-w-full truncate text-sm text-slate-200" title={technicianNameOrAdmin(order)}>{technicianNameOrAdmin(order)}</span>
                  </td>
                  <td className={`${workOrdersTdClass} !whitespace-normal text-center`}>
                    <WorkOrdersBadgeCell justify="justify-center"><WorkOrderPriorityBadge priority={jobPriority(order)} /></WorkOrdersBadgeCell>
                  </td>
                  <td className={`${workOrdersTdClass} !whitespace-normal text-center`}>
                    <WorkOrdersBadgeCell justify="justify-center"><StatusBadge status={order.status} /></WorkOrdersBadgeCell>
                  </td>
                  <td className={`${workOrdersTdClass} work-orders-cell-payment !whitespace-normal text-center`}>
                    <WorkOrdersBadgeCell justify="justify-center">
                      {order.invoiceId ? <StatusBadge status={order.invoiceId.status} /> : <StatusBadge status="Not Generated" />}
                    </WorkOrdersBadgeCell>
                  </td>
                  <td className={`${workOrdersTdClass} work-orders-cell-actions !whitespace-normal px-4 text-center align-middle`}>
                    <div className="work-orders-actions relative flex items-center justify-center gap-1.5">
                      <Link className={workOrdersDetailsBtnClass} to={`${base}/${order.id}`}>Details</Link>
                      {role === 'admin' ? (
                        <div className="relative">
                          <button
                            type="button"
                            className="work-orders-more-button"
                            onClick={() => setActionMenuId((current) => current === recordId(order) ? '' : recordId(order))}
                            aria-label="More work order actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {actionMenuId === recordId(order) ? (
                            <div className="work-orders-more-menu">
                              {!order.technicianId ? (
                                <button type="button" onClick={() => autoAssign(order.id)}>Auto Assign</button>
                              ) : null}
                              <button type="button" onClick={() => { setAssignOrder(order); setActionMenuId(''); }}>
                                {order.technicianId ? 'Reassign' : 'Assign'}
                              </button>
                              <button type="button" className="work-orders-danger-menu-item" onClick={() => { setDeleteOrder(order); setActionMenuId(''); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls pagination={pagination} onPageChange={setPage} />
        </>
      )}
      {assignOrder ? (
        <WorkOrderAssignmentModal
          order={assignOrder}
          technicians={technicians}
          onClose={() => setAssignOrder(null)}
          onSave={saveAssignment}
        />
      ) : null}
      {deleteOrder ? (
        <ConfirmModal
          title="Delete Work Order"
          message="Are you sure you want to delete this work order? This action cannot be undone."
          confirmLabel="Delete"
          onCancel={() => setDeleteOrder(null)}
          onConfirm={confirmDeleteWorkOrder}
        />
      ) : null}
    </div>
  );
}

function TechnicianWorkOrderMobileCard({ order, base, onCopyPhone }) {
  const customer = customerFromOrder(order);
  const phone = customerPhone(order);
  const priority = jobPriority(order);

  return (
    <article className="technician-mobile-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="technician-mobile-card-eyebrow">{getWorkOrderDisplayId(order)}</p>
          <h2 className="technician-mobile-card-title" title={customer.name || 'Customer'}>{customer.name || 'Customer'}</h2>
          <p className="technician-mobile-card-muted">Phone: {phone || '-'}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>
      <div className="technician-mobile-card-body">
        <div>
          <span>Service / Device</span>
          <b>{order.serviceType || order.service || 'Service Job'}{order.device ? ` / ${order.device}` : ''}</b>
        </div>
        <div>
          <span>Problem</span>
          <p>{order.issue || 'No issue captured'}</p>
        </div>
      </div>
      <div className="technician-mobile-meta-row">
        <WorkOrderSourceBadge source={order} />
        <WorkOrderPriorityBadge priority={priority} />
        <span>{jobScheduleLabel(order)}</span>
        <span>Created {formatDate(order.createdAt)}</span>
      </div>
      <div className="technician-mobile-contact-row">
        <a className={`btn btn-secondary ${phone ? '' : 'pointer-events-none opacity-50'}`} href={callHref(phone)}><PhoneCallIcon className="h-4 w-4" />Call</a>
        <a className={`btn btn-secondary ${phone ? '' : 'pointer-events-none opacity-50'}`} href={technicianWhatsAppHref(order)} target="_blank" rel="noreferrer"><Send className="h-4 w-4" />WhatsApp</a>
        <button type="button" className={`btn btn-secondary ${phone ? '' : 'pointer-events-none opacity-50'}`} onClick={() => onCopyPhone(phone)}><ClipboardList className="h-4 w-4" />Copy</button>
      </div>
      <div className="technician-mobile-card-footer">
        <Link className="btn btn-primary" to={`${base}/${recordId(order)}`}>Details</Link>
      </div>
    </article>
  );
}

function WorkOrderAssignmentModal({ order, technicians, onClose, onSave }) {
  const [technicianId, setTechnicianId] = useState(recordId(order.technicianId) || '');
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    let saved = false;
    try {
      await onSave(order, technicianId);
      saved = true;
    } catch {
      // Parent owns the toast so the modal can stay focused on form state.
    } finally {
      if (!saved) setSaving(false);
    }
    if (saved) onClose();
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4">
      <form className="surface admin-modal w-full max-w-md p-5" onSubmit={submit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">{order.technicianId ? 'Reassign Work Order' : 'Assign Work Order'}</h2>
            <p className="mt-1 text-sm muted">Choose Admin or an active technician for this work order.</p>
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onClose} aria-label="Close assignment modal">
            <X className="h-5 w-5" />
          </button>
        </div>
        <label className="mt-5 block">
          <span className="label">Assign to</span>
          <select className="input" value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}>
            {/* Admin is stored as an empty technicianId so legacy unassigned jobs remain valid. */}
            <option value="">{ADMIN_ASSIGNMENT_LABEL}</option>
            {technicians.map((tech) => <option key={tech.id} value={tech.id}>{tech.name}</option>)}
          </select>
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Assignment'}
          </button>
        </div>
      </form>
    </div>
  );
}
