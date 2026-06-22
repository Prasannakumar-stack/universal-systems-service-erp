import { useEffect, useMemo, useState } from 'react';
import {
  Accessibility,
  AlertTriangle,
  BarChart3,
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  Globe2,
  Languages,
  LayoutDashboard,
  Loader2,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  Save,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  X
} from 'lucide-react';
import { ErrorBlock, LoadingBlock, useAuth, useResource, useToast } from '../../shared/phase1Shared.jsx';
import { can, hasRole } from '../../utils/roles.js';
import { themePreferenceOptions } from '../../utils/theme.js';

const PLACEHOLDER_MESSAGE = 'This preference will be available after backend integration.';

const ADMIN_PREFERENCES_DEFAULTS = {
  defaultNotifications: true,
  dashboardFocus: true,
  pdfDocuments: true,
  languageRegion: {
    language: 'English',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12-hour',
    currency: 'INR',
    timezone: 'Asia/Kolkata'
  },
  notifications: {
    jobUpdates: { inApp: true, email: false },
    paymentAlerts: { inApp: true, email: true },
    amcReminders: { inApp: true, email: true },
    partApprovals: { inApp: true, email: false },
    inventoryAlerts: { inApp: true, email: false },
    quietHours: { start: '22:00', end: '07:00' }
  },
  dashboard: {
    revenueSummary: true,
    technicianWorkload: true,
    recentActivityFeed: true,
    pendingApprovals: true,
    compactMode: false
  },
  documents: {
    defaultPdfLanguage: 'English',
    showCompanyLogo: true,
    showGstDetails: true,
    showSignatureSection: true,
    invoiceFooterNote: 'Thank you for choosing Universal Systems.'
  },
  accessibility: {
    reduceAnimations: false,
    compactMode: false,
    largerText: false,
    highContrastMode: false,
    focusOutline: true
  }
};

