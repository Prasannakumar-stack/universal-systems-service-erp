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

export function AMCSchedulePage() {
  const { request } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [status, setStatus] = useState('');
  const { data, loading, error, reload } = useResource(() => request('/amc/schedule'), [request]);
  const schedule = data?.schedule || [];
  const visibleSchedule = status ? schedule.filter((visit) => visit.status === status) : schedule;

  async function createJob(visit) {
    try {
      const result = await request(`/amc/contracts/${visit.contractId}/work-orders`, {
        method: 'POST',
        body: JSON.stringify({ visitId: visit.id, issue: `AMC scheduled visit for ${visit.contractType}` })
      });
      push('Repair & Service Job created from AMC visit');
      reload();
      navigate(`/admin/work-orders/${recordId(result.workOrder)}`);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <PageHeader
        title="AMC Schedule"
        eyebrow="AMC & Contracts"
        action={<Link className="btn btn-secondary" to="/admin/amc-contracts"><FileText className="h-4 w-4" />Contracts</Link>}
      >
        Track upcoming, due today, overdue, and completed AMC service visits.
      </PageHeader>
      <div className="surface mb-5 p-3">
        <div className="tabs-list">
          <Link className="tab-button" to="/admin/amc-contracts">Contracts</Link>
          <Link className="tab-button tab-button-active" to="/admin/amc-schedule">Schedule</Link>
          <Link className="tab-button" to="/admin/amc-renewals">Renewals</Link>
          <Link className="tab-button" to="/admin/warranties">Warranties</Link>
        </div>
      </div>
      <div className="surface p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <select className="input max-w-xs" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {['Upcoming', 'Due Today', 'Overdue', 'Completed'].map((item) => <option key={item}>{item}</option>)}
          </select>
          <Link className="btn btn-secondary" to="/admin/amc-renewals"><AlertTriangle className="h-4 w-4" />Renewals</Link>
        </div>
        {!visibleSchedule.length ? (
          <EmptyState title="No AMC visits scheduled" message="Visits will appear after AMC contracts are created." action={<Link className="btn btn-primary" to="/admin/amc-contracts">Create AMC Contract</Link>} />
        ) : (
          <Table>
            <thead><tr><th>Customer</th><th>Contract</th><th>Service Type</th><th>Scheduled Date</th><th>Technician</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {visibleSchedule.map((visit) => (
                <tr key={visit.id}>
                  <td className="font-bold">{visit.customerName}<span className="block text-xs muted">{visit.phone}</span></td>
                  <td>{visit.contractCode}</td>
                  <td>{visit.serviceType}</td>
                  <td>{formatDate(visit.scheduledDate)}</td>
                  <td>{visit.technicianId?.name || 'Unassigned'}</td>
                  <td><AmcStatusBadge status={visit.status} /></td>
                  <td>
                    {recordId(visit.workOrderId) ? (
                      <Link className="btn btn-secondary py-2" to={`/admin/work-orders/${recordId(visit.workOrderId)}`}>Open Job</Link>
                    ) : (
                      <button className="btn btn-primary py-2" onClick={() => createJob(visit)}><Wrench className="h-4 w-4" />Create Job</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}
