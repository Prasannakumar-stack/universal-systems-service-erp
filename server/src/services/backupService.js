import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { EJSON } from 'bson';
import BackupRecord from '../models/BackupRecord.js';
import BackupSettings from '../models/BackupSettings.js';
import { BACKUP_DIR, PDF_DIR, ROOT_DIR, UPLOAD_DIR } from '../config.js';
import { hasRole } from '../permissions.js';
import { appError, clean } from '../utils/http.js';
import { createZip, readZip } from '../utils/zip.js';
import { logAudit } from './auditService.js';

const SETTINGS_KEY = 'default';
const BACKUP_VERSION = 1;
const RESTORE_TOKEN_TTL_MS = 60 * 60 * 1000;

function assertAdmin(user) {
  if (!hasRole(user, 'admin')) throw appError('Only admin users can manage backups', 403);
}

function backupFilename(kind = 'manual') {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `universal-systems-${kind}-${stamp}.zip`;
}

function serializeRecord(record) {
  const item = record?.toObject ? record.toObject() : record;
  if (!item) return null;
  const createdBy = item.createdBy && typeof item.createdBy === 'object'
    ? {
        id: String(item.createdBy._id || item.createdBy.id || ''),
        name: item.createdBy.name || item.createdBy.username || 'User',
        username: item.createdBy.username || ''
      }
    : item.createdBy ? { id: String(item.createdBy), name: '', username: '' } : null;
  return {
    id: String(item._id || item.id || ''),
    kind: item.kind,
    status: item.status,
    filename: item.filename,
    size: item.size || 0,
    manifest: item.manifest || null,
    error: item.error || '',
    restoredFrom: item.restoredFrom ? String(item.restoredFrom) : '',
    createdBy,
    createdAt: item.createdAt || null,
    updatedAt: item.updatedAt || null
  };
}

function serializeSettings(settings) {
  const item = settings?.toObject ? settings.toObject() : settings;
  return {
    automaticBackupEnabled: Boolean(item?.automaticBackupEnabled),
    backupFrequency: item?.backupFrequency || 'Weekly',
    lastBackupAt: item?.lastBackupAt || null,
    lastBackupId: item?.lastBackupId ? String(item.lastBackupId) : ''
  };
}

