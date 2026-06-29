import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import { IS_PRODUCTION, MONGO_TIMEOUT_MS, MONGO_URI, STORAGE_DIR, UPLOAD_DIR, PDF_DIR, BACKUP_DIR } from './config.js';
import User from './models/User.js';

export async function connectDb() {
  [STORAGE_DIR, UPLOAD_DIR, PDF_DIR, BACKUP_DIR].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: MONGO_TIMEOUT_MS });
  await seedCoreData();
}

async function seedCoreData() {
  const userCount = await User.countDocuments();
  if (!userCount) {
    if (IS_PRODUCTION) {
      const adminPassword = process.env.SEED_ADMIN_PASSWORD;
      if (!adminPassword) throw new Error('SEED_ADMIN_PASSWORD is required to create the first production admin user');
      if (adminPassword.length < 12) throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters in production');
      await User.create({
        username: process.env.SEED_ADMIN_USERNAME || 'admin',
        passwordHash: await bcrypt.hash(adminPassword, 10),
        name: process.env.SEED_ADMIN_NAME || 'Admin',
        role: 'admin',
        active: true
      });
    } else {
      console.warn('Creating development demo users with default local passwords. Do not use these credentials in production.');
      await User.create([
        { username: 'admin', passwordHash: await bcrypt.hash('admin123', 10), name: 'Admin', role: 'admin' },
        { username: 'emp1', passwordHash: await bcrypt.hash('emp123', 10), name: 'Emp1', role: 'technician' },
        { username: 'emp2', passwordHash: await bcrypt.hash('emp123', 10), name: 'Emp2', role: 'technician' }
      ]);
    }
  }
}
