import {
  AlertTriangle,
  AmcStatusBadge,
  Bell,
  BookOpenCheck,
  BookingSourceBadge,
  CalendarClock,
  callHref,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  currency,
  customerWhatsAppHref,
  EmptyState,
  ErrorBlock,
  FileText,
  formatDate,
  getInvoiceDisplayId,
  getWorkOrderDisplayId,
  invoiceDueAmount,
  isCompletedJob,
  isToday,
  KeyRound,
  Link,
  Loader2,
  LoadingBlock,
  PackagePlus,
  PageHeader,
  PhoneCallIcon,
  ReceiptText,
  recordId,
  SearchBox,
  Send,
  serviceTypes,
  Save,
  ShieldCheck,
  StatCard,
  StatusBadge,
  technicianWhatsAppHref,
  useAuth,
  useDebouncedValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useToast,
  uploadedAssetUrl,
  UserRound,
  Users,
  Wrench
} from '../../shared/phase1Shared.jsx';
import { Camera, Eye, EyeOff, Palette, Trash2, UploadCloud } from 'lucide-react';
import { themePreferenceOptions, useThemePreference } from '../../utils/theme.js';

function text(value) {
  return String(value || '').trim();
}

function normalized(value) {
  return text(value).toLowerCase();
}

function workOrderRows(payload) {
  if (Array.isArray(payload?.workOrders)) return payload.workOrders;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

async function loadAllTechnicianWorkOrders(request) {
  const first = await request('/work-orders?page=1&limit=50');
  const rows = [...workOrderRows(first)];
  const totalPages = Number(first?.pagination?.totalPages || 1);

  if (totalPages > 1) {
    const pages = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, index) => (
        request(`/work-orders?page=${index + 2}&limit=50`).catch(() => ({ workOrders: [] }))
      ))
    );
    pages.forEach((page) => rows.push(...workOrderRows(page)));
  }

  return { workOrders: rows, pagination: first?.pagination || { total: rows.length, totalPages: 1, page: 1, limit: rows.length || 50 } };
}

function useTechnicianWorkOrders() {
  const { request } = useAuth();
  const [state, setState] = useState({ data: null, loading: true, error: '' });

  useEffect(() => {
    let mounted = true;
    setState((current) => ({ ...current, loading: !current.data, error: '' }));
    loadAllTechnicianWorkOrders(request)
      .then((data) => {
        if (mounted) setState({ data, loading: false, error: '' });
      })
      .catch((err) => {
        if (mounted) setState((current) => ({ ...current, loading: false, error: err.message || 'Unable to load work orders' }));
      });
    return () => {
      mounted = false;
    };
  }, [request]);

  return state;
}

function customerFromJob(job) {
  return job?.customerId && typeof job.customerId === 'object' ? job.customerId : {};
}

function customerName(job) {
  const customer = customerFromJob(job);
  return customer.name || job?.customerName || 'Customer';
}

function customerPhone(job) {
  const customer = customerFromJob(job);
  return customer.phone || job?.phone || '';
}

function workOrderLink(job) {
  return `/app/tech/work-orders/${recordId(job)}`;
}

function linkedInvoiceEntries(jobs) {
  const map = new Map();
  jobs.forEach((job) => {
    [
      { invoice: job?.invoiceId, source: 'Work Order' },
      { invoice: job?.amcContractId?.invoiceId, source: 'AMC Contract' }
    ].forEach(({ invoice, source }) => {
      const id = recordId(invoice);
      if (!id || map.has(id)) return;
      map.set(id, { id, invoice: typeof invoice === 'object' ? invoice : { id }, job, source });
    });
  });
  return Array.from(map.values());
}

function linkedBookingEntries(jobs) {
  const map = new Map();
  jobs.forEach((job) => {
    const booking = job?.bookingId;
    const id = recordId(booking) || job?.bookingCode || `${recordId(job)}-booking`;
    if (!booking || !id || map.has(id)) return;
    map.set(id, {
      id,
      booking: typeof booking === 'object' ? booking : { id },
      job,
      customer: customerFromJob(job)
    });
  });
  return Array.from(map.values());
}

function linkedCustomerEntries(jobs) {
  const map = new Map();
  jobs.forEach((job) => {
    const customer = customerFromJob(job);
    const id = recordId(customer) || customer.phone || customer.name;
    if (!id) return;
    const entry = map.get(id) || { id, customer, jobs: [] };
    entry.jobs.push(job);
    map.set(id, entry);
  });
  return Array.from(map.values());
}

function linkedAmcEntries(jobs) {
  const map = new Map();
  jobs.forEach((job) => {
    const contract = job?.amcContractId;
    const id = recordId(contract) || contract?.contractId;
    if (!contract || !id) return;
    const entry = map.get(id) || { id, contract, jobs: [] };
    entry.jobs.push(job);
    map.set(id, entry);
  });
  return Array.from(map.values());
}

function filterBySearch(rows, search, getText) {
  const query = normalized(search);
  if (!query) return rows;
  return rows.filter((row) => normalized(getText(row)).includes(query));
}

