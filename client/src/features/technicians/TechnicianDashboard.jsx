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
import { ArrowRight } from 'lucide-react';

function TechnicianKpiCard({ icon: Icon, value, title, subtitle, to, tone = 'blue' }) {
  const toneClass = {
    blue: 'dashboard-kpi-blue',
    green: 'dashboard-kpi-green',
    yellow: 'dashboard-kpi-yellow',
    red: 'dashboard-kpi-red'
  }[tone] || 'dashboard-kpi-blue';

  return (
    <Link to={to} className={`dashboard-kpi-card lift-card group ${toneClass}`}>
      <div className="flex h-full items-start justify-between gap-4">
        <div className="dashboard-kpi-copy min-w-0">
          <span className="dashboard-kpi-icon mb-4">
            <Icon className="h-5 w-5" />
          </span>
          <p className="dashboard-kpi-value text-3xl font-black text-white">{value}</p>
          <p className="dashboard-kpi-title mt-2 text-xs font-black uppercase tracking-wide text-slate-300">{title}</p>
          <p className="dashboard-kpi-helper mt-2 text-sm font-semibold muted">{subtitle}</p>
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-500 transition-all group-hover:translate-x-1 group-hover:text-white" />
      </div>
    </Link>
  );
}

export function TechnicianDashboard() {
  const { request, user } = useAuth();
  const { data, loading, error } = useResource(() => request('/dashboard/technician'), [request]);
  const lastUpdatedTime = useMemo(() => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }), []);
  if (loading) return <TechnicianLoadingCards />;
  if (error) return <ErrorBlock message={error} />;

  const jobs = data?.jobs || [];
  const todayJobs = jobs.filter(isTechnicianTodayJob);
  const pendingJobs = jobs.filter((job) => job.status === 'Pending');
  const inProgressJobs = jobs.filter((job) => job.status === 'In Progress');
  const awaitingPartsJobs = jobs.filter((job) => job.status === 'Awaiting Parts');
  const completedJobs = jobs.filter(isCompletedJob);
  const kpiCards = [
    {
      icon: CalendarClock,
      value: todayJobs.length,
      title: 'Today Jobs',
      subtitle: 'Jobs scheduled for today',
      to: '/tech/work-orders?filter=today',
      tone: 'blue'
    },
    {
      icon: AlertTriangle,
      value: pendingJobs.length,
      title: 'Pending',
      subtitle: 'Jobs waiting to start',
      to: '/tech/work-orders?status=pending',
      tone: 'yellow'
    },
    {
      icon: Wrench,
      value: inProgressJobs.length,
      title: 'In Progress',
      subtitle: 'Jobs currently in progress',
      to: '/tech/work-orders?status=in-progress',
      tone: 'green'
    },
    {
      icon: PackagePlus,
      value: awaitingPartsJobs.length,
      title: 'Awaiting Parts',
      subtitle: 'Jobs waiting for parts',
      to: '/tech/work-orders?status=awaiting-parts',
      tone: 'yellow'
    },
    {
      icon: CheckCircle2,
      value: completedJobs.length,
      title: 'Completed',
      subtitle: 'Jobs completed or closed',
      to: '/tech/work-orders?status=completed',
      tone: 'green'
    }
  ];

  return (
    <div className="technician-dashboard-page">
      <PageHeader
        title="Technician Dashboard"
        eyebrow={`Welcome, ${user?.name || 'Technician'}`}
        action={(
          <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-bold muted">
            <CalendarClock className="h-4 w-4 text-sky-300" />
            <span>Last updated: Today, {lastUpdatedTime}</span>
          </div>
        )}
      >
        Today's assigned jobs and current service status at a glance.
      </PageHeader>
      <div className="technician-dashboard-kpi-grid">
        {kpiCards.map((card) => <TechnicianKpiCard key={card.title} {...card} />)}
      </div>
      <section className="dashboard-panel lift-card mt-5 p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black text-white">Ready to continue your work?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 muted">Open your assigned jobs, contact customers, add notes, request parts, and upload job photos.</p>
          </div>
          <Link className="btn btn-primary h-10 shrink-0 px-4" to="/tech/work-orders">
            Open Work Orders
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
