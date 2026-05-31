import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { ALLOWED_ORIGINS, CLIENT_ORIGIN, COMPANY, IS_PRODUCTION, PDF_DIR, PORT, ROOT_DIR, UPLOAD_DIR, WHATSAPP_PDF_PUBLIC_BASE_URL } from './config.js';
import { connectDb } from './db.js';
import { bookingUpload, handleUploadErrors } from './upload.js';
import { publicSubmitRateLimit } from './middleware/publicRateLimit.js';
import { asyncHandler } from './utils/http.js';
import { create as createBooking } from './controllers/bookingController.js';
import { create as createCallRequest } from './controllers/callRequestController.js';
import { publicBookingOpenGate, publicSettings, publicWebsiteOpenGate } from './controllers/publicWebsiteSettingsController.js';
import { startAutomaticBackupScheduler } from './services/backupService.js';
import amcRoutes from './routes/amcRoutes.js';
import authRoutes from './routes/authRoutes.js';
import auditLogRoutes from './routes/auditLogRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import callRequestRoutes from './routes/callRequestRoutes.js';
import communicationRoutes from './routes/communicationRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import inventoryRoutes from './routes/inventoryRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import pdfTemplateRoutes from './routes/pdfTemplateRoutes.js';
import publicWebsiteSettingsRoutes from './routes/publicWebsiteSettingsRoutes.js';
import purchaseImportRoutes from './routes/purchaseImportRoutes.js';
import rolePermissionRoutes from './routes/rolePermissionRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import reminderRoutes from './routes/reminderRoutes.js';
import stockMovementRoutes from './routes/stockMovementRoutes.js';
import supplierRoutes from './routes/supplierRoutes.js';
import userRoutes from './routes/userRoutes.js';
import workOrderRoutes from './routes/workOrderRoutes.js';

const app = express();
app.disable('x-powered-by');

const developmentOrigins = new Set([
  CLIENT_ORIGIN,
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000'
].filter(Boolean));
const productionOrigins = new Set(ALLOWED_ORIGINS);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (origin === 'null') return !IS_PRODUCTION;
  if (IS_PRODUCTION) return productionOrigins.has(origin);
  if (developmentOrigins.has(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return hostname === 'localhost' || hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      const error = new Error('CORS origin not allowed');
      error.status = 403;
      return callback(error);
    },
    credentials: true
  })
);
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (IS_PRODUCTION) res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use('/uploads', express.static(UPLOAD_DIR));
if (WHATSAPP_PDF_PUBLIC_BASE_URL) {
  app.use('/pdfs', express.static(PDF_DIR));
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, company: COMPANY.name, time: new Date().toISOString() });
});

app.get('/api/public/website-settings', asyncHandler(publicSettings));
app.post('/api/public/bookings', publicSubmitRateLimit, asyncHandler(publicBookingOpenGate), bookingUpload.single('problemImage'), handleUploadErrors, asyncHandler(createBooking));
app.post('/api/public/contact-requests', publicSubmitRateLimit, asyncHandler(publicWebsiteOpenGate), asyncHandler(createCallRequest));

app.use('/api/auth', authRoutes);
app.use('/api/amc', amcRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/call-requests', callRequestRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/pdf-templates', pdfTemplateRoutes);
app.use('/api/purchase-imports', purchaseImportRoutes);
app.use('/api/settings', publicWebsiteSettingsRoutes);
app.use('/api/role-permissions', rolePermissionRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/stock-movements', stockMovementRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/users', userRoutes);
app.use('/api/work-orders', workOrderRoutes);

const clientDistDir = path.join(ROOT_DIR, 'client', 'dist');
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) return next();
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  else console.warn(error.message);
  const message = status >= 500 && IS_PRODUCTION ? 'Internal Server Error' : error.message || 'Something went wrong';
  res.status(status).json({ message });
});

try {
  await connectDb();
  startAutomaticBackupScheduler();
  app.listen(PORT, () => {
    console.log(`Service Management API running on http://localhost:${PORT}`);
  });
} catch (error) {
  console.error('MongoDB connection failed. Start MongoDB locally or set MONGO_URI in server/.env.');
  console.error(`Connection detail: ${error.message}`);
  process.exit(1);
}
