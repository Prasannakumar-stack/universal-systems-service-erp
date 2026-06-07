import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileText,
  Info,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  Monitor,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  X
} from 'lucide-react';
import { formatDate, useAuth, useResource, useToast } from '../../shared/phase1Shared.jsx';

const NOT_AVAILABLE = 'Not available';
const UNSUPPORTED_SAVE_MESSAGE = 'This setting requires backend support before it can be saved.';

const SECURITY_DRAFT_DEFAULTS = {
  password: {
    minimumLength: 6,
    requireUppercase: false,
    requireNumbers: false,
    requireSpecial: false,
    expiryDays: 0,
    reuseCount: 0
  },
  login: {
    failedLoginLimit: 10,
    lockoutMinutes: 15,
    adminLoginAlerts: true
  },
  session: {
    timeoutMinutes: 720,
    logoutIdleSessions: false
  },
  audit: {
    enabled: true,
    retentionDays: 90,
    logAdminActivities: true,
    logDataChanges: true,
    logSecurityEvents: true
  }
};

const dangerActions = [
  {
    key: 'logoutUsers',
    endpoint: '/settings/security/logout-all-users',
    icon: LogOut,
    title: 'Logout all users',
    helper: 'Invalidate active user sessions through token-version protection.',
    confirm: 'This will log out all active users. You may need to sign in again. Continue?',
    logsOutCurrentUser: true
  },
  {
    key: 'resetSessions',
    endpoint: '/settings/security/reset-sessions',
    icon: RotateCcw,
    title: 'Reset all sessions',
    helper: 'Reset global and per-user session versions across the workspace.',
    confirm: 'This will invalidate active sessions and users may need to log in again. Continue?',
    logsOutCurrentUser: true
  },
  {
    key: 'forcePasswordReset',
    endpoint: '/settings/security/force-password-reset-staff',
    icon: ShieldAlert,
    title: 'Force password reset for staff',
    helper: 'Require non-admin staff to change password on next login.',
    confirm: 'Staff users will be required to set a new password on next login. Continue?',
    logsOutCurrentUser: false
  }
];

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function downloadJson(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function draftFromSettings(settings = {}) {
  const password = settings.password || {};
  const login = settings.login || {};
  const session = settings.session || {};
  const audit = settings.audit || {};
  return {
    password: {
      minimumLength: Number(password.minimumPasswordLength ?? SECURITY_DRAFT_DEFAULTS.password.minimumLength),
      requireUppercase: Boolean(password.requireUppercase),
      requireNumbers: Boolean(password.requireNumbers),
      requireSpecial: Boolean(password.requireSpecialCharacters),
      expiryDays: Number(password.passwordExpiryDays || 0),
      reuseCount: Number(password.preventPasswordReuseCount || 0)
    },
    login: {
      failedLoginLimit: Number(login.failedLoginLimit ?? SECURITY_DRAFT_DEFAULTS.login.failedLoginLimit),
      lockoutMinutes: Number(login.lockoutDurationMinutes ?? SECURITY_DRAFT_DEFAULTS.login.lockoutMinutes),
      adminLoginAlerts: login.adminLoginAlerts !== false
    },
    session: {
      timeoutMinutes: Number(session.sessionTimeoutMinutes ?? SECURITY_DRAFT_DEFAULTS.session.timeoutMinutes),
      logoutIdleSessions: Boolean(session.logoutIdleSessions)
    },
    audit: {
      enabled: audit.auditLoggingEnabled !== false,
      retentionDays: Number(audit.auditRetentionDays ?? SECURITY_DRAFT_DEFAULTS.audit.retentionDays),
      logAdminActivities: audit.logAdminActivities !== false,
      logDataChanges: audit.logDataChanges !== false,
      logSecurityEvents: audit.logSecurityEvents !== false
    }
  };
}

function settingsFromDraft(draft = {}) {
  return {
    password: {
      minimumPasswordLength: Number(draft.password.minimumLength),
      requireUppercase: Boolean(draft.password.requireUppercase),
      requireNumbers: Boolean(draft.password.requireNumbers),
      requireSpecialCharacters: Boolean(draft.password.requireSpecial),
      passwordExpiryDays: 0,
      preventPasswordReuseCount: 0
    },
    login: {
      failedLoginLimit: Number(draft.login.failedLoginLimit),
      lockoutDurationMinutes: Number(draft.login.lockoutMinutes),
      adminLoginAlerts: Boolean(draft.login.adminLoginAlerts),
      twoFactorStatus: 'not_configured'
    },
    session: {
      sessionTimeoutMinutes: Number(draft.session.timeoutMinutes),
      logoutIdleSessions: false
    },
    audit: {
      auditLoggingEnabled: Boolean(draft.audit.enabled),
      auditRetentionDays: Number(draft.audit.retentionDays),
      logAdminActivities: Boolean(draft.audit.logAdminActivities),
      logDataChanges: Boolean(draft.audit.logDataChanges),
      logSecurityEvents: Boolean(draft.audit.logSecurityEvents)
    }
  };
}

function getNestedLogs(data) {
  if (!data) return [];
  if (Array.isArray(data.events)) return data.events;
  if (Array.isArray(data.logs)) return data.logs;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

function logUserLabel(log = {}) {
  const user = log.userId || log.user || {};
  return user.name || user.username || log.username || 'System user';
}

function logTitle(log = {}) {
  const raw = log.action || log.title || 'Security event';
  return String(raw).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (char) => char.toUpperCase());
}

function severityForLog(log = {}) {
  if (log.severity) return String(log.severity);
  const text = `${log.action || ''} ${log.title || ''} ${log.message || ''}`.toLowerCase();
  if (/(failed|denied|blocked|locked|reset|delete|restore)/.test(text)) return 'warning';
  return 'info';
}

function formatTime(value) {
  if (!value) return NOT_AVAILABLE;
  try {
    return formatDate(value);
  } catch {
    return NOT_AVAILABLE;
  }
}

function SecurityBadge({ tone = 'neutral', children }) {
  return <span className={`security-settings-badge security-settings-badge-${tone}`}>{children}</span>;
}

function SecurityToggle({ checked, disabled = false, onChange, label, badge = null, onDisabledClick = null }) {
  function handleRowClick(event) {
    if (!disabled) return;
    event.preventDefault();
    onDisabledClick?.();
  }

  return (
    <div className={`security-settings-toggle-row ${disabled ? 'is-disabled' : ''}`} aria-disabled={disabled} onClick={handleRowClick}>
      <span>
        <strong>{label}</strong>
        {badge}
      </span>
      <button
        type="button"
        className={`security-settings-toggle ${checked ? 'is-on' : ''}`}
        disabled={disabled}
        aria-pressed={checked}
        onClick={() => !disabled && onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}

function SecurityReadOnlyRow({ label, value, badge = null }) {
  return (
    <div className="security-settings-toggle-row is-disabled" aria-disabled="true">
      <span>
        <strong>{label}</strong>
        {badge}
      </span>
      <SecurityBadge tone="warning">{value}</SecurityBadge>
    </div>
  );
}

function SecurityNumberField({ label, value, min = 0, suffix, onChange, disabled = false, badge = null, onDisabledClick = null }) {
  function handleFieldClick(event) {
    if (!disabled) return;
    event.preventDefault();
    onDisabledClick?.();
  }

  return (
    <div className={`security-settings-field ${disabled ? 'is-disabled' : ''}`} aria-disabled={disabled} onClick={handleFieldClick}>
      <div className="security-settings-field-label">
        <span>{label}</span>
        {badge}
      </div>
      <div>
        <input
          type="number"
          min={min}
          value={value}
          disabled={disabled}
          aria-label={label}
          onChange={(event) => onChange(Number(event.target.value || 0))}
        />
        {suffix ? <small>{suffix}</small> : null}
      </div>
    </div>
  );
}

function SecuritySelectField({ label, value, options, onChange }) {
  return (
    <div className="security-settings-field">
      <div className="security-settings-field-label">
        <span>{label}</span>
      </div>
      <select value={value} aria-label={label} onChange={(event) => onChange(Number(event.target.value))}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </div>
  );
}

function InfoStrip({ icon: Icon = Info, children, tone = 'info' }) {
  return (
    <div className={`security-settings-info-strip security-settings-info-strip-${tone}`}>
      <Icon className="h-4 w-4" />
      <span>{children}</span>
    </div>
  );
}

function SecurityPanel({ icon: Icon, title, subtitle, children, className = '', action = null }) {
  return (
    <section className={`security-policy-card ${className}`}>
      <div className="security-settings-panel-head">
        <div className="security-settings-panel-title">
          <span className="security-settings-card-icon"><Icon className="h-4 w-4" /></span>
          <div>
            <h3>{title}</h3>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function ConfirmActionModal({ action, working = false, onCancel, onConfirm }) {
  if (!action) return null;
  return (
    <div className="security-settings-modal-backdrop" role="presentation">
      <div className="security-settings-modal" role="dialog" aria-modal="true" aria-labelledby="security-action-title">
        <div className="security-settings-modal-head">
          <div className="security-settings-danger-icon"><AlertTriangle className="h-5 w-5" /></div>
          <button type="button" className="security-settings-icon-button" aria-label="Close confirmation" disabled={working} onClick={onCancel}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 id="security-action-title">{action.title}</h3>
        <p>{action.confirm}</p>
        <div className="security-settings-modal-actions">
          <button type="button" className="btn btn-secondary admin-compact-button" disabled={working} onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-danger admin-compact-button" disabled={working} onClick={onConfirm}>
            {working ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SecuritySettingsSection() {
  const { request, user, logout } = useAuth();
  const { push } = useToast();
  const [draft, setDraft] = useState(SECURITY_DRAFT_DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [actionWorking, setActionWorking] = useState(false);
  const [dangerExpanded, setDangerExpanded] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const {
    data: securityData,
    loading: securityLoading,
    error: securityError,
    reload: reloadSecurity
  } = useResource(() => request('/settings/security'), [request]);
  const {
    data: eventsData,
    error: eventsError,
    reload: reloadEvents
  } = useResource(() => request('/settings/security/events?limit=25'), [request]);

  const savedDraft = useMemo(() => draftFromSettings(securityData?.settings || {}), [securityData?.settings]);
  const lastUpdated = securityData?.settings?.updatedAt ? formatTime(securityData.settings.updatedAt) : NOT_AVAILABLE;
  const securityEvents = useMemo(() => getNestedLogs(eventsData).slice(0, 5), [eventsData]);
  const hasChanges = useMemo(() => stableJson(draft) !== stableJson(savedDraft), [draft, savedDraft]);
  const validationErrors = useMemo(() => {
    const errors = [];
    if (Number(draft.password.minimumLength) < 6) errors.push('Minimum password length must be at least 6.');
    if (Number(draft.login.failedLoginLimit) < 1) errors.push('Failed login limit must be at least 1.');
    if (Number(draft.login.lockoutMinutes) < 1) errors.push('Lockout duration must be at least 1 minute.');
    if (Number(draft.session.timeoutMinutes) < 5) errors.push('Session timeout must be at least 5 minutes.');
    if (![30, 90, 180, 365].includes(Number(draft.audit.retentionDays))) errors.push('Choose a valid audit retention period.');
    if (Number(draft.password.expiryDays) > 0 || Number(draft.password.reuseCount) > 0 || draft.session.logoutIdleSessions) errors.push(UNSUPPORTED_SAVE_MESSAGE);
    return errors;
  }, [draft]);

  useEffect(() => {
    if (!securityData?.settings) return;
    setDraft(draftFromSettings(securityData.settings));
  }, [securityData?.settings]);

  const healthItems = useMemo(() => {
    const passwordActive = Number(draft.password.minimumLength) >= 6;
    const loginActive = Number(draft.login.failedLoginLimit) > 0 && Number(draft.login.lockoutMinutes) > 0;
    const sessionActive = Number(draft.session.timeoutMinutes) >= 5;
    const auditActive = Boolean(draft.audit.enabled);
    const twoFactorActive = false;
    const activeCount = [passwordActive, loginActive, sessionActive, auditActive, twoFactorActive].filter(Boolean).length;
    const status = activeCount >= 4 ? 'Good - Estimated' : activeCount >= 2 ? 'Needs attention' : 'Critical';
    const statusTone = activeCount >= 4 ? 'healthy' : activeCount >= 2 ? 'warning' : 'danger';
    return [
      { key: 'password', icon: KeyRound, label: 'Password Policy', value: passwordActive ? 'Active' : 'Needs attention', tone: passwordActive ? 'healthy' : 'warning' },
      { key: 'login', icon: LockKeyhole, label: 'Login Protection', value: loginActive ? 'Active' : 'Needs attention', tone: loginActive ? 'healthy' : 'warning' },
      { key: 'session', icon: Monitor, label: 'Session Security', value: sessionActive ? 'Active' : 'Needs attention', tone: sessionActive ? 'healthy' : 'warning' },
      { key: 'audit', icon: FileText, label: 'Audit Trail', value: auditActive ? 'Active' : 'Disabled', tone: auditActive ? 'healthy' : 'danger' },
      { key: 'twoFactor', icon: ShieldAlert, label: 'Two-Factor Auth', value: 'Not configured', tone: 'warning' },
      { key: 'score', icon: Activity, label: 'Security Score', value: status, tone: statusTone }
    ];
  }, [draft]);

  const currentSession = useMemo(() => ({
    device: 'Current browser session',
    location: NOT_AVAILABLE,
    user: user?.name || user?.username || 'Current user',
    role: user?.role || 'Admin',
    lastActive: formatTime(user?.lastActiveAt || user?.lastLoginAt || user?.updatedAt)
  }), [user]);

  function updateDraft(group, key, value) {
    setDraft((current) => ({
      ...current,
      [group]: {
        ...current[group],
        [key]: value
      }
    }));
  }

  function notifyUnsupported() {
    push(UNSUPPORTED_SAVE_MESSAGE, 'info');
  }

  function handleToggle(group, key, value) {
    updateDraft(group, key, value);
  }

  function exportSecuritySettings() {
    downloadJson('security-settings.json', {
      exportedAt: new Date().toISOString(),
      settings: settingsFromDraft(draft)
    });
    push('Security settings exported.', 'info');
  }

  async function cancelChanges() {
    setDraft(savedDraft);
    push('Security changes cancelled.', 'info');
  }

  async function saveSecuritySettings() {
    if (validationErrors.length) {
      push(validationErrors[0] || 'Please fix validation errors before saving.', 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await request('/settings/security', {
        method: 'PUT',
        body: JSON.stringify({ settings: settingsFromDraft(draft) })
      });
      push(result.message || 'Security settings saved');
      await reloadSecurity({ silent: true });
      await reloadEvents({ silent: true });
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setSaving(false);
    }
  }

  async function confirmDangerAction() {
    if (!confirmAction) return;
    setActionWorking(true);
    try {
      const result = await request(confirmAction.endpoint, { method: 'POST', body: JSON.stringify({}) });
      push(result.message || `${confirmAction.title} completed`);
      setConfirmAction(null);
      await reloadSecurity({ silent: true }).catch(() => {});
      await reloadEvents({ silent: true }).catch(() => {});
      if (confirmAction.logsOutCurrentUser) {
        logout();
      }
    } catch (err) {
      push(err.message, 'error');
    } finally {
      setActionWorking(false);
    }
  }

  return (
    <div className="security-settings" data-security-settings-root>
      <section className="security-settings-hero">
        <div className="security-settings-hero-copy">
          <span className="security-settings-eyebrow"><ShieldCheck className="h-4 w-4" /> Security Control Center</span>
          <h2>Security</h2>
          <p>Manage security policies, access controls, sessions, and audit settings.</p>
        </div>
        <div className="security-settings-hero-actions">
          <button type="button" className="btn btn-secondary admin-compact-button" onClick={exportSecuritySettings}>
            <Download className="h-4 w-4" />
            Export Settings
          </button>
          <Link className="btn btn-secondary admin-compact-button" to="/admin/audit-logs">
            <Eye className="h-4 w-4" />
            View Audit Logs
          </Link>
          <span className="security-settings-last-updated"><CalendarClock className="h-4 w-4" /> Last updated: {lastUpdated}</span>
        </div>
      </section>

      {securityLoading ? <InfoStrip>Loading security settings...</InfoStrip> : null}
      {securityError ? <InfoStrip tone="danger" icon={AlertTriangle}>{securityError}</InfoStrip> : null}

      <section className="security-health-summary">
        <div className="security-settings-panel-head">
          <div className="security-settings-panel-title">
            <span className="security-settings-card-icon"><Activity className="h-4 w-4" /></span>
            <div>
              <h3>Security Health Summary</h3>
              <p>Only real platform safeguards are marked active. Unsupported items stay read-only.</p>
            </div>
          </div>
        </div>
        <div className="security-health-grid">
          {healthItems.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.key} className="security-health-card">
                <span className="security-health-icon"><Icon className="h-4 w-4" /></span>
                <div>
                  <p>{item.label}</p>
                  <SecurityBadge tone={item.tone}>{item.value}</SecurityBadge>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="security-settings-grid">
        <SecurityPanel icon={KeyRound} title="Password Policy" subtitle="Requirements enforced for admin, staff, and technician password changes.">
          <div className="security-settings-field-grid">
            <SecurityNumberField label="Minimum password length" value={draft.password.minimumLength} min={6} suffix="chars" onChange={(value) => updateDraft('password', 'minimumLength', value)} />
            <SecurityNumberField label="Password expiry days" value={draft.password.expiryDays} min={0} suffix="days" disabled badge={<SecurityBadge tone="warning">Not supported</SecurityBadge>} onDisabledClick={notifyUnsupported} onChange={(value) => updateDraft('password', 'expiryDays', value)} />
            <SecurityNumberField label="Prevent password reuse" value={draft.password.reuseCount} min={0} suffix="previous" disabled badge={<SecurityBadge tone="warning">Not supported</SecurityBadge>} onDisabledClick={notifyUnsupported} onChange={(value) => updateDraft('password', 'reuseCount', value)} />
          </div>
          <div className="security-settings-list">
            <SecurityToggle label="Require uppercase letters" checked={draft.password.requireUppercase} onChange={(value) => handleToggle('password', 'requireUppercase', value)} />
            <SecurityToggle label="Require numbers" checked={draft.password.requireNumbers} onChange={(value) => handleToggle('password', 'requireNumbers', value)} />
            <SecurityToggle label="Require special characters" checked={draft.password.requireSpecial} onChange={(value) => handleToggle('password', 'requireSpecial', value)} />
          </div>
          <InfoStrip>Saved password rules are enforced on password update, user creation, and password reset.</InfoStrip>
        </SecurityPanel>

        <SecurityPanel icon={LockKeyhole} title="Login Security" subtitle="Control failed-login protection and administrator login alerts.">
          <div className="security-settings-field-grid">
            <SecurityNumberField label="Failed login limit" value={draft.login.failedLoginLimit} min={1} suffix="attempts" onChange={(value) => updateDraft('login', 'failedLoginLimit', value)} />
            <SecurityNumberField label="Lockout duration" value={draft.login.lockoutMinutes} min={1} suffix="minutes" onChange={(value) => updateDraft('login', 'lockoutMinutes', value)} />
          </div>
          <div className="security-settings-list">
            <SecurityReadOnlyRow label="Two-factor authentication" value="Not configured" badge={<SecurityBadge tone="warning">Planned</SecurityBadge>} />
            <SecurityToggle label="Admin login alerts" checked={draft.login.adminLoginAlerts} onChange={(value) => handleToggle('login', 'adminLoginAlerts', value)} />
            <SecurityReadOnlyRow label="Remembered devices" value="Not supported" badge={<SecurityBadge tone="warning">Disabled</SecurityBadge>} />
          </div>
          <InfoStrip>Failed login lockout is enforced per user account and audited.</InfoStrip>
        </SecurityPanel>

        <SecurityPanel icon={Monitor} title="Session Handling" subtitle="Session timeout and token invalidation without exposing secrets.">
          <div className="security-settings-field-grid">
            <SecurityNumberField label="Session timeout" value={draft.session.timeoutMinutes} min={5} suffix="minutes" onChange={(value) => updateDraft('session', 'timeoutMinutes', value)} />
          </div>
          <div className="security-settings-list">
            <SecurityReadOnlyRow label="Logout idle sessions" value="Not supported" badge={<SecurityBadge tone="warning">Disabled</SecurityBadge>} />
            <SecurityReadOnlyRow label="Full active-session tracking" value="Not available" badge={<SecurityBadge tone="warning">Disabled</SecurityBadge>} />
          </div>
          <div className="security-settings-session-card">
            <div>
              <strong>{currentSession.device}</strong>
              <p>{currentSession.user} - {currentSession.role}</p>
            </div>
            <SecurityBadge tone="healthy">Current session</SecurityBadge>
            <dl>
              <div><dt>Location</dt><dd>{currentSession.location}</dd></div>
              <div><dt>Last active</dt><dd>{currentSession.lastActive}</dd></div>
            </dl>
          </div>
          <InfoStrip>Full active-session management requires a session table; token reset actions are supported.</InfoStrip>
        </SecurityPanel>

        <SecurityPanel
          icon={FileText}
          title="Audit Trail"
          subtitle="Control real audit writing and retention."
          action={<Link className="security-settings-quiet-link" to="/admin/audit-logs">Open logs</Link>}
        >
          <div className="security-settings-list">
            <SecurityToggle label="Audit logging enabled" checked={draft.audit.enabled} onChange={(value) => handleToggle('audit', 'enabled', value)} />
            <SecurityToggle label="Log admin activities" checked={draft.audit.logAdminActivities} onChange={(value) => handleToggle('audit', 'logAdminActivities', value)} />
            <SecurityToggle label="Log data changes" checked={draft.audit.logDataChanges} onChange={(value) => handleToggle('audit', 'logDataChanges', value)} />
            <SecurityToggle label="Log security events" checked={draft.audit.logSecurityEvents} onChange={(value) => handleToggle('audit', 'logSecurityEvents', value)} />
          </div>
          <SecuritySelectField
            label="Retention period"
            value={draft.audit.retentionDays}
            options={[
              { value: 30, label: '30 days' },
              { value: 90, label: '90 days' },
              { value: 180, label: '180 days' },
              { value: 365, label: '365 days' }
            ]}
            onChange={(value) => updateDraft('audit', 'retentionDays', value)}
          />
          <div className="security-settings-card-actions">
            <Link className="btn btn-secondary admin-compact-button" to="/admin/audit-logs">
              <Eye className="h-4 w-4" />
              View Audit Logs
            </Link>
            <button type="button" className="btn btn-secondary admin-compact-button" onClick={() => push('Use Audit Logs export from the audit page when available.', 'info')}>
              <Download className="h-4 w-4" />
              Export Logs
            </button>
          </div>
        </SecurityPanel>

        <SecurityPanel icon={Bell} title="Recent Security Events" subtitle="Latest real audit records related to auth, access, backup, or settings.">
          {eventsError ? (
            <div className="security-settings-empty-state">
              <AlertTriangle className="h-5 w-5" />
              <strong>Audit events unavailable.</strong>
              <p>{eventsError}</p>
            </div>
          ) : securityEvents.length ? (
            <div className="security-events-list">
              {securityEvents.map((log) => (
                <article key={log.id || log._id || `${log.action}-${log.createdAt}`} className="security-event-row">
                  <span><Activity className="h-4 w-4" /></span>
                  <div>
                    <strong>{logTitle(log)}</strong>
                    <p>{logUserLabel(log)} - {formatTime(log.createdAt)}</p>
                  </div>
                  <SecurityBadge tone={severityForLog(log).toLowerCase().includes('warning') ? 'warning' : 'neutral'}>{severityForLog(log)}</SecurityBadge>
                </article>
              ))}
            </div>
          ) : (
            <div className="security-settings-empty-state">
              <Info className="h-5 w-5" />
              <strong>No recent security events found.</strong>
            </div>
          )}
        </SecurityPanel>

        <SecurityPanel
          icon={ShieldAlert}
          title="Danger Zone - 3 sensitive actions"
          subtitle="Security actions call real protected backend endpoints."
          className="security-danger-zone"
          action={(
            <button type="button" className="security-danger-collapse-button" onClick={() => setDangerExpanded((current) => !current)}>
              {dangerExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {dangerExpanded ? 'Collapse' : 'Expand'}
            </button>
          )}
        >
          {dangerExpanded ? (
            <>
              <InfoStrip tone="danger">Danger actions require confirmation and show success only after the backend responds.</InfoStrip>
              <div className="security-danger-list">
                {dangerActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button key={action.key} type="button" className="security-danger-action" disabled={actionWorking} onClick={() => setConfirmAction(action)}>
                      <span className="security-settings-danger-icon"><Icon className="h-4 w-4" /></span>
                      <span>
                        <strong>{action.title}</strong>
                        <small>{action.helper}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <InfoStrip tone="danger">Collapsed for safety. Expand only when a sensitive security action is needed.</InfoStrip>
          )}
        </SecurityPanel>
      </div>

      <div className="security-settings-footer-strip">
        <span><CheckCircle2 className="h-4 w-4" /> Login lockout, password policy, session reset, and audit settings are backed by protected APIs.</span>
        <button type="button" onClick={() => reloadSecurity({ silent: true })}>Refresh security state</button>
      </div>

      {hasChanges ? (
        <div className="security-save-bar">
          <div>
            <strong>Unsaved security changes</strong>
            <span>{validationErrors[0] || 'Save to apply these security settings to backend enforcement.'}</span>
          </div>
          <div className="security-save-bar-actions">
            <button type="button" className="btn btn-secondary admin-compact-button" disabled={saving} onClick={cancelChanges}>
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button type="button" className="btn btn-primary admin-compact-button" disabled={validationErrors.length > 0 || saving} onClick={saveSecuritySettings}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Security Settings
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmActionModal action={confirmAction} working={actionWorking} onCancel={() => !actionWorking && setConfirmAction(null)} onConfirm={confirmDangerAction} />
    </div>
  );
}
