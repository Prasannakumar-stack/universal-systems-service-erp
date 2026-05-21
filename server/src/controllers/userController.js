import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { publicUser } from '../auth.js';
import { SUPPORTED_ROLES, assertPermission, normalizeRole } from '../permissions.js';
import { appError, clean, required } from '../utils/http.js';
import { paginatedPayload, paginationMeta, parsePagination, searchRegex, withId } from '../utils/pagination.js';

const allowedRoles = SUPPORTED_ROLES;

function safeUser(user) {
  return publicUser(user);
}

function userError(res, error, fallback) {
  console.error(fallback, error);
  const status = error.status || (error.code === 11000 ? 409 : 500);
  const message = error.code === 11000 ? 'Username or email already exists' : error.status ? error.message : fallback;
  res.status(status).json({ success: false, message });
}

function activeFromBody(body) {
  if (body.isActive !== undefined) return Boolean(body.isActive);
  if (body.active !== undefined) return Boolean(body.active);
  if (body.status !== undefined) return clean(body.status).toLowerCase() === 'active';
  return undefined;
}

async function ensureUniqueIdentity({ username, email, excludeId = null }) {
  const clauses = [];
  if (username) clauses.push({ username });
  if (email) clauses.push({ email });
  if (!clauses.length) return;
  const query = { $or: clauses };
  if (excludeId) query._id = { $ne: excludeId };
  const existing = await User.findOne(query).select('_id username email').lean();
  if (existing) throw appError('Username or email already exists', 409);
}

export async function list(req, res) {
  try {
    const filter = {};
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50, maxLimit: 100 });
    if (clean(req.query.role)) filter.role = clean(req.query.role);
    if (clean(req.query.active)) filter.active = clean(req.query.active) === 'true';
    const regex = searchRegex(req.query.search);
    if (regex) filter.$or = [{ name: regex }, { username: regex }, { phone: regex }, { email: regex }];

    const [total, rows] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter).select('username name role phone email active createdAt updatedAt').sort({ role: 1, name: 1 }).skip(skip).limit(limit).lean()
    ]);
    const users = rows.map((user) => publicUser(withId(user)));
    res.json(paginatedPayload('users', users, paginationMeta(page, limit, total)));
  } catch (error) {
    userError(res, error, 'Unable to load users right now');
  }
}

export async function create(req, res) {
  try {
    required(req.body, ['username', 'password', 'name', 'role']);
    const username = clean(req.body.username).toLowerCase();
    const email = clean(req.body.email).toLowerCase();
    const role = normalizeRole(clean(req.body.role));
    const password = String(req.body.password || '');
    if (!allowedRoles.includes(role)) throw appError('Role is not supported');
    if (password.length < 6) throw appError('Password must be at least 6 characters');
    await ensureUniqueIdentity({ username, email });
    const user = await User.create({
      username,
      passwordHash: await bcrypt.hash(password, 10),
      name: clean(req.body.name),
      role,
      phone: clean(req.body.phone),
      email,
      active: activeFromBody(req.body) ?? true
    });
    res.status(201).json({ success: true, user: safeUser(user), message: 'User created' });
  } catch (error) {
    userError(res, error, 'Unable to create user right now');
  }
}

export async function update(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw appError('User not found', 404);

    if (req.body.username !== undefined) {
      const username = clean(req.body.username).toLowerCase();
      if (!username) throw appError('Username is required');
      await ensureUniqueIdentity({ username, excludeId: user._id });
      user.username = username;
    }
    if (req.body.email !== undefined) {
      const email = clean(req.body.email).toLowerCase();
      await ensureUniqueIdentity({ email, excludeId: user._id });
      user.email = email;
    }
    if (req.body.name !== undefined) {
      const name = clean(req.body.name);
      if (!name) throw appError('Name is required');
      user.name = name;
    }
    if (req.body.phone !== undefined) user.phone = clean(req.body.phone);
    if (req.body.role !== undefined) {
      assertPermission(req.user, 'manage_roles');
      const role = normalizeRole(clean(req.body.role));
      if (!allowedRoles.includes(role)) throw appError('Role is not supported');
      if (String(user._id) === String(req.user._id) && role !== 'admin') throw appError('You cannot remove your own admin access');
      user.role = role;
    }
    const nextActive = activeFromBody(req.body);
    if (nextActive !== undefined) {
      if (String(user._id) === String(req.user._id) && !nextActive) throw appError('You cannot deactivate your own account');
      user.active = nextActive;
    }

    await user.save();
    res.json({ success: true, user: safeUser(user), message: 'User updated' });
  } catch (error) {
    userError(res, error, 'Unable to update user right now');
  }
}

export async function updateStatus(req, res) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) throw appError('User not found', 404);
    const nextActive = activeFromBody(req.body);
    if (nextActive === undefined) throw appError('Status is required');
    if (String(user._id) === String(req.user._id) && !nextActive) throw appError('You cannot deactivate your own account');
    user.active = nextActive;
    await user.save();
    res.json({ success: true, user: safeUser(user), message: user.active ? 'User enabled' : 'User disabled' });
  } catch (error) {
    userError(res, error, 'Unable to update user status right now');
  }
}

export async function resetPassword(req, res) {
  try {
    const password = String(req.body.password || '');
    if (password.length < 6) throw appError('Password must be at least 6 characters');
    const user = await User.findById(req.params.id);
    if (!user) throw appError('User not found', 404);
    user.passwordHash = await bcrypt.hash(password, 10);
    await user.save();
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    userError(res, error, 'Unable to reset password right now');
  }
}
