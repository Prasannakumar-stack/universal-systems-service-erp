import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { BACKUP_DIR, UPLOAD_DIR } from './config.js';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedExts = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const allowedLogoMimeTypes = new Set([...allowedMimeTypes, 'image/svg+xml']);
const allowedLogoExts = new Set([...allowedExts, '.svg']);
const allowedPurchaseBillMimeTypes = new Set([...allowedMimeTypes, 'application/pdf']);
const allowedPurchaseBillExts = new Set([...allowedExts, '.pdf']);
const allowedBackupMimeTypes = new Set(['application/zip', 'application/zip-compressed', 'application/x-zip-compressed', 'application/octet-stream']);

function safeOriginalName(name = '') {
  const base = path.basename(String(name || 'image')).replace(/[^\w.\- ]+/g, '').replace(/\s+/g, ' ').trim();
  return base.slice(0, 120) || 'image';
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    file.originalname = safeOriginalName(file.originalname);
    cb(null, `${Date.now()}-${randomUUID()}${ext}`);
  }
});

const backupStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, BACKUP_DIR),
  filename: (_req, file, cb) => {
    file.originalname = safeOriginalName(file.originalname || 'backup.zip');
    cb(null, `${Date.now()}-${randomUUID()}.zip`);
  }
});

export const bookingUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (allowedMimeTypes.has(file.mimetype) && allowedExts.has(ext)) return cb(null, true);
    cb(new Error('Only JPG, JPEG, PNG, and WEBP image files are allowed'));
  }
});

export const workOrderUpload = bookingUpload;
export const websiteSettingsUpload = bookingUpload;
export const purchaseBillUpload = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (allowedPurchaseBillMimeTypes.has(file.mimetype) && allowedPurchaseBillExts.has(ext)) return cb(null, true);
    cb(new Error('Only PDF, JPG, JPEG, PNG, and WEBP bill files are allowed'));
  }
});
export const companyLogoUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (allowedLogoMimeTypes.has(file.mimetype) && allowedLogoExts.has(ext)) return cb(null, true);
    cb(new Error('Only JPG, JPEG, PNG, WEBP, and SVG logo files are allowed'));
  }
});
export const profileAvatarUpload = bookingUpload;
export const backupUpload = multer({
  storage: backupStorage,
  limits: {
    fileSize: 250 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext === '.zip' && (!file.mimetype || allowedBackupMimeTypes.has(file.mimetype))) return cb(null, true);
    cb(new Error('Only ZIP backup files are allowed'));
  }
});

export function handleUploadErrors(error, _req, res, next) {
  if (!error) return next();
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'File size limit exceeded' });
  }
  if (error instanceof multer.MulterError && error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: 'Upload up to 6 image files only' });
  }
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ message: 'Image upload failed. Please try a JPG, PNG, or WEBP file up to 5 MB.' });
  }
  return res.status(400).json({ message: error.message || 'Upload failed' });
}
