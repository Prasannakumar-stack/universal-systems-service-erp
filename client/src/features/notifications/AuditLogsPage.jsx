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
  DateFilterInput,
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
import { normalizeRole } from '../../utils/roles.js';

export function AuditLogsPage() {
  const { request, token, user } = useAuth();
  const { push } = useToast();
  const [moduleName, setModuleName] = useState('');
  const [actionName, setActionName] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [cleanupAction, setCleanupAction] = useState(null);
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [clearAllText, setClearAllText] = useState('');
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;
  const debouncedSearch = useDebouncedValue(userSearch);
  const filterQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (moduleName) params.set('module', moduleName);
    if (actionName) params.set('action', actionName);
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const text = params.toString();
    return text ? `?${text}` : '';
  }, [actionName, dateFrom, dateTo, debouncedSearch, moduleName]);
  const query = useMemo(() => {
    const params = new URLSearchParams(filterQuery ? filterQuery.slice(1) : '');
    params.set('page', String(page));
    params.set('limit', String(limit));
    return `?${params}`;
  }, [filterQuery, limit, page]);
  const { data, loading, error, reload } = useResource(() => request(`/audit-logs${query}`), [request, query]);
  const { data: statsData, reload: reloadStats } = useResource(() => request(`/audit-logs/stats${filterQuery}`), [request, filterQuery]);

  useEffect(() => {
    setPage(1);
  }, [moduleName, actionName, debouncedSearch, dateFrom, dateTo]);

  const hasActiveFilters = Boolean(moduleName || actionName || userSearch.trim() || dateFrom || dateTo);

  function resetFilters() {
    setModuleName('');
    setActionName('');
    setUserSearch('');
    setDateFrom('');
    setDateTo('');
  }

  const canMaintainAuditLogs = ['admin', 'super_admin'].includes(normalizeRole(user?.role));

  async function exportAuditCsv() {
    setExporting(true);
    try {
      const response = await fetch(`${apiBase}/audit-logs/export.csv${filterQuery}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      push('Audit logs exported successfully.', 'success');
    } catch {
      push('Unable to export audit logs.', 'error');
    } finally {
      setExporting(false);
    }
  }

  function openCleanup(action) {
    setCleanupAction(action);
    setClearAllText('');
  }

  function closeCleanup() {
    if (cleanupBusy) return;
    setCleanupAction(null);
    setClearAllText('');
  }

  async function confirmCleanup() {
    if (!cleanupAction || cleanupBusy) return;
    setCleanupBusy(true);
    try {
      if (cleanupAction.type === 'all') {
        await request('/audit-logs/all', {
          method: 'DELETE',
          body: JSON.stringify({ confirmation: clearAllText })
        });
      } else {
        await request(`/audit-logs/older-than/${cleanupAction.days}`, { method: 'DELETE' });
      }
      push('Audit logs cleared successfully.', 'success');
      setCleanupAction(null);
      setClearAllText('');
      reload({ silent: true });
      reloadStats({ silent: true });
    } catch {
      push('Unable to clear audit logs.', 'error');
    } finally {
      setCleanupBusy(false);
    }
  }

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

  const jsonText = (value, emptyText) => {
    if (value == null || (typeof value === 'object' && !Object.keys(value).length)) return emptyText;
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return emptyText;
    }
  };
  const logs = data?.logs || data?.data || [];
  const pagination = paginationFrom(data, logs.length, limit);
  const auditSummary = {
    total: data?.pagination?.total || logs.length,
    today: logs.filter((log) => isToday(log.createdAt)).length,
    workOrder: logs.filter((log) => log.module === 'work_order').length,
    billing: logs.filter((log) => ['invoice', 'payment', 'document'].includes(log.module)).length,
    inventory: logs.filter((log) => log.module === 'inventory').length
  };
  const totalLogCount = Number(statsData?.total ?? auditSummary.total ?? 0);
  const filteredLogCount = Number(statsData?.filteredTotal ?? auditSummary.total ?? 0);
  const oldestLogDate = statsData?.oldestLogDate ? formatDate(statsData.oldestLogDate) : 'No logs yet';

  return (
    <div className="admin-control-page audit-logs-page">
      <section className="admin-control-hero mb-5">
        <div className="relative z-[1]">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Audit Logs</p>
            <span className="admin-premium-badge">Admin Only</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Audit Logs</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 muted">Track important status, stock, payment, invoice, document, and account changes.</p>
        </div>
      </section>

      <div className="surface admin-filter-bar mb-5 grid gap-3 p-4 xl:grid-cols-[190px_220px_minmax(260px,1fr)_150px_150px_auto]">
        <select className="input" value={moduleName} onChange={(event) => setModuleName(event.target.value)}>
          <option value="">All modules</option>
          {['booking', 'work_order', 'inventory', 'invoice', 'payment', 'document', 'communication', 'amc', 'customer'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="input" value={actionName} onChange={(event) => setActionName(event.target.value)}>
          <option value="">All actions</option>
          {['booking_created', 'invoice_generated', 'created', 'updated', 'payment_recorded', 'stock_movement', 'stock_changed', 'status_changed', 'part_used', 'amc_visit_work_order_created', 'auto_assigned'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <SearchBox value={userSearch} onChange={setUserSearch} placeholder="Filter by user" />
        <DateFilterInput value={dateFrom} onChange={setDateFrom} placeholder="From date" ariaLabel="Audit log from date" />
        <DateFilterInput value={dateTo} onChange={setDateTo} placeholder="To date" ariaLabel="Audit log to date" />
        <button type="button" className="btn btn-secondary admin-compact-button" disabled={!hasActiveFilters} onClick={resetFilters}>Reset Filters</button>
      </div>

      <section className="audit-maintenance-card surface mb-5">
        <div className="audit-maintenance-main">
          <div className="audit-maintenance-icon">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Audit Log Maintenance</p>
            <h2 className="mt-1 text-lg font-black">Audit Log Maintenance</h2>
            <p className="mt-1 text-sm muted">Audit logs help track important system activity. Old logs can be exported and cleared safely.</p>
            <div className="audit-maintenance-stats">
              <span><b>{totalLogCount}</b><small>Total logs</small></span>
              <span><b>{oldestLogDate}</b><small>Oldest log date</small></span>
              {hasActiveFilters ? <span><b>{filteredLogCount}</b><small>Filtered logs</small></span> : null}
            </div>
          </div>
        </div>
        <div className="audit-maintenance-actions">
          <button type="button" className="btn btn-secondary admin-compact-button" disabled={exporting} onClick={exportAuditCsv}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Export CSV
          </button>
          {canMaintainAuditLogs ? (
            <>
              <button type="button" className="btn btn-secondary admin-compact-button" onClick={() => openCleanup({ type: 'older', days: 90 })}>
                Clear logs older than 90 days
              </button>
              <button type="button" className="btn btn-secondary admin-compact-button" onClick={() => openCleanup({ type: 'older', days: 180 })}>
                Clear logs older than 180 days
              </button>
              <div className="audit-maintenance-danger">
                <span>Danger Zone</span>
                <button type="button" className="btn btn-danger admin-compact-button" onClick={() => openCleanup({ type: 'all' })}>
                  Clear all audit logs
                </button>
              </div>
            </>
          ) : null}
        </div>
      </section>

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AdminMetricCard icon={ReceiptText} label="Total Logs" value={auditSummary.total} helper="Visible audit records" tone="blue" />
        <AdminMetricCard icon={CalendarClock} label="Today's Changes" value={auditSummary.today} helper="Logged today" tone="cyan" />
        <AdminMetricCard icon={Wrench} label="Work Order Changes" value={auditSummary.workOrder} helper="Service activity" tone="blue" />
        <AdminMetricCard icon={CreditCard} label="Billing Changes" value={auditSummary.billing} helper="Invoice/payment/docs" tone="green" />
        <AdminMetricCard icon={Boxes} label="Inventory Changes" value={auditSummary.inventory} helper="Stock activity" tone="amber" />
      </div>

      {!logs.length ? <EmptyState icon={ReceiptText} title="No audit logs" message="No audit records match the current filters." action={hasActiveFilters ? <button type="button" className="btn btn-secondary" onClick={resetFilters}>Reset Filters</button> : null} /> : (
        <>
        <div className="table-wrap admin-table-wrap bg-[var(--surface)]">
          <table className="data-table audit-table">
            <thead><tr><th>Date</th><th>User</th><th>Action</th><th>Module</th><th>Before / After</th></tr></thead>
            <tbody className="divide-y divide-[var(--line)]">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap">{formatDate(log.createdAt)}</td>
                  <td>
                    <span className="block font-bold text-slate-100">{log.userId?.name || log.userId?.username || '-'}</span>
                    <span className="text-xs muted">{log.userId?.role || 'System user'}</span>
                  </td>
                  <td><ActionBadge action={log.action} /></td>
                  <td><ModuleBadge moduleName={log.module} /></td>
                  <td>
                    <button type="button" className="btn btn-secondary admin-table-button" onClick={() => setSelectedLog(log)}>
                      View Changes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <PaginationControls pagination={pagination} onPageChange={setPage} />
        </>
      )}
      {selectedLog ? (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-black/65 p-4" onClick={() => setSelectedLog(null)}>
          <div className="surface admin-modal max-h-[90vh] w-full max-w-5xl overflow-hidden p-0 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="audit-log-changes-title" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-5">
              <div>
                <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">ADMIN ONLY</p>
                <h2 id="audit-log-changes-title" className="mt-1 text-xl font-black">Audit Log Changes</h2>
                <p className="mt-2 text-sm muted">{auditSummaryLine(selectedLog)}</p>
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
                  ['Action', humanActionLabel(selectedLog.action)],
                  ['Module', humanModuleLabel(selectedLog.module)]
                ].map(([label, value]) => (
                  <div key={label} className="audit-summary-card">
                    <p className="label">{label}</p>
                    <p className="mt-1 break-words text-sm font-bold">{value}</p>
                  </div>
                ))}
              </div>
              <div className="audit-human-summary mt-5">
                <p className="label">Summary</p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-100">{humanAuditSummary(selectedLog)}</p>
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="label mb-2">Before</p>
                  <pre className="audit-json-box">{jsonText(selectedLog.before, 'No previous value')}</pre>
                </div>
                <div>
                  <p className="label mb-2">After</p>
                  <pre className="audit-json-box">{jsonText(selectedLog.after, 'No updated value')}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
      {cleanupAction?.type === 'older' ? (
        <ConfirmModal
          title="Clear old audit logs?"
          message="This will permanently remove audit logs older than the selected period. Business data will not be affected."
          confirmLabel="Clear Old Logs"
          loading={cleanupBusy}
          loadingLabel="Clearing..."
          onCancel={closeCleanup}
          onConfirm={confirmCleanup}
        />
      ) : null}
      {cleanupAction?.type === 'all' ? (
        <AuditClearAllModal
          value={clearAllText}
          loading={cleanupBusy}
          onChange={setClearAllText}
          onCancel={closeCleanup}
          onConfirm={confirmCleanup}
        />
      ) : null}
    </div>
  );
}

function AuditClearAllModal({ value, loading, onChange, onCancel, onConfirm }) {
  const enabled = value === 'CLEAR AUDIT LOGS';
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4">
      <div className="surface audit-clear-all-modal w-full max-w-md p-5">
        <div className="flex items-start gap-3">
          <div className="audit-clear-all-icon"><AlertTriangle className="h-5 w-5" /></div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-rose-200">Danger Zone</p>
            <h2 className="mt-1 text-lg font-black">Clear all audit logs?</h2>
            <p className="mt-2 text-sm leading-6 muted">
              This permanently removes all audit history. Business data will not be affected, but activity history cannot be restored.
            </p>
          </div>
        </div>
        <label className="mt-5 block">
          <span className="label">Type CLEAR AUDIT LOGS to confirm</span>
          <input
            className="input mt-2"
            value={value}
            disabled={loading}
            onChange={(event) => onChange(event.target.value)}
            placeholder="CLEAR AUDIT LOGS"
          />
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" disabled={loading} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" disabled={loading || !enabled} onClick={onConfirm}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Clear all audit logs
          </button>
        </div>
      </div>
    </div>
  );
}

function AdminMetricCard({ icon: Icon, label, value, helper, tone = 'blue' }) {
  return (
    <div className={`admin-metric-card admin-metric-${tone}`}>
      <div className="admin-metric-icon"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0">
        <p className="admin-metric-label">{label}</p>
        <p className="admin-metric-value">{value}</p>
        <p className="admin-metric-helper">{helper}</p>
      </div>
    </div>
  );
}

function humanActionLabel(action = '') {
  const known = {
    invoice_generated: 'Invoice Generated',
    status_changed: 'Status Changed',
    part_used: 'Part Used',
    stock_changed: 'Stock Changed',
    stock_movement: 'Stock Movement',
    amc_visit_work_order_created: 'AMC Visit Job Created',
    amc_contract_created: 'AMC Contract Created',
    amc_contract_archived: 'AMC Contract Archived',
    amc_contract_moved_to_trash: 'AMC Contract Moved To Trash',
    amc_contract_restored: 'AMC Contract Restored',
    amc_contract_permanently_deleted: 'AMC Contract Permanently Deleted',
    inventory_part_disabled: 'Inventory Part Disabled',
    inventory_part_moved_to_trash: 'Inventory Part Moved To Trash',
    inventory_part_restored: 'Inventory Part Restored',
    inventory_part_permanently_deleted: 'Inventory Part Permanently Deleted',
    work_order_archived: 'Work Order Archived',
    work_order_moved_to_trash: 'Work Order Moved To Trash',
    work_order_restored: 'Work Order Restored',
    work_order_permanently_deleted: 'Work Order Permanently Deleted',
    payment_recorded: 'Payment Recorded',
    booking_created: 'Booking Created',
    auto_assigned: 'Auto Assigned',
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted'
  };
  return known[action] || String(action || '-').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function humanModuleLabel(moduleName = '') {
  return String(moduleName || '-').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function actionTone(action = '') {
  const text = String(action).toLowerCase();
  if (text.includes('delete') || text.includes('error') || text.includes('failed')) return 'red';
  if (text.includes('stock') || text.includes('part')) return 'amber';
  if (text.includes('payment')) return 'green';
  if (text.includes('invoice') || text.includes('document')) return 'blue';
  if (text.includes('status')) return 'cyan';
  return 'neutral';
}

function ActionBadge({ action }) {
  return <span className={`audit-action-badge audit-action-${actionTone(action)}`}>{humanActionLabel(action)}</span>;
}

function ModuleBadge({ moduleName }) {
  const tone = {
    invoice: 'blue',
    payment: 'green',
    inventory: 'amber',
    work_order: 'cyan',
    amc: 'blue',
    customer: 'neutral',
    booking: 'cyan',
    document: 'blue',
    communication: 'neutral'
  }[moduleName] || 'neutral';
  return <span className={`audit-module-badge audit-module-${tone}`}>{humanModuleLabel(moduleName)}</span>;
}

function auditSummaryLine(log) {
  return `${humanActionLabel(log?.action)} by ${log?.userId?.name || log?.userId?.username || 'System'} on ${formatDate(log?.createdAt)}.`;
}

function auditSafeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function firstAuditValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '');
}

function humanAuditSummary(log) {
  const after = auditSafeObject(log?.after);
  const before = auditSafeObject(log?.before);
  const user = log?.userId?.name || log?.userId?.username || 'Admin';
  const action = humanActionLabel(log?.action);
  const moduleName = humanModuleLabel(log?.module);
  const invoiceNumber = firstAuditValue(after.invoiceNumber, before.invoiceNumber, log?.invoiceNumber);
  const amount = firstAuditValue(after.amount, after.total, after.totalAmount, after.paidAmount, before.amount, log?.amount);
  const partName = firstAuditValue(after.partName, after.name, before.partName, before.name, log?.partName);
  const workOrderId = firstAuditValue(after.workOrderId, before.workOrderId, log?.workOrderId, log?.recordId);

  if (log?.action === 'invoice_generated') {
    const invoiceLabel = invoiceNumber || 'Invoice';
    const amountText = amount != null ? ` for ${currency(amount)}` : '';
    return `${invoiceLabel} was generated${amountText} by ${user}.`;
  }

  if (log?.action === 'service_charge_updated') {
    return `Service charge was updated by ${user}.`;
  }

  if (log?.action === 'part_used') {
    const partText = partName ? `${partName} was` : 'Part was';
    const workOrderText = workOrderId ? ` in work order ${workOrderId}` : ' in the work order';
    return `${partText} added/updated${workOrderText} by ${user}.`;
  }

  return `${user} performed ${action} in ${moduleName} module.`;
}
