import { useMemo, useState } from 'react';
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

const BACKEND_SUPPORT_MESSAGE = 'Backend support required before this setting can be saved.';
const MISSING_ACTION_MESSAGE = 'This action will be available after backend integration.';
const DANGER_ACTION_MESSAGE = 'This action requires backend integration.';
const NOT_AVAILABLE = 'Not available';

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

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
    twoFactorEnabled: false,
    adminLoginAlerts: true,
    rememberedDevices: false
  },
  session: {
    timeoutMinutes: 480,
    logoutIdleSessions: false,
    rememberDeviceThirtyDays: false,
    logoutOtherSessionsOnLogin: false
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
    icon: LogOut,
    title: 'Logout all users',
    helper: 'End active sessions when backend session tracking is available.',
    confirm: 'This will log out all active users except your current session if supported. Continue?'
  },
  {
    key: 'resetSessions',
    icon: RotateCcw,
    title: 'Reset all sessions',
    helper: 'Invalidate active sessions across the workspace.',
    confirm: 'This will invalidate active sessions and users may need to log in again. Continue?'
  },
  {
    key: 'forcePasswordReset',
    icon: ShieldAlert,
    title: 'Force password reset for staff',
    helper: 'Require staff to set a new password on next login.',
    confirm: 'All staff will be required to set a new password on next login. Continue?'
  }
];

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

