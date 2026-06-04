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
import {
  Activity,
  ArchiveRestore,
  Banknote,
  Building2,
  ChevronsDownUp,
  ChevronsUpDown,
  ChevronRight,
  Copy,
  DatabaseBackup,
  Filter,
  HardDrive,
  ImageUp,
  LockKeyhole,
  MinusCircle,
  Palette,
  Eye,
  FileCog,
  Globe2,
  Hash,
  Info,
  Landmark,
  ListChecks,
  MessageSquareText,
  Percent,
  QrCode,
  RotateCcw,
  Settings2,
  UploadCloud,
  WalletCards,
  Workflow
} from 'lucide-react';
import { ALL_PERMISSIONS, ROLE_PERMISSIONS, can, hasRole, permissionMatrixGroups, roleDisplayOrder, roleLabel, roleUiMetadata, supportedRoles } from '../../utils/roles.js';
import { themePreferenceOptions, useThemePreference } from '../../utils/theme.js';
import { NotificationTemplatesSection } from './NotificationTemplatesSection.jsx';
import { PdfTemplatesSection } from './PdfTemplatesSection.jsx';
import { PublicWebsiteSettingsSection } from './PublicWebsiteSettingsSection.jsx';
import StatusWorkflowSettingsSection from './StatusWorkflowSettingsSection.jsx';

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
  { id: 'overview', label: 'Overview' },
  { id: 'companyProfile', label: 'Company Profile' },
  { id: 'adminProfile', label: 'Admin Profile' },
  { id: 'security', label: 'Security' },
  { id: 'usersRoles', label: 'Users & Roles' },
  { id: 'documentsPdfs', label: 'Documents & PDFs' },
  { id: 'publicWebsite', label: 'Public Website Settings' },
  { id: 'backupStorage', label: 'Backup & Storage' },
  { id: 'taxGst', label: 'Tax / GST' },
  { id: 'paymentSettings', label: 'Payment Settings' },
  { id: 'notificationTemplates', label: 'Notification Templates' },
  { id: 'statusWorkflow', label: 'Status Workflow' },
  { id: 'systemInformation', label: 'System Information' },
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

const permissionMatrixRoleDisplayOrder = [
  'admin',
  'technician',
  'manager',
  'receptionist',
  'accountant',
  'inventory',
  'viewer'
];

const businessSettingsDefaults = {
  documentNumbering: {
    invoice: { prefix: 'INV', nextNumber: 1 },
    workOrder: { prefix: 'WO', nextNumber: 1 },
    quotation: { prefix: 'QUO', nextNumber: 1 },
    amc: { prefix: 'AMC', nextNumber: 1 },
    paymentReceipt: { prefix: 'RCPT', nextNumber: 1 },
    yearlyReset: false
  },
  taxGst: {
    enabled: false,
    defaultPercentage: 18,
    splitCgstSgst: true,
    taxLabel: 'GST',
    showGstOnInvoices: true
  },
  payment: {
    acceptedMethods: ['Cash', 'UPI', 'Bank Transfer'],
    upiId: '',
    bankDetails: '',
    defaultPaymentStatus: 'Pending',
    paymentTermsText: 'Payment due on receipt.'
  },
  notificationTemplates: {},
  statusWorkflows: {
    booking: [],
    workOrder: [],
    invoice: [],
    amc: []
  },
  pdfTerms: {
    invoiceTerms: '',
    quotationTerms: '',
    serviceReportNotes: '',
    amcTerms: '',
    warrantyNote: '',
    footerNote: ''
  },
  preferences: {
    defaultNotifications: true,
    dashboardFocus: true,
    pdfDocuments: true
  }
};

const businessPermissionByTab = {
  documentNumbering: 'manage_document_numbering',
  taxGst: 'manage_tax_settings',
  paymentSettings: 'manage_payment_settings',
  notificationTemplates: 'manage_notification_templates',
  statusWorkflow: 'manage_status_workflows',
  pdfTerms: 'manage_pdf_terms',
  preferences: 'edit_settings'
};

const rolePresetButtons = [
  { label: 'Technician Basic', role: 'technician', sourceRole: 'technician' },
  { label: 'Manager Full', role: 'manager', sourceRole: 'manager' },
  { label: 'Accountant Billing', role: 'accountant', sourceRole: 'accountant' },
  { label: 'Inventory Only', role: 'inventory', sourceRole: 'inventory' },
  { label: 'Viewer Read Only', role: 'viewer', sourceRole: 'viewer' }
];

const settingsStatusToneClass = {
  Configured: 'settings-status-configured',
  'Needs Setup': 'settings-status-needs-setup',
  'Coming Soon': 'settings-status-coming-soon',
  Active: 'settings-status-active'
};

const settingsOverviewGroups = [
  {
    id: 'organizationAccess',
    title: 'Organization & Access',
    description: 'Manage organization details, admin profile, users, roles, and security.',
    cards: [
      {
        id: 'companyProfile',
        tabId: 'companyProfile',
        icon: Building2,
        title: 'Company Profile',
        description: 'Company identity, logo, address, GST/PAN, and contact details used across the admin system.',
        status: 'Configured',
        tags: ['organization', 'company', 'logo', 'gst', 'pan', 'contact']
      },
      {
        id: 'adminProfile',
        tabId: 'adminProfile',
        icon: UserRound,
        title: 'Admin Profile',
        description: 'Admin account details, avatar, password access, and recent activity.',
        status: 'Configured',
        tags: ['admin', 'profile', 'avatar', 'password', 'activity']
      },
      {
        id: 'usersRoles',
        tabId: 'usersRoles',
        icon: Users,
        title: 'Users & Roles',
        description: 'Team accounts, role presets, permissions, and access audit controls.',
        status: 'Configured',
        tags: ['users', 'roles', 'permissions', 'team', 'access']
      },
      {
        id: 'security',
        tabId: 'security',
        icon: ShieldCheck,
        title: 'Security',
        description: 'Password policy, session handling, login safety, and audit trail status.',
        status: 'Configured',
        tags: ['security', 'password', 'sessions', 'login', 'audit']
      }
    ]
  },
  {
    id: 'businessOperations',
    title: 'Business & Operations',
    description: 'Configure daily service operations and workflow behavior.',
    cards: [
      {
        id: 'bookings',
        route: '/admin/bookings',
        icon: BookOpenCheck,
        title: 'Bookings',
        description: 'Open live service intake, customer requests, and booking operations.',
        status: 'Active',
        actionLabel: 'Open',
        tags: ['bookings', 'service intake', 'requests', 'customers', 'operations']
      },
      {
        id: 'workOrders',
        route: '/admin/work-orders',
        icon: Wrench,
        title: 'Work Orders',
        description: 'Open live job execution, dispatch, technician assignment, and service workflow pages.',
        status: 'Active',
        actionLabel: 'Open',
        tags: ['work orders', 'jobs', 'dispatch', 'technicians', 'service']
      },
      {
        id: 'statusWorkflow',
        tabId: 'statusWorkflow',
        icon: Workflow,
        title: 'Status Workflow',
        description: 'Prepare stored status flows for bookings, work orders, invoices, and AMC.',
        status: 'Coming Soon',
        tags: ['status', 'workflow', 'bookings', 'work orders', 'invoice', 'amc']
      },
      {
        id: 'preferences',
        tabId: 'preferences',
        icon: Palette,
        title: 'Preferences',
        description: 'Admin theme, notifications, dashboard focus, and document defaults.',
        status: 'Configured',
        tags: ['preferences', 'theme', 'notifications', 'dashboard', 'documents']
      }
    ]
  },
  {
    id: 'documentsCommunication',
    title: 'Documents & Communication',
    description: 'Manage PDFs, document templates, message templates, and numbering.',
    cards: [
      {
        id: 'documentsPdfs',
        route: '/admin/settings/documents-pdfs',
        icon: FileText,
        title: 'Documents & PDFs',
        description: 'Manage PDF templates, terms, footer notes, and document numbering.',
        status: 'Active',
        actionLabel: 'Manage',
        tags: ['pdf', 'templates', 'terms', 'numbering']
      },
      {
        id: 'notificationTemplates',
        tabId: 'notificationTemplates',
        icon: MessageSquareText,
        title: 'Notification Templates',
        description: 'Reusable message text and variables for future customer communication.',
        status: 'Coming Soon',
        tags: ['notifications', 'messages', 'templates', 'whatsapp', 'email', 'sms']
      }
    ]
  },
  {
    id: 'financeCompliance',
    title: 'Finance & Compliance',
    description: 'Manage tax, payments, invoice defaults, and compliance settings.',
    cards: [
      {
        id: 'taxGst',
        route: '/admin/settings/tax-gst',
        icon: Percent,
        title: 'Tax / GST',
        description: 'Configure tax rates, GST details, HSN/SAC codes, and invoice tax display settings.',
        status: 'Configured',
        tags: ['tax', 'gst', 'hsn', 'sac', 'invoice', 'compliance']
      },
      {
        id: 'paymentSettings',
        route: '/admin/settings/payment-settings',
        icon: WalletCards,
        title: 'Payment Settings',
        description: 'Configure payment methods, terms, reminders, and invoice payment settings.',
        status: 'Configured',
        tags: ['payments', 'upi', 'bank', 'terms', 'reminders']
      },
      {
        id: 'invoices',
        route: '/admin/invoices',
        icon: ReceiptText,
        title: 'Invoices',
        description: 'Open live invoice records, payment status, balances, and finance activity.',
        status: 'Active',
        actionLabel: 'Open',
        tags: ['invoices', 'billing', 'payments', 'balance', 'finance']
      }
    ]
  },
  {
    id: 'publicWebsite',
    title: 'Public Website',
    description: 'Manage public website content, branding, SEO, booking visibility, and services.',
    cards: [
      {
        id: 'publicWebsite',
        tabId: 'publicWebsite',
        icon: Globe2,
        title: 'Public Website Settings',
        description: 'Public website content, branding, SEO, services, booking visibility, and contact display.',
        status: 'Configured',
        tags: ['public website', 'branding', 'seo', 'services', 'booking', 'content']
      }
    ]
  },
  {
    id: 'systemData',
    title: 'System & Data',
    description: 'Manage backups, storage, restore tools, and data safety.',
    cards: [
      {
        id: 'backupStorage',
        tabId: 'backupStorage',
        icon: DatabaseBackup,
        title: 'Backup & Storage',
        description: 'Manage storage usage, create backups, export data, and restore system data safely.',
        status: 'Needs Setup',
        tags: ['backup', 'restore', 'storage', 'export']
      }
    ]
  }
];

function settingsCardSearchText(card) {
  return [card.title, card.description, ...(card.tags || [])].join(' ').toLowerCase();
}

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

function settingsAssetUrl(url = '') {
  const value = String(url || '').trim();
  if (!value) return '';
  if (value.startsWith('/uploads/')) return uploadedAssetUrl(value);
  return value;
}

function stableJson(value) {
  return JSON.stringify(value || {});
}

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function titleCase(value = '') {
  return String(value || 'Activity')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatBytes(value = 0) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB'];
  let amount = bytes / 1024;
  let index = 0;
  while (amount >= 1024 && index < units.length - 1) {
    amount /= 1024;
    index += 1;
  }
  return `${amount.toFixed(amount >= 10 ? 1 : 2)} ${units[index]}`;
}

