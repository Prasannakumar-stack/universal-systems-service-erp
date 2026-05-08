import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const ROOT_DIR = path.resolve(__dirname, '../..');
export const STORAGE_DIR = path.resolve(__dirname, '../storage');
export const UPLOAD_DIR = path.join(STORAGE_DIR, 'uploads');
export const PDF_DIR = path.join(STORAGE_DIR, 'pdfs');
export const BACKUP_DIR = path.join(STORAGE_DIR, 'backups');
export const DB_PATH = path.join(STORAGE_DIR, 'app.sqlite');
export const LOGO_FULL_PATH = path.join(ROOT_DIR, 'logo-full.png');
export const LOGO_ICON_PATH = path.join(ROOT_DIR, 'logo-icon.png');

export const JWT_SECRET = process.env.JWT_SECRET || 'universal-systems-local-secret';
export const PORT = Number(process.env.PORT || 5050);
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
export const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/service_management_phase1';
export const MONGO_TIMEOUT_MS = Number(process.env.MONGO_TIMEOUT_MS || 5000);

export const COMPANY = {
  name: 'Universal Systems',
  tagline: 'We care for your career',
  address: 'MIG-H3, Housing Unit, Near 4 Roads,\nMathaiyankuttai Post,\nMettur Dam - 636452,\nSalem - Dt, Tamil Nadu, India.',
  phones: ['98427 81971', '70100 24368'],
  landline: '04298 - 243565',
  email: 'usmettur@gmail.com'
};

export const SERVICE_TYPES = [
  'OS Installation',
  'Laptop Repair',
  'Desktop Repair',
  'Printer Service',
  'Data Recovery',
  'Software Issue',
  'General Service',
  'CCTV Service',
  'Networking',
  'UPS/Inverter',
  'AMC Support'
];