function customerActions(jobOrCustomer) {
  const customer = jobOrCustomer?.customer || customerFromJob(jobOrCustomer);
  const phone = customer?.phone || customerPhone(jobOrCustomer);
  const whatsappHref = customer?.phone ? customerWhatsAppHref(customer) : technicianWhatsAppHref(jobOrCustomer);
  const disabled = phone ? '' : 'pointer-events-none opacity-50';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a className={`btn btn-secondary py-2 ${disabled}`} href={callHref(phone)}>
        <PhoneCallIcon className="h-4 w-4" />
        Call
      </a>
      <a className={`btn btn-secondary py-2 ${disabled}`} href={phone ? whatsappHref : '#'} target="_blank" rel="noreferrer">
        <Send className="h-4 w-4" />
        WhatsApp
      </a>
    </div>
  );
}

function ModuleTable({ children }) {
  return (
    <div className="table-wrap border border-white/10 bg-[var(--surface)]">
      <table className="data-table w-full">{children}</table>
    </div>
  );
}

function ModuleToolbar({ search, setSearch, placeholder, children }) {
  return (
    <section className="surface mb-5 grid gap-3 border border-white/10 bg-[#0b172a]/60 p-4 shadow-lg backdrop-blur-md md:grid-cols-[minmax(18rem,1fr)_auto]">
      <SearchBox value={search} onChange={setSearch} placeholder={placeholder} />
      <div className="grid gap-3 sm:flex sm:items-center sm:justify-end">
        {children}
      </div>
    </section>
  );
}

function invoiceTotal(invoice) {
  return Number(invoice?.total || invoice?.totalAmount || invoice?.amount || 0);
}

function invoicePaid(invoice) {
  return Number(invoice?.paidAmount || invoice?.amountPaid || invoice?.paid || 0);
}

function invoiceStatus(invoice) {
  return invoice?.paymentStatus || invoice?.invoiceStatus || invoice?.status || 'Pending';
}

function invoiceSearch(entry) {
  const invoice = entry.invoice;
  return [
    getInvoiceDisplayId(invoice),
    invoice.invoiceNumber,
    invoice.title,
    invoiceStatus(invoice),
    customerName(entry.job),
    customerPhone(entry.job),
    getWorkOrderDisplayId(entry.job),
    entry.source
  ].join(' ');
}

function workOrderStatusFilterValue(value) {
  return value ? normalized(value) : '';
}

