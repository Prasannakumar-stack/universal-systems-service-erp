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
  wholeCurrency,
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
import { Archive, MoreHorizontal, RotateCcw } from 'lucide-react';
import { FloatingRowActionMenu } from '../../components/FloatingRowActionMenu.jsx';
import { LifecycleTabs } from '../../components/LifecycleTabs.jsx';
import { can, normalizeRole } from '../../utils/roles.js';
import { emitSidebarBadgesUpdated } from '../../utils/sidebarBadges.js';
import { AddStockChoiceModal, InventoryModuleTabs, PurchaseImportModal, PurchaseRegisterTab, SuppliersTab } from './PurchaseImportComponents.jsx';
import { StockMovementsPage } from './StockMovementsPage.jsx';

const inventoryUnitTypes = ['Piece', 'Box', 'Meter', 'Pack'];
const missingInventoryValue = '\u2014';
const inventoryProtectedCategories = ['Work Orders', 'Stock Movements', 'Reserved Stock', 'Purchases', 'Invoices'];
const inventoryArchiveFilters = [
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
  { value: 'trash', label: 'Trash' },
  { value: 'all', label: 'All' }
];

function inventoryPartLifecycleState(part = {}) {
  if (part.lifecycleState) return part.lifecycleState;
  if (part.isDeleted || part.deletedAt) return 'trash';
  if (part.isDisabled || part.disabledAt) return 'disabled';
  return 'active';
}

function lifecycleDaysLeftLabel(daysLeft) {
  if (daysLeft === null || daysLeft === undefined) return '';
  const days = Math.max(0, Number(daysLeft) || 0);
  return `${days} day${days === 1 ? '' : 's'} left`;
}

