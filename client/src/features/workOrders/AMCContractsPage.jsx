import {
  AlertTriangle,
  amcContractTypes,
  amcFrequencies,
  AmcStatusBadge,
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
  useDebouncedValue,
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
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import {
  amcCoverageFlags,
  amcCoverageTypes,
  defaultAmcCoverageType,
  normalizeAmcCoverageType
} from '../../shared/amcCoverage.js';
import { ADMIN_ASSIGNMENT_LABEL } from '../../utils/assignment.js';
import { can, normalizeRole } from '../../utils/roles.js';
import { emitSidebarBadgesUpdated } from '../../utils/sidebarBadges.js';

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
    coverageType: defaultAmcCoverageType,
    coverParts: false,
    coverService: true,
    coverVisits: true,
    coveredDevices: '',
    deviceBrand: '',
    deviceModel: '',
    serviceFrequency: 'Quarterly',
    technicianId: '',
    startDate: dateInputValue(start),
    endDate: dateInputValue(end),
    contractValue: '',
    includedVisits: '4',
    warrantyIncluded: false,
    warrantyStartDate: '',
    warrantyEndDate: '',
    warrantyCoveredItems: '',
    warrantyTerms: '',
    notes: ''
  };
}

function amcDeviceBrandModel(contract = {}) {
  return [contract.deviceBrand, contract.deviceModel].map((value) => String(value || '').trim()).filter(Boolean).join(' ');
}

