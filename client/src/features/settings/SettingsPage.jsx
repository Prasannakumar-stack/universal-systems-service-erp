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

const emptyTechnicianForm = {
  name: '',
  phone: '',
  username: '',
  password: '',
  confirmPassword: '',
  technicianTitle: 'Technician',
  status: 'Active'
};

function SettingsInfoCard({ title, icon: Icon, children }) {
  return (
    <div className="surface admin-control-card p-5">
      <div className="flex items-start gap-3">
        <div className="admin-control-icon">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-black">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}

function TeamAccessSection() {
  const { request, user } = useAuth();
  const { push } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const { data, loading, error, reload } = useResource(() => request('/users?role=technician&limit=100'), [request]);

  const technicians = useMemo(
    () => (data?.users || [])
      .filter((user) => user.role === 'technician')
      .sort((a, b) => a.name.localeCompare(b.name)),
    [data?.users]
  );
  const activeCount = technicians.filter((tech) => tech.active).length;
  const disabledCount = technicians.length - activeCount;

  async function toggleStatus(technician) {
    try {
      await request(`/users/${technician.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !technician.active })
      });
      push(technician.active ? 'Technician account disabled' : 'Technician account enabled');
      reload({ silent: true });
    } catch (err) {
      push(err.message, 'error');
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
    await request(`/users/${editUser.id}`, {
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
    await request(`/users/${resetUser.id}/reset-password`, {
      method: 'PATCH',
      body: JSON.stringify({ password })
    });
    push('Temporary password updated. Share it securely with the technician.');
    setResetUser(null);
    reload({ silent: true });
  }

  return (
    <div className="surface admin-control-card team-access-card p-5 lg:col-span-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="admin-control-icon">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black">Team & Access</h2>
              <span className="rounded-full border border-amber-300/25 bg-amber-300/10 px-2.5 py-1 text-[10px] font-black uppercase text-amber-100">Admin only</span>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 muted">Manage technician login access, temporary passwords, and account status.</p>
          </div>
        </div>
        <button type="button" className="btn btn-primary admin-compact-button shrink-0" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Technician
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { icon: Users, label: 'Total Technicians', value: technicians.length, helper: 'All technician logins', tone: 'blue' },
          { icon: CheckCircle2, label: 'Active Technicians', value: activeCount, helper: 'Can access technician panel', tone: 'green' },
          { icon: AlertTriangle, label: 'Disabled Accounts', value: disabledCount, helper: 'Login blocked', tone: 'gray' }
        ].map((item) => (
          <AdminMetricCard key={item.label} {...item} />
        ))}
      </div>

      <div className="mt-4 rounded-card border border-white/10 bg-white/[0.035] p-3 text-sm muted">
        Passwords are encrypted and cannot be viewed after saving.
      </div>

      <div className="mt-5">
        {loading ? (
          <div className="rounded-card border border-[var(--line)] bg-[var(--surface-2)] p-4 text-sm muted">Loading technician accounts...</div>
        ) : error ? (
          <div className="rounded-card border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-100">Unable to load technician accounts.</div>
        ) : technicians.length ? (
          <div className="table-wrap admin-table-wrap bg-[var(--surface)]">
            <table className="data-table team-access-table">
              <thead>
                <tr>
                  <th>Technician</th>
                  <th>Username / Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created / Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {technicians.map((tech) => (
                  <tr key={tech.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="team-avatar">
                          {tech.name?.slice(0, 1) || 'T'}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-100" title={tech.name}>{tech.name}</p>
                          <p className="text-xs muted">Employee login account</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="font-bold text-slate-100">{tech.username}</p>
                      <p className="text-xs muted">{tech.phone || 'No phone added'}</p>
                    </td>
                    <td><span className="admin-role-badge">{tech.role === 'admin' ? 'Admin' : 'Technician'}</span></td>
                    <td>
                      <AccountStatusPill active={tech.active} />
                    </td>
                    <td>
                      <span className="block font-semibold text-slate-200">{tech.createdAt ? formatDate(tech.createdAt) : '-'}</span>
                      <span className="block text-xs muted">{tech.updatedAt ? `Updated ${formatDate(tech.updatedAt)}` : 'No update yet'}</span>
                    </td>
                    <td className="text-right">
                      <div className="admin-row-actions">
                        <button type="button" className="btn btn-primary admin-table-button" onClick={() => setResetUser(tech)}>
                          <KeyRound className="h-4 w-4" />
                          Reset Password
                        </button>
                        {tech.id !== user?.id ? (
                          <button type="button" className="btn btn-secondary admin-table-button" onClick={() => toggleStatus(tech)}>
                            {tech.active ? 'Disable' : 'Enable'}
                          </button>
                        ) : null}
                        <button type="button" className="btn btn-secondary admin-table-button" onClick={() => setEditUser(tech)}>
                          <Edit3 className="h-4 w-4" />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No team members found"
            message="Add your first admin or technician."
            action={
              <button type="button" className="btn btn-primary" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" />
                Add Technician
              </button>
            }
          />
        )}
      </div>

      {addOpen ? <TechnicianAccountModal title="Add Technician" submitLabel="Create Technician" onClose={() => setAddOpen(false)} onSubmit={createTechnician} /> : null}
      {editUser ? <TechnicianAccountModal title="Edit Technician" submitLabel="Save Changes" technician={editUser} editMode onClose={() => setEditUser(null)} onSubmit={updateTechnician} /> : null}
      {resetUser ? <ResetPasswordModal technician={resetUser} onClose={() => setResetUser(null)} onSubmit={resetPassword} /> : null}
    </div>
  );
}

function TechnicianAccountModal({ title, submitLabel, technician = null, editMode = false, onClose, onSubmit }) {
  const { push } = useToast();
  const [form, setForm] = useState(() => technician ? {
    name: technician.name || '',
    phone: technician.phone || '',
    username: technician.username || '',
    password: '',
    confirmPassword: '',
    technicianTitle: technician.technicianTitle || 'Technician',
    status: technician.active ? 'Active' : 'Inactive'
  } : emptyTechnicianForm);
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(form);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4">
      <form className="surface admin-modal max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5" onSubmit={submit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">{title}</h2>
            <p className="mt-1 text-sm muted">{editMode ? 'Update technician profile, role, and account status.' : 'Create technician login access with a temporary password.'}</p>
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onClose} aria-label="Close technician modal">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 rounded-card border border-white/10 bg-white/[0.035] p-4">
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[var(--brand)]" />
            <h3 className="font-black">Login Details</h3>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className="label">Technician Name <RequiredMark /></span>
            <input className="input" value={form.name} onChange={(event) => update('name', event.target.value)} required />
          </label>
          <label>
            <span className="label">Phone</span>
            <input className="input" value={form.phone} onChange={(event) => update('phone', event.target.value)} />
          </label>
          <label>
            <span className="label">Username <RequiredMark /></span>
            <input className="input" value={form.username} onChange={(event) => update('username', event.target.value)} required />
          </label>
          <label>
            <span className="label">System Role</span>
            <select className="input" value="Technician" disabled>
              <option>Technician</option>
            </select>
            <span className="mt-1 block text-xs muted">Only Admin and Technician roles are enabled.</span>
          </label>
          {!editMode ? (
            <>
              <label>
                <span className="label">Temporary Password <RequiredMark /></span>
                <input className="input" type="password" value={form.password} onChange={(event) => update('password', event.target.value)} minLength={6} required />
                <span className="mt-1 block text-xs muted">Use a temporary password. Technician can use it for login.</span>
              </label>
              <label>
                <span className="label">Confirm Password <RequiredMark /></span>
                <input className="input" type="password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} minLength={6} required />
                <span className={`mt-1 block text-xs font-semibold ${form.confirmPassword && form.password !== form.confirmPassword ? 'text-amber-100' : 'muted'}`}>{form.confirmPassword && form.password !== form.confirmPassword ? 'Passwords do not match yet.' : 'Repeat the temporary password.'}</span>
              </label>
            </>
          ) : null}
          <label>
            <span className="label">Status</span>
            <select className="input" value={form.status} onChange={(event) => update('status', event.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
            <span className="mt-1 block text-xs muted">Active accounts can log in. Inactive accounts are blocked.</span>
          </label>
          </div>
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function ResetPasswordModal({ technician, onClose, onSubmit }) {
  const { push } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    try {
      await onSubmit(password, confirmPassword);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4">
      <form className="surface admin-modal w-full max-w-md p-5" onSubmit={submit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Reset Technician Password</h2>
            <p className="mt-1 text-sm muted">This will replace the technician's current password with a new temporary password.</p>
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onClose} aria-label="Close password reset modal">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          <label>
            <span className="label">New Temporary Password</span>
            <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={6} required />
          </label>
          <label>
            <span className="label">Confirm Password</span>
            <input className="input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={6} required />
            <span className={`mt-1 block text-xs font-semibold ${confirmPassword && password !== confirmPassword ? 'text-amber-100' : 'muted'}`}>{confirmPassword && password !== confirmPassword ? 'Passwords do not match yet.' : `${technician.name} will use this for technician login.`}</span>
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving}>
            <KeyRound className="h-4 w-4" />
            {saving ? 'Saving...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
}

function AdminMetricCard({ icon: Icon, label, value, helper, tone = 'blue' }) {
  return (
    <div className={`admin-metric-card admin-metric-${tone}`}>
      <div className="admin-metric-icon"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0">
        <p className="admin-metric-label">{label}</p>
        <p className="admin-metric-value">{value}</p>
        <p className="admin-metric-helper">{helper}</p>
      </div>
    </div>
  );
}

function SettingsInfoItem({ icon: Icon, label, value }) {
  return (
    <div className="settings-info-item">
      <Icon className="h-4 w-4 text-[var(--brand)]" />
      <div className="min-w-0">
        <p className="text-xs font-black uppercase text-slate-400">{label}</p>
        <p className="mt-1 break-words font-bold text-slate-100">{value}</p>
      </div>
    </div>
  );
}

function AccessSummaryItem({ title, description }) {
  return (
    <div className="access-summary-item">
      <CheckCircle2 className="h-4 w-4 text-emerald-200" />
      <div>
        <p className="font-black text-slate-100">{title}</p>
        <p className="mt-1 text-sm leading-6 muted">{description}</p>
      </div>
    </div>
  );
}

function SecurityNotesCard() {
  const notes = [
    'Passwords are encrypted and cannot be viewed after saving.',
    'Reset password creates a new temporary login password.',
    'Disabled accounts cannot access the technician panel.',
    'Audit logs help track important system changes.'
  ];
  return (
    <SettingsInfoCard title="Security Notes" icon={ShieldCheck}>
      <div className="mt-4 grid gap-3">
        {notes.map((note) => (
          <div key={note} className="security-note-item">
            <KeyRound className="h-4 w-4 text-amber-100" />
            <p className="text-sm font-semibold text-slate-200">{note}</p>
          </div>
        ))}
      </div>
    </SettingsInfoCard>
  );
}

function RequiredMark() {
  return <span className="admin-required-mark">Required</span>;
}

function AccountStatusPill({ active }) {
  return <span className={`admin-status-pill ${active ? 'admin-status-active' : 'admin-status-inactive'}`}>{active ? 'Active' : 'Inactive'}</span>;
}

export function SystemSettingsPage() {
  return (
    <div className="admin-control-page settings-page">
      <section className="admin-control-hero mb-5">
        <div className="relative z-[1]">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">System</p>
            <span className="admin-premium-badge">Admin Control Center</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Settings</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 muted">Manage workspace identity, team access, security, and operational defaults.</p>
        </div>
      </section>
      <div className="grid gap-5 lg:grid-cols-2">
        <SettingsInfoCard title="Workspace Profile" icon={ShieldCheck}>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {[
              { icon: ShieldCheck, label: 'Company', value: company.name },
              { icon: CalendarClock, label: 'Location', value: company.address },
              { icon: PhoneCallIcon, label: 'Phone', value: company.phones.join(' / ') },
              { icon: Send, label: 'Email', value: company.email }
            ].map((item) => <SettingsInfoItem key={item.label} {...item} />)}
          </div>
        </SettingsInfoCard>
        <SettingsInfoCard title="System Access" icon={KeyRound}>
          <div className="mt-4 grid gap-3">
            <AccessSummaryItem title="Admin Sidebar" description="Full access to operations, billing, inventory, AMC, reports, audit logs, and settings." />
            <AccessSummaryItem title="Audit Trail" description="Important operational changes are recorded in audit logs." />
            <AccessSummaryItem title="Role Access" description="Admins manage the system. Technicians access assigned jobs." />
            <AccessSummaryItem title="Technician Login" description="Technician credentials are managed from Team & Access." />
          </div>
        </SettingsInfoCard>
        <SecurityNotesCard />
        <TeamAccessSection />
      </div>
    </div>
  );
}
