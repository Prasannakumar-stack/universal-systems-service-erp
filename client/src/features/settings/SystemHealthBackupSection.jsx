import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  ConfirmModal,
  Download,
  FileText,
  Loader2,
  ShieldCheck,
  Trash2,
  X,
  apiBase,
  formatDate,
  useAuth,
  useEffect,
  useMemo,
  useRef,
  useResource,
  useState,
  useToast
} from '../../shared/phase1Shared.jsx';
import {
  Activity,
  ArchiveRestore,
  Copy,
  DatabaseBackup,
  HardDrive,
  Info,
  Mail,
  MessageSquareText,
  RefreshCw,
  Server,
  Settings2,
  Smartphone,
  UploadCloud
} from 'lucide-react';
import { can, hasRole } from '../../utils/roles.js';

const NO_DATA = '—';
const MISSING_ACTION_MESSAGE = 'This action will be available after backend integration.';

function stableJson(value) {
  return JSON.stringify(value || {});
}

function formatBytes(value) {
  if (value === null || value === undefined || value === '') return NO_DATA;
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return NO_DATA;
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

function titleCase(value = '') {
  const label = String(value || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!label) return 'Not available';
  return label.replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeBackupSettings(settings = {}) {
  return {
    automaticBackupEnabled: Boolean(settings.automaticBackupEnabled),
    backupFrequency: settings.backupFrequency || 'Weekly'
  };
}

function backupCreatedAt(record = {}) {
  if (!record.createdAt) return NO_DATA;
  return formatDate(record.createdAt);
}

function backupDisplayTitle(record = {}) {
  const kind = String(record.kind || '').replace(/[_-]+/g, ' ').trim().toLowerCase();
  if (kind === 'manual') return 'Manual Backup';
  if (kind === 'auto' || kind === 'automatic') return 'Automatic Backup';
  if (kind === 'pre restore') return 'Pre Restore Backup';
  if (kind === 'restore upload') return 'Restore Backup';
  if (!kind) return 'Backup File';
  return `${titleCase(kind)} Backup`;
}

function backupTypeLabel(record = {}) {
  const kind = String(record.kind || '').replace(/[_-]+/g, ' ').trim().toLowerCase();
  if (kind === 'manual') return 'Manual';
  if (kind === 'auto' || kind === 'automatic') return 'Auto';
  if (kind === 'pre restore') return 'Pre Restore';
  if (kind === 'restore upload') return 'Restore Upload';
  return titleCase(kind || 'Manual');
}

function backupNextRunLabel(settings = {}) {
  if (!settings.automaticBackupEnabled) return 'Not configured';
  if (!settings.lastBackupAt) return 'Due after first automatic backup';
  const next = new Date(settings.lastBackupAt);
  if (Number.isNaN(next.getTime())) return 'Not available';
  if (settings.backupFrequency === 'Daily') next.setDate(next.getDate() + 1);
  else if (settings.backupFrequency === 'Monthly') next.setMonth(next.getMonth() + 1);
  else next.setDate(next.getDate() + 7);
  return formatDate(next);
}

function backupCreatedBy(record = {}) {
  return record.createdBy?.name || record.createdBy?.username || 'System';
}

function backupCreatedAtTime(record = {}) {
  if (!record.createdAt) return NO_DATA;
  const date = new Date(record.createdAt);
  if (Number.isNaN(date.getTime())) return NO_DATA;
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatUptime(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) return 'Not available';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes || 1}m`;
}

function statusClass(level) {
  return `system-health-status system-health-status-${level || 'warning'}`;
}

function makeStatus(level, label, detail = '') {
  return { level, label, detail };
}

function isMissingBackendError(error) {
  return /not found|cannot (get|post|patch|delete)|route|endpoint/i.test(String(error?.message || error || ''));
}

function actionErrorMessage(error) {
  if (isMissingBackendError(error)) return MISSING_ACTION_MESSAGE;
  return error?.message || MISSING_ACTION_MESSAGE;
}

async function safeLoad(request, path) {
  try {
    return { data: await request(path), error: '' };
  } catch (error) {
    return { data: null, error: error.message || 'Not available' };
  }
}

async function loadSystemInfo(request, canViewSystem) {
  if (!canViewSystem) return { data: null, error: 'Not available', reason: 'permission' };
  const primary = await safeLoad(request, '/settings/system-info');
  if (!primary.error) return primary;
  if (!isMissingBackendError(primary.error)) return primary;
  const fallback = await safeLoad(request, '/settings/system-information');
  return fallback.error ? primary : fallback;
}

function pathStatus(pathInfo) {
  if (!pathInfo) return makeStatus('warning', 'Not available', 'Path data is not available');
  if (pathInfo.exists === false) return makeStatus('warning', 'Missing', 'Path is not available on the server');
  return makeStatus('healthy', 'Available', pathInfo.writable === false ? 'Read-only' : 'Ready');
}

function providerStatus(settings, keys = []) {
  const sources = [
    settings?.notificationProviders,
    settings?.integrations,
    settings?.providers,
    settings?.notificationTemplates?.providers,
    settings?.notificationTemplates?.integrations,
    settings?.notificationTemplates?.providerStatus
  ].filter(Boolean);
  for (const source of sources) {
    for (const key of keys) {
      const item = source?.[key];
      if (!item) continue;
      if (item.connected === true || item.status === 'connected') return makeStatus('healthy', 'Connected', 'Provider reports connected');
      if (item.enabled === true || item.configured === true || item.apiKey || item.token || item.accountSid) {
        return makeStatus('warning', 'Configured', 'Connection not verified');
      }
    }
  }
  return makeStatus('warning', 'Not configured', 'No provider configuration found');
}

function compactPath(value = '') {
  const path = String(value || '').trim();
  if (!path) return NO_DATA;
  const normalized = path.replace(/\//g, '\\');
  const parts = normalized.split('\\').filter(Boolean);
  if (parts.length <= 4) return normalized;
  return `...\\${parts.slice(-3).join('\\')}`;
}

function buildHealthSummary({ systemInfo, systemError, systemReason, backupData, backupError }) {
  const storage = backupData?.storage || systemInfo?.storage || null;
  const paths = systemInfo?.paths || {};
  const records = backupData?.records || [];
  const backupSettings = backupData?.settings || systemInfo?.backupSettings || {};
  const database = !systemInfo?.databaseStatus
    ? makeStatus(systemReason === 'permission' ? 'warning' : 'critical', 'Not available', systemError || 'Database status is not available')
    : /connected/i.test(systemInfo.databaseStatus)
      ? makeStatus('healthy', 'Connected', systemInfo.databaseName || 'Database is reachable')
      : makeStatus('critical', systemInfo.databaseStatus, 'Database is not connected');
  const api = backupError && systemError
    ? makeStatus('critical', 'Unavailable', 'Required settings APIs did not respond')
    : backupError || (systemError && systemReason !== 'permission')
      ? makeStatus('warning', 'Partial', 'Some settings status data is not available')
      : makeStatus('healthy', 'Online', 'Settings APIs responded');
  const pathValues = Object.values(paths);
  const storageHasNumber = storage && Number.isFinite(Number(storage.storageUsed));
  const storageStatus = backupError && !storageHasNumber
    ? makeStatus('critical', 'Unavailable', backupError)
    : !storageHasNumber
      ? makeStatus('warning', 'Not available', 'Storage usage is not available')
      : pathValues.some((item) => item?.exists === false)
        ? makeStatus('warning', 'Partial', 'One or more storage paths are missing')
        : makeStatus('healthy', 'Ready', `${formatBytes(storage.storageUsed)} used`);
  const backup = backupError
    ? makeStatus('warning', 'Not available', backupError)
    : records.length || backupSettings.lastBackupAt
      ? makeStatus('healthy', 'Ready', records[0]?.createdAt ? `Latest: ${backupCreatedAt(records[0])}` : 'Backup metadata available')
      : makeStatus('warning', 'Not configured', 'No backup history found');
  const pdf = paths.pdfs?.exists === true
    ? makeStatus('healthy', 'Ready', paths.pdfs.path || 'PDF storage is available')
    : paths.pdfs?.exists === false
      ? makeStatus('warning', 'Missing', 'PDF storage path is missing')
      : makeStatus('warning', 'Not available', 'PDF service status is not available');
  const items = { database, api, storage: storageStatus, backup, pdf };
  const hasCriticalCore = [database, api, storageStatus].some((item) => item.level === 'critical');
  const hasWarning = Object.values(items).some((item) => item.level !== 'healthy');
  const overall = hasCriticalCore
    ? makeStatus('critical', 'Critical', 'Database, API, or storage needs attention')
    : hasWarning
      ? makeStatus('warning', 'Warning', 'One or more services are missing or not configured')
      : makeStatus('healthy', 'System Healthy', 'All core services are ready');
  return { ...items, overall };
}

function SystemHealthCard({ icon: Icon, label, status }) {
  return (
    <div className="system-health-summary-card">
      <div className="system-health-summary-icon"><Icon className="h-5 w-5" /></div>
      <div className="min-w-0">
        <p className="system-health-summary-label">{label}</p>
        <span className={statusClass(status.level)}>{status.label}</span>
        {status.detail ? <p className="system-health-summary-detail">{status.detail}</p> : null}
      </div>
    </div>
  );
}

function SystemInfoMetric({ icon: Icon, label, value }) {
  return (
    <div className="system-info-metric">
      <Icon className="h-4 w-4" />
      <div className="min-w-0">
        <p>{label}</p>
        <strong>{value || NO_DATA}</strong>
      </div>
    </div>
  );
}

function BackupFileDetails({ record }) {
  if (!record) return null;
  return (
    <details className="system-health-file-details">
      <summary>View file details</summary>
      <div>
        <p><span>Full ZIP file name:</span> {record.filename || 'Backup ZIP file'}</p>
        <p><span>Backup type:</span> {backupDisplayTitle(record)}</p>
        <p><span>Backup size:</span> {formatBytes(record.size)}</p>
        <p><span>Created date/time:</span> {backupCreatedAtTime(record)}</p>
        <p><span>Created by:</span> {backupCreatedBy(record)}</p>
        <p><span>Backup status:</span> {titleCase(record.status || 'Unknown')}</p>
      </div>
    </details>
  );
}

function FinalRestoreModal({ source, validation, confirmText, working, onChange, onCancel, onConfirm }) {
  const canConfirm = confirmText === 'RESTORE' && !working;
  return (
    <div className="system-health-modal-backdrop">
      <div className="surface admin-modal system-health-restore-modal">
        <div className="system-health-modal-header">
          <div>
            <p>Final restore confirmation</p>
            <h3>Confirm Restore</h3>
          </div>
          <button type="button" className="icon-button h-9 w-9" onClick={onCancel} disabled={working} aria-label="Close restore confirmation">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="system-health-danger-note">Restoring a backup may replace current system data. Continue only after confirming this restore point.</p>
        <div className="system-health-restore-source">
          <span>Backup file</span>
          <strong>{source?.filename || 'Selected backup'}</strong>
          <small>{source?.createdAt ? backupCreatedAt(source) : NO_DATA} · {formatBytes(source?.size)}</small>
        </div>
        {validation?.summary ? (
          <p className="system-health-validation-note">
            {validation.summary.collections || 0} collections, {validation.summary.uploadFiles || 0} uploaded files, {validation.summary.pdfFiles || 0} PDF files validated.
          </p>
        ) : null}
        <label className="mt-4 block">
          <span className="label">Type RESTORE to continue</span>
          <input className="input" value={confirmText} onChange={(event) => onChange(event.target.value)} placeholder="RESTORE" autoFocus />
        </label>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn btn-secondary" disabled={working} onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-danger" disabled={!canConfirm} onClick={onConfirm}>
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArchiveRestore className="h-4 w-4" />}
            Confirm Restore
          </button>
        </div>
      </div>
    </div>
  );
}

export function SystemHealthBackupSection({ onDirtyChange = null }) {
  const { request, token, user } = useAuth();
  const { push } = useToast();
  const canViewSystem = hasRole(user, 'admin') && can(user, 'view_system_information');
  const canManageBackups = (hasRole(user, 'admin') || hasRole(user, 'super_admin')) && can(user, 'manage_backup_storage');
  const { data, loading, reload } = useResource(async () => {
    const [system, backup, business] = await Promise.all([
      loadSystemInfo(request, canViewSystem),
      safeLoad(request, '/settings/backup-storage'),
      safeLoad(request, '/settings/business')
    ]);
    return { system, backup, business, refreshedAt: new Date().toISOString() };
  }, [request, canViewSystem]);
  const [scheduleDraft, setScheduleDraft] = useState(normalizeBackupSettings());
  const [actionBusy, setActionBusy] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [restoreContext, setRestoreContext] = useState(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [finalRestoreOpen, setFinalRestoreOpen] = useState(false);
  const [restoreFile, setRestoreFile] = useState(null);
  const [restoreFileInputKey, setRestoreFileInputKey] = useState(0);
  const [restoreValidationStatus, setRestoreValidationStatus] = useState('idle');
  const [restoreSourceLabel, setRestoreSourceLabel] = useState('');
  const [activeInnerTab, setActiveInnerTab] = useState('overview');
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const restoreSectionRef = useRef(null);

  const systemInfo = data?.system?.data?.info || data?.system?.data || {};
  const backupData = data?.backup?.data || {};
  const businessSettings = data?.business?.data?.settings || {};
  const records = Array.isArray(backupData.records) ? backupData.records : [];
  const recentRecords = records.slice(0, 3);
  const latestBackup = records[0] || systemInfo.lastBackup || null;
  const storage = backupData.storage || systemInfo.storage || {};
  const backupSettings = backupData.settings || systemInfo.backupSettings || {};
  const savedSchedule = useMemo(() => normalizeBackupSettings(backupSettings), [backupSettings.automaticBackupEnabled, backupSettings.backupFrequency]);
  const scheduleDirty = stableJson(scheduleDraft) !== stableJson(savedSchedule);

  useEffect(() => {
    setScheduleDraft(savedSchedule);
  }, [savedSchedule.automaticBackupEnabled, savedSchedule.backupFrequency]);

  useEffect(() => {
    onDirtyChange?.(scheduleDirty);
  }, [scheduleDirty, onDirtyChange]);

  const health = useMemo(() => buildHealthSummary({
    systemInfo,
    systemError: data?.system?.error || '',
    systemReason: data?.system?.reason || '',
    backupData,
    backupError: data?.backup?.error || ''
  }), [systemInfo, data?.system?.error, data?.system?.reason, backupData, data?.backup?.error]);

  const pathRows = useMemo(() => {
    const paths = systemInfo.paths || {};
    return [
      { key: 'root', name: 'Root', size: storage.storageUsed, info: paths.root },
      { key: 'uploads', name: 'Uploads', size: storage.imageUploadStorage, info: paths.uploads },
      { key: 'pdfs', name: 'PDFs', size: storage.uploadedDocumentsStorage, info: paths.pdfs },
      { key: 'backups', name: 'Backups', size: storage.backupStorage, info: paths.backups }
    ];
  }, [systemInfo.paths, storage.storageUsed, storage.imageUploadStorage, storage.uploadedDocumentsStorage, storage.backupStorage]);

  const openFolderSupported = typeof window !== 'undefined' && Boolean(window.electron?.openPath || window.api?.openPath);
  const environment = String(systemInfo.environment || '').toLowerCase();
  const systemInfoMetrics = [
    { icon: Info, label: 'App Version', value: systemInfo.appVersion || NO_DATA },
    { icon: Server, label: 'Node.js Version', value: systemInfo.build?.node || systemInfo.nodeVersion || NO_DATA },
    { icon: Settings2, label: 'Environment', value: systemInfo.environment || NO_DATA },
    { icon: DatabaseBackup, label: 'Database Status', value: systemInfo.databaseStatus || 'Not available' },
    { icon: Activity, label: 'API Status', value: health.api.label || 'Not available' },
    { icon: HardDrive, label: 'Storage Used', value: formatBytes(storage.storageUsed) },
    { icon: CalendarClock, label: 'Last Backup', value: latestBackup?.createdAt ? backupCreatedAt(latestBackup) : 'Not available' },
    { icon: Activity, label: 'Uptime', value: formatUptime(systemInfo.uptimeSeconds || systemInfo.uptime) }
  ];
  const serviceStatuses = [
    { icon: FileText, label: 'PDF Service', status: health.pdf },
    { icon: MessageSquareText, label: 'WhatsApp API', status: providerStatus(businessSettings, ['whatsapp', 'whatsApp', 'WhatsApp']) },
    { icon: Mail, label: 'Email Service', status: providerStatus(businessSettings, ['email', 'mail', 'Email']) },
    { icon: Smartphone, label: 'SMS Service', status: providerStatus(businessSettings, ['sms', 'SMS']) },
    {
      icon: CalendarClock,
      label: 'Cron Jobs / Scheduler',
      status: backupSettings.automaticBackupEnabled
        ? makeStatus('warning', 'Configured', `Backup frequency: ${backupSettings.backupFrequency || 'Weekly'}`)
        : makeStatus('warning', 'Not configured', 'Automatic backups are disabled')
    }
  ];
  const restoreValidationLabel = actionBusy === 'validateUpload' || restoreValidationStatus === 'validating'
    ? 'Validating'
    : restoreValidationStatus === 'verified'
      ? 'Backup verified'
      : restoreValidationStatus === 'invalid'
        ? 'Invalid backup file'
        : 'Not validated yet';
  const restoreValidationLevel = restoreValidationStatus === 'verified'
    ? 'healthy'
    : restoreValidationStatus === 'invalid'
      ? 'critical'
      : restoreValidationStatus === 'validating'
        ? 'warning'
        : 'warning';
  const innerTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'backup', label: 'Backup' },
    { id: 'restore', label: 'Restore' },
    { id: 'storage', label: 'Storage' },
    { id: 'services', label: 'Services' }
  ];
  const footerSummary = {
    message: health.overall.level === 'healthy'
      ? 'System is running smoothly'
      : health.overall.level === 'critical'
        ? 'System needs immediate attention'
        : 'System has warnings to review',
    storage: formatBytes(storage.storageUsed),
    backups: `${records.length} ${records.length === 1 ? 'file' : 'files'}`,
    lastBackup: latestBackup?.createdAt ? backupCreatedAt(latestBackup) : 'Not available',
    autoBackup: backupSettings.automaticBackupEnabled ? 'Enabled' : 'Disabled'
  };

  async function refreshStatus() {
    setActionBusy('refresh');
    await reload({ silent: true });
    setActionBusy('');
    push('System status refreshed.', 'info');
  }

  async function saveSchedule() {
    if (!canManageBackups || !scheduleDirty) return;
    setActionBusy('saveSchedule');
    try {
      const result = await request('/settings/backup-storage', {
        method: 'PATCH',
        body: JSON.stringify(scheduleDraft)
      });
      push(result.message || 'Backup settings saved');
      await reload({ silent: true });
    } catch (error) {
      push(actionErrorMessage(error), 'error');
    } finally {
      setActionBusy('');
    }
  }

  async function createBackup(downloadAfter = false) {
    if (!canManageBackups) {
      push('Backup actions require Admin or Super Admin backup storage permission.', 'error');
      return;
    }
    setActionBusy(downloadAfter ? 'createDownload' : 'create');
    try {
      const result = await request('/settings/backups', { method: 'POST' });
      push(result.message || 'Backup created');
      await reload({ silent: true });
      if (downloadAfter && result.backup?.id) await downloadBackup(result.backup.id, result.backup);
    } catch (error) {
      push(actionErrorMessage(error), 'error');
    } finally {
      setActionBusy('');
    }
  }

  async function downloadBackup(id, record = null) {
    if (!id) {
      push('No backup file is available to download.', 'error');
      return;
    }
    setActionBusy((current) => current || `download:${id}`);
    try {
      const response = await fetch(`${apiBase}/settings/backups/${id}/download`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) {
        const message = await response.text().catch(() => '');
        throw new Error(response.status === 404 ? 'Backup file not found' : message || 'Backup download failed');
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = record?.filename || `universal-systems-backup-${Date.now()}.zip`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      push(actionErrorMessage(error), 'error');
    } finally {
      setActionBusy('');
    }
  }

  function downloadLatestBackup() {
    if (!latestBackup?.id) {
      push('No backup file is available to download.', 'error');
      return;
    }
    downloadBackup(latestBackup.id, latestBackup);
  }

  function requestRestore(record = latestBackup) {
    if (!record?.id) {
      push('No backup history found. Run your first backup to create a restore point.', 'error');
      return;
    }
    setConfirmation({ type: 'restore', record });
  }

  function resetRestoreFlow() {
    setRestoreFile(null);
    setRestoreFileInputKey((current) => current + 1);
    setRestoreValidationStatus('idle');
    setRestoreSourceLabel('');
    setRestoreContext(null);
    setRestoreConfirmText('');
    setFinalRestoreOpen(false);
  }

  function handleRestoreFileChange(event) {
    const file = event.target.files?.[0] || null;
    setRestoreContext(null);
    setRestoreSourceLabel('');
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
    setRestoreSourceLabel(file.name);
  }

  async function validateRestoreUpload() {
    if (!canManageBackups) {
      push('Backup actions require Admin or Super Admin backup storage permission.', 'error');
      return;
    }
    if (!restoreFile) {
      push('Choose a backup ZIP file first', 'error');
      return;
    }
    const body = new FormData();
    body.append('backup', restoreFile);
    setActionBusy('validateUpload');
    setRestoreValidationStatus('validating');
    try {
      const result = await request('/settings/backups/restore', { method: 'POST', body });
      const record = result.record || { filename: restoreFile.name, size: restoreFile.size, createdAt: new Date().toISOString() };
      setRestoreContext({ record, validation: result });
      setRestoreConfirmText('');
      setFinalRestoreOpen(false);
      setRestoreValidationStatus('verified');
      setRestoreSourceLabel(restoreFile.name);
      push(result.message || 'Backup validated', 'info');
      setActiveInnerTab('restore');
      requestAnimationFrame(() => restoreSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (error) {
      setRestoreContext(null);
      setRestoreValidationStatus('invalid');
      push(actionErrorMessage(error), 'error');
    } finally {
      setActionBusy('');
    }
  }

  async function validateRestore(record) {
    setConfirmation(null);
    if (!record?.id) return;
    setActionBusy(`restore:${record.id}`);
    setRestoreValidationStatus('validating');
    setRestoreSourceLabel(record.filename || 'Selected backup');
    try {
      const result = await request(`/settings/backups/${record.id}/restore`, { method: 'POST' });
      if (!result.restoreToken) throw new Error('Backup validation did not return a restore token.');
      setRestoreContext({ record, validation: result });
      setRestoreConfirmText('');
      setFinalRestoreOpen(false);
      setRestoreValidationStatus('verified');
      push(result.message || 'Backup validated', 'info');
      setActiveInnerTab('restore');
      requestAnimationFrame(() => restoreSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch (error) {
      setRestoreValidationStatus('invalid');
      push(actionErrorMessage(error), 'error');
    } finally {
      setActionBusy('');
    }
  }

  async function confirmRestore() {
    if (!restoreContext?.validation?.restoreToken) return;
    setActionBusy('confirmRestore');
    try {
      const result = await request('/settings/backups/restore', {
        method: 'POST',
        body: JSON.stringify({ restoreToken: restoreContext.validation.restoreToken, confirmRestore: true })
      });
      push(result.message || 'Backup restored successfully');
      setFinalRestoreOpen(false);
      resetRestoreFlow();
      await reload({ silent: true });
    } catch (error) {
      push(actionErrorMessage(error), 'error');
    } finally {
      setActionBusy('');
    }
  }

  async function copyPath(path) {
    if (!path) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(path);
      } else {
        const input = document.createElement('textarea');
        input.value = path;
        input.setAttribute('readonly', '');
        input.style.position = 'fixed';
        input.style.opacity = '0';
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        input.remove();
      }
      push('Path copied');
    } catch (error) {
      push('Copy path is not available in this browser.', 'error');
    }
  }

  function handlePlaceholderAction() {
    push(MISSING_ACTION_MESSAGE, 'info');
  }

  async function deleteBackup(record) {
    if (!record?.id) return;
    setActionBusy(`delete:${record.id}`);
    try {
      const result = await request(`/settings/backups/${record.id}`, { method: 'DELETE' });
      push(result.message || 'Backup deleted');
      setConfirmation(null);
      await reload({ silent: true });
    } catch (error) {
      push(actionErrorMessage(error), 'error');
    } finally {
      setActionBusy('');
    }
  }

  if (loading) {
    return (
      <div className="system-health-settings" data-system-health-root>
        <div className="surface admin-control-card system-health-loading-card">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading system health...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="system-health-settings grid gap-5 pb-24" data-system-health-root>
      <section className="surface admin-control-card system-health-hero">
        <div className="system-health-hero-copy">
          <div className="system-health-eyebrow">
            <ShieldCheck className="h-4 w-4" />
            Admin Settings
          </div>
          <h2>System Health &amp; Backup</h2>
          <p>Monitor system status, storage usage, backups, and service readiness.</p>
        </div>
        <div className="system-health-hero-actions">
          <span className={statusClass(health.overall.level)}>{health.overall.label}</span>
          <button type="button" className="btn btn-secondary admin-compact-button" disabled={Boolean(actionBusy)} onClick={refreshStatus}>
            {actionBusy === 'refresh' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </button>
        </div>
      </section>

      <section className="surface admin-control-card system-health-panel system-health-summary-panel">
        <div className="system-health-panel-header">
          <div>
            <h3>System Health Summary</h3>
            <p>Core service readiness calculated from available system, storage, and backup data.</p>
          </div>
          <Activity className="h-5 w-5" />
        </div>
        <div className="system-health-summary">
          <SystemHealthCard icon={DatabaseBackup} label="Database" status={health.database} />
          <SystemHealthCard icon={Activity} label="API Status" status={health.api} />
          <SystemHealthCard icon={HardDrive} label="Storage" status={health.storage} />
          <SystemHealthCard icon={DatabaseBackup} label="Backup" status={health.backup} />
          <SystemHealthCard icon={FileText} label="PDF Engine" status={health.pdf} />
          <SystemHealthCard icon={ShieldCheck} label="Overall Status" status={health.overall} />
        </div>
      </section>

      {(data?.system?.error || data?.backup?.error) ? (
        <section className="system-health-warning-banner">
          <AlertTriangle className="h-5 w-5" />
          <p>{data?.system?.error || data?.backup?.error}</p>
        </section>
      ) : null}

      <nav className="system-health-inner-tabs" aria-label="System Health sections">
        {innerTabs.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`system-health-inner-tab ${activeInnerTab === item.id ? 'is-active' : ''}`}
            onClick={() => setActiveInnerTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="system-health-tab-panel">
        {activeInnerTab === 'overview' ? (
          <div className="system-health-overview-grid">
            <section className="surface admin-control-card system-health-panel">
              <div className="system-health-panel-header">
                <div>
                  <h3>System Information</h3>
                  <p>Compact runtime and environment details from the current server.</p>
                </div>
                <Info className="h-5 w-5" />
              </div>
              {environment === 'development' ? (
                <div className="system-health-dev-warning">
                  <AlertTriangle className="h-4 w-4" />
                  Development mode is active. Use production mode for live deployment.
                </div>
              ) : null}
              <div className="system-info-grid">
                {systemInfoMetrics.map((item) => <SystemInfoMetric key={item.label} {...item} />)}
              </div>
            </section>

            <section className="surface admin-control-card system-health-panel">
              <div className="system-health-panel-header">
                <div>
                  <h3>Quick Actions</h3>
                  <p>Real backup routes are used where available. Integration-only actions stay safe until wired.</p>
                </div>
                <Settings2 className="h-5 w-5" />
              </div>
              {!canManageBackups ? (
                <p className="system-health-permission-note">Backup and restore actions require Admin or Super Admin backup storage permission.</p>
              ) : null}
              <div className="system-health-actions-grid">
                <button type="button" className="system-health-action-button" disabled={!canManageBackups || Boolean(actionBusy)} onClick={() => createBackup(false)}>
                  {actionBusy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <DatabaseBackup className="h-4 w-4" />}
                  <span>Run Backup Now</span>
                </button>
                <button type="button" className="system-health-action-button" disabled={!canManageBackups || Boolean(actionBusy) || !latestBackup?.id} onClick={downloadLatestBackup}>
                  <Download className="h-4 w-4" />
                  <span>Download Latest Backup</span>
                </button>
                <button type="button" className="system-health-action-button system-health-action-danger" disabled={!canManageBackups || Boolean(actionBusy) || !latestBackup?.id} onClick={() => requestRestore(latestBackup)}>
                  <ArchiveRestore className="h-4 w-4" />
                  <span>Restore Backup</span>
                </button>
                <button type="button" className="system-health-action-button" disabled={Boolean(actionBusy)} onClick={handlePlaceholderAction}>
                  <Server className="h-4 w-4" />
                  <span>Test Database Connection</span>
                </button>
                <button type="button" className="system-health-action-button" disabled={Boolean(actionBusy)} onClick={refreshStatus}>
                  <HardDrive className="h-4 w-4" />
                  <span>Check Storage Health</span>
                </button>
                <button type="button" className="system-health-action-button" disabled={Boolean(actionBusy)} onClick={() => setConfirmation({ type: 'clearTemp' })}>
                  <RefreshCw className="h-4 w-4" />
                  <span>Clear Temporary Files</span>
                </button>
              </div>
            </section>

            <section className="surface admin-control-card system-health-panel system-health-services-summary">
              <div className="system-health-panel-header">
                <div>
                  <h3>Additional Services Status</h3>
                  <p>Provider readiness summary. Open Services for full detail.</p>
                </div>
                <Activity className="h-5 w-5" />
              </div>
              <div className="system-health-services-compact">
                {serviceStatuses.map((service) => {
                  const Icon = service.icon;
                  return (
                    <div key={service.label} className="system-health-service-chip">
                      <Icon className="h-4 w-4" />
                      <span>{service.label}</span>
                      <b className={statusClass(service.status.level)}>{service.status.label}</b>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        ) : null}

        {activeInnerTab === 'backup' ? (
          <div className="system-health-backup-grid">
            <section className="surface admin-control-card system-health-panel backup-settings-card">
              <div className="system-health-panel-header">
                <div>
                  <h3>Backup Settings</h3>
                  <p>Automatic backup preferences and save behavior.</p>
                </div>
                <DatabaseBackup className="h-5 w-5" />
              </div>
              <div className="system-health-schedule-card">
                <div>
                  <p className="system-health-side-label">Automatic Backup</p>
                  <strong>{scheduleDraft.automaticBackupEnabled ? 'Enabled' : 'Disabled'}</strong>
                  <span>Next backup date/time: {backupNextRunLabel({ ...backupSettings, ...scheduleDraft })}</span>
                  <span>Last backup status: {latestBackup ? titleCase(latestBackup.status || 'Unknown') : 'Not available'}</span>
                </div>
                <label className="system-health-toggle-row">
                  <input
                    type="checkbox"
                    checked={scheduleDraft.automaticBackupEnabled}
                    disabled={!canManageBackups || actionBusy === 'saveSchedule'}
                    onChange={(event) => setScheduleDraft((current) => ({ ...current, automaticBackupEnabled: event.target.checked }))}
                  />
                  <span>Automatic Backup</span>
                </label>
                <label className="system-health-frequency-field">
                  <span className="label">Backup Frequency</span>
                  <select
                    className="input"
                    value={scheduleDraft.backupFrequency}
                    disabled={!canManageBackups || actionBusy === 'saveSchedule'}
                    onChange={(event) => setScheduleDraft((current) => ({ ...current, backupFrequency: event.target.value }))}
                  >
                    <option>Daily</option>
                    <option>Weekly</option>
                    <option>Monthly</option>
                  </select>
                </label>
                <button type="button" className="btn btn-primary admin-compact-button" disabled={!canManageBackups || !scheduleDirty || actionBusy === 'saveSchedule'} onClick={saveSchedule}>
                  {actionBusy === 'saveSchedule' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  Save Backup Settings
                </button>
              </div>
              {scheduleDirty ? <p className="system-health-inline-note">Backup settings have unsaved changes.</p> : null}
            </section>

            <section className="surface admin-control-card system-health-panel recent-backups-card">
              <div className="system-health-panel-header">
                <div>
                  <h3>Recent Backups</h3>
                  <p>Latest 3 backup files. Open full history for all records.</p>
                </div>
                <button type="button" className="btn btn-secondary admin-compact-button" onClick={() => setHistoryModalOpen(true)}>
                  View Full Backup History
                </button>
              </div>
              <div className="system-health-recent-list">
                {recentRecords.length ? recentRecords.map((record) => (
                  <article key={record.id} className="system-health-recent-backup">
                    <div className="system-health-recent-header">
                      <div className="min-w-0">
                        <strong>{backupDisplayTitle(record)}</strong>
                        <p>{backupCreatedAtTime(record)} · {formatBytes(record.size)} · {backupCreatedBy(record)}</p>
                      </div>
                      <span className={statusClass(record.status === 'failed' ? 'critical' : 'healthy')}>{titleCase(record.status || 'Unknown')}</span>
                    </div>
                    <p className="system-health-recent-file" title={record.filename || ''}>{record.filename || NO_DATA}</p>
                    <div className="system-health-row-actions">
                      <button type="button" className="system-health-icon-button" title="Download backup" aria-label="Download backup" disabled={!canManageBackups || Boolean(actionBusy)} onClick={() => downloadBackup(record.id, record)}>
                        <Download className="h-4 w-4" />
                      </button>
                      <button type="button" className="system-health-icon-button" title="Restore backup" aria-label="Restore backup" disabled={!canManageBackups || Boolean(actionBusy)} onClick={() => requestRestore(record)}>
                        <ArchiveRestore className="h-4 w-4" />
                      </button>
                      <button type="button" className="system-health-icon-button system-health-icon-danger" title="Delete backup" aria-label="Delete backup" disabled={!canManageBackups || Boolean(actionBusy)} onClick={() => setConfirmation({ type: 'delete', record })}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </article>
                )) : (
                  <div className="system-health-empty-state">
                    <DatabaseBackup className="h-9 w-9" />
                    <strong>No backup history found.</strong>
                    <p>Run your first backup to create a restore point.</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : null}

        {activeInnerTab === 'restore' ? (
          <section ref={restoreSectionRef} className="surface admin-control-card system-health-panel restore-data-recovery-card">
            <div className="system-health-panel-header">
              <div>
                <h3>Restore / Data Recovery</h3>
                <p>Validate a Universal Systems backup ZIP before restoring. A pre-restore backup is created automatically before data is replaced.</p>
              </div>
              <ArchiveRestore className="h-5 w-5" />
            </div>
            <div className="system-health-restore-warning">
              <AlertTriangle className="h-4 w-4" />
              Restoring backup will replace current data. Create a backup before restoring. This action cannot be undone.
            </div>
            <div className="system-health-restore-flow">
              <div className="system-health-restore-step">
                <UploadCloud className="h-4 w-4" />
                <span>Choose backup ZIP file</span>
              </div>
              <div className="system-health-restore-step">
                <ShieldCheck className="h-4 w-4" />
                <span>Validate Backup</span>
              </div>
              <div className="system-health-restore-step">
                <DatabaseBackup className="h-4 w-4" />
                <span>Create pre-restore backup</span>
              </div>
              <div className="system-health-restore-step">
                <ArchiveRestore className="h-4 w-4" />
                <span>Confirm Restore</span>
              </div>
            </div>
            <div className="system-health-restore-grid">
              <label className="min-w-0">
                <span className="label">Select Backup File (ZIP)</span>
                <input key={restoreFileInputKey} className="input" type="file" accept=".zip" disabled={!canManageBackups || Boolean(actionBusy)} onChange={handleRestoreFileChange} />
                <span className="system-health-file-helper">{restoreSourceLabel || 'Choose a Universal Systems backup .zip file.'}</span>
              </label>
              <div className="system-health-validation-card">
                <p className="system-health-side-label">Validation Status</p>
                <span className={statusClass(restoreValidationLevel)}>{restoreValidationLabel}</span>
                {restoreContext?.validation?.summary ? (
                  <small>
                    {restoreContext.validation.summary.collections || 0} collections, {restoreContext.validation.summary.uploadFiles || 0} uploaded files, {restoreContext.validation.summary.pdfFiles || 0} PDF files.
                  </small>
                ) : (
                  <small>Validate a backup before restore confirmation.</small>
                )}
              </div>
            </div>
            {restoreContext?.record ? (
              <div className="system-health-selected-backup">
                <p className="system-health-side-label">Selected Backup</p>
                <strong>{restoreContext.record.filename || 'Selected backup'}</strong>
                <span>{restoreContext.record.createdAt ? backupCreatedAt(restoreContext.record) : NO_DATA} · {formatBytes(restoreContext.record.size)}</span>
                <BackupFileDetails record={restoreContext.record} />
              </div>
            ) : null}
            <div className="system-health-card-actions">
              <button type="button" className="btn btn-secondary" disabled={Boolean(actionBusy)} onClick={resetRestoreFlow}>
                Reset Restore Flow
              </button>
              <button type="button" className="btn btn-secondary" disabled={!canManageBackups || Boolean(actionBusy) || !restoreFile} onClick={validateRestoreUpload}>
                {actionBusy === 'validateUpload' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Validate Backup
              </button>
              <button type="button" className="btn btn-danger" disabled={!canManageBackups || Boolean(actionBusy) || !restoreContext?.validation?.restoreToken} onClick={() => setConfirmation({ type: 'restoreValidated' })}>
                <ArchiveRestore className="h-4 w-4" />
                Start Restore
              </button>
            </div>
          </section>
        ) : null}

        {activeInnerTab === 'storage' ? (
          <div className="system-health-storage-tab">
            <div className="system-health-storage-summary">
              <SystemInfoMetric icon={HardDrive} label="Total Storage Used" value={formatBytes(storage.storageUsed)} />
              <SystemInfoMetric icon={UploadCloud} label="Uploads" value={formatBytes(storage.imageUploadStorage)} />
              <SystemInfoMetric icon={FileText} label="PDFs" value={formatBytes(storage.uploadedDocumentsStorage)} />
              <SystemInfoMetric icon={DatabaseBackup} label="Backups" value={formatBytes(storage.backupStorage)} />
            </div>
            <section className="surface admin-control-card system-health-panel storage-paths-card">
              <div className="system-health-panel-header">
                <div>
                  <h3>Storage Paths</h3>
                  <p>Server-side storage locations and availability checks.</p>
                </div>
                <button type="button" className="btn btn-secondary admin-compact-button" disabled={Boolean(actionBusy)} onClick={() => setConfirmation({ type: 'clearTemp' })}>
                  <RefreshCw className="h-4 w-4" />
                  Clear Temporary Files
                </button>
              </div>
              <div className="system-health-table-scroll">
                <table className="system-health-table system-health-path-table">
                  <thead>
                    <tr>
                      <th>Path Name</th>
                      <th>Location</th>
                      <th>Used Size</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pathRows.map((row) => {
                      const status = pathStatus(row.info);
                      return (
                        <tr key={row.key}>
                          <td><strong>{row.name}</strong></td>
                          <td className="system-health-path-cell" title={row.info?.path || ''}>{row.info?.path ? compactPath(row.info.path) : NO_DATA}</td>
                          <td>{row.info ? formatBytes(row.size) : NO_DATA}</td>
                          <td><span className={statusClass(status.level)}>{status.label}</span></td>
                          <td>
                            <div className="system-health-row-actions">
                              <button type="button" className="system-health-icon-button" title="Copy path" aria-label={`Copy ${row.name} path`} disabled={!row.info?.path} onClick={() => copyPath(row.info?.path)}>
                                <Copy className="h-4 w-4" />
                              </button>
                              {openFolderSupported ? (
                                <button type="button" className="btn btn-secondary admin-table-button" disabled={!row.info?.path} onClick={() => window.electron?.openPath ? window.electron.openPath(row.info.path) : window.api.openPath(row.info.path)}>
                                  Open Folder
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        ) : null}

        {activeInnerTab === 'services' ? (
          <section className="surface admin-control-card system-health-panel system-health-services-card">
            <div className="system-health-panel-header">
              <div>
                <h3>Additional Services Status</h3>
                <p>Provider readiness is shown only when configuration is discoverable. No connected status is faked.</p>
              </div>
              <Activity className="h-5 w-5" />
            </div>
            <div className="system-health-services-list">
              {serviceStatuses.map((service) => {
                const Icon = service.icon;
                return (
                  <div key={service.label} className="system-health-service-row">
                    <Icon className="h-4 w-4" />
                    <div className="min-w-0">
                      <strong>{service.label}</strong>
                      <p>{service.status.detail}</p>
                    </div>
                    <span className={statusClass(service.status.level)}>{service.status.label}</span>
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>

      <div className="system-health-footer-strip">
        <span>{footerSummary.message}</span>
        <b>Storage Used: {footerSummary.storage}</b>
        <b>Backups: {footerSummary.backups}</b>
        <b>Last Backup: {footerSummary.lastBackup}</b>
        <b>Auto Backup: {footerSummary.autoBackup}</b>
      </div>

      {historyModalOpen ? (
        <div className="system-health-modal-backdrop">
          <div className="surface admin-modal system-health-history-modal">
            <div className="system-health-modal-header">
              <div>
                <p>Backup archive</p>
                <h3>Full Backup History</h3>
              </div>
              <button type="button" className="icon-button h-9 w-9" onClick={() => setHistoryModalOpen(false)} aria-label="Close backup history">
                <X className="h-5 w-5" />
              </button>
            </div>
            {records.length ? (
              <div className="system-health-table-scroll mt-4">
                <table className="system-health-table system-health-backup-table">
                  <thead>
                    <tr>
                      <th>Date &amp; Time</th>
                      <th>Type</th>
                      <th>File Name</th>
                      <th>Size</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((record) => (
                      <tr key={record.id}>
                        <td>{record.createdAt ? backupCreatedAt(record) : NO_DATA}</td>
                        <td>{backupTypeLabel(record)}</td>
                        <td className="system-health-path-cell" title={record.filename || ''}>{record.filename || NO_DATA}</td>
                        <td>{formatBytes(record.size)}</td>
                        <td><span className={statusClass(record.status === 'failed' ? 'critical' : 'healthy')}>{titleCase(record.status || 'Not available')}</span></td>
                        <td>
                          <div className="system-health-row-actions">
                            <button type="button" className="system-health-icon-button" title="Download backup" aria-label="Download backup" disabled={!canManageBackups || Boolean(actionBusy)} onClick={() => downloadBackup(record.id, record)}>
                              <Download className="h-4 w-4" />
                            </button>
                            <button type="button" className="system-health-icon-button" title="Restore backup" aria-label="Restore backup" disabled={!canManageBackups || Boolean(actionBusy)} onClick={() => {
                              setHistoryModalOpen(false);
                              requestRestore(record);
                            }}>
                              <ArchiveRestore className="h-4 w-4" />
                            </button>
                            <button type="button" className="system-health-icon-button system-health-icon-danger" title="Delete backup" aria-label="Delete backup" disabled={!canManageBackups || Boolean(actionBusy)} onClick={() => setConfirmation({ type: 'delete', record })}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="system-health-empty-state mt-4">
                <DatabaseBackup className="h-9 w-9" />
                <strong>No backup history found.</strong>
                <p>Run your first backup to create a restore point.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {confirmation?.type === 'restore' ? (
        <ConfirmModal
          title="Restore Backup?"
          message="Restoring a backup may replace current system data. Continue?"
          confirmLabel="Continue"
          onCancel={() => setConfirmation(null)}
          onConfirm={() => validateRestore(confirmation.record)}
        />
      ) : null}
      {confirmation?.type === 'clearTemp' ? (
        <ConfirmModal
          title="Clear Temporary Files?"
          message="This will clear temporary files only. Uploaded files, PDFs, and backups will not be deleted."
          confirmLabel="Continue"
          onCancel={() => setConfirmation(null)}
          onConfirm={() => {
            setConfirmation(null);
            handlePlaceholderAction();
          }}
        />
      ) : null}
      {confirmation?.type === 'restoreValidated' ? (
        <ConfirmModal
          title="Restore Backup?"
          message="Restoring a backup may replace current system data. Continue?"
          confirmLabel="Continue"
          onCancel={() => setConfirmation(null)}
          onConfirm={() => {
            setConfirmation(null);
            setFinalRestoreOpen(true);
          }}
        />
      ) : null}
      {confirmation?.type === 'delete' ? (
        <ConfirmModal
          title="Delete Backup?"
          message="This will permanently remove the backup ZIP file and its record. You cannot restore using this backup after deletion."
          confirmLabel="Delete Backup"
          onCancel={() => setConfirmation(null)}
          onConfirm={() => deleteBackup(confirmation.record)}
        />
      ) : null}
      {finalRestoreOpen && restoreContext ? (
        <FinalRestoreModal
          source={restoreContext.record}
          validation={restoreContext.validation}
          confirmText={restoreConfirmText}
          working={actionBusy === 'confirmRestore'}
          onChange={setRestoreConfirmText}
          onCancel={() => {
            if (actionBusy === 'confirmRestore') return;
            setFinalRestoreOpen(false);
            setRestoreConfirmText('');
          }}
          onConfirm={confirmRestore}
        />
      ) : null}
    </div>
  );
}

export default SystemHealthBackupSection;