export function InventoryPage({ role = 'admin' }) {
  const { request, user } = useAuth();
  const { push } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const canCreatePart = can(user, 'create_part');
  const canEditStock = can(user, 'edit_stock');
  const canViewStockMovements = can(user, 'view_stock_movements');
  const canDeletePart = can(user, 'delete_part');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [archiveStatus, setArchiveStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState(null);
  const [quickStockPart, setQuickStockPart] = useState(null);
  const [stockChoicePart, setStockChoicePart] = useState(null);
  const [purchasePart, setPurchasePart] = useState(null);
  const [deletePart, setDeletePart] = useState(null);
  const [deletePartAction, setDeletePartAction] = useState('');
  const [deletePartBusy, setDeletePartBusy] = useState(false);
  const [actionMenuId, setActionMenuId] = useState('');
  const [actionMenuTrigger, setActionMenuTrigger] = useState(null);
  const limit = 10;
  const isTechnician = role === 'technician';
  const isAdminUser = ['admin', 'super_admin'].includes(normalizeRole(user?.role || role));
  const requestedTab = useMemo(() => new URLSearchParams(location.search).get('tab') || '', [location.search]);
  const activeTab = useMemo(() => {
    if (isTechnician) return canViewStockMovements && requestedTab === 'stock-movements' ? 'stock-movements' : 'parts';
    if (location.pathname.includes('/stock-movements')) return 'stock-movements';
    if (['stock-movements', 'purchases', 'suppliers'].includes(requestedTab)) return requestedTab;
    return 'parts';
  }, [canViewStockMovements, isTechnician, location.pathname, requestedTab]);
  const debouncedSearch = useDebouncedValue(search);
  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (category) params.set('category', category);
    if (stockStatus) params.set('stockStatus', stockStatus);
    if (sortBy) params.set('sortBy', sortBy);
    params.set('lifecycle', archiveStatus);
    return `?${params}`;
  }, [archiveStatus, category, debouncedSearch, limit, page, sortBy, stockStatus]);
  const { data, loading, error, reload } = useResource(() => request(`/inventory${query}`), [request, query]);

  useEffect(() => {
    setPage(1);
  }, [archiveStatus, debouncedSearch, category, stockStatus, sortBy]);

  function closeActionMenu() {
    setActionMenuId('');
    setActionMenuTrigger(null);
  }

  function toggleActionMenu(partId, event) {
    if (actionMenuId === partId) {
      closeActionMenu();
      return;
    }
    setActionMenuId(partId);
    setActionMenuTrigger(event.currentTarget);
  }

  function startPartLifecycleAction(part, action) {
    setDeletePart(part);
    setDeletePartAction(action);
    closeActionMenu();
  }

  function clearPartLifecycleAction() {
    setDeletePart(null);
    setDeletePartAction('');
  }

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
  const hasActiveFilters = Boolean(search || category || stockStatus || sortBy !== 'name' || archiveStatus !== 'active');
  const inventoryKpis = [
    { label: 'Total Parts', value: totals.totalParts, helper: 'Products tracked in inventory', icon: PackagePlus, tone: 'blue' },
    { label: 'Total Units', value: totals.totalUnits, helper: 'Current on-hand quantity', icon: Boxes, tone: 'blue' },
    { label: 'Low Stock Items', value: totals.lowStock, helper: 'Needs purchase planning', icon: AlertTriangle, tone: totals.lowStock > 0 ? 'amber' : 'green' },
    { label: 'Out of Stock Items', value: totals.outOfStock, helper: 'Requires immediate attention', icon: AlertTriangle, tone: totals.outOfStock > 0 ? 'red' : 'green' },
    { label: 'Total Stock Value', value: wholeCurrency(totals.stockValue), helper: 'On-hand stock valuation', icon: CreditCard, tone: 'blue', nowrap: true },
    { label: 'Reserved Stock', value: totals.reserved, helper: 'Held for active service jobs', icon: ClipboardList, tone: 'blue' }
  ].filter((item) => !isTechnician || item.label !== 'Total Stock Value');

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
          deviceModel: partForm.deviceModel,
          compatibleDeviceType: partForm.compatibleDeviceType,
          supplier: partForm.supplier,
          purchaseRef: partForm.purchaseRef,
          description: partForm.description,
          unitType: partForm.unitType,
          costPrice: partForm.costPrice,
          sellingPrice: partForm.sellingPrice,
          onHand: partForm.onHand,
          lowStockLimit: partForm.lowStockLimit
        };
        if (partForm.id) await request(`/inventory/${partForm.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        else await request('/inventory', { method: 'POST', body: JSON.stringify(payload) });
        setEditor(null);
        push(partForm.id ? 'Inventory part updated' : 'Inventory part added');
        reload({ silent: true });
        emitSidebarBadgesUpdated();
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function confirmPartLifecycleAction() {
    if (!deletePart || deletePartBusy) return;
    if (!canDeletePart) {
      push('You do not have permission to update part lifecycle', 'error');
      return;
    }
    setDeletePartBusy(true);
    try {
      await preserveScroll(async () => {
        const id = deletePart.id || deletePart._id;
        if (deletePartAction === 'disable') {
          await request(`/inventory/${id}/disable`, { method: 'PATCH' });
          push('Inventory part disabled successfully. History is preserved.');
        } else if (deletePartAction === 'trash') {
          await request(`/inventory/${id}/move-to-trash`, { method: 'PATCH' });
          push('Inventory part moved to Trash. It can be restored for 30 days.');
        } else if (deletePartAction === 'permanent') {
          await request(`/inventory/${id}/permanent`, { method: 'DELETE' });
          push('Inventory part permanently deleted');
        }
        clearPartLifecycleAction();
        reload({ silent: true });
        emitSidebarBadgesUpdated();
      });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setDeletePartBusy(false);
    }
  }

  async function restorePart(part) {
    if (!canDeletePart) {
      push('You do not have permission to restore parts', 'error');
      return;
    }
    try {
      await preserveScroll(async () => {
        await request(`/inventory/${part.id || part._id}/restore`, { method: 'POST' });
        push('Inventory part restored successfully');
        closeActionMenu();
        reload({ silent: true });
        emitSidebarBadgesUpdated();
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
        push('Stock movement saved');
        setQuickStockPart(null);
        reload({ silent: true });
        emitSidebarBadgesUpdated();
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
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--brand)]">{isTechnician ? 'Parts Availability' : 'Stock Control'}</p>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{isTechnician ? 'Products / Parts' : 'Inventory / Stock Management'}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">{isTechnician ? 'Check part availability, reserved stock, and movement history for service work.' : 'Track stock availability, reserved quantity, low stock, value, and movement history.'}</p>
          </div>
          {canCreatePart && activeTab === 'parts' ? <button type="button" className="btn btn-primary h-10 px-4" onClick={() => setEditor({})}><Plus className="h-4 w-4" />Add Part</button> : null}
        </div>
      </section>
      {!isTechnician ? <InventoryModuleTabs activeTab={activeTab} canViewStockMovements={canViewStockMovements} /> : null}
      {activeTab === 'stock-movements' ? (
        <StockMovementsPage embedded />
      ) : activeTab === 'purchases' ? (
        <PurchaseRegisterTab parts={parts} onPartsChanged={() => {
          reload({ silent: true });
          emitSidebarBadgesUpdated();
        }} />
      ) : activeTab === 'suppliers' ? (
        <SuppliersTab />
      ) : (
      <>
      <div className="inventory-kpi-grid mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {inventoryKpis.map((item) => <InventoryMetricCard key={item.label} {...item} />)}
      </div>
      <LifecycleTabs
        tabs={inventoryArchiveFilters}
        value={archiveStatus}
        onChange={setArchiveStatus}
        counts={data?.lifecycleCounts}
        note={archiveStatus === 'trash' ? 'Items in Trash are kept for 30 days before permanent cleanup.' : 'Disabled parts are hidden from normal selection but can be restored.'}
      />
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
          {!isTechnician ? <option value="value">Sort: Stock Value</option> : null}
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
            setArchiveStatus('active');
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
          action={hasActiveFilters ? <button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); setCategory(''); setStockStatus(''); setSortBy('name'); setArchiveStatus('active'); }}>Reset Filters</button> : canCreatePart ? <button type="button" className="btn btn-primary" onClick={() => setEditor({})}>Add Part</button> : null}
        />
      ) : (
        <>
        {isTechnician ? <p className="inventory-tech-action-note">Parts are view-only here. Request parts from the related Work Order.</p> : null}
        <p className="mb-3 text-xs font-semibold muted">Available = On Hand - Reserved. Reserved means stock assigned to active service jobs but not yet billed.</p>
        <div className="table-wrap inventory-products-table-wrap surface bg-[var(--surface)]">
          <table className={`data-table inventory-products-table ${isTechnician ? 'is-technician-table' : ''}`}>
            <colgroup>
              <col className="inventory-col-part" />
              <col className="inventory-col-category" />
              <col className="inventory-col-brand-model" />
              <col className="inventory-col-stock" />
              {!isTechnician ? <col className="inventory-col-price" /> : null}
              {!isTechnician ? <col className="inventory-col-stock-value" /> : null}
              <col className="inventory-col-status" />
              <col className="inventory-col-actions" />
            </colgroup>
            <thead><tr><th>Item</th><th>Category</th><th>Brand / Model</th><th>Stock</th>{!isTechnician ? <th>Price</th> : null}{!isTechnician ? <th>Stock Value</th> : null}<th>Status</th><th>{isTechnician ? 'Action' : 'Actions'}</th></tr></thead>
            <tbody className="divide-y divide-[var(--line)]">
              {filteredParts.map((part) => {
                const partId = part.id || part._id;
                const lifecycleState = inventoryPartLifecycleState(part);
                const isDisabledPart = lifecycleState === 'disabled';
                const isTrashedPart = lifecycleState === 'trash';
                const isActivePart = lifecycleState === 'active';
                const canShowDisableAction = canDeletePart && isActivePart;
                const canShowMoveToTrashAction = canDeletePart && !isTrashedPart;
                const canShowRestoreAction = canDeletePart && !isActivePart;
                const canShowPermanentDeleteAction = canDeletePart && isTrashedPart && isAdminUser && part.canPermanentDelete !== false && !part.linkedRecordSummary?.hasLinkedRecords;
                const canShowKeptForHistoryAction = canDeletePart && isTrashedPart && isAdminUser && !canShowPermanentDeleteAction;
                const trashDaysLabel = isTrashedPart ? lifecycleDaysLeftLabel(part.trashDaysLeft) : '';
                const stockValue = Number(part.onHand || 0) * Number(part.costPrice || 0);
                const reservedQuantity = Number(part.reserved || 0);
                const availableQuantity = Number(part.available || 0);
                const technicianCanViewMovements = isTechnician && canViewStockMovements;
                return (
                  <tr key={partId}>
                    <td className="font-bold inventory-product-cell">
                      <span className="block truncate text-slate-50" title={part.partName}>{part.partName}</span>
                      {part.sku ? <span className="block truncate text-xs font-normal muted" title={part.sku}>{part.sku}</span> : null}
                      {isDisabledPart ? <span className="mt-1 inline-flex rounded-full border border-amber-300/20 bg-amber-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-amber-100">Disabled</span> : null}
                      {isTrashedPart ? <span className="mt-1 inline-flex rounded-full border border-rose-300/20 bg-rose-400/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-rose-100">Trash{trashDaysLabel ? ` - ${trashDaysLabel}` : ''}</span> : null}
                    </td>
                    <td><span className="inventory-category-badge" title={part.category || 'General'}>{part.category || 'General'}</span></td>
                    <td>
                      <div className="inventory-detail-stack">
                        <span><b>Brand:</b> <em className={!part.brand ? 'inventory-not-specified' : ''}>{part.brand || missingInventoryValue}</em></span>
                        <span><b>Model:</b> <em className={!part.deviceModel ? 'inventory-not-specified' : ''}>{part.deviceModel || missingInventoryValue}</em></span>
                      </div>
                    </td>
                    <td>
                      <div className="inventory-detail-stack inventory-stock-stack">
                        <span><b>On Hand:</b> <strong>{part.onHand || 0}</strong></span>
                        <span><b>Reserved:</b> <strong>{part.reserved || 0}</strong></span>
                        <span><b>Available:</b> <strong className="inventory-available-value">{availableQuantity}</strong></span>
                      </div>
                    </td>
                    {!isTechnician ? <td>
                      <div className="inventory-detail-stack inventory-price-stack">
                        <span><b>Sell:</b> <strong>{wholeCurrency(part.sellingPrice)}</strong></span>
                        <span><b>Cost:</b> <strong>{wholeCurrency(part.costPrice)}</strong></span>
                      </div>
                    </td> : null}
                    {!isTechnician ? <td className="inventory-stock-value-cell"><span>{wholeCurrency(stockValue)}</span></td> : null}
                    <td className="inventory-status-cell">
                      <div className="grid justify-items-center gap-1.5">
                        <InventoryStatusBadge part={part} />
                        {reservedQuantity > 0 ? <span className="inline-flex rounded-full border border-white/10 bg-white/[0.045] px-2.5 py-1 text-[11px] font-bold text-slate-300">Reserved {reservedQuantity}</span> : null}
                      </div>
                    </td>
                    <td className="inventory-action-cell">
                      {isTechnician ? (
                        <div className="inventory-technician-actions">
                          {availableQuantity > 0 ? (
                            <span
                              className="inventory-workorder-guidance-chip"
                              title="Request this part from the related Work Order."
                            >
                              <PackagePlus className="h-4 w-4" />
                              Use in WO
                            </span>
                          ) : null}
                          {availableQuantity <= 0 ? (
                            <span className="inventory-restock-note">
                              <b>Out of stock</b>
                              <small>Ask admin to restock</small>
                            </span>
                          ) : null}
                          {technicianCanViewMovements ? (
                            <Link className="btn btn-secondary inventory-request-part-button" to={`/app/tech/parts?tab=stock-movements&partId=${partId}`}>
                              <ClipboardList className="h-4 w-4" />
                              View Movements
                            </Link>
                          ) : null}
                        </div>
                      ) : canEditStock || canViewStockMovements || canDeletePart ? <div className="inventory-action-menu-wrap">
                        <button
                          type="button"
                          className="inventory-row-menu-trigger"
                          onClick={(event) => toggleActionMenu(partId, event)}
                          aria-haspopup="menu"
                          aria-expanded={actionMenuId === partId}
                          aria-label={`Open actions for ${part.partName}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        <FloatingRowActionMenu
                          open={actionMenuId === partId}
                          triggerElement={actionMenuTrigger}
                          onClose={closeActionMenu}
                          className="inventory-row-action-menu"
                          width={236}
                          gap={10}
                        >
                            {canEditStock && isActivePart ? <button type="button" role="menuitem" className="row-action-menu-item" onClick={() => { setStockChoicePart(part); closeActionMenu(); }}><PackagePlus className="h-4 w-4" /><span>Add Stock</span></button> : null}
                            {canEditStock && isActivePart ? <button type="button" role="menuitem" className="row-action-menu-item" onClick={() => { setEditor(part); closeActionMenu(); }}><Edit3 className="h-4 w-4" /><span>Edit Part</span></button> : null}
                            {canViewStockMovements ? <Link className="row-action-menu-item" role="menuitem" to={`/app/admin/parts?tab=stock-movements&partId=${partId}`} onClick={closeActionMenu}><ClipboardList className="h-4 w-4" /><span>View Movements</span></Link> : null}
                            {canShowDisableAction ? <button type="button" role="menuitem" className="row-action-menu-item row-action-menu-item--warning" onClick={() => startPartLifecycleAction(part, 'disable')}><Archive className="h-4 w-4" /><span>Disable Part</span></button> : null}
                            {canShowRestoreAction ? <button type="button" role="menuitem" className="row-action-menu-item row-action-menu-item--restore" onClick={() => restorePart(part)}><RotateCcw className="h-4 w-4" /><span>{isDisabledPart ? 'Enable Part' : 'Restore'}</span></button> : null}
                            {canShowMoveToTrashAction ? <button type="button" role="menuitem" className="row-action-menu-item row-action-menu-item--danger inventory-row-menu-danger" onClick={() => startPartLifecycleAction(part, 'trash')}><Trash2 className="h-4 w-4" /><span>Move to Trash</span></button> : null}
                            {canShowPermanentDeleteAction ? <button type="button" role="menuitem" className="row-action-menu-item row-action-menu-item--danger inventory-row-menu-danger" onClick={() => startPartLifecycleAction(part, 'permanent')}><Trash2 className="h-4 w-4" /><span>Delete Permanently</span></button> : null}
                            {canShowKeptForHistoryAction ? (
                              <button
                                type="button"
                                role="menuitem"
                                aria-disabled="true"
                                tabIndex={-1}
                                title="Linked records exist, so this record is kept for history."
                                className="row-action-menu-item row-action-menu-item--disabled"
                                onClick={(event) => { event.preventDefault(); event.stopPropagation(); }}
                              >
                                <ShieldCheck className="h-4 w-4" />
                                <span>Kept for history</span>
                              </button>
                            ) : null}
                        </FloatingRowActionMenu>
                      </div> : <span className="inventory-not-specified">{missingInventoryValue}</span>}
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
      </>
      )}
      {(canCreatePart || canEditStock) && editor ? <InventoryPartModal part={editor} parts={parts} onClose={() => setEditor(null)} onSave={savePart} /> : null}
      {canEditStock && quickStockPart ? <QuickStockModal part={quickStockPart} onClose={() => setQuickStockPart(null)} onSave={addQuickStock} /> : null}
      {canEditStock && stockChoicePart ? (
        <AddStockChoiceModal
          part={stockChoicePart}
          onClose={() => setStockChoicePart(null)}
          onManual={() => {
            setQuickStockPart(stockChoicePart);
            setStockChoicePart(null);
          }}
          onPurchase={() => {
            setPurchasePart(stockChoicePart);
            setStockChoicePart(null);
            if (!isTechnician) navigate('/app/admin/parts?tab=purchases');
          }}
        />
      ) : null}
      {canEditStock && purchasePart ? (
        <PurchaseImportModal
          initialPart={purchasePart}
          parts={parts}
          onClose={() => setPurchasePart(null)}
          onSaved={() => {
            reload({ silent: true });
            emitSidebarBadgesUpdated();
          }}
        />
      ) : null}
      {canDeletePart && deletePart ? (
        <ConfirmModal
          title={deletePartAction === 'disable' ? 'Disable this part?' : deletePartAction === 'trash' ? 'Move this part to Trash?' : 'Delete inventory part permanently?'}
          message={deletePartAction === 'disable'
            ? `${deletePart.partName || 'This part'} will move to Disabled. Stock, purchase history, work order links, and movements stay preserved.`
            : deletePartAction === 'trash'
              ? `${deletePart.partName || 'This part'} will move to Trash and can be restored for 30 days. Linked records and history stay preserved.`
              : `${deletePart.partName || 'This part'} will be permanently deleted only if the backend allows it. This action is separate from Trash.`}
          confirmLabel={deletePartAction === 'disable' ? 'Disable Part' : deletePartAction === 'trash' ? 'Move to Trash' : 'Delete Permanently'}
          loading={deletePartBusy}
          loadingLabel={deletePartAction === 'disable' ? 'Disabling...' : deletePartAction === 'trash' ? 'Moving...' : 'Deleting...'}
          onCancel={clearPartLifecycleAction}
          onConfirm={confirmPartLifecycleAction}
        />
      ) : null}
    </div>
  );
}

