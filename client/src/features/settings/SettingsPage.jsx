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
    <div className="surface p-5">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-card bg-sky-400/15 text-[var(--brand)]">
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
  const { request } = useAuth();
  const { push } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const { data, loading, error, reload } = useResource(() => request('/users'), [request]);

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
      await request(`/users/${technician.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ active: !technician.active })
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
        technicianTitle: form.technicianTitle,
        active: form.status === 'Active'
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
        technicianTitle: form.technicianTitle,
        active: form.status === 'Active'
      })
    });
    push('Technician updated');
    setEditUser(null);
    reload({ silent: true });
  }

  async function resetPassword(password, confirmPassword) {
    if (password !== confirmPassword) throw new Error('Passwords do not match');
    await request(`/users/${resetUser.id}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ password })
    });
    push('Temporary password updated. Share it securely with the technician.');
    setResetUser(null);
    reload({ silent: true });
  }

  return (
    <div className="surface p-5 lg:col-span-2">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-card bg-sky-400/15 text-[var(--brand)]">
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
        <button type="button" className="btn btn-primary shrink-0" onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Technician
        </button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          ['Total Technicians', technicians.length],
          ['Active Technicians', activeCount],
          ['Disabled Accounts', disabledCount]
        ].map(([label, value]) => (
          <div key={label} className="rounded-card border border-white/10 bg-white/[0.045] p-3">
            <p className="text-xs font-black uppercase text-[var(--brand)]">{label}</p>
            <p className="mt-1 text-2xl font-black">{value}</p>
          </div>
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
          <div className="table-wrap bg-[var(--surface)]">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Technician</th>
                  <th>Username / Phone</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {technicians.map((tech) => (
                  <tr key={tech.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-card bg-sky-400/15 text-sm font-black text-sky-100">
                          {tech.name?.slice(0, 1) || 'T'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold">{tech.name}</p>
                          <p className="text-xs muted">Employee login account</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <p className="font-bold">{tech.username}</p>
                      <p className="text-xs muted">{tech.phone || 'No phone added'}</p>
                    </td>
                    <td>{tech.technicianTitle || 'Technician'}</td>
                    <td>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tech.active ? 'bg-emerald-400/15 text-emerald-100' : 'bg-slate-500/20 text-slate-200'}`}>
                        {tech.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>{tech.updatedAt ? formatDate(tech.updatedAt) : '-'}</td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn btn-secondary" onClick={() => setResetUser(tech)}>
                          <KeyRound className="h-4 w-4" />
                          Reset Password
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => toggleStatus(tech)}>
                          {tech.active ? 'Disable' : 'Enable'}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => setEditUser(tech)}>
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
            title="No technician accounts"
            message="Create technician credentials here so service staff can sign in to the technician panel."
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
      <form className="surface max-h-[92vh] w-full max-w-2xl overflow-y-auto p-5" onSubmit={submit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black">{title}</h2>
            <p className="mt-1 text-sm muted">Technician credentials are encrypted before storage.</p>
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onClose} aria-label="Close technician modal">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label>
            <span className="label">Technician Name</span>
            <input className="input" value={form.name} onChange={(event) => update('name', event.target.value)} required />
          </label>
          <label>
            <span className="label">Phone</span>
            <input className="input" value={form.phone} onChange={(event) => update('phone', event.target.value)} />
          </label>
          <label>
            <span className="label">Username</span>
            <input className="input" value={form.username} onChange={(event) => update('username', event.target.value)} required />
          </label>
          <label>
            <span className="label">Role</span>
            <select className="input" value={form.technicianTitle} onChange={(event) => update('technicianTitle', event.target.value)}>
              <option>Technician</option>
              <option>Senior Technician</option>
            </select>
          </label>
          {!editMode ? (
            <>
              <label>
                <span className="label">Temporary Password</span>
                <input className="input" type="password" value={form.password} onChange={(event) => update('password', event.target.value)} minLength={6} required />
              </label>
              <label>
                <span className="label">Confirm Password</span>
                <input className="input" type="password" value={form.confirmPassword} onChange={(event) => update('confirmPassword', event.target.value)} minLength={6} required />
              </label>
            </>
          ) : null}
          <label>
            <span className="label">Status</span>
            <select className="input" value={form.status} onChange={(event) => update('status', event.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </label>
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
      <form className="surface w-full max-w-md p-5" onSubmit={submit}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-black">Reset Password</h2>
            <p className="mt-1 text-sm muted">{technician.name} will use this temporary password for technician login.</p>
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

export function SystemSettingsPage() {
  return (
    <>
      <PageHeader title="Settings" eyebrow="System">
        Review workspace identity, access, and operational defaults.
      </PageHeader>
      <div className="grid gap-5 lg:grid-cols-2">
        <SettingsInfoCard title="Workspace Profile" icon={ShieldCheck}>
          <div className="mt-4 grid gap-3">
            {[
              ['Company', company.name],
              ['Location', company.address],
              ['Phone', company.phones.join(' / ')],
              ['Email', company.email]
            ].map(([label, value]) => (
              <div key={label} className="rounded-card bg-[var(--surface-2)] p-3">
                <p className="text-xs font-black uppercase text-[var(--brand)]">{label}</p>
                <p className="mt-1 font-bold">{value}</p>
              </div>
            ))}
          </div>
        </SettingsInfoCard>
        <SettingsInfoCard title="System Access" icon={KeyRound}>
          <div className="mt-4 grid gap-3">
            <div className="rounded-card bg-[var(--surface-2)] p-3">
              <p className="text-xs font-black uppercase text-[var(--brand)]">Admin Sidebar</p>
              <p className="mt-1 font-bold">Dashboard, operations, customers, inventory, billing, AMC, reports, audit logs, and settings.</p>
            </div>
            <div className="rounded-card bg-[var(--surface-2)] p-3">
              <p className="text-xs font-black uppercase text-[var(--brand)]">Audit Trail</p>
              <p className="mt-1 font-bold">Operational changes remain available from System / Audit Logs.</p>
            </div>
          </div>
        </SettingsInfoCard>
        <TeamAccessSection />
      </div>
    </>
  );
}
