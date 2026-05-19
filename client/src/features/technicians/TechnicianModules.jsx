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
  useState,
  useToast,
  UserRound,
  Users,
  Wrench
} from '../../shared/phase1Shared.jsx';

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
  return `/tech/work-orders/${recordId(job)}`;
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

function technicianEmployeeId(user) {
  return settingsFallback(user?.employeeId || user?.employeeCode || user?.id || user?._id);
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

function SettingsCard({ icon: Icon, title, description, children, className = '' }) {
  return (
    <section className={`surface p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-card border border-white/10 bg-[var(--surface-2)] text-[var(--brand-2)]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-100">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-5 muted">{description}</p> : null}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function AccountDetailRow({ label, value }) {
  return (
    <div className="rounded-card border border-white/10 bg-white/[0.035] p-3">
      <p className="text-xs font-black uppercase tracking-wide muted">{label}</p>
      <p className="mt-1 break-words font-bold text-slate-100">{settingsFallback(value)}</p>
    </div>
  );
}

export function TechnicianSettingsPage() {
  const { request, user, setUser } = useAuth();
  const { push } = useToast();
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [passwordForm, setPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [preferences, setPreferences] = useState({
    newJobAssigned: true,
    partRequestApproved: true,
    paymentPending: true,
    amcVisitDue: true,
    workOrderStatusUpdated: true
  });
  const lastUpdatedTime = useMemo(
    () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    []
  );
  const employeeId = technicianEmployeeId(user);
  const displayName = settingsFallback(user?.name || user?.username);
  const username = settingsFallback(user?.username);

  useEffect(() => {
    setProfileForm({ name: user?.name || '', phone: user?.phone || '' });
  }, [user?.name, user?.phone]);

  function syncUser(result) {
    if (!result?.user) return;
    setUser(result.user);
    localStorage.setItem('us_user', JSON.stringify(result.user));
  }

  async function saveProfile(event) {
    event.preventDefault();
    try {
      const result = await request('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ name: profileForm.name, phone: profileForm.phone })
      });
      syncUser(result);
      push('Profile updated');
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function updatePassword(event) {
    event.preventDefault();
    if (!passwordForm.password || !passwordForm.confirmPassword) {
      push('New password and confirmation are required', 'error');
      return;
    }
    if (passwordForm.password !== passwordForm.confirmPassword) {
      push('New password and confirmation must match', 'error');
      return;
    }
    try {
      const result = await request('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ password: passwordForm.password })
      });
      syncUser(result);
      setPasswordForm({ password: '', confirmPassword: '' });
      push('Password updated');
    } catch (err) {
      push(err.message, 'error');
    }
  }

  function updatePreference(key) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  }

  function savePreferences(event) {
    event.preventDefault();
    push('Notification preferences saved locally');
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <PageHeader
        title="Settings"
        eyebrow="TECHNICIAN"
        action={(
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-bold muted">
            <CalendarClock className="h-4 w-4 text-[var(--brand-2)]" />
            Last updated: Today, {lastUpdatedTime}
          </div>
        )}
      >
        Manage your profile, security settings, and account preferences.
      </PageHeader>

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <SettingsCard icon={UserRound} title="Profile Information" description="Keep your technician contact details current.">
          <form className="grid gap-4" onSubmit={saveProfile}>
            <label>
              <span className="label">Full Name</span>
              <input
                className="input"
                value={profileForm.name}
                onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label>
              <span className="label">Phone Number</span>
              <input
                className="input"
                value={profileForm.phone}
                onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </label>
            <button className="btn btn-primary justify-center" type="submit">
              <Save className="h-4 w-4" />
              Save Profile
            </button>
          </form>
        </SettingsCard>

        <SettingsCard icon={KeyRound} title="Change Password" description="Update your account password securely.">
          <form className="grid gap-4" onSubmit={updatePassword}>
            <label>
              <span className="label">New Password</span>
              <input
                className="input"
                type="password"
                value={passwordForm.password}
                onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))}
              />
            </label>
            <label>
              <span className="label">Confirm New Password</span>
              <input
                className="input"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))}
              />
            </label>
            <button className="btn btn-primary justify-center" type="submit">
              <KeyRound className="h-4 w-4" />
              Update Password
            </button>
          </form>
        </SettingsCard>

        <SettingsCard icon={FileText} title="Profile Photo" description="Your technician identity shown across the panel.">
          <div className="grid justify-items-center gap-4 text-center">
            <div className="grid h-24 w-24 place-items-center rounded-full border border-sky-400/30 bg-sky-500/15 text-3xl font-black text-sky-100 shadow-[0_16px_50px_rgba(14,165,233,0.16)]">
              {technicianInitial(user)}
            </div>
            <div>
              <p className="text-lg font-black text-slate-100">{displayName}</p>
              <div className="mt-2 flex flex-wrap justify-center gap-2">
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-emerald-200">
                  Technician
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1 text-xs font-bold muted">
                  {username !== 'Not available' ? username : employeeId}
                </span>
              </div>
            </div>
            <button className="btn btn-secondary justify-center" type="button" onClick={() => push('Profile photo upload is not available yet')}>
              <UserRound className="h-4 w-4" />
              Change Photo
            </button>
          </div>
        </SettingsCard>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <SettingsCard icon={ShieldCheck} title="Account Details" description="Read-only technician account information.">
          <div className="grid gap-3 sm:grid-cols-2">
            <AccountDetailRow label="Employee ID" value={employeeId} />
            <AccountDetailRow label="Branch / Location" value={user?.branch || user?.location} />
            <AccountDetailRow label="Role" value="Technician" />
            <AccountDetailRow label="Username" value={user?.username} />
            <AccountDetailRow label="Phone" value={user?.phone} />
            <AccountDetailRow label="Account Status" value={accountStatus(user)} />
            <AccountDetailRow label="Last Login" value={user?.lastLogin ? formatDate(user.lastLogin) : ''} />
          </div>
        </SettingsCard>

        <SettingsCard icon={Bell} title="Notification Preferences" description="Choose the operational alerts you want highlighted.">
          <form className="grid gap-3" onSubmit={savePreferences}>
            {[
              ['newJobAssigned', 'New job assigned'],
              ['partRequestApproved', 'Part request approved'],
              ['paymentPending', 'Payment pending'],
              ['amcVisitDue', 'AMC visit due'],
              ['workOrderStatusUpdated', 'Work order status updated']
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between gap-3 rounded-card border border-white/10 bg-white/[0.035] px-3 py-3">
                <span className="text-sm font-bold text-slate-100">{label}</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--brand)]"
                  checked={preferences[key]}
                  onChange={() => updatePreference(key)}
                />
              </label>
            ))}
            <button className="btn btn-primary mt-2 justify-center" type="submit">
              <Save className="h-4 w-4" />
              Save Preferences
            </button>
          </form>
        </SettingsCard>
      </div>
    </div>
  );
}
