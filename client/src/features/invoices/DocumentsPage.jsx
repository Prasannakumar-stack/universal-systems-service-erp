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

function documentLabel(type) {
  if (type === 'invoice') return 'Invoice';
  if (type === 'quotation') return 'Quotation';
  if (type === 'service') return 'Service Completed';
  if (type === 'amc') return 'AMC Agreement';
  return 'Service Report';
}

function documentStatusLabel(status) {
  if (status === 'draft') return 'Draft';
  if (status === 'sent') return 'Sent';
  if (status === 'approved') return 'Ready';
  return status || 'Ready';
}

export function DocumentsPage() {
  const { request, token } = useAuth();
  const { push } = useToast();
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (status) params.set('status', status);
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return params.toString() ? `?${params}` : '';
  }, [type, status, dateFrom, dateTo]);
  const { data, loading, error } = useResource(() => request(`/documents${query}`), [request, query]);
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;
  const documents = (data.documents || []).filter((document) => {
    const term = customerSearch.trim().toLowerCase();
    if (!term) return true;
    return `${document.customerId?.name || ''} ${document.customerId?.phone || ''} ${document.workOrderId?.device || ''} ${document.workOrderId?.issue || ''}`.toLowerCase().includes(term);
  });

  async function downloadDocumentPdf(document) {
    try {
      const response = await fetch(`${apiBase}/documents/${document.id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
      const blob = await response.blob();
      if (!response.ok) throw new Error('PDF download failed');
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = `${document.type}-${document.id}.pdf`;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  function sendWhatsApp(document) {
    const phone = String(document.customerId?.phone || '').replace(/\D/g, '');
    if (!phone) {
      push('Customer phone number not available', 'error');
      return;
    }
    const whatsappPhone = phone.startsWith('91') ? phone : `91${phone}`;
    const message = `Hello ${document.customerId?.name || 'Customer'}, your ${documentLabel(document.type)} from Universal Systems is ready. Total: ${currency(document.totalAmount)}.`;
    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  return (
    <>
      <PageHeader title="Documents & PDFs" eyebrow="Billing & PDF" action={<Link className="btn btn-primary" to="/admin/documents/new"><Plus className="h-4 w-4" />Create Document</Link>}>
        Generate quotations, invoices, AMC agreements, and service completion PDFs from work order data.
      </PageHeader>
      <div className="surface mb-5 grid gap-3 p-4 xl:grid-cols-[180px_180px_1fr_160px_160px]">
        <select className="input" value={type} onChange={(event) => setType(event.target.value)}>
          <option value="">All types</option>
          <option value="quotation">Quotation</option>
          <option value="invoice">Invoice</option>
          <option value="service">Service Completed</option>
          <option disabled>AMC Agreement (coming soon)</option>
        </select>
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="approved">Ready</option>
          <option value="sent">Sent</option>
          <option disabled>Paid</option>
          <option disabled>Locked</option>
        </select>
        <SearchBox value={customerSearch} onChange={setCustomerSearch} placeholder="Filter by customer or service job" />
        <input className="input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <input className="input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
      </div>
      {!documents.length ? <EmptyState title="No documents generated yet" message="Create quotation or invoice from a work order." action={<Link className="btn btn-primary" to="/admin/documents/new">Create Document</Link>} /> : (
        <Table>
          <thead><tr><th>Date</th><th>Type</th><th>Customer</th><th>Service Job</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {documents.map((document) => (
              <tr key={document.id}>
                <td>{formatDate(document.createdAt)}</td>
                <td className="font-bold">{documentLabel(document.type)}</td>
                <td>{document.customerId?.name}<span className="block text-xs muted">{document.customerId?.phone}</span></td>
                <td>{document.workOrderId?.device}<span className="block max-w-xs truncate text-xs muted">{document.workOrderId?.issue}</span></td>
                <td>{currency(document.totalAmount)}</td>
                <td><StatusBadge status={documentStatusLabel(document.status)} /></td>
                <td>
                  <div className="flex flex-wrap gap-2">
                    <Link className="btn btn-secondary py-2" to={`/admin/documents/${document.id}`}>Preview</Link>
                    <button type="button" className="btn btn-secondary py-2" onClick={() => downloadDocumentPdf(document)}><Download className="h-4 w-4" />Download</button>
                    <button type="button" className="btn btn-primary py-2" onClick={() => sendWhatsApp(document)}><Send className="h-4 w-4" />WhatsApp</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}

export function CreateDocumentPage() {
  const { request } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ type: 'invoice', workOrderId: '' });
  const { data, loading, error } = useResource(() => request('/work-orders'), [request]);

  async function submit(event) {
    event.preventDefault();
    event.stopPropagation();
    try {
      const result = await request('/documents', { method: 'POST', body: JSON.stringify(form) });
      push('Document created');
      navigate(`/admin/documents/${result.document.id}`);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <PageHeader title="Create Document" eyebrow="Auto Generated">
        Select a service job and document type. Customer, job details, parts, service charge, and totals are pulled automatically.
      </PageHeader>
      <form className="surface max-w-3xl p-5" onSubmit={submit}>
        <div className="grid gap-4">
          <label>
            <span className="label">Document Type</span>
            <select className="input" value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}>
              <option value="invoice">Invoice</option>
              <option value="quotation">Quotation</option>
              <option value="service">Service Report</option>
            </select>
          </label>
          <label>
            <span className="label">Service Job</span>
            <select className="input" value={form.workOrderId} onChange={(event) => setForm((current) => ({ ...current, workOrderId: event.target.value }))} required>
              <option value="">Select service job</option>
              {data.workOrders?.map((order) => (
                <option key={order.id} value={order.id}>
                  {order.customerId?.name} - {order.device} - {order.status}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Link className="btn btn-secondary" to="/admin/documents">Cancel</Link>
          <button type="submit" className="btn btn-primary"><ReceiptText className="h-4 w-4" />Create</button>
        </div>
      </form>
    </>
  );
}

export function DocumentPreviewPage() {
  const { id } = useParams();
  const { request, token } = useAuth();
  const { push } = useToast();
  const [payment, setPayment] = useState({ paidAmount: '', method: 'Cash' });
  const { data, loading, error, reload } = useResource(() => request(`/documents/${id}`), [request, id]);
  const document = data?.document;

  async function downloadPdf(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    try {
      await preserveScroll(async () => {
        const response = await fetch(`${apiBase}/documents/${id}/pdf`, { headers: { Authorization: `Bearer ${token}` } });
        const blob = await response.blob();
        if (!response.ok) throw new Error('PDF download failed');
        const url = URL.createObjectURL(blob);
        const anchor = window.document.createElement('a');
        anchor.href = url;
        anchor.download = `${document.type}-${document.id}.pdf`;
        window.document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function previewPdf(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    try {
      await preserveScroll(async () => {
        const response = await fetch(`${apiBase}/documents/${id}/pdf?preview=true`, { headers: { Authorization: `Bearer ${token}` } });
        const blob = await response.blob();
        if (!response.ok) throw new Error('PDF preview failed');
        const url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  function sendDocumentWhatsApp(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const phone = String(document.customerId?.phone || '').replace(/\D/g, '');
    if (!phone) {
      push('Customer phone number not available', 'error');
      return;
    }
    const whatsappPhone = phone.startsWith('91') ? phone : `91${phone}`;
    const message = `Hello ${document.customerId?.name || 'Customer'}, your ${documentLabel(document.type)} from Universal Systems is ready. Total: ${currency(document.totalAmount)}.`;
    window.open(`https://wa.me/${whatsappPhone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  async function recordPayment(event) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await preserveScroll(async () => {
        await request('/payments', { method: 'POST', body: JSON.stringify({ invoiceId: recordId(document.invoiceId), paidAmount: payment.paidAmount, method: payment.method }) });
        setPayment({ paidAmount: '', method: 'Cash' });
        push('Payment recorded');
        reload({ silent: true });
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <PageHeader title={`${documentLabel(document.type)} Preview`} eyebrow="Document" action={<button type="button" className="btn btn-primary" onClick={downloadPdf}>Download PDF</button>}>
        Generated from work-order data. No manual item entry required.
      </PageHeader>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <div className="surface p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-2xl font-black">{documentLabel(document.type)}</h2>
              <p className="mt-1 text-sm muted">Created {formatDate(document.createdAt)}</p>
            </div>
            <span className="status-badge">{document.status}</span>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-card bg-[var(--surface-2)] p-4">
              <p className="label">Company</p>
              <p className="font-bold">{company.name}</p>
              <p className="text-sm muted">{company.address}</p>
              <p className="text-sm muted">{company.phones.join(', ')}</p>
            </div>
            <div className="rounded-card bg-[var(--surface-2)] p-4">
              <p className="label">Customer</p>
              <p className="font-bold">{document.customerId?.name}</p>
              <p className="text-sm muted">{document.customerId?.phone}</p>
              <p className="text-sm muted">{document.customerId?.address}</p>
            </div>
            <div className="rounded-card bg-[var(--surface-2)] p-4 md:col-span-2">
              <p className="label">Service Job</p>
              <p className="font-bold">{document.workOrderId?.device}</p>
              <p className="text-sm muted">{document.workOrderId?.issue}</p>
              <StatusBadge status={document.workOrderId?.status} />
            </div>
          </div>
          <div className="mt-6">
            <Table>
              <thead><tr><th>Item</th><th>Quantity</th><th>Price</th><th>Subtotal</th></tr></thead>
              <tbody className="divide-y divide-[var(--line)]">
                {document.items?.length ? document.items.map((item, index) => <tr key={`${item.name}-${index}`}><td className="font-bold">{item.name}</td><td>{item.quantity}</td><td>{currency(item.price)}</td><td>{currency(item.subtotal)}</td></tr>) : <tr><td colSpan="4" className="muted">No parts used.</td></tr>}
              </tbody>
            </Table>
          </div>
          <div className="mt-5 rounded-card bg-[var(--surface-2)] p-4 text-right">
            <p className="text-sm muted">Service Charge: {currency(document.serviceCharge)}</p>
            <p className="mt-1 text-2xl font-black">Total: {currency(document.totalAmount)}</p>
          </div>
        </div>
        <div className="grid content-start gap-5">
          {document.type === 'invoice' && document.invoiceId ? (
            <div className="surface p-5">
              <h2 className="text-xl font-black">Payment Summary</h2>
              <div className="mt-4 rounded-card bg-[var(--surface-2)] p-4">
                <p className="font-bold">{document.invoiceId.invoiceNumber}</p>
                <p className="text-sm muted">Paid: {currency(document.invoiceId.paidAmount)}</p>
                <p className="text-sm muted">Balance: {currency(document.invoiceId.balance)}</p>
                <StatusBadge status={document.invoiceId.status} />
              </div>
              <Link className="btn btn-secondary mt-4 w-full" to={`/admin/payments?invoiceId=${recordId(document.invoiceId)}`}>Go to Payments</Link>
              {document.invoiceId.balance > 0 ? (
                <form className="mt-4 grid gap-3" onSubmit={recordPayment}>
                  <input className="input" type="number" min="1" max={document.invoiceId.balance} placeholder="Paid amount" value={payment.paidAmount} onChange={(event) => setPayment((current) => ({ ...current, paidAmount: event.target.value }))} required />
                  <select className="input" value={payment.method} onChange={(event) => setPayment((current) => ({ ...current, method: event.target.value }))}>
                    <option>Cash</option>
                    <option>UPI</option>
                  </select>
                  <button type="submit" className="btn btn-primary"><CreditCard className="h-4 w-4" />Record Payment</button>
                </form>
              ) : <p className="mt-4 text-sm muted">Invoice is fully paid.</p>}
            </div>
          ) : null}
          <div className="surface p-5">
            <h2 className="text-xl font-black">PDF Actions</h2>
            <p className="mt-2 text-sm muted">The generated PDF template remains unchanged.</p>
            <div className="mt-4 grid gap-2">
              <button type="button" className="btn btn-secondary w-full" onClick={previewPdf}><FileText className="h-4 w-4" />Preview PDF</button>
              <button type="button" className="btn btn-secondary w-full" onClick={downloadPdf}><Download className="h-4 w-4" />Download PDF</button>
              <button type="button" className="btn btn-primary w-full" onClick={sendDocumentWhatsApp}><Send className="h-4 w-4" />Send via WhatsApp</button>
            </div>
          </div>
          <div className="surface p-5">
            <h2 className="text-xl font-black">Status</h2>
            <div className="mt-4 rounded-card bg-[var(--surface-2)] p-4">
              <StatusBadge status={documentStatusLabel(document.status)} />
              <p className="mt-3 text-sm muted">Created {formatDate(document.createdAt)}</p>
              <p className="mt-1 text-sm muted">Total {currency(document.totalAmount)}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
