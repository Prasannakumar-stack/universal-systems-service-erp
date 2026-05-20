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
import { Palette } from 'lucide-react';
import { themePreferenceOptions, useThemePreference } from '../../utils/theme.js';

const emptyTechnicianForm = {
  name: '',
  phone: '',
  username: '',
  password: '',
  confirmPassword: '',
  technicianTitle: 'Technician',
  status: 'Active'
};

const settingsTabs = [
  { id: 'workspace', label: 'Workspace Profile' },
  { id: 'security', label: 'Security' },
  { id: 'team', label: 'Team Access' },
  { id: 'preferences', label: 'Preferences' }
];

function SettingsInfoCard({ title, icon: Icon, children, action = null, className = '' }) {
  return (
    <div className={`surface admin-control-card p-5 ${className}`}>
      <div className="flex items-start gap-3">
        <div className="admin-control-icon">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="text-xl font-black">{title}</h2>
            {action}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function TeamAccessSection() {
  const { request } = useAuth();
  const { data, loading, error } = useResource(async () => {
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
      .sort((a, b) => a.name.localeCompare(b.name)),
    [data?.users]
  );
  const assignedJobCounts = useMemo(() => (data?.workOrders || []).reduce((map, job) => {
    const technicianId = recordId(job.technicianId);
    if (technicianId) map[technicianId] = (map[technicianId] || 0) + 1;
    return map;
  }, {}), [data?.workOrders]);
  const activeCount = technicians.filter((tech) => tech.active).length;
  const disabledCount = technicians.length - activeCount;
  const lowWorkloadCount = technicians.filter((tech) => tech.active && (assignedJobCounts[recordId(tech)] || 0) <= 1).length;

  return (
    <div className="surface admin-control-card team-access-card p-5">
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
        <Link className="btn btn-primary admin-compact-button shrink-0" to="/admin/technician-panel">
          <Users className="h-4 w-4" />
          Manage Staff / Technicians
        </Link>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: CheckCircle2, label: 'Active Technicians', value: loading ? '-' : activeCount, helper: 'Can access technician panel', tone: 'green' },
          { icon: AlertTriangle, label: 'Disabled Accounts', value: loading ? '-' : disabledCount, helper: 'Login blocked', tone: 'gray' },
          { icon: Users, label: 'Total Technicians', value: loading ? '-' : technicians.length, helper: 'All technician logins', tone: 'blue' },
          { icon: ShieldCheck, label: 'Available / Low Workload', value: loading ? '-' : lowWorkloadCount, helper: '0-1 assigned jobs', tone: 'cyan' }
        ].map((item) => (
          <AdminMetricCard key={item.label} {...item} />
        ))}
      </div>

      {error ? <div className="mt-4 rounded-card border border-rose-400/30 bg-rose-500/10 p-3 text-sm text-rose-100">Unable to load team summary.</div> : null}
    </div>
  );
}

