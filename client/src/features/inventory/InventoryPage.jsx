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

export function InventoryPage() {
  const { request } = useAuth();
  const { push } = useToast();
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
  }, [search, category, stockStatus, sortBy]);

  const parts = data?.parts || data?.data || [];
  const categories = useMemo(() => (data?.categories?.length ? data.categories : Array.from(new Set(parts.map((part) => part.category || 'General'))).sort()), [data?.categories, parts]);
  const filteredParts = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = parts.filter((part) => {
      const matchesSearch = !term || `${part.partName} ${part.category} ${part.sku || ''} ${part.brand || ''}`.toLowerCase().includes(term);
      const matchesCategory = !category || part.category === category;
      const matchesStatus = !stockStatus || inventoryStockStatus(part) === stockStatus;
      return matchesSearch && matchesCategory && matchesStatus;
    });
    return rows.sort((a, b) => {
      if (sortBy === 'stock') return Number(a.available || 0) - Number(b.available || 0);
      if (sortBy === 'value') return (Number(b.onHand || 0) * Number(b.costPrice || b.sellingPrice || 0)) - (Number(a.onHand || 0) * Number(a.costPrice || a.sellingPrice || 0));
      return String(a.partName || '').localeCompare(String(b.partName || ''));
    });
  }, [parts, search, category, stockStatus, sortBy]);
  const totals = useMemo(() => data?.summary || ({
    totalParts: parts.length,
    lowStock: parts.filter((part) => inventoryStockStatus(part) === 'low').length,
    outOfStock: parts.filter((part) => inventoryStockStatus(part) === 'out').length,
    stockValue: parts.reduce((sum, part) => sum + Number(part.onHand || 0) * Number(part.costPrice || part.sellingPrice || 0), 0),
    totalUnits: parts.reduce((sum, part) => sum + Number(part.onHand || 0), 0),
    reserved: parts.reduce((sum, part) => sum + Number(part.reserved || 0), 0)
  }), [data?.summary, parts]);

  async function savePart(partForm) {
    try {
      await preserveScroll(async () => {
        const payload = {
          partName: partForm.partName,
          category: partForm.category,
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
  return (
    <div className="inventory-page">
      <PageHeader
        title="Inventory / Stock Management"
        eyebrow="Stock Control"
        action={<button type="button" className="btn btn-primary" onClick={() => setEditor({})}><Plus className="h-4 w-4" />Add Part</button>}
      >
        Track parts, products, stock availability, reserved quantity, low stock, and stock value.
      </PageHeader>
      <div className="surface mb-5 p-3">
        <div className="tabs-list">
          <Link className="tab-button tab-button-active" to="/admin/parts">Products / Parts</Link>
          <Link className="tab-button" to="/admin/stock-movements">Stock Movements</Link>
        </div>
      </div>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard icon={PackagePlus} label="Total Parts" value={totals.totalParts} />
        <StatCard icon={Boxes} label="Total Units" value={totals.totalUnits} />
        <StatCard icon={AlertTriangle} label="Low Stock Items" value={totals.lowStock} tone="yellow" />
        <StatCard icon={AlertTriangle} label="Out of Stock Items" value={totals.outOfStock} tone="red" />
        <StatCard icon={CreditCard} label="Total Stock Value" value={currency(totals.stockValue)} />
        <StatCard icon={ClipboardList} label="Reserved Stock" value={totals.reserved} />
      </div>
      <div className="surface mb-5 grid gap-3 p-4 xl:grid-cols-[1fr_180px_180px_190px]">
        <SearchBox value={search} onChange={setSearch} placeholder="Search part name, category, SKU, brand" />
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
      </div>
      {!filteredParts.length ? <EmptyState title="No inventory items found" message="Try changing the search or filters." /> : (
        <>
        <p className="mb-3 text-xs font-semibold muted">Available = On Hand - Reserved. Reserved means stock assigned to active service jobs but not yet billed.</p>
        <div className="table-wrap inventory-products-table-wrap bg-[var(--surface)]">
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
                const stockValue = Number(part.onHand || 0) * Number(part.costPrice || part.sellingPrice || 0);
                return (
                  <tr key={part.id}>
                    <td className="font-bold">
                      {part.partName}
                      <span className="block text-xs font-normal muted">{part.brand || part.sku || 'Product / part'}</span>
                    </td>
                    <td>{part.category || 'General'}</td>
                    <td>
                      <div className="inventory-cell-stack">
                        <span>On hand: {part.onHand || 0}</span>
                        <span>Reserved: {part.reserved || 0}</span>
                        <span className="font-black text-sky-100">Available: {part.available || 0}</span>
                      </div>
                    </td>
                    <td>
                      <div className="inventory-cell-stack">
                        <span>Selling: {currency(part.sellingPrice)}</span>
                        <span>Cost: {currency(part.costPrice)}</span>
                        <span className="font-black text-sky-100">Value: {currency(stockValue)}</span>
                      </div>
                    </td>
                    <td className="text-center font-bold">{part.lowStockLimit}</td>
                    <td><InventoryStatusBadge part={part} /></td>
                    <td>
                      <div className="inventory-actions">
                        <button type="button" className="btn btn-secondary inventory-action-button" onClick={() => setEditor(part)}>Edit</button>
                        <button type="button" className="btn btn-primary inventory-action-button" onClick={() => setQuickStockPart(part)}><PackagePlus className="h-4 w-4" />Add Stock</button>
                        <Link className="btn btn-secondary inventory-action-button inventory-action-wide" to={`/admin/stock-movements?partId=${part.id}`}>View Movements</Link>
                        <button type="button" className="icon-button inventory-delete-button text-rose-100" onClick={() => setDeletePart(part)} aria-label={`Delete ${part.partName}`}><Trash2 className="h-4 w-4" /></button>
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
      {editor ? <InventoryPartModal part={editor} onClose={() => setEditor(null)} onSave={savePart} /> : null}
      {quickStockPart ? <QuickStockModal part={quickStockPart} onClose={() => setQuickStockPart(null)} onSave={addQuickStock} /> : null}
      {deletePart ? (
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

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4">
      <form className="surface w-full max-w-lg p-5" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); onSave(form); }}>
        <h2 className="text-xl font-black">Add / Adjust Stock</h2>
        <div className="mt-4 grid gap-4">
          <label><span className="label">Part / Product</span><input className="input" value={part.partName} readOnly /></label>
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
        <p className="mt-4 rounded-card bg-amber-400/10 p-3 text-sm font-semibold text-amber-100">Stock movements are recorded in the ledger and audit log.</p>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary"><PackagePlus className="h-4 w-4" />Save Stock</button>
        </div>
      </form>
    </div>
  );
}
