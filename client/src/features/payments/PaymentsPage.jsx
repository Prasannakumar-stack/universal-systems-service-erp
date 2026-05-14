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

export function PaymentsPage() {
  const { request } = useAuth();
  const { push } = useToast();
  const location = useLocation();
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
  }, [search, paymentStatus, methodFilter, dateFrom, dateTo]);

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
        push('Payment recorded');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  const selectedInvoice = findInvoice(data.invoices, form.invoiceId);
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

  return (
    <div className="payments-page">
      <PageHeader title="Payments" eyebrow="Billing">Record cash, UPI, and partial payments with invoice balance tracking.</PageHeader>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={CreditCard} label="Total Collected" value={currency(paymentTotals.totalCollected)} tone="green" />
        <StatCard icon={AlertTriangle} label="Pending Balance" value={currency(paymentTotals.pendingBalance)} tone="red" />
        <StatCard icon={CheckCircle2} label="Paid Invoices" value={paymentTotals.paidInvoices} tone="green" />
        <StatCard icon={ReceiptText} label="Partial Invoices" value={paymentTotals.partialInvoices} tone="yellow" />
        <StatCard icon={CalendarClock} label="Today's Collection" value={currency(paymentTotals.todayCollection)} />
      </div>
      <div className="surface mb-5 grid gap-3 p-4 xl:grid-cols-[1fr_160px_140px_160px_160px]">
        <SearchBox value={search} onChange={setSearch} placeholder="Search payment, invoice, customer, method" />
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
      </div>
      <form className="surface mb-5 grid gap-4 p-5 xl:grid-cols-[1.2fr_.8fr]" onSubmit={submit}>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="md:col-span-2">
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
            <input className="input" type="number" min="1" placeholder="Paid amount" value={form.paidAmount} onChange={(event) => setForm((current) => ({ ...current, paidAmount: event.target.value }))} required />
          </label>
          <label>
            <span className="label">Payment Method</span>
            <select className="input" value={form.method} onChange={(event) => setForm((current) => ({ ...current, method: event.target.value }))}>
              <option>Cash</option><option>UPI</option><option disabled>Cash + UPI</option>
            </select>
          </label>
          {form.method === 'UPI' ? <label><span className="label">Transaction ID</span><input className="input" placeholder="Transaction ID (optional)" value={form.transactionId} onChange={(event) => setForm((current) => ({ ...current, transactionId: event.target.value }))} /></label> : null}
          <label>
            <span className="label">Payment Note</span>
            <input className="input" placeholder="Payment note not supported by current API" disabled />
          </label>
          <button type="submit" className="btn btn-primary self-end"><CreditCard className="h-4 w-4" />Record Payment</button>
        </div>
        <div className="rounded-card bg-[var(--surface-2)] p-4">
          <h2 className="font-black">Selected Invoice</h2>
          {selectedInvoice ? (
            <div className="mt-4 grid gap-3">
              <div><p className="text-sm muted">Customer</p><p className="font-bold">{selectedInvoice.customerId?.name || '-'}</p></div>
              <div className="grid grid-cols-3 gap-2">
                <div><p className="text-xs muted">Total</p><p className="font-black">{currency(selectedInvoice.total)}</p></div>
                <div><p className="text-xs muted">Paid</p><p className="font-black text-emerald-100">{currency(selectedInvoice.paidAmount)}</p></div>
                <div><p className="text-xs muted">Balance</p><p className="font-black text-amber-100">{currency(selectedInvoice.balance)}</p></div>
              </div>
              <StatusBadge status={selectedInvoice.status} />
            </div>
          ) : <p className="mt-3 text-sm muted">Select an invoice to see customer, total, paid amount, and balance.</p>}
        </div>
      </form>
      {!data.payments?.length ? <EmptyState title="No payments recorded yet" message="Payments will appear after invoice payment is recorded." /> : (
        <>
        <Table>
          <thead><tr><th>Date</th><th>Invoice</th><th>Customer</th><th>Amount Paid</th><th>Method</th><th>Balance After</th><th>Status</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {data.payments.map((payment) => <tr key={payment.id}><td>{formatDate(payment.createdAt)}</td><td className="font-bold"><Link className="text-sky-100 hover:text-[var(--brand)]" to="/admin/invoices">{payment.invoiceId?.invoiceNumber}</Link></td><td>{payment.customerId?.name}</td><td className="font-bold text-emerald-100">{currency(payment.paidAmount)}</td><td>{paymentMethodDisplay(payment)}</td><td className={Number(payment.balance || 0) > 0 ? 'font-bold text-amber-100' : 'text-emerald-100'}>{currency(payment.balance)}</td><td><StatusBadge status={payment.status} /></td></tr>)}
          </tbody>
        </Table>
        <PaginationControls pagination={paginationFrom(data, data.payments?.length || 0, limit)} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
