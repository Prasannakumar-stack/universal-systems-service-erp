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

export function TechnicianDashboard() {
  const { request, user } = useAuth();
  const { data, loading, error } = useResource(() => request('/dashboard/technician'), [request]);
  if (loading) return <TechnicianLoadingCards />;
  if (error) return <ErrorBlock message={error} />;

  const jobs = data.jobs || [];
  const todayJobs = jobs.filter(isTechnicianTodayJob);
  const inProgressJobs = jobs.filter((job) => job.status === 'In Progress');
  const awaitingPartsJobs = jobs.filter((job) => job.status === 'Awaiting Parts');
  const completedToday = jobs.filter((job) => job.status === 'Completed' && isSameDay(job.completedAt || job.updatedAt || job.createdAt));
  const pendingUpdates = jobs.filter((job) => ['Pending', 'In Progress', 'Awaiting Parts'].includes(job.status) && !(job.notes || []).length);
  const activeJobs = jobs.filter((job) => ['Pending', 'In Progress', 'Awaiting Parts'].includes(job.status));
  const pendingPaymentJobs = jobs.filter((job) => invoiceDueAmount(job.invoiceId) > 0);
  const amcVisitsDue = jobs.filter((job) => job.amcContractId && ['Pending', 'In Progress', 'Awaiting Parts'].includes(job.status));
  const nextJob = [...activeJobs].sort((a, b) => new Date(a.scheduledAt || a.createdAt || 0) - new Date(b.scheduledAt || b.createdAt || 0))[0];
  const urgentJobs = jobs.filter(isTechnicianOverdueJob).slice(0, 4);
  const recentCompleted = jobs.filter((job) => ['Completed', 'Delivered', 'Returned'].includes(job.status)).slice(0, 4);

  return (
    <>
      <PageHeader title="Technician Dashboard" eyebrow={`Welcome, ${user?.name || 'Technician'}`}>
        Today's assigned jobs, next job, status updates, parts, notes, and technician notifications.
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarClock} label="Today's Jobs" value={todayJobs.length} />
        <StatCard icon={Wrench} label="Assigned Work Orders" value={jobs.length} />
        <StatCard icon={Wrench} label="In Progress" value={inProgressJobs.length} />
        <StatCard icon={PackagePlus} label="Awaiting Parts" value={awaitingPartsJobs.length} tone="yellow" />
        <StatCard icon={CheckCircle2} label="Completed Today" value={completedToday.length} tone="green" />
        <StatCard icon={AlertTriangle} label="Pending Notes / Updates" value={pendingUpdates.length} tone="yellow" />
        <StatCard icon={CreditCard} label="Pending Payments" value={pendingPaymentJobs.length} tone="yellow" />
        <StatCard icon={ShieldCheck} label="AMC Visits Due" value={amcVisitsDue.length} tone="yellow" />
      </div>
      <div className="mt-6 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
        <div className="grid gap-5">
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Next Job</h2>
              <Link className="btn btn-secondary py-2" to="/tech/work-orders">View All</Link>
            </div>
            {nextJob ? <TechnicianJobCard job={nextJob} compact /> : (
              <EmptyState
                title="No jobs scheduled today."
                message="No jobs scheduled today. View all assigned work orders."
                action={<Link className="btn btn-secondary" to="/tech/work-orders">View Work Orders</Link>}
              />
            )}
          </div>
          <div className="surface p-5">
            <h2 className="text-xl font-black">Urgent / Overdue Jobs</h2>
            <div className="mt-4 grid gap-3">
              {urgentJobs.length ? urgentJobs.map((job) => (
                <TechnicianJobCard key={recordId(job)} job={job} compact />
              )) : <p className="text-sm muted">No urgent jobs right now.</p>}
            </div>
          </div>
        </div>
        <div className="grid gap-5">
          <div className="surface p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Today's Assigned Jobs</h2>
              <span className="status-badge">{todayJobs.length}</span>
            </div>
            <div className="mt-4 grid gap-3">
              {todayJobs.length ? todayJobs.slice(0, 5).map((job) => <TechnicianJobCard key={recordId(job)} job={job} compact />) : (
                <EmptyState
                  title="No jobs scheduled today."
                  message="No jobs scheduled today. View all assigned work orders."
                  action={<Link className="btn btn-secondary" to="/tech/work-orders">View Work Orders</Link>}
                />
              )}
            </div>
          </div>
          <div className="surface p-5">
            <h2 className="text-xl font-black">Recent Completed Jobs</h2>
            <div className="mt-4 grid gap-3">
              {recentCompleted.length ? recentCompleted.map((job) => <TechnicianJobCard key={recordId(job)} job={job} compact />) : <p className="text-sm muted">No completed jobs yet.</p>}
            </div>
          </div>
          <NotificationsPanel notifications={data.notifications || []} />
        </div>
      </div>
    </>
  );
}
