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
import { Fragment } from 'react';
import { ChevronRight, LockKeyhole, MinusCircle, Palette, RotateCcw } from 'lucide-react';
import { ALL_PERMISSIONS, can, hasRole, permissionMatrixGroups, roleDisplayOrder, roleLabel, roleUiMetadata, supportedRoles } from '../../utils/roles.js';
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
  { id: 'usersRoles', label: 'Users & Roles' },
  { id: 'preferences', label: 'Preferences' }
];

const roleIconMap = {
  admin: ShieldCheck,
  manager: ClipboardList,
  receptionist: PhoneCallIcon,
  accountant: CreditCard,
  inventory: Boxes,
  technician: Wrench,
  viewer: UserRound
};

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

function PermissionStateIcon({ state }) {
  if (state === 'allowed') {
    return (
      <span className="role-permission-state role-permission-state-allowed" title="Allowed" aria-label="Allowed">
        <CheckCircle2 className="h-4 w-4" />
      </span>
    );
  }
  if (state === 'denied') {
    return (
      <span className="role-permission-state role-permission-state-denied" title="Denied" aria-label="Denied">
        <X className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className="role-permission-state role-permission-state-not-set" title="Not set" aria-label="Not set">
      <MinusCircle className="h-4 w-4" />
    </span>
  );
}

function RoleComingNextModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4">
      <div className="surface admin-modal w-full max-w-md p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Coming next</p>
            <h2 className="mt-1 text-xl font-black">Custom Role Creation</h2>
            <p className="mt-2 text-sm leading-6 muted">Custom role creation will be enabled after permission editor backend is added.</p>
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onClose} aria-label="Close create role notice">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 flex justify-end">
          <button type="button" className="btn btn-primary" onClick={onClose}>Understood</button>
        </div>
      </div>
    </div>
  );
}

function RoleUserViewModal({ user, onClose }) {
  if (!user) return null;
  const displayRole = roleUiMetadata[user.role]?.label || roleLabel(user.role);
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4">
      <div className="surface admin-modal w-full max-w-lg p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">User Access</p>
            <h2 className="mt-1 text-xl font-black">{user.name || user.username || 'User'}</h2>
            <p className="mt-2 text-sm leading-6 muted">System role and account status are protected by backend user APIs.</p>
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onClose} aria-label="Close user details">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <SettingsInfoItem icon={UserRound} label="Name" value={user.name || '-'} />
          <SettingsInfoItem icon={KeyRound} label="Username" value={user.username || '-'} />
          <SettingsInfoItem icon={ShieldCheck} label="Role" value={displayRole} />
          <SettingsInfoItem icon={PhoneCallIcon} label="Contact" value={user.email || user.phone || '-'} />
        </div>
        <div className="mt-5 flex justify-end">
          <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function EditUserRoleModal({ user, saving, onClose, onSave }) {
  const [nextRole, setNextRole] = useState(user?.role || 'viewer');
  if (!user) return null;
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/55 p-4">
      <form className="surface admin-modal w-full max-w-md p-5" onSubmit={(event) => {
        event.preventDefault();
        onSave(nextRole);
      }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Protected Action</p>
            <h2 className="mt-1 text-xl font-black">Edit User Role</h2>
            <p className="mt-2 text-sm leading-6 muted">Role updates use the existing protected user API. Permission definitions remain system-controlled in this phase.</p>
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onClose} aria-label="Close edit role modal">
            <X className="h-5 w-5" />
          </button>
        </div>
        <label className="mt-5 block">
          <span className="label">System Role</span>
          <select className="input" value={nextRole} onChange={(event) => setNextRole(event.target.value)}>
            {supportedRoles.map((role) => (
              <option key={role} value={role}>{roleUiMetadata[role]?.label || roleLabel(role)}</option>
            ))}
          </select>
        </label>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Role'}
          </button>
        </div>
      </form>
    </div>
  );
}

function cloneRolePermissionMap(source = {}) {
  return roleDisplayOrder.reduce((roles, role) => {
    roles[role] = ALL_PERMISSIONS.reduce((permissions, permission) => {
      permissions[permission] = Boolean(source?.[role]?.[permission]);
      return permissions;
    }, {});
    return roles;
  }, {});
}

function rolePermissionsFromApi(roles = []) {
  const source = roles.reduce((map, item) => {
    map[item.role] = item.permissions || {};
    return map;
  }, {});
  return cloneRolePermissionMap(source);
}

