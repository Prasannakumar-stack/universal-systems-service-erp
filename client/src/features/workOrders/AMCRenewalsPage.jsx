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
import { normalizeAmcCoverageType } from '../../shared/amcCoverage.js';
import { can, normalizeRole } from '../../utils/roles.js';
import { emitSidebarBadgesUpdated } from '../../utils/sidebarBadges.js';

export function AMCRenewalsPage({ role = 'admin' }) {
  const { request, user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const effectiveRole = user?.role || role;
  const isTechnician = normalizeRole(effectiveRole) === 'technician';
  const permissionSubject = user || effectiveRole;
  const canCreateAmc = can(permissionSubject, 'create_amc');
  const canRenewAmc = can(permissionSubject, 'renew_amc');
  const canCreateAmcJob = can(permissionSubject, 'create_amc_job');
  const canSendPdfWhatsapp = can(permissionSubject, 'send_pdf_whatsapp');
  const base = isTechnician ? '/app/tech' : '/app/admin';
  const { data, loading, error, reload } = useResource(() => request('/amc/renewals'), [request]);
  const renewals = data?.renewals || [];
  const expiring = renewals.filter((contract) => contract.renewalStatus === 'Renewal Due');
  const expired = renewals.filter((contract) => contract.renewalStatus === 'Expired');
  const renewalKpis = [
    { icon: Bell, label: 'Expiring in 30 Days', value: expiring.length, helper: 'Renew these before coverage lapses.', tone: 'amber' },
    { icon: AlertTriangle, label: 'Expired Contracts', value: expired.length, helper: 'Coverage already ended and needs action.', tone: 'red' }
  ];

  async function createJob(contract) {
    if (!canCreateAmcJob) return;
    try {
      const result = await request(`/amc/contracts/${recordId(contract)}/work-orders`, {
        method: 'POST',
        body: JSON.stringify({ issue: `AMC renewal service visit for ${contract.contractType}` })
      });
      push('Repair & Service Job created from AMC');
      reload();
      emitSidebarBadgesUpdated();
      navigate(`${base}/work-orders/${recordId(result.workOrder)}`);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  function renewContract(contract) {
    if (!canRenewAmc) return;
    navigate(`${base}/amc-contracts`, { state: { renewContract: contract } });
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div className="amc-module-page">
      <section className="amc-page-header mb-5">
        <div className="relative z-[1] flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--brand)]">AMC & Contracts</p>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">AMC Renewals</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Review contracts expiring in 30 days and expired AMC agreements.</p>
          </div>
          {canCreateAmc ? <Link className="btn btn-primary h-10 px-4" to={`${base}/amc-contracts`}><Plus className="h-4 w-4" />New Contract</Link> : null}
        </div>
      </section>
      <div className="surface mb-5 p-3">
        <div className="tabs-list amc-tabs border-b-0">
          <Link className="tab-button" to={`${base}/amc-contracts`}>Contracts</Link>
          <Link className="tab-button" to={`${base}/amc-schedule`}>Schedule</Link>
          <Link className="tab-button tab-button-active" to={`${base}/amc-renewals`}>Renewals</Link>
          <Link className="tab-button" to={`${base}/warranties`}>Warranties</Link>
        </div>
      </div>
      <div className="amc-kpi-grid grid gap-4 sm:grid-cols-2">
        {renewalKpis.map((item) => <AmcMetricCard key={item.label} {...item} />)}
      </div>
      <div className="surface amc-table-card mt-6 p-5">
        {!renewals.length ? (
          <EmptyState
            icon={Bell}
            title="No AMC renewals due"
            message="Renewal reminders will appear when contracts are near expiry."
            action={<Link className="btn btn-secondary" to={`${base}/amc-contracts`}>View Contracts</Link>}
          />
        ) : (
          <>
          {isTechnician ? (
            <div className="technician-mobile-card-list amc-mobile-cards">
              {renewals.map((contract) => (
                <TechnicianAmcRenewalMobileCard key={recordId(contract)} contract={contract} base={base} />
              ))}
            </div>
          ) : null}
          <div className={`table-wrap amc-table-wrap bg-[var(--surface)] ${isTechnician ? 'technician-desktop-table' : ''}`}>
            <table className="data-table amc-renewals-table">
            <thead><tr><th>Contract ID</th><th>Customer</th><th>Phone</th><th>Contract Type</th><th>End Date</th><th>Renewal Status</th><th>Value</th><th className="text-right">Action</th></tr></thead>
            <tbody>
              {renewals.map((contract) => (
                <tr key={recordId(contract)} className={contract.renewalStatus === 'Expired' ? 'amc-row-overdue' : ''}>
                  <td className="font-bold"><span className="amc-id-text">{contract.contractId}</span></td>
                  <td><span className="block truncate font-semibold text-slate-100" title={contract.customerName || '-'}>{contract.customerName || '-'}</span></td>
                  <td><span className="block whitespace-nowrap text-sm text-slate-200">{contract.phone || '-'}</span></td>
                  <td>
                    <span className="block truncate" title={contract.contractType || '-'}>{contract.contractType || '-'}</span>
                    <span className="mt-1 block truncate text-xs text-emerald-100" title={normalizeAmcCoverageType(contract.coverageType)}>{normalizeAmcCoverageType(contract.coverageType)}</span>
                  </td>
                  <td className="whitespace-nowrap">{formatDate(contract.endDate)}</td>
                  <td><AmcStatusPill status={contract.renewalStatus} /></td>
                  <td className="font-black text-slate-100">{currency(contract.contractValue)}</td>
                  <td className="text-right">
                    <div className="amc-actions">
                      {!canCreateAmcJob && !canRenewAmc && !canSendPdfWhatsapp ? (
                        <Link className="btn btn-secondary amc-action-button" to={`${base}/amc-contracts`}><FileText className="h-4 w-4" />View Contract</Link>
                      ) : (
                        <>
                          {canSendPdfWhatsapp ? <a className="btn btn-secondary amc-action-button amc-whatsapp-action" href={amcWhatsappHref(contract)} target="_blank" rel="noreferrer"><Send className="h-4 w-4" />WhatsApp</a> : null}
                          {canCreateAmcJob ? <button className="btn btn-primary amc-action-button" type="button" onClick={() => createJob(contract)}><Wrench className="h-4 w-4" />Create Job</button> : null}
                          {canRenewAmc ? <button className="btn btn-secondary amc-action-button" type="button" onClick={() => renewContract(contract)}><FileText className="h-4 w-4" />Renew</button> : null}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

function TechnicianAmcRenewalMobileCard({ contract, base }) {
  return (
    <article className="technician-mobile-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="technician-mobile-card-eyebrow">{contract.contractId || 'AMC Contract'}</p>
          <h2 className="technician-mobile-card-title" title={contract.customerName || 'Customer'}>{contract.customerName || 'Customer'}</h2>
          <p className="technician-mobile-card-muted">Phone: {contract.phone || '-'}</p>
        </div>
        <AmcStatusPill status={contract.renewalStatus} />
      </div>
      <div className="technician-mobile-card-body">
        <div>
          <span>Contract Type</span>
          <b>{contract.contractType || '-'}</b>
        </div>
        <div>
          <span>Coverage</span>
          <p>{normalizeAmcCoverageType(contract.coverageType)}</p>
        </div>
        <div>
          <span>End Date / Value</span>
          <p>{formatDate(contract.endDate)} / {currency(contract.contractValue)}</p>
        </div>
      </div>
      <div className="technician-mobile-card-footer">
        <Link className="btn btn-primary" to={`${base}/amc-contracts`}>View Contract</Link>
        <span className="technician-mobile-readonly-pill">Read-only</span>
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
