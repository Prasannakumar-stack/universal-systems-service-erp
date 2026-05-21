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
import { can } from '../../utils/roles.js';

export function StockMovementsPage() {
  const { request, user } = useAuth();
  const location = useLocation();
  const canEditStock = can(user, 'edit_stock');
  const canExportReports = can(user, 'export_reports');
  const partIdParam = useMemo(() => new URLSearchParams(location.search).get('partId') || '', [location.search]);
  const [movementType, setMovementType] = useState('');
  const [partId, setPartId] = useState(partIdParam);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const debouncedSearch = useDebouncedValue(search);
  const movementQuery = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (movementType) params.set('type', movementType);
    if (partId) params.set('partId', partId);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return `?${params}`;
  }, [dateFrom, dateTo, debouncedSearch, limit, movementType, page, partId]);
  const { data, loading, error, reload } = useResource(async () => {
    const [movements, inventory] = await Promise.all([request(`/stock-movements${movementQuery}`), request('/inventory?limit=100')]);
    return { ...movements, parts: inventory.parts || [], inventorySummary: inventory.summary };
  }, [request, movementQuery]);
  const { push } = useToast();
  const [form, setForm] = useState({ partId: '', type: 'ADD', quantity: 1, source: 'Manual', note: '' });
  const manualMovementReasons = ['Damaged item', 'Physical count correction', 'Returned by customer', 'AMC replacement', 'Wrong previous entry'];

  useEffect(() => {
    setPartId(partIdParam);
  }, [partIdParam]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, movementType, partId, dateFrom, dateTo]);

  async function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    const quantity = Number(form.quantity || 0);
    if (!quantity || (form.type !== 'ADJUST' && quantity <= 0)) {
      push(form.type === 'ADJUST' ? 'Adjustment quantity cannot be zero' : 'Quantity must be greater than 0', 'error');
      return;
    }
    try {
      await preserveScroll(async () => {
        await request('/stock-movements', { method: 'POST', body: JSON.stringify(form) });
        setForm({ partId: '', type: 'ADD', quantity: 1, source: 'Manual', note: '' });
        push('Stock movement recorded');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  const movements = data.movements || data.data || [];
  const filteredMovements = movements.filter((movement) => {
    const term = debouncedSearch.trim().toLowerCase();
    if (!term) return true;
    return [
      movement.partId?.partName,
      movement.source,
      movement.note,
      movement.userId?.name,
      movement.userId?.username
    ].filter(Boolean).join(' ').toLowerCase().includes(term);
  });
  const lowStockAlerts = Number(data.inventorySummary?.lowStock || 0) + Number(data.inventorySummary?.outOfStock || 0) || (data.parts || []).filter((part) => inventoryStockStatus(part) !== 'in').length;
  const movementTotals = {
    addedToday: movements.filter((movement) => movement.type === 'ADD' && isToday(movement.createdAt)).reduce((sum, movement) => sum + Number(movement.quantity || 0), 0),
    usedToday: movements.filter((movement) => movement.type === 'USED' && isToday(movement.createdAt)).reduce((sum, movement) => sum + Number(movement.quantity || 0), 0),
    returnedToday: movements.filter((movement) => movement.type === 'RETURN' && isToday(movement.createdAt)).reduce((sum, movement) => sum + Number(movement.quantity || 0), 0),
    adjustments: movements.filter((movement) => movement.type === 'ADJUST').length,
    lowStockAlerts,
    ...(data.summary || {})
  };
  const movementTypes = ['ADD', 'USED', 'RETURN', 'ADJUST'];
  const movementQuantity = Number(form.quantity || 0);
  const isMovementFormValid = Boolean(form.partId && form.type && form.source && movementQuantity && (form.type === 'ADJUST' || movementQuantity > 0));
  const hasLedgerFilters = Boolean(search || movementType || partId || dateFrom || dateTo);
  const ledgerKpis = [
    { label: 'Added Today', value: movementTotals.addedToday, helper: 'Units received into stock', icon: PackagePlus, tone: 'green' },
    { label: 'Used Today', value: movementTotals.usedToday, helper: 'Units consumed by jobs', icon: Wrench, tone: 'blue' },
    { label: 'Returned Today', value: movementTotals.returnedToday, helper: 'Units returned to stock', icon: PackagePlus, tone: 'cyan' },
    { label: 'Adjustments', value: movementTotals.adjustments, helper: 'Manual correction entries', icon: ReceiptText, tone: 'amber' },
    { label: 'Low Stock Alerts', value: movementTotals.lowStockAlerts, helper: 'Items below stock limit', icon: AlertTriangle, tone: movementTotals.lowStockAlerts > 0 ? 'red' : 'green' }
  ];
  const pagination = paginationFrom(data, filteredMovements.length, limit);

  function exportCsv() {
    const rows = [
      ['Date', 'Part', 'Type', 'Quantity', 'Source', 'Note', 'User'],
      ...filteredMovements.map((movement) => [
        formatDate(movement.createdAt),
        movement.partId?.partName || '',
        movement.type,
        movement.quantity,
        movement.source || '',
        movement.note || '',
        movement.userId?.name || movement.userId?.username || ''
      ])
    ];
    const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'stock-movements.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="stock-movements-page">
      <section className="erp-page-header inventory-erp-header mb-5">
        <div className="relative z-[1] flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--brand)]">Inventory Audit</p>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Stock Movement Ledger</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Every add, use, return, transfer, and adjustment is recorded for audit tracking.</p>
          </div>
          {canExportReports ? <button type="button" className="btn btn-secondary h-10 px-4" onClick={exportCsv}><Download className="h-4 w-4" />Export CSV</button> : null}
        </div>
      </section>
      <div className="surface mb-5 p-3">
        <div className="tabs-list inventory-tabs border-b-0">
          <Link className="tab-button" to="/admin/parts">Products / Parts</Link>
          <Link className="tab-button tab-button-active" to="/admin/stock-movements">Stock Movements</Link>
        </div>
      </div>
      <div className="inventory-kpi-grid mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {ledgerKpis.map((item) => <LedgerMetricCard key={item.label} {...item} />)}
      </div>
      <div className="surface inventory-filter-bar mb-5 grid items-center gap-3 p-4 xl:grid-cols-[minmax(280px,1fr)_150px_220px_155px_155px_auto]">
        <div className="min-w-0">
          <SearchBox value={search} onChange={setSearch} placeholder="Search part, source, user, note" />
        </div>
        <select className="input" value={movementType} onChange={(event) => setMovementType(event.target.value)}>
          <option value="">All types</option>
          {movementTypes.map((type) => <option key={type}>{type}</option>)}
        </select>
        <select className="input" value={partId} onChange={(event) => setPartId(event.target.value)}>
          <option value="">All parts</option>
          {data.parts.map((part) => <option key={part.id} value={part.id}>{part.partName}</option>)}
        </select>
        <label className="stock-date-filter relative block">
          <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 muted" />
          <input className="input pl-10" type="date" aria-label="Start date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </label>
        <label className="stock-date-filter relative block">
          <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 muted" />
          <input className="input pl-10" type="date" aria-label="End date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </label>
        <button
          type="button"
          className="btn btn-secondary stock-reset-filters-button h-10 whitespace-nowrap px-4"
          data-active={hasLedgerFilters ? 'true' : 'false'}
          onClick={() => {
            setSearch('');
            setMovementType('');
            setPartId('');
            setDateFrom('');
            setDateTo('');
          }}
        >
          Reset Filters
        </button>
        <p className="inventory-count-pill xl:col-span-6">Showing <b>{filteredMovements.length}</b> movement{filteredMovements.length === 1 ? '' : 's'}</p>
      </div>
      {canEditStock ? <form className="surface inventory-manual-form mb-5 grid gap-3 p-5 xl:grid-cols-[minmax(220px,1fr)_140px_120px_160px_minmax(220px,1fr)_auto]" onSubmit={submit}>
        <div className="xl:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">Manual Stock Movement</h2>
              <p className="mt-1 text-sm muted">Use manual movement only for physical stock correction.</p>
            </div>
          </div>
        </div>
        <label>
          <span className="label">Select part</span>
          <select className="input" value={form.partId} onChange={(event) => setForm((current) => ({ ...current, partId: event.target.value }))} required>
            <option value="">Select part</option>
            {data.parts.map((part) => <option key={part.id} value={part.id}>{part.partName} - {part.available} available</option>)}
          </select>
        </label>
        <label>
          <span className="label">Movement Type</span>
          <select className="input" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
            {movementTypes.map((type) => <option key={type}>{type}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Quantity</span>
          <input className="input" type="number" min={form.type === 'ADJUST' ? undefined : '1'} value={form.quantity} onChange={(event) => setForm((current) => ({ ...current, quantity: event.target.value }))} />
        </label>
        <label>
          <span className="label">Source</span>
          <select className="input" value={form.source} onChange={(event) => setForm((current) => ({ ...current, source: event.target.value }))}>
            {quickStockSources.map((source) => <option key={source}>{source}</option>)}
          </select>
        </label>
        <label>
          <span className="label">Note</span>
          <input className="input" value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
        </label>
        <button type="submit" className="btn btn-primary self-end disabled:cursor-not-allowed disabled:opacity-50" disabled={!isMovementFormValid}><Save className="h-4 w-4" />Save</button>
        {form.source === 'Manual' ? (
          <div className="flex flex-wrap gap-2 xl:col-span-6">
            {manualMovementReasons.map((reason) => (
              <button
                key={reason}
                type="button"
                className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:border-sky-300/30 hover:bg-sky-400/10"
                onClick={() => setForm((current) => ({ ...current, note: reason }))}
              >
                {reason}
              </button>
            ))}
          </div>
        ) : null}
      </form> : null}
      <p className="mb-3 text-xs font-semibold muted">Stock movements are recorded through the existing stock movement API and mirrored into audit logs.</p>
      {!filteredMovements.length ? (
        <EmptyState
          icon={ReceiptText}
          title="No stock movements recorded"
          message={hasLedgerFilters ? 'Try resetting the filters to review the full movement ledger.' : 'Add stock or use parts in a work order to generate movement history.'}
          action={hasLedgerFilters ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearch('');
                setMovementType('');
                setPartId('');
                setDateFrom('');
                setDateTo('');
              }}
            >
              Reset Filters
            </button>
          ) : <Link className="btn btn-secondary" to="/admin/parts">Open Products / Parts</Link>}
        />
      ) : (
        <>
        <div className="table-wrap stock-movements-table-wrap surface bg-[var(--surface)]">
          <table className="data-table stock-movements-table">
            <colgroup>
              <col className="stock-movement-col-date" />
              <col className="stock-movement-col-part" />
              <col className="stock-movement-col-movement" />
              <col className="stock-movement-col-qty" />
              <col className="stock-movement-col-source" />
              <col className="stock-movement-col-note" />
              <col className="stock-movement-col-user" />
            </colgroup>
          <thead><tr><th>Date</th><th>Part</th><th>Movement</th><th>Quantity / Balance</th><th>Source / Link</th><th>Note</th><th>User</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {filteredMovements.map((movement) => {
              const sourceId = recordId(movement.sourceId) || movement.sourceId;
              const sourceLabel = sourceId ? `WO-${String(sourceId).slice(-6).toUpperCase()}` : '-';
              return (
                <tr key={movement.id}>
                  <td>{formatDate(movement.createdAt)}</td>
                  <td className="font-bold">{movement.partId?.partName || '-'}</td>
                  <td>
                    <LedgerMovementBadge type={movement.type} />
                  </td>
                  <td>
                    <div className="stock-movement-stack">
                      <span>Qty: {movement.quantity}</span>
                      <span className="font-bold text-sky-100" title="Remaining stock after this movement">Balance: {movement.balanceAfter ?? '-'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="stock-movement-stack">
                      {sourceId ? <Link className="stock-source-link" to={`/admin/work-orders/${sourceId}`}>{movement.source || sourceLabel}</Link> : <span className="font-semibold text-slate-100">{movement.source || '-'}</span>}
                      {sourceId ? <Link className="stock-source-link" to={`/admin/work-orders/${sourceId}`}>{sourceLabel}</Link> : <span className="muted">—</span>}
                    </div>
                  </td>
                  <td><span className="stock-movement-note" title={movement.note || '-'}>{movement.note || '-'}</span></td>
                  <td><span className="block truncate text-sm font-semibold text-slate-200" title={movement.userId?.name || movement.userId?.username || '-'}>{movement.userId?.name || movement.userId?.username || '-'}</span></td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
        <PaginationControls pagination={pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function LedgerMetricCard({ icon: Icon, label, value, helper, tone = 'blue' }) {
  return (
    <div className={`inventory-kpi-card inventory-kpi-${tone}`}>
      <div className="inventory-kpi-icon"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0">
        <p className="inventory-kpi-label">{label}</p>
        <p className="inventory-kpi-value" title={String(value)}>{value}</p>
        <p className="inventory-kpi-helper">{helper}</p>
      </div>
    </div>
  );
}

function LedgerMovementBadge({ type }) {
  const tone = {
    ADD: 'border-emerald-300/25 bg-emerald-400/15 text-emerald-100',
    USED: 'border-sky-300/25 bg-sky-400/15 text-sky-100',
    RETURN: 'border-cyan-300/25 bg-cyan-400/15 text-cyan-100',
    ADJUST: 'border-amber-300/25 bg-amber-400/15 text-amber-100',
    TRANSFER: 'border-violet-300/25 bg-violet-400/15 text-violet-100'
  }[type] || 'border-slate-300/20 bg-slate-400/10 text-slate-200';
  const label = { ADJUST: 'ADJUSTMENT' }[type] || type || 'LOG';
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${tone}`}>{label}</span>;
}