function rolePermissionMapsEqual(left = {}, right = {}) {
  return roleDisplayOrder.every((role) => ALL_PERMISSIONS.every((permission) => Boolean(left?.[role]?.[permission]) === Boolean(right?.[role]?.[permission])));
}

function changedPermissionRoles(draft = {}, baseline = {}) {
  return roleDisplayOrder.filter((role) => ALL_PERMISSIONS.some((permission) => Boolean(draft?.[role]?.[permission]) !== Boolean(baseline?.[role]?.[permission])));
}

function permissionStateFromDraft(draft, role, permission) {
  if (!permission || !ALL_PERMISSIONS.includes(permission)) return 'not_set';
  return draft?.[role]?.[permission] ? 'allowed' : 'denied';
}

function PermissionMatrixCell({ state, locked, edited, disabled, onToggle }) {
  return (
    <button
      type="button"
      className={`role-permission-cell role-permission-cell-${state} ${edited ? 'role-permission-cell-edited' : ''} ${locked ? 'role-permission-cell-locked' : ''}`}
      disabled={disabled}
      onClick={onToggle}
      title={locked ? 'Locked permission' : disabled ? 'Permission editing unavailable' : state === 'allowed' ? 'Click to deny' : 'Click to allow'}
      aria-label={locked ? `Locked ${state}` : state}
    >
      <PermissionStateIcon state={state} />
      {locked ? <LockKeyhole className="role-permission-lock h-3.5 w-3.5" /> : null}
    </button>
  );
}

