import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { publicUser, signToken } from '../auth.js';
import { clearLoginRateLimit } from '../middleware/loginRateLimit.js';
import { attachEffectivePermissions } from '../permissions.js';
import { appError, clean, required } from '../utils/http.js';
import AuditLog from '../models/AuditLog.js';
import { logAudit } from '../services/auditService.js';
import {
  assertUserNotLocked,
  getSecuritySettings,
  recordFailedLogin,
  recordSuccessfulLogin,
  resetExpiredLock,
  validatePasswordAgainstPolicy
} from '../services/securitySettingsService.js';

export async function login(req, res) {
  required(req.body, ['username', 'password']);

  const username = clean(req.body.username).toLowerCase();
  const user = await User.findOne({ username });
  if (!user) {
    await logAudit({
      userId: null,
      action: 'login_failed',
      module: 'auth',
      after: { username, ip: req.ip || '' }
    });
    throw appError('Invalid username or password', 401);
  }
  await resetExpiredLock(user);
  assertUserNotLocked(user);
  if (!user.active) throw appError('Account is inactive. Contact administrator.', 403);
  const ok = await bcrypt.compare(String(req.body.password), user.passwordHash);
  if (!ok) {
    await recordFailedLogin(user, req);
    throw appError('Invalid username or password', 401);
  }
  clearLoginRateLimit(req);
  await recordSuccessfulLogin(user, req);
  await attachEffectivePermissions(user);
  const securitySettings = await getSecuritySettings();

  res.json({ success: true, token: signToken(user, securitySettings), user: publicUser(user), role: user.role });
}

export async function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

export async function updateProfile(req, res) {
  const user = await User.findById(req.user._id);
  if (!user) throw appError('User not found', 404);
  const before = publicUser(user);

  const name = clean(req.body.name);
  if (name) user.name = name;

  if (req.body.username !== undefined) {
    const username = clean(req.body.username).toLowerCase();
    if (!username) throw appError('Username is required', 400);
    const existing = await User.findOne({ username, _id: { $ne: user._id } }).select('_id').lean();
    if (existing) throw appError('Username already exists', 409);
    user.username = username;
  }

  if (req.body.email !== undefined) {
    const email = clean(req.body.email).toLowerCase();
    if (email) {
      const existing = await User.findOne({ email, _id: { $ne: user._id } }).select('_id').lean();
      if (existing) throw appError('Email already exists', 409);
    }
    user.email = email;
  }

  if (req.body.phone !== undefined) {
    user.phone = clean(req.body.phone);
  }

  if (req.body.whatsappNumber !== undefined || req.body.whatsapp !== undefined) {
    user.whatsappNumber = clean(req.body.whatsappNumber ?? req.body.whatsapp);
  }

  const password = clean(req.body.newPassword || req.body.password);
  let passwordChanged = false;
  if (password) {
    await validatePasswordAgainstPolicy(password);
    const currentPassword = clean(req.body.currentPassword);
    if (!currentPassword) throw appError('Current password is required', 400);
    const currentOk = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!currentOk) throw appError('Current password is incorrect', 400);
    user.passwordHash = await bcrypt.hash(password, 10);
    user.passwordChangedAt = new Date();
    user.forcePasswordReset = false;
    passwordChanged = true;
  }

  user.lastActivityAt = new Date();
  user.lastActivityType = passwordChanged ? 'password_changed' : 'profile_updated';
  await user.save();
  await attachEffectivePermissions(user);
  const after = publicUser(user);
  await logAudit({
    userId: user._id,
    action: passwordChanged ? 'admin_password_updated' : 'admin_profile_updated',
    module: 'user_profile',
    recordId: user._id,
    before: { ...before, passwordHash: undefined },
    after: { ...after, passwordChanged }
  });
  res.json({ user: after, message: passwordChanged ? 'Password updated' : 'Profile updated' });
}

export async function uploadAvatar(req, res) {
  if (!req.file) throw appError('Profile photo is required', 400);
  const user = await User.findById(req.user._id);
  if (!user) throw appError('User not found', 404);
  const before = publicUser(user);
  user.avatarUrl = `/uploads/${req.file.filename}`;
  user.lastActivityAt = new Date();
  user.lastActivityType = 'avatar_updated';
  await user.save();
  await attachEffectivePermissions(user);
  const after = publicUser(user);
  await logAudit({
    userId: user._id,
    action: 'admin_avatar_updated',
    module: 'user_profile',
    recordId: user._id,
    before,
    after
  });
  res.json({ success: true, user: after, message: 'Profile photo updated' });
}

export async function removeAvatar(req, res) {
  const user = await User.findById(req.user._id);
  if (!user) throw appError('User not found', 404);
  const before = publicUser(user);
  user.avatarUrl = '';
  user.lastActivityAt = new Date();
  user.lastActivityType = 'avatar_removed';
  await user.save();
  await attachEffectivePermissions(user);
  const after = publicUser(user);
  await logAudit({
    userId: user._id,
    action: 'admin_avatar_removed',
    module: 'user_profile',
    recordId: user._id,
    before,
    after
  });
  res.json({ success: true, user: after, message: 'Profile photo removed' });
}

export async function profileActivity(req, res) {
  const logs = await AuditLog.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(8)
    .lean();
  res.json({ success: true, activity: logs.map((item) => ({ ...item, id: String(item._id) })) });
}
