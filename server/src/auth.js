import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './config.js';
import User from './models/User.js';
import { attachEffectivePermissions, normalizeRole } from './permissions.js';
import { getSecuritySettings } from './services/securitySettingsService.js';

export function signToken(user, securitySettings = null) {
  const globalTokenVersion = Number(securitySettings?.session?.globalTokenVersion || 0);
  const tokenVersion = Number(user.tokenVersion || 0);
  const sessionTimeoutMinutes = Math.min(1440, Math.max(5, Number(securitySettings?.session?.sessionTimeoutMinutes || 720)));
  return jwt.sign({
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    tokenVersion,
    globalTokenVersion
  }, JWT_SECRET, { expiresIn: `${sessionTimeoutMinutes}m` });
}

export function publicUser(user) {
  if (!user) return null;
  const effectivePermissions = user._effectivePermissions || user.effectivePermissions || user.permissions;
  return {
    id: user.id,
    _id: String(user._id || user.id || ''),
    username: user.username,
    name: user.name,
    role: user.role,
    phone: user.phone || '',
    email: user.email || '',
    avatarUrl: user.avatarUrl || '',
    lastLoginAt: user.lastLoginAt,
    lastActivityAt: user.lastActivityAt,
    lastActivityType: user.lastActivityType || '',
    forcePasswordReset: Boolean(user.forcePasswordReset),
    passwordChangedAt: user.passwordChangedAt || null,
    active: Boolean(user.active),
    isActive: Boolean(user.active),
    status: user.active ? 'Active' : 'Inactive',
    permissions: effectivePermissions || undefined,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ _id: decoded.id, active: true });
    if (!user) return res.status(401).json({ message: 'Invalid user' });
    const securitySettings = await getSecuritySettings();
    if (Number(decoded.tokenVersion || 0) !== Number(user.tokenVersion || 0)) {
      return res.status(401).json({ message: 'Invalid or expired session' });
    }
    if (Number(decoded.globalTokenVersion || 0) !== Number(securitySettings?.session?.globalTokenVersion || 0)) {
      return res.status(401).json({ message: 'Invalid or expired session' });
    }
    await attachEffectivePermissions(user);
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired session' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    const allowedRoles = roles.map(normalizeRole);
    if (!allowedRoles.includes(normalizeRole(req.user?.role))) {
      return res.status(403).json({ message: 'You do not have permission to access this resource' });
    }
    next();
  };
}