export async function ensureBackupSettings() {
  return BackupSettings.findOneAndUpdate(
    { key: SETTINGS_KEY },
    { $setOnInsert: { key: SETTINGS_KEY, automaticBackupEnabled: false, backupFrequency: 'Weekly' } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

function safeRelativeFile(rootDir, filePath) {
  const relative = path.relative(rootDir, filePath).replace(/\\/g, '/');
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) return '';
  return relative;
}

async function listFiles(rootDir) {
  const results = [];
  if (!fs.existsSync(rootDir)) return results;
  async function walk(dir) {
    const items = await fsp.readdir(dir, { withFileTypes: true });
    await Promise.all(items.map(async (item) => {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory()) {
        await walk(fullPath);
        return;
      }
      if (!item.isFile() || item.name === '.gitkeep') return;
      const relative = safeRelativeFile(rootDir, fullPath);
      if (!relative) return;
      const stats = await fsp.stat(fullPath);
      results.push({ relative, fullPath, size: stats.size });
    }));
  }
  await walk(rootDir);
  return results.sort((a, b) => a.relative.localeCompare(b.relative));
}

async function dirSize(rootDir) {
  const files = await listFiles(rootDir);
  return files.reduce((sum, file) => sum + file.size, 0);
}

export async function storageSummary() {
  const [uploads, pdfs, backups] = await Promise.all([
    listFiles(UPLOAD_DIR),
    listFiles(PDF_DIR),
    listFiles(BACKUP_DIR)
  ]);
  const uploadBytes = uploads.reduce((sum, file) => sum + file.size, 0);
  const pdfBytes = pdfs.reduce((sum, file) => sum + file.size, 0);
  const backupBytes = backups.reduce((sum, file) => sum + file.size, 0);
  return {
    storageUsed: uploadBytes + pdfBytes + backupBytes,
    uploadedDocumentsStorage: pdfBytes,
    imageUploadStorage: uploadBytes,
    backupStorage: backupBytes,
    uploadedDocumentCount: pdfs.length,
    imageUploadCount: uploads.length,
    backupCount: backups.length
  };
}

async function collectionEntries() {
  const collections = await mongoose.connection.db.listCollections().toArray();
  const entries = [];
  const manifestCollections = [];
  for (const collection of collections.sort((a, b) => a.name.localeCompare(b.name))) {
    const docs = await mongoose.connection.db.collection(collection.name).find({}).toArray();
    const content = EJSON.stringify(docs, { relaxed: false });
    entries.push({
      name: `collections/${collection.name}.json`,
      data: Buffer.from(content, 'utf8')
    });
    manifestCollections.push({ name: collection.name, count: docs.length });
  }
  return { entries, manifestCollections };
}

async function fileEntries() {
  const [uploads, pdfs] = await Promise.all([listFiles(UPLOAD_DIR), listFiles(PDF_DIR)]);
  const entries = [];
  for (const file of uploads) {
    entries.push({ name: `files/uploads/${file.relative}`, data: await fsp.readFile(file.fullPath) });
  }
  for (const file of pdfs) {
    entries.push({ name: `files/pdfs/${file.relative}`, data: await fsp.readFile(file.fullPath) });
  }
  return {
    entries,
    manifestFiles: {
      uploads: uploads.map((file) => ({ path: file.relative, size: file.size })),
      pdfs: pdfs.map((file) => ({ path: file.relative, size: file.size }))
    }
  };
}

export async function createBackup({ user = null, kind = 'manual', reason = '', system = false } = {}) {
  if (!system) assertAdmin(user);
  await fsp.mkdir(BACKUP_DIR, { recursive: true });
  const filename = backupFilename(kind);
  const filePath = path.join(BACKUP_DIR, filename);
  let record = null;

  try {
    const [{ entries: collectionZipEntries, manifestCollections }, { entries: fileZipEntries, manifestFiles }] = await Promise.all([
      collectionEntries(),
      fileEntries()
    ]);
    const manifest = {
      app: 'universal-systems-service-app',
      version: BACKUP_VERSION,
      kind,
      reason,
      createdAt: new Date().toISOString(),
      root: path.basename(ROOT_DIR),
      collections: manifestCollections,
      files: manifestFiles
    };
    const zip = createZip([
      { name: 'manifest.json', data: Buffer.from(JSON.stringify(manifest, null, 2), 'utf8') },
      ...collectionZipEntries,
      ...fileZipEntries
    ]);
    await fsp.writeFile(filePath, zip);
    const stats = await fsp.stat(filePath);
    record = await BackupRecord.create({
      kind,
      status: 'completed',
      filename,
      filePath,
      size: stats.size,
      manifest,
      createdBy: user?._id || null
    });

    const settings = await ensureBackupSettings();
    settings.lastBackupAt = new Date();
    settings.lastBackupId = record._id;
    await settings.save();

    await logAudit({
      userId: user?._id || null,
      action: kind === 'pre_restore' ? 'backup_pre_restore_created' : 'backup_created',
      module: 'backup',
      recordId: record._id,
      after: { id: String(record._id), kind, filename, size: stats.size, reason }
    });
    return serializeRecord(record);
  } catch (error) {
    record = record || await BackupRecord.create({
      kind,
      status: 'failed',
      filename,
      filePath,
      error: error.message,
      createdBy: user?._id || null
    });
    await logAudit({
      userId: user?._id || null,
      action: 'backup_failed',
      module: 'backup',
      recordId: record._id,
      after: { kind, filename, error: error.message }
    });
    throw error;
  }
}

function nextBackupDueAt(settings) {
  if (!settings?.lastBackupAt) return new Date(0);
  const due = new Date(settings.lastBackupAt);
  if (settings.backupFrequency === 'Daily') due.setDate(due.getDate() + 1);
  else if (settings.backupFrequency === 'Monthly') due.setMonth(due.getMonth() + 1);
  else due.setDate(due.getDate() + 7);
  return due;
}

export async function runAutomaticBackupIfDue() {
  const settings = await ensureBackupSettings();
  if (!settings.automaticBackupEnabled) return null;
  if (nextBackupDueAt(settings).getTime() > Date.now()) return null;
  return createBackup({
    kind: 'automatic',
    reason: `${settings.backupFrequency} automatic backup`,
    system: true
  });
}

export function startAutomaticBackupScheduler() {
  const run = () => {
    runAutomaticBackupIfDue().catch((error) => {
      console.error('Automatic backup failed', error);
    });
  };
  setTimeout(run, 15000);
  return setInterval(run, 60 * 60 * 1000);
}

function parseManifest(entries) {
  const manifestBuffer = entries.get('manifest.json');
  if (!manifestBuffer) throw appError('Backup manifest is missing', 400);
  const manifest = JSON.parse(manifestBuffer.toString('utf8'));
  if (manifest.app !== 'universal-systems-service-app' || manifest.version !== BACKUP_VERSION) {
    throw appError('Backup manifest is not compatible with this app version', 400);
  }
  if (!Array.isArray(manifest.collections) || !manifest.files || !Array.isArray(manifest.files.uploads) || !Array.isArray(manifest.files.pdfs)) {
    throw appError('Backup manifest is incomplete', 400);
  }
  manifest.collections.forEach((collection) => {
    const name = clean(collection.name);
    if (!name || !entries.has(`collections/${name}.json`)) throw appError(`Backup collection is missing: ${name}`, 400);
  });
  [...manifest.files.uploads, ...manifest.files.pdfs].forEach((file) => {
    const relative = clean(file.path).replace(/\\/g, '/');
    if (!relative || relative.startsWith('/') || relative.split('/').some((part) => part === '..')) {
      throw appError(`Backup file path is unsafe: ${file.path}`, 400);
    }
  });
  return manifest;
}

export function validateBackupBuffer(buffer) {
  const entries = readZip(buffer);
  const manifest = parseManifest(entries);
  return { entries, manifest };
}

export async function validateRestoreUpload(file = null, user = null) {
  assertAdmin(user);
  if (!file) throw appError('Backup ZIP file is required', 400);
  const buffer = await fsp.readFile(file.path);
  const { manifest } = validateBackupBuffer(buffer);
  const token = randomUUID();
  const stats = await fsp.stat(file.path);
  const record = await BackupRecord.create({
    kind: 'restore_upload',
    status: 'validated',
    filename: file.originalname || path.basename(file.path),
    filePath: file.path,
    size: stats.size,
    manifest,
    restoreToken: token,
    createdBy: user?._id || null
  });
  await logAudit({
    userId: user?._id || null,
    action: 'backup_restore_validated',
    module: 'backup',
    recordId: record._id,
    after: { id: String(record._id), filename: record.filename, size: stats.size, manifest }
  });
  return {
    restoreToken: token,
    record: serializeRecord(record),
    summary: {
      collections: manifest.collections.length,
      uploadFiles: manifest.files.uploads.length,
      pdfFiles: manifest.files.pdfs.length,
      createdAt: manifest.createdAt
    }
  };
}

export async function validateExistingBackupForRestore(id, user = null) {
  assertAdmin(user);
  const source = await BackupRecord.findById(id).lean();
  if (!source || !source.filePath || !fs.existsSync(source.filePath)) throw appError('Backup file not found', 404);
  const buffer = await fsp.readFile(source.filePath);
  const { manifest } = validateBackupBuffer(buffer);
  const token = randomUUID();
  const record = await BackupRecord.create({
    kind: 'restore_upload',
    status: 'validated',
    filename: source.filename,
    filePath: source.filePath,
    size: source.size || 0,
    manifest,
    restoreToken: token,
    createdBy: user?._id || null
  });
  await logAudit({
    userId: user?._id || null,
    action: 'backup_restore_validated',
    module: 'backup',
    recordId: record._id,
    after: { id: String(record._id), sourceBackupId: String(source._id), filename: record.filename, size: record.size, manifest }
  });
  return {
    restoreToken: token,
    record: serializeRecord(record),
    summary: {
      collections: manifest.collections.length,
      uploadFiles: manifest.files.uploads.length,
      pdfFiles: manifest.files.pdfs.length,
      createdAt: manifest.createdAt
    }
  };
}

function resolveInside(rootDir, relativePath) {
  const target = path.resolve(rootDir, relativePath);
  const root = path.resolve(rootDir);
  if (target !== root && !target.startsWith(`${root}${path.sep}`)) throw appError(`Unsafe restore path: ${relativePath}`, 400);
  return target;
}

async function clearRuntimeFiles(rootDir) {
  await fsp.mkdir(rootDir, { recursive: true });
  const entries = await fsp.readdir(rootDir, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    if (entry.name === '.gitkeep') return;
    const target = resolveInside(rootDir, entry.name);
    await fsp.rm(target, { recursive: true, force: true });
  }));
}

