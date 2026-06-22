import { MoreHorizontal, RefreshCw } from 'lucide-react';
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
  getWorkOrderDisplayId,
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
import { ResetPasswordModal, TechnicianAccountModal } from '../settings/SettingsPage.jsx';

export function TechnicianPanelPage() {
  const { request, user } = useAuth();
  const { push } = useToast();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [statusFilter, setStatusFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [confirmResetUser, setConfirmResetUser] = useState(null);
  const [confirmDisableUser, setConfirmDisableUser] = useState(null);
  const [disableUserBusy, setDisableUserBusy] = useState(false);
  const [actionMenuId, setActionMenuId] = useState('');
  const actionMenuRef = useRef(null);
  const { data, loading, error, reload } = useResource(async () => {
    const [usersResult, workOrdersResult] = await Promise.all([
      request('/users?role=technician&limit=100').catch(() => ({ users: [] })),
      request('/work-orders?limit=100').catch(() => ({ workOrders: [] }))
    ]);
    return {
      users: usersResult.users || [],
      workOrders: workOrdersResult.workOrders || []
    };
  }, [request]);
  const technicians = useMemo(
    () => (data?.users || [])
      .filter((user) => user.role === 'technician')
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))),
    [data?.users]
  );
  const workOrders = data?.workOrders || [];
  const assignedJobCounts = useMemo(() => workOrders.reduce((map, job) => {
    const technicianId = recordId(job.technicianId);
    if (technicianId) map[technicianId] = (map[technicianId] || 0) + 1;
    return map;
  }, {}), [workOrders]);
  const hasActiveFilters = Boolean(search.trim() || statusFilter || roleFilter);
  const roleOptions = useMemo(() => {
    const presentRoles = technicians.map(technicianRoleLabel).filter(Boolean);
    return Array.from(new Set(['Technician', 'Senior Technician', ...presentRoles]));
  }, [technicians]);
  const visibleTechnicians = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();
    return technicians.filter((tech) => {
      const role = technicianRoleLabel(tech);
      const status = tech.active ? 'Active' : 'Inactive';
      const searchText = `${tech.name || ''} ${tech.phone || ''} ${tech.email || ''} ${tech.username || ''} ${recordId(tech) || ''}`.toLowerCase();
      return (!query || searchText.includes(query))
        && (!statusFilter || status === statusFilter)
        && (!roleFilter || role === roleFilter);
    });
  }, [debouncedSearch, roleFilter, statusFilter, technicians]);
  const totalAssignedJobs = technicians.reduce((sum, tech) => sum + (assignedJobCounts[recordId(tech)] || 0), 0);
  const activeTechnicians = technicians.filter((tech) => tech.active).length;
  const lowWorkloadTechnicians = technicians.filter((tech) => tech.active && (assignedJobCounts[recordId(tech)] || 0) <= 1).length;
  const technicianKpis = [
    { icon: Users, label: 'Total Technicians', value: technicians.length, helper: 'All technician accounts', tone: 'blue' },
    { icon: CheckCircle2, label: 'Active Technicians', value: activeTechnicians, helper: 'Available for login', tone: 'green' },
    { icon: ShieldCheck, label: 'Available / Low Workload', value: lowWorkloadTechnicians, helper: lowWorkloadTechnicians === 0 ? 'No low-workload technicians right now.' : '0-1 assigned jobs', tone: 'cyan' },
    { icon: Wrench, label: 'Assigned Jobs', value: totalAssignedJobs, helper: 'Linked to technicians', tone: 'blue' }
  ];

  useEffect(() => {
    if (!actionMenuId) return undefined;

    function closeActionMenu(event) {
      if (actionMenuRef.current?.contains(event.target)) return;
      setActionMenuId('');
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') setActionMenuId('');
    }

    document.addEventListener('mousedown', closeActionMenu);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeActionMenu);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [actionMenuId]);

  function clearFilters() {
    setSearch('');
    setStatusFilter('');
    setRoleFilter('');
  }

  async function toggleStatus(technician) {
    try {
      await request(`/users/${recordId(technician)}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !technician.active })
      });
      push(technician.active ? 'Technician account disabled' : 'Technician account enabled');
      reload({ silent: true });
      return true;
    } catch (err) {
      push(err.message, 'error');
      return false;
    }
  }

  async function confirmDisableTechnician() {
    if (!confirmDisableUser || disableUserBusy) return;
    setDisableUserBusy(true);
    try {
      const saved = await toggleStatus(confirmDisableUser);
      if (saved) setConfirmDisableUser(null);
    } finally {
      setDisableUserBusy(false);
    }
  }

  async function createTechnician(form) {
    if (form.password !== form.confirmPassword) throw new Error('Passwords do not match');
    await request('/users', {
      method: 'POST',
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        username: form.username,
        password: form.password,
        role: 'technician',
        isActive: form.status === 'Active'
      })
    });
    push('Technician created');
    setAddOpen(false);
    reload({ silent: true });
  }

  async function updateTechnician(form) {
    await request(`/users/${recordId(editUser)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        name: form.name,
        phone: form.phone,
        username: form.username,
        role: 'technician',
        isActive: form.status === 'Active'
      })
    });
    push('Technician updated');
    setEditUser(null);
    reload({ silent: true });
  }

  async function resetPassword(password, confirmPassword) {
    if (password !== confirmPassword) throw new Error('Passwords do not match');
    await request(`/users/${recordId(resetUser)}/reset-password`, {
      method: 'PATCH',
      body: JSON.stringify({ password })
    });
    push('Temporary password updated. Share it securely with the technician.');
    setResetUser(null);
    reload({ silent: true });
  }

  function exportTechnicians() {
    downloadCsv(
      'technicians.csv',
      ['Technician', 'Phone', 'Email', 'Role', 'Status', 'Workload', 'Assigned Jobs', 'Last Active'],
      visibleTechnicians.map((tech) => {
        const techId = recordId(tech);
        const assignedJobs = assignedJobCounts[techId] || 0;
        const workload = technicianWorkload(assignedJobs);
        return [
          tech.name || 'Technician',
          tech.phone || '',
          tech.email || '',
          technicianRoleLabel(tech),
          tech.active ? 'Active' : 'Inactive',
          workload.label,
          assignedJobs,
          technicianLastActive(tech)
        ];
      })
    );
  }

  return (
    <div className="admin-control-page technician-panel-page">
      <section className="admin-control-hero technician-management-hero mb-5">
        <div className="technician-hero-content">
          <div className="relative z-[1] min-w-0">
            <p className="mb-2 text-xs font-black uppercase tracking-wide text-[var(--brand)]">Team Management</p>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Staff / Technicians</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Manage technicians, availability, workload, and assigned service jobs.</p>
          </div>
          <div className="technician-hero-side">
            <button type="button" className="btn btn-primary technician-hero-action" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Technician
            </button>
            <button type="button" className="btn btn-secondary technician-hero-action" onClick={exportTechnicians} disabled={!visibleTechnicians.length}>
              <Download className="h-4 w-4" />
              Export
            </button>
            <button type="button" className="btn btn-secondary technician-hero-action" onClick={() => reload({ silent: true })} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      <div className="technician-kpi-grid mb-5">
        {technicianKpis.map((item) => <TechnicianKpiCard key={item.label} {...item} />)}
      </div>

      <section className="surface admin-control-card p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="admin-control-icon">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black">Technician List</h2>
              <p className="mt-1 text-sm muted">Current technician accounts and assigned service-job counts.</p>
            </div>
          </div>
          <span className="admin-role-badge">{technicians.length} technicians</span>
        </div>

        <div className="technician-filter-row mb-5">
          <input className="input" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search technician by name or phone" />
          <select className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <select className="input" value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
            <option value="">All Roles</option>
            {roleOptions.map((role) => <option key={role} value={role}>{role}</option>)}
          </select>
          <button
            type="button"
            className={`btn btn-secondary admin-compact-button technician-clear-filter-button ${hasActiveFilters ? 'is-active' : 'is-idle'}`}
            disabled={!hasActiveFilters}
            onClick={clearFilters}
          >
            Clear Filters
          </button>
        </div>

        {loading ? (
          <div className="rounded-card border border-white/10 bg-white/[0.035] p-4 text-sm muted">Loading technicians...</div>
        ) : error ? (
          <ErrorBlock message={error} />
        ) : visibleTechnicians.length ? (
          <div className="table-wrap admin-table-wrap bg-[var(--surface)]">
            <table className="data-table technician-management-table technician-table">
              <colgroup>
                <col className="technician-col-name" />
                <col className="technician-col-contact" />
                <col className="technician-col-role" />
                <col className="technician-col-status" />
                <col className="technician-col-workload" />
                <col className="technician-col-jobs" />
                <col className="technician-col-active" />
                <col className="technician-col-action" />
              </colgroup>
              <thead>
                <tr>
                  <th>TECHNICIAN</th>
                  <th>CONTACT</th>
                  <th>ROLE</th>
                  <th>STATUS</th>
                  <th>WORKLOAD</th>
                  <th className="text-center">ASSIGNED JOBS</th>
                  <th>LAST ACTIVE</th>
                  <th className="text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {visibleTechnicians.map((tech) => {
                  const techId = recordId(tech);
                  const assignedJobs = assignedJobCounts[techId] || 0;
                  const workload = technicianWorkload(assignedJobs);
                  const jobsPath = `/app/admin/work-orders?technicianId=${techId}`;
                  return (
                    <tr key={techId}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="technician-avatar">
                            {technicianInitials(tech)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-100" title={tech.name}>{tech.name || 'Technician'}</p>
                            <p className="text-xs muted">{tech.username || techId || 'Login not available'}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <p className="technician-contact-line font-bold text-slate-100">
                          {tech.phone ? <PhoneCallIcon className="h-3.5 w-3.5" /> : null}
                          <span>{tech.phone || 'No phone added'}</span>
                        </p>
                      </td>
                      <td><span className="admin-role-badge">{technicianRoleLabel(tech)}</span></td>
                      <td><TechnicianStatusPill active={tech.active} /></td>
                      <td>
                        <div className="technician-workload-stack">
                          <span className={`technician-workload-badge technician-workload-${workload.tone}`}>{workload.label}</span>
                          <span className="technician-workload-helper">{workload.helper}</span>
                        </div>
                      </td>
                      <td className="text-center">
                        {assignedJobs > 0 ? (
                          <div className="technician-assigned-stack">
                            <Link className="technician-assigned-count technician-assigned-link" to={jobsPath}>{assignedJobs}</Link>
                          </div>
                        ) : (
                          <div className="technician-assigned-stack">
                            <span className="technician-assigned-count">{assignedJobs}</span>
                            <span className="technician-assigned-muted">No Jobs</span>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="technician-last-active font-semibold text-slate-200">{technicianLastActive(tech)}</span>
                      </td>
                      <td className="text-center">
                        <div className="technician-action-menu-wrap" ref={actionMenuId === techId ? actionMenuRef : null}>
                          <button
                            type="button"
                            className="icon-button technician-action-menu-button"
                            onClick={() => setActionMenuId((current) => (current === techId ? '' : techId))}
                            aria-label={`Open actions for ${tech.name || 'technician'}`}
                            aria-expanded={actionMenuId === techId}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                          {actionMenuId === techId ? (
                            <div className="technician-action-menu">
                              <Link className="technician-action-menu-item" to={jobsPath} onClick={() => setActionMenuId('')}>
                                <Wrench className="h-4 w-4" />
                                View Jobs
                              </Link>
                              <button type="button" className="technician-action-menu-item" onClick={() => { setActionMenuId(''); setConfirmResetUser(tech); }}>
                                <KeyRound className="h-4 w-4" />
                                Reset Password
                              </button>
                              {techId !== recordId(user) ? (
                                <button
                                  type="button"
                                  className="technician-action-menu-item"
                                  onClick={() => {
                                    setActionMenuId('');
                                    if (tech.active) setConfirmDisableUser(tech);
                                    else toggleStatus(tech);
                                  }}
                                >
                                  <ShieldCheck className="h-4 w-4" />
                                  {tech.active ? 'Disable' : 'Enable'}
                                </button>
                              ) : null}
                              <button type="button" className="technician-action-menu-item" onClick={() => { setActionMenuId(''); setEditUser(tech); }}>
                                <Edit3 className="h-4 w-4" />
                                Edit
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="technician-table-footer">
              Showing {visibleTechnicians.length ? 1 : 0} to {visibleTechnicians.length} of {technicians.length} technicians
            </div>
          </div>
        ) : (
          <EmptyState icon={Users} title="No technicians found." message={hasActiveFilters ? 'Try changing filters or add a new technician.' : 'Technician accounts will appear here after they are created.'} action={hasActiveFilters ? <button type="button" className="btn btn-secondary" onClick={clearFilters}>Clear Filters</button> : null} />
        )}
      </section>
      {confirmResetUser ? (
        <ConfirmModal
          title={`Reset password for ${confirmResetUser.name || 'this technician'}?`}
          message="A reset password action will let you set a new temporary password for this technician in the next step."
          confirmLabel="Continue"
          onCancel={() => setConfirmResetUser(null)}
          onConfirm={() => {
            setResetUser(confirmResetUser);
            setConfirmResetUser(null);
          }}
        />
      ) : null}
      {confirmDisableUser ? (
        <ConfirmModal
          title={`Disable ${confirmDisableUser.name || 'this technician'}?`}
          message="This technician will no longer be able to sign in until the account is enabled again."
          confirmLabel="Disable Account"
          loading={disableUserBusy}
          loadingLabel="Disabling..."
          onCancel={() => setConfirmDisableUser(null)}
          onConfirm={confirmDisableTechnician}
        />
      ) : null}
      {addOpen ? <TechnicianAccountModal title="Add Technician" submitLabel="Create Technician" onClose={() => setAddOpen(false)} onSubmit={createTechnician} /> : null}
      {editUser ? <TechnicianAccountModal title="Edit Technician" submitLabel="Save Changes" technician={editUser} editMode onClose={() => setEditUser(null)} onSubmit={updateTechnician} /> : null}
      {resetUser ? <ResetPasswordModal technician={resetUser} onClose={() => setResetUser(null)} onSubmit={resetPassword} /> : null}
    </div>
  );
}

function TechnicianKpiCard({ icon: Icon, label, value, helper, tone = 'blue' }) {
  return (
    <div className={`technician-kpi-card technician-kpi-${tone}`}>
      <div className="technician-kpi-icon"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0">
        <p className="technician-kpi-label">{label}</p>
        <p className="technician-kpi-value">{value}</p>
        <p className="technician-kpi-helper">{helper}</p>
      </div>
    </div>
  );
}

function technicianInitials(technician = {}) {
  const words = String(technician.name || technician.username || 'T').trim().split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase() || 'T';
}

function technicianRoleLabel(technician = {}) {
  if (technician.technicianTitle || technician.title || technician.designation) return technician.technicianTitle || technician.title || technician.designation;
  if (technician.role === 'admin') return 'Admin';
  return 'Technician';
}

function technicianWorkload(count = 0) {
  if (count <= 1) return { label: 'Low', helper: '0-1 jobs', tone: 'low' };
  if (count <= 5) return { label: 'Normal', helper: '2-5 jobs', tone: 'normal' };
  if (count <= 10) return { label: 'High', helper: '6-10 jobs', tone: 'high' };
  return { label: 'Overloaded', helper: '11+ jobs', tone: 'overloaded' };
}

function technicianLastActive(technician = {}) {
  const lastActive =
    technician.lastActiveAt ||
    technician.lastActive ||
    technician.lastLoginAt ||
    technician.lastLogin ||
    technician.lastSeenAt ||
    technician.lastSeen ||
    technician.updatedAt;

  if (!lastActive) return 'Never logged in';

  const date = new Date(lastActive);
  if (Number.isNaN(date.getTime())) return 'Never logged in';

  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday - startOfDate) / 86400000);
  const timeLabel = date
    .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
    .replace(/\s?(am|pm)$/i, (match) => match.toUpperCase());

  if (dayDiff === 0) return `Today, ${timeLabel}`;
  if (dayDiff === 1) return `Yesterday, ${timeLabel}`;

  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function TechnicianStatusPill({ active }) {
  return (
    <span className={`admin-status-pill ${active ? 'admin-status-active' : 'admin-status-inactive'}`}>
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