export function AMCContractsPage({ role = 'admin' }) {
  const { request, user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const effectiveRole = user?.role || role;
  const isTechnician = normalizeRole(effectiveRole) === 'technician';
  const permissionSubject = user || effectiveRole;
  const canCreateAmc = can(permissionSubject, 'create_amc');
  const canRenewAmc = can(permissionSubject, 'renew_amc');
  const canCreateAmcJob = can(permissionSubject, 'create_amc_job');
  const canAssignTechnician = can(permissionSubject, 'assign_technician');
  const canDeleteAmc = canCreateAmc;
  const base = isTechnician ? '/app/tech' : '/app/admin';
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(defaultAmcForm);
  const [customers, setCustomers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [actionMenuId, setActionMenuId] = useState('');
  const [actionMenuPosition, setActionMenuPosition] = useState(null);
  const [detailsContract, setDetailsContract] = useState(null);
  const [reassignContract, setReassignContract] = useState(null);
  const [deleteContract, setDeleteContract] = useState(null);
  const actionMenuRef = useRef(null);
  const actionTriggerRefs = useRef(new Map());
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const handledRenewalRef = useRef('');
  const { data, loading, error, reload } = useResource(() => request('/amc/contracts'), [request]);

  useEffect(() => {
    if (!actionMenuId) return undefined;
    function closeActionMenu(event) {
      if (actionMenuRef.current?.contains(event.target)) return;
      if (actionTriggerRefs.current.get(actionMenuId)?.contains(event.target)) return;
      setActionMenuId('');
      setActionMenuPosition(null);
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setActionMenuId('');
        setActionMenuPosition(null);
      }
    }
    function closeOnViewportChange() {
      setActionMenuId('');
      setActionMenuPosition(null);
    }
    document.addEventListener('mousedown', closeActionMenu);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('scroll', closeOnViewportChange, true);
    window.addEventListener('resize', closeOnViewportChange);
    return () => {
      document.removeEventListener('mousedown', closeActionMenu);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('scroll', closeOnViewportChange, true);
      window.removeEventListener('resize', closeOnViewportChange);
    };
  }, [actionMenuId]);

  useEffect(() => {
    request('/customers?limit=100').then((result) => setCustomers(result.customers || [])).catch(() => setCustomers([]));
  }, [request]);

  useEffect(() => {
    if (!canCreateAmc && !canCreateAmcJob && !canAssignTechnician) {
      setTechnicians([]);
      return;
    }
    request('/users?role=technician&active=true&limit=100')
      .then((result) => setTechnicians((result.users || []).filter((user) => user.role === 'technician' && user.active)))
      .catch(() => setTechnicians([]));
  }, [canAssignTechnician, canCreateAmc, canCreateAmcJob, request]);

  useEffect(() => {
    const renewalContract = location.state?.renewContract;
    const renewalId = recordId(renewalContract);
    if (!canRenewAmc) return;
    if (!renewalId || handledRenewalRef.current === renewalId) return;
    handledRenewalRef.current = renewalId;
    startRenewal(renewalContract);
    navigate(location.pathname, { replace: true, state: null });
  }, [canRenewAmc, location.pathname, location.state, navigate]);

  const contracts = data?.contracts || [];
  const summary = data?.summary || {};
  const visibleContracts = contracts.filter((contract) => {
    const text = `${contract.contractId} ${contract.customerName} ${contract.phone} ${contract.contractType} ${contract.coverageType} ${contract.coveredService} ${contract.coveredDevices} ${contract.deviceBrand || ''} ${contract.deviceModel || ''}`.toLowerCase();
    const searchText = debouncedSearch.trim().toLowerCase();
    return !searchText || text.includes(searchText);
  });
  const hasContractSearch = Boolean(search.trim());
  const contractKpis = [
    { icon: FileText, label: 'Active AMC Contracts', value: summary.activeContracts || 0, helper: 'Live service agreements under coverage.', tone: 'green' },
    { icon: AlertTriangle, label: 'Renewals Due', value: summary.renewalDue || 0, helper: 'Contracts needing follow-up within 30 days.', tone: 'amber' },
    { icon: CalendarClock, label: 'Visits This Week', value: summary.visitsThisWeek || 0, helper: 'Scheduled AMC visits for the next 7 days.', tone: 'blue' },
    { icon: AlertTriangle, label: 'Expired Contracts', value: summary.expiredContracts || 0, helper: 'Coverage ended and should be renewed.', tone: 'red' }
  ];

  function setActionTriggerRef(contractId, node) {
    if (!node) {
      actionTriggerRefs.current.delete(contractId);
      return;
    }
    actionTriggerRefs.current.set(contractId, node);
  }

  function actionMenuCoords(contractId) {
    const trigger = actionTriggerRefs.current.get(contractId);
    if (!trigger || typeof window === 'undefined') return null;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 228;
    const estimatedMenuHeight = 236;
    const gap = 8;
    const margin = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const opensUp = rect.bottom + gap + estimatedMenuHeight > viewportHeight - margin;
    const rawTop = opensUp ? rect.top - estimatedMenuHeight - gap : rect.bottom + gap;
    const leftOpening = rect.right + menuWidth > viewportWidth - margin;
    const rawLeft = leftOpening ? rect.right - menuWidth : rect.left;
    return {
      top: Math.min(Math.max(margin, rawTop), Math.max(margin, viewportHeight - estimatedMenuHeight - margin)),
      left: Math.min(Math.max(margin, rawLeft), Math.max(margin, viewportWidth - menuWidth - margin)),
      width: menuWidth,
      placement: opensUp ? 'top' : 'bottom'
    };
  }

  function toggleActionMenu(contractId) {
    setActionMenuId((current) => {
      if (current === contractId) {
        setActionMenuPosition(null);
        return '';
      }
      const nextPosition = actionMenuCoords(contractId);
      if (!nextPosition) {
        setActionMenuPosition(null);
        return '';
      }
      setActionMenuPosition(nextPosition);
      return contractId;
    });
  }

  function closeActionMenu() {
    setActionMenuId('');
    setActionMenuPosition(null);
  }

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

  function updateCoverageType(coverageType) {
    const normalized = normalizeAmcCoverageType(coverageType);
    const flags = amcCoverageFlags({ coverageType: normalized });
    setForm((current) => ({
      ...current,
      coverageType: normalized,
      coverParts: flags.coverParts,
      coverService: flags.coverService,
      coverVisits: flags.coverVisits
    }));
  }

  function updateCustomCoverageFlag(key, checked) {
    setForm((current) => ({ ...current, [key]: checked }));
  }

  function renewalDates(contract) {
    const start = contract?.endDate ? new Date(contract.endDate) : new Date();
    if (!Number.isNaN(start.getTime())) start.setDate(start.getDate() + 1);
    const safeStart = Number.isNaN(start.getTime()) ? new Date() : start;
    const end = new Date(safeStart);
    end.setFullYear(end.getFullYear() + 1);
    return { startDate: dateInputValue(safeStart), endDate: dateInputValue(end) };
  }

  function startRenewal(contract) {
    if (!canRenewAmc) return;
    const coverage = amcCoverageFlags(contract);
    const dates = renewalDates(contract);
    setForm({
      ...defaultAmcForm(),
      customerId: recordId(contract?.customerId),
      customerName: contract?.customerName || contract?.customerId?.name || '',
      phone: contract?.phone || contract?.customerId?.phone || '',
      address: contract?.address || contract?.customerId?.address || '',
      contractType: contract?.contractType || 'Basic AMC',
      coverageType: normalizeAmcCoverageType(contract?.coverageType),
      coverParts: coverage.coverParts,
      coverService: coverage.coverService,
      coverVisits: coverage.coverVisits,
      coveredDevices: contract?.coveredDevices || '',
      deviceBrand: contract?.deviceBrand || '',
      deviceModel: contract?.deviceModel || '',
      serviceFrequency: contract?.serviceFrequency || 'Quarterly',
      technicianId: recordId(contract?.visits?.find((visit) => recordId(visit.technicianId))?.technicianId) || '',
      contractValue: contract?.contractValue ?? '',
      includedVisits: contract?.includedVisits ?? '4',
      warrantyIncluded: Boolean(contract?.warrantyIncluded),
      warrantyStartDate: contract?.warrantyStartDate ? dateInputValue(contract.warrantyStartDate) : '',
      warrantyEndDate: contract?.warrantyEndDate ? dateInputValue(contract.warrantyEndDate) : '',
      warrantyCoveredItems: contract?.warrantyCoveredItems || '',
      warrantyTerms: contract?.warrantyTerms || '',
      notes: contract?.notes || '',
      ...dates
    });
    setFormOpen(true);
    push('Renewal draft loaded. Review value and coverage before saving.');
  }

  async function submit(event) {
    event.preventDefault();
    if (!canCreateAmc) return;
    const payload = {
      ...form,
      coverageType: form.coverageType || defaultAmcCoverageType,
      technicianId: form.technicianId || null,
      warrantyIncluded: Boolean(form.warrantyIncluded),
      warrantyStartDate: form.warrantyIncluded ? form.warrantyStartDate || null : null,
      warrantyEndDate: form.warrantyIncluded ? form.warrantyEndDate || null : null,
      warrantyCoveredItems: form.warrantyIncluded ? form.warrantyCoveredItems || '' : '',
      warrantyTerms: form.warrantyIncluded ? form.warrantyTerms || '' : ''
    };
    try {
      await request('/amc/contracts', { method: 'POST', body: JSON.stringify(payload) });
      push('AMC contract created');
      setForm(defaultAmcForm());
      setFormOpen(false);
      reload();
      emitSidebarBadgesUpdated();
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function createJob(contract) {
    if (!canCreateAmcJob) return;
    try {
      const result = await request(`/amc/contracts/${recordId(contract)}/work-orders`, {
        method: 'POST',
        body: JSON.stringify({ issue: `AMC service visit for ${contract.contractType}` })
      });
      push('Repair & Service Job created from AMC');
      emitSidebarBadgesUpdated();
      navigate(`${base}/work-orders/${recordId(result.workOrder)}`);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function saveAmcAssignment(contract, nextTechnicianId) {
    if (!canAssignTechnician) {
      push('You do not have permission to assign technicians', 'error');
      return;
    }
    try {
      await preserveScroll(async () => {
        await request(`/amc/contracts/${recordId(contract)}/assignment`, {
          method: 'PATCH',
          body: JSON.stringify({ technicianId: nextTechnicianId || null })
        });
        push('AMC contract reassigned successfully.');
        closeActionMenu();
        await reload({ silent: true });
        emitSidebarBadgesUpdated();
      });
    } catch (err) {
      push(err.message, 'error');
      throw err;
    }
  }

  async function confirmDeleteOrArchiveContract() {
    if (!deleteContract || !canDeleteAmc) return;
    try {
      await preserveScroll(async () => {
        const result = await request(`/amc/contracts/${recordId(deleteContract)}`, { method: 'DELETE' });
        push(result.message || (deleteContract.lifecycleAction === 'archive' ? 'AMC contract archived' : 'AMC contract moved to deleted records'));
        setDeleteContract(null);
        closeActionMenu();
        await reload({ silent: true });
        emitSidebarBadgesUpdated();
      });
    } catch (err) {
      push(err.message, 'error');
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div className="amc-module-page">
      <section className="amc-page-header mb-5">
        <div className="relative z-[1] flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--brand)]">AMC & Contracts</p>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">AMC Contracts</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Manage service contracts, covered assets, renewal status, visits, and AMC-linked repair jobs.</p>
          </div>
          {canCreateAmc ? <button className="btn btn-primary h-10 px-4" type="button" onClick={() => setFormOpen((value) => !value)}><Plus className="h-4 w-4" />New AMC Contract</button> : null}
        </div>
      </section>

      <div className="surface mb-5 p-3">
        <div className="tabs-list amc-tabs border-b-0">
          <Link className="tab-button tab-button-active" to={`${base}/amc-contracts`}>Contracts</Link>
          <Link className="tab-button" to={`${base}/amc-schedule`}>Schedule</Link>
          <Link className="tab-button" to={`${base}/amc-renewals`}>Renewals</Link>
          <Link className="tab-button" to={`${base}/warranties`}>Warranties</Link>
        </div>
      </div>

      <div className="amc-kpi-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {contractKpis.map((item) => <AmcMetricCard key={item.label} {...item} />)}
      </div>

      {canCreateAmc && formOpen ? (
        <form className="surface amc-form-shell mt-6 p-5" onSubmit={submit}>
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">New Agreement</p>
              <h2 className="mt-1 text-xl font-black">Create AMC Contract</h2>
            </div>
            <button type="button" className="icon-button h-9 w-9" onClick={() => setFormOpen(false)} aria-label="Close AMC form"><X className="h-4 w-4" /></button>
          </div>
          <div className="grid gap-4">
            <AmcFormSection title="Customer Details" icon={Users}>
              <label>
                <span className="label">Existing customer</span>
                <select className="input" value={form.customerId} onChange={(event) => selectCustomer(event.target.value)}>
                  <option value="">Manual / new customer</option>
                  {customers.map((customer) => <option key={recordId(customer)} value={recordId(customer)}>{customer.name} - {customer.phone}</option>)}
                </select>
              </label>
              <label>
                <span className="label">Customer <span className="amc-required">Required</span></span>
                <input className="input" value={form.customerName} onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))} required />
              </label>
              <label>
                <span className="label">Phone <span className="amc-required">Required</span></span>
                <input className="input" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} required />
              </label>
              <label className="md:col-span-3">
                <span className="label">Address</span>
                <input className="input" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} />
              </label>
            </AmcFormSection>

            <AmcFormSection title="Contract Details" icon={ShieldCheck}>
              <label>
                <span className="label">Contract Type</span>
                <select className="input" value={form.contractType} onChange={(event) => setForm((current) => ({ ...current, contractType: event.target.value }))}>
                  {amcContractTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              <label>
                <span className="label">Coverage Type</span>
                <select className="input" value={form.coverageType} onChange={(event) => updateCoverageType(event.target.value)}>
                  {amcCoverageTypes.map((type) => <option key={type}>{type}</option>)}
                </select>
              </label>
              <label>
                <span className="label">Service Frequency</span>
                <select className="input" value={form.serviceFrequency} onChange={(event) => setForm((current) => ({ ...current, serviceFrequency: event.target.value }))}>
                  {amcFrequencies.map((frequency) => <option key={frequency}>{frequency}</option>)}
                </select>
              </label>
              {!isTechnician ? (
                <label>
                  <span className="label">Assigned Technician</span>
                  <select className="input" value={form.technicianId} onChange={(event) => setForm((current) => ({ ...current, technicianId: event.target.value }))}>
                    {/* Admin maps to empty technicianId because AMC visits already support null assignment. */}
                    <option value="">{ADMIN_ASSIGNMENT_LABEL}</option>
                    {technicians.map((tech) => <option key={recordId(tech)} value={recordId(tech)}>{tech.name}</option>)}
                  </select>
                </label>
              ) : null}
              <label>
                <span className="label">Included Visits</span>
                <input className="input" type="number" min="0" value={form.includedVisits} onChange={(event) => setForm((current) => ({ ...current, includedVisits: event.target.value }))} />
              </label>
              <label>
                <span className="label">Start Date <span className="amc-required">Required</span></span>
                <input className="input" type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} required />
              </label>
              <label>
                <span className="label">End Date <span className="amc-required">Required</span></span>
                <input className="input" type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} required />
              </label>
              <label className="amc-value-field">
                <span className="label">Contract Value</span>
                <input className="input" type="number" min="0" value={form.contractValue} onChange={(event) => setForm((current) => ({ ...current, contractValue: event.target.value }))} />
              </label>
              {form.coverageType === 'Custom AMC' ? (
                <div className="md:col-span-3 grid gap-3 sm:grid-cols-3">
                  {[
                    ['coverParts', 'Cover Parts'],
                    ['coverService', 'Cover Service'],
                    ['coverVisits', 'Cover Visits']
                  ].map(([key, label]) => (
                    <label key={key} className="flex min-h-11 items-center gap-3 rounded-card border border-white/10 bg-[var(--surface-2)] px-3 py-2 text-sm font-bold text-slate-100">
                      <input type="checkbox" checked={Boolean(form[key])} onChange={(event) => updateCustomCoverageFlag(key, event.target.checked)} />
                      {label}
                    </label>
                  ))}
                </div>
              ) : null}
            </AmcFormSection>

            <AmcFormSection title="Covered Devices" icon={Boxes}>
              <label className="md:col-span-3">
                <span className="label">Covered Devices / Assets</span>
                <textarea className="input amc-compact-textarea" value={form.coveredDevices} onChange={(event) => setForm((current) => ({ ...current, coveredDevices: event.target.value }))} placeholder="Example: office laptops, printer, CCTV DVR, network rack" />
              </label>
              <label>
                <span className="label">Device Brand <span className="amc-required">Required</span></span>
                <input className="input" value={form.deviceBrand} onChange={(event) => setForm((current) => ({ ...current, deviceBrand: event.target.value }))} maxLength={80} placeholder="Dell, HP, Lenovo, Epson, Hikvision..." required />
              </label>
              <label>
                <span className="label">Device Model</span>
                <input className="input" value={form.deviceModel} onChange={(event) => setForm((current) => ({ ...current, deviceModel: event.target.value }))} maxLength={80} placeholder="Inspiron 3511, LaserJet 1020, DS-2CE16D0..." />
              </label>
            </AmcFormSection>

            <AmcFormSection title="Warranty Details" icon={ShieldCheck}>
              <label>
                <span className="label">Warranty Included</span>
                <select
                  className="input"
                  value={form.warrantyIncluded ? 'Yes' : 'No'}
                  onChange={(event) => setForm((current) => ({
                    ...current,
                    warrantyIncluded: event.target.value === 'Yes'
                  }))}
                >
                  <option>No</option>
                  <option>Yes</option>
                </select>
              </label>
              {form.warrantyIncluded ? (
                <>
                  <label>
                    <span className="label">Warranty Start Date</span>
                    <input className="input" type="date" value={form.warrantyStartDate} onChange={(event) => setForm((current) => ({ ...current, warrantyStartDate: event.target.value }))} />
                  </label>
                  <label>
                    <span className="label">Warranty End Date</span>
                    <input className="input" type="date" value={form.warrantyEndDate} onChange={(event) => setForm((current) => ({ ...current, warrantyEndDate: event.target.value }))} />
                  </label>
                  <label className="md:col-span-3">
                    <span className="label">Warranty Covered Items</span>
                    <input
                      className="input"
                      value={form.warrantyCoveredItems}
                      onChange={(event) => setForm((current) => ({ ...current, warrantyCoveredItems: event.target.value }))}
                      placeholder="Example: CCTV camera, DVR, UPS battery, adapter"
                    />
                  </label>
                  <label className="md:col-span-3">
                    <span className="label">Warranty Terms / Notes</span>
                    <textarea
                      className="input amc-compact-textarea"
                      value={form.warrantyTerms}
                      onChange={(event) => setForm((current) => ({ ...current, warrantyTerms: event.target.value }))}
                      placeholder="Example: physical damage not covered, service warranty only"
                    />
                  </label>
                </>
              ) : null}
            </AmcFormSection>

            <AmcFormSection title="Notes" icon={ClipboardList}>
              <label className="md:col-span-3">
                <span className="label">Notes</span>
                <textarea className="input amc-notes-textarea" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} />
              </label>
            </AmcFormSection>
          </div>
          <div className="mt-5 flex justify-end">
            <button className="btn btn-primary h-10 px-4"><Save className="h-4 w-4" />Save AMC Contract</button>
          </div>
        </form>
      ) : null}

      <div className="surface amc-table-card mt-6 p-5">
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <SearchBox value={search} onChange={setSearch} placeholder="Search contract, customer, phone, service" />
          <Link className="btn btn-secondary" to={`${base}/amc-renewals`}><AlertTriangle className="h-4 w-4" />Renewals</Link>
        </div>
        {!visibleContracts.length ? (
          <EmptyState
            icon={FileText}
            title={hasContractSearch ? 'No contracts match your search' : 'No AMC contracts yet'}
            message={hasContractSearch ? 'Clear the search to view all AMC contracts.' : 'Create the first AMC contract to track visits, warranty coverage, and renewal reminders.'}
            action={hasContractSearch ? <button className="btn btn-secondary" type="button" onClick={() => setSearch('')}>Clear Search</button> : canCreateAmc ? <button className="btn btn-primary" type="button" onClick={() => setFormOpen(true)}>Create AMC Contract</button> : null}
          />
        ) : (
          <>
          {!isTechnician ? (
            <div className="amc-responsive-card-list">
              {visibleContracts.map((contract) => (
                <AmcContractCompactCard
                  key={recordId(contract)}
                  contract={contract}
                  menuOpen={actionMenuId === recordId(contract)}
                  actionMenuPosition={actionMenuPosition}
                  actionMenuRef={actionMenuRef}
                  setActionTriggerRef={setActionTriggerRef}
                  toggleActionMenu={toggleActionMenu}
                  closeActionMenu={closeActionMenu}
                  canCreateAmcJob={canCreateAmcJob}
                  canAssignTechnician={canAssignTechnician}
                  canDeleteAmc={canDeleteAmc}
                  setDetailsContract={setDetailsContract}
                  setReassignContract={setReassignContract}
                  setDeleteContract={setDeleteContract}
                  createJob={createJob}
                  navigate={navigate}
                  base={base}
                />
              ))}
            </div>
          ) : null}
          {isTechnician ? (
            <div className="technician-mobile-card-list amc-mobile-cards">
              {visibleContracts.map((contract) => (
                <TechnicianAmcContractMobileCard key={recordId(contract)} contract={contract} base={base} />
              ))}
            </div>
          ) : null}
          <div className={`table-wrap amc-table-wrap bg-[var(--surface)] ${isTechnician ? 'technician-desktop-table' : ''}`}>
            <table className="data-table amc-table amc-contracts-table">
            <thead><tr><th>Customer</th><th>Plan / Coverage</th><th>Period</th><th>AMC Payment</th><th>Extra Charges</th><th className="amc-status-header amc-status-divider text-center">Status</th><th className="amc-actions-header amc-actions-header-cell amc-actions-sticky text-center">Actions</th></tr></thead>
            <tbody>
              {visibleContracts.map((contract) => {
                const contractStatus = contract.renewalStatus === 'Renewal Due' ? contract.renewalStatus : contract.status;
                const invoiceId = recordId(contract.invoiceId);
                const payment = amcPaymentSummary(contract);
                const extra = extraChargeSummary(contract);
                const brandModel = amcDeviceBrandModel(contract);
                return (
                  <tr className="amc-contracts-row" key={recordId(contract)}>
                    <td>
                      <div className="amc-customer-cell">
                        <span className="amc-customer-name" title={contract.customerName || '-'}>{contract.customerName || '-'}</span>
                        <span className="amc-customer-phone">Phone: {contract.phone || '-'}</span>
                        <span className="amc-id-chip" title={contract.contractId || '-'}>{contract.contractId || '-'}</span>
                      </div>
                    </td>
                    <td>
                      <div className="amc-plan-cell">
                        <span className="amc-plan-title" title={contract.contractType || '-'}>{contract.contractType || '-'}</span>
                        <span className="amc-muted-badge" title={normalizeAmcCoverageType(contract.coverageType)}>{normalizeAmcCoverageType(contract.coverageType)}</span>
                        <span className="amc-plan-service" title={contract.coveredService || contract.coveredDevices || '-'}>{contract.coveredService || contract.coveredDevices || '-'}</span>
                        {brandModel ? <span className="amc-plan-service" title={brandModel}>Brand / Model: {brandModel}</span> : null}
                        {contract.warrantyIncluded ? <span className="amc-warranty-line">{amcWarrantyLine(contract)}</span> : null}
                      </div>
                    </td>
                    <td>
                      <div className="amc-period-cell">
                        <span>{formatDate(contract.startDate)}</span>
                        <span>to</span>
                        <b>{formatDate(contract.endDate)}</b>
                      </div>
                    </td>
                    <td className="amc-money-cell">
                      <div className="amc-money-card">
                        <AmcPaymentPill status={payment.status} hasInvoice={Boolean(invoiceId)} />
                        <div className="amc-money-row"><span className="amc-money-label">Contract Value</span><span className="amc-money-value">{currency(payment.contractValue)}</span></div>
                        <div className="amc-money-row"><span className="amc-money-label">AMC Paid</span><span className="amc-money-value">{currency(payment.paid)}</span></div>
                        <div className="amc-money-row"><span className="amc-money-label">AMC Pending</span><span className="amc-money-value">{currency(payment.pending)}</span></div>
                      </div>
                    </td>
                    <td className="amc-money-cell">
                      <div className="amc-money-card">
                        <ExtraChargePill status={extra.status} />
                        <div className="amc-money-row"><span className="amc-money-label">Extra Invoice Total</span><span className="amc-money-value">{currency(extra.total)}</span></div>
                        <div className="amc-money-row"><span className="amc-money-label">Extra Paid</span><span className="amc-money-value">{currency(extra.paid)}</span></div>
                        <div className="amc-money-row"><span className="amc-money-label">Extra Pending</span><span className="amc-money-value">{currency(extra.pending)}</span></div>
                      </div>
                    </td>
                    <td className="amc-status-cell amc-status-divider">
                      <AmcStatusPill status={contractStatus} />
                      <span className="mt-1 block text-xs muted">{amcRenewalHelper(contract)}</span>
                    </td>
                    <td className="amc-actions-cell amc-actions-column amc-actions-sticky text-center">
                      <div className="amc-row-action-wrap">
                        <div className="relative">
                          <button
                            type="button"
                            ref={(node) => setActionTriggerRef(recordId(contract), node)}
                            className="work-orders-more-button amc-actions-more-button"
                            onClick={() => toggleActionMenu(recordId(contract))}
                            aria-haspopup="menu"
                            aria-expanded={actionMenuId === recordId(contract)}
                            aria-label="More AMC contract actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        {actionMenuId === recordId(contract) && actionMenuPosition ? createPortal(
                          <div
                            ref={actionMenuRef}
                            className={`work-orders-more-menu amc-row-action-menu is-portal is-${actionMenuPosition.placement}`}
                            role="menu"
                            style={{
                              position: 'fixed',
                              top: `${actionMenuPosition.top}px`,
                              left: `${actionMenuPosition.left}px`,
                              width: `${actionMenuPosition.width}px`
                            }}
                          >
                            <button
                              type="button"
                              role="menuitem"
                              disabled={!canCreateAmcJob}
                              title={canCreateAmcJob ? 'Create service job from this AMC contract' : 'You do not have permission to create AMC jobs'}
                              onClick={() => { closeActionMenu(); createJob(contract); }}
                            >
                              <Wrench className="h-3.5 w-3.5" />
                              Create Job
                            </button>
                            <button type="button" role="menuitem" onClick={() => { setDetailsContract(contract); closeActionMenu(); }}>
                              <FileText className="h-3.5 w-3.5" />
                              View Details
                            </button>
                            {canAssignTechnician ? (
                              <button type="button" role="menuitem" onClick={() => { setReassignContract(contract); closeActionMenu(); }}>
                                <Users className="h-3.5 w-3.5" />
                                Reassign
                              </button>
                            ) : null}
                            <button
                              type="button"
                              role="menuitem"
                              disabled={!invoiceId}
                              title={invoiceId ? 'Open related payments' : 'Create an invoice before opening payments'}
                              onClick={() => { closeActionMenu(); navigate(`${base}/payments?invoiceId=${invoiceId}`); }}
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              Go to Payments
                            </button>
                            {canDeleteAmc ? (
                              <button
                                type="button"
                                role="menuitem"
                                className={contract.lifecycleAction === 'delete' ? 'work-orders-danger-menu-item' : 'work-orders-warning-menu-item'}
                                onClick={() => { setDeleteContract(contract); closeActionMenu(); }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                {contract.lifecycleAction === 'delete' ? 'Delete' : 'Archive'}
                              </button>
                            ) : null}
                          </div>,
                          document.body
                        ) : null}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
          </>
        )}
      </div>
      {detailsContract ? <AmcContractDetailsModal contract={detailsContract} onClose={() => setDetailsContract(null)} /> : null}
      {reassignContract ? (
        <AmcContractReassignModal
          contract={reassignContract}
          technicians={technicians}
          onClose={() => setReassignContract(null)}
          onSave={saveAmcAssignment}
        />
      ) : null}
      {deleteContract ? (
        <ConfirmModal
          title={deleteContract.lifecycleAction === 'delete' ? 'Delete AMC contract?' : 'Archive AMC contract?'}
          message={deleteContract.lifecycleAction === 'delete'
            ? 'This will permanently remove this AMC contract. This action cannot be undone.'
            : 'This hides the contract from active lists but keeps history, payments, and jobs safe.'}
          confirmLabel={deleteContract.lifecycleAction === 'delete' ? 'Delete Contract' : 'Archive Contract'}
          onCancel={() => setDeleteContract(null)}
          onConfirm={confirmDeleteOrArchiveContract}
        />
      ) : null}
    </div>
  );
}

function AmcContractDetailsModal({ contract, onClose }) {
  const payment = amcPaymentSummary(contract);
  const extra = extraChargeSummary(contract);
  const brandModel = amcDeviceBrandModel(contract);
  const detailStatus = contract.renewalStatus === 'Renewal Due' ? contract.renewalStatus : contract.status;
  const assigned = contract.technicianId && typeof contract.technicianId === 'object'
    ? contract.technicianId.name || contract.technicianId.username
    : (contract.visits || []).find((visit) => visit.technicianId)?.technicianId?.name;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4">
      <section className="surface admin-modal amc-details-modal w-full max-w-3xl p-5">
        <div className="amc-details-header">
          <div className="amc-details-title-block">
            <p className="amc-details-kicker">{contract.contractId || 'AMC Contract'}</p>
            <h2>AMC Contract Details</h2>
            <p>{contract.customerName || 'Customer'} - {contract.phone || '-'}</p>
          </div>
          <AmcStatusPill status={detailStatus} />
          <button type="button" className="icon-button h-9 w-9" onClick={onClose} aria-label="Close AMC contract details">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="amc-details-body">
          <div className="amc-details-section">
            <h3>Contract Info</h3>
            <div className="amc-details-grid">
              <AmcDetailItem label="Plan" value={contract.contractType || '-'} />
              <AmcDetailItem label="Coverage" value={normalizeAmcCoverageType(contract.coverageType)} />
              <AmcDetailItem label="Brand / Model" value={brandModel || 'Not specified'} />
              <AmcDetailItem label="Assigned To" value={assigned || ADMIN_ASSIGNMENT_LABEL} />
              <AmcDetailItem label="Period" value={`${formatDate(contract.startDate)} to ${formatDate(contract.endDate)}`} />
              <AmcDetailItem label="Visits" value={`${contract.visits?.length || 0} scheduled`} />
            </div>
          </div>

          <div className="amc-details-section">
            <h3>Payment Summary</h3>
            <div className="amc-details-grid">
              <AmcDetailItem label="AMC Payment Status" value={payment.status} />
              <AmcDetailItem label="AMC Pending" value={currency(payment.pending)} />
              <AmcDetailItem label="Extra Charges Status" value={extra.status} />
              <AmcDetailItem label="Extra Pending" value={currency(extra.pending)} />
            </div>
          </div>

          <div className="amc-details-section">
            <h3>Covered Devices / Service</h3>
            <div className="amc-detail-item amc-detail-item-wide">
              <span>Covered Devices / Service</span>
              <b>{contract.coveredService || contract.coveredDevices || '-'}</b>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function AmcDetailItem({ label, value }) {
  return (
    <div className="amc-detail-item">
      <span>{label}</span>
      <b>{value || '-'}</b>
    </div>
  );
}

function AmcContractReassignModal({ contract, technicians, onClose, onSave }) {
  const initialTechnicianId = recordId(contract.technicianId) || recordId((contract.visits || []).find((visit) => recordId(visit.technicianId))?.technicianId) || '';
  const [technicianId, setTechnicianId] = useState(initialTechnicianId);
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    let saved = false;
    try {
      await onSave(contract, technicianId);
      saved = true;
    } catch {
      // Parent owns the toast so the modal can stay focused on form state.
    } finally {
      if (!saved) setSaving(false);
    }
    if (saved) onClose();
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4">
      <form className="surface admin-modal w-full max-w-md p-5" onSubmit={submit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Reassign AMC Contract</h2>
            <p className="mt-1 text-sm muted">Choose Admin or an active technician for future AMC visits.</p>
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onClose} aria-label="Close reassignment modal">
            <X className="h-5 w-5" />
          </button>
        </div>
        <label className="mt-5 block">
          <span className="label">Assign to</span>
          <select className="input" value={technicianId} onChange={(event) => setTechnicianId(event.target.value)}>
            <option value="">{ADMIN_ASSIGNMENT_LABEL}</option>
            {technicians.map((tech) => <option key={recordId(tech)} value={recordId(tech)}>{tech.name}</option>)}
          </select>
        </label>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Assignment'}
          </button>
        </div>
      </form>
    </div>
  );
}

function TechnicianAmcContractMobileCard({ contract, base }) {
  const contractStatus = contract.renewalStatus === 'Renewal Due' ? contract.renewalStatus : contract.status;
  const invoiceId = recordId(contract.invoiceId);
  const visitWorkOrderId = recordId((contract.visits || []).find((visit) => recordId(visit.workOrderId))?.workOrderId);
  const payment = amcPaymentSummary(contract);
  const extra = extraChargeSummary(contract);
  const brandModel = amcDeviceBrandModel(contract);

  return (
    <article className="technician-mobile-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="technician-mobile-card-eyebrow">{contract.contractId || 'AMC Contract'}</p>
          <h2 className="technician-mobile-card-title" title={contract.customerName || 'Customer'}>{contract.customerName || 'Customer'}</h2>
          <p className="technician-mobile-card-muted">Phone: {contract.phone || '-'}</p>
        </div>
        <AmcStatusPill status={contractStatus} />
      </div>
      <div className="technician-mobile-card-body">
        <div>
          <span>Plan / Coverage</span>
          <b>{contract.contractType || '-'} / {normalizeAmcCoverageType(contract.coverageType)}</b>
        </div>
        <div>
          <span>Covered Devices</span>
          <p>{contract.coveredService || contract.coveredDevices || '-'}</p>
        </div>
        <div>
          <span>Brand / Model</span>
          <p>{brandModel || 'Not specified'}</p>
        </div>
        <div>
          <span>Period</span>
          <p>{formatDate(contract.startDate)} to {formatDate(contract.endDate)}</p>
        </div>
      </div>
      <div className="technician-detail-card-metrics">
        <span><b>{currency(payment.pending)}</b><small>AMC Pending</small></span>
        <span><b>{currency(extra.pending)}</b><small>Extra Pending</small></span>
        <span><b>{contract.visits?.length || 0}</b><small>Visits</small></span>
      </div>
      <div className="technician-mobile-card-footer">
        {visitWorkOrderId ? <Link className="btn btn-primary" to={`${base}/work-orders/${visitWorkOrderId}`}>View Job</Link> : null}
        {invoiceId ? <Link className="btn btn-secondary" to={`${base}/payments?invoiceId=${invoiceId}`}>View Payments</Link> : null}
        {!visitWorkOrderId && !invoiceId ? <span className="technician-mobile-readonly-pill">Read-only</span> : null}
      </div>
    </article>
  );
}

function AmcContractCompactCard({
  contract,
  menuOpen,
  actionMenuPosition,
  actionMenuRef,
  setActionTriggerRef,
  toggleActionMenu,
  closeActionMenu,
  canCreateAmcJob,
  canAssignTechnician,
  canDeleteAmc,
  setDetailsContract,
  setReassignContract,
  setDeleteContract,
  createJob,
  navigate,
  base
}) {
  const contractId = recordId(contract);
  const contractStatus = contract.renewalStatus === 'Renewal Due' ? contract.renewalStatus : contract.status;
  const invoiceId = recordId(contract.invoiceId);
  const payment = amcPaymentSummary(contract);
  const extra = extraChargeSummary(contract);
  const brandModel = amcDeviceBrandModel(contract);

  return (
    <article className="technician-mobile-card amc-responsive-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="technician-mobile-card-eyebrow">{contract.contractId || 'AMC Contract'}</p>
          <h2 className="technician-mobile-card-title" title={contract.customerName || 'Customer'}>{contract.customerName || 'Customer'}</h2>
          <p className="technician-mobile-card-muted">Phone: {contract.phone || '-'}</p>
        </div>
        <AmcStatusPill status={contractStatus} />
      </div>
      <div className="technician-mobile-card-body">
        <div>
          <span>Plan / Coverage</span>
          <b>{contract.contractType || '-'}</b>
          <p>{normalizeAmcCoverageType(contract.coverageType)} | {contract.coveredService || contract.coveredDevices || '-'}</p>
          {brandModel ? <p>Brand / Model: {brandModel}</p> : null}
          {contract.warrantyIncluded ? <p>{amcWarrantyLine(contract)}</p> : null}
        </div>
        <div>
          <span>Period</span>
          <p>{formatDate(contract.startDate)} to {formatDate(contract.endDate)}</p>
        </div>
      </div>
      <div className="technician-detail-card-metrics">
        <span><b>{currency(payment.pending)}</b><small>AMC Pending</small></span>
        <span><b>{currency(extra.pending)}</b><small>Extra Pending</small></span>
        <span><b>{amcRenewalHelper(contract) || '-'}</b><small>Status Note</small></span>
      </div>
      <div className="technician-mobile-card-footer amc-responsive-card-footer">
        {invoiceId ? (
          <Link className="btn btn-secondary" to={`${base}/payments?invoiceId=${invoiceId}`}>
            Go to Payments
          </Link>
        ) : (
          <span className="technician-mobile-readonly-pill">No invoice yet</span>
        )}
        <div className="relative ml-auto">
          <button
            type="button"
            ref={(node) => setActionTriggerRef(contractId, node)}
            className="work-orders-more-button amc-actions-more-button"
            onClick={() => toggleActionMenu(contractId)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="More AMC contract actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen && actionMenuPosition ? createPortal(
            <div
              ref={actionMenuRef}
              className={`work-orders-more-menu amc-row-action-menu is-portal is-${actionMenuPosition.placement}`}
              role="menu"
              style={{
                position: 'fixed',
                top: `${actionMenuPosition.top}px`,
                left: `${actionMenuPosition.left}px`,
                width: `${actionMenuPosition.width}px`
              }}
            >
              <button
                type="button"
                role="menuitem"
                disabled={!canCreateAmcJob}
                title={canCreateAmcJob ? 'Create service job from this AMC contract' : 'You do not have permission to create AMC jobs'}
                onClick={() => { closeActionMenu(); createJob(contract); }}
              >
                <Wrench className="h-3.5 w-3.5" />
                Create Job
              </button>
              <button type="button" role="menuitem" onClick={() => { setDetailsContract(contract); closeActionMenu(); }}>
                <FileText className="h-3.5 w-3.5" />
                View Details
              </button>
              {canAssignTechnician ? (
                <button type="button" role="menuitem" onClick={() => { setReassignContract(contract); closeActionMenu(); }}>
                  <Users className="h-3.5 w-3.5" />
                  Reassign
                </button>
              ) : null}
              <button
                type="button"
                role="menuitem"
                disabled={!invoiceId}
                title={invoiceId ? 'Open related payments' : 'Create an invoice before opening payments'}
                onClick={() => { closeActionMenu(); navigate(`${base}/payments?invoiceId=${invoiceId}`); }}
              >
                <CreditCard className="h-3.5 w-3.5" />
                Go to Payments
              </button>
              {canDeleteAmc ? (
                <button
                  type="button"
                  role="menuitem"
                  className={contract.lifecycleAction === 'delete' ? 'work-orders-danger-menu-item' : 'work-orders-warning-menu-item'}
                  onClick={() => { setDeleteContract(contract); closeActionMenu(); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {contract.lifecycleAction === 'delete' ? 'Delete' : 'Archive'}
                </button>
              ) : null}
            </div>,
            document.body
          ) : null}
        </div>
      </div>
    </article>
  );
}

function amcPaymentSummary(contract) {
  const invoice = contract?.invoiceId && typeof contract.invoiceId === 'object' ? contract.invoiceId : null;
  const rawContractValue = contract?.contractValue;
  const contractValue = Math.max(0, Number(rawContractValue !== undefined && rawContractValue !== null && rawContractValue !== '' ? rawContractValue : invoice?.total || 0) || 0);
  const paid = Math.max(0, Number(invoice?.paidAmount ?? 0) || 0);
  const pending = Math.max(0, contractValue - paid);
  let status = 'Pending';
  if (pending <= 0 && contractValue > 0) status = 'Paid';
  else if (paid > 0 && pending > 0) status = 'Partial';
  return { contractValue, paid, pending, status };
}

function extraChargeSummary(contract) {
  const extra = contract?.extraCharges || {};
  const total = Math.max(0, Number(extra.total || 0) || 0);
  const paid = Math.max(0, Number(extra.paid || 0) || 0);
  const pending = Math.max(0, Number(extra.pending ?? total - paid) || 0);
  let status = 'No Extra Invoice';
  if (total <= 0) status = 'No Extra Invoice';
  else if (pending <= 0) status = 'Paid';
  else if (paid > 0 && pending > 0) status = 'Partial';
  else status = 'Pending';
  return { total, paid, pending, status };
}

function amcWarrantyLine(contract) {
  if (!contract?.warrantyIncluded) return '';
  return contract.warrantyEndDate ? `Warranty: Active until ${formatDate(contract.warrantyEndDate)}` : 'Warranty: Included';
}

function amcRenewalHelper(contract) {
  if (!contract?.endDate) return '';
  if (contract.renewalStatus === 'Renewed') return 'Renewed';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(contract.endDate);
  end.setHours(0, 0, 0, 0);
  const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (Number.isNaN(daysLeft)) return '';
  if (daysLeft < 0) return `${Math.abs(daysLeft)} day${Math.abs(daysLeft) === 1 ? '' : 's'} overdue`;
  if (daysLeft === 0) return 'Expires today';
  if (daysLeft === 1) return 'Expires tomorrow';
  if (daysLeft <= 30) return `${daysLeft} days left`;
  return '';
}

function AmcMetricCard({ icon: Icon, label, value, helper, tone = 'blue' }) {
  return (
    <div className={`amc-metric-card amc-metric-${tone}`}>
      <div className="amc-metric-icon"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0">
        <p className="amc-metric-label">{label}</p>
        <p className="amc-metric-value" title={String(value)}>{value}</p>
        <p className="amc-metric-helper">{helper}</p>
      </div>
    </div>
  );
}

export function WarrantiesPage({ role = 'admin' }) {
  const { request, user } = useAuth();
  const isTechnician = normalizeRole(user?.role || role) === 'technician';
  const base = isTechnician ? '/app/tech' : '/app/admin';
  const { data, loading, error } = useResource(() => request('/amc/contracts'), [request]);
  const warrantyContracts = (data?.contracts || []).filter((contract) => Boolean(contract.warrantyIncluded));

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <div className="amc-module-page">
      <section className="amc-page-header mb-5">
        <div className="relative z-[1] flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--brand)]">AMC & Contracts</p>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Warranties</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Track warranty coverage linked to customer devices and service contracts.</p>
          </div>
          <Link className="btn btn-secondary h-10 px-4" to={`${base}/amc-contracts`}><FileText className="h-4 w-4" />Contracts</Link>
        </div>
      </section>
      <div className="surface mb-5 p-3">
        <div className="tabs-list amc-tabs border-b-0">
          <Link className="tab-button" to={`${base}/amc-contracts`}>Contracts</Link>
          <Link className="tab-button" to={`${base}/amc-schedule`}>Schedule</Link>
          <Link className="tab-button" to={`${base}/amc-renewals`}>Renewals</Link>
          <Link className="tab-button tab-button-active" to={`${base}/warranties`}>Warranties</Link>
        </div>
      </div>
      <div className="surface amc-table-card p-5">
        {!warrantyContracts.length ? (
          <EmptyState
            icon={ShieldCheck}
            title="No warranty records yet"
            message="Warranty records will appear here when linked to customer devices or AMC contracts."
          />
        ) : (
          <>
          {isTechnician ? (
            <div className="technician-mobile-card-list amc-mobile-cards">
              {warrantyContracts.map((contract) => (
                <TechnicianWarrantyMobileCard key={recordId(contract)} contract={contract} />
              ))}
            </div>
          ) : null}
          <div className={`table-wrap bg-[var(--surface)] ${isTechnician ? 'technician-desktop-table' : ''}`}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Contract ID</th>
                  <th>Customer</th>
                  <th>Warranty Period</th>
                  <th>Covered Items</th>
                  <th>Terms / Notes</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {warrantyContracts.map((contract) => (
                  <tr key={recordId(contract)}>
                    <td className="font-bold">{contract.contractId || '-'}</td>
                    <td>
                      <span className="block font-semibold text-slate-100">{contract.customerName || '-'}</span>
                      <span className="mt-1 block text-xs muted">{contract.phone || '-'}</span>
                    </td>
                    <td className="whitespace-nowrap">{formatDate(contract.warrantyStartDate)} to {formatDate(contract.warrantyEndDate)}</td>
                    <td className="max-w-[260px] text-sm muted">{contract.warrantyCoveredItems || contract.coveredDevices || '-'}</td>
                    <td className="max-w-[280px] text-sm muted">{contract.warrantyTerms || '-'}</td>
                    <td><AmcStatusPill status={contract.warrantyEndDate && new Date(contract.warrantyEndDate) < new Date() ? 'Expired' : 'Active'} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

function TechnicianWarrantyMobileCard({ contract }) {
  const warrantyStatus = contract.warrantyEndDate && new Date(contract.warrantyEndDate) < new Date() ? 'Expired' : 'Active';

  return (
    <article className="technician-mobile-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="technician-mobile-card-eyebrow">{contract.contractId || 'AMC Contract'}</p>
          <h2 className="technician-mobile-card-title" title={contract.customerName || 'Customer'}>{contract.customerName || 'Customer'}</h2>
          <p className="technician-mobile-card-muted">Phone: {contract.phone || '-'}</p>
        </div>
        <AmcStatusPill status={warrantyStatus} />
      </div>
      <div className="technician-mobile-card-body">
        <div>
          <span>Warranty Period</span>
          <b>{formatDate(contract.warrantyStartDate)} to {formatDate(contract.warrantyEndDate)}</b>
        </div>
        <div>
          <span>Covered Items</span>
          <p>{contract.warrantyCoveredItems || contract.coveredDevices || '-'}</p>
        </div>
        <div>
          <span>Terms / Notes</span>
          <p>{contract.warrantyTerms || '-'}</p>
        </div>
      </div>
    </article>
  );
}

function AmcFormSection({ title, icon: Icon, children }) {
  return (
    <section className="amc-form-section">
      <div className="amc-form-section-heading">
        <span className="amc-form-section-icon"><Icon className="h-4 w-4" /></span>
        <h3>{title}</h3>
      </div>
      <div className="grid gap-4 md:grid-cols-3">{children}</div>
    </section>
  );
}

function AmcPaymentPill({ status, hasInvoice = false }) {
  const tone = {
    Paid: 'amc-payment-paid',
    Partial: 'amc-payment-partial',
    Pending: 'amc-payment-pending'
  }[status] || 'amc-payment-pending';
  const title = {
    Paid: 'Contract fully paid',
    Partial: 'Customer paid partially',
    Pending: 'No payment recorded'
  }[status] || 'No payment recorded';
  return (
    <span className={`amc-payment-pill ${tone}`} title={title}>
      {hasInvoice && status === 'Paid' ? <ReceiptText className="h-3.5 w-3.5" /> : null}
      {status}
    </span>
  );
}

function ExtraChargePill({ status }) {
  const tone = {
    Paid: 'amc-payment-paid',
    Partial: 'amc-payment-partial',
    Pending: 'amc-payment-pending',
    'No Extra Invoice': 'amc-status-upcoming',
    None: 'amc-status-upcoming'
  }[status] || 'amc-status-upcoming';
  return <span className={`amc-payment-pill ${tone}`}>{status === 'None' ? 'No Extra Invoice' : status}</span>;
}

function AmcStatusPill({ status }) {
  const tone = {
    Active: 'amc-status-active',
    Renewed: 'amc-status-active',
    Upcoming: 'amc-status-upcoming',
    'Due Today': 'amc-status-due',
    Overdue: 'amc-status-overdue',
    Completed: 'amc-status-completed',
    'Renewal Due': 'amc-status-renewal',
    Expired: 'amc-status-expired',
    Cancelled: 'amc-status-cancelled'
  }[status] || 'amc-status-cancelled';
  return <span className={`amc-status-pill ${tone}`}>{status || '-'}</span>;
}