async function restoreRuntimeFiles(entries, manifest) {
  await Promise.all([clearRuntimeFiles(UPLOAD_DIR), clearRuntimeFiles(PDF_DIR)]);
  const fileGroups = [
    { root: UPLOAD_DIR, prefix: 'files/uploads/', files: manifest.files.uploads },
    { root: PDF_DIR, prefix: 'files/pdfs/', files: manifest.files.pdfs }
  ];

  for (const group of fileGroups) {
    for (const file of group.files) {
      const relative = clean(file.path).replace(/\\/g, '/');
      const buffer = entries.get(`${group.prefix}${relative}`);
      if (!buffer) throw appError(`Backup file is missing: ${relative}`, 400);
      const target = resolveInside(group.root, relative);
      await fsp.mkdir(path.dirname(target), { recursive: true });
      await fsp.writeFile(target, buffer);
    }
  }
}

async function restoreCollections(entries, manifest) {
  for (const collection of manifest.collections) {
    const name = clean(collection.name);
    const buffer = entries.get(`collections/${name}.json`);
    const docs = EJSON.parse(buffer.toString('utf8'), { relaxed: false });
    if (!Array.isArray(docs)) throw appError(`Invalid backup collection payload: ${name}`, 400);
    const mongoCollection = mongoose.connection.db.collection(name);
    await mongoCollection.deleteMany({});
    if (docs.length) await mongoCollection.insertMany(docs, { ordered: false });
  }
}

