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
import { calculateAmcCoverageBreakdown } from '../../shared/amcCoverage.js';

const REPORT_PAGE_LIMIT = 50;
const MAX_REPORT_PAGES = 20;

function appendPagination(path, page) {
  const joiner = path.includes('?') ? '&' : '?';
  return `${path}${joiner}page=${page}&limit=${REPORT_PAGE_LIMIT}`;
}

async function fetchReportCollection(request, path, key, label) {
  const first = await request(appendPagination(path, 1));
  const firstRows = first?.[key] || [];
  const pagination = first?.pagination || {};
  const totalPages = Number(pagination.totalPages || 1);
  const pagesToFetch = Math.min(totalPages, MAX_REPORT_PAGES);
  const rest = pagesToFetch > 1
    ? await Promise.all(
      Array.from({ length: pagesToFetch - 1 }, (_, index) =>
        request(appendPagination(path, index + 2)).catch(() => ({ [key]: [] }))
      )
    )
    : [];
  return {
    rows: [...firstRows, ...rest.flatMap((payload) => payload?.[key] || [])],
    capped: totalPages > MAX_REPORT_PAGES,
    label,
    total: Number(pagination.total || firstRows.length)
  };
}

export function ReportsAnalyticsPage({ section = 'main' }) {
  const { request } = useAuth();
  const [range, setRange] = useState('This Month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const loadReports = useCallback(async () => {
    const [bookings, workOrders, invoices, payments, inventory, movements, customers, amcContracts, amcSchedule, users] = await Promise.all([
      fetchReportCollection(request, '/bookings', 'bookings', 'bookings').catch(() => ({ rows: [], capped: false, label: 'bookings' })),
      fetchReportCollection(request, '/work-orders', 'workOrders', 'work orders').catch(() => ({ rows: [], capped: false, label: 'work orders' })),
      fetchReportCollection(request, '/invoices', 'invoices', 'invoices').catch(() => ({ rows: [], capped: false, label: 'invoices' })),
      fetchReportCollection(request, '/payments', 'payments', 'payments').catch(() => ({ rows: [], capped: false, label: 'payments' })),
      fetchReportCollection(request, '/inventory', 'parts', 'inventory parts').catch(() => ({ rows: [], capped: false, label: 'inventory parts' })),
      fetchReportCollection(request, '/stock-movements', 'movements', 'stock movements').catch(() => ({ rows: [], capped: false, label: 'stock movements' })),
      fetchReportCollection(request, '/customers', 'customers', 'customers').catch(() => ({ rows: [], capped: false, label: 'customers' })),
      request('/amc/contracts').catch(() => ({ contracts: [], summary: {} })),
      request('/amc/schedule').catch(() => ({ schedule: [] })),
      fetchReportCollection(request, '/users', 'users', 'users').catch(() => ({ rows: [], capped: false, label: 'users' }))
    ]);
    const collections = [bookings, workOrders, invoices, payments, inventory, movements, customers, users];
    return {
      bookings: bookings.rows || [],
      workOrders: workOrders.rows || [],
      invoices: invoices.rows || [],
      payments: payments.rows || [],
      parts: inventory.rows || [],
      movements: movements.rows || [],
      customers: customers.rows || [],
      amcContracts: amcContracts.contracts || [],
      amcSummary: amcContracts.summary || {},
      amcSchedule: amcSchedule.schedule || [],
      users: users.rows || [],
      _reportMeta: {
        capped: collections.filter((item) => item.capped).map((item) => item.label)
      }
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
    const invoiceText = (invoice) => String(`${invoice?.title || ''} ${invoice?.notes || ''}`).toLowerCase();
    const isContractAmcInvoice = (invoice) => Boolean(recordId(invoice?.amcContractId)) && !recordId(invoice?.workOrderId);
    const isAmcExtraInvoice = (invoice) => Boolean(recordId(invoice?.workOrderId)) && (Boolean(recordId(invoice?.amcContractId)) || Boolean(recordId(invoice?.workOrderId?.amcContractId)) || invoiceText(invoice).includes('amc extra'));
    const contractAmcInvoices = allInvoices.filter((invoice) => isContractAmcInvoice(invoice) || invoiceText(invoice).includes('amc contract -'));
    const amcExtraInvoices = allInvoices.filter(isAmcExtraInvoice);
    const contractAmcInvoiceIds = new Set(contractAmcInvoices.map((invoice) => recordId(invoice)).filter(Boolean));
    const amcExtraInvoiceIds = new Set(amcExtraInvoices.map((invoice) => recordId(invoice)).filter(Boolean));
    const amcPayments = payments.filter((payment) => {
      const invoice = payment.invoiceId || {};
      return contractAmcInvoiceIds.has(recordId(invoice)) || isContractAmcInvoice(invoice);
    });
    const amcExtraPayments = payments.filter((payment) => {
      const invoice = payment.invoiceId || {};
      return amcExtraInvoiceIds.has(recordId(invoice)) || isAmcExtraInvoice(invoice);
    });
    const totalAmcRevenue = amcPayments.reduce((sum, payment) => sum + Number(payment.paidAmount || payment.amount || 0), 0);
    const chargeableRepairsRevenue = amcExtraPayments.reduce((sum, payment) => sum + Number(payment.paidAmount || payment.amount || 0), 0);
    const pendingAmcPayments = contractAmcInvoices.reduce((sum, invoice) => sum + invoiceDueAmount(invoice), 0);
    const activeAmcContractValue = allContracts.filter((contract) => contract.status === 'Active').reduce((sum, contract) => sum + Number(contract.contractValue || 0), 0);
    const renewalRevenue = allContracts.filter((contract) => ['Renewal Due', 'Expired'].includes(contract.renewalStatus)).reduce((sum, contract) => sum + Number(contract.contractValue || 0), 0);
    const coveredServiceCost = allWorkOrders.filter((job) => recordId(job.amcContractId)).reduce((sum, job) => sum + calculateAmcCoverageBreakdown(job).coveredTotal, 0);
    const amcProfitEstimate = totalAmcRevenue + chargeableRepairsRevenue - coveredServiceCost;
    const amcRelatedRevenue = totalAmcRevenue + chargeableRepairsRevenue;
    const nonAmcRevenue = Math.max(0, paidAmount - amcRelatedRevenue);
    const amcPaymentStatus = (contract) => {
      const invoice = contract?.invoiceId && typeof contract.invoiceId === 'object' ? contract.invoiceId : null;
      const value = Number(contract?.contractValue || invoice?.total || 0);
      const paid = Number(invoice?.paidAmount || 0);
      if (value > 0 && paid >= value) return 'Paid';
      if (paid > 0) return 'Partial';
      return 'Pending';
    };
    const fullyPaidAmcContracts = allContracts.filter((contract) => amcPaymentStatus(contract) === 'Paid').length;
    const partiallyPaidAmcContracts = allContracts.filter((contract) => amcPaymentStatus(contract) === 'Partial').length;
    const pendingAmcContracts = allContracts.filter((contract) => amcPaymentStatus(contract) === 'Pending').length;
    const pendingRenewals = amcRenewalsDue;

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

    const revenueByMonth = buildRevenueByMonth(payments);

    const paymentMethodRows = Object.entries(payments.reduce((map, payment) => {
      const method = payment.method || 'Other';
      map[method] = (map[method] || 0) + Number(payment.paidAmount || payment.amount || 0);
      return map;
    }, {})).map(([method, total]) => ({ method, total })).sort((a, b) => b.total - a.total);

    const pendingByCustomer = Object.values(invoices.reduce((map, invoice) => {
      const id = recordId(invoice.customerId) || invoice.customerId?.phone || invoice.customerId?.name || 'unknown';
      if (!map[id]) map[id] = { customer: invoice.customerId?.name || 'Customer', phone: invoice.customerId?.phone || '', customerId: recordId(invoice.customerId), balance: 0 };
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
        totalAmcRevenue,
        pendingAmcPayments,
        activeAmcContractValue,
        renewalRevenue,
        coveredServiceCost,
        chargeableRepairsRevenue,
        amcProfitEstimate,
        fullyPaidAmcContracts,
        partiallyPaidAmcContracts,
        pendingAmcContracts,
        pendingRenewals,
        amcRelatedRevenue,
        nonAmcRevenue,
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
        totalAmcRevenue,
        pendingAmcPayments,
        activeAmcContractValue,
        renewalDueAmount: renewalRevenue,
        coveredServiceCost,
        chargeableRepairsRevenue,
        amcProfitEstimate,
        fullyPaidContracts: fullyPaidAmcContracts,
        partiallyPaidContracts: partiallyPaidAmcContracts,
        pendingContracts: pendingAmcContracts,
        pendingRenewals,
        amcRelatedRevenue,
        nonAmcRevenue
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

  const activeSection = section === 'payments' ? 'finance' : normalizeReportSection(section);
  const selectedPeriodLabel = range === 'Custom Range' && (customFrom || customTo) ? `${customFrom || 'Start'} to ${customTo || 'Today'}` : range;
  const hasRangeFilter = range !== 'This Month' || Boolean(customFrom || customTo);

  function resetRangeFilters() {
    setRange('This Month');
    setCustomFrom('');
    setCustomTo('');
  }

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
        ['Total AMC revenue', report.finance.totalAmcRevenue],
        ['Pending AMC payments', report.finance.pendingAmcPayments],
        ['Active AMC contract value', report.finance.activeAmcContractValue],
        ['Renewal revenue', report.finance.renewalRevenue],
        ['Covered service cost', report.finance.coveredServiceCost],
        ['Extra revenue from AMC repairs', report.finance.chargeableRepairsRevenue],
        ['AMC profit estimate', report.finance.amcProfitEstimate],
        ['Fully paid AMC contracts', report.finance.fullyPaidAmcContracts],
        ['Partially paid AMC contracts', report.finance.partiallyPaidAmcContracts],
        ['Pending AMC contracts', report.finance.pendingAmcContracts],
        ['Pending renewals', report.finance.pendingRenewals],
        ['AMC related revenue', report.finance.amcRelatedRevenue],
        ['Non-AMC revenue', report.finance.nonAmcRevenue],
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

  const topService = report.operations.serviceTypeRows[0];
  const technicianSummary = summarizeTechnicians(report.technicians);
  const bestTechnician = report.technicians
    .filter((row) => row.assigned > 0)
    .sort((a, b) => Number(b.completionRate.replace('%', '')) - Number(a.completionRate.replace('%', '')) || b.completed - a.completed)[0];
  const financeHasData = report.finance.totalInvoiceValue || report.finance.totalCollected || report.finance.pendingBalance || report.finance.totalAmcRevenue || report.finance.pendingAmcPayments || report.finance.chargeableRepairsRevenue || report.finance.coveredServiceCost || report.finance.fullyPaidAmcContracts || report.finance.partiallyPaidAmcContracts || report.finance.pendingAmcContracts || report.finance.paymentMethodRows.length;
  const hasRevenueChart = report.finance.revenueByMonth.some((row) => Number(row.revenue || 0) > 0);
  const hasPaymentMethodData = report.finance.paymentMethodRows.some((row) => Number(row.total || 0) > 0);
  const cappedCollections = data?._reportMeta?.capped || [];

  return (
    <div className="reports-page reports-premium-page">
      <section className="reports-hero mb-5">
        <div className="relative z-[1] flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--brand)]">Business Intelligence</p>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Reports & Analytics</h1>
              <span className="reports-period-chip">{selectedPeriodLabel}</span>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Track revenue, jobs, payments, inventory, technicians, and AMC performance from one place.</p>
          </div>
        </div>
      </section>
      <ReportsPremiumNavigation active={activeSection} />
      <ReportsPremiumRangeBar range={range} setRange={setRange} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} hasRangeFilter={hasRangeFilter} onReset={resetRangeFilters} onExport={exportCurrentSection} />
      {cappedCollections.length ? (
        <div className="surface mb-5 border border-amber-400/25 bg-amber-500/10 p-4 text-sm font-semibold text-amber-100">
          Report data is capped for very large datasets. Loaded the first {MAX_REPORT_PAGES * REPORT_PAGE_LIMIT} records for: {cappedCollections.join(', ')}.
        </div>
      ) : null}

      {activeSection === 'main' ? (
        <div className="reports-kpi-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <ReportMetricCard icon={CreditCard} label="Total Revenue" value={currency(report.summary.totalRevenue)} helper="Collected this period" tone="green" to="/admin/reports/finance" />
          <ReportMetricCard icon={AlertTriangle} label="Pending Payments" value={currency(report.summary.pendingPayments)} helper="Needs follow-up" tone="amber" to="/admin/reports/finance" />
          <ReportMetricCard icon={CheckCircle2} label="Completed Jobs" value={report.summary.completedJobs} helper="Closed in selected period" tone="green" to="/admin/work-orders?status=Completed" />
          <ReportMetricCard icon={Wrench} label="Active Repair Jobs" value={report.summary.activeRepairJobs} helper="Currently open" tone="blue" to="/admin/work-orders" />
          <ReportMetricCard icon={AlertTriangle} label="Low Stock Items" value={report.summary.lowStockItems} helper="Inventory attention" tone="red" to="/admin/reports/inventory" />
          <ReportMetricCard icon={FileText} label="Active AMC Contracts" value={report.summary.activeAmcContracts} helper="Covered customers" tone="blue" to="/admin/amc-contracts" />
          <ReportMetricCard icon={Bell} label="AMC Renewals Due" value={report.summary.amcRenewalsDue} helper="Renewal opportunity" tone="amber" to="/admin/amc-renewals" />
          <ReportMetricCard icon={Users} label="Total Customers" value={report.summary.totalCustomers} helper="Customer base" tone="cyan" to="/admin/customers" />
        </div>
      ) : null}

      {activeSection === 'main' ? (
        <div className="mt-5">
          <ReportPanel
            title="Operations Summary"
            subtitle="Bookings, jobs, and current service workload"
            action={<Link className="btn btn-secondary reports-compact-button" to="/admin/work-orders">Open Jobs</Link>}
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <ReportMetricCard icon={BookOpenCheck} label="Total Bookings" value={report.operations.totalBookings} helper="Created this period" tone="blue" compact />
              <ReportMetricCard icon={Wrench} label="Total Service Jobs" value={report.operations.totalJobs} helper="Jobs in period" tone="blue" compact />
              <ReportMetricCard icon={CalendarClock} label="Pending Jobs" value={report.operations.pending} helper="Waiting to start" tone="amber" compact />
              <ReportMetricCard icon={Wrench} label="In Progress Jobs" value={report.operations.inProgress} helper="Being serviced" tone="cyan" compact />
              <ReportMetricCard icon={PackagePlus} label="Awaiting Parts" value={report.operations.awaitingParts} helper="Parts required" tone="amber" compact />
              <ReportMetricCard icon={CheckCircle2} label="Completed Jobs" value={report.operations.completed} helper="Work completed" tone="green" compact />
              <ReportMetricCard icon={CheckCircle2} label="Delivered Jobs" value={report.operations.delivered} helper="Returned to customer" tone="green" compact />
              <ReportMetricCard icon={AlertTriangle} label="Returned Jobs" value={report.operations.returned} helper="Needs review" tone="red" compact />
            </div>
          </ReportPanel>
        </div>
      ) : null}

      {activeSection === 'main' ? (
        <div className="mt-5">
          <ReportPanel
            title="Jobs by Service Type"
            subtitle={topService ? `Top service category: ${topService.name}` : 'Service mix for the selected period'}
          >
            <div className="grid gap-3">
              {report.operations.serviceTypeRows.length ? report.operations.serviceTypeRows.map((row) => (
                <ReportProgressRow key={row.name} label={row.name} value={row.count} total={report.operations.totalJobs} />
              )) : <EmptyState icon={BarChart} title="No business report data" message="Service type distribution will appear once jobs exist in this period." />}
            </div>
          </ReportPanel>
        </div>
      ) : null}

      {activeSection === 'technicians' ? (
        <div className="mt-6 grid gap-5">
          <div className="reports-kpi-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ReportMetricCard icon={Users} label="Total Technicians" value={technicianSummary.totalTechnicians} helper="Technicians in report" tone="blue" />
            <ReportMetricCard icon={Wrench} label="Assigned Jobs" value={technicianSummary.assignedJobs} helper="Total assigned workload" tone="cyan" />
            <ReportMetricCard icon={CheckCircle2} label="Completed Jobs" value={technicianSummary.completedJobs} helper="Closed by technicians" tone="green" />
            <ReportMetricCard icon={BarChart} label="Average Completion Rate" value={technicianSummary.averageCompletionRate} helper="Completed / assigned" tone="blue" />
          </div>
          <ReportPanel
            title="Technician Performance Report"
            subtitle={bestTechnician ? `Best performer: ${bestTechnician.technician.name} at ${bestTechnician.completionRate}` : 'Assigned, completed, and active work by technician'}
          >
            {!report.technicians.length ? <EmptyState icon={Users} title="No technician data" message="Technician reports will appear after jobs are assigned." /> : (
              <div className="table-wrap reports-table-wrap bg-[var(--surface)]">
                <table className="data-table reports-technician-table">
                  <thead><tr><th>Technician</th><th>Assigned</th><th>Completed</th><th>In Progress</th><th>Awaiting Parts</th><th>Completion Rate</th><th>Last Activity</th><th className="text-center">Action</th></tr></thead>
                  <tbody>
                    {report.technicians.map((row) => {
                      const isBest = bestTechnician && recordId(bestTechnician.technician) === recordId(row.technician);
                      return (
                        <tr key={recordId(row.technician)} className={isBest ? 'reports-highlight-row' : ''}>
                          <td className="font-bold">
                            <span className="block truncate text-slate-100" title={row.technician.name}>{row.technician.name}</span>
                            <span className="block text-xs muted">{row.notesCount} notes - {currency(row.partsValue)} parts</span>
                          </td>
                          <td className="reports-number-cell">{row.assigned}</td>
                          <td className="reports-number-cell text-emerald-100">{row.completed}</td>
                          <td className="reports-number-cell">{row.inProgress}</td>
                          <td className="reports-number-cell">{row.awaitingParts}</td>
                          <td><CompletionRateBadge rate={row.completionRate} average={row.averageCompletion} /></td>
                          <td>{row.lastActivity ? formatDate(row.lastActivity) : <span className="muted">No activity</span>}</td>
                          <td className="text-center"><Link className="btn btn-secondary reports-table-button" to={`/admin/work-orders?technicianId=${recordId(row.technician)}`}>View Jobs</Link></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ReportPanel>
        </div>
      ) : null}

      {activeSection === 'finance' ? (
        <div className="mt-6 grid gap-5">
          <ReportPanel title="Finance Report" subtitle="Invoice value, collections, and pending payment exposure">
            {!financeHasData ? <EmptyState icon={CreditCard} title="No payment data" message="Invoices, collections, and balances will appear after billing activity is recorded." /> : null}
            <div className="reports-kpi-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ReportMetricCard icon={ReceiptText} label="Total Invoice Value" value={currency(report.finance.totalInvoiceValue)} helper="Billed this period" tone="blue" />
              <ReportMetricCard icon={CreditCard} label="Total Collected" value={currency(report.finance.totalCollected)} helper="Money received" tone="green" />
              <ReportMetricCard icon={AlertTriangle} label="Pending Balance" value={currency(report.finance.pendingBalance)} helper="Needs follow-up" tone="amber" />
              <ReportMetricCard icon={ReceiptText} label="Partial Payments" value={report.finance.partialPayments} helper="Part-paid invoices" tone="amber" />
              <ReportMetricCard icon={CheckCircle2} label="Paid Invoices" value={report.finance.paidInvoices} helper="Fully cleared" tone="green" />
              <ReportMetricCard icon={AlertTriangle} label="Pending Invoices" value={report.finance.pendingInvoices} helper="Unpaid invoices" tone="amber" />
              <ReportMetricCard icon={CreditCard} label="Today's Collection" value={currency(report.finance.todayCollection)} helper="Collected today" tone="cyan" />
              <ReportMetricCard icon={CreditCard} label="Monthly Revenue" value={currency(report.finance.monthlyRevenue)} helper="This month collected" tone="green" />
              <ReportMetricCard icon={ShieldCheck} label="Total AMC Revenue" value={currency(report.finance.totalAmcRevenue)} helper="AMC collected this period" tone="green" />
              <ReportMetricCard icon={AlertTriangle} label="Pending AMC Payments" value={currency(report.finance.pendingAmcPayments)} helper="AMC balance due" tone="amber" />
              <ReportMetricCard icon={FileText} label="Active AMC Contract Value" value={currency(report.finance.activeAmcContractValue)} helper="Live contract value" tone="blue" />
              <ReportMetricCard icon={Bell} label="Renewal Revenue" value={currency(report.finance.renewalRevenue)} helper="Renewal opportunity" tone="amber" />
              <ReportMetricCard icon={Wrench} label="Covered Service Cost" value={currency(report.finance.coveredServiceCost)} helper="AMC absorbed work" tone="cyan" />
              <ReportMetricCard icon={ReceiptText} label="Extra Revenue From AMC Repairs" value={currency(report.finance.chargeableRepairsRevenue)} helper="Chargeable AMC repair collection" tone="green" />
              <ReportMetricCard icon={ShieldCheck} label="AMC Profit Estimate" value={currency(report.finance.amcProfitEstimate)} helper="AMC revenue minus covered cost" tone={report.finance.amcProfitEstimate >= 0 ? 'green' : 'red'} />
              <ReportMetricCard icon={CheckCircle2} label="Fully Paid AMC Contracts" value={report.finance.fullyPaidAmcContracts} helper="Contract payments cleared" tone="green" />
              <ReportMetricCard icon={ReceiptText} label="Partially Paid AMC Contracts" value={report.finance.partiallyPaidAmcContracts} helper="Some AMC amount collected" tone="amber" />
              <ReportMetricCard icon={AlertTriangle} label="Pending AMC Contracts" value={report.finance.pendingAmcContracts} helper="No AMC payment collected" tone="amber" />
              <ReportMetricCard icon={Bell} label="Pending Renewals" value={report.finance.pendingRenewals} helper="Renewal due contracts" tone="amber" />
              <ReportMetricCard icon={ShieldCheck} label="AMC Revenue" value={currency(report.finance.amcRelatedRevenue)} helper="AMC contract plus extra repair revenue" tone="green" />
              <ReportMetricCard icon={CreditCard} label="Non-AMC Revenue" value={currency(report.finance.nonAmcRevenue)} helper="Other service collections" tone="blue" />
            </div>
          </ReportPanel>

          <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
            <ReportPanel title="Revenue by Month" subtitle="Collection trend from existing payment records">
              <div className="reports-chart-frame">
                {hasRevenueChart ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.finance.revenueByMonth}>
                      <CartesianGrid stroke="rgba(117,196,255,0.12)" vertical={false} />
                      <XAxis dataKey="month" stroke="#aebfd7" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#aebfd7" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value) => currency(value)} contentStyle={{ background: '#071426', border: '1px solid rgba(117,196,255,0.25)', borderRadius: 8 }} />
                      <Bar dataKey="revenue" fill="#22c55e" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState icon={BarChart} title="No revenue data for selected period" message="Collected revenue will appear here once payments are recorded in this period." />}
              </div>
            </ReportPanel>

            <ReportPanel title="Collection by Payment Method" subtitle="How customers paid in this period">
              <div className="grid gap-3">
                {hasPaymentMethodData ? report.finance.paymentMethodRows.map((row) => (
                  <ReportProgressRow key={row.method} label={row.method} value={row.total} displayValue={currency(row.total)} total={report.finance.totalCollected || 1} />
                )) : <EmptyState icon={CreditCard} title="No chart data" message="Payment method split will appear once payments are recorded." />}
              </div>
            </ReportPanel>
          </div>

          <ReportPanel
            title="Pending Balance by Customer"
            subtitle="Top pending customers"
            action={<Link className="btn btn-secondary reports-compact-button" to="/admin/payments">Payments</Link>}
          >
            <div className="reports-pending-grid">
              {report.finance.pendingByCustomer.length ? report.finance.pendingByCustomer.map((row, index) => (
                <div key={`${row.customer}-${row.phone}`} className={`reports-pending-card ${index === 0 ? 'reports-pending-card-top' : ''}`}>
                  <div className="min-w-0">
                    <p className="truncate font-black text-slate-100" title={row.customer}>{row.customer}</p>
                    <p className="mt-1 text-sm muted">{row.phone || 'Phone not captured'}</p>
                  </div>
                  <p className="reports-pending-amount">{currency(row.balance)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {row.customerId ? <Link className="btn btn-secondary reports-table-button" to={`/admin/customers/${row.customerId}`}>Open Customer</Link> : null}
                    <Link className="btn btn-secondary reports-table-button" to="/admin/payments">Payments</Link>
                  </div>
                </div>
              )) : <EmptyState icon={CheckCircle2} title="No pending balances" message="Payments are clear for this period." />}
            </div>
          </ReportPanel>
        </div>
      ) : null}

      {activeSection === 'inventory' ? (
        <div className="mt-6 grid gap-5">
          <ReportPanel
            title="Inventory Report"
            subtitle="Stock value, availability, and items needing attention"
            action={<Link className="btn btn-secondary reports-compact-button" to="/admin/parts">Open Inventory</Link>}
          >
            <div className="reports-kpi-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ReportMetricCard icon={Boxes} label="Total Parts / Products" value={report.inventory.totalParts} helper="Current tracked items" tone="blue" />
              <ReportMetricCard icon={CreditCard} label="Total Stock Value" value={currency(report.inventory.stockValue)} helper="On-hand valuation" tone="green" />
              <ReportMetricCard icon={AlertTriangle} label="Low Stock Items" value={report.inventory.lowStock} helper="Needs purchase planning" tone="amber" />
              <ReportMetricCard icon={AlertTriangle} label="Out of Stock Items" value={report.inventory.outOfStock} helper="Requires immediate attention" tone="red" />
              <ReportMetricCard icon={Wrench} label="Stock Used by Jobs" value={report.inventory.usedQuantity} helper="Consumed by work orders" tone="blue" />
              <ReportMetricCard icon={PackagePlus} label="Stock Added" value={report.inventory.added} helper="Added to inventory" tone="green" />
              <ReportMetricCard icon={PackagePlus} label="Stock Returned" value={report.inventory.returned} helper="Returned to stock" tone="cyan" />
              <ReportMetricCard icon={ReceiptText} label="Dead Stock Items" value={report.inventory.deadStock} helper="No usage recorded" tone="amber" />
            </div>
          </ReportPanel>

          <ReportPanel title="Inventory Table" subtitle="Availability and value by part">
            {!report.inventory.rows.length ? <EmptyState icon={Boxes} title="No inventory data" message="Inventory reports will appear after parts are added." /> : (
              <div className="table-wrap reports-table-wrap bg-[var(--surface)]">
                <table className="data-table reports-inventory-table">
                  <thead><tr><th>Part</th><th>Category</th><th>On Hand</th><th>Reserved</th><th>Available</th><th>Used Quantity</th><th>Stock Value</th><th>Status</th></tr></thead>
                  <tbody>
                    {report.inventory.rows.slice(0, 50).map((part) => (
                      <tr key={recordId(part)}>
                        <td className="font-bold"><span className="block truncate text-slate-100" title={part.partName}>{part.partName}</span></td>
                        <td><span className="reports-soft-badge">{part.category || 'General'}</span></td>
                        <td className="reports-number-cell">{part.onHand || 0}</td>
                        <td className="reports-number-cell">{part.reserved || 0}</td>
                        <td className="reports-number-cell font-black text-sky-100">{part.available || 0}</td>
                        <td className="reports-number-cell">{part.usedQuantity || 0}</td>
                        <td className="font-black text-slate-100">{currency(part.stockValue)}</td>
                        <td><InventoryReportStatusPill status={part.stockStatus} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ReportPanel>
        </div>
      ) : null}
    </div>
  );
}

function ReportsPremiumNavigation({ active }) {
  return (
    <div className="surface reports-segmented-shell mb-5 p-2">
      <div className="reports-segmented-tabs">
        {reportSections.map((item) => (
          <Link key={item.id} className={`reports-segment ${active === item.id ? 'reports-segment-active' : ''}`} to={item.to}>
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ReportsPremiumRangeBar({ range, setRange, customFrom, setCustomFrom, customTo, setCustomTo, hasRangeFilter, onReset, onExport }) {
  return (
    <div className="surface reports-premium-range mb-5 grid gap-3 p-4 lg:grid-cols-[minmax(220px,1fr)_170px_170px_auto_auto_auto]">
      <select className="input" value={range} onChange={(event) => setRange(event.target.value)}>
        {reportRangeOptions.map((item) => <option key={item}>{item}</option>)}
      </select>
      {range === 'Custom Range' ? (
        <>
          <input className="input" type="date" value={customFrom} onChange={(event) => setCustomFrom(event.target.value)} />
          <input className="input" type="date" value={customTo} onChange={(event) => setCustomTo(event.target.value)} />
        </>
      ) : <><div className="hidden lg:block" /><div className="hidden lg:block" /></>}
      <button type="button" className="btn btn-secondary reports-compact-button reports-reset-filter-button" disabled={!hasRangeFilter} onClick={onReset}>Reset Filters</button>
      <button type="button" className="btn btn-secondary reports-compact-button" onClick={onExport}><Download className="h-4 w-4" />Export CSV</button>
      <button type="button" className="btn btn-secondary reports-compact-button" onClick={() => window.print()}><FileText className="h-4 w-4" />Print</button>
    </div>
  );
}

function ReportPanel({ title, subtitle, action = null, children }) {
  return (
    <section className="surface reports-panel p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ReportMetricCard({ icon: Icon, label, value, helper, tone = 'blue', to = null, compact = false }) {
  const content = (
    <>
      <div className="reports-metric-icon"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0">
        <p className="reports-metric-label">{label}</p>
        <p className="reports-metric-value" title={String(value)}>{value}</p>
        <p className="reports-metric-helper">{helper}</p>
      </div>
    </>
  );
  const className = `reports-metric-card reports-metric-${tone} ${compact ? 'reports-metric-compact' : ''}`;
  return to ? <Link to={to} className={className}>{content}</Link> : <div className={className}>{content}</div>;
}

function ReportProgressRow({ label, value, total, displayValue = null }) {
  const width = total ? Math.min(100, Math.round((Number(value || 0) / Number(total || 1)) * 100)) : 0;
  return (
    <div className="reports-progress-row">
      <div className="flex items-center justify-between gap-3">
        <span className="truncate font-bold text-slate-100" title={label}>{label}</span>
        <span className="text-sm font-black text-slate-200">{displayValue ?? value}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-300" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function paymentCollectedAmount(payment = {}) {
  return Number(payment.paidAmount ?? payment.amount ?? payment.totalPaid ?? payment.value ?? 0) || 0;
}

function paymentCollectedDate(payment = {}) {
  return payment.paymentDate || payment.paidAt || payment.createdAt || payment.updatedAt;
}

function buildRevenueByMonth(payments = []) {
  const rowsByMonth = payments.reduce((map, payment) => {
    const amount = paymentCollectedAmount(payment);
    const date = new Date(paymentCollectedDate(payment));
    if (!amount || !Number.isFinite(date.getTime())) return map;
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!map[key]) {
      map[key] = {
        month: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
        monthSort: key,
        revenue: 0
      };
    }
    map[key].revenue += amount;
    return map;
  }, {});
  return Object.values(rowsByMonth).sort((a, b) => a.monthSort.localeCompare(b.monthSort)).slice(-12);
}

function CompletionRateBadge({ rate, average }) {
  const numericRate = Number(String(rate || '0').replace('%', ''));
  const tone = numericRate >= 70 ? 'green' : numericRate > 0 ? 'blue' : 'neutral';
  return (
    <div className={`reports-rate-badge reports-rate-${tone}`}>
      <span>{rate}</span>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-current" style={{ width: `${Math.min(100, numericRate)}%` }} />
      </div>
      <span className="mt-1 block text-[11px] font-semibold opacity-80">Avg {average}</span>
    </div>
  );
}

function InventoryReportStatusPill({ status }) {
  const label = status === 'out' ? 'Out of Stock' : status === 'low' ? 'Low Stock' : 'Available';
  const tone = status === 'out' ? 'reports-status-red' : status === 'low' ? 'reports-status-amber' : 'reports-status-green';
  return <span className={`reports-status-pill ${tone}`}>{label}</span>;
}

function summarizeTechnicians(rows = []) {
  const assignedJobs = rows.reduce((sum, row) => sum + Number(row.assigned || 0), 0);
  const completedJobs = rows.reduce((sum, row) => sum + Number(row.completed || 0), 0);
  return {
    totalTechnicians: rows.length,
    assignedJobs,
    completedJobs,
    averageCompletionRate: percentage(completedJobs, assignedJobs)
  };
}

function hasBusinessReportData(report) {
  return [
    report.summary.totalRevenue,
    report.summary.pendingPayments,
    report.summary.completedJobs,
    report.summary.activeRepairJobs,
    report.summary.lowStockItems,
    report.summary.activeAmcContracts,
    report.summary.amcRenewalsDue,
    report.summary.totalCustomers,
    report.operations.totalJobs,
    report.operations.totalBookings
  ].some((value) => Number(value || 0) > 0);
}

function buildBusinessInsights(report) {
  return [
    report.summary.pendingPayments > 0
      ? { icon: AlertTriangle, tone: 'amber', title: 'Pending payments need follow-up', message: `${currency(report.summary.pendingPayments)} is still pending from customers.` }
      : { icon: CheckCircle2, tone: 'green', title: 'Pending payments are under control', message: 'No pending payment exposure in this report period.' },
    report.summary.lowStockItems > 0
      ? { icon: AlertTriangle, tone: 'red', title: 'Low stock needs purchase planning', message: `${report.summary.lowStockItems} item${report.summary.lowStockItems === 1 ? '' : 's'} need inventory attention.` }
      : { icon: CheckCircle2, tone: 'green', title: 'Low stock is under control', message: 'No low-stock items are showing in the current inventory report.' },
    report.summary.amcRenewalsDue > 0
      ? { icon: Bell, tone: 'amber', title: 'AMC renewals need attention', message: `${report.summary.amcRenewalsDue} contract${report.summary.amcRenewalsDue === 1 ? '' : 's'} can be renewed.` }
      : { icon: ShieldCheck, tone: 'blue', title: 'AMC renewals are calm', message: 'No AMC renewal pressure is showing right now.' },
    report.summary.activeRepairJobs > 0
      ? { icon: Wrench, tone: 'blue', title: 'Active jobs need tracking', message: `${report.summary.activeRepairJobs} repair job${report.summary.activeRepairJobs === 1 ? '' : 's'} are currently active.` }
      : { icon: CheckCircle2, tone: 'green', title: 'No active repair backlog', message: 'Active repair workload is clear.' }
  ];
}