function LinkedArchiveModal({
  title,
  itemLabel,
  message,
  confirmLabel,
  categories = [],
  fallbackCategories = [],
  categoryFallbackLabel = 'Protected link types checked',
  note = 'Archived records are hidden from active lists but can be restored.',
  loading = false,
  loadingLabel = '',
  onCancel,
  onConfirm
}) {
  const visibleCategories = categories.length ? categories : fallbackCategories;
  const categoryLabel = categories.length ? 'Linked records detected' : categoryFallbackLabel;
  const busyLabel = loadingLabel || `${confirmLabel}...`;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4">
      <div className="surface w-full max-w-lg p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-card border border-amber-300/25 bg-amber-400/10 text-amber-100">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-black">{title}</h2>
            <p className="mt-1 truncate text-sm font-semibold text-slate-300" title={itemLabel}>{itemLabel}</p>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 muted">{message}</p>
        {visibleCategories.length ? (
          <div className="mt-4 rounded-card border border-white/10 bg-white/[0.035] p-3">
            <p className="text-xs font-black uppercase tracking-wide text-slate-400">{categoryLabel}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {visibleCategories.map((category) => (
                <span key={category} className="rounded-full border border-amber-300/20 bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-100">
                  {category}
                </span>
              ))}
            </div>
          </div>
        ) : null}
        <p className="mt-4 rounded-card border border-sky-300/15 bg-sky-400/10 p-3 text-sm font-semibold text-sky-100">
          {note}
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-secondary" disabled={loading} onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={loading} onClick={onConfirm}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {loading ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function InventoryPartModalLegacy({ part, onClose, onSave }) {
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
            <span className="relative block"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold muted">Ã¢â€šÂ¹</span><input className="input pl-7" type="number" min="0" step="0.01" value={form.costPrice} onChange={(event) => update('costPrice', event.target.value)} /></span>
          </label>
          <label>
            <span className="label">Selling Price</span>
            <span className="relative block"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold muted">Ã¢â€šÂ¹</span><input className="input pl-7" type="number" min="0" step="0.01" value={form.sellingPrice} onChange={(event) => update('sellingPrice', event.target.value)} /></span>
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

function InventoryPartModal({ part, parts = [], onClose, onSave }) {
  const editingId = part.id || part._id || '';
  const [form, setForm] = useState({
    id: editingId,
    partName: part.partName || '',
    category: inventoryCategories.includes(part.category) ? part.category : 'Other',
    sku: part.sku || '',
    brand: part.brand || '',
    deviceModel: part.deviceModel || '',
    compatibleDeviceType: part.compatibleDeviceType || '',
    supplier: part.supplier || '',
    purchaseRef: part.purchaseRef || '',
    description: part.description || '',
    unitType: inventoryUnitTypes.includes(part.unitType) ? part.unitType : 'Piece',
    costPrice: part.costPrice ?? 0,
    sellingPrice: part.sellingPrice ?? 0,
    onHand: part.onHand ?? 0,
    reserved: part.reserved ?? 0,
    lowStockLimit: part.lowStockLimit ?? 0
  });

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function requiredLabel(label) {
    return <>{label} <span className="inventory-required-pill">Required</span></>;
  }

  function numberError(label, value) {
    const text = String(value ?? '').trim();
    if (!text) return `${label} is required.`;
    const numericValue = Number(text);
    if (!Number.isFinite(numericValue)) return `${label} must be a valid number.`;
    if (numericValue < 0) return `${label} cannot be negative.`;
    return '';
  }

  const errors = {
    partName: form.partName.trim() ? '' : 'Part name is required.',
    category: form.category ? '' : 'Category is required.',
    unitType: form.unitType ? '' : 'Unit type is required.',
    costPrice: numberError('Cost price', form.costPrice),
    sellingPrice: numberError('Selling price', form.sellingPrice),
    onHand: numberError('On hand', form.onHand),
    lowStockLimit: numberError('Low stock limit', form.lowStockLimit)
  };
  const canSave = Object.values(errors).every((message) => !message);
  const normalizedName = form.partName.trim().toLowerCase();
  const normalizedSku = form.sku.trim().toLowerCase();
  const duplicatePart = parts.find((item) => {
    const itemId = item.id || item._id || '';
    if (String(itemId) === String(editingId)) return false;
    const sameName = normalizedName && String(item.partName || '').trim().toLowerCase() === normalizedName;
    const sameSku = normalizedSku && String(item.sku || '').trim().toLowerCase() === normalizedSku;
    return sameName || sameSku;
  });
  const priceWarning = Number(form.costPrice || 0) > Number(form.sellingPrice || 0);
  const availablePreview = Math.max(0, Number(form.onHand || 0) - Number(form.reserved || 0));
  const generatedCode = useMemo(() => {
    const base = form.partName.trim()
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 18)
      .toUpperCase() || 'PART';
    return `${base}-${String(Date.now()).slice(-4)}`;
  }, [form.partName]);

  return (
    <div className="inventory-part-modal-overlay">
      <form className="surface inventory-part-modal" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); if (canSave) onSave(form); }}>
        <div className="inventory-part-modal-header">
          <div>
            <p className="inventory-part-eyebrow">Products / Parts</p>
            <h2>{form.id ? 'Edit Part' : 'Add Part'}</h2>
            <p>Maintain part details, pricing, and opening stock without manually editing reservations.</p>
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onClose} aria-label="Close part popup"><X className="h-4 w-4" /></button>
        </div>
        <div className="inventory-part-modal-body">
          <div className="inventory-part-section">
            <div className="inventory-part-section-title">Basic Details</div>
          </div>
          <div className="inventory-part-form-grid">
            <label className="inventory-part-field">
              <span className="label">{requiredLabel('Part Name')}</span>
              <input className="input" value={form.partName} onChange={(event) => update('partName', event.target.value)} required placeholder="Example: CCTV camera, laptop adapter" />
              {errors.partName ? <small>{errors.partName}</small> : null}
            </label>
            <label className="inventory-part-field">
              <span className="label">{requiredLabel('Category')}</span>
              <select className="input" value={form.category} onChange={(event) => update('category', event.target.value)} required>
                {inventoryCategories.map((item) => <option key={item}>{item}</option>)}
              </select>
              {errors.category ? <small>{errors.category}</small> : null}
            </label>
            <label className="inventory-part-field">
              <span className="label">SKU / Product Code <span className="inventory-optional-pill">Optional</span></span>
              <span className="inventory-sku-row">
                <input className="input" value={form.sku} onChange={(event) => update('sku', event.target.value)} placeholder="Example: CCTV-CAM-001" />
                <button type="button" className="btn btn-secondary inventory-generate-code" onClick={() => update('sku', generatedCode)}>Generate Code</button>
              </span>
            </label>
          </div>
          <div className="inventory-part-section">
            <div className="inventory-part-section-title">Device Compatibility</div>
          </div>
          <div className="inventory-part-form-grid">
            <label className="inventory-part-field">
              <span className="label">Brand <span className="inventory-optional-pill">Optional</span></span>
              <input className="input" value={form.brand} onChange={(event) => update('brand', event.target.value)} placeholder="Dell, HP, Hikvision..." />
            </label>
            <label className="inventory-part-field">
              <span className="label">Device Model <span className="inventory-optional-pill">Recommended</span></span>
              <input className="input" value={form.deviceModel} onChange={(event) => update('deviceModel', event.target.value)} placeholder="Example: Inspiron 3511, LaserJet 1020" maxLength={80} />
            </label>
            <label className="inventory-part-field">
              <span className="label">Compatible Device Type <span className="inventory-optional-pill">Optional</span></span>
              <input className="input" value={form.compatibleDeviceType} onChange={(event) => update('compatibleDeviceType', event.target.value)} placeholder="Laptop, Printer, CCTV, UPS..." />
            </label>
          </div>
          <div className="inventory-part-section">
            <div className="inventory-part-section-title">Supplier / Purchase Info</div>
          </div>
          <div className="inventory-part-form-grid">
            <label className="inventory-part-field">
              <span className="label">Supplier / Shop <span className="inventory-optional-pill">Optional</span></span>
              <input className="input" value={form.supplier} onChange={(event) => update('supplier', event.target.value)} placeholder="Supplier or shop name" />
            </label>
            <label className="inventory-part-field">
              <span className="label">Purchase Ref / Invoice No <span className="inventory-optional-pill">Optional</span></span>
              <input className="input" value={form.purchaseRef} onChange={(event) => update('purchaseRef', event.target.value)} placeholder="Invoice or purchase reference" />
            </label>
          </div>
          <div className="inventory-part-section">
            <div className="inventory-part-section-title">Pricing & Stock</div>
          </div>
          <div className="inventory-part-form-grid">
            <label className="inventory-part-field">
              <span className="label">{requiredLabel('Unit Type')}</span>
              <select className="input" value={form.unitType} onChange={(event) => update('unitType', event.target.value)} required>
                {inventoryUnitTypes.map((item) => <option key={item}>{item}</option>)}
              </select>
              {errors.unitType ? <small>{errors.unitType}</small> : null}
            </label>
            <label className="inventory-part-field">
              <span className="label">{requiredLabel('Cost Price')}</span>
              <span className="inventory-currency-input"><span>Ã¢â€šÂ¹</span><input className="input" type="number" min="0" step="1" value={form.costPrice} onChange={(event) => update('costPrice', event.target.value)} required /></span>
              {errors.costPrice ? <small>{errors.costPrice}</small> : null}
            </label>
            <label className="inventory-part-field">
              <span className="label">{requiredLabel('Selling Price')}</span>
              <span className="inventory-currency-input"><span>Ã¢â€šÂ¹</span><input className="input" type="number" min="0" step="1" value={form.sellingPrice} onChange={(event) => update('sellingPrice', event.target.value)} required /></span>
              {errors.sellingPrice ? <small>{errors.sellingPrice}</small> : null}
            </label>
            <label className="inventory-part-field">
              <span className="label">{requiredLabel('On Hand')}</span>
              <input className="input" type="number" min="0" step="1" value={form.onHand} onChange={(event) => update('onHand', event.target.value)} required />
              {errors.onHand ? <small>{errors.onHand}</small> : null}
            </label>
            <label className="inventory-part-field">
              <span className="label">Reserved Auto</span>
              <input className="input inventory-readonly-input" type="number" value={form.reserved || 0} readOnly aria-readonly="true" />
              <small>Calculated from active work orders. Not editable here.</small>
            </label>
            <label className="inventory-part-field">
              <span className="label">Available Auto</span>
              <input className="input inventory-readonly-input" type="number" value={availablePreview} readOnly aria-readonly="true" />
              <small>On hand minus reserved stock.</small>
            </label>
            <label className="inventory-part-field">
              <span className="label">{requiredLabel('Low Stock Limit')}</span>
              <input className="input" type="number" min="0" step="1" value={form.lowStockLimit} onChange={(event) => update('lowStockLimit', event.target.value)} required />
              {errors.lowStockLimit ? <small>{errors.lowStockLimit}</small> : null}
            </label>
          </div>
          <div className="inventory-part-section">
            <div className="inventory-part-section-title">Notes / Description</div>
          </div>
          <div className="inventory-part-form-grid">
            <label className="inventory-part-field inventory-part-field-wide">
              <span className="label">Notes / Description <span className="inventory-optional-pill">Optional</span></span>
              <textarea className="input inventory-part-textarea" value={form.description} onChange={(event) => update('description', event.target.value)} placeholder="Compatibility notes, supplier notes, warranty details..." />
            </label>
          </div>
          {duplicatePart ? <p className="inventory-part-warning">Similar part already exists.</p> : null}
          {priceWarning ? <p className="inventory-part-warning">Cost price is higher than selling price.</p> : null}
          {!form.id && Number(form.onHand || 0) > 0 ? <p className="inventory-part-note">Opening stock will be recorded as opening stock added.</p> : null}
        </div>
        <div className="inventory-part-modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary inventory-save-part-button" disabled={!canSave}><Save className="h-4 w-4" />Save Part</button>
        </div>
      </form>
    </div>
  );
}

