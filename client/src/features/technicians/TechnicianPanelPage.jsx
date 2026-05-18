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

export function TechnicianPanelPage() {
  const { request } = useAuth();
  const { data, loading } = useResource(() => request('/work-orders?limit=100').catch(() => ({ workOrders: [] })), [request]);
  const workOrders = data?.workOrders || [];
  const assignedJobs = workOrders.filter((job) => recordId(job.technicianId));
  const inProgressJobs = workOrders.filter((job) => job.status === 'In Progress');
  const awaitingPartsJobs = workOrders.filter((job) => job.status === 'Awaiting Parts');
  const completedJobs = workOrders.filter((job) => ['Completed', 'Delivered'].includes(job.status));
  const unassignedJobs = workOrders.filter((job) => !recordId(job.technicianId));
  const recentActivity = [...workOrders]
    .filter((job) => recordId(job.technicianId) || ['Completed', 'Delivered', 'In Progress', 'Awaiting Parts'].includes(job.status))
    .sort((a, b) => new Date(b.updatedAt || b.completedAt || b.createdAt || 0) - new Date(a.updatedAt || a.completedAt || a.createdAt || 0))
    .slice(0, 5);
  const technicianKpis = [
    { icon: UserRound, label: 'Assigned Jobs', value: assignedJobs.length, helper: 'Jobs with technicians', to: '/admin/work-orders?view=technicians', tone: 'blue' },
    { icon: Wrench, label: 'In Progress', value: inProgressJobs.length, helper: 'Technicians working now', to: '/admin/work-orders?status=In%20Progress', tone: 'cyan' },
    { icon: PackagePlus, label: 'Awaiting Parts', value: awaitingPartsJobs.length, helper: 'Parts needed to continue', to: '/admin/work-orders?status=Awaiting%20Parts', tone: 'amber' },
    { icon: CheckCircle2, label: 'Completed Jobs', value: completedJobs.length, helper: 'Finished service jobs', to: '/admin/work-orders?status=Completed', tone: 'green' },
    { icon: AlertTriangle, label: 'Unassigned Jobs', value: unassignedJobs.length, helper: 'Needs technician assignment', to: '/admin/work-orders', tone: 'red' }
  ];
  const panelLinks = [
    { to: '/admin/technician-tasks', label: 'Technician Tasks', icon: UserRound, text: 'Open assigned task navigation for technician work.', cta: 'Open Tasks' },
    { to: '/admin/work-orders?view=technicians', label: 'Assigned Work Orders', icon: BookOpenCheck, text: 'Review assigned service and repair jobs by technician.', cta: 'View Assigned' },
    { to: '/admin/work-orders?status=Completed', label: 'Completed Jobs', icon: CheckCircle2, text: 'Check service jobs that have reached completion.', cta: 'View Completed' }
  ];

  return (
    <div className="admin-control-page technician-panel-page">
      <section className="admin-control-hero mb-5">
        <div className="relative z-[1]">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--brand)]">Operations</p>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Technician Panel</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 muted">Technician work, assigned jobs, completed jobs, and service task navigation in one place.</p>
        </div>
      </section>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {technicianKpis.map((item) => <TechnicianHubMetric key={item.label} {...item} />)}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {panelLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.label} to={item.to} className="surface technician-nav-card lift-card block p-5">
              <span className="admin-control-icon">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 text-xl font-black">{item.label}</h2>
              <p className="mt-2 text-sm leading-6 muted">{item.text}</p>
              <span className="mt-4 inline-flex min-h-[2.25rem] items-center rounded-card border border-sky-300/20 bg-sky-400/10 px-3 text-sm font-black text-sky-100">{item.cta}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[.8fr_1.2fr]">
        <section className="surface admin-control-card p-5">
          <div className="flex items-start gap-3">
            <div className="admin-control-icon"><ClipboardList className="h-5 w-5" /></div>
            <div>
              <h2 className="text-xl font-black">Technician Workflow</h2>
              <p className="mt-1 text-sm muted">A simple service flow for technician operations.</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3">
            {['Receive assigned job', 'Diagnose issue', 'Add parts/service updates', 'Complete job', 'Generate final document'].map((step, index) => (
              <div key={step} className="workflow-step-row">
                <span>{index + 1}</span>
                <p>{step}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="surface admin-control-card p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Recent Technician Activity</h2>
              <p className="mt-1 text-sm muted">Latest technician-related work order updates from existing jobs.</p>
            </div>
            <Link className="btn btn-secondary admin-compact-button" to="/admin/work-orders?view=technicians">View Jobs</Link>
          </div>
          {loading ? (
            <div className="rounded-card border border-white/10 bg-white/[0.035] p-4 text-sm muted">Loading technician activity...</div>
          ) : recentActivity.length ? (
            <div className="grid gap-3">
              {recentActivity.map((job) => (
                <Link key={recordId(job)} className="technician-activity-row" to={`/admin/work-orders/${recordId(job)}`}>
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-100" title={job.customerId?.name || job.customerName || getWorkOrderDisplayId(job)}>{job.customerId?.name || job.customerName || getWorkOrderDisplayId(job)}</p>
                    <p className="mt-1 text-xs muted">{getWorkOrderDisplayId(job)} - {job.technicianId?.name || 'Unassigned technician'}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={job.status} />
                    <p className="mt-1 text-xs muted">{formatDate(job.updatedAt || job.completedAt || job.createdAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState icon={ClipboardList} title="No technician activity yet" message="Assigned jobs and completed service updates will appear here." />
          )}
        </section>
      </div>
    </div>
  );
}

function TechnicianHubMetric({ icon: Icon, label, value, helper, to, tone = 'blue' }) {
  return (
    <Link to={to} className={`admin-metric-card admin-metric-${tone}`}>
      <div className="admin-metric-icon"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0">
        <p className="admin-metric-label">{label}</p>
        <p className="admin-metric-value">{value}</p>
        <p className="admin-metric-helper">{helper}</p>
      </div>
    </Link>
  );
}
