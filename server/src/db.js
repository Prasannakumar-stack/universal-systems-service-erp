import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import { MONGO_TIMEOUT_MS, MONGO_URI, STORAGE_DIR, UPLOAD_DIR, PDF_DIR, BACKUP_DIR } from './config.js';
import User from './models/User.js';
import InventoryPart from './models/InventoryPart.js';

export async function connectDb() {
  [STORAGE_DIR, UPLOAD_DIR, PDF_DIR, BACKUP_DIR].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: MONGO_TIMEOUT_MS });
  await seedCoreData();
}

async function seedCoreData() {
  const userCount = await User.countDocuments();
  if (!userCount) {
    await User.create([
      { username: 'admin', passwordHash: await bcrypt.hash('admin123', 10), name: 'Admin', role: 'admin' },
      { username: 'emp1', passwordHash: await bcrypt.hash('emp123', 10), name: 'Emp1', role: 'technician' },
      { username: 'emp2', passwordHash: await bcrypt.hash('emp123', 10), name: 'Emp2', role: 'technician' }
    ]);
  }

  const partCount = await InventoryPart.countDocuments();
  if (!partCount) {
    await InventoryPart.create([
      { partName: 'Laptop DC Jack', category: 'Laptop', sellingPrice: 650, stock: 8, onHand: 8, reserved: 0, available: 8, lowStockLimit: 3 },
      { partName: 'SSD 256GB', category: 'Storage', sellingPrice: 1850, stock: 5, onHand: 5, reserved: 0, available: 5, lowStockLimit: 2 }
    ]);
  }
}
