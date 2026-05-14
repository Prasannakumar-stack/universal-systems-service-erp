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

export function CustomersPage() {
  const { request } = useAuth();
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customerType, setCustomerType] = useState('');
  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    return params.toString() ? `?${params}` : '';
  }, [dateFrom, dateTo]);
  const { data, loading, error } = useResource(async () => {
    const [customers, workOrders, invoices] = await Promise.all([
      request(`/customers${query}`),
      request('/work-orders'),
      request('/invoices')
    ]);
    return {
      customers: customers.customers || [],
      workOrders: workOrders.workOrders || [],
      invoices: invoices.invoices || []
    };
  }, [request, query]);

  const customers = data?.customers || [];
  const workOrders = data?.workOrders || [];
  const invoices = data?.invoices || [];
  const metricsByCustomer = useMemo(() => {
    const map = new Map();
    customers.forEach((customer) => {
      map.set(recordId(customer), { jobs: [], invoices: [] });
    });
    workOrders.forEach((order) => {
      const customerId = recordId(order.customerId);
      if (!customerId) return;
      if (!map.has(customerId)) map.set(customerId, { jobs: [], invoices: [] });
      map.get(customerId).jobs.push(order);
    });
    invoices.forEach((invoice) => {
      const customerId = recordId(invoice.customerId);
      if (!customerId) return;
      if (!map.has(customerId)) map.set(customerId, { jobs: [], invoices: [] });
      map.get(customerId).invoices.push(invoice);
    });
    return map;
  }, [customers, workOrders, invoices]);

  const hasCustomerTypes = customers.some((customer) => customerTypeLabel(customer));
  const visibleCustomers = customers.filter((customer) => {
    const metrics = metricsByCustomer.get(recordId(customer)) || { jobs: [], invoices: [] };
    if (customerType && customerTypeLabel(customer) !== customerType) return false;
    const searchText = search.trim().toLowerCase();
    if (!searchText) return true;
    const haystack = [
      customer.name,
      customer.phone,
      customer.address,
      customer.devices?.join(' '),
      customerTypeLabel(customer),
      ...metrics.jobs.map((order) => `${bookingLabel(order)} ${order.device || ''} ${order.issue || ''} ${order.status || ''}`),
      ...metrics.invoices.map((invoice) => `${invoice.invoiceNumber || ''} ${invoice.status || ''}`)
    ].join(' ').toLowerCase();
    return haystack.includes(searchText);
  });

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <>
      <PageHeader title="Customers" eyebrow="CRM">Manage customer profiles, service history, devices, invoices, and payments.</PageHeader>
      <div className="surface mb-5 grid gap-3 p-4 xl:grid-cols-[1fr_190px_160px_160px]">
        <SearchBox value={search} onChange={setSearch} placeholder="Search customer name, phone, device, invoice, booking" />
        <select className="input" value={customerType} onChange={(event) => setCustomerType(event.target.value)} disabled={!hasCustomerTypes}>
          <option value="">{hasCustomerTypes ? 'All customer types' : 'Customer type unavailable'}</option>
          {['Individual', 'Business', 'AMC Customer'].map((item) => <option key={item}>{item}</option>)}
        </select>
        <input className="input" type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        <input className="input" type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
      </div>
      {!visibleCustomers.length ? <EmptyState title="No customers found" message="Customer records matching your filters will appear here." action={<Link className="btn btn-primary" to="/admin/bookings">Create Booking</Link>} /> : (
        <Table>
          <thead><tr><th>Customer Name</th><th>Phone</th><th>Devices / Services</th><th>Active Jobs</th><th>Pending Balance</th><th>Total Spent</th><th>Created Date</th><th>Action</th></tr></thead>
          <tbody className="divide-y divide-[var(--line)]">
            {visibleCustomers.map((customer) => {
              const metrics = metricsByCustomer.get(recordId(customer)) || { jobs: [], invoices: [] };
              const activeJobs = metrics.jobs.filter(isActiveJob);
              const pendingBalance = metrics.invoices.reduce((sum, invoice) => sum + Number(invoice.balance || 0), 0);
              const totalSpent = metrics.invoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount || 0), 0);
              const devices = [...new Set([...(customer.devices || []), ...metrics.jobs.map((order) => order.device).filter(Boolean)])];
              return (
                <tr key={customer.id}>
                  <td className="font-bold">
                    <Link className="text-sky-100 hover:text-[var(--brand)]" to={`/admin/customers/${customer.id}`}>{customer.name}</Link>
                    <span className="mt-1 block text-xs muted">{customerTypeLabel(customer) || customerCode(customer)}</span>
                  </td>
                  <td>{customer.phone || '-'}</td>
                  <td>{devices.length ? <div className="flex max-w-md flex-wrap gap-1.5">{devices.slice(0, 3).map((device) => <span key={device} className="status-badge">{device}</span>)}{devices.length > 3 ? <span className="status-badge">+{devices.length - 3}</span> : null}</div> : '-'}</td>
                  <td><StatusBadge status={activeJobs.length ? `${activeJobs.length} Active` : 'No Active Jobs'} /></td>
                  <td className={pendingBalance > 0 ? 'font-black text-amber-100' : 'muted'}>{currency(pendingBalance)}</td>
                  <td className="font-bold">{currency(totalSpent)}</td>
                  <td>{formatDate(customer.createdAt)}</td>
                  <td><Link className="btn btn-secondary py-2" to={`/admin/customers/${customer.id}`}>View 360 Profile</Link></td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </>
  );
}
