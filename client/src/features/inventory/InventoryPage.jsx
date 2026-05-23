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

const inventoryUnitTypes = ['Piece', 'Box', 'Meter', 'Pack'];

export function InventoryPage() {
  const { request, user } = useAuth();
  const { push } = useToast();
  const canCreatePart = can(user, 'create_part');
  const canEditStock = can(user, 'edit_stock');
  const canViewStockMovements = can(user, 'view_stock_movements');
  const canDeletePart = can(user, 'delete_part');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState(null);
  const [quickStockPart, setQuickStockPart] = useState(null);
  const [deletePart, setDeletePart] = useState(null);
  const limit = 10;
  const debouncedSearch = useDebouncedValue(search);
  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (category) params.set('category', category);
    if (stockStatus) params.set('stockStatus', stockStatus);
    if (sortBy) params.set('sortBy', sortBy);
    return `?${params}`;
  }, [category, debouncedSearch, limit, page, sortBy, stockStatus]);
  const { data, loading, error, reload } = useResource(() => request(`/inventory${query}`), [request, query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, category, stockStatus, sortBy]);

  const parts = data?.parts || data?.data || [];
  const categories = useMemo(() => (data?.categories?.length ? data.categories : Array.from(new Set(parts.map((part) => part.category || 'General'))).sort()), [data?.categories, parts]);
  const filteredParts = useMemo(() => {
    const term = debouncedSearch.trim().toLowerCase();
    const rows = parts.filter((part) => {
      const matchesSearch = !term || `${part.partName} ${part.category} ${part.sku || ''} ${part.brand || ''}`.toLowerCase().includes(term);
      const matchesCategory = !category || part.category === category;
      const matchesStatus = !stockStatus || inventoryStockStatus(part) === stockStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
    return rows.sort((a, b) => {
      if (sortBy === 'stock') return Number(a.available || 0) - Number(b.available || 0);
      if (sortBy === 'value') return (Number(b.onHand || 0) * Number(b.costPrice || 0)) - (Number(a.onHand || 0) * Number(a.costPrice || 0));
      return String(a.partName || '').localeCompare(String(b.partName || ''));
    });
  }, [parts, debouncedSearch, category, stockStatus, sortBy]);
  const totals = useMemo(() => data?.summary || ({
    totalParts: parts.length,
    lowStock: parts.filter((part) => inventoryStockStatus(part) === 'low').length,
    outOfStock: parts.filter((part) => inventoryStockStatus(part) === 'out').length,
    stockValue: parts.reduce((sum, part) => sum + Number(part.onHand || 0) * Number(part.costPrice || 0), 0),
    totalUnits: parts.reduce((sum, part) => sum + Number(part.onHand || 0), 0),
    reserved: parts.reduce((sum, part) => sum + Number(part.reserved || 0), 0)
  }), [data?.summary, parts]);
  const hasActiveFilters = Boolean(search || category || stockStatus || sortBy !== 'name');
  const inventoryKpis = [
    { label: 'Total Parts', value: totals.totalParts, helper: 'Products tracked in inventory', icon: PackagePlus, tone: 'blue' },
    { label: 'Total Units', value: totals.totalUnits, helper: 'Current on-hand quantity', icon: Boxes, tone: 'blue' },
    { label: 'Low Stock Items', value: totals.lowStock, helper: 'Needs purchase planning', icon: AlertTriangle, tone: totals.lowStock > 0 ? 'amber' : 'green' },
    { label: 'Out of Stock Items', value: totals.outOfStock, helper: 'Requires immediate attention', icon: AlertTriangle, tone: totals.outOfStock > 0 ? 'red' : 'green' },
    { label: 'Total Stock Value', value: currency(totals.stockValue), helper: 'On-hand stock valuation', icon: CreditCard, tone: 'blue' },
    { label: 'Reserved Stock', value: totals.reserved, helper: 'Held for active service jobs', icon: ClipboardList, tone: 'blue' }
  ];

  async function savePart(partForm) {
    const editing = Boolean(partForm.id);
    if (editing && !canEditStock) {
      push('You do not have permission to edit parts', 'error');
      return;
    }
    if (!editing && !canCreatePart) {
      push('You do not have permission to add parts', 'error');
      return;
    }
    try {
      await preserveScroll(async () => {
        const payload = {
          partName: partForm.partName,
          category: partForm.category,
          sku: partForm.sku,
          brand: partForm.brand,
          unitType: partForm.unitType,
          costPrice: partForm.costPrice,
          sellingPrice: partForm.sellingPrice,
          onHand: partForm.onHand,
          reserved: partForm.reserved,
          lowStockLimit: partForm.lowStockLimit
        };
        if (partForm.id) await request(`/inventory/${partForm.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        else await request('/inventory', { method: 'POST', body: JSON.stringify(payload) });
        setEditor(null);
        push(partForm.id ? 'Inventory part updated' : 'Inventory part added');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function confirmDeletePart() {
    if (!deletePart) return;
    if (!canDeletePart) {
      push('You do not have permission to delete parts', 'error');
      return;
    }
    try {
      await preserveScroll(async () => {
        await request(`/inventory/${deletePart.id}`, { method: 'DELETE' });
        push('Inventory part deleted');
        setDeletePart(null);
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function addQuickStock(stockForm) {
    if (!canEditStock) {
      push('You do not have permission to update stock', 'error');
      return;
    }
    const quantity = Number(stockForm.quantity || 0);
    if (!quantity || (stockForm.type !== 'ADJUST' && quantity <= 0)) {
      push(stockForm.type === 'ADJUST' ? 'Adjustment quantity cannot be zero' : 'Quantity must be greater than 0', 'error');
      return;
    }
    try {
      await preserveScroll(async () => {
        await request('/stock-movements', {
          method: 'POST',
          body: JSON.stringify({
            partId: stockForm.partId,
            type: stockForm.type,
            quantity: stockForm.quantity,
            source: stockForm.source,
            note: stockForm.note
          })
        });
        push('Stock added');
        setQuickStockPart(null);
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;
  const pagination = paginationFrom(data, filteredParts.length, limit);
  const totalPartCount = data?.pagination?.total || totals.totalParts || parts.length;
  return (
    <div className="inventory-page">
      <section className="erp-page-header inventory-erp-header mb-5">
        <div className="relative z-[1] flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--brand)]">Stock Control</p>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Inventory / Stock Management</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Track stock availability, reserved quantity, low stock, value, and movement history.</p>
          </div>
          {canCreatePart ? <button type="button" className="btn btn-primary h-10 px-4" onClick={() => setEditor({})}><Plus className="h-4 w-4" />Add Part</button> : null}
        </div>
      </section>
      <div className="surface mb-5 p-3">
        <div className="tabs-list inventory-tabs border-b-0">
          <Link className="tab-button tab-button-active" to="/admin/parts">Products / Parts</Link>
          {canViewStockMovements ? <Link className="tab-button" to="/admin/stock-movements">Stock Movements</Link> : null}
        </div>
      </div>
      <div className="inventory-kpi-grid mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {inventoryKpis.map((item) => <InventoryMetricCard key={item.label} {...item} />)}
      </div>
      <div className="surface inventory-filter-bar mb-5 grid gap-3 p-4 xl:grid-cols-[minmax(320px,1fr)_180px_180px_190px_auto]">
        <div className="min-w-0">
          <SearchBox value={search} onChange={setSearch} placeholder="Search part name, category, SKU, brand" />
        </div>
        <select className="input" value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="input" value={stockStatus} onChange={(event) => setStockStatus(event.target.value)}>
          <option value="">All stock statuses</option>
          <option value="in">Available</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
        <select className="input" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
          <option value="name">Sort: Name</option>
          <option value="stock">Sort: Stock Low to High</option>
          <option value="value">Sort: Stock Value</option>
        </select>
        <button
          type="button"
          className="btn btn-secondary h-10 whitespace-nowrap px-4"
          disabled={!hasActiveFilters}
          onClick={() => {
            setSearch('');
            setCategory('');
            setStockStatus('');
            setSortBy('name');
          }}
        >
          Reset Filters
        </button>
        <p className="inventory-count-pill xl:col-span-5">Showing <b>{filteredParts.length}</b> of <b>{totalPartCount}</b> parts</p>
      </div>
      {!filteredParts.length ? (
        <EmptyState
          icon={PackagePlus}
          title={hasActiveFilters ? 'No parts match your filters' : 'No inventory items found'}
          message={hasActiveFilters ? 'Try changing the search or filters.' : 'Add your first part to start tracking stock availability and value.'}
          action={hasActiveFilters ? <button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); setCategory(''); setStockStatus(''); setSortBy('name'); }}>Reset Filters</button> : canCreatePart ? <button type="button" className="btn btn-primary" onClick={() => setEditor({})}>Add Part</button> : null}
        />
      ) : (
        <>
        <p className="mb-3 text-xs font-semibold muted">Available = On Hand - Reserved. Reserved means stock assigned to active service jobs but not yet billed.</p>
        <div className="table-wrap inventory-products-table-wrap surface bg-[var(--surface)]">
          <table className="data-table inventory-products-table">
            <colgroup>
              <col className="inventory-col-part" />
              <col className="inventory-col-category" />
              <col className="inventory-col-stock" />
              <col className="inventory-col-pricing" />
              <col className="inventory-col-low" />
              <col className="inventory-col-status" />
              <col className="inventory-col-actions" />
            </colgroup>
            <thead><tr><th>Part / Product</th><th>Category</th><th>Stock</th><th>Pricing</th><th>Low Stock Limit</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody className="divide-y divide-[var(--line)]">
              {filteredParts.map((part) => {
                const stockValue = Number(part.onHand || 0) * Number(part.costPrice || 0);
                const reservedQuantity = Number(part.reserved || 0);
                return (
                  <tr key={part.id}>
                    <td className="font-bold">
                      <span className="block truncate text-slate-50" title={part.partName}>{part.partName}</span>
                      <span className="block text-xs font-normal muted">{part.brand || part.sku || 'Product / part'}</span>
                    </td>
                    <td><span className="inline-flex rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-xs font-bold text-slate-200">{part.category || 'General'}</span></td>
                    <td>
                      <div className="inventory-cell-stack">
                        <span>On hand: {part.onHand || 0}</span>
                        <span>Reserved: {part.reserved || 0}</span>
                        <span className="inventory-available-value">Available: {part.available || 0}</span>
                      </div>
                    </td>
                    <td>
                      <div className="inventory-cell-stack">
                        <span>Selling: {currency(part.sellingPrice)}</span>
                        <span>Cost: {currency(part.costPrice)}</span>
                        <span className="inventory-value-line">Value: {currency(stockValue)}</span>
                      </div>
                    </td>
                    <td className="text-center font-bold">{part.lowStockLimit}</td>
                    <td>
                      <div className="grid gap-1.5">
                        <InventoryStatusBadge part={part} />
                        {reservedQuantity > 0 ? <span className="inline-flex w-fit rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[11px] font-bold text-slate-300">Reserved {reservedQuantity}</span> : null}
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="inventory-actions">
                        {canEditStock ? <button type="button" className="btn btn-primary inventory-action-button" onClick={() => setQuickStockPart(part)}><PackagePlus className="h-4 w-4" />Add Stock</button> : null}
                        {canEditStock ? <button type="button" className="btn btn-secondary inventory-action-button" onClick={() => setEditor(part)}><Edit3 className="h-3.5 w-3.5" />Edit</button> : null}
                        {canViewStockMovements ? <Link className="inventory-movement-link" to={`/admin/stock-movements?partId=${part.id}`}>View Movements</Link> : null}
                        {canDeletePart ? <button type="button" className="icon-button inventory-delete-button text-rose-100" onClick={() => setDeletePart(part)} aria-label={`Delete ${part.partName}`}><Trash2 className="h-4 w-4" /></button> : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PaginationControls pagination={pagination} onPageChange={setPage} />
        </>
      )}
      {(canCreatePart || canEditStock) && editor ? <InventoryPartModal part={editor} onClose={() => setEditor(null)} onSave={savePart} /> : null}
      {canEditStock && quickStockPart ? <QuickStockModal part={quickStockPart} onClose={() => setQuickStockPart(null)} onSave={addQuickStock} /> : null}
      {canDeletePart && deletePart ? (
        <ConfirmModal
          title="Delete Inventory Part"
          message={`Delete ${deletePart.partName}? This removes the part from inventory.`}
          confirmLabel="Delete"
          onCancel={() => setDeletePart(null)}
          onConfirm={confirmDeletePart}
        />
      ) : null}
    </div>
  );
}

function InventoryPartModal({ part, onClose, onSave }) {
  const [form, setForm] = useState({
    id: part.id || '',
    partName: part.partName || '',
    category: inventoryCategories.includes(part.category) ? part.category : 'Other',
    sku: part.sku || '',
    brand: part.brand || '',
    unitType: inventoryUnitTypes.includes(part.unitType) ? part.unitType : 'Piece',
    costPrice: part.costPrice || 0,
    sellingPrice: part.sellingPrice || 0,
    onHand: part.onHand || 0,
    reserved: part.reserved || 0,
    lowStockLimit: part.lowStockLimit || 0
  });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const priceWarning = Number(form.costPrice || 0) > Number(form.sellingPrice || 0);

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4">
      <form className="surface max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); onSave(form); }}>
        <h2 className="text-xl font-black">{form.id ? 'Edit Part' : 'Add Part'}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label><span className="label">Part Name</span><input className="input" value={form.partName} onChange={(event) => update('partName', event.target.value)} required /></label>
          <label>
            <span className="label">Category</span>
            <select className="input" value={form.category} onChange={(event) => update('category', event.target.value)}>
              {inventoryCategories.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label><span className="label">SKU / Product Code</span><input className="input" value={form.sku} onChange={(event) => update('sku', event.target.value)} /></label>
          <label><span className="label">Brand</span><input className="input" value={form.brand} onChange={(event) => update('brand', event.target.value)} /></label>
          <label>
            <span className="label">Unit Type</span>
            <select className="input" value={form.unitType} onChange={(event) => update('unitType', event.target.value)}>
              {inventoryUnitTypes.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span className="label">Cost Price</span>
            <span className="relative block"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold muted">₹</span><input className="input pl-7" type="number" min="0" step="0.01" value={form.costPrice} onChange={(event) => update('costPrice', event.target.value)} /></span>
          </label>
          <label>
            <span className="label">Selling Price</span>
            <span className="relative block"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold muted">₹</span><input className="input pl-7" type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(event) => update('sellingPrice', event.target.value)} /></span>
          </label>
          <label><span className="label">On Hand</span><input className="input" type="number" min="0" value={form.onHand} onChange={(event) => update('onHand', event.target.value)} /></label>
          <label><span className="label">Reserved</span><input className="input" type="number" min="0" value={form.reserved} onChange={(event) => update('reserved', event.target.value)} /></label>
          <label><span className="label">Low Limit</span><input className="input" type="number" min="0" value={form.lowStockLimit} onChange={(event) => update('lowStockLimit', event.target.value)} /></label>
        </div>
        {priceWarning ? <p className="mt-3 text-sm font-semibold text-amber-100">Cost price is higher than selling price</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary"><Save className="h-4 w-4" />Save Part</button>
        </div>
      </form>
    </div>
  );
}

function QuickStockModal({ part, onClose, onSave }) {
  const [form, setForm] = useState({ partId: part.id, type: 'ADD', quantity: 1, source: 'Purchase', note: '' });
  const quantity = Number(form.quantity || 0);
  const canSave = Boolean(form.partId && form.type && form.source && quantity && (form.type === 'ADJUST' || quantity > 0));
  const movementReasons = ['Damaged item', 'Physical count correction', 'Returned by customer', 'AMC replacement', 'Wrong previous entry'];

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4">
      <form className="surface inventory-manual-form w-full max-w-lg p-5" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); if (canSave) onSave(form); }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Stock Movement</p>
            <h2 className="mt-1 text-xl font-black">Add / Adjust Stock</h2>
          </div>
          <button type="button" className="icon-button h-8 w-8" onClick={onClose} aria-label="Close stock movement form"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 grid gap-4">
          <label><span className="label">Part / Product</span><input className="input" value={part.partName} readOnly /></label>
          <div className="grid gap-2 rounded-card border border-white/10 bg-white/[0.045] p-3 text-sm">
            <div className="flex items-center justify-between gap-3"><span className="muted">Current On Hand</span><b>{part.onHand || 0}</b></div>
            <div className="flex items-center justify-between gap-3"><span className="muted">Reserved</span><b>{part.reserved || 0}</b></div>
            <div className="flex items-center justify-between gap-3"><span className="muted">Available</span><b className="text-sky-100">{part.available || 0}</b></div>
          </div>
          <label>
            <span className="label">Movement Type</span>
            <select className="input" value={form.type} onChange={(event) => update('type', event.target.value)}>
              {['ADD', 'RETURN', 'ADJUST'].map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label><span className="label">Quantity</span><input className="input" type="number" min={form.type === 'ADJUST' ? undefined : '1'} value={form.quantity} onChange={(event) => update('quantity', event.target.value)} /></label>
          <label>
            <span className="label">Source</span>
            <select className="input" value={form.source} onChange={(event) => update('source', event.target.value)}>
              {quickStockSources.map((source) => <option key={source}>{source}</option>)}
            </select>
          </label>
          <label><span className="label">Note</span><input className="input" value={form.note} onChange={(event) => update('note', event.target.value)} /></label>
        </div>
        {form.source === 'Manual' ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {movementReasons.map((reason) => (
              <button key={reason} type="button" className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:border-sky-300/30 hover:bg-sky-400/10" onClick={() => update('note', reason)}>
                {reason}
              </button>
            ))}
          </div>
        ) : null}
        {form.type === 'ADJUST' ? <p className="mt-4 rounded-card border border-amber-300/20 bg-amber-400/10 p-3 text-sm font-semibold text-amber-100">This directly changes physical inventory count.</p> : null}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={!canSave}><PackagePlus className="h-4 w-4" />Save Stock</button>
        </div>
      </form>
    </div>
  );
}

function InventoryMetricCard({ icon: Icon, label, value, helper, tone = 'blue' }) {
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