export function TechnicianBookingsPage() {
  const { data, loading, error } = useTechnicianWorkOrders();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const jobs = useMemo(() => workOrderRows(data), [data]);
  const bookings = useMemo(() => linkedBookingEntries(jobs), [jobs]);
  const visibleBookings = useMemo(() => {
    let rows = filterBySearch(bookings, debouncedSearch, (entry) => [
      entry.booking.bookingCode,
      entry.booking.serviceType,
      entry.booking.bookingSource,
      entry.job.device,
      entry.job.issue,
      customerName(entry.job),
      customerPhone(entry.job),
      getWorkOrderDisplayId(entry.job)
    ].join(' '));
    if (status) rows = rows.filter((entry) => workOrderStatusFilterValue(entry.job.status) === workOrderStatusFilterValue(status));
    if (source) rows = rows.filter((entry) => normalized(entry.booking.bookingSource || entry.job.bookingSource) === normalized(source));
    return rows;
  }, [bookings, debouncedSearch, source, status]);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div className="bookings-page mx-auto max-w-[1920px] space-y-6">
      <PageHeader title="Bookings" eyebrow="Technician">
        Booking records linked to your assigned service jobs.
      </PageHeader>
      <ModuleToolbar search={search} setSearch={setSearch} placeholder="Search booking, customer, phone, device, issue">
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {['Pending', 'In Progress', 'Awaiting Parts', 'Completed', 'Delivered', 'Returned'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <select className="input" value={source} onChange={(event) => setSource(event.target.value)}>
          <option value="">All sources</option>
          {['Call', 'Walk-in Shop', 'Website'].map((item) => <option key={item}>{item}</option>)}
        </select>
      </ModuleToolbar>
      {!visibleBookings.length ? (
        <EmptyState icon={BookOpenCheck} title="No assigned bookings found" message="Assigned booking records will appear here after they are linked to your work orders." />
      ) : (
        <ModuleTable>
          <thead>
            <tr>
              <th>Booking</th>
              <th>Source</th>
              <th>Customer</th>
              <th>Device / Service</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleBookings.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <span className="block font-bold text-slate-100">{entry.booking.bookingCode || getWorkOrderDisplayId(entry.job)}</span>
                  <span className="mt-1 block text-xs muted">{formatDate(entry.job.createdAt)}</span>
                </td>
                <td><BookingSourceBadge source={entry.booking.bookingSource || entry.job.bookingSource} /></td>
                <td>
                  <span className="block font-bold text-slate-100">{customerName(entry.job)}</span>
                  <span className="mt-1 block text-xs muted">{customerPhone(entry.job) || '-'}</span>
                </td>
                <td>
                  <span className="block font-semibold text-slate-100">{entry.job.device || entry.booking.serviceType || 'Service Job'}</span>
                  <span className="mt-1 block text-xs muted">{entry.job.serviceType || entry.booking.serviceType || '-'}</span>
                </td>
                <td><StatusBadge status={entry.job.status} /></td>
                <td>
                  <div className="flex flex-wrap items-center gap-2">
                    {customerActions(entry.job)}
                    <Link className="btn btn-primary py-2" to={workOrderLink(entry.job)}>Open Job</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </ModuleTable>
      )}
    </div>
  );
}

export function TechnicianCustomersPage() {
  const { data, loading, error } = useTechnicianWorkOrders();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const jobs = useMemo(() => workOrderRows(data), [data]);
  const customers = useMemo(() => linkedCustomerEntries(jobs), [jobs]);
  const visibleCustomers = useMemo(() => filterBySearch(customers, debouncedSearch, (entry) => [
    entry.customer.name,
    entry.customer.phone,
    entry.customer.address,
    entry.jobs.map((job) => `${job.device} ${job.serviceType} ${getWorkOrderDisplayId(job)}`).join(' ')
  ].join(' ')), [customers, debouncedSearch]);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div className="mx-auto max-w-[1920px] space-y-6">
      <PageHeader title="Customers" eyebrow="Technician">
        Customers connected to your assigned, attended, or linked service jobs.
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Related Customers" value={customers.length} />
        <StatCard icon={Wrench} label="Assigned Jobs" value={jobs.length} />
        <StatCard icon={CheckCircle2} label="Completed Jobs" value={jobs.filter(isCompletedJob).length} tone="green" />
        <StatCard icon={CreditCard} label="Pending Job Balance" value={currency(linkedInvoiceEntries(jobs).reduce((sum, entry) => sum + invoiceDueAmount(entry.invoice), 0))} tone="yellow" />
      </div>
      <ModuleToolbar search={search} setSearch={setSearch} placeholder="Search customer, phone, address, job" />
      {!visibleCustomers.length ? (
        <EmptyState icon={Users} title="No related customers found" message="Customers from your assigned jobs will appear here." />
      ) : (
        <ModuleTable>
          <thead>
            <tr>
              <th>Customer</th>
              <th>Address / Devices</th>
              <th>Assigned Jobs</th>
              <th>Service History</th>
              <th>Payment / AMC</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleCustomers.map((entry) => {
              const invoices = linkedInvoiceEntries(entry.jobs);
              const amcContracts = linkedAmcEntries(entry.jobs);
              const devices = Array.isArray(entry.customer.devices) ? entry.customer.devices : [];
              return (
                <tr key={entry.id}>
                  <td>
                    <span className="block font-bold text-slate-100">{entry.customer.name || 'Customer'}</span>
                    <span className="mt-1 block text-xs muted">{entry.customer.phone || '-'}</span>
                  </td>
                  <td>
                    <span className="block text-sm text-slate-200">{entry.customer.address || '-'}</span>
                    <span className="mt-1 block text-xs muted">
                      {devices.length ? devices.slice(0, 2).map((device) => device?.name || device?.device || device).join(', ') : 'Devices from assigned jobs'}
                    </span>
                  </td>
                  <td><StatusBadge status={`${entry.jobs.length} job${entry.jobs.length === 1 ? '' : 's'}`} /></td>
                  <td>
                    <span className="block text-sm text-slate-200">{entry.jobs.filter(isCompletedJob).length} completed</span>
                    <span className="mt-1 block text-xs muted">{entry.jobs[0] ? getWorkOrderDisplayId(entry.jobs[0]) : '-'}</span>
                  </td>
                  <td>
                    <span className="block text-sm font-semibold text-slate-100">{currency(invoices.reduce((sum, invoice) => sum + invoiceDueAmount(invoice.invoice), 0))}</span>
                    <span className="mt-1 block text-xs muted">{amcContracts.length ? `${amcContracts.length} AMC linked` : 'No AMC linked'}</span>
                  </td>
                  <td>
                    <div className="grid gap-2">
                      {customerActions({ customer: entry.customer })}
                      <Link className="btn btn-primary py-2" to={workOrderLink(entry.jobs[0])}>Open Job</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </ModuleTable>
      )}
    </div>
  );
}

export function TechnicianInvoicesPage() {
  const { data, loading, error } = useTechnicianWorkOrders();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const jobs = useMemo(() => workOrderRows(data), [data]);
  const invoices = useMemo(() => linkedInvoiceEntries(jobs), [jobs]);
  const visibleInvoices = useMemo(() => {
    let rows = filterBySearch(invoices, debouncedSearch, invoiceSearch);
    if (status) rows = rows.filter((entry) => normalized(invoiceStatus(entry.invoice)) === normalized(status));
    return rows;
  }, [debouncedSearch, invoices, status]);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div className="billing-page invoices-page">
      <PageHeader title="Invoices" eyebrow="Technician">
        Invoices linked to your assigned work orders.
      </PageHeader>
      <div className="billing-kpi-grid mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={ReceiptText} label="Linked Invoices" value={invoices.length} />
        <StatCard icon={AlertTriangle} label="Pending" value={invoices.filter((entry) => normalized(invoiceStatus(entry.invoice)) === 'pending').length} tone="yellow" />
        <StatCard icon={CreditCard} label="Partial" value={invoices.filter((entry) => ['partial', 'partially paid'].includes(normalized(invoiceStatus(entry.invoice)))).length} tone="yellow" />
        <StatCard icon={CheckCircle2} label="Paid" value={invoices.filter((entry) => normalized(invoiceStatus(entry.invoice)) === 'paid').length} tone="green" />
      </div>
      <ModuleToolbar search={search} setSearch={setSearch} placeholder="Search invoice, work order, customer, phone">
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {['Pending', 'Partial', 'Paid'].map((item) => <option key={item}>{item}</option>)}
        </select>
      </ModuleToolbar>
      {!visibleInvoices.length ? (
        <EmptyState icon={ReceiptText} title="No linked invoices found" message="Invoices from your assigned jobs will appear here once generated." />
      ) : (
        <ModuleTable>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer / Job</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleInvoices.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <span className="block font-bold text-slate-100">{getInvoiceDisplayId(entry.invoice)}</span>
                  <span className="mt-1 block text-xs muted">{entry.source}</span>
                </td>
                <td>
                  <span className="block font-bold text-slate-100">{customerName(entry.job)}</span>
                  <span className="mt-1 block text-xs muted">{getWorkOrderDisplayId(entry.job)}</span>
                </td>
                <td>{currency(invoiceTotal(entry.invoice))}</td>
                <td>{currency(invoicePaid(entry.invoice))}</td>
                <td>{currency(invoiceDueAmount(entry.invoice))}</td>
                <td><StatusBadge status={invoiceStatus(entry.invoice)} /></td>
                <td>
                  <div className="flex flex-wrap items-center gap-2">
                    <a className={`btn btn-secondary py-2 ${customerPhone(entry.job) ? '' : 'pointer-events-none opacity-50'}`} href={technicianWhatsAppHref(entry.job)} target="_blank" rel="noreferrer">
                      <Send className="h-4 w-4" />
                      WhatsApp
                    </a>
                    <Link className="btn btn-primary py-2" to={workOrderLink(entry.job)}>Open Job</Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </ModuleTable>
      )}
    </div>
  );
}

export function TechnicianPaymentsPage() {
  const { data, loading, error } = useTechnicianWorkOrders();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const jobs = useMemo(() => workOrderRows(data), [data]);
  const invoices = useMemo(() => linkedInvoiceEntries(jobs), [jobs]);
  const visiblePayments = useMemo(() => {
    let rows = filterBySearch(invoices, debouncedSearch, invoiceSearch);
    if (status) rows = rows.filter((entry) => normalized(invoiceStatus(entry.invoice)) === normalized(status));
    return rows;
  }, [debouncedSearch, invoices, status]);
  const pendingBalance = invoices.reduce((sum, entry) => sum + invoiceDueAmount(entry.invoice), 0);
  const collected = invoices.reduce((sum, entry) => sum + invoicePaid(entry.invoice), 0);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div className="billing-page payments-page">
      <PageHeader title="Payments" eyebrow="Technician">
        Payment status for invoices linked to your assigned jobs.
      </PageHeader>
      <div className="billing-kpi-grid mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CreditCard} label="Linked Payment Items" value={invoices.length} />
        <StatCard icon={AlertTriangle} label="Pending Balance" value={currency(pendingBalance)} tone="yellow" />
        <StatCard icon={CheckCircle2} label="Collected Amount" value={currency(collected)} tone="green" />
        <StatCard icon={ReceiptText} label="Pending / Partial" value={invoices.filter((entry) => ['pending', 'partial', 'partially paid'].includes(normalized(invoiceStatus(entry.invoice)))).length} tone="yellow" />
      </div>
      <ModuleToolbar search={search} setSearch={setSearch} placeholder="Search payment invoice, customer, work order">
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {['Pending', 'Partial', 'Paid'].map((item) => <option key={item}>{item}</option>)}
        </select>
      </ModuleToolbar>
      {!visiblePayments.length ? (
        <EmptyState icon={CreditCard} title="No linked payments found" message="Payment records tied to your assigned job invoices will appear here." />
      ) : (
        <ModuleTable>
          <thead>
            <tr>
              <th>Invoice / Payment</th>
              <th>Customer</th>
              <th>Collected</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visiblePayments.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <span className="block font-bold text-slate-100">{getInvoiceDisplayId(entry.invoice)}</span>
                  <span className="mt-1 block text-xs muted">{getWorkOrderDisplayId(entry.job)}</span>
                </td>
                <td>
                  <span className="block font-bold text-slate-100">{customerName(entry.job)}</span>
                  <span className="mt-1 block text-xs muted">{customerPhone(entry.job) || '-'}</span>
                </td>
                <td>{currency(invoicePaid(entry.invoice))}</td>
                <td>{currency(invoiceDueAmount(entry.invoice))}</td>
                <td><StatusBadge status={invoiceStatus(entry.invoice)} /></td>
                <td><Link className="btn btn-primary py-2" to={workOrderLink(entry.job)}>Open Job</Link></td>
              </tr>
            ))}
          </tbody>
        </ModuleTable>
      )}
    </div>
  );
}

