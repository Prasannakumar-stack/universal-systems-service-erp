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

export function ReportsAnalyticsPage({ section = 'main' }) {
  const { request } = useAuth();
  const [range, setRange] = useState('This Month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const loadReports = useCallback(async () => {
    const [bookings, workOrders, invoices, payments, inventory, movements, customers, amcContracts, amcSchedule, users] = await Promise.all([
      request('/bookings').catch(() => ({ bookings: [] })),
      request('/work-orders').catch(() => ({ workOrders: [] })),
      request('/invoices').catch(() => ({ invoices: [] })),
      request('/payments').catch(() => ({ payments: [] })),
      request('/inventory').catch(() => ({ parts: [] })),
      request('/stock-movements').catch(() => ({ movements: [] })),
      request('/customers').catch(() => ({ customers: [] })),
      request('/amc/contracts').catch(() => ({ contracts: [], summary: {} })),
      request('/amc/schedule').catch(() => ({ schedule: [] })),
      request('/users').catch(() => ({ users: [] }))
    ]);
    return {
      bookings: bookings.bookings || [],
      workOrders: workOrders.workOrders || [],
      invoices: invoices.invoices || [],
      payments: payments.payments || [],
      parts: inventory.parts || [],
      movements: movements.movements || [],
      customers: customers.customers || [],
      amcContracts: amcContracts.contracts || [],
      amcSummary: amcContracts.summary || {},
      amcSchedule: amcSchedule.schedule || [],
      users: users.users || []
    };
  }, [request]);
  const { data, loading, error } = useResource(loadReports, [loadReports]);

  const bounds = useMemo(() => reportRangeBounds(range, customFrom, customTo), [range, customFrom, customTo]);

  const report = useMemo(() => {
    const raw = data || {};
    const bookings = filterByRange(raw.bookings || [], bounds);
    const workOrders = filterByRange(raw.workOrders || [], bounds);
    const invoices = filterByRange(raw.invoices || [], bounds);
    const payments = filterByRange(raw.payments || [], bounds);
    const movements = filterByRange(raw.movements || [], bounds);
    const customers = filterByRange(raw.customers || [], bounds);
    const amcContracts = (raw.amcContracts || []).filter((contract) => dateInRange(contract.createdAt || contract.startDate || contract.endDate, bounds));
    const amcSchedule = (raw.amcSchedule || []).filter((visit) => dateInRange(visit.scheduledDate || visit.createdAt, bounds));
    const allWorkOrders = raw.workOrders || [];
    const allInvoices = raw.invoices || [];
    const allPayments = raw.payments || [];
    const allCustomers = raw.customers || [];
    const allContracts = raw.amcContracts || [];
    const allSchedule = raw.amcSchedule || [];
    const parts = raw.parts || [];

    const completedJobs = workOrders.filter((job) => ['Completed', 'Delivered'].includes(job.status));
    const activeJobs = allWorkOrders.filter((job) => ['Pending', 'In Progress', 'Awaiting Parts'].includes(job.status));
    const lowStockItems = parts.filter((part) => inventoryStockStatus(part) === 'low');
    const outOfStockItems = parts.filter((part) => inventoryStockStatus(part) === 'out');
    const paidAmount = payments.reduce((sum, payment) => sum + Number(payment.paidAmount || payment.amount || 0), 0);
    const totalInvoiceValue = invoices.reduce((sum, invoice) => sum + Number(invoice.total || invoice.totalAmount || 0), 0);
    const pendingBalance = invoices.reduce((sum, invoice) => sum + invoiceDueAmount(invoice), 0);
    const activeAmc = allContracts.filter((contract) => contract.status === 'Active').length;
    const amcRenewalsDue = allContracts.filter((contract) => contract.renewalStatus === 'Renewal Due').length;

    const serviceTypeRows = Object.entries(workOrders.reduce((map, job) => {
      const key = serviceTypeBucket(job);
      map[key] = (map[key] || 0) + 1;
      return map;
    }, {})).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

    const technicianRows = (raw.users || []).filter((user) => user.role === 'technician').map((tech) => {
      const jobs = allWorkOrders.filter((job) => recordId(job.technicianId) === recordId(tech));
      const completed = jobs.filter((job) => ['Completed', 'Delivered'].includes(job.status));
      const inProgress = jobs.filter((job) => job.status === 'In Progress');
      const awaitingParts = jobs.filter((job) => job.status === 'Awaiting Parts');
      const pending = jobs.filter((job) => job.status === 'Pending');
      const partsValue = jobs.reduce((sum, job) => sum + (job.partsUsed || []).reduce((partSum, part) => partSum + Number(part.total || 0), 0), 0);
      const notesCount = jobs.reduce((sum, job) => sum + (job.notes || []).length, 0);
      const returned = jobs.filter((job) => job.status === 'Returned').length;
      return {
        technician: tech,
        assigned: jobs.length,
        completed: completed.length,
        inProgress: inProgress.length,
        awaitingParts: awaitingParts.length,
        pending: pending.length,
        completionRate: percentage(completed.length, jobs.length),
        averageCompletion: averageHours(completed),
        partsValue,
        notesCount,
        returned,
        lastActivity: latestDate(jobs, ['updatedAt', 'completedAt', 'createdAt'])
      };
    });

    const revenueByMonth = Object.values(allPayments.reduce((map, payment) => {
      const key = monthKey(payment.createdAt);
      if (!map[key]) map[key] = { month: key, revenue: 0 };
      map[key].revenue += Number(payment.paidAmount || payment.amount || 0);
      return map;
    }, {})).slice(-12);

    const paymentMethodRows = Object.entries(payments.reduce((map, payment) => {
      const method = payment.method || 'Other';
      map[method] = (map[method] || 0) + Number(payment.paidAmount || payment.amount || 0);
      return map;
    }, {})).map(([method, total]) => ({ method, total })).sort((a, b) => b.total - a.total);

    const pendingByCustomer = Object.values(invoices.reduce((map, invoice) => {
      const id = recordId(invoice.customerId) || invoice.customerId?.phone || invoice.customerId?.name || 'unknown';
      if (!map[id]) map[id] = { customer: invoice.customerId?.name || 'Customer', phone: invoice.customerId?.phone || '', balance: 0 };
      map[id].balance += invoiceDueAmount(invoice);
      return map;
    }, {})).filter((row) => row.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 12);

    const usedByPart = movements.filter((movement) => movement.type === 'USED').reduce((map, movement) => {
      const id = recordId(movement.partId);
      map[id] = (map[id] || 0) + Math.abs(Number(movement.quantity || 0));
      return map;
    }, {});

    const inventoryRows = parts.map((part) => ({
      ...part,
      usedQuantity: usedByPart[recordId(part)] || 0,
      stockValue: Number(part.onHand || 0) * Number(part.costPrice || part.sellingPrice || 0),
      stockStatus: inventoryStockStatus(part)
    })).sort((a, b) => b.usedQuantity - a.usedQuantity || String(a.partName || '').localeCompare(String(b.partName || '')));

    const customerRows = allCustomers.map((customer) => {
      const customerJobs = allWorkOrders.filter((job) => recordId(job.customerId) === recordId(customer));
      const customerInvoices = allInvoices.filter((invoice) => recordId(invoice.customerId) === recordId(customer));
      const totalSpent = customerInvoices.reduce((sum, invoice) => sum + Number(invoice.paidAmount || invoice.paid || 0), 0);
      const pending = customerInvoices.reduce((sum, invoice) => sum + invoiceDueAmount(invoice), 0);
      const activeAmcContracts = allContracts.filter((contract) => recordId(contract.customerId) === recordId(customer) && contract.status === 'Active').length;
      return {
        customer,
        totalJobs: customerJobs.length,
        totalSpent,
        pendingBalance: pending,
        activeAmc: activeAmcContracts,
        lastServiceDate: latestDate(customerJobs, ['completedAt', 'updatedAt', 'createdAt'])
      };
    }).sort((a, b) => b.totalSpent - a.totalSpent || b.totalJobs - a.totalJobs);

    return {
      raw,
      bookings,
      workOrders,
      invoices,
      payments,
      movements,
      amcContracts,
      amcSchedule,
      parts,
      summary: {
        totalRevenue: paidAmount,
        pendingPayments: pendingBalance,
        completedJobs: completedJobs.length,
        activeRepairJobs: activeJobs.length,
        lowStockItems: lowStockItems.length,
        activeAmcContracts: activeAmc,
        amcRenewalsDue,
        totalCustomers: allCustomers.length
      },
      operations: {
        totalBookings: bookings.length,
        totalJobs: workOrders.length,
        pending: workOrders.filter((job) => job.status === 'Pending').length,
        inProgress: workOrders.filter((job) => job.status === 'In Progress').length,
        awaitingParts: workOrders.filter((job) => job.status === 'Awaiting Parts').length,
        completed: workOrders.filter((job) => job.status === 'Completed').length,
        delivered: workOrders.filter((job) => job.status === 'Delivered').length,
        returned: workOrders.filter((job) => job.status === 'Returned').length,
        averageCompletion: averageHours(workOrders),
        serviceTypeRows
      },
      technicians: technicianRows,
      finance: {
        totalInvoiceValue,
        totalCollected: paidAmount,
        pendingBalance,
        partialPayments: invoices.filter((invoice) => invoice.status === 'Partial').length,
        paidInvoices: invoices.filter((invoice) => invoice.status === 'Paid').length,
        pendingInvoices: invoices.filter((invoice) => invoice.status === 'Pending').length,
        todayCollection: allPayments.filter((payment) => isToday(payment.createdAt)).reduce((sum, payment) => sum + Number(payment.paidAmount || payment.amount || 0), 0),
        monthlyRevenue: allPayments.filter((payment) => {
          const date = new Date(payment.createdAt);
          const now = new Date();
          return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
        }).reduce((sum, payment) => sum + Number(payment.paidAmount || payment.amount || 0), 0),
        revenueByMonth,
        paymentMethodRows,
        pendingByCustomer
      },
      inventory: {
        rows: inventoryRows,
        totalParts: parts.length,
        stockValue: inventoryRows.reduce((sum, row) => sum + row.stockValue, 0),
        lowStock: lowStockItems.length,
        outOfStock: outOfStockItems.length,
        usedQuantity: movements.filter((movement) => movement.type === 'USED').reduce((sum, movement) => sum + Math.abs(Number(movement.quantity || 0)), 0),
        added: movements.filter((movement) => movement.type === 'ADD').reduce((sum, movement) => sum + Number(movement.quantity || 0), 0),
        returned: movements.filter((movement) => movement.type === 'RETURN').reduce((sum, movement) => sum + Number(movement.quantity || 0), 0),
        adjusted: movements.filter((movement) => movement.type === 'ADJUST').reduce((sum, movement) => sum + Number(movement.quantity || 0), 0),
        deadStock: inventoryRows.filter((row) => !row.usedQuantity).length
      },
      amc: {
        contracts: allContracts,
        active: allContracts.filter((contract) => contract.status === 'Active').length,
        expiringSoon: allContracts.filter((contract) => contract.renewalStatus === 'Renewal Due').length,
        expired: allContracts.filter((contract) => contract.renewalStatus === 'Expired').length,
        visitsThisMonth: allSchedule.filter((visit) => {
          const date = new Date(visit.scheduledDate);
          const now = new Date();
          return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
        }).length,
        completedVisits: allSchedule.filter((visit) => visit.status === 'Completed').length,
        overdueVisits: allSchedule.filter((visit) => visit.status === 'Overdue').length,
        contractValue: allContracts.reduce((sum, contract) => sum + Number(contract.contractValue || 0), 0),
        renewalDueAmount: allContracts.filter((contract) => ['Renewal Due', 'Expired'].includes(contract.renewalStatus)).reduce((sum, contract) => sum + Number(contract.contractValue || 0), 0)
      },
      customers: {
        rows: customerRows,
        newThisMonth: allCustomers.filter((customer) => {
          const date = new Date(customer.createdAt);
          const now = new Date();
          return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
        }).length,
        repeatCustomers: customerRows.filter((row) => row.totalJobs > 1).length,
        withPendingBalance: customerRows.filter((row) => row.pendingBalance > 0).length,
        withActiveAmc: customerRows.filter((row) => row.activeAmc > 0).length
      }
    };
  }, [data, bounds]);

  const activeSection = normalizeReportSection(section);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [activeSection]);

  function exportCurrentSection() {
    if (!report) return;
    if (activeSection === 'main') {
      downloadCsv('business-report.csv', ['Metric', 'Value'], [
        ['Total revenue', report.summary.totalRevenue],
        ['Pending payments', report.summary.pendingPayments],
        ['Completed jobs', report.summary.completedJobs],
        ['Active repair jobs', report.summary.activeRepairJobs],
        ['Low stock items', report.summary.lowStockItems],
        ['Active AMC contracts', report.summary.activeAmcContracts],
        ['AMC renewals due', report.summary.amcRenewalsDue],
        ['Total customers', report.summary.totalCustomers],
        ['Total bookings', report.operations.totalBookings],
        ['Total service jobs', report.operations.totalJobs],
        ['Average completion', report.operations.averageCompletion],
        ...report.operations.serviceTypeRows.map((row) => [`Jobs - ${row.name}`, row.count])
      ]);
      return;
    }
    if (activeSection === 'technicians') {
      downloadCsv('technician-report.csv', ['Technician', 'Assigned', 'Completed', 'In Progress', 'Awaiting Parts', 'Completion Rate', 'Last Activity'], report.technicians.map((row) => [row.technician.name, row.assigned, row.completed, row.inProgress, row.awaitingParts, row.completionRate, row.lastActivity]));
      return;
    }
    if (activeSection === 'finance') {
      downloadCsv('finance-report.csv', ['Metric', 'Value'], [
        ['Total invoice value', report.finance.totalInvoiceValue],
        ['Total collected', report.finance.totalCollected],
        ['Pending balance', report.finance.pendingBalance],
        ['Partial payments', report.finance.partialPayments],
        ['Paid invoices', report.finance.paidInvoices],
        ['Pending invoices', report.finance.pendingInvoices],
        ["Today's collection", report.finance.todayCollection],
        ['Monthly revenue', report.finance.monthlyRevenue],
        ...report.finance.paymentMethodRows.map((row) => [`Collection - ${row.method}`, row.total]),
        ...report.finance.pendingByCustomer.map((row) => [`Pending - ${row.customer}`, row.balance])
      ]);
      return;
    }
    if (activeSection === 'inventory') {
      downloadCsv('inventory-report.csv', ['Part', 'Category', 'On Hand', 'Reserved', 'Available', 'Used Quantity', 'Stock Value', 'Status'], report.inventory.rows.map((row) => [row.partName, row.category, row.onHand, row.reserved, row.available, row.usedQuantity, row.stockValue, row.stockStatus]));
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div className="reports-page">
      <PageHeader title="Reports & Analytics" eyebrow="Business Intelligence">
        Track service performance, revenue, stock, technicians, payments, and AMC renewals.
      </PageHeader>
      <ReportsNavigation active={activeSection} />
      <ReportsRangeBar range={range} setRange={setRange} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} onExport={exportCurrentSection} />

      {activeSection === 'main' ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SmartMetricCard icon={CreditCard} label="Total Revenue" value={currency(report.summary.totalRevenue)} tone="green" to="/admin/reports/finance" />
          <SmartMetricCard icon={AlertTriangle} label="Pending Payments" value={currency(report.summary.pendingPayments)} tone="yellow" to="/admin/reports/finance" />
          <SmartMetricCard icon={CheckCircle2} label="Completed Jobs" value={report.summary.completedJobs} tone="green" to="/admin/work-orders?status=Completed" />
          <SmartMetricCard icon={Wrench} label="Active Repair Jobs" value={report.summary.activeRepairJobs} tone="blue" to="/admin/work-orders" />
          <SmartMetricCard icon={AlertTriangle} label="Low Stock Items" value={report.summary.lowStockItems} tone="red" to="/admin/reports/inventory" />
          <SmartMetricCard icon={FileText} label="Active AMC Contracts" value={report.summary.activeAmcContracts} tone="green" to="/admin/amc-contracts" />
          <SmartMetricCard icon={Bell} label="AMC Renewals Due" value={report.summary.amcRenewalsDue} tone="yellow" to="/admin/amc-renewals" />
          <SmartMetricCard icon={Users} label="Total Customers" value={report.summary.totalCustomers} tone="blue" to="/admin/customers" />
        </div>
      ) : null}

      {activeSection === 'main' ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
          <div className="surface p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Operations Summary</h2>
              <Link className="btn btn-secondary py-2" to="/admin/work-orders">Open Jobs</Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <StatCard icon={BookOpenCheck} label="Total Bookings" value={report.operations.totalBookings} />
              <StatCard icon={Wrench} label="Total Service Jobs" value={report.operations.totalJobs} />
              <StatCard icon={CalendarClock} label="Pending Jobs" value={report.operations.pending} tone="yellow" />
              <StatCard icon={Wrench} label="In Progress Jobs" value={report.operations.inProgress} />
              <StatCard icon={PackagePlus} label="Awaiting Parts" value={report.operations.awaitingParts} tone="yellow" />
              <StatCard icon={CheckCircle2} label="Completed Jobs" value={report.operations.completed} tone="green" />
              <StatCard icon={CheckCircle2} label="Delivered Jobs" value={report.operations.delivered} tone="green" />
              <StatCard icon={AlertTriangle} label="Returned Jobs" value={report.operations.returned} tone="red" />
            </div>
            <p className="mt-4 rounded-card bg-[var(--surface-2)] p-3 text-sm font-bold">Average completion time: {report.operations.averageCompletion}</p>
          </div>
          <div className="surface p-5">
            <h2 className="text-xl font-black">Jobs by Service Type</h2>
            <div className="mt-4 grid gap-3">
              {report.operations.serviceTypeRows.length ? report.operations.serviceTypeRows.map((row) => <ReportBar key={row.name} label={row.name} value={row.count} total={report.operations.totalJobs} />) : <EmptyState title="No report data for this period." message="Try changing the date range." />}
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === 'technicians' ? (
        <div className="surface mt-6 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">Technician Performance Report</h2>
            <Link className="btn btn-secondary py-2" to="/admin/work-orders?view=technicians">Technician Jobs</Link>
          </div>
          {!report.technicians.length ? <EmptyState title="No technician data" message="Technician reports will appear after jobs are assigned." /> : (
            <Table>
              <thead><tr><th>Technician</th><th>Assigned</th><th>Completed</th><th>In Progress</th><th>Awaiting Parts</th><th>Completion Rate</th><th>Last Activity</th><th>Action</th></tr></thead>
              <tbody>
                {report.technicians.map((row) => (
                  <tr key={recordId(row.technician)}>
                    <td className="font-bold">{row.technician.name}<span className="block text-xs muted">{row.notesCount} notes - {currency(row.partsValue)} parts</span></td>
                    <td>{row.assigned}</td>
                    <td>{row.completed}</td>
                    <td>{row.inProgress}</td>
                    <td>{row.awaitingParts}</td>
                    <td>{row.completionRate}<span className="block text-xs muted">Avg {row.averageCompletion}</span></td>
                    <td>{row.lastActivity ? formatDate(row.lastActivity) : '-'}</td>
                    <td><Link className="btn btn-secondary py-2" to={`/admin/work-orders?technicianId=${recordId(row.technician)}`}>View Jobs</Link></td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      ) : null}

      {activeSection === 'finance' ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_.9fr]">
          <div className="surface p-5">
            <h2 className="text-xl font-black">Finance Report</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <StatCard icon={ReceiptText} label="Total Invoice Value" value={currency(report.finance.totalInvoiceValue)} />
              <StatCard icon={CreditCard} label="Total Collected" value={currency(report.finance.totalCollected)} tone="green" />
              <StatCard icon={AlertTriangle} label="Pending Balance" value={currency(report.finance.pendingBalance)} tone="red" />
              <StatCard icon={ReceiptText} label="Partial Payments" value={report.finance.partialPayments} tone="yellow" />
              <StatCard icon={CheckCircle2} label="Paid Invoices" value={report.finance.paidInvoices} tone="green" />
              <StatCard icon={AlertTriangle} label="Pending Invoices" value={report.finance.pendingInvoices} tone="yellow" />
              <StatCard icon={CreditCard} label="Today's Collection" value={currency(report.finance.todayCollection)} />
              <StatCard icon={CreditCard} label="Monthly Revenue" value={currency(report.finance.monthlyRevenue)} tone="green" />
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-2">
              <DashboardChart title="Revenue by Month">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={report.finance.revenueByMonth}>
                    <CartesianGrid stroke="rgba(117,196,255,0.12)" vertical={false} />
                    <XAxis dataKey="month" stroke="#aebfd7" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#aebfd7" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => currency(value)} contentStyle={{ background: '#071426', border: '1px solid rgba(117,196,255,0.25)', borderRadius: 8 }} />
                    <Bar dataKey="revenue" fill="#22c55e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </DashboardChart>
              <div className="surface p-5">
                <h3 className="text-lg font-black">Collection by Payment Method</h3>
                <div className="mt-4 grid gap-3">
                  {report.finance.paymentMethodRows.length ? report.finance.paymentMethodRows.map((row) => <ReportBar key={row.method} label={row.method} value={row.total} displayValue={currency(row.total)} total={report.finance.totalCollected || 1} />) : <p className="text-sm muted">No payments in this period.</p>}
                </div>
              </div>
            </div>
          </div>
          <div className="surface p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-xl font-black">Pending Balance by Customer</h2>
              <Link className="btn btn-secondary py-2" to="/admin/payments">Payments</Link>
            </div>
            <div className="grid gap-3">
              {report.finance.pendingByCustomer.length ? report.finance.pendingByCustomer.map((row) => (
                <div key={`${row.customer}-${row.phone}`} className="rounded-card bg-[var(--surface-2)] p-3">
                  <p className="font-bold">{row.customer}</p>
                  <p className="text-sm muted">{row.phone || 'Phone not captured'}</p>
                  <p className="mt-2 text-lg font-black text-amber-100">{currency(row.balance)}</p>
                </div>
              )) : <EmptyState title="No pending balances" message="Payments are clear for this period." />}
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === 'inventory' ? (
        <div className="surface mt-6 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">Inventory Report</h2>
            <Link className="btn btn-secondary py-2" to="/admin/parts">Open Inventory</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={Boxes} label="Total Parts / Products" value={report.inventory.totalParts} />
            <StatCard icon={CreditCard} label="Total Stock Value" value={currency(report.inventory.stockValue)} />
            <StatCard icon={AlertTriangle} label="Low Stock Items" value={report.inventory.lowStock} tone="yellow" />
            <StatCard icon={AlertTriangle} label="Out of Stock Items" value={report.inventory.outOfStock} tone="red" />
            <StatCard icon={Wrench} label="Stock Used by Jobs" value={report.inventory.usedQuantity} />
            <StatCard icon={PackagePlus} label="Stock Added" value={report.inventory.added} tone="green" />
            <StatCard icon={PackagePlus} label="Stock Returned" value={report.inventory.returned} tone="green" />
            <StatCard icon={ReceiptText} label="Dead Stock Items" value={report.inventory.deadStock} tone="yellow" />
          </div>
          <div className="mt-5">
            {!report.inventory.rows.length ? <EmptyState title="No inventory data" message="Inventory reports will appear after parts are added." /> : (
              <Table>
                <thead><tr><th>Part</th><th>Category</th><th>On Hand</th><th>Reserved</th><th>Available</th><th>Used Quantity</th><th>Stock Value</th><th>Status</th></tr></thead>
                <tbody>
                  {report.inventory.rows.slice(0, 50).map((part) => <tr key={recordId(part)}><td className="font-bold">{part.partName}</td><td>{part.category}</td><td>{part.onHand}</td><td>{part.reserved}</td><td>{part.available}</td><td>{part.usedQuantity}</td><td>{currency(part.stockValue)}</td><td><InventoryStatusBadge part={part} /></td></tr>)}
                </tbody>
              </Table>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