export function TechnicianAccountModal({ title, submitLabel, technician = null, editMode = false, onClose, onSubmit }) {
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

export function ResetPasswordModal({ technician, onClose, onSubmit }) {
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

function ThemePreferenceButtons({ value, onChange }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {themePreferenceOptions.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            className={`btn justify-center ${active ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function AccountStatusPill({ active }) {
  return <span className={`admin-status-pill ${active ? 'admin-status-active' : 'admin-status-inactive'}`}>{active ? 'Active' : 'Inactive'}</span>;
}

export function SystemSettingsPage() {
  const { push } = useToast();
  const { themePreference, resolvedTheme, setThemePreference } = useThemePreference();
  const [activeTab, setActiveTab] = useState('workspace');
  const [preferences, setPreferences] = useState({
    defaultNotifications: true,
    dashboardFocus: true,
    pdfDocuments: true
  });
  const lastUpdatedTime = useMemo(
    () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    []
  );

  function exportSettings() {
    downloadCsv('settings-export.csv', ['Setting', 'Value'], [
      ['Company', company.name],
      ['Location', company.address],
      ['Phone', company.phones.join(' / ')],
      ['Email', company.email],
      ['Theme', themePreferenceOptions.find((option) => option.value === themePreference)?.label || 'System Default'],
      ['Default Notifications', preferences.defaultNotifications ? 'Enabled' : 'Disabled'],
      ['Dashboard Preferences', preferences.dashboardFocus ? 'Enabled' : 'Disabled'],
      ['PDF / Document Preferences', preferences.pdfDocuments ? 'Enabled' : 'Disabled']
    ]);
  }

  function updatePreference(key) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  }

  function savePreferences() {
    push('Preferences saved locally');
  }

  function updateThemePreference(nextPreference) {
    setThemePreference(nextPreference);
    push('Theme preference saved locally');
  }

  return (
    <div className="admin-control-page settings-page">
      <section className="admin-control-hero mb-5">
        <div className="settings-hero-content">
          <div className="relative z-[1] min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">SYSTEM</p>
              <span className="admin-premium-badge">ADMIN CONTROL CENTER</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Settings</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Manage workspace identity, team access, security, and operational defaults.</p>
          </div>
          <div className="settings-hero-actions">
            <div className="settings-last-updated">
              <CalendarClock className="h-4 w-4 text-[var(--brand-2)]" />
              Last updated: Today, {lastUpdatedTime}
            </div>
            <button type="button" className="btn btn-secondary admin-compact-button" onClick={exportSettings}>
              <Download className="h-4 w-4" />
              Export Settings
            </button>
            <Link className="btn btn-secondary admin-compact-button" to="/admin/audit-logs">
              <ReceiptText className="h-4 w-4" />
              View Audit Logs
            </Link>
          </div>
        </div>
      </section>

      <div className="surface settings-tabs-card p-2">
        <div className="tabs-list amc-tabs settings-tabs border-b-0">
          {settingsTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-button ${activeTab === tab.id ? 'tab-button-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {activeTab === 'workspace' ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <SettingsInfoCard
              title="Workspace Profile"
              icon={ShieldCheck}
              className="lg:col-span-2"
              action={(
                <button type="button" className="btn btn-secondary admin-compact-button" onClick={() => push('Workspace profile editing is not connected yet')}>
                  <Edit3 className="h-4 w-4" />
                  Edit Profile
                </button>
              )}
            >
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { icon: ShieldCheck, label: 'Company', value: company.name },
                  { icon: CalendarClock, label: 'Location', value: company.address },
                  { icon: PhoneCallIcon, label: 'Phone', value: company.phones.join(' / ') },
                  { icon: Send, label: 'Email', value: company.email }
                ].map((item) => <SettingsInfoItem key={item.label} {...item} />)}
              </div>
            </SettingsInfoCard>
          </div>
        ) : null}

        {activeTab === 'security' ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <SecurityNotesCard />
            <SettingsInfoCard title="System Access" icon={KeyRound}>
              <div className="mt-4 grid gap-3">
                <AccessSummaryItem title="Admin Sidebar" description="Full access to operations, billing, inventory, AMC, reports, audit logs, and settings." />
                <AccessSummaryItem title="Audit Trail" description="Important operational changes are recorded in audit logs." />
                <AccessSummaryItem title="Role Access" description="Admins manage the system. Technicians access assigned jobs." />
                <AccessSummaryItem title="Technician Login" description="Technician credentials are managed from Staff / Technicians." />
              </div>
            </SettingsInfoCard>
          </div>
        ) : null}

        {activeTab === 'team' ? (
          <TeamAccessSection />
        ) : null}

        {activeTab === 'preferences' ? (
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="surface admin-control-card settings-preference-card p-5">
              <div className="flex items-start gap-3">
                <div className="admin-control-icon">
                  <Palette className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg font-black">Appearance / Theme</h2>
                  <p className="mt-2 text-sm leading-6 muted">Choose the local app theme for this device.</p>
                </div>
              </div>
              <div className="mt-5">
                <ThemePreferenceButtons value={themePreference} onChange={updateThemePreference} />
                <p className="mt-3 text-xs font-semibold muted">Current theme: {resolvedTheme === 'light' ? 'Light' : 'Dark'}</p>
              </div>
            </div>
            {[
              {
                key: 'defaultNotifications',
                icon: Bell,
                title: 'Default Notification Settings',
                description: 'Keep operational reminders visible for jobs, payments, AMC visits, and approvals.'
              },
              {
                key: 'dashboardFocus',
                icon: BarChart,
                title: 'Dashboard Preferences',
                description: 'Prioritize operational KPIs and compact admin summaries on dashboard surfaces.'
              },
              {
                key: 'pdfDocuments',
                icon: FileText,
                title: 'PDF / Document Preferences',
                description: 'Use standard invoice, quotation, and service document defaults where supported.'
              }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.key} className="surface admin-control-card settings-preference-card p-5">
                  <div className="flex items-start gap-3">
                    <div className="admin-control-icon">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-lg font-black">{item.title}</h2>
                      <p className="mt-2 text-sm leading-6 muted">{item.description}</p>
                    </div>
                  </div>
                  <label className="mt-5 flex items-center justify-between gap-3 rounded-card border border-white/10 bg-white/[0.035] px-3 py-3">
                    <span className="text-sm font-bold text-slate-100">Enabled</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[var(--brand)]"
                      checked={preferences[item.key]}
                      onChange={() => updatePreference(item.key)}
                    />
                  </label>
                </div>
              );
            })}
            <div className="surface admin-control-card settings-preference-save p-5 lg:col-span-3">
              <div>
                <h2 className="text-xl font-black">Preference Defaults</h2>
                <p className="mt-2 text-sm leading-6 muted">These preference controls are local UI defaults until backend preference storage is added.</p>
              </div>
              <button type="button" className="btn btn-primary" onClick={savePreferences}>
                <Save className="h-4 w-4" />
                Save Preferences
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
