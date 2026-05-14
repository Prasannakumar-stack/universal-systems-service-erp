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

export function AuditLogsPage() {
  const { request } = useAuth();
  const [moduleName, setModuleName] = useState('');
  const [actionName, setActionName] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (moduleName) params.set('module', moduleName);
    if (actionName) params.set('action', actionName);
    return params.toString() ? `?${params}` : '';
  }, [moduleName, actionName]);
  const { data, loading, error } = useResource(() => request(`/audit-logs${query}`), [request, query]);

  useEffect(() => {
    if (!selectedLog) return undefined;
    function closeOnEscape(event) {
      if (event.key === 'Escape') setSelectedLog(null);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedLog]);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  const jsonText = (value, emptyText) => (value == null ? emptyText : JSON.stringify(value, null, 2));
  const logs = (data.logs || []).filter((log) => {
    const userText = `${log.userId?.name || ''} ${log.userId?.username || ''}`.toLowerCase();
    const matchesUser = !userSearch.trim() || userText.includes(userSearch.trim().toLowerCase());
    const created = new Date(log.createdAt);
    const matchesFrom = !dateFrom || created >= new Date(dateFrom);
    const matchesTo = !dateTo || created <= new Date(`${dateTo}T23:59:59`);
    return matchesUser && matchesFrom && matchesTo;
  });

  return (
    <>
      <PageHeader title="Audit Logs" eyebrow="ADMIN ONLY">
        Company internal activity history. Tracks important status, stock, payment, invoice, and document changes.
      </PageHeader>
      <div className="surface mb-5 grid gap-3 p-4 xl:grid-cols-[220px_220px_1fr_160px_160px]">
        <select className="input" value={moduleName} onChange={(event) => setModuleName(event.target.value)}>
          <option value="">All modules</option>
          {['booking', 'work_order', 'inventory', 'invoice', 'payment', 'document', 'communication'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="input" value={actionName} onChange={(event) => setActionName(event.target.value)}>
          <option value="">All actions</option>
          {['booking_created', 'invoice_generated', 'created', 'updated', 'payment_recorded', 'stock_movement', 'stock_changed', 'status_changed', 'auto_assigned'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <SearchBox value={userSearch} onChange={setUserSearch} placeholder="Filter by user" />
        <input className="input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <input className="input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
      </div>
      {!logs.length ? <EmptyState title="No audit logs" message="No audit records match the current filters." /> : (
        <Table>
          <thead><tr><th>Date</th><th>User</th><th>Action</th><th>Module</th><th>Before / After</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{formatDate(log.createdAt)}</td>
                <td>{log.userId?.name || log.userId?.username || '-'}</td>
                <td className="font-bold">{log.action}</td>
                <td>{log.module}</td>
                <td>
                  <button type="button" className="btn btn-secondary py-2" onClick={() => setSelectedLog(log)}>
                    View JSON changes
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {selectedLog ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/65 p-4" onClick={() => setSelectedLog(null)}>
          <div className="surface max-h-[90vh] w-full max-w-5xl overflow-hidden p-0 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="audit-log-changes-title" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">ADMIN ONLY</p>
                <h2 id="audit-log-changes-title" className="mt-1 text-xl font-black">Audit Log Changes</h2>
              </div>
              <button type="button" className="icon-button h-9 w-9" onClick={() => setSelectedLog(null)} aria-label="Close audit log changes">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="max-h-[calc(90vh-5rem)] overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['Date', formatDate(selectedLog.createdAt)],
                  ['User', selectedLog.userId?.name || selectedLog.userId?.username || '-'],
                  ['Action', selectedLog.action || '-'],
                  ['Module', selectedLog.module || '-']
                ].map(([label, value]) => (
                  <div key={label} className="rounded-card bg-[var(--surface-2)] p-3">
                    <p className="label">{label}</p>
                    <p className="mt-1 break-words text-sm font-bold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="label mb-2">Before</p>
                  <pre className="max-h-[56vh] overflow-auto rounded-card border border-white/10 bg-black/35 p-4 font-mono text-xs leading-5 text-slate-100">{jsonText(selectedLog.before, 'No previous value')}</pre>
                </div>
                <div>
                  <p className="label mb-2">After</p>
                  <pre className="max-h-[56vh] overflow-auto rounded-card border border-white/10 bg-black/35 p-4 font-mono text-xs leading-5 text-slate-100">{jsonText(selectedLog.after, 'No updated value')}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
