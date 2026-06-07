import BusinessSettings from '../models/BusinessSettings.js';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import { hasRole } from '../permissions.js';
import { appError, clean, numberValue } from '../utils/http.js';
import { logAudit } from './auditService.js';

const SETTINGS_KEY = 'default';

export const SECURITY_SETTINGS_DEFAULTS = Object.freeze({
  version: 1,
  password: {
    minimumPasswordLength: 6,
    requireUppercase: false,
    requireNumbers: false,
    requireSpecialCharacters: false,
    passwordExpiryDays: 0,
    preventPasswordReuseCount: 0
  },
  login: {
    failedLoginLimit: 10,
    lockoutDurationMinutes: 15,
    adminLoginAlerts: true,
    twoFactorStatus: 'not_configured'
  },
  session: {
    sessionTimeoutMinutes: 720,
    logoutIdleSessions: false,
    globalTokenVersion: 0
  },
  audit: {
    auditLoggingEnabled: true,
    auditRetentionDays: 90,
    logAdminActivities: true,
    logDataChanges: true,
    logSecurityEvents: true
  },
  unsupported: {
    passwordExpiry: false,
    passwordReuse: false,
    idleSessionLogout: false,
    activeSessionTracking: false,
    twoFactorAuthentication: false
  },
  updatedAt: null,
  updatedBy: ''
});

