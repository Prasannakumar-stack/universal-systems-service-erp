import {
  forcePasswordResetForStaff,
  getSecuritySettings,
  logoutAllUsers,
  recentSecurityEvents,
  resetSessions,
  updateSecuritySettings
} from '../services/securitySettingsService.js';

export async function getSecurity(req, res) {
  const settings = await getSecuritySettings();
  res.json({ success: true, settings });
}

export async function updateSecurity(req, res) {
  const settings = await updateSecuritySettings(req.body, req.user);
  res.json({ success: true, settings, message: 'Security settings saved' });
}

export async function logoutAll(req, res) {
  const result = await logoutAllUsers(req.user);
  res.json({ success: true, ...result });
}

export async function resetAllSessions(req, res) {
  const result = await resetSessions(req.user);
  res.json({ success: true, ...result });
}

export async function forceStaffPasswordReset(req, res) {
  const result = await forcePasswordResetForStaff(req.user);
  res.json({ success: true, ...result });
}

export async function securityEvents(req, res) {
  const events = await recentSecurityEvents(req.query.limit);
  res.json({ success: true, events });
}
