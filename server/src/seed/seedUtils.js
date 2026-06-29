import fs from 'node:fs';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { BACKUP_DIR, IS_PRODUCTION, MONGO_TIMEOUT_MS, MONGO_URI, PDF_DIR, STORAGE_DIR, UPLOAD_DIR } from '../config.js';
import RolePermission from '../models/RolePermission.js';
import User from '../models/User.js';
import { defaultPermissionMap, SUPPORTED_ROLES } from '../permissions.js';
import { ensureBusinessSettings } from '../services/businessSettingsService.js';
import { ensureCompanyProfile } from '../services/companyProfileService.js';
import { listPdfTemplates } from '../services/pdfTemplateService.js';
import { ensurePublicWebsiteSettings } from '../services/publicWebsiteSettingsService.js';
import { ensureSecuritySettings } from '../services/securitySettingsService.js';

export async function connectSeedDb() {
  [STORAGE_DIR, UPLOAD_DIR, PDF_DIR, BACKUP_DIR].forEach((dir) => fs.mkdirSync(dir, { recursive: true }));
  mongoose.set('strictQuery', true);
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: MONGO_TIMEOUT_MS });
}

export async function disconnectSeedDb() {
  await mongoose.disconnect();
}

function productionAdminPassword() {
  const password = process.env.SEED_ADMIN_PASSWORD || '';
  if (!password) throw new Error('SEED_ADMIN_PASSWORD is required to create the first live production admin user.');
  if (password.length < 12) throw new Error('SEED_ADMIN_PASSWORD must be at least 12 characters in production.');
  return password;
}

export async function ensureAdminUser() {
  const username = String(process.env.SEED_ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const name = String(process.env.SEED_ADMIN_NAME || 'Admin').trim() || 'Admin';
  const existing = await User.findOne({ username });
  const incomingPassword = process.env.SEED_ADMIN_PASSWORD || '';

  if (existing) {
    existing.name = name;
    existing.role = 'admin';
    existing.active = true;
    if (incomingPassword) existing.passwordHash = await bcrypt.hash(incomingPassword, 10);
    await existing.save();
    return { item: existing, created: false };
  }

  const password = incomingPassword || (IS_PRODUCTION ? productionAdminPassword() : 'admin123');
  const item = await User.create({
    username,
    passwordHash: await bcrypt.hash(password, 10),
    name,
    role: 'admin',
    active: true,
    forcePasswordReset: IS_PRODUCTION
  });
  return { item, created: true };
}

export async function ensureRolePermissionDefaults() {
  const rows = [];
  for (const role of SUPPORTED_ROLES.filter((item) => item !== 'admin')) {
    const result = await RolePermission.findOneAndUpdate(
      { role },
      { $setOnInsert: { role, permissions: defaultPermissionMap(role), updatedBy: null } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    rows.push(result);
  }
  return rows;
}

export async function ensureLiveDefaults() {
  const admin = await ensureAdminUser();
  const roles = await ensureRolePermissionDefaults();
  const businessSettings = await ensureBusinessSettings();
  const publicWebsiteSettings = await ensurePublicWebsiteSettings();
  const companyProfile = await ensureCompanyProfile();
  const securitySettings = await ensureSecuritySettings();
  const pdfTemplates = await listPdfTemplates();

  return {
    admin,
    roles,
    businessSettings,
    publicWebsiteSettings,
    companyProfile,
    securitySettings,
    pdfTemplates
  };
}

export function logResult(label, result) {
  const action = result?.created ? 'created' : 'exists ';
  console.log(`${action} ${label}`);
}