export async function restoreValidatedBackup({ restoreToken, user = null, confirmed = false } = {}) {
  assertAdmin(user);
  if (!confirmed) throw appError('Restore confirmation is required', 400);
  const record = await BackupRecord.findOne({ restoreToken, status: 'validated' });
  if (!record) throw appError('Restore token is invalid or expired', 400);
  if (Date.now() - new Date(record.createdAt).getTime() > RESTORE_TOKEN_TTL_MS) throw appError('Restore token has expired. Upload the backup again.', 400);
  const buffer = await fsp.readFile(record.filePath);
  const { entries, manifest } = validateBackupBuffer(buffer);

  const preRestore = await createBackup({ user, kind: 'pre_restore', reason: `Before restoring ${record.filename}` });
  try {
    await restoreCollections(entries, manifest);
    await restoreRuntimeFiles(entries, manifest);
    record.status = 'restored';
    record.restoredFrom = record._id;
    record.restoreToken = '';
    await record.save();
    await logAudit({
      userId: user?._id || null,
      action: 'backup_restored',
      module: 'backup',
      recordId: record._id,
      before: { preRestoreBackupId: preRestore.id },
      after: { restoredBackupId: String(record._id), manifest }
    });
    return { restored: serializeRecord(record), preRestore };
  } catch (error) {
    await logAudit({
      userId: user?._id || null,
      action: 'backup_restore_failed',
      module: 'backup',
      recordId: record._id,
      before: { preRestoreBackupId: preRestore.id },
      after: { error: error.message }
    });
    throw error;
  }
}

export async function getBackupStorageSettings() {
  const [settings, latestRecords, storage] = await Promise.all([
    ensureBackupSettings(),
    BackupRecord.find({ status: { $in: ['completed', 'restored'] } }).sort({ createdAt: -1 }).limit(12).populate('createdBy', 'name username').lean(),
    storageSummary()
  ]);
  return {
    settings: serializeSettings(settings),
    records: latestRecords.map(serializeRecord),
    storage
  };
}

export async function updateBackupStorageSettings(payload = {}, user = null) {
  assertAdmin(user);
  const existing = await ensureBackupSettings();
  const before = serializeSettings(existing);
  if (payload.automaticBackupEnabled !== undefined) existing.automaticBackupEnabled = Boolean(payload.automaticBackupEnabled);
  if (payload.backupFrequency !== undefined) {
    const frequency = clean(payload.backupFrequency);
    if (!['Daily', 'Weekly', 'Monthly'].includes(frequency)) throw appError('Backup frequency is not supported', 400);
    existing.backupFrequency = frequency;
  }
  existing.lastUpdatedBy = user?._id || null;
  await existing.save();
  const after = serializeSettings(existing);
  await logAudit({
    userId: user?._id || null,
    action: 'backup_settings_updated',
    module: 'backup',
    recordId: existing._id,
    before,
    after
  });
  return after;
}

export async function getBackupRecordForDownload(id, user = null) {
  assertAdmin(user);
  const record = await BackupRecord.findById(id).lean();
  if (!record || !record.filePath || !fs.existsSync(record.filePath)) throw appError('Backup file not found', 404);
  return record;
}

export async function deleteBackupRecord(id, user = null) {
  assertAdmin(user);
  const record = await BackupRecord.findById(id);
  if (!record) throw appError('Backup record not found', 404);
  const before = serializeRecord(record);
  if (record.filePath && fs.existsSync(record.filePath)) {
    await fsp.rm(record.filePath, { force: true });
  }
  await record.deleteOne();
  await logAudit({
    userId: user?._id || null,
    action: 'backup_deleted',
    module: 'backup',
    recordId: record._id,
    before,
    after: null
  });
  return before;
}
