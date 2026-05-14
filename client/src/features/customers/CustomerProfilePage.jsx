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

export function CustomerProfilePage() {
  const { id } = useParams();
  const { request } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [historyStatus, setHistoryStatus] = useState('');
  const [historyServiceType, setHistoryServiceType] = useState('');
  const [historyDateFrom, setHistoryDateFrom] = useState('');
  const [historyDateTo, setHistoryDateTo] = useState('');
  const { data, loading, error } = useResource(async () => {
    const [profile, payments] = await Promise.all([
      request(`/customers/${id}`),
      request(`/payments?customerId=${encodeURIComponent(id)}`).catch(() => ({ payments: [] }))
    ]);
    return { ...profile, payments: payments.payments || [] };
  }, [request, id]);

  const customer = data?.customer || {};
  const serviceHistory = data?.serviceHistory || [];
  const invoices = data?.invoices || [];
  const payments = data?.payments || [];
  const totalSpent = invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount || 0), 0);
  const pendingBalance = invoices.reduce((sum, invoice) => sum + Number(invoice.balance || 0), 0);
  const activeOrders = serviceHistory.filter(isActiveJob);
  const completedOrders = serviceHistory.filter(isCompletedJob);
  const lastServiceDate = latestDate(serviceHistory);
  const invoiceByWorkOrder = useMemo(() => invoices.reduce((map, invoice) => {
    map.set(recordId(invoice.workOrderId), invoice);
    return map;
  }, new Map()), [invoices]);
  const deviceRows = useMemo(() => {
    const names = [...new Set([...(customer.devices || []), ...serviceHistory.map((order) => order.device).filter(Boolean)])];
    return names.map((name) => {
      const jobs = serviceHistory.filter((order) => String(order.device || '').toLowerCase() === String(name).toLowerCase());
      return {
        name,
        category: deviceCategory(name),
        serialNumber: '-',
        warrantyStatus: '-',
        lastServiceDate: latestDate(jobs),
        serviceCount: jobs.length,
        firstJobId: jobs[0]?.id || jobs[0]?._id || ''
      };
    });
  }, [customer.devices, serviceHistory]);
  const filteredServiceHistory = serviceHistory.filter((order) => {
    if (historyStatus && order.status !== historyStatus) return false;
    if (historyServiceType) {
      const text = `${order.serviceType || ''} ${order.service || ''} ${order.device || ''} ${order.issue || ''}`.toLowerCase();
      if (!text.includes(historyServiceType.toLowerCase())) return false;
    }
    const created = order.createdAt ? new Date(order.createdAt).getTime() : 0;
    if (historyDateFrom && created < new Date(historyDateFrom).getTime()) return false;
    if (historyDateTo && created > new Date(historyDateTo).getTime() + 86400000) return false;
    return true;
  });
  const timelineEvents = useMemo(() => {
    const events = [];
    if (customer.createdAt) events.push({ date: customer.createdAt, title: 'Customer created', detail: 'Customer profile created in CRM.', status: 'CRM' });
    serviceHistory.forEach((order) => {
      events.push({ date: order.createdAt, title: 'Service job created', detail: `${bookingLabel(order)} - ${order.device || 'Service job'}`, status: order.status, to: `/admin/work-orders/${order.id}` });
      (order.timeline || []).forEach((item) => events.push({ date: item.createdAt, title: item.message, detail: `${bookingLabel(order)} - ${order.device || '-'}`, status: item.status, to: `/admin/work-orders/${order.id}` }));
      if (order.completedAt) events.push({ date: order.completedAt, title: 'Job completed', detail: `${bookingLabel(order)} completed.`, status: order.status, to: `/admin/work-orders/${order.id}` });
    });
    invoices.forEach((invoice) => {
      events.push({ date: invoice.createdAt, title: 'Invoice generated', detail: `${invoice.invoiceNumber} - ${currency(invoice.total)}`, status: invoice.status, to: recordId(invoice.workOrderId) ? `/admin/work-orders/${recordId(invoice.workOrderId)}` : '' });
    });
    payments.forEach((payment) => {
      events.push({ date: payment.createdAt, title: 'Payment recorded', detail: `${currency(payment.paidAmount)} via ${payment.method || '-'}`, status: payment.status });
    });
    return events.filter((event) => event.date).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [customer.createdAt, serviceHistory, invoices, payments]);
  const whatsappPhone = String(customer.phone || '').replace(/\D/g, '');
  const pendingInvoice = invoices.find((invoice) => Number(invoice.balance || 0) > 0);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div className="customer-360-page">
      <PageHeader
        title={customer.name}
        eyebrow="Customer 360"
        action={(
          <div className="flex flex-wrap gap-2">
            {whatsappPhone ? <a className="btn btn-secondary" href={customerWhatsAppHref(customer)} target="_blank" rel="noreferrer"><PhoneCallIcon className="h-4 w-4" />WhatsApp</a> : <button className="btn btn-secondary" type="button" disabled><PhoneCallIcon className="h-4 w-4" />WhatsApp</button>}
            <Link className="btn btn-primary" to="/admin/bookings"><Plus className="h-4 w-4" />Create Booking</Link>
            <button className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled>Create Service Job</button>
          </div>
        )}
      >
        {customer.phone || 'No phone'} {customer.address ? `- ${customer.address}` : ''}
      </PageHeader>

      <div className="surface mb-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Customer Profile</p>
            <h2 className="mt-1 text-2xl font-black">{customer.name}</h2>
            <p className="mt-1 text-sm muted">{customerCode(customer)} - Joined {formatDate(customer.createdAt)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusBadge status={customerTypeLabel(customer) || 'Customer'} />
            {pendingBalance > 0 ? <StatusBadge status="Pending" /> : <StatusBadge status="Paid" />}
          </div>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Phone</p><p className="mt-1 text-sm font-bold">{customer.phone || '-'}</p></div>
          <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Address</p><p className="mt-1 text-sm font-bold">{customer.address || 'Not added'}</p></div>
          <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Customer Type</p><p className="mt-1 text-sm font-bold">{customerTypeLabel(customer) || 'Not added yet'}</p></div>
          <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Customer ID</p><p className="mt-1 text-sm font-bold">{customerCode(customer)}</p></div>
        </div>
      </div>

      <div className="surface customer-hero mb-5 p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div><p className="text-sm muted">Total Jobs</p><p className="mt-2 text-2xl font-black">{serviceHistory.length}</p></div>
          <div><p className="text-sm muted">Active Jobs</p><p className="mt-2 text-2xl font-black">{activeOrders.length}</p></div>
          <div><p className="text-sm muted">Completed Jobs</p><p className="mt-2 text-2xl font-black">{completedOrders.length}</p></div>
          <div><p className="text-sm muted">Total Spent</p><p className="mt-2 text-2xl font-black">{currency(totalSpent)}</p></div>
          <div><p className="text-sm muted">Pending Balance</p><p className="mt-2 text-2xl font-black text-amber-100">{currency(pendingBalance)}</p></div>
          <div><p className="text-sm muted">Last Service Date</p><p className="mt-2 text-lg font-black">{lastServiceDate ? formatDate(lastServiceDate) : 'No service yet'}</p></div>
          <div><p className="text-sm muted">AMC Status</p><p className="mt-2 text-lg font-black">{customer.amcStatus || 'No active record'}</p></div>
          <div><p className="text-sm muted">Warranty Items</p><p className="mt-2 text-lg font-black">{customer.warrantyItems?.length ? customer.warrantyItems.length : 'No active record'}</p></div>
        </div>
      </div>

      <div className="surface sticky top-20 z-20 mb-4 p-3">
        <div className="tabs-list">
          {customerTabs.map((tab) => (
            <button key={tab.id} type="button" className={`tab-button ${activeTab === tab.id ? 'tab-button-active' : ''}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' ? (
        <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
          <div className="grid content-start gap-5">
            {pendingBalance > 0 ? (
              <div className="surface border-amber-300/30 p-5">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-100" />
                  <div>
                    <h2 className="text-lg font-black text-amber-100">Pending Payment Alert</h2>
                    <p className="mt-1 text-sm muted">Outstanding balance is {currency(pendingBalance)}.</p>
                    <Link className="btn btn-primary mt-4" to={`/admin/payments${pendingInvoice ? `?invoiceId=${recordId(pendingInvoice)}` : ''}`}>Record Payment</Link>
                  </div>
                </div>
              </div>
            ) : null}
            <div className="surface p-5">
              <h2 className="text-xl font-black">Customer Details</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Name</p><p className="font-bold">{customer.name}</p></div>
                <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Customer ID</p><p className="font-bold">{customerCode(customer)}</p></div>
                <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Type</p><p className="font-bold">{customerTypeLabel(customer) || 'Not added yet'}</p></div>
                <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Joined</p><p className="font-bold">{formatDate(customer.createdAt)}</p></div>
              </div>
            </div>
            <div className="surface p-5">
              <h2 className="text-xl font-black">Contact Details</h2>
              <div className="mt-4 grid gap-3">
                <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Phone</p><p className="font-bold">{customer.phone || '-'}</p></div>
                <div className="rounded-card bg-[var(--surface-2)] p-3"><p className="label">Address</p><p className="font-bold">{customer.address || 'Not added'}</p></div>
              </div>
            </div>
            <div className="surface p-5">
              <h2 className="text-xl font-black">Quick Actions</h2>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link className="btn btn-primary" to="/admin/bookings"><Plus className="h-4 w-4" />Create Booking</Link>
                <button className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled>Create Repair / Service Job</button>
                <Link className="btn btn-secondary" to="/admin/documents/new"><FileText className="h-4 w-4" />Generate Quotation</Link>
                {whatsappPhone ? <a className="btn btn-secondary" href={customerWhatsAppHref(customer)} target="_blank" rel="noreferrer"><PhoneCallIcon className="h-4 w-4" />Open WhatsApp</a> : null}
              </div>
            </div>
          </div>
          <div className="grid gap-5">
            <div className="surface p-5">
              <h2 className="text-xl font-black">Recent Service Jobs</h2>
              <div className="mt-4 grid gap-3">
                {serviceHistory.slice(0, 4).length ? serviceHistory.slice(0, 4).map((order) => <Link key={order.id} className="rounded-card bg-[var(--surface-2)] p-3" to={`/admin/work-orders/${order.id}`}><b>{bookingLabel(order)} - {order.device}</b><p className="text-sm muted">{order.issue}</p><StatusBadge status={order.status} /></Link>) : <EmptyState title="No service jobs yet" message="Create the first booking for this customer." action={<Link className="btn btn-primary" to="/admin/bookings">Create Booking</Link>} />}
              </div>
            </div>
            <div className="surface p-5">
              <h2 className="text-xl font-black">Recent Invoices</h2>
              <div className="mt-4 grid gap-3">
                {invoices.slice(0, 4).length ? invoices.slice(0, 4).map((invoice) => <div key={invoice.id} className="rounded-card bg-[var(--surface-2)] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><b>{invoice.invoiceNumber}</b><StatusBadge status={invoice.status} /></div><p className="mt-1 text-sm muted">Total {currency(invoice.total)} - Balance {currency(invoice.balance)}</p></div>) : <EmptyState title="No invoices generated yet" message="Invoices will appear after a work order is billed." />}
              </div>
            </div>
            <div className="surface p-5">
              <h2 className="text-xl font-black">Active AMC</h2>
              {customer.amcStatus ? <StatusBadge status={customer.amcStatus} /> : <p className="mt-2 text-sm muted">No active AMC data available.</p>}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'devices' ? (
        <div className="surface p-5">
          <h2 className="text-xl font-black">Devices / Assets</h2>
          <div className="mt-4 table-wrap bg-[var(--surface)]">
            {deviceRows.length ? (
              <table className="data-table">
                <thead><tr><th>Device Name</th><th>Category</th><th>Serial Number</th><th>Warranty Status</th><th>Last Service Date</th><th>Service Count</th><th>Action</th></tr></thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {deviceRows.map((device) => (
                    <tr key={device.name}>
                      <td className="font-bold">{device.name}</td>
                      <td><StatusBadge status={device.category} /></td>
                      <td>{device.serialNumber}</td>
                      <td>{device.warrantyStatus}</td>
                      <td>{device.lastServiceDate ? formatDate(device.lastServiceDate) : '-'}</td>
                      <td>{device.serviceCount}</td>
                      <td>{device.firstJobId ? <Link className="btn btn-secondary py-2" to={`/admin/work-orders/${device.firstJobId}`}>View History</Link> : <button type="button" className="btn btn-secondary py-2" onClick={() => setActiveTab('serviceHistory')}>View History</button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState title="No devices linked yet" message="Devices will appear from bookings and repair jobs." action={<Link className="btn btn-primary" to="/admin/bookings">Create Booking</Link>} />}
          </div>
        </div>
      ) : null}

      {activeTab === 'serviceHistory' ? (
        <div className="surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Service History</h2>
              <p className="mt-1 text-sm muted">Full repair and service job history for this customer.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[170px_190px_160px_160px]">
            <select className="input" value={historyStatus} onChange={(event) => setHistoryStatus(event.target.value)}>
              <option value="">All statuses</option>
              {workOrderDetailStatuses.map((item) => <option key={item}>{item}</option>)}
            </select>
            <select className="input" value={historyServiceType} onChange={(event) => setHistoryServiceType(event.target.value)}>
              <option value="">All service types</option>
              {serviceTypes.map((item) => <option key={item}>{item}</option>)}
            </select>
            <input className="input" type="date" value={historyDateFrom} onChange={(event) => setHistoryDateFrom(event.target.value)} />
            <input className="input" type="date" value={historyDateTo} onChange={(event) => setHistoryDateTo(event.target.value)} />
          </div>
          <div className="mt-4 table-wrap bg-[var(--surface)]">
            {filteredServiceHistory.length ? (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Job ID</th><th>Service Type</th><th>Device</th><th>Issue</th><th>Technician</th><th>Status</th><th>Total Amount</th><th>Action</th></tr></thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {filteredServiceHistory.map((order) => {
                    const invoice = invoiceByWorkOrder.get(recordId(order));
                    const total = invoice?.total ?? (Number(order.serviceCharge || 0) + (order.partsUsed || []).reduce((sum, part) => sum + Number(part.total || 0), 0));
                    return (
                      <tr key={order.id}>
                        <td>{formatDate(order.createdAt)}</td>
                        <td className="font-bold">{bookingLabel(order)}</td>
                        <td>{order.serviceType || order.service || '-'}</td>
                        <td>{order.device || '-'}</td>
                        <td className="max-w-xs truncate">{order.issue || '-'}</td>
                        <td>{order.technicianId?.name || 'Unassigned'}</td>
                        <td><StatusBadge status={order.status} /></td>
                        <td className="font-bold">{currency(total)}</td>
                        <td><Link className="btn btn-secondary py-2" to={`/admin/work-orders/${order.id}`}>Open Job</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : <EmptyState title="No service jobs yet" message="Create the first booking for this customer." action={<Link className="btn btn-primary" to="/admin/bookings">Create Booking</Link>} />}
          </div>
        </div>
      ) : null}

      {activeTab === 'invoices' ? (
        <div className="surface p-5">
          <h2 className="text-xl font-black">Invoices</h2>
          <div className="mt-4 table-wrap bg-[var(--surface)]">
            {invoices.length ? (
              <table className="data-table">
                <thead><tr><th>Invoice Number</th><th>Date</th><th>Service Job</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th><th>Action</th></tr></thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="font-bold">{invoice.invoiceNumber}</td>
                      <td>{formatDate(invoice.createdAt)}</td>
                      <td>{recordId(invoice.workOrderId) ? <Link className="text-sky-100 hover:text-[var(--brand)]" to={`/admin/work-orders/${recordId(invoice.workOrderId)}`}>{bookingLabel(invoice.workOrderId)}</Link> : '-'}</td>
                      <td>{currency(invoice.total)}</td>
                      <td className="text-emerald-100">{currency(invoice.paidAmount)}</td>
                      <td className={Number(invoice.balance || 0) > 0 ? 'font-black text-amber-100' : 'text-emerald-100'}>{currency(invoice.balance)}</td>
                      <td><StatusBadge status={invoice.status} /></td>
                      <td><div className="flex flex-wrap gap-2">{recordId(invoice.workOrderId) ? <Link className="btn btn-secondary py-2" to={`/admin/work-orders/${recordId(invoice.workOrderId)}`}>Open Job</Link> : null}{Number(invoice.balance || 0) > 0 ? <Link className="btn btn-primary py-2" to={`/admin/payments?invoiceId=${recordId(invoice)}`}>Record Payment</Link> : null}</div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState title="No invoices generated yet" message="Invoices will appear after a work order is billed." />}
          </div>
        </div>
      ) : null}

      {activeTab === 'payments' ? (
        <div className="surface p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">Payments</h2>
            <Link className="btn btn-primary" to={`/admin/payments${pendingInvoice ? `?invoiceId=${recordId(pendingInvoice)}` : ''}`}><CreditCard className="h-4 w-4" />Record Payment</Link>
          </div>
          <div className="mt-4 table-wrap bg-[var(--surface)]">
            {payments.length ? (
              <table className="data-table">
                <thead><tr><th>Date</th><th>Invoice</th><th>Amount Paid</th><th>Method</th><th>Balance After</th><th>Status</th></tr></thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td>{formatDate(payment.createdAt)}</td>
                      <td>{payment.invoiceId?.invoiceNumber || '-'}</td>
                      <td className="font-bold text-emerald-100">{currency(payment.paidAmount)}</td>
                      <td>{payment.method || '-'}</td>
                      <td className={Number(payment.balance || 0) > 0 ? 'font-bold text-amber-100' : 'text-emerald-100'}>{currency(payment.balance)}</td>
                      <td><StatusBadge status={payment.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : <EmptyState title="No payments recorded yet" message="Payments will appear after invoice payment is recorded." action={pendingInvoice ? <Link className="btn btn-primary" to={`/admin/payments?invoiceId=${recordId(pendingInvoice)}`}>Record Payment</Link> : null} />}
          </div>
        </div>
      ) : null}

      {activeTab === 'notes' ? (
        <div className="surface p-5">
          <h2 className="text-xl font-black">Notes</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input className="input" placeholder="Customer notes API not available yet" disabled />
            <button type="button" className="btn btn-secondary disabled:cursor-not-allowed disabled:opacity-50" disabled>Add Note</button>
          </div>
          <div className="mt-4 grid gap-3">
            {customer.notes?.length ? customer.notes.map((note) => <div key={note.createdAt} className="rounded-card bg-[var(--surface-2)] p-3"><p>{note.text}</p><p className="mt-1 text-xs muted">{note.userId?.name || note.userId?.username || 'Team'} - {formatDate(note.createdAt)}</p></div>) : <EmptyState title="No notes yet" message="Customer notes will appear here when notes support is connected." />}
          </div>
        </div>
      ) : null}

      {activeTab === 'timeline' ? (
        <div className="surface p-5">
          <h2 className="text-xl font-black">Timeline</h2>
          <div className="mt-4 grid gap-3">
            {timelineEvents.length ? timelineEvents.map((event, index) => {
              const body = (
                <div className="rounded-card border border-[var(--line)] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-sky-400/15 px-2.5 py-1 text-xs font-black text-sky-100">{event.title}</span>
                    <StatusBadge status={event.status || 'Log'} />
                  </div>
                  <p className="mt-2 text-sm">{event.detail}</p>
                  <p className="mt-1 text-xs muted">{formatDate(event.date)}</p>
                </div>
              );
              return event.to ? <Link key={`${event.date}-${index}`} to={event.to}>{body}</Link> : <div key={`${event.date}-${index}`}>{body}</div>;
            }) : <EmptyState title="No timeline events yet" message="Customer activity will appear as bookings, service jobs, invoices, and payments are created." />}
          </div>
        </div>
      ) : null}
    </div>
  );
}