export function TechnicianAMCContractsPage() {
  const { data, loading, error } = useTechnicianWorkOrders();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const jobs = useMemo(() => workOrderRows(data), [data]);
  const contracts = useMemo(() => linkedAmcEntries(jobs), [jobs]);
  const visibleContracts = useMemo(() => {
    let rows = filterBySearch(contracts, debouncedSearch, (entry) => [
      entry.contract.contractId,
      entry.contract.contractType,
      entry.contract.coverageType,
      entry.contract.coveredService,
      entry.contract.coveredDevices,
      entry.contract.status,
      entry.jobs.map((job) => `${customerName(job)} ${customerPhone(job)} ${getWorkOrderDisplayId(job)}`).join(' ')
    ].join(' '));
    if (status) rows = rows.filter((entry) => normalized(entry.contract.status) === normalized(status));
    return rows;
  }, [contracts, debouncedSearch, status]);
  const visitsDue = contracts.reduce((sum, entry) => sum + entry.jobs.filter((job) => !isCompletedJob(job)).length, 0);

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div className="mx-auto max-w-[1920px] space-y-6">
      <PageHeader title="AMC Contracts" eyebrow="Technician">
        AMC contracts linked to your assigned service visits and jobs.
      </PageHeader>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FileText} label="Assigned AMC Contracts" value={contracts.length} />
        <StatCard icon={CalendarClock} label="AMC Visits Due" value={visitsDue} tone="yellow" />
        <StatCard icon={CheckCircle2} label="Completed Visits" value={jobs.filter((job) => job.amcContractId && isCompletedJob(job)).length} tone="green" />
        <StatCard icon={ShieldCheck} label="Active Contracts" value={contracts.filter((entry) => normalized(entry.contract.status) === 'active').length} tone="green" />
      </div>
      <ModuleToolbar search={search} setSearch={setSearch} placeholder="Search contract, customer, phone, device">
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          {['Active', 'Renewal Due', 'Expired', 'Completed', 'Cancelled'].map((item) => <option key={item}>{item}</option>)}
        </select>
      </ModuleToolbar>
      {!visibleContracts.length ? (
        <EmptyState icon={FileText} title="No assigned AMC contracts found" message="AMC contracts linked to your assigned service visits will appear here." />
      ) : (
        <ModuleTable>
          <thead>
            <tr>
              <th>Contract</th>
              <th>Customer / Site</th>
              <th>Coverage</th>
              <th>Period</th>
              <th>Visits</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleContracts.map((entry) => {
              const firstJob = entry.jobs[0];
              return (
                <tr key={entry.id}>
                  <td>
                    <span className="block font-bold text-slate-100">{entry.contract.contractId || 'AMC Contract'}</span>
                    <span className="mt-1 block text-xs muted">{entry.contract.contractType || '-'}</span>
                  </td>
                  <td>
                    <span className="block font-bold text-slate-100">{customerName(firstJob)}</span>
                    <span className="mt-1 block text-xs muted">{customerPhone(firstJob) || '-'}</span>
                  </td>
                  <td>
                    <span className="block text-sm text-slate-200">{entry.contract.coverageType || entry.contract.coveredService || '-'}</span>
                    <span className="mt-1 block text-xs muted">{entry.contract.coveredDevices || '-'}</span>
                  </td>
                  <td>
                    <span className="block text-sm text-slate-200">{formatDate(entry.contract.startDate)}</span>
                    <span className="mt-1 block text-xs muted">to {formatDate(entry.contract.endDate)}</span>
                  </td>
                  <td>
                    <span className="block text-sm font-semibold text-slate-100">{entry.jobs.length} linked</span>
                    <span className="mt-1 block text-xs muted">{entry.jobs.filter((job) => !isCompletedJob(job)).length} open</span>
                  </td>
                  <td><AmcStatusBadge status={entry.contract.status || 'Active'} /></td>
                  <td>
                    <div className="flex flex-wrap items-center gap-2">
                      {customerActions(firstJob)}
                      <Link className="btn btn-primary py-2" to={workOrderLink(firstJob)}>Open Visit</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </ModuleTable>
      )}
    </div>
  );
}

function settingsFallback(value) {
  const normalizedValue = text(value);
  return normalizedValue || 'Not available';
}

function stableJson(value) {
  return JSON.stringify(value || {});
}

function technicianInitial(user) {
  return (text(user?.name || user?.username || 'T')[0] || 'T').toUpperCase();
}

function accountStatus(user) {
  if (user?.status) return user.status;
  if (user?.active === true || user?.isActive === true) return 'Active';
  if (user?.active === false || user?.isActive === false) return 'Inactive';
  return 'Not available';
}

function technicianSettingsAssetUrl(url = '') {
  const value = text(url);
  if (!value) return '';
  if (value.startsWith('/uploads/')) return uploadedAssetUrl(value);
  return value;
}

function cleanContactNumber(value) {
  return String(value || '').replace(/[^0-9+\-()\s]/g, '').slice(0, 40);
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function validTechnicianPhone(value) {
  return digitsOnly(value).length === 10;
}

const technicianNotificationDefaults = {
  newJobAssigned: true,
  partRequestApproved: true,
  paymentPending: true,
  amcVisitDue: true,
  workOrderStatusUpdated: true
};

const technicianNotificationOptions = [
  ['newJobAssigned', 'New job assigned', 'High-priority assignment alerts'],
  ['partRequestApproved', 'Part request approved', 'Approvals and stock movement updates'],
  ['paymentPending', 'Payment pending', 'Invoice and collection reminders'],
  ['amcVisitDue', 'AMC visit due', 'Upcoming maintenance visit alerts'],
  ['workOrderStatusUpdated', 'Work order status updated', 'Changes on assigned service jobs']
];

function technicianPreferenceStorageKey(user) {
  return `us_technician_notifications:${recordId(user) || user?.username || 'local'}`;
}

function readTechnicianPreferences(user) {
  if (typeof window === 'undefined') return technicianNotificationDefaults;
  try {
    const stored = window.localStorage.getItem(technicianPreferenceStorageKey(user));
    if (!stored) return technicianNotificationDefaults;
    return { ...technicianNotificationDefaults, ...JSON.parse(stored) };
  } catch {
    return technicianNotificationDefaults;
  }
}

function validateAvatarFile(file) {
  if (!file) return '';
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const name = String(file.name || '').toLowerCase();
  const extOk = ['.jpg', '.jpeg', '.png', '.webp'].some((ext) => name.endsWith(ext));
  if (!allowedTypes.has(file.type) && !extOk) return 'Only JPG, PNG, or WEBP profile photos are allowed.';
  if (file.size > 5 * 1024 * 1024) return 'Profile photo must be 5 MB or less.';
  return '';
}

function SettingsCard({ icon: Icon, title, description, children, className = '' }) {
  return (
    <section className={`technician-settings-card ${className}`}>
      <div className="technician-settings-card-head">
        <div className="technician-settings-card-icon">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      <div className="technician-settings-card-body">{children}</div>
    </section>
  );
}

function ThemePreferenceButtons({ value, onChange }) {
  return (
    <div className="technician-theme-options">
      {themePreferenceOptions.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={`technician-theme-option ${active ? 'is-active' : ''}`}
            aria-pressed={active}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function AccountStatusRow({ label, value, status = false }) {
  return (
    <div className="technician-account-status-row">
      <span>{label}</span>
      <strong className={status ? 'technician-account-status-value' : ''}>{settingsFallback(value)}</strong>
    </div>
  );
}

function PasswordInput({ label, field, value, visible, autoComplete, error, onChange, onToggle }) {
  const VisibleIcon = visible ? EyeOff : Eye;
  return (
    <label className="technician-settings-field">
      <span>{label}</span>
      <div className="technician-password-field">
        <input
          className="input"
          type={visible ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          minLength={field === 'currentPassword' ? undefined : 6}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="technician-password-toggle"
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          onClick={onToggle}
        >
          <VisibleIcon className="h-4 w-4" />
        </button>
      </div>
      {error ? <small className="technician-settings-inline-error">{error}</small> : null}
    </label>
  );
}

function PremiumSwitch({ label, description, checked, onChange }) {
  return (
    <button type="button" className="technician-premium-switch-row" role="switch" aria-checked={checked} onClick={onChange}>
      <span>
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      <span className={`technician-premium-switch ${checked ? 'is-on' : ''}`} aria-hidden="true">
        <i />
      </span>
    </button>
  );
}

export function TechnicianSettingsPage() {
  const { request, user, setUser } = useAuth();
  const { push } = useToast();
  const { themePreference, resolvedTheme, setThemePreference } = useThemePreference();
  const photoInputRef = useRef(null);
  const profileBaseline = useMemo(() => ({
    name: user?.name || '',
    phone: user?.phone || '',
    whatsappNumber: user?.whatsappNumber || user?.whatsapp || ''
  }), [user?.name, user?.phone, user?.whatsapp, user?.whatsappNumber]);
  const [profileForm, setProfileForm] = useState(profileBaseline);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordVisible, setPasswordVisible] = useState({ currentPassword: false, newPassword: false, confirmPassword: false });
  const preferenceStorageKey = useMemo(() => technicianPreferenceStorageKey(user), [user?.id, user?._id, user?.username]);
  const [preferences, setPreferences] = useState(() => readTechnicianPreferences(user));
  const [savedPreferences, setSavedPreferences] = useState(preferences);
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [preferencesSaving, setPreferencesSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState('');
  const lastUpdatedTime = useMemo(
    () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    []
  );
  const displayName = settingsFallback(user?.name || user?.username);
  const username = settingsFallback(user?.username);
  const profileDirty = stableJson(profileForm) !== stableJson(profileBaseline);
  const preferencesDirty = stableJson(preferences) !== stableJson(savedPreferences);
  const avatarSrc = photoPreviewUrl || technicianSettingsAssetUrl(user?.avatarUrl);
  const hasCustomPhoto = Boolean(photoPreviewUrl || user?.avatarUrl);
  const profileErrors = useMemo(() => ({
    name: profileForm.name.trim() ? '' : 'Full Name is required.',
    phone: profileForm.phone.trim()
      ? (validTechnicianPhone(profileForm.phone) ? '' : 'Phone Number must be exactly 10 digits.')
      : 'Phone Number is required.',
    whatsappNumber: profileForm.whatsappNumber.trim() && !validTechnicianPhone(profileForm.whatsappNumber)
      ? 'WhatsApp Number must be exactly 10 digits.'
      : ''
  }), [profileForm]);
  const profileValid = !profileErrors.name && !profileErrors.phone && !profileErrors.whatsappNumber;
  const passwordErrors = useMemo(() => ({
    currentPassword: passwordForm.currentPassword ? '' : 'Current Password is required.',
    newPassword: passwordForm.newPassword
      ? (passwordForm.newPassword.length >= 6 ? '' : 'New password must be at least 6 characters.')
      : 'New Password is required.',
    confirmPassword: passwordForm.confirmPassword
      ? (passwordForm.confirmPassword === passwordForm.newPassword ? '' : 'Confirm password must match.')
      : 'Confirm Password is required.'
  }), [passwordForm]);
  const passwordReady = Boolean(
    passwordForm.currentPassword
    && passwordForm.newPassword
    && passwordForm.confirmPassword
    && !passwordErrors.currentPassword
    && !passwordErrors.newPassword
    && !passwordErrors.confirmPassword
  );
  const themeLabel = useMemo(() => {
    if (themePreference === 'system') {
      return `System Default (${resolvedTheme === 'light' ? 'Light' : 'Dark'})`;
    }
    return themePreference === 'light' ? 'Light' : 'Dark';
  }, [resolvedTheme, themePreference]);

  useEffect(() => {
    setProfileForm(profileBaseline);
  }, [profileBaseline]);

  useEffect(() => {
    const nextPreferences = readTechnicianPreferences(user);
    setPreferences(nextPreferences);
    setSavedPreferences(nextPreferences);
  }, [preferenceStorageKey]);

  useEffect(() => () => {
    if (photoPreviewUrl.startsWith('blob:')) URL.revokeObjectURL(photoPreviewUrl);
  }, [photoPreviewUrl]);

  function syncUser(result) {
    if (!result?.user) return;
    setUser(result.user);
    localStorage.setItem('us_user', JSON.stringify(result.user));
  }

  function updateProfileField(field, value) {
    setProfileForm((current) => ({ ...current, [field]: field === 'name' ? value : cleanContactNumber(value) }));
  }

  async function saveProfile(event) {
    event.preventDefault();
    const profileError = profileErrors.name || profileErrors.phone || profileErrors.whatsappNumber;
    if (profileError) {
      push(profileError, 'error');
      return;
    }
    setProfileSaving(true);
    try {
      const result = await request('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: profileForm.name,
          phone: profileForm.phone,
          whatsappNumber: profileForm.whatsappNumber
        })
      });
      syncUser(result);
      push(result.message || 'Profile updated');
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setProfileSaving(false);
    }
  }

  async function updatePassword(event) {
    event.preventDefault();
    const passwordError = passwordErrors.currentPassword || passwordErrors.newPassword || passwordErrors.confirmPassword;
    if (passwordError) {
      push(passwordError, 'error');
      return;
    }
    setPasswordSaving(true);
    try {
      const result = await request('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });
      syncUser(result);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      push(result.message || 'Password updated');
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setPasswordSaving(false);
    }
  }

  function togglePasswordVisibility(field) {
    setPasswordVisible((current) => ({ ...current, [field]: !current[field] }));
  }

  async function uploadProfilePhoto(file) {
    const validationMessage = validateAvatarFile(file);
    if (validationMessage) {
      push(validationMessage, 'error');
      return;
    }
    const preview = URL.createObjectURL(file);
    setPhotoPreviewUrl(preview);
    const body = new FormData();
    body.append('avatar', file);
    setPhotoUploading(true);
    try {
      const result = await request('/auth/profile/avatar', { method: 'POST', body });
      syncUser(result);
      setPhotoPreviewUrl('');
      push(result.message || 'Profile photo updated');
    } catch (err) {
      setPhotoPreviewUrl('');
      push(err.message, 'error');
    } finally {
      setPhotoUploading(false);
    }
  }

  async function removeProfilePhoto() {
    if (!hasCustomPhoto || photoUploading) return;
    setPhotoUploading(true);
    try {
      if (photoPreviewUrl) setPhotoPreviewUrl('');
      if (user?.avatarUrl) {
        const result = await request('/auth/profile/avatar', { method: 'DELETE' });
        syncUser(result);
        push('Profile photo removed.');
      } else {
        push('Profile photo removed.');
      }
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setPhotoUploading(false);
    }
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) uploadProfilePhoto(file);
  }

  function updatePreference(key) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  }

  function savePreferences(event) {
    event.preventDefault();
    if (!preferencesDirty) return;
    setPreferencesSaving(true);
    try {
      window.localStorage.setItem(preferenceStorageKey, JSON.stringify(preferences));
      setSavedPreferences(preferences);
      push('Notification preferences saved');
    } catch {
      push('Unable to save notification preferences', 'error');
    } finally {
      setPreferencesSaving(false);
    }
  }

  function updateThemePreference(nextPreference) {
    setThemePreference(nextPreference);
    push('Theme preference saved locally');
  }

  return (
    <div className="technician-settings-page mx-auto max-w-[1600px] space-y-6">
      <PageHeader
        title="Settings"
        eyebrow="TECHNICIAN"
        action={(
          <div className="technician-settings-updated-pill">
            <CalendarClock className="h-4 w-4 text-[var(--brand-2)]" />
            Last updated: Today, {lastUpdatedTime}
          </div>
        )}
      >
        Manage your profile, security settings, and account preferences.
      </PageHeader>

      <div className="technician-settings-layout">
        <div className="technician-settings-main-column">
        <SettingsCard icon={UserRound} title="Profile Information" description="Keep your technician contact details current.">
          <form className="technician-settings-form" onSubmit={saveProfile}>
            <div className="technician-settings-field-grid">
              <label className="technician-settings-field">
                <span>Full Name</span>
              <input
                className="input"
                value={profileForm.name}
                placeholder="Your full name"
                onChange={(event) => updateProfileField('name', event.target.value)}
                required
              />
              {profileErrors.name ? <small className="technician-settings-inline-error">{profileErrors.name}</small> : null}
            </label>
              <label className="technician-settings-field">
                <span>Phone Number</span>
              <input
                className="input"
                value={profileForm.phone}
                placeholder="+91 98427 81971"
                onChange={(event) => updateProfileField('phone', event.target.value)}
                required
              />
              {profileErrors.phone ? <small className="technician-settings-inline-error">{profileErrors.phone}</small> : null}
            </label>
              <label className="technician-settings-field">
                <span>WhatsApp Number <small>Optional</small></span>
                <input
                  className="input"
                  value={profileForm.whatsappNumber}
                  placeholder="+91 98427 81971"
                  onChange={(event) => updateProfileField('whatsappNumber', event.target.value)}
                />
                {profileErrors.whatsappNumber ? <small className="technician-settings-inline-error">{profileErrors.whatsappNumber}</small> : null}
              </label>
            </div>
            <button className="btn btn-primary technician-settings-action" type="submit" disabled={profileSaving || !profileDirty || !profileValid}>
              {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {profileSaving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </SettingsCard>

        <SettingsCard icon={KeyRound} title="Change Password" description="Update your account password securely.">
          <form className="technician-settings-form" onSubmit={updatePassword}>
            <div className="technician-password-grid">
              <PasswordInput
                field="currentPassword"
                label="Current Password"
                value={passwordForm.currentPassword}
                visible={passwordVisible.currentPassword}
                autoComplete="current-password"
                error=""
                onChange={(value) => setPasswordForm((current) => ({ ...current, currentPassword: value }))}
                onToggle={() => togglePasswordVisibility('currentPassword')}
              />
              <PasswordInput
                field="newPassword"
                label="New Password"
                value={passwordForm.newPassword}
                visible={passwordVisible.newPassword}
                autoComplete="new-password"
                error={passwordErrors.newPassword && passwordForm.newPassword ? passwordErrors.newPassword : ''}
                onChange={(value) => setPasswordForm((current) => ({ ...current, newPassword: value }))}
                onToggle={() => togglePasswordVisibility('newPassword')}
              />
              <PasswordInput
                field="confirmPassword"
                label="Confirm Password"
                value={passwordForm.confirmPassword}
                visible={passwordVisible.confirmPassword}
                autoComplete="new-password"
                error={passwordErrors.confirmPassword && passwordForm.confirmPassword ? passwordErrors.confirmPassword : ''}
                onChange={(value) => setPasswordForm((current) => ({ ...current, confirmPassword: value }))}
                onToggle={() => togglePasswordVisibility('confirmPassword')}
              />
            </div>
            <div className="technician-password-note">
              <AlertTriangle className="h-4 w-4" />
              Minimum 6 characters. Use a strong password.
            </div>
            <button className="btn btn-primary technician-settings-action" type="submit" disabled={passwordSaving || !passwordReady}>
              {passwordSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {passwordSaving ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </SettingsCard>

        <SettingsCard icon={Bell} title="Notification Preferences" description="Choose the operational alerts you want highlighted.">
          <form className="technician-notification-form" onSubmit={savePreferences}>
            {technicianNotificationOptions.map(([key, label, description]) => (
              <PremiumSwitch
                key={key}
                label={label}
                description={description}
                checked={preferences[key]}
                onChange={() => updatePreference(key)}
              />
            ))}
            <button className="btn btn-primary technician-settings-action" type="submit" disabled={!preferencesDirty || preferencesSaving}>
              {preferencesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {preferencesSaving ? 'Saving...' : 'Save Preferences'}
            </button>
          </form>
        </SettingsCard>
        </div>

        <aside className="technician-settings-side-column">
        <SettingsCard icon={Camera} title="Profile Photo" description="Your technician identity shown across the panel." className="technician-photo-card">
          <div className="technician-photo-panel">
            <div className="technician-photo-avatar">
              {avatarSrc ? <img src={avatarSrc} alt="Technician profile preview" /> : <span>{technicianInitial(user)}</span>}
            </div>
            <div className="technician-photo-copy">
              <h3>{displayName}</h3>
              <div>
                <span>Technician</span>
                <span>{username}</span>
              </div>
              <p>JPG, PNG, or WEBP up to 5 MB.</p>
            </div>
            <input ref={photoInputRef} type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={handlePhotoChange} />
            <div className="technician-photo-actions">
              <button className="btn btn-secondary technician-settings-action technician-change-photo-button" type="button" disabled={photoUploading} onClick={() => photoInputRef.current?.click()}>
                {photoUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                {photoUploading ? 'Working...' : 'Change Photo'}
              </button>
              <button className="btn btn-secondary technician-settings-action technician-remove-photo-button" type="button" disabled={!hasCustomPhoto || photoUploading} onClick={removeProfilePhoto}>
                <Trash2 className="h-4 w-4" />
                Remove Photo
              </button>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard icon={ShieldCheck} title="Account Status" description="Compact read-only account state." className="technician-status-card">
          <div className="technician-account-status-list">
            <AccountStatusRow label="Role" value="Technician" />
            <AccountStatusRow label="Username" value={user?.username} />
            <AccountStatusRow label="Status" value={accountStatus(user)} status />
          </div>
        </SettingsCard>

        <SettingsCard icon={Palette} title="Appearance / Theme" description="Local theme for this device." className="technician-theme-card">
          <ThemePreferenceButtons value={themePreference} onChange={updateThemePreference} />
          <p className="technician-theme-current">Current theme: {themeLabel}</p>
        </SettingsCard>
        </aside>
      </div>
    </div>
  );
}
