import fs from 'node:fs';
import path from 'node:path';
import CompanyProfile from '../models/CompanyProfile.js';
import { COMPANY, LOGO_FULL_PATH, LOGO_ICON_PATH, UPLOAD_DIR } from '../config.js';
import { hasRole } from '../permissions.js';
import { appError, clean } from '../utils/http.js';
import { logAudit } from './auditService.js';

const SETTINGS_KEY = 'default';

function fallbackProfile() {
  return {
    key: SETTINGS_KEY,
    name: COMPANY.name,
    businessType: 'Repair & Service',
    industry: 'Computer, Electronics & IT Services',
    phone: COMPANY.phones.join(' / '),
    whatsapp: '',
    email: COMPANY.email,
    address: COMPANY.address.replace(/\n/g, ' '),
    googleMapsLink: '',
    gstNumber: '',
    panNumber: '',
    logoUrl: '/logo-full.png',
    useCompanyLogoOnPublicWebsite: true
  };
}

function cleanText(value, fallback = '', max = 1000) {
  const text = clean(value ?? fallback);
  return text.length > max ? text.slice(0, max) : text;
}

function sanitizeCompanyProfile(payload = {}) {
  const fallback = fallbackProfile();
  const base = { ...fallback, ...(payload || {}) };
  return {
    key: SETTINGS_KEY,
    name: cleanText(base.name, fallback.name, 180),
    businessType: cleanText(base.businessType, fallback.businessType, 120),
    industry: cleanText(base.industry, fallback.industry, 160),
    phone: cleanText(base.phone, fallback.phone, 120),
    whatsapp: cleanText(base.whatsapp, fallback.whatsapp, 120),
    email: cleanText(base.email, fallback.email, 180).toLowerCase(),
    address: cleanText(base.address, fallback.address, 1200),
    googleMapsLink: cleanText(base.googleMapsLink, fallback.googleMapsLink, 400),
    gstNumber: cleanText(base.gstNumber, '', 24).toUpperCase(),
    panNumber: cleanText(base.panNumber, '', 16).toUpperCase(),
    logoUrl: cleanText(base.logoUrl, fallback.logoUrl, 400),
    useCompanyLogoOnPublicWebsite: base.useCompanyLogoOnPublicWebsite !== false
  };
}

function userSummary(user) {
  if (!user) return null;
  return {
    id: String(user._id || user.id || ''),
    name: user.name || user.username || 'User',
    username: user.username || '',
    role: user.role || ''
  };
}

function serializeCompanyProfile(profile) {
  const item = profile?.toObject ? profile.toObject() : profile;
  return {
    id: String(item._id || item.id || ''),
    ...sanitizeCompanyProfile(item || {}),
    lastUpdatedBy: userSummary(item?.lastUpdatedBy),
    lastUpdatedDate: item?.updatedAt || item?.createdAt || null,
    updatedAt: item?.updatedAt || null,
    createdAt: item?.createdAt || null
  };
}

export async function ensureCompanyProfile() {
  const defaults = sanitizeCompanyProfile(fallbackProfile());
  return CompanyProfile.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: defaults },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate('lastUpdatedBy', 'name username role');
}

export async function getCompanyProfile() {
  const profile = await ensureCompanyProfile();
  return serializeCompanyProfile(profile);
}

export async function updateCompanyProfile(payload = {}, user = null) {
  if (!hasRole(user, 'admin')) throw appError('Only admin users can edit company profile settings', 403);
  const existing = await ensureCompanyProfile();
  const before = serializeCompanyProfile(existing);
  const sanitized = sanitizeCompanyProfile({ ...before, ...(payload.company || payload) });
  const updated = await CompanyProfile.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $set: { ...sanitized, lastUpdatedBy: user?._id || null } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  ).populate('lastUpdatedBy', 'name username role');
  const after = serializeCompanyProfile(updated);
  await logAudit({
    userId: user?._id || null,
    action: 'company_profile_updated',
    module: 'company_profile',
    recordId: updated._id,
    before,
    after
  });
  return after;
}

export async function updateCompanyLogo(file = null, user = null) {
  if (!hasRole(user, 'admin')) throw appError('Only admin users can edit company logo settings', 403);
  if (!file) throw appError('Logo image is required', 400);
  const existing = await ensureCompanyProfile();
  const before = serializeCompanyProfile(existing);
  existing.logoUrl = `/uploads/${file.filename}`;
  existing.lastUpdatedBy = user?._id || null;
  await existing.save();
  const after = await getCompanyProfile();
  await logAudit({
    userId: user?._id || null,
    action: 'company_logo_updated',
    module: 'company_profile',
    recordId: existing._id,
    before,
    after
  });
  return after;
}

export async function removeCompanyLogo(user = null) {
  if (!hasRole(user, 'admin')) throw appError('Only admin users can remove company logo settings', 403);
  const existing = await ensureCompanyProfile();
  const before = serializeCompanyProfile(existing);
  existing.logoUrl = '';
  existing.lastUpdatedBy = user?._id || null;
  await existing.save();
  const after = await getCompanyProfile();
  await logAudit({
    userId: user?._id || null,
    action: 'company_logo_removed',
    module: 'company_profile',
    recordId: existing._id,
    before,
    after
  });
  return after;
}

function phoneList(phone = '') {
  return String(phone || '')
    .split(/[\/,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function whatsappFromPhone(phone = '') {
  const first = phoneList(phone)[0] || COMPANY.phones[0] || '';
  const digits = first.replace(/\D/g, '');
  if (!digits) return '';
  return digits.length === 10 ? `91${digits}` : digits;
}

export function resolveCompanyLogoPath(profile = {}) {
  const logoUrl = String(profile.logoUrl || '').trim();
  if (logoUrl.startsWith('/uploads/')) {
    const filename = path.basename(logoUrl);
    if (path.extname(filename).toLowerCase() === '.svg') {
      return fs.existsSync(LOGO_FULL_PATH) ? LOGO_FULL_PATH : '';
    }
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) return filePath;
  }
  if (logoUrl === '/logo-icon.png' && fs.existsSync(LOGO_ICON_PATH)) return LOGO_ICON_PATH;
  if (fs.existsSync(LOGO_FULL_PATH)) return LOGO_FULL_PATH;
  return '';
}

export async function getCompanyIdentity() {
  const profile = await getCompanyProfile();
  const phones = phoneList(profile.phone);
  const whatsappNumber = profile.whatsapp || whatsappFromPhone(profile.phone);
  return {
    ...profile,
    tagline: COMPANY.tagline,
    phone: profile.phone || COMPANY.phones.join(' / '),
    phones: phones.length ? phones : COMPANY.phones,
    email: profile.email || COMPANY.email,
    address: profile.address || COMPANY.address,
    googleMapsLink: profile.googleMapsLink || '',
    whatsappNumber,
    logoFilePath: resolveCompanyLogoPath(profile)
  };
}