function QuickStockModal({ part, onClose, onSave }) {
  const [form, setForm] = useState({ partId: part.id, type: 'ADD', quantity: 1, source: 'Manual', note: '' });
  const quantity = Number(form.quantity || 0);
  const canSave = Boolean(form.partId && form.type && form.source && quantity && (form.type === 'ADJUST' || quantity > 0));
  const movementReasons = ['Damaged item', 'Physical count correction', 'Returned by customer', 'AMC replacement', 'Wrong previous entry'];
  const currentOnHand = Number(part.onHand || 0);
  const reserved = Number(part.reserved || 0);
  const available = Number(part.available ?? Math.max(0, currentOnHand - reserved));
  const newBalance = form.type === 'ADD'
    ? currentOnHand + Math.max(0, quantity || 0)
    : form.type === 'USED'
      ? Math.max(0, currentOnHand - Math.max(0, quantity || 0))
      : quantity || 0;

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  return (
    <div className="inventory-stock-modal-overlay">
      <form className="surface inventory-manual-form inventory-stock-modal w-full max-w-lg" onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); if (canSave) onSave(form); }}>
        <div className="inventory-stock-modal-header flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Stock Movement</p>
            <h2 className="mt-1 text-xl font-black">Add / Adjust Stock</h2>
          </div>
          <button type="button" className="icon-button h-8 w-8" onClick={onClose} aria-label="Close stock movement form"><X className="h-4 w-4" /></button>
        </div>
        <div className="inventory-stock-modal-body grid gap-4">
          <label><span className="label">Part / Product</span><input className="input" value={part.partName} readOnly /></label>
          <div className="inventory-stock-preview">
            <div><span>Current On Hand</span><b>{currentOnHand}</b></div>
            <div><span>Reserved</span><b>{reserved}</b></div>
            <div><span>Available</span><b>{available}</b></div>
            <div className="inventory-stock-preview-result"><span>New Balance after movement</span><b>{Number.isFinite(newBalance) ? newBalance : currentOnHand}</b></div>
          </div>
          <label>
            <span className="label">Movement Type</span>
            <select className="input" value={form.type} onChange={(event) => update('type', event.target.value)}>
              {[['ADD', 'ADD'], ['USED', 'REMOVE'], ['ADJUST', 'ADJUST']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
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
          {form.source === 'Manual' ? (
          <div className="flex flex-wrap gap-2">
            {movementReasons.map((reason) => (
              <button key={reason} type="button" className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-xs font-bold text-slate-200 transition hover:border-sky-300/30 hover:bg-sky-400/10" onClick={() => update('note', reason)}>
                {reason}
              </button>
            ))}
          </div>
        ) : null}
          {form.type === 'ADJUST' ? <p className="rounded-card border border-amber-300/20 bg-amber-400/10 p-3 text-sm font-semibold text-amber-100">This directly changes physical inventory count.</p> : null}
        </div>
        <div className="inventory-stock-modal-footer flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={!canSave}><PackagePlus className="h-4 w-4" />Save Movement</button>
        </div>
      </form>
    </div>
  );
}

function InventoryMetricCard({ icon: Icon, label, value, helper, tone = 'blue', nowrap = false }) {
  return (
    <div className={`inventory-kpi-card inventory-kpi-${tone}`}>
      <div className="inventory-kpi-icon"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0">
        <p className="inventory-kpi-label">{label}</p>
        <p className={`inventory-kpi-value ${nowrap ? 'inventory-kpi-value-nowrap' : ''}`} title={String(value)}>{value}</p>
        <p className="inventory-kpi-helper">{helper}</p>
      </div>
    </div>
  );
}
