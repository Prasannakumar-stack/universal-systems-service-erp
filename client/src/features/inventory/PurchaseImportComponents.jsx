import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CalendarClock,
  CircleDollarSign,
  Download,
  Edit3,
  Eye,
  FileImage,
  FileSpreadsheet,
  FileText,
  MapPin,
  PackageCheck,
  PackagePlus,
  Phone,
  Plus,
  ReceiptText,
  Save,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  Truck,
  UploadCloud,
  X
} from 'lucide-react';
import {
  ConfirmModal,
  EmptyState,
  ErrorBlock,
  Link,
  LoadingBlock,
  SearchBox,
  currency,
  csvCell,
  dateInputValue,
  downloadCsv,
  formatDate,
  inventoryCategories,
  paginationFrom,
  PaginationControls,
  preserveScroll,
  uploadedAssetUrl,
  useAuth,
  useDebouncedValue,
  useResource,
  useToast
} from '../../shared/phase1Shared.jsx';
import { can } from '../../utils/roles.js';

const purchaseTabs = [
  { id: 'parts', label: 'Products / Parts' },
  { id: 'stock-movements', label: 'Stock Movements' },
  { id: 'purchases', label: 'Purchase / Import Register' },
  { id: 'suppliers', label: 'Suppliers' }
];

const deliveryStatuses = ['Ordered', 'Received', 'Partially Received', 'Returned', 'Cancelled'];
const paymentStatuses = ['Paid', 'Pending', 'Partial'];
const purchaseSources = ['Local Shop', 'Supplier', 'Online', 'Dealer', 'Other'];

function rowId(row) {
  return row?.id || row?._id || '';
}

function workOrderLabel(id) {
  return id ? `WO-${String(id).slice(-6).toUpperCase()}` : '-';
}

function inputDate(value) {
  return dateInputValue(value || new Date());
}

function purchaseItemId(item) {
  return item?.id || item?._id || item?.localId || '';
}

function purchaseTotal(items = []) {
  return items.reduce((sum, item) => sum + Number(item.quantityReceived || 0) * Number(item.unitCost || 0), 0);
}

function fileNameFromBill(file = {}) {
  return file.originalName || file.filename || 'Invoice bill';
}

function isImageBill(file = {}, url = '') {
  return /^image\//i.test(file.mimetype || '') || /\.(jpe?g|png|webp|gif)$/i.test(file.originalName || file.filename || url);
}

function isPdfBill(file = {}, url = '') {
  return /pdf/i.test(file.mimetype || '') || /\.pdf$/i.test(file.originalName || file.filename || url);
}

