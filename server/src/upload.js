import path from 'node:path';
import { randomUUID } from 'node:crypto';
import multer from 'multer';
import { UPLOAD_DIR } from './config.js';

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedExts = new Set(['.jpg', '.jpeg', '.png', '.webp']);

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

export function handleUploadErrors(error, _req, res, next) {
  if (!error) return next();
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ message: 'Image size must be 5 MB or less' });
  }
  if (error instanceof multer.MulterError && error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ message: 'Upload up to 6 image files only' });
  }
  if (error instanceof multer.MulterError) {
    return res.status(400).json({ message: 'Image upload failed. Please try a JPG, PNG, or WEBP file up to 5 MB.' });
  }
  return res.status(400).json({ message: error.message || 'Upload failed' });
}