function clampInt(value, fallback, min, max) {
  const parsed = Math.floor(numberValue(value, fallback));
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function boolValue(value, fallback = false) {
  if (value === undefined || value === null) return Boolean(fallback);
  return Boolean(value);
}

export function sanitizeSecuritySettings(payload = {}, fallback = SECURITY_SETTINGS_DEFAULTS) {
  const password = payload.password || {};
  const fallbackPassword = fallback.password || SECURITY_SETTINGS_DEFAULTS.password;
  const login = payload.login || {};
  const fallbackLogin = fallback.login || SECURITY_SETTINGS_DEFAULTS.login;
  const session = payload.session || {};
  const fallbackSession = fallback.session || SECURITY_SETTINGS_DEFAULTS.session;
  const audit = payload.audit || {};
  const fallbackAudit = fallback.audit || SECURITY_SETTINGS_DEFAULTS.audit;
  const unsupported = payload.unsupported || fallback.unsupported || SECURITY_SETTINGS_DEFAULTS.unsupported;

  const next = {
    version: 1,
    password: {
      minimumPasswordLength: clampInt(password.minimumPasswordLength ?? password.minimumLength, fallbackPassword.minimumPasswordLength, 6, 128),
      requireUppercase: boolValue(password.requireUppercase, fallbackPassword.requireUppercase),
      requireNumbers: boolValue(password.requireNumbers, fallbackPassword.requireNumbers),
      requireSpecialCharacters: boolValue(password.requireSpecialCharacters ?? password.requireSpecial, fallbackPassword.requireSpecialCharacters),
      passwordExpiryDays: clampInt(password.passwordExpiryDays ?? password.expiryDays, fallbackPassword.passwordExpiryDays, 0, 365),
      preventPasswordReuseCount: clampInt(password.preventPasswordReuseCount ?? password.reuseCount, fallbackPassword.preventPasswordReuseCount, 0, 24)
    },
    login: {
      failedLoginLimit: clampInt(login.failedLoginLimit, fallbackLogin.failedLoginLimit, 1, 50),
      lockoutDurationMinutes: clampInt(login.lockoutDurationMinutes ?? login.lockoutMinutes, fallbackLogin.lockoutDurationMinutes, 1, 1440),
      adminLoginAlerts: boolValue(login.adminLoginAlerts, fallbackLogin.adminLoginAlerts),
      twoFactorStatus: clean(login.twoFactorStatus || fallbackLogin.twoFactorStatus || 'not_configured')
    },
    session: {
      sessionTimeoutMinutes: clampInt(session.sessionTimeoutMinutes ?? session.timeoutMinutes, fallbackSession.sessionTimeoutMinutes, 5, 1440),
      logoutIdleSessions: boolValue(session.logoutIdleSessions, fallbackSession.logoutIdleSessions),
      globalTokenVersion: clampInt(session.globalTokenVersion, fallbackSession.globalTokenVersion, 0, 1000000000)
    },
    audit: {
      auditLoggingEnabled: boolValue(audit.auditLoggingEnabled ?? audit.enabled, fallbackAudit.auditLoggingEnabled),
      auditRetentionDays: [30, 90, 180, 365].includes(Number(audit.auditRetentionDays ?? audit.retentionDays))
        ? Number(audit.auditRetentionDays ?? audit.retentionDays)
        : fallbackAudit.auditRetentionDays,
      logAdminActivities: boolValue(audit.logAdminActivities, fallbackAudit.logAdminActivities),
      logDataChanges: boolValue(audit.logDataChanges, fallbackAudit.logDataChanges),
      logSecurityEvents: boolValue(audit.logSecurityEvents, fallbackAudit.logSecurityEvents)
    },
    unsupported: {
      passwordExpiry: Boolean(unsupported.passwordExpiry),
      passwordReuse: Boolean(unsupported.passwordReuse),
      idleSessionLogout: Boolean(unsupported.idleSessionLogout),
      activeSessionTracking: Boolean(unsupported.activeSessionTracking),
      twoFactorAuthentication: Boolean(unsupported.twoFactorAuthentication)
    },
    updatedAt: payload.updatedAt || fallback.updatedAt || null,
    updatedBy: clean(payload.updatedBy || fallback.updatedBy || '')
  };

  if (!next.unsupported.passwordExpiry) next.password.passwordExpiryDays = 0;
  if (!next.unsupported.passwordReuse) next.password.preventPasswordReuseCount = 0;
  if (!next.unsupported.idleSessionLogout) next.session.logoutIdleSessions = false;

  return next;
}

export async function ensureSecuritySettings() {
  const settings = await BusinessSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: { key: SETTINGS_KEY } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  const sanitized = sanitizeSecuritySettings(settings.securitySettings || {}, SECURITY_SETTINGS_DEFAULTS);
  if (!settings.securitySettings || !settings.securitySettings.version) {
    settings.securitySettings = sanitized;
    await settings.save();
  }
  return { settings, security: sanitized };
}

export async function getSecuritySettings() {
  const { security } = await ensureSecuritySettings();
  return security;
}

export async function updateSecuritySettings(payload = {}, user = null) {
  if (!hasRole(user, 'admin')) throw appError('Only admin users can manage security settings', 403);
  const { settings, security: before } = await ensureSecuritySettings();
  const incoming = payload?.settings || payload;
  if (Number(incoming?.password?.passwordExpiryDays || incoming?.password?.expiryDays || 0) > 0) {
    throw appError('Password expiry requires backend support before it can be saved.', 400);
  }
  if (Number(incoming?.password?.preventPasswordReuseCount || incoming?.password?.reuseCount || 0) > 0) {
    throw appError('Password reuse prevention requires backend support before it can be saved.', 400);
  }
  if (incoming?.session?.logoutIdleSessions === true) {
    throw appError('Idle session logout requires backend support before it can be saved.', 400);
  }
  const sanitized = sanitizeSecuritySettings(incoming, before);
  sanitized.updatedAt = new Date().toISOString();
  sanitized.updatedBy = user?.name || user?.username || 'Admin';
  settings.securitySettings = sanitized;
  settings.lastUpdatedBy = user?._id || null;
  await settings.save();
  await logAudit({
    userId: user?._id || null,
    action: 'security_settings_updated',
    module: 'security',
    recordId: settings._id,
    before,
    after: sanitized
  });
  return sanitized;
}

export async function validatePasswordAgainstPolicy(password, { settings = null } = {}) {
  const security = settings || await getSecuritySettings();
  const value = String(password || '');
  const rules = security.password || SECURITY_SETTINGS_DEFAULTS.password;
  if (value.length < rules.minimumPasswordLength) {
    throw appError(`Password must be at least ${rules.minimumPasswordLength} characters`, 400);
  }
  if (rules.requireUppercase && !/[A-Z]/.test(value)) {
    throw appError('Password must include at least one uppercase letter', 400);
  }
  if (rules.requireNumbers && !/\d/.test(value)) {
    throw appError('Password must include at least one number', 400);
  }
  if (rules.requireSpecialCharacters && !/[^A-Za-z0-9]/.test(value)) {
    throw appError('Password must include at least one special character', 400);
  }
  return true;
}

export async function recordFailedLogin(user, req = null) {
  if (!user) return;
  const security = await getSecuritySettings();
  const limit = security.login.failedLoginLimit;
  const lockoutMinutes = security.login.lockoutDurationMinutes;
  user.failedLoginAttempts = Number(user.failedLoginAttempts || 0) + 1;
  user.lastFailedLoginAt = new Date();
  let locked = false;
  if (user.failedLoginAttempts >= limit) {
    user.lockUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
    locked = true;
  }
  await user.save();
  await logAudit({
    userId: user._id,
    action: locked ? 'account_locked' : 'login_failed',
    module: 'auth',
    recordId: user._id,
    after: {
      username: user.username,
      failedLoginAttempts: user.failedLoginAttempts,
      lockUntil: user.lockUntil,
      ip: req?.ip || ''
    }
  });
}

export async function recordSuccessfulLogin(user, req = null) {
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastFailedLoginAt = null;
  user.lastLoginAt = new Date();
  user.lastActivityAt = new Date();
  user.lastActivityType = 'login';
  await user.save();
  await logAudit({
    userId: user._id,
    action: 'login_successful',
    module: 'auth',
    recordId: user._id,
    after: { username: user.username, role: user.role, ip: req?.ip || '' }
  });
}

export function assertUserNotLocked(user) {
  if (!user?.lockUntil) return;
  const lockUntil = new Date(user.lockUntil);
  if (Number.isNaN(lockUntil.getTime()) || lockUntil <= new Date()) return;
  throw appError('Account is temporarily locked. Please try again later or contact administrator.', 423);
}

export async function resetExpiredLock(user) {
  if (!user?.lockUntil) return user;
  const lockUntil = new Date(user.lockUntil);
  if (!Number.isNaN(lockUntil.getTime()) && lockUntil <= new Date()) {
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    await user.save();
  }
  return user;
}

export async function incrementGlobalTokenVersion(user = null) {
  const { settings, security } = await ensureSecuritySettings();
  const next = sanitizeSecuritySettings({
    ...security,
    session: {
      ...security.session,
      globalTokenVersion: Number(security.session.globalTokenVersion || 0) + 1
    },
    updatedAt: new Date().toISOString(),
    updatedBy: user?.name || user?.username || 'Admin'
  }, security);
  settings.securitySettings = next;
  settings.lastUpdatedBy = user?._id || null;
  await settings.save();
  return next;
}

export async function logoutAllUsers(user = null) {
  if (!hasRole(user, 'admin')) throw appError('Only admin users can manage security sessions', 403);
  const security = await incrementGlobalTokenVersion(user);
  await logAudit({
    userId: user?._id || null,
    action: 'logout_all_users',
    module: 'security',
    recordId: user?._id || null,
    after: { globalTokenVersion: security.session.globalTokenVersion }
  });
  return { security, message: 'All user sessions were invalidated.' };
}

export async function resetSessions(user = null) {
  if (!hasRole(user, 'admin')) throw appError('Only admin users can manage security sessions', 403);
  await User.updateMany({}, { $inc: { tokenVersion: 1 } });
  const security = await incrementGlobalTokenVersion(user);
  await logAudit({
    userId: user?._id || null,
    action: 'sessions_reset',
    module: 'security',
    recordId: user?._id || null,
    after: { globalTokenVersion: security.session.globalTokenVersion }
  });
  return { security, message: 'All sessions were reset successfully.' };
}

export async function forcePasswordResetForStaff(user = null) {
  if (!hasRole(user, 'admin')) throw appError('Only admin users can manage password reset requirements', 403);
  const result = await User.updateMany(
    { _id: { $ne: user?._id }, role: { $ne: 'admin' }, active: true },
    { $set: { forcePasswordReset: true }, $inc: { tokenVersion: 1 } }
  );
  await logAudit({
    userId: user?._id || null,
    action: 'force_password_reset_staff',
    module: 'security',
    recordId: user?._id || null,
    after: { matched: result.matchedCount, modified: result.modifiedCount }
  });
  return { modifiedCount: result.modifiedCount || 0, message: 'Password reset requirement applied to staff accounts.' };
}

export async function recentSecurityEvents(limit = 10) {
  const regex = /(auth|login|logout|password|permission|role|security|session|backup|restore|settings)/i;
  const logs = await AuditLog.find({
    $or: [
      { module: regex },
      { action: regex }
    ]
  })
    .populate('userId', 'name username role')
    .sort({ createdAt: -1 })
    .limit(Math.min(50, Math.max(1, Number(limit) || 10)))
    .lean();
  return logs.map((item) => ({ ...item, id: String(item._id) }));
}