function UsersRolesSection() {
  const { request, user } = useAuth();
  const { push } = useToast();
  const [permissionSearch, setPermissionSearch] = useState('');
  const [permissionDraft, setPermissionDraft] = useState(null);
  const [permissionsSaving, setPermissionsSaving] = useState(false);
  const [viewUser, setViewUser] = useState(null);
  const [editRoleUser, setEditRoleUser] = useState(null);
  const [roleSaving, setRoleSaving] = useState(false);
  const canEditRolePermissions = hasRole(user, 'admin') && can(user, 'manage_roles');
  const { data: rolePermissionData, loading: permissionsLoading, error: permissionsError, reload: reloadRolePermissions } = useResource(
    () => request('/role-permissions'),
    [request]
  );
  const { data: usersData, loading: usersLoading, reload: reloadUsers } = useResource(async () => {
    try {
      const usersResult = await request('/users');
      return { users: usersResult.users || [], unavailable: false };
    } catch (err) {
      return { users: [], unavailable: true, message: err.message };
    }
  }, [request]);
  const users = usersData?.users || [];
  const usersUnavailable = Boolean(usersData?.unavailable);
  const adminLockedPermissions = rolePermissionData?.adminLockedPermissions || [];
  const baselinePermissions = useMemo(
    () => rolePermissionData?.roles ? rolePermissionsFromApi(rolePermissionData.roles) : null,
    [rolePermissionData]
  );
  const dirtyRoles = useMemo(
    () => permissionDraft && baselinePermissions ? changedPermissionRoles(permissionDraft, baselinePermissions) : [],
    [permissionDraft, baselinePermissions]
  );
  const matrixDirty = dirtyRoles.length > 0;
  const normalizedSearch = permissionSearch.trim().toLowerCase();
  const filteredPermissionGroups = useMemo(() => permissionMatrixGroups
    .map((group) => {
      if (!normalizedSearch) return group;
      const groupMatches = group.group.toLowerCase().includes(normalizedSearch);
      const permissions = groupMatches
        ? group.permissions
        : group.permissions.filter((item) => `${item.label} ${item.permission || ''}`.toLowerCase().includes(normalizedSearch));
      return { ...group, permissions };
    })
    .filter((group) => group.permissions.length), [normalizedSearch]);

  useEffect(() => {
    if (baselinePermissions) setPermissionDraft(cloneRolePermissionMap(baselinePermissions));
  }, [baselinePermissions]);

  function isLockedCell(role, permission) {
    if (!permission) return true;
    if (role === 'admin') return true;
    return false;
  }

  function togglePermission(role, permission) {
    if (!canEditRolePermissions || isLockedCell(role, permission)) return;
    setPermissionDraft((current) => {
      const next = cloneRolePermissionMap(current);
      next[role][permission] = !next[role][permission];
      return next;
    });
  }

  function resetPermissionDraft() {
    if (!baselinePermissions) return;
    setPermissionDraft(cloneRolePermissionMap(baselinePermissions));
  }

  async function saveRolePermissionChanges() {
    if (!matrixDirty || !permissionDraft) return;
    setPermissionsSaving(true);
    try {
      await Promise.all(dirtyRoles.map((role) => request(`/role-permissions/${role}`, {
        method: 'PATCH',
        body: JSON.stringify({ permissions: permissionDraft[role] })
      })));
      push('Role permissions saved');
      await reloadRolePermissions({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setPermissionsSaving(false);
    }
  }

  async function saveUserRole(nextRole) {
    if (!editRoleUser) return;
    setRoleSaving(true);
    try {
      await request(`/users/${recordId(editRoleUser)}`, {
        method: 'PATCH',
        body: JSON.stringify({ role: nextRole })
      });
      push('User role updated');
      setEditRoleUser(null);
      reloadUsers({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setRoleSaving(false);
    }
  }

  return (
    <div className="users-roles-section grid gap-5">
      <section className="surface role-permissions-hero p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <div className="role-permissions-breadcrumb">
              <span>Settings</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span>Users & Roles</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span>Role Permissions</span>
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Role Permissions</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Manage roles and their permissions. Backend API guards protect every restricted action.</p>
          </div>
          <div className="role-permissions-actions">
            <SearchBox value={permissionSearch} onChange={setPermissionSearch} placeholder="Search permissions" />
            <Link className="btn btn-secondary admin-compact-button" to="/admin/audit-logs">
              <ReceiptText className="h-4 w-4" />
              Audit Logs
            </Link>
            <button
              type="button"
              className="btn btn-primary admin-compact-button"
              disabled={!canEditRolePermissions || !matrixDirty || permissionsSaving || permissionsLoading || Boolean(permissionsError)}
              onClick={saveRolePermissionChanges}
            >
              <Save className="h-4 w-4" />
              {permissionsSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              className="btn btn-secondary admin-compact-button"
              disabled={!matrixDirty || permissionsSaving}
              onClick={resetPermissionDraft}
            >
              <RotateCcw className="h-4 w-4" />
              Reset Changes
            </button>
          </div>
        </div>
        <div className="mt-4 rounded-card border border-sky-300/20 bg-sky-400/10 p-3 text-sm font-semibold text-sky-100">
          {canEditRolePermissions ? matrixDirty ? `${dirtyRoles.length} role permission set${dirtyRoles.length === 1 ? '' : 's'} changed. Save to apply backend guards.` : 'Permission edits are saved to backend role guards.' : 'Only admin users with Manage Roles can edit permissions.'}
        </div>
      </section>

      <section className="surface role-matrix-card role-matrix-card-full p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-black">Permission Matrix</h3>
            <p className="mt-1 text-sm muted">Backend-backed role permissions by role</p>
          </div>
          <div className="role-matrix-legend">
            <span><PermissionStateIcon state="allowed" />Allowed</span>
            <span><PermissionStateIcon state="denied" />Denied</span>
            <span><PermissionStateIcon state="not_set" />Not Set</span>
            <span><LockKeyhole className="h-4 w-4" />Locked</span>
          </div>
        </div>
        {permissionsError ? (
          <ErrorBlock message={permissionsError} />
        ) : permissionsLoading || !permissionDraft ? (
          <LoadingBlock />
        ) : (
          <div className="role-matrix-wrap">
            <table className="role-permission-matrix role-permission-matrix-editable">
              <thead>
                <tr>
                  <th>Permission</th>
                  {roleDisplayOrder.map((role) => (
                    <th key={role}>{roleUiMetadata[role]?.shortLabel || roleLabel(role)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPermissionGroups.length ? filteredPermissionGroups.map((group) => (
                  <Fragment key={group.group}>
                    <tr className="role-permission-group-row">
                      <td colSpan={roleDisplayOrder.length + 1}>{group.group}</td>
                    </tr>
                    {group.permissions.map((item) => (
                      <tr key={`${group.group}-${item.label}`}>
                        <td>
                          <span className="role-permission-label">{item.label}</span>
                          {item.permission ? <span className="role-permission-key">{item.permission}</span> : <span className="role-permission-key">No Phase 1 guard</span>}
                        </td>
                        {roleDisplayOrder.map((role) => {
                          const state = permissionStateFromDraft(permissionDraft, role, item.permission);
                          const locked = isLockedCell(role, item.permission);
                          const edited = Boolean(item.permission) && Boolean(permissionDraft?.[role]?.[item.permission]) !== Boolean(baselinePermissions?.[role]?.[item.permission]);
                          return (
                            <td key={`${role}-${item.label}`} className={edited ? 'role-matrix-edited-cell' : ''}>
                              <PermissionMatrixCell
                                state={state}
                                locked={locked}
                                edited={edited}
                                disabled={!canEditRolePermissions || locked || permissionsSaving}
                                onToggle={() => togglePermission(role, item.permission)}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </Fragment>
                )) : (
                  <tr>
                    <td colSpan={roleDisplayOrder.length + 1}>
                      <EmptyState title="No permissions found" message="Try another permission name, group, or key." />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {adminLockedPermissions.length ? (
          <p className="mt-3 text-xs font-semibold muted">Admin protected permissions: {adminLockedPermissions.map((permission) => permission.replace(/_/g, ' ')).join(', ')}.</p>
        ) : null}
      </section>

      <section className="surface role-users-card p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-xl font-black">Users & Role Assignments</h3>
            <p className="mt-1 text-sm muted">Review existing users without changing Staff / Technicians management.</p>
          </div>
          <Link className="btn btn-primary admin-compact-button" to="/admin/technician-panel">
            <Users className="h-4 w-4" />
            Manage Staff / Technicians
          </Link>
        </div>
        {usersUnavailable ? (
          <div className="mt-4 rounded-card border border-amber-400/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-100">
            User counts and assignments are unavailable for this session.
          </div>
        ) : null}
        <div className="admin-table-wrap role-users-table-wrap mt-4">
          <table className="data-table role-users-table">
            <thead><tr><th>User</th><th>Contact</th><th>Role</th><th>Status</th><th>Last Active</th><th className="text-center">Action</th></tr></thead>
            <tbody className="divide-y divide-[var(--line)]">
              {usersLoading ? (
                <tr><td colSpan="6" className="muted">Loading users...</td></tr>
              ) : users.length ? users.map((item) => {
                const itemRole = item.role || 'viewer';
                const canEditThisRole = canEditRolePermissions && itemRole !== 'admin';
                return (
                  <tr key={recordId(item) || item.username}>
                    <td>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="role-user-avatar">{String(item.name || item.username || '?').slice(0, 1).toUpperCase()}</span>
                        <span className="min-w-0">
                          <span className="block truncate font-bold text-slate-100">{item.name || item.username || 'User'}</span>
                          <span className="block truncate text-xs muted">{item.username || '-'}</span>
                        </span>
                      </div>
                    </td>
                    <td>{item.email || item.phone || '-'}</td>
                    <td><span className="admin-role-badge">{roleUiMetadata[itemRole]?.label || roleLabel(itemRole)}</span></td>
                    <td><AccountStatusPill active={item.active !== false} /></td>
                    <td>{item.lastActiveAt ? formatDate(item.lastActiveAt) : item.updatedAt ? formatDate(item.updatedAt) : item.createdAt ? formatDate(item.createdAt) : '-'}</td>
                    <td>
                      <div className="flex flex-wrap justify-center gap-2">
                        <button type="button" className="btn btn-secondary admin-table-button" onClick={() => setViewUser(item)}>View</button>
                        {canEditThisRole ? <button type="button" className="btn btn-primary admin-table-button" onClick={() => setEditRoleUser(item)}>Edit Role</button> : null}
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="6"><EmptyState title="No users found" message="Users will appear here when the protected users API is available." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="surface permission-security-panel p-5">
        <div className="flex items-start gap-3">
          <div className="admin-control-icon"><ShieldCheck className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h3 className="text-xl font-black">Permission system active</h3>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <AccessSummaryItem title="API guards enabled" description="Backend API endpoints are protected by permission guards." />
              <AccessSummaryItem title="Editable system roles" description="Role edits are saved to backend permission storage." />
              <AccessSummaryItem title="Technician scope" description="Technician access remains scoped to assigned jobs." />
              <AccessSummaryItem title="Admin full access" description="Admin keeps full system access." />
            </div>
          </div>
        </div>
      </section>

      <TeamAccessSection />

      {viewUser ? <RoleUserViewModal user={viewUser} onClose={() => setViewUser(null)} /> : null}
      {editRoleUser ? <EditUserRoleModal user={editRoleUser} saving={roleSaving} onClose={() => setEditRoleUser(null)} onSave={saveUserRole} /> : null}
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
            <span className="mt-1 block text-xs muted">This Staff / Technicians workflow creates technician login accounts only.</span>
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
                <AccessSummaryItem title="Role Access" description="System roles define access for admin, managers, operations, billing, inventory, technicians, and viewers." />
                <AccessSummaryItem title="Technician Login" description="Technician credentials are managed from Staff / Technicians." />
              </div>
            </SettingsInfoCard>
          </div>
        ) : null}

        {activeTab === 'usersRoles' ? (
          <UsersRolesSection />
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
