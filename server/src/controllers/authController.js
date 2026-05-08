import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { publicUser, signToken } from '../auth.js';
import { appError, clean, required } from '../utils/http.js';

export async function login(req, res) {
  required(req.body, ['username', 'password', 'role']);
  const role = clean(req.body.role).toLowerCase();
  if (!['admin', 'technician'].includes(role)) throw appError('Invalid role');

  const user = await User.findOne({ username: clean(req.body.username).toLowerCase(), role, active: true });
  if (!user) throw appError('Invalid username, password, or role', 401);
  const ok = await bcrypt.compare(String(req.body.password), user.passwordHash);
  if (!ok) throw appError('Invalid username, password, or role', 401);

  res.json({ success: true, token: signToken(user), user: publicUser(user) });
}

export async function me(req, res) {
  res.json({ user: publicUser(req.user) });
}
