import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { publicUser, signToken } from '../auth.js';
import { clearLoginRateLimit } from '../middleware/loginRateLimit.js';
import { appError, clean, required } from '../utils/http.js';

export async function login(req, res) {
  required(req.body, ['username', 'password']);

  const user = await User.findOne({ username: clean(req.body.username).toLowerCase() });
  if (!user) throw appError('Invalid username or password', 401);
  if (!user.active) throw appError('Account is inactive. Contact administrator.', 403);
  const ok = await bcrypt.compare(String(req.body.password), user.passwordHash);
  if (!ok) throw appError('Invalid username or password', 401);
  clearLoginRateLimit(req);

  res.json({ success: true, token: signToken(user), user: publicUser(user), role: user.role });
}

export async function me(req, res) {
  res.json({ user: publicUser(req.user) });
}

export async function updateProfile(req, res) {
  const user = await User.findById(req.user._id);
  if (!user) throw appError('User not found', 404);

  const name = clean(req.body.name);
  if (name) user.name = name;

  if (req.body.phone !== undefined) {
    user.phone = clean(req.body.phone);
  }

  const password = clean(req.body.password);
  if (password) {
    if (password.length < 6) throw appError('Password must be at least 6 characters');
    user.passwordHash = await bcrypt.hash(password, 10);
  }

  await user.save();
  res.json({ user: publicUser(user), message: 'Profile updated' });
}
