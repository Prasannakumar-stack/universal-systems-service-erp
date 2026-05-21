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
  getCustomerDisplayId,
  getInvoiceDisplayId,
  getPaymentDisplayId,
  getWorkOrderDisplayId,
  getPdfLabel,
  matchesDisplaySearch,
  paymentSearchText,
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
import { can, normalizeRole } from '../../utils/roles.js';

export function PaymentsPage({ role = 'admin' }) {
  const { request, user } = useAuth();
  const { push } = useToast();
  const location = useLocation();
  const effectiveRole = user?.role || role;
  const isTechnician = normalizeRole(effectiveRole) === 'technician';
  const canRecordPayments = can(effectiveRole, 'record_payment');
  const base = isTechnician ? '/tech' : '/admin';
  const invoiceIdParam = useMemo(() => new URLSearchParams(location.search).get('invoiceId') || '', [location.search]);
  const invoiceIdParamHandled = useRef('');
  const [form, setForm] = useState({ invoiceId: invoiceIdParam, paidAmount: '', method: 'Cash', transactionId: '' });
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const debouncedSearch = useDebouncedValue(search);
  const paymentQuery = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (paymentStatus) params.set('status', paymentStatus);
    if (methodFilter) params.set('method', methodFilter);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return `?${params}`;
  }, [dateFrom, dateTo, debouncedSearch, limit, methodFilter, page, paymentStatus]);
  const { data, loading, error, reload } = useResource(async () => {
    const [payments, invoices, selectedInvoice] = await Promise.all([
      request(`/payments${paymentQuery}`),
      request('/invoices?paymentStatus=unpaid&limit=100'),
      invoiceIdParam ? request(`/invoices?invoiceId=${encodeURIComponent(invoiceIdParam)}&limit=1`).catch(() => ({ invoices: [] })) : Promise.resolve({ invoices: [] })
    ]);
    const invoiceRows = [...(invoices.invoices || []), ...(selectedInvoice.invoices || [])];
    const invoiceMap = new Map(invoiceRows.map((invoice) => [recordId(invoice), invoice]));
    return { ...payments, invoices: Array.from(invoiceMap.values()) };
  }, [invoiceIdParam, paymentQuery, request]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, paymentStatus, methodFilter, dateFrom, dateTo]);

  useEffect(() => {
    if (!invoiceIdParam) {
      invoiceIdParamHandled.current = '';
      return;
    }
    if (!data?.invoices?.length) {
      setForm((current) => ({ ...current, invoiceId: invoiceIdParam }));
      return;
    }
    if (invoiceIdParamHandled.current === invoiceIdParam) return;
    const invoice = findInvoice(data.invoices, invoiceIdParam);
    const dueAmount = invoiceDueAmount(invoice);
    setForm((current) => ({
      ...current,
      invoiceId: invoiceIdParam,
      paidAmount: dueAmount > 0 ? String(dueAmount) : ''
    }));
    invoiceIdParamHandled.current = invoiceIdParam;
  }, [invoiceIdParam, data?.invoices]);

  function selectInvoice(invoiceId) {
    const invoice = findInvoice(data?.invoices || [], invoiceId);
    const dueAmount = invoiceDueAmount(invoice);
    setForm((current) => ({
      ...current,
      invoiceId,
      paidAmount: dueAmount > 0 ? String(dueAmount) : ''
    }));
  }

  async function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    const paidAmount = Number(form.paidAmount);
    const invoice = findInvoice(data?.invoices || [], form.invoiceId);
    const dueAmount = invoiceDueAmount(invoice);
    if (!form.invoiceId) {
      push('Please select an invoice', 'error');
      return;
    }
    if (!form.paidAmount || !Number.isFinite(paidAmount) || paidAmount <= 0) {
      push('Please enter a paid amount greater than zero', 'error');
      return;
    }
    if (!invoice) {
      push('Selected invoice was not found', 'error');
      return;
    }
    if (invoice && paidAmount > dueAmount) {
      push('Paid amount cannot exceed due amount', 'error');
      return;
    }
    try {
      await preserveScroll(async () => {
        await request('/payments', {
          method: 'POST',
          body: JSON.stringify({ invoiceId: form.invoiceId, amount: form.paidAmount, method: form.method, transactionId: form.transactionId })
        });
        setForm((current) => ({ ...current, paidAmount: '', transactionId: '' }));
        push('Payment recorded successfully');
        reload({ silent: true });
        window.dispatchEvent(new Event('us:billing-updated'));
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  const searchTerm = debouncedSearch.trim();
  const visiblePayments = searchTerm
    ? (data.payments || []).filter((payment) => matchesDisplaySearch(searchTerm, paymentSearchText(payment)))
    : (data.payments || []);

  const selectedInvoice = findInvoice(data.invoices, form.invoiceId);
  const selectedBalanceDue = invoiceDueAmount(selectedInvoice);
  const canRecordPayment = canRecordPayments && Boolean(form.invoiceId && Number(form.paidAmount) > 0);
  const hasActiveFilters = Boolean(search.trim() || paymentStatus || methodFilter || dateFrom || dateTo);
  const paymentSummaryByInvoice = (data.payments || []).reduce((map, payment) => {
    const id = payment.invoiceId?.id || payment.invoiceId?._id || payment.invoiceId;
    if (!id) return map;
    map.set(id, [...(map.get(id) || []), payment]);
    return map;
  }, new Map());
  function paymentMethodDisplay(payment) {
    const invoice = payment?.invoiceId;
    const invoiceId = invoice?.id || invoice?._id || invoice;
    const payments = paymentSummaryByInvoice.get(invoiceId) || (payment ? [payment] : []);
    if (!payments.length) return '-';
    const byMethod = payments.reduce((summary, payment) => {
      const method = payment.method || 'Other';
      summary[method] = Number(summary[method] || 0) + Number(payment.paidAmount || 0);
      return summary;
    }, {});
    const entries = Object.entries(byMethod);
    if (entries.length <= 1) return payment?.method || entries[0]?.[0] || '-';
    return entries.map(([method, amount]) => `${method} ${currency(amount)}`).join(' + ');
  }
  const paymentTotals = data.summary || {
    totalCollected: (data.payments || []).reduce((sum, payment) => sum + Number(payment.paidAmount || 0), 0),
    pendingBalance: (data.invoices || []).reduce((sum, invoice) => sum + invoiceDueAmount(invoice), 0),
    paidInvoices: (data.invoices || []).filter((invoice) => invoice.status === 'Paid').length,
    partialInvoices: (data.invoices || []).filter((invoice) => invoice.status === 'Partial').length,
    todayCollection: (data.payments || []).filter((payment) => isToday(payment.createdAt)).reduce((sum, payment) => sum + Number(payment.paidAmount || 0), 0)
  };
  const paymentKpis = [
    { icon: CreditCard, label: 'Total Collected', value: currency(paymentTotals.totalCollected), helper: 'Received amount', tone: 'green' },
    { icon: AlertTriangle, label: 'Pending Balance', value: currency(paymentTotals.pendingBalance), helper: 'Still outstanding', tone: 'amber', glow: Number(paymentTotals.pendingBalance || 0) > 0 },
    { icon: CheckCircle2, label: 'Paid Invoices', value: paymentTotals.paidInvoices, helper: 'Fully settled', tone: 'green' },
    { icon: ReceiptText, label: 'Partial Invoices', value: paymentTotals.partialInvoices, helper: 'Needs follow-up', tone: 'amber' },
    { icon: CalendarClock, label: "Today's Collection", value: currency(paymentTotals.todayCollection), helper: 'Collected today', tone: 'blue' }
  ];

  function resetFilters() {
    setSearch('');
    setPaymentStatus('');
    setMethodFilter('');
    setDateFrom('');
    setDateTo('');
  }

  function invoiceSourceLabel(invoice) {
    if (recordId(invoice?.workOrderId)) return getWorkOrderDisplayId(invoice.workOrderId);
    if (recordId(invoice?.amcContractId)) return invoice.amcContractId?.contractId || 'AMC Contract';
    return '-';
  }

  function invoiceSourceCell(invoice) {
    if (recordId(invoice?.workOrderId)) {
      return <Link className="billing-link" to={`${base}/work-orders/${recordId(invoice.workOrderId)}`}>{getWorkOrderDisplayId(invoice.workOrderId)}</Link>;
    }
    if (recordId(invoice?.amcContractId)) {
      return (
        <Link className="billing-link" to={`${base}/amc-contracts`}>
          {invoice.amcContractId?.contractId || 'AMC Contract'}
          <span className="block truncate text-xs muted" title={invoice.amcContractId?.contractType || '-'}>{invoice.amcContractId?.contractType || '-'}</span>
        </Link>
      );
    }
    return <span className="muted">-</span>;
  }

  return (
    <div className="billing-page payments-page">
      <section className="billing-hero mb-5">
        <div className="relative z-[1]">
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--brand)]">Billing</p>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Payments</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 muted">
            {isTechnician ? 'Read-only payment records for assigned service work.' : 'Record cash, UPI, and partial payments with invoice balance tracking.'}
          </p>
        </div>
      </section>

      <div className="billing-kpi-grid mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {paymentKpis.map((item) => <BillingMetricCard key={item.label} {...item} />)}
      </div>

      <div className="surface billing-filter-bar mb-5 grid gap-3 p-4 xl:grid-cols-[minmax(320px,1fr)_155px_145px_155px_155px_auto]">
        <div className="min-w-0">
          <SearchBox value={search} onChange={setSearch} placeholder="Search payment ID, invoice ID, work order ID, customer, phone" />
        </div>
        <select className="input" value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)}>
          <option value="">All statuses</option>
          {['Paid', 'Partial', 'Pending'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="input" value={methodFilter} onChange={(event) => setMethodFilter(event.target.value)}>
          <option value="">All methods</option>
          {(data.methods || ['Cash', 'UPI']).map((item) => <option key={item}>{item}</option>)}
        </select>
        <input className="input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <input className="input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        <button type="button" className="btn btn-secondary h-10 whitespace-nowrap px-4" disabled={!hasActiveFilters} onClick={resetFilters}>Reset Filters</button>
      </div>

      {canRecordPayments ? (
        <form className="surface payment-entry-panel mb-5 grid gap-5 p-5 xl:grid-cols-[1.05fr_.95fr]" onSubmit={submit}>
          <div>
            <div className="mb-4">
              <h2 className="text-xl font-black">Record Payment</h2>
              <p className="mt-1 text-sm muted">Select an invoice, confirm received amount, and record the payment.</p>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(240px,1fr)_180px_160px_auto]">
            <label className="lg:col-span-4">
              <span className="label">Select Invoice</span>
              <select className="input" value={form.invoiceId} onChange={(event) => selectInvoice(event.target.value)} required>
                <option value="">Select invoice</option>
                {data.invoices.filter((invoice) => invoiceDueAmount(invoice) > 0 || invoice.id === form.invoiceId || invoice._id === form.invoiceId).map((invoice) => {
                  const invoiceId = invoice.id || invoice._id;
                  return <option key={invoiceId} value={invoiceId}>{invoice.invoiceNumber} - {currency(invoiceDueAmount(invoice))} due</option>;
                })}
              </select>
            </label>
            <label>
              <span className="label">Payment Amount</span>
              <input className="input payment-amount-input" type="number" min="1" placeholder="Enter amount received" value={form.paidAmount} onChange={(event) => setForm((current) => ({ ...current, paidAmount: event.target.value }))} required />
              {selectedInvoice ? <span className="mt-1 block text-xs font-semibold text-amber-100">Balance due: {currency(selectedBalanceDue)}</span> : null}
            </label>
            <label>
              <span className="label">Payment Method</span>
              <select className="input" value={form.method} onChange={(event) => setForm((current) => ({ ...current, method: event.target.value }))}>
                <option>Cash</option><option>UPI</option><option disabled>Cash + UPI</option>
              </select>
            </label>
            {form.method === 'UPI' ? <label><span className="label">Transaction ID</span><input className="input" placeholder="Transaction ID (optional)" value={form.transactionId} onChange={(event) => setForm((current) => ({ ...current, transactionId: event.target.value }))} /></label> : <div className="hidden lg:block" />}
            <button type="submit" className="btn btn-primary h-10 self-end disabled:cursor-not-allowed disabled:opacity-50" disabled={!canRecordPayment}><CreditCard className="h-4 w-4" />Record Payment</button>
            </div>
          </div>
          <div className="selected-invoice-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="font-black">Selected Invoice</h2>
              {selectedInvoice ? <BillingStatusPill status={selectedInvoice.status} /> : null}
            </div>
            {selectedInvoice ? (
              <div className="mt-4 grid gap-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <BillingInfo label="Invoice ID" value={getInvoiceDisplayId(selectedInvoice)} />
                  <BillingInfo label="Linked Source" value={invoiceSourceLabel(selectedInvoice)} />
                </div>
                <div className="billing-info-block">
                  <p className="text-xs font-black uppercase text-slate-400">Customer</p>
                  <p className="mt-1 truncate font-black text-slate-100" title={selectedInvoice.customerId?.name || '-'}>{selectedInvoice.customerId?.name || '-'}</p>
                  <p className="text-xs muted">{selectedInvoice.customerId?.phone || '-'}</p>
                  <p className="text-xs muted">Customer ID: {getCustomerDisplayId(selectedInvoice.customerId)}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <BillingInfo label="Invoice Total" value={currency(selectedInvoice.total)} strong />
                  <BillingInfo label="Paid Amount" value={currency(selectedInvoice.paidAmount)} tone="green" />
                  <BillingInfo label="Balance Due" value={currency(selectedBalanceDue)} tone={selectedBalanceDue > 0 ? 'amber' : 'green'} />
                </div>
              </div>
            ) : (
              <div className="billing-inline-empty">
                <ReceiptText className="h-8 w-8 text-[var(--brand)]" />
                <div>
                  <p className="font-black text-slate-100">No invoice selected</p>
                  <p className="mt-1 text-sm muted">Select an invoice to view balance and record payment.</p>
                </div>
              </div>
            )}
          </div>
        </form>
      ) : (
        <div className="surface payment-entry-panel mb-5 p-5">
          <h2 className="text-xl font-black">Payment Records</h2>
          <p className="mt-1 text-sm muted">This role has read-only payment access. An authorized billing user can record payment after confirmation.</p>
        </div>
      )}
      {!visiblePayments.length ? (
        <EmptyState
          icon={CreditCard}
          title={hasActiveFilters ? 'No payments found' : 'No payments recorded'}
          message={hasActiveFilters ? 'Try resetting filters to view all recorded payments.' : 'Payments will appear here after invoice payments are recorded.'}
          action={hasActiveFilters ? <button type="button" className="btn btn-secondary" onClick={resetFilters}>Reset Filters</button> : null}
        />
      ) : (
        <>
        {isTechnician ? (
          <div className="technician-mobile-card-list billing-mobile-cards">
            {visiblePayments.map((payment) => (
              <TechnicianPaymentMobileCard key={payment.id} payment={payment} base={base} paymentMethodDisplay={paymentMethodDisplay} />
            ))}
          </div>
        ) : null}
        <div className={`table-wrap billing-table-wrap bg-[var(--surface)] ${isTechnician ? 'technician-desktop-table' : ''}`}>
          <table className="data-table payments-table">
            <thead><tr><th>Date</th><th>Payment ID</th><th>Linked Invoice</th><th>Linked Source</th><th>Customer</th><th className="text-right">Amount Paid</th><th>Method</th><th className="text-right">Balance After</th></tr></thead>
            <tbody className="divide-y divide-[var(--line)]">
              {visiblePayments.map((payment) => {
                const balanceAfter = Number(payment.balance || 0);
                return (
                  <tr key={payment.id}>
                    <td className="whitespace-nowrap">{formatDate(payment.createdAt)}</td>
                    <td className="font-bold"><span className="billing-id-text">{getPaymentDisplayId(payment)}</span></td>
                    <td className="font-bold"><Link className="billing-link" to={`${base}/invoices`}>{getInvoiceDisplayId(payment.invoiceId)}</Link></td>
                    <td>{invoiceSourceCell(payment.invoiceId)}</td>
                    <td>
                      <span className="block truncate font-semibold text-slate-100" title={payment.customerId?.name || '-'}>{payment.customerId?.name || '-'}</span>
                      <span className="block text-xs muted">{payment.customerId?.phone || '-'}</span>
                    </td>
                    <td className="billing-money-cell text-right text-emerald-100">{currency(payment.paidAmount)}</td>
                    <td><span className="billing-method-pill">{paymentMethodDisplay(payment)}</span></td>
                    <td className={`billing-money-cell text-right ${balanceAfter > 0 ? 'text-amber-100' : 'text-emerald-100'}`}>
                      {currency(payment.balance)}
                      <span className="mt-1 block"><BillingStatusPill status={payment.status} /></span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <PaginationControls pagination={paginationFrom(data, data.payments?.length || 0, limit)} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}

function TechnicianPaymentMobileCard({ payment, base, paymentMethodDisplay }) {
  const balanceAfter = Number(payment.balance || 0);

  return (
    <article className="technician-mobile-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="technician-mobile-card-eyebrow">{getPaymentDisplayId(payment)}</p>
          <h2 className="technician-mobile-card-title" title={payment.customerId?.name || 'Customer'}>{payment.customerId?.name || 'Customer'}</h2>
          <p className="technician-mobile-card-muted">Phone: {payment.customerId?.phone || '-'}</p>
        </div>
        <BillingStatusPill status={payment.status} />
      </div>
      <div className="technician-detail-card-metrics">
        <span><b>{currency(payment.paidAmount)}</b><small>Paid</small></span>
        <span><b>{currency(payment.balance)}</b><small>Balance</small></span>
        <span><b>{paymentMethodDisplay(payment)}</b><small>Method</small></span>
      </div>
      <div className="technician-mobile-card-body">
        <div>
          <span>Linked Invoice</span>
          <p>{getInvoiceDisplayId(payment.invoiceId)}</p>
        </div>
        <div>
          <span>Date</span>
          <p>{formatDate(payment.createdAt)}</p>
        </div>
      </div>
      <div className="technician-mobile-card-footer">
        <Link className="btn btn-primary" to={`${base}/invoices`}>View Invoice</Link>
        {recordId(payment.invoiceId?.workOrderId) ? <Link className="btn btn-secondary" to={`${base}/work-orders/${recordId(payment.invoiceId.workOrderId)}`}>Open Job</Link> : null}
        <span className={`technician-mobile-readonly-pill ${balanceAfter > 0 ? 'technician-mobile-readonly-pill--pending' : ''}`}>Read-only</span>
      </div>
    </article>
  );
}

function BillingMetricCard({ icon: Icon, label, value, helper, tone = 'blue', glow = false }) {
  return (
    <div className={`billing-metric-card billing-metric-${tone} ${glow ? 'billing-metric-glow' : ''}`}>
      <div className="billing-metric-icon"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0">
        <p className="billing-metric-label">{label}</p>
        <p className="billing-metric-value" title={String(value)}>{value}</p>
        <p className="billing-metric-helper">{helper}</p>
      </div>
    </div>
  );
}

function BillingInfo({ label, value, tone = '', strong = false }) {
  return (
    <div className="billing-info-block">
      <p className="text-xs font-black uppercase text-slate-400">{label}</p>
      <p className={`mt-1 truncate ${strong ? 'font-black' : 'font-bold'} ${tone === 'green' ? 'text-emerald-100' : tone === 'amber' ? 'text-amber-100' : 'text-slate-100'}`} title={String(value)}>{value}</p>
    </div>
  );
}

function BillingStatusPill({ status }) {
  const tone = {
    Paid: 'billing-status-paid',
    Pending: 'billing-status-pending',
    Partial: 'billing-status-partial'
  }[status] || 'billing-status-neutral';
  return <span className={`billing-status-pill ${tone}`}>{status || '-'}</span>;
}
