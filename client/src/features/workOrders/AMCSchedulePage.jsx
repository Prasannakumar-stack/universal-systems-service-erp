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
import { ADMIN_ASSIGNMENT_LABEL } from '../../utils/assignment.js';
import { can, normalizeRole } from '../../utils/roles.js';
import { emitSidebarBadgesUpdated } from '../../utils/sidebarBadges.js';

export function AMCSchedulePage({ role = 'admin' }) {
  const { request, user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const effectiveRole = user?.role || role;
  const isTechnician = normalizeRole(effectiveRole) === 'technician';
  const permissionSubject = user || effectiveRole;
  const canCreateAmc = can(permissionSubject, 'create_amc');
  const canCreateAmcJob = can(permissionSubject, 'create_amc_job');
  const base = isTechnician ? '/tech' : '/admin';
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useResource(() => request('/amc/schedule'), [request]);
  const schedule = data?.schedule || [];
  const visibleSchedule = status ? schedule.filter((visit) => visit.status === status) : schedule;
  const scheduleKpis = ['Upcoming', 'Due Today', 'Overdue', 'Completed'].map((item) => ({
    icon: item === 'Completed' ? CheckCircle2 : item === 'Overdue' ? AlertTriangle : CalendarClock,
    label: item,
    value: schedule.filter((visit) => visit.status === item).length,
    helper: {
      Upcoming: 'Planned AMC visits ahead.',
      'Due Today': 'Visits scheduled for today.',
      Overdue: 'Visits that need urgent action.',
      Completed: 'Visits already converted or closed.'
    }[item],
    tone: {
      Upcoming: 'blue',
      'Due Today': 'amber',
      Overdue: 'red',
      Completed: 'green'
    }[item]
  }));

  async function createJob(visit) {
    if (!canCreateAmcJob) return;
    try {
      const result = await request(`/amc/contracts/${visit.contractId}/work-orders`, {
        method: 'POST',
        body: JSON.stringify({ visitId: visit.id, issue: `AMC scheduled visit for ${visit.contractType}` })
      });
      push('Repair & Service Job created from AMC visit');
      reload();
      emitSidebarBadgesUpdated();
      navigate(`${base}/work-orders/${recordId(result.workOrder)}`);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div className="amc-module-page">
      <section className="amc-page-header mb-5">
        <div className="relative z-[1] flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--brand)]">AMC & Contracts</p>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">AMC Schedule</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Track upcoming, due today, overdue, and completed AMC service visits.</p>
          </div>
          <Link className="btn btn-secondary h-10 px-4" to={`${base}/amc-contracts`}><FileText className="h-4 w-4" />Contracts</Link>
        </div>
      </section>
      <div className="surface mb-5 p-3">
        <div className="tabs-list amc-tabs border-b-0">
          <Link className="tab-button" to={`${base}/amc-contracts`}>Contracts</Link>
          <Link className="tab-button tab-button-active" to={`${base}/amc-schedule`}>Schedule</Link>
          <Link className="tab-button" to={`${base}/amc-renewals`}>Renewals</Link>
          <Link className="tab-button" to={`${base}/warranties`}>Warranties</Link>
        </div>
      </div>

      <div className="amc-kpi-grid mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {scheduleKpis.map((item) => <AmcMetricCard key={item.label} {...item} />)}
      </div>

      <div className="surface amc-table-card p-5">
        <div className="amc-toolbar mb-4 flex flex-wrap items-center justify-between gap-3">
          <select className="input max-w-xs" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {['Upcoming', 'Due Today', 'Overdue', 'Completed'].map((item) => <option key={item}>{item}</option>)}
          </select>
          <Link className="btn btn-secondary" to={`${base}/amc-renewals`}><AlertTriangle className="h-4 w-4" />Renewals</Link>
        </div>
        {!visibleSchedule.length ? (
          <EmptyState
            icon={CalendarClock}
            title={status ? `No ${status.toLowerCase()} visits` : 'No schedule visits found'}
            message={status ? 'Reset the status filter to review the full AMC visit schedule.' : 'Visits will appear after AMC contracts are created.'}
            action={status ? <button className="btn btn-secondary" type="button" onClick={() => setStatus('')}>Reset Filter</button> : canCreateAmc ? <Link className="btn btn-primary" to={`${base}/amc-contracts`}>Create AMC Contract</Link> : null}
          />
        ) : (
          <>
          {isTechnician ? (
            <div className="technician-mobile-card-list amc-mobile-cards">
              {visibleSchedule.map((visit) => (
                <TechnicianAmcScheduleMobileCard key={visit.id} visit={visit} base={base} />
              ))}
            </div>
          ) : null}
          <div className={`table-wrap amc-table-wrap bg-[var(--surface)] ${isTechnician ? 'technician-desktop-table' : ''}`}>
            <table className="data-table amc-schedule-table">
            <thead><tr><th>Customer</th><th>Contract</th><th>Service Type</th><th>Scheduled Date</th><th>Technician</th><th>Status</th><th className="text-right">Action</th></tr></thead>
            <tbody>
              {visibleSchedule.map((visit) => {
                const workOrderId = recordId(visit.workOrderId);
                const isPrimaryVisit = ['Upcoming', 'Due Today', 'Overdue'].includes(visit.status);
                return (
                  <tr key={visit.id} className={visit.status === 'Overdue' ? 'amc-row-overdue' : ''}>
                    <td className="font-bold">
                      <span className="block truncate text-slate-100" title={visit.customerName || '-'}>{visit.customerName || '-'}</span>
                      <span className="block text-xs muted">{visit.phone || '-'}</span>
                    </td>
                    <td><span className="amc-id-text">{visit.contractCode}</span></td>
                    <td><span className="block truncate" title={visit.serviceType || '-'}>{visit.serviceType || '-'}</span></td>
                    <td className="whitespace-nowrap">{formatDate(visit.scheduledDate)}</td>
                    <td>
                      {visit.technicianId?.name ? <span className="block truncate font-semibold text-slate-200" title={visit.technicianId.name}>{visit.technicianId.name}</span> : <span className="amc-muted-badge">{ADMIN_ASSIGNMENT_LABEL}</span>}
                    </td>
                    <td><AmcStatusPill status={visit.status} /></td>
                    <td className="text-right">
                      <div className="amc-actions">
                        {workOrderId ? (
                          <Link className="btn btn-secondary amc-action-button" to={`${base}/work-orders/${workOrderId}`}>Open Job</Link>
                        ) : !canCreateAmcJob ? (
                          <span className="technician-mobile-readonly-pill">Awaiting admin job</span>
                        ) : (
                          <button className={`btn ${isPrimaryVisit ? 'btn-primary' : 'btn-secondary'} amc-action-button`} type="button" onClick={() => createJob(visit)}><Wrench className="h-4 w-4" />Create Job</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

function TechnicianAmcScheduleMobileCard({ visit, base }) {
  const workOrderId = recordId(visit.workOrderId);

  return (
    <article className="technician-mobile-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="technician-mobile-card-eyebrow">{visit.contractCode || 'AMC Visit'}</p>
          <h2 className="technician-mobile-card-title" title={visit.customerName || 'Customer'}>{visit.customerName || 'Customer'}</h2>
          <p className="technician-mobile-card-muted">Phone: {visit.phone || '-'}</p>
        </div>
        <AmcStatusPill status={visit.status} />
      </div>
      <div className="technician-mobile-card-body">
        <div>
          <span>Service Type</span>
          <b>{visit.serviceType || '-'}</b>
        </div>
        <div>
          <span>Scheduled Date</span>
          <p>{formatDate(visit.scheduledDate)}</p>
        </div>
        <div>
          <span>Technician</span>
          <p>{visit.technicianId?.name || ADMIN_ASSIGNMENT_LABEL}</p>
        </div>
      </div>
      <div className="technician-mobile-card-footer">
        {workOrderId ? <Link className="btn btn-primary" to={`${base}/work-orders/${workOrderId}`}>Open Job</Link> : <span className="technician-mobile-readonly-pill">Awaiting admin job</span>}
      </div>
    </article>
  );
}

function AmcMetricCard({ icon: Icon, label, value, helper, tone = 'blue' }) {
  return (
    <div className={`amc-metric-card amc-metric-${tone}`}>
      <div className="amc-metric-icon"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0">
        <p className="amc-metric-label">{label}</p>
        <p className="amc-metric-value" title={String(value)}>{value}</p>
        <p className="amc-metric-helper">{helper}</p>
      </div>
    </div>
  );
}

function AmcStatusPill({ status }) {
  const tone = {
    Active: 'amc-status-active',
    Upcoming: 'amc-status-upcoming',
    'Due Today': 'amc-status-due',
    Overdue: 'amc-status-overdue',
    Completed: 'amc-status-completed',
    'Renewal Due': 'amc-status-renewal',
    Expired: 'amc-status-expired',
    Cancelled: 'amc-status-cancelled'
  }[status] || 'amc-status-cancelled';
  return <span className={`amc-status-pill ${tone}`}>{status || '-'}</span>;
}