function localId() {
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function deliveryBadgeClass(status) {
  return {
    Ordered: 'border-sky-300/25 bg-sky-400/15 text-sky-100',
    Received: 'border-emerald-300/25 bg-emerald-400/15 text-emerald-100',
    'Partially Received': 'border-amber-300/25 bg-amber-400/15 text-amber-100',
    Returned: 'border-rose-300/25 bg-rose-400/15 text-rose-100',
    Cancelled: 'border-slate-300/20 bg-slate-400/10 text-slate-200'
  }[status] || 'border-slate-300/20 bg-slate-400/10 text-slate-200';
}

function paymentBadgeClass(status) {
  return {
    Paid: 'border-emerald-300/25 bg-emerald-400/15 text-emerald-100',
    Pending: 'border-rose-300/25 bg-rose-400/15 text-rose-100',
    Partial: 'border-amber-300/25 bg-amber-400/15 text-amber-100'
  }[status] || 'border-slate-300/20 bg-slate-400/10 text-slate-200';
}

export function InventoryModuleTabs({ activeTab, canViewStockMovements = true }) {
  return (
    <div className="surface mb-5 p-3">
      <div className="tabs-list inventory-tabs border-b-0">
        {purchaseTabs.map((tab) => {
          if (tab.id === 'stock-movements' && !canViewStockMovements) return null;
          const href = tab.id === 'parts' ? '/admin/parts' : `/admin/parts?tab=${tab.id}`;
          return (
            <Link key={tab.id} className={`tab-button ${activeTab === tab.id ? 'tab-button-active' : ''}`} to={href}>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function PurchaseMetricCard({ icon: Icon, label, value, helper, tone = 'blue' }) {
  return (
    <div className={`inventory-kpi-card inventory-kpi-${tone}`}>
      <div className="inventory-kpi-icon"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0">
        <p className="inventory-kpi-label">{label}</p>
        <p className="inventory-kpi-value purchase-metric-value" title={String(value)}>{value}</p>
        <p className="inventory-kpi-helper">{helper}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status, kind = 'delivery' }) {
  const tone = kind === 'payment' ? paymentBadgeClass(status) : deliveryBadgeClass(status);
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${tone}`}>{status || '-'}</span>;
}

function emptyPurchaseItem(part = null) {
  return {
    localId: localId(),
    inventoryPartId: rowId(part),
    partName: part?.partName || '',
    category: part?.category || 'General',
    quantityOrdered: 1,
    quantityReceived: 1,
    unitCost: part?.costPrice || 0
  };
}

export function PurchaseImportModal({ purchase = null, initialPart = null, parts = [], onClose, onSaved }) {
  const { request } = useAuth();
  const { push } = useToast();
  const [saving, setSaving] = useState(false);
  const [billFile, setBillFile] = useState(null);
  const [form, setForm] = useState(() => ({
    id: rowId(purchase),
    supplierName: purchase?.supplierName || '',
    contactNumber: purchase?.contactNumber || '',
    placeCity: purchase?.placeCity || '',
    purchaseSource: purchase?.purchaseSource || 'Supplier',
    invoiceRef: purchase?.invoiceRef || '',
    purchaseDate: inputDate(purchase?.purchaseDate),
    deliveryStatus: purchase?.deliveryStatus || 'Ordered',
    paymentStatus: purchase?.paymentStatus || 'Pending',
    warrantyPeriod: purchase?.warrantyPeriod || '',
    notes: purchase?.notes || '',
    items: (purchase?.items?.length ? purchase.items : [emptyPurchaseItem(initialPart)]).map((item) => ({
      id: rowId(item),
      localId: rowId(item) || localId(),
      inventoryPartId: rowId(item.inventoryPartId) || item.inventoryPartId || rowId(initialPart),
      partName: item.partName || initialPart?.partName || '',
      category: item.category || initialPart?.category || 'General',
      quantityOrdered: item.quantityOrdered ?? 1,
      quantityReceived: item.quantityReceived ?? 1,
      unitCost: item.unitCost ?? initialPart?.costPrice ?? 0
    }))
  }));

  const totalAmount = purchaseTotal(form.items);
  const partById = useMemo(() => new Map(parts.map((part) => [rowId(part), part])), [parts]);
  const canSave = Boolean(form.supplierName.trim() && form.invoiceRef.trim() && form.items.length && form.items.every((item) => item.inventoryPartId && (Number(item.quantityOrdered || 0) > 0 || Number(item.quantityReceived || 0) > 0)));

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateItem(key, field, value) {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => {
        if (item.localId !== key) return item;
        const next = { ...item, [field]: value };
        if (field === 'inventoryPartId') {
          const part = partById.get(value);
          next.partName = part?.partName || '';
          next.category = part?.category || 'General';
          next.unitCost = part?.costPrice || next.unitCost || 0;
        }
        return next;
      })
    }));
  }

  async function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const payload = {
        ...form,
        items: form.items.map((item) => ({
          id: item.id,
          inventoryPartId: item.inventoryPartId,
          partName: item.partName,
          category: item.category,
          quantityOrdered: Number(item.quantityOrdered || 0),
          quantityReceived: Number(item.quantityReceived || 0),
          unitCost: Number(item.unitCost || 0)
        }))
      };
      const result = await request(form.id ? `/purchase-imports/${form.id}` : '/purchase-imports', {
        method: form.id ? 'PATCH' : 'POST',
        body: JSON.stringify(payload)
      });
      let savedPurchase = result.purchase;
      if (billFile && rowId(savedPurchase)) {
        const body = new FormData();
        body.append('bill', billFile);
        const uploadResult = await request(`/purchase-imports/${rowId(savedPurchase)}/bill`, { method: 'POST', body });
        savedPurchase = uploadResult.purchase;
      }
      push(form.id ? 'Purchase / import updated' : 'Purchase / import saved');
      onSaved?.(savedPurchase);
      onClose();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-black/60 p-3 sm:p-4">
      <form className="purchase-modal-shell surface w-full max-w-6xl overflow-hidden p-0" onSubmit={submit}>
        <div className="purchase-modal-header flex items-start justify-between gap-4 p-5">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Purchase / Import</p>
            <h2 className="mt-1 text-xl font-black sm:text-2xl">{form.id ? 'Edit Purchase / Import' : 'New Purchase / Import'}</h2>
            <p className="mt-1 text-sm muted">Record supplier details, invoice status, and all received parts in one entry.</p>
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onClose} aria-label="Close purchase form"><X className="h-4 w-4" /></button>
        </div>
        <div className="purchase-modal-body max-h-[72vh] overflow-y-auto p-5">
          <section className="purchase-form-section">
            <div className="purchase-form-section-title">
              <Store className="h-4 w-4" />
              <span>Supplier Details</span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label><span className="label">Supplier / Shop name</span><input className="input" value={form.supplierName} onChange={(event) => update('supplierName', event.target.value)} required /></label>
              <label><span className="label">Contact number</span><input className="input" value={form.contactNumber} onChange={(event) => update('contactNumber', event.target.value)} /></label>
              <label><span className="label">Place / City</span><input className="input" value={form.placeCity} onChange={(event) => update('placeCity', event.target.value)} /></label>
              <label>
                <span className="label">Purchase source</span>
                <select className="input" value={form.purchaseSource} onChange={(event) => update('purchaseSource', event.target.value)}>
                  {purchaseSources.map((source) => <option key={source}>{source}</option>)}
                </select>
              </label>
            </div>
          </section>

          <section className="purchase-form-section mt-5">
            <div className="purchase-form-section-title">
              <ReceiptText className="h-4 w-4" />
              <span>Purchase Details</span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label><span className="label">Invoice / Ref No.</span><input className="input" value={form.invoiceRef} onChange={(event) => update('invoiceRef', event.target.value)} required /></label>
              <label><span className="label">Purchase date</span><input className="input" type="date" value={form.purchaseDate} onChange={(event) => update('purchaseDate', event.target.value)} /></label>
              <label>
                <span className="label">Delivery status</span>
                <select className="input" value={form.deliveryStatus} onChange={(event) => update('deliveryStatus', event.target.value)}>
                  {deliveryStatuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label>
                <span className="label">Payment status</span>
                <select className="input" value={form.paymentStatus} onChange={(event) => update('paymentStatus', event.target.value)}>
                  {paymentStatuses.map((status) => <option key={status}>{status}</option>)}
                </select>
              </label>
              <label><span className="label">Warranty period</span><input className="input" value={form.warrantyPeriod} onChange={(event) => update('warrantyPeriod', event.target.value)} placeholder="Example: 12 months" /></label>
              <label className="lg:col-span-2"><span className="label">Notes</span><input className="input" value={form.notes} onChange={(event) => update('notes', event.target.value)} /></label>
              <label>
                <span className="label">Bill / invoice file</span>
                <span className="purchase-file-input">
                  <UploadCloud className="h-4 w-4" />
                  <span className="truncate">{billFile?.name || purchase?.billFile?.originalName || 'Choose PDF or image'}</span>
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" onChange={(event) => setBillFile(event.target.files?.[0] || null)} />
                </span>
              </label>
            </div>
          </section>

          <section className="purchase-form-section mt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="purchase-form-section-title">
                <PackagePlus className="h-4 w-4" />
                <span>Items</span>
              </div>
              <button type="button" className="btn btn-secondary h-9 px-3" onClick={() => setForm((current) => ({ ...current, items: [...current.items, emptyPurchaseItem()] }))}>
                <Plus className="h-4 w-4" />Add Item
              </button>
            </div>
            <div className="purchase-items-table-wrap mt-4">
              <table className="data-table purchase-items-table">
                <thead>
                  <tr><th>Part</th><th>Category</th><th>Qty Ordered</th><th>Qty Received</th><th>Unit Cost</th><th>Total</th><th></th></tr>
                </thead>
                <tbody>
                  {form.items.map((item) => (
                    <tr key={item.localId}>
                      <td>
                        <select className="input" value={item.inventoryPartId} onChange={(event) => updateItem(item.localId, 'inventoryPartId', event.target.value)} required>
                          <option value="">Select part</option>
                          {parts.map((part) => <option key={rowId(part)} value={rowId(part)}>{part.partName}</option>)}
                        </select>
                      </td>
                      <td>
                        <select className="input" value={item.category} onChange={(event) => updateItem(item.localId, 'category', event.target.value)}>
                          {inventoryCategories.map((category) => <option key={category}>{category}</option>)}
                        </select>
                      </td>
                      <td><input className="input" type="number" min="0" value={item.quantityOrdered} onChange={(event) => updateItem(item.localId, 'quantityOrdered', event.target.value)} /></td>
                      <td><input className="input" type="number" min="0" value={item.quantityReceived} onChange={(event) => updateItem(item.localId, 'quantityReceived', event.target.value)} /></td>
                      <td><input className="input" type="number" min="0" step="0.01" value={item.unitCost} onChange={(event) => updateItem(item.localId, 'unitCost', event.target.value)} /></td>
                      <td className="font-black text-sky-100">{currency(Number(item.quantityReceived || 0) * Number(item.unitCost || 0))}</td>
                      <td className="text-right">
                        <button type="button" className="icon-button h-8 w-8 text-rose-100" aria-label="Remove item" disabled={form.items.length === 1} onClick={() => setForm((current) => ({ ...current, items: current.items.filter((row) => row.localId !== item.localId) }))}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end">
              <div className="purchase-total-pill"><span>Total</span><b>{currency(totalAmount)}</b></div>
            </div>
          </section>
        </div>
        <div className="purchase-modal-footer flex justify-end gap-2 p-5">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={!canSave || saving}>
            <Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Purchase / Import'}
          </button>
        </div>
      </form>
    </div>
  );
}

export function PurchaseRegisterTab({ parts = [], onPartsChanged }) {
  const { request, user } = useAuth();
  const { push } = useToast();
  const canEdit = can(user, 'edit_stock');
  const canDelete = can(user, 'delete_part');
  const canExport = can(user, 'export_reports');
  const [search, setSearch] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState(null);
  const [deletePurchase, setDeletePurchase] = useState(null);
  const [selectedId, setSelectedId] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const limit = 10;
  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (supplierId) params.set('supplierId', supplierId);
    if (deliveryStatus) params.set('deliveryStatus', deliveryStatus);
    if (paymentStatus) params.set('paymentStatus', paymentStatus);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return `?${params}`;
  }, [dateFrom, dateTo, debouncedSearch, deliveryStatus, limit, page, paymentStatus, supplierId]);
  const { data, loading, error, reload } = useResource(() => request(`/purchase-imports${query}`), [request, query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, supplierId, deliveryStatus, paymentStatus, dateFrom, dateTo]);

  const purchases = data?.purchases || [];
  const suppliers = data?.suppliers || [];
  const selectedQueryId = useMemo(() => new URLSearchParams(window.location.search).get('purchaseId') || '', []);

  useEffect(() => {
    if (selectedQueryId && selectedId !== selectedQueryId) setSelectedId(selectedQueryId);
    else if (!selectedId && purchases[0]) setSelectedId(rowId(purchases[0]));
  }, [purchases, selectedId, selectedQueryId]);

  const { data: detailData, loading: detailLoading, reload: reloadDetail } = useResource(
    () => selectedId ? request(`/purchase-imports/${selectedId}`) : Promise.resolve({ purchase: null }),
    [request, selectedId]
  );
  const selectedPurchase = detailData?.purchase || null;
  const summary = data?.summary || {};
  const hasFilters = Boolean(search || supplierId || deliveryStatus || paymentStatus || dateFrom || dateTo);
  const pagination = paginationFrom(data, purchases.length, limit);
  const metrics = [
    { label: 'Total Purchases', value: summary.totalPurchases || 0, helper: 'Purchase/import records', icon: ShoppingCart, tone: 'blue' },
    { label: 'Total Spent', value: currency(summary.totalSpent || 0), helper: 'Received purchase value', icon: CircleDollarSign, tone: 'cyan' },
    { label: 'Pending Deliveries', value: summary.pendingDeliveries || 0, helper: 'Ordered or partially received', icon: Truck, tone: summary.pendingDeliveries ? 'amber' : 'green' },
    { label: 'Pending Payments', value: summary.pendingPayments || 0, helper: 'Pending or partial payments', icon: ReceiptText, tone: summary.pendingPayments ? 'red' : 'green' },
    { label: 'Low Stock Parts', value: summary.lowStockParts || 0, helper: 'Parts needing attention', icon: PackageCheck, tone: summary.lowStockParts ? 'amber' : 'green' },
    { label: 'Returned Parts', value: summary.returnedParts || 0, helper: 'Returned purchase records', icon: PackagePlus, tone: summary.returnedParts ? 'red' : 'blue' }
  ];

  function resetFilters() {
    setSearch('');
    setSupplierId('');
    setDeliveryStatus('');
    setPaymentStatus('');
    setDateFrom('');
    setDateTo('');
  }

  function exportCsv() {
    downloadCsv(
      'purchase-import-register.csv',
      ['Invoice / Ref No.', 'Supplier / Shop', 'Place / City', 'Purchase Date', 'Status', 'Payment Status', 'Total Amount', 'Items Count'],
      purchases.map((purchase) => [
        purchase.invoiceRef,
        purchase.supplierName,
        purchase.placeCity,
        formatDate(purchase.purchaseDate),
        purchase.deliveryStatus,
        purchase.paymentStatus,
        purchase.totalAmount,
        purchase.itemsCount || purchase.items?.length || 0
      ])
    );
  }

  async function confirmDelete() {
    if (!deletePurchase) return;
    try {
      await preserveScroll(async () => {
        await request(`/purchase-imports/${rowId(deletePurchase)}`, { method: 'DELETE' });
        push('Purchase / import deleted');
        setDeletePurchase(null);
        setSelectedId('');
        reload({ silent: true });
        onPartsChanged?.();
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div className="purchase-register-page">
      <section className="erp-page-header purchase-erp-header mb-5">
        <div className="relative z-[1] flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--brand)]">Purchase Ledger</p>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Purchase / Import Register</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Track parts purchased from different places, suppliers, shops, and online orders.</p>
          </div>
          {canEdit ? <button type="button" className="btn btn-primary h-10 px-4" onClick={() => setEditor({})}><Plus className="h-4 w-4" />New Purchase / Import</button> : null}
        </div>
      </section>
      <div className="inventory-kpi-grid mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {metrics.map((item) => <PurchaseMetricCard key={item.label} {...item} />)}
      </div>
      <div className="surface inventory-filter-bar purchase-filter-bar mb-5 p-4">
        <SearchBox value={search} onChange={setSearch} placeholder="Search part, supplier, invoice number, place" />
        <select className="input" value={supplierId} onChange={(event) => setSupplierId(event.target.value)}>
          <option value="">All suppliers</option>
          {suppliers.map((supplier) => <option key={rowId(supplier)} value={rowId(supplier)}>{supplier.name}</option>)}
        </select>
        <select className="input" value={deliveryStatus} onChange={(event) => setDeliveryStatus(event.target.value)}>
          <option value="">All statuses</option>
          {deliveryStatuses.map((status) => <option key={status}>{status}</option>)}
        </select>
        <select className="input" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
          <option value="">All payments</option>
          {paymentStatuses.map((status) => <option key={status}>{status}</option>)}
        </select>
        <input className="input" type="date" aria-label="Start date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <input className="input" type="date" aria-label="End date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        <button type="button" className="btn btn-secondary h-10 px-4" disabled={!hasFilters} onClick={resetFilters}>Reset Filters</button>
        {canExport ? <button type="button" className="btn btn-secondary h-10 px-4" onClick={exportCsv}><Download className="h-4 w-4" />Export CSV</button> : null}
        <p className="inventory-count-pill xl:col-span-8">Showing <b>{purchases.length}</b> purchase/import record{purchases.length === 1 ? '' : 's'}</p>
      </div>
      {!purchases.length ? (
        <EmptyState
          icon={FileSpreadsheet}
          title={hasFilters ? 'No purchases match your filters' : 'No purchase imports recorded'}
          message={hasFilters ? 'Try resetting filters to review all purchase records.' : 'Create a purchase/import record when parts are ordered or received.'}
          action={hasFilters ? <button type="button" className="btn btn-secondary" onClick={resetFilters}>Reset Filters</button> : canEdit ? <button type="button" className="btn btn-primary" onClick={() => setEditor({})}>New Purchase / Import</button> : null}
        />
      ) : (
        <>
          <div className="table-wrap purchase-table-wrap surface bg-[var(--surface)]">
            <table className="data-table purchase-register-table">
              <colgroup>
                <col className="purchase-col-index" />
                <col className="purchase-col-invoice" />
                <col className="purchase-col-supplier" />
                <col className="purchase-col-place" />
                <col className="purchase-col-date" />
                <col className="purchase-col-status" />
                <col className="purchase-col-payment" />
                <col className="purchase-col-amount" />
                <col className="purchase-col-count" />
                <col className="purchase-col-actions" />
              </colgroup>
              <thead>
                <tr><th>#</th><th>Invoice / Ref No.</th><th>Supplier / Shop</th><th>Place / City</th><th>Purchase Date</th><th>Status</th><th>Payment Status</th><th>Total Amount</th><th>Items Count</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {purchases.map((purchase, index) => (
                  <tr key={rowId(purchase)} className={selectedId === rowId(purchase) ? 'purchase-row-selected' : ''}>
                    <td className="purchase-cell-index">{(pagination.page - 1) * pagination.limit + index + 1}</td>
                    <td className="purchase-cell-invoice font-black text-slate-50">{purchase.invoiceRef}</td>
                    <td className="purchase-cell-supplier">
                      <span className="block font-bold text-slate-100">{purchase.supplierName}</span>
                      <span className="block text-xs muted">{purchase.purchaseSource || 'Supplier'}</span>
                    </td>
                    <td className="purchase-cell-place">{purchase.placeCity || '-'}</td>
                    <td className="purchase-cell-date">{formatDate(purchase.purchaseDate)}</td>
                    <td className="purchase-cell-badge"><StatusBadge status={purchase.deliveryStatus} /></td>
                    <td className="purchase-cell-badge"><StatusBadge status={purchase.paymentStatus} kind="payment" /></td>
                    <td className="purchase-cell-money font-black">{currency(purchase.totalAmount)}</td>
                    <td className="purchase-cell-count">{purchase.itemsCount || purchase.items?.length || 0}</td>
                    <td className="purchase-cell-actions">
                      <div className="inventory-actions purchase-row-actions">
                        <button type="button" className="icon-button h-8 w-8" title="View purchase" onClick={() => setSelectedId(rowId(purchase))}><Eye className="h-4 w-4" /></button>
                        {canEdit ? <button type="button" className="icon-button h-8 w-8" title="Edit purchase" onClick={() => setEditor(purchase)}><Edit3 className="h-4 w-4" /></button> : null}
                        {canDelete ? <button type="button" className="icon-button h-8 w-8 text-rose-100" title="Delete purchase" onClick={() => setDeletePurchase(purchase)}><Trash2 className="h-4 w-4" /></button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls pagination={pagination} onPageChange={setPage} />
          <PurchaseDetailsPanel purchase={selectedPurchase} loading={detailLoading} onReload={reloadDetail} />
        </>
      )}
      {editor ? (
        <PurchaseImportModal
          purchase={rowId(editor) ? editor : null}
          parts={parts}
          onClose={() => setEditor(null)}
          onSaved={() => {
            reload({ silent: true });
            onPartsChanged?.();
          }}
        />
      ) : null}
      {deletePurchase ? (
        <ConfirmModal
          title="Delete Purchase / Import"
          message="Are you sure you want to delete this purchase/import record? This may affect purchase history and stock records."
          confirmLabel="Delete"
          onCancel={() => setDeletePurchase(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}

function PurchaseDetailsPanel({ purchase, loading }) {
  if (loading) {
    return <div className="mt-5 grid gap-4 lg:grid-cols-3"><div className="surface h-56 animate-pulse p-5 lg:col-span-3" /></div>;
  }
  if (!purchase) return null;
  const usedByItem = purchase.usedByItem || {};
  const items = purchase.items || [];
  const purchaseTotalAmount = Number.isFinite(Number(purchase.totalAmount))
    ? Number(purchase.totalAmount)
    : items.reduce((sum, item) => sum + Number(item.totalCost || 0), 0);
  return (
    <section className="purchase-details-grid mt-5">
      <article className="surface purchase-detail-card purchase-info-card p-5">
        <div className="purchase-card-title"><ReceiptText className="h-4 w-4" />Purchase Details</div>
        <dl className="mt-4 grid gap-3 text-sm">
          <DetailRow label="Invoice / Ref No." value={purchase.invoiceRef} />
          <DetailRow label="Supplier / Shop" value={purchase.supplierName} />
          <DetailRow label="Contact number" value={purchase.contactNumber || '-'} />
          <DetailRow label="Place / City" value={purchase.placeCity || '-'} />
          <DetailRow label="Purchase date" value={formatDate(purchase.purchaseDate)} />
          <DetailRow label="Delivery status" value={<StatusBadge status={purchase.deliveryStatus} />} />
          <DetailRow label="Payment status" value={<StatusBadge status={purchase.paymentStatus} kind="payment" />} />
          <DetailRow label="Warranty" value={purchase.warrantyPeriod || '-'} />
          <DetailRow label="Notes" value={purchase.notes || '-'} />
          <DetailRow label="Invoice / Bill" value={<BillFileDisplay billFile={purchase.billFile} />} />
        </dl>
      </article>
      <article className="surface purchase-detail-card purchase-items-card p-5">
        <div className="purchase-card-title"><PackageCheck className="h-4 w-4" />Items in this Purchase</div>
        <div className="purchase-items-stack mt-4">
          {items.map((item) => (
            <div className="purchase-item-card" key={purchaseItemId(item)}>
              <p className="purchase-item-name">{item.partName}</p>
              <div className="purchase-item-meta">
                <span>Ordered: <b>{item.quantityOrdered}</b></span>
                <span>Received: <b>{item.quantityReceived}</b></span>
                <span>Unit Cost: <b>{currency(item.unitCost)}</b></span>
                <span>Total: <b>{currency(item.totalCost)}</b></span>
              </div>
            </div>
          ))}
          <div className="purchase-detail-total">
            <span>Purchase Total</span>
            <b>{currency(purchaseTotalAmount)}</b>
          </div>
        </div>
      </article>
      <article className="surface purchase-detail-card purchase-usage-card p-5">
        <div className="purchase-card-title"><Truck className="h-4 w-4" />Used in Work Orders</div>
        {purchase.usage?.length ? (
          <div className="purchase-usage-list mt-4">
            {purchase.usage.map((usage) => {
              const workOrder = usage.workOrderId || {};
              const workOrderId = rowId(workOrder);
              return (
                <div key={rowId(usage)} className="purchase-usage-row">
                  <div className="purchase-usage-main">
                    <Link className="stock-source-link purchase-workorder-badge" to={`/admin/work-orders/${workOrderId}`}>{workOrderLabel(workOrderId)}</Link>
                    <span className="purchase-usage-customer">{workOrder.customerId?.name || 'Customer'}</span>
                    <span className="purchase-usage-date">{formatDate(usage.createdAt)}</span>
                  </div>
                  <b className="purchase-usage-qty">{usage.quantity} used</b>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 rounded-card border border-white/10 bg-white/[0.035] p-4 text-sm muted">No linked work-order usage yet.</p>
        )}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="purchase-summary-tile"><span>Total Used</span><b>{purchase.totalUsed || 0}</b></div>
          <div className="purchase-summary-tile"><span>Remaining Stock</span><b>{purchase.totalRemaining || 0}</b></div>
        </div>
        {items.length ? (
          <div className="purchase-item-usage-list mt-4">
            {items.map((item) => (
              <div key={purchaseItemId(item)} className="purchase-item-usage-row">
                <span>{item.partName}</span>
                <b>{usedByItem[purchaseItemId(item)] || 0} used</b>
              </div>
            ))}
          </div>
        ) : null}
      </article>
    </section>
  );
}

function BillFileDisplay({ billFile }) {
  const billUrl = billFile?.url ? uploadedAssetUrl(billFile.url) : '';
  if (!billUrl) return <span className="purchase-bill-empty">No bill uploaded</span>;

  const name = fileNameFromBill(billFile);
  const imageBill = isImageBill(billFile, billUrl);
  const Icon = imageBill ? FileImage : isPdfBill(billFile, billUrl) ? FileText : ReceiptText;
  return (
    <div className="purchase-bill-file">
      <div className="purchase-bill-preview" aria-hidden="true">
        {imageBill ? <img src={billUrl} alt="" /> : <Icon className="h-5 w-5" />}
      </div>
      <div className="purchase-bill-main">
        <span className="purchase-bill-name" title={name}>{name}</span>
        <span className="purchase-bill-meta">{imageBill ? 'Image bill' : isPdfBill(billFile, billUrl) ? 'PDF bill' : 'Bill file'}</span>
      </div>
      <div className="purchase-bill-actions">
        <a className="stock-source-link" href={billUrl} target="_blank" rel="noreferrer">View</a>
        <a className="stock-source-link" href={billUrl} download={name}>Download</a>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div className="purchase-detail-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function SupplierNameCell({ supplier }) {
  return (
    <div className="supplier-name-stack">
      <span className="supplier-name-title">{supplier.name}</span>
      <span className="supplier-phone-line">
        <Phone className="h-3.5 w-3.5" />
        {supplier.phone || 'Not provided'}
      </span>
    </div>
  );
}

function SupplierPartsList({ parts = [] }) {
  const safeParts = Array.isArray(parts) ? parts.filter(Boolean) : [];
  if (!safeParts.length) return <span className="supplier-parts-empty">-</span>;
  const visible = safeParts.slice(0, 2);
  const remaining = safeParts.length - visible.length;
  return (
    <span className="supplier-parts-list" title={safeParts.join('\n')}>
      {visible.map((part) => <span key={part} className="supplier-part-line">{part}</span>)}
      {remaining > 0 ? <span className="supplier-parts-more">+{remaining} more</span> : null}
    </span>
  );
}

export function SupplierModal({ supplier = null, onClose, onSaved }) {
  const { request } = useAuth();
  const { push } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    id: rowId(supplier),
    name: supplier?.name || '',
    phone: supplier?.phone || '',
    email: supplier?.email || '',
    address: supplier?.address || supplier?.city || '',
    city: supplier?.city || '',
    gstNumber: supplier?.gstNumber || '',
    notes: supplier?.notes || '',
    status: supplier?.status || 'Active'
  });
  const canSave = Boolean(form.name.trim());

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const result = await request(form.id ? `/suppliers/${form.id}` : '/suppliers', {
        method: form.id ? 'PATCH' : 'POST',
        body: JSON.stringify(form)
      });
      push(result.message || 'Supplier saved');
      onSaved?.(result.supplier);
      onClose();
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[95] grid place-items-center bg-black/60 p-4">
      <form className="surface w-full max-w-2xl p-5" onSubmit={submit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Supplier</p>
            <h2 className="mt-1 text-xl font-black">{form.id ? 'Edit Supplier' : 'Add Supplier'}</h2>
          </div>
          <button type="button" className="icon-button h-8 w-8" onClick={onClose} aria-label="Close supplier form"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label><span className="label">Supplier name</span><input className="input" value={form.name} onChange={(event) => update('name', event.target.value)} required /></label>
          <label><span className="label">Phone</span><input className="input" value={form.phone} onChange={(event) => update('phone', event.target.value)} /></label>
          <label><span className="label">Email optional</span><input className="input" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} /></label>
          <label><span className="label">Address / City</span><input className="input" value={form.address} onChange={(event) => update('address', event.target.value)} /></label>
          <label><span className="label">City</span><input className="input" value={form.city} onChange={(event) => update('city', event.target.value)} /></label>
          <label><span className="label">GST optional</span><input className="input" value={form.gstNumber} onChange={(event) => update('gstNumber', event.target.value)} /></label>
          <label>
            <span className="label">Status</span>
            <select className="input" value={form.status} onChange={(event) => update('status', event.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </label>
          <label className="sm:col-span-2"><span className="label">Notes</span><input className="input" value={form.notes} onChange={(event) => update('notes', event.target.value)} /></label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-50" disabled={!canSave || saving}><Save className="h-4 w-4" />Save Supplier</button>
        </div>
      </form>
    </div>
  );
}

export function SuppliersTab() {
  const { request, user } = useAuth();
  const { push } = useToast();
  const canEdit = can(user, 'edit_stock');
  const canDelete = can(user, 'delete_part');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState(null);
  const [deleteSupplier, setDeleteSupplier] = useState(null);
  const debouncedSearch = useDebouncedValue(search);
  const limit = 10;
  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (status) params.set('status', status);
    return `?${params}`;
  }, [debouncedSearch, limit, page, status]);
  const { data, loading, error, reload } = useResource(() => request(`/suppliers${query}`), [request, query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  async function confirmDelete() {
    if (!deleteSupplier) return;
    try {
      await request(`/suppliers/${rowId(deleteSupplier)}`, { method: 'DELETE' });
      push('Supplier deleted');
      setDeleteSupplier(null);
      reload({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  const suppliers = data?.suppliers || [];
  const pagination = paginationFrom(data, suppliers.length, limit);
  const hasFilters = Boolean(search || status);
  return (
    <div className="suppliers-page">
      <section className="erp-page-header purchase-erp-header mb-5">
        <div className="relative z-[1] flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--brand)]">Supplier Directory</p>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Suppliers</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Manage supplier, shop, dealer, and online source details used by purchase imports.</p>
          </div>
          {canEdit ? <button type="button" className="btn btn-primary h-10 px-4" onClick={() => setEditor({})}><Plus className="h-4 w-4" />Add Supplier</button> : null}
        </div>
      </section>
      <div className="surface inventory-filter-bar supplier-filter-bar mb-5 p-4">
        <SearchBox value={search} onChange={setSearch} placeholder="Search supplier, phone, city, GST" />
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option>Active</option>
          <option>Inactive</option>
        </select>
        <button type="button" className="btn btn-secondary h-10 px-4" disabled={!hasFilters} onClick={() => { setSearch(''); setStatus(''); }}>Reset</button>
      </div>
      {!suppliers.length ? (
        <EmptyState
          icon={Store}
          title={hasFilters ? 'No suppliers match your filters' : 'No suppliers saved'}
          message={hasFilters ? 'Try changing the search or status filter.' : 'Suppliers are created automatically from purchases or manually from this tab.'}
          action={hasFilters ? <button type="button" className="btn btn-secondary" onClick={() => { setSearch(''); setStatus(''); }}>Reset Filters</button> : canEdit ? <button type="button" className="btn btn-primary" onClick={() => setEditor({})}>Add Supplier</button> : null}
        />
      ) : (
        <>
          <div className="table-wrap suppliers-table-wrap surface bg-[var(--surface)]">
            <table className="data-table suppliers-table">
              <colgroup>
                <col className="supplier-col-name" />
                <col className="supplier-col-place" />
                <col className="supplier-col-parts" />
                <col className="supplier-col-total" />
                <col className="supplier-col-pending" />
                <col className="supplier-col-date" />
                <col className="supplier-col-status" />
                <col className="supplier-col-actions" />
              </colgroup>
              <thead><tr><th>Supplier / Shop</th><th>Place / City</th><th>Parts Supplied</th><th>Purchases</th><th>Pending Amount</th><th>Last Purchase</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {suppliers.map((supplier) => (
                  <tr key={rowId(supplier)}>
                    <td className="supplier-cell-name" data-label="Supplier / Shop">
                      <SupplierNameCell supplier={supplier} />
                    </td>
                    <td className="supplier-cell-place" data-label="Place / City">
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{supplier.city || supplier.address || '-'}</span>
                    </td>
                    <td className="supplier-cell-parts" data-label="Parts Supplied"><SupplierPartsList parts={supplier.partsSupplied} /></td>
                    <td className="supplier-cell-total font-bold" data-label="Purchases">{supplier.totalPurchases || 0}</td>
                    <td className="supplier-cell-pending font-bold" data-label="Pending Amount">{currency(supplier.pendingPaymentAmount || 0)}</td>
                    <td className="supplier-cell-date" data-label="Last Purchase">{supplier.lastPurchaseDate ? formatDate(supplier.lastPurchaseDate) : '-'}</td>
                    <td className="supplier-cell-status" data-label="Status"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-black ${supplier.status === 'Active' ? 'border-emerald-300/25 bg-emerald-400/15 text-emerald-100' : 'border-slate-300/20 bg-slate-400/10 text-slate-200'}`}>{supplier.status}</span></td>
                    <td className="supplier-cell-actions" data-label="Actions">
                      <div className="inventory-actions supplier-row-actions">
                        {canEdit ? <button type="button" className="icon-button h-8 w-8" onClick={() => setEditor(supplier)} aria-label={`Edit ${supplier.name}`}><Edit3 className="h-4 w-4" /></button> : null}
                        {canDelete ? <button type="button" className="icon-button h-8 w-8 text-rose-100" onClick={() => setDeleteSupplier(supplier)} aria-label={`Delete ${supplier.name}`}><Trash2 className="h-4 w-4" /></button> : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationControls pagination={pagination} onPageChange={setPage} />
        </>
      )}
      {editor ? <SupplierModal supplier={rowId(editor) ? editor : null} onClose={() => setEditor(null)} onSaved={() => reload({ silent: true })} /> : null}
      {deleteSupplier ? (
        <ConfirmModal
          title="Delete Supplier"
          message="Are you sure you want to delete this supplier? Existing purchase history should remain safe."
          confirmLabel="Delete"
          onCancel={() => setDeleteSupplier(null)}
          onConfirm={confirmDelete}
        />
      ) : null}
    </div>
  );
}

export function AddStockChoiceModal({ part, onClose, onManual, onPurchase }) {
  return (
    <div className="fixed inset-0 z-[92] grid place-items-center bg-black/55 p-4">
      <div className="surface w-full max-w-2xl p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Add Stock</p>
            <h2 className="mt-1 text-xl font-black">{part.partName}</h2>
            <p className="mt-1 text-sm muted">Choose the right flow so stock history stays clean.</p>
          </div>
          <button type="button" className="icon-button h-8 w-8" onClick={onClose} aria-label="Close add stock options"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <button type="button" className="purchase-choice-card" onClick={onManual}>
            <Search className="h-5 w-5" />
            <b>Manual Stock Adjustment</b>
            <span>Use only for physical stock correction, returns, and manual quantity adjustments.</span>
          </button>
          <button type="button" className="purchase-choice-card purchase-choice-card-primary" onClick={onPurchase}>
            <Building2 className="h-5 w-5" />
            <b>Add Purchase / Import</b>
            <span>Use when parts are bought or imported from a supplier, shop, dealer, or online store.</span>
          </button>
        </div>
      </div>
    </div>
  );
}
