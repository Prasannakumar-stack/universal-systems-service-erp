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

export function AMCRenewalsPage() {
  const { request } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useResource(() => request('/amc/renewals'), [request]);
  const renewals = data?.renewals || [];
  const expiring = renewals.filter((contract) => contract.renewalStatus === 'Renewal Due');
  const expired = renewals.filter((contract) => contract.renewalStatus === 'Expired');

  async function createJob(contract) {
    try {
      const result = await request(`/amc/contracts/${recordId(contract)}/work-orders`, {
        method: 'POST',
        body: JSON.stringify({ issue: `AMC renewal service visit for ${contract.contractType}` })
      });
      push('Repair & Service Job created from AMC');
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
        title="AMC Renewals"
        eyebrow="AMC & Contracts"
        action={<Link className="btn btn-primary" to="/admin/amc-contracts"><Plus className="h-4 w-4" />New Contract</Link>}
      >
        Review contracts expiring in 30 days and expired AMC agreements.
      </PageHeader>
      <div className="surface mb-5 p-3">
        <div className="tabs-list">
          <Link className="tab-button" to="/admin/amc-contracts">Contracts</Link>
          <Link className="tab-button" to="/admin/amc-schedule">Schedule</Link>
          <Link className="tab-button tab-button-active" to="/admin/amc-renewals">Renewals</Link>
          <Link className="tab-button" to="/admin/warranties">Warranties</Link>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard icon={AlertTriangle} label="Expiring in 30 Days" value={expiring.length} tone="yellow" />
        <StatCard icon={AlertTriangle} label="Expired Contracts" value={expired.length} tone="red" />
      </div>
      <div className="surface mt-6 p-5">
        {!renewals.length ? (
          <EmptyState title="No AMC renewals due" message="Renewal reminders will appear when contracts are near expiry." action={<Link className="btn btn-secondary" to="/admin/amc-contracts">View Contracts</Link>} />
        ) : (
          <Table>
            <thead><tr><th>Contract</th><th>Customer</th><th>Phone</th><th>Contract Type</th><th>End Date</th><th>Renewal Status</th><th>Value</th><th>Action</th></tr></thead>
            <tbody>
              {renewals.map((contract) => (
                <tr key={recordId(contract)}>
                  <td className="font-bold">{contract.contractId}</td>
                  <td>{contract.customerName}</td>
                  <td>{contract.phone}</td>
                  <td>{contract.contractType}</td>
                  <td>{formatDate(contract.endDate)}</td>
                  <td><AmcStatusBadge status={contract.renewalStatus} /></td>
                  <td>{currency(contract.contractValue)}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <a className="btn btn-secondary py-2" href={amcWhatsappHref(contract)} target="_blank" rel="noreferrer"><Send className="h-4 w-4" />WhatsApp</a>
                      <button className="btn btn-primary py-2" onClick={() => createJob(contract)}>Create Job</button>
                    </div>
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
