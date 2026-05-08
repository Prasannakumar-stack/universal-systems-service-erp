import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { publicUser } from '../auth.js';
import { clean, required } from '../utils/http.js';

export async function list(_req, res) {
  const users = await User.find().sort({ role: 1, name: 1 });
  res.json({ users: users.map(publicUser) });
}

export async function create(req, res) {
  required(req.body, ['username', 'password', 'name', 'role']);
  const user = await User.create({
    username: clean(req.body.username).toLowerCase(),
    passwordHash: await bcrypt.hash(String(req.body.password), 10),
    name: clean(req.body.name),
    role: clean(req.body.role),
    phone: clean(req.body.phone),
    email: clean(req.body.email)
  });
  res.status(201).json({ user: publicUser(user), message: 'User created' });
}
