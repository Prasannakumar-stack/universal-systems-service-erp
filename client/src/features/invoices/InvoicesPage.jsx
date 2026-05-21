import {
  AlertTriangle,
  amcContractTypes,
  amcFrequencies,
  AmcStatusBadge,
  amcWhatsappHref,
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
  getInvoiceDisplayId,
  getWorkOrderDisplayId,
  getPdfLabel,
  invoiceSearchText,
  matchesDisplaySearch,
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

export function InvoicesPage({ role = 'admin' }) {
  const { request, user } = useAuth();
  const { push } = useToast();
  const effectiveRole = user?.role || role;
  const isTechnician = normalizeRole(effectiveRole) === 'technician';
  const canSendPdfWhatsapp = can(effectiveRole, 'send_pdf_whatsapp');
  const base = isTechnician ? '/tech' : '/admin';
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const debouncedSearch = useDebouncedValue(search);
  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (status) params.set('status', status);
    if (paymentMethod) params.set('method', paymentMethod);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return `?${params}`;
  }, [dateFrom, dateTo, debouncedSearch, limit, page, paymentMethod, status]);
  const { data, loading, error } = useResource(() => request(`/invoices${query}`), [request, query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, paymentMethod, dateFrom, dateTo]);

  const invoices = data?.invoices || data?.data || [];
  const searchTerm = debouncedSearch.trim();
  const visibleInvoices = searchTerm
    ? invoices.filter((invoice) => matchesDisplaySearch(searchTerm, invoiceSearchText(invoice)))
    : invoices;
  const totals = data?.summary || {
    totalInvoices: invoices.length,
    pending: invoices.filter((invoice) => invoice.status === 'Pending').length,
    partial: invoices.filter((invoice) => invoice.status === 'Partial').length,
    paid: invoices.filter((invoice) => invoice.status === 'Paid').length,
    totalValue: invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
    balance: invoices.reduce((sum, invoice) => sum + invoiceDueAmount(invoice), 0)
  };
  const availableMethods = data?.paymentMethods || [];
  const hasActiveFilters = Boolean(search.trim() || status || paymentMethod || dateFrom || dateTo);
  const invoiceKpis = [
    { icon: ReceiptText, label: 'Total Invoices', value: totals.totalInvoices, helper: 'Generated invoices', tone: 'blue' },
    { icon: AlertTriangle, label: 'Pending Invoices', value: totals.pending, helper: 'Need follow-up', tone: 'amber' },
    { icon: CreditCard, label: 'Partial Payments', value: totals.partial, helper: 'Partially collected', tone: 'amber' },
    { icon: CheckCircle2, label: 'Paid Invoices', value: totals.paid, helper: 'Fully paid', tone: 'green' },
    { icon: ReceiptText, label: 'Total Invoice Value', value: currency(totals.totalValue), helper: 'Billed amount', tone: 'blue' },
    { icon: AlertTriangle, label: 'Pending Balance', value: currency(totals.balance), helper: 'Outstanding amount', tone: 'amber', glow: Number(totals.balance || 0) > 0 }
  ];

  function resetFilters() {
    setSearch('');
    setStatus('');
    setPaymentMethod('');
    setDateFrom('');
    setDateTo('');
  }

  function sendInvoiceWhatsApp(invoice) {
    const phone = String(invoice.customerId?.phone || '').replace(/\D/g, '');
    if (!phone) {
      push('Customer phone number not available', 'error');
      return;
    }
    const whatsappPhone = phone.startsWith('91') ? phone : `91${phone}`;
    const message = `Hello ${invoice.customerId?.name || 'Customer'}, your invoice ${invoice.invoiceNumber} from Universal Systems is ready. Balance: ${currency(invoiceDueAmount(invoice))}.`;
    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  function invoiceSourceCell(invoice) {
    if (recordId(invoice.workOrderId)) {
      return (
        <Link className="billing-link" to={`${base}/work-orders/${recordId(invoice.workOrderId)}`}>
          {getWorkOrderDisplayId(invoice.workOrderId)}
          <span className="block truncate text-xs muted" title={invoice.workOrderId?.device || '-'}>{invoice.workOrderId?.device || '-'}</span>
        </Link>
      );
    }
    if (recordId(invoice.amcContractId)) {
      return (
        <Link className="billing-link" to={`${base}/amc-contracts`}>
          {invoice.amcContractId?.contractId || 'AMC Contract'}
          <span className="block truncate text-xs muted" title={invoice.amcContractId?.contractType || invoice.title || '-'}>{invoice.amcContractId?.contractType || invoice.title || '-'}</span>
        </Link>
      );
    }
    return <span className="muted">-</span>;
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;
  const pagination = paginationFrom(data, invoices.length, limit);

  return (
    <div className="billing-page invoices-page">
      <section className="billing-hero mb-5">
        <div className="relative z-[1] flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--brand)]">Billing</p>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Invoices</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Invoices are generated from service jobs and linked to payments.</p>
          </div>
        </div>
      </section>

      <div className="billing-kpi-grid mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {invoiceKpis.map((item) => <BillingMetricCard key={item.label} {...item} />)}
      </div>

      <div className="surface billing-filter-bar mb-5 grid gap-3 p-4 xl:grid-cols-[minmax(320px,1fr)_160px_180px_155px_155px_auto]">
        <div className="min-w-0">
          <SearchBox value={search} onChange={setSearch} placeholder="Search invoice ID, work order ID, customer ID, name, phone" />
        </div>
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {['Pending', 'Partial', 'Paid'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="input" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} disabled={!availableMethods.length}>
          <option value="">{availableMethods.length ? 'All payment methods' : 'No payment method data'}</option>
          {availableMethods.map((method) => <option key={method}>{method}</option>)}
        </select>
        <input className="input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <input className="input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        <button type="button" className="btn btn-secondary h-10 whitespace-nowrap px-4" disabled={!hasActiveFilters} onClick={resetFilters}>Reset Filters</button>
      </div>

      {!visibleInvoices.length ? (
        <EmptyState
          icon={ReceiptText}
          title={hasActiveFilters ? 'No invoices found' : 'No invoices found'}
          message={hasActiveFilters ? 'Try resetting filters to view all generated invoices.' : 'Generated invoices will appear here after service jobs are billed.'}
          action={hasActiveFilters ? <button type="button" className="btn btn-secondary" onClick={resetFilters}>Reset Filters</button> : null}
        />
      ) : (
        <>
        {isTechnician ? (
          <div className="technician-mobile-card-list billing-mobile-cards">
            {visibleInvoices.map((invoice) => (
              <TechnicianInvoiceMobileCard key={invoice.id || invoice._id} invoice={invoice} base={base} />
            ))}
          </div>
        ) : null}
        <div className={`table-wrap billing-table-wrap bg-[var(--surface)] ${isTechnician ? 'technician-desktop-table' : ''}`}>
          <table className="data-table invoices-table">
            <thead><tr><th>Invoice ID</th><th>Customer</th><th>Linked Source</th><th className="text-right">Total</th><th className="text-right">Paid</th><th className="text-right">Balance</th><th className="text-center">Status</th><th>Created Date</th><th className="text-center">Action</th></tr></thead>
            <tbody className="divide-y divide-[var(--line)]">
              {visibleInvoices.map((invoice) => {
                const dueAmount = invoiceDueAmount(invoice);
                const invoiceId = invoice.id || invoice._id;
                const customerName = invoice.customerId?.name || invoice.customerName || 'Customer';
                const customerPhone = invoice.customerId?.phone || invoice.customerPhone || 'No phone';
                return (
                  <tr key={invoice.id || invoice._id}>
                    <td className="font-bold"><span className="billing-id-text" title={getInvoiceDisplayId(invoice)}>{getInvoiceDisplayId(invoice)}</span></td>
                    <td>
                      <span className="block font-semibold text-slate-100" title={customerName}>{customerName}</span>
                      <span className="mt-1 block text-xs muted">Phone: {customerPhone}</span>
                    </td>
                    <td>{invoiceSourceCell(invoice)}</td>
                    <td className="billing-money-cell text-right">{currency(invoice.total)}</td>
                    <td className="billing-money-cell text-right text-emerald-100">{currency(invoice.paidAmount)}</td>
                    <td className={`billing-money-cell text-right ${dueAmount > 0 ? 'text-amber-100' : 'text-emerald-100'}`}>{currency(dueAmount)}</td>
                    <td className="text-center"><BillingStatusPill status={invoice.status} /></td>
                    <td className="whitespace-nowrap">{formatDate(invoice.createdAt)}</td>
                    <td className="text-center">
                      <div className="billing-actions">
                        <Link className={`btn ${dueAmount > 0 && !isTechnician ? 'btn-primary' : 'btn-secondary'} billing-action-main`} to={`${base}/payments?invoiceId=${invoiceId}`}>{isTechnician ? 'View Payments' : 'Go to Payment'}</Link>
                        {canSendPdfWhatsapp ? <button type="button" className="btn btn-secondary billing-action-button" onClick={() => sendInvoiceWhatsApp(invoice)}><Send className="h-4 w-4" />WhatsApp</button> : null}
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
    </div>
  );
}

function TechnicianInvoiceMobileCard({ invoice, base }) {
  const dueAmount = invoiceDueAmount(invoice);
  const invoiceId = invoice.id || invoice._id;
  const customerName = invoice.customerId?.name || invoice.customerName || 'Customer';
  const customerPhone = invoice.customerId?.phone || invoice.customerPhone || '';

  return (
    <article className="technician-mobile-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="technician-mobile-card-eyebrow">{getInvoiceDisplayId(invoice)}</p>
          <h2 className="technician-mobile-card-title" title={customerName}>{customerName}</h2>
          <p className="technician-mobile-card-muted">Phone: {customerPhone || '-'}</p>
        </div>
        <BillingStatusPill status={invoice.status} />
      </div>
      <div className="technician-detail-card-metrics">
        <span><b>{currency(invoice.total)}</b><small>Total</small></span>
        <span><b>{currency(invoice.paidAmount)}</b><small>Paid</small></span>
        <span><b>{currency(dueAmount)}</b><small>Balance</small></span>
      </div>
      <div className="technician-mobile-card-body">
        <div>
          <span>Linked Source</span>
          <p>{recordId(invoice.workOrderId) ? getWorkOrderDisplayId(invoice.workOrderId) : invoice.amcContractId?.contractId || 'AMC Contract'}</p>
        </div>
        <div>
          <span>Created</span>
          <p>{formatDate(invoice.createdAt)}</p>
        </div>
      </div>
      <div className="technician-mobile-card-footer">
        {recordId(invoice.workOrderId) ? <Link className="btn btn-secondary" to={`${base}/work-orders/${recordId(invoice.workOrderId)}`}>Open Job</Link> : null}
        <Link className="btn btn-primary" to={`${base}/payments?invoiceId=${invoiceId}`}>View Payments</Link>
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

function BillingStatusPill({ status }) {
  const tone = {
    Paid: 'billing-status-paid',
    Pending: 'billing-status-pending',
    Partial: 'billing-status-partial'
  }[status] || 'billing-status-neutral';
  return <span className={`billing-status-pill ${tone}`}>{status || '-'}</span>;
}
