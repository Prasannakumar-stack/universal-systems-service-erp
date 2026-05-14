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

export function InvoicesPage() {
  const { request, token } = useAuth();
  const { push } = useToast();
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
  }, [search, status, paymentMethod, dateFrom, dateTo]);

  const invoices = data?.invoices || data?.data || [];
  const totals = data?.summary || {
    totalInvoices: invoices.length,
    pending: invoices.filter((invoice) => invoice.status === 'Pending').length,
    partial: invoices.filter((invoice) => invoice.status === 'Partial').length,
    paid: invoices.filter((invoice) => invoice.status === 'Paid').length,
    totalValue: invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
    balance: invoices.reduce((sum, invoice) => sum + invoiceDueAmount(invoice), 0)
  };
  const availableMethods = data?.paymentMethods || [];

  async function downloadWorkPdf(invoice, preview = false) {
    const workOrderId = recordId(invoice.workOrderId);
    if (!workOrderId) return;
    try {
      const response = await fetch(`${apiBase}/work-orders/${workOrderId}/pdf/work${preview ? '?preview=true' : ''}`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await response.blob();
      if (!response.ok) throw new Error('PDF is available only when the linked service job status allows it.');
      const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      if (preview) {
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return;
      }
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = `${invoice.invoiceNumber || 'invoice'}.pdf`;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      push(err.message, 'error');
    }
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

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;
  const pagination = paginationFrom(data, invoices.length, limit);

  return (
    <>
      <PageHeader title="Invoices" eyebrow="Billing" action={<Link className="btn btn-primary" to="/admin/payments"><CreditCard className="h-4 w-4" />Record Payment</Link>}>Invoices are generated from repair/service jobs and linked to payments.</PageHeader>
      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <StatCard icon={ReceiptText} label="Total Invoices" value={totals.totalInvoices} />
        <StatCard icon={ReceiptText} label="Pending Invoices" value={totals.pending} tone="yellow" />
        <StatCard icon={CreditCard} label="Partial Payments" value={totals.partial} tone="yellow" />
        <StatCard icon={CheckCircle2} label="Paid Invoices" value={totals.paid} tone="green" />
        <StatCard icon={ReceiptText} label="Total Invoice Value" value={currency(totals.totalValue)} />
        <StatCard icon={AlertTriangle} label="Pending Balance" value={currency(totals.balance)} tone="red" />
      </div>
      <div className="surface mb-5 grid gap-3 p-4 xl:grid-cols-[1fr_170px_170px_160px_160px]">
        <SearchBox value={search} onChange={setSearch} placeholder="Search invoice, customer, phone, service job" />
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
      </div>
      {!invoices.length ? <EmptyState title="No invoices generated yet" message="Invoices will appear after a repair/service job is billed." /> : (
        <>
        <Table>
          <thead><tr><th>Invoice Number</th><th>Customer</th><th>Work Order / Job</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Created Date</th><th>Action</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="font-bold">{invoice.invoiceNumber}</td>
                <td>{invoice.customerId?.name}<span className="block text-xs muted">{invoice.customerId?.phone}</span></td>
                <td>{recordId(invoice.workOrderId) ? <Link className="text-sky-100 hover:text-[var(--brand)]" to={`/admin/work-orders/${recordId(invoice.workOrderId)}`}>{bookingLabel(invoice.workOrderId)}<span className="block text-xs muted">{invoice.workOrderId?.device || '-'}</span></Link> : '-'}</td>
                <td>{currency(invoice.total)}</td>
                <td>{currency(invoice.paidAmount)}</td>
                <td className={invoiceDueAmount(invoice) > 0 ? 'font-black text-amber-100' : 'font-bold text-emerald-100'}>{currency(invoiceDueAmount(invoice))}</td>
                <td><StatusBadge status={invoice.status} /></td>
                <td>{formatDate(invoice.createdAt)}</td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn btn-secondary py-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={invoice.workOrderId?.status !== 'Completed'} onClick={() => downloadWorkPdf(invoice, true)}>Preview</button>
                    <button type="button" className="btn btn-secondary py-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={invoice.workOrderId?.status !== 'Completed'} onClick={() => downloadWorkPdf(invoice)}><Download className="h-4 w-4" />PDF</button>
                    <Link className="btn btn-primary py-2" to={`/admin/payments?invoiceId=${invoice.id || invoice._id}`}>Go to Payments</Link>
                    <button type="button" className="btn btn-secondary py-2" onClick={() => sendInvoiceWhatsApp(invoice)}><Send className="h-4 w-4" />WhatsApp</button>
                  </div>
                  {invoice.workOrderId?.status !== 'Completed' ? <p className="mt-2 text-xs font-semibold text-amber-100">Complete the job before downloading invoice PDF</p> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <PaginationControls pagination={pagination} onPageChange={setPage} />
        </>
      )}
    </>
  );
}