function UsersRolesSection({ onDirtyChange = null }) {
  const { request, user } = useAuth();
  const { push } = useToast();
  const [permissionSearch, setPermissionSearch] = useState('');
  const [permissionCategory, setPermissionCategory] = useState('All');
  const [permissionDraft, setPermissionDraft] = useState(null);
  const [collapsedPermissionGroups, setCollapsedPermissionGroups] = useState(() => new Set());
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
  const permissionCategories = useMemo(() => ['All', ...permissionMatrixGroups.map((group) => group.group)], []);
  const filteredPermissionGroups = useMemo(() => permissionMatrixGroups
    .filter((group) => permissionCategory === 'All' || group.group === permissionCategory)
    .map((group) => {
      if (!normalizedSearch) return group;
      const groupMatches = group.group.toLowerCase().includes(normalizedSearch);
      const permissions = groupMatches
        ? group.permissions
        : group.permissions.filter((item) => `${item.label} ${item.permission || ''}`.toLowerCase().includes(normalizedSearch));
      return { ...group, permissions };
    })
    .filter((group) => group.permissions.length), [normalizedSearch, permissionCategory]);

  useEffect(() => {
    if (baselinePermissions) setPermissionDraft(cloneRolePermissionMap(baselinePermissions));
  }, [baselinePermissions]);

  useEffect(() => {
    onDirtyChange?.(matrixDirty);
  }, [matrixDirty, onDirtyChange]);

  function isLockedCell(role, permission) {
    if (!permission) return true;
    if (role === 'admin') return true;
    if (adminLockedPermissions.includes(permission)) return true;
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

  function togglePermissionGroup(group) {
    setCollapsedPermissionGroups((current) => {
      const next = new Set(current);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  function expandPermissionGroups() {
    setCollapsedPermissionGroups(new Set());
  }

  function collapsePermissionGroups() {
    setCollapsedPermissionGroups(new Set(permissionMatrixGroups.map((group) => group.group)));
  }

  function applyRolePreset(role, sourceRole) {
    if (!canEditRolePermissions || role === 'admin') return;
    setPermissionDraft((current) => {
      const next = cloneRolePermissionMap(current);
      const defaults = ROLE_PERMISSIONS[sourceRole] || [];
      next[role] = ALL_PERMISSIONS.reduce((map, permission) => {
        map[permission] = defaults.includes(permission);
        return map;
      }, {});
      return next;
    });
  }

  async function resetRoleToDefault(role) {
    if (!canEditRolePermissions || role === 'admin') return;
    setPermissionsSaving(true);
    try {
      await request(`/role-permissions/reset/${role}`, { method: 'POST' });
      push(`${roleLabel(role)} reset to default`);
      await reloadRolePermissions({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setPermissionsSaving(false);
    }
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
            <label className="relative block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Filter className="h-4 w-4" />
              </span>
              <select className="input min-h-11 min-w-56 pl-9" value={permissionCategory} onChange={(event) => setPermissionCategory(event.target.value)}>
                {permissionCategories.map((category) => (
                  <option key={category} value={category}>{category === 'All' ? 'All permission categories' : category}</option>
                ))}
              </select>
            </label>
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
        <div className="mb-4 grid gap-3 rounded-card border border-white/10 bg-white/[0.035] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn btn-secondary admin-compact-button" onClick={expandPermissionGroups}>
              <ChevronsUpDown className="h-4 w-4" />
              Expand All
            </button>
            <button type="button" className="btn btn-secondary admin-compact-button" onClick={collapsePermissionGroups}>
              <ChevronsDownUp className="h-4 w-4" />
              Collapse All
            </button>
            {permissionMatrixRoleDisplayOrder.filter((role) => role !== 'admin').map((role) => (
              <button key={role} type="button" className="btn btn-secondary admin-compact-button" disabled={!canEditRolePermissions || permissionsSaving} onClick={() => resetRoleToDefault(role)}>
                Reset {roleUiMetadata[role]?.shortLabel || roleLabel(role)}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {rolePresetButtons.map((preset) => (
              <button key={preset.label} type="button" className="btn btn-primary admin-compact-button" disabled={!canEditRolePermissions || permissionsSaving} onClick={() => applyRolePreset(preset.role, preset.sourceRole)}>
                {preset.label}
              </button>
            ))}
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
                  {permissionMatrixRoleDisplayOrder.map((role) => (
                    <th key={role}>{roleUiMetadata[role]?.shortLabel || roleLabel(role)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPermissionGroups.length ? filteredPermissionGroups.map((group) => (
                  <Fragment key={group.group}>
                    <tr className="role-permission-group-row">
                      <td colSpan={permissionMatrixRoleDisplayOrder.length + 1}>
                        <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => togglePermissionGroup(group.group)}>
                          <span>{group.group}</span>
                          <span>{collapsedPermissionGroups.has(group.group) ? 'Expand' : 'Collapse'}</span>
                        </button>
                      </td>
                    </tr>
                    {collapsedPermissionGroups.has(group.group) ? null : group.permissions.map((item) => (
                      <tr key={`${group.group}-${item.label}`}>
                        <td>
                          <span className="role-permission-label">{item.label}</span>
                          {item.permission ? <span className="role-permission-key">{item.permission}</span> : <span className="role-permission-key">No Phase 1 guard</span>}
                        </td>
                        {permissionMatrixRoleDisplayOrder.map((role) => {
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
                    <td colSpan={permissionMatrixRoleDisplayOrder.length + 1}>
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

function AdminMetricCard({ icon: Icon, label, value, helper, tone = 'blue', actionLabel = '', onAction = null, actionDisabled = false }) {
  return (
    <div className={`admin-metric-card admin-metric-${tone}`}>
      <div className="admin-metric-icon"><Icon className="h-4 w-4" /></div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="admin-metric-label">{label}</p>
        <p className="admin-metric-value">{value}</p>
        <p className="admin-metric-helper">{helper}</p>
        {actionLabel && onAction ? (
          <button type="button" className="btn btn-secondary admin-table-button mt-auto w-fit" disabled={actionDisabled} onClick={onAction}>
            {actionLabel}
          </button>
        ) : null}
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

function CompanyProfileSection({ onDirtyChange = null }) {
  const { request, user } = useAuth();
  const { push } = useToast();
  const canEdit = hasRole(user, 'admin') && can(user, 'manage_company_profile');
  const { data, loading, error, reload } = useResource(() => request('/settings/company-profile'), [request]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmRemoveLogo, setConfirmRemoveLogo] = useState(false);
  const saved = data?.company || null;
  const dirty = Boolean(saved && form && stableJson(form) !== stableJson({
    name: saved.name || '',
    businessType: saved.businessType || '',
    industry: saved.industry || '',
    phone: saved.phone || '',
    whatsapp: saved.whatsapp || '',
    email: saved.email || '',
    address: saved.address || '',
    googleMapsLink: saved.googleMapsLink || '',
    gstNumber: saved.gstNumber || '',
    panNumber: saved.panNumber || '',
    logoUrl: saved.logoUrl || '',
    useCompanyLogoOnPublicWebsite: saved.useCompanyLogoOnPublicWebsite !== false
  }));

  useEffect(() => {
    if (!saved) return;
    setForm({
      name: saved.name || '',
      businessType: saved.businessType || '',
      industry: saved.industry || '',
      phone: saved.phone || '',
      whatsapp: saved.whatsapp || '',
      email: saved.email || '',
      address: saved.address || '',
      googleMapsLink: saved.googleMapsLink || '',
      gstNumber: saved.gstNumber || '',
      panNumber: saved.panNumber || '',
      logoUrl: saved.logoUrl || '',
      useCompanyLogoOnPublicWebsite: saved.useCompanyLogoOnPublicWebsite !== false
    });
  }, [saved?.updatedAt, saved?.id]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  function update(field, value) {
    setForm((current) => ({ ...(current || {}), [field]: value }));
  }

  async function save(event) {
    event.preventDefault();
    if (!canEdit || !form) return;
    setSaving(true);
    try {
      const result = await request('/settings/company-profile', {
        method: 'PATCH',
        body: JSON.stringify(form)
      });
      push(result.message || 'Company profile saved');
      await reload({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function uploadLogo(file) {
    if (!file || !canEdit) return;
    const body = new FormData();
    body.append('logo', file);
    setUploading(true);
    try {
      const result = await request('/settings/company-profile/logo', { method: 'POST', body });
      push(result.message || 'Company logo updated');
      await reload({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function removeLogo() {
    setUploading(true);
    try {
      const result = await request('/settings/company-profile/logo', { method: 'DELETE' });
      push(result.message || 'Company logo removed');
      setConfirmRemoveLogo(false);
      await reload({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  if (loading || !form) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <form className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]" onSubmit={save}>
      <section className="surface admin-control-card p-5">
        <div className="flex items-start gap-3">
          <div className="admin-control-icon"><Building2 className="h-5 w-5" /></div>
          <div className="min-w-0">
            <h2 className="text-2xl font-black">Company Profile</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">This profile feeds PDF headers, public contact details, public logo display, and admin identity defaults.</p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <label>
            <span className="label">Company name <RequiredMark /></span>
            <input className="input" value={form.name} disabled={!canEdit || saving} onChange={(event) => update('name', event.target.value)} required />
          </label>
          <label>
            <span className="label">Business type</span>
            <input className="input" value={form.businessType} disabled={!canEdit || saving} onChange={(event) => update('businessType', event.target.value)} />
          </label>
          <label>
            <span className="label">Industry</span>
            <input className="input" value={form.industry} disabled={!canEdit || saving} onChange={(event) => update('industry', event.target.value)} />
          </label>
          <label>
            <span className="label">Phone</span>
            <input className="input" value={form.phone} disabled={!canEdit || saving} onChange={(event) => update('phone', event.target.value)} />
          </label>
          <label>
            <span className="label">WhatsApp</span>
            <input className="input" value={form.whatsapp} disabled={!canEdit || saving} onChange={(event) => update('whatsapp', event.target.value)} />
          </label>
          <label>
            <span className="label">Email</span>
            <input className="input" type="email" value={form.email} disabled={!canEdit || saving} onChange={(event) => update('email', event.target.value)} />
          </label>
          <label>
            <span className="label">GST number</span>
            <input className="input" value={form.gstNumber} disabled={!canEdit || saving} onChange={(event) => update('gstNumber', event.target.value)} />
          </label>
          <label>
            <span className="label">PAN number</span>
            <input className="input" value={form.panNumber} disabled={!canEdit || saving} onChange={(event) => update('panNumber', event.target.value)} />
          </label>
          <label>
            <span className="label">Google Maps link</span>
            <input className="input" value={form.googleMapsLink} disabled={!canEdit || saving} onChange={(event) => update('googleMapsLink', event.target.value)} />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-card border border-white/10 bg-white/[0.035] px-3 py-3">
            <span>
              <span className="block font-bold text-slate-100">Use company logo on public website</span>
              <span className="mt-1 block text-xs muted">The public website still keeps its own accent color and theme settings.</span>
            </span>
            <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={form.useCompanyLogoOnPublicWebsite} disabled={!canEdit || saving} onChange={(event) => update('useCompanyLogoOnPublicWebsite', event.target.checked)} />
          </label>
          <label className="lg:col-span-2">
            <span className="label">Address</span>
            <textarea className="input min-h-28" value={form.address} disabled={!canEdit || saving} onChange={(event) => update('address', event.target.value)} />
          </label>
        </div>
        {!canEdit ? <p className="mt-4 rounded-card border border-amber-300/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-100">Only admin users with company profile access can save these settings.</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" disabled={!dirty || saving} onClick={() => setForm({
            name: saved.name || '',
            businessType: saved.businessType || '',
            industry: saved.industry || '',
            phone: saved.phone || '',
            whatsapp: saved.whatsapp || '',
            email: saved.email || '',
            address: saved.address || '',
            googleMapsLink: saved.googleMapsLink || '',
            gstNumber: saved.gstNumber || '',
            panNumber: saved.panNumber || '',
            logoUrl: saved.logoUrl || '',
            useCompanyLogoOnPublicWebsite: saved.useCompanyLogoOnPublicWebsite !== false
          })}>
            Revert
          </button>
          <button className="btn btn-primary" disabled={!canEdit || !dirty || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </section>

      <aside className="surface admin-control-card p-5">
        <div className="flex items-start gap-3">
          <div className="admin-control-icon"><ImageUp className="h-5 w-5" /></div>
          <div>
            <h3 className="text-xl font-black">Company Logo</h3>
            <p className="mt-1 text-sm muted">Used in PDF headers and public website branding when enabled.</p>
          </div>
        </div>
        <div className="mt-5 grid place-items-center rounded-card border border-white/10 bg-white/[0.035] p-5">
          {form.logoUrl ? (
            <img src={settingsAssetUrl(form.logoUrl)} alt="Company logo" className="max-h-28 max-w-full object-contain" />
          ) : (
            <div className="grid h-28 w-full place-items-center rounded-card border border-dashed border-white/15">
              <ImageUp className="h-8 w-8 text-slate-400" />
            </div>
          )}
        </div>
        <div className="mt-4 grid gap-2">
          <label className={`btn btn-secondary justify-center ${!canEdit || uploading ? 'pointer-events-none opacity-60' : ''}`}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            Change Logo
            <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,.svg,image/jpeg,image/png,image/webp,image/svg+xml" disabled={!canEdit || uploading} onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              uploadLogo(file);
            }} />
          </label>
          <button type="button" className="btn btn-secondary justify-center text-rose-100" disabled={!canEdit || uploading || !form.logoUrl} onClick={() => setConfirmRemoveLogo(true)}>
            <Trash2 className="h-4 w-4" />
            Remove Logo
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-card border border-white/10 bg-white p-3">
            {form.logoUrl ? <img src={settingsAssetUrl(form.logoUrl)} alt="Company logo on light background" className="mx-auto h-14 max-w-full object-contain" /> : <p className="text-center text-xs font-bold text-slate-700">No logo</p>}
          </div>
          <div className="rounded-card border border-white/10 bg-slate-950 p-3">
            {form.logoUrl ? <img src={settingsAssetUrl(form.logoUrl)} alt="Company logo on dark background" className="mx-auto h-14 max-w-full object-contain" /> : <p className="text-center text-xs font-bold text-slate-300">No logo</p>}
          </div>
        </div>
        <p className="mt-3 text-xs font-semibold muted">Recommended: PNG, SVG, or WEBP with transparent background, max 5 MB.</p>
        <div className="mt-5 grid gap-3">
          <SettingsInfoItem icon={CalendarClock} label="Last updated" value={saved?.lastUpdatedDate ? formatDate(saved.lastUpdatedDate) : 'Not edited yet'} />
          <SettingsInfoItem icon={UserRound} label="Updated by" value={saved?.lastUpdatedBy?.name || saved?.lastUpdatedBy?.username || 'System default'} />
        </div>
        {confirmRemoveLogo ? (
          <ConfirmModal
            title="Remove company logo?"
            message="PDFs and the public website will fall back to the default logo until a new company logo is uploaded."
            confirmLabel="Remove Logo"
            onCancel={() => setConfirmRemoveLogo(false)}
            onConfirm={removeLogo}
          />
        ) : null}
      </aside>
    </form>
  );
}

function AdminProfileSection({ onDirtyChange = null }) {
  const { request, user, setUser } = useAuth();
  const { push } = useToast();
  const [form, setForm] = useState({ name: user?.name || '', username: user?.username || '', email: user?.email || '', phone: user?.phone || '', avatarUrl: user?.avatarUrl || '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmRemoveAvatar, setConfirmRemoveAvatar] = useState(false);
  const { data: activityData, loading: activityLoading, reload: reloadActivity } = useResource(() => request('/auth/profile/activity').catch(() => ({ activity: [] })), [request]);
  const dirty = stableJson(form) !== stableJson({ name: user?.name || '', username: user?.username || '', email: user?.email || '', phone: user?.phone || '', avatarUrl: user?.avatarUrl || '' });

  useEffect(() => {
    setForm({ name: user?.name || '', username: user?.username || '', email: user?.email || '', phone: user?.phone || '', avatarUrl: user?.avatarUrl || '' });
  }, [user?.name, user?.username, user?.email, user?.phone, user?.avatarUrl]);

  useEffect(() => {
    onDirtyChange?.(dirty || Boolean(passwordForm.currentPassword || passwordForm.newPassword || passwordForm.confirmPassword));
  }, [dirty, passwordForm.currentPassword, passwordForm.newPassword, passwordForm.confirmPassword, onDirtyChange]);

  function syncUser(result) {
    if (!result?.user) return;
    setUser(result.user);
    localStorage.setItem('us_user', JSON.stringify(result.user));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await request('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({
          name: form.name,
          username: form.username,
          email: form.email,
          phone: form.phone
        })
      });
      syncUser(result);
      push(result.message || 'Profile updated');
      reloadActivity({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function updatePassword(event) {
    event.preventDefault();
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      push('New password and confirmation are required', 'error');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      push('New password and confirmation must match', 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await request('/auth/profile', {
        method: 'PATCH',
          body: JSON.stringify({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword })
      });
      syncUser(result);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      push(result.message || 'Password updated');
      reloadActivity({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar(file) {
    if (!file) return;
    const body = new FormData();
    body.append('avatar', file);
    setUploading(true);
    try {
      const result = await request('/auth/profile/avatar', { method: 'POST', body });
      syncUser(result);
      push(result.message || 'Profile photo updated');
      reloadActivity({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    setUploading(true);
    try {
      const result = await request('/auth/profile/avatar', { method: 'DELETE' });
      syncUser(result);
      setConfirmRemoveAvatar(false);
      push(result.message || 'Profile photo removed');
      reloadActivity({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <section className="surface admin-control-card p-5">
        <div className="flex items-start gap-3">
          <div className="admin-control-icon"><UserRound className="h-5 w-5" /></div>
          <div>
            <h2 className="text-2xl font-black">Admin Profile</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Manage your admin account details, avatar, and password.</p>
          </div>
        </div>
        <form className="mt-6 grid gap-4 lg:grid-cols-2" onSubmit={saveProfile}>
          <label>
            <span className="label">Admin name <RequiredMark /></span>
            <input className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required />
          </label>
          <label>
            <span className="label">Username <RequiredMark /></span>
            <input className="input" value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} required />
          </label>
          <label>
            <span className="label">Email</span>
            <input className="input" type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
          </label>
          <label>
            <span className="label">Phone</span>
            <input className="input" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} />
          </label>
          <div className="flex flex-col-reverse gap-2 lg:col-span-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn btn-secondary" disabled={!dirty || saving} onClick={() => setForm({ name: user?.name || '', username: user?.username || '', email: user?.email || '', phone: user?.phone || '', avatarUrl: user?.avatarUrl || '' })}>Revert</button>
            <button className="btn btn-primary" disabled={!dirty || saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        <form className="mt-6 rounded-card border border-white/10 bg-white/[0.035] p-4" onSubmit={updatePassword}>
          <div className="mb-4 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[var(--brand)]" />
            <h3 className="font-black">Change Password</h3>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <label>
              <span className="label">Current password</span>
              <input className="input" type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} />
            </label>
            <label>
              <span className="label">New password</span>
              <input className="input" type="password" minLength={6} value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} />
            </label>
            <label>
              <span className="label">Confirm password</span>
              <input className="input" type="password" minLength={6} value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} />
            </label>
          </div>
          <p className="mt-3 text-xs font-semibold muted">Use at least 6 characters. Stronger passwords should combine letters, numbers, and a symbol.</p>
          <div className="mt-4 flex justify-end">
            <button className="btn btn-secondary" disabled={saving || !passwordForm.newPassword || !passwordForm.confirmPassword}>
              <KeyRound className="h-4 w-4" />
              Update Password
            </button>
          </div>
        </form>
      </section>

      <aside className="grid content-start gap-5">
        <section className="surface admin-control-card p-5">
          <div className="flex items-center gap-4">
            {form.avatarUrl ? (
              <img className="h-20 w-20 rounded-card border border-white/10 object-cover" src={settingsAssetUrl(form.avatarUrl)} alt="Admin avatar" />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-card border border-white/10 bg-white/[0.035] text-2xl font-black">{String(user?.name || user?.username || 'A').slice(0, 1).toUpperCase()}</div>
            )}
            <div>
              <h3 className="text-lg font-black">Profile Photo</h3>
              <p className="mt-1 text-sm muted">JPG, PNG, or WEBP up to 5 MB.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2">
            <label className={`btn btn-secondary justify-center ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
              Upload Photo
              <input type="file" className="hidden" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" disabled={uploading} onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                uploadAvatar(file);
              }} />
            </label>
            <button type="button" className="btn btn-secondary justify-center text-rose-100" disabled={uploading || !form.avatarUrl} onClick={() => setConfirmRemoveAvatar(true)}>
              <Trash2 className="h-4 w-4" />
              Remove Photo
            </button>
          </div>
        </section>

        <section className="surface admin-control-card p-5">
          <h3 className="text-lg font-black">Account Activity</h3>
          <div className="mt-4 grid gap-3">
            <SettingsInfoItem icon={CalendarClock} label="Last login" value={user?.lastLoginAt ? formatDate(user.lastLoginAt) : 'Not recorded yet'} />
            <SettingsInfoItem icon={Activity} label="Last activity" value={user?.lastActivityAt ? `${titleCase(user.lastActivityType || 'Activity')} - ${formatDate(user.lastActivityAt)}` : 'Not recorded yet'} />
          </div>
          <div className="mt-4 grid gap-2">
            {activityLoading ? <p className="text-sm muted">Loading activity...</p> : (activityData?.activity || []).length ? (activityData.activity || []).slice(0, 5).map((item) => (
              <div key={item.id || item._id} className="rounded-card border border-white/10 bg-white/[0.035] p-3">
                <p className="text-sm font-black text-slate-100">{titleCase(item.action || 'activity')}</p>
                <p className="mt-1 text-xs muted">{item.module || 'system'} - {item.createdAt ? formatDate(item.createdAt) : '-'}</p>
              </div>
            )) : <p className="rounded-card border border-white/10 bg-white/[0.035] p-3 text-sm muted">No account activity yet.</p>}
          </div>
        </section>
      </aside>

      {confirmRemoveAvatar ? (
        <ConfirmModal
          title="Remove profile photo?"
          message="Your admin profile will use initials until another photo is uploaded."
          confirmLabel="Remove Photo"
          onCancel={() => setConfirmRemoveAvatar(false)}
          onConfirm={removeAvatar}
        />
      ) : null}
    </div>
  );
}

function isBackupAdminUser(user) {
  return hasRole(user, 'admin') || hasRole(user, 'super_admin');
}

function backupNextRunLabel(settings = {}) {
  if (!settings.automaticBackupEnabled) return 'Automatic backup disabled';
  if (!settings.lastBackupAt) return 'Due after first automatic backup';
  const next = new Date(settings.lastBackupAt);
  if (Number.isNaN(next.getTime())) return 'Schedule pending';
  if (settings.backupFrequency === 'Daily') next.setDate(next.getDate() + 1);
  else if (settings.backupFrequency === 'Monthly') next.setMonth(next.getMonth() + 1);
  else next.setDate(next.getDate() + 7);
  return formatDate(next);
}

function backupCreatedBy(record = {}) {
  return record.createdBy?.name || record.createdBy?.username || 'System';
}

function backupDisplayTitle(record = {}) {
  const kind = String(record.kind || '').replace(/[_-]+/g, ' ').trim().toLowerCase();
  if (kind === 'manual') return 'Manual Backup';
  if (kind === 'automatic') return 'Automatic Backup';
  if (kind === 'pre restore') return 'Pre Restore Backup';
  if (kind === 'restore upload') return 'Restore Backup';
  if (!record.kind) return 'Backup File';
  return `${titleCase(record.kind)} Backup`;
}

function backupMetadata(record = {}) {
  return {
    date: record.createdAt ? formatDate(record.createdAt) : '-',
    size: formatBytes(record.size),
    createdBy: backupCreatedBy(record)
  };
}

function backupCreatedAtTime(record = {}) {
  if (!record.createdAt) return '-';
  const date = new Date(record.createdAt);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function BackupFileDetails({ record }) {
  if (!record) return null;
  return (
    <details className="mt-3 text-xs text-slate-300">
      <summary className="inline-flex cursor-pointer items-center rounded-full border border-sky-300/20 bg-sky-400/10 px-2.5 py-1 font-black text-sky-100 transition hover:border-sky-300/40 hover:bg-sky-400/15">
        View file details
      </summary>
      <div className="mt-3 grid gap-2 rounded-card border border-white/10 bg-slate-950/30 p-3">
        <div><span className="font-black text-slate-400">Full ZIP file name: </span><span className="break-all text-slate-100">{record.filename || 'Backup ZIP file'}</span></div>
        <div><span className="font-black text-slate-400">Backup type: </span><span className="text-slate-100">{backupDisplayTitle(record)}</span></div>
        <div><span className="font-black text-slate-400">Backup size: </span><span className="text-slate-100">{formatBytes(record.size)}</span></div>
        <div><span className="font-black text-slate-400">Created date/time: </span><span className="text-slate-100">{backupCreatedAtTime(record)}</span></div>
        <div><span className="font-black text-slate-400">Created by: </span><span className="text-slate-100">{backupCreatedBy(record)}</span></div>
        <div><span className="font-black text-slate-400">Backup status: </span><span className="text-slate-100">{titleCase(record.status || 'Unknown')}</span></div>
      </div>
    </details>
  );
}

function RestoreConfirmationModal({ confirmText, working, onChange, onCancel, onConfirm }) {
  const canConfirm = confirmText === 'RESTORE' && !working;
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="surface admin-modal w-full max-w-lg p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-rose-200">Final restore confirmation</p>
            <h2 className="mt-1 text-xl font-black text-slate-50">Confirm Restore</h2>
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onCancel} aria-label="Close restore confirmation">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-4 rounded-card border border-rose-300/25 bg-rose-500/10 p-3 text-sm font-semibold leading-6 text-rose-100">
          Are you sure you want to restore this backup? This will replace current data and cannot be undone. Type RESTORE to continue.
        </p>
        <label className="mt-4 block">
          <span className="label">Confirmation text</span>
          <input className="input" value={confirmText} onChange={(event) => onChange(event.target.value)} placeholder="Type RESTORE" autoFocus />
        </label>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" disabled={working} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" disabled={!canConfirm} onClick={onConfirm}>
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />}
            Confirm Restore
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteBackupModal({ working, onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 p-4">
      <div className="surface w-full max-w-md p-5">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 flex-none place-items-center rounded-full border border-rose-300/25 bg-rose-500/10 text-rose-100">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black">Delete backup?</h2>
            <p className="mt-2 text-sm leading-6 muted">This will permanently remove the backup ZIP file and its record. You cannot restore using this backup after deletion.</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn btn-secondary" disabled={working} onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" disabled={working} onClick={onConfirm}>
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete Backup
          </button>
        </div>
      </div>
    </div>
  );
}

function BackupStorageSection({ onDirtyChange = null, onOpenTab = null }) {
  const { request, token, user } = useAuth();
  const { push } = useToast();
  const navigate = useNavigate();
  const recentBackupsRef = useRef(null);
  const restoreSectionRef = useRef(null);
  const canEdit = isBackupAdminUser(user) && can(user, 'manage_backup_storage');
  const { data, loading, error, reload } = useResource(() => request('/settings/backup-storage'), [request]);
  const [settings, setSettings] = useState({ automaticBackupEnabled: false, backupFrequency: 'Weekly' });
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreFileInputKey, setRestoreFileInputKey] = useState(0);
  const [restoreValidationStatus, setRestoreValidationStatus] = useState('idle');
  const [restoreValidation, setRestoreValidation] = useState(null);
  const [restoreSourceLabel, setRestoreSourceLabel] = useState('');
  const [selectedRestoreBackup, setSelectedRestoreBackup] = useState(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [deleteBackupCandidate, setDeleteBackupCandidate] = useState(null);
  const saved = data?.settings || {};
  const dirty = stableJson(settings) !== stableJson({
    automaticBackupEnabled: Boolean(saved.automaticBackupEnabled),
    backupFrequency: saved.backupFrequency || 'Weekly'
  });

  useEffect(() => {
    setSettings({
      automaticBackupEnabled: Boolean(saved.automaticBackupEnabled),
      backupFrequency: saved.backupFrequency || 'Weekly'
    });
  }, [saved.automaticBackupEnabled, saved.backupFrequency]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  function resetRestoreFlow() {
    setRestoreFile(null);
    setRestoreValidation(null);
    setRestoreValidationStatus('idle');
    setRestoreSourceLabel('');
    setSelectedRestoreBackup(null);
    setRestoreConfirmOpen(false);
    setRestoreConfirmText('');
    setRestoreFileInputKey((current) => current + 1);
  }

  function selectExistingBackupForRestore(record) {
    if (!record?.id) return;
    restoreSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setRestoreFile(null);
    setRestoreFileInputKey((current) => current + 1);
    setRestoreValidation(null);
    setRestoreValidationStatus('selected');
    setRestoreSourceLabel(record.filename || 'Selected backup');
    setSelectedRestoreBackup(record);
  }

  function handleRestoreFileChange(event) {
    const file = event.target.files?.[0] || null;
    setRestoreValidation(null);
    setRestoreSourceLabel('');
    setSelectedRestoreBackup(null);
    if (!file) {
      setRestoreFile(null);
      setRestoreValidationStatus('idle');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.zip')) {
      setRestoreFile(null);
      setRestoreValidationStatus('invalid');
      setRestoreFileInputKey((current) => current + 1);
      push('Invalid backup file. Select a .zip backup file.', 'error');
      return;
    }
    setRestoreFile(file);
    setRestoreValidationStatus('idle');
  }

  async function saveSettings(event) {
    event.preventDefault();
    if (!canEdit) return;
    setSaving(true);
    try {
      const result = await request('/settings/backup-storage', {
        method: 'PATCH',
        body: JSON.stringify(settings)
      });
      push(result.message || 'Backup settings saved');
      await reload({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function createBackup(downloadAfter = false) {
    if (!canEdit) return;
    setWorking(true);
    try {
      const result = await request('/settings/backups', { method: 'POST' });
      push(result.message || 'Backup created');
      await reload({ silent: true });
      if (downloadAfter && result.backup?.id) await downloadBackup(result.backup.id);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setWorking(false);
    }
  }

  async function downloadBackup(id) {
    if (!id) return;
    try {
      const response = await fetch(`${apiBase}/settings/backups/${id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) throw new Error('Backup download failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `universal-systems-backup-${Date.now()}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      push(err.message, 'error');
    }
  }

  async function validateRestore() {
    if (!canEdit) return;
    if (!restoreFile) {
      push('Choose a backup ZIP file first', 'error');
      return;
    }
    const body = new FormData();
    body.append('backup', restoreFile);
    setRestoreValidationStatus('validating');
    setWorking(true);
    try {
      const result = await request('/settings/backups/restore', { method: 'POST', body });
      setRestoreValidation(result);
      setRestoreSourceLabel(restoreFile.name);
      setRestoreValidationStatus('verified');
      push(result.message || 'Backup validated', 'info');
    } catch (err) {
      setRestoreValidation(null);
      setRestoreValidationStatus('invalid');
      push(err.message, 'error');
    } finally {
      setWorking(false);
    }
  }

  async function validateExistingBackup(id = selectedRestoreBackup?.id) {
    if (!canEdit) return;
    if (!id) return;
    const source = (data?.records || []).find((record) => record.id === id);
    restoreSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setRestoreFile(null);
    setRestoreFileInputKey((current) => current + 1);
    setRestoreValidationStatus('validating');
    setRestoreSourceLabel(source?.filename || 'Selected backup');
    setSelectedRestoreBackup(source || null);
    setWorking(true);
    try {
      const result = await request(`/settings/backups/${id}/restore`, { method: 'POST' });
      setRestoreValidation(result);
      setRestoreValidationStatus('verified');
      push(result.message || 'Backup validated', 'info');
    } catch (err) {
      setRestoreValidation(null);
      setRestoreValidationStatus('invalid');
      push(err.message, 'error');
    } finally {
      setWorking(false);
    }
  }

  async function confirmRestore() {
    if (!restoreValidation?.restoreToken) return;
    setWorking(true);
    try {
      const result = await request('/settings/backups/restore', {
        method: 'POST',
        body: JSON.stringify({ restoreToken: restoreValidation.restoreToken, confirmRestore: true })
      });
      push(result.message || 'Backup restored successfully');
      resetRestoreFlow();
      await reload({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setWorking(false);
    }
  }

  function showRestoreConfirmation() {
    if (!restoreValidation?.restoreToken || restoreValidationStatus !== 'verified') return;
    setRestoreConfirmText('');
    setRestoreConfirmOpen(true);
  }

  function showHelp() {
    restoreSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    push('Validate a backup ZIP before restore. A pre-restore backup is created automatically before data is replaced.', 'info');
  }

  async function deleteBackup(record) {
    if (!record?.id) return;
    setWorking(true);
    try {
      const result = await request(`/settings/backups/${record.id}`, { method: 'DELETE' });
      push(result.message || 'Backup deleted');
      setDeleteBackupCandidate(null);
      await reload({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setWorking(false);
    }
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  const storage = data?.storage || {};
  const records = data?.records || [];
  const latestBackup = records[0];
  const nextBackup = backupNextRunLabel(saved);
  const lastBackupStatus = latestBackup ? titleCase(latestBackup.status) : 'No backup yet';
  const restoreReady = restoreValidationStatus === 'verified' && Boolean(restoreValidation?.restoreToken);
  const validationLabel = restoreValidationStatus === 'validating'
    ? 'Validating'
    : restoreValidationStatus === 'verified'
      ? 'Backup verified'
      : restoreValidationStatus === 'selected'
        ? 'Selected backup ready for validation.'
        : restoreValidationStatus === 'invalid'
          ? 'Invalid backup file'
          : 'Not validated yet';
  const validationTone = restoreValidationStatus === 'verified'
    ? 'border-emerald-300/25 bg-emerald-500/10 text-emerald-100'
    : restoreValidationStatus === 'invalid'
      ? 'border-rose-300/25 bg-rose-500/10 text-rose-100'
      : restoreValidationStatus === 'validating'
        ? 'border-sky-300/25 bg-sky-500/10 text-sky-100'
        : restoreValidationStatus === 'selected'
          ? 'border-amber-300/25 bg-amber-500/10 text-amber-100'
          : 'border-white/10 bg-white/[0.035] text-slate-300';
  const restoreSteps = [
    ['1', 'Choose backup ZIP file', UploadCloud],
    ['2', 'Validate backup', ShieldCheck],
    ['3', 'Create pre-restore backup', DatabaseBackup],
    ['4', 'Confirm restore', ArchiveRestore]
  ];
  return (
    <div className="grid gap-5 pb-32" data-backup-storage-root>
      <section className="surface admin-control-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="admin-control-icon"><DatabaseBackup className="h-5 w-5" /></div>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                <span>Settings</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span>System</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-[var(--brand)]">Backup & Storage</span>
              </div>
              <h2 className="text-2xl font-black tracking-tight sm:text-3xl">Backup & Storage</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 muted">Manage storage usage, create backups, export data, and restore system data safely.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary admin-compact-button" disabled={!canEdit || working} onClick={() => createBackup(false)}>
              {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseBackup className="h-4 w-4" />}
              Backup Now
            </button>
            <button type="button" className="btn btn-secondary admin-compact-button" disabled={!canEdit || working} onClick={() => createBackup(true)}>
              <Download className="h-4 w-4" />
              Export Data
            </button>
            <button type="button" className="btn btn-secondary admin-compact-button" onClick={showHelp}>
              <Info className="h-4 w-4" />
              Help
            </button>
          </div>
        </div>
        {!canEdit ? (
          <p className="mt-4 rounded-card border border-amber-300/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-100">
            Backup and restore actions are available only to Admin or Super Admin users with backup storage permission.
          </p>
        ) : null}
      </section>

      <section>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard icon={HardDrive} label="Storage Used" value={formatBytes(storage.storageUsed)} helper="Uploads, PDFs, backups" tone="blue" />
          <AdminMetricCard icon={FileText} label="Uploaded Documents" value={formatBytes(storage.uploadedDocumentsStorage)} helper={`${storage.uploadedDocumentCount || 0} generated PDFs`} tone="cyan" actionLabel="View Documents" onAction={() => navigate('/admin/documents')} />
          <AdminMetricCard icon={ImageUp} label="Image Uploads" value={formatBytes(storage.imageUploadStorage)} helper={`${storage.imageUploadCount || 0} uploaded images`} tone="green" actionLabel="View Images" onAction={() => onOpenTab ? onOpenTab('publicWebsite') : push('Open Public Website Settings to review uploaded images.', 'info')} />
          <AdminMetricCard icon={DatabaseBackup} label="Backup Files" value={formatBytes(storage.backupStorage)} helper={`${storage.backupCount || 0} backup bundles`} tone="amber" actionLabel="View Backups" onAction={() => recentBackupsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="grid min-w-0 gap-5">
          <section className="surface admin-control-card p-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <div className="admin-control-icon"><Settings2 className="h-5 w-5" /></div>
                <div>
                  <h3 className="text-xl font-black">Backup Settings</h3>
                  <p className="mt-2 text-sm leading-6 muted">Automatic backups help protect your system data daily/weekly.</p>
                </div>
              </div>
            </div>

            <form className="mt-5 grid gap-4 lg:grid-cols-2" onSubmit={saveSettings}>
              <div className="flex items-center justify-between gap-3 rounded-card border border-white/10 bg-white/[0.035] px-3 py-3">
                <span>
                  <span className="block font-bold text-slate-100">Automatic Backup</span>
                  <span className="mt-1 block text-xs muted">Turn on scheduled backup protection.</span>
                </span>
                <label className={`flex items-center gap-3 ${!canEdit || saving ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={settings.automaticBackupEnabled}
                    disabled={!canEdit || saving}
                    onChange={(event) => setSettings((current) => ({ ...current, automaticBackupEnabled: event.target.checked }))}
                  />
                  <span
                    role="switch"
                    aria-checked={settings.automaticBackupEnabled}
                    className={`relative h-8 w-16 rounded-full border transition duration-200 ${settings.automaticBackupEnabled ? 'border-sky-300/45 bg-sky-400/25 shadow-[0_0_22px_rgba(56,189,248,0.18)]' : 'border-white/10 bg-slate-950/45'}`}
                  >
                    <span className={`absolute top-1 h-6 w-6 rounded-full transition-all duration-200 ${settings.automaticBackupEnabled ? 'left-9 bg-sky-200 shadow-[0_0_18px_rgba(186,230,253,0.42)]' : 'left-1 bg-slate-500/90'}`} />
                  </span>
                  <span className={`min-w-8 text-xs font-black uppercase ${settings.automaticBackupEnabled ? 'text-sky-100' : 'text-slate-300'}`}>{settings.automaticBackupEnabled ? 'ON' : 'OFF'}</span>
                </label>
              </div>
              <label>
                <span className="label">Backup Frequency</span>
                <select className="input" value={settings.backupFrequency} disabled={!canEdit || saving} onChange={(event) => setSettings((current) => ({ ...current, backupFrequency: event.target.value }))}>
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
                </select>
              </label>
              <div className="rounded-card border border-white/10 bg-white/[0.035] p-3">
                <p className="text-xs font-black uppercase text-slate-400">Next backup date/time</p>
                <p className="mt-1 font-bold text-slate-100">{nextBackup}</p>
              </div>
              <div className="rounded-card border border-white/10 bg-white/[0.035] p-3">
                <p className="text-xs font-black uppercase text-slate-400">Last backup status</p>
                <p className="mt-1 font-bold text-slate-100">{lastBackupStatus}</p>
                <p className="mt-1 text-xs muted">{saved.lastBackupAt ? formatDate(saved.lastBackupAt) : 'No backup yet'}</p>
              </div>
              <div className="flex flex-col-reverse gap-2 lg:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm muted">Save changes after updating automatic backup preferences.</p>
                <button className="btn btn-primary" disabled={!canEdit || !dirty || saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Backup Settings
                </button>
              </div>
            </form>
          </section>

          <section ref={restoreSectionRef} className="surface admin-control-card border-rose-300/20 p-5">
            <div className="flex items-start gap-3">
              <div className="grid h-11 w-11 flex-none place-items-center rounded-full border border-rose-300/25 bg-rose-500/10 text-rose-100">
                <ArchiveRestore className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-black text-rose-50">Restore / Data Recovery</h3>
                <div className="mt-2 flex items-start gap-3 rounded-card border border-rose-300/40 bg-rose-500/10 p-3 text-sm font-semibold leading-6 text-rose-100 shadow-[0_0_28px_rgba(244,63,94,0.12)]">
                  <AlertTriangle className="mt-0.5 h-5 w-5 flex-none text-rose-100" />
                  <p>Restoring backup will replace current data. Create a backup before restoring. This action cannot be undone.</p>
                </div>
              </div>
            </div>

            {selectedRestoreBackup ? (() => {
              const meta = backupMetadata(selectedRestoreBackup);
              return (
                <div className="mt-5 rounded-card border border-sky-300/25 bg-sky-400/10 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-wide text-sky-100">Selected Backup</p>
                      <h4 className="mt-1 font-black text-slate-50">{backupDisplayTitle(selectedRestoreBackup)}</h4>
                      <p className="mt-1 text-sm muted">{meta.date} <span aria-hidden="true">&bull;</span> {meta.size} <span aria-hidden="true">&bull;</span> Created by {meta.createdBy}</p>
                      <p className="mt-2 text-xs font-black uppercase tracking-wide text-slate-300">Backup status: {titleCase(selectedRestoreBackup.status || 'Unknown')}</p>
                    </div>
                    <span className="admin-premium-badge">{validationLabel}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="btn btn-secondary admin-table-button" disabled={working} onClick={resetRestoreFlow}>
                      Change Backup
                    </button>
                    <button type="button" className="btn btn-secondary admin-table-button" disabled={!canEdit || working} onClick={() => validateExistingBackup(selectedRestoreBackup.id)}>
                      {restoreValidationStatus === 'validating' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      Validate Backup
                    </button>
                  </div>
                  <BackupFileDetails record={selectedRestoreBackup} />
                </div>
              );
            })() : null}

            <ol className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {restoreSteps.map(([step, label, Icon]) => (
                <li key={step} className="rounded-card border border-white/10 bg-white/[0.035] p-3">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-sky-400/15 text-xs font-black text-sky-100">{step}</span>
                    <Icon className="h-4 w-4 text-[var(--brand)]" />
                  </div>
                  <p className="mt-2 text-sm font-bold text-slate-100">{label}</p>
                </li>
              ))}
            </ol>

            <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
              {selectedRestoreBackup ? (
                <div className="rounded-card border border-white/10 bg-white/[0.035] p-3">
                  <p className="text-xs font-black uppercase tracking-wide text-slate-400">Restore source</p>
                  <p className="mt-1 text-sm font-bold text-slate-100">Using selected Recent Backups file.</p>
                </div>
              ) : (
                <label className="min-w-0">
                  <span className="label">Select Backup File (ZIP)</span>
                  <input key={restoreFileInputKey} className="input" type="file" accept=".zip" disabled={!canEdit || working} onChange={handleRestoreFileChange} />
                  <span className="mt-1 block break-words text-xs muted">{restoreSourceLabel || restoreFile?.name || 'Choose a Universal Systems backup .zip file.'}</span>
                </label>
              )}
              <div className={`rounded-card border p-3 ${validationTone}`}>
                <p className="text-xs font-black uppercase tracking-wide opacity-80">Validation status</p>
                <div className="mt-2 flex items-center gap-2 font-black">
                  {restoreValidationStatus === 'validating' ? <Loader2 className="h-4 w-4 animate-spin" /> : restoreValidationStatus === 'verified' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                  {validationLabel}
                </div>
                {restoreValidation?.summary ? (
                  <p className="mt-2 text-xs leading-5 opacity-85">
                    {restoreValidation.summary.collections || 0} collections, {restoreValidation.summary.uploadFiles || 0} uploaded files, {restoreValidation.summary.pdfFiles || 0} PDF files.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn btn-secondary" disabled={working && restoreValidationStatus === 'validating'} onClick={resetRestoreFlow}>
                Cancel
              </button>
              {!selectedRestoreBackup ? <button type="button" className="btn btn-secondary" disabled={!canEdit || working || !restoreFile} onClick={validateRestore}>
                {restoreValidationStatus === 'validating' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Validate Backup
              </button> : null}
              <button type="button" className="btn btn-danger" disabled={!canEdit || working || !restoreReady} onClick={showRestoreConfirmation}>
                <ArchiveRestore className="h-4 w-4" />
                Start Restore
              </button>
            </div>
          </section>
        </div>

        <aside ref={recentBackupsRef} className="surface admin-control-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-xl font-black">Recent Backups</h3>
              <p className="mt-1 text-sm muted">Recent backup files available for download or restore validation.</p>
            </div>
            <DatabaseBackup className="h-5 w-5 text-[var(--brand)]" />
          </div>
          <div className="mt-4 grid gap-3">
            {records.length ? records.map((record) => {
              const meta = backupMetadata(record);
              return (
                <article key={record.id} className="rounded-card border border-white/10 bg-white/[0.035] p-3" title={record.filename || ''}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-black text-slate-100">{backupDisplayTitle(record)}</p>
                      <p className="mt-1 text-xs muted">
                        {meta.date} <span aria-hidden="true">&bull;</span> {meta.size} <span aria-hidden="true">&bull;</span> Created by {meta.createdBy}
                      </p>
                    </div>
                    <span className="admin-premium-badge">{titleCase(record.status)}</span>
                  </div>
                  <BackupFileDetails record={record} />
                  <div className="mt-3 grid gap-2 sm:grid-cols-3">
                    <button type="button" className="btn btn-secondary admin-table-button w-full justify-center" disabled={!canEdit || working} onClick={() => downloadBackup(record.id)}>Download</button>
                    <button type="button" className="btn btn-secondary admin-table-button w-full justify-center" disabled={!canEdit || working} onClick={() => selectExistingBackupForRestore(record)}>Use for Restore</button>
                    <button type="button" className="btn btn-secondary admin-table-button w-full justify-center text-rose-100" disabled={!canEdit || working} onClick={() => setDeleteBackupCandidate(record)}>Delete</button>
                  </div>
                </article>
              );
            }) : (
              <div className="rounded-card border border-dashed border-white/15 bg-white/[0.035] p-5 text-center">
                <DatabaseBackup className="mx-auto h-9 w-9 text-[var(--brand)]" />
                <p className="mt-3 font-black text-slate-100">No backup files yet.</p>
                <p className="mt-2 text-sm leading-6 muted">Create your first backup to enable restore options.</p>
              </div>
            )}
          </div>
        </aside>
      </div>

      {restoreConfirmOpen ? (
        <RestoreConfirmationModal
          confirmText={restoreConfirmText}
          working={working}
          onChange={setRestoreConfirmText}
          onCancel={() => {
            if (working) return;
            setRestoreConfirmOpen(false);
            setRestoreConfirmText('');
          }}
          onConfirm={confirmRestore}
        />
      ) : null}
      {deleteBackupCandidate ? (
        <DeleteBackupModal
          working={working}
          onCancel={() => setDeleteBackupCandidate(null)}
          onConfirm={() => deleteBackup(deleteBackupCandidate)}
        />
      ) : null}
    </div>
  );
}

function updateDraftPath(current, path, value) {
  const next = clonePlain(current);
  const keys = path.split('.');
  let cursor = next;
  keys.slice(0, -1).forEach((key) => {
    cursor[key] = cursor[key] || {};
    cursor = cursor[key];
  });
  cursor[keys.at(-1)] = value;
  return next;
}

function BusinessSettingsFrame({
  section,
  tabId,
  title,
  icon: Icon,
  description,
  onDirtyChange,
  children,
  showHeader = true,
  saveLabel = 'Save Changes',
  resetLabel = 'Cancel / Revert',
  resetMode = 'saved',
  showActionsWhenClean = false,
  previewLabel = '',
  previewMessage = ''
}) {
  const { request, user } = useAuth();
  const { push } = useToast();
  const permission = businessPermissionByTab[tabId];
  const canEdit = hasRole(user, 'admin') && (!permission || can(user, permission));
  const defaults = businessSettingsDefaults[section] || {};
  const { data, loading, error, reload } = useResource(() => request('/settings/business'), [request]);
  const saved = useMemo(() => clonePlain(data?.settings?.[section] || defaults), [data?.settings, section]);
  const [form, setForm] = useState(clonePlain(defaults));
  const [saving, setSaving] = useState(false);
  const savedJson = stableJson(saved);
  const dirty = stableJson(form) !== savedJson;

  useEffect(() => {
    setForm(clonePlain(saved));
  }, [savedJson]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  function setPath(path, value) {
    setForm((current) => updateDraftPath(current, path, value));
  }

  async function save(event) {
    event.preventDefault();
    if (!canEdit) {
      push('You do not have permission to save this settings section', 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await request(`/settings/business/${section}`, {
        method: 'PATCH',
        body: JSON.stringify(form)
      });
      push(result.message || 'Settings saved');
      await reload({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setForm(clonePlain(resetMode === 'defaults' ? defaults : saved));
  }

  function previewSettings() {
    push(previewMessage || 'Preview will use saved settings in future generated PDF documents.', 'info');
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <form className="grid gap-5" onSubmit={save}>
      {showHeader ? (
        <section className="surface admin-control-card p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="admin-control-icon"><Icon className="h-5 w-5" /></div>
              <div>
                <h2 className="text-2xl font-black">{title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 muted">{description}</p>
              </div>
            </div>
            <span className="admin-premium-badge">FUTURE-READY DEFAULTS</span>
          </div>
          {!canEdit ? <p className="mt-4 rounded-card border border-amber-300/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-100">Only admin users with this settings permission can save changes.</p> : null}
        </section>
      ) : (!canEdit ? <p className="rounded-card border border-amber-300/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-100">Only admin users with this settings permission can save changes.</p> : null)}
      {children({ form, setForm, setPath, canEdit, saving })}
      {dirty || showActionsWhenClean ? (
        <div className="settings-sticky-actions">
          <button type="button" className="btn btn-secondary" disabled={saving} onClick={resetForm}>
            <RotateCcw className="h-4 w-4" />
            {resetLabel}
          </button>
          {previewLabel ? (
            <button type="button" className="btn btn-secondary" disabled={saving} onClick={previewSettings}>
              <Eye className="h-4 w-4" />
              {previewLabel}
            </button>
          ) : null}
          <button type="submit" className="btn btn-primary" disabled={!canEdit || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : saveLabel}
          </button>
        </div>
      ) : null}
    </form>
  );
}

function DocumentNumberingSection({ onDirtyChange = null, embedded = false }) {
  const rows = [
    ['invoice', 'Invoice'],
    ['workOrder', 'Work Order'],
    ['quotation', 'Quotation'],
    ['amc', 'AMC'],
    ['paymentReceipt', 'Payment Receipt']
  ];
  const year = new Date().getFullYear();
  return (
    <BusinessSettingsFrame
      section="documentNumbering"
      tabId="documentNumbering"
      title="Document Numbering"
      icon={Hash}
      description="Prepare future prefixes and next numbers for invoices, quotations, work orders, AMC, and payment receipts without changing live generation yet."
      onDirtyChange={onDirtyChange}
      showHeader={!embedded}
      saveLabel={embedded ? 'Save Numbering' : 'Save Changes'}
      resetLabel={embedded ? 'Reset Default' : 'Cancel / Revert'}
      resetMode={embedded ? 'defaults' : 'saved'}
      showActionsWhenClean={embedded}
    >
      {({ form, setPath, canEdit, saving }) => {
        const prefixes = rows.map(([key]) => form[key]?.prefix || '');
        const hasDuplicate = new Set(prefixes).size !== prefixes.length;
        return (
          <section className="surface admin-control-card p-5">
            <div className="grid gap-3">
              {rows.map(([key, label]) => {
                const item = form[key] || {};
                const preview = `${item.prefix || label.slice(0, 3).toUpperCase()}-${year}-${String(item.nextNumber || 1).padStart(4, '0')}`;
                return (
                  <div key={key} className="grid gap-3 rounded-card border border-white/10 bg-white/[0.035] p-3 lg:grid-cols-[1fr_140px_1fr]">
                    <label>
                      <span className="label">{label} prefix</span>
                      <input className="input uppercase" maxLength={12} value={item.prefix || ''} disabled={!canEdit || saving} onChange={(event) => setPath(`${key}.prefix`, event.target.value.toUpperCase())} />
                    </label>
                    <label>
                      <span className="label">Next number</span>
                      <input className="input" type="number" min="1" value={item.nextNumber || 1} disabled={!canEdit || saving} onChange={(event) => setPath(`${key}.nextNumber`, event.target.value)} />
                    </label>
                    <div>
                      <span className="label">Preview</span>
                      <div className="grid min-h-12 place-items-center rounded-card border border-white/10 bg-slate-950/30 px-3 font-black text-sky-100">{preview}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <label className="mt-4 flex items-center justify-between gap-3 rounded-card border border-white/10 bg-white/[0.035] px-3 py-3">
              <span>
                <span className="block font-bold text-slate-100">Yearly reset option</span>
                <span className="mt-1 block text-xs muted">Stored for future document generation migration.</span>
              </span>
              <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={Boolean(form.yearlyReset)} disabled={!canEdit || saving} onChange={(event) => setPath('yearlyReset', event.target.checked)} />
            </label>
            {hasDuplicate ? <p className="mt-3 rounded-card border border-amber-300/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-100">Prefixes must be unique before saving.</p> : null}
          </section>
        );
      }}
    </BusinessSettingsFrame>
  );
}

const taxDashboardDefaults = {
  gstInfo: {
    gstNumber: '33ABCDE1234F1Z5',
    businessName: 'Universal Systems',
    tradeName: 'Universal Systems',
    registeredAddress: 'MIG-H3, Housing Unit, Near 4 Roads, Mathiyankuttai Post, Mettur Dam - 636452, Salem, Tamil Nadu, India.',
    stateCode: '33'
  },
  rates: {
    cgstRate: '9',
    sgstRate: '9',
    igstRate: '18',
    cessRate: '0'
  },
  settings: {
    gstEnabled: true,
    roundOffTax: true,
    showTaxSummaryInInvoice: true
  },
  codes: [
    { id: 'sac-998713', code: '998713', type: 'Service (SAC)', description: 'Annual Maintenance Service', gstRate: '18' },
    { id: 'hsn-84713010', code: '84713010', type: 'Goods (HSN)', description: 'Laptop Computers', gstRate: '18' },
    { id: 'hsn-85258090', code: '85258090', type: 'Goods (HSN)', description: 'LED Monitor', gstRate: '18' },
    { id: 'hsn-85234920', code: '85234920', type: 'Goods (HSN)', description: 'Printer', gstRate: '18' }
  ]
};

function taxPercentValue(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return String(fallback);
  return String(number).replace(/\.0+$/, '');
}

function taxPercentLabel(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return '0%';
  const label = Number.isInteger(number) ? String(number) : number.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  return `${label}%`;
}

function buildTaxDashboardState(saved = {}) {
  const igstRate = taxPercentValue(saved.defaultPercentage ?? taxDashboardDefaults.rates.igstRate, taxDashboardDefaults.rates.igstRate);
  const splitRate = saved.splitCgstSgst === false ? taxDashboardDefaults.rates.cgstRate : taxPercentValue(Number(igstRate) / 2, taxDashboardDefaults.rates.cgstRate);
  const gstVerified = Boolean(taxDashboardDefaults.gstInfo.gstNumber);
  const gstEnabled = saved.gstEnabledManual ? Boolean(saved.enabled) : (gstVerified || Boolean(saved.enabled ?? taxDashboardDefaults.settings.gstEnabled));
  return {
    gstInfo: { ...taxDashboardDefaults.gstInfo },
    rates: {
      cgstRate: splitRate,
      sgstRate: splitRate,
      igstRate,
      cessRate: taxDashboardDefaults.rates.cessRate
    },
    settings: {
      gstEnabled,
      roundOffTax: taxDashboardDefaults.settings.roundOffTax,
      showTaxSummaryInInvoice: saved.showGstOnInvoices ?? taxDashboardDefaults.settings.showTaxSummaryInInvoice
    },
    codes: taxDashboardDefaults.codes.map((item) => ({ ...item }))
  };
}

function TaxToggle({ label, helper = '', checked, disabled = false, onChange }) {
  return (
    <label className={`flex items-center justify-between gap-3 rounded-card border border-white/10 bg-white/[0.035] px-3 py-3 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <span className="min-w-0">
        <span className="block text-sm font-black text-slate-100">{label}</span>
        {helper ? <span className="mt-1 block text-xs muted">{helper}</span> : null}
      </span>
      <span className="flex flex-none items-center gap-2">
        <span className={`text-xs font-black uppercase ${checked ? 'text-sky-100' : 'text-slate-400'}`}>{checked ? 'ON' : 'OFF'}</span>
        <input className="sr-only" type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange?.(event.target.checked)} />
        <span
          role="switch"
          aria-checked={checked}
          className={`relative h-7 w-14 rounded-full border transition duration-200 ${checked ? 'border-sky-300/45 bg-sky-400/25 shadow-[0_0_18px_rgba(56,189,248,0.18)]' : 'border-white/10 bg-slate-950/45'}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full transition duration-200 ${checked ? 'left-8 bg-sky-100' : 'left-1 bg-slate-400'}`} />
        </span>
      </span>
    </label>
  );
}

function TaxInfoLine({ label, value, highlight = false }) {
  return (
    <div className="rounded-card border border-white/10 bg-white/[0.035] p-3">
      <p className="text-xs font-black uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 break-words text-sm font-black ${highlight ? 'text-sky-100' : 'text-slate-100'}`}>{value}</p>
    </div>
  );
}

function TaxDashboardModal({ title, icon: Icon, children, saving, submitLabel, onCancel, onSubmit }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <form className="surface admin-modal w-full max-w-2xl p-5" onSubmit={onSubmit}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="admin-control-icon"><Icon className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Tax & GST</p>
              <h2 className="mt-1 text-xl font-black text-slate-50">{title}</h2>
            </div>
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onCancel} aria-label="Close tax settings modal">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid gap-4">{children}</div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" disabled={saving} onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function TaxGstSettingsSection({ onDirtyChange = null }) {
  const { request, token, user } = useAuth();
  const { push } = useToast();
  const { data, loading, error } = useResource(() => request('/settings/business'), [request]);
  const [taxState, setTaxState] = useState(() => buildTaxDashboardState());
  const [initialized, setInitialized] = useState(false);
  const [search, setSearch] = useState('');
  const [modalType, setModalType] = useState(null);
  const [modalDraft, setModalDraft] = useState({});
  const [editingCodeId, setEditingCodeId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [backupWorking, setBackupWorking] = useState(false);
  const canEdit = (hasRole(user, 'admin') || hasRole(user, 'super_admin')) && can(user, 'manage_tax_settings');
  const canBackup = isBackupAdminUser(user) && can(user, 'manage_backup_storage');

  useEffect(() => {
    onDirtyChange?.(false);
  }, [onDirtyChange]);

  useEffect(() => {
    if (initialized || !data?.settings) return;
    setTaxState(buildTaxDashboardState(data.settings.taxGst || {}));
    setInitialized(true);
  }, [data?.settings, initialized]);

  const filteredCodes = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return taxState.codes;
    return taxState.codes.filter((item) => `${item.code} ${item.type} ${item.description} ${item.gstRate}`.toLowerCase().includes(query));
  }, [search, taxState.codes]);

  function setModalValue(key, value) {
    setModalDraft((current) => ({ ...current, [key]: value }));
  }

  function closeModal() {
    if (saving) return;
    setModalType(null);
    setModalDraft({});
    setEditingCodeId(null);
  }

  function openDetailsModal() {
    setModalType('details');
    setModalDraft({ ...taxState.gstInfo });
  }

  function openRatesModal() {
    setModalType('rates');
    setModalDraft({ ...taxState.rates });
  }

  function openSettingsModal() {
    setModalType('settings');
    setModalDraft({ ...taxState.settings });
  }

  function openCodeModal(record = null) {
    setModalType('code');
    setEditingCodeId(record?.id || null);
    setModalDraft(record ? { ...record } : { code: '', type: 'Goods (HSN)', description: '', gstRate: '18' });
  }

  async function downloadTaxBackup(id) {
    if (!id) return;
    const response = await fetch(`${apiBase}/settings/backups/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!response.ok) throw new Error('Backup download failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `universal-systems-backup-${Date.now()}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function createTaxBackup(downloadAfter = false) {
    if (!canBackup) {
      push('Backup actions are available only to Admin or Super Admin users with backup permission.', 'error');
      return;
    }
    setBackupWorking(true);
    try {
      const result = await request('/settings/backups', { method: 'POST' });
      push(result.message || 'Backup created');
      if (downloadAfter && result.backup?.id) await downloadTaxBackup(result.backup.id);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setBackupWorking(false);
    }
  }

  async function saveTaxCore(nextState = taxState, message = 'Tax settings saved successfully') {
    if (!canEdit) {
      push('Only Admin or Super Admin users with tax settings permission can update Tax & GST settings.', 'error');
      return false;
    }
    setSaving(true);
    try {
      await request('/settings/business/taxGst', {
        method: 'PATCH',
        body: JSON.stringify({
          enabled: Boolean(nextState.settings.gstEnabled),
          gstEnabledManual: true,
          defaultPercentage: Number(nextState.rates.igstRate || 0),
          splitCgstSgst: true,
          taxLabel: 'GST',
          showGstOnInvoices: Boolean(nextState.settings.showTaxSummaryInInvoice)
        })
      });
      push(message);
      return true;
    } catch (err) {
      push(err.message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function submitModal(event) {
    event.preventDefault();
    if (!canEdit) {
      push('Only Admin or Super Admin users with tax settings permission can update Tax & GST settings.', 'error');
      return;
    }
    if (modalType === 'details') {
      setTaxState((current) => ({
        ...current,
        gstInfo: { ...modalDraft },
        settings: {
          ...current.settings,
          gstEnabled: String(modalDraft.gstNumber || '').trim() ? true : current.settings.gstEnabled
        }
      }));
      push('GST details updated successfully');
      closeModal();
      return;
    }
    if (modalType === 'rates') {
      const nextState = { ...taxState, rates: { ...taxState.rates, ...modalDraft } };
      setTaxState(nextState);
      if (await saveTaxCore(nextState)) closeModal();
      return;
    }
    if (modalType === 'settings') {
      const nextState = { ...taxState, settings: { ...taxState.settings, ...modalDraft } };
      setTaxState(nextState);
      if (await saveTaxCore(nextState)) closeModal();
      return;
    }
    if (modalType === 'code') {
      if (!String(modalDraft.code || '').trim() || !String(modalDraft.description || '').trim()) {
        push('Code and description are required.', 'error');
        return;
      }
      const normalizedCode = {
        id: editingCodeId || `${String(modalDraft.type || 'code').toLowerCase().replace(/\W+/g, '-')}-${Date.now()}`,
        code: String(modalDraft.code || '').trim(),
        type: modalDraft.type || 'Goods (HSN)',
        description: String(modalDraft.description || '').trim(),
        gstRate: taxPercentValue(modalDraft.gstRate, 18)
      };
      setTaxState((current) => ({
        ...current,
        codes: editingCodeId
          ? current.codes.map((item) => item.id === editingCodeId ? normalizedCode : item)
          : [normalizedCode, ...current.codes]
      }));
      push(editingCodeId ? 'Tax settings saved successfully' : 'HSN/SAC code added successfully');
      closeModal();
    }
  }

  function deleteCode(record) {
    if (!canEdit) {
      push('Only Admin or Super Admin users with tax settings permission can delete HSN/SAC codes.', 'error');
      return;
    }
    setTaxState((current) => ({ ...current, codes: current.codes.filter((item) => item.id !== record.id) }));
    push('HSN/SAC code deleted successfully');
  }

  function updateInlineSetting(key, value) {
    setTaxState((current) => ({ ...current, settings: { ...current.settings, [key]: value } }));
  }

  if (loading && !initialized) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  const modalTitle = modalType === 'details'
    ? 'Edit GST Details'
    : modalType === 'rates'
      ? 'Manage Tax Rates'
      : modalType === 'settings'
        ? 'Edit Tax Settings'
        : editingCodeId
          ? 'Edit HSN / SAC Code'
          : 'Add New HSN / SAC Code';
  const ModalIcon = modalType === 'details' ? Landmark : modalType === 'rates' ? Percent : modalType === 'settings' ? Settings2 : Hash;
  const modalSubmitLabel = modalType === 'code' ? (editingCodeId ? 'Save Code' : 'Add Code') : 'Save Tax Settings';
  const rateRows = [
    ['CGST Rate', taxState.rates.cgstRate],
    ['SGST Rate', taxState.rates.sgstRate],
    ['IGST Rate', taxState.rates.igstRate]
  ];
  const gstVerified = Boolean(taxState.gstInfo.gstNumber);
  const showGstDisabledWarning = gstVerified && !taxState.settings.gstEnabled;

  return (
    <div className="grid gap-5 pb-32" data-tax-gst-root>
      <section className="surface admin-control-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="admin-control-icon"><Percent className="h-5 w-5" /></div>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                <span>Settings</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span>System</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-[var(--brand)]">Tax & GST</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Tax & GST</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 muted">Configure tax rates, GST details, HSN/SAC codes, and tax related settings.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary admin-compact-button" disabled={backupWorking} onClick={() => createTaxBackup(false)}>
              {backupWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseBackup className="h-4 w-4" />}
              Backup Now
            </button>
            <button type="button" className="btn btn-secondary admin-compact-button" disabled={backupWorking} onClick={() => createTaxBackup(true)}>
              <Download className="h-4 w-4" />
              Export Data
            </button>
            <button type="button" className="btn btn-secondary admin-compact-button" onClick={() => push('Tax settings apply to new invoices, quotations, AMC invoices, and PDF tax display.', 'info')}>
              <Info className="h-4 w-4" />
              Help
            </button>
          </div>
        </div>
        {!canEdit ? (
          <p className="mt-4 rounded-card border border-amber-300/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-100">
            Only Admin or Super Admin users with tax settings permission can update this page.
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="surface admin-control-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="admin-control-icon"><Landmark className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-black">GST Information</h2>
                <p className="mt-1 text-sm muted">Registered business tax identity.</p>
              </div>
            </div>
            <span className="admin-premium-badge"><CheckCircle2 className="h-3.5 w-3.5" /> Verified</span>
          </div>
          <div className="mt-4 grid gap-3">
            <TaxInfoLine label="GST Number" value={taxState.gstInfo.gstNumber} highlight />
            <TaxInfoLine label="Business Name" value={taxState.gstInfo.businessName} />
            <TaxInfoLine label="Trade Name" value={taxState.gstInfo.tradeName} />
          </div>
          <button type="button" className="btn btn-secondary admin-table-button mt-4" disabled={!canEdit} onClick={openDetailsModal}>
            <Edit3 className="h-4 w-4" />
            Edit Details
          </button>
        </div>

        <div className="surface admin-control-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="admin-control-icon"><Percent className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-black">Tax Summary</h2>
                <p className="mt-1 text-sm muted">Default rates for new documents.</p>
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {rateRows.map(([label, value]) => (
              <div key={label} className="rounded-card border border-sky-300/15 bg-sky-400/10 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-sky-200">{label}</p>
                <p className="mt-1 text-2xl font-black text-slate-50">{taxPercentLabel(value)}</p>
              </div>
            ))}
          </div>
          <details className="mt-4 rounded-card border border-white/10 bg-white/[0.035] p-3">
            <summary className="cursor-pointer text-sm font-black text-sky-100">Advanced Tax Options</summary>
            <div className="mt-3 rounded-card border border-white/10 bg-slate-950/30 p-3">
              <p className="text-xs font-black uppercase tracking-wide text-slate-400">CESS Rate</p>
              <p className="mt-1 text-lg font-black text-slate-100">{taxPercentLabel(taxState.rates.cessRate)}</p>
            </div>
          </details>
          <button type="button" className="btn btn-secondary admin-table-button mt-4" disabled={!canEdit} onClick={openRatesModal}>
            <Settings2 className="h-4 w-4" />
            Manage Tax Rates
          </button>
        </div>

        <div className="surface admin-control-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="admin-control-icon"><Settings2 className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-black">Tax Settings</h2>
                <p className="mt-1 text-sm muted">Invoice and PDF display controls.</p>
              </div>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            <TaxToggle label="GST Enabled" checked={Boolean(taxState.settings.gstEnabled)} disabled={!canEdit || saving} onChange={(value) => updateInlineSetting('gstEnabled', value)} />
            <TaxToggle label="Round Off Tax" checked={Boolean(taxState.settings.roundOffTax)} disabled={!canEdit || saving} onChange={(value) => updateInlineSetting('roundOffTax', value)} />
            <TaxToggle label="Show Tax Summary in Invoice" checked={Boolean(taxState.settings.showTaxSummaryInInvoice)} disabled={!canEdit || saving} onChange={(value) => updateInlineSetting('showTaxSummaryInInvoice', value)} />
          </div>
          {showGstDisabledWarning ? (
            <p className="mt-4 rounded-card border border-amber-300/25 bg-amber-500/10 p-3 text-sm font-semibold leading-6 text-amber-100">
              GST number is verified, but GST is currently disabled for invoices.
            </p>
          ) : null}
          <button type="button" className="btn btn-secondary admin-table-button mt-4" disabled={!canEdit} onClick={openSettingsModal}>
            <Edit3 className="h-4 w-4" />
            Edit Settings
          </button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="surface admin-control-card min-w-0 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="admin-control-icon"><Hash className="h-5 w-5" /></div>
              <div>
                <h2 className="text-xl font-black">HSN / SAC Codes</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 muted">Manage HSN (Goods) and SAC (Services) codes for your products and services.</p>
              </div>
            </div>
            <button type="button" className="btn btn-primary admin-compact-button" disabled={!canEdit} onClick={() => openCodeModal()}>
              <Plus className="h-4 w-4" />
              Add New Code
            </button>
          </div>
          <div className="mt-5">
            <SearchBox value={search} onChange={setSearch} placeholder="Search HSN / SAC code or description..." />
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead>
                <tr className="bg-sky-500/10 text-xs uppercase tracking-wide text-sky-100">
                  <th className="rounded-l-card px-4 py-3 font-black">Code</th>
                  <th className="px-4 py-3 font-black">Type</th>
                  <th className="px-4 py-3 font-black">Description</th>
                  <th className="px-4 py-3 font-black">GST Rate</th>
                  <th className="rounded-r-card px-4 py-3 text-right font-black">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {filteredCodes.map((item) => (
                  <tr key={item.id} className="transition hover:bg-white/[0.035]">
                    <td className="whitespace-nowrap px-4 py-3 font-black text-sky-100">{item.code}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-200">{item.type}</td>
                    <td className="min-w-[220px] px-4 py-3 text-slate-100">{item.description}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-black text-slate-100">{taxPercentLabel(item.gstRate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button type="button" className="icon-button h-9 w-9" disabled={!canEdit} onClick={() => openCodeModal(item)} aria-label={`Edit HSN/SAC code ${item.code}`}>
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button type="button" className="icon-button h-9 w-9 text-rose-100" disabled={!canEdit} onClick={() => deleteCode(item)} aria-label={`Delete HSN/SAC code ${item.code}`}>
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 text-sm muted sm:flex-row sm:items-center sm:justify-between">
            <span>Showing 1 to {filteredCodes.length} of {filteredCodes.length} entries</span>
            <div className="flex items-center gap-2">
              <button type="button" className="btn btn-secondary admin-table-button" disabled>Previous</button>
              <span className="rounded-full border border-sky-300/25 bg-sky-400/10 px-3 py-1 text-xs font-black text-sky-100">Page 1</span>
              <button type="button" className="btn btn-secondary admin-table-button" disabled>Next</button>
            </div>
          </div>
        </div>

        <aside className="surface admin-control-card p-5">
          <div className="flex items-start gap-3">
            <div className="admin-control-icon"><Bell className="h-5 w-5" /></div>
            <div>
              <h2 className="text-xl font-black">Tax Activity Log</h2>
              <p className="mt-2 text-sm leading-6 muted">Saved tax changes will appear here from Audit Logs.</p>
            </div>
          </div>
          <div className="mt-5 rounded-card border border-white/10 bg-white/[0.035] p-4 text-sm leading-6 muted">
            No saved tax activity yet. Future GST, HSN/SAC, and tax setting changes will be shown here when audit history is connected.
          </div>
          <button type="button" className="btn btn-secondary admin-table-button mt-4 w-full" onClick={() => push('Full tax update history can be reviewed from Audit Logs.', 'info')}>
            View Audit Logs
          </button>
        </aside>
      </section>

      <section className="surface admin-control-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="admin-control-icon"><Info className="h-5 w-5" /></div>
            <p className="text-sm font-semibold leading-6 text-slate-200">
              Tax settings will apply only to new invoices, quotations, and AMC invoices. Existing records will not change.
            </p>
          </div>
          <button type="button" className="btn btn-primary admin-compact-button" disabled={!canEdit || saving} onClick={() => saveTaxCore()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Tax Settings
          </button>
        </div>
      </section>

      {modalType ? (
        <TaxDashboardModal title={modalTitle} icon={ModalIcon} saving={saving} submitLabel={modalSubmitLabel} onCancel={closeModal} onSubmit={submitModal}>
          {modalType === 'details' ? (
            <>
              <label>
                <span className="label">GST Number</span>
                <input className="input" value={modalDraft.gstNumber || ''} disabled={saving} onChange={(event) => setModalValue('gstNumber', event.target.value)} />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="label">Business Name</span>
                  <input className="input" value={modalDraft.businessName || ''} disabled={saving} onChange={(event) => setModalValue('businessName', event.target.value)} />
                </label>
                <label>
                  <span className="label">Trade Name</span>
                  <input className="input" value={modalDraft.tradeName || ''} disabled={saving} onChange={(event) => setModalValue('tradeName', event.target.value)} />
                </label>
              </div>
              <label>
                <span className="label">Registered Address</span>
                <textarea className="input min-h-24" value={modalDraft.registeredAddress || ''} disabled={saving} onChange={(event) => setModalValue('registeredAddress', event.target.value)} />
              </label>
              <label>
                <span className="label">State Code</span>
                <input className="input" value={modalDraft.stateCode || ''} disabled={saving} onChange={(event) => setModalValue('stateCode', event.target.value)} />
              </label>
            </>
          ) : null}
          {modalType === 'rates' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['cgstRate', 'CGST Rate'],
                ['sgstRate', 'SGST Rate'],
                ['igstRate', 'IGST Rate'],
                ['cessRate', 'CESS Rate']
              ].map(([key, label]) => (
                <label key={key}>
                  <span className="label">{label}</span>
                  <input className="input" type="number" min="0" max="100" step="0.01" value={modalDraft[key] ?? ''} disabled={saving} onChange={(event) => setModalValue(key, event.target.value)} />
                </label>
              ))}
            </div>
          ) : null}
          {modalType === 'settings' ? (
            <>
              <TaxToggle label="GST Enabled" helper="Apply GST settings to new taxable documents." checked={Boolean(modalDraft.gstEnabled)} disabled={saving} onChange={(value) => setModalValue('gstEnabled', value)} />
              <TaxToggle label="Round Off Tax" helper="Round tax values in generated invoices and PDFs." checked={Boolean(modalDraft.roundOffTax)} disabled={saving} onChange={(value) => setModalValue('roundOffTax', value)} />
              <TaxToggle label="Show Tax Summary in Invoice" helper="Display CGST, SGST, IGST, and totals in new invoice PDFs." checked={Boolean(modalDraft.showTaxSummaryInInvoice)} disabled={saving} onChange={(value) => setModalValue('showTaxSummaryInInvoice', value)} />
            </>
          ) : null}
          {modalType === 'code' ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="label">Code</span>
                  <input className="input" value={modalDraft.code || ''} disabled={saving} onChange={(event) => setModalValue('code', event.target.value)} />
                </label>
                <label>
                  <span className="label">Type</span>
                  <select className="input" value={modalDraft.type || 'Goods (HSN)'} disabled={saving} onChange={(event) => setModalValue('type', event.target.value)}>
                    <option>Goods (HSN)</option>
                    <option>Service (SAC)</option>
                  </select>
                </label>
              </div>
              <label>
                <span className="label">Description</span>
                <input className="input" value={modalDraft.description || ''} disabled={saving} onChange={(event) => setModalValue('description', event.target.value)} />
              </label>
              <label>
                <span className="label">GST Rate</span>
                <input className="input" type="number" min="0" max="100" step="0.01" value={modalDraft.gstRate ?? ''} disabled={saving} onChange={(event) => setModalValue('gstRate', event.target.value)} />
              </label>
            </>
          ) : null}
        </TaxDashboardModal>
      ) : null}
    </div>
  );
}

const paymentMethodList = [
  { key: 'cash', label: 'Cash', storageLabel: 'Cash', icon: Banknote },
  { key: 'upiQr', label: 'UPI / QR Code', storageLabel: 'UPI', icon: QrCode },
  { key: 'bankTransfer', label: 'Bank Transfer', storageLabel: 'Bank Transfer', icon: Landmark },
  { key: 'cheque', label: 'Cheque', storageLabel: 'Cheque', icon: ReceiptText },
  { key: 'cardPayment', label: 'Card Payment', storageLabel: 'Card', icon: CreditCard }
];

const paymentDashboardDefaults = {
  methods: {
    cash: true,
    upiQr: true,
    bankTransfer: true,
    cheque: false,
    cardPayment: false
  },
  terms: {
    defaultTerms: 'Net 15 Days',
    advancePayment: '0',
    creditPeriod: '15',
    latePaymentCharge: '2',
    gracePeriod: '5'
  },
  reminders: {
    enableReminders: true,
    reminderBeforeDue: '3',
    sendOverdueReminders: true,
    overdueInterval: '7 Days',
    maxAttempts: '3 Times'
  },
  upi: {
    upiId: 'universal@okbizaxis',
    showQrInInvoice: true,
    showUpiIdInInvoice: true
  },
  bank: {
    bankName: 'HDFC Bank',
    accountNumber: '50200012345678',
    ifscCode: 'HDFC0001234',
    accountHolderName: 'Universal Systems'
  },
  display: {
    showPaymentStatus: true,
    showUpiQr: true,
    showBankDetails: true,
    allowPartialPayments: true,
    autoApplyAdvance: false
  }
};

function paymentTermsText(terms = paymentDashboardDefaults.terms) {
  return [
    `Default Payment Terms: ${terms.defaultTerms || 'Net 15 Days'}`,
    `Advance Payment: ${terms.advancePayment || 0}%`,
    `Credit Period: ${terms.creditPeriod || 0} days`,
    `Late Payment Charge: ${terms.latePaymentCharge || 0}%`,
    `Grace Period: ${terms.gracePeriod || 0} days`
  ].join('\n');
}

function paymentBankDetailsText(bank = paymentDashboardDefaults.bank) {
  return [
    `Bank Name: ${bank.bankName || ''}`,
    `Account Number: ${bank.accountNumber || ''}`,
    `IFSC Code: ${bank.ifscCode || ''}`,
    `Account Holder Name: ${bank.accountHolderName || ''}`
  ].join('\n');
}

function parsePaymentBankDetails(value = '') {
  const text = String(value || '');
  function pick(label, fallback) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(new RegExp(`${escaped}\\s*:\\s*([^\\n]+)`, 'i'));
    return match?.[1]?.trim() || fallback;
  }
  return {
    bankName: pick('Bank Name', paymentDashboardDefaults.bank.bankName),
    accountNumber: pick('Account Number', paymentDashboardDefaults.bank.accountNumber),
    ifscCode: pick('IFSC Code', paymentDashboardDefaults.bank.ifscCode),
    accountHolderName: pick('Account Holder Name', paymentDashboardDefaults.bank.accountHolderName)
  };
}

function buildPaymentDashboardState(saved = {}) {
  const accepted = new Set(saved.acceptedMethods || []);
  const includesAny = (...labels) => labels.some((label) => accepted.has(label));
  return {
    methods: {
      cash: accepted.size ? includesAny('Cash') : paymentDashboardDefaults.methods.cash,
      upiQr: accepted.size ? includesAny('UPI', 'UPI / QR Code') : paymentDashboardDefaults.methods.upiQr,
      bankTransfer: accepted.size ? includesAny('Bank Transfer') : paymentDashboardDefaults.methods.bankTransfer,
      cheque: accepted.size ? includesAny('Cheque') : paymentDashboardDefaults.methods.cheque,
      cardPayment: accepted.size ? includesAny('Card', 'Card Payment') : paymentDashboardDefaults.methods.cardPayment
    },
    terms: { ...paymentDashboardDefaults.terms },
    reminders: { ...paymentDashboardDefaults.reminders },
    upi: {
      ...paymentDashboardDefaults.upi,
      upiId: saved.upiId || paymentDashboardDefaults.upi.upiId
    },
    bank: parsePaymentBankDetails(saved.bankDetails),
    display: { ...paymentDashboardDefaults.display }
  };
}

function paymentAcceptedMethods(state = paymentDashboardDefaults) {
  return paymentMethodList
    .filter((method) => Boolean(state.methods?.[method.key]))
    .map((method) => method.storageLabel);
}

function PaymentMethodRow({ method, checked, disabled = false, onChange }) {
  const Icon = method.icon;
  return (
    <label className={`flex items-center justify-between gap-3 rounded-card border border-white/10 bg-white/[0.035] px-3 py-3 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
      <span className="flex min-w-0 items-center gap-3">
        <span className="grid h-9 w-9 flex-none place-items-center rounded-full border border-sky-300/20 bg-sky-400/10 text-sky-100">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-black text-slate-100">{method.label}</span>
          <span className={`mt-1 block text-xs font-black uppercase ${checked ? 'text-emerald-200' : 'text-slate-500'}`}>{checked ? 'ON' : 'OFF'}</span>
        </span>
      </span>
      <span className="flex flex-none items-center gap-2">
        <input className="sr-only" type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange?.(event.target.checked)} />
        <span
          role="switch"
          aria-checked={checked}
          className={`relative h-7 w-14 rounded-full border transition duration-200 ${checked ? 'border-sky-300/45 bg-sky-400/25 shadow-[0_0_18px_rgba(56,189,248,0.18)]' : 'border-white/10 bg-slate-950/45'}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full transition duration-200 ${checked ? 'left-8 bg-sky-100' : 'left-1 bg-slate-400'}`} />
        </span>
      </span>
    </label>
  );
}

function PaymentField({ label, value, onChange, type = 'text', disabled = false, suffix = '', copyValue = '', onCopy = null }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <span className="flex min-w-0 gap-2">
        <input className="input min-w-0 flex-1" type={type} value={value} disabled={disabled} onChange={(event) => onChange?.(event.target.value)} />
        {suffix ? <span className="grid min-w-12 place-items-center rounded-card border border-white/10 bg-white/[0.035] px-3 text-sm font-black text-slate-300">{suffix}</span> : null}
        {onCopy ? (
          <button type="button" className="icon-button h-12 w-12 flex-none" onClick={() => onCopy(copyValue || value, label)} aria-label={`Copy ${label}`}>
            <Copy className="h-4 w-4" />
          </button>
        ) : null}
      </span>
    </label>
  );
}

function paymentQrPayload(upiId = '') {
  return `upi://pay?pa=${encodeURIComponent(String(upiId || '').trim())}&pn=${encodeURIComponent('Universal Systems')}`;
}

function paymentQrCells(upiId = '', nonce = 0) {
  const source = `${paymentQrPayload(upiId)}:${nonce}`;
  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = ((hash << 5) - hash + source.charCodeAt(index)) | 0;
  }
  const finderCells = new Set([0, 1, 2, 9, 11, 18, 19, 20, 6, 7, 8, 15, 17, 24, 25, 26, 54, 55, 56, 63, 65, 72, 73, 74]);
  return new Set(Array.from({ length: 81 }).map((_, index) => {
    if (finderCells.has(index)) return index;
    const bit = Math.abs(hash + index * 37 + source.charCodeAt(index % source.length || 0)) % 5;
    return bit <= 1 ? index : null;
  }).filter((index) => index !== null));
}

function paymentQrSvg(upiId = '', nonce = 0) {
  const activeCells = paymentQrCells(upiId, nonce);
  const cells = Array.from({ length: 81 }).map((_, index) => {
    const x = (index % 9) * 16;
    const y = Math.floor(index / 9) * 16;
    return `<rect x="${x}" y="${y}" width="13" height="13" rx="2" fill="${activeCells.has(index) ? '#020617' : '#e2e8f0'}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="176" height="176" viewBox="0 0 144 144"><rect width="144" height="144" rx="10" fill="#ffffff"/><title>${paymentQrPayload(upiId)}</title>${cells}</svg>`;
}

function PaymentQrPreview({ upiId, nonce = 0 }) {
  const activeCells = paymentQrCells(upiId, nonce);
  return (
    <div className="mx-auto grid aspect-square w-36 grid-cols-9 gap-1 rounded-card border border-sky-300/20 bg-white p-3 shadow-[0_0_30px_rgba(56,189,248,0.14)]" title={paymentQrPayload(upiId)}>
      {Array.from({ length: 81 }).map((_, index) => (
        <span key={index} className={`rounded-[2px] ${activeCells.has(index) ? 'bg-slate-950' : 'bg-slate-200'}`} />
      ))}
    </div>
  );
}

function PaymentDashboardModal({ title, icon: Icon, children, saving, submitLabel = 'Save Changes', onCancel, onSubmit }) {
  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4 backdrop-blur-sm">
      <form className="surface admin-modal w-full max-w-2xl p-5" onSubmit={onSubmit}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="admin-control-icon"><Icon className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Payment Settings</p>
              <h2 className="mt-1 text-xl font-black text-slate-50">{title}</h2>
            </div>
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onCancel} aria-label="Close payment settings modal">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 grid gap-4">{children}</div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" disabled={saving} onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

function PaymentSettingsSection({ onDirtyChange = null }) {
  const { request, token, user } = useAuth();
  const { push } = useToast();
  const { data, loading, error } = useResource(() => request('/settings/business'), [request]);
  const [paymentState, setPaymentState] = useState(() => buildPaymentDashboardState());
  const [initialized, setInitialized] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [modalDraft, setModalDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const [backupWorking, setBackupWorking] = useState(false);
  const [qrNonce, setQrNonce] = useState(0);
  const canEdit = (hasRole(user, 'admin') || hasRole(user, 'super_admin')) && can(user, 'manage_payment_settings');
  const canBackup = isBackupAdminUser(user) && can(user, 'manage_backup_storage');

  useEffect(() => {
    onDirtyChange?.(false);
  }, [onDirtyChange]);

  useEffect(() => {
    if (initialized || !data?.settings) return;
    setPaymentState(buildPaymentDashboardState(data.settings.payment || {}));
    setInitialized(true);
  }, [data?.settings, initialized]);

  function setNested(section, key, value) {
    setPaymentState((current) => ({ ...current, [section]: { ...current[section], [key]: value } }));
  }

  function setModalValue(key, value) {
    setModalDraft((current) => ({ ...current, [key]: value }));
  }

  function closeModal() {
    if (saving) return;
    setModalType(null);
    setModalDraft({});
  }

  function openModal(type) {
    setModalType(type);
    if (type === 'methods') setModalDraft({ ...paymentState.methods });
    if (type === 'upi') setModalDraft({ ...paymentState.upi });
    if (type === 'bank') setModalDraft({ ...paymentState.bank });
  }

  async function copyPaymentValue(value, label) {
    try {
      await navigator.clipboard.writeText(String(value || ''));
      const normalizedLabel = String(label || '').toLowerCase();
      if (normalizedLabel.includes('account number')) push('Account number copied');
      else if (normalizedLabel.includes('ifsc')) push('IFSC code copied');
      else push(`${label} copied`);
    } catch {
      push('Copy is not available in this browser session.', 'error');
    }
  }

  function regenerateQrCode() {
    setQrNonce((current) => current + 1);
    push('QR code updated successfully');
  }

  function downloadQrCode() {
    const svg = paymentQrSvg(paymentState.upi.upiId, qrNonce);
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `universal-systems-upi-qr-${Date.now()}.svg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    push('QR code downloaded');
  }

  function previewQrInInvoice() {
    push(`Invoice preview will show the QR generated from ${paymentState.upi.upiId}.`, 'info');
  }

  async function downloadPaymentBackup(id) {
    if (!id) return;
    const response = await fetch(`${apiBase}/settings/backups/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    if (!response.ok) throw new Error('Backup download failed');
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `universal-systems-backup-${Date.now()}.zip`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function createPaymentBackup(downloadAfter = false) {
    if (!canBackup) {
      push('Backup actions are available only to Admin or Super Admin users with backup permission.', 'error');
      return;
    }
    setBackupWorking(true);
    try {
      const result = await request('/settings/backups', { method: 'POST' });
      push(result.message || 'Backup created');
      if (downloadAfter && result.backup?.id) await downloadPaymentBackup(result.backup.id);
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setBackupWorking(false);
    }
  }

  async function savePaymentCore(nextState = paymentState, message = 'Payment settings saved successfully') {
    if (!canEdit) {
      push('Only Admin or Super Admin users with payment settings permission can update this page.', 'error');
      return false;
    }
    setSaving(true);
    try {
      await request('/settings/business/payment', {
        method: 'PATCH',
        body: JSON.stringify({
          acceptedMethods: paymentAcceptedMethods(nextState),
          upiId: nextState.upi.upiId,
          bankDetails: paymentBankDetailsText(nextState.bank),
          defaultPaymentStatus: 'Pending',
          paymentTermsText: paymentTermsText(nextState.terms)
        })
      });
      push(message);
      return true;
    } catch (err) {
      push(err.message, 'error');
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveTerms() {
    await savePaymentCore(paymentState, 'Payment settings saved successfully');
  }

  async function saveReminders() {
    await savePaymentCore(paymentState, 'Payment settings saved successfully');
  }

  async function savePreferences() {
    await savePaymentCore(paymentState, 'Payment settings saved successfully');
  }

  async function submitModal(event) {
    event.preventDefault();
    if (!canEdit) {
      push('Only Admin or Super Admin users with payment settings permission can update this page.', 'error');
      return;
    }
    if (modalType === 'methods') {
      const nextState = { ...paymentState, methods: { ...paymentState.methods, ...modalDraft } };
      setPaymentState(nextState);
      if (await savePaymentCore(nextState, 'Payment settings saved successfully')) closeModal();
      return;
    }
    if (modalType === 'upi') {
      const nextState = { ...paymentState, upi: { ...paymentState.upi, ...modalDraft } };
      setPaymentState(nextState);
      setQrNonce((current) => current + 1);
      if (await savePaymentCore(nextState, 'QR code updated successfully')) closeModal();
      return;
    }
    if (modalType === 'bank') {
      const nextState = { ...paymentState, bank: { ...paymentState.bank, ...modalDraft } };
      setPaymentState(nextState);
      if (await savePaymentCore(nextState, 'Bank details updated successfully')) closeModal();
    }
  }

  if (loading && !initialized) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  const modalTitle = modalType === 'methods'
    ? 'Manage Payment Methods'
    : modalType === 'upi'
      ? 'Update UPI / QR Code'
      : 'Edit Bank Details';
  const ModalIcon = modalType === 'methods' ? WalletCards : modalType === 'upi' ? QrCode : Landmark;
  const topMethods = paymentMethodList;

  return (
    <div className="grid gap-5 pb-32" data-payment-settings-root>
      <section className="surface admin-control-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <div className="admin-control-icon"><WalletCards className="h-5 w-5" /></div>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                <span>Settings</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span>System</span>
                <ChevronRight className="h-3.5 w-3.5" />
                <span className="text-[var(--brand)]">Payment Settings</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Payment Settings</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 muted">Configure payment methods, terms, reminders, and invoice payment settings.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary admin-compact-button" disabled={backupWorking} onClick={() => createPaymentBackup(false)}>
              {backupWorking ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseBackup className="h-4 w-4" />}
              Backup Now
            </button>
            <button type="button" className="btn btn-secondary admin-compact-button" disabled={backupWorking} onClick={() => createPaymentBackup(true)}>
              <Download className="h-4 w-4" />
              Export Data
            </button>
            <button type="button" className="btn btn-secondary admin-compact-button" onClick={() => push('Payment settings apply to new invoices, AMC invoices, payment records, and invoice PDF payment sections.', 'info')}>
              <Info className="h-4 w-4" />
              Help
            </button>
          </div>
        </div>
        {!canEdit ? (
          <p className="mt-4 rounded-card border border-amber-300/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-100">
            Only Admin or Super Admin users with payment settings permission can update this page.
          </p>
        ) : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="surface admin-control-card p-5">
          <div className="flex items-start gap-3">
            <div className="admin-control-icon"><WalletCards className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-black">Payment Methods</h2>
              <p className="mt-1 text-sm muted">Enable or disable payment methods.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            {topMethods.map((method) => (
              <PaymentMethodRow
                key={method.key}
                method={method}
                checked={Boolean(paymentState.methods[method.key])}
                disabled={!canEdit || saving}
                onChange={(value) => setNested('methods', method.key, value)}
              />
            ))}
          </div>
          <button type="button" className="btn btn-secondary admin-table-button mt-4" disabled={!canEdit} onClick={() => openModal('methods')}>
            <Settings2 className="h-4 w-4" />
            Manage Methods
          </button>
        </div>

        <div className="surface admin-control-card p-5">
          <div className="flex items-start gap-3">
            <div className="admin-control-icon"><ReceiptText className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-black">Payment Terms</h2>
              <p className="mt-1 text-sm muted">Configure default payment terms for invoices.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            <label>
              <span className="label">Default Payment Terms</span>
              <select className="input" value={paymentState.terms.defaultTerms} disabled={!canEdit || saving} onChange={(event) => setNested('terms', 'defaultTerms', event.target.value)}>
                <option>Due on Receipt</option>
                <option>Net 7 Days</option>
                <option>Net 15 Days</option>
                <option>Net 30 Days</option>
              </select>
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <PaymentField label="Advance Payment" suffix="%" type="number" value={paymentState.terms.advancePayment} disabled={!canEdit || saving} onChange={(value) => setNested('terms', 'advancePayment', value)} />
              <PaymentField label="Credit Period" suffix="Days" type="number" value={paymentState.terms.creditPeriod} disabled={!canEdit || saving} onChange={(value) => setNested('terms', 'creditPeriod', value)} />
              <PaymentField label="Late Payment Charge" suffix="%" type="number" value={paymentState.terms.latePaymentCharge} disabled={!canEdit || saving} onChange={(value) => setNested('terms', 'latePaymentCharge', value)} />
              <PaymentField label="Grace Period" suffix="Days" type="number" value={paymentState.terms.gracePeriod} disabled={!canEdit || saving} onChange={(value) => setNested('terms', 'gracePeriod', value)} />
            </div>
          </div>
          <button type="button" className="btn btn-secondary admin-table-button mt-4" disabled={!canEdit || saving} onClick={saveTerms}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Terms
          </button>
        </div>

        <div className="surface admin-control-card p-5">
          <div className="flex items-start gap-3">
            <div className="admin-control-icon"><Bell className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-black">Payment Reminders</h2>
              <p className="mt-1 text-sm muted">Send payment reminders automatically.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            <TaxToggle label="Enable Reminders" checked={Boolean(paymentState.reminders.enableReminders)} disabled={!canEdit || saving} onChange={(value) => setNested('reminders', 'enableReminders', value)} />
            <PaymentField label="Reminder Before Due" suffix="Days" type="number" value={paymentState.reminders.reminderBeforeDue} disabled={!canEdit || saving} onChange={(value) => setNested('reminders', 'reminderBeforeDue', value)} />
            <TaxToggle label="Send Overdue Reminders" checked={Boolean(paymentState.reminders.sendOverdueReminders)} disabled={!canEdit || saving} onChange={(value) => setNested('reminders', 'sendOverdueReminders', value)} />
            <div className="grid gap-3 sm:grid-cols-2">
              <label>
                <span className="label">Overdue Reminder Interval</span>
                <select className="input" value={paymentState.reminders.overdueInterval} disabled={!canEdit || saving} onChange={(event) => setNested('reminders', 'overdueInterval', event.target.value)}>
                  <option>3 Days</option>
                  <option>7 Days</option>
                  <option>15 Days</option>
                </select>
              </label>
              <label>
                <span className="label">Max Reminder Attempts</span>
                <select className="input" value={paymentState.reminders.maxAttempts} disabled={!canEdit || saving} onChange={(event) => setNested('reminders', 'maxAttempts', event.target.value)}>
                  <option>1 Time</option>
                  <option>2 Times</option>
                  <option>3 Times</option>
                  <option>5 Times</option>
                </select>
              </label>
            </div>
          </div>
          <button type="button" className="btn btn-secondary admin-table-button mt-4" disabled={!canEdit || saving} onClick={saveReminders}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Reminder Settings
          </button>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="surface admin-control-card p-5">
          <div className="flex items-start gap-3">
            <div className="admin-control-icon"><QrCode className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-black">UPI / QR Code Settings</h2>
              <p className="mt-1 text-sm muted">Configure UPI ID and QR code for receiving payments.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4">
            <div className="min-w-0">
              <PaymentField label="UPI ID" value={paymentState.upi.upiId} disabled={!canEdit || saving} onChange={(value) => setNested('upi', 'upiId', value)} onCopy={copyPaymentValue} />
              <div className="mt-4 rounded-card border border-sky-300/15 bg-sky-400/10 p-4 text-center">
                <PaymentQrPreview upiId={paymentState.upi.upiId} nonce={qrNonce} />
                <span className="admin-premium-badge mt-3">Active</span>
                <p className="mt-3 text-sm font-semibold text-slate-200">Scan this QR code to make payment.</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <button type="button" className="btn btn-secondary admin-table-button" disabled={!canEdit || saving} onClick={regenerateQrCode}>
                    <RotateCcw className="h-4 w-4" />
                    Regenerate QR
                  </button>
                  <button type="button" className="btn btn-secondary admin-table-button" onClick={downloadQrCode}>
                    <Download className="h-4 w-4" />
                    Download QR
                  </button>
                  <button type="button" className="btn btn-secondary admin-table-button" onClick={previewQrInInvoice}>
                    <Eye className="h-4 w-4" />
                    Preview in Invoice
                  </button>
                </div>
              </div>
            </div>
            <div className="rounded-card border border-white/10 bg-white/[0.035] p-3">
              <h3 className="font-black text-slate-100">Show in Invoice</h3>
              <div className="mt-3 grid gap-3">
                <TaxToggle label="Show UPI QR in invoice" checked={Boolean(paymentState.upi.showQrInInvoice)} disabled={!canEdit || saving} onChange={(value) => setNested('upi', 'showQrInInvoice', value)} />
                <TaxToggle label="Show UPI ID in invoice" checked={Boolean(paymentState.upi.showUpiIdInInvoice)} disabled={!canEdit || saving} onChange={(value) => setNested('upi', 'showUpiIdInInvoice', value)} />
              </div>
            </div>
          </div>
          <button type="button" className="btn btn-secondary admin-table-button mt-4" disabled={!canEdit} onClick={() => openModal('upi')}>
            <UploadCloud className="h-4 w-4" />
            Update QR Code
          </button>
        </div>

        <div className="surface admin-control-card p-5">
          <div className="flex items-start gap-3">
            <div className="admin-control-icon"><Landmark className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-black">Bank Details (For Invoice)</h2>
              <p className="mt-1 text-sm muted">Bank details will be shown in invoices.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            <TaxInfoLine label="Bank Name" value={paymentState.bank.bankName} />
            <PaymentField label="Account Number" value={paymentState.bank.accountNumber} disabled copyValue={paymentState.bank.accountNumber} onCopy={copyPaymentValue} />
            <PaymentField label="IFSC Code" value={paymentState.bank.ifscCode} disabled copyValue={paymentState.bank.ifscCode} onCopy={copyPaymentValue} />
            <TaxInfoLine label="Account Holder Name" value={paymentState.bank.accountHolderName} />
          </div>
          <button type="button" className="btn btn-secondary admin-table-button mt-4" disabled={!canEdit} onClick={() => openModal('bank')}>
            <Edit3 className="h-4 w-4" />
            Edit Bank Details
          </button>
        </div>

        <div className="surface admin-control-card p-5">
          <div className="flex items-start gap-3">
            <div className="admin-control-icon"><FileText className="h-5 w-5" /></div>
            <div>
              <h2 className="text-lg font-black">Invoice Payment Display</h2>
              <p className="mt-1 text-sm muted">Control payment information shown in invoices.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3">
            <TaxToggle label="Show Payment Status in Invoice" checked={Boolean(paymentState.display.showPaymentStatus)} disabled={!canEdit || saving} onChange={(value) => setNested('display', 'showPaymentStatus', value)} />
            <TaxToggle label="Show UPI QR in Invoice" checked={Boolean(paymentState.display.showUpiQr)} disabled={!canEdit || saving} onChange={(value) => setNested('display', 'showUpiQr', value)} />
            <TaxToggle label="Show Bank Details in Invoice" checked={Boolean(paymentState.display.showBankDetails)} disabled={!canEdit || saving} onChange={(value) => setNested('display', 'showBankDetails', value)} />
            <TaxToggle label="Allow Partial Payments" checked={Boolean(paymentState.display.allowPartialPayments)} disabled={!canEdit || saving} onChange={(value) => setNested('display', 'allowPartialPayments', value)} />
            <TaxToggle label="Auto-apply Advance to New Invoice" checked={Boolean(paymentState.display.autoApplyAdvance)} disabled={!canEdit || saving} onChange={(value) => setNested('display', 'autoApplyAdvance', value)} />
          </div>
          <button type="button" className="btn btn-secondary admin-table-button mt-4" disabled={!canEdit || saving} onClick={savePreferences}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Preferences
          </button>
        </div>
      </section>

      <section className="surface admin-control-card p-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="admin-control-icon"><Info className="h-5 w-5" /></div>
          <p className="text-sm font-semibold leading-6 text-slate-200">
            Payment settings will apply only to new invoices, quotations, AMC invoices, new payment records, and future PDF displays. Existing records will not change.
          </p>
        </div>
      </section>

      {modalType ? (
        <PaymentDashboardModal title={modalTitle} icon={ModalIcon} saving={saving} submitLabel={modalType === 'methods' ? 'Save Methods' : modalType === 'upi' ? 'Update QR Code' : 'Save Bank Details'} onCancel={closeModal} onSubmit={submitModal}>
          {modalType === 'methods' ? (
            <div className="grid gap-3">
              {paymentMethodList.map((method) => (
                <PaymentMethodRow
                  key={method.key}
                  method={method}
                  checked={Boolean(modalDraft[method.key])}
                  disabled={saving}
                  onChange={(value) => setModalValue(method.key, value)}
                />
              ))}
            </div>
          ) : null}
          {modalType === 'upi' ? (
            <>
              <PaymentField label="UPI ID" value={modalDraft.upiId || ''} disabled={saving} onChange={(value) => setModalValue('upiId', value)} />
              <label>
                <span className="label">QR code image upload</span>
                <input className="input" type="file" accept="image/*" disabled={saving} />
              </label>
              <TaxToggle label="Show QR in invoice" checked={Boolean(modalDraft.showQrInInvoice)} disabled={saving} onChange={(value) => setModalValue('showQrInInvoice', value)} />
              <TaxToggle label="Show UPI ID in invoice" checked={Boolean(modalDraft.showUpiIdInInvoice)} disabled={saving} onChange={(value) => setModalValue('showUpiIdInInvoice', value)} />
            </>
          ) : null}
          {modalType === 'bank' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <PaymentField label="Bank Name" value={modalDraft.bankName || ''} disabled={saving} onChange={(value) => setModalValue('bankName', value)} />
              <PaymentField label="Account Number" value={modalDraft.accountNumber || ''} disabled={saving} onChange={(value) => setModalValue('accountNumber', value)} />
              <PaymentField label="IFSC Code" value={modalDraft.ifscCode || ''} disabled={saving} onChange={(value) => setModalValue('ifscCode', value)} />
              <PaymentField label="Account Holder Name" value={modalDraft.accountHolderName || ''} disabled={saving} onChange={(value) => setModalValue('accountHolderName', value)} />
            </div>
          ) : null}
        </PaymentDashboardModal>
      ) : null}
    </div>
  );
}

function PdfTermsSettingsSection({ onDirtyChange = null, embedded = false }) {
  const fields = [
    ['invoiceTerms', 'Invoice terms'],
    ['quotationTerms', 'Quotation terms'],
    ['serviceReportNotes', 'Service report notes'],
    ['amcTerms', 'AMC terms'],
    ['warrantyNote', 'Warranty note'],
    ['footerNote', 'Footer note']
  ];
  return (
    <BusinessSettingsFrame
      section="pdfTerms"
      tabId="pdfTerms"
      title="PDF Terms & Conditions"
      icon={FileCog}
      description="Store reusable terms for future PDFs. Existing generated PDFs remain unchanged."
      onDirtyChange={onDirtyChange}
      showHeader={!embedded}
      saveLabel={embedded ? 'Save Terms' : 'Save Changes'}
      resetLabel={embedded ? 'Reset Default' : 'Cancel / Revert'}
      resetMode={embedded ? 'defaults' : 'saved'}
      showActionsWhenClean={embedded}
      previewLabel={embedded ? 'Preview in PDF' : ''}
      previewMessage="PDF preview will use the saved terms and footer notes in future generated documents."
    >
      {({ form, setPath, canEdit, saving }) => (
        <section className="surface admin-control-card p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            {fields.map(([key, label]) => (
              <label key={key}>
                <span className="label">{label}</span>
                <textarea className="input min-h-28" value={form[key] || ''} disabled={!canEdit || saving} onChange={(event) => setPath(key, event.target.value)} />
              </label>
            ))}
          </div>
        </section>
      )}
    </BusinessSettingsFrame>
  );
}

const documentsPdfTabs = [
  { id: 'templates', label: 'Templates', icon: FileText },
  { id: 'terms', label: 'Terms & Conditions', icon: FileCog },
  { id: 'numbering', label: 'Numbering', icon: Hash }
];

function DocumentsPdfsSection({ onDirtyChange = null }) {
  const [activeDocumentTab, setActiveDocumentTab] = useState('templates');
  const [dirtyMap, setDirtyMap] = useState({});
  const [designModeActive, setDesignModeActive] = useState(false);

  const setChildDirty = useCallback((key, dirty) => {
    setDirtyMap((current) => {
      if (Boolean(current[key]) === Boolean(dirty)) return current;
      return { ...current, [key]: Boolean(dirty) };
    });
  }, []);

  useEffect(() => {
    onDirtyChange?.(Object.values(dirtyMap).some(Boolean));
  }, [dirtyMap, onDirtyChange]);

  useEffect(() => {
    if (activeDocumentTab !== 'templates') setDesignModeActive(false);
  }, [activeDocumentTab]);

  return (
    <div className={`grid gap-5 pb-32 ${designModeActive ? 'documents-pdfs-design-active' : ''}`} data-documents-pdfs-root>
      {!designModeActive ? <section className="surface admin-control-card p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-xs font-black uppercase tracking-wide text-[var(--brand)]">Settings &gt; System &gt; Documents & PDFs</p>
              <span className="admin-premium-badge">DOCUMENT CONTROL</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Documents & PDFs</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">Manage PDF templates, terms, footer notes, and document numbering from one clean workspace.</p>
          </div>
          <div className="rounded-card border border-sky-300/20 bg-sky-500/10 px-4 py-3 text-sm text-sky-100">
            <div className="flex items-center gap-2 font-black">
              <FileText className="h-4 w-4" />
              Applies to future documents
            </div>
            <p className="mt-1 text-xs text-sky-100/80">Existing generated PDFs and document records are not changed automatically.</p>
          </div>
        </div>
      </section> : null}

      {!designModeActive ? <div className="surface settings-tabs-card p-2">
        <div className="tabs-list amc-tabs settings-tabs border-b-0">
          {documentsPdfTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                className={`tab-button ${activeDocumentTab === tab.id ? 'tab-button-active' : ''}`}
                onClick={() => setActiveDocumentTab(tab.id)}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div> : null}

      {activeDocumentTab === 'templates' ? (
        <PdfTemplatesSection onDirtyChange={(dirty) => setChildDirty('templates', dirty)} onDesignModeChange={setDesignModeActive} />
      ) : null}

      {activeDocumentTab === 'terms' ? (
        <PdfTermsSettingsSection embedded onDirtyChange={(dirty) => setChildDirty('terms', dirty)} />
      ) : null}

      {activeDocumentTab === 'numbering' ? (
        <DocumentNumberingSection embedded onDirtyChange={(dirty) => setChildDirty('numbering', dirty)} />
      ) : null}
    </div>
  );
}

function PreferencesSection({ themePreference, resolvedTheme, onThemeChange, onDirtyChange = null }) {
  return (
    <BusinessSettingsFrame section="preferences" tabId="preferences" title="Preferences" icon={Palette} description="Admin appearance remains scoped to this admin panel. Public website styling is managed separately." onDirtyChange={onDirtyChange}>
      {({ form, setPath, canEdit, saving }) => (
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="surface admin-control-card settings-preference-card p-5">
            <div className="flex items-start gap-3">
              <div className="admin-control-icon"><Palette className="h-5 w-5" /></div>
              <div className="min-w-0">
                <h2 className="text-lg font-black">Appearance / Theme</h2>
                <p className="mt-2 text-sm leading-6 muted">Local admin panel theme for this device only.</p>
              </div>
            </div>
            <div className="mt-5">
              <ThemePreferenceButtons value={themePreference} onChange={onThemeChange} />
              <p className="mt-3 text-xs font-semibold muted">Current theme: {resolvedTheme === 'light' ? 'Light' : 'Dark'}</p>
            </div>
          </div>
          {[
            { key: 'defaultNotifications', icon: Bell, title: 'Default Notification Settings', description: 'Keep operational reminders visible for jobs, payments, AMC visits, and approvals.' },
            { key: 'dashboardFocus', icon: BarChart, title: 'Dashboard Preferences', description: 'Prioritize operational KPIs and compact admin summaries on dashboard surfaces.' },
            { key: 'pdfDocuments', icon: FileText, title: 'Document Defaults', description: 'Use standard invoice, quotation, and service document defaults where supported.' }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.key} className="surface admin-control-card settings-preference-card p-5">
                <div className="flex items-start gap-3">
                  <div className="admin-control-icon"><Icon className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <h2 className="text-lg font-black">{item.title}</h2>
                    <p className="mt-2 text-sm leading-6 muted">{item.description}</p>
                  </div>
                </div>
                <label className="mt-5 flex items-center justify-between gap-3 rounded-card border border-white/10 bg-white/[0.035] px-3 py-3">
                  <span className="text-sm font-bold text-slate-100">Enabled</span>
                  <input type="checkbox" className="h-4 w-4 accent-[var(--brand)]" checked={Boolean(form[item.key])} disabled={!canEdit || saving} onChange={(event) => setPath(item.key, event.target.checked)} />
                </label>
              </div>
            );
          })}
        </div>
      )}
    </BusinessSettingsFrame>
  );
}

function SystemInformationSection() {
  const { request, user } = useAuth();
  const canView = hasRole(user, 'admin') && can(user, 'view_system_information');
  const { data, loading, error } = useResource(() => request('/settings/system-info'), [request]);
  if (!canView) return <ErrorBlock message="Only admin users can view system information." />;
  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;
  const info = data?.info || {};
  const rows = [
    ['App version', info.appVersion || '-'],
    ['Database status', info.databaseStatus || '-'],
    ['Environment', info.environment || '-'],
    ['API status', info.apiStatus || '-'],
    ['Storage used', formatBytes(info.storage?.storageUsed || 0)],
    ['Last backup', info.lastBackup?.createdAt ? formatDate(info.lastBackup.createdAt) : 'No backup yet'],
    ['Node.js', info.build?.node || '-']
  ];
  return (
    <div className="grid gap-5">
      <section className="surface admin-control-card p-5">
        <div className="flex items-start gap-3">
          <div className="admin-control-icon"><Info className="h-5 w-5" /></div>
          <div>
            <h2 className="text-2xl font-black">System Information</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">View-only operational status for the ERP environment.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(([label, value]) => <SettingsInfoItem key={label} icon={Info} label={label} value={value} />)}
        </div>
      </section>
      <section className="surface admin-control-card p-5">
        <h3 className="text-xl font-black">Storage Paths</h3>
        <div className="mt-4 grid gap-3">
          {Object.entries(info.paths || {}).map(([key, value]) => (
            <div key={key} className="rounded-card border border-white/10 bg-white/[0.035] p-3">
              <p className="font-black capitalize text-slate-100">{key}</p>
              <p className="mt-1 break-all text-sm muted">{value.path}</p>
              <p className="mt-1 text-xs font-bold text-slate-300">{value.exists ? 'Available' : 'Missing'}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function SettingsOverviewSection({ onManage }) {
  const [search, setSearch] = useState('');
  const normalizedSearch = search.trim().toLowerCase();
  const filteredGroups = useMemo(() => settingsOverviewGroups
    .map((group) => ({
      ...group,
      cards: normalizedSearch
        ? group.cards.filter((card) => settingsCardSearchText(card).includes(normalizedSearch))
        : group.cards
    }))
    .filter((group) => group.cards.length), [normalizedSearch]);
  const visibleCount = filteredGroups.reduce((sum, group) => sum + group.cards.length, 0);
  const totalCount = settingsOverviewGroups.reduce((sum, group) => sum + group.cards.length, 0);

  return (
    <div className="settings-overview-shell grid gap-6">
      <div className="surface admin-filter-bar settings-overview-toolbar p-4">
        <SearchBox value={search} onChange={setSearch} placeholder="Search settings" />
        <span className="settings-overview-count">{visibleCount} of {totalCount} settings</span>
      </div>

      {filteredGroups.length ? filteredGroups.map((group) => (
        <section key={group.id} className="settings-category-section">
          <div className="settings-category-header">
            <div>
              <h2 className="text-xl font-black">{group.title}</h2>
              <p className="mt-1 max-w-3xl text-sm leading-6 muted">{group.description}</p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {group.cards.map((module) => {
              const Icon = module.icon;
              return (
                <button key={module.id} type="button" className="surface admin-control-card settings-overview-card w-full p-5 text-left" onClick={() => onManage(module)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="admin-control-icon"><Icon className="h-5 w-5" /></div>
                    <span className={`settings-status-badge ${settingsStatusToneClass[module.status] || ''}`}>{module.status}</span>
                  </div>
                  <div className="mt-4 min-w-0">
                    <h3 className="text-lg font-black">{module.title}</h3>
                    <p className="mt-2 text-sm leading-6 muted">{module.description}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {module.tags.slice(0, 3).map((item) => <span key={item} className="settings-card-tag">{item}</span>)}
                  </div>
                  <span className="settings-card-action mt-auto pt-5">
                    {module.actionLabel || 'Manage'}
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )) : (
        <EmptyState
          icon={Filter}
          title="No settings found"
          message="No settings cards match the current search."
          action={<button type="button" className="btn btn-secondary" onClick={() => setSearch('')}>Clear Search</button>}
        />
      )}
    </div>
  );
}

function SettingsComingSoonState({ module, onBack }) {
  const Icon = module?.icon || Info;
  const tags = module?.tags || [];
  return (
    <section className="surface admin-control-card settings-coming-soon-state p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="admin-control-icon settings-coming-soon-icon"><Icon className="h-5 w-5" /></div>
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="settings-status-badge settings-status-coming-soon">Coming Soon</span>
              <span className="admin-premium-badge">PLANNED SETTINGS AREA</span>
            </div>
            <h2 className="text-2xl font-black">{module?.title || 'Settings Area'}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 muted">
              {module?.description || 'This settings area is planned for a future release.'} This placeholder keeps admins inside a clean settings experience until the full controls are ready.
            </p>
            {tags.length ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {tags.slice(0, 5).map((item) => <span key={item} className="settings-card-tag">{item}</span>)}
              </div>
            ) : null}
          </div>
        </div>
        <button type="button" className="btn btn-primary admin-compact-button" onClick={onBack}>
          Back to Overview
          <ChevronRight className="h-4 w-4 rotate-180" />
        </button>
      </div>
    </section>
  );
}

function SecuritySettingsSection() {
  const cards = [
    { icon: KeyRound, title: 'Password Policy', status: 'Active basics', description: 'Passwords are hashed. Minimum password length is enforced for saved passwords.', future: 'Strong-password rule and expiry controls are future backend features.' },
    { icon: LockKeyhole, title: 'Login Security', status: 'Partially active', description: 'Login rate limiting is active for failed login attempts.', future: 'Failed-login lockout controls and two-factor authentication are marked for future provider support.' },
    { icon: CalendarClock, title: 'Session Handling', status: 'Token based', description: 'Authenticated sessions use protected API tokens.', future: 'Session timeout configuration and logout-all-sessions require backend session tracking.' },
    { icon: ReceiptText, title: 'Audit Trail', status: 'Active', description: 'Important settings, permission, profile, backup, and document actions are logged.', future: 'Audit retention policies can be added later.' }
  ];
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <SettingsInfoCard key={card.title} title={card.title} icon={Icon} action={<span className="admin-premium-badge">{card.status}</span>}>
            <p className="mt-3 text-sm leading-6 muted">{card.description}</p>
            <p className="mt-3 rounded-card border border-amber-300/25 bg-amber-500/10 p-3 text-sm font-semibold text-amber-100">{card.future}</p>
          </SettingsInfoCard>
        );
      })}
    </div>
  );
}

function AccountStatusPill({ active }) {
  return <span className={`admin-status-pill ${active ? 'admin-status-active' : 'admin-status-inactive'}`}>{active ? 'Active' : 'Inactive'}</span>;
}

export function SystemSettingsPage({ initialTab = 'overview', standaloneTab = false } = {}) {
  const { push } = useToast();
  const navigate = useNavigate();
  const { themePreference, resolvedTheme, setThemePreference } = useThemePreference();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [comingSoonModule, setComingSoonModule] = useState(null);
  const [dirtyTabs, setDirtyTabs] = useState({});
  const [preferences, setPreferences] = useState({
    defaultNotifications: true,
    dashboardFocus: true,
    pdfDocuments: true
  });
  const [savedPreferences, setSavedPreferences] = useState(preferences);
  const lastUpdatedTime = useMemo(
    () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    []
  );
  const hasUnsavedChanges = useMemo(() => Object.values(dirtyTabs).some(Boolean), [dirtyTabs]);

  const setTabDirty = useCallback((tab, dirty) => {
    setDirtyTabs((current) => {
      if (Boolean(current[tab]) === Boolean(dirty)) return current;
      return { ...current, [tab]: Boolean(dirty) };
    });
  }, []);

  useEffect(() => {
    if (!hasUnsavedChanges) return undefined;
    const onBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges]);

  function canLeaveActiveTab() {
    return !(dirtyTabs[activeTab] && !window.confirm('You have unsaved changes. Continue without saving?'));
  }

  function clearActiveDirtyFlag() {
    if (!dirtyTabs[activeTab]) return;
    setDirtyTabs((current) => ({ ...current, [activeTab]: false }));
  }

  function scrollSettingsContentToTop() {
    requestAnimationFrame(() => {
      const main = document.querySelector('.enterprise-main');
      const focusedRoot = document.querySelector('[data-documents-pdfs-root], [data-backup-storage-root], [data-tax-gst-root], [data-payment-settings-root]');
      if (focusedRoot && typeof focusedRoot.scrollIntoView === 'function') {
        focusedRoot.scrollIntoView({ block: 'start', behavior: 'auto' });
        return;
      }
      if (main && typeof main.scrollTo === 'function') main.scrollTo({ top: 0, behavior: 'auto' });
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }

  function changeTab(tabId) {
    if (tabId === activeTab && !comingSoonModule) return;
    if (!canLeaveActiveTab()) return;
    if ((tabId === 'documentsPdfs' || tabId === 'taxGst' || tabId === 'paymentSettings') && !standaloneTab) {
      clearActiveDirtyFlag();
      navigate(tabId === 'documentsPdfs' ? '/admin/settings/documents-pdfs' : tabId === 'taxGst' ? '/admin/settings/tax-gst' : '/admin/settings/payment-settings');
      return;
    }
    clearActiveDirtyFlag();
    setComingSoonModule(null);
    setActiveTab(tabId);
  }

  function openComingSoon(module) {
    if (activeTab === `comingSoon:${module.id}`) return;
    if (!canLeaveActiveTab()) return;
    clearActiveDirtyFlag();
    setComingSoonModule(module);
    setActiveTab(`comingSoon:${module.id}`);
  }

  function handleOverviewManage(module) {
    if (module.route) {
      if (!canLeaveActiveTab()) return;
      navigate(module.route);
      return;
    }
    if (module.tabId) {
      changeTab(module.tabId);
      return;
    }
    openComingSoon(module);
  }

  function exportSettings() {
    downloadCsv('settings-export.csv', ['Setting', 'Value'], [
      ['Company', company.name],
      ['Location', company.address],
      ['Phone', company.phones.join(' / ')],
      ['Email', company.email],
      ['Theme', themePreferenceOptions.find((option) => option.value === themePreference)?.label || 'System Default'],
      ['Default Notifications', preferences.defaultNotifications ? 'Enabled' : 'Disabled'],
      ['Dashboard Preferences', preferences.dashboardFocus ? 'Enabled' : 'Disabled'],
      ['Document Defaults', preferences.pdfDocuments ? 'Enabled' : 'Disabled']
    ]);
  }

  function updatePreference(key) {
    setPreferences((current) => ({ ...current, [key]: !current[key] }));
  }

  useEffect(() => {
    setTabDirty('preferences', stableJson(preferences) !== stableJson(savedPreferences));
  }, [preferences, savedPreferences, setTabDirty]);

  useEffect(() => {
    setActiveTab(initialTab);
    setComingSoonModule(null);
  }, [initialTab]);

  useEffect(() => {
    if (activeTab === 'documentsPdfs' || activeTab === 'backupStorage' || activeTab === 'taxGst' || activeTab === 'paymentSettings') scrollSettingsContentToTop();
  }, [activeTab]);

  function savePreferences() {
    setSavedPreferences(preferences);
    setTabDirty('preferences', false);
    push('Preferences saved locally');
  }

  function updateThemePreference(nextPreference) {
    setThemePreference(nextPreference);
    push('Theme preference saved locally');
  }

  if (standaloneTab && activeTab === 'documentsPdfs') {
    return (
      <div className="admin-control-page settings-page">
        <DocumentsPdfsSection onDirtyChange={(dirty) => setTabDirty('documentsPdfs', dirty)} />
      </div>
    );
  }

  if (standaloneTab && activeTab === 'taxGst') {
    return (
      <div className="admin-control-page settings-page">
        <TaxGstSettingsSection onDirtyChange={(dirty) => setTabDirty('taxGst', dirty)} />
      </div>
    );
  }

  if (standaloneTab && activeTab === 'paymentSettings') {
    return (
      <div className="admin-control-page settings-page">
        <PaymentSettingsSection onDirtyChange={(dirty) => setTabDirty('paymentSettings', dirty)} />
      </div>
    );
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
              onClick={() => changeTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        {activeTab === 'overview' ? (
          <SettingsOverviewSection onManage={handleOverviewManage} />
        ) : null}

        {activeTab.startsWith('comingSoon:') ? (
          <SettingsComingSoonState module={comingSoonModule} onBack={() => changeTab('overview')} />
        ) : null}

        {activeTab === 'companyProfile' ? (
          <CompanyProfileSection onDirtyChange={(dirty) => setTabDirty('companyProfile', dirty)} />
        ) : null}

        {activeTab === 'adminProfile' ? (
          <AdminProfileSection onDirtyChange={(dirty) => setTabDirty('adminProfile', dirty)} />
        ) : null}

        {activeTab === 'security' ? (
          <SecuritySettingsSection />
        ) : null}

        {activeTab === 'usersRoles' ? (
          <UsersRolesSection onDirtyChange={(dirty) => setTabDirty('usersRoles', dirty)} />
        ) : null}

        {activeTab === 'preferences' ? (
          <PreferencesSection themePreference={themePreference} resolvedTheme={resolvedTheme} onThemeChange={updateThemePreference} onDirtyChange={(dirty) => setTabDirty('preferences', dirty)} />
        ) : null}

        {activeTab === 'documentsPdfs' ? (
          <DocumentsPdfsSection onDirtyChange={(dirty) => setTabDirty('documentsPdfs', dirty)} />
        ) : null}

        {activeTab === 'publicWebsite' ? (
          <PublicWebsiteSettingsSection onDirtyChange={(dirty) => setTabDirty('publicWebsite', dirty)} />
        ) : null}

        {activeTab === 'backupStorage' ? (
          <BackupStorageSection onDirtyChange={(dirty) => setTabDirty('backupStorage', dirty)} onOpenTab={changeTab} />
        ) : null}

        {activeTab === 'taxGst' ? (
          <TaxGstSettingsSection onDirtyChange={(dirty) => setTabDirty('taxGst', dirty)} />
        ) : null}

        {activeTab === 'paymentSettings' ? (
          <PaymentSettingsSection onDirtyChange={(dirty) => setTabDirty('paymentSettings', dirty)} />
        ) : null}

        {activeTab === 'notificationTemplates' ? (
          <NotificationTemplatesSection onDirtyChange={(dirty) => setTabDirty('notificationTemplates', dirty)} />
        ) : null}

        {activeTab === 'statusWorkflow' ? (
          <StatusWorkflowSettingsSection onDirtyChange={(dirty) => setTabDirty('statusWorkflow', dirty)} />
        ) : null}

        {activeTab === 'systemInformation' ? (
          <SystemInformationSection />
        ) : null}
      </div>
    </div>
  );
}