const languageOptions = ['English'];
const dateFormatOptions = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const timeFormatOptions = ['12-hour', '24-hour'];
const currencyOptions = [{ value: 'INR', label: 'INR \u20b9' }];
const timezoneOptions = [{ value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' }];
const pdfLanguageOptions = ['English'];

const notificationRows = [
  { key: 'jobUpdates', label: 'Job updates & status changes' },
  { key: 'paymentAlerts', label: 'Payment received / overdue alerts' },
  { key: 'amcReminders', label: 'AMC reminders & expirations' },
  { key: 'partApprovals', label: 'Part approval & requests' },
  { key: 'inventoryAlerts', label: 'Low stock & inventory alerts' }
];

const dashboardRows = [
  { key: 'revenueSummary', label: 'Show revenue summary cards', helper: 'Surface billing, collections, and overdue signals on the admin dashboard.' },
  { key: 'technicianWorkload', label: 'Show technician workload', helper: 'Highlight assignment pressure, open jobs, and daily field capacity.' },
  { key: 'recentActivityFeed', label: 'Show recent activity feed', helper: 'Keep recent operational updates visible for faster follow-up.' },
  { key: 'pendingApprovals', label: 'Show pending approvals', helper: 'Prioritize quotations, parts, and payment decisions needing admin review.' },
  { key: 'compactMode', label: 'Compact dashboard mode', helper: 'Use denser dashboard panels for repeated operational scanning.' }
];

const documentRows = [
  { key: 'showCompanyLogo', label: 'Show company logo on PDFs' },
  { key: 'showGstDetails', label: 'Show GST details in documents' },
  { key: 'showSignatureSection', label: 'Show signature section' }
];

const accessibilityRows = [
  { key: 'reduceAnimations', label: 'Reduce animations' },
  { key: 'compactMode', label: 'Compact mode' },
  { key: 'largerText', label: 'Larger text' },
  { key: 'highContrastMode', label: 'High contrast mode' },
  { key: 'focusOutline', label: 'Focus outline / highlight focused elements' }
];

function clonePlain(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function deepMerge(defaults, saved) {
  const next = clonePlain(defaults);
  if (!saved || typeof saved !== 'object') return next;
  Object.entries(saved).forEach(([key, value]) => {
    if (value && typeof value === 'object' && !Array.isArray(value) && next[key] && typeof next[key] === 'object' && !Array.isArray(next[key])) {
      next[key] = deepMerge(next[key], value);
    } else {
      next[key] = value;
    }
  });
  return next;
}

function setPathValue(current, path, value) {
  const next = clonePlain(current);
  const keys = path.split('.');
  let cursor = next;
  keys.slice(0, -1).forEach((key) => {
    cursor[key] = cursor[key] && typeof cursor[key] === 'object' ? cursor[key] : {};
    cursor = cursor[key];
  });
  cursor[keys.at(-1)] = value;
  return next;
}

function normalizePreferences(saved = {}) {
  const merged = deepMerge(ADMIN_PREFERENCES_DEFAULTS, saved);
  if (typeof saved.defaultNotifications === 'boolean') {
    notificationRows.forEach((row) => {
      merged.notifications[row.key] = merged.notifications[row.key] || {};
      if (!saved.defaultNotifications) {
        merged.notifications[row.key].inApp = false;
        merged.notifications[row.key].email = false;
      }
    });
  }
  if (typeof saved.dashboardFocus === 'boolean' && !saved.dashboard) {
    merged.dashboard.revenueSummary = saved.dashboardFocus;
    merged.dashboard.technicianWorkload = saved.dashboardFocus;
    merged.dashboard.recentActivityFeed = saved.dashboardFocus;
    merged.dashboard.pendingApprovals = saved.dashboardFocus;
  }
  if (typeof saved.pdfDocuments === 'boolean' && !saved.documents) {
    merged.documents.showCompanyLogo = saved.pdfDocuments;
    merged.documents.showGstDetails = saved.pdfDocuments;
    merged.documents.showSignatureSection = saved.pdfDocuments;
  }
  merged.defaultNotifications = notificationRows.some((row) => merged.notifications[row.key]?.inApp || merged.notifications[row.key]?.email);
  merged.dashboardFocus = Object.entries(merged.dashboard).some(([key, value]) => key !== 'compactMode' && Boolean(value));
  merged.pdfDocuments = documentRows.some((row) => Boolean(merged.documents[row.key]));
  return merged;
}

function preferenceLabel(value) {
  return themePreferenceOptions.find((option) => option.value === value)?.label || 'System Default';
}

function ToggleSwitch({ checked, disabled = false, onChange, label }) {
  return (
    <button
      type="button"
      className={`admin-preferences-toggle ${checked ? 'is-on' : 'is-off'}`}
      disabled={disabled}
      role="switch"
      aria-checked={Boolean(checked)}
      aria-label={label}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

function SelectField({ label, value, options, disabled, onChange }) {
  return (
    <label className="admin-preferences-field">
      <span>{label}</span>
      <select value={value || ''} disabled={disabled} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => {
          const valueProp = typeof option === 'string' ? option : option.value;
          const labelProp = typeof option === 'string' ? option : option.label;
          return <option key={valueProp} value={valueProp}>{labelProp}</option>;
        })}
      </select>
    </label>
  );
}

function PreferencesCard({ icon: Icon, title, description, children, className = '' }) {
  return (
    <section className={`surface admin-control-card admin-preferences-card ${className}`}>
      <div className="admin-preferences-card-head">
        <div className="admin-preferences-card-icon"><Icon className="h-5 w-5" /></div>
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function ThemePreviewCard({ option, selected, resolvedTheme, onSelect, disabled }) {
  const Icon = option.value === 'light' ? Sun : option.value === 'dark' ? Moon : Monitor;
  return (
    <button type="button" className={`admin-preferences-theme-card theme-${option.value} ${selected ? 'is-selected' : ''}`} disabled={disabled} onClick={() => onSelect(option.value)}>
      <span className="admin-preferences-theme-top">
        <span><Icon className="h-4 w-4" />{option.label}</span>
        {selected ? <CheckCircle2 className="h-4 w-4" /> : null}
      </span>
      <span className="admin-preferences-theme-preview">
        <i />
        <b />
        <em />
      </span>
      <small>{option.value === 'system' ? `Follows device, currently ${resolvedTheme}` : `Admin panel ${option.label.toLowerCase()} mode`}</small>
    </button>
  );
}

function ResetConfirmModal({ saving, onCancel, onConfirm }) {
  return (
    <div className="admin-preferences-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="admin-preferences-reset-title">
      <section className="surface admin-modal admin-preferences-modal">
        <div className="admin-preferences-modal-head">
          <div>
            <p>Reset preferences</p>
            <h3 id="admin-preferences-reset-title">Reset Admin Preferences to defaults?</h3>
          </div>
          <button type="button" className="icon-button h-9 w-9" aria-label="Close reset confirmation" disabled={saving} onClick={onCancel}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="admin-preferences-modal-copy">This will prepare the default admin preferences. Save Changes is still required before backend preferences are updated.</p>
        <div className="admin-preferences-modal-actions">
          <button type="button" className="btn btn-secondary" disabled={saving} onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-primary" disabled={saving} onClick={onConfirm}>
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </button>
        </div>
      </section>
    </div>
  );
}

export default function AdminPreferencesSection({ themePreference, resolvedTheme, onThemeChange, onDirtyChange = null }) {
  const { request, user } = useAuth();
  const { push } = useToast();
  const canEdit = hasRole(user, 'admin') && can(user, 'edit_settings');
  const { data, loading, error, reload } = useResource(() => request('/settings/business'), [request]);
  const savedPreferences = useMemo(() => normalizePreferences(data?.settings?.preferences || {}), [data?.settings?.preferences]);
  const savedJson = stableJson(savedPreferences);
  const [form, setForm] = useState(savedPreferences);
  const [saving, setSaving] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const dirty = stableJson(form) !== savedJson;
  const notificationsEnabled = notificationRows.some((row) => form.notifications?.[row.key]?.inApp || form.notifications?.[row.key]?.email);
  const dashboardMode = form.dashboard?.compactMode ? 'Compact' : 'Standard';

  useEffect(() => {
    setForm(clonePlain(savedPreferences));
  }, [savedJson]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  function setPath(path, value) {
    setForm((current) => {
      const next = setPathValue(current, path, value);
      next.defaultNotifications = notificationRows.some((row) => next.notifications?.[row.key]?.inApp || next.notifications?.[row.key]?.email);
      next.dashboardFocus = Object.entries(next.dashboard || {}).some(([key, itemValue]) => key !== 'compactMode' && Boolean(itemValue));
      next.pdfDocuments = documentRows.some((row) => Boolean(next.documents?.[row.key]));
      return next;
    });
  }

  function placeholderToast() {
    push(PLACEHOLDER_MESSAGE, 'info');
  }

  async function save(event) {
    event.preventDefault();
    if (!canEdit) {
      push('You do not have permission to save admin preferences.', 'error');
      return;
    }
    setSaving(true);
    try {
      await request('/settings/business/preferences', {
        method: 'PATCH',
        body: JSON.stringify(form)
      });
      push('Admin preferences saved successfully');
      await reload({ silent: true });
    } catch (err) {
      push(err.message || 'Failed to save admin preferences', 'error');
    } finally {
      setSaving(false);
    }
  }

  function resetToDefaults() {
    setForm(clonePlain(ADMIN_PREFERENCES_DEFAULTS));
    setResetOpen(false);
    push('Default preferences prepared. Save changes to apply.');
  }

  if (loading) return <LoadingBlock />;
  if (error) return <ErrorBlock message={error} />;

  return (
    <form className="admin-preferences" data-admin-preferences-root onSubmit={save}>
      <section className="surface admin-control-card admin-preferences-hero">
        <div className="admin-preferences-hero-copy">
          <div className="admin-preferences-eyebrow"><ShieldCheck className="h-4 w-4" /> Admin Control</div>
          <h2>Admin Preferences</h2>
          <p>Manage how the admin panel looks, behaves, and communicates.</p>
        </div>
        <div className="admin-preferences-actions">
          <button type="button" className="btn btn-secondary admin-compact-button" disabled={saving} onClick={() => setResetOpen(true)}>
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </button>
          <button type="submit" className={`btn btn-primary admin-compact-button admin-preferences-save-button ${dirty ? 'is-active' : 'is-clean'}`} disabled={!canEdit || saving || !dirty}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </section>

      {!canEdit ? (
        <section className="admin-preferences-warning">
          <AlertTriangle className="h-4 w-4" />
          <p>Only admin users with settings permission can save preferences.</p>
        </section>
      ) : null}

      <section className="admin-preferences-info-banner">
        <InfoIcon />
        <p>Admin preferences only affect this admin panel. Public website settings are managed separately.</p>
      </section>

      <div className="admin-preferences-grid">
        <PreferencesCard icon={Palette} title="Appearance / Theme" description="Local admin panel theme for this device only.">
          <div className="admin-preferences-theme-grid">
            {themePreferenceOptions.map((option) => (
              <ThemePreviewCard
                key={option.value}
                option={option}
                selected={themePreference === option.value}
                resolvedTheme={resolvedTheme}
                disabled={saving}
                onSelect={onThemeChange}
              />
            ))}
          </div>
          <p className="admin-preferences-current">Current theme: <strong>{preferenceLabel(themePreference)}</strong> ({resolvedTheme === 'light' ? 'Light' : 'Dark'} active)</p>
        </PreferencesCard>

        <PreferencesCard icon={Languages} title="Language & Region" description="Default admin display format for dates, time, currency, and timezone.">
          <div className="admin-preferences-field-grid">
            <SelectField label="Language" value={form.languageRegion?.language} options={languageOptions} disabled={!canEdit || saving} onChange={(value) => setPath('languageRegion.language', value)} />
            <SelectField label="Date Format" value={form.languageRegion?.dateFormat} options={dateFormatOptions} disabled={!canEdit || saving} onChange={(value) => setPath('languageRegion.dateFormat', value)} />
            <SelectField label="Time Format" value={form.languageRegion?.timeFormat} options={timeFormatOptions} disabled={!canEdit || saving} onChange={(value) => setPath('languageRegion.timeFormat', value)} />
            <SelectField label="Currency" value={form.languageRegion?.currency} options={currencyOptions} disabled={!canEdit || saving} onChange={(value) => setPath('languageRegion.currency', value)} />
            <SelectField label="Timezone" value={form.languageRegion?.timezone} options={timezoneOptions} disabled={!canEdit || saving} onChange={(value) => setPath('languageRegion.timezone', value)} />
          </div>
        </PreferencesCard>

        <PreferencesCard icon={Bell} title="Default Notification Settings" description="Default admin-facing notification preferences for operational signals.">
          <div className="admin-preferences-notification-table" role="table" aria-label="Default notification settings">
            <div className="admin-preferences-notification-head" role="row">
              <span>Event</span>
              <span>In-App</span>
              <span>Email</span>
            </div>
            {notificationRows.map((row) => {
              const item = form.notifications?.[row.key] || {};
              return (
                <div key={row.key} className="admin-preferences-notification-row" role="row">
                  <strong>{row.label}</strong>
                  <ToggleSwitch checked={Boolean(item.inApp)} disabled={!canEdit || saving} label={`${row.label} in-app`} onChange={(value) => setPath(`notifications.${row.key}.inApp`, value)} />
                  <ToggleSwitch checked={Boolean(item.email)} disabled={!canEdit || saving} label={`${row.label} email`} onChange={(value) => setPath(`notifications.${row.key}.email`, value)} />
                </div>
              );
            })}
          </div>
          <div className="admin-preferences-quiet-hours">
            <div><Clock className="h-4 w-4" /><span>Quiet Hours</span></div>
            <label>
              <small>Start time</small>
              <input type="time" value={form.notifications?.quietHours?.start || '22:00'} readOnly disabled={saving} onClick={placeholderToast} />
            </label>
            <label>
              <small>End time</small>
              <input type="time" value={form.notifications?.quietHours?.end || '07:00'} readOnly disabled={saving} onClick={placeholderToast} />
            </label>
          </div>
        </PreferencesCard>

        <PreferencesCard icon={LayoutDashboard} title="Dashboard Preferences" description="Control what the admin dashboard emphasizes during daily operations.">
          <div className="admin-preferences-row-list">
            {dashboardRows.map((row) => (
              <div key={row.key} className="admin-preferences-setting-row">
                <div>
                  <strong>{row.label}</strong>
                  <p>{row.helper}</p>
                </div>
                <ToggleSwitch checked={Boolean(form.dashboard?.[row.key])} disabled={!canEdit || saving} label={row.label} onChange={(value) => setPath(`dashboard.${row.key}`, value)} />
              </div>
            ))}
          </div>
        </PreferencesCard>

        <PreferencesCard icon={FileText} title="Document Defaults" description="Document defaults stored safely without changing existing PDFs.">
          <div className="admin-preferences-field-grid">
            <SelectField label="Default PDF Language" value={form.documents?.defaultPdfLanguage} options={pdfLanguageOptions} disabled={!canEdit || saving} onChange={(value) => { setPath('documents.defaultPdfLanguage', value); placeholderToast(); }} />
          </div>
          <div className="admin-preferences-row-list">
            {documentRows.map((row) => (
              <div key={row.key} className="admin-preferences-setting-row">
                <strong>{row.label}</strong>
                <ToggleSwitch checked={Boolean(form.documents?.[row.key])} disabled={!canEdit || saving} label={row.label} onChange={(value) => { setPath(`documents.${row.key}`, value); placeholderToast(); }} />
              </div>
            ))}
          </div>
          <div className="admin-preferences-note-row">
            <div>
              <span>Default invoice footer note</span>
              <p>{form.documents?.invoiceFooterNote || 'Optional'}</p>
            </div>
            <button type="button" className="btn btn-secondary admin-table-button" disabled={saving} onClick={placeholderToast}>Edit Note</button>
          </div>
        </PreferencesCard>

        <PreferencesCard icon={Accessibility} title="Accessibility" description="Adjust admin panel comfort and focus behavior for daily use.">
          <div className="admin-preferences-row-list">
            {accessibilityRows.map((row) => (
              <div key={row.key} className="admin-preferences-setting-row">
                <strong>{row.label}</strong>
                <ToggleSwitch checked={Boolean(form.accessibility?.[row.key])} disabled={!canEdit || saving} label={row.label} onChange={(value) => setPath(`accessibility.${row.key}`, value)} />
              </div>
            ))}
          </div>
        </PreferencesCard>
      </div>

      <div className="admin-preferences-footer-strip">
        <span><ShieldCheck className="h-3.5 w-3.5" /> Admin preferences scoped</span>
        <b>Current theme: {preferenceLabel(themePreference)}</b>
        <b>Notifications: {notificationsEnabled ? 'Enabled' : 'Disabled'}</b>
        <b>Dashboard mode: {dashboardMode}</b>
      </div>

      {resetOpen ? (
        <ResetConfirmModal saving={saving} onCancel={() => setResetOpen(false)} onConfirm={resetToDefaults} />
      ) : null}
    </form>
  );
}

function InfoIcon() {
  return (
    <span className="admin-preferences-info-icon" aria-hidden="true">
      <Settings2 className="h-4 w-4" />
      <Sparkles className="h-3 w-3" />
    </span>
  );
}
