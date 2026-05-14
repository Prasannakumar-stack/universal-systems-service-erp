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

function defaultAmcForm() {
  const start = new Date();
  const end = new Date();
  end.setFullYear(end.getFullYear() + 1);
  return {
    customerId: '',
    customerName: '',
    phone: '',
    address: '',
    contractType: 'Basic AMC',
    coveredDevices: '',
    serviceFrequency: 'Quarterly',
    startDate: dateInputValue(start),
    endDate: dateInputValue(end),
    contractValue: '',
    includedVisits: '4',
    notes: ''
  };
}

export function AMCContractsPage() {
  const { request } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(defaultAmcForm);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const { data, loading, error, reload } = useResource(() => request('/amc/contracts'), [request]);

  useEffect(() => {
    request('/customers?limit=100').then((result) => setCustomers(result.customers || [])).catch(() => setCustomers([]));
  }, [request]);

  const contracts = data?.contracts || [];
  const summary = data?.summary || {};
  const visibleContracts = contracts.filter((contract) => {
    const text = `${contract.contractId} ${contract.customerName} ${contract.phone} ${contract.contractType} ${contract.coveredService}`.toLowerCase();
    return !search || text.includes(search.toLowerCase());
  });

  function selectCustomer(customerId) {
    const customer = customers.find((item) => recordId(item) === customerId);
    setForm((current) => ({
      ...current,
      customerId,
      customerName: customer?.name || current.customerName,
      phone: customer?.phone || current.phone,
      address: customer?.address || current.address
    }));
  }

  async function submit(event) {
    event.preventDefault();
    try {
      await request('/amc/contracts', { method: 'POST', body: JSON.stringify(form) });
      push('AMC contract created');
      setForm(defaultAmcForm());
      setFormOpen(false);
      reload();
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function createJob(contract) {
    try {
      const result = await request(`/amc/contracts/${recordId(contract)}/work-orders`, {
        method: 'POST',
        body: JSON.stringify({ issue: `AMC service visit for ${contract.contractType}` })
      });
      push('Repair & Service Job created from AMC');
      navigate(`/admin/work-orders/${recordId(result.workOrder)}`);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <PageHeader
        title="AMC Contracts"
        eyebrow="AMC & Contracts"
        action={<button className="btn btn-primary" onClick={() => setFormOpen((value) => !value)}><Plus className="h-4 w-4" />New AMC Contract</button>}
      >
        Manage service contracts, covered assets, renewal status, visits, and AMC-linked repair jobs.
      </PageHeader>

      <div className="surface mb-5 p-3">
        <div className="tabs-list">
          <Link className="tab-button tab-button-active" to="/admin/amc-contracts">Contracts</Link>
          <Link className="tab-button" to="/admin/amc-schedule">Schedule</Link>
          <Link className="tab-button" to="/admin/amc-renewals">Renewals</Link>
          <Link className="tab-button" to="/admin/warranties">Warranties</Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={FileText} label="Active AMC Contracts" value={summary.activeContracts || 0} tone="green" />
        <StatCard icon={AlertTriangle} label="Renewals Due" value={summary.renewalDue || 0} tone="yellow" />
        <StatCard icon={CalendarClock} label="Visits This Week" value={summary.visitsThisWeek || 0} />
        <StatCard icon={AlertTriangle} label="Expired Contracts" value={summary.expiredContracts || 0} tone="red" />
      </div>

      {formOpen ? (
        <form className="surface mt-6 p-5" onSubmit={submit}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-black">Create AMC Contract</h2>
            <button type="button" className="icon-button" onClick={() => setFormOpen(false)} aria-label="Close AMC form"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label>
              <span className="label">Existing customer</span>
              <select className="input" value={form.customerId} onChange={(event) => selectCustomer(event.target.value)}>
                <option value="">Manual / new customer</option>
                {customers.map((customer) => <option key={recordId(customer)} value={recordId(customer)}>{customer.name} - {customer.phone}</option>)}
              </select>
            </label>
            <label>
              <span className="label">Customer</span>
              <input className="input" value={form.customerName} onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} required />
            </label>
            <label>
              <span className="label">Phone</span>
              <input className="input" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} required />
            </label>
            <label className="md:col-span-3">
              <span className="label">Address</span>
              <input className="input" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
            </label>
            <label>
              <span className="label">Contract Type</span>
              <select className="input" value={form.contractType} onChange={(event) => setForm((current) => ({ ...current, contractType: event.target.value }))}>
                {amcContractTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label>
              <span className="label">Service Frequency</span>
              <select className="input" value={form.serviceFrequency} onChange={(event) => setForm((current) => ({ ...current, serviceFrequency: event.target.value }))}>
                {amcFrequencies.map((frequency) => <option key={frequency}>{frequency}</option>)}
              </select>
            </label>
            <label>
              <span className="label">Included Visits</span>
              <input className="input" type="number" min="0" value={form.includedVisits} onChange={(event) => setForm((current) => ({ ...current, includedVisits: event.target.value }))} />
            </label>
            <label>
              <span className="label">Start Date</span>
              <input className="input" type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} required />
            </label>
            <label>
              <span className="label">End Date</span>
              <input className="input" type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} required />
            </label>
            <label>
              <span className="label">Contract Value</span>
              <input className="input" type="number" min="0" value={form.contractValue} onChange={(event) => setForm((current) => ({ ...current, contractValue: event.target.value }))} />
            </label>
            <label className="md:col-span-3">
              <span className="label">Covered Devices / Assets</span>
              <textarea className="input min-h-24" value={form.coveredDevices} onChange={(event) => setForm((current) => ({ ...current, coveredDevices: event.target.value }))} placeholder="Example: office laptops, printer, CCTV DVR, network rack" />
            </label>
            <label className="md:col-span-3">
              <span className="label">Notes</span>
              <textarea className="input min-h-24" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
            </label>
          </div>
          <div className="mt-5 flex justify-end">
            <button className="btn btn-primary"><Save className="h-4 w-4" />Save AMC Contract</button>
          </div>
        </form>
      ) : null}

      <div className="surface mt-6 p-5">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto_auto] md:items-center">
          <SearchBox value={search} onChange={setSearch} placeholder="Search contract, customer, phone, service" />
          <Link className="btn btn-secondary" to="/admin/amc-schedule"><CalendarClock className="h-4 w-4" />Schedule</Link>
          <Link className="btn btn-secondary" to="/admin/amc-renewals"><AlertTriangle className="h-4 w-4" />Renewals</Link>
        </div>
        {!visibleContracts.length ? (
          <EmptyState title="No AMC contracts yet" message="Create the first AMC contract to track visits and renewal reminders." action={<button className="btn btn-primary" onClick={() => setFormOpen(true)}>Create AMC Contract</button>} />
        ) : (
          <Table>
            <thead><tr><th>Contract ID</th><th>Customer</th><th>Plan / Coverage</th><th>Period</th><th>Value</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {visibleContracts.map((contract) => (
                <tr key={recordId(contract)}>
                  <td className="font-bold">{contract.contractId}</td>
                  <td>
                    <span className="block font-semibold text-slate-100">{contract.customerName || '-'}</span>
                    <span className="mt-1 block text-xs muted">Phone: {contract.phone || '-'}</span>
                  </td>
                  <td>
                    <span className="block font-semibold text-slate-100">{contract.contractType || '-'}</span>
                    <span className="mt-1 block text-xs muted">{contract.coveredService || '-'}</span>
                  </td>
                  <td className="whitespace-nowrap">{formatDate(contract.startDate)} to {formatDate(contract.endDate)}</td>
                  <td>{currency(contract.contractValue)}</td>
                  <td><AmcStatusBadge status={contract.status} /></td>
                  <td>
                    <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                      <Link className="btn btn-secondary py-2" to="/admin/amc-schedule">Schedule</Link>
                      <button className="btn btn-primary py-2" onClick={() => createJob(contract)}>Create Job</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}
