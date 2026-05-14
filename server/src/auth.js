import jwt from 'jsonwebtoken';
import { JWT_SECRET } from './config.js';
import User from './models/User.js';

export function signToken(user) {
  return jwt.sign({ id: user.id, username: user.username, role: user.role, name: user.name }, JWT_SECRET, { expiresIn: '12h' });
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    _id: String(user._id || user.id || ''),
    username: user.username,
    name: user.name,
    role: user.role,
    phone: user.phone || '',
    email: user.email || '',
    active: Boolean(user.active),
    isActive: Boolean(user.active),
    status: user.active ? 'Active' : 'Inactive',
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
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired session' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to access this resource' });
    }
    next();
  };
}