function getNestedLogs(data) {
  if (!data) return [];
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

function isSecurityEvent(log = {}) {
  const text = `${log.action || ''} ${log.module || ''} ${log.title || ''} ${log.message || ''}`.toLowerCase();
  return ['auth', 'login', 'logout', 'password', 'permission', 'role', 'security', 'session', 'backup', 'restore', 'settings'].some((word) => text.includes(word));
}

function severityForLog(log = {}) {
  if (log.severity) return String(log.severity);
  const text = `${log.action || ''} ${log.title || ''} ${log.message || ''}`.toLowerCase();
  if (/(failed|denied|blocked|reset|delete|restore)/.test(text)) return 'warning';
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

function ConfirmActionModal({ action, onCancel, onConfirm }) {
  if (!action) return null;
  return (
    <div className="security-settings-modal-backdrop" role="presentation">
      <div className="security-settings-modal" role="dialog" aria-modal="true" aria-labelledby="security-action-title">
        <div className="security-settings-modal-head">
          <div className="security-settings-danger-icon"><AlertTriangle className="h-5 w-5" /></div>
          <button type="button" className="security-settings-icon-button" aria-label="Close confirmation" onClick={onCancel}>
            <X className="h-4 w-4" />
          </button>
        </div>
        <h3 id="security-action-title">{action.title}</h3>
        <p>{action.confirm}</p>
        <div className="security-settings-modal-actions">
          <button type="button" className="btn btn-secondary admin-compact-button" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-danger admin-compact-button" onClick={onConfirm}>Continue</button>
        </div>
      </div>
    </div>
  );
}

export default function SecuritySettingsSection() {
  const { request, user } = useAuth();
  const { push } = useToast();
  const [draft, setDraft] = useState(SECURITY_DRAFT_DEFAULTS);
  const [dangerExpanded, setDangerExpanded] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const lastUpdated = useMemo(
    () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    []
  );
  const { data: auditData, error: auditError } = useResource(() => request('/audit-logs?page=1&limit=25'), [request]);

  const securityEvents = useMemo(() => getNestedLogs(auditData).filter(isSecurityEvent).slice(0, 5), [auditData]);
  const hasChanges = useMemo(() => stableJson(draft) !== stableJson(SECURITY_DRAFT_DEFAULTS), [draft]);
  const validationErrors = useMemo(() => {
    const errors = [];
    if (Number(draft.password.minimumLength) < 6) errors.push('Minimum password length must be at least 6.');
    if (Number(draft.login.failedLoginLimit) < 1) errors.push('Failed login limit must be at least 1.');
    if (Number(draft.login.lockoutMinutes) < 1) errors.push('Lockout duration must be at least 1 minute.');
    if (Number(draft.session.timeoutMinutes) < 5) errors.push('Session timeout must be at least 5 minutes.');
    if (![30, 90, 180].includes(Number(draft.audit.retentionDays))) errors.push('Choose a valid audit retention period.');
    return errors;
  }, [draft]);

  const healthItems = useMemo(() => {
    const baseItems = [
      {
        key: 'password',
        icon: KeyRound,
        label: 'Password Policy',
        value: 'Active',
        tone: 'healthy',
        score: 1
      },
      {
        key: 'login',
        icon: LockKeyhole,
        label: 'Login Protection',
        value: 'Partial',
        tone: 'warning',
        score: 0.75
      },
      {
        key: 'session',
        icon: Monitor,
        label: 'Session Security',
        value: 'Active',
        tone: 'healthy',
        score: 1
      },
      {
        key: 'audit',
        icon: FileText,
        label: 'Audit Trail',
        value: 'Active',
        tone: 'healthy',
        score: 1
      },
      {
        key: 'twoFactor',
        icon: ShieldAlert,
        label: 'Two-Factor Auth',
        value: 'Coming Soon',
        tone: 'warning',
        score: 0
      }
    ];
    const score = Math.round((baseItems.reduce((sum, item) => sum + item.score, 0) / baseItems.length) * 100);
    return [
      ...baseItems,
      {
        key: 'score',
        icon: Activity,
        label: 'Security Score',
        value: `${score}% Good - Estimated`,
        tone: score >= 80 ? 'healthy' : score >= 60 ? 'warning' : 'danger'
      }
    ];
  }, []);

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

  function notifyBackendRequired() {
    push(BACKEND_SUPPORT_MESSAGE, 'info');
  }

  function handleToggle(group, key, value) {
    updateDraft(group, key, value);
  }

  function exportSecuritySettings() {
    downloadJson('security-settings-draft.json', {
      exportedAt: new Date().toISOString(),
      note: 'UI-ready security settings draft. Persistence requires backend support.',
      settings: draft
    });
    push('Security settings draft exported.', 'info');
  }

  function confirmDangerAction() {
    setConfirmAction(null);
    push(DANGER_ACTION_MESSAGE, 'info');
  }

  function cancelChanges() {
    setDraft(SECURITY_DRAFT_DEFAULTS);
    push('Security changes cancelled.', 'info');
  }

  function saveSecuritySettings() {
    if (validationErrors.length) {
      push('Please fix validation errors before saving.', 'error');
      return;
    }
    push(BACKEND_SUPPORT_MESSAGE, 'info');
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
          <span className="security-settings-last-updated"><CalendarClock className="h-4 w-4" /> Last updated: Today, {lastUpdated}</span>
        </div>
      </section>

      <section className="security-health-summary">
        <div className="security-settings-panel-head">
          <div className="security-settings-panel-title">
            <span className="security-settings-card-icon"><Activity className="h-4 w-4" /></span>
            <div>
              <h3>Security Health Summary</h3>
              <p>Only real platform safeguards are marked active. Unsupported items stay flagged.</p>
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
        <SecurityPanel icon={KeyRound} title="Password Policy" subtitle="Shape password requirements for staff accounts.">
          <div className="security-settings-field-grid">
            <SecurityNumberField label="Minimum password length" value={draft.password.minimumLength} min={6} suffix="chars" onChange={(value) => updateDraft('password', 'minimumLength', value)} />
            <SecurityNumberField label="Password expiry days" value={draft.password.expiryDays} min={0} suffix="days" disabled badge={<SecurityBadge tone="warning">Backend required</SecurityBadge>} onDisabledClick={notifyBackendRequired} onChange={(value) => updateDraft('password', 'expiryDays', value)} />
            <SecurityNumberField label="Prevent password reuse" value={draft.password.reuseCount} min={0} suffix="previous" disabled badge={<SecurityBadge tone="warning">Backend required</SecurityBadge>} onDisabledClick={notifyBackendRequired} onChange={(value) => updateDraft('password', 'reuseCount', value)} />
          </div>
          <div className="security-settings-list">
            <SecurityToggle label="Require uppercase letters" checked={draft.password.requireUppercase} disabled badge={<SecurityBadge tone="warning">Backend required</SecurityBadge>} onDisabledClick={notifyBackendRequired} onChange={(value) => handleToggle('password', 'requireUppercase', value)} />
            <SecurityToggle label="Require numbers" checked={draft.password.requireNumbers} disabled badge={<SecurityBadge tone="warning">Backend required</SecurityBadge>} onDisabledClick={notifyBackendRequired} onChange={(value) => handleToggle('password', 'requireNumbers', value)} />
            <SecurityToggle label="Require special characters" checked={draft.password.requireSpecial} disabled badge={<SecurityBadge tone="warning">Backend required</SecurityBadge>} onDisabledClick={notifyBackendRequired} onChange={(value) => handleToggle('password', 'requireSpecial', value)} />
          </div>
          <InfoStrip>Advanced password rules require backend support.</InfoStrip>
        </SecurityPanel>

        <SecurityPanel icon={LockKeyhole} title="Login Security" subtitle="Control failed-login protection and future login alerts.">
          <div className="security-settings-field-grid">
            <SecurityNumberField label="Failed login limit" value={draft.login.failedLoginLimit} min={1} suffix="attempts" onChange={(value) => updateDraft('login', 'failedLoginLimit', value)} />
            <SecurityNumberField label="Lockout duration" value={draft.login.lockoutMinutes} min={1} suffix="minutes" onChange={(value) => updateDraft('login', 'lockoutMinutes', value)} />
          </div>
          <div className="security-settings-list">
            <SecurityToggle label="Two-factor authentication" checked={draft.login.twoFactorEnabled} disabled badge={<SecurityBadge tone="warning">Coming soon</SecurityBadge>} onDisabledClick={notifyBackendRequired} onChange={() => {}} />
            <SecurityToggle label="Admin login alerts" checked={draft.login.adminLoginAlerts} onChange={(value) => handleToggle('login', 'adminLoginAlerts', value)} />
            <SecurityToggle label="Allow remembered devices" checked={draft.login.rememberedDevices} disabled badge={<SecurityBadge tone="warning">Backend required</SecurityBadge>} onDisabledClick={notifyBackendRequired} onChange={(value) => handleToggle('login', 'rememberedDevices', value)} />
          </div>
          <InfoStrip tone="warning">Two-factor authentication and remembered-device enforcement require backend support.</InfoStrip>
        </SecurityPanel>

        <SecurityPanel icon={Monitor} title="Session Handling" subtitle="Preview session controls without exposing tokens or secrets.">
          <div className="security-settings-field-grid">
            <SecurityNumberField label="Session timeout" value={draft.session.timeoutMinutes} min={5} suffix="minutes" disabled badge={<SecurityBadge tone="warning">Backend required</SecurityBadge>} onDisabledClick={notifyBackendRequired} onChange={(value) => updateDraft('session', 'timeoutMinutes', value)} />
          </div>
          <div className="security-settings-list">
            <SecurityToggle label="Logout idle sessions" checked={draft.session.logoutIdleSessions} disabled badge={<SecurityBadge tone="warning">Backend required</SecurityBadge>} onDisabledClick={notifyBackendRequired} onChange={(value) => handleToggle('session', 'logoutIdleSessions', value)} />
            <SecurityToggle label="Remember device for 30 days" checked={draft.session.rememberDeviceThirtyDays} disabled badge={<SecurityBadge tone="warning">Backend required</SecurityBadge>} onDisabledClick={notifyBackendRequired} onChange={(value) => handleToggle('session', 'rememberDeviceThirtyDays', value)} />
            <SecurityToggle label="Logout all other sessions on login" checked={draft.session.logoutOtherSessionsOnLogin} disabled badge={<SecurityBadge tone="warning">Backend required</SecurityBadge>} onDisabledClick={notifyBackendRequired} onChange={(value) => handleToggle('session', 'logoutOtherSessionsOnLogin', value)} />
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
          <InfoStrip>Full active-session management requires backend session tracking.</InfoStrip>
        </SecurityPanel>

        <SecurityPanel
          icon={FileText}
          title="Audit Trail"
          subtitle="Keep a visible audit policy surface for admin activity."
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
              { value: 180, label: '180 days' }
            ]}
            onChange={(value) => updateDraft('audit', 'retentionDays', value)}
          />
          <div className="security-settings-card-actions">
            <Link className="btn btn-secondary admin-compact-button" to="/admin/audit-logs">
              <Eye className="h-4 w-4" />
              View Audit Logs
            </Link>
            <button type="button" className="btn btn-secondary admin-compact-button" onClick={() => push(MISSING_ACTION_MESSAGE, 'info')}>
              <Download className="h-4 w-4" />
              Export Logs
            </button>
          </div>
        </SecurityPanel>

        <SecurityPanel icon={Bell} title="Recent Security Events" subtitle="Latest real audit records related to auth, access, backup, or settings.">
          {auditError ? (
            <div className="security-settings-empty-state">
              <AlertTriangle className="h-5 w-5" />
              <strong>Audit events unavailable.</strong>
              <p>{auditError}</p>
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
              <p>Security-related audit events will appear here when available.</p>
            </div>
          )}
        </SecurityPanel>

        <SecurityPanel
          icon={ShieldAlert}
          title="Danger Zone — 3 sensitive actions"
          subtitle="Security Actions stay confirmation-first."
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
              <InfoStrip tone="danger">Danger actions require backend integration and confirmation before execution.</InfoStrip>
              <div className="security-danger-list">
                {dangerActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button key={action.key} type="button" className="security-danger-action" onClick={() => setConfirmAction(action)}>
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
        <span><CheckCircle2 className="h-4 w-4" /> Existing login, role redirects, technician access, and audit routes are unchanged.</span>
        <button type="button" onClick={notifyBackendRequired}>Backend support required</button>
      </div>

      {hasChanges ? (
        <div className="security-save-bar">
          <div>
            <strong>Unsaved security changes</strong>
            <span>{validationErrors[0] || 'Backend support is required before these settings can be persisted.'}</span>
          </div>
          <div className="security-save-bar-actions">
            <button type="button" className="btn btn-secondary admin-compact-button" onClick={cancelChanges}>
              <X className="h-4 w-4" />
              Cancel
            </button>
            <button type="button" className="btn btn-primary admin-compact-button" disabled={validationErrors.length > 0} onClick={saveSecuritySettings}>
              <Save className="h-4 w-4" />
              Save Security Settings
            </button>
          </div>
        </div>
      ) : null}

      <ConfirmActionModal action={confirmAction} onCancel={() => setConfirmAction(null)} onConfirm={confirmDangerAction} />
    </div>
  );
}
