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

export function StockMovementsPage() {
  const { request } = useAuth();
  const location = useLocation();
  const partIdParam = useMemo(() => new URLSearchParams(location.search).get('partId') || '', [location.search]);
  const [movementType, setMovementType] = useState('');
  const [partId, setPartId] = useState(partIdParam);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');
  const movementQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (movementType) params.set('type', movementType);
    if (partId) params.set('partId', partId);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return params.toString() ? `?${params}` : '';
  }, [movementType, partId, dateFrom, dateTo]);
  const { data, loading, error, reload } = useResource(async () => {
    const [movements, inventory] = await Promise.all([request(`/stock-movements${movementQuery}`), request('/inventory')]);
    return { ...movements, parts: inventory.parts || [] };
  }, [request, movementQuery]);
  const { push } = useToast();
  const [form, setForm] = useState({ partId: '', type: 'ADD', quantity: 1, source: 'Manual', note: '' });

  useEffect(() => {
    setPartId(partIdParam);
  }, [partIdParam]);

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

  const movements = data.movements || [];
  const filteredMovements = movements.filter((movement) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return [
      movement.partId?.partName,
      movement.source,
      movement.note,
      movement.userId?.name,
      movement.userId?.username
    ].filter(Boolean).join(' ').toLowerCase().includes(term);
  });
  const lowStockAlerts = (data.parts || []).filter((part) => inventoryStockStatus(part) !== 'in').length;
  const movementTotals = {
    addedToday: movements.filter((movement) => movement.type === 'ADD' && isToday(movement.createdAt)).reduce((sum, movement) => sum + Number(movement.quantity || 0), 0),
    usedToday: movements.filter((movement) => movement.type === 'USED' && isToday(movement.createdAt)).reduce((sum, movement) => sum + Number(movement.quantity || 0), 0),
    returnedToday: movements.filter((movement) => movement.type === 'RETURN' && isToday(movement.createdAt)).reduce((sum, movement) => sum + Number(movement.quantity || 0), 0),
    adjustments: movements.filter((movement) => movement.type === 'ADJUST').length,
    lowStockAlerts
  };

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
      <PageHeader
        title="Stock Movement Ledger"
        eyebrow="Inventory Audit"
        action={<button type="button" className="btn btn-secondary" onClick={exportCsv}><Download className="h-4 w-4" />Export CSV</button>}
      >
        Every stock add, use, return, transfer, and adjustment is tracked here.
      </PageHeader>
      <div className="surface mb-5 p-3">
        <div className="tabs-list">
          <Link className="tab-button" to="/admin/parts">Products / Parts</Link>
          <Link className="tab-button tab-button-active" to="/admin/stock-movements">Stock Movements</Link>
        </div>
      </div>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={PackagePlus} label="Added Today" value={movementTotals.addedToday} tone="green" />
        <StatCard icon={Wrench} label="Used Today" value={movementTotals.usedToday} />
        <StatCard icon={PackagePlus} label="Returned Today" value={movementTotals.returnedToday} tone="green" />
        <StatCard icon={ReceiptText} label="Adjustments" value={movementTotals.adjustments} tone="yellow" />
        <StatCard icon={AlertTriangle} label="Low Stock Alerts" value={movementTotals.lowStockAlerts} tone="yellow" />
      </div>
      <div className="surface mb-5 grid gap-3 p-4 md:grid-cols-[1fr_180px_220px_160px_160px]">
        <SearchBox value={search} onChange={setSearch} placeholder="Search part, source, user, note" />
        <select className="input" value={movementType} onChange={(event) => setMovementType(event.target.value)}>
          <option value="">All types</option>
          {['ADD', 'USED', 'RETURN', 'ADJUST'].map((type) => <option key={type}>{type}</option>)}
        </select>
        <select className="input" value={partId} onChange={(event) => setPartId(event.target.value)}>
          <option value="">All parts</option>
          {data.parts.map((part) => <option key={part.id} value={part.id}>{part.partName}</option>)}
        </select>
        <input className="input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <input className="input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
      </div>
      <form className="surface mb-5 grid gap-3 p-5 md:grid-cols-[1fr_140px_120px_160px_1fr_auto]" onSubmit={submit}>
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
            {['ADD', 'USED', 'RETURN', 'ADJUST'].map((type) => <option key={type}>{type}</option>)}
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
        <button type="submit" className="btn btn-primary self-end">Save</button>
      </form>
      <p className="mb-3 text-xs font-semibold muted">Stock movements are recorded through the existing stock movement API and mirrored into audit logs.</p>
      {!filteredMovements.length ? <EmptyState title="No stock movement recorded yet" message="Stock movements will appear when parts are added, used, returned, or adjusted." /> : (
        <div className="table-wrap stock-movements-table-wrap bg-[var(--surface)]">
          <table className="data-table stock-movements-table">
            <colgroup>
              <col className="stock-movement-col-date" />
              <col className="stock-movement-col-part" />
              <col className="stock-movement-col-movement" />
              <col className="stock-movement-col-source" />
              <col className="stock-movement-col-note" />
              <col className="stock-movement-col-user" />
            </colgroup>
          <thead><tr><th>Date</th><th>Part</th><th>Movement</th><th>Source / Link</th><th>Note</th><th>User</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {filteredMovements.map((movement) => {
              const sourceId = recordId(movement.sourceId) || movement.sourceId;
              const sourceLabel = sourceId ? `WO-${String(sourceId).slice(-6).toUpperCase()}` : '-';
              return (
                <tr key={movement.id}>
                  <td>{formatDate(movement.createdAt)}</td>
                  <td className="font-bold">{movement.partId?.partName || '-'}</td>
                  <td>
                    <div className="stock-movement-stack">
                      <MovementTypeBadge type={movement.type} quantity={movement.quantity} />
                      <span>Qty: {movement.quantity}</span>
                      <span className="font-bold text-sky-100">Balance: {movement.balanceAfter ?? '-'}</span>
                    </div>
                  </td>
                  <td>
                    <div className="stock-movement-stack">
                      <span className="font-semibold text-slate-100">{movement.source || '-'}</span>
                      {sourceId ? <Link className="text-sky-100 hover:text-[var(--brand)]" to={`/admin/work-orders/${sourceId}`}>{sourceLabel}</Link> : <span className="muted">-</span>}
                    </div>
                  </td>
                  <td><span className="stock-movement-note" title={movement.note || '-'}>{movement.note || '-'}</span></td>
                  <td>{movement.userId?.name || movement.userId?.username || '-'}</td>
                </tr>
              );
            })}
          </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
